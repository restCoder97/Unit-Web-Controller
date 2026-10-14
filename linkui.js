// "Link" selector (Cloud / LAN) and the status line under it in the Configuration card.
// In LAN mode the line shows the addresses the test software should use, whether it is
// connected, and which chamber this page listens on - the usual suspects when commands
// do not arrive.
import { initLink, getLinkMode, setLinkMode } from "./network.js";
import { probe } from "./lanstore.js";

const REFRESH_MS = 2000;

export async function setupLinkControls(log) {
  const select = document.getElementById("link-mode");
  const status = document.getElementById("link-status");
  const relay = await initLink();
  select.querySelector('option[value="lan"]').disabled = relay === null;
  select.value = getLinkMode();

  select.addEventListener("change", () => {
    setLinkMode(select.value);
    log(`Link changed to ${select.value === "lan" ? "LAN" : "Cloud"}. Click Listen to receive commands.`);
    render();
  });

  async function render() {
    if (getLinkMode() !== "lan") {
      status.textContent = relay
        ? "Commands come from Firebase (needs internet). Choose LAN for a direct cable to the test PC."
        : "Commands come from Firebase (needs internet).";
      return;
    }
    const info = await probe();
    if (!info) {
      status.textContent = "LAN relay not answering - is the DUT Controller app still running?";
      return;
    }
    const addresses = info.addresses.map((a) => a.ip).join(" or ") || "no network address yet (plug in the cable)";
    const testSoftware = info.clients.filter((c) => !c.page);
    const peers = testSoftware.length
      ? testSoftware.map((c) => `${c.name} @${c.address} (${Math.round(c.last_seen_ms_ago / 1000)} s ago)`).join("; ")
      : "not connected yet";
    const chambers = info.listening.filter((p) => p.endsWith("/command")).map((p) => p.slice(0, -"/command".length));
    status.textContent =
      `Test PC connects to ${addresses} port ${info.port}. ` +
      `Test software: ${peers}. ` +
      `Listening on: ${chambers.length ? chambers.join(", ") : "nothing - click Listen"}.` +
      (info.mock_dut ? ` Fake DUT at ${info.mock_dut}.` : "");
  }

  render();
  setInterval(render, REFRESH_MS);
}
