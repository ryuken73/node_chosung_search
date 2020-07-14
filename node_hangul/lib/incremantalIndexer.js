// const masterEngine = require("./masterEngine");

module. exports = (masterEngine, db) => {
    const _getDBRecord = async KEY  => {
        const sqlGetDetail = `${global.INDEX_DATA_SQL} where key = ?`;
        const recordDetail = await db.query(sqlGetDetail, [KEY]);
        const dbRecord = recordDetail.shift();
        if(dbRecord === undefined || dbRecord === {}){
            global.logger.error(`_getDBRecord failure : KEY[${KEY}]`);
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
        return await masterEngine.searchManager.request({cmd: 'deleteByKey', payload: {key:KEY}});
    }   
    const _searchIndexByKey = async KEY => {
        return await masterEngine.searchManager.request({cmd: 'searchByKey', payload: {key:KEY}});
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
    const _deleteCacheSearchable = async ([ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]) => {
        const deleteJob = {
            cmd: 'deleteSearchable', 
            payload: {
                singleSongRecord: [ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]
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

    const handleUpdate = async record => {
        const {EVENT_TIME, KEY} = record
        global.logger.info(`scheduler : update start [${EVENT_TIME}][${KEY}]`);

        const deleteResults = await _deleteIndexByKey(KEY);
        if(deleteResults.some(result => result !== true)){
            global.logger.error(`delete index failed : `, KEY);
            return false
        }
        
        const dbRecord= await _getDBRecord(KEY);
        if(dbRecord === false) return false;
        const {ARTIST, SONG_NAME, OPEN_DT, STATUS} = dbRecord;
        global.logger.info(`scheduler : update record [${ARTIST}][${SONG_NAME}][${KEY}][${STATUS}]`);

        const deleteCacheResults = await _deleteCacheByValue([ARTIST, SONG_NAME]);
        if(deleteCacheResults.some(result => result !== true)){
            global.logger.error(`delete cache failed : `, KEY);
            return false
        }

        const addIndexResults = await _addIndex([ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]);
        if(addIndexResults !== true){
            global.logger.error('add index failed : ', KEY);
            return false
        }
        global.logger.info(`scheduler : update success [${EVENT_TIME}][${KEY}]`);
        return true;
    }

    const handleInsert = async record => {
        const {EVENT_TIME, KEY} = record
        global.logger.info(`scheduler : insert start [${EVENT_TIME}][${KEY}]`);

        const dbRecord= await _getDBRecord(KEY);
        if(dbRecord === false) return false;
        const {ARTIST, SONG_NAME, OPEN_DT, STATUS} = dbRecord;
        global.logger.info(`scheduler : insert record [${ARTIST}][${SONG_NAME}][${KEY}][${STATUS}]`);

        const addIndexResults = await _addIndex([ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]);
        if(addIndexResults !== true){
            global.logger.error('add index failed : ', KEY);
            return false
        }

        const deleteCacheResults = await _deleteCacheSearchable([ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]);
        if(deleteCacheResults.some(result => result !== true)){
            global.logger.error(`delete cache failed : `, KEY);
            return false
        }
        global.logger.info(`scheduler : insert success [${EVENT_TIME}][${KEY}]`);
        return true;
    }

    const handleDelete = async record => {
        const {EVENT_TIME, KEY} = record
        global.logger.info(`scheduler : delete start [${EVENT_TIME}][${KEY}]`);
        const songsToDelete = await _searchIndexByKey(KEY);
        const songsToDeleteFlattened = songsToDelete.flat();
        songsToDeleteFlattened.forEach(song => {

        })
        global.logger.info(songsToDeleteFlattened);
        // const deleteResults = await deleteIndex(KEY);
        // if(deleteResults.some(result => result !== true)){
        //     global.logger.error(`delete index failed : `, KEY);
        //     return false
        // }
        // const deleteCacheResults = await _deleteCacheByValue(KEY);
        // if(deleteCacheResults.some(result => result !== true)){
        //     global.logger.error(`delete cache failed : `, KEY);
        //     return false
        // }
        global.logger.info(`scheduler : delete success [${EVENT_TIME}][${KEY}]`);
        return true;
    }

    return {
        handleUpdate,
        handleInsert,
        handleDelete,
        deleteDBRecord
    }
}


