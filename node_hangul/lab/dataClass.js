class Song {
    constructor([artist='', song='']){
        this._artist = artist;
        this._song = song;
    }

    get artist() {
        return this._artist;
    }
    set artist(name){
        this._artist = name;
    }
    get song() {
        return this._song;
    }
}

const song = new Song(['류건우', 'ryu']);
console.log(song['artist']);
console.log(song.song);
song.artist = 'ken';
console.log(song.artist)


class InPattern {
	constructor(pattern){
		this._pattern = pattern;
		this._patternUpperCase = pattern.toUpperCase();
		this._patternJAMO = extractJAMO(pattern).replace(/\s+/g, ' ');
		return this;
	}
	
	get pattern() { return this._pattern }
	get upperCase() { return this._patternUpperCase}
	get patternJAMO() { return this._patternJAMO}
}

const inPattern = new InPattern(searchPattern)
console.log('%s',inPattern._pattern);