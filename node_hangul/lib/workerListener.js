const child_process = require('child_process');
const monitorUtil = require('./monitorUtil');

const PROGRESS_UNIT = 100000;
const restartWorker = (childModule, argv) => {
    global.logger.info('start new worker messageKey :', argv)
    return child_process.fork(childModule, argv);
}

const replyMonitorHandler = (workersMonitor, message, pid) => {
    const {monitor} = message;
    const workerMonitor = workersMonitor.find(monitor => monitor.getStatus('pid') === pid);
    monitorUtil.setWorkerStatus(workerMonitor, 'mem', monitor.mem);
    monitorUtil.setWorkerStatus(workerMonitor, 'words', monitor.words);
    monitorUtil.setWorkerStatus(workerMonitor, 'searching', monitor.searching);
    return;
};

const replyIndexHandler = (message, masterMonitor) =>{
    const lastIndexedCount = masterMonitor.getStatus('lastIndexedCount') + 1;
    masterMonitor.setStatus('lastIndexedCount', lastIndexedCount)
}

const attachMessageHanlder = ({worker, app, taskResults, handlers}) => {
    worker.on('message', message => {         
        const notGatherableJob = ['notify-start','reply-monitor', 'reply-index'];
       
        const {type, clientId, subType = {}, messageKey, result} = message;
        const taskType = subType.key ? subType.key : 'none';
        const resultForDebug = result.map ? result.length : result;
        const masterMonitor = app.get('masterMonitor');
        const workersMonitor = app.get('workersMonitor');
          
        // type === 'reply-index' && messageKey % PROGRESS_UNIT === 0 && global.logger.info(`processed...[${messageKey}]`);
        type === 'reply-index' && replyIndexHandler(message, masterMonitor);
        type === 'reply-monitor' && replyMonitorHandler(workersMonitor, message, worker.pid);
        global.logger.debug(type, notGatherableJob.includes(type));
        if(notGatherableJob.includes(type)) return; 

        global.logger.debug(`[${messageKey}][${clientId}][${type}][${taskType}]worker done[result:${resultForDebug}]. check Job Status`);
        
        const TIMED_OUT = ! taskResults.has(messageKey);
        if(TIMED_OUT) {
            global.logger.error(`[${messageKey}][${clientId}][${type}][${taskType}]TIMED-OUT`);
            handlers[type]['TIME_OUT'](message);
            return false
        }

        const resultsBefore = taskResults.get(messageKey);  
        const resultsGathered = [...resultsBefore, result];
        taskResults.set(messageKey, resultsGathered);
        
        const ALL_DONE = resultsGathered.length === global.NUMBER_OF_WORKER;  
        if(ALL_DONE) {
            global.logger.info(`[${messageKey}][${taskType}][${resultForDebug}]ALL-DONE`);
            taskResults.delete(messageKey);
            handlers[type]['ALL_DONE'](message, resultsGathered);
        }             
    })
};

const attachExitHandler = ({worker, app, workerModule, handlers}) => {
        worker.on('exit', (code,signal) => {
            console.log(`*********** worker exit : [${worker.pid}][${code}][${signal}]`);
            app.get('searchEvent').emit('worker_exit');

            // fork new worker
            const messageKey = app.get('taskKey').getNextKey();
            app.get('taskResults').set(messageKey,[]);

            const oldWorker = worker;
            const newWorker = restartWorker(workerModule, [messageKey]);
            const oldWorkerPid = oldWorker.pid;
            const newWorkerPid = newWorker.pid;

            // remove old worker and add new worker to global workers
            global.logger.info(`replace worker : old[${oldWorkerPid}] new[${newWorkerPid}]`);
            const workers = app.get('workers');
            const newWorkers = [
              ...workers.filter(worker => worker.pid !== oldWorkerPid),
              newWorker
            ]
            app.set('workers', newWorkers);

            // make new workerMonitor and add to global workersMonitor
            const defaultNotifcationOption = {
                enabled: true,
                bcastIO: app.get('io')
            }
            const newWorkerMonitor = monitorUtil.mkWorkerMonitor({pid:newWorkerPid, defaultNotifcationOption})
            const workersMonitor = app.get('workersMonitor');

            const oldWorkerPids = workersMonitor.map(workerMonitor =>  workerMonitor.getStatus('pid')); 
            global.logger.info(`old worker Monitors.`, oldWorkerPids);
            const newWorkersMoniotr = [
                ...workersMonitor.filter(workerMonitor => workerMonitor.getStatus('pid') !== oldWorkerPid),
                newWorkerMonitor
            ]
            const newWorkerPids = newWorkersMoniotr.map(workerMonitor =>  workerMonitor.getStatus('pid')); 
            global.logger.info(`new worker Monitors.`, newWorkerPids);
            app.set('workersMonitor', newWorkersMoniotr)

            // attach messageHandler to new worker
            attachMessageHanlder({worker: newWorker, app, taskResults: app.get('taskResults'), handlers});
            attachExitHandler({worker: newWorker, app, workerModule, handlers});
            attachErrorHandler(newWorker);
            // addListeners(workers, newWorker, workerExitHandler);
            // workerExitHandler(oldWorker, newWorker);
            app.get('masterMonitor').setStatus('searching', 0);
        })       
};

const attachErrorHandler = (worker) => {}

module.exports = {
    attachMessageHanlder,
    attachExitHandler,
    attachErrorHandler
}