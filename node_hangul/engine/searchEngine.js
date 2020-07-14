const getMemInfo = require('../lib/getMemInfo');
const orderSong = require('../lib/orderSong');
const song = require('../lib/songClass');  
const {createPattern} = require('../lib/patternClass');

const searchFromLocal = (songArray, keywordExprCanBeNospacing) => {
    return songArray.filter(song => {
        return song.match(keywordExprCanBeNospacing)
    })
}

const filterStatusIsY = songObject => {
    return true;
    // return songObject.status === 'Y';
}

const padZero = num => {
	if(num < 10){
		return `0${num}`;
	}
	return num.toString();
};

const getDayString = date => {
    const year = date.getFullYear();
	const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    const minute = padZero(date.getMinutes());
	const second = padZero(date.getSeconds());
	return year+month+day+minute+second;
}

const filterOpenTimeIsLessThanNow = songObject => {
    return true
    // return songObject.open_dt < getDayString(new Date());
    // return songObject.open_dt < '20200608000000'
}

const worker = {
    init : () => {
        this.pid = process.pid;
        this.songArray = [];
        this.searchCount = 0;
        return this;
    },
    index : (pattern) => {
        try {
            const songObject = song.create(pattern);
            this.songArray.push(songObject);
            return true;
        } catch (err) {
            console.error(err);
            process.exit();
        }
    },
    search : (data) => {
        this.searchCount += 1;
        // default max result 100,000,000 
        const {pattern, limit=100000000} = data;
        const inPattern = createPattern(pattern);
        const exprString = inPattern.getRegExpString(spacing=false);
        const searchResults = searchFromLocal(this.songArray, exprString)
                              .filter(filterStatusIsY)
                              .filter(filterOpenTimeIsLessThanNow);
        const {orderDefault} = orderSong;
        const orderedResults = orderDefault(searchResults, inPattern.pattern);     
        limit && orderedResults.splice(limit);
        const result = orderedResults.map(songObj => {
            const {artistName, songName} = songObj;
            return {artistName, songName}
        })            
        this.searchCount -= 1;
        return result;
    },
    searchByKey : (key) => {
        const searchResults = [...this.songArray].filter(songObject => songObject.key === key);
        // console.log(`result of searchByKey : [${key}]`, resultByKey);
        const result = searchResults.map(songObj => {
            const {artistName, songName} = songObj;
            return {artistName, songName}
        })
        return result
    },
    deleteByKey : (key) => {
        const filtered = [...this.songArray].filter(songObject => {
            // to fast return, use results.some instead of results.every
            return songObject.key !== key;            
        })
        this.songArray = filtered;
        return true;
    },
    clear : () => {
        this.songArray = [];
        this.searchCount = 0;
        return true;
    }
}

process.on('message', ({requestId, request}) => {
    // const {cmd, data, pattern, results=[]} = request;
    const {cmd, payload={}} = request;
    const {data, key, monitorStatus} = payload;
    let result;
    let success;
    switch(cmd){
        case 'clear' :
            result = worker.clear();
            success = result;
            break;
        case 'index' :
            result = worker.index(data);
            success = result;
            break;
        case 'search' :
            result = worker.search(data);
            success = true;
            break;
        case 'searchByKey' :
            result = worker.searchByKey(key);
            success = true;
            break;
        case 'deleteByKey' :   
            result = worker.deleteByKey(key);
            success = true;
            break;
        case 'setMonitorValue' :
            Object.keys(monitorStatus).forEach(key => {
                this[key] = monitorStatus[key];
            })
            success = true;
            break;
        case 'requestMonitor' :
            const {pid, songArray, searchCount} = this;
            result = {
                pid,
                words: songArray.length,
                searching: searchCount,
                mem: getMemInfo()
            }
            success = true;
            break;
    }
    // console.log(`cache work done: ${process.pid}: cmd = ${cmd}`);
    process.send({
        responseId : requestId,
        success,
        result
    })
})

// initialize cache
worker.init();