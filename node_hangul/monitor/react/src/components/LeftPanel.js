import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

export default function LeftPanel({workers}) {
    return (
        <Box flexGrow={1} flexBasis={0} bgcolor={brown[800]}>
          <Box component="div">workers</Box>
          <Box display="flex" width="100%" flexDirection="row" justifyContent="center" flexWrap="wrap">
            {workers.map(worker => 
              <Box flex="initial" display="flex" justifyContent="center" alignItems="center" flexDirection="row" width="30%" height="20vh" m={1} fontSize="fontSize" bgcolor={brown[700]}>
                <Box display="flex" justifyContent="flex-start" flexDirection="column" textAlign="left">
                  <div>PID: {worker.pid}</div>
                  <div>WORDS: {worker.words.toLocaleString()}</div>
                  <p></p>
                  <Box textAlign="center" style={{fontSize:"12px"}}>MEM</Box>
                  <div style={{fontSize:"25px"}}>{worker.mem}</div>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
    )
}
