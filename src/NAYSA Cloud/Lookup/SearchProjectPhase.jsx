import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEraser,
  faSearch,
  faSort,
  faSpinner,
  faSyncAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result ?? "[]";
  if (Array.isArray(raw)) return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const SearchProjectPhase = ({ isOpen, onClose, title = "Select Project Phase" }) => {
  const [filters, setFilters] = useState({ phaseCode: "", phaseDesc: "" });
  const [sortConfig, setSortConfig] = useState({ key: "phaseCode", direction: "asc" });
  const debouncedFilters = useDebounce(filters, 300);

  const { data: phaseList = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["lookupPRJPhaseRef"],
    queryFn: async () => parseResult(await apiClient.get("/lookupPRJPhaseRef")),
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const filteredRows = useMemo(() => {
    const rows = phaseList.filter((row) =>
      String(row.phaseCode || "").toLowerCase().includes(debouncedFilters.phaseCode.toLowerCase()) &&
      String(row.phaseDesc || "").toLowerCase().includes(debouncedFilters.phaseDesc.toLowerCase())
    );

    return [...rows].sort((first, second) => {
      const firstValue = String(first[sortConfig.key] || "");
      const secondValue = String(second[sortConfig.key] || "");
      const comparison = firstValue.localeCompare(secondValue, undefined, { numeric: true });
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [debouncedFilters, phaseList, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleClose = (row = null) => {
    setFilters({ phaseCode: "", phaseDesc: "" });
    onClose(row);
  };

  if (!isOpen) return null;

  const hasFilters = filters.phaseCode || filters.phaseDesc;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="relative flex max-h-[60vh] w-full max-w-lg transform flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b bg-slate-100 p-2">
          <div className="flex items-center gap-2 pl-3">
            <h2 className="pl-2 text-md font-bold tracking-tight text-blue-800">{title}</h2>
            {isFetching && <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />}
          </div>

          <div className="flex items-center gap-1">
            {hasFilters && (
              <button type="button" onClick={() => setFilters({ phaseCode: "", phaseDesc: "" })} className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100">
                <FontAwesomeIcon icon={faEraser} /> CLEAR
              </button>
            )}
            <button type="button" onClick={() => refetch()} className="p-2 text-slate-400 transition-colors hover:text-blue-600" title="Refresh Data">
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
            </button>
            <button type="button" onClick={() => handleClose()} className="p-2 text-slate-400 transition-colors hover:text-red-600" title="Close">
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex-grow overflow-auto bg-white">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm font-medium">Loading...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    { key: "phaseCode", label: "Phase Code" },
                    { key: "phaseDesc", label: "Phase Name" },
                  ].map((column) => (
                    <th key={column.key} className="border-b border-slate-200 px-4 py-2 text-left">
                      <div onClick={() => handleSort(column.key)} className="group mb-1.5 flex cursor-pointer items-center gap-1">
                        <span className="mb-1 block text-[12px] font-bold text-slate-600">{column.label}</span>
                        <FontAwesomeIcon icon={faSort} className={`text-[9px] ${sortConfig.key === column.key ? "text-blue-500" : "opacity-20"}`} />
                      </div>
                      <div className="relative">
                        <input
                          value={filters[column.key]}
                          onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                          placeholder="Filter..."
                          className="w-full rounded border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs font-normal outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-300" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.length ? filteredRows.map((row, index) => (
                  <tr key={`${row.phaseCode}-${index}`} onClick={() => handleClose(row)} className="group cursor-pointer transition-colors hover:bg-blue-50">
                    <td className="w-[180px] px-4 py-2 text-xs font-bold text-slate-600">{row.phaseCode}</td>
                    <td className="px-4 py-2 text-xs font-medium text-slate-600">{row.phaseDesc}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={2} className="px-4 py-16 text-center text-sm italic text-slate-400">No matching records found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t bg-slate-50 p-3 px-4 text-[12px] font-medium text-slate-500">
          Total Records: {filteredRows.length}
        </div>
      </div>
    </div>
  );
};

SearchProjectPhase.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
};

export default SearchProjectPhase;
