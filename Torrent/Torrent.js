var TorrentDisk = require("../Disk/TorrentDisk")
var Tracker = require("../Tracker/Tracker")

var Torrent = module.exports = function Torrent(metaFile, filepath){
  this.name = metaFile["info"]["name"]
  this._size = metaFile["info"]["length"]
  this._metaData = metaFile
  this._listeningPort = 6970
  this._left = this._size
  this._torrentDisk = new TorrentDisk(metaFile, filepath)
  this._primaryTracker = metaFile["announce"]
  this._trackerList = metaFile["announce-list"]
  this._uploaded = this["_torrentDisk"]["uploaded"]
  this._downloaded = this["_torrentDisk"]["downloaded"]
  this._completed = this["_torrentDisk"]["completed"]
  this._torrentTracker = new Tracker(this)
}

Torrent.prototype.initTrackers = function(){
  
}

Torrent.prototype.getSize = function(){
  return this._size
}

Torrent.prototype.getListeningPort = function(){
  return this._listeningPort
}

Torrent.prototype.getDownloaded = function(){
  return this._downloaded
}

Torrent.prototype.getUploaded = function(){
  return this._uploaded
}
