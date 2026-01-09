import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faMagnifyingGlass,
  faPrint,
  faFileExport,
  faInfoCircle,
  faUser,
  faCalendarAlt,
  faChevronDown,
  faUndo,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { exportGenericHistoryExcel } from "@/NAYSA Cloud/Global/report";
import {
  useTopCompanyRow,
  useTopUserRow,
  useTopBranchRow,
} from "@/NAYSA Cloud/Global/top1RefTable";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import GlobalGLPostingModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalGLPostingv1.jsx";
import Swal from "sweetalert2";
import { useGetCurrentDay, useFormatToDate } from "@/NAYSA Cloud/Global/dates";

const ENDPOINT = "getAPCheckRelasing";

/* ---------------- Status Helpers ---------------- */

function normalizeStatusCode(value) {
  const s = (value || "").toString().trim().toUpperCase();
  if (s === "U" || s === "UNRELEASED") return "U";
  if (s === "R" || s === "RELEASED") return "R";
  if (s === "H" || s === "HOLD") return "H";
  if (s === "X" || s === "RETURNED") return "X";
  if (s === "V" || s === "REV" || s === "REVERSED") return "V";
  if (s === "S" || s === "STALE") return "S";
  return "";
}

// Uses normalized code or text (R/RELEASED etc.)
function buildStatusDisplay(codeOrText) {
  const code = normalizeStatusCode(codeOrText);
  switch (code) {
    case "U":
      return "🟢 UnReleased";
    case "R":
      return "🔵 Released";
    case "H":
      return "🔴 Hold";
    case "X":
      return "⚪ Returned";
    case "V":
      return "🟣 Reversed";
    case "S":
      return "⚫ Stale";
    default:
      return (codeOrText || "").toString();
  }
}

/* --- small date helpers for validation --- */

function safeDateFromString(s) {
  if (!s) return null;
  // assume 'YYYY-MM-DD...' and just take the date part
  const d = new Date(String(s).substring(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Try to get Doc Date from row for validation
function getRowDocDate(row) {
  if (!row) return "";
  return (
    row.docDate ||
    row.doc_date ||
    row.docdate ||
    row.DocDate ||
    row.checkDate ||
    row.check_date ||
    ""
  );
}

// Try to get Received Date from row, if not filled in modal
function getRowReceivedDate(row) {
  if (!row) return "";
  return row.receivedDate || row.received_date || row.recvDate || "";
}

/* ---------------- Component ---------------- */

export default function CheckRL() {
  const { user, companyInfo, currentUserRow } = useAuth();
  const [userPassword, setUserPassword] = useState(null);

  // ----- Layout (fixed header bar) -----
  const barRef = useRef(null);
  const [headerH, setHeaderH] = useState(48);
  const [barH, setBarH] = useState(48);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const header =
      document.querySelector("#appHeader") ||
      document.querySelector(".global-app-topbar") ||
      document.querySelector("header[role='banner']") ||
      document.querySelector("header");

    const remeasure = () => {
      if (header) {
        const rect = header.getBoundingClientRect();
        setHeaderH(Math.max(0, Math.round(rect.height)));
      }
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        setBarH(Math.max(0, Math.round(rect.height)));
      }
    };

    remeasure();
    window.addEventListener("resize", remeasure);
    const a = requestAnimationFrame(remeasure);
    const b = requestAnimationFrame(remeasure);
    return () => {
      window.removeEventListener("resize", remeasure);
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, []);

  // ----- App state -----
  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    payeeCode: "",
    payeeName: "",

    // Date range & status
    startDate: "",
    endDate: "",
    status: "", // filter U/R/H/X/V/S

    rows: [],
    cols: [],

    // kept for JV/Reversal logic
    jvNo: "",
    jvDate: "",

    showBranchModal: false,
    showPayeeModal: false,
    isLoading: false,
    showSpinner: false,
    guideOpen: false,

    showReversalModal: false,

    // Status counters based on releasedStat
    countU: 0,
    countR: 0,
    countH: 0,
    countX: 0,
    countV: 0,
    countS: 0,
    grandTotal: 0,
  });

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    payeeCode,
    payeeName,
    startDate,
    endDate,
    status,
    rows,
    cols,
    jvNo,
    jvDate,
    showBranchModal,
    showPayeeModal,
    isLoading,
    showSpinner,
    guideOpen,
    showReversalModal,
    countU,
    countR,
    countH,
    countX,
    countV,
    countS,
    grandTotal,
  } = state;

  // 🔹 Modal state for Actions (status update, etc.)
  const [actionModal, setActionModal] = useState({
    open: false,
    row: null,
    status: "R", // 'R' or 'H'
    originalStatus: "", // normalized original: 'R','H','U',...
    releasedBy: "",
    receivedBy: "",
    receivedDate: useFormatToDate(new Date()),
    invoiceNo: "",
    remarks: "",
    // tabs & returned info
    activeTab: "release", // 'release' | 'return'
    returnedBy: "",
    returnedDate: "",
    returnedReason: "",
  });

  // Table ref
  const tableRef = useRef(null);

  // Spinner smoothing
  useEffect(() => {
    let t;
    if (isLoading) {
      t = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }
    return () => clearTimeout(t);
  }, [isLoading]);

  // Load column config once
  const loadedColsRef = useRef(false);
  useEffect(() => {
    if (loadedColsRef.current) return;
    let alive = true;
    (async () => {
      try {
        const result = await useSelectedHSColConfig(ENDPOINT);
        if (!alive || !Array.isArray(result)) return;

        const mappedCols = result.map((c) => ({ ...c }));

        const statusCol =
          mappedCols.find((c) => c.key === "docStatus") ||
          mappedCols.find((c) => c.key === "doc_status") ||
          mappedCols.find((c) => c.key === "releasedStat");

        if (statusCol) {
          statusCol.key = "docStatusView";
          statusCol.label = "Status";
        }

        setState((prev) => ({ ...prev, cols: mappedCols }));
        loadedColsRef.current = true;
      } catch (e) {
        console.error("Load column config failed:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 🔹 Inject actions config column (for gear button in table)
  const colsWithActions = useMemo(() => {
    if (!Array.isArray(cols) || cols.length === 0) return cols;

    const alreadyHasActions = cols.some((c) => c.renderType === "actions");
    if (alreadyHasActions) return cols;

    return [
      {
        key: "__actions",
        label: "Actions",
        renderType: "actions",
        sortable: false,
      },
      ...cols,
    ];
  }, [cols]);

  // Defaults (company + user/branch)
  const loadDefaults = useCallback(async () => {
    updateState({ showSpinner: true });
    try {
      const [hsCompany, hsUser] = await Promise.all([
        useTopCompanyRow(),
        useTopUserRow(user?.USER_CODE),
      ]);

      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const firstDayStr = useFormatToDate(firstDay);
      const todayStr = useFormatToDate(today);
      const lastDayStr = useFormatToDate(lastDay);

      updateState({
        startDate: firstDayStr,
        endDate: todayStr,
        jvDate: lastDayStr,
      });

      if (hsUser) {
        const hsBranch = await useTopBranchRow(hsUser.branchCode);
        updateState({
          branchCode: hsUser.branchCode,
          branchName: hsBranch?.branchName || hsUser.branchName,
        });
      }
    } catch (err) {
      console.error("Error loading defaults:", err);
    } finally {
      updateState({ showSpinner: false });
    }
  }, [user?.USER_CODE]);

  const handleReset = useCallback(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const firstDayStr = useFormatToDate(firstDay);
    const todayStr = useFormatToDate(today);
    const lastDayStr = useFormatToDate(lastDay);

    updateState({
      payeeCode: "",
      payeeName: "",
      rows: [],
      status: "",
      jvNo: "",
      jvDate: lastDayStr,
      startDate: firstDayStr,
      endDate: todayStr,
      countU: 0,
      countR: 0,
      countH: 0,
      countX: 0,
      countV: 0,
      countS: 0,
      grandTotal: 0,
    });
  }, []);

  // Compute summary totals (status counters only)
  const computeTotals = useCallback((list = []) => {
    if (!Array.isArray(list) || list.length === 0) {
      updateState({
        countU: 0,
        countR: 0,
        countH: 0,
        countX: 0,
        countV: 0,
        countS: 0,
        grandTotal: 0,
      });
      return;
    }

    const acc = list.reduce(
      (a, r) => {
        const rel =
          r.statusCode ||
          normalizeStatusCode(
            r.releasedStat || r.docStatus || r.doc_status || ""
          );

        switch (rel) {
          case "U":
            a.countU += 1;
            break;
          case "R":
            a.countR += 1;
            break;
          case "H":
            a.countH += 1;
            break;
          case "X":
            a.countX += 1;
            break;
          case "V":
            a.countV += 1;
            break;
          case "S":
            a.countS += 1;
            break;
          default:
            break;
        }

        return a;
      },
      {
        countU: 0,
        countR: 0,
        countH: 0,
        countX: 0,
        countV: 0,
        countS: 0,
      }
    );

    updateState({
      countU: acc.countU,
      countR: acc.countR,
      countH: acc.countH,
      countX: acc.countX,
      countV: acc.countV,
      countS: acc.countS,
      grandTotal: list.length,
    });
  }, []);

  // Find: load rows + decorate status
  const doFind = useCallback(
    async (stat = status) => {
      updateState({ isLoading: true });
      try {
        const resp = await fetchData(ENDPOINT, {
          json_data: {
            json_data: {
              branchCode,
              payeeCode,
              startDate,
              endDate,
              status: stat,
            },
          },
        });

        const parsed = resp?.data?.[0]?.result
          ? JSON.parse(resp.data[0].result)
          : [];
        const dt1 = parsed ?? [];

        const decorated = (Array.isArray(dt1) ? dt1 : []).map((r) => {
          const rawStatus = r.releasedStat || r.docStatus || r.doc_status || "";
          const code = normalizeStatusCode(rawStatus);

          return {
            ...r,
            statusCode: code, // normalized status code
            originalDocStatus: rawStatus, // raw from DB (for reference)
            docStatusView: buildStatusDisplay(rawStatus),
          };
        });

        updateState({
          rows: decorated,
        });

        computeTotals(decorated);
      } catch (e) {
        console.error("Find failed:", e);
      } finally {
        updateState({ isLoading: false });
      }
    },
    [branchCode, payeeCode, startDate, endDate, status, computeTotals]
  );

  // Initial defaults
  useEffect(() => {
    if (!user?.USER_CODE) return;
    (async () => {
      await loadDefaults();
      await handleReset();
    })();
  }, [user?.USER_CODE, loadDefaults, handleReset]);

  // Export (single "Export" button)
  const doExport = useCallback(async () => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    try {
      updateState({ isLoading: true });

      const exportData = {
        Data: {
          "Check Releasing Detailed": rows,
        },
      };

      const columnConfigsMap = {
        "Check Releasing Detailed": cols,
      };

      const payload = {
        ReportName: "Check Releasing Report",
        UserCode: currentUserRow?.userName,
        Branch: branchCode || "",
        JsonData: exportData,
        companyName: companyInfo?.compName,
        companyAddress: companyInfo?.compAddr,
        companyTelNo: companyInfo?.telNo,
      };

      await exportGenericHistoryExcel(payload, columnConfigsMap);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [rows, cols, branchCode, currentUserRow?.userName, companyInfo]);

  // Reversal load (using Ending Date as cutoff)
  const doLoadCWTReversal = useCallback(
    async (openModalAfter = false) => {
      if (!endDate) {
        await Swal.fire({
          icon: "warning",
          title: "Missing date",
          text: "Ending Date is missing.",
        });
        return;
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        await Swal.fire({
          icon: "info",
          title: "No data",
          text: "There are no records to filter. Please run Find first.",
        });
        return;
      }

      const isInRange = (dateStr) => {
        if (!dateStr) return false;
        const d = dateStr.substring(0, 10);
        if (endDate && d > endDate) return false;
        return true;
      };

      const filtered = rows.filter((r) => {
        const code =
          r.statusCode ||
          normalizeStatusCode(
            r.originalDocStatus || r.docStatus || r.doc_status || ""
          );

        const rowJV = (r.jvNo || r.jv_no || r.jvno || "").toString().trim();

        const rowReceivedDate =
          r.receivedDate || r.received_date || r.recvDate || "";

        return (
          code === "R" &&
          rowJV === "" &&
          isInRange(rowReceivedDate)
        );
      });

      if (!filtered.length) {
        await Swal.fire({
          icon: "info",
          title: "No matching records",
          text: "No records found with status Released, no JV No, and within the given Ending Date.",
        });
        return;
      }

      updateState({
        rows: filtered,
        showReversalModal: openModalAfter,
      });
      computeTotals(filtered);

      if (!openModalAfter) {
        await Swal.fire({
          icon: "success",
          title: "CWT loaded for reversal",
          text: `${filtered.length} record(s) found and loaded based on the criteria.`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    },
    [rows, endDate, computeTotals]
  );

  // ----- Header action handlers -----
  const onAction = (id) => {
    switch (id) {
      case "find":
        return doFind();
      case "reset":
        return handleReset();
      case "print":
        return window.print();
      case "export-query":
        return doExport();
      case "guide":
        return updateState({
          guideOpen: !guideOpen,
        });
      default:
        return;
    }
  };

  // 🔹 When gear/actions button is clicked in table → OPEN MODAL
  const handleRowActionsClick = useCallback(
    (row) => {
      const defaultUserName =
        user?.userName || currentUserRow?.userName || "";

      const code =
        row.statusCode ||
        normalizeStatusCode(
          row.originalDocStatus || row.docStatus || row.doc_status || ""
        );

      const formattedDate = row?.receivedDate
        ? useFormatToDate(row.receivedDate)
        : useGetCurrentDay();

      // If original is R or H → keep it. Otherwise → default to R
      const initialStatus = code === "R" || code === "H" ? code : "R";

      setActionModal({
        open: true,
        row,
        status: initialStatus, // 'R' or 'H'
        originalStatus: code || "", // normalized original
        releasedBy: row?.releasedBy || defaultUserName,
        receivedBy: row?.receivedBy || "",
        receivedDate: initialStatus === "H" ? "" : formattedDate,
        invoiceNo: row?.receiptNo || "",
        remarks: row?.releasedRemarks || "",
        activeTab: "release",
        returnedBy: row?.returnedBy,
        returnedDate: row?.returnedDate
          ? useFormatToDate(row.returnedDate)
          : "",
        returnedReason: row?.returnedRemarks || "",
      });
    },
    [user?.userName, currentUserRow?.userName]
  );

  const handleActionModalCancel = () => {
    setActionModal((prev) => ({ ...prev, open: false, row: null }));
  };

  const handleActionModalApply = async () => {
    if (!actionModal.row) {
      handleActionModalCancel();
      return;
    }

    const {
      row,
      status: statusCode, // may be 'R' or 'H'
      releasedBy,
      receivedBy,
      receivedDate,
      invoiceNo,
      remarks,
      originalStatus, // normalized: 'R','H','U',...
      returnedBy,
      returnedDate,
      returnedReason,
      activeTab,
    } = actionModal;

    const normalizedCurrentStatus = normalizeStatusCode(statusCode);
    const originalStatusCode = normalizeStatusCode(originalStatus);
    const isReleased = normalizedCurrentStatus === "R";

    // 🔁 Hard lock for Returned / Reversed / Stale: do nothing (Apply disabled anyway)
    if (["X", "V", "S"].includes(originalStatusCode)) {
      return;
    }

    // 🔹 VALIDATION depends on active tab
    if (activeTab === "release") {
      // HOLD → Remarks required
      if (
        normalizedCurrentStatus === "H" &&
        !String(remarks || "").trim()
      ) {
        await Swal.fire({
          icon: "warning",
          title: "Remarks required",
          text: "Remarks is required when status is set to HOLD.",
        });
        return;
      }

      // If current Status = Released → Released By, Received By, Received Date, Invoice No REQUIRED
      if (isReleased) {
        const missingFields = [];
        if (!String(releasedBy || "").trim())
          missingFields.push("Released By");
        if (!String(receivedBy || "").trim())
          missingFields.push("Received By");
        if (!String(receivedDate || "").trim())
          missingFields.push("Received Date");
        if (!String(invoiceNo || "").trim())
          missingFields.push("Invoice No");

        if (missingFields.length > 0) {
          await Swal.fire({
            icon: "warning",
            title: "Missing required fields",
            text:
              "The following field(s) are required when status is Released: " +
              missingFields.join(", "),
          });
          return;
        }

        // ✅ Extra rule: Received Date must be >= Doc Date
        const docDateStr = getRowDocDate(row);
        const docD = safeDateFromString(docDateStr);
        const recvD = safeDateFromString(receivedDate);

        if (docD && recvD && recvD < docD) {
          await Swal.fire({
            icon: "warning",
            title: "Invalid Received Date",
            text:
              "Received Date must be equal to or later than the Document Date.",
          });
          return;
        }
      }
    } else if (activeTab === "return") {
      // 🔴 When on Returned tab → Returned By, Returned Date, Reason are REQUIRED
      if (
        !String(returnedBy || "").trim() ||
        !String(returnedDate || "").trim() ||
        !String(returnedReason || "").trim()
      ) {
        await Swal.fire({
          icon: "warning",
          title: "Returned info required",
          text:
            "Returned By, Returned Date, and Reason are all required on the Returned Info tab.",
        });
        return;
      }

      // ✅ Extra rule: Returned Date must be >= Received Date
      const recvStr = receivedDate || getRowReceivedDate(row);
      const recvD = safeDateFromString(recvStr);
      const retD = safeDateFromString(returnedDate);

      if (recvD && retD && retD < recvD) {
        await Swal.fire({
          icon: "warning",
          title: "Invalid Returned Date",
          text:
            "Returned Date must be equal to or later than the Received Date.",
        });
        return;
      }
    }

    try {
      updateState({ isLoading: true });

      // 🔁 Final status:
      // - From Releasing tab → R or H (Released / Hold)
      // - From Returned tab  → X (Returned)
      let finalStatus = normalizedCurrentStatus;
      if (activeTab === "return") {
        finalStatus = "X"; // Returned
      }

      const payload = {
        json_data: {
          tranId: row.tran_id,
          status: finalStatus, // 🔁 send normalized + Returned as "X"
          releasedBy,
          receivedDate,
          receivedBy,
          invoiceNo,
          remarks,
          returnedBy,
          returnedDate,
          returnedReason,
        },
      };

      const { data: res } = await apiClient.post(
        "updateAPCKRL",
        payload
      );
      console.log(JSON.stringify(payload));

      if (res?.status !== "success") {
        await Swal.fire(
          "Check Releasing failed",
          res?.message ?? "Check Releasing failed.",
          "error"
        );
        return;
      }

      await doFind();

      await Swal.fire({
        icon: "success",
        title: "Update completed",
        text: "Document status has been updated successfully.",
        timer: 1800,
        showConfirmButton: false,
      });

      handleActionModalCancel();
    } catch (error) {
      console.error("Error updating CWT receiving:", error);
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: "An error occurred while updating the status. Please try again.",
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  const selectedRow = actionModal.row || {};

  // 🔁 Normalized original code
  const originalStatusCode = normalizeStatusCode(
    actionModal.originalStatus
  );

  // 🔁 Hard lock when original is Returned / Reversed / Stale
  const isAllLocked = ["X", "V", "S"].includes(originalStatusCode);

  // 🔁 Release fields locked when:
  // - Original is Released (R)  → cannot change release info
  // - Or X/V/S                  → view-only
  const isReleaseTabLocked =
    originalStatusCode === "R" || isAllLocked;

  const isRemarksRequired =
    normalizeStatusCode(actionModal.status) === "H" &&
    !String(actionModal.remarks || "").trim();

  // 🔁 Show Returned tab for all EXCEPT original UnReleased
  //    (Hide when U; show when R/H/X/V/S)
  const showReturnTab = originalStatusCode !== "U";

  // 🔁 For optional button disabling on Returned tab
  const isReturnMissing =
    actionModal.activeTab === "return" &&
    (!String(actionModal.returnedBy || "").trim() ||
      !String(actionModal.returnedDate || "").trim() ||
      !String(actionModal.returnedReason || "").trim());

  // 🔁 Apply button disabled rules
  const applyDisabled =
    isLoading ||
    isAllLocked || // X/V/S → view only
    (actionModal.activeTab === "release" &&
      originalStatusCode === "R") || // cannot re-release already released
    (actionModal.activeTab === "return" &&
      originalStatusCode === "X") || // cannot re-return already returned
    (actionModal.activeTab === "return" &&
      isReturnMissing); // force entry of return info

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      {/* spacer below fixed bar */}
      <div style={{ height: barH }} />

      {/* Fixed header bar - mobile friendly */}
      <div
        ref={barRef}
        className="fixed left-0 right-0 z-40 bg-white/95 backdrop-blur supports-backdrop-blur:bg-white/80 border-b shadow-sm"
        style={{ top: headerH }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-6 py-2">
          {/* Title tab */}
          <div className="flex flex-row gap-2">
            <span className="flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <FontAwesomeIcon
                icon={faDatabase}
                className="w-4 h-4 mr-2"
              />
              Check Releasing and Return
            </span>
          </div>

          {/* Toolbar - wraps under title on mobile */}
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-1 lg:gap-2 w-full sm:w-auto">
            <button
              onClick={() => onAction("find")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />{" "}
              <span className="hidden lg:inline ml-2">Find</span>
            </button>

            <button
              onClick={() => onAction("reset")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
            >
              <FontAwesomeIcon icon={faUndo} />{" "}
              <span className="hidden lg:inline ml-2">Reset</span>
            </button>

            <button
              onClick={() => onAction("print")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
            >
              <FontAwesomeIcon icon={faPrint} />{" "}
              <span className="hidden lg:inline ml-2">Print</span>
            </button>

            {/* EXPORT */}
            <button
              onClick={() => onAction("export-query")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
            >
              <FontAwesomeIcon icon={faFileExport} />
              <span className="hidden lg:inline ml-2">Export</span>
            </button>

            {/* Guide dropdown */}
            <div className="relative">
              <button
                onClick={() => onAction("guide")}
                className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
              >
                <FontAwesomeIcon icon={faInfoCircle} />{" "}
                <span className="hidden lg:inline ml-2">Guide</span>
              </button>
              {guideOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600">
                  <button
                    onClick={() =>
                      window.open(
                        "/public/NAYSA Check Releasing.pdf",
                        "_blank"
                      )
                    }
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <FontAwesomeIcon
                      icon={faFileLines}
                      className="mr-2"
                    />
                    PDF Guide
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Header sections */}
      <div id="summary" className="global-tran-tab-div-ui">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* Customer Details */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon
                  className="text-blue-600"
                  icon={faUser}
                />
                Customer Details
              </h3>

              {/* Branch */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <input
                    type="text"
                    id="branchName"
                    placeholder=" "
                    value={branchName}
                    readOnly
                    className="peer global-tran-textbox-ui cursor-pointer"
                  />
                  <label
                    htmlFor="branchName"
                    className="global-tran-floating-label"
                  >
                    Branch
                  </label>
                  <button
                    type="button"
                    className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
                    onClick={() =>
                      updateState({ showBranchModal: true })
                    }
                    disabled={isLoading}
                    aria-label="Find Branch"
                    title="Find Branch"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </div>

              {/* Customer Code */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <input
                    type="text"
                    id="payeeCode"
                    placeholder=" "
                    value={payeeCode}
                    onChange={(e) =>
                      updateState({ payeeCode: e.target.value })
                    }
                    className="peer global-tran-textbox-ui"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="payeeCode"
                    className="global-tran-floating-label"
                  >
                    Customer Code
                  </label>
                  <button
                    type="button"
                    className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
                    onClick={() =>
                      updateState({ showPayeeModal: true })
                    }
                    disabled={isLoading}
                    aria-label="Find Customer"
                    title="Find Customer"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </div>

              {/* Customer Name */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <input
                    type="text"
                    id="payeeName"
                    placeholder=" "
                    value={payeeName}
                    readOnly
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="payeeName"
                    className="global-tran-floating-label"
                  >
                    Customer Name
                  </label>
                </div>
              </div>
            </section>

            {/* Date Range + Status */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon
                  className="text-blue-600"
                  icon={faCalendarAlt}
                />
                Date Range
              </h3>

              {/* Starting Date */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <input
                    type="date"
                    id="startDate"
                    placeholder=" "
                    value={startDate}
                    onChange={(e) =>
                      updateState({ startDate: e.target.value })
                    }
                    className="peer global-tran-textbox-ui"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="startDate"
                    className="global-tran-floating-label"
                  >
                    Starting Date
                  </label>
                </div>
              </div>

              {/* Ending Date */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <input
                    type="date"
                    id="endDate"
                    placeholder=" "
                    value={endDate}
                    onChange={(e) =>
                      updateState({ endDate: e.target.value })
                    }
                    className="peer global-tran-textbox-ui"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="endDate"
                    className="global-tran-floating-label"
                  >
                    Ending Date
                  </label>
                </div>
              </div>

              {/* Check Status */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <select
                    id="status"
                    value={status}
                    onChange={(e) =>
                      updateState({ status: e.target.value })
                    }
                    className="peer global-tran-textbox-ui pr-8"
                    disabled={isLoading}
                  >
                    <option value=""></option>
                    <option value="U">U - UnReleased</option>
                    <option value="R">R - Released</option>
                    <option value="H">H - Hold</option>
                    <option value="X">X - Returned</option>
                    <option value="V">V - Reversed</option>
                    <option value="S">S - Stale</option>
                  </select>
                  <label
                    htmlFor="status"
                    className="global-tran-floating-label"
                  >
                    Check Status
                  </label>
                  <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="text-xs"
                    />
                  </span>
                </div>
              </div>
            </section>

            {/* Status Summary */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon
                  className="text-blue-600"
                  icon={faFileLines}
                />
                Status Summary
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="border rounded-lg px-3 py-2 bg-slate-50">
                  <div className="text-[10px] uppercase text-slate-500">
                    U - UnReleased
                  </div>
                  <div className="text-lg font-semibold text-slate-800">
                    {countU}
                  </div>
                </div>

                <div className="border rounded-lg px-3 py-2 bg-slate-50">
                  <div className="text-[10px] uppercase text-slate-500">
                    R - Released
                  </div>
                  <div className="text-lg font-semibold text-slate-800">
                    {countR}
                  </div>
                </div>

                <div className="border rounded-lg px-3 py-2 bg-slate-50">
                  <div className="text-[10px] uppercase text-slate-500">
                    H - Hold
                  </div>
                  <div className="text-lg font-semibold text-slate-800">
                    {countH}
                  </div>
                </div>

                <div className="border rounded-lg px-3 py-2 bg-slate-50">
                  <div className="text-[10px] uppercase text-slate-500">
                    X - Returned
                  </div>
                  <div className="text-lg font-semibold text-slate-800">
                    {countX}
                  </div>
                </div>

                <div className="border rounded-lg px-3 py-2 bg-slate-50">
                  <div className="text-[10px] uppercase text-slate-500">
                    V - Reversed
                  </div>
                  <div className="text-lg font-semibold text-slate-800">
                    {countV}
                  </div>
                </div>

                <div className="border rounded-lg px-3 py-2 bg-slate-50">
                  <div className="text-[10px] uppercase text-slate-500">
                    S - Stale
                  </div>
                  <div className="text-lg font-semibold text-slate-800">
                    {countS}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Grand Total
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {grandTotal}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Detailed Table ONLY */}
      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Detailed
            </button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
          <div className="max-h-[600px] overflow-y-auto relative">
            <SearchGlobalReportTable
              ref={tableRef}
              columns={colsWithActions}
              data={rows}
              itemsPerPage={50}
              rightActionLabel="View"
              onRowAction={(row) => {
                const url = `${window.location.origin}${row.pathUrl}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              onRowActionsClick={handleRowActionsClick}
            />
          </div>
        </div>
      </div>

      {/* Global Posting Modal for CWT Reversal */}
      {showReversalModal && (
        <GlobalGLPostingModalv1
          data={rows}
          colConfigData={cols}
          title="Generate CWT Reversal Posting"
          btnCaption="Generate & Post Reversal"
          userPassword={userPassword}
          onClose={() => updateState({ showReversalModal: false })}
          onPost={handlePost}
          remoteLoading={isLoading}
          onViewDocument={(row) => {
            const url = `${window.location.origin}${row.pathUrl}`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        />
      )}

    {/* Actions Modal (for single row status update) */}
    {actionModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-2 sm:px-0">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-4">
          {/* Header with document info */}
          <div className="mb-3 border-b pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faFileLines} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">
                    Update Check Status
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Apply status and remarks for this document.
                  </p>
                </div>
              </div>

              {/* Status pill */}
              <span
                className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                  originalStatusCode === "R"
                    ? "bg-blue-100 text-blue-700"
                    : originalStatusCode === "H"
                    ? "bg-red-100 text-red-700"
                    : originalStatusCode === "X"
                    ? "bg-gray-100 text-gray-700"
                    : originalStatusCode === "V"
                    ? "bg-purple-100 text-purple-700"
                    : originalStatusCode === "S"
                    ? "bg-black/10 text-black"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {originalStatusCode === "R"
                  ? "🔵 Released"
                  : originalStatusCode === "H"
                  ? "🔴 Hold"
                  : originalStatusCode === "X"
                  ? "⚪ Returned"
                  : originalStatusCode === "V"
                  ? "🟣 Reversed"
                  : originalStatusCode === "S"
                  ? "⚫ Stale"
                  : "🟢 UnReleased"}
              </span>
            </div>

            {/* Doc info row - compressed */}
            <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <div className="uppercase tracking-wide text-gray-400">Branch</div>
                <div className="font-mono text-gray-800 text-[11px]">
                  {selectedRow.branchCode || "—"}
                </div>
              </div>
              <div>
                <div className="uppercase tracking-wide text-gray-400">Doc</div>
                <div className="font-mono text-gray-800 text-[11px]">
                  {selectedRow.docCode || "—"}
                </div>
              </div>
              <div>
                <div className="uppercase tracking-wide text-gray-400">No.</div>
                <div className="font-mono text-gray-800 text-[11px]">
                  {selectedRow.docNo || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs for Releasing / Returned Info */}
          <div className="mb-3 border-b border-gray-200">
            <div className="flex text-[11px]">
              <button
                type="button"
                onClick={() =>
                  setActionModal((prev) => ({
                    ...prev,
                    activeTab: "release",
                  }))
                }
                className={`px-3 py-2 border-b-2 ${
                  actionModal.activeTab === "release"
                    ? "border-blue-600 text-blue-700 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Releasing Info
              </button>

              {showReturnTab && (
                <button
                  type="button"
                  onClick={() =>
                    setActionModal((prev) => ({
                      ...prev,
                      activeTab: "return",
                    }))
                  }
                  className={`px-3 py-2 border-b-2 ${
                    actionModal.activeTab === "return"
                      ? "border-blue-600 text-blue-700 font-semibold"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Returned Info
                </button>
              )}
            </div>
          </div>

          {/* Body fields - Releasing Info (2-column layout) */}
          {actionModal.activeTab === "release" && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Status */}
                <div>
                  <label className="block mb-1 text-gray-700">Status</label>
                  <select
                    value={actionModal.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setActionModal((prev) => ({
                        ...prev,
                        status: newStatus,
                        receivedDate:
                          normalizeStatusCode(newStatus) === "H"
                            ? ""
                            : prev.receivedDate || useGetCurrentDay(),
                      }));
                    }}
                    disabled={isReleaseTabLocked}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="R">R - Released</option>
                    <option value="H">H - Hold</option>
                  </select>
                </div>

                {/* Received Date */}
                <div>
                  <label className="block mb-1 text-gray-700">Received Date</label>
                  <input
                    type="date"
                    value={actionModal.receivedDate || ""}
                    onChange={(e) =>
                      setActionModal((prev) => ({
                        ...prev,
                        receivedDate: e.target.value,
                      }))
                    }
                    readOnly={isReleaseTabLocked}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Released By */}
                <div>
                  <label className="block mb-1 text-gray-700">Released By</label>
                  <input
                    type="text"
                    value={actionModal.releasedBy}
                    onChange={(e) =>
                      setActionModal((prev) => ({
                        ...prev,
                        releasedBy: e.target.value,
                      }))
                    }
                    readOnly={isReleaseTabLocked}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Received By */}
                <div>
                  <label className="block mb-1 text-gray-700">Received By</label>
                  <input
                    type="text"
                    value={actionModal.receivedBy}
                    onChange={(e) =>
                      setActionModal((prev) => ({
                        ...prev,
                        receivedBy: e.target.value,
                      }))
                    }
                    readOnly={isReleaseTabLocked}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Invoice No (full width) */}
              <div>
                <label className="block mb-1 text-gray-700">Invoice No</label>
                <input
                  type="text"
                  value={actionModal.invoiceNo}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      invoiceNo: e.target.value,
                    }))
                  }
                  readOnly={isReleaseTabLocked}
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="Enter invoice number..."
                />
              </div>

              {/* Extended Remarks (full width, low rows) */}
              <div>
                <label className="block mb-1 text-gray-700">
                  Extended Remarks{" "}
                  {normalizeStatusCode(actionModal.status) === "H" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={actionModal.remarks}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                  readOnly={isReleaseTabLocked}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 resize-none ${
                    isRemarksRequired ? "border-red-500" : ""
                  }`}
                  placeholder="Enter remarks..."
                />
                {isRemarksRequired && !isReleaseTabLocked && (
                  <p className="mt-1 text-[10px] text-red-500">
                    Remarks is required when status is HOLD.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Body fields - Returned Info (2-column layout) */}
          {actionModal.activeTab === "return" && showReturnTab && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Returned Status (read-only) */}
                <div>
                  <label className="block mb-1 text-gray-700">Status</label>
                  <input
                    type="text"
                    value="Returned"
                    readOnly
                    className="w-full border rounded px-2 py-1 text-xs bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                </div>

                {/* Returned Date */}
                <div>
                  <label className="block mb-1 text-gray-700">
                    Returned Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={actionModal.returnedDate || ""}
                    onChange={(e) =>
                      setActionModal((prev) => ({
                        ...prev,
                        returnedDate: e.target.value,
                      }))
                    }
                    disabled={isAllLocked}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>

                {/* Returned By */}
                <div>
                  <label className="block mb-1 text-gray-700">
                    Returned By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={actionModal.returnedBy}
                    onChange={(e) =>
                      setActionModal((prev) => ({
                        ...prev,
                        returnedBy: e.target.value,
                      }))
                    }
                    disabled={isAllLocked}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="Enter name..."
                  />
                </div>

                {/* Reason (full-width on sm via col-span-2) */}
                <div className="sm:col-span-2">
                  <label className="block mb-1 text-gray-700">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={actionModal.returnedReason}
                    onChange={(e) =>
                      setActionModal((prev) => ({
                        ...prev,
                        returnedReason: e.target.value,
                      }))
                    }
                    disabled={isAllLocked}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 resize-none disabled:bg-gray-100"
                    placeholder="Enter reason for returning the check..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleActionModalCancel}
              className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleActionModalApply}
              className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={applyDisabled}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    )}


      {/* Lookup Modals */}
      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}
      {showPayeeModal && (
        <PayeeMastLookupModal
          isOpen={showPayeeModal}
          onClose={(selectedPayee) => {
            if (selectedPayee) {
              updateState({
                payeeCode: selectedPayee.payeeCode,
                payeeName: selectedPayee.payeeName,
              });
            }
            updateState({ showPayeeModal: false });
          }}
        />
      )}
    </div>
  );
}
