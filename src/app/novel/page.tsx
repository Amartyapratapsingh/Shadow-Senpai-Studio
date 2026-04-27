"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import { STYLE_OPTIONS } from "@/lib/prompts";
import { NOVEL_GENRES, NovelGenre } from "@/lib/novel-genres";
import { addTextUsage, addTTSUsage, estimateTokens, loadDefaultVoice } from "@/lib/usage";
import { getApiKey } from "@/lib/api-keys";
import { AudioProvider } from "@/lib/audio-utils";
import { roughSplitIntoChunks, fallbackSplitIntoScenes } from "@/lib/scene-splitter";
import { logAI, logError, logCost, logInfo } from "@/lib/logger";
import {
  ArrowLeft, Film, Sparkles, Loader2, AlertCircle, Image as ImageIcon,
  Volume2, FileText, Check, ChevronDown, ChevronUp, Download, Pencil,
  Cpu, KeyRound, Play, Pause, Mic,
} from "lucide-react";
import Link from "next/link";

// ── Types ──
interface Panel {
  panel: number;
  narration: string;
  imagePrompt: string;
  imageUrl?: string;
  imageStatus: "pending" | "generating" | "done" | "error";
  imageError?: string;
  audioUrl?: string;
  audioStatus: "pending" | "generating" | "done" | "error";
}

interface VoicePreset { label: string; provider: AudioProvider; voice: string; }

type StepStatus = "pending" | "running" | "done" | "error";

// ── Pipeline state saved to localStorage ──
const PIPELINE_KEY = "ss_novel_pipeline";

interface SavedPipeline {
  novelName: string;
  style: string;
  script: string;
  scriptStatus: StepStatus;
  audioStatus: StepStatus;
  audioBase64: string | null; // Not used anymore but kept for type compat
  audioMime: string;
  panelStatus: StepStatus;
  panels: Panel[];
  imageStatus: "pending" | "running" | "done";
  voiceInfo: { provider: string; voice: string; presetLabel: string | null };
}

function savePipeline(state: SavedPipeline) {
  try {
    // Strip heavy data before saving to prevent memory crash
    const light = {
      ...state,
      audioBase64: null, // Never save audio — too large
      panels: state.panels.map(p => ({
        ...p,
        imageUrl: undefined, // Don't save image data URLs — too large (each is 100KB-1MB)
        // Keep imageStatus so we know which ones need regenerating
      })),
    };
    localStorage.setItem(PIPELINE_KEY, JSON.stringify(light));
  } catch (e) {
    // localStorage full — try saving without script text
    try {
      const minimal = {
        ...state,
        audioBase64: null,
        script: state.script.slice(0, 5000) + "\n\n[TRUNCATED — full script was too large for storage]",
        panels: state.panels.map(p => ({
          panel: p.panel,
          narration: p.narration.slice(0, 200),
          imagePrompt: p.imagePrompt,
          imageStatus: p.imageStatus,
        })),
      };
      localStorage.setItem(PIPELINE_KEY, JSON.stringify(minimal));
    } catch { /* storage completely full — nothing we can do */ }
  }
}
function loadPipeline(): SavedPipeline | null {
  try {
    const raw = localStorage.getItem(PIPELINE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearPipeline() { localStorage.removeItem(PIPELINE_KEY); }

// ── Text AI models (for script + scene splitting) ──
const TEXT_MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic", tier: "recommended" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", provider: "anthropic", tier: "best" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "anthropic", tier: "fast" },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai", tier: "recommended" },
  { id: "gpt-5.4", label: "GPT-5.4", provider: "openai", tier: "best" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai", tier: "fast" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini", tier: "recommended" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini", tier: "best" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "gemini", tier: "fast" },
];

// ── Image generation models ──
const IMAGE_MODELS = [
  // OpenAI
  { id: "gpt-image-1.5", label: "ChatGPT Images 2.0 (Newest)", provider: "openai" },
  { id: "gpt-image-1", label: "GPT Image 1", provider: "openai" },
  { id: "gpt-image-1-mini", label: "GPT Image 1 Mini (Fast)", provider: "openai" },
  // Gemini
  { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image (Best, 4K)", provider: "gemini" },
  { id: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image", provider: "gemini" },
  { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (Fast)", provider: "gemini" },
];

function getScriptConfig(selectedModel?: string) {
  if (selectedModel) {
    const model = TEXT_MODELS.find(m => m.id === selectedModel);
    if (model) {
      const key = getApiKey(model.provider as "openai" | "anthropic" | "gemini");
      if (key) return { provider: model.provider, model: model.id, apiKey: key };
    }
  }
  // Auto fallback
  const ck = getApiKey("anthropic");
  if (ck) return { provider: "anthropic", model: "claude-sonnet-4-6", apiKey: ck };
  const ok = getApiKey("openai");
  if (ok) return { provider: "openai", model: "gpt-4.1", apiKey: ok };
  const gk = getApiKey("gemini");
  if (gk) return { provider: "gemini", model: "gemini-2.5-flash", apiKey: gk };
  return null;
}
function getImageConfig(selectedModel?: string) {
  if (selectedModel) {
    const model = IMAGE_MODELS.find(m => m.id === selectedModel);
    if (model) {
      const key = getApiKey(model.provider as "openai" | "gemini");
      if (key) return { provider: model.provider, model: model.id, apiKey: key };
    }
  }
  const gk = getApiKey("gemini");
  if (gk) return { provider: "gemini", model: "gemini-2.5-flash-image", apiKey: gk };
  const ok = getApiKey("openai");
  if (ok) return { provider: "openai", model: "gpt-image-1", apiKey: ok };
  return null;
}
function getImageApiKey(imgModel?: string) {
  if (imgModel) {
    const m = IMAGE_MODELS.find(x => x.id === imgModel);
    if (m) { const k = getApiKey(m.provider as "openai" | "gemini"); if (k) return k; }
  }
  return getApiKey("gemini") || getApiKey("openai") || null;
}
function getImageProvider(imgModel?: string): "openai" | "gemini" {
  if (imgModel) { const m = IMAGE_MODELS.find(x => x.id === imgModel); if (m) return m.provider as "openai" | "gemini"; }
  return getApiKey("gemini") ? "gemini" : "openai";
}

function loadVoicePresets(): [VoicePreset | null, VoicePreset | null, VoicePreset | null] {
  try { const raw = localStorage.getItem("manhuascript_voice_presets"); if (!raw) return [null,null,null]; const p = JSON.parse(raw); return [p[0]||null,p[1]||null,p[2]||null]; } catch { return [null,null,null]; }
}
function getAutoVoice(): { provider: AudioProvider; voice: string; presetLabel: string | null } {
  const presets = loadVoicePresets();
  const fp = presets.find((p) => p !== null);
  if (fp) { const k = getApiKey(fp.provider === "gemini" ? "gemini" : "openai"); if (k) return { provider: fp.provider, voice: fp.voice, presetLabel: fp.label }; }
  const sv = loadDefaultVoice();
  const sp = (typeof window !== "undefined" ? localStorage.getItem("manhuascript_audio_provider") : null) as AudioProvider | null;
  if (sp && sv) { const k = getApiKey(sp === "gemini" ? "gemini" : "openai"); if (k) return { provider: sp, voice: sv, presetLabel: null }; }
  if (getApiKey("openai")) return { provider: "openai", voice: "cedar", presetLabel: null };
  if (getApiKey("gemini")) return { provider: "gemini", voice: "Kore", presetLabel: null };
  return { provider: "openai", voice: "cedar", presetLabel: null };
}

// blobToBase64 removed — storing audio/images in localStorage crashes the browser

// ══════════════════════════════════
export default function NovelPage() {
  const [novelName, setNovelName] = useState("");
  const [userScript, setUserScript] = useState("");
  const [hasScript, setHasScript] = useState(false);
  const [style, setStyle] = useState("engaging-and-dramatic");
  const [selectedGenre, setSelectedGenre] = useState<NovelGenre>(NOVEL_GENRES[0]);
  const [customGenreText, setCustomGenreText] = useState("");
  const [selectedTextModel, setSelectedTextModel] = useState("claude-sonnet-4-6");
  const [selectedImageModel, setSelectedImageModel] = useState("gpt-image-1.5");
  const [selectedAudioProvider, setSelectedAudioProvider] = useState<"openai" | "gemini">("openai");
  const [selectedAudioVoice, setSelectedAudioVoice] = useState("cedar");
  const [primaryLanguage, setPrimaryLanguage] = useState<"english" | "hindi">("english");

  // Second language version (Hindi if primary is English, English if primary is Hindi)
  const [secondLangPanels, setSecondLangPanels] = useState<Panel[]>([]);
  const [secondLangStatus, setSecondLangStatus] = useState<"idle" | "running" | "done">("idle");
  const [secondLangProgress, setSecondLangProgress] = useState(0);
  const [expandedSecondPanel, setExpandedSecondPanel] = useState<number | null>(null);

  const [phase, setPhase] = useState<"input" | "running" | "paused" | "done">("input");
  const [savedPipelineData, setSavedPipelineData] = useState<SavedPipeline | null>(null);
  const [error, setError] = useState("");

  const [script, setScript] = useState("");
  const [scriptStatus, setScriptStatus] = useState<StepStatus>("pending");

  const [audioStatus, setAudioStatus] = useState<StepStatus>("pending");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [voiceInfo, setVoiceInfo] = useState<{ provider: string; voice: string; presetLabel: string | null }>({ provider: "openai", voice: "cedar", presetLabel: null });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track individual audio chunks — persist in memory so we can retry only failed ones
  const audioBlobsRef = useRef<(Blob | null)[]>([]);
  const audioChunksRef = useRef<string[]>([]);
  // Character sheet — persists so retries use the same character descriptions
  const characterRefStore = useRef<string>("");

  const [panelStatus, setPanelStatus] = useState<StepStatus>("pending");
  const [panels, setPanels] = useState<Panel[]>([]);
  const [imagesGenerated, setImagesGenerated] = useState(0);
  const [imageStatus, setImageStatus] = useState<"pending" | "running" | "done">("pending");
  const [expandedPanel, setExpandedPanel] = useState<number | null>(null);

  const [hasKeys, setHasKeys] = useState({ openai: false, anthropic: false, gemini: false });
  const pipelineRunning = useRef(false);

  useEffect(() => {
    setHasKeys({ openai: !!getApiKey("openai"), anthropic: !!getApiKey("anthropic"), gemini: !!getApiKey("gemini") });
    setVoiceInfo(getAutoVoice());

    // Restore saved pipeline if exists
    const saved = loadPipeline();
    if (saved && (saved.scriptStatus === "done" || saved.panelStatus === "done")) {
      setNovelName(saved.novelName);
      setStyle(saved.style);
      setScript(saved.script);
      setScriptStatus(saved.scriptStatus);
      setAudioStatus(saved.audioStatus);
      setPanelStatus(saved.panelStatus);
      setPanels(saved.panels);
      setImageStatus(saved.imageStatus);
      setVoiceInfo(saved.voiceInfo);
      setImagesGenerated(saved.panels.filter(p => p.imageStatus === "done" || p.imageStatus === "error").length);

      // Audio is NOT stored in localStorage (too large — crashes browser)
      // User can click "Retry Audio" to regenerate it

      // Check if there's remaining work
      const needsPanels = saved.panelStatus !== "done" && saved.panelStatus !== "error";
      const needsAudio = saved.audioStatus !== "done" && saved.audioStatus !== "error";
      const needsImages = saved.panels.some(p => p.imageStatus === "pending" || p.imageStatus === "generating");

      if (needsPanels || needsAudio || needsImages) {
        // Show paused state with Continue button — don't auto-resume
        setSavedPipelineData(saved);
        setPhase("paused");
      } else {
        setPhase("done");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist state helper ──
  const persistState = useCallback((overrides: Partial<SavedPipeline> = {}) => {
    // We need to read current state via refs/params since setState is async
  }, []);

  // ── Save current state to localStorage ──
  function saveCurrentState(
    s: string, ss: StepStatus, as2: StepStatus, ab64: string | null,
    ps: StepStatus, pnls: Panel[], is2: "pending"|"running"|"done",
    vi: { provider: string; voice: string; presetLabel: string | null }
  ) {
    savePipeline({
      novelName, style, script: s, scriptStatus: ss,
      audioStatus: as2, audioBase64: ab64, audioMime: "audio/mpeg",
      panelStatus: ps, panels: pnls, imageStatus: is2, voiceInfo: vi,
    });
  }

  // ── Resume incomplete pipeline (Panels → Audio → Images) ──
  const resumePipeline = useCallback(async (saved: SavedPipeline) => {
    if (pipelineRunning.current) return;
    pipelineRunning.current = true;

    const voice = getAutoVoice();

    // ── Step 2: Resume panels if needed (hybrid approach) ──
    if (saved.panelStatus !== "done" && saved.panelStatus !== "error") {
      const config = getScriptConfig(selectedTextModel);
      if (config) {
        setPanelStatus("running");
        try {
          const chunks = roughSplitIntoChunks(saved.script, 1000);
          const allPanels: Panel[] = [];
          for (let c = 0; c < chunks.length; c++) {
            try {
              const res = await fetch("/api/novel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "smart-scene-break", config, script: chunks[c], chunkIndex: c+1, totalChunks: chunks.length }) });
              if (res.ok) {
                const data = await res.json();
                if (data.scenes) for (const s of data.scenes) { allPanels.push({ panel: allPanels.length+1, narration: s.narration||"", imagePrompt: `Anime art style, 16:9 cinematic widescreen illustration. ${s.imageDescription||""}`, imageStatus: "pending", audioStatus: "pending" }); }
              } else {
                const fb = fallbackSplitIntoScenes(chunks[c], 70);
                for (const f of fb) allPanels.push({ panel: allPanels.length+1, narration: f.narration, imagePrompt: "Anime art style, 16:9 cinematic widescreen illustration.", imageStatus: "pending", audioStatus: "pending" });
              }
            } catch { const fb = fallbackSplitIntoScenes(chunks[c], 70); for (const f of fb) allPanels.push({ panel: allPanels.length+1, narration: f.narration, imagePrompt: "Anime art style, 16:9 cinematic widescreen illustration.", imageStatus: "pending", audioStatus: "pending" }); }
            setPanels([...allPanels]);
          }
          saved.panels = allPanels; saved.panelStatus = "done"; setPanelStatus("done"); savePipeline(saved);
        } catch { setPanelStatus("error"); saved.panelStatus = "error"; savePipeline(saved); }
      }
    }

    // ── Step 3: Resume audio if needed (sentence-based chunking) ──
    if (saved.audioStatus !== "done" && saved.audioStatus !== "error") {
      const audioKey = getApiKey(voice.provider === "gemini" ? "gemini" : "openai");
      if (audioKey) {
        setAudioStatus("running");
        try {
          const audioChunks = roughSplitIntoChunks(saved.script, 1000);
          const blobs: Blob[] = [];
          for (let i = 0; i < audioChunks.length; i++) {
            try {
              const res = await fetch("/api/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script: audioChunks[i], voice: voice.voice, provider: voice.provider, apiKey: audioKey }) });
              if (res.ok) blobs.push(await res.blob());
              else console.error(`Audio resume chunk ${i+1} failed`);
            } catch { console.error(`Audio resume chunk ${i+1} error`); }
          }
          if (blobs.length > 0) {
            const mergedBlob = new Blob(blobs, { type: blobs[0].type || "audio/mpeg" });
            setAudioUrl(URL.createObjectURL(mergedBlob));
            setAudioStatus("done"); saved.audioStatus = "done"; savePipeline(saved);
            addTTSUsage(saved.script.length);
          } else { setAudioStatus("error"); saved.audioStatus = "error"; savePipeline(saved); }
        } catch { setAudioStatus("error"); saved.audioStatus = "error"; savePipeline(saved); }
      }
    }

    // ── Step 4: Resume images (only pending/errored ones) ──
    const pendingPanels = saved.panels.map((p, i) => ({ ...p, idx: i })).filter(p => p.imageStatus === "pending" || p.imageStatus === "generating" || p.imageStatus === "error");
    if (pendingPanels.length > 0) {
      const imgKey = getImageApiKey(selectedImageModel); const imgProvider = getImageProvider(selectedImageModel);
      if (imgKey) {
        setImageStatus("running");
        for (const pp of pendingPanels) {
          setPanels(prev => prev.map((p, i) => i === pp.idx ? { ...p, imageStatus: "generating" as const } : p));
          try {
            const res = await fetch("/api/novel/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: pp.imagePrompt, provider: imgProvider, apiKey: imgKey, model: selectedImageModel }) });
            if (res.ok) { const data = await res.json(); setPanels(prev => { const u = prev.map((p, i) => i === pp.idx ? { ...p, imageUrl: data.imageUrl, imageStatus: "done" as const, imageError: undefined } : p); saved.panels = u; savePipeline(saved); return u; }); }
            else { const e = await res.json().catch(() => ({})); setPanels(prev => { const u = prev.map((p, i) => i === pp.idx ? { ...p, imageStatus: "error" as const, imageError: e.error || "Failed" } : p); saved.panels = u; savePipeline(saved); return u; }); }
          } catch (err: unknown) { const msg = err instanceof Error ? err.message : "Failed"; setPanels(prev => { const u = prev.map((p, i) => i === pp.idx ? { ...p, imageStatus: "error" as const, imageError: msg } : p); saved.panels = u; savePipeline(saved); return u; }); }
          setImagesGenerated(prev => prev + 1);
        }
        setImageStatus("done"); saved.imageStatus = "done"; savePipeline(saved);
      }
    }

    setPhase("done");
    pipelineRunning.current = false;
  }, []);

  // ── Full pipeline ──
  const runPipeline = useCallback(async () => {
    if (pipelineRunning.current) return;
    pipelineRunning.current = true;
    clearPipeline();
    setPhase("running");
    setError("");
    setScriptStatus("running");
    setAudioStatus("pending");
    setPanelStatus("pending");
    setImageStatus("pending");
    setPanels([]);
    setAudioUrl(null);
    setImagesGenerated(0);

    const voice = getAutoVoice();
    setVoiceInfo(voice);
    let finalScript = "";

    // ── 1. SCRIPT ──
    if (hasScript && userScript.trim()) {
      finalScript = userScript;
      setScript(finalScript);
      setScriptStatus("done");
    } else {
      const config = getScriptConfig(selectedTextModel);
      if (!config) { setError("No API key. Add in Settings."); setScriptStatus("error"); pipelineRunning.current = false; return; }
      try {
        const res = await fetch("/api/novel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate-script", config, novelName, style, genreHint: selectedGenre.id === "custom" ? customGenreText : selectedGenre.promptHint }) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Script failed"); }
        const data = await res.json();
        finalScript = data.script;
        setScript(finalScript);
        setScriptStatus("done");
        addTextUsage(config.model, estimateTokens(novelName + style), estimateTokens(finalScript));
      } catch (err: unknown) { setError(err instanceof Error ? err.message : "Script failed"); setScriptStatus("error"); pipelineRunning.current = false; return; }
    }

    // Save after script
    saveCurrentState(finalScript, "done", "pending", null, "pending", [], "pending", voice);

    // ── STEP 1.5: CHARACTER SHEET — Claude creates fixed designs for every character ──
    let characterRef = characterRefStore.current || "";
    if (!characterRef) {
      const config = getScriptConfig(selectedTextModel);
      if (config) {
        console.log("Generating character sheet...");
        try {
          const res = await fetch("/api/novel", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "character-sheet", config, script: finalScript }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.characters && Array.isArray(data.characters)) {
              characterRef = data.characters.map((c: { name: string; prompt: string }) => `${c.name}: ${c.prompt}`).join("\n");
              characterRefStore.current = characterRef; // Store persistently
              console.log(`Character sheet: ${data.characters.length} characters identified`);
              logAI("character", `${data.characters.length} characters designed`, config.provider, config.model);
              data.characters.forEach((c: { name: string; prompt: string }) => { console.log(`  - ${c.name}: ${c.prompt.slice(0, 80)}...`); logInfo("character", `${c.name}: ${c.prompt.slice(0, 100)}`); });
            }
          }
        } catch { console.log("Character sheet generation failed — continuing without"); }
      }
    }

    // ── Audio chunker (splits by sentences for audio only) ──
    const splitForAudio = (text: string, maxWords: number = 2000): string[] => {
      const allWords = text.split(/\s+/);
      if (allWords.length <= maxWords) return [text];
      let parts = text.split(/\n\n/).filter(p => p.trim());
      if (parts.length <= 1) parts = text.split(/\n/).filter(p => p.trim());
      if (parts.length <= 1) parts = text.split(/(?<=[।.!?])\s+/).filter(p => p.trim());
      if (parts.length <= 1) { const c: string[] = []; for (let i = 0; i < allWords.length; i += maxWords) c.push(allWords.slice(i, i + maxWords).join(" ")); return c; }
      const chunks: string[] = []; let cur = "";
      for (const p of parts) { const c = cur ? cur + "\n\n" + p : p; if (c.split(/\s+/).length > maxWords && cur.trim()) { chunks.push(cur.trim()); cur = p; } else { cur = c; } }
      if (cur.trim()) chunks.push(cur.trim());
      return chunks;
    };

    // ══════════════════════════════════════════════════════════════
    //  HYBRID: Client rough-split (FREE) + AI smart scene breaks (CHEAP)
    // ══════════════════════════════════════════════════════════════

    // ── STEP 2: PANELS ──
    let panelResult: Panel[] | null = null as Panel[] | null;
    {
      setPanelStatus("running");
      const config = getScriptConfig(selectedTextModel);

      try {
        const totalWords = finalScript.split(/\s+/).length;
        const allPanels: Panel[] = [];

        if (config) {
          // ── HYBRID APPROACH ──
          // Step A: Client-side rough split into ~3000 word chunks (FREE)
          const chunks = roughSplitIntoChunks(finalScript, 1000);
          console.log(`Hybrid split: ${totalWords} words → ${chunks.length} chunks (FREE) → AI scene detection`);

          // Step B: For each chunk, AI finds natural scene breaks (CHEAP — ~3000 words per call)
          for (let c = 0; c < chunks.length; c++) {
            try {
              console.log(`AI scene break: chunk ${c + 1}/${chunks.length} (${chunks[c].split(/\s+/).length} words)`);
              const res = await fetch("/api/novel", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "smart-scene-break", config,
                  script: chunks[c],
                  chunkIndex: c + 1, totalChunks: chunks.length,
                }),
              });

              if (res.ok) {
                const data = await res.json();
                if (data.scenes && Array.isArray(data.scenes)) {
                  for (const scene of data.scenes) {
                    allPanels.push({
                      panel: allPanels.length + 1,
                      narration: scene.narration || "",
                      imagePrompt: `Anime art style, 16:9 cinematic widescreen illustration. ${scene.imageDescription || "Scene from the story."}`,
                      imageStatus: "pending" as const, audioStatus: "pending" as const,
                    });
                  }
                  setPanels([...allPanels]);
                  addTextUsage(config.model, estimateTokens(chunks[c]), estimateTokens(JSON.stringify(data.scenes)));
                }
              } else {
                // If AI fails for this chunk, use client-side fallback for just this chunk
                console.warn(`AI failed for chunk ${c + 1}, using fallback`);
                const fallbackScenes = fallbackSplitIntoScenes(chunks[c], 70);
                for (const fs of fallbackScenes) {
                  allPanels.push({
                    panel: allPanels.length + 1,
                    narration: fs.narration,
                    imagePrompt: `Anime art style, 16:9 cinematic widescreen illustration. A scene from the story.`,
                    imageStatus: "pending" as const, audioStatus: "pending" as const,
                  });
                }
                setPanels([...allPanels]);
              }
            } catch {
              // Fallback for this chunk
              const fallbackScenes = fallbackSplitIntoScenes(chunks[c], 70);
              for (const fs of fallbackScenes) {
                allPanels.push({
                  panel: allPanels.length + 1,
                  narration: fs.narration,
                  imagePrompt: `Anime art style, 16:9 cinematic widescreen illustration. A scene from the story.`,
                  imageStatus: "pending" as const, audioStatus: "pending" as const,
                });
              }
              setPanels([...allPanels]);
            }
          }
        } else {
          // No AI key — pure client-side fallback (FREE but dumber scene breaks)
          console.log(`No AI key — pure client-side split (${totalWords} words)`);
          const fallbackScenes = fallbackSplitIntoScenes(finalScript, 70);
          for (const fs of fallbackScenes) {
            allPanels.push({
              panel: allPanels.length + 1,
              narration: fs.narration,
              imagePrompt: `Anime art style, 16:9 cinematic widescreen illustration. A scene from the story.`,
              imageStatus: "pending" as const, audioStatus: "pending" as const,
            });
          }
          setPanels([...allPanels]);
        }

        if (allPanels.length > 0) {
          setPanelStatus("done");
          panelResult = allPanels;
        } else {
          setError("No scenes could be created.");
          setPanelStatus("error");
        }
      } catch (err: unknown) {
        setError(`Scene error: ${err instanceof Error ? err.message : "Unknown"}`);
        setPanelStatus("error");
      }
    }

    // Save after panels
    if (panelResult) {
      savePipeline({ novelName, style, script: finalScript, scriptStatus: "done", audioStatus: "pending", audioBase64: null, audioMime: "audio/mpeg", panelStatus: "done", panels: panelResult, imageStatus: "pending", voiceInfo: voice });
    }

    // ═══════════════════════════════════════════════════════
    //  STEP 3+4: PANEL BY PANEL — Audio then Image for each
    // ═══════════════════════════════════════════════════════
    if (panelResult && panelResult.length > 0) {
      const audioKey = getApiKey(selectedAudioProvider);
      const imgKey = getImageApiKey(selectedImageModel);
      const imgProvider = getImageProvider(selectedImageModel);

      logInfo("system", `Pipeline Step 3+4: ${panelResult.length} panels — image:${selectedImageModel}, audio:${selectedAudioProvider}/${selectedAudioVoice}`);
      console.log(`=== PIPELINE STEP 3+4 ===`);
      console.log(`Image model: ${selectedImageModel}, provider: ${imgProvider}`);
      console.log(`Audio: ${selectedAudioProvider}/${selectedAudioVoice}`);
      console.log(`Audio provider: ${voice.provider}`);
      console.log(`Panels: ${panelResult.length}`);
      console.log(`Character ref: ${characterRef ? "YES (" + characterRef.length + " chars)" : "NONE"}`);

      setAudioStatus("running");
      setImageStatus("running");
      setImagesGenerated(0);
      audioBlobsRef.current = new Array(panelResult.length).fill(null);

      console.log(`Panel-by-panel: ${panelResult.length} panels — audio + image for each`);

      for (let i = 0; i < panelResult.length; i++) {
        console.log(`Panel ${i+1}/${panelResult.length}: ${panelResult[i].narration.split(/\s+/).length} words`);

        // ── 3A: Generate AUDIO for this panel (try primary provider, fallback to other) ──
        if (audioKey && panelResult[i].audioStatus !== "done") {
          setPanels(prev => prev.map((p, idx) => idx === i ? { ...p, audioStatus: "generating" as const } : p));

          let audioSuccess = false;

          // Use user's selected audio provider and voice
          try {
            console.log(`Panel ${i+1} audio: ${selectedAudioProvider}/${selectedAudioVoice}`);
            const res = await fetch("/api/audio", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ script: panelResult[i].narration, voice: selectedAudioVoice, provider: selectedAudioProvider, apiKey: audioKey }),
            });
            if (res.ok) {
              const blob = await res.blob();
              if (blob.size > 0) {
                audioBlobsRef.current[i] = blob;
                panelResult[i] = { ...panelResult[i], audioUrl: URL.createObjectURL(blob), audioStatus: "done" };
                audioSuccess = true;
                console.log(`Panel ${i+1} audio OK: ${(blob.size/1024).toFixed(0)}KB`);
                const panelChars = panelResult[i].narration.length;
                const ttsCost = (panelChars / 1000000) * 15;
                logAI("audio", `Panel ${i+1} audio — ${panelResult[i].narration.split(/\s+/).length} words, ${panelChars} chars, ${(blob.size/1024).toFixed(0)}KB`, selectedAudioProvider, `${selectedAudioProvider === "openai" ? "gpt-4o-mini-tts" : "gemini-tts"} / ${selectedAudioVoice}`, panelChars, 0, ttsCost);
              }
            } else {
              const e = await res.json().catch(() => ({}));
              const errMsg = e.error || `HTTP ${res.status}`;
              console.error(`Panel ${i+1} audio failed: ${errMsg}`);
              logError("audio", `Panel ${i+1} audio failed`, errMsg, selectedAudioProvider, selectedAudioVoice);
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Network error";
            console.error(`Panel ${i+1} audio error:`, errMsg);
            logError("audio", `Panel ${i+1} audio error`, errMsg, selectedAudioProvider, selectedAudioVoice);
          }

          if (!audioSuccess) panelResult[i] = { ...panelResult[i], audioStatus: "error" };

          // Delay between panels
          if (i < panelResult.length - 1) await new Promise(r => setTimeout(r, 1000));
        }

        // ── 3B: Use Claude/AI to enhance image prompt if it's too basic ──
        if (imgKey && panelResult[i].imageStatus !== "done") {
          // ALWAYS use Claude to generate image prompt with character descriptions
          let finalImagePrompt = panelResult[i].imagePrompt;
          const textConfig = getScriptConfig(selectedTextModel);
          if (textConfig) {
            try {
              const enhanceRes = await fetch("/api/novel", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "image-prompt", config: textConfig, narration: panelResult[i].narration.slice(0, 800), sceneNumber: i+1, totalScenes: panelResult.length, characterRef }),
              });
              if (enhanceRes.ok) {
                const eData = await enhanceRes.json();
                if (eData.imagePrompt && eData.imagePrompt.length > 50) {
                  finalImagePrompt = eData.imagePrompt;
                  panelResult[i] = { ...panelResult[i], imagePrompt: finalImagePrompt };
                }
              }
            } catch {}
          }

          setPanels(prev => prev.map((p, idx) => idx === i ? { ...p, ...panelResult![i], imageStatus: "generating" as const } : p));
          try {
            const res = await fetch("/api/novel/image", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: finalImagePrompt, provider: imgProvider, apiKey: imgKey, model: selectedImageModel }),
            });
            if (res.ok) {
              const data = await res.json();
              panelResult[i] = { ...panelResult[i], imageUrl: data.imageUrl, imageStatus: "done" };
              console.log(`Panel ${i+1} image OK`);
              logAI("image", `Panel ${i+1} image generated`, imgProvider, selectedImageModel, 0, 0);
            } else {
              const e = await res.json().catch(() => ({}));
              const errMsg = e.error || `HTTP ${res.status}`;
              console.error(`Panel ${i+1} image FAILED: ${errMsg}`);
              logError("image", `Panel ${i+1} image failed`, errMsg, imgProvider, selectedImageModel);
              panelResult[i] = { ...panelResult[i], imageStatus: "error", imageError: errMsg };
            }
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Network error";
            console.error(`Panel ${i+1} image ERROR: ${errMsg}`);
            logError("image", `Panel ${i+1} image error`, errMsg, imgProvider, selectedImageModel);
            panelResult[i] = { ...panelResult[i], imageStatus: "error", imageError: errMsg };
          }
        }

        // Update UI after each panel
        setPanels(prev => prev.map((p, idx) => idx === i ? panelResult![i] : p));
        setImagesGenerated(i + 1);

        // Merge all audio blobs so far for the full player
        const allBlobs = audioBlobsRef.current.filter((b): b is Blob => b !== null);
        if (allBlobs.length > 0) {
          const merged = new Blob(allBlobs, { type: allBlobs[0].type || "audio/mpeg" });
          setAudioUrl(URL.createObjectURL(merged));
        }

        // Save progress after each panel
        savePipeline({ novelName, style, script: finalScript, scriptStatus: "done", audioStatus: "running", audioBase64: null, audioMime: "audio/mpeg", panelStatus: "done", panels: panelResult, imageStatus: "running", voiceInfo: voice });
      }

      // Final status
      const audiosDone = panelResult.filter(p => p.audioStatus === "done").length;
      const imagesDone = panelResult.filter(p => p.imageStatus === "done").length;

      setAudioStatus(audiosDone > 0 ? "done" : "error");
      setImageStatus(imagesDone > 0 ? "done" : "pending");
      if (audiosDone > 0) addTTSUsage(finalScript.length);

      if (audiosDone < panelResult.length || imagesDone < panelResult.length) {
        setError(`Done: ${audiosDone}/${panelResult.length} audio, ${imagesDone}/${panelResult.length} images. Use Retry for failed ones.`);
      }

      savePipeline({ novelName, style, script: finalScript, scriptStatus: "done", audioStatus: audiosDone > 0 ? "done" : "error", audioBase64: null, audioMime: "audio/mpeg", panelStatus: "done", panels: panelResult, imageStatus: imagesDone > 0 ? "done" : "pending", voiceInfo: voice });
    }

    setPhase("done");
    pipelineRunning.current = false;
  }, [hasScript, userScript, novelName, style]);

  // ── Continue from where it stopped ──
  const handleContinue = useCallback(() => {
    if (!savedPipelineData) return;
    setPhase("running");
    resumePipeline(savedPipelineData);
  }, [savedPipelineData, resumePipeline]);

  // ── Retry ONLY failed audio chunks — keep successful ones ──
  const retryAudio = useCallback(async () => {
    if (pipelineRunning.current || !script) return;
    pipelineRunning.current = true;
    setAudioStatus("running");
    setError("");
    const voice = getAutoVoice();
    const audioKey = getApiKey(voice.provider === "gemini" ? "gemini" : "openai");
    if (!audioKey) { setAudioStatus("error"); setError("No audio API key. Add in Settings."); pipelineRunning.current = false; return; }

    try {
      // Rebuild chunks if not in memory
      if (audioChunksRef.current.length === 0) {
        audioChunksRef.current = roughSplitIntoChunks(script, 1000);
        audioBlobsRef.current = new Array(audioChunksRef.current.length).fill(null);
      }

      const chunks = audioChunksRef.current;
      const failedIndices = audioBlobsRef.current.map((b, i) => b === null ? i : -1).filter(i => i >= 0);
      const alreadyDone = chunks.length - failedIndices.length;

      console.log(`Retry Audio: ${failedIndices.length} failed chunks to retry (${alreadyDone} already done)`);

      let newSuccess = 0;
      for (const idx of failedIndices) {
        console.log(`Retrying audio ${idx+1}/${chunks.length}: ${chunks[idx].split(/\s+/).length} words`);

        let success = false;
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 3000));
          try {
            const res = await fetch("/api/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script: chunks[idx], voice: voice.voice, provider: voice.provider, apiKey: audioKey }) });
            if (res.ok) {
              const blob = await res.blob();
              if (blob.size > 0) { audioBlobsRef.current[idx] = blob; newSuccess++; success = true; console.log(`Audio ${idx+1} OK: ${(blob.size/1024).toFixed(0)}KB`); }
            }
          } catch {}
        }

        // Merge all available blobs and update player after each
        const allBlobs = audioBlobsRef.current.filter((b): b is Blob => b !== null);
        if (allBlobs.length > 0) {
          const merged = new Blob(allBlobs, { type: allBlobs[0].type || "audio/mpeg" });
          setAudioUrl(URL.createObjectURL(merged));
        }

        // Delay between retries to avoid rate limit
        await new Promise(r => setTimeout(r, 1500));
      }

      const totalSuccess = audioBlobsRef.current.filter(b => b !== null).length;
      const stillFailed = chunks.length - totalSuccess;

      if (totalSuccess > 0) {
        setAudioStatus("done");
        addTTSUsage(script.length);
        const saved = loadPipeline();
        if (saved) { saved.audioStatus = "done"; savePipeline(saved); }
        if (stillFailed > 0) setError(`Audio: ${totalSuccess}/${chunks.length} chunks OK. ${stillFailed} still failed — retry again.`);
      } else { setAudioStatus("error"); }
    } catch { setAudioStatus("error"); }
    pipelineRunning.current = false;
  }, [script]);

  // ── Retry ONLY failed/errored images ──
  const retryImages = useCallback(async () => {
    if (pipelineRunning.current) return;
    pipelineRunning.current = true;
    setError("");
    const imgKey = getImageApiKey(selectedImageModel);
    const imgProvider = getImageProvider(selectedImageModel);
    if (!imgKey) { setError("No image API key"); pipelineRunning.current = false; return; }

    const erroredPanels = panels.map((p, i) => ({ ...p, idx: i })).filter(p => p.imageStatus === "error" || p.imageStatus === "pending");
    if (erroredPanels.length === 0) { pipelineRunning.current = false; return; }

    setImageStatus("running");
    const charRef = characterRefStore.current;

    for (const pp of erroredPanels) {
      setPanels(prev => prev.map((p, i) => i === pp.idx ? { ...p, imageStatus: "generating" as const, imageError: undefined } : p));

      // Enhance prompt with character ref if available
      let finalPrompt = pp.imagePrompt;
      if (charRef && !finalPrompt.includes(charRef.slice(0, 30))) {
        // Use Claude to generate a proper prompt with character descriptions
        const textConfig = getScriptConfig(selectedTextModel);
        if (textConfig) {
          try {
            const enhanceRes = await fetch("/api/novel", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "image-prompt", config: textConfig, narration: pp.narration.slice(0, 800), sceneNumber: pp.panel, totalScenes: panels.length, characterRef: charRef }),
            });
            if (enhanceRes.ok) { const eData = await enhanceRes.json(); if (eData.imagePrompt) finalPrompt = eData.imagePrompt; }
          } catch {}
        }
      }

      try {
        const res = await fetch("/api/novel/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: finalPrompt, provider: imgProvider, apiKey: imgKey, model: selectedImageModel }) });
        if (res.ok) {
          const data = await res.json();
          setPanels(prev => { const u = prev.map((p, i) => i === pp.idx ? { ...p, imageUrl: data.imageUrl, imageStatus: "done" as const, imageError: undefined } : p); const saved = loadPipeline(); if (saved) { saved.panels = u; savePipeline(saved); } return u; });
        } else {
          const e = await res.json().catch(() => ({}));
          setPanels(prev => prev.map((p, i) => i === pp.idx ? { ...p, imageStatus: "error" as const, imageError: e.error || "Failed" } : p));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed";
        setPanels(prev => prev.map((p, i) => i === pp.idx ? { ...p, imageStatus: "error" as const, imageError: msg } : p));
      }
    }
    setImageStatus("done");
    const saved = loadPipeline();
    if (saved) { saved.imageStatus = "done"; saved.panels = panels; savePipeline(saved); }
    pipelineRunning.current = false;
  }, [panels]);

  // ── New project ──
  const handleNewProject = () => { clearPipeline(); setPhase("input"); setScript(""); setPanels([]); setAudioUrl(null); setScriptStatus("pending"); setAudioStatus("pending"); setPanelStatus("pending"); setImageStatus("pending"); setError(""); setImagesGenerated(0); setSecondLangPanels([]); setSecondLangStatus("idle"); setSecondLangProgress(0); };

  // ── Generate second language version — translate + generate audio, reuse images ──
  const secondLanguage = primaryLanguage === "english" ? "Hindi" : "English";

  const generateSecondLang = useCallback(async () => {
    if (pipelineRunning.current || panels.length === 0) return;
    pipelineRunning.current = true;
    setSecondLangStatus("running");
    setSecondLangProgress(0);

    const targetLang = primaryLanguage === "english" ? "Hindi" : "English";
    const textConfig = getScriptConfig(selectedTextModel);
    const audioKey = getApiKey(selectedAudioProvider);

    if (!textConfig) { setError("No AI key for translation"); pipelineRunning.current = false; return; }

    const results: Panel[] = [];

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];

      // Translate narration
      let translatedNarration = panel.narration;
      try {
        const translateRes = await fetch("/api/research", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: `You are a translator. Translate the following text to ${targetLang}. Output ONLY the ${targetLang} translation, nothing else. No labels, no headers. Keep the same dramatic tone and emotion. Keep character names as-is.` },
              { role: "user", content: panel.narration },
            ],
            provider: textConfig.provider, apiKey: textConfig.apiKey, model: textConfig.model,
          }),
        });
        if (translateRes.ok) {
          const tData = await translateRes.json();
          if (tData.reply) translatedNarration = tData.reply;
        }
      } catch {}

      // Generate audio in target language
      let translatedAudioUrl: string | undefined;
      let translatedAudioStatus: "pending" | "generating" | "done" | "error" = "pending";
      if (audioKey) {
        try {
          const audioRes = await fetch("/api/audio", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ script: translatedNarration, voice: selectedAudioVoice, provider: selectedAudioProvider, apiKey: audioKey }),
          });
          if (audioRes.ok) {
            const blob = await audioRes.blob();
            if (blob.size > 0) { translatedAudioUrl = URL.createObjectURL(blob); translatedAudioStatus = "done"; }
            else { translatedAudioStatus = "error"; }
          } else { translatedAudioStatus = "error"; }
        } catch { translatedAudioStatus = "error"; }
      }

      results.push({
        panel: i + 1,
        narration: translatedNarration,
        imagePrompt: panel.imagePrompt,
        imageUrl: panel.imageUrl,
        imageStatus: panel.imageStatus,
        audioUrl: translatedAudioUrl,
        audioStatus: translatedAudioStatus,
      });

      setSecondLangPanels([...results]);
      setSecondLangProgress(i + 1);

      // Delay to avoid rate limit
      if (i < panels.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    setSecondLangStatus("done");
    pipelineRunning.current = false;
  }, [panels, selectedTextModel, primaryLanguage, selectedAudioProvider, selectedAudioVoice]);

  const toggleAudio = () => { if (!audioRef.current) return; if (audioPlaying) audioRef.current.pause(); else audioRef.current.play(); setAudioPlaying(!audioPlaying); };
  const downloadAudio = () => { if (!audioUrl) return; const ext = voiceInfo.provider === "gemini" ? "wav" : "mp3"; const a = document.createElement("a"); a.href = audioUrl; a.download = `shadow-senpai-novel-${Date.now()}.${ext}`; a.click(); };

  const StatusIcon = ({ s }: { s: string }) => {
    if (s === "done") return <Check className="w-4 h-4 text-success" />;
    if (s === "running") return <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />;
    if (s === "error") return <AlertCircle className="w-4 h-4 text-danger" />;
    return <div className="w-4 h-4 rounded-full border-2 border-card-border" />;
  };

  const anyKey = hasKeys.openai || hasKeys.anthropic || hasKeys.gemini;
  const canStart = anyKey && ((hasScript && userScript.trim().length > 0) || (!hasScript && novelName.trim().length > 0));
  const totalPanels = panels.length;
  const successImages = panels.filter(p => p.imageStatus === "done").length;
  const erroredImages = panels.filter(p => p.imageStatus === "error").length;
  const doneImages = successImages + erroredImages;
  const successAudios = panels.filter(p => p.audioStatus === "done").length;
  const erroredAudios = panels.filter(p => p.audioStatus === "error").length;

  // Progress weights: Script=5%, Panels=15%, Audio=20%, Images=60%
  const overallProgress = (() => {
    let pct = 0;
    if (scriptStatus === "done") pct += 5; else if (scriptStatus === "running") pct += 2;
    if (panelStatus === "done") pct += 15; else if (panelStatus === "running") pct += 5;
    if (audioStatus === "done") pct += 20; else if (audioStatus === "running") pct += 8;
    if (totalPanels > 0) pct += (doneImages / totalPanels) * 60;
    else if (imageStatus === "done") pct += 60;
    return Math.round(Math.min(pct, 100));
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setAudioPlaying(false)} onPause={() => setAudioPlaying(false)} onPlay={() => setAudioPlaying(true)} />}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center"><Film className="w-5 h-5 text-white" /></div>
              Novel Video Creator
            </h1>
            <p className="text-sm text-muted mt-2">Enter a name, hit start — script, audio, and images all generate automatically.</p>
          </div>
          {phase !== "input" && (
            <button onClick={handleNewProject} className="text-xs text-muted hover:text-foreground border border-card-border px-3 py-1.5 rounded-lg hover:border-muted transition-all">New Project</button>
          )}
        </div>

        {/* ═══════ INPUT ═══════ */}
        {phase === "input" && (
          <div className="space-y-4 max-w-2xl mx-auto">
            {/* Model Selection */}
            <div className="rounded-2xl glass-card p-4">
              <div className="flex items-center gap-2 mb-3"><Cpu className="w-4 h-4 text-primary" /><h3 className="text-xs font-semibold text-foreground">AI Models</h3></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Text AI Model */}
                <div>
                  <label className="block text-muted mb-1.5">Script & Panels</label>
                  <select value={selectedTextModel} onChange={e => setSelectedTextModel(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-background border border-card-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer">
                    {TEXT_MODELS.filter(m => getApiKey(m.provider as "openai"|"anthropic"|"gemini")).map(m => (
                      <option key={m.id} value={m.id}>{m.label} {m.tier === "best" ? "(Best)" : m.tier === "fast" ? "(Fast)" : ""}</option>
                    ))}
                    {TEXT_MODELS.filter(m => getApiKey(m.provider as "openai"|"anthropic"|"gemini")).length === 0 && (
                      <option disabled>No API keys — add in Settings</option>
                    )}
                  </select>
                </div>
                {/* Image Model */}
                <div>
                  <label className="block text-muted mb-1.5">Image Generation</label>
                  <select value={selectedImageModel} onChange={e => setSelectedImageModel(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-background border border-card-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer">
                    {IMAGE_MODELS.filter(m => getApiKey(m.provider as "openai"|"gemini")).map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                {/* Audio Provider */}
                <div>
                  <label className="block text-muted mb-1.5">Audio</label>
                  <select value={selectedAudioProvider} onChange={e => { setSelectedAudioProvider(e.target.value as "openai" | "gemini"); setSelectedAudioVoice(e.target.value === "openai" ? "cedar" : "Charon"); }}
                    className="w-full px-2.5 py-2 rounded-lg bg-background border border-card-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer mb-1.5">
                    {getApiKey("openai") && <option value="openai">OpenAI TTS</option>}
                    {getApiKey("gemini") && <option value="gemini">Gemini TTS</option>}
                  </select>
                  <select value={selectedAudioVoice} onChange={e => setSelectedAudioVoice(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-background border border-card-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer">
                    {selectedAudioProvider === "openai" && <option value="cedar">Cedar (Deep, warm)</option>}
                    {selectedAudioProvider === "openai" && <option value="nova">Nova (Female)</option>}
                    {selectedAudioProvider === "openai" && <option value="onyx">Onyx (Dark, powerful)</option>}
                    {selectedAudioProvider === "openai" && <option value="ash">Ash (Soft, calm)</option>}
                    {selectedAudioProvider === "openai" && <option value="ballad">Ballad (Cinematic)</option>}
                    {selectedAudioProvider === "openai" && <option value="coral">Coral (Warm, friendly)</option>}
                    {selectedAudioProvider === "openai" && <option value="sage">Sage (Wise)</option>}
                    {selectedAudioProvider === "openai" && <option value="shimmer">Shimmer (Bright)</option>}
                    {selectedAudioProvider === "gemini" && <option value="Charon">Charon (Deep)</option>}
                    {selectedAudioProvider === "gemini" && <option value="Kore">Kore (Clear)</option>}
                    {selectedAudioProvider === "gemini" && <option value="Fenrir">Fenrir (Powerful)</option>}
                    {selectedAudioProvider === "gemini" && <option value="Puck">Puck (Playful)</option>}
                    {selectedAudioProvider === "gemini" && <option value="Aoede">Aoede (Melodic)</option>}
                    {selectedAudioProvider === "gemini" && <option value="Orus">Orus (Bold)</option>}
                    {selectedAudioProvider === "gemini" && <option value="Leda">Leda (Gentle)</option>}
                    {selectedAudioProvider === "gemini" && <option value="Zephyr">Zephyr (Bright)</option>}
                  </select>
                </div>
              </div>
              {!anyKey && <Link href="/settings" className="flex items-center gap-1.5 mt-3 text-xs text-amber-400 font-medium hover:underline"><KeyRound className="w-3.5 h-3.5" /> Add API keys in Settings</Link>}
            </div>

            <div className="rounded-2xl glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1"><Film className="w-4 h-4 text-rose-400" /><h3 className="text-sm font-semibold text-foreground">Novel / Story</h3></div>
              <div><label className="block text-xs text-muted mb-1.5">Novel / Story Name</label><input type="text" value={novelName} onChange={e => setNovelName(e.target.value)} placeholder="e.g., Solo Leveling, Naruto, Attack on Titan..." className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all" /></div>
              {/* Genre Selection */}
              <div>
                <label className="block text-xs text-muted mb-2">Genre / Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {NOVEL_GENRES.map(genre => (
                    <button key={genre.id} type="button" onClick={() => setSelectedGenre(genre)}
                      className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${selectedGenre.id === genre.id ? "border-rose-500/40 bg-rose-500/10 text-foreground" : "border-transparent hover:border-card-border hover:bg-white/5 text-muted"}`}>
                      <span className="mr-1">{genre.emoji}</span>
                      <span className="font-medium">{genre.label}</span>
                    </button>
                  ))}
                </div>
                {selectedGenre.id !== "custom" && (
                  <p className="text-[11px] text-muted/60 mt-1.5 px-1">{selectedGenre.description}</p>
                )}
                {selectedGenre.id === "custom" && (
                  <input type="text" value={customGenreText} onChange={e => setCustomGenreText(e.target.value)}
                    placeholder="Describe your genre style..." className="w-full mt-2 px-3 py-2 rounded-xl bg-background border border-card-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-muted mb-1.5">Narration Style</label><select value={style} onChange={e => setStyle(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all appearance-none cursor-pointer">{STYLE_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div>
                <div><label className="block text-xs text-muted mb-1.5">Create first in</label>
                  <div className="flex gap-2">
                    <button onClick={() => setPrimaryLanguage("english")} className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${primaryLanguage === "english" ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" : "bg-background border border-card-border text-muted hover:text-foreground"}`}>
                      English
                    </button>
                    <button onClick={() => setPrimaryLanguage("hindi")} className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${primaryLanguage === "hindi" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "bg-background border border-card-border text-muted hover:text-foreground"}`}>
                      Hindi
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => setHasScript(!hasScript)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium ${hasScript ? "border-rose-500/40 bg-rose-500/5 text-foreground" : "border-dashed border-card-border text-muted hover:text-foreground hover:border-muted"}`}><div className="flex items-center gap-2"><Pencil className="w-4 h-4" /><span>{hasScript ? "I have my own script" : "I have my own script (Optional)"}</span></div>{hasScript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
              {hasScript && <textarea value={userScript} onChange={e => setUserScript(e.target.value)} placeholder="Paste your novel script here..." rows={10} className="w-full px-4 py-3 rounded-xl bg-background border border-card-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all resize-y leading-relaxed" />}
            </div>

            <div className="flex justify-center"><button onClick={runPipeline} disabled={!canStart} className="flex items-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white hover:opacity-90 transition-all text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-rose-500/25 disabled:shadow-none"><Sparkles className="w-5 h-5" /> Start Creating Video</button></div>
          </div>
        )}

        {/* ═══════ RUNNING / DONE ═══════ */}
        {(phase === "running" || phase === "paused" || phase === "done") && (
          <div className="space-y-5">
            {/* Overall Progress */}
            <div className="rounded-2xl glass-card p-5">
              <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-foreground">Overall Progress</h3><span className="text-lg font-bold text-rose-400">{overallProgress}%</span></div>
              <div className="h-3 bg-card-border rounded-full overflow-hidden mb-5"><div className="h-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${overallProgress}%` }} /></div>
              <div className="space-y-3">
                {/* Step 1: Script */}
                <div className="flex items-center gap-3"><StatusIcon s={scriptStatus} /><div className="flex-1"><div className="flex items-center justify-between"><span className="text-sm font-medium text-foreground">Step 1 — Script</span><span className="text-xs text-muted">{scriptStatus === "done" ? `${script.split(/\s+/).filter(w=>w).length} words — 100%` : scriptStatus === "running" ? "Writing..." : "Waiting"}</span></div><div className="h-1 mt-1.5 bg-card-border rounded-full overflow-hidden"><div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: scriptStatus === "done" ? "100%" : scriptStatus === "running" ? "50%" : "0%" }} /></div></div></div>
                {/* Step 2: Panels */}
                <div className="flex items-center gap-3"><StatusIcon s={panelStatus} /><div className="flex-1"><div className="flex items-center justify-between"><span className="text-sm font-medium text-foreground">Step 2 — Panels</span><span className="text-xs text-muted">{panelStatus === "done" ? `${totalPanels} panels — 100%` : panelStatus === "running" ? "Splitting..." : "Waiting"}</span></div><div className="h-1 mt-1.5 bg-card-border rounded-full overflow-hidden"><div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: panelStatus === "done" ? "100%" : panelStatus === "running" ? "40%" : "0%" }} /></div></div></div>
                {/* Step 3: Audio */}
                <div className="flex items-center gap-3">
                  <StatusIcon s={audioStatus} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Step 3 — Audio</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">
                          {totalPanels > 0 && (audioStatus === "running" || audioStatus === "done")
                            ? `${successAudios}/${totalPanels}${erroredAudios > 0 ? ` (${erroredAudios} failed)` : ""} — ${Math.round((successAudios/totalPanels)*100)}%`
                            : audioStatus === "done" && !audioUrl ? "Generated but lost — regenerate"
                            : audioStatus === "error" ? "Failed"
                            : "Waiting"}
                        </span>
                        {(audioStatus === "error" || (audioStatus === "done" && !audioUrl) || erroredAudios > 0) && !pipelineRunning.current && (
                          <button onClick={retryAudio} className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-all font-medium">
                            {erroredAudios > 0 ? `Retry ${erroredAudios} Audio` : audioUrl ? "Retry Audio" : "Generate Audio"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="h-1 mt-1.5 bg-card-border rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: totalPanels > 0 ? `${(successAudios/totalPanels)*100}%` : audioStatus === "done" ? "100%" : "0%" }} /></div>
                  </div>
                </div>
                {/* Step 4: Images */}
                <div className="flex items-center gap-3">
                  <StatusIcon s={erroredImages > 0 ? "error" : imageStatus === "done" ? "done" : imageStatus === "running" ? "running" : "pending"} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Step 4 — Images</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">
                          {totalPanels > 0 ? `${successImages}/${totalPanels}${erroredImages > 0 ? ` (${erroredImages} failed)` : ""} — ${Math.round((successImages/totalPanels)*100)}%` : "Waiting"}
                        </span>
                        {erroredImages > 0 && !pipelineRunning.current && (
                          <button onClick={retryImages} className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-all font-medium">Retry {erroredImages} Failed</button>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 mt-1.5 bg-card-border rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full transition-all duration-500" style={{ width: totalPanels > 0 ? `${(successImages/totalPanels)*100}%` : "0%" }} /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Continue Button — when paused */}
            {phase === "paused" && (
              <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-400/5 p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Pipeline paused</p>
                  <p className="text-xs text-muted mt-1">
                    You left the page. Your progress is saved — click Continue to pick up where you left off.
                  </p>
                </div>
                <button
                  onClick={handleContinue}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white hover:opacity-90 transition-all text-sm font-semibold shadow-lg shadow-rose-500/25 shrink-0"
                >
                  <Play className="w-4 h-4" />
                  Continue
                </button>
              </div>
            )}

            {/* Audio Player */}
            {audioUrl && (
              <div className="rounded-2xl border border-violet-500/30 bg-card p-4">
                <div className="flex items-center gap-4"><button onClick={toggleAudio} className="w-11 h-11 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 flex items-center justify-center text-white hover:opacity-90 transition-all shrink-0">{audioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}</button><div className="flex-1"><p className="text-sm font-medium text-foreground">Narration Audio</p><p className="text-xs text-muted">{voiceInfo.presetLabel ? `Preset: ${voiceInfo.presetLabel}` : `${voiceInfo.provider === "openai" ? "OpenAI" : "Gemini"} — ${voiceInfo.voice}`}</p></div><button onClick={downloadAudio} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-xs font-medium"><Download className="w-3.5 h-3.5" /> {voiceInfo.provider === "gemini" ? "WAV" : "MP3"}</button></div>
                <audio src={audioUrl} controls className="w-full rounded-lg mt-3" style={{ height: "36px" }} />
              </div>
            )}

            {/* Script */}
            {script && (
              <details className="rounded-2xl glass-card overflow-hidden"><summary className="flex items-center gap-2 px-5 py-3 cursor-pointer hover:bg-white/5 transition-colors"><FileText className="w-4 h-4 text-success" /><span className="text-sm font-semibold text-foreground">Script</span><span className="text-xs text-muted ml-auto">{script.split(/\s+/).filter(w=>w).length} words</span></summary><div className="px-5 pb-4"><div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-background border border-card-border text-sm leading-relaxed whitespace-pre-wrap">{script}</div></div></details>
            )}

            {/* Panels */}
            {panels.length > 0 && (
              <div className="space-y-3">
                {panels.map((panel, idx) => {
                  const isExp = expandedPanel === idx;
                  return (
                    <div key={idx} className={`rounded-2xl border bg-card overflow-hidden transition-all ${panel.imageStatus === "done" && panel.audioStatus === "done" ? "border-success/30" : (panel.imageStatus === "generating" || panel.audioStatus === "generating") ? "border-rose-500/50 processing-glow" : (panel.imageStatus === "error" || panel.audioStatus === "error") ? "border-danger/30" : "border-card-border"}`}>
                      <button onClick={() => setExpandedPanel(isExp ? null : idx)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted bg-white/5 px-2 py-1 rounded">#{panel.panel}</span>
                          {panel.imageStatus === "done" && panel.imageUrl && <img src={panel.imageUrl} alt="" className="w-16 h-9 rounded object-cover border border-card-border" />}
                          <span className="text-sm text-foreground truncate max-w-sm">{panel.narration.slice(0, 60)}...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status icons */}
                          {panel.audioStatus === "done" && <Volume2 className="w-3.5 h-3.5 text-violet-400" />}
                          {panel.audioStatus === "generating" && <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />}
                          {panel.imageStatus === "done" && <Check className="w-4 h-4 text-success" />}
                          {panel.imageStatus === "generating" && <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />}
                          {isExp ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                        </div>
                      </button>
                      {isExp && (
                        <div className="px-5 pb-5 space-y-4">
                          {/* Image */}
                          {panel.imageUrl && (
                            <div className="relative rounded-xl overflow-hidden border border-card-border group">
                              <img src={panel.imageUrl} alt={`Panel ${panel.panel}`} className="w-full aspect-video object-cover" />
                              <button onClick={() => { const a = document.createElement("a"); a.href = panel.imageUrl!; a.download = `panel-${idx+1}.png`; a.click(); }}
                                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                                <Download className="w-3 h-3" /> Image
                              </button>
                            </div>
                          )}
                          {panel.imageStatus === "error" && <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{panel.imageError}</div>}

                          {/* Audio for THIS panel */}
                          {panel.audioUrl && (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/5 border border-violet-500/15">
                              <Volume2 className="w-4 h-4 text-violet-400 shrink-0" />
                              <audio src={panel.audioUrl} controls className="flex-1 h-8" style={{ height: "32px" }} />
                              <button onClick={() => { const a = document.createElement("a"); a.href = panel.audioUrl!; a.download = `panel-${idx+1}-audio.mp3`; a.click(); }}
                                className="p-1.5 rounded-lg text-muted/40 hover:text-violet-400 transition-colors shrink-0"><Download className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                          {panel.audioStatus === "error" && <div className="p-2 rounded-lg bg-violet-500/5 border border-violet-500/10 text-xs text-violet-400/60">Audio failed for this panel</div>}

                          {/* Narration */}
                          <div><p className="text-xs text-muted font-medium mb-1">NARRATION</p><p className="text-sm leading-relaxed text-foreground">{panel.narration}</p></div>
                          <details><summary className="text-xs text-muted cursor-pointer hover:text-foreground">View image prompt</summary><p className="mt-2 text-xs text-muted leading-relaxed p-3 rounded-lg bg-background border border-card-border">{panel.imagePrompt}</p></details>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Download All Section */}
            {(panels.some(p => p.imageStatus === "done") || panels.some(p => p.audioStatus === "done")) && (
              <div className="rounded-2xl glass-card border border-accent/20 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-semibold text-foreground">Download All</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Download all audios */}
                    {panels.some(p => p.audioStatus === "done" && p.audioUrl) && (
                      <button onClick={() => {
                        panels.filter(p => p.audioStatus === "done" && p.audioUrl).forEach((p, i) => {
                          setTimeout(() => { const a = document.createElement("a"); a.href = p.audioUrl!; a.download = `panel-${p.panel}-audio.mp3`; a.click(); }, i * 300);
                        });
                      }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-all text-xs font-medium">
                        <Volume2 className="w-3.5 h-3.5" /> All Audio ({panels.filter(p => p.audioStatus === "done").length})
                      </button>
                    )}
                    {/* Download all images */}
                    {panels.some(p => p.imageStatus === "done" && p.imageUrl) && (
                      <button onClick={() => {
                        panels.filter(p => p.imageStatus === "done" && p.imageUrl).forEach((p, i) => {
                          setTimeout(() => { const a = document.createElement("a"); a.href = p.imageUrl!; a.download = `panel-${p.panel}-image.png`; a.click(); }, i * 300);
                        });
                      }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/15 text-accent hover:bg-accent/25 transition-all text-xs font-medium">
                        <ImageIcon className="w-3.5 h-3.5" /> All Images ({panels.filter(p => p.imageStatus === "done").length})
                      </button>
                    )}
                  </div>
                </div>
                {/* Image grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {panels.filter(p => p.imageStatus === "done" && p.imageUrl).map((p, i) => (
                    <button key={i} onClick={() => { const a = document.createElement("a"); a.href = p.imageUrl!; a.download = `panel-${p.panel}-image.png`; a.click(); }}
                      className="relative rounded-lg overflow-hidden border border-card-border hover:border-accent/50 transition-all group aspect-video">
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <Download className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-white bg-black/50 px-1 rounded">#{p.panel}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ SECOND LANGUAGE VERSION ═══ */}
            {panels.some(p => p.imageStatus === "done" || p.audioStatus === "done") && (
              <div className={`rounded-2xl glass-card border ${primaryLanguage === "english" ? "border-amber-500/20" : "border-blue-500/20"} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{primaryLanguage === "english" ? "🇮🇳" : "🇬🇧"}</span>
                    <h3 className="text-sm font-semibold text-foreground">{secondLanguage} Version</h3>
                    {secondLangStatus === "done" && <span className="text-xs text-success">({secondLangPanels.length} panels)</span>}
                  </div>
                  {secondLangStatus === "idle" && (
                    <button onClick={generateSecondLang} disabled={pipelineRunning.current}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white hover:opacity-90 transition-all text-xs font-semibold disabled:opacity-30 ${primaryLanguage === "english" ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`}>
                      <Volume2 className="w-3.5 h-3.5" /> Generate {secondLanguage} Panels + Audio
                    </button>
                  )}
                  {secondLangStatus === "running" && (
                    <div className={`flex items-center gap-2 text-xs ${primaryLanguage === "english" ? "text-amber-400" : "text-blue-400"}`}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Translating... {secondLangProgress}/{panels.length}
                    </div>
                  )}
                  {secondLangStatus === "done" && (
                    <button onClick={() => {
                      secondLangPanels.filter(p => p.audioUrl).forEach((p, i) => {
                        setTimeout(() => { const a = document.createElement("a"); a.href = p.audioUrl!; a.download = `${secondLanguage.toLowerCase()}-panel-${p.panel}-audio.mp3`; a.click(); }, i * 300);
                      });
                    }} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${primaryLanguage === "english" ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"}`}>
                      <Download className="w-3.5 h-3.5" /> Download All {secondLanguage} Audio
                    </button>
                  )}
                </div>

                {secondLangStatus === "running" && (
                  <div className="h-2 bg-card-border rounded-full overflow-hidden mb-4">
                    <div className={`h-full rounded-full transition-all duration-500 ${primaryLanguage === "english" ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`} style={{ width: `${(secondLangProgress / panels.length) * 100}%` }} />
                  </div>
                )}

                {secondLangPanels.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {secondLangPanels.map((sp, idx) => {
                      const isSExp = expandedSecondPanel === idx;
                      const accentColor = primaryLanguage === "english" ? "amber" : "blue";
                      return (
                        <div key={idx} className="rounded-xl border border-card-border bg-card overflow-hidden">
                          <button onClick={() => setExpandedSecondPanel(isSExp ? null : idx)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold text-${accentColor}-400 bg-${accentColor}-500/10 px-1.5 py-0.5 rounded`}>#{sp.panel}</span>
                              <span className="text-xs text-foreground truncate max-w-sm">{sp.narration.slice(0, 60)}...</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {sp.audioStatus === "done" && <Volume2 className="w-3 h-3 text-success" />}
                              {sp.imageStatus === "done" && <Check className="w-3 h-3 text-success" />}
                              {isSExp ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
                            </div>
                          </button>
                          {isSExp && (
                            <div className="px-4 pb-4 space-y-3">
                              {sp.imageUrl && <img src={sp.imageUrl} alt="" className="w-full aspect-video object-cover rounded-lg border border-card-border" />}
                              {sp.audioUrl && (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-card-border">
                                  <audio src={sp.audioUrl} controls className="flex-1 h-8" style={{ height: "32px" }} />
                                  <button onClick={() => { const a = document.createElement("a"); a.href = sp.audioUrl!; a.download = `${secondLanguage.toLowerCase()}-panel-${idx+1}.mp3`; a.click(); }}
                                    className="p-1 text-muted/40 hover:text-foreground"><Download className="w-3 h-3" /></button>
                                </div>
                              )}
                              <p className="text-xs leading-relaxed text-foreground/80">{sp.narration}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <div className="mt-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" /><div><p className="text-sm font-medium text-danger">Error</p><p className="text-sm text-danger/80 mt-1">{error}</p></div></div>}
        {phase === "input" && !error && <div className="text-center py-6"><p className="text-xs text-muted max-w-md mx-auto">One click — everything auto-generates. If you leave and come back, it resumes where it left off.</p></div>}
      </main>
      <footer className="py-6 text-center"><p className="text-xs text-muted">Shadow Senpai Studio — Novel Video Creator.</p></footer>
    </div>
  );
}
