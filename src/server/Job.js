var Job = function(){
    //current data
    var binderySignatures = {};
    var meta = {
        jobname : null,
        jobReceived : false,
        receivedOn : null,
        entries : 0
    };

    this.getMeta = function(){
        return meta;
    }

    this.getBinderySignatures = function(){
        return binderySignatures;
    }

    this.set = function(jobnameIn, dataIn){
        if(dataIn.hasOwnProperty("binderySignatures-Root")){
            if(dataIn["binderySignatures-Root"].binderySignature.length > 0){
                binderySignatures = dataIn["binderySignatures-Root"];
                meta.jobname = jobnameIn;
                meta.jobReceived = true;
                meta.receivedOn = new Date().getTime();
                meta.entries = binderySignatures.binderySignature.length;
            }else{ throw new Error("Data error: Found no entries."); }
        }else{ throw new Error("Data error: Found no root node binderySignatrue-Root."); }
    }
}

module.exports = Job;
