# DUT Controller (LAN relay)

One self-contained program that serves the Unit Web Controller page and relays the E2E
handshake between the test software and the page over a LAN, for sites without internet.
Operator guide: [../LAN-MODE.md](../LAN-MODE.md).

Plain Go standard library, no cgo: it cross-compiles from Windows to macOS (Apple Silicon and
Intel) and Windows. The page files are embedded at build time.

## Build

Needs Go 1.22+ (built and tested with 1.24.13; Go 1.24 binaries run on macOS 11 Big Sur and later).

```
.\build.ps1 -Go C:\path\to\go.exe        # Windows
./build.sh                               # macOS / Linux
```

Both copy the page into `webroot/`, run `go vet` and `go test`, and write `dist/`:

| File | Use |
|---|---|
| `DUT-Controller-macOS.zip` | For the Mac. Launchers + `bin/dut-controller-arm64` (ad-hoc signed by the Go linker, as Apple Silicon requires) and `bin/dut-controller-x86_64`. Built with `tools/mkzip` so permissions survive. |
| `dut-controller-windows-x64.exe` | Same program on Windows, for trying it out. |

Development without rebuilding the page: `go run . -webroot ..`

## Options

```
-port 8686              TCP port for the page and the relay; UDP auto-discovery uses the same number
-bind 0.0.0.0           listen address (127.0.0.1 = this computer only)
-mock-dut               also run a fake DUT WebSocket server
-mock-dut-addr 127.0.0.1:1314
-mock-dut-delay 800ms   how long the fake DUT takes to "apply" a command
-discovery=true         answer auto-discovery broadcasts
-keep-awake=true        macOS: keep the Mac awake (caffeinate) while running
-no-browser             do not open the page
-webroot DIR            serve the page from DIR instead of the embedded copy
-v                      log every request, including status polling
```

## HTTP API

Documents mirror the Firestore ones: `<collection>/<document>`, e.g. `AM_CS1/command`.
Clients name themselves in the `X-E2E-Client` header (shown in the log and on the page).

| Request | Firestore equivalent | Reply |
|---|---|---|
| `GET /api/v1/docs/{c}/{d}` | `get()` | `{"exists", "data", "version", "boot", "update_time", "writer"}` |
| `PUT /api/v1/docs/{c}/{d}` + JSON object | `set()` | `{"ok", "version", "listeners"}` |
| `PATCH /api/v1/docs/{c}/{d}` + JSON object | `update()` (creates the document if missing) | same |
| `DELETE /api/v1/docs/{c}/{d}` | `delete()` | same |
| `GET /api/v1/watch?doc={c}/{d}&doc=...` | `onSnapshot()` | Server-Sent Events: current snapshot, then every change |
| `GET /api/v1/info` | | version, host name, addresses, recent clients, watched documents |
| `GET /api/v1/docs` | | every document (debugging) |

`listeners` in a write reply is the number of pages watching that document; the test
software warns when it writes a command nobody listens to. Field order and number formats
are kept exactly as written. Documents live in memory only.

Auto-discovery: a UDP datagram starting `E2E-LAN-DISCOVER` to the port gets the reply
`E2E-LAN-HERE {json}`; the reply's source address is the one to use.

The Windows side is `e2e_link.py` in CAS, PAS and Chamber Control (identical copies).
