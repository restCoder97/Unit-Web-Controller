
// Get the subtitle buttons and the main page element
import {choiceToJsonCommand} from "./jsonModify.js";
import {wifi_par_dict}  from "./jsonModify.js";
import {bt_par_dict}  from "./jsonModify.js";
import {adjust_selection}  from "./adjust.js";


var subtitleButtons = document.querySelectorAll('.subtitle button');
var send_button = document.querySelector('#send-button');
var mainPage = document.querySelector('#group-area');
var selected_par_dict = null;
var selected_test = null;
var current_test = "";
console.log(subtitleButtons.length);



document.addEventListener('DOMContentLoaded', function() {
  mainPage = document.querySelector('#group-area');
  subtitleButtons = document.querySelectorAll('.subtitle button');
  var status = document.getElementById('status_span');
  send_button = document.querySelector('#send-button');
  send_button.disabled = true;
  var ip_input = document.getElementById('ip-address');
  var port_input = document.getElementById('port');
  var connect_button = document.querySelector('.connect-form button');
  var textArea = document.getElementById("dialog");
  var socket = null
  

  //coonecting socket
  
  connect_button.addEventListener('click',()=>{
    ip_input = document.getElementById('ip-address');
    port_input = document.getElementById('port');
    var chamber_input = document.getElementById('chamber-dropdown');
    connect_button = document.querySelector('.connect-form button');
    if(current_test == "" || chamber_input.value == ""){
      alert("Select a Everything!");
    }
    status.innerText = "Connecting";
    const str_ip = ip_input.value;
    const str_port = port_input.value;
    const str_chamber = chamber_input.value;
    

    socket = new WebSocket(`ws://${str_ip}:${str_port}`);


    socket.onopen = function (event) {
      status.innerText = "Connected";
      status.style.color = 'green';
      socket.send(JSON.stringify({"chamber":str_chamber,"test":current_test}));
    };
    socket.onerror=function(event){
      status.innerText = "Connection Failed";
      status.style.color = 'red';
    }
    socket.addEventListener('open', () => {
      send_button.disabled = false;
      status.innerText = "Connected";
      status.style.color = 'green';
    });
    
    socket.addEventListener('close', () => {
      send_button.disabled = true;
      status.innerText = "No Connection";
      status.style.color = 'red';
    });



    
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

    const timerId = setTimeout(() => {
      if (socket.readyState === WebSocket.OPEN) {
        // Connection is still open but no response received
        alert('No response received within 30 seconds');
      }
    }, 30000);

    socket.onmessage = function(event){
      clearTimeout(timerId);
      textArea.value+=event.data;
      textArea.scrollTop = textArea.scrollHeight;
      let message = event.data.toString();
      if (message.includes("Success")){
        status.innerText = "Success"; 
        status.style.color = 'green';
      }else{
        alert("Check the parameters!");
        status.style.color = 'green'; 
      }
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
        parFileName = "./test_parameters/wifi_par.json";
      } else if (button.textContent === 'LTE') {
        parFileName = "./test_parameters/wifi_par.json";
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







