const child_process = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');
class eventEmitter extends EventEmitter {}

const NUMBER_OF_WORKER = 5;
const SRC_FILE = 'd:/project/tmp/song_mst.txt';
const SEARCH_TIMEOUT = 10000;
const searchResults = new Map();
const searchEvent = new eventEmitter();
let messageKey = 0;

// make array which contains worker's pid
const workerInit= new Array(NUMBER_OF_WORKER);
workerInit.fill(9999);

const workers = workerInit.map( worker => {
    console.log('start subprocess!')
    return child_process.fork('./lib/worker.js');
})

workers.map(worker => {   
    worker.on('message', (message) => {
        const {type, clientId, messageKey, success} = message;
        type === 'notify-start' && console.log(`client ${clientId} started!`);
        type === 'reply-index' && replyIndexHandler(message);
        type === 'reply-search' && replySearchHandler(message);
    })
    worker.on('exit', (code,signal) => {
        console.log(`*********** worker exit : [${worker}][${code}][${signal}]`);
    })
    worker.on('error', (err) => {
        console.log(`*********** worker error : [${worker}]`, err);
    })
})

function replyIndexHandler(message){
    const {clientId, messageKey, success} = message;
    // console.log('got reply-index');
}

function replySearchHandler(message){
    const {clientId, messageKey, result} = message;
    global.logger.trace(`[${messageKey}][${clientId}] number of replies = ${result.length}`)
    if(!searchResults.has(messageKey)) {
        // timed out or disappered by unknown action
        console.log(`[${messageKey}] search reply timed out!`)
        searchEvent.emit(`fail_${messageKey}`);
        return false;
    }
    const results = searchResults.get(messageKey);    
    results.push(result);
    if(results.length === NUMBER_OF_WORKER){
        // all search result replied!

        const concatedResult = [].concat(...results);
        global.logger.info(`[${messageKey}] all result replied : ${concatedResult.length}`)
        searchEvent.emit(`success_${messageKey}`, concatedResult);
        searchResults.delete(messageKey);
        return true;
    }
    console.log(`[${messageKey}]not all search replied. [${results.length}]`);
}

function readFileStream({wordSep, lineSep, encoding, highWaterMark, workers}) {
    return new Promise((resolve,reject) => {
        let remainString = '';
        let dataEmitCount = 0;
        const rStream = fs.createReadStream(SRC_FILE, {encoding : encoding, start:0});
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

const opts = {
    wordSep  : '^',
    lineSep  : '"\r\n',
    encoding : 'utf8',
    highWaterMark : 64 * 1024 * 10,
    workers,
}

const load =  async (options = {}) => {
    const combinedOpts = Object.assign({},opts,options);
    return await readFileStream(combinedOpts);
}

const search = async (pattern, jamo, LIMIT_PER_WORKER=1000) => {
    try {
        messageKey ++;
        searchResults.set(messageKey, []);
    
        const timer = setInterval(() => {
            global.logger.error(`[${messageKey}] timed out! delete form Map`);
            searchResults.delete(messageKey);
        }, SEARCH_TIMEOUT);
        
        const limit = LIMIT_PER_WORKER;
        workers.map(async worker => {
            const job = {
                type : 'search',
                messageKey,
                data : {
                    pattern,
                    jamo,
                    limit
                }
            }
            worker.send(job);                 
        })    
        return await waitResult(messageKey, timer); 
    } catch(err) {
        global.logger.error(err);
    }

}

function waitResult(messageKey, timer){
    return new Promise((resolve, reject) => {
        searchEvent.once(`success_${messageKey}`, (results) => {
            clearInterval(timer);
            resolve(results);
        });
        searchEvent.once(`fail_${messageKey}`,  () => {
            clearInterval(timer);
            reject('search failed');
        });
    })
}

// readFileStream(opts)
module.exports = {
    load,
    search,
}