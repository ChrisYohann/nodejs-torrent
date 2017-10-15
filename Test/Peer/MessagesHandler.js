require('any-promise/register/rsvp');
const Promise = require('any-promise');
const MessagesHandler = require("../../Peer/MessagesHandler");
const Messages = require("../../Peer/TorrentMessages");
const Choke = Messages.Choke;
const Unchoke = Messages.Unchoke;
const Interested = Messages.Interested;
const NotInterested = Messages.NotInterested;
const Have = Messages.Have;
const Bitfield = Messages.Bitfield;
const Request = Messages.Request;
const Piece = Messages.Piece;
const Cancel = Messages.Cancel;
const KeepAlive = Messages.KeepAlive;

//Test Modules
const mocha = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
const expect = chai.expect;
const assert = chai.assert;
chai.use(chaiAsPromised);

describe("### TEST MESSAGE HANDLER ###", function(){
    const messagesHandler = new MessagesHandler();
    describe("- Test Parsing Torrent Messages", function(){
    describe("Test Parsing Request/Cancel Message", function(){
      it("It should parse the Request message correctly", function(){
          const requestMessage = new Request(1, 2, 3);
          const requestMessageBuffer = requestMessage.send();
          const expectedResult = messagesHandler.parseTorrentMessage(requestMessageBuffer);
          expect(expectedResult.messageID).to.equal(6);
        expect(expectedResult.index).to.equal(1);
        expect(expectedResult.begin).to.equal(2);
        expect(expectedResult.length).to.equal(3)
      });

      it("It should parse the Cancel message correctly", function(){
          const cancelMessage = new Cancel(1, 2, 3);
          const cancelMessageBuffer = cancelMessage.send();
          const expectedResult = messagesHandler.parseTorrentMessage(cancelMessageBuffer);
          expect(expectedResult.messageID).to.equal(8);
        expect(expectedResult.index).to.equal(1);
        expect(expectedResult.begin).to.equal(2);
        expect(expectedResult.length).to.equal(3)
      })
    });
   describe("Test Parsing Piece Message", function(){
       const index = 1;
       const begin = 2;
       const firstPartPayload = Buffer.alloc(8);
       firstPartPayload.writeInt32BE(index, 0);
     firstPartPayload.writeInt32BE(begin, 4);
       const block = Buffer.allocUnsafe(5);
       const payload = Buffer.concat([firstPartPayload, block]);
       it("It should parse the Piece Message correctly", function(){
         const pieceMessage = new Piece(index, begin, block);
         const pieceMessageBuffer = pieceMessage.send();
         const expectedResult = messagesHandler.parseTorrentMessage(pieceMessageBuffer);
         expect(expectedResult.messageID).to.equal(7);
        expect(expectedResult.index).to.equal(1);
        expect(expectedResult.begin).to.equal(2);
        expect(expectedResult.length).to.equal(5);
        expect(expectedResult.payload).to.deep.equal(payload)
     });
     describe("Test Parsing KeepAlive", function(){
       it("It should return a KeepAlive Message", function(){
           const keepAlive = new KeepAlive();
           const expectedResult = messagesHandler.parseTorrentMessage(keepAlive.send());
           expect(expectedResult.lengthPrefix).to.equal(0)
       })
     })
   })
  })
});
