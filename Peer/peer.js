const MessagesHandler = require("./MessagesHandler");
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const Utils = require("../Utils");


let Peer = module.exports = function Peer(torrent, socket, peerId){
    EventEmitter.call(this);
    this.torrent = torrent;
    this.peerId = peerId;
    this.socket = socket;

    //Status Fields
    this.am_choking = true;
    this.am_interested = false;
    this.peer_choking = true;
    this.peer_interested = false;

    this.peer_bitfield = null;
    this.messageParser = (function(peerId){
        if(peerId == null){
            return new MessagesHandler(true);
        } else {
            return new MessagesHandler();
        }
    })(peerId);

};

util.inherits(Peer, EventEmitter);

Peer.prototype.initListeners = function(){

};

let receiveKeepAlive = function(){

};

let receiveChoke = function(){
    let self = this;
    self.peer_choking = true;
};

let receiveUnchoke = function(){
    let self = this;
    self.peer_choking = false;
};

let receiveInterested = function(){
    let self = this;
    self.peer_interested = true;
};

let receiveNotInterested = function(){
    let self = this;
    self.peer_interested = false;
};

let receiveHave = function(pieceIndex){
    let self = this;
    self.peer_bitfield = Utils.updateBitfield(self.peer_bitfield, pieceIndex);
};

let receiveBitfield = function(bitfield){
    let self = this;
    self.peer_bitfield = bitfield;
};

let receiveRequest = function(index, begin, length){
    let self = this;
    if(self.torrent.containsPiece(index)){
        self.torrent.read(index, begin, length).then(function(chunk){
            self.socket.send(chunk);
        });
    }
};

let receivePiece = function(index, begin, block){
    let self = this;
    if(self.torrent.containsPiece(index)){
        self.torrent.write(index, begin, block);
    }
};

let receiveCancel = function(index, begin, length){
    let self = this;
    //self.torrent.cancel(index, begin, length)
};
