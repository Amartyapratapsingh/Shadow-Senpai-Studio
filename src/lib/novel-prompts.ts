/**
 * Novel Video Creation Prompts
 *
 * HYBRID approach:
 * - Client-side rough split into ~3000 word chunks (FREE)
 * - AI reads each chunk and detects natural scene breaks (CHEAP)
 * - AI generates image prompts per scene (CHEAP)
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
- Cover the story scene by scene.
- The script should be 1500-2500 words.
- Make it sound natural for a YouTube video narration.
- Stay faithful to the original plot.

Write the full script now:`;
}

/**
 * AI SCENE DETECTION — reads a ~3000 word chunk and finds natural scene breaks.
 *
 * The AI splits BY MEANING, not by word count:
 * - Location changes
 * - Time jumps (next day, later that night)
 * - New character enters
 * - Mood/tone shifts
 * - Action changes (fight starts, conversation begins)
 *
 * Output: Array of scenes with the EXACT narration text + image description.
 * Cost: ~3000 tokens input, ~2000 tokens output per chunk = CHEAP
 */
export function getSmartSceneBreakPrompt(chunk: string, chunkIndex: number, totalChunks: number): string {
  const wordCount = chunk.trim().split(/\s+/).length;
  const targetScenes = Math.max(3, Math.ceil(wordCount / 150));

  return `You are a film director breaking a script into visual scenes for an anime video.

Read this section of a script and divide it into ${targetScenes} scenes based on NATURAL STORY TRANSITIONS.

Break scenes when:
- Location changes (moving to a new place)
- Time passes (next morning, later, after a while)
- A new important character appears
- The mood shifts dramatically (happy to sad, calm to action)
- The action changes (talking → fighting, walking → running)

RULES:
- This is chunk ${chunkIndex}/${totalChunks} of the full script
- Output exactly the narration text for each scene — copy it EXACTLY from the script, word for word, same language
- NEVER change, translate, summarize, or skip any word from the script
- Scene 1 starts at the first word of this chunk
- The last scene ends at the last word of this chunk
- Together, all scenes must contain the COMPLETE text of this chunk — nothing missing, nothing added
- The "imageDescription" must be in ENGLISH regardless of the script language

OUTPUT FORMAT (strict JSON, no markdown, no code blocks, no extra text):
[
  {
    "narration": "exact text from script in original language for this scene...",
    "imageDescription": "A short English description of the visual scene for anime image generation"
  }
]

SCRIPT SECTION (${wordCount} words, break into ~${targetScenes} scenes):

${chunk}

Output ONLY the JSON array:`;
}

/**
 * IMAGE PROMPT — generates a detailed anime image prompt for a scene.
 * Input: ~150 words of narration
 * Output: ~50 words of image prompt
 * Cost: TINY
 */
export function getImagePromptForScene(narration: string, sceneNumber: number, totalScenes: number, characterRef?: string): string {
  const charInstruction = characterRef
    ? `\n\nCHARACTER REFERENCE (use EXACT same appearance):\n${characterRef}`
    : "";

  return `Generate a detailed anime image prompt for scene ${sceneNumber}/${totalScenes}.

NARRATION:
"${narration}"
${charInstruction}

Write ONE image prompt that:
- Starts with "Anime art style, 16:9 cinematic widescreen illustration."
- Describes the EXACT scene from the narration
- Includes: characters, setting, mood, lighting, camera angle
- Is in English

Output ONLY the image prompt, nothing else:`;
}
