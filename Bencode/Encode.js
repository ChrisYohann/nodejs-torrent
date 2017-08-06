/**
 * Created by chris on 16/03/16.
 */

var Dict = require("./BencodeDict");
var fs = require("fs");
var crypto = require('crypto');
var hash = crypto.createHash('sha1');
let logger = require("../log")

/**
 *
 * @param data Data that's need to be Bencoded
 * @param encoding The specified Encoding, for instance UTF-8
 * @param output can be a path, or a Writable Stream
 * @constructor
 */

function Encode(data,encoding,output){
    Encode.position = 0;
    Encode.data = data;
    Encode.encoding = encoding || "utf8";

    if(typeof output == 'string'){
      Encode.wstream = fs.createWriteStream(output, {
        defaultEncoding: 'utf8',
        fd: null,
        mode: 0o666,
        autoClose: true
      })
    } else {
      Encode.wstream = output
    }

    Encode.encode_dictionary(Encode.data);
    Encode.wstream.end(function (){
      if(output != "undefined"){
        logger.info(Encode.wstream.bytesWritten+" bytes written at "+Encode.wstream.path);
      }
    })
}

Encode.encode_dictionary = function(data){
  Encode.wstream.write("d");
  var keySet = data.getContent();
  keySet.sort();
  keySet.forEach(function(element,index,array){
    //console.log(element+" "+typeof data[element])
    Encode.encode_string(element);
    if(Buffer.isBuffer(data[element]) || typeof data[element] === 'string' ){
      Encode.encode_string(data[element])

    } else if (Array.isArray(data[element])){
      Encode.encode_list(data[element])

    } else if(typeof data[element] === "number"){
      Encode.wstream.write("i"+data[element].toString()+"e")

    } else {
      Encode.encode_dictionary(data[element])
    }

  });
  Encode.wstream.write("e")

};

Encode.encode_list = function(data){
  Encode.wstream.write("l");
  data.forEach(function(element,index,array){
    if (Array.isArray(element)){
        Encode.encode_list(element)
    } else if(typeof element === "number"){
      Encode.wstream.write("i"+element.toString()+"e")
    } else if(Buffer.isBuffer(element) || typeof element === 'string'){
      Encode.encode_string(element)
    } else {
      Encode.encode_dictionary(element)
    }
  });
  Encode.wstream.write("e")
};

Encode.encode_string = function(data){
  Encode.wstream.write(data.length.toString());
  Encode.wstream.write(":");
  Encode.wstream.write(data)
};



module.exports = Encode;
