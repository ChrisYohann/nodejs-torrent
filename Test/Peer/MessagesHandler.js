require('any-promise/register/rsvp');
const Promise = require('any-promise');
const MessagesHandler = require("../../peer/messagesHandler");
const Messages = require("../../peer/torrentMessages");
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
          const requestMessageBuffer = requestMessage.build();
          const expectedResult = messagesHandler.parseMessage(requestMessageBuffer);
          expect(expectedResult.messageID).to.equal(6);
        expect(expectedResult.index).to.equal(1);
        expect(expectedResult.begin).to.equal(2);
        expect(expectedResult.length).to.equal(3)
      });

      it("It should parse the Cancel message correctly", function(){
          const cancelMessage = new Cancel(1, 2, 3);
          const cancelMessageBuffer = cancelMessage.build();
          const expectedResult = messagesHandler.parseMessage(cancelMessageBuffer);
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
         const pieceMessageBuffer = pieceMessage.build();
         const expectedResult = messagesHandler.parseMessage(pieceMessageBuffer);
         expect(expectedResult.messageID).to.equal(7);
        expect(expectedResult.index).to.equal(1);
        expect(expectedResult.begin).to.equal(2);
        expect(expectedResult.length).to.equal(5);
        expect(expectedResult.payload).to.deep.equal(payload)
     });
     describe("Test Parsing KeepAlive", function(){
       it("It should return a KeepAlive Message", function(){
           const keepAlive = new KeepAlive();
           const expectedResult = messagesHandler.parseMessage(keepAlive.build());
           expect(expectedResult.lengthPrefix).to.equal(0)
       })
     })
   })
  });
    describe("- Test Parsing Streaming Torrent Messages", function(){
      const indexFirstPiece = 1;
      const beginFirstPiece = 2;
      const firstPartPayloadFirstPiece = Buffer.alloc(8);
      firstPartPayloadFirstPiece.writeInt32BE(indexFirstPiece, 0);
      firstPartPayloadFirstPiece.writeInt32BE(beginFirstPiece, 4);
      const blockFirstPiece = Buffer.allocUnsafe(5);
      const payloadFirstPiece = Buffer.concat([firstPartPayloadFirstPiece, blockFirstPiece]);
      const pieceMessage = new Piece(indexFirstPiece, beginFirstPiece, blockFirstPiece);
      const pieceMessageBuffer = pieceMessage.build();
      const requestMessage = new Request(1, 2, 3);
      const requestMessageBuffer = requestMessage.build();
      const bigBuffer = Buffer.concat([pieceMessageBuffer, requestMessageBuffer]);
      it("It should parse the 2 messages Correctly", function(){
        const messages = messagesHandler.parseTorrentMessages(bigBuffer);
        expect(messages).to.deep.equal([pieceMessage, requestMessage]);
      });
      it("It should return the first messages then the second", function(){
        const splittedMessageFirstPart = bigBuffer.slice(0, 25);
        const splittedMessageSecondPart = bigBuffer.slice(25);
        const firstMessage = messagesHandler.parseTorrentMessages(splittedMessageFirstPart);
        const secondMessage = messagesHandler.parseTorrentMessages(splittedMessageSecondPart);
        expect(firstMessage[0]).to.deep.equal(pieceMessage);
        expect(secondMessage[0]).to.deep.equal(requestMessage);
      });
    });
});
