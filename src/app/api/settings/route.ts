import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt, maskApiKey } from "@/lib/crypto";

// All provider API key fields in one place
const API_KEY_FIELDS = [
  "openrouterApiKey",
  "openaiApiKey",
  "groqApiKey",
  "grokApiKey",
  "geminiApiKey",
  "deepseekApiKey",
  "zaiApiKey",
  "anthropicApiKey",
] as const;

type ApiKeyField = (typeof API_KEY_FIELDS)[number];

/**
 * GET /api/settings?walletAddress=0x...
 * Returns masked API key status (never raw keys)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      // Return empty state for all providers
      const empty: Record<string, null | boolean> = {};
      for (const field of API_KEY_FIELDS) {
        empty[field] = null;
        const hasKey = `has${field.charAt(0).toUpperCase()}${field.slice(1).replace("ApiKey", "")}Key`;
        empty[hasKey] = false;
    }
      return NextResponse.json(empty);
    }

    // Build masked response
    const result: Record<string, string | null | boolean> = {};

    for (const field of API_KEY_FIELDS) {
      const encrypted = (user as Record<string, unknown>)[field] as string | null;
      let masked: string | null = null;

      if (encrypted) {
      try {
          const decrypted = decrypt(encrypted);
          masked = maskApiKey(decrypted);
      } catch {
          masked = "••••••••(corrupted)";
      }
    }

      result[field] = masked;

      // e.g. openrouterApiKey → hasOpenrouterKey
      const providerName = field.replace("ApiKey", "");
      const hasKeyName = `has${providerName.charAt(0).toUpperCase()}${providerName.slice(1)}Key`;
      result[hasKeyName] = !!encrypted;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Save (encrypted) API keys for a user
 * Only updates keys that are provided — empty strings clear the key
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, ...keys } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
      });
    }

    // Build update data — only update keys that were provided
    const updateData: Record<string, string | null> = {};

    for (const field of API_KEY_FIELDS) {
      const value = keys[field];
      if (value !== undefined) {
      // Empty string = clear the key, non-empty = encrypt and store
        updateData[field] = value ? encrypt(value) : null;
    }
    }

    // Only update if there's something to update
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    // Build response
    const result: Record<string, boolean | string> = { success: true, message: "API keys saved securely" };
    for (const field of API_KEY_FIELDS) {
      const providerName = field.replace("ApiKey", "");
      const hasKeyName = `has${providerName.charAt(0).toUpperCase()}${providerName.slice(1)}Key`;
      result[hasKeyName] =
        keys[field] !== undefined
          ? !!keys[field]
          : !!(user as Record<string, unknown>)[field];
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
