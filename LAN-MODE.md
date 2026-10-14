# E2E automation without internet (LAN mode)

Normally the test software (CAS, PAS or Chamber Control on the Windows test PC) and this page
exchange DUT commands through Firebase, and the page is opened from www.emcwebcontroller.com.
At a site with no internet neither is reachable. In LAN mode:

- the **DUT Controller** program on the Mac serves this page itself and runs a small relay
  that stands in for Firebase;
- the test software reaches the relay over an **Ethernet cable** between the test PC and the Mac.

```
 Windows test PC                         MacBook
 CAS / PAS / Chamber Control             DUT Controller program  (lan-server/)
   e2e_link.py  ── HTTP over the cable ──►  relay: <chamber>/command, status, emitted, information
                                            web page (this repo)  ──► DUT program ws://127.0.0.1:1314
```

The handshake is unchanged: the test software writes `<chamber>/command`; the page fills in the
form, sends the DUT command, and on "Success" writes `<chamber>/emitted` and
`<chamber>/status = "Sent:"`; the test software sees the echo, answers `Recived` and measures.
Only the transport changes, so the page and the test software keep all their logic.

## What to bring

- `DUT-Controller-macOS.zip` (built by `lan-server/build.ps1`, see below), copied to the Mac.
- Test software from the `lan` branch of CAS / PAS / Chamber Control on the test PC.
- An Ethernet cable (USB-C/Thunderbolt Ethernet adapter for the Mac if needed).
- Before going to the site, start the test software once **with** network on that PC so it
  saves the DUT sample list it shows at start-up (it is used offline afterwards).

## Set up once

1. **Cable:** connect the test PC and the Mac directly (or through a small switch).
   Both get a self-assigned `169.254.x.x` address after up to a minute, which works with
   auto-discovery. Optional but more predictable — fixed addresses:
   - Mac: System Settings > Network > (USB/Thunderbolt) Ethernet > Details > TCP/IP >
     Configure IPv4 *Manually*: IP `192.168.50.2`, Subnet mask `255.255.255.0`.
   - Windows: Settings > Network > Ethernet > IP assignment > Edit > Manual, IPv4 on:
     IP `192.168.50.1`, Subnet mask `255.255.255.0` (no gateway, no DNS).
2. **Mac:** unzip `DUT-Controller-macOS.zip` and double-click `Start DUT Controller.command`.
   - "cannot be opened because it is from an unidentified developer": System Settings >
     Privacy & Security > *Open Anyway*. Or in Terminal, once:
     `xattr -dr com.apple.quarantine ~/Downloads/DUT-Controller-macOS`
   - "accept incoming network connections?": **Allow**.
3. **Test PC:** nothing to install. The Windows firewall does not need a rule: the test
   software only makes outgoing connections to the Mac.

## Every run

1. **Mac:** double-click `Start DUT Controller.command`. A Terminal window lists the Mac's
   addresses and then logs every command; the page opens in the browser. Keep both open
   (the program keeps the Mac awake while it runs).
2. **Page:** choose the tab (WIFI / BT / LTE / FR1), Test Type, **Chamber**, Comport, Firmware
   and the DUT program's IP/Port as usual, click **Connect**. Check that **Link** says
   *LAN* and click **Listen**. The line under Link shows the addresses for the test PC,
   whether the test software is connected and which chamber the page listens on.
3. **Test PC:** start CAS / PAS / Chamber Control. In the *Select DUT Sample* window, under
   **DUT control link** choose *LAN*, Mac IP `auto` (or the address from the Terminal
   window), click **Test** — it should say *Connected to the DUT Controller ...* — then
   Confirm. The main window title shows `[DUT link: LAN ...]`.
4. Select the **same chamber** in the test software as on the page and run as usual.

The choice is remembered for CAS, PAS and Chamber Control on that PC; choose *Cloud* in the
same window to go back to Firebase.

## Test the link without a DUT or analyzer

1. Mac: quit the real DUT program, double-click `Start DUT Controller with fake DUT.command`.
2. Page: IP `127.0.0.1`, Port `1314`, Connect (the log shows *Fake DUT ... Ready!*), pick
   a chamber, Listen, and open the WIFI tab.
3. Test PC, in the CAS / PAS / Chamber Control folder (Python needed):

   ```
   python e2e_link.py status
   python e2e_link.py selftest --chamber AM_CS1
   ```

   `selftest` plays the test software's side of the handshake with typical commands and
   prints what the page sent to the DUT and how long the confirmation took (about 1 s).
   `--tech bt|lte|fr1` sends other signal types — open the matching tab on the page first.

## Troubleshooting

| Symptom | Check |
|---|---|
| Test button: *No DUT Controller answered* | DUT Controller running on the Mac? Cable link lights? Wait a minute for 169.254 addresses, or set fixed addresses and type the Mac IP instead of `auto`. |
| Test button: *Cannot reach ... at <ip>* | Wrong IP, or the Mac firewall blocks it: System Settings > Network > Firewall > Options, allow `dut-controller`. |
| Commands sent, DUT never reacts | Page not listening on that chamber: Terminal shows *WARNING: no DUT Controller page is listening on ...*. Pick the same chamber on the page and click Listen. |
| Page shows the command but nothing is confirmed | The DUT program did not answer "Success": check the page log and the DUT program; the page must be **Connected** (DUT) before Listen. |
| Link selector has LAN greyed out | The page was opened from the web site, not from the DUT Controller program. Use the page the program opens (http://127.0.0.1:8686). |
| Chamber Control waits minutes at every step | It is not in LAN mode: its office-network check (`verifyNetwork`) is skipped only in LAN mode. |

## Notes

- Firebase mode is unchanged. The page loads the Firebase SDK only when the Cloud link is
  used, and Bootstrap / SheetJS are now served from `vendor/` (identical files, same SRI
  hashes) so the page also works offline.
- The relay keeps documents in memory only; restarting the DUT Controller clears them. The
  test software rewrites what it needs when a run starts.
- Relay HTTP API and build instructions: [lan-server/README.md](lan-server/README.md).
