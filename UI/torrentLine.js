const CLI = require('clui');
const clc = require('cli-color');
const NB_COLUMNS = process.stdout.columns || 80 ;

const util = require('util');
const EventEmitter = require('events').EventEmitter;

let Line = CLI.Line;
let LineBuffer = CLI.LineBuffer;
let Progress = CLI.Progress;

let TorrentLine = module.exports = function(torrent){
    console.log("Creating TorrentLine");
    let self = this ;
    EventEmitter.call(this);
    this.torrent = torrent;
    this.content = this.updateLineContent();
    this.torrent.on("change", function(torrent){
        self.content = self.updateLineContent();
        self.emit("torrentChange", self.content);
    });


};

util.inherits(TorrentLine, EventEmitter);

TorrentLine.prototype.updateLineContent = function(){
   let result = new Line()
        .padding(4)
        .column(this.torrent["name"], Math.ceil(0.25*NB_COLUMNS))
        .column(new Progress(Math.ceil(0.20*NB_COLUMNS)).update(this.torrent["_completed"], this.torrent["_size"]))
        .column('Speed', Math.ceil(0.15*NB_COLUMNS))
        .column('0', Math.ceil(0.15*NB_COLUMNS))
        .fill();
  return result;


};
