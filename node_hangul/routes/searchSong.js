var express = require('express');
var router = express.Router();
const timer = require('../lib/timer.js');
const orderSong = require('../lib/orderSong');
const {createPattern} = require('../lib/patternClass');

const RESULT_LIMIT_WORKER = global.RESULT_LIMIT_WORKER;
const MAX_LOG_ROWS_BROADCASTING = global.MAX_LOG_ROWS_BROADCASTING;

const mkInPattern = (req, res, next) => {
	const {pattern} = req.params;
	const inPattern = createPattern(pattern);
	if(isPatternWhiteSpaceOnly(inPattern.upperCase)) {  
		res.send({result:null, count:null});
		return;
	} 
	req.inPattern = inPattern;
	next();
}

const mkStopWatch = (req, res, next) => {
	const DIGITS = 3;
	const stopWatch = timer.create(DIGITS)
	req.stopWatch = stopWatch;
	res.stopWatch = stopWatch;
	next();
}

// search by distributed worker
router.get('/withWorkers/:pattern', mkInPattern, mkStopWatch, async (req, res, next) => {
	try {
		global.logger.trace('%s',req.params.pattern);
		// start stopwatch
		const {inPattern, stopWatch} = req;
		stopWatch.start();

		const {userId='unknown', maxReturnCount = global.MAX_SEARCH_RETURN_COUNT} = req.query;
		const ip = req.connection.remoteAddress || 'none';
		global.logger.info(`[${ip}][${userId}] new request : pattern [${inPattern.upperCase}]`);
		const broadcastStatus = broadcaster(req.app.get('masterEngine'), req.app.get('logMonitor'))
		broadcastStatus({status: 'start'});

		const masterEngine = req.app.get('masterEngine');
		const {cacheHit, cacheResponse} = await masterEngine.lookupCache({patternJAMO: inPattern.patternJAMO});

		if(cacheHit) {
			global.logger.info(`[${ip}][${userId}] cache hit [${inPattern.patternJAMO}] `);
			const elapsed = stopWatch.end();
			const resultCount = cacheResponse.length;
			broadcastStatus({status: 'cacheHit', results: {userId, ip, elapsed, pattern:inPattern.upperCase, resultCount, cacheHit}})
			res.send({result: cacheResponse.slice(0,maxReturnCount), count: resultCount});
			return;
		}

		// const searchParams = {pattern: inPattern.upperCase, patternJAMO: inPattern.patternJAMO, RESULT_LIMIT_WORKER};
		const searchParams = {inPattern, RESULT_LIMIT_WORKER};
		const searchResults = await searchRequest({masterEngine: req.app.get('masterEngine'), searchParams});
		const orderedResult = orderResult(searchResults, orderSong, inPattern.upperCase);

		global.logger.trace(orderedResult);
		const resultsUnique = removeDuplicate(orderedResult);
		const resultsSizeReduced = getOnlyKeys(resultsUnique, ['artistName', 'songName']);
		const resultCount = resultsSizeReduced.length;
		
		global.logger.trace(resultsSizeReduced)
		global.logger.info(`[${ip}][${userId}] unique result : [%s] : %d`, inPattern.upperCase, resultCount);
		const elapsed = stopWatch.end();
		broadcastStatus({status: 'end', results: {userId, ip, elapsed, pattern: inPattern.upperCase, resultCount}});

		masterEngine.cacheManager && masterEngine.addCache({
			patternJAMO : inPattern.patternJAMO,
			results : resultsSizeReduced
		})
		res.send({result: resultsSizeReduced.slice(0,maxReturnCount), count:resultsUnique.length});
		
	} catch (err) {
		global.logger.error(err);
		res.send({result:null, count:null});
	}
}); 

const broadcaster = (masterEngine, logMonitorStore) => {
	return ({status, results}) => {
		if(status === 'start'){
			broadcastMaster(masterEngine, 'start');
			return;
		}
		if(status === 'cacheHit'){
			const {userId, ip, elapsed, pattern, resultCount, cacheHit} = results;
			broadcastLog(elapsed, masterEngine, {userId, ip, pattern, resultCount, cacheHit});
			broadcastMaster(masterEngine, 'end');
			return;
		}
		if(status === 'end'){
			const {userId, ip, elapsed, pattern, resultCount} = results;
			broadcastLog(elapsed, masterEngine, {userId, ip, pattern, resultCount});
			broadcastMaster(masterEngine, 'end');
			return;
		}
	}
}

const orderResult = (searchResults, orderSong, pattern) => {
	const {orderDefault} = orderSong;
	return orderDefault(searchResults, pattern);
}


async function deleteCache(cacheWorkers, patternJAMO){
	global.logger.error(`cache has duplicate entry [${patternJAMO}]`);
	const cacheDeleteJob = {
		cmd: 'delete',
		payload: {
			pattern: patternJAMO,
		}
	}
	const resultPromise = cacheWorkers.map( async worker => await worker.promise.request(cacheDeleteJob));
	const resultsFromCache = await Promise.all(resultPromise);
	global.logger.debug(resultsFromCache);
    global.logger.info(`delete cache [${patternJAMO}] Done!`);
	return true;
}

async function broadcastLog(elapsed, masterEngine, params){
	const {userId, ip, pattern, resultCount, cacheHit} = params;
	const logMonitor = {
		eventTime: (new Date()).toLocaleString(),
		userId: userId ? userId : 'None',
		ip: ip ? ip : 'None',
		keyword: `[${pattern}]`,
		elapsed: elapsed,
		resultCount,
		cacheHit
	}	
	masterEngine.setStatus.promise.log({log: logMonitor});
	masterEngine.broadcast('logMonitor', await masterEngine.getStatus.promise.log());
}

async function broadcastMaster(masterEngine, type){
	const masterStatus = await masterEngine.getStatus.promise.master()
	type === 'start' && await masterEngine.setStatus.promise.master({searching: masterStatus.searching + 1});
	type === 'end' && await masterEngine.setStatus.promise.master({searching: masterStatus.searching - 1});
	masterEngine.broadcast('masterMonitor', await masterEngine.getStatus.promise.master());
}

const isPatternWhiteSpaceOnly = (pattern) => pattern.replace(/\s+/, '').length === 0;

const searchRequest = async ({masterEngine, searchParams}) => {
	return new Promise(async (resolve, reject) => {
		// const params = {...searchParams};
		// console.log(params)
		const resolvedResults = await masterEngine.search(searchParams);
		const resultsConcat = resolvedResults.flat();
		global.logger.trace(resultsConcat);
		resolve(resultsConcat);
	})
}

const removeDuplicate = (resultsWithoutWeight) => {
	const resultsStringified = resultsWithoutWeight.map(JSON.stringify);
	const resultsUniqueString = Array.from(new Set(resultsStringified));
	const resultsUnique = resultsUniqueString.map(JSON.parse);
	return resultsUnique;
}

const getOnlyKeys = (resultsUnique, requiredKeys=[]) => {
	const resultUniqueClone = [...resultsUnique];
	const emptyResults = new Array(resultUniqueClone.length);
	emptyResults.fill({});
	const reducedResults = emptyResults.map((result, index) => {
		return requiredKeys.reduce((acct, key) => {
			return {...acct, [key]:resultUniqueClone[index][key]}
		}, {});
	})
	return reducedResults;
}

const doNothing = () => {};

module.exports = router;
