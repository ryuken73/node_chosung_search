const getMemInfo = require('./getMemInfo');
const orderSong = require('./orderSong');
const song = require('./songClass');    

const replaceRegMetaCharacter = (word, replacer) => {
    const re = /([?\\\*\+\.\{\}\[\]\(\)])/g
    return word.replace(re, replacer + '\$1');
}

const mkRegExpr = (str, spacing) => {
    try {
        if(typeof(str) === 'string') {
            const wordsSplited = str.trimStart().trimEnd().split(' ');
            const whitespaceRemoved = wordsSplited.filter(word => word !== '');
            const escapeMetaCharacters = whitespaceRemoved.map(word => replaceRegMetaCharacter(word, '\\'));
            const spcaceExpr = spacing ? '.+' : '.*?';
            return new RegExp(escapeMetaCharacters.join(spcaceExpr));
        }
        return null;
    } catch (err) {
        return null;
    }
}

const searchFromLocal = (songArray, keywordExprCanBeNospacing) => {
    return songArray.filter(song => {
        return song.jamoCombinedName.toUpperCase().search(keywordExprCanBeNospacing) != -1
    })
}

const filterStatusIsY = songObject => {
    return songObject.status === 'Y';
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
    return songObject.open_dt < getDayString(new Date());
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
        const {pattern, patternJAMO, limit=100000000} = data;
        const upperCased = patternJAMO.toUpperCase().trimEnd();
        const exprString = mkRegExpr(upperCased, spacing=false);
        const searchResults = searchFromLocal(this.songArray, exprString)
                              .filter(filterStatusIsY)
                              .filter(filterOpenTimeIsLessThanNow);
        const {orderDefault} = orderSong;
        const orderedResults = orderDefault(searchResults, pattern);     
        limit && orderedResults.splice(limit);
        const result = orderedResults.map(songObj => {
            const {artistName, songName} = songObj;
            return {artistName, songName}
        })            
        this.searchCount -= 1;
        return result;
    },
    deleteByKey : (key) => {
        const filtered = [...this.songArray].filter( songObject => {
            // to fast return, use results.some instead of results.every
            return songObject.key !== key;            
        })
        this.songArray = filtered;
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
        case 'deleteByKey' :
            result = worker.deleteByKey(key);
            break;
        case 'setMonitorValue' :
            Object.keys(monitorStatus).forEach(key => {
                this[key] = monitorStatus[key];
            })
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