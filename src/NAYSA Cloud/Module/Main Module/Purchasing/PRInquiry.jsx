import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faRotateLeft,
  faList,
  faRoute,
} from "@fortawesome/free-solid-svg-icons";

import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { formatNumber } from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import MSLookupModal from "@/NAYSA Cloud/Lookup/SearchMSMast.jsx";

// Import the Tracker component logic
import PRInq from "./PRInq";

const ENDPOINT = "getPRInquiry";

const TABS = [
  { key: "inquiry", label: "PR Inquiry", icon: faList },
  { key: "tracker", label: "PR Tracker", icon: faRoute },
];

function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_PRINQ_CACHE__) window.__NAYSA_PRINQ_CACHE__ = {};
    return window.__NAYSA_PRINQ_CACHE__;
  }
  return {};
}

const safeArray = (value) => (Array.isArray(value) ? value : []);

const joinCodeName = (code, name) => {
  const cleanCode = String(code || "").trim();
  const cleanName = String(name || "").trim();
  if (!cleanCode) return cleanName;
  if (!cleanName || cleanName === cleanCode) return cleanCode;
  return `${cleanCode} - ${cleanName}`;
};

const getToday = () => new Date().toISOString().split("T")[0];

const getThreeMonthsAgo = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().split("T")[0];
};

const dateToCutoff = (dateText) =>
  dateText ? String(dateText).slice(0, 7).replace("-", "") : "";

const formatDateDisplay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
};

const formatAmount = (value) =>
  Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const normalizeAmount = (value) => Number(String(value ?? 0).replace(/,/g, "")) || 0;

const defaultPRColumns = [
  { key: "prNo", label: "PR Number", visible: true, type: "text" },
  { key: "prDate", label: "PR Date", visible: true, type: "date" },
  { key: "branch", label: "Branch", visible: true, type: "text" },
  { key: "rcCode", label: "Department", visible: true, type: "text" },
  { key: "status", label: "Status", visible: true, type: "text" },
  { key: "totalAmount", label: "Amount", visible: true, type: "amount" },
  { key: "preparedBy", label: "Prepared By", visible: true, type: "text" },
];

/**
 * Normalizes API rows for the Inquiry Table
 */
const normalizePRDetailRows = (rows = []) => {
  return safeArray(rows).map((item, index) => {
    const prNo = item.prNo || item.pr_no || "";
    const prDate = formatDateDisplay(item.prDate || item.pr_date || "");
    const netAmount = item.netAmount ?? item.net_amt ?? item.gross_amount ?? 0;

    return {
      ...item,
      id: `${item.branch_code}-${prNo}-${index}`,
      prNo,
      prDate,
      branch: item.branchCode || item.branch_code || "",
      rcCode: item.rcCode || item.rc_code || "",
      status: item.prStatusDesc || item.pr_status || "Posted",
      totalAmount: normalizeAmount(netAmount),
      preparedBy: item.preparedBy || item.prepared_by || "—",
    };
  });
};

export default function PRInquiry() {
  const navigate = useNavigate();
  const { currentUserRow } = useAuth();
  const baseKey = "PR_INQUIRY";

  const [activeTab, setActiveTab] = useState("inquiry");
  const [selectedPR, setSelectedPR] = useState(null);
  const [showLookup, setShowLookup] = useState(null);

  const [state, setState] = useState(() => ({
    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "Head Office",
    supplierCode: "",
    supplierName: "",
    statusFilter: "All",
    invType: "All",
    itemCode: "",
    itemName: "",
    rcCode: "",
    rcName: "",
    fromDate: getThreeMonthsAgo(),
    toDate: getToday(),
    prInquiryData: [],
    columnConfig: [],
    isLoading: false,
  }));

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  // Tab configurations
  const activeTabLabel = TABS.find((t) => t.key === activeTab)?.label || "PR Inquiry";

  const fetchRecord = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      const response = await fetchData(ENDPOINT, {
        json_data: {
          branchCode: state.branchCode,
          itemCode: state.itemCode,
          prStatus: state.statusFilter === "All" ? "" : state.statusFilter,
          startingCutoff: dateToCutoff(state.fromDate),
          endingCutoff: dateToCutoff(state.toDate),
          rcCode: state.rcCode,
          vendCode: state.supplierCode,
          invType: state.invType === "All" ? "" : state.invType,
        },
      });

      const raw = response?.data?.[0]?.result;
      const parsed = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(parsed?.[0]?.dt1) ? parsed[0].dt1 : [];
      updateState({ prInquiryData: normalizePRDetailRows(rows) });
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      updateState({ isLoading: false });
    }
  }, [state]);

  const handleReset = () => {
    updateState({
      supplierCode: "", supplierName: "",
      itemCode: "", itemName: "",
      rcCode: "", rcName: "",
      statusFilter: "All",
      fromDate: getThreeMonthsAgo(),
      toDate: getToday(),
      prInquiryData: []
    });
  };

  const handleViewDocument = (row) => {
    const prNo = row?.prNo || row?.pr_no || "";
    const branch = row?.branch || row?.branch_code || state.branchCode;
    navigate(`/page/PR?prNo=${encodeURIComponent(prNo)}&branchCode=${encodeURIComponent(branch)}&viewOnly=Y`);
  };

  return (
    <div className="global-ref-main-div-ui">
      {state.isLoading && <LoadingSpinner />}

      {/* HEADER SECTION */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center">
          <h1 className="global-ref-headertext-ui truncate">{activeTabLabel}</h1>

          {/* TAB NAVIGATION */}
          <div className="flex justify-center">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                    activeTab === tab.key ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500"
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2">
            {activeTab === "inquiry" && (
              <>
                <button onClick={fetchRecord} className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs font-medium">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" /> Find
                </button>
                <button onClick={handleReset} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-xs font-medium border">
                  <FontAwesomeIcon icon={faRotateLeft} className="mr-2" /> Reset
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-44 sm:mt-24 px-0">
        {activeTab === "inquiry" ? (
          <>
            {/* FILTERS */}
            <div className="global-tran-tab-div-ui">
              <div className="bg-white rounded-2xl shadow-sm border p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <FieldRenderer
                  type="lookup" label="Branch" value={state.branchName}
                  onLookup={() => setShowLookup("branch")}
                />
                <FieldRenderer
                  type="lookup" label="Supplier" value={joinCodeName(state.supplierCode, state.supplierName)}
                  onLookup={() => setShowLookup("supplier")}
                />
                <div className="relative">
                  <select
                    value={state.statusFilter}
                    onChange={(e) => updateState({ statusFilter: e.target.value })}
                    className="peer global-tran-textbox-ui"
                  >
                    <option value="All">All</option>
                    <option value="Posted">Posted</option>
                    <option value="Open">Open</option>
                  </select>
                  <label className="global-tran-floating-label">Status</label>
                </div>
                <div className="flex gap-2">
                  <FieldRenderer
                    type="date" label="From" value={state.fromDate}
                    onChange={(e) => updateState({ fromDate: e.target.value })}
                  />
                  <FieldRenderer
                    type="date" label="To" value={state.toDate}
                    onChange={(e) => updateState({ toDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="global-tran-tab-div-ui mt-4">
              <div className="global-tran-table-main-div-ui">
                <SearchGlobalReportTable
                  columns={defaultPRColumns}
                  data={state.prInquiryData}
                  onRowAction={handleViewDocument}
                  rightActionLabel="View"
                />
              </div>
            </div>
          </>
        ) : (
          /* TRACKER TAB */
          <PRInq />
        )}
      </div>

      {/* LOOKUP MODALS */}
      {showLookup === "branch" && (
        <BranchLookupModal
          isOpen onClose={(b) => {
            if (b) updateState({ branchCode: b.branchCode, branchName: b.branchName });
            setShowLookup(null);
          }}
        />
      )}
      {showLookup === "supplier" && (
        <PayeeMastLookupModal
          isOpen onClose={(s) => {
            if (s) updateState({ supplierCode: s.vendCode, supplierName: s.vendName });
            setShowLookup(null);
          }}
        />
      )}
    </div>
  );
}