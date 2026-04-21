/**
 * Video duration options.
 * ~150 words = 1 minute of spoken audio.
 */

export interface DurationOption {
  value: number;
  label: string;
  words: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { value: 5, label: "5 minutes", words: "~750 words" },
  { value: 8, label: "8 minutes", words: "~1200 words" },
  { value: 10, label: "10 minutes", words: "~1500 words" },
  { value: 12, label: "12 minutes", words: "~1800 words" },
  { value: 15, label: "15 minutes", words: "~2250 words" },
  { value: 20, label: "20 minutes", words: "~3000 words" },
  { value: 25, label: "25 minutes", words: "~3750 words" },
  { value: 30, label: "30 minutes", words: "~4500 words" },
];

export function getWordRange(minutes: number): { min: number; max: number } {
  const wordsPerMin = 150;
  return {
    min: Math.round(minutes * wordsPerMin * 0.9),
    max: Math.round(minutes * wordsPerMin * 1.1),
  };
}

export function getDurationInstruction(minutes: number): string {
  const { min, max } = getWordRange(minutes);
  return `The script MUST be approximately ${min}-${max} words long, which is suitable for a ${minutes}-minute YouTube video. Do NOT make it shorter or longer than this range.`;
}
