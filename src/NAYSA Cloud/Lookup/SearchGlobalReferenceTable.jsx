// SearchGlobalReferenceTable.jsx
import {
    useEffect,
    useMemo,
    useState,
    useRef,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSort,
    faSortUp,
    faSortDown,
    faChevronRight,
    faChevronDown,
    faTimes,
    faLayerGroup,
    faCompressArrowsAlt,
    faExpandArrowsAlt,
    faFileExcel,
    faColumns,
    faFilePdf,
    faFileImage,
    faFileExport,
    faFileCsv,
} from "@fortawesome/free-solid-svg-icons";

import {
    reftables,
} from "@/NAYSA Cloud/Global/reftable";

import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
    formatNumber,
    parseFormattedNumber,
} from "@/NAYSA Cloud/Global/behavior";
import { useReturnToDate } from "@/NAYSA Cloud/Global/dates";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const TableLoader = () => (
    <div className="global-ref-norecords-ui">Loading...</div>
);

const SearchGlobalReferenceTable = forwardRef(
    (
        {
            columns = [],
            data = [],
            itemsPerPage = 50,
            showFilters = true,
            docType,

            //   // action buttons
            //   rightActionLabel = null,
            //   onRowAction, // View button
            //   onRowActionsClick, // secondary action (gear/pencil/etc)
            //   actionsIcon,
            //   actionsTitle,

            onRowDoubleClick,
            className = "",

            // keep same state hooks style as SearchGlobalReportTable
            initialState,
            onStateChange,
            totalExemptions = ["rate", "percent", "ratio", "id", "code"],

            // optional loading flag from parent
            isLoading = false,
        },
        ref
    ) => {
        const scrollRef = useRef(null);
        const exportContainerRef = useRef(null);

        const [filters, setFilters] = useState(() => initialState?.filters || {});
        const [sortConfig, setSortConfig] = useState(
            () => initialState?.sortConfig || { key: null, direction: null }
        );
        const [currentPage, setCurrentPage] = useState(
            () => Number(initialState?.currentPage) || 1
        );

        // ✅ Rows per page (supports: All/10/20/50/100)
        // - 0 means ALL
        const [rowsPerPage, setRowsPerPage] = useState(() => {
            const init = Number(initialState?.itemsPerPage ?? itemsPerPage ?? 50);
            return Number.isFinite(init) ? init : 50;
        });

        const [columnOrder, setColumnOrder] = useState([]);
        const [groupBy, setGroupBy] = useState(() => initialState?.groupBy || []);
        const [expandedGroups, setExpandedGroups] = useState({});
        const [draggedCol, setDraggedCol] = useState(null);

        const [colWidths, setColWidths] = useState({});
        const resizingRef = useRef(null);

        const [userHiddenCols, setUserHiddenCols] = useState(
            () => initialState?.userHiddenCols || []
        );

        const [showColumnChooser, setShowColumnChooser] = useState(false);
        const [showExportMenu, setShowExportMenu] = useState(false);

        const { companyInfo, currentUserRow } = useAuth();

        // ✅ keep columnOrder in sync with columns (important for dynamic cols like __actions)
        useEffect(() => {
            const keys = (columns || []).map((c) => c.key).filter(Boolean);
            if (!keys.length) return;

            setColumnOrder((prev) => {
                const prevArr = Array.isArray(prev) ? prev : [];
                const prevSet = new Set(prevArr);

                // keep only keys that still exist
                const kept = prevArr.filter((k) => keys.includes(k));

                // append new keys not yet in order (ex: "__actions")
                const added = keys.filter((k) => !prevSet.has(k));

                // if nothing changed, return prev to avoid re-render loop
                if (kept.length === prevArr.length && added.length === 0) return prevArr;

                return [...kept, ...added];
            });
        }, [columns]);


        // notify parent
        useEffect(() => {
            onStateChange?.({
                filters,
                sortConfig,
                currentPage,
                groupBy,
                userHiddenCols,
                itemsPerPage: rowsPerPage,
            });
        }, [filters, sortConfig, currentPage, groupBy, userHiddenCols, rowsPerPage, onStateChange]);

        // reset expansions when grouping changes
        useEffect(() => {
            setExpandedGroups({});
            setCurrentPage(1);
        }, [groupBy]);

        // clear grouping if data becomes empty
        useEffect(() => {
            if (!data || data.length === 0) {
                if (groupBy.length > 0) setGroupBy([]);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [data]);

        // --- Utilities ---
        const parseNumber = (v) => {
            if (typeof parseFormattedNumber === "function") {
                const n = parseFormattedNumber(v);
                return typeof n === "number"
                    ? n
                    : Number(String(v ?? "").replace(/,/g, ""));
            }
            return typeof v === "number"
                ? v
                : Number(String(v ?? "").replace(/,/g, ""));
        };

        const formatValue = (value, col) => {
            if (value === null || value === undefined) return "";
            switch (col?.renderType) {
                case "number":
                case "currency": {
                    const digits =
                        typeof col?.roundingOff === "number" ? col.roundingOff : 2;
                    return typeof formatNumber === "function"
                        ? formatNumber(value, digits)
                        : Number(parseNumber(value)).toLocaleString("en-US", {
                            minimumFractionDigits: digits,
                            maximumFractionDigits: digits,
                        });
                }
                case "date": {
                    try {
                        const datePart = String(value).split("T")[0];
                        return typeof useReturnToDate === "function"
                            ? useReturnToDate(datePart)
                            : datePart;
                    } catch {
                        return String(value);
                    }
                }
                default:
                    return String(value ?? "");
            }
        };

        // --- Columns processing ---
        const orderedCols = useMemo(() => {
            if (columnOrder.length === 0) return columns;
            return columnOrder
                .map((key) => columns.find((c) => c.key === key))
                .filter(Boolean);
        }, [columns, columnOrder]);

        const baseVisibleColumns = useMemo(
            () => orderedCols.filter((c) => !c.hidden),
            [orderedCols]
        );


        const visibleCols = useMemo(
            () =>
                baseVisibleColumns.filter(
                    (c) => !userHiddenCols.includes(c.key) && !groupBy.includes(c.key)
                ),
            [baseVisibleColumns, userHiddenCols, groupBy]
        );

        // ✅ Auto-fit columns so all are visible (table-fixed)
        const equalColWidth = useMemo(() => {
            const n = Math.max(1, visibleCols.length);
            return `${(100 / n).toFixed(4)}%`;
        }, [visibleCols.length]);

        const headerCellWrap =
            "w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";
        const bodyCellWrap =
            "w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";

        const hasActionCol = false;


        // --- Drag/drop ---
        const handleColDragStart = (e, key) => {
            setDraggedCol(key);
            e.dataTransfer.effectAllowed = "move";
        };

        const handleColDrop = (e, targetKey, isDropZone = false) => {
            e.preventDefault();
            if (!draggedCol) return;

            if (isDropZone) {
                if (!groupBy.includes(draggedCol)) setGroupBy((p) => [...p, draggedCol]);
            } else {
                if (groupBy.includes(draggedCol)) return;
                if (draggedCol === targetKey) return;

                const newOrder = [...columnOrder];
                const oldIdx = newOrder.indexOf(draggedCol);
                const newIdx = newOrder.indexOf(targetKey);
                if (oldIdx > -1 && newIdx > -1) {
                    newOrder.splice(oldIdx, 1);
                    newOrder.splice(newIdx, 0, draggedCol);
                    setColumnOrder(newOrder);
                }
            }

            setDraggedCol(null);
        };

        // --- Sorting ---
        const handleSort = useCallback((key, sortable) => {
            if (sortable === false) return;
            setSortConfig((prev) => {
                if (prev.key === key) {
                    if (prev.direction === "asc") return { key, direction: "desc" };
                    if (prev.direction === "desc") return { key: null, direction: null };
                }
                return { key, direction: "asc" };
            });
            setCurrentPage(1);
        }, []);

        // --- Filtering + sorting data ---
        const filteredData = useMemo(() => {
            const active = Object.entries(filters).filter(
                ([, v]) => String(v || "").trim() !== ""
            );

            let rows = Array.isArray(data) ? data : [];

            if (active.length) {
                rows = rows.filter((r) =>
                    active.every(([k, v]) =>
                        String(r?.[k] ?? "")
                            .toLowerCase()
                            .includes(String(v).toLowerCase())
                    )
                );
            }

            if (sortConfig?.key && sortConfig?.direction) {
                const { key, direction } = sortConfig;
                const col = columns.find((c) => c.key === key);
                const isNumeric =
                    col?.renderType === "number" || col?.renderType === "currency";
                const norm = (val) =>
                    isNumeric ? parseNumber(val) || 0 : String(val ?? "").toLowerCase();

                rows = [...rows].sort((a, b) => {
                    const A = norm(a?.[key]);
                    const B = norm(b?.[key]);
                    const cmp = isNumeric
                        ? A - B
                        : String(A).localeCompare(String(B), undefined, { numeric: true });
                    return direction === "asc" ? cmp : -cmp;
                });
            }

            return rows.map((row) => {
                const cleanRow = { ...row };
                delete cleanRow.isGroup;
                delete cleanRow.isSubtotal;
                delete cleanRow.children;
                return cleanRow;
            });
        }, [data, filters, sortConfig, columns]);

        // --- Grouping ---
        const groupData = (rows, level = 0) => {
            if (level >= groupBy.length) return rows.map((r) => ({ ...r }));

            const groupKey = groupBy[level];
            const groups = {};
            rows.forEach((row) => {
                const val = String(row[groupKey] ?? "(Blank)");
                if (!groups[val]) groups[val] = [];
                groups[val].push(row);
            });

            const result = [];
            Object.keys(groups)
                .sort()
                .forEach((key) => {
                    result.push({
                        isGroup: true,
                        key: groupKey,
                        value: key,
                        level,
                        children: groupData(groups[key], level + 1),
                        count: groups[key].length,
                    });
                });

            return result;
        };

        const processRenderList = (nodes) => {
            let list = [];
            nodes.forEach((node) => {
                if (node.isGroup) {
                    list.push(node);
                    const uniqueId = `${node.key}-${node.value}-${node.level}`;
                    if (expandedGroups[uniqueId]) {
                        if (node.level === groupBy.length - 1) list = list.concat(node.children);
                        else list = list.concat(processRenderList(node.children));
                    }
                } else {
                    list.push(node);
                }
            });
            return list;
        };

        const groupedStructure = useMemo(() => {
            if (groupBy.length === 0) return filteredData;
            return groupData(filteredData);
        }, [filteredData, groupBy]);

        const fullRenderRows = useMemo(() => {
            if (groupBy.length === 0) return filteredData;

            const expandAll = (nodes) => {
                let list = [];
                nodes.forEach((node) => {
                    if (node.isGroup) {
                        list.push(node);
                        if (node.level === groupBy.length - 1) list = list.concat(node.children);
                        else list = list.concat(expandAll(node.children));
                    } else {
                        list.push(node);
                    }
                });
                return list;
            };

            return expandAll(groupedStructure);
        }, [filteredData, groupedStructure, groupBy, columns]);

        // --- Pagination ---
        const totalItems =
            groupBy.length > 0 ? groupedStructure.length : filteredData.length;

        const totalPages =
            rowsPerPage > 0 ? Math.max(1, Math.ceil(totalItems / rowsPerPage)) : 1;

        const safePage = Math.min(Math.max(1, currentPage), totalPages);

        useEffect(() => {
            if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
            else if (currentPage < 1 && totalPages > 0) setCurrentPage(1);
        }, [currentPage, totalPages]);

        const displayRows = useMemo(() => {
            const start = rowsPerPage > 0 ? (safePage - 1) * rowsPerPage : 0;

            if (groupBy.length === 0) {
                return rowsPerPage > 0
                    ? filteredData.slice(start, start + rowsPerPage)
                    : filteredData;
            }

            const pagedGroups =
                rowsPerPage > 0
                    ? groupedStructure.slice(start, start + rowsPerPage)
                    : groupedStructure;

            return processRenderList(pagedGroups);
        }, [safePage, rowsPerPage, filteredData, groupedStructure, expandedGroups, groupBy]);

        // Reference table: no totals/subtotals shown
        const grandTotals = useMemo(() => ({}), []);

        const hasDataFiltered = Array.isArray(filteredData) && filteredData.length > 0;

        // --- Expand/Collapse ---
        const toggleGroup = (node) => {
            const uniqueId = `${node.key}-${node.value}-${node.level}`;
            setExpandedGroups((prev) => ({ ...prev, [uniqueId]: !prev[uniqueId] }));
        };

        const toggleAll = (expand) => {
            if (!expand) return setExpandedGroups({});
            const allKeys = {};
            const traverse = (nodes) => {
                nodes.forEach((n) => {
                    if (n.isGroup) {
                        allKeys[`${n.key}-${n.value}-${n.level}`] = true;
                        if (Array.isArray(n.children) && n.children[0]?.isGroup) traverse(n.children);
                    }
                });
            };
            traverse(groupedStructure);
            setExpandedGroups(allKeys);
        };

        // --- Column resize ---
        const handleMouseMove = useCallback((e) => {
            if (!resizingRef.current) return;
            const { startX, startWidth, key } = resizingRef.current;
            const delta = e.clientX - startX;
            const newWidth = Math.max(40, startWidth + delta);
            setColWidths((prev) => ({ ...prev, [key]: newWidth }));
        }, []);

        const handleMouseUp = useCallback(() => {
            if (!resizingRef.current) return;
            resizingRef.current = null;
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        }, [handleMouseMove]);

        const startResizing = (e, key) => {
            e.preventDefault();
            e.stopPropagation();
            const th = e.currentTarget?.parentElement;
            const currentWidth =
                th?.offsetWidth ||
                colWidths[key] ||
                Number(columns.find((c) => c.key === key)?.width) ||
                120;

            resizingRef.current = { startX: e.clientX, startWidth: currentWidth, key };
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        };

        const sanitizeFileName = (name) =>
            String(name ?? "")
                .trim()
                .replace(/[\\/:*?"<>|]/g, "")   // windows invalid chars
                .replace(/\s+/g, " ")
                .substring(0, 120);

        const getDefaultExportFileName = () => {
            const effectiveDocType = String(docType ?? "").trim();
            const title = reftables?.[effectiveDocType] || effectiveDocType || "Reference";
            return sanitizeFileName(`${title}_${getDateTimeStamp()}`);
        };



        // --- Export helpers ---
        const getDateTimeStamp = () => {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const dd = String(now.getDate()).padStart(2, "0");
            const hh = String(now.getHours()).padStart(2, "0");
            const mi = String(now.getMinutes()).padStart(2, "0");
            const ss = String(now.getSeconds()).padStart(2, "0");
            return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
        };

        const handleExportExcel = async () => {
            if (!hasDataFiltered) return;

            const defaultFileName = getDefaultExportFileName();
            const { value: fileName } = await Swal.fire({
                title: "Enter File Name",
                input: "text",
                inputLabel: "Export Excel File Name:",
                inputValue: defaultFileName,
                width: "400px",
                showCancelButton: true,
                confirmButtonText: "Export",
                inputValidator: (value) => (!value || value.trim() === "" ? "File name cannot be empty!" : null),
            });
            if (!fileName) return;

            const exportData = groupBy.length > 0 ? groupedStructure : filteredData;

            await exportGenericQueryExcel(
                exportData,
                grandTotals,
                visibleCols,
                groupBy,
                columns,
                expandedGroups,
                7,
                fileName,
                currentUserRow?.userName,
                companyInfo?.compName,
                companyInfo?.compAddr,
                companyInfo?.telNo
            );
        };

        const handleExportCsv = async () => {
            if (!hasDataFiltered) return;

            const defaultFileName = `Query Report ${getDateTimeStamp()}`;
            const { value: fileName } = await Swal.fire({
                title: "Enter File Name",
                input: "text",
                inputLabel: "Export CSV File Name:",
                inputValue: defaultFileName,
                width: "400px",
                showCancelButton: true,
                confirmButtonText: "Export CSV",
                inputValidator: (value) => (!value || value.trim() === "" ? "File name cannot be empty!" : null),
            });
            if (!fileName) return;

            const headerRow = visibleCols
                .map((col) => {
                    let header = String(col.label ?? "");
                    header = header.replace(/,/g, "");
                    header = header.toUpperCase().replace(/\s+/g, "_");
                    const escaped = header.replace(/"/g, '""');
                    return `"${escaped}"`;
                })
                .join(",");

            const csvLines = [headerRow];
            filteredData.forEach((row) => {
                const line = visibleCols
                    .map((col) => {
                        const formatted = formatValue(row[col.key], col);
                        const noCommas = String(formatted ?? "").replace(/,/g, "");
                        const escaped = noCommas.replace(/"/g, '""');
                        return `"${escaped}"`;
                    })
                    .join(",");
                csvLines.push(line);
            });

            const blob = new Blob([csvLines.join("\r\n")], {
                type: "text/csv;charset=utf-8;",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${fileName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        };

        const handleExportPdf = async () => {
            if (!hasDataFiltered || !exportContainerRef.current) return;

            const defaultFileName = `Query Report ${getDateTimeStamp()}`;
            const { value: fileName } = await Swal.fire({
                title: "Enter File Name",
                input: "text",
                inputLabel: "Export PDF File Name:",
                inputValue: defaultFileName,
                width: "400px",
                showCancelButton: true,
                confirmButtonText: "Export PDF",
                inputValidator: (value) => (!value || value.trim() === "" ? "File name cannot be empty!" : null),
            });
            if (!fileName) return;

            const canvas = await html2canvas(exportContainerRef.current, {
                scale: 2,
                useCORS: true,
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("l", "mm", "a4");

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);

            const imgWidth = canvas.width * ratio;
            const imgHeight = canvas.height * ratio;
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;

            pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
            pdf.save(`${fileName}.pdf`);
        };

        const handleExportImage = async () => {
            if (!hasDataFiltered || !exportContainerRef.current) return;

            const defaultFileName = `Query Report ${getDateTimeStamp()}`;
            const { value: fileName } = await Swal.fire({
                title: "Enter File Name",
                input: "text",
                inputLabel: "Export Image File Name:",
                inputValue: defaultFileName,
                width: "400px",
                showCancelButton: true,
                confirmButtonText: "Export Image",
                inputValidator: (value) => (!value || value.trim() === "" ? "File name cannot be empty!" : null),
            });
            if (!fileName) return;

            const canvas = await html2canvas(exportContainerRef.current, {
                scale: 2,
                useCORS: true,
            });

            const imgData = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = imgData;
            link.download = `${fileName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        // --- Imperative API (same style as your report table) ---
        useImperativeHandle(ref, () => ({
            getState: () => ({
                filters,
                sortConfig,
                currentPage: safePage,
                groupBy,
                userHiddenCols,
                itemsPerPage: rowsPerPage,
            }),
            scrollRef,
            clearAllState: () => {
                setFilters({});
                setSortConfig({ key: null, direction: null });
                setGroupBy([]);
                setUserHiddenCols([]);
                setRowsPerPage(Number(itemsPerPage) || 50);
            },
            resetFilters: () => setFilters({}),
            clearSort: () => setSortConfig({ key: null, direction: null }),
            goToPage: (p) => setCurrentPage(Math.max(1, Number(p) || 1)),
        }));

        const isLoadingColumns = isLoading || columns.length === 0;

        // Column chooser helpers
        const allChooserKeys = baseVisibleColumns.map((c) => c.key);
        const allChecked = userHiddenCols.length === 0;
        const toggleSelectAll = () => {
            if (allChecked) setUserHiddenCols(allChooserKeys);
            else setUserHiddenCols([]);
        };


        const canRemoveSingleGroup = groupBy.length <= 1;

        const filterInputClass =
            "w-full min-w-0 px-2 py-1 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300";

        return (
            <div className={["global-tran-table-main-div-ui", className].join(" ")}>
                {/* TOP BAR (Group By + Export + Columns) */}
                {hasDataFiltered && (
                    <div
                        className="p-2 bg-gray-50 border border-gray-200 rounded-md mb-2 flex flex-wrap gap-2 items-center"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleColDrop(e, null, true)}
                    >
                        <div className="flex-1 flex flex-wrap gap-2 items-center">
                            <div className="text-xs font-bold text-gray-600 flex items-center">
                                <FontAwesomeIcon icon={faLayerGroup} className="mr-2" />
                                Group By:
                            </div>

                            {groupBy.length === 0 && (
                                <div className="text-xs text-gray-400 italic border border-dashed border-gray-300 rounded px-3 py-1">
                                    Drag Header Here...
                                </div>
                            )}

                            {groupBy.map((gKey) => (
                                <div
                                    key={gKey}
                                    className="flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded border border-blue-200"
                                >
                                    <span>{columns.find((c) => c.key === gKey)?.label}</span>

                                    {canRemoveSingleGroup && (
                                        <button
                                            type="button"
                                            onClick={() => setGroupBy((p) => p.filter((k) => k !== gKey))}
                                            className="ml-2 text-blue-600 hover:text-red-600"
                                            title="Remove group"
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {groupBy.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => toggleAll(true)}
                                        className="px-3 py-2 text-xs font-medium text-blue-800 bg-white border rounded-md hover:bg-gray-100"
                                        title="Expand All"
                                    >
                                        <FontAwesomeIcon icon={faExpandArrowsAlt} className="mr-1" />
                                        Expand
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleAll(false)}
                                        className="px-3 py-2 text-xs font-medium text-blue-800 bg-white border rounded-md hover:bg-gray-100"
                                        title="Collapse All"
                                    >
                                        <FontAwesomeIcon icon={faCompressArrowsAlt} className="mr-1" />
                                        Collapse
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGroupBy([])}
                                        className="px-3 py-2 text-xs font-medium text-red-700 bg-white border rounded-md hover:bg-gray-100"
                                        title="Remove All Groups"
                                    >
                                        <FontAwesomeIcon icon={faTimes} className="mr-1" />
                                        Remove
                                    </button>
                                </>
                            )}

                            {/* EXPORT */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => hasDataFiltered && setShowExportMenu((p) => !p)}
                                    disabled={!hasDataFiltered}
                                    className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                    <FontAwesomeIcon icon={faFileExport} className="mr-1" />
                                    Export
                                </button>

                                {showExportMenu && (
                                    <div
                                        className="absolute right-0 mt-1 w-44 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60]"
                                        onMouseLeave={() => setShowExportMenu(false)}
                                    >
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setShowExportMenu(false);
                                                await handleExportExcel();
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50"
                                        >
                                            <FontAwesomeIcon icon={faFileExcel} className="mr-2 text-green-600" />
                                            Excel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setShowExportMenu(false);
                                                await handleExportCsv();
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50"
                                        >
                                            <FontAwesomeIcon icon={faFileCsv} className="mr-2 text-emerald-600" />
                                            CSV
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setShowExportMenu(false);
                                                await handleExportPdf();
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50"
                                        >
                                            <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" />
                                            PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setShowExportMenu(false);
                                                await handleExportImage();
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50"
                                        >
                                            <FontAwesomeIcon icon={faFileImage} className="mr-2 text-blue-600" />
                                            Image
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* COLUMNS */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowColumnChooser((p) => !p)}
                                    className="px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                    <FontAwesomeIcon icon={faColumns} className="mr-1" />
                                    Columns
                                </button>

                                {showColumnChooser && (
                                    <div
                                        className="absolute right-0 mt-1 bg-white border rounded shadow-lg p-2 max-h-64 overflow-auto z-50 min-w-[220px]"
                                        onMouseLeave={() => setShowColumnChooser(false)}
                                    >
                                        <div className="flex items-center justify-between text-[11px] font-semibold mb-1 border-b pb-1">
                                            <span>Show / Hide Columns</span>
                                            <label className="flex items-center gap-1 text-[11px]">
                                                <input
                                                    type="checkbox"
                                                    className="h-3 w-3"
                                                    checked={allChecked}
                                                    onChange={toggleSelectAll}
                                                />
                                                <span>Select All</span>
                                            </label>
                                        </div>

                                        {baseVisibleColumns.map((col) => (
                                            <label key={col.key} className="flex items-center text-[11px] gap-2 mb-1">
                                                <input
                                                    type="checkbox"
                                                    className="h-3 w-3"
                                                    checked={!userHiddenCols.includes(col.key)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setUserHiddenCols((prev) =>
                                                            checked ? prev.filter((k) => k !== col.key) : [...prev, col.key]
                                                        );
                                                    }}
                                                />
                                                <span className="truncate">{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TABLE */}
                <div className="global-tran-table-main-sub-div-ui">
                    {isLoadingColumns ? (
                        <TableLoader />
                    ) : (
                        <div
                            ref={scrollRef}
                            className="w-full overflow-y-auto overflow-x-hidden"
                            style={{ maxHeight: 590 }}
                        >
                            <table className="global-tran-table-div-ui border-collapse w-full table-fixed">
                                <thead className="global-tran-thead-div-ui text-xs">
                                    <tr>



                                        {visibleCols.map((col) => (
                                            <th
                                                key={col.key}
                                                className="global-tran-th-ui cursor-pointer select-none relative"
                                                draggable={!groupBy.includes(col.key)}
                                                onDragStart={(e) => handleColDragStart(e, col.key)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => handleColDrop(e, col.key)}
                                                onClick={() => handleSort(col.key, col.sortable)}
                                                style={{
                                                    // ✅ use resized width if available, otherwise auto-fit
                                                    width: colWidths[col.key] || equalColWidth,
                                                }}
                                                title="Click to sort • Drag to reorder • Drag to Group By bar"
                                            >
                                                <div className="flex items-center justify-between gap-2 min-w-0">
                                                    <span className={headerCellWrap}>{col.label}</span>
                                                    {sortConfig.key === col.key ? (
                                                        <FontAwesomeIcon
                                                            icon={sortConfig.direction === "asc" ? faSortUp : faSortDown}
                                                        />
                                                    ) : (
                                                        <FontAwesomeIcon icon={faSort} className="opacity-30" />
                                                    )}
                                                </div>

                                                {/* resize handle */}
                                                <div
                                                    className="absolute top-0 right-0 h-full w-1 cursor-col-resize select-none"
                                                    onMouseDown={(e) => startResizing(e, col.key)}
                                                />
                                            </th>
                                        ))}
                                    </tr>

                                    {/* FILTER ROW (COAMast style) */}
                                    {showFilters && hasDataFiltered && (
                                        <tr>

                                            {visibleCols.map((col) => (
                                                <th key={`f-${col.key}`} className="global-tran-th-ui px-2 py-1">
                                                    <input
                                                        className={filterInputClass}
                                                        placeholder="Contains:"
                                                        value={filters[col.key] || ""}
                                                        onChange={(e) => {
                                                            setFilters((p) => ({ ...p, [col.key]: e.target.value }));
                                                            setCurrentPage(1);
                                                        }}
                                                    />
                                                </th>
                                            ))}
                                        </tr>
                                    )}
                                </thead>

                                <tbody>
                                    {!hasDataFiltered ? (
                                        <tr>
                                            <td
                                                colSpan={visibleCols.length + (hasActionCol ? 1 : 0)}
                                                className="global-ref-norecords-ui"
                                            >
                                                {Array.isArray(data) && data.length > 0
                                                    ? "No records found"
                                                    : "No data"}
                                            </td>
                                        </tr>
                                    ) : (
                                        displayRows.map((row, idx) => {
                                            const isGrouped = groupBy.length > 0;

                                            // GROUP HEADER
                                            if (isGrouped && row.isGroup) {
                                                const uniqueId = `${row.key}-${row.value}-${row.level}`;
                                                const isExpanded = expandedGroups[uniqueId];
                                                return (
                                                    <tr
                                                        key={`g-${uniqueId}`}
                                                        className="global-tran-tr-ui bg-gray-100 cursor-pointer"
                                                        onClick={() => toggleGroup(row)}
                                                    >
                                                        <td
                                                            colSpan={visibleCols.length + (hasActionCol ? 1 : 0)}
                                                            className="global-tran-td-ui font-semibold text-blue-900"
                                                        >
                                                            <div
                                                                className="flex items-center"
                                                                style={{ paddingLeft: row.level * 20 }}
                                                            >
                                                                <FontAwesomeIcon
                                                                    icon={isExpanded ? faChevronDown : faChevronRight}
                                                                    className="mr-2 text-gray-500"
                                                                />
                                                                <span className="mr-2 text-gray-600">
                                                                    {columns.find((c) => c.key === row.key)?.label}:
                                                                </span>
                                                                <span className="mr-2 font-bold">{row.value}</span>
                                                                <span className="bg-blue-200 text-blue-800 text-[10px] px-2 rounded-full">
                                                                    {row.count}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            // NORMAL ROW
                                            return (
                                                <tr
                                                    key={row.__idx ?? idx}
                                                    className="global-tran-tr-ui"
                                                    onDoubleClick={() => onRowDoubleClick?.(row)}
                                                >
                                                    {visibleCols.map((col) => (
                                                        <td key={col.key} className="global-tran-td-ui p-1 align-top">
                                                            <div className="w-full">
                                                                {typeof col.render === "function"
                                                                    ? col.render(row)
                                                                    : formatValue(row[col.key], col)}
                                                            </div>
                                                        </td>
                                                    ))}

                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>

                            </table>
                        </div>
                    )}
                </div>

                {/* PAGINATION (COAMast-style button look) */}
                {hasDataFiltered && (
                    <div className="flex items-center justify-between p-3">
                        <div className="text-xs opacity-80 font-semibold">
                            {groupBy.length > 0 ? "Groups: " : "Records: "}
                            {totalItems}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold opacity-80">Rows:</span>
                                <select
                                    className="border rounded-md px-2 py-1 text-xs"
                                    value={rowsPerPage === 0 ? "ALL" : String(rowsPerPage)}
                                    onChange={(e) => {
                                        const v = e.target.value === "ALL" ? 0 : Number(e.target.value);
                                        setRowsPerPage(v);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="ALL">All</option>
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>

                            <div className="text-xs opacity-80 font-semibold">
                                Page {safePage} / {totalPages}
                            </div>

                            <button
                                disabled={safePage <= 1}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                className="px-7 py-2 text-xs font-medium text-blue-800 bg-white border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                            >
                                Prev
                            </button>

                            <button
                                disabled={safePage >= totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                className="px-7 py-2 text-xs font-medium text-blue-800 bg-white border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* HIDDEN EXPORT TABLE (all rows) */}
                {hasDataFiltered && (
                    <div ref={exportContainerRef} style={{ position: "absolute", left: "-99999px", top: 0 }}>
                        <table className="border-collapse text-[8px]">
                            <thead>
                                <tr>
                                    {visibleCols.map((col) => (
                                        <th
                                            key={col.key}
                                            className="border px-2 py-1 text-left bg-gray-200 align-top"
                                            style={{ maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" }}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {(groupBy.length === 0 ? filteredData : fullRenderRows).map((row, idx) => {
                                    if (groupBy.length > 0 && row.isGroup) {
                                        return (
                                            <tr key={`exp-g-${row.key}-${row.value}-${row.level}-${idx}`}>
                                                <td colSpan={visibleCols.length} className="border px-2 py-1 font-semibold bg-gray-100">
                                                    {columns.find((c) => c.key === row.key)?.label}: {row.value} ({row.count})
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return (
                                        <tr key={`exp-row-${idx}`}>
                                            {visibleCols.map((col) => (
                                                <td
                                                    key={col.key}
                                                    className="border px-2 py-1 align-top"
                                                    style={{ maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" }}
                                                >
                                                    {formatValue(row[col.key], col)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>

                        </table>
                    </div>
                )}
            </div>
        );
    }
);

export default SearchGlobalReferenceTable;
