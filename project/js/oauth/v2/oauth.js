function getProviderInfo(callback) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			var providerInfo = null;
			if (xhr.status == 200 && xhr.responseText != null && xhr.responseText != '') {
				providerInfo = xhr.responseText;
			}
			if (callback) {
				callback(providerInfo);
			}
		}
	};
	xhr.open('GET', '/fmi/webd/oauthapi/oauthproviderinfo', true);
	xhr.send();
}

function getOAuthURL(trackingId, masterAddr, provider, callback) {
	var xhr, queryStr;
	
	xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			if (callback) {
				callback(xhr.responseText, xhr.getResponseHeader('X-FMS-Request-ID'));
			}
		}
	};
	queryStr = 'trackingID=' + trackingId + '&provider=' + provider + '&address=' + masterAddr + '&X-FMS-OAuth-AuthType=2';
	xhr.open('GET', '/fmi/webd/oauthapi/getoauthurl?' + queryStr, true);
	xhr.setRequestHeader('X-FMS-Return-URL', window.location.origin + '/fmi/webd/oauth-landing.html');
	xhr.send();
}

function doOAuthLogin(dbName, requestId, identifier, homeurl, autherr, element, parameter) {
	var form, node, queryStr;
	
	form = document.createElement('form');
	form.style.display = 'none';
	form.action = '/fmi/webd/' + encodeURIComponent(dbName);
	form.method = 'POST';
//	form.target = '_self';
	form.target = element ? element : "_Self"
	node = document.createElement('input');
	node.type = 'text';
	node.name = 'user';
	node.value = requestId;
	form.appendChild(node.cloneNode());
	
	node = document.createElement('input');
	node.type = 'text';
	node.name = 'pwd';
	node.value = identifier;
	form.appendChild(node.cloneNode());
    
	queryStr = 'lgcnt=1&oauth=1';
    /* Remove Local logins */
    if (parameter != '') queryStr += '&' + parameter
	if (homeurl != '') {
		queryStr += ('&homeurl=' + homeurl);
	}
	if (autherr != '') {
		queryStr += ('&autherr=' + autherr);
	}
	
	if (queryStr != '') {
		form.action += ('?' + queryStr);
	}
	
	document.body.appendChild(form);
	form.submit();
	document.body.removeChild(form);
}

function getOAuthResponseParameter(input, parameter) {
    if (input != null) return new URLSearchParams(input).get(parameter);
    return "";
}

function guid() {
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4()
}
function s4() {
    return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1)
}