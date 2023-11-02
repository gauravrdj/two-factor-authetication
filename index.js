//jshint esversion:8
const express=require('express');
const speakeasy=require('speakeasy');
const uuid=require('uuid');
const { JsonDB }=require('node-json-db');
const { Config }=require('node-json-db/dist/lib/JsonDBConfig');
const ejs=require('ejs');
const bodyParser=require('body-parser');
const nodemailer=require('nodemailer');
// const googleapis=require('googleapis');
const qrcode=require('qrcode');
const mysql=require('mysql');
const app=express();
app.use(express.json());
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));

const db=new JsonDB(new Config('myDatabase', true, false,'/'));

const connection=mysql.createConnection({
  host:'localhost',
  user:'root',
  password:'',
  database:'2faUsers'
});
connection.connect((err)=>{
  if(err) throw err;
  else{
    console.log("database connected!");
  }
});

//creating myDatabase
app.get('/createdb', (req,res)=>{
  // let sql='create database 2faUsers';
  let sql = 'CREATE DATABASE 2faUsers';

  connection.query(sql,(err,res)=>{
    if(err) throw err;
    else console.log('database created!');
  });
});
app.get('/createTable', (req,res)=>{
  let sql='create table userDetails(id int not null auto_increment, name varchar(255) not null, email varchar(255) not null, username varchar(255) not null, password varchar(255) not null, secret varchar(255), primary key(id))';
  connection.query(sql,(err,res)=>{
    if(err) throw err;
    else console.log('table created!');
  });
});
//Register user and create temp secret
// app.post('/api/register', (req,res)=>{
//   const id=uuid.v4();
//   try{
//     const path=`/user/${id}`;
//     const temp_secret=speakeasy.generateSecret();
//     //push in myDatabase
//     db.push(path, {id,temp_secret});
//     res.json({id, secret: temp_secret.base32});
//   }catch(error){
//     console.log(error);
//     res.status(500).json({message:'error generating secret'});
//   }
// });

// app.post('/', (req,res)=>{
//   console.log(req.body);
//   const id=uuid.v4();
//   try{
//     const path=`./user/${id}`;
//     const temp_secret=speakeasy.generateSecret();
//     //push in myDatabase
//     db.push(path, {id,temp_secret});
//      let data={
//       id:id,
//       secret:temp_secret.base32
//     };
//     console.log(data);
//     res.json({id, secret: temp_secret.base32});
//   }catch(error){
//     console.log(error);
//     res.status(500).json({message:'error generating secret'});
//   }
// });
let qrLink, check=false;
app.post('/',  (req,res)=>{
  if(req.body.name && req.body.email && req.body.password && req.body.username)
  check=true;
  let temp_secret= speakeasy.generateSecret();
  let sql='insert into userDetails set ? ';
  let data=req.body;
  // let data=JSON.parse(jsondata);
console.log(temp_secret);
  data.secret=temp_secret.base32;
  // let updatedData=JSON.stringify(data);
  console.log(data);
  connection.query(sql, data, (err,done)=>{
    if(err) throw err;
    else{
      console.log('data inserted successfully!');
    }
  });

  // let id=req.body.username;

  try{
  // db.push(path, {id,temp_secret});
   qrcode.toDataURL(temp_secret.otpauth_url, (err,data)=>{
    // console.log(data);
// qrLink='<img src=" '+data+' ">';


qrLink=data;
res.redirect('/qrPage');
// console.log(qrLink);
// res.send(qrLink);
  });

}
catch(err){
console.log("error in generating database!");
}
});



// if(registered){
//   var transporter=nodemailer.createTransport({
//     service:'gmail',
//     auth:{
//       user:'gauravjdh2021@gmail.com',
//       pass:'9829386241@papaji'
//     }
//   });
//   var mailOptions={
//     from:'gauravjdh2021@gmail.com',
//     to:req.body.email,
//     subject:'Your TOTP',
//     text:`Hi Gaurav, here is your id and secret keys are: id: ${data.id} and secret: ${data.secret}`
//   };
//   transporter.sendMail(mailOptions, (err,res)=>{
//     if(err) console.log('mail not sent1!');
//     else{
//       console.log("Mail sent successfully!");
//     }
//   });
// }
//verify token and make the secret permanent
// app.post("/api/verify", (req,res)=>{
//   const {token,userId}=req.body;
//   try{
//     const path=`/user/${userId}`;
//     const user=db.getData(path);
//     console.log({user});
//     const {base32:secret} =user.temp_secret;
//     const verified=speakeasy.totp.verify({
//       secret, encoding:'base32', token
//     });
//     if(verified){
//       //update user data
//       db.push(path, {id:userId, secret:user.temp_secret});
//       res.json({verified:true});
//     }
//     else{
//       res.json({verified:false});
//     }
//   }
//   catch(error){
//     console.log(error);
//     res.status(500).json({message:'Error retreiving user'});
//   }
// });
let logStatus='';
let logAlert='';
app.post('/verify', (req, res) => {
  const userId = req.body.id;
  const password=req.body.password;
  const token = req.body.token;
  console.log(userId, token);

  try {
    // Query the database to retrieve the user's secret
    let sql = 'SELECT * FROM userDetails WHERE username = ? and password=?';
    connection.query(sql, [userId, password], (err, data) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: 'Error retrieving user' });
      }

      if (data.length > 0) {
        const user = data[0];
        const secret = user.secret;
       console.log(user);
       console.log(secret);
        const verified = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token
        });

        if (verified) {
          console.log('Verified');
          // res.json({ verified: true });
          logStatus='Logged in successfully😎';
          res.redirect('/log');
        } else {
          console.log('Not verified');
          logStatus='Invalid Token Number❌';
          res.redirect('/log');
          // res.json({ verified: false });
        }
      } else {
        logStatus='Invalid credentials❌';
        res.redirect('/log');
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error retrieving user' });
  }
});

app.get('/', (req,res)=>{

  res.render('register');
  check=false;
});
app.get('/verify', (req,res)=>{
  res.render('verify');
});

  app.get('/log', (req,res)=>{
    res.render('log', {logStatus:logStatus});
  });
app.get('/qrPage', (req,res)=>{
  res.render('qrPage', {qrLink:qrLink});
});
app.listen(3000, ()=>{
  console.log("server started at port 3000");
});
