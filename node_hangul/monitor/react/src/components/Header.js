import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

export default function Header({text}) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="10vh" width="100%" fontSize="h3.fontSize" bgcolor={brown[900]}>
        <div>{text}</div>
      </Box>
    )
}
