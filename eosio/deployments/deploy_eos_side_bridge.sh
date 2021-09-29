#!/usr/bin/env bash
# This script is used to deploy our BBS bridge on the eos side
pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh

echo DEPLOYING EOS...

# import keys to cleos
. import_keys.sh

# deploy BBS token
. deploy_token.sh

# deploy bridge
. deploy_bridge.sh

echo DONE!
popd
