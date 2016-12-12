const http = require("http")
const Utils = require("../Utils")

var compact2string = require("compact2string");
var Tracker = require("./Tracker")
var util = require('util')
var Decode = require("../Bencode/Decode")

var HTTPTracker = module.exports = function HTTPTracker(clientTorrent, announceURL){
  Tracker.call(this, clientTorrent, announceURL)
}

util.inherits(HTTPTracker, Tracker)

HTTPTracker.prototype.prepareHTTPRequest = function(torrentEvent){
  var torrentInfos = this.client
  var requestParams = {
    info_hash : Utils.createInfoHash(this._metaData["info"]),
    peer_id : Buffer.allocUnsafe(20),
    port : torrentInfos.getListeningPort(),
    uploaded : torrentInfos.getUploaded(),
    downloaded : torrentInfos.getDownloaded(),
    left : 0,
    compact : 1,
    event : torrentEvent
  }
  var httpRequest = this.announceURL+"?"+Utils.stringify(requestParams)
  return httpRequest
}

HTTPTracker.prototype.executeHTTPRequest = function(torrentEvent){
  var self = this
  var httpRequest = this.prepareHTTPRequest(torrentEvent)
  console.log(httpRequest)
  http.get(httpRequest, function(response){
    console.log("Response Status Code : "+response.statusCode)
    console.log("Response Status Message : "+response.statusMessage)
    var responseBody = ''

    response.on("data", function(chunk){
        responseBody += chunk
      })

    response.on("end", function(){
        var bufferedData = Buffer.from(responseBody)
        var bencodedResponse = new Decode(bufferedData)
        if(!("failure reason" in bencodedResponse)){
          console.log(bencodedResponse)
          callBackTrackerResponseHTTP.call(self, bencodedResponse)
        } else {
          console.log("FAILURE REASON")
          console.log(bencodedResponse)
        }
      })
   })
 }


var callBackTrackerResponseHTTP = function(bencodedResponse){
  this.interval = bencodedResponse["interval"]
  if("tracker id" in bencodedResponse){
    this.trackerID = bencodedResponse["tracker id"]
  }
  if("peers" in bencodedResponse){
    var peerList = compact2string.multi(bencodedResponse["peers"])
    console.log("peers : "+peerList)
  }

  if("peers6" in bencodedResponse){
    var peer6List = compact2string.multi6(bencodedResponse["peers6"])
    console.log("peer6List : "+peer6List)
  }

}