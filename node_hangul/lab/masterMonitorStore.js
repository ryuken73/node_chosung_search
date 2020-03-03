const getMemInfo = require('./getMemInfo');

const masterMonitorStore = {
    init(io) {
        this.monitor = {    
            lastIndexedDate : '',
            lastIndexedCount : 0,
            pid : process.pid,
            mem : getMemInfo(),
            searching : 0
        }; 
        this.io = io;
        this.io.emit('masterMonitor', this.monitor);
    },
    getMonitor() {return {...this.monitor}},
    setMonitor(key, value) {
        // console.log(key, value)
        this.monitor[key] = value;
        //this.io.emit('master-monitor', this.monitor);
    },
    broadcast() {this.io.emit('masterMonitor', this.monitor);}
}

module.exports = masterMonitorStore;