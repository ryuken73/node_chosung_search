import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

function Worker({gap, workers}) {
  const smallFontSize = `${12 - (workers.length/3)}px`;
  const mediumFontSize = `${15 - (workers.length/3)}px`;
  const bigFontSize = `${25 - (workers.length/3)}px`;

  return (
      // <Box flexGrow={1} flexBasis={0} bgcolor={brown[800]}>
        <Box 
          display="flex" 
          flexDirection="row"
          justifyContent="center" 
          alignItems="center" 
          flexWrap="wrap" 
          flexGrow="1" 
          mx={gap} 
          // mb={gap} 
          bgcolor={brown[700]}
        >
          {workers.map(worker => 
            <Box 
              display="flex" 
              flexDirection="row" 
              justifyContent="center" 
              alignItems="center" 
              m={1} 
              fontSize={mediumFontSize} 
              bgcolor={brown[600]}
            >
              <Box display="flex" overflow="auto" justifyContent="flex-start" flexDirection="column" textAlign="left" p={2}>
                <div>PID: {worker.pid}</div>
                <div>WORDS: {worker.words.toLocaleString()}</div>
                <p></p>
                <Box textAlign="center" style={{fontSize:smallFontSize}}>MEM</Box>
                <div style={{fontSize:bigFontSize}}>{worker.mem}</div>
              </Box>
            </Box>
          )}
        </Box>
      // </Box>
  )
}

export default React.memo(Worker);