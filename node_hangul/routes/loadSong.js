const express = require('express');
const router = express.Router();
const master = require('../lib/masterEngine');  
 
router.get('/useWorkers', async (req, res, next) => {
	const {from} = req.query;
	const workers = req.app.get('searchWorkers');
	const manager = req.app.get('searchManager');
	const masterMonitor = req.app.get('masterMonitor');

	if(from === 'db'){
		const musicdb = req.app.get('musicdb');  
		const options = {
			db: musicdb, 
			getCountSQL: global.TOTAL_COUNT_SQL, 
			indexDataSQL: global.INDEX_DATA_SQL,
			limitSQLDataCount: global.LIMIT_SQL_DATA_COUNT
		}
		res.send({result:'success', msg:'request accepted'});
		const totalLoaded = workers ? await master.loadFromDB(manager, masterMonitor, options) : {};	
		const result = totalLoaded ? {result:'success', count: totalLoaded} 
								   : {result:'failure', count: 0};
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
	const totalLoaded = workers ? await master.loadFromFile(manager, masterMonitor, options) : {};
	const result = totalLoaded ? {result:'success', count: totalLoaded} 
							   : {result:'failure', count: 0};
	global.logger.info('total loaded:',result.count);
	return						   
})


module.exports = router;
 