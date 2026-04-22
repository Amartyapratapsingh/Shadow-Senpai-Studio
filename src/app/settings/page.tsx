"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { loadApiKeys, saveApiKeys, SavedApiKeys } from "@/lib/api-keys";
import {
  loadUsage,
  resetUsage,
  formatCost,
  loadCurrency,
  saveCurrency,
  CURRENCIES,
  UsageRecord,
} from "@/lib/usage";
import {
  ArrowLeft,
  Settings,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Check,
  ShieldCheck,
  KeyRound,
  Coins,
  RotateCcw,
  Globe,
} from "lucide-react";
import Link from "next/link";

const PROVIDERS = [
  {
    key: "openai" as const,
    label: "OpenAI",
    icon: "O",
    color: "from-green-500 to-emerald-600",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "Get your key from OpenAI Dashboard",
  },
  {
    key: "anthropic" as const,
    label: "Claude (Anthropic)",
    icon: "C",
    color: "from-orange-400 to-amber-600",
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpText: "Get your key from Anthropic Console",
  },
  {
    key: "gemini" as const,
    label: "Google Gemini",
    icon: "G",
    color: "from-blue-400 to-indigo-600",
    placeholder: "AIza...",
    helpUrl: "https://aistudio.google.com/apikey",
    helpText: "Get your key from Google AI Studio",
  },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<SavedApiKeys>({
    openai: "",
    anthropic: "",
    gemini: "",
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    openai: false,
    anthropic: false,
    gemini: false,
  });
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [currency, setCurrencyState] = useState("USD");
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [usageReset, setUsageReset] = useState(false);

  useEffect(() => {
    const savedKeys = loadApiKeys();
    setKeys(savedKeys);
    setCurrencyState(loadCurrency());
    setUsage(loadUsage());
    setLoaded(true);
  }, []);

  const handleSave = () => {
    saveApiKeys(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRemove = (provider: "openai" | "anthropic" | "gemini") => {
    const updated = { ...keys, [provider]: "" };
    setKeys(updated);
    saveApiKeys(updated);
  };

  const handleRemoveAll = () => {
    const empty = { openai: "", anthropic: "", gemini: "" };
    setKeys(empty);
    saveApiKeys(empty);
  };

  const toggleShow = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleCurrencyChange = (code: string) => {
    setCurrencyState(code);
    saveCurrency(code);
  };

  const handleResetUsage = () => {
    resetUsage();
    setUsage(loadUsage());
    setUsageReset(true);
    setTimeout(() => setUsageReset(false), 2000);
  };

  const hasAnyKey = keys.openai || keys.anthropic || keys.gemini;

  if (!loaded) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            Settings
          </h1>
          <p className="text-sm text-muted mt-2">
            API keys, currency, and usage tracking.
          </p>
        </div>

        {/* ═══════ USAGE & CURRENCY ═══════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Usage Stats */}
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Total Spend
                </h3>
              </div>
              <button
                onClick={handleResetUsage}
                className="flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
                title="Reset usage counter"
              >
                {usageReset ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                {usageReset ? "Reset!" : "Reset"}
              </button>
            </div>
            <p className="text-3xl font-bold text-amber-400 mb-3">
              {usage ? formatCost(usage.totalCostUSD, currency) : "$0.00"}
            </p>
            <div className="space-y-1 text-xs text-muted">
              <p>
                Input tokens:{" "}
                <span className="text-foreground font-medium">
                  {usage?.totalInputTokens.toLocaleString() || 0}
                </span>
              </p>
              <p>
                Output tokens:{" "}
                <span className="text-foreground font-medium">
                  {usage?.totalOutputTokens.toLocaleString() || 0}
                </span>
              </p>
              <p>
                TTS characters:{" "}
                <span className="text-foreground font-medium">
                  {usage?.totalTTSChars.toLocaleString() || 0}
                </span>
              </p>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="rounded-2xl glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Currency
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur.code}
                  onClick={() => handleCurrencyChange(cur.code)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    currency === cur.code
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-transparent hover:border-card-border hover:bg-white/5 text-muted"
                  }`}
                >
                  <span className="font-semibold">{cur.symbol}</span>{" "}
                  <span className="text-xs">{cur.code}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted/60 mt-3">
              Cost shown in the header will update to your selected currency.
            </p>
          </div>
        </div>

        {/* ═══════ API KEYS ═══════ */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            API Keys
          </h2>
        </div>

        {/* Security Notice */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Your keys are safe
            </p>
            <p className="text-xs text-muted mt-1">
              Keys are stored only in your browser&apos;s localStorage — they
              never leave your device except when making API calls directly to
              the AI provider.
            </p>
          </div>
        </div>

        {/* API Key Cards */}
        <div className="space-y-4 mb-8">
          {PROVIDERS.map((provider) => {
            const value = keys[provider.key];
            const isVisible = showKeys[provider.key];
            const hasKey = value.length > 0;

            return (
              <div
                key={provider.key}
                className={`rounded-2xl border bg-card p-5 transition-all ${
                  hasKey ? "border-success/30" : "border-card-border"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${provider.color} flex items-center justify-center text-white text-sm font-bold`}
                    >
                      {provider.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {provider.label}
                      </h3>
                      <a
                        href={provider.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {provider.helpText} &rarr;
                      </a>
                    </div>
                  </div>
                  {hasKey && (
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-success" />
                      <span className="text-xs text-success font-medium">
                        Saved
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={isVisible ? "text" : "password"}
                      value={value}
                      onChange={(e) =>
                        setKeys((prev) => ({
                          ...prev,
                          [provider.key]: e.target.value,
                        }))
                      }
                      placeholder={provider.placeholder}
                      className="w-full px-3 py-2.5 pr-10 rounded-xl bg-background border border-card-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(provider.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    >
                      {isVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {hasKey && (
                    <button
                      onClick={() => handleRemove(provider.key)}
                      className="px-3 py-2.5 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
                      title="Remove this key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div>
            {hasAnyKey && (
              <button
                onClick={handleRemoveAll}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Remove All Keys
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-all text-sm font-semibold shadow-lg shadow-primary/25"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Keys
              </>
            )}
          </button>
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-muted">
          Shadow Senpai Studio — Keys are stored in your browser only.
        </p>
      </footer>
    </div>
  );
}
