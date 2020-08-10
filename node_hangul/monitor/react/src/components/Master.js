import React from 'react';
import Box from '@material-ui/core/Box';
import Constants from '../config/Constants';

function Master({gap, master}) {
  const lastIndexedCount = master.lastIndexedCount ? master.lastIndexedCount : 0;
  const lastIndexedPercent = master.lastIndexedPercent ? master.lastIndexedPercent : '0%';
  const {searching = 0} = master;
  return (
      <Box display="flex" height="20vh" flexDirection="column">      
        <Box 
          display="flex" 
          flexDirection="row" 
          justifyContent="space-around" 
          alignItems="center" 
          // height="1"
          height='20vh' 
          mx={gap} 
          // mb={gap} 
          fontSize="fontSize" 
          bgcolor={Constants.color[700]}
          overflow="hidden"
        >
          <Box display="flex" justifyContent="flex-start" flexDirection="column" m={2} textAlign="left">
            <div>PID: {master.pid}</div> 
            <div>MEM: {master.mem}</div>
            <p></p>
            <div>TOTAL INDEXED : {lastIndexedCount.toLocaleString()}</div>
            <div>TOTAL PERCENT : {lastIndexedPercent.toLocaleString()}</div>
            <div>LAST INDEXED DATE : {master.lastIndexedDate}</div>

          </Box>
          <Box>
             <div style={{fontSize:"12px"}}>Searching</div>
             <div style={{fontSize:"60px"}}>{searching}</div> 
          </Box> 
        </Box>
      </Box>
  )
}

export default React.memo(Master);