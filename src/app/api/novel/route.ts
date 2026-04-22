import { NextRequest, NextResponse } from "next/server";
import { AIConfig } from "@/lib/types";
import { getNovelScriptPrompt, getPanelSplitPrompt } from "@/lib/novel-prompts";

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, messages: [{ role: "user", content: prompt }], temperature: 0.8, max_tokens: 16384,
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || res.statusText); }
  const d = await res.json();
  return d.choices[0]?.message?.content || "";
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 16384, messages: [{ role: "user", content: prompt }], temperature: 0.8 }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || res.statusText); }
  const d = await res.json();
  return d.content[0]?.text || "";
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 16384 } }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || res.statusText); }
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAI(config: AIConfig, prompt: string): Promise<string> {
  switch (config.provider) {
    case "openai": return callOpenAI(config.apiKey, config.model, prompt);
    case "anthropic": return callAnthropic(config.apiKey, config.model, prompt);
    case "gemini": return callGemini(config.apiKey, config.model, prompt);
    default: throw new Error("Unknown provider");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, novelName, script, style, genreHint } = body;

    if (!config?.apiKey || !config?.provider) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }

    // Action 1: Generate script from novel name
    if (action === "generate-script") {
      if (!novelName?.trim()) return NextResponse.json({ error: "Novel name required" }, { status: 400 });
      const prompt = getNovelScriptPrompt(novelName, style || "cinematic-and-dramatic", genreHint);
      const result = await callAI(config, prompt);
      return NextResponse.json({ script: result });
    }

    // Action 2: Split script into panels
    if (action === "split-panels") {
      if (!script?.trim()) return NextResponse.json({ error: "Script required" }, { status: 400 });
      const prompt = getPanelSplitPrompt(script);
      const result = await callAI(config, prompt);

      // Robust JSON extraction — handles markdown blocks, extra text, multi-language
      let cleaned = result.trim();

      // Remove markdown code blocks
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
      }

      // Find the JSON array in the response (in case there's extra text around it)
      const jsonStart = cleaned.indexOf("[");
      const jsonEnd = cleaned.lastIndexOf("]");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
      }

      try {
        const panels = JSON.parse(cleaned);
        if (!Array.isArray(panels) || panels.length === 0) {
          throw new Error("Empty panels array");
        }
        return NextResponse.json({ panels });
      } catch {
        // Last resort: try to fix common JSON issues (trailing commas, etc.)
        try {
          const fixed = cleaned
            .replace(/,\s*\]/g, "]")
            .replace(/,\s*\}/g, "}")
            .replace(/[\x00-\x1F\x7F]/g, (c) => c === "\n" || c === "\r" || c === "\t" ? c : "");
          const panels = JSON.parse(fixed);
          return NextResponse.json({ panels });
        } catch {
          return NextResponse.json({ error: "Failed to parse panels. The AI response was not valid JSON. Please try again." }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
