//current data
var data = {};
var meta = {
    jobname : null,
    jobReceived : false,
    receivedOn : null,
    entries : 0
};


exports.getMeta = function(){
    return meta;
}

exports.getData = function(){
    return data;
}

exports.set = function(jobnameIn, dataIn){
    if(dataIn.hasOwnProperty("binderySignatures-Root")){
        if(dataIn["binderySignatures-Root"].binderySignature.length > 0){
            data = dataIn;
            meta.jobname = jobnameIn;
            meta.jobReceived = true;
            meta.receivedOn = new Date().getTime();
            meta.entries = data["binderySignatures-Root"].binderySignature.length;
        }else{ throw new Error("Data error: Found no entries."); }
    }else{ throw new Error("Data error: Found no root node binderySignatrue-Root."); }
}