import React from 'react';
import Box from '@material-ui/core/Box';
import {teal} from '@material-ui/core/colors';
import {brown} from '@material-ui/core/colors';
import {makeStyles} from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
  },
  gridList: {
    width: '100%',  
    height: '100%',
  },
  icon: {
    color: 'rgba(255, 255, 255, 0.54)',
  },
}));

export default function RightPanel({master, currentLog}) {
  // console.log('render master')
  const classes = useStyles();
  const lastIndexedCount = master.lastIndexedCount ? master.lastIndexedCount : 0;
  const {searching = 0} = master
  return (
    <Box  display="flex" flexDirection="column" justifyContent="flex-start" alignItems="center" flexGrow={1} flexBasis={0} bgcolor={teal[900]}>
        <Box component="div">master</Box>
        <Box display="flex" width="95%" alignItems="center" justifyContent="space-around" flexDirection="row" height="20vh" m={1} fontSize="fontSize" bgcolor={teal[800]}>
          <Box display="flex" justifyContent="flex-start" flexDirection="column" textAlign="left">
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
        <Box component="div" overflow="auto" textOverflow="ellipsis" width="95%" height="50vh"  fontSize="fontSize" bgcolor={teal[800]}>

          {currentLog.map(log => (
            <div style={{display:"flex", flexDirection:"row", justifyContent:"flex-start", height:"1.2em"}}>
              <div style={{display:'flex', flexGrow:0, flexShrink:2, flexBasis:"130px", overflow:'hidden'}}>{log.eventTime}</div>
              <div style={{display:'flex', flexGrow:0, flexShrink:1, flexBasis:"80px", overflow:'hidden'}}>{log.userId}</div>
              <div style={{display:'flex', flexGrow:0, flexShrink:2, flexBasis:"130px", overflow:'hidden'}}>{log.ip}</div>
              <div style={{display:'flex', flexGrow:0, flexShrink:0, flexBasis:"60px", overflow:'hidden'}}>{log.elapsed}초</div>
              <div style={{display:'flex', flexGrow:0, flexShrink:0, flexBasis:"70px", overflow:'hidden'}}>{log.resultCount}건</div>
              <div style={{display:'flex', flexShrink:0, flexBasis:"170px", overflow:'hidden'}}>{log.keyword}</div>

            </div>
          ))}

        </Box>
    </Box>
  )
}
