import { useState, useRef, useEffect } from "react";
import { IconSend, IconSpark, IconBox, IconAlert, IconTrend, IconCheck, IconClipboard, IconShield, IconCart } from "./Icons";

export default function GeminiChatView({
  messages = [],
  loading = false,
  onSendMessage,
  currentUser = null,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const displayName = currentUser?.name || "Abilash";

  // Check if session started fresh or resumed after 1 hour (3600000 ms) break
  const [isLongBreak, setIsLongBreak] = useState(() => {
    const lastActive = localStorage.getItem("clearcart_last_active_time");
    if (!lastActive) return true;
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const elapsed = Date.now() - parseInt(lastActive, 10);
    return elapsed >= ONE_HOUR_MS;
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // Update last activity timestamp on new interactions
    if (messages.length > 0) {
      localStorage.setItem("clearcart_last_active_time", Date.now().toString());
    }
  }, [messages, loading]);

  function handleSubmit(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    localStorage.setItem("clearcart_last_active_time", Date.now().toString());
    setIsLongBreak(false);
    onSendMessage(text);
    setInput("");
  }

  const STARTER_PROMPTS = [
    {
      title: "What is running out?",
      desc: "Flag likely stock-outs before they happen, calculate deficits, and view recommended replenishment quantities.",
      prompt: "What is running out in inventory right now? Show critical stock and assumptions.",
      icon: <IconAlert className="w-5 h-5 text-rose-500" />,
      color: "hover:border-rose-300 hover:bg-rose-50/50",
    },
    {
      title: "What is overstocked?",
      desc: "Find products with excess inventory exceeding safety thresholds tying up store capital.",
      prompt: "What products are overstocked or have surplus inventory?",
      icon: <IconBox className="w-5 h-5 text-amber-500" />,
      color: "hover:border-amber-300 hover:bg-amber-50/50",
    },
    {
      title: "How did a product do this month?",
      desc: "Get verified units sold, daily velocity, transaction counts, and revenue figures from SQLite.",
      prompt: "How has sparkling water sold this month? Give actual sales numbers and revenue.",
      icon: <IconTrend className="w-5 h-5 text-blue-500" />,
      color: "hover:border-blue-300 hover:bg-blue-50/50",
    },
    {
      title: "Sales spikes & dead stock",
      desc: "Spot rapid velocity surges and identify items with zero sales in the last 30 days.",
      prompt: "Which items have sales spikes, and which items have zero sales in 30 days?",
      icon: <IconCart className="w-5 h-5 text-emerald-500" />,
      color: "hover:border-emerald-300 hover:bg-emerald-50/50",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-canvas">
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 w-full">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {messages.length === 0 || isLongBreak ? (
            /* Empty / Long Break Welcome State (Hi Abilash) */
            <div className="flex flex-col items-start justify-center min-h-[55vh] text-left space-y-6 fade-up py-6">
              <div className="space-y-2.5 max-w-2xl">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                  <IconSpark className="w-6 h-6" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight">
                  Hi <span className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">{displayName}</span>
                </h2>
                {currentUser?.shopName && (
                  <p className="text-xs font-semibold text-blue-600 font-mono tracking-wide">
                    📍 {currentUser.shopName}
                  </p>
                )}
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  Welcome back. Ask about your live inventory levels, sales spikes, dead stock, and reorder priorities in plain language.
                </p>
              </div>

              {/* Gemini Prompt Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-3xl text-left">
                {STARTER_PROMPTS.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setIsLongBreak(false);
                      onSendMessage(card.prompt);
                    }}
                    className={`stitch-card p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 text-left transition-all ${card.color} group cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-heading font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                        {card.title}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {card.icon}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      {card.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Active Conversation Messages Stream */}
          {messages.length > 0 && (
            <div className="space-y-6 pb-28 text-left w-full">
              {messages.map((m, idx) => (
                <ChatMessage key={idx} message={m} currentUser={currentUser} />
              ))}

              {loading && (
                <div className="flex items-start gap-3.5 fade-up justify-start text-left max-w-3xl">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-1 shadow-2xs">
                    <IconSpark className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-2xl px-5 py-3.5 shadow-xs flex items-center gap-2">
                    <span className="typing-dot w-2 h-2 rounded-full bg-blue-600 block" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-blue-600 block" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-blue-600 block" />
                    <span className="text-xs font-medium text-slate-500 ml-2">Analyzing local SQLite inventory &amp; sales data…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Prompt Bar (Enlarged Input Field & Box) */}
      <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent pt-3 pb-6 px-4 sm:px-8 w-full z-10">
        <div className="w-full max-w-6xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-300/80 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-xl shadow-slate-200/60 flex items-center gap-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          >
            <input
              ref={inputRef}
              type="text"
              id="copilot-prompt-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask in plain language (e.g., what is running out, what is overstocked, how did a product do this month)…"
              className="flex-1 bg-transparent px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base text-slate-800 placeholder-slate-400 outline-none font-medium"
            />

            <button
              type="submit"
              id="copilot-send-btn"
              disabled={loading || !input.trim()}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-md shadow-blue-200 transition-all flex-shrink-0 cursor-pointer"
              title="Send prompt"
            >
              <IconSend className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message, currentUser = null }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AB";

  function handleCopy() {
    navigator.clipboard.writeText(message.text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Format message text with rich styling for markdown elements
  function renderFormattedText(text) {
    if (!text) return null;
    const lines = text.split("\n");

    return lines.map((line, idx) => {
      // Recommendation highlight
      if (line.includes("🎯 Recommended Action:") || line.includes("Action:")) {
        return (
          <div key={idx} className="my-2 p-3 rounded-xl bg-blue-50/90 border border-blue-200/80 text-blue-950 font-medium text-xs sm:text-sm flex items-start gap-2 shadow-2xs">
            <span className="flex-shrink-0">🎯</span>
            <div>{line.replace(/🎯?\s*Recommended Action:\s*/i, "").replace(/\*\*/g, "")}</div>
          </div>
        );
      }

      // Main header line
      if (line.startsWith("### ") || line.startsWith("## ")) {
        return (
          <h4 key={idx} className="font-heading font-extrabold text-slate-900 text-sm sm:text-base mt-3 mb-1">
            {line.replace(/^#+\s*/, "")}
          </h4>
        );
      }

      // Bold titles
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={idx} className="font-bold text-slate-900 text-xs sm:text-sm mt-2 mb-1">
            {line.replace(/\*\*/g, "")}
          </p>
        );
      }

      // Regular line with inline formatting
      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code class='bg-slate-100 text-blue-700 font-mono text-[11px] px-1.5 py-0.5 rounded'>$1</code>");

      return (
        <p
          key={idx}
          className={`${line.startsWith("•") ? "pl-2 my-0.5" : "my-1"} leading-relaxed`}
          dangerouslySetInnerHTML={{ __html: formatted || "&nbsp;" }}
        />
      );
    });
  }

  if (isUser) {
    return (
      <div className="w-full flex justify-end fade-up">
        <div className="flex items-start gap-3 flex-row-reverse max-w-2xl text-right">
          {/* User Avatar */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
            {initials}
          </div>

          {/* User Message Bubble */}
          <div className="space-y-1 text-right">
            <div className="bubble-user inline-block px-5 py-3.5 text-xs sm:text-sm leading-relaxed text-left shadow-xs">
              {message.text}
            </div>
            {message.timestamp && (
              <p className="text-[10px] text-slate-400 font-medium pr-1">{message.timestamp}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-start fade-up">
      <div className="flex items-start gap-3.5 max-w-4xl text-left w-full">
        {/* Agent Avatar */}
        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-1 shadow-2xs">
          <IconSpark className="w-4 h-4" />
        </div>

        {/* Message Bubble Container (Left Aligned) */}
        <div className="space-y-3 text-left flex-1">
          {/* Main Text Content */}
          <div className="px-5 py-4 text-xs sm:text-sm leading-relaxed relative group bubble-bot w-full shadow-2xs">
            {renderFormattedText(message.text)}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Copy response"
            >
              {copied ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconClipboard className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Refusal / Scope Enforcement Badge */}
          {message.status === "refused" && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-200">
              <IconShield className="w-4 h-4 text-rose-600" />
              <span>Scope Refusal: Out of scope operational topic refused</span>
            </div>
          )}

          {/* Clarification Needed Badge */}
          {message.status === "clarification_needed" && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200">
              <span>❓ Clarification Requested: Specify product or timeline</span>
            </div>
          )}

          {/* Missing Data Badge */}
          {message.status === "missing_data" && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
              <span>ℹ Zero records found in catalog — no figures fabricated</span>
            </div>
          )}

          {/* Verified Database Figures Grid */}
          {message.figures && Object.keys(message.figures).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5 w-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <IconShield className="w-3.5 h-3.5 text-blue-600" />
                  Verified SQLite Figure Breakdown
                </span>
                <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  100% Grounded
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(message.figures).map(([key, val]) => (
                  <div key={key} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-medium truncate">{key}</p>
                    <p className="font-mono font-bold text-slate-900 text-sm sm:text-base mt-0.5">{String(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
