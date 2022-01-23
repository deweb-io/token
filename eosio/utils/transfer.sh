#!/usr/bin/env bash
pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh

. print_bbs_balance.sh

echo -e "${GREEN}----TRANSFER $1 from $bridge_account to $account ----${NC}"
kleos push action $bbs_account transfer '["'$bridge_account'", "'$account'", "'$1' BBS", "memo"]' -p $bridge_account@active

popd