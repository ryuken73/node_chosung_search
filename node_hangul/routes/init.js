var express = require('express');
var router = express.Router();
var ibmdb = require('../database/ibmdb');
var _ = require('lodash');
var cnvrtJAMO = require('../util/extractJAMO');
var extractCHO = require('../util/extractCHO');


router.get('/JAMO', function(req, res, next) {
	
	global.usermapWithJAMO = [];
	global.usermapWithJAMOCHO = [];
	
	ibmdb.attachConnObj(req);
	req.getConnection
	.then(ibmdb.executeSQL(req,"select user_nm,dept_nm,co_nm from comm.com_user_tbl where del_flag = 'N' order by 1",[]))
	.then(function(result){
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
 
module.exports = router;
