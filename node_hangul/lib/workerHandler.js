const initialize = ({searchEvent, clearEvent, masterMonitor}) => {
    const handlers = {
        'notify-start' : {
            'TIME_OUT' : function(){},
            'ALL_DONE' : function(message){
                const {messageKey} = message;
                // global.workerMessages.delete(messageKey);
                global.logger.info('all worker started!');
            }    
        },
        'reply-index' : {
            'TIME_OUT' : function(){},
            'ALL_DONE' : function(message){
                const {messageKey, lineLength} = message;
                // global.workerMessages.delete(messageKey);
                // indexProgress.update(lineLength);
                global.logger.debug('indexing one line done!');
            }    
        },
        'reply-search' : {
            'TIME_OUT' : function(message){
                const {messageKey} = message;
                let currentSearching = masterMonitor.getStatus()['searching'];
                masterMonitor.setStatus('searching', currentSearching-1);
                searchEvent.emit(`fail_${messageKey}`);
            },
            'ALL_DONE' : function(message, resultsGathered ){
                // all search results are replied!
                // 0. if ordering needed, execute ordering
                // 1. concat all result into one array
                // 2. emit sucess_messageKey 
                // 3. delete message in the temporay Map
                const {messageKey, subType} = message;
                // const results = global.workerMessages.get(messageKey);
                let resultsFlattened = resultsGathered.flat();
                global.logger.debug(`[${messageKey}][${subType.key}] all result replied : ${resultsFlattened.length}`);          
                searchEvent.emit(`success_${messageKey}`, resultsFlattened);
                // global.workerMessages.delete(messageKey);
            }    
        },
        'reply-clear' : {
            'TIME_OUT' : function(message){
                // timed out or disappered by unknown action
                const {clientId, messageKey} = message;
                global.logger.error(`[${messageKey}][${clientId}] clear reply timed out!`)
                clearEvent.emit(`fail_${messageKey}`);
                return
            },
            'ALL_DONE' : function(message){
                const {messageKey} = message;
                global.logger.info(`clearing all worker's data done!`);
                masterMonitor.setStatus('lastIndexedDate', '');
                masterMonitor.setStatus('lastIndexedCount', 0);
                masterMonitor.setStatus('indexingStatus', 'NOT_INDEXED')
                clearEvent.emit(`success_${messageKey}`);
                return
            }     
        },       
    }

    return handlers;
}
     
module.exports = {
    initialize
}