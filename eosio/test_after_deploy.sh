    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $bbs_account $bridge_account

    echo -e "${GREEN}-----------------------ISSUING BBS-----------------------${NC}"
    kleos push action $bbs_account issue '[ "'$bridge_account'", "'$EOS_BBS_TOKEN_ISSUE_AMOUNT'", "memo" ]' -p $bridge_account@active

    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $bbs_account $bridge_account