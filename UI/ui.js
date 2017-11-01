const fs = require('fs');
const CLI = require('clui');
const clc = require('cli-color');
const keypress = require('keypress') ;
let inquirer = require('inquirer') ;
let CreateTorrent = require('../newTorrent');
let Torrent = require('../Torrent/Torrent');
let TorrentLine = require('./torrentLine');
let Encode = require('../Bencode/Encode.js');

const NB_COLUMNS = process.stdout.columns || 80 ;
const NB_ROWS = process.stdout.rows || 24 ;

const FOCUS_MODE = "focus" ;
const ESCAPE_MODE = "escape" ;
const CREATE_MODE = "create" ;

let mode = ESCAPE_MODE ;
let PROCESS_STDIN_EVENT_LOCKED = true;
let cursorPosition = 0 ;
let lastTorrentPosition = 2 ;

let Line = CLI.Line;
let LineBuffer = CLI.LineBuffer;
let Progress = CLI.Progress;

let UI = module.exports = function(app){
    this.mode = ESCAPE_MODE ;
    this.cursorPosition = 0 ;
    this.lastTorrentPosition = 2 ;
    this.torrents = [];
    this.content = [];

    initContent.call(this);
};

UI.prototype.drawInterface = function(){
    console.log("DRAW INTERFACE")
    process.stdout.write(clc.reset);

    let header = drawHeader();
    let content = drawContent.call(this);
    let footer = drawFooter.call(this);

    header.output();
    content.output();
    footer.output();

    keypress(process.stdin);

    process.stdout.write(clc.move.to(0, 2));
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on('keypress', keypressListenerCallBack.bind(this));
};

UI.prototype.setListeners = function(){

};

let initContent = function(){
    let self = this ;
    this.torrents.forEach(function(torrent, index){
        let torrentline = new TorrentLine(torrent);
        torrentline.on("torrentChange", torrentChangeCallback(torrent));
        this.content.push(torrentline);
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
    console.log("Drawing Content");
    let contentBuffer = new LineBuffer({
        x: 0,
        y: 2,
        width: 'console',
        height: NB_ROWS - 4
    });

    if(this.content.length > 0){
        this.content.forEach(function(torrentLine){
            contentBuffer.addLine(torrentLine.content);
            this.lastTorrentPosition += 1 ;
        });
    } else {
        contentBuffer.addLine(new Line()
            .column(" ", 1)
            .fill());
    }

    return contentBuffer ;
};

let drawFooter = function(){
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
    process.stdout.write(clc.move.to(0, this.cursorPosition+2));
    process.stdout.write("->");
    process.stdout.write(clc.move.left(2));
};

let clearFocus = function(){
    process.stdout.write(clc.move.to(2, this.cursorPosition+2));
    process.stdout.write(clc.erase.lineLeft);
    process.stdout.write("  ");
    process.stdout.write(clc.move.left(2));
};

let jumpToNextTorrent = function(moveToIndex){
    if(this.cursorPosition + moveToIndex < outputBuffer.lines.length-2 && this.cursorPosition + moveToIndex >= 0){
        clearFocus.call(this);
        cursorPosition += moveToIndex;
        addFocus.call(this);
    }
};

let addTorrentLine = function(torrentLine){

};

let removeTorrentLine = function(torrentIndex){

};

let keypressListenerCallBack = function(ch, key){
    if(key){
        //console.log('got "keypress"', key);
        switch(key.name){
            case 'up' :
                if(this.mode == ESCAPE_MODE){
                    this.mode = FOCUS_MODE ;
                    addFocus.call(this) ;
                } else {
                    jumpToNextTorrent.call(this, -1);
                }
                break ;
            case 'down' :
                if(this.mode == ESCAPE_MODE){
                    this.mode = FOCUS_MODE ;
                    addFocus.call(this) ;
                } else {
                    jumpToNextTorrent.call(this, +1);
                }
                break ;
            case 'escape' :
                if(this.mode == FOCUS_MODE) {
                    this.mode = ESCAPE_MODE ;
                    clearFocus.call(this);
                    process.stdout.write(clc.move.to(0, 2));
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
            case 'n' :
                if(key.ctrl){
                    process.stdout.write(clc.reset);
                    process.stdin.removeAllListeners('data');
                    process.stdin.removeAllListeners('keypress');
                    createNewTorrentWizard.call(this);
                }
                break ;
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
                    //noinspection JSUnusedLocalSymbols
                    let stats = fs.statSync(value);
                    return true ;
                }
                catch(err) {
                    return "Please enter a valid Filepath" ;
                }
            }
        }
    ] ;
    inquirer.prompt(questions).then(function(answers){
        CreateTorrent(answers, function(torrentDict){
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
                let torrent = new Torrent(torrentDict, answers["filepath"]);
                self.torrents.push(torrent);
                torrent.on('verified', function(completed){
                    let torrentLine = new TorrentLine(torrent);
                    self.content.push(torrentLine);
                    console.log(self);
                    console.log("COMPLETED");
                    self.drawInterface();
                });
            });
        })
    });

};


let gui = new UI();
gui.drawInterface();
