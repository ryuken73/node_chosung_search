const getMemInfo = require('./getMemInfo');

const cache = {
    init : () => {
        this.pid = process.pid;
        this.cache = new Map();
        this.cacheCount = 0;
        this.cacheHit = 0;
        return this;
    },
    lookup : (pattern) => {
        const result = this.cache.get(pattern) || [];
        result.length > 0 && this.cacheHit++;
        return result;
    }, 
    update : (pattern, results) => {
        this.cache.set(pattern, results);
        this.cacheCount++;
        return true;
    },
    delete : (pattern) => {
        this.cache.delete(pattern);
        return true;
    },
    deleteByKey : (key) => {
        const filtered = [...this.cache].filter(([pattern, results]) => {
            // to fast return, use results.some instead of results.every
            const resultsHasKey = results.some(result => result.key === key);
            return !resultsHasKey
        })
        this.cache = new Map(filtered);
    },
    clear : () => {
        this.cache = new Map();
        this.cacheCount = 0;
        return true;
    }
}

 process.on('message', ({requestId, request}) => {
    const {cmd, payload={}} = request;
    const {pattern, results, key, monitorStatus} = payload;
    let result;
    switch(cmd){
        case 'get' :
            result = cache.lookup(pattern);
            break;
        case 'put' :
            result = cache.update(pattern, results);
            break;
        case 'delete' :
            result = cache.delete(pattern, results);
            break;
        case 'deleteByKey' :
            result = cache.deleteByKey(key);
            break;
        case 'clear' :
            result = cache.clear();
            break;
        case 'setMonitorValue' :
            Object.keys(monitorStatus).forEach(key => {
                this[key] = monitorStatus[key];
            })
            break;
        case 'requestMonitor' :
            const {pid, cacheCount, cacheHit} = this;
            result = {
                pid,
                cacheCount,
                cacheHit,
                mem: getMemInfo()
            }
            break;
    }
    process.send({
        responseId : requestId,
        success: true,
        result
    })
})

// initialize cache
cache.init();