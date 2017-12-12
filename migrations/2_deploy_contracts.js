var wallet = artifacts.require("./MultiSigWallet.sol");

module.exports = function(deployer) {
  deployer.deploy(wallet);
};
