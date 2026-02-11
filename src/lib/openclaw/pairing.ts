/**
 * Pairing Code System
 *
 * Generates short, human-friendly codes for binding a sender identity
 * (WhatsApp phone, Telegram user, etc.) to an AgentHaus agent.
 *
 * Format: "AF" + 4 alphanumeric chars = 6 chars total (e.g. "AF7X2K")
 *   → 36^4 = 1,679,616 possible codes — enough for a single platform.
 *   → Codes expire after 24 hours and can be regenerated.
 *
 * Usage:
 *   1. Agent owner clicks "Get Pairing Code" on dashboard
 *   2. System generates code + stores on Agent record
 *   3. User sends code to shared bot on WhatsApp/Telegram/etc.
 *   4. Webhook handler calls resolvePairingCode() → creates ChannelBinding
 *   5. Future messages from that sender route to the agent automatically
 */

import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

// ─── Constants ─────────────────────────────────────────────────────────────

const CODE_PREFIX = "AF";
const CODE_CHARS = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // No I, O (avoid confusion with 1, 0)
const CODE_LENGTH = 4; // after prefix → total 6 chars
const CODE_EXPIRY_HOURS = 24;

// Regex to detect a pairing code in user text
// Matches: AF7X2K, af7x2k, AF-7X2K, af 7x2k, /pair AF7X2K, etc.
export const PAIRING_CODE_REGEX = /\b(?:\/pair\s+)?(?:AF[\s-]?)([0-9A-HJ-NP-Z]{4})\b/i;

// ─── Code Generation ───────────────────────────────────────────────────────

/**
 * Generate a random pairing code (e.g. "AF7X2K").
 * Checks uniqueness against existing codes in the DB.
 */
export async function generatePairingCode(agentId: string): Promise<string> {
  let code: string;
  let attempts = 0;

  do {
    code = CODE_PREFIX + randomChars(CODE_LENGTH);
    attempts++;

    // Check uniqueness
    const existing = await prisma.agent.findFirst({
      where: {
        pairingCode: code,
        id: { not: agentId },
      },
    });

    if (!existing) break;
  } while (attempts < 10);

  if (attempts >= 10) {
    throw new Error("Failed to generate a unique pairing code. Try again.");
  }

  // Store on agent
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CODE_EXPIRY_HOURS);

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      pairingCode: code,
      pairingCodeExpiresAt: expiresAt,
    },
  });

  return code;
}

/**
 * Get or create a pairing code for an agent.
 * If the agent already has a valid (non-expired) code, return it.
 * Otherwise generate a new one.
 */
export async function getOrCreatePairingCode(agentId: string): Promise<{
  code: string;
  expiresAt: Date;
  isNew: boolean;
}> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      pairingCode: true,
      pairingCodeExpiresAt: true,
      status: true,
    },
  });

  if (!agent) throw new Error("Agent not found");
  if (agent.status !== "active") {
    throw new Error("Agent must be active to generate a pairing code. Deploy it first.");
  }

  // Check if existing code is still valid
  if (
    agent.pairingCode &&
    agent.pairingCodeExpiresAt &&
    agent.pairingCodeExpiresAt > new Date()
  ) {
    return {
      code: agent.pairingCode,
      expiresAt: agent.pairingCodeExpiresAt,
      isNew: false,
    };
  }

  // Generate new code
  const code = await generatePairingCode(agentId);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CODE_EXPIRY_HOURS);

  return { code, expiresAt, isNew: true };
}

/**
 * Revoke a pairing code (e.g. when user wants to disable pairing).
 */
export async function revokePairingCode(agentId: string): Promise<void> {
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      pairingCode: null,
      pairingCodeExpiresAt: null,
    },
  });
}

// ─── Code Resolution ───────────────────────────────────────────────────────

/**
 * Check if a message text contains a pairing code.
 * Returns the normalized code if found, null otherwise.
 */
export function extractPairingCode(text: string): string | null {
  const match = text.trim().match(PAIRING_CODE_REGEX);
  if (!match) return null;

  // Normalize: uppercase, remove separators, add prefix
  const suffix = match[1].toUpperCase();
  return CODE_PREFIX + suffix;
}

/**
 * Resolve a pairing code to an agent.
 * Returns the agent if the code is valid and not expired.
 */
export async function resolvePairingCode(code: string): Promise<{
  agentId: string;
  agentName: string;
  ownerId: string;
  templateType: string;
} | null> {
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");

  const agent = await prisma.agent.findFirst({
    where: {
      pairingCode: normalized,
      status: "active",
      pairingCodeExpiresAt: { gte: new Date() },
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      templateType: true,
    },
  });

  if (!agent) return null;

  return {
    agentId: agent.id,
    agentName: agent.name,
    ownerId: agent.ownerId,
    templateType: agent.templateType,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function randomChars(length: number): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return result;
}

