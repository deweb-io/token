#!/usr/bin/env bash
testdir=bancor_test_env
if ! [ -d $testdir ]; then
    git clone --depth=1 https://github.com/bancorprotocol/contracts-solidity.git $testdir
    pushd $testdir
    export NODE_OPTIONS="--max-old-space-size=4096"
    npm install --force
    npm run build
    npm run export
    popd
fi

pushd $testdir/solidity/utils/
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

echo RUNNING GANACHE
account=0x0000000000000000000000000000000000000000000000000000000000000001
yarn ganache-cli \
     --port=8545 \
     --gasLimit=6721975 \
     --account=$account,10000000000000000000000000000000000000000 &
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

echo DEPLOYING
deployment_log="$(echo 1 | node ./test_deployment.js \
     config.json \
     http://localhost:8545 \
     $account)"
echo "$deployment_log"

popd

echo RUNNING TESTS
set -x
BANCOR_ENV_REGISTRY="$(grep -Po '(?<=contractRegistry deployed at )0x.*' <<<"$deployment_log")" npx hardhat --network localhost test
