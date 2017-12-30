const http = require("http");
const Utils = require("../Utils");
const EventEmitter = require('events').EventEmitter;

const util = require('util');

const Tracker = module.exports = function Tracker(clientTorrent, announceURL) {
    EventEmitter.call(this);
    this.client = clientTorrent;
    this.announceURL = announceURL;
    this.intervalInSeconds = 1800;
    this.trackerID = "";
};

util.inherits(Tracker, EventEmitter);
