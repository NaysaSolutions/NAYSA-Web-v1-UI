// SearchGlobalTranHistory.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL";
import { exportHistoryExcel } from "@/NAYSA Cloud/Global/report";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { format, subDays, addMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import DatePicker from "react-datepicker";


import "react-datepicker/dist/react-datepicker.css";
import Modal from "react-modal";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faPen,
  faCalendarAlt,
  faFilter,
  faDownload,
  faRedo,
  faArrowUp,
  faArrowDown,
  faEye
} from "@fortawesome/free-solid-svg-icons";

import { useReturnToDate } from "@/NAYSA Cloud/Global/dates";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import Header, { HeaderSpacer } from "@/NAYSA Cloud/Components/Header";

Modal.setAppElement("#root");

/* ------------------ window-level cache (survives route swaps) ------------------ */
function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_HISTORY_CACHE__) window.__NAYSA_HISTORY_CACHE__ = {};
    return window.__NAYSA_HISTORY_CACHE__;
  }
  return {};
}

/* ---------------- Formatting helpers ---------------- */
const formatCellValue = (value, config) => {
  if (value === null || value === undefined) return "—";
  switch (config.renderType) {
    case "date": {
      try {
        const datePart = String(value).split("T")[0];
        return useReturnToDate(datePart);
      } catch {
        return String(value);
      }
    }
    case "currency":
    case "number": {
      const num = Number(value);
      if (Number.isNaN(num)) return String(value);
      const digits = typeof config.roundingOff === "number" ? config.roundingOff : 2;
      return num.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
    }
    case "status": {
      const map = {
        C: { text: "CANCELLED", color: "text-red-600" },
        F: { text: "FINALIZED", color: "text-blue-800" },
        X: { text: "CANCELLED", color: "text-red-600" },
        "": { text: "OPEN", color: "text-black" }
      };
      const sty = map[value] || map[""];
      return <span className={sty.color + " font-semibold"}>{sty.text}</span>;
    }
    default:
      return String(value);
  }
};

/* -------------- Column config loader -------------- */
const getColumnConfig = async (groupId) => {
  try {
    const response = await useSelectedHSColConfig(groupId);
    let config = [];
    if (Array.isArray(response)) config = response;
    else if (
      response &&
      response.success &&
      response.data &&
      response.data[0] &&
      response.data[0].result
    ) {
      const parsed = JSON.parse(response.data[0].result || "[]");
      config = Array.isArray(parsed) ? parsed : [];
    } else if (response && Array.isArray(response.data)) {
      config = response.data;
    }
    config = (config || []).map((c) => ({
      key: c.key,
      label:
        c.label ||
        String(c.key || "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (ch) => ch.toUpperCase()),
      classNames: c.classNames || "text-left",
      renderType: c.renderType || "text",
      renderFormat: c.renderFormat || "",
      roundingOff: typeof c.roundingOff === "number" ? c.roundingOff : undefined,
      sortable: c.sortable !== false,
      hidden: !!c.hidden
    }));
    return config;
  } catch (err) {
    console.error("❌ Column config fetch failed for", groupId, err);
    return [];
  }
};

/* ============================== Component =============================== */
const AllTranHistory = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state || {};
  const didInitRef = useRef(false);
  const hydratedFromCacheRef = useRef(false);

  const {
    endpoint: endpointProp,
    activeTabKey: activeTabKeyProp,
    branchCode: branchCodeProp,
    startDate: startDateProp,
    endDate: endDateProp,
    status: statusProp,
    statusOptions: statusOptionsProp,
    prefillSearchFields: prefillProp,
    onRowDoubleClick,
    showHeader: showHeaderProp,
    cacheKey: cacheKeyProp,
    historyExportName: historyExportNameProp
  } = props || {};

  const endpoint =
    (endpointProp !== undefined && endpointProp) ||
    (navState.endpoint !== undefined && navState.endpoint);

  const baseKey =
    (typeof cacheKeyProp === "string" && cacheKeyProp) ||
    (typeof endpoint === "string" && endpoint) ||
    "HISTORY";

  const backToPath = navState.backToPath;
  const embedded =
    typeof onRowDoubleClick === "function" ||
    endpointProp !== undefined ||
    cacheKeyProp !== undefined;

  const showHeader = showHeaderProp !== undefined ? showHeaderProp : !embedded;

  /* -------- status options from parent (fallback if not provided) -------- */
  const fallbackStatusOptions = [
    { value: "All", label: "All Status" },
    { value: "F", label: "FINALIZED" },
    { value: "", label: "OPEN" },
    { value: "C", label: "CANCELLED" }
  ];
  const statusOptions =
    Array.isArray(statusOptionsProp) && statusOptionsProp.length
      ? statusOptionsProp
      : fallbackStatusOptions;

  /* ---------------- Local state ---------------- */
  const [branchCode, setBranchCode] = useState(
    (branchCodeProp !== undefined && branchCodeProp) ||
      (navState.branchCode !== undefined && navState.branchCode) ||
      ""
  );

  const initialDates = () => {
    if (startDateProp && endDateProp)
      return [new Date(startDateProp), new Date(endDateProp)];
    if (navState.startDate && navState.endDate)
      return [new Date(navState.startDate), new Date(navState.endDate)];
    return [subDays(new Date(), 6), new Date()];
  };

  const [dateRangeType, setDateRangeType] = useState(
    (startDateProp && endDateProp) || (navState.startDate && navState.endDate)
      ? "Custom Range"
      : "Last 7 Days"
  );
  const [dates, setDates] = useState(initialDates());
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const normalizeStatus = (v) => (v === "" ? "All" : v ?? "All");
  const [status, setStatus] = useState(() => normalizeStatus(statusProp));
  const [searchFields, setSearchFields] = useState(
    prefillProp || navState.prefillSearchFields || {}
  );
  const [tabData, setTabData] = useState({});
  const [tabConfigs, setTabConfigs] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
    tabKey: null
  });

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
  }, []);

  /* ---------------- restore from window cache ---------------- */
  useEffect(() => {
    const cache = getGlobalCache();
    let snap = cache[baseKey];
    const incomingBranch =
      (branchCodeProp !== undefined && branchCodeProp) ||
      (navState.branchCode !== undefined && navState.branchCode) ||
      "";

    if (snap && incomingBranch && snap.branchCode && snap.branchCode !== incomingBranch) {
      delete cache[baseKey];
      snap = undefined;
    }

    if (snap) {
      hydratedFromCacheRef.current = true;
      setDates(snap.dates || initialDates());
      setDateRangeType(snap.dateRangeType || "Last 7 Days");
      const desired =
        statusProp !== undefined
          ? normalizeStatus(statusProp)
          : snap.status !== undefined
          ? normalizeStatus(snap.status)
          : "All";
      setStatus(desired);
      setSearchFields(snap.searchFields || {});
      setTabData(snap.tabData || {});
      setTabConfigs(snap.tabConfigs || {});
      setActiveTab(snap.activeTab || null);
      setBranchCode(
        (snap.branchCode !== undefined && snap.branchCode) || branchCode
      );
    } else {
      if (statusProp !== undefined) setStatus(normalizeStatus(statusProp));
    }
  }, [baseKey, statusProp, branchCode, branchCodeProp, navState.branchCode]);

  /* ---------------- keep cache updated on important changes ---------------- */
  useEffect(() => {
    const cache = getGlobalCache();
    cache[baseKey] = {
      dates,
      dateRangeType,
      status,
      searchFields,
      tabData,
      tabConfigs,
      activeTab,
      branchCode
    };
  }, [
    baseKey,
    dates,
    dateRangeType,
    status,
    searchFields,
    tabData,
    tabConfigs,
    activeTab,
    branchCode
  ]);

  /* ---------------- date presets ---------------- */
  useEffect(() => {
    const today = new Date();
    if (dateRangeType === "Last 7 Days") {
      setDates([subDays(today, 6), today]);
    } else if (dateRangeType === "Last 30 Days") {
      setDates([subDays(today, 29), today]);
    } else if (dateRangeType === "Custom Range") {
      setDates([null, null]);
    }
  }, [dateRangeType]);

  const formatDateRange = (start, end) =>
    start && end ? `${format(start, "MM/dd/yyyy")} - ${format(end, "MM/dd/yyyy")}` : "";

  /* ---------------- columns for a tab ---------------- */
  const getColumnsForTab = useCallback(
    (tabKey) => {
      const dataForTab = tabData[tabKey] || [];
      const configured = tabConfigs[tabKey] || [];
      if (configured.length > 0) return configured.filter((c) => !c.hidden);
      if (dataForTab.length === 0) return [];
      return Object.keys(dataForTab[0]).map((k) => ({
        key: k,
        label: k
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        renderType: "text",
        sortable: true
      }));
    },
    [tabData, tabConfigs]
  );

  const currentRows = tabData[activeTab] || [];
  const baseColumns = useMemo(
    () => getColumnsForTab(activeTab),
    [activeTab, getColumnsForTab]
  );

  // If embedded (there’s a double-click handler), prepend a View action column like CVHistory
  const currentColumns = useMemo(() => {
    if (!baseColumns.length) return baseColumns;
    if (!embedded) return baseColumns;
    return [
      {
        key: "__actions",
        label: "View",
        sortable: false,
        classNames: "text-center"
      },
      ...baseColumns
    ];
  }, [baseColumns, embedded]);

  /* ---------------- filtered rows ---------------- */
  const filteredData = useMemo(() => {
    const base = currentRows.filter((row) =>
      Object.entries(searchFields).every(([key, value]) => {
        if (!value) return true;
        return String(row?.[key] ?? "")
          .toLowerCase()
          .includes(String(value).toLowerCase());
      })
    );
    if (status === "All") return base;

    const statusFieldCandidates = ["C", "doc_stat", "docStatus", "status", "stat"];
    return base.filter((row) => {
      const rowStatus =
        statusFieldCandidates
          .map((f) => (row[f] !== undefined ? String(row[f]) : undefined))
          .find((v) => v !== undefined) ?? "";
      return rowStatus === status;
    });
  }, [currentRows, searchFields, status]);

  /* ---------------- fetch on APPLY FILTER only ---------------- */
  const fetchHistory = useCallback(async () => {
    if (!dates[0] || !dates[1]) return;
    setLoading(true);

    const [startDate, endDate] = dates;
    const payload = {
      json_data: {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        branchCode: branchCode
      }
    };

    try {
      const dataResponse = await postRequest(endpoint, JSON.stringify(payload));
      const raw =
        dataResponse && dataResponse.data && dataResponse.data[0] && dataResponse.data[0].result
          ? dataResponse.data[0].result
          : "{}";
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse history result", e, raw);
        setTabData({});
        setTabConfigs({});
        setActiveTab(null);
        return;
      }

      // normalize to { tabKey: rows[] }
      let rootDataMap = {};
      if (Array.isArray(parsed)) {
        rootDataMap = parsed.reduce((acc, item) => {
          if (item && typeof item === "object" && !Array.isArray(item))
            Object.assign(acc, item);
          return acc;
        }, {});
      } else if (parsed && typeof parsed === "object") {
        rootDataMap = parsed;
      }

      // unwrap { rows: [...] }
      Object.keys(rootDataMap).forEach((k) => {
        const v = rootDataMap[k];
        if (v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.rows)) {
          rootDataMap[k] = v.rows;
        }
      });

      const rootKeys = Object.keys(rootDataMap);

      const newTabConfigs = {};
      for (const key of rootKeys) {
        newTabConfigs[key] = await getColumnConfig(key);
      }

      setTabData(rootDataMap);
      setTabConfigs(newTabConfigs);

      const initialTabKey =
        (activeTabKeyProp && rootKeys.includes(activeTabKeyProp) && activeTabKeyProp) ||
        (navState.activeTabKey &&
          rootKeys.includes(navState.activeTabKey) &&
          navState.activeTabKey) ||
        rootKeys[0] ||
        null;

      setActiveTab((prev) => (prev && rootKeys.includes(prev) ? prev : initialTabKey));
      setSearchFields((prev) =>
        Object.keys(prev).length ? prev : prefillProp || navState.prefillSearchFields || {}
      );
      setSortConfig({ key: null, direction: "asc", tabKey: initialTabKey });

      // snapshot cache
      const cache = getGlobalCache();
      cache[baseKey] = {
        dates,
        dateRangeType,
        status,
        searchFields: prefillProp || navState.prefillSearchFields || {},
        tabData: rootDataMap,
        tabConfigs: newTabConfigs,
        activeTab: initialTabKey,
        branchCode
      };
      hydratedFromCacheRef.current = true;
    } catch (error) {
      console.error("Error fetching history:", error);
      setTabData({});
      setTabConfigs({});
      setActiveTab(null);
    } finally {
      setLoading(false);
    }
  }, [
    dates,
    branchCode,
    endpoint,
    activeTabKeyProp,
    prefillProp,
    navState.activeTabKey,
    navState.prefillSearchFields,
    baseKey,
    dateRangeType,
    status
  ]);

  /* ---------------- handlers ---------------- */
  const handleSearchChange = (e, key) => {
    const { value } = e.target;
    setSearchFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSort = (key) => {
    if (key === "__actions") return;
    let direction = "asc";
    if (
      sortConfig.key === key &&
      sortConfig.direction === "asc" &&
      sortConfig.tabKey === activeTab
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction, tabKey: activeTab });

    const dataToSort = tabData[activeTab] || [];
    const cols = getColumnsForTab(activeTab);
    const colConfig = cols.find((c) => c.key === key);
    const isNumeric =
      colConfig && (colConfig.renderType === "number" || colConfig.renderType === "currency");

    const sorted = [...dataToSort].sort((a, b) => {
      const valA = a && a[key];
      const valB = b && b[key];
      if (isNumeric) {
        const numA = Number(valA);
        const numB = Number(valB);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
          return direction === "asc" ? numA - numB : numB - numA;
        }
      }
      const sA = String(valA ?? "");
      const sB = String(valB ?? "");
      return direction === "asc" ? sA.localeCompare(sB) : sB.localeCompare(sA);
    });

    setTabData((prev) => ({ ...prev, [activeTab]: sorted }));
  };

  const handleResetUI = () => {
    hydratedFromCacheRef.current = false;
    const today = new Date();
    setDateRangeType("Last 7 Days");
    setDates([subDays(today, 6), today]);
    setSearchFields({});
    setStatus("All");
  };

  // Row color by status in row (X=red, C|F=blue, else default)
  const getRowClassByStatus = (row) => {
    const statusFieldCandidates = ["C", "doc_stat", "docStatus", "status", "stat"];
    const rowStatus =
      statusFieldCandidates
        .map((f) => (row[f] !== undefined ? String(row[f]) : undefined))
        .find((v) => v !== undefined) ?? "";

    if (rowStatus === "X" || rowStatus === "C") return "text-red-600";
    if (rowStatus === "F") return "text-blue-700";
    return "";
  };

  /* ---------------- Export helpers ---------------- */
  const tabToSheet = (tabKey) => {
    const cols = getColumnsForTab(tabKey);
    const headers = cols.map((c) => c.label || c.key);

    const rows = (tabData[tabKey] || []).map((row) => {
      const obj = {};
      cols.forEach((col) => {
        const header = col.label || col.key;
        const val = formatCellValue(row[col.key], col);
        obj[header] = React.isValidElement(val) ? val.props?.children ?? "" : val;
      });
      return obj;
    });
    const sheetName = tabKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 31);

    return { sheetName, headers, rows };
  };

  const buildJsonSheets = () =>
    Object.keys(tabData || {}).map((tabKey) => tabToSheet(tabKey));

  function toTabbedJson(jsonSheets) {
    const data = {};
    for (const tab of jsonSheets || []) {
      const key = tab.sheetName || "Sheet";
      data[key] = Array.isArray(tab.rows) ? tab.rows : [];
    }
    return {
      Data: data
    };
  }

  const exportName =
    historyExportNameProp ??
    (location.state && location.state.historyExportName) ??
    "Transaction History";

  const handleExport = async () => {
    const tabKeys = Object.keys(tabData || {});
    if (!tabKeys.length) {
      alert("No data to export. Please Apply Filter first.");
      return;
    }
    setExporting(true);

    const reportName = exportName;
    const start = dates?.[0] ? format(dates[0], "yyyy-MM-dd") : null;
    const end = dates?.[1] ? format(dates[1], "yyyy-MM-dd") : null;

    const sheets = buildJsonSheets();
    const jsonData = toTabbedJson(sheets);

    const payload = {
      ReportName: reportName,
      UserCode: user?.USER_CODE,
      Branch: branchCode || "",
      StartDate: start,
      EndDate: end,
      JsonData: jsonData
    };

    await exportHistoryExcel(
      "/exportHistoryReport",
      JSON.stringify(payload),
      setExporting,
      reportName
    );
  };

  const handleRowDoubleClick = useCallback(
    (row) => {
      const docNo = row?.docNo ?? row?.documentNo ?? row?.DOC_NO ?? "";
      const bcode = row?.branchCode ?? row?.BRANCH_CODE ?? "";
      if (!docNo || !bcode) return;

      if (typeof onRowDoubleClick === "function") {
        onRowDoubleClick({ ...row, docNo, branchCode: bcode });
      } else {
        navigate(backToPath, {
          state: { docNo, branchCode: bcode },
          replace: true
        });
      }
    },
    [onRowDoubleClick, navigate, backToPath]
  );

  const [granularity, setGranularity] = useState("day"); // "day" | "month" | "year"

  /* ---------------- JSX ---------------- */
  return (
    <>
      {showHeader && (
        <>
          <Header
            activeTopTab="history"
            detailsRoute={backToPath}
            historyRoute="/page/AllTranHistory"
            showActions={false}
          />
          <HeaderSpacer />
        </>
      )}

      {/* Sticky top toolbar to mirror CVHistory feel */}
      <div className="fixed top-[55px] left-0 w-full z-30 bg-white shadow-md dark:bg-gray-800">
        {/* Header Tabs (CVHistory style) */}
        {showHeader && (
          <div className="flex flex-col md:flex-row items-center justify-between px-4 py-2 gap-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap justify-center md:justify-start gap-1 lg:gap-2 w-full md:w-auto">
              <button
                className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 group ${
                  location.pathname === "/"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
                }`}
                onClick={() => navigate(backToPath)}
              >
                <FontAwesomeIcon icon={faPen} className="w-4 h-3 mr-2" />
                <span className="group-hover:block">Transaction Details</span>
              </button>
              <button
                className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 group ${
                  location.pathname === "/"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
                }`}
                onClick={() => navigate(backToPath)}
              >
                <FontAwesomeIcon icon={faList} className="w-4 h-4 mr-2" />
                <span className="group-hover:block">Transaction History</span>
              </button>
            </div>
          </div>
        )}

        {/* Tailwind CSS Animations (same helper as CVHistory) */}
        <style jsx="true">{`
          @keyframes fade-in-down {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-down {
            animation: fade-in-down 0.2s ease-out forwards;
          }
        `}</style>

        {/* Filters — re-styled to match CVHistory proportions */}
        <div className="flex flex-col md:flex-row flex-wrap items-end gap-2 overflow-x-auto p-6 mt-8">
          {/* Date Range */}
          <div className="flex-shrink-0 sm:min-w-[200px]"> {/* add min-w-0 */}
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Date Range:
            </label>

            <div className="flex items-center border border-gray-300 rounded-md px-2 py-1 bg-white">
              <select
                className="border-none focus:ring-0 text-sm bg-transparent pr-2"
                value={dateRangeType}
                onChange={(e) => setDateRangeType(e.target.value)}
              >
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Custom Range</option>
              </select>

              {/* make this flex child shrinkable */}
              <div className="flex items-center border-l border-gray-300 pl-2 min-w-[200px]">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={formatDateRange(dates[0], dates[1])}
                  onClick={() => {
                    if (dateRangeType === "Custom Range") setModalIsOpen(true);
                  }}
                  className="w-full min-w-0 h-[25px] border-none focus:ring-0 text-sm bg-transparent 
                            text-gray-700 tabular-nums whitespace-nowrap pr-2"  /* pr-2 keeps last digit visible */
                  placeholder="Select date range"
                  readOnly
                  title={formatDateRange(dates[0], dates[1])}  /* tooltip shows full range just in case */
                />
              </div>
            </div>
          </div>


          {/* Status */}
          <div className="flex-shrink-0 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Status:
            </label>
            <div className="flex items-center border border-gray-300 rounded-md px-2 py-1 bg-white">
              <FontAwesomeIcon icon={faFilter} className="text-gray-400 mr-2" />
              <select
                className="w-full h-[25px] border-none focus:ring-0 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <option key={String(opt.value)} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Apply Filter */}
          <div className="flex-shrink-0 w-full md:w-auto mt-auto">
            <button
              className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 shadow-md w-full"
              onClick={fetchHistory}
              disabled={loading}
            >
              <FontAwesomeIcon icon={faFilter} className="mr-2" />
              {loading ? "Loading..." : "Filter"}
            </button>
          </div>

          {/* Export / Reset */}
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto ml-auto">
            <button
              className="flex items-center justify-center bg-green-600 text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-green-700 shadow-md w-full"
              onClick={handleExport}
              disabled={loading || exporting || filteredData.length === 0}
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              <span className="truncate">{exporting ? "Exporting..." : "Export"}</span>
            </button>
            <button
              className="flex items-center justify-center bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 shadow-md w-full"
              onClick={handleResetUI}
              disabled={loading || exporting}
            >
              <FontAwesomeIcon icon={faRedo} className="mr-2" />
              <span className="truncate">Reset</span>
            </button>
          </div>
        </div>

        {/* Dynamic tabs (visual chips like before, consistent with CVHistory spacing) */}
        {/* Dynamic tabs (embossed active style) */}
        <div className="overflow-x-auto px-4">
          {Object.keys(tabData).map((tabKey) => {
            const isActive = activeTab === tabKey;
            return (
              <button
                key={tabKey}
                className={`py-2 px-10 text-sm border rounded-t-lg transition-all duration-200
                  ${
                    isActive
                      ? // 🔹 Active tab: embossed effect
                        "bg-blue-100 text-blue-700 font-semibold " +
                        "shadow-lg shadow-blue-300 " + // inner embossed feel
                        "relative before:absolute before:inset-x-0 before:bottom-0 before:h-[3px] before:bg-blue-700 before:rounded-t-md"
                      : // 🔸 Inactive tab
                        "bg-white shadow-lg shadow-blue-50 text-gray-600 font-semibold hover:text-blue-700 hover:bg-blue-50"
                  }`}
                onClick={() => {
                  setActiveTab(tabKey);
                  setSortConfig({ key: null, direction: "asc", tabKey });
                }}
              >
                {tabKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            );
          })}
        </div>


        {/* Table */}
        <div className="bg-white shadow-md rounded-md overflow-hidden p-4">
          <div className="overflow-x-auto bg-white rounded-md max-h-[55vh]">
            {loading ? (
              <div className="text-center py-6 text-gray-500">Loading data and configurations...</div>
            ) : !activeTab || currentColumns.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                Select a date range and click ‘Filter’ to load history.
              </div>
            ) : (
              <table className="min-w-[1200px] text-[12px] text-center border-collapse border border-gray-300">
                <thead className="text-[12px] font-medium">
                  {/* Header row */}
                  <tr className="bg-blue-700 text-white sticky top-0 z-30">
                    {currentColumns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable !== false && handleSort(col.key)}
                        className={`px-3 py-2 border whitespace-nowrap ${
                          col.sortable !== false ? "cursor-pointer" : ""
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {col.label}
                          {col.sortable !== false &&
                            sortConfig.key === col.key &&
                            sortConfig.tabKey === activeTab && (
                              <FontAwesomeIcon
                                icon={sortConfig.direction === "asc" ? faArrowUp : faArrowDown}
                                className="text-xs"
                              />
                            )}
                        </div>
                      </th>
                    ))}
                  </tr>

                  {/* Filter row — match CVHistory spacing */}
                  <tr className="bg-gray-100 sticky top-[36px] z-20">
                    {currentColumns.map((col) => (
                      <td key={col.key} className="px-2 py-1 border whitespace-nowrap">
                        {col.key !== "__actions" && (
                          <input
                            type="text"
                            value={searchFields[col.key] || ""}
                            onChange={(e) => handleSearchChange(e, col.key)}
                            placeholder="Filter"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-[10px]"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-[11px]">
                  {filteredData.length > 0 ? (
                    filteredData.map((row, idx) => {
                      const rowClass = getRowClassByStatus(row);
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-blue-50 transition cursor-pointer ${rowClass}`}
                          onDoubleClick={() => handleRowDoubleClick(row)}
                        >
                          {currentColumns.map((col) => {
                            if (col.key === "__actions") {
                              return (
                                <td key="__actions" className="px-2 py-1 border whitespace-nowrap text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRowDoubleClick(row);
                                    }}
                                    className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                    title="View"
                                  >
                                    <FontAwesomeIcon icon={faEye} className="w-4 h-3" />
                                  </button>
                                </td>
                              );
                            }
                            const alignRight =
                              col.classNames?.includes("text-right") ||
                              ["number", "currency"].includes(col.renderType);

                            return (
                              <td
                                key={col.key}
                                className={`px-2 py-1 border whitespace-nowrap ${
                                  alignRight ? "text-right" : col.classNames || "text-left"
                                }`}
                                title={String(row?.[col.key] ?? "")}
                              >
                                {formatCellValue(row?.[col.key], col)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={currentColumns.length} className="text-center text-gray-500 py-4 border">
                        No records found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Date Picker Modal (mobile-first, 2 calendars in a row) */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        closeTimeoutMS={150}
        className="w-[min(100vw,500px)] sm:w-[min(100vw,500px)] h-[90vh] sm:h-auto sm:max-h-[80vh] mx-auto sm:mt-4 rounded-none sm:rounded-2xl shadow-2xl bg-white overflow-hidden outline-none"
        overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
          <h2 className="text-base font-semibold">Select Custom Date Range</h2>
          <p className="text-xs/relaxed text-white/80">
            Choose a range or use quick presets. Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded">Esc</kbd> to cancel.
          </p>
          <button
            onClick={() => setModalIsOpen(false)}
            className="absolute right-3 top-3 grid place-items-center w-8 h-8 rounded-full hover:bg-white/15 focus:ring-2 focus:ring-white/60"
            aria-label="Close"
            title="Close"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4"><path fill="currentColor" d="M11.41 10l4.3-4.29a1 1 0 10-1.42-1.42L10 8.59 5.71 4.29a1 1 0 10-1.42 1.42L8.59 10l-4.3 4.29a1 1 0 101.42 1.42L10 11.41l4.29 4.3a1 1 0 001.42-1.42z"/></svg>
          </button>
        </div>

        {/* Body */}
        {/* <div className="p-2 sm:p-2 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 h-[calc(90vh-120px)] sm:h-auto overflow-auto"> */}
        <div className="p-2 sm:p-2 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 h-[calc(90vh-120px)] sm:h-auto overflow-auto">
          {/* Quick presets */}
          
          <div className="space-y-1 mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
              <button className="btn-outline text-sm hover:bg-blue-100" onClick={() => { const t=new Date(); setDates([t,t]); }}>Today</button>
              <button className="btn-outline text-sm hover:bg-blue-100" onClick={() => { const t=new Date(); const y=new Date(t); y.setDate(t.getDate()-1); setDates([y,y]); }}>Yesterday</button>
              <button className="btn-outline text-sm hover:bg-blue-100" onClick={() => { const t=new Date(); setDates([subDays(t,6),t]); }}>Last 7 Days</button>
              <button className="btn-outline text-sm hover:bg-blue-100" onClick={() => { const t=new Date(); setDates([subDays(t,29),t]); }}>Last 30 Days</button>
              <button className="btn-outline text-sm hover:bg-blue-100" onClick={() => { const t=new Date(); setDates([startOfMonth(t),endOfMonth(t)]); }}>This Month</button>
              <button className="btn-outline text-sm hover:bg-blue-100" onClick={() => { const t=new Date(); const last=addMonths(t,-1); setDates([startOfMonth(last),endOfMonth(last)]); }}>Last Month</button>
              <button className="btn-outline text-sm hover:bg-blue-100" onClick={() => { const t=new Date(); setDates([startOfYear(t),endOfYear(t)]); }}>YTD</button>
              <button className="btn-ghost text-sm hover:bg-blue-100" onClick={() => setDates([null,null])} title="Clear selection">Clear</button>
            </div>

            
            {/* Selection summary */}
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
              <div className="font-semibold text-slate-700 mb-1">Selected Range</div>
              {dates?.[0] && dates?.[1] ? (
                <div>{format(dates[0], "MMM dd, yyyy")} — {format(dates[1], "MMM dd, yyyy")}</div>
              ) : (
                <div className="italic text-slate-400">No range selected</div>
              )}
              {granularity !== "day" && (
                <div className="mt-1 text-[11px] text-slate-500">
                  Mode: <span className="uppercase">{granularity}</span> (one tap selects entire {granularity})
                </div>
              )}
            </div>

          </div>

          {/* Calendar (single) with Month/Year quick selection */}
          <div className="rounded-xl border border-slate-200 p-2 sm:p-2">
            {/* Granularity toggle */}
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-slate-500 mr-1">Select by:</span>
              <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
                {["day", "month", "year"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGranularity(g)}
                    className={`px-3 py-1.5 text-xs capitalize ${
                      granularity === g
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="reactdp-one">
              <DatePicker
                inline
                fixedHeight
                monthsShown={1}
                shouldCloseOnSelect={false}
                // Keep your range state; Day mode uses native range picking
                selectsRange={granularity === "day"}
                startDate={dates[0]}
                endDate={dates[1]}
                onChange={(update) => {
                  if (granularity === "day") {
                    setDates(update);
                  }
                }}
                onSelect={(d) => {
                  if (!d) return;
                  if (granularity === "month") {
                    setDates([startOfMonth(d), endOfMonth(d)]);
                  } else if (granularity === "year") {
                    setDates([startOfYear(d), endOfYear(d)]);
                  }
                }}
                openToDate={dates?.[1] ?? dates?.[0] ?? new Date()}
                // Custom header with Month + Year dropdowns
                renderCustomHeader={({
                  date,
                  decreaseMonth,
                  increaseMonth,
                  prevMonthButtonDisabled,
                  nextMonthButtonDisabled,
                  changeYear,
                  changeMonth,
                }) => {
                  const months = [
                    "January","February","March","April","May","June",
                    "July","August","September","October","November","December"
                  ];
                  const currentYear = new Date().getFullYear();
                  const years = Array.from({ length: 16 }, (_, i) => currentYear + 1 - i); // next year .. 15 yrs back

                  return (
                    <div className="flex items-center justify-between gap-2 px-2 py-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={decreaseMonth}
                          disabled={prevMonthButtonDisabled}
                          className="px-2 py-1 rounded-md hover:bg-slate-100 disabled:opacity-40"
                          title="Previous month"
                          type="button"
                        >
                          ‹
                        </button>
                        <button
                          onClick={increaseMonth}
                          disabled={nextMonthButtonDisabled}
                          className="px-2 py-1 rounded-md hover:bg-slate-100 disabled:opacity-40"
                          title="Next month"
                          type="button"
                        >
                          ›
                        </button>
                      </div>

                      {/* Month / Year dropdowns for quick jump */}
                      <div className="flex items-center gap-2">
                        <select
                          className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white"
                          value={date.getMonth()}
                          onChange={(e) => changeMonth(Number(e.target.value))}
                        >
                          {months.map((m, idx) => (
                            <option key={m} value={idx}>{m}</option>
                          ))}
                        </select>

                        <select
                          className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white"
                          value={date.getFullYear()}
                          onChange={(e) => changeYear(Number(e.target.value))}
                        >
                          {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                }}
              />
            </div>

          </div>

          {/* local styles (optional tweak) */}
          <style jsx="true">{`
            .reactdp-one .react-datepicker__header {
              padding-top: 6px;
            }
          `}</style>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-white/95 border-t border-slate-200">
          <div className="text-[11px] text-slate-500">
            Tip: Press <kbd className="px-1 py-0.5 bg-slate-100 rounded">Enter</kbd> to apply.
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModalIsOpen(false)} className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm">Cancel</button>
            <button
              onClick={() => { if (dates?.[0] && dates?.[1]) setModalIsOpen(false); }}
              disabled={!dates?.[0] || !dates?.[1]}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium enabled:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Local styles for buttons + react-datepicker row layout */}
        <style jsx="true">{`
          .btn-outline { 
            @apply text-slate-700 border border-slate-300 rounded-md px-1 py-1 text-xs sm:text-xs hover:bg-slate-100 text-left;
            min-height: 30px;
          }
          .btn-ghost { 
            @apply text-slate-600 rounded-md px-1 py-1 text-xs sm:text-xs hover:bg-slate-100 text-left;
            min-height: 30px;
          }
          /* Force two calendars in a HORIZONTAL row and keep them readable on small screens */
          .reactdp-row .react-datepicker {
            display: flex !important;
            flex-wrap: nowrap;
            gap: 8px;
          }
          .reactdp-row .react-datepicker__month-container {
            flex: 0 0 auto;
            width: 290px;       /* ensures two full calendars sit side-by-side */
          }
          .reactdp-row .react-datepicker__header {
            padding-top: 6px;
          }
          @media (min-width: 640px) {
            .reactdp-row .react-datepicker__month-container { width: 300px; }
          }
        `}</style>
      </Modal>



      {(loading || exporting) && <LoadingSpinner />}
    </>
  );
};

export default AllTranHistory;
