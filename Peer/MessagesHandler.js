const util = require('util');
const EventEmitter = require('events').EventEmitter;

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

const AWAIT_PEER_ID = 0;
const DECODING_LENGTH_PREFIX = 1;
const DECODING_BYTE_ID = 2;
const DECODING_PAYLOAD = 3;

const MessagesHandler = module.exports = function MessagesHandler(waitingForPeerId){
  EventEmitter.call(this);
  this.offset = 0;

  this.partialStatus = (typeof awaitPeerId === "undefined") ? DECODING_LENGTH_PREFIX : AWAIT_PEER_ID;
  this.clear(false);
};

util.inherits(MessagesHandler, EventEmitter);

MessagesHandler.prototype.parseTorrentMessages = function(chunk){
  let self = this;
  let result = [];
  self.offset = 0;
  logger.verbose("Incoming Chunk. Length : "+chunk.length+" Offset : "+self.offset);
  while(self.offset < chunk.length){
    const message = self.parseMessage(chunk, true);
    if(message) result.push(message);
  }
  return result;
};

MessagesHandler.prototype.parseMessage = function(chunk, isPartial){
  let self = this;
  self.offset = (typeof isPartial === "undefined") ? 0 : self.offset;
  const status = self.partialStatus;
  logger.verbose("Status : "+status);
  try{
    switch(status){
      case AWAIT_PEER_ID:
        decodePeerID.call(self, chunk);
      case DECODING_LENGTH_PREFIX:
        const lengthPrefix = decodeLengthPrefix.call(self, chunk);
        logger.verbose("Length : "+lengthPrefix);
          if(lengthPrefix < MESSAGE_MIN_LENGTH || lengthPrefix > MESSAGE_MAX_LENGTH){
            logger.error("Error : Invalid length message for Decoding ("+lengthPrefix+")");
            self.clear();
            return null ;
          }
          if(lengthPrefix == 0){
            self.clear();
            return new KeepAlive();
          }
      case DECODING_BYTE_ID:
        const messageID = decodeMessageID.call(self, chunk);
        logger.verbose("Message ID : "+messageID);
      case DECODING_PAYLOAD:
          switch(self.partialMessageID){
            case 0 :
                    self.clear();
                    return new Choke();
            case 1 :
                    self.clear();
                    return new Unchoke();
            case 2 :
                    self.clear();
                    return new Interested();
            case 3 :
                    self.clear();
                    return new NotInterested();
            default:
                    const payload = decodePayload.call(self, chunk);
                    const message = parsePayload(self.partialMessageID, payload);
                    self.clear();
                    return message;
          }
      default:
          self.clear();
          return null;
    }
  } catch(e){
    return null;
  }
};

MessagesHandler.prototype.clear = function(resetStatus){
  let self = this;
  resetStatus = (typeof resetStatus === "undefined") ? true : resetStatus;
  self.partialStatus = resetStatus ? DECODING_LENGTH_PREFIX : self.partialStatus;
  self.partialMessageID = resetStatus ? -1 : self.partialMessageID;
  self.partialLengthPrefix = Buffer.alloc(0);
  self.partialPayload = Buffer.alloc(0);
};

let parsePayload = function(messageID, buffer){
  logger.verbose("Parsing Payload");
  let offset = 0;
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
          logger.verbose("Have : Index = " + pieceIndex);
          return new Have(pieceIndex);
      case 5 :
          const bitfieldBuffer = buffer.slice(offset);
          return new Bitfield(bitfieldBuffer);
      case 6 :
          let indexRequest = buffer.readInt32BE(offset);
          let beginRequest = buffer.readInt32BE(offset+4);
          let lengthRequest = buffer.readInt32BE(offset+8);
          logger.verbose("Request : Index = " + indexRequest + " Begin : " + beginRequest + " Length : " + lengthRequest);
          return new Request(indexRequest, beginRequest, lengthRequest);
      case 7 :
          let indexPiece = buffer.readInt32BE(offset);
          let beginPiece = buffer.readInt32BE(offset+4);
          let block = buffer.slice(offset+8);
          logger.verbose("Piece : Index = " + indexPiece + " Begin : " + beginPiece + " Length : " + buffer.length-8);
          return new Piece(indexPiece, beginPiece, block);
     case 8 :
          let indexCancel = buffer.readInt32BE(offset);
          let beginCancel = buffer.readInt32BE(offset+4);
          let lengthCancel = buffer.readInt32BE(offset+8);
          logger.verbose("Cancel : Index = " + indexCancel + " Begin : " + beginCancel + " Length : " + lengthCancel);
          return new Cancel(indexCancel, beginCancel, lengthCancel);
      default :
          logger.verbose("Message ID ("+messageID+") cannot be parsed");
          return null ;
    }
};

let decodePeerID = function(chunk){
  let self = this;
  if(self.offset < chunk.length){
    const remainingBytes = 20 - self.partialPeerID.length;
    const otherPart = chunk.slice(self.offset, remainingBytes);
    self.partialPeerID = Buffer.concat([self.partialPeerID, self.othePart]);
    self.offset += otherPart.length;
    if(self.partialPeerID.length == 20){
      self.partialStatus++ ;
      return self.partialPeerID;
    } else {
      let message = `Only ${self.partialPeerID.length} bytes for peerID. Waiting for next chunk.`
      logger.verbose(message);
      throw message;
    }
  } else {
    let message = `Only ${self.partialPeerID.length} bytes for peerID. Waiting for next chunk.`
    logger.verbose(message);
    throw message;
  }
};

let decodeLengthPrefix = function(chunk){
  logger.verbose("Decoding Length Prefix");
  let self = this;
  if(self.offset < chunk.length){
    const remainingBytes = 4 - self.partialLengthPrefix.length;
    const otherPart = chunk.slice(self.offset, self.offset+remainingBytes);
    self.partialLengthPrefix = Buffer.concat([self.partialLengthPrefix, otherPart]);
    self.offset += otherPart.length;
    if(self.partialLengthPrefix.length == 4){
        self.partialStatus = DECODING_BYTE_ID;
        return self.partialLengthPrefix.readInt32BE(0);
    } else {
      let message = `Only ${self.partialLengthPrefix.length} bytes for lengthPrefix. Waiting for next chunk.`;
      logger.verbose(message);
      throw message;
    }
  } else {
    let message = "Unsufficient Bytes remaining in the socket to determine Length Prefix. Waiting For next chunk."
    logger.verbose(message);
    throw message ;
  }
};

let decodeMessageID = function(chunk){
  let self = this;
  logger.verbose("Decoding Message ID");
  if(self.offset < chunk.length){
    const messageID = chunk[self.offset];
    self.partialMessageID = messageID ;
    self.offset += 1;
    self.partialStatus++ ;
    return messageID;
  } else {
    let message = "Unsufficient Bytes Remaining in the socket to determine messageID. Waiting For next chunk"
    logger.verbose(message);
    throw message ;
  }
};

let decodePayload = function(chunk){
  logger.verbose("Decoding Payload");
  let self = this;
  const payloadLength = self.partialLengthPrefix.readInt32BE(0) - 1;
  logger.verbose(`Chunk Length = ${chunk.length}, Offset = ${self.offset}, Expectedlength = ${payloadLength}`);
  if (self.offset < chunk.length){
    const remainingBytes = payloadLength - self.partialPayload.length;
    const otherPart = chunk.slice(self.offset, self.offset+remainingBytes);
    self.partialPayload = Buffer.concat([self.partialPayload, otherPart]);
    self.offset += otherPart.length;
    logger.verbose(`Partial Payload length = ${self.partialPayload.length}`);
    if(self.partialPayload.length == payloadLength){
      return self.partialPayload;
    } else {
      let message = "Unsufficient bytes to read in payload";
      logger.verbose(message);
      throw message;
    }
  } else {
    let message = "Unsufficient bytes to read in payload";
    logger.verbose(message);
    throw message;
  }
}
