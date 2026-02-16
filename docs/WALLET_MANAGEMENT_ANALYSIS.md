# Wallet Management: Agentforge vs SelfClaw — Analysis

**Question:** Should wallet management be done by SelfClaw, not our API? Does our approach conflict with [selfclaw.app/developers](https://selfclaw.app/developers) or [SelfClaw GitHub](https://github.com/mbarbosa30/SelfClaw)?

---

## TL;DR

**No conflict.** SelfClaw does **not** create or manage wallets. They only **register** addresses you provide. Your (agentforge) wallet system is correct and compatible. SelfClaw never stores private keys regardless of who creates the wallet.

---

## 1. What SelfClaw Actually Does

From [selfclaw.app/developers](https://selfclaw.app/developers) and the [SelfClaw GitHub README](https://github.com/mbarbosa30/SelfClaw):

| SelfClaw Endpoint | What it does |
|-------------------|--------------|
| `POST /create-wallet` | **Register** an address you provide. Body: `{ walletAddress: "0x..." }`. SelfClaw stores only the address. |
| `POST /request-gas` | Send CELO to the **already-registered** wallet |
| `POST /deploy-token` | Return **unsigned** tx — you sign with your own key and broadcast |
| `POST /register-token` | Confirm deployed token (txHash + address) |

**SelfClaw never:**
- Creates wallets
- Stores private keys
- Signs transactions

Their docs say: *"The agent generates its own wallet (ethers.js, viem, etc.) and submits the address. SelfClaw never stores private keys."* — This describes **who submits** the address, not who creates it. SelfClaw’s API only accepts an address; it does not verify who generated it.

---

## 2. What Agentforge Does

| Component | Responsibility |
|-----------|----------------|
| **HD Wallet** (`src/lib/blockchain/wallet.ts`) | Derives EVM wallets from `AGENT_MNEMONIC` via path `m/44'/60'/0'/0/{index}`. Each agent gets a unique index. |
| **Agent creation** | Assigns derivation index, derives address, stores `agentWalletAddress` in DB |
| **Signing** | When agent needs to sign (deploy, execute, etc.), derives account from mnemonic + index, signs in memory |
| **SelfClaw registration** | Calls `createWallet(signed, agent.agentWalletAddress, "celo")` — submits our address to SelfClaw |

**Custody model:** Agentforge holds the mnemonic (server-side). Private keys are derived on demand and never persisted.

---

## 3. Does This Conflict?

**No.** The flow is:

1. Agentforge creates the wallet (HD derivation)
2. Agentforge submits the address to SelfClaw via `create-wallet`
3. SelfClaw stores the address and uses it for gas subsidies, deploy-token (unsigned tx), sponsorship, etc.
4. Agentforge signs transactions when needed (deploy, execute, etc.)

SelfClaw’s API only needs an address. It does not care whether:
- The platform (agentforge) derived it from a mnemonic, or
- The agent generated it at runtime (e.g. `ethers.Wallet.createRandom()`)

Both are valid. SelfClaw never sees or stores private keys.

---

## 4. Could SelfClaw Manage Wallets Instead?

**No.** SelfClaw does not offer wallet creation or management. They have:

- **create-wallet** = “register this address I’m giving you”
- **request-gas** = “send CELO to my registered address”
- **deploy-token** = “give me an unsigned tx” (you sign it yourself)

There is no SelfClaw endpoint that returns a new wallet or manages keys. Someone must create and hold the wallet; in your setup, that’s agentforge.

---

## 5. SelfClaw’s “Agent Generates Its Own Wallet” Model

Their ideal model: the agent (as software) generates its own wallet and holds the key.

**If you wanted to align with that:**

- Agent (via skill) could call `ethers.Wallet.createRandom()` or similar
- Agent would need to store the EVM private key (encrypted) — similar to `encryptedPrivateKey` for Ed25519
- Agent would submit that address to SelfClaw via `create-wallet`
- Agent would sign deploy-token, execute, etc. using that stored key

**Trade-offs:**
- More complex: need secure storage for EVM keys per agent
- Same outcome for SelfClaw: they still only receive an address
- Your current HD model is simpler and works with SelfClaw as-is

---

## 6. Summary

| Question | Answer |
|----------|--------|
| Does our wallet management damage SelfClaw integration? | **No** |
| Should SelfClaw manage wallets? | **SelfClaw does not manage wallets** — they only register addresses |
| Is our approach correct? | **Yes** — create wallets, register with SelfClaw, sign with our keys |
| Does SelfClaw store our keys? | **No** — they never store private keys |

**Conclusion:** Your implementation is correct and compatible. SelfClaw is a registry and economy layer; wallet creation and custody stay with agentforge.
