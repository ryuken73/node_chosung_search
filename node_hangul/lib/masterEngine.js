const manager = require('./childProcManager');
const readerClass = require('./readerClass');

const SEARCH_TIMEOUT = global.SEARCH_TIMEOUT;
const CLEAR_TIMEOUT = global.CLEAR_TIMEOUT;

const handleProcessExit = (oldWorker, newWorker) => console.log(oldWorker.pid, newWorker.pid);

const notifyProgress = (percentProcessed, masterMonitor) => {
    if(percentProcessed){
        masterMonitor.broadcast({eventName:'progress', message:percentProcessed});
        masterMonitor.setStatus('indexingStatus', 'INDEXING');
        masterMonitor.setStatus('lastIndexedPercent', `${percentProcessed}%`);
    } 
    parseInt(percentProcessed) === 100 && 
    (masterMonitor.setStatus('lastIndexedDate', (new Date()).toLocaleString())
    ,masterMonitor.setStatus('indexingStatus', 'INDEX_DONE'));
}

const sendLine = async (searchWorker, wordArray) => {
    try {
        const job = {
            cmd : 'index', 
            data : wordArray
        }        
        const result = await searchWorker.promise.request(job); 
        return result;
    } catch (err) {
            global.logger.error(err);
    }       
} 

const master = {
    searchManager : null,
    cacheManager : null,
    createSearchWorkers(maxWorkers, searchModile) {
        const options = {
            jsFile: searchModile,
            args: [],
            count: maxWorkers,
            customExitCallback: handleProcessExit  
        }
        this.searchManager = manager.create(options); 
    },
    createCacheWorkers(maxCache, cacheModule){ 
        const options = {
            jsFile: cacheModule,
            args: [], 
            count: maxCache,
            customExitCallback: handleProcessExit
        }
        this.cacheManager = manager.create(options);
    },
    async loadFromFile(masterMonitor, options = {}){
        let totalLoaded = 0;
        return new Promise(async (resolve, reject) => {
            masterMonitor.setStatus('indexingStatus', 'INDEX_STARTED');
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
                    const result = await sendLine(this.searchManager.nextWorker, arrayOfLine);
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
    },
    async loadFromDB(masterMonitor, options = {}) {
        return new Promise(async (resolve, reject) => {      
            try {
                masterMonitor.setStatus('indexingStatus', 'INDEX_STARTED');
                const reader = await readerClass.createDBReader(options);
                reader.start();
                global.logger.info('start indexing...from DB');
                reader.on('data', async dbResult => { 
                    const digit = 1;
                    const percentProcessed = reader.percentProcessed(digit);
                    percentProcessed && global.logger.info(`processed... ${percentProcessed}% [${reader.selected}/${reader.totalRecordsCount}]`);
                    notifyProgress(percentProcessed, masterMonitor);
                    const wordArray = [dbResult.ARTIST, dbResult.SONG_NAME, dbResult.KEY, dbResult.OPEN_DT, dbResult.STATUS];
                    // global.logger.info(wordArray);
                    const result = await sendLine(this.searchManager.nextWorker, wordArray);                
                    if(result === true){
                        masterMonitor.setStatus('lastIndexedCount', reader.selected)
                    }
                    if(parseInt(percentProcessed) === 100) {
                        global.logger.info(`indexing done = ${percentProcessed}`)
                        resolve(reader.selected);
                    }
                })
            } catch (err) {
                reject(err);
                global.logger.error(err);
                masterMonitor.setStatus('indexingStatus', 'INDEX_DONE');
    
            }
        })
    },
    async search({params}) {
        try {
            const {pattern, patternJAMO, RESULT_LIMIT_WORKER} = params;
    
            const timer = setTimeout(() => {
                global.logger.error(`search song timed out!`);
            }, SEARCH_TIMEOUT);
    
            
            // result limit per worker
            const limit = RESULT_LIMIT_WORKER;
            const job = {
                cmd : 'search',
                data : {
                    pattern,
                    patternJAMO,
                    limit
                }
            }
            // send search jot to each workers 
            const result = await this.searchManager.request(job);
            clearTimeout(timer);
            return result;
        } catch(err) {
            global.logger.error(err);
        }
    },
    async clearIndex({masterMonitor}) {
        try {
            global.logger.info(`clear search array start!`);
            const timer = setTimeout(() => {
                global.logger.error(`clear Index timed out! delete form Map`);
            }, CLEAR_TIMEOUT);
    
            const job = {
                cmd: 'clear'
            }
            await this.searchManager.request(job);
            clearTimeout(timer);
            global.logger.info(`clearing all worker's data done!`);
            masterMonitor.setStatus('lastIndexedDate', '');
            masterMonitor.setStatus('lastIndexedCount', 0);
            masterMonitor.setStatus('lastIndexedPercent', '0%');
            masterMonitor.setStatus('indexingStatus', 'NOT_INDEXED')
            return
        } catch (err) { 
            global.logger.error(err); 
        }
    },
    async clearCache() { 
        const cacheClearJob = {
            cmd: 'clear'
        }
        await this.cacheManager.request(cacheClearJob);
        return true;
    },
    async lookupCache({patternJAMO}){
        const cacheSearchJob = {
            cmd: 'get',
            pattern: patternJAMO
        }
        const resultsFromCache = await this.cacheManager.request(cacheSearchJob);
        // const resultPromise = cacheWorkers.map( async worker => await worker.promise.request(cacheSearchJob));
        // const resultsFromCache = await Promise.all(resultPromise);
        const cacheHit = resultsFromCache.some(result => result.length !== 0);
        const cacheResponse = resultsFromCache.find(result => result.length !==0);
        return {cacheHit, cacheResponse};
    },
    async addCache({patternJAMO, results}){
        const cacheSetJob = {
            cmd: 'put',
            pattern: patternJAMO,
            results
        }
        // const cacheIndex = patternJAMO.length % cacheWorkers.length;
        const resultPromise = await this.cacheManager.nextWorker.promise.request(cacheSetJob);
        global.logger.debug(resultPromise)
        return resultPromise
    }
}

const initMaster = (options) => {
    const {maxWorkers, searchModule, maxCache, cacheModule} = options;
    master.createSearchWorkers(maxWorkers, searchModule);
    master.createCacheWorkers(maxCache, cacheModule);
    return master
}

module.exports = {
    initMaster
}
