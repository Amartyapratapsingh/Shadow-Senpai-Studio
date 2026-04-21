"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { Wand2, ListOrdered, Volume2, ArrowRight } from "lucide-react";

const TOOLS = [
  {
    title: "Manhwa / Manga Script Rewriter",
    description:
      "Paste a YouTube transcript and get a completely rewritten, original script. Every page covered — nothing skipped.",
    href: "/rewriter",
    icon: Wand2,
    gradient: "from-primary to-accent",
    tags: ["Paste Transcript", "100% Original", "No Pages Skipped"],
  },
  {
    title: "Top 10 Anime Script Generator",
    description:
      "Select a category like \"Top 10 Overpowered MC Anime\" or create your own, and get a full YouTube-ready script generated from scratch.",
    href: "/top10",
    icon: ListOrdered,
    gradient: "from-pink-500 to-orange-500",
    tags: ["Pick a Category", "AI Generated", "YouTube Ready"],
  },
  {
    title: "AI Audio Generator",
    description:
      "Turn your script into cinematic AI voiceover. Tone-aware voice switching for battle, shock, and dark moments. Powered by OpenAI TTS.",
    href: "/audio",
    icon: Volume2,
    gradient: "from-violet-500 to-fuchsia-600",
    tags: ["Script to Audio", "Cinematic Voice", "Auto Tone Detection"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-pink-500 bg-clip-text text-transparent mb-4">
            Shadow Senpai Studio
          </h1>
          <p className="text-lg text-muted max-w-xl mx-auto">
            Your AI-powered toolkit for creating YouTube-ready anime &amp; manga
            scripts. Choose a tool below to get started.
          </p>
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative rounded-2xl border border-card-border bg-card p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {tool.title}
                </h2>
                <p className="text-sm text-muted leading-relaxed mb-5">
                  {tool.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {tool.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-muted border border-card-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                  Open Tool
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border py-4 text-center">
        <p className="text-xs text-muted">
          Shadow Senpai Studio — Your scripts stay private. API calls go directly
          from your browser to the AI provider.
        </p>
      </footer>
    </div>
  );
}
