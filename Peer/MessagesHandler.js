let logger = require("../log");
const Messages = require("./TorrentMessages");
const KeepAlive = Messages.KeepAlive;
const Choke = Messages.Choke;
const Unchoke = Messages.Unchoke;
const Interested = Messages.Interested;
const NotInterested = Messages.NotInterested;
const Have = Messages.Have;
const Bitfield = Messages.Bitfield;
const Request = Messages.Request;
const Piece = Messages.Piece;
const Cancel = Messages.Cancel;

const MESSAGE_ID_MAX = 9;
const MESSAGE_ID_MIN = 0;
const MESSAGE_MAX_LENGTH = (1<<14) + 13;
const MESSAGE_MIN_LENGTH = 0;

const MessagesHandler = module.exports = function MessagesHandler() {

};

MessagesHandler.prototype.parseTorrentMessage = function(buffer){
    let offset = 0;
    let lengthPrefix = -1;
    try{
    lengthPrefix = buffer.readInt32BE(offset);
    offset+=4;
    logger.verbose(" Length : "+lengthPrefix);
      if(lengthPrefix < MESSAGE_MIN_LENGTH || lengthPrefix > MESSAGE_MAX_LENGTH){
        logger.error("Error : Invalid length message for Decoding ("+lengthPrefix+")");
        return null ;
      }
  } catch(e){
    logger.error("Range Error", e.message)
  }

  if(lengthPrefix == 0){
    return new KeepAlive();
  }

    const messageID = buffer[offset];
    offset+=1;
  try{
    switch(messageID){
      case 0 :
              return new Choke();
      case 1 :
              return new Unchoke();
      case 2 :
              return new Interested();
      case 3 :
              return new NotInterested();
      case 4 :
          const pieceIndex = buffer.readInt32BE(offset);
          offset+=4;
              logger.verbose("Have : Index = " + pieceIndex);
              return new Have(pieceIndex);
      case 5 :
          const bitfieldBuffer = buffer.slice(offset);
          offset+= bitfieldBuffer.length;
             return new Bitfield(bitfieldBuffer);
      case 6 :
             var index = buffer.readInt32BE(offset);
             var begin = buffer.readInt32BE(offset+4);
             var length = buffer.readInt32BE(offset+8);
             offset+=12;
             logger.verbose("Request : Index = " + index + " Begin : " + begin + " Length : " + length);
             return new Request(index, begin, length);
      case 7 :
             var index = buffer.readInt32BE(offset);
             var begin = buffer.readInt32BE(offset+4);
          const block = buffer.slice(offset + 8);
          offset+= 8+block.length;
             logger.verbose("Request : Index = " + index + " Begin : " + begin + " Length : " + lengthPrefix-9);
             return new Piece(index, begin, block);
     case 8 :
             var index = buffer.readInt32BE(offset);
             var begin = buffer.readInt32BE(offset+4);
             var length = buffer.readInt32BE(offset+8);
             offset+=12;
             logger.verbose("Cancel : Index = " + index + " Begin : " + begin + " Length : " + length);
             return new Cancel(index, begin, length);
      default :
             logger.verbose("Message ID ("+messageID+") cannot be parsed");
             return null ;
    }
  } catch(e){
    logger.error("Range Error", e.message)
  }


};
