"use client";

import React, { useEffect, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Loader2, CheckCircle, Smartphone } from "lucide-react";
import { getUniversalLink } from "@selfxyz/core";
import type { SelfApp } from "@selfxyz/qrcode";

const SelfQRcodeWrapper = dynamic(
  () => import("@selfxyz/qrcode").then((mod) => ({ default: mod.SelfQRcodeWrapper })),
  { ssr: false, loading: () => <Loader2 className="w-10 h-10 animate-spin text-accent" /> }
);

interface VerifyInChatProps {
  agentId: string;
  agentName: string;
  selfAppConfig: Record<string, unknown>;
  sessionId: string;
  onVerified: () => void;
}

const POLL_INTERVAL_MS = 3000;

export function VerifyInChat({
  agentId,
  agentName,
  selfAppConfig,
  sessionId,
  onVerified,
}: VerifyInChatProps) {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    const cfg = selfAppConfig as Record<string, unknown>;
    if (typeof cfg.qrUrl === "string") {
      setQrUrl(cfg.qrUrl);
    }
    if (typeof cfg.deepLink === "string") {
      setDeeplink(cfg.deepLink);
      return;
    }
    try {
      const link = getUniversalLink(selfAppConfig as unknown as SelfApp);
      setDeeplink(link);
    } catch {
      setDeeplink(null);
    }
  }, [selfAppConfig]);

  const checkStatus = useCallback(async () => {
    if (verified) return;
    setChecking(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${baseUrl}/api/agents/${agentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      const data = await res.json();
      if (data.verified) {
        setVerified(true);
        onVerified();
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }, [agentId, verified, onVerified]);

  useEffect(() => {
    if (verified) return;
    const id = setInterval(checkStatus, POLL_INTERVAL_MS);
    checkStatus();
    return () => clearInterval(id);
  }, [checkStatus, verified]);

  const handleQrSuccess = useCallback(() => {
    checkStatus();
  }, [checkStatus]);

  const handleQrError = useCallback((data: { error_code?: string; reason?: string }) => {
    console.warn("[VerifyInChat] QR error:", data);
  }, []);

  if (verified) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
        <span className="text-sm font-medium text-emerald-300">
          {agentName} is verified with Self Agent ID ✅
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="rounded-xl overflow-hidden bg-white p-2 inline-flex">
        {qrUrl ? (
          <Image src={qrUrl} alt="Self verification QR" width={200} height={200} unoptimized />
        ) : (
          <SelfQRcodeWrapper
            selfApp={selfAppConfig as unknown as SelfApp}
            onSuccess={handleQrSuccess}
            onError={handleQrError}
            type="websocket"
            size={200}
            darkMode={false}
            showBorder
            showStatusText
          />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-forest-muted">
          {checking ? (
            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          ) : (
            <span className="w-3 h-3 rounded-full bg-accent/50 shrink-0" />
          )}
          <span>Scan with Self app → passport NFC. Checking every 3s…</span>
        </div>
        {deeplink && (
          <a
            href={deeplink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent-light hover:text-accent font-medium"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Open Self app (mobile)
          </a>
        )}
      </div>
    </div>
  );
}
