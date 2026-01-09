
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
  faEye,
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
  faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";
import {
  formatNumber,
  parseFormattedNumber,
} from "@/NAYSA Cloud/Global/behavior";
import { useReturnToDate } from "@/NAYSA Cloud/Global/dates";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";
import Swal from "sweetalert2";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const ACTION_COL_WIDTH = 64;

// Loader (unchanged)
const TableLoader = () => (
  <div className="flex flex-col items-center justify-center h-32 bg-gray-50 border border-gray-200 rounded-lg shadow-md p-4">
    <div className="w-8 h-8 border-4 border-t-blue-500 border-r-green-500 border-b-red-500 border-l-yellow-500 rounded-full animate-spin"></div>
    <p className="mt-3 text-sm text-blue-600 font-semibold">
      Loading Report...
    </p>
  </div>
);

const SearchGlobalReportTable = forwardRef(
  (
    {
      columns = [],
      data = [],
      itemsPerPage = 50,
      showFilters = true,
      rightActionLabel = null,
      onRowAction,           // View button
      onRowActionsClick,     // 🔹 NEW: gear button handler (optional)
      actionsIcon,           // 🔹 optional override (default = gear)
      actionsTitle,          // 🔹 optional tooltip for gear
      onRowDoubleClick,
      className = "",
      initialState,
      onStateChange,
      totalExemptions = ["rate", "percent", "ratio", "id", "code"],
      // optional loading flag from parent
      isLoading = false,
    },
    ref
  ) => {
    const scrollRef = useRef(null);
    const exportContainerRef = useRef(null); // hidden full-table container for PDF/Image

    const [filters, setFilters] = useState(() => initialState?.filters || {});
    const [sortConfig, setSortConfig] = useState(
      () => initialState?.sortConfig || { key: null, direction: null }
    );
    const [currentPage, setCurrentPage] = useState(
      () => Number(initialState?.currentPage) || 1
    );

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

    useEffect(() => {
      if (columns.length && columnOrder.length === 0) {
        setColumnOrder(columns.map((c) => c.key));
      }
    }, [columns, columnOrder.length]);

    // Notify parent component on state change
    useEffect(() => {
      onStateChange?.({
        filters,
        sortConfig,
        currentPage,
        groupBy,
        userHiddenCols,
      });
    }, [filters, sortConfig, currentPage, groupBy, userHiddenCols, onStateChange]);

    // whenever grouping changes, reset expansions and page
    useEffect(() => {
      setExpandedGroups({});
      setCurrentPage(1);
    }, [groupBy]);

    // Clear grouping state when data is empty
   useEffect(() => {
  if (!data || data.length === 0) {
    // Only reset if needed to prevent re-renders
    if (groupBy.length > 0) {
      setGroupBy([]);
    }
  }
}, [data]); 

    // --- Utility Functions ---
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
      if (value === null || value === undefined) return "—";
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
          return String(value);
      }
    };

    // --- Column & Data Processing Memos ---
    const orderedCols = useMemo(() => {
      if (columnOrder.length === 0) return columns;
      return columnOrder
        .map((key) => columns.find((c) => c.key === key))
        .filter(Boolean);
    }, [columns, columnOrder]);

    // 🔹 detect if there is an "actions" config column
    const hasActionsConfig = useMemo(
      () => columns.some((c) => c.renderType === "actions"),
      [columns]
    );

    // Columns that are "allowed" to show in chooser / table:
    // not config-hidden AND not the special "actions" config column
    const baseVisibleColumns = useMemo(
      () =>
        orderedCols.filter(
          (c) => !c.hidden && c.renderType !== "actions"
        ),
      [orderedCols]
    );

    // Final visible columns = baseVisibleColumns minus userHiddenCols minus grouped columns
    const visibleCols = useMemo(
      () =>
        baseVisibleColumns.filter(
          (c) => !userHiddenCols.includes(c.key) && !groupBy.includes(c.key)
        ),
      [baseVisibleColumns, groupBy, userHiddenCols]
    );

    const hasActionCol = Boolean(onRowAction || rightActionLabel);

    // Only allow removing a group chip when there is 0 or 1 group
    const canRemoveSingleGroup = groupBy.length <= 1;

    const handleColDragStart = (e, key) => {
      setDraggedCol(key);
      e.dataTransfer.effectAllowed = "move";
    };

    const handleColDrop = (e, targetKey, isDropZone = false) => {
      e.preventDefault();
      if (!draggedCol) return;

      if (isDropZone) {
        if (!groupBy.includes(draggedCol)) {
          setGroupBy((prev) => [...prev, draggedCol]);
        }
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

    const handleSort = useCallback((key, sortable) => {
      if (sortable === false) return;
      setSortConfig((prev) => {
        if (prev.key === key) {
          if (prev.direction === "asc") return { key, direction: "desc" };
          if (prev.direction === "desc")
            return { key: null, direction: null };
        }
        return { key, direction: "asc" };
      });
      setCurrentPage(1);
    }, []);

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
            : String(A).localeCompare(String(B), undefined, {
                numeric: true,
              });
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



  const shouldSumColumn = (col) => {
  const noTotalKeys = [
    "unitCost",
    "currRate",
    "unitPrice",
    "unitCost",
    "runBal",
  ].map(k => k.toLowerCase());

  if (!col) return false;
  const key = String(col.key ?? "").toLowerCase();
  const label = String(col.label ?? "").toLowerCase();

  if (noTotalKeys.includes(key)) return false;
  if (col.renderType !== "number" && col.renderType !== "currency")
    return false;

  if (totalExemptions.some(ex => label.includes(ex) || key.includes(ex)))
    return false;

  return true;
};





    const calculateAggregates = (rows) => {
      const sums = {};
      visibleCols.forEach((col) => {
        if (shouldSumColumn(col)) {
          sums[col.key] = rows.reduce(
            (acc, curr) => acc + (parseNumber(curr[col.key]) || 0),
            0
          );
        }
      });
      return sums;
    };

    const groupData = (rows, level = 0) => {
      if (level >= groupBy.length) {
        return rows.map((row) => ({ ...row }));
      }
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
            aggregates: calculateAggregates(groups[key]),
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
            if (node.level === groupBy.length - 1) {
              list = list.concat(node.children);
            } else {
              list = list.concat(processRenderList(node.children));
            }
            list.push({
              isSubtotal: true,
              groupLabel: columns.find((c) => c.key === node.key)?.label,
              groupValue: node.value,
              aggregates: node.aggregates,
              level: node.level,
            });
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

    // full render rows (all pages, all groups expanded) for export
    const fullRenderRows = useMemo(() => {
      if (groupBy.length === 0) return filteredData;

      const expandAll = (nodes) => {
        let list = [];
        nodes.forEach((node) => {
          if (node.isGroup) {
            list.push(node);
            if (node.level === groupBy.length - 1) {
              list = list.concat(node.children);
            } else {
              list = list.concat(expandAll(node.children));
            }
            list.push({
              isSubtotal: true,
              groupLabel: columns.find((c) => c.key === node.key)?.label,
              groupValue: node.value,
              aggregates: node.aggregates,
              level: node.level,
            });
          } else {
            list.push(node);
          }
        });
        return list;
      };

      return expandAll(groupedStructure);
    }, [filteredData, groupedStructure, groupBy, columns]);

    // --- Pagination Logic ---
    const totalItems =
      groupBy.length > 0 ? groupedStructure.length : filteredData.length;
    const totalPages =
      itemsPerPage > 0
        ? Math.max(1, Math.ceil(totalItems / itemsPerPage))
        : 1;
    const safePage = Math.min(Math.max(1, currentPage), totalPages);

    useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      } else if (currentPage < 1 && totalPages > 0) {
        setCurrentPage(1);
      }
    }, [currentPage, totalPages]);

    const displayRows = useMemo(() => {
      const start = (safePage - 1) * itemsPerPage;

      if (groupBy.length === 0) {
        return itemsPerPage > 0
          ? filteredData.slice(start, start + itemsPerPage)
          : filteredData;
      }

      const pagedGroups =
        itemsPerPage > 0
          ? groupedStructure.slice(start, start + itemsPerPage)
          : groupedStructure;

      return processRenderList(pagedGroups);
    }, [
      filteredData,
      groupedStructure,
      safePage,
      itemsPerPage,
      expandedGroups,
      groupBy,
    ]);

    const grandTotals = useMemo(
      () => calculateAggregates(filteredData),
      [filteredData, visibleCols]
    );

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

    // 🔹 Excel export (unchanged)
    const handleExportClick = async () => {
      try {
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
        const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "");
        const defaultFileName = `Query Report ${datePart}_${timePart}`;

        const { value: fileName } = await Swal.fire({
          title: "Enter File Name",
          input: "text",
          inputLabel: "Export File Name:",
          inputValue: defaultFileName,
          width: "400px",
          showCancelButton: true,
          confirmButtonText: "Export",
          inputValidator: (value) => {
            if (!value || value.trim() === "") {
              return "File name cannot be empty!";
            }
          },
        });

        if (!fileName) {
          return;
        }

        const exportData =
          groupBy.length > 0 ? groupedStructure : filteredData;

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
      } catch (err) {
        console.error("Error exporting Excel:", err);
      }
    };

    const hasDataFiltered =
      Array.isArray(filteredData) && filteredData.length > 0;

    // 🔹 CSV export with UPPERCASE_HEADERS + SPACE→_ + remove commas
    const handleExportCsvClick = async () => {
      if (!hasDataFiltered) return;

      try {
        const defaultFileName = `Query Report ${getDateTimeStamp()}`;
        const { value: fileName } = await Swal.fire({
          title: "Enter File Name",
          input: "text",
          inputLabel: "Export CSV File Name:",
          inputValue: defaultFileName,
          width: "400px",
          showCancelButton: true,
          confirmButtonText: "Export CSV",
          inputValidator: (value) => {
            if (!value || value.trim() === "") {
              return "File name cannot be empty!";
            }
          },
        });

        if (!fileName) return;

        const rowsToExport = filteredData;

        // HEADER: Uppercase, spaces -> underscore, remove commas
        const headerRow = visibleCols
          .map((col) => {
            let header = String(col.label ?? "");
            header = header.replace(/,/g, ""); // remove commas in header
            header = header.toUpperCase().replace(/\s+/g, "_");
            const escaped = header.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",");

        const csvLines = [headerRow];

        // DETAILS: same value but remove commas
        rowsToExport.forEach((row) => {
          const line = visibleCols
            .map((col) => {
              const raw = row[col.key];
              const formatted = formatValue(raw, col);
              const noCommas = String(formatted ?? "").replace(/,/g, "");
              const escaped = noCommas.replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(",");
          csvLines.push(line);
        });

        const csvContent = csvLines.join("\r\n");

        const blob = new Blob([csvContent], {
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
      } catch (err) {
        console.error("Error exporting CSV:", err);
      }
    };

    // PDF export using hidden container
    const handleExportPdfClick = async () => {
      if (!hasDataFiltered || !exportContainerRef.current) return;

      try {
        const element = exportContainerRef.current;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
        });

        const imgData = canvas.toDataURL("image/png");

        const defaultFileName = `Query Report ${getDateTimeStamp()}`;
        const { value: fileName } = await Swal.fire({
          title: "Enter File Name",
          input: "text",
          inputLabel: "Export PDF File Name:",
          inputValue: defaultFileName,
          width: "400px",
          showCancelButton: true,
          confirmButtonText: "Export PDF",
          inputValidator: (value) => {
            if (!value || value.trim() === "") {
              return "File name cannot be empty!";
            }
          },
        });

        if (!fileName) return;

        const pdf = new jsPDF("l", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidthPx = canvas.width;
        const imgHeightPx = canvas.height;

        const ratio = Math.min(pdfWidth / imgWidthPx, pdfHeight / imgHeightPx);
        const imgWidth = imgWidthPx * ratio;
        const imgHeight = imgHeightPx * ratio;

        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;

        pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
        pdf.save(`${fileName}.pdf`);
      } catch (err) {
        console.error("Error exporting PDF:", err);
      }
    };

    // Image export using hidden container
    const handleExportImageClick = async () => {
      if (!hasDataFiltered || !exportContainerRef.current) return;

      try {
        const element = exportContainerRef.current;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
        });

        const imgData = canvas.toDataURL("image/png");

        const defaultFileName = `Query Report ${getDateTimeStamp()}`;
        const { value: fileName } = await Swal.fire({
          title: "Enter File Name",
          input: "text",
          inputLabel: "Export Image File Name:",
          inputValue: defaultFileName,
          width: "400px",
          showCancelButton: true,
          confirmButtonText: "Export Image",
          inputValidator: (value) => {
            if (!value || value.trim() === "") {
              return "File name cannot be empty!";
            }
          },
        });

        if (!fileName) return;

        const link = document.createElement("a");
        link.href = imgData;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Error exporting image:", err);
      }
    };

    const toggleGroup = (node) => {
      const uniqueId = `${node.key}-${node.value}-${node.level}`;
      setExpandedGroups((prev) => ({ ...prev, [uniqueId]: !prev[uniqueId] }));
    };

    const toggleAll = (expand) => {
      if (!expand) {
        setExpandedGroups({});
        return;
      }
      const allKeys = {};
      const traverse = (nodes) => {
        nodes.forEach((n) => {
          if (n.isGroup) {
            allKeys[`${n.key}-${n.value}-${n.level}`] = true;
            if (Array.isArray(n.children) && n.children[0]?.isGroup)
              traverse(n.children);
          }
        });
      };
      traverse(groupedStructure);
      setExpandedGroups(allKeys);
    };

    // Column resizing: mouse handlers
    const handleMouseMove = useCallback((e) => {
      if (!resizingRef.current) return;
      const { startX, startWidth, key } = resizingRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(0, startWidth + delta);
      setColWidths((prev) => ({
        ...prev,
        [key]: newWidth,
      }));
    }, []);

    const handleMouseUp = useCallback(() => {
      if (resizingRef.current) {
        resizingRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      }
    }, [handleMouseMove]);

    const startResizing = (e, key) => {
      e.preventDefault();
      e.stopPropagation(); // avoid triggering sort / drag
      const th = e.currentTarget?.parentElement;
      const currentWidth =
        th?.offsetWidth ||
        colWidths[key] ||
        Number(columns.find((c) => c.key === key)?.width) ||
        120;

      resizingRef.current = {
        startX: e.clientX,
        startWidth: currentWidth,
        key,
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    // Sticky Plan (original: 1 sticky data col when grouped)
    const stickyPlan = useMemo(() => {
      let left = hasActionCol ? ACTION_COL_WIDTH : 0;

      // Freeze up to 1 data column when grouped, 0 when not grouped
      const maxStickyCols = groupBy.length > 0 ? 1 : 0;

      return visibleCols.map((col, index) => {
        const resizedWidth = colWidths[col.key];
        const isSticky = index < maxStickyCols;

        if (isSticky) {
          const width = resizedWidth ?? (Number(col.width) || 120);
          const meta = { sticky: true, left, width };
          left += width;
          return meta;
        }

        return { sticky: false, left: 0, width: resizedWidth || undefined };
      });
    }, [visibleCols, hasActionCol, colWidths, groupBy.length]);

    const numberAlignClass = (col) =>
      col?.renderType === "number" || col?.renderType === "currency"
        ? "text-right tabular-nums"
        : "text-left";

    const commonCellClass =
      "px-3 py-[6px] whitespace-nowrap max-w-[400px] truncate";

    useImperativeHandle(ref, () => ({
      getState: () => ({
        filters,
        sortConfig,
        currentPage: safePage,
        groupBy,
        userHiddenCols,
      }),
      scrollRef,

      clearAllState: () => {
        setFilters({});
        setSortConfig({ key: null, direction: null });
        setGroupBy([]);
        setUserHiddenCols([]);
      },

      resetFilters: () => setFilters({}),
      clearSort: () => setSortConfig({ key: null, direction: null }),
      goToPage: (p) => setCurrentPage(Math.max(1, Number(p) || 1)),
    }));

    // loader while dynamic columns are still loading (or parent says loading)
    const isLoadingColumns = isLoading || columns.length === 0;

    // Column chooser helpers
    const allChooserKeys = baseVisibleColumns.map((c) => c.key);
    const allChecked = userHiddenCols.length === 0;

    const toggleSelectAll = () => {
      if (allChecked) {
        setUserHiddenCols(allChooserKeys);
      } else {
        setUserHiddenCols([]);
      }
    };

    const effectiveActionsIcon = actionsIcon || faPenToSquare;
    const showActionsButton = hasActionsConfig || typeof onRowActionsClick === "function";

    // --- Render ---
    return (
      <div
        className={[
          "flex flex-col border rounded-md max-h-[590px] bg-white",
          className,
        ].join(" ")}
      >
        {isLoadingColumns ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <TableLoader />
          </div>
        ) : (
          <>
            {hasDataFiltered && (
              <div
                className="p-2 bg-gray-50 border-b flex flex-wrap gap-2 items-center min-h-[45px] shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleColDrop(e, null, true)}
              >
                {/* Left side: Group By */}
                <div className="flex-1 flex flex-wrap gap-2 items-center">
                  <div className="text-xs font-bold text-gray-500 flex items-center">
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
                          onClick={() => {
                            setGroupBy((prev) => prev.filter((k) => k !== gKey));
                          }}
                          className="ml-2 text-blue-500 hover:text-red-500"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Right side: group controls + export menu + column chooser */}
                <div className="flex items-center gap-2">
                  {groupBy.length > 0 && (
                    <>
                      <button
                        onClick={() => toggleAll(true)}
                        className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100"
                        title="Expand All"
                      >
                        <FontAwesomeIcon icon={faExpandArrowsAlt} /> Expand
                      </button>
                      <button
                        onClick={() => toggleAll(false)}
                        className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100"
                        title="Collapse All"
                      >
                        <FontAwesomeIcon icon={faCompressArrowsAlt} /> Collapse
                      </button>
                      <button
                        onClick={() => setGroupBy([])}
                        className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100"
                        title="Remove All Groups"
                      >
                        <FontAwesomeIcon
                          icon={faTimes}
                          className="text-red-600 mr-1"
                        />
                        Remove
                      </button>
                    </>
                  )}

                  {/* Export dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        hasDataFiltered &&
                        setShowExportMenu((prev) => !prev)
                      }
                      disabled={!hasDataFiltered}
                      className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      title="Export options"
                    >
                      <FontAwesomeIcon
                        icon={faFileExport}
                        className="text-blue-600 mr-1"
                      />
                      Export
                    </button>

                    {showExportMenu && (
                      <div
                        className="absolute right-0 mt-1 bg-white border rounded shadow-lg p-2 z-50 min-w-[180px]"
                        onMouseLeave={() => setShowExportMenu(false)}
                      >
                        <div className="text-[11px] font-semibold mb-1 border-b pb-1">
                          Export Options
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            setShowExportMenu(false);
                            await handleExportClick();
                          }}
                          className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-2"
                        >
                          <FontAwesomeIcon
                            icon={faFileExcel}
                            className="text-green-600"
                          />
                          Excel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setShowExportMenu(false);
                            await handleExportCsvClick();
                          }}
                          className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-2"
                        >
                          <FontAwesomeIcon
                            icon={faFileCsv}
                            className="text-emerald-600"
                          />
                          CSV
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setShowExportMenu(false);
                            await handleExportPdfClick();
                          }}
                          className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-2"
                        >
                          <FontAwesomeIcon
                            icon={faFilePdf}
                            className="text-red-600"
                          />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setShowExportMenu(false);
                            await handleExportImageClick();
                          }}
                          className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-2"
                        >
                          <FontAwesomeIcon
                            icon={faFileImage}
                            className="text-blue-600"
                          />
                          Image
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Column chooser */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowColumnChooser((prev) => !prev)}
                      className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100"
                    >
                      <FontAwesomeIcon
                        icon={faColumns}
                        className="text-green-600"
                      />{" "}
                      Columns
                    </button>
                    {showColumnChooser && (
                      <div
                        className="absolute right-0 mt-1 bg-white border rounded shadow-lg p-2 max-h-64 overflow-auto z-50 min-w-[200px]"
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
                          <label
                            key={col.key}
                            className="flex items-center text-[11px] gap-2 mb-1"
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3"
                              checked={!userHiddenCols.includes(col.key)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setUserHiddenCols((prev) => {
                                  if (checked) {
                                    return prev.filter((k) => k !== col.key);
                                  } else {
                                    return [...prev, col.key];
                                  }
                                });
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

            <div
              ref={scrollRef}
              key={`table-view-${groupBy.length > 0 ? "grouped" : "flat"}`}
              className={`flex-grow w-full overscroll-x-contain relative ${
                hasDataFiltered ? "overflow-auto" : "overflow-hidden"
              }`}
            >
              <table className="min-w-full border-collapse relative table-fixed">
                <thead className="sticky top-0 z-20 shadow-sm">
                  <tr className="bg-blue-700 text-white text-[10px] sm:text-[11px]">
                    {hasActionCol && (
                      <th
                        className="sticky left-0 top-0 z-50 px-2 py-2 font-bold border-r border-blue-800 bg-blue-700 w-[64px]"
                        style={{
                          minWidth: ACTION_COL_WIDTH,
                          maxWidth: ACTION_COL_WIDTH,
                        }}
                      >
                        {rightActionLabel ?? ""}
                      </th>
                    )}
                    {visibleCols.map((col, i) => {
                      const meta = stickyPlan[i];

                      const style = meta.sticky
                        ? {
                            left: meta.left,
                            ...(meta.width
                              ? {
                                  width: meta.width,
                                  minWidth: meta.width,
                                }
                              : {}),
                          }
                        : {
                            maxWidth: 400,
                            ...(meta.width
                              ? {
                                  width: meta.width,
                                  minWidth: meta.width,
                                }
                              : {}),
                          };

                      return (
                        <th
                          key={col.key}
                          draggable={!groupBy.includes(col.key)}
                          onDragStart={(e) => handleColDragStart(e, col.key)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleColDrop(e, col.key)}
                          className={`px-3 py-3 font-bold select-none cursor-grab whitespace-nowrap overflow-hidden text-ellipsis ${
                            meta.sticky ? "sticky z-40 bg-blue-700" : ""
                          } ${numberAlignClass(col)} relative`}
                          style={style}
                          onClick={() => handleSort(col.key, col.sortable)}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{col.label}</span>
                            {sortConfig.key === col.key ? (
                              <FontAwesomeIcon
                                icon={
                                  sortConfig.direction === "asc"
                                    ? faSortUp
                                    : faSortDown
                                }
                              />
                            ) : (
                              <FontAwesomeIcon
                                icon={faSort}
                                className="opacity-30"
                              />
                            )}
                          </div>

                          {/* Resize handle */}
                          <div
                            className="absolute top-0 right-0 h-full w-1 cursor-col-resize select-none"
                            onMouseDown={(e) => startResizing(e, col.key)}
                          />
                        </th>
                      );
                    })}
                  </tr>

                  {showFilters && hasDataFiltered && (
                    <tr className="bg-white border-b border-gray-200 text-[10px]">
                      {hasActionCol && (
                        <td className="sticky left-0 z-50 px-2 py-1 border-r bg-white" />
                      )}
                      {visibleCols.map((col, i) => {
                        const meta = stickyPlan[i];
                        const style = meta.sticky
                          ? {
                              left: meta.left,
                              ...(meta.width ? { width: meta.width } : {}),
                            }
                          : meta.width
                          ? { width: meta.width }
                          : undefined;

                        return (
                          <td
                            key={col.key}
                            className={`px-2 py-1 ${
                              meta.sticky ? "sticky z-40 bg-white" : ""
                            }`}
                            style={style}
                          >
                            <input
                              type="text"
                              value={filters[col.key] || ""}
                              onChange={(e) => {
                                setFilters((prev) => ({
                                  ...prev,
                                  [col.key]: e.target.value,
                                }));
                                setCurrentPage(1);
                              }}
                              className="w-full border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-blue-400"
                              placeholder="Filter..."
                            />
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </thead>

                <tbody className="bg-white text-[10px] sm:text-[11px]">
                  {displayRows.length > 0 && (
                    <>
                      {displayRows.map((row, rIdx) => {
                        const isRenderingGroup = groupBy.length > 0;

                        if (isRenderingGroup && row.isGroup) {
                          const uniqueId = `${row.key}-${row.value}-${row.level}`;
                          const isExpanded = expandedGroups[uniqueId];
                          const colSpan =
                            visibleCols.length + (hasActionCol ? 1 : 0);
                          return (
                            <tr
                              key={`g-${uniqueId}`}
                              className="bg-gray-100 hover:bg-gray-200 cursor-pointer"
                              onClick={() => toggleGroup(row)}
                            >
                              <td
                                colSpan={colSpan}
                                className="px-2 py-2 font-semibold border-b border-gray-300 text-blue-900 whitespace-nowrap"
                              >
                                <div
                                  className="flex items-center"
                                  style={{ paddingLeft: row.level * 20 }}
                                >
                                  <FontAwesomeIcon
                                    icon={
                                      isExpanded ? faChevronDown : faChevronRight
                                    }
                                    className="w-3 h-3 mr-2 text-gray-500"
                                  />
                                  <span className="mr-2 text-gray-600">
                                    {
                                      columns.find(
                                        (c) => c.key === row.key
                                      )?.label
                                    }
                                    :
                                  </span>
                                  <span className="mr-2 font-bold">
                                    {row.value}
                                  </span>
                                  <span className="bg-blue-200 text-blue-800 text-[9px] px-1.5 rounded-full">
                                    {row.count}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        if (isRenderingGroup && row.isSubtotal) {
                          return (
                            <tr
                              key={`sub-${row.groupValue}-${rIdx}`}
                              className="bg-yellow-50 font-bold border-b border-gray-300"
                            >
                              {hasActionCol && (
                                <td className="sticky left-0 bg-yellow-50 border-r border-gray-300 z-10" />
                              )}
                              {visibleCols.map((col, i) => {
                                const meta = stickyPlan[i];
                                const val = row.aggregates[col.key];
                                const style = meta.sticky
                                  ? {
                                      left: meta.left,
                                      ...(meta.width
                                        ? { width: meta.width }
                                        : {}),
                                    }
                                  : meta.width
                                  ? { width: meta.width }
                                  : undefined;

                                return (
                                  <td
                                    key={col.key}
                                    className={`${commonCellClass} ${numberAlignClass(
                                      col
                                    )} ${
                                      meta.sticky
                                        ? "sticky z-10 bg-yellow-50"
                                        : ""
                                    }`}
                                    style={style}
                                  >
                                    {i === 0 && (
                                      <div
                                        className="float-left text-left font-bold"
                                        style={{
                                          paddingLeft: row.level * 20,
                                        }}
                                      >
                                        <span className="text-gray-600">
                                          Sub Total for {row.groupLabel}:
                                        </span>
                                        <span className="ml-1 text-blue-900">
                                          {row.groupValue}
                                        </span>
                                      </div>
                                    )}
                                    {val !== undefined
                                      ? formatValue(val, col)
                                      : ""}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        }

                        const isEven = rIdx % 2 === 0;
                        return (
                          <tr
                            key={row.__idx ?? rIdx}
                            className={`hover:bg-blue-50 ${
                              isEven ? "bg-white" : "bg-gray-50"
                            }`}
                            onDoubleClick={() => onRowDoubleClick?.(row)}
                          >
                            
                            {hasActionCol && (
                              <td className="sticky left-0 z-10 px-2 py-[2px] text-center border-r border-gray-200 bg-inherit w-[64px] min-w-[64px]">
                                <div className="flex items-center justify-center gap-1">
                                  {/* View button – original size */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRowAction?.(row);
                                    }}
                                    className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                    title={rightActionLabel ?? "Open"}
                                  >
                                    <FontAwesomeIcon
                                      icon={faEye}
                                      className="w-4 h-3"   // ✅ back to original
                                    />
                                  </button>

                                  {/* Gear / actions button – same size as View */}
                                  {showActionsButton && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRowActionsClick?.(row);
                                      }}
                                      className="px-2 py-0.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                      title={actionsTitle || "More actions"}
                                    >
                                      <FontAwesomeIcon
                                        icon={effectiveActionsIcon}
                                        className="w-4 h-3" // ✅ matches View
                                      />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}


                            {visibleCols.map((col, i) => {
                              const meta = stickyPlan[i];
                              const style = meta.sticky
                                ? {
                                    left: meta.left,
                                    ...(meta.width
                                      ? {
                                          width: meta.width,
                                          minWidth: meta.width,
                                        }
                                      : {}),
                                  }
                                : meta.width
                                ? {
                                    width: meta.width,
                                    minWidth: meta.width,
                                  }
                                : undefined;

                              return (
                                <td
                                  key={col.key}
                                  className={`${commonCellClass} ${numberAlignClass(
                                    col
                                  )} ${
                                    meta.sticky ? "sticky z-10 bg-inherit" : ""
                                  }`}
                                  style={style}
                                  title={String(row[col.key] ?? "")}
                                >
                                  {formatValue(row[col.key], col)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      <tr className="h-12 border-0 bg-transparent">
                        <td
                          colSpan={visibleCols.length + (hasActionCol ? 1 : 0)}
                          className="border-0 p-0"
                        />
                      </tr>
                    </>
                  )}
                </tbody>

                {hasDataFiltered && (
                  <tfoot className="sticky bottom-0 z-30 shadow-[0_-4px_6px_rgba(0,0,0,0.1)] text-[10px] sm:text-[11px]">
                    <tr className="bg-gray-100 font-bold border-t border-blue-400">
                      {hasActionCol && (
                        <td className="sticky left-0 bg-gray-100 border-r border-gray-300 z-40" />
                      )}
                      {visibleCols.map((col, i) => {
                        const meta = stickyPlan[i];
                        const val = grandTotals[col.key];
                        const style = meta.sticky
                          ? {
                              left: meta.left,
                              ...(meta.width ? { width: meta.width } : {}),
                            }
                          : meta.width
                          ? { width: meta.width }
                          : undefined;

                        return (
                          <td
                            key={col.key}
                            className={`${commonCellClass} ${numberAlignClass(
                              col
                            )} ${
                              meta.sticky ? "sticky z-30 bg-gray-100" : ""
                            }`}
                            style={style}
                          >
                            {i === 0 && (
                              <span className="text-gray-700 uppercase tracking-wide">
                                {groupBy.length > 0 ? "Grand Total" : "Total"}
                              </span>
                            )}
                            {val !== undefined
                              ? formatValue(val, col)
                              : ""}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* No data (but data array exists) */}
            {!hasDataFiltered && Array.isArray(data) && data.length > 0 && (
              <div className="p-4 text-center text-gray-500">
                No results found matching the current filters.
              </div>
            )}

            {/* Pagination Controls */}
            {itemsPerPage > 0 && hasDataFiltered && (
              <div className="flex items-center justify-end gap-2 p-2 border-t bg-white text-[11px] shrink-0">
                <span className="mr-2 opacity-70">
                  {groupBy.length > 0 ? "Groups: " : "Rows: "}
                  {safePage} of {totalPages} ({totalItems} total)
                </span>
                <button
                  className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  Prev
                </button>
                <button
                  className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  onClick={() =>
                    setCurrentPage((p) => (p < totalPages ? p + 1 : p))
                  }
                  disabled={safePage >= totalPages}
                >
                  Next
                </button>
              </div>
            )}

            {/* Hidden full-table container for PDF / Image export (ALL PAGES)
                👉 max column width 150px, text wrapped */}
            {hasDataFiltered && (
              <div
                ref={exportContainerRef}
                style={{ position: "absolute", left: "-99999px", top: 0 }}
              >
                <table className="border-collapse text-[8px]">
                  <thead>
                    <tr>
                      {visibleCols.map((col) => (
                        <th
                          key={col.key}
                          className="border px-2 py-1 text-left bg-gray-200 align-top"
                          style={{
                            maxWidth: 150,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {(groupBy.length === 0 ? filteredData : fullRenderRows).map(
                      (row, idx) => {
                        // Group header rows (when grouped)
                        if (groupBy.length > 0 && row.isGroup) {
                          return (
                            <tr
                              key={`exp-g-${row.key}-${row.value}-${row.level}-${idx}`}
                            >
                              <td
                                colSpan={visibleCols.length}
                                className="border px-2 py-1 font-semibold bg-gray-100"
                                style={{
                                  whiteSpace: "normal",
                                  wordBreak: "break-word",
                                }}
                              >
                                {columns.find((c) => c.key === row.key)?.label}:{" "}
                                {row.value} ({row.count})
                              </td>
                            </tr>
                          );
                        }

                        // Subtotal rows (when grouped)
                        if (groupBy.length > 0 && row.isSubtotal) {
                          return (
                            <tr key={`exp-sub-${row.groupValue}-${idx}`}>
                              {visibleCols.map((col, i) => {
                                const val = row.aggregates[col.key];
                                return (
                                  <td
                                    key={col.key}
                                    className="border px-2 py-1 font-semibold bg-yellow-50 align-top"
                                    style={{
                                      maxWidth: 150,
                                      whiteSpace: "normal",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {i === 0 && (
                                      <>
                                        Sub Total for {row.groupLabel}:{" "}
                                        {row.groupValue}{" "}
                                      </>
                                    )}
                                    {val !== undefined
                                      ? formatValue(val, col)
                                      : ""}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        }

                        // Normal data rows
                        return (
                          <tr key={`exp-row-${idx}`}>
                            {visibleCols.map((col) => (
                              <td
                                key={col.key}
                                className="border px-2 py-1 align-top"
                                style={{
                                  maxWidth: 150,
                                  whiteSpace: "normal",
                                  wordBreak: "break-word",
                                }}
                              >
                                {formatValue(row[col.key], col)}
                              </td>
                            ))}
                          </tr>
                        );
                      }
                    )}
                  </tbody>

                  <tfoot>
                    <tr>
                      {visibleCols.map((col, i) => (
                        <td
                          key={col.key}
                          className="border px-2 py-1 font-bold bg-gray-100 align-top"
                          style={{
                            maxWidth: 150,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                        >
                          {i === 0 &&
                            (groupBy.length > 0 ? "Grand Total" : "Total")}
                          {grandTotals[col.key] !== undefined
                            ? ` ${formatValue(grandTotals[col.key], col)}`
                            : ""}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

export default SearchGlobalReportTable;
