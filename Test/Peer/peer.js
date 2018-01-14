const Torrent = require("../../Torrent/torrent");
const Peer = require("../../peer/peer");
const net = require("net");
const Utils = require("../../Utils");
const Request = require("../../peer/torrentMessages");

//Test Modules
const mocha = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
const expect = chai.expect;
const assert = chai.assert;
chai.use(chaiAsPromised);

const testSingleFile = "./files/file1";
const updateBitfieldWithPieces = (peer, piecesIndexes) => {
    piecesIndexes.forEach((pieceIndex) => {
        peer.peer_bitfield = Utils.updateBitfield(peer.peer_bitfield, pieceIndex);
    })
};

describe("### TEST PEER FUNCTIONS ###", function(){
    let peer1 = null;
    let torrent = null;

    this.timeout(15000);
    beforeEach("Load Torrent" ,function(done){
        torrent = new Torrent(`${testSingleFile}.torrent`, `${testSingleFile}.bin`);
        torrent.on("verified", (c) => {
            console.log("Torrent Verified");
            peer1 = new Peer(torrent, new net.Socket(), "peer1");
            peer1.peer_bitfield = Buffer.alloc(2);
            torrent.activePeers.push(peer1);
            done();});
    });

    describe("Test Create Block Requests function", function(){
        it("It should create block Requests correctly", function(){
           const requests = peer1.createRequestMessages(0, 333);
           requests.forEach((request) => {console.log(`Request Index = ${request.index}, Begin = ${request.begin}, Length = ${request.length}`)});
        });
    });
});