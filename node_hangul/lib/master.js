const child_process = require('child_process');
const handleProcessExit = (oldWorker, newWorker) => console.log(oldWorker.pid, newWorker.pid);
const manager = require('./childProcManager');
const readerClass = require('./readerClass');
// const workerPool = require('./workPool');

const SEARCH_TIMEOUT = global.SEARCH_TIMEOUT;
const CLEAR_TIMEOUT = global.CLEAR_TIMEOUT;

const progressor = total => (processed, digit=0) => {
    return ((processed / total) * 100).toFixed(digit);   
}

// FP : return value only when value changed 
const valueChanged = (startValue) => {
    let oldValue = startValue;
    return (newValue) => {
        if(newValue !== oldValue){
            oldValue = newValue;
            return newValue;
        }
        return false;
    }
}

// main

const sendLine = (workers, keyStore, taskResults, wordArray) => {
    try {
        const messageKey = keyStore.getNextKey();
        //global.workerMessages.set(messageKey,[]);
        taskResults.set(messageKey,[]);
        const workerIndex = messageKey % workers.length;
        const job = {
            type : 'index',
            messageKey,
            data : wordArray
        }        
        const canSendMore = workers[workerIndex].send(job); 
        if(!canSendMore) global.logger.info(`cannot send to child process(send backlog full): ${messageKey}`);
        return canSendMore;
    } catch (err) {
            global.logger.error(err);
    }       
} 

const notifyProgress = (percentProcessed, masterMonitor) => {
    percentProcessed && masterMonitor.broadcast({eventName:'progress', message:percentProcessed});
    percentProcessed && masterMonitor.setStatus('indexingStatus', 'INDEXING');
    parseInt(percentProcessed) === 100 && 
    (masterMonitor.setStatus('lastIndexedDate', (new Date()).toLocaleString())
    ,masterMonitor.setStatus('indexingStatus', 'INDEX_DONE'));
}

const loadFromDB = async (workers, keyStore, taskResults, masterMonitor, options = {}) => {
    return new Promise(async(resolve, reject) => {      
        try {
            const reader = new readClass.createDBReader(options);
            reader.start();
            global.logger.info('start indexing...from DB');
            rStream.on('data', result => {

                const digit = 1;
                const percentProcessed = reader.percentProcessed(digit);

                percentProcessed && global.logger.info(`processed... ${percentProcessed}% [${reader.selected}/${reader.totalRecordsCount}]`);
                notifyProgress(percentProcessed, masterMonitor);
                const wordArray = [result.ARTIST, result.SONG_NAME];
                // console.log(wordArray);  
                const canSendMore = sendLine(workers, keyStore, taskResults, wordArray);
                if(!canSendMore){
                    // just pause readstream 1 second!
                    global.logger.info('pause stream!')
                    reader.rStream.pause();
                    setTimeout(() => {global.logger.info('resume stream');reader.rStream.resume()},100);
                }
            })
            reader.rStream.on('end', () => {
                resolve(selected);
            })
        } catch (err) {
            reject(err);
            global.logger.error(err);
        }
    })
}

const load =  async (workers, keyStore, taskResults, masterMonitor, options = {}) => {
    return new Promise(async (resolve, reject) => {
        const reader = await readerClass.createFileReader(options);
        reader.start();
        global.logger.info('start indexing...from File');

        reader.on('line', line => {
            const digit = 0;
            const percentProcessed = reader.percentProcessed(digit);
            percentProcessed && global.logger.info(`processed... ${percentProcessed}%`);
            notifyProgress(percentProcessed, masterMonitor);
            const arrayOfLine = reader.lineToArray(line);
            if(arrayOfLine.length > 0){
                const canSendMore = sendLine(workers, keyStore, taskResults, arrayOfLine);
                if(!canSendMore){
                    // just pause readstream 1 second!
                    global.logger.info('pause stream!')
                    reader.rStream.pause();
                    setTimeout(() => {global.logger.info('resume stream');reader.rStream.resume()},100);
                }
                return;
            }
            global.logger.info('not proper number of columns : ', line);
        });        
        reader.rl.on('end', () => { 
            console.log('end: ',keyStore.getKey());
    
        });
        reader.rStream.on('close', () => {
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
        return await cacheWorker.promise.request(job);
    })
    return Promise.all(clearJobs);
}

const search = async ({workers, keyStore, taskResults, searchEvent, params}) => {
    try {
        const {pattern, patternJAMO, RESULT_LIMIT_WORKER, supportThreeWords} = params;
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
        const removeEventListeners = (messageKey) => {
            event.removeListener(`success_${messageKey}`,  successHandler);
            event.removeListener(`fail_${messageKey}`,  failureHandler);
            event.removeListener('worker_exit', exitHandler); 
        }
    
        const successHandler = results => {
            global.logger.debug(`emitted success_${messageKey}`);
            clearTimeout(timer);     
            resolve(results);
            removeEventListeners(messageKey);
        }
        const failureHandler = () => {
            clearTimeout(timer);
            reject('search failed');    
            removeEventListeners(messageKey);
        }
        const exitHandler = () => {
            clearTimeout(timer);
            reject('worker down');
            removeEventListeners(messageKey);        
        }
        event.once(`success_${messageKey}`, successHandler);
        event.once(`fail_${messageKey}`,  failureHandler);
        event.once('worker_exit', exitHandler);              
    })
}

const createWorkers = (maxWorkers, workerModule, startWorkerMessageKey) => {
    // const key = app.get('taskKey').getKey();
    // app.get('taskResults').set(key, []); 

    const workerInit= new Array(maxWorkers);
    workerInit.fill(0); 

    const workers = workerInit.map( worker => {
        global.logger.info('starting subprocess!')
        return child_process.fork(workerModule, [startWorkerMessageKey]);
    })

    workers.map(worker => global.logger.info(`[${worker.pid}]worker started!`));
    // console.log(workers[0].channel)

    return workers;       
}

const createCacheWorkers = (maxCache, cacheModule) => { 
    const options = {
        jsFile: cacheModule,
        args: [],
        count: maxCache,
        customExitCallback: handleProcessExit
    }
    return manager.create(options);
    // return workerPool.createWorker(cacheModule, [], maxCache, handleProcessExit)
}

module.exports = {
    createWorkers,
    createCacheWorkers,
    load,
    loadFromDB,
    search,
    clear,
    clearCache
}
