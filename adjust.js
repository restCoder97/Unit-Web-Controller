
export var FR1_channel_list = [];

export function adjust_selection(test,id,value){
    var groups = document.getElementById("group-area group")
    if(test === "WIFI"){
        if(id.concludes("Technology")){
            modeDataList = groups.children();
        }
    }else if(test === "FR1"){
        var filteredChannelList=FR1_channel_list;
        if(id == "Band"){

        }
    }

}

function filtChannel(key,value,orignList){
    var res = [];
    for (var i = 0; i<orignList.length;i+=1){
        if((k in orignList[i]) && orignList[i][key].toString() == value){
            res.push(orignList[i]);
        }
    }
    return res;
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
            var worksheet = workbook.Sheets[sheetName];
            var tmpList = XLSX.utils.sheet_to_json(worksheet, {raw: true})
            for(var i = 0;i<tmpList.length;i+=1){
                tmpList[i]["Technology"] = sheetName;
                if (("Band" in tmpList[i])==false && i != 0){
                    tmpList[i]["Band"] = tmpList[i-1]["Band"];
                }
            }
            FR1_channel_list = FR1_channel_list.concat(tmpList);
        })
        console.log(FR1_channel_list);
    }

    oReq.send();
}