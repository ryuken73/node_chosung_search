class IBMDB {
    constructor(db2options, customLogger){
        try {
            // * db2options object
            //   "DRIVER":"{DB2}", 
            //   "DABASE":"", 
            //   "UID":"",
            //   "PWD":"",
            //   "HOSTNAME":"",
            //   "PORT":,
            //   "PROTOCOL" : "TCPIP"
            this.logger = customLogger || console;
            this.logger.info(db2options)

            // ibm_db pool
            const Pool = require('ibm_db').Pool;
            this.db2pool = new Pool();
            this.db2cn = '';
            Object.keys(db2options).forEach((key) => {
                this.db2cn +=  key + '=' + db2options[key] + ';' ;
            });
        } catch(err) {
            this.logger.error(err);
        }
    }

    _getConnection() {
        return new Promise((resolve,reject) => {
            try {
                this.db2pool.open(this.db2cn, (err,conn) => {
                    err ? reject(err) : resolve(conn)
                })
            } catch(err) {
                reject(err)
            }
        })
    }

    query(sql, params) {
        return new Promise( async (resolve,reject) => {
            try {
                const conn = await this._getConnection();
                // this.logger.trace(`query excution start! ${sql} : ${params}`)
                conn.query(sql, params, (err, results, sqlca) => {
                    if(err){
                        reject(err);
                    } else {
                        // this.logger.trace(`query excution ok! ${sql} : ${params}`)
                        // this.logger.trace(sqlca)
                        //this.logger.debug(results);
                        resolve(results);
                        conn.close();
                    }        
                })
            } catch (err) {                
                reject(err);
                conn.close(); 
            }
        })
    }
    // return affected row count for non query (insert, update, delete)
    // useful when you need affected row count
    execute(sql, params) {
        return new Promise( async (resolve,reject) => {
            try {
                const conn = await this._getConnection();
                // this.logger.debug(`query excution start! ${sql} : ${params}`)
                conn.prepare(sql, (err,stmt) => {
                    if(err){
                        reject(err);
                    } else {
                        stmt.executeNonQuery(params, (err,ret) => {
                            if(err) {
                                reject(err);
                            } else {
                                resolve(ret);
                                conn.close();
                            }
                        })
                    }
                })
            } catch (err) {
                reject(err);
                conn.close();
            }
        })
    }
    // return readable stream for large results set
    // useful when handling large result set
    async queryStream(sql, params) {
        try {
            const conn = await this._getConnection();
            this.logger.info(`query stream start! ${sql} : ${params}`)
            const stream = conn.queryStream(sql, params);
            let processed = 0;

            console.time('stream query execute time');
            stream.on('data', () => processed++)
            stream.on('error', err =>(console.log(err), conn.close()));
            stream.on('end', () => {
                this.logger.info(`all data return! ${processed}`);
                console.timeEnd('stream query execute time');
                conn.close();
            })
            return stream;
        } catch (err){
            conn.close();
            return false
        }
    }
}

const connectDB = (db2options, customLogger) => {
    const db = new IBMDB(db2options, customLogger);
    return {
        query : db.query.bind(db),
        execute : db.execute.bind(db),
        queryStream : db.queryStream.bind(db),
    }
}


module.exports = {connectDB};