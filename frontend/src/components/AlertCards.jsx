import { useAlerts } from "../hooks/useAlerts";
import { IconAlert, IconTrend, IconBox, IconSpark, IconCart } from "./Icons";

const ICON_MAP = {
  stockout: <IconAlert className="w-5 h-5" />,
  spike:    <IconTrend  className="w-5 h-5" />,
  dead:     <IconBox    className="w-5 h-5" />,
};

const STYLE_MAP = {
  stockout: {
    card: "border-rose-200 dark:border-rose-900/60 bg-gradient-to-b from-rose-50/50 to-white dark:from-rose-950/20 dark:to-slate-900/90",
    iconBg: "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400",
    badge: "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
    label: "CRITICAL STOCKOUT",
  },
  spike: {
    card: "border-amber-200 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900/90",
    iconBg: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    label: "VELOCITY SPIKE",
  },
  dead: {
    card: "border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50/60 to-white dark:from-slate-800/20 dark:to-slate-900/90",
    iconBg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    label: "DEAD INVENTORY",
  },
};

const DEMO_ALERTS = [
  {
    type: "stockout",
    title: "Organic Whole Milk 1L — 3 units remaining",
    detail: "Current stock (3) is well below safety threshold (15). Immediate replenishment recommended.",
    productId: "P002",
    productName: "Organic Whole Milk 1L",
    prompt: "What is the stock status and reorder recommendation for Organic Whole Milk 1L?",
  },
  {
    type: "spike",
    title: "+140% velocity spike on Sparkling Water",
    detail: "Sold 30 units yesterday compared to the 15-day average of 12.5 units.",
    productId: "P014",
    productName: "Sparkling Mineral Water",
    prompt: "How has sparkling water sold this month and is there a sales spike?",
  },
  {
    type: "dead",
    title: "3 items have 0 sales in 30 days",
    detail: "Brown Sugar 1kg and 2 other items have had zero customer transactions this month.",
    productId: "P004",
    productName: "Brown Sugar 1kg",
    prompt: "Which items have no sales in the last 30 days?",
  },
];

export default function AlertCards({
  onAskCopilot = () => {},
  onReorder = () => {},
}) {
  const { alerts, loading } = useAlerts();
  const rawItems = (!loading && alerts.length > 0) ? alerts : DEMO_ALERTS;

  const items = rawItems.map((a, idx) => ({
    ...a,
    productId: a.productId || a.product_id || (idx === 0 ? "P002" : idx === 1 ? "P014" : "P004"),
    productName: a.productName || a.title || "Product",
    prompt: a.prompt || `Tell me about the alert: ${a.title}`,
  }));

  return (
    <section className="fade-up-d1 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-heading">
            Proactive Attention Alerts
          </h2>
          <span className="text-[11px] font-mono font-semibold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
            {items.length} Active
          </span>
        </div>
        <button
          onClick={() => onAskCopilot("Summarize all active inventory alerts and what I should do first.")}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 transition cursor-pointer"
        >
          <IconSpark className="w-3.5 h-3.5" />
          Ask Copilot to analyze all →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((alert, i) => {
          const s = STYLE_MAP[alert.type] ?? STYLE_MAP.dead;
          return (
            <div
              key={i}
              id={`alert-card-${alert.type}-${i}`}
              className={`stitch-card ${s.card} p-4.5 rounded-2xl flex flex-col justify-between gap-3 relative overflow-hidden transition-all`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                      {ICON_MAP[alert.type] ?? <IconAlert className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] font-extrabold font-mono tracking-wider px-2 py-0.5 rounded-md border ${s.badge}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
                <p className="font-heading font-bold text-slate-900 dark:text-white text-sm leading-snug">
                  {alert.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {alert.detail}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  id={`alert-action-ask-${i}`}
                  onClick={() => onAskCopilot(alert.prompt)}
                  className="flex-1 text-xs py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <IconSpark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Ask Copilot
                </button>
                {alert.type === "stockout" && (
                  <button
                    id={`alert-action-reorder-${i}`}
                    onClick={() => onReorder({
                      product_id: alert.productId,
                      name: alert.productName,
                      category: "Grocery",
                      quantity_on_hand: 3,
                      reorder_threshold: 15,
                      status: "critical",
                    })}
                    className="text-xs py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <IconCart className="w-3.5 h-3.5" />
                    Reorder PO
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

