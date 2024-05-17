export var FR1_channel_list = [];
var filteredChannelList = [];
export function adjust_selection(test, id, value) {
  var groups = document.getElementById("group-area").children;
  if (test === "WIFI") {
    if (id.concludes("Technology")) {
      modeDataList = groups.children;
    }
  } else if (test === "FR1") {
    if (
      id == "Band" ||
      id == "Bandwidth" ||
      id == "Uplink" ||
      id == "Downlink"
    ) {
      filteredChannelList = filtChannel(id, value, filteredChannelList);
    } else if (id == "Modulation") {
      filteredChannelList = filtChannel("Mode", value, filteredChannelList);
    }
    // update Availible
    var dl_RB = document.getElementById("RB-Offset");
    var dl_uplink = document.getElementById("Uplink");
    var dl_downlink = document.getElementById("Downlink");
    var dl_bandwidth = document.getElementById("Bandwidth");
    var dl_modulation = document.getElementById("Modulation");
    var dl_frequency = document.getElementById("Frequency");
    const tmpList = [
      dl_RB,
      dl_uplink,
      dl_downlink,
      dl_bandwidth,
      dl_modulation,
      dl_frequency,
    ];
    var rbList = new Set(),
      uplink = new Set(),
      downlink = new Set(),
      bandwidth = new Set(),
      modulation = new Set(),
      frequency = new Set();
    for (var i = 0; i < filteredChannelList.length; i++) {
      const dic = filteredChannelList[i];
      if ("Full RB Min" in dic) {
        rbList.add(dic["Full RB Min"]);
      }
      if ("Full RB Max" in dic) {
        rbList.add(dic["Full RB Max"]);
      }
      if ("1/Min RB" in dic) {
        rbList.add(dic["1/Min RB"]);
      }
      if ("1/Half RB" in dic) {
        rbList.add(dic["1/Half RB"]);
      }
      if ("1/Max RB" in dic) {
        rbList.add(dic["1/Max RB"]);
      }
      if ("Full RB" in dic) {
        rbList.add(dic["Full RB"]);
      }
      if ("Up-Channel" in dic) {
        uplink.add(dic["Up-Channel"]);
      }
      if ("Down-Channel" in dic) {
        downlink.add(dic["Down-Channel"]);
      }
      if ("Bandwidth" in dic) {
        bandwidth.add(dic["Bandwidth"]);
      }
      if ("Mode" in dic) {
        modulation.add(dic["Mode"]);
      }
      if ("Channel" in dic) {
        uplink.add(dic["Channel"]);
        downlink.add(dic["Channel"]);
      }
      if ("UP-Frequency" in dic) {
        frequency.add(dic["UP-Frequency"]);
      }
      if ("Frequency" in dic) {
        frequency.add(dic["Frequency"]);
      }
    }
    for (var i = 0; i < 5; i++) {
      tmpList[i].innerHTML = "";
    }
    addOptions(dl_RB, Array.from(rbList));
    addOptions(dl_uplink, Array.from(uplink));
    addOptions(dl_downlink, Array.from(downlink));
    addOptions(dl_bandwidth, Array.from(bandwidth));
    addOptions(dl_modulation, Array.from(modulation));
    addOptions(dl_frequency, Array.from(frequency));
  } else if (test === "BT") {
    if (["Technology", "Mode", "Modulation", "Data_Rate"].includes(id)) {
      const inputs = Array.from(groups).reduce((acc, group) => {
        const input = group.querySelector("input");
        const dataId = input.getAttribute("data-id");
        acc[dataId] = input;
        return acc;
      }, {});

      const {
        Technology: technologyInput,
        Mode: modeInput,
        Modulation: modulationInput,
        Data_Rate: dataRateInput,
      } = inputs;

      const technologyValue = technologyInput.value;
      const modeValue = modeInput.value;

      if (technologyValue.startsWith("Bluetooth")) {
        populateFrequency(2402, 2500, 0.25);
        // Disable the "Band" text input section
        if (inputs.Band) {
          inputs.Band.disabled = true;
          inputs.Band.value = "";
        }
      } else if (technologyValue.startsWith("BT5G")) {
        // Enable the "Band" text input section if previously disabled
        if (inputs.Band) {
          inputs.Band.disabled = false;
        }
      }

      const disableInput = (input) => {
        if (input) {
          input.disabled = true;
        }
      };

      const enableInput = (input) => {
        if (input) {
          input.disabled = false;
        }
      };

      if (modeValue === "BDR") {
        modulationInput.value = "GFSK";
        disableInput(modulationInput);
        disableInput(dataRateInput);
      } else if (modeValue === "EDR") {
        disableInput(dataRateInput);
      } else if (modeValue === "BLE") {
        modulationInput.value = "";
        disableInput(modulationInput);
      } else if (["HDR4", "HDR8", "HDRp4", "HDRp8"].includes(modeValue)) {
        modulationInput.value = "";
        dataRateInput.value = "";
        disableInput(modulationInput);
        disableInput(dataRateInput);
      } else {
        enableInput(dataRateInput);
        enableInput(modulationInput);
      }
    } else if (id === "Band") {
      const frequencies = {
        "UNII-1": [5170, 5350, 5],
        "UNII-2": [5250, 5725, 5],
        "UNII-3": [5730, 5850, 5],
        "UNII-5A": [5925, 6425, 5],
        "UNII-5B": [5925, 6425, 5],
        "UNII-5C": [5925, 6425, 5],
        "UNII-5D": [5925, 6425, 5],
      };

      if (value in frequencies) {
        populateFrequency(...frequencies[value]);
      }
    }
  }
}

function populateFrequency(start, end, step) {
  var dl_frequency = document.getElementById("Frequency");
  dl_frequency.innerHTML = "";
  for (var i = start; i <= end; i += step) {
    var option = document.createElement("option");
    option.value = i.toString();
    dl_frequency.appendChild(option);
  }
  document.getElementById("inputFrequency").setAttribute("list", "Frequency");
}

function addOptions(element, options) {
  for (let i = 0; i < options.length; i++) {
    let op = options[i];
    if (typeof op === "undefined") {
      continue;
    }
    let option = document.createElement("option");
    option.value = op.toString();
    element.appendChild(option);
  }
  document
    .getElementById("input" + element.id)
    .setAttribute("list", element.id);
}

function filtChannel(key, value, orignList) {
  var res = [];
  for (var i = 0; i < orignList.length; i += 1) {
    if (
      key in orignList[i] &&
      orignList[i][key].toString().toLowerCase() == value.toLowerCase()
    ) {
      res.push(orignList[i]);
    }
  }
  if (res.length != 0) {
    return res;
  } else {
    return orignList;
  }
}

export function readFR1Channels() {
  if (FR1_channel_list.length > 0) {
    return;
  }
  /* set up XMLHttpRequest */
  var url =
    "http://emcwebcontroller.com/Media/FR1_Band_and_Configurations_v2.xlsx";
  var oReq = new XMLHttpRequest();
  oReq.open("GET", url, true);
  oReq.responseType = "arraybuffer";

  oReq.onload = function (e) {
    var arraybuffer = oReq.response;

    /* convert data to binary string */
    var data = new Uint8Array(arraybuffer);
    var arr = new Array();
    for (var i = 0; i != data.length; ++i)
      arr[i] = String.fromCharCode(data[i]);
    var bstr = arr.join("");

    /* Call XLSX */
    var workbook = XLSX.read(bstr, {
      type: "binary",
    });

    /* DO SOMETHING WITH workbook HERE */
    /* Get worksheet */
    workbook.SheetNames.forEach(function (sheetName) {
      if (sheetName != "Export Summary") {
        var worksheet = workbook.Sheets[sheetName];
        var tmpList = XLSX.utils.sheet_to_json(worksheet, { raw: true });
        for (var i = 0; i < tmpList.length; i += 1) {
          tmpList[i]["Technology"] = sheetName;
          if ("Band" in tmpList[i] == false && i != 0) {
            tmpList[i]["Band"] = tmpList[i - 1]["Band"];
          }
        }
        FR1_channel_list = FR1_channel_list.concat(tmpList);
        filteredChannelList = FR1_channel_list;
      }
    });
    console.log(FR1_channel_list);
  };

  oReq.send();
}
