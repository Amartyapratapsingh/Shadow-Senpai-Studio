"use client";

import { Settings, Coins, Zap } from "lucide-react";
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
      const total = usage.totalInputTokens + usage.totalOutputTokens;
      setTokens(formatTokens(total));
    };
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/logo.jpg"
              alt="Shadow Senpai"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Shadow Senpai
              </h1>
              <p className="text-xs text-muted">Studio</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tokens */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{tokens || "0"}</span>
              <span className="text-[10px] text-violet-400/60 hidden sm:inline">
                tokens
              </span>
            </div>

            {/* Cost */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <Coins className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{cost || "$0.00"}</span>
              <span className="text-[10px] text-amber-400/60 hidden sm:inline">
                {currencyCode}
              </span>
            </div>

            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-card-border text-muted hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all text-sm"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
