// SPDX-License-Identifier: Apache 2.0
// SPDX-FileCopyrightText: 2025 Quartz <contact@quartz.technology>
//
// *-------------------*
// | 81 85 65 82 84 90 |
// *-------------------*
//
pragma solidity 0.8.23;

import {IQuoter} from "src/interfaces/IQuoter.sol";

contract QuoterMock is IQuoter {
    error QuoteDoesNotExist();

    mapping(address => mapping(address => mapping(uint256 => uint256))) public quotes;
    mapping(address => mapping(address => mapping(uint256 => bool))) public quotesExist;

    function setQuote(address _token0, address _token1, uint256 _amount, uint256 _quote) public {
        quotes[_token0][_token1][_amount] = _quote;
        quotesExist[_token0][_token1][_amount] = true;
    }

    function getQuote(address _token0, address _token1, uint256 _amount)
        external
        view
        override(IQuoter)
        returns (uint256)
    {
        if (!quotesExist[_token0][_token1][_amount]) revert QuoteDoesNotExist();
        return quotes[_token0][_token1][_amount];
    }
}
