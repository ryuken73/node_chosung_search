const getMemInfo = require('./getMemInfo');
const monitorUtil = require('./monitorUtil');

const master = (masterMonitor, interval) => {
    setInterval(() => {
        masterMonitor.setStatus('mem', getMemInfo());
    }, interval);
}

const workers = (app, interval) => {
    setInterval(() => {
        const workers = app.get('workers');
        const workerPids = workers.map(worker => worker.pid);
        global.logger.info('workers.pid.', workerPids);
        workers.map(worker => worker.send('requestMonitor'));
    }, interval);
}

const cacheWorkers =  (app, cacheWorkersMonitor, interval) => {
    const requestMonitorJob = {cmd: 'requestMonitor'};
    setInterval( async () => {
        const cacheWorkers = app.get('cacheWorkers');
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