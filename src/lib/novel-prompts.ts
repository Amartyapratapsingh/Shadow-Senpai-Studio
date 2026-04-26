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

ART STYLE REFERENCE: Modern Japanese anime like Classroom of the Elite, Solo Leveling, Horimiya — soft cel-shading, detailed realistic proportions, large but not exaggerated eyes, natural hair colors, clean modern clothing.

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
  // ~70 words per panel = ONE visual moment = image matches exactly
  const targetScenes = Math.max(5, Math.ceil(wordCount / 70));

  return `You are an anime storyboard artist breaking a script into VISUAL PANELS for a video.

Each panel = ONE SPECIFIC VISUAL MOMENT that can be captured in a single image.

Think of it like keyframes in an anime episode — each panel shows ONE freeze-frame of the story.

WHEN TO CREATE A NEW PANEL:
- A character DOES something new (picks up object, opens door, throws punch)
- A character's EXPRESSION changes significantly (surprise, anger, tears)
- The CAMERA would move to a different angle/position
- A new CHARACTER appears or enters the frame
- The LOCATION changes
- Time passes

CRITICAL RULE — IMAGE ACCURACY:
The "imageDescription" must describe ONLY what happens in THAT panel's narration text.
- If the narration says "a lemon fell on his head" — the image shows a lemon falling on his head. NOT a girl wiping his face (that's a different panel).
- If the narration says "she walked into the room" — the image shows her walking in. NOT her already sitting down.
- Pick the FIRST or MOST DRAMATIC moment from the panel's narration for the image.
- NEVER show something from a LATER or EARLIER panel.

NARRATION RULES:
- Copy narration text EXACTLY from the script — word for word, same language
- NEVER change, translate, summarize, or skip any word
- All panels together must contain the COMPLETE text — nothing missing
- This is chunk ${chunkIndex}/${totalChunks}

IMAGE DESCRIPTION RULES:
- MUST be in ENGLISH regardless of narration language
- Start with: "Japanese anime 2D illustration, manga art style, cel-shaded coloring, clean lineart."
- Describe the EXACT MOMENT from this panel's narration ONLY
- Anime characters: large expressive eyes, stylized hair, dynamic poses
- Include: setting, lighting, mood, camera angle
- Be VERY specific about what characters are DOING and their EXPRESSIONS

OUTPUT FORMAT (strict JSON, no markdown, no code blocks):
[
  {
    "narration": "exact text from script...",
    "imageDescription": "Japanese anime 2D illustration, manga art style, cel-shaded coloring, clean lineart. [EXACT moment from THIS narration only — specific character actions, expressions, setting, lighting]"
  }
]

SCRIPT (${wordCount} words, ~${targetScenes} panels):

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

ART STYLE (MANDATORY): Modern Japanese anime — like Classroom of the Elite, Solo Leveling, Horimiya quality. Soft cel-shading, detailed realistic proportions, natural hair colors, clean modern look. NOT old-school manga. NOT chibi. NOT cartoonish.

IMAGE MUST SHOW: The EXACT moment from this narration. Pick the most dramatic visual moment.

Write the prompt following this structure:
1. "Modern Japanese anime illustration, soft cel-shading, detailed realistic proportions, 16:9 cinematic widescreen."
2. The SPECIFIC action/moment happening
3. Characters EXACTLY as described in the character designs above (copy their description word-for-word)
4. Expressions and poses matching the emotion of the scene
5. Setting: specific location, background details
6. Lighting: dramatic, matching mood (warm indoor, cold outdoor, neon, etc.)
7. Camera angle

Output ONLY the prompt text:`;
}
