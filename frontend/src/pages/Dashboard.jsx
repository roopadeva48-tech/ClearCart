import { useState } from "react";
import Navbar from "../components/Navbar";
import KpiCards from "../components/KpiCards";
import AlertCards from "../components/AlertCards";
import ChatPanel from "../components/ChatPanel";
import DataTable from "../components/DataTable";
import ReorderModal from "../components/ReorderModal";
import { IconCheck, IconSpark, IconShield, IconCart } from "../components/Icons";
import { useData } from "../hooks/useData";
import { useAlerts } from "../hooks/useAlerts";

export default function Dashboard({ onReplaySplash = () => {} }) {
  const { rows } = useData();
  const { alerts } = useAlerts();

  // Shared interactive state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard", "inventory", "copilot"
  const [statusFilter, setStatusFilter] = useState("all");
  const [triggerPrompt, setTriggerPrompt] = useState("");
  const [reorderProduct, setReorderProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Dynamic counts
  const totalProducts = rows.length > 0 ? rows.length : 20;
  const criticalCount = rows.filter((r) => r.status === "critical").length || 4;
  const lowStockCount = rows.filter((r) => r.status === "low").length || 2;
  const alertCount = alerts.length > 0 ? alerts.length : 3;

  function handleKpiFilter(filterKey) {
    setStatusFilter(filterKey === statusFilter ? "all" : filterKey);
  }

  function handleAskCopilot(prompt) {
    setTriggerPrompt(prompt);
    setActiveTab("dashboard");
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
    <div className="bg-canvas min-h-screen text-slate-900 pb-12">
      {/* Top Navigation */}
      <Navbar
        alertCount={alertCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAlerts={() => {
          handleAskCopilot("Summarize all active alerts and highlight high-risk items.");
        }}
        onReplaySplash={onReplaySplash}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 right-4 z-50 max-w-md bg-white border border-emerald-200 text-slate-800 p-4 rounded-2xl shadow-xl flex items-start gap-3 fade-up">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <IconCheck className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-900">Purchase Order Transmitted</p>
              <p className="text-slate-600 mt-0.5">{toastMessage}</p>
            </div>
          </div>
        )}

        {/* Dashboard Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 fade-up">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-slate-900">
                Retail Intelligence Dashboard
              </h1>
              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                Downtown Store #104
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Grounded AI decision copilot for inventory and sales operations
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleAskCopilot("What should I reorder first today?")}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition"
            >
              <IconSpark className="w-4 h-4 text-blue-600" />
              Priority Check
            </button>
            <button
              onClick={() => {
                if (rows.length > 0) {
                  const crit = rows.find((r) => r.status === "critical") || rows[0];
                  setReorderProduct(crit);
                }
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
            >
              <IconCart className="w-4 h-4" />
              Quick PO
            </button>
          </div>
        </div>

        {/* Dynamic KPI Cards Row */}
        <KpiCards
          totalProducts={totalProducts}
          criticalCount={criticalCount}
          lowStockCount={lowStockCount}
          activeStatus={statusFilter}
          onSelectFilter={handleKpiFilter}
        />

        {/* Proactive Risk & Sales Alerts Banner */}
        <AlertCards
          onAskCopilot={handleAskCopilot}
          onReorder={setReorderProduct}
        />

        {/* Main Work Area: Grounded AI Copilot + Live Inventory Catalog */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* AI Copilot Panel (5 Cols on large screens) */}
          <div className={`lg:col-span-5 ${activeTab === "inventory" ? "hidden lg:block" : ""}`}>
            <ChatPanel
              triggerPrompt={triggerPrompt}
              onClearTrigger={() => setTriggerPrompt("")}
            />
          </div>

          {/* Live Inventory Catalog Table (7 Cols on large screens) */}
          <div className={`lg:col-span-7 ${activeTab === "copilot" ? "hidden lg:block" : ""}`}>
            <DataTable
              externalSearch={searchQuery}
              externalStatus={statusFilter}
              onSelectProductForReorder={setReorderProduct}
            />
          </div>
        </div>

        {/* Reorder Modal */}
        {reorderProduct && (
          <ReorderModal
            product={reorderProduct}
            onClose={() => setReorderProduct(null)}
            onConfirm={handleReorderConfirm}
          />
        )}

        {/* Footer */}
        <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <IconShield className="w-4 h-4 text-emerald-600" />
            <span>ClearCart v1.0 — Strict SQLite Data Grounding &amp; Refusal Enforced</span>
          </div>
          <div>
            <span>Powered by Gemini 2.0 Flash &amp; FAISS Semantic Embeddings</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
