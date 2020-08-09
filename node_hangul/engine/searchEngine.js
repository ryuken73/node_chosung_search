const path = require('path');
const getMemInfo = require('../lib/getMemInfo');
const orderSong = require('../lib/orderSong');
const song = require('../lib/songClass');  
const juso = require('../lib/jusoClass');
const {createPattern} = require('../lib/patternClass');
const {Readable} = require('stream');
const fs = require('fs');

const searchFromLocal = (jusoArray, keywordExprCanBeNospacing) => {
    return jusoArray.filter(juso => {
        return juso.match(keywordExprCanBeNospacing)
    })
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

const arrayToStream = (array, fields) => {
    return new Readable({
        objectMode: true,
        highWaterMark: 1024,
        read(size){
            const songObj = array.shift();
            const mappingFields = fields.map(field => songObj[field]);
            this.push(JSON.stringify(mappingFields));
            if(array.length === 0) this.push(null);
        }
    })
}

const worker = {
    init : () => {
        const [nodeBinary, moduleFile, ApplyStatusFilter, ApplyOpenTimeFilter] = process.argv;
        this.pid = process.pid;
        this.jusoArray = [];
        this.searchCount = 0;
        this.ApplyStatusFilter = ApplyStatusFilter;
        this.ApplyOpenTimeFilter = ApplyOpenTimeFilter;
        return this;
    },
    index : dataArray => {
        try {
            const jusoObject = juso.create(dataArray);
            this.jusoArray.push(jusoObject);
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
        const searchResults = searchFromLocal(this.jusoArray, exprString)
        // const {orderDefault} = orderSong;
        // const orderedResults = orderDefault(searchResults, inPattern.pattern);     
        // limit && orderedResults.splice(limit);
        limit && searchResults.splice(limit);
        // const result = orderedResults.map(songObj => {
        //     const {artistName, songName} = songObj;
        //     return {artistName, songName}
        // })        
        const result = searchResults.map(jusoObj => {
            const {juso} = jusoObj;
            return juso;
        })    
        this.searchCount -= 1;
        return result;
    },
    searchByKey : (key) => {
        const searchResults = [...this.jusoArray].filter(songObject => songObject.key === key);
        // console.log(`result of searchByKey : [${key}]`, resultByKey);
        const result = searchResults.map(songObj => {
            const {artistName, songName} = songObj;
            return {artistName, songName}
        })
        return result
    },
    deleteByKey : (key) => {
        const filtered = [...this.jusoArray].filter(songObject => {
            // to fast return, use results.some instead of results.every
            return songObject.key !== key;            
        })
        this.jusoArray = filtered;
        return true;
    },
    clear : () => {
        this.jusoArray = [];
        this.searchCount = 0;
        return true;
    },
    filterStatusIsY : songObject => {
        if(this.ApplyStatusFilter === 'true'){
            return songObject.status === 'Y';
        }
        console.log(this.ApplyStatusFilter)
        return true;
    },
    filterOpenTimeIsLessThanNow : songObject => {
        if(this.ApplyOpenTimeFilter === 'true'){
            return songObject.open_dt < getDayString(new Date());
        }
        return true;
    },
    saveToFile : async (outFile) => {
        return new Promise((resolve, reject) => {
            const fields = ['_artistName','_songName','_key','_open_dt','_status'];
            const rStream = arrayToStream(this.jusoArray, fields);       
            const wStream = fs.createWriteStream(outFile, {highWaterMark: 64*1024});        
            // below code takes 66 seconds, but keeping process responseive (but slow. hold add feature!)
            rStream
            .pipe(wStream)        
            wStream.on('finish', () => {
                // it takes 64 seconds
                resolve(true);
            })
        })
    }
}

process.on('message', async ({requestId, request}) => {
    // const {cmd, data, pattern, results=[]} = request;
    const {cmd, payload={}} = request;
    const {data, key, monitorStatus, outDir, filePrefix} = payload;
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
        case 'saveToFile' :   
            const outFname = `${filePrefix}_${process.pid}_${Date.now()}.json`;
            const outFile = path.join(outDir, outFname);
            result = await worker.saveToFile(outFile);
            success = result;
            break;            
        case 'setMonitorValue' :
            Object.keys(monitorStatus).forEach(key => {
                this[key] = monitorStatus[key];
            })
            success = true;
            break;
        case 'requestMonitor' :
            const {pid, jusoArray, searchCount} = this;
            result = {
                pid,
                words: jusoArray.length,
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