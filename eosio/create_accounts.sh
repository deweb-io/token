#!/usr/bin/env bash
# Create and fund a test accounts if needed.


. env.sh

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'

name_maker() {
    shuf -zern12 {1..5} {a..z} {a..z} {a..z} | tr -d '\0'
}

store_env() {
    echo "$1='$2'" >> state.env
}

account_maker() {
    # echo creating account $1
    echo -e "${GREEN}-----------------------creating account $1-----------------------${NC}"
    creation_response="$(curl -s "$faucet/create/$1")"
    if [ "$(from_json .success "$creation_response")" = false ]; then
        echo "failed creation: $creation_response" 1>&2
        exit 1
    fi
    # import keys and store them just in case something went wrong
    owner_private_key="$(from_json .data.account.owner.privateKey "$creation_response")"
    store_env owner_private_key $owner_private_key
    active_private_key="$(from_json .data.account.active.privateKey "$creation_response")"
    store_env active_private_key $active_private_key
    active_public_key="$(from_json .data.account.active.publicKey "$creation_response")"
    store_env active_public_key $active_public_key
    kleos wallet import --private-key "$owner_private_key"
    kleos wallet import --private-key "$active_private_key"
    echo -e "${GREEN}-----------------------account created $1-----------------------${NC}"
    # echo account created $1
}

account_funder() {
    echo funding account $1
    echo -e "${GREEN}-----------------------funding account $1-----------------------${NC}"
    funding_response="$(curl -s "$faucet/get_token/$1")"
    if [ "$(from_json .success "$funding_response")" = false ]; then
        echo "failed funding: $funding_response" 1>&2
        exit 1
    fi
    kleos system buyram $1 $1 "10.0000 EOS" -p $1@active
    echo -e "${GREEN}-----------------------account funded $1-----------------------${NC}"
    # echo account funded $1
}

# create bbs account if not exist and fund it.
if [ ! "$bbs_account" ]; then
    bbs_account="$(name_maker)"
    store_env bbs_account $bbs_account

    kleos get account $bbs_account > /dev/null || account_maker $bbs_account

    [ "$(kleos get currency balance eosio.token $bbs_account)" ] || account_funder $bbs_account
fi

# create bancorX account if not exist with the same key pair of bbs account
if [ ! "$bancorx_account" ]; then
    bancorx_account="$(name_maker)"
    store_env bancorx_account $bancorx_account

    # echo creating bancorx_account $bancorx_account
    echo -e "${GREEN}-----------------------creating bancorx_account $bancorx_account-----------------------${NC}"
    kleos system newaccount $bbs_account $bancorx_account $bbs_active_public_key --stake-cpu "10 EOS" --stake-net "5 EOS" --buy-ram-kbytes 5000 --transfer
    echo -e "${GREEN}-----------------------account created $bancorx_account-----------------------${NC}"
    # echo account created $bancorx_account
fi

# create reporter account if not exist
if [ ! "$reporter_account" ]; then
    reporter_account="$(name_maker)"
    store_env reporter_account $reporter_account

    kleos get account $reporter_account > /dev/null || account_maker $reporter_account

    [ "$(kleos get currency balance eosio.token $reporter_account)" ] || account_funder $reporter_account
fi

# create user account if not exist
if [ ! "$account" ]; then
    account="$(name_maker)"
    store_env account $account

    kleos get account $account > /dev/null || account_maker $account

    [ "$(kleos get currency balance eosio.token $account)" ] || account_funder $account
fi
