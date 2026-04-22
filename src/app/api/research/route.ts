import { NextRequest, NextResponse } from "next/server";

async function callOpenAI(apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 8192 }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || res.statusText); }
  return (await res.json()).choices[0]?.message?.content || "";
}

async function callAnthropic(apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
  const sys = messages.find(m => m.role === "system");
  const rest = messages.filter(m => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 8192, system: sys?.content || "", messages: rest, temperature: 0.7 }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || res.statusText); }
  return (await res.json()).content[0]?.text || "";
}

async function callGemini(apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
  const combined = messages.map(m => `${m.role === "user" ? "User" : m.role === "system" ? "System" : "Assistant"}: ${m.content}`).join("\n\n");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: combined }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || res.statusText); }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(request: NextRequest) {
  try {
    const { messages, provider, apiKey, model } = await request.json();
    if (!apiKey?.trim() || !messages?.length) return NextResponse.json({ error: "API key and messages required" }, { status: 400 });

    let reply: string;
    switch (provider) {
      case "anthropic": reply = await callAnthropic(apiKey, model, messages); break;
      case "gemini": reply = await callGemini(apiKey, model, messages); break;
      default: reply = await callOpenAI(apiKey, model, messages); break;
    }

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
