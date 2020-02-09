const child_process = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');
class eventEmitter extends EventEmitter {}

const NUMBER_OF_WORKER = global.NUMBER_OF_WORKER;
const SEARCH_TIMEOUT = global.SEARCH_TIMEOUT;
const CLEAR_TIMEOUT = global.CLEAR_TIMEOUT;
//const SRC_FILE = global.SRC_FILE;
const searchEvent = new eventEmitter();
const clearEvent = new eventEmitter();
const NEED_ORDERING = false;
let searchResults = new Map();
let clearResults = new Map();
// let messageKey = 0;

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
    global.logger.trace(`before sort : %j`, origResult);
    global.logger.trace(`after sort : %j`, flattened);
    
    return flattened
}

const getOrdered = (results, subType, orderFunction) => {
    return orderFunction(results, subType);
}

const clearSearchResult = () => {
    return new Map();
}

const restartWorkder = (childModule) => {
    return child_process.fork(childModule);
}

// const reflectNewChild = (oldWorker, newWorker, workers) => {
//     console.log(`replace workder : old[${oldWorker.pid}] new[${newWorker.pid}]`)
//     addListeners(newWorker)
//     return [
//         ...workers.filter(worker => worker.pid !== oldWorker.pid),
//         newWorker
//     ]
// }

const addListeners = (workers, worker, handleWokerExit) => {
    worker.on('message', (message) => {
        const {type, clientId} = message;
        type === 'notify-start' && console.log(`worker ${clientId} started!`);
        type === 'reply-index' && replyIndexHandler(message);
        type === 'reply-search' && replySearchHandler(message);
        type === 'reqly-clear' && reqplyClearHandler(message);
    })
    worker.on('exit', (code,signal) => {
        console.log(`*********** worker exit : [${worker}][${code}][${signal}]`);
        searchEvent.emit('worker_exit');
        searchResults = clearSearchResult();
        const oldWorker = worker;
        const newWorker = restartWorkder('./lib/worker.js');
        addListeners(workers, newWorker, handleWokerExit);
        handleWokerExit(oldWorker, newWorker);
        //workers = reflectNewChild(oldWorker, newWorker, workers);
    })
    worker.on('error', (err) => {
        console.log(`*********** worker error : [${worker}]`, err);
    })
}

// worker functions

// make array which contains worker's pid
// const workerInit= new Array(NUMBER_OF_WORKER);
// workerInit.fill(9999);

// let workers = workerInit.map( worker => {
//     console.log('start subprocess!')
//     return child_process.fork('./lib/worker.js');
// })

// workers.map(worker => addListeners(worker));

// function replyIndexHandler(message){
//     const {clientId, messageKey, success} = message;
//     // console.log('got reply-index');
// }

// handler for processing worker's search results;
function replySearchHandler(message){
    const {clientId, messageKey, subType, result} = message;
    global.logger.trace(`[${messageKey}][${clientId}][${subType.key}] number of replies = ${result.length}`)
    // if searchResults Map doesn't have given messageKey, it was timed out!
    // refer to timer in search  function.
    // console.log(searchResults);
    const TIMED_OUT = !searchResults.has(messageKey);
    if(TIMED_OUT) {
        // timed out or disappered by unknown action
        console.log(`[${messageKey}] search reply timed out!`)
        searchEvent.emit(`fail_${messageKey}`);
        return false;
    }
    const results = searchResults.get(messageKey);  
    results.push(result);
    const ALL_SEARCH_DONE = results.length === NUMBER_OF_WORKER;

    if(ALL_SEARCH_DONE){

        // all search results are replied!
        // 0. if ordering needed execute order
        // 1. concat all result into one array
        // 2. emit sucess_messageKey 
        // 3. delete message in the temporay Map

        let ordered = NEED_ORDERING ? getOrdered(results, subType, orderFunc) : getCombined(results);
        // const concatedResult = [].concat(...ordered);
        global.logger.trace(`[${messageKey}][${subType.key}] all result replied : ${ordered.length}`)
        searchEvent.emit(`success_${messageKey}`, ordered);
        searchResults.delete(messageKey);
        return true;
    }
    global.logger.trace(`[${messageKey}][${clientId}][${subType.key}] not all search replied. [${results.length}]`);
}

function reqplyClearHandler(message) {
    const {clientId, messageKey, success} = message;
    global.logger.info(`[${messageKey}][${clientId}] clear result[${success}]`);
    const results = clearResults.get(messageKey);  
    const TIMED_OUT = !clearResults.has(messageKey);
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
        clearResults.delete(messageKey)
    }
}

function readFileStreamAndSendJob(workers, {srcFile, wordSep, lineSep, encoding, highWaterMark, end}) {
    return new Promise((resolve,reject) => {
        let remainString = '';
        let dataEmitCount = 0;
        const rStream = fs.createReadStream(srcFile, {encoding : encoding, start:0, end});
        let messageKey = 0;
        rStream.on('data', (buff) => {
            //console.log('on data')
            dataEmitCount++;
            const data = remainString + buff.toString();
            const dataArray = data.split(lineSep);
            if(!data.endsWith(lineSep)){
                remainString = dataArray.pop();
            } else {
                remainString = '';
            } 
            //global.logger.trace(dataArray)
            dataArray.map(line => {
                // send line to child worker to index
                messageKey++ 
                const workerIndex = messageKey % workers.length;
                const job = {
                    type : 'index',
                    messageKey,
                    data : {
                        wordSep,
                        line
                    }
                }
                workers[workerIndex].send(job)
            })
        })
    
        rStream.on('end', () => {
            console.log('end');
            const totalProcessed = messageKey;
            resolve(totalProcessed);
        });
        rStream.on('close', () => {
            console.log('read stream closed!');
        })
    })


}

// main


const load =  async (workers, options = {}) => {
    global.logger.trace(options);
    const opts = {
        wordSep  : '^',
        lineSep  : '\r\n',
        encoding : 'utf8',
        highWaterMark : 64 * 1024 * 10,
        end : global.INDEXING_BYTES,
    }
    const combinedOpts = {
        ...options, 
        ...opts
    };
    global.logger.trace(combinedOpts);
    return await readFileStreamAndSendJob(workers, combinedOpts);
}

const clear = async () => {
    try {
        // set uniq key (messageKey) and initialize empty result array
        messageKey ++;
        clearResults.set(messageKey, []);

        const timer = setTimeout(() => {
            global.logger.error(`[${messageKey}] timed out! delete form Map`);
            clearResults.delete(messageKey);
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

const search = async (workers, {group, pattern, patternJAMO, RESULT_LIMIT_WORKER}) => {
    try {
        // set uniq search key (messageKey) and initialize empty result array
        // messageKey ++;
        // const lastKey = app.get('messageKey');
		// const messageKey = lastKey + 1;
        // app.set(messageKey);
        global.logger.info(`SEARCH_TIMEOUT: ${SEARCH_TIMEOUT}`);
        global.messageKey++;
        const messageKey = global.messageKey;
        
        searchResults.set(messageKey, []);
    
        // if any of worker exeed timeout, delete temporary search result.
        const timer = setTimeout(() => {
            global.logger.error(`[${messageKey}] timed out! delete form Map`);
            searchResults.delete(messageKey);
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
                    limit
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
            global.logger.trace(`emitted success_${messageKey}`);
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

function replyIndexHandler(message){
    // global.logger.trace(message);
    // console.log('got reply-index');
}

const init = (max_workers, handleWokerExit) => {
    const workerInit= new Array(max_workers);
    workerInit.fill(0);

    const workers = workerInit.map( worker => {
        console.log('start subprocess!')
        return child_process.fork('./lib/worker.js');
    })
    
    workers.map(worker => addListeners(workers, worker, handleWokerExit));
    return workers;   
}

module.exports = {
    init,
    load,
    search,
    clear,
}
