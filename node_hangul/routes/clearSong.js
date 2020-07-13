const express = require('express');
const router = express.Router();
// const master = require('../lib/master');
// const master = require('../engine/masterEngine');
 
router.get('/', async (req, res, next) => {
	const masterEngine = req.app.get('masterEngine');
	// const masterMonitor = req.app.get('masterMonitor');
	const result = await masterEngine.clearIndex();
	res.send(result);
})


module.exports = router;
 