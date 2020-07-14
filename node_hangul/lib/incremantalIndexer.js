// const masterEngine = require("./masterEngine");

module. exports = (masterEngine, db) => {
    const deleteIndex = async KEY => {
        return await masterEngine.searchManager.request({cmd: 'deleteByKey', payload: {key: KEY}});
    }
    const deleteCache = async KEY => {
        const sqlGetDetail = `${global.INDEX_DATA_SQL} where key = ?`;
        const recordDetail = await db.query(sqlGetDetail, [KEY]);
        const {ARTIST, SONG_NAME} = recordDetail.shift();
        const deleteJob = {
            cmd: 'deleteByValue', 
            payload: {
                artistName: ARTIST,
                songName: SONG_NAME
            }
        }
        return await masterEngine.cacheManager.request(deleteJob);
    }
    const deleteCacheSearchable = async KEY => {
        const dbRecord= await getDBRecord(KEY);
        if(dbRecord === undefined || dbRecord === {}){
            global.logger.error(`addIndex failure : KEY[${KEY}]`);
            return false;
        }
        // global.logger.info(`deleteCacheSearchable : record to delete cache `, dbRecord);
        const {ARTIST, SONG_NAME, OPEN_DT, STATUS} = dbRecord
        const deleteJob = {
            cmd: 'deleteSearchable', 
            payload: {
                singleSongRecord: [ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]
            }
        }
        return await masterEngine.cacheManager.request(deleteJob);
    }
    const getDBRecord = async KEY  => {
        const sqlGetDetail = `${global.INDEX_DATA_SQL} where key = ?`;
        const recordDetail = await db.query(sqlGetDetail, [KEY]);
        const dbRecord = recordDetail.shift();
        return dbRecord
    }
    const addIndex = async KEY => {
        const dbRecord= await getDBRecord(KEY);
        if(dbRecord === undefined || dbRecord === {}){
            global.logger.error(`addIndex failure : KEY[${KEY}]`);
            return false;
        }
        const {ARTIST, SONG_NAME, OPEN_DT, STATUS} = dbRecord
        const addIndexJob = {
            cmd : 'index',
            payload : {
                data : [ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]
            }
        }
        const result = await masterEngine.searchManager.nextWorker.promise.request(addIndexJob);
        global.logger.trace(`addIndex : result[${result}] artist[${ARTIST}] song[${SONG_NAME}] status[${STATUS}] key[${KEY}]`);
        return result;
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
        const deleteResults = await deleteIndex(KEY);
        if(deleteResults.some(result => result !== true)){
            global.logger.error(`delete index failed : `, KEY);
            return false
        }
        const deleteCacheResults = await deleteCache(KEY);
        if(deleteCacheResults.some(result => result !== true)){
            global.logger.error(`delete cache failed : `, KEY);
            return false
        }
        const addIndexResults = await addIndex(KEY);
        if(addIndexResults !== true){
            global.logger.error('add index failed : ', KEY);
            return false
        }
        global.logger.info(`scheduler : update success [${EVENT_TIME}][${KEY}]`);
        return true;
    }

    const handleInsert = async record => {
        const {EVENT_TIME, KEY} = record
        const addIndexResults = await addIndex(KEY);
        if(addIndexResults !== true){
            global.logger.error('add index failed : ', KEY);
            return false
        }
        const deleteCacheResults = await deleteCacheSearchable(KEY);
        if(deleteCacheResults.some(result => result !== true)){
            global.logger.error(`delete cache failed : `, KEY);
            return false
        }
        global.logger.info(`scheduler : insert success [${EVENT_TIME}][${KEY}]`);
        return true;
    }

    const handleDelete = async record => {
        console.log('handleDelete');
        return true;
    }

    return {
        handleUpdate,
        handleInsert,
        handleDelete,
        deleteDBRecord
    }
}


