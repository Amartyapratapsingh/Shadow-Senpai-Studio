/**
 * Activity Logger — tracks all AI calls, errors, and costs.
 * Stored in localStorage, viewable in /logs page.
 */

const LOGS_KEY = "ss_activity_logs";
const MAX_LOGS = 2000;
const MAX_AGE_HOURS = 5; // Logs older than 5 hours get auto-deleted

export type LogType = "ai" | "error" | "cost" | "info";

export interface LogEntry {
  id: string;
  type: LogType;
  timestamp: number;
  category: string; // "script" | "panels" | "audio" | "image" | "research" | "system"
  message: string;
  details?: {
    provider?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    costUSD?: number;
    duration?: number; // ms
    error?: string;
    panelNumber?: number;
  };
}

/**
 * Remove logs older than 7 days.
 */
function cleanOldLogs(logs: LogEntry[]): LogEntry[] {
  const cutoff = Date.now() - (MAX_AGE_HOURS * 60 * 60 * 1000);
  return logs.filter(l => l.timestamp >= cutoff);
}

export function addLog(type: LogType, category: string, message: string, details?: LogEntry["details"]) {
  if (typeof window === "undefined") return;
  try {
    let logs = getLogs();
    logs.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      timestamp: Date.now(),
      category,
      message,
      details,
    });
    // Remove logs older than 7 days
    logs = cleanOldLogs(logs);
    // Also cap at MAX_LOGS
    if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch {}
}

export function getLogs(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) return [];
    let logs: LogEntry[] = JSON.parse(raw);
    // Clean old logs on every read
    const before = logs.length;
    logs = cleanOldLogs(logs);
    // Save back if any were removed
    if (logs.length < before) {
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    }
    return logs;
  } catch { return []; }
}

export function clearLogs() {
  if (typeof window !== "undefined") localStorage.removeItem(LOGS_KEY);
}

/**
 * Calculate cost from tokens + model using PRICING table.
 */
function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  // Import pricing inline to avoid circular deps
  const PRICING: Record<string, { input: number; output: number }> = {
    "gpt-5.4": { input: 2.50, output: 15.00 }, "gpt-5.4-mini": { input: 0.75, output: 4.50 },
    "gpt-5.2": { input: 1.75, output: 14.00 }, "gpt-5.2-pro": { input: 21.00, output: 168.00 },
    "gpt-4.1": { input: 2.00, output: 8.00 }, "gpt-4.1-mini": { input: 0.40, output: 1.60 },
    "gpt-4o": { input: 2.50, output: 10.00 }, "gpt-4o-mini": { input: 0.15, output: 0.60 },
    "claude-opus-4-6": { input: 5.00, output: 25.00 }, "claude-sonnet-4-6": { input: 3.00, output: 15.00 },
    "claude-haiku-4-5": { input: 1.00, output: 5.00 }, "claude-sonnet-4-5": { input: 3.00, output: 15.00 },
    "gemini-2.5-pro": { input: 1.25, output: 10.00 }, "gemini-2.5-flash": { input: 0.30, output: 2.50 },
    "gemini-2.5-flash-lite": { input: 0.10, output: 0.40 }, "gemini-3-flash-preview": { input: 0.50, output: 3.00 },
  };
  const TTS_PER_MILLION_CHARS = 15; // OpenAI TTS
  if (model.includes("tts")) return (inputTokens / 1000000) * TTS_PER_MILLION_CHARS;
  const p = PRICING[model] || { input: 2, output: 8 };
  return (inputTokens / 1000000) * p.input + (outputTokens / 1000000) * p.output;
}

// Convenience functions
export function logAI(category: string, message: string, provider: string, model: string, inputTokens?: number, outputTokens?: number, costUSD?: number) {
  const cost = costUSD ?? (inputTokens && outputTokens ? calcCost(model, inputTokens, outputTokens) : 0);
  addLog("ai", category, message, { provider, model, inputTokens, outputTokens, costUSD: cost });
}

export function logError(category: string, message: string, error?: string, provider?: string, model?: string) {
  addLog("error", category, message, { error, provider, model });
}

export function logCost(category: string, message: string, costUSD: number, provider?: string, model?: string) {
  addLog("cost", category, message, { costUSD, provider, model });
}

export function logInfo(category: string, message: string) {
  addLog("info", category, message);
}
