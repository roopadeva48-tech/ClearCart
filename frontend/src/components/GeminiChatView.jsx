import { useState, useRef, useEffect } from "react";
import { IconSend, IconSpark, IconBox, IconAlert, IconTrend, IconCheck, IconClipboard, IconShield, IconCart } from "./Icons";

export default function GeminiChatView({
  messages = [],
  loading = false,
  onSendMessage,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSubmit(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    onSendMessage(text);
    setInput("");
  }

  const STARTER_PROMPTS = [
    {
      title: "What is running out?",
      desc: "Flag likely stock-outs before they happen and view actual numbers.",
      prompt: "What is running out in inventory right now? Show critical stock and assumptions.",
      icon: <IconAlert className="w-5 h-5 text-rose-500" />,
      color: "hover:border-rose-300 hover:bg-rose-50/50",
    },
    {
      title: "What is overstocked?",
      desc: "Find products with excess inventory exceeding safety thresholds.",
      prompt: "What products are overstocked or have surplus inventory?",
      icon: <IconBox className="w-5 h-5 text-amber-500" />,
      color: "hover:border-amber-300 hover:bg-amber-50/50",
    },
    {
      title: "How did a product do this month?",
      desc: "Get actual units sold, revenue, and daily velocity figures.",
      prompt: "How has sparkling water sold this month? Give actual sales numbers and revenue.",
      icon: <IconTrend className="w-5 h-5 text-blue-500" />,
      color: "hover:border-blue-300 hover:bg-blue-50/50",
    },
    {
      title: "Sales spikes & dead stock",
      desc: "Spot rapid demand acceleration or non-moving inventory.",
      prompt: "Which items have sales spikes, and which items have zero sales in 30 days?",
      icon: <IconCart className="w-5 h-5 text-emerald-500" />,
      color: "hover:border-emerald-300 hover:bg-emerald-50/50",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-canvas">
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          /* Empty / Welcome State */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 fade-up py-8">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-200">
                <IconSpark className="w-6 h-6" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight">
                Hello, <span className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">Store Manager</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto font-medium">
                Ask in plain language. I will answer with actual database numbers, highlight what needs attention today, and recommend concrete actions.
              </p>
            </div>

            {/* Gemini Prompt Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl text-left">
              {STARTER_PROMPTS.map((card, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(card.prompt)}
                  className={`stitch-card p-4 rounded-2xl bg-white border border-slate-200/90 text-left transition-all ${card.color} group cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-heading font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
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
        ) : (
          /* Active Chat Thread */
          <div className="space-y-6 pb-20">
            {messages.map((m, idx) => (
              <ChatMessage key={idx} message={m} />
            ))}

            {loading && (
              <div className="flex items-start gap-3.5 fade-up">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-1">
                  <IconSpark className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl px-5 py-4 shadow-xs flex items-center gap-2">
                  <span className="typing-dot w-2 h-2 rounded-full bg-blue-600 block" />
                  <span className="typing-dot w-2 h-2 rounded-full bg-blue-600 block" />
                  <span className="typing-dot w-2 h-2 rounded-full bg-blue-600 block" />
                  <span className="text-xs font-medium text-slate-400 ml-2">Pulling verified SQLite figures…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Floating Bottom Prompt Bar (Gemini Style) */}
      <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pt-4 pb-5 px-4 sm:px-8 max-w-4xl mx-auto w-full z-10">
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-lg shadow-slate-200/50 flex items-center gap-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            id="copilot-prompt-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about running out stock, overstocked items, product sales, or recommendations…"
            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
          />

          <button
            type="submit"
            id="copilot-send-btn"
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-xs transition-all flex-shrink-0"
            title="Send prompt"
          >
            <IconSend className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] font-medium text-slate-400 text-center mt-2">
          ClearCart provides verified figures from SQLite data. Code-level refusal prevents hallucinations.
        </p>
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`flex items-start gap-3.5 fade-up ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      {!isUser ? (
        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-1 shadow-2xs">
          <IconSpark className="w-4 h-4" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
          SM
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`max-w-[88%] space-y-3 ${isUser ? "text-right" : "text-left"}`}>
        {/* Main Text Content */}
        <div
          className={`px-5 py-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap relative group ${
            isUser ? "bubble-user inline-block" : "bubble-bot"
          }`}
        >
          {message.text}

          {/* Copy Button */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition"
              title="Copy response"
            >
              {copied ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconClipboard className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Refusal / Scope Enforcement Badge */}
        {message.status === "refused" && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-200">
            <IconShield className="w-4 h-4 text-rose-600" />
            <span>Scope Refusal: Out of scope request rejected</span>
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
            <span>ℹ Zero records found in catalog — no data invented</span>
          </div>
        )}

        {/* Verified Database Figures Grid */}
        {message.figures && Object.keys(message.figures).length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <IconShield className="w-3.5 h-3.5 text-blue-600" />
                Verified SQLite Figure Breakdown
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                100% Grounded
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(message.figures).map(([key, val]) => (
                <div key={key} className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium truncate">{key}</p>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{String(val)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
