const express = require('express');
const router = express.Router();
const cnvrtJAMO = require('../util/extractJAMO');
const extractCHO = require('../util/extractCHO');
const fs = require('fs');
const path = require('path');

router.get('/:bookNum', async function(req, res, next) {
	
	//global.wordsWithJAMO = [];
	global.wordsWithJAMOCHO = [];
	const {bookNum} = req.params
	const books = {
		"1" : "justice.txt",
		"2" : "어린왕자.txt",
		"3" : "카프카_변신.txt"
	}
	
	const opts = {
			columnSep  : ' ',
			lineSep  : '\n',
			encoding : 'utf-8',
			fname    : path.join(process.cwd(), `/input/${books[bookNum]}`)
	}
	
	try {
		const result = await getData(opts);
		global.logger.trace(result);
		const processed = 0;
		result.map(wordObj => {
			const jamo = cnvrtJAMO(wordObj.word);
			const cho = extractCHO(wordObj.word);
			wordObj.jamo = jamo
			wordObj.cho = cho;
			//global.wordsWithJAMO.push(wordObj);
			global.wordsWithJAMOCHO.push(wordObj);
		})
		res.send({result:'success', count:global.wordsWithJAMOCHO.length});
	} catch (err) {
		next(err);
	}

});
 
function getData(options){
	const {fname, encoding, columnSep} = options;
	return new Promise((resolve, reject) => {
		fs.readFile(fname, encoding, (err,data) => {
			if(err){
				global.logger.error(err);
				reject(err);
			} else {
				//global.logger.trace(data);
				const result = data.split(columnSep).map( word => {
					return {'word': word.trim(), 'wordEncoded':encodeURIComponent(word)};
				});
				const orderedResult = result.sort((a, b) => {
					if(a.word > b.word) return 1;
					if(a.word < b.word) return -1;
					return 0;
				})
				resolve(orderedResult)
			}
		})
	})	 
}

module.exports = router;
