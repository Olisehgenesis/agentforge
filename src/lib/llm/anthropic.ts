/**
 * Anthropic Claude LLM Provider
 * Claude 3.5 Sonnet, Opus, Haiku
 * https://docs.anthropic.com/en/api
 */

const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  content: { type: string; text: string }[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Convert OpenAI-style messages to Anthropic format.
 * Anthropic uses system as separate param; messages are user/assistant only.
 */
function toAnthropicMessages(messages: ChatMessage[]): {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
} {
  let system: string | undefined;
  const anthropicMessages: { role: "user" | "assistant"; content: string }[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      system = m.content;
    } else if (m.role === "user" || m.role === "assistant") {
      anthropicMessages.push({ role: m.role, content: m.content });
    }
  }

  return { system, messages: anthropicMessages };
}

export async function chatCompletion(
  messages: ChatMessage[],
  model: string = "claude-sonnet-4-20250514",
  apiKey?: string
): Promise<{
  choices: { message: { role: string; content: string } }[];
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    throw new Error(
      "Anthropic API key not configured. Add your Anthropic API key in Settings."
    );
  }

  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);

  const body: Record<string, unknown> = {
    model,
    max_tokens: 2048,
    messages: anthropicMessages,
  };
  if (system) body.system = system;

  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  const text = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("") ?? "";

  return {
    choices: [{ message: { role: "assistant", content: text } }],
    model: data.model,
    usage: data.usage
      ? {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        }
      : undefined,
  };
}

/**
 * Stream chat completion from Anthropic
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  model: string = "claude-sonnet-4-20250514",
  apiKey?: string
): Promise<ReadableStream<Uint8Array>> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    throw new Error("Anthropic API key not configured.");
  }

  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);

  const body: Record<string, unknown> = {
    model,
    max_tokens: 2048,
    messages: anthropicMessages,
    stream: true,
  };
  if (system) body.system = system;

  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic stream error (${response.status}): ${error}`);
  }

  return response.body!;
}

// Available Claude models
export const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
] as const;
