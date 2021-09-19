#!/usr/bin/env bash
. env.sh

ethereum_account='0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
xtransfer_amount='1.0000 BBS'

. print_bbs_balance.sh

echo -e "${GREEN}----X TRANSFER from $account to $ethereum_account ----${NC}"
kleos push action $bbs_account transfer '["'$account'", "'$bridge_account'", "1.0000 BBS", "1.1,ethereum,'$ethereum_account',"0""]' -p $account@active

. print_bbs_balance.sh
