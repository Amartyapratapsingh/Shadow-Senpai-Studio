import { AIProvider } from "./types";

const STORAGE_KEY = "manhuascript_api_keys";

export interface SavedApiKeys {
  openai: string;
  anthropic: string;
  gemini: string;
}

const EMPTY_KEYS: SavedApiKeys = {
  openai: "",
  anthropic: "",
  gemini: "",
};

/**
 * Load saved API keys from localStorage.
 * Returns empty strings if nothing is saved or if running on server.
 */
export function loadApiKeys(): SavedApiKeys {
  if (typeof window === "undefined") return EMPTY_KEYS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_KEYS;
    const parsed = JSON.parse(raw);
    return {
      openai: parsed.openai || "",
      anthropic: parsed.anthropic || "",
      gemini: parsed.gemini || "",
    };
  } catch {
    return EMPTY_KEYS;
  }
}

/**
 * Save all API keys to localStorage.
 */
export function saveApiKeys(keys: SavedApiKeys): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Save a single provider's API key.
 */
export function saveApiKey(provider: AIProvider, key: string): void {
  const current = loadApiKeys();
  current[provider] = key;
  saveApiKeys(current);
}

/**
 * Get a single provider's saved API key.
 */
export function getApiKey(provider: AIProvider): string {
  return loadApiKeys()[provider];
}

/**
 * Remove a single provider's API key.
 */
export function removeApiKey(provider: AIProvider): void {
  const current = loadApiKeys();
  current[provider] = "";
  saveApiKeys(current);
}

/**
 * Remove all saved API keys.
 */
export function removeAllApiKeys(): void {
  saveApiKeys(EMPTY_KEYS);
}
