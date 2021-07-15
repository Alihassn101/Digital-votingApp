var express=require("express");
var request = require("request");
var app=express();
var session=require("express-session");
const csv=require('csvtojson');
var request = require('request');
const multer = require('multer')
var bulk = require('node-bulk-sms');
var CititesList=require('./list.js').citiesList

console.log(CititesList);

var storage = multer.memoryStorage()
var upload = multer({ storage: storage })



// var apiurl="https://datachainblockchain.herokuapp.com"
// var weburl="https://b-voting.herokuapp.com";

var apiurl="http://localhost:4000";
var weburl="http://localhost:3000";

var Loginusername="atifahmad80";
var Loginpassword="123"


app.use(session({secret: 'atifahmad',resave: true,saveUninitialized: true})); 

app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.set("view engine","ejs");

var port=process.env.PORT || 3000

app.listen(port,function() {
  console.log("started sever at localhost:3000/");
})

function sendSMStoVoter(to){
 
  const from = 'ECP(Dummy)';
  var key=(Math.floor(100000 + Math.random() * 900000));
  const text = 'Your key to login is '+key;

  console.log("+"+to);
  bulk.setUsername('atifahmad');
  bulk.setPassword('Atifa77535');
  bulk.sendMessage('Your key to login is '+key,"+"+to,function(result){
      console.log(result);
  });
  
  console.log(text);
  return key;
}






async function NADRAverification(cnic){
  var data={
    blockChainName:"DummyNADRA",
    collectionName:"Entities",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
    Query:{"data.CNIC":cnic,},
  }
  var valid=await findBlockByQuery(data);
  if(valid){
    return(valid.blockStatus);
  }
  else{
    return ("Not Found");
  }
}

async function ECPverification(cnic){
  var data={
    blockChainName:"DummyECP",
    collectionName:"Voters",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
    Query:{"data.CNIC":cnic,},
  }
  var valid=await findBlockByQuery(data);
  // return valid;
  if(valid.blockStatus=="Active"){
    return(valid);
  }
  else{
    return (false);
  }
}


async function EachPartySeats(AreaList){
  AreaList=AreaList;
  var EachPartySeats=[];
  var data={
    blockChainName:"DummyECP",
    collectionName:"Candidates",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
  }

  var Votes={
    blockChainName:"DummyECP",
    collectionName:"Votes",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
  }

  for(var i=0;i<AreaList.length;i++){
    data["Query"]={"data.AREA CODE":AreaList[i]};
    var Candidates=await findAllBlocksByQuery(data);
    var max=0;
    var lead="";
    for(var j=0;j<Candidates.length;j++){
      Votes["Query"]={"data.candidateHash":Candidates[j].hash};
      var eashvotes=await findAllBlocksByQuery(Votes);
      if(eashvotes.length>max){
        lead=Candidates[j].data.PartyName;
        max=eashvotes.length;
      }

    }
    EachPartySeats.push(lead)

  }

  return EachPartySeats;
  
}


function addBlock(data) {
  return new Promise((resolve, reject)=>{
    request(
      {
        method:'post',
        url:apiurl+'/addBlock', 
        form: data, 
        headers: {  
          "content-type": "application/json",
        },
        json: true,
      },(err,res,body)=>{
        resolve(body);
      })
  });
}


function findBlockByQuery(data) {
  return new Promise((resolve, reject)=>{
    request(
      {
        method:'post',
        url:apiurl+'/findOneBlock', 
        form: data, 
        headers: {  
          "content-type": "application/json",
        },
        json: true,
      },(err,res,body)=>{
        if(body!=null){
          resolve(body);
        }
        resolve(false);
        // console.log(body);
      })
  });
}



function findAllBlocksByQuery(data) {
  return new Promise((resolve, reject)=>{
    request(
      {
        method:'post',
        url:apiurl+'/findAllBlockByQuery', 
        form: data, 
        headers: {  
          "content-type": "application/json",
        },
        json: true,
      },(err,res,body)=>{
        if(body!=null){
          // resolve(true);
          resolve(body);
        }
        resolve(false);
        // console.log(body);
      })
  });
}



app.get("/",async(req,res)=>{
  res.render("Index")
})

app.get("/logOut",(req,res)=>{
  req.session.Validation="invalid";
  req.session.starttime=1;
  req.session.endtime=0;
  res.render("Index");
})



// start voter

app.get("/voterLogin",(req,res)=>{
  res.render("voterLogin",{msg:""});
})

app.post("/voterLogin",async function(req,response) {
    var verifyNadra=await NADRAverification(req.body.CNIC);
    var verifyECP=await ECPverification(req.body.CNIC);

    console.log(verifyECP);
    console.log(verifyNadra);
    if(verifyNadra=="Alive"&& verifyECP)
    {
      
      req.session.voter=verifyECP;

      var data={
        blockChainName: 'DummyECP',
        collectionName: 'Votes',
        Loginusername: Loginusername,
        Loginpassword: Loginpassword,
        Query:{"data.voterHash":req.session.voter.hash}
      }

      var res=await findBlockByQuery(data)

      console.log("vote casted");
      console.log(res);

      if(res){
        response.render("voterLogin",{msg:"You have Already cast the Vote"});
      }else{
        req.session.OTP=sendSMStoVoter("923047877535");
        req.session.starttime=Date.now();
        req.session.endtime=Date.now() + 2*60000;
        req.session.voterCnic=req.body.CNIC;
        response.render("voterLoginOTP",{msg:"",cnic:req.session.voterCnic});
      }
    }
    else{
      if(verifyNadra!="Alive")
      {
        response.render("voterLogin",{msg:"Voter not verified by NADRA(Not Exist/Dead)"});
      }
      else{
        response.render("voterLogin",{msg:"Voter not verified by ECP(Vote Cancelation)"});
      }
    }
  });

app.get("/voterLoginOTP",(req,res)=>{
  res.redirect(weburl+"/voterLogin");
})
  
app.post("/voterLoginOTP",async function(req,response) {
  
  
  if(Date.now() < req.session.endtime){
    if(req.body.OTP==req.session.OTP)
    {
      console.log("hare")
      var data={
        blockChainName: 'DummyECP',
        collectionName: 'Candidates',
        Loginusername: Loginusername,
        Loginpassword: Loginpassword
      }
      request({
        method:'post',
        url:apiurl+'/findAllBlock',
        form:data,
        headers: {  
          "content-type": "application/json",
        },
        json: true,
      },(err,res,body)=>{
        if(body.length>1){
          var CandidatesList=[]
          for(var obj=1;obj<body.length;obj++){
            if(!CandidatesList.includes(body[obj].data['AREA CODE'])
            &&(req.session.voter.data['AREA CODE']==body[obj].data['AREA CODE'])){
              CandidatesList.push(body[obj]);
            }
          }
          console.log("CandidatesList.length");
          console.log(CandidatesList.length);
          response.render("castVote",{voter:req.session.voter,CandidatesList:CandidatesList,x:""})
         }
        else{
          }
      });
      
    }
    else{
      response.render("voterLoginOTP",{msg:"Incorrect OTP",cnic:req.session.voterCnic});
    }
  }
  else{
    console.log("Session Expired");
    response.redirect("/voterLogin")
  }

  


});
 
app.get("/castVoteSubmit",(req,res)=>{
  res.redirect(weburl+"/voterLogin");
})
  
app.post("/castVoteSubmit",async function(req,response) {


  if(Date.now() < req.session.endtime){
    
    if(req.body.Candidate!=null){
      console.log("req.body")
      console.log(req.body)
      console.log(req.body.Candidate)
      console.log(req.session.voter);
      var data={
        blockChainName:"DummyECP",
        collectionName:'Votes',
        Loginusername:Loginusername,
        Loginpassword:Loginpassword,
        voterHash:req.session.voter.hash,
        candidateHash:req.body.Candidate
      }
      
      var res=await addBlock(data)
      if(res){
        req.session.starttime=1;
        req.session.endtime=0;
        response.render("castVoteSuccess",{voter:req.session.voter,msg:""})
      }
      else{
        response.render("castVoteSuccess",{voter:req.session.voter,msg:""})
      }
    }

  }
  else{
    console.log("Session Expired");
    response.redirect("/voterLogin")
  }

  
  
});

// end voter




// Start ECP

app.get("/createDummyECP",async function(req,response) {
  var data=req.body;
  data["blockChainName"]="DummyECP";
  data["UserName"]="atifahmad";
  data["CNIC"]="3650279936371";
  data["Password"]="atif123";
  data["Loginusername"]=Loginusername;
  data["Loginpassword"]=Loginpassword;

  var collArray=["Authority","Candidates","Voters","Votes","Applicants"];
  var msg="polling created";


  var user1={
    blockChainName:"DummyECP",
    UserName:"alihassaan",
    CNIC:"3333333333333",
    Password:"ali123",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
    collectionName:"Authority"
  }

  var user2={
    blockChainName:"DummyECP",
    UserName:"hamzadildar",
    CNIC:"2222222222222",
    Password:"hamza123",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
    collectionName:"Authority"
  }

  request(
  {
    method:'post',
    url:apiurl+'/CreateBlockchain', 
    form: data, 
    headers: {  
      "content-type": "application/json",
    },
    json: true,
  },(err,res,body)=>{
    if (err) {
        console.log(err);
        response.send("Not Created");
    }
    else{
      if(body.status==null){
        setTimeout(()=>{
          for(var i=0;i<collArray.length;i++){
            data["collectionName"]=collArray[i];
            request(
            {
              method:'post',
              url:apiurl+'/CreateCollection', 
              form: data, 
              headers: {  
                "content-type": "application/json",
              },
              json: true,
            },(err,res,body)=>{
              if (err) {
                  console.log(err);
                  response.send("Not Created");
              }
              else{
                console.log("body");
              }
            });
          }
        },5000);
        setTimeout(() => {
          data["collectionName"]="Authority";
          console.log(data);
          request(
            {
              method:'post',
              url:apiurl+'/addBlock', 
              form: data, 
              headers: {  
                "content-type": "application/json",
              },
              json: true,
            },async (err,res,body)  =>{
              if (err) {
                console.log(err);
              }
              else{
                
                await addBlock(user1);
                await addBlock(user2);
                response.send("Created");

              }
            })
        }, 10000);
      }
      else{
        response.send("Polling Already Exist");
      }
    }
  });

  
});

app.get("/dummyECPLogin",(req,res)=>{
  res.render("dummyECPLogin",{msg:""});
})

app.post("/dummyECPLogin",function(req,response) {
  var data=req.body;
  data["Loginusername"]=Loginusername;
  data["Loginpassword"]=Loginpassword;
  data["collectionName"]="Authority";
  data["Query"]={"data.UserName":req.body.UserName,"data.CNIC":req.body.CNIC,"data.Password":req.body.Password,}
  console.log(data);

  request(
    {
      method:'post',
      url:apiurl+'/findOneBlock', 
      form: data, 
      headers: {  
        "content-type": "application/json",
      },
      json: true,
    },(err,res,body)=>{
      if(err){
        console.log(err);
      }
      else{
        if(body!=null){
          req.session.Validation="valid";
          req.session.BLockchain=data.blockChainName;
          response.redirect("/createCandidate");
        }
        else{
          // response.redirect("/createpolling");
          response.render("dummyECPLogin",{msg:"User not found"});
          console.log("user not found");
        }
      }
      
    })
});

app.get("/createCandidate",function(req,response) {

  
  if(req.session.Validation=="valid")
  // if(true)
  {
    var data={
      blockChainName:"DummyECP",
      collectionName:'Voters',
    }
    data["Loginusername"]=Loginusername;
    data["Loginpassword"]=Loginpassword;
    console.log(data);
    request({
      method:'post',
      url:apiurl+'/findAllBlock',
      form:data,
      headers: {  
        "content-type": "application/json",
      },
      json: true,
    },(err,res,body)=>{
      if(body.length>1){
        var AreaList=[]
        var Cities=[]
        for(var obj=1;obj<body.length;obj++){
          console.log(body[obj]);
          if(!AreaList.includes(body[obj].data['AREA CODE'])){
            AreaList.push(body[obj].data['AREA CODE']);
            console.log(body[obj].data['AREA CODE'])
          }
          if(!Cities.includes(body[obj].data.City)){
            Cities.push(body[obj].data.City);
          }
          // console.log(body)
        }
        console.log(Cities)
        req.session.AreaList=AreaList;
        req.session.Cities=Cities;
        response.render("addCandidate",{msg:"",bcName:req.session.BLockchain,AreaList:req.session.AreaList,Cities:req.session.Cities})

      }
      else{
        response.render("addCandidate",{msg:"",bcName:req.session.BLockchain,AreaList:[],Cities:[]})

      }
    });
    
    
  }
  else{
    response.redirect(weburl+"/dummyecplogin")
  }

});

app.post("/createCandidate",upload.single("CandidateIcon"),async function(req,response) {


  if(req.session.Validation=="valid")
  {

    var data=req.body;
  
    data["Loginusername"]=Loginusername;
    data["Loginpassword"]=Loginpassword;
    data["collectionName"]="Candidates";

    const buffer = req.file.buffer // e.g., <Buffer 89 50 4e ... >
    const b64 = new Buffer(buffer).toString('base64')
    const mimeType = 'image/png' // e.g., image/png

    // console.log("img")
    var im="data:"+mimeType+";base64,"+b64;

    data["Icon"]=im;
    
    

    var msg="saved data";
    data["Query"]={"data.CNIC":req.body.CNIC};

    var res=await findBlockByQuery(data)
    var AreaList=[]

    if(res==false)
    {

      delete data["Query"]
      var z=await addBlock(data)
      var getdata={
        blockChainName:"DummyECP",
        collectionName:'Voters',
      }
      getdata["Loginusername"]=Loginusername;
      getdata["Loginpassword"]=Loginpassword;
      request({
        method:'post',
        url:apiurl+'/findAllBlock',
        form:getdata,
        headers: {  
          "content-type": "application/json",
        },
        json: true,
      },(err,res,body)=>{
        if(body.length>1){
          var AreaList=[]
          var Cities=[]
          for(var obj=1;obj<body.length;obj++){
            if(!AreaList.includes(body[obj].data['AREA CODE'])){
              AreaList.push(body[obj].data['AREA CODE']);
            }
            if(!Cities.includes(body[obj].data.City)){
              Cities.push(body[obj].data.City);
            }
          }
          response.render("addCandidate",{msg:"Added Succeccfully",bcName:req.session.BLockchain,AreaList:AreaList,Cities:Cities})
  
        }
        else{
          response.render("addCandidate",{msg:"",bcName:req.session.BLockchain,AreaList:req.session.AreaList,Cities:req.session.Cities})
  
        }
      });
      
    }
    else{
      console.log("Already exist")
      response.render("addCandidate",{msg:"Already exist",bcName:req.session.BLockchain,AreaList:req.session.AreaList,Cities:req.session.Cities})

    }
  }
  else{
    response.redirect(weburl+"/dummyecplogin")
  }
});

app.get("/showCandidates/:page",function(req,response) {
  if(req.session.Validation=="valid")
  {
    var page = req.params.page || 1;
    perpage=20;
    var data={
      blockChainName:req.session.BLockchain,
      collectionName:'Candidates',
    }
    
    data["Loginusername"]=Loginusername;
    data["Loginpassword"]=Loginpassword;
    console.log(data);
    request({
      method:'post',
      url:apiurl+'/findAllBlock',
      form:data,
      headers: {  
        "content-type": "application/json",
      },
      json: true,
    },(err,res,body)=>{
      console.log("showcandidates get");
      if(body.length>1){
        var endEnt=((perpage*(page)+1)<body.length)?perpage*(page)+1:body.length;

        response.render("showCandidates",{data:body,start:(perpage*(page-1) + 1),end:endEnt,current:page,totalPages:(Math.ceil(body.length / perpage))})
      }
      else{
      }
    });
  }
  else{
    response.redirect(weburl+"/dummyecplogin")

  }
});

app.get("/CandiadateApply",function(req,response) {
  response.render("applicantForm",{msg:"",cities:CititesList});
});

app.post("/CandiadateApply",async function(req,response) {
  if(true)
  {
    var data=req.body;
  
    data["blockChainName"]="DummyECP",
    data["Loginusername"]=Loginusername;
    data["Loginpassword"]=Loginpassword;
    data["collectionName"]="Applicants";

    data["Query"]={"data.CNIC":req.body.CNIC};
    console.log(data);
    var res=await findBlockByQuery(data)

    if(res==false)
    {
      delete data["Query"]
      var z=await addBlock(data)
      console.log(z);
      response.render("applicantFormSubmit",{msg:"Submitted successFully",msg2:"Visit Our Office in 3-5 days along with your original documents"});
    }
    else{
      console.log("Already exist")
      response.render("applicantFormSubmit",{msg:"Applicant Already exist",msg2:""});
    }
  }
  else{
    response.redirect(weburl+"/")
  }
});

app.get("/createVoter",function(req,response) {
  if(req.session.Validation=="valid"){
    var data={
      blockChainName:"DummyECP",
      collectionName:'Voters',
    }
    req.session.Cities=[];
    data["Loginusername"]=Loginusername;
    data["Loginpassword"]=Loginpassword;
    request({
      method:'post',
      url:apiurl+'/findAllBlock',
      form:data,
      headers: {  
        "content-type": "application/json",
      },
      json: true,
    },(err,res,body)=>{
      if(body.length>1){
        var AreaList=[]
        var Cities=[]

        for(var obj=1;obj<body.length;obj++){
          if(!AreaList.includes(body[obj].data['AREA CODE'])){
            AreaList.push(body[obj].data['AREA CODE']);
            console.log(body[obj].data['AREA CODE'])
          }
          if(!Cities.includes(body[obj].data.City)){
            Cities.push(body[obj].data.City);
          }
        }

        req.session.Cities=Cities;
        req.session.AreaList=AreaList;
        console.log(AreaList);
        response.render("addVoter",{bcName:req.session.BLockchain,msg:"",AreaList:req.session.AreaList,Cities:req.session.Cities})

        }
      else{
        req.session.AreaList=[]
        response.render("addVoter",{bcName:req.session.BLockchain,msg:"",AreaList:req.session.AreaList,Cities:req.session.Cities})

      }
    });
    
  }
  else{
    response.redirect(weburl+"/dummyecplogin")
  }
});

app.post("/createVoter",async function(req,response) {

  if(req.session.Validation=="valid"){
    var data=req.body;
  
    data["Loginusername"]=Loginusername;
    data["Loginpassword"]=Loginpassword;
    data["collectionName"]="Voters";


    var msg="saved data";
    data["Query"]={"data.CNIC":req.body.CNIC};
    var res=await findBlockByQuery(data)

    if(res==false)
    {
      delete data["Query"]
      var z=await addBlock(data)
      response.render("addVoter",{msg:"Added Successfully",bcName:req.session.BLockchain,AreaList:req.session.AreaList,Cities:req.session.Cities});

    }
    else{
      console.log("Already exist")
      response.render("addVoter",{msg:"Already exist",bcName:req.session.BLockchain,AreaList:req.session.AreaList,Cities:req.session.Cities});

    }
  }
  else{
    response.redirect(weburl+"/dummyecplogin")
  }
  
});

app.get("/createVotersFromFile",function(req,response) {
  response.redirect("/createVoter");
});

app.post("/createVotersFromFile",function(req,response) {
  if(req.session.Validation=="valid"){
    console.log("createVotersFromFile");

    console.log(req.body.listfile)
    csv().fromFile(req.body.listfile).then(async(x)=>{
      if(x[0].Name!=null&&x[0].CNIC!=null&&x[0].Contact!=null){
        for(var i=0;i<x.length;i++){
            var data=x[i];
            data["Loginusername"]=Loginusername;
            data["Loginpassword"]=Loginpassword;
            data["blockChainName"]=req.session.BLockchain;
            data["collectionName"]="Voters";
      
            data["Query"]={"data.CNIC":x[i].CNIC};
            var res=await findBlockByQuery(data)
            console.log(res);
            console.log(x[i].CNIC);
            console.log(x[i].CNIC.length);
            console.log(x[i].Contact.length);

            if(x[i].CNIC.length==13 && x[0].Contact.length==12){
              if(res==false)
              {
                delete data["Query"]
                var z=await addBlock(data)
                console.log(z);
                console.log("added");
              }
              else{
                console.log("Already exist")

              }
            }
            
        }
        response.render("addVoter",{msg:"Created",bcName:req.session.BLockchain,AreaList:req.session.AreaList,Cities:req.session.Cities});

      }
    
      else if(x[0].Name==null){
        console.log("Colum \"Name\" not exits ")
        response.render("addVoter",{msg:"Colum \"Name\" not exits ",bcName:req.session.BLockchain,Cities:req.session.Cities});
      }
      else if(x[0].CNIC==null){
        console.log("Colum \"CNIC\" not exits ")
        response.render("addVoter",{msg:"Colum \"CNIC\" not exits ",bcName:req.session.BLockchain,Cities:req.session.Cities});
      }
      else if(x[0].Contact==null){
        console.log("Colum \"Contact\" not exits ")
        response.render("addVoter",{msg:"Colum \"Contact\" not exits ",bcName:req.session.BLockchain,Cities:req.session.Cities});
      }
    
    })
    
  }
  else{
    response.redirect(weburl+"/dummyecplogin")
  }
  
});

app.get("/showVoters/:page",function(req,response) {
  if(req.session.Validation=="valid")
  {
    var page = req.params.page || 1;
    perpage=20;

    var data={
      blockChainName:"DummyECP",
      collectionName:'Voters',
    }
    data["Loginusername"]=Loginusername;
    data["Loginpassword"]=Loginpassword;
    console.log(data);
    request({
      method:'post',
      url:apiurl+'/findAllBlock',
      form:data,
      headers: {  
        "content-type": "application/json",
      },
      json: true,
    },(err,res,body)=>{
      if(body.length>1){
        var endEnt=((perpage*(page)+1)<body.length)?perpage*(page)+1:body.length;

        response.render("showVoters",{data:body,start:perpage*(page-1) +1,end:endEnt,current:page,totalPages:(Math.ceil(body.length / perpage))})
      }
      else{
        response.render("showVoters",{data:body,start:0 ,end:0,current:page,totalPages:(Math.ceil(body.length / perpage)-1)})
      }
    });
  }
  else{
    response.redirect(weburl+"/dummyecplogin")

  }
});

 

// END ECP



// start NADRA 
app.get("/createDummyNADRA",async function(req,response) {
  var data=req.body;
  data["blockChainName"]="DummyNADRA";
  data["UserName"]="atifahmad";
  data["CNIC"]="3650279936371";
  data["Password"]="atif123";
  data["Loginusername"]=Loginusername;
  data["Loginpassword"]=Loginpassword;

  

  var collArray=["Authority","Entities"];
  var msg="polling created";

  request(
  {
    method:'post',
    url:apiurl+'/CreateBlockchain', 
    form: data, 
    headers: {  
      "content-type": "application/json",
    },
    json: true,
  },(err,res,body)=>{
    if (err) {
        console.log(err);
        response.send("Not Created");
    }
    else{
      if(body.status==null){
        setTimeout(()=>{
          for(var i=0;i<collArray.length;i++){
            data["collectionName"]=collArray[i];
            request(
            {
              method:'post',
              url:apiurl+'/CreateCollection', 
              form: data, 
              headers: {  
                "content-type": "application/json",
              },
              json: true,
            },(err,res,body)=>{
              if (err) {
                  console.log(err);
                  response.render("createpolling",{msg:"Not Created"});
              }
              else{
                console.log("body");
              }
            });
          }
        },5000);
        setTimeout(() => {
          data["collectionName"]="Authority";
          console.log(data);
          request(
            {
              method:'post',
              url:apiurl+'/addBlock', 
              form: data, 
              headers: {  
                "content-type": "application/json",
              },
              json: true,
            },(err,res,body)=>{
              if (err) {
                console.log(err);
              }
              else{
                
                response.send("Created");
              }
            })
        }, 10000);
      }
      else{
        response.send("Polling Already Exist");
      }
    }
  });

  
});

app.get("/dummyNADRALogin",(req,res)=>{
  res.render("dummyNADRAlogin",{msg:""});
})

app.post("/dummyNADRALogin",function(req,response) {
  var data=req.body;
  
  data["Loginusername"]=Loginusername;
  data["Loginpassword"]=Loginpassword;
  data["collectionName"]="Authority";
  data["Query"]={"data.UserName":req.body.UserName,"data.CNIC":req.body.CNIC,"data.Password":req.body.Password,}

  request(
    {
      method:'post',
      url:apiurl+'/findOneBlock', 
      form: data, 
      headers: {  
        "content-type": "application/json",
      },
      json: true,
    },(err,res,body)=>{
      if(err){
        console.log(err);
      }
      else{
        if(body!=null){
          req.session.Validation="valid";
          req.session.BLockchain=data.blockChainName;
          response.redirect("/createEntityNADRA");
        }
        else{
          // response.redirect("/createpolling");
          response.render("dummyNADRAlogin",{msg:"User not found"});
          console.log("user not found");
        }
      }
      
    })


});

app.get("/createEntityNADRA",async function(req,res) {
  if(req.session.Validation=="valid"){
    var cities=[]
    var Voter={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Voters",
      Query:{}
    }
    var AllVoters=await findAllBlocksByQuery(Voter)
    for(var i=1;i<AllVoters.length;i++){
      if(!cities.includes(AllVoters[i].data.City))
      {
        cities.push(AllVoters[i].data.City);
      }
    }
    req.session.cities=cities;
    console.log(cities);

    res.render("addEntityNADRA",{msg:"",bcName:req.session.BLockchain,cities:req.session.cities})

  }
  else{
    res.redirect(weburl+"/dummyNADRALogin")
  }

});

app.post("/createEntityNADRA",async function(req,response) {
  if(req.session.Validation=="valid"){
    var data=req.body;
  
    data["Loginusername"]=Loginusername;
    data["Loginpassword"]=Loginpassword;
    data["collectionName"]="Entities";

    var msg="saved data";
    data["Query"]={"data.CNIC":req.body.CNIC};
    var res=await findBlockByQuery(data)

    if(res==false)
    {
      delete data["Query"]
      var z=await addBlock(data)
      // console.log(z);
      response.render("addEntityNADRA",{msg:"Created Successfully",bcName:req.session.BLockchain,cities:req.session.cities});
    }
    else{
      console.log("Already exist")
      response.render("addEntityNADRA",{msg:"Already exist",bcName:req.session.BLockchain,cities:req.session.cities});

    }
  }
  else{
    response.redirect(weburl+"/dummynadralogin")
  }
});

app.get("/createEntityNADRAFromFile",function(req,response) {
  if(req.session.Validation=="valid"){
    response.redirect("createEntityNADRA");
}
  else{
    response.redirect(weburl+"/dummynadralogin")
  }
});

app.post("/createEntityNADRAFromFile",function(req,response) {
  if(req.session.Validation=="valid"){
    console.log("createCandidateFromFile");

    csv().fromFile(req.body.listfile).then(async(x)=>{
      if(x[0].Name!=null&&x[0].CNIC!=null &&x[0].Contact!=null&&x[0].Status!=null){
        for(var i=0;i<x.length;i++){
            var data=x[i];
            data["Loginusername"]=Loginusername;
            data["Loginpassword"]=Loginpassword;
            data["blockChainName"]=req.session.BLockchain;
            data["collectionName"]="Entities";
            console.log(x[0].CNIC.length);
            console.log(x[0].Contact.length);
            if(x[i].CNIC.length==13&&x[i].Contact.length==12){
              data["Query"]={"data.CNIC":x[i].CNIC};
              var res=await findBlockByQuery(data)
              console.log("hare");

              if(res==false)
              {
                delete data["Query"]
                var z=await addBlock(data)
                console.log(z);

              }
              else{
                console.log("Already exist")

              }
            }
            
        }
        response.render("addEntityNADRA",{msg:"Created",bcName:req.session.BLockchain,cities:req.session.cities});
      }
    
      else if(x[0].Name==null){
        console.log("Colum \"Name\" not exits ")
        response.render("addEntityNADRA",{msg:"Colum \"Name\" not exits ",bcName:req.session.BLockchain,cities:req.session.cities});
      }
      else if(x[0].CNIC==null){
        console.log("Colum \"CNIC\" not exits ")
        response.render("addEntityNADRA",{msg:"Colum \"CNIC\" not exits ",bcName:req.session.BLockchain,cities:req.session.cities});
      }
      else if(x[0].Contact==null){
        console.log("Colum \"Contact\" not exits ")
        response.render("addEntityNADRA",{msg:"Colum \"Contact\" not exits ",bcName:req.session.BLockchain,cities:req.session.cities});
      }
      else if(x[0].Status==null){
        console.log("Colum \"Status\" not exits ")
        response.render("addEntityNADRA",{msg:"Colum \"Status\" not exits ",bcName:req.session.BLockchain,cities:req.session.cities});
      }
    
    })
  }
  else{
    response.redirect(weburl+"/dummynadralogin")
  }
});

app.get("/showEntityNADRA/:page",function(req,response) {
  if(req.session.Validation=="valid")
  {
    var page = req.params.page || 1;
    perpage=20;

    var data={
      blockChainName:req.session.BLockchain,
      collectionName:'Entities',
    }
    
    data["Loginusername"]=Loginusername;
    data["Loginpassword"]=Loginpassword;
    console.log(data);
    request({
      method:'post',
      url:apiurl+'/findAllBlock',
      form:data,
      headers: {  
        "content-type": "application/json",
      },
      json: true,
    },(err,res,body)=>{
      var endEnt=((perpage*(page)+1)<body.length)?perpage*(page)+1:body.length;
      response.render("showEntitiesNADRA",{data:body,start:perpage*(page-1) +1,end:endEnt,current:page,totalPages:(Math.ceil(body.length / perpage))})

    });
  }
  else{
    response.redirect(weburl+"/dummynadralogin")

  }
});

// END NADRA 4



app.get("/showstatistics",async function(req,response) {
  var parties=[]
  var AreaList=[]
  var cities=[]
  var EachTotalVotes=[]
  var EachTotalseats=[]

  var dataForAllVotes={
    blockChainName:"DummyECP",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
    collectionName:"Voters",
    Query:{}
  }
  var dataForAllCastedVotes={
    blockChainName:"DummyECP",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
    collectionName:"Votes",
    Query:{}
  }
  console.log("hare1")

  var AllVotes=await findAllBlocksByQuery(dataForAllVotes)
  console.log("hare2")

  var AllCastedVotes=await findAllBlocksByQuery(dataForAllCastedVotes)

  req.session.AllCastedVotes=AllCastedVotes.length;
  req.session.AllUnCastedVotes=AllVotes.length-AllCastedVotes.length;

  console.log("AllVotes");
  console.log(AllVotes.length);
  console.log(AllCastedVotes.length);

  
  var dataForParties={
    blockChainName:"DummyECP",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
    collectionName:"Candidates",
    Query:{}
  }
  var AllData=await findAllBlocksByQuery(dataForParties)
  for(var i=1;i<AllData.length;i++){
    if(!parties.includes(AllData[i].data.PartyName))
    {
      parties.push(AllData[i].data.PartyName);
    }
    if(!AreaList.includes(AllData[i].data['AREA CODE'])){
      AreaList.push(AllData[i].data['AREA CODE']);
    }
    if(!cities.includes(AllData[i].data.City)){
      cities.push(AllData[i].data.City);
    }
  }

  req.session.AreaList=AreaList;
  req.session.cities=cities;
  var candidates={
    blockChainName:"DummyECP",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
    collectionName:"Candidates",
  }
  var candidateVotes={
    blockChainName:"DummyECP",
    Loginusername:Loginusername,
    Loginpassword:Loginpassword,
    collectionName:"Votes",
  }
  for(var i=0;i<parties.length;i++){
    var votes=0;
    candidates["Query"]={"data.PartyName":parties[i]}
    var candidatesResult=await findAllBlocksByQuery(candidates);
    for(var j=0;j<candidatesResult.length;j++){
      candidateVotes["Query"]={"data.candidateHash":candidatesResult[j].hash}

      var votesResult=await findAllBlocksByQuery(candidateVotes);
      votes=votes+votesResult.length;
    }
    EachTotalVotes.push(votes);
  }
  var totalCastedVote=0;
  for(var j=0;j<EachTotalVotes.length;j++){
    totalCastedVote=totalCastedVote+EachTotalVotes[j];
  }
  EachTotalVotesPercentage=[]
  for(var j=0;j<EachTotalVotes.length;j++){
    EachTotalVotesPercentage.push(parseFloat((EachTotalVotes[j]*100)/totalCastedVote).toFixed(2))
  }



  var EachPartySeatsResluts = await EachPartySeats(AreaList);

  console.log("xr.length");
  console.log(EachPartySeatsResluts);

  for(var i=0;i<parties.length;i++){
    EachTotalseats.push((EachPartySeatsResluts.filter(x=>x==parties[i]).length));
  }
  
  console.log(EachTotalseats);

  response.render("statistics",{msg:"Country Level Statistics",partyNames:parties,
    EachTotalVotesPercentage:EachTotalVotesPercentage,EachTotalVotes:EachTotalVotes,
    AreaList:AreaList,cities:cities
    ,AllUnCastedVotes:req.session.AllUnCastedVotes,AllCastedVotes:req.session.AllCastedVotes,
    EachTotalseats:EachTotalseats})
});

app.post("/showstatistics",async function(req,response) {
  if(req.body.Province!="None"){
    console.log("Province");
    console.log(req.body.Province);
    var parties=[]
    var cities=[]
    var AreaList=[]
    var EachTotalVotes=[]
    var EachTotalseats=[]
    var dataForParties={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Candidates",
      Query:{"data.Province":req.body.Province}
    }
    var AllData=await findAllBlocksByQuery(dataForParties)
    for(var i=0;i<AllData.length;i++){
      if(!parties.includes(AllData[i].data.PartyName))
      {
        parties.push(AllData[i].data.PartyName);
      }
      if(!AreaList.includes(AllData[i].data['AREA CODE'])){
        AreaList.push(AllData[i].data['AREA CODE']);
      }
    }
    console.log(parties);
    console.log(AreaList);


    var candidates={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Candidates",
    }
    var candidateVotes={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Votes",
    }
    for(var i=0;i<parties.length;i++){
      var votes=0;
      candidates["Query"]={"data.PartyName":parties[i],"data.Province":req.body.Province}
      var candidatesResult=await findAllBlocksByQuery(candidates);
      for(var j=0;j<candidatesResult.length;j++){
        candidateVotes["Query"]={"data.candidateHash":candidatesResult[j].hash}

        var votesResult=await findAllBlocksByQuery(candidateVotes);
        votes=votes+votesResult.length;
      }
      EachTotalVotes.push(votes);
    }
    console.log(parties);
    console.log(EachTotalVotes);
    var totalCastedVote=0;
    for(var j=0;j<EachTotalVotes.length;j++){
      totalCastedVote=totalCastedVote+EachTotalVotes[j];
    }
    EachTotalVotesPercentage=[]
    for(var j=0;j<EachTotalVotes.length;j++){
      EachTotalVotesPercentage.push(parseFloat((EachTotalVotes[j]*100)/totalCastedVote).toFixed(2))
    }


    var EachPartySeatsResluts = await EachPartySeats(AreaList);

    console.log("provience hare");
    console.log(EachPartySeatsResluts);

    for(var i=0;i<parties.length;i++){
      EachTotalseats.push((EachPartySeatsResluts.filter(x=>x==parties[i]).length));
    }
    
    console.log(EachTotalseats);

    response.render("statistics",{msg:"Province Level Statistics ("+req.body.Province+")" , partyNames:parties,EachTotalVotesPercentage:EachTotalVotesPercentage,
      EachTotalVotes:EachTotalVotes,AreaList:req.session.AreaList,cities:req.session.cities
      ,AllUnCastedVotes:req.session.AllUnCastedVotes,AllCastedVotes:req.session.AllCastedVotes,
      EachTotalseats:EachTotalseats})
    

  }else if(req.body.City!="None"){
    console.log("City")
    console.log(req.body.City);
    var parties=[]
    var cities=[]
    var AreaList=[]
    var EachTotalseats=[]
    var EachTotalVotes=[]
    var dataForParties={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Candidates",
      Query:{"data.City":req.body.City}
    }
    var AllData=await findAllBlocksByQuery(dataForParties)
    for(var i=0;i<AllData.length;i++){
      if(!parties.includes(AllData[i].data.PartyName))
      {
        parties.push(AllData[i].data.PartyName);
      }
      if(!AreaList.includes(AllData[i].data['AREA CODE'])){
        AreaList.push(AllData[i].data['AREA CODE']);
      }
    }
    console.log(parties);


    var candidates={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Candidates",
    }
    var candidateVotes={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Votes",
    }
    for(var i=0;i<parties.length;i++){
      var votes=0;
      candidates["Query"]={"data.PartyName":parties[i],"data.City":req.body.City}
      var candidatesResult=await findAllBlocksByQuery(candidates);
      for(var j=0;j<candidatesResult.length;j++){
        candidateVotes["Query"]={"data.candidateHash":candidatesResult[j].hash}

        var votesResult=await findAllBlocksByQuery(candidateVotes);
        votes=votes+votesResult.length;
      }
      EachTotalVotes.push(votes);
    }
    console.log(parties);
    console.log(EachTotalVotes);
    var totalCastedVote=0;
    for(var j=0;j<EachTotalVotes.length;j++){
      totalCastedVote=totalCastedVote+EachTotalVotes[j];
    }
    EachTotalVotesPercentage=[]
    for(var j=0;j<EachTotalVotes.length;j++){
      EachTotalVotesPercentage.push(parseFloat((EachTotalVotes[j]*100)/totalCastedVote).toFixed(2))
    }


    var EachPartySeatsResluts = await EachPartySeats(AreaList);

    console.log("city hare");
    console.log(EachPartySeatsResluts);

    for(var i=0;i<parties.length;i++){
      EachTotalseats.push((EachPartySeatsResluts.filter(x=>x==parties[i]).length));
    }
    
    console.log(EachTotalseats);

    response.render("statistics",{msg:"City Level Statistics ("+req.body.City+")",partyNames:parties,EachTotalVotesPercentage:EachTotalVotesPercentage,
      EachTotalVotes:EachTotalVotes,AreaList:req.session.AreaList,cities:req.session.cities
      ,AllUnCastedVotes:req.session.AllUnCastedVotes,AllCastedVotes:req.session.AllCastedVotes,
      EachTotalseats:EachTotalseats})
    
  }else if(req.body["AREA CODE"]!="None"){
    console.log("AREA CODE")
    console.log(req.body["AREA CODE"]);
    var parties=[]
    var cities=[]
    var EachTotalVotes=[]
    var dataForParties={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Candidates",
      Query:{"data.AREA CODE":req.body["AREA CODE"]}
    }
    var AllData=await findAllBlocksByQuery(dataForParties)
    for(var i=0;i<AllData.length;i++){
      if(!parties.includes(AllData[i].data.PartyName))
      {
        parties.push(AllData[i].data.PartyName);
      }
    }
    console.log(parties);


    var candidates={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Candidates",
    }
    var candidateVotes={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Votes",
    }
    for(var i=0;i<parties.length;i++){
      var votes=0;
      candidates["Query"]={"data.PartyName":parties[i],"data.AREA CODE":req.body["AREA CODE"]}
      var candidatesResult=await findAllBlocksByQuery(candidates);
      for(var j=0;j<candidatesResult.length;j++){
        candidateVotes["Query"]={"data.candidateHash":candidatesResult[j].hash}

        var votesResult=await findAllBlocksByQuery(candidateVotes);
        votes=votes+votesResult.length;
      }
      EachTotalVotes.push(votes);
    }
    console.log(parties);
    console.log(EachTotalVotes);
    var totalCastedVote=0;
    for(var j=0;j<EachTotalVotes.length;j++){
      totalCastedVote=totalCastedVote+EachTotalVotes[j];
    }
    EachTotalVotesPercentage=[]
    for(var j=0;j<EachTotalVotes.length;j++){
      EachTotalVotesPercentage.push(parseFloat((EachTotalVotes[j]*100)/totalCastedVote).toFixed(2))
    }



    var dataForAllVotes={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Voters",
      Query:{"data.AREA CODE":req.body["AREA CODE"]}
    }
    var dataForAllCastedVotes={
      blockChainName:"DummyECP",
      Loginusername:Loginusername,
      Loginpassword:Loginpassword,
      collectionName:"Votes",
      Query:{}
    }
  
    var AllVotes=await findAllBlocksByQuery(dataForAllVotes)
    var AllCastedVotes=await findAllBlocksByQuery(dataForAllCastedVotes)

    console.log(AllVotes[1].hash);
    console.log(AllCastedVotes[1].data.voterHash);
    console.log("AllCastedVotes[1].data");
    var CastedVotes=0;
    for(var i=1;i<AllCastedVotes.length;i++){
      for(var j=1;j<AllVotes.length;j++){
        if(AllVotes[j].hash==AllCastedVotes[i].data.voterHash)
        {
          CastedVotes++;
        }
      }
    }
    console.log(CastedVotes);
    var UnCastedVotes=AllVotes.length-CastedVotes;


    response.render("statistics",{msg:"Area Level Statistics ("+req.body["AREA CODE"]+")",partyNames:parties,EachTotalVotesPercentage:EachTotalVotesPercentage,
      EachTotalVotes:EachTotalVotes,AreaList:req.session.AreaList,cities:req.session.cities
      ,AllUnCastedVotes:UnCastedVotes,AllCastedVotes:CastedVotes,
      EachTotalseats:[]})
    
  }
  else{
    response.redirect("/showstatistics");
  }




    
});
