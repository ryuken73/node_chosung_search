const hangul = require('hangul-js');

class Juso {
    constructor([doro='', jibun='', sido='']){
        this._doro = doro;
        // this._jibun = jibun;   
        this._sido = sido;
        // this._combinedDoro = this.mkCombined(this._doro);
        this._jamoCombinedDoro = this.getJAMO(this.mkCombined(doro));
        // this._combinedJibun = this.mkCombined(this._jibun);
        // this._jamoCombinedJibun = this.getJAMO(this.mkCombined(jibun));
        return this;     
    } 
    getJAMO(hangulStr) {
        return hangul.disassemble(hangulStr).join('');	
    }
    clearWord(word) {
        return word.replace(/\s+/g, " ").trim().replace(/^"/gi, '').replace(/"$/gi, '').replace(/\s+$/gi, '');
    }
    mkCombined(sentence) {
        const sentenceNsentence = `${sentence} ${sentence}`;
        const sentenceNsentenceNoBlank = `${sentence.replace(/\s+/g, '')}${sentence.replace(/\s+/g, '')}`;
        return `${sentenceNsentence} ${sentenceNsentenceNoBlank}`
    }
    match(regExpr){
        return this._jamoCombinedDoro.toUpperCase().search(regExpr) !== -1 || 
               this._jamoCombinedJibun.toUpperCase().search(regExpr) !== -1 
    }
    get doro(){
        return this._doro;
    }
    get jibun(){
        return this._jibun;
    }
    // get combinedDoro(){
    //     return this._combinedDoro;
    // }
    get combinedJibun(){
        return this._combinedJibun;
    }
    get jamoDoro(){
        return this.getJAMO(this._doro);
    }
    get jamoJibun(){
        return this.getJAMO(this._jibun);
    }
    get jamoCombinedDoro(){
        return this._jamoCombinedDoro;
    }
    get jamoCombinedJibun(){
        return this._jamoCombinedJibun;
    }
}

module.exports = {
    create([doro='', jibun='', sido='']){
        return new Juso([doro, jibun, sido]);
    }
}
