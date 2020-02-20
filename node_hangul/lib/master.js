const child_process = require('child_process');
const fs = require('fs');
const readline = require('readline');
const EventEmitter = require('events');
class eventEmitter extends EventEmitter {}

const handleProcessExit = (oldWorker, newWorker) => console.log(oldWorker.pid, newWorker.pid);
const workerPool = require('./workPool');
const cacheModule = 'lib/cache.js';

const getMemInfo = require('./getMemInfo');

const NUMBER_OF_WORKER = global.NUMBER_OF_WORKER;
const SEARCH_TIMEOUT = global.SEARCH_TIMEOUT;
const CLEAR_TIMEOUT = global.CLEAR_TIMEOUT;
const PROGRESS_UNIT = 100000;

const searchEvent = new eventEmitter();
const clearEvent = new eventEmitter();
const NEED_ORDERING = false;

const workerMonitorStore = require('./workerMonitorStore');
const masterMonitorStore = require('./masterMonitorStore');
const logMonitorStore = require('./logMonitorStore');
const cacheWorkerMonitorStore = require('./cacheWorkerMonitorStore');

global.workerMessages = new Map();
let clearResults = new Map();

console.log(SEARCH_TIMEOUT)

const getCombined = (results) => {
    return results.flat();
}

const orderFunc = (results, subType) => {
    // need to be written case by case (own ordering logic)
    // results looks like
    // [[{artistName, songName, ...},{..}],[],[]]
    let sortKey;
    switch(subType.key){
        case 'artist' :
            sortKey = 'artistName';
            break;
        case 'artistJAMO' :
            sortKey = 'artistName';
            break;  
        case 'song' :
            sortKey = 'songName';
            break;  
        case 'songJAMO' :
            sortKey = 'songName';
            break;
        case 'artistNsong' :
            sortKey = 'artistName';
            break;
        case 'songNartist' :
            sortKey = 'songName';
            break;
    }

    const origResult = [...results].flat();
    const flattened = [...origResult];
    flattened.sort((a,b) => {
        return a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0;
    })
    global.logger.debug(`before sort : %j`, origResult);
    global.logger.debug(`after sort : %j`, flattened);
    
    return flattened
}

const getOrdered = (results, subType, orderFunction) => {
    return orderFunction(results, subType);
}

const clearWorkerMessages = () => {
    return new Map();
}

const restartWorkder = (childModule, argv) => {
    global.logger.info('start new worker messageKey :', argv)
    return child_process.fork(childModule, argv);
}

const checkJobStatus = (message) => {
    const {clientId, messageKey, subType={}, result} = message;
    const keyLocal = subType.key ? subType.key : subType;
    const resultLocal = result.map ? result.length : result;
    global.logger.debug(`[${messageKey}][${clientId}][${keyLocal}]worker done[result:${resultLocal}]. check Job Status`);
    const TIMED_OUT = !global.workerMessages.has(messageKey);
    if(TIMED_OUT) return 'TIME_OUT';

    const resultsBefore = global.workerMessages.get(messageKey);  
    const results = [...resultsBefore, result];
    global.workerMessages.set(messageKey, results);
    const ALL_DONE = results.length === NUMBER_OF_WORKER;

    if(ALL_DONE) return 'DONE';
    if(subType === 'not-distributed') {
        messageKey % PROGRESS_UNIT === 0 && global.logger.info(`processed...[${messageKey}]`);
        return 'DONE';
    }

} 

const handler = {
    'notify-start' : {
        'TIME_OUT' : function(){},
        'ALL_DONE' : function(message){
            const {messageKey, subType} = message;
            global.workerMessages.delete(messageKey);
            global.logger.info('all worker started!');
        }    
    },
    'reply-index' : {
        'TIME_OUT' : function(){},
        'ALL_DONE' : function(message){
            const {messageKey, subType} = message;
            global.workerMessages.delete(messageKey);
            global.logger.debug('indexing done!');
        }    
    },
    'reply-search' : {
        'TIME_OUT' : function(message){
            const {messageKey} = message;
            let currentSearching = masterMonitorStore.getMonitor()['searching'];
            masterMonitorStore.setMonitor('searching', currentSearching-1);
            searchEvent.emit(`fail_${messageKey}`);
        },
        'ALL_DONE' : function(message){
            // all search results are replied!
            // 0. if ordering needed, execute ordering
            // 1. concat all result into one array
            // 2. emit sucess_messageKey 
            // 3. delete message in the temporay Map
            const {messageKey, subType} = message;
            const results = global.workerMessages.get(messageKey);
            let ordered = NEED_ORDERING ? getOrdered(results, subType, orderFunc) : getCombined(results);
            global.logger.debug(`[${messageKey}][${subType.key}] all result replied : ${ordered.length}`);
            
            searchEvent.emit(`success_${messageKey}`, ordered);
            global.workerMessages.delete(messageKey);
        }    
    },
    'reply-clear' : {
        'TIME_OUT' : function(){},
        'ALL_DONE' : function(message){
            global.logger.info(`Clearing all worker's data done!`);
            masterMonitorStore.setMonitor('lastIndexedDate', '');
            masterMonitorStore.setMonitor('lastIndexedCount', 0);
            clearEvent.emit(`success_${messageKey}`);
        }     
    },    
}

const addListeners = (workers, worker, handleWokerExit) => {
    worker.on('message', (message) => {
        if(message.type === 'responseMonitor') return;
        const {type, clientId, subType = {}, messageKey, result} = message;
        message.messageKey = parseInt(messageKey);
        const keyLocal = subType.key ? subType.key : subType;
        const resultLocal = result.map ? result.length : result;
        const jobStatus = checkJobStatus(message);

        if(jobStatus === 'TIME_OUT'){
            global.logger.error(`[${messageKey}][${keyLocal}][${clientId}]TIMED-OUT`);
            handler[type]['TIME_OUT'](message);
            return false
        }
        if(jobStatus === 'DONE'){
            global.logger.debug(`[${messageKey}][${keyLocal}][${resultLocal}]ALL-DONE`);
            handler[type]['ALL_DONE'](message);
        }

         type === 'reqly-clear' && reqplyClearHandler(message);
    })
    worker.on('exit', (code,signal) => {
        console.log(`*********** worker exit : [${worker}][${code}][${signal}]`);
        searchEvent.emit('worker_exit');
        // global.workerMessages = clearWorkerMessages();
        const messageKey = keyStore.getNextKey();
        global.workerMessages.set(messageKey,[]);
        const oldWorker = worker;
        const newWorker = restartWorkder('./lib/worker.js', [messageKey]);
        addListeners(workers, newWorker, handleWokerExit);
        handleWokerExit(oldWorker, newWorker);
        masterMonitorStore.setMonitor('searching', 0);
    })
    worker.on('error', (err) => {
        console.log(`*********** worker error : [${worker}]`, err);
    })
}

function reqplyClearHandler(message) {
    const {clientId, messageKey, success} = message;
    global.logger.info(`[${messageKey}][${clientId}] clear result[${success}]`);
    const results = workerMessages.get(messageKey);  
    const TIMED_OUT = !workerMessages.has(messageKey);
    if(TIMED_OUT) {
        // timed out or disappered by unknown action
        console.log(`[${messageKey}] clear reply timed out!`)
        clearEvent.emit(`fail_${messageKey}`);
        return false;
    }
    results.push(success);
    const ALL_CLEAR_DONE = results.length === NUMBER_OF_WORKER;
    if(ALL_CLEAR_DONE){
        clearEvent.emit(`success_${messageKey}`);
        workerMessages.delete(messageKey)
    }
}


// main

const sendLine = (workers, keyStore, lineMaker) => {
    return line => {
     const combinedLine = `${lineMaker.startOfLine}${line}`
    //  console.log(combinedLine)
     if(lineMaker.hasProperColumns(combinedLine)){
         const messageKey = keyStore.getNextKey();
         global.workerMessages.set(messageKey,[]);
         const workerIndex = messageKey % workers.length;
         const supportThreeWords = true;
         const job = {
             type : 'index',
             messageKey,
             data : {
                 wordSep: lineMaker.wordSep,
                 line: combinedLine,
                 supportThreeWords,
             },
         }
         workers[workerIndex].send(job); 
         lineMaker.startOfLine = '';
     } else {
         // to prepend line to next line 
         // this can be occurred, when words contains \r\n.
         global.logger.info('not proper number of columns : ',combinedLine, lineMaker.hasProperColumns(combinedLine));
         //global.logger.trace(combinedLine)
         lineMaker.startOfLine = combinedLine.replace(lineMaker.lineSep, '');
     }
 }
} 

const load =  async (workers, io, options = {}) => {

    //await clear(workers);
    return new Promise((resolve, reject) => {
        const opts = {
            wordSep  : '"^"',
            lineSep  : '\r\n',
            encoding : 'utf8',
            highWaterMark : 64 * 1024 * 10,
            end : global.INDEXING_BYTES,
        }
        const combinedOpts = {
            ...options, 
            ...opts
        };
        global.logger.debug(combinedOpts);
        const {srcFile, encoding, end, wordSep, lineSep} = combinedOpts;
        const rStream = fs.createReadStream(srcFile, {encoding, start:0, end});
        const rl = readline.createInterface({input:rStream});
        const lineMaker = {
            wordSep,
            lineSep,
            startOfLine : '',
            CORRECT_NUMBER_OF_COLUMNS: 2,
            hasProperColumns(line) {
                global.logger.debug(this.CORRECT_NUMBER_OF_COLUMNS, this.wordSep, line.split(this.wordSep).length);
                return line.split(this.wordSep).length === this.CORRECT_NUMBER_OF_COLUMNS;
            }
        }

        global.logger.info('start indexing...');
        rl.on('line', sendLine(workers, keyStore, lineMaker));
        
        rl.on('end', () => { 
            console.log('end: ',keyStore.getKey());
    
        });
        rStream.on('close', () => {
            console.log('read stream closed!');
            const totalProcessed = keyStore.getKey();
            masterMonitorStore.setMonitor('mem', getMemInfo());
            masterMonitorStore.setMonitor('lastIndexedCount', totalProcessed);
            masterMonitorStore.setMonitor('lastIndexedDate', (new Date()).toLocaleString());
            resolve(totalProcessed);
        })
    })

}

const clear = async (workers) => {
    try {
        // set uniq key (messageKey) and initialize empty result array
        global.logger.info(`clear search array start!`);
        // keyStore.init();
        const messageKey = keyStore.getNextKey();
        workerMessages.set(messageKey, []);

        const timer = setTimeout(() => {
            global.logger.error(`[${messageKey}] timed out! delete form Map`);
            workerMessages.delete(messageKey);
        }, CLEAR_TIMEOUT);

        workers.map(worker => {
            const job = {
                type: 'clear',
                messageKey,
                subType: null,
                data: null
            }
            worker.send(job);
        })
        return await waitResult(messageKey, timer, clearEvent);
    } catch (err) {
        global.logger.error(err);
    }

}

const search = async (workers, cacheWorkers, {group, pattern, patternJAMO, RESULT_LIMIT_WORKER, supportThreeWords}) => {
    try {
     
        const messageKey = keyStore.getNextKey();        
        global.workerMessages.set(messageKey, []);
  
        // if any of worker exeed timeout, delete temporary search result.
        const timer = setTimeout(() => {
            global.logger.error(`[${messageKey}] timed out! delete form Map`);
            global.workerMessages.delete(messageKey);
        }, SEARCH_TIMEOUT);

        
        // result limit per worker
        const limit = RESULT_LIMIT_WORKER;

        // send search jot to each workers
        workers.map(async worker => {
            const job = {
                type : 'search',
                subType : group,
                messageKey,
                data : {
                    pattern,
                    patternJAMO,
                    limit,
                    supportThreeWords
                }
            }
            worker.send(job);                 
        })    
        return await waitResult(messageKey, timer, searchEvent); 
    } catch(err) {
        global.logger.error(err);
    }
}

function waitResult(messageKey, timer, event){
    return new Promise((resolve, reject) => {
        //searchEvent emitted when all worker's reply received
        event.once(`success_${messageKey}`, (results) => {
            global.logger.debug(`emitted success_${messageKey}`);
            clearTimeout(timer);
            resolve(results);
        });
        event.once(`fail_${messageKey}`,  () => {
            clearTimeout(timer);
            reject('search failed');
        });
        event.once('worker_exit', () => {
            clearTimeout(timer);
            reject('worker down');
        })
    })
}

const keyStore = {
    init() {this.messageKey = 0},
    getKey() {return this.messageKey},
    getNextKey() {return ++this.messageKey},
    increaseKey() {this.messageKey ++}
}

const init = async (maxWorkers, maxCache, io, handleWokerExit) => {
    keyStore.init();

    // global.logger.info(masterMonitorStore.getMonitor())
    const messageKey = keyStore.getKey();
    global.workerMessages.set(messageKey, []);
    const workerInit= new Array(maxWorkers);
    workerInit.fill(0); 

    const workers = workerInit.map( worker => {
        global.logger.info('start subprocess!')
        return child_process.fork('./lib/worker.js', [messageKey]);
    })

    const cacheWorkers = await initCacheWorkers(maxCache);
    
    // initialize monitorStore
    masterMonitorStore.init(io);
    workerMonitorStore.init(io, workers);
    cacheWorkerMonitorStore.init(io, cacheWorkers);
    logMonitorStore.init(io);

    const monitorStores = {
        masterMonitorStore,
        workerMonitorStore,
        cacheWorkerMonitorStore,
        logMonitorStore
    }

    workers.map(worker => addListeners(workers, worker, handleWokerExit));
    return [workers, cacheWorkers, monitorStores];   
}

const initGatherMonitorLoop = (app, interval) => {
    const monitorStores= app.get('monitorStores');
    const {masterMonitorStore} = monitorStores;
    const {cacheWorkerMonitorStore} = monitorStores;
    
    setInterval(async () => {
        requestUpdateMonitorWorker();
        requestUpdateMonitorMaster();
        await requestUpdateMonitorCache();
    }, interval);

    function requestUpdateMonitorWorker() {
        const workers = app.get('workers');
        workers.map(worker => worker.send('requestMonitor'));
    }
    function requestUpdateMonitorMaster() {
        masterMonitorStore.setMonitor('mem', getMemInfo());
    }

    async function requestUpdateMonitorCache(){
        const cacheWorkers = app.get('cacheWorkers');
        const requestMonitorJob = {
            cmd: 'requestMonitor'
        }
        const reqPromises = cacheWorkers.map(async worker => await worker.runJob(requestMonitorJob));
        const monitorValues = await Promise.all(reqPromises);
        monitorValues.map(value => {
            const {pid, cacheCount, cacheHit, mem} = value;
            cacheWorkerMonitorStore.setMonitor(pid, 'mem', mem);
            cacheWorkerMonitorStore.setMonitor(pid, 'cacheCount', cacheCount);
            cacheWorkerMonitorStore.setMonitor(pid, 'cacheHit', cacheHit);
        })        
    }
}

const attachMessageEventHandler = (app) => {
    const monitorStores = app.get('monitorStores');
    const {workerMonitorStore} = monitorStores;

    const workers = app.get('workers');
    workers.map(worker => {
        worker.on('message', (message) => {
            const {type} = message;
            if(type === 'responseMonitor'){
                const {monitor} = message;
                // console.log(monitor)
                const {pid} = worker;
                workerMonitorStore.setMonitor(pid, 'mem', monitor.mem);
                workerMonitorStore.setMonitor(pid, 'words', monitor.words);
                workerMonitorStore.setMonitor(pid, 'searching', monitor.searching);
            }
        })
    })
}

const initCacheWorkers = async (maxCache) => {
    const cacheWorkers = workerPool.createWorker(cacheModule, [], maxCache, handleProcessExit);
    return cacheWorkers
}
 
module.exports = {
    init,
    load,
    search,
    clear,
    initGatherMonitorLoop,
    attachMessageEventHandler,
    initCacheWorkers
}
