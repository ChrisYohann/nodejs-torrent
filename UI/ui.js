const process =  require('process');
const fs = require('fs');
const CLI = require('clui');
const clc = require('cli-color');
const keypress = require('keypress') ;
const util = require("util");
const EventEmitter = require("events");

let logger = require("../log");
let inquirer = require('inquirer') ;
let CreateTorrent = require('../newTorrent');
let Torrent = require('../Torrent/torrent');
let TorrentLine = require('./torrentLine');

const NB_COLUMNS = process.stdout.columns || 80 ;
const NB_ROWS = process.stdout.rows || 24 ;

const FOCUS_MODE = "focus" ;
const ESCAPE_MODE = "escape" ;
const CREATE_MODE = "create" ;
let PROCESS_STDIN_EVENT_LOCKED = true; //For some reasons, this event appears only once.

let Line = CLI.Line;
let LineBuffer = CLI.LineBuffer;
let Progress = CLI.Progress;

let UI = module.exports = function(app){
    EventEmitter.call(this);
    this.app = app;
    this.mode = ESCAPE_MODE ;
    this.cursorPosition = 0 ;
    this.torrents = app["torrents"] || [];
    this.content = [];

    initContent.call(this);
    initAppListeners.call(this);

    keypress(process.stdin);
    process.stdin.on('keypress', keypressListenerCallBack.bind(this));
};

util.inherits(UI, EventEmitter);

UI.prototype.drawInterface = function(){
    this.mode = ESCAPE_MODE;
    this.cursorPosition = 0 ;
    process.stdout.write(clc.reset);

    let header = drawHeader();
    let content = drawContent.call(this);
    let footer = drawFooter.call(this);

    header.output();
    content.output();
    footer.output();

    process.stdout.write(clc.move.to(0, 2));
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

};

let newTorrentFromAppListener = function(torrentObj){
  let self = this;
  let torrentline = new TorrentLine(torrentObj);
  torrentline.on("torrentChange", function(){console.log("YEAH")});
  self.content.push(torrentline);
  self.mode = ESCAPE_MODE;
  self.drawInterface();
};

let deletedTorrentFromAppListener = function(torrentIndex){
  let self = this;
  self.content.splice(torrentIndex, 1);
  self.drawInterface();
};

let initAppListeners = function(){
  let self = this;
  self.app.on("newTorrent", newTorrentFromAppListener.bind(self));
  self.app.on("deletedTorrent", deletedTorrentFromAppListener.bind(self));
};

let initContent = function(){
    let self = this ;
    this.torrents.forEach(function(torrent, index){
        let torrentline = new TorrentLine(torrent);
        torrentline.on("torrentChange", function(){console.log("YEAH")});
        self.content.push(torrentline);
    })
};

let drawHeader = function(){

    let headerBuffer = new LineBuffer({
        x: 0,
        y: 0,
        width: 'console',
        height: 2
    });

    let header = new Line(headerBuffer)
        .padding(4)
        .column('Name', Math.ceil(0.25*NB_COLUMNS))
        .column('Progress', Math.ceil(0.25*NB_COLUMNS))
        .column('Speed', Math.ceil(0.15*NB_COLUMNS))
        .column('Seeders', Math.ceil(0.15*NB_COLUMNS))
        .fill()
        .store();

    let headerSeparator = "" ;
    for (let i = 0 ; i < NB_COLUMNS ; i++){
        headerSeparator += "-" ;
    }

    //noinspection JSUnusedLocalSymbols
    let headerMargin = new Line(headerBuffer)
        .column(headerSeparator, Math.ceil(0.95*NB_COLUMNS))
        .fill()
        .store();

    return headerBuffer ;
};

let drawContent = function(){
    let contentBuffer = new LineBuffer({
        x: 0,
        y: 2,
        width: 'console',
        height: NB_ROWS - 4
    });

    if(this.content.length > 0){
        this.content.forEach(function(torrentLine){
            contentBuffer.addLine(torrentLine.content);
        });
    } else {
        contentBuffer.addLine(new Line()
            .column(" ", 1)
            .fill());
    }
    return contentBuffer ;
};

let drawFooter = function(){
    //Clean Footer if previous mode was enabled
    process.stdout.write(clc.move.to(0, NB_ROWS - 2));
    process.stdout.write(clc.erase.line);

    let self = this;
    let footerBuffer = new LineBuffer({
        x: 0,
        y: NB_ROWS - 2,
        width: 'console',
        height: 2
    });

    let optionsLine = (function(){
        if (self.mode == ESCAPE_MODE){
            return new Line(footerBuffer)
                .padding(4)
                .column("^N ", 3, [clc.inverse])
                .column(" New", 4)
                .column("  ")
                .column("^O ", 3, [clc.inverse])
                .column(" Open", 5)
                .column("  ")
                .column("^C ", 3, [clc.inverse])
                .column(" Quit", 5)
                .fill()
                .store();
        } else {
            return new Line(footerBuffer)
                .padding(4)
                .column("^D", 2, [clc.inverse])
                .column(" Delete", 7)
                .column("  ")
                .column("Enter", 5, [clc.inverse])
                .column(" Info", 5)
                .column("  ")
                .column("^P", 2, [clc.inverse])
                .column(" Pause", 6)
                .fill()
                .store();
        }
    })();

    return footerBuffer ;
};

let addFocus = function(){
  logger.debug(`Add Focus Function Called. cursorPosition=${this.cursorPosition}`);
  process.stdout.write(clc.move.to(0, this.cursorPosition+2));
  process.stdout.write("->");
  process.stdout.write(clc.move.left(2));
};

let clearFocus = function(){
  logger.debug(`Clear Focus Function Called. cursorPosition=${this.cursorPosition}`);
  process.stdout.write(clc.move.to(2, this.cursorPosition+2));
  process.stdout.write(clc.erase.lineLeft);
  process.stdout.write("  ");
  process.stdout.write(clc.move.left(2));
};

let jumpToNextTorrent = function(moveToIndex){

  if(this.cursorPosition + moveToIndex < this.torrents.length && this.cursorPosition + moveToIndex >= 0){
      clearFocus.call(this);
      this.cursorPosition += moveToIndex;
      addFocus.call(this);
    }
};

let keypressListenerCallBack = function(ch, key){
  logger.debug(`${key.ctrl?"CTRL+":""}${key.name} pressed in ${this.mode} mode.`);
    if(key){
        switch(key.name){
            case 'up' :
                if(this.mode == ESCAPE_MODE && this.content.length > 0){
                    this.mode = FOCUS_MODE ;
                    drawFooter.call(this).output();
                    addFocus.call(this) ;
                } else if(this.mode == FOCUS_MODE) {
                    jumpToNextTorrent.call(this, -1);
                }
                break ;
            case 'down' :
                if(this.mode == ESCAPE_MODE && this.content.length > 0){
                    this.mode = FOCUS_MODE ;
                    drawFooter.call(this).output();
                    addFocus.call(this) ;
                } else if(this.mode == FOCUS_MODE){
                    jumpToNextTorrent.call(this, +1);
                }
                break ;
            case 'escape' :
                if(this.mode == FOCUS_MODE) {
                    this.mode = ESCAPE_MODE ;
                    drawFooter.call(this).output();
                    clearFocus.call(this);
                    process.stdout.write(clc.move.to(0, 2));
                } else if (this.mode == CREATE_MODE){
                  this.mode = ESCAPE_MODE;
                  this.drawInterface();
                }
                break ;
            case 'return' :
                break ;
            case 'c' :
                if (key.ctrl){
                    process.stdout.write(clc.reset);
                    process.exit();
                }
                break ;
            case 'd' :
                if(key.ctrl && this.mode == FOCUS_MODE){
                  this.emit("deleteTorrentRequest", this.cursorPosition);
                }
                break ;
            case 'n' :
                if(key.ctrl && this.mode == ESCAPE_MODE){
                    process.stdout.write(clc.reset);
                    this.mode = CREATE_MODE ;
                    let dataEventListener = process.stdin.listeners('data');
                    let keyPressEventListener = process.stdin.listeners('keypress');
                    logger.info(`Data Event Listeners : ${dataEventListener.length} | Keypress Event Listeners ${keyPressEventListener.length}`);
                    if (PROCESS_STDIN_EVENT_LOCKED){
                            logger.debug("Removing data listener");
                            process.stdin.removeAllListeners('data');
                            PROCESS_STDIN_EVENT_LOCKED = false;
                        }
                    //process.stdin.removeAllListeners('keypress');
                    createNewTorrentWizard.call(this);
                }
                break ;
            case 'o' :
                  if(key.ctrl && this.mode == ESCAPE_MODE){
                    process.stdout.write(clc.reset);
                    this.mode = CREATE_MODE;
                    let dataEventListener = process.stdin.listeners('data');
                    let keyPressEventListener = process.stdin.listeners('keypress');
                    logger.debug(`Data Event Listeners : ${dataEventListener.length} | Keypress Event Listeners ${keyPressEventListener.length}`);
                        if (PROCESS_STDIN_EVENT_LOCKED){
                            logger.debug("Removing data listener");
                            process.stdin.removeAllListeners('data');
                            PROCESS_STDIN_EVENT_LOCKED = false;
                        }
                    //process.stdin.removeAllListeners('keypress');
                    openTorrentWizard.call(this);
               }
        }
    }
};

let createNewTorrentWizard = function(){
    let self = this ;

    let questions = [
        {
            name: 'announce',
            type: 'input',
            message: 'Announce URL of the tracker :',
            validate: function( value ) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter a valid URL';
                }
            }
        },
        {
            name: 'announce-list',
            type: 'input',
            message: 'Other Trackers (separate trackers using ";")',
        },
        {
            name: 'comment',
            type: 'input',
            message: 'Comment'
        },
        {
            name: 'filepath',
            type: 'input',
            message: 'Filepath',
            validate: function(value){
                try {
                    let stats = fs.statSync(value);
                    return true ;
                }
                catch(err) {
                    return "Please enter a valid Filepath" ;
                }
            }
        },
        {
          name: 'torrent_filepath',
          type: 'input',
          message: 'Path where you want to the .torrent File',
          validate : function(value){
              if(value){
                  return true ;
              } else {
                  return "Please Enter a valid SavePath"
              }
          }
        }
      ];
    inquirer.prompt(questions).then(function(answers){
      self.emit("newTorrentRequest", answers);
    });

};

let openTorrentWizard = function(){
  let self = this;
  let questions = [
    {
      name : 'torrent_filepath',
      type : 'input',
      message : 'Path where the .torrent File is saved',
      validate : function(value){
        if(value){
          return true;
        } else {
          return "Please Enter a valid FilePath" ;
        }
      }
    },
    {
      name : 'filepath',
      type : 'input',
      message : 'Path where you want to save the File',
      validate : function(value){
        if(value){
          return true;
        } else {
          return "Please Enter a valid FilePath" ;
        }
      }
    }
  ]

  inquirer.prompt(questions).then(function(answers){
    self.emit("openTorrentRequest", answers);
  });
}
