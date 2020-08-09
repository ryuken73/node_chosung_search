const hangul = require('hangul-js');
const {deflateSync} = require('zlib');
const snappy = require('snappy');

class Juso {
    constructor(jusoMerged){
        // this._jusoMerged = this.clearWord(jusoMerged);
        // this._jamoCombined = snappy.compressSync(this.getJAMO(this.mkCombined(this._jusoMerged)));
        this._jamoCombined = this.getJAMO(this.mkCombined(jusoMerged));
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
        const combined = `${sentenceNsentence} ${sentenceNsentenceNoBlank}`;
        // return combined;
        return sentenceNsentence;
    }
    match(regExpr){
        // return snappy.uncompressSync(this._jamoCombined, {asBuffer:false}).toUpperCase().search(regExpr) !== -1;
        return this._jamoCombined.toUpperCase().search(regExpr) !== -1;
    }
    get juso(){
        // return this._jusoMerged;
        const assembled = hangul.assemble(this._jamoCombined);
        return assembled.slice(0, assembled.length/2)
    }
    get doro(){
        return this._doro;
    }
    get jibun(){
        return this._jibun;
    }
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
    create(dataArray){
        const sido = dataArray[1];
        const gu = dataArray[3];
        const ubMyun = dataArray[5] || '';
        const ro = dataArray[8];
        const bonbun = dataArray[11];
        const bubun = dataArray[12];
        const buildingNum = `${bonbun}${bubun === '0' ? '':'-'+bubun}`
        const buildingName = dataArray[15];
        const dong = dataArray[17] || '';
        const lastDoroJuso = `${buildingName ? ', '+buildingName+' '+dong:''}`;
        const jibunBonbun = dataArray[21];
        const jibunBubun = dataArray[23];
        const jibun = `${jibunBonbun}${jibunBubun === '0' ? '':'-'+jibunBubun}`
        const ri = dataArray[18] || '';
        const dongHangjung = dataArray[19] || dong; 
        const jusoMerged = `${sido} ${gu} ${ubMyun} ${ro} ${buildingNum} ${lastDoroJuso} ${ri}${dong?' '+dong+' ':' '}${jibun} ${buildingName}(${dongHangjung})`
        return new Juso(jusoMerged);
    }
}
