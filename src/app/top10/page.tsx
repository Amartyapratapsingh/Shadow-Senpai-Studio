"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import AIProviderSelector from "@/components/AIProviderSelector";
import { AIConfig } from "@/lib/types";
import { STYLE_OPTIONS } from "@/lib/prompts";
import { DURATION_OPTIONS } from "@/lib/duration";
import { CATEGORY_GROUPS, Category } from "@/lib/top10-categories";
import { addTextUsage, estimateTokens } from "@/lib/usage";
import {
  ListOrdered,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Download,
  ArrowLeft,
  Sparkles,
  Swords,
  Theater,
  Skull,
  Layers,
  Users,
  BookOpen,
  Pencil,
  Megaphone,
  ClipboardList,
  Volume2,
} from "lucide-react";
import Link from "next/link";

const GROUP_ICONS: Record<string, React.ReactNode> = {
  swords: <Swords className="w-4 h-4" />,
  drama: <Theater className="w-4 h-4" />,
  skull: <Skull className="w-4 h-4" />,
  layers: <Layers className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  book: <BookOpen className="w-4 h-4" />,
};

export default function Top10Page() {
  const router = useRouter();

  const [aiConfig, setAIConfig] = useState<AIConfig>({
    provider: "openai",
    apiKey: "",
    model: "gpt-4o",
  });

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [customTopic, setCustomTopic] = useState("");
  const [inputMode, setInputMode] = useState<"category" | "custom" | "mylist">(
    "custom"
  );
  const [style, setStyle] = useState("engaging-and-dramatic");
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [customCTA, setCustomCTA] = useState("");
  const [myList, setMyList] = useState("");
  const [myListTopic, setMyListTopic] = useState("");
  const [script, setScript] = useState("");
  const [status, setStatus] = useState<
    "idle" | "generating" | "done" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!aiConfig.apiKey.trim()) return;
    if (inputMode === "category" && !selectedCategory) return;
    if (inputMode === "custom" && !customTopic.trim()) return;
    if (inputMode === "mylist" && (!myList.trim() || !myListTopic.trim()))
      return;

    setStatus("generating");
    setError("");
    setScript("");

    let categoryPrompt = "";
    let customTopicValue: string | undefined;

    if (inputMode === "category") {
      categoryPrompt = selectedCategory?.prompt || "";
    } else if (inputMode === "custom") {
      customTopicValue = customTopic;
    } else if (inputMode === "mylist") {
      customTopicValue = `${myListTopic}\n\nIMPORTANT: The creator has provided their own specific list. You MUST use EXACTLY these entries in this EXACT order. Do NOT replace or change any of them. Write the script around these entries:\n\n${myList}`;
    }

    try {
      const res = await fetch("/api/top10", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryPrompt,
          customTopic: customTopicValue,
          style,
          config: aiConfig,
          customCTA: customCTA.trim() || undefined,
          durationMinutes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate script");
      }

      const data = await res.json();
      setScript(data.script);
      setStatus("done");

      // Track usage
      const inputEst = estimateTokens(
        (customTopicValue || categoryPrompt) + style + (customCTA || "")
      );
      const outputEst = estimateTokens(data.script);
      addTextUsage(aiConfig.model, inputEst, outputEst);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStatus("error");
    }
  }, [
    aiConfig,
    selectedCategory,
    customTopic,
    inputMode,
    style,
    customCTA,
    myList,
    myListTopic,
  ]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `top10-script-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canGenerate =
    aiConfig.apiKey.trim().length > 0 &&
    ((inputMode === "category" && selectedCategory !== null) ||
      (inputMode === "custom" && customTopic.trim().length > 0) ||
      (inputMode === "mylist" &&
        myList.trim().length > 0 &&
        myListTopic.trim().length > 0)) &&
    status !== "generating";

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

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
              <ListOrdered className="w-5 h-5 text-white" />
            </div>
            Top 10 Anime Script Generator
          </h1>
          <p className="text-sm text-muted mt-2">
            Write your topic, pick a category, or give your own list — get a
            full YouTube-ready voiceover script.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left: AI Config only */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl glass-card p-5 sticky top-24">
              <AIProviderSelector config={aiConfig} onChange={setAIConfig} />
            </div>
          </div>

          {/* Right: Topic + Options */}
          <div className="lg:col-span-2 space-y-4">
            {/* Topic Selection Card */}
            <div className="rounded-2xl glass-card p-5">
              {/* Toggle Tabs */}
              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  onClick={() => setInputMode("custom")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    inputMode === "custom"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-card border border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                  Custom Topic
                </button>
                <button
                  onClick={() => setInputMode("category")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    inputMode === "category"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-card border border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  Pick a Category
                </button>
                <button
                  onClick={() => setInputMode("mylist")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    inputMode === "mylist"
                      ? "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                      : "bg-card border border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  My Own List
                </button>
              </div>

              {inputMode === "custom" ? (
                <div className="space-y-3">
                  <label className="block text-xs text-muted">
                    Write your own topic
                  </label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder='e.g., "Top 10 Anime Where MC Hides His Power" or "Top 15 Best Isekai of 2024"'
                    disabled={status === "generating"}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-card-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
                  />
                  <p className="text-xs text-muted/60">
                    You can type any anime/manga/manhwa list topic. Not limited
                    to Top 10 — you can do Top 5, Top 15, Top 20, etc.
                  </p>
                </div>
              ) : inputMode === "mylist" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-muted mb-1.5">
                      Video Title / Topic *
                    </label>
                    <input
                      type="text"
                      value={myListTopic}
                      onChange={(e) => setMyListTopic(e.target.value)}
                      placeholder='e.g., "Top 10 Overpowered MC Anime" or "Top 5 Underrated Isekai"'
                      disabled={status === "generating"}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-card-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">
                      Your List (one per line) *
                    </label>
                    <textarea
                      value={myList}
                      onChange={(e) => setMyList(e.target.value)}
                      disabled={status === "generating"}
                      placeholder={`#10 - Mob Psycho 100\n#9 - The Irregular at Magic High School\n#8 - Overlord\n#7 - That Time I Got Reincarnated as a Slime\n#6 - Sword Art Online\n#5 - Classroom of the Elite\n#4 - One Punch Man\n#3 - Dragon Ball Super\n#2 - Naruto Shippuden\n#1 - Solo Leveling`}
                      rows={10}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-card-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-y disabled:opacity-50 font-mono leading-relaxed"
                    />
                    <p className="text-xs text-muted/60 mt-1.5">
                      The AI will use <strong>exactly your picks</strong> in
                      your order and write a detailed script around them.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
                  {CATEGORY_GROUPS.map((group) => (
                    <div key={group.name}>
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-card py-1 z-10">
                        <span className="text-primary">
                          {GROUP_ICONS[group.icon]}
                        </span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                          {group.name}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat)}
                            disabled={status === "generating"}
                            className={`text-left px-3 py-2.5 rounded-lg border transition-all duration-200 text-sm disabled:opacity-50 ${
                              selectedCategory?.id === cat.id
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-transparent hover:border-card-border hover:bg-white/5 text-muted hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {selectedCategory?.id === cat.id && (
                                <Sparkles className="w-3 h-3 text-primary shrink-0" />
                              )}
                              <span className="leading-snug">{cat.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Duration + Narration Style + CTA — below the topic area */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Video Duration */}
              <div className="rounded-2xl glass-card p-4">
                <label className="block text-xs text-muted mb-1.5">
                  Video Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  disabled={status === "generating"}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.words})
                    </option>
                  ))}
                </select>
              </div>

              {/* Narration Style */}
              <div className="rounded-2xl glass-card p-4">
                <label className="block text-xs text-muted mb-1.5">
                  Narration Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  disabled={status === "generating"}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  {STYLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom CTA */}
              <div className="rounded-2xl glass-card p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-pink-400" />
                  <label className="text-xs text-muted">
                    Shoutout / CTA
                  </label>
                  <span className="text-[10px] text-muted/60">(Optional)</span>
                </div>
                <textarea
                  value={customCTA}
                  onChange={(e) => setCustomCTA(e.target.value)}
                  disabled={status === "generating"}
                  placeholder={`e.g., Join my Discord`}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:opacity-90 transition-all text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-pink-500/25 disabled:shadow-none"
          >
            {status === "generating" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Script...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Script
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {status === "error" && error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-danger">Error</p>
              <p className="text-sm text-danger/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Generated Script Output */}
        {script && (
          <div className="rounded-2xl glass-card border border-success/20 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                  <ListOrdered className="w-4 h-4 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Generated Script
                  </h3>
                  <p className="text-xs text-muted">
                    {script
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
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
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
                  onClick={() => {
                    localStorage.setItem("manhuascript_pending_audio", script);
                    router.push("/audio");
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors text-sm font-medium"
                >
                  <Volume2 className="w-4 h-4" />
                  Generate Audio
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="max-h-[600px] overflow-y-auto p-4 rounded-xl bg-background border border-card-border text-sm leading-relaxed whitespace-pre-wrap">
                {script}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {status === "idle" && !script && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-card border border-card-border flex items-center justify-center mx-auto mb-4">
              <ListOrdered className="w-7 h-7 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Type your topic and generate
            </h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              Write a custom topic, pick from 30+ categories, or give your own
              list. The AI will generate a complete voiceover-ready script.
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
