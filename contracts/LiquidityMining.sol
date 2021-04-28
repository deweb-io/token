// SPDX-License-Identifier: GPL-3.0
// This is a draft for our liquidity mining program, currently just used to define the behaviour.
// The actual integration with Bancor is still being debated, and will probably be a transferAndCall,
// but for now, just to keep the testing local, we treat the entire BBS balance of msg.sender as the stake.
pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract LiquidityMining is Ownable  {
    using SafeMath for uint256;

    // To avoid non integral number of shares, for every BBS locked we allocate
    // 1,000 shares plus 3 shares for every extra day (above minimum) it is locked.
    uint256 private constant MIN_LOCK_PERIOD = 100;
    uint256 private constant MAX_LOCK_PERIOD = 1100;
    uint256 private constant BASE_SHARES = 1000;
    uint256 private constant SHARES_PER_DAY = 3;

    // This is an arbitrary multiplier to add precision to our integral calculations. We probably don't even need it.
    uint256 private constant PRECISION = 10**18;

    IERC20 _BBSToken;

    struct LockedPosition {
        // This is currently the same as the key. It will probably change once we use the actual Bancor mechanism.
        address positionAddress;

        uint256 lockTimeSharePrice;
        uint256 numberOfShares;
        uint256 lockTimestamp;
        uint256 withdrawTimestamp;
    }

    mapping(address => LockedPosition) public lockedPositions;

    uint256 public accumulatedSharePrice;
    uint256 public totalNumberOfShares;
    uint256 public lastKnownBalance;

    /// EVENTS - we need to think about what we really want. The following are suggestions.
    event LockPosition(address  _address ,uint256 _amount, uint16 _numberOfDays);
    event UnlockPosition(address  _address ,uint256 _amount);

    constructor(address _bbsTokenAddress) {
        _BBSToken = IERC20(_bbsTokenAddress);
    }

    function lockPosition(uint16 _numberOfDays) public {
        require(
            _numberOfDays >= MIN_LOCK_PERIOD &&
            _numberOfDays <= MAX_LOCK_PERIOD,
            "Illeagal lock period (Lock account for 100 - 1100 days)");

        updateSharePrice();
        uint256 _numberOfShares = calculateNumberOfShares(_numberOfDays);
        _addlockedPosition(_numberOfShares, uint256(_numberOfDays));
    }

    function unlockPosition(address _address) public {
        //console.log("***start unlockPosition***");
        require(
            lockedPositions[_address].withdrawTimestamp <= block.timestamp,
            "Unlocking time has not arrived yet");
        updateSharePrice();
        uint256 _reward = calculateRewardByCurrentSharePrice(_address);
        _BBSToken.transfer(_address, _reward);
        _removeLockedPosition(_address, _reward);
    }

    // Data storage handling. Perhaps we will just use a bunch of mappings.
    function _addlockedPosition(uint256 _numberOfShares , uint256 _numberOfDays) internal {
        lockedPositions[msg.sender] = LockedPosition(
            msg.sender,
            accumulatedSharePrice,
            _numberOfShares,
            block.timestamp,
            block.timestamp + (_numberOfDays * 1 days));
        totalNumberOfShares = totalNumberOfShares.add(_numberOfShares);
    } 

    function _removeLockedPosition(address _address, uint256 _rewardPayed) internal {
        totalNumberOfShares = totalNumberOfShares.sub(lockedPositions[_address].numberOfShares);
        lastKnownBalance = lastKnownBalance.sub(_rewardPayed.mul(PRECISION));
        lockedPositions[_address] = LockedPosition(address(0),0,0,0,0);
    }

    function updateSharePrice() public {  //rename name of function
        uint256 _uncalculatedBalance = _BBSToken.balanceOf(address(this)).mul(PRECISION).sub(lastKnownBalance);
        //NOTE: if totalNumberOfShares > _uncalculatedBalance -> div will get zero!
        if(_uncalculatedBalance > 0 && totalNumberOfShares > 0) {
            accumulatedSharePrice = accumulatedSharePrice.add(_uncalculatedBalance.div(totalNumberOfShares));
            lastKnownBalance = lastKnownBalance.add(_uncalculatedBalance);
        }
    }

    // Calculate numberOfShares for msg.sender balance. Does not validate duration.
    function calculateNumberOfShares(uint16 _numberOfDays) public view returns(uint256) {
        uint256 _factor = BASE_SHARES + ((_numberOfDays - MIN_LOCK_PERIOD) * SHARES_PER_DAY);
        return _BBSToken.balanceOf(msg.sender).mul(_factor);
    }

    // Calculate reward by current accumulatedSharePrice without updating storage or validating duration.
    function calculateRewardByCurrentSharePrice(address  _address) public view returns(uint256) {
        LockedPosition memory _position = lockedPositions[_address];
        return _position.numberOfShares.mul(accumulatedSharePrice.sub(_position.lockTimeSharePrice)).div(PRECISION);
    }
}
