var express = require('express');
var router = express.Router();
var extractJAMO = require('../util/extractJAMO');
var extractCHO = require('../util/extractCHO');
var Hangul = require('hangul-js');
const master = require('../lib/master');
const LIMIT_PER_WORKER = 1000;

/* GET home page. */

router.get('/:pattern', function(req, res, next) {

	global.logger.trace('%s',req.params.pattern);
	const {pattern} = req.params;
	const jamo = extractJAMO(pattern);
	const cho = extractCHO(pattern);
	global.logger.trace('%s',jamo);
	global.logger.trace(global.wordsWithJAMOCHO)
    // 1. 한글비교 (한글 like 검색)
	const artistObjs = global.wordsWithJAMOCHO.filter(song => song.artistName.includes(pattern)); 	
	const songObj = global.wordsWithJAMOCHO.filter(song => song.songName.includes(pattern)); 	
	// 2. 자모분리비교 ()
	const artistJAMO = global.wordsWithJAMOCHO.filter(song => song.jamoArtist.startsWith(jamo)); 	
	const songJAMO = global.wordsWithJAMOCHO.filter(song => song.jamoSong.startsWith(jamo)); 	
	
	let wordObjCHO = [];
	
	global.logger.trace('wordObjCHO:%j',wordObjCHO);
	
	Object.assign(artistObjs, artistJAMO);
	Object.assign(artistObjs, songJAMO);
	Object.assign(artistObjs, songObj);
	
	// Object.assign(wordObj, artistJAMO);
	
	res.send({result:artistObjs, count:artistObjs.length});
	
}); 

router.get('/withWorkers/:pattern', async (req, res, next) => {
	try {
		global.logger.trace('%s',req.params.pattern);
		const {pattern} = req.params;
		const continuePattern = ['%20', '%20%20', '%20%20%20'];
		if(continuePattern.includes(encodeURIComponent(pattern))){
			global.logger.trace('countinue...');
			res.send({result:null, count:null});
			return false;
		}

		const jamo = extractJAMO(pattern);	
		global.logger.trace('%s',jamo);
	
		const searchResults = await master.search(pattern, jamo, LIMIT_PER_WORKER);
		global.logger.trace(searchResults);
	
		res.send({result:searchResults, count:searchResults.length});
		
	} catch (err) {
		console.error(err);
		res.send({result:null, count:null});
	}

}); 

module.exports = router;
