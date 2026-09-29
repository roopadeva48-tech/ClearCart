import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import GeminiChatView from "../components/GeminiChatView";
import KpiCards from "../components/KpiCards";
import AlertCards from "../components/AlertCards";
import DataTable from "../components/DataTable";
import ReorderModal from "../components/ReorderModal";
import ApiKeyModal from "../components/ApiKeyModal";
import { postChat } from "../api/client";
import { useData } from "../hooks/useData";
import { useAlerts } from "../hooks/useAlerts";
import { IconSpark, IconCart, IconCheck, IconShield } from "../components/Icons";

export default function CopilotApp({
  onReplaySplash = () => {},
  currentUser = null,
  onLogout = () => {},
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("copilot"); // "copilot" | "dashboard" | "inventory" | "alerts"
  const [reorderProduct, setReorderProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  // Data hooks for dashboard overview
  const { rows } = useData();
  const { alerts } = useAlerts();

  const totalProducts = rows.length > 0 ? rows.length : 20;
  const criticalCount = rows.filter((r) => r.status === "critical").length || 4;
  const lowStockCount = rows.filter((r) => r.status === "low").length || 2;

  // Derive unique per-user storage key
  const userKey = (currentUser?.userId || currentUser?.mailId || currentUser?.name || "guest")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  const storageKey = `clearcart_copilot_threads_${userKey}`;

  // Helper to load user-isolated conversation threads
  function loadUserThreads(key) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: `thread-${Date.now()}`,
        title: "Stock & Inventory Analysis",
        messages: [],
        updatedAt: Date.now(),
      },
    ];
  }

  const [threads, setThreads] = useState(() => loadUserThreads(storageKey));
  const [activeThreadId, setActiveThreadId] = useState(() => threads[0]?.id || `thread-${Date.now()}`);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Reload user's own isolated threads whenever currentUser switches
  useEffect(() => {
    const loaded = loadUserThreads(storageKey);
    setThreads(loaded);
    setActiveThreadId(loaded[0]?.id || `thread-${Date.now()}`);
  }, [storageKey]);

  // Sync threads specifically to this user's storage key
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(threads));
    } catch {}
  }, [threads, storageKey]);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0] || {
    id: "thread-default",
    title: "New Chat",
    messages: [],
  };

  function handleNewChat() {
    const newId = `thread-${Date.now()}`;
    const newThread = {
      id: newId,
      title: "New Chat",
      messages: [],
      updatedAt: Date.now(),
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    setActiveTab("copilot");
  }

  function handleSelectThread(id) {
    setActiveThreadId(id);
    setActiveTab("copilot");
  }

  function handleDeleteThread(id) {
    setThreads((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        const fallback = {
          id: `thread-${Date.now()}`,
          title: "New Chat",
          messages: [],
          updatedAt: Date.now(),
        };
        setActiveThreadId(fallback.id);
        return [fallback];
      }
      if (activeThreadId === id) {
        setActiveThreadId(filtered[0].id);
      }
      return filtered;
    });
  }

  async function handleSendMessage(text) {
    if (!text.trim() || loading) return;
    setActiveTab("copilot");

    const userMsg = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Append user message immediately
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThread.id) {
          const isFirstUserMsg = t.messages.length === 0;
          return {
            ...t,
            title: isFirstUserMsg ? (text.length > 30 ? text.slice(0, 30) + "…" : text) : t.title,
            messages: [...t.messages, userMsg],
            updatedAt: Date.now(),
          };
        }
        return t;
      })
    );

    setLoading(true);

    try {
      const res = await postChat(text);
      const botMsg = {
        id: `msg-${Date.now()}-bot`,
        role: "assistant",
        text: res.answer,
        status: res.status,
        figures: res.figures || {},
        recommendation: res.recommendation,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThread.id) {
            return {
              ...t,
              messages: [...t.messages, botMsg],
              updatedAt: Date.now(),
            };
          }
          return t;
        })
      );
    } catch (err) {
      const errMsg = {
        id: `msg-${Date.now()}-err`,
        role: "assistant",
        text: "Could not retrieve real-time retail data. Please ensure the ClearCart server is active and try again.",
        status: "error",
        figures: {},
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThread.id) {
            return {
              ...t,
              messages: [...t.messages, errMsg],
              updatedAt: Date.now(),
            };
          }
          return t;
        })
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(query) {
    if (!query.trim()) return;
    setSearchQuery("");
    handleSendMessage(query);
  }

  function handleReorderConfirm(poData) {
    setReorderProduct(null);
    setToastMessage(
      `PO successfully generated for ${poData.quantity} units of ${poData.name} ($${poData.totalEst}). Supplier: ${poData.supplier}`
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas font-sans transition-colors duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 max-w-md bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-slate-100 p-4 rounded-2xl shadow-xl flex items-start gap-3 fade-up">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <IconCheck className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-900 dark:text-white">Purchase Order Transmitted</p>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Gemini-Style Collapsible Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onClose={() => setSidebarOpen(false)}
        threads={threads}
        activeThreadId={activeThread.id}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        onQuickPrompt={handleSendMessage}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onReplaySplash={onReplaySplash}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentUser={currentUser}
          onLogout={onLogout}
          onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
        />

        {/* View Routing */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "copilot" && (
            <GeminiChatView
              messages={activeThread.messages}
              loading={loading}
              onSendMessage={handleSendMessage}
              currentUser={currentUser}
            />
          )}

          {activeTab === "dashboard" && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-7xl mx-auto w-full fade-up">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Executive Store Intelligence
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Continuous grounded reasoning for store inventory, sales anomalies, and restock actions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendMessage("What should I reorder first today? Show priority ranking.")}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <IconSpark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Priority Check
                  </button>
                  <button
                    onClick={() => {
                      if (rows.length > 0) {
                        const crit = rows.find((r) => r.status === "critical") || rows[0];
                        setReorderProduct(crit);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <IconCart className="w-4 h-4" />
                    Quick PO
                  </button>
                </div>
              </div>

              {/* Dynamic KPI Cards */}
              <KpiCards
                totalProducts={totalProducts}
                criticalCount={criticalCount}
                lowStockCount={lowStockCount}
                activeStatus={statusFilter}
                onSelectFilter={(filterKey) => {
                  setStatusFilter(filterKey === statusFilter ? "all" : filterKey);
                  setActiveTab("inventory");
                }}
              />

              {/* Proactive Risk & Sales Alerts Banner */}
              <AlertCards
                onAskCopilot={handleSendMessage}
                onReorder={setReorderProduct}
              />

              {/* Live Inventory Preview Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-heading">
                    Active Catalog Stock Status
                  </h2>
                  <button
                    onClick={() => setActiveTab("inventory")}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Open Full Catalog →
                  </button>
                </div>
                <DataTable
                  externalSearch={searchQuery}
                  externalStatus={statusFilter}
                  onSelectProductForReorder={setReorderProduct}
                />
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full fade-up">
              <DataTable
                externalSearch={searchQuery}
                externalStatus={statusFilter}
                onSelectProductForReorder={setReorderProduct}
              />
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-6 fade-up">
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Risk &amp; Alert Center
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Deterministic detection of stock-outs, abnormal sales velocity surges, and dormant inventory
                </p>
              </div>
              <AlertCards
                onAskCopilot={handleSendMessage}
                onReorder={setReorderProduct}
              />
            </div>
          )}
        </main>
      </div>

      {/* Reorder Modal */}
      {reorderProduct && (
        <ReorderModal
          product={reorderProduct}
          onClose={() => setReorderProduct(null)}
          onConfirm={handleReorderConfirm}
        />
      )}

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onKeySaved={() => {}}
      />
    </div>
  );
}

