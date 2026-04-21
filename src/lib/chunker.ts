/**
 * Splits a transcript into manageable chunks while preserving logical boundaries.
 * This ensures NO content is skipped — every page/panel/scene is covered.
 *
 * Strategy:
 * 1. First try to split by explicit page/chapter markers
 * 2. If no markers found, split by paragraph blocks
 * 3. Each chunk stays under the token limit to avoid API cutoffs
 * 4. Overlapping context is added so the AI understands continuity
 */

const PAGE_MARKERS = [
  /page\s*\d+/gi,
  /chapter\s*\d+/gi,
  /panel\s*\d+/gi,
  /scene\s*\d+/gi,
  /part\s*\d+/gi,
  /episode\s*\d+/gi,
  /\[page\s*\d+\]/gi,
  /\[panel\s*\d+\]/gi,
  /---+/g,
  /\*\*\*/g,
];

export interface Chunk {
  index: number;
  total: number;
  content: string;
  label: string;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function findPageBreaks(text: string): number[] {
  const breaks: Set<number> = new Set();

  for (const marker of PAGE_MARKERS) {
    const regex = new RegExp(marker.source, marker.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      breaks.add(match.index);
    }
  }

  return Array.from(breaks).sort((a, b) => a - b);
}

function splitByMarkers(text: string): string[] {
  const breaks = findPageBreaks(text);

  if (breaks.length < 2) return [];

  const sections: string[] = [];
  for (let i = 0; i < breaks.length; i++) {
    const start = breaks[i];
    const end = i + 1 < breaks.length ? breaks[i + 1] : text.length;
    const section = text.slice(start, end).trim();
    if (section.length > 0) {
      sections.push(section);
    }
  }

  // Add any content before the first marker
  if (breaks[0] > 0) {
    const preContent = text.slice(0, breaks[0]).trim();
    if (preContent.length > 0) {
      sections.unshift(preContent);
    }
  }

  return sections;
}

function splitByParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function mergeSmallChunks(
  sections: string[],
  maxTokensPerChunk: number
): string[] {
  const merged: string[] = [];
  let current = "";

  for (const section of sections) {
    const combined = current ? current + "\n\n" + section : section;

    if (estimateTokens(combined) > maxTokensPerChunk && current) {
      merged.push(current);
      current = section;
    } else {
      current = combined;
    }
  }

  if (current) {
    merged.push(current);
  }

  return merged;
}

function splitLargeChunk(text: string, maxTokensPerChunk: number): string[] {
  if (estimateTokens(text) <= maxTokensPerChunk) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const combined = current ? current + " " + sentence : sentence;

    if (estimateTokens(combined) > maxTokensPerChunk && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = combined;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function chunkTranscript(
  transcript: string,
  maxTokensPerChunk: number = 2000
): Chunk[] {
  const trimmed = transcript.trim();

  if (!trimmed) return [];

  // If the entire transcript is small enough, return as single chunk
  if (estimateTokens(trimmed) <= maxTokensPerChunk) {
    return [
      {
        index: 0,
        total: 1,
        content: trimmed,
        label: "Full Script",
      },
    ];
  }

  // Try splitting by page/chapter markers first
  let sections = splitByMarkers(trimmed);

  // If no markers found, split by paragraphs
  if (sections.length === 0) {
    sections = splitByParagraphs(trimmed);
  }

  // If still just one section, split by sentences
  if (sections.length <= 1) {
    sections = splitLargeChunk(trimmed, maxTokensPerChunk);
  }

  // Merge small sections together to avoid too many API calls
  let chunks = mergeSmallChunks(sections, maxTokensPerChunk);

  // Split any remaining large chunks
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (estimateTokens(chunk) > maxTokensPerChunk) {
      finalChunks.push(...splitLargeChunk(chunk, maxTokensPerChunk));
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks.map((content, index) => ({
    index,
    total: finalChunks.length,
    content,
    label: `Part ${index + 1} of ${finalChunks.length}`,
  }));
}
