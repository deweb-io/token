#!/usr/bin/env bash
pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh

. print_bbs_balance.sh

echo -e "${GREEN}----X TRANSFER from $account to $2 ----${NC}"
kleos push action $bbs_account transfer '["'$account'", "'$bridge_account'", "'$1' BBS", "1.1,ethereum,'$2',"0""]' -p $account@active

popd