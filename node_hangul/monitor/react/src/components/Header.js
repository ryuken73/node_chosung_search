import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';
import { Typography } from '@material-ui/core';

export default function Header({gap, text, insert=0, update=0, deleteCount=0}) {
    return (
      <Box display="flex">
        <Box display="flex" width="1" alignItems="center" justifyContent="center" mx={gap} mt={gap} height="10vh" fontSize="h3.fontSize" bgcolor={brown[900]}>
          <Box width="1" textAlign="center" mx="auto" >
            {text}
          </Box>
          <Box display="flex" width="10%" flexDirection="column" ml="auto" minWidth="100px" mr="10px">
            <Box fontSize="caption.fontSize">I : {insert}</Box>
            <Box fontSize="caption.fontSize">U : {update}</Box>
            <Box fontSize="caption.fontSize">D : {deleteCount}</Box>
          </Box>
        </Box>
      </Box>
    )
}
 