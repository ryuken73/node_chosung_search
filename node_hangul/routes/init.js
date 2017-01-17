var express = require('express');
var router = express.Router();
var _ = require('lodash');
var cnvrtJAMO = require('../util/extractJAMO');
var extractCHO = require('../util/extractCHO');
var fs = require('fs');
var path = require('path');
var Q = require('q');

router.get('/JAMO', function(req, res, next) {
	
	global.usermapWithJAMO = [];
	global.usermapWithJAMOCHO = [];
	
	var opts = {
			wordSep  : ' ',
			lineSep  : '\n',
			encoding : 'utf-8',
			fname    : path.join(process.cwd(), '/input/justice.txt')
	}
	
    getData(opts)
	.then(function(result){
		global.logger.trace(result);
		var processed = 0;
		_.forEach(result,function(person){
			var jamo = cnvrtJAMO(person.USER_NM);
			var cho = extractCHO(person.USER_NM);
			
			person.USER_NM_JAMO = jamo;
			global.usermapWithJAMO.push(person);
			person.USER_CHO = cho;
			global.usermapWithJAMOCHO.push(person);
			processed ++;
			if(processed === result.length){

				res.send({result:'success'});
			}
		});
	})
	.then(null,function(err){
		next(err);
	});		 
});
 
function getData(options){
	
	var def = Q.defer()
	var result = [];
	
	fs.readFile(options.fname, options.encoding, function(err,data){
		if(err){
			global.logger.error(err);
		}else {
			//global.logger.trace(data);
			var result = _.split(data, options.wordSep).map(function(word){
				return {'USER_NM': _.trim(word), 'CO_NM':word.length, 'DEPT_NM':encodeURIComponent(word)};
			});
			def.resolve(_.sortBy(result, function(user){
									return user.USER_NM;
							}) 
			);
		}
	})
	
	return def.promise;
	
}

module.exports = router;
