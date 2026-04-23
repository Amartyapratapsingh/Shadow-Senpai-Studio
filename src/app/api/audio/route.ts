import { NextRequest, NextResponse } from "next/server";

// Allow up to 5 minutes for long audio generation
export const maxDuration = 300;

import {
  AudioProvider,
  TONE_INSTRUCTIONS,
  detectTone,
  enhanceScript,
  splitTextIntoChunks,
} from "@/lib/audio-utils";

// ═══════════════════════════════════════
//  OpenAI TTS
// ═══════════════════════════════════════

async function generateOpenAI(
  script: string,
  voice: string,
  apiKey: string
): Promise<Uint8Array> {
  const enhanced = enhanceScript(script);
  const chunks = splitTextIntoChunks(enhanced);
  const audioBuffers: ArrayBuffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const tone = detectTone(chunk);
    const chunkInstructions =
      TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.hype;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: voice,
        input: chunk,
        instructions: chunkInstructions,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI TTS error (chunk ${i + 1}/${chunks.length}): ${err?.error?.message || response.statusText}`
      );
    }

    audioBuffers.push(await response.arrayBuffer());
  }

  // Merge all MP3 chunks
  const totalLength = audioBuffers.reduce(
    (sum, buf) => sum + buf.byteLength,
    0
  );
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of audioBuffers) {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  return merged;
}

// ═══════════════════════════════════════
//  Gemini TTS
// ═══════════════════════════════════════

function createWavHeader(
  dataLength: number,
  sampleRate: number = 24000,
  channels: number = 1,
  bitsPerSample: number = 16
): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLength, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true);

  return new Uint8Array(header);
}

async function generateGemini(
  script: string,
  voice: string,
  apiKey: string
): Promise<Uint8Array> {
  const chunks = splitTextIntoChunks(script, 4000);
  const pcmBuffers: Uint8Array[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: chunk }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini TTS error (chunk ${i + 1}/${chunks.length}): ${err?.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const audioData =
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error(
        `Gemini TTS returned no audio for chunk ${i + 1}/${chunks.length}`
      );
    }

    // Decode base64 PCM data
    const binary = Buffer.from(audioData, "base64");
    pcmBuffers.push(new Uint8Array(binary));
  }

  // Merge all PCM data
  const totalPCMLength = pcmBuffers.reduce((sum, buf) => sum + buf.length, 0);
  const mergedPCM = new Uint8Array(totalPCMLength);
  let offset = 0;
  for (const buf of pcmBuffers) {
    mergedPCM.set(buf, offset);
    offset += buf.length;
  }

  // Create WAV file (header + PCM data)
  const wavHeader = createWavHeader(totalPCMLength);
  const wavFile = new Uint8Array(wavHeader.length + mergedPCM.length);
  wavFile.set(wavHeader, 0);
  wavFile.set(mergedPCM, wavHeader.length);

  return wavFile;
}

// ═══════════════════════════════════════
//  Main handler
// ═══════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, voice, provider, apiKey } = body;

    if (!script?.trim()) {
      return NextResponse.json(
        { error: "No script provided" },
        { status: 400 }
      );
    }

    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: "API key is required. Add it in Settings." },
        { status: 400 }
      );
    }

    if (!voice?.trim()) {
      return NextResponse.json(
        { error: "No voice selected" },
        { status: 400 }
      );
    }

    const audioProvider = (provider || "openai") as AudioProvider;

    if (audioProvider === "gemini") {
      const audioData = await generateGemini(script, voice, apiKey);
      return new NextResponse(audioData.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Content-Disposition": `attachment; filename="shadow-senpai-audio.wav"`,
          "Content-Length": audioData.length.toString(),
        },
      });
    } else {
      const audioData = await generateOpenAI(script, voice, apiKey);
      return new NextResponse(audioData.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="shadow-senpai-audio.mp3"`,
          "Content-Length": audioData.length.toString(),
        },
      });
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
