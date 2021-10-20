# Calculates estimation of total deployment fee on ethereum
CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'

GWEI_TO_ETH="1000000000"

calc_gas_price_in_eth() {
    bc <<< "scale = 9; "$1" * "$2" / ${GWEI_TO_ETH}"
}

calc_gas_price_in_usd() {
    bc <<< ""$1" * "$2""
}

add() {
    bc <<< ""$1" + "$2""
}

from_json() {
    node -pe "JSON.parse(process.argv[1])$1" "$2" # ִrunning node process so $2 will get into process.argv[1]
}

echo -e "${CYAN}ETH price${NC}"
coinbase_response=$(curl -s https://api.coinbase.com/v2/exchange-rates?currency=ETH)
eth_usd_price="$(from_json .data.rates.USD "$coinbase_response")"
echo $eth_usd_price USD

echo -e "${CYAN}Avg gas price from ethgasstation${NC}"
ethgasstation_response=$(curl -s https://ethgasstation.info/api/ethgasAPI.json)
avg_gas_price_in_gwei="$(expr $(from_json .average "$ethgasstation_response") / 10)" # divide by 10 to get price in Gwei: https://docs.ethgasstation.info/gas-price#gas-price
echo $avg_gas_price_in_gwei Gwei


# get gas report using hardhat
gas_report_bbs_token="$(REPORT_GAS=true npx hardhat test test/bbsToken-test.js 2>/dev/null)"
gas_report_bridge="$(REPORT_GAS=true npx hardhat test test/bridge-test.js 2>/dev/null)"
gas_report_staking="$(REPORT_GAS=true npx hardhat test test/staking-test.js 2>/dev/null)"

totalFeeETH="0.0"
totalFeeUSD="0.0"

# $1 is the number of gas units
accumulateFee() {
    gas_price_eth="$(calc_gas_price_in_eth $1 $avg_gas_price_in_gwei)"
    gas_price_usd="$(calc_gas_price_in_usd $gas_price_eth $eth_usd_price)"
    echo $1 gas units "|" "0"$gas_price_eth ETH "|" $gas_price_usd USD
    totalFeeETH=$(add $totalFeeETH "0"$gas_price_eth)
    totalFeeUSD=$(add $totalFeeUSD $gas_price_usd)
}

getDeploymentFee() {
    echo -e "${CYAN}{$2} expected deployment gas price${NC}"
    contract_deployment_gas_unit="$(echo "'$1'" | awk '$2 == "'$2'" {print $8}')"
    accumulateFee $contract_deployment_gas_unit
}

getFunctionCallFee() {
    echo -e "${CYAN}{$2} expected function call gas price${NC}"
    function_call_gas_unit="$(echo "$1" | awk '$4 == "'$2'" {print $10}')"
    accumulateFee $function_call_gas_unit
}

# Own contracts #
getDeploymentFee "$gas_report_bbs_token" "BBSToken"             # BBS token deploy
getFunctionCallFee "$gas_report_bbs_token" "mint"               # BBS minting
getFunctionCallFee "$gas_report_bbs_token" "transferOwnership"  # transfer BBS ownership to Gnosis

getDeploymentFee "$gas_report_bridge" "Bridge"                  # Bridge deploy
getFunctionCallFee "$gas_report_bridge" "setReporters"          # set bridge reporters

getDeploymentFee "$gas_report_staking" "Staking"                # Staking deploy
getFunctionCallFee "$gas_report_staking" "approve"              # approve Staking spending of BBS
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q1
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q2
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q3
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q4
getFunctionCallFee "$gas_report_bbs_token" "transferOwnership"  # transfer Staking ownership to Gnosis

# Third parties #
echo -e "${CYAN}{Multisend-approve} expected function call gas price${NC}"
accumulateFee '46274'  # Multisend approve (https://ropsten.etherscan.io/tx/0xcb813d20378d25e6bf9a3924a5bccaaa4fd7cd60781c25d61751ff1ca09a62f2)

echo -e "${CYAN}{Multisend-transfer} expected function call gas price${NC}"
accumulateFee '110484' # Multisend transfer (https://ropsten.etherscan.io/tx/0xb71446904c619006bf5ca9f06472a45bf573b68911e7530e22d2e17dcbefec26)

echo -e "${CYAN}{Gnosis-safe: createProxyWithNonce} expected function call gas price${NC}"
accumulateFee '258606' # Gnosis-safe create (https://rinkeby.etherscan.io/tx/0xbbb8e8df0cb56711e701f5df901752ed2c8cada49607337d70ecfcd02915163d)

echo -e "${GREEN}0"$totalFeeETH" ETH${NC}"
echo -e "${GREEN}"$totalFeeUSD" USD${NC}"
