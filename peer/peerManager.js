const _ = require('underscore');

let PeerManager = module.exports = function PeerManager(torrent){
    let self = this;
    this.torrent = torrent;
    this.activePeers = torrent.activePeers;
    this.nbPieces = torrent._torrentDisk.nbPieces;
    this.rarestPieces = {} ;
    this.nonRequestedPieces = _.filter(_.range(self.nbPieces), function(pieceIndex){return !torrent.containsPiece(pieceIndex);});
};

PeerManager.prototype.gatherAllBitfields = function(){
    let self = this;
    const rangeNbPieces = _.range(self.nbPieces);
    const piecesCompletedByEachPeer = _.map(self.activePeers, function(peer){
        return _.filter(rangeNbPieces, function(index){
            return peer.containsPiece(index);
        });
    });
    const countByPieceIndex = _.countBy(_.flatten(piecesCompletedByEachPeer), function(pieceIndex){
        return pieceIndex;
    });
    self.rarestPieces = countByPieceIndex;
};

PeerManager.prototype.addBlocksToRequest = function(){};