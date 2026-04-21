"use client";

import { ChunkResult } from "@/lib/types";
import { Copy, Check, Download, FileText, Volume2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  results: ChunkResult[];
}

export default function OutputSection({ results }: Props) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const allDone = results.length > 0 && results.every((r) => r.status === "done");

  const fullScript = results
    .filter((r) => r.status === "done" && r.rewritten)
    .map((r) => r.rewritten)
    .join("\n\n");

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rewritten-script-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateAudio = () => {
    localStorage.setItem("manhuascript_pending_audio", fullScript);
    router.push("/audio");
  };

  if (!allDone) return null;

  const totalWords = fullScript.split(/\s+/).filter((w) => w.length > 0).length;

  return (
    <div className="rounded-2xl border border-success/30 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-success" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Complete Rewritten Script
            </h3>
            <p className="text-xs text-muted">
              {totalWords.toLocaleString()} words / {results.length} parts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy All
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handleGenerateAudio}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors text-sm font-medium"
          >
            <Volume2 className="w-4 h-4" />
            Generate Audio
          </button>
        </div>
      </div>

      {/* Full Script Preview */}
      <div className="p-5">
        <div className="max-h-96 overflow-y-auto p-4 rounded-xl bg-background border border-card-border text-sm leading-relaxed whitespace-pre-wrap">
          {fullScript}
        </div>
      </div>
    </div>
  );
}
