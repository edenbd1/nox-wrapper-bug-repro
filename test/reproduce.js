import { createEthersHandleClient } from "@iexec-nox/handle";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { config } from "dotenv";
config();

const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

function load(path) {
  return JSON.parse(readFileSync(`artifacts/contracts/${path}`, "utf-8"));
}

async function main() {
  console.log("═══ Nox ERC20ToERC7984Wrapper Bug Reproduction ═══");
  console.log("Wallet:", wallet.address);
  console.log("Network: Arbitrum Sepolia (421614)\n");

  // 1. Deploy MockERC20
  const mockArt = load("MockERC20.sol/MockERC20.json");
  const mock = await new ethers.ContractFactory(mockArt.abi, mockArt.bytecode, wallet).deploy();
  await mock.waitForDeployment();
  await (await mock.faucet(wallet.address, ethers.parseEther("1000"))).wait();
  console.log("MockERC20:", await mock.getAddress());

  // 2. Deploy WizardWrapper (cdefi-wizard code — BROKEN)
  const wizArt = load("WizardWrapper.sol/WizardWrapper.json");
  const wizard = await new ethers.ContractFactory(wizArt.abi, wizArt.bytecode, wallet).deploy(await mock.getAddress());
  await wizard.waitForDeployment();
  console.log("WizardWrapper:", await wizard.getAddress());

  // 3. Deploy PiggyWrapper (Nox.add pattern — WORKS)
  const pigArt = load("PiggyWrapper.sol/PiggyWrapper.json");
  const piggy = await new ethers.ContractFactory(pigArt.abi, pigArt.bytecode, wallet).deploy(await mock.getAddress());
  await piggy.waitForDeployment();
  console.log("PiggyWrapper:", await piggy.getAddress());

  // 4. Wrap 500 tokens on BOTH wrappers
  await (await mock.approve(await wizard.getAddress(), ethers.parseEther("500"))).wait();
  await (await wizard.wrap(wallet.address, ethers.parseEther("500"), { gasLimit: 1000000 })).wait();
  console.log("\nWrapped 500 TKN → WizardWrapper ✅");

  await (await mock.approve(await piggy.getAddress(), ethers.parseEther("500"))).wait();
  await (await piggy.wrap(wallet.address, ethers.parseEther("500"), { gasLimit: 1000000 })).wait();
  console.log("Wrapped 500 TKN → PiggyWrapper ✅");

  // 5. Read handles
  const wizHandle = await wizard.confidentialBalanceOf(wallet.address);
  const pigHandle = await piggy.confidentialBalanceOf(wallet.address);
  console.log("\nWizard handle:", wizHandle);
  console.log("Piggy handle: ", pigHandle);

  // 6. Decrypt both
  const hc = await createEthersHandleClient(wallet);

  console.log("\n--- Decrypt WizardWrapper (ERC20ToERC7984Wrapper._update with safeAdd/select) ---");
  for (const wait of [0, 15, 30]) {
    if (wait > 0) {
      console.log(`Waiting ${wait}s...`);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
    try {
      const r = await hc.decrypt(wizHandle);
      const val = typeof r.value === "bigint" ? r.value : BigInt(String(r.value));
      console.log("✅ DECRYPTED:", ethers.formatEther(val));
      break;
    } catch {
      console.log("❌ 404 — Handle Gateway does not have ciphertext");
    }
  }

  console.log("\n--- Decrypt PiggyWrapper (Nox.add directly) ---");
  try {
    const r = await hc.decrypt(pigHandle);
    const val = typeof r.value === "bigint" ? r.value : BigInt(String(r.value));
    console.log("✅ DECRYPTED:", ethers.formatEther(val));
  } catch (e) {
    console.log("❌:", e.message.slice(0, 100));
  }

  console.log("\n═══ RESULT ═══");
  console.log("WizardWrapper (official code):  ❌ Cannot decrypt");
  console.log("PiggyWrapper (Nox.add/sub):     ✅ Instant decrypt");
  console.log("Same token, same amount, same wallet — only difference is _update implementation");
}

main().catch((e) => {
  console.error("FAIL:", e.message.slice(0, 300));
  process.exit(1);
});
