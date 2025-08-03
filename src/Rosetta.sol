// SPDX-License-Identifier: Apache 2.0
// SPDX-FileCopyrightText: 2025 Quartz <contact@quartz.technology>
//
// *-------------------*
// | 81 85 65 82 84 90 |
// *-------------------*
//
pragma solidity 0.8.23;

import {IPostInteraction} from "@1inch/limit-order-protocol/interfaces/IPostInteraction.sol";
import {AddressLib, Address} from "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IOrderMixin} from "@1inch/limit-order-protocol/interfaces/IOrderMixin.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {IQuoter} from "src/interfaces/IQuoter.sol";

contract Rosetta is IPostInteraction {
    /* -------------------------------------------------------------------------- */
    /*                            LIBRARIES INJECTION                             */
    /* -------------------------------------------------------------------------- */

    using AddressLib for Address;
    using SafeERC20 for IERC20;

    /* -------------------------------------------------------------------------- */
    /*                                   ERRORS                                   */
    /* -------------------------------------------------------------------------- */

    error OnlyLimitOrderProtocol();

    error OrderAlreadyCompleted();

    error InsufficientAlternativeAssets();

    /* -------------------------------------------------------------------------- */
    /*                                 IMMUTABLES                                 */
    /* -------------------------------------------------------------------------- */

    address private immutable LIMIT_ORDER_PROTOCOL;

    /* -------------------------------------------------------------------------- */
    /*                                  STORAGE                                   */
    /* -------------------------------------------------------------------------- */

    IQuoter private quoter;

    mapping(bytes32 => bool) private ordersStatus;

    /* -------------------------------------------------------------------------- */
    /*                                 MODIFIERS                                  */
    /* -------------------------------------------------------------------------- */

    modifier onlyLimitOrderProtocol() {
        if (msg.sender != LIMIT_ORDER_PROTOCOL) revert OnlyLimitOrderProtocol();
        _;
    }

    modifier onlyUncompletedOrder(bytes32 orderHash) {
        if (ordersStatus[orderHash]) revert OrderAlreadyCompleted();
        _;
    }

    /* -------------------------------------------------------------------------- */
    /*                                CONSTRUCTOR                                 */
    /* -------------------------------------------------------------------------- */

    constructor(address _limitOrderProtocol, IQuoter _quoter) {
        LIMIT_ORDER_PROTOCOL = _limitOrderProtocol;
        quoter = _quoter;
    }

    /* -------------------------------------------------------------------------- */
    /*                             EXTERNAL MUTATABLE                             */
    /* -------------------------------------------------------------------------- */

    function postInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata, /* extension */
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256, /*takingAmount*/
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external override(IPostInteraction) onlyLimitOrderProtocol onlyUncompletedOrder(orderHash) {
        uint256 _currentlyRemainingMakingAmount = remainingMakingAmount - makingAmount;

        if (_currentlyRemainingMakingAmount == 0) return;

        address[] memory _alternativeAssets = abi.decode(extraData, (address[]));
        address _makerAsset = order.makerAsset.get();
        address _maker = order.maker.get();

        for (uint256 i = 0; i < _alternativeAssets.length; i++) {
            address _alternativeAsset = _alternativeAssets[i];
            uint256 _alternativeAssetTakerBalance = IERC20(_alternativeAsset).balanceOf(taker);

            if (_alternativeAssetTakerBalance == 0) continue;

            uint256 _quote = quoter.getQuote(_alternativeAsset, _makerAsset, _alternativeAssetTakerBalance);

            if (_quote == 0) continue;

            uint256 _alternativeAssetAmountToTransfer = _alternativeAssetTakerBalance;

            if (_quote > _currentlyRemainingMakingAmount) {
                _quote = _currentlyRemainingMakingAmount;
                _alternativeAssetAmountToTransfer = quoter.getQuote(_makerAsset, _alternativeAsset, _quote);
            }

            _currentlyRemainingMakingAmount -= _quote;

            // Transfer alternative asset to maker and maker asset to taker.
            IERC20(_alternativeAsset).safeTransferFrom(taker, _maker, _alternativeAssetAmountToTransfer);
            IERC20(_makerAsset).safeTransferFrom(_maker, taker, _quote);

            if (_currentlyRemainingMakingAmount == 0) break;
        }

        if (_currentlyRemainingMakingAmount > 0) revert InsufficientAlternativeAssets();

        ordersStatus[orderHash] = true;
    }
}
