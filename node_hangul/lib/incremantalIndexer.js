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
    const addIndex = async KEY => {
        const sqlGetDetail = `${global.INDEX_DATA_SQL} where key = ?`;
        const recordDetail = await db.query(sqlGetDetail, [KEY]);
        const {ARTIST, SONG_NAME, OPEN_DT, STATUS} = recordDetail.shift();
        const addIndexJob = {
            cmd : 'index',
            payload : {
                data : [ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS]
            }
        }
        const result = await masterEngine.searchManager.nextWorker.promise.request(addIndexJob);
        global.logger.info(`addIndex : result[${result}] artist[${ARTIST}] song[${SONG_NAME}] status[${STATUS}] key[${KEY}]`);
        return result;
    }

    const deleteDBRecord = async record => {
        const {EVENT_TIME, KEY} = record;
        const sqlDeleteRecord = `delete from music.ac_search_log where EVENT_TIME = ? and KEY = ?`;
        const sqlDeleteArgs = [EVENT_TIME, KEY];
        //const result = await db.execute(sqlDeleteRecord, sqlDeleteArgs);
        const result = await Promise.resolve(true)
        global.logger.info(`deleteDBRecord : result[${result}] EVENT_TIME[${EVENT_TIME}] KEY[${KEY}]`);
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
        return true;
    }

    const handleInsert = async record => {
        console.log('handleInsert');
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


