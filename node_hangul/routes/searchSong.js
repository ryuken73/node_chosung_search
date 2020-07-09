var express = require('express');
var router = express.Router();
var extractJAMO = require('../util/extractJAMO');
const master = require('../lib/masterEngine');
const timer = require('../lib/timer.js');
const orderSong = require('../lib/orderSong');

const RESULT_LIMIT_WORKER = global.RESULT_LIMIT_WORKER;
const MAX_LOG_ROWS_BROADCASTING = global.MAX_LOG_ROWS_BROADCASTING;

class InPattern {
	constructor(pattern){
		this._pattern = pattern;
		this._patternUpperCase = pattern.toUpperCase();
		this._patternJAMO = extractJAMO(pattern).replace(/\s+/g, ' ');
		return this;
	}
	
	get pattern() { return this._pattern }
	get upperCase() { return this._patternUpperCase}
	get patternJAMO() { return this._patternJAMO}
}

const mkInPattern = (req, res, next) => {
	const {pattern} = req.params;
	const inPattern = new InPattern(pattern);
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
		const broadcastStatus = broadcaster(req.app.get('masterMonitor'), req.app.get('logMonitor'))
		broadcastStatus({status: 'start'});

		const cacheWorkers = req.app.get('cacheWorkers');
		const {cacheHit, cacheResponse} = await lookupCache({cacheWorkers, patternJAMO: inPattern.patternJAMO});
		if(cacheHit) {
			global.logger.info(`[${ip}][${userId}] cache hit [${inPattern.patternJAMO}] `);
			const elapsed = stopWatch.end();
			const resultCount = cacheResponse.length;
			broadcastStatus({status: 'cacheHit', results: {userId, ip, elapsed, pattern:inPattern.upperCase, resultCount, cacheHit}})
			res.send({result: cacheResponse.slice(0,maxReturnCount), count: resultCount});
			return;
		}

		const searchParams = {pattern: inPattern.upperCase, patternJAMO: inPattern.patternJAMO, RESULT_LIMIT_WORKER};
		const searchResults = await searchRequest({manager: req.app.get('searchManager'), searchParams});
		const orderedResult = orderResult(searchResults, orderSong, inPattern.upperCase);

		global.logger.trace(orderedResult);
		const resultsUnique = removeDuplicate(orderedResult);
		const resultsSizeReduced = getOnlyKeys(resultsUnique, ['artistName', 'songName']);
		const resultCount = resultsSizeReduced.length;
		
		global.logger.trace(resultsSizeReduced)
		global.logger.info(`[${ip}][${userId}] unique result : [%s] : %d`, inPattern.upperCase, resultCount);
		const elapsed = stopWatch.end();
		broadcastStatus({status: 'end', results: {userId, ip, elapsed, pattern: inPattern.upperCase, resultCount}});

		cacheWorkers.length > 0 && updateCache(cacheWorkers, inPattern.patternJAMO, resultsSizeReduced);
		res.send({result: resultsSizeReduced.slice(0,maxReturnCount), count:resultsUnique.length});
		
	} catch (err) {
		console.error(err);
		res.send({result:null, count:null});
	}
}); 

const broadcaster = (masterMonitorStore, logMonitorStore) => {
	return ({status, results}) => {
		if(status === 'start'){
			broadcastMaster(masterMonitorStore, 'start');
			return;
		}
		if(status === 'cacheHit'){
			const {userId, ip, elapsed, pattern, resultCount, cacheHit} = results;
			broadcastLog(elapsed, logMonitorStore, {userId, ip, pattern, resultCount, cacheHit});
			broadcastMaster(masterMonitorStore, 'end');
			return;
		}
		if(status === 'end'){
			const {userId, ip, elapsed, pattern, resultCount} = results;
			broadcastLog(elapsed, logMonitorStore, {userId, ip, pattern, resultCount});
			broadcastMaster(masterMonitorStore, 'end');
			return;
		}
	}
}

const orderResult = (searchResults, orderSong, pattern) => {
	const {orderDefault} = orderSong;
	return orderDefault(searchResults, pattern);
}

async function lookupCache({cacheWorkers, patternJAMO}){
	const cacheSearchJob = {
		cmd: 'get',
		pattern: patternJAMO
	}
	const resultPromise = cacheWorkers.map( async worker => await worker.promise.request(cacheSearchJob));
	const resultsFromCache = await Promise.all(resultPromise);
	global.logger.debug(resultsFromCache)
	const cacheHit = resultsFromCache.some(result => result.length !== 0);
	const cacheResponse = resultsFromCache.find(result => result.length !==0);
	return {cacheHit, cacheResponse};
}

async function updateCache(cacheWorkers, patternJAMO, results){
	const cacheSetJob = {
		cmd: 'put',
		pattern: patternJAMO,
		results
	}
	const cacheIndex = patternJAMO.length % cacheWorkers.length;
	const resultPromise = await cacheWorkers[cacheIndex].promise.request(cacheSetJob);
	global.logger.debug(resultPromise)
	return resultPromise
}

async function deleteCache(cacheWorkers, patternJAMO){
	global.logger.error(`cache has duplicate entry [${patternJAMO}]`);
	const cacheDeleteJob = {
		cmd: 'delete',
		pattern: patternJAMO,
	}
	const resultPromise = cacheWorkers.map( async worker => await worker.promise.request(cacheDeleteJob));
	const resultsFromCache = await Promise.all(resultPromise);
	global.logger.debug(resultsFromCache);
    global.logger.info(`delete cache [${patternJAMO}] Done!`);
	return true;
}

function broadcastLog(elapsed, logMonitorStore, params){
	const {userId, ip, pattern, resultCount, cacheHit} = params;
	// const elapsed = stopWatch.end();
	const logMonitor = {
		eventTime: (new Date()).toLocaleString(),
		userId: userId ? userId : 'None',
		ip: ip ? ip : 'None',
		keyword: `[${pattern}]`,
		elapsed: elapsed,
		resultCount,
		cacheHit
	}

	const storedLog = logMonitorStore.getStatus()['log'];
	const newLog = storedLog.length > MAX_LOG_ROWS_BROADCASTING ? storedLog.slice(0, storedLog.length - 1) : [...storedLog];
	newLog.unshift(logMonitor);
	logMonitorStore.setStatus('log', newLog);
	logMonitorStore.broadcast({eventName:'logMonitor', message:newLog});
}

function broadcastMaster(masterMonitorStore, type){
	let searchMonitorAfterSearch = masterMonitorStore.getStatus()['searching'];
	type === 'start' && masterMonitorStore.setStatus('searching', searchMonitorAfterSearch+1);
	type === 'end' && masterMonitorStore.setStatus('searching', searchMonitorAfterSearch-1);
	masterMonitorStore.broadcast({eventName:'masterMonitor'});	
}

const isPatternWhiteSpaceOnly = (pattern) => pattern.replace(/\s+/, '').length === 0;

const searchRequest = async ({manager, searchParams}) => {
	return new Promise(async (resolve, reject) => {
		const params = {...searchParams};
		const resolvedResults = await master.search({manager, params});
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
