// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js"
import { collection, getDoc, addDoc, Timestamp,doc} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js"
import { query, orderBy, limit, where, onSnapshot,setDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js"
import { databaseSelection,flagReset,recall_page } from "./main.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
 
var app = NaN;
var db = NaN;

var selected_chamber = "";
var lastCommand = {};
// var aSocket =  new WebSocket(`ws://127.0.0.1:9669`);
// aSocket.onmessage = function(event){
//   if (event.data == "Websocket Good"){
//     var btconnect = document.querySelector('.connect-form button');
//     btconnect.click()
//   }
// }

export async function qurey(chamber,information){    
    const docRef = doc(db,chamber,information);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        console.log("Document data:", docSnap.data());
      } else {
        console.log("No such document!");
      }
}

export async function completeEmitting(data = NaN,bt_raw = ""){
    await setDoc(doc(db,selected_chamber,"emitted"),lastCommand);
    await setDoc(doc(db,selected_chamber,"status"),{"status":"Sent:","Json":data});
    //await setDoc(doc(db,selected_chamber,"status"),{"status":"Sent:","Json":data});
    /*if(bt_raw!=""){
      await setDoc(doc(db,selected_chamber,"status"),{"status":"Sent:","Json":data,"bt_raw":bt_raw});
    }else{
      await setDoc(doc(db,selected_chamber,"status"),{"status":"Sent:","Json":data});
    }*/
    console.log("Notified Server!");
}


export async function connect(chamber,remoteMode = false){
    selected_chamber = chamber;
    app = initializeApp(elementFirebaseConfig);
    db = getFirestore(app);
    
    //app = initializeApp(billFirebaseConfig);
    //db = getFirestore(app);
    
    
    await setDoc(doc(db,selected_chamber,"emitted"),{"Connected":"Success"});
    await setDoc(doc(db,selected_chamber,"status"),{"status":"Sent:"});
    const unsub = onSnapshot(
      doc(db, chamber, "command"), 
      { includeMetadataChanges: true }, 
      (doc) => {
          lastCommand = doc.data();
          databaseSelection(doc.data());
    });
    const onInformation = onSnapshot(
      doc(db, chamber, "information"), 
      { includeMetadataChanges: true }, 
      (doc) => {
          var lastInformation = doc.data();
          if (lastInformation['status'] !== null && lastInformation['status'] == 'Restart'){
            //flagReset()
            //databaseSelection(lastCommand);
            console.log("OK");
          }
    });

}

export async function update_status(status){
  if(selected_chamber!==""){
    await setDoc(doc(db,selected_chamber,"information"),{"status":status});
  }
}

