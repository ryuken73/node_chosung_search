
import {colors} from '@material-ui/core';

const constants = {   
    SOCKET_NAMESPACE : '/',
    urls : {
        'load': '/loadJuso/useWorkers',
        'loadFromDB': '/loadSong/useWorkers?from=db',      
        'search': '/searchJuso/withWorkers',  
        'clear': '/clearSong',
        'clearCache': '/clearCache'
    },
    set color(color){
        this._color = colors[color];
    },
    get color(){
        return this._color
    }

}

export default constants; 