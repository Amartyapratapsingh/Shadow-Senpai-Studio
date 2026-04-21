import { NextRequest, NextResponse } from "next/server";
import { AIConfig } from "@/lib/types";
import {
  getGenerateSystemPrompt,
  getGenerateUserPrompt,
} from "@/lib/generate-prompts";

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${err?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `Anthropic API error: ${err?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.content[0]?.text || "";
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini API error: ${err?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAI(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  switch (config.provider) {
    case "openai":
      return callOpenAI(config.apiKey, config.model, systemPrompt, userPrompt);
    case "anthropic":
      return callAnthropic(
        config.apiKey,
        config.model,
        systemPrompt,
        userPrompt
      );
    case "gemini":
      return callGemini(config.apiKey, config.model, systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { manhuaName, style, config, additionalDetails, durationMinutes } = body;

    if (!config?.apiKey || !config?.provider) {
      return NextResponse.json(
        { error: "Missing API key or provider" },
        { status: 400 }
      );
    }

    if (!manhuaName?.trim()) {
      return NextResponse.json(
        { error: "Please enter the manhwa/manga name" },
        { status: 400 }
      );
    }

    const systemPrompt = getGenerateSystemPrompt(
      manhuaName,
      style || "engaging-and-dramatic",
      durationMinutes ? Number(durationMinutes) : undefined
    );
    const userPrompt = getGenerateUserPrompt(manhuaName, additionalDetails);

    const script = await callAI(config, systemPrompt, userPrompt);

    return NextResponse.json({ script });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
