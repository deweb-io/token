// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.8.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.4.0/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.4.0/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.4.0/contracts/math/SafeMath.sol";


contract LiquidityMining is Ownable  {
    using SafeMath for uint256;

    uint256 public constant MIN_LOCK_PERIOD = 100 days;
    uint256 public constant MAX_LOCK_PERIOD = 1100 days;
    uint256 public constant SHERES_MULTIPLIER = 3;
    uint256 public constant SHERES_BASE = 1000;
    uint256 public constant SHERES_MIN_DAYS = 100;

    IERC20 _BBSToken;

    struct LockedPosition {
        address positionAddress;
        uint256 lockTimeSharePrice;
        uint256 numberOfShares;
        uint256 lockTimestamp;
        uint256 withdrawTimestamp;
    }

    mapping (address => LockedPosition) public LockedPositions;

    uint256 public sharePrice;
    uint256 public totalNumberOfShares;
    uint256 public lastKnownBalance;


    /// EVENTS
    event LockPosition (address  _address ,uint256 _amount, uint16 _numberOfDays);
    event UnlockPosition (address  _address ,uint256 _amount);


    constructor (address _bbsTokenAddress) {
        //REVIEW BANKOR contract
        _BBSToken = IERC20(_bbsTokenAddress);
    }

    function lockPosition(uint16 _numberOfDays) public {

        require(
            _numberOfDays >= MIN_LOCK_PERIOD &&
            _numberOfDays <= MAX_LOCK_PERIOD,
            "Illeagal lock periud (Lock account for 100 - 1100 days)");

            /*CALL BANKOR API */

            updateSharePrice();

            uint256 _numberOfShares = _calculateShares (_numberOfDays);

            //add new position to contract storge
            _addlockedPosition (_numberOfShares, uint256(_numberOfDays));

            //emit BBSFundsLock (msg.sender , _BBSToken.balanceOf(msg.sender) ,  _numberOfDays);
    }



    function unlockPosition  (address _address) public {

        require(
            LockedPositions[_address].withdrawTimestamp <= block.timestamp,
            "Unlocking time has not arrived yet");

            updateSharePrice();

            // BANKOR contract

            //transfer balance
            uint256 _reward = calculateRewardByCurrentSharePrice(_address);
            _BBSToken.transfer(_address, _reward);

            //remove position data and sums from contract storge
            _removeLockedPosition ( _address, _reward );

            //emit BBSFundsLock (msg.sender , _BBSToken.balanceOf(msg.sender) ,  _numberOfDays);

    }




    // _addlockedPosition /_removelockedPosition handels data storage:
    // LockedPositions , totalNumberOfShares & lastKnownBalance
    function _addlockedPosition (uint256 _numberOfShares , uint256 _numberOfDays) internal {
        //update storage
        LockedPositions[msg.sender] = LockedPosition(
            msg.sender,
            sharePrice,
            _numberOfShares,
            block.timestamp,
            block.timestamp + _numberOfDays); //* 1 days)

            //update total
            totalNumberOfShares = totalNumberOfShares.add(_numberOfShares);
    }



    function _removeLockedPosition (address _address, uint256 _rewardPayed) internal {
        //update totals
        totalNumberOfShares = totalNumberOfShares.sub (LockedPositions[_address].numberOfShares);
        lastKnownBalance = lastKnownBalance.sub ( _rewardPayed );

        //update storage
        LockedPositions[_address] = LockedPosition(address(0),0,0,0,0);
    }


    function updateSharePrice() public { //updateSharePrice
        uint256 _uncalculatedBalance = _BBSToken.balanceOf(address(this)).sub(lastKnownBalance);
        if ( _uncalculatedBalance > 0 ) {
            sharePrice = sharePrice.add(_uncalculatedBalance.div(totalNumberOfShares));
            lastKnownBalance = lastKnownBalance.add(_uncalculatedBalance);
        }
    }


    // calculae numberOfShares for msg.sender balance. does not validat duration.
    function _calculateShares(uint16 _numberOfDays) public view returns (uint256) {
        uint256 _factor = SHERES_BASE + ((_numberOfDays - SHERES_MIN_DAYS) * SHERES_MULTIPLIER);
        return (_BBSToken.balanceOf(msg.sender).mul(_factor));
    }

    // calculae  value by current sharePrice. does not validat duration.
    function calculateRewardByCurrentSharePrice(address  _address) public view returns (uint256){
        LockedPosition memory _position = LockedPositions[_address];
        return _position.numberOfShares.mul( sharePrice.sub( _position.lockTimeSharePrice));
    }
}
