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
        // const artistName = wordArray[0].trim().replace(/^"/gi, '').replace(/"$/gi, '');
        // const songName = wordArray[1].trim().replace(/^"/gi, '').replace(/"$/gi, '');
        const artistName = wordArray[0].replace(/\s+/g, " ").trim().replace(/^"/gi, '').replace(/"$/gi, '').replace(/\s+$/gi, '');
        const songName = wordArray[1].replace(/\s+/g, " ").trim().replace(/^"/gi, '').replace(/"$/gi, '').replace(/\s+$/gi, '');;
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
    'index' : (subType = null, messageKey, data) => {
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
    'search' : (subType, messageKey, data) => {
        // default max result 100,000,000 
        const {pattern, patternJAMO, limit=100000000} = data;
        const upperCased = patternJAMO.toUpperCase();
        const artists = upperCased.split(' ');
        const regPattern = `/${artists.join('.+')}/`;
        let result;
        switch(subType.key){
            case 'artistNsong' :
                result = songArray.filter(song => {
                    const [artistName, songName] = patternJAMO.split(' ');
                    const upperCasedArtist = artistName && artistName.toUpperCase();
                    const upperCasedSong = songName && songName.toUpperCase();
                    return song.jamoArtist.toUpperCase().includes(upperCasedArtist) && song.jamoSong.toUpperCase().includes(upperCasedSong);
                })
                break;
            case 'songNartist' :
                result = songArray.filter(song => {
                    const [songName, artistName] = patternJAMO.split(' ')
                    const upperCasedArtist = artistName && artistName.toUpperCase();
                    const upperCasedSong = songName && songName.toUpperCase();
                    return song.jamoArtist.toUpperCase().includes(upperCasedArtist) && song.jamoSong.toUpperCase().includes(upperCasedSong);
                })
                break;
            case 'artist' :
                // result = songArray.filter(song => song.artistName.includes(pattern));
                result = songArray.filter(song => song.jamoArtist.toUpperCase().startsWith(upperCased));
                break;
            case 'artistJAMO' :
                result = songArray.filter(song => song.jamoArtist.toUpperCase().includes(upperCased));
                // result = songArray.filter(song => {
                //     return song.jamoArtist.toUpperCase().search(regPattern) !== -1;
                // });
                break;
            case 'song' :
                result = songArray.filter(song => song.jamoSong.toUpperCase().startsWith(upperCased))
                // result = songArray.filter(song => song.songName.includes(pattern));
                break;
            case 'songJAMO' :
                result = songArray.filter(song => song.jamoSong.toUpperCase().includes(upperCased))
                break;

        }
        
        // // 1. 한글비교 (한글 like 검색)
        // const matchedArtistArray = songArray.filter(song => song.artistName.includes(pattern))
        // const matchedSongArray = songArray.filter(song => song.songName.includes(pattern))
        // // 2. 자모분리비교 ()
        // const matchedArtistArrayJAMO = songArray.filter(song => song.jamoArtist.startsWith(jamo))
        // const matchedSongArrayJAMO = songArray.filter(song => song.jamoSong.startsWith(jamo))

        // // to order data, make results as array of array
        // const result = [
        //     [...matchedArtistArray],
        //     [...matchedArtistArrayJAMO],
        //     [...matchedSongArray],
        //     [...matchedSongArrayJAMO]
        // ]

        limit && result.splice(limit);
        result.map(obj => obj.weight = subType.weight)

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

let totalMessage = 0;

// 
process.on('message', (message) => {
    try {
        totalMessage ++;
        const {type, subType, messageKey, data} = message;
        msgHandlers[type](subType, messageKey, data);
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
  