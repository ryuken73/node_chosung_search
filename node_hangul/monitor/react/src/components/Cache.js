import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

function Cache({gap, caches}) {
  const smallFontSize = `${10 - (caches.length/3)}px`; 
  const mediumFontSize = `${13 - (caches.length/3)}px`;
  const bigFontSize = `${22 - (caches.length/3)}px`; 

  return (
    <Box 
     display="flex" 
     flexDirection="row"
     justifyContent="center" 
     alignItems="center" 
     flexWrap="wrap" 
     height="20vh"
     mx={gap} 
     bgcolor={brown[700]}
     overflow="hidden"
    >
      {caches.map(cache => 
        <Box 
          display="flex" 
          flexDirection="row" 
          justifyContent="center" 
          alignItems="center"
          m={1} 
          fontSize={mediumFontSize} 
          bgcolor={brown[600]}
        >
          <Box display="flex" overflow="auto" justifyContent="flex-start" flexDirection="column" p={2} textAlign="left">
            <div>PID: {cache.pid}</div>
            <div>COUNT: {cache.cacheCount}</div>
            <div>CACHE HIT: {cache.cacheHit}</div>
            <Box textAlign="center" style={{fontSize:smallFontSize}}>MEM</Box>
            <div style={{fontSize:bigFontSize}}>{cache.mem}</div>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default React.memo(Cache);