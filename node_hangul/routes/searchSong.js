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
		const {userId} = req.query;
		const ip = req.connection.remoteAddress;
		const continuePattern = ['%20', '%20%20', '%20%20%20'];
		if(continuePattern.includes(encodeURIComponent(pattern))){
			global.logger.trace('countinue...');
			res.send({result:null, count:null});
			return false;
		}

		global.logger.info(`new request : pattern [${pattern}]`);
		const searchType = [
			{key: 'artistNsong', weight: 1},
			{key: 'songNartist', weight: 2},
			{key: 'artist', weight: 3},
			{key: 'artistJAMO', weight: 4},
			{key: 'song', weight: 5},
			{key: 'songJAMO', weight: 6}
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
		resultsConcat.sort(sortMultiFields)

		function sortMultiFields(a, b){
			if(a.weight > b.weight) return 1;
			if(a.weight < b.weight) return -1;
			if(a.artistName > b.artistName) return 1;
			if(a.artistName < b.artistName) return -1;
			if(a.songName > b.songName) return 1;
			if(a.songName < b.songName) return -1;
			return 0;
		}

		global.logger.trace(resultsConcat);
		const countPerWeight = {};
		resultsConcat.map(result => {
			const {weight} = result;
			countPerWeight[weight] ? countPerWeight[weight]++ : countPerWeight[weight] = 1;
		})
		global.logger.info(`[${ip}][${userId}] result count per weight : [%s] : %j`, pattern, countPerWeight);
		resultsConcat.map(result => delete result.weight);
		const resultsStringified = resultsConcat.map(JSON.stringify);
		const resultsUniqueString = Array.from(new Set(resultsStringified));
		const resultsUnique = resultsUniqueString.map(JSON.parse);
		global.logger.trace(resultsUnique)
		global.logger.info(`[${ip}][${userId}] unique result count : [%s] : %d`, pattern, resultsUnique.length);
	
		res.send({result:resultsUnique, count:resultsUnique.length});
		
	} catch (err) {
		console.error(err);
		res.send({result:null, count:null});
	}

}); 

module.exports = router;
