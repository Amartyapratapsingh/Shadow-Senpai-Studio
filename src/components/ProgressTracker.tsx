"use client";

import { ChunkResult } from "@/lib/types";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

interface Props {
  results: ChunkResult[];
  currentChunk: number;
}

function ChunkCard({ result }: { result: ChunkResult }) {
  const [expanded, setExpanded] = useState(result.status === "done");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (result.rewritten) {
      await navigator.clipboard.writeText(result.rewritten);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-muted" />,
    processing: (
      <Loader2 className="w-4 h-4 text-primary animate-spin" />
    ),
    done: <CheckCircle2 className="w-4 h-4 text-success" />,
    error: <AlertCircle className="w-4 h-4 text-danger" />,
  }[result.status];

  const statusBorder = {
    pending: "border-card-border",
    processing: "border-primary/50 processing-glow",
    done: "border-success/30",
    error: "border-danger/30",
  }[result.status];

  return (
    <div
      className={`rounded-xl ${statusBorder} glass-card overflow-hidden transition-all duration-300`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {statusIcon}
          <span className="text-sm font-medium">{result.label}</span>
          {result.status === "processing" && (
            <span className="text-xs text-primary animate-pulse">
              Rewriting...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {result.status === "done" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              title="Copy rewritten text"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted" />
              )}
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {result.error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
              {result.error}
            </div>
          )}

          {result.status === "done" && result.rewritten && (
            <div>
              <p className="text-xs text-muted mb-2 font-medium">
                REWRITTEN SCRIPT:
              </p>
              <div className="p-3 rounded-lg bg-background border border-card-border text-sm leading-relaxed whitespace-pre-wrap">
                {result.rewritten}
              </div>
            </div>
          )}

          <details className="group">
            <summary className="text-xs text-muted cursor-pointer hover:text-foreground transition-colors">
              View original transcript for this part
            </summary>
            <div className="mt-2 p-3 rounded-lg bg-background/50 border border-card-border/50 text-xs text-muted leading-relaxed whitespace-pre-wrap">
              {result.original}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default function ProgressTracker({ results, currentChunk }: Props) {
  const doneCount = results.filter((r) => r.status === "done").length;
  const progress =
    results.length > 0 ? (doneCount / results.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Progress
          </span>
          <span className="text-sm text-muted">
            {doneCount} / {results.length} parts complete
          </span>
        </div>
        <div className="h-2 bg-card-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Chunk Cards */}
      <div className="space-y-2">
        {results.map((result) => (
          <ChunkCard key={result.index} result={result} />
        ))}
      </div>
    </div>
  );
}
