"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import { Wand2, ListOrdered, Volume2, Film, Search, ArrowRight, Play, ChevronRight, Sparkles, ImageIcon, X } from "lucide-react";

// All tools — shown when "Start Creating" is clicked
const ALL_TOOLS = [
  {
    title: "Panel Script Writer",
    subtitle: "Image → Script → Audio",
    description: "Upload manhwa panels — AI reads each image, writes narration, generates audio per panel.",
    href: "/rewriter",
    icon: Wand2,
    gradient: "from-violet-500 to-indigo-600",
    glowColor: "rgba(139, 92, 246, 0.3)",
    tag: "POPULAR",
  },
  {
    title: "Video Creator",
    subtitle: "Novel → Panels → Audio → Images",
    description: "Paste a script, AI generates panels, anime images, and voiceover automatically.",
    href: "/novel",
    icon: Film,
    gradient: "from-orange-500 to-red-600",
    glowColor: "rgba(249, 115, 22, 0.3)",
    tag: "FULL PIPELINE",
  },
  {
    title: "YouTube Creator",
    subtitle: "Raw Novel → Viral Script",
    description: "Paste raw novel chapters — AI rewrites into fast-paced viral YouTube narration.",
    href: "/youtube",
    icon: Play,
    gradient: "from-red-500 to-red-700",
    glowColor: "rgba(239, 68, 68, 0.3)",
    tag: "NEW",
  },
  {
    title: "Image Generator",
    subtitle: "AI Anime Images",
    description: "Generate anime-style images from text prompts. Supports OpenAI and Gemini image models.",
    href: "/novel",
    icon: ImageIcon,
    gradient: "from-emerald-500 to-teal-600",
    glowColor: "rgba(16, 185, 129, 0.3)",
    tag: "AI ART",
  },
  {
    title: "Audio Generator",
    subtitle: "AI Voiceover",
    description: "14 OpenAI + 30 Gemini voices. Cinematic narration with consistent tone.",
    href: "/audio",
    icon: Volume2,
    gradient: "from-cyan-500 to-blue-600",
    glowColor: "rgba(56, 189, 248, 0.3)",
  },
  {
    title: "Top 10 Generator",
    subtitle: "Anime Lists",
    description: "Custom topics, preset categories, or your own list. Full voiceover script.",
    href: "/top10",
    icon: ListOrdered,
    gradient: "from-pink-500 to-rose-600",
    glowColor: "rgba(244, 63, 94, 0.3)",
  },
];

// Fallback videos (used if YouTube API fails)
const FALLBACK_VIDEOS = [
  { id: "xpXpJlmNNNo", title: "10 Years of Love… She CHEATED—Reborn, He Walked Away & She LOST Everything!", views: 0 },
  { id: "QJCtOxUPuKk", title: "Killed By Gods He Is REBORN As A Ruthless Necromancer For Revenge!", views: 0 },
  { id: "E6FPF4vS-Jc", title: "Reborn as a Slave… He Secretly Becomes INVINCIBLE by Acting Weak!", views: 0 },
  { id: "naTxi8fWcbg", title: "The Strongest in History is Reborn as his Great Grandson | 1-37", views: 0 },
  { id: "BCuM7VlBN30", title: "Necromancer of a Prestigious Swordsmanship Family | 1-9", views: 0 },
  { id: "tyCNOfh1QD8", title: "The Strongest in History is Reborn as his Great Grandson | 1-39", views: 0 },
  { id: "6-DXwGJsGuo", title: "She CHEATED — Reborn, He Walked Away & She LOST Everything!", views: 0 },
  { id: "6lpESW96WLE", title: "Don't miss these MANHWAS — Best Manhwa in 2025!", views: 0 },
  { id: "_8csYVAPb9w", title: "The Strongest Warrior Betrayed and Reborn | 1-33", views: 0 },
].map(v => ({ ...v, thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg` }));

function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M views";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K views";
  if (n > 0) return n + " views";
  return "";
}

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [ytVideos, setYtVideos] = useState(FALLBACK_VIDEOS);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Intro plays ONCE per session
  useEffect(() => {
    const played = sessionStorage.getItem("rekvon_intro_played");
    if (played) setShowIntro(false);
  }, []);

  // Fetch YouTube videos with view counts
  useEffect(() => {
    const fetchYT = async () => {
      try {
        const keys = JSON.parse(localStorage.getItem("manhuascript_api_keys") || "{}");
        const apiKey = keys.gemini || "";
        if (!apiKey) return;
        const res = await fetch(`/api/youtube?apiKey=${encodeURIComponent(apiKey)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.videos?.length > 0) {
            setYtVideos(data.videos.map((v: { id: string; title: string; thumbnail: string; views: number }) => ({
              ...v,
              thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
            })));
          }
        }
      } catch {}
    };
    fetchYT();
  }, []);

  const handleVideoEnd = () => {
    setIntroFading(true);
    setTimeout(() => {
      setShowIntro(false);
      sessionStorage.setItem("rekvon_intro_played", "1");
    }, 500);
  };

  // Auto-play video when component mounts
  useEffect(() => {
    if (!showIntro || !videoRef.current) return;

    const video = videoRef.current;

    // Try with audio first
    video.muted = false;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Browser blocked autoplay with audio — retry muted (always works)
        video.muted = true;
        video.play().catch(() => {});
      });
    }

    // Safety: if video takes longer than 60 seconds, skip
    const safety = setTimeout(() => {
      setShowIntro(false);
      sessionStorage.setItem("rekvon_intro_played", "1");
    }, 60000);

    return () => clearTimeout(safety);
  }, [showIntro]);

  // ═══ INTRO VIDEO SPLASH ═══
  if (showIntro) {
    return (
      <div className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${introFading ? "opacity-0" : "opacity-100"}`}>
        <video
          ref={videoRef}
          src="/intro.mp4"
          autoPlay
          playsInline
          onEnded={handleVideoEnd}
          onError={() => { setShowIntro(false); sessionStorage.setItem("rekvon_intro_played", "1"); }}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // ═══ TOOLS OVERLAY — shown when "Start Creating" is clicked ═══
  if (showTools) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back button */}
          <button onClick={() => setShowTools(false)}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8">
            <X className="w-4 h-4" />
            Back to Home
          </button>

          {/* Title */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-2">Choose a Tool</h1>
            <p className="text-white/40">Everything you need to create manhwa content.</p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ALL_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.title} href={tool.href}
                  className="group relative rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all duration-500 hover:translate-y-[-4px]"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}>

                  {/* Top gradient bar */}
                  <div className={`h-1 w-full bg-gradient-to-r ${tool.gradient}`} />

                  {/* Tag */}
                  {"tag" in tool && tool.tag && (
                    <div className="absolute top-4 right-4">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gradient-to-r ${tool.gradient} text-white`}>
                        {tool.tag}
                      </span>
                    </div>
                  )}

                  <div className="p-5">
                    <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-lg`}
                      style={{ boxShadow: `0 4px 20px ${tool.glowColor}` }}>
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

                  {/* Hover glow */}
                  <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
                    style={{ background: tool.glowColor }} />
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

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 via-[#0a0a0a] to-[#0a0a0a]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/10 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <Image src="/rekvon-logo.png" alt="REKVON" width={320} height={80}
                className="h-16 sm:h-20 w-auto object-contain relative z-10" priority />
              <div className="absolute -inset-8 bg-red-600/15 rounded-3xl blur-3xl" />
            </div>

            <p className="text-lg sm:text-xl text-white/60 max-w-lg leading-relaxed mb-8">
              AI-powered studio for manhwa scripts, voiceovers, and visual content.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <button onClick={() => setShowTools(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all hover:scale-105 shadow-lg shadow-red-600/25 cursor-pointer">
                <Wand2 className="w-4 h-4" />
                Start Creating
              </button>
              <Link href="/research"
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/10">
                <Search className="w-4 h-4" />
                Research Lab
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

      {/* ═══ CONTENT YOU CAN CREATE — 3x3 grid ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-red-500" />
            Content You Can Create
          </h2>
          <a href="https://www.youtube.com/@REKVON" target="_blank" rel="noopener noreferrer"
            className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
            View Channel <ArrowRight className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ytVideos.slice(0, 9).map((video) => (
            <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"
              className="group">
              <div className="relative rounded-xl overflow-hidden mb-2.5">
                <img src={video.thumbnail} alt={video.title}
                  className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500" />
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-75 transition-all duration-300">
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
                {/* Duration/views badge */}
                {video.views > 0 && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-white/80 font-medium">
                    {formatViews(video.views)}
                  </div>
                )}
              </div>
              <p className="text-sm text-white/80 group-hover:text-white transition-colors line-clamp-2 leading-snug font-medium">{video.title}</p>
              {video.views > 0 && (
                <p className="text-[11px] text-white/30 mt-1">{formatViews(video.views)}</p>
              )}
            </a>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.05] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/rekvon-logo.png" alt="REKVON" width={80} height={20} className="h-4 w-auto opacity-40" />
            <span className="text-[11px] text-white/20">Studio</span>
          </div>
          <p className="text-[11px] text-white/20">AI-Powered Content Creation</p>
        </div>
      </footer>
    </div>
  );
}
