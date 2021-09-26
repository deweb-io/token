#!/usr/bin/env bash
# This script is USED ONLY FOR TESTING. accounts for production are being created maunally.
# Create and fund a test accounts if needed.
pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh
popd

name_maker() {
    echo "$(shuf -zern1 {a..z} | tr -d '\0')$(shuf -zern11 {1..5} {a..z} {a..z} | tr -d '\0')"
}

store_env() {
    echo "$1='$2'" >> state.env
}

account_maker() {
    # echo creating account $1
    echo -e "${GREEN}----creating account $1----${NC}"
    creation_response="$(curl -s "$FAUCET/create/$1")"
    if [ "$(from_json .success "$creation_response")" = false ]; then
        echo "failed creation: $creation_response" 1>&2
        exit 1
    fi
    # import keys and store them just in case something went wrong
    owner_private_key="$(from_json .data.account.owner.privateKey "$creation_response")"
    store_env $1_owner_private_key "$owner_private_key"
    active_private_key="$(from_json .data.account.active.privateKey "$creation_response")"
    store_env $1_active_private_key "$active_private_key"
    active_public_key="$(from_json .data.account.active.publicKey "$creation_response")"
    store_env $1_active_public_key "$active_public_key"
    kleos wallet import --private-key "$owner_private_key"
    kleos wallet import --private-key "$active_private_key"
    echo -e "${GREEN}----account created $1----${NC}"
}

account_funder() {
    echo funding account $1
    echo -e "${GREEN}----funding account $1----${NC}"
    funding_response="$(curl -s "$FAUCET/get_token/$1")"
    if [ "$(from_json .success "$funding_response")" = false ]; then
        echo "failed funding: $funding_response" 1>&2
        exit 1
    fi
    kleos system buyram $1 $1 "10.0000 EOS" -p $1@active
    echo -e "${GREEN}----account funded $1----${NC}"
    echo account funded $1
}

# create bbs account if not exist and fund it.
if [ ! "$bbs_account" ]; then
    read -p "No bbs_account was configured. Do you want to create a new one (yes/no)?" ans
    if [[ "yes" == "$ans" ]]; then
        bbs_account="$(name_maker)"
        store_env bbs_account $bbs_account

        kleos get account $bbs_account > /dev/null || account_maker $bbs_account

        [ "$(kleos get currency balance eosio.token $bbs_account)" ] || account_funder $bbs_account
    fi
fi

# create bridge account if not exist with the same key pair of bbs account
if [ ! "$bridge_account" ]; then
    read -p "No bridge_account was configured. Do you want to create a new one (yes/no)?" ans
    if [[ "yes" == "$ans" ]]; then
        bridge_account="$(name_maker)"
        store_env bridge_account $bridge_account

        bbs_active_public_key="$(cat state.env | grep "${bbs_account}_active_public_key" | sed 's/.*=//' | sed 's/^.//;s/.$//')"
        kleos system newaccount $bbs_account $bridge_account "$bbs_active_public_key" --stake-cpu "10 EOS" --stake-net "5 EOS" --buy-ram-kbytes 5000 --transfer
    fi
fi

# create reporter account if not exist
if [ ! "$reporter_account" ]; then
    read -p "No reporter_account was configured. Do you want to create a new one (yes/no)?" ans
    if [[ "yes" == "$ans" ]]; then
        reporter_account="$(name_maker)"
        store_env reporter_account $reporter_account

        kleos get account $reporter_account > /dev/null || account_maker $reporter_account

        [ "$(kleos get currency balance eosio.token $reporter_account)" ] || account_funder $reporter_account
    fi
fi


# create user account if not exist
if [ ! "$account" ]; then
    read -p "No user account was configured. Do you want to create a new one (yes/no)?" ans
    if [[ "yes" == "$ans" ]]; then
        account="$(name_maker)"
        store_env account $account

        kleos get account $account > /dev/null || account_maker $account

        [ "$(kleos get currency balance eosio.token $account)" ] || account_funder $account

        # ensure bbs_account has enough eos
        kleos push action eosio.token transfer '["'$account'","'$bbs_account'","70.0000 EOS",""]' -p $account@active
    fi
fi


# buy ram for bbs and bridge accounts
read -p "Buy Ram to bbs and bridge accounts?" ans
if [[ "yes" == "$ans" ]]; then
    kleos system buyram $bbs_account $bbs_account "10.0000 EOS" -p $bbs_account@active
    kleos system buyram $bbs_account $bridge_account "10.0000 EOS" -p $bbs_account@active
fi