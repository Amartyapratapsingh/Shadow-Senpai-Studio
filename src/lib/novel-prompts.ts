/**
 * Prompts for Novel Video Creation.
 * Supports genres + any language.
 * Panel count is calculated from script length for accuracy.
 */

export function getNovelScriptPrompt(
  novelName: string,
  style: string,
  genreHint?: string
): string {
  const genreInstruction = genreHint
    ? `\n\nGENRE/STYLE: ${genreHint}\nFollow this genre's conventions, tropes, and emotional beats closely. Make the narration match this genre perfectly.`
    : "";

  return `You are an expert storyteller specializing in manhwa, manhua, and web novel narration for YouTube videos.

Write a vivid, cinematic narration script for: "${novelName}"
${genreInstruction}

RULES:
- Write ONLY the spoken narration. No headers, labels, brackets, quotes, or formatting.
- Write in a ${style} style.
- Write in the SAME language as the novel name. If Hindi, write in Hindi. If English, write in English.
- Cover the story scene by scene with rich visual and emotional detail.
- The script should be 1500-2500 words.
- Make it sound natural for a YouTube video narration.
- DO NOT change the story. Stay faithful to the original plot if it is a known story.
- DO NOT add your own plot points or change character relationships.
- If you know this novel/manhwa, narrate it accurately.

Write the full script now:`;
}

export function getPanelSplitPrompt(script: string): string {
  // Calculate panel count based on script length
  // ~150 words = 1 minute of audio = 1 panel image
  // So each panel covers ~1 minute of narration
  const wordCount = script.trim().split(/\s+/).filter(w => w.length > 0).length;
  const estimatedMinutes = Math.ceil(wordCount / 150);
  const panelCount = Math.max(8, Math.min(estimatedMinutes, 60)); // min 8, max 60 panels

  // Words per panel
  const wordsPerPanel = Math.ceil(wordCount / panelCount);

  return `You are a professional anime storyboard artist creating panels for an animated YouTube video.

CRITICAL — PANEL COUNT CALCULATION:
- This script has approximately ${wordCount} words.
- Estimated video length: ${estimatedMinutes} minutes.
- You MUST create EXACTLY ${panelCount} panels — one panel for every minute of video.
- Each panel should cover approximately ${wordsPerPanel} words of the script.
- DO NOT create fewer panels. DO NOT skip any part of the script.
- Every single sentence of the script must appear in exactly one panel's narration.

MULTI-LANGUAGE SUPPORT:
- The script may be in ANY language (Hindi, English, Chinese, Korean, etc.)
- "narration" field: keep the EXACT original text in its ORIGINAL language. Do NOT translate.
- "imagePrompt" field: ALWAYS write in ENGLISH.

CHARACTER CONSISTENCY (CRITICAL):
- Before splitting, identify ALL named characters.
- Create a fixed visual design for each: exact hair color, hair style, eye color, skin tone, outfit.
- In panel 1's imagePrompt, describe every character's full appearance.
- In ALL subsequent panels, use the EXACT SAME appearance description. Never change a character's look.

SPLITTING RULES:
- Go through the script from START to END, line by line.
- Divide it into ${panelCount} equal sections.
- Each panel's narration = the exact text from that section, unchanged.
- Do NOT rearrange, summarize, or skip any text.
- The narration of panel 1 + panel 2 + ... + panel ${panelCount} = the COMPLETE original script with nothing missing.

IMAGE PROMPT RULES:
- Every imagePrompt MUST start with: "Anime art style, Japanese animation quality, 16:9 cinematic widescreen illustration."
- Describe the EXACT scene happening in that panel's narration.
- Include: characters (with FIXED design), setting, mood, lighting, action, camera angle.
- Make each image visually distinct from the others.

OUTPUT FORMAT (strict JSON array, no markdown, no code blocks, no extra text before or after):
[
  {
    "panel": 1,
    "narration": "Exact text from the script in ORIGINAL language...",
    "imagePrompt": "Anime art style, Japanese animation quality, 16:9 cinematic widescreen illustration. [Scene description in ENGLISH]"
  }
]

REMEMBER: You MUST output EXACTLY ${panelCount} panels. Not less. Count them.

Script to split (${wordCount} words, ${panelCount} panels needed):

${script}

Output ONLY the JSON array with exactly ${panelCount} panels now:`;
}
