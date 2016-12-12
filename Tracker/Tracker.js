const http = require("http")
const Utils = require("../Utils")
const EventEmitter = require('events').EventEmitter
const dgram = require('dgram');

var util = require('util')
var Decode = require("../Bencode/Decode")

var Tracker = module.exports = function Tracker(clientTorrent, announceURL){
  EventEmitter.call(this)
  this.client = clientTorrent
  this.announceURL = announceURL
  this.intervalInSeconds = 1800
  this.trackerID = ""
  //Trackers
  /*this._primaryTracker = torrentMetaData["announce"]
  this._otherTrackers = (typeof torrentMetaData["announce-list"] === "undefined")? null : torrentMetaData["announce-list"].map(function(element, index, array){
    return element.join("")
  })*/
}

util.inherits(Tracker, EventEmitter)

Tracker.prototype.getPeersListFromResponse = function(bencodedResponse){
		var peerList = []
    var peers = bencodedResponse["peers"]
		try{
			var i = 0 ;
			for (i=0 ; i<=peers.length-6 ; i=i+6){
				var result ="";
        var j ;
				for(j=i ; j<i+5 ; j++){
					if(j<i+3){
						result+= (256+peers[j])%256+".";
					} else if(j<i+4){
						result+= (256+peers[j])%256;
					}
					else {
						var port_number = (((256+peers[j])%256)<<8)+(256+peers[j+1])%256 ;
							peerList.push({"IP" : result, "PORT" :port_number});
					}
				}
			}
		} catch(e){
			console.error("Error While Parsing IPv4 Peers", e.message)
		}
		return peerList;
	}



// TODO: GetPeers6ListFromResponse
