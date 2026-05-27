import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ClipboardList,
  FileBarChart2,
  Package,
  RefreshCcw,
  Search,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Layers,
} from "lucide-react";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const formatDateValue = (value) => value || "";
const toNumber = (value) => Number(value || 0);
const sumBy = (rows, key) =>
  safeArray(rows).reduce((total, row) => total + toNumber(row?.[key]), 0);

const MAIN_TABS = {
  FIFO: [
    { key: "fifo", label: "FIFO Balance", icon: Package },
    { key: "stockCard", label: "Stock Card", icon: ClipboardList },
    { key: "stockStatus", label: "Stock Status", icon: FileBarChart2 },
  ],
  WAC: [
    { key: "location", label: "Location Balance", icon: Boxes },
    { key: "stockCard", label: "Stock Card", icon: ClipboardList },
    { key: "stockStatus", label: "Stock Status", icon: FileBarChart2 },
  ],
};

const STOCK_STATUS_SUBTABS = [
  { key: "summary", label: "Summary" },
  { key: "perItem", label: "Per Item" },
  { key: "perLot", label: "Per Lot / BB / QC" },
];

// ─── Tab Button ──────────────────────────────────────────────────────────────
function TabButton({ active, label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-150 mt-6 ${
        active
          ? "border-blue-600 text-blue-700 bg-blue-50/60"
          : "border-transparent text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/40"
      }`}
    >
      {Icon && <Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} />}
      <span>{label}</span>
    </button>
  );
}

// ─── Sub Tab Button ───────────────────────────────────────────────────────────
function SubTabButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolbarButton({ children, onClick, icon: Icon, variant = "default", className = "" }) {
  const variants = {
    default: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400",
    primary: "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-500",
    ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={14} />}
      <span>{children}</span>
    </button>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, accentClass = "text-slate-700", bgClass = "bg-white" }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-slate-200 ${bgClass} px-4 py-2.5 min-w-[170px] shadow-sm`}>
      {Icon && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
          <Icon size={15} className="text-slate-500" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium truncate">{label}</div>
        <div className={`text-sm font-bold tabular-nums ${accentClass}`}>{value}</div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, badge }) {
  return (
    <div className="flex items-center gap-2 mb-2 px-1">
      <span className="h-3.5 w-1 rounded-full bg-blue-600 shrink-0" />
      <span className="text-sm font-semibold text-slate-700">{title}</span>
      {badge != null && (
        <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Item Info Strip ──────────────────────────────────────────────────────────
function ItemInfoStrip({ itemCode, itemName, uomCode }) {
  if (!itemCode && !itemName && !uomCode) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-400">
        <Package size={14} />
        Select an item from the summary table to view its balance details.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-2.5">
      <div className="flex flex-col min-w-[100px]">
        <span className="text-[10px] uppercase tracking-wide text-blue-400 font-medium">Item Code</span>
        <span className="text-sm font-bold text-blue-800">{itemCode || "—"}</span>
      </div>
      <div className="h-8 w-px bg-blue-200 hidden sm:block" />
      <div className="flex flex-col flex-1 min-w-[160px]">
        <span className="text-[10px] uppercase tracking-wide text-blue-400 font-medium">Description</span>
        <span className="text-sm font-semibold text-slate-700 truncate">{itemName || "—"}</span>
      </div>
      <div className="h-8 w-px bg-blue-200 hidden sm:block" />
      <div className="flex flex-col min-w-[60px]">
        <span className="text-[10px] uppercase tracking-wide text-blue-400 font-medium">UOM</span>
        <span className="text-sm font-bold text-slate-700">{uomCode || "—"}</span>
      </div>
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({ children, actions }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Filters</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          {children}
        </div>
        {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

// ─── Table Panel ──────────────────────────────────────────────────────────────
function TablePanel({ title, badge, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <SectionHeader title={title} badge={badge} />
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function MSStockCardQuery() {
  const [inventorySetup, setInventorySetup] = useState("FIFO");
  const [activeMainTab, setActiveMainTab] = useState("fifo");
  const [stockStatusTab, setStockStatusTab] = useState("summary");

  const [balanceFilters, setBalanceFilters] = useState({
    branchCode: "HO",
    warehouseCode: "",
    warehouseName: "",
    locationCode: "",
    locationName: "",
    itemCode: "",
    itemName: "",
    refDate: "04/16/2026",
  });

  const [stockCardFilters, setStockCardFilters] = useState({
    branchCode: "HO",
    itemCode: "",
    itemName: "",
    warehouseCode: "",
    warehouseName: "",
    locationCode: "",
    locationName: "",
    startingCutoff: "202511",
    endingCutoff: "202511",
  });

  const [stockStatusFilters, setStockStatusFilters] = useState({
    reportType: "Daily",
    branchCode: "HO",
    warehouseCode: "",
    warehouseName: "",
    locationCode: "",
    locationName: "",
    referenceDate: "04/16/2026",
  });

  const [selectedBalanceItem, setSelectedBalanceItem] = useState(null);
  const [shouldLoadBalance, setShouldLoadBalance] = useState(0);
  const [shouldLoadStockCard, setShouldLoadStockCard] = useState(0);
  const [shouldLoadStockStatus, setShouldLoadStockStatus] = useState(0);

  const handleBalanceRowClick = React.useCallback((row) => {
    setSelectedBalanceItem(row);
  }, []);

  useEffect(() => {
    setActiveMainTab(inventorySetup === "FIFO" ? "fifo" : "location");
  }, [inventorySetup]);

  const setupQuery = useQuery({
    queryKey: ["ms-stock-card-setup"],
    queryFn: async () => {
      const response = await apiClient.get("/inventory/stock-card/setup");
      return response?.data?.data || { inventorySetup: "FIFO" };
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (setupQuery.data?.inventorySetup) {
      setInventorySetup(setupQuery.data.inventorySetup);
    }
  }, [setupQuery.data]);

  const balanceEndpoint =
    inventorySetup === "FIFO"
      ? "/inventory/stock-card/fifo-balance"
      : "/inventory/stock-card/location-balance";

  const balanceQuery = useQuery({
    queryKey: ["ms-stock-card-balance", inventorySetup, shouldLoadBalance, balanceFilters],
    enabled: shouldLoadBalance > 0,
    queryFn: async () => {
      const response = await apiClient.get(balanceEndpoint, { params: balanceFilters });
      return response?.data?.data || { summary: [], details: {}, allocated: {} };
    },
  });

  const stockCardQuery = useQuery({
    queryKey: ["ms-stock-card-movement", shouldLoadStockCard, stockCardFilters],
    enabled: shouldLoadStockCard > 0,
    queryFn: async () => {
      const response = await apiClient.get("/inventory/stock-card/stock-card", {
        params: stockCardFilters,
      });
      return response?.data?.data || { rows: [], totals: {} };
    },
  });

  const stockStatusQuery = useQuery({
    queryKey: ["ms-stock-status", shouldLoadStockStatus, stockStatusFilters],
    enabled: shouldLoadStockStatus > 0,
    queryFn: async () => {
      const response = await apiClient.get("/inventory/stock-card/stock-status", {
        params: stockStatusFilters,
      });
      return response?.data?.data || { summary: [], perItem: [], perLot: [] };
    },
  });

  const balanceSummaryRows = safeArray(balanceQuery.data?.summary);
  const balanceDetailsMap = balanceQuery.data?.details || {};
  const balanceAllocatedMap = balanceQuery.data?.allocated || {};

  useEffect(() => {
    const firstRow = balanceSummaryRows[0] || null;
    const selectedCode = selectedBalanceItem?.itemCode || "";

    if (!selectedCode) {
      if (firstRow?.itemCode) setSelectedBalanceItem(firstRow);
      return;
    }

    const matchedRow = balanceSummaryRows.find((row) => row.itemCode === selectedCode) || null;
    if (!matchedRow && firstRow) {
      setSelectedBalanceItem(firstRow);
      return;
    }

    if (matchedRow && matchedRow !== selectedBalanceItem) {
      setSelectedBalanceItem(matchedRow);
    }
  }, [balanceSummaryRows, selectedBalanceItem?.itemCode]);

  const selectedItemCode = selectedBalanceItem?.itemCode || "";
  const selectedDetailRows = safeArray(balanceDetailsMap[selectedItemCode]);
  const selectedAllocatedRows = safeArray(balanceAllocatedMap[selectedItemCode]);

  const stockCardRows = safeArray(stockCardQuery.data?.rows);
  const stockCardTotals = useMemo(() => {
    const apiTotals = stockCardQuery.data?.totals || {};
    return {
      beginningBalance: toNumber(apiTotals.beginningBalance),
      totalInbound:
        apiTotals.totalInbound !== undefined
          ? toNumber(apiTotals.totalInbound)
          : sumBy(stockCardRows, "qtyIn"),
      totalOutbound:
        apiTotals.totalOutbound !== undefined
          ? toNumber(apiTotals.totalOutbound)
          : sumBy(stockCardRows, "qtyOut"),
      endingBalance:
        apiTotals.endingBalance !== undefined
          ? toNumber(apiTotals.endingBalance)
          : toNumber(stockCardRows[stockCardRows.length - 1]?.runBal),
    };
  }, [stockCardQuery.data, stockCardRows]);

  const stockStatusRows = safeArray(stockStatusQuery.data?.[stockStatusTab]);

  // ─── Column Definitions ──────────────────────────────────────────────────
  const balanceSummaryColumns = useMemo(
    () => [
      { key: "itemCode", header: "Item No", size: 160, cellClassName: "text-left font-mono text-xs" },
      { key: "itemName", header: "Description", size: 300, cellClassName: "text-left" },
      { key: "uomCode", header: "UOM", size: 90, cellClassName: "text-center" },
      { key: "quantity", header: "Quantity", size: 120, cellClassName: "text-right font-semibold", type: "amount", decimals: 4 },
      { key: "qtyAllocated", header: "Allocated", size: 130, cellClassName: "text-right text-amber-700", type: "amount", decimals: 4 },
      { key: "qtyAvailable", header: "Available", size: 130, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
    ],
    []
  );

  const fifoDetailColumns = useMemo(
    () => [
      { key: "rrDate", header: "RR Date", size: 110, type: "date" },
      { key: "rrNo", header: "RR No", size: 140, cellClassName: "font-mono text-xs" },
      { key: "unitCost", header: "Unit Cost", size: 120, cellClassName: "text-right", type: "amount", decimals: 6 },
      { key: "qtyIn", header: "Qty In", size: 100, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 100, cellClassName: "text-right text-rose-600 font-semibold", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 100, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "whouseCode", header: "Warehouse", size: 110 },
      { key: "locCode", header: "Location", size: 110 },
      { key: "lotNo", header: "Lot No", size: 110 },
      { key: "bbDate", header: "BB Date", size: 110, type: "date" },
      { key: "qcStat", header: "QC Status", size: 110 },
      { key: "poNo", header: "PO No", size: 110, cellClassName: "font-mono text-xs" },
    ],
    []
  );

  const locationDetailColumns = useMemo(
    () => [
      { key: "whouseCode", header: "Warehouse", size: 120 },
      { key: "locCode", header: "Location", size: 120 },
      { key: "lotNo", header: "Lot No", size: 110 },
      { key: "bbDate", header: "BB Date", size: 110, type: "date" },
      { key: "qcStat", header: "QC Status", size: 110 },
      { key: "qtyIn", header: "Qty In", size: 100, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 100, cellClassName: "text-right text-rose-600 font-semibold", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 100, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
    ],
    []
  );

  const allocationColumns = useMemo(
    () => [
      { key: "docNo", header: "Document No", size: 180, cellClassName: "font-mono text-xs" },
      { key: "docType", header: "Type", size: 120 },
      { key: "qtyPicked", header: "Qty Picked", size: 130, cellClassName: "text-right font-semibold text-amber-700", type: "amount", decimals: 4 },
    ],
    []
  );

  const stockCardColumns = useMemo(
    () => [
      { key: "cutoff", header: "Cut-Off", size: 100 },
      { key: "docType", header: "Type", size: 90 },
      { key: "docNo", header: "Doc No", size: 110, cellClassName: "font-mono text-xs" },
      { key: "docDate", header: "Doc Date", size: 110, type: "date" },
      { key: "rrNo", header: "RR No", size: 130, cellClassName: "font-mono text-xs" },
      { key: "particular", header: "Particular", size: 260 },
      { key: "itemNo", header: "Item No", size: 120 },
      { key: "itemDescription", header: "Item Desc", size: 120 },
      { key: "warehouse", header: "Warehouse", size: 120 },
      { key: "location", header: "Location", size: 120 },
      { key: "qtyIn", header: "Qty In", size: 110, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 110, cellClassName: "text-right text-rose-600 font-semibold", type: "amount", decimals: 4 },
      { key: "runBal", header: "Run Bal", size: 110, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "unitCost", header: "Unit Cost", size: 120, cellClassName: "text-right", type: "amount", decimals: 6 },
      { key: "amount", header: "Amount", size: 130, cellClassName: "text-right font-semibold", type: "amount", decimals: 2 },
      { key: "postedBy", header: "Posted By", size: 140 },
      { key: "dateStamp", header: "Date Stamp", size: 120, type: "date" },
      { key: "timeStamp", header: "Time Stamp", size: 110 },
    ],
    []
  );

  const stockStatusColumnsMap = useMemo(
    () => ({
      summary: [
        { key: "itemNo", header: "Item No", size: 150, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Item Description", size: 260 },
        { key: "uom", header: "UOM", size: 80, cellClassName: "text-center" },
        { key: "category", header: "Category", size: 180 },
        { key: "itemClass", header: "Item Class", size: 120 },
        { key: "rrNo", header: "RR No", size: 130, cellClassName: "font-mono text-xs" },
        { key: "beginningBalance", header: "Beg. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right" },
        { key: "quantityIn", header: "Qty In", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-emerald-700 font-semibold" },
        { key: "quantityOut", header: "Qty Out", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-rose-600 font-semibold" },
        { key: "endingBalance", header: "End. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
        { key: "unitCost", header: "Unit Cost", size: 120, type: "amount", decimals: 6, cellClassName: "text-right" },
        { key: "amount", header: "Amount", size: 130, type: "amount", decimals: 2, cellClassName: "text-right font-semibold" },
        { key: "inventoryAcct", header: "Inventory Acct", size: 140 },
      ],
      perItem: [
        { key: "itemNo", header: "Item No", size: 150, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Item Description", size: 260 },
        { key: "warehouse", header: "Warehouse", size: 120 },
        { key: "location", header: "Location", size: 120 },
        { key: "beginningBalance", header: "Beg. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right" },
        { key: "quantityIn", header: "Qty In", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-emerald-700 font-semibold" },
        { key: "quantityOut", header: "Qty Out", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-rose-600 font-semibold" },
        { key: "endingBalance", header: "End. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
        { key: "unitCost", header: "Unit Cost", size: 120, type: "amount", decimals: 6, cellClassName: "text-right" },
        { key: "amount", header: "Amount", size: 130, type: "amount", decimals: 2, cellClassName: "text-right font-semibold" },
      ],
      perLot: [
        { key: "itemNo", header: "Item No", size: 150, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Item Description", size: 260 },
        { key: "warehouse", header: "Warehouse", size: 120 },
        { key: "location", header: "Location", size: 120 },
        { key: "lotNo", header: "Lot No", size: 120 },
        { key: "bbDate", header: "BB Date", size: 110, type: "date" },
        { key: "qcStat", header: "QC Status", size: 110 },
        { key: "balance", header: "Balance", size: 120, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
        { key: "unitCost", header: "Unit Cost", size: 120, type: "amount", decimals: 6, cellClassName: "text-right" },
        { key: "amount", header: "Amount", size: 130, type: "amount", decimals: 2, cellClassName: "text-right font-semibold" },
      ],
    }),
    []
  );

  const mainTabs = MAIN_TABS[inventorySetup] || MAIN_TABS.FIFO;

  const handleExportPlaceholder = () => {
    useSwalErrorAlert("Export not ready", "Please connect your export endpoint or export helper.");
  };

  const fmt4 = (n) => toNumber(n).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  // ─── Balance Tab ─────────────────────────────────────────────────────────
  const renderBalanceTab = () => {
    const detailColumns = inventorySetup === "FIFO" ? fifoDetailColumns : locationDetailColumns;
    const tabLabel = inventorySetup === "FIFO" ? "FIFO Balance" : "Location Balance";

    return (
      <div className="space-y-3">
        {/* Filters */}
        <FilterPanel
          actions={
            <>
              <ToolbarButton variant="primary" icon={Search} onClick={() => setShouldLoadBalance((p) => p + 1)}>
                Find
              </ToolbarButton>
              <ToolbarButton
                icon={RefreshCcw}
                onClick={() => {
                  setBalanceFilters({
                    branchCode: "HO",
                    warehouseCode: "",
                    warehouseName: "",
                    locationCode: "",
                    locationName: "",
                    itemCode: "",
                    itemName: "",
                    refDate: "04/16/2026",
                  });
                  setSelectedBalanceItem(null);
                }}
              >
                Reset
              </ToolbarButton>
              <ToolbarButton icon={Download} onClick={handleExportPlaceholder}>
                Export
              </ToolbarButton>
            </>
          }
        >
          <FieldRenderer
            type="select"
            label="Branch"
            name="branchCode"
            value={balanceFilters.branchCode}
            options={[{ value: "HO", label: "Head Office" }]}
            onChange={(e) => setBalanceFilters((prev) => ({ ...prev, branchCode: e.target.value }))}
          />
          <FieldRenderer
            type="lookup"
            label="Warehouse"
            name="warehouseCode"
            value={balanceFilters.warehouseCode}
            textValue={balanceFilters.warehouseName}
            onChange={(e) => setBalanceFilters((prev) => ({ ...prev, warehouseCode: e.target.value }))}
          />
          <FieldRenderer
            type="lookup"
            label="Location"
            name="locationCode"
            value={balanceFilters.locationCode}
            textValue={balanceFilters.locationName}
            onChange={(e) => setBalanceFilters((prev) => ({ ...prev, locationCode: e.target.value }))}
          />
          {/* <FieldRenderer
            type="lookup"
            label="Item"
            name="itemCode"
            value={balanceFilters.itemCode}
            textValue={balanceFilters.itemName}
            onChange={(e) => setBalanceFilters((prev) => ({ ...prev, itemCode: e.target.value }))}
          /> */}
          {/* <FieldRenderer
            type="text"
            label="Reference Date"
            name="refDate"
            value={formatDateValue(balanceFilters.refDate)}
            onChange={(e) => setBalanceFilters((prev) => ({ ...prev, refDate: e.target.value }))}
          /> */}
        </FilterPanel>

        {/* Summary + Details side-by-side */}
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
          {/* Summary Table */}
          <div className="xl:col-span-6">
            <TablePanel title={tabLabel} badge={balanceSummaryRows.length || undefined}>
              
              <SearchGlobalReferenceTable
                columns={balanceSummaryColumns}
                data={balanceSummaryRows}
                isLoading={balanceQuery.isLoading}
                isFetching={balanceQuery.isFetching}
                onRowClick={handleBalanceRowClick}
                selectedRow={selectedBalanceItem}
                tableSize="Half"
              />
            </TablePanel>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-6 space-y-3">
            {/* Item Info Strip */}
            <ItemInfoStrip
              itemCode={selectedBalanceItem?.itemCode}
              itemName={selectedBalanceItem?.itemName}
              uomCode={selectedBalanceItem?.uomCode}
            />

            {/* Balance Details */}
            <TablePanel title="Balance Details" badge={selectedDetailRows.length || undefined}>
              <SearchGlobalReferenceTable
                columns={detailColumns}
                data={selectedDetailRows}
                isLoading={balanceQuery.isLoading}
                isFetching={balanceQuery.isFetching}
                tableSize="Half"
              />
            </TablePanel>

            {/* Allocation Details */}
            <TablePanel title="Allocation Details" badge={selectedAllocatedRows.length || undefined}>
              <SearchGlobalReferenceTable
                columns={allocationColumns}
                data={selectedAllocatedRows}
                isLoading={balanceQuery.isLoading}
                isFetching={balanceQuery.isFetching}
                autoFillGrid = "true"
                tableSize="Half"
              />
            </TablePanel>
          </div>
        </div>
      </div>
    );
  };

  // ─── Stock Card Tab ───────────────────────────────────────────────────────
  const renderStockCardTab = () => {
    return (
      <div className="space-y-3">
        {/* Filters */}
        <FilterPanel>
          <FieldRenderer
            type="select"
            label="Branch"
            name="branchCode"
            value={stockCardFilters.branchCode}
            options={[{ value: "HO", label: "Head Office" }]}
            onChange={(e) => setStockCardFilters((prev) => ({ ...prev, branchCode: e.target.value }))}
          />
          <FieldRenderer
            type="lookup"
            label="Item"
            name="itemCode"
            value={stockCardFilters.itemCode}
            textValue={stockCardFilters.itemName}
            onChange={(e) => setStockCardFilters((prev) => ({ ...prev, itemCode: e.target.value }))}
          />
          <FieldRenderer
            type="lookup"
            label="Warehouse"
            name="warehouseCode"
            value={stockCardFilters.warehouseCode}
            textValue={stockCardFilters.warehouseName}
            onChange={(e) => setStockCardFilters((prev) => ({ ...prev, warehouseCode: e.target.value }))}
          />
          <FieldRenderer
            type="lookup"
            label="Location"
            name="locationCode"
            value={stockCardFilters.locationCode}
            textValue={stockCardFilters.locationName}
            onChange={(e) => setStockCardFilters((prev) => ({ ...prev, locationCode: e.target.value }))}
          />
          <FieldRenderer
            type="text"
            label="Starting Cut-Off"
            name="startingCutoff"
            value={stockCardFilters.startingCutoff}
            onChange={(e) => setStockCardFilters((prev) => ({ ...prev, startingCutoff: e.target.value }))}
          />
          <FieldRenderer
            type="text"
            label="Ending Cut-Off"
            name="endingCutoff"
            value={stockCardFilters.endingCutoff}
            onChange={(e) => setStockCardFilters((prev) => ({ ...prev, endingCutoff: e.target.value }))}
          />
        </FilterPanel>

        {/* Toolbar + KPI Row */}
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton variant="primary" icon={Search} onClick={() => setShouldLoadStockCard((p) => p + 1)}>
            Find
          </ToolbarButton>
          <ToolbarButton
            icon={RefreshCcw}
            onClick={() =>
              setStockCardFilters({
                branchCode: "HO",
                itemCode: "",
                itemName: "",
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
                startingCutoff: "202511",
                endingCutoff: "202511",
              })
            }
          >
            Reset
          </ToolbarButton>
          <ToolbarButton icon={Printer} onClick={() => window.print()}>
            Print
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              useSwalErrorAlert("View Document", "Please connect the document viewer action.")
            }
          >
            View Document
          </ToolbarButton>
          {/* <ToolbarButton icon={Download} onClick={handleExportPlaceholder}>
            Export to Excel
          </ToolbarButton> */}

          {/* KPI Cards */}
          <div className="ml-auto flex flex-wrap gap-2">
            <KpiCard
              label="Beginning Balance"
              value={fmt4(stockCardTotals.beginningBalance)}
              icon={Layers}
              accentClass="text-slate-700"
            />
            <KpiCard
              label="Total Inbound"
              value={fmt4(stockCardTotals.totalInbound)}
              icon={TrendingUp}
              accentClass="text-emerald-700"
            />
            <KpiCard
              label="Total Outbound"
              value={fmt4(stockCardTotals.totalOutbound)}
              icon={TrendingDown}
              accentClass="text-rose-600"
            />
            <KpiCard
              label="Ending Balance"
              value={fmt4(stockCardTotals.endingBalance)}
              icon={ArrowLeftRight}
              accentClass="text-blue-700"
            />
          </div>
        </div>

        {/* Movement Table */}
        <TablePanel title="Stock Card Movement" badge={stockCardRows.length || undefined}>
          <SearchGlobalReportTable
            columns={stockCardColumns}
            data={stockCardRows}
            isLoading={stockCardQuery.isLoading}
            isFetching={stockCardQuery.isFetching}
          />
        </TablePanel>
      </div>
    );
  };

  // ─── Stock Status Tab ─────────────────────────────────────────────────────
  const renderStockStatusTab = () => {
    return (
      <div className="space-y-3">
        {/* Filters */}
        <FilterPanel>
          <FieldRenderer
            type="select"
            label="Report Type"
            name="reportType"
            value={stockStatusFilters.reportType}
            options={[
              { value: "Daily", label: "Daily" },
              { value: "Weekly", label: "Weekly" },
              { value: "Monthly", label: "Monthly" },
            ]}
            onChange={(e) => setStockStatusFilters((prev) => ({ ...prev, reportType: e.target.value }))}
          />
          <FieldRenderer
            type="select"
            label="Branch"
            name="branchCode"
            value={stockStatusFilters.branchCode}
            options={[{ value: "HO", label: "Head Office" }]}
            onChange={(e) => setStockStatusFilters((prev) => ({ ...prev, branchCode: e.target.value }))}
          />
          <FieldRenderer
            type="lookup"
            label="Warehouse"
            name="warehouseCode"
            value={stockStatusFilters.warehouseCode}
            textValue={stockStatusFilters.warehouseName}
            onChange={(e) => setStockStatusFilters((prev) => ({ ...prev, warehouseCode: e.target.value }))}
          />
          <FieldRenderer
            type="lookup"
            label="Location"
            name="locationCode"
            value={stockStatusFilters.locationCode}
            textValue={stockStatusFilters.locationName}
            onChange={(e) => setStockStatusFilters((prev) => ({ ...prev, locationCode: e.target.value }))}
          />
          <FieldRenderer
            type="text"
            label="Reference Date"
            name="referenceDate"
            value={stockStatusFilters.referenceDate}
            onChange={(e) => setStockStatusFilters((prev) => ({ ...prev, referenceDate: e.target.value }))}
          />

          {/* Action column inside grid */}
          <div className="flex flex-wrap items-end gap-2">
            <ToolbarButton
              variant="primary"
              icon={Search}
              onClick={() => setShouldLoadStockStatus((p) => p + 1)}
            >
              Load &amp; Process
            </ToolbarButton>
            <ToolbarButton onClick={() => setShouldLoadStockStatus((p) => p + 1)}>
              All Warehouses
            </ToolbarButton>
            <ToolbarButton
              icon={RefreshCcw}
              onClick={() =>
                setStockStatusFilters({
                  reportType: "Daily",
                  branchCode: "HO",
                  warehouseCode: "",
                  warehouseName: "",
                  locationCode: "",
                  locationName: "",
                  referenceDate: "04/16/2026",
                })
              }
            >
              Reset
            </ToolbarButton>
            {/* <ToolbarButton icon={Download} onClick={handleExportPlaceholder}>
              Export
            </ToolbarButton> */}
          </div>
        </FilterPanel>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-2 px-1">
          {STOCK_STATUS_SUBTABS.map((tab) => (
            <SubTabButton
              key={tab.key}
              active={stockStatusTab === tab.key}
              label={tab.label}
              onClick={() => setStockStatusTab(tab.key)}
            />
          ))}
          {stockStatusRows.length > 0 && (
            <span className="ml-2 text-xs text-slate-400">
              {stockStatusRows.length} record{stockStatusRows.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Data Table */}
        <TablePanel title={STOCK_STATUS_SUBTABS.find((t) => t.key === stockStatusTab)?.label || "Stock Status"}>
          <SearchGlobalReportTable
            columns={stockStatusColumnsMap[stockStatusTab] || []}
            data={stockStatusRows}
            isLoading={stockStatusQuery.isLoading}
            isFetching={stockStatusQuery.isFetching}
          />
        </TablePanel>
      </div>
    );
  };

  // ─── Root ─────────────────────────────────────────────────────────────────
  return (
    <div className="global-content-ui p-3 sm:p-4 space-y-3">
      {/* Main Tab Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Tab Bar */}
        <div className="flex flex-wrap gap-0 border-b border-slate-200 px-2 pt-1">
          {mainTabs.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeMainTab === tab.key}
              label={tab.label}
              icon={tab.icon}
              onClick={() => setActiveMainTab(tab.key)}
            />
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-3">
          {(activeMainTab === "fifo" || activeMainTab === "location") && renderBalanceTab()}
          {activeMainTab === "stockCard" && renderStockCardTab()}
          {activeMainTab === "stockStatus" && renderStockStatusTab()}
        </div>
      </div>
    </div>
  );
}

export default MSStockCardQuery;