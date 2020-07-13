var extractJAMO = require('../util/extractJAMO');

const replaceRegMetaCharacter = (word, replacer) => {
    const re = /([?\\\*\+\.\{\}\[\]\(\)])/g
    return word.replace(re, replacer + '\$1');
}

const mkRegExpr = (str) => {
    return spacing => {
        try {
            if(typeof(str) === 'string') {
                const wordsSplited = str.trimStart().trimEnd().split(' ');
                const whitespaceRemoved = wordsSplited.filter(word => word !== '');
                const escapeMetaCharacters = whitespaceRemoved.map(word => replaceRegMetaCharacter(word, '\\'));
                const spcaceExpr = spacing ? '.+' : '.*?';
                return new RegExp(escapeMetaCharacters.join(spcaceExpr));
            }
            return null;
        } catch (err) {
            return null;
        }
    }
}

class InPattern {
	constructor(pattern){
		this._pattern = pattern;
		this._patternUpperCase = pattern.toUpperCase();
        this._patternJAMO = extractJAMO(pattern).replace(/\s+/g, ' ');
        this._patternRegExp = mkRegExpr(this._patternJAMO.toUpperCase().trimEnd());
		return this;
	}
	
	get pattern() { return this._pattern }
	get upperCase() { return this._patternUpperCase}
    get patternJAMO() { return this._patternJAMO}
    getRegExpString(spacing) {return this._patternRegExp(spacing)};
}

const createPattern = pattern => {
    return new InPattern(pattern);
}

module.exports = {
    createPattern
}