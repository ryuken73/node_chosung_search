// const monitorUtil = require('.   ./lib/monitorUtil');

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
    async connectHandler(socket){
        const sockInfo = this.getInfo(socket);
        const message = `[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}] : new client connected`;
        global.logger.debug(message);
        socket.nsp.emit('msg', message); 
        socket.emit('notify-your-socketid', socket.id); 

        const {masterEngine} = this;
        this.rootNameSpace.emit('logMonitor', await masterEngine.getStatus.promise.log());
        this.rootNameSpace.emit('masterMonitor', await masterEngine.getStatus.promise.master());   
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
        this.monitors = monitors
    }
    registerMaster(masterEngine){
        this.masterEngine = masterEngine;
    }
    startBroadcastLoop(interval = 5000){
        global.logger.info('start broadcast loop!');
        const {masterEngine} = this;
        return setInterval(async () => {
            const masterStatus = await masterEngine.getStatus.promise.master();
            const searchWorkersStatus = await masterEngine.getStatus.promise.search();
            const cacheWorkersStatus = await masterEngine.getStatus.promise.cache();    
            const scheduledIndexStatus = await masterEngine.getStatus.promise.scheduledIndex(); 
            this.rootNameSpace.emit('masterMonitor', masterStatus);
            this.rootNameSpace.emit('workerMonitor', searchWorkersStatus);
            this.rootNameSpace.emit('cacheWorkerMonitor', cacheWorkersStatus);
            this.rootNameSpace.emit('scheuledIndexMonitor', scheduledIndexStatus);
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