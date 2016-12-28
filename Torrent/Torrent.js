var TorrentDisk = require("../Disk/TorrentDisk");
var Tracker = require("../Tracker/Tracker");
var Decode = require("../Bencode/Decode");
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Torrent = module.exports = function Torrent(metaFile, filepath){
  var self = this
  EventEmitter.call(this)
  if(typeof metaFile === "string"){
 	var metaFile = new Decode(metaFile)
  }
  this.name = metaFile["info"]["name"];
  this._metaData = metaFile;
  this._listeningPort = 6970;
  this._torrentDisk = new TorrentDisk(metaFile, filepath);
  this._mainTracker = metaFile["announce"];
  this._trackerList = metaFile["announce-list"];
  this._size = this["_torrentDisk"]["totalSize"];
  this._uploaded = this["_torrentDisk"]["uploaded"];
  this._downloaded = this["_torrentDisk"]["downloaded"];
  this._completed = this["_torrentDisk"]["completed"];
  this._left = this["_size"]- this["_completed"]

  // Events
  this._torrentDisk.on('verified', function(completed){
    self._completed = completed ;
    self.emit('verified', completed)
  })
};

util.inherits(Torrent, EventEmitter)

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
