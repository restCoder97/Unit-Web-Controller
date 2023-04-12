
// Get the subtitle buttons and the main page element
import {choiceToJsonCommand,commandToChoice} from "./jsonModify.js";
import {wifi_par_dict,bt_par_dict,lte_par_dict,fr1_par_dict}  from "./jsonModify.js";
import {adjust_selection}  from "./adjust.js";
import { qurey,connect,completeEmitting} from "./network.js";

Element.prototype.remove = function() {
  this.parentElement.removeChild(this);
}
NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
  for(var i = this.length - 1; i >= 0; i--) {
      if(this[i] && this[i].parentElement) {
          this[i].parentElement.removeChild(this[i]);
      }
  }
}
var subtitleButtons = document.querySelectorAll('.subtitle button');
var send_button = document.querySelector('#send-button');

var remoteControl = false;
var mainPage = document.querySelector('#group-area');
var selected_par_dict = null;
var selected_test = null;
var current_test = "";
var textArea = null;
var listen_button = null;
var timerId = setTimeout(() => {
  if (socket.readyState === WebSocket.OPEN) {
    // Connection is still open but no response received
    alert('No response received within 30 seconds');
  }
}, 9999999999999999);;
console.log(subtitleButtons.length);

document.addEventListener('DOMContentLoaded', function() {
  mainPage = document.querySelector('#group-area');
  subtitleButtons = document.querySelectorAll('.subtitle button');
  var status = document.getElementById('status_span');
  send_button = document.querySelector('#send-button');
  send_button.disabled = true;
  var remote_button = document.querySelector('#remote-button');
  var ip_input = document.getElementById('ip-address');
  var port_input = document.getElementById('port');
  var connect_button = document.querySelector('.connect-form button');
  listen_button = document.querySelector('#listen-button');
  listen_button.disabled = true
  var comport_input = null;
  textArea = document.getElementById("dialog");
  var socket = null
  
  //coonecting socket
  listen_button.addEventListener('click',()=>{
    connect(document.getElementById('chamber-dropdown').value);
  })

  connect_button.addEventListener('click',()=>{
    ip_input = document.getElementById('ip-address');
    port_input = document.getElementById('port');
    var chamber_input = document.getElementById('chamber-dropdown');
    connect_button = document.querySelector('.connect-form button');
    comport_input = document.getElementById('comport');

    if(current_test == "" || chamber_input.value == ""){
      alert("Select a Everything!");
      return
    }
    status.innerText = "Connecting";
    const str_ip = ip_input.value;
    const str_port = port_input.value;
    const str_chamber = chamber_input.value;
    const str_comport = comport_input.value;

    socket = new WebSocket(`ws://${str_ip}:${str_port}`);
    socket.onopen = function (event) {
      status.innerText = "Connected, Setting dut......";
      status.style.color = 'green';
      socket.send(JSON.stringify({"chamber":str_chamber,"test":current_test,"comport":str_comport}));
    };
    socket.onerror=function(event){
      status.innerText = "Connection Failed";
      status.style.color = 'red';
    }
    socket.addEventListener('open', () => {
      status.innerText = "Connected, Setting dut......";
      status.style.color = 'green';
    });
    
    socket.onmessage = function(event){
      clearTimeout(timerId);
      textArea.value+=event.data;
      textArea.scrollTop = textArea.scrollHeight;
      let message = event.data.toString();
      if (message.includes("Success")){
        status.innerText = "Success"; 
        status.style.color = 'green';
        completeEmitting();
      }else if (message.includes("Ready!")){
        send_button.disabled = false;
        listen_button.disabled = false;
        status.innerText = "Connected, DUT Ready!";
        status.style.color = 'green';
      }
      else{
        alert("Check the parameters!");
        status.style.color = 'Red'; 
      }
    }

    socket.addEventListener('close', () => {
      send_button.disabled = true;
      status.innerText = "No Connection";
      status.style.color = 'red';
    });  
  })

  remote_button.addEventListener('click',()=>{
    document.getElementById("send-button").remove();
    document.getElementById("listen-button").remove();
    remoteControl = true;
  })
  

  //sending socket
  send_button.addEventListener('click',()=>{
    status.innerText = "Waiting DUT Reply";
    status.style.color = 'yellow';
    var dic_choices = {};
    for(const k in selected_par_dict){
      console.log(`#input${k}`);
      const choice = document.querySelector(`#input${k}`).value;
      dic_choices[k] = choice;
    }
    let jsonCommand = choiceToJsonCommand(dic_choices,selected_test);
    textArea.value+=jsonCommand;
    textArea.scrollTop = textArea.scrollHeight;
    socket.send(jsonCommand);

    timerId = setTimeout(() => {
      if (socket.readyState === WebSocket.OPEN) {
        // Connection is still open but no response received
        alert('No response received within 30 seconds');
      }
    }, 90000);

    
  })
  // Listen for click events on the subtitle buttons
  subtitleButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove all existing group elements from the main page
      mainPage.innerHTML = '';
      current_test = button.textContent;
      // Determine how many groups to add based on which button was clicked
      let parFileName = "";
      if (button.textContent === 'WIFI') {
        var parDict = wifi_par_dict;
        selected_test = "WIFI";
      } else if (button.textContent === 'FR1') {
        var parDict = fr1_par_dict;
        selected_test = "FR1";
      } else if (button.textContent === 'LTE') {
        var parDict = lte_par_dict;
        selected_test = "LTE";
      }else if (button.textContent === 'BT') {
        var parDict = bt_par_dict;
        selected_test = "BT";
      }
      selected_par_dict = parDict
      // Add the appropriate number of group elements to the main page
      for (const k in parDict) {
        const group = document.createElement('div');
        group.className = 'group';
        group.id = 'group' + k;
        const datalist = document.createElement('datalist')
        const input = document.createElement('input')
        const label = document.createElement('label')
        label.id = 'label'+k;
        input.id = 'input'+k;
        console.log(input.id);
        label.innerText = k
        datalist.id = k
        group.appendChild(label)
        if (typeof parDict[k] === "string"){//a number range
          var start = +parDict[k].split('-')[0];
          var end = +parDict[k].split('-')[1];
          for(let i = start; i<=end;i++){
            let option1 = document.createElement("option");
            option1.value = i.toString();
            datalist.appendChild(option1);
          }
          input.setAttribute("list",datalist.id)
        }else{//a list string
          for (let i = 0;i< parDict[k].length;i++){
            let option1 = document.createElement("option");
            option1.value = parDict[k][i].toString();
            datalist.appendChild(option1);
          }
          input.setAttribute("list",datalist.id)
        }
        input.addEventListener('input', function (event){
          adjust_selection(selected_test,this.id,this.value)
        });
        group.appendChild(input)
        group.appendChild(datalist)
        mainPage.appendChild(group);
    }

    // Remove the "active" class from all subtitle buttons
    subtitleButtons.forEach(btn => {
      btn.classList.remove('active');
    });

    // Add the "active" class to the clicked subtitle button
    button.classList.add('active');

  });
  });
});


export function databaseSelection(data){
  if(remoteControl){
    return
  }
  const chocies = commandToChoice(data);
  textArea.value+= "New Command Found From Databse!\n";
  textArea.value+=JSON.stringify(data);
  textArea.scrollTop = textArea.scrollHeight;
  for(const k in chocies){
    if (document.querySelector(`#input${k}`).value != chocies[k]){
      document.querySelector(`#input${k}`).value = chocies[k];
      setTimeout(function() {
        var label = document.querySelector(`#label${k}`);
        label.style.color = 'yellow';
        setTimeout(function() {
          label.style.color = "#000080";
        }, 1000);
      }, 0);
    }
  }
  send_button.click();
}





