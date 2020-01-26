const express = require('express');
const router = express.Router();
const cnvrtJAMO = require('../util/extractJAMO');
const extractCHO = require('../util/extractCHO');
const fs = require('fs');
const path = require('path');
const master = require('../lib/master');

router.get('/useWorkers', async (req, res, next) => {
	const totalLoaded = await master.load();
	res.send({result:'success', count:totalLoaded});
})

router.get('/', async function(req, res, next) {
	
	//global.wordsWithJAMO = [];
	global.wordsWithJAMOCHO = [];
	global.errored = [];

	const opts = {
			wordSep  : '^',
			lineSep  : '"\r\n',
			encoding : 'utf8',
			fname    : 'c:/temp/song_mst.txt',
			highWaterMark : 64 * 1024 * 10
	}
	
	try {
		const result = await getDataStream(opts);
		// global.logger.trace(result);
		global.wordsWithJAMOCHO = result;
		const processed = 0;
		result.map(song => {
			const jamoArtist = cnvrtJAMO(song.artistName);
			const jamoSong = cnvrtJAMO(song.songName);
			// const choArtist = extractCHO(song.artistName);
			// const choSong = extractCHO(song.songName);
			song.jamoArtist = jamoArtist;
			song.jamoSong = jamoSong;
			// song.choArtist = choArtist;
			// song.choSong = choSong;

			//global.wordsWithJAMO.push(wordObj);
			//global.wordsWithJAMOCHO.push(song);
		})
		res.send({result:'success', count:global.wordsWithJAMOCHO.length});
	} catch (err) {
		next(err);
	}

});

function getDataStream(options){
	const {fname, encoding, lineSep, wordSep} = options;
	const rStream = fs.createReadStream(fname, {encoding});
	let remainString = '';
	let dataEmitCount = 0;
	let result = [];
	return new Promise((resolve, reject) => {
		rStream.on('data', (buff) => {
			dataEmitCount++;
			// console.log(buff.toString());
			const data = remainString + buff.toString();
			const dataArray = data.split(lineSep);
			if(!data.endsWith(lineSep)){
				remainString = dataArray.pop();
			} else {
				remainString = '';
			} 
			const songArray = processData(dataArray, wordSep);	
			//console.log(songArray)
			result = [
				...result,
				...songArray
			]
			if(dataEmitCount % 100 === 0) global.logger.info(`emit : ${dataEmitCount}, processed: ${result.length}`)
			if(result.length > 30000) rStream.destroy();
		})
		rStream.on('end', () => {
			console.log('end');
			resolve(result);
		});
		rStream.on('close', () => {
			console.log('read stream closed!');
			resolve(result);
		})
	})
} 

function processData(dataArray, wordSep) {
		const songArray = dataArray.map(line => {
			const wordArray = line.split(wordSep);
			if(wordArray.length !== 2){
				//console.log(wordArray);
				global.errored.push(wordArray);
				return {artistName:'', songName:''};
			}
			const artistName = wordArray[0].trim().replace(/^"/gi, '').replace(/"$/gi, '');
			const songName = wordArray[1].trim().replace(/^"/gi, '').replace(/"$/gi, '');
			return {
				artistName,
				songName
			}

		})
		return songArray;
} 

module.exports = router;
