import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faSearch, faSort, faSpinner, faSyncAlt, faTimes } from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { formatNumber } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useformatToDatev2 } from "@/NAYSA Cloud/Global/dates.js";

const columns = [
  { label: "BOQ No.", key: "boqNo", width: "w-[125px]" },
  { label: "BOQ Date", key: "boqDate", width: "w-[115px]", date: true },
  { label: "Project Code", key: "projCode", width: "w-[140px]" },
  { label: "Project Name", key: "projName", width: "w-[260px]" },
  { label: "Customer Name", key: "custName", width: "w-[220px]" },
  { label: "JO No.", key: "joNo", width: "w-[125px]" },
  { label: "Open Lines", key: "openLines", width: "w-[100px]", number: true },
  { label: "Total Amount", key: "totalAmount", width: "w-[140px]", amount: true },
];

const emptyFilters = columns.reduce((result, column) => ({ ...result, [column.key]: "" }), {});

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
};

const displayValue = (row, column) => {
  const value = row?.[column.key];
  if (column.date) return value ? useformatToDatev2(value) : "";
  if (column.amount) return formatNumber(value || 0, 2);
  return value ?? "";
};

const SearchProjectBOQ = ({ isOpen, branchCode, onClose }) => {
  const [filters, setFilters] = useState(emptyFilters);
  const [sortConfig, setSortConfig] = useState({ key: "boqNo", direction: "desc" });
  const debouncedFilters = useDebounce(filters, 300);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["lookupOpenPRJBOQ", branchCode],
    queryFn: async () => {
      const response = await apiClient.get("/lookupOpenPRJBOQ", { params: { branchCode } });
      const raw = response?.data?.data?.[0]?.result ?? "[]";
      return Array.isArray(raw) ? raw : JSON.parse(raw);
    },
    enabled: isOpen && Boolean(branchCode),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });

  const filteredRows = useMemo(() => {
    const result = rows.filter((row) => columns.every((column) =>
      String(displayValue(row, column)).toLowerCase().includes(String(debouncedFilters[column.key] || "").toLowerCase())
    ));
    return [...result].sort((first, second) => {
      const comparison = String(first?.[sortConfig.key] ?? "").localeCompare(String(second?.[sortConfig.key] ?? ""), undefined, { numeric: true });
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [debouncedFilters, rows, sortConfig]);

  const handleSort = (key) => setSortConfig((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="relative flex max-h-[85vh] w-full max-w-7xl transform flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">Select Open Bill of Quantity</h2>
            {isFetching && <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />}
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && <button type="button" onClick={() => setFilters(emptyFilters)} className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100"><FontAwesomeIcon icon={faEraser} /> CLEAR</button>}
            <button type="button" onClick={() => refetch()} className="p-2 text-slate-400 hover:text-blue-600" title="Refresh Data"><FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} /></button>
            <button type="button" onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-red-600" title="Close"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
          </div>
        </div>
        <div className="custom-scrollbar flex-grow overflow-auto bg-white">
          {isLoading ? <div className="flex h-64 flex-col items-center justify-center text-slate-400"><FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" /><p className="text-sm font-medium">Loading open Bill of Quantity records...</p></div> : (
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200"><tr>{columns.map((column) => <th key={column.key} className={`global-lookup-th-ui ${column.width}`}><div onClick={() => handleSort(column.key)} className="group mb-1 flex cursor-pointer items-center gap-3"><span className="global-lookup-th-text-ui">{column.label}</span><FontAwesomeIcon icon={faSort} className={`mb-1 text-[10px] ${sortConfig.key === column.key ? "text-gray-600" : "opacity-30 group-hover:opacity-100"}`} /></div><div className="relative"><input type="text" value={filters[column.key]} onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))} placeholder="Filter..." className="global-lookup-filter-text-ui" /><FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" /></div></th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length ? filteredRows.map((row) => <tr key={row.boqId || row.boqNo} onClick={() => onClose(row)} className="cursor-pointer transition-colors hover:bg-blue-50">{columns.map((column) => <td key={column.key} className={`global-lookup-td-ui ${column.key === "boqNo" ? "font-bold" : ""} ${column.amount || column.number ? "text-right" : ""}`}>{displayValue(row, column)}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-20 text-center text-sm italic text-slate-400">No open Bill of Quantity records found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
        <div className="global-lookup-footer-records-div-ui"><span className="global-lookup-footer-records-text-ui">Total Records: {filteredRows.length}</span></div>
      </div>
    </div>
  );
};

export default SearchProjectBOQ;
