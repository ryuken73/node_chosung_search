import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import LocationOnIcon from '@material-ui/icons/LocationOn';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import Constants from '../config/Constants';
import axios from 'axios';

// function loadScript(src, position, id) {
//   if (!position) {
//     return;
//   }

//   const script = document.createElement('script');
//   script.setAttribute('async', '');
//   script.setAttribute('id', id);
//   script.src = src;
//   position.appendChild(script);
// }

const autocompleteService = {};

const useStyles = makeStyles((theme) => ({
  icon: {
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(2),
  },
}));

export default function GoogleMaps() {
  const classes = useStyles();
  const [value, setValue] = React.useState(null);
  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState([]);
  const loaded = React.useRef(false);

  const fetch = React.useMemo(
    () =>
      debounce((request, callback) => {
        autocompleteService.searchAddress(request, callback);
      }, 200),
    [],
  );

  React.useEffect(() => {
    let active = true;

    autocompleteService.searchAddress = (request, callback) => {
        console.log(request)
        axios.get(`${Constants.urls.search}/${encodeURIComponent(request.input)}?maxReturnCount=10`)
        .then(results => {
            const {count, result} = results.data;
            callback(result);
        })
    }

    if (inputValue === '') {
      setOptions(value ? [value] : []);
      return undefined;
    }

    fetch({ input: inputValue }, (results) => {
      if (active) {
        let newOptions = [];
        if (value) {
          newOptions = [value];
        }
        if (results) {
          newOptions = [...newOptions, ...results];
        }
        setOptions(newOptions);
      }
    });

    return () => {
      active = false;
    };
  }, [value, inputValue, fetch]);

  return (
    <Autocomplete
      id="material ui autocomplete"
      size="small"
      style={{ width:300, height:'4vh' }}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.description)}
      filterOptions={(x) => x}
      options={options}
      autoComplete
      includeInputInList
      filterSelectedOptions
      value={value}
      onChange={(event, newValue) => {
        setOptions(newValue ? [newValue, ...options] : options);
        setValue(newValue);
      }}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      renderInput={(params) => (
        <TextField {...params} label="주소" variant="outlined" fullWidth />
      )}
    //   renderOption={(option) => {
    //     // const matches = option.structured_formatting.main_text_matched_substrings;
    //     // const parts = parse(
    //     //   option.structured_formatting.main_text,
    //     //   matches.map((match) => [match.offset, match.offset + match.length]),
    //     // );
    //     const parts = parse(
    //         option,
    //         match(option,value)
    //     )

    //     return (
    //       <Grid container alignItems="center">
    //         <Grid item>
    //           <LocationOnIcon className={classes.icon} />
    //         </Grid>
    //         <Grid item xs>
    //           {parts.map((part, index) => (
    //             <span key={index} style={{ fontSize:"12px", fontWeight: part.highlight ? 700 : 400 }}>
    //               {part.text}
    //             </span>
    //           ))}

    //           {/* <Typography variant="body2" color="textSecondary">
    //             {option.structured_formatting.secondary_text}
    //           </Typography> */}
    //         </Grid>
    //       </Grid>
    //     );
    //   }}
    />
  );
}
