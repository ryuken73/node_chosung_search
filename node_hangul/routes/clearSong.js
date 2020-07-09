const express = require('express');
const router = express.Router();
// const master = require('../lib/master');
const master = require('../lib/masterEngine');
 
router.get('/', async (req, res, next) => {
	const masterEngine = req.app.get('masterEngine');
	const masterMonitor = req.app.get('masterMonitor');
	const result = await masterEngine.clearIndex({masterMonitor});
	res.send(result);
})


module.exports = router;
 