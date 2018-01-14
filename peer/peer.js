const MessagesHandler = require("./messagesHandler");
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const Utils = require("../Utils");
const Queue = require('queue');
const Messages = require("./torrentMessages");
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


let Peer = module.exports = function Peer(torrent, socket, peerId){
    let self = this;
    EventEmitter.call(this);
    this.torrent = torrent;
    this.peerId = peerId;
    this.socket = socket;

    //Status Fields
    this.am_choking = true;
    this.am_interested = false;
    this.peer_choking = true;
    this.peer_interested = false;

    this.messageQueue = new Queue({autostart: true});
    this.nbPiecesCurrentlyDownloading = 0;

    this.peer_bitfield = null;
    this.messageParser = (function(peerId){
        if(peerId == null){
            return new MessagesHandler(true);
        } else {
            return new MessagesHandler();
        }
    })(peerId);
    this.initListeners();
    this.socket.on("data", this.messageParser.parseTorrentMessages);
};

util.inherits(Peer, EventEmitter);

Peer.prototype.initListeners = function(){
    let self = this;
    self.on("keepAlive", receiveKeepAlive.bind(self));
    self.on("choke", receiveChoke.bind(self));
    self.on("unchoke", receiveUnchoke.bind(self));
    self.on("interested", receiveInterested.bind(self));
    self.on("notInterested", receiveNotInterested.bind(self));
    self.on("have", receiveHave.bind(self));
    self.on("bitfield", receiveBitfield.bind(self));
    self.on("request", receiveRequest.bind(self));
    self.on("piece", receivePiece.bind(self));
    self.on("cancel", receiveCancel.bind(self));
};

Peer.prototype.addMessageToQueue = function(message){
    let self = this;
    const messageID = message.messageID;
    if(messageID != null){
        switch(messageID){
            case 0:
                self.messageQueue.push(function(cb){
                    self.am_choking = true;
                    self.socket.write(message.build(), () => {cb()});
                });
                break;
            case 1:
                self.messageQueue.push(function(cb){
                    self.am_choking = false;
                    self.socket.write(message.build(), () => {cb()});
                });
                break;
            case 2:
                self.messageQueue.push(function(cb){
                    self.am_interested = true;
                    self.socket.write(message.build(), () => {cb()});
                });
                break;
            case 3:
                self.messageQueue.push(function(cb){
                    self.am_interested = false;
                    self.socket.write(message.build(), () => {cb()});
                });
                break;
            default:
                self.messageQueue.push(function(cb){
                    self.socket.write(message.build(), () => {cb()});
                });
                break;
        }
    }
};

Peer.prototype.requestPiece = function(pieceIndex){};

Peer.prototype.containsPiece = function(index){
    let self = this;
    if (self.peer_bitfield != null){
        return Utils.bitfieldContainsPiece(self.peer_bitfield, index);
    } else {
        return false;
    }
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
            const message = new Piece(index, begin, chunk);
            self.addMessageToQueue(message);
        });
    }
};

let receivePiece = function(index, begin, block){
    let self = this;
    if(self.torrent.containsPiece(index)){
        self.torrent.write(index, begin, block).then(function(isCompleted){
            if (isCompleted){
                self.nbPiecesCurrentlyDownloading -= 1 ;
                self.emit("have", index);
            }
        });
    }
};

let receiveCancel = function(index, begin, length){
    let self = this;
    //self.torrent.cancel(index, begin, length)
};
