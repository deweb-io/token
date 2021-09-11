#!/usr/bin/env bash
. env.sh

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "${GREEN}-----------------------BBS BALANCE for $account -----------------------${NC}"
kleos get currency balance $bbs_account $account