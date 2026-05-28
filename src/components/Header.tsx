"use client";

import { Settings, Coins, Zap, FileText, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { loadUsage, formatCost, loadCurrency, UsageRecord } from "@/lib/usage";
import { getCooldowns, formatCooldownTime, getModelDisplayName, CooldownEntry } from "@/lib/cooldowns";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function Header() {
  const [cost, setCost] = useState("");
  const [tokens, setTokens] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [cooldowns, setCooldowns] = useState<CooldownEntry[]>([]);

  useEffect(() => {
    const update = () => {
      const usage: UsageRecord = loadUsage();
      const code = loadCurrency();
      setCost(formatCost(usage.totalCostUSD, code));
      setCurrencyCode(code);
      setTokens(formatTokens(usage.totalInputTokens + usage.totalOutputTokens));
      setCooldowns(getCooldowns());
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
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/rekvon-logo.png"
              alt="REKVON"
              width={120}
              height={30}
              className="h-6 w-auto object-contain group-hover:opacity-80 transition-opacity duration-300"
            />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Exhausted models — only show if any are rate limited */}
            {cooldowns.length > 0 && (
              <Link href="/settings" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-500/15 border border-red-500/20 hover:bg-red-500/25 transition-all">
                <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />
                <div className="flex items-center gap-1.5">
                  {cooldowns.slice(0, 3).map((cd, i) => (
                    <span key={i} className="text-[10px] font-medium text-red-300">
                      {getModelDisplayName(cd.model).split(" ").slice(0, 2).join(" ")} {formatCooldownTime(Math.max(0, cd.cooldownUntil - Date.now()))}
                    </span>
                  ))}
                  {cooldowns.length > 3 && (
                    <span className="text-[10px] text-red-400/60">+{cooldowns.length - 3}</span>
                  )}
                </div>
              </Link>
            )}

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
