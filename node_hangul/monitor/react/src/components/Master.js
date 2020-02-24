import React from 'react';
import Box from '@material-ui/core/Box';
import {teal} from '@material-ui/core/colors';
import {brown} from '@material-ui/core/colors';
import {makeStyles} from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';

const useStyles = makeStyles(theme => ({
  icon: {
    color: 'rgba(255, 255, 255, 0.54)',
  },
}));

export default function Master({master, currentLog}) {
  // console.log('render master')
  const classes = useStyles();
  const lastIndexedCount = master.lastIndexedCount ? master.lastIndexedCount : 0;
  const {searching = 0} = master;
  const logStyle = {display:'flex', flexGrow:0, flexShrink:1, flexBasis:"130px", overflow:'hidden'};
  return (
    <Box  display="flex" flexDirection="column" justifyContent="flex-start" alignItems="center" flexGrow={1} ml={1} flexBasis={0} bgcolor={brown[800]}>
        <Box component="div">master</Box>
        <Box display="flex" width="100%" alignItems="center" justifyContent="space-around" flexDirection="row" height="20vh" m={1}  fontSize="fontSize" bgcolor={brown[700]}>
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
        <Box component="div" overflow="auto" textOverflow="ellipsis" width="95%" height="50vh" fontSize="12px" bgcolor={brown[700]}>
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
    </Box>
  )
}
