"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import { Wand2, ListOrdered, Volume2, Film, Search, ArrowRight, Play, Sparkles, ImageIcon, X, Zap, Shield, Globe, Cpu, Star, Quote, ChevronLeft, ChevronRight, Users } from "lucide-react";

// All tools
const ALL_TOOLS = [
  { title: "Panel Script Writer", subtitle: "Image → Script → Audio", description: "Upload manhwa panels — AI reads each image, writes narration, generates audio per panel.", href: "/rewriter", icon: Wand2, gradient: "from-violet-500 to-indigo-600", glowColor: "rgba(139, 92, 246, 0.3)", tag: "POPULAR" },
  { title: "Video Creator", subtitle: "Novel → Panels → Audio → Images", description: "Paste a script, AI generates panels, anime images, and voiceover automatically.", href: "/novel", icon: Film, gradient: "from-orange-500 to-red-600", glowColor: "rgba(249, 115, 22, 0.3)", tag: "FULL PIPELINE" },
  { title: "YouTube Creator", subtitle: "Raw Novel → Viral Script", description: "Paste raw novel chapters — AI rewrites into fast-paced viral YouTube narration.", href: "/youtube", icon: Play, gradient: "from-red-500 to-red-700", glowColor: "rgba(239, 68, 68, 0.3)", tag: "NEW" },
  { title: "Image Generator", subtitle: "AI Anime Images", description: "Generate anime-style images from text prompts. Supports OpenAI and Gemini models.", href: "/novel", icon: ImageIcon, gradient: "from-emerald-500 to-teal-600", glowColor: "rgba(16, 185, 129, 0.3)", tag: "AI ART" },
  { title: "Audio Generator", subtitle: "AI Voiceover", description: "14 OpenAI + 30 Gemini voices. Cinematic narration with consistent tone.", href: "/audio", icon: Volume2, gradient: "from-cyan-500 to-blue-600", glowColor: "rgba(56, 189, 248, 0.3)" },
  { title: "Top 10 Generator", subtitle: "Anime Lists", description: "Custom topics, preset categories, or your own list. Full voiceover script.", href: "/top10", icon: ListOrdered, gradient: "from-pink-500 to-rose-600", glowColor: "rgba(244, 63, 94, 0.3)" },
];

function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M views";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K views";
  if (n > 0) return n + " views";
  return "";
}

// Anime style videos (6)
const ANIME_VIDEOS = [
  { id: "qy6UrpxUGxw", title: "", views: 0 },
  { id: "ECsqbKHSteQ", title: "", views: 0 },
  { id: "Gb77ep0rNLg", title: "", views: 0 },
  { id: "5G_XkMF_u6k", title: "", views: 0 },
  { id: "2TrJm6mWowY", title: "", views: 0 },
  { id: "N2ufWLtP-Ek", title: "", views: 0 },
].map(v => ({ ...v, thumbnail: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg` }));

// Natural/Human style videos (6)
const HUMAN_VIDEOS_LIST = [
  { id: "F5X_mhgzRkI", title: "", views: 0 },
  { id: "yX3fAwdQmuk", title: "", views: 0 },
  { id: "S2so5vG1rok", title: "", views: 0 },
  { id: "Xnalw8J5iVk", title: "", views: 0 },
  { id: "ZyeFaXrC-VI", title: "", views: 0 },
  { id: "gmTLoWhcLz0", title: "", views: 0 },
].map(v => ({ ...v, thumbnail: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg` }));

// Features
const FEATURES = [
  { icon: Cpu, title: "3 AI Providers", description: "OpenAI, Anthropic Claude, and Google Gemini — choose the best model for each task.", color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Volume2, title: "44+ AI Voices", description: "14 OpenAI + 30 Gemini voices with consistent tone, zero pauses, natural flow.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: Globe, title: "Hindi & English", description: "Full support for both languages. Simple conversational Hindi — not complex Shudh Hindi.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: ImageIcon, title: "AI Image Generation", description: "Anime-style panel images with character consistency, outfit changes, and location accuracy.", color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: Zap, title: "Auto-Fallback", description: "If one AI model hits rate limits, automatically switches to the next — zero downtime.", color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: Shield, title: "Character Registry", description: "AI remembers character faces, names, and genders across 100+ panels. Never confuses characters.", color: "text-rose-400", bg: "bg-rose-500/10" },
];

// User feedback/reviews
const REVIEWS = [
  { name: "Arjun S.", role: "Manhwa YouTuber", text: "REKVON changed my workflow completely. I used to spend 8 hours on one video — now it takes 2 hours. The AI narration is so natural, my viewers can't tell it's AI.", stars: 5 },
  { name: "Priya M.", role: "Content Creator", text: "The Panel Script Writer is insane. I just upload my manhwa pages and it writes the perfect Hindi script for each panel. Audio quality is theater-level.", stars: 5 },
  { name: "Vikram R.", role: "Web Novel Channel", text: "YouTube Creator tool is a game-changer. I paste the raw novel chapter and it rewrites into that fast-paced viral style automatically. My retention rate went from 30% to 65%.", stars: 5 },
  { name: "Sneha K.", role: "Anime Reviewer", text: "44 voices and they all sound consistent across panels. No more weird pitch jumps or speed changes. Finally a tool that understands Hindi narration.", stars: 5 },
  { name: "Rahul D.", role: "Manhwa Recap Hindi", text: "The character registry feature is genius. Same face, same name, same gender across 100 panels. Other tools can't do this. REKVON is levels ahead.", stars: 5 },
];

function VideoCard({ video }: { video: { id: string; title: string; thumbnail: string; views?: number } }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div>
        <div className="relative rounded-xl overflow-hidden mb-2.5 aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="w-full h-full absolute inset-0"
          />
        </div>
        <p className="text-sm text-white font-medium line-clamp-2 leading-snug">{video.title}</p>
        {video.views !== undefined && video.views > 0 && (
          <p className="text-[11px] text-white/30 mt-1">{formatViews(video.views)}</p>
        )}
      </div>
    );
  }

  return (
    <button onClick={() => setPlaying(true)} className="group text-left w-full">
      <div className="relative rounded-xl overflow-hidden mb-2.5">
        <img src={video.thumbnail} alt={video.title} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      </div>
      <p className="text-sm text-white/80 group-hover:text-white transition-colors line-clamp-2 leading-snug font-medium">{video.title}</p>
      {video.views !== undefined && video.views > 0 && (
        <p className="text-[11px] text-white/30 mt-1">{formatViews(video.views)}</p>
      )}
    </button>
  );
}

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [animeVideos, setAnimeVideos] = useState(ANIME_VIDEOS);
  const [humanVideos, setHumanVideos] = useState(HUMAN_VIDEOS_LIST);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const played = sessionStorage.getItem("rekvon_intro_played");
    if (played) setShowIntro(false);
  }, []);

  // Fetch video titles & views from YouTube API for our hardcoded video IDs
  useEffect(() => {
    const fetchTitles = async () => {
      try {
        const keys = JSON.parse(localStorage.getItem("manhuascript_api_keys") || "{}");
        const apiKey = keys.gemini || "";
        if (!apiKey) return;

        const allIds = [...ANIME_VIDEOS, ...HUMAN_VIDEOS_LIST].map(v => v.id).join(",");
        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${allIds}&key=${apiKey}`);
        if (!res.ok) return;
        const data = await res.json();

        const videoMap: Record<string, { title: string; views: number; thumbnail: string }> = {};
        for (const item of data.items || []) {
          videoMap[item.id] = {
            title: item.snippet?.title || "",
            views: parseInt(item.statistics?.viewCount || "0"),
            thumbnail: item.snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
          };
        }

        setAnimeVideos(prev => prev.map(v => videoMap[v.id] ? { ...v, ...videoMap[v.id] } : v));
        setHumanVideos(prev => prev.map(v => videoMap[v.id] ? { ...v, ...videoMap[v.id] } : v));
      } catch {}
    };
    fetchTitles();
  }, []);

  const handleVideoEnd = () => {
    setIntroFading(true);
    setTimeout(() => { setShowIntro(false); sessionStorage.setItem("rekvon_intro_played", "1"); }, 500);
  };

  useEffect(() => {
    if (!showIntro || !videoRef.current) return;
    const video = videoRef.current;
    video.muted = false;
    const p = video.play();
    if (p) p.catch(() => { video.muted = true; video.play().catch(() => {}); });
    const safety = setTimeout(() => { setShowIntro(false); sessionStorage.setItem("rekvon_intro_played", "1"); }, 60000);
    return () => clearTimeout(safety);
  }, [showIntro]);

  // Auto-rotate reviews
  useEffect(() => {
    const interval = setInterval(() => setReviewIdx(prev => (prev + 1) % REVIEWS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  // ═══ INTRO ═══
  if (showIntro) {
    return (
      <div className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${introFading ? "opacity-0" : "opacity-100"}`}>
        <video ref={videoRef} src="/intro.mp4" autoPlay playsInline onEnded={handleVideoEnd}
          onError={() => { setShowIntro(false); sessionStorage.setItem("rekvon_intro_played", "1"); }}
          className="w-full h-full object-contain" />
      </div>
    );
  }

  // ═══ TOOLS PAGE ═══
  if (showTools) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button onClick={() => setShowTools(false)} className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8">
            <X className="w-4 h-4" /> Back to Home
          </button>
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-2">Choose a Tool</h1>
            <p className="text-white/40">Everything you need to create manhwa content.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ALL_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.title} href={tool.href} className="group relative rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all duration-500 hover:translate-y-[-4px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}>
                  <div className={`h-1 w-full bg-gradient-to-r ${tool.gradient}`} />
                  {"tag" in tool && tool.tag && (
                    <div className="absolute top-4 right-4">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gradient-to-r ${tool.gradient} text-white`}>{tool.tag}</span>
                    </div>
                  )}
                  <div className="p-5">
                    <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-lg`} style={{ boxShadow: `0 4px 20px ${tool.glowColor}` }}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">{tool.title}</h3>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">{tool.subtitle}</p>
                    <p className="text-[13px] text-white/50 leading-relaxed">{tool.description}</p>
                    <div className="mt-4 flex items-center gap-1 text-white/30 group-hover:text-white/60 transition-colors">
                      <span className="text-xs">Open</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" style={{ background: tool.glowColor }} />
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // ═══ MAIN HOMEPAGE ═══
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Header />

      {/* ═══ RED GLOW — covers hero + video sections, then fades ═══ */}
      <div className="relative">
        {/* Giant radial glow that stretches from top all the way down past the video sections */}
        <div className="absolute top-0 left-0 right-0 h-[1600px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 90% 50% at 50% 15%, rgba(180, 20, 20, 0.18) 0%, rgba(130, 10, 10, 0.10) 25%, rgba(80, 5, 5, 0.05) 50%, transparent 75%)" }} />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-visible">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="flex flex-col items-center text-center">
            {/* BIGGER logo */}
            <div className="relative mb-8">
              <Image src="/rekvon-logo.png" alt="REKVON" width={500} height={120} className="h-24 sm:h-32 lg:h-36 w-auto object-contain relative z-10" priority />
              {/* Glow behind logo */}
              <div className="absolute inset-0 -m-24"
                style={{ background: "radial-gradient(ellipse at center, rgba(220, 30, 30, 0.22) 0%, rgba(150, 10, 10, 0.10) 40%, transparent 70%)" }} />
            </div>
            <p className="text-lg sm:text-xl text-white/60 max-w-lg leading-relaxed mb-8">AI-powered studio for manhwa scripts, voiceovers, and visual content.</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <button onClick={() => setShowTools(true)} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all hover:scale-105 shadow-lg shadow-red-600/25 cursor-pointer">
                <Wand2 className="w-4 h-4" /> Start Creating
              </button>
              <Link href="/research" className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/10">
                <Search className="w-4 h-4" /> Research Lab
              </Link>
            </div>
            <div className="flex items-center gap-6 text-xs text-white/30">
              <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-red-400" /> 3 AI Providers</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>44+ Voices</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>Hindi & English</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ANIME STYLE VIDEOS — 2 rows × 3 ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-red-500" /> Anime Style Content
          </h2>
          <a href="https://www.youtube.com/@REKVON" target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
            View Channel <ArrowRight className="w-3 h-3" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {animeVideos.slice(0, 6).map(v => <VideoCard key={v.id} video={v} />)}
        </div>
      </section>

      {/* ═══ NATURAL/HUMAN STYLE VIDEOS — 2 rows × 3 ═══ */}
      {humanVideos.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400" /> Natural Style Content
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {humanVideos.slice(0, 6).map(v => <VideoCard key={v.id} video={v} />)}
          </div>
        </section>
      )}

      </div>{/* end of red glow wrapper */}

      {/* ═══ FEATURES — DRAMATIC ═══ */}
      <section className="relative py-20 overflow-hidden">
        {/* Dramatic background glow */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(120, 20, 20, 0.08) 0%, transparent 70%)" }} />
        {/* Animated gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(220,40,40,0.3) 20%, rgba(220,40,40,0.5) 50%, rgba(220,40,40,0.3) 80%, transparent 100%)" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-red-500 text-xs font-bold uppercase tracking-[0.3em] mb-3">POWERFUL FEATURES</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Why <span className="text-red-500">REKVON</span>?</h2>
            <p className="text-white/40 text-sm max-w-md mx-auto">Everything you need to create professional content — powered by cutting-edge AI.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const gradientMap: Record<string, string> = {
                "text-violet-400": "from-violet-500 to-violet-400",
                "text-cyan-400": "from-cyan-500 to-cyan-400",
                "text-emerald-400": "from-emerald-500 to-emerald-400",
                "text-orange-400": "from-orange-500 to-orange-400",
                "text-amber-400": "from-amber-500 to-amber-400",
                "text-rose-400": "from-rose-500 to-rose-400",
              };
              return (
                <div key={f.title} className="feature-card group relative rounded-2xl p-6 overflow-hidden border border-white/[0.06] hover:border-red-500/30 transition-all duration-700 hover:translate-y-[-6px]"
                  style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)", animationDelay: `${i * 700}ms` }}>

                  {/* Auto glow effect */}
                  <div className="absolute inset-0"
                    style={{ background: "radial-gradient(ellipse at center, rgba(220,40,40,0.04) 0%, transparent 70%)", animation: `featureGlow 4s ease-in-out infinite ${i * 0.7}s` }} />

                  {/* Top accent line — auto animates */}
                  <div className={`feature-line absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${gradientMap[f.color] || "from-red-500 to-red-400"}`}
                    style={{ animationDelay: `${i * 0.5}s` }} />

                  <div className="relative">
                    <div className={`feature-icon w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-5`}
                      style={{ animationDelay: `${i * 0.3}s` }}>
                      <Icon className={`w-6 h-6 ${f.color}`} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(220,40,40,0.2) 30%, rgba(220,40,40,0.3) 50%, rgba(220,40,40,0.2) 70%, transparent 100%)" }} />
      </section>

      {/* ═══ REVIEWS — CINEMATIC ═══ */}
      <section className="relative py-20 overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 30% 50%, rgba(220, 40, 40, 0.05) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 70% 60%, rgba(200, 100, 20, 0.04) 0%, transparent 60%)" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-amber-500 text-xs font-bold uppercase tracking-[0.3em] mb-3">TESTIMONIALS</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">What Creators <span className="text-amber-400">Say</span></h2>
            <p className="text-white/40 text-sm max-w-md mx-auto">Real feedback from content creators building with REKVON.</p>
          </div>

          {/* Desktop: 3 + 2 layout */}
          <div className="hidden md:grid grid-cols-3 gap-6">
            {REVIEWS.slice(0, 3).map((review, i) => (
              <div key={i} className="review-card group relative rounded-2xl p-7 overflow-hidden border border-white/[0.06] hover:border-amber-500/20 transition-all duration-700 hover:translate-y-[-4px]"
                style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)" }}>
                {/* Auto glow */}
                <div className="absolute inset-0"
                  style={{ background: "radial-gradient(ellipse at top, rgba(250, 200, 50, 0.04) 0%, transparent 60%)", animation: "reviewGlow 5s ease-in-out infinite" }} />
                <div className="relative">
                  <div className="flex items-center gap-1 mb-5">
                    {Array.from({ length: review.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400 star-glow" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 text-amber-500/20 mb-4" />
                  <p className="text-[14px] text-white/60 leading-relaxed mb-6 group-hover:text-white/80 transition-colors duration-300">{review.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${["#ef4444,#f97316", "#8b5cf6,#6366f1", "#06b6d4,#3b82f6", "#10b981,#059669", "#f59e0b,#ef4444"][i % 5]})` }}>
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{review.name}</p>
                      <p className="text-[11px] text-white/30">{review.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:grid grid-cols-2 gap-6 mt-6">
            {REVIEWS.slice(3).map((review, i) => (
              <div key={i} className="review-card group relative rounded-2xl p-7 overflow-hidden border border-white/[0.06] hover:border-amber-500/20 transition-all duration-700 hover:translate-y-[-4px]"
                style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)" }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{ background: "radial-gradient(ellipse at top, rgba(250, 200, 50, 0.04) 0%, transparent 60%)" }} />
                <div className="relative">
                  <div className="flex items-center gap-1 mb-5">
                    {Array.from({ length: review.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400 star-glow" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 text-amber-500/20 mb-4" />
                  <p className="text-[14px] text-white/60 leading-relaxed mb-6 group-hover:text-white/80 transition-colors duration-300">{review.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${["#f59e0b,#ef4444", "#10b981,#059669"][i % 2]})` }}>
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{review.name}</p>
                      <p className="text-[11px] text-white/30">{review.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: single carousel */}
          <div className="md:hidden">
            <div className="group relative rounded-2xl p-7 overflow-hidden border border-white/[0.06]"
              style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)" }}>
              <div className="flex items-center gap-1 mb-5">
                {Array.from({ length: REVIEWS[reviewIdx].stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400 star-glow" />
                ))}
              </div>
              <Quote className="w-6 h-6 text-amber-500/20 mb-4" />
              <p className="text-[14px] text-white/60 leading-relaxed mb-6">{REVIEWS[reviewIdx].text}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    {REVIEWS[reviewIdx].name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{REVIEWS[reviewIdx].name}</p>
                    <p className="text-[11px] text-white/30">{REVIEWS[reviewIdx].role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setReviewIdx(prev => prev === 0 ? REVIEWS.length - 1 : prev - 1)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-white/50" />
                  </button>
                  <button onClick={() => setReviewIdx(prev => (prev + 1) % REVIEWS.length)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ChevronRight className="w-4 h-4 text-white/50" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-5">
              {REVIEWS.map((_, i) => (
                <button key={i} onClick={() => setReviewIdx(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === reviewIdx ? "bg-amber-400 w-6" : "bg-white/15 w-1.5"}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.05] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/rekvon-logo.png" alt="REKVON" width={80} height={20} className="h-4 w-auto opacity-40" />
            <span className="text-[11px] text-white/20">Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-[11px] text-white/30 hover:text-white/60 transition-colors">About Us</Link>
            <a href="https://www.youtube.com/@REKVON" target="_blank" rel="noopener noreferrer" className="text-[11px] text-white/30 hover:text-white/60 transition-colors">YouTube</a>
            <Link href="/settings" className="text-[11px] text-white/30 hover:text-white/60 transition-colors">Settings</Link>
          </div>
          <p className="text-[11px] text-white/20">AI-Powered Content Creation</p>
        </div>
      </footer>
    </div>
  );
}
