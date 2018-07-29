var express = require('express');
var router = express.Router();
var extractJAMO = require('../util/extractJAMO');
var extractCHO = require('../util/extractCHO');
var _ = require('lodash');
var Hangul = require('hangul-js');

/* GET home page. */

router.get('/searchJAMOCHO/:pattern', function(req, res, next) {
	
	global.logger.trace('%s',req.params.pattern);
	var pattern = req.params.pattern
	var jamo = extractJAMO(req.params.pattern);
	var cho = extractCHO(req.params.pattern);
	global.logger.trace('%s',jamo);

	var userObj = _.filter(global.wordsWithJAMOCHO, function(obj){
		return obj.word.includes(req.params.pattern); 
	});
	
	var userObjJAMO = _.filter(global.wordsWithJAMOCHO, function(obj){
		return obj.jamo.startsWith(jamo) ;
	});
	
	var processed = 0;
	var userObjCHO = [];

	for ( var i = 0 ; i < pattern.length ; i++ ) {
			if(Hangul.isHangul(pattern[i])){
				global.logger.trace('이건 초성검색이 아닙니다');
				break;
			}else{
				processed ++;
			}			
			
			if(processed === pattern.length){
				userObjCHO = _.filter(global.wordsWithJAMOCHO, function(obj){
					var chosung = obj.cho ;
					if(chosung)	{
						return obj.cho.startsWith(cho) ;
					}else{
						return false;
					}
				});
			}
	}	
	
	global.logger.trace('userObjCHO:%j',userObjCHO);
	
	_.assign(userObj, userObjJAMO);
	_.assign(userObj, userObjCHO);
	
	res.send(userObj);
	
}); 

module.exports = router;
