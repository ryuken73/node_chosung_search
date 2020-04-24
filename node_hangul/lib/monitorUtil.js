const monitor = require('./monitor');
const getMemInfo = require('./getMemInfo');

let app ;
const initialize = (appRef) => {app = appRef;}

const mkWorkerMonitor = ({pid, defaultNotifcationOption}) => {
    // global.logger.trace('called mkWorkerMonitor,',defaultNotifcationOption);
    const initialStatus = {
        pid ,
        mem : getMemInfo(),
        words : 0,
        searching : 0
    }
    const options = {
        initialStatus,
        notification: {...defaultNotifcationOption, ...{bcastDefaultEventName:'workerMonitor'}} 
    }
    // global.logger.debug(options);
    return monitor.createMonitor(options);
}
  
const mkCacheWorkerMonitor = ({pid, defaultNotifcationOption}) => {
    // global.logger.trace('called mkCacheWorkerMonitor,',defaultNotifcationOption);
    const initialStatus = {
        pid ,
        mem : getMemInfo(),
        cacheCount : 0,
        cacheHit : 0
    }
    const options = {
        initialStatus,
        notification: {...defaultNotifcationOption, ...{bcastDefaultEventName:'cacheWorkerMonitor'}} 
    }
    return monitor.createMonitor(options);
}

const getAllStatus = (workersMonitor) => {
    const allStatus = workersMonitor.map(workerMonitor => {
        global.logger.trace(workerMonitor.getStatus())
        return workerMonitor.getStatus()
    })
    return allStatus.flat();
}

const setCacheStatus = (pid, key, value) => {
    const cacheWorkersMonitor = app.get('cacheWorkersMonitor');
    const cacheWorker = cacheWorkersMonitor.find(monitor => monitor.getStatus('pid') === pid);
    cacheWorker.setStatus(key, value);
}

const setWorkerStatus = (pid, key, value) => {
    const workersMonitor = app.get('workersMonitor');
    const workerMonitor = workersMonitor.find(monitor => monitor.getStatus('pid') === pid);
    workerMonitor.setStatus(key, value)
}

module.exports = {
    initialize,
    mkWorkerMonitor,
    mkCacheWorkerMonitor,
    getAllStatus,
    setCacheStatus,
    setWorkerStatus,
}