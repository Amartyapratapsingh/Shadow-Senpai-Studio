"use client";

import {
  AIProvider,
  AIConfig,
  SIMPLE_MODELS,
  SimpleModel,
} from "@/lib/types";
import { getApiKey } from "@/lib/api-keys";
import {
  Cpu,
  KeyRound,
  Crown,
  ThumbsUp,
  Coins,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Props {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
}

const PROVIDERS: {
  value: AIProvider;
  label: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
}[] = [
  {
    value: "openai",
    label: "OpenAI",
    icon: "O",
    color: "from-green-500 to-emerald-600",
    borderColor: "border-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    value: "anthropic",
    label: "Claude",
    icon: "C",
    color: "from-orange-400 to-amber-600",
    borderColor: "border-orange-400",
    bgColor: "bg-orange-400/10",
  },
  {
    value: "gemini",
    label: "Gemini",
    icon: "G",
    color: "from-blue-400 to-indigo-600",
    borderColor: "border-blue-400",
    bgColor: "bg-blue-400/10",
  },
];

const TIER_CONFIG = {
  best: {
    label: "Best Quality",
    icon: <Crown className="w-3.5 h-3.5" />,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    dot: "bg-amber-400",
  },
  recommended: {
    label: "Recommended",
    icon: <ThumbsUp className="w-3.5 h-3.5" />,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    dot: "bg-primary",
  },
  budget: {
    label: "Budget / Fast",
    icon: <Coins className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    dot: "bg-emerald-400",
  },
};

function ModelSlide({
  model,
  isSelected,
  onClick,
}: {
  model: SimpleModel;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tier = TIER_CONFIG[model.tier];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border-2 transition-all duration-200 text-left
        ${
          isSelected
            ? "border-primary bg-primary/5"
            : "border-transparent hover:border-card-border hover:bg-white/5"
        }`}
    >
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${tier.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {model.label}
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">
          {model.description}
        </p>
      </div>
    </button>
  );
}

export default function AIProviderSelector({ config, onChange }: Props) {
  const [showModels, setShowModels] = useState(false);

  useEffect(() => {
    const savedKey = getApiKey(config.provider);
    if (savedKey && !config.apiKey) {
      onChange({ ...config, apiKey: savedKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProviderChange = (provider: AIProvider) => {
    const savedKey = getApiKey(provider);
    onChange({
      ...config,
      provider,
      model: SIMPLE_MODELS[provider][0].value,
      apiKey: savedKey || "",
    });
    setShowModels(false);
  };

  const handleModelSelect = (modelValue: string) => {
    onChange({ ...config, model: modelValue });
    setShowModels(false);
  };

  const currentProvider = PROVIDERS.find((p) => p.value === config.provider);
  const models = SIMPLE_MODELS[config.provider];
  const currentModel = models.find((m) => m.value === config.model);
  const currentModelTier = currentModel
    ? TIER_CONFIG[currentModel.tier]
    : null;
  const hasSavedKey = config.apiKey.length > 0;

  // Group by tier
  const bestModels = models.filter((m) => m.tier === "best");
  const recModels = models.filter((m) => m.tier === "recommended");
  const budgetModels = models.filter((m) => m.tier === "budget");

  const tiers = [
    { key: "best" as const, models: bestModels },
    { key: "recommended" as const, models: recModels },
    { key: "budget" as const, models: budgetModels },
  ];

  return (
    <div className="space-y-5">
      {/* Section Title */}
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          AI Provider & Model
        </h3>
      </div>

      {/* Provider Selection Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((provider) => {
          const isActive = config.provider === provider.value;
          const providerHasKey = getApiKey(provider.value).length > 0;
          return (
            <button
              key={provider.value}
              onClick={() => handleProviderChange(provider.value)}
              className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all duration-200
                ${
                  isActive
                    ? `${provider.borderColor} ${provider.bgColor} text-foreground`
                    : "border-card-border bg-card hover:border-muted text-muted hover:text-foreground"
                }`}
            >
              {providerHasKey && (
                <div className="absolute top-1.5 right-1.5">
                  <KeyRound className="w-3 h-3 text-success" />
                </div>
              )}
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${provider.color} flex items-center justify-center text-white text-xs font-bold`}
              >
                {provider.icon}
              </div>
              <span className="text-xs font-semibold">{provider.label}</span>
            </button>
          );
        })}
      </div>

      {/* Current Model Display + Change Button */}
      <div>
        <label className="block text-xs text-muted mb-1.5">
          Model — {currentProvider?.label}
        </label>

        {/* Currently selected model card */}
        <div className="rounded-xl border border-card-border bg-background/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {currentModelTier && (
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${currentModelTier.dot}`}
                />
              )}
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {currentModel?.label || config.model}
                </span>
                {currentModel && (
                  <p className="text-xs text-muted mt-0.5">
                    {currentModel.description}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowModels(!showModels)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Change
              {showModels ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Model picker — only shown when "Change" is clicked */}
        {showModels && (
          <div className="mt-2 rounded-xl border border-card-border bg-background/50 overflow-hidden">
            {tiers.map(({ key, models: tierModels }) => {
              const tierInfo = TIER_CONFIG[key];
              return (
                <div
                  key={key}
                  className="border-b border-card-border last:border-b-0"
                >
                  <div
                    className={`flex items-center gap-2 px-3 py-2 ${tierInfo.bg}`}
                  >
                    <span className={tierInfo.color}>{tierInfo.icon}</span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${tierInfo.color}`}
                    >
                      {tierInfo.label}
                    </span>
                  </div>
                  <div className="p-1">
                    {tierModels.map((model) => (
                      <ModelSlide
                        key={model.value}
                        model={model}
                        isSelected={config.model === model.value}
                        onClick={() => handleModelSelect(model.value)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* API Key Status */}
      <div className="flex items-center justify-between px-1">
        {hasSavedKey ? (
          <span className="flex items-center gap-1.5 text-xs text-success font-medium">
            <KeyRound className="w-3.5 h-3.5" />
            API key saved
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <KeyRound className="w-3.5 h-3.5" />
            No API key set
          </span>
        )}
        <Link
          href="/settings"
          className="text-xs text-primary hover:underline font-medium"
        >
          {hasSavedKey ? "Manage keys" : "Add key in Settings"}
        </Link>
      </div>
    </div>
  );
}
