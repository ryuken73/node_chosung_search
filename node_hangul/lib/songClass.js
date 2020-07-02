const hangul = require('hangul-js');

class Song {
    constructor([artistName='', songName='']){
        this._artistName = this.clearWord(artistName);
        this._songName = this.clearWord(songName);   
        this._combinedName = this.mkCombinedName();
        this._jamoCombinedName = this.getJAMO(this._combinedName);
        return this;     
    }    
    getJAMO(hangulStr) {
        return hangul.disassemble(hangulStr).join('');	
    }
    clearWord(word) {
        return word.replace(/\s+/g, " ").trim().replace(/^"/gi, '').replace(/"$/gi, '').replace(/\s+$/gi, '');
    }
    mkCombinedName() {
        const artistNsongNartist = `${this._artistName} ${this._songName} ${this._artistName}`;
        const artistNsongNartistNoBlank = `${this._songName.replace(/\s+/g, '')}${this._artistName.replace(/\s+/g, '')}${this._songName.replace(/\s+/g, '')}`;
        return `${artistNsongNartist} ${artistNsongNartistNoBlank}`
    }
    get artistName(){
        return this._artistName;
    }
    get songName(){
        return this._songName;
    }
    get combinedName(){
        return this._combinedName;
    }
    get jamoArtist(){
        return this.getJAMO(this._artistName);
    }
    get jamoSong(){
        return this.getJAMO(this._songName);
    }
    get jamoCombinedName(){
        return this._jamoCombinedName;
    }
}

module.exports = {
    create([artistName='', songName='']){
        return new Song([artistName, songName]);
    }
}
