#!/usr/bin/env bash
# Calculates estimation of total deployment fee on ethereum
pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../bash_helpers
popd

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

currentFeeETH="0.0"
currentFeeUSD="0.0"

printFee() {
    echo -e "${GREEN}"$currentFeeETH" ETH${NC}"
    echo -e "${GREEN}"$currentFeeUSD" USD${NC}"
}

accumulateTotalFee() {
    totalFeeETH=$(add $totalFeeETH $currentFeeETH)
    totalFeeUSD=$(add $totalFeeUSD $currentFeeUSD)
}

initCurrentFee() {
    currentFeeETH="0.0"
    currentFeeUSD="0.0"
}

# $1 is the number of gas units
accumulateCurrentFee() {
    gas_price_eth="$(calc_gas_price_in_eth $1 $avg_gas_price_in_gwei)"
    gas_price_usd="$(calc_gas_price_in_usd $gas_price_eth $eth_usd_price)"
    echo $1 gas units "|" "0"$gas_price_eth ETH "|" $gas_price_usd USD
    currentFeeETH=$(add $currentFeeETH "0"$gas_price_eth)
    currentFeeUSD=$(add $currentFeeUSD $gas_price_usd)
}

getDeploymentFee() {
    echo -e "${CYAN}{$2} expected deployment gas price${NC}"
    contract_deployment_gas_unit="$(echo "'$1'" | awk '$2 == "'$2'" {print $8}')"
    accumulateCurrentFee $contract_deployment_gas_unit
}

getFunctionCallFee() {
    echo -e "${CYAN}{$2} expected function call gas price${NC}"
    function_call_gas_unit="$(echo "$1" | awk '$4 == "'$2'" {print $10}')"
    accumulateCurrentFee $function_call_gas_unit
}

multiSendApproveFee() {
    # Multisend approve (https://ropsten.etherscan.io/tx/0xcb813d20378d25e6bf9a3924a5bccaaa4fd7cd60781c25d61751ff1ca09a62f2)
    echo -e "${CYAN}{Multisend-approve} expected function call gas price${NC}"
    accumulateCurrentFee '46274'
}

echo -e "${RED}----Deployment and Minting-----${NC}"
echo -e "${CYAN}{Gnosis-safe: createProxyWithNonce} expected function call gas price${NC}"
accumulateCurrentFee '258606' # Gnosis-safe create (https://rinkeby.etherscan.io/tx/0xbbb8e8df0cb56711e701f5df901752ed2c8cada49607337d70ecfcd02915163d)
echo -e "${CYAN}{Gnosis-safe: execTransaction} expected function call gas price${NC}"
accumulateCurrentFee '143734' # add signatory (https://rinkeby.etherscan.io/tx/0x94a39f8f9817050060bda676beefa8190291f93810ce78fd232412a98759930f)
accumulateCurrentFee '143734'
accumulateCurrentFee '143734'
accumulateCurrentFee '143734'
getDeploymentFee "$gas_report_bbs_token" "BBSToken"             # BBS token deploy
getFunctionCallFee "$gas_report_bbs_token" "mint"               # BBS minting
getFunctionCallFee "$gas_report_bbs_token" "transferOwnership"  # transfer BBS ownership to Gnosis
getDeploymentFee "$gas_report_bridge" "Bridge"                  # Bridge deploy
getFunctionCallFee "$gas_report_bridge" "setReporters"          # set bridge reporters
multiSendApproveFee
echo -e "${CYAN}{Multisend-transfer} expected function call gas price${NC}"
accumulateCurrentFee '91233' # https://ropsten.etherscan.io/tx/0x65057d50a5ef6cabee993d9f72143fda244704471cb555ed112ec6c7c87c6ae3
echo -e "${CYAN}Ether transfer from deployer to cold1 ${NC}"
accumulateCurrentFee '21000'
printFee
accumulateTotalFee
initCurrentFee
echo "-------------------------------"


echo -e "${RED}----Launch Day - Staking and Governance-----${NC}"
multiSendApproveFee
echo -e "${CYAN}{Multisend-transfer} expected function call gas price${NC}"
accumulateCurrentFee '1990679' # https://ropsten.etherscan.io/tx/0x3d7552b17f1db7dd3b416cc31a7550d3b678bace54ee63c6a69e3e3f51ebf71b
getDeploymentFee "$gas_report_staking" "Staking"                # Staking deploy
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q0
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q1
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q2
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q3
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q4
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q5
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q6
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q7
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q8
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q9
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q10
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q11
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q12
getFunctionCallFee "$gas_report_staking" "declareReward"        # decalre rewards Q13
getFunctionCallFee "$gas_report_bbs_token" "transferOwnership"  # transfer Staking ownership to Gnosis
echo -e "${CYAN}Ether transfer from cold1 to cold2 ${NC}"
accumulateCurrentFee '21000'
printFee
accumulateTotalFee
initCurrentFee
echo "--------------------------------------------"

echo -e "${RED}----Liquidity and Engagement-----${NC}"
getFunctionCallFee "$gas_report_bbs_token" "transferOwnership"       # transfer Bridge ownership
printFee
accumulateTotalFee
initCurrentFee
echo "----------------------------------"

echo -e "${RED}---Total Fees---${NC}"
echo -e "${GREEN}"$totalFeeETH" ETH${NC}"
echo -e "${GREEN}"$totalFeeUSD" USD${NC}"
echo "----------------"
