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
function buildImagePrompt(rawPrompt: string, provider: ImageProvider = "openai"): string {
  let clean = rawPrompt.replace(/^(Japanese anime|Anime art style|manga art|Modern Japanese)[^.]*\.\s*/i, "").trim();

  // OpenAI needs MUCH stronger anime enforcement — it defaults to realism
  if (provider === "openai") {
    return `2D Japanese anime cel animation frame. Hand-drawn anime art. 16:9 widescreen.

SCENE: ${clean}

THIS IMAGE MUST LOOK LIKE A 2D HAND-DRAWN ANIME FRAME — like a screenshot from Demon Slayer, Jujutsu Kaisen, or Solo Leveling anime on Crunchyroll.

MANDATORY 2D ANIME STYLE (the MOST important instruction — follow EXACTLY):
- 100% FLAT 2D cel-shading. ONLY 2-3 flat color tones per surface. ZERO smooth gradients anywhere.
- THICK visible BLACK OUTLINES on every single edge — characters, hair, clothes, objects, furniture, walls. Like hand-drawn ink lines.
- Hair = CHUNKY FLAT COLOR BLOCKS with black outline separating each section. NOT individual strands.
- Skin = ONE flat base color + ONE flat shadow color. Nothing else. Like a coloring book filled in.
- Eyes = big simple anime eyes with flat color iris + white dot highlight. NOT detailed realistic eyes.
- Clothes = flat solid colors with simple fold lines. NO fabric texture, NO wrinkles detail, NO brand logos.
- ALL OBJECTS (money, phones, bags, food) = simplified flat colored shapes with black outlines. NOT photorealistic objects.
- Background = VERY SIMPLE. Flat colored walls, simple shapes for shelves/furniture. BLURRY or LOW DETAIL compared to characters. Like anime where budget goes to characters not backgrounds.
- Rain/weather = simple white lines on flat background. NOT realistic rain rendering.
- Lighting = ONE simple directional shadow. Hard edge. NOT soft, NOT volumetric, NOT atmospheric glow.

THE ENTIRE IMAGE MUST LOOK LIKE IT WAS DRAWN WITH:
1. Black ink pen for outlines
2. Flat markers/paint bucket for coloring
3. Maximum 2-3 colors per surface area
4. Zero texture detail on any surface

ABSOLUTELY FORBIDDEN:
- NO realistic rendering, textures, or materials of ANY kind
- NO smooth gradient shading or color blending
- NO detailed backgrounds — keep them simple and flat
- NO realistic objects (money = flat green rectangles, phone = flat rectangle with screen glow)
- NO 3D render, oil painting, digital painting, or concept art look
- NO text, watermarks, or subtitles

CHARACTER AGE: Adults = tall, mature sharp face, defined jawline, adult proportions. NOT children.

Think of this as a FRAME from an anime episode — pure 2D, flat colors, black outlines, simple and clean. LANDSCAPE 16:9.`;
  }

  // Gemini follows anime style better with a simpler prompt
  return `Anime TV episode screenshot, 16:9 widescreen, flat cel-shading, visible black outlines.

${clean}

CHARACTER AGE: Characters MUST look their stated age. Adults = tall, mature face, defined jawline, broad shoulders, 170-185cm. NOT teenagers.

ART STYLE:
- Flat cel-shading, 2-3 shadow tones, hard shadow edges, NO gradients
- Visible black outlines on all edges
- Chunky hair strands, flat color skin, simple anime eyes
- Like MAPPA / A-1 Pictures anime quality
- NOT digital painting, NOT concept art, NOT 3D render
- NO text, subtitles, or watermarks

ONE scene, ONE frame, LANDSCAPE 16:9.`;
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

        // Build provider-specific prompt — OpenAI needs stronger anime enforcement
        const fullPrompt = buildImagePrompt(prompt, tryProvider);

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
