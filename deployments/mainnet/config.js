module.exports = {
    "network": "mainnet",
    "mint": {
        "totalSupply": "1000000000"
    },
    "safe" : {
        "address" : "0xeE294a573eA5B77b84880a109FAeD7FdC0136d2D"
    },
    "rewards": [
        { "q" : 0, "amount": "10000000"},
        { "q" : 1, "amount": "10000000"},
        { "q" : 2, "amount": "10000000"},
        { "q" : 4, "amount": "10000000"},
        { "q" : 5, "amount": "10000000"},
        { "q" : 6, "amount": "10000000"},
        { "q" : 7, "amount": "10000000"},
        { "q" : 8, "amount": "10000000"},
        { "q" : 9, "amount": "10000000"},
        { "q" : 10, "amount": "10000000"},
        { "q" : 11, "amount": "10000000"},
        { "q" : 12, "amount": "10000000"}],
    "bridge": {
        "maxLockLimit" : "40000",
        "maxReleaseLimit": "80000",
        "minLimit": "1",
        "limitIncPerBlock": "500",
        "minRequiredReports": 1,
        "commissionAmount": "0",
        "reporters": {
            "addresses": [""],
            "active": [true]
        }
    }
}
