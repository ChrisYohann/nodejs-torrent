const querystring = require('querystring')

function padLeft(str, pad){
  return pad.substring(0, pad.length - str.length) + str;
}

function encodeByte(byte){
  return (byte >= 49 && byte <= 57)
      || (byte >= 65 && byte <= 90)
      || (byte >= 97 && byte <= 122)
      ? String.fromCharCode(byte) : '%' + padLeft(byte.toString(16), "00");
}

function encodeBuffer(buf){
  return Array.prototype.map.call(buf, encodeByte).join('');
}

function escapeRequestWithBuffer(value){
	if(Buffer.isBuffer(value)){
	return encodeBuffer(value)
	} else {
	return querystring.escape(value)
	}
}

//Alternative to querystring.escape which does not support Buffers
exports.stringify = function(obj){
  var request = ""
  var keys = Object.keys(obj)
  if (keys.length <= 0)
    return request
  Object.keys(obj).forEach(function(element,index,array){
    var value = obj[element]
    request+=element+'='+escapeRequestWithBuffer(value)+"&"
  })
  return request.slice(0,-1)
}
