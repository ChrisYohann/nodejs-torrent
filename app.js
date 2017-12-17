#!/usr/bin/env node

let logger = require("./log");
let net = require("net");
let UI = require("./UI/ui");
let TorrentManager = require("./Peer/TorrentManager");

const EventEmitter = require("events");
const util = require("util");

const CONF_FILE = "conf/torrents_list.json";

let MIN_BITTORENT_PORT = 6881;
let MAX_BITTORENT_PORT = 6889;
let app_port = MIN_BITTORENT_PORT;


function getPort(callback){
    let port = app_port;
    app_port += 1;
    logger.verbose(`Attempting to bind at port ${port} ...`);

    let server = this.server;

    server.listen(app_port, function(){
      logger.info(`Server listening at ${port}`);
      callback(port);
    });

    server.on("error", function(err){
        logger.debug(err);
        logger.error(`Unable to Bind at port ${port}. Trying next`);
        getPort(callback)
    });
}

let App = function App(){
    EventEmitter.call(this);
    this.ui = undefined;
    this.torrentManager = undefined;
    this.torrents = [];
    this.server = net.createServer();
};

util.inherits(App, EventEmitter);

App.prototype.start = function(){
    this.torrentManager = new TorrentManager(app_port);
    initTorrentManagerListeners.call(this);
    let self = this ;
    self.torrentManager.on("loadingComplete", function(torrents){
        self.torrents = torrents;
        self.ui = new UI(self);
        initUIListeners.call(self);
        self.loadUI();
    });
    self.torrentManager.loadTorrents(CONF_FILE);
};

App.prototype.loadUI = function(){
    logger.info("Drawing Interface");
    this.ui.drawInterface();
};

let newTorrentFromUIListener = function(torrentForm){
  let self = this;
  self.torrentManager.addNewTorrent(torrentForm);
};

let openTorrentFromUIListener = function(torrentForm){
  let self = this;
  self.torrentManager.openTorrent(torrentForm);
}

let newTorrentFromManagerListener = function(torrentObj){
  let self = this;
  self.emit("newTorrent", torrentObj);
};

let initTorrentManagerListeners = function(){
  let self = this;
  self.torrentManager.on("newTorrentAdded", newTorrentFromManagerListener.bind(self));
};

let initUIListeners = function(){
  let self = this;
  self.ui.on("newTorrentSubmitted", newTorrentFromUIListener.bind(self));
  self.ui.on("openTorrentSubmitted", openTorrentFromUIListener.bind(self));
};


let app = new App();
getPort.call(app, function(){
    app.start();
});
