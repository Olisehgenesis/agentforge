"use client";

import React from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Zap, Shield } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gypsum">
        <div className="text-center space-y-6 max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-celo shadow-lg shadow-celo/20 mx-auto">
            <Shield className="w-8 h-8 text-forest" />
          </div>
          <h2 className="text-2xl font-bold text-forest">Connect Your Wallet</h2>
          <p className="text-forest-muted">
            Connect your Celo wallet to access the AgentHaus dashboard.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-forest-faint">
            <Zap className="w-3 h-3" />
            <span>Supports WalletConnect & MiniPay</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gypsum">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
