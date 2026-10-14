#!/bin/bash
# Double-click to start the DUT Controller: the web page plus the LAN relay that the test
# software (CAS / PAS / Chamber Control) reaches over the Ethernet cable.
# Keep this window open while testing; close it or press Ctrl+C to stop.
cd "$(dirname "$0")" || exit 1
# A downloaded or AirDropped copy is quarantined, which blocks unsigned programs. Clear it.
xattr -dr com.apple.quarantine . 2>/dev/null
if [ "$(uname -m)" = "arm64" ]; then BIN=bin/dut-controller-arm64; else BIN=bin/dut-controller-x86_64; fi
chmod +x "$BIN" 2>/dev/null
exec "./$BIN" "$@"
