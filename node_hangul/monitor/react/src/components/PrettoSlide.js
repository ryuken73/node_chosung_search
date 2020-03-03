import React from 'react';
import {withStyles} from '@material-ui/styles';
import Slider from '@material-ui/core/Slider';

const PrettoSlider = withStyles({
    root: {
      color: '#52af77',
      height: '5px',
      padding : 0,

    },
    // thumb: {
    //   height: 10,
    //   width: 10,
    //   backgroundColor: '#fff',
    //   border: '2px solid currentColor',
    //   marginTop: -8,
    //   marginLeft: -12,
    //   '&:focus,&:hover,&$active': {
    //     boxShadow: 'inherit',
    //   },
    // },
    thumb : {
      display: 'none'
    },
    active: {},
    valueLabel: {
      left: 'calc(-50% + 4px)',
    },
    track: {
      height: 5,
      borderRadius: 0,
    },
    rail: {
      height: 5,
      borderRadius: 0,
    },
  })(Slider);

const CustomizedSlider = ({value, onChange}) => {
    return (
        <PrettoSlider value={value} onChange={onChange} valueLabelDisplay="auto"></PrettoSlider>
    )
}

export default CustomizedSlider;