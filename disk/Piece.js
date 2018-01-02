const Promise = require('rsvp').Promise;
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
let logger = require("../log");

const Piece = module.exports = function Piece(sha1FingerPrint, pieceLength) {
    this.sha1 = sha1FingerPrint;
    this.length = pieceLength || 0;
    this.files = [];
    this.blocks = []
};

Piece.prototype.getLength = function(){
  return this.length ;
};

Piece.prototype.write = function(begin, block){
    const piece = this;
    if(block.length + begin > this.getLength())
    throw "Write Error : Length ("+length+ ") has to be less than bytes available in this piece";

    const jobs = [];
    let newBegin = begin;
    let blockRemaining = block;
    let filePointerIndex = getFilePointerIndex.call(this, begin);

    do {
      const filePointer = this["files"][filePointerIndex];
      const file = filePointer.getFile();
      let bytesToWrite = blockRemaining.length;

      logger.silly("Bytes to write : "+bytesToWrite);

      const bytesAvailableInCurrentFile = file.length - filePointer.getFileOffset() - newBegin;
      const bytesRemaining = bytesToWrite - bytesAvailableInCurrentFile;
      logger.silly("Bytes Remaining : "+ bytesRemaining);
    logger.silly("Available : "+bytesAvailableInCurrentFile);
    var isOverlap = bytesRemaining > 0;
    if(isOverlap)
      logger.silly("Piece may overlapping 2 files. Bytes remaining to write : "+bytesRemaining);

      const p = new Promise(function (resolve, reject) {
          (function () {
              logger.silly("Bytes to Write : " + bytesToWrite + " Bytes available :" + bytesAvailableInCurrentFile);
              const bytesWritten = Math.min(bytesToWrite, bytesAvailableInCurrentFile);
              file.write(filePointer.getFileOffset() + newBegin,
                  blockRemaining.slice(0, bytesWritten),
                  function (err) {
                      if (err) {
                          logger.error("Error in Writing Piece");
                          logger.error(err);
                          reject(err);
                      } else {
                          piece.insertBlock(begin, block.length);
                          piece.mergeBlocks();
                          if (piece.isCompleted()) {
                              piece.checkSha1().then(function (isCompleted) {
                                  if (!isCompleted) {
                                      piece.blocks = []
                                  }
                              })
                          }
                          resolve(bytesWritten);
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
    logger.error("Global Error in Writing Pieces");
    logger.error(error)
  })

};

Piece.prototype.read = function(begin, length){
  if(this.getLength() - begin < length)
    throw "Length ("+length+ ") has to be less than bytes available in this piece";

    const jobs = [];
    let newBegin = begin;
    let newLength = length;
    let filePointerIndex = getFilePointerIndex.call(this, begin);

    do {
    logger.silly(filePointer);
    var filePointer = this["files"][filePointerIndex];
      const file = filePointer.getFile();
      const fileLength = file.opened ? file.length : filePointer.getFileLength();

      logger.silly("File length : "+file.length);
    logger.silly("Bytes to read : "+newLength);

      const bytesAvailableInCurrentFile = fileLength - filePointer.getFileOffset() - newBegin;
      const bytesRemaining = newLength - bytesAvailableInCurrentFile;
      logger.silly("Bytes Remaining : "+ bytesRemaining);
    var isOverlap = bytesRemaining > 0;
    if(isOverlap)
      logger.silly("Piece may overlapping 2 files. Bytes remaining to read : "+bytesRemaining);

      const p = new Promise(function (resolve, reject) {
          file.read(filePointer.getFileOffset() + newBegin,
              Math.min(newLength, bytesAvailableInCurrentFile),
              function (error, buffer) {
                  if (error)
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
    let nbBlocks = this.blocks.length;
    let i = 0;
    while(i < nbBlocks-1){
      const prevBlockBegin = this.blocks[i]["begin"];
      const prevBlockLength = this.blocks[i]["size"];
      const nextBlockBegin = this.blocks[i + 1]["begin"];
      const nextBlockLength = this.blocks[i + 1]["size"];
      if(prevBlockBegin+prevBlockLength >= nextBlockBegin){ //Overlap
        if(prevBlockBegin+prevBlockLength < nextBlockBegin+nextBlockLength){
            const pieceBlock = new PieceBlock(prevBlockBegin, nextBlockBegin + nextBlockLength - prevBlockBegin);
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
    let rightIndex = 0;
    let i = 0;
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
    let totalCompleted = 0;
    this.blocks.forEach(function(block){
    totalCompleted += block.size
  });
  return totalCompleted ;
};

Piece.prototype.isCompleted = function(){
  return this.getCompleted == this.length
};

Piece.prototype.checkSha1 = function(){
    const sha1Print = this.sha1;
    return this.read(0, this.length).then(function(data){
    logger.silly("MoreData : "+data.toString("hex"));
      const sha1_hash = crypto.createHash("sha1");
      sha1_hash.update(data);
      const digest = sha1_hash.digest();
      return digest.equals(sha1Print)
  })
};

function getFilePointerIndex(begin){
    const nbFiles = this.files.length;
    for( var i = 0 ; i<nbFiles-1 ; i++){
      const pointerPieceOffset = this["files"][i].getPieceOffset();
      const nextPointerPieceOffset = this["files"][i + 1].getPieceOffset();
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
