#!/usr/bin/env bash
. env.sh

ethereum_account='0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
xtransfer_amount='1.0000 BBS'

# bridge_min_reporters='1'
# bridge_min_limit='10000'
# bridge_limit_inc='10000'
# bridge_max_issue_limit='800000000'
# bridge_max_destroy_limit='400000000'


# kleos push action $bridge_account update '["1", "10000", "10000", "800000000", "400000000"]' -p $bridge_account@active
# kleos get table $bridge_account $bridge_account settings


echo "${GREEN}-----------------------BALANCE-----------------------${NC}"
# kleos get currency balance $bbs_account $bridge_account

# kleos push action $bbs_account transfer '["'$bridge_account'","'$account'","10.0000 BBS",""]' -p $bridge_account@active

# kleos get currency balance $bbs_account $bridge_account

kleos get currency balance $bbs_account $account

echo "${GREEN}-----------------------X TRANSFER-----------------------${NC}"
kleos push action $bbs_account transfer '["'$account'", "'$bridge_account'", "1.0000 BBS", "1.1,ethereum,'$ethereum_account',"0""]' -p $account@active

# echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
# kleos get currency balance $bbs_account $bridge_account

kleos get currency balance $bbs_account $account