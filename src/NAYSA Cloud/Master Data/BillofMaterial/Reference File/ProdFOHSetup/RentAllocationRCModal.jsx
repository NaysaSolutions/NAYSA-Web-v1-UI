import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faEraser,
  faSearch,
  faSort,
  faSpinner,
  faSyncAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

const money = (value) => Number(value || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const initialFilters = { rcCode: "", rcName: "", rcType: "" };

const RentAllocationRCModal = ({
  isOpen,
  data = [],
  selectedCodes = [],
  allocatedHourlyRate = 0,
  isLoading = false,
  onSelectionChange,
  onRefresh,
  onApply,
  onClose,
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  useEffect(() => {
    if (isOpen) setFilters(initialFilters);
  }, [isOpen]);

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");
  const rows = useMemo(() => {
    const filtered = data.filter((row) =>
      String(row.rcCode || "").toLowerCase().includes(filters.rcCode.toLowerCase()) &&
      String(row.rcName || "").toLowerCase().includes(filters.rcName.toLowerCase()) &&
      String(row.rcType || "").toLowerCase().includes(filters.rcType.toLowerCase()));

    if (!sortConfig.key) return filtered;
    return [...filtered].sort((left, right) => {
      const result = String(left[sortConfig.key] ?? "").localeCompare(
        String(right[sortConfig.key] ?? ""),
        undefined,
        { numeric: true },
      );
      return sortConfig.direction === "asc" ? result : -result;
    });
  }, [data, filters, sortConfig]);

  const toggleSelection = (rcCode) => {
    onSelectionChange(selectedCodes.includes(rcCode)
      ? selectedCodes.filter((code) => code !== rcCode)
      : [...selectedCodes, rcCode]);
  };

  const handleSort = (key) => setSortConfig((previous) => ({
    key,
    direction: previous.key === key && previous.direction === "asc" ? "desc" : "asc",
  }));

  if (!isOpen) return null;

  const columns = [
    { key: "rcCode", label: "RC Code", width: "w-[130px]" },
    { key: "rcName", label: "Description", width: "min-w-[260px]" },
    { key: "rcType", label: "Type", width: "w-[110px]" },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="relative flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100">
          <div className="flex items-center gap-2 pl-3">
            <h2 className="global-lookup-headertext-ui">Select Responsibility Centers</h2>
            {isLoading && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" /></span>}
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button type="button" onClick={() => setFilters(initialFilters)} className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100">
                <FontAwesomeIcon icon={faEraser} />CLEAR
              </button>
            )}
            <button type="button" onClick={onRefresh} className="p-2 text-slate-400 transition-colors hover:text-blue-600" title="Refresh Data">
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isLoading} />
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 transition-colors hover:text-red-600" title="Close">
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-auto bg-white">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm font-medium">Loading...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  <th className="global-lookup-th-ui w-[52px] text-center">
                    <span className="global-lookup-th-text-ui">Select</span>
                  </th>
                  {columns.map((column) => (
                    <th key={column.key} className={`global-lookup-th-ui ${column.width}`}>
                      <div onClick={() => handleSort(column.key)} className="group mb-1 flex cursor-pointer items-center gap-3">
                        <span className="global-lookup-th-text-ui">{column.label}</span>
                        <FontAwesomeIcon icon={faSort} className={`mb-2 text-[10px] ${sortConfig.key === column.key ? "text-gray-600" : "opacity-30 group-hover:opacity-100"}`} />
                      </div>
                      <div className="relative">
                        <input type="text" value={filters[column.key]} onChange={(event) => setFilters((previous) => ({ ...previous, [column.key]: event.target.value }))} placeholder="Filter..." className="global-lookup-filter-text-ui" />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                      </div>
                    </th>
                  ))}
                  <th className="global-lookup-th-ui w-[150px] text-right">
                    <span className="global-lookup-th-text-ui">Std Hourly Rate</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length ? rows.map((row, index) => {
                  const checked = selectedCodes.includes(row.rcCode);
                  return (
                    <tr key={row.rcCode || index} onClick={() => toggleSelection(row.rcCode)} className="group cursor-pointer transition-colors hover:bg-blue-50">
                      <td className="global-lookup-td-ui text-center"><input type="checkbox" checked={checked} onChange={() => toggleSelection(row.rcCode)} onClick={(event) => event.stopPropagation()} className="h-4 w-4 cursor-pointer accent-blue-600" /></td>
                      <td className="global-lookup-td-ui font-bold">{row.rcCode}</td>
                      <td className="global-lookup-td-ui">{row.rcName}</td>
                      <td className="global-lookup-td-ui">{row.rcType}</td>
                      <td className="global-lookup-td-ui text-right tabular-nums">{checked ? money(allocatedHourlyRate) : "0.00"}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} className="px-4 py-20 text-center text-sm italic text-slate-400">No matching records found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] text-slate-500">{selectedCodes.length} selected • {rows.length} record(s)</span>
          <button type="button" onClick={onApply} className="global-tran-tab-footer-button-add-ui">
            <FontAwesomeIcon icon={faCheck} className="mr-2" />Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default RentAllocationRCModal;
