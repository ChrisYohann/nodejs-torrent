const TorrentDisk = require("../Disk/TorrentDisk");
const Decode = require("../Bencode/Decode");
const Encode = require("../Bencode/Encode");
const logger = require("../log");

const HTTPTracker = require("../Tracker/HTTPTracker");
const UDPTracker = require("../Tracker/UDPTracker");
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
let streamBuffers = require('stream-buffers');

const udpAddressRegex = /^(udp:\/\/[\w.-]+):(\d{2,})[^\s]*$/g;
const httpAddressRegex = /^(http:\/\/[\w.-]+):(\d{2,})[^\s]*$/g;
const MAX_ACTIVE_PEERS = 5 ;


let Torrent = module.exports = function Torrent(metaFile, filepath) {
    let self = this;
    EventEmitter.call(this);
    if (typeof metaFile === "string") {
        let metaFile = new Decode(metaFile);
    }

    //metaFile fields
    this.name = metaFile["info"]["name"];
    this._metaData = metaFile;
    this._mainTracker = metaFile["announce"];
    this.trackerList = ("announce-list" in metaFile) ? metaFile["announce-list"] : null;

    //File fields
    this._torrentDisk = new TorrentDisk(metaFile, filepath);
    this._uploaded = this["_torrentDisk"]["uploaded"];
    this._downloaded = this["_torrentDisk"]["downloaded"];
    this._completed = this["_torrentDisk"]["completed"];
    this._size = this["_torrentDisk"]["totalSize"];
    this._left = this["_size"] - this["_completed"];

    //Peer Fields
    this.listeningPort = null ;
    this.lastKnownPeers = [] ;
    this.activePeers = [] ;
    this.actualTrackerIndex = 0;
    this.activeTracker = null;
    this.trackers = (function(){
        if(this.trackerList){
            let mergedTrackers = [].concat.apply([], torrent["_trackerList"]);
            return mergedTrackers ;
        } else {
            return Array(this["_mainTracker"]);
        }
    })();

    // Events
    this._torrentDisk.on('verified', function (completed) {
        self._completed = completed;
        self._left = self._size - self._completed;
        self.emit('verified', completed)
    })
};

util.inherits(Torrent, EventEmitter);

Torrent.prototype.start = function(){
    let self = this ;
    if(this.trackers.length <= 0){
        logger.error("No valid Tracker found. Aborting.");
    } else {
        this.activeTracker = getHTTPorUDPTracker.call(this, trackers[this.actualTrackerIndex]);
        this.activeTracker.on("peers", function(peerList){
            peerList.foreach(function(peer){
                self.lastKnownPeers.push(peer)
            });
            if(!self.torrent.isComplete()){
                self.seekForPeers();
            }
        });
        this.activeTracker.announce("started");
    }
};

Torrent.prototype.seekForPeers =  function(){

}

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

let getHTTPorUDPTracker = function(trackerURL){
    if(trackerURL.match(httpAddressRegex)){
        this.activeTracker = new HTTPTracker(this, trackerURL);
    } else if(trackerURL.match(udpAddressRegex)){
        this.activeTracker = new UDPTracker(this, trackerURL);
    } else {
        logger.error("No valid Protocol for ${trackerURL} found. Aborting.");
    }
}