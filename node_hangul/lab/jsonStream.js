// const StreamArray = require('stream-json/streamers/StreamArray');
// const fs = require('fs');

// const pipeline = fs.createReadStream('input.json')
//   .pipe(StreamArray.withParser());

// pipeline.on('data', data => console.log(data));

const fs = require('fs');
const StreamValues = require('stream-json/streamers/StreamValues');
const StreamObject = require('stream-json/streamers/StreamObject');
const StreamArray = require('stream-json/streamers/StreamArray');

const srcFile = './input.json';
const rStream = fs.createReadStream(srcFile);
const wStream = rStream.pipe(StreamArray.withParser());

wStream.on('data', data => {
    console.log(data.value)
    console.log(data.value.a)
});

