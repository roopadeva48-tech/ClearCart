import { useState, useRef, useEffect } from "react";
import { postChat } from "../api/client";
import { IconSend, IconSpark, IconRefresh, IconCheck, IconClipboard, IconShield } from "./Icons";

const SUGGESTED = [
  "What is running out?",
  "What should I reorder first?",
  "Show sales spikes this week",
  "Which items have no sales?",
  "How has sparkling water sold?",
  "What is our employee payroll?", // Tests refusal
];

const WELCOME = {
  role: "bot",
  text: "Hello! I'm your ClearCart AI copilot 👋\n\nI am strictly grounded in your local sales and inventory SQLite database. I'll provide verified figures, cite records, and refuse out-of-scope guesses.",
};

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 fade-up">
      <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
        <IconSpark className="w-3.5 h-3.5" />
      </div>
      <div className="bubble-bot px-4 py-3 flex gap-1.5 items-center">
        <span className="typing-dot w-2 h-2 rounded-full bg-indigo-500 block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-indigo-500 block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-indigo-500 block" />
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  function copyText() {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`flex items-start gap-2.5 fade-up ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600 mt-0.5">
          <IconSpark className="w-3.5 h-3.5" />
        </div>
      )}

      <div className={`max-w-[85%] px-4 py-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap relative group ${
        isUser ? "bubble-user" : "bubble-bot"
      }`}>
        {msg.text}

        {/* Copy action on bot message */}
        {!isUser && (
          <button
            onClick={copyText}
            title="Copy answer"
            className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            {copied ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconClipboard className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Status Pills */}
        {msg.status === "refused" && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200">
            <span>🛡 Scope Enforcement: Out of Scope query refused</span>
          </div>
        )}

        {msg.status === "clarification_needed" && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
            <span>❓ Disambiguation Needed: More specific product/date requested</span>
          </div>
        )}

        {/* Figures breakdown card */}
        {msg.figures && Object.keys(msg.figures).length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Verified SQLite Citations
            </p>
            {Object.entries(msg.figures).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-xs">
                <span className="text-slate-600 capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-mono font-bold text-indigo-600">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel({
  triggerPrompt = "",
  onClearTrigger = () => {},
}) {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (triggerPrompt) {
      send(triggerPrompt);
      onClearTrigger();
    }
  }, [triggerPrompt]);

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await postChat(msg);
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: res.answer,
          status: res.status,
          figures: res.figures,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "Could not reach the ClearCart backend. Is the server running on port 8000?",
          status: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessages([WELCOME]);
  }

  return (
    <section className="stitch-card flex flex-col h-[600px] fade-up-d2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            <IconSpark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-heading font-bold text-slate-900">
                Grounded AI Copilot
              </h3>
              <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                Zero Hallucinations
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Grounded in local SQLite inventory &amp; sales
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 transition"
          title="Reset conversation"
        >
          <IconRefresh className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
        {messages.map((m, i) => (
          <Message key={i} msg={m} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Prompt Pills */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 self-center mr-1">
          Quick queries:
        </span>
        {SUGGESTED.map((s) => (
          <button
            key={s}
            id={`suggest-${s.slice(0, 16).replace(/\s/g, "-")}`}
            onClick={() => send(s)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-600 transition font-medium"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <input
            id="chat-input"
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
            placeholder="Ask anything about inventory, sales spikes, or reorders…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <button
            id="chat-send"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-xs transition"
          >
            <IconSend className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
