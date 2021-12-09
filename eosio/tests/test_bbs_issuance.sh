#!/usr/bin/env bash
pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh
popd

echo -e "${GREEN}----BALANCE BEFORE ISSUE----${NC}"
kleos get currency balance $bbs_account $bridge_account

echo -e "${GREEN}----ISSUING BBS----${NC}"
kleos push action $bbs_account issue '[ "'$bridge_account'", "100.0000 BBS", "memo" ]' -p $bridge_account@active

echo -e "${GREEN}----BALANCE AFTER ISSUE----${NC}"
kleos get currency balance $bbs_account $bridge_account