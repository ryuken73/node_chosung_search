
const child_process = require('child_process');


const workerPool = {
    createWorker(jsFile, args=[], count=2, workerExitCallback){    
        const array = new Array(count);
        array.fill(1);    
        this.workers = array.map(ele => child_process.fork(jsFile, args));
        this.workers.map(worker => this._attachMethods(worker));
        this.workers.map(worker => this._attachListeners(worker));

        this.jsFile = jsFile;
        this.jsArgs = args;
        this.workerExitCallback = workerExitCallback;

        return this.workers;
    },
    _attachMethods(worker){
        worker.runJob = (job) => {
            return new Promise((resolve, reject) => {
                const pid = worker.pid;
                worker.sequence = worker.sequence ? ++worker.sequence : 1;
                const reqId = `${pid}_${worker.sequence}`;
                // console.log(reqId, job);
                worker.send({reqId, job});
                const handleMessage = (message) => {
                    const {resId, success, result} = message;
                    if(resId === reqId) {
                        global.logger.info(`[workerPool][${pid}]got response:resId =`, resId)
                        worker.removeListener('message', handleMessage);
                        if(success) {
                            resolve(result);
                        } else {
                            reject(result);
                        }
                    }            
                }  
                worker.on('message', handleMessage);  
            })
        };

    },
    _attachListeners(worker){
        worker.on('exit', (code,signal) => {
            console.log(`*********** worker exit : [${worker.pid}][${code}][${signal}]`);
            //searchEvent.emit('worker_exit'); ==> handling timeout
            //global.workerMessages = clearWorkerMessages();
            const oldWorker = worker;
            const newWorker = child_process.fork(this.jsFile, this.jsArgs);
            this._attachMethods(newWorker);
            this._attachListeners(newWorker);
            this.workerExitCallback(oldWorker, newWorker);
        })
        worker.on('error', (err) => {
            console.log(`*********** worker error : [${worker.pid}]`, err);
        })
    }
}

module.exports = workerPool