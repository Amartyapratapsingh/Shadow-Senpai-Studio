/**
 * AI Model Cooldown Tracker
 * Tracks when models hit rate limits, parses retry times,
 * and shows countdowns in Settings + Header.
 */

const COOLDOWNS_KEY = "ss_model_cooldowns";

export interface CooldownEntry {
  model: string;
  provider: string;        // "openai" | "gemini" | "anthropic"
  type: "image" | "audio" | "text";  // what the model was doing
  exhaustedAt: number;      // timestamp when it hit the limit
  cooldownUntil: number;    // timestamp when it should be available again
  errorMessage: string;     // original error for reference
}

/**
 * Parse cooldown time from error messages.
 * Handles formats like:
 * - "retry in 17h41m46.671304196s"
 * - "retry in 2h30m"
 * - "retry in 45m30s"
 * - "retry in 3600s"
 * - "Please retry after X seconds"
 */
function parseCooldownMs(errorMsg: string): number {
  const lower = errorMsg.toLowerCase();

  // Match "retry in Xh Xm Xs" pattern
  const retryMatch = lower.match(/retry\s+(?:in|after)\s+(\d+h)?(\d+m)?(\d+[\d.]*s)?/i);
  if (retryMatch) {
    let ms = 0;
    if (retryMatch[1]) ms += parseInt(retryMatch[1]) * 3600000;
    if (retryMatch[2]) ms += parseInt(retryMatch[2]) * 60000;
    if (retryMatch[3]) ms += parseFloat(retryMatch[3]) * 1000;
    if (ms > 0) return ms;
  }

  // Match "retry after X seconds"
  const secMatch = lower.match(/retry\s+after\s+(\d+)\s*seconds/i);
  if (secMatch) return parseInt(secMatch[1]) * 1000;

  // Match standalone time like "17h41m"
  const timeMatch = lower.match(/(\d+)h\s*(\d+)m/);
  if (timeMatch) {
    return parseInt(timeMatch[1]) * 3600000 + parseInt(timeMatch[2]) * 60000;
  }

  // Default: if it's a quota error but no time found, assume ~24 hours (daily quota)
  if (lower.includes("per_day") || lower.includes("daily") || lower.includes("quota")) {
    return 24 * 3600000; // 24 hours
  }

  // Fallback: 1 hour
  return 3600000;
}

/**
 * Add a cooldown entry when a model hits a rate limit.
 */
export function addCooldown(
  model: string,
  provider: string,
  type: "image" | "audio" | "text",
  errorMessage: string
) {
  if (typeof window === "undefined") return;

  const cooldownMs = parseCooldownMs(errorMessage);
  const now = Date.now();

  const entry: CooldownEntry = {
    model,
    provider,
    type,
    exhaustedAt: now,
    cooldownUntil: now + cooldownMs,
    errorMessage: errorMessage.slice(0, 200),
  };

  try {
    const existing = getCooldowns();
    // Replace existing entry for same model+type, or add new
    const idx = existing.findIndex(e => e.model === model && e.type === type);
    if (idx >= 0) existing[idx] = entry;
    else existing.push(entry);
    localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(existing));
  } catch {}
}

/**
 * Get all cooldown entries (removes expired ones automatically).
 */
export function getCooldowns(): CooldownEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COOLDOWNS_KEY);
    if (!raw) return [];
    const entries: CooldownEntry[] = JSON.parse(raw);
    // Filter out expired cooldowns
    const now = Date.now();
    const active = entries.filter(e => e.cooldownUntil > now);
    // Save back if any were removed
    if (active.length < entries.length) {
      localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(active));
    }
    return active;
  } catch { return []; }
}

/**
 * Check if a specific model is currently exhausted.
 */
export function isModelExhausted(model: string, type?: "image" | "audio" | "text"): boolean {
  const cooldowns = getCooldowns();
  return cooldowns.some(e => e.model === model && (!type || e.type === type));
}

/**
 * Get remaining cooldown time for a model in milliseconds.
 */
export function getRemainingMs(model: string, type?: "image" | "audio" | "text"): number {
  const cooldowns = getCooldowns();
  const entry = cooldowns.find(e => e.model === model && (!type || e.type === type));
  if (!entry) return 0;
  return Math.max(0, entry.cooldownUntil - Date.now());
}

/**
 * Format remaining time as human-readable string.
 */
export function formatCooldownTime(ms: number): string {
  if (ms <= 0) return "Available";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Clear all cooldowns (for manual reset).
 */
export function clearCooldowns() {
  if (typeof window !== "undefined") localStorage.removeItem(COOLDOWNS_KEY);
}

/**
 * Get a friendly display name for a model.
 */
export function getModelDisplayName(model: string): string {
  const names: Record<string, string> = {
    "gemini-3-pro-image-preview": "Gemini 3 Pro Image",
    "gemini-3.1-flash-image-preview": "Gemini 3.1 Flash Image",
    "gemini-2.5-flash-image": "Gemini 2.5 Flash Image",
    "gpt-image-1.5": "GPT Image 1.5",
    "gpt-image-1": "GPT Image 1",
    "gpt-image-1-mini": "GPT Image 1 Mini",
    "gpt-4o-mini-tts": "OpenAI TTS",
    "gemini-2.5-flash-preview-tts": "Gemini TTS",
  };
  return names[model] || model;
}
