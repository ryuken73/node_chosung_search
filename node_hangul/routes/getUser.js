var express = require('express');
var router = express.Router();
var ibmdb = require('../database/ibmdb');
var extractJAMO = require('../util/extractJAMO');
var extractCHO = require('../util/extractCHO');
var _ = require('lodash');
var Hangul = require('hangul-js');

/* GET home page. */
router.get('/:username', function(req, res, next) {
	
	global.logger.trace(extractJAMO(req.params.username));

	global.logger.trace('%s', req.params.username);
	var userObj = _.filter(global.usermap, {USER_NM:req.params.username});	
	res.send(userObj); 
});


router.get('/search/:pattern', function(req, res, next) {
	
	global.logger.trace('%s',req.params.pattern);
	var userObj = _.filter(global.usermap, function(obj){
		return obj.USER_NM.includes(req.params.pattern); 
	});
	res.send(userObj);
	
});

router.get('/searchJAMO/:pattern', function(req, res, next) {
	
	global.logger.trace('%s',req.params.pattern);
	var jamo = extractJAMO(req.params.pattern);
	global.logger.trace('%s',jamo);

	var userObj = _.filter(global.usermapWithJAMO, function(obj){
		return obj.USER_NM.includes(req.params.pattern); 
	});
	
	var userObjJAMO = _.filter(global.usermapWithJAMO, function(obj){
		return obj.USER_NM_JAMO.startsWith(jamo) ;
	});
	
	_.assign(userObj, userObjJAMO);
	
	res.send(userObj);
	
});

router.get('/searchJAMOCHO/:pattern', function(req, res, next) {
	
	global.logger.trace('%s',req.params.pattern);
	var pattern = req.params.pattern
	var jamo = extractJAMO(req.params.pattern);
	var cho = extractCHO(req.params.pattern);
	global.logger.trace('%s',jamo);

	var userObj = _.filter(global.usermapWithJAMOCHO, function(obj){
		return obj.USER_NM.includes(req.params.pattern); 
	});
	
	var userObjJAMO = _.filter(global.usermapWithJAMOCHO, function(obj){
		return obj.USER_NM_JAMO.startsWith(jamo) ;
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
				userObjCHO = _.filter(global.usermapWithJAMOCHO, function(obj){
					return obj.USER_CHO.startsWith(cho) ;
				});
			}
	}	
	
	global.logger.trace('userObjCHO:%j',userObjCHO);
	
	_.assign(userObj, userObjJAMO);
	_.assign(userObj, userObjCHO);
	
	res.send(userObj);
	
}); 

module.exports = router;
