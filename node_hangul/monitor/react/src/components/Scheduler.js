import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

function Master({gap, master}) {
  // const lastIndexedCount = master.lastIndexedCount ? master.lastIndexedCount : 0;
  // const lastIndexedPercent = master.lastIndexedPercent ? master.lastIndexedPercent : '0%';
  // const {searching = 0} = master;
  const lastExecuted = '2020/07/09 23:22:01'
  return (
      <Box display="flex" height="20vh" flexDirection="column">
        <Box 
          display="flex" 
          flexDirection="row" 
          justifyContent="space-around" 
          alignItems="center" 
          height="1"
          mx={gap}  
          fontSize="fontSize" 
          bgcolor={brown[700]}
          overflow="hidden"
        >
          <Box>
             <div style={{fontSize:"12px"}}>Insert</div>
             <div style={{fontSize:"60px"}}>{"0"}</div> 
          </Box> 
          <Box>
             <div style={{fontSize:"12px"}}>Update</div>
             <div style={{fontSize:"60px"}}>{"0"}</div> 
          </Box> 
          <Box>
             <div style={{fontSize:"12px"}}>Delete</div>
             <div style={{fontSize:"60px"}}>{"0"}</div> 
          </Box> 
        </Box>
        <Box 
          bgcolor={brown[800]}
          mx={gap}  
          fontSize="fontSize" 
          textAlign="center"
          mb={gap} 
        >
            last execution : {lastExecuted}
        </Box>
      </Box>

  )
}

export default React.memo(Master);