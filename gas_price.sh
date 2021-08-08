# this script is calculating gas prices for contracts deployment and report tx

CYAN='\033[1;36m'
NC='\033[0m'

calc_gas_price_in_usd() {
    bc <<< "scale = 9; "$1" * "$2" / 1000000000 * $3"
}

from_json() {
    node -pe "JSON.parse(process.argv[1])$1" "$2"
}


eth_price_response=$(curl https://api.coinbase.com/v2/exchange-rates?currency=ETH)
eth_usd_price="$(from_json .data.rates.USD "$eth_price_response")"
# echo eth_usd_price $eth_usd_price


eth_gas_station_response=$(curl https://ethgasstation.info/json/ethgasAPI.json)
avg_gas_price="$(expr $(from_json .average "$eth_gas_station_response") / 10)"
# echo avg_gas_price $avg_gas_price



gas_report="$(REPORT_GAS=true npx hardhat test test/bridge-test.js 2>/dev/null)"
bancorx_deployment_gas_price="$(calc_gas_price_in_usd "$(echo "$gas_report" | awk '$2 == "BancorX" {print $8}')" $avg_gas_price $eth_usd_price)"
bbs_deployment_gas_price="$(calc_gas_price_in_usd "$(echo "$gas_report" | awk '$2 == "BBSToken" {print $8}')" $avg_gas_price $eth_usd_price)"
reporttx_gas_price="$(calc_gas_price_in_usd "$(echo "$gas_report" | awk '$4 == "reportTx" {print $10}')" $avg_gas_price $eth_usd_price)"


echo -e "${CYAN}-----------------------bancorX deployment gas price----------------------------${NC}"
echo $bancorx_deployment_gas_price
echo -e "${CYAN}-----------------------BBS deployment gas price--------------------------------${NC}"
echo $bbs_deployment_gas_price
echo -e "${CYAN}-----------------------report tx gas price-------------------------------------${NC}"
echo $reporttx_gas_price



