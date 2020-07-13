const cron = require('node-cron');


module.exports = (masterEngine) => {

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
    
    const schedulableTasks = {
        'incremental_v_song' : () => {
            global.logger.info('schedule tiggerred');
            // masterEngine.searchManager.workers.map(worker => console.log(wosrker.pid));
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

