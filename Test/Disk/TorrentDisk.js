require('any-promise/register/rsvp')
var randomAccessFile = require('random-access-file')
var SeekPointer = require("../../Disk/SeekPointer.js")
var Piece = require("../../Disk/Piece.js")
var Promise = require('any-promise')
var fsp = require('fs-promise')
var crypto = require('crypto')
var mocha = require('mocha')
var fs = require("fs")
var os = require('os');
var Decode = require("../../Bencode/Decode")
var TorrentDisk = require("../../Disk/TorrentDisk")
var path = require("path")

//Test Modules
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var should = chai.should();
var expect = chai.expect
var assert = chai.assert
chai.use(chaiAsPromised);



const testSingleFile = "./Test/Disk/TestFiles/testSingleFile"
const testMultipleFiles = "./Test/Disk/TestFiles/TestMultipleFiles"


describe("### TORRENT DISK TESTS ###", function(){
  describe("*** Init Torrent Disk***", function(){
    var parsedTorrentSingleFile = new Decode(testSingleFile+".torrent")
    var torrentDiskSingleFile = new TorrentDisk(parsedTorrentSingleFile, testSingleFile+".bin")
    var parsedTorrentMultipleFiles = new Decode(testMultipleFiles+".torrent")
    var torrentDiskMultipleFiles = new TorrentDisk(parsedTorrentMultipleFiles, testMultipleFiles)

    beforeEach(function(){
      torrentDiskMultipleFiles.clear()
      torrentDiskSingleFile.clear()
    })

    describe("Test computeTotalSize function", function(){
      it("It should compute the right Total Size", function(){
        expect(torrentDiskSingleFile["totalSize"]).to.equal(10)
        expect(torrentDiskMultipleFiles["totalSize"]).to.equal(22)
      })
    })

    describe("Test Init Files function", function(){
      describe("Retrieve path of all the files in the torrent in Single File Mode", function(){
        it("It should only put the filepath attribute in fileNames List", function(){
          torrentDiskSingleFile.retrieveFileNamesAndLengths();
          expect(torrentDiskSingleFile.fileNamesPath).to.deep.equal([testSingleFile+".bin"])
        })
      })

      describe("Retrieve path of all the files in the torrent in Multiple Files Mode ", function(){
        it("It should retrieve the relative path for all the files in the Torrent", function(){
          torrentDiskMultipleFiles.retrieveFileNamesAndLengths();
          expect(torrentDiskMultipleFiles.fileNamesPath).to.deep.equal([testMultipleFiles+path.sep+"File1.bin", testMultipleFiles+path.sep+"File2.bin"])
        })
      })
    })

    describe("Init Pieces Single File", function(){
      it("It should init cursor to the right place", function(){
        torrentDiskSingleFile.initPieces()
        for(var i = 0 ; i<10 ; i++){
          torrentDiskSingleFile.pieces[i]["files"].forEach(function(fileCursor){
            var filename = fileCursor.getFile().filename
            var offsetFile = fileCursor.getFileOffset()
            var offsetPiece = fileCursor.getPieceOffset()
            var result = { name : filename, fileOffset : offsetFile, pieceOffset : offsetPiece}
            expect(result).to.eql({name : testSingleFile+".bin", fileOffset : i, pieceOffset : 0})
          })
        }
      })
    })

    describe("Init Pieces multipleFiles with Piece overlap", function(){
      it("Test several files function", function(){
        torrentDiskMultipleFiles.initPieces()
        var actualResult = []
          torrentDiskMultipleFiles.pieces[5]["files"].forEach(function(fileCursor){
            var filename = fileCursor.getFile().filename
            var offsetFile = fileCursor.getFileOffset()
            var offsetPiece = fileCursor.getPieceOffset()
            var result = { name : filename, fileOffset : offsetFile, pieceOffset : offsetPiece}
            actualResult.push(result)
          })
          expect(actualResult).to.eql([{name : testMultipleFiles+path.sep+"File1.bin", fileOffset : 10, pieceOffset : 0}, {name : testMultipleFiles+path.sep+"File2.bin", fileOffset : 0, pieceOffset : 1}])
      })
    })
  })

  describe("Test verify function for Single File", function(){
    var parsedTorrentSingleFile = new Decode(testSingleFile+".torrent")
    var torrentDiskSingleFile = new TorrentDisk(parsedTorrentSingleFile, testSingleFile+".bin")

    describe("Test verify on a 100% completed File", function(){
      it("The function should return the length of the file", function(){
        //torrentDiskSingleFile.initPieces()
        return torrentDiskSingleFile.verify().should.eventually.equal(10)
      })
    })
  })

  describe("Test verify function for MultipleFiles", function(){
    var parsedTorrentMultipleFiles = new Decode(testMultipleFiles+".torrent")
    var torrentDiskMultipleFiles = new TorrentDisk(parsedTorrentMultipleFiles, testMultipleFiles)

    describe("Test verify function on a 100% completed Files", function(){
      it("The function should return the sum of both files lengths", function(){
        //torrentDiskMultipleFiles.initPieces()
        console.log(`Total Size : ${torrentDiskMultipleFiles.totalSize} ; Piece Length : ${torrentDiskMultipleFiles["metaFile"]["info"]["piece length"]}`)
        return torrentDiskMultipleFiles.verify().should.eventually.equal(22)
      })
    })

  })

  describe("Test Bitfield function for SingleFile", function(){
    var parsedTorrentSingleFile = new Decode(testSingleFile+".torrent")
    var torrentDiskSingleFile = new TorrentDisk(parsedTorrentSingleFile, testSingleFile+".bin")

    describe("Test BitField function on a 100% completed File", function(){
      it("All the index for 10 pieces should be set to 1", function(){
        //torrentDiskSingleFile.initPieces()
        var expectedResult = Buffer.from([0xff, 0xc0])
        return torrentDiskSingleFile.getBitfieldFromFile().should.eventually.deep.equal(expectedResult)
      })
    })
  })

  describe("Test Bitfield function for MultipleFiles", function(){
    var parsedTorrentMultipleFiles = new Decode(testMultipleFiles+".torrent")
    var torrentDiskMultipleFiles = new TorrentDisk(parsedTorrentMultipleFiles, testMultipleFiles)

    describe("Test BitField function on a 100% completed File", function(){
      it("All the index for 11 pieces should be set to 1", function(){
        //torrentDiskMultipleFiles.initPieces()
        var expectedResult = Buffer.from([0xff, 0xe0])
        return torrentDiskMultipleFiles.getBitfieldFromFile().should.eventually.deep.equal(expectedResult)
      })
    })
  })
})
