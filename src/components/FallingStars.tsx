"use client";

/**
 * Falling stars / particles — universe parallax effect.
 * Rendered as absolute within a container, NOT fixed on the whole page.
 */
export default function FallingStars() {
  const stars = Array.from({ length: 50 }, (_, i) => {
    const size = Math.random() * 2 + 0.5;
    return {
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size,
      opacity: Math.random() * 0.5 + 0.1,
      duration: Math.random() * 20 + 12,
      delay: Math.random() * 15,
      glow: size > 1.5,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: s.left,
            top: "-5px",
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            background: s.glow ? "white" : "rgba(255,255,255,0.7)",
            boxShadow: s.glow ? `0 0 ${s.size * 2}px rgba(255,255,255,0.3)` : "none",
            animation: `starFall ${s.duration}s linear ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
