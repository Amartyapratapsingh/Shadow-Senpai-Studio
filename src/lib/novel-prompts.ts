/**
 * Novel Video Creation — Two-Pass Smart Scene Splitting
 *
 * Pass 1: AI reads ENTIRE script and outputs scene break positions
 * Pass 2: For each scene, AI generates image prompt
 *
 * This ensures NO scene is cut, NO content is lost, NO repetition.
 */

export function getNovelScriptPrompt(
  novelName: string,
  style: string,
  genreHint?: string
): string {
  const genreInstruction = genreHint
    ? `\n\nGENRE/STYLE: ${genreHint}\nFollow this genre's conventions closely.`
    : "";

  return `You are an expert storyteller specializing in manhwa, manhua, and web novel narration for YouTube videos.

Write a vivid, cinematic narration script for: "${novelName}"
${genreInstruction}

RULES:
- Write ONLY the spoken narration. No headers, labels, brackets, quotes, or formatting.
- Write in a ${style} style.
- Write in the SAME language as the novel name.
- Cover the story scene by scene with rich visual and emotional detail.
- The script should be 1500-2500 words.
- Make it sound natural for a YouTube video narration.
- DO NOT change the story. Stay faithful to the original plot.

Write the full script now:`;
}

/**
 * PASS 1: Scene Planning
 * AI reads the ENTIRE script and outputs scene break positions.
 * Output is COMPACT — just scene numbers + first few words + description.
 * The actual narration text is extracted client-side.
 */
export function getScenePlanPrompt(script: string): string {
  const wordCount = script.trim().split(/\s+/).length;
  const estimatedMinutes = Math.ceil(wordCount / 150);
  const sceneCount = Math.max(8, Math.min(estimatedMinutes, 50));

  return `You are a film director planning scenes for an anime video.

Read the ENTIRE script below carefully. Then divide it into exactly ${sceneCount} scenes.

For each scene, tell me:
1. The FIRST 8 WORDS of that scene (so I can find where it starts in the script)
2. A short scene description for the image (in English, 1 sentence)

CRITICAL RULES:
- Read the FULL script before deciding where to break scenes
- Break at NATURAL scene transitions — when location changes, new character appears, mood shifts, time passes, or action changes
- NEVER cut mid-sentence or mid-dialogue
- Every word of the script must belong to exactly ONE scene — no gaps, no overlaps
- Scene 1 starts at the very beginning of the script
- The last scene ends at the very last word of the script
- The "firstWords" must be EXACTLY as they appear in the script (same language, same words)

OUTPUT FORMAT (strict JSON array, no markdown, no code blocks):
[
  {"scene":1,"firstWords":"the first eight words here","description":"A cinematic anime scene showing..."},
  {"scene":2,"firstWords":"next scene starts with these","description":"An intense anime scene where..."}
]

SCRIPT (${wordCount} words, split into ${sceneCount} scenes):

${script}

Output ONLY the JSON array:`;
}

/**
 * PASS 2: Image Prompt Generation
 * For a specific scene's narration text, generate a detailed image prompt.
 */
export function getImagePromptForScene(narration: string, sceneNumber: number, totalScenes: number, characterRef?: string): string {
  const charInstruction = characterRef
    ? `\n\nCHARACTER REFERENCE (use EXACT same appearance):\n${characterRef}`
    : "";

  return `Generate a detailed anime image prompt for scene ${sceneNumber}/${totalScenes} of a video.

NARRATION FOR THIS SCENE:
"${narration}"
${charInstruction}

Write ONE detailed image prompt in English that:
- Starts with "Anime art style, 16:9 cinematic widescreen illustration."
- Describes the EXACT scene from the narration above
- Includes: characters (with consistent appearance), setting, mood, lighting, camera angle
- Is suitable for AI image generation

RULES:
- Output ONLY the image prompt text, nothing else
- No headers, no labels, no quotes around it
- One single scene, not a comic strip
- In English regardless of the narration language`;
}
