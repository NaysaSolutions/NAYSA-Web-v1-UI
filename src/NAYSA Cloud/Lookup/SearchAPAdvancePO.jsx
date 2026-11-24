import { useEffect, useMemo, useRef, useState } from "react";
import { formatNumber } from "../Global/behavior.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";

export default function APAdvancePOLookupModal({ rows, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const dialogRef = useRef(null);
  const filteredRows = useMemo(() => rows.filter(row =>
    row.poNo.toLowerCase().includes(search.trim().toLowerCase()),
  ), [rows, search]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.querySelector("input")?.focus();
    return () => previousFocus?.focus?.();
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
    if (event.key === "Tab") {
      const controls = [...dialogRef.current.querySelectorAll("button, input")];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="apv-ca-po-title"
        onKeyDown={handleKeyDown}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <h2 id="apv-ca-po-title" className="global-lookup-headertext-ui pl-3">Search AP Advances PO No.</h2>
          <button type="button" onClick={onClose} aria-label="Close PO lookup"
            className="p-2 text-slate-400 hover:text-red-600">
            <FontAwesomeIcon icon={faXmark} size="lg" />
          </button>
        </div>
        <div className="overflow-auto custom-scrollbar bg-white">
          <table className="min-w-full border-separate border-spacing-0 table-fixed">
            <thead className="sticky top-0 bg-slate-200">
              <tr><th className="global-lookup-th-ui">
                <div className="global-lookup-th-text-ui mb-1">PO No.</div>
                <div className="relative">
                  <input type="text" aria-label="Filter PO No." value={search}
                    onChange={event => setSearch(event.target.value)} placeholder="Filter..."
                    className="global-lookup-filter-text-ui" />
                  <FontAwesomeIcon icon={faMagnifyingGlass}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                </div>
              </th><th className="global-lookup-th-ui text-right"><span className="global-lookup-th-text-ui">Balance</span></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(row => (
                <tr key={row.groupId} className="hover:bg-blue-50 cursor-pointer" onClick={() => onSelect(row)}>
                  <td className="global-lookup-td-ui font-bold">
                    <button type="button" className="w-full text-left">{row.poNo}</button>
                  </td>
                  <td className="global-lookup-td-ui text-right whitespace-nowrap">
                    {formatNumber(row.balance)}
                  </td>
                </tr>
              ))}
              {!filteredRows.length && <tr><td colSpan={2} className="px-4 py-12 text-center text-slate-400 italic text-sm">No matching records found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="global-lookup-footer-records-div-ui">
          <span className="global-lookup-footer-records-text-ui">Total Records: {filteredRows.length}</span>
        </div>
      </div>
    </div>
  );
}
