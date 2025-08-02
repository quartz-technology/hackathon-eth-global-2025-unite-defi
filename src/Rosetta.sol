// SPDX-License-Identifier: Apache 2.0
// SPDX-FileCopyrightText: 2025 Quartz <contact@quartz.technology>
//
// *-------------------*
// | 81 85 65 82 84 90 |
// *-------------------*
//
pragma solidity 0.8.30;

import {IPostInteraction} from "@1inch/limit-order-protocol/interfaces/IPostInteraction.sol";
import {IOrderMixin} from "@1inch/limit-order-protocol/interfaces/IOrderMixin.sol";

contract Rosetta is IPostInteraction {
    /* -------------------------------------------------------------------------- */
    /*                                   ERRORS                                   */
    /* -------------------------------------------------------------------------- */

    error OnlyLimitOrderProtocol();

    /* -------------------------------------------------------------------------- */
    /*                                 IMMUTABLES                                 */
    /* -------------------------------------------------------------------------- */

    address private immutable LIMIT_ORDER_PROTOCOL;

    /* -------------------------------------------------------------------------- */
    /*                                 MODIFIERS                                  */
    /* -------------------------------------------------------------------------- */

    modifier onlyLimitOrderProtocol() {
        if (msg.sender != LIMIT_ORDER_PROTOCOL) revert OnlyLimitOrderProtocol();
        _;
    }

    /* -------------------------------------------------------------------------- */
    /*                                CONSTRUCTOR                                 */
    /* -------------------------------------------------------------------------- */

    constructor(address _limitOrderProtocol) {
        LIMIT_ORDER_PROTOCOL = _limitOrderProtocol;
    }

    /* -------------------------------------------------------------------------- */
    /*                             EXTERNAL MUTATABLE                             */
    /* -------------------------------------------------------------------------- */

    function postInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external override(IPostInteraction) onlyLimitOrderProtocol {
        // The extraData contains a list of authorized secondary assets to be used by the taker to fill the order.
        // Example: 3500 USDT for 1 ETH can be filled using (1200 USDT + 2300 USDC) or (1200 USDT + 2000 EURC).
    }
}
