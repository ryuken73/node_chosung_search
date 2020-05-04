const monitor = require('./monitor');
const getMemInfo = require('./getMemInfo');

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

const setCacheStatus = (cacheWorker, key, value) => {
    cacheWorker.setStatus(key, value);
}

const setWorkerStatus = (workerMonitor, key, value) => {
    workerMonitor.setStatus(key, value)
}

module.exports = {
    // initialize,
    mkWorkerMonitor,
    mkCacheWorkerMonitor,
    getAllStatus,
    setCacheStatus,
    setWorkerStatus,
}