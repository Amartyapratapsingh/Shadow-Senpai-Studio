/**
 * HYBRID Scene Splitter
 *
 * Step 1: Client-side rough split into ~3000 word chunks at sentence boundaries (FREE)
 * Step 2: AI reads each chunk and identifies natural scene breaks (CHEAP — ~3000 words per call)
 *
 * This way:
 * - AI makes SMART scene break decisions (not dumb word-count splitting)
 * - AI only processes ~3000 words per call (cheap, fast, no token limit issues)
 * - Scenes stay intact — AI breaks at location changes, time jumps, mood shifts
 * - Works with ANY script size (22K, 100K, 1M words)
 */

export interface Scene {
  index: number;
  narration: string;
  wordCount: number;
  imagePrompt?: string;
}

/**
 * Split text into sentences — supports multiple languages.
 */
export function splitIntoSentences(text: string): string[] {
  const sentences = text
    .split(/(?<=[।.!?。！？])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length <= 1 && text.length > 500) {
    const byNewline = text.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
    if (byNewline.length > 1) return byNewline;
  }

  if (sentences.length <= 1 && text.length > 500) {
    const words = text.split(/\s+/);
    const forceSplit: string[] = [];
    for (let i = 0; i < words.length; i += 150) {
      forceSplit.push(words.slice(i, i + 150).join(" "));
    }
    return forceSplit;
  }

  return sentences;
}

/**
 * STEP 1: Client-side rough split into chunks of ~3000 words.
 * Splits at sentence boundaries so no sentence is ever cut.
 * This is FREE — runs in the browser.
 */
export function roughSplitIntoChunks(script: string, maxWords: number = 3000): string[] {
  const sentences = splitIntoSentences(script);
  const totalWords = script.split(/\s+/).length;

  // If small enough, return as single chunk
  if (totalWords <= maxWords) return [script];

  const chunks: string[] = [];
  let currentSentences: string[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;

    if (currentWords + sentenceWords > maxWords && currentSentences.length > 0) {
      chunks.push(currentSentences.join(" "));
      currentSentences = [sentence];
      currentWords = sentenceWords;
    } else {
      currentSentences.push(sentence);
      currentWords += sentenceWords;
    }
  }

  if (currentSentences.length > 0) {
    chunks.push(currentSentences.join(" "));
  }

  return chunks;
}

/**
 * FALLBACK: Pure client-side scene splitting (if AI fails).
 * Groups sentences into ~70 word scenes (one visual moment each).
 */
export function fallbackSplitIntoScenes(script: string, wordsPerScene: number = 70): Scene[] {
  const sentences = splitIntoSentences(script);
  const scenes: Scene[] = [];
  let currentSentences: string[] = [];
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;

    if (currentWordCount + sentenceWords > wordsPerScene * 1.3 && currentSentences.length > 0) {
      scenes.push({
        index: scenes.length + 1,
        narration: currentSentences.join(" "),
        wordCount: currentWordCount,
      });
      currentSentences = [sentence];
      currentWordCount = sentenceWords;
    } else {
      currentSentences.push(sentence);
      currentWordCount += sentenceWords;
    }
  }

  if (currentSentences.length > 0) {
    if (scenes.length > 0 && currentWordCount < wordsPerScene * 0.3) {
      const lastScene = scenes[scenes.length - 1];
      lastScene.narration += " " + currentSentences.join(" ");
      lastScene.wordCount += currentWordCount;
    } else {
      scenes.push({
        index: scenes.length + 1,
        narration: currentSentences.join(" "),
        wordCount: currentWordCount,
      });
    }
  }

  return scenes;
}
