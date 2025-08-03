# <h1 align="center"> Rosetta </h1>

<p align="center">
    <img src="LOGO.png" style="border-radius:5%" width="800" alt="">
</p>

<p align="center">
  Rosetta expands the 1inch Limit Order Protocol (LOP) by providing support for multi-asset orders.
</p>

## Description

Rosetta is an extension to the 1inch Limit Order Protocol (LOP) which allows the maker to specify possible alternative assets to use to fill an order. 

Let's say that Alice wants to sell 1 WBTC for 100 000 USDT. Alice does not care about receiving USDT or USDC, or even EURC: she just wants to get some
stablecoins for her WBTC.
On the opposite side, Bob has a lot of different stablecoins: 23 000 USDC, 6 000 EURC and 70 000 USDT. He could fill Alice's order!

When filling the order, Bob's entire 23 000 USDT are consumed by the traditional 1inch LOP to buy 0.23 WBTC. 0.77 WBTC remains.
Then, this is where Rosetta shines: using a quoter, it is determined that the 6 000 EURC can buy 0.07 WBTC and the 70 000 USDT can buy 0.70 WBTC.
The remaining 0.07 + 0.70 WBTC are bought in exchange for the 6 000 EURC and 70 000 USDT.

Alice's order is completely filled using the alternative assets! 

Rosetta makes the liquidity of multiple assets more efficient, while using the 1inch LOP as the base settlement layer for the order it helps to fill!

## How it's made

Rosetta is an extension of the 1inch LOP. Specifically, it is designed as a smart contract which inherits the `IPostInteraction` interface,
meaning that it is triggered after the maker has sent his tokens to the taker, and after the taker has sent his tokens to the maker.

The extension uses a list of address as the authorized alternative assets. This means that the maker (Alice in our previous example) is the one deciding
which assets can be used to complete the order if it is not filled.

This also means that the initial order has to be created using the `partialFill` feature enabled, because it is assumed that the alternative assets _can_ be used.

The quotes between the alternative asset and the maker's asset is made using an external quoter service. Any kind of onchain oracle such as Chainlink could do the job.

Both the maker and taker must provide approvals to authorize Rosetta to respectively send the maker asset to the taker and send the alternative assets to the maker.

## Run the demo

There are two demos you can run to test Rosetta:

- A one-time demo which has all the required values pre-filled
- An interactive demo, where you can set the parameters of the order for Alice and Bob

For both demos, you will need to run an anvil fork of Ethereum mainnet:
```shell
anvil -f YOUR_ETH_RPC
```

Then, to prepare the demo, install the required dependencies:
```shell
cd tools/local-deployer && bun i
```

### One-time demo

To run the one-time demo, execute the following command in your terminal:
```shell
cd tools/local-deployer && bun run index.ts one-time-demo
```

Take a look at the output, it contains all the details of the operations!

### Interactive demo

To run the interactive demo, execute the following command in your terminal:
```shell
cd tools/local-deployer && bun run index.ts interactive-demo
```

For this demo, you will be asked to provide inputs, feel free to test Rosetta with your own scenarios!
Note that it keeps the same base scenario of swapping WBTC against any amount of alternative assets.

## Authors

Made with :heart: by the folks at Quartz Technology.
