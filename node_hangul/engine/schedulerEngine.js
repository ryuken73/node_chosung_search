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

    const incrIndexer = require('../lib/incremantalIndexer')(masterEngine, db);
    const schedulableTasks = {
        [global.SCHEDULE_NAME.INCREMENTAL] : async () => {
            const {handleUpdate, handleInsert, handleDelete, deleteDBRecord} = incrIndexer;
            global.logger.info('scheduler tiggerred');
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
    
    const start = scheduleName => {
        if(registeredTasks.has(scheduleName)){
            registeredTasks.get(scheduleName).start();
            global.logger.info('scheduler started!');
            return true;
        } else {
            global.logger.error(`No such task. register first! : ${scheduleName}`);
            return false;
        }
    }
    
    const stop = scheduleName => {
        if(registeredTasks.has(scheduleName)){
            registeredTasks.get(scheduleName).stop();
            global.logger.info('scheduler stopped!');
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

