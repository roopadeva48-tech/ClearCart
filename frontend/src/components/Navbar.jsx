import { IconSpark, IconSearch, IconBell, IconShield, IconX } from "./Icons";

export default function Navbar({
  alertCount = 0,
  searchQuery = "",
  onSearchChange = () => {},
  activeTab = "dashboard",
  onTabChange = () => {},
  onOpenAlerts = () => {},
  onReplaySplash = () => {},
}) {
  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-4 transition-all">
      {/* Brand & Logo */}
      <div
        onClick={onReplaySplash}
        className="flex items-center gap-3 cursor-pointer group"
        title="Replay ClearCart Brand Intro Animation"
      >
        {/* Lined Cart Icon Mini */}
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center p-1 group-hover:bg-blue-600 transition-colors shadow-2xs">
          <svg
            viewBox="0 0 320 280"
            className="w-7 h-7 text-blue-700 group-hover:text-white transition-colors"
            fill="none"
            stroke="currentColor"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="
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
            " />
          </svg>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
              CLEAR <span className="text-blue-600">CART</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-pulse" />
              Grounded AI
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-400 font-medium">
            Retail Sales &amp; Inventory Intelligence
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-600">
        <button
          onClick={() => onTabChange("dashboard")}
          className={`px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === "dashboard"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onTabChange("inventory")}
          className={`px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === "inventory"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          Inventory Catalog
        </button>
        <button
          onClick={() => onTabChange("copilot")}
          className={`px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === "copilot"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          AI Copilot
        </button>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-3">
        {/* Global Live Filter Search */}
        <div className="relative flex items-center bg-slate-100/90 border border-slate-200 rounded-xl px-3 py-1.5 w-44 sm:w-60 focus-within:w-68 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <IconSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            id="nav-search"
            type="text"
            placeholder="Search SKU, name, tag…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none w-full ml-2 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Alerts Button */}
        <button
          id="nav-alerts-btn"
          onClick={onOpenAlerts}
          className="relative p-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs"
          title="View active alerts"
        >
          <IconBell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
              {alertCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
            SM
          </div>
          <div className="leading-tight hidden md:block">
            <p className="text-xs font-bold text-slate-800">Store Manager</p>
            <p className="text-[10px] font-medium text-slate-400">Admin Mode</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
