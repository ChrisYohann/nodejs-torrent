let logger = require("../log");
let fs = require('fs');
let EventEmitter = require('events').EventEmitter;
let util = require('util');
let Torrent = require("../Torrent/Torrent");
let CreateTorrent = require('../newTorrent');

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
        self.emit("loadingComplete", [])
    }
};

TorrentManager.prototype.addNewTorrent = function(torrent_form){
  let self = this;
  CreateTorrent(torrent_form, function(torrentDict){
      inquirer.prompt([{name : 'savepath',
          type: 'input',
          'message' : "Where do you want to save the file ?",
          validate : function(value){
              if(value){
                  return true ;
              } else {
                  return "Please Enter a valid SavePath"
              }
          }
      }]).then(function(savePath){
          let encoded = new Encode(torrentDict, "UTF-8", savePath["savepath"]);
          let torrent = new Torrent(torrentDict, torrent_form["filepath"]);
          self.torrents.push(torrent);
          torrent.on('verified', function(completed){
              let torrentLine = new TorrentLine(torrent);
              self.content.push(torrentLine);
              self.mode = ESCAPE_MODE ;
              self.drawInterface();
          });
      });
  });
};

TorrentManager.prototype.openTorrent = function(torrent_path){

};

TorrentManager.prototype.deleteTorrent = function(torrent){

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
