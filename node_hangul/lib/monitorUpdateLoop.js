const getMemInfo = require('./getMemInfo');
const monitorUtil = require('./monitorUtil');

const start = {
    master : (masterMonitor, interval) => {
        setInterval(() => {
            masterMonitor.setStatus('mem', getMemInfo());
        }, interval);
    },
     
    workers : (app, workersMonitor, interval) => {
        const requestMonitorJob = {cmd: 'requestMonitor'};
        const workers = app.get('workers');
        workers.map(worker => {
            setInterval( async () => {
                global.logger.trace('worker.pid: ', worker.pid);
                const result = await worker.promise.request(requestMonitorJob);
                const {pid, words, searching, mem} = result;
                const workerMonitor = workersMonitor.find(monitor => monitor.getStatus('pid') === pid);
                monitorUtil.setWorkerStatus(workerMonitor, 'mem', mem);
                monitorUtil.setWorkerStatus(workerMonitor, 'words', words);
                monitorUtil.setWorkerStatus(workerMonitor, 'searching', searching);

            }, interval);
        })
    },
    
    cacheWorkers : (app, cacheWorkersMonitor, interval) => {
        const requestMonitorJob = {cmd: 'requestMonitor'};
        setInterval( async () => {
            const cacheWorkers = app.get('cacheWorkers');
            const reqPromises = cacheWorkers.map(async worker => await worker.promise.request(requestMonitorJob));
            const monitorValues = await Promise.all(reqPromises);
            monitorValues.map(value => {
                const {pid, cacheCount, cacheHit, mem} = value;
                const cacheWorker = cacheWorkersMonitor.find(monitor => monitor.getStatus('pid') === pid);
                monitorUtil.setCacheStatus(cacheWorker, 'mem', mem);
                monitorUtil.setCacheStatus(cacheWorker, 'cacheCount', cacheCount);
                monitorUtil.setCacheStatus(cacheWorker, 'cacheHit', cacheHit);
            })   
        }, interval);    
    }
    
}


module.exports = {
    start
}