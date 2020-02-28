const Monitor = require('./Monitor').Monitor;

class workerMonitors extends Monitor {
    constructor({initialStatus, bcastIO}) {
        super({initialStatus, bcastIO});
    }
    getStatusById(monitorId){
        const monitor = this.status.get(monitorId);
        if(monitor) return monitor.getStatus();
        return {};
    }
    setStatusById(monitorId, key, value){
        const monitor = this.status.get(monitorId);
        monitor.setStatus(key, value);
    }
}

const createMonitors = (options) => {
    const {monitors=[], monitorId='pid', notification={enabled:false}} = options;
    if(typeof(notification) !== 'object') return new Error('type of notifcation should be object');
    if(monitors.length === 0) return new Error('monitors cannot be empty array');

    const {bcastIO} = notification.enabled ? notification : {};
    const initialStatus = monitors.every(monitor => monitor instanceof Monitor) 
                          &&  monitors.map(monitor => {
                              const key = monitor.getStatus()[monitorId];
                              return [key, monitor]
                          });
    if(initialStatus === false) return new Error('monitors should be instance of Monitor class');
    return new workerMonitors({initialStatus, bcastIO})
}

module.exports = {
    createMonitors,
}
