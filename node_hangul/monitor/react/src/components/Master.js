import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

export default function Master({master}) {
  const lastIndexedCount = master.lastIndexedCount ? master.lastIndexedCount : 0;
  const {searching = 0} = master;
  return (
        <Box display="flex" flexDirection="row" justifyContent="space-around" alignItems="center" height='20vh' mx={0.5} mb={0.5} fontSize="fontSize" bgcolor={brown[700]}>
          <Box display="flex" justifyContent="flex-start" flexDirection="column" m={2} textAlign="left">
            <div>PID: {master.pid}</div> 
            <div>MEM: {master.mem}</div>
            <p></p>
            <div>TOTAL INDEXED : {lastIndexedCount.toLocaleString()}</div>
            <div>LAST INDEXED DATE: {master.lastIndexedDate}</div>

          </Box>
          <Box>
             <div style={{fontSize:"12px"}}>Searching</div>
             <div style={{fontSize:"60px"}}>{searching}</div> 
          </Box> 
        </Box>
  )
}
