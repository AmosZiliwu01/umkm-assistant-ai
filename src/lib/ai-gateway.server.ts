import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createGroqProvider(groqApiKey: string) {
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
    },
  });
}