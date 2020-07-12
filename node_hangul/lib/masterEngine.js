const manager = require('./childProcManager');
const readerClass = require('./readerClass');
const getMemInfo = require('./getMemInfo');

const SEARCH_TIMEOUT = global.SEARCH_TIMEOUT;
const CLEAR_TIMEOUT = global.CLEAR_TIMEOUT;

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
    createSearchWorkers({maxWorkers, searchModule}) {
        const options = {
            jsFile: searchModule,
            args: [],
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
    async loadFromFile(masterMonitor, options = {}){
        let totalLoaded = 0;
        return new Promise(async (resolve, reject) => {
            // masterMonitor.setStatus('indexingStatus', 'INDEX_STARTED');
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
                        // const lastIndexedCount = masterMonitor.getStatus('lastIndexedCount') + 1;
                        // masterMonitor.setStatus('lastIndexedCount', lastIndexedCount)
                        this.lastIndexedCount++;
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
                // masterMonitor.setStatus('indexingStatus', 'INDEX_STARTED');
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
                    const result = await sendLine(this.searchManager.nextWorker, wordArray);                
                    if(result === true){
                        // masterMonitor.setStatus('lastIndexedCount', reader.selected)
                        this.lastIndexedCount = reader.selected;
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
    async addIndex({masterMonitor, wordArray}){

    },
    async delIndexByKey({masterMonitor, key}){

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
                payload : {
                    data : {
                        pattern,
                        patternJAMO,
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

    },
    async delCacheSearchable([artistName, songName]){

    },
    async requestMonitor(managerType){
        const engine = {
            'search' : this.searchManager,
            'cache' : this.cacheManager,
            'master' : this
        }
        const requestMonitorJob = {
            cmd: 'requestMonitor'
        }
        return await engine[managerType].request(requestMonitorJob);
    },
    request({cmd, payload={}}){
        const {monitorStatus={}} = payload;
        let result;
        switch(cmd){
            case 'requestMonitor' :
                result = { 
                    pid : this.pid,
                    mem: getMemInfo(),
                    lastIndexedDate: this.lastIndexedDate,
                    lastIndexedCount: this.lastIndexedCount,
                    lastIndexedPercent: this.lastIndexedPercent,
                    indexingStatus: this.indexingStatus,
                    searching: this.searching
                }
                break;
            case 'setMonitorValue' :
                Object.keys(monitorStatus).forEach(key => {
                    this[key] = monitorStatus[key];
                })
                result = true;
                break;
        }
        return result;
    }

}

// class MasterStatus {
//     constructor(){
//         this._pid = process.pid;
//         this._lastIndexedDate = '';
//         this._lastIndexedCount = 0;
//         this._lastIndexedPercent = '0%';
//         this._indexingStatus = 'NOT_INDEXED'; // 'NOT_INDEXED', 'INDEXING', 'INDEX_DONE'
//         this._pid = process.pid;
//         this._mem = getMemInfo();
//         this._searching = 0
//     }
//     get pid() {return this._pid}
//     get mem() {return getMemInfo();}
//     get lastIndexedDate() {return this._lastIndexedDate}
//     get lastIndexedCount() {return this._lastIndexedCount}
//     get lastIndexedPercent() {return this._lastIndexedPercent}
//     get indexingStatus() {return this._indexingStatus}
//     get searching() {return this._searching};
//     set lastIndexedDate(date) {this._lastIndexedDate = date}
//     set lastIndexedCount(count) {this._lastIndexedCount = count}
//     set lastIndexedPercent(percent) {this._lastIndexedPercent = percent}
//     set indexingStatus(status) {this._indexingStatus = status}
//     set searching(count) {this._searching = count};
// }

const SOCKET_EVENT_NAME = {
    MASTER : 'masterMonitor',
    PROGRESS : 'progress'
}

const INDEXING_STATUS = {
    NOT_INDEXED : 'NOT_INDEXED',
    INDEX_STARTED : 'INDEX_STARTED',
    INDEING : 'INDEXING',
    INDEX_DONE : 'INDEX_DONE'
}

const initMaster = (options) => {
    const {maxWorkers, searchModule, maxCache, cacheModule, notification} = options;
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

    return master
}

module.exports = {
    initMaster
}
