const MIN_HANDSHAKE_LENGTH = 48;
const MAX_HANDHSAKE_LENGTH = 68;
const INFO_HASH_LENGTH = 20;
const PEER_ID_LENGTH = 20;
const PROTOCOL_LENGTH = 19;
const PROTOCOL_NAME = "BitTorrent protocol"
const logger = require("../log.js");
const Promise = require('rsvp').Promise;

let HandshakeParser = module.exports = function HandshakeParser(){
  this.protocolLength = Buffer([PROTOCOL_LENGTH]);
  this.protocolName = Buffer.from(PROTOCOL_NAME, "utf8");
  this.reservedBytes = Buffer.alloc(8);
};

HandshakeParser.prototype.parse = function(chunk){
  let self = this;
  const handshakeLength = chunk.length;
  const ensureHandshakeLength = function(chunk){
    return new Promise(function(resolve, reject){
      if(handshakeLength != MIN_HANDSHAKE_LENGTH || handshakeLength != MAX_HANDHSAKE_LENGTH){
        resolve(chunk);
      } else {
        const message = `Invalid Handshake length (${chunk.length})`;
        logger.error(message);
        reject(message);
      }
    });
  }
  const ensureRightProtocol = function(chunk){
    const protocolLength = chunk[0];
    const protocol = chunk.slice(1, self.protocolLength+1);
    return new Promise(function(resolve, reject){
      if(protocolLength == self.protocolLength && protocol == self.protocolName){
        resolve(chunk);
      } else {
        let message = `Invalid Protocol Length (${protocolLength}) and Protocol Name ${protocol}`;
        logger.warn("Handshake Parser :"+message);
        reject(message);
      }
    });
  }
  const getInfoHash = function(chunk){
    const infoHash = chunk.slice(28, 28+INFO_HASH_LENGTH);
    return new Promise(function(){
      Promise.resolve(chunk, infoHash);
    });
  }
  const getPeerId = function(chunk, infoHash){
    return new Promise(function(resolve, reject){
      if (handshakeLength == MIN_HANDSHAKE_LENGTH){
        resolve({infoHash : infoHash});
      } else if (handshakeLength == MAX_HANDHSAKE_LENGTH){
        const peerId = chunk.slice(48);
        resolve({"infoHash" : infoHash, "peerId" : peerId});
      }
    });
  }

  return ensureHandshakeLength
  .then(ensureRightProtocol)
  .then(getInfoHash)
  .then(getPeerId)
  .catch(function(err){
    if (err) Promise.reject(err);

  });
};

HandshakeParser.prototype.create = function(infoHash, peerId){
  let self = this;
  return Buffer.concat([protocolLength, protocolName, reservedBytes, infoHash, peerId], MAX_HANDHSAKE_LENGTH);
}
