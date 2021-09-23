#!/usr/bin/env bash
# Create and fund a test account if needed.
. env.sh

name_maker() {
    shuf -zern12 {1..5} {a..z} {a..z} {a..z} | tr -d '\0'
}

if [ ! "$account" ]; then
    store account "$(name_maker)"
fi

account_maker() {
    echo creating account $1
    creation_response="$(curl -s "$FAUCET/create/$1")"
    if [ "$(from_json .success "$creation_response")" = false ]; then
        echo "failed creation: $creation_response" 1>&2
        exit 1
    fi
    store owner_private_key "$(from_json .data.account.owner.privateKey "$creation_response")"
    store active_private_key "$(from_json .data.account.active.privateKey "$creation_response")"
    kleos wallet import --private-key "$owner_private_key"
    kleos wallet import --private-key "$active_private_key"
    echo account created $1
}

kleos get account $account > /dev/null || account_maker $account

account_funder() {
    echo funding account $1
    funding_response="$(curl -s "$FAUCET/get_token/$account")"
    if [ "$(from_json .success "$funding_response")" = false ]; then
        echo "failed funding: $funding_response" 1>&2
        exit 1
    fi
    kleos system buyram $account $account "10.0000 EOS" -p $account@active
    echo account funded $1
}

[ "$(kleos get currency balance eosio.token $account)" ] || account_funder $account
