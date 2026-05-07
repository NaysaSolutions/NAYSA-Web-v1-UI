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
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import MSLookupModal from "@/NAYSA Cloud/Lookup/SearchMSMast.jsx";

import PRInq from "./PRInq";

const ENDPOINT = "getPRInquiry";

const TABS = [
  { key: "inquiry", label: "PR Inquiry", icon: faList },
  { key: "tracker", label: "PR Tracker", icon: faRoute },
];

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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
};

// Column Configuration - Added Item Code
const defaultPRColumns = [
  { key: "prNo", label: "PR Number", visible: true, type: "text" },
  { key: "prDate", label: "PR Date", visible: true, type: "date" },
  { key: "branch", label: "Branch", visible: true, type: "text" },
  { key: "itemCode", label: "Item Code", visible: true, type: "text" },
  { key: "itemName", label: "Item Description", visible: true, type: "text" },
  { key: "status", label: "Status", visible: true, type: "text" },
  { key: "prQuantity", label: "PR Qty", visible: true, type: "number" },
  { key: "poQty", label: "PO/JO Qty", visible: true, type: "number" },
  { key: "rrQty", label: "RR Qty", visible: true, type: "number" },
];

const normalizePRDetailRows = (rows = []) => {
  return safeArray(rows).map((item, index) => ({
    ...item,
    id: `${item.branchCode}-${item.prNo}-${index}`,
    prDate: formatDateDisplay(item.prDate),
    branch: item.branchCode || "",
    status: item.prStatusDesc || "Open",
    itemCode: item.itemCode || "", //
    itemName: item.itemName || "", 
    prQuantity: Number(item.prQuantity || 0),
    poQty: Number(item.poQty || 0),
    rrQty: Number(item.rrQty || 0),
  }));
};

export default function PRInquiry() {
  const navigate = useNavigate();
  const { currentUserRow } = useAuth();

  const [activeTab, setActiveTab] = useState("inquiry");
  const [showLookup, setShowLookup] = useState(null);

  const [state, setState] = useState(() => ({
    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "Head Office",
    statusFilter: "All",
    invType: "All",
    selectedItems: [], 
    rcCode: "",
    rcName: "",
    fromDate: getThreeMonthsAgo(),
    toDate: getToday(),
    prInquiryData: [],
    isLoading: false,
  }));

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const getItemsDisplayText = () => {
    if (state.selectedItems.length === 0) return "";
    if (state.selectedItems.length === 1) {
      return joinCodeName(state.selectedItems[0].code, state.selectedItems[0].name);
    }
    return `${state.selectedItems.length} Items Selected`;
  };

  const fetchRecord = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      // Maps to Sproc codes: O=Open, C=Closed, X=Cancelled
      const statusMap = { "All": "", "Open": "O", "Closed": "C", "Cancelled": "X" };
      const itemCodesStr = state.selectedItems.map(i => i.code).join(',');

      const response = await fetchData(ENDPOINT, {
        json_data: {
          branchCode: state.branchCode,
          itemCode: itemCodesStr, 
          prStatus: statusMap[state.statusFilter] || "", 
          startingCutoff: dateToCutoff(state.fromDate),
          endingCutoff: dateToCutoff(state.toDate),
          rcCode: state.rcCode,
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
      selectedItems: [], rcCode: "", rcName: "",
      statusFilter: "All", invType: "All",
      fromDate: getThreeMonthsAgo(), toDate: getToday(),
      prInquiryData: []
    });
  };

  const handleViewDocument = (row) => {
   navigate(`/page/PR?prNo=${encodeURIComponent(row.prNo)}&branchCode=${encodeURIComponent(row.branchCode)}&viewOnly=Y`);
  };

  return (
    <div className="global-ref-main-div-ui">
      {state.isLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center">
          <h1 className="global-ref-headertext-ui truncate">
            {TABS.find(t => t.key === activeTab)?.label}
          </h1>

          <div className="flex justify-center">
            <div className="flex border-b border-gray-200">
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
            <div className="global-tran-tab-div-ui">
              <div className="bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-4">
                
                {/* ROW 1: Branch, Department, Inventory Type, From Date */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3">
                    <FieldRenderer type="lookup" label="Branch" value={state.branchName} onLookup={() => setShowLookup("branch")} />
                  </div>
                  <div className="md:col-span-4"> 
                    <FieldRenderer type="lookup" label="Department" value={joinCodeName(state.rcCode, state.rcName)} onLookup={() => setShowLookup("rc")} />
                  </div>
                  <div className="md:col-span-2 relative">
                    <select value={state.invType} onChange={(e) => updateState({ invType: e.target.value })} className="peer global-tran-textbox-ui">
                      <option value="All">All Types</option>
                      <option value="FG">FG</option>
                      <option value="MS">MS</option>
                      <option value="RM">RM</option>
                    </select>
                    <label className="global-tran-floating-label">Inv Type</label>
                  </div>
                  <div className="md:col-span-3">
                    <FieldRenderer type="date" label="From" value={state.fromDate} onChange={(e) => updateState({ fromDate: e.target.value })} />
                  </div>
                </div>

                {/* ROW 2: Status, Item (Multiple Select), To Date */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-2 relative">
                    <select value={state.statusFilter} onChange={(e) => updateState({ statusFilter: e.target.value })} className="peer global-tran-textbox-ui">
                      <option value="All">All Status</option>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <label className="global-tran-floating-label">Status</label>
                  </div>

                  <div className="md:col-span-7">
                    <FieldRenderer type="lookup" label="Item" value={getItemsDisplayText()} onLookup={() => setShowLookup("item")} />
                  </div>

                  <div className="md:col-span-3">
                    <FieldRenderer type="date" label="To" value={state.toDate} onChange={(e) => updateState({ toDate: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            <div className="global-tran-tab-div-ui mt-4">
              <div className="global-tran-table-main-div-ui overflow-x-auto">
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
          <PRInq />
        )}
      </div>

      {showLookup === "branch" && <BranchLookupModal isOpen onClose={(b) => { if (b) updateState({ branchCode: b.branchCode, branchName: b.branchName }); setShowLookup(null); }} />}
      {showLookup === "rc" && <RCLookupModal isOpen onClose={(r) => { if (r) updateState({ rcCode: r.rcCode, rcName: r.rcName }); setShowLookup(null); }} />}
      {showLookup === "item" && (
        <MSLookupModal 
          isOpen 
          onClose={(selected) => { 
            if (selected) {
              const items = Array.isArray(selected) ? selected : [selected];
              const normalizedItems = items.map(i => ({
                code: i.itemCode || i.item_code || "",
                name: i.itemDesc || i.item_name || i.itemName || ""
              }));
              updateState({ selectedItems: normalizedItems }); 
            }
            setShowLookup(null); 
          }} 
        />
      )}
    </div>
  );
}