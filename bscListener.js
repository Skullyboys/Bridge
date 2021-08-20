var Web3 = require("web3");
    // "web3": "^1.0.0-beta.37"

var fs = require('fs');
const path = require('path');
var Tx = require('ethereumjs-tx');
const fetch = require('node-fetch');
const common = require('ethereumjs-common');

// const initConfig = require("../configs/initConfigs");

const polygonBridgeAbi = require("./abis/PolygonBridge.json");
const DoveAbi = require("./abis/PolygonDoveAbi.json")
const CROSS_CHAIN_ID = 137;
const CHAIN_ID = 56;
const GAS_LIMIT = "800000";

const OWNER_ADDRESS = "owner address";
const pKey = "your private key";

const DOVE_ADDRESS = '0x2Bf56908B0f2440Ad11169d281967EB76665F8c6';
const CROSS_SWAP_ADDRESS = "owner address";
// const { swapHelper, priceHelper } = require("../helpers/");

// const web3 = new Web3(new Web3.providers.HttpProvider(initConfig.bscRpc));
const web3 = new Web3(new Web3.providers.HttpProvider('https://bsc-dataseed.binance.org/'));
const web3Polygon = new Web3(new Web3.providers.HttpProvider("https://matic-mainnet.chainstacklabs.com"));

const CROSS_SWAP_INSTANCE = new web3Polygon.eth.Contract(polygonBridgeAbi, CROSS_SWAP_ADDRESS);
const DOVE_INSTANCE = new web3.eth.Contract(DoveAbi, DOVE_ADDRESS);
var cronJob = require('cron').CronJob;

var Bscnonce = 0;
async function  initBscNonce(){
    var _nonce = await web3.eth.getTransactionCount(OWNER_ADDRESS)
      if(_nonce > Bscnonce){
          Bscnonce = _nonce;
          console.log("Bscnonce",Bscnonce);
      }
}

var Ethnonce = 0;
async function  initEthNonce(){
    var _nonce = await web3Polygon.eth.getTransactionCount(OWNER_ADDRESS)
      if(_nonce > Ethnonce){
          Ethnonce = _nonce;
          console.log("Ethnonce",Ethnonce);
      }
}
 
var cronJ1 = new cronJob("*/1 * * * *", async function () {
    // initNonce();
    checkPending()
}, undefined, true, "GMT");

async function checkPending() {
    // initNonce();
    
    fs.readFile(path.resolve(__dirname, 'bscBlock.json'), async (err, blockData) => {

        if (err) {
            console.log(err);
            return;
        }

        blockData = JSON.parse(blockData);
        let lastcheckBlock = blockData["lastblock"];
        const latest = await web3.eth.getBlockNumber();
        console.log(lastcheckBlock,latest)
        blockData["lastblock"] = latest;

        DOVE_INSTANCE.getPastEvents({},
            {
                fromBlock: lastcheckBlock,
                toBlock: latest // You can also specify 'latest'          
            })
            .then(async function (resp) {
                for (let i = 0; i < resp.length; i++) {
                    
                    if (resp[i].event === "Transfer" && resp[i].returnValues.to == "0x9d0D21C2ede0a7B081B1E5FC8e307674b9c50199") {
                        console.log("transfer requested")
                        SwapRequest(resp[i])
                    }else if (resp[i].event === "Transfer") {
                        console.log("ClaimRequest emitted");
                        // ClaimRequest(resp[i]);
                    } else if (resp[i].event === "ClaimApprove") {
                        console.log("ClaimApprove emitted");
                        // ClaimApprove(resp[i]);
                        // break;
                    }
                }
            })
            .catch((err) => console.error(err));

        fs.writeFile(path.resolve(__dirname, './bscBlock.json'), JSON.stringify(blockData), (err) => {
            if (err);
            console.log(err);
        });
    });
}

const getRawTransactionApp = function (_address, _nonce, _gasPrice, _gasLimit, _to, _value,_chainID, _data) {
    return {

        nonce: web3.utils.toHex(_nonce),
        // gasPrice: _gasPrice === null ? '0x098bca5a00' : web3.utils.toHex(2*_gasPrice),
        gasPrice: web3.utils.toHex(web3.utils.toWei('200', 'gwei')),
        // gasLimit: _gasLimit === null ? '0x96ed' : web3.utils.toHex(2*_gasLimit),
        gasLimit: web3.utils.toHex(1000000),

        to: _to,
        value: _value === null ? '0x00' : web3.utils.toHex(_value),
        // value: web3.utils.toHex(web3.utils.toWei('0.01', 'ether')),
        data: _data === null ? '' : _data,
        chainId: _chainID
    }
}

const getRawTransactionApp2 = function (_address, _nonce, _gasPrice, _gasLimit, _to, _value,_chainID, _data) {
    return {

        nonce: web3Polygon.utils.toHex(_nonce),
        // gasPrice: _gasPrice === null ? '0x098bca5a00' : web3.utils.toHex(2*_gasPrice),
        gasPrice: web3Polygon.utils.toHex(web3Polygon.utils.toWei('200', 'gwei')),
        // gasLimit: _gasLimit === null ? '0x96ed' : web3.utils.toHex(2*_gasLimit),
        gasLimit: web3Polygon.utils.toHex(1000000),

        to: _to,
        value: _value === null ? '0x00' : web3Polygon.utils.toHex(_value),
        // value: web3.utils.toHex(web3.utils.toWei('0.01', 'ether')),
        data: _data === null ? '' : _data,
        chainId: _chainID
    }
}


async function ClaimApprove(resp){
    await initBscNonce();
    console.log(resp.returnValues);
    const tokenA = resp.returnValues.tokenA;
    const tokenB = resp.returnValues.tokenB;
    const user = resp.returnValues.user;
    const amount = resp.returnValues.amount;
    const crossOrderType = resp.returnValues.crossOrderType;

    let orderType = [2,1,2,1];


    let USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";

    const path = [USDT_BSC,tokenA];
    console.log("0");

    var encodeABI = DOVE_INSTANCE.methods.callbackCrossExchange(orderType[crossOrderType],path,amount,user).encodeABI();
    console.log("a");

    // var encodeABI = BRIDGE_INSTANCE.methods.claimTokenBehalf(tokenB,USDT_ETH,USDT_ETH,user).encodeABI();
    const response = await fetch('https://ethgasstation.info/json/ethgasAPI.json');
    const json = await response.json();
    
    console.log("1");
    let gas_limit = (json.fast/10).toString();

    console.log("2");

    // console.log("nonce is:",nonce);
    var rawData = await getRawTransactionApp(
        OWNER_ADDRESS,
        Bscnonce,
        web3.utils.toWei(gas_limit, "gwei"),
        GAS_LIMIT,
        DOVE_ADDRESS,
        null,
        CROSS_CHAIN_ID,
        encodeABI
    );
    const chain = common.default.forCustomChain(
      'mainnet',{
        name: 'bnb',
        networkId: 97,
        chainId: 97
      },
      'petersburg'
    )

    // var chain = common.default.forCustomChain ('ropsten', { networkId: 1994, chainId: 1994, name: 'geth' }, 'muirGlacier');


    console.log("3");

    // var tx = new Tx(rawData, {common: chain});
    var tx = new Tx(rawData);
    // var tx = new Tx(rawData, {chain:'ropsten', hardfork: 'petersburg'});
    let privateKey = new Buffer.from(pKey, 'hex');
    console.log("4");

    tx.sign(privateKey);
    var serializedTx = tx.serialize();
    console.log("5");

    // changing web3 instance
    web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function (error, hash) {
        if (error) {
            console.log("Tx Error : ", error);
        } else {
            // nonce += 1;
            console.log("Tx Success : ", hash)
        }
    })

    // const transactionHash = resp.transactionHash;
    // const blockNumber = resp.blockNumber;

    // const remainTx = await SwapTxModel.findOne({ claimID:claimID,recivedChainId:initConfig.bscChainId });
    // console.log("claim-approve:",transactionHash);
    // if(remainTx === null){
    //     return;
    // }
    
    // remainTx.txStatus = 3;
    // remainTx.oracleTx = transactionHash;
    // remainTx.oracleBlock = blockNumber;
    // remainTx.recivedAmount  = web3.utils.fromWei(nativeAmount);
    // remainTx.foreignAmount = web3.utils.fromWei(foreignAmount);
    // remainTx.save();
}



async function SwapRequest(resp){
    await initEthNonce();
    console.log(resp.returnValues);
    const tokenA = DOVE_ADDRESS;
    const user = resp.returnValues.from;
    const amount = resp.returnValues.value;
 

    console.log("0", user);

    var encodeABI = CROSS_SWAP_INSTANCE.methods.transferFrom(tokenA, user, amount).encodeABI();
    console.log("a");

    // var encodeABI = BRIDGE_INSTANCE.methods.claimTokenBehalf(tokenB,USDT_ETH,USDT_ETH,user).encodeABI();
    const response = await fetch('https://ethgasstation.info/json/ethgasAPI.json');
    const json = await response.json();
    
    console.log("1");
    let gas_limit = (json.fast/10).toString();

    console.log("2");

    // console.log("nonce is:",nonce);
    var rawData = await getRawTransactionApp2(
        OWNER_ADDRESS,
        Ethnonce,
        web3.utils.toWei(gas_limit, "gwei"),
        GAS_LIMIT,
        CROSS_SWAP_ADDRESS,
        null,
        CROSS_CHAIN_ID,
        encodeABI
    );

    console.log("3");

    // var tx = new Tx(rawData, {common: chain});
    var tx = new Tx(rawData);
    // var tx = new Tx(rawData, {chain:'ropsten', hardfork: 'petersburg'});
    let privateKey = new Buffer.from(pKey, 'hex');
    console.log("4");

    tx.sign(privateKey);
    var serializedTx = tx.serialize();
    console.log("5", rawData);

    // changing web3 instance
    web3Polygon.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function (error, hash) {
        if (error) {
            console.log("Tx Error : ", error);
        } else {
            // nonce += 1;
            console.log("Tx Success : ", hash)
        }
    })

}

cronJ1.start();