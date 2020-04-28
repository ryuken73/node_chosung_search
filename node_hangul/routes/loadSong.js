const express = require('express');
const router = express.Router();
const master = require('../lib/master');
 
router.get('/useWorkers', async (req, res, next) => {
	const {from} = req.query;
	const workers = req.app.get('workers');
	const io = req.app.get('io');
	const keyStore = req.app.get('taskKey');
	const masterMonitor = req.app.get('masterMonitor');
	const taskResults = req.app.get('taskResults');
	// console.log(masterMonitor)

	if(from === 'db'){
		const musicdb = req.app.get('musicdb');  
		const options = {db: musicdb};
		const totalLoaded = workers ? await master.loadFromDB(workers, keyStore, taskResults, masterMonitor, options) : {};	
		global.logger.info(totalLoaded);
		const result = totalLoaded ? {result:'success', count: totalLoaded} 
								   : {result:'failure', count: 0};
		res.send(result);
		return;
	}

	const options = {
		srcFile : global.SRC_FILE,
		wordSep  : '^',
		lineSep  : '\r\n',
		encoding : 'utf8',
		highWaterMark : 64 * 1024 * 10,
		end : global.INDEXING_BYTES,
	}
	const totalLoaded = workers ? await master.load(workers, keyStore, taskResults, masterMonitor, options) : {};
	global.logger.info(totalLoaded);
	const result = totalLoaded ? {result:'success', count: totalLoaded} 
	                           : {result:'failure', count: 0};
	res.send(result);
})


module.exports = router;
 