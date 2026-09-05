import { useState } from "react";
import ClearCartAnimatedLogo from "../components/ClearCartAnimatedLogo";
import { IconSpark, IconRefresh, IconCheck, IconShield, IconCart, IconChevron } from "../components/Icons";

export default function LogoPage({ onNavigateToDashboard }) {
  const [speed, setSpeed] = useState(2.4);
  const [size, setSize] = useState("hero");
  const [bgStyle, setBgStyle] = useState("canvas"); // "canvas", "studio", "dark"
  const [logoKey, setLogoKey] = useState(0);
  const [showMotionBanner, setShowMotionBanner] = useState(true);

  const handleReplay = () => {
    setLogoKey((prev) => prev + 1);
  };

  const bgClasses = {
    canvas: "bg-canvas text-slate-900",
    studio: "bg-white text-slate-900",
    dark: "bg-slate-900 text-slate-100",
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col justify-between ${bgClasses[bgStyle]}`}>
      {/* Top Bar */}
      <header className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-700 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
            <IconSpark className="w-4 h-4" />
          </div>
          <div>
            <span className="font-heading font-extrabold text-lg text-slate-900 tracking-tight">
              Clear<span className="text-blue-600">Cart</span>
            </span>
            <span className="ml-2 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Brand Identity
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateToDashboard}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm hover:shadow transition flex items-center gap-2"
        >
          <span>Open Dashboard</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </header>

      {/* Main Showcase Canvas */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col items-center justify-center space-y-8">
        {/* Banner */}
        {showMotionBanner && (
          <div className="w-full max-w-2xl bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between text-xs text-blue-900 shadow-xs fade-up">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                <IconSpark className="w-3.5 h-3.5" />
              </div>
              <p className="font-medium">
                <strong className="font-bold">Continuous Line Animation:</strong> Starts from the left handle end and draws through the entire cart silhouette.
              </p>
            </div>
            <button
              onClick={() => setShowMotionBanner(false)}
              className="text-blue-500 hover:text-blue-800 p-1 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Animated Logo Card */}
        <div className="stitch-card w-full max-w-2xl p-10 sm:p-14 rounded-3xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden bg-white/95">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40" />

          {/* Animated Logo */}
          <div className="py-6">
            <ClearCartAnimatedLogo
              key={logoKey}
              size={size}
              duration={speed}
              showText={true}
              interactive={true}
            />
          </div>

          {/* Action Trigger */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleReplay}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 group"
            >
              <IconRefresh className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Replay Line Drawing
            </button>

            <button
              onClick={onNavigateToDashboard}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2"
            >
              <IconCart className="w-4 h-4 text-blue-600" />
              Enter Copilot
            </button>
          </div>
        </div>

        {/* Interactive Customization Controls */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Speed Controller */}
          <div className="stitch-card p-3.5 rounded-2xl bg-white text-xs space-y-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Animation Speed
            </label>
            <div className="flex gap-1">
              {[
                { label: "Slow (3.6s)", val: 3.6 },
                { label: "Normal (2.4s)", val: 2.4 },
                { label: "Fast (1.2s)", val: 1.2 },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => {
                    setSpeed(s.val);
                    handleReplay();
                  }}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition ${
                    speed === s.val
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Size Controller */}
          <div className="stitch-card p-3.5 rounded-2xl bg-white text-xs space-y-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Logo Scale
            </label>
            <div className="flex gap-1">
              {[
                { label: "Medium", val: "md" },
                { label: "Large", val: "lg" },
                { label: "Hero", val: "hero" },
              ].map((sz) => (
                <button
                  key={sz.val}
                  onClick={() => setSize(sz.val)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition ${
                    size === sz.val
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Canvas Mode */}
          <div className="stitch-card p-3.5 rounded-2xl bg-white text-xs space-y-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Studio Lighting
            </label>
            <div className="flex gap-1">
              {[
                { label: "Canvas", val: "canvas" },
                { label: "White", val: "studio" },
              ].map((bg) => (
                <button
                  key={bg.val}
                  onClick={() => setBgStyle(bg.val)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition ${
                    bgStyle === bg.val
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Brand System Specification */}
        <div className="w-full max-w-2xl stitch-card p-5 rounded-2xl bg-white/80 space-y-3">
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-500">
            Logo Anatomy &amp; Design Spec
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-400 block">START POINT</span>
              <span className="font-bold text-slate-800">Left Handle End</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-400 block">STROKE STYLE</span>
              <span className="font-bold text-slate-800">Single Continuous Line</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-400 block">PRIMARY COLOR</span>
              <span className="font-bold text-blue-700">#1E3A8A Royal Blue</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-400 block">FONT FAMILY</span>
              <span className="font-bold text-slate-800">Hanken Grotesk 800</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-200/70 text-center text-xs text-slate-400">
        ClearCart Brand Showcase · Grounded Retail Intelligence
      </footer>
    </div>
  );
}
