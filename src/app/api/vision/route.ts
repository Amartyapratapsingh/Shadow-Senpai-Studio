import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

/**
 * Vision API — reads manhwa/manhua panel images and generates narration scripts.
 * Supports OpenAI (GPT-4o), Anthropic (Claude), and Gemini vision models.
 */

async function callOpenAIVision(apiKey: string, model: string, systemPrompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: "text", text: "Read this manhwa/manhua panel and write the narration script for it." },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || res.statusText); }
  return (await res.json()).choices[0]?.message?.content || "";
}

async function callAnthropicVision(apiKey: string, model: string, systemPrompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: "Read this manhwa/manhua panel and write the narration script for it." },
          ],
        },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || res.statusText); }
  return (await res.json()).content[0]?.text || "";
}

async function callGeminiVision(apiKey: string, model: string, systemPrompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt + "\n\nRead this manhwa/manhua panel and write the narration script for it." },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  );
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || res.statusText); }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, model, imageBase64, mimeType, systemPrompt } = await request.json();

    if (!apiKey?.trim()) return NextResponse.json({ error: "API key required" }, { status: 400 });
    if (!imageBase64?.trim()) return NextResponse.json({ error: "Image data required" }, { status: 400 });

    let script: string;
    const mime = mimeType || "image/png";

    switch (provider) {
      case "anthropic":
        script = await callAnthropicVision(apiKey, model || "claude-sonnet-4-6", systemPrompt, imageBase64, mime);
        break;
      case "gemini":
        script = await callGeminiVision(apiKey, model || "gemini-2.5-flash", systemPrompt, imageBase64, mime);
        break;
      default:
        script = await callOpenAIVision(apiKey, model || "gpt-4o", systemPrompt, imageBase64, mime);
        break;
    }

    return NextResponse.json({ script: script.trim() });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vision failed" }, { status: 500 });
  }
}
