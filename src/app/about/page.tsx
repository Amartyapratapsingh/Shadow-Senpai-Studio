"use client";

import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Play, Mail, Sparkles, Users, Target, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="relative inline-block mb-6">
            <Image src="/rekvon-logo.png" alt="REKVON" width={240} height={60} className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">About REKVON</h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
            We turn the best web novels, manhwa, and manga into cinematic Hindi narrations — so you can experience the full story without reading a single chapter.
          </p>
        </div>

        {/* Story */}
        <div className="mb-16">
          <div className="rounded-2xl border border-white/[0.06] p-8" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)" }}>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400" /> Our Story
            </h2>
            <div className="space-y-4 text-white/50 text-sm leading-relaxed">
              <p>
                REKVON started with a simple idea — what if you could watch manhwa and web novel stories like a movie, in Hindi, with cinematic narration and anime visuals?
              </p>
              <p>
                We built an AI-powered studio that does everything: reads manhwa panels, writes natural Hindi scripts, generates consistent anime images, and creates professional voiceovers — all automatically. What used to take days of manual work now takes hours.
              </p>
              <p>
                Our content reaches millions of viewers across India, Pakistan, Bangladesh, and Nepal. Every week, we bring new stories to life — revenge arcs, system manhwa, OP MC stories, and more — in the language our audience speaks every day.
              </p>
            </div>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
          <div className="rounded-2xl border border-white/[0.06] p-6" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)" }}>
            <Target className="w-8 h-8 text-red-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Our Mission</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Make manhwa, manga, and web novel stories accessible to Hindi-speaking audiences through AI-powered cinematic narration. No reading required — just watch, listen, and enjoy.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] p-6" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)" }}>
            <Sparkles className="w-8 h-8 text-amber-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Our Vision</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Become the #1 AI-powered content creation studio for anime and manhwa creators worldwide. We want every storyteller to have Hollywood-level tools at their fingertips.
            </p>
          </div>
        </div>

        {/* What We Cover */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" /> What We Cover
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              "System & Regression Stories",
              "Betrayal & Revenge Arcs",
              "Money/Wealth System",
              "Harem & Romance",
              "Reincarnation Stories",
              "Overpowered MC",
              "Villain MC Stories",
              "Academy & School Arcs",
              "Solo Leveling Type",
            ].map((genre) => (
              <div key={genre} className="rounded-lg border border-white/[0.06] px-4 py-3 text-center">
                <p className="text-xs text-white/60 font-medium">{genre}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-white/[0.06] p-8 text-center" style={{ background: "linear-gradient(180deg, rgba(239,68,68,0.05) 0%, rgba(255,255,255,0.01) 100%)" }}>
          <h2 className="text-xl font-bold text-white mb-2">Get in Touch</h2>
          <p className="text-white/40 text-sm mb-6">Business inquiries, collaborations, or just want to say hi?</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="mailto:rekvonyt@gmail.com" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-all border border-white/10">
              <Mail className="w-4 h-4" /> rekvonyt@gmail.com
            </a>
            <a href="https://www.youtube.com/@REKVON" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all">
              <Play className="w-4 h-4" /> YouTube Channel
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/[0.05] py-6 text-center">
        <p className="text-[11px] text-white/20">REKVON Studio — AI-Powered Content Creation</p>
      </footer>
    </div>
  );
}
