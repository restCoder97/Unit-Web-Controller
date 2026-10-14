# Builds the DUT Controller (web page + LAN relay) for macOS - Apple Silicon and Intel - and
# Windows, from a Windows PC. Needs Go 1.22 or newer (https://go.dev/dl). No cgo, no Mac needed.
#
#   .\build.ps1                                  # uses "go" from PATH, writes .\dist
#   .\build.ps1 -Go C:\tools\go\bin\go.exe -Version 1.0.1
#
# Output in dist\:
#   DUT-Controller-macOS.zip          copy to the Mac, unzip, double-click "Start DUT Controller"
#   dut-controller-windows-x64.exe    the same program on Windows (for trying it out here)
param(
    [string]$Go = "go",
    [string]$Version = "1.0.0"
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$site = Split-Path $here -Parent
$webroot = Join-Path $here "webroot"
$dist = Join-Path $here "dist"
$macDir = Join-Path $dist "DUT-Controller-macOS"

$commit = $null
try { $commit = (& git -C $site rev-parse --short HEAD) } catch { }   # optional: tags the version
if ($commit) { $Version = "$Version+$commit" }
Write-Host "Building DUT Controller $Version"

# 1. Copy the web page into webroot\ so it gets built into the program.
Get-ChildItem $webroot -Force | Where-Object { $_.Name -ne ".keep" } | Remove-Item -Recurse -Force
foreach ($pattern in @("index.html", "*.js", "style.css")) {
    Copy-Item (Join-Path $site $pattern) $webroot
}
Copy-Item (Join-Path $site "vendor") $webroot -Recurse
New-Item -ItemType Directory -Force (Join-Path $webroot "Media") | Out-Null
Get-ChildItem (Join-Path $site "Media") -File | Where-Object { $_.Name -ne ".DS_Store" } |
    Copy-Item -Destination (Join-Path $webroot "Media")

Push-Location $here
try {
    # 2. Check, then build each target. CGO stays off so cross-compiling needs no C toolchain;
    #    Go signs the Apple Silicon binary (ad hoc) itself, which macOS requires.
    $env:CGO_ENABLED = "0"
    & $Go vet ./...
    if ($LASTEXITCODE -ne 0) { throw "go vet failed" }
    & $Go test ./...
    if ($LASTEXITCODE -ne 0) { throw "go test failed" }

    if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
    New-Item -ItemType Directory -Force (Join-Path $macDir "bin") | Out-Null
    $ldflags = "-s -w -X main.version=$Version"
    $targets = @(
        @{ os = "darwin";  arch = "arm64"; out = (Join-Path $macDir "bin\dut-controller-arm64") },
        @{ os = "darwin";  arch = "amd64"; out = (Join-Path $macDir "bin\dut-controller-x86_64") },
        @{ os = "windows"; arch = "amd64"; out = (Join-Path $dist "dut-controller-windows-x64.exe") }
    )
    foreach ($t in $targets) {
        $env:GOOS = $t.os
        $env:GOARCH = $t.arch
        & $Go build -trimpath -ldflags $ldflags -o $t.out .
        if ($LASTEXITCODE -ne 0) { throw "build for $($t.os)/$($t.arch) failed" }
        Write-Host "  built $($t.out)"
    }
    Remove-Item Env:GOOS, Env:GOARCH

    # 3. Launchers and instructions next to the programs, then a zip that keeps them executable.
    Copy-Item (Join-Path $here "package\*") $macDir
    & $Go run ./tools/mkzip -o (Join-Path $dist "DUT-Controller-macOS.zip") $macDir
    if ($LASTEXITCODE -ne 0) { throw "zip failed" }
}
finally {
    Remove-Item Env:GOOS, Env:GOARCH, Env:CGO_ENABLED -ErrorAction SilentlyContinue
    Pop-Location
}

Write-Host ""
Get-ChildItem $dist -File | ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
    Write-Host ("{0,-34} {1,10:N0} bytes  sha256 {2}" -f $_.Name, $_.Length, $hash)
}
