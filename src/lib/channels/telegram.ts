/**
 * Native Telegram Channel Adapter
 *
 * Connects an agent to a Telegram bot. Each agent can have its own bot
 * (user provides token from @BotFather). Multi-tenant: many users, many bots.
 *
 * Flow:
 *   1. User enters bot token → we call setWebhook pointing to our API
 *   2. Telegram POSTs updates to /api/channels/telegram/[agentId]
 *   3. We extract the message, call processMessage()
 *   4. We send the reply back via sendMessage API
 *
 * Telegram Bot API docs: https://core.telegram.org/bots/api
 */

const TELEGRAM_API = "https://api.telegram.org";

// ─── Types (from Telegram Bot API) ──────────────────────────────────────────

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
  };
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  reply_to_message?: TelegramMessage;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
}

// ─── API Helpers ────────────────────────────────────────────────────────────

async function tgApi<T = unknown>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${TELEGRAM_API}/bot${botToken}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API error [${method}]: ${data.description || JSON.stringify(data)}`);
  }
  return data.result as T;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Verify that a bot token is valid and get bot info.
 */
export async function verifyBotToken(botToken: string): Promise<{
  valid: boolean;
  botUsername?: string;
  botName?: string;
  error?: string;
}> {
  try {
    const me = await tgApi<TelegramUser>(botToken, "getMe");
    return {
      valid: true,
      botUsername: me.username ? `@${me.username}` : undefined,
      botName: me.first_name,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Register a webhook with Telegram so updates come to our API.
 *
 * @param botToken The bot token from @BotFather
 * @param agentId The AgentHaus agent ID (used in the webhook URL)
 * @param baseUrl The public URL of our app (e.g. https://agenthaus.example.com)
 * @param secret A secret token for webhook verification
 */
export async function setWebhook(
  botToken: string,
  agentId: string,
  baseUrl: string,
  secret: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const webhookUrl = `${baseUrl}/api/channels/telegram/${agentId}`;
    await tgApi(botToken, "setWebhook", {
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "edited_message", "callback_query"],
      max_connections: 40,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Remove the webhook (disconnect the bot).
 */
export async function removeWebhook(botToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    await tgApi(botToken, "deleteWebhook", { drop_pending_updates: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Get current webhook info.
 */
export async function getWebhookInfo(botToken: string): Promise<{
  url: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
  lastErrorDate?: number;
  lastErrorMessage?: string;
}> {
  return tgApi(botToken, "getWebhookInfo");
}

/**
 * Send a text message to a Telegram chat.
 * Supports Markdown formatting.
 */
export async function sendMessage(
  botToken: string,
  chatId: number | string,
  text: string,
  replyToMessageId?: number
): Promise<TelegramMessage> {
  // Telegram has a 4096 char limit per message
  // If the response is longer, split into chunks
  const chunks = splitMessage(text, 4000);
  let lastMsg: TelegramMessage | null = null;

  for (let i = 0; i < chunks.length; i++) {
    lastMsg = await tgApi<TelegramMessage>(botToken, "sendMessage", {
      chat_id: chatId,
      text: chunks[i],
      parse_mode: "Markdown",
      reply_to_message_id: i === 0 ? replyToMessageId : undefined,
      disable_web_page_preview: true,
    }).catch(async () => {
      // Fallback: send without Markdown if parsing fails
      return tgApi<TelegramMessage>(botToken, "sendMessage", {
        chat_id: chatId,
        text: chunks[i],
        reply_to_message_id: i === 0 ? replyToMessageId : undefined,
        disable_web_page_preview: true,
      });
    });
  }

  return lastMsg!;
}

/**
 * Send a "typing..." indicator.
 */
export async function sendTypingAction(
  botToken: string,
  chatId: number | string
): Promise<void> {
  try {
    await tgApi(botToken, "sendChatAction", {
      chat_id: chatId,
      action: "typing",
    });
  } catch {
    // Non-critical — ignore
  }
}

/**
 * Parse a Telegram update into our standard IncomingChannelMessage.
 */
export function parseUpdate(update: TelegramUpdate, agentId: string) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) return null;

  return {
    channelType: "telegram" as const,
    agentId,
    senderId: String(msg.from?.id || "unknown"),
    senderName: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || undefined,
    text: msg.text,
    chatId: String(msg.chat.id),
    messageId: msg.message_id,
    timestamp: new Date(msg.date * 1000),
  };
}

/**
 * Verify that an incoming webhook request is from Telegram.
 * Telegram sends the secret_token in the X-Telegram-Bot-Api-Secret-Token header.
 */
export function verifyWebhookSecret(request: Request, expectedSecret: string): boolean {
  const header = request.headers.get("x-telegram-bot-api-secret-token");
  return header === expectedSecret;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Try to split at a newline
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen * 0.5) {
      // No good newline — split at space
      splitAt = remaining.lastIndexOf(" ", maxLen);
    }
    if (splitAt < maxLen * 0.3) {
      // No good space — hard split
      splitAt = maxLen;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

