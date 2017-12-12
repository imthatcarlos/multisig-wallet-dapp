// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";
import "bootstrap/dist/css/bootstrap.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract';

// Import our contract artifacts and turn them into usable abstractions.
import wallet_artifacts from '../../build/contracts/MultiSigWallet.json';

// MultiSigWallet is our usable abstraction, which we'll use through the code below.
var MultiSigWallet = contract(wallet_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

window.App = {
  start: function() {
    var self = this;

    // Bootstrap the MultiSigWallet abstraction for Use.
    MultiSigWallet.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];

      App.walletUpdate();
      App.listenToEvents();
    });
  },

  walletUpdate: function() {
    MultiSigWallet.deployed().then(function(instance) {
      document.getElementById("walletAddress").innerHTML = instance.address;

      // wallet Ether
      web3.eth.getBalance(instance.address, function(error, result) {
        if(!error) {
          var walletEther = web3.fromWei(result.toNumber(), "ether");
          document.getElementById("walletEther").innerHTML = walletEther;
        }
        else {
          document.getElementById("walletEther").innerHTML = "error";
        }
      });

      var accountsDiv = document.getElementById("accounts");
      accountsDiv.innerHTML = accounts.join("<br />");
    });
  },

  submitEtherToWallet: function() {
    MultiSigWallet.deployed().then(function(instance) {
      // we get a promise thanks to truffle-contract
      // MUST return!!!
      return instance.sendTransaction({from: account, to: instance.address, value: web3.toWei(5, "ether")});
    }).then(function(result) {
      // only called when the transaction is mined...
      App.walletUpdate();
    });
  },

  submitTransaction: function() {
    var to = document.getElementById("to").value;
    var amount = parseInt(document.getElementById("amount").value);
    var reason = document.getElementById("reason").value;
    document.getElementById("proposalForm").reset();

    MultiSigWallet.deployed().then(function(instance) {
      // thanks to truffle-contract
      // sends the message down to Web3, which calls it via JSON ABI interface
      return instance.spendMoneyOn(to, web3.toWei(amount, "finney"), reason, {from: accounts[1], gas: 500000});
    }).then(function(result) {
      console.log("proposal submitted!");
      console.log(result);
      App.walletUpdate();
    }).catch(function(error) {
      console.log(error);
    });
  },

  listenToEvents: function() {
    MultiSigWallet.deployed().then(function(instance) {
      // contract event receivedFunds
      instance.receivedFunds({}, {fromBlock: 0, toBlock: 'latest'}).watch(function(error, event) {
        var html = "<p>Block #" + event.blockNumber + " => ";
        html += "{_from: " + event.args._from + ", ";
        html += "_amount: " + web3.fromWei(event.args._amount, "ether") + " ether}</p>";
        document.getElementById("fundEvents").innerHTML += html;
      });

      // filter events by indexed param _from
      // hardcoding to account @ idx = 1, since that's the account creating proposals
      instance.proposalReceived({_from: accounts[1]}, {fromBlock: 0, toBlock: 'latest'}).watch(function(error, event) {
        var proposal_id = event.args._idx;
        var html = "<p>Block #" + event.blockNumber + " => ";
        html += "{_from: " + event.args._from + ", ";
        html += "_to: " + event.args._to + ", ";
        html += "_reason: " + event.args._reason + "}";

        return instance.wasProposalApproved(proposal_id).then(function(wasSent) {
          if (!wasSent) {
            html += "<button id='" + proposal_id + "'type='button' class='btn btn-md btn-primary' onclick='App.confirmProposal(" + proposal_id + ");'>Approve</button></p>";
          } else {
            html += " ✅ approved</p>";
          }
          document.getElementById("proposalEvents").innerHTML += html;
        });
      });

    });
  },

  confirmProposal: function(proposal_id) {
    MultiSigWallet.deployed().then(function(instance) {
      return instance.confirmProposal(proposal_id, {from: account, gas: 500000});
    }).then(function(wasSent) {
      if (wasSent) {
        var button = document.getElementById(proposal_id);
        button.style.display = "none";
        button.parentElement.innerHTML += " ✅ approved"
      }
    });
  }
};

// @notice: we're forcing use of testrpc since it's not playing well with metamask
window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  // if (typeof web3 !== 'undefined') {
  //   console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
  //   // Use Mist/MetaMask's provider
  //   window.web3 = new Web3(web3.currentProvider);
  // } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  //}

  App.start();
});
