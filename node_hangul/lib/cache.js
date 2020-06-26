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
        // console.log(`set cache[${pattern}]:`, results)
        this.cache.set(pattern, results);
        this.cacheCount++;
        // console.log([...this.cache])
        return true;
    },
    delete : (pattern) => {
        this.cache.delete(pattern);
        return true;
    },
    clear : () => {
        this.cache = new Map();
        this.cacheCount = 0;
        return true;
    }
}

 process.on('message', ({requestId, request}) => {
    const {cmd, pattern, results=[]} = request;
    let result;
    switch(cmd){
        // case 'init' :
        //     result = cache.create();
        //     break;
        case 'get' :
            result = cache.lookup(pattern);
            break;
        case 'put' :
            result = cache.update(pattern, results);
            break;
        case 'delete' :
            result = cache.delete(pattern, results);
            break;
        case 'clear' :
            result = cache.clear();
            break;
        case 'requestMonitor' :
            const {pid, cacheCount, cacheHit} = this;
            result = {
                pid,
                cacheCount,
                cacheHit,
                mem: getMemInfo()
            }
            // console.log(result)
            break;
    }
    // console.log(`cache work done: ${process.pid}: cmd = ${cmd}`);
    process.send({
        responseId : requestId,
        success: true,
        result
    })
})

// initialize cache
cache.init();