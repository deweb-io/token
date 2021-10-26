#!/usr/bin/env bash

pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh

# token abi and wasm files were compiled like here:
# https://github.com/deweb-io/token/commit/960d852fab3efa380293c74fd8fbafd1ac245931#diff-efbb5450f4528e0dd33ff1873f52a175e8f280eb591c6725a1227b9aec8eac0e

echo -e "${GREEN}----DEPLOYING BBS CONTRACT----${NC}"
kleos set contract $bbs_account . ./eosio.token.wasm ./eosio.token.abi -p $bbs_account@active
echo -e "${GREEN}----DEPLOYING BBS CONTRACT DONE!----${NC}"

popd