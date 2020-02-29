const getMemInfo = require('./getMemInfo');
const monitorUtil = require('./monitorUtil');

const master = (masterMonitor, interval) => {
    setInterval(() => {
        masterMonitor.setStatus('mem', getMemInfo());
    }, interval);
}

const workers = (workers, interval) => {
    setInterval(() => {
        workers.map(worker => worker.send('requestMonitor'));
    }, interval);
}

const cacheWorkers =  (cacheWorkers, cacheWorkersMonitor, interval) => {
    const requestMonitorJob = {cmd: 'requestMonitor'};
    setInterval( async () => {
        const reqPromises = cacheWorkers.map(async worker => await worker.runJob(requestMonitorJob));
        const monitorValues = await Promise.all(reqPromises);
        monitorValues.map(value => {
            const {pid, cacheCount, cacheHit, mem} = value;
            monitorUtil.setCacheStatus(pid, 'mem', mem);
            monitorUtil.setCacheStatus(pid, 'cacheCount', cacheCount);
            monitorUtil.setCacheStatus(pid, 'cacheHit', cacheHit);
        })   
    }, interval);
    
}

module.exports = {
    master,
    workers,
    cacheWorkers,
}