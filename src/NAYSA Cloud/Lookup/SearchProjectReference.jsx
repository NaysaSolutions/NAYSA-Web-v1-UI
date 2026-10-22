import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faSearch, faSort, faTimes } from "@fortawesome/free-solid-svg-icons";

const SearchProjectReference = ({ isOpen, onClose, title, rows, codeKey, nameKey, codeLabel, nameLabel }) => {
  const [codeFilter, setCodeFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: codeKey, direction: "asc" });

  const filteredRows = useMemo(() => {
    const result = rows.filter((row) =>
      String(row?.[codeKey] || "").toLowerCase().includes(codeFilter.toLowerCase()) &&
      String(row?.[nameKey] || "").toLowerCase().includes(nameFilter.toLowerCase())
    );

    return [...result].sort((first, second) => {
      const comparison = String(first?.[sortConfig.key] || "").localeCompare(
        String(second?.[sortConfig.key] || ""),
        undefined,
        { numeric: true },
      );
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [codeFilter, codeKey, nameFilter, nameKey, rows, sortConfig]);

  const handleSort = (key) => setSortConfig((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));

  const clearFilters = () => {
    setCodeFilter("");
    setNameFilter("");
  };

  const close = (row = null) => {
    clearFilters();
    onClose(row);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="relative flex max-h-[60vh] w-full max-w-lg transform flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b bg-slate-100 p-2">
          <h2 className="pl-2 text-md font-bold tracking-tight text-blue-800">{title}</h2>
          <div className="flex items-center gap-2">
            {(codeFilter || nameFilter) && (
              <button type="button" onClick={clearFilters} className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-100">
                <FontAwesomeIcon icon={faEraser} /> CLEAR
              </button>
            )}
            <button type="button" className="p-2 text-slate-400 transition-colors hover:text-red-600" onClick={() => close()} title="Close">
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>
        <div className="custom-scrollbar flex-grow overflow-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-slate-200">
              <tr>
                {[
                  { key: codeKey, label: codeLabel, value: codeFilter, setValue: setCodeFilter },
                  { key: nameKey, label: nameLabel, value: nameFilter, setValue: setNameFilter },
                ].map((column) => (
                  <th key={column.key} className="border-b border-slate-200 px-4 py-2 text-left">
                    <div onClick={() => handleSort(column.key)} className="group mb-1.5 flex cursor-pointer items-center gap-1">
                      <span className="mb-1 block text-[12px] font-bold text-slate-600">{column.label}</span>
                      <FontAwesomeIcon icon={faSort} className={`text-[9px] ${sortConfig.key === column.key ? "text-blue-500" : "opacity-20"}`} />
                    </div>
                    <div className="relative">
                      <input value={column.value} onChange={(event) => column.setValue(event.target.value)} placeholder="Filter..." className="w-full rounded border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs font-normal outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                      <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-300" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length ? filteredRows.map((row, index) => (
                <tr key={`${row?.[codeKey]}-${index}`} onClick={() => close(row)} className="cursor-pointer hover:bg-blue-50">
                  <td className="w-[180px] px-4 py-2 text-xs font-bold text-slate-600">{row?.[codeKey]}</td>
                  <td className="px-4 py-2 text-xs font-medium text-slate-600">{row?.[nameKey]}</td>
                </tr>
              )) : <tr><td colSpan={2} className="px-4 py-16 text-center text-sm italic text-slate-400">No matching records found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t bg-slate-50 p-3 px-4 text-[12px] font-medium text-slate-500">Total Records: {filteredRows.length}</div>
      </div>
    </div>
  );
};

SearchProjectReference.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(PropTypes.object),
  codeKey: PropTypes.string.isRequired,
  nameKey: PropTypes.string.isRequired,
  codeLabel: PropTypes.string.isRequired,
  nameLabel: PropTypes.string.isRequired,
};

SearchProjectReference.defaultProps = { rows: [] };

export default SearchProjectReference;
