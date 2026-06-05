"use client";

/**
 * Falling stars / particles — universe parallax effect.
 * Stars drift downward at different speeds creating depth.
 * Visible on ALL pages, on top of dark backgrounds.
 */
export default function FallingStars() {
  const stars = Array.from({ length: 60 }, (_, i) => {
    const size = Math.random() * 2 + 0.5;
    return {
      id: i,
      left: `${Math.random() * 100}%`,
      size,
      opacity: Math.random() * 0.5 + 0.15,
      duration: Math.random() * 20 + 12,
      delay: Math.random() * 25,
      glow: size > 1.5,
    };
  });

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9 }}>
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: s.left,
            top: "-10px",
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            background: s.glow ? "white" : "rgba(255,255,255,0.8)",
            boxShadow: s.glow ? `0 0 ${s.size * 2}px rgba(255,255,255,0.4)` : "none",
            animation: `starFall ${s.duration}s linear ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
