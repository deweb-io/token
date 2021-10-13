# this script is calculating gas prices for contracts deployment and report tx

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
avg_gas_price="$(expr $(from_json .average "$ethgasstation_response") / 10)" # divide by 10 to get price in Gwei: https://docs.ethgasstation.info/gas-price#gas-price
echo $avg_gas_price Gwei


# get gas report using hardhat
gas_report_bbs_token="$(REPORT_GAS=true npx hardhat test test/bbsToken-test.js 2>/dev/null)"
gas_report_bridge="$(REPORT_GAS=true npx hardhat test test/bridge-test.js 2>/dev/null)"
gas_report_staking="$(REPORT_GAS=true npx hardhat test test/staking-test.js 2>/dev/null)"

totalFeeETH="0.0"
totalFeeUSD="0.0"

getDeploymentFee() {
    echo -e "${CYAN}{$2} expected deployment gas price${NC}"
    contract_deployment_gas_unit="$(echo "'$1'" | awk '$2 == "'$2'" {print $8}')"
    contract_deployment_gas_price_eth="$(calc_gas_price_in_eth $contract_deployment_gas_unit $avg_gas_price)"
    contract_deployment_gas_price_usd="$(calc_gas_price_in_usd $contract_deployment_gas_price_eth $eth_usd_price)"
    echo $contract_deployment_gas_unit gas units "|" "0"$contract_deployment_gas_price_eth ETH "|" $contract_deployment_gas_price_usd USD
    totalFeeETH=$(add $totalFeeETH "0"$contract_deployment_gas_price_eth)
    totalFeeUSD=$(add $totalFeeUSD $contract_deployment_gas_price_usd)
}

getFunctionCallFee() {
    echo -e "${CYAN}{$2} expected function call gas price${NC}"
    function_call_gas_unit="$(echo "$1" | awk '$4 == "'$2'" {print $10}')"
    function_call_gas_price_eth="$(calc_gas_price_in_eth $function_call_gas_unit $avg_gas_price)"
    function_call_gas_price_usd="$(calc_gas_price_in_usd $function_call_gas_price_eth $eth_usd_price)"
    echo $function_call_gas_unit gas units "|" "0"$function_call_gas_price_eth ETH "|" $function_call_gas_price_usd USD
    totalFeeETH=$(add $totalFeeETH "0"$function_call_gas_price_eth)
    totalFeeUSD=$(add $totalFeeUSD $function_call_gas_price_usd)
}

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

echo -e "${GREEN}0"$totalFeeETH" ETH${NC}"
echo -e "${GREEN}"$totalFeeUSD" USD${NC}"
