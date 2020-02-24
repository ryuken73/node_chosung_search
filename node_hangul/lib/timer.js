class Timer {
	constructor(digits){
		this.startTime = null;
		this.endTime = null;
        this.runnig = null;
        this.digits = digits;
	}
	start() {
		if(this.running) {
				console.log('timer already started');
				return false;
		}
		const time = new Date();
		this.startTime = time.getTime();
		this.running = true;
	}
	getDuration() {
		return ((this.endTime - this.startTime ) / 1000).toFixed(this.digits);
	}
	end() {
		if(!this.running) {
			console.log('start timer first!');
			return false;
		}
		const time = new Date();
		this.endTime = time.getTime();
		this.running = false;
		return this.getDuration();
	}
}

const create = (digits) => {
    return new Timer(digits);
}

module.exports = {
    create
}