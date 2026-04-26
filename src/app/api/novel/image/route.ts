import { NextRequest, NextResponse } from "next/server";

type ImageProvider = "openai" | "gemini";

function buildImagePrompt(rawPrompt: string): string {
  // Remove any existing style prefix to avoid duplication
  let clean = rawPrompt.replace(/^(Japanese anime|Anime art style|manga art)[^.]*\.\s*/i, "").trim();

  return `Modern Japanese anime illustration in LANDSCAPE 16:9 widescreen format.

ART STYLE (MANDATORY):
- Modern Japanese anime style — like Classroom of the Elite, Solo Leveling, Horimiya, My Dress-Up Darling
- Soft cel-shading with detailed proportions — NOT old-school, NOT exaggerated
- Realistic anime proportions: detailed expressive eyes (not overly large), natural hair colors, proper body proportions
- Clean modern character designs with detailed clothing folds and textures
- Soft ambient lighting with subtle highlights and shadows
- Background art: detailed, realistic environments with anime aesthetic
- NOT chibi, NOT cartoonish, NOT 3D render — MODERN 2D ANIME

SCENE TO DRAW:
${clean}

COMPOSITION:
- ONE single landscape scene (16:9 ratio, wider than tall)
- Cinematic camera angle — like a key frame from an anime episode
- NOT a comic strip, NOT multiple panels, NOT split screen
- NO text, NO subtitles, NO captions, NO watermarks anywhere on the image
- Fill the entire canvas with the illustration`;
}

// ── OpenAI ──
async function generateOpenAIImage(apiKey: string, prompt: string, model: string = "gpt-image-1"): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model, prompt, n: 1, size: "1536x1024" }),
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
async function generateGeminiImage(apiKey: string, prompt: string, model: string = "gemini-2.5-flash-image"): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
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
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image returned from Gemini");
}

// ── Main ──
export async function POST(request: NextRequest) {
  try {
    const { prompt, provider, apiKey, model } = await request.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "Image prompt required" }, { status: 400 });
    if (!apiKey?.trim()) return NextResponse.json({ error: "API key required" }, { status: 400 });

    const imgProvider = (provider || "openai") as ImageProvider;
    const imgModel = model || (imgProvider === "gemini" ? "gemini-2.5-flash-image" : "gpt-image-1.5");
    const fullPrompt = buildImagePrompt(prompt);

    const imageUrl = imgProvider === "gemini"
      ? await generateGeminiImage(apiKey, fullPrompt, imgModel)
      : await generateOpenAIImage(apiKey, fullPrompt, imgModel);

    return NextResponse.json({ imageUrl });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed" }, { status: 500 });
  }
}
