
// Get the subtitle buttons and the main page element
import {choiceToJsonCommand,commandToChoice} from "./jsonModify.js";
import {wifi_par_dict,bt_par_dict,lte_par_dict,fr1_par_dict,DUT_TYPE_MAPPING_EXT}  from "./jsonModify.js";
import {adjust_selection}  from "./adjust.js";
import { qurey,connect,completeEmitting,update_status} from "./network.js";
import {readFR1Channels} from "./adjust.js"

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
var recall_button = null
var connect_button = null;
var lastCommand = null;
var awaitSend = null;
var firstTimeConneect = true;
var powerChangeTime = 0
var flag_reset = false;
var reset_and_send = false;
var is_ready = false;

// Initialize Bootstrap Popovers
const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))

export function flagReset(reset_send = false){
  flag_reset = true
  reset_and_send = reset_send;
}

console.log(subtitleButtons.length);

document.addEventListener('DOMContentLoaded', function() {
  mainPage = document.querySelector('#group-area');
  subtitleButtons = document.querySelectorAll('.subtitle button');
  var status = document.getElementById('status_span');
  send_button = document.querySelector('#send-button');
  send_button.disabled = false;
  var remote_button = document.querySelector('#remote-button');
  var ip_input = document.getElementById('ip-address');
  var port_input = document.getElementById('port');
  connect_button = document.querySelector('.connect-form button');
  recall_button = document.getElementById('recall-button');
  var chamber_input = document.getElementById('chamber-dropdown');
  var firmware_input = document.getElementById('firmware-dropdown');
  var test_type_input = document.getElementById("test_type")
  listen_button = document.querySelector('#listen-button');
  listen_button.disabled = false
  var comport_input = document.getElementById('comport');
  textArea = document.getElementById("dialog");
  var socket = null
  var reset_button = document.querySelector('#reset-button');
  reset_button.addEventListener('click', resetInputs);
  setTestType();
  
  //coonecting socket
  listen_button.addEventListener('click',()=>{
    connect(document.getElementById('chamber-dropdown').value);
  })

  recall_button.addEventListener('click', ()=>{
    recall()
  })

  connect_button.addEventListener('click',()=>{
    ip_input = document.getElementById('ip-address');
    port_input = document.getElementById('port');
    document.getElementById('chamber-dropdown');
    connect_button = document.querySelector('.connect-form button');
    comport_input = document.getElementById('comport');
    test_type_input = document.getElementById("test_type")
    
    if(current_test == "" || chamber_input.value == ""){
      alert("Select Somthing!");
      return
    }
  
    status.innerText = "Connecting";
    const str_ip = ip_input.value;
    const str_port = port_input.value;
    const str_chamber = chamber_input.value;
    const str_comport = comport_input.value;
    const str_test_type = document.getElementById("test_type").value
    const str_test_firmware = firmware_input.value
    localStorage.setItem('IP', str_ip);
    localStorage.setItem('Port', str_port);
    localStorage.setItem('Chamber', str_chamber);
    localStorage.setItem('Comport', str_comport);
    localStorage.setItem('Test_Type', str_test_type);
    localStorage.setItem('Test',current_test)
    localStorage.setItem('Firmware',str_test_firmware)
    socket = null;
    socket = new WebSocket(`ws://${str_ip}:${str_port}`);
    socket.onopen = function (event) {
      status.innerText = "Connected, Setting dut......";
      status.style.color = 'green';
      if (firstTimeConneect){
        socket.send(JSON.stringify({"chamber":str_chamber,"test":str_test_type,"comport":str_comport,"firmware":str_test_firmware}));
        firstTimeConneect = false
      }else if(awaitSend){
        socket.send(awaitSend)
      }
    };
    socket.onerror=function(event){
      status.innerText = "Connection Failed";
      status.style.color = 'red';
    }
    socket.addEventListener('open', () => {
      status.innerText = "Connected, Setting dut......";
      status.style.color = 'green';
    });
    var bt_raw_data = ""
    socket.onmessage = function(event){
      textArea.value+=event.data;
      textArea.value += '\n'
      textArea.scrollTop = textArea.scrollHeight;
      let message = event.data.toString();
      if (current_test == "BT" && message.includes("'bluetooth --send_raw")){
        bt_raw_data += '\n'
        bt_raw_data += event.data
      }
      if (message.includes("Success") && message.includes("status")){
        status.innerText = "Success"; 
        status.style.color = 'green';
        if (bt_raw_data!=""){
          completeEmitting(lastCommand,bt_raw_data);
        }else{
          completeEmitting(lastCommand);
        }
        bt_raw_data = ""
      }else if (message.includes("Ready!")){
        send_button.disabled = false;
        listen_button.disabled = false;
        status.innerText = "Connected, DUT Ready!";
        status.style.color = 'green';
        is_ready = true
        update_status("Ready")
      }
      
    }

    socket.addEventListener('close', () => {
      //send_button.disabled = true;
      status.innerText = "No Connection";
      status.style.color = 'red';
    });  
  })

  remote_button.addEventListener('click',()=>{
    document.getElementById("send-button").remove();
    document.getElementById("listen-button").remove();
    remoteControl = true;
  })
  
  function isWifiPowerChange(newCommand){
    try{
      if (newCommand['technology'].includes('BT')|| parseInt(newCommand['power'])<=5){
        return false
      }
      delete newCommand.power;
      for(const k in newCommand){
        if(!(k in JSON.parse(lastCommand))){return false;}
        if(newCommand[k] != JSON.parse(lastCommand)[k]){
          return false;
        }
      }
      return true;
    }catch(err){
      return false;
    }
    
  }
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function recall( ){
    const savedIP = localStorage.getItem('IP');
    if (savedIP == null){
      alert("Nothing to Recall!");
      return
    }
    const savedPort = localStorage.getItem('Port');
    const savedComport = localStorage.getItem('Comport');
    const savedChamber = localStorage.getItem('Chamber');
    const savedTestType = localStorage.getItem('Test_Type');
    const savedTest = localStorage.getItem("Test")
    const savedFirmware = localStorage.getItem("Firmware")
    ip_input.value = savedIP
    port_input.value = savedPort
    comport_input.value = savedComport
    test_type_input.value = savedTestType
    chamber_input.value = savedChamber
    firmware_input.value = savedFirmware
    for(var i=0; i<subtitleButtons.length;i++){
      if (subtitleButtons[i].textContent == savedTest){
        subtitleButtons[i].click()
        break
      }
    }
  }

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
    var jsonCommand = choiceToJsonCommand(dic_choices,selected_test);
    
    if (flag_reset){
      var object = JSON.parse(jsonCommand)
      object['unit_reset'] = reset_and_send;
      socket.send(JSON.stringify(object))
      flag_reset = false
      update_status("Resetting")
      return
    }

    if (isWifiPowerChange(JSON.parse(jsonCommand))&&powerChangeTime<100){//check if only power changed
      var tmp = JSON.parse(jsonCommand);
      tmp['State'] = 'TxPowerChange';//state pnly change power
      jsonCommand  = JSON.stringify(tmp);
      if (socket.readyState == WebSocket.CLOSED){
        socket = new WebSocket(`ws://${ip_input.value}:${port_input.value}`);
        awaitSend = jsonCommand
        return
      }
      socket.send(jsonCommand);
      powerChangeTime += 1;
    }else{
      if (socket.readyState == WebSocket.CLOSED){
        socket = new WebSocket(`ws://${ip_input.value}:${port_input.value}`);
        awaitSend = jsonCommand;
        return
      }
      lastCommand = jsonCommand
      socket.send(jsonCommand);
      powerChangeTime = 0
    }
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
        readFR1Channels();
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
        input.setAttribute('data-id', k);
        console.log(input.id);
        label.innerText = k
        datalist.id = k
        group.appendChild(label)
        // Line 300 - 318: Add the i button right after Ant
        group.appendChild(input);
        group.appendChild(datalist);
        
        if (k === 'Ant' && button.textContent === 'WIFI') {
          const antInfoButton = createAntInfoButton();
          const antContainer = document.createElement('div');
          antContainer.style.display = 'flex';
          antContainer.style.alignItems = 'center';
          
          antContainer.appendChild(label); // Append the label first
          antContainer.appendChild(input); // Append the input
          antContainer.appendChild(antInfoButton); // Append the button next to the label
      
          group.appendChild(antContainer); // Append the container to the group
          // Initialize the popover
          new bootstrap.Popover(antInfoButton);
        }
        
        mainPage.appendChild(group);

        
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
          adjust_selection(selected_test,k,this.value);
        });
        group.appendChild(input);
        group.appendChild(datalist);
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

  function resetInputs() {
    var inputs = document.querySelectorAll('#group-area input');
    inputs.forEach(input => {
      input.value = '';
      input.disabled = false;
    });
  }

});

export function databaseSelection(data){
  if(Object.keys(data).length === 0 || remoteControl){
    return
  }
  if("reset" in data){
    powerChangeTime = 1000;
    flag_reset = true;
    reset_and_send = data['reset'];
  }
  const chocies = commandToChoice(data,test_type_input);
  textArea.value = "New Command Found From Databse!\n";
  textArea.scrollTop = textArea.scrollHeight;
  for(const k in chocies){
    if (document.querySelector(`#input${k}`).value !== chocies[k]){
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

function setTestType(){
  var str = ''
  if (current_test == 'WIFI'){str = 'wifi'}
  else if (current_test == 'BT'){str ='bt'}
  else if (current_test == 'LTE'){str = 'cell'}
  else if (current_test == 'FR1'){str = 'sig'}

  const datalist = document.getElementById('tmp_datalist');
  for(let k= 0;k<DUT_TYPE_MAPPING_EXT.length; k++){
    if(DUT_TYPE_MAPPING_EXT[k].includes(str)){
      let option1 = document.createElement("option");
      option1.value = DUT_TYPE_MAPPING_EXT[k];
      datalist.appendChild(option1);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createAntInfoButton() {
  const button = document.createElement('a');
  button.setAttribute('tabindex', '0');
  button.className = 'btn btn-lg btn-info';
  button.setAttribute('role', 'button');
  button.setAttribute('data-bs-toggle', 'popover');
  button.setAttribute('data-bs-trigger', 'focus');
  button.setAttribute('data-bs-html', 'true');
  button.setAttribute('data-bs-title', 'Ant Information');
  button.style.cssText = 'width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; padding: 0; font-size: 12px; margin-left: 5px;'; // Add margin-left here
  button.setAttribute('data-bs-content', 'C0A0: Primary Ant1<br/> C1A0: Primary Ant2<br/>C0A0+C1A0: Primary MIMO<br/>C0A1: Diversity Ant1<br/>C1A1: Diversity Ant2<br/>C0A1+C1A0: MIMO Ant1 Diversity<br/>C0A0+C1A1: MIMO Ant2 Diversity');
  button.textContent = 'i';
  return button;
}



export function recall_page(){
  sleep(5000)
  location.reload()
  sleep(2000)
  recall_button.click()
  connect_button.click()
  while(!is_ready){
    sleep(2)
  }
  listen_button.click()
}




