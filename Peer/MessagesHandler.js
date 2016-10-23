var Messages = require("./TorrentMessages")
var KeepAlive = Messages.KeepAlive
var Choke = Messages.Choke
var Unchoke = Messages.Unchoke
var Interested = Messages.Interested
var NotInterested = Messages.NotInterested
var Have = Messages.Have
var Bitfield = Messages.Bitfield
var Request = Messages.Request
var Piece = Messages.Piece
var Cancel = Messages.Cancel

const MESSAGE_ID_MAX = 9
const MESSAGE_ID_MIN = 0
const MESSAGE_MAX_LENGTH = (1<<14) + 13
const MESSAGE_MIN_LENGTH = 0

var MessagesHandler = module.exports = function MessagesHandler(){

}

MessagesHandler.prototype.parseTorrentMessage = function(buffer){
  var offset = 0
  var lengthPrefix = -1
  try{
    lengthPrefix = buffer.readInt32BE(offset)
    offset+=4
    console.log(" Length : "+lengthPrefix)
      if(lengthPrefix < MESSAGE_MIN_LENGTH || lengthPrefix > MESSAGE_MAX_LENGTH){
        console.log("Error : Invalid length message for Decoding ("+lengthPrefix+")")
        return null ;
      }
  } catch(e){
    console.error("Range Error", e.message)
  }

  if(lengthPrefix == 0){
    return new KeepAlive();
  }

  var messageID = buffer[offset]
  offset+=1
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
              var pieceIndex = buffer.readInt32BE(offset)
              offset+=4
              console.log("Have : Index = " + pieceIndex);
              return new Have(pieceIndex)
      case 5 :
             var bitfieldBuffer = buffer.slice(offset)
             offset+= bitfieldBuffer.length
             return new Bitfield(bitfieldBuffer)
      case 6 :
             var index = buffer.readInt32BE(offset)
             var begin = buffer.readInt32BE(offset+4)
             var length = buffer.readInt32BE(offset+8)
             offset+=12
             console.log("Request : Index = " + index + " Begin : " + begin + " Length : " + length)
             return new Request(index, begin, length)
      case 7 :
             var index = buffer.readInt32BE(offset)
             var begin = buffer.readInt32BE(offset+4)
             var block = buffer.slice(offset+8)
             offset+= 8+block.length
             console.log("Request : Index = " + index + " Begin : " + begin + " Length : " + lengthPrefix-9)
             return new Piece(index, begin, block)
     case 8 :
             var index = buffer.readInt32BE(offset)
             var begin = buffer.readInt32BE(offset+4)
             var length = buffer.readInt32BE(offset+8)
             offset+=12
             console.log("Cancel : Index = " + index + " Begin : " + begin + " Length : " + length)
             return new Cancel(index, begin, length)
      default :
             console.log("Message ID ("+messageID+") cannot be parsed")
             return null ;
    }
  } catch(e){
    console.error("Range Error", e.message)
  }


}
