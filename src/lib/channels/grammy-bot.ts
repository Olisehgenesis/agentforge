import { Bot, webhookCallback, Context, NextFunction } from "grammy";
import { processMasterBotMessage } from "@/lib/channels/master-bot";
import { logger } from "@/lib/logger";

const isProd = process.env.NODE_ENV === "production";
const token = process.env.TELEGRAM_MASTER_BOT_TOKEN || (isProd ? "" : "BUILD_TOKEN");

if (!process.env.TELEGRAM_MASTER_BOT_TOKEN) {
    if (isProd) {
        logger.error("CRITICAL: TELEGRAM_MASTER_BOT_TOKEN is missing in production!");
    } else {
        logger.warn("TELEGRAM_MASTER_BOT_TOKEN is not set; using placeholder for build.");
    }
}

// We still need a non-empty string for the constructor to avoid immediate throw
export const bot = new Bot(token || "MISSING_TOKEN");



// ─── Middleware ──────────────────────────────────────────────────────────────

/**
 * Standard error boundary for the bot.
 */
bot.catch((err) => {
    const ctx = err.ctx;
    logger.error({
        updateId: ctx.update.update_id,
        error: err.error,
        message: err.message
    }, "Error in Grammy bot");
});

/**
 * Logging middleware to trace user interactions.
 */
bot.use(async (ctx: Context, next: NextFunction) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    logger.info({
        user: ctx.from?.id,
        type: ctx.update.update_id,
        duration: `${ms}ms`
    }, "Update processed");
});

// ─── Commands ────────────────────────────────────────────────────────────────

bot.command("start", (ctx) => {
    return ctx.reply("Welcome to Agent Haus Master Bot! I can help you manage your AI agents on Celo.");
});

bot.command("help", (ctx) => {
    return ctx.reply("Available commands:\n/start - Welcome message\n/help - Show this help");
});
// ─── Callback Query / Inline Button Handling ──────────────────────────────────

bot.callbackQuery("synthesis_register_start", async (ctx) => {
    try {
        await ctx.answerCallbackQuery({ text: "Here is the registration command template." });

        const template = `🎉 *Synthesis Hackathon Registration*

To register, send the following message (fill in your details):

` +
            "`[[SYNTHESIS_REGISTER|My Agent|A trading assistant on Celo|openclaw|gpt-4o|Jane Doe|jane@example.com|Helping users trade better on Celo|@jane|Builder|a little|yes|7]]`" +
            `

Once you've sent this, I will call the Synthesis API and save your API key and on-chain identity.`;

        await ctx.reply(template, { parse_mode: "Markdown" });
    } catch (err) {
        logger.error({ error: err, update: ctx.update }, "Failed to handle synthesis register callback");
        await ctx.reply("Sorry, I couldn't generate the registration command. Try again or just type /register.");
    }
});
// ─── Message Handling ────────────────────────────────────────────────────────

bot.on("message", async (ctx) => {
    try {
        // Process via the existing master-bot pipeline
        // Note: processMasterBotMessage expects the raw Telegram update object
        await processMasterBotMessage(ctx.update);
    } catch (error) {
        logger.error({ error, update: ctx.update }, "Failed to process message via Master Bot pipeline");
        await ctx.reply("Sorry, I encountered an error while processing your request.");
    }
});

const callback = webhookCallback(bot, "std/http", {
    secretToken: process.env.MASTER_BOT_SECRET
});

/**
 * Next.js compatible webhook handler with runtime safety
 */
export const handleUpdate = async (req: Request) => {
    if (!process.env.TELEGRAM_MASTER_BOT_TOKEN) {
        logger.error("Telegram webhook received but TELEGRAM_MASTER_BOT_TOKEN is missing.");
        return new Response("Configuration Error", { status: 500 });
    }
    return callback(req);
};


