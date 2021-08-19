var Web3 = require("web3");
var fs = require('fs');
const path = require('path');
// var Tx = require('ethereumjs-tx').Transaction;
var Tx = require('ethereumjs-tx');
const fetch = require('node-fetch');
const common = require('ethereumjs-common');


const bridgeAbi = require('./abis/BridgeEth.json');
const crossBridgeAbi = require('./abis/BridgeBsc.json');
const degenAbi = require('./abis/Ethdegen.json');

const wsUrl = `wss://ropsten.infura.io/ws/v3/e3706a59ed38418095f619d56df648e0`;
const wsUrl2 = `wss://bsc.getblock.io/testnet/`;
const crosschain_provider = "https://ropsten.infura.io/v3/e3706a59ed38418095f619d56df648e0";

const web3 = new Web3(new Web3.providers.HttpProvider(crosschain_provider));
// const web3 = new Web3(crosschain_provider);

const web3Bsc = new Web3(new Web3.providers.HttpProvider('https://data-seed-prebsc-2-s1.binance.org:8545/'));
// const web3Bsc = new Web3('https://data-seed-prebsc-2-s2.binance.org:8545/');

const CROSS_CHAIN_ID = 97;
const CHAIN_ID = 3;

const GAS_LIMIT = "800000";


const BRIDGE_ADDRESS = "0x4A4B6fb358cEA2E80a6809b0FE935dcf706BA070";
const CROSS_BRIDGE_ADDRESS = "0xb762771608791aa6Ab459bae0eE203015654F412";

const OWNER_ADDRESS = "0xddf7Fe34171251c98664E756F990EAcd9360718b";
const pKey = "cd932cdd5c97797018e4ecbe0439f9bd1c3f2959c98891c7137654baf356daa2";

const DEGEN_ADDRESS = "0x089B9870c7404F6F186B7fEF75CA9384b7D991e1";

const CROSS_BRIDGE_INSTANCE = new web3Bsc.eth.Contract(crossBridgeAbi,CROSS_BRIDGE_ADDRESS);
const BRIDGE_INSTANCE = new web3.eth.Contract(bridgeAbi,BRIDGE_ADDRESS);
const DEGEN_INSTANCE = new web3.eth.Contract(degenAbi,DEGEN_ADDRESS);

// var Bscnonce = 0;
// function initBscNonce(){
//     web3Bsc.eth.getTransactionCount(OWNER_ADDRESS).then(function (_nonce) {
//         if(_nonce > Bscnonce){
//             Bscnonce = _nonce;
//             console.log("Bscnonce",Bscnonce);
//         }
//     });
// }

var Bscnonce = 0;
async function  initBscNonce(){
    var _nonce = await web3Bsc.eth.getTransactionCount(OWNER_ADDRESS)
      if(_nonce > Bscnonce){
          Bscnonce = _nonce;
          console.log("Bscnonce",Bscnonce);
      }
    
}

var Ethnonce = 0;
async function  initEthNonce(){
    var _nonce = await web3.eth.getTransactionCount(OWNER_ADDRESS)
      if(_nonce > Ethnonce){
          Ethnonce = _nonce;
          console.log("Ethnonce",Ethnonce);
      }
    
}

const getRawTransactionApp = function (_address, _nonce, _gasPrice, _gasLimit, _to, _value, _data) {
    return {

        nonce: web3Bsc.utils.toHex(_nonce),
        // gasPrice: _gasPrice === null ? '0x098bca5a00' : web3.utils.toHex(2*_gasPrice),
        gasPrice: web3Bsc.utils.toHex(web3Bsc.utils.toWei('200', 'gwei')),
        // gasLimit: _gasLimit === null ? '0x96ed' : web3.utils.toHex(2*_gasLimit),
        gasLimit: web3Bsc.utils.toHex(1000000),

        to: _to,
        value: _value === null ? '0x00' : web3Bsc.utils.toHex(_value),
        // value: web3.utils.toHex(web3.utils.toWei('0.01', 'ether')),
        data: _data === null ? '' : _data,
        chainId: CROSS_CHAIN_ID
    }
}
const getRawTransactionApp2 = function (_address, _nonce, _gasPrice, _gasLimit, _to, _value, _data) {
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
      chainId: CHAIN_ID
  }
}


var lastLisnter ;
var web3JSConnection;  
var web3BscJSConnection;  
let hasProviderEnded = false, web3Instance, reconnectInterval = 500;  

const endCallback  = async function () {  
    web3JSConnection = await newConnection();
  // web3BscJSConnection = await newConnection2();

  
      
}  


class InitEvents {
    constructor () {
      this.bridgeInstance = new web3JSConnection.eth.Contract(
        bridgeAbi,
        BRIDGE_ADDRESS
      );
      // this.crossBridgeInstance = new web3BscJSConnection.eth.Contract(
      //   bridgeAbi,
      //   CROSS_BRIDGE_ADDRESS
      // );
      this.isKilled = false;
      this.initMethod();
    }
    
    killProcess(){
      this.isKilled = true;
      this.oracleInstance = null;
    }
  
    initMethod(){
      this.bridgeInstance.events.allEvents((error, result)=>{
        if (!error && this.isKilled === false) {
          console.log(result.event);
          if (result.event === "SwapRequest") {
            console.log("calling decodeInput");
            decodeInputs(result.returnValues);
          }
          else if( result.event == "ClaimApprove") {
            console.log("calling decodeInput2");

            // decodeInputs2(result.returnValues);
          }
        } else console.log("49",error);
      });
      // this.crossBridgeInstance.events.allEvents((error, result)=>{
      //   if (!error && this.isKilled === false) {
      //     if (result.event === "SwapRequest") {
      //       console.log("calling BSC decodeInput");
      //       // decodeInputs(result.returnValues);
      //     }
      //     else if( result.event == "ClaimApprove") {
      //       console.log("calling BSC decodeInput2");

      //       decodeInputs2(result.returnValues);
      //     }
      //   } else console.log("49",error);
      // });

    }
}

async function newConnection() {
    const provider = new Web3.providers.WebsocketProvider(wsUrl);  
    hasProviderEnded = false; 
    provider.on("connect", () => {
      console.log("connected to blockchain");
      lastLisnter = new InitEvents();
    });

    provider.on("error", (err) => console.log("err",err.message));
    provider.on("end", async (err) => {
      if (hasProviderEnded) return;
      hasProviderEnded = true;
      lastLisnter.killProcess();
      provider.removeAllListeners("connect");
      provider.removeAllListeners("error");
      provider.removeAllListeners("end");
      endCallback();
    });

    if (web3Instance == undefined) web3Instance = new Web3(provider);
    else web3Instance.setProvider(provider);
    return web3Instance;  
  }

  // async function newConnection2() {
  //   const provider = new Web3.providers.WebsocketProvider(wsUrl2);  
  //   hasProviderEnded = false; 
  //   provider.on("connect", () => {
  //     console.log("connected to blockchain");
  //     lastLisnter = new InitEvents();
  //   });

  //   provider.on("error", (err) => console.log("err",err.message));
  //   provider.on("end", async (err) => {
  //     if (hasProviderEnded) return;
  //     hasProviderEnded = true;
  //     lastLisnter.killProcess();
  //     provider.removeAllListeners("connect");
  //     provider.removeAllListeners("error");
  //     provider.removeAllListeners("end");
  //     endCallback();
  //   });

  //   if (web3BscInstance == undefined) web3BscInstance = new Web3(provider);
  //   else web3BscInstance.setProvider(provider);
  //   return web3BscInstance;  
  // }




async function decodeInputs(decode){
    
    console.log(decode)
    await initBscNonce();
    let tokenA = decode.tokenA;
    let tokenB = decode.tokenB;
    let user = decode.user;
    let amountA = decode.amount;
    let crossOrderType = decode.crossOrderType;
    let id = decode.nonce

    let USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";

    const path = [USDT_BSC,tokenB];


    var encodeABI = CROSS_BRIDGE_INSTANCE.methods.claimTokenBehalf(path,user,amountA,crossOrderType,id).encodeABI();
    // var encodeABI = BRIDGE_INSTANCE.methods.claimTokenBehalf(tokenB,USDT_ETH,USDT_ETH,user).encodeABI();

    // var encodeABI = DEGEN_INSTANCE.methods.callbackCrossExchange(path,amountA,user).encodeABI();

    
    const response = await fetch('https://ethgasstation.info/json/ethgasAPI.json');
    const json = await response.json();
    
    console.log("1");
    let gas_limit = (json.fast/10).toString();

    console.log("2");
    // console.log(nonce);

    var rawData = await getRawTransactionApp(
        OWNER_ADDRESS,
        Bscnonce,
        web3Bsc.utils.toWei(gas_limit, "gwei"),
        GAS_LIMIT,
        CROSS_BRIDGE_ADDRESS,
        null,
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
    web3Bsc.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function (error, hash) {
        if (error) {
            console.log("Tx Error : ", error);
        } else {
            // nonce += 1;
            console.log("Tx Success : ", hash)
        }
    })
    console.log("6");

}

async function decodeInputs2(decode){
  await initEthNonce();
  console.log(decode)
  
  let tokenA = decode.tokenA;
  let tokenB = decode.tokenB;
  let user = decode.user;
  let amountA = decode.amount;
  let crossOrderType = decode.crossOrderType;

  let USDT_ETH = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

  let orderType = [2,1,2,1];

  var encodeABI = DEGEN_INSTANCE.methods.callbackCrossExchange([USDT_ETH,tokenA],orderType[crossOrderType],amountA,user).encodeABI();
  const response = await fetch('https://ethgasstation.info/json/ethgasAPI.json');
  const json = await response.json();
  
  let gas_limit = (json.fast/10).toString();

  var rawData = await getRawTransactionApp2(
      OWNER_ADDRESS,
      Ethnonce,
      web3.utils.toWei(gas_limit, "gwei"),
      GAS_LIMIT,
      DEGEN_ADDRESS,
      null,
      encodeABI
  );

  var tx = new Tx(rawData);
  let privateKey = new Buffer.from(pKey, 'hex');
  tx.sign(privateKey);
  var serializedTx = tx.serialize();
  
  web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function (error, hash) {
      if (error) {
          console.log("Tx Error : ", error);
      } else {
          // nonce += 1;
          console.log("Tx Success : ", hash)
      }
  })
}







// initNonce();
endCallback();