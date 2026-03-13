# Agent Haus

**No-code AI agent platform on Celo.** Deploy, verify, and use ERC-8004 agents with built-in wallet, chat, and SelfClaw economy.

- **Deploy** — Templates (Payment, Trading, Social, Custom), configure LLM + prompt, register on-chain (ERC-8004).
- **Verify** — SelfClaw (Self.xyz passport) for humanity proof; ERC-8004 Identity Registry on Celo for trustless identity.
- **Use** — Chat with agents, run skills (deploy token, request sponsorship, send CELO), connect Telegram/Discord, monitor activity.

Built on [Next.js](https://nextjs.org), [Prisma](https://prisma.io), [Reown AppKit](https://reown.com/appkit) (Celo wallet), and [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) on Celo.

---

## Quick Start

```bash
npm install
cp .env.example .env   # Edit DATABASE_URL, ENCRYPTION_SECRET, etc.
npm run db:push
npm run dev
```

Open [http://localhost:3005](http://localhost:3005). Connect a Celo wallet to create and manage agents.

---

## Agent Haus in a Nutshell

| Concept | What it is |
|--------|------------|
| **Agent Haus** | This platform — you deploy and manage AI agents that have on-chain identity (ERC-8004) and optional SelfClaw verification. |
| **ERC-8004** | Standard for on-chain AI agent identity (Identity Registry + Reputation Registry). Agents get a unique `agentId` and metadata (name, description, services, wallet). |
| **Celo** | Primary chain: Mainnet `42220`, Sepolia testnet `11142220`. Gas paid in CELO; agents can hold cUSD, cEUR, USDC. |
| **SelfClaw** | Humanity verification (Self.xyz passport) + agent economy: deploy token, request liquidity sponsorship, log revenue/cost. |

---

## Deploying Agents

1. **Create** — Dashboard → **Create Agent** → pick a template (Payment, Trading, Social, Custom).
2. **Configure** — Name, description, image (recommended for ERC-8004), system prompt, LLM (e.g. OpenAI or `claude-3-haiku-20240307` for Claude 3 Haiku), spending limit, wallet option (platform-managed or user-provided).
3. **Deploy** — App builds registration JSON (metadata for ERC-8004), uploads image (Cloudinary) and JSON (IPFS via Pinata), then you **Sign to Register ERC-8004** with your wallet. Your wallet pays gas on Celo and becomes the on-chain owner; the agent gets an `agentId` on the Identity Registry.
4. **Verify (optional)** — In the agent’s **Verify** tab, start SelfClaw verification: sign a challenge, scan a QR with the Self app (passport NFC). Once verified, the agent can use SelfClaw economy (deploy token, request sponsorship).

*You can also change the LLM provider/model after deployment via the admin panel (click the shield icon on an agent detail page). New Anthropic models – including `claude-3-haiku-20240307` – appear in the dropdown.*

**Pipeline order for full economy:** Identity (Self) → Wallet (register with SelfClaw) → Gas (fund with CELO) → **ERC-8004** (register on-chain) → Token (deploy) → Liquidity (request sponsorship). Sponsorship requires ERC-8004 first.

- **Docs:** [SELFCLAW_SETUP.md](docs/SELFCLAW_SETUP.md), [SELFCLAW_TOKEN_DEPLOY_VERIFY_SPONSOR_ANALYSIS.md](docs/SELFCLAW_TOKEN_DEPLOY_VERIFY_SPONSOR_ANALYSIS.md)

---

## CLI registration support
Agents and services can also be managed via the companion
`self-agent` CLI (part of the `@selfxyz/agent-sdk` package). The CLI
implements the same verification and registration protocols used by the
web dashboard, and is useful for automation, scripting, or offline
workflows. Key commands include `register init|open|wait|status|export`
and their `deregister` counterparts; see the upstream CLI docs for a
full specification.

The chat interface and skills remain fully compatible with CLI flows.
For example, after running the CLI to obtain a verification QR you can
paste the URL into chat or ask the agent to `generate a QR code`.

---

## Verifying Agents

Two kinds of “verification”:

### 1. SelfClaw (humanity proof)

- **Where:** Agent dashboard → **Verify** tab.
- **Flow:** Start → sign challenge with agent’s Ed25519 key → scan QR with Self app (passport NFC) → poll until verified.
- **Result:** Agent marked verified in DB; can use SelfClaw economy (deploy token, request sponsorship). Private key stored encrypted (`ENCRYPTION_SECRET`).

### 2. ERC-8004 on-chain (identity on Celo)

- **Where:** Agent dashboard → **Register On-Chain (ERC-8004)** or during create flow.
- **Flow:** Backend prepares registration JSON (name, description, image, services, `agentWallet`), uploads to IPFS; you call `register(agentURI)` (or `register(agentURI, metadata)`) on the Identity Registry from your wallet. You pay gas on Celo.
- **Result:** Agent gets an on-chain `agentId`; metadata is public (8004scan, block explorer). Required for SelfClaw sponsorship.

**Contracts (Celo):**

- Mainnet (42220): Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- Sepolia (11142220): see [src/lib/constants.ts](src/lib/constants.ts) (`ERC8004_CONTRACTS`).

**Explorers:** [8004scan](https://www.8004scan.io) (ERC-8004 agent explorer), [Agentscan](https://agentscan.info), [8004.org](https://8004.org). Block explorer links use Celoscan/Blockscout (e.g. `https://celoscan.io/token/0x8004...?a=<agentId>`).

- **Docs:** [ERC8004_BEST_PRACTICES_AUDIT.md](docs/ERC8004_BEST_PRACTICES_AUDIT.md), [ROADMAP.md](docs/ROADMAP.md)

---

## Using Agents

- **Chat** — Open an agent → Chat tab. Messages go through the OpenClaw pipeline: LLM response, skill commands (e.g. `[[SELFCLAW_DEPLOY_TOKEN]]`, `[[REQUEST_SELFCLAW_SPONSORSHIP]]`, `[[SEND_CELO]]`), then transactions. Skills run via SelfClaw API and agent wallet where applicable.
- **Skills** — Stored in DB; agent can invoke e.g. deploy token, request sponsorship, send CELO, show identity/pipeline status. See [src/lib/skills/definitions.ts](src/lib/skills/definitions.ts).
- **Token & economy** — **Token** tab: deploy token, request SelfClaw sponsorship, log revenue/cost, register wallet. Requires verified agent and (for sponsorship) ERC-8004 registration.
- **Channels** — Connect Telegram, Discord, etc.; messages are routed to the agent and replies sent back.
- **Activity** — Dashboard shows chat, skills, and transactions (local activity log; optional SelfClaw feed integration is not implemented).

---

## ERC-8004 on Celo

Agent Haus follows [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) and the [erc-8004/best-practices](https://github.com/erc-8004/best-practices) where applicable:

- **Registration:** name, description, image, `agentWallet`, `agenthaus-chat` service URL, `registrations` (agentId, agentRegistry), `supportedTrust: ["reputation"]`.
- **Chains:** Celo Mainnet (42220), Celo Sepolia (11142220); contracts from [erc-8004-contracts](https://github.com/erc-8004/erc-8004-contracts).
- **Attribution:** All agents include “Agent deployed by agenthaus.space” and a `deployedBy` service; Agent Haus itself can be registered as an ERC-8004 agent for deploy attribution and reputation.

See [docs/ERC8004_BEST_PRACTICES_AUDIT.md](docs/ERC8004_BEST_PRACTICES_AUDIT.md) for a full checklist and optional improvements (OASF skills, Reputation Registry, x402).

---

## Environment

Copy `.env.example` to `.env` and set at least:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (or SQLite) for Prisma |
| `ENCRYPTION_SECRET` | AES-256-GCM for SelfClaw Ed25519 private keys (required in production) |

## CLI Registration (self-agent)

A companion CLI package (`@selfxyz/agent-sdk` / `self-agent-cli`) lets you perform the
same agent onboarding and verification flows from your terminal. The CLI exposes a
rich set of commands (`register init`, `open`, `wait`, `status`, `export`, plus
`deregister` equivalents) covering all four registration modes (verified-wallet,
agent-identity, wallet-free, smart-wallet) and is useful for automation or manual
onboarding outside the web dashboard.

To integrate the CLI with this codebase, simply install the SDK in your project and
use the same session files and callback conventions described in the external docs.
Chat and dashboard features call the same backend APIs, so users can move seamlessly
between CLI and UI flows. When in doubt, ask the agent to `generate a QR code for
verification` or use `[[SELFCLAW_REGISTER_WALLET]]` after updating via CLI.

For full CLI reference see the package documentation (brief excerpt below):

```bash
npx @selfxyz/agent-sdk register init --mode agent-identity --human-address 0x... --network testnet --out .self/session.json
npx @selfxyz/agent-sdk register open --session .self/session.json
npx @selfxyz/agent-sdk register wait --session .self/session.json
```

(see docs/CLI_REGISTRATION.md or the upstream repository for complete details)
| `NEXT_PUBLIC_CHAIN_ID` | Default `42220` (Celo Mainnet) |
| `PINATA_JWT` | IPFS uploads for ERC-8004 registration JSON |
| Cloudinary (or image upload) | Agent images for metadata/ERC-8004 |
| `SELFCLAW_API_URL` | Optional; defaults to `https://selfclaw.ai/api/selfclaw/v1` |

See `.env.example` for CELO RPC, Agent Haus agent IDs, and optional API keys.

### Quickly configure API keys via chat
If you start a conversation with an agent and no API key is set, the UI will return an error telling you to go to **Settings**.  To make things smoother you can now paste a provider name and key directly in chat:

```
openai key is sk-abc123...  
// or: "groq api key: groq-xyz..."  
// you can even specify a model e.g. "openai key sk‑... model:gpt-4o" 
```

The backend will detect the provider, save the encrypted key to your account, optionally update the agent's model, and return a confirmation response.  Your original message will be removed from the conversation history so the secret isn’t stored.

This works for **OpenAI, OpenRouter, Groq, Grok, Gemini, DeepSeek, Z.AI, and Anthropic**. In development the server also falls back to keys in your environment variables.


---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server (port 3005) |
| `npm run build` | Prisma generate + Next.js build |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:studio` | Open Prisma Studio |

---

## Docs

| Doc | Description |
|-----|-------------|
| [SELFCLAW_SETUP.md](docs/SELFCLAW_SETUP.md) | SelfClaw verification (Self.xyz passport, keys, API) |
| [SELFCLAW_TOKEN_DEPLOY_VERIFY_SPONSOR_ANALYSIS.md](docs/SELFCLAW_TOKEN_DEPLOY_VERIFY_SPONSOR_ANALYSIS.md) | Token deploy, verify, sponsor flow and SelfClaw usage |
| [ERC8004_BEST_PRACTICES_AUDIT.md](docs/ERC8004_BEST_PRACTICES_AUDIT.md) | ERC-8004 alignment and checklist |
| [FIRE_AGENT_ANALYSIS.md](docs/FIRE_AGENT_ANALYSIS.md) | Sponsorship flow fixes (order, prompts) |
| [ROADMAP.md](docs/ROADMAP.md) | Trust metadata, TEE, x402, reputation |

---

## Deploy on Vercel

Configure env vars (including `DATABASE_URL`, `ENCRYPTION_SECRET`, `PINATA_JWT`, image upload). Build: `prisma generate && next build`. See [Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying).

---

## License

Private. Celo AgentHAUS © 2026.
