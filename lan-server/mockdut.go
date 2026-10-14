package main

import (
	"bufio"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Fake DUT (-mock-dut): stands in for the DUT program the page normally connects to with
// "Connect" (ws://<IP>:<Port>, 127.0.0.1:1314 by default), so the whole chain
// test software -> cable -> relay -> page -> DUT and back can be tested with no DUT attached.
// It answers like the real one: "Ready!" after the setup message, then a short
// {"status": "Success", ...} for every command once it has "applied" it.

func startMockDUT(addr string, delay time.Duration) error {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	go func() {
		_ = http.Serve(ln, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			serveMockDUT(w, r, delay)
		}))
	}()
	return nil
}

func serveMockDUT(w http.ResponseWriter, r *http.Request, delay time.Duration) {
	key := r.Header.Get("Sec-WebSocket-Key")
	if !strings.EqualFold(r.Header.Get("Upgrade"), "websocket") || key == "" {
		http.Error(w, "fake DUT: connect with a WebSocket (the DUT Controller page does this)", http.StatusBadRequest)
		return
	}
	hj, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "fake DUT: cannot take over the connection", http.StatusInternalServerError)
		return
	}
	conn, rw, err := hj.Hijack()
	if err != nil {
		return
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Time{})
	sum := sha1.Sum([]byte(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
	fmt.Fprintf(rw, "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n",
		base64.StdEncoding.EncodeToString(sum[:]))
	if err := rw.Flush(); err != nil {
		return
	}
	ws := &wsConn{conn: conn, r: rw.Reader}
	logf("FAKE DUT   page connected from %s", r.RemoteAddr)
	for {
		msg, err := ws.readMessage()
		if err != nil {
			logf("FAKE DUT   page disconnected")
			return
		}
		mockReply(ws, msg, delay)
	}
}

func mockReply(ws *wsConn, raw []byte, delay time.Duration) {
	var msg map[string]any
	if err := json.Unmarshal(raw, &msg); err != nil {
		_ = ws.writeText("Fake DUT: ignored a message that is not JSON")
		return
	}
	if _, setup := msg["comport"]; setup { // first message after Connect: chamber, test, comport, firmware
		logf("FAKE DUT   setup %s", preview(raw, 120))
		_ = ws.writeText(fmt.Sprintf("Fake DUT: setting up test type %v on %v (no real DUT attached)", msg["test"], msg["comport"]))
		time.Sleep(300 * time.Millisecond)
		_ = ws.writeText("Ready!")
		return
	}
	if _, reset := msg["unit_reset"]; reset {
		logf("FAKE DUT   reset requested")
		_ = ws.writeText("Fake DUT: resetting the unit")
		time.Sleep(delay)
		_ = ws.writeText("Ready!")
		return
	}
	tech := fmt.Sprint(msg["technology"])
	summary := fmt.Sprintf("%s ch %v freq %v power %v ant %v", tech, msg["channel"], msg["frequency"], msg["power"], msg["antenna"])
	logf("FAKE DUT   applying %s", summary)
	_ = ws.writeText("Fake DUT: applying " + summary)
	time.Sleep(delay)
	// The page treats a message containing "status" and "Success" that is shorter than 150
	// characters as "the DUT is transmitting" and then confirms to the test software.
	reply, _ := json.Marshal(map[string]string{"status": "Success", "technology": tech})
	_ = ws.writeText(string(reply))
}

// wsConn is the small part of RFC 6455 the fake DUT needs: unfragmented text replies,
// client frames of any fragmentation, ping/pong and close.
type wsConn struct {
	conn net.Conn
	r    *bufio.Reader
	mu   sync.Mutex
}

func (c *wsConn) readMessage() ([]byte, error) {
	var message []byte
	for {
		var head [2]byte
		if _, err := io.ReadFull(c.r, head[:]); err != nil {
			return nil, err
		}
		fin, opcode := head[0]&0x80 != 0, head[0]&0x0F
		masked, n := head[1]&0x80 != 0, uint64(head[1]&0x7F)
		switch n {
		case 126:
			var ext [2]byte
			if _, err := io.ReadFull(c.r, ext[:]); err != nil {
				return nil, err
			}
			n = uint64(binary.BigEndian.Uint16(ext[:]))
		case 127:
			var ext [8]byte
			if _, err := io.ReadFull(c.r, ext[:]); err != nil {
				return nil, err
			}
			n = binary.BigEndian.Uint64(ext[:])
		}
		if n > maxDocumentBytes {
			return nil, errors.New("frame too large")
		}
		var mask [4]byte
		if masked {
			if _, err := io.ReadFull(c.r, mask[:]); err != nil {
				return nil, err
			}
		}
		payload := make([]byte, n)
		if _, err := io.ReadFull(c.r, payload); err != nil {
			return nil, err
		}
		if masked {
			for i := range payload {
				payload[i] ^= mask[i%4]
			}
		}
		switch opcode {
		case 0x8: // close: answer and stop
			_ = c.writeFrame(0x8, payload[:min(2, len(payload))])
			return nil, io.EOF
		case 0x9: // ping
			_ = c.writeFrame(0xA, payload)
		case 0xA: // pong
		default: // continuation, text, binary
			message = append(message, payload...)
			if fin {
				return message, nil
			}
		}
	}
}

func (c *wsConn) writeText(s string) error {
	return c.writeFrame(0x1, []byte(s))
}

func (c *wsConn) writeFrame(opcode byte, payload []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	frame := []byte{0x80 | opcode}
	switch n := len(payload); {
	case n < 126:
		frame = append(frame, byte(n))
	case n <= 0xFFFF:
		frame = append(frame, 126, byte(n>>8), byte(n))
	default:
		frame = append(frame, 127)
		frame = binary.BigEndian.AppendUint64(frame, uint64(n))
	}
	_, err := c.conn.Write(append(frame, payload...))
	return err
}
