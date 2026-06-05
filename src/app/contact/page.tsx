"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Send,
  Mail,
  Play,
  Clock,
  CheckCircle,
  User,
  AtSign,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

const SERVICE_OPTIONS = [
  "Creator Services",
  "AI Studio",
  "Growth & Marketing",
  "Community & Tech",
  "Other",
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Header />

      <main className="flex-1">
        {/* Dramatic background glow */}
        <div className="relative">
          <div
            className="absolute top-0 left-0 right-0 h-[800px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 10%, rgba(220, 40, 40, 0.10) 0%, rgba(139, 92, 246, 0.06) 40%, transparent 70%)",
            }}
          />

          <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>

            {/* Hero */}
            <div className="text-center mb-16">
              <p className="text-red-500 text-xs font-bold uppercase tracking-[0.3em] mb-3">
                GET IN TOUCH
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Contact <span className="text-red-500">Us</span>
              </h1>
              <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
                Let&apos;s build something amazing together.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
              {/* Contact Form */}
              <div className="lg:col-span-3">
                <div
                  className="pillar-card rounded-2xl p-8 overflow-hidden border border-white/[0.06]"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
                  }}
                >
                  {sent ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        Message Sent!
                      </h3>
                      <p className="text-white/50 text-sm max-w-sm mb-8">
                        Thank you for reaching out. We typically respond within
                        24 hours.
                      </p>
                      <button
                        onClick={() => {
                          setSent(false);
                          setName("");
                          setEmail("");
                          setService("");
                          setMessage("");
                        }}
                        className="text-sm text-white/40 hover:text-white transition-colors"
                      >
                        Send another message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                          <User className="w-3.5 h-3.5" /> Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          placeholder="Your name"
                          className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/25 focus:border-red-500/40 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                          <AtSign className="w-3.5 h-3.5" /> Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/25 focus:border-red-500/40 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                          <ChevronDown className="w-3.5 h-3.5" /> Service
                        </label>
                        <select
                          value={service}
                          onChange={(e) => setService(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-red-500/40 focus:outline-none transition-colors appearance-none cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 12px center",
                            backgroundSize: "16px",
                          }}
                        >
                          <option value="" disabled className="bg-[#0a0a0a] text-white/40">
                            Select a service
                          </option>
                          {SERVICE_OPTIONS.map((opt) => (
                            <option
                              key={opt}
                              value={opt}
                              className="bg-[#0a0a0a] text-white"
                            >
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                          <MessageSquare className="w-3.5 h-3.5" /> Message
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                          rows={5}
                          placeholder="Tell us about your project..."
                          className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/25 focus:border-red-500/40 focus:outline-none transition-colors resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-red-600/25"
                      >
                        <Send className="w-4 h-4" /> Send Message
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Contact Info Sidebar */}
              <div className="lg:col-span-2 space-y-6">
                {/* Email Card */}
                <div
                  className="pillar-card group rounded-2xl p-6 overflow-hidden border border-white/[0.06] hover:border-white/15 transition-all duration-500"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
                  }}
                >
                  <div className="pillar-icon w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg" style={{ boxShadow: "0 4px 24px rgba(239, 68, 68, 0.25)" }}>
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Email</h3>
                  <a
                    href="mailto:rekvonyt@gmail.com"
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    rekvonyt@gmail.com
                  </a>
                </div>

                {/* YouTube Card */}
                <div
                  className="pillar-card group rounded-2xl p-6 overflow-hidden border border-white/[0.06] hover:border-white/15 transition-all duration-500"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
                  }}
                >
                  <div className="pillar-icon w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mb-4 shadow-lg" style={{ boxShadow: "0 4px 24px rgba(220, 40, 40, 0.25)" }}>
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">YouTube</h3>
                  <a
                    href="https://www.youtube.com/@REKVON"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    @REKVON
                  </a>
                </div>

                {/* Response Time Card */}
                <div
                  className="pillar-card group rounded-2xl p-6 overflow-hidden border border-white/[0.06] hover:border-white/15 transition-all duration-500"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
                  }}
                >
                  <div className="pillar-icon w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg" style={{ boxShadow: "0 4px 24px rgba(139, 92, 246, 0.25)" }}>
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Response Time
                  </h3>
                  <p className="text-sm text-white/50">
                    We typically respond within 24 hours.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
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
