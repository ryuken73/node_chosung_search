
const schedulableTasks = {
    [global.SCHEDULE_NAME.INCREMENTAL] : (masterEngine,db) => {
        const scheduleIndexder = require('./scheduleIndexer')(masterEngine, db);
        return async () => {
            const {handleUpdate, handleInsert, handleDelete, deleteDBRecord} = scheduleIndexder;
            global.logger.info(`scheduler : [${global.SCHEDULE_NAME.INCREMENTAL}] tiggerred`);
            const sqlGetChanged = 'select * from music.ac_search_log order by event_time asc';
            const changedRecords = await db.query(sqlGetChanged, []);
            for(let i=0;i<changedRecords.length;i++){
                const record = changedRecords[i];
                const result = record.IUD_TYPE === 'U' && await handleUpdate(record) || 
                               record.IUD_TYPE === 'I' && await handleInsert(record) ||
                               record.IUD_TYPE === 'D' && await handleDelete(record); 
                if(result === true) await deleteDBRecord(record);
            }
        } 
    }
}

module.exports = schedulableTasks