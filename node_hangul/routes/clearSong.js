const express = require('express');
const router = express.Router();
// const master = require('../lib/master');
const master = require('../lib/masterEngine');
 
router.get('/', async (req, res, next) => {
	const manager = req.app.get('searchManager');
	const masterMonitor = req.app.get('masterMonitor');
	const result = await master.clearIndex({manager, masterMonitor});
	res.send(result);
})


module.exports = router;
 