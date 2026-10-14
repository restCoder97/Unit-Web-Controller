DUT Controller for macOS - LAN mode (no internet needed)
=========================================================

This runs the DUT Remote Control web page on this Mac and lets the test software on the
Windows test PC (CAS, PAS or Chamber Control) send it DUT commands over an Ethernet cable,
instead of through Firebase.

  Start DUT Controller.command                 normal use, with the real DUT program
  Start DUT Controller with fake DUT.command   test the cable link without a DUT
  bin/                                         the programs (Apple Silicon and Intel)

First time on this Mac
----------------------
1. Copy this folder to the Mac (a USB stick is easiest) and unzip it.
2. Double-click "Start DUT Controller.command".
   If macOS says it cannot be opened (unidentified developer): open
   System Settings > Privacy & Security, scroll down and click "Open Anyway", or run once
   in Terminal:   xattr -dr com.apple.quarantine <drag this folder here>
3. If macOS asks whether to accept incoming network connections, click Allow.

Every time
----------
1. Connect the Mac and the test PC with the Ethernet cable (directly or through a switch).
2. Double-click "Start DUT Controller.command". A Terminal window shows the Mac's
   addresses and every command; the page opens in the browser. Keep both open.
3. On the page: pick the test tab (WIFI / BT / LTE / FR1), Test Type, Chamber, Comport and
   Firmware, click Connect (DUT), then make sure "Link" says LAN and click Listen.
4. On the test PC: in the start-up "Select DUT Sample" window choose
   "LAN - Ethernet cable to the DUT Controller Mac" with Mac IP "auto" (or the address the
   Terminal window shows), click Test, then Confirm. Select the SAME chamber as on the page.

Testing without a DUT
---------------------
Double-click "Start DUT Controller with fake DUT.command" instead (quit the real DUT program
first). On the page set IP 127.0.0.1 and Port 1314, Connect, then Listen. The fake DUT
answers every command, so the test software sees "DUT Start Emittion" as with a real DUT.
From the test PC folder you can also run:  python e2e_link.py selftest --chamber <chamber>

The full guide is LAN-MODE.md in the Unit-Web-Controller repository.
