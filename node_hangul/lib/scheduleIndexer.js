// const masterEngine = require("./masterEngine");

module. exports = (masterEngine, db) => {
    const _getDBRecord = async (KEY, statusLogger, dataLogger)  => {
        const sqlGetDetail = `${global.INDEX_DATA_SQL} where key = ?`;
        const recordDetail = await db.query(sqlGetDetail, [KEY]);
        const dbRecord = recordDetail.shift();
        if(dbRecord === undefined || dbRecord === {}){
            statusLogger('DATA','no DB data found');        
            statusLogger('DONE');        
            return false;
        }
        const {ARTIST, SONG_NAME, OPEN_DT, STATUS} = dbRecord;
        dataLogger([ARTIST, SONG_NAME, STATUS])
        return [ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]
    }

    const deleteDBRecord = async record => {
        const {EVENT_TIME, KEY} = record;
        const sqlDeleteRecord = `delete from music.ac_search_log where EVENT_TIME = ? and KEY = ?`;
        const sqlDeleteArgs = [EVENT_TIME, KEY];
        //const result = await db.execute(sqlDeleteRecord, sqlDeleteArgs);
        const result = await Promise.resolve(true)
        global.logger.trace(`deleteDBRecord : result[${result}] EVENT_TIME[${EVENT_TIME}] KEY[${KEY}]`);
    }

    const _addIndex = async ([ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS], statusLogger) => {
        const addIndexJob = {
            cmd : 'index',
            payload : {
                data : [ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]
            }
        }
        const result = await masterEngine.searchManager.nextWorker.promise.request(addIndexJob);
        if(result !== true) statusLogger('FAIL','(add index failure)');
        return result;
    }
    const _deleteIndexByKey = async (KEY, statusLogger) => {
        const deleteJob = {
            cmd: 'deleteByKey',
            payload: {
                key: KEY
            }
        }
        const results = await masterEngine.searchManager.request(deleteJob);
        if(results.some(result => result !== true)){
            statusLogger('DEL_INDEX','failed');        
        }   
        return results; 
    }   
    const _searchIndexByKey = async KEY => {
        const deleteJob = {
            cmd: 'searchByKey',
            payload: {
                key: KEY
            }
        }
        return await masterEngine.searchManager.request(deleteJob);
    }

    const _deleteCacheByValue = async ([artistName, songName], statusLogger) => {
        const deleteJob = {
            cmd: 'deleteByValue', 
            payload: {
                artistName,
                songName
            }
        }
        const results = await masterEngine.cacheManager.request(deleteJob);
        if(results.some(result => result !== true)){
            statusLogger('CACH','nothing to delete in cache');        
        }
        return results;
    }
    const _deleteCacheSearchable = async ([ARTIST, SONG_NAME], statusLogger) => {
        const deleteJob = {
            cmd: 'deleteSearchable', 
            payload: {
                singleSongRecord: [ARTIST, SONG_NAME]
            }
        }
        const results = await masterEngine.cacheManager.request(deleteJob);
        if(results.some(result => result !== true)){
            statusLogger('CACH','nothing to delete in cache');        
        }
        return results;
    }

    const _makeStatusLogger = ([EVENT_TIME, KEY, IUD_TYPE]) => (stage, message='') => {
        const Operations = {'U': 'update', 'I': 'insert', 'D': 'delete'};
        message = message !== '' ? ` ${message}` : ''; 
        global.logger.info(`scheduler : ${Operations[IUD_TYPE]} [${stage}] ${message} [${EVENT_TIME}] [${KEY}]`);
    }

    const _makeDataLogger = ([KEY, IUD_TYPE]) => ([ARTIST_NAME, SONG_NAME, STATUS], message='') => {
        const Operations = {'U': 'update', 'I': 'insert', 'D': 'delete'};
        message = message !== '' ? ` ${message}` : '';
        global.logger.info(`scheduler : ${Operations[IUD_TYPE]} [DATA] ${message} [${ARTIST_NAME}] [${SONG_NAME}] [${STATUS}]`);
    }

    const handleUpdate = async record => {
        const {EVENT_TIME, KEY, IUD_TYPE} = record
        const statusLogger = _makeStatusLogger([EVENT_TIME, KEY, IUD_TYPE]);
        const dataLogger = _makeDataLogger([KEY, IUD_TYPE]);
        statusLogger('FIRE');        

        await _deleteIndexByKey(KEY, statusLogger);

        const dbRecord= await _getDBRecord(KEY, statusLogger, dataLogger);
        if(dbRecord === false) return true;
        
        const addIndexResults = await _addIndex(dbRecord, statusLogger);
        if(addIndexResults !== true) return false;

        await _deleteCacheByValue(dbRecord, statusLogger);

        statusLogger('DONE');
        return true;
    }

    const handleInsert = async record => {
        const {EVENT_TIME, KEY, IUD_TYPE} = record
        const statusLogger = _makeStatusLogger([EVENT_TIME, KEY, IUD_TYPE]);
        const dataLogger = _makeDataLogger([KEY, IUD_TYPE]);
        statusLogger('FIRE');        
        
        const dbRecord= await _getDBRecord(KEY, statusLogger, dataLogger);
        if(dbRecord === false) return true;

        const addIndexResults = await _addIndex(dbRecord, statusLogger);
        if(addIndexResults !== true) return false;

        await _deleteCacheSearchable(dbRecord, statusLogger);

        statusLogger('DONE');
        return true;
    }

    const handleDelete = async record => {
        const {EVENT_TIME, KEY, IUD_TYPE} = record
        const statusLogger = _makeStatusLogger([EVENT_TIME, KEY, IUD_TYPE]);
        const dataLogger = _makeDataLogger([KEY, IUD_TYPE]);
        statusLogger('FIRE');        

        const resultsFromIndex = await _searchIndexByKey(KEY);
        const songsToDeleteFlattened = resultsFromIndex.flat();
        if(songsToDeleteFlattened.length === 0){
            statusLogger('CACH','nothing to delete in cache');   
            statusLogger('DONE');        
            return true
        }

        const deleteResults = await _deleteIndexByKey(KEY, statusLogger);
        if(deleteResults.some(result => result !== true)) return false;

        const songToDelete = songsToDeleteFlattened.shift();
        const {artistName, songName} = songToDelete;
        dataLogger([artistName, songName, ''])
        await _deleteCacheSearchable([artistName, songName], statusLogger);
        
        statusLogger('DONE');
        return true;
    }

    return {
        handleUpdate,
        handleInsert,
        handleDelete,
        deleteDBRecord
    }
}


