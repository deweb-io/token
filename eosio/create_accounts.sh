#!/usr/bin/env bash
# Create and fund a test account if needed.


# . env.sh

name_maker() {
    shuf -zern12 {1..5} {a..z} {a..z} {a..z} | tr -d '\0'
}

store_env() {
    echo "$1='$2'" >> state.env
}

# create bbs account if not exist and fund it.
if [ ! "$bbs_account" ]; then
    bbs_account="$(name_maker)"
    store_env bbs_account $bbs_account

    echo creating bbs_account $bbs_account
    creation_response="$(curl -s "$faucet/create/$bbs_account")"
    if [ "$(from_json .success "$creation_response")" = false ]; then
        echo "failed creation: $creation_response" 1>&2
        exit 1
    fi
    bbs_owner_private_key="$(from_json .data.account.owner.privateKey "$creation_response")"
    store_env bbs_owner_private_key $bbs_owner_private_key
    bbs_active_private_key="$(from_json .data.account.active.privateKey "$creation_response")"
    store_env bbs_active_private_key $bbs_active_private_key
    bbs_active_public_key="$(from_json .data.account.active.publicKey "$creation_response")"
    store_env bbs_active_public_key $bbs_active_public_key
    kleos wallet import --private-key "$bbs_owner_private_key"
    kleos wallet import --private-key "$bbs_active_private_key"
    echo account created $bbs_account

    echo funding account $bbs_account
    funding_response="$(curl -s "$faucet/get_token/$bbs_account")"
    if [ "$(from_json .success "$funding_response")" = false ]; then
        echo "failed funding: $funding_response" 1>&2
        exit 1
    fi
    kleos system buyram $bbs_account $bbs_account "10.0000 EOS" -p $bbs_account@active
    echo account funded $bbs_account
fi

# create bancorX account if not exist with the same key pair of bbs account
if [ ! "$bancorx_account" ]; then
    bancorx_account="$(name_maker)"
    store_env bancorx_account $bancorx_account

    echo creating bancorx_account $bancorx_account
    kleos system newaccount $bbs_account $bancorx_account $bbs_active_public_key --stake-cpu "10 EOS" --stake-net "5 EOS" --buy-ram-kbytes 5000 --transfer
    echo account created $bancorx_account
fi

# create reporter account if not exist
if [ ! "$reporter_account" ]; then
    reporter_account="$(name_maker)"
    store_env reporter_account $reporter_account

    echo creating reporter_account $reporter_account
    creation_response="$(curl -s "$faucet/create/$reporter_account")"
    if [ "$(from_json .success "$creation_response")" = false ]; then
        echo "failed creation: $creation_response" 1>&2
        exit 1
    fi
    reporter_owner_private_key="$(from_json .data.account.owner.privateKey "$creation_response")"
    store_env reporter_owner_private_key $reporter_owner_private_key
    reporter_active_private_key="$(from_json .data.account.active.privateKey "$creation_response")"
    store_env reporter_active_private_key $reporter_active_private_key
    kleos wallet import --private-key "$reporter_owner_private_key"
    kleos wallet import --private-key "$reporter_active_private_key"
    echo account created $reporter_account

    echo funding account $reporter_account
    funding_response="$(curl -s "$faucet/get_token/$reporter_account")"
    if [ "$(from_json .success "$funding_response")" = false ]; then
        echo "failed funding: $funding_response" 1>&2
        exit 1
    fi
    kleos system buyram $reporter_account $reporter_account "10.0000 EOS" -p $reporter_account@active
    echo account funded $reporter_account
fi

# create reporter account if not exist
if [ ! "$account" ]; then
    account="$(name_maker)"
    store_env account $account

    echo creating account $account
    creation_response="$(curl -s "$faucet/create/$account")"
    if [ "$(from_json .success "$creation_response")" = false ]; then
        echo "failed creation: $creation_response" 1>&2
        exit 1
    fi
    account_owner_private_key="$(from_json .data.account.owner.privateKey "$creation_response")"
    store_env account_owner_private_key $account_owner_private_key
    account_active_private_key="$(from_json .data.account.active.privateKey "$creation_response")"
    store_env account_active_private_key $account_active_private_key
    kleos wallet import --private-key "$account_owner_private_key"
    kleos wallet import --private-key "$account_active_private_key"
    echo account created $account

    echo funding account $account
    funding_response="$(curl -s "$faucet/get_token/$account")"
    if [ "$(from_json .success "$funding_response")" = false ]; then
        echo "failed funding: $funding_response" 1>&2
        exit 1
    fi
    kleos system buyram $account $account "10.0000 EOS" -p $account@active
    echo account funded $account
fi
