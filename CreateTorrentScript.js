#!/usr/bin/env node

/**
 * Created by chris on 23/05/16.
 */
let logger = require("./log.js");

const readlineSync = require('readline-sync');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const BencodeDict = require('./Bencode/BencodeDict.js');
const InfoDictionary = require('./Bencode/InfoDictionary.js');
const Encode = require('./Bencode/Encode.js');


const create_torrent_object = {};
const bencode_dict_keys = ["announce", "announce-list", "comment", "filepath"];

bencode_dict_keys.forEach(function(element,index,array) {
    const torrent_property = readlineSync.question(element + " : \n", {display: "stdout"});
    Object.defineProperty(create_torrent_object, element, {
      configurable : true,
      enumerable : true,
      value : torrent_property
    })
});

const filepath = create_torrent_object["filepath"];
const stats = fs.statSync(filepath);
const fileMode = stats.isFile() ? "SINGLE_FILE_MODE" : "MULTIPLE_FILE_MODE";

const infoDictionary = new InfoDictionary(filepath, fileMode);

infoDictionary.on("info_end", function(infoDict){
  const announce_list = (function(){
    if (create_torrent_object["announce-list"].length > 0){
      return torrentProperties.split(";").map(function(element,index,array){ return element.split(" ")});
    } else {
      return [];
    }
  })();
	const torrentDict = new BencodeDict();
	torrentDict.putContent("announce", create_torrent_object["announce"]);
	torrentDict.putContent("announce-list",announce_list);
	torrentDict.putContent("comment", create_torrent_object["comment"]);
 	torrentDict.putContent("created by", "nhyne");
 	torrentDict.putContent("creation date", Math.round(Date.now()/1000));
 	torrentDict.putContent("encoding", "utf-8");
 	torrentDict.putContent("info",infoDict);
    	const torrentSavePath = readlineSync.question("Where do you want to save the file ? \n", {display: "stdout"});
    	const torrentFile = new Encode(torrentDict, "UTF-8", torrentSavePath);
    	logger.info(torrentDict.toString())
});
infoDictionary.create();
