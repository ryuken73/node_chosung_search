const express = require('express');
const router = express.Router();
 
router.get('/', async (req, res, next) => {
    const masterEngine = req.app.get('masterEngine');
    const result = await masterEngine.clearCache();
    global.logger.info('clearCache : ', result);
	res.send(result);
})


module.exports = router;