"use client";

import Header from "@/components/Header";
import FallingThumbnails from "@/components/FallingThumbnails";
import Link from "next/link";
import Image from "next/image";
import { Wand2, ListOrdered, Volume2, Film, Search, ArrowUpRight, ArrowRight } from "lucide-react";
// ArrowRight used for research bar, ArrowUpRight for tool cards

const TOOLS = [
  {
    title: "Script Rewriter",
    subtitle: "Manhwa & Manga",
    description: "Rewrite any transcript into original content. Every page covered, nothing skipped.",
    href: "/rewriter",
    icon: Wand2,
    gradient: "from-violet-500 to-indigo-600",
    glowColor: "rgba(139, 92, 246, 0.25)",
    borderHover: "hover:border-violet-500/30",
    accentColor: "text-violet-400",
  },
  {
    title: "Top 10 Generator",
    subtitle: "Anime Lists",
    description: "Custom topics, preset categories, or your own list. Full voiceover script.",
    href: "/top10",
    icon: ListOrdered,
    gradient: "from-pink-500 to-rose-600",
    glowColor: "rgba(244, 63, 94, 0.25)",
    borderHover: "hover:border-rose-500/30",
    accentColor: "text-rose-400",
  },
  {
    title: "Audio Generator",
    subtitle: "AI Voiceover",
    description: "43 voices across OpenAI and Gemini. Tone-aware cinematic narration.",
    href: "/audio",
    icon: Volume2,
    gradient: "from-cyan-500 to-blue-600",
    glowColor: "rgba(56, 189, 248, 0.25)",
    borderHover: "hover:border-cyan-500/30",
    accentColor: "text-cyan-400",
  },
  {
    title: "Video Creator",
    subtitle: "Novel to Video",
    description: "Script, audio, and anime panel images — generated automatically.",
    href: "/novel",
    icon: Film,
    gradient: "from-orange-500 to-red-600",
    glowColor: "rgba(249, 115, 22, 0.25)",
    borderHover: "hover:border-orange-500/30",
    accentColor: "text-orange-400",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <FallingThumbnails />
      <div className="mesh-bg" />
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        {/* Hero */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Image src="/logo.jpg" alt="Shadow Senpai" width={80} height={80}
                className="w-20 h-20 rounded-2xl object-cover ring-1 ring-white/15 relative z-10" />
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 blur-2xl" />
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gradient mb-4 leading-tight tracking-tight">
            Shadow Senpai
          </h1>
          <p className="text-base text-muted/80 max-w-md mx-auto leading-relaxed">
            AI-powered studio for anime scripts, voiceovers, and visual content.
          </p>
        </div>

        {/* ═══ Research Bar — slim, full width, blue ═══ */}
        <Link href="/research" className="group w-full max-w-3xl mb-10">
          <div className="flex items-center gap-3 px-5 py-3 rounded-full border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:translate-y-[-1px]"
            style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.03) 100%)", boxShadow: "0 0 20px rgba(59,130,246,0.06)" }}>
            <Search className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm text-blue-400/70 flex-1">Research — scripts, audio, images, trends, ask me anything...</span>
            <ArrowRight className="w-4 h-4 text-blue-400/40 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
          </div>
        </Link>

        {/* ═══ 4 Tool Cards — 2x2 grid ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl w-full">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href}
                className="group relative rounded-2xl p-[1px] transition-all duration-500 hover:translate-y-[-3px]">
                <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                  style={{ background: tool.glowColor }} />
                <div className={`relative rounded-2xl p-6 overflow-hidden border border-white/[0.06] ${tool.borderHover} transition-all duration-500`}
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)", backdropFilter: "blur(24px)" }}>
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg`}
                      style={{ boxShadow: `0 4px 20px ${tool.glowColor}` }}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover:bg-white/[0.08] transition-all duration-300">
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-1 tracking-tight">{tool.title}</h2>
                  <p className={`text-[10px] font-semibold ${tool.accentColor} uppercase tracking-[0.15em] mb-3`}>{tool.subtitle}</p>
                  <p className="text-[13px] text-muted/60 leading-relaxed">{tool.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="py-6 text-center relative z-10">
        <p className="text-[11px] text-muted/30 tracking-wide">Shadow Senpai Studio</p>
      </footer>
    </div>
  );
}
