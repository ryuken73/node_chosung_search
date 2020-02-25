import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

export default function Header({gap, text}) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" mx={gap} mt={gap} height="10vh" fontSize="h3.fontSize" bgcolor={brown[900]}>
        {text}
      </Box>
    )
}
