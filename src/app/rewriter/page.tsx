"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import AIProviderSelector from "@/components/AIProviderSelector";
import TranscriptInput from "@/components/TranscriptInput";
import ProgressTracker from "@/components/ProgressTracker";
import OutputSection from "@/components/OutputSection";
import { AIConfig, ChunkResult, RewriteProgress } from "@/lib/types";
import { DURATION_OPTIONS } from "@/lib/duration";
import { addTextUsage, estimateTokens } from "@/lib/usage";
import { logAI, logError } from "@/lib/logger";
import {
  Wand2,
  AlertCircle,
  StopCircle,
  ArrowLeft,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  Volume2,
} from "lucide-react";
import Link from "next/link";

export default function RewriterPage() {
  const router = useRouter();
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    provider: "openai",
    apiKey: "",
    model: "gpt-4o",
  });

  // Shared state
  const [transcript, setTranscript] = useState("");
  const [manhuaName, setManhuaName] = useState("");
  const [style, setStyle] = useState("engaging-and-dramatic");
  const [durationMinutes, setDurationMinutes] = useState(15);

  // Rewrite mode state (when transcript is provided)
  const [progress, setProgress] = useState<RewriteProgress>({
    currentChunk: 0,
    totalChunks: 0,
    results: [],
    status: "idle",
  });
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // Generate mode state (when NO transcript — AI generates from scratch)
  const [generatedScript, setGeneratedScript] = useState("");
  const [generateStatus, setGenerateStatus] = useState<
    "idle" | "generating" | "done" | "error"
  >("idle");
  const [generateError, setGenerateError] = useState("");
  const [copied, setCopied] = useState(false);

  const hasTranscript = transcript.trim().length > 0;
  const isProcessing = progress.status === "processing";
  const isGenerating = generateStatus === "generating";
  const isBusy = isProcessing || isGenerating;

  // ── REWRITE (has transcript) ──
  const handleStop = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setProgress((prev) => ({ ...prev, status: "idle" }));
    }
  }, [abortController]);

  const handleRewrite = useCallback(async () => {
    if (!transcript.trim() || !aiConfig.apiKey.trim()) return;

    const controller = new AbortController();
    setAbortController(controller);

    try {
      setProgress({
        currentChunk: 0,
        totalChunks: 0,
        results: [],
        status: "processing",
      });

      const chunkRes = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          manhuaName,
          style,
          config: aiConfig,
        }),
        signal: controller.signal,
      });

      if (!chunkRes.ok) {
        const err = await chunkRes.json();
        throw new Error(err.error || "Failed to process transcript");
      }

      const { chunks } = await chunkRes.json();
      const results: ChunkResult[] = chunks;

      setProgress({
        currentChunk: 0,
        totalChunks: results.length,
        results,
        status: "processing",
      });

      for (let i = 0; i < results.length; i++) {
        if (controller.signal.aborted) break;

        setProgress((prev) => ({
          ...prev,
          currentChunk: i,
          results: prev.results.map((r, idx) =>
            idx === i ? { ...r, status: "processing" as const } : r
          ),
        }));

        try {
          const rewriteRes = await fetch("/api/rewrite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transcript,
              manhuaName,
              style,
              config: aiConfig,
              chunkIndex: i,
            }),
            signal: controller.signal,
          });

          if (!rewriteRes.ok) {
            const err = await rewriteRes.json();
            throw new Error(err.error || "Failed to rewrite chunk");
          }

          const { chunk } = await rewriteRes.json();

          // Track usage per chunk
          const chunkInputEst = estimateTokens(chunk.original || "");
          const chunkOutputEst = estimateTokens(chunk.rewritten || "");
          addTextUsage(aiConfig.model, chunkInputEst, chunkOutputEst);
          logAI("script", `Rewrite chunk ${i+1} done (${chunkOutputEst} tokens)`, aiConfig.provider, aiConfig.model, chunkInputEst, chunkOutputEst);

          setProgress((prev) => ({
            ...prev,
            results: prev.results.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    rewritten: chunk.rewritten,
                    status: "done" as const,
                  }
                : r
            ),
          }));
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") break;
          const message =
            err instanceof Error ? err.message : "Unknown error";
          setProgress((prev) => ({
            ...prev,
            results: prev.results.map((r, idx) =>
              idx === i
                ? { ...r, status: "error" as const, error: message }
                : r
            ),
          }));
        }
      }

      if (!controller.signal.aborted) {
        setProgress((prev) => ({ ...prev, status: "done" }));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Unknown error";
      setProgress((prev) => ({
        ...prev,
        status: "error",
        error: message,
      }));
    } finally {
      setAbortController(null);
    }
  }, [transcript, manhuaName, style, aiConfig]);

  // ── GENERATE (no transcript) ──
  const handleGenerate = useCallback(async () => {
    if (!manhuaName.trim() || !aiConfig.apiKey.trim()) return;

    setGenerateStatus("generating");
    setGenerateError("");
    setGeneratedScript("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manhuaName,
          style,
          config: aiConfig,
          durationMinutes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate script");
      }

      const data = await res.json();
      setGeneratedScript(data.script);
      setGenerateStatus("done");

      // Track usage
      const inputEst = estimateTokens(manhuaName + style);
      const outputEst = estimateTokens(data.script);
      addTextUsage(aiConfig.model, inputEst, outputEst);
      logAI("script", `Script generated (${outputEst} tokens)`, aiConfig.provider, aiConfig.model, inputEst, outputEst);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setGenerateError(message);
      setGenerateStatus("error");
    }
  }, [aiConfig, manhuaName, style]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manhwa-script-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Button logic
  const canRewrite =
    hasTranscript && aiConfig.apiKey.trim().length > 0 && !isBusy;
  const canGenerate =
    !hasTranscript &&
    manhuaName.trim().length > 0 &&
    aiConfig.apiKey.trim().length > 0 &&
    !isBusy;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <div className="rounded-2xl glass-card p-5 sticky top-24">
              <AIProviderSelector
                config={aiConfig}
                onChange={setAIConfig}
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-2xl glass-card p-5">
              <TranscriptInput
                transcript={transcript}
                onChange={setTranscript}
                manhuaName={manhuaName}
                onManhuaNameChange={setManhuaName}
                style={style}
                onStyleChange={setStyle}
                disabled={isBusy}
              />
            </div>

            {/* Info box based on mode */}
            <div className="mt-3 px-1">
              {hasTranscript ? (
                <p className="text-xs text-primary flex items-center gap-1.5">
                  <Wand2 className="w-3 h-3" />
                  Script detected — will <strong>rewrite</strong> your transcript into original content
                </p>
              ) : (
                <p className="text-xs text-pink-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  No script pasted — will <strong>generate from scratch</strong> using the manhwa name
                </p>
              )}
            </div>

            {/* Duration selector — only for generate mode */}
            {!hasTranscript && (
              <div className="mt-4 rounded-2xl glass-card p-4">
                <label className="block text-xs text-muted mb-1.5">
                  Video Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  disabled={isBusy}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.words})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Action Button — changes based on whether transcript exists */}
        <div className="flex justify-center mb-8">
          {isProcessing ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-danger/20 text-danger hover:bg-danger/30 border border-danger/30 transition-all text-sm font-semibold"
            >
              <StopCircle className="w-5 h-5" />
              Stop Processing
            </button>
          ) : hasTranscript ? (
            <button
              onClick={handleRewrite}
              disabled={!canRewrite}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-all text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary/25 disabled:shadow-none"
            >
              <Wand2 className="w-5 h-5" />
              Rewrite Script
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:opacity-90 transition-all text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-pink-500/25 disabled:shadow-none"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Script from Scratch
                </>
              )}
            </button>
          )}
        </div>

        {/* Validations */}
        {!hasTranscript && !manhuaName.trim() && (
          <div className="flex items-center gap-2 justify-center mb-6 text-sm text-amber-400">
            <AlertCircle className="w-4 h-4" />
            Enter the manhwa/manga name to get started
          </div>
        )}

        {/* ── REWRITE RESULTS (when transcript was provided) ── */}
        {progress.status === "error" && progress.error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-danger">Error</p>
              <p className="text-sm text-danger/80 mt-1">{progress.error}</p>
            </div>
          </div>
        )}

        {progress.results.length > 0 && (
          <div className="space-y-6">
            <ProgressTracker
              results={progress.results}
              currentChunk={progress.currentChunk}
            />
            <OutputSection results={progress.results} />
          </div>
        )}

        {/* ── GENERATE RESULTS (when no transcript) ── */}
        {generateStatus === "error" && generateError && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-danger">Error</p>
              <p className="text-sm text-danger/80 mt-1">{generateError}</p>
            </div>
          </div>
        )}

        {generatedScript && (
          <div className="rounded-2xl glass-card border border-success/20 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Generated Script
                  </h3>
                  <p className="text-xs text-muted">
                    {generatedScript
                      .split(/\s+/)
                      .filter((w) => w.length > 0)
                      .length.toLocaleString()}{" "}
                    words
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("manhuascript_pending_audio", generatedScript);
                    router.push("/audio");
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors text-sm font-medium"
                >
                  <Volume2 className="w-4 h-4" /> Generate Audio
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="max-h-[600px] overflow-y-auto p-4 rounded-xl bg-background border border-card-border text-sm leading-relaxed whitespace-pre-wrap">
                {generatedScript}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {progress.status === "idle" &&
          progress.results.length === 0 &&
          !generatedScript &&
          generateStatus === "idle" && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-card border border-card-border flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-7 h-7 text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Two ways to create your script
              </h3>
              <p className="text-sm text-muted max-w-lg mx-auto">
                <strong className="text-foreground">Option 1:</strong> Enter the
                manhwa name and click &quot;I have a script to paste&quot; to
                rewrite an existing transcript.
                <br />
                <strong className="text-foreground">Option 2:</strong> Just enter
                the manhwa name — the AI will generate a full script from
                scratch.
              </p>
            </div>
          )}
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-muted">
          Shadow Senpai Studio — Your scripts stay private.
        </p>
      </footer>
    </div>
  );
}
