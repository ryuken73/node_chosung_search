const monitor = require('./monitor');
const getMemInfo = require('./getMemInfo');

const mkWorkerMonitor = ({pid, defaultNotifcationOption}) => {
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
    return monitor.createMonitor(options);
}
  
const mkCacheWorkerMonitor = ({pid, defaultNotifcationOption}) => {
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

const loopSetStatus = {
    master : (masterMonitor, interval) => {
        setInterval(() => {
            masterMonitor.setStatus('mem', getMemInfo());
        }, interval);
    },
     
    workers : (app, workersMonitor, interval) => {
        const requestMonitorJob = {cmd: 'requestMonitor'};
        const masterEngine = app.get('masterEngine');
        masterEngine.searchManager.workers.map(worker => {
            setInterval( async () => {
                global.logger.trace('worker.pid: ', worker.pid);
                const result = await worker.promise.request(requestMonitorJob);
                const {pid, words, searching, mem} = result;
                const workerMonitor = workersMonitor.find(monitor => monitor.getStatus('pid') === pid);
                setWorkerStatus(workerMonitor, 'mem', mem);
                setWorkerStatus(workerMonitor, 'words', words);

            }, interval);
        })
    },
    
    cacheWorkers : (app, cacheWorkersMonitor, interval) => {
        const requestMonitorJob = {cmd: 'requestMonitor'};
        setInterval( async () => {
            const masterEngine = app.get('masterEngine');
            const reqPromises = masterEngine.cacheManager.workers.map(async worker => await worker.promise.request(requestMonitorJob));
            const monitorValues = await Promise.all(reqPromises);
            monitorValues.map(value => {
                const {pid, cacheCount, cacheHit, mem} = value;
                const cacheWorker = cacheWorkersMonitor.find(monitor => monitor.getStatus('pid') === pid);
                setCacheStatus(cacheWorker, 'mem', mem);
                setCacheStatus(cacheWorker, 'cacheCount', cacheCount);
                setCacheStatus(cacheWorker, 'cacheHit', cacheHit);
            })   
        }, interval);    
    }    
}

module.exports = {
    mkWorkerMonitor,
    mkCacheWorkerMonitor,
    getAllStatus,
    setCacheStatus,
    setWorkerStatus,
    loopSetStatus,
}