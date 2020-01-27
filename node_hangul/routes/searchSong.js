var express = require('express');
var router = express.Router();
var extractJAMO = require('../util/extractJAMO');
var extractCHO = require('../util/extractCHO');
var Hangul = require('hangul-js');
const master = require('../lib/master');
const RESULT_LIMIT_WORKER = global.RESULT_LIMIT_WORKER;


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

// search by distributed worker
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

		const searchType = [
			{key: 'artist', weight: 1},
			{key: 'artistJAMO', weight: 2},
			{key: 'song', weight: 3},
			{key: 'songJAMO', weight: 4}
		]

		const patternJAMO = extractJAMO(pattern);	
		global.logger.trace('%s',patternJAMO);

		const searchResults = searchType.map(async type => {
			return await master.search(type, pattern, patternJAMO, RESULT_LIMIT_WORKER);
		})
		// const searchResults = await master.search(pattern, jamo, LIMIT_PER_WORKER);

		const resolvedResults = await Promise.all(searchResults);
		const resultsConcat = resolvedResults.flat();
		global.logger.trace(resultsConcat);
		resultsConcat.sort(sortMutiFields)

		function sortMutiFields(a, b){
			if(a.weight > b.weight) return 1;
			if(a.weight < b.weight) return -1;
			if(a.artistName > b.artistName) return 1;
			if(a.artistName < b.artistName) return -1;
			if(a.songName > b.songName) return 1;
			if(a.songName < b.songName) return -1;
			return 0;
		}

		// const resultsStringified = resultsConcat.map(JSON.stringify);
		// const resultsUniqueString = Array.from(new Set(resultsStringified));
		// const resultsUnique = resultsUniqueString.map(JSON.parse);
		// global.logger.trace(resultsUnique)
		// resultsUnique.sort((a,b) => {
		// 	return a.artistName > b.artistName ? 1 : a.artistName < b.artistName ? -1 : secondCompare(a,b);
		// })

		// function secondCompare(a, b) {
		// 	return a.songName > b.songName ? 1 : a.songName < b.songName ? -1 : 0;
		// }

		global.logger.trace(resultsConcat);
		resultsConcat.map(result => delete result.weight);
		const resultsStringified = resultsConcat.map(JSON.stringify);
		const resultsUniqueString = Array.from(new Set(resultsStringified));
		const resultsUnique = resultsUniqueString.map(JSON.parse);
		global.logger.trace(resultsUnique)
	
		res.send({result:resultsUnique, count:resultsUnique.length});
		
	} catch (err) {
		console.error(err);
		res.send({result:null, count:null});
	}

}); 

module.exports = router;
