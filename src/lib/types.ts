export type AIProvider = "openai" | "anthropic" | "gemini";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export interface RewriteRequest {
  transcript: string;
  manhuaName: string;
  style: string;
  config: AIConfig;
}

export interface ChunkResult {
  index: number;
  total: number;
  label: string;
  original: string;
  rewritten: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

export interface RewriteProgress {
  currentChunk: number;
  totalChunks: number;
  results: ChunkResult[];
  status: "idle" | "processing" | "done" | "error";
  error?: string;
}

export type ModelTier = "best" | "recommended" | "budget";

export interface SimpleModel {
  value: string;
  label: string;
  tier: ModelTier;
  description: string;
}

/**
 * 5 curated models per provider:
 *   1 Best (highest quality, most expensive)
 *   2 Recommended (good balance)
 *   2 Budget (cheap & fast)
 */
export const SIMPLE_MODELS: Record<AIProvider, SimpleModel[]> = {
  openai: [
    {
      value: "gpt-5.4",
      label: "GPT-5.4",
      tier: "best",
      description: "Latest & most powerful. Best quality output.",
    },
    {
      value: "gpt-4.1",
      label: "GPT-4.1",
      tier: "recommended",
      description: "Great balance of quality and speed.",
    },
    {
      value: "gpt-4o",
      label: "GPT-4o",
      tier: "recommended",
      description: "Fast, smart, reliable all-rounder.",
    },
    {
      value: "gpt-4.1-mini",
      label: "GPT-4.1 Mini",
      tier: "budget",
      description: "Quick and affordable. Good for most tasks.",
    },
    {
      value: "gpt-4o-mini",
      label: "GPT-4o Mini",
      tier: "budget",
      description: "Cheapest option. Fast responses.",
    },
  ],

  anthropic: [
    {
      value: "claude-opus-4-6",
      label: "Claude Opus 4.6",
      tier: "best",
      description: "Most intelligent. Best for complex scripts.",
    },
    {
      value: "claude-sonnet-4-6",
      label: "Claude Sonnet 4.6",
      tier: "recommended",
      description: "Fast + smart. Great for most use cases.",
    },
    {
      value: "claude-sonnet-4-5",
      label: "Claude Sonnet 4.5",
      tier: "recommended",
      description: "Proven quality. Reliable choice.",
    },
    {
      value: "claude-haiku-4-5",
      label: "Claude Haiku 4.5",
      tier: "budget",
      description: "Fastest Claude. Near-frontier quality.",
    },
    {
      value: "claude-sonnet-4-20250514",
      label: "Claude Sonnet 4",
      tier: "budget",
      description: "Older but still solid. Very affordable.",
    },
  ],

  gemini: [
    {
      value: "gemini-2.5-pro",
      label: "Gemini 2.5 Pro",
      tier: "best",
      description: "Most advanced. Deep reasoning & quality.",
    },
    {
      value: "gemini-3-flash-preview",
      label: "Gemini 3 Flash",
      tier: "recommended",
      description: "Frontier performance at low cost.",
    },
    {
      value: "gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      tier: "recommended",
      description: "Best price-performance ratio.",
    },
    {
      value: "gemini-2.5-flash-lite",
      label: "Gemini 2.5 Flash Lite",
      tier: "budget",
      description: "Fastest & most budget-friendly.",
    },
    {
      value: "gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      tier: "budget",
      description: "Older but cheap and reliable.",
    },
  ],
};

export function getModelsByTier(
  provider: AIProvider,
  tier: ModelTier
): SimpleModel[] {
  return SIMPLE_MODELS[provider].filter((m) => m.tier === tier);
}
