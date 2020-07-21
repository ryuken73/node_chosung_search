// const StreamArray = require('stream-json/streamers/StreamArray');
// const fs = require('fs');

// const pipeline = fs.createReadStream('input.json')
//   .pipe(StreamArray.withParser());

// pipeline.on('data', data => console.log(data));

const fs = require('fs');
const StreamValues = require('stream-json/streamers/StreamValues');
const StreamObject = require('stream-json/streamers/StreamObject');
const StreamArray = require('stream-json/streamers/StreamArray');
const {Readable} = require('stream');

// const srcFile = './input.json';
// const rStream = fs.createReadStream(srcFile);
// const wStream = rStream.pipe(StreamArray.withParser());

// wStream.on('data', data => {
//     console.log(data.value)
//     console.log(data.value.a)
// });


const songArray = [
    {a:100, b:200},
    {c:300, d:400}
]

const arrayToReadStream = (array) => {
    return new Readable({
        read(size){
            this.push(JSON.stringify(array.shift()));
            if(array.length === 0){
                this.push(null);
            }
        }
    })
}

const rStream = arrayToReadStream(songArray);
// rStream.pipe(process.stdout);
rStream.on('data', data => console.log(data.toString()));