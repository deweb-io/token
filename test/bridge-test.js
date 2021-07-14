const { ethers } = require('hardhat');
const fs = require('fs');
const hardhat = require('hardhat');
const path = require('path');

// These are ABIs were generated from the Bancor contracts, so we have full computability.
// We will probably have a script that generates them automatically from a given version.
const abis = {
    registry: JSON.parse(fs.readFileSync(path.join(hardhat.config.paths.tests, './abis/ContractRegistry.abi'))),
    bancorX: JSON.parse(fs.readFileSync(path.join(hardhat.config.paths.tests, './abis/BancorX.abi')))
};

// Set this environment variables to use previously deployed contracts.
const REGISTRY = process.env.BANCOR_ENV_REGISTRY;
const BBS_TOKEN = process.env.BANCOR_ENV_BBS_TOKEN;
const BANCOR_X = process.env.BANCOR_ENV_BANCOR_X;

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
        console.log('address', signer.address);
        await bbsToken.mint(signer.address, 100);
        const balance = (await bbsToken.balanceOf(signer.address)).toNumber(10);
        console.log('balance', balance);

        // await bancorX.deployed();
        // await bancorX.connect(signer); //.xTransfer('eos', 'tomerbridge1', 50, 123);
        await bancorX['xTransfer(bytes32,bytes32,uint256,uint256)']('eos', 'tomerbridge1', 50, 123);
    });
});
