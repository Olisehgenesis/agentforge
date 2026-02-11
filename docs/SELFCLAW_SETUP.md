# SelfClaw Verification — Setup Guide

Integrate [SelfClaw](https://selfclaw.ai) into AgentHaus so every AI agent can prove it's backed by a real human via [Self.xyz](https://self.xyz) zero-knowledge passport proofs.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [File Structure](#file-structure)
7. [Verification Flow (Step-by-Step)](#verification-flow-step-by-step)
8. [API Reference](#api-reference)
9. [Frontend Integration](#frontend-integration)
10. [Key Management & Security](#key-management--security)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Most "AI agents" are just REST APIs — anyone with an API key can fake being an agent. SelfClaw provides **cryptographic proof of humanity** using Self.xyz passport verification:

- **Zero-knowledge proofs** — raw passport data never leaves the user's device
- **180+ countries** — works with any NFC-enabled passport
- **Ed25519 signatures** — agents prove key ownership before verification
- **Privacy-preserving** — `humanId` is a derived identifier, not personal data

After verification, agents get a ✅ badge in the dashboard and can be trusted by external consumers via the SelfClaw public API.

---

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────┐
│  AgentHaus UI  │─────▶│  /api/agents/     │─────▶│  SelfClaw   │
│  (Verify Tab)   │      │  [id]/verify      │      │  API (v1)   │
└─────────────────┘      └──────────────────┘      └──────┬──────┘
                                │                         │
                                │ Prisma                  │ Self.xyz
                                ▼                         ▼
                         ┌──────────────┐          ┌─────────────┐
                         │  SQLite /    │          │  Self App   │
                         │  PostgreSQL  │          │  (QR Scan)  │
                         └──────────────┘          └─────────────┘
```

**Flow summary:**
1. AgentHaus generates an Ed25519 key pair for the agent
2. Public key is sent to SelfClaw → returns a session + challenge
3. AgentHaus signs the challenge server-side → submits signature
4. User scans a QR code with the Self app (passport NFC verification)
5. AgentHaus polls SelfClaw until verification completes
6. Agent is marked verified in the database with a `humanId`

---

## Prerequisites

| Requirement | Details |
|---|---|
| Node.js | v18+ |
| `@noble/ed25519` | Ed25519 key generation & signing (`npm install @noble/ed25519`) |
| Prisma | ORM for database (already part of AgentHaus) |
| `ENCRYPTION_SECRET` | For AES-256-GCM encryption of private keys in the database |

### Install the Ed25519 library

```bash
npm install @noble/ed25519
```

This is the only additional dependency. Everything else uses Node.js built-in `crypto`.

---

## Environment Variables

Add these to your `.env` file:

```env
# SelfClaw API (optional — defaults to production)
SELFCLAW_API_URL=https://selfclaw.ai/api/selfclaw/v1

# Encryption key for storing Ed25519 private keys in the database
# REQUIRED for production. Falls back to DATABASE_URL in development.
ENCRYPTION_SECRET=your-strong-random-secret-here
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `SELFCLAW_API_URL` | No | `https://selfclaw.ai/api/selfclaw/v1` | SelfClaw API base URL |
| `ENCRYPTION_SECRET` | **Yes** (prod) | Derived from `DATABASE_URL` | AES-256-GCM key for encrypting Ed25519 private keys at rest |

---

## Database Setup

### 1. Add the `AgentVerification` model to your Prisma schema

```prisma
// prisma/schema.prisma

model AgentVerification {
  id                  String   @id @default(uuid())

  agentId             String   @unique
  agent               Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)

  // Ed25519 key pair
  publicKey           String   // SPKI base64 format (e.g. "MCowBQYDK2VwAyEA...")
  encryptedPrivateKey String   // AES-256-GCM encrypted hex private key

  // Verification state machine
  status              String   @default("pending")
  // States: pending → challenge_signed → qr_ready → verified | failed | expired
  sessionId           String?  // SelfClaw session ID
  challenge           String?  // Challenge string to sign (from SelfClaw)

  // Data returned after verification
  humanId             String?  // Privacy-preserving human identifier
  agentKeyHash        String?  // SHA-256 of agent public key
  agentName           String?  // Name registered with SelfClaw
  swarmUrl            String?  // URL to view all agents by this human

  // Self.xyz specific
  selfxyzVerified     Boolean  @default(false)
  selfxyzRegisteredAt DateTime?

  // QR code / Self app configuration
  selfAppConfig       String?  // JSON: Self.xyz QR code config object

  // Timestamps
  verifiedAt          DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### 2. Add the relation to your `Agent` model

```prisma
model Agent {
  // ... existing fields ...

  verification      AgentVerification?
}
```

### 3. Push to database

```bash
npx prisma db push
npx prisma generate
```

---

## File Structure

```
src/
├── lib/
│   ├── selfclaw/
│   │   ├── client.ts          # SelfClaw API client (HTTP calls)
│   │   └── keys.ts            # Ed25519 key generation, signing, encryption
│   └── crypto.ts              # AES-256-GCM encrypt/decrypt (shared utility)
├── app/
│   ├── api/
│   │   └── agents/
│   │       └── [id]/
│   │           └── verify/
│   │               └── route.ts   # GET/POST verification API
│   └── dashboard/
│       ├── agents/
│       │   ├── page.tsx           # Agent listing (shows verification badge)
│       │   └── [id]/
│       │       └── page.tsx       # Agent detail (Verification tab)
│       └── verify/
│           └── page.tsx           # Dedicated verification overview page
└── components/
    └── layout/
        └── sidebar.tsx            # Navigation (includes Verify link)
```

---

## Verification Flow (Step-by-Step)

### Step 1: Start Verification

**Frontend** calls `POST /api/agents/{id}/verify` with `{ action: "start" }`.

**Backend** (`handleStart`):
1. Generates an Ed25519 key pair via `@noble/ed25519`
2. Converts the 32-byte raw public key to **SPKI DER base64** format
3. Encrypts the private key with AES-256-GCM for database storage
4. Calls SelfClaw `POST /start-verification` with the public key
5. Stores the session ID, challenge, and QR config in `AgentVerification`
6. Returns the challenge and session info to the frontend

```typescript
// Key generation (src/lib/selfclaw/keys.ts)
import * as ed from "@noble/ed25519";

const privateKey = ed.utils.randomSecretKey();
const publicKeyRaw = await ed.getPublicKeyAsync(privateKey);

// Convert to SPKI DER base64 (required by SelfClaw)
const spkiHeader = Buffer.from("302a300506032b6570032100", "hex");
const spkiDer = Buffer.concat([spkiHeader, Buffer.from(publicKeyRaw)]);
const publicKeySpki = spkiDer.toString("base64");
// → "MCowBQYDK2VwAyEA..."
```

### Step 2: Sign Challenge

**Frontend** calls `POST /api/agents/{id}/verify` with `{ action: "sign" }`.

**Backend** (`handleSign`):
1. Retrieves the encrypted private key from the database
2. Decrypts it
3. Signs the **exact** challenge string returned by SelfClaw (byte-for-byte, no modification)
4. Submits the hex-encoded signature to SelfClaw `POST /sign-challenge`
5. Updates status to `qr_ready`

```typescript
// Signing (src/lib/selfclaw/keys.ts)
const messageBytes = new TextEncoder().encode(challenge); // exact string from SelfClaw
const signature = await ed.signAsync(messageBytes, privateKey);
const signatureHex = Buffer.from(signature).toString("hex"); // 128 hex chars
```

> **Critical:** Do NOT modify, re-serialize, or reformat the challenge string. Sign the exact bytes returned by SelfClaw's `/start-verification` endpoint.

### Step 3: QR Code Scan

After signing, the Self.xyz QR code configuration is available. The frontend displays this QR code for the user to scan with the **Self app** on their phone. The Self app performs NFC passport verification using zero-knowledge proofs.

### Step 4: Poll for Completion

**Frontend** polls `POST /api/agents/{id}/verify` with `{ action: "check" }` every 3 seconds.

**Backend** (`handleCheck`):
1. Calls SelfClaw `GET /agent?publicKey=...` to check verification status
2. If `verified: true`, updates the database with `humanId`, `swarmUrl`, and timestamps
3. Logs the verification event in `ActivityLog`

```typescript
// Polling (src/lib/selfclaw/client.ts)
const status = await fetch(
  `https://selfclaw.ai/api/selfclaw/v1/agent?publicKey=${encodeURIComponent(publicKey)}`
);
const data = await status.json();
// data.verified === true when passport scan completes
```

---

## API Reference

### `GET /api/agents/{id}/verify`

Returns the current verification status for an agent.

**Response:**
```json
{
  "status": "not_started | pending | qr_ready | verified | failed",
  "verified": false,
  "publicKey": "MCowBQYDK2VwAyEA...",
  "humanId": "0x1234abcd...",
  "swarmUrl": "https://selfclaw.ai/human/0x1234abcd",
  "verifiedAt": "2026-02-10T12:00:00Z",
  "selfAppConfig": { /* Self.xyz QR code config */ },
  "hasSession": true
}
```

### `POST /api/agents/{id}/verify`

Advance the verification flow. Send `{ action: "..." }` in the request body.

| Action | Description | Prerequisites |
|---|---|---|
| `start` | Generate keys, start SelfClaw session | Agent must exist |
| `sign` | Sign challenge, submit to SelfClaw | `start` must have been called |
| `check` | Poll SelfClaw for verification result | `sign` must have been called |
| `restart` | Delete existing session, start fresh | Any state |

**Start Response:**
```json
{
  "status": "pending",
  "sessionId": "uuid-session-id",
  "signatureRequired": true,
  "selfAppConfig": { /* QR config */ },
  "publicKey": "MCowBQYDK2VwAyEA...",
  "message": "Verification started. Next step: call with action 'sign'."
}
```

**Sign Response:**
```json
{
  "status": "qr_ready",
  "message": "Challenge signed. Scan the QR code with the Self app.",
  "selfAppConfig": { /* Self.xyz QR code config */ }
}
```

**Check Response (verified):**
```json
{
  "status": "verified",
  "verified": true,
  "humanId": "0x1234abcd...",
  "swarmUrl": "https://selfclaw.ai/human/0x1234abcd",
  "verifiedAt": "2026-02-10T12:00:00Z"
}
```

---

## Frontend Integration

### Verification Badge on Agent Cards

Add a badge next to the agent name when `agent.verification?.selfxyzVerified` is `true`:

```tsx
import { BadgeCheck } from "lucide-react";

{agent.verification?.selfxyzVerified && (
  <span title="SelfClaw Verified">
    <BadgeCheck className="w-4 h-4 text-emerald-400" />
  </span>
)}
```

### Include Verification in Agent API Response

When listing agents, include the verification relation:

```typescript
const agents = await prisma.agent.findMany({
  where: { ownerId: user.id },
  include: {
    verification: {
      select: {
        selfxyzVerified: true,
        humanId: true,
        verifiedAt: true,
      },
    },
  },
});
```

### Verification Tab (Agent Detail Page)

The agent detail page includes a "Verify" tab with:
- Current verification status display
- "Start Verification" button (calls `action: "start"` then auto-advances to `action: "sign"`)
- QR code display area (from `selfAppConfig`)
- Auto-polling for scan completion (every 3s when in `qr_ready` state)
- Verified state showing humanId and swarm link

### Dedicated Verify Page (`/dashboard/verify`)

A standalone page listing all agents with their verification status, stats counters (total/verified/unverified), and links to each agent's verification tab.

### Sidebar Navigation

Add a "Verify" link to your sidebar navigation:

```tsx
import { ShieldCheck } from "lucide-react";

const navItems = [
  // ... existing items ...
  { name: "Verify", href: "/dashboard/verify", icon: ShieldCheck },
];
```

---

## Key Management & Security

### Ed25519 Key Storage

| What | Where | Format |
|---|---|---|
| Public key | `AgentVerification.publicKey` | SPKI DER base64 (`MCowBQYDK2VwAyEA...`) |
| Private key | `AgentVerification.encryptedPrivateKey` | AES-256-GCM encrypted hex (`iv:authTag:ciphertext`) |

### SPKI Format

SelfClaw accepts two public key formats (auto-detected):
- **SPKI DER base64** (44 bytes decoded, starts with `MCow...`) — what we generate
- **Raw 32-byte base64** — also accepted

We generate SPKI by prepending the standard 12-byte Ed25519 SPKI header:

```typescript
const SPKI_HEADER = Buffer.from("302a300506032b6570032100", "hex"); // 12 bytes
const spkiDer = Buffer.concat([SPKI_HEADER, rawPublicKey]);        // 44 bytes
```

### Encryption at Rest

Private keys are encrypted using AES-256-GCM before database storage via `src/lib/crypto.ts`. The encryption key is derived from `ENCRYPTION_SECRET` using `scryptSync`.

```
Stored format: ${iv_hex}:${authTag_hex}:${ciphertext_hex}
```

> **Production requirement:** Always set `ENCRYPTION_SECRET` to a strong random value. The development fallback is NOT secure.

### Signature Format

SelfClaw accepts signatures in two formats (auto-detected):
- **Hex** (128 characters) — what we use
- **Base64** (44 characters)

The decoded signature must be exactly **64 bytes** (standard Ed25519).

---

## Troubleshooting

### Common Issues

| Problem | Cause | Fix |
|---|---|---|
| "Invalid signature" from SelfClaw | Challenge was modified before signing | Sign the **exact** `challenge` string from `/start-verification` — do not `JSON.parse()` then re-stringify |
| "Session expired" | Challenge expires after 10 minutes | Call `action: "restart"` to get a new session |
| Private key decryption fails | `ENCRYPTION_SECRET` changed | Agent must re-verify (old encrypted keys are unrecoverable) |
| `@noble/ed25519` import errors | Wrong function names | Use `ed.utils.randomSecretKey()` (not `randomPrivateKey`), `ed.signAsync()`, `ed.getPublicKeyAsync()` |
| 404 from SelfClaw check | Agent not yet verified | Keep polling — 404 means the QR hasn't been scanned yet |

### Debugging Checklist

1. **Key generation** — Verify public key is SPKI base64 (starts with `MCow`, ~44 chars base64)
2. **Challenge signing** — Use `new TextEncoder().encode(challenge)` to convert string to bytes before signing
3. **Signature encoding** — Output must be hex (128 chars) or base64 (44 chars), decoded to exactly 64 bytes
4. **Database** — Run `npx prisma db push` after schema changes, then `npx prisma generate`
5. **Encryption** — Ensure `ENCRYPTION_SECRET` is set consistently across restarts

### SelfClaw API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/start-verification` | POST | Start a new verification session |
| `/sign-challenge` | POST | Submit the signed challenge |
| `/agent?publicKey=...` | GET | Check verification status |
| `/human/{humanId}` | GET | List all agents by a human (swarm) |

Full SelfClaw docs: [https://selfclaw.ai/docs](https://selfclaw.ai/docs)

---

## External References

- [SelfClaw Developer Integration](https://selfclaw.ai/docs) — Full API documentation
- [SelfClaw llms.txt](https://selfclaw.ai/llms.txt) — Machine-readable integration guide
- [Self.xyz](https://self.xyz) — Zero-knowledge passport verification
- [@noble/ed25519](https://github.com/paulmillr/noble-ed25519) — Ed25519 library
- [ERC-8004](https://github.com/erc-8004/erc-8004-contracts) — On-chain agent identity standard

