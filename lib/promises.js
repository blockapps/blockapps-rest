var Promise = require('bluebird');

function processArray(array){
    return Promise.each(array, function(item){
        return processItem(item).then(processResult);
    }).then(processDone);
}

function processItem(item){
  return new Promise(function(resolve, reject){
    console.log('process item', item);
    setTimeout(function(){
      var result = '!@#' + item;
      resolve(result);
    }, 1000);
  });
}

function processResult(result) {
  console.log('result', result);
}

function processDone(inputArray) {
  console.log('processDone', inputArray);
}

processArray([1,2,3]);
