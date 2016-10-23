var util = require('util')

var TorrentMessage = module.exports = function TorrentMessage(){
  this.index = 0
  this.begin = 0
  this.length = 0

  this.lengthPrefix = 0
  this.messageID = null
  this.payload = null
}

TorrentMessage.prototype.send = function(){
  var buffer = Buffer.alloc(5)
  buffer.writeInt32BE(this.lengthPrefix, 0)
  if(this.messageID != null)
    buffer[4] = this.messageID
  if(this.payload != null)
    buffer = Buffer.concat([buffer, this.payload])
  return buffer
}

var KeepAlive = module.exports.KeepAlive = function KeepAlive(){
  TorrentMessage.apply(this)
  util.inherits(KeepAlive, TorrentMessage)
}

var Choke = module.exports.Choke = function Choke(){
  TorrentMessage.apply(this)
  this.lengthPrefix = 1
  this.messageID = 0
  util.inherits(Choke, TorrentMessage)
}

var Unchoke = module.exports.Unchoke = function Unchoke(){
  TorrentMessage.apply(this)
  this.lengthPrefix = 1
  this.messageID = 1
  util.inherits(Unchoke, TorrentMessage)
}

var Interested = module.exports.Interested = function Interested(){
  TorrentMessage.apply(this)
  this.lengthPrefix = 1
  this.messageID = 2
  util.inherits(Interested, TorrentMessage)
}

var NotInterested = module.exports.NotInterested = function NotInterested(){
  TorrentMessage.apply(this)
  this.lengthPrefix = 1
  this.messageID =
  util.inherits(NotInterested, TorrentMessage)
}

var Have = module.exports.Have = function Have(pieceIndex){
  TorrentMessage.apply(this)
  this.lengthPrefix = 5
  this.messageID = 4
  this.index = pieceIndex
  var payload = Buffer.alloc(4)
  payload.writeInt32BE(pieceIndex, 0)
  this.payload = payload
  util.inherits(Have, TorrentMessage)
}

var Bitfield = module.exports.Bitfield = function Bitfield(bitfieldBuffer){
  TorrentMessage.apply(this)
  this.lengthPrefix = 1+bitfieldBuffer.length
  this.messageID = 5
  this.payload = bitfieldBuffer
  util.inherits(Bitfield, TorrentMessage)
}

var Request = module.exports.Request = function Request(index, begin, length){
  TorrentMessage.apply(this)
  this.lengthPrefix = 13
  this.messageID = 6
  this.index = index
  this.begin = begin
  this.length = length
  var payload = Buffer.alloc(12)
  payload.writeInt32BE(index, 0)
  payload.writeInt32BE(begin, 4)
  payload.writeInt32BE(length, 8)
  this.payload = payload
  util.inherits(Request, TorrentMessage)
}

var Piece = module.exports.Piece = function Piece(index, begin, block){
  TorrentMessage.apply(this)
  this.lengthPrefix = 9+block.length
  this.messageID = 7
  this.index = index
  this.begin = begin
  this.length = block.length
  var firstPartPayload = Buffer.alloc(8)
  firstPartPayload.writeInt32BE(index, 0)
  firstPartPayload.writeInt32BE(begin, 4)
  this.payload = Buffer.concat([firstPartPayload, block])
  util.inherits(Piece, TorrentMessage)
}

var Cancel = module.exports.Cancel = function Cancel(index, begin, length){
  TorrentMessage.apply(this)
  this.lengthPrefix = 13
  this.messageID = 8
  this.index = index
  this.begin = begin
  this.length = length
  var payload = Buffer.alloc(12)
  payload.writeInt32BE(index, 0)
  payload.writeInt32BE(begin, 4)
  payload.writeInt32BE(length, 8)
  this.payload = payload
  util.inherits(Cancel, TorrentMessage)
}
