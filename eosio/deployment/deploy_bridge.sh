#!/usr/bin/env bash

pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh

# contract from: https://github.com/bancorprotocol/contracts_eos/eos/BancorX

echo -e "${GREEN}----DEPLOYING BRIDGE----${NC}"
kleos set contract $bridge_account . ./BancorX.wasm ./BancorX.abi -p $bridge_account@active

echo -e "${GREEN}----INIT BRIDGE----${NC}"
kleos push action $bridge_account init '["'$bbs_account'", "'$EOS_BRIDGE_MIN_REPORTERS'", "'$EOS_BRIDGE_MIN_LIMIT'", "'$EOS_BRIDGE_LIMIT_INC'", "'$EOS_BRIDGE_MAX_ISSUE_LIMIT'", "'$EOS_BRIDGE_MAX_DESTROY_LIMIT'"]' -p $bridge_account@active

echo -e "${GREEN}----ADD/ENABLE REPORTING-----${NC}"
kleos push action $bridge_account addreporter '["'$reporter_account'"]' -p $bridge_account@active
kleos push action $bridge_account enablerpt '[true]' -p $bridge_account@active
kleos push action $bridge_account enablext '[true]' -p $bridge_account@active
kleos get table $bridge_account $bridge_account settings

popd