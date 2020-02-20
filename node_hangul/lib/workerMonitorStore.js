const workerMonitorStore = {
    init(io, workers) {
        this.io = io;
        // initialMonitors : input for new Map(), like [[pid, {pid:, mem:, words, working:}][]]
        const initialMonitors = workers.map(worker => [worker.pid, {
            pid: worker.pid,
            mem : '0MB',
            words : 0,
            searching : 0
        }]);
        this.monitor = new Map(initialMonitors);
        this.io.emit('workerMonitor', this.monitor.values());
    },
    getMonitor(pid){
        const result = pid ? this.monitor.get(pid) : [...this.monitor.values()];
        return result
    },
    setMonitor(pid, key, value){
        const workerMonitor = this.monitor.get(pid);
        const newMonitor = {...workerMonitor, [key]:value};
        this.monitor.set(pid, newMonitor);
        //this.io.emit('worker-monitor', this.getMonitor());
    },
    delWorker(pid){
        this.monitor.delete(pid)
    },
    addWorker(pid){
        this.monitor.set(pid, {
            pid: pid,
            mem : '0MB',
            words : 0,
            searching : 0
        });
    },
    broadcast(){
        this.io.emit('workerMonitor', this.monitor.values());
    }
}

module.exports = workerMonitorStore;