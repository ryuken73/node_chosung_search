/**
 * New node file
 */

var hangul = require('hangul-js');

module.exports = function(hangulStr){
	
	return hangul.disassemble(hangulStr).join('');	

};

