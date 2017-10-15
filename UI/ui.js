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

const FOCUS_MODE = "focus" ;
const ESCAPE_MODE = "escape" ;
const CREATE_MODE = "create" ;

let mode = ESCAPE_MODE ;
let PROCESS_STDIN_EVENT_LOCKED = true;
let cursorPosition = 0 ;
let lastTorrentPosition = 2 ;

let torrents = [];

let Line = CLI.Line;
let LineBuffer = CLI.LineBuffer;
let Progress = CLI.Progress;

let outputBuffer = new LineBuffer({
    x: 0,
    y: 0,
    width: 'console',
    height: 'console'
});

let drawInterface = function(){
    process.stdout.write(clc.reset);
    outputBuffer.lines = [];

    //noinspection JSUnusedLocalSymbols
    let header = new Line(outputBuffer)
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
    let headerMargin = new Line(outputBuffer)
        .column(headerSeparator, Math.ceil(0.95*NB_COLUMNS))
        .fill()
        .store();

    torrents.forEach(function(torrent, index){
        let torrentLine = new TorrentLine(torrent);
        outputBuffer.addLine(torrentLine);
        lastTorrentPosition+=1
    });

    outputBuffer.output();
    process.stdout.write(clc.move.to(0, 2));
    keypress(process.stdin);
    process.stdin.on('keypress', keypressListenerCallBack);
    process.stdin.setRawMode(true);
    process.stdin.resume();
};

let addTorrentLine = function(torrentLine){

};

let removeTorrentLine = function(torrentIndex){

};

let clearFocus = function(){
    process.stdout.write(clc.move.to(2, cursorPosition+2));
    process.stdout.write(clc.erase.lineLeft);
    process.stdout.write("  ");
    process.stdout.write(clc.move.left(2));
};

let addFocus = function(){
    process.stdout.write(clc.move.to(0, cursorPosition+2));
    process.stdout.write("->");
    process.stdout.write(clc.move.left(2));
};

let jumpToNextTorrent = function(moveToIndex){
   if(cursorPosition + moveToIndex < outputBuffer.lines.length-2 && cursorPosition + moveToIndex >= 0){
       clearFocus();
       cursorPosition += moveToIndex;
       addFocus();
   }
};

let createNewTorrentWizard = function(){
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
                Encode(torrentDict, "UTF-8", savePath["savepath"]);
                let torrent = new Torrent(torrentDict, answers["filepath"]);
                torrents.push(torrent);
                //console.log(torrents);
                torrent.on('verified', function(completed){
                    drawInterface();
                    process.stdin.setRawMode(true);
                    process.stdin.resume();
                });
            });
        })
    });

};

let keypressListenerCallBack = function(ch, key){
    if(key){
        //console.log('got "keypress"', key);
        switch(key.name){
            case 'up' :
                if(mode == ESCAPE_MODE){
                    mode = FOCUS_MODE ;
                    addFocus() ;
                } else {
                    jumpToNextTorrent(-1);
                }
                break ;
            case 'down' :
                if(mode == ESCAPE_MODE){
                    mode = FOCUS_MODE ;
                    addFocus() ;
                } else {
                    jumpToNextTorrent(+1);
                }
                break ;
            case 'escape' :
                if(mode == FOCUS_MODE) {
                    mode = ESCAPE_MODE;
                    clearFocus();
                    process.stdout.write(clc.move.to(0, 2));
                }
                break ;
            case 'return' :
                break ;
            case 'c' :
                if (key.ctrl){
                    process.stdin.pause() ;
                    process.stdout.write(clc.reset);
                }
                break ;
            case 'n' :
                if(key.ctrl){
                    process.stdout.write(clc.reset);
                    let dataEventListener = process.stdin.listeners('data');
                    let keyPressEventListener = process.stdin.listeners('keypress');
                    if (dataEventListener.length > 0 && PROCESS_STDIN_EVENT_LOCKED){
                        console.log("Removing data listener");
                        process.stdin.removeAllListeners('data');
                        PROCESS_STDIN_EVENT_LOCKED = false
                    }

                    if(keyPressEventListener.length > 1){
                        let firstKeyPressEventListener = keyPressEventListener[0];
                        console.log("Removing keypress listener");
                        process.stdin.removeAllListeners('keypress');
                        process.stdin.on('keypress', firstKeyPressEventListener);
                    }
                    createNewTorrentWizard();
                }
                break ;
        }
    }


} ;

drawInterface();

module.exports.drawInterface = drawInterface();
