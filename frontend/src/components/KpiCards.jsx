import { IconBox, IconAlert, IconTrend, IconShield } from "./Icons";

export default function KpiCards({
  totalProducts = 20,
  criticalCount = 4,
  lowStockCount = 2,
  onSelectFilter = () => {},
  activeStatus = "all",
}) {
  const inStockRate = totalProducts > 0
    ? (((totalProducts - criticalCount - lowStockCount) / totalProducts) * 100).toFixed(1)
    : "94.8";

  const cards = [
    {
      id: "kpi-total-products",
      filterKey: "all",
      label: "Tracked Products",
      value: `${totalProducts} items`,
      subtext: "100% active catalog",
      icon: <IconBox className="w-5 h-5" />,
      colorClass: "kpi-indigo",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60",
      pillClass: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/60",
      pillText: "All Active",
      delay: "fade-up",
    },
    {
      id: "kpi-critical-stock",
      filterKey: "critical",
      label: "Critical Stock",
      value: `${criticalCount} items`,
      subtext: "Immediate action required",
      icon: <IconAlert className="w-5 h-5" />,
      colorClass: "kpi-rose",
      iconBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/60",
      pillClass: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
      pillText: "Action Needed",
      delay: "fade-up-d1",
    },
    {
      id: "kpi-low-stock",
      filterKey: "low",
      label: "Low Stock Buffer",
      value: `${lowStockCount} items`,
      subtext: "Approaching threshold",
      icon: <IconTrend className="w-5 h-5" />,
      colorClass: "kpi-amber",
      iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/60",
      pillClass: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
      pillText: "Monitor closely",
      delay: "fade-up-d2",
    },
    {
      id: "kpi-store-health",
      filterKey: "ok",
      label: "Inventory Health",
      value: `${inStockRate}%`,
      subtext: "+2.4% vs last week",
      icon: <IconShield className="w-5 h-5" />,
      colorClass: "kpi-emerald",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60",
      pillClass: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
      pillText: "Healthy",
      delay: "fade-up-d3",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const isSelected = activeStatus === card.filterKey && card.filterKey !== "ok";
        return (
          <button
            key={card.id}
            id={card.id}
            onClick={() => onSelectFilter(card.filterKey)}
            className={`stitch-card ${card.colorClass} ${card.delay} p-5 text-left flex flex-col justify-between gap-3 cursor-pointer group rounded-2xl relative overflow-hidden transition-all dark:bg-slate-900/80 dark:border-slate-800 ${
              isSelected ? "ring-2 ring-indigo-500 border-transparent shadow-md" : ""
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
                {card.label}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg} transition-transform group-hover:scale-110`}>
                {card.icon}
              </div>
            </div>

            <div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white leading-tight">
                {card.value}
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.subtext}</span>
                <span className={`text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full border ${card.pillClass}`}>
                  {card.pillText}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

