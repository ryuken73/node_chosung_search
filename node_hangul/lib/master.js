const child_process = require('child_process');
const fs = require('fs');

const NUMBER_OF_WORKER = 5;
const SRC_FILE = 'd:/project/tmp/song_mst.txt';
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

const search = (pattern, jamo) => {
    messageKey ++;
    workers.map(async worker => {
        const job = {
            type : 'search',
            messageKey,
            data : {
                pattern,
                jamo
            }
        }
        worker.send(job);            
    })    
}

// readFileStream(opts)
module.exports = {
    load,
    search,
}