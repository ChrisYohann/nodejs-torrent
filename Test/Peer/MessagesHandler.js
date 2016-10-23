require('any-promise/register/rsvp')
var Promise = require('any-promise')
var MessagesHandler = require("../../Peer/MessagesHandler")
var Messages = require("../../Peer/TorrentMessages")
var Choke = Messages.Choke
var Unchoke = Messages.Unchoke
var Interested = Messages.Interested
var NotInterested = Messages.NotInterested
var Have = Messages.Have
var Bitfield = Messages.Bitfield
var Request = Messages.Request
var Piece = Messages.Piece
var Cancel = Messages.Cancel
var KeepAlive = Messages.KeepAlive

//Test Modules
var mocha = require('mocha');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var should = chai.should();
var expect = chai.expect
var assert = chai.assert
chai.use(chaiAsPromised);

describe("### TEST MESSAGE HANDLER ###", function(){
  var messagesHandler = new MessagesHandler()
  describe("- Test Parsing Torrent Messages", function(){
    describe("Test Parsing Request/Cancel Message", function(){
      it("It should parse the Request message correctly", function(){
        var requestMessage = new Request(1,2,3)
        var requestMessageBuffer = requestMessage.send()
        var expectedResult = messagesHandler.parseTorrentMessage(requestMessageBuffer)
        expect(expectedResult.messageID).to.equal(6)
        expect(expectedResult.index).to.equal(1)
        expect(expectedResult.begin).to.equal(2)
        expect(expectedResult.length).to.equal(3)
      })

      it("It should parse the Cancel message correctly", function(){
        var cancelMessage = new Cancel(1,2,3)
        var cancelMessageBuffer = cancelMessage.send()
        var expectedResult = messagesHandler.parseTorrentMessage(cancelMessageBuffer)
        expect(expectedResult.messageID).to.equal(8)
        expect(expectedResult.index).to.equal(1)
        expect(expectedResult.begin).to.equal(2)
        expect(expectedResult.length).to.equal(3)
      })
    })
   describe("Test Parsing Piece Message", function(){
     var index = 1
     var begin = 2
     var firstPartPayload = Buffer.alloc(8)
     firstPartPayload.writeInt32BE(index, 0)
     firstPartPayload.writeInt32BE(begin, 4)
     var block = Buffer.allocUnsafe(5)
     var payload = Buffer.concat([firstPartPayload, block])
     it("It should parse the Piece Message correctly", function(){
        var pieceMessage = new Piece(index, begin, block)
        var pieceMessageBuffer = pieceMessage.send()
        var expectedResult = messagesHandler.parseTorrentMessage(pieceMessageBuffer)
        expect(expectedResult.messageID).to.equal(7)
        expect(expectedResult.index).to.equal(1)
        expect(expectedResult.begin).to.equal(2)
        expect(expectedResult.length).to.equal(5)
        expect(expectedResult.payload).to.deep.equal(payload)
     })
     describe("Test Parsing KeepAlive", function(){
       it("It should return a KeepAlive Message", function(){
         var keepAlive = new KeepAlive()
         var expectedResult = messagesHandler.parseTorrentMessage(keepAlive.send())
         expect(expectedResult.lengthPrefix).to.equal(0)
       })
     })
   })
  })
})
