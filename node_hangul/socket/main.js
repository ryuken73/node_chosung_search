const monitorUtil = require('../lib/monitorUtil');

class SocketServer {
    constructor(io){
        global.logger.info('create Socket Server!')
        this.rootNameSpace = io.of('/');
        this.io = io;
        this.monitors = {};
      
        this.rootNameSpace.on('connect', (socket) => {
            console.log('connect on root namespace')
            this.connectHandler(socket);      
            socket.on('disconnect', this.commonDisconnectHandler(socket));         
        })
    }
    connectHandler(socket){
        const sockInfo = this.getInfo(socket);
        const message = `[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}] : new client connected`;
        global.logger.debug(message);
        socket.nsp.emit('msg', message); 
        socket.emit('notify-your-socketid', socket.id); 
        this.monitors.logMonitor && this.rootNameSpace.emit('logMonitor',this.monitors.logMonitor.getStatus().log);
        this.monitors.masterMonitor && this.rootNameSpace.emit('masterMonitor',this.monitors.masterMonitor.getStatus());   
    }
    commonDisconnectHandler(socket){
        return (reason) => {
            const sockInfo = this.getInfo(socket);
            const message = `[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}] : client disconnected : reason ${reason}`
            global.logger.debug(message);
            //cannot broadcast after disconnect event
            socket.nsp.emit('msg', message);
        }
    }
    setMonitorStores(monitors){
        // this.app = app;
        // const logMonitor = app.get('logMonitor');
        // const masterMonitor = app.get('masterMonitor');
        // const workersMonitor = app.get('workersMonitor');
        // const cacheWorkersMonitor = app.get('cacheWorkersMonitor');
        this.monitors = monitors
    }
    registerMaster(masterEngine){
        this.masterEngine = masterEngine;
    }
    getCurrentMonitor(){
        const workersMonitor = this.monitors.workersMonitor;
        const cacheWorkersMonitor = this.monitors.cacheWorkersMonitor;
        return {workersMonitor, cacheWorkersMonitor};
    }
    // startBroadcastLoop(interval = 5000){
    //     global.logger.info('start broadcast loop!');
    //     const {masterMonitor} = this.monitors;
    //     return setInterval(() => {
    //         const {workersMonitor, cacheWorkersMonitor} = this.getCurrentMonitor();
    //         const allStatus = monitorUtil.getAllStatus(workersMonitor);
    //         global.logger.trace('allStatus,', allStatus);
    //         this.rootNameSpace.emit('masterMonitor', masterMonitor.getStatus());
    //         // this.rootNameSpace.emit('workerMonitor', monitorUtil.getAllStatus(workersMonitor));
    //         this.rootNameSpace.emit('workerMonitor', allStatus);
    //         this.rootNameSpace.emit('cacheWorkerMonitor', monitorUtil.getAllStatus(cacheWorkersMonitor));
    //     }, interval)
    // } 
    startBroadcastLoop(interval = 5000){
        global.logger.info('start broadcast loop!');
        const {masterEngine} = this;
        return setInterval(async () => {
            const masterStatus = await masterEngine.requestMonitor('master');
            const searchWorkersStatus = await masterEngine.requestMonitor('search');
            const cacheWorkersStatus = await masterEngine.requestMonitor('cache');
            this.rootNameSpace.emit('masterMonitor', masterStatus);
            this.rootNameSpace.emit('workerMonitor', searchWorkersStatus);
            this.rootNameSpace.emit('cacheWorkerMonitor', cacheWorkersStatus);
            
            // const {workersMonitor, cacheWorkersMonitor} = this.getCurrentMonitor();
            // const allStatus = monitorUtil.getAllStatus(workersMonitor);
            // global.logger.trace('allStatus,', allStatus);
            // this.rootNameSpace.emit('masterMonitor', masterMonitor.getStatus());
            // // this.rootNameSpace.emit('workerMonitor', monitorUtil.getAllStatus(workersMonitor));
            // this.rootNameSpace.emit('workerMonitor', allStatus);
            // this.rootNameSpace.emit('cacheWorkerMonitor', monitorUtil.getAllStatus(cacheWorkersMonitor));
        }, interval)
    }
    getInfo(socket){
        return {
            namespace : socket.nsp.name,
            alias : socket.alias ? socket.alias : 'guest' ,
            servername : socket.servername ? socket.servername : global.HOSTNAME ,
            address : socket.handshake.address
        }
    }

}

const createServer = (io) => {
    const sockApp = new SocketServer(io);
    return sockApp;
}


module.exports = {
    createServer,
}