const getMemInfo = require('./getMemInfo');
const monitorUtil = require('./monitorUtil');

const start = {
    master : (masterMonitor, interval) => {
        setInterval(() => {
            masterMonitor.setStatus('mem', getMemInfo());
        }, interval);
    },
    
    workers : (app, interval) => {
        setInterval(() => {
            const workers = app.get('workers');
            const workerPids = workers.map(worker => worker.pid);
            global.logger.trace('workers.pid.', workerPids);
            workers.map(worker => worker.send('requestMonitor'));
        }, interval);
    },
    
    cacheWorkers : (app, cacheWorkersMonitor, interval) => {
        const requestMonitorJob = {cmd: 'requestMonitor'};
        setInterval( async () => {
            const cacheWorkers = app.get('cacheWorkers');
            const reqPromises = cacheWorkers.map(async worker => await worker.runJob(requestMonitorJob));
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