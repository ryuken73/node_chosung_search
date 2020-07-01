const manager = require('./childProcManager');
const readerClass = require('./readerClass');

const SEARCH_TIMEOUT = global.SEARCH_TIMEOUT;
const CLEAR_TIMEOUT = global.CLEAR_TIMEOUT;

const handleProcessExit = (oldWorker, newWorker) => console.log(oldWorker.pid, newWorker.pid);

const createSearchWorkers = (maxWorkers, workerModule) => {
    const options = {
        jsFile: workerModule,
        args: [],
        count: maxWorkers,
        customExitCallback: handleProcessExit 
    }
    return manager.create(options);
}

const createCacheWorkers = (maxCache, cacheModule) => { 
    const options = {
        jsFile: cacheModule,
        args: [],
        count: maxCache,
        customExitCallback: handleProcessExit
    }
    return manager.create(options);
}

const notifyProgress = (percentProcessed, masterMonitor) => {
    percentProcessed && masterMonitor.broadcast({eventName:'progress', message:percentProcessed});
    percentProcessed && masterMonitor.setStatus('indexingStatus', 'INDEXING');
    parseInt(percentProcessed) === 100 && 
    (masterMonitor.setStatus('lastIndexedDate', (new Date()).toLocaleString())
    ,masterMonitor.setStatus('indexingStatus', 'INDEX_DONE'));
}

const sendLine = async (worker, wordArray) => {
    try {
        const job = {
            cmd : 'index',
            data : wordArray
        }        
        const result = await worker.promise.request(job); 
        return result;
    } catch (err) {
            global.logger.error(err);
    }       
} 

const loadFromFile =  async (manager, masterMonitor, options = {}) => {
    let totalLoaded = 0;
    return new Promise(async (resolve, reject) => {
        const reader = await readerClass.createFileReader(options);
        reader.start();
        global.logger.info('start indexing...from File');
        const digit = 0;
        reader.on('line', async line => {
            const percentProcessed = reader.percentProcessed(digit);
            percentProcessed && global.logger.info(`processed... ${percentProcessed}%`);
            notifyProgress(percentProcessed, masterMonitor);
            const arrayOfLine = reader.lineToArray(line);
            if(arrayOfLine.length > 0){
                const result = await sendLine(manager.nextWorker, arrayOfLine);
                if(result === true) {
                    const lastIndexedCount = masterMonitor.getStatus('lastIndexedCount') + 1;
                    masterMonitor.setStatus('lastIndexedCount', lastIndexedCount)
                    totalLoaded++;
                }
            }
            global.logger.debug('not proper number of columns : ', line);
            if(parseInt(percentProcessed) === 100) {
                global.logger.info(`indexing done = ${percentProcessed}`)
                resolve(totalLoaded);
            }
        });        
        reader.rl.on('end', () => { 
            global.logger.info('readline end');
        });
        reader.rStream.on('close', () => {
            global.logger.info('read stream closed!');
        })
    })
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

const clearIndex = async ({manager, masterMonitor}) => {
    try {
        // set uniq key (messageKey) and initialize empty result array
        global.logger.info(`clear search array start!`);
        const timer = setTimeout(() => {
            global.logger.error(`clear Index timed out! delete form Map`);
        }, CLEAR_TIMEOUT);

        const job = {
            cmd: 'clear'
        }
        await manager.request(job);
        global.logger.info(`clearing all worker's data done!`);
        masterMonitor.setStatus('lastIndexedDate', '');
        masterMonitor.setStatus('lastIndexedCount', 0);
        masterMonitor.setStatus('indexingStatus', 'NOT_INDEXED')
        return
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

module.exports = {
    createSearchWorkers,
    createCacheWorkers,
    loadFromFile,
    loadFromDB,
    search,
    clearIndex,
    clearCache
}
