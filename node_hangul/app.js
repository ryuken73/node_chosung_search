const express = require('express'); 
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const routes = require('./routes/index');
const users = require('./routes/users');

const ibmdb = require('./lib/ibm_db');

const configAbsolutePath = path.resolve('./config.json');
const dbConfigAbsolutePath = path.resolve('./dbconfig.json');
const pkgConfigResolver = require('./util/pkgConfigResolver');
const config = pkgConfigResolver.getConfig(configAbsolutePath);
const dbconfig = pkgConfigResolver.getConfig(dbConfigAbsolutePath);
// const heapdump = require('heapdump');

const MUSICDB_CONNECTION_STRING = dbconfig.DB2['MUSICDB'];
global.SRC_FILE = config.SRC_FILE || 'c:/temp/song_mst.txt';
global.SEARCH_TIMEOUT = config.SEARCH_TIMEOUT || 10000;
global.CLEAR_TIMEOUT = config.CLEAR_TIMEOUT || 5000;
global.MAX_SEARCH_RETURN_COUNT = config.MAX_SEARCH_RETURN_COUNT || 500;
global.NUMBER_OF_WORKER = config.NUMBER_OF_WORKER === undefined ? 5 : config.NUMBER_OF_WORKER ;
global.NUMBER_OF_CACHE = config.NUMBER_OF_CACHE === undefined ? 2 : config.NUMBER_OF_CACHE ;
global.RESULT_LIMIT_WORKER = config.RESULT_LIMIT_WORKER || 1000;
global.PORT = config.PORT || 3000;
global.INDEXING_BYTES = (config.INDEXING_BYTES === undefined || config.INDEXING_BYTES === 0 || config.INDEXING_BYTES === "0") 
                        ? 0 
                        : config.INDEXING_BYTES; 
// global.LOG_LEVEL = config.LOG_LEVEL || 'info';
global.MONITOR_BROADCAST_INTERVAL = config.MONITOR_BROADCAST_INTERVAL || 500;
global.EXPRESS_REQ_TIMEOUT = config.EXPRESS_REQ_TIMEOUT || 300000;
global.NUMBER_OF_COLUMNS_FROM_FILE = config.NUMBER_OF_COLUMNS_FROM_FILE || 2;
global.TOTAL_COUNT_SQL = config.TOTAL_COUNT_SQL || 'select count(*) as total from music.song_mst ';
global.INDEX_DATA_SQL = config.INDEX_DATA_SQL || 'select artist, song_name from music.song_mst ';

global.messageKey = 0;

const app = express();

// view engine setup1
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(compression());
app.use(cors());

//// add for logtracer
const {notification={}, logLevel="DEBUG", logFile="logger.log"} = config.LOGGER;
const loggerOptions = {
  notification,
  logLevel,
  logFile
}

global.logger = require('./lib/logger')(loggerOptions);
// const env = app.get('env');
// if(env === 'development'){	
// 	console.log('development environment!!');	
// 	var logTracer = require('tracer').console(
// 			{
// 				format: "{{timestamp}} [{{title}}] {{message}} (in {{file}}:{{line}})",	
// 				dateformat: 'yyyy-mm-dd HH:MM:ss',
// 				level: global.LOG_LEVEL
// 			}
// 		);
// }
////

// set db config
const musicdb = ibmdb.connectDB(MUSICDB_CONNECTION_STRING);
app.set('musicdb', musicdb);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// global.logger = logTracer;

app.use('/', routes);
app.use('/users', users);
app.use('/load', require('./routes/load'));
app.use('/loadSong', require('./routes/loadSong')); 
app.use('/search', require('./routes/search'));
app.use('/searchSong', require('./routes/searchSong'));
app.use('/clearSong', require('./routes/clearSong'));
app.use('/clearCache', require('./routes/clearCache'));


// app.use('/heapdump',function(req,res,next){
//   var filename = 'd:/temp/' + Date.now() + '.heapsnapshot';
//   heapdump.writeSnapshot(filename);
//   res.send('Heapdump has been generated in '+filename);
// });


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
