/**
 * Novel Video Creation Prompts
 * HYBRID: Client rough-split → AI smart scene breaks → AI image prompts
 * CHARACTER CONSISTENCY: Claude creates character sheets, used in every image
 */

/**
 * STEP 0: CHARACTER DESIGN SHEET
 * Claude reads the script and creates a FIXED visual design for every character.
 * This is used in EVERY image prompt to keep characters looking the same.
 */
export function getCharacterSheetPrompt(script: string): string {
  // Only send first ~3000 words to identify characters
  const preview = script.split(/\s+/).slice(0, 3000).join(" ");

  return `You are an anime character designer. Read the script below and identify ALL named characters. For each character, create a FIXED visual design that will be used in every image.

IMPORTANT: These descriptions will be copy-pasted into EVERY image prompt, so they must be:
- Specific and detailed enough to generate consistent images
- Written as image generation keywords (not sentences)
- The SAME description used every single time the character appears

For each character, provide:
- Name
- Gender, approximate age
- Hair: exact color, length, style (e.g., "short messy jet-black hair with bangs over forehead")
- Eyes: exact color, shape (e.g., "sharp dark brown eyes, narrow, intense gaze")
- Face: shape, features (e.g., "angular jawline, fair skin, slight stubble")
- Build: body type (e.g., "tall, lean athletic build")
- Outfit: default clothing (e.g., "white button-up shirt with rolled sleeves, black pants")
- Distinguishing features: scars, accessories, etc.

ART STYLE REFERENCE: Anime TV episode frame — FLAT cel-shading (2-3 tones only, hard shadow edges), visible black outlines on everything, chunky hair strands (not individual), flat color skin, simple anime eyes with highlight dot. Like A-1 Pictures / CloverWorks / MAPPA studio quality. NOT digital painting, NOT concept art.

OUTPUT FORMAT (strict JSON, no markdown):
[
  {
    "name": "Character Name",
    "prompt": "young man, early 20s, short messy jet-black hair with bangs over forehead, sharp dark brown eyes with intense gaze, angular jawline, fair skin, tall lean athletic build, white button-up shirt with rolled sleeves and black pants"
  }
]

SCRIPT:
${preview}

Output ONLY the JSON array:`;
}

export function getNovelScriptPrompt(
  novelName: string,
  style: string,
  genreHint?: string
): string {
  const genreInstruction = genreHint
    ? `\n\nGENRE/STYLE: ${genreHint}\nFollow this genre's conventions closely.`
    : "";

  return `You are an expert manhwa/manhua/web novel YouTube narrator. Write a dramatic, cinematic narration script for: "${novelName}"
${genreInstruction}

NARRATION STYLE:
- Scene by scene, moment by moment — like narrating a movie
- Short punchy sentences for action. Longer flowing sentences for emotion.
- Dialogue woven naturally into narration
- Vivid physical descriptions and character reactions
- Write in a ${style} style
- Write in the SAME language as the novel name

RULES:
- ONLY spoken narration. No headers, labels, brackets, formatting.
- 1500-2500 words. Stay faithful to plot.
- Pure spoken text for AI voice generation.

Write the full script now:`;
}

/**
 * AI SCENE DETECTION — reads ~3000 words and finds natural scene breaks.
 *
 * KEY RULE: Each scene = ONE SPECIFIC VISUAL MOMENT.
 * The image must show EXACTLY what's described in THAT panel's narration.
 * NOT a summary. NOT a later moment. THE EXACT moment.
 */
export function getSmartSceneBreakPrompt(chunk: string, chunkIndex: number, totalChunks: number): string {
  const wordCount = chunk.trim().split(/\s+/).length;
  // Let AI decide the count — don't force a number
  const minScenes = Math.max(5, Math.ceil(wordCount / 100));
  const maxScenes = Math.ceil(wordCount / 30);

  return `You are an anime CAMERA OPERATOR deciding where to cut between shots.

Each panel = ONE CAMERA SHOT = ONE still image.

Imagine you are filming this as a real anime. Each panel is ONE camera shot — what the camera SEES in that single moment before it cuts to the next shot.

THE GOLDEN RULE: If you cannot show EVERYTHING in the panel's text in ONE single image, the panel is too long. Split it.

EXAMPLE OF CORRECT SPLITTING:
Script: "Rain was pouring from the sky. He pulled out his gun and aimed. The bullet hit the man and he collapsed to the ground."

WRONG (too many moments in one panel):
Panel 1: "Rain was pouring from the sky. He pulled out his gun and aimed. The bullet hit the man and he collapsed to the ground."
→ Image can't show rain + shooting + falling all at once

CORRECT (one camera shot per panel):
Panel 1: "Rain was pouring from the sky."
→ Image: Dark rainy sky, heavy rain falling on a street
Panel 2: "He pulled out his gun and aimed."
→ Image: Close-up of man holding gun, aiming forward, rain on his face
Panel 3: "The bullet hit the man and he collapsed to the ground."
→ Image: Man falling backwards, impact moment, rain splashing around him

HOW TO DECIDE WHERE TO CUT:
- Each panel should describe ONE thing the camera sees
- If the text has TWO actions (he did X AND Y) → split into two panels
- If a new character appears → new panel
- If location or time changes → new panel
- If the emotion/mood shifts → new panel
- Dialogue can stay with the action it accompanies

AIM for ${minScenes} to ${maxScenes} panels from this chunk. More panels = better image accuracy.

NARRATION RULES:
- Copy narration text EXACTLY from the script — word for word, same language
- NEVER change, translate, summarize, or skip any word
- All panels together must contain the COMPLETE text — nothing missing
- This is chunk ${chunkIndex}/${totalChunks}

IMAGE DESCRIPTION RULES:
- MUST be in ENGLISH regardless of narration language
- Start with: "Anime TV episode frame, flat cel-shading, visible black outlines, 16:9."
- Describe EXACTLY what the camera sees in this ONE SHOT — nothing more, nothing less
- If narration says "rain falling" → image shows rain. If narration says "he aimed gun" → image shows him aiming.
- Anime characters: flat color skin, chunky hair strands, simple clean eyes
- Include: setting, lighting, mood, camera angle
- Be VERY specific about what characters are DOING and their EXPRESSIONS

OUTPUT FORMAT (strict JSON, no markdown, no code blocks):
[
  {
    "narration": "exact text from script...",
    "imageDescription": "Anime TV episode frame, flat cel-shading, visible black outlines, 16:9. [EXACT moment from THIS narration only — specific character actions, expressions, setting, lighting]"
  }
]

SCRIPT (${wordCount} words, ${minScenes}-${maxScenes} panels):

${chunk}

Output ONLY the JSON array:`;
}

/**
 * IMAGE PROMPT — Claude generates a detailed anime prompt from narration.
 * Used when scene splitting gives a weak/generic description.
 */
export function getImagePromptForScene(narration: string, sceneNumber: number, totalScenes: number, characterRef?: string): string {
  const charInstruction = characterRef
    ? `\nCHARACTER DESIGNS (use EXACTLY these descriptions — do NOT change any character's appearance):\n${characterRef}`
    : "";

  return `You are an anime art director. Read this narration and write an image prompt for the EXACT MOMENT described.

NARRATION (panel ${sceneNumber}/${totalScenes}):
"${narration}"
${charInstruction}

ART STYLE (MANDATORY): Anime TV episode frame — FLAT cel-shading (2-3 tones, hard shadow edges), visible black outlines, chunky hair strands, flat color fills for skin and clothes, simple anime eyes. Like a screenshot from Crunchyroll. NOT digital painting, NOT concept art, NOT 3D render.

IMAGE MUST SHOW: The EXACT moment from this narration. Pick the most dramatic visual moment.

Write the prompt following this structure:
1. "Anime TV episode frame, flat cel-shading, visible black outlines, 16:9 widescreen."
2. The SPECIFIC action/moment happening
3. Characters EXACTLY as described in the character designs above (copy their description word-for-word)
4. Expressions and poses matching the emotion of the scene
5. Setting: specific location, background details
6. Lighting: dramatic, matching mood (warm indoor, cold outdoor, neon, etc.)
7. Camera angle

Output ONLY the prompt text:`;
}
