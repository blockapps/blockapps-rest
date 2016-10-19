const BigNumber = require('bignumber.js');
const util = require('./util');
const importer = require('./importer');
const Promise = require('bluebird');

// create a delay, before a promise. pass in args payload
function DelayPromise(delay, payload) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve(payload);
    }, delay);
  });
}

function api_bloc_state(api, search, address) {
  return api.bloc.state(search.name, address).then(function(state){
    state.address = address;
    return state;
  });
}

function api_bloc_contract(api, config, user, contract, done) {
  return api.bloc.contract({
      password: config.password,
      src: contract.string,
      args: contract.args,
      contract: contract.name,
      txParams: contract.txParams
    }, user.name, user.address)
    .then(function(address) {
      if (util.isAddress(address)) {
        contract.address = address;
        done();
      } else {
        done(new Error('contract upload should produce a valid address ' + address));
      }
    })
    .catch(function(err) {
      if (err.data !== undefined) {
        done(new Error(err.data));
      } else {
        done(err);
      }
    });
}

function api_bloc_import(api, config, user, contract, done){
  return api.bloc.import({
      password: config.password,
      src: JSON.parse(contract.string),
      contract: contract.solName,
      name: contract.name
    }, user.name, user.address)
    .then(function(address) {
      // console.log("contract address is: " + address)
      if (util.isAddress(address)) {
        contract.address = address;
        done();
      } else {
        done(new Error('contract import should produce a valid address ' + JSON.stringify(address)));
      }
    })
    .catch(function(err) {
      console.log("error: ", JSON.stringify(err));
      if (err.data !== undefined) {
        done(new Error(err.data));
      } else {
        done(err);
      }
    });
}

module.exports = function(api, config) {
  return {
    // create user
    createUser: function(user, node) {
      return it('should create user ' + user.name, function(done) {
        api.setNode(node);
        return api.bloc.createUser({
            faucet: '1',
            password: config.password,
          }, user.name)
          .then(function(address) {
            console.log("user address:", JSON.stringify(address));
            if (util.isAddress(address)) {
              user.address = address;
              done();
            } else {
              done(new Error('create user should produce a valid address ' + JSON.stringify(address)));
            }
          }).catch(done);
      });
    },
    // get user's balance as BigNumber
    getBalance: function(user, node) {
      const nodeId = (node === undefined) ? '' : ' node:' + node;
      return it('should get balance for user ' + user.name + nodeId, function(done) {
        user.balance = undefined;
        api.setNode(node);
        return api.strato.account(user.address)
          .then(function(accounts) {
            user.balance = new BigNumber(accounts[0].balance);
            done();
          }).catch(done);
      });
    },
    // get account's code and fills into `code`
    getCode: function(user, node) {
      return it('should get code for the account ' + JSON.stringify(user), function(done) {
        user.code = undefined;
        api.setNode(node);
        return api.strato.account(user.address)
          .then(function(accounts) {
            user.code = accounts[0].code;
            done();
          }).catch(done);
      });
    },

    // read a file
    readFile: function(fileDescriptor) {
      return it('should read a file ' + fileDescriptor.filename, function(done) {
        return util.readFile(fileDescriptor.filename)
          .then(function(buffer) {
            fileDescriptor.buffer = buffer;
            fileDescriptor.string = buffer.toString();
            done();
          }).catch(done);
      });
    },

    // upload a contract
    uploadContract: function(user, contract, node) {
      return it('should upload a contract ' + contract.filename, function(done) {
        api.setNode(node);
        return api_bloc_contract(api, config, user, contract, done);
      });
    },
    // import and upload a contract - merge all to a blob first
    importAndUploadBlob: function(user, contract, node) {
      return it('should import and upload a contract ' + contract.filename, function(done) {
        api.setNode(node);
        return importer.getBlob(contract.filename)
          .then(function(string){
            // save the contract src
            contract.string = string;
            return api_bloc_contract(api, config, user, contract, done);
          })
          .catch(done);
        });
    },
    // import a nested contract as JSON
    import: function(user, contract, node){
      return it('should import a contract JSON object ' + contract.filename, function(done) {
        api.setNode(node);
        return importer.readFile(contract.filename)
          .then(function(string){
            contract.string = string;
            return api_bloc_import(api, config, user, contract, done);
          })
          .catch(done);
      });
    },
    // get a contract's state
    getAbi: function(contract, node) {
      return it('should get the abi for ' + contract.name, function(done) {
        api.setNode(node);
        return api.bloc.abi(contract.name, contract.address)
          .then(function(state) {
            contract.state = state;
            done();
          })
          .catch(done);
      });
    },
    // get a contract's state
    getStorage: function(storage, node) {
      return it('should get storage for ' + storage.attr + ":" + storage.value, function(done) {
        api.setNode(node);
        return api.strato.storage(storage.attr, storage.value)
          .then(function(result) {
            console.log(result);
            storage.result = result;
            done();
          })
          .catch(done);
      });
    },
    // get a contract's stateRoute
    getState: function(contract, node) {
      return it('should check the state of ' + contract.name, function(done) {
        api.setNode(node);
        return api.bloc.state(contract.name, contract.address)
          .then(function(state) {
            contract.state = state;
            done();
          })
          .catch(done);
      });
    },
    getStateMapping: function(contract, node) {
      return it('should lookup the state of ' + contract.name + " with mapping", function(done) {
        api.setNode(node);
        return api.bloc.stateLookup(contract.name, contract.address, contract.mapping, contract.key)
          .then(function(state) {
            contract.state = state;
            done();
          })
          .catch(done);
      });
    },
    // get a contract's list of all instances
    getContracts: function(contract, node) {
      return it('should get the list of ' + contract.name, function(done) {
        api.setNode(node);
        return api.bloc.contracts(contract.name)
          .then(function(array) {
            contract.addresses = array.filter(function(item){
              return util.isAddress(item);
            });
            done();
          })
          .catch(done);
      });
    },
    // get a contract's list of all instances
    getContractsByCode: function(contract, node) {
      return it('should get the list of contracts having code ' + contract.code, function(done) {
        api.setNode(node);
        return api.strato.search(contract.code)
          .then(function(array) {
            contract.addresses = array;
            done();
          })
          .catch(done);
      });
    },
    // get the states for the all the contract's instances
    getContractsState: function(search, node) {
      return it('should get the states for all of contract ' + search.name, function(done) {
        api.setNode(node);
        return api.bloc.contracts(search.name)
          .then(function(array) {
            search.states = [];
            search.addresses = array.filter(function(item){
              return util.isAddress(item);
            });

            function processArray(array) {
              return Promise.each(array, function(item) {
                return processItem(item).then(function(state){
                  search.states.push(state);
                });
              }).then(function() {
                done();
              });
            }

            function processItem(address) {
              return api.bloc.state(search.name, address).then(function(state){
                state.address = address;
                return state;
              });
            }

            processArray(search.addresses);
          })
          .catch(done);
      });
    },
    // call a method
    callMethod: function(user, contract, call, node) {
      return it('should call a method ' + JSON.stringify(call), function(done) {
        api.setNode(node);
        return api.bloc.method({
            password: config.password,
            method: call.method,
            args: call.args,
            value: 0.1,
          }, user.name, user.address, contract.name, contract.address)
          .then(function(result) {
            call.result = result;
            done();
          })
          .catch(function(err) {
            if (err.data !== undefined) {
              done(new Error(err.data));
            } else {
              done(err);
            }
          });
      });
    },
    // send a transaction
    send: function(tx, node) {
      return it('should send ' + tx.toString(), function(done) {
        api.setNode(node);
        return api.bloc.send({
            password: config.password,
            toAddress: tx.toUser.address,
            value: tx.valueEther,
          }, tx.fromUser.name, tx.fromUser.address)
          .then(function(result) {
            tx.result = result;
            done();
          })
          .catch(function(err){done(new Error(err.data));});
      });
    },
    // server based search
    search: function(search, node) {
      return it('should get the states for all of contract ' + search.name, function(done) {
        api.setNode(node);
        return api.bloc.search(search.name).then(function(result){
          search.states = result;
          done();
        });

      });
    },
    searchReduced: function(search, node) {
      return it('should get the reduced states for all of contract ' + search.name, function(done) {
        api.setNode(node);
        return api.bloc.searchReduced(search.name).then(function(result){
          search.states = result;
          done();
        });

      });
    },
    searchSummary: function(search, node) {
      return it('should get the well\'s sample\'s state enum' + search.name, function(done) {
        api.setNode(node);
        return api.bloc.searchSummary(search.name, search.well).then(function(result){
          search.states = result;
          done();
        });

      });
    },
    // faucet
    faucet: function(user, node) {
      return it('should send from the faucet to ' + user.name, function(done) {
        api.setNode(node);
        return api.strato.faucet({address: user.address})
          .then(function(result) {
            done();
          })
          .catch(function(err){done(new Error(err.data));});
      });
    },

    // check service availability
    checkAvailability: function() {
      return it('should check services availability', function(done) {
        util.retry(api.bloc.home, done);
      });
    },
  };
};
