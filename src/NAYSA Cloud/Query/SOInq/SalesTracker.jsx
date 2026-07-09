import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faClock,
  faDownload,
  faEye,
  faArrowUpRightFromSquare,
  faFileInvoiceDollar,
  faFilter,
  faLayerGroup,
  faMagnifyingGlass,
  faMoneyBillWave,
  faPesoSign,
  faProjectDiagram,
  faReceipt,
  faRotateLeft,
  faTimes,
  faTruck,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";

import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchCustMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchSalesRepRef from "@/NAYSA Cloud/Lookup/SearchSalesRepRef.jsx";

import SalesTrackerDetailsModal from "./SalesTrackerDetailsModal.jsx";

const PAGE_CONFIGS = {
  lifecycle: {
    title: "Sales Lifecycle Tracker",
    subtitle: "Monitor SO to collection: SO → DR Qty → SI → ARDM / ARCM → CR",
    endpoint: "getSalesLifecycleTracker",
    icon: faProjectDiagram,
    empty: "No sales lifecycle records found.",
  },
  itemFlow: {
    title: "Sales Item Flow Tracker",
    subtitle: "Track ordered, delivered, invoiced, and remaining quantity per item.",
    endpoint: "getSalesItemFlowTracker",
    icon: faLayerGroup,
    empty: "No item flow records found.",
  },
  aging: {
    title: "Sales Aging Analysis",
    subtitle: "Analyze outstanding receivables by customer and aging bucket.",
    endpoint: "getSalesAgingAnalysis",
    icon: faClock,
    empty: "No aging records found.",
  },
  performance: {
    title: "Sales Performance Analysis",
    subtitle: "Analyze SO, SI, collection, and balance by customer / salesman.",
    endpoint: "getSalesPerformanceAnalysis",
    icon: faChartLine,
    empty: "No sales performance records found.",
  },
  collection: {
    title: "Collection Analysis",
    subtitle: "Analyze CR, ARCM, ARDM, and applied collection movement.",
    endpoint: "getSalesCollectionAnalysis",
    icon: faMoneyBillWave,
    empty: "No collection records found.",
  },
};

const NAV_ITEMS = [
  { key: "lifecycle", label: "Lifecycle Tracker", description: "SO to Collection", icon: faProjectDiagram },
  { key: "itemFlow", label: "Item Flow Tracker", description: "SO / DR / SI Qty", icon: faLayerGroup },
  { key: "aging", label: "Aging Analysis", description: "AR Balance", icon: faClock },
  { key: "performance", label: "Sales Performance", description: "Sales trend", icon: faChartLine },
  { key: "collection", label: "Collection Analysis", description: "CR / CM / DM", icon: faMoneyBillWave },
];

const SALES_STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "PENDING_DELIVERY", label: "Pending Delivery" },
  { value: "PARTIALLY_DELIVERED", label: "Partially Delivered" },
  { value: "PENDING_INVOICE", label: "Pending Invoice" },
  { value: "PARTIALLY_INVOICED", label: "Partially Invoiced" },
  { value: "PENDING_COLLECTION", label: "Pending Collection" },
  { value: "PARTIALLY_COLLECTED", label: "Partially Collected" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const DATE_BASIS_OPTIONS = [
  { value: "SO_DATE", label: "SO Date" },
  { value: "DR_DATE", label: "DR Date" },
  { value: "SI_DATE", label: "SI Date" },
  { value: "DUE_DATE", label: "Due Date" },
  { value: "COLLECTION_DATE", label: "Collection Date" },
];

const LIFECYCLE_ACTION_WIDTH = 74;
const LIFECYCLE_STATUS_WIDTH = 160;
const LIFECYCLE_FLOW_WIDTH = 170;

const LIFECYCLE_STICKY_RIGHT = {
  currentStatus: LIFECYCLE_ACTION_WIDTH + LIFECYCLE_FLOW_WIDTH,
  flow: LIFECYCLE_ACTION_WIDTH,
};

const LIFECYCLE_COLUMNS = [
  { key: "soNo", label: "SO No", type: "link", minWidth: 130 },
  { key: "soDate", label: "SO Date", type: "date", minWidth: 105 },
  { key: "custName", label: "Customer", minWidth: 190 },
  { key: "salesRepName", label: "Salesman", minWidth: 155 },
  { key: "soQuantity", label: "SO Qty", type: "qty", align: "right", minWidth: 95 },
  { key: "soAmount", label: "SO Amount", type: "amount", align: "right", minWidth: 125 },
  { key: "drCount", label: "DR Count", type: "number", align: "right", minWidth: 90 },
  { key: "drQuantity", label: "DR QUANTITY", type: "qty", align: "right", minWidth: 115 },
  { key: "siCount", label: "SI Count", type: "number", align: "right", minWidth: 90 },
  { key: "invoiceAmount", label: "SI Amount", type: "amount", align: "right", minWidth: 125 },
  { key: "debitMemoAmount", label: "ARDM", type: "amount", align: "right", minWidth: 115 },
  { key: "creditMemoAmount", label: "ARCM", type: "amount", align: "right", minWidth: 115 },
  { key: "collectionAmount", label: "Collected", type: "amount", align: "right", minWidth: 125 },
  { key: "balanceAmount", label: "AR Balance", type: "amount", align: "right", minWidth: 125 },
  { key: "agingDays", label: "Aging", type: "number", align: "right", minWidth: 80 },
  { key: "currentStatus", label: "Lifecycle Status", type: "status", minWidth: LIFECYCLE_STATUS_WIDTH },
  { key: "flow", label: "Flow", type: "flow", minWidth: LIFECYCLE_FLOW_WIDTH },
];

const ITEM_FLOW_COLUMNS = [
  { key: "soNo", label: "SO No", minWidth: 130 },
  { key: "soDate", label: "SO Date", type: "date", minWidth: 105 },
  { key: "custName", label: "Customer", minWidth: 190 },
  { key: "salesRepName", label: "Salesman", minWidth: 150 },
  { key: "custPoNo", label: "Cust PO No", minWidth: 130 },
  { key: "groupId", label: "Line Ref", minWidth: 100 },
  { key: "itemCode", label: "Item Code", minWidth: 120 },
  { key: "itemDescription", label: "Item Description", minWidth: 240 },
  { key: "itemSpecs", label: "Item Specs", minWidth: 220 },
  { key: "uom", label: "UOM", minWidth: 80 },
  { key: "soQuantity", label: "SO Qty", type: "qty", align: "right", minWidth: 105 },
  { key: "soUnitPrice", label: "SO Unit Price", type: "amount", align: "right", minWidth: 125 },
  { key: "soGrossAmount", label: "SO Gross", type: "amount", align: "right", minWidth: 125 },
  { key: "soDiscountAmount", label: "SO Discount", type: "amount", align: "right", minWidth: 125 },
  { key: "soVatAmount", label: "SO VAT", type: "amount", align: "right", minWidth: 115 },
  { key: "soNetAmount", label: "SO Net", type: "amount", align: "right", minWidth: 120 },
  { key: "drCount", label: "DR Count", type: "number", align: "right", minWidth: 95 },
  { key: "drNos", label: "DR No/s", minWidth: 190 },
  { key: "firstDrDate", label: "First DR", type: "date", minWidth: 105 },
  { key: "lastDrDate", label: "Last DR", type: "date", minWidth: 105 },
  { key: "drQuantity", label: "DR QUANTITY", type: "qty", align: "right", minWidth: 120 },
  { key: "undeliveredQuantity", label: "Undelivered", type: "qty", align: "right", minWidth: 120 },
  { key: "siCount", label: "SI Count", type: "number", align: "right", minWidth: 95 },
  { key: "siNos", label: "SI No/s", minWidth: 190 },
  { key: "firstSiDate", label: "First SI", type: "date", minWidth: 105 },
  { key: "lastSiDate", label: "Last SI", type: "date", minWidth: 105 },
  { key: "siQuantity", label: "SI Qty", type: "qty", align: "right", minWidth: 105 },
  { key: "uninvoicedQuantity", label: "Uninvoiced", type: "qty", align: "right", minWidth: 115 },
  { key: "siGrossAmount", label: "SI Gross", type: "amount", align: "right", minWidth: 125 },
  { key: "siDiscountAmount", label: "SI Discount", type: "amount", align: "right", minWidth: 125 },
  { key: "siVatAmount", label: "SI VAT", type: "amount", align: "right", minWidth: 115 },
  { key: "siNetAmount", label: "SI Net", type: "amount", align: "right", minWidth: 120 },
  { key: "invoiceAmount", label: "SI Amount", type: "amount", align: "right", minWidth: 130 },
  { key: "itemStatus", label: "Status", type: "status", minWidth: 150 },
];

const AGING_COLUMNS = [
  { key: "custCode", label: "Customer Code", minWidth: 130 },
  { key: "custName", label: "Customer", minWidth: 220 },
  { key: "currentAmount", label: "Current", type: "amount", align: "right", minWidth: 120 },
  { key: "days1To30", label: "1-30 Days", type: "amount", align: "right", minWidth: 120 },
  { key: "days31To60", label: "31-60 Days", type: "amount", align: "right", minWidth: 120 },
  { key: "days61To90", label: "61-90 Days", type: "amount", align: "right", minWidth: 120 },
  { key: "over90Days", label: "Over 90 Days", type: "amount", align: "right", minWidth: 130 },
  { key: "balanceAmount", label: "Total Balance", type: "amount", align: "right", minWidth: 135 },
  { key: "invoiceCount", label: "Open SI", type: "number", align: "right", minWidth: 90 },
];

const PERFORMANCE_COLUMNS = [
  { key: "groupName", label: "Group", minWidth: 220 },
  { key: "soCount", label: "SO Count", type: "number", align: "right", minWidth: 90 },
  { key: "soAmount", label: "SO Amount", type: "amount", align: "right", minWidth: 130 },
  { key: "invoiceAmount", label: "SI Amount", type: "amount", align: "right", minWidth: 130 },
  { key: "collectionAmount", label: "Collected", type: "amount", align: "right", minWidth: 130 },
  { key: "balanceAmount", label: "AR Balance", type: "amount", align: "right", minWidth: 130 },
  { key: "collectionRate", label: "Collection %", type: "percent", align: "right", minWidth: 115 },
  { key: "pendingCount", label: "Pending", type: "number", align: "right", minWidth: 95 },
  { key: "closedCount", label: "Closed", type: "number", align: "right", minWidth: 90 },
];

const COLLECTION_COLUMNS = [
  { key: "docType", label: "Doc Type", type: "docBadge", minWidth: 95 },
  { key: "docNo", label: "Doc No", minWidth: 140 },
  { key: "docDate", label: "Doc Date", type: "date", minWidth: 105 },
  { key: "siNo", label: "SI No", minWidth: 130 },
  { key: "soNo", label: "SO No", minWidth: 130 },
  { key: "custName", label: "Customer", minWidth: 210 },
  { key: "appliedAmount", label: "Applied Amount", type: "amount", align: "right", minWidth: 135 },
  { key: "balanceEffect", label: "Balance Effect", minWidth: 140 },
  { key: "remarks", label: "Remarks", minWidth: 230 },
];

const COLUMNS_BY_PAGE = {
  lifecycle: LIFECYCLE_COLUMNS,
  itemFlow: ITEM_FLOW_COLUMNS,
  aging: AGING_COLUMNS,
  performance: PERFORMANCE_COLUMNS,
  collection: COLLECTION_COLUMNS,
};

const getDefaultStartDate = () => {
  const dt = new Date();
  dt.setDate(dt.getDate() - 30);
  return dt.toISOString().slice(0, 10);
};

const getDefaultEndDate = () => new Date().toISOString().slice(0, 10);

const normalizeDate = (value) => (value ? String(value).slice(0, 10) : "");
const toNumber = (value) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatAmount = (value) => toNumber(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatCompactAmount = (value) => {
  const amount = toNumber(value);
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}B`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  if (abs >= 1_000) return `${(amount / 1_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}K`;
  return formatAmount(amount);
};
const formatPesoAmount = (value, compact = false) => `₱ ${compact ? formatCompactAmount(value) : formatAmount(value)}`;
const formatQty = (value) => toNumber(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "-");
const formatPercent = (value) => `${toNumber(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

const parseResultRows = (response) => {
  const resultStr = response?.data?.[0]?.result;
  if (!resultStr) return [];

  try {
    const parsed = JSON.parse(resultStr);
    return Array.isArray(parsed) ? parsed : parsed?.data || [];
  } catch (error) {
    console.error("Sales Query parse error:", error, resultStr);
    return [];
  }
};

const getStatusKey = (value = "") => String(value || "").toUpperCase().replace(/\s+/g, "_");

const getStatusMeta = (value = "") => {
  const status = getStatusKey(value);

  if (status.includes("CANCEL")) return { label: "Cancelled", pct: 0, cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
  if (status.includes("CLOSED") || status.includes("FULLY")) return { label: value || "Closed", pct: 100, cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  if (status.includes("OVERDUE")) return { label: value || "Overdue", pct: 80, cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" };
  if (status.includes("COLLECT")) return { label: value || "Pending Collection", pct: status.includes("PARTIAL") ? 85 : 70, cls: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" };
  if (status.includes("INVOICE")) return { label: value || "Pending Invoice", pct: status.includes("PARTIAL") ? 55 : 45, cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
  if (status.includes("DELIVER")) return { label: value || "Pending Delivery", pct: status.includes("PARTIAL") ? 30 : 10, cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" };

  return { label: value || "No Status", pct: 0, cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
};


const createEmptyPageRows = () =>
  Object.keys(PAGE_CONFIGS).reduce((acc, key) => ({ ...acc, [key]: [] }), {});

const SalesTracker = () => {
  const { currentUserRow } = useAuth();

  const defaultFilters = useMemo(() => ({
    branchCode: currentUserRow?.branchCode || currentUserRow?.BRANCH_CODE || "",
    branchName: currentUserRow?.branchName || currentUserRow?.BRANCH_NAME || "",
    custCode: "",
    custName: "",
    salesRepCode: "",
    salesRepName: "",
    dateBasis: "SO_DATE",
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    status: "",
    searchText: "",
  }), [currentUserRow]);

  const [activePage, setActivePage] = useState("lifecycle");
  const [filters, setFilters] = useState(defaultFilters);
  const [pageRows, setPageRows] = useState(() => createEmptyPageRows());
  const [loadedPages, setLoadedPages] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const [selectedSalesRow, setSelectedSalesRow] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setFilters(defaultFilters);
    setLoadedPages({});
    setPageRows(createEmptyPageRows());
    setTablePage(1);
  }, [defaultFilters]);

  const activeConfig = PAGE_CONFIGS[activePage];
  const rows = pageRows[activePage] || [];
  const columns = COLUMNS_BY_PAGE[activePage] || LIFECYCLE_COLUMNS;

  const buildPayload = useCallback((nextFilters = filters) => ({
    json_data: {
      branchCode: nextFilters.branchCode || "",
      custCode: nextFilters.custCode || "",
      salesRepCode: nextFilters.salesRepCode || "",
      dateBasis: nextFilters.dateBasis || "SO_DATE",
      startDate: normalizeDate(nextFilters.startDate),
      endDate: normalizeDate(nextFilters.endDate),
      status: nextFilters.status || "",
      searchText: nextFilters.searchText || "",
    },
  }), [filters]);

  const loadPage = useCallback(async (pageKey = activePage, nextFilters = filters) => {
    const config = PAGE_CONFIGS[pageKey];
    if (!config) return;

    setIsLoading(true);
    try {
      const response = await postRequest(config.endpoint, buildPayload(nextFilters));
      const nextRows = parseResultRows(response);
      setPageRows((prev) => ({ ...prev, [pageKey]: nextRows }));
      setLoadedPages((prev) => ({ ...prev, [pageKey]: true }));
      setTablePage(1);
    } catch (error) {
      console.error(`Sales Query load error [${pageKey}]:`, error);
      setPageRows((prev) => ({ ...prev, [pageKey]: [] }));
      setLoadedPages((prev) => ({ ...prev, [pageKey]: true }));
    } finally {
      setIsLoading(false);
    }
  }, [activePage, buildPayload, filters]);

  const handleNavSelect = (pageKey) => {
    setActivePage(pageKey);
    setTablePage(1);
  };

  const applyFilters = () => {
    setLoadedPages({});
    loadPage(activePage, filters);
  };

  const resetFilters = () => {
    const next = { ...defaultFilters };
    setFilters(next);
    setLoadedPages({});
    setPageRows(createEmptyPageRows());
    setTablePage(1);
  };

  const handleViewDetails = (row) => {
    const soNo = row?.soNo || row?.parentSoNo;
    if (!soNo) return;
    setSelectedSalesRow(row);
    setShowDetailsModal(true);
  };

  const handleOpenSource = (row) => {
    const docNo = row?.soNo || row?.docNo;
    const branchCode = row?.branchCode || filters.branchCode || "";
    if (!docNo || !branchCode) return;

    const url = `${window.location.origin}/page/SO?soNo=${encodeURIComponent(docNo)}&branchCode=${encodeURIComponent(branchCode)}&viewDocument=true`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const dashboardRows = pageRows.lifecycle || [];
  const metrics = useMemo(() => buildMetrics(activePage, rows, dashboardRows), [activePage, rows, dashboardRows]);
  const lifecycleSummary = useMemo(() => buildLifecycleSummary(dashboardRows), [dashboardRows]);
  const arSummary = useMemo(() => buildArSummary(dashboardRows), [dashboardRows]);
  const filteredRows = useMemo(() => filterRowsForSearch(rows, filters.searchText), [rows, filters.searchText]);
  const pagedRows = useMemo(() => {
    const start = (tablePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageSize, tablePage]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const activeContext = useMemo(() => {
    const pieces = [];
    if (filters.branchCode) pieces.push(`Branch: ${filters.branchCode}${filters.branchName ? ` - ${filters.branchName}` : ""}`);
    if (filters.custCode) pieces.push(`Customer: ${filters.custCode}${filters.custName ? ` - ${filters.custName}` : ""}`);
    if (filters.salesRepCode) pieces.push(`Salesman: ${filters.salesRepCode}${filters.salesRepName ? ` - ${filters.salesRepName}` : ""}`);
    pieces.push(`${DATE_BASIS_OPTIONS.find((x) => x.value === filters.dateBasis)?.label || "SO Date"}: ${normalizeDate(filters.startDate)} to ${normalizeDate(filters.endDate)}`);
    if (filters.status) pieces.push(`Status: ${SALES_STATUS_OPTIONS.find((x) => x.value === filters.status)?.label || filters.status}`);
    return pieces.join(" | ");
  }, [filters]);

  const exportCsv = () => {
    const filename = `${activeConfig.title.replace(/\s+/g, "_")}_${normalizeDate(new Date().toISOString())}.csv`;
    downloadCsv(filename, columns, filteredRows);
  };

  return (
    <div className="global-ref-main-div-ui bg-slate-50/70">
      <style>{`
        @keyframes salesSoftRise {
          from { opacity: 0; transform: translate3d(0, 10px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes salesBarFill {
          from { width: 0%; }
          to { width: var(--sales-percent); }
        }
        @keyframes salesDonutBreathe {
          0%, 100% { transform: scale(1); box-shadow: 0 14px 32px -24px rgba(37, 99, 235, 0.5); }
          50% { transform: scale(1.025); box-shadow: 0 18px 38px -22px rgba(37, 99, 235, 0.65); }
        }
        @keyframes salesIconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .sales-soft-rise {
          animation: salesSoftRise 360ms ease-out both;
        }
        .sales-summary-card {
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease;
        }
        .sales-summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px -22px rgba(15, 23, 42, 0.45);
          border-color: rgba(147, 197, 253, 0.9);
          background-color: rgba(248, 250, 252, 0.9);
        }
        .sales-summary-card:hover .sales-summary-icon {
          animation: salesIconFloat 900ms ease-in-out infinite;
        }
        .sales-summary-bar {
          animation: salesBarFill 650ms ease-out both;
        }
        .sales-donut-breathe {
          animation: salesDonutBreathe 3.2s ease-in-out infinite;
        }
      `}</style>
      {isLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between lg:min-h-[40px]">
          <div className="min-w-0">
            <h1 className="global-ref-headertext-ui truncate text-center md:text-left">Sales Query</h1>
            <p className="mt-1 hidden text-xs text-slate-500 md:block">Modern sales analysis from Sales Order to Collection</p>
          </div>

          <div className="flex w-full flex-nowrap items-center justify-center gap-2 md:w-auto md:justify-end">
            <HeaderButton icon={faBars} title="Reports" className="lg:hidden" onClick={() => setHideNav((value) => !value)} />
            <HeaderButton icon={faMagnifyingGlass} label="Load" onClick={applyFilters} disabled={isLoading} />
            <HeaderButton icon={faRotateLeft} label="Reset" onClick={resetFilters} disabled={isLoading} />
            <HeaderButton icon={faDownload} label="Export" onClick={exportCsv} disabled={!filteredRows.length} />
            <HeaderButton
              icon={hideNav ? faChevronRight : faChevronLeft}
              label={hideNav ? "Expand Nav" : "Collapse Nav"}
              className="hidden lg:inline-flex"
              labelClassName="hidden xl:inline"
              onClick={() => setHideNav((value) => !value)}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 mt-[8.25rem] px-0 sm:mt-[6.25rem]">
        <div className="flex gap-4">
          <aside className={`hidden transition-all duration-200 lg:block ${hideNav ? "w-[88px]" : "w-[290px]"}`}>
            <div className="global-tran-tab-div-ui h-full !m-0 !p-4">
              <div className="h-full overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b px-4 py-4">
                  {hideNav ? (
                    <div className="text-center text-[11px] font-semibold text-blue-700">SAL</div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-gray-800">Sales Query</div>
                      <div className="mt-1 text-xs text-gray-500">Select a sales report, set filters, then load data.</div>
                    </>
                  )}
                </div>
                <div className="p-3">
                  <SalesQueryNav activePage={activePage} collapsed={hideNav} onSelect={handleNavSelect} />
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1 space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-white px-4 py-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                        <FontAwesomeIcon icon={activeConfig.icon} />
                      </span>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900">{activeConfig.title}</h2>
                        <p className="text-xs text-slate-500">{activeConfig.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-700 shadow-sm">
                    {activeContext}
                  </div>
                </div>
              </div>

              <FilterPanel filters={filters} setFilters={setFilters} setLookup={setLookup} onApply={applyFilters} onReset={resetFilters} />
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
              {metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
            </section>

            {activePage === "lifecycle" && (
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
                <LifecycleStatusSummary items={lifecycleSummary} />
                <ArBalanceSummary summary={arSummary} />
              </section>
            )}

            {activePage !== "lifecycle" && <AnalysisSummary activePage={activePage} rows={filteredRows} />}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-800">{activeConfig.title} Records</div>
                  <div className="text-[11px] text-slate-500">Showing {getShownRange(activePage, tablePage, pageSize, filteredRows.length)} of {filteredRows.length} entries</div>
                </div>
                {activePage === "lifecycle" && (
                  <div className="flex items-center gap-2">
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setTablePage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400">
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>
                )}
              </div>

              <ReportGrid
                columns={columns}
                rows={filteredRows}
                pagedRows={pagedRows}
                activePage={activePage}
                activeTitle={activeConfig.title}
                hasLoaded={!!loadedPages[activePage]}
                isLoading={isLoading}
                emptyMessage={activeConfig.empty}
                onViewDetails={handleViewDetails}
                onOpenSource={handleOpenSource}
              />

              {activePage === "lifecycle" && <Pagination page={tablePage} totalPages={totalPages} onPageChange={setTablePage} />}
            </section>
          </main>
        </div>
      </div>

      {showDetailsModal && (
        <SalesTrackerDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          selectedRow={selectedSalesRow}
          filters={filters}
        />
      )}

      {lookup === "branch" && (
        <SearchBranchRef
          isOpen
          onClose={() => setLookup(null)}
          onSelect={(row) => {
            setFilters((prev) => ({ ...prev, branchCode: row?.branchCode || row?.BRANCH_CODE || "", branchName: row?.branchName || row?.BRANCH_NAME || "" }));
            setLookup(null);
          }}
        />
      )}

      {lookup === "customer" && (
        <SearchCustMast
          isOpen
          onClose={() => setLookup(null)}
          onSelect={(row) => {
            setFilters((prev) => ({ ...prev, custCode: row?.custCode || row?.CUST_CODE || "", custName: row?.custName || row?.CUST_NAME || "" }));
            setLookup(null);
          }}
        />
      )}

      {lookup === "salesman" && (
        <SearchSalesRepRef
          isOpen
          onClose={() => setLookup(null)}
          onSelect={(row) => {
            setFilters((prev) => ({ ...prev, salesRepCode: row?.salesRepCode || row?.SALESREP_CODE || "", salesRepName: row?.salesRepName || row?.SALESREP_NAME || "" }));
            setLookup(null);
          }}
        />
      )}
    </div>
  );
};

const HeaderButton = ({ icon, label, title, onClick, disabled = false, className = "", labelClassName = "hidden lg:inline" }) => (
  <button
    type="button"
    title={title || label}
    onClick={onClick}
    disabled={disabled}
    className={`shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    <FontAwesomeIcon icon={icon} />
    {label ? <span className={`ml-2 ${labelClassName}`}>{label}</span> : null}
  </button>
);

const SalesQueryNav = ({ activePage, collapsed, onSelect }) => (
  <ul className="w-full space-y-2 text-sm">
    {NAV_ITEMS.map((item) => (
      <li key={item.key} className="w-full">
        <button
          type="button"
          onClick={() => onSelect(item.key)}
          title={collapsed ? item.label : undefined}
          className={`w-full rounded-xl border text-left transition ${
            activePage === item.key
              ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          } ${collapsed ? "flex justify-center px-2 py-3" : "flex items-center gap-3 px-3 py-2.5"}`}
        >
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activePage === item.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
            <FontAwesomeIcon icon={item.icon} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{item.label}</span>
              <span className="mt-0.5 block truncate text-[10px] opacity-70">{item.description}</span>
            </span>
          )}
        </button>
      </li>
    ))}
  </ul>
);

const FilterPanel = ({ filters, setFilters, setLookup, onApply, onReset }) => {
  const setField = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="border-t border-blue-50 bg-gradient-to-b from-white to-slate-50/70 px-4 py-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <FilterGroupCard
          title="Customer / Scope"
          subtitle="Branch, customer, and salesman"
          icon={faLayerGroup}
          className="xl:col-span-5"
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <CompactLookup label="Branch" code={filters.branchCode} name={filters.branchName || "All Branches"} onLookup={() => setLookup("branch")} onClear={() => setFilters((prev) => ({ ...prev, branchCode: "", branchName: "" }))} />
            <CompactLookup label="Customer" code={filters.custCode} name={filters.custName || "All Customers"} onLookup={() => setLookup("customer")} onClear={() => setFilters((prev) => ({ ...prev, custCode: "", custName: "" }))} />
            <CompactLookup label="Salesman" code={filters.salesRepCode} name={filters.salesRepName || "All Salesmen"} onLookup={() => setLookup("salesman")} onClear={() => setFilters((prev) => ({ ...prev, salesRepCode: "", salesRepName: "" }))} />
          </div>
        </FilterGroupCard>

        <FilterGroupCard
          title="Date Coverage"
          subtitle="Choose the date basis and range"
          icon={faClock}
          className="xl:col-span-3"
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-1">
            <SelectInput label="Date Basis" value={filters.dateBasis} onChange={(value) => setField("dateBasis", value)} options={DATE_BASIS_OPTIONS} />
            <TextInput label="Date From" type="date" value={filters.startDate || ""} onChange={(value) => setField("startDate", value)} />
            <TextInput label="Date To" type="date" value={filters.endDate || ""} onChange={(value) => setField("endDate", value)} />
          </div>
        </FilterGroupCard>

        <FilterGroupCard
          title="Document Filter"
          subtitle="Status and document number search"
          icon={faFilter}
          className="xl:col-span-4"
          actions={(
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={onApply} className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-bold text-white shadow-sm hover:bg-blue-700">
                <FontAwesomeIcon icon={faMagnifyingGlass} /> Apply
              </button>
              <button type="button" onClick={onReset} className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                <FontAwesomeIcon icon={faUndo} /> Reset
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[220px_minmax(0,1fr)]">
            <SelectInput label="Lifecycle Status" value={filters.status || ""} onChange={(value) => setField("status", value)} options={SALES_STATUS_OPTIONS} />
            <TextInput label="Search Any Document No" placeholder="SO / DR / SI / AR / CR / ARCM / ARDM no..." value={filters.searchText || ""} onChange={(value) => setField("searchText", value)} />
          </div>
        </FilterGroupCard>
      </div>
    </div>
  );
};

const FilterGroupCard = ({ title, subtitle, icon, actions, className = "", children }) => (
  <div className={`flex min-h-[142px] flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
    <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <FontAwesomeIcon icon={icon} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-extrabold uppercase tracking-wide text-blue-700">{title}</div>
          <div className="truncate text-[10px] font-medium text-slate-500">{subtitle}</div>
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const CompactLookup = ({ label, code, name, onLookup, onClear }) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold text-slate-600">{label}</label>
    <div className="flex h-[32px] overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50">
      <button type="button" onClick={onLookup} className="min-w-0 flex-1 px-3 text-left text-xs font-semibold text-slate-700">
        <span className="block truncate">{code ? `${code} - ${name || ""}` : name}</span>
      </button>
      {code && (
        <button type="button" onClick={onClear} className="w-8 border-l border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      )}
      <button type="button" onClick={onLookup} className="w-9 border-l border-slate-100 text-blue-600 hover:bg-blue-50">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </button>
    </div>
  </div>
);

const TextInput = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold text-slate-600">{label}</label>
    <input
      type={type}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-[32px] w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
    />
  </div>
);

const SelectInput = ({ label, value, onChange, options = [] }) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold text-slate-600">{label}</label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-[32px] w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);

const MetricCard = ({ metric }) => {
  const toneClass = {
    blue: { card: "border-blue-100 border-t-blue-600", icon: "bg-blue-50 text-blue-700", label: "text-blue-700" },
    green: { card: "border-emerald-100 border-t-emerald-500", icon: "bg-emerald-50 text-emerald-700", label: "text-emerald-700" },
    purple: { card: "border-violet-100 border-t-violet-500", icon: "bg-violet-50 text-violet-700", label: "text-violet-700" },
    orange: { card: "border-orange-100 border-t-orange-500", icon: "bg-orange-50 text-orange-700", label: "text-orange-700" },
    red: { card: "border-red-100 border-t-red-500", icon: "bg-red-50 text-red-700", label: "text-red-700" },
    slate: { card: "border-slate-100 border-t-slate-500", icon: "bg-slate-100 text-slate-700", label: "text-slate-700" },
  }[metric.tone] || { card: "border-blue-100 border-t-blue-600", icon: "bg-blue-50 text-blue-700", label: "text-blue-700" };

  return (
    <div className={`flex min-h-[82px] min-w-0 flex-col justify-between rounded-lg border border-t-2 bg-white px-3 py-2 shadow-sm ${toneClass.card}`} title={metric.fullDisplay || metric.display}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${toneClass.icon}`}>
          <FontAwesomeIcon icon={metric.icon} />
        </div>
        <div className={`min-w-0 truncate text-right text-[10px] font-bold uppercase ${toneClass.label}`} title={metric.label}>
          {metric.label}
        </div>
      </div>
      <div className="truncate text-right text-[16px] font-extrabold tabular-nums text-gray-900">
        {metric.display}
      </div>
      <div className="truncate text-right text-[10px] font-medium text-slate-500">
        {metric.sub}
      </div>
    </div>
  );
};

const LifecycleStatusSummary = ({ items }) => {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const gradient = buildDonutGradient(items, total);
  const toneMap = {
    "bg-blue-500": "bg-blue-500 from-blue-500 to-blue-600",
    "bg-amber-500": "bg-amber-500 from-amber-500 to-orange-500",
    "bg-violet-500": "bg-violet-500 from-violet-500 to-purple-600",
    "bg-red-500": "bg-red-500 from-red-500 to-rose-600",
    "bg-emerald-500": "bg-emerald-500 from-emerald-500 to-teal-600",
  };

  return (
    <div className="sales-soft-rise rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {items.map((item, index) => {
            const percentValue = Number(item.percent || 0);
            const toneClass = toneMap[item.dot] || "bg-blue-500 from-blue-500 to-blue-600";

            return (
              <div
                key={item.key}
                className="sales-summary-card sales-soft-rise overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`sales-summary-icon flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${toneClass} text-white shadow-sm`}>
                    <FontAwesomeIcon icon={item.icon} />
                  </span>
                  <span className="text-right text-[11px] font-bold tabular-nums text-slate-500">{item.percent}%</span>
                </div>

                <div className="mt-3 text-xs font-bold text-slate-700">{item.label}</div>
                <div className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">{item.count}</div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`sales-summary-bar h-full rounded-full bg-gradient-to-r ${toneClass}`}
                    style={{
                      "--sales-percent": `${Math.max(0, Math.min(100, percentValue))}%`,
                      width: `${Math.max(0, Math.min(100, percentValue))}%`,
                      animationDelay: `${180 + index * 90}ms`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex w-full justify-center lg:w-[180px]">
          <div className="sales-soft-rise relative flex h-32 w-32 items-center justify-center" style={{ animationDelay: "380ms" }}>
            <div className="sales-donut-breathe absolute inset-0 rounded-full bg-slate-100" />
            <div className="absolute inset-2 rounded-full transition-transform duration-300" style={{ background: gradient }} />
            <div className="relative flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white shadow-inner">
              <span className="text-xl font-extrabold tabular-nums text-slate-900">{total}</span>
              <span className="text-[10px] font-semibold text-slate-500">Total SO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArBalanceSummary = ({ summary }) => (
  <div className="sales-soft-rise rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="text-sm font-extrabold text-slate-800">AR Balance Summary</div>
    <div className="mt-4 space-y-3 text-xs">
      <BalanceLine label="Total AR Balance" value={summary.balanceAmount} />
      <BalanceLine label="Overdue Balance" value={summary.overdueAmount} danger />
      <BalanceLine label="Current Balance" value={summary.currentAmount} success />
    </div>
  </div>
);

const BalanceLine = ({ label, value, danger, success }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
    <span className="font-semibold text-slate-500">{label}</span>
    <span className={`font-extrabold tabular-nums ${danger ? "text-red-600" : success ? "text-emerald-600" : "text-slate-900"}`}>{formatPesoAmount(value)}</span>
  </div>
);

const AnalysisSummary = ({ activePage, rows }) => {
  const title = {
    itemFlow: "Item fulfillment is quantity-based. Ordered, delivered, and invoiced quantities are compared per item.",
    aging: "Aging is based on SI due date and remaining balance.",
    performance: "Performance summarizes SO amount, SI amount, collection, and balance by group.",
    collection: "Collection analysis includes CR/AR collections, ARCM, and ARDM applications.",
  }[activePage];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-bold text-slate-700">{title}</div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{rows.length} records loaded</div>
      </div>
    </div>
  );
};

const ReportGrid = ({ columns, rows, pagedRows, activePage, activeTitle, hasLoaded, isLoading, emptyMessage, onViewDetails, onOpenSource }) => {
  if (activePage === "lifecycle") {
    return (
      <ModernDataTable
        columns={columns}
        rows={pagedRows}
        activePage={activePage}
        hasLoaded={hasLoaded}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onViewDetails={onViewDetails}
        onOpenSource={onOpenSource}
      />
    );
  }

  if (!hasLoaded && isLoading) return <EmptyState title="Loading records" description="Please wait while Sales Query loads the data." />;
  if (!hasLoaded) return <EmptyState title="Ready to load" description="Set your filters, then click Load to retrieve records." />;
  if (!rows.length) return <EmptyState title="No records found" description={emptyMessage || "Try changing the filter criteria."} />;

  const globalRows = rows.map((row, index) => ({ rowNo: index + 1, ...row }));
  const globalColumns = toGlobalColumns(columns);

  return (
    <div className="min-h-[340px]" style={{ height: `${getTableHeight(globalRows.length)}px` }}>
      <SearchGlobalReportTable
        columns={globalColumns}
        data={globalRows}
        itemsPerPage={50}
        docType={activeTitle}
        totalExemptions={["rowNo", "soNo", "soDate", "custCode", "custName", "salesRepCode", "salesRepName", "custPoNo", "groupId", "itemCode", "itemDescription", "itemSpecs", "uom", "drNos", "siNos", "itemStatus", "docType", "docNo", "siNo", "balanceEffect", "remarks"]}
      />
    </div>
  );
};

const toGlobalColumns = (columns = []) => [
  { key: "rowNo", label: "Row No.", minWidth: 90, maxWidth: 110 },
  ...columns
    .filter((column) => column.key !== "flow")
    .map((column) => ({
      key: column.key,
      label: column.label,
      minWidth: column.minWidth,
      maxWidth: column.maxWidth,
      renderType: column.type === "amount" ? "currency" : column.type === "date" ? "date" : column.type === "qty" || column.type === "number" || column.type === "percent" ? "number" : undefined,
      roundingOff: column.type === "qty" ? 4 : column.type === "amount" || column.type === "percent" ? 2 : undefined,
    })),
];

const getTableHeight = (rowCount) => Math.min(620, Math.max(340, 170 + Math.min(rowCount, 25) * 32));

const getShownRange = (activePage, page, pageSize, totalRows) => {
  if (!totalRows) return "0 to 0";
  if (activePage !== "lifecycle") return `1 to ${totalRows.toLocaleString("en-US")}`;
  const start = ((page - 1) * pageSize) + 1;
  const end = Math.min(page * pageSize, totalRows);
  return `${start.toLocaleString("en-US")} to ${end.toLocaleString("en-US")}`;
};

const ModernDataTable = ({ columns, rows, activePage, hasLoaded, isLoading, emptyMessage, onViewDetails, onOpenSource }) => {
  if (!hasLoaded && isLoading) return <EmptyState title="Loading records" description="Please wait while Sales Query loads the data." />;
  if (!hasLoaded) return <EmptyState title="Ready to load" description="Set your filters, then click Load to retrieve records." />;
  if (!rows.length) return <EmptyState title="No records found" description={emptyMessage || "Try changing the filter criteria."} />;

  return (
    <div className="relative overflow-hidden rounded-b-2xl bg-white">
      <div className="max-h-[66vh] overflow-auto sales-lifecycle-grid-scroll">
        <table className="w-full min-w-[1620px] border-separate border-spacing-0 text-[11px]">
          <thead className="sticky top-0 z-30 bg-blue-100 shadow-sm">
            <tr>
              {columns.map((column) => {
                const sticky = getLifecycleStickyStyle(column.key);
                return (
                  <th
                    key={column.key}
                    style={{ minWidth: column.minWidth || 110, width: column.minWidth || 110, ...sticky.style }}
                    className={`border-b border-blue-200 bg-blue-100 px-2 py-1.5 text-[11px] font-bold text-blue-900 ${column.align === "right" ? "text-right" : "text-left"} ${sticky.headerClassName || ""}`}
                  >
                    <div className="truncate overflow-hidden whitespace-nowrap" title={column.label}>{column.label}</div>
                  </th>
                );
              })}
              {activePage === "lifecycle" && (
                <th
                  style={{ width: LIFECYCLE_ACTION_WIDTH, minWidth: LIFECYCLE_ACTION_WIDTH, maxWidth: LIFECYCLE_ACTION_WIDTH }}
                  className="sticky right-0 z-50 border-b border-l border-blue-200 bg-blue-100 px-2 py-1.5 text-center text-[11px] font-bold text-blue-900 shadow-[-10px_0_18px_-15px_rgba(15,23,42,0.95)]"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row, rowIndex) => {
              const rowTone = getLifecycleRowTone(row?.currentStatus);
              const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40";
              const stickyBg = rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50";
              return (
                <tr key={`${row.soId || row.soNo || row.docNo || rowIndex}-${rowIndex}`} className={`group border-b border-slate-100 transition-colors ${rowBg} hover:bg-blue-50`}>
                  {columns.map((column, columnIndex) => {
                    const sticky = getLifecycleStickyStyle(column.key);
                    return (
                      <td
                        key={column.key}
                        style={{ minWidth: column.minWidth || 110, width: column.minWidth || 110, ...sticky.style }}
                        className={`border-b border-slate-100 px-1.5 py-1 text-[11px] leading-tight whitespace-nowrap align-middle ${columnIndex === 0 ? `border-l-4 ${rowTone.border}` : "border-l border-slate-100/70"} ${column.align === "right" ? "text-right tabular-nums" : "text-left"} ${sticky.className} ${sticky.isSticky ? `${stickyBg} group-hover:bg-blue-50` : ""}`}
                      >
                        <CellRenderer column={column} row={row} onViewDetails={onViewDetails} />
                      </td>
                    );
                  })}
                  {activePage === "lifecycle" && (
                    <td
                      style={{ width: LIFECYCLE_ACTION_WIDTH, minWidth: LIFECYCLE_ACTION_WIDTH, maxWidth: LIFECYCLE_ACTION_WIDTH }}
                      className={`sticky right-0 z-30 border-b border-l border-slate-200 px-1.5 py-1 text-center shadow-[-10px_0_18px_-15px_rgba(15,23,42,0.95)] ${stickyBg} group-hover:bg-blue-50`}
                    >
                      <div className="flex h-6 items-center justify-center gap-1">
                        <ActionIconButton title="View document flow" icon={faEye} onClick={() => onViewDetails(row)} tone="primary" />
                        <ActionIconButton title="Open Sales Order" icon={faArrowUpRightFromSquare} onClick={() => onOpenSource(row)} tone="secondary" />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getLifecycleStickyStyle = (key) => {
  if (key === "currentStatus") {
    return {
      isSticky: true,
      style: {
        right: LIFECYCLE_STICKY_RIGHT.currentStatus,
        width: LIFECYCLE_STATUS_WIDTH,
        minWidth: LIFECYCLE_STATUS_WIDTH,
        maxWidth: LIFECYCLE_STATUS_WIDTH,
      },
      headerClassName: "sticky z-40 border-l border-blue-200 bg-blue-100 shadow-[-10px_0_18px_-15px_rgba(15,23,42,0.95)]",
      className: "sticky z-20 border-l border-slate-200 shadow-[-10px_0_18px_-15px_rgba(15,23,42,0.95)]",
    };
  }

  if (key === "flow") {
    return {
      isSticky: true,
      style: {
        right: LIFECYCLE_STICKY_RIGHT.flow,
        width: LIFECYCLE_FLOW_WIDTH,
        minWidth: LIFECYCLE_FLOW_WIDTH,
        maxWidth: LIFECYCLE_FLOW_WIDTH,
      },
      headerClassName: "sticky z-40 border-l border-blue-200 bg-blue-100",
      className: "sticky z-20 border-l border-slate-200",
    };
  }

  return { isSticky: false, style: {}, className: "", headerClassName: "" };
};

const ActionIconButton = ({ title, icon, onClick, tone = "secondary" }) => {
  const cls = tone === "primary"
    ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-[22px] min-h-[22px] w-[22px] items-center justify-center rounded border text-[9px] shadow-sm transition ${cls}`}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
};

const getLifecycleRowTone = (status) => {
  const key = getStatusKey(status);
  if (key.includes("CANCEL")) return { border: "border-l-slate-300" };
  if (key.includes("CLOSED") || key.includes("FULLY")) return { border: "border-l-emerald-400" };
  if (key.includes("OVERDUE")) return { border: "border-l-red-400" };
  if (key.includes("COLLECT")) return { border: "border-l-violet-400" };
  if (key.includes("INVOICE")) return { border: "border-l-amber-400" };
  if (key.includes("DELIVER")) return { border: "border-l-blue-400" };
  return { border: "border-l-slate-300" };
};

const CellRenderer = ({ column, row, onViewDetails }) => {
  const value = row?.[column.key];

  if (column.type === "link") {
    return (
      <button type="button" onClick={() => onViewDetails(row)} className="inline-flex max-w-[130px] truncate rounded bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold text-blue-700 transition hover:bg-blue-100 hover:text-blue-800">
        {value || "-"}
      </button>
    );
  }

  if (column.type === "date") return <span className="font-semibold text-slate-600">{formatDate(value)}</span>;
  if (column.type === "amount") return <span className="font-bold tabular-nums text-slate-800">{formatPesoAmount(value)}</span>;
  if (column.type === "qty") return <span className="font-bold tabular-nums text-slate-800">{formatQty(value)}</span>;
  if (column.type === "number") return <span className="font-bold tabular-nums text-slate-800">{toNumber(value).toLocaleString()}</span>;
  if (column.type === "percent") return <span className="font-bold tabular-nums text-slate-800">{formatPercent(value)}</span>;
  if (column.type === "status") return <StatusBadge value={value} />;
  if (column.type === "flow") return <FlowProgress status={row?.currentStatus || row?.itemStatus} />;
  if (column.type === "docBadge") return <DocTypeBadge value={value} />;

  return <span className="font-medium text-slate-700">{value ?? ""}</span>;
};

const StatusBadge = ({ value }) => {
  const meta = getStatusMeta(value);
  return (
    <span className={`inline-flex max-w-[150px] items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${meta.cls}`} title={meta.label}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      <span className="truncate">{meta.label}</span>
    </span>
  );
};

const DocTypeBadge = ({ value }) => {
  const type = String(value || "").toUpperCase();
  const cls = type === "ARDM"
    ? "border-orange-200 bg-orange-50 text-orange-700"
    : type === "ARCM"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${cls}`}>{type || "DOC"}</span>;
};

const FlowProgress = ({ status }) => {
  const meta = getStatusMeta(status);
  const stages = ["SO", "DR", "SI", "AR", "CR"];
  const activeIndex = Math.min(stages.length - 1, Math.max(0, Math.round((meta.pct / 100) * (stages.length - 1))));

  return (
    <div className="min-w-[145px] max-w-[160px]">
      <div className="flex items-center gap-1">
        {stages.map((stage, index) => (
          <React.Fragment key={stage}>
            <span title={stage} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ring-2 ring-white ${index <= activeIndex ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
              {stage[0]}
            </span>
            {index < stages.length - 1 && <span className={`h-0.5 flex-1 rounded-full ${index < activeIndex ? "bg-blue-500" : "bg-slate-200"}`} />}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[8px] font-bold text-slate-400">
        {stages.map((stage) => <span key={stage}>{stage}</span>)}
      </div>
    </div>
  );
};

const Pagination = ({ page, totalPages, onPageChange }) => {
  const pages = buildPageButtons(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
      <div className="flex items-center justify-end gap-1">
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Prev</button>
        {pages.map((pageNo, index) => pageNo === "..." ? (
          <span key={`dots-${index}`} className="px-2 text-xs text-slate-400">...</span>
        ) : (
          <button key={pageNo} type="button" onClick={() => onPageChange(pageNo)} className={`h-8 min-w-8 rounded-lg border px-3 text-xs font-bold ${page === pageNo ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{pageNo}</button>
        ))}
        <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
};

const EmptyState = ({ title, description }) => (
  <div className="flex min-h-[280px] flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50 text-blue-600">
      <FontAwesomeIcon icon={faMagnifyingGlass} />
    </div>
    <div className="mt-3 text-sm font-extrabold text-slate-700">{title}</div>
    <div className="mt-1 text-xs text-slate-500">{description}</div>
  </div>
);

const buildMetrics = (activePage, rows, lifecycleRows) => {
  const source = activePage === "lifecycle" ? rows : lifecycleRows;
  const sum = (list, key) => list.reduce((total, row) => total + toNumber(row?.[key]), 0);

  if (activePage === "itemFlow") {
    return [
      { key: "items", label: "Total Items", display: rows.length.toLocaleString(), sub: "SO item rows", icon: faLayerGroup, tone: "blue" },
      { key: "soQty", label: "SO Quantity", display: formatQty(sum(rows, "soQuantity")), sub: "Ordered quantity", icon: faProjectDiagram, tone: "green" },
      { key: "drQty", label: "Delivered Quantity", display: formatQty(sum(rows, "drQuantity")), sub: "DR quantity only", icon: faTruck, tone: "purple" },
      { key: "siQty", label: "Invoiced Quantity", display: formatQty(sum(rows, "siQuantity")), sub: "SI quantity", icon: faFileInvoiceDollar, tone: "orange" },
      { key: "undelivered", label: "Undelivered Qty", display: formatQty(sum(rows, "undeliveredQuantity")), sub: "SO less DR", icon: faClock, tone: "red" },
      { key: "uninvoiced", label: "Uninvoiced Qty", display: formatQty(sum(rows, "uninvoicedQuantity")), sub: "DR less SI", icon: faReceipt, tone: "slate" },
      { key: "invoiceAmt", label: "SI Amount", display: formatPesoAmount(sum(rows, "invoiceAmount"), true), sub: "Item invoices", icon: faPesoSign, tone: "blue" },
      { key: "record", label: "Records", display: rows.length.toLocaleString(), sub: "Loaded rows", icon: faLayerGroup, tone: "slate" },
    ];
  }

  if (activePage === "aging") {
    return [
      { key: "balance", label: "Total AR Balance", display: formatPesoAmount(sum(rows, "balanceAmount"), true), sub: "Open receivables", icon: faPesoSign, tone: "blue" },
      { key: "current", label: "Current", display: formatPesoAmount(sum(rows, "currentAmount"), true), sub: "Not overdue", icon: faClock, tone: "green" },
      { key: "d30", label: "1-30 Days", display: formatPesoAmount(sum(rows, "days1To30"), true), sub: "Overdue bucket", icon: faClock, tone: "orange" },
      { key: "d60", label: "31-60 Days", display: formatPesoAmount(sum(rows, "days31To60"), true), sub: "Overdue bucket", icon: faClock, tone: "orange" },
      { key: "d90", label: "61-90 Days", display: formatPesoAmount(sum(rows, "days61To90"), true), sub: "Overdue bucket", icon: faClock, tone: "red" },
      { key: "over90", label: "Over 90 Days", display: formatPesoAmount(sum(rows, "over90Days"), true), sub: "Critical overdue", icon: faClock, tone: "red" },
      { key: "invoiceCount", label: "Open SI", display: sum(rows, "invoiceCount").toLocaleString(), sub: "Open invoices", icon: faFileInvoiceDollar, tone: "purple" },
      { key: "customerCount", label: "Customers", display: rows.length.toLocaleString(), sub: "With balance", icon: faLayerGroup, tone: "slate" },
    ];
  }

  if (activePage === "collection") {
    return [
      { key: "cr", label: "Collections", display: formatPesoAmount(sum(rows.filter((r) => ["AR", "CR"].includes(String(r.docType).toUpperCase())), "appliedAmount"), true), sub: "AR / CR", icon: faReceipt, tone: "green" },
      { key: "cm", label: "Credit Memo", display: formatPesoAmount(sum(rows.filter((r) => String(r.docType).toUpperCase() === "ARCM"), "appliedAmount"), true), sub: "ARCM", icon: faUndo, tone: "purple" },
      { key: "dm", label: "Debit Memo", display: formatPesoAmount(sum(rows.filter((r) => String(r.docType).toUpperCase() === "ARDM"), "appliedAmount"), true), sub: "ARDM", icon: faFileInvoiceDollar, tone: "orange" },
      { key: "net", label: "Net Effect", display: formatPesoAmount(sum(rows, "netCollectionAmount"), true), sub: "Less/add balance", icon: faMoneyBillWave, tone: "blue" },
      { key: "records", label: "Transactions", display: rows.length.toLocaleString(), sub: "Loaded documents", icon: faLayerGroup, tone: "slate" },
      { key: "balance", label: "AR Balance", display: formatPesoAmount(sum(source, "balanceAmount"), true), sub: "Lifecycle balance", icon: faChartLine, tone: "red" },
      { key: "invoice", label: "SI Amount", display: formatPesoAmount(sum(source, "invoiceAmount"), true), sub: "From lifecycle", icon: faFileInvoiceDollar, tone: "purple" },
      { key: "so", label: "SO Amount", display: formatPesoAmount(sum(source, "soAmount"), true), sub: "From lifecycle", icon: faPesoSign, tone: "blue" },
    ];
  }

  if (activePage === "performance") {
    return [
      { key: "so", label: "SO Amount", display: formatPesoAmount(sum(rows, "soAmount"), true), sub: "Total booked", icon: faPesoSign, tone: "blue" },
      { key: "si", label: "SI Amount", display: formatPesoAmount(sum(rows, "invoiceAmount"), true), sub: "Total invoiced", icon: faFileInvoiceDollar, tone: "purple" },
      { key: "collection", label: "Collected", display: formatPesoAmount(sum(rows, "collectionAmount"), true), sub: "Total collected", icon: faMoneyBillWave, tone: "green" },
      { key: "balance", label: "AR Balance", display: formatPesoAmount(sum(rows, "balanceAmount"), true), sub: "Remaining", icon: faChartLine, tone: "red" },
      { key: "count", label: "SO Count", display: sum(rows, "soCount").toLocaleString(), sub: "Transactions", icon: faProjectDiagram, tone: "blue" },
      { key: "pending", label: "Pending", display: sum(rows, "pendingCount").toLocaleString(), sub: "Open lifecycle", icon: faClock, tone: "orange" },
      { key: "closed", label: "Closed", display: sum(rows, "closedCount").toLocaleString(), sub: "Closed SO", icon: faReceipt, tone: "green" },
      { key: "groups", label: "Groups", display: rows.length.toLocaleString(), sub: "Analysis rows", icon: faLayerGroup, tone: "slate" },
    ];
  }

  return [
    { key: "so", label: "SO Amount", display: formatPesoAmount(sum(rows, "soAmount"), true), sub: `${rows.length.toLocaleString()} SO`, icon: faPesoSign, tone: "blue" },
    { key: "soQty", label: "SO Qty", display: formatQty(sum(rows, "soQuantity")), sub: "Ordered quantity", icon: faProjectDiagram, tone: "green" },
    { key: "drQty", label: "DR QUANTITY", display: formatQty(sum(rows, "drQuantity")), sub: "Delivered quantity", icon: faTruck, tone: "purple" },
    { key: "si", label: "SI Amount", display: formatPesoAmount(sum(rows, "invoiceAmount"), true), sub: `${sum(rows, "siCount").toLocaleString()} SI`, icon: faFileInvoiceDollar, tone: "blue" },
    { key: "collection", label: "Collected Amount", display: formatPesoAmount(sum(rows, "collectionAmount"), true), sub: `${sum(rows, "collectionCount").toLocaleString()} CR/AR`, icon: faMoneyBillWave, tone: "green" },
    { key: "balance", label: "AR Balance", display: formatPesoAmount(sum(rows, "balanceAmount"), true), sub: "Outstanding", icon: faChartLine, tone: "orange" },
    { key: "overdue", label: "Overdue Balance", display: formatPesoAmount(sum(rows, "overdueAmount"), true), sub: "Past due", icon: faClock, tone: "red" },
    { key: "open", label: "Open Transactions", display: rows.filter((row) => !["Closed", "Cancelled"].includes(row?.currentStatus)).length.toLocaleString(), sub: "Needs action", icon: faReceipt, tone: "slate" },
  ];
};

const buildLifecycleSummary = (rows) => {
  const defs = [
    { key: "PENDING_DELIVERY", label: "Pending Delivery", icon: faTruck, dot: "bg-blue-500" },
    { key: "PENDING_INVOICE", label: "Pending Invoice", icon: faFileInvoiceDollar, dot: "bg-amber-500" },
    { key: "PENDING_COLLECTION", label: "Pending Collection", icon: faMoneyBillWave, dot: "bg-violet-500" },
    { key: "OVERDUE", label: "Overdue", icon: faClock, dot: "bg-red-500" },
    { key: "CLOSED", label: "Closed", icon: faReceipt, dot: "bg-emerald-500" },
  ];
  const total = Math.max(1, rows.length);
  return defs.map((def) => {
    const count = rows.filter((row) => getStatusKey(row.currentStatus).includes(def.key) || (def.key === "PENDING_COLLECTION" && getStatusKey(row.currentStatus).includes("COLLECT"))).length;
    return { ...def, count, percent: ((count / total) * 100).toFixed(2) };
  });
};

const buildArSummary = (rows) => {
  const balanceAmount = rows.reduce((sum, row) => sum + toNumber(row.balanceAmount), 0);
  const overdueAmount = rows.reduce((sum, row) => sum + toNumber(row.overdueAmount), 0);
  return { balanceAmount, overdueAmount, currentAmount: Math.max(0, balanceAmount - overdueAmount) };
};

const buildDonutGradient = (items, total) => {
  if (!total) return "conic-gradient(#e2e8f0 0deg 360deg)";
  const colors = ["#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981"];
  let cursor = 0;
  const stops = items.map((item, index) => {
    const span = (item.count / total) * 360;
    const start = cursor;
    cursor += span;
    return `${colors[index]} ${start}deg ${cursor}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
};

const filterRowsForSearch = (rows, searchText) => {
  const value = String(searchText || "").trim().toLowerCase();
  if (!value) return rows;
  return rows.filter((row) => Object.values(row || {}).some((cell) => String(cell ?? "").toLowerCase().includes(value)));
};

const buildPageButtons = (page, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push("...");
  for (let pageNo = start; pageNo <= end; pageNo += 1) pages.push(pageNo);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
};

const downloadCsv = (filename, columns, rows) => {
  const headers = columns.map((column) => column.label);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(columns.map((column) => csvValue(row?.[column.key])).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const csvValue = (value) => {
  const text = String(value ?? "").replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
};

export default SalesTracker;
