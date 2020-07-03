module.exports = mkLogger;

function mkLogger(opts){
    const tracer = require('tracer');
    const nodemailer = require('nodemailer');
    const fs = require('fs');

    const {smtpOptions={}} = opts.notification;
    const {logLevel} = opts;
    const {logFile} = opts;

    const mailer = nodemailer.createTransport(smtpOptions);
    const mailNotification = function(level, tracerData){	
        if(tracerData.title === level){
            const {sender, receiver, subjectHeader} = opts.notification;
            const subject = `${subjectHeader} : tracerData.message`;
            const body = tracerData.output;
            const mailOPtions = {
                    from : sender,
                    to : receiver,
                    subject : subject,
                    text : body
            };
            mailer.sendMail(mailOPtions,function(err,result){
                if(err){
                    return console.log(err);
                } 
                console.log('Mail Sent Successfully');
            });
        }
    };
 
    const consoleOpts =  {
        format : "{{timestamp}} [{{title}}] {{message}} (in {{file}}:{{line}})",	
        dateformat: 'yyyy-mm-dd HH:MM:ss.l',
        level:logLevel,
        stackIndex : 0,
        transport : [
            function(data){
                fs.appendFile(logFile, data.output + '\n', function(err){
                    if(err) {
                        throw err;
                    }
                });
            },
            function(data){
                console.log(data.output);
            }    
        ]
    }

    if(opts.notification.useSMTP) {
        consoleOpts.transport.push((data) => {
            mailNotification('error', data);
        })
    }

    const logTracer = tracer.console(consoleOpts); 
    return logTracer
}