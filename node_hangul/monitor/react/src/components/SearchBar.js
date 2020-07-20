import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete'; 
import Chip from '@material-ui/core/Chip';
// import ResizePanel from 'react-resize-panel';

export default function SearchBar({gap, text, insert=0, update=0, deleteCount=0}) {
    return (
        <Box display="flex"  alignItems="center" justifyContent="start" mx={gap} mt={gap} height="3vh" fontSize="h3.fontSize" bgcolor={brown[800]}>
          <Autocomplete
            size="small"
            options={[
              {artistName:'아이유', songName:'아이유'},
              {artistName:'비', songName:'깡'}
            ]}
            renderInput={(params) => <TextField {...params} variant="outlined"></TextField>}
          >
            
          </Autocomplete>
            <Box my="4px" ml="auto" color="white" fontSize="caption.fontSize">Insert : {insert}</Box>
            <Box my="4px" ml="10px" color="white" fontSize="caption.fontSize">Update : {update}</Box>
            <Box my="4px" ml="10px" mr="10px" color="white" fontSize="caption.fontSize">Delete : {deleteCount}</Box>          
        </Box>
    )
}
 