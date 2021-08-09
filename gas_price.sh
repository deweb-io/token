# this script is calculating gas prices for contracts deployment and report tx

CYAN='\033[1;36m'
NC='\033[0m'


calc_gas_price_in_eth() {
    bc <<< "scale = 9; "$1" * "$2" / 1000000000"
}

calc_gas_price_in_usd() {
    bc <<< ""$1" * "$2""
}

from_json() {
    node -pe "JSON.parse(process.argv[1])$1" "$2"
}

echo -e "${CYAN}ETH price${NC}"
coinbase_response=$(curl -s https://api.coinbase.com/v2/exchange-rates?currency=ETH)
eth_usd_price="$(from_json .data.rates.USD "$coinbase_response")"
echo $eth_usd_price USD

echo -e "${CYAN}Avg gas price from ethgasstation${NC}"
ethgasstation_response=$(curl -s https://ethgasstation.info/json/ethgasAPI.json)
avg_gas_price="$(expr $(from_json .average "$ethgasstation_response") / 10)"
echo $avg_gas_price Gwei


# get gas report using hardhat
gas_report="$(REPORT_GAS=true npx hardhat test test/bridge-test.js 2>/dev/null)"

echo -e "${CYAN}bancorX deployment gas price${NC}"
bancorx_deployment_gas_unit="$(echo "$gas_report" | awk '$2 == "BancorX" {print $8}')"
bancorx_deployment_gas_price_eth="$(calc_gas_price_in_eth $bancorx_deployment_gas_unit $avg_gas_price $eth_usd_price)"
bancorx_deployment_gas_price_usd="$(calc_gas_price_in_usd $bancorx_deployment_gas_price_eth $eth_usd_price)"
echo $bancorx_deployment_gas_unit gas units "|" "0"$bancorx_deployment_gas_price_eth ETH "|" $bancorx_deployment_gas_price_usd USD

echo -e "${CYAN}BBS token deployment gas price${NC}"
bbs_token_deployment_gas_unit="$(echo "$gas_report" | awk '$2 == "BBSToken" {print $8}')"
bbs_token_deployment_gas_price_eth="$(calc_gas_price_in_eth $bbs_token_deployment_gas_unit $avg_gas_price $eth_usd_price)"
bbs_token_deployment_gas_price_usd="$(calc_gas_price_in_usd $bbs_token_deployment_gas_price_eth $eth_usd_price)"
echo $bbs_token_deployment_gas_unit gas units "|" "0"$bbs_token_deployment_gas_price_eth ETH "|" $bbs_token_deployment_gas_price_usd USD

echo -e "${CYAN}report tx gas price${NC}"
reporttx_gas_unit="$(echo "$gas_report" | awk '$4 == "reportTx" {print $10}')"
reporttx_gas_price_eth="$(calc_gas_price_in_eth $reporttx_gas_unit $avg_gas_price $eth_usd_price)"
reporttx_gas_price_usd="$(calc_gas_price_in_usd $reporttx_gas_price_eth $eth_usd_price)"
echo $reporttx_gas_unit gas units "|" "0"$reporttx_gas_price_eth ETH "|" $reporttx_gas_price_usd USD
