import { useState, useMemo } from "react";
import { useData } from "../hooks/useData";
import { IconCart, IconFilter, IconSearch, IconChevron, IconClipboard } from "./Icons";

const DEMO_ROWS = [
  { product_id: "P001", name: "Basmati Rice 5kg",      category: "Grains",     quantity_on_hand: 45, reorder_threshold: 20, status: "ok" },
  { product_id: "P002", name: "Organic Whole Milk 1L",  category: "Dairy",      quantity_on_hand: 3,  reorder_threshold: 15, status: "critical" },
  { product_id: "P003", name: "Sunflower Oil 1L",       category: "Oils",       quantity_on_hand: 8,  reorder_threshold: 30, status: "critical" },
  { product_id: "P004", name: "Brown Sugar 1kg",        category: "Sweeteners", quantity_on_hand: 3,  reorder_threshold: 15, status: "critical" },
  { product_id: "P005", name: "Sea Salt 500g",          category: "Condiments", quantity_on_hand: 22, reorder_threshold: 10, status: "ok" },
  { product_id: "P006", name: "Tomato Sauce 400g",      category: "Canned",     quantity_on_hand: 17, reorder_threshold: 20, status: "low" },
  { product_id: "P007", name: "Pasta Penne 500g",       category: "Dry Goods",  quantity_on_hand: 50, reorder_threshold: 18, status: "ok" },
  { product_id: "P008", name: "Coffee Arabica 250g",    category: "Beverages",  quantity_on_hand: 5,  reorder_threshold: 12, status: "critical" },
  { product_id: "P009", name: "Green Tea 100g",         category: "Beverages",  quantity_on_hand: 12, reorder_threshold: 8,  status: "ok" },
  { product_id: "P010", name: "Almonds 500g",           category: "Nuts",       quantity_on_hand: 2,  reorder_threshold: 5,  status: "critical" },
];

const STATUS = {
  critical: { label: "Critical", cls: "badge-critical", bar: "bg-rose-500" },
  low:      { label: "Low Stock", cls: "badge-low", bar: "bg-amber-500" },
  ok:       { label: "In Stock", cls: "badge-ok", bar: "bg-emerald-500" },
};

export default function DataTable({
  externalSearch = "",
  externalStatus = "all",
  onSelectProductForReorder = () => {},
}) {
  const { rows, loading } = useData();
  const rawRows = (!loading && rows.length > 0) ? rows : DEMO_ROWS;

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [internalStatus, setInternalStatus] = useState("all");
  const [sortField, setSortField] = useState("quantity_on_hand");
  const [sortAsc, setSortAsc] = useState(true);

  // Derive categories
  const categories = useMemo(() => {
    const set = new Set(rawRows.map((r) => r.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [rawRows]);

  const effectiveStatus = externalStatus !== "all" ? externalStatus : internalStatus;

  // Filter & Sort
  const filteredRows = useMemo(() => {
    return rawRows
      .filter((row) => {
        // Status filter
        if (effectiveStatus !== "all" && row.status !== effectiveStatus) {
          return false;
        }
        // Category filter
        if (selectedCategory !== "all" && row.category !== selectedCategory) {
          return false;
        }
        // Search filter
        if (externalSearch.trim()) {
          const q = externalSearch.toLowerCase();
          const matchName = (row.name || "").toLowerCase().includes(q);
          const matchSku = (row.product_id || "").toLowerCase().includes(q);
          const matchCat = (row.category || "").toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [rawRows, effectiveStatus, selectedCategory, externalSearch, sortField, sortAsc]);

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  function exportCSV() {
    const headers = ["Product ID", "Name", "Category", "Quantity On Hand", "Reorder Threshold", "Status"];
    const lines = filteredRows.map((r) =>
      `"${r.product_id}","${r.name}","${r.category}",${r.quantity_on_hand},${r.reorder_threshold},"${r.status}"`
    );
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clearcart_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <section className="stitch-card flex flex-col h-[600px] fade-up-d3 overflow-hidden bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-heading font-bold text-slate-900">
                Live Inventory Catalog
              </h3>
              <span className="text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                {filteredRows.length} of {rawRows.length} shown
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-time synchronization with SQLite backend
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            title="Export CSV data"
          >
            <IconClipboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] flex-shrink-0 mr-1 flex items-center gap-1">
            <IconFilter className="w-3 h-3" /> Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition flex-shrink-0 capitalize ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
            <tr>
              <th
                onClick={() => handleSort("name")}
                className="text-left py-2.5 px-4 font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-indigo-600"
              >
                Product &amp; SKU {sortField === "name" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("category")}
                className="text-left py-2.5 px-3 font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-indigo-600 hidden sm:table-cell"
              >
                Category {sortField === "category" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("quantity_on_hand")}
                className="text-left py-2.5 px-3 font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-indigo-600"
              >
                Stock Level {sortField === "quantity_on_hand" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("reorder_threshold")}
                className="text-left py-2.5 px-3 font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-indigo-600 hidden md:table-cell"
              >
                Min Target {sortField === "reorder_threshold" && (sortAsc ? "↑" : "↓")}
              </th>
              <th className="text-left py-2.5 px-3 font-bold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="text-right py-2.5 px-4 font-bold text-slate-600 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                  No matching products found. Try clearing filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const s = STATUS[row.status] ?? STATUS.ok;
                const ratio = Math.min(100, Math.round((row.quantity_on_hand / Math.max(1, row.reorder_threshold * 1.5)) * 100));

                return (
                  <tr
                    key={row.product_id}
                    id={`row-${row.product_id}`}
                    className="trow group hover:bg-indigo-50/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                        {row.name}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {row.product_id}
                      </p>
                    </td>

                    <td className="py-3 px-3 text-slate-500 hidden sm:table-cell">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[10px]">
                        {row.category}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-xs ${
                          row.status === "critical" ? "text-rose-600" :
                          row.status === "low" ? "text-amber-600" : "text-slate-800"
                        }`}>
                          {row.quantity_on_hand}
                        </span>
                        <div className="w-12 sm:w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${s.bar} rounded-full`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-500 hidden md:table-cell">
                      {row.reorder_threshold} units
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectProductForReorder(row)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition-all flex items-center gap-1 ml-auto shadow-2xs"
                      >
                        <IconCart className="w-3 h-3" />
                        Reorder
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>SQLite Grounded Inventory Store</span>
        <span>Auto-refreshed with API</span>
      </div>
    </section>
  );
}
