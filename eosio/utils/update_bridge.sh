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

echo -e "${GREEN}----UPDATE BRIDGE----${NC}"
kleos push action $bridge_account update '["'$EOS_BRIDGE_MIN_REPORTERS'", "'$EOS_BRIDGE_MIN_LIMIT'", "'$EOS_BRIDGE_LIMIT_INC'", "'$EOS_BRIDGE_MAX_ISSUE_LIMIT'", "'$EOS_BRIDGE_MAX_DESTROY_LIMIT'", "'$EOS_REWARDS_RECEIVER'", "'$EOS_BRIDGE_MAX_REWARDS_ISSUE_LIMIT'"]' -p $bridge_account@active

popd