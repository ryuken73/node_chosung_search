const express = require('express');
const router = express.Router();
const path = require('path');
 
router.get('/useWorkers', async (req, res, next) => {
	const {from} = req.query;
	const masterEngine = req.app.get('masterEngine');
	const masterMonitor = req.app.get('masterMonitor');

	if(from === 'db'){
		const musicdb = req.app.get('musicdb');  
		const scheduleEngine = req.app.get('scheduleEngine');
		scheduleEngine.stop(global.SCHEDULE_NAME.INCREMENTAL);
		const options = {
			db: musicdb, 
			getCountSQL: global.TOTAL_COUNT_SQL, 
			indexDataSQL: global.INDEX_DATA_SQL,
			limitSQLDataCount: global.LIMIT_SQL_DATA_COUNT
		}
		res.send({result:'success', msg:'request accepted'});
		const totalLoaded = masterEngine ? await masterEngine.loadFromDB(options) : {};	
		const result = totalLoaded ? {result:'success', count: totalLoaded} 
								   : {result:'failure', count: 0};
		const outDir = global.DUMP_DIRECTORY;
		const filePrefix = global.DUMP_FILE_PREFIX;
		global.logger.info(outDir);
		// do not enable global.DUMP_FILE_ENABLED. search can be slow down
		if(totalLoaded && global.DUMP_FILE_ENABLED) {
			global.logger.info(`Saving index to files started...`);
			await masterEngine.deleteIndexFile(outDir, filePrefix);
			await masterEngine.saveIndexToFile(outDir, filePrefix); 
			global.logger.info(`Saving index to files done`);
		}
		//
		scheduleEngine.start(global.SCHEDULE_NAME.INCREMENTAL);
		global.logger.info(result); 
		return; 
	}

	const options = {
		srcFile : global.SRC_FILE,
		columnSep  : '^',
		lineSep  : '\r\n',
		encoding : 'utf8',
		highWaterMark : 64 * 1024 * 10,
		end : global.INDEXING_BYTES,
	}
	global.logger.info('request accepted');
	res.send({result:'success', msg:'request accepted'});
	const totalLoaded = masterEngine ? await masterEngine.loadFromFile(options) : {};
	const result = totalLoaded ? {result:'success', count: totalLoaded} 
							   : {result:'failure', count: 0};
	global.logger.info('total loaded:',result.count);
	return						   
})


module.exports = router;
 