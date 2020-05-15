const path = require('path');
const PKG_TOP_DIR = 'snapshot';

const runInPackagedEnvironment = () => {
    const pathParsed = path.parse(__dirname);
    const root = pathParsed.root;
    const dir = pathParsed.dir;
    const firstChildDir = path.relative(root, dir).split(path.sep)[0];
    return (firstChildDir === PKG_TOP_DIR)    
}

const getConfig = (configFile) => {
    return require(configFile);
}


module.exports = {
    getConfig
};