/**
 * @param {string} hangulStr string to get jamo string
 * @return {string} jamo string ex) 'ㄱ ㅏ ㄴ ㅏ'
 */

var hangul = require('hangul-js');

module.exports = function(hangulStr){
	
	return hangul.disassemble(hangulStr).join('');	

};

