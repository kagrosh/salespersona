import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { StrategyResultSchema, type CaseSnapshot } from "@/domain/strategy/types";
import { ProviderRefusal, validateModelResult, type StrategyProvider } from "./adapter";
import { PROMPT_VERSION, systemPrompt, userMessage } from "./prompt";

const DEFAULT_MODEL = "claude-opus-5";

export function anthropicProvider(): StrategyProvider {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY server-side
  const model = process.env.STRATEGY_MODEL || DEFAULT_MODEL;
  return {
    id: "anthropic",
    async generate(snapshot: CaseSnapshot) {
      const response = await client.messages.parse({
        model,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        output_config: { effort: "high", format: zodOutputFormat(StrategyResultSchema) },
        system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage(snapshot) }],
      });

      if (response.stop_reason === "refusal") {
        throw new ProviderRefusal(response.stop_details?.category ?? null, response.stop_details?.explanation ?? null);
      }
      if (response.stop_reason === "max_tokens") {
        throw new Error("The model output was cut off (max_tokens). Try again; the previous valid strategy is kept.");
      }
      if (!response.parsed_output) {
        throw new Error("The model returned output that did not match the strategy schema. The previous valid strategy is kept.");
      }
      const { result } = validateModelResult(response.parsed_output, snapshot);
      return {
        result,
        modelId: response.model,
        promptVersion: PROMPT_VERSION,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      };
    },
  };
}
