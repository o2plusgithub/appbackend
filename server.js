var express = require('express');
const path = require('path');
var bodyParser = require('body-parser');
const session = require('express-session');
var urlencodedParser = bodyParser.urlencoded({ extended: false});
var moment = require('moment'); // require
const pki = require('node-forge').pki;
var jwt = require('jsonwebtoken');
const request = require('request');
const cryptoRandomString = require('crypto-random-string');
var ejs = require('ejs');
const PORT = process.env.PORT || 5000;
const helmet = require('helmet');
const Cryptr = require('cryptr');
const cryptr = new Cryptr('IPx3zITsOPot5Vq60Y6L');
var MongoDBStore = require('connect-mongodb-session')(session);
var app = express();
// OSC = O2Plus server cookie
// helmet is needed for hsts => very important to block attacks 
app.use(helmet());
app.use(express.static(__dirname));
var store = new MongoDBStore({
    uri: 'mongodb+srv://C6hivgPRCjxKGF9f:yW3c3fc8vpM0ego368z80271RCH@o2plusdatabase.vwl00.mongodb.net/userSessions?retryWrites=true&w=majority',
    collection: 'userSessions',
    expires: 1000 * 60 * 60 * 24 * 30, // expire in mongo 4hrs
});

// Catch errors
store.on('error', function(error) {
    console.log('CANT CONNECT TO MongoDBStore !!!');
    console.log(error);
});

app.use(session({
    secret: 'U5EAM0SCAD37CLjpLp7a',
    store: store,
    cookie: {
        maxAge: 3 * 60 * 60 * 1000
    }
}));
app.set('view engine', 'ejs');

app.use(function (req, res, next) {
  if (req.headers['x-forwarded-proto'] !== 'https'){
      return res.status(404).render('website_error.ejs');
    } else {
    next();
    }
})
// update the version of app here 

var current_version = 1;

var sess;

app.get('/',function(req,res){
  res.render('website_status.ejs');
});

app.post('/check_update', urlencodedParser, function(req, res){
  var version = current_version;
  var sess = req.session;
  if (parseInt(req.body.version) < version){
    //add app link here 
    var update_load = {update_status : true, update_url : "https://devicechecko2plus.herokuapp.com/updateapk"};
    res.send(JSON.stringify(update_load));
  } else {
    sess.version = req.body.version;
    var update_load = {update_status : false, update_url : ""};
    res.send(JSON.stringify(update_load));
  }

})

app.post('/token_load', urlencodedParser, function(req, res){
  var sess = req.session;
  var nonce = cryptoRandomString({length: 32, type: 'url-safe'});
  const api_key = "AIzaSyAytfiIKLj5fec-V1smwDmZuM8gmZFWgm8";
  sess.fingerprint = req.body.fingerprint;
  sess.webview_version = req.body.webview_version;
  sess.unique_id = req.body.unique_id;
  sess.build_fingerprint = req.body.build_fingerprint;
  sess.build_hardware = req.body.build_hardware;
  sess.nonce = nonce; 
  sess.api_key = api_key;
  console.log(req.body);
  var token_load = {nonce : nonce, api_key : api_key};
  res.send(JSON.stringify(token_load));
})

app.post('/device_auth', urlencodedParser, function(req, res){
  //const signedAttestation1 = "eyJhbGciOiJSUzI1NiIsIng1YyI6WyJNSUlGbERDQ0JIeWdBd0lCQWdJUkFQUWdpNWZxN3EvQkFnQUFBQUNFUGRZd0RRWUpLb1pJaHZjTkFRRUxCUUF3UWpFTE1Ba0dBMVVFQmhNQ1ZWTXhIakFjQmdOVkJBb1RGVWR2YjJkc1pTQlVjblZ6ZENCVFpYSjJhV05sY3pFVE1CRUdBMVVFQXhNS1IxUlRJRU5CSURGUE1UQWVGdzB5TURFeU1UVXhNREUxTlRGYUZ3MHlNVEEyTVRNeE1ERTFOVEJhTUd3eEN6QUpCZ05WQkFZVEFsVlRNUk13RVFZRFZRUUlFd3BEWVd4cFptOXlibWxoTVJZd0ZBWURWUVFIRXcxTmIzVnVkR0ZwYmlCV2FXVjNNUk13RVFZRFZRUUtFd3BIYjI5bmJHVWdURXhETVJzd0dRWURWUVFERXhKaGRIUmxjM1F1WVc1a2NtOXBaQzVqYjIwd2dnRWlNQTBHQ1NxR1NJYjNEUUVCQVFVQUE0SUJEd0F3Z2dFS0FvSUJBUUNwYmx2WFhpejJrRGkrNFBKL1o1ZGRpdG9FckhyTkZwWWJteGdEM3BxQXA1U2xQeEVwUXNPdzRnWTZtWkJpelUxWWJrdXZxZFkwMUd3QVBOUk5MeEgrVHJPbk1TOGQ1U2FGbXcrMWd1V3Q5a0twajVveUN4dmtkSXBWQmp5bmg3amxQcTZCYndFblpOazBvb01hTW5yRW5Ebmpxb2N0Z095T1hFdmFTWlhwaktSaWRKL2k0dFhGWXU2SUtOakQrQkN1VXVNdGNKRjNvRHpFYVpQdlpnNzU4NFpmSnZHaHI3dlYvMy9VVjdlQlNQZXFBSkxNYWtkRFgyMlE1ekxKMnNUaUs2blhxZGhpUlVma1ZycDdRTFFxTVZCVzd4US82ZzZYdXYxZ2VyYTRjbktzS1hxY1dxUllCUWx4Ujltemw4UmVyQ2FGRXJZK2Q0bnV0anJ6TlNYN0FnTUJBQUdqZ2dKWk1JSUNWVEFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvQkFJd0FEQWRCZ05WSFE0RUZnUVV1RGxJUktOSW5hdkZkYzF0ZkllZCt1WTE4M1F3SHdZRFZSMGpCQmd3Rm9BVW1OSDRiaERyejV2c1lKOFlrQnVnNjMwSi9Tc3daQVlJS3dZQkJRVUhBUUVFV0RCV01DY0dDQ3NHQVFVRkJ6QUJoaHRvZEhSd09pOHZiMk56Y0M1d2Eya3VaMjl2Wnk5bmRITXhiekV3S3dZSUt3WUJCUVVITUFLR0gyaDBkSEE2THk5d2Eya3VaMjl2Wnk5bmMzSXlMMGRVVXpGUE1TNWpjblF3SFFZRFZSMFJCQll3RklJU1lYUjBaWE4wTG1GdVpISnZhV1F1WTI5dE1DRUdBMVVkSUFRYU1CZ3dDQVlHWjRFTUFRSUNNQXdHQ2lzR0FRUUIxbmtDQlFNd0x3WURWUjBmQkNnd0pqQWtvQ0tnSUlZZWFIUjBjRG92TDJOeWJDNXdhMmt1WjI5dlp5OUhWRk14VHpFdVkzSnNNSUlCQlFZS0t3WUJCQUhXZVFJRUFnU0I5Z1NCOHdEeEFIY0E3c0NWN28xeVpBK1M0OE81RzhjU28ybHFDWHRMYWhvVU9PWkhzc3Z0eGZrQUFBRjJaaDBhc1FBQUJBTUFTREJHQWlFQW9wL05BemFZV1BWWDFDNld2amF3QkY3Mm5xTjRwNjdLVTdhRzBhd0U4K1FDSVFEVFV6VjJndDYwdmhaZElyb2pLZ1VCb25HY1ZOd1hvdFluREY1V01tRXpBd0IyQVBaY2xDL1JkekFpRkZRWUNEQ1VWbzdqVFJNWk03L2ZEQzhnQzh4TzhXVGpBQUFCZG1ZZEdqNEFBQVFEQUVjd1JRSWdDT1l1ZmVKR0xSMzU5UGpYemI4c0NmWVdtaGlQeHZEZk9zWFlHMzN2d2l3Q0lRQ3lOMHRydHlyTFJHbjNVdUY5SG1KRUNHNEVDTmhLU1c0aUw1VG54NXhBRlRBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQVgwMnFKV1RsTlowekZXa3NBMjJsY3A1bEVEV0lZdEc4cXp4cWhOVmZsNlFxUzRFcjFkaFFFbnc3eSt4cDhOTVpSWXZRZVRFeVRGL1FBTnZCYUtUUmlXaWZJOTZBZkJKcDJVUFZMcVpUK3Jwc216UGM1TXpwaERBVW1NRlV3U0JEODAxUkVoUjgvTW5CdFg2aXEwcjc2WlVheVN3dVZ5WGNUWmQwK3cwRkdTbWZVZG1lTUY2Uno5QW9kVXFFMWNEa3NudmI0QzNwUnZOcm9mbXBsSUF2WGdnL3RmR1VWRXVuS3lTMjBnczN4WDROMklRZDRxNlUzRk1oaWN2ejI2T2xrK3krM01xOVNSTkdiZk82dmhib2hEc09nYnNMdzY3aDN3ZlFON2lzYmhKcDRIR2hsdm5mKysxL1ZvdmdmYythUGFVUklCdWFSR1NVK2hEWkxrbXV3Zz09IiwiTUlJRVNqQ0NBektnQXdJQkFnSU5BZU8wbXFHTmlxbUJKV2xRdURBTkJna3Foa2lHOXcwQkFRc0ZBREJNTVNBd0hnWURWUVFMRXhkSGJHOWlZV3hUYVdkdUlGSnZiM1FnUTBFZ0xTQlNNakVUTUJFR0ExVUVDaE1LUjJ4dlltRnNVMmxuYmpFVE1CRUdBMVVFQXhNS1IyeHZZbUZzVTJsbmJqQWVGdzB4TnpBMk1UVXdNREF3TkRKYUZ3MHlNVEV5TVRVd01EQXdOREphTUVJeEN6QUpCZ05WQkFZVEFsVlRNUjR3SEFZRFZRUUtFeFZIYjI5bmJHVWdWSEoxYzNRZ1UyVnlkbWxqWlhNeEV6QVJCZ05WQkFNVENrZFVVeUJEUVNBeFR6RXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCRHdBd2dnRUtBb0lCQVFEUUdNOUYxSXZOMDV6a1FPOSt0TjFwSVJ2Snp6eU9USFc1RHpFWmhEMmVQQ252VUEwUWsyOEZnSUNmS3FDOUVrc0M0VDJmV0JZay9qQ2ZDM1IzVlpNZFMvZE40WktDRVBaUnJBekRzaUtVRHpScm1CQko1d3VkZ3puZElNWWNMZS9SR0dGbDV5T0RJS2dqRXYvU0pIL1VMK2RFYWx0TjExQm1zSytlUW1NRisrQWN4R05ocjU5cU0vOWlsNzFJMmROOEZHZmNkZHd1YWVqNGJYaHAwTGNRQmJqeE1jSTdKUDBhTTNUNEkrRHNheG1LRnNianphVE5DOXV6cEZsZ09JZzdyUjI1eG95blV4djh2Tm1rcTd6ZFBHSFhreFdZN29HOWorSmtSeUJBQms3WHJKZm91Y0JaRXFGSkpTUGs3WEEwTEtXMFkzejVvejJEMGMxdEpLd0hBZ01CQUFHamdnRXpNSUlCTHpBT0JnTlZIUThCQWY4RUJBTUNBWVl3SFFZRFZSMGxCQll3RkFZSUt3WUJCUVVIQXdFR0NDc0dBUVVGQndNQ01CSUdBMVVkRXdFQi93UUlNQVlCQWY4Q0FRQXdIUVlEVlIwT0JCWUVGSmpSK0c0UTY4K2I3R0NmR0pBYm9PdDlDZjByTUI4R0ExVWRJd1FZTUJhQUZKdmlCMWRuSEI3QWFnYmVXYlNhTGQvY0dZWXVNRFVHQ0NzR0FRVUZCd0VCQkNrd0p6QWxCZ2dyQmdFRkJRY3dBWVlaYUhSMGNEb3ZMMjlqYzNBdWNHdHBMbWR2YjJjdlozTnlNakF5QmdOVkhSOEVLekFwTUNlZ0phQWpoaUZvZEhSd09pOHZZM0pzTG5CcmFTNW5iMjluTDJkemNqSXZaM055TWk1amNtd3dQd1lEVlIwZ0JEZ3dOakEwQmdabmdRd0JBZ0l3S2pBb0JnZ3JCZ0VGQlFjQ0FSWWNhSFIwY0hNNkx5OXdhMmt1WjI5dlp5OXlaWEJ2YzJsMGIzSjVMekFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBR29BK05ubjc4eTZwUmpkOVhsUVdOYTdIVGdpWi9yM1JOR2ttVW1ZSFBRcTZTY3RpOVBFYWp2d1JUMmlXVEhRcjAyZmVzcU9xQlkyRVRVd2daUStsbHRvTkZ2aHNPOXR2QkNPSWF6cHN3V0M5YUo5eGp1NHRXRFFIOE5WVTZZWlovWHRlRFNHVTlZekpxUGpZOHEzTUR4cnptcWVwQkNmNW84bXcvd0o0YTJHNnh6VXI2RmI2VDhNY0RPMjJQTFJMNnUzTTRUenMzQTJNMWo2YnlrSllpOHdXSVJkQXZLTFdadS9heEJWYnpZbXFtd2ttNXpMU0RXNW5JQUpiRUxDUUNad01INTZ0MkR2cW9meHM2QkJjQ0ZJWlVTcHh1Nng2dGQwVjdTdkpDQ29zaXJTbUlhdGovOWRTU1ZEUWliZXQ4cS83VUs0djRaVU44MGF0blp6MXlnPT0iXX0.eyJub25jZSI6IlFVbDZZVk41UVc5eWExQkhORkZ5U2poVE1FaFFXVTA1Y25Ca2EzUm5iSEZQTlZWSWVrMDQiLCJ0aW1lc3RhbXBNcyI6MTYxMzkwMTYzMzQxMSwiYXBrUGFja2FnZU5hbWUiOiJjb20uZXhhbXBsZS50ZXN0YnJvd3NlciIsImFwa0RpZ2VzdFNoYTI1NiI6InpFQlZ1b1pGUk5Oa1pvSXdGbXlmQnhGYnkwVDkwT0U4dHh1VnV1VGRsMlE9IiwiY3RzUHJvZmlsZU1hdGNoIjp0cnVlLCJhcGtDZXJ0aWZpY2F0ZURpZ2VzdFNoYTI1NiI6WyJyWnEzRlM4dXZFMmNKNFJZRlRjUDNyVFM4T3VYZ1hJRFN2d1ZGS0hDbXhrPSJdLCJiYXNpY0ludGVncml0eSI6dHJ1ZSwiZXZhbHVhdGlvblR5cGUiOiJCQVNJQyJ9.G34wQpDCZN2dDCO4a00nQD4pRS4Bpz9ZNaKqx7jDAc-kFjPwjwvTfrzOC2NO8gcjHwfdZ14wgk0qwZYgZng0qPQXkOG6rIAmF837hQGdMDEFlD10fSE1LiAjsMKl3zTTRld-91jC__1UC8-eJlmCVn-NpmThIVyzrLrO-R1YNidJx_mM-AwdeRLCqqmpGUMGJFrDz4YbhpN4S1mMWjw10GkGG5ov4JStebyLrTh4GDTvwLZUGYvZd-tYDc3Zl9ssctZpNR_7j3uTlteKrsJxbOxthe21H_-4HyJwhvChAe0fA8zQbdyhpPF-rRpmV7fijoPDr8hOZVooXLgJ65djgg";
  //const signedAttestation = "eyJhbGciOiJSUzI1NiIsIng1YyI6WyJNSUlGbERDQ0JIeWdBd0lCQWdJUkFQUWdpNWZxN3EvQkFnQUFBQUNFUGRZd0RRWUpLb1pJaHZjTkFRRUxCUUF3UWpFTE1Ba0dBMVVFQmhNQ1ZWTXhIakFjQmdOVkJBb1RGVWR2YjJkc1pTQlVjblZ6ZENCVFpYSjJhV05sY3pFVE1CRUdBMVVFQXhNS1IxUlRJRU5CSURGUE1UQWVGdzB5TURFeU1UVXhNREUxTlRGYUZ3MHlNVEEyTVRNeE1ERTFOVEJhTUd3eEN6QUpCZ05WQkFZVEFsVlRNUk13RVFZRFZRUUlFd3BEWVd4cFptOXlibWxoTVJZd0ZBWURWUVFIRXcxTmIzVnVkR0ZwYmlCV2FXVjNNUk13RVFZRFZRUUtFd3BIYjI5bmJHVWdURXhETVJzd0dRWURWUVFERXhKaGRIUmxjM1F1WVc1a2NtOXBaQzVqYjIwd2dnRWlNQTBHQ1NxR1NJYjNEUUVCQVFVQUE0SUJEd0F3Z2dFS0FvSUJBUUNwYmx2WFhpejJrRGkrNFBKL1o1ZGRpdG9FckhyTkZwWWJteGdEM3BxQXA1U2xQeEVwUXNPdzRnWTZtWkJpelUxWWJrdXZxZFkwMUd3QVBOUk5MeEgrVHJPbk1TOGQ1U2FGbXcrMWd1V3Q5a0twajVveUN4dmtkSXBWQmp5bmg3amxQcTZCYndFblpOazBvb01hTW5yRW5Ebmpxb2N0Z095T1hFdmFTWlhwaktSaWRKL2k0dFhGWXU2SUtOakQrQkN1VXVNdGNKRjNvRHpFYVpQdlpnNzU4NFpmSnZHaHI3dlYvMy9VVjdlQlNQZXFBSkxNYWtkRFgyMlE1ekxKMnNUaUs2blhxZGhpUlVma1ZycDdRTFFxTVZCVzd4US82ZzZYdXYxZ2VyYTRjbktzS1hxY1dxUllCUWx4Ujltemw4UmVyQ2FGRXJZK2Q0bnV0anJ6TlNYN0FnTUJBQUdqZ2dKWk1JSUNWVEFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvQkFJd0FEQWRCZ05WSFE0RUZnUVV1RGxJUktOSW5hdkZkYzF0ZkllZCt1WTE4M1F3SHdZRFZSMGpCQmd3Rm9BVW1OSDRiaERyejV2c1lKOFlrQnVnNjMwSi9Tc3daQVlJS3dZQkJRVUhBUUVFV0RCV01DY0dDQ3NHQVFVRkJ6QUJoaHRvZEhSd09pOHZiMk56Y0M1d2Eya3VaMjl2Wnk5bmRITXhiekV3S3dZSUt3WUJCUVVITUFLR0gyaDBkSEE2THk5d2Eya3VaMjl2Wnk5bmMzSXlMMGRVVXpGUE1TNWpjblF3SFFZRFZSMFJCQll3RklJU1lYUjBaWE4wTG1GdVpISnZhV1F1WTI5dE1DRUdBMVVkSUFRYU1CZ3dDQVlHWjRFTUFRSUNNQXdHQ2lzR0FRUUIxbmtDQlFNd0x3WURWUjBmQkNnd0pqQWtvQ0tnSUlZZWFIUjBjRG92TDJOeWJDNXdhMmt1WjI5dlp5OUhWRk14VHpFdVkzSnNNSUlCQlFZS0t3WUJCQUhXZVFJRUFnU0I5Z1NCOHdEeEFIY0E3c0NWN28xeVpBK1M0OE81RzhjU28ybHFDWHRMYWhvVU9PWkhzc3Z0eGZrQUFBRjJaaDBhc1FBQUJBTUFTREJHQWlFQW9wL05BemFZV1BWWDFDNld2amF3QkY3Mm5xTjRwNjdLVTdhRzBhd0U4K1FDSVFEVFV6VjJndDYwdmhaZElyb2pLZ1VCb25HY1ZOd1hvdFluREY1V01tRXpBd0IyQVBaY2xDL1JkekFpRkZRWUNEQ1VWbzdqVFJNWk03L2ZEQzhnQzh4TzhXVGpBQUFCZG1ZZEdqNEFBQVFEQUVjd1JRSWdDT1l1ZmVKR0xSMzU5UGpYemI4c0NmWVdtaGlQeHZEZk9zWFlHMzN2d2l3Q0lRQ3lOMHRydHlyTFJHbjNVdUY5SG1KRUNHNEVDTmhLU1c0aUw1VG54NXhBRlRBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQVgwMnFKV1RsTlowekZXa3NBMjJsY3A1bEVEV0lZdEc4cXp4cWhOVmZsNlFxUzRFcjFkaFFFbnc3eSt4cDhOTVpSWXZRZVRFeVRGL1FBTnZCYUtUUmlXaWZJOTZBZkJKcDJVUFZMcVpUK3Jwc216UGM1TXpwaERBVW1NRlV3U0JEODAxUkVoUjgvTW5CdFg2aXEwcjc2WlVheVN3dVZ5WGNUWmQwK3cwRkdTbWZVZG1lTUY2Uno5QW9kVXFFMWNEa3NudmI0QzNwUnZOcm9mbXBsSUF2WGdnL3RmR1VWRXVuS3lTMjBnczN4WDROMklRZDRxNlUzRk1oaWN2ejI2T2xrK3krM01xOVNSTkdiZk82dmhib2hEc09nYnNMdzY3aDN3ZlFON2lzYmhKcDRIR2hsdm5mKysxL1ZvdmdmYythUGFVUklCdWFSR1NVK2hEWkxrbXV3Zz09IiwiTUlJRVNqQ0NBektnQXdJQkFnSU5BZU8wbXFHTmlxbUJKV2xRdURBTkJna3Foa2lHOXcwQkFRc0ZBREJNTVNBd0hnWURWUVFMRXhkSGJHOWlZV3hUYVdkdUlGSnZiM1FnUTBFZ0xTQlNNakVUTUJFR0ExVUVDaE1LUjJ4dlltRnNVMmxuYmpFVE1CRUdBMVVFQXhNS1IyeHZZbUZzVTJsbmJqQWVGdzB4TnpBMk1UVXdNREF3TkRKYUZ3MHlNVEV5TVRVd01EQXdOREphTUVJeEN6QUpCZ05WQkFZVEFsVlRNUjR3SEFZRFZRUUtFeFZIYjI5bmJHVWdWSEoxYzNRZ1UyVnlkbWxqWlhNeEV6QVJCZ05WQkFNVENrZFVVeUJEUVNBeFR6RXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCRHdBd2dnRUtBb0lCQVFEUUdNOUYxSXZOMDV6a1FPOSt0TjFwSVJ2Snp6eU9USFc1RHpFWmhEMmVQQ252VUEwUWsyOEZnSUNmS3FDOUVrc0M0VDJmV0JZay9qQ2ZDM1IzVlpNZFMvZE40WktDRVBaUnJBekRzaUtVRHpScm1CQko1d3VkZ3puZElNWWNMZS9SR0dGbDV5T0RJS2dqRXYvU0pIL1VMK2RFYWx0TjExQm1zSytlUW1NRisrQWN4R05ocjU5cU0vOWlsNzFJMmROOEZHZmNkZHd1YWVqNGJYaHAwTGNRQmJqeE1jSTdKUDBhTTNUNEkrRHNheG1LRnNianphVE5DOXV6cEZsZ09JZzdyUjI1eG95blV4djh2Tm1rcTd6ZFBHSFhreFdZN29HOWorSmtSeUJBQms3WHJKZm91Y0JaRXFGSkpTUGs3WEEwTEtXMFkzejVvejJEMGMxdEpLd0hBZ01CQUFHamdnRXpNSUlCTHpBT0JnTlZIUThCQWY4RUJBTUNBWVl3SFFZRFZSMGxCQll3RkFZSUt3WUJCUVVIQXdFR0NDc0dBUVVGQndNQ01CSUdBMVVkRXdFQi93UUlNQVlCQWY4Q0FRQXdIUVlEVlIwT0JCWUVGSmpSK0c0UTY4K2I3R0NmR0pBYm9PdDlDZjByTUI4R0ExVWRJd1FZTUJhQUZKdmlCMWRuSEI3QWFnYmVXYlNhTGQvY0dZWXVNRFVHQ0NzR0FRVUZCd0VCQkNrd0p6QWxCZ2dyQmdFRkJRY3dBWVlaYUhSMGNEb3ZMMjlqYzNBdWNHdHBMbWR2YjJjdlozTnlNakF5QmdOVkhSOEVLekFwTUNlZ0phQWpoaUZvZEhSd09pOHZZM0pzTG5CcmFTNW5iMjluTDJkemNqSXZaM055TWk1amNtd3dQd1lEVlIwZ0JEZ3dOakEwQmdabmdRd0JBZ0l3S2pBb0JnZ3JCZ0VGQlFjQ0FSWWNhSFIwY0hNNkx5OXdhMmt1WjI5dlp5OXlaWEJ2YzJsMGIzSjVMekFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBR29BK05ubjc4eTZwUmpkOVhsUVdOYTdIVGdpWi9yM1JOR2ttVW1ZSFBRcTZTY3RpOVBFYWp2d1JUMmlXVEhRcjAyZmVzcU9xQlkyRVRVd2daUStsbHRvTkZ2aHNPOXR2QkNPSWF6cHN3V0M5YUo5eGp1NHRXRFFIOE5WVTZZWlovWHRlRFNHVTlZekpxUGpZOHEzTUR4cnptcWVwQkNmNW84bXcvd0o0YTJHNnh6VXI2RmI2VDhNY0RPMjJQTFJMNnUzTTRUenMzQTJNMWo2YnlrSllpOHdXSVJkQXZLTFdadS9heEJWYnpZbXFtd2ttNXpMU0RXNW5JQUpiRUxDUUNad01INTZ0MkR2cW9meHM2QkJjQ0ZJWlVTcHh1Nng2dGQwVjdTdkpDQ29zaXJTbUlhdGovOWRTU1ZEUWliZXQ4cS83VUs0djRaVU44MGF0blp6MXlnPT0iXX0.eyJub25jZSI6IlFVbDZZVk41UVc5eWExQkhORkZ5U2poVE1FaFFXVTA1Y25Ca2EzUm5iSEZQTlZWSWVrMDQiLCJ0aW1lc3RhbXBNcyI6MTYxMzkwMjE3Nzc1NSwiYXBrUGFja2FnZU5hbWUiOiJjb20uZXhhbXBsZS50ZXN0YnJvd3NlciIsImFwa0RpZ2VzdFNoYTI1NiI6InpFQlZ1b1pGUk5Oa1pvSXdGbXlmQnhGYnkwVDkwT0U4dHh1VnV1VGRsMlE9IiwiY3RzUHJvZmlsZU1hdGNoIjp0cnVlLCJhcGtDZXJ0aWZpY2F0ZURpZ2VzdFNoYTI1NiI6WyJyWnEzRlM4dXZFMmNKNFJZRlRjUDNyVFM4T3VYZ1hJRFN2d1ZGS0hDbXhrPSJdLCJiYXNpY0ludGVncml0eSI6dHJ1ZSwiZXZhbHVhdGlvblR5cGUiOiJCQVNJQyJ9.o2oviD-rYc0ULdtKLs15xmQpXnbURVSFJ5NumyQ_0yoT6GMKolOWaA1-iFS7tJgxSbTZ-0vOxhxVnNF0WDOZMGBduhAkZ6RvTBqMz5MN57WKBLH9bpdSpwrVFmIGkOLFFJUOMPtjQnpSXwJhIzOL2R5AtI5Bc75NEJd__Td_pC-gCbeIwX1jjTonpAdXwV8SgjSuQ-wu8oxgNCxd3Ft0bxixlf0VrCmXUJMw7oUTMF4koAGRvh6WoQxXk281wX6vb7muuixeNQtUUy86WDzHrgzmBEdEva4b4UypjYwCFYrSlIMYZajR4WaWXlEWE7FfZJVZse3Nivw-jARa_Luudg";
  //const api_key = "AIzaSyAorkPG4QrJ8S0HPYM9rpdktglqO5UHzM8";
  var sess = req.session;
  console.log(sess);
  var api_key = sess.api_key;
  var nonce = sess.nonce;
  var signedAttestation = req.body.signedAttestation;
  console.log(signedAttestation)
  request.post({url:'https://www.googleapis.com/androidcheck/v1/attestations/verify?key='+api_key, form: { "signedAttestation" : signedAttestation}}, function(err,httpResponse,body){ 
    if (err){
      console.log("token_server_fail");
      // google server failed due to some reason
      var response_code = { status : false, reason: 583, redirect_url : "about:blank"};
      res.send(JSON.stringify(response_code)); 
    } else {
      if (JSON.parse(body).isValidSignature){
        const TokenPromise = new Promise((resolve, reject) => {   
          var decode_token = jwt.decode(signedAttestation, {complete: true});
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
          .map(attr => ['"' + attr.name + '"', '"'+ attr.value + '"'].join(':'))
          .join(', ');
          jwt.verify(signedAttestation,  token_certificate , { algorithms: ['RS256'] }, function (err, payload) {
            if (err){
              var response_code = {signature : false, payload : null};
              resolve(response_code);
            } else {
              var response_code = {signature : true, payload : token_payload, certificate : JSON.parse("{"+ pem_decode_certificate +"}")};
              resolve(response_code); 
            }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
          })
        });

        TokenPromise.then(result => {
          let buff = new Buffer(result.payload.nonce, "base64");
          let nonce_string = buff.toString('ascii');
          var time_diff = moment().format('x') - moment(result.payload.timestampMs).format("x");
          // remeber to reduvce the time diff
          if (result.signature && result.certificate.commonName == "attest.android.com" && nonce_string == nonce && time_diff <= 300000){
            // error 200 : No error

            var redirect_token = cryptr.encrypt(JSON.stringify({timestamp : moment().format('x'), unique_id : sess.unique_id}));
            var response_code = { status : true, reason: 200, redirect_url : "https://o2plususerinterface-server1.herokuapp.com/login_page?token="+ redirect_token};
            console.log(response_code);
            res.send(JSON.stringify(response_code)); 
          } else {

            // error 249 : signature failed because of app tampering 
            var response_code = { status : false, reason: 249, redirect_url : "about:blank"};
            console.log(response_code);
            res.send(JSON.stringify(response_code)); 
          }
        });
      } else{
        // error 803 : google rejected the signature 
        var response_code = { status : false, reason: 803, redirect_url : "about:blank"};

        res.send(JSON.stringify(response_code)); 
        console.log("token_decode_failed");
      }
    }
  })
})


app.listen(PORT, function() { console.log('listening')});





