import { useState, useEffect } from "react";
import { IconCart, IconX, IconCheck, IconShield } from "./Icons";

export default function ReorderModal({ product, onClose, onConfirm }) {
  if (!product) return null;

  const defaultQty = Math.max(10, (Number(product.reorder_threshold) || 10) * 2 - (Number(product.quantity_on_hand) || 0));
  const [qty, setQty] = useState(defaultQty);
  const [supplier, setSupplier] = useState("Direct Prime Wholesale Ltd.");
  const [urgent, setUrgent] = useState(product.status === "critical");
  const unitPrice = 4.50; // default estimated unit cost

  useEffect(() => {
    setQty(defaultQty);
  }, [product]);

  function handleConfirm(e) {
    e.preventDefault();
    onConfirm({
      productId: product.product_id,
      name: product.name,
      quantity: Number(qty),
      supplier,
      urgent,
      totalEst: (Number(qty) * unitPrice).toFixed(2),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay fade-up">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
              <IconCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white">Generate Purchase Order</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Automated replenishment for {product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Product Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{product.name}</p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">SKU: {product.product_id} · Category: {product.category}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Current Stock</p>
              <p className={`font-bold font-mono ${product.quantity_on_hand <= product.reorder_threshold ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {product.quantity_on_hand} / {product.reorder_threshold} min
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-heading">
                Order Quantity
              </label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Suggested safety buffer</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-heading">
                Est. Unit Cost
              </label>
              <input
                type="text"
                disabled
                value={`$${unitPrice.toFixed(2)}`}
                className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Est. Total: ${(qty * unitPrice).toFixed(2)}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-heading">
              Assigned Supplier
            </label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition"
            >
              <option value="Direct Prime Wholesale Ltd.">Direct Prime Wholesale Ltd. (Primary)</option>
              <option value="Apex Regional Distribution">Apex Regional Distribution (Expedited)</option>
              <option value="Metro Food & Beverage Supply">Metro Food & Beverage Supply</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="po-urgent"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
            />
            <label htmlFor="po-urgent" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Mark as Priority Rush Delivery (Stockout Prevention)
            </label>
          </div>

          <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
            <IconShield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>PO will be automatically logged to the audit trail and synced with local inventory levels.</span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition flex items-center gap-2 cursor-pointer"
            >
              <IconCheck className="w-4 h-4" />
              Confirm &amp; Send PO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
