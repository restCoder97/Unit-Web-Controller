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
    "Rate": "0-50",
    "RU-Index":"1-13",
    "RU-Length":["RU26","RU52", "RU106","RU242","RU484","RU968","RU61"],
    "Power-in-Q":"1-100"
}
  

export function choiceToJsonCommand(dict,testType) {
    var dict_command = wifi_json_template;
    if(selected_test === "WIFI"){
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
    }
    return JSON.stringify(dict_command);
  }


  
  

