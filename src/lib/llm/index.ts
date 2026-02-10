/**
 * Unified LLM Provider Factory
 * Routes requests to the appropriate provider
 */

import * as openrouter from "./openrouter";
import * as openai from "./openai";
import * as groq from "./groq";
import * as grok from "./grok";
import * as gemini from "./gemini";
import * as deepseek from "./deepseek";
import * as zai from "./zai";
import type { LLMProvider } from "@/lib/types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: LLMProvider;
}

/**
 * Send a chat completion request to the appropriate LLM provider
 */
export async function chat(
  messages: ChatMessage[],
  provider: LLMProvider,
  model: string,
  apiKey?: string
): Promise<ChatResponse> {
  const providerModule = getProviderModule(provider);
  const defaultModel = getDefaultModel(provider);

  const response = await providerModule.chatCompletion(
        messages,
    model || defaultModel,
        apiKey
      );

      return {
        content: response.choices[0]?.message?.content || "",
        model: response.model,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
    provider,
      };
}

/**
 * Send a streaming chat completion request
 */
export async function chatStream(
  messages: ChatMessage[],
  provider: LLMProvider,
  model: string,
  apiKey?: string
): Promise<ReadableStream<Uint8Array>> {
  const providerModule = getProviderModule(provider);
  const defaultModel = getDefaultModel(provider);

  return providerModule.chatCompletionStream(
        messages,
    model || defaultModel,
        apiKey
      );
}

/**
 * Get available models for a provider
 */
export function getModelsForProvider(provider: LLMProvider) {
  switch (provider) {
    case "openrouter":
      return [...openrouter.OPENROUTER_FREE_MODELS];
    case "openai":
      return [...openai.OPENAI_MODELS];
    case "groq":
      return [...groq.GROQ_MODELS];
    case "grok":
      return [...grok.GROK_MODELS];
    case "gemini":
      return [...gemini.GEMINI_MODELS];
    case "deepseek":
      return [...deepseek.DEEPSEEK_MODELS];
    case "zai":
      return [...zai.ZAI_MODELS];
    default:
      return [];
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function getProviderModule(provider: LLMProvider) {
  switch (provider) {
    case "openrouter":
      return openrouter;
    case "openai":
      return openai;
    case "groq":
      return groq;
    case "grok":
      return grok;
    case "gemini":
      return gemini;
    case "deepseek":
      return deepseek;
    case "zai":
      return zai;
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case "openrouter":
      return "meta-llama/llama-3.3-70b-instruct:free";
    case "openai":
      return "gpt-4o-mini";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "grok":
      return "grok-3-mini-fast";
    case "gemini":
      return "gemini-2.0-flash";
    case "deepseek":
      return "deepseek-chat";
    case "zai":
      return "glm-4-flash";
    default:
      return "";
  }
}
