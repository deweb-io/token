#!/usr/bin/env bash
. env.sh

echo -e "${GREEN}----BBS BALANCE for user account $account----${NC}"
kleos get currency balance $bbs_account $account

echo -e "${GREEN}----BBS BALANCE for bridge account $bridge_account----${NC}"
kleos get currency balance $bbs_account $bridge_account