/**
 * Audio generation utilities.
 * Supports OpenAI gpt-4o-mini-tts AND Gemini TTS.
 */

export type AudioProvider = "openai" | "gemini";

// ═══════════════════════════════════════
//  OpenAI Voices (13 voices)
// ═══════════════════════════════════════

export const OPENAI_VOICES: { value: string; label: string; description: string }[] = [
  { value: "cedar", label: "Cedar", description: "Deep, warm, cinematic — best for anime narration" },
  { value: "feather", label: "Feather", description: "Smooth, storytelling, natural flow" },
  { value: "nova", label: "Nova", description: "Clear, expressive female narrator" },
  { value: "verse", label: "Verse", description: "Pure energy and excitement" },
  { value: "fable", label: "Fable", description: "Storytelling with emotion and depth" },
  { value: "ballad", label: "Ballad", description: "Grand, movie-trailer style" },
  { value: "alloy", label: "Alloy", description: "Neutral, balanced, versatile" },
  { value: "ash", label: "Ash", description: "Soft, calm, conversational" },
  { value: "coral", label: "Coral", description: "Warm, friendly, approachable" },
  { value: "echo", label: "Echo", description: "Smooth, clear, professional" },
  { value: "onyx", label: "Onyx", description: "Deep, dark, powerful — great for villain moments" },
  { value: "sage", label: "Sage", description: "Wise, composed, authoritative" },
  { value: "shimmer", label: "Shimmer", description: "Bright, cheerful, upbeat" },
  { value: "marin", label: "Marin", description: "Natural, relaxed, easygoing" },
];

// ═══════════════════════════════════════
//  Gemini Voices (30 voices)
// ═══════════════════════════════════════

export const GEMINI_VOICES: { value: string; label: string; description: string }[] = [
  { value: "Zephyr", label: "Zephyr", description: "Bright and breezy" },
  { value: "Puck", label: "Puck", description: "Playful and mischievous" },
  { value: "Charon", label: "Charon", description: "Deep and mysterious" },
  { value: "Kore", label: "Kore", description: "Clear and youthful" },
  { value: "Fenrir", label: "Fenrir", description: "Strong and powerful" },
  { value: "Leda", label: "Leda", description: "Gentle and graceful" },
  { value: "Orus", label: "Orus", description: "Bold and commanding" },
  { value: "Aoede", label: "Aoede", description: "Melodic and expressive" },
  { value: "Callirrhoe", label: "Callirrhoe", description: "Flowing and elegant" },
  { value: "Autonoe", label: "Autonoe", description: "Independent and sharp" },
  { value: "Enceladus", label: "Enceladus", description: "Grand and epic" },
  { value: "Iapetus", label: "Iapetus", description: "Ancient and wise" },
  { value: "Umbriel", label: "Umbriel", description: "Dark and sombre" },
  { value: "Algieba", label: "Algieba", description: "Warm and radiant" },
  { value: "Despina", label: "Despina", description: "Quick and energetic" },
  { value: "Erinome", label: "Erinome", description: "Intense and fiery" },
  { value: "Algenib", label: "Algenib", description: "Bright and piercing" },
  { value: "Rasalgethi", label: "Rasalgethi", description: "Noble and dignified" },
  { value: "Laomedeia", label: "Laomedeia", description: "Steady and reliable" },
  { value: "Achernar", label: "Achernar", description: "Brilliant and clear" },
  { value: "Alnilam", label: "Alnilam", description: "Powerful and resonant" },
  { value: "Schedar", label: "Schedar", description: "Regal and majestic" },
  { value: "Gacrux", label: "Gacrux", description: "Grounded and stable" },
  { value: "Pulcherrima", label: "Pulcherrima", description: "Beautiful and smooth" },
  { value: "Achird", label: "Achird", description: "Balanced and natural" },
  { value: "Zubenelgenubi", label: "Zubenelgenubi", description: "Unique and distinctive" },
  { value: "Vindemiatrix", label: "Vindemiatrix", description: "Rich and refined" },
  { value: "Sadachbia", label: "Sadachbia", description: "Hopeful and uplifting" },
  { value: "Sadaltager", label: "Sadaltager", description: "Calm and thoughtful" },
  { value: "Sulafat", label: "Sulafat", description: "Light and airy" },
];

// ═══════════════════════════════════════
//  Tone detection & instructions (OpenAI only)
// ═══════════════════════════════════════

export const TONE_INSTRUCTIONS: Record<string, string> = {
  hype: `You are a cinematic narrator for a dark anime and manhwa YouTube channel.
Speak with a DEEP, WARM, and POWERFUL voice.
Deliberate pacing — every word carries weight.
Sound like a movie trailer narrator meets anime storyteller.
Not too fast. Let tension breathe naturally.
When something shocking happens — slow down and go even deeper.
This is dark, immersive storytelling. Gravitas and depth above all.`,

  battle: `You are narrating an intense battle in an anime.
Keep the deep, powerful voice — but speed up the delivery.
Short punchy sentences. Hard emphasis on action words.
Emphasize: DESTROYED, OBLITERATED, ONE SHOT, UNSTOPPABLE.
Sound like the action is happening RIGHT NOW — with full authority.`,

  shock: `You are reacting to a massive plot twist in a dark anime.
Keep the deep voice — but let controlled shock come through.
Slow down on the reveal. Let the silence do the work.
Then deliver the impact with deep, measured intensity.
Not screaming. Controlled. Powerful. Like you cannot believe what just happened.`,

  dark: `You are narrating the darkest moment in the story.
Speak slowly. Deeply. With cold, deliberate power.
Every word is a hammer blow.
Sound like fate itself is speaking.
No hype. No rush. Pure dark gravity and dread.`,
};

export function detectTone(text: string): string {
  const lower = text.toLowerCase();

  const battleWords = [
    "fight", "attack", "battle", "kill", "punch", "slash", "destroyed",
    "obliterated", "clash", "power", "unleash", "dodge", "strike",
  ];
  const shockWords = [
    "suddenly", "plot twist", "revealed", "betrayed", "no one knew",
    "shocking", "unexpected", "plot armor", "wait", "turns out",
  ];
  const darkWords = [
    "died", "death", "sacrifice", "tragic", "end", "villain",
    "darkness", "hopeless", "lost everything", "last breath",
  ];

  if (battleWords.some((w) => lower.includes(w))) return "battle";
  if (shockWords.some((w) => lower.includes(w))) return "shock";
  if (darkWords.some((w) => lower.includes(w))) return "dark";
  return "hype";
}

export function enhanceScript(script: string): string {
  return script
    // Remove pause-inducing markers — keep speech flowing continuously
    .replace(/\s*—\s*/g, ", ")          // Replace em dashes with commas (no pause)
    .replace(/\.{3,}/g, ".")            // Replace ellipsis (...) with single period
    .replace(/\[pause\]/gi, "")         // Remove [pause] stage directions
    .replace(/\[beat\]/gi, "")          // Remove [beat] stage directions
    .replace(/\[silence\]/gi, "")       // Remove [silence] stage directions
    .replace(/\s{2,}/g, " ")           // Collapse multiple spaces
    // Emphasis through capitalization (adds power without pauses)
    .replace(/No one/g, "NO ONE")
    .replace(/out of nowhere/g, "OUT OF NOWHERE")
    .replace(/most powerful/g, "THE MOST POWERFUL")
    .replace(/strongest/g, "THE STRONGEST")
    .replace(/impossible/g, "IMPOSSIBLE");
}

/**
 * Split text into chunks safe for TTS API.
 */
export function splitTextIntoChunks(
  text: string,
  maxChars: number = 4000
): string[] {
  const paragraphs = text.split(/\n\n/).filter((p) => p.trim());
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((current + " " + sentence).length > maxChars && current.trim()) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current = current ? current + " " + sentence : sentence;
        }
      }
      continue;
    }

    const combined = current ? current + "\n\n" + para : para;
    if (combined.length > maxChars && current.trim()) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = combined;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
