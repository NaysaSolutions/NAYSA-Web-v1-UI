import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Eye, EyeOff, ListX, Pin, PinOff } from "lucide-react";

const MIN_VISIBLE_DATA_COLUMNS = 5;
const TABLE_EDITABLE_CONTROL_SELECTOR =
  "input:not([disabled]), textarea:not([disabled]), select:not([disabled])";

export const transactionActionsHeaderStyle = {
  width: "110px",
  minWidth: "110px",
  maxWidth: "110px",
  zIndex: 25,
  backgroundClip: "padding-box",
  borderLeft: "1px solid rgba(148, 163, 184, 0.45)",
  boxShadow: "-8px 0 14px -12px rgba(15, 23, 42, 0.35)",
  backgroundImage:
    "linear-gradient(to left, rgba(255,255,255,0.10), rgba(255,255,255,0.00))",
};

export const transactionActionsCellStyle = {
  width: "110px",
  minWidth: "110px",
  maxWidth: "110px",
  zIndex: 5,
  backgroundClip: "padding-box",
  borderLeft: "1px solid rgba(148, 163, 184, 0.35)",
  boxShadow: "-8px 0 14px -12px rgba(15, 23, 42, 0.28)",
  backgroundImage:
    "linear-gradient(to left, rgba(148,163,184,0.08), rgba(148,163,184,0.00))",
};

export const useResizableTableColumns = (columns = []) => {
  const [columnWidths, setColumnWidths] = useState({});
  const [columnOrder, setColumnOrder] = useState(() =>
    columns.map((column) => column.key)
  );
  const [sortConfigs, setSortConfigs] = useState([]);
  const [frozenColumnKeys, setFrozenColumnKeys] = useState([]);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState([]);
  const [headerContextMenu, setHeaderContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    key: null,
  });
  const [showColumnVisibilityModal, setShowColumnVisibilityModal] = useState(false);
  const resizingRef = useRef(null);
  const draggedColumnKeyRef = useRef(null);
  const headerContextTableRef = useRef(null);
  const columnMetaMap = useMemo(
    () => new Map(columns.map((column) => [column.key, column])),
    [columns]
  );
  const isActionColumn = useCallback(
    (key) => {
      const column = columnMetaMap.get(key);
      const normalizedKey = String(key ?? "").trim().toLowerCase();
      const normalizedLabel = String(column?.label ?? "").trim().toLowerCase();

      return normalizedKey === "action" || normalizedKey === "actions" || normalizedLabel === "actions";
    },
    [columnMetaMap]
  );

  const handleResizeMove = useCallback((e) => {
    if (!resizingRef.current) return;

    const { startX, startWidth, key, minWidth } = resizingRef.current;
    const delta = e.clientX - startX;
    const nextWidth = Math.max(minWidth, startWidth + delta);

    setColumnWidths((prev) => ({
      ...prev,
      [key]: nextWidth,
    }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    if (!resizingRef.current) return;

    resizingRef.current = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  }, [handleResizeMove]);

  const startResize = useCallback(
    (e, key, minWidth = 60) => {
      e.preventDefault();
      e.stopPropagation();

      const th = e.currentTarget?.parentElement;
      resizingRef.current = {
        key,
        minWidth,
        startX: e.clientX,
        startWidth: th?.offsetWidth || columnWidths[key] || minWidth,
      };

      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
    },
    [columnWidths, handleResizeEnd, handleResizeMove]
  );

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [handleResizeEnd, handleResizeMove]);

  useEffect(() => {
    const nextKeys = columns.map((column) => column.key);

    setColumnOrder((prev) => {
      const preservedKeys = prev.filter((key) => nextKeys.includes(key));
      const newKeys = nextKeys.filter((key) => !preservedKeys.includes(key));
      const mergedKeys = [...preservedKeys, ...newKeys];

      if (
        prev.length === mergedKeys.length &&
        prev.every((key, index) => key === mergedKeys[index])
      ) {
        return prev;
      }

      return mergedKeys;
    });

    setFrozenColumnKeys((prev) => prev.filter((key) => nextKeys.includes(key)));
    setHiddenColumnKeys((prev) =>
      prev.filter((key) => nextKeys.includes(key) && !isActionColumn(key))
    );
    setSortConfigs((prev) => prev.filter((item) => nextKeys.includes(item.key)));
  }, [columns, isActionColumn]);

  useEffect(() => {
    const handleCloseContextMenu = () => {
      setHeaderContextMenu((prev) =>
        prev.visible ? { visible: false, x: 0, y: 0, key: null } : prev
      );
    };

    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        handleCloseContextMenu();
        setShowColumnVisibilityModal(false);
      }
    };

    document.addEventListener("click", handleCloseContextMenu);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("click", handleCloseContextMenu);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  const getColumnWidth = useCallback(
    (key, fallbackWidth) => columnWidths[key] || fallbackWidth,
    [columnWidths]
  );

  const getColumnStyle = useCallback(
    (key, fallbackWidth) => {
      const width = getColumnWidth(key, fallbackWidth);

      return {
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
      };
    },
    [getColumnWidth]
  );

  const reorderColumns = useCallback((fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return;

    setColumnOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(fromKey);
      const toIndex = next.indexOf(toKey);

      if (fromIndex === -1 || toIndex === -1) {
        return prev;
      }

      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromKey);
      return next;
    });
  }, []);

  const toggleFreezeColumn = useCallback((key) => {
    if (!key) return;

    setFrozenColumnKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }

      return [...prev, key];
    });
  }, []);

  const getVisibleDataColumnCount = useCallback(
    () =>
      columns.filter(
        (column) => !isActionColumn(column.key) && !hiddenColumnKeys.includes(column.key)
      ).length,
    [columns, hiddenColumnKeys, isActionColumn]
  );

  const hideColumn = useCallback(
    (key) => {
      if (!key || isActionColumn(key) || hiddenColumnKeys.includes(key)) return;
      if (getVisibleDataColumnCount() <= MIN_VISIBLE_DATA_COLUMNS) return;

      setHiddenColumnKeys((prev) => [...prev, key]);
      setFrozenColumnKeys((prev) => prev.filter((item) => item !== key));
      setSortConfigs((prev) => prev.filter((item) => item.key !== key));
    },
    [getVisibleDataColumnCount, hiddenColumnKeys, isActionColumn]
  );

  const unhideColumn = useCallback(
    (key) => {
      if (!key || isActionColumn(key)) return;
      setHiddenColumnKeys((prev) => prev.filter((item) => item !== key));
    },
    [isActionColumn]
  );

  const toggleColumnVisibility = useCallback(
    (key) => {
      if (!key || isActionColumn(key)) return;

      if (hiddenColumnKeys.includes(key)) {
        unhideColumn(key);
        return;
      }

      hideColumn(key);
    },
    [hiddenColumnKeys, hideColumn, isActionColumn, unhideColumn]
  );

  const toggleSort = useCallback(
    (key) => {
      const column = columnMetaMap.get(key);
      if (column?.sortable === false) return;

      setSortConfigs((prev) => {
        const existing = prev.find((item) => item.key === key);

        if (!existing) {
          return [{ key, direction: "asc" }];
        }

        if (existing.direction === "asc") {
          return [{ key, direction: "desc" }];
        }

        return [];
      });
    },
    [columnMetaMap]
  );

  const clearSort = useCallback((key = null) => {
    setSortConfigs((prev) => {
      if (!key) return [];
      return prev.filter((item) => item.key !== key);
    });
  }, []);

  const clearAllSorting = useCallback(() => {
    setSortConfigs([]);
  }, []);

  const clearZeroValueOnFocus = useCallback(
    (event, options = {}) => {
      const {
        isEditable = true,
        onClear,
        zeroValues = ["0", "0.0", "0.00", "0.000", "0.0000", "0.00000", "0.000000"],
      } = options;

      if (!isEditable) return;

      if (event?.target?.dataset?.skipZeroClearOnce === "true") {
        delete event.target.dataset.skipZeroClearOnce;
        return;
      }

      const rawValue = String(event?.target?.value ?? "").trim();
      if (!rawValue) return;

      const normalizedValue = rawValue.replace(/,/g, "");
      const isZeroValue =
        zeroValues.includes(normalizedValue) ||
        (!Number.isNaN(Number(normalizedValue)) && Number(normalizedValue) === 0);

      if (!isZeroValue) return;

      if (event?.target) {
        event.target.value = "";
      }

      if (typeof onClear === "function") {
        onClear("");
      }
    },
    []
  );

  const focusNextRowInput = useCallback(
    (currentIndex, field, options = {}) => {
      const {
        rows = [],
        zeroClearFields = [],
        parseValue = (value) => {
          const normalizedValue = String(value ?? "").replace(/,/g, "").trim();
          if (!normalizedValue) return "";
          const parsedValue = Number(normalizedValue);
          return Number.isNaN(parsedValue) ? normalizedValue : parsedValue;
        },
        onClearNextValue,
        getTargetId = (nextIndex, nextField) => `${nextField}-${nextIndex}`,
        retryDelays = [80, 220, 600],
      } = options;

      const activeElement = document.activeElement;
      const editableControlSelector =
        "input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled])";
      const activeRow = activeElement?.closest?.("tr");
      const activeCell = activeElement?.closest?.("td,th");
      const activeCellIndex =
        activeRow && activeCell ? Array.from(activeRow.cells).indexOf(activeCell) : -1;
      const nextVisibleRow = activeRow?.nextElementSibling?.matches?.("tr")
        ? activeRow.nextElementSibling
        : null;

      if (activeRow && !nextVisibleRow) {
        requestAnimationFrame(() => activeElement?.focus?.());
        return;
      }

      requestAnimationFrame(() => {
        const targetCell =
          nextVisibleRow && activeCellIndex >= 0
            ? nextVisibleRow.cells[activeCellIndex]
            : null;
        const visibleTarget = targetCell?.querySelector(editableControlSelector);
        const fallbackNextIndex = currentIndex + 1;
        const fallbackRow = rows[fallbackNextIndex];
        const target =
          visibleTarget ||
          (fallbackRow ? document.getElementById(getTargetId(fallbackNextIndex, field)) : null);

        if (!target) {
          activeElement?.focus?.();
          return;
        }

        target?.focus();

        const targetIdIndex = String(target.id || "").match(/-(\d+)$/);
        const nextIndex = targetIdIndex ? Number(targetIdIndex[1]) : fallbackNextIndex;
        const shouldClearZero =
          zeroClearFields.includes(field) ||
          String(target.className || "")
            .split(/\s+/)
            .includes("text-right");

        if (!shouldClearZero) return;

        const clearTargetIfZero = () => {
          const activeTarget = target.id
            ? document.getElementById(target.id)
            : target;
          if (!activeTarget || document.activeElement !== activeTarget) return;

          const parsedValue = parseValue(activeTarget.value);
          if (parsedValue !== 0) return;

          activeTarget.value = "";
          if (typeof onClearNextValue === "function") {
            onClearNextValue(nextIndex, field, "");
          }
        };

        const nextValue = parseValue(target.value);
        if (nextValue === 0 && typeof onClearNextValue === "function") {
          onClearNextValue(nextIndex, field, "");
        }

        clearTargetIfZero();
        retryDelays.forEach((delay) => {
          window.setTimeout(clearTargetIfZero, delay);
        });
      });
    },
    []
  );

  useEffect(() => {
    const isVisibleControl = (control) => {
      if (!control || control.type === "hidden") return false;

      const style = window.getComputedStyle(control);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
      );
    };

    const getFirstFocusableControl = (cell) =>
      Array.from(cell?.querySelectorAll(TABLE_EDITABLE_CONTROL_SELECTOR) || []).find(
        isVisibleControl
      );

    const getTargetControlInRow = (row, startCellIndex, direction) => {
      if (!row || startCellIndex < 0) return null;

      for (
        let cellIndex = startCellIndex;
        cellIndex >= 0 && cellIndex < row.cells.length;
        cellIndex += direction
      ) {
        const target = getFirstFocusableControl(row.cells[cellIndex]);
        if (target) return target;
      }

      return null;
    };

    const shouldKeepHorizontalCaretMovement = (event, control) => {
      if (control.readOnly || control.tagName === "SELECT") return false;
      if (control.tagName === "TEXTAREA") return true;
      if (typeof control.selectionStart !== "number") return false;

      const selectionStart = control.selectionStart;
      const selectionEnd = control.selectionEnd;
      const valueLength = String(control.value || "").length;

      if (selectionStart !== selectionEnd) return true;
      if (event.key === "ArrowLeft") return selectionStart > 0;
      if (event.key === "ArrowRight") return selectionEnd < valueLength;

      return false;
    };

    const handleArrowKeyNavigation = (event) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        return;
      }

      const activeControl = event.target;
      if (!activeControl?.matches?.(TABLE_EDITABLE_CONTROL_SELECTOR)) return;
      if (!isVisibleControl(activeControl)) return;
      if (shouldKeepHorizontalCaretMovement(event, activeControl)) return;

      const activeRow = activeControl.closest("tr");
      const activeCell = activeControl.closest("td,th");
      const activeTable = activeControl.closest("table");
      if (!activeRow || !activeCell || !activeTable) return;

      const activeCellIndex = Array.from(activeRow.cells).indexOf(activeCell);
      let targetControl = null;

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const targetRow =
          event.key === "ArrowUp"
            ? activeRow.previousElementSibling
            : activeRow.nextElementSibling;

        if (targetRow?.matches?.("tr")) {
          targetControl = getTargetControlInRow(targetRow, activeCellIndex, 1);
        }
      } else {
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        targetControl = getTargetControlInRow(
          activeRow,
          activeCellIndex + direction,
          direction
        );
      }

      if (!targetControl) {
        activeControl.focus();
        event.preventDefault();
        return;
      }

      event.preventDefault();
      targetControl.dataset.skipZeroClearOnce = "true";
      targetControl.focus();

      if (
        typeof targetControl.select === "function" &&
        targetControl.tagName !== "SELECT"
      ) {
        targetControl.select();
      }
    };

    document.addEventListener("keydown", handleArrowKeyNavigation);

    return () => {
      document.removeEventListener("keydown", handleArrowKeyNavigation);
    };
  }, []);

  const normalizeSortValue = useCallback((value) => {
    if (value == null) return "";
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;

    const rawString = String(value).trim();
    if (!rawString) return "";

    const normalizedNumericString = rawString.replace(/,/g, "");
    if (/^-?\d+(\.\d+)?$/.test(normalizedNumericString)) {
      return Number(normalizedNumericString);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawString)) {
      const [month, day, year] = rawString.split("/").map(Number);
      const parsedDate = new Date(year, month - 1, day);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.getTime();
      }
    }

    return rawString.toLowerCase();
  }, []);

  const compareSortValues = useCallback(
    (left, right) => {
      const normalizedLeft = normalizeSortValue(left);
      const normalizedRight = normalizeSortValue(right);

      if (normalizedLeft === normalizedRight) return 0;
      if (normalizedLeft === "") return 1;
      if (normalizedRight === "") return -1;

      if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") {
        return normalizedLeft - normalizedRight;
      }

      return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    },
    [normalizeSortValue]
  );

  const getSortedRows = useCallback(
    (rows = [], getSortValue) => {
      if (!sortConfigs.length || !Array.isArray(rows)) {
        return rows;
      }

      return [...rows].sort((left, right) => {
        for (const sortConfig of sortConfigs) {
          const directionMultiplier = sortConfig.direction === "desc" ? -1 : 1;
          const leftValue = getSortValue(left, sortConfig.key);
          const rightValue = getSortValue(right, sortConfig.key);
          const result = compareSortValues(leftValue, rightValue);

          if (result !== 0) {
            return result * directionMultiplier;
          }
        }

        return 0;
      });
    },
    [compareSortValues, sortConfigs]
  );

  const getOrderedColumns = useCallback(
    (inputColumns = columns) => {
      const lookup = new Map(inputColumns.map((column) => [column.key, column]));
      const ordered = columnOrder
        .map((key) => lookup.get(key))
        .filter(Boolean);
      const missing = inputColumns.filter((column) => !columnOrder.includes(column.key));
      const mergedColumns = [...ordered, ...missing].filter(
        (column) => !hiddenColumnKeys.includes(column.key)
      );
      const frozenColumns = mergedColumns.filter((column) =>
        frozenColumnKeys.includes(column.key)
      );
      const unfrozenColumns = mergedColumns.filter(
        (column) => !frozenColumnKeys.includes(column.key)
      );

      return [...frozenColumns, ...unfrozenColumns];
    },
    [columnOrder, columns, frozenColumnKeys, hiddenColumnKeys]
  );

  const getFrozenColumnStyle = useCallback(
    (key, orderedColumns = columns, fallbackWidth = 120, options = {}) => {
      if (!frozenColumnKeys.includes(key)) {
        return {};
      }

      const frozenOrderedColumns = orderedColumns.filter((column) =>
        frozenColumnKeys.includes(column.key)
      );
      const targetIndex = frozenOrderedColumns.findIndex((column) => column.key === key);

      if (targetIndex === -1) {
        return {};
      }

      const isLastFrozenColumn = targetIndex === frozenOrderedColumns.length - 1;

      const leftOffset = frozenOrderedColumns
        .slice(0, targetIndex)
        .reduce((total, column) => total + getColumnWidth(column.key, column.width || fallbackWidth), 0);

      return {
        position: "sticky",
        left: `${leftOffset}px`,
        zIndex: options.isHeader ? 45 : 15,
        backgroundColor:
          options.backgroundColor || (options.isHeader ? "#dbeafe" : "#ffffff"),
        backgroundClip: "padding-box",
        boxShadow: isLastFrozenColumn
          ? "1px 0 0 rgba(148, 163, 184, 0.45)"
          : "none",
      };
    },
    [columns, frozenColumnKeys, getColumnWidth]
  );

  const handleColumnDragStart = useCallback((e, key) => {
    draggedColumnKeyRef.current = key;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", key);
    }
  }, []);

  const handleColumnDragOver = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handleColumnDrop = useCallback(
    (e, key) => {
      e.preventDefault();
      const draggedKey =
        draggedColumnKeyRef.current ||
        e.dataTransfer?.getData("text/plain") ||
        "";

      reorderColumns(draggedKey, key);
      draggedColumnKeyRef.current = null;
    },
    [reorderColumns]
  );

  const handleColumnDragEnd = useCallback(() => {
    draggedColumnKeyRef.current = null;
  }, []);

  const handleHeaderContextMenu = useCallback(
    (e, key) => {
      e.preventDefault();
      headerContextTableRef.current = e.currentTarget?.closest("table") || null;
      setHeaderContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        key,
      });
    },
    []
  );

  const getCellClipboardValue = useCallback((cell) => {
    const field = cell.querySelector("input, textarea, select");
    const value =
      field?.tagName === "SELECT"
        ? field.options[field.selectedIndex]?.text ?? field.value
        : field?.value ?? cell.textContent ?? "";

    return String(value)
      .replace(/\t/g, " ")
      .replace(/\r?\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const getExcelClipboardValue = useCallback(
    (cell) => {
      const value = getCellClipboardValue(cell);

      if (/^0\d+$/.test(value) || /^\d+(?:-\d+)+$/.test(value)) {
        return `="${value.replace(/"/g, '""')}"`;
      }

      return value;
    },
    [getCellClipboardValue]
  );

  const getTableClipboardText = useCallback(
    (table) => {
      const rows = Array.from(table.querySelectorAll("tr"));
      const skipColumnIndexes = new Set();

      rows[0]?.querySelectorAll("th,td").forEach((cell, index) => {
        if (getCellClipboardValue(cell).toLowerCase() === "actions") {
          skipColumnIndexes.add(index);
        }
      });

      return rows
        .map((row) =>
          Array.from(row.querySelectorAll("th,td"))
            .filter((cell, index) => {
              if (skipColumnIndexes.has(index)) return false;
              const style = window.getComputedStyle(cell);
              return style.display !== "none" && style.visibility !== "hidden";
            })
            .map(getExcelClipboardValue)
            .join("\t")
        )
        .filter((line) => line.trim())
        .join("\n");
    },
    [getCellClipboardValue, getExcelClipboardValue]
  );

  const copyHeaderContextTable = useCallback(async () => {
    const table = headerContextTableRef.current;
    if (!table) return;

    const text = getTableClipboardText(table);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
  }, [getTableClipboardText]);

  const renderResizableHeader = useCallback(
    (label, key, fallbackWidth, options = {}) => (
      <th
        key={key}
        draggable
        className={`global-tran-th-ui relative select-none ${options.extraClassName || ""}`.trim()}
        style={{
          ...getColumnStyle(key, fallbackWidth),
          ...getFrozenColumnStyle(key, options.orderedColumns || columns, fallbackWidth, {
            isHeader: true,
          }),
        }}
        onDragStart={(e) => handleColumnDragStart(e, key)}
        onDragOver={handleColumnDragOver}
        onDrop={(e) => handleColumnDrop(e, key)}
        onDragEnd={handleColumnDragEnd}
        onContextMenu={(e) => handleHeaderContextMenu(e, key)}
        onClick={() => toggleSort(key)}
      >
        <div className="flex items-center justify-center gap-1 pr-2">
          <span>{label}</span>
          {sortConfigs.some((item) => item.key === key) && (
            <span className="inline-flex items-center gap-0.5 text-[10px] leading-none">
              {(() => {
                const currentSort = sortConfigs.find((item) => item.key === key);

                return (
                  <svg
                    viewBox="0 0 10 10"
                    className="h-2.5 w-2.5"
                    aria-hidden="true"
                    fill="currentColor"
                  >
                    {currentSort?.direction === "asc" ? (
                      <path d="M5 2 8 6H2z" />
                    ) : (
                      <path d="M2 4h6L5 8z" />
                    )}
                  </svg>
                );
              })()}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={`Resize ${label} column`}
          className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none touch-none bg-transparent hover:bg-blue-300/40"
          onMouseDown={(e) => startResize(e, key, fallbackWidth)}
        />
      </th>
    ),
    [
      columns,
      getColumnStyle,
      getFrozenColumnStyle,
      handleColumnDragEnd,
      handleColumnDragOver,
      handleColumnDragStart,
      handleColumnDrop,
      handleHeaderContextMenu,
      startResize,
      sortConfigs,
      toggleSort,
    ]
  );

  const renderHeaderContextMenu = useCallback(() => {
    const isFrozen = frozenColumnKeys.includes(headerContextMenu.key);
    const manageableColumns = columns.filter(
      (column) => !isActionColumn(column.key)
    );
    const visibleDataColumnCount = getVisibleDataColumnCount();
    const contextMenu =
      headerContextMenu.visible && headerContextMenu.key ? (
        <div
          className="fixed min-w-[210px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          style={{
            top: `${headerContextMenu.y}px`,
            left: `${headerContextMenu.x}px`,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
            onClick={copyHeaderContextTable}
          >
            <Copy className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>Copy table</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
            onClick={() => {
              clearSort(headerContextMenu.key);
              setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
            }}
          >
            <ListX className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>Clear sorting</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
            onClick={() => {
              toggleFreezeColumn(headerContextMenu.key);
              setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
            }}
          >
            {isFrozen ? (
              <PinOff className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            ) : (
              <Pin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            )}
            <span>{isFrozen ? "Unfreeze column" : "Freeze column on left"}</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
            onClick={() => {
              setShowColumnVisibilityModal(true);
              setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
            }}
          >
            <Eye className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>Manage columns</span>
          </button>
        </div>
      ) : null;

    const columnVisibilityModal = showColumnVisibilityModal ? (
      <div
        className="fixed inset-0 flex items-center justify-center bg-slate-900/30"
        style={{ zIndex: 1100 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setShowColumnVisibilityModal(false);
          }
        }}
      >
        <div className="w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">Manage columns</div>
              <div className="text-xs text-slate-500">
                {visibleDataColumnCount} visible, minimum {MIN_VISIBLE_DATA_COLUMNS}
              </div>
            </div>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              onClick={() => setShowColumnVisibilityModal(false)}
            >
              Close
            </button>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {manageableColumns.map((column) => {
              const isHidden = hiddenColumnKeys.includes(column.key);
              const canToggleColumn = isHidden || visibleDataColumnCount > MIN_VISIBLE_DATA_COLUMNS;

              return (
                <label
                  key={column.key}
                  className={`flex items-center gap-3 rounded px-2 py-2 text-sm ${
                    canToggleColumn
                      ? "cursor-pointer text-slate-700 hover:bg-slate-100"
                      : "cursor-not-allowed text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!isHidden}
                    disabled={!canToggleColumn}
                    onChange={() => toggleColumnVisibility(column.key)}
                  />
                  {isHidden ? (
                    <EyeOff className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  )}
                  <span className="truncate">{column.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    ) : null;

    if (!contextMenu && !columnVisibilityModal) {
      return null;
    }

    return (
      <>
        {contextMenu}
        {columnVisibilityModal}
      </>
    );
  }, [
    clearSort,
    copyHeaderContextTable,
    columns,
    frozenColumnKeys,
    getVisibleDataColumnCount,
    headerContextMenu,
    hiddenColumnKeys,
    isActionColumn,
    showColumnVisibilityModal,
    toggleFreezeColumn,
    toggleColumnVisibility,
  ]);

  return {
    columnWidths,
    columnOrder,
    frozenColumnKeys,
    hiddenColumnKeys,
    sortConfigs,
    setColumnWidths,
    setColumnOrder,
    setFrozenColumnKeys,
    setHiddenColumnKeys,
    setSortConfigs,
    clearAllSorting,
    clearZeroValueOnFocus,
    clearSort,
    focusNextRowInput,
    getColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    hideColumn,
    reorderColumns,
    renderResizableHeader,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDragStart,
    handleColumnDrop,
    handleHeaderContextMenu,
    renderHeaderContextMenu,
    startResize,
    toggleFreezeColumn,
    toggleSort,
    unhideColumn,
  };
};
