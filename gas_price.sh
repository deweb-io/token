# this script is calculating gas prices for contracts deployment and report tx

CYAN='\033[1;36m'
NC='\033[0m'

GWEI_TO_ETH="1000000000"

calc_gas_price_in_eth() {
    bc <<< "scale = 9; "$1" * "$2" / ${GWEI_TO_ETH}"
}

calc_gas_price_in_usd() {
    bc <<< ""$1" * "$2""
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
gas_report="$(REPORT_GAS=true npx hardhat test test/bridge-test.js 2>/dev/null)"


getDeploymentFee() {
    echo -e "${CYAN}{$1} expected deployment gas price${NC}"
    contract_deployment_gas_unit="$(echo "$gas_report" | awk '$2 == "'$1'" {print $8}')"
    contract_deployment_gas_price_eth="$(calc_gas_price_in_eth $contract_deployment_gas_unit $avg_gas_price)"
    contract_deployment_gas_price_usd="$(calc_gas_price_in_usd $contract_deployment_gas_price_eth $eth_usd_price)"
    echo $contract_deployment_gas_unit gas units "|" "0"$contract_deployment_gas_price_eth ETH "|" $contract_deployment_gas_price_usd USD
}

getFunctionCallFee() {
    echo -e "${CYAN}{$1} expected function call gas price${NC}"
    function_call_gas_unit="$(echo "$gas_report" | awk '$4 == "'$1'" {print $10}')"
    function_call_gas_price_eth="$(calc_gas_price_in_eth $function_call_gas_unit $avg_gas_price)"
    function_call_gas_price_usd="$(calc_gas_price_in_usd $function_call_gas_price_eth $eth_usd_price)"
    echo $function_call_gas_unit gas units "|" "0"$function_call_gas_price_eth ETH "|" $function_call_gas_price_usd USD
}

getDeploymentFee "BancorX"
getDeploymentFee "BBSToken"
getFunctionCallFee "reportTx"
