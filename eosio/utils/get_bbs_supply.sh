#!/usr/bin/env bash
pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh
popd

echo -e "${GREEN}---- Get supply of BBS ----${NC}"
kleos get currency stats $bbs_account BBS