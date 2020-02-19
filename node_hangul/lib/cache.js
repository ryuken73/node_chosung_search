

const cache = {
    init : () => {
        this.cache = new Map();
        return this;
    },
    lookup : (pattern) => {
        const result = this.cache.get(pattern) || [];
        return result;
    },
    update : (pattern, results) => {
        // console.log(`set cache[${pattern}]:`, results)
        this.cache.set(pattern, results);
        // console.log([...this.cache])
        return true;
    },
    delete : (pattern) => {
        this.cache.delete(pattern);
        return true;
    }
}

 process.on('message', ({reqId, job}) => {
    const {cmd, pattern, results=[]} = job;
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
    }
    console.log(`cache work done: ${process.pid}: ${cmd}`);
    process.send({
        resId : reqId,
        success: true,
        result
    })
})

// initialize cache
cache.init();