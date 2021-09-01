#!/usr/bin/env bash
# This script is used to deploy our BBS bridge on the eos side

pushd "$(dirname "${BASH_SOURCE[0]}")"

# envs TODO: remove to env.sh
export EOS_BBS_TOKEN_MAXIMUM_SUPPLY='1000000.0000 BBS'
export EOS_BBS_TOKEN_ISSUE_AMOUNT='100.0000 BBS'
export EOS_BRIDGE_MIN_REPORTERS='1'
export EOS_BRIDGE_MIN_LIMIT='10000'
export EOS_BRIDGE_LIMIT_INC='10000'
export EOS_BRIDGE_MAX_ISSUE_LIMIT='800000000'
export EOS_BRIDGE_MAX_DESTROY_LIMIT='400000000'


# deploy eos contracts
echo DEPLOYING EOS...

# create all necessary accounts if needed
. create_accounts.sh

# deploy BBS token
#. deploy_token.sh

# deploy bridge
# . deploy_bridge.sh
popd
echo DONE EOS!