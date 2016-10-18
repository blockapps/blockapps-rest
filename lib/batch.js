var Promise = require('bluebird');

function processBursts(bursts) {
  console.log(bursts);
  bursts.forEach(function(burst) {
    processBurst(burst);
  });
}

function processBurst(burst) {
  return Promise.each(burst, function(item) {
    return processItem(item).then(processResult);
  }).then(processDone);
}

function processItem(item) {
  return new Promise(function(resolve, reject) {
    console.log('process item', item);
    setTimeout(function() {
      var result = 'result for ' + item;
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


// break the array to bursts
function processArray(array) {
  const burstSize = 4; // the maximum requests that can be server at one time
  const bursts = [];

  for (var i = 0; i < burstSize; i++) {
    bursts.push([]);
  }

  array.forEach(function(item, index) {
    var burstId = index % burstSize;
    bursts[burstId].push(item);
  });

  processBursts(bursts);
}

processArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
