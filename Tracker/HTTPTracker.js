const http = require("http");
const Utils = require("../Utils");
let logger = require("../log")

var compact2string = require("compact2string");
var Tracker = require("./Tracker");
var util = require('util');
var Decode = require("../Bencode/Decode");

var HTTPTracker = module.exports = function HTTPTracker(clientTorrent, announceURL) {
    Tracker.call(this, clientTorrent, announceURL)
};

util.inherits(HTTPTracker, Tracker);

HTTPTracker.prototype.prepareHTTPRequest = function (torrentEvent) {
    var torrentInfos = this.client;
    var requestParams = {
        info_hash: Utils.createInfoHash(this._metaData["info"]),
        peer_id: Buffer.allocUnsafe(20),
        port: torrentInfos.getListeningPort(),
        uploaded: torrentInfos.getUploaded(),
        downloaded: torrentInfos.getDownloaded(),
        left: 0,
        compact: 1,
        event: torrentEvent
    };
    return this.announceURL + "?" + Utils.stringify(requestParams);
};

HTTPTracker.prototype.executeHTTPRequest = function (torrentEvent) {
    var self = this;
    var httpRequest = this.prepareHTTPRequest(torrentEvent);
    logger.verbose(httpRequest);
    http.get(httpRequest, function (response) {
        logger.verbose("Response Status Code : " + response.statusCode);
        logger.verbose("Response Status Message : " + response.statusMessage);
        var responseBody = '';

        response.on("data", function (chunk) {
            responseBody += chunk
        });

        response.on("end", function () {
            var bufferedData = Buffer.from(responseBody);
            var bencodedResponse = new Decode(bufferedData);
            if (!("failure reason" in bencodedResponse)) {
                logger.verbose(bencodedResponse);
                callBackTrackerResponseHTTP.call(self, bencodedResponse)
            } else {
                logger.verbose("FAILURE REASON");
                logger.verbose(bencodedResponse)
            }
        })
    })
};


var callBackTrackerResponseHTTP = function (bencodedResponse) {
    var self = this;
    this.interval = bencodedResponse["interval"];
    if ("tracker id" in bencodedResponse) {
        this.trackerID = bencodedResponse["tracker id"]
    }
    if ("peers" in bencodedResponse) {
        var peerList = compact2string.multi(bencodedResponse["peers"]);
        logger.verbose("peers : " + peerList);
        peerList.forEach(function (peer) {
            this.emit("peer", peer)
        }, self)
    }

    if ("peers6" in bencodedResponse) {
        var peer6List = compact2string.multi6(bencodedResponse["peers6"]);
        logger.verbose("peer6List : " + peer6List);
        peer6List.forEach(function (peer6) {
            this.emit("peer6", peer6)
        }, self)
    }

};
