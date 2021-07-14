// const { expect } = require('chai').use(require('chai-string'));
const { ethers } = require('hardhat');
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3();

// These are ABIs were generated from the Bancor contracts, so we have full computability.
// We will probably have a script that generates them automatically from a given version.
const abis = {
    registry: JSON.parse(fs.readFileSync('./abis/ContractRegistry.abi', 'utf8')),
    bancorX: JSON.parse(fs.readFileSync('./abis/BancorX.abi', 'utf8'))
};

const NUM_ACCOUNTS = 10; // Can't be bigger than the number of signers ethers supplies us.

// Set this environment variables to use previously deployed contracts.
const BANCOR_ENV_REGISTRY = '0x4e3df2073bf4b43B9944b8e5A463b1E185D6448C'; // process.env.BANCOR_ENV_REGISTRY;
const BANCOR_ENV_BBS_TOKEN = '0xF2E246BB76DF876Cef8b38ae84130F4F55De395b'; //process.env.BANCOR_ENV_BBS_TOKEN;
const BANCOR_X = '0xdB587ef6aaA16b5719CDd3AaB316F0E70473e9Be';
// const BANCOR_ENV_CONVERTER = process.env.BANCOR_ENV_CONVERTER;

describe('BancorX', function() {
    let startTime;
    let currentTime;
    let accounts;
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
        startTime = Math.floor(new Date / 1000);
        currentTime = startTime;
        accounts = (await ethers.getSigners()).slice(0, NUM_ACCOUNTS);
        // If the environment variable is set, get the existing contracts.
        if (BANCOR_ENV_REGISTRY) {
            console.log('running tests on existing environment');
            bbsToken = await ethers.getContractAt('BBSToken', BANCOR_ENV_BBS_TOKEN);
            contractRegistry = await ethers.getContractAt(abis.registry, BANCOR_ENV_REGISTRY);
            bancorX = await ethers.getContractAt(abis.bancorX, BANCOR_X);
            signer = accounts[0];

        // Otherwise, deploy our mocks and register them.
        } 
        printContracts();
    });


    it('min bbs and make x transfer', async function() {
        console.log('address', signer.address);
        await bbsToken.mint(signer.address, 100);
        const balance = (await bbsToken.balanceOf(signer.address)).toNumber(10);
        console.log('balance', balance);

        // await bancorX.deployed();
        // await bancorX.connect(signer); //.xTransfer('eos', 'tomerbridge1', 50, 123);
        await bancorX.xTransfer('eos', 'tomerbridge1', 50, 123);
    });
});
