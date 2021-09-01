# ethereum_account='0x44569Aa35Ff6d97e6531880712a41D2af72a007C'
# xtransfer_amount='1.0000 BBS'

# bridge_min_reporters='1'
# bridge_min_limit='10000'
# bridge_limit_inc='10000'
# bridge_max_issue_limit='800000000'
# bridge_max_destroy_limit='400000000'


# kleos push action $bridge_account update '["1", "10000", "10000", "800000000", "400000000"]' -p $bridge_account@active
# kleos get table $bridge_account $bridge_account settings


# echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
# kleos get currency balance $bbs_account $account BBS

# echo -e "${GREEN}-----------------------X TRANSFER-----------------------${NC}"
# kleos push action $bbs_account transfer '["'$account'", "'$bridge_account'", "'$xtransfer_amount'", "1.1,ethereum,'$ethereum_account','$RANDOM'"]' -p $account@active

# echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
# kleos get currency balance $bbs_account $account BBS