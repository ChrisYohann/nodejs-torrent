var TorrentDisk = require("../Disk/TorrentDisk");
var Tracker = require("../Tracker/Tracker");
var Decode = require("../Bencode/Decode");

var Torrent = module.exports = function Torrent(metaFile, filepath){
  if(typeof metaFile === "string"){
 	var metaFile = new Decode(metaFile)
}
  this.name = metaFile["info"]["name"];
  this._size = metaFile["info"]["length"];
  this._metaData = metaFile;
  this._listeningPort = 6970;
  this._torrentDisk = new TorrentDisk(metaFile, filepath);
  this._mainTracker = metaFile["announce"];
  this._trackerList = metaFile["announce-list"];
  this._uploaded = this["_torrentDisk"]["uploaded"];
  this._downloaded = this["_torrentDisk"]["downloaded"];
  this._completed = this["_torrentDisk"]["completed"];
  this._left = this["_size"]- this["_completed"]
};

Torrent.prototype.initTrackers = function(){

};

Torrent.prototype.getSize = function(){
  return this._size
};

Torrent.prototype.getListeningPort = function(){
  return this._listeningPort
};

Torrent.prototype.getDownloaded = function(){
  return this._downloaded
};

Torrent.prototype.getUploaded = function(){
  return this._uploaded
};

Torrent.prototype.getLeft = function(){
  return this._left
};
