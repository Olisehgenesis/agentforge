import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processMessage, processChannelMessage } from "@/lib/openclaw/manager";
import { getOrCreateWebChatBinding, getWebChatBindingId, loadSessionHistory, clearSessionHistory } from "@/lib/openclaw/router";

function isVerifyIntent(input?: string): boolean {
  if (!input) return false;
  return /\b(verify|verification|verify\s+with\s+self)\b/i.test(input.trim());
}

function formatVerifyQrReply(payload: {
  agentName: string;
  qrUrl?: string | null;
  deepLink?: string | null;
  message?: string | null;
}): string {
  const lines: string[] = [];

  lines.push(`**${payload.agentName}** is not verified yet.`);
  lines.push("Scan the QR below with the Self app to verify now.");

  if (payload.qrUrl) {
    lines.push("");
    lines.push(`![Verify with Self](${payload.qrUrl})`);
    lines.push(`Open QR: ${payload.qrUrl}`);
  }

  if (payload.deepLink) {
    // show a clickable link, with user-friendly text
    lines.push(`Self deep link: [click to open](${payload.deepLink})`);
  }

  if (payload.message) {
    lines.push("");
    lines.push(`_Status: ${payload.message}_`);
  }

  lines.push("");
  lines.push("You can also complete this from the dashboard Verify tab.");

  return lines.join("\n");
}

async function handleInlineVerify(
  request: Request,
  agent: {
    id: string;
    name: string;
    agentWalletAddress: string | null;
    owner: { walletAddress: string | null };
  },
  walletAddress?: string
): Promise<string> {
  const origin = new URL(request.url).origin;
  const verifyUrl = `${origin}/api/agents/${agent.id}/verify`;

  const checkRes = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "check" }),
    cache: "no-store",
  });

  const checkData = (await checkRes.json().catch(() => ({}))) as {
    verified?: boolean;
    status?: string;
    verifiedAt?: string;
    selfAppConfig?: { qrUrl?: string; deepLink?: string; qrData?: unknown } | null;
    message?: string;
  };

  if (checkData.verified) {
    const when = checkData.verifiedAt
      ? ` Verified at: ${new Date(checkData.verifiedAt).toLocaleString()}.`
      : "";
    return `**${agent.name}** is already verified with Self.${when}`;
  }

  let existingQr = checkData.selfAppConfig?.qrUrl;
  const existingDeepLink = checkData.selfAppConfig?.deepLink;
  // if we don't have an explicit URL but we do have raw qrData, try converting
  // it to a data URL so the chat response can still render a QR image.
  if (!existingQr && checkData.selfAppConfig?.qrData) {
    try {
      const { generateQRDataUrl } = await import("@/lib/qr/generate");
      // encode whatever content is available in qrData; prefer string form if
      // it's already a scalar, otherwise stringify the object.
      const raw =
        typeof checkData.selfAppConfig.qrData === "string"
          ? checkData.selfAppConfig.qrData
          : JSON.stringify(checkData.selfAppConfig.qrData);
      existingQr = await generateQRDataUrl(raw);
    } catch (e) {
      // ignore errors and fall back to deepLink only
      console.warn("failed to convert qrData to qrUrl:", e);
    }
  }

  // still no QR? try encoding the deep link directly (it may still work).
  if (!existingQr && existingDeepLink) {
    try {
      const { generateQRDataUrl } = await import("@/lib/qr/generate");
      existingQr = await generateQRDataUrl(existingDeepLink);
    } catch (e) {
      // ignore
    }
  }

  if (existingQr || existingDeepLink) {
    return formatVerifyQrReply({
      agentName: agent.name,
      qrUrl: existingQr,
      deepLink: existingDeepLink,
      message: checkData.message || null,
    });
  }

  const startRes = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "start",
      connectedWalletAddress: walletAddress,
      agentWalletAddress: agent.agentWalletAddress,
    }),
    cache: "no-store",
  });

  const startData = (await startRes.json().catch(() => ({}))) as {
    verified?: boolean;
    status?: string;
    selfAppConfig?: { qrUrl?: string; deepLink?: string; qrData?: unknown } | null;
    message?: string;
    error?: string;
  };

  if (!startRes.ok && !startData.selfAppConfig?.qrUrl && !startData.selfAppConfig?.deepLink) {
    throw new Error(startData.error || startData.message || "Failed to start verification.");
  }

  if (startData.verified) {
    return `**${agent.name}** is already verified with Self.`;
  }

  // if we didn't get a direct qrUrl but did receive qrData, try to encode it
  // so the chat reply can render an image.
  let qrUrl: string | null = startData.selfAppConfig?.qrUrl || null;
  if (!qrUrl && startData.selfAppConfig?.qrData) {
    try {
      const { generateQRDataUrl } = await import("@/lib/qr/generate");
      const raw =
        typeof startData.selfAppConfig.qrData === "string"
          ? startData.selfAppConfig.qrData
          : JSON.stringify(startData.selfAppConfig.qrData);
      qrUrl = await generateQRDataUrl(raw);
    } catch (e) {
      console.warn("failed to render qrData in chat reply", e);
    }
  }

  // if there's still no QR but a deep link is provided, encode that too
  if (!qrUrl && startData.selfAppConfig?.deepLink) {
    try {
      const { generateQRDataUrl } = await import("@/lib/qr/generate");
      qrUrl = await generateQRDataUrl(startData.selfAppConfig.deepLink);
    } catch (e) {
      // ignore
    }
  }

  return formatVerifyQrReply({
    agentName: agent.name,
    qrUrl,
    deepLink: startData.selfAppConfig?.deepLink || null,
    message: startData.message || null,
  });
}

// GET /api/agents/:id/chat?walletAddress=0x... - Load persisted chat history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress query param is required" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const ownerWallet = agent.owner.walletAddress?.toLowerCase();
    const providedWallet = walletAddress.toLowerCase();
    if (ownerWallet !== providedWallet) {
      return NextResponse.json(
        { error: "Wallet address does not match agent owner" },
        { status: 403 }
      );
    }

    const bindingId = await getWebChatBindingId(id, providedWallet);
    if (!bindingId) {
      return NextResponse.json({ messages: [] });
    }

    const history = await loadSessionHistory(bindingId, 100);
    return NextResponse.json({
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (error) {
    console.error("Chat history error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load history" },
      { status: 500 }
    );
  }
}

// POST /api/agents/:id/chat - Send a message to an agent
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, conversationHistory = [], walletAddress, welcome } = body;

    if (!message && !welcome) {
      return NextResponse.json({ error: "Message or welcome is required" }, { status: 400 });
    }

    // Verify agent exists and is active
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.status !== "active") {
      return NextResponse.json(
        { error: `Agent is ${agent.status}. Only active agents can process messages.` },
        { status: 400 }
      );
    }

    if (isVerifyIntent(message)) {
      const inlineReply = await handleInlineVerify(
        request,
        {
          id: agent.id,
          name: agent.name,
          agentWalletAddress: agent.agentWalletAddress,
          owner: { walletAddress: agent.owner.walletAddress },
        },
        walletAddress
      );

      await prisma.activityLog.create({
        data: {
          agentId: id,
          type: "action",
          message: `Chat: "${String(message).slice(0, 80)}${String(message).length > 80 ? "..." : ""}"`,
          metadata: JSON.stringify({
            userMessage: message,
            responsePreview: inlineReply.slice(0, 200),
            provider: agent.llmProvider,
            model: agent.llmModel,
            inlineVerification: true,
          }),
        },
      });

      return NextResponse.json({
        response: inlineReply,
        agentId: id,
        provider: agent.llmProvider,
        model: agent.llmModel,
      });
    }

    let response: string;

    const isAdmin =
      !!walletAddress &&
      agent.owner.walletAddress?.toLowerCase() === String(walletAddress).toLowerCase();

    // --- admin shortcut: detect API key submission in plain chat text ---
    if (isAdmin && message && typeof message === "string") {
      // look for patterns like "openai key sk-..." or "gpt key is sk-..."
      const providerNames = [
        "openrouter",
        "openai",
        "groq",
        "grok",
        "gemini",
        "deepseek",
        "zai",
        "anthropic",
      ] as const;

      const keyPattern = /(sk-[A-Za-z0-9-_.]+)/i; // catch typical openai keys, fallback to generic

      let savedProvider: string | null = null;
      let savedKey: string | null = null;

      for (const p of providerNames) {
        // match phrases like "openai key is sk-xxx" or "openai api key=sk-xxx"
        const regex = new RegExp(
          `${p}\\s*(?:api\\s*)?key\\s*[:\\s]*(?:is|=)?\\s*([A-Za-z0-9\\-_.]{10,})`,
          "i"
        );
        const m = message.match(regex);
        if (m) {
          savedProvider = p;
          savedKey = m[1];
          break;
        }
      }

      if (savedProvider && savedKey) {
        const { saveUserApiKey } = await import("@/lib/api-keys");
        try {
          await saveUserApiKey(agent.ownerId, savedProvider as any, savedKey);

          // if user mentioned a model explicitly we can update the agent's config
          const modelMatch = message.match(/model\s*[:=]\s*(\S+)/i);
          if (modelMatch) {
            const newModel = modelMatch[1];
            try {
              await prisma.agent.update({
                where: { id },
                data: { llmProvider: savedProvider, llmModel: newModel },
              });
            } catch (e) {
              console.warn("Failed to update agent model from chat:", e);
            }
          }

          return NextResponse.json({
            response: `✅ Saved your ${savedProvider} API key successfully. You can now chat.`,
            agentId: id,
            provider: agent.llmProvider,
            model: agent.llmModel,
            clearMessage: true,
          });
        } catch (e) {
          console.error("Failed to save API key from chat:", e);
          // fall through to normal processing; key may have been invalid
        }
      }
    }

    if (welcome) {
      const agentName = agent.name || "Agent";
      const introPrompt = `Your name is **${agentName}**. Introduce yourself to the user in one short, cool paragraph. Say who you are (use your name: ${agentName}), what you can help with. Be friendly, welcoming, and a bit charismatic. Keep it concise. You may use **bold** for emphasis if it helps.`;
      response = await processMessage(id, introPrompt, [], { canUseAgentWallet: false });
    } else if (walletAddress && isAdmin) {
      // Persist session: verify wallet is owner, get/create web binding, use processChannelMessage
      const bindingId = await getOrCreateWebChatBinding(id, String(walletAddress).toLowerCase());
      response = await processChannelMessage(id, bindingId, message);
    } else {
      // External user (no wallet or not owner): ephemeral chat, no agent wallet execution
      response = await processMessage(id, message, conversationHistory, {
        canUseAgentWallet: false,
      });
    }

    // Log the interaction (skip for welcome)
    if (!welcome) {
      await prisma.activityLog.create({
        data: {
          agentId: id,
          type: "action",
          message: `Chat: "${(message as string).slice(0, 80)}${(message as string).length > 80 ? "..." : ""}"`,
        metadata: JSON.stringify({
          userMessage: message,
          responsePreview: response.slice(0, 200),
          provider: agent.llmProvider,
          model: agent.llmModel,
        }),
      },
    });
    }

    return NextResponse.json({
      response,
      agentId: id,
      provider: agent.llmProvider,
      model: agent.llmModel,
    });
  } catch (error) {
    console.error("Chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process message";

    // Detect missing API key errors and return a helpful message
    const isMissingKey = errorMessage.includes("API key");
    return NextResponse.json(
      {
        error: errorMessage,
        action: isMissingKey ? "Go to Settings to add your API key" : undefined,
      },
      { status: isMissingKey ? 422 : 500 }
    );
  }
}

// DELETE /api/agents/:id/chat - Clear chat history (owner only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress query param is required" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const ownerWallet = agent.owner.walletAddress?.toLowerCase();
    const providedWallet = walletAddress.toLowerCase();
    if (ownerWallet !== providedWallet) {
      return NextResponse.json(
        { error: "Wallet address does not match agent owner" },
        { status: 403 }
      );
    }

    const cleared = await clearSessionHistory(id, providedWallet);
    return NextResponse.json({ success: true, cleared });
  } catch (error) {
    console.error("Clear chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear chat" },
      { status: 500 }
    );
  }
}

