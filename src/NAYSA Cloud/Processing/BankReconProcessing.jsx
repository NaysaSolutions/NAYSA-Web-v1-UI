import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBroom,
  faChevronDown,
  faCheck,
  faFileExcel,
  faFileInvoiceDollar,
  faFileLines,
  faFloppyDisk,
  faMagnifyingGlass,
  faPrint,
  faUndo,
  faUnlock,
  faUpload,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalConfirmAlert,
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import BankMastLookupModal from "@/NAYSA Cloud/Lookup/SearchBankMast.jsx";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef.jsx";

const DOC_CODE = "BK";
const ENDPOINT = "/bankRecon";

const emptyTotals = {
  totalDepositCL: 0,
  totalDepositOS: 0,
  totalDeposit: 0,
  totalDisbCL: 0,
  totalDisbOS: 0,
  totalDisb: 0,
  totalAdjustment: 0,
  totalUndeposit: 0,
  totalReversed: 0,
  totalDebit: 0,
  totalCredit: 0,
  totalPerBank: 0,
  totalPerBook: 0,
  variance: 0,
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const asDataObject = (payload) => {
  if (!payload) return {};
  if (payload?.data !== undefined) return payload.data || {};
  return payload || {};
};

const toDateInput = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [mm, dd, yyyy] = raw.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toMMDDYYYY = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${mm}/${dd}/${yyyy}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy}`;
};

const getCutoffLastDay = (cutOff) => {
  const value = String(cutOff || "");
  if (!/^\d{6}$/.test(value)) return "";
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(month).padStart(2, "0")}/${String(lastDay).padStart(2, "0")}/${year}`;
};

const normalizeNumber = (value) => parseFormattedNumber(value || 0) || 0;

const statusClass = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "CL") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "O/S") return "bg-slate-50 text-slate-700 border-slate-200";
  if (["X", "REV"].includes(s)) return "bg-rose-50 text-rose-700 border-rose-200";
  if (s === "S") return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
};

const Amount = ({ value, className = "" }) => (
  <span className={`tabular-nums ${className}`}>{formatNumber(normalizeNumber(value), 2)}</span>
);

const SummaryCard = ({ title, accent = "text-blue-600", rows = [] }) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className={`px-4 pt-3 pb-1 text-[11px] font-extrabold uppercase tracking-wide ${accent}`}>
      {title}
    </div>
    <div className="px-4 pb-3 space-y-2">
      {rows.map((row) => (
        <div key={row.label} className={`flex items-center justify-between text-[12px] ${row.strong ? "font-bold pt-1 border-t border-slate-100" : ""}`}>
          <span className="text-slate-600">{row.label}</span>
          <Amount value={row.value} className={row.valueClass || "text-slate-900"} />
        </div>
      ))}
    </div>
  </div>
);

const ActionButton = ({
  children,
  icon,
  onClick,
  disabled = false,
  variant = "primary",
  title = "",
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-300",
    soft: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-300",
    danger: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-300",
    success: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-300",
    warning: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-300",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 inline-flex h-8 min-w-24 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]}`}
    >
      {icon && <FontAwesomeIcon icon={icon} className="text-[12px]" />}
      {children}
    </button>
  );
};

const BankReconProcessing = () => {
  const { currentUserRow } = useAuth();
  const tableRef = useRef(null);

  const [state, setState] = useState({
    bkId: "",
    branchCode: currentUserRow?.branchCode || "",
    cutOff: "",
    cutOffName: "",
    bankCode: "",
    acctNo: "",
    acctName: "",
    status: "OPEN",
    posted: false,
    activeTab: "bankstmt",
    showActionMenu: false,
    isLoading: false,
    showSpinner: false,
    showBankModal: false,
    showCutoffModal: false,
    header: null,
    checkRows: [],
    receiptRows: [],
    journalRows: [],
    summaryRows: [],
    bankStmtRows: [],
    historyRows: [],
  });

  const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));

  const {
    bkId,
    branchCode,
    cutOff,
    cutOffName,
    bankCode,
    acctNo,
    acctName,
    status,
    posted,
    activeTab,
    showActionMenu,
    isLoading,
    showSpinner,
    showBankModal,
    showCutoffModal,
    header,
    checkRows,
    receiptRows,
    journalRows,
    summaryRows,
    bankStmtRows,
    historyRows,
  } = state;

  const isPosted = posted || String(status || "").toUpperCase() === "POSTED";
  const defaultClearDate = useMemo(() => getCutoffLastDay(cutOff), [cutOff]);

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  const callBK = useCallback(
    async (mode, extra = {}) => {
      const jsonData = {
        bkId,
        branchCode,
        cutOff,
        bankCode,
        userCode: currentUserRow?.userCode || currentUserRow?.USER_CODE || "",
        userName: currentUserRow?.userName || currentUserRow?.USER_NAME || currentUserRow?.name || "",
        pcName: "WEB",
        macAddress: "",
        dt1: [],
        ...extra,
      };

      const response = await postRequest(ENDPOINT, {
        mode,
        params: {
          json_data: jsonData,
        },
      });

      if (response?.success === false) {
        throw new Error(response?.message || "Bank Recon request failed.");
      }

      return asDataObject(response);
    },
    [bkId, branchCode, cutOff, bankCode, currentUserRow],
  );

  const applyLoadedData = useCallback((data) => {
    const nextHeader = data?.header || {};
    const nextBkId = nextHeader?.bkId || data?.bkId || bkId || "";

    updateState({
      bkId: nextBkId,
      branchCode: nextHeader?.branchCode || branchCode || "",
      cutOff: nextHeader?.cutOff || cutOff || "",
      bankCode: nextHeader?.bankCode || bankCode || "",
      acctNo: nextHeader?.acctNo || acctNo || "",
      acctName: nextHeader?.acctName || acctName || "",
      status: nextHeader?.status || status || "OPEN",
      posted: Boolean(nextHeader?.posted),
      header: nextHeader,
      checkRows: toArray(data?.dt1),
      receiptRows: toArray(data?.dt2),
      journalRows: toArray(data?.dt3),
      summaryRows: toArray(data?.dt4),
      bankStmtRows: toArray(data?.dt5),
    });
  }, [acctName, acctNo, bankCode, bkId, branchCode, cutOff, status]);

  const validateHeader = () => {
    const missing = [];
    if (!cutOff) missing.push("- Cut-Off");
    if (!bankCode) missing.push("- Bank Code");

    if (missing.length > 0) {
      useSwalErrorAlert("Required Fields", `The following fields are required:\n${missing.join("\n")}`);
      return false;
    }

    return true;
  };

  const handleLoad = async () => {
    if (!validateHeader()) return;

    updateState({ isLoading: true });
    try {
      const data = await callBK("Load");
      applyLoadedData(data);
      updateState({ activeTab: "checks" });
      useSwalSuccessAlert("Loaded", "Bank reconciliation records loaded successfully.");
    } catch (error) {
      useSwalErrorAlert("Load Failed", error?.message || "Unable to load bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleGet = async () => {
    if (!validateHeader()) return;

    updateState({ isLoading: true });
    try {
      const data = await callBK("Get");
      if (!data || data?.result === null) {
        useSwalInfoAlert("No Records Found", "Bank reconciliation record does not exist.");
        return;
      }
      applyLoadedData(data);
    } catch (error) {
      useSwalErrorAlert("Fetch Failed", error?.message || "Unable to fetch bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleReset = () => {
    updateState({
      bkId: "",
      cutOff: "",
      cutOffName: "",
      bankCode: "",
      acctNo: "",
      acctName: "",
      status: "OPEN",
      posted: false,
      activeTab: "bankstmt",
      showActionMenu: false,
      header: null,
      checkRows: [],
      receiptRows: [],
      journalRows: [],
      summaryRows: [],
      bankStmtRows: [],
      historyRows: [],
    });
  };

  const handleCheckFieldChange = (index, field, value) => {
    updateState({
      checkRows: checkRows.map((row, i) => {
        if (i !== index) return row;

        const next = { ...row, [field]: value };

        if (field === "selected") {
          const checked = Boolean(value);
          next.status = checked ? "CL" : "O/S";
          next.clearDate = checked ? row.clearDate || defaultClearDate : "";
        }

        if (field === "status") {
          next.selected = value === "CL";
          next.clearDate = value === "O/S" ? "" : row.clearDate || defaultClearDate;
        }

        return next;
      }),
    });
  };

  const handleSelectAllChecks = (selected) => {
    updateState({
      checkRows: checkRows.map((row) => {
        const blocked = ["REV", "S", "X"].includes(String(row.status || "").toUpperCase()) || row.stat === "F";
        if (blocked) return row;

        return {
          ...row,
          selected,
          status: selected ? "CL" : "O/S",
          clearDate: selected ? row.clearDate || defaultClearDate : "",
        };
      }),
    });
  };

  const handleSaveCheck = async () => {
    if (!validateHeader()) return;
    if (!bkId) {
      useSwalErrorAlert("No Record", "Please load records first.");
      return;
    }

    updateState({ isLoading: true });
    try {
      const dt1 = checkRows.map((row) => ({
        bkCheckId: row.bkCheckId,
        selected: Boolean(row.selected),
        status: row.status || "O/S",
        clearDate: row.clearDate || null,
      }));

      const data = await callBK("SaveCheck", { dt1 });
      useSwalSuccessAlert("Saved", data?.message || "Check and deposit records saved successfully.");
      await handleGet();
    } catch (error) {
      useSwalErrorAlert("Save Failed", error?.message || "Unable to save check and deposit records.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleGenerateBankRecon = async () => {
    if (!validateHeader()) return;
    if (!bkId) {
      useSwalErrorAlert("No Record", "Please load records first.");
      return;
    }

    updateState({ isLoading: true });
    try {
      const data = await callBK("GenerateBankRecon");
      const rows = Array.isArray(data) ? data : toArray(data);
      updateState({ summaryRows: rows, activeTab: "summary" });
      await handleGet();
      useSwalSuccessAlert("Generated", "Bank reconciliation summary generated successfully.");
    } catch (error) {
      useSwalErrorAlert("Generate Failed", error?.message || "Unable to generate bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleSaveBankRecon = async () => {
    if (!validateHeader()) return;
    if (!bkId) {
      useSwalErrorAlert("No Record", "Please load records first.");
      return;
    }

    updateState({ isLoading: true });
    try {
      const dt1 = summaryRows.map((row) => ({
        sequence: row.sequence,
        reconItem: row.reconItem,
        docType: row.docType,
        docNo: row.docNo,
        checkNo: row.checkNo,
        checkDate: row.checkDate,
        outDays: normalizeNumber(row.outDays),
        debit: normalizeNumber(row.debit),
        credit: normalizeNumber(row.credit),
        perBank: normalizeNumber(row.perBank),
        perBook: normalizeNumber(row.perBook),
        mode: row.mode,
        stat: row.stat,
      }));

      const data = await callBK("SaveBankRecon", { dt1 });
      useSwalSuccessAlert("Saved", data?.message || "Bank reconciliation summary saved successfully.");
      await handleGet();
    } catch (error) {
      useSwalErrorAlert("Save Failed", error?.message || "Unable to save bank reconciliation summary.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handlePost = async () => {
    if (!validateHeader()) return;

    const result = await useSwalConfirmAlert(
      "Post Bank Reconciliation?",
      "Posting will finalize the bank reconciliation and update source document clear dates."
    );

    if (!result?.isConfirmed) return;

    updateState({ isLoading: true });
    try {
      const data = await callBK("Post");
      useSwalSuccessAlert("Posted", data?.message || "Bank reconciliation posted successfully.");
      await handleGet();
    } catch (error) {
      useSwalErrorAlert("Post Failed", error?.message || "Unable to post bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleUnpost = async () => {
    if (!validateHeader()) return;

    const result = await useSwalConfirmAlert(
      "Unpost Bank Reconciliation?",
      "This will reopen the bank reconciliation and clear source document bank recon flags."
    );

    if (!result?.isConfirmed) return;

    updateState({ isLoading: true });
    try {
      const data = await callBK("Unpost");
      useSwalSuccessAlert("Unposted", data?.message || "Bank reconciliation unposted successfully.");
      await handleGet();
    } catch (error) {
      useSwalErrorAlert("Unpost Failed", error?.message || "Unable to unpost bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleClear = async () => {
    if (!validateHeader()) return;

    const result = await useSwalConfirmAlert(
      "Clear Bank Reconciliation?",
      "This will delete the current working details for this cut-off and bank."
    );

    if (!result?.isConfirmed) return;

    updateState({ isLoading: true });
    try {
      const data = await callBK("Clear");
      useSwalSuccessAlert("Cleared", data?.message || "Bank reconciliation cleared successfully.");
      await handleGet();
    } catch (error) {
      useSwalErrorAlert("Clear Failed", error?.message || "Unable to clear bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleHistory = async () => {
    if (!cutOff) {
      useSwalErrorAlert("Required Fields", "Please select Cut-Off first.");
      return;
    }

    updateState({ isLoading: true });
    try {
      const data = await callBK("History");
      updateState({ historyRows: toArray(data), activeTab: "history" });
    } catch (error) {
      useSwalErrorAlert("History Failed", error?.message || "Unable to load history.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleBankClose = (bank) => {
    updateState({ showBankModal: false });

    if (!bank) return;

    updateState({
      bankCode: bank.bankCode || "",
      acctNo: bank.bankAcctNo || bank.acctNo || "",
      acctName: bank.acctName || "",
      bkId: "",
      header: null,
      status: "OPEN",
      posted: false,
      checkRows: [],
      receiptRows: [],
      journalRows: [],
      summaryRows: [],
      bankStmtRows: [],
    });
  };

  const handleCutoffClose = (cutoff) => {
    updateState({ showCutoffModal: false });

    if (!cutoff) return;

    updateState({
      cutOff: cutoff.cutoffCode || "",
      cutOffName: cutoff.cutoffName || "",
      bkId: "",
      header: null,
      status: "OPEN",
      posted: false,
      checkRows: [],
      receiptRows: [],
      journalRows: [],
      summaryRows: [],
      bankStmtRows: [],
    });
  };

  const totals = header || emptyTotals;

  const receiptColumns = useMemo(
    () => [
      { key: "branchCode", label: "Branch", renderType: "text", width: 90 },
      { key: "docType", label: "DT", renderType: "text", width: 70 },
      { key: "docNo", label: "Document No.", renderType: "text", width: 120 },
      { key: "docDate", label: "Document Date", renderType: "date", width: 130 },
      { key: "docAmt", label: "Amount", renderType: "number", width: 130 },
      { key: "refCode", label: "Customer Code", renderType: "text", width: 130 },
      { key: "refName", label: "Customer Name", renderType: "text", width: 220 },
      { key: "particular", label: "Particular", renderType: "text", width: 280 },
    ],
    [],
  );

  const journalColumns = useMemo(
    () => [
      { key: "branchCode", label: "Branch", renderType: "text", width: 90 },
      { key: "docType", label: "DT", renderType: "text", width: 70 },
      { key: "docNo", label: "Document No.", renderType: "text", width: 120 },
      { key: "docDate", label: "Document Date", renderType: "date", width: 130 },
      { key: "jvAmt", label: "JV Amount", renderType: "number", width: 130 },
      { key: "particular", label: "Particular", renderType: "text", width: 320 },
    ],
    [],
  );

  const summaryColumns = useMemo(
    () => [
      { key: "sequence", label: "Seq", renderType: "text", width: 90 },
      { key: "reconItem", label: "Recon Item", renderType: "text", width: 320 },
      { key: "docType", label: "DT", renderType: "text", width: 70 },
      { key: "docNo", label: "Document No.", renderType: "text", width: 120 },
      { key: "checkNo", label: "Check No.", renderType: "text", width: 120 },
      { key: "checkDate", label: "Check Date", renderType: "date", width: 120 },
      { key: "outDays", label: "Days", renderType: "number", width: 90 },
      { key: "debit", label: "Debit", renderType: "number", width: 130 },
      { key: "credit", label: "Credit", renderType: "number", width: 130 },
      { key: "perBank", label: "Per Bank", renderType: "number", width: 130 },
      { key: "perBook", label: "Per Book", renderType: "number", width: 130 },
      { key: "variance", label: "Variance", renderType: "number", width: 130 },
    ],
    [],
  );

  const bankStmtColumns = useMemo(
    () => [
      { key: "tranDate", label: "Date", renderType: "date", width: 120 },
      { key: "checkNo", label: "Check No.", renderType: "text", width: 120 },
      { key: "referenceNo", label: "Reference No.", renderType: "text", width: 150 },
      { key: "branch", label: "Branch", renderType: "text", width: 120 },
      { key: "tranCode", label: "Transaction Code", renderType: "text", width: 160 },
      { key: "tranDesc", label: "Description", renderType: "text", width: 260 },
      { key: "debit", label: "Debit", renderType: "number", width: 130 },
      { key: "credit", label: "Credit", renderType: "number", width: 130 },
      { key: "runningBalance", label: "Running Balance", renderType: "number", width: 150 },
      { key: "referenceCVNo", label: "Reference CV No.", renderType: "text", width: 160 },
    ],
    [],
  );

  const historyColumns = useMemo(
    () => [
      { key: "cutOff", label: "Cut-Off", renderType: "text", width: 100 },
      { key: "bankCode", label: "Bank Code", renderType: "text", width: 110 },
      { key: "acctName", label: "Bank Account", renderType: "text", width: 260 },
      { key: "acctNo", label: "Account No.", renderType: "text", width: 150 },
      { key: "totalPerBank", label: "Per Bank", renderType: "number", width: 130 },
      { key: "totalPerBook", label: "Per Book", renderType: "number", width: 130 },
      { key: "variance", label: "Variance", renderType: "number", width: 130 },
      { key: "status", label: "Status", renderType: "text", width: 120 },
      { key: "preparedBy", label: "Prepared By", renderType: "text", width: 160 },
      { key: "dateStamp", label: "Date Prepared", renderType: "date", width: 130 },
    ],
    [],
  );

  const tabItems = [
    { key: "bankstmt", label: "Bank Statement Upload", icon: faUpload, onClick: () => updateState({ activeTab: "bankstmt" }) },
    { key: "checks", label: "Check Vouchers and Deposits", icon: faFileInvoiceDollar, onClick: () => updateState({ activeTab: "checks" }) },
    { key: "receipts", label: "Undeposited Receipt", icon: faFileExcel, onClick: () => updateState({ activeTab: "receipts" }) },
    { key: "jv", label: "Journal Voucher", icon: faFileLines, onClick: () => updateState({ activeTab: "jv" }) },
    { key: "summary", label: "Bank Recon Summary", icon: faWandMagicSparkles, onClick: () => updateState({ activeTab: "summary" }) },
    { key: "history", label: "History", icon: faPrint, onClick: handleHistory },
  ];

  const tabButtonClass = (tab) =>
    `inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[12px] font-bold transition ${
      activeTab === tab
        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
        : "border-blue-100 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50"
    }`;

  const runAction = (handler) => {
    updateState({ showActionMenu: false });
    handler();
  };

  return (
    <div className="global-ref-main-div-ui">
      {showSpinner && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
          <LoadingSpinner />
        </div>
      )}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:w-auto">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <h1 className="global-ref-headertext-ui w-full sm:w-auto truncate text-center sm:text-left">
                Bank Reconciliation
              </h1>
              <span
                className={`mx-auto sm:mx-0 rounded-md border px-2 py-1 text-[10px] font-extrabold uppercase ${
                  isPosted
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {isPosted ? "Posted Transaction" : status || "Open"}
              </span>
            </div>
          </div>

          <div className="w-full lg:w-auto flex justify-center lg:justify-end">
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
              <ActionButton icon={faMagnifyingGlass} onClick={handleLoad} disabled={isLoading || isPosted}>
                Find Record
              </ActionButton>
              <ActionButton icon={faUndo} onClick={handleReset} disabled={isLoading}>
                Reset
              </ActionButton>
              <ActionButton icon={faFileLines} onClick={handleGenerateBankRecon} disabled={isLoading || isPosted}>
                Generate
              </ActionButton>
              <ActionButton icon={faFloppyDisk} onClick={handleSaveBankRecon} disabled={isLoading || isPosted}>
                Save
              </ActionButton>

              <div className="relative shrink-0">
                <ActionButton
                  icon={faChevronDown}
                  onClick={() => updateState({ showActionMenu: !showActionMenu })}
                  disabled={isLoading}
                >
                  Action
                </ActionButton>

                {showActionMenu && (
                  <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-blue-100 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => runAction(handlePost)}
                      disabled={isPosted}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      <span>Post</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction(handleUnpost)}
                      disabled={!isPosted}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <FontAwesomeIcon icon={faUnlock} />
                      <span>Unpost</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction(handleClear)}
                      disabled={isPosted}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <FontAwesomeIcon icon={faBroom} />
                      <span>Clear</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-32 space-y-3 px-1 sm:mt-24">
        <div id="summary" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                type="button"
                className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
              >
                Cutoff Period and Bank Information
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FieldRenderer
                type="lookup"
                label="Cut-Off"
                required
                value={cutOff}
                onLookup={() => updateState({ showCutoffModal: true })}
                onClear={() => updateState({ cutOff: "", cutOffName: "", bkId: "" })}
                disabled={isLoading}
              />
              <FieldRenderer
                label="Cut-Off Name"
                value={cutOffName}
                readOnly
                disabled
              />
              <FieldRenderer
                type="lookup"
                label="Bank Code"
                required
                value={bankCode}
                onLookup={() => updateState({ showBankModal: true })}
                onClear={() => updateState({ bankCode: "", acctNo: "", acctName: "", bkId: "" })}
                disabled={isLoading}
              />
              <FieldRenderer
                label="Bank Account"
                value={acctName || acctNo}
                readOnly
                disabled
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Deposits"
            accent="text-emerald-600"
            rows={[
              { label: "Cleared", value: totals.totalDepositCL },
              { label: "Outstanding", value: totals.totalDepositOS },
              { label: "Total", value: totals.totalDeposit, strong: true, valueClass: "text-emerald-700" },
            ]}
          />
          <SummaryCard
            title="Disbursements"
            accent="text-blue-600"
            rows={[
              { label: "Cleared", value: totals.totalDisbCL },
              { label: "Outstanding", value: totals.totalDisbOS },
              { label: "Total", value: totals.totalDisb, strong: true, valueClass: "text-blue-700" },
            ]}
          />
          <SummaryCard
            title="Adjustments"
            accent="text-violet-600"
            rows={[
              { label: "JVs / Adjustments", value: totals.totalAdjustment },
              { label: "Undeposited Receipts", value: totals.totalUndeposit },
              { label: "Reversed / Staled", value: totals.totalReversed },
            ]}
          />
          <SummaryCard
            title="Final Reconciliation"
            accent="text-orange-600"
            rows={[
              { label: "Per Bank", value: totals.totalPerBank },
              { label: "Per Book", value: totals.totalPerBook },
              {
                label: "Variance",
                value: totals.variance,
                strong: true,
                valueClass: Math.abs(normalizeNumber(totals.variance)) < 0.01 ? "text-emerald-700" : "text-rose-700",
              },
            ]}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-wrap gap-2 p-3">
              {tabItems.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={tab.onClick}
                  className={tabButtonClass(tab.key)}
                >
                  <FontAwesomeIcon icon={tab.icon} className="text-[12px]" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 px-3 py-2">
              {activeTab === "checks" && (
                <>
                  <ActionButton onClick={() => handleSelectAllChecks(true)} variant="soft" disabled={isLoading || isPosted}>
                    Select All
                  </ActionButton>
                  <ActionButton onClick={() => handleSelectAllChecks(false)} variant="soft" disabled={isLoading || isPosted}>
                    Unselect All
                  </ActionButton>
                  <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600">
                    Default Clear Date: {defaultClearDate || "-"}
                  </span>
                </>
              )}
              {activeTab === "bankstmt" && (
                <>
                  <ActionButton icon={faFileExcel} variant="soft" disabled>
                    Download Template
                  </ActionButton>
                  <ActionButton icon={faUpload} variant="soft" disabled>
                    Upload Statement
                  </ActionButton>
                </>
              )}
              <ActionButton icon={faPrint} variant="soft" disabled>
                Reports
              </ActionButton>
            </div>
          </div>

          <div className="min-h-[420px] p-3">
            {activeTab === "checks" && (
              <div className="overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-[1500px] w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10 bg-slate-100">
                    <tr>
                      <th className="border-b px-2 py-2 text-left w-[48px]">Sel</th>
                      <th className="border-b px-2 py-2 text-left w-[88px]">Status</th>
                      <th className="border-b px-2 py-2 text-left w-[130px]">Clear Date</th>
                      <th className="border-b px-2 py-2 text-left">Branch</th>
                      <th className="border-b px-2 py-2 text-left">DT</th>
                      <th className="border-b px-2 py-2 text-left">Document No.</th>
                      <th className="border-b px-2 py-2 text-left">Document Date</th>
                      <th className="border-b px-2 py-2 text-left">Check / DS No.</th>
                      <th className="border-b px-2 py-2 text-left">Check / DS Date</th>
                      <th className="border-b px-2 py-2 text-left">Ref Code</th>
                      <th className="border-b px-2 py-2 text-left">Ref Name</th>
                      <th className="border-b px-2 py-2 text-left">Particular</th>
                      <th className="border-b px-2 py-2 text-right">Debit</th>
                      <th className="border-b px-2 py-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkRows.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="px-4 py-16 text-center text-slate-400">
                          No records loaded.
                        </td>
                      </tr>
                    ) : (
                      checkRows.map((row, index) => {
                        const rowLocked = isPosted || row.stat === "F" || ["REV", "S", "X"].includes(String(row.status || "").toUpperCase());
                        return (
                          <tr key={row.bkCheckId || index} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
                            <td className="border-b border-slate-100 px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(row.selected)}
                                disabled={rowLocked}
                                onChange={(e) => handleCheckFieldChange(index, "selected", e.target.checked)}
                              />
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1">
                              <select
                                value={row.status || "O/S"}
                                disabled={rowLocked}
                                onChange={(e) => handleCheckFieldChange(index, "status", e.target.value)}
                                className={`h-7 w-full rounded-md border px-2 text-[11px] font-bold ${statusClass(row.status)}`}
                              >
                                <option value="O/S">O/S</option>
                                <option value="CL">CL</option>
                                <option value="REV">REV</option>
                                <option value="S">S</option>
                                <option value="X">X</option>
                              </select>
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1">
                              <input
                                type="date"
                                value={toDateInput(row.clearDate)}
                                disabled={rowLocked || row.status === "O/S"}
                                onChange={(e) => handleCheckFieldChange(index, "clearDate", toMMDDYYYY(e.target.value))}
                                className="h-7 w-full rounded-md border border-slate-200 px-2 text-[11px]"
                              />
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1">{row.branchCode}</td>
                            <td className="border-b border-slate-100 px-2 py-1">{row.docType}</td>
                            <td className="border-b border-slate-100 px-2 py-1 font-semibold">{row.docNo}</td>
                            <td className="border-b border-slate-100 px-2 py-1">{toMMDDYYYY(row.docDate)}</td>
                            <td className="border-b border-slate-100 px-2 py-1">{row.checkNo}</td>
                            <td className="border-b border-slate-100 px-2 py-1">{toMMDDYYYY(row.checkDate)}</td>
                            <td className="border-b border-slate-100 px-2 py-1">{row.refCode}</td>
                            <td className="border-b border-slate-100 px-2 py-1">{row.refName}</td>
                            <td className="border-b border-slate-100 px-2 py-1 max-w-[300px] truncate" title={row.particular}>{row.particular}</td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right"><Amount value={row.debit} /></td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right"><Amount value={row.credit} /></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold">
                    <tr>
                      <td colSpan={12} className="px-2 py-2">Total ({checkRows.length} records)</td>
                      <td className="px-2 py-2 text-right">
                        <Amount value={checkRows.reduce((sum, row) => sum + normalizeNumber(row.debit), 0)} />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Amount value={checkRows.reduce((sum, row) => sum + normalizeNumber(row.credit), 0)} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {activeTab === "receipts" && (
              <SearchGlobalReportTable
                ref={tableRef}
                columns={receiptColumns}
                data={receiptRows}
                docType={`${DOC_CODE}_Undeposited_Receipt`}
                tableSize="Full"
                autoFit
                pagination
              />
            )}

            {activeTab === "jv" && (
              <SearchGlobalReportTable
                ref={tableRef}
                columns={journalColumns}
                data={journalRows}
                docType={`${DOC_CODE}_Journal_Voucher`}
                tableSize="Full"
                autoFit
                pagination
              />
            )}

            {activeTab === "summary" && (
              <SearchGlobalReportTable
                ref={tableRef}
                columns={summaryColumns}
                data={summaryRows}
                docType={`${DOC_CODE}_Bank_Recon_Summary`}
                tableSize="Full"
                autoFit
                pagination
              />
            )}

            {activeTab === "bankstmt" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] text-blue-800">
                  Bank statement upload UI is prepared. Enable the buttons after the backend mode for Excel upload is finalized.
                </div>
                <SearchGlobalReportTable
                  ref={tableRef}
                  columns={bankStmtColumns}
                  data={bankStmtRows}
                  docType={`${DOC_CODE}_Bank_Statement`}
                  tableSize="Full"
                  autoFit
                  pagination
                />
              </div>
            )}

            {activeTab === "history" && (
              <SearchGlobalReportTable
                ref={tableRef}
                columns={historyColumns}
                data={historyRows}
                docType={`${DOC_CODE}_History`}
                tableSize="Full"
                autoFit
                pagination
                onRowDoubleClick={(row) => {
                  updateState({
                    bkId: row?.bkId || "",
                    cutOff: row?.cutOff || cutOff,
                    bankCode: row?.bankCode || bankCode,
                    acctNo: row?.acctNo || "",
                    acctName: row?.acctName || "",
                    activeTab: "checks",
                  });
                  setTimeout(() => handleGet(), 0);
                }}
              />
            )}
          </div>
        </div>
      </div>

      <BankMastLookupModal
        isOpen={showBankModal}
        onClose={handleBankClose}
        title="Select Bank Account"
      />

      <CutoffLookupModal
        isOpen={showCutoffModal}
        onClose={handleCutoffClose}
        source="BK"
        customParam="All"
        title="Search Cut-Off"
      />
    </div>
  );
};

export default BankReconProcessing;
