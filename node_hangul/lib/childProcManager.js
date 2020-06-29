
const child_process = require('child_process');
const debug = require('debug')('childProcManager');

const forkWorkers = (jsFile, args, count) => {
    const array = new Array(count);
    array.fill(1);    
    return array.map( element => child_process.fork(jsFile, args));
}

const defaultExitCallback = (oldWorker, newWorker) => {

}

const _attachGetNextIdAPI = worker => {
    worker.nextRequestId = () => {
        const pid = worker.pid;
        worker.jobId = worker.jobId === undefined ? 1 : ++worker.jobId;
        return `${pid}_${worker.jobId}`;
    }
}

const _attachRequestAPI = worker => {
    worker.promise = {};
    worker.promise.request = request => {
        console.log(`requesting...`, request)
        return new Promise((resolve, reject) => {
            const requestId = worker.nextRequestId();
            global.logger.info('requestId : ', requestId)
            worker.send({requestId, request});
            const handleResponse = response => {
                // console.log('response on : ', response)
                const {responseId, success, result} = response;
                if(responseId === undefined){
                    console.error("child process should return response id to manager. or event listenr of workers will increase forever!", response);
                    process.exit();
                }
                if(responseId === requestId) {
                    worker.removeListener('message', handleResponse);
                    if(success) {
                        resolve(result);
                    } else {
                        reject(worker.pid);
                    }
                }            
            }  
            worker.on('message', handleResponse);  
        })
    }
}


class ChildProcessManager {
    constructor(jsFile, args=[], count=2, customExitCallback=defaultExitCallback){
        this.jsFile = jsFile;
        this.jsArgs = args;
        this.customExitCallback = customExitCallback;
        this._workers = forkWorkers(jsFile, args, count);
        this._workers.forEach(worker => this._initWorker(worker));
        this.sequence = 0;
        return this;
    }

    get workers(){ return this._workers}
    get nextWorker(){
        const nextIndex = this.sequence++ % this._workers.length;
        return this._workers[nextIndex]
    }

    request(request, worker){
        if(worker && worker.promise){
            return worker.promise.request(request);
        }
        const requests = this.workers.map(worker => worker.promise.request(request));
        return Pomise.all(requests);
    }

    _initWorker(worker){
        _attachGetNextIdAPI(worker);
        _attachRequestAPI(worker);
        this._attachErrorHandler(worker);
        this._attachExitHandler(worker);
    }

    _attachExitHandler(worker){
        worker.on('exit', (code,signal) => {
            console.log(`*********** worker exit : [${worker.pid}][${code}][${signal}]`);
            const oldWorker = worker;
            const newWorker = child_process.fork(this.jsFile, this.jsArgs);
            this._initWorker(newWorker);
            this.customExitCallback(oldWorker, newWorker);
        })
    }

    _attachErrorHandler(worker){
        worker.on('error', (err) => {
            console.error(`*********** worker error : [${worker.pid}]`, err);
        })
    }
}


module.exports = {
    create : (options) => {
        const {jsFile, args=[], count=2, customExitCallback} = options;
        return new ChildProcessManager(jsFile, args, count, customExitCallback);
    }
}