import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

export default function Worker({workers}) {
  const smallFontSize = `${12 - (workers.length/3)}px`;
  const mediumFontSize = `${15 - (workers.length/3)}px`;
  const bigFontSize = `${25 - (workers.length/3)}px`;

  return (
      <Box flexGrow={1} flexBasis={0} bgcolor={brown[800]}>
        <Box component="div" textAlign="center">workers</Box>
        <Box component="div" display="flex" width="100%" flexDirection="row" justifyContent="center" flexWrap="wrap">
          {workers.map(worker => 
            <Box flex="initial" display="flex" justifyContent="center" alignItems="center" flexDirection="row" 
                  width={workers.length < 10 ? '30%':'20%'} 
                  height={28-workers.length + 'vh'} m={1} fontSize={mediumFontSize} bgcolor={brown[700]}>
              <Box display="flex" overflow="auto" justifyContent="flex-start" flexDirection="column" textAlign="left">
                <div>PID: {worker.pid}</div>
                <div>WORDS: {worker.words.toLocaleString()}</div>
                <p></p>
                <Box textAlign="center" style={{fontSize:smallFontSize}}>MEM</Box>
                <div style={{fontSize:bigFontSize}}>{worker.mem}</div>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
  )
}
