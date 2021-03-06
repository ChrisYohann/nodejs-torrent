let winston = require("winston") ;
let colors = require('colors');
let dateformat = require('dateformat');

let loggingColors = { error: 'red', warn: 'yellow', info: 'green', verbose: 'blue', debug: 'cyan', silly: 'magenta' };

let logger = new (winston.Logger)({
    transports : [
        new (winston.transports.File)({
            filename :  "./logs/output.log",
            timestamp : function(){
                return dateformat(Date.now(), "yyyy/mm/dd HH:MM:ss.l")
            },
            formatter: function(options) {
                //${colors[loggingColors[options.level]]["bold"](options.level.toUpperCase())}
                return `[${options.level.toUpperCase()}] ${options.timestamp()} ${(options.message ? options.message : '')}`;
                    //${(options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' )}` ;
            },
            colorize : false,
            json : false
        })
    ],
    colors : loggingColors,
    level : process.env.NODE_LEVEL || 'info'
});

module.exports = logger;
