export const wifi_json_template = {
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
  }
export var wifi_par_dict = {
    "Technology":["U-NII","DTS"],
    "Mode":["11b","11n","11ax-(RU)","11ax-(SU)","11ac"],
    "Ant": ["1","2","3"],
    "Bandwidth":["20 MHz","40 MHz","80 Mhz","160 MHz"],
    "Channel": "1-165",
    "Rate": "0-16",
    "RU-Length":["RU26","RU52", "RU106","RU242","RU484","RU968","RU61"],
    "Power-in-Q":"1-100"
}

export const bt_json_template = {
  "testType": "HARM",
  "sisoOrMimo": "SISO",
  "power": "1",
  "polarity": "H",
  "frequency": "2402",
  "mode": "BDR",
  "modulation": "GFSK",
  "antenna": "1",
  "transmissionDuration": "1",
  "powerMode": "EPA",
  "period": "1",
  "technology": "BT",
  "channel": "0",
  "echoDelay": 0,
  "mimoScheme": "",
  "dataRate": "",
  "bandageLowOrHigh": ""
}

export var bt_par_dict = {
    "Technology":["BLE","HDR","BT"],
    "Mode":["BDR","EDR","HDR4","HDR8"],
    "Ant": ["1","2","3"],
    "Frequency": ["2402","2404","2440","2441","2478","2480"],
    "Modulation":["GFSK","8PSK","QPSK"],
    "Power-Mode":["EPA","IPA"],
    "Data-Rate":["1Mbps","2Mbps"],
    "Power-in-Q":"1-100"
}
  

export function choiceToJsonCommand(dict,testType) {
    if(testType === "WIFI"){
      var dict_command = wifi_json_template;
      dict_command['mode'] = dict['Mode'].split('-')[0];
      if(dict['Ant']=='3'){
        dict_command['sisoOrMimo'] = "MIMO";
      }else{
        dict_command['sisoOrMimo'] = "SISO";
      }
      dict_command['power'] = "" + (parseInt(dict['Power-in-Q'])/4);
      dict_command['antenna'] = dict['Ant'];
      dict_command['dataRate'] = "MCS" + dict['Rate'];
      if (dict['Mode'].includes('RU')){
        dict_command["resourceUnit"] = dict['RU-Length'];
      }
      dict_command["technology"] = "WLAN " + dict["Technology"]+" "+dict_command['mode'];
      dict_command['channel'] = dict["Channel"];
      dict_command['bandwidth'] = parseInt(dict["Bandwidth"].split(" ")[0]);
      return JSON.stringify(dict_command);
    }

    else if(testType === "BT"){
      var dict_command = bt_json_template;
      dict_command['mode'] = dict['Mode'];
      if(dict['Ant']=='3'){
        dict_command['sisoOrMimo'] = "MIMO";
      }else{
        dict_command['sisoOrMimo'] = "SISO";
      }
      dict_command['frequency'] = dict["Frequency"]
      dict_command['power'] = "" + (parseInt(dict['Power-in-Q'])/4);
      dict_command['modulation'] = dict['Modulation'];
      dict_command['powerMode'] = dict['Power-Mode']
      dict_command['antenna'] = dict['Ant'];
      dict_command['dataRate'] =  dict['Data-Rate'];
      dict_command["technology"] = dict["Technology"];
      dict_command['channel'] = dict["Channel"];
      return JSON.stringify(dict_command);
    }
    return null;
    
  }

  

  
  

