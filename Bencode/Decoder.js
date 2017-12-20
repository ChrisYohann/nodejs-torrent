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
*@param encoding : specify metafile encoding. ex : "UTF-8"
*/
let Decoder = function Decoder(encoding){
    this.position = 0;
    this.encoding = encoding || "utf8";
    this.data = undefined
};

Decoder.prototype.decode = function(data){
  try{
    let self = this;
    self.position = 0;
    self.data = (function(){
      if(Buffer.isBuffer(data)){
        return data;
      } else {
        return fs.readFileSync(data);
      }
    })();
    let string_length = "";
    let bencodedToken = undefined;
    while(self.position < self.data.length){
      const character = self.data[self.position];
      self.position++;
      if (numberisInteger(String.fromCharCode(character))) {
        string_length += String.fromCharCode(character)
      } else {
        switch (character) {
          case 0x64:
            bencodedToken = self.decode_dictionary();
            return checkIfStreamIsFinished.call(self, bencodedToken);
            break;
          case 0x6c:
            bencodedToken = self.decode_list();
            return checkIfStreamIsFinished.call(self, bencodedToken);
            break;
          case 0x69:
            bencodedToken = self.decode_integer();
            return checkIfStreamIsFinished.call(self, bencodedToken);
            break;
          case 0x3a:
            bencodedToken = self.decode_string(string_length);
            return checkIfStreamIsFinished.call(self, bencodedToken);
            break;
          default:
            console.log("Character" + character);
            let message = `Invalid Bencode Token ${String.fromCharCode(character)} at position ${self.position}`;
            logger.error(message);
            throw message ;
        }
      }
    }
  } catch (err) {
      logger.error(`Invalid Bencoded Format ${err}`);
      throw err;
  }
};

Decoder.prototype.decode_dictionary = function(){
  let self = this;
  let bdictionary = new Dict();
  let result = [];
  let string_length = "";
  while(self.position < self.data.length){
    const character = self.data[self.position];
    self.position++;
    if (numberisInteger(String.fromCharCode(character))){
      string_length += String.fromCharCode(character)
    } else {
      switch (character) {
        case 0x64:
          result.push(self.decode_dictionary());
          break;
        case 0x6c:
          result.push(self.decode_list());
          break;
        case 0x69:
          result.push(self.decode_integer());
          break;
        case 0x3a:
          result.push(self.decode_string(string_length));
          string_length="";
          break;
        case 0x65:
          for (i = 0; i < result.length ; i=i+2) {
            bdictionary.putContent(result[i].toString(), result[i + 1])
          }
          return bdictionary;
      }
    }
  }
  let message = `Invalid Bencoded Dictionary. Character 'e' has not been reached before the end of the data`;
  logger.error(message);
  throw message;

};

Decoder.prototype.decode_list = function(){
  let self = this;
  const result = [];
  let string_length = "";
  while(self.position < self.data.length) {
    const character = self.data[self.position];
    self.position++;
    if (numberisInteger(String.fromCharCode(character))){
      string_length += String.fromCharCode(character)
    } else {
      switch (character) {
        case 0x64:
          result.push(self.decode_dictionary());
          break;
        case 0x6c:
          result.push(self.decode_list());
          break;
        case 0x69:
          result.push(self.decode_integer());
          break;
        case 0x3a:
          result.push(self.decode_string(string_length));
          break;
        case 0x65:
          return result;
      }
    }
  }
  let message = `Invalid Bencoded List. Character 'e' has not been reached before the end of the data.`;
  logger.error(message);
  throw message;
};

Decoder.prototype.decode_string = function(string_length){
  let self = this;
  const string_length_toInt = parseInt(string_length);
  logger.debug("String length : "+string_length_toInt);
  const string_asbytes = self.data.slice(self.position, self.position + string_length_toInt);
  if (string_asbytes.length == string_length_toInt){
    self.position += string_length_toInt;
    return string_asbytes;
  } else {
    message = `Invalid Bencoded String. Expected String length (${string_length_toInt}) and actual length (${string_asbytes.length}) do not match.`
    logger.error(message);
    throw message ;
  }
};

Decoder.prototype.decode_integer = function(){
  let self = this;
  let number = "";
  while(self.position < self.data.length){
    const digit = self.data[self.position];
    self.position++;
    if(numberisInteger(String.fromCharCode(digit))){
      number += String.fromCharCode(digit)
    } else if(digit == 0x65){
        return parseInt(number,10)
    } else{
        let message = `Invalid Bencoded Integer.
        Character 'e' is not the first non digit character reached.
        ("${String.fromCharCode(digit)}" instead).`;
        logger.error(message);
        throw message;
    }
  }
  let message = `Invalid Bencoded Integer. Character 'e' has not been reached before the end of the data.`
  logger.error(message);
  throw message;
};


let numberisInteger = function(str){
    const number = parseInt(str, 10);
    return !isNaN(number)
};

let checkIfStreamIsFinished = function(result){
  let self = this;
  if (self.position < self.data.length){
    let message = `Invalid Bencode Token. Parser is at position ${self.position} but EOF is at position ${self.data.length}`;
    logger.error(message)
    throw message;
  } else {
    return result;
  }
};

module.exports = Decoder;
