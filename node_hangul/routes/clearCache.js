const express = require('express');
const router = express.Router();
const master = require('../lib/masterEngine');
 
router.get('/', async (req, res, next) => {
    const cacheWorkers = req.app.get('cacheWorkers');
    const result = await master.clearCache(cacheWorkers);
    global.logger.info('clearCache : ', result);
	res.send(result);
})


module.exports = router;