const fs = require('fs');
const {Readable} = require('stream');
const zlib = require('zlib');

const INFILE = `D:/002.Code/002.node/node_chosung_search/node_hangul/dump/dump__12376_1595319952203.json`;
const OUTFILE = `D:/002.Code/002.node/node_chosung_search/node_hangul/dump/dump__12376_1595319952203_out.json`;


const arrayToStream = (array, fields) => {
    return new Readable({
        objectMode: true,
        highWaterMark: 1024,
        read(size){
            const songObj = array.shift();
            const mappingFields = fields.map(field => songObj[field]);
            this.push(JSON.stringify(mappingFields));
            if(array.length === 0) this.push(null);
        }
    })
}


async function main(){
    setInterval(() => {
        console.log(`alive : ${Date.now()}`);
    },1000)
    const buff = await fs.promises.readFile(INFILE);
    const songArray = JSON.parse(buff);

    console.log(`load file into memory done : ${songArray.length}`);
    const start = process.hrtime();
    const fields = ['_artistName','_songName','_key','_open_dt','_status'];
    const rStream = arrayToStream(songArray, fields);

    const wStream = fs.createWriteStream(OUTFILE, {highWaterMark: 64*1024});

    // below task 66 seconds, but responsive
    let count=0;
    rStream
    .on('data', () => {
        if(count % 1000 === 0) console.log(count);
        count++;
    })
    .pipe(zlib.createGzip())
    .pipe(wStream)

    wStream.on('finish', () => {
        // it takes 64 seconds
        console.log(process.hrtime(start));
    })

}

main()

