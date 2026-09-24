import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSpinner,
  faSearch,
  faEraser,
  faCheckSquare,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const EMPTY_SELECTED_ITEMS = [];

const WarehouseLookupModal = ({
  isOpen,
  onClose,
  filter = "ActiveAll",
  branchCode = "",
  invType = "",
  enableMultiSelect = false,
  onGetSelectedItems,
  selectedItems: externalSelectedItems = EMPTY_SELECTED_ITEMS,
  allowEmptySelection = false,
}) => {
  const [warehouse, setWarehouse] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ whCode: "", whName: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [internalSelectedItems, setInternalSelectedItems] = useState([]);

  const selectedItems = internalSelectedItems;
  const hasActiveFilters = Object.values(filters).some((val) => val !== "");
  const resetFilters = () => setFilters({ whCode: "", whName: "", address: "" });

  const getRowKey = (row) => String(row?.whCode || row?.code || "");

  const selectedKeys = useMemo(
    () => new Set((selectedItems || []).map((row) => getRowKey(row)).filter(Boolean)),
    [selectedItems],
  );

  useEffect(() => {
    if (!isOpen) {
      setWarehouse([]);
      setFiltered([]);
      setFilters({ whCode: "", whName: "", address: "" });
      setInternalSelectedItems([]);
      return;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data: result } = await apiClient.get("warehouse/lookupWarehouse", {
          params: { filter, branchCode, invType },
        });

      

        const rows =
          Array.isArray(result?.data) && result.data[0]?.result
            ? JSON.parse(result.data[0].result)
            : [];

        if (!alive) return;
        setWarehouse(rows);
        setFiltered(rows);
      } catch (err) {
        console.error("Failed to fetch warehouse:", err);
        if (!alive) return;
        setWarehouse([]);
        setFiltered([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, filter, branchCode, invType]);

  useEffect(() => {
    if (!isOpen || !enableMultiSelect) return;

    const nextSelectedItems = Array.isArray(externalSelectedItems)
      ? externalSelectedItems
      : EMPTY_SELECTED_ITEMS;

    setInternalSelectedItems((currentItems) => {
      const currentKeys = currentItems.map(getRowKey);
      const nextKeys = nextSelectedItems.map(getRowKey);
      const unchanged =
        currentKeys.length === nextKeys.length &&
        currentKeys.every((key, index) => key === nextKeys[index]);

      return unchanged ? currentItems : nextSelectedItems;
    });
  }, [isOpen, enableMultiSelect, externalSelectedItems]);

  useEffect(() => {
    const newFiltered = warehouse.filter((item) => {
      const code = (item.whCode || "").toLowerCase();
      const name = (item.whName || "").toLowerCase();
      const address = (item.address || "").toLowerCase();

      return (
        code.includes((filters.whCode || "").toLowerCase()) &&
        name.includes((filters.whName || "").toLowerCase()) &&
        address.includes((filters.address || "").toLowerCase())
      );
    });

    setFiltered(newFiltered);
  }, [filters, warehouse]);

  const handleApply = (row) => {
    if (enableMultiSelect) return;
    onClose?.(row);
  };

  const handleFilterChange = (e, key) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleToggleWarehouse = (row) => {
    const key = getRowKey(row);
    if (!key) return;

    setInternalSelectedItems((prev) => {
      const exists = prev.some((item) => getRowKey(item) === key);
      return exists
        ? prev.filter((item) => getRowKey(item) !== key)
        : [...prev, row];
    });
  };

  const allVisibleSelected =
    enableMultiSelect &&
    filtered.length > 0 &&
    filtered.every((row) => selectedKeys.has(getRowKey(row)));

  const someVisibleSelected =
    enableMultiSelect &&
    filtered.some((row) => selectedKeys.has(getRowKey(row)));

  const handleSelectAllVisible = () => {
    if (!enableMultiSelect) return;

    setInternalSelectedItems((prev) => {
      const map = new Map(prev.map((row) => [getRowKey(row), row]).filter(([key]) => key));

      if (allVisibleSelected) {
        filtered.forEach((row) => map.delete(getRowKey(row)));
      } else {
        filtered.forEach((row) => {
          const key = getRowKey(row);
          if (key) map.set(key, row);
        });
      }

      return Array.from(map.values());
    });
  };

  const handleGetSelectedItems = () => {
    if (!allowEmptySelection && !selectedItems.length) return;
    const payload = { records: selectedItems };

    if (onGetSelectedItems) {
      onGetSelectedItems(payload);
      return;
    }

    onClose?.(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[760px] max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">
              {enableMultiSelect ? "Select Warehouses" : "Select Warehouse"}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center gap-1.5"
                type="button"
              >
                <FontAwesomeIcon icon={faEraser} />
                CLEAR
              </button>
            )}

            <button
              onClick={() => onClose?.(null)}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              aria-label="Close modal"
              type="button"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm font-medium">Loading warehouse data...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0 table-fixed">
              <colgroup>
                {enableMultiSelect && <col className="w-[90px]" />}
                <col className="w-[140px]" />
                <col className="w-[280px]" />
                <col className="w-auto" />
              </colgroup>

              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {enableMultiSelect && (
                    <th className="global-lookup-th-ui">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="global-lookup-th-text-ui">Select</span>
                      </div>
                      <div className="flex h-[30px] items-center">
                        <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                            }}
                            onChange={handleSelectAllVisible}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span>All</span>
                        </label>
                      </div>
                    </th>
                  )}

                  {[
                    { label: "Warehouse Code", key: "whCode" },
                    { label: "Warehouse Name", key: "whName" },
                    { label: "Address", key: "address" },
                  ].map((col) => (
                    <th key={col.key} className="global-lookup-th-ui">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="global-lookup-th-text-ui">{col.label}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={filters[col.key]}
                          onChange={(e) => handleFilterChange(e, col.key)}
                          placeholder="Filter..."
                          className="global-lookup-filter-text-ui"
                        />
                        <FontAwesomeIcon
                          icon={faSearch}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? (
                  filtered.map((row, index) => {
                    const rowKey = getRowKey(row);
                    const isChecked = selectedKeys.has(rowKey);

                    return (
                      <tr
                        key={rowKey || index}
                        className={`transition-colors ${
                          enableMultiSelect
                            ? isChecked
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-slate-50"
                            : "group hover:bg-blue-50 cursor-pointer"
                        }`}
                        onClick={() => handleApply(row)}
                      >
                        {enableMultiSelect && (
                          <td
                            className="global-lookup-td-ui"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleWarehouse(row)}
                              className="w-4 h-4 accent-blue-600"
                            />
                          </td>
                        )}
                        <td className="global-lookup-td-ui font-bold">{row.whCode}</td>
                        <td className="global-lookup-td-ui">{row.whName}</td>
                        <td className="global-lookup-td-ui whitespace-normal">{row.address}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={3 + (enableMultiSelect ? 1 : 0)}
                      className="px-4 py-20 text-center text-slate-400 italic text-sm"
                    >
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="global-lookup-footer-records-text-ui">
              Total Records: {filtered.length}
            </span>
            {enableMultiSelect && (
              <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">
                Selected: {selectedItems.length}
              </span>
            )}
          </div>

          {enableMultiSelect && (
            <button
              type="button"
              onClick={handleGetSelectedItems}
              className="px-4 py-2 bg-[#1e40af] text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!allowEmptySelection && selectedItems.length === 0}
            >
              <FontAwesomeIcon icon={faCheckSquare} />
              {selectedItems.length === 0 && allowEmptySelection ? "Use All Warehouses" : "Copy Selected"}
            </button>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .custom-scrollbar {
          scrollbar-width: auto;
          scrollbar-color: #cbd5e1 transparent;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 12px; height: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; border: 3px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default WarehouseLookupModal;
