"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import { Wand2, ListOrdered, Volume2, Film, ArrowRight, ArrowDown, Play, ImageIcon, X, Cpu, TrendingUp, MessageSquare, Mail } from "lucide-react";

// AI tools overlay
const ALL_TOOLS = [
  { title: "Panel Script Writer", subtitle: "Image → Script → Audio", description: "Upload manhwa panels — AI reads each image, writes narration, generates audio per panel.", href: "/rewriter", icon: Wand2, gradient: "from-violet-500 to-indigo-600", glowColor: "rgba(139, 92, 246, 0.3)", tag: "POPULAR" },
  { title: "Video Creator", subtitle: "Novel → Panels → Audio → Images", description: "Paste a script, AI generates panels, anime images, and voiceover automatically.", href: "/novel", icon: Film, gradient: "from-orange-500 to-red-600", glowColor: "rgba(249, 115, 22, 0.3)", tag: "FULL PIPELINE" },
  { title: "YouTube Creator", subtitle: "Raw Novel → Viral Script", description: "Paste raw novel chapters — AI rewrites into fast-paced viral YouTube narration.", href: "/youtube", icon: Play, gradient: "from-red-500 to-red-700", glowColor: "rgba(239, 68, 68, 0.3)", tag: "NEW" },
  { title: "Image Generator", subtitle: "AI Anime Images", description: "Generate anime-style images from text prompts.", href: "/novel", icon: ImageIcon, gradient: "from-emerald-500 to-teal-600", glowColor: "rgba(16, 185, 129, 0.3)", tag: "AI ART" },
  { title: "Audio Generator", subtitle: "AI Voiceover", description: "14 OpenAI + 30 Gemini voices. Cinematic narration.", href: "/audio", icon: Volume2, gradient: "from-cyan-500 to-blue-600", glowColor: "rgba(56, 189, 248, 0.3)" },
  { title: "Top 10 Generator", subtitle: "Anime Lists", description: "Custom topics, preset categories, full voiceover script.", href: "/top10", icon: ListOrdered, gradient: "from-pink-500 to-rose-600", glowColor: "rgba(244, 63, 94, 0.3)" },
];

const PILLARS = [
  { icon: Film, title: "Creator\nServices", subtitle: "FOR YOUTUBERS & CREATORS", number: "01", description: "Professional video editors, channel managers, content strategy, and growth tips.", features: ["Video Editing", "Channel Management", "Content Strategy", "Thumbnail Design"], gradient: "from-red-500 to-orange-600", glow: "rgba(239,68,68,0.15)", accent: "#ef4444", href: "/services/creators", isAI: false },
  { icon: Cpu, title: "AI\nStudio", subtitle: "AI-POWERED TOOLS", number: "02", description: "Script writing, voiceover generation, anime images, and manhwa panel narration.", features: ["Panel Script Writer", "Video Creator", "Audio Generator", "Image Generation"], gradient: "from-violet-500 to-indigo-600", glow: "rgba(139,92,246,0.15)", accent: "#8b5cf6", href: "#", isAI: true },
  { icon: TrendingUp, title: "Growth &\nMarketing", subtitle: "SCALE YOUR CHANNEL", number: "03", description: "PR campaigns, content distribution, engagement boosting, and paid promotions.", features: ["PR Campaigns", "Paid Promotions", "SEO Optimization", "Analytics"], gradient: "from-emerald-500 to-teal-600", glow: "rgba(16,185,129,0.15)", accent: "#10b981", href: "/services/growth", isAI: false },
  { icon: MessageSquare, title: "Community\n& Tech", subtitle: "BUILD & CONNECT", number: "04", description: "Discord setup, community management, bot development, and tech solutions.", features: ["Discord Setup", "Bot Development", "Website Dev", "Tech Support"], gradient: "from-cyan-500 to-blue-600", glow: "rgba(6,182,212,0.15)", accent: "#06b6d4", href: "/services/community", isAI: false },
];

// Scroll reveal hook
function useReveal(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const played = sessionStorage.getItem("rekvon_intro_played");
    if (played) setShowIntro(false);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setIntroFading(true);
    setTimeout(() => {
      setShowIntro(false);
      sessionStorage.setItem("rekvon_intro_played", "1");
      // Check if page was already loaded before (same session)
      if (!sessionStorage.getItem("rekvon_loaded")) {
        setIsLoading(true);
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (!showIntro || !introVideoRef.current) return;
    const v = introVideoRef.current;
    v.muted = false;
    const p = v.play();
    if (p) p.catch(() => { v.muted = true; v.play().catch(() => {}); });
    const t = setTimeout(() => { setShowIntro(false); sessionStorage.setItem("rekvon_intro_played", "1"); }, 60000);
    return () => clearTimeout(t);
  }, [showIntro]);

  // Track video time for card reveals (MUST be before any conditional returns)
  const [videoTime, setVideoTime] = useState(0);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadComplete, setLoadComplete] = useState(false);

  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    const handleTime = () => setVideoTime(v.currentTime);
    v.addEventListener("timeupdate", handleTime);
    return () => v.removeEventListener("timeupdate", handleTime);
  }, [showIntro, showTools, isLoading]);

  // After intro ends → start loading animation
  useEffect(() => {
    if (!isLoading) return;
    let progress = 0;
    const interval = setInterval(() => {
      // Fast start, slow middle, fast end
      if (progress < 30) progress += Math.random() * 8 + 4;
      else if (progress < 70) progress += Math.random() * 3 + 1;
      else if (progress < 90) progress += Math.random() * 5 + 2;
      else progress += Math.random() * 3 + 1;

      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => { setLoadComplete(true); sessionStorage.setItem("rekvon_loaded", "1"); setTimeout(() => setIsLoading(false), 600); }, 400);
      }
      setLoadProgress(Math.min(100, Math.round(progress)));
    }, 80);
    return () => clearInterval(interval);
  }, [isLoading]);

  // ═══ INTRO SPLASH ═══
  if (showIntro) {
    return (
      <div className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${introFading ? "opacity-0" : "opacity-100"}`}>
        <video ref={introVideoRef} src="/intro.mp4" autoPlay playsInline onEnded={handleVideoEnd}
          onError={() => { setShowIntro(false); sessionStorage.setItem("rekvon_intro_played", "1"); }}
          className="w-full h-full object-contain" />
      </div>
    );
  }

  // ═══ LOADING SCREEN ═══
  if (isLoading) {
    return (
      <div className={`fixed inset-0 z-[9998] bg-[#0a0a0a] flex flex-col items-center justify-center transition-opacity duration-500 ${loadComplete ? "opacity-0" : "opacity-100"}`}>
        {/* REKVON logo */}
        <Image src="/rekvon-logo.png" alt="REKVON" width={200} height={50} className="h-10 w-auto mb-12 opacity-60" />

        {/* Percentage counter */}
        <div className="relative mb-8">
          <span className="text-6xl sm:text-7xl font-black text-white tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
            {loadProgress}
          </span>
          <span className="text-2xl font-light text-white/30 ml-1">%</span>
        </div>

        {/* Progress bar */}
        <div className="w-64 sm:w-80 h-[2px] bg-white/[0.06] rounded-full overflow-hidden mb-6">
          <div className="h-full rounded-full transition-all duration-200 ease-out"
            style={{ width: `${loadProgress}%`, background: "linear-gradient(90deg, #ef4444, #f97316, #ef4444)" }} />
        </div>

        {/* Loading text */}
        <p className="text-[10px] text-white/20 uppercase tracking-[0.3em]">
          {loadProgress < 30 ? "Initializing" : loadProgress < 60 ? "Loading assets" : loadProgress < 90 ? "Preparing experience" : "Almost ready"}
        </p>

        {/* Animated dots */}
        <div className="flex gap-1.5 mt-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500/60"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // ═══ TOOLS OVERLAY ═══
  if (showTools) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button onClick={() => setShowTools(false)} className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8"><X className="w-4 h-4" /> Back</button>
          <h1 className="text-3xl font-bold text-white mb-2">AI Studio</h1>
          <p className="text-white/40 mb-10">Choose a tool to start creating.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ALL_TOOLS.map((t) => { const I = t.icon; return (
              <Link key={t.title} href={t.href} className="group relative rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all duration-500 hover:translate-y-[-4px]" style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.06)0%,rgba(255,255,255,0.02)100%)" }}>
                <div className={`h-1 w-full bg-gradient-to-r ${t.gradient}`} />
                {"tag" in t && t.tag && <div className="absolute top-4 right-4"><span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gradient-to-r ${t.gradient} text-white`}>{t.tag}</span></div>}
                <div className="p-5">
                  <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`} style={{ boxShadow: `0 4px 20px ${t.glowColor}` }}><I className="w-5 h-5 text-white" /></div>
                  <h3 className="text-base font-bold text-white mb-1">{t.title}</h3>
                  <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">{t.subtitle}</p>
                  <p className="text-[13px] text-white/50 leading-relaxed">{t.description}</p>
                </div>
              </Link>
            ); })}
          </div>
        </main>
      </div>
    );
  }

  // ═══ MAIN PAGE ═══
  return (
    <div className="bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* ═══ HERO — Cinematic video with logo + auto-revealing cards ═══ */}
      <section className="relative min-h-[200vh] overflow-hidden">
        {/* Sticky video container */}
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Video background — plays once, stops at end */}
          <video ref={heroVideoRef} src="/hero-bg.mp4" autoPlay muted playsInline
            className="absolute inset-0 w-full h-full object-cover" />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, transparent 0%, rgba(0,0,0,0.6) 100%)" }} />

          {/* REKVON Logo — parallax up on scroll */}
          <div className="absolute inset-0 flex items-center justify-center z-10"
            style={{ transform: `translateY(${scrollY * -0.3}px)`, opacity: Math.max(0, 1 - scrollY / 500) }}>
            <div className="text-center px-4">
              <Image src="/rekvon-logo.png" alt="REKVON" width={600} height={150}
                className="h-20 sm:h-28 lg:h-40 w-auto object-contain mx-auto mb-6 drop-shadow-[0_0_40px_rgba(220,30,30,0.3)]" priority />
              <p className="text-lg sm:text-xl lg:text-2xl text-white/50 font-light tracking-wide">
                Everything Creators Need. <span className="text-white font-medium">One Platform.</span>
              </p>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 animate-bounce"
            style={{ opacity: Math.max(0, 1 - scrollY / 200) }}>
            <span className="text-[9px] text-white/25 uppercase tracking-[0.25em]">Scroll to Explore</span>
            <ArrowDown className="w-4 h-4 text-white/25" />
          </div>

          {/* Bottom fade to black */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent z-[5]" />
        </div>
      </section>

      {/* ═══ 4 PILLARS — Big alternating cards (image left/right) ═══ */}
      {PILLARS.map((p, i) => (
        <BigPillarCard key={p.number} pillar={p} index={i} onAI={() => setShowTools(true)} />
      ))}

      {/* ═══ ABOUT — Bottom ═══ */}
      <AboutBottom onAI={() => setShowTools(true)} />

    </div>
  );
}

// ═══ PILLAR — Full screen section with dramatic animations ═══
function BigPillarCard({ pillar, index, onAI }: { pillar: typeof PILLARS[0]; index: number; onAI: () => void }) {
  const { ref, vis } = useReveal(0.12);
  const Icon = pillar.icon;
  const isEven = index % 2 === 0;

  return (
    <section ref={ref} className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000" style={{ opacity: vis ? 1 : 0, background: `radial-gradient(ellipse 60% 50% at ${isEven ? "30%" : "70%"} 50%, ${pillar.glow} 0%, transparent 65%)` }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 lg:gap-0 rounded-2xl overflow-hidden border border-white/[0.06] transition-all duration-700 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}
          style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)" }}>

          {/* IMAGE/VISUAL SIDE */}
          <div className={`lg:w-1/2 relative min-h-[280px] sm:min-h-[350px] flex items-center justify-center overflow-hidden transition-all duration-[1000ms] delay-300 ${vis ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
            style={{ background: `radial-gradient(ellipse at center, ${pillar.glow} 0%, transparent 70%)` }}>

            {/* Big number background */}
            <span className="absolute text-[160px] sm:text-[220px] font-black select-none leading-none"
              style={{ color: "transparent", WebkitTextStroke: `1px ${pillar.accent}15`, opacity: vis ? 1 : 0, transition: "opacity 1s ease 0.5s" }}>
              {pillar.number}
            </span>

            {/* Floating icon */}
            <div className={`relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-[1.5rem] bg-gradient-to-br ${pillar.gradient} flex items-center justify-center shadow-2xl`}
              style={{ boxShadow: `0 0 50px ${pillar.glow}, 0 0 100px ${pillar.glow}`, animation: "iconFloat 4s ease-in-out infinite" }}>
              <Icon className="w-14 h-14 sm:w-18 sm:h-18 text-white" />
            </div>
          </div>

          {/* TEXT SIDE */}
          <div className="lg:w-1/2 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
            <div className={`transition-all duration-700 delay-200 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] mb-3" style={{ color: pillar.accent }}>{pillar.subtitle}</p>
            </div>

            <div className={`transition-all duration-700 delay-300 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight whitespace-pre-line">{pillar.title}</h2>
            </div>

            <div className={`transition-all duration-700 delay-[400ms] ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <p className="text-white/40 text-sm sm:text-base leading-relaxed mb-6">{pillar.description}</p>
            </div>

            {/* Feature pills */}
            <div className={`flex flex-wrap gap-2 mb-8 transition-all duration-700 delay-500 ${vis ? "opacity-100" : "opacity-0"}`}>
              {pillar.features.map((f, j) => (
                <span key={f} className="px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-500"
                  style={{
                    borderColor: `${pillar.accent}20`, color: pillar.accent, background: `${pillar.accent}08`,
                    transitionDelay: `${600 + j * 100}ms`,
                    opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(10px)",
                  }}>
                  {f}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className={`transition-all duration-700 delay-[700ms] ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              {pillar.isAI ? (
                <button onClick={onAI} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${pillar.accent}, ${pillar.accent}bb)`, boxShadow: `0 4px 25px ${pillar.glow}` }}>
                  Open AI Studio <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link href={pillar.href} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${pillar.accent}, ${pillar.accent}bb)`, boxShadow: `0 4px 25px ${pillar.glow}` }}>
                  Learn More <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══ ABOUT BOTTOM ═══
function AboutBottom({ onAI }: { onAI: () => void }) {
  const { ref, vis } = useReveal(0.15);

  return (
    <section ref={ref} className="relative py-28 overflow-hidden snap-start">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(220,30,30,0.06) 0%, transparent 60%)" }} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(220,40,40,0.2), transparent)" }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={`transition-all duration-700 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <p className="text-red-500/80 text-[10px] font-bold uppercase tracking-[0.4em] mb-5">ABOUT REKVON</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 leading-tight">
            We Create What Others<br /><span className="text-red-500">Can&apos;t.</span>
          </h2>
        </div>

        <div className={`transition-all duration-700 delay-200 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p className="text-white/40 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-12">
            REKVON is a full-service creator platform. We turn raw ideas into cinematic content, grow channels from zero to millions, and build communities that keep audiences coming back.
          </p>
        </div>

        <div className={`flex flex-wrap items-center justify-center gap-4 mb-16 transition-all duration-700 delay-[400ms] ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <Link href="/about" className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all border border-white/10 inline-flex items-center gap-2">
            Our Story <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/contact" className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold transition-all shadow-lg shadow-red-600/25 inline-flex items-center gap-2">
            <Mail className="w-4 h-4" /> Get in Touch
          </Link>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-8 transition-all duration-700 delay-[600ms] ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {[{ v: "4", l: "Services" }, { v: "44+", l: "AI Voices" }, { v: "3", l: "AI Providers" }, { v: "24/7", l: "Support" }].map(s => (
            <div key={s.l} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold text-red-500 mb-1">{s.v}</p>
              <p className="text-[10px] text-white/25 uppercase tracking-widest">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
