const express = require('express');
const router = express.Router();
const master = require('../lib/master');
 
router.get('/', async (req, res, next) => {
	const workers = req.app.get('workers');
	const io = req.app.get('io');
	const result = await master.clear(workers);
    global.logger.info(`clear result : `,result);
	res.send(result);
})


module.exports = router;
 