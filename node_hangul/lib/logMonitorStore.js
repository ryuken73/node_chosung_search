const logMonitorStore = {
    init(io) {
      this.monitor = {    
        log : []
      }; 
      this.io = io;
      this.io.emit('logMonitor', this.monitor);
    },
    getMonitor() {return {...this.monitor}},
    setMonitor(key, value) {
        // console.log(key, value)
        this.monitor[key] = value;
    },
    broadcast() {this.io.emit('logMonitor', this.monitor.log);}
}

module.exports = logMonitorStore;