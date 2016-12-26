#!/usr/bin/node

/**
 * Created by chris on 23/05/16.
 */

var readlineSync = require('readline-sync');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var BencodeDict = require('./Bencode/BencodeDict.js');
var InfoDictionary = require('./Bencode/InfoDictionary.js');
var Encode = require('./Bencode/Encode.js');


var create_torrent_object = {};
var bencode_dict_keys = ["announce", "announce-list", "comment", "filepath"];

bencode_dict_keys.forEach(function(element,index,array) {
    var torrent_property = readlineSync.question(element+" : \n", {display : "stdout"});
    Object.defineProperty(create_torrent_object, element, {
      configurable : true,
      enumerable : true,
      value : torrent_property
    })
});

var filepath = create_torrent_object["filepath"];
var stats = fs.statSync(filepath);
var fileMode = stats.isFile() ? "SINGLE_FILE_MODE" : "MULTIPLE_FILE_MODE" ;

var infoDictionary = new InfoDictionary(filepath, fileMode) ;

infoDictionary.on("info_end", function(infoDict){
  var torrentDict = new BencodeDict();
  torrentDict.putContent("announce", create_torrent_object["announce"]);
  torrentDict.putContent("announce-list", create_torrent_object["announce-list"].split(";").map(function(element,index,array){ return element.split(" ")}));
  torrentDict.putContent("comment", create_torrent_object["comment"]);
  torrentDict.putContent("created by", "nhyne");
  torrentDict.putContent("creation date", Math.round(Date.now()/1000));
  torrentDict.putContent("encoding", "utf-8");
  torrentDict.putContent("info",infoDict);

  var torrentSavePath = readlineSync.question("Where do you want to save the file ? \n", {display : "stdout"});
  var torrentFile = new Encode(torrentDict, "UTF-8", torrentSavePath);
  console.log(torrentDict.toString())
});
infoDictionary.create();


//console.log(infoDictionary.toString())
