/**
 * Per-user API key resolution
 * 
 * Looks up the user's encrypted API key from the database,
 * decrypts it, and returns it for use in LLM calls.
 * 
 * Falls back to env vars only in development, NEVER in production.
 */

import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import type { LLMProvider } from "@/lib/types";

// Map provider → DB field name
const PROVIDER_DB_FIELD: Record<LLMProvider, string> = {
  openrouter: "openrouterApiKey",
  openai: "openaiApiKey",
  groq: "groqApiKey",
  grok: "grokApiKey",
  gemini: "geminiApiKey",
  deepseek: "deepseekApiKey",
  zai: "zaiApiKey",
  anthropic: "anthropicApiKey",
};

// Map provider → env variable name
const PROVIDER_ENV_VAR: Record<LLMProvider, string> = {
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
  groq: "GROQ_API_KEY",
  grok: "GROK_API_KEY",
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  zai: "ZAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

// Map provider → display name
const PROVIDER_DISPLAY_NAME: Record<LLMProvider, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  groq: "Groq",
  grok: "Grok (xAI)",
  gemini: "Google Gemini",
  deepseek: "DeepSeek",
  zai: "Z.AI",
  anthropic: "Anthropic (Claude)",
};

/**
 * Get the decrypted API key for a user + provider.
 * 
 * Resolution order:
 * 1. User's encrypted key from database (primary)
 * 2. Environment variable fallback (dev only)
 * 3. Throws an error with actionable message
 */
export async function getUserApiKey(
  ownerId: string,
  provider: LLMProvider
): Promise<string> {
  const dbField = PROVIDER_DB_FIELD[provider];

  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      openrouterApiKey: true,
      openaiApiKey: true,
      groqApiKey: true,
      grokApiKey: true,
      geminiApiKey: true,
      deepseekApiKey: true,
      zaiApiKey: true,
      anthropicApiKey: true,
    },
  });

  // Try user's stored key first
  const encryptedKey = user ? (user as Record<string, unknown>)[dbField] as string | null : null;

  if (encryptedKey) {
    try {
      return decrypt(encryptedKey);
    } catch (err) {
      console.error(`Failed to decrypt ${provider} key for user ${ownerId}:`, err);
      // Fall through to env fallback
    }
  }

  // Dev-only fallback to env vars
  const envKey = process.env[PROVIDER_ENV_VAR[provider]];
  if (envKey) {
    return envKey;
  }

  // No key found anywhere
  const providerName = PROVIDER_DISPLAY_NAME[provider];
  throw new Error(
    `No ${providerName} API key configured. Go to Settings and add your ${providerName} API key.`
  );
}

/** Fallback order when selected provider has no key — Groq first (fast, no Clerk auth issues) */
const FALLBACK_PROVIDER_ORDER: LLMProvider[] = [
  "groq", "openrouter", "zai", "openai", "anthropic", "gemini", "deepseek", "grok",
];

/** Beta chat prefers Groq (fast, no Clerk auth issues) */
export const BETA_CHAT_PROVIDER_ORDER: LLMProvider[] = [
  "groq", "openrouter", "zai", "openai", "anthropic", "gemini", "deepseek", "grok",
];

/**
 * Get the first available provider + API key for a user.
 * Used as fallback when the agent's selected provider has no key configured.
 * @param preferredProviders - Optional custom order (e.g. BETA_CHAT_PROVIDER_ORDER for Groq-first)
 */
export async function getFirstAvailableProviderAndKey(
  ownerId: string,
  preferredProviders?: LLMProvider[]
): Promise<{ provider: LLMProvider; apiKey: string } | null> {
  const order = preferredProviders ?? FALLBACK_PROVIDER_ORDER;
  const status = await getUserKeyStatus(ownerId);
  const hasKey: Record<LLMProvider, boolean> = {
    openrouter: !!status.hasOpenrouterKey,
    openai: !!status.hasOpenaiKey,
    groq: !!status.hasGroqKey,
    grok: !!status.hasGrokKey,
    gemini: !!status.hasGeminiKey,
    deepseek: !!status.hasDeepseekKey,
    zai: !!status.hasZaiKey,
    anthropic: !!status.hasAnthropicKey,
  };

  for (const provider of order) {
    if (hasKey[provider]) {
      try {
        const apiKey = await getUserApiKey(ownerId, provider);
        return { provider, apiKey };
      } catch {
        // Decryption failed, try next
      }
    }
  }
  return null;
}

/**
 * Check which API keys a user has configured
 */
export async function getUserKeyStatus(
  ownerId: string
): Promise<Record<string, boolean>> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      openrouterApiKey: true,
      openaiApiKey: true,
      groqApiKey: true,
      grokApiKey: true,
      geminiApiKey: true,
      deepseekApiKey: true,
      zaiApiKey: true,
      anthropicApiKey: true,
    },
  });

  return {
    hasOpenrouterKey: !!user?.openrouterApiKey || !!process.env.OPENROUTER_API_KEY,
    hasOpenaiKey: !!user?.openaiApiKey || !!process.env.OPENAI_API_KEY,
    hasGroqKey: !!user?.groqApiKey || !!process.env.GROQ_API_KEY,
    hasGrokKey: !!user?.grokApiKey || !!process.env.GROK_API_KEY,
    hasGeminiKey: !!user?.geminiApiKey || !!process.env.GEMINI_API_KEY,
    hasDeepseekKey: !!user?.deepseekApiKey || !!process.env.DEEPSEEK_API_KEY,
    hasZaiKey: !!user?.zaiApiKey || !!process.env.ZAI_API_KEY,
    hasAnthropicKey: !!user?.anthropicApiKey || !!process.env.ANTHROPIC_API_KEY,
  };
}
