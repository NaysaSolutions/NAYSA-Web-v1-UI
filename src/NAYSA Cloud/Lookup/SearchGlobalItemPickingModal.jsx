import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  CircleX,
  ClipboardCheck,
  Eye,
  Grip,
  GripVertical,
  ListChecks,
  Maximize2,
  Minimize2,
  Minus,
  ReceiptText,
  RotateCcw,
  Search,
  WandSparkles,
  X,
} from "lucide-react";
import { useSwalErrorAlert as swalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

const numberDecimals = 2;

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value, decimals = numberDecimals) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(parseNumber(value));

const includesFilter = (value, filterValue) => {
  const needle = String(filterValue || "").trim().toUpperCase();
  if (!needle) return true;
  return String(value ?? "").toUpperCase().includes(needle);
};

const MIN_COLUMN_WIDTH = 70;
const MAX_AUTO_COLUMN_WIDTH = 240;
const MAX_MANUAL_COLUMN_WIDTH = 520;
const CHAR_WIDTH = 7;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const estimateColumnWidth = (label, values = [], minWidth = MIN_COLUMN_WIDTH) => {
  const longest = [label, ...values]
    .map((value) => String(value ?? "").length)
    .reduce((max, length) => Math.max(max, length), 0);

  return clamp(longest * CHAR_WIDTH + 36, minWidth, MAX_AUTO_COLUMN_WIDTH);
};

const baseAllocationColumns = [
  { key: "drag", label: "Drag", align: "center", minWidth: 56, filterable: false },
  { key: "priorityNo", label: "Priority", align: "center", minWidth: 84 },
  { key: "lotNo", label: "Lot No", align: "left", minWidth: 110 },
  { key: "qualityStatus", label: "Quality Status", align: "center", minWidth: 135 },
  { key: "bestBeforeDate", label: "Best Before Date", align: "center", minWidth: 145 },
  { key: "warehouseName", label: "Warehouse", align: "left", minWidth: 150 },
  { key: "locationCode", label: "Location", align: "left", minWidth: 105 },
  { key: "onHandQty", label: "On Hand Qty", align: "right", minWidth: 120 },
  { key: "allocatedQty", label: "Allocated Qty", align: "right", minWidth: 120 },
  { key: "remainingAvailable", label: "Remaining Available", align: "right", minWidth: 160 },
  { key: "pickQty", label: "Pick Qty", align: "right", minWidth: 100 },
  { key: "notes", label: "Notes", align: "left", minWidth: 140 },
];

const baseTransactionColumns = [
  { key: "view", label: "View", align: "center", minWidth: 64, filterable: false },
  { key: "sourceType", label: "Transaction Type", align: "left", minWidth: 150 },
  { key: "sourceDocNo", label: "Transaction No", align: "left", minWidth: 150 },
  { key: "sourceLineNo", label: "Line No", align: "center", minWidth: 95 },
  { key: "customerName", label: "Customer / Business Partner", align: "left", minWidth: 220 },
  { key: "warehouseName", label: "Warehouse", align: "left", minWidth: 150 },
  { key: "allocatedQty", label: "Allocated Qty", align: "right", minWidth: 125 },
  { key: "affectsCurrentLine", label: "Affects Current Line", align: "center", minWidth: 165 },
  { key: "date", label: "Date", align: "center", minWidth: 115 },
  { key: "status", label: "Status", align: "center", minWidth: 150 },
];

const buildSampleStockRows = (groupId = "DR-000145-LINE-2") => [
  {
    id: "STK-001",
    stockCardRefId: "SC-2026-000001",
    groupId,
    priorityNo: 1,
    lotNo: "LOT001",
    qualityStatus: "Approved",
    bestBeforeDate: "2026-06-15",
    warehouseCode: "WH1",
    warehouseName: "WH1 - Main",
    locationCode: "A-01-01",
    onHandQty: 80,
    allocatedQty: 20,
    remainingAvailable: 60,
    pickQty: 30,
    notes: "",
    isBlocked: false,
    blockedReason: "",
  },
  {
    id: "STK-002",
    stockCardRefId: "SC-2026-000002",
    groupId,
    priorityNo: 2,
    lotNo: "LOT002",
    qualityStatus: "Approved",
    bestBeforeDate: "2026-06-22",
    warehouseCode: "WH1",
    warehouseName: "WH1 - Main",
    locationCode: "A-01-02",
    onHandQty: 70,
    allocatedQty: 10,
    remainingAvailable: 60,
    pickQty: 40,
    notes: "",
    isBlocked: false,
    blockedReason: "",
  },
  {
    id: "STK-003",
    stockCardRefId: "SC-2026-000003",
    groupId,
    priorityNo: 3,
    lotNo: "LOT003",
    qualityStatus: "Approved",
    bestBeforeDate: "2026-05-28",
    warehouseCode: "WH1",
    warehouseName: "WH1 - Main",
    locationCode: "A-02-01",
    onHandQty: 50,
    allocatedQty: 50,
    remainingAvailable: 0,
    pickQty: 0,
    notes: "Fully Allocated",
    isBlocked: true,
    blockedReason: "Fully Allocated",
  },
  {
    id: "STK-004",
    stockCardRefId: "SC-2026-000004",
    groupId,
    priorityNo: 4,
    lotNo: "LOT004",
    qualityStatus: "Hold",
    bestBeforeDate: "2026-06-05",
    warehouseCode: "WH2",
    warehouseName: "WH2 - Secondary",
    locationCode: "B-01-01",
    onHandQty: 10,
    allocatedQty: 0,
    remainingAvailable: 0,
    pickQty: 0,
    notes: "Blocked due to Quality",
    isBlocked: true,
    blockedReason: "Blocked due to Quality",
  },
  {
    id: "STK-005",
    stockCardRefId: "SC-2026-000005",
    groupId,
    priorityNo: 5,
    lotNo: "LOT005",
    qualityStatus: "Approved",
    bestBeforeDate: "2026-06-30",
    warehouseCode: "WH2",
    warehouseName: "WH2 - Secondary",
    locationCode: "B-02-01",
    onHandQty: 45,
    allocatedQty: 0,
    remainingAvailable: 45,
    pickQty: 0,
    notes: "",
    isBlocked: false,
    blockedReason: "",
  },
];

const buildSampleExistingAllocations = () => [
  {
    id: "ALLOC-001",
    sourceType: "Delivery Receipt",
    sourceDocNo: "DR-2026-000145",
    sourceLineNo: "Line 1",
    customerName: "ABC Trading Corporation",
    itemCode: "ITEM-00125",
    lotNo: "LOT001",
    warehouseName: "WH1 - Main",
    allocatedQty: 10,
    affectsCurrentLine: "Yes",
    date: "2026-05-18",
    status: "Open",
    isSameTransaction: true,
  },
  {
    id: "ALLOC-002",
    sourceType: "Sales Invoice",
    sourceDocNo: "SI-2026-000088",
    sourceLineNo: "Line 3",
    customerName: "ABC Trading Corporation",
    itemCode: "ITEM-00125",
    lotNo: "LOT002",
    warehouseName: "WH1 - Main",
    allocatedQty: 20,
    affectsCurrentLine: "Yes",
    date: "2026-05-16",
    status: "Open",
    isSameTransaction: false,
  },
  {
    id: "ALLOC-003",
    sourceType: "Transfer",
    sourceDocNo: "TR-2026-000031",
    sourceLineNo: "Line 1",
    customerName: "ABC Trading Corporation",
    itemCode: "ITEM-00125",
    lotNo: "LOT002",
    warehouseName: "WH2 - Secondary",
    allocatedQty: 10,
    affectsCurrentLine: "Yes",
    date: "2026-05-15",
    status: "Open",
    isSameTransaction: false,
  },
];

const statusBadgeClass = (status) => {
  const normalized = String(status || "").toUpperCase();

  if (["GOOD", "APPROVED", "RELEASED", "OPEN"].includes(normalized)) {
    return "border-blue-300 bg-blue-50 text-blue-700";
  }

  if (["HOLD", "BLOCKED", "QUARANTINE"].includes(normalized)) {
    return "border-orange-300 bg-orange-50 text-orange-700";
  }

  return "border-slate-300 bg-slate-50 text-slate-600";
};

const SummaryLine = ({ label, value, valueClassName = "" }) => (
  <div className="flex min-w-0 gap-2 text-xs leading-5">
    <span className="shrink-0 font-semibold text-slate-500">{label} :</span>
    <span className={`min-w-0 truncate font-semibold text-slate-900 ${valueClassName}`}>
      {value || "-"}
    </span>
  </div>
);

const MetricBox = ({ label, value, tone = "default", decimals = numberDecimals }) => {
  const toneClass =
    tone === "green"
      ? "text-blue-700 bg-blue-50"
      : tone === "orange"
      ? "text-orange-700 bg-orange-50"
      : tone === "red"
      ? "text-rose-700 bg-rose-50"
      : tone === "blue"
      ? "text-blue-700 bg-blue-50"
      : "text-slate-900 bg-white";

  return (
    <div className={`rounded-lg border border-slate-200 px-3 py-2 text-right ${toneClass}`}>
      <p className="min-h-[20px] text-right text-[10px] font-medium leading-tight text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-right text-sm font-medium">{formatNumber(value, decimals)}</p>
    </div>
  );
};

const AllocationStatusPill = ({ children }) => {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
      {children}
    </span>
  );
};

export default function SearchGlobalItemPickingModal({
  isOpen = true,
  onClose,
  onConfirm,
  transaction,
  stockRows,
  existingAllocations,
  allowManualAllocation = true,
  defaultAutoAllocateMode = "FIFO",
}) {
  const { companyInfo } = useAuth();
  const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);

  const resolvedTransaction = {
    sourceDocType: "DR",
    sourceDocTypeName: "Delivery Receipt",
    sourceDocNo: "DR-2026-000145",
    sourceLineNo: "Line 2",
    groupId: "DR-000145-LINE-2",
    customerCode: "CUST-0001",
    customerName: "ABC Trading Corporation",
    itemCode: "ITEM-00125",
    itemName: "Fresh Milk 1L",
    requestedQty: 100,
    ...transaction,
  };

  const [rows, setRows] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [activeTableTab, setActiveTableTab] = useState("allocationDetails");
  const [allocationFilters, setAllocationFilters] = useState({});
  const [transactionFilters, setTransactionFilters] = useState({});
  const [allocationColumnOrder, setAllocationColumnOrder] = useState(baseAllocationColumns.map((column) => column.key));
  const [transactionColumnOrder, setTransactionColumnOrder] = useState(baseTransactionColumns.map((column) => column.key));
  const [allocationColumnWidths, setAllocationColumnWidths] = useState({});
  const [transactionColumnWidths, setTransactionColumnWidths] = useState({});
  const [draggedRowId, setDraggedRowId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [modalBounds, setModalBounds] = useState({
    left: null,
    top: null,
    width: 1280,
    height: null,
  });
  const draggingColumnRef = useRef({ table: "", key: "" });
  const resizingColumnRef = useRef({ table: "", key: "", startX: 0, startWidth: 0 });
  const movingModalRef = useRef(null);
  const resizingModalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const initialRows = Array.isArray(stockRows) && stockRows.length > 0
      ? stockRows
      : buildSampleStockRows(resolvedTransaction.groupId);

    const normalizedRows = initialRows.map((row, index) => ({
      ...row,
      groupId: row.groupId || resolvedTransaction.groupId,
      priorityNo: row.priorityNo || index + 1,
      pickQty: parseNumber(row.pickQty),
      onHandQty: parseNumber(row.onHandQty),
      allocatedQty: parseNumber(row.allocatedQty),
      remainingAvailable: parseNumber(row.remainingAvailable),
      isBlocked:
        row.isBlocked ||
        parseNumber(row.remainingAvailable) <= 0 ||
        ["HOLD", "BLOCKED", "QUARANTINE"].includes(String(row.qualityStatus || "").toUpperCase()),
    }));

    setRows(normalizedRows);
    setAllocations(
      Array.isArray(existingAllocations) && existingAllocations.length > 0
        ? existingAllocations
        : buildSampleExistingAllocations()
    );
  }, [isOpen, stockRows, existingAllocations, resolvedTransaction.groupId]);

  useEffect(() => {
    if (isOpen) return;
    setIsMinimized(false);
    setIsMaximized(false);
    setModalBounds({
      left: null,
      top: null,
      width: 1280,
      height: null,
    });
  }, [isOpen]);

  const handleAllocationFilterChange = (key, value) => {
    setAllocationFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleTransactionFilterChange = (key, value) => {
    setTransactionFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      return (
        includesFilter(row.priorityNo, allocationFilters.priorityNo) &&
        includesFilter(row.lotNo, allocationFilters.lotNo) &&
        includesFilter(row.qualityStatus, allocationFilters.qualityStatus) &&
        includesFilter(row.bestBeforeDate, allocationFilters.bestBeforeDate) &&
        includesFilter(row.warehouseName || row.warehouseCode, allocationFilters.warehouseName) &&
        includesFilter(row.locationCode, allocationFilters.locationCode) &&
        includesFilter(formatNumber(row.onHandQty, quantityDecimals), allocationFilters.onHandQty) &&
        includesFilter(formatNumber(row.allocatedQty, quantityDecimals), allocationFilters.allocatedQty) &&
        includesFilter(formatNumber(row.remainingAvailable, quantityDecimals), allocationFilters.remainingAvailable) &&
        includesFilter(formatNumber(row.pickQty, quantityDecimals), allocationFilters.pickQty) &&
        includesFilter(row.blockedReason || row.notes, allocationFilters.notes)
      );
    });
  }, [rows, allocationFilters, quantityDecimals]);

  const filteredAllocations = useMemo(() => {
    return allocations.filter((entry) => (
      includesFilter(entry.sourceType, transactionFilters.sourceType) &&
      includesFilter(entry.sourceDocNo, transactionFilters.sourceDocNo) &&
      includesFilter(entry.sourceLineNo, transactionFilters.sourceLineNo) &&
      includesFilter(entry.customerName, transactionFilters.customerName) &&
      includesFilter(entry.warehouseName, transactionFilters.warehouseName) &&
      includesFilter(formatNumber(entry.allocatedQty, quantityDecimals), transactionFilters.allocatedQty) &&
      includesFilter(entry.affectsCurrentLine, transactionFilters.affectsCurrentLine) &&
      includesFilter(entry.date, transactionFilters.date) &&
      includesFilter(entry.isSameTransaction ? "Same Transaction" : entry.status, transactionFilters.status)
    ));
  }, [allocations, transactionFilters, quantityDecimals]);

  const getTransactionRoute = (entry) => {
    const sourceType = String(entry?.sourceType || "").toUpperCase();
    const docNo = String(entry?.sourceDocNo || "").toUpperCase();

    if (docNo.startsWith("DR-") || sourceType.includes("DELIVERY")) {
      return { page: "DR", docParam: "soNo" };
    }

    if (docNo.startsWith("SO-") || sourceType.includes("SALES ORDER")) {
      return { page: "SO", docParam: "soNo" };
    }

    if (docNo.startsWith("MSST-") || sourceType.includes("TRANSFER")) {
      return { page: "MSST", docParam: "msstNo" };
    }

    if (docNo.startsWith("SI-") || sourceType.includes("SALES INVOICE")) {
      return { page: "SVI", docParam: "sviNo" };
    }

    return null;
  };

  const handleViewAllocatedTransaction = (entry) => {
    const route = getTransactionRoute(entry);
    if (!route || !entry?.sourceDocNo) {
      swalErrorAlert("View Transaction", "Unable to determine the transaction page for this record.");
      return;
    }

    const params = new URLSearchParams({
      [route.docParam]: entry.sourceDocNo,
      branchCode: entry.branchCode || entry.sourceBranchCode || resolvedTransaction.branchCode || "",
      viewDocument: "true",
    });

    window.open(`/page/${route.page}?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const allocationTableTotals = useMemo(() => {
    return filteredRows.reduce(
      (sum, row) => ({
        onHandQty: sum.onHandQty + parseNumber(row.onHandQty),
        allocatedQty: sum.allocatedQty + parseNumber(row.allocatedQty),
        remainingAvailable: sum.remainingAvailable + parseNumber(row.remainingAvailable),
        pickQty: sum.pickQty + parseNumber(row.pickQty),
      }),
      { onHandQty: 0, allocatedQty: 0, remainingAvailable: 0, pickQty: 0 }
    );
  }, [filteredRows]);

  const transactionTableTotals = useMemo(() => {
    return filteredAllocations.reduce(
      (sum, entry) => sum + parseNumber(entry.allocatedQty),
      0
    );
  }, [filteredAllocations]);

  const getAllocationCellValue = (row, key) => {
    switch (key) {
      case "drag":
        return "";
      case "warehouseName":
        return row.warehouseName || row.warehouseCode || "";
      case "onHandQty":
      case "allocatedQty":
      case "remainingAvailable":
      case "pickQty":
        return formatNumber(row[key], quantityDecimals);
      case "notes":
        return row.blockedReason || row.notes || "";
      default:
        return row[key] ?? "";
    }
  };

  const getTransactionCellValue = (entry, key) => {
    switch (key) {
      case "view":
        return "";
      case "allocatedQty":
        return formatNumber(entry.allocatedQty, quantityDecimals);
      case "status":
        return entry.isSameTransaction ? "Same Transaction" : entry.status;
      default:
        return entry[key] ?? "";
    }
  };

  useEffect(() => {
    if (!rows.length) return;

    setAllocationColumnWidths((prev) => {
      const next = { ...prev };
      baseAllocationColumns.forEach((column) => {
        if (next[column.key]) return;
        next[column.key] = estimateColumnWidth(
          column.label,
          rows.map((row) => getAllocationCellValue(row, column.key)),
          column.minWidth
        );
      });
      return next;
    });
  }, [rows, quantityDecimals]);

  useEffect(() => {
    if (!allocations.length) return;

    setTransactionColumnWidths((prev) => {
      const next = { ...prev };
      baseTransactionColumns.forEach((column) => {
        if (next[column.key]) return;
        next[column.key] = estimateColumnWidth(
          column.label,
          allocations.map((entry) => getTransactionCellValue(entry, column.key)),
          column.minWidth
        );
      });
      return next;
    });
  }, [allocations, quantityDecimals]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (movingModalRef.current) {
        const { offsetX, offsetY, width, height } = movingModalRef.current;
        const nextLeft = clamp(event.clientX - offsetX, 8, Math.max(8, window.innerWidth - width - 8));
        const nextTop = clamp(event.clientY - offsetY, 8, Math.max(8, window.innerHeight - height - 8));
        setModalBounds((prev) => ({ ...prev, left: nextLeft, top: nextTop }));
        return;
      }

      if (resizingModalRef.current) {
        const { startX, startY, startWidth, startHeight, left, top } = resizingModalRef.current;
        const maxWidth = Math.max(420, window.innerWidth - left - 8);
        const maxHeight = Math.max(360, window.innerHeight - top - 8);
        const nextWidth = clamp(startWidth + event.clientX - startX, 720, maxWidth);
        const nextHeight = clamp(startHeight + event.clientY - startY, 480, maxHeight);
        setModalBounds((prev) => ({ ...prev, width: nextWidth, height: nextHeight }));
        return;
      }

      const { table, key, startX, startWidth } = resizingColumnRef.current;
      if (!table || !key) return;

      const columns = table === "allocation" ? baseAllocationColumns : baseTransactionColumns;
      const column = columns.find((item) => item.key === key);
      const nextWidth = clamp(
        startWidth + event.clientX - startX,
        column?.minWidth || MIN_COLUMN_WIDTH,
        MAX_MANUAL_COLUMN_WIDTH
      );
      const setWidths = table === "allocation" ? setAllocationColumnWidths : setTransactionColumnWidths;
      setWidths((prev) => ({ ...prev, [key]: nextWidth }));
    };

    const handleMouseUp = () => {
      movingModalRef.current = null;
      resizingModalRef.current = null;
      resizingColumnRef.current = { table: "", key: "", startX: 0, startWidth: 0 };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const orderedAllocationColumns = useMemo(() => {
    return allocationColumnOrder
      .map((key) => baseAllocationColumns.find((column) => column.key === key))
      .filter(Boolean);
  }, [allocationColumnOrder]);

  const orderedTransactionColumns = useMemo(() => {
    return transactionColumnOrder
      .map((key) => baseTransactionColumns.find((column) => column.key === key))
      .filter(Boolean);
  }, [transactionColumnOrder]);

  const allocationTableWidth = useMemo(() => (
    orderedAllocationColumns.reduce((sum, column) => sum + (allocationColumnWidths[column.key] || column.minWidth), 0)
  ), [orderedAllocationColumns, allocationColumnWidths]);

  const transactionTableWidth = useMemo(() => (
    orderedTransactionColumns.reduce((sum, column) => sum + (transactionColumnWidths[column.key] || column.minWidth), 0)
  ), [orderedTransactionColumns, transactionColumnWidths]);

  const handleHeaderDragStart = (table, key) => {
    draggingColumnRef.current = { table, key };
  };

  const handleHeaderDrop = (table, targetKey) => {
    const { table: sourceTable, key: sourceKey } = draggingColumnRef.current;
    draggingColumnRef.current = { table: "", key: "" };
    if (sourceTable !== table || !sourceKey || sourceKey === targetKey) return;

    const setOrder = table === "allocation" ? setAllocationColumnOrder : setTransactionColumnOrder;
    setOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(sourceKey);
      const toIndex = next.indexOf(targetKey);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const startColumnResize = (event, table, key, width) => {
    event.preventDefault();
    event.stopPropagation();
    resizingColumnRef.current = {
      table,
      key,
      startX: event.clientX,
      startWidth: width,
    };
  };

  const startModalMove = (event) => {
    if (isMaximized) return;
    const modal = event.currentTarget.closest("[data-item-picking-modal]");
    const rect = modal?.getBoundingClientRect();
    if (!rect) return;

    movingModalRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };

    setModalBounds((prev) => ({
      ...prev,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }));
  };

  const startModalResize = (event) => {
    if (isMaximized) return;
    event.preventDefault();
    event.stopPropagation();

    const modal = event.currentTarget.closest("[data-item-picking-modal]");
    const rect = modal?.getBoundingClientRect();
    if (!rect) return;

    resizingModalRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      left: rect.left,
      top: rect.top,
    };

    setModalBounds((prev) => ({
      ...prev,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }));
  };

  const totals = useMemo(() => {
    const totalOnHand = rows.reduce((sum, row) => sum + parseNumber(row.onHandQty), 0);
    const totalAllocated = rows.reduce((sum, row) => sum + parseNumber(row.allocatedQty), 0);
    const remainingAvailable = rows.reduce((sum, row) => sum + parseNumber(row.remainingAvailable), 0);
    const pickedForThisLine = rows.reduce((sum, row) => sum + parseNumber(row.pickQty), 0);

    const sameTransactionOtherLines = allocations
      .filter((entry) => entry.isSameTransaction)
      .reduce((sum, entry) => sum + parseNumber(entry.allocatedQty), 0);

    const otherTransactions = allocations
      .filter((entry) => !entry.isSameTransaction)
      .reduce((sum, entry) => sum + parseNumber(entry.allocatedQty), 0);

    const availableForThisLine = Math.max(parseNumber(resolvedTransaction.requestedQty) - sameTransactionOtherLines - otherTransactions, 0);
    const balanceToPick = parseNumber(resolvedTransaction.requestedQty) - sameTransactionOtherLines - otherTransactions - pickedForThisLine;

    return {
      totalOnHand,
      totalAllocated,
      remainingAvailable,
      pickedForThisLine,
      sameTransactionOtherLines,
      otherTransactions,
      availableForThisLine,
      balanceToPick,
    };
  }, [rows, allocations, resolvedTransaction.requestedQty]);

  const isBalanced = Math.abs(totals.balanceToPick) < 0.0001;

  const refreshPriorityNumbers = (sourceRows) =>
    sourceRows.map((row, index) => ({
      ...row,
      priorityNo: index + 1,
    }));

  const handleDragStart = (rowId) => {
    setDraggedRowId(rowId);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (targetRowId) => {
    if (!draggedRowId || draggedRowId === targetRowId) {
      setDraggedRowId(null);
      return;
    }

    setRows((prevRows) => {
      const nextRows = [...prevRows];
      const fromIndex = nextRows.findIndex((row) => row.id === draggedRowId);
      const toIndex = nextRows.findIndex((row) => row.id === targetRowId);

      if (fromIndex < 0 || toIndex < 0) return prevRows;

      const [movedRow] = nextRows.splice(fromIndex, 1);
      nextRows.splice(toIndex, 0, movedRow);

      return refreshPriorityNumbers(nextRows);
    });

    setDraggedRowId(null);
  };

  const handleMoveRow = (rowId, direction) => {
    setRows((prevRows) => {
      const nextRows = [...prevRows];
      const index = nextRows.findIndex((row) => row.id === rowId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= nextRows.length) {
        return prevRows;
      }

      [nextRows[index], nextRows[targetIndex]] = [nextRows[targetIndex], nextRows[index]];
      return refreshPriorityNumbers(nextRows);
    });
  };

  const handlePickQtyChange = (rowId, value) => {
    const cleanValue = String(value).replace(/[^0-9.]/g, "");
    const regex = new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`);

    if (!regex.test(cleanValue) && cleanValue !== "") return;

    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== rowId) return row;
        const nextPickQty = parseNumber(cleanValue);
        const maxQty = parseNumber(row.remainingAvailable);

        return {
          ...row,
          pickQty: Math.min(nextPickQty, maxQty),
        };
      })
    );
  };
  const handlePickQtyBlur = (rowId) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              pickQty: parseNumber(row.pickQty),
            }
          : row
      )
    );
  };
  const handleAutoAllocate = () => {
    let remainingQty = Math.max(totals.availableForThisLine, 0);

    const prioritizedRows = [...rows].sort((a, b) => {
      const dateA = new Date(a.bestBeforeDate).getTime();
      const dateB = new Date(b.bestBeforeDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return Number(a.priorityNo || 0) - Number(b.priorityNo || 0);
    });

    const autoRows = prioritizedRows.map((row) => {
      if (row.isBlocked || remainingQty <= 0) {
        return { ...row, pickQty: 0 };
      }

      const qty = Math.min(parseNumber(row.remainingAvailable), remainingQty);
      remainingQty -= qty;

      return { ...row, pickQty: qty };
    });

    setRows(refreshPriorityNumbers(autoRows));
  };
  const handleClearPick = () => {
    setRows((prevRows) => prevRows.map((row) => ({ ...row, pickQty: 0 })));
  };
  const handleConfirm = () => {
    if (!isBalanced) {
      swalErrorAlert(
        "Invalid Pick Quantity",
        "Picked quantity does not match the available quantity for this line."
      );
      return;
    }

    const pickedRows = rows.filter((row) => parseNumber(row.pickQty) > 0);

    const payload = {
      sourceDocType: resolvedTransaction.sourceDocType,
      sourceDocTypeName: resolvedTransaction.sourceDocTypeName,
      sourceDocNo: resolvedTransaction.sourceDocNo,
      sourceLineNo: resolvedTransaction.sourceLineNo,
      groupId: resolvedTransaction.groupId,
      customerCode: resolvedTransaction.customerCode,
      customerName: resolvedTransaction.customerName,
      itemCode: resolvedTransaction.itemCode,
      itemName: resolvedTransaction.itemName,
      requestedQty: parseNumber(resolvedTransaction.requestedQty),
      totalPicked: totals.pickedForThisLine,
      balanceToPick: totals.balanceToPick,
      allocations: pickedRows.map((row) => ({
        groupId: resolvedTransaction.groupId,
        sourceDocType: resolvedTransaction.sourceDocType,
        sourceDocNo: resolvedTransaction.sourceDocNo,
        sourceLineNo: resolvedTransaction.sourceLineNo,
        itemCode: resolvedTransaction.itemCode,
        stockCardRefId: row.stockCardRefId,
        lotNo: row.lotNo,
        qualityStatus: row.qualityStatus,
        bestBeforeDate: row.bestBeforeDate,
        warehouseCode: row.warehouseCode,
        warehouseName: row.warehouseName,
        locationCode: row.locationCode,
        priorityNo: row.priorityNo,
        pickQty: parseNumber(row.pickQty),
      })),
      orderedStockRows: rows.map((row) => ({
        stockCardRefId: row.stockCardRefId,
        lotNo: row.lotNo,
        priorityNo: row.priorityNo,
        pickQty: parseNumber(row.pickQty),
      })),
    };

    onConfirm?.(payload);
  };

  const renderColumnFilter = (filters, onChange, key, placeholder = "Filter...") => (
    <div className="relative">
      <input
        type="text"
        value={filters[key] || ""}
        onChange={(e) => onChange(key, e.target.value)}
        className="global-lookup-filter-text-ui"
        placeholder={placeholder}
      />
      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
    </div>
  );

  const getTextAlignClass = (align) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  const renderResizableHeader = (table, column, width) => (
    <th
      key={column.key}
      draggable
      onDragStart={() => handleHeaderDragStart(table, column.key)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => handleHeaderDrop(table, column.key)}
      className={`global-lookup-th-ui relative border-r border-slate-300 bg-slate-200 ${getTextAlignClass(column.align)}`}
      style={{ width, minWidth: column.minWidth }}
      title="Drag to reorder column"
    >
      <span className="global-lookup-th-text-ui inline-flex min-w-0 items-center gap-1 truncate">
        {column.label}
        {column.key === "priorityNo" && <ArrowDownUp size={12} className="text-slate-500" />}
      </span>
      <span
        role="presentation"
        onMouseDown={(event) => startColumnResize(event, table, column.key, width)}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-400/40"
      />
    </th>
  );

  const renderFilterCell = (table, column, width) => {
    const filters = table === "allocation" ? allocationFilters : transactionFilters;
    const onChange = table === "allocation" ? handleAllocationFilterChange : handleTransactionFilterChange;

    return (
      <td
        key={column.key}
        className="bg-slate-200 px-2 py-1"
        style={{ width, minWidth: column.minWidth }}
      >
        {column.filterable === false ? null : renderColumnFilter(filters, onChange, column.key)}
      </td>
    );
  };

  const renderAllocationCell = (row, column) => {
    const commonClass = `whitespace-nowrap overflow-hidden text-ellipsis px-2 py-0.5 ${getTextAlignClass(column.align)}`;

    switch (column.key) {
      case "drag":
        return (
          <td key={column.key} className={commonClass}>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
              className="cursor-grab rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical size={18} />
              </button>
            </div>
          </td>
        );
      case "priorityNo":
        return (
          <td key={column.key} className={commonClass}>
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => handleMoveRow(row.id, "up")}
                className="hidden rounded px-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-blue-600 md:inline"
                title="Move up"
              >
                &#9650;
              </button>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] text-slate-700">
                {row.priorityNo}
              </span>
              <button
                type="button"
                onClick={() => handleMoveRow(row.id, "down")}
                className="hidden rounded px-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-blue-600 md:inline"
                title="Move down"
              >
                &#9660;
              </button>
            </div>
          </td>
        );
      case "qualityStatus":
        return (
          <td key={column.key} className={commonClass}>
            <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${statusBadgeClass(row.qualityStatus)}`}>
              {row.qualityStatus}
            </span>
          </td>
        );
      case "pickQty": {
        const canPick = allowManualAllocation && !row.isBlocked && parseNumber(row.remainingAvailable) > 0;
        return (
          <td key={column.key} className={commonClass}>
            <input
              type="number"
              min="0"
              step={quantityDecimals > 0 ? `0.${"0".repeat(Math.max(quantityDecimals - 1, 0))}1` : "1"}
              value={Number(parseNumber(row.pickQty)).toFixed(quantityDecimals)}
              disabled={!canPick}
              onChange={(event) => handlePickQtyChange(row.id, event.target.value)}
              onBlur={() => handlePickQtyBlur(row.id)}
              className={`h-7 w-20 bg-transparent px-1 text-right text-xs outline-none transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                canPick
                  ? "text-slate-900 focus:text-blue-700"
                  : "cursor-not-allowed text-slate-400"
              }`}
            />
          </td>
        );
      }
      case "notes":
        return (
          <td key={column.key} className={commonClass}>
            {row.blockedReason ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                {row.blockedReason.toUpperCase().includes("QUALITY") && <AlertCircle size={13} />}
                {row.blockedReason}
              </span>
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </td>
        );
      default:
        return (
          <td key={column.key} className={commonClass}>
            {getAllocationCellValue(row, column.key)}
          </td>
        );
    }
  };

  const renderTransactionCell = (entry, column) => {
    const commonClass = `whitespace-nowrap overflow-hidden text-ellipsis px-2 py-0.5 ${getTextAlignClass(column.align)}`;

    if (column.key === "view") {
      return (
        <td key={column.key} className={commonClass}>
          <button
            type="button"
            onClick={() => handleViewAllocatedTransaction(entry)}
            className="inline-flex h-5 items-center justify-center rounded bg-blue-500 px-2 text-white transition hover:bg-blue-600"
            title="View"
          >
            <Eye size={13} />
          </button>
        </td>
      );
    }

    if (column.key === "status") {
      return (
        <td key={column.key} className={commonClass}>
          <AllocationStatusPill>
            {getTransactionCellValue(entry, column.key)}
          </AllocationStatusPill>
        </td>
      );
    }

    return (
      <td key={column.key} className={commonClass}>
        {getTransactionCellValue(entry, column.key)}
      </td>
    );
  };

  const getAllocationFooterValue = (column, index) => {
    if (index === 0) return "Total";
    if (column.key === "onHandQty") return formatNumber(allocationTableTotals.onHandQty, quantityDecimals);
    if (column.key === "allocatedQty") return formatNumber(allocationTableTotals.allocatedQty, quantityDecimals);
    if (column.key === "remainingAvailable") return formatNumber(allocationTableTotals.remainingAvailable, quantityDecimals);
    if (column.key === "pickQty") return formatNumber(allocationTableTotals.pickQty, quantityDecimals);
    return "";
  };

  const getTransactionFooterValue = (column, index) => {
    if (index === 0) return "Total";
    if (column.key === "allocatedQty") return formatNumber(transactionTableTotals, quantityDecimals);
    return "";
  };

  const handleMinimizedOverlayWheel = (event) => {
    const tableScroller =
      document.querySelector("#apv_dtl .global-tran-table-main-sub-div-ui") ||
      document.querySelector("#apv_dtl .global-tran-table-main-div-ui");

    if (!tableScroller) return;

    const horizontalDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
    if (!horizontalDelta) return;

    event.preventDefault();
    tableScroller.scrollLeft += horizontalDelta;
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed inset-0 z-[9999] bg-transparent" onWheel={handleMinimizedOverlayWheel}>
        <div className="absolute bottom-4 right-4 flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-2xl shadow-slate-900/20 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-slate-900/25">
          <div className="flex min-w-0 items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <div className="min-w-0">
              <div className="max-w-[260px] truncate font-semibold text-slate-800">
                Search Global Item Picking / Allocation
              </div>
              <div className="text-[10px] text-slate-500">
                {resolvedTransaction.sourceDocNo} - {resolvedTransaction.itemCode}
              </div>
            </div>
          </div>
          <div className="ml-1 flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"
              aria-label="Close item picking modal"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modalStyle = isMaximized
    ? undefined
    : {
        width: modalBounds.width,
        maxWidth: "calc(100vw - 24px)",
        height: modalBounds.height || undefined,
        maxHeight: "calc(100dvh - 24px)",
        ...(modalBounds.left !== null && modalBounds.top !== null
          ? {
              position: "absolute",
              left: modalBounds.left,
              top: modalBounds.top,
            }
          : {}),
      };

  return (
    <div className={`fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-sm ${isMaximized ? "flex items-center justify-center p-0" : modalBounds.left === null ? "flex items-center justify-center p-3" : "p-0"}`}>
      <div
        data-item-picking-modal
        className={`relative flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl ${
          isMaximized
            ? "h-[100dvh] w-screen rounded-none"
            : "rounded-2xl"
        }`}
        style={modalStyle}
      >
        <div
          className={`flex items-center justify-between border-b border-slate-200 bg-slate-100 py-1 ${isMaximized ? "" : "cursor-move select-none"}`}
          onMouseDown={startModalMove}
        >
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">
              Search Global Item Picking / Allocation
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-2 text-slate-400 transition-colors hover:text-blue-600"
              title="Minimize"
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-2 text-slate-400 transition-colors hover:text-blue-600"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 transition-colors hover:text-red-600"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-slate-200 p-3 md:grid-cols-3">
              <div className="space-y-1">
                <SummaryLine label="Transaction Type" value={resolvedTransaction.sourceDocTypeName} valueClassName="text-blue-700" />
                <SummaryLine label="Transaction No" value={resolvedTransaction.sourceDocNo} valueClassName="text-blue-700" />
              </div>
              <div className="space-y-1">
                <SummaryLine label="Current Line No" value={resolvedTransaction.sourceLineNo} />
                <SummaryLine label="Customer" value={resolvedTransaction.customerName} />
              </div>
              <div className="space-y-1">
                <SummaryLine label="Item Code" value={resolvedTransaction.itemCode} />
                <SummaryLine label="Item Description" value={resolvedTransaction.itemName} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <MetricBox label="Requested Qty" value={resolvedTransaction.requestedQty} decimals={quantityDecimals} />
              <MetricBox label="Already Allocated to Other Transactions" value={totals.otherTransactions} tone="orange" decimals={quantityDecimals} />
              <MetricBox label="Already Allocated in Same Transaction (Other Lines)" value={totals.sameTransactionOtherLines} tone="orange" decimals={quantityDecimals} />
              <MetricBox label="Available for This Line" value={totals.availableForThisLine} tone="green" decimals={quantityDecimals} />
              <MetricBox label="Picked for This Line" value={totals.pickedForThisLine} tone="green" decimals={quantityDecimals} />
              <MetricBox label="Balance to Pick" value={totals.balanceToPick} tone={isBalanced ? "green" : "red"} decimals={quantityDecimals} />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center">
              <div className="inline-flex w-full rounded-full border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTableTab("allocationDetails")}
                className={`inline-flex flex-1 items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold transition sm:flex-none ${
                  activeTableTab === "allocationDetails"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks size={15} />
                  Allocation Details
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTableTab("allocatedTransaction")}
                className={`inline-flex flex-1 items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold transition sm:flex-none ${
                  activeTableTab === "allocatedTransaction"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ReceiptText size={15} />
                  Allocated Transaction
                </span>
              </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (activeTableTab === "allocationDetails") {
                    setAllocationFilters({});
                  } else {
                    setTransactionFilters({});
                  }
                }}
                className="inline-flex items-center justify-center gap-1 self-stretch rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 sm:ml-auto sm:self-center"
              >
                <RotateCcw size={13} />
                Clear Filters
              </button>
            </div>

            {activeTableTab === "allocationDetails" ? (
              <>
            <div className="overflow-x-auto">
              <table
                className="table-fixed border-collapse text-xs"
                style={{ width: allocationTableWidth, minWidth: allocationTableWidth }}
              >
                <thead className="bg-slate-200">
                  <tr>
                    {orderedAllocationColumns.map((column) =>
                      renderResizableHeader("allocation", column, allocationColumnWidths[column.key] || column.minWidth)
                    )}
                  </tr>
                  <tr className="bg-slate-200">
                    {orderedAllocationColumns.map((column) =>
                      renderFilterCell("allocation", column, allocationColumnWidths[column.key] || column.minWidth)
                    )}
                  </tr>
                </thead>

                <tbody className="text-slate-700">
                  {filteredRows.map((row) => {
                    return (
                      <tr
                        key={row.id}
                        draggable={allowManualAllocation}
                        onDragStart={() => handleDragStart(row.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(row.id)}
                        className={`border-b border-slate-200 bg-white ${draggedRowId === row.id ? "opacity-60" : ""}`}
                      >
                        {orderedAllocationColumns.map((column) => renderAllocationCell(row, column))}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 text-xs font-bold text-slate-800">
                  <tr>
                    {orderedAllocationColumns.map((column, index) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap overflow-hidden text-ellipsis px-2 py-2 ${getTextAlignClass(index === 0 ? "right" : column.align)}`}
                      >
                        {getAllocationFooterValue(column, index)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
              </>
            ) : (
              <>
            <div className="overflow-x-auto">
              <table
                className="table-fixed border-collapse text-xs"
                style={{ width: transactionTableWidth, minWidth: transactionTableWidth }}
              >
                <thead className="bg-slate-200">
                  <tr>
                    {orderedTransactionColumns.map((column) =>
                      renderResizableHeader("transaction", column, transactionColumnWidths[column.key] || column.minWidth)
                    )}
                  </tr>
                  <tr className="bg-slate-200">
                    {orderedTransactionColumns.map((column) =>
                      renderFilterCell("transaction", column, transactionColumnWidths[column.key] || column.minWidth)
                    )}
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {filteredAllocations.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100">
                      {orderedTransactionColumns.map((column) => renderTransactionCell(entry, column))}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 text-xs font-bold text-slate-800">
                  <tr>
                    {orderedTransactionColumns.map((column, index) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap overflow-hidden text-ellipsis px-2 py-2 ${getTextAlignClass(index === 0 ? "right" : column.align)}`}
                      >
                        {getTransactionFooterValue(column, index)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
              </>
            )}
          </div>

        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAutoAllocate}
              className="inline-flex h-9 w-36 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700"
            >
              <WandSparkles size={16} />
              Auto Allocate
            </button>

            <button
              type="button"
              onClick={handleClearPick}
              className="inline-flex h-9 w-36 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700"
            >
              <CircleX size={16} />
              Clear Pick
            </button>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex h-9 w-36 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700"
            >
              <ClipboardCheck size={17} />
              Confirm Allocation
            </button>
          </div>
        </div>
        {!isMaximized && (
          <div
            role="presentation"
            onMouseDown={startModalResize}
            className="absolute bottom-1 right-1 flex h-6 w-6 cursor-se-resize items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
            title="Resize"
          >
            <Grip size={14} />
          </div>
        )}
      </div>
    </div>
  );
}
