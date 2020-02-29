class KeyStore {
    constructor(){
        this.key = 0;
    }
    getKey(){
        return this.key;
    }
    getNextKey(){
        return ++this.key;
    }
    increaseKey(){
        this.key++;
    }
    resetKey(resetValue=0){
        this.key = resetValue;
    }
}

const createKeyGenerator = () => {
    return new KeyStore();
}

module.exports = {
    createKeyGenerator,
}