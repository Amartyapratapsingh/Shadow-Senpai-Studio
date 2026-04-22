"use client";

import { useEffect, useState } from "react";

const VIDEO_IDS = [
  "EHp6iXF-EOM",
  "2vzERbMnjWs",
  "GYdgQ_wjMBg",
  "pWxUFkSrOuY",
  "dZhzs6ffk4k",
  "rfh9VTnJujI",
  "EA_1Z79aRBI",
  "A-KWJRnvWx0",
  "9iZIm2WWzbA",
  "5995bMn0nLI",
  "W5EXbyPHwAc",
  "8Fn6QqHLiLg",
  "upRTa8thMsU",
  "G0-JdNln_Fs",
  "0jfwGA0y-7I",
];

interface FallingItem {
  id: number;
  videoId: string;
  left: number;
  startTop: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  rotate: number;
}

export default function FallingThumbnails() {
  const [items, setItems] = useState<FallingItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 5 columns, 3 rows = 15 unique positions
    const cols = 5;
    const rows = 3;
    const colWidth = 90 / cols; // leave 5% margin each side

    const generated: FallingItem[] = VIDEO_IDS.map((videoId, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      return {
        id: i,
        videoId,
        left: 5 + col * colWidth + Math.random() * (colWidth * 0.4),
        startTop: -(15 + row * 35 + Math.random() * 15), // stagger vertically above viewport
        delay: row * 8 + col * 1.5 + Math.random() * 2,
        duration: 30 + Math.random() * 15,
        size: 110 + Math.random() * 50,
        opacity: 0.35 + Math.random() * 0.25,
        rotate: -10 + Math.random() * 20,
      };
    });

    setItems(generated);
  }, []);

  if (!mounted || items.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: "absolute",
            left: `${item.left}%`,
            top: `${item.startTop}%`,
            width: `${item.size}px`,
            opacity: item.opacity,
            transform: `rotate(${item.rotate}deg)`,
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: `0 0 25px rgba(139, 92, 246, 0.4), 0 0 50px rgba(56, 189, 248, 0.25), 0 4px 20px rgba(0,0,0,0.5)`,
            border: "1px solid rgba(255,255,255,0.15)",
            animation: `thumbDrop ${item.duration}s linear ${item.delay}s infinite`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
            alt=""
            style={{
              width: "100%",
              display: "block",
              aspectRatio: "16/9",
              objectFit: "cover",
            }}
            loading="lazy"
          />
        </div>
      ))}

      <style>{`
        @keyframes thumbDrop {
          0% { transform: translateY(0); }
          100% { transform: translateY(calc(100vh + 200px + 120%)); }
        }
      `}</style>
    </div>
  );
}
