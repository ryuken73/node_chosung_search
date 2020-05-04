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

// const indexProgress = {
//     processed : 0, 
//     oldProcessed : 0,
//     async setSrcFile(srcFile){
//         this.srcFile = srcFile;
//         const srcFileSize = await getFileSize(srcFile);
//         this.srcFileSize = srcFileSize;
//     },
//     update({bytesRead, digit=0}){
//         // console.log(this.processed, this.srcFileSize, bytesRead)
//         const oldProcessed = ((this.processed / this.srcFileSize)*100).toFixed(digit);
//         const newProcessed = ((bytesRead / this.srcFileSize)*100).toFixed(digit);
//         this.processed = bytesRead;
//         // global.logger.info(oldProcessed, newProcessed)
//         const diff = this.srcFileSize - bytesRead;
//         if(diff <= 0){
//             global.logger.info(this.srcFileSize, bytesRead);
//         }
//         if(oldProcessed !== newProcessed) return newProcessed;
//         return null;
//     }
// }


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

const loadFromDB = async (workers, keyStore, taskResults, masterMonitor, options = {}) => {
    return new Promise(async(resolve, reject) => {      
        try {
            const {db} = options;
            // get total records
            const getCountSQL = 'select count(*) as total from music.song_mst';
            const result = await db.query(getCountSQL, []);
            const totalRecordsCount = result.shift().TOTAL;
            const getProgress = progressor(totalRecordsCount);
            const emitChangedValue = valueChanged(0);
            // const sql = 'select artist, song_name from smsinst.song_mst fetch first 100 rows only';           
            // const sql = 'select artist, song_name from music.song_mst fetch first 10 rows only';
            const sql = 'select artist, song_name from music.song_mst';
            const params = [];
            const rStream = await db.queryStream(sql, params);
            let selected = 0;
            rStream.on('data', result => {
                selected ++;
                // selected % 1000 === 0 && console.log(selected);
                const digit = 1;
                const percentProcessed = emitChangedValue(getProgress(selected, digit));
                percentProcessed && global.logger.info(`processed... ${percentProcessed}% [${selected}/${totalRecordsCount}]`);
                percentProcessed && masterMonitor.broadcast({eventName:'progress', message:percentProcessed});
                parseInt(percentProcessed) === 100 && masterMonitor.setStatus('lastIndexedDate', (new Date()).toLocaleString());

                const wordArray = [result.ARTIST, result.SONG_NAME];
                // console.log(wordArray);  
                const canSendMore = sendLine(workers, keyStore, taskResults, wordArray);
                if(!canSendMore){
                    // just pause readstream 1 second!
                    global.logger.info('pause stream!')
                    rStream.pause();
                    setTimeout(() => {global.logger.info('resume stream');rStream.resume()},100);
                }
            })
            rStream.on('end', () => {
                resolve(selected);
            })
        } catch (err) {
            reject(err);
            global.logger.error(err);
        }
    })
}

const load =  async (workers, keyStore, taskResults, masterMonitor, options = {}) => {
    //await clear(workers);
    return new Promise(async (resolve, reject) => {
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

        const inputFileSize = await getFileSize(srcFile);
        const getProgress = progressor(inputFileSize);
        const emitChangedValue = valueChanged(0);
        
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
        rl.on('line', (line) => {
            // console.log(rl.input.bytesRead)
            const bytesRead = rl.input.bytesRead;
            const digit = 0;
            const percentProcessed = emitChangedValue(getProgress(bytesRead, digit));
            percentProcessed && global.logger.info(`processed... ${percentProcessed}%`);
            percentProcessed && masterMonitor.broadcast({eventName:'progress', message:percentProcessed});
            parseInt(percentProcessed) === 100 && masterMonitor.setStatus('lastIndexedDate', (new Date()).toLocaleString());
            
            const combinedLine = `${lineMaker.startOfLine}${line}`;
            if(lineMaker.hasProperColumns(combinedLine)){
                lineMaker.startOfLine = '';
                const wordArray = combinedLine.split(lineMaker.wordSep);
                const canSendMore = sendLine(workers, keyStore, taskResults, wordArray);
                if(!canSendMore){
                    // just pause readstream 1 second!
                    global.logger.info('pause stream!')
                    rStream.pause();
                    setTimeout(() => {global.logger.info('resume stream');rStream.resume()},100);
                }
            } else {
                // to prepend line to next line 
                // this can be occurred, when words contains \r\n.
                global.logger.info('not proper number of columns : ',combinedLine, lineMaker.hasProperColumns(combinedLine));
                lineMaker.startOfLine = combinedLine.replace(lineMaker.lineSep, '');
                // return true;
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
    return workerPool.createWorker(cacheModule, [], maxCache, handleProcessExit)
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
