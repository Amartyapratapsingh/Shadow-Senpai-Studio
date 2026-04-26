/**
 * Novel Video Creation Prompts
 * HYBRID: Client rough-split → AI smart scene breaks → AI image prompts
 */

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
  const targetScenes = Math.max(3, Math.ceil(wordCount / 150));

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
    ? `\nCHARACTER REFERENCE (same appearance):\n${characterRef}`
    : "";

  return `You are an anime art director. Read this narration and write an image prompt for the EXACT MOMENT described.

NARRATION (panel ${sceneNumber}/${totalScenes}):
"${narration}"
${charInstruction}

IMPORTANT: The image must show EXACTLY what this narration describes. Pick the FIRST or MOST DRAMATIC specific moment.
- If it says "he grabbed the axe" → show him grabbing an axe, NOT something else
- If it says "tears rolled down her face" → show her crying, NOT her smiling
- If it says "he walked into the rain" → show him walking into rain, NOT inside a building

Write the prompt as:
1. "Japanese anime 2D illustration, manga art style, cel-shaded coloring, clean lineart."
2. The SPECIFIC moment: who is doing what, their exact expression and pose
3. Characters: anime features — large eyes, stylized hair (specify color), outfit details
4. Setting: exact location, background elements
5. Mood: lighting style, color palette
6. Camera: angle (low/high/close-up/wide)

Output ONLY the prompt text, nothing else:`;
}
