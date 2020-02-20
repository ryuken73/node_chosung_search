var express = require('express');
var router = express.Router();
var extractJAMO = require('../util/extractJAMO');
const master = require('../lib/master');
const timer = require('../lib/timer.js');
const RESULT_LIMIT_WORKER = global.RESULT_LIMIT_WORKER;

// search by distributed worker
router.get('/withWorkers/:pattern', async (req, res, next) => {
	try {
		global.logger.trace('%s',req.params.pattern);
		const stopWatch = timer.create(3);
		stopWatch.start();
		const {app} = req;
		const {pattern} = req.params;
		const {userId, supportThreeWords, count=500} = req.query;
		const ip = req.connection.remoteAddress;
		const workers = app.get('workers');	
		const cacheWorkers = app.get('cacheWorkers');
		const {masterMonitorStore, logMonitorStore} = app.get('monitorStores');

		if(pattern.replace(/\s+/, '').length === 0){
			global.logger.trace('countinue...');
			res.send({result:null, count:null});
			return false;
		}

		global.logger.info(`[${ip}][${userId}] new request : pattern [${pattern} ${supportThreeWords}]`);
		const threeWordsSearchGroup = [
			// {key: 'artistNsongWithoutHat', weight: 1},
			// {key: 'songNartistWithoutHat', weight: 2},
			{key: 'threeWordsSearch', weight: 1},
			
		]

		const normalSearchGroup = [
			{key: 'artistNsong', weight: 1},
			{key: 'songNartist', weight: 2},
			{key: 'artist', weight: 3},
			{key: 'artistJAMO', weight: 4},
			{key: 'song', weight: 5},
			{key: 'songJAMO', weight: 6},
		]

		const searchGroup = supportThreeWords ? threeWordsSearchGroup : normalSearchGroup;

		const patternJAMO = extractJAMO(pattern);	
		global.logger.trace('%s',patternJAMO);

		broadcastSearch(masterMonitorStore, 'start');

		const {cacheHit, resultsFromCache} = await lookupCache(cacheWorkers, patternJAMO);
		if(cacheHit){
			global.logger.info('*****return from cache!!!!!')
			const cacheResult = resultsFromCache.filter(result => result.length !== 0);
			// cacheResult must be [[result object]]
			cacheResult.length > 1 && await deleteCache(cacheWorkers, patternJAMO);
			const resultCount = cacheResult[0].length;
			const bcastMessage =  {userId, ip, pattern, resultCount, cacheHit};
			broadcastLog(stopWatch, logMonitorStore, bcastMessage);
			broadcastSearch(masterMonitorStore, 'end');
			res.send({result: cacheResult[0].slice(0,count), count: resultCount});
			return true;
		}
					
		const searchResults = searchGroup.map(async group => {
			const searchParams =  {group, pattern, patternJAMO, RESULT_LIMIT_WORKER, supportThreeWords};
			return await master.search(workers, cacheWorkers, searchParams);
		})		

		// const searchResults = searchGroup.map(async group => {
		// 	return await master.search(workers, cacheWorkers, {group, pattern, patternJAMO, RESULT_LIMIT_WORKER, supportThreeWords});
		// })
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
		const resultCount = resultsUnique.length;
		global.logger.trace(resultsUnique)
		global.logger.info(`[${ip}][${userId}] unique result : [%s] : %d`, pattern, resultCount);

		broadcastLog(stopWatch, logMonitorStore, {userId, ip, pattern, resultCount});
		broadcastSearch(masterMonitorStore, 'end');

		updateCache(cacheWorkers, patternJAMO, resultsUnique);
		res.send({result: resultsUnique.slice(0,count), count:resultsUnique.length});
		
	} catch (err) {
		console.error(err);
		res.send({result:null, count:null});
	}
}); 

async function lookupCache(cacheWorkers, patternJAMO){
	const cacheSearchJob = {
		cmd: 'get',
		pattern: patternJAMO
	}
	const resultPromise = cacheWorkers.map( async worker => await worker.runJob(cacheSearchJob));
	const resultsFromCache = await Promise.all(resultPromise);
	// resultsFromCache = [null, null, [results]]
	global.logger.debug(resultsFromCache)
	const cacheHit = resultsFromCache.some(result => result.length !== 0);
    global.logger.info(`cache ${cacheHit ? 'hit':'misss'} [${patternJAMO}] `);
	return {cacheHit, resultsFromCache};
}

async function updateCache(cacheWorkers, patternJAMO, results){
	const cacheSetJob = {
		cmd: 'put',
		pattern: patternJAMO,
		results
	}
	const cacheIndex = patternJAMO.length % cacheWorkers.length;
	const resultPromise = await cacheWorkers[cacheIndex].runJob(cacheSetJob);
	global.logger.debug(resultPromise)
	return resultPromise
}

async function deleteCache(cacheWorkers, patternJAMO){
	global.logger.error(`cache has duplicate entry [${patternJAMO}]`);
	const cacheDeleteJob = {
		cmd: 'delete',
		pattern: patternJAMO,
	}
	const resultPromise = cacheWorkers.map( async worker => await worker.runJob(cacheDeleteJob));
	const resultsFromCache = await Promise.all(resultPromise);
	global.logger.debug(resultsFromCache);
    global.logger.info(`delete cache [${patternJAMO}] Done!`);
	return true;
}

function broadcastLog(stopWatch, logMonitorStore, params){
	const {userId, ip, pattern, resultCount, cacheHit} = params;
	const elapsed = stopWatch.end();
	const logMonitor = {
		eventTime: (new Date()).toLocaleString(),
		userId: userId ? userId : 'None',
		ip: ip ? ip : 'None',
		keyword: `[${pattern}]`,
		elapsed: elapsed,
		resultCount,
		cacheHit
	}

	const storedLog = logMonitorStore.getMonitor()['log'];
	const newLog = storedLog.length > 100 ? storedLog.slice(0, storedLog.length - 1) : [...storedLog];
	newLog.unshift(logMonitor);
	logMonitorStore.setMonitor('log', newLog);
	logMonitorStore.broadcast();
}

function broadcastSearch(masterMonitorStore, type){
	let searchMonitorAfterSearch = masterMonitorStore.getMonitor()['searching'];
	type === 'start' && masterMonitorStore.setMonitor('searching', searchMonitorAfterSearch+1);
	type === 'end' && masterMonitorStore.setMonitor('searching', searchMonitorAfterSearch-1);
	masterMonitorStore.broadcast();
}

module.exports = router;
