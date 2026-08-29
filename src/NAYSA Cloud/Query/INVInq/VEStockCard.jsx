import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
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
  Eye,
  History,
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
  Truck,
  Receipt,
  Wrench,
  Wallet,
  FileText,
  ExternalLink,
} from "lucide-react";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useGetCurrentDayV2 } from "@/NAYSA Cloud/Global/dates";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import LocationLookupModal from "@/NAYSA Cloud/Lookup/SearchLocation.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable";
import WarehouseLookupModal from "@/NAYSA Cloud/Lookup/SearchWareMast.jsx";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const formatDateValue = (value) => value || "";
const parseDateValue = (value) => {
  if (!value) return null;
  const parts = String(value).split("/");
  if (parts.length !== 3) return null;

  const [month, day, year] = parts.map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};
const formatDateFromObject = (date) => {
  if (!date || Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};
const getStockStatusEndDate = (reportType, startDate) => {
  const parsedStartDate = parseDateValue(startDate);
  if (!parsedStartDate) return "";

  if (reportType === "Weekly") {
    const endDate = new Date(parsedStartDate);
    endDate.setDate(endDate.getDate() + 6);
    return formatDateFromObject(endDate);
  }

  if (reportType === "Monthly") {
    return formatDateFromObject(
      new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth() + 1, 0)
    );
  }

  return startDate;
};
const formatLookupValue = (code, name) => {
  if (!code && !name) return "";
  if (!name) return code || "";
  if (!code) return name;
  return `${code} - ${name}`;
};
const toNumber = (value) => Number(value || 0);
const sumBy = (rows, key) =>
  safeArray(rows).reduce((total, row) => total + toNumber(row?.[key]), 0);

const normalizeTableColumns = (columns = []) =>
  safeArray(columns).map((col) => ({
    ...col,
    label: col.label || col.header || col.name || col.key || "",
    renderType:
      col.renderType ||
      (col.type === "amount" ? "number" : col.type === "date" ? "date" : col.type),
    roundingOff:
      col.roundingOff ??
      (typeof col.decimals === "number" ? col.decimals : undefined),
    className: col.className || col.cellClassName || "",
  }));

const rowsByItemCode = (value) => {
  if (!value) return {};
  if (!Array.isArray(value) && typeof value === "object") return value;

  return safeArray(value).reduce((map, item) => {
    const itemCode = item?.itemCode || item?.itemNo || "";
    if (itemCode) map[itemCode] = safeArray(item?.rows);
    return map;
  }, {});
};

const normalizeBalanceResponse = (payload) => ({
  summary: safeArray(payload?.summary),
  details: rowsByItemCode(payload?.details),
  allocated: rowsByItemCode(payload?.allocated),
});

const MAIN_TABS = {
  SPID: [
    { key: "spid", label: "SPID Balance", icon: Package },
    { key: "stockCard", label: "Stock Card", icon: ClipboardList },
    { key: "stockStatus", label: "Vehicle Inventory Status", icon: FileBarChart2 },
    { key: "vehicleHistory", label: "Vehicle History", icon: History },
  ],
};

const STOCK_STATUS_SUBTABS = [
  { key: "summary", label: "Summary" },
  { key: "perVehicle", label: "Per Vehicle" },
];

// ─── Tab Button ──────────────────────────────────────────────────────────────
function TabButton({ active, label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-5 py-3 text-[13px] font-semibold transition-all duration-200 mt-2 rounded-t-lg focus:outline-none ${
        active
          ? "text-blue-700 dark:text-blue-400 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/60 dark:to-slate-900 shadow-[inset_0_2px_0_0_#2563eb] border border-b-0 border-slate-200 dark:border-slate-700"
          : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
      }`}
      style={active ? { marginBottom: "-1px", zIndex: 1 } : {}}
    >
      {Icon && (
        <span className={`flex items-center justify-center w-5 h-5 rounded transition-colors duration-150 ${
          active
            ? "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400"
            : "text-slate-400 dark:text-slate-500"
        }`}>
          <Icon size={13} />
        </span>
      )}
      <span>{label}</span>
      {active && (
        <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
      )}
    </button>
  );
}

// ─── Sub Tab Button ───────────────────────────────────────────────────────────
function SubTabButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-all duration-150 border ${
        active
          ? "bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-blue-600 dark:hover:text-blue-400"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolbarButton({ children, onClick, icon: Icon, variant = "default", className = "" }) {
  const variants = {
    default: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-100 shadow-sm",
    primary: "border-blue-500 dark:border-blue-600 bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:border-blue-600 shadow-sm shadow-blue-200 dark:shadow-blue-900/40",
    ghost: "border-transparent bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150 active:scale-[0.97] ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={13} />}
      <span>{children}</span>
    </button>
  );
}


// ─── Header Action Button (Bank Recon style) ────────────────────────────────
function HeaderActionButton({ children, onClick, icon: Icon, disabled = false, title = "" }) {
  return (
    <button
      type="button"
      title={title || children}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-w-[36px] flex-col items-center justify-center gap-0.5 rounded-md border border-blue-600 bg-blue-600 px-2 py-1.5 text-[10px] font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65 lg:h-8 lg:flex-row lg:gap-0 lg:px-3 lg:py-2 lg:text-xs"
    >
      {Icon && <Icon size={13} className="lg:mr-2" />}
      {children && (
        <>
          <span className="block text-[8px] leading-none lg:hidden">{children}</span>
          <span className="hidden lg:inline">{children}</span>
        </>
      )}
    </button>
  );
}

function HeaderStatusCard({ label, value }) {
  return (
    <div className="flex h-10 min-w-[112px] flex-col items-center justify-center rounded-md bg-blue-50 px-3 py-1 text-center shadow-sm dark:bg-blue-950/40">
      <span className="text-xs font-bold leading-tight text-slate-600 dark:text-slate-300">{label}</span>
      <span className="text-[16px] font-extrabold leading-tight text-blue-700 dark:text-blue-300">{value || "—"}</span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, accentClass = "text-slate-700", bgClass = "bg-white" }) {
  const iconStyles = {
    "text-emerald-700": "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
    "text-rose-600":    "bg-rose-50 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400",
    "text-blue-700":    "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
  };
  const iconClass = iconStyles[accentClass] || "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400";
  const valueClass = accentClass === "text-emerald-700" ? "text-emerald-700 dark:text-emerald-400"
    : accentClass === "text-rose-600" ? "text-rose-600 dark:text-rose-400"
    : accentClass === "text-blue-700" ? "text-blue-700 dark:text-blue-400"
    : "text-slate-700 dark:text-slate-200";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 min-w-[170px] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 group">
      {Icon && (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${iconClass}`}>
          <Icon size={16} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold truncate leading-tight">{label}</div>
        <div className={`text-sm font-bold tabular-nums mt-0.5 ${valueClass}`}>{value}</div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, badge }) {
  return (
    <div className="flex items-center gap-2.5 mb-2 px-1">
      <span className="h-4 w-1 rounded-full bg-blue-600 dark:bg-blue-500 shrink-0" />
      <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">{title}</span>
      {badge != null && (
        <span className="ml-1 rounded-md bg-blue-600 dark:bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Item Info Strip ──────────────────────────────────────────────────────────
function ItemInfoStrip({ itemCode, itemName, uomCode, quantity, qtyAllocated, qtyAvailable }) {
  if (!itemCode && !itemName && !uomCode) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 px-4 py-3.5 text-xs text-slate-400 dark:text-slate-500">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-200/60 dark:bg-slate-700">
          <Package size={13} className="text-slate-400 dark:text-slate-500" />
        </div>
        <span>Select an item from the summary table to view its balance details.</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-stretch gap-0 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 overflow-hidden shadow-sm">
      <div className="flex flex-col justify-center px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[120px]">
        <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">Item Code</span>
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate mt-0.5">{itemCode || "—"}</span>
      </div>
      <div className="flex flex-col justify-center flex-1 px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[180px]">
        <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">Item Name</span>
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate mt-0.5">{itemName || "—"}</span>
      </div>
      <div className="flex flex-col justify-center px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[70px]">
        <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">UOM</span>
        <span className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-0.5">{uomCode || "—"}</span>
      </div>
      {quantity != null && (
        <div className="flex flex-col justify-center px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[100px]">
          <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">On Hand</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums mt-0.5">{quantity}</span>
        </div>
      )}
      {qtyAllocated != null && (
        <div className="flex flex-col justify-center px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[100px]">
          <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">Allocated</span>
          <span className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums mt-0.5">{qtyAllocated}</span>
        </div>
      )}
      {qtyAvailable != null && (
        <div className="flex flex-col justify-center px-5 py-3 min-w-[100px]">
          <span className="text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-500 font-bold">Available</span>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">{qtyAvailable}</span>
        </div>
      )}
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({ children, actions }) {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors duration-150 focus:outline-none"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 dark:bg-blue-700 shrink-0">
          <Search size={10} className="text-white" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-1 text-left">Filter Criteria</span>
        <span className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>
      {!collapsed && (
        <div className="p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {children}
          </div>
          {actions && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Table Panel ──────────────────────────────────────────────────────────────
function CalendarField({ id, label, name, value, updateState, disabled = false }) {
  return (
    <div className="relative w-full">
      <div className={`flex items-stretch global-ref-textbox-ui ${disabled ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"}`}>
        <DateFormatInput
          id={id}
          name={name}
          className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
          value={value}
          disabled={disabled}
          updateState={updateState}
        />
      </div>
      <label htmlFor={id} className="global-ref-floating-label">{label}</label>
    </div>
  );
}

function TablePanel({ title, badge, children, toolbar }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 px-2 py-2">
        <SectionHeader title={title} badge={badge} />
        {toolbar && <div className="ml-auto flex items-center gap-1.5 pr-1">{toolbar}</div>}
      </div>
      <div className="">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function VEStockCardQuery() {
  const { companyInfo, currentUserRow, user } = useAuth();
  const defaultBranchCode =
    currentUserRow?.branchCode ||
    user?.branchCode ||
    "";
  const defaultBranchName =
    currentUserRow?.branchName ||
    user?.branchName ||
    "";
  const defaultCutoffCode =
    companyInfo?.cutoffCode ||
    "";
  const defaultCutoffName =
    companyInfo?.cutoffName ||
    "";
  const defaultReferenceDate = useGetCurrentDayV2();
  const defaultReportType = companyInfo?.stockStatusReportType || companyInfo?.reportType || "Daily";
  const defaultInventorySetup = "SPID";

  const defaultBalanceFilters = useMemo(
    () => ({
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      warehouseCode: "",
      warehouseName: "",
      locationCode: "",
      locationName: "",
      itemCode: "",
      itemName: "",
      veId: "",
      vehicleName: "",
      refDate: defaultReferenceDate,
    }),
    [defaultBranchCode, defaultBranchName, defaultReferenceDate]
  );

  const defaultStockCardFilters = useMemo(
    () => ({
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      itemCode: "",
      itemName: "",
      veId: "",
      vehicleName: "",
      warehouseCode: "",
      warehouseName: "",
      locationCode: "",
      locationName: "",
      startingCutoff: defaultCutoffCode,
      startingCutoffName: defaultCutoffName,
      endingCutoff: defaultCutoffCode,
      endingCutoffName: defaultCutoffName,
    }),
    [defaultBranchCode, defaultBranchName, defaultCutoffCode, defaultCutoffName]
  );

  const defaultStockStatusFilters = useMemo(
    () => ({
      reportType: defaultReportType,
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      warehouseCode: "",
      warehouseName: "",
      locationCode: "",
      locationName: "",
      startDate: defaultReferenceDate,
      endDate: getStockStatusEndDate(defaultReportType, defaultReferenceDate),
    }),
    [defaultBranchCode, defaultBranchName, defaultReferenceDate, defaultReportType]
  );
  const defaultVehicleHistoryFilters = useMemo(() => ({ csNo: "" }), []);

  const [inventorySetup, setInventorySetup] = useState(defaultInventorySetup);
  const [activeMainTab, setActiveMainTab] = useState("spid");
  const [stockStatusTab, setStockStatusTab] = useState("summary");
  const [selectedStatusItemCode, setSelectedStatusItemCode] = useState("");

  const [balanceFilters, setBalanceFilters] = useState(defaultBalanceFilters);
  const [stockCardFilters, setStockCardFilters] = useState(defaultStockCardFilters);
  const [stockStatusFilters, setStockStatusFilters] = useState(defaultStockStatusFilters);
  const [vehicleHistoryFilters, setVehicleHistoryFilters] = useState(defaultVehicleHistoryFilters);

  const [selectedBalanceItem, setSelectedBalanceItem] = useState(null);
  const [shouldLoadBalance, setShouldLoadBalance] = useState(0);
  const [shouldLoadStockCard, setShouldLoadStockCard] = useState(0);
  const [shouldLoadStockStatus, setShouldLoadStockStatus] = useState(0);
  const [shouldLoadVehicleHistory, setShouldLoadVehicleHistory] = useState(0);
  const [activeWorkflowIndex, setActiveWorkflowIndex] = useState(0);
  const workflowScrollerRef = useRef(null);
  const workflowCardRefs = useRef([]);
  const [lookupState, setLookupState] = useState({
    type: "",
    scope: "",
    cutoffTarget: "",
  });

  const handleBalanceRowClick = React.useCallback((row) => {
    setSelectedBalanceItem(row);
  }, []);

  const handleViewStockCardFromBalance = React.useCallback((row) => {
    const itemCode = row?.itemCode || row?.itemNo || "";
    if (!itemCode) return;

    setSelectedBalanceItem(row);
    setStockCardFilters((prev) => ({
      ...prev,
      branchCode: balanceFilters.branchCode || prev.branchCode,
      branchName: balanceFilters.branchName || prev.branchName,
      warehouseCode: balanceFilters.warehouseCode || prev.warehouseCode,
      warehouseName: balanceFilters.warehouseName || prev.warehouseName,
      locationCode: balanceFilters.locationCode || prev.locationCode,
      locationName: balanceFilters.locationName || prev.locationName,
      itemCode,
      itemName: row?.itemName || row?.itemDescription || prev.itemName || "",
    }));
    setActiveMainTab("stockCard");
    setShouldLoadStockCard((prev) => prev + 1);
  }, [balanceFilters]);

  useEffect(() => {
    setBalanceFilters((prev) => ({
      ...prev,
      branchCode: prev.branchCode || defaultBalanceFilters.branchCode,
      branchName: prev.branchName || defaultBalanceFilters.branchName,
      refDate: prev.refDate || defaultBalanceFilters.refDate,
    }));
    setStockCardFilters((prev) => ({
      ...prev,
      branchCode: prev.branchCode || defaultStockCardFilters.branchCode,
      branchName: prev.branchName || defaultStockCardFilters.branchName,
      startingCutoff: prev.startingCutoff || defaultStockCardFilters.startingCutoff,
      startingCutoffName: prev.startingCutoffName || defaultStockCardFilters.startingCutoffName,
      endingCutoff: prev.endingCutoff || defaultStockCardFilters.endingCutoff,
      endingCutoffName: prev.endingCutoffName || defaultStockCardFilters.endingCutoffName,
    }));
    setStockStatusFilters((prev) => ({
      ...prev,
      reportType: prev.reportType || defaultStockStatusFilters.reportType,
      branchCode: prev.branchCode || defaultStockStatusFilters.branchCode,
      branchName: prev.branchName || defaultStockStatusFilters.branchName,
      startDate: prev.startDate || prev.referenceDate || defaultStockStatusFilters.startDate,
      endDate: getStockStatusEndDate(
        prev.reportType || defaultStockStatusFilters.reportType,
        prev.startDate || prev.referenceDate || defaultStockStatusFilters.startDate
      ),
    }));
  }, [defaultBalanceFilters, defaultStockCardFilters, defaultStockStatusFilters]);

  const openLookup = React.useCallback((type, scope, cutoffTarget = "") => {
    setLookupState({ type, scope, cutoffTarget });
  }, []);

  const closeLookup = React.useCallback(() => {
    setLookupState({ type: "", scope: "", cutoffTarget: "" });
  }, []);

  const patchFiltersByScope = React.useCallback((scope, patch) => {
    if (scope === "balance") {
      setBalanceFilters((prev) => ({ ...prev, ...patch }));
      return;
    }
    if (scope === "stockCard") {
      setStockCardFilters((prev) => ({ ...prev, ...patch }));
      return;
    }
    if (scope === "stockStatus") {
      setStockStatusFilters((prev) => ({ ...prev, ...patch }));
    }
  }, []);

  const getFiltersByScope = React.useCallback(
    (scope) => {
      if (scope === "balance") return balanceFilters;
      if (scope === "stockCard") return stockCardFilters;
      if (scope === "stockStatus") return stockStatusFilters;
      return {};
    },
    [balanceFilters, stockCardFilters, stockStatusFilters]
  );

  const handleBranchLookupClose = React.useCallback(
    (row) => {
      if (row) {
        patchFiltersByScope(lookupState.scope, {
          branchCode: row.branchCode || row.BranchCode || row.BRANCH_CODE || "",
          branchName: row.branchName || row.BranchName || row.BRANCH_NAME || "",
          warehouseCode: "",
          warehouseName: "",
          locationCode: "",
          locationName: "",
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.scope, patchFiltersByScope]
  );

  const handleItemLookupClose = React.useCallback(
    (payload) => {
      const item = Array.isArray(payload?.records) ? payload.records[0] : payload?.records || payload;
      if (item) {
        patchFiltersByScope(lookupState.scope, {
          itemCode: item.itemCode || "",
          itemName: item.itemName || "",
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.scope, patchFiltersByScope]
  );

  const handleVehicleLookupClose = React.useCallback(
    (payload) => {
      const vehicle = Array.isArray(payload?.records) ? payload.records[0] : payload?.records || payload;
      if (vehicle) {
        const vehicleName = [vehicle.csNo, vehicle.make, vehicle.model, vehicle.color]
          .filter(Boolean)
          .join(" - ");
        patchFiltersByScope(lookupState.scope, {
          veId: vehicle.veId || "",
          vehicleName,
          itemCode: vehicle.itemCode || "",
          itemName: vehicle.itemName || "",
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.scope, patchFiltersByScope]
  );

  const handleWarehouseLookupClose = React.useCallback(
    (row) => {
      if (row) {
        patchFiltersByScope(lookupState.scope, {
          warehouseCode: row.whCode || row.warehouseCode || "",
          warehouseName: row.whName || row.warehouseName || "",
          locationCode: "",
          locationName: "",
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.scope, patchFiltersByScope]
  );

  const handleLocationLookupClose = React.useCallback(
    (row) => {
      if (row) {
        patchFiltersByScope(lookupState.scope, {
          locationCode: row.locCode || row.locationCode || "",
          locationName: row.locName || row.locationName || "",
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.scope, patchFiltersByScope]
  );

  const handleCutoffLookupClose = React.useCallback(
    (row) => {
      if (row && lookupState.cutoffTarget) {
        const cutoffCode = row.cutoffCode || row.cutOffCode || row.CutoffCode || "";
        const cutoffName = row.cutoffName || row.cutOffName || row.CutoffName || "";
        const cutoffNameTarget =
          lookupState.cutoffTarget === "startingCutoff"
            ? "startingCutoffName"
            : "endingCutoffName";

        patchFiltersByScope(lookupState.scope, {
          [lookupState.cutoffTarget]: cutoffCode,
          [cutoffNameTarget]: cutoffName,
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.cutoffTarget, lookupState.scope, patchFiltersByScope]
  );

  useEffect(() => {
    if (defaultInventorySetup && !inventorySetup) {
      setInventorySetup(defaultInventorySetup);
    }
  }, [defaultInventorySetup, inventorySetup]);

  useEffect(() => {
    setActiveMainTab("spid");
  }, [inventorySetup]);

  const setupQuery = useQuery({
    queryKey: ["ve-stock-card-setup", defaultInventorySetup],
    queryFn: async () => {
      const response = await apiClient.get("/ve/inventory/stock-card/setup");
      return response?.data?.data || { inventorySetup: defaultInventorySetup };
    },
    staleTime: Infinity,
  });

  const vehicleQuery = useQuery({
    queryKey: ["ve-stock-card-vehicles", lookupState.scope, getFiltersByScope(lookupState.scope)?.branchCode],
    enabled: lookupState.type === "vehicle",
    queryFn: async () => {
      const filters = getFiltersByScope(lookupState.scope);
      const response = await apiClient.get("/ve/inventory/stock-card/vehicles", {
        params: { branchCode: filters.branchCode || "", itemNo: filters.itemCode || "" },
      });
      return safeArray(response?.data?.data).map((row) => ({ ...row, groupId: row.veId }));
    },
  });

  useEffect(() => {
    if (setupQuery.data?.inventorySetup) {
      setInventorySetup(setupQuery.data.inventorySetup);
    }
  }, [setupQuery.data]);

  const balanceEndpoint = "/ve/inventory/stock-card/spid-balance";

  const balanceRequestParams = useMemo(
    () => ({
      branchCode: balanceFilters.branchCode,
      whouseCode: balanceFilters.warehouseCode,
      locCode: balanceFilters.locationCode,
      itemNo: balanceFilters.itemCode,
      veId: balanceFilters.veId,
      dateTo: balanceFilters.refDate,
    }),
    [balanceFilters]
  );

  const stockCardRequestParams = useMemo(
    () => ({
      branchCode: stockCardFilters.branchCode,
      itemNo: stockCardFilters.itemCode,
      veId: stockCardFilters.veId,
      whouseCode: stockCardFilters.warehouseCode,
      locCode: stockCardFilters.locationCode,
      cutoffFrom: stockCardFilters.startingCutoff,
      cutoffTo: stockCardFilters.endingCutoff,
    }),
    [stockCardFilters]
  );

  const stockStatusRequestParams = useMemo(
    () => ({
      reportType: stockStatusFilters.reportType,
      branchCode: stockStatusFilters.branchCode,
      whouseCode: stockStatusFilters.warehouseCode,
      locCode: stockStatusFilters.locationCode,
      veId: stockStatusFilters.veId,
      dateFrom: stockStatusFilters.startDate,
      dateTo: stockStatusFilters.endDate,
    }),
    [stockStatusFilters]
  );

  const balanceQuery = useQuery({
    queryKey: ["ve", inventorySetup, shouldLoadBalance, balanceFilters],
    enabled: shouldLoadBalance > 0,
    queryFn: async () => {
      const response = await apiClient.get(balanceEndpoint, { params: balanceRequestParams });
      return normalizeBalanceResponse(response?.data?.data);
    },
  });

  const stockCardQuery = useQuery({
    queryKey: ["ve-stock-card-movement", shouldLoadStockCard, stockCardFilters],
    enabled: shouldLoadStockCard > 0,
    queryFn: async () => {
      const response = await apiClient.get("/ve/inventory/stock-card/stock-card", {
        params: stockCardRequestParams,
      });
      return response?.data?.data || { rows: [], totals: {} };
    },
  });

  const stockStatusQuery = useQuery({
    queryKey: ["ve-stock-status", shouldLoadStockStatus],
    enabled: shouldLoadStockStatus > 0,
    queryFn: async () => {
      const response = await apiClient.get("/ve/inventory/stock-card/stock-status", {
        params: stockStatusRequestParams,
      });
      return response?.data?.data || { summary: [], perVehicle: [] };
    },
  });

  const vehicleHistoryQuery = useQuery({
    queryKey: ["ve-vehicle-history", shouldLoadVehicleHistory, vehicleHistoryFilters.csNo],
    enabled: shouldLoadVehicleHistory > 0,
    retry: false,
    queryFn: async () => {
      const response = await apiClient.get("/ve/inventory/stock-card/vehicle-history", {
        params: { csNo: vehicleHistoryFilters.csNo.trim() },
      });
      return response?.data?.data || { vehicle: {}, transactions: [], rows: [] };
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
  const vehicleHistoryRows = safeArray(vehicleHistoryQuery.data?.rows);
  const vehicleTransactionRows = safeArray(vehicleHistoryQuery.data?.transactions);
  const trackedVehicle = vehicleHistoryQuery.data?.vehicle || {};
  const trackedVehicleImage = trackedVehicle.vehicleImageBase64
    ? (String(trackedVehicle.vehicleImageBase64).startsWith("data:")
        ? trackedVehicle.vehicleImageBase64
        : `data:image/jpeg;base64,${trackedVehicle.vehicleImageBase64}`)
    : "";

  const scrollWorkflowTo = React.useCallback((requestedIndex) => {
    if (!vehicleTransactionRows.length) return;
    const nextIndex = Math.max(0, Math.min(requestedIndex, vehicleTransactionRows.length - 1));
    setActiveWorkflowIndex(nextIndex);
    workflowCardRefs.current[nextIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [vehicleTransactionRows.length]);

  const handleWorkflowScroll = React.useCallback(() => {
    const scroller = workflowScrollerRef.current;
    if (!scroller || !vehicleTransactionRows.length) return;
    const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    workflowCardRefs.current.forEach((card, index) => {
      if (!card) return;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActiveWorkflowIndex(closestIndex);
  }, [vehicleTransactionRows.length]);

  useEffect(() => {
    if (!vehicleTransactionRows.length) {
      setActiveWorkflowIndex(0);
      return undefined;
    }

    const latestIndex = vehicleTransactionRows.length - 1;
    setActiveWorkflowIndex(latestIndex);
    const timer = window.setTimeout(() => {
      workflowCardRefs.current[latestIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [vehicleTransactionRows.length]);
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

  const stockStatusRows = safeArray(stockStatusQuery.data?.[stockStatusTab]).filter(
    (row) => stockStatusTab !== "perVehicle" || !selectedStatusItemCode || row.itemNo === selectedStatusItemCode
  );

  // ─── Column Definitions ──────────────────────────────────────────────────
  const balanceSummaryColumns = useMemo(
    () => [
      { key: "categName", header: "Category", size: 150, width: 150, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "className", header: "Classification", size: 150, width: 150, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "itemCode", header: "Item Code", size: 120, width: 120, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "itemName", header: "Item Name", size: 300, width: 300, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "uomCode", header: "UOM", size: 100, width: 100, minWidth: 100, cellClassName: "text-center text-[11px]" },
      { key: "quantity", header: "Quantity", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-[11px]", type: "amount", decimals: 4 },
      { key: "qtyAllocated", header: "Allocated", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-blue-700 text-[11px]", type: "amount", decimals: 4 },
      { key: "qtyAvailable", header: "Available", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-emerald-700  text-[11px] font-bold ", type: "amount", decimals: 4 },
    ],
    []
  );

  const fifoDetailColumns = useMemo(
    () => [
      { key: "itemCode", header: "Item Code", size: 120, width: 120, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "itemName", header: "Item Name", size: 300, width: 300, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "uomCode", header: "UOM", size: 100, width: 100, minWidth: 100, cellClassName: "text-center text-[11px]" },
      { key: "rrDate", header: "RR Date", size: 90, width: 90, minWidth: 90, cellClassName: "text-center text-[11px]", type: "date" },
      { key: "rrNo", header: "RR No", size: 140, width: 140, minWidth: 140, cellClassName: "text-[11px]" },
      { key: "unitCost", header: "Unit Cost", size: 120, width: 120, minWidth: 120, cellClassName: "text-right", type: "amount", decimals: 6 },
      { key: "qtyIn", header: "Qty In", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-rose-600 font-semibold", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 100, width: 100, minWidth: 100, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "whouseCode", header: "Warehouse", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "locCode", header: "Location", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "qcStat", header: "QC Status", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "poNo", header: "PO No", size: 110, width: 110, minWidth: 110, cellClassName: "text-[11px]" },
    ],
    []
  );

  const locationDetailColumns = useMemo(
    () => [
      { key: "itemCode", header: "Item Code", size: 100, width: 100, minWidth: 100, cellClassName: "text-left text-[11px]" },
      { key: "itemName", header: "Item Name", size: 280, width: 280, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "uomCode", header: "UOM", size: 90, width: 90, minWidth: 90, cellClassName: "text-center text-[11px]" },
      { key: "whouseCode", header: "Warehouse", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "locCode", header: "Location", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "qcStat", header: "QC Status", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "qtyIn", header: "Qty In", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-emerald-700 text-[11px]", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-rose-600 text-[11px]", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 100, width: 100, minWidth: 100, cellClassName: "text-right font-bold text-[11px]", type: "amount", decimals: 4 },
    ],
    []
  );

  const allocationColumns = useMemo(
    () => [
      { key: "docType", header: "Document Code", size: 100, width: 100, minWidth: 100, cellClassName: "text-[11px]" },
      { key: "docNo", header: "Document No", size: 100, width: 100, minWidth: 100, cellClassName: "text-[11px]" },
      { key: "docDate", header: "Document Date", size: 100, width: 100, minWidth: 100, cellClassName: "text-left text-[11px]", type: "date" },
      { key: "itemCode", header: "Item Code", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "itemName", header: "Item Name", size: 280, width: 280, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "uomCode", header: "UOM", size: 90, width: 90, minWidth: 90, cellClassName: "text-center text-[11px]" },
      { key: "qtyPicked", header: "Qty Picked", size: 130, width: 130, minWidth: 130, cellClassName: "text-right font-semibold text-blue-700 text-[11px]", type: "amount", decimals: 4 },
    ],
    []
  );


  const stockCardColumns = useMemo(
    () => {
      return [
      { key: "cutoff", header: "Cut-Off", size: 100 },
      { key: "docType", header: "Type", size: 90 },
      { key: "docNo", header: "Doc No", size: 110, cellClassName: "font-mono text-xs" },
      { key: "docDate", header: "Doc Date", size: 110, type: "date" },
      { key: "rrNo", header: "RR No", size: 130, cellClassName: "font-mono text-xs" },
      { key: "csNo", header: "CS / Chassis No.", size: 150 },
      { key: "engineNo", header: "Engine No.", size: 140 },
      { key: "serialNo", header: "Serial No.", size: 140 },
      { key: "make", header: "Make", size: 120 },
      { key: "modelYear", header: "Model Year", size: 100 },
      { key: "model", header: "Model", size: 130 },
      { key: "color", header: "Color", size: 110 },
      { key: "particular", header: "Particular", size: 260 },
      { key: "itemNo", header: "Item No", size: 120 },
      { key: "itemDescription", header: "Item Desc", size: 120 },
      { key: "warehouse", header: "Warehouse", size: 120 },
      { key: "location", header: "Location", size: 120 },
      { key: "qtyIn", header: "Qty In", size: 110, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 110, cellClassName: "text-right text-rose-600 font-semibold", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 110, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "runBal", header: "Run Bal", size: 110, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "unitCost", header: "Unit Cost", size: 120, cellClassName: "text-right", type: "amount", decimals: 6 },
      { key: "amount", header: "Amount", size: 130, cellClassName: "text-right font-semibold", type: "amount", decimals: 2 },
      { key: "stockVal", header: "Stock Value", size: 130, cellClassName: "text-right font-semibold", type: "amount", decimals: 2 },
      { key: "postedBy", header: "Posted By", size: 140 },
      { key: "dateStamp", header: "Date Stamp", size: 120, type: "date" },
      { key: "timeStamp", header: "Time Stamp", size: 110 },
    ];
    },
    [inventorySetup]
  );

  const stockStatusColumnsMap = useMemo(
    () => ({
      summary: [
        {
          key: "__viewVehicle",
          header: "View",
          size: 60,
          filterable: false,
          sortable: false,
          className: "text-center",
          render: (row) => (
            <button
              type="button"
              title="View Vehicles"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedStatusItemCode(row.itemNo || "");
                setStockStatusTab("perVehicle");
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm transition hover:bg-blue-700"
            >
              <Eye size={13} />
            </button>
          ),
        },
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
      perVehicle: [
        { key: "itemNo", header: "Item No", size: 150, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Vehicle Item", size: 220 },
        { key: "csNo", header: "CS No.", size: 130 },
        { key: "serialNo", header: "Serial No.", size: 140 },
        { key: "engineNo", header: "Engine No.", size: 140 },
        { key: "make", header: "Make", size: 110 },
        { key: "modelYear", header: "Model Year", size: 90 },
        { key: "model", header: "Model", size: 120 },
        { key: "color", header: "Color", size: 100 },
        { key: "warehouse", header: "Warehouse", size: 120 },
        { key: "location", header: "Location", size: 120 },
        { key: "beginningBalance", header: "Beg. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right" },
        { key: "quantityIn", header: "Qty In", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-emerald-700 font-semibold" },
        { key: "quantityOut", header: "Qty Out", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-rose-600 font-semibold" },
        { key: "endingBalance", header: "End. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
        { key: "unitCost", header: "Unit Cost", size: 120, type: "amount", decimals: 6, cellClassName: "text-right" },
        { key: "amount", header: "Amount", size: 130, type: "amount", decimals: 2, cellClassName: "text-right font-semibold" },
      ],
    }),
    []
  );




  const balanceSummaryColumnsForTable = useMemo(() => normalizeTableColumns(balanceSummaryColumns), [balanceSummaryColumns]);
  const fifoDetailColumnsForTable = useMemo(() => normalizeTableColumns(fifoDetailColumns), [fifoDetailColumns]);
  const locationDetailColumnsForTable = useMemo(() => normalizeTableColumns(locationDetailColumns), [locationDetailColumns]);
  const allocationColumnsForTable = useMemo(() => normalizeTableColumns(allocationColumns), [allocationColumns]);
  const stockCardColumnsForTable = useMemo(() => normalizeTableColumns(stockCardColumns), [stockCardColumns]);
  const stockStatusColumnsMapForTable = useMemo(() => ({
    summary: normalizeTableColumns(stockStatusColumnsMap.summary),
    perVehicle: normalizeTableColumns(stockStatusColumnsMap.perVehicle),
  }), [stockStatusColumnsMap]);

  const mainTabs = MAIN_TABS.SPID;

  // const handleExportPlaceholder = () => {
  //   useSwalErrorAlert("Export not ready", "Please connect your export endpoint or export helper.");
  // };

  const fmt4 = (n) => toNumber(n).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  // ─── Balance Tab ─────────────────────────────────────────────────────────
  const renderBalanceTab = () => {
    const detailColumns = fifoDetailColumnsForTable;
    const tabLabel = "SPID Balance";
    const balanceActionColumns = [
      {
        key: "__actions",
        // label: "View",
        // size: 50,
        width: 50,
        minWidth: 50,
        filterable: false,
        sortable: false,
        className: "text-center",
        render: (row) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleViewStockCardFromBalance(row);
            }}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-1.5 py-1 text-[10px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 tracking-wide"
            title="View Stock Card"
          >
            <Eye size={12} />
            {/* View */}
          </button>
        ),
      },
      ...balanceSummaryColumnsForTable,
    ];

    return (
      <div className="space-y-3">
        {/* Filters */}
        <FilterPanel
          actions={
            <>
              <ToolbarButton variant="primary" icon={Search} onClick={() => { setSelectedBalanceItem(null); setShouldLoadBalance((p) => p + 1); }}>
                Find
              </ToolbarButton>
              <ToolbarButton
                icon={Layers}
                onClick={() => {
                  setBalanceFilters((prev) => ({ ...prev, warehouseCode: "", warehouseName: "", locationCode: "", locationName: "" }));
                  setSelectedBalanceItem(null);
                  setShouldLoadBalance((p) => p + 1);
                }}
              >
                All Warehouses
              </ToolbarButton>
              <ToolbarButton
                icon={RefreshCcw}
                onClick={() => {
                  setBalanceFilters(defaultBalanceFilters);
                  setSelectedBalanceItem(null);
                }}
              >
                Reset
              </ToolbarButton>
            </>
          }
        >
          <FieldRenderer
            type="lookup"
            label="Branch"
            name="branchCode"
            value={formatLookupValue(balanceFilters.branchCode, balanceFilters.branchName)}
            onLookup={() => openLookup("branch", "balance")}
            editableLookup
            onClear={() =>
              setBalanceFilters((prev) => ({
                ...prev,
                branchCode: "",
                branchName: "",
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Warehouse"
            name="warehouseCode"
            value={formatLookupValue(balanceFilters.warehouseCode, balanceFilters.warehouseName)}
            onLookup={() => openLookup("warehouse", "balance")}
            editableLookup
            onClear={() =>
              setBalanceFilters((prev) => ({
                ...prev,
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Location"
            name="locationCode"
            value={formatLookupValue(balanceFilters.locationCode, balanceFilters.locationName)}
            onLookup={() => openLookup("location", "balance")}
            editableLookup
            onClear={() =>
              setBalanceFilters((prev) => ({
                ...prev,
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Item"
            name="itemCode"
            value={formatLookupValue(balanceFilters.itemCode, balanceFilters.itemName)}
            onLookup={() => openLookup("item", "balance")}
            editableLookup
            onClear={() =>
              setBalanceFilters((prev) => ({
                ...prev,
                itemCode: "",
                itemName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Vehicle"
            name="veId"
            value={formatLookupValue(balanceFilters.veId, balanceFilters.vehicleName)}
            onLookup={() => openLookup("vehicle", "balance")}
            editableLookup
            onClear={() => setBalanceFilters((prev) => ({ ...prev, veId: "", vehicleName: "" }))}
          />

        </FilterPanel>

        {/* Summary + Details side-by-side */}
        <div className="xl:col-span-12 space-y-2">
          {/* Summary Table */}
            <TablePanel title={tabLabel} badge={balanceSummaryRows.length || undefined}>
              
              <SearchGlobalReferenceTable
                columns={balanceActionColumns}
                data={balanceSummaryRows}
                isLoading={balanceQuery.isLoading}
                isFetching={balanceQuery.isFetching}
                onRowClick={handleBalanceRowClick}
                selectedRow={selectedBalanceItem}
                showPagination={false}
                autoFillGrid = "true"
                // tableSize="Half"
              />
            </TablePanel>

          {/* Right Column */}
          <div className="xl:col-span-12 space-y-2">
            {/* Item Info Strip */}
            <ItemInfoStrip
              itemCode={selectedBalanceItem?.itemCode}
              itemName={selectedBalanceItem?.itemName}
              uomCode={selectedBalanceItem?.uomCode}
              quantity={selectedBalanceItem?.quantity != null ? fmt4(selectedBalanceItem.quantity) : undefined}
              qtyAllocated={selectedBalanceItem?.qtyAllocated != null ? fmt4(selectedBalanceItem.qtyAllocated) : undefined}
              qtyAvailable={selectedBalanceItem?.qtyAvailable != null ? fmt4(selectedBalanceItem.qtyAvailable) : undefined}
            />

            {/* Balance Details */}
            <TablePanel title="Balance Details" badge={selectedDetailRows.length || undefined}>
              <SearchGlobalReferenceTable
                columns={detailColumns}
                data={selectedDetailRows}
                isLoading={balanceQuery.isLoading}
                isFetching={balanceQuery.isFetching}
                showPagination={false}
                autoFillGrid = "true"
              />
            </TablePanel>

            {/* Allocation Details */}
            <TablePanel title="Allocation Details" badge={selectedAllocatedRows.length || undefined}>
              <SearchGlobalReferenceTable
                columns={allocationColumnsForTable}
                data={selectedAllocatedRows}
                isLoading={balanceQuery.isLoading}
                isFetching={balanceQuery.isFetching}
                showPagination={false}
                autoFillGrid = "true"
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
            type="lookup"
            label="Branch"
            name="branchCode"
            value={formatLookupValue(stockCardFilters.branchCode, stockCardFilters.branchName)}
            onLookup={() => openLookup("branch", "stockCard")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                branchCode: "",
                branchName: "",
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Warehouse"
            name="warehouseCode"
            value={formatLookupValue(stockCardFilters.warehouseCode, stockCardFilters.warehouseName)}
            onLookup={() => openLookup("warehouse", "stockCard")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Location"
            name="locationCode"
            value={formatLookupValue(stockCardFilters.locationCode, stockCardFilters.locationName)}
            onLookup={() => openLookup("location", "stockCard")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Item"
            name="itemCode"
            value={formatLookupValue(stockCardFilters.itemCode, stockCardFilters.itemName)}
            onLookup={() => openLookup("item", "stockCard")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                itemCode: "",
                itemName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Vehicle"
            name="veId"
            value={formatLookupValue(stockCardFilters.veId, stockCardFilters.vehicleName)}
            onLookup={() => openLookup("vehicle", "stockCard")}
            editableLookup
            onClear={() => setStockCardFilters((prev) => ({ ...prev, veId: "", vehicleName: "" }))}
          />
          <FieldRenderer
            type="lookup"
            label="Start Cut-Off"
            name="startingCutoff"
            value={formatLookupValue(stockCardFilters.startingCutoff, stockCardFilters.startingCutoffName)}
            onLookup={() => openLookup("cutoff", "stockCard", "startingCutoff")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                startingCutoff: "",
                startingCutoffName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="End Cut-Off"
            name="endingCutoff"
            value={formatLookupValue(stockCardFilters.endingCutoff, stockCardFilters.endingCutoffName)}
            onLookup={() => openLookup("cutoff", "stockCard", "endingCutoff")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                endingCutoff: "",
                endingCutoffName: "",
              }))
            }
          />
         
        </FilterPanel>

        {/* Toolbar + KPI Row */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
          {/* <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
            <ToolbarButton variant="primary" icon={Search} onClick={() => setShouldLoadStockCard((p) => p + 1)}>
              Find
            </ToolbarButton>
            <ToolbarButton icon={RefreshCcw} onClick={() => setStockCardFilters(defaultStockCardFilters)}>
              Reset
            </ToolbarButton>
          </div> */}
           {/* Action column inside grid */}
          <div className="flex flex-wrap items-end gap-2">
            <ToolbarButton variant="primary" icon={Search} onClick={() => setShouldLoadStockCard((p) => p + 1)}>
              Find
            </ToolbarButton>
            <ToolbarButton icon={RefreshCcw} onClick={() => setStockCardFilters(defaultStockCardFilters)}>
              Reset
            </ToolbarButton>
          </div>


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
        <TablePanel
          title="Stock Card Movement"
          badge={stockCardRows.length || undefined}
          // toolbar={
          //   <ToolbarButton icon={Download} onClick={() => window.print()}>
          //     Export
          //   </ToolbarButton>
          // }
        >
          <SearchGlobalReportTable
            columns={stockCardColumnsForTable}
            data={stockCardRows}
            isLoading={stockCardQuery.isLoading}
            isFetching={stockCardQuery.isFetching}
            tableHeight="2000px"
            // autoFillGrid
          />
        </TablePanel>
      </div>
    );
  };

  // ─── Vehicle Inventory Status Tab ─────────────────────────────────────────
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
            onChange={(value) =>
              setStockStatusFilters((prev) => ({
                ...prev,
                reportType: value,
                endDate: getStockStatusEndDate(value, prev.startDate),
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Branch"
            name="branchCode"
            value={formatLookupValue(stockStatusFilters.branchCode, stockStatusFilters.branchName)}
            onLookup={() => openLookup("branch", "stockStatus")}
            editableLookup
            onClear={() =>
              setStockStatusFilters((prev) => ({
                ...prev,
                branchCode: "",
                branchName: "",
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2 xl:col-span-2">
            <FieldRenderer
              type="lookup"
              label="Warehouse"
              name="warehouseCode"
              value={formatLookupValue(stockStatusFilters.warehouseCode, stockStatusFilters.warehouseName)}
              onLookup={() => openLookup("warehouse", "stockStatus")}
              editableLookup
              onClear={() =>
                setStockStatusFilters((prev) => ({
                  ...prev,
                  warehouseCode: "",
                  warehouseName: "",
                  locationCode: "",
                  locationName: "",
                }))
              }
            />
            <FieldRenderer
              type="lookup"
              label="Location"
              name="locationCode"
              value={formatLookupValue(stockStatusFilters.locationCode, stockStatusFilters.locationName)}
              onLookup={() => openLookup("location", "stockStatus")}
              editableLookup
              onClear={() =>
                setStockStatusFilters((prev) => ({
                  ...prev,
                  locationCode: "",
                  locationName: "",
                }))
              }
            />
            <FieldRenderer
              type="lookup"
              label="Vehicle"
              name="veId"
              value={formatLookupValue(stockStatusFilters.veId, stockStatusFilters.vehicleName)}
              onLookup={() => openLookup("vehicle", "stockStatus")}
              editableLookup
              onClear={() => setStockStatusFilters((prev) => ({ ...prev, veId: "", vehicleName: "" }))}
            />

            <CalendarField
              id="fgStockStatusStartDate"
              label="Start Date"
              name="startDate"
              value={stockStatusFilters.startDate}
              updateState={(patch) =>
                setStockStatusFilters((prev) => ({
                  ...prev,
                  ...patch,
                  endDate: getStockStatusEndDate(prev.reportType, patch.startDate ?? prev.startDate),
                }))
              }
            />
            <CalendarField
              id="fgStockStatusEndDate"
              label="End Date"
              name="endDate"
              value={stockStatusFilters.endDate}
              disabled
              updateState={(patch) => setStockStatusFilters((prev) => ({ ...prev, ...patch }))}
            />

          </div>
          

          {/* Action column inside grid */}
          <div className="flex flex-wrap items-end gap-2">
            <ToolbarButton
              variant="primary"
              icon={Search}
              onClick={() => {
                setSelectedStatusItemCode("");
                setStockStatusTab("summary");
                setShouldLoadStockStatus((p) => p + 1);
              }}
            >
              Load &amp; Process
            </ToolbarButton>
            <ToolbarButton onClick={() => setShouldLoadStockStatus((p) => p + 1)} icon={Layers}>
              All Warehouse
            </ToolbarButton>
            <ToolbarButton
              icon={RefreshCcw}
              onClick={() => {
                setStockStatusFilters(defaultStockStatusFilters);
                setSelectedStatusItemCode("");
                setStockStatusTab("summary");
              }}
            >
              Reset
            </ToolbarButton>
            {/* <ToolbarButton icon={Download} onClick={handleExportPlaceholder}>
              Export
            </ToolbarButton> */}
          </div>
        </FilterPanel>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-2 px-1 py-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">View:</span>
          {STOCK_STATUS_SUBTABS.map((tab) => (
            <SubTabButton
              key={tab.key}
              active={stockStatusTab === tab.key}
              label={tab.label}
              onClick={() => {
                setStockStatusTab(tab.key);
                if (tab.key === "summary") setSelectedStatusItemCode("");
              }}
            />
          ))}
          {stockStatusRows.length > 0 && (
            <span className="ml-2 rounded-md bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
              {stockStatusRows.length} record{stockStatusRows.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Data Table */}
        <TablePanel title={STOCK_STATUS_SUBTABS.find((t) => t.key === stockStatusTab)?.label || "Vehicle Inventory Status"}>
          <SearchGlobalReportTable
            columns={stockStatusColumnsMapForTable[stockStatusTab] || []}
            data={stockStatusRows}
            isLoading={stockStatusQuery.isLoading}
            isFetching={stockStatusQuery.isFetching}
            // autoFillGrid
            // pagination
          />
        </TablePanel>
      </div>
    );
  };

  const loadVehicleHistory = () => {
    if (!vehicleHistoryFilters.csNo.trim()) {
      useSwalErrorAlert("Required", "Please enter the CS No.");
      return;
    }
    setShouldLoadVehicleHistory((prev) => prev + 1);
  };

  const viewVehicleDocument = (transaction) => {
    if (!transaction?.pathUrl) {
      useSwalErrorAlert("View Document", "This transaction cannot be opened.");
      return;
    }

    const url = `${window.location.origin}${transaction.pathUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderVehicleHistoryTab = () => (
    <div className="space-y-3">
      <FilterPanel>
        <FieldRenderer
          type="text"
          label="CS No."
          name="csNo"
          value={vehicleHistoryFilters.csNo}
          onChange={(value) => setVehicleHistoryFilters({ csNo: value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") loadVehicleHistory();
          }}
        />
        <div className="flex items-end gap-2">
          <ToolbarButton variant="primary" icon={Search} onClick={loadVehicleHistory}>Find</ToolbarButton>
          <ToolbarButton
            icon={RefreshCcw}
            onClick={() => {
              setVehicleHistoryFilters(defaultVehicleHistoryFilters);
              setShouldLoadVehicleHistory(0);
            }}
          >
            Reset
          </ToolbarButton>
        </div>
      </FilterPanel>

      {trackedVehicle.veId && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/60 px-4 py-3 dark:border-slate-700 dark:from-slate-800 dark:to-blue-950/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Vehicle Profile</div>
                <div className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{trackedVehicle.itemName || trackedVehicle.itemCode}</div>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                {trackedVehicle.currentStatus || "Recorded"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-4 lg:flex-row">
          <div className="flex h-48 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-slate-800 lg:w-72">
            {trackedVehicleImage ? (
              <img src={trackedVehicleImage} alt={trackedVehicle.itemName || "Vehicle"} className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs font-medium text-slate-400">No vehicle image registered</span>
            )}
          </div>
          <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            <HeaderStatusCard label="CS No." value={trackedVehicle.csNo} />
            <HeaderStatusCard label="Item" value={trackedVehicle.itemCode} />
            <HeaderStatusCard label="Make" value={trackedVehicle.make} />
            <HeaderStatusCard label="Model" value={trackedVehicle.model} />
            <HeaderStatusCard label="Model Year" value={trackedVehicle.modelYear} />
            <HeaderStatusCard label="Engine No." value={trackedVehicle.engineNo} />
            <HeaderStatusCard label="Serial No." value={trackedVehicle.serialNo} />
            <HeaderStatusCard label="Color" value={trackedVehicle.color} />
            <HeaderStatusCard label="PNP No." value={trackedVehicle.pnpNo} />
            <HeaderStatusCard label="CSR No." value={trackedVehicle.csrNo} />
            <HeaderStatusCard label="Current Branch" value={trackedVehicle.branchCode} />
            <HeaderStatusCard label="Current Location" value={[trackedVehicle.whouseCode, trackedVehicle.locCode].filter(Boolean).join(" / ")} />
          </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Vehicle Transaction Workflow</h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Complete document trail from purchasing through sales and collection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {vehicleTransactionRows.length ? `${activeWorkflowIndex + 1} of ${vehicleTransactionRows.length}` : "0 stages"}
            </span>
            <button
              type="button"
              aria-label="Previous transaction"
              disabled={activeWorkflowIndex === 0}
              onClick={() => scrollWorkflowTo(activeWorkflowIndex - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              aria-label="Next transaction"
              disabled={!vehicleTransactionRows.length || activeWorkflowIndex === vehicleTransactionRows.length - 1}
              onClick={() => scrollWorkflowTo(activeWorkflowIndex + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        {vehicleTransactionRows.length ? (
          <>
          <div
            ref={workflowScrollerRef}
            onScroll={handleWorkflowScroll}
            className="snap-x snap-mandatory overflow-x-auto scroll-smooth px-4 py-7 sm:px-[calc(50%_-_380px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ perspective: "1400px" }}
          >
            <div className="flex min-w-max items-stretch gap-0">
              {vehicleTransactionRows.map((transaction, index) => {
                const workflowStyle = {
                  PO: { label: "Purchase Order", icon: ShoppingCart, border: "border-t-indigo-500", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" },
                  VERR: { label: "Vehicle Receiving", icon: Truck, border: "border-t-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
                  VSO: { label: "Sales Order", icon: FileText, border: "border-t-violet-500", badge: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
                  VDR: { label: "Delivery", icon: Truck, border: "border-t-amber-500", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
                  VSI: { label: "Sales Invoice", icon: Receipt, border: "border-t-blue-500", badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
                  VEAJ: { label: "Vehicle Adjustment", icon: Wrench, border: "border-t-orange-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300" },
                  CR: { label: "Collection Receipt", icon: Wallet, border: "border-t-cyan-500", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300" },
                  ARCM: { label: "Credit Memo", icon: FileText, border: "border-t-teal-500", badge: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" },
                  ARDM: { label: "Debit Memo", icon: FileText, border: "border-t-rose-500", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" },
                }[transaction.documentType] || {
                  label: transaction.stage || "Transaction",
                  icon: FileText,
                  border: "border-t-slate-500",
                  badge: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
                };
                const TransactionIcon = workflowStyle.icon;
                const cardWidth = ['VSO', 'VSI'].includes(transaction.documentType)
                  ? "w-[780px] max-w-[calc(100vw-3rem)]"
                  : "w-[720px] max-w-[calc(100vw-3rem)]";
                const rawStatus = String(transaction.status || "").trim().toUpperCase();
                const statusLabel = rawStatus === "F" ? "Finalized" : rawStatus === "C" ? "Closed" : transaction.status || "Recorded";
                const party = [transaction.partyCode, transaction.partyName].filter(Boolean).join(" - ");
                const location = [transaction.branchCode, transaction.whouseCode, transaction.locCode]
                  .filter(Boolean)
                  .join(" / ");
                const amount = toNumber(transaction.amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const unitPrice = toNumber(transaction.unitPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                });
                const sellingPrice = toNumber(transaction.sellingPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const unitCost = toNumber(transaction.unitCost).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const grossProfit = toNumber(transaction.grossProfit).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const transactionDate = transaction.transactionDate ? new Date(transaction.transactionDate) : null;
                const transactionDateText = transactionDate && !Number.isNaN(transactionDate.getTime())
                  ? transactionDate.toLocaleDateString()
                  : transaction.transactionDate || "—";
                const fallbackTime = transaction.timeStamp
                  ? String(transaction.timeStamp).padStart(4, "0").replace(/^(\d{2})(\d{2})$/, "$1:$2")
                  : "—";
                const createdDate = transaction.createdDateStamp ? new Date(transaction.createdDateStamp) : null;
                const createdDateText = createdDate && !Number.isNaN(createdDate.getTime())
                  ? createdDate.toLocaleDateString()
                  : transaction.transactionDate || "—";
                const createdTimeText = createdDate && !Number.isNaN(createdDate.getTime())
                  ? createdDate.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : fallbackTime;
                const postedDate = transaction.postedDateStamp ? new Date(transaction.postedDateStamp) : null;
                const postedDateText = postedDate && !Number.isNaN(postedDate.getTime())
                  ? postedDate.toLocaleDateString()
                  : "—";
                const postedTimeText = postedDate && !Number.isNaN(postedDate.getTime())
                  ? postedDate.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : "—";

                return (
                  <React.Fragment key={`${transaction.documentType}-${transaction.documentNo}-${index}`}>
                    <article
                      ref={(element) => { workflowCardRefs.current[index] = element; }}
                      onClick={() => scrollWorkflowTo(index)}
                      style={activeWorkflowIndex === index
                        ? { animation: "vehicleCardFloat 3s ease-in-out infinite", transformStyle: "preserve-3d" }
                        : {
                            transform: `rotateY(${index < activeWorkflowIndex ? "14deg" : "-14deg"}) scale(0.92)`,
                            transformOrigin: index < activeWorkflowIndex ? "right center" : "left center",
                            transformStyle: "preserve-3d",
                          }}
                      className={`${cardWidth} flex snap-center cursor-pointer flex-col rounded-xl border border-t-4 border-slate-200 bg-white transition-all duration-500 dark:border-slate-700 dark:bg-slate-800 ${workflowStyle.border} ${
                        activeWorkflowIndex === index
                          ? "relative z-10 opacity-100 shadow-2xl shadow-blue-200/60 ring-1 ring-blue-200 dark:shadow-blue-950/60 dark:ring-blue-800"
                          : "opacity-60 shadow-sm hover:opacity-90 hover:shadow-lg"
                      }`}
                    >
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white dark:bg-slate-200 dark:text-slate-900">
                                {index + 1}
                              </span>
                              <span
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${workflowStyle.badge}`}
                                title={workflowStyle.label}
                                aria-label={workflowStyle.label}
                              >
                                <TransactionIcon size={18} strokeWidth={2.25} />
                              </span>
                            </div>
                            <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{transaction.stage}</div>
                          </div>
                          <div className="text-right">
                            <span className="inline-block rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              {statusLabel}
                            </span>
                            {transaction.latestActivity && (
                              <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                {transaction.latestActivity}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-2">
                        <div className="flex min-w-0 flex-col gap-2">
                        <div>
                          <div className="text-[10px] font-semibold tracking-wide text-slate-400">Document</div>
                          <div className="mt-0.5 font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                            {transaction.documentNo || "—"}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{transactionDateText}</div>
                        </div>

                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                          <div>
                            <dt className="text-[10px] uppercase text-slate-400">Reference</dt>
                            <dd className="whitespace-normal break-words font-semibold text-slate-700 dark:text-slate-200">{transaction.relatedDocumentNo || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-[10px] text-slate-400">Amount</dt>
                            <dd className="font-bold text-blue-700 dark:text-blue-300">{transaction.amount == null ? "—" : amount}</dd>
                          </div>
                          {transaction.documentType === "VSO" && (
                            <div><dt className="text-[10px] text-slate-400">Selling Price</dt><dd className="font-semibold text-violet-700 dark:text-violet-300">{sellingPrice}</dd></div>
                          )}
                          {transaction.documentType === "VSI" && (
                            <>
                              <div><dt className="text-[10px] text-slate-400">Unit Cost</dt><dd className="font-semibold text-slate-700 dark:text-slate-200">{unitCost}</dd></div>
                              <div><dt className="text-[10px] text-slate-400">Selling Price</dt><dd className="font-semibold text-blue-700 dark:text-blue-300">{sellingPrice}</dd></div>
                              <div><dt className="text-[10px] text-slate-400">Gross Profit</dt><dd className="font-bold text-emerald-700 dark:text-emerald-300">{grossProfit}</dd></div>
                              <div><dt className="text-[10px] text-slate-400">Gross Margin</dt><dd className="font-bold text-emerald-700 dark:text-emerald-300">{toNumber(transaction.grossMargin).toFixed(2)}%</dd></div>
                            </>
                          )}
                          {!['VSO', 'VSI', 'VDR'].includes(transaction.documentType) && (
                            <div><dt className="text-[10px] text-slate-400">Unit Price / Cost</dt><dd className="font-semibold text-slate-700 dark:text-slate-200">{transaction.unitPrice == null ? "—" : unitPrice}</dd></div>
                          )}
                        </dl>

                        <div className="border-t border-slate-100 pt-2 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400">Vendor / Customer</div>
                          <div className="whitespace-normal break-words text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-200">{party || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Branch / Warehouse / Location</div>
                          <div className="whitespace-normal break-words text-xs text-slate-600 dark:text-slate-300">{location || "—"}</div>
                        </div>
                        </div>
                        <div className="flex min-w-0 flex-col gap-2 border-t border-slate-100 pt-2 dark:border-slate-700 md:border-l md:border-t-0 md:pl-3 md:pt-0">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/60">
                              <div className="text-[10px] font-semibold text-slate-400">Created By</div>
                              <div className="mt-1 break-words font-semibold text-slate-700 dark:text-slate-200">{transaction.createdBy || "—"}</div>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div><span className="block text-[10px] text-slate-400">Date</span><span className="font-medium text-slate-600 dark:text-slate-300">{createdDateText}</span></div>
                                <div><span className="block text-[10px] text-slate-400">Time</span><span className="font-mono font-medium text-slate-600 dark:text-slate-300">{createdTimeText}</span></div>
                              </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/60">
                              <div className="text-[10px] font-semibold text-slate-400">Posted By</div>
                              <div className="mt-1 break-words font-semibold text-slate-700 dark:text-slate-200">{transaction.postedBy || "—"}</div>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div><span className="block text-[10px] text-slate-400">Date</span><span className="font-medium text-slate-600 dark:text-slate-300">{postedDateText}</span></div>
                                <div><span className="block text-[10px] text-slate-400">Time</span><span className="font-mono font-medium text-slate-600 dark:text-slate-300">{postedTimeText}</span></div>
                              </div>
                            </div>
                          </div>
                        <div className="mt-auto space-y-2">
                          <div className="rounded-md border border-slate-100 bg-slate-50/60 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/40">
                            <div className="text-[10px] text-slate-400">Particulars</div>
                            <div className="mt-0.5 whitespace-pre-wrap break-words text-[11px] italic leading-relaxed text-slate-500 dark:text-slate-400">
                              {transaction.particular || "—"}
                            </div>
                          </div>
                          {transaction.activityCount > 0 && (
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-700">
                              <span>{transaction.activityCount} document trail {transaction.activityCount === 1 ? "activity" : "activities"}</span>
                              <span>{transaction.latestActivityBy || ""}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              viewVehicleDocument(transaction);
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
                          >
                            <ExternalLink size={13} />
                            View Document
                          </button>
                        </div>
                        </div>
                      </div>
                    </article>

                    {index < vehicleTransactionRows.length - 1 && (
                      <div className="flex w-12 shrink-0 items-center justify-center">
                        <div className="h-0.5 flex-1 bg-blue-200 dark:bg-blue-800" />
                        <ChevronRight size={20} className="-ml-1 shrink-0 text-blue-500" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 px-4 pb-4">
            {vehicleTransactionRows.map((transaction, index) => (
              <button
                key={`workflow-dot-${transaction.documentType}-${transaction.documentNo}-${index}`}
                type="button"
                aria-label={`Open ${transaction.stage || transaction.documentType}`}
                onClick={() => scrollWorkflowTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeWorkflowIndex === index
                    ? "w-7 bg-blue-600"
                    : "w-2 bg-slate-300 hover:bg-blue-300 dark:bg-slate-600"
                }`}
              />
            ))}
          </div>
          <style>{`
            @keyframes vehicleCardFloat {
              0%, 100% { transform: translateY(-4px); }
              50% { transform: translateY(-10px); }
            }
          `}</style>
          </>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            Enter a CS No. to display the vehicle transaction workflow.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Posted Inventory Movements</h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Inventory entries posted to the vehicle ledger
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {vehicleHistoryRows.length} movements
          </span>
        </div>

        {vehicleHistoryRows.length ? (
          <div className="space-y-0 p-4">
            {vehicleHistoryRows.map((movement, index) => {
              const isInbound = toNumber(movement.qtyIn) > 0;
              const movementLocation = [movement.branchCode, movement.whouseCode, movement.locCode]
                .filter(Boolean)
                .join(" / ");
              const movementDate = movement.docDate ? new Date(movement.docDate) : null;
              const movementDateText = movementDate && !Number.isNaN(movementDate.getTime())
                ? movementDate.toLocaleDateString()
                : movement.docDate || "";

              return (
                <div key={`${movement.moveId || movement.docNo}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < vehicleHistoryRows.length - 1 && (
                    <div className="absolute bottom-0 left-[17px] top-9 w-0.5 bg-slate-200 dark:bg-slate-700" />
                  )}
                  <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white text-xs font-bold text-white shadow-sm dark:border-slate-900 ${
                    isInbound ? "bg-emerald-500" : "bg-rose-500"
                  }`}>
                    {index + 1}
                  </div>

                  <article className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/70 p-3 transition hover:border-blue-300 hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-blue-700">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isInbound
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                          }`}>
                            {isInbound ? "Inbound" : "Outbound"}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{movement.docType || "Movement"}</span>
                          <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300">{movement.docNo || "—"}</span>
                          <span className="text-xs text-slate-500">{movementDateText}</span>
                          {movement.timeStamp && <span className="font-mono text-xs text-slate-400">{movement.timeStamp}</span>}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={movement.particular || ""}>
                          {movement.particular || "No particulars"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-2 text-xs dark:border-slate-700 md:grid-cols-5">
                      <div><span className="block text-[10px] uppercase text-slate-400">RR No.</span><span className="font-semibold text-slate-700 dark:text-slate-200">{movement.rrNo || "—"}</span></div>
                      <div><span className="block text-[10px] uppercase text-slate-400">Location</span><span className="font-semibold text-slate-700 dark:text-slate-200" title={movementLocation}>{movementLocation || "—"}</span></div>
                      <div><span className="block text-[10px] uppercase text-slate-400">Unit Cost</span><span className="font-semibold text-slate-700 dark:text-slate-200">{toNumber(movement.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span></div>
                      <div><span className="block text-[10px] uppercase text-slate-400">Amount</span><span className="font-semibold text-slate-700 dark:text-slate-200">{toNumber(movement.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div><span className="block text-[10px] uppercase text-slate-400">Posted By</span><span className="font-semibold text-slate-700 dark:text-slate-200">{movement.postedBy || "—"}</span></div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No posted inventory movement found.</div>
        )}
      </div>
    </div>
  );

  const activeLoading =
    setupQuery.isLoading ||
    balanceQuery.isLoading ||
    balanceQuery.isFetching ||
    stockCardQuery.isLoading ||
    stockCardQuery.isFetching ||
    stockStatusQuery.isLoading ||
    stockStatusQuery.isFetching ||
    vehicleHistoryQuery.isLoading ||
    vehicleHistoryQuery.isFetching;

  const activeTabLabel =
    mainTabs.find((tab) => tab.key === activeMainTab)?.label || "Inventory Inquiry";

  const activeRecordCount =
    activeMainTab === "stockCard"
      ? stockCardRows.length
      : activeMainTab === "stockStatus"
        ? stockStatusRows.length
        : activeMainTab === "vehicleHistory"
          ? vehicleHistoryRows.length
          : balanceSummaryRows.length;

  const handleHeaderFind = React.useCallback(() => {
    if (activeMainTab === "stockCard") {
      setShouldLoadStockCard((prev) => prev + 1);
      return;
    }

    if (activeMainTab === "stockStatus") {
      setShouldLoadStockStatus((prev) => prev + 1);
      return;
    }

    if (activeMainTab === "vehicleHistory") {
      loadVehicleHistory();
      return;
    }

    setSelectedBalanceItem(null);
    setShouldLoadBalance((prev) => prev + 1);
  }, [activeMainTab]);

  const handleHeaderReset = React.useCallback(() => {
    if (activeMainTab === "stockCard") {
      setStockCardFilters(defaultStockCardFilters);
      return;
    }

    if (activeMainTab === "stockStatus") {
      setStockStatusFilters(defaultStockStatusFilters);
      return;
    }

    if (activeMainTab === "vehicleHistory") {
      setVehicleHistoryFilters(defaultVehicleHistoryFilters);
      setShouldLoadVehicleHistory(0);
      return;
    }

    setBalanceFilters(defaultBalanceFilters);
    setSelectedBalanceItem(null);
  }, [activeMainTab, defaultBalanceFilters, defaultStockCardFilters, defaultStockStatusFilters]);

  // ─── Root ─────────────────────────────────────────────────────────────────
  const activeLookupFilters = getFiltersByScope(lookupState.scope);
  const warehouseLookupFilter = activeLookupFilters?.branchCode
    ? `ByBC${activeLookupFilters.branchCode}`
    : "ActiveAll";
  const locationLookupWarehouse = activeLookupFilters?.warehouseCode || "";

  return (
    <div className="global-ref-main-div-ui mt-24">
      {activeLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui" style={{ zIndex: 45 }}>
        <div className="w-full flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:w-auto">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
              <h1 className="global-ref-headertext-ui w-full sm:w-auto truncate text-center sm:text-left">
                VE Stock Card Inquiry
              </h1>
            </div>
            <p className="mt-0 ml-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-left">
              View inventory balance, stock card movement, vehicle status, and transaction history in one workspace.
            </p>
          </div>

          <div className="w-full lg:w-auto flex justify-center lg:justify-end">
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
              <HeaderStatusCard label="Costing Setup" value={inventorySetup || "SPID"} />
              <HeaderStatusCard label="Active View" value={activeTabLabel} />
              <div className="flex h-10 min-w-[96px] flex-col items-center justify-center rounded-md bg-slate-100 px-3 py-1 text-center shadow-sm dark:bg-slate-800">
                <span className="text-xs font-bold leading-tight text-slate-600 dark:text-slate-300">Records</span>
                <span className="text-[16px] font-extrabold leading-tight text-slate-900 dark:text-slate-100">{activeRecordCount}</span>
              </div>
              {/* <HeaderActionButton icon={Search} onClick={handleHeaderFind} disabled={activeLoading}>
                Find
              </HeaderActionButton>
              <HeaderActionButton icon={RefreshCcw} onClick={handleHeaderReset} disabled={activeLoading}>
                Reset
              </HeaderActionButton>
              <HeaderActionButton icon={Printer} onClick={() => window.print()} disabled={activeLoading}>
                Print
              </HeaderActionButton>
              <HeaderActionButton icon={Download} onClick={() => window.print()} disabled={activeLoading}>
                Export
              </HeaderActionButton> */}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-900 mt-2">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-3 pt-0 dark:border-slate-700 dark:from-slate-800/60 dark:to-slate-900">
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

        <div className="p-3 bg-slate-50/30 dark:bg-slate-800/20">
          {activeMainTab === "spid" && renderBalanceTab()}
          {activeMainTab === "stockCard" && renderStockCardTab()}
          {activeMainTab === "stockStatus" && renderStockStatusTab()}
          {activeMainTab === "vehicleHistory" && renderVehicleHistoryTab()}
        </div>
      </div>

      {lookupState.type === "branch" && (
        <BranchLookupModal
          isOpen
          onClose={handleBranchLookupClose}
          title="Search Branch"
          withPagination
        />
      )}

      {lookupState.type === "item" && (
        <ItemMastLookupModal
          isOpen
          endpoint="getInvLookupVE"
          onClose={handleItemLookupClose}
          onCancel={closeLookup}
          enableMultiSelect={false}
          docType="PRVE"
        />
      )}

      {lookupState.type === "vehicle" && (
        <GlobalLookupModalv1
          isOpen
          title="Select Vehicle from Receiving Report"
          endpoint={[
            { key: "csNo", label: "CS / Chassis No." },
            { key: "engineNo", label: "Engine No." },
            { key: "serialNo", label: "Serial No." },
            { key: "itemCode", label: "Item Code" },
            { key: "itemName", label: "Item Name" },
            { key: "make", label: "Make" },
            { key: "modelYear", label: "Model Year" },
            { key: "model", label: "Model" },
            { key: "color", label: "Color" },
            { key: "rrNo", label: "RR No." },
          ]}
          data={vehicleQuery.data || []}
          singleSelect
          btnCaption="Select Vehicle"
          onClose={handleVehicleLookupClose}
          onCancel={closeLookup}
          preferenceKey="VEStockCard:VehicleLookup"
        />
      )}

      {lookupState.type === "warehouse" && (
        <WarehouseLookupModal
          isOpen
          onClose={handleWarehouseLookupClose}
          filter={warehouseLookupFilter}
          branchCode={activeLookupFilters?.branchCode || ""}
        invType="VE"
        />
      )}

      {lookupState.type === "location" && (
        <LocationLookupModal
          isOpen
          onClose={handleLocationLookupClose}
          filter={locationLookupWarehouse ? `ByWH${locationLookupWarehouse}` : "ActiveAll"}
          whCode={locationLookupWarehouse}
        />
      )}

      {lookupState.type === "cutoff" && (
        <CutoffLookupModal
          isOpen
          onClose={handleCutoffLookupClose}
          title="Search Cut-Off"
          withPagination
        />
      )}
    </div>
  );
}

export default VEStockCardQuery;

