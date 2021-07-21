#!/usr/bin/env bash
testdir=bancor_test_env

if grep linux <<<"$OSTYPE" > /dev/null; then
    is_linux=yes
    get_deployment_address(){
        grep -Po "(?<=$1 deployed at )0x[^ ]*"
    }
else
    is_linux=''
    get_deployment_address(){
        grep "$1 deployed at 0x" | grep -o '0x[^ ]*'
    }
fi

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
    if [ "$is_linux" ]; then
        echo KILLING GANACHE
        kill $(ps --ppid $(ps --ppid $ganache_pid -o pid=) -o pid=)
    else
        echo 'RETURNING TO GANACHE (hit ctrl+c to quit)'
        fg
    fi
    echo
}
trap cleanup EXIT
sleep 5

echo DEPLOYING TOKEN
bbs_token="$(npx hardhat --network localhost run ./scripts/deploy_token.js | get_deployment_address token)"

echo MODIFYING DEPLOYMENT SCRIPT
pushd $testdir/solidity/utils/
deploy_script="$(sed '162q' test_deployment.js)
    // deploy bancorX
    const bancorX = await web3Func(deploy, 'bancorX', 'BancorX', [
        '40000000000000000000000',
        '80000000000000000000000',
        '1000000000000000000',
        '500000000000000000000',
        1,
        contractRegistry._address,
        '$bbs_token'
    ]);

    // register bancorX
    await execute(contractRegistry.methods.registerAddress(Web3.utils.asciiToHex('BancorX'), bancorX._address));

    const REPORTER1_ADDRESS = '0x41C87AC77a3ec4E192F0f3a0c598f8027Ec16177';
    // const REPORTER1_PRIVATE_KEY = '0xe427e1a30d344c90f0b3884df1e58273ee7b6084c055bcc84090e2915967d8c6';
    await execute(bancorX.methods.setReporter(REPORTER1_ADDRESS, true));

    web3.currentProvider.disconnect();
};

run();"
echo "$deploy_script" > test_deployment.js
echo '{"reserves": [], "converters": []}' > config.json

echo DEPLOYING BANCOR ENV
deployment_log="$(echo 1 | node ./test_deployment.js \
     config.json \
     http://localhost:8545 \
     $account)"
echo "$deployment_log"
BANCOR_ENV_REGISTRY="$(get_deployment_address contractRegistry <<<"$deployment_log")"
BANCOR_ENV_BANCOR_X="$(get_deployment_address bancorX <<<"$deployment_log")"
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
