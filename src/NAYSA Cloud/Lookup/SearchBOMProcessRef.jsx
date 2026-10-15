import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
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

const emptyFilters = {
  processCode: "",
  processName: "",
  active: "",
};

const columns = [
  { label: "Process Code", key: "processCode", width: "w-[150px]" },
  { label: "Process Name", key: "processName" },
  { label: "Active", key: "active", width: "w-[110px]" },
];

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

const parseRows = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data?.data ??
    "[]";

  let rows = raw;
  if (!Array.isArray(rows)) {
    try {
      rows = JSON.parse(raw || "[]");
    } catch {
      rows = [];
    }
  }

  return (rows || []).map((row) => ({
    ...row,
    processCode: row.processCode ?? row.PROCESS_CODE ?? "",
    processName: row.processName ?? row.PROCESS_NAME ?? "",
    active: row.active ?? row.ACTIVE ?? "",
  }));
};

const SearchBOMProcessRef = ({
  isOpen,
  onClose,
  source,
  title = "Select BOM Process",
  endpoint = "/prodBOMProcess/load",
  enableMultiSelect = false,
  withPagination = false,
}) => {
  const [filters, setFilters] = useState(emptyFilters);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isApplying, setIsApplying] = useState(false);

  const pageSize = withPagination ? 100 : 999999;
  const debouncedFilters = useDebounce(filters, 300);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedRows([]);
    setIsApplying(false);
  }, [isOpen]);

  const {
    data: processList = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["lookupBOMProcess", endpoint],
    queryFn: async () => parseRows(await apiClient.get(endpoint)),
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const filteredRows = useMemo(() => {
    const result = processList.filter((row) =>
      columns.every((column) =>
        String(
          column.key === "active"
            ? row.active === "Y"
              ? "Yes"
              : row.active === "N"
                ? "No"
                : row.active
            : row[column.key] ?? "",
        )
          .toLowerCase()
          .includes(String(debouncedFilters[column.key] || "").toLowerCase()),
      ),
    );

    if (sortConfig.key) {
      result.sort((first, second) => {
        const firstValue = String(first[sortConfig.key] ?? "");
        const secondValue = String(second[sortConfig.key] ?? "");
        return sortConfig.direction === "asc"
          ? firstValue.localeCompare(secondValue, undefined, { numeric: true })
          : secondValue.localeCompare(firstValue, undefined, { numeric: true });
      });
    }

    return result;
  }, [processList, debouncedFilters, sortConfig]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const selectedCodes = useMemo(
    () => new Set(selectedRows.map((row) => String(row.processCode || ""))),
    [selectedRows],
  );
  const allVisibleSelected =
    enableMultiSelect &&
    paginatedRows.length > 0 &&
    paginatedRows.every((row) => selectedCodes.has(String(row.processCode || "")));
  const someVisibleSelected =
    enableMultiSelect &&
    paginatedRows.some((row) => selectedCodes.has(String(row.processCode || "")));

  const handleSort = (key) => {
    setSortConfig((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleRow = (row) => {
    setSelectedRows((previous) => {
      const code = String(row.processCode || "");
      const exists = previous.some(
        (selected) => String(selected.processCode || "") === code,
      );
      return exists
        ? previous.filter((selected) => String(selected.processCode || "") !== code)
        : [...previous, row];
    });
  };

  const toggleVisibleRows = () => {
    setSelectedRows((previous) => {
      const visibleCodes = new Set(
        paginatedRows.map((row) => String(row.processCode || "")),
      );

      if (allVisibleSelected) {
        return previous.filter(
          (row) => !visibleCodes.has(String(row.processCode || "")),
        );
      }

      const existingCodes = new Set(
        previous.map((row) => String(row.processCode || "")),
      );
      return [
        ...previous,
        ...paginatedRows.filter(
          (row) => !existingCodes.has(String(row.processCode || "")),
        ),
      ];
    });
  };

  const selectRow = (row) => {
    if (enableMultiSelect) {
      toggleRow(row);
      return;
    }

    onClose(row, source);
  };

  const applySelectedRows = () => {
    if (!selectedRows.length || isApplying) return;
    setIsApplying(true);
    onClose(selectedRows, source);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
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
              <button type="button" onClick={() => setFilters(emptyFilters)}
                className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-100">
                <FontAwesomeIcon icon={faEraser} /> CLEAR
              </button>
            )}
            <button type="button" onClick={() => refetch()}
              className="p-2 text-slate-400 transition-colors hover:text-blue-600" title="Refresh Data">
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
            </button>
            <button type="button" onClick={() => onClose(null, source)}
              className="p-2 text-slate-400 transition-colors hover:text-red-600" title="Close">
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
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {enableMultiSelect && (
                    <th className="global-lookup-th-ui w-[105px]">
                      <div className="mb-1 flex items-center gap-3">
                        <span className="global-lookup-th-text-ui">Select</span>
                      </div>
                      <label className="flex h-[24px] cursor-pointer select-none items-center gap-2 text-[11px] font-semibold text-slate-600">
                        <input type="checkbox" checked={allVisibleSelected}
                          ref={(element) => {
                            if (element) element.indeterminate = !allVisibleSelected && someVisibleSelected;
                          }}
                          onChange={toggleVisibleRows} className="h-4 w-4 accent-blue-600" />
                        <span>Select All</span>
                      </label>
                    </th>
                  )}

                  {columns.map((column) => (
                    <th key={column.key} className={`global-lookup-th-ui ${column.width || ""}`}>
                      <div onClick={() => handleSort(column.key)}
                        className="group mb-1 flex cursor-pointer items-center gap-3">
                        <span className="global-lookup-th-text-ui">{column.label}</span>
                        <FontAwesomeIcon icon={faSort}
                          className={`mb-1 text-[10px] ${sortConfig.key === column.key ? "text-gray-600" : "opacity-30 group-hover:opacity-100"}`} />
                      </div>
                      <div className="relative">
                        <input type="text" value={filters[column.key]}
                          onChange={(event) => setFilters((previous) => ({ ...previous, [column.key]: event.target.value }))}
                          placeholder="Filter..." className="global-lookup-filter-text-ui" />
                        <FontAwesomeIcon icon={faSearch}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedRows.length ? (
                  paginatedRows.map((row, index) => {
                    const isSelected = selectedCodes.has(String(row.processCode || ""));
                    return (
                      <tr key={row.processCode || index} onClick={() => selectRow(row)}
                        className={`group cursor-pointer transition-colors ${isSelected && enableMultiSelect ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-blue-50"}`}>
                        {enableMultiSelect && (
                          <td className="global-lookup-td-ui" onClick={(event) => event.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleRow(row)}
                              className="h-4 w-4 accent-blue-600" />
                          </td>
                        )}
                        <td className="global-lookup-td-ui font-bold">{row.processCode}</td>
                        <td className="global-lookup-td-ui">{row.processName}</td>
                        <td className="global-lookup-td-ui">{row.active === "Y" ? "Yes" : row.active === "N" ? "No" : row.active}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length + (enableMultiSelect ? 1 : 0)}
                      className="px-4 py-20 text-center text-sm italic text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <span className="global-lookup-footer-records-text-ui">Total Records: {filteredRows.length}</span>
            {enableMultiSelect && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Selected: {selectedRows.length}</span>
            )}
          </div>

          {enableMultiSelect && (
            <button type="button" onClick={applySelectedRows}
              disabled={!selectedRows.length || isApplying}
              className="flex items-center gap-2 rounded-lg bg-[#1e40af] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              <FontAwesomeIcon icon={faCheckSquare} /> Apply Selected
            </button>
          )}

          {withPagination && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
              </button>
              <span className="text-[11px] font-semibold text-slate-600">{currentPage} / {totalPages}</span>
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40">
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

export default SearchBOMProcessRef;
