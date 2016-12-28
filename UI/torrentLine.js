const CLI = require('clui');
const clc = require('cli-color');
const NB_COLUMNS = process.stdout.columns || 80 ;

let Line = CLI.Line;
let LineBuffer = CLI.LineBuffer;
let Progress = CLI.Progress;

let TorrentLine = module.exports = function TorrentLine(torrentObject){
    let torrentSize = torrentObject['_size'];
    let completed = torrentObject['_completed'];
    let result = new Line()
        .padding(4)
        .column(torrentObject["name"], Math.ceil(0.25*NB_COLUMNS))
        .column(new Progress(Math.ceil(0.20*NB_COLUMNS)).update(completed, torrentSize))
        .column('Speed', Math.ceil(0.15*NB_COLUMNS))
        .column('0', Math.ceil(0.15*NB_COLUMNS))
        .fill();


    return result ;
}
