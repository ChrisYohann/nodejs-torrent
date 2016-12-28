var fs = require('fs');
var path = require('path');
var BencodeDict = require('./Bencode/BencodeDict.js');
var InfoDictionary = require('./Bencode/InfoDictionary.js');
var Encode = require('./Bencode/Encode.js');

let CreateTorrent = module.exports = function CreateTorrent(torrentProperties, callback){
    var filepath = torrentProperties["filepath"];
    var stats = fs.statSync(filepath);
    var fileMode = stats.isFile() ? "SINGLE_FILE_MODE" : "MULTIPLE_FILE_MODE" ;

    var infoDictionary = new InfoDictionary(filepath, fileMode) ;

    infoDictionary.on("info_end", function(infoDict){
        var torrentDict = new BencodeDict();
        torrentDict.putContent("announce", torrentProperties["announce"]);
        torrentDict.putContent("announce-list", torrentProperties["announce-list"].split(";").map(function(element,index,array){ return element.split(" ")}));
        torrentDict.putContent("comment", torrentProperties["comment"]);
        torrentDict.putContent("created by", "nhyne");
        torrentDict.putContent("creation date", Math.round(Date.now()/1000));
        torrentDict.putContent("encoding", "utf-8");
        torrentDict.putContent("info",infoDict);
        callback(torrentDict);
    });
    infoDictionary.create();
}
