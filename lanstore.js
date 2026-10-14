// Firestore-style access to the LAN relay built into the DUT Controller app (lan-server/).
// Provides the calls network.js makes on Firestore - getFirestore, doc, getDoc, setDoc,
// updateDoc, onSnapshot - so the E2E handshake code is the same for both links.
// The relay is the server this page was loaded from, so every URL is same-origin.

const API = "/api/v1";
const CLIENT_NAME = "DUT Controller page";
const CLIENT_HEADERS = { "X-E2E-Client": CLIENT_NAME };

class Snapshot {
  constructor(id, body) {
    this.id = id;
    this._exists = Boolean(body && body.exists);
    this._data = this._exists ? body.data : undefined;
  }
  exists() {
    return this._exists;
  }
  data() {
    return this._data;
  }
}

// Relay status ({app, hostname, addresses, clients, listening, ...}) or null when this page
// was not served by the DUT Controller app (e.g. the public web site).
export async function probe(timeoutMs = 1500) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}/info`, { cache: "no-store", signal: abort.signal });
    if (!res.ok) return null;
    const info = await res.json();
    return info && info.app ? info : null;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function getFirestore() {
  return { link: "lan" };
}

export function doc(db, collection, id) {
  return { id, path: `${collection}/${id}`, url: `${API}/docs/${encodeURIComponent(collection)}/${encodeURIComponent(id)}` };
}

async function request(method, ref, data) {
  const init = { method, headers: { ...CLIENT_HEADERS }, cache: "no-store" };
  if (data !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(data);
  }
  const res = await fetch(ref.url, init);
  if (!res.ok) {
    throw new Error(`LAN relay ${method} ${ref.path} failed: HTTP ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getDoc(ref) {
  return new Snapshot(ref.id, await request("GET", ref));
}

export async function setDoc(ref, data) {
  await request("PUT", ref, data ?? {});
}

export async function updateDoc(ref, data) {
  await request("PATCH", ref, data);
}

// Calls back with the document now and after every change, like Firestore's onSnapshot.
// EventSource reconnects by itself; a snapshot already delivered is not repeated, so a
// reconnect never sends the same DUT command twice.
export function onSnapshot(ref, optionsOrCallback, maybeCallback) {
  const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;
  const source = new EventSource(
    `${API}/watch?doc=${encodeURIComponent(ref.path)}&client=${encodeURIComponent(CLIENT_NAME)}`);
  let delivered = "";
  source.addEventListener("snapshot", (event) => {
    let body;
    try {
      body = JSON.parse(event.data);
    } catch (err) {
      console.error(`LAN relay sent an unreadable snapshot for ${ref.path}`, err);
      return;
    }
    const version = `${body.boot}:${body.version}`;
    if (version === delivered) return;
    delivered = version;
    try {
      callback(new Snapshot(ref.id, body));
    } catch (err) {
      console.error(`Listener for ${ref.path} failed`, err);
    }
  });
  return () => source.close();
}
