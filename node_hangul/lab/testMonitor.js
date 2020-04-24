const Monitor = require('./Monitor');
const Monitors = require('./Monitors');

const monitorOptions = {
    initialStatus : { log:['xxx'] },
    notification : {enabled:false}
}
const logMonitor = Monitor.createMonitor(monitorOptions);
console.log(logMonitor.getStatus());
logMonitor.setStatus('log', ['111']);
logMonitor.setStatus('log', ['111','222']);
console.log(logMonitor.getStatus());

const workerOptions1 = {
    initialStatus : {
        pid : 1,
        mem : '10KB'
    },
    notification : {enabled:false}
}

const workerOptions2 = {
    initialStatus : {
        pid : 2,
        mem : '100KB'
    }
}


const worker1 = Monitor.createMonitor(workerOptions1);
const worker2 = Monitor.createMonitor(workerOptions2);
console.log(worker1.getStatus())
const monitors = [worker1, worker2];
const workerMonitor = Monitors.createMonitors({monitors});
console.log(workerMonitor.getStatusById(1));
console.log(workerMonitor.getStatusById(2));
console.log(workerMonitor.getStatusById(22));
workerMonitor.setStatusById(1, 'mem', '300kb');
console.log(workerMonitor.getStatusById(1));
console.log(workerMonitor.getStatusById(2));