const cpManager = require('./childProcManager');
const moduleFile = './testWorker';

const sleeps = [1000,2000,3000,4000];
const options = {
    jsFile : moduleFile,
    args : [],
    count : sleeps.length,
    customExitCallback: () => {}
}
const manager = cpManager.create(options);
const jobs = manager.workers.map((worker,index) => {
    return worker.promise.request({sleep:sleeps[index]});
})
const jobs1 = manager.workers.map((worker,index) => {
        return worker.promise.request({sleep:sleeps[index]});
})
Promise.all(jobs1).then((result) => console.log('all Done:', result)).catch((err) => console.log(`error:`, err))
Promise.all(jobs).then((result) => console.log('all Done:', result)).catch((err) => console.log(`error:`, err))

// manager.request({sleep: 1000})
// .then(result => console.log(result))
// .catch(err => console.error(err))

// const job = workers[0].runJob({sleep:sleeps[2]});
// const job1 = workers[0].runJob({sleep:sleeps[1]});
// const job2 = workers[0].runJob({sleep:sleeps[0]});
// job.then((result) => console.log(result) )
// job1.then((result) => console.log(result) )
// job2.then((result) => console.log(result) )

