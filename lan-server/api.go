package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

// pageClient is the X-E2E-Client name the web page sends; everything else is test software.
const pageClient = "DUT Controller page"

const maxDocumentBytes = 1 << 20

type server struct {
	store   *docStore
	clients *clientTracker
	port    int
	started time.Time
	verbose bool
	mockDUT string // address of the fake DUT, empty when it is off
}

func (s *server) routes(web http.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/info", s.handleInfo)
	mux.HandleFunc("GET /api/v1/docs", s.handleList)
	mux.HandleFunc("GET /api/v1/docs/{collection}/{doc}", s.handleGet)
	mux.HandleFunc("PUT /api/v1/docs/{collection}/{doc}", s.handleSet)
	mux.HandleFunc("PATCH /api/v1/docs/{collection}/{doc}", s.handleMerge)
	mux.HandleFunc("DELETE /api/v1/docs/{collection}/{doc}", s.handleDelete)
	mux.HandleFunc("GET /api/v1/watch", s.handleWatch)
	mux.Handle("/", web)
	return mux
}

type infoReply struct {
	App       string       `json:"app"`
	Version   string       `json:"version"`
	Boot      string       `json:"boot"`
	Hostname  string       `json:"hostname"`
	Port      int          `json:"port"`
	Addresses []ifaceAddr  `json:"addresses"`
	Started   string       `json:"started"`
	Clients   []clientInfo `json:"clients"`
	Listening []string     `json:"listening"`
	MockDUT   string       `json:"mock_dut,omitempty"`
}

func (s *server) info() infoReply {
	host, _ := os.Hostname()
	return infoReply{
		App:       appName,
		Version:   version,
		Boot:      s.store.boot,
		Hostname:  host,
		Port:      s.port,
		Addresses: lanAddresses(),
		Started:   s.started.Format(time.RFC3339),
		Clients:   s.clients.list(),
		Listening: s.store.watched(),
		MockDUT:   s.mockDUT,
	}
}

func (s *server) handleInfo(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.info())
}

func (s *server) handleList(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.list())
}

func (s *server) handleGet(w http.ResponseWriter, r *http.Request) {
	path, ok := docPath(w, r)
	if !ok {
		return
	}
	who := s.clients.seen(r)
	snap := s.store.get(path)
	if s.verbose {
		logf("GET    %-24s <- %s", path, who)
	}
	writeJSON(w, http.StatusOK, snap)
}

type writeReply struct {
	OK        bool   `json:"ok"`
	Version   uint64 `json:"version"`
	Listeners int    `json:"listeners"`
}

func (s *server) handleSet(w http.ResponseWriter, r *http.Request) {
	s.write(w, r, "SET", s.store.set)
}

func (s *server) handleMerge(w http.ResponseWriter, r *http.Request) {
	s.write(w, r, "UPDATE", s.store.merge)
}

func (s *server) write(w http.ResponseWriter, r *http.Request, verb string,
	apply func(path string, body []byte, writer string) (snapshot, int, error)) {
	path, ok := docPath(w, r)
	if !ok {
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, maxDocumentBytes+1))
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not read the request body: %v", err)
		return
	}
	if len(body) > maxDocumentBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "documents are limited to %d bytes", maxDocumentBytes)
		return
	}
	who := s.clients.seen(r)
	snap, listeners, err := apply(path, body, who)
	if err != nil {
		writeError(w, http.StatusBadRequest, "%s %s: %v", verb, path, err)
		return
	}
	logf("%-6s %-24s <- %s  %s", verb, path, who, preview(snap.Data, 140))
	if strings.HasSuffix(path, "/command") && listeners == 0 && r.Header.Get("X-E2E-Client") != pageClient {
		chamber := strings.TrimSuffix(path, "/command")
		logf("       WARNING: no DUT Controller page is listening on %s. On the page choose Chamber %s and click Listen. %s",
			chamber, chamber, s.listeningSummary())
	}
	writeJSON(w, http.StatusOK, writeReply{OK: true, Version: snap.Version, Listeners: listeners})
}

func (s *server) handleDelete(w http.ResponseWriter, r *http.Request) {
	path, ok := docPath(w, r)
	if !ok {
		return
	}
	who := s.clients.seen(r)
	snap, listeners := s.store.remove(path, who)
	logf("DELETE %-24s <- %s", path, who)
	writeJSON(w, http.StatusOK, writeReply{OK: true, Version: snap.Version, Listeners: listeners})
}

func (s *server) listeningSummary() string {
	var chambers []string
	for _, p := range s.store.watched() {
		if strings.HasSuffix(p, "/command") {
			chambers = append(chambers, strings.TrimSuffix(p, "/command"))
		}
	}
	if len(chambers) == 0 {
		return "(The page is not listening on any chamber.)"
	}
	return "(The page is listening on " + strings.Join(chambers, ", ") + ".)"
}

// handleWatch streams snapshots of the requested documents as Server-Sent Events:
// first their current state, then every change. ?doc=AM_CS1/command&doc=AM_CS1/information
func (s *server) handleWatch(w http.ResponseWriter, r *http.Request) {
	paths := r.URL.Query()["doc"]
	if len(paths) == 0 {
		writeError(w, http.StatusBadRequest, "name the documents to watch: ?doc=<chamber>/<document>")
		return
	}
	for _, p := range paths {
		parts := strings.Split(p, "/")
		if len(parts) != 2 || !validName(parts[0]) || !validName(parts[1]) {
			writeError(w, http.StatusBadRequest, "bad document path %q", p)
			return
		}
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming is not supported")
		return
	}
	who := s.clients.seen(r)
	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")

	wt, initial := s.store.watch(paths)
	defer s.store.unwatch(wt, paths)
	logf("LISTEN %-24s <- %s", strings.Join(paths, ", "), who)
	defer logf("STOP   %-24s <- %s", strings.Join(paths, ", "), who)

	fmt.Fprint(w, "retry: 2000\n\n")
	for _, snap := range initial {
		writeEvent(w, snap)
	}
	flusher.Flush()

	keepalive := time.NewTicker(15 * time.Second)
	defer keepalive.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case snap := <-wt.ch:
			writeEvent(w, snap)
			flusher.Flush()
		case <-keepalive.C:
			fmt.Fprint(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}

func writeEvent(w io.Writer, snap snapshot) {
	data, _ := json.Marshal(snap) // compact, so it fits on one "data:" line
	fmt.Fprintf(w, "event: snapshot\ndata: %s\n\n", data)
}

func docPath(w http.ResponseWriter, r *http.Request) (string, bool) {
	collection, doc := r.PathValue("collection"), r.PathValue("doc")
	if !validName(collection) || !validName(doc) {
		writeError(w, http.StatusBadRequest, "bad document path %q/%q", collection, doc)
		return "", false
	}
	return collection + "/" + doc, true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, format string, args ...any) {
	writeJSON(w, status, map[string]string{"error": fmt.Sprintf(format, args...)})
}

func preview(raw []byte, limit int) string {
	s := string(raw)
	if len(s) > limit {
		return s[:limit] + "..."
	}
	return s
}

// clientTracker remembers who has talked to the relay recently, for the page's status line
// and so the log says when the test software first connects.
type clientTracker struct {
	mu      sync.Mutex
	clients map[string]*clientInfo
}

type clientInfo struct {
	Name     string    `json:"name"`
	Address  string    `json:"address"`
	Page     bool      `json:"page"`
	First    time.Time `json:"first_seen"`
	Last     time.Time `json:"last_seen"`
	AgoMs    int64     `json:"last_seen_ms_ago"`
	Requests int       `json:"requests"`
}

func newClientTracker() *clientTracker {
	return &clientTracker{clients: map[string]*clientInfo{}}
}

// seen records a request and returns a short label for the log, e.g. "CAS on LAB-PC @169.254.10.2".
func (t *clientTracker) seen(r *http.Request) string {
	name := strings.TrimSpace(r.Header.Get("X-E2E-Client"))
	if name == "" {
		name = strings.TrimSpace(r.URL.Query().Get("client")) // EventSource cannot send headers
	}
	if name == "" {
		name = "unnamed client"
	}
	if len(name) > 80 {
		name = name[:80]
	}
	addr := r.RemoteAddr
	if host, _, err := net.SplitHostPort(addr); err == nil {
		addr = host
	}
	now := time.Now()
	key := name + "|" + addr
	t.mu.Lock()
	c := t.clients[key]
	if c == nil {
		c = &clientInfo{Name: name, Address: addr, Page: name == pageClient, First: now}
		t.clients[key] = c
		if !c.Page {
			logf("CONNECTED  %s from %s", name, addr)
		}
	} else if !c.Page && now.Sub(c.Last) > time.Minute {
		logf("BACK       %s from %s (silent for %s)", name, addr, now.Sub(c.Last).Round(time.Second))
	}
	c.Last = now
	c.Requests++
	t.mu.Unlock()
	return name + " @" + addr
}

// list returns clients heard from in the last 10 minutes, most recent first.
func (t *clientTracker) list() []clientInfo {
	now := time.Now()
	t.mu.Lock()
	defer t.mu.Unlock()
	out := []clientInfo{}
	for key, c := range t.clients {
		if now.Sub(c.Last) > 10*time.Minute {
			delete(t.clients, key)
			continue
		}
		cc := *c
		cc.AgoMs = now.Sub(c.Last).Milliseconds()
		out = append(out, cc)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Last.After(out[j].Last) })
	return out
}
