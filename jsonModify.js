export const DUT_TYPE_MAPPING_EXT = ["ww1703_row", "ww1703_na", "aa1704", "cc2003", "cc1906", "cc1802", "cc1906", "cc2010_non_sig", "cc2010_sig", "aa2xx6", "wifi_bt_uwb_aa2xx6", "cell_wifi_bt_aa2xx6", "aa21xx", "aa21xx_wifi_bt", "cc2018_non_sig", "cc2018_sig", "bb1704", "c38", "bb1912", "bb20xx", "cc2003", "aa200x_wifi", "aa200x_bt", "aa200x_cell", "aa200x_cell_wifi_bt", "aa200x_tethered_nonsig", "bb2103_wifi", "bb2103_bt", "bb2103_wifi_bt", "bb2004_bt", "bb1912_wifi_bt", "bb2004_wifi_bt", "zz2053_bt", "bb2010_wifi_bt", "bb1805_wifi_bt", "bb1805_thread", "dut_aa21x3_aa21x7_wifi", "dut_aa21x3_aa21x7_bt", "dut_aa21x3_aa21x7_cell", "dut_aa21x3_aa21x7_cell_sig", "dut_aa21x3_aa21x7_2rx_cell", "dut_aa22x3_aa22x7_wifi", "dut_aa22x3_aa22x7_bt", "dut_aa22x3_aa22x7_cell", "dut_aa22x3_aa22x7_cell_sig", "dut_aa22x3_aa22x7_2rx_cell", "cell_regulatory_aa22x3_aa22x7_non_sig", "cell_regulatory_aa22x3_aa22x7_sig", "projectx_aa22x3_aa22x7", "aa22x3_thread", "aa22x3_wifi_bt", "dut_r2_uwb_diags", "bb2113_wifi_bt_thread", "bb2112_wifi_bt_thread", "bb2206_wifi_bt_thread", "bb2205_wifi_bt_thread", "cc220x_wifi_bt", "cc220x_non_sig","cc220x_wifi","cc220x_bt","cc220x_sig","dut_uwb_non_sig"];

export var wifi_par_dict = {
    "Technology":["U-NII","DTS"],
    "Mode":["11b","11n","11ax-(RU)","11ax-(SU)","11ac","11g"],
    "Ant": ["1","2","3"],
    "Bandwidth":["20 MHz","40 MHz","80 Mhz","160 MHz"],
    "Channel": "1-165",
    "Rate": "0-16",
    "RU-Index":["RU0","RU4", "RU8","RU9","RU17","RU18","RU36","RU37","RU38","RU39","RU40","RU41","RU44","RU45","RU52","RU53","RU54","RU55","RU56","RU61","RU62","RU63","RU64","RU65","RU66","RU67","RU68"],
    "RU-Length": ["26T","52T","106T","242T","484T","968T","996T"],
    "Power-in-Q":"1-100",
    "Shoulder":["Low","High"]
}

const bandstring = "N1,N2,N3,N5,N7,N8,N12,N20,N25,N28,N30,N38,N40,N41,N48,N66,N71,N77,N78,N79,N77,N78,N79,N77,N78,N79,N77,N78,N79";
export var fr1_par_dict = {
  "Technology": ["FR1"],
  "Band": bandstring.split(','),
  "Bandwidth": ["5","10","15","20","30","40","50","60","70","80","90","100"],
  "RB-Offset": ["1-0"],
  "Frequency": ["1850.7"],
  "Uplink": ["19957"],
  "Downlink": ["19957"],
  "Modulation": ["QPSK","16QAM","64QAM","256QAM","BPSK"],
  "Ant": ["1","2","3"],
  "Sub-Carrier-Spacing":["15000","30000"],
  "Power-Class":["1","2","3"],
  "Power": "1-100",
}

export var bt_par_dict = {
  "Technology":["Bluetooth_HDR","Bluetooth_BT","Bluetooth_BLE","BT5G_BLE","BT5G_HDR","BT5G_BT"],
  "Band":["UNII-1","UNII-2","UNII-3","UNII-4","UNII-5A","UNII-5B","UNII-5C","UNII-5D"],
  "Mode":["HDR4","HDR8","HDRp4","HDRp8","BDR","EDR","BLE"],
  "Ant": ["1","2","3"],
  "Frequency": ["2402","2404","2441","2478","2480","2476","5150","6051","5162","5245","5733","5844","5953","6420"],
  "Modulation":["GFSK","QPSK","8PSK"],
  "Power_Mode":["EPA","IPA"],
  "Data_Rate":["1Mbps","2Mbps"],
  "Power_Index":"1-30"
}


export function commandToChoice(command){
  var choiceDict = {};
  let tech = command["technology"]
  if ("Mode" in command && ((command["Mode"].includes("DTS")) || (command["Mode"].includes("UNII")))){// is wifi
    let mode = command["Mode"];
    choiceDict["Ant"] = command["Core"].toString();
    choiceDict["Bandwidth"] = command["Bandwidth"].toString() + " MHz";
    choiceDict["Channel"] = command["Channel"].toString();
    choiceDict["Rate"] = command["Rate"].toString();
    choiceDict["Power-in-Q"] = command["Power"].toString();
    if (command["Shoulder"] !== undefined){
      choiceDict["Shoulder"] = command["Shoulder"]
    }
    switch(command["Length"]) {
      case "375":
        choiceDict["RU-Length"] = "26T";
        break;
      case "750":
        choiceDict["RU-Length"] = "52T";
        break;
      case "1500":
        choiceDict["RU-Length"] = "242T";
        break;
      case "3000":
        choiceDict["RU-Length"] = "484T";
        break;
      case "6000":
        choiceDict["RU-Length"] = "968T";
        break;
      case "8000":
        choiceDict["RU-Length"] = "996T";
        break;
      default:
        choiceDict["RU-Length"] = "";
    }
    choiceDict['RU-Index'] = command['Index'];
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
    }else if(mode.includes("11g")){
      choiceDict["Mode"] = "11g";
    }else if(mode.includes("11n")){
      choiceDict["Mode"] = "11n";
    }else{
      choiceDict["Mode"] = "11a";
    }
  } 

  else if ("uplink" in command){//is FR1
    choiceDict = fr1_par_dict;
    for(const k in choiceDict){
      let s = k.toString().toLowerCase()
      if(s in command){choiceDict[k] = command[s]}
      if(k == 'RB-Offset'){choiceDict[k] =command['rb']}
    }
    if (!command['band'].includes('41')){
      choiceDict["Sub-Carrier-Spacing"] = '15000'
    }else{
      choiceDict["Sub-Carrier-Spacing"] = '30000'
    }
    choiceDict["Power-Class"] = "2"
    choiceDict["Technology"] = "FR1"
  }
  else if('band' in command && command['band'].includes('B')){//is LTE
    choiceDict = lte_par_dict;
    choiceDict["Technology"] = "LTE"
    for(const k in choiceDict){
      let s = k.toString().toLowerCase()
      if(s in command){choiceDict[k] = command[s]}
      if(k == 'RB-Offset'){choiceDict[k] = command['rb']}
    }
  }
  else if (tech=="BT"||tech == "BT-5G"||tech == "Bluetooth" ){//BT 
    choiceDict = bt_par_dict
    for(const k in choiceDict){
      let s = k.toString().toLowerCase()
      if (s == "ant" && command[s].includes("Diversity")){choiceDict[k] = "4"}
      else if(s in command){choiceDict[k] = command[s]}
      //if(s.includes("power")){choiceDict["Power-Index"] = command['power']}
    }
    return choiceDict
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

export const bt_5g_json_template ={
  "sisoOrMimo": "SISO",
  "testType": "BE",
  "band": "UNII-1",
  "frequency": "5151",
  "powerMode": "EPA",
  "antenna": "1",
  "mode": "HDR4",
  "power": "1",
  "polarity": "V",
  "technology": "BT5G",
  "echoDelay": 0,
  "mimoScheme": "",
  "dataRate": "",
  "bandageLowOrHigh": "",
  "modulation": ""
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
export var lte_json_template = {//LTE JSON
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
  "subCarrierSpacing": "15000",
  "powerClass": "2",
  "power": "1",
  "antenna": "1",
  "modulation": "QPSK",
  "frequency": "829",
  "technology": "FR1",
  "uplinkChannel": "165800",
  "downlinkChannel": "174800",
  "echoDelay": 0,
  "bandwidthUnits": "MHz",
  "command": "Toggle"
}





export function choiceToJsonCommand(dict,testType) {
    if(testType === "WIFI"){
      var dict_command = wifi_json_template;
      dict_command['mode'] = dict['Mode'].split('-')[0];
      if(dict['Ant']=='3' || dict['Ant'].includes("+")){
        dict_command['sisoOrMimo'] = "MIMO";
        dict_command['mimoScheme'] = "CDD"
      }else{
        dict_command['sisoOrMimo'] = "SISO";
        dict_command['mimoScheme'] = "SISO"
      }
      dict_command['power'] = "" + (parseInt(dict['Power-in-Q'])/4);
      dict_command['antenna'] = dict['Ant'];
      if (dict_command['sisoOrMimo'] == "MIMO"){
        if (dict['Ant']=='3'){
          dict_command['antenna'] = "C0A0+C1A0";//MIMO Primary
        }
      }
      dict_command['dataRate'] = "MCS" + dict['Rate'];
      if (dict['Mode'].includes('RU')){
        dict_command['tone'] = dict['RU-Length'];
        dict_command["resourceUnit"] = dict['RU-Index'];
        if (!dict_command["resourceUnit"].includes("RU")){
          dict_command["resourceUnit"] = "RU"+dict['RU-Index']
        }
      }else{
        dict_command['tone'] = 'SU';
        dict_command["resourceUnit"] = '';
      }
      if(dict['Shoulder'] !== null){dict_command['bandedgeLowOrHigh'] = dict['Shoulder']}
      dict_command["technology"] = "WLAN " + dict["Technology"]+" "+dict_command['mode'];
      dict_command['channel'] = dict["Channel"];
      let s_channel = dict_command["channel"]
      if(!isNaN(s_channel) && parseInt(s_channel)>600){//Wifi 6E
        dict_command['channel'] = (parseInt(s_channel)-600).toString()
        //dict_command["channel"] = dict_command["channel"].substring(2)
        dict_command['band'] = '6.0'
      }else if(!isNaN(s_channel) && parseInt(s_channel)<600 && parseInt(s_channel)>35){
        dict_command['band'] = '5.0'
      }else{
        dict_command['band'] = '2.0'
      }
      dict_command['bandwidth'] = parseInt(dict["Bandwidth"].split(" ")[0]);
      return JSON.stringify(dict_command);
    }

    else if(testType === "BT"){
      var dict_command = {...bt_json_template};
      if (dict["Technology"].includes('5')){
        dict_command = {...bt_5g_json_template};
        dict_command['band'] = dict['Band']
      }
      dict_command['mode'] = dict['Mode'];
      if (dict['Mode'].includes("HDR")){
        dict_command['technology'] = dict_command["technology"]+"_HDR"
      }else if(dict['Mode'].includes("BLE")){
        dict_command['technology'] = dict_command["technology"]+"_BLE"
      }else{
        dict_command['technology'] = dict_command["technology"]+"_BT"
      }
      if(dict['Ant']=='3'){
        dict_command['sisoOrMimo'] = "MIMO";
        dict_command['antenna'] = '1+2';
      }else{
        dict_command['sisoOrMimo'] = "SISO";
        dict_command['antenna'] = dict['Ant'];
      }
      dict_command['frequency'] = dict["Frequency"]
      dict_command['power'] = "" + (dict['Power_Index']);
      dict_command['modulation'] = dict['Modulation'];
      dict_command['powerMode'] = dict['Power_Mode']
      dict_command['dataRate'] =  dict['Data_Rate'];
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
      if(dict['Band'].includes("41")) {
        dict_command['subCarrierSpacing'] = '30000'
      }else{
        dict_command['subCarrierSpacing'] = '15000'
      }
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
      dict_command["uplinkChannel"] = dict["Uplink"];
      dict_command["downlinkChannel"] = dict["Downlink"];
      return JSON.stringify(dict_command);
    }
    return null;
    
  }

  


  
  

