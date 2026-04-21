import { NextRequest, NextResponse } from "next/server";
import { AIConfig } from "@/lib/types";
import { getSystemPrompt, getChunkPrompt } from "@/lib/prompts";
import { chunkTranscript, Chunk } from "@/lib/chunker";

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
      temperature: 0.8,
      max_tokens: 4096,
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
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.8,
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
          temperature: 0.8,
          maxOutputTokens: 4096,
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
    const { transcript, manhuaName, style, config, chunkIndex } = body;

    if (!transcript || !config?.apiKey || !config?.provider) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If a specific chunk index is provided, process just that chunk
    if (chunkIndex !== undefined) {
      const chunks = chunkTranscript(transcript);
      const chunk = chunks[chunkIndex];

      if (!chunk) {
        return NextResponse.json(
          { error: "Invalid chunk index" },
          { status: 400 }
        );
      }

      const systemPrompt = getSystemPrompt(
        manhuaName || "Unknown",
        style || "engaging-and-dramatic"
      );

      // Get the previous chunk's content for context
      const previousContext =
        chunkIndex > 0
          ? chunks[chunkIndex - 1].content.slice(-200)
          : "";

      const userPrompt = getChunkPrompt(
        chunk.content,
        chunk.index,
        chunk.total,
        previousContext
      );

      const rewritten = await callAI(config, systemPrompt, userPrompt);

      return NextResponse.json({
        chunk: {
          index: chunk.index,
          total: chunk.total,
          label: chunk.label,
          original: chunk.content,
          rewritten,
          status: "done",
        },
      });
    }

    // Otherwise, return the chunks for the client to process one by one
    const chunks = chunkTranscript(transcript);

    return NextResponse.json({
      chunks: chunks.map((c) => ({
        index: c.index,
        total: c.total,
        label: c.label,
        original: c.content,
        rewritten: "",
        status: "pending",
      })),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
