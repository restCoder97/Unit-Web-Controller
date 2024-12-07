export var FR1_channel_list = [];
var filteredChannelList = [];
const channels = {
  twentyMhz: [
    36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132,
    136, 140, 149, 153, 157, 161, 165, 601, 605, 609, 613, 617, 621, 625, 629,
    633, 637, 641, 645, 649, 653, 657, 661, 665, 669, 673, 677, 681, 685, 689,
    693, 697, 701, 705, 709, 713, 717, 721, 725, 729, 733, 737, 741, 745, 749,
    753, 757, 761, 765, 769, 773, 777, 781, 785, 789, 793, 797, 801, 805, 809,
    813, 817, 821, 825, 829, 833,
  ],
  fortyMhz: [
    38, 46, 54, 62, 102, 110, 118, 126, 134, 142, 151, 159, 603, 611, 619, 627,
    635, 643, 651, 659, 667, 675, 683, 691, 699, 707, 715, 723, 731, 739, 747,
    755, 763, 771, 779, 787, 795, 803, 811, 819, 827,
  ],
  eightyMhz: [
    42, 58, 106, 122, 138, 155, 607, 623, 639, 655, 671, 687, 703, 719, 735,
    751, 767, 783, 799, 815,
  ],
  hundredSixtyMhz: [50, 114, 615, 647, 679, 711, 743, 775, 807],
};

export function adjust_selection(test, id, value) {
  var groups = document.getElementById("group-area").children;
  const selectionHelperSwitch = document.getElementById(
    "selectionHelperSwitch"
  );
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

  if (test === "WIFI") {
    if (selectionHelperSwitch.checked) {
      const modeInput = document.getElementById("inputMode");
      const modeDataList = document.getElementById("Mode");
      const bandwidthInput = document.getElementById("inputBandwidth");
      const channelInput = document.getElementById("inputChannel");
      const channelDataList = document.getElementById("Channel");
      const ruIndexInput = document.getElementById("inputRU-Index");
      const ruLengthInput = document.getElementById("inputRU-Length");

      const channelMap = {
        "20 MHz": channels.twentyMhz,
        "40 MHz": channels.fortyMhz,
        "80 MHz": channels.eightyMhz,
        "160 MHz": channels.hundredSixtyMhz,
      };

      const ruLengthOptions = {
        "20 MHz": ["26T", "52T", "106T", "242T"],
        "40 MHz": ["26T", "52T", "106T", "242T", "484T"],
        "80 MHz": ["26T", "52T", "106T", "242T", "484T", "968T", "996T"],
        "160 MHz": ["26T", "52T", "106T", "242T", "484T", "968T", "996T"],
      };

      const ruIndexOptions = {
        "26T": ["RU0", "RU4", "RU8", "RU17", "RU18", "RU36"],
        "52T": ["RU37", "RU38", "RU40", "RU44", "RU52"],
        "106T": ["RU53", "RU54", "RU56", "RU60"],
        "242T": ["RU61", "RU62", "RU64"],
        "484T": ["RU65", "RU66"],
        "968T": ["RU67", "RU68"],
        "996T": ["RU67", "RU68"],
      };

      const updateRuOptions = () => {
        const bandwidthValue = bandwidthInput.value;
        const availableRuLengths = ruLengthOptions[bandwidthValue] || [];
        populateDataList(
          document.getElementById("RU-Length"),
          availableRuLengths
        );

        const ruLengthValue = ruLengthInput.value;
        const availableRuIndexes = ruIndexOptions[ruLengthValue] || [];
        populateDataList(
          document.getElementById("RU-Index"),
          availableRuIndexes
        );
      };

      const updateChannels = () => {
        const channels = channelMap[bandwidthInput.value];
        if (channels) {
          populateChannels(channelDataList, channels);
          channelInput.value = "";
        } else {
          channelDataList.innerHTML = "";
          channelInput.value = "";
        }
      };

      const handleModeChange = () => {
        if (modeInput.value === "11ax-(RU)"||modeInput.value === "11be-(RU)") {
          enableInput(ruIndexInput);
          enableInput(ruLengthInput);
          updateRuOptions();
        } else {
          disableInput(ruIndexInput);
          disableInput(ruLengthInput);
          ruIndexInput.value = "";
          ruLengthInput.value = "";
          document.getElementById("RU-Index").innerHTML = "";
          document.getElementById("RU-Length").innerHTML = "";
        }
      };

      const handleBandwidthChange = () => {
        updateChannels();
        updateRuOptions();
      };

      const handleChannelChange = () => {
        const enteredChannel = parseInt(channelInput.value);

        if (channelInput.value === "") {
          ruLengthInput.value = "";
          ruIndexInput.value = "";
          return;
        }

        const matchingBandwidth = Object.keys(channelMap).find((bandwidth) =>
          channelMap[bandwidth].includes(enteredChannel)
        );

        if (matchingBandwidth) {
          bandwidthInput.value = matchingBandwidth;
          populateChannels(channelDataList, channelMap[matchingBandwidth]);
          updateRuOptions();
        }
      };

      // const handleRuLengthChange = () => {
      //   if (ruLengthInput.value !== "") {
      //     modeInput.value = "11ax-(RU)";
      //   }
      //   updateRuOptions();
      // };

      // const handleRuIndexChange = () => {
      //   if (ruIndexInput.value !== "") {
      //     modeInput.value = "11ax-(RU)";
      //   }
      // };

      if (id === "Technology") {
        modeDataList.innerHTML = "";
        const modes =
          value === "U-NII"
            ? ["11a", "11ac", "11n", "11ax-(SU)", "11ax-(RU)","11be-(SU)", "11be-(RU)"]
            : ["11b", "11g", "11n", "11ax-(SU)", "11ax-(RU)","11be-(SU)", "11be-(RU)"];

        modes.forEach((mode) => {
          const option = document.createElement("option");
          option.value = mode;
          modeDataList.appendChild(option);
        });

        modeInput.addEventListener("input", handleModeChange);

        if (value === "DTS") {
          bandwidthInput.value = "20 MHz";
          disableInput(bandwidthInput);
          populateChannels(
            channelDataList,
            Array.from({ length: 13 }, (_, i) => i + 1)
          );
          channelInput.value = "";
        } else if (value === "U-NII") {
          enableInput(bandwidthInput);
          bandwidthInput.addEventListener("input", handleBandwidthChange);
          channelInput.addEventListener("input", handleChannelChange);
        }
      }

      if (id === "Bandwidth") {
        updateRuOptions();
      }

      if (id === "RU-Length") {
        updateRuOptions();
      }

      if (id === "RU-Length") {
        handleRuLengthChange();
      }

      if (id === "RU-Index") {
        handleRuIndexChange();
      }

      function populateDataList(dataList, options) {
        dataList.innerHTML = "";
        options.forEach((option) => {
          const optionElement = document.createElement("option");
          optionElement.value = option;
          dataList.appendChild(optionElement);
        });
      }

      function populateChannels(dataList, channels) {
        dataList.innerHTML = "";

        if (Array.isArray(channels)) {
          channels.forEach((channel) => {
            const option = document.createElement("option");
            option.value = channel.toString();
            dataList.appendChild(option);
          });
        } else {
          for (let i = channels.start; i <= channels.end; i++) {
            const option = document.createElement("option");
            option.value = i.toString();
            dataList.appendChild(option);
          }
        }
      }
    } else {
      if (id.concludes("Technology")) {
        modeDataList = groups.children();
      }
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
    if (selectionHelperSwitch.checked) {
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
      }

      const modeInput = document.querySelector("#inputMode");
      const modulationInput = document.querySelector("#inputModulation");
      const dataRateInput = document.querySelector("#inputData_Rate");
      const bandwidthInput = document.querySelector("#inputBand");

      if (id === "Data_Rate") {
        if (value !== "") {
          modeInput.value = "BLE";
          disableInput(modulationInput);
        }
      }

      if (id === "Modulation") {
        if (value === "GFSK") {
          modeInput.value = "BDR";
        } else if (value === "QPSK" || value === "8PSK") {
          modeInput.value = "EDR";
        }
        disableInput(bandwidthInput);
        disableInput(dataRateInput);
      }

      if (id === "Mode") {
        if (value.startsWith("HDR")) {
          disableInput(modulationInput);
          disableInput(dataRateInput);
        }
      }

      if (id === "Band") {
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
