import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

const views = [
  { key: "details", label: "Transaction Details", icon: faClipboardList },
  { key: "summary", label: "Transaction Summary", icon: faClockRotateLeft },
];

const FOHTransactionPanel = ({ title, detailTitle, headerFields = [], columns = [], initialRows = 3, totalLabel = "Total", emptyMessage, isActive = false, isEditing = false, onViewChange, addVersion = 0, resetVersion = 0 }) => {
  const [activeView, setActiveView] = useState("details");
  const initialValues = useMemo(() => Object.fromEntries(headerFields.map((field) => [field.key, field.defaultValue ?? ""])), [headerFields]);
  const [values, setValues] = useState(initialValues);
  const rows = useMemo(() => Array.from({ length: initialRows }, (_, index) => ({ lineNo: index + 1 })), [initialRows]);
  useEffect(() => {
    if (isActive) onViewChange?.(activeView);
  }, [activeView, isActive, onViewChange]);

  useEffect(() => {
    if (resetVersion > 0 && isActive && activeView === "details") setValues(initialValues);
  }, [resetVersion]);

  useEffect(() => {
    if (addVersion > 0 && isActive && activeView === "details") setValues(initialValues);
  }, [addVersion]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 sm:flex-row sm:items-center dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
        <div className="flex flex-wrap gap-0">
          {views.map((view) => (
            <button key={view.key} type="button" onClick={() => setActiveView(view.key)} className={`relative inline-flex items-center gap-2 border px-5 py-3 text-xs font-semibold transition-colors ${activeView === view.key ? "-mb-px rounded-t-lg border-b-white border-slate-200 bg-white text-blue-700 shadow-[inset_0_2px_0_0_#2563eb] dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-900 dark:text-blue-300" : "border-transparent text-slate-500 hover:bg-blue-50/60 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
              <FontAwesomeIcon icon={view.icon} className="text-[11px]" />{view.label}
            </button>
          ))}
        </div>
      </div>

      <div className={activeView === "details" ? "block" : "hidden"}>
        <div className="border-b border-slate-200 p-5 dark:border-slate-700">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-5 w-1 rounded-full bg-blue-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {headerFields.map((field) => field.type === "textarea" ? (
              <div key={field.key} className={field.className || "md:col-span-2 xl:col-span-4"}>
                <div className="relative"><textarea id={`${field.key}-remarks`} rows={3} value={values[field.key] || ""} disabled={!isEditing || field.disabled} onChange={(event) => setValues((previous) => ({ ...previous, [field.key]: event.target.value }))} className="peer global-tran-textbox-remarks-ui w-full pt-3 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" /><label htmlFor={`${field.key}-remarks`} className="global-tran-floating-label-remarks">{field.label}</label></div>
              </div>
            ) : (
              <div key={field.key} className={field.className || ""}>
                <FieldRenderer id={field.key} label={field.label} type={field.type || "text"} value={values[field.key]} required={field.required} readOnly={field.readOnly} disabled={!isEditing || field.disabled} allowLookupInput={field.allowLookupInput} hideClearButton onLookup={() => {}} onChange={(value) => setValues((previous) => ({ ...previous, [field.key]: value }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-5 w-1 rounded-full bg-blue-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{detailTitle}</h2>
          </div>
          {columns.length ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[850px] border-collapse text-xs">
                <thead><tr className="bg-blue-100 text-slate-800 dark:bg-blue-950 dark:text-slate-100">{columns.map((column) => <th key={column.key} style={{ width: column.width }} className={`border-b border-r border-blue-200 px-3 py-2 font-semibold last:border-r-0 dark:border-blue-900 ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"}`}>{column.label}</th>)}</tr></thead>
                <tbody>{rows.map((row) => <tr key={row.lineNo} className="h-9 border-b border-slate-100 last:border-b-0 dark:border-slate-800">{columns.map((column) => <td key={column.key} className={`border-r border-slate-100 px-3 py-2 last:border-r-0 dark:border-slate-800 ${column.align === "right" ? "text-right tabular-nums" : column.align === "center" ? "text-center" : "text-left"}`}>{column.key === "lineNo" ? row.lineNo : column.numeric ? "0.00" : ""}</td>)}</tr>)}</tbody>
                <tfoot><tr className="border-t border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/50"><td colSpan={Math.max(columns.length - 1, 1)} className="px-3 py-2 text-right font-semibold">{totalLabel}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">0.00</td></tr></tfoot>
              </table>
            </div>
          ) : <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30 px-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/20">{emptyMessage}</div>}
        </div>
      </div>

      <div className={activeView === "summary" ? "block" : "hidden"}><div className="p-5"><div className="mb-4 flex items-center gap-3"><span className="h-5 w-1 rounded-full bg-blue-600" aria-hidden="true" /><h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title} Summary</h2></div><div className="flex min-h-[460px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/20">Summary table layout is reserved. Records will load only after Find is implemented.</div></div></div>
    </section>
  );
};

export default FOHTransactionPanel;
