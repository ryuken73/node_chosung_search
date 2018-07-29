var express = require('express');
var router = express.Router();
var _ = require('lodash');
var cnvrtJAMO = require('../util/extractJAMO');
var extractCHO = require('../util/extractCHO');
var fs = require('fs');
var path = require('path');
var Q = require('q');

router.get('/', function(req, res, next) {
	
	global.wordsWithJAMO = [];
	global.wordsWithJAMOCHO = [];
	
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
		_.forEach(result, function(wordObj){
			var jamo = cnvrtJAMO(wordObj.word);
			var cho = extractCHO(wordObj.word);
			
			wordObj.jamo = jamo;
			global.wordsWithJAMO.push(wordObj);
			wordObj.cho = cho;
			global.wordsWithJAMOCHO.push(wordObj);
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
				return {'word': _.trim(word), 'wordEncoded':encodeURIComponent(word)};
			});
			def.resolve(_.sortBy(result, function(word){
									return word.word;
							}) 
			); 
		}
	})
	
	return def.promise;
	
}

module.exports = router;
