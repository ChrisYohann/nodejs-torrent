const fs = require('fs')
const CLI = require('clui'),
    clc = require('cli-color'),
    keypress = require('keypress') ;
    inquirer = require('inquirer')

const NB_COLUMNS = process.stdout.columns || 80 ;

const FOCUS_MODE = "focus" ;
const ESCAPE_MODE = "escape" ;
const CREATE_MODE = "create" ;

let mode = ESCAPE_MODE ;
let cursorPosition = 0 ;


let Line          = CLI.Line,
    LineBuffer    = CLI.LineBuffer,
    Progress = CLI.Progress;

let outputBuffer = new LineBuffer({
    x: 0,
    y: 0,
    width: 'console',
    height: 'console'
});

let drawInterface = function(){
    process.stdout.write(clc.reset);
    outputBuffer.lines = []

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

    let headerMargin = new Line(outputBuffer)
        .column(headerSeparator, Math.ceil(0.95*NB_COLUMNS))
        .fill()
        .store();

    let torrentProgressBar = new Progress(Math.ceil(0.15*NB_COLUMNS))
        .update(10, 40)

    for(let i = 0; i < 10; i++){
        let Torrent1Line = new Line(outputBuffer)
            .padding(4)
            .column(`Torrent_${i}`, Math.ceil(0.25*NB_COLUMNS))
            .column(torrentProgressBar, Math.ceil(0.25*NB_COLUMNS))
            .column('Speed', Math.ceil(0.25*NB_COLUMNS))
            .fill()
            .store();
    }

    outputBuffer.output();
}

let clearFocus = function(){
    process.stdout.write(clc.move.to(2, cursorPosition+2));
    process.stdout.write(clc.erase.lineLeft);
    process.stdout.write("  ");
    process.stdout.write(clc.move.left(2));
}

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
                    let stats = fs.statSync(value);
                    return true ;
                }
                catch(err) {
                    return true ;
                    //return "Please enter a valid Filepath" ;
                }
            }
        }
    ] ;
    inquirer.prompt(questions).then(function(answers){
        console.log(answers);
        drawInterface();
        //keypress(process.stdin);
        //process.stdin.on('keypress', keypressListenerCallBack);
        process.stdin.setRawMode(true)
        process.stdin.resume()
    });

}

drawInterface();

// Move to First Line Position
process.stdout.write(clc.move.to(0, 2));

let keypressListenerCallBack = function(ch, key){
    if(key){
        //console.log(`got key : ${key}`) ;
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
                    //process.stdin.removeAllListeners("keypress");
                    //process.stdin.removeAllListeners("data");
                    createNewTorrentWizard();

                }
                break ;
        }
    }


} ;

keypress(process.stdin);

process.stdin.on('keypress', keypressListenerCallBack);
process.stdin.setRawMode(true);
process.stdin.resume();