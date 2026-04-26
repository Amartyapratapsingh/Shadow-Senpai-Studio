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

  return `You are an expert manhwa/manhua/web novel YouTube narrator. Write a dramatic, cinematic narration script for: "${novelName}"
${genreInstruction}

NARRATION STYLE (follow this exactly):
- Write like you're narrating a MOVIE — scene by scene, moment by moment
- SHORT, PUNCHY sentences for action: "I lunged forward." "My fist connected." "She crashed to the floor."
- LONGER, flowing sentences for emotional moments
- Include character dialogue naturally woven into narration — not with quote labels
- Build TENSION: slow before reveals, fast during fights
- Vivid physical descriptions: "His face went pale." "Her knuckles turned white."
- Show reactions: "She took an involuntary step back." "His fists clenched."
- Dramatic transitions: "That's when everything changed." "But I wasn't done."
- Make the viewer FEEL the character's emotions — anger, revenge, satisfaction
- Write in ${style} style
- Write in the SAME language as the novel name

RULES:
- Write ONLY the spoken narration. No headers, labels, brackets, or formatting.
- 1500-2500 words.
- Stay faithful to the original plot if known.
- NO markdown, NO stage directions, NO brackets.
- Pure spoken text ready for AI voice generation.

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
- The "imageDescription" must be a DETAILED anime image prompt, NOT a short summary

IMAGE DESCRIPTION RULES (CRITICAL):
- Start with the exact art style: "Japanese anime 2D illustration, manga art style, cel-shaded coloring, clean lineart"
- Describe characters with ANIME features: large expressive eyes, stylized colorful hair, dynamic poses, exaggerated expressions
- Describe the EXACT moment happening: what characters are doing, their expressions, body language
- Include setting details: location, time of day, weather, background elements
- Include mood/atmosphere: dramatic lighting, color palette, emotional tone
- Be SPECIFIC — not "a scene in a room" but "a dimly lit CEO office with floor-to-ceiling windows showing a night cityscape, mahogany desk, the young man in a torn shirt standing defiantly facing a powerful businessman in an expensive suit"

OUTPUT FORMAT (strict JSON, no markdown, no code blocks, no extra text):
[
  {
    "narration": "exact text from script in original language for this scene...",
    "imageDescription": "Japanese anime 2D illustration, manga art style, cel-shaded coloring, clean lineart. [detailed scene with anime character descriptions, setting, mood, lighting, camera angle]"
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

  return `You are an anime art director. Read this narration and write a DETAILED image prompt for generating a Japanese anime illustration.

NARRATION (scene ${sceneNumber}/${totalScenes}):
"${narration}"
${charInstruction}

Write the image prompt following this EXACT structure:
1. Start with: "Japanese anime 2D illustration, manga art style, cel-shaded coloring, clean lineart."
2. Describe the KEY MOMENT — what is the most visual/dramatic moment in this narration?
3. Describe each CHARACTER visible: anime-style features (large expressive eyes, stylized hair color, outfit, expression, pose)
4. Describe the SETTING: exact location, time of day, background details
5. Describe the MOOD: lighting (dramatic shadows, golden hour, neon glow), color palette, atmosphere
6. Describe the CAMERA: angle (low angle for power, close-up for emotion, wide shot for environment)

EXAMPLE of good output:
"Japanese anime 2D illustration, manga art style, cel-shaded coloring, clean lineart. A young man with messy black hair and fierce golden eyes stands defiantly in a luxurious mansion foyer, his torn casual clothes contrasting with the opulent marble floors. He grips a fire axe on his shoulder, smirking. Behind him, five beautiful women in designer dresses recoil in shock, their faces pale with disbelief. Dramatic low-angle shot, warm chandelier lighting casting long shadows, rich burgundy and gold color palette."

Output ONLY the image prompt text. No headers, no labels:`;
}
