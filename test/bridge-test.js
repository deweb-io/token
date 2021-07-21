const { ethers } = require('hardhat');
const fs = require('fs');
const hardhat = require('hardhat');
const path = require('path');
const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');


// These are ABIs were generated from the Bancor contracts, so we have full computability.
// We will probably have a script that generates them automatically from a given version.
const abis = {
    registry: JSON.parse(fs.readFileSync(path.join(hardhat.config.paths.tests, './abis/ContractRegistry.abi'))),
    bancorX: JSON.parse(fs.readFileSync(path.join(hardhat.config.paths.tests, './abis/BancorX.abi')))
};

// Set this environment variables to use previously deployed contracts.
const REGISTRY = process.env.BANCOR_ENV_REGISTRY || '0x4e3df2073bf4b43B9944b8e5A463b1E185D6448C';
const BBS_TOKEN = process.env.BANCOR_ENV_BBS_TOKEN || '0xF2E246BB76DF876Cef8b38ae84130F4F55De395b';
const BANCOR_X = process.env.BANCOR_ENV_BANCOR_X || '0xf8466c6af264DDA1c5b4EEcDAE416Fd708DeB3e7';

describe('Bridge', function() {
    let bbsToken;
    let bancorX;
    let contractRegistry;
    let signer;

    function printContractDetails(name, addrees) {
        console.log(`${name} is deployed at ${addrees}`);
    }

    function printContracts() {
        console.log('####### Contracts #######');
        printContractDetails('ContractRegistry', contractRegistry && contractRegistry.address);
        printContractDetails('BancorX', bancorX && bancorX.address);
        printContractDetails('BBS token', bbsToken && bbsToken.address);
        console.log('#########################');
    }

    beforeEach(async function() {
        signer = (await ethers.getSigners())[0];
        bbsToken = await ethers.getContractAt('BBSToken', BBS_TOKEN);
        contractRegistry = await ethers.getContractAt(abis.registry, REGISTRY);
        bancorX = await ethers.getContractAt(abis.bancorX, BANCOR_X);
        printContracts();
    });

    it('min bbs and make x transfer', async function() {
        // const topic = web3.utils.keccak256('XTransfer(address,bytes32,bytes32,uint256,uint256)');
        // console.log(topic);
        // console.log(await web3.eth.getPastLogs({topics: [topic]}));

        console.log('address', signer.address);
        await bbsToken.mint(signer.address, ethers.utils.parseEther('1'));

        const ethBalance = await web3.eth.getBalance(signer.address);
        console.log(ethBalance);

        const balance = (await bbsToken.balanceOf(signer.address));
        console.log('balance', balance);

        const eosBlockchain = ethers.utils.formatBytes32String('eos'); 
        console.log('eosBlockchain',eosBlockchain);
        const eosAddress = ethers.utils.formatBytes32String('tomerbridge1'); 
        console.log('eosAddress',eosAddress);
        const amount = ethers.utils.parseEther('1');
        console.log(amount);

        await bbsToken.connect(signer).approve(bancorX.address, amount);
        const xTransfer = await bancorX.connect(signer)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, amount, 5454);
        console.log(xTransfer);
    });
});
