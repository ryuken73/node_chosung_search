

const cache = {
    create : () => {
        this.cache = new Map();
        return this;
    },
    lookup : (pattern) => {
        return this.cache.get(pattern);
    },
    update : (pattern, results) => {
        this.cache.set(pattern, results);
    }
}

 process.on('message', ({reqId, job}) => {
    const {cmd, argv={}} = job;
    let result;
    let pattern, results;
    switch(cmd){
        case 'init' :
            result = cache.create();
            break;
        case 'search' :
            pattern = argv.pattern;
            result = cache.lookup(pattern);
            break;
        case 'update' :
            pattern = argv.pattern;
            results = argv.results;
            result = cache.update(pattern, results);
            break;
    }
    console.log(`DONE:${process.pid}:${cmd}`);
    process.send({
        resId : reqId,
        success: true,
        result
    })
})