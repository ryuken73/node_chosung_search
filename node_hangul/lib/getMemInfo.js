module.exports = () => {
    const {rss, heapTotal, heapUsed, external} = process.memoryUsage();
    const totalMB = ( heapTotal / 1024 / 1024 ).toFixed(2);
    const usedMB = (heapUsed / 1024 / 1024).toFixed(2);
    // return [`${usedMB}MB`, `${totalMB}MB`]
    // return `${usedMB}MB/${totalMB}MB`
    return `${usedMB}MB`

}