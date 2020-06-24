var express = require('express');
var router = express.Router();
var extractJAMO = require('../util/extractJAMO');
const master = require('../lib/master');
const timer = require('../lib/timer.js');
const searchType = require('../config/searchType');
const orderSong = require('../lib/orderSong');

const RESULT_LIMIT_WORKER = global.RESULT_LIMIT_WORKER;
const MAX_LOG_ROWS_BROADCASTING = global.MAX_LOG_ROWS_BROADCASTING;

class InPattern {
	construct(pattern){
		this._pattern = pattern;
		this._patternUpperCase = pattern.toUpperCase();
		this._patternJAMO = extractJAMO(pattern).replace(/\s+/g, ' ');
	}
	
	get pattern() { return this._pattern }
	get upperCase() { return this._patternUpperCase}
	get patternJAMO() { return this._patternJAMO}
}

const startTimer = digit =>	timer.create(digit).start();

// search by distributed worker
router.get('/withWorkers/:pattern', async (req, res, next) => {
	try {
		global.logger.trace('%s',req.params.pattern);
		
		const DIGITS = 3;
		const stopWatch = startTimer(DIGITS)

		const {app} = req;
		const {pattern:searchPattern} = req.params;
		const inPattern = new InPattern(searchPattern)
		global.logger.trace('%s',inPattern);

		const {userId='unknown', supportThreeWords, maxReturnCount = global.MAX_SEARCH_RETURN_COUNT} = req.query;
		const ip = req.connection.remoteAddress || 'none';
		const userFrom = {userId, ip};

		res.stopWatch = stopWatch; 
		req.metaData = {pattern: inPattern.upperCase, patternJAMO: inPattern.patternJAMO, ip, userId, maxReturnCount, supportThreeWords};

		const workers = app.get('workers');	
		const cacheWorkers = app.get('cacheWorkers');
		const masterMonitorStore = app.get('masterMonitor');
		const logMonitorStore = app.get('logMonitor');
		const keyStore = app.get('taskKey');
		const taskResults = app.get('taskResults');
		const searchEvent = app.get('searchEvent');

		if(isPatternWhiteSpaceOnly({pattern: inPattern.upperCase})) {  
			stopWatch.end();
			res.send({result:null, count:null});
			return;
		} 

		global.logger.info(`[${ip}][${userId}] new request : pattern [${inPattern.upperCase} ${supportThreeWords}]`);
		broadcastSearch(masterMonitorStore, 'start');

		const {cacheHit, cacheResponse} = await lookupCache({cacheWorkers, patternJAMO: inPattern.patternJAMO, userFrom});
		cacheHit ? processCacheResult({cacheHit, cacheResponse, logMonitorStore, masterMonitorStore, req, res}) : doNothing();
		if(cacheHit) return;
				
		const {threeWordsSearchGroup, normalSearchGroup} = searchType;
		const searchGroup = supportThreeWords ? threeWordsSearchGroup : normalSearchGroup;		
		const searchParams = {pattern: inPattern.upperCase, patternJAMO: inPattern.patternJAMO, RESULT_LIMIT_WORKER, supportThreeWords};

		const searchResults = await searchRequest({workers, keyStore, taskResults, searchGroup, searchEvent, searchParams});
		
		// supportThreeWords ?  searchResults.sort(sortThreeWords(pattern)) : searchResults.sort(sortMultiFields)
		const {orderyByKey, artistNameIncludesFirst, artistNameStartsFirst} = orderSong;

		supportThreeWords 
		? searchResults
		.sort(orderyByKey(inPattern.upperCase)) 
		.sort(artistNameIncludesFirst(inPattern.upperCase))
		.sort(artistNameStartsFirst(inPattern.upperCase)) 
		: searchResults.sort(sortMultiFields)

		global.logger.trace(searchResults);
		// get result count per weight and remove weight ftom results
		const [resultCountPerWeight, resultsWithoutWeight] = getResultCountPerWeight(searchResults);
		global.logger.info(`[${ip}][${userId}] result per weight : [%s] : %j`, inPattern.upperCase, resultCountPerWeight);
		// remove duplicate results
		const resultsUnique = removeDuplicate(resultsWithoutWeight);
		const resultsSizeReduced = getOnlyKeys(resultsUnique, ['artistName', 'songName']);
		const resultCount = resultsSizeReduced.length;
		
		global.logger.trace(resultsSizeReduced)
		global.logger.info(`[${ip}][${userId}] unique result : [%s] : %d`, inPattern.upperCase, resultCount);
		const elapsed = stopWatch.end();
		broadcastLog(elapsed, logMonitorStore, {userId, ip, pattern: inPattern.upperCase, resultCount});
		broadcastSearch(masterMonitorStore, 'end');

		cacheWorkers.length > 0 && updateCache(cacheWorkers, inPattern.patternJAMO, resultsSizeReduced);
		res.send({result: resultsSizeReduced.slice(0,maxReturnCount), count:resultsUnique.length});
		
	} catch (err) {
		console.error(err);
		res.send({result:null, count:null});
	}
}); 


async function lookupCache({cacheWorkers, patternJAMO, userFrom}){
	const {ip, userId} = userFrom;
	const cacheSearchJob = {
		cmd: 'get',
		pattern: patternJAMO
	}
	const resultPromise = cacheWorkers.map( async worker => await worker.runJob(cacheSearchJob));
	const resultsFromCache = await Promise.all(resultPromise);
	// resultsFromCache = [null, null, [results], null]
	global.logger.debug(resultsFromCache)
	const cacheHit = resultsFromCache.some(result => result.length !== 0);
	const cacheResponse = resultsFromCache.find(result => result.length !==0);
	global.logger.info(`[${ip}][${userId}] cache ${cacheHit ? 'hit':'misss'} [${patternJAMO}] `);
	
	return {cacheHit, cacheResponse};
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
	const newLog = storedLog.length > 100 ? storedLog.slice(0, storedLog.length - 1) : [...storedLog];
	newLog.unshift(logMonitor);
	logMonitorStore.setStatus('log', newLog);
	logMonitorStore.broadcast({eventName:'logMonitor', message:newLog});
}

function broadcastSearch(masterMonitorStore, type){
	let searchMonitorAfterSearch = masterMonitorStore.getStatus()['searching'];
	type === 'start' && masterMonitorStore.setStatus('searching', searchMonitorAfterSearch+1);
	type === 'end' && masterMonitorStore.setStatus('searching', searchMonitorAfterSearch-1);
	masterMonitorStore.broadcast({eventName:'masterMonitor'});	
}

function sortMultiFields(a, b){
	if(a.weight > b.weight) return 1;
	if(a.weight < b.weight) return -1;
	if(a.artistName > b.artistName) return 1;
	if(a.artistName < b.artistName) return -1;
	if(a.songName > b.songName) return 1;
	if(a.songName < b.songName) return -1;
	// if(a.year > b.year) return 1;
	// if(a.year < b.year) return -1;
	return 0;
}

const isPatternWhiteSpaceOnly = ({pattern}) => pattern.replace(/\s+/, '').length === 0;

const processCacheResult = ({cacheHit, cacheResponse, masterMonitorStore, logMonitorStore, req, res}) => {
	global.logger.info('*****return from cache!!!!!');
	const elapsed = res.stopWatch.end();
	const {pattern, ip, userId, maxReturnCount} = req.metaData;
	const resultCount = cacheResponse.length;
	const bcastMessage =  {userId, ip, pattern, resultCount, cacheHit};
	// const {masterMonitorStore, logMonitorStore} = req.app.get('monitorStores');
	broadcastLog(elapsed, logMonitorStore, bcastMessage);
	broadcastSearch(masterMonitorStore, 'end');
	res.send({result: cacheResponse.slice(0,maxReturnCount), count: resultCount});
}

const searchRequest = async ({workers, keyStore, taskResults, searchGroup, searchEvent, searchParams}) => {
	return new Promise(async (resolve, reject) => {
		const resultsFromWorkers = searchGroup.map(async group => {
			const params = {...searchParams, group};
			return await master.search({workers, keyStore, taskResults, searchEvent, params});
		})		
		const resolvedResults = await Promise.all(resultsFromWorkers);
		const resultsConcat = resolvedResults.flat();
		global.logger.trace(resultsConcat);
		resolve(resultsConcat);
	})
}

const getResultCountPerWeight = (searchResults) => {
	const countPerWeight = {};
	const resultsWithoutWeight = searchResults.map(result => {
		const {weight} = result;
		countPerWeight[weight] ? countPerWeight[weight]++ : countPerWeight[weight] = 1;
		delete result.weight;
		return result
	})
	return [countPerWeight, resultsWithoutWeight];
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
