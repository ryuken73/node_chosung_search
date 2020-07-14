// const masterEngine = require("./masterEngine");

module. exports = (masterEngine, db) => {
    const _getDBRecord = async KEY  => {
        const sqlGetDetail = `${global.INDEX_DATA_SQL} where key = ?`;
        const recordDetail = await db.query(sqlGetDetail, [KEY]);
        const dbRecord = recordDetail.shift();
        if(dbRecord === undefined || dbRecord === {}){
            return false;
        }
        return dbRecord
    }

    const _addIndex = async ([ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]) => {
        const addIndexJob = {
            cmd : 'index',
            payload : {
                data : [ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]
            }
        }
        const result = await masterEngine.searchManager.nextWorker.promise.request(addIndexJob);
        global.logger.trace(`_addIndex : result[${result}] artist[${ARTIST}] song[${SONG_NAME}] status[${STATUS}] key[${KEY}]`);
        return result;
    }
    const _deleteIndexByKey = async KEY => {
        const deleteJob = {
            cmd: 'deleteByKey',
            payload: {
                key: KEY
            }
        }
        return await masterEngine.searchManager.request(deleteJob);
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

    const _deleteCacheByValue = async ([artistName, songName]) => {
        const deleteJob = {
            cmd: 'deleteByValue', 
            payload: {
                artistName,
                songName
            }
        }
        return await masterEngine.cacheManager.request(deleteJob);
    }
    const _deleteCacheSearchable = async ([ARTIST, SONG_NAME]) => {
        const deleteJob = {
            cmd: 'deleteSearchable', 
            payload: {
                singleSongRecord: [ARTIST, SONG_NAME]
            }
        }
        return await masterEngine.cacheManager.request(deleteJob);
    }

    const deleteDBRecord = async record => {
        const {EVENT_TIME, KEY} = record;
        const sqlDeleteRecord = `delete from music.ac_search_log where EVENT_TIME = ? and KEY = ?`;
        const sqlDeleteArgs = [EVENT_TIME, KEY];
        //const result = await db.execute(sqlDeleteRecord, sqlDeleteArgs);
        const result = await Promise.resolve(true)
        global.logger.trace(`deleteDBRecord : result[${result}] EVENT_TIME[${EVENT_TIME}] KEY[${KEY}]`);
    }

    const getStatusLogger = ([EVENT_TIME, KEY, IUD_TYPE]) => (stage, message='') => {
        const Operations = {'U': 'update', 'I': 'insert', 'D': 'delete'};
        message = message !== '' ? ` ${message}` : ''; 
        global.logger.info(`scheduler : ${Operations[IUD_TYPE]} [${stage}] ${message} [${EVENT_TIME}] [${KEY}]`);
    }

    const getDataLogger = ([KEY, IUD_TYPE]) => ([ARTIST_NAME, SONG_NAME, STATUS], message='') => {
        const Operations = {'U': 'update', 'I': 'insert', 'D': 'delete'};
        message = message !== '' ? ` ${message}` : '';
        global.logger.info(`scheduler : ${Operations[IUD_TYPE]} [DATA] ${message} [${ARTIST_NAME}] [${SONG_NAME}] [${STATUS}]`);
    }

    const handleUpdate = async record => {
        const {EVENT_TIME, KEY, IUD_TYPE} = record
        const statusLogger = getStatusLogger([EVENT_TIME, KEY, IUD_TYPE]);
        const dataLogger = getDataLogger([KEY, IUD_TYPE]);

        statusLogger('FIRE');        

        const deleteResults = await _deleteIndexByKey(KEY);
        if(deleteResults.some(result => result !== true)){
            statusLogger('DEL_INDEX','failed');        
            // record can be not exsiting, and go process on.
        }    

        const dbRecord= await _getDBRecord(KEY);
        if(dbRecord === false) {
            statusLogger('DATA','no DB data found');        
            // record could not be founded. no need to add index and cannot delete cache.
            // delete DB job table by returning true.
            statusLogger('DONE');        

            return true;
        }
        const {ARTIST, SONG_NAME, OPEN_DT, STATUS} = dbRecord;
        dataLogger([ARTIST, SONG_NAME, STATUS])

        const addIndexResults = await _addIndex([ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]);
        if(addIndexResults !== true){
            statusLogger('FAIL','(add index failure)');
            // do not delete job table to try later. so return false
            return false
        }

        const deleteCacheResults = await _deleteCacheByValue([ARTIST, SONG_NAME]);
        if(deleteCacheResults.some(result => result !== true)){
            statusLogger('CACH','nothing to delete in cache');        
        }
        statusLogger('DONE');

        return true;
    }

    const handleInsert = async record => {
        const {EVENT_TIME, KEY, IUD_TYPE} = record
        const statusLogger = getStatusLogger([EVENT_TIME, KEY, IUD_TYPE]);
        const dataLogger = getDataLogger([KEY, IUD_TYPE]);
        statusLogger('FIRE');        
        
        const dbRecord= await _getDBRecord(KEY);
        if(dbRecord === false) {
            statusLogger('DATA','no DB data found');        
            // record could not be founded. no need to add index and cannot delete cache.
            // delete DB job table by returning true.
            statusLogger('DONE');        
            return true;
        }
        const {ARTIST, SONG_NAME, OPEN_DT, STATUS} = dbRecord;
        dataLogger([ARTIST, SONG_NAME, STATUS]);

        const addIndexResults = await _addIndex([ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]);
        if(addIndexResults !== true){
            statusLogger('FAIL','(add index failure)');
            // do not delete job table to try later. so return false
            return false
        }
        const deleteCacheResults = await _deleteCacheSearchable([ARTIST, SONG_NAME]);
        if(deleteCacheResults.some(result => result !== true)){
            statusLogger('CACH','nothing to delete in cache');        
        }
        statusLogger('DONE');
        return true;
    }

    const handleDelete = async record => {
        const {EVENT_TIME, KEY, IUD_TYPE} = record
        const statusLogger = getStatusLogger([EVENT_TIME, KEY, IUD_TYPE]);
        const dataLogger = getDataLogger([KEY, IUD_TYPE]);
        statusLogger('FIRE');        

        const resultsFromIndex = await _searchIndexByKey(KEY);
        const songsToDeleteFlattened = resultsFromIndex.flat();
        if(songsToDeleteFlattened.length === 0){
            statusLogger('CACH','nothing to delete in cache');   
            statusLogger('DONE');        
            return true
        }

        const deleteResults = await _deleteIndexByKey(KEY);
        if(deleteResults.some(result => result !== true)){
            statusLogger('DEL_INDEX','failed');        
            // do not delete job table to try later. so return false
            return false
        }

        const songToDelete = songsToDeleteFlattened.shift();
        const {artistName, songName} = songToDelete;
        dataLogger([artistName, songName, ''])
        const deleteCacheResults = await _deleteCacheSearchable([artistName, songName]);
        if(deleteCacheResults.every(result => result !== true)){
            statusLogger('CACH','nothing deleted in cache');   
        }        
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


