import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import { ERC20MockABI, ERC20MockBytecode } from "./src/abis/ERC20Mock";
import {
  AbiEncodingBytesSizeMismatchError,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  getContract,
  http,
  parseUnits,
  publicActions,
  type Hex,
} from "viem";
import { QuoterMockABI, QuoterMockBytecode } from "./src/abis/QuoterMock";
import {
  Address,
  Extension,
  ExtensionBuilder,
  Interaction,
  LimitOrder,
  MakerTraits,
  TakerTraits,
} from "@1inch/limit-order-sdk";
import { RosettaABI, RosettaBytecode } from "./src/abis/Rosetta";
import { Signature, Wallet } from "ethers";
import {
  LimitOrderProtocolABI,
  LimitOrderProtocolBytecode,
} from "./src/abis/LimitOrderProtocol";

async function demo() {
  console.log("----------".repeat(12));
  console.log(`
      
    ██████╗  ██████╗ ███████╗███████╗████████╗████████╗ █████╗ 
    ██╔══██╗██╔═══██╗██╔════╝██╔════╝╚══██╔══╝╚══██╔══╝██╔══██╗
    ██████╔╝██║   ██║███████╗█████╗     ██║      ██║   ███████║
    ██╔══██╗██║   ██║╚════██║██╔══╝     ██║      ██║   ██╔══██║
    ██║  ██║╚██████╔╝███████║███████╗   ██║      ██║   ██║  ██║
    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝
  `);
  console.log(`
    Welcome to the Rosetta demo!
    Here is the scenario:

      1. Alice creates an order to sell 1 WBTC for 100_000 USDC.
         She accepts to also be paid in EURC and USDT as long as the combined value of all the assets is >= 100_000 USDC.

      2. Bob has 27_000 USDC, 3_000 EURC and 70_000 USDT.
         For this demo, we'll admit that 3_000 EURC = 4_000 USD.
         He takes Alice's order and fills it.

      3. In the end, Alice should have 27_000 USDC, 3_000 EURC and 69_000 USDT, while Bob should have 1 WBTC.

    Rosetta expands the 1inch Limit Order Protocol (LOP) by providing support for multi-asset orders.
  `);
  console.log("----------".repeat(12));

  const admin = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  );
  const alice = privateKeyToAccount(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  );
  const bob = privateKeyToAccount(
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  );

  console.log(`
    Admin:      [${admin.address}]
    Alice:      [${alice.address}]
    Bob:        [${bob.address}]
  `);

  const client = createWalletClient({
    chain: defineChain({
      id: 1,
      name: "Anvil Fork",
      nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
      },
      rpcUrls: {
        default: {
          http: ["http://127.0.0.1:8545"],
          webSocket: ["ws://127.0.0.1:8545"],
        },
      },
    }),
    transport: http(),
  }).extend(publicActions);

  // Deploy custom LOP. TODO: Remove this once fully tested.
  let hash = await client.deployContract({
    abi: LimitOrderProtocolABI,
    account: admin,
    bytecode: LimitOrderProtocolBytecode,
    args: [admin.address],
  });
  let receipt = await client.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error("Failed to deploy LOP");
  }

  // const lopAddress = receipt.contractAddress;
  const lopAddress = "0x111111125421ca6dc452d289314280a0f8842a65";

  const lop = getContract({
    address: lopAddress,
    abi: LimitOrderProtocolABI,
    client,
  });

  // We deploy the tokens.
  const tokensArgs: Array<[string, string, number]> = [
    ["Wrapped BTC", "WBTC", 8],
    ["Circle USD", "USDC", 6],
    ["Circle EUR", "EURC", 6],
    ["Tether USD", "USDT", 6],
  ];
  const tokens: Record<string, `0x${string}`> = {};

  for (const [name, symbol, decimals] of tokensArgs) {
    const hash = await client.deployContract({
      abi: ERC20MockABI,
      account: admin,
      bytecode: ERC20MockBytecode,
      args: [name, symbol, decimals],
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    const token = receipt.contractAddress;

    if (!token) {
      throw new Error(`Failed to deploy ${symbol}`);
    }

    tokens[symbol] = token;
  }

  console.log(`
    WBTC:       [${tokens["WBTC"]}]
    USDC:       [${tokens["USDC"]}]
    EURC:       [${tokens["EURC"]}]
    USDT:       [${tokens["USDT"]}]
  `);

  // We mint the initial tokens for Alice and Bob.
  const wbtc = getContract({
    address: tokens["WBTC"]!,
    abi: ERC20MockABI,
    client,
  });

  hash = await wbtc.write.mint([alice.address, parseUnits("1", 8)], {
    account: admin,
  });
  await client.waitForTransactionReceipt({ hash });

  const usdc = getContract({
    address: tokens["USDC"]!,
    abi: ERC20MockABI,
    client,
  });

  hash = await usdc.write.mint([bob.address, parseUnits("27000", 6)], {
    account: admin,
  });
  await client.waitForTransactionReceipt({ hash });

  const eurc = getContract({
    address: tokens["EURC"]!,
    abi: ERC20MockABI,
    client,
  });

  hash = await eurc.write.mint([bob.address, parseUnits("3000", 6)], {
    account: admin,
  });
  await client.waitForTransactionReceipt({ hash });

  const usdt = getContract({
    address: tokens["USDT"]!,
    abi: ERC20MockABI,
    client,
  });

  hash = await usdt.write.mint([bob.address, parseUnits("70000", 6)], {
    account: admin,
  });
  await client.waitForTransactionReceipt({ hash });

  let wbtcAliceBalance = await wbtc.read.balanceOf([alice.address]);
  let usdcAliceBalance = await usdc.read.balanceOf([alice.address]);
  let eurcAliceBalance = await eurc.read.balanceOf([alice.address]);
  let usdtAliceBalance = await usdt.read.balanceOf([alice.address]);

  let wbtcBobBalance = await wbtc.read.balanceOf([bob.address]);
  let usdcBobBalance = await usdc.read.balanceOf([bob.address]);
  let eurcBobBalance = await eurc.read.balanceOf([bob.address]);
  let usdtBobBalance = await usdt.read.balanceOf([bob.address]);

  console.log(`
    Alice's pre-fill balances:
      - WBTC:    ${wbtcAliceBalance / BigInt(10 ** 8)}
      - USDC:    ${usdcAliceBalance / BigInt(10 ** 6)}
      - EURC:    ${eurcAliceBalance / BigInt(10 ** 6)}
      - USDT:    ${usdtAliceBalance / BigInt(10 ** 6)}
  `);

  console.log(`
    Bob's pre-fill balances:
      - WBTC:    ${wbtcBobBalance / BigInt(10 ** 8)}
      - USDC:    ${usdcBobBalance / BigInt(10 ** 6)}
      - EURC:    ${eurcBobBalance / BigInt(10 ** 6)}
      - USDT:    ${usdtBobBalance / BigInt(10 ** 6)}
  `);
  // We deploy the mock quoter.
  hash = await client.deployContract({
    abi: QuoterMockABI,
    account: admin,
    bytecode: QuoterMockBytecode,
  });
  receipt = await client.waitForTransactionReceipt({ hash });

  const quoter = getContract({
    address: receipt.contractAddress!,
    abi: QuoterMockABI,
    client,
  });

  console.log(`
    Quoter:     [${quoter.address}]
  `);

  // 27_000 USDC = 0.27 WBTC
  hash = await quoter.write.setQuote(
    [
      tokens["USDC"]!,
      tokens["WBTC"]!,
      parseUnits("27000", 6),
      parseUnits("0.27", 8),
    ],
    {
      account: admin,
    },
  );
  await client.waitForTransactionReceipt({ hash });

  // 3_000 EURC = 0.04 WBTC
  hash = await quoter.write.setQuote(
    [
      tokens["EURC"]!,
      tokens["WBTC"]!,
      parseUnits("3000", 6),
      parseUnits("0.04", 8),
    ],
    {
      account: admin,
    },
  );
  await client.waitForTransactionReceipt({ hash });

  // 70_000 USDT = 0.70 WBTC
  hash = await quoter.write.setQuote(
    [
      tokens["USDT"]!,
      tokens["WBTC"]!,
      parseUnits("70000", 6),
      parseUnits("0.70", 8),
    ],
    {
      account: admin,
    },
  );
  await client.waitForTransactionReceipt({ hash });

  // 0.69 WBTC = 69_000 USDT
  hash = await quoter.write.setQuote(
    [
      tokens["WBTC"]!,
      tokens["USDT"]!,
      parseUnits("0.69", 8),
      parseUnits("69000", 6),
    ],
    {
      account: admin,
    },
  );
  await client.waitForTransactionReceipt({ hash });

  // We deploy Rosetta.
  hash = await client.deployContract({
    abi: RosettaABI,
    account: admin,
    bytecode: RosettaBytecode,
    args: ["0x111111125421ca6dc452d289314280a0f8842a65", quoter.address],
  });
  receipt = await client.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error("Failed to deploy Rosetta");
  }

  const rosetta = getContract({
    address: receipt.contractAddress,
    abi: RosettaABI,
    client,
  });

  console.log(`
    Rosetta:    [${rosetta.address}]
  `);

  // Approve 1inch to transfer Alice's funds.
  hash = await wbtc.write.approve([lopAddress, wbtcAliceBalance], {
    account: alice,
  });
  await client.waitForTransactionReceipt({ hash });

  // Approve 1inch to transfer Bob's funds.
  hash = await usdc.write.approve([lopAddress, usdcBobBalance], {
    account: bob,
  });
  await client.waitForTransactionReceipt({ hash });

  // Approve Rosetta to transfer Alice's funds.
  hash = await wbtc.write.approve([rosetta.address, wbtcAliceBalance], {
    account: alice,
  });
  await client.waitForTransactionReceipt({ hash });

  // Approve Rosetta to transfer Bob's funds.
  hash = await eurc.write.approve([rosetta.address, eurcBobBalance], {
    account: bob,
  });
  await client.waitForTransactionReceipt({ hash });
  hash = await usdt.write.approve([rosetta.address, usdtBobBalance], {
    account: bob,
  });
  await client.waitForTransactionReceipt({ hash });

  // We forge Alice's order.
  const expiresIn = 1800n; // 30m
  const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn;
  const makerTraits = MakerTraits.default()
    .withExpiration(expiration)
    .allowPartialFills()
    .withExtension()
    .enablePostInteraction();

  const postInteractionData = encodeAbiParameters(
    [{ type: "address[]", name: "extraData" }],
    [[eurc.address, usdt.address]],
  );
  const postInteractionExtension = new ExtensionBuilder()
    .withPostInteraction(
      new Interaction(new Address(rosetta.address), postInteractionData),
    )
    .build();

  const takerTraits = TakerTraits.default()
    .setExtension(postInteractionExtension)
    .skipOrderPermit()
    .disablePermit2()
    .disableNativeUnwrap();

  const order = new LimitOrder(
    {
      makerAsset: new Address(tokens["WBTC"]!),
      takerAsset: new Address(tokens["USDC"]!),
      makingAmount: wbtcAliceBalance, // 1 WBTC
      takingAmount: parseUnits("100000", 6), // 100_000 USDC
      maker: new Address(alice.address),
      receiver: new Address(alice.address),
    },
    makerTraits,
    postInteractionExtension,
  );

  const typedData = order.getTypedData(1);
  const signature = await client.signTypedData({
    account: alice,
    domain: typedData.domain,
    types: typedData.types,
    primaryType: "Order",
    message: typedData.message,
  });
  const { r, yParityAndS: vs } = Signature.from(signature);

  console.log(`
    Order built and signed, Bob can now fill it.
  `);

  hash = await lop.write.fillOrderArgs(
    [
      {
        salt: order.salt,
        maker: order.maker.toBigint(),
        receiver: order.receiver.toBigint(),
        makerAsset: order.makerAsset.toBigint(),
        takerAsset: order.takerAsset.toBigint(),
        makingAmount: order.makingAmount,
        takingAmount: order.takingAmount,
        makerTraits: order.makerTraits.asBigInt(),
      },
      r as Hex,
      vs as Hex,
      usdcBobBalance,
      takerTraits.encode().trait,
      postInteractionExtension.encode() as Hex,
    ],
    { account: bob },
  );
  await client.waitForTransactionReceipt({ hash });

  console.log(`
    Order filled, let's check the balances. 
  `);

  wbtcAliceBalance = await wbtc.read.balanceOf([alice.address]);
  usdcAliceBalance = await usdc.read.balanceOf([alice.address]);
  eurcAliceBalance = await eurc.read.balanceOf([alice.address]);
  usdtAliceBalance = await usdt.read.balanceOf([alice.address]);

  wbtcBobBalance = await wbtc.read.balanceOf([bob.address]);
  usdcBobBalance = await usdc.read.balanceOf([bob.address]);
  eurcBobBalance = await eurc.read.balanceOf([bob.address]);
  usdtBobBalance = await usdt.read.balanceOf([bob.address]);

  console.log(`
    Alice's post-fill balances:
      - WBTC:    ${wbtcAliceBalance / BigInt(10 ** 8)}
      - USDC:    ${usdcAliceBalance / BigInt(10 ** 6)}
      - EURC:    ${eurcAliceBalance / BigInt(10 ** 6)}
      - USDT:    ${usdtAliceBalance / BigInt(10 ** 6)}
  `);

  console.log(`
    Bob's post-fill balances:
      - WBTC:    ${wbtcBobBalance / BigInt(10 ** 8)}
      - USDC:    ${usdcBobBalance / BigInt(10 ** 6)}
      - EURC:    ${eurcBobBalance / BigInt(10 ** 6)}
      - USDT:    ${usdtBobBalance / BigInt(10 ** 6)}
  `);
}

await demo();
