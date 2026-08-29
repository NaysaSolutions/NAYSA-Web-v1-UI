import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faSearch, faSort, faTimes } from "@fortawesome/free-solid-svg-icons";
import { formatNumber } from "../Global/behavior.jsx";

const RequiredUomLookupModal = ({
  isOpen,
  data = [],
  onClose,
  title = "Select Required UOM",
  decimalPlaces = 2,
}) => {
  const [filters, setFilters] = useState({ uomCode: "", convQty: "", baseUomCode: "" });
  const [sortConfig, setSortConfig] = useState({ key: "seqNo", direction: "asc" });

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  const filteredRows = useMemo(() => {
    const rows = data.filter((item) =>
      Object.entries(filters).every(([key, value]) =>
        String(item[key] ?? "").toLowerCase().includes(value.toLowerCase())
      )
    );

    return [...rows].sort((left, right) => {
      const leftValue = left[sortConfig.key] ?? "";
      const rightValue = right[sortConfig.key] ?? "";
      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
      });
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [data, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (!isOpen) return null;

  const columns = [
    { key: "uomCode", label: "UOM Code" },
    { key: "convQty", label: "Conversion Factor" },
    { key: "baseUomCode", label: "Base UOM" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transform animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">{title}</h2>
          </div>

          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setFilters({ uomCode: "", convQty: "", baseUomCode: "" })}
                className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-100"
              >
                <FontAwesomeIcon icon={faEraser} />
                CLEAR
              </button>
            )}

            <button
              type="button"
              onClick={() => onClose(null)}
              className="p-2 text-slate-400 transition-colors hover:text-red-600"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto bg-white custom-scrollbar">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-slate-200">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="global-lookup-th-ui">
                    <div
                      onClick={() => handleSort(column.key)}
                      className="mb-1 flex cursor-pointer items-center gap-3 group"
                    >
                      <span className="global-lookup-th-text-ui">{column.label}</span>
                      <FontAwesomeIcon
                        icon={faSort}
                        className={`mb-1 text-[10px] ${
                          sortConfig.key === column.key
                            ? "text-gray-600"
                            : "opacity-30 group-hover:opacity-100"
                        }`}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={filters[column.key]}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
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
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr
                    key={row.itemUomConvId || row.uomCode}
                    onClick={() => onClose(row)}
                    className="cursor-pointer transition-colors hover:bg-blue-50"
                  >
                    <td className="global-lookup-td-ui font-bold">{row.uomCode}</td>
                    <td className="global-lookup-td-ui text-right">
                      {formatNumber(row.convQty || 0, decimalPlaces)}
                    </td>
                    <td className="global-lookup-td-ui">{row.baseUomCode}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-4 py-20 text-center text-sm italic text-slate-400">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="global-lookup-footer-records-div-ui">
          <span className="global-lookup-footer-records-text-ui">
            Total Records: {filteredRows.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RequiredUomLookupModal;
