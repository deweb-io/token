#!/usr/bin/env bash
. env.sh

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo $EOS_BBS_TOKEN_ISSUE_AMOUNT

echo "${GREEN}-----------------------BALANCE BEFORE ISSUE-----------------------${NC}"
kleos get currency balance $bbs_account $bridge_account

echo "${GREEN}-----------------------ISSUING BBS-----------------------${NC}"
kleos push action $bbs_account issue '[ "'$bridge_account'", "'$EOS_BBS_TOKEN_ISSUE_AMOUNT'", "memo" ]' -p $bridge_account@active

echo "${GREEN}-----------------------BALANCE AFTER ISSUE-----------------------${NC}"
kleos get currency balance $bbs_account $bridge_account