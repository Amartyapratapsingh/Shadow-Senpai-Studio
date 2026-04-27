"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { getLogs, clearLogs, LogEntry, LogType } from "@/lib/logger";
import { formatCost, loadCurrency } from "@/lib/usage";
import {
  ArrowLeft, Cpu, AlertCircle, Coins, Info, Trash2,
  Filter, RefreshCw,
} from "lucide-react";
import Link from "next/link";

const TYPE_CONFIG: Record<LogType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  ai: { label: "AI Call", icon: <Cpu className="w-3 h-3" />, color: "text-blue-400", bg: "bg-blue-500/10" },
  error: { label: "Error", icon: <AlertCircle className="w-3 h-3" />, color: "text-red-400", bg: "bg-red-500/10" },
  cost: { label: "Cost", icon: <Coins className="w-3 h-3" />, color: "text-amber-400", bg: "bg-amber-500/10" },
  info: { label: "Info", icon: <Info className="w-3 h-3" />, color: "text-muted", bg: "bg-white/5" },
};

const CATEGORY_COLORS: Record<string, string> = {
  script: "text-violet-400",
  panels: "text-rose-400",
  audio: "text-fuchsia-400",
  image: "text-cyan-400",
  research: "text-emerald-400",
  system: "text-muted",
  character: "text-amber-400",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [mounted, setMounted] = useState(false);
  const currency = typeof window !== "undefined" ? loadCurrency() : "USD";

  useEffect(() => { setMounted(true); setLogs(getLogs()); }, []);

  const refresh = () => setLogs(getLogs());
  const handleClear = () => { clearLogs(); setLogs([]); };

  const filtered = logs.filter(l => {
    if (filter !== "all" && l.type !== filter) return false;
    if (categoryFilter !== "all" && l.category !== categoryFilter) return false;
    return true;
  });

  const categories = [...new Set(logs.map(l => l.category))];
  const totalCost = logs.filter(l => l.details?.costUSD).reduce((sum, l) => sum + (l.details?.costUSD || 0), 0);
  const errorCount = logs.filter(l => l.type === "error").length;
  const aiCallCount = logs.filter(l => l.type === "ai").length;

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
            <p className="text-sm text-muted mt-1">All AI calls, errors, and costs</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="p-2 rounded-lg glass text-muted hover:text-foreground transition-all"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={handleClear} className="p-2 rounded-lg glass text-muted hover:text-danger transition-all"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl glass-card p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{aiCallCount}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider">AI Calls</p>
          </div>
          <div className="rounded-xl glass-card p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{errorCount}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider">Errors</p>
          </div>
          <div className="rounded-xl glass-card p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{formatCost(totalCost, currency)}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider">Total Cost</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted" />
          {(["all", "ai", "error", "cost", "info"] as const).map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${filter === t ? "bg-white/10 text-foreground" : "text-muted/50 hover:text-muted"}`}>
              {t === "all" ? "All" : TYPE_CONFIG[t].label} {t !== "all" && `(${logs.filter(l => l.type === t).length})`}
            </button>
          ))}
          <span className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${categoryFilter === "all" ? "bg-white/10 text-foreground" : "text-muted/50 hover:text-muted"}`}>
            All Categories
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${categoryFilter === c ? "bg-white/10 text-foreground" : "text-muted/50 hover:text-muted"}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Log entries */}
        <div className="space-y-1.5">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted/40 text-sm">No logs yet. Generate something to see activity here.</div>
          )}
          {filtered.map(log => {
            const typeConf = TYPE_CONFIG[log.type];
            const catColor = CATEGORY_COLORS[log.category] || "text-muted";
            const isSuccess = log.type === "ai" || log.type === "info";
            const isError = log.type === "error";
            const isCost = log.type === "cost";
            const borderColor = isError ? "border-l-red-500" : isSuccess ? "border-l-emerald-500" : isCost ? "border-l-amber-500" : "border-l-white/10";
            const bgColor = isError ? "bg-red-500/[0.03]" : isSuccess ? "bg-emerald-500/[0.02]" : "";
            return (
              <div key={log.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-l-2 ${borderColor} ${bgColor} glass hover:bg-white/[0.04] transition-all`}>
                {/* Type icon */}
                <div className={`w-6 h-6 rounded-md ${isError ? "bg-red-500/15" : isSuccess ? "bg-emerald-500/15" : typeConf.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className={isError ? "text-red-400" : isSuccess ? "text-emerald-400" : typeConf.color}>{typeConf.icon}</span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${catColor}`}>{log.category}</span>
                    <span className={`text-xs ${isError ? "text-red-400/90" : isSuccess ? "text-emerald-400/90" : "text-foreground/80"}`}>{log.message}</span>
                  </div>
                  {/* Details */}
                  {log.details && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Provider + Model */}
                      {log.details.provider && (
                        <span className="text-[10px] font-medium text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/15">
                          {log.details.provider} / {log.details.model}
                        </span>
                      )}
                      {/* Tokens */}
                      {log.details.inputTokens !== undefined && log.details.inputTokens > 0 && (
                        <span className="text-[10px] text-violet-400 px-2 py-0.5 rounded-md bg-violet-500/10">
                          {log.details.inputTokens.toLocaleString()} {log.details.outputTokens ? `→ ${log.details.outputTokens.toLocaleString()}` : ""} tokens
                        </span>
                      )}
                      {/* Cost */}
                      {log.details.costUSD !== undefined && log.details.costUSD > 0 && (
                        <span className="text-[10px] font-semibold text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/15">
                          {formatCost(log.details.costUSD, currency)}
                        </span>
                      )}
                      {/* Error */}
                      {log.details.error && (
                        <span className="text-[10px] text-red-400 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/15">{log.details.error}</span>
                      )}
                      {log.details.panelNumber && (
                        <span className="text-[10px] text-muted">Panel #{log.details.panelNumber}</span>
                      )}
                    </div>
                  )}
                </div>
                {/* Time */}
                <span className="text-[10px] text-muted/40 shrink-0">{timeAgo(log.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
