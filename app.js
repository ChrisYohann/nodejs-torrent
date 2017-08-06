let logger = require("./log")
let net = require("net")
let ui = require("./UI/ui")

let MIN_BITTORENT_PORT = 6881
let MAX_BITTORENT_PORT = 6889
let app_port = MIN_BITTORENT_PORT

function getPort (callback) {
    let port = app_port
    app_port += 1
    logger.verbose(`Attempting to bind at port ${port} ...`)

    let server = net.createServer() ;

    server.listen(app_port, function(){
      logger.info(`Server listening at ${port}`);
      callback(port);
    })

    server.on("error", function(err){
        logger.debug(err)
        logger.error(`Unable to Bind at port ${port}. Trying next`)
        getPort(callback)
    });
}

getPort(function(port){logger.info("YEAH")});

