const TorrentDisk = require("../Disk/TorrentDisk");
const Tracker = require("../Tracker/Tracker");
const Decode = require("../Bencode/Decode");
let Encode = require("../Bencode/Encode");
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
let streamBuffers = require('stream-buffers');


const Torrent = module.exports = function Torrent(metaFile, filepath) {
    const self = this;
    EventEmitter.call(this);
    if (typeof metaFile === "string") {
        let metaFile = new Decode(metaFile);
    }
    this.name = metaFile["info"]["name"];
    this._metaData = metaFile;
    this._torrentDisk = new TorrentDisk(metaFile, filepath);
    this._mainTracker = metaFile["announce"];
    this._trackerList = metaFile["announce-list"];
    this._size = this["_torrentDisk"]["totalSize"];
    this._uploaded = this["_torrentDisk"]["uploaded"];
    this._downloaded = this["_torrentDisk"]["downloaded"];
    this._completed = this["_torrentDisk"]["completed"];
    this._left = this["_size"] - this["_completed"];

    // Events
    this._torrentDisk.on('verified', function (completed) {
        self._completed = completed;
        self._left = self._size - self._completed;
        self.emit('verified', completed)
    })
};

util.inherits(Torrent, EventEmitter);

Torrent.prototype.getInfoHash = function(callback){
    let self = this ;
    let infoDictionary = this._metaData["info"];
    let myWritableStreamBuffer = new streamBuffers.WritableStreamBuffer({
        initialSize: (1024 * 1024),
        incrementAmount: (100 * 1024)
    });
    myWritableStreamBuffer.on("end", function(){
        let bytesWritten = myWritableStreamBuffer.bytesWritten;
        let infoHashEncoded = myWritableStreamBuffer.getContents().slice(0, bytesWritten);
        const sha1_hash = crypto.createHash("sha1");
        sha1_hash.update(infoHashEncoded);
        const digest = sha1_hash.digest();
        callback(digest);
    });
    let encoder = new Encode(infoDictionary, "utf8", myWritableStreamBuffer);
};

Torrent.prototype.isComplete = function(){
    return this._left == 0 ;
};
