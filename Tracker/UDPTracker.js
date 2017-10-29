const dgram = require('dgram');
const Utils = require("../Utils");
const crypto = require("crypto");
let logger = require("../log");

const compact2string = require("compact2string");
const Tracker = require("./Tracker");
const util = require('util');
const Decode = require("../Bencode/Decode");
const url = require("url");

const DEFAULT_CONNECTION_ID = 0x41727101980;
const CONNECT_ACTION = 0;
const ANNOUNCE_ACTION = 1;
const SCRAPE_ACTION = 2;
const ERROR_ACTION = 3;

const UDPTracker = module.exports = function UDPTracker(clientTorrent, announceURL) {
    Tracker.call(this, clientTorrent, announceURL);
    this.transactionID = crypto.randomBytes(4);
    this.connectionID = undefined;

    const urlObject = url.parse(announceURL);
    this.trackerAddress = (urlObject.hostname == "0.0.0.0" ? "127.0.0.1" : urlObject.hostname);
    this.trackerPort = urlObject.port;
    logger.verbose(`Tracker Infos : ${this.trackerAddress}:${this.trackerPort}`);

    const server = dgram.createSocket("udp4");
    const self = this;

    server.on('message', function (message, remote) {
        callbackTrackerResponseUDP.call(self, message, remote)
    });

    server.on('listening', () => {
        const address = server.address();
        logger.verbose(`Server listening ${address.address}:${address.port}`);
        self.makeUDPConnectRequest();
    });

    this.server = server;
    server.bind()
};

util.inherits(UDPTracker, Tracker);

UDPTracker.prototype.announce = function(){
    logger.info(`Connecting to ${self.announceURL}`);
    let connectMessage = Buffer.alloc(12);
    const connectionIDBuffer = Buffer.from(Utils.decimalToHexString(DEFAULT_CONNECTION_ID), "hex");
    connectionIDBuffer.copy(connectMessage, 0+8-connectionIDBuffer.length);
  connectMessage.writeInt32BE(CONNECT_ACTION, 8);
  connectMessage = Buffer.concat([connectMessage, this.transactionID]);
  logger.debug(connectMessage);
  if(this.trackerAddress && this.trackerPort){
    this.server.send(connectMessage, 0, 16, this.trackerPort, this.trackerAddress, function(error){
      if(error)
      logger.error(error)
    })
  } else {
    logger.warn("Unable to parse Tracker IP and Address")
  }
};

UDPTracker.prototype.makeUDPAnnounceRequest = function(torrentEvent){
 /*  Offset  Size    Name    Value
0       64-bit integer  connection_id
8       32-bit integer  action          1 // announce
12      32-bit integer  transaction_id
16      20-byte string  info_hash
36      20-byte string  peer_id
56      64-bit integer  downloaded
64      64-bit integer  left
72      64-bit integer  uploaded
80      32-bit integer  event           0 // 0: none; 1: completed; 2: started; 3: stopped
84      32-bit integer  IP address      0 // default
88      32-bit integer  key
92      32-bit integer  num_want        -1 // default
96      16-bit integer  port
98*/
    const requestMessage = Buffer.alloc(98);
    logger.debug("Connection ID : "+this.connectionID);
    const connectionIDBuffer = Buffer.from(Utils.decimalToHexString(DEFAULT_CONNECTION_ID), "hex");
    connectionIDBuffer.copy(requestMessage, 0 + 8 - connectionIDBuffer.length);
    requestMessage.writeInt32BE(ANNOUNCE_ACTION, 8);
    requestMessage.writeInt32BE(this.transactionID.readInt32BE(0), 12);

    const info_hash = Utils.createInfoHash(this.client["_metaData"]["info"]);
    requestMessage.write(Utils.encodeBuffer(info_hash), 16, 20);

    requestMessage.write("CLI Torrent Client", 36, 20);
    const amountDownloadedBuffer = Buffer.from(Utils.decimalToHexString(this.client.getDownloaded()), "hex");
    amountDownloadedBuffer.copy(requestMessage, 56 + 8 - amountDownloadedBuffer.length);
    const amountLeftBuffer = Buffer.from(Utils.decimalToHexString(this.client.getLeft()), "hex");
    amountLeftBuffer.copy(requestMessage, 64 + 8 - amountLeftBuffer.length);
    const amountUploadedBuffer = Buffer.from(Utils.decimalToHexString(this.client.getUploaded()), "hex");
    amountUploadedBuffer.copy(requestMessage, 72 + 8 - amountUploadedBuffer.length);
    requestMessage.writeInt32BE(torrentEvent, 80);
    requestMessage.writeUInt32BE(0, 84);
    requestMessage.writeInt32BE(123456, 88);
    requestMessage.writeInt32BE(-1, 92);
    requestMessage.writeInt16BE(6970, 96);

    logger.debug(requestMessage);

    if(this.trackerAddress && this.trackerPort){
      this.server.send(requestMessage, 0, 98, this.trackerPort, this.trackerAddress, function(error){
        if(error)
        logger.error(error)
      })
    } else {
      logger.warn("Unable to parse Tracker IP and Address")
    }
};

UDPTracker.prototype.onConnectResponse = function(message){
  if(message.length < 16){
      logger.error("Error : Connect Message should be 16 bytes length");
    throw "Error : Connect Message should be 16 bytes length"
  }

    const transactionID = message.readInt32BE(4);
    if(transactionID != this.transactionID.readInt32BE(4)){
      logger.error("Error : TransactionID does not match the one sent by the client");
    throw "Error : TransactionID does not match the one sent by the client"
  }

 this.connectionID = message.readIntBE(8, 8);
 logger.debug("Connection ID : "+this.connectionID);
 this.makeUDPAnnounceRequest();
};

UDPTracker.prototype.onAnnounceResponse = function(message){
  /* Offset      Size            Name            Value
0           32-bit integer  action          1 // announce
4           32-bit integer  transaction_id
8           32-bit integer  interval
12          32-bit integer  leechers
16          32-bit integer  seeders
20 + 6 * n  32-bit integer  IP address
24 + 6 * n  16-bit integer  TCP port
20 + 6 * N */
  if(message.length < 20){
    throw "Error : Request Message should be 20 bytes length"
  }

    const transactionID = message.readInt32BE(4);
    if(transactionID != this.transactionID.readInt32BE(0)){
      logger.error("Error : TransactionID does not match the one sent by the client");
    throw "Error : TransactionID does not match the one sent by the client"
  }

  this.intervalInSeconds = message.readInt32BE(8);
    const leechers = message.readInt32BE(12);
    const seeders = message.readInt32BE(16);
    logger.info(`Seeders : ${seeders} Leechers : ${leechers}`);

    const peersPart = message.slice(20);
    const peerList = compact2string.multi(peersPart);
    logger.verbose("peers : "+peerList);
    this.emit("peers", peerList)
};

var callbackTrackerResponseUDP = function(message, remote){
  logger.debug("Message received from : "+remote.address + ':' + remote.port);
  logger.debug(message);
  if(message.length < 4){
    logger.debug("Tracker Response is less than 4 bytes. Aborting.");
    return ;
  }

    const action = message.readInt32BE(0);
    logger.verbose("Action : "+action);
  switch(action){
    case CONNECT_ACTION :
      this.onConnectResponse(message) ;
      break ;
    case ANNOUNCE_ACTION :
      this.onAnnounceResponse(message);
      break ;
    case SCRAPE_ACTION :
      break ;
    case ERROR_ACTION :
      logger.error(`ERROR : ${message}`);
      break ;
    default :
      break ;
  }
};
