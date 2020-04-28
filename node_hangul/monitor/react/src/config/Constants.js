const constants = {   
    SOCKET_NAMESPACE : '/',
    urls : {
        'load': '/loadSong/useWorkers',
        'loadFromDB': '/loadSong/useWorkers?from=db',        
        'clear': '/clearSong',
        'clearCache': '/clearCache'
    }
}

export default constants;