module.exports = {
    "network": "goreli",
    "mint": {
        "totalSupply": "1000000000"
    },
    "rewards": [ {"q" : 0, "amount": "100000"}, {"q" : 1, "amount": "100000"} ,{"q" : 2, "amount": "100000"}, {"q" : 3, "amount": "100000"},  {"q" : 4, "amount": "100000"}, {"q" : 5, "amount": "100000"}],
    "bridge": {
        "maxLockLimit" : "40000",
        "maxReleaseLimit": "80000",
        "minLimit": "1",
        "limitIncPerBlock": "500",
        "minRequiredReports": 1,
        "commissionAmount": "0",
        "reporters": {
            "addresses": ["0x869fAD6004c59fd426939855062aF6f1378817a4"],
            "active": [true]
        }
    }
}
