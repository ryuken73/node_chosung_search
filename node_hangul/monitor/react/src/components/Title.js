import React from 'react';
import Box from '@material-ui/core/Box';
import Constants from '../config/Constants';

export default function Title({gap, title}) {
    return (
        <Box textAlign={'center'} bgcolor={Constants.color[700]} m={gap}>{title}</Box>
    )
}
