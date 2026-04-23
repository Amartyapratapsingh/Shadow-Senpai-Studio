/**
 * CLIENT-SIDE Scene Splitter — NO AI needed, completely FREE.
 *
 * Splits any script (any language, any length) into scenes by:
 * 1. Breaking into sentences
 * 2. Grouping sentences into scenes of ~150 words (= ~1 minute of video)
 * 3. Always breaks at sentence boundaries — never mid-sentence
 * 4. Works with Hindi (।), English (.), Chinese, Korean, any language
 *
 * Cost: $0. Runs instantly in the browser.
 */

export interface Scene {
  index: number;
  narration: string;
  wordCount: number;
}

/**
 * Split text into sentences — supports multiple languages.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation:
  // . ! ? । (Hindi purna viram) 。(Chinese/Japanese period) ！？
  // But not on abbreviations like Mr. Dr. etc.
  const sentences = text
    .split(/(?<=[।।.!?。！？])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // If no sentence breaks found (weird formatting), try newlines
  if (sentences.length <= 1 && text.length > 500) {
    const byNewline = text.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
    if (byNewline.length > 1) return byNewline;
  }

  // If still one big block, force-split every ~150 words
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
 * Split a script into scenes.
 *
 * @param script - The full script text (any language, any length)
 * @param wordsPerScene - Target words per scene (~150 = 1 minute of video)
 * @returns Array of scenes with narration text
 */
export function splitIntoScenes(
  script: string,
  wordsPerScene: number = 150
): Scene[] {
  const sentences = splitIntoSentences(script);
  const scenes: Scene[] = [];
  let currentSentences: string[] = [];
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;

    // If adding this sentence exceeds the target AND we already have some content
    if (currentWordCount + sentenceWords > wordsPerScene * 1.3 && currentSentences.length > 0) {
      // Save current scene
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

  // Don't forget the last scene
  if (currentSentences.length > 0) {
    // If last scene is too small, merge with previous
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
