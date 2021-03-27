var express = require('express');
const path = require('path');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var moment = require('moment'); // require
const pki = require('node-forge').pki;
var jwt = require('jsonwebtoken');
const request = require('request');
const cryptoRandomString = require('crypto-random-string');
const PORT = process.env.PORT || 5000;
const helmet = require('helmet');
const Cryptr = require('cryptr');
const cryptr = new Cryptr('IPx3zITsOPot5Vq60Y6L');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const expressip = require('express-ip');
var useragent = require('express-useragent');



// app version change here 
var current_version = 1;
var server_mode = true; // true for online and false for offline or maintainance

// server selection script
var server_max = 1;
var random_server = Math.floor(Math.random() * (server_max - 1) + 1);
// safetynet api selection script
var safetynet_api_max = 1;
var safetynet_api_array = ["AIzaSyCuZhp6VebjNd0NLDBX5m3bub96NeGSaIo"];
var safetynet_random_api = Math.floor(Math.random() * (safetynet_api_max - 1) + 0);
var safetynet_api = safetynet_api_array[safetynet_random_api];


if (process.env.NODE_ENV === "production") {
	console.log("server is in production mode")
} else {
	console.log("server is not in production mode");
}

var app = express();
app.use(expressip().getIpInfoMiddleware);
app.use(useragent.express());
// OSC = O2Plus server cookie
// helmet is needed for hsts => very important to block attacks 
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(function(req, res, next) {
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.status(404);
    } else {
        next();
    }
})
// update the version of app here 

var device_details_server = new Schema({
	user_ip : String,
	user_city : String,
	user_state : String,
	unique_id: String,
	build_product : String, 
	build_model: String, 
	build_manufacturer: String, 
    nonce: String,
    api_key: String,
    expireAt: {
    	type: Date,
    	default: Date.now,
    	index: { expires: '1m'} // , partialFilterExpression : {nonce: "false"} }, // add index to activate TTL
    }
}, {
    collection: 'device_details'
});



var connect = mongoose.createConnection('mongodb+srv://C6hivgPRCjxKGF9f:yW3c3fc8vpM0ego368z80271RCH@o2plusdatabase.vwl00.mongodb.net/devicedetails?retryWrites=true&w=majority', { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true });
var device_details_model = connect.model('device_details_model', device_details_server);

var device_server_log_details_server = new Schema({
	user_ip : String,
	user_city : String,
	user_state : String,
	unique_id: String,
	build_product : String, 
	build_model: String, 
	build_manufacturer: String, 
    api_key: String,
    log_report: String,
    solution: String,
    expireAt: {
    	type: Date,
    	default: Date.now,
    	index: { expires: '3h' },
    }
    //expireAt: {
    //	type: Date,
      	/* Defaults 7 days from now */
   	//	default: new Date(new Date().valueOf() + 600000),
    //  	/* Remove doc 60 seconds after specified date */
    //  	expires: 60
    //}
}, {
    collection: 'device_server_log_details'
});

var connect = mongoose.createConnection('mongodb+srv://C6hivgPRCjxKGF9f:yW3c3fc8vpM0ego368z80271RCH@o2plusdatabase.vwl00.mongodb.net/device_server_log_details?retryWrites=true&w=majority', { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true });
var device_server_log_details_model = connect.model('device_details_model', device_server_log_details_server);

var user_details_server = new Schema({
    username: String,
    password: String,
    branch: String,
    phonenumber: Number,
    phoneverified: Boolean,
    unique_id: String,
    userblocked: Boolean,
    video_watch_hour: Number,
    logincount: Number,
    lec_quality: String,
    points: Number,
    rank: Number,
    like: { type: [String], default: undefined },
    dislike: { type: [String], default: undefined },
    block_reason: String
}, {
    collection: 'user_details'
});

var connect1 = mongoose.createConnection('mongodb+srv://C6hivgPRCjxKGF9f:yW3c3fc8vpM0ego368z80271RCH@o2plusdatabase.vwl00.mongodb.net/userdetails?retryWrites=true&w=majority', { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true });
var user_details_model = connect1.model('user_details_model', user_details_server);

app.get('/', function(req, res) {
	res.send('Server is Online');
})


app.post('/check_update', urlencodedParser, function(req, res) {
    var version = current_version;
    if (parseInt(req.body.version) < version) {
        //add app link here 
        var update_load = { update_status: true, update_url: "https://devicechecko2plus.herokuapp.com/updateapk" };
        res.send(JSON.stringify(update_load));
    } else {
        var update_load = { update_status: false, update_url: "" };
        res.send(JSON.stringify(update_load));
    }
})

app.post('/token_load', urlencodedParser, function(req, res) {
    var user_ip_info = req.ipInfo;
    var user_ip = user_ip_info.ip;
    request('https://api.allorigins.win/get?url=' + encodeURIComponent('https://proxycheck.io/v2/' + user_ip + '?vpn=1&asn=1'), function (error, response, body) {
    	if (!error && response.statusCode === 200) {
    		var ip_data = JSON.parse(JSON.parse(body).contents)[user_ip];
    		var user_country = ip_data.isocode;
    		var user_city = ip_data.city;
    		var user_state = ip_data.region;
    		var user_proxy = ip_data.proxy;
    		var nonce = cryptoRandomString({ length: 32, type: 'numeric' });
    		const api_key = safetynet_api;
    		var fingerprint = req.body.fingerprint;
    		var webview_version = req.body.webview_version;
    		var unique_id = req.body.unique_id;
    		var build_fingerprint = req.body.build_fingerprint;
    		var build_hardware = req.body.build_hardware;
    		var build_hardware_array = build_hardware.split(":");
    		var build_product = build_hardware_array[0];
    		var build_model = build_hardware_array[1];
    		var build_manufacturer = build_hardware_array[2];
    		var vpn_status = ip_data.proxy != 'no';
    		var token_load = { server_status: server_mode, vpn_status : vpn_status, nonce: nonce, api_key: api_key };
    		var session_doc = {user_ip : user_ip, user_city : user_city, user_state : user_state, unique_id: unique_id, build_product : build_product, build_model : build_model, build_manufacturer : build_manufacturer , nonce: nonce, api_key: api_key};
    		device_details_model.create(session_doc, function(err, result) {
    			if (!err) {
    				res.send(JSON.stringify(token_load))
    			}
    		})
		}
	})
})

app.post('/device_auth', urlencodedParser, function(req, res) {
    var signedAttestation = req.body.signedAttestation;
    var decode_token_temp = jwt.decode(signedAttestation);
    var buff_temp = Buffer.from(decode_token_temp.nonce, "base64");
    var nonce_string_temp = buff_temp.toString('ascii');
    var search_id = { nonce: nonce_string_temp };
    device_details_model.find(search_id, function(err, result) {
        if (!err) {
        	var user_ip = result[0].user_ip;
        	var user_city = result[0].user_city;
        	var user_state = result[0].user_state;
        	var build_product = result[0].build_product;
        	var build_model = result[0].build_model;
        	var build_manufacturer = result[0].build_manufacturer;
            var unique_id = result[0].unique_id;
            var nonce = result[0].nonce;
            var api_key = result[0].api_key;
            var build_hardware = result[0].build_hardware;
            var jwt_url = "https://www.googleapis.com/androidcheck/v1/attestations/verify?key=" + api_key;
            request.post({ url: jwt_url , form: { "signedAttestation": signedAttestation } }, function(err, httpResponse, body) {
                if (err) {
                    // google server failed due to some reason
                    var response_code = { status: false, reason: 583, redirect_url: "about:blank" };
                    res.send(JSON.stringify(response_code));
                } else {
                    if (JSON.parse(body).isValidSignature) {
                        const TokenPromise = new Promise((resolve, reject) => {
                            var decode_token = jwt.decode(signedAttestation, { complete: true });
                            const token_x5c = decode_token.header.x5c;
                            const token_payload = decode_token.payload;          
                            const token_certificate = 
                            `-----BEGIN CERTIFICATE-----
`+  token_x5c[0] +
`-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
`+  token_x5c[1] +`
-----END CERTIFICATE-----`;
                            const certificate_temp = pki.certificateFromPem(token_certificate);
                            const pem_decode_certificate = certificate_temp.subject.attributes
                                .map(attr => ['"' + attr.name + '"', '"' + attr.value + '"'].join(':'))
                                .join(', ');
                            jwt.verify(signedAttestation, token_certificate, { algorithms: ['RS256'] }, function(err, payload) {
                                if (err) {
                                	console(err)
                                    var response_code = { signature: false, payload: null };
                                    resolve(response_code);
                                } else {
                                    var response_code = { signature: true, payload: token_payload, certificate: JSON.parse("{" + pem_decode_certificate + "}") };
                                    resolve(response_code);
                                }
                            })
                        });

                        TokenPromise.then(result => {
                            let buff = Buffer.from(result.payload.nonce, "base64");
                            let nonce_string = buff.toString('ascii');
                            var time_diff = moment().format('x') - moment(result.payload.timestampMs).format("x");
                            // remeber to reduvce the time diff = 3 min
                            if (result.signature && result.certificate.commonName == "attest.android.com" && nonce_string == nonce && time_diff <= 180000) {
                                // error 200 : No error
                                var redirect_token = cryptr.encrypt(JSON.stringify({ timestamp: moment().format('x'), unique_id: unique_id, user_ip : user_ip , user_city : user_city, user_state : user_state , build_product : build_product, build_model : build_model , build_manufacturer : build_manufacturer}));
                                user_details_model.find({unique_id: unique_id }, function(err, result){
                                	var number_users = result.length; 
                                	if (number_users == 0){
                                		// error 200 : No error and registration
                                		user_log ={user_ip : user_ip, user_city : user_city, user_state : user_state, unique_id : unique_id, build_product : build_product, build_model : build_model, build_manufacturer : build_manufacturer , api_key : api_key, log_report : 'error 200 : No error and registration', solution : ' '}
                                		device_server_log_details_model.create(user_log, function(err, result) {
                                			if(!err){
                                				var response_code = { status: true, reason: 200, redirect_url: "https://o2plususerinterface-server" + random_server + ".herokuapp.com/registration_page?token=" + redirect_token };
                                				res.send(JSON.stringify(response_code));
                                			}
                                		})                                		
                                	} else if (number_users == 1){
                                		// error 200 : No error and login
                                		user_log ={user_ip : user_ip, user_city : user_city, user_state : user_state, unique_id : unique_id, build_product : build_product, build_model : build_model, build_manufacturer : build_manufacturer , api_key : api_key, log_report : 'error 200 : No error and login', solution : ' '}
                                		device_server_log_details_model.create(user_log, function(err, result) {
                                			if(!err){
                                				var response_code = { status: true, reason: 200, redirect_url: "https://o2plususerinterface-server" + random_server + ".herokuapp.com/login_page?token=" + redirect_token };
                                				res.send(JSON.stringify(response_code));
                                			}
                                		})
                                	} else {
                                		// error 273 : multiple unique ids founds. need to purge
                                		user_log ={user_ip : user_ip, user_city : user_city, user_state : user_state, unique_id : unique_id, build_product : build_product, build_model : build_model, build_manufacturer : build_manufacturer , api_key : api_key, log_report : 'error 273 : multiple unique ids founds. need to purge', solution : 'Multiple unique ids founds. Maybe because someones phone shows unqiue id as null. Need to purge those users and study the issue'}
                                		device_server_log_details_model.create(user_log, function(err, result) {
                                			if(!err){
                                				var response_code = { status: false, reason: 273, redirect_url: "about:blank" };
                        						res.send(JSON.stringify(response_code));
                  							}
                        				})
                                	}
                                })
                            } else {
                            	// error 249 : signature failed because of app tampering 
                            	user_log ={user_ip : user_ip, user_city : user_city, user_state : user_state, unique_id : unique_id,  build_product : build_product, build_model : build_model, build_manufacturer : build_manufacturer , api_key : api_key, log_report : 'error 249 : signature failed because of app tampering', solution : 'No solution, maybe change timing to more than 3 min. App signature should not be tampered'}
                        		device_server_log_details_model.create(user_log, function(err, result) {
                        			if(!err){
                        				var response_code = { status: false, reason: 249, redirect_url: "about:blank" };
                        				res.send(JSON.stringify(response_code));
                        			}
                        		})
                            }
                        });
                    } else {
                        // error 803 : google rejected the signature 
                        user_log ={user_ip : user_ip, user_city : user_city, user_state : user_state, unique_id : unique_id,  build_product : build_product, build_model : build_model, build_manufacturer : build_manufacturer , api_key : api_key, log_report : 'error 803 : google rejected the signature', solution : 'change the api key'}
                        device_server_log_details_model.create(user_log, function(err, result) {
                        	if(!err){
                        		var response_code = { status: false, reason: 803, redirect_url: "about:blank" };
                        		res.send(JSON.stringify(response_code));
                        	}
                        })
                    }
                }
            })

        }
    })
})


app.listen(PORT, function() { console.log('listening') });