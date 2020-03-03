const workerPool = require('./workPool');
const moduleFile = './testWorker';

const sleeps = [1000,2000,3000,4000];
const workers = workerPool.createWorker(moduleFile, [], sleeps.length, (oldWorker, newWorker) => console.log(oldWorker.pid, newWorker.pid));
// const jobs = workers.map((worker,index) => {
//     return worker.runJob({sleep:sleeps[index]});
// })
// const jobs1 = workers.map((worker,index) => {
//         return worker.runJob({sleep:sleeps[index]});
//     })
// Promise.all(jobs1).then((result) => console.log('all Done:', result));
// Promise.all(jobs).then((result) => console.log('all Done:', result));

const job = workers[0].runJob({sleep:sleeps[2]});
const job1 = workers[0].runJob({sleep:sleeps[1]});
const job2 = workers[0].runJob({sleep:sleeps[0]});
job.then((result) => console.log(result) )
job1.then((result) => console.log(result) )
job2.then((result) => console.log(result) )

