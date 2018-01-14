const TorrentDisk = require("../disk/torrentDisk");
const Decoder = require("../Bencode/Decoder");
const Encode = require("../Bencode/Encode");
const logger = require("../log");
const Utils = require("../Utils");
const _ = require("underscore");

const HTTPTracker = require("../tracker/HTTPTracker");
const UDPTracker = require("../tracker/UDPTracker");
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
let streamBuffers = require('stream-buffers');
let bencodeDecoder = new Decoder("utf8");

const udpAddressRegex = /^(udp:\/\/[\w.-]+):(\d{2,})[^\s]*$/g;
const httpAddressRegex = /^(http:\/\/[\w.-]+):(\d{2,})[^\s]*$/g;
const MAX_ACTIVE_PEERS = 5 ;


let Torrent = module.exports = function Torrent(metaFile, filepath) {
    let self = this;
    EventEmitter.call(this);
    let metaData_tmp = typeof metaFile === "string" ? bencodeDecoder.decode(metaFile) : metaFile;
    let metaData = convertBencodeDictForTorrent(metaData_tmp, ["pieces"]);

    //metaFile fields
    this.name = metaData["info"]["name"];
    this._metaData = metaData;
    this._mainTracker = metaData["announce"];
    this.trackerList = ("announce-list" in metaData & metaData["announce-list"].length > 0) ? metaData["announce-list"] : undefined;
    this.infoHash = null;

    //File fields
    this.disk = new TorrentDisk(metaData, filepath);
    this.bitfield = null;

    // Events
    this._uploaded = this["disk"]["uploaded"];
    this._downloaded = this["disk"]["downloaded"];
    this._completed = this["disk"]["completed"];
    this._size = this["disk"]["totalSize"];
    this._left = this["_size"] - this["_completed"];

    //peer Fields
    this.listeningPort = null ;
    this.lastKnownPeers = [] ;
    this.activePeers = [] ;
    this.actualTrackerIndex = 0;
    this.activeTracker = null;
    this.trackers = (function(){
        if(this.trackerList){
            let mergedTrackers = [].concat.apply([], self["trackerList"]);
            return mergedTrackers ;
        } else {
            return Array(self["_mainTracker"]);
        }
    })();

    this.disk.verify().then(function(completed){
      logger.info(`${self.name} torrent verified. ${completed} bytes downloaded.`);
      self._completed = completed;
      self._left = self._size - self._completed;
      return self.disk.getBitfieldFromFile().then(function(bitfield){
        self.bitfield = bitfield;
        self.emit('verified', completed);
      });
    });

};

util.inherits(Torrent, EventEmitter);

Torrent.prototype.start = function(){
    let self = this ;
    console.log(this);
    if(this.trackers.length <= 0){
        logger.error("No valid tracker found. Aborting.");
    } else {
        this.activeTracker = getHTTPorUDPTracker.call(this, self.trackers[self.actualTrackerIndex]);
        this.activeTracker.on("peers", function(peerList){
            peerList.forEach(function(peer){
              self.lastKnownPeers.push(peer)
            });
            if(self["_left"] != 0){
                self.seekForPeers();
            }
        });
        self.activeTracker.announce("started");
    }
};

Torrent.prototype.stop = function(callback){
  logger.info(`Invoking Stop for ${this.name} torrent.`);
  let message = `${this.name} Torrent Successfully stopped.`;
  callback(message);
};

Torrent.prototype.addPeer = function(peer, isIncomingConnection){

};

Torrent.prototype.seekForPeers = function(){
	let nbPeersToAdd = MAX_ACTIVE_PEERS - this.activePeers.length;


};

Torrent.prototype.getInfoHash = function(callback){
    let self = this ;
    let infoDictionary = this._metaData["info"];
    let myWritableStreamBuffer = new streamBuffers.WritableStreamBuffer({
        initialSize: (1024 * 1024),
        incrementAmount: (100 * 1024)
    });
    myWritableStreamBuffer.on("finish", function(){
        let bytesWritten = myWritableStreamBuffer.bytesWritten;
        let infoHashEncoded = myWritableStreamBuffer.getContents().slice(0, bytesWritten);
        const sha1_hash = crypto.createHash("sha1");
        sha1_hash.update(infoHashEncoded);
        const digest = sha1_hash.digest();
        self.infoHash = digest;
        callback(digest);
    });
    let encoder = new Encode(infoDictionary, "utf8", myWritableStreamBuffer);
};

Torrent.prototype.isComplete = function(){
    return this._left == 0 ;
};

Torrent.prototype.containsPiece = function(index){
    let self = this;
    return Utils.bitfieldContainsPiece(self.bitfield, index);
};

Torrent.prototype.updateBitfield = function(index){
    let self = this;
    self.bitfield = Utils.updateBitfield(self.bitfield, index);
};

Torrent.prototype.read = function(index, begin, length){
    return this.disk.read(index, begin, length);
};

Torrent.prototype.write = function(index, begin, block){
    return this.disk.write(index, begin, block);
};

let getHTTPorUDPTracker = function(trackerURL){
  let self = this;
    if(trackerURL.match(httpAddressRegex)){
        return new HTTPTracker(self, trackerURL);
    } else if(trackerURL.match(udpAddressRegex)){
        return new UDPTracker(self, trackerURL);
    } else {
        logger.error("No valid Protocol for ${trackerURL} found. Aborting.");
    }
};

let convertBencodeDictForTorrent = function(bencodedDict, keysToExclude){
    const keySet = bencodedDict.getContent();
    keySet.sort();
    keySet.forEach(function(key, index, array){
        let isABuffer = Buffer.isBuffer(bencodedDict[key]);
        let isAList = Array.isArray(bencodedDict[key]);
        let isADict = !isABuffer & !isAList & (typeof bencodedDict[key] === "object");
        if (isABuffer && !keysToExclude.includes(key)){
            bencodedDict[key] = bencodedDict[key].toString();
        } else if (isAList){
            bencodedDict[key] = convertBencodeListForTorrent(bencodedDict[key], keysToExclude);
        } else if (isADict) {
            bencodedDict[key] = convertBencodeDictForTorrent(bencodedDict[key], keysToExclude);
        }
    });

    return bencodedDict ;
};

let convertBencodeListForTorrent = function(bencodedList, keysToExclude){
    return _.map(bencodedList, function(element){
        let isABuffer = Buffer.isBuffer(element);
        let isAList = Array.isArray(element);
        let isADict = !isABuffer & !isAList & (typeof element === "object");
        if (isAList){
            return convertBencodeListForTorrent(element, keysToExclude);
        } else if(isABuffer){
            return element.toString();
        } else if (isADict){
            return convertBencodeDictForTorrent(element, keysToExclude);
        } else {
            return element;
        }
    });
};
