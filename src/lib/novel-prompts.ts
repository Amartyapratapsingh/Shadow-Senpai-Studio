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
  // Read more of the script to catch characters introduced later (was 3000, now 5000)
  const preview = script.split(/\s+/).slice(0, 5000).join(" ");

  return `You are an anime character designer. Read the ENTIRE script below and identify ALL named characters (including ones introduced later in the story). For each character, create a FIXED visual identity.

CRITICAL RULES:
- Describe ONLY things that NEVER change: face, hair, eyes, skin, body build, height, age
- Do NOT include outfits/clothing — characters change clothes throughout the story!
- Do NOT include location — characters move to different places!
- Each character MUST look visually DIFFERENT from every other character (different hair color, eye color, face shape, etc.)

FEMALE CHARACTERS — MUST ALL LOOK DIFFERENT:
- Give EACH female character a UNIQUE combination of: hair color + hair style + eye color + face shape
- Example: Girl A = "long straight black hair, blue eyes, round soft face" / Girl B = "short wavy brown hair, green eyes, sharp angular face" / Girl C = "blonde ponytail, amber eyes, heart-shaped face"
- NEVER make two female characters look similar

AGE IS CRITICAL:
- Determine age from script context (college student = 18-24, working adult = 25-35)
- For adults (18+): MUST include "adult, mature face, defined jawline, adult proportions"
- NEVER describe an adult with childish features. A college student is an ADULT.

INCLUDE ALL CHARACTERS — even unnamed roles:
- Named characters (Kyle, Priya, Vikram, etc.) → use their name
- Unnamed but recurring roles (the cashier, the salesgirl, the landlord, etc.) → use their role as the name (e.g., "Apple Store Salesgirl", "Mall Cashier", "Landlord")
- Each one MUST have a completely UNIQUE visual appearance

For each character describe ONLY:
- Name (or role if unnamed)
- Gender, EXACT age (e.g., "24 years old")
- Height in cm (adults: 165-185cm)
- Hair: exact color, length, style
- Eyes: exact color, shape
- Face: shape, skin color, features matching their age
- Build: body type with height
- Distinguishing features: scars, piercings, tattoos, etc. (NOT clothing)

OUTPUT FORMAT (strict JSON, no markdown):
[
  {
    "name": "Character Name or Role",
    "prompt": "adult man, 24 years old, 178cm tall, mature sharp face with defined jawline, short messy jet-black hair with bangs, sharp dark brown eyes, fair skin, tall lean athletic build with broad shoulders"
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
export function getSmartSceneBreakPrompt(chunk: string, chunkIndex: number, totalChunks: number, language?: string): string {
  const wordCount = chunk.trim().split(/\s+/).length;
  const isHindi = language === "hindi";

  // Hindi words are denser (1 Hindi word ≈ 2-3 English words), so need MORE panels per word
  // English: ~50 words per panel → Hindi: ~25-30 words per panel
  const minScenes = isHindi
    ? Math.max(8, Math.ceil(wordCount / 40))   // Hindi: 1 panel per 40 words min
    : Math.max(5, Math.ceil(wordCount / 70));   // English: 1 panel per 70 words min
  const maxScenes = isHindi
    ? Math.ceil(wordCount / 15)                  // Hindi: up to 1 panel per 15 words
    : Math.ceil(wordCount / 25);                 // English: up to 1 panel per 25 words

  const hindiNote = isHindi ? `
HINDI TEXT NOTICE: This narration is in Hindi (Devanagari). Hindi words carry MORE meaning per word than English.
A single Hindi sentence often packs 2-3 visual moments. You MUST split aggressively.
- Each panel should have only 1-2 Hindi sentences MAX.
- If a Hindi sentence has more than one action verb, SPLIT it into separate panels.
- Err on the side of TOO MANY panels rather than too few.` : "";

  return `You are an anime CAMERA OPERATOR deciding where to cut between shots.

Each panel = ONE CAMERA SHOT = ONE still image.

Imagine you are filming this as a real anime. Each panel is ONE camera shot — what the camera SEES in that single moment before it cuts to the next shot.
${hindiNote}

THE GOLDEN RULE: If you cannot show EVERYTHING in the panel's text in ONE single image, the panel is too long. Split it.

CRITICAL: MORE PANELS IS ALWAYS BETTER. Each image must perfectly match its panel text.
When in doubt, SPLIT INTO MORE PANELS. A panel with 1 sentence is PERFECT.
A panel with 3+ sentences is TOO LONG — break it up.

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
- 1-2 sentences per panel is IDEAL. 3 sentences = probably too many.

YOU MUST create at LEAST ${minScenes} panels. Aim for ${minScenes} to ${maxScenes} panels.
Going ABOVE the max is fine. Going BELOW the min is NOT acceptable.

NARRATION RULES:
- Copy narration text EXACTLY from the script — word for word, same language
- NEVER change, translate, summarize, or skip any word
- All panels together must contain the COMPLETE text — nothing missing
- This is chunk ${chunkIndex}/${totalChunks}

IMAGE DESCRIPTION RULES:
- MUST be in ENGLISH regardless of narration language
- Start with: "Anime TV episode frame, flat cel-shading, visible black outlines, 16:9."
- Describe EXACTLY what the camera sees in this ONE SHOT

WHICH CHARACTERS ARE IN THIS PANEL? (CRITICAL — read carefully):
- Identify by NAME or ROLE which specific characters appear in THIS panel's narration
- Only include characters who are MENTIONED or PRESENT in this panel — not every character from the story
- If the narration says "the cashier" → describe a cashier with a UNIQUE look (store uniform, name tag)
- If the narration says "a beautiful woman" → describe her with a UNIQUE appearance different from ALL other women in other panels
- EVERY female character must have a DIFFERENT hair color, eye color, and face shape. NEVER repeat the same girl.
- If the MC is NOT mentioned in this panel → do NOT put him in the image

OUTFIT — MUST MATCH THE STORY MOMENT:
- What is each character wearing RIGHT NOW based on the story progression?
- If the MC started poor (old clothes) but later got rich (suit, designer) → later panels show rich outfit
- If a character "changed clothes" or "bought new clothes" earlier → they wear the NEW clothes from that point on
- A cashier wears a uniform. A salesgirl at Apple wears a polo. A rich girl wears designer. Each person dresses according to WHO they are.

LOCATION — MUST MATCH THIS PANEL:
- WHERE is this scene? Read from the narration. Mall? Apple store? Street? Penthouse? Restaurant?
- Each panel can be in a DIFFERENT location. Describe the CURRENT location accurately.

CHARACTER AGE:
- Adults (18+) = "adult man/woman, mid-20s, 175cm tall, mature sharp face, defined jawline, broad shoulders"

OUTPUT FORMAT (strict JSON, no markdown, no code blocks):
[
  {
    "narration": "exact text from script...",
    "imageDescription": "Anime TV episode frame, flat cel-shading, visible black outlines, 16:9. [WHO is here — by name/role, UNIQUE appearance for each], [CURRENT outfit matching story progression], [CURRENT location], [action], [lighting, camera angle]"
  }
]

SCRIPT (${wordCount} words, MINIMUM ${minScenes} panels, aim for ${maxScenes}):

${chunk}

Output ONLY the JSON array:`;
}

/**
 * IMAGE PROMPT — Claude generates a detailed anime prompt from narration.
 * Used when scene splitting gives a weak/generic description.
 */
export function getImagePromptForScene(narration: string, sceneNumber: number, totalScenes: number, characterRef?: string): string {
  const charInstruction = characterRef
    ? `\nCHARACTER IDENTITY SHEET (face, hair, eyes, build — NO outfits):\n${characterRef}`
    : "";

  return `You are an anime art director. Read this narration CAREFULLY and generate an image prompt + save any new character descriptions.

NARRATION (panel ${sceneNumber}/${totalScenes}):
"${narration}"
${charInstruction}

STEP 1 — IDENTIFY WHO IS IN THIS PANEL:
- Which characters are PRESENT in this narration? Match by NAME or ROLE to the character sheet.
- If someone is in the sheet → use their EXACT saved description (face, hair, eyes, build) word-for-word.
- If someone is NOT in the sheet (new character, unnamed role like "cashier", "salesgirl") → create a UNIQUE detailed visual for them. This will be SAVED and reused every time this character appears again.
- EVERY character must look DIFFERENT from every other character. Different hair color, eye color, face shape.
- If the MC is NOT mentioned → do NOT include them.

STEP 2 — OUTFIT (from story context, NOT from character sheet):
- Determine what each character is wearing RIGHT NOW based on story progression.
- Poor MC → old clothes. Rich MC → expensive suit. Cashier → store uniform. Salesgirl → work polo.

STEP 3 — LOCATION (from narration):
- Where is this scene? Describe the specific place.

ART STYLE: Anime TV episode frame, flat cel-shading, visible black outlines, 16:9 widescreen.
CHARACTER AGE: Adults (18+) = TALL, mature face, defined jawline, 170-185cm. NOT teenagers.

OUTPUT FORMAT — strict JSON, no markdown, no code blocks:
{
  "imagePrompt": "Anime TV episode frame, flat cel-shading, visible black outlines, 16:9 widescreen. [full image prompt here with character descriptions, outfit, location, action, lighting, camera angle]",
  "newCharacters": "Role/Name: full visual description (face, hair, eyes, build only — NO outfit)\\nRole/Name2: description"
}

RULES for newCharacters field:
- ONLY include characters who are NOT already in the character sheet above
- If ALL characters in this panel are already in the sheet → set newCharacters to ""
- Format each new character as: "Role or Name: description" separated by newlines
- Description = face, hair color/style, eye color, skin, build, age, height ONLY (no outfit)
- These descriptions will be SAVED and reused in ALL future panels, so be specific and detailed

Output ONLY the JSON object:`;
}

/**
 * VIRAL YOUTUBE REWRITE — transforms raw novel chapters into fast-paced YouTube narration.
 * Used by the /youtube page. Rewrites chunk by chunk.
 */
export function getViralRewritePrompt(rawChapter: string, language: "hindi" | "english" = "hindi"): string {
  const langNote = language === "hindi"
    ? `OUTPUT LANGUAGE: Simple conversational Hindi (Hinglish). Use Devanagari script. Do NOT use Shudh Hindi or Sanskrit-heavy words. Use common English words where natural (power, attack, system, level, etc.). Keep character names in English/original.`
    : `OUTPUT LANGUAGE: English. Dramatic, cinematic narration style.`;

  return `You are a VIRAL YouTube narrator who rewrites boring novel text into ADDICTIVE, fast-paced YouTube narration scripts. Your scripts get millions of views because viewers CANNOT stop watching.

REWRITE RULES (follow EVERY rule — this is what makes the script go viral):

1. FIRST PERSON: Convert ALL 3rd person to 1st person. "He walked into the room" → "मैं कमरे में गया". The viewer BECOMES the main character. They feel everything.

2. "लेकिन" EVERY 40-60 WORDS: Add a direction change (लेकिन / पर / मगर / लेकिन तभी) every 15-20 seconds of narration. Every time the audience thinks they know what's happening → FLIP it. This is the #1 retention trick.

3. SHORT SENTENCES: Maximum 2-3 lines per thought. Then move on. No long paragraphs. Every sentence hits like a punch. If a sentence doesn't create EMOTION or move the PLOT → delete it.

4. VILLAIN BEHIND THE BACK: After the MC walks away or leaves a scene, add 2-3 lines showing what the villain says/does when MC can't see. This makes the viewer FURIOUS and they NEED to keep watching for revenge. Create dramatic irony.

5. SPECIFIC NUMBERS: Replace ALL vague words with exact numbers:
   - "बहुत पैसे" → "500 million" or "3 करोड़"
   - "काफी लोग" → "47 लोग"
   - "कुछ देर बाद" → "2 घंटे बाद"
   - "कई साल" → "8 साल"

6. ONE EMOTIONAL LINE: After a big moment (betrayal, loss, revenge), add exactly ONE poetic/emotional line about what the MC feels or the atmosphere. Then IMMEDIATELY back to action. No dwelling. No repetitive feelings.
   Example: "उस दिन धूप बिल्कुल परफेक्ट थी। जैसे कोई नई शुरुआत मेरा इंतजार कर रही हो।"

7. COLD WALK AWAY: When MC confronts someone or decides to leave — he is CALM. Not angry. Not shouting. Short cold dialogue. "मैं चलता हूं।" This is 100x more powerful than screaming.

8. DELETE ALL FILLER: Remove:
   - Weather descriptions (unless emotional)
   - Scenery padding
   - Repetitive inner monologue
   - Travel descriptions
   - Meal/food descriptions
   - Side character introductions that don't matter
   - Any line that doesn't create emotion or move the story

9. HOOKS: The first 2 lines must make the viewer's brain say "WHAT?!". Start with the most shocking status change or revelation.

10. DIALOGUE STYLE: Keep dialogue SHORT and POWERFUL. Max 2 sentences per dialogue line.

11. PRESERVE EVERYTHING IMPORTANT: Keep ALL character names, plot events, relationships, power systems, and story beats. Do NOT skip plot points. Do NOT add events that didn't happen. Only change HOW it's told, not WHAT happens.

12. CLIFFHANGER: End on an unfinished moment — force the viewer to watch Part 2.

${langNote}

RAW NOVEL TEXT TO REWRITE:
${rawChapter}

Rewrite it now as a viral YouTube narration. Output ONLY the rewritten narration text — no headers, labels, or formatting:`;
}

/**
 * STORY OUTLINE SCAN — AI sees a batch of panel images and writes a 1-line summary per panel.
 * This is the FIRST PASS before individual script generation.
 */
export function getStoryOutlinePrompt(
  manhwaName: string,
  sourceType: string,
  batchStart: number,
  batchSize: number,
  totalPanels: number
): string {
  return `You are reading panels from "${manhwaName}" (${sourceType}). These are panels ${batchStart + 1} to ${batchStart + batchSize} out of ${totalPanels} total.

For EACH panel image, write exactly ONE short line (10-15 words max) describing WHAT HAPPENS in that panel. Focus on:
- What action/event occurs
- What characters say (brief)
- Any reveals or plot points

DO NOT describe visuals, backgrounds, or obvious things. Only story events.

Output format (strict, one line per panel):
Panel ${batchStart + 1}: [what happens]
Panel ${batchStart + 2}: [what happens]
...

Write ONLY the panel summaries, nothing else:`;
}

/**
 * PANEL VISION NARRATION — AI reads a manhwa/manhua panel image and writes narration.
 * Used by the /rewriter page for image-to-script pipeline.
 * NOW receives the FULL story outline so it knows what's coming.
 */
export function getPanelNarrationPrompt(
  manhwaName: string,
  sourceType: string,
  panelNumber: number,
  totalPanels: number,
  language: "hindi" | "english",
  previousContext?: string,
  storyOutline?: string,
  characterList?: string
): string {
  const langInstruction = language === "hindi"
    ? `LANGUAGE — 100% HINDI (Devanagari script). EVERY single word must be in Hindi.

CRITICAL RULES:
- Write EVERYTHING in Devanagari Hindi. No English words mixed in.
- ALL dialogue must be FULLY in Hindi. NOT "I really love you" → write "मैं तुमसे बहुत प्यार करती हूं"
- Character names: Keep original names but write them in Devanagari (Lin Xin → लिन शिन, Liu Cheng → लियू चेंग, Jake → जेक)
- Words like "anniversary", "celebrate", "system", "level" → translate to Hindi (सालगिरह, जश्न मनाना, सिस्टम is OK, लेवल is OK)
- Do NOT mix English sentences in Hindi script. Everything the AI TTS will read must be pronounceable in pure Hindi.
- Use simple conversational Hindi — not Shudh Hindi. Like friends talking.`
    : `Write in English. Dramatic, cinematic narration style.`;

  const contextNote = previousContext
    ? `\nPREVIOUS PANELS (already narrated — NEVER repeat):\n${previousContext}\n`
    : "";

  const outlineNote = storyOutline
    ? `\nFULL STORY OUTLINE (you know what happens in ALL panels — use this to decide what's important NOW vs what comes later):\n${storyOutline}\n`
    : "";

  const charNote = characterList
    ? `\nCHARACTER LIST (use EXACTLY these names and genders — NEVER change them):\n${characterList}\n`
    : "";

  return `You are narrating "${manhwaName}" (${sourceType}) for a YouTube channel. Panel ${panelNumber}/${totalPanels}.
${charNote}${outlineNote}${contextNote}

Write narration for THIS panel. 15-30 words MAX. 1-2 sentences only.

CHARACTER TRACKING (MOST IMPORTANT — read carefully):
- Use the CHARACTER LIST above. Match characters in the panel to their NAMES from the list.
- REMEMBER every character's NAME and GENDER from the list and previous panels.
- MALE characters → always use "वो", "उसने", "उसका" (he/him/his). NEVER use "वो" with female verb forms for a male character.
- FEMALE characters → always use "वो", "उसने", "उसकी" (she/her). NEVER use male verb forms for a female character.
- NEVER swap he/she (वो/उसका vs उसकी). If a character was male in panel 1, he stays male FOREVER.
- ALWAYS use the character's NAME when referring to them, not generic words. Say "लिन शिन ने कहा" not "उस लड़के ने कहा".
- If a character was introduced before (e.g., the rich guy, the girlfriend), refer to them by their NAME or their ROLE (अमीर लड़का, उसकी गर्लफ्रेंड). NEVER say "वो आदमी" or "वो बंदा" randomly.
- NEVER call a living character "dead" or use wrong descriptions. Describe characters by their ROLE (अमीर लड़का = rich guy, बॉस = boss, सिस्टम = system voice).

PRIORITY ORDER (do the FIRST one that applies):

1. IF the panel has TEXT/DIALOGUE BUBBLES (Chinese/Korean/Japanese text) → READ and TRANSLATE them into natural Hindi narration. This is your #1 job. Translate what characters are SAYING. ALWAYS mention WHO is speaking by name: "लिन शिन ने कहा" not just "उसने कहा".

2. IF the panel has SOUND EFFECTS text (咳咳, 嗯, ドキドキ, 嗡嗡, 铃铃, etc.) → translate them IN CONTEXT. Don't translate literally — understand what's ACTUALLY happening. A buzzing sound near a phone = phone ringing, not coughing. Read the FULL panel context (objects, situation) before translating sound effects.

3. IF the panel has SYSTEM SCREENS/STATUS WINDOWS → read and translate what the system says.

4. IF the panel has NO text at all → write 1 sentence about what this moment means for the STORY (character's thoughts/feelings), NOT what you see visually.

NEVER DO THESE:
- NEVER describe what the image shows (positions, clothes, background, actions). Viewer can see it.
- NEVER confuse character genders. Male = male verbs ALWAYS. Female = female verbs ALWAYS.
- NEVER call characters by wrong names or random descriptions like "वो बंदा" or "dead guy".
- NEVER make up dialogue that isn't in the panel.
- NEVER repeat anything from previous panels.
- NEVER add filler or scene-setting.

ZERO PAUSES IN AUDIO (CRITICAL):
- Do NOT use ellipsis (...) anywhere. NEVER.
- Do NOT use dashes (—) or (--) anywhere. NEVER.
- Do NOT use [pause], [beat], [silence] or any stage direction. NEVER.
- Do NOT add "..." at end of sentences. End with full stop (।) only.
- Do NOT write "तभी..." or "और फिर..." — these create audio gaps.
- Write CLEAN flowing sentences with ZERO pause markers of any kind.
- Every sentence must end with a full stop (।) and the next sentence starts immediately.
- The TTS must read this as ONE continuous flow with absolutely NO silence or gap.

${langInstruction}

Output ONLY 1-2 clean flowing sentences (15-30 words). No ellipsis, no dashes, no pause markers:`;
}
