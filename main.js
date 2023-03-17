// Get the subtitle buttons and the main page element

var subtitleButtons = document.querySelectorAll('.subtitle button');
var send_button = document.querySelector('#send-button');
var mainPage = document.querySelector('#group-area');
var current_test = "";
console.log(subtitleButtons.length)

wifi_par_dict = {
  "Technology":["U-NII","DTS"],
  "Mode":["11b","11n","11ax(RU)","11ax(SU)","11ac"],
  "Ant": ["1","2","3"],
  "Bandwidth":["20 MHz","40 MHz","80 Mhz","160 MHz"],
  "Channel": "1-165",
  "Rate": "0-50",
  "RU Index":"1-13",
  "RU Length":["RU26","RU52", "RU106","RU242","RU484","RU968","RU61"],
  "Power (Q)":"1-100"
}

document.addEventListener('DOMContentLoaded', function() {
  mainPage = document.querySelector('#group-area');
  subtitleButtons = document.querySelectorAll('.subtitle button');
  send_button = document.querySelector('#send-button');
  var ip_input = document.getElementById('ip-address');
  var port_input = document.getElementById('port');
  var connect_button = document.querySelector('.connect-form button');
  var socket = null

  //coonecting socket
  
  connect_button.addEventListener('click',()=>{
    ip_input = document.getElementById('ip-address');
    port_input = document.getElementById('port');
    connect_button = document.querySelector('.connect-form button');
    console.log('Trying Connect To Test Macbook.');
    const str_ip = ip_input.value;
    const str_port = port_input.value;
    const socketName = `ws://${str_ip}:${str_port}`;
    console.log(socketName);
    socket = new WebSocket(`ws://${str_ip}:${str_port}`);
  })


  //sending socket
  send_button.addEventListener('click',()=>{
    console.log('Sending Json Command!');
    socket.send(JSON.stringify({
      "testType": "BE",
      "mode": "11ax",
      "sisoOrMimo": "SISO",
      "tone": "242T",
      "bandedgeLowOrHigh": "Low",
      "frequency": "5180",
      "power": "1",
      "antenna": "1",
      "dataRate": "MCS0",
      "resourceUnit": "RU61",
      "band": "5.3",
      "transmissionDuration": "1",
      "period": "1",
      "polarity": "H",
      "technology": "WLAN U-NII 11ax",
      "channel": "38",
      "echoDelay": 0,
      "mimoScheme": "",
      "bandwidth": 40,
      "bandwidthUnits": "MHz",
      "bandageLowOrHigh": ""
    }));
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
        parDict = wifi_par_dict;
      } else if (button.textContent === 'FR1') {
        parFileName = "./test_parameters/wifi_par.json";
      } else if (button.textContent === 'LTE') {
        parFileName = "./test_parameters/wifi_par.json";
      }else if (button.textContent === 'BT') {
        parFileName = "./test_parameters/wifi_par.json";
      }
      var selected_par_dict = parDict
      // Add the appropriate number of group elements to the main page
      for (const k in parDict) {
        const group = document.createElement('div');
        group.className = 'group';
        group.id = 'group' + k;
        const datalist = document.createElement('datalist')
        const input = document.createElement('input')
        const label = document.createElement('label')
        label.innerText = k
        datalist.id = k
        group.appendChild(label)
        if (typeof parDict[k] === "string"){//a number range
          start = +parDict[k].split('-')[0];
          end = +parDict[k].split('-')[1];
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






function readJSONFileToDictionary(filePath) {
  return fetch(filePath)
    .then(response => response.json())
    .then(data => {
      // create an empty dictionary object
      const dict = {};

      // loop through each key-value pair in the JSON data and add it to the dictionary
      for (const [key, value] of Object.entries(data)) {
        dict[key] = value;
      }

      return dict; // return the resulting dictionary object
    })
    .catch(error => {
      console.log(filePath)
      console.error(error);
      return {}; // return an empty dictionary object in case of an error
    });
}
