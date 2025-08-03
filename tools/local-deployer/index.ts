import { interactiveDemo, oneTimeDemo } from "./src/demo";

async function main() {
  if (process.argv.length !== 3) {
    throw new Error(
      "Usage: bun run index.ts <one-time-demo || interactive-demo>",
    );
  }

  if (process.argv[2] === "one-time-demo") {
    await oneTimeDemo();
  } else if (process.argv[2] === "interactive-demo") {
    await interactiveDemo();
  } else {
    throw new Error("Invalid mode, use one-time-demo or interactive-demo");
  }
}

await main();
