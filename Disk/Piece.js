var Promise = require('rsvp').Promise;
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
let logger = require("../log")

var Piece = module.exports = function Piece(sha1FingerPrint, pieceLength){
  this.sha1 = sha1FingerPrint;
  this.length = pieceLength || 0;
  this.files = [];
  this.blocks = []
};

Piece.prototype.getLength = function(){
  return this.length ;
};

Piece.prototype.write = function(begin, block){
  var piece = this;
  if(block.length + begin > this.getLength())
    throw "Write Error : Length ("+length+ ") has to be less than bytes available in this piece";

  var jobs = [];
  var newBegin = begin ;
  var blockRemaining = block;
  var filePointerIndex = getFilePointerIndex.call(this, begin);

  do {
    var filePointer = this["files"][filePointerIndex];
    var file = filePointer.getFile();
    var bytesToWrite = blockRemaining.length;

    logger.debug("Bytes to write : "+bytesToWrite)

    var bytesAvailableInCurrentFile = file.length - filePointer.getFileOffset() - newBegin;
    var bytesRemaining = bytesToWrite - bytesAvailableInCurrentFile;
    logger.debug("Bytes Remaining : "+ bytesRemaining)
    logger.debug("Available : "+bytesAvailableInCurrentFile);
    var isOverlap = bytesRemaining > 0;
    if(isOverlap)
      logger.debug("Piece may overlapping 2 files. Bytes remaining to write : "+bytesRemaining);

    var p = new Promise(function(resolve, reject){
      (function(){
        logger.debug("Bytes to Write : "+ bytesToWrite +" Bytes available :"+ bytesAvailableInCurrentFile)
        var bytesWritten = Math.min(bytesToWrite, bytesAvailableInCurrentFile);
        file.write(filePointer.getFileOffset() + newBegin,
                   blockRemaining.slice(0, bytesWritten),
                   function (err){
                     if(err){
                       logger.error(err);
                       reject(err);
                     } else {
                        piece.insertBlock(begin, block.length);
                        piece.mergeBlocks();
                        if(piece.isCompleted()){
                          piece.checkSha1().then(function(isCompleted){
                            if(!isCompleted){
                              piece.blocks = []
                            }
                          })
                        }
                        resolve(bytesWritten)
                     }
                   })
      })();
      });
    jobs.push(p);
    newBegin = 0;
    bytesToWrite = bytesRemaining;
    blockRemaining = block.slice(bytesAvailableInCurrentFile);
    filePointerIndex++
  } while (isOverlap) ;

  return Promise.all(jobs).then(function(bytesWrittenArray){
      return bytesWrittenArray.reduce(function(a,b){
      return a + b ;
    }, 0);
  }).catch(function(error){
    logger.error(error)
  })

};

Piece.prototype.read = function(begin, length){
  if(this.getLength() - begin < length)
    throw "Length ("+length+ ") has to be less than bytes available in this piece";

  var jobs = [];
  var newBegin = begin ;
  var newLength = length;
  var filePointerIndex = getFilePointerIndex.call(this, begin);

  do {
    logger.debug(filePointer)
    var filePointer = this["files"][filePointerIndex];
    var file = filePointer.getFile();
    var fileLength = file.opened ? file.length : filePointer.getFileLength();

    logger.debug("File length : "+file.length)
    logger.debug("Bytes to read : "+newLength)

    var bytesAvailableInCurrentFile = fileLength - filePointer.getFileOffset() - newBegin;
    var bytesRemaining = newLength - bytesAvailableInCurrentFile;
    logger.debug("Bytes Remaining : "+ bytesRemaining)
    var isOverlap = bytesRemaining > 0;
    if(isOverlap)
      logger.debug("Piece may overlapping 2 files. Bytes remaining to read : "+bytesRemaining);

    var p = new Promise(function(resolve, reject){
      file.read(filePointer.getFileOffset() + newBegin,
                Math.min(newLength, bytesAvailableInCurrentFile),
                function(error, buffer){
                  if(error)
                    reject(error);
                  else
                  resolve(buffer)
                })
    });
    jobs.push(p);
    newBegin = 0;
    newLength = bytesRemaining;
    filePointerIndex++
  } while (isOverlap) ;

  return Promise.all(jobs).then(function(listBuffers){
    return Buffer.concat(listBuffers)
  })
};

Piece.prototype.addSeekPointer = function(cursor){
  this.files.push(cursor)
};

Piece.prototype.getPointerIndex = getFilePointerIndex;

Piece.prototype.mergeBlocks = function(){
  var nbBlocks = this.blocks.length;
  var i = 0 ;
  while(i < nbBlocks-1){
    var prevBlockBegin = this.blocks[i]["begin"];
    var prevBlockLength = this.blocks[i]["size"];
    var nextBlockBegin = this.blocks[i+1]["begin"];
    var nextBlockLength = this.blocks[i+1]["size"];
      if(prevBlockBegin+prevBlockLength >= nextBlockBegin){ //Overlap
        if(prevBlockBegin+prevBlockLength < nextBlockBegin+nextBlockLength){
          var pieceBlock = new PieceBlock(prevBlockBegin, nextBlockBegin+nextBlockLength-prevBlockBegin);
          this.blocks.splice(i, 2, pieceBlock);
          nbBlocks-- ;
        } else {
          this.blocks.splice(i+1,1);
          nbBlocks-- ;
        }
      } else {
        i++
      }
  }
};

Piece.prototype.insertBlock = function(begin, length){
  var rightIndex = 0 ;
  var i = 0 ;
  while((i < this.blocks.length) && (begin >= this.blocks[i]["begin"])){
    if(begin == this.blocks[i]["begin"]){
      rightIndex = length > this.blocks[i]["size"] ? i : i+1;
      break ;
    }
    i++ ;
    rightIndex++ ;
  }
  this.blocks.splice(rightIndex, 0, new PieceBlock(begin, length));
  //this.mergeBlocks();
};

Piece.prototype.getCompleted = function(){
  var totalCompleted = 0;
  this.blocks.forEach(function(block){
    totalCompleted += block.size
  });
  return totalCompleted ;
};

Piece.prototype.isCompleted = function(){
  return this.getCompleted == this.length
};

Piece.prototype.checkSha1 = function(){
  var sha1Print = this.sha1;
  return this.read(0, this.length).then(function(data){
    logger.debug("Data : "+data.toString("hex"))
    var sha1_hash = crypto.createHash("sha1");
    sha1_hash.update(data);
    var digest = sha1_hash.digest();
    return digest.equals(sha1Print)
  })
};

function getFilePointerIndex(begin){
  var nbFiles = this.files.length;
  for( var i = 0 ; i<nbFiles-1 ; i++){
    var pointerPieceOffset = this["files"][i].getPieceOffset();
    var nextPointerPieceOffset = this["files"][i+1].getPieceOffset();
      if(begin >= pointerPieceOffset && nextPointerPieceOffset > begin ){
        return i ;
      }
  }
  return i ;
}

function PieceBlock(begin, length){
  this.begin = begin ;
  this.size = length;

  /*this.toString = function(){
      return "Block index :" + this.begin + " length :" + this.size;
  }*/
}
