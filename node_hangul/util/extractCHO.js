/**
 * @param {string} hangulStr string to extract hangul chosung
 * @return {array} array of hangul chosung of given word
 */

const hangul = require('hangul-js');

module.exports = function(hangulStr){
	var processed = 0;
	var result = "";
	
	for(var str of hangulStr){
		result += breakCHO(str);
		processed ++;
		if(processed === hangulStr.length){
			return result;
		}
	}
	
};


var breakCHO = function(hanStr){
	
	return hangul.disassemble(hanStr)[0];
	
};