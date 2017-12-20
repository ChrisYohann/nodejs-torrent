let logger = require("../log");
let fs = require('fs');
let EventEmitter = require('events').EventEmitter;
let util = require('util');
let Torrent = require("../Torrent/Torrent");
let CreateTorrent = require('../newTorrent');
let Encode = require("../Bencode/Encode")

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
        torrentManager.emit("loadingComplete", torrentManager.torrents);
    }
};

TorrentManager.prototype.addNewTorrent = function(torrentForm){
  let self = this;
  CreateTorrent(torrentForm, function(torrentDict){
      let encoded = new Encode(torrentDict, "UTF-8", torrentForm["torrent_filepath"]);
      let torrent = new Torrent(torrentDict, torrentForm["filepath"]);
      let callbackInfoHash = function(digest){
          torrent.listeningPort = self.listeningPort ;
          let obj = {} ;
          obj["torrent"] = torrent ;
          obj["infoHash"] = digest ;
          self.torrents.push(obj);
          self.emit("torrentAdded", obj);
      };
      torrent.on("verified", function(completed){
          torrent.getInfoHash(callbackInfoHash) ;
      });
  });
};

TorrentManager.prototype.openTorrent = function(torrentForm){
  let self = this;
  logger.info(`Opening ${torrentForm["torrent_filepath"]}`);
  try {
    let torrent = new Torrent(torrentForm["torrent_filepath"], torrentForm["filepath"]);
    let callbackInfoHash = function(digest){
        torrent.listeningPort = self.listeningPort ;
        let obj = {} ;
        obj["torrent"] = torrent ;
        obj["infoHash"] = digest ;
        self.torrents.push(obj);
        self.emit("torrentAdded", obj);
    };
    torrent.on("verified", function(completed){
        torrent.getInfoHash(callbackInfoHash) ;
    });
  } catch(err){
    logger.error(`Error loading Torrent. ${err}`);
    self.emit("errorParsingTorrent");
  }
};

TorrentManager.prototype.deleteTorrent = function(torrentIndex){
  let self = this;
  self.torrents[torrentIndex].torrent.stop(function(message){
    logger.info(message);
    self.torrents.splice(torrentIndex, 1);
    self.emit("torrentDeleted", torrentIndex);
  })
};

let parseTorrentCallback = function(torrentManager, jsonTorrentsData){
    let nbTorrents = jsonTorrentsData.length;
    let nbValidatedTorrents = 0;
    jsonTorrentsData.forEach(function(element, index, array){
        let obj = {};
        if("filepath" in element && "torrent_file" in element){
            logger.info(`Loading ${element["torrent_file"]}`);
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
