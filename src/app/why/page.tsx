import React from "react";
import Link from "next/link";

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-sans font-normal text-forest uppercase tracking-tighter mb-6">
          Why Agent Haus?
        </h1>
        <div className="space-y-4 text-forest/90">
          <p>
            Agent Haus is a lightweight framework that lets anyone deploy an
            autonomous blockchain agent using nothing more than a chat
            conversation. The platform handles wallet creation, contract
            deployment, API proxies, and all of the boilerplate required to
            make a bot actually work on‑chain.
          </p>

          <h2 className="text-2xl font-semibold text-forest mt-8">
            The ERC‑8004 standard
          </h2>
          <p>
            Every agent created through Agent Haus is registered on-chain as an
            ERC‑8004 token. This common standard provides immediate
            provenance, interoperable metadata, and a unique agent ID that
            any other smart contract or dapp can query. The platform
            abstracts the minting and registry calls, so users never have to
            write or deploy their own contract.
          </p>

          <p>
            Because ERC‑8004 is a community‑driven EVM specification, the same
            agent ID used on Celo could be recognizable on another chain in the
            future. When we talk about "minting an ERC‑8004 token" or an agent
            "registered on chain", that process is completed automatically by
            Agent Haus behind the scenes.
          </p>

          <h2 className="text-2xl font-semibold text-forest mt-8">
            Why it matters
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              **Fast start** – your first agent should take the same time as
              sending a chat message.
            </li>
            <li>
              **Transparent ownership** – third parties can verify who controls
              an agent without extra infrastructure.
            </li>
            <li>
              **No SDKs or servers** – lifecycle management is handled via
              natural-language commands or the dashboard.
            </li>
          </ul>

          <p className="mt-6">
            <Link href="/" className="text-forest underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
