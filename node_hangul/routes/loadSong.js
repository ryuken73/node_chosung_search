const express = require('express');
const router = express.Router();
const master = require('../lib/master');
 
router.get('/useWorkers', async (req, res, next) => {
	const workers = req.app.get('workers');
	const options = {
		srcFile : global.SRC_FILE,
		wordSep  : '^',
		lineSep  : '\r\n',
		encoding : 'utf8',
		highWaterMark : 64 * 1024 * 10,
		end : global.INDEXING_BYTES,
	}
	const totalLoaded = workers ? await master.load(workers, options) : {};
	global.logger.info(totalLoaded);
	const result = totalLoaded ? {result:'success', count: totalLoaded} 
	                           : {result:'failure', count: 0};
	res.send(result);
})


module.exports = router;
 