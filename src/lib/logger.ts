/**
 * Activity Logger — tracks all AI calls, errors, and costs.
 * Stored in localStorage, viewable in /logs page.
 */

const LOGS_KEY = "ss_activity_logs";
const MAX_LOGS = 500; // Keep last 500 entries

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

export function addLog(type: LogType, category: string, message: string, details?: LogEntry["details"]) {
  if (typeof window === "undefined") return;
  try {
    const logs = getLogs();
    logs.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      timestamp: Date.now(),
      category,
      message,
      details,
    });
    // Keep only last MAX_LOGS
    if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch {}
}

export function getLogs(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearLogs() {
  if (typeof window !== "undefined") localStorage.removeItem(LOGS_KEY);
}

// Convenience functions
export function logAI(category: string, message: string, provider: string, model: string, inputTokens?: number, outputTokens?: number, costUSD?: number) {
  addLog("ai", category, message, { provider, model, inputTokens, outputTokens, costUSD });
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
