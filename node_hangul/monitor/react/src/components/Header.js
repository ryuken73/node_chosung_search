import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';
import Chip from '@material-ui/core/Chip';

export default function Header({gap, text, insert=0, update=0, deleteCount=0}) {
    return (
      <Box display="flex">
        <Box display="flex" width="1" alignItems="center" justifyContent="center" mx={gap} mt={gap} height="10vh" fontSize="h3.fontSize" bgcolor={brown[900]}>
          <Box width="1" textAlign="center" mx="auto" >
            {text}
          </Box>
          <Box bgcolor={brown[700]} display="flex" width="10%" justifyContent="center" flexDirection="column" ml="auto" minWidth="100px" mr="10px">
            <Box mt="4px" ml="10px" color="white" fontSize="caption.fontSize">Insert : {insert}</Box>
            <Box mt="4px" ml="10px" color="white" fontSize="caption.fontSize">Update : {update}</Box>
            <Box my="4px" ml="10px" color="white" fontSize="caption.fontSize">Delete : {deleteCount}</Box>
          </Box>
        </Box>
      </Box>
    )
}
 