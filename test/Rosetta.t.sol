// SPDX-License-Identifier: Apache 2.0
// SPDX-FileCopyrightText: 2025 Quartz <contact@quartz.technology>
//
// *-------------------*
// | 81 85 65 82 84 90 |
// *-------------------*
//
pragma solidity 0.8.23;

import {Test, console} from "forge-std/Test.sol";

import {IQuoter} from "src/interfaces/IQuoter.sol";
import {ERC20Mock} from "test/mocks/ERC20.mock.sol";
import {QuoterMock} from "test/mocks/Quoter.mock.sol";
import {LimitOrderProtocol} from "@1inch/limit-order-protocol/LimitOrderProtocol.sol";
import {IWETH} from "@1inch/solidity-utils/contracts/interfaces/IWETH.sol";

contract RosettaTest is Test {
    address internal token0;
    address internal token1;
    address internal token2;
    address internal token3;

    IQuoter internal quoter;

    LimitOrderProtocol internal limitOrderProtocol;

    function setUp() public {
        token0 = address(new ERC20Mock("ETH Wrapped", "WETH"));
        token1 = address(new ERC20Mock("USD Circle", "USDC"));
        token2 = address(new ERC20Mock("USD Tether", "USDT"));
        token3 = address(new ERC20Mock("EUR Circle", "EURC"));

        quoter = IQuoter(new QuoterMock());

        limitOrderProtocol = new LimitOrderProtocol(IWETH(address(0)));
    }

    function test_() public {}
}
