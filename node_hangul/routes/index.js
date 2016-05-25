var express = require('express');
var router = express.Router();
var ibmdb = require('../database/ibmdb');

/* GET home page. */
router.get('/', function(req, res, next) {
	
	res.render('index', { title: "auto complete" });
});
 
module.exports = router;
