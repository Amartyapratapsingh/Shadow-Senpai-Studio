import { NextRequest, NextResponse } from "next/server";

type ImageProvider = "openai" | "gemini";

function buildImagePrompt(rawPrompt: string): string {
  let clean = rawPrompt.replace(/^Anime art style[^.]*\.\s*/i, "").trim();

  return `Generate exactly ONE single anime illustration. LANDSCAPE orientation. Width is much greater than height. Aspect ratio 16:9.

SCENE: ${clean}

STRICT RULES:
- ONE single image only. NOT a comic strip. NOT multiple panels. NOT split screen. NOT side by side images. Just ONE scene.
- LANDSCAPE orientation — wider than tall, like a movie screenshot or a YouTube video thumbnail.
- Anime/manga 2D art style, clean lineart, cel-shaded, vibrant colors, cinematic lighting.
- NO text, NO subtitles, NO captions, NO watermarks, NO logos, NO words anywhere on the image.
- NO borders, NO frames, NO black bars. Fill the entire canvas.
- ONE clear scene with ONE composition. Not a collage.`;
}

// ── OpenAI ──
async function generateOpenAIImage(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1536x1024",
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`OpenAI Image error: ${e?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (b64) return `data:image/png;base64,${b64}`;
  const url = data?.data?.[0]?.url;
  if (url) return url;
  throw new Error("No image returned from OpenAI");
}

// ── Gemini ──
async function generateGeminiImage(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          numberOfImages: 1,
        },
      }),
    }
  );

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Gemini Image error: ${e?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;

  if (parts) {
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image returned from Gemini");
}

// ── Main ──
export async function POST(request: NextRequest) {
  try {
    const { prompt, provider, apiKey } = await request.json();

    if (!prompt?.trim()) return NextResponse.json({ error: "Image prompt required" }, { status: 400 });
    if (!apiKey?.trim()) return NextResponse.json({ error: "API key required" }, { status: 400 });

    const imgProvider = (provider || "gemini") as ImageProvider;
    const fullPrompt = buildImagePrompt(prompt);

    const imageUrl = imgProvider === "gemini"
      ? await generateGeminiImage(apiKey, fullPrompt)
      : await generateOpenAIImage(apiKey, fullPrompt);

    return NextResponse.json({ imageUrl });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed" }, { status: 500 });
  }
}
