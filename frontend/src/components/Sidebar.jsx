import { IconPlus, IconMessage, IconTrash, IconSpark, IconShield, IconChevronLeft, IconBox, IconTrend, IconAlert, IconCart, IconLogout } from "./Icons";

export default function Sidebar({
  isOpen,
  onToggle = () => {},
  onClose = () => {},
  threads = [],
  activeThreadId,
  onSelectThread = () => {},
  onNewChat = () => {},
  onDeleteThread = () => {},
  onQuickPrompt = () => {},
  currentUser = null,
  onLogout = () => {},
}) {
  const PINNED_PROMPTS = [
    { label: "What is running out?", icon: <IconAlert className="w-3.5 h-3.5 text-rose-500" />, prompt: "What is running out in inventory right now?" },
    { label: "What is overstocked?", icon: <IconBox className="w-3.5 h-3.5 text-amber-500" />, prompt: "What products are overstocked or have excess inventory?" },
    { label: "Sales spikes & drops", icon: <IconTrend className="w-3.5 h-3.5 text-indigo-500" />, prompt: "Show products with unusual sales spikes or volume shifts this week." },
    { label: "Dead stock (not moving)", icon: <IconBox className="w-3.5 h-3.5 text-slate-400" />, prompt: "Which products have zero sales in the last 30 days?" },
    { label: "What should I reorder first?", icon: <IconCart className="w-3.5 h-3.5 text-emerald-500" />, prompt: "What should I reorder first? Show the priority list and assumptions." },
  ];

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SM";

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (typeof onClose === "function") onClose();
    else if (typeof onToggle === "function") onToggle();
  };

  return (
    <aside className="w-72 bg-slate-50/90 border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 z-30 select-none transition-all duration-300">
      {/* Top Header & New Chat */}
      <div className="p-4 space-y-4">
        {/* Brand & Collapse */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <IconSpark className="w-6 h-6" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-base tracking-tight text-slate-900">
                Clear<span className="text-blue-600">Cart</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                Copilot AI
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            title="Collapse sidebar"
          >
            <IconChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Gemini + New Chat Button */}
        <button
          onClick={onNewChat}
          id="new-chat-btn"
          className="w-full bg-white hover:bg-slate-100/90 border border-slate-200/90 text-slate-800 rounded-full py-2.5 px-4 text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2.5 justify-start group cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <IconPlus className="w-3.5 h-3.5" />
          </div>
          <span>New chat</span>
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 space-y-5">
        {/* Pinned Quick Intelligence Queries */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
            Manager Shortcuts
          </p>
          {PINNED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onQuickPrompt(p.prompt)}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-white hover:shadow-2xs transition flex items-center gap-2.5 group"
            >
              <span className="flex-shrink-0 group-hover:scale-110 transition-transform">
                {p.icon}
              </span>
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Recent Chat History */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3">
            <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
              Recent Chats
            </p>
            <span className="text-[10px] font-mono text-slate-400">{threads.length}</span>
          </div>

          {threads.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
              No previous chats yet
            </div>
          ) : (
            threads.map((t) => {
              const isActive = t.id === activeThreadId;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectThread(t.id)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-800 font-semibold border border-blue-100 shadow-2xs"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
                    <IconMessage className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="truncate">{t.title || "New Question"}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteThread(t.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                    title="Delete chat"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom User Footer */}
      <div className="p-3 border-t border-slate-200/80 bg-white/60">
        <div className="flex items-center justify-between px-2.5 py-2 bg-slate-100/80 rounded-xl">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="leading-tight overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">
                {currentUser?.name || "Store Manager"}
              </p>
              <p className="text-[10px] text-slate-400 truncate" title={currentUser?.shopName || "Downtown Store #104"}>
                {currentUser?.shopName || "Downtown Store #104"}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
            title="Log Out"
          >
            <IconLogout className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
