import React, {Component} from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import socketIOClient from 'socket.io-client';
import Header from './components/Header';
import Title from './components/Title';
import Master from './components/Master';
import Log from './components/Log';
import Worker from './components/Worker';
import Cache from './components/Cache';
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
      cacheWorkers : [],
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
    socket.on('cacheWorkerMonitor', this.updateCacheWorkerMonitor.bind(this));
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
    console.log('update workers:',workerMonitor)
    this.setState({
      ...this.state,
      workers: workerMonitor
    })
  }

  updateCacheWorkerMonitor(cacheWorkerMonitor){
    this.setState({
      ...this.state,
      cacheWorkers: cacheWorkerMonitor
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
    const {workers, master, currentLog, cacheWorkers} = this.state;
    const gap = 0.3;
    return (
      <Box display="flex" flexDirection="column" height="100vh" className="App">
        <Header gap={gap} text={"Status"}></Header>
        <Box display="flex" flexDirection="row" justifyContent="center" alignItems="stretch" height="80vh">
          <Box display="flex" flexDirection="column" justifyContent="flex-start" alignItems="stretch" flexGrow="1" width="45vw"> 
            <Title gap={gap} title={'master'}></Title>
            <Master gap={gap} master={master}></Master>
            <Log gap={gap} currentLog={currentLog}></Log>
          </Box>
          <Box display="flex" flexDirection="column" justifyContent="flex-start" alignItems="stretch" flexGrow="1"  width='45vw'> 
            <Title gap={gap} title={'cache'}></Title>
            <Cache gap={gap} caches={cacheWorkers}></Cache>            
            <Title gap={gap} title={'worker'}></Title>
            <Worker gap={gap} workers={workers}></Worker>
          </Box>
        </Box>
        <Box display="flex" flexDirection="row" justifyContent="space-around" alignItems="center" flexGrow="1" mx={gap} mb={gap} bgcolor={brown[900]}>
            <BrownButton onClick={this.onClickLoad} variant="contained" color="primary"  size="medium">load</BrownButton> 
            <BrownButton onClick={this.onClickClear} variant="contained" color="primary"  size="medium">clear</BrownButton>
          </Box>
      </Box>
    )
  }
} 