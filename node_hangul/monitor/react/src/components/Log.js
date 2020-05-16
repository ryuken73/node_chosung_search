import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';
import Tooltip from '@material-ui/core/Tooltip';

function Log({gap, currentLog}) {
  console.log('rerendering Log');
  const logStyle = {display:'flex', flexGrow:0, flexShrink:0, flexBasis:"130px", overflow:'hidden'};
  const ConditionalTooltip = ({keyword, children}) => {
    if(keyword.length > 50){
      return <Tooltip title={keyword}>{children}</Tooltip>
    } else {
      return <div>{children}</div>
    }
  }
  const defaultStyle = {flexGrow:1, flexShrink:5, margin:'3px', minWidth:'120px', flexBasis:'120px'};
  return (
    <Box display="flex" flexDirection="row" justifyContent="flex-start" alignItems="stretch" flexGrow={3} mx={gap} overflow="auto" textOverflow="ellipsis" fontSize="12px" bgcolor={brown[700]}>
      <Box style={{...defaultStyle, minWidth:'120px'}}>
        {currentLog.map(log => <Box>{log.eventTime}</Box>)}
      </Box>
      <Box style={{...defaultStyle, flexBasis:'80', minWidth:'60px'}}>
        {currentLog.map(log => <Box>{log.userId}</Box>)}
      </Box>
      <Box style={{...defaultStyle, flexBasis:'80', minWidth:'60px'}}>
        {currentLog.map(log => <Box>{log.ip.replace('::ffff:','')}</Box>)}
      </Box>
      <Box style={{...defaultStyle, flexBasis:'80', minWidth:'60px'}}>
        {currentLog.map(log => <Box>{log.elapsed}초</Box>)}
      </Box>
      <Box style={{...defaultStyle, flexBasis:'80', minWidth:'60px'}}>
        {currentLog.map(log => <Box>{log.resultCount}건</Box>)}
      </Box>
      <Box style={{...defaultStyle, flexGrow:5, flexShrink:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'}}>
        {currentLog.map(log => <Box style={{}} >{log.keyword}</Box>)}
      </Box>
      {/* {currentLog.map(log => (
        <div style={{display:"flex", marginLeft:"10px", marginTop:'3px', flexDirection:"row", justifyContent:"flex-start", height:"1.2em", color: log.cacheHit && 'cyan'}}>
          <div style={{minWidth:'120px',...logStyle}}>{log.eventTime}</div>
          <div style={{minWidth:'60px',...logStyle}}>{log.userId}</div>
          <div style={{minWidth:'80px',...logStyle}}>{log.ip}</div>
          <div style={{minWidth:'60px',...logStyle}}>{log.elapsed}초</div>
          <div style={{minWidth:'60px',...logStyle} }>{log.resultCount}건</div>
          <ConditionalTooltip keyword={log.keyword}>
            <div style={{display:'flex', flexShrink:0, flexBasis:"auto", minWidth:'200px', maxWidth:'300px', overflow:'hidden', textOverflow:'ellipsis'}}>{log.keyword}</div>
          </ConditionalTooltip>

        </div>
      ))} */}
    </Box>
  )
}

export default React.memo(Log);