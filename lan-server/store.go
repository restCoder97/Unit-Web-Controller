package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"
	"time"
)

// docStore keeps the per-chamber documents of the E2E handshake in memory, standing in for
// the Firestore collections (<chamber>/command, status, emitted, information, Error, monitor).
// A document is a flat JSON object: set replaces it like Firestore set(), merge overwrites the
// given top-level fields and keeps the rest like Firestore update(). Field order is kept as
// written so the log and the page show commands the way the test software built them.
type docStore struct {
	mu       sync.Mutex
	boot     string // changes on every start, so a page never mistakes a new document for an old one
	seq      uint64 // versions come from one counter: a recreated document never repeats a version
	docs     map[string]*document
	watchers map[string]map[*watcher]struct{}
}

type document struct {
	keys    []string
	fields  map[string]json.RawMessage
	version uint64
	updated time.Time
	writer  string
}

// snapshot is a document as of one version, as sent to readers and watchers.
type snapshot struct {
	Path    string          `json:"path"`
	Exists  bool            `json:"exists"`
	Data    json.RawMessage `json:"data,omitempty"`
	Version uint64          `json:"version"`
	Boot    string          `json:"boot"`
	Updated string          `json:"update_time,omitempty"`
	Writer  string          `json:"writer,omitempty"`
}

// watcher receives a snapshot after every change to the documents it watches. Snapshots are
// whole documents, so when a slow reader falls behind only the newest ones are kept.
type watcher struct {
	ch chan snapshot
}

func newDocStore() *docStore {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return &docStore{
		boot:     hex.EncodeToString(b),
		docs:     map[string]*document{},
		watchers: map[string]map[*watcher]struct{}{},
	}
}

func (s *docStore) get(path string) snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.snapshotLocked(path)
}

// set replaces the document. It returns the new snapshot and how many watchers it reached.
func (s *docStore) set(path string, body []byte, writer string) (snapshot, int, error) {
	keys, fields, err := parseObject(body)
	if err != nil {
		return snapshot{}, 0, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.docs[path] = &document{keys: keys, fields: fields}
	return s.touchLocked(path, writer)
}

// merge overwrites the given fields and creates the document if it does not exist yet
// (Firestore update() refuses a missing document; the relay is lenient so a write that
// races a restart of the Mac app is not lost).
func (s *docStore) merge(path string, body []byte, writer string) (snapshot, int, error) {
	keys, fields, err := parseObject(body)
	if err != nil {
		return snapshot{}, 0, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	d := s.docs[path]
	if d == nil {
		d = &document{fields: map[string]json.RawMessage{}}
		s.docs[path] = d
	}
	for _, k := range keys {
		if _, ok := d.fields[k]; !ok {
			d.keys = append(d.keys, k)
		}
		d.fields[k] = fields[k]
	}
	return s.touchLocked(path, writer)
}

func (s *docStore) remove(path string, writer string) (snapshot, int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.docs, path)
	s.seq++
	snap := snapshot{Path: path, Version: s.seq, Boot: s.boot, Writer: writer}
	return snap, s.notifyLocked(path, snap)
}

func (s *docStore) touchLocked(path, writer string) (snapshot, int, error) {
	d := s.docs[path]
	s.seq++
	d.version = s.seq
	d.updated = time.Now()
	d.writer = writer
	snap := s.snapshotLocked(path)
	return snap, s.notifyLocked(path, snap), nil
}

func (s *docStore) snapshotLocked(path string) snapshot {
	d := s.docs[path]
	if d == nil {
		return snapshot{Path: path, Boot: s.boot}
	}
	return snapshot{
		Path:    path,
		Exists:  true,
		Data:    d.marshal(),
		Version: d.version,
		Boot:    s.boot,
		Updated: d.updated.Format(time.RFC3339Nano),
		Writer:  d.writer,
	}
}

func (s *docStore) notifyLocked(path string, snap snapshot) int {
	for w := range s.watchers[path] {
		select {
		case w.ch <- snap:
		default: // reader is behind: drop its oldest snapshot, the newest one wins
			select {
			case <-w.ch:
			default:
			}
			select {
			case w.ch <- snap:
			default:
			}
		}
	}
	return len(s.watchers[path])
}

// watch registers one watcher for all paths and returns their current snapshots, so the
// reader starts from the present state just like a Firestore onSnapshot listener.
func (s *docStore) watch(paths []string) (*watcher, []snapshot) {
	w := &watcher{ch: make(chan snapshot, 32)}
	s.mu.Lock()
	defer s.mu.Unlock()
	initial := make([]snapshot, 0, len(paths))
	for _, p := range paths {
		if s.watchers[p] == nil {
			s.watchers[p] = map[*watcher]struct{}{}
		}
		s.watchers[p][w] = struct{}{}
		initial = append(initial, s.snapshotLocked(p))
	}
	return w, initial
}

func (s *docStore) unwatch(w *watcher, paths []string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, p := range paths {
		delete(s.watchers[p], w)
		if len(s.watchers[p]) == 0 {
			delete(s.watchers, p)
		}
	}
}

func (s *docStore) listenerCount(path string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.watchers[path])
}

// watched lists the documents somebody is listening to, e.g. "AM_CS1/command".
func (s *docStore) watched() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	paths := make([]string, 0, len(s.watchers))
	for p := range s.watchers {
		paths = append(paths, p)
	}
	sort.Strings(paths)
	return paths
}

func (s *docStore) list() []snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	paths := make([]string, 0, len(s.docs))
	for p := range s.docs {
		paths = append(paths, p)
	}
	sort.Strings(paths)
	out := make([]snapshot, 0, len(paths))
	for _, p := range paths {
		out = append(out, s.snapshotLocked(p))
	}
	return out
}

func (d *document) marshal() json.RawMessage {
	var buf bytes.Buffer
	buf.WriteByte('{')
	for i, k := range d.keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		key, _ := json.Marshal(k)
		buf.Write(key)
		buf.WriteByte(':')
		buf.Write(d.fields[k])
	}
	buf.WriteByte('}')
	return buf.Bytes()
}

// parseObject reads a JSON object keeping its field order; values stay as compact raw JSON
// so numbers and nested values come back exactly as the writer sent them.
func parseObject(body []byte) ([]string, map[string]json.RawMessage, error) {
	dec := json.NewDecoder(bytes.NewReader(body))
	tok, err := dec.Token()
	if err != nil {
		return nil, nil, fmt.Errorf("document is not valid JSON: %v", err)
	}
	if d, ok := tok.(json.Delim); !ok || d != '{' {
		return nil, nil, errors.New("document must be a JSON object")
	}
	keys := []string{}
	fields := map[string]json.RawMessage{}
	for dec.More() {
		tok, err := dec.Token()
		if err != nil {
			return nil, nil, fmt.Errorf("document is not valid JSON: %v", err)
		}
		key, ok := tok.(string)
		if !ok {
			return nil, nil, errors.New("document is not valid JSON")
		}
		var raw json.RawMessage
		if err := dec.Decode(&raw); err != nil {
			return nil, nil, fmt.Errorf("field %q is not valid JSON: %v", key, err)
		}
		var compact bytes.Buffer
		if err := json.Compact(&compact, raw); err != nil {
			return nil, nil, fmt.Errorf("field %q is not valid JSON: %v", key, err)
		}
		if _, dup := fields[key]; !dup {
			keys = append(keys, key)
		}
		fields[key] = compact.Bytes()
	}
	if _, err := dec.Token(); err != nil { // closing brace
		return nil, nil, fmt.Errorf("document is not valid JSON: %v", err)
	}
	if _, err := dec.Token(); err != io.EOF {
		return nil, nil, errors.New("unexpected data after the JSON object")
	}
	return keys, fields, nil
}

// validName accepts Firestore-like collection and document ids: chamber names such as
// AM_CS1 or NTS_3m4 and document names such as command or Error.
func validName(name string) bool {
	if name == "" || name == "." || name == ".." || len(name) > 128 {
		return false
	}
	return !strings.ContainsAny(name, "/\\\x00\r\n\t")
}
