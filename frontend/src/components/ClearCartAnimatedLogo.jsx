import { useState, useEffect, useRef } from "react";

export default function ClearCartAnimatedLogo({
  size = "lg", // "sm", "md", "lg", "xl", "hero"
  duration = 2.4, // seconds
  autoReplay = false,
  showText = true,
  interactive = true,
  onAnimationComplete = () => {},
}) {
  const [animKey, setAnimKey] = useState(0);
  const [isDrawing, setIsDrawing] = useState(true);

  useEffect(() => {
    setIsDrawing(true);
    const timer = setTimeout(() => {
      setIsDrawing(false);
      onAnimationComplete();
    }, duration * 1000 + 400);

    return () => clearTimeout(timer);
  }, [animKey, duration]);

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-36 h-36",
    lg: "w-64 h-64",
    xl: "w-80 h-80",
    hero: "w-72 sm:w-96 md:w-[420px] h-auto",
  };

  const replay = () => {
    setAnimKey((prev) => prev + 1);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center select-none ${interactive ? "cursor-pointer group" : ""}`}
      onClick={interactive ? replay : undefined}
      title={interactive ? "Click to replay animation" : undefined}
    >
      <div className={`relative ${sizeClasses[size] || sizeClasses.lg}`}>
        <svg
          key={animKey}
          viewBox="0 0 320 280"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Vibrant Brand Blue Gradient */}
            <linearGradient id={`cart-gradient-${animKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Glowing Accent Gradient */}
            <linearGradient id={`glow-gradient-${animKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>

            {/* Soft Shadow Filter */}
            <filter id={`drop-shadow-${animKey}`} x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2563eb" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* ─── The Continuous Lined Cart SVG Path ─── */}
          {/*
            Exact stroke geometry matching the reference logo:
            1. Handle starts on left end (75, 60)
            2. Loops up & around the handle loop: (75,60) -> (105,42) -> (122,55) -> (108,72) -> (96,65)
            3. Slants down the handle bar: -> (122,148)
            4. Forms the left wheel circular loop: -> (122, 175) -> (102, 175) -> (102, 150) -> (124, 150)
            5. Connects across the bottom frame: -> (180, 150)
            6. Forms the right wheel circular loop: -> (180, 175) -> (202, 175) -> (202, 150) -> (182, 150)
            7. Slants up the right side of basket: -> (214, 90)
            8. Curves into the top basket rim: -> (204, 82) -> (155, 82)
            9. Inner S-shaped ribbon shelves:
               - upper fold left: (155, 82) -> (138, 82) -> (138, 106) -> (155, 106)
               - middle shelf right: -> (194, 106)
               - middle fold right: -> (204, 106) -> (204, 126) -> (192, 126)
               - bottom shelf left: -> (146, 126)
          */}
          <path
            d="
              M 72 62
              C 84 62, 102 44, 116 44
              C 128 44, 134 54, 126 66
              C 118 78, 100 70, 94 62
              C 88 56, 114 135, 122 148
              C 122 165, 102 180, 92 166
              C 82 152, 102 136, 122 148
              L 182 148
              C 182 165, 162 180, 152 166
              C 142 152, 162 136, 182 148
              C 188 142, 206 102, 214 88
              C 218 80, 208 78, 192 78
              L 155 78
              C 138 78, 138 104, 155 104
              L 190 104
              C 204 104, 204 126, 190 126
              L 146 126
            "
            fill="none"
            stroke={`url(#cart-gradient-${animKey})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#drop-shadow-${animKey})`}
            pathLength="1000"
            strokeDasharray="1000"
            strokeDashoffset="1000"
            className="animate-draw-cart"
            style={{
              animationDuration: `${duration}s`,
              animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
              animationFillMode: "forwards",
            }}
          />

          {/* Spark / Pen Glow Follower (Visible during drawing) */}
          {isDrawing && (
            <circle
              r="6"
              fill="#60a5fa"
              className="animate-spark-pulse"
              filter="drop-shadow(0 0 8px #3b82f6)"
            >
              <animateMotion
                path="
                  M 72 62
                  C 84 62, 102 44, 116 44
                  C 128 44, 134 54, 126 66
                  C 118 78, 100 70, 94 62
                  C 88 56, 114 135, 122 148
                  C 122 165, 102 180, 92 166
                  C 82 152, 102 136, 122 148
                  L 182 148
                  C 182 165, 162 180, 152 166
                  C 142 152, 162 136, 182 148
                  C 188 142, 206 102, 214 88
                  C 218 80, 208 78, 192 78
                  L 155 78
                  C 138 78, 138 104, 155 104
                  L 190 104
                  C 204 104, 204 126, 190 126
                  L 146 126
                "
                dur={`${duration}s`}
                repeatCount="1"
                fill="freeze"
              />
            </circle>
          )}

          {/* Decorative Sparkles after drawing completes */}
          {!isDrawing && (
            <g className="animate-fade-in">
              <path
                d="M 226 60 L 228 66 L 234 68 L 228 70 L 226 76 L 224 70 L 218 68 L 224 66 Z"
                fill="#3b82f6"
                className="animate-pulse"
              />
              <path
                d="M 68 40 L 70 44 L 74 46 L 70 48 L 68 52 L 66 48 L 62 46 L 66 44 Z"
                fill="#60a5fa"
                className="animate-pulse"
                style={{ animationDelay: "0.3s" }}
              />
            </g>
          )}

          {/* ─── "CLEAR CART" Typography ─── */}
          {showText && (
            <text
              x="160"
              y="240"
              textAnchor="middle"
              className="font-heading animate-text-reveal"
              style={{
                fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
                fontWeight: 800,
                fontSize: "30px",
                letterSpacing: "0.18em",
                fill: "#1e3a8a",
                animationDelay: `${duration * 0.75}s`,
                animationFillMode: "both",
              }}
            >
              CLEAR CART
            </text>
          )}
        </svg>
      </div>

      {/* Interactive Helper Hint */}
      {interactive && (
        <span className="text-[11px] font-semibold text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Click to replay line drawing
        </span>
      )}
    </div>
  );
}
