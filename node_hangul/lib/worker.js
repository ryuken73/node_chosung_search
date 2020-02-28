const hangul = require('hangul-js');
const fs = require('fs');
const getMemInfo = require('./getMemInfo');

let songArray = [];
const errored = [];
const WORDSEPARATOR = '^';
const MIN_KEY_LENGTH = 2;
let searchCount = 0;


const getJAMO = (hangulStr) => {
    return hangul.disassemble(hangulStr).join('');	
}

const clearWord = (word) => {
    return word.replace(/\s+/g, " ").trim().replace(/^"/gi, '').replace(/"$/gi, '').replace(/\s+$/gi, '');
}

const createSongObj = (data) => {
    try {
        const {wordSep, line, supportThreeWords} = data;
        const wordArray = line.split(wordSep);
        if(wordArray.length < MIN_KEY_LENGTH){
            console.error(`wordArray is too short[MIN_KEY_LENGTH = 2] but current Data :`, wordArray);
            errored.push(wordArray);
            return {artistName:'', songName:'',artistNsong, songNartist};
        }

        const [artistName, songName, year, label] = wordArray.map(word => clearWord(word));
        const artistNsongNartist = `${artistName} ${songName} ${artistName}`;
        const artistNsongNartistNoBlank =  `${songName.replace(/\s+/g, '')}${artistName.replace(/\s+/g, '')}${songName.replace(/\s+/g, '')}`;

        return {
            artistName,
            songName,
            // artistNsong : supportThreeWords ? `${artistName} ${songName}` : '',
            // songNartist : supportThreeWords ? `${songName} ${artistName}` : '',
            // artistNsongNoBlank : `${songName.replace(/\s+/g, '')} ${artistName.replace(/\s+/g, '')}`,
            // songNartistNoBlank : `${artistName.replace(/\s+/g, '')} ${songName.replace(/\s+/g, '')}`,
            // artistNsongNartist : supportThreeWords ? `${artistName} ${songName} ${artistName}` : '',
            // artistNsongNartistNoBlank : `${songName.replace(/\s+/g, '')} ${artistName.replace(/\s+/g, '')} ${songName.replace(/\s+/g, '')}`,
            combinedName : `${artistNsongNartist} ${artistNsongNartistNoBlank}`,
            year,
            label
        } 
    } catch (err) {
        console.error(err);
        process.exit();
    }
}

const getSplited = (str, sep) => {
    return str.split(sep).filter(element => element !== "");
}

const getMode = (str, complexSep) => {
    const mode = {};
    mode.complex = getSplited(str, complexSep).length == 2 ? true : false;
    mode.complex = (!str.includes(complexSep) && getSplited(str, ' ').length == 2) ? true : mode.complex;
    return mode;
}

const getKeyword = (searchMode, str, complexSep) => {
    let sep = ' ';
    if(!searchMode.complex) return [];
    if(searchMode.complex && str.includes(WORDSEPARATOR)) sep = complexSep;
    const [first, second] = getSplited(str, sep);
    const firstUpperCased = first && first.toUpperCase().trimStart().trimEnd();
    const secondUpperCased = second && second.toUpperCase().trimStart().trimEnd();    
    return [firstUpperCased, secondUpperCased]
}

const replaceMeta = (word, replacer) => {
    const re = /([?\\\*\+\.\{\}\[\]\(\)])/g
    return word.replace(re, replacer + '\$1');
}

const mkRegExpr = (str, spacing) => {
    try {
        if(typeof(str) === 'string') {
            const wordsSplited = str.trimStart().trimEnd().split(' ');
            const whitespaceRemoved = wordsSplited.filter(word => word !== '');
            const escapeMetaCharacters = whitespaceRemoved.map(word => replaceMeta(word, '\\'));
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
            const songObject = createSongObj(data);
            const lineLength = data.line.length + 2;
            songObject.jamoArtist = getJAMO(songObject.artistName);
            songObject.jamoSong = getJAMO(songObject.songName);
            // songObject.jamoArtistNSong = getJAMO(songObject.artistNsong);
            // songObject.jamoSongNArtist = getJAMO(songObject.songNartist);
            // songObject.jamoArtistNSongNoBlank = getJAMO(songObject.artistNsongNoBlank);
            // songObject.jamoSongNArtistNoBlank = getJAMO(songObject.songNartistNoBlank);
            // songObject.jamoASongA = getJAMO(songObject.artistNsongNartist);
            // songObject.jamoASongANoBlank = getJAMO(songObject.artistNsongNartistNoBlank);
            songObject.jamoCombinedName= getJAMO(songObject.combinedName);

            songArray.push(songObject);
            process.send({
                type: 'reply-index',
                subType: 'not-distributed',
                clientId: process.pid,
                messageKey, 
                result: 'success', 
                lineLength

            });
            if(songArray.length % 100000 === 0){
                //console.log(`pid[${process.pid}] processed[${songArray.length}]`);
                //console.log(process.pid, errored.length)
            }

        } catch (err) {
            console.error(err);
            process.exit();
        }
    },
    'search' : (subType, messageKey, data) => {
        // console.time('start1');
        searchCount += 1;
        // console.log(searchCount);
        // default max result 100,000,000 
        const {pattern, patternJAMO, limit=100000000, supportThreeWords} = data;
        const notSupportThreeWords = !supportThreeWords;
        const upperCased = patternJAMO.toUpperCase().trimEnd();
        const searchMode = getMode(upperCased, WORDSEPARATOR);
        // console.log(searchMode)

        let firstRegExpr,secondRegExpr;

        if(searchMode.complex){
            // const artists = upperCased.split(' ');
            // const regPattern = `/${artists.join('.+')}/`;
            const [firstUpperCased, secondUpperCased] = getKeyword(searchMode, upperCased, WORDSEPARATOR);
            firstRegExpr = mkRegExpr(firstUpperCased, spacing=true);
            secondRegExpr = mkRegExpr(secondUpperCased, spacing=true);     
        }  
        
        const hatRemovedUpperCased = upperCased.endsWith('^') ? upperCased.replace(/\^$/,'') : upperCased;
        const keywordExpr = mkRegExpr(hatRemovedUpperCased, spacing=true);
        const keywordExprCanBeNospacing = mkRegExpr(hatRemovedUpperCased, spacing=false);
        // console.timeEnd('start1');
        // console.time('start2');
        let result;
        switch(subType.key){
            case 'artistNsong' :
                if(!searchMode.complex) {
                    result = [];
                    break;
                }
                result = songArray.filter(song => {
                    if(!secondRegExpr) return false;
                    // return song.jamoArtist.toUpperCase().includes(firstUpperCased) && song.jamoSong.toUpperCase().includes(secondUpperCased);
                    return song.jamoArtist.toUpperCase().search(firstRegExpr) != -1 && song.jamoSong.toUpperCase().search(secondRegExpr) != -1;
                });
                break;
            case 'songNartist' :
                if(!searchMode.complex) {
                    result = [];
                    break;
                }
                result = songArray.filter(song => {
                    if(!secondRegExpr) return false;
                    // return song.jamoArtist.toUpperCase().includes(secondUpperCased) && song.jamoSong.toUpperCase().includes(firstUpperCased);
                    return song.jamoArtist.toUpperCase().search(secondRegExpr) != -1 && song.jamoSong.toUpperCase().search(firstRegExpr) != -1;
                })
                break;
            case 'artist' :
                // result = songArray.filter(song => song.artistName.includes(pattern));
                result = songArray.filter(song => song.jamoArtist.toUpperCase().startsWith(hatRemovedUpperCased));
                break;
            case 'artistJAMO' :
                // result = songArray.filter(song => song.jamoArtist.toUpperCase().includes(upperCased));
                result = songArray.filter(song => song.jamoArtist.toUpperCase().search(keywordExpr) != -1);
                break;
            case 'song' :
                result = songArray.filter(song => song.jamoSong.toUpperCase().startsWith(hatRemovedUpperCased))
                // result = songArray.filter(song => song.songName.includes(pattern));
                break;
            case 'songJAMO' :
                // result = songArray.filter(song => song.jamoSong.toUpperCase().includes(upperCased))
                result = songArray.filter(song => song.jamoSong.toUpperCase().search(keywordExpr) != -1);
                break;
            case 'artistNsongWithoutHat' :
                // result = notSupportThreeWords ? [] : songArray.filter(song => song.jamoArtistNSong.toUpperCase().search(keywordExpr) != -1);
                result = notSupportThreeWords ? [] : songArray.filter(song => song.jamoArtistNSong.toUpperCase().search(keywordExpr) != -1);
                break;
            case 'songNartistWithoutHat' :
                result = notSupportThreeWords ? [] : songArray.filter(song => song.jamoSongNArtist.toUpperCase().search(keywordExpr) != -1);
                break;
            case 'threeWordsSearch' :
                result = threeWordsSearch(songArray, keywordExpr, keywordExprCanBeNospacing);
                // console.timeEnd('start2');
                break;
            default :
                result = []
                break;

        }

        // console.time('start3')
        limit && result.splice(limit);
        result.map(obj => obj.weight = subType.weight)
        searchCount -= 1;
        // console.log(searchCount);
        // console.timeEnd('start3')
        // console.log(`resultCount = [${result.length}]`)

        process.send({
            type: 'reply-search',
            clientId: process.pid,
            messageKey,
            subType,
            success:true,
            result,
        })
    }
}

function threeWordsSearch(songArray, keywordExpr, keywordExprCanBeNospacing){
    return songArray.filter(song => {
        // return song.jamoArtistNSong.toUpperCase().search(keywordExprCanBeNospacing) != -1 
        //     || song.jamoSongNArtist.toUpperCase().search(keywordExprCanBeNospacing) != -1
        //     || song.jamoArtistNSongNoBlank.toUpperCase().search(keywordExprCanBeNospacing) != -1
        //     || song.jamoSongNArtistNoBlank.toUpperCase().search(keywordExprCanBeNospacing) != -1
        // return song.jamoASongA.toUpperCase().search(keywordExprCanBeNospacing) != -1 ?
            // || song.jamoASongANoBlank.toUpperCase().search(keywordExprCanBeNospacing) != -1?
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
            type: 'responseMonitor',
            monitor : {
                mem: getMemInfo(),
                words: songArray.length,
                searching: searchCount
            }
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
  