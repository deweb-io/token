#!/usr/bin/env bash
testdir=bancor_test_env

pushd "$(dirname "${BASH_SOURCE[0]}")"

if ! [ -d $testdir ]; then
    git clone --depth=1 https://github.com/bancorprotocol/contracts-solidity.git $testdir
    cp ./bancorContractsModifications/* $testdir/.
    pushd $testdir
    export NODE_OPTIONS="--max-old-space-size=4096"
    npm install --force
    npm run build
    npm run export
    popd
fi

echo RUNNING GANACHE
account=0x0000000000000000000000000000000000000000000000000000000000000001
reporter=0xe427e1a30d344c90f0b3884df1e58273ee7b6084c055bcc84090e2915967d8c6
yarn ganache-cli \
     --port=8545 \
     --gasLimit=30000000 \
     --account=$account,10000000000000000000000000000000000000000 --account=$reporter,10000000000000000000000000000000000000000 &
ganache_pid=$!
cleanup() {
    # Killing the original ganache-cli process will not suffice, you need to kill it's grandson.
    # This should probably be done with session id or something, but for now this will do.
    # Will probably fail on mac as well.
    grep linux <<<"$OSTYPE" > /dev/null || return
    kill $(ps --ppid $(ps --ppid $ganache_pid -o pid=) -o pid=)
    echo
}
trap cleanup EXIT
sleep 5

echo DEPLOYING TOKEN
bbs_token="$(npx hardhat --network localhost run ./scripts/deploy_token.js | grep -o '(?<=token deployed to: )0x.*')"

pushd $testdir/solidity/utils/

echo MODIFYING DEPLOYMENT SCRIPT
deploy_script="$(sed '434q' test_deployment.js)
    // deploy bancorX
    const bancorX = await web3Func(deploy, 'bancorX', 'BancorX', [
        '40000000000000000000000',
        '80000000000000000000000',
        '1000000000000000000',
        '500000000000000000000',
        1,
        contractRegistry._address,
        '0xF2E246BB76DF876Cef8b38ae84130F4F55De395b'
    ]);

    // register bancorX
    await execute(contractRegistry.methods.registerAddress(Web3.utils.asciiToHex('BancorX'), bancorX._address));

    const REPORTER1_ADDRESS = '0x41C87AC77a3ec4E192F0f3a0c598f8027Ec16177';
    // const REPORTER1_PRIVATE_KEY = '0xe427e1a30d344c90f0b3884df1e58273ee7b6084c055bcc84090e2915967d8c6';
    await execute(bancorX.methods.setReporter(REPORTER1_ADDRESS, true));

    web3.currentProvider.disconnect();
};

run();
"
echo "$deploy_script" > test_deployment.js

cat << EOF > config.json
{
    "reserves": [
        {
            "symbol": "XXX",
            "decimals": 18,
            "supply": "1829101"
        },
        {
            "symbol": "YYY",
            "decimals": 18,
            "supply": "3603801"
        },
        {
            "symbol": "BNT",
            "decimals": 18,
            "supply": "6914855"
        },
        {
            "symbol": "vBNT",
            "decimals": 18,
            "supply": "0"
        },
        {
            "symbol": "BBS",
            "decimals": 18,
            "supply": "1000000"
        }
    ],
    "converters": [
        {
            "type": 3,
            "symbol": "ETHBNT",
            "decimals": 18,
            "fee": "0.1%",
            "reserves": [
                {
                    "symbol": "ETH",
                    "weight": "50%",
                    "balance": "21"
                },
                {
                    "symbol": "BNT",
                    "weight": "50%",
                    "balance": "3092"
                }
            ]
        },
        {
            "type": 3,
            "symbol": "XXXBNT",
            "decimals": 18,
            "fee": "0.1%",
            "reserves": [
                {
                    "symbol": "XXX",
                    "weight": "50%",
                    "balance": "582"
                },
                {
                    "symbol": "BNT",
                    "weight": "50%",
                    "balance": "2817"
                }
            ]
        },
        {
            "type": 3,
            "symbol": "BBSBNT",
            "decimals": 18,
            "fee": "0.1%",
            "reserves": [
                {
                    "symbol": "BBS",
                    "weight": "50%",
                    "balance": "582"
                },
                {
                    "symbol": "BNT",
                    "weight": "50%",
                    "balance": "2817"
                }
            ]
        }
    ],
    "liquidityProtectionParams": {
        "minNetworkTokenLiquidityForMinting": "100",
        "defaultNetworkTokenMintingLimit": "750",
        "minProtectionDelay": 600,
        "maxProtectionDelay": 3600,
        "lockDuration": 60,
        "converters": ["ETHBNT", "BBSBNT"]
    }
}
EOF

echo DEPLOYING BANCOR ENV
deployment_log="$(echo 1 | node ./test_deployment.js \
     config.json \
     http://localhost:8545 \
     $account)"
echo "$deployment_log"
BANCOR_ENV_REGISTRY="$(grep -o '(?<=contractRegistry deployed at )0x.*' <<<"$deployment_log")"
BANCOR_ENV_BANCOR_X="$(grep -o '(?<=bancorX deployed at )0x.*' <<<"$deployment_log")"
BANCOR_ENV_BBS_TOKEN="$bbs_token"
export BANCOR_ENV_REGISTRY
export BANCOR_ENV_BANCOR_X
export BANCOR_ENV_BBS_TOKEN
echo "BANCOR_ENV_REGISTRY=$BANCOR_ENV_REGISTRY"
echo "BANCOR_ENV_BANCOR_X=$BANCOR_ENV_BANCOR_X"
echo "BANCOR_ENV_BBS_TOKEN=$BANCOR_ENV_BBS_TOKEN"
popd

echo RUNNING TESTS
npx hardhat --network localhost test ./test/bridge-test.js
popd
