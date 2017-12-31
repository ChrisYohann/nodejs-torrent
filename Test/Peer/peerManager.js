const Torrent = require("../../Torrent/Torrent");
const Peer = require("../../peer/peer");
const PeerManager = require("../../peer/peerManager");
const net = require("net");
const Utils = require("../../Utils");

//Test Modules
const mocha = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
const expect = chai.expect;
const assert = chai.assert;
chai.use(chaiAsPromised);

const testSingleFile = "./Test/disk/TestFiles/testSingleFile";
const updateBitfieldWithPieces = (peer, piecesIndexes) => {
    piecesIndexes.forEach((pieceIndex) => {
        peer.peer_bitfield = Utils.updateBitfield(peer.peer_bitfield, pieceIndex);
    })
};

describe("### TEST PEER MANAGER ###", function(){
    let peer1 = null;
    let peer2 = null;
    let peer3 = null;
    let peerManager = null;
    let torrent = null;

    this.timeout(15000);
    beforeEach("Load Torrent" ,function(done){
        torrent = new Torrent(`${testSingleFile}.torrent`, `${testSingleFile}.bin`);
        torrent.on("verified", (c) => {
            console.log("Torrent Verified");
            torrent.bitfield = Buffer.alloc(torrent.bitfield.length);
            peer1 = new Peer(torrent, new net.Socket(), "peer1");
            peer2 = new Peer(torrent, new net.Socket(), "peer2");
            peer3 = new Peer(torrent, new net.Socket(), "peer3");
            peerManager = new PeerManager(torrent);
            peer1.peer_bitfield = Buffer.alloc(2);
            peer2.peer_bitfield = Buffer.alloc(2);
            peer3.peer_bitfield = Buffer.alloc(2);
            torrent.activePeers.push(peer1);
            torrent.activePeers.push(peer2);
            torrent.activePeers.push(peer3);
            done();});
    });

    describe("Test Choose Peers To Request Piece", function(){
        it("It should map Manage request between peers", function(){
            updateBitfieldWithPieces(peer1, [1, 2, 3, 5]);
            updateBitfieldWithPieces(peer2, [0, 1, 4, 5]);
            updateBitfieldWithPieces(peer3, [0, 1, 6, 7, 8, 9]);
            console.log(torrent.bitfield);
            console.log(peer1.peer_bitfield);
            console.log(peer2.peer_bitfield);
            console.log(peer3.peer_bitfield);
            const pieceRequests = peerManager.preparePiecesRequests();
            const pieceRequests2 = peerManager.preparePiecesRequests();
            pieceRequests.forEach(function(element){
                console.log(`Peer : ${element.peer.peerId}; Piece Index : ${element.pieceIndex}`);
            })
            pieceRequests2.forEach(function(element){
                console.log(`Peer : ${element.peer.peerId}; Piece Index : ${element.pieceIndex}`);
            })
        });
    });
});