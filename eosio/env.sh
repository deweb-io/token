# This file is meant to be sourced to get our environment going.
set -a
. generated.env
. bbs.env
set +a

store() {
    local -n variable=$1
    variable="$2"
    echo "$1='$variable'" >> generated.env
}

kleos() {
    if [ "$nodeos" ]; then
        cleos -u "$nodeos" "$@"
    else
        cleos "$@"
    fi
}

from_json() {
    node -pe "JSON.parse(process.argv[1])$1" $2
}

echo making sure we have an unlocked wallet
if cleos wallet list | grep '\[\]' > /dev/null; then
    cleos wallet open 2>/dev/null || \
        store cleos_password "$(cleos wallet create --to-console | tail -1 | cut -d'"' -f2)"
fi
cleos wallet list | grep ' \*"$' || cleos wallet unlock --password "$cleos_password"
