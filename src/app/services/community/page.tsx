"use client";

import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Users,
  Bot,
  Globe,
  Wrench,
  Crown,
  Zap,
} from "lucide-react";

const SERVICES = [
  {
    icon: MessageSquare,
    title: "Discord Server Setup",
    description:
      "Custom Discord servers with roles, channels, bots, and moderation.",
    gradient: "from-cyan-500 to-blue-600",
    glowColor: "rgba(56, 189, 248, 0.25)",
  },
  {
    icon: Users,
    title: "Community Management",
    description:
      "Active moderation, engagement, events, and member growth.",
    gradient: "from-violet-500 to-indigo-600",
    glowColor: "rgba(139, 92, 246, 0.25)",
  },
  {
    icon: Bot,
    title: "Bot Development",
    description:
      "Custom Discord bots, Telegram bots, and automation tools.",
    gradient: "from-emerald-500 to-teal-600",
    glowColor: "rgba(16, 185, 129, 0.25)",
  },
  {
    icon: Globe,
    title: "Website Development",
    description:
      "Landing pages, portfolio sites, and creator tools built to order.",
    gradient: "from-red-500 to-orange-600",
    glowColor: "rgba(239, 68, 68, 0.25)",
  },
  {
    icon: Wrench,
    title: "Tech Support",
    description:
      "API integrations, hosting, domains, and technical troubleshooting.",
    gradient: "from-amber-500 to-orange-600",
    glowColor: "rgba(245, 158, 11, 0.25)",
  },
  {
    icon: Crown,
    title: "Premium Services",
    description:
      "Custom solutions for unique needs — if you can imagine it, we can build it.",
    gradient: "from-pink-500 to-rose-600",
    glowColor: "rgba(244, 63, 94, 0.25)",
  },
];

export default function CommunityTechPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Header />

      <main className="flex-1">
        {/* Dramatic background glow */}
        <div className="relative">
          <div
            className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 10%, rgba(56, 189, 248, 0.12) 0%, rgba(30, 100, 180, 0.06) 40%, transparent 70%)",
            }}
          />

          {/* Hero */}
          <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>

            <div className="text-center mb-16">
              <p className="text-cyan-500 text-xs font-bold uppercase tracking-[0.3em] mb-3">
                COMMUNITY & TECH
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Community & <span className="text-cyan-500">Tech</span>
              </h1>
              <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
                Build, manage, and grow your online community.
              </p>
            </div>
          </section>

          {/* Service Cards */}
          <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.map((service, i) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.title}
                    className="pillar-card group relative rounded-2xl p-7 overflow-hidden border border-white/[0.06] hover:border-white/20 transition-all duration-700 hover:translate-y-[-6px]"
                    style={{
                      background:
                        "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
                      animationDelay: `${i * 800}ms`,
                    }}
                  >
                    {/* Auto glow effect */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl"
                      style={{
                        background: `radial-gradient(ellipse at center, ${service.glowColor} 0%, transparent 70%)`,
                      }}
                    />

                    {/* Top accent line */}
                    <div
                      className={`pillar-line absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${service.gradient}`}
                      style={{ animationDelay: `${i * 0.5}s` }}
                    />

                    <div className="relative">
                      <div
                        className={`pillar-icon w-14 h-14 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 shadow-lg`}
                        style={{
                          boxShadow: `0 4px 24px ${service.glowColor}`,
                          animationDelay: `${i * 0.3}s`,
                        }}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        {service.title}
                      </h3>
                      <p className="text-[13px] text-white/50 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Hover border glow */}
                    <div
                      className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
                      style={{ background: service.glowColor }}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* CTA Section */}
        <section className="relative py-20 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(56, 189, 248, 0.06) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.3) 20%, rgba(56,189,248,0.5) 50%, rgba(56,189,248,0.3) 80%, transparent 100%)",
            }}
          />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="relative rounded-2xl p-10 sm:p-14 overflow-hidden border border-cyan-500/20 text-center"
              style={{
                background:
                  "linear-gradient(160deg, rgba(56,189,248,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(56,189,248,0.04) 100%)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(56,189,248,0.10) 0%, transparent 70%)",
                }}
              />
              <div className="relative">
                <Zap className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  Need a custom solution?
                </h2>
                <p className="text-white/50 text-sm sm:text-base mb-8 max-w-md mx-auto">
                  From Discord bots to full websites — tell us what you need and we&apos;ll build it.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm transition-all hover:scale-105 shadow-lg shadow-cyan-600/25"
                >
                  <ArrowRight className="w-4 h-4" /> Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-6 text-center">
        <p className="text-[11px] text-white/20">
          REKVON Studio
        </p>
      </footer>
    </div>
  );
}
