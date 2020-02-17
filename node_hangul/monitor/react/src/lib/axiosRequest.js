import axios from 'axios';
import CONSTANTS from '../config/Constants';

const axiosRequest = {
    async get(type){
        try {
            const url = CONSTANTS.urls[type];
            if(!url) return Promise.resolve({success:false, msg:`not valid type : ${type}`});
            const response = await axios.get(url);
            if(response.status === 200){
                console.log(response.data)
                return response.data;
            }
        } catch (err) {
            console.error(err);

        }
    },
}

export default axiosRequest;