const dgram = require('dgram');
const Utils = require("../Utils")
const crypto = require("crypto")

var compact2string = require("compact2string");
var Tracker = require("./Tracker")
var util = require('util')
var Decode = require("../Bencode/Decode")
var url = require("url")

var DEFAULT_CONNECTION_ID = 0x41727101980
var CONNECT_ACTION = 0
var ANNOUNCE_ACTION = 1
var SCRAPE_ACTION = 2
var ERROR_ACTION = 3

var udpAddressRegex = /^(udp:\/\/[\w.-]+):(\d{2,})[^\s]*$/g

var UDPTracker = module.exports = function UDPTracker(clientTorrent, announceURL){
  Tracker.call(this, clientTorrent, announceURL)
  this.transactionID = crypto.randomBytes(4)
  this.connectionID = undefined

  var urlObject = url.parse(announceURL)
  this.trackerAddress = (urlObject.hostname == "0.0.0.0" ? "127.0.0.1" : urlObject.hostname)
  this.trackerPort = urlObject.port
  console.log(`Tracker Infos : ${this.trackerAddress}:${this.trackerPort}`)

  var server = dgram.createSocket("udp4")
  var self = this

  server.on('message', function(message, remote){
    callbackTrackerResponseUDP.call(self, message, remote)
  })

  server.on('listening', () => {
    var address = server.address();
    console.log(`Server listening ${address.address}:${address.port}`);
    self.makeUDPConnectRequest();
  });

  this.server = server
  server.bind()
}

util.inherits(UDPTracker, Tracker)

UDPTracker.prototype.makeUDPConnectRequest = function(){
  var connectMessage = Buffer.alloc(12)
  connectMessage.writeIntBE(DEFAULT_CONNECTION_ID, 0, 8)
  connectMessage.writeInt32BE(CONNECT_ACTION, 8)
  connectMessage = Buffer.concat([connectMessage, this.transactionID])
  console.log(connectMessage)
  if(this.trackerAddress && this.trackerPort){
    this.server.send(connectMessage, 0, 16, this.trackerPort, this.trackerAddress, function(error){
      if(error)
      console.log(error)
    })
  } else {
    console.log("Unable to parse Tracker IP and Address")
  }
}

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
    var requestMessage = Buffer.alloc(98)
    //console.log("Connection ID : "+this.connectionID)
    requestMessage.writeIntBE(this.connectionID, 0, 8)
    requestMessage.writeInt32BE(ANNOUNCE_ACTION, 8)
    requestMessage.writeInt32BE(this.transactionID.readInt32BE(0), 12)

    var info_hash = Utils.createInfoHash(this.client["_metaData"]["info"])
    requestMessage.write(Utils.encodeBuffer(info_hash), 16, 20)

    requestMessage.write("CLI Torrent Client", 36, 20)
    requestMessage.writeIntBE(this.client.getDownloaded(), 56, 8)
    requestMessage.writeIntBE(0, 64, 8)
    requestMessage.writeIntBE(this.client.getUploaded(), 72, 8)
    requestMessage.writeInt32BE(torrentEvent, 80)
    requestMessage.writeUInt32BE(0, 84)
    requestMessage.writeInt32BE(123456, 88)
    requestMessage.writeInt32BE(-1, 92)
    requestMessage.writeInt16BE(6970, 96)

    //console.log(requestMessage)

    if(this.trackerAddress && this.trackerPort){
      this.server.send(requestMessage, 0, 98, this.trackerPort, this.trackerAddress, function(error){
        if(error)
        console.log(error)
      })
    } else {
      console.log("Unable to parse Tracker IP and Address")
    }
}

UDPTracker.prototype.onConnectResponse = function(message){
  if(message.length < 16){
    throw "Error : Connect Message should be 16 bytes length"
  }

  var transactionID = message.readInt32BE(4)
  if(transactionID != this.transactionID.readInt32BE(0)){
    throw "Error : TransactionID does not match the one sent by the client"
  }

 this.connectionID = message.readIntBE(8, 8)
 //console.log("Connection ID : "+this.connectionID)
 this.makeUDPAnnounceRequest();
}


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

  var transactionID = message.readInt32BE(4)
  if(transactionID != this.transactionID.readInt32BE(0)){
    throw "Error : TransactionID does not match the one sent by the client"
  }

  this.intervalInSeconds = message.readInt32BE(8)
  var leechers = message.readInt32BE(12)
  var seeders = message.readInt32BE(16)
  console.log(`Seeders : ${seeders} Leechers : ${leechers}`)

  var peersPart = message.slice(20)
  var peerList = compact2string.multi(peersPart)
  console.log("peers : "+peerList)
}

var callbackTrackerResponseUDP = function(message, remote){
  console.log("Message received from : "+remote.address + ':' + remote.port)
  //console.log(message)
  if(message.length < 4){
    console.log("Tracker Response is less than 4 bytes. Aborting.")
    return ;
  }

  var action = message.readInt32BE(0)
  console.log("Action : "+action)
  switch(action){
    case CONNECT_ACTION :
      this.onConnectResponse(message) ;
      break ;
    case ANNOUNCE_ACTION :
      this.onAnnounceResponse(message)
      break ;
    case SCRAPE_ACTION :
      break ;
    case ERROR_ACTION :
      console.log(`ERROR : ${message}`)
      break ;
    default :
      break ;
  }
}
