const getMemInfo = require('../lib/getMemInfo');
const {mkRegExpr} = require('../lib/patternClass');
const song = require('../lib/songClass');  


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
        return true;
    },
    deleteByValue : (artistName, songName) => {
        const filtered = [...this.cache].filter(([pattern, results]) => {
            const resultsHasValue = results.some(result => {
                return result.artistName === artistName && result.songName === songName;
            })
            return !resultsHasValue
        })
        this.cache = new Map(filtered);
        return true;
    },
    deleteSearchable : (SongRecord) => {
        const songObj = song.create(SongRecord);
        const patternJAMOs = [...this.cache.keys()];
        const patternsToDelete = patternJAMOs.filter(patternJAMO => {
            const exprString = mkRegExpr(patternJAMO)(spacing = false);
            return songObj.match(exprString)
        })
        // console.log(`cache patterns to delete : `, patternsToDelete);
        patternsToDelete.forEach(patternJAMO => this.cache.delete(patternJAMO));
        return true;
    },
    clear : () => {
        this.cache = new Map();
        this.cacheCount = 0;
        return true;
    }
}

 process.on('message', ({requestId, request}) => {
    const {cmd, payload={}} = request;
    const {pattern, results, key, monitorStatus, artistName, songName, singleSongRecord} = payload;
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
        case 'deleteByValue' :
            result = cache.deleteByValue(artistName, songName);
            break;
        case 'deleteSearchable' :
            result = cache.deleteSearchable(singleSongRecord);
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
            const {pid, cacheHit} = this;
            const cacheCount = this.cache.size;
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