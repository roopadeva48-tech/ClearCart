import { IconMenu, IconSearch, IconSpark, IconX, IconRefresh, IconLogout, IconStore } from "./Icons";

export default function Header({
  sidebarOpen,
  onToggleSidebar,
  searchQuery = "",
  onSearchChange = () => {},
  onSearchSubmit = () => {},
  onReplaySplash = () => {},
  hasApiKey = false,
  onOpenApiKeyModal = () => {},
  currentUser = null,
  onLogout = () => {},
}) {
  function handleKeyDown(e) {
    if (e.key === "Enter" && searchQuery.trim()) {
      onSearchSubmit(searchQuery);
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 transition-all">
      {/* Left: Sidebar Toggle & Brand */}
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            id="sidebar-toggle-btn"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
            title="Open history sidebar"
          >
            <IconMenu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <IconSpark className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-base tracking-tight text-slate-900 leading-tight">
              ClearCart <span className="text-blue-600">Copilot</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              Retail Intelligence Assistant
            </span>
          </div>
        </div>
      </div>

      {/* Center: Search Bar in Header */}
      <div className="flex-1 max-w-xl mx-2">
        <div className="relative flex items-center bg-slate-100/90 border border-slate-200 rounded-2xl px-3.5 py-1.5 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-2xs">
          <IconSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            id="header-search-bar"
            type="text"
            placeholder="Search questions, inventory stock, sales trends (Press Enter to ask)…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none w-full ml-2 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-slate-400 hover:text-slate-600 p-0.5 ml-1"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right: API Key Badge, Shop Profile & Replay */}
      <div className="flex items-center gap-2">
        {/* Dynamic API Key Badge / Configuration Button */}
        <button
          onClick={onOpenApiKeyModal}
          id="api-key-config-btn"
          className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
            hasApiKey
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
              : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          }`}
          title="Configure Gemini API Key for Dynamic AI Chat"
        >
          <span className={`w-2 h-2 rounded-full ${hasApiKey ? "bg-emerald-500 animate-pulse" : "bg-blue-600"}`} />
          <span className="hidden md:inline">{hasApiKey ? "Gemini 2.0 Dynamic AI Active" : "🔑 Set Gemini API Key"}</span>
          <span className="md:hidden">{hasApiKey ? "AI Active" : "API Key"}</span>
        </button>

        {/* Current Shop Pill */}
        {currentUser && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
            <IconStore className="w-3.5 h-3.5 text-blue-600" />
            <span className="max-w-[120px] truncate" title={currentUser.shopName}>
              {currentUser.shopName}
            </span>
          </div>
        )}

        <button
          onClick={onReplaySplash}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition shadow-2xs"
          title="Replay Brand Logo Splash"
        >
          <IconRefresh className="w-4 h-4" />
        </button>

        {currentUser && (
          <button
            onClick={onLogout}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition shadow-2xs"
            title="Sign Out"
          >
            <IconLogout className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
