#!/usr/bin/env bash
pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh
popd

echo -e "${GREEN}---- Burn supply ----${NC}"
#Bridge account is the issuer, so need its permission.
kleos push action $bbs_account retire '["'$1'.0000 BBS", "memo"]' -p $bridge_account@active