#!/bin/bash
# Double-click to test the cable link WITHOUT a DUT. Same as "Start DUT Controller", plus a
# fake DUT at 127.0.0.1:1314 that answers the page the way the real DUT program does.
# Do not run it while the real DUT program is running: they use the same port.
cd "$(dirname "$0")" || exit 1
xattr -dr com.apple.quarantine . 2>/dev/null
if [ "$(uname -m)" = "arm64" ]; then BIN=bin/dut-controller-arm64; else BIN=bin/dut-controller-x86_64; fi
chmod +x "$BIN" 2>/dev/null
exec "./$BIN" --mock-dut "$@"
