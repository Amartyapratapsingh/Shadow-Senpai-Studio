import { NextRequest, NextResponse } from "next/server";

type ImageProvider = "openai" | "gemini";

/**
 * FALLBACK CHAINS — when a model hits rate limit / quota, auto-try the next one.
 * Order: Best → Medium → Fast for each provider, then cross-provider fallback.
 */
const GEMINI_MODELS = [
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview",
  "gemini-2.5-flash-image",
];
const OPENAI_MODELS = [
  "gpt-image-1.5",
  "gpt-image-1",
  "gpt-image-1-mini",
];

/**
 * Build fallback chain starting from the selected model.
 * If Gemini selected: try remaining Gemini models → then all OpenAI models
 * If OpenAI selected: try remaining OpenAI models → then all Gemini models
 */
function buildFallbackChain(selectedModel: string, provider: ImageProvider): { model: string; provider: ImageProvider }[] {
  const chain: { model: string; provider: ImageProvider }[] = [];

  if (provider === "gemini") {
    // Start from selected Gemini model, then remaining Gemini, then OpenAI
    const startIdx = GEMINI_MODELS.indexOf(selectedModel);
    const geminiOrder = startIdx >= 0
      ? [...GEMINI_MODELS.slice(startIdx), ...GEMINI_MODELS.slice(0, startIdx)]
      : [selectedModel, ...GEMINI_MODELS];
    // Deduplicate
    const seen = new Set<string>();
    for (const m of geminiOrder) { if (!seen.has(m)) { chain.push({ model: m, provider: "gemini" }); seen.add(m); } }
    for (const m of OPENAI_MODELS) { if (!seen.has(m)) { chain.push({ model: m, provider: "openai" }); seen.add(m); } }
  } else {
    // Start from selected OpenAI model, then remaining OpenAI, then Gemini
    const startIdx = OPENAI_MODELS.indexOf(selectedModel);
    const openaiOrder = startIdx >= 0
      ? [...OPENAI_MODELS.slice(startIdx), ...OPENAI_MODELS.slice(0, startIdx)]
      : [selectedModel, ...OPENAI_MODELS];
    const seen = new Set<string>();
    for (const m of openaiOrder) { if (!seen.has(m)) { chain.push({ model: m, provider: "openai" }); seen.add(m); } }
    for (const m of GEMINI_MODELS) { if (!seen.has(m)) { chain.push({ model: m, provider: "gemini" }); seen.add(m); } }
  }

  return chain;
}

/**
 * Detect if an error is a rate limit / quota error (retryable with different model).
 */
function isRateLimitError(errorMsg: string): boolean {
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("exceeded") ||
    lower.includes("too many requests") ||
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("requests_per_model_per_day") ||
    lower.includes("retry in")
  );
}

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

// ── Main — auto-fallback across models when rate limited ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, provider, apiKey, model, geminiKey, openaiKey } = body;
    if (!prompt?.trim()) return NextResponse.json({ error: "Image prompt required" }, { status: 400 });

    // Collect all available API keys
    const keys: Record<string, string> = {};
    if (apiKey?.trim()) {
      const p = (provider || "openai") as ImageProvider;
      keys[p] = apiKey;
    }
    if (geminiKey?.trim()) keys.gemini = geminiKey;
    if (openaiKey?.trim()) keys.openai = openaiKey;

    if (Object.keys(keys).length === 0) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }

    const imgProvider = (provider || "openai") as ImageProvider;
    const imgModel = model || (imgProvider === "gemini" ? "gemini-2.5-flash-image" : "gpt-image-1.5");

    // Build the full fallback chain
    const chain = buildFallbackChain(imgModel, imgProvider);

    // SAME prompt for both providers — consistent quality
    const fullPrompt = buildImagePrompt(prompt);

    let lastError = "";

    // Try each model in the fallback chain
    for (let attempt = 0; attempt < chain.length; attempt++) {
      const { model: tryModel, provider: tryProvider } = chain[attempt];
      const tryKey = keys[tryProvider];

      // Skip if we don't have an API key for this provider
      if (!tryKey) {
        console.log(`[Image API] Skipping ${tryProvider}/${tryModel} — no API key`);
        continue;
      }

      try {
        console.log(`[Image API] ${attempt > 0 ? "FALLBACK " : ""}attempt ${attempt + 1}: provider=${tryProvider}, model=${tryModel}`);

        const imageUrl = tryProvider === "gemini"
          ? await generateGeminiImage(tryKey, fullPrompt, tryModel)
          : await generateOpenAIImage(tryKey, fullPrompt, tryModel);

        // Success! Return with info about which model was actually used
        return NextResponse.json({
          imageUrl,
          usedModel: tryModel,
          usedProvider: tryProvider,
          wasFallback: attempt > 0,
        });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        lastError = errMsg;
        console.error(`[Image API] ${tryProvider}/${tryModel} FAILED: ${errMsg}`);

        // If it's a rate limit / quota error, try next model in chain
        if (isRateLimitError(errMsg)) {
          console.log(`[Image API] Rate limit detected on ${tryModel}, trying next fallback...`);
          continue;
        }

        // For non-rate-limit errors (bad prompt, safety filter, etc.), also try next
        // but only if the error seems transient
        if (attempt < chain.length - 1) {
          console.log(`[Image API] Non-quota error on ${tryModel}, trying next fallback...`);
          continue;
        }
      }
    }

    // All models in chain failed
    return NextResponse.json(
      { error: `All image models failed. Last error: ${lastError}` },
      { status: 500 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed" },
      { status: 500 }
    );
  }
}
