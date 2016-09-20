const streamBuffers = require('stream-buffers')
const Encode = require('../Bencode/Encode.js')
const Utils = require('../Utils.js')

var clientTracker = module.exports = function clientTracker(torrentMetaData, clientTorrent){
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
  var infoDictBuffer = dictEndoded.wstream.getContents()
  var sha1_hash = crypto.createHash("sha1")
  sha1_hash.update(infoDictBuffer)
  var digest = sha1_hash.digest()
  return digest
}

var prepareHTTPRequest = function(clientTracker,torrentEvent){
  var torrentInfos = clientTracker._torrentObject

  var requestParams = {
    info_hash : createInfoHash(clientTracker._metaData),
    peer_id : Buffer.allocUnsafe(20),
    port : torrentInfos.getPort(),
    uploaded : torrentInfos.getUploaded(),
    downloaded : torrentInfos.getDownloaded(),
    left : 0,
    compact : 1,
    event : torrentEvent
  }
  var httpRequest = clientTracker._primaryTracker+"?"+Utils.stringify(requestParams)
  return httpRequest
}
