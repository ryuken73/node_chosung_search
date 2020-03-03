const mapToObject = (mapInstance) => {
    return [...mapInstance].reduce((acc, curr) => {
        const [key, value] = curr;
        acc[key] = value;
        return acc;
    }, {})
}

class Monitor {
    constructor({initialStatus, bcastIO}){

        this.status = initialStatus.map ? new Map(initialStatus) : new Map(Object.entries(initialStatus));
        if(bcastIO){
            this.io = bcastIO;
            this.broadcast();
        }
    }   
    getStatus(){
        return mapToObject(this.status);
    }
    setStatus(key, value){
        try{
            this.status.set(key, value);
        } catch(err) {
            throw new Error(err);
        }
    }
    broadcast({eventName, message=this.getStatus()}){
        try{
            this.io && this.io.emit(eventName, message);
        } catch(err) {
            throw new Error(err);
        }
    }
}

const createMonitor = (options) => {
    const {initialStatus={}, notification={enabled:false}} = options;
    if(typeof(initialStatus) !== 'object') return new Error('type of initialStatus must be object');
    if(typeof(notification) !== 'object') return new Error('type of notifcation should be object');
    const {bcastIO} = notification.enabled ? notification : {};
    return new Monitor({initialStatus, bcastIO})
}

exports.Monitor = Monitor;
exports.createMonitor = createMonitor;