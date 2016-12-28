var randomAccessFile = require('random-access-file');
var Promise = require('rsvp').Promise;
var Piece = require("./Piece");
var SeekPointer = require("./SeekPointer");
var util = require('util');
var EventEmitter = require('events').EventEmitter;

const PATH_ENV = require("path");

const singleFile = "SINGLE_FILE_MODE";
const multipleFiles = "MULTIPLE_FILE_MODE";

var TorrentDisk = module.exports = function TorrentDisk(metaFile, filepath){
  EventEmitter.call(this)
  this.metaFile = metaFile;
  this.filepath = filepath;
  this.pieces = [];
  this.fileLengths = [];
  this.files = [];
  this.fileNamesPath = [];
  this.nbPieces = 0;
  this.lastPieceLength = 0;
  this.downloaded = 0;
  this.completed = 0;
  this.uploaded = 0;
  this.mode = ("files" in metaFile["info"]) ? multipleFiles : singleFile;
  this.totalSize = computeTotalSize.call(this);
  this.initPieces();
  this.verify();
};

util.inherits(TorrentDisk, EventEmitter)

TorrentDisk.prototype.retrieveFileNamesAndLengths = function(){
  switch(this.mode){
    case singleFile :
      this.fileNamesPath.push(this.filepath);
      this.fileLengths.push(this.totalSize);
      break ;
    case multipleFiles :
      this["metaFile"]["info"]["files"].forEach(function(fileDict){
        var fileNamePath = this.filepath + PATH_ENV.sep + fileDict["path"].join(PATH_ENV.sep);
        this.fileNamesPath.push(fileNamePath);
        this.fileLengths.push(fileDict["length"])
      }, this);
      break ;
  }
};

TorrentDisk.prototype.initPieces = function(){
  var bencodeDict = this.metaFile;
  var infoBencodeDict = bencodeDict["info"];
  var piecesJoined = infoBencodeDict["pieces"];
  var pieceLength = infoBencodeDict["piece length"];
  var totalSize = this["totalSize"];

  this.nbPieces = (piecesJoined.length)/20;
  var lastPieceLength = totalSize % pieceLength == 0 ? pieceLength : totalSize % pieceLength;
  this.lastPieceLength = lastPieceLength;

  this.retrieveFileNamesAndLengths();
  initFiles.call(this);

  var fileOffset = 0;
  var pieceOffset = 0;
  var fileIndex = 0;

  for(var i = 0 ; i < this.nbPieces ; i++){
    var pieceFingerPrint = piecesJoined.slice(20*i, 20*(i+1));
    var lengthPiece = (i != this.nbPieces-1 ) ? pieceLength : lastPieceLength;
    if(i == this.nbPieces -1){
      console.log(pieceFingerPrint);
    }
    var piece = new Piece(pieceFingerPrint, lengthPiece);
    var bytesPieceRemaining = lengthPiece;

    while(bytesPieceRemaining > 0){
      piece.addSeekPointer(new SeekPointer(this["files"][fileIndex], fileOffset, pieceOffset, this["fileLengths"][fileIndex]));
      if(bytesPieceRemaining > this["fileLengths"][fileIndex] - fileOffset){
        pieceOffset +=  this["fileLengths"][fileIndex] - fileOffset;
        bytesPieceRemaining = bytesPieceRemaining - this["fileLengths"][fileIndex] + fileOffset;
        fileOffset = 0;
        fileIndex++
      } else if (bytesPieceRemaining < this["fileLengths"][fileIndex] - fileOffset) {
          fileOffset += bytesPieceRemaining;
          bytesPieceRemaining = 0;
          pieceOffset = 0
      } else {
        fileOffset = 0;
        bytesPieceRemaining = 0;
        pieceOffset = 0;
        fileIndex++
      }
    }
    this.pieces.push(piece)
  }
  //setTimeout(this.verify, 5000)

};

TorrentDisk.prototype.clear = function(){
  this.files = [];
  this.pieces = [];
  this.fileLengths = [];
  this.files = [];
  this.fileNamesPath = []
};

TorrentDisk.prototype.verify = function(){
  console.log("Verifying Torrent")
 var self = this;
 var completed = 0;
 var promises = [];
 this.pieces.forEach(function(piece, index){
   var promise = piece.checkSha1().then(function(isCompleted){
     if(isCompleted){
       return piece.getLength();
     } else {
       console.log("Not completed", index);
     }
     return 0 ;
   }).catch(function(error){
     console.log(error)
   });
   promises.push(promise)
 });
 return Promise.all(promises).then(function(completedPieces){
   completedPieces.forEach(function(pieceCompletedLength){
    completed+= pieceCompletedLength;
    //console.log("Completed : "+completed)
  });
   self.completed = completed;
   self.emit('verified', completed);
   return completed
 })
};

TorrentDisk.prototype.getBitfieldFromFile = function(){
  var promises = [];
  var nbPieces = this["pieces"].length;
  var bitFieldBuffer = Buffer.alloc((nbPieces >> 3) + ((nbPieces & 0x7) != 0 ? 1 : 0));
  this["pieces"].forEach(function(piece){
    var promise = piece.checkSha1();
    promises.push(promise)
  });

  var result = Promise.all(promises).then(function(completedPieces){
    completedPieces.forEach(function(isCompleted, pieceIndex){
      bitFieldBuffer[pieceIndex >> 3] |= ( isCompleted ? 0x80 : 0) >> (pieceIndex & 0x7)
    });
    return bitFieldBuffer ;
  });

  return result ;
};

TorrentDisk.prototype.read = function(index, begin, length){
  var piece = this["pieces"][index];
  this.uploaded += length;
  return piece.read(begin, length)
};

TorrentDisk.prototype.write = function(index, begin, block){
  var self = this;
  var piece = this["pieces"][index];
  if(!piece.isCompleted()){
    return piece.write(begin, block).then(function(bytesWritten){
      self.downloaded += bytesWritten;
      self.completed += bytesWritten;
      return bytesWritten
    })
  }
};

TorrentDisk.prototype.setCompleted = function(value){
  this.completed = value
};

TorrentDisk.prototype.getCompleted = function(){
  return this.completed
};

var initFiles = function(){
  this.fileNamesPath.forEach(function(fileName){
    var raf = new randomAccessFile(fileName);
    this.files.push(raf)
  }, this)
};

var computeTotalSize = function(){
  var infoDict = this["metaFile"]["info"];
  var mode = this.mode;
  if(mode == singleFile){
    return infoDict["length"]
  } else {
    var totalSize = 0;
    infoDict["files"].forEach(function(element, index, array){
      totalSize += element["length"]
    });
    return totalSize
  }
};
