const constants = {   
    SOCKET_NAMESPACE : '/',
    urls : {
        'load': '/loadJuso/useWorkers',
        'loadFromDB': '/loadSong/useWorkers?from=db',      
        'search': '/searchJuso/withWorkers',  
        'clear': '/clearSong',
        'clearCache': '/clearCache'
    }
}

export default constants; 