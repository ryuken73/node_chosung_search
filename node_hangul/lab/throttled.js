const trottled = (func, timeLimit) => {
    let timer = null;
    return (...args) => {
        if(timer === null){
            timer = setTimeout(() => {
                func.bind(func, args);
                timer = null;
            }, timeLimit)
        }
    }
}


const busyFunction = message => {
    setInterval(() => {
        console.log(`date : ${Date.now()} : ${message}`);
    },100)
}

const throttledConsole = trottled(busyFunction,1000);
busyFunction('ryuken');