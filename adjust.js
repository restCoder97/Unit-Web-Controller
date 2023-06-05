
export var FR1_channel_list = [];
var filteredChannelList = [];
export function adjust_selection(test,id,value){
    var groups = document.getElementById("group-area group")
    if(test === "WIFI"){
        if(id.concludes("Technology")){
            modeDataList = groups.children();
        }
    }else if(test === "FR1"){
        if(id == "Band"||id == "Bandwidth"||id == 'Uplink'||id == 'Downlink'){
            filteredChannelList = filtChannel(id,value,filteredChannelList);
        }else if(id == "Modulation"){
            filteredChannelList = filtChannel("Mode",value,filteredChannelList);
        }
        //update Availible
        var dl_RB = document.getElementById('RB-Offset');
        var dl_uplink = document.getElementById('Uplink');
        var dl_downlink = document.getElementById('Downlink');
        var dl_bandwidth = document.getElementById('Bandwidth');
        var dl_modulation = document.getElementById('Modulation');
        var dl_frequency = document.getElementById('Frequency');
        const tmpList = [dl_RB,dl_uplink,dl_downlink,dl_bandwidth,dl_modulation,dl_frequency];
        var rbList = new Set(), uplink = new Set(), downlink = new Set(), bandwidth= new Set(),  modulation = new Set(), frequency = new Set();
        for(var i = 0; i<filteredChannelList.length;i++){
            const dic = filteredChannelList[i];
            if ("Full RB Min" in dic){rbList.add(dic["Full RB Min"])}
            if ("Full RB Max" in dic){rbList.add(dic["Full RB Max"])}
            if ('1/Min RB' in dic){rbList.add(dic['1/Min RB'])}
            if ('1/Half RB' in dic){rbList.add(dic['1/Half RB'])}
            if ('1/Max RB' in dic){rbList.add(dic['1/Max RB'])}
            if ('Full RB' in dic){rbList.add(dic['Full RB'])}
            if ('Up-Channel' in dic){uplink.add(dic['Up-Channel'])}
            if ('Down-Channel' in dic){downlink.add(dic['Down-Channel'])}
            if ('Bandwidth' in dic){bandwidth.add(dic["Bandwidth"])}
            if ('Mode' in dic){modulation.add(dic["Mode"])}
            if ('Channel' in dic){
                uplink.add(dic['Channel'])
                downlink.add(dic['Channel'])
            }
            if('UP-Frequency' in dic){frequency.add(dic['UP-Frequency'])}
            if ('Frequency' in dic) {frequency.add(dic['Frequency'])}
        }
        for(var i = 0;i<5;i++){
            tmpList[i].innerHTML = '';
        }
        addOptions(dl_RB,Array.from(rbList));
        addOptions(dl_uplink,Array.from(uplink));
        addOptions(dl_downlink,Array.from(downlink));
        addOptions(dl_bandwidth,Array.from(bandwidth));
        addOptions(dl_modulation,Array.from(modulation));
        addOptions(dl_frequency,Array.from(frequency));
        
    }
}

function addOptions(element,options){
    for(let i = 0;i<options.length;i++){
        let op = options[i];
        if (typeof op === 'undefined'){continue;}
        let option = document.createElement("option");
        option.value = op.toString();
        element.appendChild(option);
    }
    document.getElementById('input'+element.id).setAttribute('list',element.id);
}


function filtChannel(key,value,orignList){
    var res = [];
    for (var i = 0; i<orignList.length;i+=1){
        if((key in orignList[i]) && orignList[i][key].toString().toLowerCase() == value.toLowerCase()){
            res.push(orignList[i]);
        }
    }
    if(res.length!=0){
        return res;
    }else{
        return orignList;
    }
    
}

export function readFR1Channels(){
    if(FR1_channel_list.length>0){
        return
    }
    /* set up XMLHttpRequest */
    var url = "http://emcwebcontroller.com/Media/FR1_Band_and_Configurations_v2.xlsx";
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function(e) {
        var arraybuffer = oReq.response;

        /* convert data to binary string */
        var data = new Uint8Array(arraybuffer);
        var arr = new Array();
        for (var i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
        var bstr = arr.join("");

        /* Call XLSX */
        var workbook = XLSX.read(bstr, {
            type: "binary"
        });

        /* DO SOMETHING WITH workbook HERE */
        /* Get worksheet */
        workbook.SheetNames.forEach(function(sheetName){
            if(sheetName != "Export Summary"){
                var worksheet = workbook.Sheets[sheetName];
                var tmpList = XLSX.utils.sheet_to_json(worksheet, {raw: true})
                for(var i = 0;i<tmpList.length;i+=1){
                    tmpList[i]["Technology"] = sheetName;
                    if (("Band" in tmpList[i])==false && i != 0){
                        tmpList[i]["Band"] = tmpList[i-1]["Band"];
                    }
                }
                FR1_channel_list = FR1_channel_list.concat(tmpList);
                filteredChannelList=FR1_channel_list;
            }
        })
        console.log(FR1_channel_list);
    }

    oReq.send();
}