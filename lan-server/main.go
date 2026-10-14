// DUT Controller: runs the Unit Web Controller page on this computer and relays the E2E
// automation handshake over a direct Ethernet cable instead of Firebase.
//
// The test software (CAS, PAS or Chamber Control on Windows) reads and writes the same
// per-chamber documents it uses in Firestore (command, status, emitted, information, ...)
// through the HTTP API in api.go. The page served here watches them and drives the DUT exactly
// as it does online. Nothing here needs internet access.
package main

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const appName = "DUT Controller LAN relay"

var version = "dev" // set by the build script: -ldflags "-X main.version=..."

// The web page (index.html, *.js, vendor/, Media/) is copied here by build.ps1 / build.sh.
//
//go:embed all:webroot
var embeddedWeb embed.FS

func main() {
	port := flag.Int("port", 8686, "TCP port for the web page and the LAN relay (UDP auto-discovery uses the same number)")
	bind := flag.String("bind", "0.0.0.0", "address to listen on; 0.0.0.0 means every network interface")
	noBrowser := flag.Bool("no-browser", false, "do not open the web page in the browser")
	webDir := flag.String("webroot", "", "serve the web page from this folder instead of the built-in copy (development)")
	mockDUT := flag.Bool("mock-dut", false, "also run a fake DUT, so the link can be tested without a DUT")
	mockAddr := flag.String("mock-dut-addr", "127.0.0.1:1314", "address the fake DUT listens on (the page's DUT IP and Port)")
	mockDelay := flag.Duration("mock-dut-delay", 800*time.Millisecond, "how long the fake DUT takes to apply a command")
	discovery := flag.Bool("discovery", true, "answer auto-discovery broadcasts from the test software")
	keepAwake := flag.Bool("keep-awake", true, "keep the Mac from sleeping while this runs (macOS caffeinate)")
	verbose := flag.Bool("v", false, "log every request, including the test software's status polling")
	showVersion := flag.Bool("version", false, "print the version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Println(appName, version)
		return
	}

	web, err := webHandler(*webDir)
	if err != nil {
		fatal("%v", err)
	}

	listenAddr := net.JoinHostPort(*bind, strconv.Itoa(*port))
	ln, err := net.Listen("tcp", listenAddr)
	if err != nil {
		pageURL := fmt.Sprintf("http://127.0.0.1:%d/", *port)
		if alreadyRunning(*port) {
			fmt.Printf("The DUT Controller is already running on port %d. Opening its page: %s\n", *port, pageURL)
			if !*noBrowser {
				openBrowser(pageURL)
			}
			return
		}
		fatal("cannot listen on %s: %v\nAnother program is using port %d. Close it or start with -port <other port>.", listenAddr, err, *port)
	}

	srv := &server{
		store:   newDocStore(),
		clients: newClientTracker(),
		port:    *port,
		started: time.Now(),
		verbose: *verbose,
	}

	if *mockDUT {
		if err := startMockDUT(*mockAddr, *mockDelay); err != nil {
			logf("Fake DUT not started: %v (is the real DUT program already using %s?)", err, *mockAddr)
		} else {
			srv.mockDUT = *mockAddr
		}
	}
	if *discovery {
		if err := startDiscovery(*port, func() any { return srv.discoveryReply() }); err != nil {
			logf("Auto-discovery not available (%v). The test software must use this Mac's IP address.", err)
		}
	}
	if *keepAwake {
		keepMacAwake()
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	httpServer := &http.Server{
		Handler:           srv.routes(web),
		ReadHeaderTimeout: 10 * time.Second,
		BaseContext:       func(net.Listener) context.Context { return ctx }, // ends open page streams on Ctrl+C
	}
	go func() {
		if err := httpServer.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			fatal("web server stopped: %v", err)
		}
	}()

	pageURL := fmt.Sprintf("http://127.0.0.1:%d/", *port)
	printBanner(pageURL, *port, srv.mockDUT, *discovery)
	if !*noBrowser {
		openBrowser(pageURL)
	}

	<-ctx.Done()
	logf("Stopping...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(shutdownCtx)
}

func printBanner(pageURL string, port int, mockAddr string, discovery bool) {
	line := strings.Repeat("=", 72)
	fmt.Println(line)
	fmt.Printf(" DUT Controller %s - LAN mode (no internet needed)\n", version)
	fmt.Println(line)
	fmt.Printf(" Web page:  %s  (opens in your browser; keep it open)\n", pageURL)
	fmt.Println(" Test software (CAS / PAS / Chamber Control) connects to this computer at:")
	addrs := lanAddresses()
	if len(addrs) == 0 {
		fmt.Println("    (no network address yet - plug in the Ethernet cable; the page shows the address once it is up)")
	}
	for _, a := range addrs {
		fmt.Printf("    %-15s port %d   (%s)\n", a.IP, port, a.Interface)
	}
	if discovery {
		fmt.Printf(" Or set the test software's Mac IP to \"auto\" to find this computer by broadcast (UDP %d).\n", port)
	}
	if mockAddr != "" {
		fmt.Printf(" FAKE DUT running at ws://%s - set the page's IP/Port to it and click Connect.\n", mockAddr)
	}
	fmt.Println(" Keep this window open while testing. Press Ctrl+C to stop.")
	fmt.Println(line)
}

func (s *server) discoveryReply() map[string]any {
	host, _ := os.Hostname()
	return map[string]any{
		"app":       appName,
		"version":   version,
		"hostname":  host,
		"port":      s.port,
		"addresses": lanAddresses(),
		"listening": s.store.watched(),
	}
}

// webHandler serves the page from the copy built into the program, or from a folder.
func webHandler(dir string) (http.Handler, error) {
	var fsys fs.FS
	if dir != "" {
		fsys = os.DirFS(dir)
	} else {
		sub, err := fs.Sub(embeddedWeb, "webroot")
		if err != nil {
			return nil, err
		}
		fsys = sub
	}
	if _, err := fs.Stat(fsys, "index.html"); err != nil {
		if dir == "" {
			return nil, errors.New("this build has no web page inside; build it with build.ps1 or build.sh, or start with -webroot <Unit-Web-Controller folder>")
		}
		return nil, fmt.Errorf("no index.html in %s", dir)
	}
	files := http.FileServer(http.FS(fsys))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Explicit types: some Windows registries map .js to text/plain, which browsers refuse
		// for module scripts.
		if ct, ok := contentTypes[strings.ToLower(path.Ext(r.URL.Path))]; ok {
			w.Header().Set("Content-Type", ct)
		}
		w.Header().Set("Cache-Control", "no-cache")
		files.ServeHTTP(w, r)
	}), nil
}

var contentTypes = map[string]string{
	".html": "text/html; charset=utf-8",
	".js":   "text/javascript; charset=utf-8",
	".mjs":  "text/javascript; charset=utf-8",
	".css":  "text/css; charset=utf-8",
	".json": "application/json",
	".png":  "image/png",
	".svg":  "image/svg+xml",
	".ico":  "image/x-icon",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

type ifaceAddr struct {
	IP        string `json:"ip"`
	Interface string `json:"interface"`
}

// lanAddresses lists this computer's IPv4 addresses on active, non-loopback interfaces,
// including self-assigned 169.254.x.x ones (what a bare cable without DHCP gets).
func lanAddresses() []ifaceAddr {
	out := []ifaceAddr{}
	ifaces, err := net.Interfaces()
	if err != nil {
		return out
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			ipNet, ok := a.(*net.IPNet)
			if !ok || ipNet.IP.To4() == nil {
				continue
			}
			out = append(out, ifaceAddr{IP: ipNet.IP.To4().String(), Interface: iface.Name})
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Interface < out[j].Interface })
	return out
}

func alreadyRunning(port int) bool {
	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/api/v1/info", port))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	var info infoReply
	return json.NewDecoder(resp.Body).Decode(&info) == nil && info.App == appName
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		logf("Could not open the browser (%v). Open %s yourself.", err, url)
		return
	}
	go func() { _ = cmd.Wait() }()
}

// keepMacAwake stops idle sleep while the relay runs; a sleeping Mac drops the link mid-test.
func keepMacAwake() {
	if runtime.GOOS != "darwin" {
		return
	}
	cmd := exec.Command("/usr/bin/caffeinate", "-dims", "-w", strconv.Itoa(os.Getpid()))
	if err := cmd.Start(); err != nil {
		logf("Could not keep the Mac awake (%v). Turn off sleep in System Settings for long runs.", err)
		return
	}
	go func() { _ = cmd.Wait() }()
}

func logf(format string, args ...any) {
	fmt.Printf("%s  %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}

func fatal(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "ERROR: "+format+"\n", args...)
	os.Exit(1)
}
