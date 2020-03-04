const child_process = require('child_process');
const fs = require('fs');
const readline = require('readline');

const handleProcessExit = (oldWorker, newWorker) => console.log(oldWorker.pid, newWorker.pid);
const workerPool = require('./workPool');

const SEARCH_TIMEOUT = global.SEARCH_TIMEOUT;
const CLEAR_TIMEOUT = global.CLEAR_TIMEOUT;

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

// main
const sendLine = (workers, keyStore, taskResults, lineMaker) => {
    return line => {
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
         const canSendMore = workers[workerIndex].send(job); 
         lineMaker.startOfLine = '';
         if(!canSendMore) global.logger.info(`cannot send to child process(send backlog full): ${messageKey}`);
         return canSendMore;
     } else {
         // to prepend line to next line 
         // this can be occurred, when words contains \r\n.
         global.logger.info('not proper number of columns : ',combinedLine, lineMaker.hasProperColumns(combinedLine));
         //global.logger.trace(combinedLine)
         lineMaker.startOfLine = combinedLine.replace(lineMaker.lineSep, '');
	 return true;
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
            highWaterMark : 64 * 1024,
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
            const canSendMore = sendLine(workers, keyStore, taskResults, lineMaker)(data);
            if(!canSendMore){
                // just pause readstream 1 second!
                global.logger.info('pause stream!')
                rStream.pause();
                setTimeout(() => {global.logger.info('resume stream');rStream.resume()},100);
            }
        });
        
        rl.on('end', () => { 
            console.log('end: ',keyStore.getKey());
    
        });
        rStream.on('close', () => {
            console.log('read stream closed!');
            const totalProcessed = masterMonitor.getStatus('lastIndexedCount');
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
<<<<<<< HEAD
    console.log(workers[0].channel)
=======
    console.log(workers[0].channel);
>>>>>>> 411a1d62285b47b44e953a87e66eb336d6311721

    return workers;       
}

const createCacheWorkers = (maxCache, cacheModule) => { 
    return workerPool.createWorker(cacheModule, [], maxCache, handleProcessExit)
}

module.exports = {
    createWorkers,
    createCacheWorkers,
    load,
    search,
    clear,
    clearCache
}
