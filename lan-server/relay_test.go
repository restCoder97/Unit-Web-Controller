package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestParseObjectKeepsOrderAndRawValues(t *testing.T) {
	keys, fields, err := parseObject([]byte(`{"Channel": 42, "Mode": "UNII-11ax(RU)", "Power": 60.0, "nested": {"a": [1, 2]}, "Channel": 44}`))
	if err != nil {
		t.Fatal(err)
	}
	if got := strings.Join(keys, ","); got != "Channel,Mode,Power,nested" {
		t.Fatalf("keys = %s", got)
	}
	if string(fields["Channel"]) != "44" || string(fields["Power"]) != "60.0" || string(fields["nested"]) != `{"a":[1,2]}` {
		t.Fatalf("fields = %s %s %s", fields["Channel"], fields["Power"], fields["nested"])
	}
	for _, bad := range []string{`[1,2]`, `"x"`, `{"a":1} {"b":2}`, `{"a":NaN}`, `{"a":`, ``} {
		if _, _, err := parseObject([]byte(bad)); err == nil {
			t.Errorf("parseObject(%q) accepted bad input", bad)
		}
	}
}

func TestSetMergeGetLikeFirestore(t *testing.T) {
	s := newDocStore()
	if snap := s.get("AM_CS1/status"); snap.Exists || snap.Version != 0 {
		t.Fatalf("missing doc = %+v", snap)
	}
	a, _, _ := s.set("AM_CS1/information", []byte(`{"status":"","total_tests":0,"current_test":0}`), "CAS")
	b, _, _ := s.merge("AM_CS1/information", []byte(`{"current_test":3,"error":"x"}`), "CAS")
	if b.Version <= a.Version {
		t.Fatalf("versions %d then %d", a.Version, b.Version)
	}
	if got := string(s.get("AM_CS1/information").Data); got != `{"status":"","total_tests":0,"current_test":3,"error":"x"}` {
		t.Fatalf("after merge: %s", got)
	}
	s.set("AM_CS1/information", []byte(`{"status":"Ready"}`), "page")
	if got := string(s.get("AM_CS1/information").Data); got != `{"status":"Ready"}` {
		t.Fatalf("set must replace the document: %s", got)
	}
	s.merge("AM_CS1/monitor", []byte(`{"auto":"In Progress"}`), "PAS")
	if !s.get("AM_CS1/monitor").Exists {
		t.Fatal("merge must create a missing document")
	}
	del, _ := s.remove("AM_CS1/monitor", "PAS")
	if s.get("AM_CS1/monitor").Exists || del.Exists {
		t.Fatal("remove did not delete")
	}
}

func TestWatchGetsCurrentStateThenChanges(t *testing.T) {
	s := newDocStore()
	s.set("AM_CS1/command", []byte(`{"Channel":36}`), "CAS")
	w, initial := s.watch([]string{"AM_CS1/command", "AM_CS1/information"})
	defer s.unwatch(w, []string{"AM_CS1/command", "AM_CS1/information"})
	if len(initial) != 2 || string(initial[0].Data) != `{"Channel":36}` || initial[1].Exists {
		t.Fatalf("initial = %+v", initial)
	}
	_, listeners, _ := s.set("AM_CS1/command", []byte(`{"Channel":40}`), "CAS")
	if listeners != 1 {
		t.Fatalf("listeners = %d", listeners)
	}
	if snap := <-w.ch; string(snap.Data) != `{"Channel":40}` {
		t.Fatalf("change = %s", snap.Data)
	}
	if _, n, _ := s.set("AM_CS2/command", []byte(`{}`), "CAS"); n != 0 {
		t.Fatalf("other chamber reached %d listeners", n)
	}
	// A reader that never drains keeps only the newest snapshots.
	for i := 0; i < 100; i++ {
		s.set("AM_CS1/command", []byte(`{"n":`+strings.Repeat("1", 1+i%3)+`}`), "CAS")
	}
	s.set("AM_CS1/command", []byte(`{"n":"last"}`), "CAS")
	var last snapshot
	for len(w.ch) > 0 {
		last = <-w.ch
	}
	if string(last.Data) != `{"n":"last"}` {
		t.Fatalf("newest snapshot lost: %s", last.Data)
	}
	if got := s.watched(); strings.Join(got, ",") != "AM_CS1/command,AM_CS1/information" {
		t.Fatalf("watched = %v", got)
	}
}

func newTestServer(t *testing.T) (*server, *httptest.Server) {
	t.Helper()
	srv := &server{store: newDocStore(), clients: newClientTracker(), port: 8686, started: time.Now()}
	ts := httptest.NewServer(srv.routes(http.NotFoundHandler()))
	t.Cleanup(ts.Close)
	return srv, ts
}

func do(t *testing.T, method, url, body string) (int, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest(method, url, strings.NewReader(body))
	req.Header.Set("X-E2E-Client", "unit test")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var out map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&out)
	return resp.StatusCode, out
}

func TestHTTPDocumentAPI(t *testing.T) {
	_, ts := newTestServer(t)
	docURL := ts.URL + "/api/v1/docs/AM_CS1/command"
	if code, out := do(t, "GET", docURL, ""); code != 200 || out["exists"] != false {
		t.Fatalf("GET missing: %d %v", code, out)
	}
	if code, out := do(t, "PUT", docURL, `{"Channel":36,"random":12345}`); code != 200 || out["listeners"].(float64) != 0 {
		t.Fatalf("PUT: %d %v", code, out)
	}
	if code, out := do(t, "PATCH", docURL, `{"Power":60}`); code != 200 || out["ok"] != true {
		t.Fatalf("PATCH: %d %v", code, out)
	}
	code, out := do(t, "GET", docURL, "")
	data, _ := out["data"].(map[string]any)
	if code != 200 || out["exists"] != true || data["Channel"].(float64) != 36 || data["Power"].(float64) != 60 {
		t.Fatalf("GET: %d %v", code, out)
	}
	if code, _ := do(t, "PUT", docURL, `[1,2,3]`); code != 400 {
		t.Fatalf("PUT array: %d", code)
	}
	if code, _ := do(t, "PUT", ts.URL+"/api/v1/docs/AM_CS1/a%2Fb", `{}`); code != 400 {
		t.Fatalf("slash in name: %d", code)
	}
	code, info := do(t, "GET", ts.URL+"/api/v1/info", "")
	if code != 200 || info["app"] != appName {
		t.Fatalf("info: %d %v", code, info)
	}
	clients, _ := info["clients"].([]any)
	if len(clients) != 1 || clients[0].(map[string]any)["name"] != "unit test" {
		t.Fatalf("clients = %v", info["clients"])
	}
}

func TestWatchStreamsSnapshots(t *testing.T) {
	_, ts := newTestServer(t)
	resp, err := http.Get(ts.URL + "/api/v1/watch?doc=AM_CS1%2Fcommand")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if ct := resp.Header.Get("Content-Type"); ct != "text/event-stream" {
		t.Fatalf("content type %q", ct)
	}
	events := make(chan snapshot, 4)
	go func() {
		sc := bufio.NewScanner(resp.Body)
		for sc.Scan() {
			if line := sc.Text(); strings.HasPrefix(line, "data: ") {
				var snap snapshot
				if json.Unmarshal([]byte(line[6:]), &snap) == nil {
					events <- snap
				}
			}
		}
	}()
	first := waitEvent(t, events)
	if first.Path != "AM_CS1/command" || first.Exists {
		t.Fatalf("first event = %+v", first)
	}
	if code, out := do(t, "PUT", ts.URL+"/api/v1/docs/AM_CS1/command", `{"Channel":149}`); code != 200 || out["listeners"].(float64) != 1 {
		t.Fatalf("PUT while watched: %d %v", code, out)
	}
	if next := waitEvent(t, events); string(next.Data) != `{"Channel":149}` || next.Boot != first.Boot {
		t.Fatalf("change event = %+v", next)
	}
}

func waitEvent(t *testing.T, events chan snapshot) snapshot {
	t.Helper()
	select {
	case snap := <-events:
		return snap
	case <-time.After(3 * time.Second):
		t.Fatal("no event")
		return snapshot{}
	}
}

// wsClient is a minimal masked-frame WebSocket client, enough to talk to the fake DUT.
type wsClient struct {
	conn net.Conn
	r    *bufio.Reader
}

func dialWS(t *testing.T, addr string) *wsClient {
	t.Helper()
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	_ = conn.SetDeadline(time.Now().Add(10 * time.Second))
	key := "dGhlIHNhbXBsZSBub25jZQ=="
	io.WriteString(conn, "GET / HTTP/1.1\r\nHost: "+addr+"\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: "+key+"\r\nSec-WebSocket-Version: 13\r\n\r\n")
	r := bufio.NewReader(conn)
	resp, err := http.ReadResponse(r, nil)
	if err != nil {
		t.Fatal(err)
	}
	// RFC 6455 section 1.3 example: this key must produce this accept value.
	if resp.StatusCode != 101 || resp.Header.Get("Sec-WebSocket-Accept") != "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=" {
		t.Fatalf("handshake: %d %q", resp.StatusCode, resp.Header.Get("Sec-WebSocket-Accept"))
	}
	return &wsClient{conn: conn, r: r}
}

func (c *wsClient) send(t *testing.T, text string) {
	t.Helper()
	payload := []byte(text)
	frame := []byte{0x81}
	if len(payload) < 126 {
		frame = append(frame, 0x80|byte(len(payload)))
	} else {
		frame = append(frame, 0x80|126)
		frame = binary.BigEndian.AppendUint16(frame, uint16(len(payload)))
	}
	mask := make([]byte, 4)
	rand.Read(mask)
	frame = append(frame, mask...)
	for i, b := range payload {
		frame = append(frame, b^mask[i%4])
	}
	if _, err := c.conn.Write(frame); err != nil {
		t.Fatal(err)
	}
}

func (c *wsClient) receive(t *testing.T) string {
	t.Helper()
	ws := &wsConn{conn: c.conn, r: c.r}
	msg, err := ws.readMessage()
	if err != nil {
		t.Fatal(err)
	}
	return string(msg)
}

func freeAddr(t *testing.T, network string) string {
	t.Helper()
	if network == "udp" {
		pc, err := net.ListenPacket("udp4", "127.0.0.1:0")
		if err != nil {
			t.Fatal(err)
		}
		defer pc.Close()
		return pc.LocalAddr().String()
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return ln.Addr().String()
}

func TestMockDUTAnswersLikeTheRealOne(t *testing.T) {
	addr := freeAddr(t, "tcp")
	if err := startMockDUT(addr, 10*time.Millisecond); err != nil {
		t.Fatal(err)
	}
	c := dialWS(t, addr)
	c.send(t, `{"chamber":"AM_CS1","test":"cc220x_non_sig","comport":"/dev/cu.usbmodem1302","firmware":"x"}`)
	if got := c.receive(t); !strings.Contains(got, "setting up") {
		t.Fatalf("setup reply %q", got)
	}
	if got := c.receive(t); got != "Ready!" {
		t.Fatalf("expected Ready!, got %q", got)
	}
	long := `{"testType":"BE","technology":"WLAN U-NII 11ax","channel":"36","power":"15","antenna":"C0A0","pad":"` + strings.Repeat("x", 200) + `"}`
	c.send(t, long)
	if got := c.receive(t); !strings.HasPrefix(got, "Fake DUT: applying WLAN U-NII 11ax ch 36") {
		t.Fatalf("progress reply %q", got)
	}
	got := c.receive(t)
	if !strings.Contains(got, "Success") || !strings.Contains(got, "status") || len(got) >= 150 {
		t.Fatalf("the page would not accept %q as a success reply", got)
	}
}

func TestDiscoveryReply(t *testing.T) {
	addr, _ := net.ResolveUDPAddr("udp4", freeAddr(t, "udp"))
	if err := startDiscovery(addr.Port, func() any { return map[string]any{"port": 8686, "hostname": "test-mac"} }); err != nil {
		t.Fatal(err)
	}
	conn, err := net.DialUDP("udp4", nil, &net.UDPAddr{IP: net.IPv4(127, 0, 0, 1), Port: addr.Port})
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(3 * time.Second))
	conn.Write([]byte("not for us"))
	conn.Write([]byte(discoverMagic + " 1"))
	buf := make([]byte, 2048)
	n, err := conn.Read(buf)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(buf[:n], []byte(replyMagic)) {
		t.Fatalf("reply %q", buf[:n])
	}
	var info map[string]any
	if err := json.Unmarshal(buf[len(replyMagic):n], &info); err != nil || info["hostname"] != "test-mac" {
		t.Fatalf("reply body %q (%v)", buf[:n], err)
	}
}
