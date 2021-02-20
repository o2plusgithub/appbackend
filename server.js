var express = require('express');
var bodyParser = require('body-parser');
const session = require('express-session');
var cors = require('cors'); // We will use CORS to enable cross origin domain requests.
var urlencodedParser = bodyParser.urlencoded({ extended: false});
var app = express();
app.use(express.static(__dirname));
app.use(session({secret: 'd9BgKuHWPOrH2WC5',saveUninitialized: true,resave: true, cookie: {  maxAge: 3*60*60*1000 }}));
app.set('view engine', 'ejs');
const PORT = process.env.PORT || 5000;
// secure: true for https express-session

var sess; // global session, NOT recommended

app.get('/',function(req,res){
  res.end("hello world");
});


app.listen(PORT, function() { console.log('listening')});