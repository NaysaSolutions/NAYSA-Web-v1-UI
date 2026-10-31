import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faEraser, faSearch, faSort, faSpinner, faSyncAlt, faTimes } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const PositionLookupModal = ({ isOpen, onClose, title = "Search Position Code", withPagination = false, multiSelect = false, selectedPositions = [] }) => {
  const [filters, setFilters] = useState({ posCode: "", posName: "" });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [tempSelected, setTempSelected] = useState([]);
  const pageSize = withPagination ? 100 : 999999;
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");
  const debouncedFilters = useDebounce(filters, 300);

  useEffect(() => setCurrentPage(1), [debouncedFilters]);
  useEffect(() => {
    if (isOpen && multiSelect) setTempSelected(Array.isArray(selectedPositions) ? selectedPositions : []);
  }, [isOpen, multiSelect, selectedPositions]);

  const { data: positions = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["lookupPosition"],
    queryFn: async () => {
      const { data: result } = await apiClient.get("/user-positions/lookup");
      const rawData = result?.data?.[0]?.result || "[]";
      return Array.isArray(rawData) ? rawData : JSON.parse(rawData);
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const filteredAndSorted = useMemo(() => {
    const result = positions.filter((item) =>
      String(item.posCode || "").toLowerCase().includes(debouncedFilters.posCode.toLowerCase()) &&
      String(item.posName || "").toLowerCase().includes(debouncedFilters.posName.toLowerCase()),
    );
    if (sortConfig.key) {
      result.sort((a, b) => {
        const first = String(a[sortConfig.key] ?? "");
        const second = String(b[sortConfig.key] ?? "");
        return sortConfig.direction === "asc"
          ? first.localeCompare(second, undefined, { numeric: true })
          : second.localeCompare(first, undefined, { numeric: true });
      });
    }
    return result;
  }, [positions, debouncedFilters, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const handleSort = (key) => setSortConfig((previous) => ({ key, direction: previous.key === key && previous.direction === "asc" ? "desc" : "asc" }));
  const togglePosition = (posCode) => setTempSelected((current) => current.includes(posCode) ? current.filter((code) => code !== posCode) : [...current, posCode]);
  const filteredCodes = filteredAndSorted.map((position) => position.posCode);
  const allFilteredSelected = filteredCodes.length > 0 && filteredCodes.every((code) => tempSelected.includes(code));
  const toggleAll = () => setTempSelected((current) => allFilteredSelected
    ? current.filter((code) => !filteredCodes.includes(code))
    : Array.from(new Set([...current, ...filteredCodes])));
  const applySelection = () => onClose(positions.filter((position) => tempSelected.includes(position.posCode)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">{title}</h2>
            {isFetching && <div className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"/></div>}
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && <button onClick={() => setFilters({ posCode: "", posName: "" })} className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faEraser}/> CLEAR</button>}
            {isFetching && <span className="text-[9px] text-blue-500 animate-pulse font-bold uppercase">Syncing...</span>}
            <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Refresh Data"><FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching}/></button>
            <button onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><FontAwesomeIcon icon={faTimes} size="lg"/></button>
          </div>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {isLoading ? <div className="flex flex-col items-center justify-center h-64 text-slate-400"><FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500"/><p className="text-sm font-medium">Loading...</p></div> : (
            <table className="min-w-full border-separate border-spacing-0 table-fixed">
              <thead className="sticky top-0 z-10 bg-slate-200"><tr>
                {multiSelect && <th className="global-lookup-th-ui w-[58px] text-center"><div className="flex flex-col items-center gap-1"><span className="global-lookup-th-text-ui">Select</span><input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="h-4 w-4 cursor-pointer accent-blue-600"/></div></th>}
                {[{ label: "Position Code", key: "posCode", width: "w-[140px]" }, { label: "Position Name", key: "posName" }].map((column) => (
                  <th key={column.key} className={`global-lookup-th-ui ${column.width || ""}`}>
                    <div onClick={() => handleSort(column.key)} className="flex items-center gap-3 cursor-pointer group mb-1"><span className="global-lookup-th-text-ui">{column.label}</span><FontAwesomeIcon icon={faSort} className={`mb-1 text-[10px] ${sortConfig.key === column.key ? "text-gray-600" : "opacity-30 group-hover:opacity-100"}`}/></div>
                    <div className="relative"><input type="text" value={filters[column.key]} onChange={(event) => setFilters((previous) => ({ ...previous, [column.key]: event.target.value }))} placeholder="Filter..." className="global-lookup-filter-text-ui"/><FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"/></div>
                  </th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length ? paginatedData.map((position, index) => {
                  const checked = tempSelected.includes(position.posCode);
                  return <tr key={position.posCode || index} onClick={() => multiSelect ? togglePosition(position.posCode) : onClose(position)} className={`group cursor-pointer transition-colors hover:bg-blue-50 ${checked ? "bg-blue-50/50" : ""}`}>
                    {multiSelect && <td className="global-lookup-td-ui text-center"><input type="checkbox" checked={checked} onChange={() => {}} className="h-4 w-4 cursor-pointer accent-blue-600"/></td>}
                    <td className="global-lookup-td-ui font-bold">{position.posCode}</td><td className="global-lookup-td-ui">{position.posName}</td>
                  </tr>;
                }) : <tr><td colSpan={multiSelect ? 3 : 2} className="px-4 py-20 text-center text-slate-400 italic text-sm">No matching records found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui">
          <div className="flex items-center gap-4"><span className="global-lookup-footer-records-text-ui">Total Records: {filteredAndSorted.length}</span>{multiSelect && <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Selected: {tempSelected.length}</span>}</div>
          <div className="flex items-center gap-3">
          {withPagination && totalPages > 1 && <div className="flex items-center gap-2"><button onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1} className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"><FontAwesomeIcon icon={faChevronLeft} className="text-[10px]"/></button><span className="text-[11px] font-semibold text-slate-600">{currentPage} / {totalPages}</span><button onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"><FontAwesomeIcon icon={faChevronRight} className="text-[10px]"/></button></div>}
          {multiSelect && <button type="button" onClick={applySelection} className="rounded-md bg-blue-600 px-4 py-2 text-[11px] font-semibold text-white hover:bg-blue-700">Apply Selection</button>}
          </div>
        </div>
      </div>
      <style jsx="true">{`.animate-fade-in{animation:fadeIn .15s ease-out forwards}.animate-scale-in{animation:scaleIn .2s cubic-bezier(.16,1,.3,1)}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}.custom-scrollbar::-webkit-scrollbar{width:6px;height:6px}.custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8}`}</style>
    </div>
  );
};

export default PositionLookupModal;
