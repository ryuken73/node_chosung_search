var express = require('express');
var router = express.Router();
var extractJAMO = require('../util/extractJAMO');
const master = require('../lib/master');
const RESULT_LIMIT_WORKER = global.RESULT_LIMIT_WORKER;

// search by distributed worker
router.get('/withWorkers/:pattern', async (req, res, next) => {
	try {
		global.logger.trace('%s',req.params.pattern);
		const {app} = req;
		const {pattern} = req.params;
		const {userId} = req.query;
		const ip = req.connection.remoteAddress;
		const workers = app.get('workers');	

		// const lastKey = req.app.get('messageKey');
		// const messageKey = lastKey + 1;
		// req.app.set(messageKey);


		if(pattern.replace(/\s+/, '').length === 0){
			global.logger.trace('countinue...');
			res.send({result:null, count:null});
			return false;
		}

		global.logger.info(`[${ip}][${userId}] new request : pattern [${pattern}]`);
		const searchGroup = [
			{key: 'artistNsong', weight: 1},
			{key: 'songNartist', weight: 2},
			{key: 'artist', weight: 3},
			{key: 'artistJAMO', weight: 4},
			{key: 'song', weight: 5},
			{key: 'songJAMO', weight: 6}
		]

		const patternJAMO = extractJAMO(pattern);	
		global.logger.trace('%s',patternJAMO);

		const searchResults = searchGroup.map(async group => {
			return await master.search(workers, {group, pattern, patternJAMO, RESULT_LIMIT_WORKER});
		})
		// const searchResults = await master.search(pattern, jamo, LIMIT_PER_WORKER);

		// resolvedResults = [[{},{}...],[],[]]
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
			if(a.year > b.year) return 1;
			if(a.year < b.year) return -1;
			return 0;
		}

		global.logger.trace(resultsConcat);
		// get result count per weight
		const countPerWeight = {};
		resultsConcat.map(result => {
			const {weight} = result;
			countPerWeight[weight] ? countPerWeight[weight]++ : countPerWeight[weight] = 1;
		})
		global.logger.info(`[${ip}][${userId}] result per weight : [%s] : %j`, pattern, countPerWeight);
		// remove weight
		resultsConcat.map(result => delete result.weight);
		// sort and remove duplicate objects
	    // make all element(object) of array string
		const resultsStringified = resultsConcat.map(JSON.stringify);
		// by using Set, get array with unique element 
		const resultsUniqueString = Array.from(new Set(resultsStringified));
		// revert string to object
		const resultsUnique = resultsUniqueString.map(JSON.parse);
		global.logger.trace(resultsUnique)
		global.logger.info(`[${ip}][${userId}] unique result : [%s] : %d`, pattern, resultsUnique.length);
	
		res.send({result:resultsUnique, count:resultsUnique.length});
		
	} catch (err) {
		console.error(err);
		res.send({result:null, count:null});
	}

}); 

module.exports = router;
