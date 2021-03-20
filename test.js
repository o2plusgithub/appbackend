    const request = require('request');

    request('https://api.allorigins.win/get?url=' + encodeURIComponent('https://proxycheck.io/v2/' + '117.211.55.11' + '?vpn=1&asn=1'), function (error, response, body) {


    	    		console.log(response.statusCode)

    	    })

