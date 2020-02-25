import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';
import Tooltip from '@material-ui/core/Tooltip';

export default function Log({gap, currentLog}) {
  const logStyle = {display:'flex', flexGrow:0, flexShrink:1, flexBasis:"130px", overflow:'hidden'};
  return (
    <Box display="flex" flexDirection="column" justifyContent="flex-start" alignItems="stretch" flexGrow={3} mx={gap} mb={gap} overflow="auto" textOverflow="ellipsis" fontSize="12px" bgcolor={brown[700]}>
      {currentLog.map(log => (
        <div style={{display:"flex", marginLeft:"10px", marginTop:'3px', flexDirection:"row", justifyContent:"flex-start", height:"1.2em", color: log.cacheHit && 'cyan'}}>
          <div style={logStyle}>{log.eventTime}</div>
          <div style={logStyle}>{log.userId}</div>
          <div style={logStyle}>{log.ip}</div>
          <div style={logStyle}>{log.elapsed}초</div>
          <div style={logStyle }>{log.resultCount}건</div>
          <Tooltip title={log.keyword}>
            <div style={{display:'flex', flexShrink:0, flexBasis:"auto", width:'300px', overflow:'hidden', textOverflow:'ellipsis'}}>{log.keyword}</div>
          </Tooltip>
        </div>
      ))}
    </Box>
  )
}
