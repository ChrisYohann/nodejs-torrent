const randomAccessFile = require('random-access-file');

const SeekPointer = module.exports = function SeekPointer(file, fileOffset, pieceOffset, fileLength) {
    this._file = file;
    this._fileOffset = fileOffset;
    this._pieceOffset = pieceOffset;
    this._fileLength = fileLength || 0
};

SeekPointer.prototype.getFile = function(){
  return this._file ;
};

SeekPointer.prototype.getFileOffset = function(){
  return this._fileOffset
};

SeekPointer.prototype.getPieceOffset = function(){
  return this._pieceOffset
};

SeekPointer.prototype.getFileLength = function(){
  return this._fileLength
};
