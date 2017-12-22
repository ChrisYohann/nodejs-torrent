const http = require("http");
const Utils = require("../Utils");
let logger = require("../log");

const compact2string = require("compact2string");
const Tracker = require("./Tracker");
const util = require('util');
const Decoder = require("../Bencode/Decoder");

let bencodeDecoder = new Decoder("utf8");

const HTTPTracker = module.exports = function HTTPTracker(clientTorrent, announceURL) {
    Tracker.call(this, clientTorrent, announceURL)
};

util.inherits(HTTPTracker, Tracker);

HTTPTracker.prototype.prepareHTTPRequest = function(torrentEvent) {
    const torrentInfos = this.client;
    const requestParams = {
        info_hash: torrentInfos["infoHash"],
        peer_id: Buffer.allocUnsafe(20),
        port: torrentInfos["listeningPort"],
        uploaded: torrentInfos["_uploaded"],
        downloaded: torrentInfos["_downloaded"],
        left: torrentInfos["_left"],
        compact: 1,
        event: torrentEvent
    };
    return this.announceURL + "?" + Utils.stringify(requestParams);
};

HTTPTracker.prototype.announce = function(torrentEvent) {
    const self = this;
    logger.info(`Sending ${torrentEvent} to ${self.announceURL}`);
    const httpRequest = this.prepareHTTPRequest(torrentEvent);
    logger.verbose(httpRequest);
    http.get(httpRequest, function (response) {
        logger.verbose("Response Status Code : " + response.statusCode);
        logger.verbose("Response Status Message : " + response.statusMessage);
        let responseBody = '';

        response.on("data", function (chunk) {
            responseBody += chunk
        });

        response.on("end", function (){
            const bufferedData = Buffer.from(responseBody);
            const bencodedResponse = bencodeDecoder.decode(bufferedData);
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
    const self = this;
    this.interval = bencodedResponse["interval"];
    if ("tracker id" in bencodedResponse) {
        this.trackerID = bencodedResponse["tracker id"]
    }
    if ("peers" in bencodedResponse) {
        const peerList = compact2string.multi(bencodedResponse["peers"]);
        logger.verbose("peers : " + peerList);
        self.emit("peers", peerList);
    }

    if ("peers6" in bencodedResponse) {
        const peer6List = compact2string.multi6(bencodedResponse["peers6"]);
        logger.verbose("peer6List : " + peer6List);
        peer6List.forEach(function (peer6) {
            this.emit("peer6", peer6)
        }, self)
    }

};
