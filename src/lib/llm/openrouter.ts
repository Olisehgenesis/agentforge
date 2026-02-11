/**
 * OpenRouter LLM Provider
 * Free tier models via OpenAI-compatible API
 * https://openrouter.ai/docs
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function chatCompletion(
  messages: ChatMessage[],
  model: string = "meta-llama/llama-3.3-70b-instruct:free",
  apiKey?: string
): Promise<ChatCompletionResponse> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("OpenRouter API key not configured. Set OPENROUTER_API_KEY in environment.");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Celo AgentHaus",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Stream chat completion from OpenRouter
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  model: string = "meta-llama/llama-3.3-70b-instruct:free",
  apiKey?: string
): Promise<ReadableStream<Uint8Array>> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("OpenRouter API key not configured.");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Celo AgentHaus",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter stream error (${response.status}): ${error}`);
  }

  return response.body!;
}

// Available free models on OpenRouter
// Gemma models excluded — Google AI Studio doesn't support system instructions on free tier
export const OPENROUTER_FREE_MODELS = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
  { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B (Free)" },
  { id: "qwen/qwen3-4b:free", name: "Qwen3 4B (Free)" },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small 3.1 24B (Free)" },
  { id: "deepseek/deepseek-r1-0528:free", name: "DeepSeek R1 (Free)" },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 405B (Free)" },
] as const;

