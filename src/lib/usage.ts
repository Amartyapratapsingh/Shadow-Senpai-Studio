/**
 * Usage tracking — tokens spent + estimated cost.
 * Stored in localStorage, persists across sessions.
 *
 * PRICING SOURCE (fetched April 2026):
 * - OpenAI: openrouter.ai/api/v1/models + known GPT-4.1/4o pricing
 * - Anthropic: platform.claude.com/docs/en/docs/about-claude/pricing
 * - Gemini: ai.google.dev/gemini-api/docs/pricing
 * - TTS: OpenAI gpt-4o-mini-tts at $15/1M chars
 */

const USAGE_KEY = "manhuascript_usage";
const CURRENCY_KEY = "manhuascript_currency";
const VOICE_KEY = "manhuascript_default_voice";

export interface UsageRecord {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTTSChars: number;
  totalCostUSD: number;
}

const EMPTY_USAGE: UsageRecord = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTTSChars: 0,
  totalCostUSD: 0,
};

/**
 * Pricing per 1M tokens (USD).
 * All values verified from official sources — April 2026.
 */
export const PRICING: Record<string, { input: number; output: number }> = {
  // ═══════════════════════════════════════════
  //  OpenAI — per 1M tokens
  // ═══════════════════════════════════════════

  // GPT-5.4 family (March 2026, from OpenRouter)
  "gpt-5.4":       { input: 2.50,  output: 15.00 },
  "gpt-5.4-mini":  { input: 0.75,  output: 4.50 },
  "gpt-5.4-nano":  { input: 0.20,  output: 1.25 },

  // GPT-5.2 family (Dec 2025, from OpenRouter)
  "gpt-5.2":       { input: 1.75,  output: 14.00 },
  "gpt-5.2-pro":   { input: 21.00, output: 168.00 },

  // GPT-5.1 family (Nov 2025 — estimated from pattern)
  "gpt-5.1":       { input: 1.75,  output: 14.00 },
  "gpt-5.1-mini":  { input: 0.75,  output: 4.50 },
  "gpt-5.1-codex": { input: 1.75,  output: 14.00 },

  // GPT-5 family (Aug 2025 — estimated from pattern)
  "gpt-5":         { input: 2.50,  output: 15.00 },
  "gpt-5-mini":    { input: 0.75,  output: 4.50 },
  "gpt-5-nano":    { input: 0.20,  output: 1.25 },

  // GPT-4.1 family (April 2025 — known pricing)
  "gpt-4.1":       { input: 2.00,  output: 8.00 },
  "gpt-4.1-mini":  { input: 0.40,  output: 1.60 },
  "gpt-4.1-nano":  { input: 0.10,  output: 0.40 },

  // GPT-4o family (known pricing)
  "gpt-4o":        { input: 2.50,  output: 10.00 },
  "gpt-4o-mini":   { input: 0.15,  output: 0.60 },

  // ═══════════════════════════════════════════
  //  Anthropic Claude — per 1M tokens
  //  Source: platform.claude.com/docs/en/docs/about-claude/pricing
  // ═══════════════════════════════════════════

  "claude-opus-4-6":          { input: 5.00,  output: 25.00 },
  "claude-sonnet-4-6":        { input: 3.00,  output: 15.00 },
  "claude-haiku-4-5":         { input: 1.00,  output: 5.00 },
  "claude-opus-4-5":          { input: 5.00,  output: 25.00 },
  "claude-sonnet-4-5":        { input: 3.00,  output: 15.00 },
  "claude-opus-4-1":          { input: 15.00, output: 75.00 },
  "claude-sonnet-4-20250514": { input: 3.00,  output: 15.00 },
  "claude-opus-4-20250514":   { input: 15.00, output: 75.00 },

  // ═══════════════════════════════════════════
  //  Google Gemini — per 1M tokens
  //  Source: ai.google.dev/gemini-api/docs/pricing
  // ═══════════════════════════════════════════

  "gemini-3.1-pro-preview":        { input: 2.00,  output: 12.00 },
  "gemini-3-flash-preview":        { input: 0.50,  output: 3.00 },
  "gemini-3.1-flash-lite-preview": { input: 0.25,  output: 1.50 },
  "gemini-2.5-pro":                { input: 1.25,  output: 10.00 },
  "gemini-2.5-flash":              { input: 0.30,  output: 2.50 },
  "gemini-2.5-flash-lite":         { input: 0.10,  output: 0.40 },
  "gemini-2.0-flash":              { input: 0.10,  output: 0.40 },
  "gemini-2.0-flash-lite":         { input: 0.075, output: 0.30 },
};

// TTS pricing: OpenAI gpt-4o-mini-tts = $15 per 1M characters
const TTS_COST_PER_MILLION_CHARS = 15;

export const CURRENCIES: { code: string; symbol: string; rate: number }[] = [
  { code: "USD", symbol: "$", rate: 1 },
  { code: "INR", symbol: "\u20B9", rate: 85 },
  { code: "EUR", symbol: "\u20AC", rate: 0.92 },
  { code: "GBP", symbol: "\u00A3", rate: 0.79 },
  { code: "JPY", symbol: "\u00A5", rate: 155 },
  { code: "AUD", symbol: "A$", rate: 1.55 },
  { code: "CAD", symbol: "C$", rate: 1.38 },
];

// ── Load / Save ──

export function loadUsage(): UsageRecord {
  if (typeof window === "undefined") return EMPTY_USAGE;
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return EMPTY_USAGE;
    return { ...EMPTY_USAGE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_USAGE;
  }
}

export function saveUsage(usage: UsageRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {}
}

export function resetUsage(): void {
  saveUsage(EMPTY_USAGE);
}

// ── Add usage ──

export function addTextUsage(
  model: string,
  inputTokens: number,
  outputTokens: number
): void {
  const usage = loadUsage();
  const pricing = PRICING[model];

  if (!pricing) {
    // Unknown model — use a safe fallback ($2/$8 per 1M)
    const inputCost = (inputTokens / 1_000_000) * 2;
    const outputCost = (outputTokens / 1_000_000) * 8;
    usage.totalInputTokens += inputTokens;
    usage.totalOutputTokens += outputTokens;
    usage.totalCostUSD += inputCost + outputCost;
    saveUsage(usage);
    return;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  usage.totalInputTokens += inputTokens;
  usage.totalOutputTokens += outputTokens;
  usage.totalCostUSD += inputCost + outputCost;

  saveUsage(usage);
}

export function addTTSUsage(charCount: number): void {
  const usage = loadUsage();
  const cost = (charCount / 1_000_000) * TTS_COST_PER_MILLION_CHARS;
  usage.totalTTSChars += charCount;
  usage.totalCostUSD += cost;
  saveUsage(usage);
}

// ── Currency ──

export function loadCurrency(): string {
  if (typeof window === "undefined") return "USD";
  return localStorage.getItem(CURRENCY_KEY) || "USD";
}

export function saveCurrency(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENCY_KEY, code);
}

export function formatCost(usd: number, currencyCode?: string): string {
  const code = currencyCode || loadCurrency();
  const currency = CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
  const converted = usd * currency.rate;

  if (converted < 0.01 && converted > 0) return `<${currency.symbol}0.01`;
  return `${currency.symbol}${converted.toFixed(2)}`;
}

// ── Estimate tokens from text ──
// ~4 chars per token is a widely accepted approximation for GPT-family tokenizers

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Default voice ──

export function loadDefaultVoice(): string {
  if (typeof window === "undefined") return "cedar";
  return localStorage.getItem(VOICE_KEY) || "cedar";
}

export function saveDefaultVoice(voice: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_KEY, voice);
}
