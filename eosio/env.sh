# This file is meant to be sourced to get our environment going.
pushd "$(dirname "${BASH_SOURCE[0]}")"

set -a
. state.env
. bbs.env
set +a

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'

store() {
    local -n variable=$1
    variable="$2"
    echo "$1='$variable'" >> state.env
}

kleos() {
    if [ "$NODEOS" ]; then
        cleos -u "$NODEOS" "$@"
    else
        cleos "$@"
    fi
}

from_json() {
    node -pe "JSON.parse(process.argv[1])$1" "$2"
}

echo making sure we have an unlocked wallet
if cleos wallet list | grep '\[\]' > /dev/null; then
    cleos wallet open 2>/dev/null || \
        store cleos_password "$(cleos wallet create --to-console | tail -1 | cut -d'"' -f2)"
fi
cleos wallet list | grep ' \*"$' || cleos wallet unlock --password "$cleos_password"
popd
