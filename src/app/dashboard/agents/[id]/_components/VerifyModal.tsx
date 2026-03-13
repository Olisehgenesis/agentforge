"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  ShieldCheck, BadgeCheck, AlertCircle, Loader2, XCircle,
  UserCheck, ExternalLink, Copy, ScanLine, Info, Wallet,
  RefreshCw, RotateCcw, Shield,
} from "lucide-react";
import { StableSelfQR, SessionCountdown } from "./SelfQR";
import type { SelfApp } from "@selfxyz/qrcode";
import type { AgentData, VerificationStatus } from "../_types";

interface VerifyModalProps {
  open: boolean;
  onClose: () => void;
  agent: AgentData;
  verificationStatus: VerificationStatus | null;
  isConnected: boolean;
  isCeloMainnet: boolean;
  connectedChainId: number | undefined;
  verifyLoading: boolean;
  qrSessionExpired: boolean;
  proofError: string | null;
  isSessionActive: boolean;
  showVerifyDebug: boolean;
  // Actions
  handleStartVerification: () => void;
  handleRestartVerification: () => void;
  handleSyncVerification?: () => void;
  handleQrSuccess: () => void;
  handleQrError: (err: unknown) => void;
  setQrSessionExpired: (v: boolean) => void;
  setProofError: (v: string | null) => void;
  setShowVerifyDebug: (v: boolean) => void;
  onSwitchToCelo: () => void;
  CELO_MAINNET_CHAIN_ID: number;
}

export function VerifyModal({
  open,
  onClose,
  agent,
  verificationStatus,
  isConnected,
  isCeloMainnet,
  connectedChainId,
  verifyLoading,
  qrSessionExpired,
  proofError,
  isSessionActive,
  showVerifyDebug,
  handleStartVerification,
  handleRestartVerification,
  handleSyncVerification,
  handleQrSuccess,
  handleQrError,
  setQrSessionExpired,
  setProofError,
  setShowVerifyDebug,
  onSwitchToCelo,
}: VerifyModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-md"
      onUseDefault={
        verificationStatus?.status === "failed" || verificationStatus?.status === "qr_ready"
          ? handleRestartVerification
          : undefined
      }
    >
      <div className="p-6 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-lg shadow-accent/20">
            <ShieldCheck className="w-5 h-5 text-forest" />
          </div>
          <div className="flex-1">
            <h3 className="text-forest font-semibold">Self Verification</h3>
            <p className="text-[10px] text-forest-muted/70">
              Powered by{" "}
              <a href="https://self-agent-id.vercel.app" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light">
                Self Agent ID
              </a>
              {" "}on Celo via Self.xyz
            </p>
          </div>
          {verificationStatus?.verified ? (
            <Badge className="bg-forest/20 text-forest-light border-forest/30 gap-1">
              <BadgeCheck className="w-3 h-3" /> Verified
            </Badge>
          ) : isCeloMainnet ? (
            <Badge className="bg-forest/10 text-forest-light/80 border-forest/20 gap-1 text-[10px]">Celo ✓</Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-400/80 border-amber-500/20 gap-1 text-[10px]">
              <AlertCircle className="w-2.5 h-2.5" /> Wrong Network
            </Badge>
          )}
        </div>

        {/* ── Verified ── */}
        {verificationStatus?.verified && <VerifiedContent verificationStatus={verificationStatus} />}

        {/* ── Network check ── */}
        {!verificationStatus?.verified && (!isConnected || !isCeloMainnet) && (
          <NetworkCheckContent isConnected={isConnected} connectedChainId={connectedChainId} onSwitchToCelo={onSwitchToCelo} />
        )}

        {/* ── Not started ── */}
        {(!verificationStatus || verificationStatus.status === "not_started") && isConnected && isCeloMainnet && (
          <NotStartedContent verifyLoading={verifyLoading} handleStartVerification={handleStartVerification} />
        )}

        {/* ── QR Ready ── */}
        {verificationStatus && !verificationStatus.verified &&
          ["qr_ready", "challenge_signed", "pending"].includes(verificationStatus.status) && (
          <QrReadyContent
            agent={agent}
            verificationStatus={verificationStatus}
            verifyLoading={verifyLoading}
            qrSessionExpired={qrSessionExpired}
            proofError={proofError}
            isSessionActive={isSessionActive}
            showVerifyDebug={showVerifyDebug}
            handleRestartVerification={handleRestartVerification}
            handleQrSuccess={handleQrSuccess}
            handleQrError={handleQrError}
            setQrSessionExpired={setQrSessionExpired}
            setProofError={setProofError}
            setShowVerifyDebug={setShowVerifyDebug}
          />
        )}

        {/* ── Failed ── */}
        {verificationStatus?.status === "failed" && (
          <div className="text-center space-y-3">
            <XCircle className="w-10 h-10 text-red-400 mx-auto" />
            <div>
              <h4 className="text-forest font-semibold mb-1">Verification Failed</h4>
              <p className="text-xs text-forest-muted max-w-xs mx-auto">
                {verificationStatus.message || "Something went wrong. Please try again."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRestartVerification} disabled={verifyLoading}>
              {verifyLoading ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Restarting...</>
              ) : (
                <><RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Try Again</>
              )}
            </Button>
          </div>
        )}

        {/* ── Re-check from Self (for agents verified elsewhere) ── */}
        {!verificationStatus?.verified && verificationStatus && isConnected && isCeloMainnet && handleSyncVerification && (
          <div className="pt-2 border-t border-forest/10">
            <button
              type="button"
              onClick={handleSyncVerification}
              className="text-xs text-accent hover:text-accent-light flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Re-check from Self
            </button>
            <p className="text-[10px] text-forest-muted/70 mt-1">
              If you verified on another device, this will sync your status.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Sub-sections (only used inside VerifyModal) ──────────────────── */

function VerifiedContent({ verificationStatus }: { verificationStatus: VerificationStatus }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-gradient-to-br from-forest/5 to-forest/2 border border-forest/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-forest/20 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-forest-light" />
          </div>
          <div>
            <h4 className="text-forest font-semibold text-sm">Agent Verified</h4>
            <p className="text-[10px] text-forest-light/80">Backed by a verified human via passport ZK proof</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {verificationStatus.humanId && (
            <div className="p-2.5 rounded-lg bg-gypsum">
              <div className="text-[10px] text-forest-muted/70 uppercase tracking-wider mb-0.5">Human ID</div>
              <div className="text-xs text-forest font-mono truncate">{verificationStatus.humanId.slice(0, 12)}...</div>
            </div>
          )}
          {verificationStatus.verifiedAt && (
            <div className="p-2.5 rounded-lg bg-gypsum">
              <div className="text-[10px] text-forest-muted/70 uppercase tracking-wider mb-0.5">Verified</div>
              <div className="text-xs text-forest">{new Date(verificationStatus.verifiedAt).toLocaleDateString()}</div>
            </div>
          )}
          {verificationStatus.publicKey && (
            <div className="p-2.5 rounded-lg bg-gypsum col-span-2">
              <div className="text-[10px] text-forest-muted/70 uppercase tracking-wider mb-0.5">Public Key</div>
              <div className="text-[10px] text-forest/80 font-mono break-all">{verificationStatus.publicKey}</div>
            </div>
          )}
        </div>

        {verificationStatus.swarmUrl && (
          <a href={verificationStatus.swarmUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-light">
            View all agents by this human <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-lg bg-gypsum/80 text-center">
          <Shield className="w-4 h-4 text-forest-light mx-auto mb-1" />
          <div className="text-[10px] text-forest-muted">ZK Proof</div>
        </div>
        <div className="p-2.5 rounded-lg bg-gypsum/80 text-center">
          <ScanLine className="w-4 h-4 text-accent mx-auto mb-1" />
          <div className="text-[10px] text-forest-muted">Zero-Knowledge</div>
        </div>
        <div className="p-2.5 rounded-lg bg-gypsum/80 text-center">
          <BadgeCheck className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <div className="text-[10px] text-forest-muted">180+ Countries</div>
        </div>
      </div>
    </div>
  );
}

function NetworkCheckContent({ isConnected, connectedChainId, onSwitchToCelo }: { isConnected: boolean; connectedChainId: number | undefined; onSwitchToCelo: () => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-7 h-7 text-amber-400" />
        </div>
        <h4 className="text-forest font-semibold mb-1">Celo Mainnet Required</h4>
        <p className="text-xs text-forest-muted max-w-sm mx-auto mb-4">
          Self verification requires <span className="text-amber-300 font-medium">Celo Mainnet</span> (Chain ID 42220).
          {!isConnected ? " Please connect your wallet first." : ` You're currently on chain ${connectedChainId}.`}
        </p>
        {!isConnected ? (
          <div className="p-3 rounded-lg bg-[#AB9FF2]/10 border border-[#AB9FF2]/30">
            <p className="text-xs text-[#AB9FF2]"><Wallet className="w-4 h-4 inline mr-1" />Connect your wallet using the button in the navigation bar.</p>
          </div>
        ) : (
          <Button variant="glow" onClick={onSwitchToCelo} className="px-6">
            <RefreshCw className="w-4 h-4 mr-2" /> Switch to Celo Mainnet
          </Button>
        )}
      </div>
      <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-forest-muted">
            Self Agent ID uses Self.xyz passport verification on <span className="text-amber-300 font-medium">Celo Mainnet</span> for ZK proof anchoring.
          </p>
        </div>
      </div>
    </div>
  );
}

function NotStartedContent({ verifyLoading, handleStartVerification }: { verifyLoading: boolean; handleStartVerification: () => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent-light/20 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-7 h-7 text-accent" />
        </div>
        <h4 className="text-forest font-semibold mb-1">Verify Your Agent</h4>
        <p className="text-xs text-forest-muted max-w-sm mx-auto mb-4">
          Prove your agent is backed by a real human using passport-based zero-knowledge proofs. Data never leaves your device.
        </p>
        <Button variant="glow" onClick={handleStartVerification} disabled={verifyLoading} className="px-6">
          {verifyLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Starting...</>
          ) : (
            <><ShieldCheck className="w-4 h-4 mr-2" /> Start Verification</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { step: "1", title: "Register Keys", desc: "Ed25519 + Self Agent ID" },
          { step: "2", title: "Sign Challenge", desc: "Prove key ownership" },
          { step: "3", title: "Scan QR", desc: "Passport ZK proof" },
        ].map((s) => (
          <div key={s.step} className="p-3 rounded-lg bg-gypsum/80 border border-forest/15/30 text-center">
            <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center mx-auto mb-1.5">
              <span className="text-accent font-bold text-[10px]">{s.step}</span>
            </div>
            <h5 className="text-[10px] font-medium text-forest">{s.title}</h5>
            <p className="text-[8px] text-forest-muted/70 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="p-2.5 rounded-lg bg-accent/5 border border-accent/20">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-forest-muted">
            You&apos;ll need the{" "}
            <a href="https://self.xyz" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light font-medium">Self app</a>
            {" "}and an NFC-enabled passport. Connected to <span className="text-forest-light font-medium">Celo Mainnet</span> ✅
          </p>
        </div>
      </div>
    </div>
  );
}

function QrReadyContent({
  agent, verificationStatus, verifyLoading, qrSessionExpired,
  proofError, isSessionActive, showVerifyDebug,
  handleRestartVerification, handleQrSuccess, handleQrError,
  setQrSessionExpired, setProofError, setShowVerifyDebug,
}: {
  agent: AgentData;
  verificationStatus: VerificationStatus;
  verifyLoading: boolean;
  qrSessionExpired: boolean;
  proofError: string | null;
  isSessionActive: boolean;
  showVerifyDebug: boolean;
  handleRestartVerification: () => void;
  handleQrSuccess: () => void;
  handleQrError: (err: unknown) => void;
  setQrSessionExpired: (v: boolean) => void;
  setProofError: (v: string | null) => void;
  setShowVerifyDebug: (v: boolean) => void;
}) {
  const rawCfg = verificationStatus.selfAppConfig as Record<string, unknown> | undefined;
  const qrDataCfg =
    rawCfg?.qrData && typeof rawCfg.qrData === "object"
      ? (rawCfg.qrData as Record<string, unknown>)
      : null;
  const qrUrl = typeof rawCfg?.qrUrl === "string" ? rawCfg.qrUrl : null;
  const deepLink = typeof rawCfg?.deepLink === "string" ? rawCfg.deepLink : null;
  const selfAppForQr = (qrDataCfg || rawCfg) as unknown as SelfApp;
  const canUseSdkQr = !!selfAppForQr && (qrDataCfg != null || !qrUrl);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h4 className="text-forest font-semibold text-lg mb-1">Scan to Verify with Self</h4>
        <p className="text-xs text-forest-muted max-w-xs mx-auto">
          Open the <span className="text-accent-light font-medium">Self app</span> on your phone, scan this code, and tap your passport
        </p>
      </div>

      {/* QR Code */}
      {canUseSdkQr ? (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl overflow-hidden bg-white">
            <StableSelfQR
              key={verificationStatus.sessionId || "qr"}
              sessionId={verificationStatus.sessionId || "qr"}
              selfApp={selfAppForQr}
              onSuccess={handleQrSuccess}
              onError={handleQrError}
            />
          </div>

          {/* Disclosures */}
          {(() => {
            const disclosures = (verificationStatus.selfAppConfig as unknown as SelfApp)?.disclosures;
            if (!disclosures) return null;
            return (
              <div className="w-full max-w-xs mx-auto">
                <div className="text-[10px] uppercase tracking-wider text-forest-muted/70 mb-1.5 text-center">Verification Requirements</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {disclosures.minimumAge && (
                    <span className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent-light">Age ≥ {String(disclosures.minimumAge)}</span>
                  )}
                  {disclosures.ofac && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">OFAC Check</span>
                  )}
                  {Array.isArray(disclosures.excludedCountries) && disclosures.excludedCountries.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] text-red-300">{disclosures.excludedCountries.length} excluded countries</span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-forest/10 border border-forest/20 text-[10px] text-forest-light">🔒 Zero-Knowledge Proof</span>
                </div>
              </div>
            );
          })()}
        </div>
      ) : qrUrl ? (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl overflow-hidden bg-white p-2">
            <Image
              src={qrUrl}
              alt="Self verification QR"
              width={280}
              height={280}
              className="rounded-xl"
              unoptimized
            />
          </div>
          {deepLink && (
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:text-accent-light"
            >
              Open Self app on mobile
            </a>
          )}
        </div>
      ) : (
        <div className="mx-auto w-fit">
          <div className="p-1 rounded-2xl bg-gradient-to-br from-accent/30 to-accent-light/30">
            <div className="rounded-xl bg-gypsum-dark/80 p-10 flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-accent animate-spin" />
              <p className="text-xs text-forest-muted">Generating QR code...</p>
            </div>
          </div>
        </div>
      )}

      {/* Status indicator */}
      {qrSessionExpired || (verificationStatus.challengeExpiresAt && Date.now() > verificationStatus.challengeExpiresAt) ? (
        <div className="flex flex-col items-center gap-2 py-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-amber-300 font-medium">Session expired — generate a new QR</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setQrSessionExpired(false); handleRestartVerification(); }}
            disabled={verifyLoading}
            className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            {verifyLoading ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1.5" />}
            Generate Fresh QR
          </Button>
        </div>
      ) : proofError ? (
        <div className="flex flex-col items-center gap-2 py-1">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 max-w-sm">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-300 font-medium">{proofError}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 max-w-xs text-center">
            <p className="text-[10px] text-forest-muted">
              The QR code above is still valid. Open the <span className="text-accent-light">Self app</span> and scan again.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setProofError(null)} className="text-[10px] text-forest-muted/70 hover:text-forest/80 h-6">
              Dismiss
            </Button>
          </div>
          {verificationStatus.challengeExpiresAt && (
            <SessionCountdown expiresAt={verificationStatus.challengeExpiresAt} onExpired={() => setQrSessionExpired(true)} />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
            <Loader2 className="w-3 h-3 animate-spin text-accent" />
            <span className="text-xs text-accent-light font-medium">Waiting for passport scan...</span>
          </div>
          {verificationStatus.challengeExpiresAt && (
            <SessionCountdown expiresAt={verificationStatus.challengeExpiresAt} onExpired={() => setQrSessionExpired(true)} />
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-gypsum/80"><div className="text-base mb-0.5">📱</div><p className="text-[10px] text-forest-muted/70">Open Self app</p></div>
        <div className="p-2 rounded-lg bg-gypsum/80"><div className="text-base mb-0.5">📷</div><p className="text-[10px] text-forest-muted/70">Scan QR code</p></div>
        <div className="p-2 rounded-lg bg-gypsum/80"><div className="text-base mb-0.5">🛂</div><p className="text-[10px] text-forest-muted/70">Tap passport</p></div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={handleRestartVerification} disabled={verifyLoading} className="text-xs">
          <RotateCcw className="w-3 h-3 mr-1.5" /> Generate New QR
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowVerifyDebug(!showVerifyDebug)} className="text-xs text-forest-muted/70">
          {showVerifyDebug ? "Hide" : "Show"} Debug
        </Button>
      </div>

      {/* ── Verify via SelfClaw Website (fallback) ── */}
      <div className="w-full max-w-sm mx-auto p-3 rounded-xl bg-gypsum-dark/40 border border-forest/15/40 space-y-2.5">
        <div className="text-center">
          <span className="text-[10px] uppercase tracking-wider text-forest-muted/70">Or link agent to identity on the SelfClaw website</span>
        </div>

        <div className="space-y-1.5">
          {verificationStatus.publicKey && (
            <CopyField label="Agent Public Key" value={verificationStatus.publicKey} mono />
          )}
          <CopyField label="Agent Name" value={agent.name} />
          {agent.erc8004AgentId && (
            <CopyField label="Agent ID" value={`#${agent.erc8004AgentId}`} copyValue={agent.erc8004AgentId} mono />
          )}
        </div>

        <p className="text-[10px] text-forest-muted/70 text-center">
          Copy your public key &amp; agent name above, then paste them into the SelfClaw website to link your agent to your identity.
        </p>

        <a
          href="https://selfclaw.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent-light font-medium hover:bg-accent/20 transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Verify on SelfClaw Website
        </a>
      </div>

      {/* Debug */}
      {showVerifyDebug && (
        <div className="w-full max-w-md mx-auto space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-forest-muted/70 mb-1">SelfClaw API Response (selfApp config)</div>
            <div className="bg-white border border-forest/15 rounded-lg p-3 max-h-60 overflow-y-auto">
              <pre className="text-[10px] text-forest-light font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(verificationStatus.selfAppConfig, null, 2)}
              </pre>
            </div>
          </div>
          {verificationStatus.sessionId && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-forest-muted/70 mb-1">SelfClaw Session ID</div>
              <div className="bg-white border border-forest/15 rounded-lg p-2">
                <code className="text-[10px] text-amber-300 font-mono break-all">{verificationStatus.sessionId}</code>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-forest-muted/70 mb-1">Status</div>
              <div className="bg-white border border-forest/15 rounded-lg p-2">
                <code className="text-[10px] text-cyan-300 font-mono">{verificationStatus.status}</code>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-forest-muted/70 mb-1">Session Active</div>
              <div className="bg-white border border-forest/15 rounded-lg p-2">
                <code className={`text-[10px] font-mono ${isSessionActive ? "text-forest-light" : "text-red-400"}`}>
                  {isSessionActive ? "✅ Yes" : "❌ Expired"}
                </code>
              </div>
            </div>
          </div>
          {verificationStatus.challengeExpiresAt && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-forest-muted/70 mb-1">Challenge Expires</div>
              <div className="bg-white border border-forest/15 rounded-lg p-2">
                <code className="text-[10px] text-forest/80 font-mono">{new Date(verificationStatus.challengeExpiresAt).toLocaleTimeString()}</code>
              </div>
            </div>
          )}
          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-[10px] text-forest-muted">
              <strong className="text-blue-300">Tip:</strong> Don&apos;t click &quot;Verify&quot; again while scanning.
              The QR is stable for ~10 minutes. Open the Self app → Scan → Tap passport.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Small copyable field for the SelfClaw website fallback section. */
function CopyField({ label, value, copyValue, mono }: { label: string; value: string; copyValue?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 border border-forest/15/30">
      <div className="min-w-0 flex-1 mr-2">
        <div className="text-[10px] text-forest-muted/70">{label}</div>
        <div className={`text-xs ${mono ? "text-forest-light font-mono break-all leading-relaxed" : "text-forest font-medium"}`}>
          {value}
        </div>
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(copyValue ?? value)}
        className="p-1.5 rounded hover:bg-gypsum-darker/50 text-forest-muted/70 hover:text-forest transition-colors cursor-pointer flex-shrink-0"
        title={`Copy ${label.toLowerCase()}`}
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

