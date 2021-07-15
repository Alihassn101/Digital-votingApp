const SHA256=require("crypto-js/sha256");



module.exports= class Block{
    constructor(timestamp,data,previousHash,blockStatus)
    {
        this.timestamp=timestamp;
        this.data=data;
        this.previousHash=previousHash;
        this.blockStatus=blockStatus;
        this.hash=this.gethash();
    }

    gethash()
    {
        // console.log(this.timestamp);
        // console.log(this.previousHash);
        // console.log(this.data);
        // console.log(this.nonce);
        return SHA256(this.timestamp+this.previousHash+JSON.stringify(this.data)).toString();
    }

   
   
}
