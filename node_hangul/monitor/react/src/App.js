import React, {Component} from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import socketIOClient from 'socket.io-client';
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Constants from './config/Constants';
import {brown} from '@material-ui/core/colors';
import {withStyles} from '@material-ui/core/styles';
import axiosRequest from './lib/axiosRequest';
import './App.css';


const BrownButton = withStyles({
  root: {
    backgroundColor: brown[800],
    '&:hover': {
      backgroundColor: brown[500],
    },
    '&:active': {
      backgroundColor: brown[300]
    },
  }
})(Button)

export default class App extends Component {
  constructor() {
    super();
    this.state = {
      master : {},
      workers : [],
      currentLog : []
    }
  }  
  
  componentDidMount(){
    // connect socket server
    const {endpoint} = Constants.SOCKET_NAMESPACE;
    const socket = socketIOClient(endpoint);
    socket.on('connect', () => {
      console.log('socket connected');
    })
    socket.on('masterMonitor', this.updateMasterMonitor.bind(this));
    socket.on('workerMonitor', this.updateWorkerMonitor.bind(this));
    socket.on('logMonitor', this.updateLogMonitor.bind(this));
    socket.on('error', this.resetState.bind(this));
    socket.on('disconnect', this.resetState.bind(this));
    socket.on('connect_error', this.resetState.bind(this));
  }

  updateMasterMonitor(masterMonitor){
    // console.log('update master:',masterMonitor)
    this.setState({
      ...this.state,
      master: masterMonitor
    })
  }

  updateWorkerMonitor(workerMonitor){
    //console.log('update workers:',workerMonitor)
    this.setState({
      ...this.state,
      workers: workerMonitor
    })
  }

  updateLogMonitor(logMonitor){
    console.log('update log:',logMonitor)
    this.setState({
      ...this.state,
      currentLog: logMonitor
    })
  }

  resetState(){
    this.setState({
      master : {},
      workers : [],
      currentLog : []
    })
  }

  async onClickLoad(){
    const result = await axiosRequest.get('load');
    console.log(result);
  }

  async onClickClear(){
    const result = await axiosRequest.get('clear');
    console.log(result);
  }

  render() {
    const {workers, master, currentLog} = this.state;
    return (
      <div className="App">
        <Header text={"Status"}></Header>
        <Box height="80vh" display="flex" alignItems="stretch" flexDirection="row">
          <LeftPanel workers={workers}></LeftPanel>
          <RightPanel master={master} currentLog={currentLog}></RightPanel>
        </Box>
        <Box height="10vh" display="flex" justifyContent="space-around" flexDirection="row" alignItems="center" bgcolor={brown[900]}>
          <BrownButton onClick={this.onClickLoad} variant="contained" color="primary" size="medium">load</BrownButton> 
          <BrownButton onClick={this.onClickClear} variant="contained" color="primary" size="medium">clear</BrownButton>
        </Box>
      </div>
    )
  }
} 