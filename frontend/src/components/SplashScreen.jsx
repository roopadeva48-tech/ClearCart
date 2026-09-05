import { useState, useEffect } from "react";
import ClearCartAnimatedLogo from "./ClearCartAnimatedLogo";
import { IconSpark } from "./Icons";

export default function SplashScreen({ onComplete }) {
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 4;
      });
    }, 100);

    // Auto-transition to dashboard after animation completes
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        onComplete();
      }, 600); // Allow fade-out transition
    }, 2800);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  function handleSkip() {
    setFading(true);
    setTimeout(() => {
      onComplete();
    }, 200);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-white transition-all duration-700 ease-out ${
        fading ? "opacity-0 scale-98 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Top Skip Button */}
      <div className="w-full px-6 py-4 flex justify-end">
        <button
          onClick={handleSkip}
          className="text-xs font-bold text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition flex items-center gap-1"
        >
          <span>Skip</span>
          <span>→</span>
        </button>
      </div>

      {/* Centered Animated Logo */}
      <div className="flex flex-col items-center justify-center space-y-6 max-w-md px-4">
        <ClearCartAnimatedLogo
          size="hero"
          duration={2.0}
          showText={true}
          interactive={false}
        />

        {/* Loading / System Init Indicator */}
        <div className="w-64 space-y-2 text-center pt-2">
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-700 to-blue-500 h-full rounded-full transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] font-mono font-medium text-slate-400 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping inline-block" />
            Initializing Grounded Copilot…
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="py-6 text-center text-xs text-slate-400 font-medium">
        Retail Sales &amp; Inventory Intelligence · Grounded in SQLite
      </div>
    </div>
  );
}
