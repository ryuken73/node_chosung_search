var express = require('express');
var router = express.Router();
var extractJAMO = require('../util/extractJAMO');
var extractCHO = require('../util/extractCHO');
var Hangul = require('hangul-js');

/* GET home page. */

router.get('/:pattern', function(req, res, next) {

	global.logger.trace('%s',req.params.pattern);
	const {pattern} = req.params;
	const jamo = extractJAMO(pattern);
	const cho = extractCHO(pattern);
	global.logger.trace('%s',jamo);
	global.logger.trace(global.wordsWithJAMOCHO)
    // 1. 한글비교 (한글 like 검색)
	const artistObjs = global.wordsWithJAMOCHO.filter(song => song.artistName.includes(pattern)); 	
	const songObj = global.wordsWithJAMOCHO.filter(song => song.songName.includes(pattern)); 	
	// 2. 자모분리비교 ()
	const artistJAMO = global.wordsWithJAMOCHO.filter(song => song.jamoArtist.startsWith(jamo)); 	
	const songJAMO = global.wordsWithJAMOCHO.filter(song => song.jamoSong.startsWith(jamo)); 	
	
	let wordObjCHO = [];

	// 3. 초성비교
	// const arrayFromPattern = Array.from(pattern);
	// const checkHangul = arrayFromPattern.map(element => Hangul.isHangul(element));

	// if(checkHangul.some(element => element)){
	// 	global.logger.trace('이건 초성검색이 아닙니다');
	// 	wordObjCHO = [] 
	// } else {
	// 	console.log(global.wordsWithJAMOCHO)
	// 	wordObjCHO = global.wordsWithJAMOCHO.filter(wordWithJAMOCHO => {
	// 		if(wordWithJAMOCHO.cho){
	// 			return wordWithJAMOCHO.cho.startsWith(cho);
	// 		} else {
	// 			false;
	// 		}
	// 	})
	// } 
	
	global.logger.trace('wordObjCHO:%j',wordObjCHO);
	
	Object.assign(artistObjs, artistJAMO);
	Object.assign(artistObjs, songJAMO);
	Object.assign(artistObjs, songObj);
	
	// Object.assign(wordObj, artistJAMO);
	
	res.send({result:artistObjs, count:artistObjs.length});
	
}); 

module.exports = router;
