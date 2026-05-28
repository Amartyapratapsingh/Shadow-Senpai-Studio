"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import { Wand2, ListOrdered, Volume2, Film, Search, ArrowRight, Play, ChevronRight, Sparkles } from "lucide-react";

const CREATION_TOOLS = [
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
];

const UTILITY_TOOLS = [
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

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Intro plays ONCE per session — not when navigating back
  useEffect(() => {
    const played = sessionStorage.getItem("rekvon_intro_played");
    if (played) setShowIntro(false);
  }, []);
  // REKVON YouTube videos — content created using this studio
  const ytVideos = [
    { id: "xpXpJlmNNNo", title: "10 Years of Love… She CHEATED—Reborn, He Walked Away & She LOST Everything!" },
    { id: "QJCtOxUPuKk", title: "Killed By Gods He Is REBORN As A Ruthless Necromancer For Revenge!" },
    { id: "E6FPF4vS-Jc", title: "Reborn as a Slave… He Secretly Becomes INVINCIBLE by Acting Weak!" },
    { id: "naTxi8fWcbg", title: "The Strongest in History is Reborn as his Great Grandson | 1-37" },
    { id: "BCuM7VlBN30", title: "Necromancer of a Prestigious Swordsmanship Family | 1-9" },
    { id: "tyCNOfh1QD8", title: "The Strongest in History is Reborn as his Great Grandson | 1-39" },
    { id: "6-DXwGJsGuo", title: "She CHEATED — Reborn, He Walked Away & She LOST Everything!" },
    { id: "6lpESW96WLE", title: "Don't miss these MANHWAS — Best Manhwa in 2025!" },
    { id: "_8csYVAPb9w", title: "The Strongest Warrior Betrayed and Reborn | 1-33" },
  ].map(v => ({ ...v, thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg` }));

  const handleVideoEnd = () => {
    setIntroFading(true);
    setTimeout(() => {
      setShowIntro(false);
      sessionStorage.setItem("rekvon_intro_played", "1");
    }, 500);
  };

  // Auto-play video as soon as component mounts
  useEffect(() => {
    if (showIntro && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
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
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Header />

      {/* ═══ HERO — Netflix style big banner ═══ */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 via-[#0a0a0a] to-[#0a0a0a]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/10 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="flex flex-col items-center text-center">
            {/* REKVON Logo */}
            <div className="relative mb-6">
              <Image
                src="/rekvon-logo.png"
                alt="REKVON"
                width={320}
                height={80}
                className="h-16 sm:h-20 w-auto object-contain relative z-10"
                priority
              />
              <div className="absolute -inset-8 bg-red-600/15 rounded-3xl blur-3xl" />
            </div>

            <p className="text-lg sm:text-xl text-white/60 max-w-lg leading-relaxed mb-8">
              AI-powered studio for manhwa scripts, voiceovers, and visual content.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <Link href="/rewriter"
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all hover:scale-105 shadow-lg shadow-red-600/25">
                <Wand2 className="w-4 h-4" />
                Start Creating
              </Link>
              <Link href="/research"
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/10">
                <Search className="w-4 h-4" />
                Research Lab
              </Link>
            </div>

            {/* Quick stats */}
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

      {/* ═══ CONTENT MADE WITH REKVON — horizontal scroll row ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-red-500" />
            Content You Can Create
            <ChevronRight className="w-4 h-4 text-white/30" />
          </h2>
          <a href="https://www.youtube.com/@REKVON" target="_blank" rel="noopener noreferrer"
            className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
            View Channel <ArrowRight className="w-3 h-3" />
          </a>
        </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {ytVideos.map((video) => (
              <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"
                className="group flex-shrink-0 w-[260px] sm:w-[300px] snap-start">
                <div className="relative rounded-lg overflow-hidden mb-2">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/70 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">{video.title}</p>
              </a>
            ))}
          </div>
        </section>

      {/* ═══ CREATION TOOLS — Netflix row style ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Creation Tools
            <ChevronRight className="w-4 h-4 text-white/30" />
          </h2>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {CREATION_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href}
                className="group relative flex-shrink-0 w-[300px] sm:w-[340px] snap-start">
                {/* Card */}
                <div className="relative rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all duration-500 hover:translate-y-[-4px]"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}>

                  {/* Top gradient bar */}
                  <div className={`h-1 w-full bg-gradient-to-r ${tool.gradient}`} />

                  {/* Tag badge */}
                  {"tag" in tool && (
                    <div className="absolute top-4 right-4">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gradient-to-r ${tool.gradient} text-white`}>
                        {tool.tag}
                      </span>
                    </div>
                  )}

                  <div className="p-5">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-lg`}
                      style={{ boxShadow: `0 4px 20px ${tool.glowColor}` }}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{tool.title}</h3>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">{tool.subtitle}</p>
                    <p className="text-[13px] text-white/50 leading-relaxed">{tool.description}</p>

                    {/* Arrow */}
                    <div className="mt-4 flex items-center gap-1 text-white/30 group-hover:text-white/60 transition-colors">
                      <span className="text-xs">Open</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Hover glow */}
                <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
                  style={{ background: tool.glowColor }} />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══ UTILITY TOOLS — smaller row ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Utilities
            <ChevronRight className="w-4 h-4 text-white/30" />
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {UTILITY_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href}
                className="group relative rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all duration-500 hover:translate-y-[-2px]"
                style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)" }}>

                <div className="flex items-center gap-4 p-5">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-lg`}
                    style={{ boxShadow: `0 4px 16px ${tool.glowColor}` }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white mb-0.5">{tool.title}</h3>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">{tool.subtitle}</p>
                    <p className="text-[12px] text-white/40 leading-relaxed truncate">{tool.description}</p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all shrink-0" />
                </div>

                {/* Hover glow */}
                <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
                  style={{ background: tool.glowColor }} />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══ RESEARCH BAR — full width ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <Link href="/research" className="group block">
          <div className="flex items-center gap-4 px-6 py-4 rounded-xl border border-white/[0.06] hover:border-blue-500/30 transition-all duration-300"
            style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.06) 0%, rgba(59,130,246,0.02) 100%)" }}>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white/70">Research Lab</p>
              <p className="text-xs text-white/30">Scripts, audio, images, trends — ask anything, get answers instantly.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-400/40 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
          </div>
        </Link>
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
