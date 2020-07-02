const express = require('express');
const router = express.Router();
// const master = require('../lib/master');
const master = require('../lib/masterEngine');  
 
router.get('/useWorkers', async (req, res, next) => {
	const {from} = req.query;
	const workers = req.app.get('workers');
	const manager = req.app.get('manager');
	const io = req.app.get('io');
	const keyStore = req.app.get('taskKey');
	const masterMonitor = req.app.get('masterMonitor');
	const taskResults = req.app.get('taskResults');

	if(from === 'db'){
		const musicdb = req.app.get('musicdb');  
		const options = {db: musicdb};
		global.logger.info('request accepted');
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
	// res.send(result);
})


module.exports = router;
 