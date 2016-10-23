const streamBuffers = require('stream-buffers')
const Encode = require('../Bencode/Encode.js')
const Utils = require('../Utils.js')
const crypto = require("crypto")

var ClientTracker = module.exports = function ClientTracker(clientTorrent){
  var torrentMetaData = clientTorrent["_metaData"]
  this._metaData = torrentMetaData
  this._torrentObject = clientTorrent
  //Trackers
  this._primaryTracker = torrentMetaData["announce"]
  this._otherTrackers = torrentMetaData["announce-list"].map(function(element, index, array){
    return element.join("")
  })
}

var createInfoHash = function(metaData){
  var bufferOutputStream = new streamBuffers.WritableStreamBuffer()
  var dictEncoded = new Encode(metaData, 'utf8', bufferOutputStream)
  //var infoDictBuffer = dictEncoded.wstream.getContents()
  var sha1_hash = crypto.createHash("sha1")
  sha1_hash.update(bufferOutputStream.getContents())
  var digest = sha1_hash.digest()
  return digest
}

ClientTracker.prototype.prepareHTTPRequest = function(torrentEvent){
  var torrentInfos = this._torrentObject
  var requestParams = {
    info_hash : createInfoHash(this._metaData["info"]),
    peer_id : Buffer.allocUnsafe(20),
    port : torrentInfos.getListeningPort(),
    uploaded : torrentInfos.getUploaded(),
    downloaded : torrentInfos.getDownloaded(),
    left : 0,
    compact : 1,
    event : torrentEvent
  }
  var httpRequest = this._primaryTracker+"?"+Utils.stringify(requestParams)
  return httpRequest
}
