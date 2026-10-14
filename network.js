// DUT command mailbox of the E2E automation. The test software writes <chamber>/command;
// this page applies it to the DUT and confirms through <chamber>/emitted and <chamber>/status.
//
// The documents live behind one of two links, used through the same Firestore calls:
//   cloud - Firebase Firestore. The SDK is loaded only when this link is used, so the page
//           still starts without internet.
//   lan   - the relay inside the DUT Controller app that served this page. The test software
//           reaches it over a direct Ethernet cable; no internet needed (see LAN-MODE.md).
import { databaseSelection } from "./main.js";
import * as lanStore from "./lanstore.js";

const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/9.0.0/";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const billFirebaseConfig = {
  apiKey: "AIzaSyAPcGqDQOyANXdphMealcsxF06FGwsmmaw",
  authDomain: "emctest-dd6c4.firebaseapp.com",
  projectId: "emctest-dd6c4",
  storageBucket: "emctest-dd6c4.appspot.com",
  messagingSenderId: "1016272423493",
  appId: "1:1016272423493:web:247f03ec74367a772af12c",
  measurementId: "G-0YPS3KD6Q3"
};
const elementFirebaseConfig = {
  apiKey: "AIzaSyCkwA4ezwidWNRf6LzU6Wkg8K0fpgj7nlM",
  authDomain: "element-testing-407f5.firebaseapp.com",
  databaseURL: "https://element-testing-407f5-default-rtdb.firebaseio.com",
  projectId: "element-testing-407f5",
  storageBucket: "element-testing-407f5.appspot.com",
  messagingSenderId: "1057313988203",
  appId: "1:1057313988203:web:a90ef1308a7299ceb35b2e"
};

const LINK_MODE_KEY = 'LinkMode';
var linkMode = "cloud";
var relayAvailable = false;

var store = null;      // Firestore functions of the active link: doc, getDoc, setDoc, onSnapshot
var db = null;
var storeMode = "";
var listeners = [];    // unsubscribe functions of the current Listen

var selected_chamber = "";
var lastCommand = {};
var aSocket =  new WebSocket(`ws://127.0.0.1:9669`);
aSocket.onmessage = function(event){
  if (event.data == "Websocket Good"){
    var btconnect = document.querySelector('.connect-form button');
    btconnect.click()
  }
}

// Picks the link at page load: LAN when this page came from the DUT Controller app (unless
// Cloud was chosen before), otherwise Cloud. Returns the relay status, or null.
export async function initLink(){
  const relay = await lanStore.probe();
  relayAvailable = relay !== null;
  const saved = localStorage.getItem(LINK_MODE_KEY);
  if (!relayAvailable){
    linkMode = "cloud";
  }else{
    linkMode = saved === "cloud" ? "cloud" : "lan";
  }
  return relay;
}

export function getLinkMode(){
  return linkMode;
}

export function setLinkMode(mode){
  if (mode === "lan" && !relayAvailable){
    throw new Error("The LAN link needs the page to be opened from the DUT Controller app.");
  }
  linkMode = mode;
  localStorage.setItem(LINK_MODE_KEY, mode);
  stopListening();
  selected_chamber = "";
}

async function openStore(){
  if (store && storeMode === linkMode){
    return;
  }
  if (linkMode === "lan"){
    store = lanStore;
    db = lanStore.getFirestore();
  }else{
    const [firebaseApp, firestore] = await Promise.all([
      import(FIREBASE_SDK + "firebase-app.js"),
      import(FIREBASE_SDK + "firebase-firestore.js"),
    ]);
    const apps = firebaseApp.getApps();
    const app = apps.length ? apps[0] : firebaseApp.initializeApp(elementFirebaseConfig);
    store = firestore;
    db = firestore.getFirestore(app);
  }
  storeMode = linkMode;
}

function stopListening(){
  listeners.forEach((unsubscribe) => unsubscribe());
  listeners = [];
}

export async function qurey(chamber,information){
    await openStore();
    const docRef = store.doc(db,chamber,information);
    const docSnap = await store.getDoc(docRef);
    if (docSnap.exists()) {
        console.log("Document data:", docSnap.data());
      } else {
        console.log("No such document!");
      }
}

export async function completeEmitting(data = NaN,bt_raw = ""){
    if (!store || selected_chamber === ""){
      console.log("Not listening to a chamber; nothing to confirm.");
      return;
    }
    await store.setDoc(store.doc(db,selected_chamber,"emitted"),lastCommand);
    await store.setDoc(store.doc(db,selected_chamber,"status"),{"status":"Sent:","Json":data});
    //await setDoc(doc(db,selected_chamber,"status"),{"status":"Sent:","Json":data});
    /*if(bt_raw!=""){
      await setDoc(doc(db,selected_chamber,"status"),{"status":"Sent:","Json":data,"bt_raw":bt_raw});
    }else{
      await setDoc(doc(db,selected_chamber,"status"),{"status":"Sent:","Json":data});
    }*/
    console.log("Notified Server!");
}


export async function connect(chamber,remoteMode = false){
    await openStore();
    stopListening();   // a second Listen replaces the first instead of applying every command twice
    selected_chamber = chamber;
    await store.setDoc(store.doc(db,selected_chamber,"emitted"),{"Connected":"Success"});
    await store.setDoc(store.doc(db,selected_chamber,"status"),{"status":"Sent:"});
    listeners.push(store.onSnapshot(
      store.doc(db, chamber, "command"),
      { includeMetadataChanges: true },
      (doc) => {
          if (!doc.exists()){
            return;
          }
          lastCommand = doc.data();
          databaseSelection(doc.data());
    }));
    listeners.push(store.onSnapshot(
      store.doc(db, chamber, "information"),
      { includeMetadataChanges: true },
      (doc) => {
          var lastInformation = doc.data();
          if (lastInformation && lastInformation['status'] !== null && lastInformation['status'] == 'Restart'){
            //flagReset()
            //databaseSelection(lastCommand);
            console.log("OK");
          }
    }));

}

export async function update_status(status){
  if(selected_chamber!=="" && store){
    await store.setDoc(store.doc(db,selected_chamber,"information"),{"status":status});
  }
}
