"use client";

import { Settings, Coins, Zap, FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { loadUsage, formatCost, loadCurrency, UsageRecord } from "@/lib/usage";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function Header() {
  const [cost, setCost] = useState("");
  const [tokens, setTokens] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");

  useEffect(() => {
    const update = () => {
      const usage: UsageRecord = loadUsage();
      const code = loadCurrency();
      setCost(formatCost(usage.totalCostUSD, code));
      setCurrencyCode(code);
      setTokens(formatTokens(usage.totalInputTokens + usage.totalOutputTokens));
    };
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="/logo.jpg"
                alt="Shadow Senpai"
                width={38}
                height={38}
                className="w-[38px] h-[38px] rounded-xl object-cover ring-1 ring-white/10 group-hover:ring-primary/40 transition-all duration-300"
              />
              <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient leading-tight">
                Shadow Senpai
              </h1>
              <p className="text-[10px] text-muted/60 tracking-widest uppercase">
                Studio
              </p>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Tokens pill */}
            <div className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full">
              <Zap className="w-3 h-3 text-violet-400" />
              <span className="text-[11px] font-semibold text-violet-300">
                {tokens || "0"}
              </span>
              <span className="text-[9px] text-violet-400/50 hidden sm:inline">
                tokens
              </span>
            </div>

            {/* Cost pill */}
            <div className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full">
              <Coins className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-300">
                {cost || "$0.00"}
              </span>
              <span className="text-[9px] text-amber-400/50 hidden sm:inline">
                {currencyCode}
              </span>
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              className="glass flex items-center gap-1.5 px-3 py-2 rounded-full text-muted hover:text-foreground transition-all duration-300 hover:bg-white/[0.06]"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">
                Settings
              </span>
            </Link>

            {/* Logs */}
            <Link
              href="/logs"
              className="glass flex items-center gap-1.5 px-3 py-2 rounded-full text-muted hover:text-foreground transition-all duration-300 hover:bg-white/[0.06]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">
                Logs
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
