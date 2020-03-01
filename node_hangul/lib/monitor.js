const mapToObject = (mapInstance) => {
    return [...mapInstance].reduce((acc, curr) => {
        const [key, value] = curr;
        acc[key] = value;
        return acc;
    }, {})
}

class Monitor {
    constructor({initialStatus, bcastIO, bcastDefaultEventName}){

        this.status = initialStatus.map ? new Map(initialStatus) : new Map(Object.entries(initialStatus));
        if(bcastIO){
            this.io = bcastIO;
            // this.broadcast({eventName:bcastDefaultEventName});
        }
    }   
    getStatus(key){
        const result = key ? mapToObject(this.status)[key] :  mapToObject(this.status);
        return result;
    }
    setStatus(key, value){
        try{
            this.status.set(key, value);
        } catch(err) {
            throw new Error(err);
        }
    }
    broadcast({eventName, message=this.getStatus()}){
        global.logger.info(`broadcast ${eventName} ${message}`);
        try{
            this.io && this.io.emit(eventName, message);
        } catch(err) {
            throw new Error(err);
        }
    }
}

const createMonitor = ({initialStatus={}, notification={enabled:false}}) => {
    if(typeof(initialStatus) !== 'object') return new Error('type of initialStatus must be object');
    if(typeof(notification) !== 'object') return new Error('type of notifcation should be object');
    const {bcastIO} = notification.enabled ? notification : {};
    const {bcastDefaultEventName} = notification.enabled ? notification : 'notify-status';
    return new Monitor({initialStatus, bcastIO, bcastDefaultEventName})
}

exports.Monitor = Monitor;
exports.createMonitor = createMonitor;