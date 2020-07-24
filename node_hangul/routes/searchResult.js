const express = require('express');
const router = express.Router();
 
router.put('/selected', async (req, res, next) => {
	// selectedSong = {artistName, songName}
	const {userId='none'} = req.query;
	const ip = req.connection.remoteAddress || 'none';
	const {artistName='none', songName='none'} = req.body;
	global.logger.info(`[${ip}][${userId}] Accepts : [${artistName}][${songName}]`);

	const masterEngine = req.app.get('masterEngine');
	const ELAPSED = 0;
	masterEngine.broadcastLog(ELAPSED, {userId, ip, pattern:`${artistName} : ${songName}`, resultCount:0, cacheHit:false, type:'selected'});
	res.send({result:null});
})


module.exports = router;
 