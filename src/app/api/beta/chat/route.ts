import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildBetaCreateSystemPrompt } from "@/lib/beta/system-prompt";
import {
  listTemplates,
  createAgent,
  getMyAgents,
  getAgentDetails,
  resolveAgentByIdOrName,
  deployToken,
  requestSponsorship,
  getAgentWalletInfo,
  isGasOrInsufficientFundsError,
} from "@/lib/beta/tools";
import { getFirstAvailableProviderAndKey, BETA_CHAT_PROVIDER_ORDER } from "@/lib/api-keys";
import { getDefaultModel } from "@/lib/llm";
import { chat } from "@/lib/llm";
import type { AgentTemplate } from "@/lib/types";

const OPENROUTER_FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen3-4b:free",
  "deepseek/deepseek-r1-0528:free",
];

/**
 * POST /api/beta/chat
 * Chat API for Beta Create — create and deploy agents via natural language.
 * @see docs/BETA_CREATE_PLAN.md
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      message,
      conversationHistory = [],
      walletAddress,
      imageBase64,
      sessionContext = {},
    } = body;

    if (!walletAddress || !message?.trim()) {
      return NextResponse.json({
        response: "Please connect your wallet to create or deploy agents.",
      });
    }

    // Resolve user (create if needed) and get API key
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
      });
    }

    const keyResult = await getFirstAvailableProviderAndKey(user.id, BETA_CHAT_PROVIDER_ORDER);
    if (!keyResult) {
      return NextResponse.json({
        response:
          "No LLM API key configured. Go to **Settings** in the dashboard and add your Groq API key (free at console.groq.com) or OpenRouter key.",
      });
    }

    const { apiKey, provider } = keyResult;
    let model = getDefaultModel(provider);
    if (provider === "openrouter") {
      model = model || "meta-llama/llama-3.3-70b-instruct:free";
    }

    const systemPrompt = buildBetaCreateSystemPrompt(sessionContext);
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message.trim() },
    ];

    let response = await callLLM(messages, provider, model, apiKey);

    // Parse for tool calls (check deploy/request before create — "deploy token for Gnes" ≠ create agent)
    const listMatch = response.match(/\[\[LIST_TEMPLATES\]\]/);
    const deployTokenMatch = response.match(
      /\[\[DEPLOY_TOKEN\|([^|]+)\|([^|]+)\|([^|]+)(?:\|([^\]]*))?\]\]/
    );
    const requestSponsorshipMatch = response.match(
      /\[\[REQUEST_SPONSORSHIP\|([^|\]]+)(?:\|([^\]]*))?\]\]/
    );
    const createMatch = response.match(/\[\[CREATE_AGENT\|([^|]+)\|([a-z]+)\]\]/);
    const myAgentsMatch = response.match(/\[\[GET_MY_AGENTS\]\]/);
    const agentDetailsMatch = response.match(/\[\[GET_AGENT_DETAILS\|([^\]]+)\]\]/);
    const agentWalletMatch = response.match(/\[\[GET_AGENT_WALLET_INFO\|([^\]]+)\]\]/);
    const verifyWithSelfMatch = response.match(/\[\[VERIFY_WITH_SELF\|([^\]]+)\]\]/);

    if (listMatch) {
      const templates = listTemplates();
      messages.push(
        { role: "assistant", content: response },
        {
          role: "user",
          content: `[Tool result - list_templates]\n${templates}\n\nSummarize these templates for the user in a friendly way.`,
        }
      );
      response = await callLLM(messages, provider, model, apiKey);
    } else if (deployTokenMatch) {
      const agentIdOrName = deployTokenMatch[1].trim();
      const tokenName = deployTokenMatch[2].trim();
      const tokenSymbol = deployTokenMatch[3].trim();
      const supply = deployTokenMatch[4]?.trim() || "10000000000";
      const result = await deployToken(
        walletAddress,
        agentIdOrName,
        tokenName,
        tokenSymbol,
        supply
      );
      if (result.success) {
        response = `**${result.agentName}** token deployed ✅\n\nToken: **${tokenName}** (${tokenSymbol})\nAddress: \`${result.tokenAddress}\`\n\nYou can now request sponsorship — say "request sponsorship for ${result.agentName}" or go to the Token & Trade tab.`;
      } else {
        const errMsg = result.error ?? "Failed to deploy token.";
        if (isGasOrInsufficientFundsError(errMsg)) {
          const walletInfo = await getAgentWalletInfo(walletAddress, agentIdOrName);
          if (walletInfo.success && walletInfo.walletAddress && walletInfo.qrDataUrl) {
            return NextResponse.json({
              response: `**${result.agentName}** — The agent wallet needs funds to pay for gas.\n\nFund the wallet below with **CELO** (or cUSD/cEUR for fee abstraction). Gas on Celo is paid in CELO by default.`,
              fundWallet: {
                agentName: walletInfo.agentName,
                walletAddress: walletInfo.walletAddress,
                publicKey: walletInfo.publicKey,
                qrDataUrl: walletInfo.qrDataUrl,
              },
            });
          }
        }
        response = errMsg;
      }
    } else if (requestSponsorshipMatch) {
      const agentIdOrName = requestSponsorshipMatch[1].trim();
      const tokenAddress = requestSponsorshipMatch[2]?.trim();
      const result = await requestSponsorship(walletAddress, agentIdOrName, tokenAddress || undefined);
      if (result.success) {
        response = `**${result.agentName}** — SELFCLAW sponsorship requested ✅\n\nYour token now has liquidity. You can view economics in the Token & Trade tab.`;
      } else {
        const errMsg = result.error ?? "Failed to request sponsorship.";
        if (isGasOrInsufficientFundsError(errMsg)) {
          const walletInfo = await getAgentWalletInfo(walletAddress, agentIdOrName);
          if (walletInfo.success && walletInfo.walletAddress && walletInfo.qrDataUrl) {
            return NextResponse.json({
              response: `**${result.agentName}** — The agent wallet needs funds to pay for gas.\n\nFund the wallet below with **CELO** (or cUSD/cEUR for fee abstraction). Gas on Celo is paid in CELO by default.`,
              fundWallet: {
                agentName: walletInfo.agentName,
                walletAddress: walletInfo.walletAddress,
                publicKey: walletInfo.publicKey,
                qrDataUrl: walletInfo.qrDataUrl,
              },
            });
          }
        }
        response = errMsg;
      }
    } else if (agentWalletMatch) {
      const agentIdOrName = agentWalletMatch[1].trim();
      const walletInfo = await getAgentWalletInfo(walletAddress, agentIdOrName);
      if (walletInfo.success && walletInfo.walletAddress) {
        const msg =
          walletInfo.qrDataUrl
            ? `**${walletInfo.agentName}** — Agent wallet info (never share private key):\n\nAddress: \`${walletInfo.walletAddress}\`\n\nFund with **CELO** or cUSD/cEUR for gas. Scan the QR to send funds.`
            : `**${walletInfo.agentName}** — Agent wallet: \`${walletInfo.walletAddress}\`\n\nFund with **CELO** or cUSD/cEUR for gas.`;
        return NextResponse.json({
          response: msg,
          fundWallet: walletInfo.qrDataUrl
            ? {
                agentName: walletInfo.agentName,
                walletAddress: walletInfo.walletAddress,
                publicKey: walletInfo.publicKey,
                qrDataUrl: walletInfo.qrDataUrl,
              }
            : undefined,
        });
      } else {
        response = walletInfo.error ?? "Could not get wallet info.";
      }
    } else if (createMatch) {
      const agentName = createMatch[1].trim();
      const templateType = createMatch[2] as AgentTemplate;
      const validTypes: AgentTemplate[] = ["payment", "trading", "forex", "social", "custom"];
      if (!validTypes.includes(templateType)) {
        return NextResponse.json({
          response: `Invalid template type "${templateType}". Use one of: payment, trading, forex, social, custom.`,
        });
      }
      const result = await createAgent({
        name: agentName,
        templateType,
        ownerAddress: walletAddress,
      });

      // Upload agent image if user attached one (e.g. for agent avatar/logo)
      if (imageBase64 && typeof imageBase64 === "string") {
        try {
          const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const { uploadAgentImageFromBuffer } = await import("@/lib/agent-image");
          await uploadAgentImageFromBuffer(result.agentId, buffer);
        } catch {
          // Non-blocking: agent created, image upload failed
        }
      }

      return NextResponse.json({
        response: `${agentName} is created! Click **Sign to Register ERC-8004** below to register it on-chain. After signing, your agent will be active.`,
        needsSign: true,
        agentId: result.agentId,
        agentName: result.agentName,
        link: result.link,
      });
    } else if (myAgentsMatch) {
      const data = await getMyAgents(walletAddress);
      const toolResult = JSON.stringify(data, null, 2);
      messages.push(
        { role: "assistant", content: response },
        {
          role: "user",
          content: `[Tool result - get_my_agents]\n${toolResult}\n\nReply in a short, friendly way. Mention total agents, how many verified, and which by name. Keep it brief — no long bullet lists. If they have no agents, suggest creating one.`,
        }
      );
      response = await callLLM(messages, provider, model, apiKey);
    } else if (agentDetailsMatch) {
      const identifier = agentDetailsMatch[1].trim();
      const result = await resolveAgentByIdOrName(walletAddress, identifier);
      if ("ambiguous" in result) {
        response = `Which agent did you mean? **${result.ambiguous.join("** or **")}**?`;
      } else if ("notFound" in result) {
        response = "I couldn't find that agent. Try the exact name — e.g. \"details for Gnes\".";
      } else {
        const agentId = result.resolved.id;
        const data = await getAgentDetails(agentId, walletAddress);
        if (!data) {
          response = "I couldn't find that agent. It may have been deleted or you may not have access to it.";
        } else {
          const toolResult = JSON.stringify(data, null, 2);
          messages.push(
            { role: "assistant", content: response },
            {
              role: "user",
              content: `[Tool result - get_agent_details]\n${toolResult}\n\nSummarize the agent's details. If verified is true, mention what they can do next with SelfClaw (deploy token, log revenue/costs, request sponsorship, view economics). Keep it brief and helpful.`,
            }
          );
          response = await callLLM(messages, provider, model, apiKey);
        }
      }
    } else if (verifyWithSelfMatch) {
      const identifier = verifyWithSelfMatch[1].trim();
      const result = await resolveAgentByIdOrName(walletAddress, identifier);
      if ("ambiguous" in result) {
        response = `Which agent did you mean? **${result.ambiguous.join("** or **")}**? Say "verify [name]" with the exact one.`;
      } else if ("notFound" in result) {
        response =
          "I couldn't find an agent with that name. Try \"verify [agent name]\" — e.g. \"verify Gnes\". Names are fuzzy (1–2 chars off is fine).";
      } else {
        const agent = await prisma.agent.findUnique({
          where: { id: result.resolved.id },
          include: { owner: true },
        });
        if (!agent || agent.owner.walletAddress !== walletAddress) {
          response = "I couldn't find that agent.";
        } else {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const verifyUrl = `${baseUrl}/api/agents/${result.resolved.id}/verify`;

          const startRes = await fetch(verifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start" }),
          });
          const startData = await startRes.json();

          if (startData.error || startData.status === "already_verified") {
            if (startData.verified) {
              response = `**${agent.name}** is already verified with SelfClaw ✅`;
            } else {
              response = startData.error || "Failed to start verification.";
            }
          } else {
            const signRes = await fetch(verifyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "sign" }),
            });
            const signData = await signRes.json();

            if (signData.error) {
              response = signData.error || "Failed to sign challenge.";
            } else if (signData.selfAppConfig) {
              response = `**${agent.name}** — Scan the QR code below with the **Self app** on your phone (NFC passport verification). Once scanned, I'll detect when you're verified.`;
              return NextResponse.json({
                response,
                verifySession: {
                  agentId: result.resolved.id,
                  agentName: agent.name,
                  selfAppConfig: signData.selfAppConfig,
                  sessionId: signData.sessionId,
                },
              });
            } else {
              response = signData.message || "Verification started. Scan the QR when it appears.";
            }
          }
        }
      }
    }

    return NextResponse.json({ response });
  } catch (err) {
    console.error("[api/beta/chat]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        response: msg.includes("API key")
          ? "No LLM API key configured. Go to **Settings** and add your Groq or OpenRouter API key."
          : `Something went wrong: ${msg}`,
      },
      { status: 500 }
    );
  }
}

async function callLLM(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  provider: import("@/lib/types").LLMProvider,
  model: string,
  apiKey: string
): Promise<string> {
  let lastError: Error | null = null;

  if (provider === "openrouter" && model.endsWith(":free")) {
    const fallbacks = [
      model,
      ...OPENROUTER_FALLBACK_MODELS.filter((m) => m !== model),
    ];
    for (const m of fallbacks) {
      try {
        const res = await chat(messages, provider, m, apiKey);
        return res.content;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (!lastError.message.includes("429") && !lastError.message.includes("400")) {
          throw lastError;
        }
      }
    }
    throw lastError || new Error("LLM request failed");
  }

  const res = await chat(messages, provider, model, apiKey);
  return res.content;
}
