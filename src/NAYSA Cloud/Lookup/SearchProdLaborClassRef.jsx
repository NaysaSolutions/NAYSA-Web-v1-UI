import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
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
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const SearchProdLaborClassRef = ({
  isOpen,
  onClose,
  source,
  title = "Select Designation",
  withPagination = false,
}) => {
  const [filters, setFilters] = useState({
    positionCode: "",
    positionName: "",
  });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = withPagination ? 100 : 999999;
  const debouncedFilters = useDebounce(filters, 300);
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  const {
    data: positionList = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["prodFOHPositionList"],
    queryFn: async () => parseResult(await apiClient.get("/prodFOHSetup/load")),
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  const filteredAndSorted = useMemo(() => {
    const rows = positionList.filter(
      (position) =>
        String(position.active || "Y").toUpperCase() === "Y" &&
        String(position.positionCode || "")
          .toLowerCase()
          .includes(debouncedFilters.positionCode.toLowerCase()) &&
        String(position.positionName || "")
          .toLowerCase()
          .includes(debouncedFilters.positionName.toLowerCase()),
    );

    if (!sortConfig.key) return rows;

    return [...rows].sort((first, second) => {
      const firstValue = String(first[sortConfig.key] ?? "");
      const secondValue = String(second[sortConfig.key] ?? "");
      return sortConfig.direction === "asc"
        ? firstValue.localeCompare(secondValue, undefined, { numeric: true })
        : secondValue.localeCompare(firstValue, undefined, { numeric: true });
    });
  }, [positionList, debouncedFilters, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;

  const resetFilters = () =>
    setFilters({
      positionCode: "",
      positionName: "",
    });

  const handleSort = (key) => {
    setSortConfig((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleApply = (position) => {
    onClose(position, source);
    resetFilters();
  };

  if (!isOpen) return null;

  const columns = [
    { label: "Position Code", key: "positionCode", width: "w-[170px]" },
    { label: "Position Name", key: "positionName", width: "w-[360px]" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transform animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100">
          <div className="flex items-center gap-2 pl-3">
            <h2 className="global-lookup-headertext-ui">{title}</h2>
            {isFetching && (
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-100"
              >
                <FontAwesomeIcon icon={faEraser} />
                CLEAR
              </button>
            )}
            {isFetching && (
              <span className="mt-0.5 flex animate-pulse items-center gap-1 text-[9px] font-bold uppercase text-blue-500">
                <span className="h-1 w-1 rounded-full bg-blue-500" />
                Syncing...
              </span>
            )}
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 text-slate-400 transition-colors hover:text-blue-600"
              title="Refresh Data"
            >
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
            </button>
            <button
              type="button"
              onClick={() => onClose(null, source)}
              className="p-2 text-slate-400 transition-colors hover:text-red-600"
            >
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
                  {columns.map((column) => (
                    <th key={column.key} className={`global-lookup-th-ui ${column.width}`}>
                      <div
                        onClick={() => handleSort(column.key)}
                        className="group mb-1 flex cursor-pointer items-center gap-3"
                      >
                        <span className="global-lookup-th-text-ui">{column.label}</span>
                        <FontAwesomeIcon
                          icon={faSort}
                          className={`mb-2 text-[10px] ${
                            sortConfig.key === column.key
                              ? "text-gray-600"
                              : "opacity-30 group-hover:opacity-100"
                          }`}
                        />
                      </div>
                      <div className="relative">
                        <input
                          value={filters[column.key]}
                          onChange={(event) =>
                            setFilters((previous) => ({
                              ...previous,
                              [column.key]: event.target.value,
                            }))
                          }
                          placeholder="Filter..."
                          className="global-lookup-filter-text-ui"
                        />
                        <FontAwesomeIcon
                          icon={faSearch}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length ? (
                  paginatedData.map((position, index) => (
                    <tr
                      key={position.positionCode || index}
                      onClick={() => handleApply(position)}
                      className="group cursor-pointer transition-colors hover:bg-blue-50"
                    >
                      <td className="global-lookup-td-ui font-bold">{position.positionCode}</td>
                      <td className="global-lookup-td-ui">{position.positionName}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-20 text-center text-sm italic text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui">
          <span className="global-lookup-footer-records-text-ui">
            Total Records: {filteredAndSorted.length}
          </span>
          {withPagination && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
              </button>
              <span className="text-[11px] font-semibold text-slate-600">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((previous) => Math.min(previous + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default SearchProdLaborClassRef;
