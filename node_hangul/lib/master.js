const child_process = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const handleProcessExit = (oldWorker, newWorker) => console.log(oldWorker.pid, newWorker.pid);
const workerPool = require('./workPool');
const getMemInfo = require('./getMemInfo');

const NUMBER_OF_WORKER = global.NUMBER_OF_WORKER;
const SEARCH_TIMEOUT = global.SEARCH_TIMEOUT;
const CLEAR_TIMEOUT = global.CLEAR_TIMEOUT;
const PROGRESS_UNIT = 100000;

const NEED_ORDERING = false;

let clearResults = new Map();

// console.log(SEARCH_TIMEOUT)

// const getCombined = (results) => {
//     return results.flat();
// }

// const orderFunc = (results, subType) => {
//     // need to be written case by case (own ordering logic)
//     // results looks like
//     // [[{artistName, songName, ...},{..}],[],[]]
//     let sortKey;
//     switch(subType.key){
//         case 'artist' :
//             sortKey = 'artistName';
//             break;
//         case 'artistJAMO' :
//             sortKey = 'artistName';
//             break;  
//         case 'song' :
//             sortKey = 'songName';
//             break;  
//         case 'songJAMO' :
//             sortKey = 'songName';
//             break;
//         case 'artistNsong' :
//             sortKey = 'artistName';
//             break;
//         case 'songNartist' :
//             sortKey = 'songName';
//             break;
//     }

//     const origResult = [...results].flat();
//     const flattened = [...origResult];
//     flattened.sort((a,b) => {
//         return a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0;
//     })
//     global.logger.debug(`before sort : %j`, origResult);
//     global.logger.debug(`after sort : %j`, flattened);
    
//     return flattened
// }

// const getOrdered = (results, subType, orderFunction) => {
//     return orderFunction(results, subType);
// }

// const clearWorkerMessages = () => {
//     return new Map();
// }

// const restartWorker = (childModule, argv) => {
//     global.logger.info('start new worker messageKey :', argv)
//     return child_process.fork(childModule, argv);
// }

const getFileSize = (srcFile) => {
    return new Promise((resolve, reject) => {
        fs.stat(srcFile, (err, stat) => {
            if(err){
                reject(err);
                return
            }
            resolve(stat.size);
        })
    })
}

const indexProgress = {
    processed : 0, 
    oldProcessed : 0,
    async setSrcFile(srcFile){
        this.srcFile = srcFile;
        const srcFileSize = await getFileSize(srcFile);
        this.srcFileSize = srcFileSize;
    },
    update({bytesRead, digit=0}){
        // console.log(this.processed, this.srcFileSize, bytesRead)
        const oldProcessed = ((this.processed / this.srcFileSize)*100).toFixed(digit);
        const newProcessed = ((bytesRead / this.srcFileSize)*100).toFixed(digit);
        this.processed = bytesRead;
        // global.logger.info(oldProcessed, newProcessed)
        const diff = this.srcFileSize - bytesRead;
        if(diff <= 0){
            global.logger.info(this.srcFileSize, bytesRead);
        }
        if(oldProcessed !== newProcessed) return newProcessed;
        return null;
    }
}

// function reqplyClearHandler(message) {
//     const {clientId, messageKey, success} = message;
//     global.logger.info(`[${messageKey}][${clientId}] clear result[${success}]`);
//     const results = workerMessages.get(messageKey);  
//     const TIMED_OUT = !workerMessages.has(messageKey);
//     if(TIMED_OUT) {
//         // timed out or disappered by unknown action
//         console.log(`[${messageKey}] clear reply timed out!`)
//         clearEvent.emit(`fail_${messageKey}`);
//         return false;
//     }
//     results.push(success);
//     const ALL_CLEAR_DONE = results.length === NUMBER_OF_WORKER;
//     if(ALL_CLEAR_DONE){
//         clearEvent.emit(`success_${messageKey}`);
//         workerMessages.delete(messageKey)
//     }
// }


// main
let totalLineBytes = 0;
let totalprocessed = 0;
const sendLine = (workers, keyStore, taskResults, lineMaker) => {
    return line => {
        // console.log(line)
        // totalLineBytes += line.length + 5;
        // totalprocessed += 1
        // global.logger.info(totalLineBytes - 5, totalprocessed);
     const combinedLine = `${lineMaker.startOfLine}${line}`
    //  console.log(combinedLine)
     if(lineMaker.hasProperColumns(combinedLine)){
         const messageKey = keyStore.getNextKey();
         //global.workerMessages.set(messageKey,[]);
         taskResults.set(messageKey,[]);
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

const load =  async (workers, keyStore, taskResults, masterMonitor, options = {}) => {

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
        indexProgress.setSrcFile(srcFile);
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
        rl.on('line', (data) => {
            // console.log(rl.input.bytesRead)
            const bytesRead = rl.input.bytesRead;
            const digit = 0;
            const percentProcessed = indexProgress.update({bytesRead, digit});
            percentProcessed && global.logger.info(`processed... ${percentProcessed}%`);
            percentProcessed && masterMonitor.broadcast({eventName:'progress', message:percentProcessed});
            parseInt(percentProcessed) === 100 && masterMonitor.setStatus('lastIndexedDate', (new Date()).toLocaleString());
            sendLine(workers, keyStore, taskResults, lineMaker)(data)
        });
        
        rl.on('end', () => { 
            console.log('end: ',keyStore.getKey());
    
        });
        rStream.on('close', () => {
            console.log('read stream closed!');
            totalProcessed = masterMonitor.getStatus('lastIndexedCount');
            resolve(totalProcessed);
        })
    })

}

const clear = async ({workers, keyStore, taskResults, clearEvent}) => {
    try {
        // set uniq key (messageKey) and initialize empty result array
        global.logger.info(`clear search array start!`);
        // keyStore.init();
        const messageKey = keyStore.getNextKey();
        taskResults.set(messageKey, []);

        const timer = setTimeout(() => {
            global.logger.error(`[${messageKey}] timed out! delete form Map`);
            taskResults.delete(messageKey);
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

const clearCache = async (cacheWorkers) => {
    const clearJobs = cacheWorkers.map(async cacheWorker => {
        const job = {cmd : 'clear'};
        return await cacheWorker.runJob(job);
    })
    return Promise.all(clearJobs);
}

const search = async ({workers, keyStore, taskResults, searchEvent, params}) => {
    try {
        const {group, pattern, patternJAMO, RESULT_LIMIT_WORKER, supportThreeWords} = params;
        const messageKey = keyStore.getNextKey();        
        taskResults.set(messageKey, []);
  
        // if any of worker exeed timeout, delete temporary search result.
        const timer = setTimeout(() => {
            global.logger.error(`[${messageKey}] timed out! delete form Map`);
            taskResults.delete(messageKey);
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

const createWorkers = (maxWorkers, workerModule, app) => {
    const key = app.get('taskKey').getKey();
    app.get('taskResults').set(key, []);

    const workerInit= new Array(maxWorkers);
    workerInit.fill(0); 

    const workers = workerInit.map( worker => {
        global.logger.info('starting subprocess!')
        return child_process.fork(workerModule, [key]);
    })

    workers.map(worker => global.logger.info(`[${worker.pid}]worker started!`));

    return workers;       
}

const createCacheWorkers = (maxCache, cacheModule) => { 
    return workerPool.createWorker(cacheModule, [], maxCache, handleProcessExit)
}

// const initCacheWorkers = async (maxCache) => {
//     const cacheWorkers = workerPool.createWorker(cacheModule, [], maxCache, handleProcessExit);
//     return cacheWorkers
// }
 
module.exports = {
    createWorkers,
    // restartWorker,
    createCacheWorkers,
    load,
    search,
    clear,
    clearCache
    // initCacheWorkers
}
