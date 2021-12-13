#!/usr/bin/env bash

pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh

DECIMALS_SUFFIX='0000';

config=$(cat ../../scripts/deployment/config.js | sed 's/module.exports = //');
EOS_BRIDGE_MIN_REPORTERS=$(from_json .bridge.minRequiredReports "$config");
EOS_BRIDGE_MIN_LIMIT=$(from_json .bridge.minLimit "$config")"$DECIMALS_SUFFIX";
EOS_BRIDGE_LIMIT_INC=$(from_json .bridge.limitIncPerBlock "$config")"$DECIMALS_SUFFIX";
EOS_BRIDGE_MAX_ISSUE_LIMIT=$(from_json .bridge.maxLockLimit "$config")"$DECIMALS_SUFFIX"; # lock on eth = issue on eos
EOS_BRIDGE_MAX_DESTROY_LIMIT=$(from_json .bridge.maxReleaseLimit "$config")"$DECIMALS_SUFFIX"; # release on eth = destroy on eos
EOS_REWARDS_RECEIVER=$(from_json .bridge.sendRewards.toAccount "$config");
EOS_BRIDGE_MAX_REWARDS_ISSUE_LIMIT=$(from_json .bridge.sendRewards.maxLockLimit "$config")"$DECIMALS_SUFFIX";

if [ ! -f BancorX.wasm ]; then
    eosio-cpp -I include -o BancorX.wasm BancorX/BancorX.cpp --abigen
fi

echo -e "${GREEN}----DEPLOYING BRIDGE----${NC}"
kleos set contract $bridge_account . ./BancorX.wasm ./BancorX.abi -p $bridge_account@active

echo -e "${GREEN}----INIT BRIDGE----${NC}"
kleos push action $bridge_account init '["'$bbs_account'", "'$EOS_BRIDGE_MIN_REPORTERS'", "'$EOS_BRIDGE_MIN_LIMIT'", "'$EOS_BRIDGE_LIMIT_INC'", "'$EOS_BRIDGE_MAX_ISSUE_LIMIT'", "'$EOS_BRIDGE_MAX_DESTROY_LIMIT'", "'$EOS_REWARDS_RECEIVER'", "'$EOS_BRIDGE_MAX_REWARDS_ISSUE_LIMIT'"]' -p $bridge_account@active

echo -e "${GREEN}----ADD/ENABLE REPORTING-----${NC}"
kleos push action $bridge_account addreporter '["'$reporter_account'"]' -p $bridge_account@active
kleos push action $bridge_account enablerpt '[true]' -p $bridge_account@active
kleos push action $bridge_account enablext '[true]' -p $bridge_account@active
kleos get table $bridge_account $bridge_account settings

popd