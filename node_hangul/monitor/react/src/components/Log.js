import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';
import Tooltip from '@material-ui/core/Tooltip';

function Log({gap, currentLog}) {
  console.log('rerendering Log : ', currentLog);
  // const logStyle = {display:'flex', flexGrow:0, flexShrink:0, flexBasis:"130px", overflow:'hidden'};
  const ConditionalTooltip = props => {
    const {keyword, children} = props;
    if(keyword.length > 20){
      return <Tooltip title={keyword}>{children}</Tooltip>
    } else {
      return <div>{children}</div>
    }
  }
  const ColorBox = props => {
    const {cacheHit, type, children} = props;
    const logColor = (type === 'selected' && 'darkseagreen') || (cacheHit && 'cyan');
    const fontWeight = type === 'selected' && 500;
    return <div style={{color:logColor, fontWeight}}>{children}</div>
  }
  const defaultStyle = {flexGrow:1, flexShrink:5, margin:'3px', minWidth:'120px', flexBasis:'120px'};
  return (
    <Box display="flex" flexDirection="row" justifyContent="flex-start" alignItems="stretch" flexGrow={3} mt={gap} mx={gap} overflow="auto" textOverflow="ellipsis" fontSize="12px" bgcolor={brown[700]} style={{"overflowX":"hidden"}}>
      <Box style={{...defaultStyle, minWidth:'120px'}}>
        {currentLog.map(log => <ColorBox cacheHit={log.cacheHit} type={log.type}>{log.eventTime}</ColorBox>)}
      </Box>
      <Box style={{...defaultStyle, flexBasis:'80', minWidth:'60px'}}>
        {currentLog.map(log => <ColorBox cacheHit={log.cacheHit} type={log.type}>{log.userId}</ColorBox>)}
      </Box>
      <Box style={{...defaultStyle, flexBasis:'80', minWidth:'60px'}}>
        {currentLog.map(log => <ColorBox cacheHit={log.cacheHit} type={log.type}>{log.ip.replace('::ffff:','')}</ColorBox>)}
      </Box>
      <Box style={{...defaultStyle, flexBasis:'80', minWidth:'60px'}}>
        {currentLog.map(log => <ColorBox cacheHit={log.cacheHit} type={log.type}>{log.elapsed}초</ColorBox>)}
      </Box>
      <Box style={{...defaultStyle, flexBasis:'80', minWidth:'60px'}}>
        {currentLog.map(log => <ColorBox cacheHit={log.cacheHit} type={log.type}>{log.resultCount}건</ColorBox>)}
      </Box>
      <Box style={{...defaultStyle, flexGrow:5, flexShrink:1, whiteSpace:'nowrap', textOverflow:'ellipsis'}}>
        {currentLog.map(log => 
          (
          <ConditionalTooltip keyword={log.keyword}>
            {/* <div style={{"color": log.cacheHit && "cyan"}}>{log.keyword}</div> */}
            <ColorBox cacheHit={log.cacheHit} type={log.type}>{log.keyword}</ColorBox>
          </ConditionalTooltip>
          )
        )}
      </Box>
    </Box>
  )
}

export default React.memo(Log);