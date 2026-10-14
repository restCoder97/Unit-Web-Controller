#!/bin/bash
# Same as build.ps1, for a Mac or Linux machine with Go 1.22+ installed.
#   ./build.sh                      # writes ./dist
#   GO=/usr/local/go/bin/go VERSION=1.0.1 ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
GO=${GO:-go}
VERSION=${VERSION:-1.0.0}
COMMIT=$(git -C .. rev-parse --short HEAD 2>/dev/null || true)
[ -n "$COMMIT" ] && VERSION="$VERSION+$COMMIT"
echo "Building DUT Controller $VERSION"

# 1. Copy the web page into webroot/ so it gets built into the program.
find webroot -mindepth 1 ! -name .keep -exec rm -rf {} +
cp ../index.html ../*.js ../style.css webroot/
cp -R ../vendor webroot/
mkdir -p webroot/Media
find ../Media -maxdepth 1 -type f ! -name .DS_Store -exec cp {} webroot/Media/ \;

# 2. Check, then build each target (no cgo, so any host can build every target).
export CGO_ENABLED=0
"$GO" vet ./...
"$GO" test ./...
rm -rf dist
MAC=dist/DUT-Controller-macOS
mkdir -p "$MAC/bin"
LDFLAGS="-s -w -X main.version=$VERSION"
GOOS=darwin GOARCH=arm64 "$GO" build -trimpath -ldflags "$LDFLAGS" -o "$MAC/bin/dut-controller-arm64" .
GOOS=darwin GOARCH=amd64 "$GO" build -trimpath -ldflags "$LDFLAGS" -o "$MAC/bin/dut-controller-x86_64" .
GOOS=windows GOARCH=amd64 "$GO" build -trimpath -ldflags "$LDFLAGS" -o dist/dut-controller-windows-x64.exe .

# 3. Launchers and instructions next to the programs, then a zip that keeps them executable.
cp package/* "$MAC/"
"$GO" run ./tools/mkzip -o dist/DUT-Controller-macOS.zip "$MAC"
ls -l dist
