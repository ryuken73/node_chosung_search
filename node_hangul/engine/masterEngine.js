const manager = require('../lib/childProcManager');
const readerClass = require('../lib/readerClass');
const getMemInfo = require('../lib/getMemInfo');

const SEARCH_TIMEOUT = global.SEARCH_TIMEOUT;
const CLEAR_TIMEOUT = global.CLEAR_TIMEOUT;
const SOCKET_EVENT_NAME = {
    MASTER : 'masterMonitor',
    CACHE : 'cacheMonitor',
    SEARCH : 'searchMonitor',
    PROGRESS : 'progress',
    LOG : 'logMonitor'
} 
const INDEXING_STATUS = {
    NOT_INDEXED : 'NOT_INDEXED',
    INDEX_STARTED : 'INDEX_STARTED', 
    INDEING : 'INDEXING',
    INDEX_DONE : 'INDEX_DONE'
}

const handleProcessExit = (oldWorker, newWorker) => console.log(oldWorker.pid, newWorker.pid);

const notifyProgress = (percentProcessed, master) => {
    if(percentProcessed){
        master.broadcast(SOCKET_EVENT_NAME.PROGRESS, percentProcessed);
        master.indexingStatus = INDEXING_STATUS.INDEING;
        master.lastIndexedPercent = `${percentProcessed}%`;
    } 
    parseInt(percentProcessed) === 100 && 
    (master.lastIndexedDate = (new Date()).toLocaleString()
    ,master.indexingStatus = INDEXING_STATUS.INDEX_DONE);
}

const sendLine = async (searchWorker, wordArray) => {
    try {
        const job = {
            cmd : 'index', 
            payload : {
                data : wordArray
            }
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
    bcastIO : null,
    insertCount : 0,
    updateCount : 0,
    deleteCount : 0,
    setInsertCount(count){this.insertCount = count},
    setUpdateCount(count){this.updateCount = count},
    setDeleteCount(count){this.deleteCount = count},
    createSearchWorkers({maxWorkers, searchModule}) {
        const options = {
            jsFile: searchModule,
            args: [global.APPLY_SEARCH_FILTER_STATUS, global.APPLY_SEARCH_FILTER_OPEN_TIME],
            count: maxWorkers,
            customExitCallback: handleProcessExit  
        }
        this.searchManager = manager.create(options); 
    },
    createCacheWorkers({maxCache, cacheModule}){ 
        const options = {
            jsFile: cacheModule,
            args: [], 
            count: maxCache,
            customExitCallback: handleProcessExit
        }
        this.cacheManager = manager.create(options);
    },
    initMasterStatus(initialStatus){
        const {pid, lastIndexedDate, lastIndexedCount, lastIndexedPercent} = initialStatus;
        const {indexingStatus, mem, searching} = initialStatus;
        this.pid = pid;
        this.lastIndexedDate = lastIndexedDate;
        this.lastIndexedCount = lastIndexedCount;
        this.lastIndexedPercent = lastIndexedPercent;
        this.indexingStatus = indexingStatus
        this.mem = mem;
        this.searching = searching;
    },
    initNotification(notification){
        const {enabled, bcastIO} = notification;
        if(enabled) this.bcastIO = bcastIO;
        this.broadcast = (eventName, message) => {
            if(this.bcastIO !== null) this.bcastIO.emit(eventName, message);
        }
    },
    initLog(options){
        const {maxLogs = 100} = options;
        this.log = [];
        this.maxLogs = maxLogs;
    },
    async loadFromFile(options = {}){
        let totalLoaded = 0;
        return new Promise(async (resolve, reject) => {
            this.indexingStatus = INDEXING_STATUS.INDEX_STARTED;
            const reader = await readerClass.createFileReader(options);
            reader.start();
            global.logger.info('start indexing...from File');
            const digit = 0;
            reader.on('line', async line => {
                const percentProcessed = reader.percentProcessed(digit);
                percentProcessed && global.logger.info(`processed... ${percentProcessed}%`);
                notifyProgress(percentProcessed, this);
                const arrayOfLine = reader.lineToArray(line);
                if(arrayOfLine.length > 0){
                    const result = await sendLine(this.searchManager.nextWorker, arrayOfLine);
                    if(result === true) {
                        // this.lastIndexedCount++;
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
    async loadFromDB(options = {}) {
        return new Promise(async (resolve, reject) => {      
            try {
                this.indexingStatus = INDEXING_STATUS.INDEX_STARTED;
                const reader = await readerClass.createDBReader(options);
                reader.start();
                global.logger.info('start indexing...from DB');
                reader.on('data', async dbResult => { 
                    const digit = 1;
                    const percentProcessed = reader.percentProcessed(digit);
                    percentProcessed && global.logger.info(`processed... ${percentProcessed}% [${reader.selected}/${reader.totalRecordsCount}]`);
                    notifyProgress(percentProcessed, this);
                    const wordArray = [dbResult.ARTIST, dbResult.SONG_NAME, dbResult.KEY, dbResult.OPEN_DT, dbResult.STATUS];
                    // global.logger.info(wordArray);
                    await sendLine(this.searchManager.nextWorker, wordArray);                
                    // if(result === true){
                    //     this.lastIndexedCount = reader.selected;
                    // }
                    if(parseInt(percentProcessed) === 100) {
                        global.logger.info(`indexing done = ${percentProcessed}`)
                        resolve(reader.selected);
                    }
                })
            } catch (err) {
                reject(err);
                global.logger.error(err);
                master.setStatus.promise.master({'indexingStatus': 'INDEX_DONE'});
    
            }
        })
    },
    async addIndex({wordArray}){
        const addIndexJob = {
            cmd : 'index',
            data : wordArray
        }
        const resultPromise = await this.searchManager.nextWorker.promise.request(addIndexJob);
        global.logger.debug(resultPromise)
        return resultPromise;
    },
    async delIndexByKey({key}){
        const deleteIndexJob = {
            cmd : 'deleteByKey',
            key
        }
        const resultPromise = await this.searchManager.request(deleteIndexJob);
        global.logger.debug(resultPromise)
        return resultPromise;
    },
    async search(params) {
        try {
            const {inPattern, RESULT_LIMIT_WORKER} = params;
            const pattern = inPattern.pattern;
   
            const timer = setTimeout(() => {
                global.logger.error(`search song timed out!`);
            }, SEARCH_TIMEOUT);
            
            // result limit per worker
            const limit = RESULT_LIMIT_WORKER;
            const job = {
                cmd : 'search',
                payload : {
                    data : {
                        pattern,
                        limit
                    }
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
    async clearIndex() {
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
            master.setStatus.promise.master({'lastIndexedDate': ''});
            master.setStatus.promise.master({'lastIndexedCount': 0});
            master.setStatus.promise.master({'lastIndexedPercent': '0%'});
            master.setStatus.promise.master({'indexingStatus': 'NOT_INDEXED'})
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
            payload: {
                pattern: patternJAMO
            }
        }
        const resultsFromCache = await this.cacheManager.request(cacheSearchJob);
        const cacheHit = resultsFromCache.some(result => result.length !== 0);
        const cacheResponse = resultsFromCache.find(result => result.length !==0);
        return {cacheHit, cacheResponse};
    },
    async addCache({patternJAMO, results}){
        const cacheSetJob = {
            cmd: 'put',
            payload: {
                pattern: patternJAMO,
                results
            }
        }
        const resultPromise = await this.cacheManager.nextWorker.promise.request(cacheSetJob);
        global.logger.debug(resultPromise)
        return resultPromise
    },
    async delCacheByKey({key}){
        const cacheDelJob = {
            cmd: 'deleteByKey',
            payload: {
                key
            }
        }
        const resultPromise = await this.cacheManager.request(cacheDelJob);   
        global.logger.debug(resultPromise);
        return resultPromise;    
    },
    async delCacheSearchable([artistName, songName]){

    },
    getStatus : {
        promise : {
            async search(){
                return await master.searchManager.request({cmd: 'requestMonitor'});
            },
            async cache(){
                return await master.cacheManager.request({cmd: 'requestMonitor'});
            },
            async master(){
                return await master.request({cmd: 'requestMonitor'});
            },
            async scheduledIndex(){
                return await master.request({cmd: 'requestScheduledIndexMonitor'});
            },
            async log(){
                return await master.request({cmd: 'requestLog'});
            }
        }
    }, 
    setStatus : {
        promise : {
            async search(monitorValues){
                return await master.searchManager.request({
                    cmd: 'setMonitorValue',
                    payload: {monitorStatus: monitorValues}
                });
            },
            async cache(monitorValues){
                return await master.cacheManager.request({
                    cmd: 'setMonitorValue',
                    payload: {monitorStatus: monitorValues}
                });
            },
            async master(monitorValues){
                return await master.request({
                    cmd: 'setMonitorValue',
                    payload: {monitorStatus: monitorValues}
                });
            },
            async log(logValue){
                return await master.request({
                    cmd: 'setLog',
                    payload: {monitorStatus: logValue}
                })
            }
        }
    },       
    async request({cmd, payload={}}){
        const {monitorStatus={}} = payload;
        let result;
        switch(cmd){
            case 'requestMonitor' :
                result = { 
                    pid : this.pid,
                    mem: getMemInfo(),
                    lastIndexedDate: this.lastIndexedDate,
                    // lastIndexedCount: this.lastIndexedCount,
                    lastIndexedCount: await this.requestIndexCount(),
                    lastIndexedPercent: this.lastIndexedPercent,
                    indexingStatus: this.indexingStatus,
                    searching: this.searching
                }
                break;
            case 'requestLog' : 
                result = this.log;
                break;
            case 'setMonitorValue' :
                Object.keys(monitorStatus).forEach(key => {
                    this[key] = monitorStatus[key];
                })
                result = true;
                break;
            case 'setLog' :
                const {log} = monitorStatus;
                const storedLog = this.log;
                const newLog = storedLog.length > this.maxLogs ?  storedLog.slice(0, storedLog.length - 1) : [...storedLog];
                newLog.unshift(log);
                this.log = newLog;
                break;
            case 'requestScheduledIndexMonitor' :
                const {insertCount, deleteCount, updateCount} = this
                result = {
                    insertCount,
                    deleteCount,
                    updateCount
                }
            }
        return result;
    },
    async requestIndexCount(){
        try {
            const workersMonitors = await this.searchManager.request({cmd: 'requestMonitor'});
            return workersMonitors.reduce((totalCount, monitorResult) => {
                return totalCount + monitorResult.words}
            ,0)
        } catch (err) {

        }

    }

}

const initMaster = (options) => {
    const {maxWorkers, searchModule, maxCache, cacheModule, notification, logOptions} = options;
    master.createSearchWorkers({maxWorkers, searchModule});
    master.createCacheWorkers({maxCache, cacheModule});
    const initialStatus = {
        pid : process.pid,
        lastIndexedDate : '',
        lastIndexedCount : 0,
        lastIndexedPercent : '0%',          
        indexingStatus : INDEXING_STATUS.NOT_INDEXED,
        mem : getMemInfo(),
        searching : 0
    }        
    master.initMasterStatus(initialStatus);
    master.initNotification(notification);
    master.initLog(logOptions);

    return master
}

module.exports = {
    initMaster
}
