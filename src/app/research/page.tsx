"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import { getApiKey } from "@/lib/api-keys";
import { addTextUsage, addTTSUsage, estimateTokens } from "@/lib/usage";
import { logAI, logError } from "@/lib/logger";
import {
  Send, Loader2, Tv, Globe, Trash2, BookOpen, User, Bot,
  Zap, Gauge, Crown, ChevronUp, Cpu, Plus, Check,
  Hammer, Settings, Paperclip, X, FileText,
  Image as ImageIcon, Video, FolderOpen, Lightbulb,
  Volume2, Play, Pause, Download, MessageSquare,
  PenLine, Trash, PlusCircle, Menu, Link2,
} from "lucide-react";
import Link from "next/link";

// ── Types ──
const CHANNEL_HANDLE = "@Shadow_Senpai_0p";
const CHANNEL_ID = "UCOwyaHluHP746feAYi0qhDA";

interface ChatMessage { role: "user" | "assistant" | "system"; content: string; action?: "audio"; actionData?: string; audioUrl?: string; }
type AIChoice = "claude" | "openai" | "gemini";
type QualityLevel = "high" | "medium" | "low";

interface ChatSession { id: string; title: string; messages: ChatMessage[]; createdAt: number; }

// ── History localStorage ──
const HISTORY_KEY = "ss_research_history";
function loadHistory(): ChatSession[] { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; } }
function saveHistory(h: ChatSession[]) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {} }

// ── Constants ──
const AI_OPTIONS: { id: AIChoice; label: string; icon: string; provider: string; models: Record<QualityLevel, string> }[] = [
  { id: "claude", label: "Claude", icon: "C", provider: "anthropic", models: { high: "claude-opus-4-6", medium: "claude-sonnet-4-6", low: "claude-haiku-4-5" } },
  { id: "openai", label: "OpenAI", icon: "O", provider: "openai", models: { high: "gpt-5.4", medium: "gpt-4.1", low: "gpt-4o-mini" } },
  { id: "gemini", label: "Gemini", icon: "G", provider: "gemini", models: { high: "gemini-2.5-pro", medium: "gemini-2.5-flash", low: "gemini-2.5-flash-lite" } },
];
const QUALITY_OPTIONS: { id: QualityLevel; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "high", label: "High Quality", icon: <Crown className="w-3.5 h-3.5" />, desc: "Best output, slower" },
  { id: "medium", label: "Balanced", icon: <Gauge className="w-3.5 h-3.5" />, desc: "Good quality, normal" },
  { id: "low", label: "Fast", icon: <Zap className="w-3.5 h-3.5" />, desc: "Quick, cheaper" },
];
const FEATURES = [
  { id: "youtube", label: "YouTube Channel", icon: <Tv className="w-3.5 h-3.5" />, desc: "Analyze your channel" },
  { id: "web", label: "Web Research", icon: <Globe className="w-3.5 h-3.5" />, desc: "Trends & latest" },
  { id: "novels", label: "Manhwa Database", icon: <BookOpen className="w-3.5 h-3.5" />, desc: "Novel recommendations" },
  { id: "lightnovels", label: "Light Novels", icon: <FileText className="w-3.5 h-3.5" />, desc: "Underrated & hidden gems" },
];
const BUILD_OPTIONS = [
  { id: "full", label: "Full Studio", desc: "Script + Audio + Images", href: "/novel", icon: <Hammer className="w-3.5 h-3.5" /> },
  { id: "script", label: "Script Rewriter", desc: "Rewrite or generate", href: "/rewriter", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "top10", label: "Top 10 List", desc: "Anime list scripts", href: "/top10", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "audio", label: "Audio Generator", desc: "AI voiceover", href: "/audio", icon: <Volume2 className="w-3.5 h-3.5" /> },
  { id: "settings", label: "Settings", desc: "Keys, currency", href: "/settings", icon: <Settings className="w-3.5 h-3.5" /> },
];
const SUGGESTIONS = ["Recommend 10 CEO romance manhwa for YouTube","Top trending revenge romance manhwa 2026","Analyze my YouTube channel","Best manhwa with hidden identity reveal","Make me a script for Solo Leveling","Generate audio for my latest script","What topics get most views in anime niche?","Compare Chinese vs Korean romance manhwa"];

// ── System prompt (same as before, abbreviated reference) ──
const SYSTEM_PROMPT = `You are MAVORI Studio AI — an elite assistant for an anime/manhwa YouTube creator.

CAPABILITIES: Script writing (pure voiceover, no formatting, any language, ~150 words/min), Script rewriting (never copy, faithful), Top 10 lists (countdown #10→#1), Audio generation (add [GENERATE_AUDIO] tag), Image generation (add [GENERATE_IMAGE: description]), Novel video creation, Research & recommendations (10+ per request), YouTube channel analysis.

CHANNEL: MAVORI (${CHANNEL_HANDLE}, ${CHANNEL_ID}). Videos: Top 10 Anime Movies, Top 10 Overpowered MC 2026, Top 10 Romance Anime 2026, Silent Girl Loves Him Secretly, MERCENARY COMBAT TACTICS, Top 10 Best Anime 2026, Top 10 Winter 2025 Romance, Underrated Fantasy, Romance Childhood Friend Falls, Most Underrated, Anticipated 2026, Psychological Dark Anime.

GENRES: CEO romance, revenge drama, contract marriage, hidden identity, betrayal, cultivation, reincarnation, villainess rebirth, cold male lead, school romance, action romance.

RULES: Always ask permission before creating. Scripts must be production-ready. Match user's language. Never generic — be specific to MAVORI's niche. For audio add [GENERATE_AUDIO]. For images add [GENERATE_IMAGE: description].

OUTPUT FORMAT RULES (CRITICAL):
- Keep responses CLEAN and CONCISE. No walls of text.
- For recommendations, use this SHORT format only:
  1. **Title** — Genre tags — 1 sentence plot — 1 sentence why good for YouTube
  2. **Title** — Genre tags — 1 sentence plot — 1 sentence why good for YouTube
- Do NOT use emoji ratings like 🔥🔥🔥. Just say "High potential" or "Proven performer".
- Do NOT write multi-paragraph explanations for each recommendation. Keep each to 2-3 lines MAX.
- Do NOT repeat the genre/format in different ways. Say it once.
- Use bullet points and short lines. Readers scan, they don't read essays.
- For analysis/advice: short paragraphs (2-3 sentences each), use bold for key points.
- For scripts: write the full script (this is the only time you can be long).
- Total response should fit on one screen when possible. If giving 10 recommendations, the whole list should be readable in under 30 seconds.`;

// ══════════════════════════════════
export default function ResearchPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAI, setSelectedAI] = useState<AIChoice>("claude");
  const [quality, setQuality] = useState<QualityLevel>("medium");
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showFeatureMenu, setShowFeatureMenu] = useState(false);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showYTMenu, setShowYTMenu] = useState(false);
  const [ytLink, setYtLink] = useState("");
  const [ytLinks, setYtLinks] = useState<string[]>([]);
  const [showWebMenu, setShowWebMenu] = useState(false);
  const [webLink, setWebLink] = useState("");
  const [webLinks, setWebLinks] = useState<string[]>([]);
  const [webLoading, setWebLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; size: string }[]>([]);

  // History
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [playingAudioIdx, setPlayingAudioIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    setMounted(true);
    if (getApiKey("anthropic")) setSelectedAI("claude");
    else if (getApiKey("openai")) setSelectedAI("openai");
    else if (getApiKey("gemini")) setSelectedAI("gemini");
    setHistory(loadHistory());
  }, []);

  // Save current session to history whenever messages change
  useEffect(() => {
    if (!mounted || messages.length === 0) return;
    const h = loadHistory();
    if (currentSessionId) {
      const idx = h.findIndex(s => s.id === currentSessionId);
      if (idx >= 0) { h[idx].messages = messages; }
      else { h.unshift({ id: currentSessionId, title: messages[0]?.content.slice(0, 40) || "New Chat", messages, createdAt: Date.now() }); }
    } else {
      const id = Date.now().toString(36);
      setCurrentSessionId(id);
      h.unshift({ id, title: messages[0]?.content.slice(0, 40) || "New Chat", messages, createdAt: Date.now() });
    }
    saveHistory(h);
    setHistory(h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const closeAllMenus = () => { setShowModelMenu(false); setShowQualityMenu(false); setShowFeatureMenu(false); setShowBuildMenu(false); setShowYTMenu(false); setShowWebMenu(false); };
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showModelMenu||showQualityMenu||showFeatureMenu||showBuildMenu||showYTMenu||showWebMenu) {
      const handler = (e: MouseEvent) => {
        // Don't close if clicking inside a pill menu
        if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
        closeAllMenus();
      };
      const t = setTimeout(() => document.addEventListener("click", handler), 100);
      return () => { clearTimeout(t); document.removeEventListener("click", handler); };
    }
  }, [showModelMenu,showQualityMenu,showFeatureMenu,showBuildMenu,showYTMenu,showWebMenu]);

  const toggleFeature = (id: string) => setEnabledFeatures(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const getConfig = () => { const ai = AI_OPTIONS.find(a => a.id === selectedAI)!; const k = getApiKey(ai.provider as "openai"|"anthropic"|"gemini"); return k ? { provider: ai.provider, model: ai.models[quality], apiKey: k } : null; };

  const buildSystem = () => {
    let s = SYSTEM_PROMPT;
    if (enabledFeatures.has("youtube")) s += "\n\n[YOUTUBE MODE ACTIVE: Focus on MAVORI's channel, analyze videos, suggest improvements, give SEO tips]";
    if (enabledFeatures.has("web")) s += "\n\n[WEB RESEARCH ACTIVE: Give latest trends, popular series, upcoming releases with specific names]";
    if (enabledFeatures.has("novels")) s += "\n\n[MANHWA DB ACTIVE: 10+ recommendations per request with name, genre, plot, YouTube potential, similar titles]";
    if (enabledFeatures.has("lightnovels")) s += `\n\n═══ LIGHT NOVEL MODE ACTIVE ═══
Expert in Japanese light novels, Chinese web novels, Korean web novels. Focus on:
- Underrated and hidden gem light novels that most people don't know about
- Completed light novels with good endings
- Light novels with anime adaptations coming soon
- Isekai, romance, fantasy, action, psychological light novels
- Compare light novel vs manga/anime versions
- Recommend based on: title, author, volumes, status, plot (2 sentences), why it's underrated, YouTube recap potential
- Know the difference: Light Novel (Japanese LN), Web Novel (WN), Chinese Novel (CN), Korean Novel (KN)`;
    if (ytLinks.length > 0) s += `\n\n═══ YOUTUBE REFERENCE VIDEOS ═══\nThe user wants to make videos LIKE these reference videos. Analyze the style, format, genre, and content type of these videos and use them as inspiration:\n${ytLinks.map((l, i) => `${i + 1}. ${l}`).join("\n")}\nWhen creating scripts or giving advice, match the style and format of these reference videos.`;
    return s;
  };

  const generateAudio = useCallback(async (scriptText: string, msgIdx: number) => {
    const ak = getApiKey("openai") || getApiKey("gemini"); if (!ak) return;
    const prov = getApiKey("openai") ? "openai" : "gemini";
    const voice = typeof window !== "undefined" ? localStorage.getItem("manhuascript_default_voice") || "cedar" : "cedar";
    try {
      const res = await fetch("/api/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script: scriptText, voice, provider: prov, apiKey: ak }) });
      if (!res.ok) return;
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, audioUrl: url } : m));
      addTTSUsage(scriptText.length);
    } catch {}
  }, []);

  // Fetch YouTube video info from oembed
  const fetchYTInfo = async (url: string): Promise<string> => {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (res.ok) { const d = await res.json(); return `"${d.title}" by ${d.author_name}`; }
    } catch {}
    return url;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const config = getConfig(); if (!config) return;

    // Detect YouTube URLs in the user message and auto-add to references
    const ytUrlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/g;
    const foundUrls = input.match(ytUrlRegex);
    if (foundUrls) {
      foundUrls.forEach(url => { if (!ytLinks.includes(url)) setYtLinks(prev => [...prev, url]); });
    }

    // Fetch info for all YouTube reference links to give AI context
    let ytContext = "";
    if (ytLinks.length > 0 || foundUrls) {
      const allLinks = [...ytLinks, ...(foundUrls || [])].filter((v, i, a) => a.indexOf(v) === i);
      const infos = await Promise.all(allLinks.map(async (link) => {
        const info = await fetchYTInfo(link);
        return `- ${info} (${link})`;
      }));
      ytContext = `\n\nYOUTUBE REFERENCE VIDEOS (fetched info):\n${infos.join("\n")}\nAnalyze these videos' style, content type, and format. When the user asks to create content, match this style.`;
    }

    // Fetch web page content for all added web links
    let webContext = "";
    if (webLinks.length > 0) {
      const pageResults = await Promise.all(webLinks.map(async (link) => {
        try {
          const r = await fetch("/api/fetch-page", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: link }) });
          if (r.ok) { const d = await r.json(); return `\n--- PAGE: ${d.title} (${link}) ---\n${d.text}`; }
        } catch {}
        return `\n--- PAGE: ${link} (failed to fetch) ---`;
      }));
      webContext = `\n\n═══ WEB PAGES PROVIDED BY USER ═══\nThe user has given you these web pages to read. Use this content to answer their questions, extract scripts, find information, or create content based on what's written here:\n${pageResults.join("\n")}`;
    }

    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]); setInput(""); setLoading(true); closeAllMenus();
    try {
      const systemWithYT = buildSystem() + ytContext + webContext;
      const allMsgs = [{ role: "system", content: systemWithYT }, ...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: input }];
      const res = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: allMsgs, provider: config.provider, apiKey: config.apiKey, model: config.model }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      const assistantMsg: ChatMessage = { role: "assistant", content: data.reply };
      if (data.reply.includes("[GENERATE_AUDIO]")) { assistantMsg.content = data.reply.replace("[GENERATE_AUDIO]", "").trim(); assistantMsg.action = "audio"; assistantMsg.actionData = assistantMsg.content; }
      setMessages(prev => [...prev, assistantMsg]);
      addTextUsage(config.model, estimateTokens(input), estimateTokens(data.reply));
      logAI("research", `Chat response (${estimateTokens(data.reply)} tokens)`, config.provider, config.model, estimateTokens(input), estimateTokens(data.reply));
      if (assistantMsg.action === "audio" && assistantMsg.actionData) { const idx = messages.length + 1; setTimeout(() => generateAudio(assistantMsg.actionData!, idx), 500); }
    } catch (err: unknown) { const msg = err instanceof Error ? err.message : "Unknown"; setMessages(prev => [...prev, { role: "assistant", content: `Error: ${msg}` }]); logError("research", "Chat failed", msg, config.provider, config.model); }
    finally { setLoading(false); }
  };

  // ── History handlers ──
  const loadSession = (session: ChatSession) => { setMessages(session.messages); setCurrentSessionId(session.id); };
  const newChat = () => { setMessages([]); setCurrentSessionId(null); };
  const deleteSession = (id: string) => { const h = loadHistory().filter(s => s.id !== id); saveHistory(h); setHistory(h); if (currentSessionId === id) newChat(); };
  const renameSession = (id: string, title: string) => { const h = loadHistory(); const s = h.find(x => x.id === id); if (s) { s.title = title; saveHistory(h); setHistory(h); } setRenamingId(null); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files; if (!f) return; setUploadedFiles(p => [...p, ...Array.from(f).map(x => ({ name: x.name, type: x.type.split("/")[0]||"file", size: x.size>1024*1024?`${(x.size/1024/1024).toFixed(1)}MB`:`${(x.size/1024).toFixed(0)}KB` }))]); };

  const config = getConfig();
  const currentAI = AI_OPTIONS.find(a => a.id === selectedAI)!;
  const currentQuality = QUALITY_OPTIONS.find(q => q.id === quality)!;
  const hasMessages = messages.length > 0;
  const activeFeatureCount = enabledFeatures.size;

  // ── Colored pill menu ──
  const PillMenu = ({ open, children, align = "left", color = "blue" }: { open: boolean; children: React.ReactNode; align?: string; color?: string }) => {
    if (!open) return null;
    const borderColor = color === "red" ? "border-red-500/20" : color === "yellow" ? "border-yellow-500/20" : color === "green" ? "border-emerald-500/20" : color === "lime" ? "border-lime-500/20" : color === "white" ? "border-white/15" : "border-sky-500/20";
    return (
      <div className={`absolute bottom-full ${align === "center" ? "left-1/2 -translate-x-1/2" : align === "right" ? "right-0" : "left-0"} mb-2 w-52 rounded-xl overflow-hidden shadow-2xl shadow-black/60 border ${borderColor} bg-[#0a0a12]/95 backdrop-blur-xl`}
        onClick={e => e.stopPropagation()}>{children}</div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <audio ref={audioRef} onEnded={() => setPlayingAudioIdx(null)} />

      <div className="flex-1 flex">
        {/* ═══ LEFT — Chat History ═══ */}
        {showHistory && (
          <div className="w-64 border-r border-white/[0.04] flex flex-col shrink-0 bg-white/[0.01]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
              <h3 className="text-xs font-semibold text-foreground/70">History</h3>
              <button onClick={newChat} className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-all">
                <PlusCircle className="w-3 h-3" /> New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {history.length === 0 && <p className="text-[11px] text-muted/20 text-center py-8">No history yet</p>}
              {history.map(session => (
                <div key={session.id}
                  className={`group rounded-lg px-3 py-2 cursor-pointer transition-all ${currentSessionId === session.id ? "bg-blue-500/10 border border-blue-500/20" : "hover:bg-white/[0.03] border border-transparent"}`}>
                  {renamingId === session.id ? (
                    <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => renameSession(session.id, renameValue || session.title)}
                      onKeyDown={e => e.key === "Enter" && renameSession(session.id, renameValue || session.title)}
                      autoFocus className="w-full bg-transparent text-xs text-foreground focus:outline-none border-b border-blue-500/30 pb-0.5" />
                  ) : (
                    <div className="flex items-center gap-2" onClick={() => loadSession(session)}>
                      <MessageSquare className="w-3 h-3 text-muted/30 shrink-0" />
                      <p className="text-[11px] text-foreground/60 truncate flex-1">{session.title}</p>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={e => { e.stopPropagation(); setRenamingId(session.id); setRenameValue(session.title); }}
                          className="p-1 rounded hover:bg-white/[0.05] text-muted/30 hover:text-foreground/60"><PenLine className="w-2.5 h-2.5" /></button>
                        <button onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
                          className="p-1 rounded hover:bg-white/[0.05] text-muted/30 hover:text-danger"><Trash className="w-2.5 h-2.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ MAIN ═══ */}
        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 flex flex-col w-full">
          {/* Toggle history button */}
          <button onClick={() => setShowHistory(!showHistory)} className="self-start mt-2 mb-1 p-1.5 rounded-lg text-muted/30 hover:text-muted/60 hover:bg-white/[0.03] transition-all">
            <Menu className="w-4 h-4" />
          </button>

          <div className={`flex-1 flex flex-col ${hasMessages ? "justify-end" : "justify-center"} pb-4`}>
            {!hasMessages && (
              <div className="flex flex-col items-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-semibold text-foreground/80 text-center mb-2">What can I help you with?</h2>
                <p className="text-sm text-muted/40 text-center">Research, scripts, audio, images — ask me anything</p>
              </div>
            )}

            {hasMessages && (
              <div className="space-y-5 overflow-y-auto flex-1 pt-2">
                {messages.filter(m => m.role !== "system").map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                    {msg.role === "assistant" && <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-1"><Bot className="w-3.5 h-3.5 text-blue-400" /></div>}
                    <div className={`max-w-[85%] ${msg.role === "user" ? "bg-white/[0.07] rounded-2xl rounded-br-sm px-4 py-3" : ""}`}>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{msg.content}</div>
                      {msg.audioUrl && (
                        <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <button onClick={() => { if(audioRef.current){if(playingAudioIdx===i){audioRef.current.pause();setPlayingAudioIdx(null);}else{audioRef.current.src=msg.audioUrl!;audioRef.current.play();setPlayingAudioIdx(i);}} }}
                            className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">{playingAudioIdx===i?<Pause className="w-3.5 h-3.5"/>:<Play className="w-3.5 h-3.5 ml-0.5"/>}</button>
                          <div className="flex-1"><p className="text-xs font-medium text-blue-400">Audio Generated</p></div>
                          <button onClick={() => { const a=document.createElement("a");a.href=msg.audioUrl!;a.download=`audio-${Date.now()}.mp3`;a.click(); }} className="p-1.5 rounded-lg text-muted/40 hover:text-blue-400"><Download className="w-3.5 h-3.5"/></button>
                        </div>
                      )}
                      {msg.action === "audio" && !msg.audioUrl && (
                        <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20"><Loader2 className="w-4 h-4 text-violet-400 animate-spin"/><span className="text-xs text-violet-400">Generating audio...</span></div>
                      )}
                    </div>
                    {msg.role === "user" && <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-1"><User className="w-3.5 h-3.5 text-blue-400"/></div>}
                  </div>
                ))}
                {loading && <div className="flex gap-3"><div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0"><Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin"/></div><div className="flex gap-1.5 py-3">{[0,150,300].map(d=><div key={d} className="w-2 h-2 rounded-full bg-blue-400/30 animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</div></div>}
                <div ref={chatEndRef}/>
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">{uploadedFiles.map((f,i)=>(
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass text-[10px] text-muted">
                  {f.type==="image"?<ImageIcon className="w-3 h-3"/>:f.type==="video"?<Video className="w-3 h-3"/>:<FileText className="w-3 h-3"/>}
                  <span className="truncate max-w-20">{f.name}</span>
                  <button onClick={()=>setUploadedFiles(p=>p.filter((_,idx)=>idx!==i))} className="text-muted/20 hover:text-danger"><X className="w-2.5 h-2.5"/></button>
                </div>
              ))}</div>
            )}

            {/* ═══ INPUT BAR ═══ */}
            <div className="w-full max-w-2xl mx-auto">
              <div className="rounded-2xl border border-blue-500/15 bg-white/[0.025] backdrop-blur-xl p-1.5" style={{boxShadow:"0 0 30px rgba(59,130,246,0.06)"}}>
                <div className="flex items-center gap-1.5">
                  <button onClick={()=>fileInputRef.current?.click()} className="p-2 rounded-xl text-muted/30 hover:text-blue-400 transition-all shrink-0"><Paperclip className="w-4 h-4"/></button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.txt,.doc"/>
                  {hasMessages && <button onClick={newChat} className="p-2 rounded-xl text-muted/30 hover:text-danger transition-all shrink-0" title="New chat"><Trash2 className="w-4 h-4"/></button>}
                  <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&handleSend()}
                    placeholder="Ask anything..." disabled={loading||(mounted&&!config)}
                    className="flex-1 bg-transparent px-2 py-3 text-sm text-foreground placeholder:text-muted/30 focus:outline-none disabled:opacity-50"/>
                  <button onClick={handleSend} disabled={loading||!input.trim()||(mounted&&!config)}
                    className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white disabled:opacity-15 hover:bg-blue-600 transition-all shrink-0">
                    {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              {/* ═══ COLORED PILLS ═══ */}
              <div ref={menuRef} className="flex items-center gap-2 mt-2.5 justify-center flex-wrap">

                {/* 🔴 MODEL — RED */}
                <div className="relative">
                  <button onClick={e=>{e.stopPropagation();closeAllMenus();setShowModelMenu(!showModelMenu);}}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${showModelMenu?"border-red-500/40 bg-red-500/15 text-red-400":"border-red-500/20 bg-red-500/5 text-red-400/80 hover:bg-red-500/10 hover:border-red-500/30"}`}>
                    <Cpu className="w-3 h-3"/>{currentAI.label}<ChevronUp className={`w-2.5 h-2.5 transition-transform ${showModelMenu?"":"rotate-180"}`}/>
                  </button>
                  <PillMenu open={showModelMenu} color="red">
                    {AI_OPTIONS.map(ai=>{const hasKey=!!getApiKey(ai.provider as "openai"|"anthropic"|"gemini");const active=selectedAI===ai.id;return(
                      <button key={ai.id} onClick={()=>{if(hasKey){setSelectedAI(ai.id);setShowModelMenu(false);}}} disabled={!hasKey}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${active?"bg-red-500/10 text-red-400":hasKey?"text-foreground/60 hover:bg-white/[0.03]":"text-muted/15 cursor-not-allowed"}`}>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${active?"bg-red-500/20 text-red-400":"bg-white/[0.04] text-muted/40"}`}>{ai.icon}</div>
                        <div className="flex-1"><p className="text-xs font-medium">{ai.label}</p><p className="text-[10px] text-muted/30">{ai.models[quality]}</p></div>
                        {active&&<Check className="w-3 h-3 text-red-400"/>}
                      </button>);})}
                  </PillMenu>
                </div>

                {/* 🟡 QUALITY — YELLOW */}
                <div className="relative">
                  <button onClick={e=>{e.stopPropagation();closeAllMenus();setShowQualityMenu(!showQualityMenu);}}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${showQualityMenu?"border-yellow-500/40 bg-yellow-500/15 text-yellow-400":"border-yellow-500/20 bg-yellow-500/5 text-yellow-400/80 hover:bg-yellow-500/10 hover:border-yellow-500/30"}`}>
                    {currentQuality.icon}{currentQuality.label}<ChevronUp className={`w-2.5 h-2.5 transition-transform ${showQualityMenu?"":"rotate-180"}`}/>
                  </button>
                  <PillMenu open={showQualityMenu} align="center" color="yellow">
                    {QUALITY_OPTIONS.map(q=>{const active=quality===q.id;return(
                      <button key={q.id} onClick={()=>{setQuality(q.id);setShowQualityMenu(false);}}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${active?"bg-yellow-500/10 text-yellow-400":"text-foreground/50 hover:bg-white/[0.03]"}`}>
                        <span className={active?"text-yellow-400":"text-muted/30"}>{q.icon}</span>
                        <div className="flex-1"><p className="text-xs font-medium">{q.label}</p><p className="text-[10px] text-muted/30">{q.desc}</p></div>
                        {active&&<Check className="w-3 h-3 text-yellow-400"/>}
                      </button>);})}
                  </PillMenu>
                </div>

                {/* 🟢 FEATURES — GREEN */}
                <div className="relative">
                  <button onClick={e=>{e.stopPropagation();closeAllMenus();setShowFeatureMenu(!showFeatureMenu);}}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${showFeatureMenu?"border-emerald-500/40 bg-emerald-500/15 text-emerald-400":"border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80 hover:bg-emerald-500/10 hover:border-emerald-500/30"}`}>
                    <Plus className="w-3 h-3"/>Features
                    {activeFeatureCount>0&&<span className="w-4 h-4 rounded-full bg-emerald-500/25 text-emerald-400 text-[9px] font-bold flex items-center justify-center">{activeFeatureCount}</span>}
                    <ChevronUp className={`w-2.5 h-2.5 transition-transform ${showFeatureMenu?"":"rotate-180"}`}/>
                  </button>
                  <PillMenu open={showFeatureMenu} align="right" color="green">
                    <div className="px-4 py-2 border-b border-white/[0.04]"><p className="text-[10px] text-muted/30 uppercase tracking-wider font-semibold">Connect to</p></div>
                    {FEATURES.map(feat=>{const active=enabledFeatures.has(feat.id);return(
                      <button key={feat.id} onClick={()=>toggleFeature(feat.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${active?"bg-emerald-500/8":"hover:bg-white/[0.02]"}`}>
                        <span className={active?"text-emerald-400":"text-muted/30"}>{feat.icon}</span>
                        <div className="flex-1"><p className={`text-xs font-medium ${active?"text-emerald-400":"text-foreground/60"}`}>{feat.label}</p><p className="text-[10px] text-muted/30">{feat.desc}</p></div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${active?"bg-emerald-500 border-emerald-500":"border-white/10"}`}>
                          {active&&<Check className="w-2.5 h-2.5 text-white"/>}
                        </div>
                      </button>);})}
                  </PillMenu>
                </div>

                {/* 🔵 BUILD — LIGHT BLUE */}
                <div className="relative">
                  <button onClick={e=>{e.stopPropagation();closeAllMenus();setShowBuildMenu(!showBuildMenu);}}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${showBuildMenu?"border-sky-500/40 bg-sky-500/15 text-sky-400":"border-sky-500/20 bg-sky-500/5 text-sky-400/80 hover:bg-sky-500/10 hover:border-sky-500/30"}`}>
                    <Hammer className="w-3 h-3"/>Build<ChevronUp className={`w-2.5 h-2.5 transition-transform ${showBuildMenu?"":"rotate-180"}`}/>
                  </button>
                  <PillMenu open={showBuildMenu} align="right" color="lightblue">
                    <div className="px-4 py-2 border-b border-white/[0.04]"><p className="text-[10px] text-muted/30 uppercase tracking-wider font-semibold">Go to</p></div>
                    {BUILD_OPTIONS.map(opt=>(
                      <Link key={opt.id} href={opt.href} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all text-foreground/60 hover:bg-white/[0.03] hover:text-foreground">
                        <span className="text-muted/30">{opt.icon}</span>
                        <div className="flex-1"><p className="text-xs font-medium">{opt.label}</p><p className="text-[10px] text-muted/30">{opt.desc}</p></div>
                      </Link>
                    ))}
                  </PillMenu>
                </div>

                {/* 🟩 YOUTUBE — LEMON GREEN */}
                <div className="relative">
                  <button onClick={e=>{e.stopPropagation();closeAllMenus();setShowYTMenu(!showYTMenu);}}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${showYTMenu?"border-lime-500/40 bg-lime-500/15 text-lime-400":"border-lime-500/20 bg-lime-500/5 text-lime-400/80 hover:bg-lime-500/10 hover:border-lime-500/30"}`}>
                    <Tv className="w-3 h-3"/>YouTube
                    {ytLinks.length>0&&<span className="w-4 h-4 rounded-full bg-lime-500/25 text-lime-400 text-[9px] font-bold flex items-center justify-center">{ytLinks.length}</span>}
                    <ChevronUp className={`w-2.5 h-2.5 transition-transform ${showYTMenu?"":"rotate-180"}`}/>
                  </button>
                  <PillMenu open={showYTMenu} align="right" color="lime">
                    <div className="px-4 py-2 border-b border-white/[0.04]">
                      <p className="text-[10px] text-muted/30 uppercase tracking-wider font-semibold">Reference Videos</p>
                      <p className="text-[9px] text-muted/20 mt-0.5">Add YouTube links — AI will match this style</p>
                    </div>
                    <div className="p-3" onClick={e=>e.stopPropagation()}>
                      <div className="flex gap-1.5 mb-2">
                        <input type="text" value={ytLink} onChange={e=>setYtLink(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter"&&ytLink.trim()){setYtLinks(p=>[...p,ytLink.trim()]);setYtLink("");}}}
                          placeholder="Paste YouTube link..."
                          className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted/30 focus:outline-none focus:border-lime-500/30"/>
                        <button onClick={()=>{if(ytLink.trim()){setYtLinks(p=>[...p,ytLink.trim()]);setYtLink("");}}}
                          className="px-2.5 py-1.5 rounded-lg bg-lime-500/20 text-lime-400 text-[10px] font-medium hover:bg-lime-500/30 transition-all">Add</button>
                      </div>
                      {ytLinks.length===0&&<p className="text-[10px] text-muted/20 text-center py-2">No links added</p>}
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {ytLinks.map((link,i)=>(
                          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03]">
                            <Tv className="w-3 h-3 text-lime-400/50 shrink-0"/>
                            <p className="text-[10px] text-foreground/50 truncate flex-1">{link}</p>
                            <button onClick={()=>setYtLinks(p=>p.filter((_,idx)=>idx!==i))} className="text-muted/20 hover:text-danger shrink-0"><X className="w-2.5 h-2.5"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PillMenu>
                </div>

                {/* ⚪ WEB LINKS — WHITE */}
                <div className="relative">
                  <button onClick={e=>{e.stopPropagation();closeAllMenus();setShowWebMenu(!showWebMenu);}}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${showWebMenu?"border-white/30 bg-white/10 text-white":"border-white/15 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:border-white/20"}`}>
                    <Link2 className="w-3 h-3"/>Web Links
                    {webLinks.length>0&&<span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-bold flex items-center justify-center">{webLinks.length}</span>}
                    <ChevronUp className={`w-2.5 h-2.5 transition-transform ${showWebMenu?"":"rotate-180"}`}/>
                  </button>
                  <PillMenu open={showWebMenu} align="right" color="white">
                    <div className="px-4 py-2 border-b border-white/[0.04]">
                      <p className="text-[10px] text-muted/30 uppercase tracking-wider font-semibold">Web Pages</p>
                      <p className="text-[9px] text-muted/20 mt-0.5">Add page links — AI reads the full content</p>
                    </div>
                    <div className="p-3" onClick={e=>e.stopPropagation()}>
                      <div className="flex gap-1.5 mb-2">
                        <input type="text" value={webLink} onChange={e=>setWebLink(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter"&&webLink.trim()){setWebLinks(p=>[...p,webLink.trim()]);setWebLink("");}}}
                          placeholder="Paste any web page URL..."
                          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted/30 focus:outline-none focus:border-white/20"/>
                        <button onClick={()=>{if(webLink.trim()){setWebLinks(p=>[...p,webLink.trim()]);setWebLink("");}}}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white/80 text-[10px] font-medium hover:bg-white/15 transition-all">Add</button>
                      </div>
                      {webLinks.length===0&&<p className="text-[10px] text-muted/20 text-center py-2">No links added</p>}
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {webLinks.map((link,i)=>(
                          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03]">
                            <Link2 className="w-3 h-3 text-white/30 shrink-0"/>
                            <p className="text-[10px] text-foreground/50 truncate flex-1">{link}</p>
                            <button onClick={()=>setWebLinks(p=>p.filter((_,idx)=>idx!==i))} className="text-muted/20 hover:text-danger shrink-0"><X className="w-2.5 h-2.5"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PillMenu>
                </div>
              </div>
            </div>
          </div>

          {mounted&&!config&&<div className="text-center pb-4"><Link href="/settings" className="text-xs text-amber-400 hover:underline">Add an API key in Settings to start</Link></div>}
        </main>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <div className="w-12 flex flex-col items-center py-4 gap-2 shrink-0">
          <button onClick={()=>{setShowSuggestions(!showSuggestions);setShowUpload(false);}}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showSuggestions?"bg-blue-500/10 text-blue-400":"text-muted/20 hover:text-muted/40 hover:bg-white/[0.03]"}`} title="Ideas">
            <Lightbulb className="w-4 h-4"/>
          </button>
          <button onClick={()=>{setShowUpload(!showUpload);setShowSuggestions(false);}}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showUpload?"bg-blue-500/10 text-blue-400":"text-muted/20 hover:text-muted/40 hover:bg-white/[0.03]"}`} title="Files">
            <FolderOpen className="w-4 h-4"/>
          </button>
        </div>

        {/* Suggestions panel */}
        {showSuggestions&&(
          <div className="w-64 border-l border-white/[0.04] p-4 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Lightbulb className="w-3.5 h-3.5 text-amber-400"/><h3 className="text-xs font-semibold text-foreground/70">Ideas</h3></div><button onClick={()=>setShowSuggestions(false)} className="text-muted/30 hover:text-muted"><X className="w-3 h-3"/></button></div>
            <div className="space-y-1 flex-1 overflow-y-auto">{SUGGESTIONS.map(s=>(<button key={s} onClick={()=>{setInput(s);setShowSuggestions(false);}} className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-muted/50 hover:text-foreground/70 hover:bg-white/[0.03] transition-all leading-relaxed">{s}</button>))}</div>
          </div>
        )}

        {/* Upload panel */}
        {showUpload&&(
          <div className="w-64 border-l border-white/[0.04] p-4 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5 text-blue-400"/><h3 className="text-xs font-semibold text-foreground/70">Files</h3></div><button onClick={()=>setShowUpload(false)} className="text-muted/30 hover:text-muted"><X className="w-3 h-3"/></button></div>
            <button onClick={()=>fileInputRef.current?.click()} className="w-full border-2 border-dashed border-white/[0.06] rounded-xl p-5 flex flex-col items-center gap-1.5 text-muted/25 hover:text-muted/40 hover:border-blue-500/20 transition-all mb-3"><Paperclip className="w-4 h-4"/><span className="text-[10px]">Upload files</span></button>
            <div className="space-y-1 flex-1 overflow-y-auto">
              {uploadedFiles.length===0&&<p className="text-[10px] text-muted/20 text-center py-3">No files</p>}
              {uploadedFiles.map((f,i)=>(<div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.02]">
                {f.type==="image"?<ImageIcon className="w-3 h-3 text-blue-400"/>:f.type==="video"?<Video className="w-3 h-3 text-violet-400"/>:<FileText className="w-3 h-3 text-amber-400"/>}
                <p className="text-[10px] text-foreground/50 truncate flex-1">{f.name}</p>
                <button onClick={()=>setUploadedFiles(p=>p.filter((_,idx)=>idx!==i))} className="text-muted/15 hover:text-danger"><X className="w-2.5 h-2.5"/></button>
              </div>))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
