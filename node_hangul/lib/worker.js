const hangul = require('hangul-js');
const fs = require('fs');

const songArray = [];
const errored = [];

const getJAMO = (hangulStr) => {
    return hangul.disassemble(hangulStr).join('');	
}

const createSongObj = (data) => {
    try {
        const {wordSep, line} = data;
        const wordArray = line.split(wordSep);
        if(wordArray.length !== 2){
            errored.push(wordArray);
            return {artistName:'', songName:''};
        }
        const artistName = wordArray[0].trim().replace(/^"/gi, '').replace(/"$/gi, '');
        const songName = wordArray[1].trim().replace(/^"/gi, '').replace(/"$/gi, '');
        return {
            artistName,
            songName
        } 
    } catch (err) {
        console.error(err);
        process.exit();
    }
}

const msgHandlers = {
    'index' : (messageKey, data) => {
        try {
            const songObject = createSongObj(data);
            songObject.jamoArtist = getJAMO(songObject.artistName);
            songObject.jamoSong = getJAMO(songObject.songName);
            songArray.push(songObject);
            process.send({
                type: 'reply-index',
                clientId: process.pid,
                messageKey, 
                success: true, 

            });
            if(songArray.length % 10000 === 0){
                console.log(`pid[${process.pid}] processed[${songArray.length}]`);
                //console.log(process.pid, errored.length)
            }

        } catch (err) {
            console.error(err);
            process.exit();
        }
    },
    'search' : (messageKey, data) => {
        const {pattern, jamo} = data;
        // 1. 한글비교 (한글 like 검색)
        const matchedArtistArray = songArray.filter(song => song.artistName.includes(pattern)); 	
        const matchedSongArray = songArray.filter(song => song.songName.includes(pattern)); 	
        // 2. 자모분리비교 ()
        const matchedArtistArrayJAMO = songArray.filter(song => song.jamoArtist.startsWith(jamo)); 	
        const matchedSongArrayJAMO = songArray.filter(song => song.jamoSong.startsWith(jamo)); 	

        const result = Object.assign({}, matchedArtistArray, matchedSongArray, matchedArtistArrayJAMO, matchedSongArrayJAMO);
        process.send({
            type: 'reply-search',
            clientId: process.pid,
            messageKey,
            success:true,
            result,
        })
    }
}

let totalMessage = 0;

// 
process.on('message', (message) => {
    try {
        totalMessage ++;
        const {type, messageKey, data} = message;
        msgHandlers[type](messageKey, data);
    } catch (err) {
        console.error(err);
        process.exit();
    }
})


// main

// notify worker process started to master server
process.send({
    type: 'notify-start',
    clientId: process.pid,
})

process.on('uncaughtException', (err, origin) => {
    fs.writeSync(
      process.stderr.fd,
      `Caught exception: ${err}\n` +
      `Exception origin: ${origin}`
    );
});
  