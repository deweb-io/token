const { ethers } = require('hardhat');
const Web3 = require('web3');
// const web3 = new Web3('http://localhost:8545');
const web3 = new Web3('https://ropsten.infura.io/v3/b481942a6a15462988f7ab9000ca51ab');



// Set this environment variables to use previously deployed contracts.
const BBS_TOKEN = '0x94F32CA9c737FFe1b9e040de4027BAB92eb1f85a';
const BANCOR_X = '0x9db840EfaA31Be39e46E9782566D8f20ACfFE9cb';

describe('Bridge', function() {
    let bbsToken;
    let bancorX;
    let signer;

    function printContractDetails(name, addrees) {
        console.log(`${name} is deployed at ${addrees}`);
    }

    function printContracts() {
        console.log('####### Contracts #######');
        printContractDetails('BancorX', bancorX && bancorX.address);
        printContractDetails('BBS token', bbsToken && bbsToken.address);
        console.log('#########################');
    }

    beforeEach(async function() {
        signer = (await ethers.getSigners())[0];
        bbsToken = await ethers.getContractAt('BBSToken', BBS_TOKEN);
        bancorX = await ethers.getContractAt('BancorX', BANCOR_X);
        printContracts();
    });

    it('mint BBS and make x transfer', async function() {
        // const topic = web3.utils.keccak256('XTransfer(address,bytes32,bytes32,uint256,uint256)');
        // console.log(topic);
        // console.log(await web3.eth.getPastLogs({topics: [topic]}));


        console.log('signer address', signer.address);
        await bbsToken.mint(signer.address, ethers.utils.parseEther('1'));
        console.log('BBS minted');

        const ethBalance = await web3.eth.getBalance(signer.address);
        console.log('eth balance', ethBalance);

        const balance = (await bbsToken.balanceOf(signer.address));
        console.log('BBS balance', balance);

        const eosBlockchain = ethers.utils.formatBytes32String('eos'); 
        console.log('eosBlockchain',eosBlockchain);
        const eosAddress = ethers.utils.formatBytes32String('tomerbridge1'); 
        console.log('eosAddress',eosAddress);
        const amount = ethers.utils.parseEther('1');
        console.log(amount);

        await bbsToken.connect(signer).approve(bancorX.address, amount);
        const xTransfer = await bancorX.connect(signer)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, amount, 7343, {from: signer.address});
        console.log(xTransfer);
    });
});
