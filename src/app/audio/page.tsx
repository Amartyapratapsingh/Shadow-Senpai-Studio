"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import {
  AudioProvider,
  OPENAI_VOICES,
  GEMINI_VOICES,
} from "@/lib/audio-utils";
import { getApiKey } from "@/lib/api-keys";
import { addTTSUsage, loadDefaultVoice, saveDefaultVoice } from "@/lib/usage";
import { logAI, logError } from "@/lib/logger";
import {
  ArrowLeft,
  Volume2,
  Loader2,
  AlertCircle,
  Download,
  Play,
  Pause,
  Trash2,
  Clipboard,
  Mic,
  Save,
  X,
  BookmarkCheck,
} from "lucide-react";
import Link from "next/link";

// ── Provider persistence ──
const AUDIO_PROVIDER_KEY = "manhuascript_audio_provider";

function loadSavedProvider(): AudioProvider {
  if (typeof window === "undefined") return "openai";
  return (localStorage.getItem(AUDIO_PROVIDER_KEY) as AudioProvider) || "openai";
}
function saveProvider(p: AudioProvider) {
  if (typeof window !== "undefined") localStorage.setItem(AUDIO_PROVIDER_KEY, p);
}

// ── Voice Presets (save provider + voice config, NOT audio) ──
const VOICE_PRESETS_KEY = "manhuascript_voice_presets";

interface VoicePreset {
  label: string;
  provider: AudioProvider;
  voice: string;
}

type VoicePresets = [VoicePreset | null, VoicePreset | null, VoicePreset | null];

function loadVoicePresets(): VoicePresets {
  if (typeof window === "undefined") return [null, null, null];
  try {
    const raw = localStorage.getItem(VOICE_PRESETS_KEY);
    if (!raw) return [null, null, null];
    const parsed = JSON.parse(raw);
    return [parsed[0] || null, parsed[1] || null, parsed[2] || null];
  } catch {
    return [null, null, null];
  }
}

function persistVoicePresets(presets: VoicePresets) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_PRESETS_KEY, JSON.stringify(presets));
}

// ══════════════════════════════════════
export default function AudioPage() {
  const [script, setScript] = useState("");
  const [audioProvider, setAudioProvider] = useState<AudioProvider>("openai");
  const [selectedVoice, setSelectedVoice] = useState("cedar");
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice presets
  const [voicePresets, setVoicePresets] = useState<VoicePresets>([null, null, null]);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [presetLabel, setPresetLabel] = useState("");

  // Load saved defaults on mount
  useEffect(() => {
    const savedProvider = loadSavedProvider();
    setAudioProvider(savedProvider);
    const savedVoice = loadDefaultVoice();
    const voices = savedProvider === "gemini" ? GEMINI_VOICES : OPENAI_VOICES;
    if (voices.some((v) => v.value === savedVoice)) {
      setSelectedVoice(savedVoice);
    } else {
      setSelectedVoice(voices[0].value);
    }
    setVoicePresets(loadVoicePresets());
  }, []);

  useEffect(() => {
    const pending = localStorage.getItem("manhuascript_pending_audio");
    if (pending) {
      setScript(pending);
      localStorage.removeItem("manhuascript_pending_audio");
    }
  }, []);

  const handleProviderChange = (p: AudioProvider) => {
    setAudioProvider(p);
    saveProvider(p);
    const voices = p === "gemini" ? GEMINI_VOICES : OPENAI_VOICES;
    const savedVoice = loadDefaultVoice();
    if (voices.some((v) => v.value === savedVoice)) {
      setSelectedVoice(savedVoice);
    } else {
      setSelectedVoice(voices[0].value);
      saveDefaultVoice(voices[0].value);
    }
  };

  const handleVoiceSelect = (voice: string) => {
    setSelectedVoice(voice);
    saveDefaultVoice(voice);
  };

  const handlePaste = async () => {
    try { const text = await navigator.clipboard.readText(); setScript(text); } catch {}
  };

  const handleGenerate = async () => {
    if (!script.trim()) return;
    const apiKey = getApiKey(audioProvider === "gemini" ? "gemini" : "openai");
    if (!apiKey) {
      setError(`${audioProvider === "gemini" ? "Gemini" : "OpenAI"} API key is required. Add it in Settings.`);
      setStatus("error");
      return;
    }
    setStatus("generating");
    setError("");
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }

    try {
      const res = await fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, voice: selectedVoice, provider: audioProvider, apiKey }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Audio generation failed");
      }
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
      setStatus("done");
      addTTSUsage(script.length);
      logAI("audio", `Audio generated (${(blob.size/1024).toFixed(0)}KB, ${wordCount} words)`, audioProvider, selectedVoice);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setStatus("error");
      logError("audio", "Audio generation failed", msg, audioProvider, selectedVoice);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const ext = audioProvider === "gemini" ? "wav" : "mp3";
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `shadow-senpai-audio-${Date.now()}.${ext}`;
    a.click();
  };

  // ── Preset handlers ──
  const handleSavePreset = (slot: number) => {
    const preset: VoicePreset = {
      label: presetLabel.trim(),
      provider: audioProvider,
      voice: selectedVoice,
    };
    const updated: VoicePresets = [...voicePresets];
    updated[slot] = preset;
    setVoicePresets(updated);
    persistVoicePresets(updated);
    setSavingSlot(null);
    setPresetLabel("");
  };

  const handleLoadPreset = (slot: number) => {
    const preset = voicePresets[slot];
    if (!preset) return;
    setAudioProvider(preset.provider);
    saveProvider(preset.provider);
    setSelectedVoice(preset.voice);
    saveDefaultVoice(preset.voice);
  };

  const handleDeletePreset = (slot: number) => {
    const updated: VoicePresets = [...voicePresets];
    updated[slot] = null;
    setVoicePresets(updated);
    persistVoicePresets(updated);
  };

  const voices = audioProvider === "gemini" ? GEMINI_VOICES : OPENAI_VOICES;
  const wordCount = script.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const estimatedMinutes = Math.ceil(wordCount / 150);
  const canGenerate = script.trim().length > 0 && status !== "generating";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            AI Audio Generator
          </h1>
          <p className="text-sm text-muted mt-2">
            Choose OpenAI or Gemini TTS, pick a voice, and generate cinematic voiceover.
          </p>
        </div>

        {/* ═══════ VOICE PRESETS ═══════ */}
        <div className="rounded-2xl glass-card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">Voice Presets</h3>
            </div>
            <span className="text-xs text-muted">Click to load, or save your current selection</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((slot) => {
              const preset = voicePresets[slot];
              if (preset) {
                const voiceList = preset.provider === "gemini" ? GEMINI_VOICES : OPENAI_VOICES;
                const voiceName = voiceList.find((v) => v.value === preset.voice)?.label || preset.voice;
                const isActive = audioProvider === preset.provider && selectedVoice === preset.voice;

                return (
                  <div key={slot} className={`rounded-xl border-2 p-3 transition-all ${isActive ? "border-amber-400 bg-amber-400/10" : "border-card-border hover:border-muted"}`}>
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Preset {slot + 1}</span>
                      <button onClick={() => handleDeletePreset(slot)} className="text-muted hover:text-danger transition-colors" title="Delete preset">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Label */}
                    {preset.label && (
                      <p className="text-xs text-foreground/80 mb-1.5 leading-snug line-clamp-2">{preset.label}</p>
                    )}
                    {/* Voice info */}
                    <p className="text-xs text-muted mb-3">
                      {preset.provider === "openai" ? "OpenAI" : "Gemini"} — <span className="text-foreground font-medium">{voiceName}</span>
                    </p>
                    {/* Load button */}
                    <button onClick={() => handleLoadPreset(slot)}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive ? "bg-amber-400/20 text-amber-400" : "bg-white/5 text-muted hover:text-foreground hover:bg-white/10"}`}>
                      {isActive ? "Currently Active" : "Load This Preset"}
                    </button>
                  </div>
                );
              }

              // Empty slot
              return (
                <button key={slot}
                  onClick={() => { setSavingSlot(slot); setPresetLabel(""); }}
                  className="rounded-xl border-2 border-dashed border-card-border p-4 flex flex-col items-center justify-center gap-2 text-muted hover:text-foreground hover:border-muted transition-all min-h-[120px]">
                  <Save className="w-5 h-5" />
                  <span className="text-xs font-medium">Save to Preset {slot + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Save dialog */}
          {savingSlot !== null && (
            <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">
                  Save current voice to Preset {savingSlot + 1}
                </p>
                <button onClick={() => setSavingSlot(null)} className="text-muted hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted mb-2">
                Saving: <span className="text-foreground font-medium">{audioProvider === "openai" ? "OpenAI" : "Gemini"}</span> — <span className="text-foreground font-medium">{voices.find((v) => v.value === selectedVoice)?.label || selectedVoice}</span>
              </p>
              <input
                type="text"
                value={presetLabel}
                onChange={(e) => {
                  const words = e.target.value.split(/\s+/);
                  if (words.length <= 50) setPresetLabel(e.target.value);
                }}
                placeholder="What is this preset for? e.g., For my manhwa explanation videos (optional, max 50 words)"
                className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">
                  {presetLabel.trim() ? presetLabel.trim().split(/\s+/).filter((w) => w).length : 0}/50 words
                </p>
                <button onClick={() => handleSavePreset(savingSlot)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-all">
                  <Save className="w-3.5 h-3.5" /> Save Preset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Provider ── */}
        <div className="flex gap-3 mb-4">
          <button onClick={() => handleProviderChange("openai")} disabled={status === "generating"}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${audioProvider === "openai" ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25" : "bg-card border border-card-border text-muted hover:text-foreground hover:border-muted"}`}>
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold">O</div>
            OpenAI TTS
          </button>
          <button onClick={() => handleProviderChange("gemini")} disabled={status === "generating"}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${audioProvider === "gemini" ? "bg-gradient-to-r from-blue-400 to-indigo-600 text-white shadow-lg shadow-blue-500/25" : "bg-card border border-card-border text-muted hover:text-foreground hover:border-muted"}`}>
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold">G</div>
            Gemini TTS
          </button>
        </div>

        {/* ── Voice Selection ── */}
        <div className="rounded-2xl glass-card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-foreground">
                Voice — {audioProvider === "openai" ? "OpenAI" : "Gemini"}{" "}
                <span className="text-muted font-normal">({voices.length})</span>
              </h3>
            </div>
            <span className="text-xs text-muted">
              Selected: <span className="text-foreground font-semibold">{voices.find((v) => v.value === selectedVoice)?.label || selectedVoice}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
            {voices.map((voice) => (
              <button key={voice.value} onClick={() => handleVoiceSelect(voice.value)} disabled={status === "generating"}
                className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all duration-200 disabled:opacity-50 ${selectedVoice === voice.value ? (audioProvider === "openai" ? "border-green-500 bg-green-500/10" : "border-blue-500 bg-blue-500/10") : "border-transparent hover:border-card-border hover:bg-white/5"}`}>
                <span className="text-sm font-semibold text-foreground">{voice.label}</span>
                <p className="text-[11px] text-muted mt-0.5 leading-snug">{voice.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Script Input ── */}
        <div className="rounded-2xl glass-card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Script</h3>
            <div className="flex items-center gap-2">
              <button onClick={handlePaste} disabled={status === "generating"} className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors disabled:opacity-50">
                <Clipboard className="w-3 h-3" /> Paste
              </button>
              {script && (
                <button onClick={() => setScript("")} disabled={status === "generating"} className="flex items-center gap-1 text-xs text-danger hover:text-red-400 transition-colors disabled:opacity-50">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>
          <textarea value={script} onChange={(e) => setScript(e.target.value)} disabled={status === "generating"}
            placeholder="Paste your script here..." rows={10}
            className="w-full px-4 py-3 rounded-xl bg-background border border-card-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-y disabled:opacity-50 leading-relaxed" />
          {wordCount > 0 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted">{wordCount.toLocaleString()} words</p>
              <p className="text-xs text-muted">~{estimatedMinutes} min audio</p>
            </div>
          )}
        </div>

        {/* ── Generate ── */}
        <div className="flex justify-center mb-8">
          <button onClick={handleGenerate} disabled={!canGenerate}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:opacity-90 transition-all text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 disabled:shadow-none">
            {status === "generating" ? (<><Loader2 className="w-5 h-5 animate-spin" /> Generating Audio...</>) : (<><Volume2 className="w-5 h-5" /> Generate Audio</>)}
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

        {/* ── Audio Player ── */}
        {audioUrl && (
          <div className="rounded-2xl glass-card border border-success/20 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Audio Ready</h3>
                <p className="text-xs text-muted">
                  {audioProvider === "openai" ? "OpenAI" : "Gemini"} — {voices.find((v) => v.value === selectedVoice)?.label || selectedVoice}
                </p>
              </div>
            </div>

            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} />

            <div className="flex items-center gap-4 p-4 rounded-xl bg-background border border-card-border mb-4">
              <button onClick={handlePlayPause} className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 flex items-center justify-center text-white hover:opacity-90 transition-all shrink-0">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Shadow Senpai Voiceover</p>
                <p className="text-xs text-muted">{wordCount.toLocaleString()} words / ~{estimatedMinutes} min</p>
              </div>
              <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-medium">
                <Download className="w-4 h-4" /> {audioProvider === "gemini" ? "WAV" : "MP3"}
              </button>
            </div>

            <audio src={audioUrl} controls className="w-full rounded-lg" style={{ height: "40px" }} />
          </div>
        )}

        {/* Empty State */}
        {status === "idle" && !audioUrl && !script && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-card border border-card-border flex items-center justify-center mx-auto mb-4">
              <Volume2 className="w-7 h-7 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Turn your script into audio</h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              Choose OpenAI or Gemini, pick a voice, and generate cinematic voiceover. Save your favorite voice configs as presets.
            </p>
          </div>
        )}
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-muted">Shadow Senpai Studio — Audio powered by OpenAI & Gemini TTS.</p>
      </footer>
    </div>
  );
}
