import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faSearch, faSort, faSpinner, faSyncAlt, faTimes } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
};

const VEColorLookupModal = ({ isOpen, onClose, title = "Search Vehicle Color", itemCode = null }) => {
  const [filters, setFilters] = useState({ code: "", description: "" });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const debouncedFilters = useDebounce(filters, 300);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const normalizedItemCode = String(itemCode || "").trim();
  const hasItemFilter = itemCode !== null && itemCode !== undefined;

  const { data: colors = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["lookupVEColor", hasItemFilter ? "matrix" : "master", normalizedItemCode],
    enabled: isOpen && (!hasItemFilter || Boolean(normalizedItemCode)),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (hasItemFilter && !normalizedItemCode) return [];

      const response = hasItemFilter
        ? await apiClient.get("/loadVEColorMatrix", { params: { ITEM_CODE: normalizedItemCode } })
        : await apiClient.get("/veColor");
      const result = response?.data?.data?.[0]?.result || "[]";
      const rows = Array.isArray(result) ? result : JSON.parse(result);

      if (!hasItemFilter) return rows;

      return rows
        .filter((row) => row.value === true || row.value === 1 || String(row.value) === "1")
        .map((row) => ({
          ...row,
          code: row.code ?? row.colorCode ?? "",
          description: row.description ?? row.colorDescription ?? "",
        }));
    },
  });

  const rows = useMemo(() => {
    const filtered = colors.filter((color) =>
      String(color.code || "").toLowerCase().includes(debouncedFilters.code.toLowerCase()) &&
      String(color.description || "").toLowerCase().includes(debouncedFilters.description.toLowerCase())
    );

    if (sortConfig.key) {
      filtered.sort((left, right) => {
        const leftValue = String(left[sortConfig.key] || "");
        const rightValue = String(right[sortConfig.key] || "");
        return sortConfig.direction === "asc"
          ? leftValue.localeCompare(rightValue, undefined, { numeric: true })
          : rightValue.localeCompare(leftValue, undefined, { numeric: true });
      });
    }

    return filtered;
  }, [colors, debouncedFilters, sortConfig]);

  const handleSort = (key) => setSortConfig((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">{title}</h2>
            {isFetching && <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />}
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button onClick={() => setFilters({ code: "", description: "" })} className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center gap-1.5">
                <FontAwesomeIcon icon={faEraser} /> CLEAR
              </button>
            )}
            <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Refresh Data"><FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} /></button>
            <button onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
          </div>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400"><FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" /><p className="text-sm font-medium">Loading...</p></div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0 table-fixed">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    { key: "code", label: "Color Code", width: "w-[140px]" },
                    { key: "description", label: "Color Description", width: "" },
                  ].map((column) => (
                    <th key={column.key} className={`global-lookup-th-ui ${column.width}`}>
                      <div onClick={() => handleSort(column.key)} className="flex items-center gap-3 cursor-pointer group mb-1">
                        <span className="global-lookup-th-text-ui">{column.label}</span>
                        <FontAwesomeIcon icon={faSort} className={`mb-1 text-[10px] ${sortConfig.key === column.key ? "text-gray-600" : "opacity-30 group-hover:opacity-100"}`} />
                      </div>
                      <div className="relative">
                        <input type="text" value={filters[column.key]} onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))} placeholder="Filter..." className="global-lookup-filter-text-ui" />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length ? rows.map((color, index) => (
                  <tr key={color.code || index} onClick={() => onClose(color)} className="group hover:bg-blue-50 cursor-pointer transition-colors">
                    <td className="global-lookup-td-ui font-bold">{color.code}</td>
                    <td className="global-lookup-td-ui">{color.description}</td>
                  </tr>
                )) : <tr><td colSpan="2" className="px-4 py-20 text-center text-slate-400 italic text-sm">No matching records found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui">
          <span className="global-lookup-footer-records-text-ui">Total Records: {rows.length}</span>
        </div>
      </div>
    </div>
  );
};

export default VEColorLookupModal;
