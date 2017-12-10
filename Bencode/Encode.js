/**
 * Created by chris on 16/03/16.
 */
const Dict = require("./BencodeDict");
const fs = require("fs");
const crypto = require('crypto');
const hash = crypto.createHash('sha1');
let logger = require("../log");


/**
 *
 * @param data Data that's need to be Bencoded
 * @param encoding The specified Encoding, for instance UTF-8
 * @param output can be a path, or a Writable Stream
 * @constructor
 */

let Encode = module.exports = function (data,encoding,output){
    let self = this;
    this.position = 0;
    this.data = data;
    this.encoding = encoding || "utf8";

    if(typeof output == 'string'){
      this.wstream = fs.createWriteStream(output, {
        defaultEncoding: 'utf8',
        fd: null,
        mode: 0o666,
        autoClose: true
      })
    } else {
      this.wstream = output
    }
    this.encode_dictionary(this.data);
    this.wstream.end(function (){
      if(typeof output == 'string'){
        logger.info(self.wstream.bytesWritten+" bytes written at "+self.wstream.path);
      }
    })

};

Encode.prototype.encode_dictionary = function(data){
  this.wstream.write("d");
    const keySet = data.getContent();
    keySet.sort();
  keySet.forEach(function(element,index,array){
    this.encode_string(element);
    if(Buffer.isBuffer(data[element]) || typeof data[element] === 'string' ){
      this.encode_string(data[element])

    } else if (Array.isArray(data[element])){
      this.encode_list(data[element])

    } else if(typeof data[element] === "number"){
      this.wstream.write("i"+data[element].toString()+"e")

    } else {
      this.encode_dictionary(data[element])
    }

  }, this);
  this.wstream.write("e")

};

Encode.prototype.encode_list = function(data){
  this.wstream.write("l");
  data.forEach(function(element,index,array){
    if (Array.isArray(element)){
        this.encode_list(element)
    } else if(typeof element === "number"){
      this.wstream.write("i"+element.toString()+"e")
    } else if(Buffer.isBuffer(element) || typeof element === 'string'){
      this.encode_string(element);
    } else {
      this.encode_dictionary(element);
    }
  }, this);
  this.wstream.write("e")
};

Encode.prototype.encode_string = function(data){
  this.wstream.write(data.length.toString());
  this.wstream.write(":");
  this.wstream.write(data);
};