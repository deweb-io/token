module.exports = {
    "network": "rinkeby",
    "mint": {
        "totalSupply": "1000000000"
    },
    "safe" : {
        "address" : "0x3B3944D7351c69944DCFEc85651394dC38326a4d"
    },
    "rewards": [ { "q" : 0, "amount": "100000"}, { "q" : 1, "amount": "100000"}],
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
            "addresses": ["0x31B98D14007bDEe637298086988A0bBd31184523"],
            "active": [true]
        }
    },
    "dailyRewards": {
        "amount": "60000"
    }
};
