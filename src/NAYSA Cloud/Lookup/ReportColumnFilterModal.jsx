import React from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faTimes } from "@fortawesome/free-solid-svg-icons";
import { filterKind, isFilterActive, describeColumnFilter } from "./reportColumnFilters.mjs";

export default function ReportColumnFilterModal({ filterEditor, setFilterEditor, filters, setFilters, onApplied }) {
return filterEditor ? createPortal(
          <div className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/30 p-4 print:hidden" onClick={() => setFilterEditor(null)}>
            <form role="dialog" aria-modal="true" aria-label="Column filter" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape") setFilterEditor(null); }} onSubmit={(event) => {
              event.preventDefault();
              const { column, operator, value, endValue } = filterEditor;
              const multi = filterKind(column) === "text" && ["contains", "notContains"].includes(operator) && Array.isArray(filterEditor.values);
              if (multi && filterEditor.values.some((item) => !String(item).trim())) {
                setFilterEditor((prev) => ({ ...prev, error: "Complete each value or remove the empty row." })); return;
              }
              if (!["blank", "notBlank"].includes(operator) && (!String(value).trim() || (operator === "between" && !String(endValue).trim()))) {
                setFilterEditor((prev) => ({ ...prev, error: "Enter the required filter values." })); return;
              }
              if (operator === "between" && (filterKind(column) === "number" ? Number(value) > Number(endValue) : value > endValue)) {
                setFilterEditor((prev) => ({ ...prev, error: "Starting value must not exceed ending value." })); return;
              }
              setFilters((prev) => ({ ...prev, [column.key]: { operator, value: multi ? filterEditor.values[0] : value, endValue, ...(multi ? { values: filterEditor.values, match: filterEditor.match || "any" } : {}) } })); onApplied?.(); setFilterEditor(null);
            }} className="w-full max-w-sm max-h-[85vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b bg-blue-50 px-3 py-2.5"><h3 className="text-sm font-semibold text-blue-800"><FontAwesomeIcon icon={faFilter} className="mr-2" />{filterEditor.column.label || filterEditor.column.key}</h3><button type="button" aria-label="Close filter" onClick={() => setFilterEditor(null)} className="p-1 text-slate-500"><FontAwesomeIcon icon={faTimes} /></button></div>
              <div className="space-y-2.5 p-3">
                {isFilterActive(filters[filterEditor.column.key]) && <div className="rounded-md bg-blue-50 px-2.5 py-2"><div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">Applied filter</div><p className="break-words text-xs leading-4 text-blue-900">{describeColumnFilter(filters[filterEditor.column.key])}</p></div>}
                <label className="block text-xs font-medium text-slate-600">Condition<select autoFocus value={filterEditor.operator} onChange={(event) => setFilterEditor((prev) => ({ ...prev, operator: event.target.value, error: "" }))} className="mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs">
                  {(filterKind(filterEditor.column) === "text" ? [["contains", "Contains"], ["notContains", "Does not contain"], ["equals", "Equals"], ["notEquals", "Does not equal"], ["startsWith", "Starts with"], ["endsWith", "Ends with"]] : [["equals", filterKind(filterEditor.column) === "date" ? "On date" : "Equals"], ["notEquals", "Does not equal"], ["greater", filterKind(filterEditor.column) === "date" ? "After" : "Greater than"], ["greaterEqual", "Greater than or equal"], ["less", filterKind(filterEditor.column) === "date" ? "Before" : "Less than"], ["lessEqual", "Less than or equal"], ["between", "Between (inclusive)"]]).concat([["blank", "Blank"], ["notBlank", "Not blank"]]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
                {filterKind(filterEditor.column) === "text" && ["contains", "notContains"].includes(filterEditor.operator) ? <div className="space-y-2">
                  {(filterEditor.values || [filterEditor.value]).map((value, index, list) => <div key={index} className="flex items-center gap-2"><span className="w-4 shrink-0 text-center text-[10px] text-slate-400">{index + 1}</span><label className="flex-1"><input aria-label={`Filter value ${index + 1}`} placeholder="Enter value" required value={value} onChange={(event) => setFilterEditor((prev) => { const values = [...(prev.values || [prev.value])]; values[index] = event.target.value; return { ...prev, values, value: values[0], error: "" }; })} className="mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-xs" /></label><button type="button" aria-label={`Remove value ${index + 1}`} disabled={list.length === 1} onClick={() => setFilterEditor((prev) => { const values = (prev.values || [prev.value]).filter((_, i) => i !== index); return { ...prev, values, value: values[0], error: "" }; })} className="h-8 rounded border border-slate-200 px-2 text-slate-500 disabled:opacity-30"><FontAwesomeIcon icon={faTimes} /></button></div>)}
                  <button type="button" onClick={() => setFilterEditor((prev) => ({ ...prev, values: [...(prev.values || [prev.value]), ""], error: "" }))} className="text-xs font-medium text-blue-600">+ Add Value</button>
                  {filterEditor.operator === "contains" ? <label className="block text-xs text-slate-600">Match<select value={filterEditor.match || "any"} onChange={(event) => setFilterEditor((prev) => ({ ...prev, match: event.target.value }))} className="mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2"><option value="any">Any value (OR)</option><option value="all">All values (AND)</option></select></label> : <p className="text-xs text-slate-500">Exclude rows containing any of these values.</p>}
                </div> : !["blank", "notBlank"].includes(filterEditor.operator) && <label className="block text-xs font-medium text-slate-600">{filterEditor.operator === "between" ? "Starting value" : "Value"}<input required type={filterKind(filterEditor.column) === "date" ? "date" : filterKind(filterEditor.column) === "number" ? "number" : "text"} step="any" value={filterEditor.value} onChange={(event) => setFilterEditor((prev) => ({ ...prev, value: event.target.value, error: "" }))} className="mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-xs" /></label>}
                {filterEditor.operator === "between" && <label className="block text-xs font-medium text-slate-600">Ending value<input required type={filterKind(filterEditor.column) === "date" ? "date" : "number"} step="any" value={filterEditor.endValue} onChange={(event) => setFilterEditor((prev) => ({ ...prev, endValue: event.target.value, error: "" }))} className="mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-xs" /></label>}
                {filterEditor.error && <p role="alert" className="text-xs text-red-600">{filterEditor.error}</p>}
              </div>
              <div className="flex justify-between border-t bg-slate-50 px-3 py-2.5"><button type="button" onClick={() => { setFilters((prev) => { const next = { ...prev }; delete next[filterEditor.column.key]; return next; }); onApplied?.(); setFilterEditor(null); }} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600">Clear Filter</button><button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white">Apply</button></div>
            </form>
          </div>, document.body) : null;
}
