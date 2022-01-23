module.exports = {
    "network": "rinkeby",
    "mint": {
        "totalSupply": "1000000000"
    },
    "safe" : {
        "address" : "0x3B3944D7351c69944DCFEc85651394dC38326a4d"
    },
    "rewards": [ { "q" : 0, "amount": "200000"}, { "q" : 1, "amount": "100000"}],
    "bridge": {
        "maxLockLimit" : "40000",
        "maxReleaseLimit": "80000",
        "minLimit": "1",
        "limitIncPerBlock": "500",
        "minRequiredReports": 1,
        "commissionAmount": "0",
        "sendRewards" : {
            "toBlockchain": "eos",
            "toAccount": "rjyqmacwqxbc",
            "maxLockLimit": "100000"
        },
        "reporters": {
            "addresses": ["0x869fAD6004c59fd426939855062aF6f1378817a4"],
            "active": [true]
        }
    },
    "dailyRewards": {
        "amount": "60000"
    }
}
