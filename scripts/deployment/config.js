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
        "maxLockLimit" : "357142",
        "maxReleaseLimit": "357142",
        "minLimit": "135",
        "limitIncPerBlock": "1300",
        "minRequiredReports": 1,
        "commissionAmount": "340",
        "reporters": {
            "addresses": ["0x0dAD71Ad92C4770AF7c3c28bc1E4F50e12eE4860"],
            "active": [true]
        }
    }
}
