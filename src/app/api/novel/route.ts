import { NextRequest, NextResponse } from "next/server";
import { AIConfig } from "@/lib/types";
import { getNovelScriptPrompt, getScenePlanPrompt, getImagePromptForScene } from "@/lib/novel-prompts";

export const maxDuration = 300;

async function callOpenAI(apiKey: string, model: string, prompt: string, maxTokens: number = 16384): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`OpenAI: ${e?.error?.message || res.statusText}`); }
  return (await res.json()).choices[0]?.message?.content || "";
}

async function callAnthropic(apiKey: string, model: string, prompt: string, maxTokens: number = 16384): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }], temperature: 0.7 }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Anthropic: ${e?.error?.message || res.statusText}`); }
  return (await res.json()).content[0]?.text || "";
}

async function callGemini(apiKey: string, model: string, prompt: string, maxTokens: number = 16384): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens } }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Gemini: ${e?.error?.message || res.statusText}`); }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAI(config: AIConfig, prompt: string, maxTokens: number = 16384): Promise<string> {
  switch (config.provider) {
    case "openai": return callOpenAI(config.apiKey, config.model, prompt, maxTokens);
    case "anthropic": return callAnthropic(config.apiKey, config.model, prompt, maxTokens);
    case "gemini": return callGemini(config.apiKey, config.model, prompt, maxTokens);
    default: throw new Error("Unknown provider");
  }
}

function extractJSON(text: string): unknown {
  let cleaned = text.trim();
  // Remove markdown blocks
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
  // Find JSON array
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
  // Fix common issues
  cleaned = cleaned.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");
  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, novelName, script, style, genreHint, narration, sceneNumber, totalScenes, characterRef } = body;

    if (!config?.apiKey || !config?.provider) {
      return NextResponse.json({ error: "API key required. Add in Settings." }, { status: 400 });
    }

    // ── Action 1: Generate script ──
    if (action === "generate-script") {
      if (!novelName?.trim()) return NextResponse.json({ error: "Novel name required" }, { status: 400 });
      const prompt = getNovelScriptPrompt(novelName, style || "cinematic-and-dramatic", genreHint);
      const result = await callAI(config, prompt);
      return NextResponse.json({ script: result });
    }

    // ── Action 2: PASS 1 — Scene Planning (reads entire script, outputs compact scene breaks) ──
    if (action === "plan-scenes") {
      if (!script?.trim()) return NextResponse.json({ error: "Script required" }, { status: 400 });
      const prompt = getScenePlanPrompt(script);
      // Use higher max tokens for scene planning with large scripts
      const result = await callAI(config, prompt, 8192);

      if (!result || result.trim().length === 0) {
        return NextResponse.json({ error: "AI returned empty response for scene planning" }, { status: 500 });
      }

      try {
        const scenes = extractJSON(result) as { scene: number; firstWords: string; description: string }[];
        if (!Array.isArray(scenes) || scenes.length === 0) throw new Error("Empty scenes");
        return NextResponse.json({ scenes });
      } catch {
        return NextResponse.json({ error: "Failed to parse scene plan. AI response was not valid JSON." }, { status: 500 });
      }
    }

    // ── Action 3: PASS 2 — Generate image prompt for a single scene ──
    if (action === "image-prompt") {
      if (!narration?.trim()) return NextResponse.json({ error: "Narration required" }, { status: 400 });
      const prompt = getImagePromptForScene(narration, sceneNumber || 1, totalScenes || 1, characterRef);
      const result = await callAI(config, prompt, 1024);
      return NextResponse.json({ imagePrompt: result.trim() });
    }

    // ── Legacy: split-panels (keep for backward compat) ──
    if (action === "split-panels") {
      if (!script?.trim()) return NextResponse.json({ error: "Script required" }, { status: 400 });
      // Redirect to scene planning
      const prompt = getScenePlanPrompt(script);
      const result = await callAI(config, prompt, 8192);
      try {
        const scenes = extractJSON(result) as { scene: number; firstWords: string; description: string }[];
        // Convert scenes to panels format
        const panels = scenes.map(s => ({
          panel: s.scene,
          narration: s.firstWords + "...",
          imagePrompt: `Anime art style, 16:9 cinematic widescreen illustration. ${s.description}`,
        }));
        return NextResponse.json({ panels });
      } catch {
        return NextResponse.json({ error: "Failed to parse scenes" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
