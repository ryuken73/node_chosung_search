const express = require('express');
const router = express.Router();
const master = require('../lib/master');
 
router.get('/', async (req, res, next) => {
	const workers = req.app.get('workers');
	const keyStore = req.app.get('taskKey');
	const taskResults = req.app.get('taskResults');
	const clearEvent = req.app.get('clearEvent');
	const result = await master.clear({workers, keyStore, taskResults, clearEvent});
	res.send(result);
})


module.exports = router;
 