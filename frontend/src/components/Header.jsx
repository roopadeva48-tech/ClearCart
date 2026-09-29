import { useState, useEffect } from "react";
import {
  IconMenu,
  IconSearch,
  IconSpark,
  IconX,
  IconRefresh,
  IconLogout,
  IconStore,
  IconSun,
  IconMoon,
  IconDashboard,
  IconTable,
  IconZap,
} from "./Icons";

export default function Header({
  sidebarOpen,
  onToggleSidebar,
  searchQuery = "",
  onSearchChange = () => {},
  onSearchSubmit = () => {},
  onReplaySplash = () => {},
  activeTab = "copilot",
  onTabChange = () => {},
  currentUser = null,
  onLogout = () => {},
  onOpenApiKeyModal = () => {},
}) {
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem("clearcart_theme") === "dark" ||
      (!("clearcart_theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("clearcart_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("clearcart_theme", "light");
    }
  }, [isDark]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && searchQuery.trim()) {
      onSearchSubmit(searchQuery);
    }
  }

  const tabs = [
    { id: "copilot", label: "AI Copilot", icon: <IconSpark className="w-4 h-4" /> },
    { id: "dashboard", label: "Executive Dashboard", icon: <IconDashboard className="w-4 h-4" /> },
    { id: "inventory", label: "Live Inventory", icon: <IconTable className="w-4 h-4" /> },
    { id: "alerts", label: "Risk & Alerts", icon: <IconZap className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 transition-colors duration-300">
      {/* Left: Sidebar Toggle & Navigation View Tabs */}
      <div className="flex items-center gap-2 sm:gap-3">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            id="sidebar-toggle-btn"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-2xs cursor-pointer"
            title="Open history sidebar"
          >
            <IconMenu className="w-4 h-4" />
          </button>
        )}

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
                }`}
              >
                <span className={isActive ? "text-blue-600 dark:text-white" : "text-slate-400 dark:text-slate-400"}>
                  {tab.icon}
                </span>
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-xl mx-2 hidden sm:block">
        <div className="relative flex items-center bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 rounded-2xl px-3.5 py-1.5 transition-all">
          <IconSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            id="header-search-bar"
            type="text"
            placeholder="Ask copilot or search inventory (Press Enter)…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none w-full ml-2 font-medium"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange("")}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400">
              ↵
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Theme Toggle, Shop Badge, Replay, Logout */}
      <div className="flex items-center gap-2">
        {/* Dark/Light Mode Switcher */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-amber-400 transition shadow-2xs cursor-pointer"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <IconSun className="w-4 h-4 text-amber-400" /> : <IconMoon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Current Shop Pill */}
        {currentUser && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <IconStore className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="max-w-[130px] truncate" title={currentUser.shopName}>
              {currentUser.shopName}
            </span>
          </div>
        )}

        <button
          onClick={onReplaySplash}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition shadow-2xs cursor-pointer"
          title="Replay Brand Logo Splash"
        >
          <IconRefresh className="w-4 h-4" />
        </button>

        {currentUser && (
          <button
            onClick={onLogout}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition shadow-2xs cursor-pointer"
            title="Sign Out"
          >
            <IconLogout className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}

