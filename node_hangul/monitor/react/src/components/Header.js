import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';
import Chip from '@material-ui/core/Chip';
// import ResizePanel from 'react-resize-panel';

export default function Header({gap, text, insert=0, update=0, deleteCount=0}) {
    return (
      // <ResizePanel direction="s">
        <Box display="flex">
          <Box display="flex" width="1" alignItems="center" justifyContent="center" mx={gap} mt={gap} height="7vh" fontSize="h3.fontSize" bgcolor={brown[900]}>
            {text}
          </Box>
        </Box>
    )
}
 