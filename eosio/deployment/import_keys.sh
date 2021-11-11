#!/usr/bin/env bash
# This script imports private keys to cleos wallet.
pushd "$(dirname "${BASH_SOURCE[0]}")"
echo IMPORTING KEYS...
awk -F= '$1 ~ /_private_key$/ {print $2}' < ../state.env | xargs -n1 cleos wallet import --private-key
echo DONE!
popd
