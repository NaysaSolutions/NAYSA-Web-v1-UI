

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSort,
  faSortUp,
  faSortDown,
  faSpinner,
  faBroom,
  faEraser,
} from "@fortawesome/free-solid-svg-icons";
import { formatNumber } from "../Global/behavior";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const GlobalLookupModalv1 = ({
  isOpen,
  onClose,
  onCancel,
  endpoint,
  data,
  title,
  btnCaption,
  singleSelect =false,
}) => {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState([]); // selection order preserved by push/remove
  const [filters, setFilters] = useState({});
  const [columnConfig, setColumnConfig] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Column order + widths
  const [columnOrder, setColumnOrder] = useState([]);
  const [colWidths, setColWidths] = useState({});
  const dragKeyRef = useRef(null);

  // Resizing
  const resizingRef = useRef({ key: null, startX: 0, startWidth: 0 });

  // Bottom scrollbar (source of truth for horizontal scroll)
  const bottomXRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Keyboard nav
  const modalKeyScopeRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const rowRefs = useRef([]);
  const [highlightIndex, setHighlightIndex] = useState(0);

  // =========================
  // Persistence (localStorage)
  // =========================
  const persistKey = useMemo(() => {
    const t = String(title || "").trim();
    if (t) return `GlobalLookupModalv1:${t}`;

    // fallback to endpoint signature
    if (Array.isArray(endpoint) && endpoint.length) {
      const sig = endpoint
        .map((c) => `${c.key}:${c.label ?? ""}:${c.hidden ? 1 : 0}`)
        .join("|");
      return `GlobalLookupModalv1:endpoint:${sig}`;
    }

    return "GlobalLookupModalv1:default";
  }, [title, endpoint]);

  const safeParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // Load persisted preferences when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const raw = localStorage.getItem(persistKey);
    const saved = raw ? safeParse(raw) : null;

    if (saved?.columnOrder && Array.isArray(saved.columnOrder)) {
      setColumnOrder(saved.columnOrder);
    }
    if (saved?.colWidths && typeof saved.colWidths === "object") {
      setColWidths(saved.colWidths);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, persistKey]);

  // Save preferences (debounced)
  useEffect(() => {
    if (!isOpen) return;

    const id = setTimeout(() => {
      const payload = {
        columnOrder,
        colWidths,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(persistKey, JSON.stringify(payload));
    }, 250);

    return () => clearTimeout(id);
  }, [isOpen, persistKey, columnOrder, colWidths]);

  // =========================
  // Helpers
  // =========================
  const renderValue = (column, value, decimal = 2) => {
    if (!value && value !== 0) return "";
    switch (column.renderType) {
      case "number": {
        const digits = parseInt(decimal, 10);
        const safeDecimal = Number.isNaN(digits) ? 2 : digits;
        return formatNumber(value, safeDecimal);
      }
      case "date": {
        const date = new Date(value);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }
      default:
        return value;
    }
  };

  const handleFilterChange = (e, key) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    setCurrentPage(1);
    setHighlightIndex(0);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
    setHighlightIndex(0);
  };

  const clearSelection = () => {
    setSelected([]);
  };

  const handleSort = (key, sortable = true) => {
    if (!sortable) return;
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
    setCurrentPage(1);
    setHighlightIndex(0);
  };

  const renderSortIcon = (colKey) => {
    if (sortConfig.key === colKey) {
      return sortConfig.direction === "asc" ? (
        <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" />
      ) : (
        <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />
      );
    }
    return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
  };

  const toggleSelect = (row) => {
    setSelected((prev) => {
      const exists = prev.some((s) => s.groupId === row.groupId);

       if (singleSelect) {
      return exists ? [] : [row];
    }

      if (exists) {
        // remove (keeps other selection order)
        return prev.filter((s) => s.groupId !== row.groupId);
      }
      // append to end => selection order preserved
      return [...prev, row];
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (prev.length === filtered.length) return [];
      // select all in current filtered order
      return [...filtered];
    });
  };

  // ✅ returns selection order
  const handleGetSelected = () => {
    const payload = {
      data: selected.map((item) => item.groupId), // in selection order
      records: selected, // optional: full records in selection order
    };
    onClose(payload);
  };

  const handleNextPage = () => {
    setCurrentPage((p) => p + 1);
    setHighlightIndex(0);
  };
  const handlePrevPage = () => {
    setCurrentPage((p) => p - 1);
    setHighlightIndex(0);
  };

  // =========================
  // Auto width (measure)
  // =========================
  const measureTextWidth = useCallback((text, font = "12px Arial") => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    return ctx.measureText(String(text ?? "")).width;
  }, []);

  const computeAutoWidths = useCallback(
    (cols, rows) => {
      const sample = rows?.slice(0, 200) || [];
      const next = {};
      const bodyFont = "12px Arial";
      const headerFont = "12px Arial";

      cols.forEach((col) => {
        if (col.hidden) return;

        const headerW = measureTextWidth(col.label ?? col.key ?? "", headerFont);
        let maxW = headerW;

        for (let i = 0; i < sample.length; i++) {
          const raw = sample[i]?.[col.key];
          const display = renderValue(col, raw, Number(col.roundingOff));
          const w = measureTextWidth(display, bodyFont);
          if (w > maxW) maxW = w;
        }

        const padded = maxW + 32 + 18; // padding + sort icon
        next[col.key] = clamp(Math.ceil(padded), 90, 520);
      });

      return next;
    },
    [measureTextWidth]
  );

  // =========================
  // Column reorder
  // =========================
  const visibleCols = useMemo(
    () => columnConfig.filter((c) => !c.hidden),
    [columnConfig]
  );

  const orderedVisibleCols = useMemo(() => {
    if (!columnOrder?.length) return visibleCols;

    const byKey = new Map(visibleCols.map((c) => [c.key, c]));
    const ordered = columnOrder.map((k) => byKey.get(k)).filter(Boolean);

    visibleCols.forEach((c) => {
      if (!columnOrder.includes(c.key)) ordered.push(c);
    });

    return ordered;
  }, [visibleCols, columnOrder]);

  const onDragStartHeader = (colKey) => {
    dragKeyRef.current = colKey;
  };
  const onDragOverHeader = (e) => e.preventDefault();
  const onDropHeader = (targetKey) => {
    const sourceKey = dragKeyRef.current;
    dragKeyRef.current = null;
    if (!sourceKey || sourceKey === targetKey) return;

    setColumnOrder((prev) => {
      const base = prev?.length ? [...prev] : visibleCols.map((c) => c.key);
      const srcIdx = base.indexOf(sourceKey);
      const tgtIdx = base.indexOf(targetKey);
      if (srcIdx === -1 || tgtIdx === -1) return base;

      base.splice(srcIdx, 1);
      base.splice(tgtIdx, 0, sourceKey);
      return base;
    });
  };

  // =========================
  // Column resize
  // =========================
  const onResizeMove = useCallback((e) => {
    const { key, startX, startWidth } = resizingRef.current;
    if (!key) return;

    const delta = e.clientX - startX;
    const nextW = clamp(startWidth + delta, 70, 900);
    setColWidths((prev) => ({ ...prev, [key]: nextW }));
  }, []);

  const stopResize = useCallback(() => {
    resizingRef.current = { key: null, startX: 0, startWidth: 0 };
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", stopResize);
  }, [onResizeMove]);

  const startResize = (e, key) => {
    e.preventDefault();
    e.stopPropagation();

    const auto = computeAutoWidths(columnConfig, records);
    const startWidth = colWidths?.[key] ?? auto?.[key] ?? 150;

    resizingRef.current = { key, startX: e.clientX, startWidth };

    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", stopResize);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [onResizeMove, stopResize]);

  // =========================
  // Data load/reset
  // =========================
  useEffect(() => {
    if (!isOpen) {
      setRecords([]);
      setFiltered([]);
      setSelected([]);
      setFilters({});
      setColumnConfig([]);
      setSortConfig({ key: "", direction: "asc" });
      setCurrentPage(1);
      setScrollLeft(0);
      setHighlightIndex(0);
      rowRefs.current = [];
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        if (endpoint) setColumnConfig(endpoint);
        if (data) setRecords(data);
      } catch (error) {
        console.error("Failed to fetch record:", error);
        setRecords([]);
        setColumnConfig([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data, endpoint, isOpen]);

  // init widths (auto for missing keys; keep persisted/user widths)
  useEffect(() => {
    if (!isOpen) return;
    if (!columnConfig?.length) return;

    // if no order yet, default to visible columns
    setColumnOrder((prev) => (prev?.length ? prev : visibleCols.map((c) => c.key)));

    // set auto widths for missing keys only
    const auto = computeAutoWidths(columnConfig, records);
    setColWidths((prev) => ({ ...auto, ...prev }));
  }, [isOpen, columnConfig, records, computeAutoWidths, visibleCols]);

  // filter/sort
  useEffect(() => {
    let currentFiltered = [...records];

    currentFiltered = currentFiltered.filter((item) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const itemValue = String(item[key] ?? "").toLowerCase().replace(/,/g, "");
        const filterValue = String(value).toLowerCase().replace(/,/g, "");
        return itemValue.includes(filterValue);
      })
    );

    if (sortConfig?.key) {
      currentFiltered.sort((a, b) => {
        const aValue = String(a[sortConfig.key] ?? "").toLowerCase();
        const bValue = String(b[sortConfig.key] ?? "").toLowerCase();
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFiltered(currentFiltered);
  }, [records, filters, sortConfig]);

  // =========================
  // sizing + horizontal scroll
  // =========================
  const selectColWidth = 70;

  const tableMinWidth = useMemo(() => {
    const sum = orderedVisibleCols.reduce(
      (acc, c) => acc + (colWidths[c.key] || 150),
      0
    );
    return sum + selectColWidth;
  }, [orderedVisibleCols, colWidths]);

  // keep bottom scrollbar in sync when scrollLeft changes
  useEffect(() => {
    const el = bottomXRef.current;
    if (!el) return;
    if (Math.abs(el.scrollLeft - scrollLeft) > 1) el.scrollLeft = scrollLeft;
  }, [scrollLeft]);

  // reset horizontal scroll if width/page changes
  useEffect(() => {
    if (!isOpen) return;
    setScrollLeft(0);
    if (bottomXRef.current) bottomXRef.current.scrollLeft = 0;
  }, [tableMinWidth, isOpen, currentPage]);

  // pagination info
  const totalItems = filtered.length;
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  // =========================
  // Keyboard navigation
  // =========================
  useEffect(() => {
    if (!isOpen) return;

    // auto focus modal for key events
    const t = setTimeout(() => {
      modalKeyScopeRef.current?.focus?.();
    }, 0);

    return () => clearTimeout(t);
  }, [isOpen]);

  // keep highlight within bounds when data changes
  useEffect(() => {
    const max = Math.max(0, paginatedData.length - 1);
    setHighlightIndex((i) => clamp(i, 0, max));
    rowRefs.current = [];
  }, [paginatedData.length, currentPage]);

  // scroll highlighted row into view
  useEffect(() => {
    const el = rowRefs.current?.[highlightIndex];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const onKeyDown = (e) => {
    if (!isOpen) return;

    // avoid hijacking typing in filter inputs
    const tag = (e.target?.tagName || "").toLowerCase();
    const isTyping =
      tag === "input" || tag === "textarea" || e.target?.isContentEditable;
    if (isTyping) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => clamp(i + 1, 0, Math.max(0, paginatedData.length - 1)));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => clamp(i - 1, 0, Math.max(0, paginatedData.length - 1)));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const row = paginatedData[highlightIndex];
      if (row) toggleSelect(row);
      return;
    }
  };

  // =========================
  // Render guards
  // =========================
  if (!isOpen) return null;

  // height tuning (space for header area + bottom bar + footer)
  const BODY_MAX_H = "calc(90vh - 270px)";

  // shared “viewport” and “track”
  const viewportStyle = { overflow: "hidden", width: "100%" };
  const trackStyle = {
    width: tableMinWidth,
    transform: `translateX(${-scrollLeft}px)`,
    willChange: "transform",
  };

  const getColW = (key) => colWidths[key] || 150;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in"
      onKeyDown={onKeyDown}
    >
      <div
        ref={modalKeyScopeRef}
        tabIndex={0}
        className="bg-white rounded-lg shadow-xl w-full max-w-8xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in outline-none"
        role="dialog"
        aria-modal="true"
      >
        {/* Close */}
        <button
          onClick={() => onCancel?.()}
          className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
          aria-label="Close modal"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">
          {title}
        </h2>

        <div className="flex-grow overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              {/* =========================
                  FROZEN HEADER (ALWAYS VISIBLE)
                 ========================= */}
              <div className="border-b border-gray-200 bg-gray-100">
                <div style={viewportStyle}>
                  <div style={trackStyle}>
                    <table className="w-full divide-y divide-gray-100">
                      <thead>
                        <tr className="bg-gray-100">
                          {!singleSelect && (
                            <th
                              className="px-2 py-2 text-center text-xs font-bold text-blue-900"
                              style={{ width: selectColWidth, minWidth: selectColWidth }}
                            >
                              Select
                            </th>
                          )}

                          {orderedVisibleCols.map((column) => {
                            const w = getColW(column.key);
                            const sortable = column.sortable !== false;

                            return (
                              <th
                                key={column.key}
                                draggable
                                onDragStart={() => onDragStartHeader(column.key)}
                                onDragOver={onDragOverHeader}
                                onDrop={() => onDropHeader(column.key)}
                                onClick={() => handleSort(column.key, sortable)}
                                className={`relative px-4 py-2 text-xs font-bold text-blue-900 bg-gray-100 ${
                                  column.className || ""
                                } ${sortable ? "cursor-pointer" : "cursor-default"}`}
                                style={{ width: w, minWidth: 70, maxWidth: 900 }}
                                title="Drag to reorder columns"
                              >
                                <div className="flex items-center gap-1 whitespace-nowrap select-none">
                                  {column.label} {renderSortIcon(column.key)}
                                </div>

                                {/* Resize handle */}
                                <div
                                  onMouseDown={(e) => startResize(e, column.key)}
                                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  title="Drag to resize"
                                />
                              </th>
                            );
                          })}
                        </tr>

                        {/* Filter row */}
                        <tr className="bg-white">       
                          {!singleSelect && (                  
                            <td
                              className="bg-white"
                              style={{ width: selectColWidth, minWidth: selectColWidth }}
                            />
                          )}
                          {orderedVisibleCols.map((column) => {
                            const w = getColW(column.key);
                            return (
                              <td
                                key={column.key}
                                className="px-2 py-1 bg-white"
                                style={{ width: w, minWidth: 70, maxWidth: 900 }}
                              >
                                <input
                                  type="text"
                                  value={filters[column.key] || ""}
                                  onChange={(e) => handleFilterChange(e, column.key)}
                                  className="w-full border rounded px-2 py-1 text-xs"
                                  placeholder="Filter..."
                                />
                              </td>
                            );
                          })}
                        </tr>
                      </thead>
                    </table>
                  </div>
                </div>
              </div>

              {/* =========================
                  BODY (VERTICAL SCROLL ALWAYS VISIBLE)
                 ========================= */}
              <div
                ref={bodyScrollRef}
                className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar bg-white"
                style={{ maxHeight: BODY_MAX_H }}
              >
                <div style={viewportStyle}>
                  <div style={trackStyle}>
                    <table className="w-full divide-y divide-gray-100">
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.length > 0 ? (
                          paginatedData.map((row, idx) => {
                            const isHighlighted = idx === highlightIndex;
                            const isChecked = selected.some(
                              (s) => s.groupId === row.groupId
                            );

                            return (
                              <tr
                                key={idx}
                                ref={(el) => (rowRefs.current[idx] = el)}
                                className={`text-xs ${
                                  isChecked  ? "bg-blue-100" : "hover:bg-blue-30"
                                }`}
                                onMouseEnter={() => setHighlightIndex(idx)}
                                onDoubleClick={() => {
                                    if (singleSelect) {
                                      setSelected([row]);
                                      handleGetSelected();
                                    } else {
                                      
                                      toggleSelect(row);
                                    }
                                  }}
                                onClick={() => {
                                  if (singleSelect) toggleSelect(row);
                                }}

                              >
                                {!singleSelect && (
                                    <td
                                      className="px-2 py-1 text-center"
                                      style={{ width: selectColWidth, minWidth: selectColWidth }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleSelect(row)}
                                        className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                      />
                                    </td>
                                )}

                                {orderedVisibleCols.map((column) => {
                                  const w = getColW(column.key);
                                  const cellValue = renderValue(
                                    column,
                                    row[column.key],
                                    Number(column.roundingOff)
                                  );

                                  return (
                                    <td
                                      key={column.key}
                                      className={`px-4 py-1 ${column.classNames || ""} truncate`}
                                      style={{ width: w, minWidth: 70, maxWidth: 900 }}
                                      title={String(cellValue ?? "")}
                                    >
                                      {cellValue}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={orderedVisibleCols.length + 1}
                              className="px-4 py-6 text-center text-gray-500 text-lg"
                            >
                              No matching records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* =========================
                  ALWAYS-VISIBLE HORIZONTAL SCROLLBAR (BOTTOM)
                 ========================= */}
              <div
                ref={bottomXRef}
                className="overflow-x-auto overflow-y-hidden border-t border-gray-200 bg-white"
                onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
              >
                <div style={{ width: tableMinWidth, height: 14 }} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-600">
          <div className="flex items-center gap-3 flex-wrap">
            {!singleSelect && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Select All
              </label>
            )}


            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              title="Clear all filters"
            >
              <FontAwesomeIcon icon={faBroom} className="mr-2" />
              Clear Filters
            </button>
            
            {!singleSelect && (
              <button
                type="button"
                onClick={clearSelection}
                disabled={selected.length === 0}
                className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
                title="Clear selection"
              >
                <FontAwesomeIcon icon={faEraser} className="mr-2" />
                Clear Selection
              </button>
             )}
           
           
            {!singleSelect && (
              <div className="font-semibold text-gray-700">
                Selected: {selected.length}
              </div>
            )}


            <button
              onClick={handleGetSelected}
              disabled={selected.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              title="Enter also toggles selection for highlighted row"
            >
              {btnCaption}
            </button>
          </div>

          <div className="font-semibold">
            Showing {totalItems ? startItem : 0}-{endItem} of {totalItems} entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={endItem >= totalItems}
              className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Small keyboard hint (optional) */}
        <div className="px-4 pb-3 text-[11px] text-gray-400">
          Keyboard: ↑↓ to move, Enter to select/unselect, Esc to close.
        </div>
      </div>
    </div>
  );
};

export default GlobalLookupModalv1;


