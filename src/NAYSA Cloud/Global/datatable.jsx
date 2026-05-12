


// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import ExportFileNameModal from "@/NAYSA Cloud/Lookup/SearchExport.jsx";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";
// import { Calculator, CheckCircle2, Columns3, Copy, Download, Eye, EyeOff, FileText, Filter, FilterX, ListX, Pin, PinOff, Rows3, X } from "lucide-react";
// import PdfTextCaptureModal from "@/NAYSA Cloud/Lookup/SearchPDFReader.jsx";

// const MIN_VISIBLE_DATA_COLUMNS = 5;
// const TABLE_EDITABLE_CONTROL_SELECTOR =
//   "input:not([disabled]), textarea:not([disabled]), select:not([disabled])";
// const CALCULATOR_COLUMN_KEYS = new Set([
//   "debit",
//   "credit",
//   "debitfx1",
//   "creditfx1",
//   "debitfx2",
//   "creditfx2",
// ]);

// export const transactionActionsHeaderStyle = {
//   width: "110px",
//   minWidth: "110px",
//   maxWidth: "110px",
//   zIndex: 25,
//   backgroundClip: "padding-box",
//   borderLeft: "1px solid rgba(148, 163, 184, 0.45)",
//   boxShadow: "-8px 0 14px -12px rgba(15, 23, 42, 0.35)",
//   backgroundImage:
//     "linear-gradient(to left, rgba(255,255,255,0.10), rgba(255,255,255,0.00))",
// };

// export const transactionActionsCellStyle = {
//   width: "110px",
//   minWidth: "110px",
//   maxWidth: "110px",
//   zIndex: 5,
//   backgroundClip: "padding-box",
//   borderLeft: "1px solid rgba(148, 163, 184, 0.35)",
//   boxShadow: "-8px 0 14px -12px rgba(15, 23, 42, 0.28)",
//   backgroundImage:
//     "linear-gradient(to left, rgba(148,163,184,0.08), rgba(148,163,184,0.00))",
// };

// export const useResizableTableColumns = (columns = []) => {
//   const { companyInfo, currentUserRow } = useAuth();
//   const [columnWidths, setColumnWidths] = useState({});
//   const [columnOrder, setColumnOrder] = useState(() =>
//     columns.map((column) => column.key)
//   );
//   const [sortConfigs, setSortConfigs] = useState([]);
//   const [frozenColumnKeys, setFrozenColumnKeys] = useState([]);
//   const [hiddenColumnKeys, setHiddenColumnKeys] = useState([]);
//   const [filteringColumnKeys, setFilteringColumnKeys] = useState([]);
//   const [groupedColumnKeys, setGroupedColumnKeys] = useState([]);
//   const [showGroupColumnDropZone, setShowGroupColumnDropZone] = useState(false);
//   const [isGroupColumnDragOver, setIsGroupColumnDragOver] = useState(false);
//   const [columnFilters, setColumnFilters] = useState({});
//   const [headerContextMenu, setHeaderContextMenu] = useState({
//     visible: false,
//     x: 0,
//     y: 0,
//     key: null,
//   });
//   const [bodyContextMenu, setBodyContextMenu] = useState({
//     visible: false,
//     x: 0,
//     y: 0,
//   });
//   const [showColumnVisibilityModal, setShowColumnVisibilityModal] = useState(false);
//   const [showExportFileNameModal, setShowExportFileNameModal] = useState(false);
//   const [showPdfTextCaptureModal, setShowPdfTextCaptureModal] = useState(false);
//   const [pdfCapturedText, setPdfCapturedText] = useState("");
//   const [copyFeedback, setCopyFeedback] = useState({ visible: false, label: "", x: 0, y: 0 });
//   const copyFeedbackTimerRef = useRef(null);
//   const [calculatorModal, setCalculatorModal] = useState({
//     visible: false,
//     x: 120,
//     y: 120,
//     width: 260,
//     height: 320,
//     expression: "",
//     error: "",
//     targetInput: null,
//     columnKey: "",
//     columnHeaderText: "",
//   });
//   const calculatorModalRef = useRef(calculatorModal);
//   const resizingRef = useRef(null);
//   const draggedColumnKeyRef = useRef(null);
//   const headerContextTableRef = useRef(null);
//   const bodyContextTableRef = useRef(null);
//   const bodyContextCellRef = useRef(null);
//   const contextMenuDragRef = useRef(null);
//   const calculatorDragRef = useRef(null);
//   const calculatorResizeRef = useRef(null);

//   useEffect(() => {
//     return () => {
//       if (copyFeedbackTimerRef.current) {
//         window.clearTimeout(copyFeedbackTimerRef.current);
//       }
//     };
//   }, []);

//   const columnMetaMap = useMemo(
//     () => new Map(columns.map((column) => [column.key, column])),
//     [columns]
//   );
//   const isActionColumn = useCallback(
//     (key) => {
//       const column = columnMetaMap.get(key);
//       const normalizedKey = String(key ?? "").trim().toLowerCase();
//       const normalizedLabel = String(column?.label ?? "").trim().toLowerCase();

//       return normalizedKey === "action" || normalizedKey === "actions" || normalizedLabel === "actions";
//     },
//     [columnMetaMap]
//   );

//   const handleResizeMove = useCallback((e) => {
//     if (!resizingRef.current) return;

//     const { startX, startWidth, key, minWidth } = resizingRef.current;
//     const delta = e.clientX - startX;
//     const nextWidth = Math.max(minWidth, startWidth + delta);

//     setColumnWidths((prev) => ({
//       ...prev,
//       [key]: nextWidth,
//     }));
//   }, []);

//   const handleResizeEnd = useCallback(() => {
//     if (!resizingRef.current) return;

//     resizingRef.current = null;
//     document.removeEventListener("mousemove", handleResizeMove);
//     document.removeEventListener("mouseup", handleResizeEnd);
//   }, [handleResizeMove]);

//   const startResize = useCallback(
//     (e, key, minWidth = 60) => {
//       e.preventDefault();
//       e.stopPropagation();

//       const th = e.currentTarget?.parentElement;
//       resizingRef.current = {
//         key,
//         minWidth,
//         startX: e.clientX,
//         startWidth: th?.offsetWidth || columnWidths[key] || minWidth,
//       };

//       document.addEventListener("mousemove", handleResizeMove);
//       document.addEventListener("mouseup", handleResizeEnd);
//     },
//     [columnWidths, handleResizeEnd, handleResizeMove]
//   );

//   useEffect(() => {
//     return () => {
//       document.removeEventListener("mousemove", handleResizeMove);
//       document.removeEventListener("mouseup", handleResizeEnd);
//     };
//   }, [handleResizeEnd, handleResizeMove]);

//   useEffect(() => {
//     const nextKeys = columns.map((column) => column.key);

//     setColumnOrder((prev) => {
//       const preservedKeys = prev.filter((key) => nextKeys.includes(key));
//       const newKeys = nextKeys.filter((key) => !preservedKeys.includes(key));
//       const mergedKeys = [...preservedKeys, ...newKeys];

//       if (
//         prev.length === mergedKeys.length &&
//         prev.every((key, index) => key === mergedKeys[index])
//       ) {
//         return prev;
//       }

//       return mergedKeys;
//     });

//     setFrozenColumnKeys((prev) => prev.filter((key) => nextKeys.includes(key)));
//     setHiddenColumnKeys((prev) =>
//       prev.filter((key) => nextKeys.includes(key) && !isActionColumn(key))
//     );
//     setSortConfigs((prev) => prev.filter((item) => nextKeys.includes(item.key)));
//     setFilteringColumnKeys((prev) =>
//       prev.filter((key) => nextKeys.includes(key) && !isActionColumn(key))
//     );
//     setGroupedColumnKeys((prev) => {
//       const nextGroupedKeys = prev.filter((key) => nextKeys.includes(key) && !isActionColumn(key));
//       if (!nextGroupedKeys.length) {
//         setShowGroupColumnDropZone(false);
//       }
//       return nextGroupedKeys;
//     });
//     setColumnFilters((prev) => {
//       const next = {};
//       Object.entries(prev).forEach(([key, value]) => {
//         if (nextKeys.includes(key) && !isActionColumn(key)) {
//           next[key] = value;
//         }
//       });
//       return next;
//     });
//   }, [columns, isActionColumn]);

//   useEffect(() => {
//     const handleCloseContextMenu = () => {
//       setHeaderContextMenu((prev) =>
//         prev.visible ? { visible: false, x: 0, y: 0, key: null } : prev
//       );
//       setBodyContextMenu((prev) =>
//         prev.visible ? { visible: false, x: 0, y: 0 } : prev
//       );
//     };

//     const handleEscapeKey = (e) => {
//       if (e.key === "Escape") {
//         handleCloseContextMenu();
//         setShowColumnVisibilityModal(false);
//         setShowExportFileNameModal(false);
//         setShowPdfTextCaptureModal(false);
//       }
//     };

//     const handleForceCloseCellOptions = () => {
//       setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//       setBodyContextMenu({ visible: false, x: 0, y: 0 });
//     };

//     document.addEventListener("click", handleCloseContextMenu);
//     document.addEventListener("keydown", handleEscapeKey);
//     window.addEventListener("naysa-close-table-cell-options", handleForceCloseCellOptions);

//     return () => {
//       document.removeEventListener("click", handleCloseContextMenu);
//       document.removeEventListener("keydown", handleEscapeKey);
//       window.removeEventListener("naysa-close-table-cell-options", handleForceCloseCellOptions);
//     };
//   }, []);

//   useEffect(() => {
//     const handleContextMenuDragMove = (e) => {
//       if (!contextMenuDragRef.current) return;

//       const { menuType, startX, startY, initialX, initialY } = contextMenuDragRef.current;
//       const nextX = Math.max(8, Math.min(window.innerWidth - 80, initialX + (e.clientX - startX)));
//       const nextY = Math.max(8, Math.min(window.innerHeight - 40, initialY + (e.clientY - startY)));

//       if (menuType === "body") {
//         setBodyContextMenu((prev) => ({ ...prev, x: nextX, y: nextY }));
//       } else {
//         setHeaderContextMenu((prev) => ({ ...prev, x: nextX, y: nextY }));
//       }
//     };

//     const handleContextMenuDragEnd = () => {
//       contextMenuDragRef.current = null;
//     };

//     document.addEventListener("mousemove", handleContextMenuDragMove);
//     document.addEventListener("mouseup", handleContextMenuDragEnd);

//     return () => {
//       document.removeEventListener("mousemove", handleContextMenuDragMove);
//       document.removeEventListener("mouseup", handleContextMenuDragEnd);
//     };
//   }, []);

//   useEffect(() => {
//     const handleCalculatorPointerMove = (e) => {
//       if (calculatorDragRef.current) {
//         const { startX, startY, initialX, initialY } = calculatorDragRef.current;
//         const nextX = Math.max(8, Math.min(window.innerWidth - 80, initialX + (e.clientX - startX)));
//         const nextY = Math.max(8, Math.min(window.innerHeight - 60, initialY + (e.clientY - startY)));
//         setCalculatorModal((prev) => ({ ...prev, x: nextX, y: nextY }));
//         return;
//       }

//       if (calculatorResizeRef.current) {
//         const { startX, startY, startWidth, startHeight } = calculatorResizeRef.current;
//         const nextWidth = Math.max(220, Math.min(window.innerWidth - 16, startWidth + (e.clientX - startX)));
//         const nextHeight = Math.max(260, Math.min(window.innerHeight - 16, startHeight + (e.clientY - startY)));
//         setCalculatorModal((prev) => ({ ...prev, width: nextWidth, height: nextHeight }));
//       }
//     };

//     const handleCalculatorPointerUp = () => {
//       calculatorDragRef.current = null;
//       calculatorResizeRef.current = null;
//     };

//     document.addEventListener("mousemove", handleCalculatorPointerMove);
//     document.addEventListener("mouseup", handleCalculatorPointerUp);

//     return () => {
//       document.removeEventListener("mousemove", handleCalculatorPointerMove);
//       document.removeEventListener("mouseup", handleCalculatorPointerUp);
//     };
//   }, []);

//   useEffect(() => {
//     calculatorModalRef.current = calculatorModal;
//     if (calculatorModal.visible) {
//       window.__naysaTableCalculatorOpen = true;
//       window.dispatchEvent(new CustomEvent("naysa-close-table-cell-options"));
//     } else if (window.__naysaTableCalculatorOpen) {
//       window.__naysaTableCalculatorOpen = false;
//     }
//   }, [calculatorModal]);

//   useEffect(() => {
//     if (!calculatorModal.visible) return;

//     // Calculator acts as a true modal: hide any open cell menu and lock the page behind it.
//     bodyContextCellRef.current = null;
//     bodyContextTableRef.current = null;
//     setBodyContextMenu({ visible: false, x: 0, y: 0 });
//     setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });

//     const previousOverflow = document.body.style.overflow;
//     document.body.style.overflow = "hidden";

//     return () => {
//       document.body.style.overflow = previousOverflow;
//     };
//   }, [calculatorModal.visible]);

//   useEffect(() => {
//     if (!calculatorModal.visible) return;

//     const handleCalculatorKeyDown = (e) => {
//       if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;

//       if (e.key === "Escape") {
//         e.preventDefault();
//         setCalculatorModal((prev) => ({ ...prev, visible: false, error: "" }));
//         return;
//       }

//       if (e.key === "Enter" || e.code === "NumpadEnter") {
//         e.preventDefault();
//         const currentCalculator = calculatorModalRef.current || {};
//         const { error, value } = evaluateCalculatorExpression(currentCalculator.expression);
//         if (error) {
//           setCalculatorModal((prev) => ({ ...prev, error }));
//           return;
//         }
//         setNativeControlValue(currentCalculator.targetInput, Number(value || 0).toFixed(2));
//         setCalculatorModal((prev) => ({ ...prev, visible: false, error: "" }));
//         return;
//       }

//       const activeTag = String(document.activeElement?.tagName || "").toLowerCase();
//       const isTypingInsideCalculatorInput =
//         activeTag === "input" &&
//         document.activeElement?.dataset?.calculatorInput === "true";

//       if (isTypingInsideCalculatorInput) return;

//       const keyMap = {
//         Add: "+",
//         Subtract: "-",
//         Multiply: "*",
//         Divide: "/",
//         Decimal: ".",
//         NumpadAdd: "+",
//         NumpadSubtract: "-",
//         NumpadMultiply: "*",
//         NumpadDivide: "/",
//         NumpadDecimal: ".",
//       };
//       const printableKey =
//         /^[0-9]$/.test(e.key) || ["+", "-", "*", "/", ".", "(", ")"].includes(e.key)
//           ? e.key
//           : keyMap[e.code] || keyMap[e.key] || "";

//       if (printableKey) {
//         e.preventDefault();
//         setCalculatorModal((prev) => ({
//           ...prev,
//           expression: `${prev.expression}${printableKey}`,
//           error: "",
//         }));
//         return;
//       }

//       if (e.key === "Backspace") {
//         e.preventDefault();
//         setCalculatorModal((prev) => ({
//           ...prev,
//           expression: prev.expression.slice(0, -1),
//           error: "",
//         }));
//       }
//     };

//     document.addEventListener("keydown", handleCalculatorKeyDown, true);
//     return () => document.removeEventListener("keydown", handleCalculatorKeyDown, true);
//   }, [calculatorModal.visible]);

//   const getColumnWidth = useCallback(
//     (key, fallbackWidth) => columnWidths[key] || fallbackWidth,
//     [columnWidths]
//   );

//   const getColumnStyle = useCallback(
//     (key, fallbackWidth) => {
//       const width = getColumnWidth(key, fallbackWidth);

//       return {
//         width: `${width}px`,
//         minWidth: `${width}px`,
//         maxWidth: `${width}px`,
//       };
//     },
//     [getColumnWidth]
//   );

//   const reorderColumns = useCallback((fromKey, toKey) => {
//     if (!fromKey || !toKey || fromKey === toKey) return;

//     setColumnOrder((prev) => {
//       const next = [...prev];
//       const fromIndex = next.indexOf(fromKey);
//       const toIndex = next.indexOf(toKey);

//       if (fromIndex === -1 || toIndex === -1) {
//         return prev;
//       }

//       next.splice(fromIndex, 1);
//       next.splice(toIndex, 0, fromKey);
//       return next;
//     });
//   }, []);

//   const toggleFreezeColumn = useCallback((key) => {
//     if (!key) return;

//     setFrozenColumnKeys((prev) => {
//       if (prev.includes(key)) {
//         return prev.filter((item) => item !== key);
//       }

//       return [...prev, key];
//     });
//   }, []);

//   const getVisibleDataColumnCount = useCallback(
//     () =>
//       columns.filter(
//         (column) => !isActionColumn(column.key) && !hiddenColumnKeys.includes(column.key)
//       ).length,
//     [columns, hiddenColumnKeys, isActionColumn]
//   );

//   const hideColumn = useCallback(
//     (key) => {
//       if (!key || isActionColumn(key) || hiddenColumnKeys.includes(key)) return;
//       if (getVisibleDataColumnCount() <= MIN_VISIBLE_DATA_COLUMNS) return;

//       setHiddenColumnKeys((prev) => [...prev, key]);
//       setFrozenColumnKeys((prev) => prev.filter((item) => item !== key));
//       setSortConfigs((prev) => prev.filter((item) => item.key !== key));
//     },
//     [getVisibleDataColumnCount, hiddenColumnKeys, isActionColumn]
//   );

//   const unhideColumn = useCallback(
//     (key) => {
//       if (!key || isActionColumn(key)) return;
//       setHiddenColumnKeys((prev) => prev.filter((item) => item !== key));
//     },
//     [isActionColumn]
//   );

//   const toggleColumnVisibility = useCallback(
//     (key) => {
//       if (!key || isActionColumn(key)) return;

//       if (hiddenColumnKeys.includes(key)) {
//         unhideColumn(key);
//         return;
//       }

//       hideColumn(key);
//     },
//     [hiddenColumnKeys, hideColumn, isActionColumn, unhideColumn]
//   );

//   const toggleSort = useCallback(
//     (key) => {
//       const column = columnMetaMap.get(key);
//       if (column?.sortable === false) return;

//       setSortConfigs((prev) => {
//         const existing = prev.find((item) => item.key === key);

//         if (!existing) {
//           return [{ key, direction: "asc" }];
//         }

//         if (existing.direction === "asc") {
//           return [{ key, direction: "desc" }];
//         }

//         return [];
//       });
//     },
//     [columnMetaMap]
//   );

//   const clearSort = useCallback((key = null) => {
//     setSortConfigs((prev) => {
//       if (!key) return [];
//       return prev.filter((item) => item.key !== key);
//     });
//   }, []);

//   const clearAllSorting = useCallback(() => {
//     setSortConfigs([]);
//   }, []);

//   const getFilterableColumnKeys = useCallback(
//     () => columns.filter((column) => !isActionColumn(column.key)).map((column) => column.key),
//     [columns, isActionColumn]
//   );

//   const enableColumnFiltering = useCallback(
//     (key) => {
//       if (!key || isActionColumn(key)) return;
//       setFilteringColumnKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
//     },
//     [isActionColumn]
//   );

//   const disableColumnFiltering = useCallback(
//     (key) => {
//       if (!key || isActionColumn(key)) return;
//       setFilteringColumnKeys((prev) => prev.filter((item) => item !== key));
//       setColumnFilters((prev) => {
//         const next = { ...prev };
//         delete next[key];
//         return next;
//       });
//     },
//     [isActionColumn]
//   );

//   const enableAllColumnFiltering = useCallback(() => {
//     setFilteringColumnKeys(getFilterableColumnKeys());
//   }, [getFilterableColumnKeys]);

//   const disableAllColumnFiltering = useCallback(() => {
//     setFilteringColumnKeys([]);
//     setColumnFilters({});
//   }, []);

//   const enableGroupColumn = useCallback(() => {
//     setShowGroupColumnDropZone(true);
//   }, []);

//   const addGroupColumn = useCallback(
//     (key) => {
//       if (!key || isActionColumn(key)) return;

//       setShowGroupColumnDropZone(true);
//       setGroupedColumnKeys((prev) =>
//         prev.includes(key) ? prev : [...prev, key]
//       );
//     },
//     [isActionColumn]
//   );

//   const deleteGroupColumn = useCallback(
//     (key = null) => {
//       if (key && !isActionColumn(key)) {
//         setGroupedColumnKeys((prev) => {
//           const next = prev.filter((item) => item !== key);
//           if (!next.length) {
//             setShowGroupColumnDropZone(false);
//           }
//           return next;
//         });
//         return;
//       }
//       setGroupedColumnKeys([]);
//       setShowGroupColumnDropZone(false);
//     },
//     [isActionColumn]
//   );

//   const toggleColumnFiltering = useCallback(
//     (key = null) => {
//       const filterableKeys = getFilterableColumnKeys();
//       const isAllFilteringEnabled =
//         filterableKeys.length > 0 &&
//         filterableKeys.every((columnKey) => filteringColumnKeys.includes(columnKey));

//       if (!key) {
//         if (isAllFilteringEnabled) {
//           disableAllColumnFiltering();
//           return;
//         }

//         enableAllColumnFiltering();
//         return;
//       }

//       if (isActionColumn(key)) return;
//       if (filteringColumnKeys.includes(key)) {
//         disableColumnFiltering(key);
//         return;
//       }
//       enableColumnFiltering(key);
//     },
//     [
//       disableAllColumnFiltering,
//       disableColumnFiltering,
//       enableAllColumnFiltering,
//       enableColumnFiltering,
//       filteringColumnKeys,
//       getFilterableColumnKeys,
//       isActionColumn,
//     ]
//   );

//   const setColumnFilterValue = useCallback(
//     (key, value) => {
//       if (!key || isActionColumn(key)) return;
//       setColumnFilters((prev) => ({ ...prev, [key]: value }));
//     },
//     [isActionColumn]
//   );

//   const clearColumnFilter = useCallback((key = null) => {
//     setColumnFilters((prev) => {
//       if (!key) return {};
//       const next = { ...prev };
//       delete next[key];
//       return next;
//     });
//   }, []);

//   const clearZeroValueOnFocus = useCallback(
//     (event, options = {}) => {
//       const {
//         isEditable = true,
//         onClear,
//         zeroValues = ["0", "0.0", "0.00", "0.000", "0.0000", "0.00000", "0.000000"],
//       } = options;

//       if (!isEditable) return;

//       if (event?.target?.dataset?.skipZeroClearOnce === "true") {
//         delete event.target.dataset.skipZeroClearOnce;
//         return;
//       }

//       const rawValue = String(event?.target?.value ?? "").trim();
//       if (!rawValue) return;

//       const normalizedValue = rawValue.replace(/,/g, "");
//       const isZeroValue =
//         zeroValues.includes(normalizedValue) ||
//         (!Number.isNaN(Number(normalizedValue)) && Number(normalizedValue) === 0);

//       if (!isZeroValue) return;

//       if (event?.target) {
//         event.target.value = "";
//       }

//       if (typeof onClear === "function") {
//         onClear("");
//       }
//     },
//     []
//   );

//   const focusNextRowInput = useCallback(
//     (currentIndex, field, options = {}) => {
//       const {
//         rows = [],
//         zeroClearFields = [],
//         parseValue = (value) => {
//           const normalizedValue = String(value ?? "").replace(/,/g, "").trim();
//           if (!normalizedValue) return "";
//           const parsedValue = Number(normalizedValue);
//           return Number.isNaN(parsedValue) ? normalizedValue : parsedValue;
//         },
//         onClearNextValue,
//         getTargetId = (nextIndex, nextField) => `${nextField}-${nextIndex}`,
//         retryDelays = [80, 220, 600],
//       } = options;

//       const activeElement = document.activeElement;
//       const editableControlSelector =
//         "input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled])";
//       const activeRow = activeElement?.closest?.("tr");
//       const activeCell = activeElement?.closest?.("td,th");
//       const activeCellIndex =
//         activeRow && activeCell ? Array.from(activeRow.cells).indexOf(activeCell) : -1;
//       const nextVisibleRow = activeRow?.nextElementSibling?.matches?.("tr")
//         ? activeRow.nextElementSibling
//         : null;

//       if (activeRow && !nextVisibleRow) {
//         requestAnimationFrame(() => activeElement?.focus?.());
//         return;
//       }

//       requestAnimationFrame(() => {
//         const targetCell =
//           nextVisibleRow && activeCellIndex >= 0
//             ? nextVisibleRow.cells[activeCellIndex]
//             : null;
//         const visibleTarget = targetCell?.querySelector(editableControlSelector);
//         const fallbackNextIndex = currentIndex + 1;
//         const fallbackRow = rows[fallbackNextIndex];
//         const target =
//           visibleTarget ||
//           (fallbackRow ? document.getElementById(getTargetId(fallbackNextIndex, field)) : null);

//         if (!target) {
//           activeElement?.focus?.();
//           return;
//         }

//         target?.focus();

//         const targetIdIndex = String(target.id || "").match(/-(\d+)$/);
//         const nextIndex = targetIdIndex ? Number(targetIdIndex[1]) : fallbackNextIndex;
//         const shouldClearZero =
//           zeroClearFields.includes(field) ||
//           String(target.className || "")
//             .split(/\s+/)
//             .includes("text-right");

//         if (!shouldClearZero) return;

//         const clearTargetIfZero = () => {
//           const activeTarget = target.id
//             ? document.getElementById(target.id)
//             : target;
//           if (!activeTarget || document.activeElement !== activeTarget) return;

//           const parsedValue = parseValue(activeTarget.value);
//           if (parsedValue !== 0) return;

//           activeTarget.value = "";
//           if (typeof onClearNextValue === "function") {
//             onClearNextValue(nextIndex, field, "");
//           }
//         };

//         const nextValue = parseValue(target.value);
//         if (nextValue === 0 && typeof onClearNextValue === "function") {
//           onClearNextValue(nextIndex, field, "");
//         }

//         clearTargetIfZero();
//         retryDelays.forEach((delay) => {
//           window.setTimeout(clearTargetIfZero, delay);
//         });
//       });
//     },
//     []
//   );

//   useEffect(() => {
//     const isVisibleControl = (control) => {
//       if (!control || control.type === "hidden") return false;

//       const style = window.getComputedStyle(control);
//       return (
//         style.display !== "none" &&
//         style.visibility !== "hidden" &&
//         style.opacity !== "0"
//       );
//     };

//     const getFirstFocusableControl = (cell) =>
//       Array.from(cell?.querySelectorAll(TABLE_EDITABLE_CONTROL_SELECTOR) || []).find(
//         isVisibleControl
//       );

//     const getTargetControlInRow = (row, startCellIndex, direction) => {
//       if (!row || startCellIndex < 0) return null;

//       for (
//         let cellIndex = startCellIndex;
//         cellIndex >= 0 && cellIndex < row.cells.length;
//         cellIndex += direction
//       ) {
//         const target = getFirstFocusableControl(row.cells[cellIndex]);
//         if (target) return target;
//       }

//       return null;
//     };

//     const shouldKeepHorizontalCaretMovement = (event, control) => {
//       if (control.readOnly || control.tagName === "SELECT") return false;
//       if (control.tagName === "TEXTAREA") return true;
//       if (typeof control.selectionStart !== "number") return false;

//       const selectionStart = control.selectionStart;
//       const selectionEnd = control.selectionEnd;
//       const valueLength = String(control.value || "").length;

//       if (selectionStart !== selectionEnd) return true;
//       if (event.key === "ArrowLeft") return selectionStart > 0;
//       if (event.key === "ArrowRight") return selectionEnd < valueLength;

//       return false;
//     };

//     const handleArrowKeyNavigation = (event) => {
//       if (
//         event.defaultPrevented ||
//         event.altKey ||
//         event.ctrlKey ||
//         event.metaKey ||
//         event.shiftKey ||
//         !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
//       ) {
//         return;
//       }

//       const activeControl = event.target;
//       if (!activeControl?.matches?.(TABLE_EDITABLE_CONTROL_SELECTOR)) return;
//       if (!isVisibleControl(activeControl)) return;
//       if (shouldKeepHorizontalCaretMovement(event, activeControl)) return;

//       const activeRow = activeControl.closest("tr");
//       const activeCell = activeControl.closest("td,th");
//       const activeTable = activeControl.closest("table");
//       if (!activeRow || !activeCell || !activeTable) return;

//       const activeCellIndex = Array.from(activeRow.cells).indexOf(activeCell);
//       let targetControl = null;

//       if (event.key === "ArrowUp" || event.key === "ArrowDown") {
//         const targetRow =
//           event.key === "ArrowUp"
//             ? activeRow.previousElementSibling
//             : activeRow.nextElementSibling;

//         if (targetRow?.matches?.("tr")) {
//           targetControl = getTargetControlInRow(targetRow, activeCellIndex, 1);
//         }
//       } else {
//         const direction = event.key === "ArrowLeft" ? -1 : 1;
//         targetControl = getTargetControlInRow(
//           activeRow,
//           activeCellIndex + direction,
//           direction
//         );
//       }

//       if (!targetControl) {
//         activeControl.focus();
//         event.preventDefault();
//         return;
//       }

//       event.preventDefault();
//       targetControl.dataset.skipZeroClearOnce = "true";
//       targetControl.focus();

//       if (
//         typeof targetControl.select === "function" &&
//         targetControl.tagName !== "SELECT"
//       ) {
//         targetControl.select();
//       }
//     };

//     document.addEventListener("keydown", handleArrowKeyNavigation);

//     return () => {
//       document.removeEventListener("keydown", handleArrowKeyNavigation);
//     };
//   }, []);

//   const normalizeSortValue = useCallback((value) => {
//     if (value == null) return "";
//     if (value instanceof Date) return value.getTime();
//     if (typeof value === "number") return value;
//     if (typeof value === "boolean") return value ? 1 : 0;

//     const rawString = String(value).trim();
//     if (!rawString) return "";

//     const normalizedNumericString = rawString.replace(/,/g, "");
//     if (/^-?\d+(\.\d+)?$/.test(normalizedNumericString)) {
//       return Number(normalizedNumericString);
//     }

//     if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawString)) {
//       const [month, day, year] = rawString.split("/").map(Number);
//       const parsedDate = new Date(year, month - 1, day);
//       if (!Number.isNaN(parsedDate.getTime())) {
//         return parsedDate.getTime();
//       }
//     }

//     return rawString.toLowerCase();
//   }, []);

//   const compareSortValues = useCallback(
//     (left, right) => {
//       const normalizedLeft = normalizeSortValue(left);
//       const normalizedRight = normalizeSortValue(right);

//       if (normalizedLeft === normalizedRight) return 0;
//       if (normalizedLeft === "") return 1;
//       if (normalizedRight === "") return -1;

//       if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") {
//         return normalizedLeft - normalizedRight;
//       }

//       return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
//         numeric: true,
//         sensitivity: "base",
//       });
//     },
//     [normalizeSortValue]
//   );

//   const getFilteredRows = useCallback(
//     (rows = [], getFilterValue) => {
//       if (!Array.isArray(rows)) return rows;

//       const activeFilters = Object.entries(columnFilters)
//         .map(([key, value]) => [key, String(value ?? "").trim().toLowerCase()])
//         .filter(
//           ([key, value]) => value && filteringColumnKeys.includes(key) && !isActionColumn(key)
//         );

//       if (!activeFilters.length) return rows;

//       return rows.filter((row) =>
//         activeFilters.every(([key, filterValue]) => {
//           const rawValue =
//             typeof getFilterValue === "function" ? getFilterValue(row, key) : row?.[key];

//           return String(rawValue ?? "").toLowerCase().includes(filterValue);
//         })
//       );
//     },
//     [columnFilters, filteringColumnKeys, isActionColumn]
//   );

//   const getSortedRows = useCallback(
//     (rows = [], getSortValue, getFilterValue = null) => {
//       const filteredRows = getFilteredRows(rows, getFilterValue || getSortValue);

//       if (!Array.isArray(filteredRows)) {
//         return filteredRows;
//       }

//       const groupedSortConfigs = groupedColumnKeys
//         .filter((key) => !isActionColumn(key))
//         .map((key) => ({ key, direction: "asc", isGroupSort: true }));
//       const detailSortConfigs = sortConfigs.filter(
//         (item) => !groupedSortConfigs.some((groupItem) => groupItem.key === item.key)
//       );
//       const combinedSortConfigs = [...groupedSortConfigs, ...detailSortConfigs];

//       if (!combinedSortConfigs.length) {
//         return filteredRows;
//       }

//       return [...filteredRows].sort((left, right) => {
//         for (const sortConfig of combinedSortConfigs) {
//           const directionMultiplier = sortConfig.direction === "desc" ? -1 : 1;
//           const leftValue = getSortValue(left, sortConfig.key);
//           const rightValue = getSortValue(right, sortConfig.key);
//           const result = compareSortValues(leftValue, rightValue);

//           if (result !== 0) {
//             return result * directionMultiplier;
//           }
//         }

//         return 0;
//       });
//     },
//     [compareSortValues, getFilteredRows, groupedColumnKeys, isActionColumn, sortConfigs]
//   );

//   const getOrderedColumns = useCallback(
//     (inputColumns = columns) => {
//       const lookup = new Map(inputColumns.map((column) => [column.key, column]));
//       const ordered = columnOrder
//         .map((key) => lookup.get(key))
//         .filter(Boolean);
//       const missing = inputColumns.filter((column) => !columnOrder.includes(column.key));
//       const mergedColumns = [...ordered, ...missing].filter(
//         (column) => !hiddenColumnKeys.includes(column.key)
//       );
//       const frozenColumns = mergedColumns.filter((column) =>
//         frozenColumnKeys.includes(column.key)
//       );
//       const unfrozenColumns = mergedColumns.filter(
//         (column) => !frozenColumnKeys.includes(column.key)
//       );

//       return [...frozenColumns, ...unfrozenColumns];
//     },
//     [columnOrder, columns, frozenColumnKeys, hiddenColumnKeys]
//   );

//   const getFrozenColumnStyle = useCallback(
//     (key, orderedColumns = columns, fallbackWidth = 120, options = {}) => {
//       if (!frozenColumnKeys.includes(key)) {
//         return {};
//       }

//       const frozenOrderedColumns = orderedColumns.filter((column) =>
//         frozenColumnKeys.includes(column.key)
//       );
//       const targetIndex = frozenOrderedColumns.findIndex((column) => column.key === key);

//       if (targetIndex === -1) {
//         return {};
//       }

//       const isLastFrozenColumn = targetIndex === frozenOrderedColumns.length - 1;

//       const leftOffset = frozenOrderedColumns
//         .slice(0, targetIndex)
//         .reduce((total, column) => total + getColumnWidth(column.key, column.width || fallbackWidth), 0);

//       return {
//         position: "sticky",
//         left: `${leftOffset}px`,
//         zIndex: options.isHeader ? 45 : 15,
//         backgroundColor:
//           options.backgroundColor || (options.isHeader ? "#dbeafe" : "#ffffff"),
//         backgroundClip: "padding-box",
//         boxShadow: isLastFrozenColumn
//           ? "1px 0 0 rgba(148, 163, 184, 0.45)"
//           : "none",
//       };
//     },
//     [columns, frozenColumnKeys, getColumnWidth]
//   );

//   const handleColumnDragStart = useCallback((e, key) => {
//     draggedColumnKeyRef.current = key;
//     if (e.dataTransfer) {
//       e.dataTransfer.effectAllowed = "move";
//       e.dataTransfer.setData("text/plain", key);
//     }
//   }, []);

//   const handleColumnDragOver = useCallback((e) => {
//     e.preventDefault();
//     if (e.dataTransfer) {
//       e.dataTransfer.dropEffect = "move";
//     }
//   }, []);

//   const handleColumnDrop = useCallback(
//     (e, key) => {
//       e.preventDefault();
//       const draggedKey =
//         draggedColumnKeyRef.current ||
//         e.dataTransfer?.getData("text/plain") ||
//         "";

//       reorderColumns(draggedKey, key);
//       draggedColumnKeyRef.current = null;
//     },
//     [reorderColumns]
//   );

//   const handleColumnDragEnd = useCallback(() => {
//     draggedColumnKeyRef.current = null;
//     setIsGroupColumnDragOver(false);
//   }, []);

//   const handleGroupColumnDragOver = useCallback((e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setIsGroupColumnDragOver(true);
//     if (e.dataTransfer) {
//       e.dataTransfer.dropEffect = "move";
//     }
//   }, []);

//   const handleGroupColumnDragLeave = useCallback((e) => {
//     const nextTarget = e.relatedTarget;
//     if (nextTarget && e.currentTarget?.contains?.(nextTarget)) return;
//     setIsGroupColumnDragOver(false);
//   }, []);

//   const handleGroupColumnDrop = useCallback(
//     (e) => {
//       e.preventDefault();
//       e.stopPropagation();

//       const droppedKey =
//         draggedColumnKeyRef.current ||
//         e.dataTransfer?.getData("text/plain") ||
//         "";

//       addGroupColumn(droppedKey);
//       draggedColumnKeyRef.current = null;
//       setIsGroupColumnDragOver(false);
//     },
//     [addGroupColumn]
//   );

//   const handleHeaderContextMenu = useCallback(
//     (e, key) => {
//       e.preventDefault();
//       headerContextTableRef.current = e.currentTarget?.closest("table") || null;
//       setHeaderContextMenu({
//         visible: true,
//         x: e.clientX,
//         y: e.clientY,
//         key,
//       });
//     },
//     []
//   );

//   const handleBodyContextMenu = useCallback((e) => {
//     if (window.__naysaTableCalculatorOpen) return;
//     const cell = e.currentTarget?.closest?.("td,th") || e.target?.closest?.("td,th");
//     const row = cell?.closest?.("tr");
//     const table = cell?.closest?.("table");

//     if (!cell || !row || !table || cell.tagName === "TH") return;

//     e.preventDefault();
//     e.stopPropagation();

//     bodyContextCellRef.current = cell;
//     bodyContextTableRef.current = table;
//     headerContextTableRef.current = table;

//     setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//     setBodyContextMenu({ visible: true, x: e.clientX, y: e.clientY });
//   }, []);

//   useEffect(() => {
//     const handleDocumentBodyContextMenu = (e) => {
//       if (window.__naysaTableCalculatorOpen) return;
//       const cell = e.target?.closest?.("td");
//       const row = cell?.closest?.("tr");
//       const table = cell?.closest?.("table");

//       if (!cell || !row || !table) return;

//       e.preventDefault();
//       e.stopPropagation();

//       bodyContextCellRef.current = cell;
//       bodyContextTableRef.current = table;
//       headerContextTableRef.current = table;

//       setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//       setBodyContextMenu({ visible: true, x: e.clientX, y: e.clientY });
//     };

//     document.addEventListener("contextmenu", handleDocumentBodyContextMenu, true);

//     return () => {
//       document.removeEventListener("contextmenu", handleDocumentBodyContextMenu, true);
//     };
//   }, []);

//   const startContextMenuDrag = useCallback((e, menuType = "header") => {
//     if (e.button !== 0) return;
//     e.preventDefault();
//     e.stopPropagation();

//     const currentMenu = menuType === "body" ? bodyContextMenu : headerContextMenu;
//     contextMenuDragRef.current = {
//       menuType,
//       startX: e.clientX,
//       startY: e.clientY,
//       initialX: currentMenu.x,
//       initialY: currentMenu.y,
//     };
//   }, [bodyContextMenu, headerContextMenu]);

//   const closeHeaderContextMenu = useCallback(() => {
//     setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//   }, []);

//   const getCellClipboardValue = useCallback((cell) => {
//     const field = cell.querySelector("input, textarea, select");
//     const value =
//       field?.tagName === "SELECT"
//         ? field.options[field.selectedIndex]?.text ?? field.value
//         : field?.value ?? cell.textContent ?? "";

//     return String(value)
//       .replace(/\t/g, " ")
//       .replace(/\r?\n/g, " ")
//       .replace(/\s+/g, " ")
//       .trim();
//   }, []);

//   const getExcelClipboardValue = useCallback(
//     (cell) => {
//       const value = getCellClipboardValue(cell);

//       if (/^0\d+$/.test(value) || /^\d+(?:-\d+)+$/.test(value)) {
//         return `="${value.replace(/"/g, '""')}"`;
//       }

//       return value;
//     },
//     [getCellClipboardValue]
//   );

//   const getTableExportValue = useCallback(
//     (cell) => {
//       if (cell?.tagName === "TH") {
//         const headerLabel = cell.querySelector("div span")?.textContent ?? cell.textContent ?? "";
//         return String(headerLabel)
//           .replace(/Filter\.\.\./gi, "")
//           .replace(/\s+/g, " ")
//           .trim();
//       }

//       return getCellClipboardValue(cell);
//     },
//     [getCellClipboardValue]
//   );

//   const escapeExcelHtmlValue = useCallback(
//     (value) =>
//       String(value ?? "")
//         .replace(/&/g, "&amp;")
//         .replace(/</g, "&lt;")
//         .replace(/>/g, "&gt;")
//         .replace(/"/g, "&quot;"),
//     []
//   );

//   const getTableExcelHtml = useCallback(
//     (table) => {
//       const rows = Array.from(table.querySelectorAll("tr"));
//       const skipColumnIndexes = new Set();

//       rows[0]?.querySelectorAll("th,td").forEach((cell, index) => {
//         const headerText = getTableExportValue(cell).toLowerCase();
//         if (headerText === "action" || headerText === "actions") {
//           skipColumnIndexes.add(index);
//         }
//       });

//       const tableRowsHtml = rows
//         .map((row) => {
//           const cellsHtml = Array.from(row.querySelectorAll("th,td"))
//             .filter((cell, index) => {
//               if (skipColumnIndexes.has(index)) return false;
//               const style = window.getComputedStyle(cell);
//               return style.display !== "none" && style.visibility !== "hidden";
//             })
//             .map((cell) => {
//               const tagName = cell.tagName === "TH" ? "th" : "td";
//               const value = getTableExportValue(cell);
//               const preserveAsText = /^0\d+$/.test(value) || /^\d+(?:-\d+)+$/.test(value);
//               const style = preserveAsText ? ' style="mso-number-format:\\@;"' : "";

//               return `<${tagName}${style}>${escapeExcelHtmlValue(value)}</${tagName}>`;
//             })
//             .join("");

//           return cellsHtml ? `<tr>${cellsHtml}</tr>` : "";
//         })
//         .filter(Boolean)
//         .join("");

//       return `
//         <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
//           <head>
//             <meta charset="UTF-8" />
//             <!-- Keeps worksheet gridlines visible when opened in Excel -->
//             <!--[if gte mso 9]>
//             <xml>
//               <x:ExcelWorkbook>
//                 <x:ExcelWorksheets>
//                   <x:ExcelWorksheet>
//                     <x:Name>Table Data</x:Name>
//                     <x:WorksheetOptions>
//                       <x:DisplayGridlines/>
//                     </x:WorksheetOptions>
//                   </x:ExcelWorksheet>
//                 </x:ExcelWorksheets>
//               </x:ExcelWorkbook>
//             </xml>
//             <![endif]-->
//             <style>
//               table {
//                 border-collapse: collapse;
//               }
//               th, td {
//                 border: 1px solid #d9d9d9;
//                 mso-border-alt: solid #d9d9d9 .5pt;
//               }
//             </style>
//           </head>
//           <body><table border="1">${tableRowsHtml}</table></body>
//         </html>`;
//     },
//     [escapeExcelHtmlValue, getTableExportValue]
//   );

//   const getTableExcelReportData = useCallback(
//     (table) => {
//       const rows = Array.from(table.querySelectorAll("tr"));
//       const headerRow = rows.find((row) => row.querySelectorAll("th").length > 0);
//       if (!headerRow) {
//         return { data: [], visibleCols: [] };
//       }

//       const normalizeText = (value) =>
//         String(value ?? "")
//           .replace(/\s+/g, " ")
//           .trim()
//           .toLowerCase();

//       const normalizeNumericText = (value) =>
//         String(value ?? "")
//           .replace(/,/g, "")
//           .replace(/\((.*)\)/, "-$1")
//           .trim();

//       const isNumericText = (value) => {
//         const text = normalizeNumericText(value);
//         return text !== "" && /^-?\d+(\.\d+)?$/.test(text);
//       };

//       const getDecimalPlaces = (value) => {
//         const text = normalizeNumericText(value);
//         const decimalPart = text.includes(".") ? text.split(".")[1] : "";
//         return decimalPart.length;
//       };

//       const hasTextRightClass = (cell) => {
//         if (!cell) return false;
//         const classText = String(cell.className || "");
//         return (
//           classText.split(/\s+/).includes("text-right") ||
//           Boolean(cell.querySelector?.(".text-right"))
//         );
//       };

//       const isRightAligned = (cell) => {
//         if (!cell) return false;
//         if (hasTextRightClass(cell)) return true;

//         const style = window.getComputedStyle(cell);
//         return style.textAlign === "right";
//       };

//       const renderedColumns = getOrderedColumns(columns).filter(
//         (column) => !isActionColumn(column.key)
//       );

//       const skipColumnIndexes = new Set();
//       const visibleCols = [];
//       const sourceColumnByExportIndex = [];
//       const headerCells = Array.from(headerRow.querySelectorAll("th,td"));

//       headerCells.forEach((cell, index) => {
//         const headerText = getTableExportValue(cell);
//         const normalizedHeaderText = normalizeText(headerText);
//         const style = window.getComputedStyle(cell);

//         if (
//           normalizedHeaderText === "action" ||
//           normalizedHeaderText === "actions" ||
//           style.display === "none" ||
//           style.visibility === "hidden"
//         ) {
//           skipColumnIndexes.add(index);
//           return;
//         }

//         const matchedColumn =
//           renderedColumns[visibleCols.length] ||
//           columns.find(
//             (column) =>
//               normalizeText(column.label) === normalizedHeaderText ||
//               normalizeText(column.key) === normalizedHeaderText
//           );

//         const dataCells = rows
//           .filter((row) => row.querySelectorAll("td").length > 0)
//           .map((row) => row.querySelectorAll("td,th")[index])
//           .filter((dataCell) => {
//             if (!dataCell) return false;
//             const dataStyle = window.getComputedStyle(dataCell);
//             return dataStyle.display !== "none" && dataStyle.visibility !== "hidden";
//           });

//         const values = dataCells.map((dataCell) => getTableExportValue(dataCell));
//         const nonBlankValues = values.filter(
//           (value) => String(value ?? "").trim() !== ""
//         );
//         const numericValues = nonBlankValues.filter(isNumericText);
//         const shouldInferNumber =
//           !matchedColumn?.renderType &&
//           nonBlankValues.length > 0 &&
//           numericValues.length === nonBlankValues.length &&
//           dataCells.some(isRightAligned);

//         const renderType =
//           matchedColumn?.renderType || (shouldInferNumber ? "number" : "text");

//         const maxDecimalPlaces = numericValues.reduce(
//           (max, value) => Math.max(max, getDecimalPlaces(value)),
//           0
//         );

//         visibleCols.push({
//           ...(matchedColumn || {}),
//           key: matchedColumn?.key || `col_${visibleCols.length}`,
//           label: matchedColumn?.label || headerText || `Column ${visibleCols.length + 1}`,
//           renderType,
//           roundingOff:
//             typeof matchedColumn?.roundingOff === "number"
//               ? matchedColumn.roundingOff
//               : renderType === "number" || renderType === "currency"
//                 ? maxDecimalPlaces || 2
//                 : matchedColumn?.roundingOff,
//         });
//         sourceColumnByExportIndex.push(index);
//       });

//       const data = rows
//         .filter((row) => row.querySelectorAll("td").length > 0)
//         .map((row) => {
//           const rowData = {};

//           sourceColumnByExportIndex.forEach((sourceIndex, dataColumnIndex) => {
//             if (skipColumnIndexes.has(sourceIndex)) return;

//             const cell = row.querySelectorAll("td,th")[sourceIndex];
//             if (!cell) return;

//             const style = window.getComputedStyle(cell);
//             if (style.display === "none" || style.visibility === "hidden") return;

//             const column = visibleCols[dataColumnIndex];
//             if (!column) return;

//             rowData[column.key] = getTableExportValue(cell);
//           });

//           return rowData;
//         })
//         .filter((row) =>
//           Object.values(row).some((value) => String(value ?? "").trim() !== "")
//         );

//       return { data, visibleCols };
//     },
//     [columns, getOrderedColumns, getTableExportValue, isActionColumn]
//   );

//   const sanitizeExportFileName = useCallback((fileName = "") => {
//     const cleanedFileName = String(fileName || "")
//       .trim()
//       .replace(/[\\/:*?"<>|]/g, "-")
//       .replace(/\s+/g, " ");

//     return cleanedFileName || "Transaction Detail";
//   }, []);

//   const downloadHeaderContextTableToExcel = useCallback(
//     async (fileName = "Transaction Detail") => {
//       const table = headerContextTableRef.current;
//       if (!table) return;

//       const { data, visibleCols } = getTableExcelReportData(table);
//       if (!data.length || !visibleCols.length) return;

//       const safeFileName = sanitizeExportFileName(fileName || "Transaction Detail");
//       const reportName = safeFileName.replace(/\.xlsx$/i, "") || "Transaction Detail";

//       await exportGenericQueryExcel(
//         data,
//         {},
//         visibleCols,
//         [],
//         visibleCols,
//         {},
//         7,
//         reportName,
//         currentUserRow?.userName || "",
//         companyInfo?.compName || "",
//         companyInfo?.compAddr || "",
//         companyInfo?.telNo || "",
//         reportName
//       );

//       setShowExportFileNameModal(false);
//       setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//     },
//     [
//       companyInfo?.compAddr,
//       companyInfo?.compName,
//       companyInfo?.telNo,
//       currentUserRow?.userName,
//       getTableExcelReportData,
//       sanitizeExportFileName,
//     ]
//   );

//   const getTableClipboardText = useCallback(
//     (table) => {
//       const rows = Array.from(table.querySelectorAll("tr"));
//       const skipColumnIndexes = new Set();

//       rows[0]?.querySelectorAll("th,td").forEach((cell, index) => {
//         if (getCellClipboardValue(cell).toLowerCase() === "actions") {
//           skipColumnIndexes.add(index);
//         }
//       });

//       return rows
//         .map((row) =>
//           Array.from(row.querySelectorAll("th,td"))
//             .filter((cell, index) => {
//               if (skipColumnIndexes.has(index)) return false;
//               const style = window.getComputedStyle(cell);
//               return style.display !== "none" && style.visibility !== "hidden";
//             })
//             .map(getExcelClipboardValue)
//             .join("\t")
//         )
//         .filter((line) => line.trim())
//         .join("\n");
//     },
//     [getCellClipboardValue, getExcelClipboardValue]
//   );

//   const writeTextToClipboard = useCallback(async (text = "") => {
//     if (!text) return false;

//     try {
//       await navigator.clipboard.writeText(text);
//     } catch {
//       const textarea = document.createElement("textarea");
//       textarea.value = text;
//       textarea.setAttribute("readonly", "");
//       textarea.style.position = "fixed";
//       textarea.style.top = "-9999px";
//       document.body.appendChild(textarea);
//       textarea.select();
//       document.execCommand("copy");
//       document.body.removeChild(textarea);
//     }

//     return true;
//   }, []);

//   const getActionColumnIndexes = useCallback(
//     (table) => {
//       const indexes = new Set();
//       const headerRow = Array.from(table?.querySelectorAll("tr") || []).find(
//         (row) => row.querySelectorAll("th").length > 0
//       );

//       headerRow?.querySelectorAll("th,td").forEach((cell, index) => {
//         const headerText = getTableExportValue(cell).toLowerCase();
//         if (headerText === "action" || headerText === "actions") {
//           indexes.add(index);
//         }
//       });

//       return indexes;
//     },
//     [getTableExportValue]
//   );

//   const getCellColumnIndex = useCallback((cell) => {
//     const row = cell?.closest?.("tr");
//     if (!row || !cell) return -1;
//     return Array.from(row.querySelectorAll("th,td")).indexOf(cell);
//   }, []);

//   const normalizeCalculatorColumnKey = useCallback(
//     (key) => String(key ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase(),
//     []
//   );

//   const getColumnKeyByCell = useCallback(
//     (cell, table) => {
//       const columnIndex = getCellColumnIndex(cell);
//       if (!cell || !table || columnIndex < 0) return "";

//       const ordered = getOrderedColumns(columns);
//       if (ordered[columnIndex]?.key) return ordered[columnIndex].key;

//       const headerRow = Array.from(table.querySelectorAll("tr")).find(
//         (tableRow) => tableRow.querySelectorAll("th").length > 0
//       );
//       const headerCell = headerRow?.querySelectorAll("th,td")?.[columnIndex];
//       const headerText = String(getTableExportValue(headerCell) || "").toLowerCase();

//       const matchingColumn = columns.find((column) => {
//         const normalizedKey = normalizeCalculatorColumnKey(column.key);
//         const normalizedLabel = String(column.label || "").toLowerCase();
//         return (
//           headerText === normalizedLabel ||
//           headerText.includes(normalizedLabel) ||
//           headerText.includes(normalizedKey)
//         );
//       });

//       return matchingColumn?.key || "";
//     },
//     [columns, getCellColumnIndex, getOrderedColumns, getTableExportValue, normalizeCalculatorColumnKey]
//   );

//   const getColumnHeaderTextByCell = useCallback(
//     (cell, table) => {
//       const columnIndex = getCellColumnIndex(cell);
//       if (!cell || !table || columnIndex < 0) return "";

//       const headerRow = Array.from(table.querySelectorAll("tr")).find(
//         (tableRow) => tableRow.querySelectorAll("th").length > 0
//       );
//       const headerCell = headerRow?.querySelectorAll("th,td")?.[columnIndex];
//       return String(getTableExportValue(headerCell) || "").trim();
//     },
//     [getCellColumnIndex, getTableExportValue]
//   );

//   const getEditableControlFromCell = useCallback((cell) => {
//     const control = cell?.querySelector?.(
//       "input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])"
//     );
//     if (!control || control.type === "hidden") return null;

//     const style = window.getComputedStyle(control);
//     if (style.display === "none" || style.visibility === "hidden") return null;

//     return control;
//   }, []);

//   const isCalculatorCell = useCallback(
//     (cell, table) => {
//       const columnKey = getColumnKeyByCell(cell, table);
//       return (
//         CALCULATOR_COLUMN_KEYS.has(normalizeCalculatorColumnKey(columnKey)) &&
//         Boolean(getEditableControlFromCell(cell))
//       );
//     },
//     [getColumnKeyByCell, getEditableControlFromCell, normalizeCalculatorColumnKey]
//   );

//   const evaluateCalculatorExpression = useCallback((expression = "") => {
//     const cleanedExpression = String(expression || "")
//       .replace(/,/g, "")
//       .replace(/Ã—/g, "*")
//       .replace(/Ã·/g, "/")
//       .trim();

//     if (!cleanedExpression) {
//       return { error: "Enter an amount or formula.", value: null };
//     }

//     if (!/^[0-9+\-*/().\s]+$/.test(cleanedExpression)) {
//       return { error: "Only numbers and + - * / ( ) are allowed.", value: null };
//     }

//     try {
//       // eslint-disable-next-line no-new-func
//       const result = Function(`"use strict"; return (${cleanedExpression});`)();
//       const numericResult = Number(result);

//       if (!Number.isFinite(numericResult)) {
//         return { error: "Invalid calculator result.", value: null };
//       }

//       if (numericResult < 0) {
//         return { error: "Negative result is not allowed.", value: null };
//       }

//       return { error: "", value: numericResult };
//     } catch {
//       return { error: "Invalid formula.", value: null };
//     }
//   }, []);

//   const setNativeControlValue = useCallback((control, value) => {
//     if (!control) return;

//     const prototype = Object.getPrototypeOf(control);
//     const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
//     valueSetter?.call(control, value);

//     control.dispatchEvent(new Event("input", { bubbles: true }));
//     control.dispatchEvent(new Event("change", { bubbles: true }));
//     control.dispatchEvent(new Event("blur", { bubbles: true }));
//     control.focus?.();
//   }, []);

//   const closeBodyContextMenu = useCallback(() => {
//     setCopyFeedback({ visible: false, label: "", x: 0, y: 0 });
//     setBodyContextMenu({ visible: false, x: 0, y: 0 });
//   }, []);

//   const showCopyDoneThenClose = useCallback((label = "Copied") => {
//     if (copyFeedbackTimerRef.current) {
//       window.clearTimeout(copyFeedbackTimerRef.current);
//     }

//     const feedbackX = Math.max(8, Number(bodyContextMenu.x || 0) + 18);
//     const feedbackY = Math.max(8, Number(bodyContextMenu.y || 0) + 12);

//     // Close the menu immediately. The copied confirmation is shown as a separate
//     // floating toast so the user does not need to click a second time.
//     window.dispatchEvent(new CustomEvent("naysa-close-table-cell-options"));
//     setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//     setBodyContextMenu({ visible: false, x: 0, y: 0 });
//     setCopyFeedback({ visible: true, label, x: feedbackX, y: feedbackY });

//     copyFeedbackTimerRef.current = window.setTimeout(() => {
//       setCopyFeedback({ visible: false, label: "", x: 0, y: 0 });
//     }, 700);
//   }, [bodyContextMenu.x, bodyContextMenu.y]);

//   const openBodyCalculator = useCallback((sourceCell = null, sourceTable = null, sourcePosition = null) => {
//     const cell = sourceCell || bodyContextCellRef.current;
//     const table = sourceTable || bodyContextTableRef.current;
//     if (!cell || !table || !isCalculatorCell(cell, table)) return;

//     const targetInput = getEditableControlFromCell(cell);
//     const columnKey = getColumnKeyByCell(cell, table);
//     const columnHeaderText = getColumnHeaderTextByCell(cell, table) || columnKey;
//     const existingValue = String(targetInput?.value ?? "").replace(/,/g, "").trim();
//     const menuX = Number(sourcePosition?.x ?? bodyContextMenu.x ?? 8);
//     const menuY = Number(sourcePosition?.y ?? bodyContextMenu.y ?? 8);

//     // Hard close every table cell menu instance before rendering the calculator.
//     window.dispatchEvent(new CustomEvent("naysa-close-table-cell-options"));
//     bodyContextCellRef.current = null;
//     bodyContextTableRef.current = null;
//     setBodyContextMenu({ visible: false, x: 0, y: 0 });
//     setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });

//     requestAnimationFrame(() => {
//       setCalculatorModal((prev) => ({
//         ...prev,
//         visible: true,
//         x: Math.max(8, Math.min(window.innerWidth - prev.width - 8, menuX + 12)),
//         y: Math.max(8, Math.min(window.innerHeight - prev.height - 8, menuY + 12)),
//         expression: existingValue && Number(existingValue) !== 0 ? existingValue : "",
//         error: "",
//         targetInput,
//         columnKey,
//         columnHeaderText,
//       }));
//     });
//   }, [bodyContextMenu.x, bodyContextMenu.y, getColumnHeaderTextByCell, getColumnKeyByCell, getEditableControlFromCell, isCalculatorCell]);

//   const calculateCalculatorResult = useCallback(() => {
//     const currentCalculator = calculatorModalRef.current || calculatorModal;
//     const { error, value } = evaluateCalculatorExpression(currentCalculator.expression);
//     if (error) {
//       setCalculatorModal((prev) => ({ ...prev, error }));
//       return;
//     }

//     setCalculatorModal((prev) => ({
//       ...prev,
//       expression: Number(value || 0).toFixed(2),
//       error: "",
//     }));
//   }, [calculatorModal, evaluateCalculatorExpression]);

//   const applyCalculatorValue = useCallback(() => {
//     const currentCalculator = calculatorModalRef.current || calculatorModal;
//     const { error, value } = evaluateCalculatorExpression(currentCalculator.expression);
//     if (error) {
//       setCalculatorModal((prev) => ({ ...prev, error }));
//       return;
//     }

//     const formattedValue = Number(value || 0).toFixed(2);
//     setNativeControlValue(currentCalculator.targetInput, formattedValue);
//     setCalculatorModal((prev) => ({ ...prev, visible: false, error: "" }));
//   }, [calculatorModal, evaluateCalculatorExpression, setNativeControlValue]);

//   const startCalculatorDrag = useCallback((e) => {
//     if (e.button !== 0) return;
//     e.preventDefault();
//     e.stopPropagation();

//     calculatorDragRef.current = {
//       startX: e.clientX,
//       startY: e.clientY,
//       initialX: calculatorModal.x,
//       initialY: calculatorModal.y,
//     };
//   }, [calculatorModal.x, calculatorModal.y]);

//   const startCalculatorResize = useCallback((e) => {
//     if (e.button !== 0) return;
//     e.preventDefault();
//     e.stopPropagation();

//     calculatorResizeRef.current = {
//       startX: e.clientX,
//       startY: e.clientY,
//       startWidth: calculatorModal.width,
//       startHeight: calculatorModal.height,
//     };
//   }, [calculatorModal.height, calculatorModal.width]);

//   const copyBodyContextCell = useCallback(async () => {
//     const cell = bodyContextCellRef.current;
//     const table = bodyContextTableRef.current;
//     if (!cell || !table) return;

//     const columnIndex = getCellColumnIndex(cell);
//     if (getActionColumnIndexes(table).has(columnIndex)) return;

//     await writeTextToClipboard(getExcelClipboardValue(cell));
//     showCopyDoneThenClose("Cell copied");
//   }, [getActionColumnIndexes, getCellColumnIndex, getExcelClipboardValue, showCopyDoneThenClose, writeTextToClipboard]);

//   const copyBodyContextRow = useCallback(async () => {
//     const cell = bodyContextCellRef.current;
//     const table = bodyContextTableRef.current;
//     const row = cell?.closest?.("tr");
//     if (!cell || !table || !row) return;

//     const actionColumnIndexes = getActionColumnIndexes(table);
//     const headerRow = Array.from(table.querySelectorAll("tr")).find(
//       (tableRow) => tableRow.querySelectorAll("th").length > 0
//     );

//     const isVisibleCell = (targetCell) => {
//       if (!targetCell) return false;
//       const style = window.getComputedStyle(targetCell);
//       return style.display !== "none" && style.visibility !== "hidden";
//     };

//     const headerText = headerRow
//       ? Array.from(headerRow.querySelectorAll("th,td"))
//           .filter((headerCell, index) => !actionColumnIndexes.has(index) && isVisibleCell(headerCell))
//           .map(getExcelClipboardValue)
//           .join("\t")
//       : "";

//     const rowText = Array.from(row.querySelectorAll("td,th"))
//       .filter((rowCell, index) => !actionColumnIndexes.has(index) && isVisibleCell(rowCell))
//       .map(getExcelClipboardValue)
//       .join("\t");

//     const text = [headerText, rowText].filter((line) => String(line ?? "").trim()).join("\n");
//     if (!text) return;

//     await writeTextToClipboard(text);
//     showCopyDoneThenClose("Row copied");
//   }, [getActionColumnIndexes, getExcelClipboardValue, showCopyDoneThenClose, writeTextToClipboard]);

//   const copyBodyContextColumn = useCallback(async () => {
//     const cell = bodyContextCellRef.current;
//     const table = bodyContextTableRef.current;
//     if (!cell || !table) return;

//     const columnIndex = getCellColumnIndex(cell);
//     if (columnIndex < 0 || getActionColumnIndexes(table).has(columnIndex)) return;

//     const headerRow = Array.from(table.querySelectorAll("tr")).find(
//       (tableRow) => tableRow.querySelectorAll("th").length > 0
//     );
//     const headerCell = headerRow?.querySelectorAll("th,td")?.[columnIndex];
//     const headerText = headerCell ? getExcelClipboardValue(headerCell) : "";

//     const columnValues = Array.from(table.querySelectorAll("tr"))
//       .map((row) => row.querySelectorAll("td,th")[columnIndex])
//       .filter((columnCell) => {
//         if (!columnCell || columnCell.tagName === "TH") return false;
//         const style = window.getComputedStyle(columnCell);
//         return style.display !== "none" && style.visibility !== "hidden";
//       })
//       .map(getExcelClipboardValue)
//       .filter((value) => String(value ?? "").trim() !== "");

//     const text = [headerText, ...columnValues]
//       .filter((value) => String(value ?? "").trim() !== "")
//       .join("\n");
//     if (!text) return;

//     await writeTextToClipboard(text);
//     showCopyDoneThenClose("Column copied");
//   }, [getActionColumnIndexes, getCellColumnIndex, getExcelClipboardValue, showCopyDoneThenClose, writeTextToClipboard]);

//   const copyHeaderContextTable = useCallback(async () => {
//     const table = headerContextTableRef.current;
//     if (!table) return;

//     const text = getTableClipboardText(table);
//     if (!text) return;

//     await writeTextToClipboard(text);

//     setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//   }, [getTableClipboardText, writeTextToClipboard]);

//   const renderGroupColumnDropZone = useCallback(() => {
//     if (!showGroupColumnDropZone && !groupedColumnKeys.length) return null;

//     const groupedColumns = groupedColumnKeys
//       .map((key) => columnMetaMap.get(key) || columns.find((column) => column.key === key))
//       .filter(Boolean);

//     return (
//       <div
//         className={`mb-2 rounded-xl border border-dashed px-3 py-2 transition ${
//           isGroupColumnDragOver
//             ? "border-blue-500 bg-blue-50 shadow-sm"
//             : "border-slate-300 bg-slate-50"
//         }`}
//         onDragOver={handleGroupColumnDragOver}
//         onDragLeave={handleGroupColumnDragLeave}
//         onDrop={handleGroupColumnDrop}
//       >
//         <div className="flex flex-wrap items-center gap-2">
//           <span className="text-xs font-semibold text-slate-600">
//             Group columns:
//           </span>
//           {groupedColumns.length ? (
//             groupedColumns.map((column) => (
//               <span
//                 key={column.key}
//                 className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
//               >
//                 {column.label || column.key}
//                 <button
//                   type="button"
//                   className="ml-1 rounded-full px-1 text-blue-700 hover:bg-blue-200"
//                   onClick={() => deleteGroupColumn(column.key)}
//                   aria-label={`Remove ${column.label || column.key} group`}
//                 >
//                   Ãƒâ€”
//                 </button>
//               </span>
//             ))
//           ) : (
//             <span className="text-xs text-slate-500">
//               Drag a column header here to group the table.
//             </span>
//           )}
//           {groupedColumns.length > 0 && (
//             <button
//               type="button"
//               className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
//               onClick={() => deleteGroupColumn()}
//             >
//               Clear groups
//             </button>
//           )}
//         </div>
//       </div>
//     );
//   }, [
//     columnMetaMap,
//     columns,
//     deleteGroupColumn,
//     groupedColumnKeys,
//     handleGroupColumnDragLeave,
//     handleGroupColumnDragOver,
//     handleGroupColumnDrop,
//     isGroupColumnDragOver,
//     showGroupColumnDropZone,
//   ]);

//   const renderResizableHeader = useCallback(
//     (label, key, fallbackWidth, options = {}) => (
//       <th
//         key={key}
//         draggable
//         className={`global-tran-th-ui relative select-none ${options.extraClassName || ""}`.trim()}
//         style={{
//           ...getColumnStyle(key, fallbackWidth),
//           ...getFrozenColumnStyle(key, options.orderedColumns || columns, fallbackWidth, {
//             isHeader: true,
//           }),
//         }}
//         onDragStart={(e) => handleColumnDragStart(e, key)}
//         onDragOver={handleColumnDragOver}
//         onDrop={(e) => handleColumnDrop(e, key)}
//         onDragEnd={handleColumnDragEnd}
//         onContextMenu={(e) => handleHeaderContextMenu(e, key)}
//         onClick={() => toggleSort(key)}
//       >
//         <div className="flex items-center justify-center gap-1 pr-2">
//           <span>{label}</span>
//           {filteringColumnKeys.includes(key) && !isActionColumn(key) && (
//             <Filter className="h-3 w-3 shrink-0 text-blue-600" aria-hidden="true" />
//           )}
//           {sortConfigs.some((item) => item.key === key) && (
//             <span className="inline-flex items-center gap-0.5 text-[10px] leading-none">
//               {(() => {
//                 const currentSort = sortConfigs.find((item) => item.key === key);

//                 return (
//                   <svg
//                     viewBox="0 0 10 10"
//                     className="h-2.5 w-2.5"
//                     aria-hidden="true"
//                     fill="currentColor"
//                   >
//                     {currentSort?.direction === "asc" ? (
//                       <path d="M5 2 8 6H2z" />
//                     ) : (
//                       <path d="M2 4h6L5 8z" />
//                     )}
//                   </svg>
//                 );
//               })()}
//             </span>
//           )}
//         </div>
//         {filteringColumnKeys.includes(key) && !isActionColumn(key) && (
//           <div className="mt-1 px-1" onClick={(e) => e.stopPropagation()}>
//             <input
//               type="text"
//               value={columnFilters[key] || ""}
//               placeholder="Filter..."
//               className="h-6 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-normal text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
//               onChange={(e) => setColumnFilterValue(key, e.target.value)}
//               onClick={(e) => e.stopPropagation()}
//               onMouseDown={(e) => e.stopPropagation()}
//               onKeyDown={(e) => e.stopPropagation()}
//             />
//           </div>
//         )}
//         <button
//           type="button"
//           aria-label={`Resize ${label} column`}
//           className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none touch-none bg-transparent hover:bg-blue-300/40"
//           onMouseDown={(e) => startResize(e, key, fallbackWidth)}
//         />
//       </th>
//     ),
//     [
//       columnFilters,
//       columns,
//       filteringColumnKeys,
//       getColumnStyle,
//       getFrozenColumnStyle,
//       handleColumnDragEnd,
//       handleColumnDragOver,
//       handleColumnDragStart,
//       handleColumnDrop,
//       handleHeaderContextMenu,
//       isActionColumn,
//       setColumnFilterValue,
//       startResize,
//       sortConfigs,
//       toggleSort,
//     ]
//   );

//   const renderHeaderContextMenu = useCallback(() => {
//     const isFrozen = frozenColumnKeys.includes(headerContextMenu.key);
//     const filterableColumnKeys = getFilterableColumnKeys();
//     const isAllFilteringEnabled =
//       filterableColumnKeys.length > 0 &&
//       filterableColumnKeys.every((key) => filteringColumnKeys.includes(key));
//     const manageableColumns = columns.filter(
//       (column) => !isActionColumn(column.key)
//     );
//     const visibleDataColumnCount = getVisibleDataColumnCount();
//     const tableHasRows = Boolean(
//       headerContextTableRef.current?.querySelector("tbody tr, tr td")
//     );
//     const disabledMenuItemClass =
//       "cursor-not-allowed text-slate-400 opacity-50 hover:bg-transparent";
//     const enabledMenuItemClass = "text-slate-700 hover:bg-slate-100";
//     const getMenuItemClassName = (isEnabled = true) =>
//       `flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
//         isEnabled ? enabledMenuItemClass : disabledMenuItemClass
//       }`;
//     const getMenuIconClassName = (isEnabled = true) =>
//       `h-4 w-4 shrink-0 ${isEnabled ? "text-slate-500" : "text-slate-400"}`;

//     const contextMenu =
//       headerContextMenu.visible && headerContextMenu.key ? (
//         <div
//           className="fixed min-w-[230px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
//           style={{
//             top: `${headerContextMenu.y}px`,
//             left: `${headerContextMenu.x}px`,
//             zIndex: 1000,
//           }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           <div
//             className="flex cursor-move items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
//             onMouseDown={(e) => startContextMenuDrag(e, "header")}
//           >
//             <span>Table options</span>
//             <button
//               type="button"
//               className="rounded px-1.5 py-0.5 text-sm leading-none text-slate-500 hover:bg-slate-200 hover:text-slate-700"
//               onMouseDown={(e) => e.stopPropagation()}
//               onClick={closeHeaderContextMenu}
//               aria-label="Close table options"
//             >
//               x
//             </button>
//           </div>
//           <div className="py-1">
//             <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
//               Data
//             </div>
//             <button
//               type="button"
//               disabled={!tableHasRows}
//               className={getMenuItemClassName(tableHasRows)}
//               onClick={tableHasRows ? copyHeaderContextTable : undefined}
//             >
//               <Copy className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
//               <span>Copy table</span>
//             </button>
//             <button
//               type="button"
//               disabled={!tableHasRows}
//               className={getMenuItemClassName(tableHasRows)}
//               onClick={
//                 tableHasRows
//                   ? () => {
//                       setShowExportFileNameModal(true);
//                       setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//                     }
//                   : undefined
//               }
//             >
//               <Download className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
//               <span>Download to Excel</span>
//             </button>
//             <button
//               type="button"
//               className={getMenuItemClassName(true)}
//               onClick={() => {
//                 setShowPdfTextCaptureModal(true);
//                 setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//               }}
//             >
//               <FileText className={getMenuIconClassName(true)} aria-hidden="true" />
//               <span>Open PDF Text Capture</span>
//             </button>

//             <div className="my-1 border-t border-slate-100" />
//             <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
//               Sort & Filter
//             </div>
//             <button
//               type="button"
//               disabled={!tableHasRows}
//               className={getMenuItemClassName(tableHasRows)}
//               onClick={
//                 tableHasRows
//                   ? () => {
//                       clearSort(headerContextMenu.key);
//                       setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//                     }
//                   : undefined
//               }
//             >
//               <ListX className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
//               <span>Clear sorting</span>
//             </button>
//             <button
//               type="button"
//               disabled={!tableHasRows}
//               className={getMenuItemClassName(tableHasRows)}
//               onClick={
//                 tableHasRows
//                   ? () => {
//                       toggleColumnFiltering();
//                       setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//                     }
//                   : undefined
//               }
//             >
//               {isAllFilteringEnabled ? (
//                 <FilterX className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
//               ) : (
//                 <Filter className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
//               )}
//               <span>{isAllFilteringEnabled ? "Disable filtering" : "Enable filtering"}</span>
//             </button>

//             <div className="my-1 border-t border-slate-100" />
//             <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
//               Column Tools
//             </div>
//             <button
//               type="button"
//               className={getMenuItemClassName(true)}
//               onClick={() => {
//                 toggleFreezeColumn(headerContextMenu.key);
//                 setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//               }}
//             >
//               {isFrozen ? (
//                 <PinOff className={getMenuIconClassName(true)} aria-hidden="true" />
//               ) : (
//                 <Pin className={getMenuIconClassName(true)} aria-hidden="true" />
//               )}
//               <span>{isFrozen ? "Unfreeze column" : "Freeze column on left"}</span>
//             </button>
//             <button
//               type="button"
//               className={getMenuItemClassName(true)}
//               onClick={() => {
//                 setShowColumnVisibilityModal(true);
//                 setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
//               }}
//             >
//               <Eye className={getMenuIconClassName(true)} aria-hidden="true" />
//               <span>Manage columns</span>
//             </button>
//           </div>
//         </div>
//       ) : null;

//     const copyFeedbackElement = copyFeedback.visible ? (
//       <div
//         className="fixed pointer-events-none inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-[0_10px_28px_rgba(37,99,235,0.28)] transition-all duration-300 animate-[naysaCopyPulse_900ms_ease-out]"
//         style={{
//           top: `${copyFeedback.y}px`,
//           left: `${copyFeedback.x}px`,
//           zIndex: 1300,
//         }}
//       >
//         <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
//         <span>{copyFeedback.label || "Copied"}</span>
//       </div>
//     ) : null;

//     const bodyTable = bodyContextTableRef.current;
//     const bodyCell = bodyContextCellRef.current;
//     const bodyColumnIndex = getCellColumnIndex(bodyCell);
//     const isBodyActionColumn = Boolean(
//       bodyTable && bodyColumnIndex >= 0 && getActionColumnIndexes(bodyTable).has(bodyColumnIndex)
//     );
//     const canOpenBodyCalculator = Boolean(
//       bodyCell && bodyTable && !isBodyActionColumn && isCalculatorCell(bodyCell, bodyTable)
//     );
//     const bodyContextMenuElement =
//       bodyContextMenu.visible && !calculatorModal.visible && !window.__naysaTableCalculatorOpen && bodyCell && bodyTable ? (
//         <div
//           className="fixed min-w-[210px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
//           style={{
//             top: `${bodyContextMenu.y}px`,
//             left: `${bodyContextMenu.x}px`,
//             zIndex: 1000,
//           }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           <style>{`
//         @keyframes naysaCopyPulse {
//           0% { opacity: 0; transform: translateY(6px) scale(0.96); }
//           18% { opacity: 1; transform: translateY(0) scale(1.04); }
//           55% { opacity: 1; transform: translateY(0) scale(1); }
//           100% { opacity: 1; transform: translateY(0) scale(1); }
//         }
//       `}</style>
//       {copyFeedback.visible && (
//             <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 backdrop-blur-[1px]">
//               <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-[0_8px_22px_rgba(37,99,235,0.22)] transition-all duration-300 animate-[naysaCopyPulse_900ms_ease-out]">
//                 <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
//                 <span>{copyFeedback.label || "Copied"}</span>
//               </div>
//             </div>
//           )}
//           <div
//             className="flex cursor-move items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
//             onMouseDown={(e) => startContextMenuDrag(e, "body")}
//           >
//             <span>Cell options</span>
//             <button
//               type="button"
//               className="rounded px-1.5 py-0.5 text-sm leading-none text-slate-500 hover:bg-slate-200 hover:text-slate-700"
//               onMouseDown={(e) => e.stopPropagation()}
//               onClick={closeBodyContextMenu}
//               aria-label="Close cell options"
//             >
//               <X className="h-3.5 w-3.5" aria-hidden="true" />
//             </button>
//           </div>
//           <div className="py-1">
//           <button
//             type="button"
//             disabled={isBodyActionColumn}
//             className={getMenuItemClassName(!isBodyActionColumn)}
//             onClick={isBodyActionColumn ? undefined : (e) => {
//               e.preventDefault();
//               e.stopPropagation();
//               copyBodyContextCell();
//             }}
//           >
//             <Copy className={getMenuIconClassName(!isBodyActionColumn)} aria-hidden="true" />
//             <span>Copy cell record</span>
//           </button>
//           <button
//             type="button"
//             className={getMenuItemClassName(true)}
//             onClick={(e) => {
//               e.preventDefault();
//               e.stopPropagation();
//               copyBodyContextRow();
//             }}
//           >
//             <Rows3 className={getMenuIconClassName(true)} aria-hidden="true" />
//             <span>Copy row record</span>
//           </button>
//           <button
//             type="button"
//             disabled={isBodyActionColumn}
//             className={getMenuItemClassName(!isBodyActionColumn)}
//             onClick={isBodyActionColumn ? undefined : (e) => {
//               e.preventDefault();
//               e.stopPropagation();
//               copyBodyContextColumn();
//             }}
//           >
//             <Columns3 className={getMenuIconClassName(!isBodyActionColumn)} aria-hidden="true" />
//             <span>Copy column record</span>
//           </button>
//           {canOpenBodyCalculator && (
//             <>
//               <div className="my-1 border-t border-slate-100" />
//               <button
//                 type="button"
//                 className={getMenuItemClassName(true)}
//                 onClick={(e) => {
//                   e.preventDefault();
//                   e.stopPropagation();
//                   const sourceCell = bodyContextCellRef.current;
//                   const sourceTable = bodyContextTableRef.current;
//                   const sourcePosition = { x: bodyContextMenu.x, y: bodyContextMenu.y };

//                   // Remove every cell options menu immediately, then open calculator on the next frame.
//                   window.dispatchEvent(new CustomEvent("naysa-close-table-cell-options"));
//                   bodyContextCellRef.current = null;
//                   bodyContextTableRef.current = null;
//                   setBodyContextMenu({ visible: false, x: 0, y: 0 });

//                   requestAnimationFrame(() => {
//                     openBodyCalculator(sourceCell, sourceTable, sourcePosition);
//                   });
//                 }}
//               >
//                 <Calculator className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
//                 <span>Open calculator</span>
//               </button>
//             </>
//           )}
//           </div>
//         </div>
//       ) : null;

//     const calculatorModalElement = calculatorModal.visible ? (
//       <>
//         <div
//           className="fixed inset-0 bg-slate-950/25 backdrop-blur-[1px]"
//           style={{ zIndex: 1190 }}
//           onClick={(e) => e.stopPropagation()}
//           onContextMenu={(e) => {
//             e.preventDefault();
//             e.stopPropagation();
//           }}
//         />
//         <div
//         className="fixed overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-md"
//         style={{
//           top: `${calculatorModal.y}px`,
//           left: `${calculatorModal.x}px`,
//           width: `${calculatorModal.width}px`,
//           height: `${calculatorModal.height}px`,
//           zIndex: 1200,
//         }}
//         onClick={(e) => e.stopPropagation()}
//       >
//         <div
//           className="flex cursor-move items-center justify-between border-b border-slate-200/70 bg-slate-50/80 px-3 py-2"
//           onMouseDown={startCalculatorDrag}
//         >
//           <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
//             <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm">
//               <Calculator className="h-4 w-4" aria-hidden="true" />
//             </span>
//             <div>
//               <div>Calculator</div>
//               <div className="text-[10px] font-normal uppercase tracking-wide text-slate-400">
//                 {calculatorModal.columnHeaderText || calculatorModal.columnKey}
//               </div>
//             </div>
//           </div>
//           <button
//             type="button"
//             className="rounded-lg px-2 py-1 text-sm leading-none text-slate-500 hover:bg-slate-200 hover:text-slate-700"
//             onMouseDown={(e) => e.stopPropagation()}
//             onClick={() => setCalculatorModal((prev) => ({ ...prev, visible: false, error: "" }))}
//             aria-label="Close calculator"
//           >
//             <X className="h-4 w-4" aria-hidden="true" />
//           </button>
//         </div>

//         <div className="flex h-[calc(100%-44px)] flex-col gap-2 p-3">
//           <input
//             type="text"
//             autoFocus
//             data-calculator-input="true"
//             value={calculatorModal.expression}
//             placeholder="Example: 1000 + 250"
//             className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
//             onChange={(e) => setCalculatorModal((prev) => ({ ...prev, expression: e.target.value, error: "" }))}
//             onKeyDown={(e) => {
//               if (e.key === "Enter" || e.code === "NumpadEnter") {
//                 e.preventDefault();
//                 applyCalculatorValue();
//                 return;
//               }
//               if (e.key === "=") {
//                 e.preventDefault();
//                 calculateCalculatorResult();
//                 return;
//               }
//               if (e.key === "Escape") {
//                 e.preventDefault();
//                 setCalculatorModal((prev) => ({ ...prev, visible: false, error: "" }));
//               }
//             }}
//           />
//           {calculatorModal.error ? (
//             <div className="rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-[11px] text-red-600">
//               {calculatorModal.error}
//             </div>
//           ) : (
//             <div className="text-[11px] text-slate-400">
//               Supports +, -, *, / and parentheses. Result cannot be negative.
//             </div>
//           )}
//           <div className="mt-auto grid grid-cols-4 gap-1.5">
//             {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "+", "="].map((keyValue) => (
//               <button
//                 key={keyValue}
//                 type="button"
//                 className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
//                 onClick={() => {
//                   if (keyValue === "=") {
//                     calculateCalculatorResult();
//                     return;
//                   }
//                   setCalculatorModal((prev) => ({
//                     ...prev,
//                     expression: `${prev.expression}${keyValue}`,
//                     error: "",
//                   }));
//                 }}
//               >
//                 {keyValue}
//               </button>
//             ))}
//           </div>
//           <div className="grid grid-cols-3 gap-2 pt-1">
//             <button
//               type="button"
//               className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
//               onClick={() => setCalculatorModal((prev) => ({ ...prev, expression: "", error: "" }))}
//             >
//               Clear
//             </button>
//             <button
//               type="button"
//               className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
//               onClick={() => setCalculatorModal((prev) => ({ ...prev, expression: prev.expression.slice(0, -1), error: "" }))}
//             >
//               Back
//             </button>
//             <button
//               type="button"
//               className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
//               onClick={applyCalculatorValue}
//             >
//               Apply
//             </button>
//           </div>
//         </div>
//         <button
//           type="button"
//           className="absolute bottom-1 right-1 h-4 w-4 cursor-nwse-resize rounded bg-slate-300/70 hover:bg-slate-400/80"
//           onMouseDown={startCalculatorResize}
//           aria-label="Resize calculator"
//         />
//         </div>
//       </>
//     ) : null;

//     const columnVisibilityModal = showColumnVisibilityModal ? (
//       <div
//         className="fixed inset-0 flex items-center justify-center bg-slate-900/30"
//         style={{ zIndex: 1100 }}
//         onMouseDown={(e) => {
//           if (e.target === e.currentTarget) {
//             setShowColumnVisibilityModal(false);
//         setShowExportFileNameModal(false);
//           }
//         }}
//       >
//         <div className="w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-xl">
//           <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
//             <div>
//               <div className="text-sm font-semibold text-slate-800">Manage columns</div>
//               <div className="text-xs text-slate-500">
//                 {visibleDataColumnCount} visible, minimum {MIN_VISIBLE_DATA_COLUMNS}
//               </div>
//             </div>
//             <button
//               type="button"
//               className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
//               onClick={() => setShowColumnVisibilityModal(false)}
//             >
//               Close
//             </button>
//           </div>
//           <div className="max-h-[360px] overflow-y-auto p-2">
//             {manageableColumns.map((column) => {
//               const isHidden = hiddenColumnKeys.includes(column.key);
//               const canToggleColumn = isHidden || visibleDataColumnCount > MIN_VISIBLE_DATA_COLUMNS;

//               return (
//                 <label
//                   key={column.key}
//                   className={`flex items-center gap-3 rounded px-2 py-2 text-sm ${
//                     canToggleColumn
//                       ? "cursor-pointer text-slate-700 hover:bg-slate-100"
//                       : "cursor-not-allowed text-slate-400"
//                   }`}
//                 >
//                   <input
//                     type="checkbox"
//                     className="h-4 w-4"
//                     checked={!isHidden}
//                     disabled={!canToggleColumn}
//                     onChange={() => toggleColumnVisibility(column.key)}
//                   />
//                   {isHidden ? (
//                     <EyeOff className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
//                   ) : (
//                     <Eye className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
//                   )}
//                   <span className="truncate">{column.label}</span>
//                 </label>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     ) : null;

//     const exportFileNameModal = showExportFileNameModal ? (
//       <ExportFileNameModal
//         isOpen={showExportFileNameModal}
//         title="Export Table"
//         defaultFileName="Transaction Detail"
//         confirmText="Export"
//         onClose={() => setShowExportFileNameModal(false)}
//         onConfirm={downloadHeaderContextTableToExcel}
//       />
//     ) : null;

//     const pdfTextCaptureModal = showPdfTextCaptureModal ? (
//       <PdfTextCaptureModal
//         isOpen={showPdfTextCaptureModal}
//         title="PDF Text Capture"
//         initialText={pdfCapturedText}
//         onClose={() => setShowPdfTextCaptureModal(false)}
//         onApply={(text) => {
//           setPdfCapturedText(text || "");
//           setShowPdfTextCaptureModal(false);
//         }}
//       />
//     ) : null;

//     if (!contextMenu && !copyFeedbackElement && !bodyContextMenuElement && !calculatorModalElement && !columnVisibilityModal && !exportFileNameModal && !pdfTextCaptureModal) {
//       return null;
//     }

//     return (
//       <>
//         {contextMenu}
//         {copyFeedbackElement}
//         {bodyContextMenuElement}
//         {calculatorModalElement}
//         {columnVisibilityModal}
//         {exportFileNameModal}
//         {pdfTextCaptureModal}
//       </>
//     );
//   }, [
//     bodyContextMenu,
//     copyFeedback,
//     clearSort,
//     deleteGroupColumn,
//     enableGroupColumn,
//     copyBodyContextCell,
//     copyBodyContextColumn,
//     copyBodyContextRow,
//     calculatorModal,
//     applyCalculatorValue,
//     calculateCalculatorResult,
//     copyHeaderContextTable,
//     downloadHeaderContextTableToExcel,
//     getActionColumnIndexes,
//     getCellColumnIndex,
//     columns,
//     filteringColumnKeys,
//     frozenColumnKeys,
//     groupedColumnKeys,
//     getFilterableColumnKeys,
//     getVisibleDataColumnCount,
//     headerContextMenu,
//     hiddenColumnKeys,
//     isActionColumn,
//     showColumnVisibilityModal,
//     showExportFileNameModal,
//     showPdfTextCaptureModal,
//     pdfCapturedText,
//     isCalculatorCell,
//     openBodyCalculator,
//     startCalculatorDrag,
//     startCalculatorResize,
//     startContextMenuDrag,
//     toggleColumnFiltering,
//     toggleFreezeColumn,
//     toggleColumnVisibility,
//   ]);

//   return {
//     columnWidths,
//     columnOrder,
//     frozenColumnKeys,
//     hiddenColumnKeys,
//     filteringColumnKeys,
//     groupedColumnKeys,
//     showGroupColumnDropZone,
//     columnFilters,
//     sortConfigs,
//     setColumnWidths,
//     setColumnOrder,
//     setFrozenColumnKeys,
//     setHiddenColumnKeys,
//     setFilteringColumnKeys,
//     setGroupedColumnKeys,
//     setShowGroupColumnDropZone,
//     setColumnFilters,
//     setSortConfigs,
//     pdfCapturedText,
//     setPdfCapturedText,
//     setShowPdfTextCaptureModal,
//     clearAllSorting,
//     clearColumnFilter,
//     clearZeroValueOnFocus,
//     clearSort,
//     disableAllColumnFiltering,
//     disableColumnFiltering,
//     deleteGroupColumn,
//     downloadHeaderContextTableToExcel,
//     enableAllColumnFiltering,
//     enableColumnFiltering,
//     enableGroupColumn,
//     addGroupColumn,
//     focusNextRowInput,
//     getColumnStyle,
//     getFilterableColumnKeys,
//     getFilteredRows,
//     getFrozenColumnStyle,
//     getOrderedColumns,
//     getSortedRows,
//     hideColumn,
//     reorderColumns,
//     renderGroupColumnDropZone,
//     renderResizableHeader,
//     handleColumnDragEnd,
//     handleColumnDragOver,
//     handleColumnDragStart,
//     handleColumnDrop,
//     handleHeaderContextMenu,
//     handleBodyContextMenu,
//     copyBodyContextCell,
//     copyBodyContextRow,
//     copyBodyContextColumn,
//     renderHeaderContextMenu,
//     startResize,
//     setColumnFilterValue,
//     toggleColumnFiltering,
//     toggleFreezeColumn,
//     toggleSort,
//     unhideColumn,
//   };
// };






import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExportFileNameModal from "@/NAYSA Cloud/Lookup/SearchExport.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";
import { Calculator, CheckCircle2, Columns3, Copy, Download, Eye, EyeOff, FileText, Filter, FilterX, ListX, Pin, PinOff, Rows3, X } from "lucide-react";
import PdfTextCaptureModal from "@/NAYSA Cloud/Lookup/SearchPDFReader.jsx";

const MIN_VISIBLE_DATA_COLUMNS = 5;
const TABLE_EDITABLE_CONTROL_SELECTOR =
  "input:not([disabled]), textarea:not([disabled]), select:not([disabled])";
const CALCULATOR_COLUMN_KEYWORDS = [
  "debit",
  "credit",
  "price",
  "cost",
  "rate",
  "quantity",
  "qty",
];

const isCalculatorColumnKey = (key) => {
  const normalizedKey = String(key ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

  return CALCULATOR_COLUMN_KEYWORDS.some((keyword) =>
    normalizedKey.includes(keyword)
  );
};

const getCalculatorDecimalPlaces = (value) => {
  const normalizedValue = String(value ?? "").replace(/,/g, "").trim();
  if (!normalizedValue.includes(".")) return 0;

  return normalizedValue.split(".")[1]?.length || 0;
};

const formatCalculatorResultValue = (value, targetInput, fallbackDecimals = 2) => {
  const originalDecimals = getCalculatorDecimalPlaces(targetInput?.value);
  const decimalPlaces = Math.max(fallbackDecimals, originalDecimals);

  return Number(value || 0).toFixed(decimalPlaces);
};

export const transactionActionsHeaderStyle = {
  width: "110px",
  minWidth: "110px",
  maxWidth: "110px",
  zIndex: 25,
  backgroundClip: "padding-box",
  borderLeft: "1px solid rgba(148, 163, 184, 0.45)",
  boxShadow: "-8px 0 14px -12px rgba(15, 23, 42, 0.35)",
  backgroundImage: "none",
};

export const transactionActionsCellStyle = {
  width: "110px",
  minWidth: "110px",
  maxWidth: "110px",
  zIndex: 5,
  backgroundClip: "padding-box",
  borderLeft: "1px solid rgba(148, 163, 184, 0.35)",
  boxShadow: "-8px 0 14px -12px rgba(15, 23, 42, 0.28)",
  backgroundImage: "none",
};

export const useResizableTableColumns = (columns = []) => {
  const { companyInfo, currentUserRow } = useAuth();
  const [columnWidths, setColumnWidths] = useState({});
  const [columnOrder, setColumnOrder] = useState(() =>
    columns.map((column) => column.key)
  );
  const [sortConfigs, setSortConfigs] = useState([]);
  const [frozenColumnKeys, setFrozenColumnKeys] = useState([]);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState([]);
  const [filteringColumnKeys, setFilteringColumnKeys] = useState([]);
  const [groupedColumnKeys, setGroupedColumnKeys] = useState([]);
  const [showGroupColumnDropZone, setShowGroupColumnDropZone] = useState(false);
  const [isGroupColumnDragOver, setIsGroupColumnDragOver] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [headerContextMenu, setHeaderContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    key: null,
  });
  const [bodyContextMenu, setBodyContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const [showColumnVisibilityModal, setShowColumnVisibilityModal] = useState(false);
  const [showExportFileNameModal, setShowExportFileNameModal] = useState(false);
  const [showPdfTextCaptureModal, setShowPdfTextCaptureModal] = useState(false);
  const [pdfCapturedText, setPdfCapturedText] = useState("");
  const [copyFeedback, setCopyFeedback] = useState({ visible: false, label: "", x: 0, y: 0 });
  const copyFeedbackTimerRef = useRef(null);
  const [calculatorModal, setCalculatorModal] = useState({
    visible: false,
    x: 120,
    y: 120,
    width: 320,
    height: 460,
    expression: "",
    error: "",
    targetInput: null,
    columnKey: "",
    columnHeaderText: "",
  });
  const calculatorModalRef = useRef(calculatorModal);
  const resizingRef = useRef(null);
  const draggedColumnKeyRef = useRef(null);
  const headerContextTableRef = useRef(null);
  const bodyContextTableRef = useRef(null);
  const bodyContextCellRef = useRef(null);
  const contextMenuDragRef = useRef(null);
  const calculatorDragRef = useRef(null);
  const calculatorResizeRef = useRef(null);
  const setNativeControlValue = useCallback((control, value) => {
    if (!control) return;

    const prototype = Object.getPrototypeOf(control);
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    valueSetter?.call(control, value);

    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    control.dispatchEvent(new Event("blur", { bubbles: true }));
    control.focus?.();
  }, []);

  const evaluateCalculatorExpression = useCallback((expression = "") => {
    const cleanedExpression = String(expression || "")
      .replace(/,/g, "")
      .replace(/Ã—/g, "*")
      .replace(/Ã·/g, "/")
      .trim();

    if (!cleanedExpression) {
      return { error: "Enter an amount or formula.", value: null };
    }

    if (!/^[0-9+\-*/().\s]+$/.test(cleanedExpression)) {
      return { error: "Only numbers and + - * / ( ) are allowed.", value: null };
    }

    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${cleanedExpression});`)();
      const numericResult = Number(result);

      if (!Number.isFinite(numericResult)) {
        return { error: "Invalid calculator result.", value: null };
      }

      if (numericResult < 0) {
        return { error: "Negative result is not allowed.", value: null };
      }

      return { error: "", value: numericResult };
    } catch {
      return { error: "Invalid formula.", value: null };
    }
  }, []);


  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

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
    setFilteringColumnKeys((prev) =>
      prev.filter((key) => nextKeys.includes(key) && !isActionColumn(key))
    );
    setGroupedColumnKeys((prev) => {
      const nextGroupedKeys = prev.filter((key) => nextKeys.includes(key) && !isActionColumn(key));
      if (!nextGroupedKeys.length) {
        setShowGroupColumnDropZone(false);
      }
      return nextGroupedKeys;
    });
    setColumnFilters((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (nextKeys.includes(key) && !isActionColumn(key)) {
          next[key] = value;
        }
      });
      return next;
    });
  }, [columns, isActionColumn]);

  useEffect(() => {
    const handleCloseContextMenu = () => {
      setHeaderContextMenu((prev) =>
        prev.visible ? { visible: false, x: 0, y: 0, key: null } : prev
      );
      setBodyContextMenu((prev) =>
        prev.visible ? { visible: false, x: 0, y: 0 } : prev
      );
    };

    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        handleCloseContextMenu();
        setShowColumnVisibilityModal(false);
        setShowExportFileNameModal(false);
        setShowPdfTextCaptureModal(false);
      }
    };

    const handleForceCloseCellOptions = () => {
      setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
      setBodyContextMenu({ visible: false, x: 0, y: 0 });
    };

    document.addEventListener("click", handleCloseContextMenu);
    document.addEventListener("keydown", handleEscapeKey);
    window.addEventListener("naysa-close-table-cell-options", handleForceCloseCellOptions);

    return () => {
      document.removeEventListener("click", handleCloseContextMenu);
      document.removeEventListener("keydown", handleEscapeKey);
      window.removeEventListener("naysa-close-table-cell-options", handleForceCloseCellOptions);
    };
  }, []);

  useEffect(() => {
    const handleContextMenuDragMove = (e) => {
      if (!contextMenuDragRef.current) return;

      const { menuType, startX, startY, initialX, initialY } = contextMenuDragRef.current;
      const nextX = Math.max(8, Math.min(window.innerWidth - 80, initialX + (e.clientX - startX)));
      const nextY = Math.max(8, Math.min(window.innerHeight - 40, initialY + (e.clientY - startY)));

      if (menuType === "body") {
        setBodyContextMenu((prev) => ({ ...prev, x: nextX, y: nextY }));
      } else {
        setHeaderContextMenu((prev) => ({ ...prev, x: nextX, y: nextY }));
      }
    };

    const handleContextMenuDragEnd = () => {
      contextMenuDragRef.current = null;
    };

    document.addEventListener("mousemove", handleContextMenuDragMove);
    document.addEventListener("mouseup", handleContextMenuDragEnd);

    return () => {
      document.removeEventListener("mousemove", handleContextMenuDragMove);
      document.removeEventListener("mouseup", handleContextMenuDragEnd);
    };
  }, []);

  useEffect(() => {
    const handleCalculatorPointerMove = (e) => {
      if (calculatorDragRef.current) {
        const { startX, startY, initialX, initialY } = calculatorDragRef.current;
        const nextX = Math.max(8, Math.min(window.innerWidth - 80, initialX + (e.clientX - startX)));
        const nextY = Math.max(8, Math.min(window.innerHeight - 60, initialY + (e.clientY - startY)));
        setCalculatorModal((prev) => ({ ...prev, x: nextX, y: nextY }));
        return;
      }

      if (calculatorResizeRef.current) {
        const { startX, startY, startWidth, startHeight } = calculatorResizeRef.current;
        const nextWidth = Math.max(280, Math.min(window.innerWidth - 16, startWidth + (e.clientX - startX)));
        const nextHeight = Math.max(420, Math.min(window.innerHeight - 16, startHeight + (e.clientY - startY)));
        setCalculatorModal((prev) => ({ ...prev, width: nextWidth, height: nextHeight }));
      }
    };

    const handleCalculatorPointerUp = () => {
      calculatorDragRef.current = null;
      calculatorResizeRef.current = null;
    };

    document.addEventListener("mousemove", handleCalculatorPointerMove);
    document.addEventListener("mouseup", handleCalculatorPointerUp);

    return () => {
      document.removeEventListener("mousemove", handleCalculatorPointerMove);
      document.removeEventListener("mouseup", handleCalculatorPointerUp);
    };
  }, []);

  useEffect(() => {
    calculatorModalRef.current = calculatorModal;
    if (calculatorModal.visible) {
      window.__naysaTableCalculatorOpen = true;
      window.dispatchEvent(new CustomEvent("naysa-close-table-cell-options"));
    } else if (window.__naysaTableCalculatorOpen) {
      window.__naysaTableCalculatorOpen = false;
    }
  }, [calculatorModal]);

  useEffect(() => {
    if (!calculatorModal.visible) return;

    // Calculator acts as a true modal: hide any open cell menu and lock the page behind it.
    bodyContextCellRef.current = null;
    bodyContextTableRef.current = null;
    setBodyContextMenu({ visible: false, x: 0, y: 0 });
    setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [calculatorModal.visible]);

  useEffect(() => {
    if (!calculatorModal.visible) return;

    const handleCalculatorKeyDown = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setCalculatorModal((prev) => ({ ...prev, visible: false, error: "" }));
        return;
      }

      if (e.key === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        const currentCalculator = calculatorModalRef.current || {};
        const { error, value } = evaluateCalculatorExpression(currentCalculator.expression);
        if (error) {
          setCalculatorModal((prev) => ({ ...prev, error }));
          return;
        }
        setNativeControlValue(
          currentCalculator.targetInput,
          formatCalculatorResultValue(value, currentCalculator.targetInput)
        );
        setCalculatorModal((prev) => ({ ...prev, visible: false, error: "" }));
        return;
      }

      const activeTag = String(document.activeElement?.tagName || "").toLowerCase();
      const isTypingInsideCalculatorInput =
        activeTag === "input" &&
        document.activeElement?.dataset?.calculatorInput === "true";

      if (isTypingInsideCalculatorInput) return;

      const keyMap = {
        Add: "+",
        Subtract: "-",
        Multiply: "*",
        Divide: "/",
        Decimal: ".",
        NumpadAdd: "+",
        NumpadSubtract: "-",
        NumpadMultiply: "*",
        NumpadDivide: "/",
        NumpadDecimal: ".",
      };
      const printableKey =
        /^[0-9]$/.test(e.key) || ["+", "-", "*", "/", ".", "(", ")"].includes(e.key)
          ? e.key
          : keyMap[e.code] || keyMap[e.key] || "";

      if (printableKey) {
        e.preventDefault();
        setCalculatorModal((prev) => ({
          ...prev,
          expression: `${prev.expression}${printableKey}`,
          error: "",
        }));
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        setCalculatorModal((prev) => ({
          ...prev,
          expression: prev.expression.slice(0, -1),
          error: "",
        }));
      }
    };

    document.addEventListener("keydown", handleCalculatorKeyDown, true);
    return () => document.removeEventListener("keydown", handleCalculatorKeyDown, true);
  }, [calculatorModal.visible]);

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

  const getFilterableColumnKeys = useCallback(
    () => columns.filter((column) => !isActionColumn(column.key)).map((column) => column.key),
    [columns, isActionColumn]
  );

  const enableColumnFiltering = useCallback(
    (key) => {
      if (!key || isActionColumn(key)) return;
      setFilteringColumnKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    },
    [isActionColumn]
  );

  const disableColumnFiltering = useCallback(
    (key) => {
      if (!key || isActionColumn(key)) return;
      setFilteringColumnKeys((prev) => prev.filter((item) => item !== key));
      setColumnFilters((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [isActionColumn]
  );

  const enableAllColumnFiltering = useCallback(() => {
    setFilteringColumnKeys(getFilterableColumnKeys());
  }, [getFilterableColumnKeys]);

  const disableAllColumnFiltering = useCallback(() => {
    setFilteringColumnKeys([]);
    setColumnFilters({});
  }, []);

  const enableGroupColumn = useCallback(() => {
    setShowGroupColumnDropZone(true);
  }, []);

  const addGroupColumn = useCallback(
    (key) => {
      if (!key || isActionColumn(key)) return;

      setShowGroupColumnDropZone(true);
      setGroupedColumnKeys((prev) =>
        prev.includes(key) ? prev : [...prev, key]
      );
    },
    [isActionColumn]
  );

  const deleteGroupColumn = useCallback(
    (key = null) => {
      if (key && !isActionColumn(key)) {
        setGroupedColumnKeys((prev) => {
          const next = prev.filter((item) => item !== key);
          if (!next.length) {
            setShowGroupColumnDropZone(false);
          }
          return next;
        });
        return;
      }
      setGroupedColumnKeys([]);
      setShowGroupColumnDropZone(false);
    },
    [isActionColumn]
  );

  const toggleColumnFiltering = useCallback(
    (key = null) => {
      const filterableKeys = getFilterableColumnKeys();
      const isAllFilteringEnabled =
        filterableKeys.length > 0 &&
        filterableKeys.every((columnKey) => filteringColumnKeys.includes(columnKey));

      if (!key) {
        if (isAllFilteringEnabled) {
          disableAllColumnFiltering();
          return;
        }

        enableAllColumnFiltering();
        return;
      }

      if (isActionColumn(key)) return;
      if (filteringColumnKeys.includes(key)) {
        disableColumnFiltering(key);
        return;
      }
      enableColumnFiltering(key);
    },
    [
      disableAllColumnFiltering,
      disableColumnFiltering,
      enableAllColumnFiltering,
      enableColumnFiltering,
      filteringColumnKeys,
      getFilterableColumnKeys,
      isActionColumn,
    ]
  );

  const setColumnFilterValue = useCallback(
    (key, value) => {
      if (!key || isActionColumn(key)) return;
      setColumnFilters((prev) => ({ ...prev, [key]: value }));
    },
    [isActionColumn]
  );

  const clearColumnFilter = useCallback((key = null) => {
    setColumnFilters((prev) => {
      if (!key) return {};
      const next = { ...prev };
      delete next[key];
      return next;
    });
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

  const getFilteredRows = useCallback(
    (rows = [], getFilterValue) => {
      if (!Array.isArray(rows)) return rows;

      const activeFilters = Object.entries(columnFilters)
        .map(([key, value]) => [key, String(value ?? "").trim().toLowerCase()])
        .filter(
          ([key, value]) => value && filteringColumnKeys.includes(key) && !isActionColumn(key)
        );

      if (!activeFilters.length) return rows;

      return rows.filter((row) =>
        activeFilters.every(([key, filterValue]) => {
          const rawValue =
            typeof getFilterValue === "function" ? getFilterValue(row, key) : row?.[key];

          return String(rawValue ?? "").toLowerCase().includes(filterValue);
        })
      );
    },
    [columnFilters, filteringColumnKeys, isActionColumn]
  );

  const getSortedRows = useCallback(
    (rows = [], getSortValue, getFilterValue = null) => {
      const filteredRows = getFilteredRows(rows, getFilterValue || getSortValue);

      if (!Array.isArray(filteredRows)) {
        return filteredRows;
      }

      const groupedSortConfigs = groupedColumnKeys
        .filter((key) => !isActionColumn(key))
        .map((key) => ({ key, direction: "asc", isGroupSort: true }));
      const detailSortConfigs = sortConfigs.filter(
        (item) => !groupedSortConfigs.some((groupItem) => groupItem.key === item.key)
      );
      const combinedSortConfigs = [...groupedSortConfigs, ...detailSortConfigs];

      if (!combinedSortConfigs.length) {
        return filteredRows;
      }

      return [...filteredRows].sort((left, right) => {
        for (const sortConfig of combinedSortConfigs) {
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
    [compareSortValues, getFilteredRows, groupedColumnKeys, isActionColumn, sortConfigs]
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
    setIsGroupColumnDragOver(false);
  }, []);

  const handleGroupColumnDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGroupColumnDragOver(true);
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handleGroupColumnDragLeave = useCallback((e) => {
    const nextTarget = e.relatedTarget;
    if (nextTarget && e.currentTarget?.contains?.(nextTarget)) return;
    setIsGroupColumnDragOver(false);
  }, []);

  const handleGroupColumnDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      const droppedKey =
        draggedColumnKeyRef.current ||
        e.dataTransfer?.getData("text/plain") ||
        "";

      addGroupColumn(droppedKey);
      draggedColumnKeyRef.current = null;
      setIsGroupColumnDragOver(false);
    },
    [addGroupColumn]
  );

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

  const handleBodyContextMenu = useCallback((e) => {
    if (window.__naysaTableCalculatorOpen) return;
    const cell = e.currentTarget?.closest?.("td,th") || e.target?.closest?.("td,th");
    const row = cell?.closest?.("tr");
    const table = cell?.closest?.("table");

    if (!cell || !row || !table || cell.tagName === "TH") return;

    e.preventDefault();
    e.stopPropagation();

    bodyContextCellRef.current = cell;
    bodyContextTableRef.current = table;
    headerContextTableRef.current = table;

    setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
    setBodyContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    const handleDocumentBodyContextMenu = (e) => {
      if (window.__naysaTableCalculatorOpen) return;
      const cell = e.target?.closest?.("td");
      const row = cell?.closest?.("tr");
      const table = cell?.closest?.("table");

      if (!cell || !row || !table) return;

      e.preventDefault();
      e.stopPropagation();

      bodyContextCellRef.current = cell;
      bodyContextTableRef.current = table;
      headerContextTableRef.current = table;

      setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
      setBodyContextMenu({ visible: true, x: e.clientX, y: e.clientY });
    };

    document.addEventListener("contextmenu", handleDocumentBodyContextMenu, true);

    return () => {
      document.removeEventListener("contextmenu", handleDocumentBodyContextMenu, true);
    };
  }, []);

  const startContextMenuDrag = useCallback((e, menuType = "header") => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const currentMenu = menuType === "body" ? bodyContextMenu : headerContextMenu;
    contextMenuDragRef.current = {
      menuType,
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentMenu.x,
      initialY: currentMenu.y,
    };
  }, [bodyContextMenu, headerContextMenu]);

  const closeHeaderContextMenu = useCallback(() => {
    setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
  }, []);

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

  const getTableExportValue = useCallback(
    (cell) => {
      if (cell?.tagName === "TH") {
        const headerLabel = cell.querySelector("div span")?.textContent ?? cell.textContent ?? "";
        return String(headerLabel)
          .replace(/Filter\.\.\./gi, "")
          .replace(/\s+/g, " ")
          .trim();
      }

      return getCellClipboardValue(cell);
    },
    [getCellClipboardValue]
  );

  const escapeExcelHtmlValue = useCallback(
    (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;"),
    []
  );

  const getTableExcelHtml = useCallback(
    (table) => {
      const rows = Array.from(table.querySelectorAll("tr"));
      const skipColumnIndexes = new Set();

      rows[0]?.querySelectorAll("th,td").forEach((cell, index) => {
        const headerText = getTableExportValue(cell).toLowerCase();
        if (headerText === "action" || headerText === "actions") {
          skipColumnIndexes.add(index);
        }
      });

      const tableRowsHtml = rows
        .map((row) => {
          const cellsHtml = Array.from(row.querySelectorAll("th,td"))
            .filter((cell, index) => {
              if (skipColumnIndexes.has(index)) return false;
              const style = window.getComputedStyle(cell);
              return style.display !== "none" && style.visibility !== "hidden";
            })
            .map((cell) => {
              const tagName = cell.tagName === "TH" ? "th" : "td";
              const value = getTableExportValue(cell);
              const preserveAsText = /^0\d+$/.test(value) || /^\d+(?:-\d+)+$/.test(value);
              const style = preserveAsText ? ' style="mso-number-format:\\@;"' : "";

              return `<${tagName}${style}>${escapeExcelHtmlValue(value)}</${tagName}>`;
            })
            .join("");

          return cellsHtml ? `<tr>${cellsHtml}</tr>` : "";
        })
        .filter(Boolean)
        .join("");

      return `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="UTF-8" />
            <!-- Keeps worksheet gridlines visible when opened in Excel -->
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>Table Data</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              table {
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid #d9d9d9;
                mso-border-alt: solid #d9d9d9 .5pt;
              }
            </style>
          </head>
          <body><table border="1">${tableRowsHtml}</table></body>
        </html>`;
    },
    [escapeExcelHtmlValue, getTableExportValue]
  );

  const getTableExcelReportData = useCallback(
    (table) => {
      const rows = Array.from(table.querySelectorAll("tr"));
      const headerRow = rows.find((row) => row.querySelectorAll("th").length > 0);
      if (!headerRow) {
        return { data: [], visibleCols: [] };
      }

      const normalizeText = (value) =>
        String(value ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

      const normalizeNumericText = (value) =>
        String(value ?? "")
          .replace(/,/g, "")
          .replace(/\((.*)\)/, "-$1")
          .trim();

      const isNumericText = (value) => {
        const text = normalizeNumericText(value);
        return text !== "" && /^-?\d+(\.\d+)?$/.test(text);
      };

      const getDecimalPlaces = (value) => {
        const text = normalizeNumericText(value);
        const decimalPart = text.includes(".") ? text.split(".")[1] : "";
        return decimalPart.length;
      };

      const hasTextRightClass = (cell) => {
        if (!cell) return false;
        const classText = String(cell.className || "");
        return (
          classText.split(/\s+/).includes("text-right") ||
          Boolean(cell.querySelector?.(".text-right"))
        );
      };

      const isRightAligned = (cell) => {
        if (!cell) return false;
        if (hasTextRightClass(cell)) return true;

        const style = window.getComputedStyle(cell);
        return style.textAlign === "right";
      };

      const renderedColumns = getOrderedColumns(columns).filter(
        (column) => !isActionColumn(column.key)
      );

      const skipColumnIndexes = new Set();
      const visibleCols = [];
      const sourceColumnByExportIndex = [];
      const headerCells = Array.from(headerRow.querySelectorAll("th,td"));

      headerCells.forEach((cell, index) => {
        const headerText = getTableExportValue(cell);
        const normalizedHeaderText = normalizeText(headerText);
        const style = window.getComputedStyle(cell);

        if (
          normalizedHeaderText === "action" ||
          normalizedHeaderText === "actions" ||
          style.display === "none" ||
          style.visibility === "hidden"
        ) {
          skipColumnIndexes.add(index);
          return;
        }

        const matchedColumn =
          renderedColumns[visibleCols.length] ||
          columns.find(
            (column) =>
              normalizeText(column.label) === normalizedHeaderText ||
              normalizeText(column.key) === normalizedHeaderText
          );

        const dataCells = rows
          .filter((row) => row.querySelectorAll("td").length > 0)
          .map((row) => row.querySelectorAll("td,th")[index])
          .filter((dataCell) => {
            if (!dataCell) return false;
            const dataStyle = window.getComputedStyle(dataCell);
            return dataStyle.display !== "none" && dataStyle.visibility !== "hidden";
          });

        const values = dataCells.map((dataCell) => getTableExportValue(dataCell));
        const nonBlankValues = values.filter(
          (value) => String(value ?? "").trim() !== ""
        );
        const numericValues = nonBlankValues.filter(isNumericText);
        const shouldInferNumber =
          !matchedColumn?.renderType &&
          nonBlankValues.length > 0 &&
          numericValues.length === nonBlankValues.length &&
          dataCells.some(isRightAligned);

        const renderType =
          matchedColumn?.renderType || (shouldInferNumber ? "number" : "text");

        const maxDecimalPlaces = numericValues.reduce(
          (max, value) => Math.max(max, getDecimalPlaces(value)),
          0
        );

        visibleCols.push({
          ...(matchedColumn || {}),
          key: matchedColumn?.key || `col_${visibleCols.length}`,
          label: matchedColumn?.label || headerText || `Column ${visibleCols.length + 1}`,
          renderType,
          roundingOff:
            typeof matchedColumn?.roundingOff === "number"
              ? matchedColumn.roundingOff
              : renderType === "number" || renderType === "currency"
                ? maxDecimalPlaces || 2
                : matchedColumn?.roundingOff,
        });
        sourceColumnByExportIndex.push(index);
      });

      const data = rows
        .filter((row) => row.querySelectorAll("td").length > 0)
        .map((row) => {
          const rowData = {};

          sourceColumnByExportIndex.forEach((sourceIndex, dataColumnIndex) => {
            if (skipColumnIndexes.has(sourceIndex)) return;

            const cell = row.querySelectorAll("td,th")[sourceIndex];
            if (!cell) return;

            const style = window.getComputedStyle(cell);
            if (style.display === "none" || style.visibility === "hidden") return;

            const column = visibleCols[dataColumnIndex];
            if (!column) return;

            rowData[column.key] = getTableExportValue(cell);
          });

          return rowData;
        })
        .filter((row) =>
          Object.values(row).some((value) => String(value ?? "").trim() !== "")
        );

      return { data, visibleCols };
    },
    [columns, getOrderedColumns, getTableExportValue, isActionColumn]
  );

  const sanitizeExportFileName = useCallback((fileName = "") => {
    const cleanedFileName = String(fileName || "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ");

    return cleanedFileName || "Transaction Detail";
  }, []);

  const downloadHeaderContextTableToExcel = useCallback(
    async (fileName = "Transaction Detail") => {
      const table = headerContextTableRef.current;
      if (!table) return;

      const { data, visibleCols } = getTableExcelReportData(table);
      if (!data.length || !visibleCols.length) return;

      const safeFileName = sanitizeExportFileName(fileName || "Transaction Detail");
      const reportName = safeFileName.replace(/\.xlsx$/i, "") || "Transaction Detail";

      await exportGenericQueryExcel(
        data,
        {},
        visibleCols,
        [],
        visibleCols,
        {},
        7,
        reportName,
        currentUserRow?.userName || "",
        companyInfo?.compName || "",
        companyInfo?.compAddr || "",
        companyInfo?.telNo || "",
        reportName
      );

      setShowExportFileNameModal(false);
      setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
    },
    [
      companyInfo?.compAddr,
      companyInfo?.compName,
      companyInfo?.telNo,
      currentUserRow?.userName,
      getTableExcelReportData,
      sanitizeExportFileName,
    ]
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

  const writeTextToClipboard = useCallback(async (text = "") => {
    if (!text) return false;

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

    return true;
  }, []);

  const getActionColumnIndexes = useCallback(
    (table) => {
      const indexes = new Set();
      const headerRow = Array.from(table?.querySelectorAll("tr") || []).find(
        (row) => row.querySelectorAll("th").length > 0
      );

      headerRow?.querySelectorAll("th,td").forEach((cell, index) => {
        const headerText = getTableExportValue(cell).toLowerCase();
        if (headerText === "action" || headerText === "actions") {
          indexes.add(index);
        }
      });

      return indexes;
    },
    [getTableExportValue]
  );

  const getCellColumnIndex = useCallback((cell) => {
    const row = cell?.closest?.("tr");
    if (!row || !cell) return -1;
    return Array.from(row.querySelectorAll("th,td")).indexOf(cell);
  }, []);

  const normalizeCalculatorColumnKey = useCallback(
    (key) => String(key ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase(),
    []
  );

  const getColumnKeyByCell = useCallback(
    (cell, table) => {
      const columnIndex = getCellColumnIndex(cell);
      if (!cell || !table || columnIndex < 0) return "";

      const ordered = getOrderedColumns(columns);
      if (ordered[columnIndex]?.key) return ordered[columnIndex].key;

      const headerRow = Array.from(table.querySelectorAll("tr")).find(
        (tableRow) => tableRow.querySelectorAll("th").length > 0
      );
      const headerCell = headerRow?.querySelectorAll("th,td")?.[columnIndex];
      const headerText = String(getTableExportValue(headerCell) || "").toLowerCase();

      const matchingColumn = columns.find((column) => {
        const normalizedKey = normalizeCalculatorColumnKey(column.key);
        const normalizedLabel = String(column.label || "").toLowerCase();
        return (
          headerText === normalizedLabel ||
          headerText.includes(normalizedLabel) ||
          headerText.includes(normalizedKey)
        );
      });

      return matchingColumn?.key || "";
    },
    [columns, getCellColumnIndex, getOrderedColumns, getTableExportValue, normalizeCalculatorColumnKey]
  );

  const getColumnHeaderTextByCell = useCallback(
    (cell, table) => {
      const columnIndex = getCellColumnIndex(cell);
      if (!cell || !table || columnIndex < 0) return "";

      const headerRow = Array.from(table.querySelectorAll("tr")).find(
        (tableRow) => tableRow.querySelectorAll("th").length > 0
      );
      const headerCell = headerRow?.querySelectorAll("th,td")?.[columnIndex];
      return String(getTableExportValue(headerCell) || "").trim();
    },
    [getCellColumnIndex, getTableExportValue]
  );

  const getEditableControlFromCell = useCallback((cell) => {
    const control = cell?.querySelector?.(
      "input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])"
    );
    if (!control || control.type === "hidden") return null;

    const style = window.getComputedStyle(control);
    if (style.display === "none" || style.visibility === "hidden") return null;

    return control;
  }, []);

  const isCalculatorCell = useCallback(
    (cell, table) => {
      const columnKey = getColumnKeyByCell(cell, table);
      return (
        isCalculatorColumnKey(columnKey) &&
        Boolean(getEditableControlFromCell(cell))
      );
    },
    [getColumnKeyByCell, getEditableControlFromCell, normalizeCalculatorColumnKey]
  );



  const closeBodyContextMenu = useCallback(() => {
    setCopyFeedback({ visible: false, label: "", x: 0, y: 0 });
    setBodyContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  const showCopyDoneThenClose = useCallback((label = "Copied") => {
    if (copyFeedbackTimerRef.current) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }

    const feedbackX = Math.max(8, Number(bodyContextMenu.x || 0) + 18);
    const feedbackY = Math.max(8, Number(bodyContextMenu.y || 0) + 12);

    // Close the menu immediately. The copied confirmation is shown as a separate
    // floating toast so the user does not need to click a second time.
    window.dispatchEvent(new CustomEvent("naysa-close-table-cell-options"));
    setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
    setBodyContextMenu({ visible: false, x: 0, y: 0 });
    setCopyFeedback({ visible: true, label, x: feedbackX, y: feedbackY });

    copyFeedbackTimerRef.current = window.setTimeout(() => {
      setCopyFeedback({ visible: false, label: "", x: 0, y: 0 });
    }, 700);
  }, [bodyContextMenu.x, bodyContextMenu.y]);

  const openBodyCalculator = useCallback((sourceCell = null, sourceTable = null, sourcePosition = null) => {
    const cell = sourceCell || bodyContextCellRef.current;
    const table = sourceTable || bodyContextTableRef.current;
    if (!cell || !table || !isCalculatorCell(cell, table)) return;

    const targetInput = getEditableControlFromCell(cell);
    const columnKey = getColumnKeyByCell(cell, table);
    const columnHeaderText = getColumnHeaderTextByCell(cell, table) || columnKey;
    const existingValue = String(targetInput?.value ?? "").replace(/,/g, "").trim();
    const menuX = Number(sourcePosition?.x ?? bodyContextMenu.x ?? 8);
    const menuY = Number(sourcePosition?.y ?? bodyContextMenu.y ?? 8);

    // Hard close every table cell menu instance before rendering the calculator.
    window.dispatchEvent(new CustomEvent("naysa-close-table-cell-options"));
    bodyContextCellRef.current = null;
    bodyContextTableRef.current = null;
    setBodyContextMenu({ visible: false, x: 0, y: 0 });
    setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });

    requestAnimationFrame(() => {
      setCalculatorModal((prev) => ({
        ...prev,
        visible: true,
        x: Math.max(8, Math.min(window.innerWidth - prev.width - 8, menuX + 12)),
        y: Math.max(8, Math.min(window.innerHeight - prev.height - 8, menuY + 12)),
        expression: existingValue && Number(existingValue) !== 0 ? existingValue : "",
        error: "",
        targetInput,
        columnKey,
        columnHeaderText,
      }));
    });
  }, [bodyContextMenu.x, bodyContextMenu.y, getColumnHeaderTextByCell, getColumnKeyByCell, getEditableControlFromCell, isCalculatorCell]);

  const calculateCalculatorResult = useCallback(() => {
    const currentCalculator = calculatorModalRef.current || calculatorModal;
    const { error, value } = evaluateCalculatorExpression(currentCalculator.expression);
    if (error) {
      setCalculatorModal((prev) => ({ ...prev, error }));
      return;
    }

    setCalculatorModal((prev) => ({
      ...prev,
      expression: formatCalculatorResultValue(value, currentCalculator.targetInput),
      error: "",
    }));
  }, [calculatorModal, evaluateCalculatorExpression]);

  const applyCalculatorValue = useCallback(() => {
    const currentCalculator = calculatorModalRef.current || calculatorModal;
    const { error, value } = evaluateCalculatorExpression(currentCalculator.expression);
    if (error) {
      setCalculatorModal((prev) => ({ ...prev, error }));
      return;
    }

    const formattedValue = formatCalculatorResultValue(
      value,
      currentCalculator.targetInput
    );
    setNativeControlValue(currentCalculator.targetInput, formattedValue);
    setCalculatorModal((prev) => ({ ...prev, visible: false, error: "" }));
  }, [calculatorModal, evaluateCalculatorExpression, setNativeControlValue]);

  const startCalculatorDrag = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    calculatorDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: calculatorModal.x,
      initialY: calculatorModal.y,
    };
  }, [calculatorModal.x, calculatorModal.y]);

  const startCalculatorResize = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    calculatorResizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: calculatorModal.width,
      startHeight: calculatorModal.height,
    };
  }, [calculatorModal.height, calculatorModal.width]);

  const copyBodyContextCell = useCallback(async () => {
    const cell = bodyContextCellRef.current;
    const table = bodyContextTableRef.current;
    if (!cell || !table) return;

    const columnIndex = getCellColumnIndex(cell);
    if (getActionColumnIndexes(table).has(columnIndex)) return;

    await writeTextToClipboard(getExcelClipboardValue(cell));
    showCopyDoneThenClose("Cell copied");
  }, [getActionColumnIndexes, getCellColumnIndex, getExcelClipboardValue, showCopyDoneThenClose, writeTextToClipboard]);

  const copyBodyContextRow = useCallback(async () => {
    const cell = bodyContextCellRef.current;
    const table = bodyContextTableRef.current;
    const row = cell?.closest?.("tr");
    if (!cell || !table || !row) return;

    const actionColumnIndexes = getActionColumnIndexes(table);
    const headerRow = Array.from(table.querySelectorAll("tr")).find(
      (tableRow) => tableRow.querySelectorAll("th").length > 0
    );

    const isVisibleCell = (targetCell) => {
      if (!targetCell) return false;
      const style = window.getComputedStyle(targetCell);
      return style.display !== "none" && style.visibility !== "hidden";
    };

    const headerText = headerRow
      ? Array.from(headerRow.querySelectorAll("th,td"))
          .filter((headerCell, index) => !actionColumnIndexes.has(index) && isVisibleCell(headerCell))
          .map(getExcelClipboardValue)
          .join("\t")
      : "";

    const rowText = Array.from(row.querySelectorAll("td,th"))
      .filter((rowCell, index) => !actionColumnIndexes.has(index) && isVisibleCell(rowCell))
      .map(getExcelClipboardValue)
      .join("\t");

    const text = [headerText, rowText].filter((line) => String(line ?? "").trim()).join("\n");
    if (!text) return;

    await writeTextToClipboard(text);
    showCopyDoneThenClose("Row copied");
  }, [getActionColumnIndexes, getExcelClipboardValue, showCopyDoneThenClose, writeTextToClipboard]);

  const copyBodyContextColumn = useCallback(async () => {
    const cell = bodyContextCellRef.current;
    const table = bodyContextTableRef.current;
    if (!cell || !table) return;

    const columnIndex = getCellColumnIndex(cell);
    if (columnIndex < 0 || getActionColumnIndexes(table).has(columnIndex)) return;

    const headerRow = Array.from(table.querySelectorAll("tr")).find(
      (tableRow) => tableRow.querySelectorAll("th").length > 0
    );
    const headerCell = headerRow?.querySelectorAll("th,td")?.[columnIndex];
    const headerText = headerCell ? getExcelClipboardValue(headerCell) : "";

    const columnValues = Array.from(table.querySelectorAll("tr"))
      .map((row) => row.querySelectorAll("td,th")[columnIndex])
      .filter((columnCell) => {
        if (!columnCell || columnCell.tagName === "TH") return false;
        const style = window.getComputedStyle(columnCell);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .map(getExcelClipboardValue)
      .filter((value) => String(value ?? "").trim() !== "");

    const text = [headerText, ...columnValues]
      .filter((value) => String(value ?? "").trim() !== "")
      .join("\n");
    if (!text) return;

    await writeTextToClipboard(text);
    showCopyDoneThenClose("Column copied");
  }, [getActionColumnIndexes, getCellColumnIndex, getExcelClipboardValue, showCopyDoneThenClose, writeTextToClipboard]);

  const copyHeaderContextTable = useCallback(async () => {
    const table = headerContextTableRef.current;
    if (!table) return;

    const text = getTableClipboardText(table);
    if (!text) return;

    await writeTextToClipboard(text);

    setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
  }, [getTableClipboardText, writeTextToClipboard]);

  const renderGroupColumnDropZone = useCallback(() => {
    if (!showGroupColumnDropZone && !groupedColumnKeys.length) return null;

    const groupedColumns = groupedColumnKeys
      .map((key) => columnMetaMap.get(key) || columns.find((column) => column.key === key))
      .filter(Boolean);

    return (
      <div
        className={`mb-2 rounded-xl border border-dashed px-3 py-2 transition ${
          isGroupColumnDragOver
            ? "border-blue-500 bg-blue-50 shadow-sm"
            : "border-slate-300 bg-slate-50"
        }`}
        onDragOver={handleGroupColumnDragOver}
        onDragLeave={handleGroupColumnDragLeave}
        onDrop={handleGroupColumnDrop}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">
            Group columns:
          </span>
          {groupedColumns.length ? (
            groupedColumns.map((column) => (
              <span
                key={column.key}
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
              >
                {column.label || column.key}
                <button
                  type="button"
                  className="ml-1 rounded-full px-1 text-blue-700 hover:bg-blue-200"
                  onClick={() => deleteGroupColumn(column.key)}
                  aria-label={`Remove ${column.label || column.key} group`}
                >
                  Ãƒâ€”
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">
              Drag a column header here to group the table.
            </span>
          )}
          {groupedColumns.length > 0 && (
            <button
              type="button"
              className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              onClick={() => deleteGroupColumn()}
            >
              Clear groups
            </button>
          )}
        </div>
      </div>
    );
  }, [
    columnMetaMap,
    columns,
    deleteGroupColumn,
    groupedColumnKeys,
    handleGroupColumnDragLeave,
    handleGroupColumnDragOver,
    handleGroupColumnDrop,
    isGroupColumnDragOver,
    showGroupColumnDropZone,
  ]);

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
          {filteringColumnKeys.includes(key) && !isActionColumn(key) && (
            <Filter className="h-3 w-3 shrink-0 text-blue-600" aria-hidden="true" />
          )}
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
        {filteringColumnKeys.includes(key) && !isActionColumn(key) && (
          <div className="mt-1 px-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={columnFilters[key] || ""}
              placeholder="Filter..."
              className="h-6 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-normal text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              onChange={(e) => setColumnFilterValue(key, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        )}
        <button
          type="button"
          aria-label={`Resize ${label} column`}
          className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none touch-none bg-transparent hover:bg-blue-300/40"
          onMouseDown={(e) => startResize(e, key, fallbackWidth)}
        />
      </th>
    ),
    [
      columnFilters,
      columns,
      filteringColumnKeys,
      getColumnStyle,
      getFrozenColumnStyle,
      handleColumnDragEnd,
      handleColumnDragOver,
      handleColumnDragStart,
      handleColumnDrop,
      handleHeaderContextMenu,
      isActionColumn,
      setColumnFilterValue,
      startResize,
      sortConfigs,
      toggleSort,
    ]
  );

  const renderHeaderContextMenu = useCallback(() => {
    const isFrozen = frozenColumnKeys.includes(headerContextMenu.key);
    const filterableColumnKeys = getFilterableColumnKeys();
    const isAllFilteringEnabled =
      filterableColumnKeys.length > 0 &&
      filterableColumnKeys.every((key) => filteringColumnKeys.includes(key));
    const manageableColumns = columns.filter(
      (column) => !isActionColumn(column.key)
    );
    const visibleDataColumnCount = getVisibleDataColumnCount();
    const tableHasRows = Boolean(
      headerContextTableRef.current?.querySelector("tbody tr, tr td")
    );
    const disabledMenuItemClass =
      "cursor-not-allowed text-slate-400 opacity-50 hover:bg-transparent";
    const enabledMenuItemClass = "text-slate-700 hover:bg-slate-100";
    const getMenuItemClassName = (isEnabled = true) =>
      `flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
        isEnabled ? enabledMenuItemClass : disabledMenuItemClass
      }`;
    const getMenuIconClassName = (isEnabled = true) =>
      `h-4 w-4 shrink-0 ${isEnabled ? "text-slate-500" : "text-slate-400"}`;

    const contextMenu =
      headerContextMenu.visible && headerContextMenu.key ? (
        <div
          className="fixed min-w-[230px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
          style={{
            top: `${headerContextMenu.y}px`,
            left: `${headerContextMenu.x}px`,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex cursor-move items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            onMouseDown={(e) => startContextMenuDrag(e, "header")}
          >
            <span>Table options</span>
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-sm leading-none text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={closeHeaderContextMenu}
              aria-label="Close table options"
            >
              x
            </button>
          </div>
          <div className="py-1">
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Data
            </div>
            <button
              type="button"
              disabled={!tableHasRows}
              className={getMenuItemClassName(tableHasRows)}
              onClick={tableHasRows ? copyHeaderContextTable : undefined}
            >
              <Copy className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
              <span>Copy table</span>
            </button>
            <button
              type="button"
              disabled={!tableHasRows}
              className={getMenuItemClassName(tableHasRows)}
              onClick={
                tableHasRows
                  ? () => {
                      setShowExportFileNameModal(true);
                      setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
                    }
                  : undefined
              }
            >
              <Download className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
              <span>Download to Excel</span>
            </button>
            <button
              type="button"
              className={getMenuItemClassName(true)}
              onClick={() => {
                setShowPdfTextCaptureModal(true);
                setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
              }}
            >
              <FileText className={getMenuIconClassName(true)} aria-hidden="true" />
              <span>Open PDF Text Capture</span>
            </button>

            <div className="my-1 border-t border-slate-100" />
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Sort & Filter
            </div>
            <button
              type="button"
              disabled={!tableHasRows}
              className={getMenuItemClassName(tableHasRows)}
              onClick={
                tableHasRows
                  ? () => {
                      clearSort(headerContextMenu.key);
                      setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
                    }
                  : undefined
              }
            >
              <ListX className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
              <span>Clear sorting</span>
            </button>
            <button
              type="button"
              disabled={!tableHasRows}
              className={getMenuItemClassName(tableHasRows)}
              onClick={
                tableHasRows
                  ? () => {
                      toggleColumnFiltering();
                      setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
                    }
                  : undefined
              }
            >
              {isAllFilteringEnabled ? (
                <FilterX className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
              ) : (
                <Filter className={getMenuIconClassName(tableHasRows)} aria-hidden="true" />
              )}
              <span>{isAllFilteringEnabled ? "Disable filtering" : "Enable filtering"}</span>
            </button>

            <div className="my-1 border-t border-slate-100" />
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Column Tools
            </div>
            <button
              type="button"
              className={getMenuItemClassName(true)}
              onClick={() => {
                toggleFreezeColumn(headerContextMenu.key);
                setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
              }}
            >
              {isFrozen ? (
                <PinOff className={getMenuIconClassName(true)} aria-hidden="true" />
              ) : (
                <Pin className={getMenuIconClassName(true)} aria-hidden="true" />
              )}
              <span>{isFrozen ? "Unfreeze column" : "Freeze column on left"}</span>
            </button>
            <button
              type="button"
              className={getMenuItemClassName(true)}
              onClick={() => {
                setShowColumnVisibilityModal(true);
                setHeaderContextMenu({ visible: false, x: 0, y: 0, key: null });
              }}
            >
              <Eye className={getMenuIconClassName(true)} aria-hidden="true" />
              <span>Manage columns</span>
            </button>
          </div>
        </div>
      ) : null;

    const copyFeedbackElement = copyFeedback.visible ? (
      <div
        className="fixed pointer-events-none inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-[0_10px_28px_rgba(37,99,235,0.28)] transition-all duration-300 animate-[naysaCopyPulse_900ms_ease-out]"
        style={{
          top: `${copyFeedback.y}px`,
          left: `${copyFeedback.x}px`,
          zIndex: 1300,
        }}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        <span>{copyFeedback.label || "Copied"}</span>
      </div>
    ) : null;

    const bodyTable = bodyContextTableRef.current;
    const bodyCell = bodyContextCellRef.current;
    const bodyColumnIndex = getCellColumnIndex(bodyCell);
    const isBodyActionColumn = Boolean(
      bodyTable && bodyColumnIndex >= 0 && getActionColumnIndexes(bodyTable).has(bodyColumnIndex)
    );
    const canOpenBodyCalculator = Boolean(
      bodyCell && bodyTable && !isBodyActionColumn && isCalculatorCell(bodyCell, bodyTable)
    );
    const bodyContextMenuElement =
      bodyContextMenu.visible && !calculatorModal.visible && !window.__naysaTableCalculatorOpen && bodyCell && bodyTable ? (
        <div
          className="fixed min-w-[210px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
          style={{
            top: `${bodyContextMenu.y}px`,
            left: `${bodyContextMenu.x}px`,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
        @keyframes naysaCopyPulse {
          0% { opacity: 0; transform: translateY(6px) scale(0.96); }
          18% { opacity: 1; transform: translateY(0) scale(1.04); }
          55% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {copyFeedback.visible && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 backdrop-blur-[1px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-[0_8px_22px_rgba(37,99,235,0.22)] transition-all duration-300 animate-[naysaCopyPulse_900ms_ease-out]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{copyFeedback.label || "Copied"}</span>
              </div>
            </div>
          )}
          <div
            className="flex cursor-move items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            onMouseDown={(e) => startContextMenuDrag(e, "body")}
          >
            <span>Cell options</span>
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-sm leading-none text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={closeBodyContextMenu}
              aria-label="Close cell options"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="py-1">
          <button
            type="button"
            disabled={isBodyActionColumn}
            className={getMenuItemClassName(!isBodyActionColumn)}
            onClick={isBodyActionColumn ? undefined : (e) => {
              e.preventDefault();
              e.stopPropagation();
              copyBodyContextCell();
            }}
          >
            <Copy className={getMenuIconClassName(!isBodyActionColumn)} aria-hidden="true" />
            <span>Copy cell record</span>
          </button>
          <button
            type="button"
            className={getMenuItemClassName(true)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              copyBodyContextRow();
            }}
          >
            <Rows3 className={getMenuIconClassName(true)} aria-hidden="true" />
            <span>Copy row record</span>
          </button>
          <button
            type="button"
            disabled={isBodyActionColumn}
            className={getMenuItemClassName(!isBodyActionColumn)}
            onClick={isBodyActionColumn ? undefined : (e) => {
              e.preventDefault();
              e.stopPropagation();
              copyBodyContextColumn();
            }}
          >
            <Columns3 className={getMenuIconClassName(!isBodyActionColumn)} aria-hidden="true" />
            <span>Copy column record</span>
          </button>
          {canOpenBodyCalculator && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                className={getMenuItemClassName(true)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const sourceCell = bodyContextCellRef.current;
                  const sourceTable = bodyContextTableRef.current;
                  const sourcePosition = { x: bodyContextMenu.x, y: bodyContextMenu.y };

                  // Remove every cell options menu immediately, then open calculator on the next frame.
                  window.dispatchEvent(new CustomEvent("naysa-close-table-cell-options"));
                  bodyContextCellRef.current = null;
                  bodyContextTableRef.current = null;
                  setBodyContextMenu({ visible: false, x: 0, y: 0 });

                  requestAnimationFrame(() => {
                    openBodyCalculator(sourceCell, sourceTable, sourcePosition);
                  });
                }}
              >
                <Calculator className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                <span>Open calculator</span>
              </button>
            </>
          )}
          </div>
        </div>
      ) : null;

    const calculatorModalElement = calculatorModal.visible ? (
      <>
        <div
          className="fixed inset-0 bg-slate-950/35 backdrop-blur-sm"
          style={{ zIndex: 1190 }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />

        <div
          className="fixed flex flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl"
          style={{
            top: `${calculatorModal.y}px`,
            left: `${calculatorModal.x}px`,
            width: `min(${calculatorModal.width}px, calc(100vw - 16px))`,
            height: `min(${calculatorModal.height}px, calc(100vh - 16px))`,
            zIndex: 1200,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div
            className="flex cursor-move items-center justify-between border-b border-white/20 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 px-4 py-3 text-white shadow-sm"
            onMouseDown={startCalculatorDrag}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-sm ring-1 ring-white/20">
                <Calculator className="h-5 w-5" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight">Calculator</div>
                <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-blue-50/90">
                  {calculatorModal.columnHeaderText || calculatorModal.columnKey}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="rounded-full p-2 text-white/90 transition hover:bg-white/20 hover:text-white active:scale-95"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() =>
                setCalculatorModal((prev) => ({ ...prev, visible: false, error: "" }))
              }
              aria-label="Close calculator"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
              <input
                type="text"
                autoFocus
                data-calculator-input="true"
                value={calculatorModal.expression}
                placeholder="0.00"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-xl font-bold tracking-tight text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                onChange={(e) =>
                  setCalculatorModal((prev) => ({
                    ...prev,
                    expression: e.target.value,
                    error: "",
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.code === "NumpadEnter") {
                    e.preventDefault();
                    applyCalculatorValue();
                    return;
                  }

                  if (e.key === "=") {
                    e.preventDefault();
                    calculateCalculatorResult();
                    return;
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();
                    setCalculatorModal((prev) => ({
                      ...prev,
                      visible: false,
                      error: "",
                    }));
                  }
                }}
              />

              <div className="mt-2 min-h-[18px] text-right text-[11px]">
                {calculatorModal.error ? (
                  <span className="font-semibold text-red-600">
                    {calculatorModal.error}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Press Enter to apply. Press = to calculate.
                  </span>
                )}
              </div>
            </div>

            <div className="grid flex-1 grid-cols-4 gap-2">
              {[
                "7", "8", "9", "/",
                "4", "5", "6", "*",
                "1", "2", "3", "-",
                "0", ".", "+", "=",
              ].map((keyValue) => {
                const isOperator = ["/", "*", "-", "+", "="].includes(keyValue);

                return (
                  <button
                    key={keyValue}
                    type="button"
                    className={`min-h-[42px] rounded-2xl border px-2 py-2 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 active:scale-95 sm:min-h-[48px] ${
                      keyValue === "="
                        ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                        : isOperator
                          ? "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      if (keyValue === "=") {
                        calculateCalculatorResult();
                        return;
                      }

                      setCalculatorModal((prev) => ({
                        ...prev,
                        expression: `${prev.expression}${keyValue}`,
                        error: "",
                      }));
                    }}
                  >
                    {keyValue}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
                onClick={() =>
                  setCalculatorModal((prev) => ({ ...prev, expression: "", error: "" }))
                }
              >
                Clear
              </button>

              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
                onClick={() =>
                  setCalculatorModal((prev) => ({
                    ...prev,
                    expression: prev.expression.slice(0, -1),
                    error: "",
                  }))
                }
              >
                Back
              </button>

              <button
                type="button"
                className="rounded-2xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
                onClick={applyCalculatorValue}
              >
                Apply
              </button>
            </div>
          </div>

          <button
            type="button"
            className="absolute bottom-2 right-2 h-5 w-5 cursor-nwse-resize rounded-br-[18px] rounded-tl-xl bg-slate-300/80 transition hover:bg-blue-400"
            onMouseDown={startCalculatorResize}
            aria-label="Resize calculator"
            title="Resize calculator"
          />
        </div>
      </>
    ) : null;

    const columnVisibilityModal = showColumnVisibilityModal ? (
      <div
        className="fixed inset-0 flex items-center justify-center bg-slate-900/30"
        style={{ zIndex: 1100 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setShowColumnVisibilityModal(false);
        setShowExportFileNameModal(false);
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

    const exportFileNameModal = showExportFileNameModal ? (
      <ExportFileNameModal
        isOpen={showExportFileNameModal}
        title="Export Table"
        defaultFileName="Transaction Detail"
        confirmText="Export"
        onClose={() => setShowExportFileNameModal(false)}
        onConfirm={downloadHeaderContextTableToExcel}
      />
    ) : null;

    const pdfTextCaptureModal = showPdfTextCaptureModal ? (
      <PdfTextCaptureModal
        isOpen={showPdfTextCaptureModal}
        title="PDF Text Capture"
        initialText={pdfCapturedText}
        onClose={() => setShowPdfTextCaptureModal(false)}
        onApply={(text) => {
          setPdfCapturedText(text || "");
          setShowPdfTextCaptureModal(false);
        }}
      />
    ) : null;

    if (!contextMenu && !copyFeedbackElement && !bodyContextMenuElement && !calculatorModalElement && !columnVisibilityModal && !exportFileNameModal && !pdfTextCaptureModal) {
      return null;
    }

    return (
      <>
        {contextMenu}
        {copyFeedbackElement}
        {bodyContextMenuElement}
        {calculatorModalElement}
        {columnVisibilityModal}
        {exportFileNameModal}
        {pdfTextCaptureModal}
      </>
    );
  }, [
    bodyContextMenu,
    copyFeedback,
    clearSort,
    deleteGroupColumn,
    enableGroupColumn,
    copyBodyContextCell,
    copyBodyContextColumn,
    copyBodyContextRow,
    calculatorModal,
    applyCalculatorValue,
    calculateCalculatorResult,
    copyHeaderContextTable,
    downloadHeaderContextTableToExcel,
    getActionColumnIndexes,
    getCellColumnIndex,
    columns,
    filteringColumnKeys,
    frozenColumnKeys,
    groupedColumnKeys,
    getFilterableColumnKeys,
    getVisibleDataColumnCount,
    headerContextMenu,
    hiddenColumnKeys,
    isActionColumn,
    showColumnVisibilityModal,
    showExportFileNameModal,
    showPdfTextCaptureModal,
    pdfCapturedText,
    isCalculatorCell,
    openBodyCalculator,
    startCalculatorDrag,
    startCalculatorResize,
    startContextMenuDrag,
    toggleColumnFiltering,
    toggleFreezeColumn,
    toggleColumnVisibility,
  ]);

  return {
    columnWidths,
    columnOrder,
    frozenColumnKeys,
    hiddenColumnKeys,
    filteringColumnKeys,
    groupedColumnKeys,
    showGroupColumnDropZone,
    columnFilters,
    sortConfigs,
    setColumnWidths,
    setColumnOrder,
    setFrozenColumnKeys,
    setHiddenColumnKeys,
    setFilteringColumnKeys,
    setGroupedColumnKeys,
    setShowGroupColumnDropZone,
    setColumnFilters,
    setSortConfigs,
    pdfCapturedText,
    setPdfCapturedText,
    setShowPdfTextCaptureModal,
    clearAllSorting,
    clearColumnFilter,
    clearZeroValueOnFocus,
    clearSort,
    disableAllColumnFiltering,
    disableColumnFiltering,
    deleteGroupColumn,
    downloadHeaderContextTableToExcel,
    enableAllColumnFiltering,
    enableColumnFiltering,
    enableGroupColumn,
    addGroupColumn,
    focusNextRowInput,
    getColumnStyle,
    getFilterableColumnKeys,
    getFilteredRows,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    hideColumn,
    reorderColumns,
    renderGroupColumnDropZone,
    renderResizableHeader,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDragStart,
    handleColumnDrop,
    handleHeaderContextMenu,
    handleBodyContextMenu,
    copyBodyContextCell,
    copyBodyContextRow,
    copyBodyContextColumn,
    renderHeaderContextMenu,
    startResize,
    setColumnFilterValue,
    toggleColumnFiltering,
    toggleFreezeColumn,
    toggleSort,
    unhideColumn,
  };
};
