/**
 * Master Bot Logic
 * 
 * Handles onboarding, quick-deploy, and tagged replies.
 */

import { prisma } from "@/lib/db";
import { sendMessage, sendTypingAction, type TelegramUpdate } from "./telegram";
import { processMessage } from "@/lib/openclaw/manager";

/**
 * Main dispatcher for the Master Bot webhook.
 */
export async function processMasterBotMessage(update: TelegramUpdate) {
    const msg = update.message || update.edited_message;
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id;
    const senderId = msg.from?.id;
    if (!senderId) return;

    const text = msg.text.trim();
    const botToken = process.env.MASTER_BOT_TOKEN;
    if (!botToken) return;

    try {
        // 1. Handle Commands
        if (text.startsWith("/")) {
            const [command] = text.split(" ");
            switch (command.toLowerCase()) {
                case "/start":
                    return handleStart(botToken, chatId, msg.from!);
                case "/deploy":
                    return handleDeployCommand(botToken, chatId);
                case "/wallet":
                    return handleWalletCommand(botToken, chatId, String(senderId));
                case "/register":
                return handleRegisterCommand(botToken, chatId);
            case "/help":
                return handleHelp(botToken, chatId);
        }
    }

        // 2. Handle Tagged Replies in Groups
        const botUser = process.env.MASTER_BOT_USERNAME || "agenthausv1bot";
        const isBotTagged = text.includes("@" + botUser);
        if (msg.chat.type !== "private" && isBotTagged) {
            await sendTypingAction(botToken, chatId);
            const response = await processMessage(
                "system",
                text.replace(/@\w+/, "").trim(),
                []
            );
            return sendMessage(botToken, chatId, response, msg.message_id);
        }

        // 3. Fallback to AI for DMs
        if (msg.chat.type === "private") {
            const { handleInteractiveDeploy } = await import("../skills/deploy-flow");
            const { onboardUser } = await import("../skills/master-bot-skills");

            const user = await onboardUser(String(senderId), msg.from?.username);

            if (text.toLowerCase().includes("deploy") || text.toLowerCase().includes("create")) {
                return handleInteractiveDeploy(botToken, chatId, user.id, text);
            }

            await sendTypingAction(botToken, chatId);
            const response = await processMessage(
                "system",
                text,
                [],
                { contextUserId: user.id }
            );
            return sendMessage(botToken, chatId, response);
        }
    } catch (err) {
        console.error("Master bot process error:", err);
        // Log error to DB for debugging - be extremely safe here
        try {
            await prisma.activityLog.create({
                data: {
                    agentId: "system", // Requires 'system' agent to exist in DB
                    type: "error",
                    message: `Master Bot error: ${err instanceof Error ? err.message : String(err)}`,
                    metadata: JSON.stringify({
                        chatId,
                        senderId,
                        text: text.slice(0, 100),
                        stack: err instanceof Error ? err.stack : undefined
                    })
                }
            });
        } catch (logErr) {
            console.error("Failed to log Master Bot error to DB:", logErr);
            // If we can't log to DB, at least send a fallback message if it's a DM
            if (msg.chat.type === "private") {
                await sendMessage(botToken, chatId, "⚠️ Sorry, I encountered an internal error. My team has been notified.").catch(() => { });
            }
        }
    }
}

async function handleStart(token: string, chatId: number, from: any) {
    const { onboardUser } = await import("../skills/master-bot-skills");
    const user = await onboardUser(String(from.id), from.username);

    const welcome = `👋 Hello ${(from as any).first_name}! Welcome to **Agent Haus**.
 
I am the Master Bot here to help you:
🚀 **Deploy** new AI agents in seconds
📂 Manage your **Account Wallet**: \`${user.walletAddress || "Initializing..."}\`
📈 Track your agent performance
 
Type /deploy to start creating your first agent, or /wallet to view your dashboard.`;

    return sendMessage(token, chatId, welcome);
}

async function handleHelp(token: string, chatId: number) {
    const help = `🛠 **Agent Haus Commands**

/start - Get started with Agent Haus
/deploy - Deploy a new AI agent
/register - Register your agent for the Synthesis hackathon
/wallet - View your wallet and agents
/help - Show this help message

You can also add me to groups and tag me for help!`;

    return sendMessage(token, chatId, help);
}

async function handleRegisterCommand(token: string, chatId: number) {
    const msg = `🎉 *Synthesis Hackathon Registration*

Register your agent with the Synthesis hackathon to get an on-chain identity and an API key.

Press the button below to get the registration command template (just fill in your details and send it).`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "Get registration command", callback_data: "synthesis_register_start" },
            ],
        ],
    };

    return sendMessage(token, chatId, msg, undefined, keyboard);
}

async function handleDeployCommand(token: string, chatId: number) {
    const msg = `🚀 Let's get you an agent! 

What should your agent do? (e.g. "I want a trading bot for CELO" or "Build me a social manager for my DAO")

_You can also use the web dashboard for full configuration._`;

    return sendMessage(token, chatId, msg);
}

async function handleAgents(token: string, chatId: number, telegramId: string) {
    const user = await prisma.user.findUnique({
        where: { telegramId: String(telegramId) },
        include: { agents: true }
    });

    if (!user || user.agents.length === 0) {
        return sendMessage(token, chatId, "📭 You don't have any agents yet. Type /deploy to create one!");
    }

    let msg = "🤖 **Your Agents**\n\n";
    (user.agents as any[]).forEach((agent: any, i: number) => {
        msg += `${i + 1}. **${agent.name}** (${agent.status})\n`;
        if (agent.agentWalletAddress) {
            msg += `   📍 \`${agent.agentWalletAddress}\`\n`;
        }
    });

    return sendMessage(token, chatId, msg);
}

async function handleWalletCommand(token: string, chatId: number, telegramId: string) {
    const { onboardUser } = await import("../skills/master-bot-skills");
    const user = await prisma.user.findUnique({
        where: { telegramId: String(telegramId) },
        include: { agents: true }
    });

    if (!user) {
        await onboardUser(telegramId);
        return sendMessage(token, chatId, "✨ Account initialized! You don't have any agents yet. Type /deploy to create one.");
    }

    const agentCount = (user.agents as any[]).length;
    const msg = `📒 **Your Dashboard**

Agents Deployed: ${agentCount}
Linked Account: \`${(user as any).email || user.id}\`

Type /agents to see a detailed list.`;

    return sendMessage(token, chatId, msg);
}
