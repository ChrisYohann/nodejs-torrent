var fs = require('fs')
const PATH_ENV = require('path')
var walk = require('walk')
var BencodeDict = require('./BencodeDict.js')
var crypto = require('crypto')
var CombinedStream = require('combined-stream2')
var util = require('util')
var EventEmitter = require('events').EventEmitter

const singleFile = "SINGLE_FILE_MODE" ;
const multipleFile = "MULTIPLE_FILE_MODE" ;

var files = []
var filesSize = []
var totalSize = 0
var pieces = []

// 1<<10 = 1024
var sizeFormatter = function(fileSizeInBytes){
  if(fileSizeInBytes < 1<<10){
    return fileSizeInBytes + " bytes" ;
  } else if (fileSizeInBytes/(1<<10) <= 1<<10){
      var fileSizeInKBytes = fileSizeInBytes/(1<<10)
      return fileSizeInKBytes.toFixed(2) + " KB"
  } else if(fileSizeInBytes/(1<<20) <= 1<<10 ){
      var fileSizeInMBytes = fileSizeInBytes/(1<<20)
      return fileSizeInMBytes.toFixed(2) + " MB" ;
  } else {
      var fileSizeInGBytes = fileSizeInBytes/(1<<30)
      return fileSizeInGBytes.toFixed(2) + " GB" ;
  }
}

var getPieceSize = function(fileSize) {
    if(fileSize == 0){
      return 0 ;
    }
    var nb = Math.log2(fileSize/Math.min(fileSize, 1200));
		var power = Math.round(nb);
		return 1 << Math.max(power,1) ;
}

var InfoDictionary = module.exports = function InfoDictionary(path, mode){
    EventEmitter.call(this)
    this.path = path
    this.mode = mode
}

util.inherits(InfoDictionary, EventEmitter) ;

var listFilesInDirectory = function(infoDictInstance){
  // Walker options
  var path = infoDictInstance.path
  var walker  = walk.walk(path, { followLinks: false });


  walker.on('names', function (root, nodeNamesArray) {
          nodeNamesArray.sort(function (a, b) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
          });
  });

  walker.on('file', function(root, stat, next){
  // Add this file to the list of files
    var relativeDirectory = PATH_ENV.relative(path,root)
    var relativePath = relativeDirectory.length == 0 ? stat.name : relativeDirectory+PATH_ENV.sep+stat.name
    files.push(relativePath);
    filesSize.push(stat.size)
    totalSize += stat.size
    next();
  });

  walker.on('end', function(){
    files.forEach(function(element,index,array){
      console.log("File : "+element+" Size : "+sizeFormatter(filesSize[index]))
    }) ;
    var pieceSize = getPieceSize(totalSize)
    console.log("Total Size : "+ sizeFormatter(totalSize)+ " Piece Size : "+pieceSize);
    createInfoDictMultipleFiles(infoDictInstance, pieceSize) ;
  });
}

var createInfoDictMultipleFiles = function(infoDictInstance, pieceSize){
  var path_directory = infoDictInstance.path
  var infoDictionary = new BencodeDict();
  var filesDictList = [] ;
  var pieces_hash = []
  var combinedStream = CombinedStream.create() ;

  // TODO: Find a better way of using Combined Streams
  var bufferPosition = 0 ;
  var bufferSHA1 = Buffer.alloc(pieceSize)


  files.forEach(function(element, index, array){
    var absolutePath = path_directory + PATH_ENV.sep + element
    combinedStream.append(fs.createReadStream(absolutePath, {highWaterMark : pieceSize}))
    var fileDict = new BencodeDict()
    fileDict.putContent("length", filesSize[index])
    fileDict.putContent("path", element.split(PATH_ENV.sep))
    filesDictList.push(fileDict) ;
  });

  combinedStream.on('data', function(chunk) {
    /*console.log("BufferSHA1 Length : "+bufferSHA1.length)
    console.log("Available Bytes : "+ availableBytesInTheBuffer)
    console.log("Bytes Read :"+ chunk.length)*/
    var availableBytesInTheBuffer = bufferSHA1.length - bufferPosition
    chunk.copy(bufferSHA1, bufferPosition, 0, Math.min(chunk.length, availableBytesInTheBuffer))
    bufferPosition += Math.min(chunk.length, availableBytesInTheBuffer)

    if(chunk.length >= availableBytesInTheBuffer){
      var sha1_hash = crypto.createHash("sha1")
      sha1_hash.update(bufferSHA1)
      var digest = sha1_hash.digest()
      pieces_hash.push(digest)
      bufferPosition = 0
      if(chunk.length > availableBytesInTheBuffer){ // Some data still remaining
        chunk.copy(bufferSHA1, bufferPosition, availableBytesInTheBuffer, chunk.length)
        bufferPosition = chunk.length - availableBytesInTheBuffer
      }
    }
    //console.log("Available Bytes after filling the Buffer : "+ (bufferSHA1.length - bufferPosition))

  })

  combinedStream.on('end', function(){
    //Create the Hash of the last Piece
    if(bufferPosition > 0){
      var sha1_hash = crypto.createHash("sha1")
      sha1_hash.update(bufferSHA1)
      var digest = sha1_hash.digest()
      pieces_hash.push(digest)
      bufferPosition = 0
    }

    console.log("Nb Pieces : "+pieces_hash.length)
    pieces = Buffer.concat(pieces_hash) ;
    infoDictionary.putContent("piece length", pieceSize);
    infoDictionary.putContent("pieces", pieces)
    infoDictionary.putContent("name", PATH_ENV.basename(path_directory))
    infoDictionary.putContent("files", filesDictList)
    infoDictInstance.emit("info_end", infoDictionary)
  })
}



var createInfoDictSingleFile = function(infoDictInstance){
  var filepath = infoDictInstance.path
  var stats = fs.statSync(filepath)
  var fileSizeInBytes = stats["size"]
  console.log("File size "+fileSizeInBytes+" bytes")

  var pieceSize = getPieceSize(fileSizeInBytes)
  console.log("Piece size : "+pieceSize/1024+" kB")

  var pieces_hash = []
  var file_as_stream = fs.createReadStream(filepath,{ highWaterMark : pieceSize})

  file_as_stream.on("data", function(chunk){
    var sha1_hash = crypto.createHash("sha1")
    sha1_hash.update(chunk)
    var digest = sha1_hash.digest()
    pieces_hash.push(digest)
  })

  file_as_stream.on("end", function(){
    console.log("The File has been hashed.")
    var infoDictionary = new BencodeDict();
    infoDictionary.putContent("name", PATH_ENV.basename(filepath));
    infoDictionary.putContent("length", fileSizeInBytes);
    infoDictionary.putContent("piece length", pieceSize);
    infoDictionary.putContent("pieces", Buffer.concat(pieces_hash));
    console.log(infoDictionary.toString())
    console.log(pieces_hash.join("").length)
    infoDictInstance.emit("info_end", infoDictionary)
  })

}

InfoDictionary.prototype.create = function(){
  if(this.mode == "SINGLE_FILE_MODE"){
    createInfoDictSingleFile(this) ;
  } else { //MULTIPLE_FILE_MODE
    listFilesInDirectory(this);
  }
}
