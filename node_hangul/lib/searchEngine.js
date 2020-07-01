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
            // console.log(escapeMetaCharacters.join(spcaceExpr))
            return new RegExp(escapeMetaCharacters.join(spcaceExpr));
        }
        return null;
    } catch (err) {
        return null;
    }
}

const threeWordsSearch = (songArray, keywordExprCanBeNospacing) => {
    return songArray.filter(song => {
        return song.jamoCombinedName.toUpperCase().search(keywordExprCanBeNospacing) != -1
    })
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
        const keywordExprCanBeNospacing = mkRegExpr(upperCased, spacing=false);
        const searchResults = threeWordsSearch(this.songArray, keywordExprCanBeNospacing);
        const orderedResults = searchResults
                               .sort(orderSong.orderyByKey(pattern)) 
                               .sort(orderSong.artistNameIncludesFirst(pattern))
                               .sort(orderSong.artistNameStartsFirst(pattern)) 
      
        limit && orderedResults.splice(limit);
        const result = orderedResults.map(songObj => {
            const {artistName, songName} = songObj;
            return {artistName, songName}
        })            
        this.searchCount -= 1;
        return result;
    },
    clear : () => {
        this.songArray = [];
        this.searchCount = 0;
        return true;
    }
}

process.on('message', ({requestId, request}) => {
    const {cmd, data, pattern, results=[]} = request;
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