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
      {/* Left: Sidebar Toggle Button */}
      <div className="flex items-center gap-2">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            id="sidebar-toggle-btn"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
            title="Open history sidebar"
          >
            <IconMenu className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Center: Enlarged Search Bar */}
      <div className="flex-1 max-w-4xl lg:max-w-5xl mx-2 sm:mx-4">
        <div className="relative flex items-center bg-slate-100/90 hover:bg-slate-100 border border-slate-200/90 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 transition-all shadow-xs">
          <IconSearch className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
          <input
            id="header-search-bar"
            type="text"
            placeholder="Search questions, inventory stock, sales trends (Press Enter to ask)…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-sm sm:text-base text-slate-800 placeholder-slate-400 outline-none w-full ml-3 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-slate-400 hover:text-slate-600 p-1 ml-1 cursor-pointer"
            >
              <IconX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Shop Profile & Replay */}
      <div className="flex items-center gap-2">
        {/* Current Shop Pill */}
        {currentUser && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
            <IconStore className="w-3.5 h-3.5 text-blue-600" />
            <span className="max-w-[140px] truncate" title={currentUser.shopName}>
              {currentUser.shopName}
            </span>
          </div>
        )}

        <button
          onClick={onReplaySplash}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition shadow-2xs cursor-pointer"
          title="Replay Brand Logo Splash"
        >
          <IconRefresh className="w-4 h-4" />
        </button>

        {currentUser && (
          <button
            onClick={onLogout}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition shadow-2xs cursor-pointer"
            title="Sign Out"
          >
            <IconLogout className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
