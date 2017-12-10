let logger = require("../log");
let fs = require('fs');
let EventEmitter = require('events').EventEmitter;
let util = require('util');
let Torrent = require("../Torrent/Torrent");

let TorrentManager = module.exports = function TorrentManager(port){
    EventEmitter.call(this);
    this.listeningPort = port;
    this.torrents = [];
};

util.inherits(TorrentManager, EventEmitter);

TorrentManager.prototype.loadTorrents = function(confFile){
    let self = this ;
    if (fs.existsSync(confFile)){
        logger.info(`Loading Existing Torrents From ${confFile}`);
        fs.readFile(confFile, "utf-8", function(err, data){
            if (err) throw err ;
            let jsonTorrentsData = JSON.parse(data);
            parseTorrentCallback(self, jsonTorrentsData);
        })
    } else {
        logger.info("No configuration file found")
    }
};

let parseTorrentCallback = function(torrentManager, jsonTorrentsData){
    let nbTorrents = jsonTorrentsData.length;
    let nbValidatedTorrents = 0;
    jsonTorrentsData.forEach(function(element, index, array){
        let obj = {};
        if("filepath" in element && "torrent_file" in element){
            let torrent = new Torrent(element["torrent_file"], element["filepath"]);
            let callbackInfoHash = function(digest){
                torrent.listeningPort = torrentManager.listeningPort ;
                obj["torrent"] = torrent ;
                obj["infoHash"] = digest ;
                torrentManager.torrents.push(obj);
                //torrent.start();
                nbValidatedTorrents += 1 ;
                if (nbValidatedTorrents == nbTorrents){
                  torrentManager.emit("loadingComplete", torrentManager.torrents);
                }
            };
            torrent.on("verified", function(completed){
                torrent.getInfoHash(callbackInfoHash) ;
            });

        } else {
            nbValidatedTorrents += 1 ;
            if (nbValidatedTorrents == nbTorrents){
              logger.info("Torrents Loaded");
              torrentManager.emit("loadingComplete", torrentManager.torrents);
            }
        }
    });
};
