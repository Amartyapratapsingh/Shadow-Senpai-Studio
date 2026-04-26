import { NextRequest, NextResponse } from "next/server";

type ImageProvider = "openai" | "gemini";

/**
 * Build image prompt that produces REAL anime TV episode frames.
 * NOT digital painting. NOT concept art. A literal frame from an anime show.
 * This prompt is used for BOTH OpenAI and Gemini — same quality for both.
 */
function buildImagePrompt(rawPrompt: string): string {
  let clean = rawPrompt.replace(/^(Japanese anime|Anime art style|manga art|Modern Japanese)[^.]*\.\s*/i, "").trim();

  return `A frame from a Japanese anime TV episode. 16:9 widescreen. This must look EXACTLY like a screenshot taken from a real anime show airing on TV.

SCENE: ${clean}

ANIME TV FRAME STYLE (follow these EXACTLY — this is the most important part):
- FLAT cel-shading with only 2-3 shadow tones per surface. NO smooth gradients. Hard shadow edges.
- VISIBLE black outlines on ALL edges — characters, clothes, hair, objects. Clean consistent lineart thickness.
- FLAT color fills for skin (one base color + one shadow color, nothing more)
- Hair drawn as CHUNKY STRANDS with flat color, not individual realistic strands
- Eyes: clean anime eyes with flat iris color, white highlight dot, simple eyelashes. NOT hyper-detailed.
- Clothing: flat colors with simple fold lines, not rendered fabric textures
- Background: softer/slightly blurred compared to characters, simple painted style
- Lighting: simple directional light creating hard cel-shaded shadows, NOT volumetric or atmospheric
- Overall: CLEAN, SIMPLE, FLAT — like anime studios A-1 Pictures, CloverWorks, MAPPA produce

WHAT TO AVOID (CRITICAL):
- NO smooth gradient shading (use FLAT cel-shading only)
- NO realistic skin rendering or subsurface scattering
- NO individual hair strands (use chunky anime hair blocks)
- NO hyper-detailed eyes with realistic iris patterns
- NO over-detailed backgrounds competing with characters
- NO digital painting look, NO concept art look, NO 3D render look
- NO text, subtitles, captions, or watermarks

This should look like someone pressed pause on Crunchyroll and took a screenshot. ONE scene, ONE frame, LANDSCAPE 16:9.`;
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

// ── Main — same prompt goes to BOTH OpenAI and Gemini ──
export async function POST(request: NextRequest) {
  try {
    const { prompt, provider, apiKey, model } = await request.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "Image prompt required" }, { status: 400 });
    if (!apiKey?.trim()) return NextResponse.json({ error: "API key required" }, { status: 400 });

    const imgProvider = (provider || "openai") as ImageProvider;
    const imgModel = model || (imgProvider === "gemini" ? "gemini-2.5-flash-image" : "gpt-image-1.5");
    console.log(`[Image API] provider=${imgProvider}, model=${imgModel}, prompt_length=${prompt.length}`);

    // SAME prompt for both providers — consistent quality
    const fullPrompt = buildImagePrompt(prompt);

    const imageUrl = imgProvider === "gemini"
      ? await generateGeminiImage(apiKey, fullPrompt, imgModel)
      : await generateOpenAIImage(apiKey, fullPrompt, imgModel);

    return NextResponse.json({ imageUrl });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed" }, { status: 500 });
  }
}
