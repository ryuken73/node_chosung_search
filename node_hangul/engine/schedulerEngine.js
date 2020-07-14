const cron = require('node-cron');
const schedulableTasks = require('../lib/schedulableTasks');

module.exports = (masterEngine, db) => {

    const registeredTasks = new Map();

    const register = (scheduleString, scheduleName) => {
        const valid = cron.validate(scheduleString);
        if(!valid){
            global.logger.error(`Not valid cron string (syntax: SS(0-59) MM(0-59) HH(0-23) DD(1-31) MO(1-12) W(0-7)`);
            return false; 
        }
        const callback = schedulableTasks[scheduleName](masterEngine, db);
        const task = cron.schedule(scheduleString, callback, {
            scheduled: false,
            timezone: "Asia/Seoul"
        });
        registeredTasks.set(scheduleName, task);   
        return true; 
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

