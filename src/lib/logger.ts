/**
 * Activity Logger — tracks all AI calls, errors, and costs.
 * Stored in localStorage, viewable in /logs page.
 */

const LOGS_KEY = "ss_activity_logs";
const MAX_LOGS = 2000;
const MAX_AGE_DAYS = 7; // Logs older than 7 days get auto-deleted

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
  const cutoff = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
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
