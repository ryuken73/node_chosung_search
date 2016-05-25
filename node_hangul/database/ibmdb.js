/**
 * New node file
 */

var Q = require('q');

exports.attachConnObj = function(req){

	var connectionString = '';
	for ( var key in require('../config.json').DBConnectionObj.COMMDEV ){
		connectionString = connectionString + key + '=' + require('../config.json').DBConnectionObj.COMMDEV[key] + ';' ;
	} 
	
	var def = Q.defer();

	global.pool.open(connectionString, function(err,conn){
		if(err){ 
			global.logger.error('pool.getConnection error');
			def.reject(err); 		
			return false;
		}
		global.logger.info('get db connection success');
		req.conn = conn;
		def.resolve(conn);
	}); 
	
	req.getConnection = def.promise; 
	
	def.promise
	.then(null, global.logger.error)
	.fin(function(){
		req.conn.close(function(err){
			global.logger.info('release connection');
		});
	});

}; 

exports.executeSQL = function(req, sql, params){
	
	return function(conn){
	

		global.logger.debug('[%s][%s] db query start : %s, parameters : %j', req.ip, req.originalUrl, sql, params);

		var def = Q.defer();	
 
		req.conn.query(sql, params, function(err,results){	
			if(err){
				global.logger.error('[%s][%s] db execution Error : %s , paramters : %j', req.ip, req.originalUrl, sql, params);
				def.reject(err);
				return false;
			}		
			global.logger.debug('[%s][%s] db execution OK : %s, parameters : %j', req.ip, req.originalUrl, sql, params);
			def.resolve(results);
		});
	

		// sql query 끝날때 마다 trace로 DB execution result를 logging
		def.promise
		.then(function(result){
			//global.logger.debug('[%s][%s] db execution Result : %j', req.ip, req.originalUrl, result);
		})
		.then(null,function(err){
			global.logger.error(err);
		});
		
		return def.promise;
	};
};