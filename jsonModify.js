export const DUT_TYPE_MAPPING_EXT = ['ww1703_row', 'ww1703_na', 'aa1704', 'cc2003', 'cc1906', 'cc1802', 'cc2010_non_sig', 'cc2010_sig', 'aa2xx6', 'wifi_bt_uwb_aa2xx6', 'cell_wifi_bt_aa2xx6', 'aa21xx', 'aa21xx_wifi_bt', 'cc2018_non_sig', 'cc2018_sig', 'bb1704', 'c38', 'bb1912', 'bb20xx', 'cc2003', 'aa200x_wifi', 'aa200x_bt', 'aa200x_cell', 'aa200x_cell_wifi_bt', 'aa200x_tethered_nonsig', 'bb2103_wifi', 'bb2103_bt', 'bb2103_wifi_bt', 'bb2004_bt', 'bb1912_wifi_bt', 'bb2004_wifi_bt', 'zz2053_bt', 'bb2010_wifi_bt', 'bb1805_wifi_bt', 'bb1805_thread', 'dut_aa21x3_aa21x7_wifi', 'dut_aa21x3_aa21x7_bt', 'dut_aa21x3_aa21x7_cell', 'dut_aa21x3_aa21x7_cell_sig_', 'dut_aa21x3_aa21x7_2rx_cell', 'dut_aa22x3_aa22x7_wifi', 'dut_aa22x3_aa22x7_bt', 'dut_aa22x3_aa22x7_cell', 'dut_aa22x3_aa22x7_cell_sig', 'dut_aa22x3_aa22x7_2rx_cell', 'cell_regulatory_aa22x3_aa22x7_non_sig', 'cell_regulatory_aa22x3_aa22x7_sig', 'projectx_aa22x3_aa22x7', 'aa22x3_thread', 'aa22x3_wifi_bt', 'dut_r2_uwb_diags', 'bb2113_wifi_bt_thread', 'bb2112_wifi_bt_thread', 'bb2206_wifi_bt_thread', 'bb2205_wifi_bt_thread'];

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


export function commandToChoice(command){
  var choiceDict = {};
  if ("Mode" in command && ((command["Mode"].includes("DTS")) || (command["Mode"].includes("UNII")))){// is wifi
    let mode = command["Mode"];
    choiceDict["Ant"] = command["Core"].toString();
    choiceDict["Bandwidth"] = command["Bandwidth"].toString() + " MHz";
    choiceDict["Channel"] = command["Channel"].toString();
    choiceDict["Rate"] = command["Rate"].toString();
    choiceDict["Power-in-Q"] = command["Power"].toString();
    switch(command["Length"]) {
      case "375":
        choiceDict["RU-Length"] = wifi_par_dict["RU-Length"][0];
        break;
      case "750":
        choiceDict["RU-Length"] = wifi_par_dict["RU-Length"][1];
        break;
      case "1500":
        choiceDict["RU-Length"] = wifi_par_dict["RU-Length"][2];
        break;
      case "3000":
        choiceDict["RU-Length"] = wifi_par_dict["RU-Length"][3];
        break;
      case "8000":
        choiceDict["RU-Length"] = wifi_par_dict["RU-Length"][4];
        break;
      default:
        choiceDict["RU-Length"] = "RU61";
    }
    if (command["Mode"].includes("UNII")){
      choiceDict["Technology"] = "U-NII";
    }else{
      choiceDict["Technology"] = "DTS";
    }
    if(mode.includes("SU")){
      choiceDict["Mode"] = "11ax-(SU)";
    }else if(mode.includes("RU")){
      choiceDict["Mode"] = "11ax-(RU)";
    }else if(mode.includes("11ac")){
      choiceDict["Mode"] = "11ac";
    }else if(mode.includes("11b")){
      choiceDict["Mode"] = "11b";
    }else{
      choiceDict["Mode"] = "11n";
    }
    
  } 
  return choiceDict
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

export var lte_par_dict = {
  "Technology": ["LTE","GSM","W-CDMA"],
  "Band": ["B2","B4","B5","B7","B12","B13","B14","B17","B25","B26","B30","B38","B41","B48","B53","B66","B71","GSM850","GSM900","GSM1800","GSM1900"],
  "Bandwidth": ["1.4","3.0","5.0","10.0","15.0","20.0"],
  "RB-Offset": ["1-0"],
  "Modulation": ["QPSK","16QAM","64QAM","256QAM","GPRS","EGRPS","Rel99","HSDPA","HSUPA","DHSDPA"],
  "Frequency": ["1850.7"],
  "Ant": ["1","2","3"],
  "Channel": ["19957"],
  "Power": "1-100",
}
export var wifi_json_template = {
  "testType": "BE",
  "mode": "11",
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
  "technology": "WLAN U-NII 11n",
  "channel": "38",
  "echoDelay": 0,
  "mimoScheme": "",
  "bandwidth": 40,
  "bandwidthUnits": "MHz",
  "bandageLowOrHigh": ""
}
export var lte_json_template = {
  "band": "B4",
  "bandwidth": "1.4",
  "testType": "HARM",
  "resourceBlock": "1-0",
  "power": "1",
  "antenna": "1",
  "modulation": "QPSK",
  "frequency": "1710.7",
  "technology": "LTE",
  "channel": "19957",
  "echoDelay": 0,
  "command": "Toggle"
}

export var fr1_json_template = {
  "band": "n5",
  "bandwidth": "10.0",
  "testType": "HARM",
  "resourceBlock": "1-0",
  "subCarrierSpacing": "30000",
  "powerClass": "2",
  "power": "1",
  "antenna": "1",
  "modulation": "QPSK",
  "frequency": "829",
  "technology": "FR1",
  "uplinkChannel": "165800",
  "downlinkChannel": "174800",
  "echoDelay": 0,
  "bandwidthUnits": "MHz"
}
const bandstring = "N1,N2,N3,N5,N7,N8,N12,N20,N25,N28,N30,N38,N40,N41,N48,N66,N71,N77,N78,N79,N77,N78,N79,N77,N78,N79,N77,N78,N79";
export var fr1_par_dict = {
  "Technology": ["FR1"],
  "Band": bandstring.split(','),
  "Bandwidth": ["5","10","15","20","30","40","50","60","70","80","90","100"],
  "RB-Offset": ["1-0"],
  "Modulation": ["QPSK","16QAM","64QAM","256QAM","BPSK"],
  "Frequency": ["1850.7"],
  "Ant": ["1","2","3"],
  "Uplink": ["19957"],
  "Downlink": ["19957"],
  "Sub-Carrier-Spacing":["1500","3000"],
  "Power-Class":["1","2","3"],
  "Power": "1-100",
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

    else if(testType === "LTE"){
      var dict_command = lte_json_template;
      dict_command["technology"] = dict["Technology"];
      dict_command['band'] = dict['Band'];
      dict_command['bandwidth'] = dict['Bandwidth'];
      dict_command['resourceBlock'] =  dict['RB-Offset'];
      dict_command['power'] = dict['Power'];
      dict_command['antenna'] = dict['Ant'];
      dict_command['modulation'] = dict['Modulation'];
      dict_command['frequency'] = dict["Frequency"]
      dict_command['channel'] = dict["Channel"];
      return JSON.stringify(dict_command);
    }

    else if(testType == "FR1"){
      var dict_command = fr1_json_template;
      dict_command["technology"] = dict["Technology"];
      dict_command['band'] = dict['Band'];
      dict_command['bandwidth'] = dict['Bandwidth'];
      dict_command['resourceBlock'] =  dict['RB-Offset'];
      dict_command['power'] = dict['Power'];
      dict_command["powerclass"] = dict['Power-Class'];
      dict_command['antenna'] = dict['Ant'];
      dict_command['modulation'] = dict['Modulation'];
      dict_command['frequency'] = dict["Frequency"]
      dict_command['channel'] = dict["Channel"];
      dict_command['subCarrierSpacing'] = dict["Sub-Carrier-Spacing"] ;
      dict_command["uplinkChannel"] = dict["UPlink"];
      dict_command["downlinkChannel"] = dict["Downlink"];

      return JSON.stringify(dict_command);
    }


    return null;
    
  }

  


  
  

