const randomAccessFile = require('random-access-file');
const Promise = require('rsvp').Promise;
const Piece = require("./Piece");
const SeekPointer = require("./SeekPointer");
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const mkdirp = require('mkdirp');
let logger = require("../log");

const PATH_ENV = require("path");

const singleFile = "SINGLE_FILE_MODE";
const multipleFiles = "MULTIPLE_FILE_MODE";

const TorrentDisk = module.exports = function TorrentDisk(metaFile, filepath) {
    EventEmitter.call(this);
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
};

util.inherits(TorrentDisk, EventEmitter);

TorrentDisk.prototype.retrieveFileNamesAndLengths = function(){
  switch(this.mode){
    case singleFile :
      this.fileNamesPath.push(this.filepath);
      this.fileLengths.push(this.totalSize);
      break ;
    case multipleFiles :
      this["metaFile"]["info"]["files"].forEach(function(fileDict){
          const fileNamePath = this.filepath + PATH_ENV.sep + fileDict["path"].join(PATH_ENV.sep);
          this.fileNamesPath.push(fileNamePath);
        this.fileLengths.push(fileDict["length"])
      }, this);
      break ;
  }
};

TorrentDisk.prototype.initPieces = function(){
    const bencodeDict = this.metaFile;
    const infoBencodeDict = bencodeDict["info"];
    const piecesJoined = infoBencodeDict["pieces"];
    const pieceLength = infoBencodeDict["piece length"];
    const totalSize = this["totalSize"];

    this.nbPieces = (piecesJoined.length)/20;
    const lastPieceLength = totalSize % pieceLength == 0 ? pieceLength : totalSize % pieceLength;
    this.lastPieceLength = lastPieceLength;

  this.retrieveFileNamesAndLengths();
  initFiles.call(this);

    let fileOffset = 0;
    let pieceOffset = 0;
    let fileIndex = 0;

    for(let i = 0 ; i < this.nbPieces ; i++){
      const pieceFingerPrint = piecesJoined.slice(20 * i, 20 * (i + 1));
      const lengthPiece = (i != this.nbPieces - 1 ) ? pieceLength : lastPieceLength;
      const piece = new Piece(pieceFingerPrint, lengthPiece);
      let bytesPieceRemaining = lengthPiece;

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
    const self = this;
    let completed = 0;
    const promises = [];
    this.pieces.forEach(function(piece, index){
     const promise = piece.checkSha1().then(function (isCompleted) {
         if (isCompleted) {
             return piece.getLength();
         } else {
             logger.verbose(`Not completed ${index}`);
         }
         return 0;
     }).catch(function (error) {
         logger.error(`Unable to check SHA1 fingerprint for pieces. Error : ${error}`)
     });
     promises.push(promise)
 });
 return Promise.all(promises).then(function(completedPieces){
   completedPieces.forEach(function(pieceCompletedLength){
    completed+= pieceCompletedLength;
  });
   self.completed = completed;
   self.emit('verified', completed);
   return completed
 })
};

TorrentDisk.prototype.getBitfieldFromFile = function(){
    const promises = [];
    const nbPieces = this["pieces"].length;
    const bitFieldBuffer = Buffer.alloc((nbPieces >> 3) + ((nbPieces & 0x7) != 0 ? 1 : 0));
    this["pieces"].forEach(function(piece){
      const promise = piece.checkSha1();
      promises.push(promise)
  });

    const result = Promise.all(promises).then(function (completedPieces) {
        completedPieces.forEach(function (isCompleted, pieceIndex) {
            bitFieldBuffer[pieceIndex >> 3] |= ( isCompleted ? 0x80 : 0) >> (pieceIndex & 0x7)
        });
        return bitFieldBuffer;
    });

    return result ;
};

TorrentDisk.prototype.read = function(index, begin, length){
    const piece = this["pieces"][index];
    this.uploaded += length;
  return piece.read(begin, length)
};

TorrentDisk.prototype.write = function(index, begin, block){
    const self = this;
    const piece = this["pieces"][index];
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
  let self = this;
  if (self.mode == multipleFiles){
    mkdirp(self.filepath, function(err){
      if (err){
        logger.error(`Error in creating Directory Files for ${self["metaFile"]["info"]["name"]}`);
        logger.error(err);
      }
      else logger.info(`Directory ${self.filepath} created.`);
    })
  }
  this.fileNamesPath.forEach(function(fileName, fileIndex){
      logger.info(`Retrieving file ${fileName} of length ${this.fileLengths[fileIndex]}`);
      const raf = new randomAccessFile(fileName, {length : self.fileLengths[fileIndex]});
      this.files.push(raf);
  }, self);
};

var computeTotalSize = function(){
    const infoDict = this["metaFile"]["info"];
    const mode = this.mode;
    if(mode == singleFile){
    return infoDict["length"]
  } else {
      let totalSize = 0;
      infoDict["files"].forEach(function(element, index, array){
      totalSize += element["length"]
    });
    return totalSize
  }
};
