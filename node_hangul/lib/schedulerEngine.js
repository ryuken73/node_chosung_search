const cron = require('node-cron');


module.exports = (masterEngine, db) => {

    const registeredTasks = new Map();
    const register = (scheduleString, scheduleName) => {
        const valid = cron.validate(scheduleString);
        if(!valid){
            global.logger.error(`Not valid cron string (syntax: SS(0-59) MM(0-59) HH(0-23) DD(1-31) MO(1-12) W(0-7)`);
            return false; 
        }
        const callback = schedulableTasks[scheduleName];
        const task = cron.schedule(scheduleString, callback, {
            scheduled: false,
            timezone: "Asia/Seoul"
        });
        registeredTasks.set(scheduleName, task);   
        return true; 
    }

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
        // return await masterEngine.cacheManager.request({cmd: 'deleteByKey', payload: {key: KEY}});
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
        global.logger.info(`addIndex : result[${result}] artistName[${ARTIST}] songName[${SONG_NAME}] status[${STATUS}] open[${OPEN_DT}] key[${KEY}]`);
        return result;
    }

    const deleteDBRecord = async (EVENT_TIME, KEY) => {
        const sqlDeleteRecord = `delete from music.ac_search_log where EVENT_TIME = ? and KEY = ?`;
        const sqlDeleteArgs = [EVENT_TIME, KEY];
        const result = await db.execute(sqlDeleteRecord, sqlDeleteArgs);
        global.logger.info(`deleteDBRecord : result[${result}] EVENT_TIME[${EVENT_TIME}] KEY[${KEY}]`);
        console.log(result);
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
    }

    const handleInsert = async record => {
        // console.log(record)
    }

    const handleDelete = async record => {
        // console.log(record);
    }


    const schedulableTasks = {
        'incremental_v_song' : async () => {
            global.logger.info('schedule tiggerred');
            const sqlGetChanged = 'select * from music.ac_search_log order by event_time asc';
            const changedRecords = await db.query(sqlGetChanged, []);
            changedRecords.forEach(async record => {
                record.IUD_TYPE === 'U' && handleUpdate(record) 
                record.IUD_TYPE === 'I' && handleInsert(record)
                record.IUD_TYPE === 'D' && handleDelete(record) 
            })


            // const updateChanges = changedRecords.filter(record => record.IUD_TYPE === 'U');
            // const insertChanges = changedRecords.filter(record => record.IUD_TYPE === 'I');
            // const deleteChanges = changedRecords.filter(record => record.IUD_TYPE === 'D');
            // global.logger.info('result of schedule[updateChange] : ', updateChanges);
            // global.logger.info('result of schedule[insertChange] : ', insertChanges);
            // global.logger.info('result of schedule[deleteChange] : ', deleteChanges);
            // updateChanges.length > 0 && handleUpdate(updateChanges) && deleteRecords(updateChanges);
            // insertChanges.length > 0 && handleInsert(insertChanges) && deleteRecords(insertChanges);
            // deleteChanges.length > 0 && handleDelete(deleteChanges) && deleteRecords(deleteChanges);



            // changedRecords.forEach(async record => {
            //     const {EVENT_TIME, KEY, IDU_TYPE} = record;
            //     const sqlGetDetail = `${global.INDEX_DATA_SQL} where key = ?`;
                // const recordDetail = await db.query(sqlGetDetail, [KEY]);
                // console.log(recordDetail.shift());
                // const {ARTIST, SONG_NAME, OPEN_DT, STATUS} = recordDetail.unshift();
                // const wordArray = [ARTIST, SONG_NAME, KEY, OPEN_DT, STATUS];
                // global.logger.info(wordArray);

            // }) 
        } 
    }
    
    const start = scheduleName => {
        if(registeredTasks.has(scheduleName)){
            registeredTasks.get(scheduleName).start();
            return true;
        } else {
            global.logger.error(`No such task. register first! : ${scheduleName}`);
            return false;
        }
    }
    
    const stop = scheduleName => {
        if(registeredTasks.has(scheduleName)){
            registeredTasks.get(scheduleName).stop();
            return true;
        } else {
            global.logger.error(`No such task. register first! : ${scheduleName}`);
            return false;
        }
    }

    return {
        register,
        start,
        stop
    }
}

