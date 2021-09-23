#!/usr/bin/env bash
# This script is used to deploy our BBS bridge on the eos side

pushd "$(dirname "${BASH_SOURCE[0]}")"

. env.sh

# deploy eos contracts
echo DEPLOYING EOS...

# create all necessary accounts if needed
. create_accounts.sh

# deploy BBS token
. deploy_token.sh

# deploy bridge
. deploy_bridge.sh

popd
echo DONE EOS!