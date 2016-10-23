var TorrentDisk = require("../Disk/TorrentDisk")

var Torrent = module.exports = function Torrent(metaFile, filepath){
  this.name = metaFile["info"]["name"]
  this._size = metaFile["info"]["size"]
  this._metaData = metaFile
  this._listeningPort = 0
  this._left = this._size
  this._tracker = metaFile["announce"]
  this._trackerList = metaFile["announce-list"]
  this._torrentDisk = new TorrentDisk(metaFile, filepath)
  this._uploaded = this["_torrentDisk"]["uploaded"]
  this._downloaded = this["_torrentDisk"]["downloaded"]
  this._completed = this["_torrentDisk"]["completed"]
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
