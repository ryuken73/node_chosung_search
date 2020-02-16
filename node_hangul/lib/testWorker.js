process.on('message', ({reqId, job}) => {
    const {sleep} = job;
    setTimeout(() => {
        console.log(`DONE:${process.pid}:sleep`);
        process.send({
            resId : reqId,
            success: true,
            result: sleep
        })
    }, sleep)
})