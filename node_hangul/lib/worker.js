const hangul = require('hangul-js');
const fs = require('fs');
const getMemInfo = require('./getMemInfo');
const orderSong = require('./orderSong');
const song = require('./songClass');

let songArray = [];
let searchCount = 0;

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

const msgHandlers = {
    'clear' : (subType = null, messageKey, data = null) => {
        songArray = [];
        process.send({ 
            type: 'reply-clear',
            clientId: process.pid,
            messageKey, 
            success: true, 
            result:[]
        })
    },
    'index' : (subType = null, messageKey, data) => {
        try {
            const songObject = song.create(data);
            songArray.push(songObject);
            process.send({
                type: 'reply-index',
                clientId: process.pid,
                messageKey, 
                result: 'success', 
            });
        } catch (err) {
            console.error(err);
            process.exit();
        }
    },
    'search' : (subType = null, messageKey, data) => {
        searchCount += 1;
        // default max result 100,000,000 
        const {pattern, patternJAMO, limit=100000000} = data;
        const upperCased = patternJAMO.toUpperCase().trimEnd();
        const keywordExprCanBeNospacing = mkRegExpr(upperCased, spacing=false);
        const searchResults = threeWordsSearch(songArray, keywordExprCanBeNospacing);
        const orderedResults = searchResults
                               .sort(orderSong.orderyByKey(pattern)) 
                               .sort(orderSong.artistNameIncludesFirst(pattern))
                               .sort(orderSong.artistNameStartsFirst(pattern)) 
      
        limit && orderedResults.splice(limit);
        const result = orderedResults.map(songObj => {
            const {artistName, songName} = songObj;
            return {artistName, songName}
        })            
        searchCount -= 1;
        process.send({
            type: 'reply-search',
            clientId: process.pid,
            messageKey,
            success:true,
            result,
        })
    }
}

function threeWordsSearch(songArray, keywordExprCanBeNospacing){
    return songArray.filter(song => {
        return song.jamoCombinedName.toUpperCase().search(keywordExprCanBeNospacing) != -1
    })
}


let totalMessage = 0;

// 
process.on('message', message => {
    try {
        totalMessage ++;
        const {type, subType, messageKey, data} = message;
        msgHandlers[type] && msgHandlers[type](subType, messageKey, data);
    } catch (err) {
        console.error(err);
        process.exit();
    }
})

process.on('message', message => {
    if(message === 'requestMonitor'){
        process.send({
            type: 'reply-monitor',
            monitor: {
                mem: getMemInfo(),
                words: songArray.length,
                searching: searchCount
            },
            result:[]
        })
    }
})


// main 

// notify worker process started to master server

process.send({
    type: 'notify-start',
    clientId: process.pid,
    subType: 'start-worker-process',
    messageKey: process.argv[2],
    result: process.pid
})

process.on('uncaughtException', (err, origin) => {
    fs.writeSync(
      process.stderr.fd,
      `Caught exception: ${err}\n` +
      `Exception origin: ${origin}`
    );
});
  