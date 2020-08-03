const express = require('express');
const router = express.Router();
const path = require('path');
 
router.get('/useWorkers', async (req, res, next) => {
	const {from} = req.query;
	const masterEngine = req.app.get('masterEngine');

    const options = {
		srcFile : global.SRC_FILE,
		columnSep  : '|',
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
 