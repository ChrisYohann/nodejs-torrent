let logger = require("../log");
let HTTPTracker = require("../Tracker/HTTPTracker");
let UDPTracker = require("../Tracker/UDPTracker");

const udpAddressRegex = /^(udp:\/\/[\w.-]+):(\d{2,})[^\s]*$/g;
const httpAddressRegex = /^(http:\/\/[\w.-]+):(\d{2,})[^\s]*$/g;
const MAX_ACTIVE_PEERS = 5 ;

let PeerManager = module.exports = function PeerManager(torrent, port){
    this.torrent = torrent ;
    this.listeningPort = port ;
    this.lastKnownPeers = [] ;
    this.activePeers = [] ;
    this.trackers = (function(){
        if("_trackerList" in torrent){
            let mergedTrackers = [].concat.apply([], torrent["_trackerList"]);
            return mergedTrackers ;
        } else {
            return Array(torrent["_mainTracker"]);
        }
    })();
    this.actualTrackerIndex = 0;
    this.activeTracker = null;
};

PeerManager.prototype.start = function(){
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
        this.activeTracker.announce({"event" : "started"});
    }
};

PeerManager.prototype.seekForPeers = function(){
    
};

let getHTTPorUDPTracker = function(trackerURL){
    if(trackerURL.match(httpAddressRegex)){
        this.activeTracker = new HTTPTracker(this.torrent, trackerURL);
    } else if(trackerURL.match(udpAddressRegex)){
        this.activeTracker = new UDPTracker(this.torrent, trackerURL);
    } else {
        logger.error("No valid Protocol for ${trackerURL} found. Aborting.");
    }
}



