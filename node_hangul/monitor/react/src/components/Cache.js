import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

export default function Cache({caches}) {
  const smallFontSize = `${12 - (caches.length/3)}px`;
  const mediumFontSize = `${15 - (caches.length/3)}px`;
  const bigFontSize = `${25 - (caches.length/3)}px`;

  return (
    <Box display="flex" flexDirection={'row'} justifyContent="center" alignItems="flext-start" flexWrap="wrap" mx={0.5} mb={0.5} bgcolor={brown[700]}>
      {caches.map(cache => 
        <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center" 
            //  width={workers.length < 10 ? '30%':'20%'} 
              m={1} fontSize={mediumFontSize} bgcolor={brown[600]}>
          <Box display="flex" overflow="auto" justifyContent="flex-start" flexDirection="column" p={2} textAlign="left">
            <div>PID: {cache.pid}</div>
            <div>COUNT: {cache.cacheCount}</div>
            <div>CACHE HIT: {cache.cacheHit}</div>
            <p></p>
            <Box textAlign="center" style={{fontSize:smallFontSize}}>MEM</Box>
            <div style={{fontSize:bigFontSize}}>{cache.mem}</div>
          </Box>
        </Box>
      )}
    </Box>
  )
}
