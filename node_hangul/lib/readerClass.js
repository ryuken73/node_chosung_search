const EventEmitter = require('events');
const fs = require('fs');
const readline = require('readline');

const NUMBER_OF_COLUMNS_FROM_FILE = global.NUMBER_OF_COLUMNS_FROM_FILE || 2;


class Reader extends EventEmitter {
    constructor(){
        super();
        this.emitChangedValue = this.valueChanged(0);
    }
    progressor(total){
        return (processed, digit=0) => {
            return ((processed / total) * 100).toFixed(digit);   
        }
    }
    valueChanged(startValue){
        let oldValue = startValue;
        return (newValue) => {
            if(newValue !== oldValue){
                oldValue = newValue;
                return newValue;
            }
            return false;
        }
    }
}

class DBReader extends Reader {
    constructor(options){
        super();
        this.db = options.db;
        this.getCountSQL = options.getCountSQL;
        this.getCountArgValue= options.getCountArgValue || [];
        this.indexDataSQL = options.indexDataSQL;
        this.limitSQLDataCount = options.limitSQLDataCount;
        this.limitSQLClause = options.limitSQLDataCount === 0
                              ? '' 
                              : `fetch first ${options.limitSQLDataCount} rows only` ;
        this.indexDataArgValue = options.indexDataArgValue || [];
    }
    get rStream(){return this._rStream}
    get queryCountSQL() {return `${this.getCountSQL}`}
    get queryDataSQL() {return `${this.indexDataSQL} ${this.limitSQLClause}`}   
    async getTotal(){
        if(this.limitSQLDataCount !== 0) {
            return this.limitSQLDataCount;
        }
        const result = await this.db.query(this.queryCountSQL, this.getCountArgValue);
        return result.shift().TOTAL;
    }
    async start(){
        const rStream = await this.db.queryStream(this.queryDataSQL, this.indexDataArgValue);
        this._rStream = rStream;
        this.selected = 0;
        rStream.on('data', result => {
            this.selected ++;
            this.emit('data', result);
        });
    }
    percentProcessed(digit){
        const getProgress = this.progressor(this.totalRecordsCount);
        return this.emitChangedValue(getProgress(this.selected, digit));
    }
}

class FileReader extends Reader { 
    constructor(options){
        super();
        const defaultOptions = {
            columnSep  : '"^"',
            lineSep  : '\r\n',
            encoding : 'utf8',
            highWaterMark : 64 * 1024,
            end : global.INDEXING_BYTES,
        }
        const combinedOpts = {
            ...defaultOptions,
            ...options
        };
        this.srcFile = combinedOpts.srcFile;
        this.encoding = combinedOpts.encoding;
        this.end = combinedOpts.end;
        this.separators = {
            columnSep: combinedOpts.columnSep,
            lineSep: combinedOpts.lineSep
        }
        this.emitChangedValue = this.valueChanged(0);
        this.lineIncompleteBefore = '';
    }
    set fileSize(size){this._fileSize = size}
    get fileSize(){return this._fileSize}
    get rStream(){return this.fsReadStream}
    get rl(){return this.readLine}
    get bytesRead(){return this._bytesRead}
    start(){
        const fsReadStream = fs.createReadStream(this.srcFile, {encoding: this.encoding, start:0, end: this.fileSize});
        const rl = readline.createInterface({input:fsReadStream});
        this.fsReadStream = fsReadStream;
        this.readLine = rl;

        rl.on('line', line => {
            this._bytesRead = rl.input.bytesRead;
            this.emit('line', line);
        });
    }
    percentProcessed(digit){
        const getProgress = this.progressor(this._fileSize);
        return this.emitChangedValue(getProgress(this._bytesRead, digit));
    }
    calculateFileSzie(){
        return new Promise((resolve, reject) => {
            fs.stat(this.srcFile, (err, stat) => {
                if(err){
                    reject(err);
                    return
                }
                resolve(stat.size);
            })
        })
    }
    lineToArray(line){
        const combined = `${this.lineIncompleteBefore}${line}`;
        if(this.hasProperColumns(combined)){
            this.lineIncompleteBefore = '';
            return combined.split(this.separators.columnSep);
        }
        this.lineIncompleteBefore = combined.replace(this.separators.lineSep, '');
        return [];
    }
    hasProperColumns(line) { 
        global.logger.debug(this.CORRECT_NUMBER_OF_COLUMNS, this.separators.columnSep, line.split(this.separators.columnSep).length);
        return line.split(this.separators.columnSep).length === NUMBER_OF_COLUMNS_FROM_FILE;
    }
    
}

const createFileReader = async options => {
    const fileReader = new FileReader(options);
    const fileSize = await fileReader.calculateFileSzie();
    fileReader.fileSize = options.end || fileSize;
    return fileReader;
}

const createDBReader = async options => {
    const dbReader = new DBReader(options);
    const totalRecordsCount = await dbReader.getTotal();
    dbReader.totalRecordsCount = totalRecordsCount;
    return dbReader;
}

module.exports = {
    createFileReader,
    createDBReader
}