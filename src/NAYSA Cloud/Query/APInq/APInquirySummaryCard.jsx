import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const APInquirySummaryCard = ({ title, icon, accent = "text-blue-600", badge, rows = [] }) => (
  <div className="h-full rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-600">
        {icon && (
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[11px] ${accent}`}>
            <FontAwesomeIcon icon={icon} />
          </span>
        )}
        <span>{title}</span>
      </div>
      {badge && (
        <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
          {badge}
        </span>
      )}
    </div>

    <div className="space-y-2 px-4 pb-3 pt-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-center justify-between gap-4 text-[12px] ${
            row.strong ? "border-t border-slate-100 pt-2 font-bold" : ""
          }`}
        >
          <span className="font-medium text-slate-600">{row.label}</span>
          <span className={`tabular-nums text-right font-semibold ${row.valueClass || (row.strong ? "font-extrabold text-blue-700" : "text-slate-900")}`}>
            {row.value ?? "0.00"}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default APInquirySummaryCard;
