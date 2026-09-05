import { useState, useEffect } from "react";
import { testApiKey } from "../api/client";
import { IconSpark, IconX, IconCheck, IconShield } from "./Icons";

export default function ApiKeyModal({ isOpen, onClose, onKeySaved }) {
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("clearcart_gemini_api_key") || "";
      setApiKey(saved);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleTest() {
    if (!apiKey.trim()) {
      setTestResult({ ok: false, error: "Please enter an API key first." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testApiKey(apiKey.trim());
      setTestResult(res);
    } catch (err) {
      setTestResult({ ok: false, error: err.message || "Failed to reach server." });
    } finally {
      setTesting(false);
    }
  }

  function handleSave(e) {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (cleanKey) {
      localStorage.setItem("clearcart_gemini_api_key", cleanKey);
    } else {
      localStorage.removeItem("clearcart_gemini_api_key");
    }
    onKeySaved(cleanKey);
    onClose();
  }

  function handleClear() {
    setApiKey("");
    localStorage.removeItem("clearcart_gemini_api_key");
    setTestResult(null);
    onKeySaved("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay fade-up">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <IconSpark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-slate-900">
                Gemini 2.0 API Key Setup
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Enables dynamic, intelligent reasoning for retail queries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading">
              Google Gemini API Key
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your AIzaSy... key here"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition pr-20"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-200/60 hover:bg-slate-200 rounded-lg transition"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Key is stored locally in your browser session for direct Gemini 2.0 Flash calls.
            </p>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                testResult.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              {testResult.ok ? (
                <>
                  <IconCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Connected Successfully!</span> Gemini 2.0 Flash is live and ready for dynamic reasoning.
                  </div>
                </>
              ) : (
                <>
                  <span className="text-rose-600 font-bold">✕</span>
                  <div>
                    <span className="font-bold">Connection Failed:</span> {testResult.error}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Security & Grounding Notice */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
            <IconShield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">100% Grounded Execution</span>
              <span className="text-blue-700/90 text-[11px] block">
                Gemini structures dynamic explanations using only your local SQLite tables. Fallback deterministic engine is used if API key is absent.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {apiKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
              >
                Remove Key
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !apiKey.trim()}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition disabled:opacity-40"
              >
                {testing ? "Testing…" : "Test Key"}
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition flex items-center gap-1.5"
              >
                <IconCheck className="w-3.5 h-3.5" />
                Save &amp; Activate
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
