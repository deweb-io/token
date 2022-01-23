module.exports = {
    "network": "mainnet",
    "mint": {
        "totalSupply": "1000000000"
    },
    "safe" : {
        "address" : "0xeE294a573eA5B77b84880a109FAeD7FdC0136d2D"
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
            "toAccount": "",
            "maxLockLimit": ""
        },
        "reporters": {
            "addresses": [""],
            "active": [true]
        }
    },
    "dailyRewards": {
        "amount": "60000"
    }
}
