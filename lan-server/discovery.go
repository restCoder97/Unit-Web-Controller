package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"net"
	"time"
)

// Auto-discovery: the test software broadcasts discoverMagic on the UDP port with the same
// number as the HTTP port, and the relay answers with replyMagic + JSON. The answer's source
// address is the one the test software then uses, so nobody has to type an IP address when
// both ends only have self-assigned 169.254.x.x addresses.
const (
	discoverMagic = "E2E-LAN-DISCOVER"
	replyMagic    = "E2E-LAN-HERE "
)

func startDiscovery(port int, reply func() any) error {
	conn, err := net.ListenUDP("udp4", &net.UDPAddr{Port: port})
	if err != nil {
		return err
	}
	go func() {
		lastLogged := map[string]time.Time{}
		buf := make([]byte, 2048)
		for {
			n, addr, err := conn.ReadFromUDP(buf)
			if err != nil {
				if errors.Is(err, net.ErrClosed) {
					return
				}
				continue
			}
			if !bytes.HasPrefix(buf[:n], []byte(discoverMagic)) {
				continue
			}
			payload, err := json.Marshal(reply())
			if err != nil {
				continue
			}
			_, _ = conn.WriteToUDP(append([]byte(replyMagic), payload...), addr)
			if time.Since(lastLogged[addr.IP.String()]) > time.Minute {
				logf("FOUND BY   %s (auto-discovery)", addr.IP)
				lastLogged[addr.IP.String()] = time.Now()
			}
		}
	}()
	return nil
}
