/**
 * @param {string} hangulStr string to get jamo string
 * @return {string} jamo string ex) 'ㄱ ㅏ ㄴ ㅏ'
 */

const hangul = require('hangul-js');

module.exports = function(hangulStr){
	
	// return hangul.disassemble(hangulStr).join('');	
	const disassembled = hangul.disassemble(hangulStr).join('');
	const whitespaceRemoved = disassembled.replace(/\s+/g, ' ');
	return whitespaceRemoved;

};

