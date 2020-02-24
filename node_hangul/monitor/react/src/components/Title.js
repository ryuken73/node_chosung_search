import React from 'react';
import Box from '@material-ui/core/Box';
import {brown} from '@material-ui/core/colors';

export default function Title({title}) {
    return (
        <Box textAlign={'center'} bgcolor={brown[700]} m={0.5}>{title}</Box>
    )
}
