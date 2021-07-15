var Block=require('./Blockchain.js');
var express=require("express");
const SHA256=require("crypto-js/sha256");
const MongoClient=require("mongodb").MongoClient;
// var fs = require('fs');


var app =express();


var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));



var Port=process.env.PORT || 4000;



function getLink(db){
    // return "mongodb+srv://atifahmad80:atif77535@cluster0.9bqvk.mongodb.net/"+db+"?retryWrites=true&w=majority";
    return "mongodb://localhost";
}



async function CheckDatabaseExist(name){
    return new Promise(function(resolve, reject){ 
        MongoClient.connect(getLink(name)).then(function(db){
            db.db().admin().listDatabases().then(function(res){
                for(var i=0;i<res.databases.length;i++)
                {
                    if(res.databases[i].name==name){
                        resolve(true);
                    }
                }
                resolve(false);
            });
            
        });
    });
};

async function checkUserValidity(UserName,Password){
    return new Promise(function(resolve,reject){
        MongoClient.connect(getLink("Users"),async (err,res)=>{
            if(!err){
                var UserCollection=await res.db("Users").collection(UserName);
                var validUser=await UserCollection.findOne({UserName:UserName,Password:Password})
                if(validUser){
                    resolve(true)
                }
                else{
                    resolve(false)
                }
            }
        })
    }) 
}

async function checkUserValiityAndBlockchain(UserName,Password,BlockChainName){
    return new Promise(function(resolve,reject){
        MongoClient.connect(getLink("Users"),async (err,res)=>{
            if(!err){
                var UserCollection=await res.db("Users").collection(UserName);
                var validUser=await UserCollection.findOne({UserName:UserName,Password:Password})
                if(validUser){
                    var validBlockchain=await UserCollection.findOne({BlockchainName:BlockChainName})
                    if(validBlockchain){
                        resolve(true)
                    }
                    else{
                        resolve(false)
                    }
                }
                else{
                    resolve(false)
                }
            }
        })
    }) 
}

function chechBlockchainValidation(chain){
    return new Promise((resolve,reject)=>{
        if(chain.length>1){
            for(var i=1;i<chain.length;i++)
            {
                var currentBlock=chain[i];
                var PreviousBlock=chain[i-1];
                if(currentBlock.hash!=SHA256(chain[i].timestamp+chain[i].previousHash+JSON.stringify(chain[i].data)).toString())
                {
                    resolve(false);
                    console.log("bc invalid");
                }
                if(currentBlock.previousHash!=PreviousBlock.hash)
                {
                    resolve(false);
                    console.log("bc invalid");

                }
            }
        }
        resolve(true);
    })    
}







app.get("/",(req,response)=>{
    MongoClient.connect(getLink("Users"),async(err,res)=>{
        if(err){
            response.send(err);
        }
        else{
            data ={
                Email:"ahmadatif@gmail.com",
                UserName:"atifahmad80",
                Password: "123"
            }
            res.db("Users").collection(data.UserName).insertOne(data,(err,res)=>{
                console.log(res);
            });
        }
    })
})


app.post("/CreateBlockchain",async (req,response)=>{
    var blockChainName=req.body.blockChainName;
    var collectionName="admin";


    var validUser=await checkUserValidity(req.body.Loginusername,req.body.Loginpassword);

    var bccheck=await CheckDatabaseExist(blockChainName);
    if(validUser){
        if(!bccheck && blockChainName!=""){
            var genesisBlock= new Block(new Date,"GenesisBlock","0");
            MongoClient.connect(getLink(blockChainName),(err,res)=>{
                if(err){
                    console.log(err);
                }
                else{
                    res.db(blockChainName).collection(collectionName).insertOne(genesisBlock,(err,result)=>{
                        if (err) {
                            response.send(err);
                        }
                        else{
                            if(blockChainName!=""){
                                res.db("Users").collection(req.body.Loginusername).insertOne({BlockchainName:blockChainName})
                            }
                            response.send(result);
                        }
                    });               
                }
            });
        }
        else{
            console.log("Blockchain Already exist")
            response.send({status:401,msg:"Blockchain Already exist"});
        }
    }
    else{
            console.log("Invalid user")
            response.send({status:404,msg:"Invalid user"});

    }
})


app.post("/CreateCollection",async (req,response)=>{
    var blockChainName=req.body.blockChainName;
    var collectionName=req.body.collectionName;


    console.log("here createColl");
    // console.log(req.body);

    var validUserAndBlockchain=await checkUserValiityAndBlockchain(req.body.Loginusername,req.body.Loginpassword,blockChainName);
    // console.log(validUserAndBlockchain);

    var bccheck=await CheckDatabaseExist(blockChainName);
    if(validUserAndBlockchain){
        if(bccheck && blockChainName!=""){
            var genesisBlock= new Block(new Date,"GenesisBlock","0");
            MongoClient.connect(getLink(blockChainName),(err,res)=>{
                if(err){
                    console.log(err);
                }
                else{
                    res.db(blockChainName).collection(collectionName).insertOne(genesisBlock,(err,result)=>{
                        if (err) {
                            response.send(err);
                        }
                        else{
                            response.send(result);
                        }
                    });               
                }
            });
        }
        else{
            console.log("Blockchain Not exist")
            response.send({status:401,msg:"Blockchain not exist"});
        }
    }
    else{
            console.log("Invalid user or invalid blockchain")
            response.send({status:404,msg:"Invalid user or invalid blockchain"});

    }
})


app.post("/addBlock",async (req,response)=>{
    var blockChainName=req.body.blockChainName;
    var collectionName=req.body.collectionName;
    var Loginusername=req.body.Loginusername;
    var Loginpassword=req.body.Loginpassword;
    var blockStatus=req.body.Status;
    console.log("ad block");

    var data=req.body;
    delete data["blockChainName"]
    delete data["collectionName"]
    delete data["Loginusername"]
    delete data["Loginpassword"]
    delete data["Status"]
    var previousHash="";



    var validUserAndBlockchain=await checkUserValiityAndBlockchain(Loginusername,Loginpassword,blockChainName);
    
    if(validUserAndBlockchain)
    {
        MongoClient.connect(getLink(blockChainName),async (err,res)=>{
            if(err){
                console.log(err);
            }
            else{
                var coll=await res.db(blockChainName).collection(collectionName).find({}).toArray();
                var BCisValid=await chechBlockchainValidation(coll);
                console.log("BCisValid");
                if(BCisValid){
                    previousHash=coll[coll.length-1].hash;
                    var block = new Block(new Date,data,previousHash,blockStatus);
                    res.db(blockChainName).collection(collectionName).insertOne(block,(err,res)=>{
                        if(err)
                        {
                            response.send(err);
                        }
                        else{
                            response.send(res);
                        }
                    })
                }
                else{
                    console.log("BLockChain is InValid");
                }
            }
        });

    }
    else{
        console.log("db not exist or user not exist");
        response.send("db not exist or user not exist");
    }
})



app.post("/findAllBlock",async (req,response)=>{

    var blockChainName=req.body.blockChainName;
    var collectionName=req.body.collectionName;
    var Loginusername=req.body.Loginusername;
    var Loginpassword=req.body.Loginpassword;

    console.log("find all block");

    var data=req.body;
    delete data["blockChainName"]
    delete data["collectionName"]
    delete data["Loginusername"]
    delete data["Loginpassword"]


    
    var validUserAndBlockchain=await checkUserValiityAndBlockchain(Loginusername,Loginpassword,blockChainName);
    console.log(validUserAndBlockchain);

    if(validUserAndBlockchain)
    {
        MongoClient.connect(getLink(blockChainName),async (err,res)=>{
            var collInfos=await res.db(blockChainName).collection(collectionName).find({}).toArray();
            response.send(collInfos);
        })
    }
})

app.post("/findOneBlock",async (req,response)=>{

    var blockChainName=req.body.blockChainName;
    var collectionName=req.body.collectionName;
    var Loginusername=req.body.Loginusername;
    var Loginpassword=req.body.Loginpassword;

    console.log("find block");

    var data=req.body;
    delete data["blockChainName"]
    delete data["collectionName"]
    delete data["Loginusername"]
    delete data["Loginpassword"]


    
    var validUserAndBlockchain=await checkUserValiityAndBlockchain(Loginusername,Loginpassword,blockChainName);
    console.log(validUserAndBlockchain);
    console.log("here")

    if(validUserAndBlockchain)
    {
        
        MongoClient.connect(getLink(blockChainName),async (err,res)=>{
            var collInfos=await res.db(blockChainName).listCollections().toArray();
            for(var i=0;i<collInfos.length;i++){

                if(collectionName==collInfos[i].name){                                        
                    var result=await res.db(blockChainName).collection(collectionName).findOne(data.Query);
                    response.send(result);
                }
                else{
                    // response.send("Collection Not exist");
                }
            }
        })
    }
})


app.post("/findAllBlockByQuery",async (req,response)=>{

    var blockChainName=req.body.blockChainName;
    var collectionName=req.body.collectionName;
    var Loginusername=req.body.Loginusername;
    var Loginpassword=req.body.Loginpassword;

    console.log("find block");

    var data=req.body;
    delete data["blockChainName"]
    delete data["collectionName"]
    delete data["Loginusername"]
    delete data["Loginpassword"]


    
    var validUserAndBlockchain=await checkUserValiityAndBlockchain(Loginusername,Loginpassword,blockChainName);
    console.log(validUserAndBlockchain);
    console.log("here")

    if(validUserAndBlockchain)
    {
        
        MongoClient.connect(getLink(blockChainName),async (err,res)=>{
            var collInfos=await res.db(blockChainName).listCollections().toArray();
            for(var i=0;i<collInfos.length;i++){

                if(collectionName==collInfos[i].name){                                        
                    var result=await res.db(blockChainName).collection(collectionName).find(data.Query).toArray();
                    response.send(result);
                }
                else{
                }
            }
        })
    }
})


app.listen(Port,function() {
	console.log("locathost:4000/");
});





