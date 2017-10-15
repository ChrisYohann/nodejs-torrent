const fs = require('fs');
const path = require('path');
const BencodeDict = require('./Bencode/BencodeDict.js');
const InfoDictionary = require('./Bencode/InfoDictionary.js');
const Encode = require('./Bencode/Encode.js');

let CreateTorrent = module.exports = function CreateTorrent(torrentProperties, callback){
    const filepath = torrentProperties["filepath"];
    const stats = fs.statSync(filepath);
    const fileMode = stats.isFile() ? "SINGLE_FILE_MODE" : "MULTIPLE_FILE_MODE";

    const infoDictionary = new InfoDictionary(filepath, fileMode);

    infoDictionary.on("info_end", function(infoDict){
        const torrentDict = new BencodeDict();
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
};
