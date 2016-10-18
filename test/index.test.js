var should = require('chai').should();
var rest = require('../index');

describe('sample test', function() {
  it('gets it', function() {
    const value = 1234;
    rest.get(value).should.equal(value * 2);
  });
});

describe('chained permissions 1', function() {
  var scope = {
    aaa: 'bbb'
  };
  it('do 1 2 3', function() {
    return rest.do1(scope)
      .then(rest.do2)
      .then(function(scope) {
        console.log(scope);
      });
  });
});

function createUser(name) {
  return function(scope) {
    return new Promise(function(resolve, reject) {
      console.log('creatUser');
      if (scope.users === undefined) scope.users = {};
      scope.users[name] = {address:1234};
      resolve(scope);
    });
  }
}

function sendTx(fromUser, toUser, amount) {
  return function(scope) {
    return new Promise(function(resolve, reject) {
      console.log('sendTx');
      if (scope.tx === undefined) scope.tx = [];
      scope.tx.push({from:fromUser, to:toUser, amount:amount});
      resolve(scope);
    });
  }
}

describe('chained permissions 2', function() {
  var scope = {
    aaa: 'bbb'
  };
  it('should create user', function() {
    return rest.do1(scope)
      .then(createUser('Alice'))
      .then(createUser('Bob'))
      .then(sendTx('Alice', 'Bob', 3.14))
      .then(function(scope) {
        console.log(scope);
      });
  });
});
