"use client";

import { FileText, Clipboard, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Props {
  transcript: string;
  onChange: (value: string) => void;
  manhuaName: string;
  onManhuaNameChange: (value: string) => void;
  style: string;
  onStyleChange: (value: string) => void;
  disabled: boolean;
}

import { STYLE_OPTIONS } from "@/lib/prompts";

export default function TranscriptInput({
  transcript,
  onChange,
  manhuaName,
  onManhuaNameChange,
  style,
  onStyleChange,
  disabled,
}: Props) {
  const [showTranscript, setShowTranscript] = useState(false);

  const wordCount = transcript
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const charCount = transcript.length;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
    } catch {
      // Clipboard permission denied
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Transcript & Settings
        </h3>
      </div>

      {/* Manhua Name */}
      <div>
        <label className="block text-xs text-muted mb-1.5">
          Manga / Manhua / Manhwa Name
        </label>
        <input
          type="text"
          value={manhuaName}
          onChange={(e) => onManhuaNameChange(e.target.value)}
          placeholder="e.g., One Piece, Solo Leveling, Tower of God..."
          disabled={disabled}
          className="w-full px-3 py-2.5 rounded-xl bg-card border border-card-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
        />
      </div>

      {/* Narration Style */}
      <div>
        <label className="block text-xs text-muted mb-1.5">
          Narration Style
        </label>
        <select
          value={style}
          onChange={(e) => onStyleChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2.5 rounded-xl bg-card border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50"
        >
          {STYLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Optional Transcript Toggle */}
      <div>
        <button
          onClick={() => {
            setShowTranscript(!showTranscript);
            if (showTranscript) onChange(""); // clear transcript when hiding
          }}
          disabled={disabled}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium disabled:opacity-50 ${
            showTranscript
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "border-dashed border-card-border bg-card text-muted hover:text-foreground hover:border-muted"
          }`}
        >
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4" />
            <span>
              {showTranscript
                ? "I have a script to paste"
                : "I have a script to paste (Optional)"}
            </span>
          </div>
          {showTranscript ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {!showTranscript && (
          <p className="text-xs text-muted/50 mt-1.5 px-1">
            Click above if you have an existing YouTube transcript to rewrite.
            Otherwise the AI will generate from scratch.
          </p>
        )}
      </div>

      {/* Transcript Textarea — only shown when toggled */}
      {showTranscript && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-muted">
              Paste YouTube Transcript
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePaste}
                disabled={disabled}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors disabled:opacity-50"
              >
                <Clipboard className="w-3 h-3" />
                Paste
              </button>
              {transcript && (
                <button
                  onClick={() => onChange("")}
                  disabled={disabled}
                  className="flex items-center gap-1 text-xs text-danger hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={`Paste the full YouTube transcript here...\n\nTip: You can get transcripts from YouTube by:\n1. Open the YouTube video\n2. Click "..." below the video\n3. Click "Show transcript"\n4. Copy all the text`}
            className="w-full h-64 px-4 py-3 rounded-xl bg-card border border-card-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-y disabled:opacity-50 font-mono leading-relaxed"
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-muted/60">
              {wordCount > 0
                ? `${wordCount.toLocaleString()} words`
                : "No content yet"}
              {charCount > 0 && ` / ${charCount.toLocaleString()} characters`}
            </p>
            {wordCount > 0 && (
              <p className="text-xs text-muted/60">
                ~{Math.ceil(wordCount / 150)} min read
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
