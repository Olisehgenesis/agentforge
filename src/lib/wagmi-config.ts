"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

// Define chains inline to avoid barrel import issues with Turbopack HMR
const celoSepolia = defineChain({
  id: 11_142_220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://celo-sepolia.drpc.org"] },
  },
  blockExplorers: {
    default: {
      name: "Celo Sepolia Explorer",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
  testnet: true,
});

const celo = defineChain({
  id: 42_220,
  name: "Celo",
  nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo.org"] },
  },
  blockExplorers: {
    default: {
      name: "Celo Explorer",
      url: "https://celoscan.io",
    },
  },
  testnet: false,
});

export const config = getDefaultConfig({
  appName: "Celo AgentHaus",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  // Celo Sepolia first — we're on testnet for now
  chains: [celoSepolia, celo],
  ssr: true,
});
