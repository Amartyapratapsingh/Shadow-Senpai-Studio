"use client";

import { useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import { getApiKey } from "@/lib/api-keys";
import { AudioProvider, OPENAI_VOICES, GEMINI_VOICES } from "@/lib/audio-utils";
import { getPanelNarrationPrompt, getStoryOutlinePrompt } from "@/lib/novel-prompts";
import { addTextUsage, addTTSUsage, estimateTokens } from "@/lib/usage";
import { logAI, logError, logInfo } from "@/lib/logger";
import {
  Wand2,
  ArrowLeft,
  Plus,
  Loader2,
  AlertCircle,
  Upload,
  X,
  RefreshCw,
  Download,
  CheckCircle,
  Clock,
  Mic,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";

// ── Text AI models ──
const TEXT_MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", provider: "anthropic" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
];

// ── Source types ──
const SOURCE_TYPES = [
  "Korean Manhwa",
  "Chinese Manhua",
  "Japanese Manga",
  "Web Novel",
  "Other",
];

// ── Types ──
type PanelStatus = "idle" | "generating-script" | "generating-audio" | "done" | "error";

interface PanelSlot {
  id: number;
  file: File | null;
  previewUrl: string | null;
  script: string;
  audioUrl: string | null;
  audioBlob: Blob | null;
  status: PanelStatus;
  error: string | null;
}

const MAX_PANELS = 100;

function createEmptyPanel(id: number): PanelSlot {
  return {
    id,
    file: null,
    previewUrl: null,
    script: "",
    audioUrl: null,
    audioBlob: null,
    status: "idle",
    error: null,
  };
}

export default function RewriterPage() {
  // ── Input state ──
  const [manhwaName, setManhwaName] = useState("");
  const [sourceType, setSourceType] = useState("Korean Manhwa");
  const [language, setLanguage] = useState<"hindi" | "english">("hindi");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-6");
  const [audioProvider, setAudioProvider] = useState<AudioProvider>("openai");
  const [audioVoice, setAudioVoice] = useState("cedar");

  // ── Character list — saved per manhua name in localStorage ──
  const [characterList, setCharacterList] = useState("");
  const [fetchingChars, setFetchingChars] = useState(false);

  // Save character list to localStorage whenever it changes
  const saveCharacters = useCallback((name: string, chars: string) => {
    if (!name.trim() || !chars.trim()) return;
    const key = `ss_rewriter_chars_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;
    try { localStorage.setItem(key, chars); } catch {}
  }, []);

  // Load character list from localStorage when manhua name changes
  const loadCharacters = useCallback((name: string): string => {
    if (!name.trim()) return "";
    const key = `ss_rewriter_chars_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;
    try { return localStorage.getItem(key) || ""; } catch { return ""; }
  }, []);

  // Auto-load characters when manhua name changes
  const handleManhwaNameChange = useCallback((name: string) => {
    setManhwaName(name);
    const saved = loadCharacters(name);
    if (saved) {
      setCharacterList(saved);
      logInfo("character", `Loaded saved characters for "${name}"`);
    }
  }, [loadCharacters]);

  // ── Panel state ──
  const [panels, setPanels] = useState<PanelSlot[]>([
    createEmptyPanel(1),
    createEmptyPanel(2),
    createEmptyPanel(3),
  ]);

  // ── Processing state ──
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [globalError, setGlobalError] = useState("");
  const abortRef = useRef(false);

  // ── File input refs ──
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ── Derived ──
  const modelInfo = TEXT_MODELS.find((m) => m.id === selectedModel);
  const modelProvider = modelInfo?.provider || "anthropic";
  const voiceList = audioProvider === "gemini" ? GEMINI_VOICES : OPENAI_VOICES;
  const panelsWithImages = panels.filter((p) => p.file !== null);
  const allDone = panels.every((p) => p.status === "done" || p.file === null);
  const hasAnyAudio = panels.some((p) => p.audioBlob !== null);

  // ── Handlers ──

  const handleAddPanel = useCallback(() => {
    setPanels((prev) => {
      if (prev.length >= MAX_PANELS) return prev;
      return [...prev, createEmptyPanel(prev.length + 1)];
    });
  }, []);

  // ── Bulk upload — select multiple images at once, auto-create panels ──
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const handleBulkUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Sort files by name to maintain panel order
    const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    setPanels((prev) => {
      // Find first empty slot
      const firstEmptyIdx = prev.findIndex((p) => p.file === null);
      const newPanels = [...prev];
      let fileIdx = 0;

      // Fill existing empty slots first
      for (let i = 0; i < newPanels.length && fileIdx < sortedFiles.length; i++) {
        if (newPanels[i].file === null) {
          const file = sortedFiles[fileIdx];
          newPanels[i] = { ...newPanels[i], file, previewUrl: URL.createObjectURL(file), script: "", audioUrl: null, audioBlob: null, status: "idle", error: null };
          fileIdx++;
        }
      }

      // Create new panels for remaining files
      while (fileIdx < sortedFiles.length && newPanels.length < MAX_PANELS) {
        const file = sortedFiles[fileIdx];
        const newPanel = createEmptyPanel(newPanels.length + 1);
        newPanel.file = file;
        newPanel.previewUrl = URL.createObjectURL(file);
        newPanels.push(newPanel);
        fileIdx++;
      }

      return newPanels;
    });

    // Reset input so same files can be selected again
    e.target.value = "";
  }, []);

  const handleRemoveImage = useCallback((panelId: number) => {
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id !== panelId) return p;
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        if (p.audioUrl) URL.revokeObjectURL(p.audioUrl);
        return { ...p, file: null, previewUrl: null, script: "", audioUrl: null, audioBlob: null, status: "idle", error: null };
      })
    );
  }, []);

  const handleFileSelect = useCallback((panelId: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id !== panelId) return p;
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        if (p.audioUrl) URL.revokeObjectURL(p.audioUrl);
        return { ...p, file, previewUrl, script: "", audioUrl: null, audioBlob: null, status: "idle", error: null };
      })
    );
  }, []);

  const handleDrop = useCallback(
    (panelId: number, e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileSelect(panelId, file);
      }
    },
    [handleFileSelect]
  );

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Audio voice changes when provider changes
  const handleAudioProviderChange = useCallback((provider: AudioProvider) => {
    setAudioProvider(provider);
    setAudioVoice(provider === "gemini" ? "Kore" : "cedar");
  }, []);

  // ── Fetch character names from web search ──
  const fetchCharacters = useCallback(async () => {
    if (!manhwaName.trim()) return;
    const modelInfo = TEXT_MODELS.find(m => m.id === selectedModel);
    const provider = modelInfo?.provider || "openai";
    const apiKey = getApiKey(provider as "openai" | "anthropic" | "gemini");
    if (!apiKey) { setGlobalError("No API key to fetch characters. Add in Settings."); return; }

    setFetchingChars(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a manhwa/manhua/manga expert. The user will give you a title. List ALL characters with their NAME, GENDER, and ROLE in the story. Format each character on one line like: Name (gender) - role. Use the original language names. If you don't know the exact characters, make your best guess based on the title and genre." },
            { role: "user", content: `List all main characters from "${manhwaName}" (${sourceType}). Include: MC, love interests, rivals, villains, side characters. For each: Name (Male/Female) - their role (e.g., MC, ex-girlfriend, rich rival, system voice, best friend).` },
          ],
          provider, apiKey, model: selectedModel,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setCharacterList(data.reply);
          saveCharacters(manhwaName, data.reply);
          logInfo("character", `Fetched character list for "${manhwaName}"`);
        }
      }
    } catch (err) {
      logError("character", "Failed to fetch characters", err instanceof Error ? err.message : "Unknown");
    }
    setFetchingChars(false);
  }, [manhwaName, sourceType, selectedModel]);

  // ── Generate scripts & audio for all panels ──
  const handleGenerateAll = useCallback(async () => {
    if (!manhwaName.trim()) {
      setGlobalError("Please enter the manhwa/manhua name.");
      return;
    }

    const apiKey = getApiKey(modelProvider as "openai" | "anthropic" | "gemini");
    if (!apiKey) {
      setGlobalError(`No API key found for ${modelProvider}. Please add it in Settings.`);
      return;
    }

    const audioKey = getApiKey(audioProvider === "gemini" ? "gemini" : "openai");
    if (!audioKey) {
      setGlobalError(`No API key found for ${audioProvider} (audio). Please add it in Settings.`);
      return;
    }

    // Only process panels that have an image AND are not already done
    const toProcess = panels.filter((p) => p.file !== null && p.status !== "done");
    if (toProcess.length === 0) {
      // Check if there are any panels with files at all
      const anyFiles = panels.filter((p) => p.file !== null);
      if (anyFiles.length === 0) {
        setGlobalError("Please upload at least one panel image.");
      } else {
        setGlobalError("All panels are already generated. Add more panels or regenerate individual ones.");
      }
      return;
    }

    setGlobalError("");
    setIsProcessing(true);
    abortRef.current = false;
    setCurrentProcessing(0);
    setTotalToProcess(toProcess.length);

    // ── PASS 1: STORY OUTLINE — scan all panel images first ──
    logInfo("script", `Pass 1: Scanning ${toProcess.length} panels for story outline...`);
    let storyOutline = "";

    // Build outline from already-done panels
    for (const panel of panels) {
      if (panel.status === "done" && panel.script) {
        storyOutline += `Panel ${panel.id}: ${panel.script.slice(0, 80)}\n`;
      }
    }

    // Scan NEW panels in batches of 5 for outline
    const BATCH_SIZE = 5;
    for (let batchStart = 0; batchStart < toProcess.length; batchStart += BATCH_SIZE) {
      if (abortRef.current) break;
      const batch = toProcess.slice(batchStart, batchStart + BATCH_SIZE);

      for (const panel of batch) {
        try {
          const base64Data = await fileToBase64(panel.file!);
          const outlinePrompt = getStoryOutlinePrompt(manhwaName, sourceType, batchStart, batch.length, panels.filter(p => p.file).length);

          const outlineRes = await fetch("/api/vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: modelProvider,
              apiKey,
              model: selectedModel,
              imageBase64: base64Data,
              mimeType: panel.file!.type,
              systemPrompt: `Look at this panel from "${manhwaName}" and write ONE short line (10-15 words max) summarizing what happens. Focus on dialogue, action, reveals. Output ONLY the summary line.`,
            }),
          });

          if (outlineRes.ok) {
            const data = await outlineRes.json();
            storyOutline += `Panel ${panel.id}: ${data.script?.slice(0, 100) || "scene continues"}\n`;
          }
        } catch {
          storyOutline += `Panel ${panel.id}: scene continues\n`;
        }
      }
    }

    logInfo("script", `Story outline complete: ${storyOutline.split("\n").filter(l => l.trim()).length} panels scanned`);

    // ── PASS 2: GENERATE SCRIPTS — now AI knows the full story ──
    // Build context from ALREADY DONE panels
    let previousContext = "";
    for (const panel of panels) {
      if (panel.status === "done" && panel.script) {
        previousContext += (previousContext ? "\n" : "") + `[Panel ${panel.id}]: ${panel.script}`;
      }
    }

    let processedCount = 0;

    for (const panel of panels) {
      if (abortRef.current) break;
      if (!panel.file) continue;
      // Skip already done panels
      if (panel.status === "done") continue;

      processedCount++;
      setCurrentProcessing(processedCount);

      // Update status: generating script
      setPanels((prev) =>
        prev.map((p) => (p.id === panel.id ? { ...p, status: "generating-script" as PanelStatus, error: null } : p))
      );

      try {
        // Convert image to base64
        const base64Data = await fileToBase64(panel.file);

        // Call vision API — with full story outline so AI knows what's coming
        const systemPrompt = getPanelNarrationPrompt(
          manhwaName,
          sourceType,
          processedCount,
          toProcess.length,
          language,
          previousContext || undefined,
          storyOutline || undefined,
          characterList || undefined
        );

        const visionRes = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: modelProvider,
            apiKey,
            model: selectedModel,
            imageBase64: base64Data,
            mimeType: panel.file.type,
            systemPrompt,
          }),
        });

        if (!visionRes.ok) {
          const err = await visionRes.json().catch(() => ({}));
          throw new Error(err.error || "Vision API failed");
        }

        const visionData = await visionRes.json();
        let script = visionData.script || "";

        // Try to parse JSON response (new format with newCharacter)
        try {
          const cleaned = script.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.script) {
            script = parsed.script;
            // Auto-save new character if detected
            if (parsed.newCharacter && parsed.newCharacter.trim()) {
              setCharacterList((prev) => {
                const updated = prev + (prev.trim() ? "\n" : "") + parsed.newCharacter.trim();
                saveCharacters(manhwaName, updated);
                logInfo("character", `New character auto-detected in panel ${processedCount}: ${parsed.newCharacter.trim()}`);
                return updated;
              });
            }
          }
        } catch {
          // Not JSON — use raw script as-is (fallback)
        }

        // Track usage
        const inputEst = estimateTokens(systemPrompt);
        const outputEst = estimateTokens(script);
        addTextUsage(selectedModel, inputEst, outputEst);
        logAI("script", `Panel ${processedCount} vision script (${outputEst} tokens)`, modelProvider, selectedModel, inputEst, outputEst);

        // Update panel with script
        setPanels((prev) =>
          prev.map((p) => (p.id === panel.id ? { ...p, script, status: "generating-audio" as PanelStatus } : p))
        );

        // Add to context chain for next panel
        previousContext += (previousContext ? "\n\n" : "") + `[Panel ${processedCount}]: ${script}`;

        // Generate audio
        if (abortRef.current) break;

        let audioSuccess = false;
        let audioBlob: Blob | null = null;
        let audioUrl: string | null = null;

        // Try primary provider
        try {
          const audioRes = await fetch("/api/audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              script,
              voice: audioVoice,
              provider: audioProvider,
              apiKey: audioKey,
            }),
          });

          if (audioRes.ok) {
            const blob = await audioRes.blob();
            if (blob.size > 0) {
              audioBlob = blob;
              audioUrl = URL.createObjectURL(blob);
              audioSuccess = true;
              addTTSUsage(script.length);
              logAI("audio", `Panel ${processedCount} audio OK (${(blob.size / 1024).toFixed(0)}KB)`, audioProvider, `${audioProvider}-tts`, script.length, 0);
            }
          }
        } catch (audioErr) {
          logError("audio", `Panel ${processedCount} primary audio failed`, audioErr instanceof Error ? audioErr.message : "Unknown");
        }

        // Fallback: try opposite provider
        if (!audioSuccess && !abortRef.current) {
          const fallbackProvider: AudioProvider = audioProvider === "openai" ? "gemini" : "openai";
          const fallbackVoice = fallbackProvider === "gemini" ? "Kore" : "cedar";
          const fallbackKey = getApiKey(fallbackProvider === "gemini" ? "gemini" : "openai");

          if (fallbackKey) {
            try {
              logInfo("audio", `Panel ${processedCount} falling back to ${fallbackProvider}/${fallbackVoice}`);
              const audioRes = await fetch("/api/audio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  script,
                  voice: fallbackVoice,
                  provider: fallbackProvider,
                  apiKey: fallbackKey,
                }),
              });

              if (audioRes.ok) {
                const blob = await audioRes.blob();
                if (blob.size > 0) {
                  audioBlob = blob;
                  audioUrl = URL.createObjectURL(blob);
                  audioSuccess = true;
                  addTTSUsage(script.length);
                  logAI("audio", `Panel ${processedCount} audio OK via fallback (${fallbackProvider})`, fallbackProvider, `${fallbackProvider}-tts`, script.length, 0);
                }
              }
            } catch {
              logError("audio", `Panel ${processedCount} fallback audio also failed`);
            }
          }
        }

        // Update panel with audio (or mark done without audio)
        setPanels((prev) =>
          prev.map((p) =>
            p.id === panel.id
              ? {
                  ...p,
                  audioUrl,
                  audioBlob,
                  status: "done" as PanelStatus,
                  error: audioSuccess ? null : "Audio generation failed (script saved)",
                }
              : p
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logError("script", `Panel ${processedCount} failed: ${message}`, message, modelProvider, selectedModel);
        setPanels((prev) =>
          prev.map((p) =>
            p.id === panel.id ? { ...p, status: "error" as PanelStatus, error: message } : p
          )
        );
        // Still accumulate context from previous panels
      }
    }

    setIsProcessing(false);
    logInfo("system", `Panel pipeline finished. Processed ${processedCount} panels.`);
  }, [manhwaName, sourceType, language, selectedModel, modelProvider, audioProvider, audioVoice, panels]);

  // ── Regenerate script for a single panel ──
  const handleRegeneratePanel = useCallback(
    async (panelId: number) => {
      const panel = panels.find((p) => p.id === panelId);
      if (!panel?.file) return;

      const apiKey = getApiKey(modelProvider as "openai" | "anthropic" | "gemini");
      if (!apiKey) {
        setGlobalError(`No API key found for ${modelProvider}.`);
        return;
      }

      const audioKey = getApiKey(audioProvider === "gemini" ? "gemini" : "openai");

      // Build previous context from preceding panels
      let previousContext = "";
      const panelsWithImages = panels.filter((p) => p.file !== null);
      const panelIndex = panelsWithImages.findIndex((p) => p.id === panelId);

      for (let i = 0; i < panelIndex; i++) {
        const prev = panelsWithImages[i];
        if (prev.script) {
          previousContext += (previousContext ? "\n\n" : "") + `[Panel ${i + 1}]: ${prev.script}`;
        }
      }

      setPanels((prev) =>
        prev.map((p) => (p.id === panelId ? { ...p, status: "generating-script" as PanelStatus, error: null } : p))
      );

      try {
        const base64Data = await fileToBase64(panel.file);
        const systemPrompt = getPanelNarrationPrompt(
          manhwaName,
          sourceType,
          panelIndex + 1,
          panelsWithImages.length,
          language,
          previousContext || undefined
        );

        const visionRes = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: modelProvider,
            apiKey,
            model: selectedModel,
            imageBase64: base64Data,
            mimeType: panel.file.type,
            systemPrompt,
          }),
        });

        if (!visionRes.ok) {
          const err = await visionRes.json().catch(() => ({}));
          throw new Error(err.error || "Vision API failed");
        }

        const { script } = await visionRes.json();

        const inputEst = estimateTokens(systemPrompt);
        const outputEst = estimateTokens(script);
        addTextUsage(selectedModel, inputEst, outputEst);
        logAI("script", `Panel ${panelIndex + 1} regenerated (${outputEst} tokens)`, modelProvider, selectedModel, inputEst, outputEst);

        setPanels((prev) =>
          prev.map((p) => (p.id === panelId ? { ...p, script, status: "generating-audio" as PanelStatus } : p))
        );

        // Generate audio
        let audioBlob: Blob | null = null;
        let audioUrl: string | null = null;
        let audioSuccess = false;

        if (audioKey) {
          try {
            const audioRes = await fetch("/api/audio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ script, voice: audioVoice, provider: audioProvider, apiKey: audioKey }),
            });
            if (audioRes.ok) {
              const blob = await audioRes.blob();
              if (blob.size > 0) {
                audioBlob = blob;
                audioUrl = URL.createObjectURL(blob);
                audioSuccess = true;
                addTTSUsage(script.length);
              }
            }
          } catch {
            // Try fallback
          }

          if (!audioSuccess) {
            const fallbackProvider: AudioProvider = audioProvider === "openai" ? "gemini" : "openai";
            const fallbackVoice = fallbackProvider === "gemini" ? "Kore" : "cedar";
            const fallbackKey = getApiKey(fallbackProvider === "gemini" ? "gemini" : "openai");
            if (fallbackKey) {
              try {
                const audioRes = await fetch("/api/audio", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ script, voice: fallbackVoice, provider: fallbackProvider, apiKey: fallbackKey }),
                });
                if (audioRes.ok) {
                  const blob = await audioRes.blob();
                  if (blob.size > 0) {
                    audioBlob = blob;
                    audioUrl = URL.createObjectURL(blob);
                    audioSuccess = true;
                    addTTSUsage(script.length);
                  }
                }
              } catch {
                // Both failed
              }
            }
          }
        }

        // Revoke old audio URL
        const oldPanel = panels.find((p) => p.id === panelId);
        if (oldPanel?.audioUrl) URL.revokeObjectURL(oldPanel.audioUrl);

        setPanels((prev) =>
          prev.map((p) =>
            p.id === panelId
              ? { ...p, audioUrl, audioBlob, status: "done" as PanelStatus, error: audioSuccess ? null : "Audio failed" }
              : p
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setPanels((prev) =>
          prev.map((p) => (p.id === panelId ? { ...p, status: "error" as PanelStatus, error: message } : p))
        );
      }
    },
    [panels, manhwaName, sourceType, language, selectedModel, modelProvider, audioProvider, audioVoice]
  );

  // ── Update script text ──
  const handleScriptChange = useCallback((panelId: number, newScript: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, script: newScript } : p))
    );
  }, []);

  // ── Download single audio ──
  const handleDownloadAudio = useCallback((panel: PanelSlot) => {
    if (!panel.audioBlob) return;
    const ext = audioProvider === "gemini" ? "wav" : "mp3";
    const url = URL.createObjectURL(panel.audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `panel-${panel.id}-audio.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [audioProvider]);

  // ── Download all audio — one by one like novel page ──
  const handleDownloadAllAudio = useCallback(() => {
    const audioPanels = panels.filter((p) => p.audioBlob !== null);
    if (audioPanels.length === 0) return;
    const ext = audioProvider === "gemini" ? "wav" : "mp3";

    audioPanels.forEach((panel, i) => {
      setTimeout(() => {
        const url = URL.createObjectURL(panel.audioBlob as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${manhwaName || "panel"}-${panel.id}-audio.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      }, i * 300);
    });
  }, [panels, audioProvider, manhwaName]);

  // ── Stop processing ──
  const handleStop = useCallback(() => {
    abortRef.current = true;
    setIsProcessing(false);
  }, []);

  // ── Status icon ──
  const getStatusIcon = (status: PanelStatus) => {
    switch (status) {
      case "idle":
        return <Clock className="w-4 h-4 text-muted" />;
      case "generating-script":
        return <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />;
      case "generating-audio":
        return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
      case "done":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusLabel = (status: PanelStatus) => {
    switch (status) {
      case "idle":
        return "Pending";
      case "generating-script":
        return "Generating script...";
      case "generating-audio":
        return "Generating audio...";
      case "done":
        return "Done";
      case "error":
        return "Error";
    }
  };

  // ── Check if can generate ──
  const canGenerate =
    manhwaName.trim().length > 0 &&
    panelsWithImages.length > 0 &&
    !isProcessing;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Panel Script Writer
            </h1>
          </div>
          <p className="text-sm text-muted max-w-xl mx-auto">
            Upload manhwa panels — AI writes the narration, generates audio for each.
          </p>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/*  TOP SECTION: INPUTS                    */}
        {/* ═══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left column: Name, Source, Language */}
          <div className="rounded-2xl glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-400" />
              Story Details
            </h2>

            {/* Manhwa Name */}
            <div>
              <label className="block text-xs text-muted mb-1.5">
                Manhwa / Manhua Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={manhwaName}
                onChange={(e) => handleManhwaNameChange(e.target.value)}
                placeholder="e.g. Solo Leveling, Tomb Raider King..."
                disabled={isProcessing}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-muted/50 disabled:opacity-50"
              />
            </div>

            {/* Source Type */}
            <div>
              <label className="block text-xs text-muted mb-1.5">
                Source Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                {SOURCE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Character List */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted">
                  Characters (names & roles)
                </label>
                <button
                  onClick={fetchCharacters}
                  disabled={!manhwaName.trim() || fetchingChars || isProcessing}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition-all disabled:opacity-30 flex items-center gap-1"
                >
                  {fetchingChars ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  {fetchingChars ? "Fetching..." : "Auto-detect Characters"}
                </button>
              </div>
              <textarea
                value={characterList}
                onChange={(e) => { setCharacterList(e.target.value); saveCharacters(manhwaName, e.target.value); }}
                placeholder={"Enter character names or click 'Auto-detect':\nLin Xin (Male) - MC, poor guy who gets the system\nLiu Cheng (Female) - ex-girlfriend who dumped MC\nRich Guy (Male) - rival who stole the girlfriend"}
                disabled={isProcessing}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-muted/30 disabled:opacity-50 resize-y"
              />
              <p className="text-[10px] text-muted/40 mt-1">AI will use these names in every panel script. Edit freely.</p>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs text-muted mb-1.5">
                Narration Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "hindi" | "english")}
                disabled={isProcessing}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="hindi">Hindi</option>
                <option value="english">English</option>
              </select>
            </div>
          </div>

          {/* Right column: Model, Audio provider, Voice */}
          <div className="rounded-2xl glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-400" />
              AI & Audio Settings
            </h2>

            {/* AI Model */}
            <div>
              <label className="block text-xs text-muted mb-1.5">
                AI Model (for vision/script)
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                {TEXT_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Provider */}
            <div>
              <label className="block text-xs text-muted mb-1.5">
                Audio Provider
              </label>
              <select
                value={audioProvider}
                onChange={(e) => handleAudioProviderChange(e.target.value as AudioProvider)}
                disabled={isProcessing}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>

            {/* Audio Voice */}
            <div>
              <label className="block text-xs text-muted mb-1.5">
                Audio Voice
              </label>
              <select
                value={audioVoice}
                onChange={(e) => setAudioVoice(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                {voiceList.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label} — {v.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/*  GLOBAL ERROR                           */}
        {/* ═══════════════════════════════════════ */}
        {globalError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Error</p>
              <p className="text-sm text-red-400/80 mt-1">{globalError}</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  PROGRESS BAR                           */}
        {/* ═══════════════════════════════════════ */}
        {isProcessing && (
          <div className="mb-6 rounded-2xl glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                Processing panel {currentProcessing}/{totalToProcess}...
              </p>
              <button
                onClick={handleStop}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
              >
                Stop
              </button>
            </div>
            <div className="w-full bg-card rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${totalToProcess > 0 ? (currentProcessing / totalToProcess) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  ACTION BUTTONS                         */}
        {/* ═══════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <button
            onClick={handleGenerateAll}
            disabled={!canGenerate}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:opacity-90 transition-all text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 disabled:shadow-none"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing {currentProcessing}/{totalToProcess}...
              </>
            ) : panels.some((p) => p.status === "done") && panels.some((p) => p.file && p.status !== "done") ? (
              <>
                <Wand2 className="w-5 h-5" />
                Continue ({panels.filter((p) => p.file && p.status !== "done").length} remaining)
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate Scripts & Audio
              </>
            )}
          </button>

          {hasAnyAudio && (
            <button
              onClick={handleDownloadAllAudio}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all text-sm font-semibold disabled:opacity-30"
            >
              <Download className="w-4 h-4" />
              Download All Audio
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════ */}
        {/*  PANEL GRID                             */}
        {/* ═══════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {panels.map((panel) => (
            <div
              key={panel.id}
              className="rounded-2xl glass-card border border-card-border overflow-hidden flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-violet-400">
                    #{panel.id}
                  </span>
                  <span className="text-xs text-muted">
                    {getStatusLabel(panel.status)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(panel.status)}
                  {panel.file && !isProcessing && (
                    <button
                      onClick={() => handleRemoveImage(panel.id)}
                      className="p-1 rounded-md hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Area / Image Preview */}
              <div className="p-4 flex-1 flex flex-col">
                {!panel.file ? (
                  <div
                    onClick={() => fileInputRefs.current[panel.id]?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(panel.id, e)}
                    className="flex-1 min-h-[160px] border-2 border-dashed border-card-border rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all"
                  >
                    <Upload className="w-8 h-8 text-muted" />
                    <div className="text-center">
                      <p className="text-sm text-muted">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-xs text-muted/60 mt-1">
                        PNG, JPG, WebP
                      </p>
                    </div>
                    <input
                      ref={(el) => { fileInputRefs.current[panel.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(panel.id, file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Image Preview */}
                    <div className="relative rounded-xl overflow-hidden border border-card-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={panel.previewUrl || ""}
                        alt={`Panel ${panel.id}`}
                        className="w-full h-auto max-h-[250px] object-contain bg-black/20"
                      />
                    </div>

                    {/* Script */}
                    {panel.script && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-violet-400 uppercase tracking-wide flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Script
                          </label>
                          {panel.status === "done" && !isProcessing && (
                            <button
                              onClick={() => handleRegeneratePanel(panel.id)}
                              className="text-xs text-muted hover:text-violet-400 flex items-center gap-1 transition-colors"
                              title="Regenerate"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Redo
                            </button>
                          )}
                        </div>
                        <textarea
                          value={panel.script}
                          onChange={(e) => handleScriptChange(panel.id, e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-card-border text-foreground text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-y"
                        />
                      </div>
                    )}

                    {/* Audio */}
                    {panel.audioUrl && (
                      <div>
                        <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                          <Mic className="w-3 h-3" />
                          Audio
                        </label>
                        <div className="flex items-center gap-2">
                          <audio
                            src={panel.audioUrl}
                            controls
                            className="flex-1 h-8"
                            style={{ minWidth: 0 }}
                          />
                          <button
                            onClick={() => handleDownloadAudio(panel)}
                            className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors shrink-0"
                            title="Download audio"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {panel.error && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {panel.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add Panel / Bulk Upload Buttons */}
          {panels.length < MAX_PANELS && !isProcessing && (
            <div className="rounded-2xl border-2 border-dashed border-card-border min-h-[200px] flex flex-col items-center justify-center gap-4 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all">
              {/* Bulk Upload — select all images at once */}
              <input
                ref={bulkInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleBulkUpload}
                className="hidden"
              />
              <button
                onClick={() => bulkInputRef.current?.click()}
                className="flex flex-col items-center gap-2 cursor-pointer group px-6 py-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all"
              >
                <Upload className="w-5 h-5 text-violet-400" />
                <span className="text-xs font-medium text-violet-400">
                  Upload All Panels At Once
                </span>
                <span className="text-[10px] text-muted/50">Select multiple images — auto-fills panels</span>
              </button>

              {/* Single Panel Add */}
              <button
                onClick={handleAddPanel}
                className="flex items-center gap-2 cursor-pointer group px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
              >
                <Plus className="w-4 h-4 text-muted group-hover:text-violet-400 transition-colors" />
                <span className="text-xs text-muted group-hover:text-violet-400 transition-colors">
                  Add Single Panel ({panels.length}/{MAX_PANELS})
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════ */}
        {/*  EMPTY STATE                            */}
        {/* ═══════════════════════════════════════ */}
        {panelsWithImages.length === 0 && !isProcessing && panels.every((p) => p.status === "idle") && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-card border border-card-border flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-7 h-7 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Upload your manhwa panels
            </h3>
            <p className="text-sm text-muted max-w-lg mx-auto">
              Drag and drop panel images into the slots above. The AI will read each panel,
              write a narration script, and generate audio — all sequentially so the story flows naturally.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  COMPLETION SUMMARY                     */}
        {/* ═══════════════════════════════════════ */}
        {!isProcessing && allDone && panelsWithImages.length > 0 && (
          <div className="rounded-2xl glass-card border border-green-500/20 p-5 text-center mb-8">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              All panels processed!
            </h3>
            <p className="text-xs text-muted">
              {panelsWithImages.length} panel{panelsWithImages.length !== 1 ? "s" : ""} complete.
              You can edit scripts, regenerate individual panels, or download all audio.
            </p>
          </div>
        )}
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-muted">
          REKVON Studio — Panel Script Writer.
        </p>
      </footer>
    </div>
  );
}
