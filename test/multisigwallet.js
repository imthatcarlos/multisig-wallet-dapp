var wallet = artifacts.require('./MultiSigWallet.sol');

contract('MultiSigWallet', function(accounts) {
  it('should allow to put money inside', function() {
    var contractInstance;

    // the promise guarantees the block has been mined
    return wallet.deployed().then(function(instance) {
      contractInstance = instance;
      return contractInstance.sendTransaction({value: web3.toWei(10, 'ether'), address: contractInstance.address, from: accounts[0]});
    }).then(function(result) {
      assert.equal(web3.eth.getBalance(contractInstance.address).toNumber(), web3.toWei(10, 'ether'), 'The balance is the same');
    });
  });

  it('should be possible to get money back as owner', function() {
    var contractInstance;
    var balanceBefore;
    var balanceAfter;
    var amountToSend = web3.toWei(5, 'ether');

    return wallet.deployed().then(function(instance) {
      contractInstance = instance;
      balanceBefore = web3.eth.getBalance(contractInstance.address).toNumber();
      return contractInstance.spendMoneyOn(accounts[0], amountToSend, 'I\'m the owner, that\'s why!', {from: accounts[0]});
    }).then(function() {
      return web3.eth.getBalance(contractInstance.address).toNumber();
    }).then(function(balance) {
      balanceAfter = balance;
      assert.equal(balanceAfter, balanceBefore - amountToSend, 'Balance has decreased by 5 ether');
    });
  });

  it('should be possible to send proposals and for owner to confirm', function() {
    var contractInstance;
    var amountBefore;
    var amountToSend = web3.toWei(5, 'ether');

    return wallet.deployed().then(function(instance) {
      contractInstance = instance;
      amountBefore = web3.eth.getBalance(accounts[2]).toNumber();
      return contractInstance.spendMoneyOn(accounts[2], amountToSend, 'He needs it', {from: accounts[1]});
    }).then(function(result) {
      // result is an object with the following values:
      //
      // result.tx      => transaction hash, string
      // result.logs    => array of decoded events that were triggered within this transaction
      // result.receipt => transaction receipt object, which includes gas used

      // We can loop through result.logs to see if we triggered the proposalReceived event.
      var proposal_id;
      for (var i = 0; i < result.logs.length; i++) {
        var log = result.logs[i];
        if (log.event == "proposalReceived") {
          proposal_id = log.args._idx.valueOf();
          break;
        }
      }

      return contractInstance.confirmProposal(proposal_id, {from: accounts[0]});
    }).then(function(result) {
      var balanceNow = web3.eth.getBalance(accounts[2]).toNumber();
      assert.equal(balanceNow, Number(amountBefore) + Number(amountToSend), 'Owner accepted proposal and amount was sent');
    });
  });
});
