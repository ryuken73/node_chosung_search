import React, {Component} from 'react';
import Box from '@material-ui/core/Box';
import socketIOClient from 'socket.io-client';
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Constants from './config/Constants';
import './App.css';

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

  render() {
    const {workers, master, currentLog} = this.state;
    return (
      <div className="App">
        <Header text={"Status"}></Header>
        <Box height="90vh" display="flex" alignItems="stretch" flexDirection="row">
          <LeftPanel workers={workers}></LeftPanel>
          <RightPanel master={master} currentLog={currentLog}></RightPanel>
        </Box>
      </div>
    )
  }
}