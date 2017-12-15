/**
 * Created by chris on 13/03/16.
 */


let logger = require("../log");
const Dict = require("./BencodeDict");
const fs = require("fs");

//UTF-8 to Hex characters
/* d : 0x64
   l : 0x6c
   i : 0x69
   e : 0x65
 */

/**
*@param data : can be a Buffer, or a string representing a filepath
*@param encoding : specify metafile encoding. ex : "UTF-8"
*@return a Dictionary
*/
function Decode(data,encoding){
    Decode.position = 1;
    Decode.encoding = encoding || "utf8";
    if(Buffer.isBuffer(data)){
        Decode.data = data
    } else {
      Decode.data = fs.readFileSync(data)
      }

    return Decode.decode_dictionary(data)
}

Decode.data = null;
Decode.encoding = null;
Decode.dictionary = null;

Decode.decode_dictionary = function(){
    const bdictionary = new Dict();
    const result = [];
    let string_length = "";
    while(Decode.position < Decode.data.length) {

      const character = Decode.data[Decode.position];
      Decode.position++;

    if (Decode.numberisInteger(String.fromCharCode(character))) {
      string_length += String.fromCharCode(character)
    } else {
      switch (character) {
        case 0x64:
          result.push(Decode.decode_dictionary());
          break;
        case 0x6c:
          result.push(Decode.decode_list());
          break;
        case 0x69:
          result.push(Decode.decode_integer());
          break;
        case 0x3a:
          result.push(Decode.decode_string(string_length));
          string_length="";
          break;
        case 0x65:
          for (i = 0; i < result.length ; i=i+2) {
            bdictionary.putContent(result[i].toString(), result[i + 1])
          }
          return bdictionary
      }
    }
  }
  return bdictionary

};

Decode.decode_list = function(){
    const result = [];
    let string_length = "";
    while(Decode.position < Decode.data.length) {

      const character = Decode.data[Decode.position];
      Decode.position++;

    if (Decode.numberisInteger(String.fromCharCode(character))) {
      string_length += String.fromCharCode(character)
    } else {
      switch (character) {
        case 0x64:
          result.push(Decode.decode_dictionary());
          break;
        case 0x6c:
          result.push(Decode.decode_list());
          break;
        case 0x69:
          result.push(Decode.decode_integer());
          break;
        case 0x3a:
          result.push(Decode.decode_string(string_length));
          break;
        case 0x65:
          return result
      }
    }


  }
  return result


};


Decode.decode_string = function(string_length){
  logger.debug("String length : "+parseInt(string_length));
    const string_length_toInt = parseInt(string_length);
    const string_asbytes = Decode.data.slice(Decode.position, Decode.position + string_length_toInt);
    Decode.position += string_length_toInt;
  return string_asbytes
};

Decode.decode_integer = function(){

    let number = "";

    while (Decode.position < Decode.data.length){
        const digit = Decode.data[Decode.position];
        Decode.position++;
      if(Decode.numberisInteger(String.fromCharCode(digit))){
        number += String.fromCharCode(digit)
      } else{
          return parseInt(number,10)
      }


    }
};


Decode.numberisInteger = function(str){
    const number = parseInt(str, 10);
    return !isNaN(number)
};


module.exports = Decode;
