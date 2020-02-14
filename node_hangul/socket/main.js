class SocketServer {
    constructor(io){
        global.logger.info('create Socket Server!')
        this.rootNameSpace = io.of('/');
        this.io = io;
        this.monitorStores = {};
      
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
        this.monitorStores.logMonitorStore && this.rootNameSpace.emit('logMonitor',this.monitorStores.logMonitorStore.getMonitor().log);
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
    setMonitorStores(monitorStores){
        global.logger.trace(monitorStores.masterMonitorStore.getMonitor())
        global.logger.trace(monitorStores.workerMonitorStore.getMonitor())
        this.monitorStores = monitorStores;
    }
    startBroadcastLoop(interval = 5000){
        global.logger.info('start broadcast loop!');
        // this.rootNameSpace.emit('logMonitor',this.monitorStores.logMonitorStore.getMonitor().log);
        return setInterval(() => {
            this.rootNameSpace.emit('masterMonitor',this.monitorStores.masterMonitorStore.getMonitor());
            this.rootNameSpace.emit('workerMonitor',this.monitorStores.workerMonitorStore.getMonitor());
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