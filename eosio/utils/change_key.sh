#!/usr/bin/env bash
# Change the private key that controls a role in an account by giving a new public key.
# Of course cleos must have access to the private key that currently controls the account (with owner privileges).
ACCOUNT_NAME="${1:-rjyqmacwqxbc}"
ACCOUNT_ROLE="${2:-active}"
NEW_PUBKEY="${3:-EOS7SHXttKo3v8KMRstGxBZdGzmBTPE6ivgQo8vtcXrYdXGbiUniU}"
# The private key for this pubkey is 5Jgc6K3nsqTbNQBcpyqYqYr3tneMwHNC4rknAfy4b6pkeiaRdbh
# Use `cleos wallet import --private-key 5Jgc6K3nsqTbNQBcpyqYqYr3tneMwHNC4rknAfy4b6pkeiaRdbh` to use it.
echo "cleos set account permission $ACCOUNT_NAME $ACCOUNT_ROLE $NEW_PUBKEY -p $ACCOUNT_NAME@owner"
