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
  faTruck,
  faCalendarAlt,
  faChartLine,
  faFileLines,
  faRotateLeft,
  faPrint,
  faList,
  faRoute,
} from "@fortawesome/free-solid-svg-icons";

import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
  formatNumber,
  parseFormattedNumber,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import POInq from "./POInq";

const ENDPOINT = "getPrInquiry";

const TABS = [
  { key: "inquiry", label: "PO Inquiry", icon: faList },
  { key: "tracker", label: "PO Tracker", icon: faRoute },
];

function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_POINQ_CACHE__) window.__NAYSA_POINQ_CACHE__ = {};
    return window.__NAYSA_POINQ_CACHE__;
  }
  return {};
}

const safeArray = (value) => (Array.isArray(value) ? value : []);

const splitDocs = (value) =>
  String(value || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

const uniqueBy = (arr, keyFn) => {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getToday = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

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

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const formatAmount = (value) =>
  Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const normalizeAmount = (value) =>
  Number(String(value ?? 0).replace(/,/g, "")) || 0;

const defaultPOColumns = [
  { key: "poNo", label: "PO Number", visible: true, type: "text" },
  { key: "poDate", label: "PO Date", visible: true, type: "date" },
  { key: "supplierCode", label: "Supplier Code", visible: true, type: "text" },
  { key: "supplier", label: "Supplier Name", visible: true, type: "text" },
  { key: "branch", label: "Branch", visible: true, type: "text" },
  { key: "rcCode", label: "RC Code", visible: true, type: "text" },
  { key: "status", label: "Status", visible: true, type: "text" },
  { key: "itemCount", label: "Items", visible: true, type: "number" },
  { key: "totalAmount", label: "Total Amount", visible: true, type: "amount" },
  { key: "preparedBy", label: "Prepared By", visible: true, type: "text" },
  { key: "remarks", label: "Remarks", visible: true, type: "text" },
];

const aggregatePOInquiryRows = (rows) => {
  const groups = new Map();

  safeArray(rows).forEach((item) => {
    const poNo = item.poNo || item.po_no || "";
    const poDate = item.poDate || item.po_date || "";
    const vendName = item.vendName || item.vend_name || item.supplier || "";
    const vendCode = item.vendCode || item.vend_code || item.supplierCode || "";
    const branchCode =
      item.branchCode || item.branchcode || item.branch_code || "";
    const rcCode = item.rcCode || item.rc_code || "";
    const preparedBy =
      item.preparedBy ||
      item.prepared_by ||
      item.userCode ||
      item.user_code ||
      "";
    const remarks = item.remarks || item.specs || item.item_specs || "";
    const poStatus = item.poStatus || item.po_status || "";
    const poStatusDesc =
      item.poStatusDesc || item.po_stat_desc || poStatus || "Posted";

    const itemCode = item.itemCode || item.item_no || item.item_code || "";
    const itemName = item.itemName || item.item_desc || item.item_name || "";
    const uomCode = item.uomCode || item.uom_code || "";
    const qty = item.poQuantity ?? item.qty_order ?? item.po_quantity ?? 0;
    const unitCost = item.unitCost ?? item.unit_price ?? item.unit_cost ?? 0;
    const grossAmount =
      item.grossAmount ?? item.gross_amt ?? item.gross_amount ?? 0;
    const vatAmount = item.vatAmount ?? item.vat_amt ?? item.vat_amount ?? 0;
    const discAmount =
      item.discAmount ?? item.disc_amt ?? item.disc_amount ?? 0;
    const netAmount = item.netAmount ?? item.net_amt ?? item.net_amount ?? 0;

    const rrNos = splitDocs(item.rrNo || item.rr_no);
    const apvNos = splitDocs(item.apvNo || item.apv_no);
    const cvNos = splitDocs(item.cvNo || item.cv_no);

    const groupKey = `${branchCode}-${poNo}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        poNo,
        poDate,
        vendName,
        vendCode,
        branchCode,
        rcCode,
        preparedBy,
        remarks,
        poStatus,
        poStatusDesc,
        detailLines: [],
        rrNos: [],
        apvNos: [],
        cvNos: [],
        totalNetAmount: 0,
      });
    }

    const group = groups.get(groupKey);

    group.detailLines.push({
      itemCode,
      itemName,
      uomCode,
      qty,
      unitCost,
      grossAmount,
      vatAmount,
      discAmount,
      netAmount,
      remarks,
    });

    group.rrNos.push(...rrNos);
    group.apvNos.push(...apvNos);
    group.cvNos.push(...cvNos);
    group.totalNetAmount += normalizeAmount(netAmount);
  });

  return Array.from(groups.values()).map((group) => {
    const details = uniqueBy(group.detailLines, (line) =>
      [
        line.itemCode || "",
        line.itemName || "",
        line.uomCode || "",
        Number(line.qty || 0),
        Number(line.unitCost || 0),
        Number(line.netAmount || 0),
      ].join("|"),
    );

    return {
      id: `${group.branchCode}-${group.poNo}`,
      poNo: group.poNo,
      poDate: formatDateDisplay(group.poDate),
      supplier: group.vendName,
      supplierCode: group.vendCode,
      branch: group.branchCode,
      rcCode: group.rcCode,
      preparedBy: group.preparedBy || "—",
      remarks: group.remarks || "",
      status: group.poStatusDesc || group.poStatus || "Posted",
      itemCount: details.length,
      totalAmount: group.totalNetAmount,
      totalAmountDisplay: formatAmount(group.totalNetAmount),
      rrNo: [...new Set(group.rrNos)].join("\n"),
      apvNo: [...new Set(group.apvNos)].join("\n"),
      cvNo: [...new Set(group.cvNos)].join("\n"),
      items: details,
    };
  });
};

export default function POInquiry() {
  const navigate = useNavigate();
  const { currentUserRow } = useAuth();
  const baseKey = "PO_INQUIRY";

  const tableRef = useRef(null);
  const tableStateRef = useRef({
    filters: {},
    sortConfig: { key: null, direction: null },
    currentPage: 1,
  });

  const [activeTab, setActiveTab] = useState("inquiry");
  const [selectedPO, setSelectedPO] = useState(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [state, setState] = useState(() => ({
    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "Head Office",
    supplierCode: "",
    supplierName: "",
    statusFilter: "All",
    fromDate: getThreeMonthsAgo(),
    toDate: getToday(),
    poInquiryData: [],
    columnConfig: [],
    totalPO: "0.00",
    totalItems: "0.00",
    totalAmount: "0.00",
    isLoading: false,
    showSpinner: false,
  }));

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    supplierCode,
    supplierName,
    statusFilter,
    fromDate,
    toDate,
    poInquiryData,
    columnConfig,
    totalPO,
    totalItems,
    totalAmount,
    isLoading,
    showSpinner,
  } = state;

  const activeTabLabel =
    TABS.find((t) => t.key === activeTab)?.label || "PO Inquiry";
  const initialTableState = getGlobalCache()[baseKey]?.table || undefined;

  useEffect(() => {
    let t;
    if (isLoading)
      t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cols = await useSelectedHSColConfig(ENDPOINT);
        if (!alive) return;
        updateState({
          columnConfig:
            Array.isArray(cols) && cols.length > 0
              ? cols.map((c) => ({ ...c }))
              : defaultPOColumns,
        });
      } catch (e) {
        console.error("Load PO column config failed:", e);
        updateState({ columnConfig: defaultPOColumns });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const calculateTotals = useCallback((rows = []) => {
    const totalDoc = rows.length;
    const itemCount = rows.reduce(
      (acc, row) => acc + Number(row.itemCount || 0),
      0,
    );
    const amount = rows.reduce(
      (acc, row) => acc + normalizeAmount(row.totalAmount),
      0,
    );

    updateState({
      totalPO: formatNumber(totalDoc),
      totalItems: formatNumber(itemCount),
      totalAmount: formatNumber(amount),
    });
  }, []);

  const filterReset = useCallback(() => {
    updateState({
      poInquiryData: [],
      totalPO: "0.00",
      totalItems: "0.00",
      totalAmount: "0.00",
    });
  }, []);

  const handleReset = useCallback(() => {
    updateState({
      supplierCode: "",
      supplierName: "",
      statusFilter: "All",
      fromDate: getThreeMonthsAgo(),
      toDate: getToday(),
    });
    filterReset();
  }, [filterReset]);

  const fetchRecord = useCallback(async () => {
    updateState({ isLoading: true });

    try {
      const response = await fetchData(ENDPOINT, {
        json_data: {
          branchCode,
          itemCode: "",
          poStatus: statusFilter === "All" ? "" : statusFilter,
          startingCutoff: dateToCutoff(fromDate),
          endingCutoff: dateToCutoff(toDate),
          rcCode: "",
          vendCode: supplierCode,
          invType: "",
        },
      });

      const raw = response?.data?.[0]?.result;
      const parsed = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(parsed?.[0]?.dt1) ? parsed[0].dt1 : [];
      const grouped = aggregatePOInquiryRows(rows);
      const filtered = grouped.filter((po) => {
        if (statusFilter === "All") return true;
        return (
          String(po.status || "").toLowerCase() ===
          String(statusFilter).toLowerCase()
        );
      });

      updateState({ poInquiryData: filtered });
      calculateTotals(filtered);
    } catch (err) {
      console.error("Error fetching PO inquiry:", err);
      filterReset();
    } finally {
      updateState({ isLoading: false });
    }
  }, [
    branchCode,
    supplierCode,
    statusFilter,
    fromDate,
    toDate,
    calculateTotals,
    filterReset,
  ]);

  useEffect(() => {
    const cache = getGlobalCache();
    const snap = cache[baseKey];
    if (!snap) return;

    setState((prev) => ({
      ...prev,
      branchCode: snap.branchCode ?? prev.branchCode,
      branchName: snap.branchName ?? prev.branchName,
      supplierCode: snap.supplierCode ?? prev.supplierCode,
      supplierName: snap.supplierName ?? prev.supplierName,
      statusFilter: snap.statusFilter ?? prev.statusFilter,
      fromDate: snap.fromDate ?? prev.fromDate,
      toDate: snap.toDate ?? prev.toDate,
      poInquiryData: Array.isArray(snap.poInquiryData)
        ? snap.poInquiryData
        : prev.poInquiryData,
      columnConfig:
        Array.isArray(snap.columnConfig) && snap.columnConfig.length > 0
          ? snap.columnConfig
          : prev.columnConfig,
      totalPO: snap.totalPO ?? prev.totalPO,
      totalItems: snap.totalItems ?? prev.totalItems,
      totalAmount: snap.totalAmount ?? prev.totalAmount,
    }));

    tableStateRef.current = snap.table || tableStateRef.current;
  }, []);

  useEffect(() => {
    const cache = getGlobalCache();
    const prev = cache[baseKey] || {};
    cache[baseKey] = {
      ...prev,
      branchCode,
      branchName,
      supplierCode,
      supplierName,
      statusFilter,
      fromDate,
      toDate,
      poInquiryData,
      columnConfig,
      totalPO,
      totalItems,
      totalAmount,
      table: tableStateRef.current,
      scroll: prev.scroll || { top: 0, left: 0 },
    };
  }, [
    branchCode,
    branchName,
    supplierCode,
    supplierName,
    statusFilter,
    fromDate,
    toDate,
    poInquiryData,
    columnConfig,
    totalPO,
    totalItems,
    totalAmount,
  ]);

  const handleViewDocument = useCallback(
    (row) => {
      const poNo = row?.poNo || "";
      const rowBranch = row?.branch || branchCode || "";
      if (!poNo || !rowBranch) return;

      navigate(
        `/page/PO?msajNo=${encodeURIComponent(poNo)}&branchCode=${encodeURIComponent(rowBranch)}`,
      );
    },
    [navigate, branchCode],
  );

  return (
    <div className="global-ref-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {activeTabLabel}
            </h1>
          </div>

          <div className="w-full md:justify-center flex">
            <div className="w-full md:w-auto">
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 whitespace-nowrap px-3 py-2 text-[12px] font-bold transition-all border-b-2 ${
                      activeTab === tab.key
                        ? "border-blue-600 text-blue-600 bg-blue-50/50"
                        : "border-transparent text-gray-500 hover:text-blue-500"
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="mr-1.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={fetchRecord}
                disabled={isLoading || activeTab !== "inquiry"}
                className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <span className="ml-2 hidden lg:inline">Find</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading || activeTab !== "inquiry"}
                className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faRotateLeft} />
                <span className="ml-2 hidden lg:inline">Reset</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
              >
                <FontAwesomeIcon icon={faPrint} />
                <span className="ml-2 hidden lg:inline">Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-44 sm:mt-24 px-0">
        {activeTab === "inquiry" && (
          <>
            <div id="summary" className="global-tran-tab-div-ui">
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
                  <section className="p-5">
                    <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                      <FontAwesomeIcon
                        className="text-blue-600"
                        icon={faTruck}
                      />
                      Supplier Details
                    </h3>

                    <div className="space-y-3">
                      <FieldRenderer
                        type="lookup"
                        id="branchName"
                        name="branchName"
                        label="Branch"
                        value={branchName}
                        readOnly
                        disabled={isLoading}
                        onLookup={() => setShowBranchModal(true)}
                      />

                      <FieldRenderer
                        type="text"
                        id="supplierCode"
                        name="supplierCode"
                        label="Supplier Code"
                        value={supplierCode}
                        disabled={isLoading}
                        onChange={(e) =>
                          updateState({ supplierCode: e.target.value })
                        }
                      />

                      <FieldRenderer
                        type="text"
                        id="supplierName"
                        name="supplierName"
                        label="Supplier Name"
                        value={supplierName}
                        disabled={isLoading}
                        onChange={(e) =>
                          updateState({ supplierName: e.target.value })
                        }
                      />
                    </div>
                  </section>

                  <section className="p-5">
                    <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                      <FontAwesomeIcon
                        className="text-blue-600"
                        icon={faCalendarAlt}
                      />
                      Date Range
                    </h3>

                    <div className="space-y-3">
                      <FieldRenderer
                        type="text"
                        id="fromDate"
                        name="fromDate"
                        label="Starting Date"
                        value={fromDate}
                        disabled={isLoading}
                        onChange={(e) => {
                          filterReset();
                          updateState({ fromDate: e.target.value });
                        }}
                      />

                      <FieldRenderer
                        type="text"
                        id="toDate"
                        name="toDate"
                        label="Ending Date"
                        value={toDate}
                        disabled={isLoading}
                        onChange={(e) => {
                          filterReset();
                          updateState({ toDate: e.target.value });
                        }}
                      />

                      <div className="relative">
                        <select
                          id="statusFilter"
                          name="statusFilter"
                          value={statusFilter}
                          disabled={isLoading}
                          onChange={(e) => {
                            filterReset();
                            updateState({ statusFilter: e.target.value });
                          }}
                          className="peer global-tran-textbox-ui"
                        >
                          <option value="All">All</option>
                          <option value="Posted">Posted</option>
                          <option value="Open">Open</option>
                          <option value="Closed">Closed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        <label
                          htmlFor="statusFilter"
                          className="global-tran-floating-label"
                        >
                          PO Status
                        </label>
                      </div>
                    </div>
                  </section>

                  <aside className="p-5 bg-gray-50">
                    <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                      <FontAwesomeIcon
                        className="text-blue-600"
                        icon={faChartLine}
                      />
                      PO Summary
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total PO:</span>
                        <span className="font-semibold text-gray-800">
                          {totalPO}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total Items:</span>
                        <span className="font-semibold text-green-600">
                          {totalItems}
                        </span>
                      </div>
                      <div className="border-t pt-3 flex items-center justify-between">
                        <span className="text-gray-700">Total Amount:</span>
                        <span className="font-bold text-blue-600">
                          {totalAmount}
                        </span>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>

            <div id="transaction-details" className="global-tran-tab-div-ui">
              <div className="global-tran-tab-nav-ui">
                <div className="flex flex-row sm:flex-row">
                  <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                    Transaction Details
                  </button>
                </div>
              </div>

              <div className="global-tran-table-main-div-ui">
                <SearchGlobalReportTable
                  ref={tableRef}
                  columns={
                    columnConfig.length > 0 ? columnConfig : defaultPOColumns
                  }
                  data={poInquiryData}
                  itemsPerPage={50}
                  showFilters={true}
                  rightActionLabel="View"
                  onRowAction={handleViewDocument}
                  className="mt-2"
                  initialState={initialTableState}
                  docType="PO Inquiry Report"
                  onStateChange={(tbl) => {
                    tableStateRef.current = tbl;

                    const cache = getGlobalCache();
                    const prev = cache[baseKey] || {};
                    cache[baseKey] = {
                      ...prev,
                      table: tbl,
                    };
                  }}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "tracker" && <POInq />}

        {selectedPO && (
          <PODetailsModal
            selectedPO={selectedPO}
            setSelectedPO={setSelectedPO}
            handleViewDocument={handleViewDocument}
          />
        )}
      </div>

      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              filterReset();
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
              });
            }
            setShowBranchModal(false);
          }}
        />
      )}
    </div>
  );
}

function PODetailsModal({ selectedPO, setSelectedPO, handleViewDocument }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-6xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Purchase Order Details
            </h2>
            <p className="text-sm text-slate-500">PO No: {selectedPO.poNo}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewDocument(selectedPO)}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              View Document
            </button>

            <button
              type="button"
              onClick={() => setSelectedPO(null)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-5 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Supplier</p>
            <p className="font-medium">{selectedPO.supplier}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">PO Date</p>
            <p className="font-medium">{selectedPO.poDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Branch</p>
            <p className="font-medium">{selectedPO.branch}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <p className="font-medium">{selectedPO.status}</p>
          </div>
        </div>

        <div className="p-5">
          <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item Code</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">UOM</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Gross Amount</th>
                  <th className="px-4 py-3 text-right">VAT Amount</th>
                  <th className="px-4 py-3 text-right">Disc Amount</th>
                  <th className="px-4 py-3 text-right">Net Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {selectedPO.items.map((item, index) => (
                  <tr key={`${item.itemCode}-${index}`}>
                    <td className="px-4 py-3">{item.itemCode}</td>
                    <td className="px-4 py-3">{item.itemName}</td>
                    <td className="px-4 py-3">{item.uomCode}</td>
                    <td className="px-4 py-3 text-right">{item.qty}</td>
                    <td className="px-4 py-3 text-right">
                      {formatAmount(item.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatAmount(item.grossAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatAmount(item.vatAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatAmount(item.discAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatAmount(item.netAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td colSpan="8" className="px-4 py-3 text-right">
                    Total Net Amount
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatAmount(selectedPO.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
