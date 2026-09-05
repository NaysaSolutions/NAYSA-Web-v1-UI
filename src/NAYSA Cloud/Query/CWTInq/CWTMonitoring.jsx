import {
  useState,
  useEffect,
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
  faNoteSticky,
  faUndo,
  faListCheck,
  faEraser,
  faInbox,
  faPause,
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
import {
  formatNumber,
  parseFormattedNumber,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import GlobalGLPostingModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalGLPostingv1.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import Swal from "sweetalert2";
import {
  useGetCurrentDay,
  useFormatToDate,
} from "@/NAYSA Cloud/Global/dates";
import { useSwalSuccessAlert,} from '@/NAYSA Cloud/Global/behavior.jsx';

const ENDPOINT = "getARCWLCLInquiry";

// --- Helper: build icon + text display string for status ---
function buildStatusDisplay(code) {
  const status = (code || "").toString().trim().toUpperCase();
  switch (status) {
    case "R":
      return "🔵 Received";
    case "O":
      return "🟢 Open";
    case "H":
      return "🔴 Hold";
    default:
      return status || "";
  }
}

export default function CWTMonitoring() {
  const { user, companyInfo, currentUserRow, getAllDropDown } = useAuth();
  const isCwvatEnabled = String(companyInfo?.oeCWVat || "").toUpperCase() === "E";
  const [userPassword, setUserPassword] = useState(null);
  const [selectedCwtKeys, setSelectedCwtKeys] = useState([]);
  // ----- App state -----
  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    custCode: "",
    custName: "",
    accountClass: "CWTCL",
    isAccountLocked: false,

    // Date range & status
    startDate: "",
    endDate: "",
    status: "", // R / O / H

    rows: [],
    cols: [],

    baseAmount: "0.00",
    atcAmount: "0.00",

    // Journal Voucher header fields
    jvNo: "",
    jvDate: "",
    recvFromDate: "",
    recvToDate: "",

    showBranchModal: false,
    showCustomerModal: false,
    isLoading: false,
    showSpinner: false,
    guideOpen: false,

    // dropdown menus
    showGenerateMenu: false, // "Action" dropdown
    showReversalModal: false, // <-- NEW STATE FOR MODAL
  });

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    custCode,
    custName,
    accountClass,
    isAccountLocked,
    startDate,
    endDate,
    status,
    rows,
    cols,
    baseAmount,
    atcAmount,
    jvNo,
    jvDate,
    recvFromDate,
    recvToDate,
    showBranchModal,
    showCustomerModal,
    isLoading,
    showSpinner,
    guideOpen,
    showGenerateMenu,
    showReversalModal, // <-- DESTRUCTURE NEW STATE
  } = state;

  // 🔹 Modal state for Actions (status update, etc.)
  const [actionModal, setActionModal] = useState({
    open: false,
    row: null,
    rows: [],
    isBatch: false,
    batchStatus: "",
    status: "R",
    originalStatus: "",
    receivedBy: "",
    receivedDate: useFormatToDate(new Date()),
    remarks: "",
  });

  // Table ref
  const tableRef = useRef(null);
  const cwtTableContainerRef = useRef(null);

  useEffect(() => {
    const container = cwtTableContainerRef.current;
    if (!container) return;

    const applySelectionHighlight = () => {
      container
        .querySelectorAll("thead th:first-child, tbody td:first-child, tfoot td:first-child")
        .forEach((actionCell) => {
          actionCell.style.width = "96px";
          actionCell.style.minWidth = "96px";
          actionCell.style.maxWidth = "96px";
        });

      container.querySelectorAll("tbody tr").forEach((tableRow) => {
        const rowText = tableRow.textContent || "";
        const matchingRow = rows.find((row) =>
          [row?.docCode, row?.docNo, row?.atcCode]
            .filter(Boolean)
            .every((value) => rowText.includes(String(value)))
        );
        const rowKey = matchingRow
          ? `${matchingRow?.tran_id || ""}::${matchingRow?.atcCode || ""}`
          : "";
        const isSelected = selectedCwtKeys.includes(rowKey);

        tableRow.querySelectorAll("td").forEach((cell) => {
          cell.style.backgroundColor = isSelected ? "#bfdbfe" : "";
        });

        const actionContainer = tableRow.querySelector("td:first-child > div");
        if (!actionContainer || !matchingRow) return;
        actionContainer.style.gap = "6px";

        let checkbox = actionContainer.querySelector("input[data-cwt-select]");
        if (!checkbox) {
          checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.dataset.cwtSelect = "true";
          checkbox.title = "Select for batch update";
          checkbox.className = "h-4 w-4 cursor-pointer accent-blue-600";
          checkbox.addEventListener("click", (event) => event.stopPropagation());
          checkbox.addEventListener("change", () => {
            setSelectedCwtKeys((current) =>
              current.includes(rowKey)
                ? current.filter((key) => key !== rowKey)
                : [...current, rowKey]
            );
          });
          actionContainer.appendChild(checkbox);
        }

        checkbox.checked = isSelected;
        checkbox.disabled = String(
          matchingRow?.originalDocStatus || matchingRow?.docStatus || ""
        ).trim().toUpperCase() === "R";
      });
    };

    applySelectionHighlight();
    const observer = new MutationObserver(applySelectionHighlight);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [rows, selectedCwtKeys]);

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

  // Close Action menu when clicking outside
  const generateMenuRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        generateMenuRef.current &&
        !generateMenuRef.current.contains(e.target) &&
        showGenerateMenu
      ) {
        updateState({ showGenerateMenu: false });
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showGenerateMenu]);

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

        // 🔹 Find the status column and point it to docStatusView (icon + text)
        const statusCol =
          mappedCols.find((c) => c.key === "docStatus") ||
          mappedCols.find((c) => c.key === "doc_status");

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

  // 🔹 Inject actions config column (for gear button)
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
        recvFromDate: firstDayStr,
        recvToDate: todayStr,
        jvDate:lastDayStr
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
      custCode: "",
      custName: "",
      accountClass: "CWTCL",
      isAccountLocked: false,
      rows: [],
      baseAmount: "0.00",
      atcAmount: "0.00",
      status: "",
      jvNo: "",
      jvDate: lastDayStr,
      recvFromDate: firstDayStr,
      recvToDate: todayStr,
      startDate: firstDayStr,
      endDate: todayStr,
    });
    setSelectedCwtKeys([]);
    tableRef.current?.clearAllState();
  }, []);

  // Compute summary totals (still computed, not displayed)
  const computeTotals = useCallback((list = []) => {
    if (!Array.isArray(list) || list.length === 0) {
      updateState({
        atcAmount: "0.00",
        baseAmount: "0.00",
      });
      return;
    }
    const acc = list.reduce(
      (a, r) => {
        a.atcAmount += parseFormattedNumber(r.atcAmt) || 0;
        a.baseAmount += parseFormattedNumber(r.baseAmt) || 0;
        return a;
      },
      { atcAmount: 0, baseAmount: 0 }
    );
    updateState({
      atcAmount: formatNumber(acc.atcAmount),
      baseAmount: formatNumber(acc.baseAmount),
    });
  }, []);

  // Find: load rows + decorate status
  const doFind = useCallback(async (stat=status) => {
    updateState({ isLoading: true, isAccountLocked: true });
    try {
      const resp = await fetchData(ENDPOINT, {
        json_data: {
          json_data: {
            branchCode,
            custCode,
            accountClass: isCwvatEnabled ? accountClass : "CWTCL",
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
        const rawStatus = (r.docStatus || r.doc_status || "").toString();
        return {
          ...r,
          originalDocStatus: rawStatus, // keep original
          docStatusView: buildStatusDisplay(rawStatus), // icon + text
        };
      });

      updateState({
        rows: decorated,
      });
      setSelectedCwtKeys([]);

      computeTotals(decorated);
    } catch (e) {
      console.error("Find failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, custCode, accountClass, isCwvatEnabled, startDate, endDate, status, computeTotals]);

  const accountClassOptions = useMemo(
    () =>
      (getAllDropDown("CWT_ACCOUNT", "CWT") || []).map((item) => ({
        value: item.DROPDOWN_CODE,
        label: item.DROPDOWN_NAME,
      })),
    [getAllDropDown]
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
          "CWT Inquiry Detailed": rows,
        },
      };

      const columnConfigsMap = {
        "CWT Inquiry Detailed": cols,
      };

      const payload = {
        ReportName: "CWT Inquiry Report",
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


// NEW: Action handlers for Reversal
const doLoadCWTReversal = useCallback(
  async (openModalAfter = false) => {
    // Basic validations
    if (!recvFromDate || !recvToDate) {
      await Swal.fire({
        icon: "warning",
        title: "Missing dates",
        text: "Please provide Received From Date and Received To Date.",
      });
      return;
    }

    if (recvFromDate > recvToDate) {
      await Swal.fire({
        icon: "error",
        title: "Invalid date range",
        text: "Received From Date cannot be greater than Received To Date.",
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

    // Helper: check if date string is within range (yyyy-mm-dd)
    const isInRange = (dateStr) => {
      if (!dateStr) return false;
      const d = dateStr.substring(0, 10); // in case full datetime is returned
      if (recvFromDate && d < recvFromDate) return false;
      if (recvToDate && d > recvToDate) return false;
      return true;
    };

    const filtered = rows.filter((r) => {
      // Status: use originalDocStatus then fallbacks
      const rawStatus = (
        r.originalDocStatus ||
        r.docStatus ||
        r.doc_status ||
        ""
      )
        .toString()
        .trim()
        .toUpperCase();

      // JV No on the row should be blank
      const rowJV = (r.jvNo || r.jv_no || r.jvno || "")
        .toString()
        .trim();

      // Received date on the row (adjust field name as needed)
      const rowReceivedDate =
        r.receivedDate || r.received_date || r.recvDate || "";

      return (
        rawStatus === "R" &&
        rowJV === "" &&
        isInRange(rowReceivedDate)
      );
    });

    if (!filtered.length) {
      await Swal.fire({
        icon: "info",
        title: "No matching records",
        text: "No records found with status RECEIVED, no JV No, and within the given Received date range.",
      });
      return;
    }

    // Update table + totals + (optionally) open modal
    updateState({
      rows: filtered,
      showGenerateMenu: false,
      showReversalModal: openModalAfter, // ➜ open modal if called from Generate
    });
    computeTotals(filtered);


    if (!openModalAfter) {
      useSwalSuccessAlert(
        "Success",
        `CWT Loaded for Reversal - ${filtered.length} record(s) found.`
      );
    }
   

  },
  [rows, recvFromDate, recvToDate, computeTotals]
);



// NEW: Function to open the Global Posting Modal with the filtered data
const doGenerateCWTReversal = useCallback(
  async () => {
    // Must have base data (from Find)
    if (!Array.isArray(rows) || rows.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "No data to generate",
        text: "Please run Find first to load records.",
      });
      return;
    }

    // Reuse same filter logic as 'Load CWT for Reversal'
    // but also open the modal afterwards
    await doLoadCWTReversal(true);
  },
  [rows, doLoadCWTReversal]
);



  // // NEW: Action handlers for Reversal
  // const doLoadCWTReversal = useCallback(async () => {
  //   // Basic validations
  //   if (!recvFromDate || !recvToDate) {
  //     await Swal.fire({
  //       icon: "warning",
  //       title: "Missing dates",
  //       text: "Please provide Received From Date and Received To Date.",
  //     });
  //     return;
  //   }

  //   if (recvFromDate > recvToDate) {
  //     await Swal.fire({
  //       icon: "error",
  //       title: "Invalid date range",
  //       text: "Received From Date cannot be greater than Received To Date.",
  //     });
  //     return;
  //   }

  //   if (!Array.isArray(rows) || rows.length === 0) {
  //     await Swal.fire({
  //       icon: "info",
  //       title: "No data",
  //       text: "There are no records to filter. Please run Find first.",
  //     });
  //     return;
  //   }

  //   // Helper: check if date string is within range (yyyy-mm-dd)
  //   const isInRange = (dateStr) => {
  //     if (!dateStr) return false;
  //     const d = dateStr.substring(0, 10); // in case full datetime is returned
  //     if (recvFromDate && d < recvFromDate) return false;
  //     if (recvToDate && d > recvToDate) return false;
  //     return true;
  //   };

  //   const filtered = rows.filter((r) => {
  //     // Status: use originalDocStatus then fallbacks
  //     const rawStatus = (
  //       r.originalDocStatus ||
  //       r.docStatus ||
  //       r.doc_status ||
  //       ""
  //     )
  //       .toString()
  //       .trim()
  //       .toUpperCase();

  //     // JV No on the row should be blank
  //     const rowJV = (r.jvNo || r.jv_no || r.jvno || "")
  //       .toString()
  //       .trim();

  //     // Received date on the row (adjust field name as needed)
  //     const rowReceivedDate =
  //       r.receivedDate || r.received_date || r.recvDate || "";

  //     return (
  //       rawStatus === "R" &&
  //       rowJV === "" &&
  //       isInRange(rowReceivedDate)
  //     );
  //   });

  //   if (!filtered.length) {
  //     await Swal.fire({
  //       icon: "info",
  //       title: "No matching records",
  //       text: "No records found with status RECEIVED, no JV No, and within the given Received date range.",
  //     });
  //     return;
  //   }

  //   // Update table + totals
  //   updateState({ rows: filtered }); // <--- Filtered data is stored here
  //   computeTotals(filtered);

  //   await Swal.fire({
  //     icon: "success",
  //     title: "CWT loaded for reversal",
  //     text: `${filtered.length} record(s) found and loaded based on the criteria.`,
  //     timer: 2000,
  //     showConfirmButton: false,
  //   });
  // }, [rows, recvFromDate, recvToDate, computeTotals]);




  // // NEW: Function to open the Global Posting Modal with the filtered data
  // const doGenerateCWTReversal = useCallback(async () => {
  //   // 🔹 Check if data is loaded and filtered
  //   if (!Array.isArray(rows) || rows.length === 0) {
  //     await Swal.fire({
  //       icon: "info",
  //       title: "No data to generate",
  //       text: "Please run 'Load CWT for Reversal' first to fetch and filter records.",
  //     });
  //     return;
  //   }

  //   // 🔹 Open the modal and close the dropdown menu
  //   updateState({
  //     showReversalModal: true,
  //     showGenerateMenu: false,
  //   });
  // }, [rows]);

  // ----- Action handlers (inline ActionBar) -----
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
      case "load-cwt-reversal":
        return doLoadCWTReversal();
      case "gen-cwt-reversal":
        return doGenerateCWTReversal();
      case "guide":
        return updateState({
          guideOpen: !guideOpen,
          showGenerateMenu: false,
        });
      case "pdf":
        return window.open("/public/NAYSA CWT Inquiry.pdf", "_blank");
      default:
        return;
    }
  };

  // 🔹 When gear/actions button is clicked in table → OPEN MODAL
  const handleRowActionsClick = useCallback(
    (row) => {
      const defaultUserName = user?.userName || currentUserRow?.userName || "";

      const rawStatus = (
        row?.originalDocStatus ||
        row?.docStatus ||
        row?.doc_status ||
        ""
      )
        .toString()
        .trim()
        .toUpperCase();

      const formattedDate = row?.receivedDate
        ? useFormatToDate(row.receivedDate)
        : useGetCurrentDay();

      // Initial status behavior:
      // - If original status is 'O' or blank → default to 'R'
      // - Else keep whatever the row has (R or H)
      const initialStatus =
        rawStatus === "O" || !rawStatus ? "R" : rawStatus;

      setActionModal({
        open: true,
        row,
        rows: [row],
        isBatch: false,
        batchStatus: "",
        status: initialStatus,
        originalStatus: rawStatus || "",
        receivedBy: row?.receivedBy || defaultUserName,
        receivedDate: initialStatus === "H" ? "" : formattedDate,
        remarks: row?.extRemarks || "",
      });
    },
    [user?.userName, currentUserRow?.userName]
  );

  const handleActionModalCancel = () => {
    setActionModal((prev) => ({ ...prev, open: false, row: null, rows: [] }));
  };

  const openBatchStatusModal = useCallback((batchStatus) => {
    const selectedSet = new Set(selectedCwtKeys);
    const selectedRows = rows.filter((row) =>
      selectedSet.has(`${row?.tran_id || ""}::${row?.atcCode || ""}`)
    );

    if (selectedRows.length === 0) {
      Swal.fire("No Selection", "Select at least one CWT document.", "info");
      return;
    }

    const defaultUserName = user?.userName || currentUserRow?.userName || "";
    setActionModal({
      open: true,
      row: selectedRows[0],
      rows: selectedRows,
      isBatch: true,
      batchStatus,
      status: batchStatus,
      originalStatus: "",
      receivedBy: defaultUserName,
      receivedDate: batchStatus === "H" ? "" : useGetCurrentDay(),
      remarks: "",
    });
  }, [selectedCwtKeys, rows, user?.userName, currentUserRow?.userName]);

  const handlePost = async (selectedData, userPw) => {
   
            updateState({ isLoading: true });
           
            try {

              const payload = {
                userCode : currentUserRow.userCode,
                userPassword: userPw,
                json_data: {
                 userCode : currentUserRow.userCode,
                 jvDate: jvDate,
                 branchCode:branchCode,
                  dt1: selectedData.map((groupId, idx) => ({
                    lnNo: idx + 1, // number (safer for SQL)
                    groupId,
                  })),
                },
                };
 
                const { data: res } = await apiClient.post("generateJVARCWLCL", payload);        
                if (res?.success) {
                  updateState({ status: "O" });
                  await doFind("O");
                  useSwalSuccessAlert("Success", "JV Successfully Completed");
                }
                    
              updateState({ showReversalModal: false });
          
           } catch (err) {
               const status = err?.response?.status;
               const data   = err?.response?.data || {};
               const code   = data.error || "";
               const msg    = data.message || "Something went wrong.";

                console.log(err)
           
               // --- Soft/business validation (do NOT logout) ---
               if (status === 422) {
                 if (code === "INVALID_CREDENTIALS") {
                   Swal.fire("Invalid password", msg || "Please try again.", "warning");
                   return { success: false, code, message: msg };
                 }
                 if (code === "MISSING_CREDENTIALS" || code === "VALIDATION_ERROR" || !data?.error) {
                   Swal.fire("Missing credentials", msg, "info");
                   return { success: false, code: code || "MISSING_CREDENTIALS", message: msg };
                 }
               }
           
               // --- True permission issues (still no auto-logout here; interceptor handles that globally) ---
               if (status === 403 && (code === "USER_INACTIVE" || code === "USER_MISMATCH")) {
                 const title = code === "USER_INACTIVE" ? "Blocked" : "Blocked";
                 const text  = code === "USER_INACTIVE" ? (msg || "User is inactive.") : "Authenticated user does not match userCode.";
                 Swal.fire(title, text, "warning");
                 return { success: false, code, message: text };
               }
           
               // Unknown errors
               Swal.fire("Error", msg, "error");
               return { success: false, code: code || "UNKNOWN", message: msg };

            } finally {
              updateState({ isLoading: false });
            }
  };



  const handleActionModalApply = async () => {
    if (!actionModal.row) {
      handleActionModalCancel();
      return;
    }

    const { row, rows: selectedRows, isBatch, status, batchStatus, receivedBy, receivedDate, remarks } =
      actionModal;
    const newStatus = isBatch ? batchStatus : status;

    // Remarks mandatory when status = 'H'
    if (newStatus === "H" && !String(remarks || "").trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Remarks required",
        text: "Remarks is required when status is set to HOLD.",
      });
      return;
    }

    try {
      updateState({ isLoading: true });

      const payload = {
        json_data: {
          tranId: row.tran_id,
          atcCode: row.atcCode,
          dt1: isBatch
            ? selectedRows.map((item) => ({
                tranId: item.tran_id,
                atcCode: item.atcCode,
              }))
            : undefined,
          status: newStatus,
          receivedDate,
          receivedBy,
          remarks,
        },
      };

      const { data: res } = await apiClient.post(
        isBatch ? "updateBatchARCWLCL" : "updateARCWLCL",
        payload
      );

      if (res?.status !== "success") {
        await Swal.fire(
          "CWT Receiving failed",
          res?.message ?? "CWT Receiving failed.",
          "error"
        );
        return;
      }

      updateState({ status: newStatus });
      await doFind(newStatus);

      useSwalSuccessAlert(
        "Success",
        isBatch ? `${selectedRows.length} CWT Documents Updated` : "Receiving Completed"
      )

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
  const isLocked = actionModal.originalStatus === "R";
  const isRemarksRequired =
    actionModal.status === "H" && !String(actionModal.remarks || "").trim();

  return (
    <div className="global-ref-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              Creditable Withholding Tax Monitoring
            </h1>
          </div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-1 lg:gap-2">
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

            {/* <button
              onClick={() => onAction("print")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
            >
              <FontAwesomeIcon icon={faPrint} />{" "}
              <span className="hidden lg:inline ml-2">Print</span>
            </button> */}

            {/* EXPORT: simple button (no dropdown) */}
            {/* <button
              onClick={() => onAction("export-query")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
            >
              <FontAwesomeIcon icon={faFileExport} />
              <span className="hidden lg:inline ml-2">Export</span>
            </button> */}

            {/* ACTION: dropdown */}
            <div className="relative" ref={generateMenuRef}>
              <button
                onClick={() =>
                  updateState({
                    showGenerateMenu: !showGenerateMenu,
                    guideOpen: false,
                  })
                }
                className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
              >
                <FontAwesomeIcon icon={faListCheck} />
                <span className="hidden lg:inline ml-2">Action</span>
                {selectedCwtKeys.length > 0 && (
                  <span className="ml-2 rounded-full bg-white px-1.5 text-[10px] font-bold text-blue-700">
                    {selectedCwtKeys.length}
                  </span>
                )}
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="ml-2 text-[10px]"
                />
              </button>

              {showGenerateMenu && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600 z-50">
                  <div className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    Batch Status
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCwtKeys(
                        rows
                          .filter((row) => String(row?.originalDocStatus || row?.docStatus || "").toUpperCase() !== "R")
                          .map((row) => `${row?.tran_id || ""}::${row?.atcCode || ""}`)
                      );
                      updateState({ showGenerateMenu: false });
                    }}
                    disabled={!rows.length}
                    className="w-full px-2.5 py-1.5 text-xs text-left hover:bg-gray-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faListCheck} className="w-3.5 text-blue-600" />
                    <span>Select All</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCwtKeys([]);
                      updateState({ showGenerateMenu: false });
                    }}
                    disabled={!selectedCwtKeys.length}
                    className="w-full px-2.5 py-1.5 text-xs text-left hover:bg-gray-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faEraser} className="w-3.5 text-slate-500" />
                    <span>Clear Selection</span>
                  </button>
                  <button
                    onClick={() => {
                      updateState({ showGenerateMenu: false });
                      openBatchStatusModal("R");
                    }}
                    disabled={!selectedCwtKeys.length}
                    className="w-full px-2.5 py-1.5 text-xs text-left hover:bg-blue-50 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faInbox} className="w-3.5 text-blue-600" />
                    <span>Receive Selected</span>
                  </button>
                  <button
                    onClick={() => {
                      updateState({ showGenerateMenu: false });
                      openBatchStatusModal("H");
                    }}
                    disabled={!selectedCwtKeys.length}
                    className="w-full px-2.5 py-1.5 text-xs text-left hover:bg-amber-50 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faPause} className="w-3.5 text-amber-600" />
                    <span>Hold Selected</span>
                  </button>

                  <div className="my-1 border-t border-slate-200 dark:border-gray-600" />
                  <div className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    Reversal
                  </div>
                  <button
                    onClick={() => onAction("load-cwt-reversal")}
                    className="w-full px-2.5 py-1.5 text-xs text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FontAwesomeIcon
                      icon={faNoteSticky}
                      className="text-yellow-600"
                    />
                    <span>Load CWT for Reversal</span>
                  </button>
                  <button
                    onClick={() => onAction("gen-cwt-reversal")}
                    className="w-full px-2.5 py-1.5 text-xs text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FontAwesomeIcon
                      icon={faNoteSticky}
                      className="text-yellow-600"
                    />
                    <span>Generate CWT Reversal</span>
                  </button>
                </div>
              )}
            </div>

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
                    onClick={() => onAction("pdf")}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <FontAwesomeIcon icon={faFileLines} className="mr-2" />
                    PDF Guide
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + JV Header */}
      <div className="mt-32 sm:mt-24 px-1">
        <div id="summary" className="global-tran-tab-div-ui">
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* Customer Details */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                Customer Details
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
                  onLookup={() => updateState({ showBranchModal: true })}
                />

                <FieldRenderer
                  type="lookup"
                  id="custCode"
                  name="custCode"
                  label="Customer Code"
                  value={custCode}
                  disabled={isLoading}
                  allowLookupInput
                  onChange={(value) =>
                    updateState({
                      custCode: value,
                      custName: "",
                    })
                  }
                  onLookup={() => updateState({ showCustomerModal: true })}
                />

                <FieldRenderer
                  type="text"
                  id="custName"
                  name="custName"
                  label="Customer Name"
                  value={custName}
                  readOnly
                  disabled
                />

                {isCwvatEnabled && (
                  <FieldRenderer
                    type="select"
                    id="accountClass"
                    name="accountClass"
                    label="Account"
                    value={accountClass}
                    onChange={(value) => updateState({ accountClass: value })}
                    disabled={isLoading || isAccountLocked}
                    options={accountClassOptions}
                  />
                )}
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

              <div className="space-y-3">
                <FieldRenderer
                  type="date"
                  id="startDate"
                  name="startDate"
                  label="Starting Date"
                  value={startDate}
                  onChange={(value) => updateState({ startDate: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="date"
                  id="endDate"
                  name="endDate"
                  label="Ending Date"
                  value={endDate}
                  onChange={(value) => updateState({ endDate: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="select"
                  id="status"
                  name="status"
                  label="CWT Status"
                  value={status}
                  onChange={(value) => updateState({ status: value })}
                  disabled={isLoading}
                  options={[
                    { value: "R", label: "R - Received" },
                    { value: "O", label: "O - Open" },
                    { value: "H", label: "H - Hold" },
                  ]}
                />
              </div>
            </section>

            {/* Journal Voucher */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon
                  className="text-blue-600"
                  icon={faFileLines}
                />
                Journal Voucher
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldRenderer
                  type="text"
                  id="jvNo"
                  name="jvNo"
                  label="JV No."
                  value={jvNo}
                  onChange={(value) => updateState({ jvNo: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="date"
                  id="recvFromDate"
                  name="recvFromDate"
                  label="Received from Date"
                  value={recvFromDate}
                  onChange={(value) => updateState({ recvFromDate: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="date"
                  id="jvDate"
                  name="jvDate"
                  label="JV Date"
                  value={jvDate}
                  onChange={(value) => updateState({ jvDate: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="date"
                  id="recvToDate"
                  name="recvToDate"
                  label="Received to Date"
                  value={recvToDate}
                  onChange={(value) => updateState({ recvToDate: value })}
                  disabled={isLoading}
                />
              </div>
            </section>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Table ONLY */}
      <div className="global-tran-tab-div-ui">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Detailed
            </button>
            <span className="text-xs text-slate-500">
              Selected: {selectedCwtKeys.length}
            </span>
          </div>
        </div>

      <div ref={cwtTableContainerRef} className="global-tran-table-main-div-ui mt-4">
          <div className="max-h-[600px] overflow-y-auto relative">
            <SearchGlobalReportTable
              docType={`CWT Monitoring`}
              ref={tableRef}
              columns={colsWithActions}
              data={rows}
              itemsPerPage={50}
              rightActionLabel="Actions"
              onRowAction={(row) => {
                const url = `${window.location.origin}${row.pathUrl}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              onRowActionsClick={handleRowActionsClick}
              onRowDoubleClick={handleRowActionsClick}
            />
          </div>
        </div>
      </div>

      {/* NEW: Global Posting Modal for CWT Reversal */}
      {showReversalModal && (
        <GlobalGLPostingModalv1
          data={rows} // 👈 Passes the filtered data from the 'Load' step
          colConfigData={cols} // Passes the column configuration
        title="Finalize CWT Reversal"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-lg sm:max-h-[calc(100dvh-2.5rem)]">
            <div className="overflow-y-auto p-3 sm:p-4">
            {/* Header with document info */}
            <div className="mb-3 border-b pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex min-w-0 items-start gap-2 sm:items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <FontAwesomeIcon
                      icon={faFileLines}
                      className="text-blue-600"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800">
                      {isLocked ? "View CWT Status" : "Update CWT Status"}
                    </p>
                    <p className="text-[10px] leading-4 text-gray-500 sm:text-[11px]">
                      {isLocked
                        ? "View the receiving status and information for this document."
                        : actionModal.isBatch
                        ? `Apply status and remarks to ${actionModal.rows.length} selected documents.`
                        : "Apply status and remarks for this document."}
                    </p>
                  </div>
                </div>

                {/* Status pill */}
                {!actionModal.isBatch && <span
                  className={`w-fit shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                    actionModal.originalStatus === "R"
                      ? "bg-blue-100 text-blue-700"
                      : actionModal.originalStatus === "H"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {actionModal.originalStatus === "R"
                    ? "🔵 Received"
                    : actionModal.originalStatus === "H"
                    ? "🔴 Hold"
                    : "🟢 Open"}
                </span>}
              </div>

              {!actionModal.isBatch && (
              <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:mt-4 sm:grid-cols-2 sm:gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                    Customer Information
                  </div>
                  <div className="text-gray-500">Customer Code</div>
                  <div className="text-xs font-normal leading-5 text-gray-800">
                    {selectedRow.custCode || "—"}
                  </div>
                  <div className="mt-2 text-gray-500">Customer Name</div>
                  <div className="text-xs font-normal leading-5 text-gray-800 break-words">
                    {selectedRow.custName || "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                    Document Information
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <div>
                      <div className="text-gray-500">Document</div>
                      <div className="text-xs font-normal leading-5 text-gray-800">
                        {selectedRow.docCode || "—"} {selectedRow.docNo || ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Date</div>
                      <div className="text-xs font-normal leading-5 text-gray-800">
                        {selectedRow.docDate ? useFormatToDate(selectedRow.docDate) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Branch</div>
                      <div className="text-xs font-normal leading-5 text-gray-800">
                        {selectedRow.branchCode || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">ATC</div>
                      <div className="text-xs font-normal leading-5 text-gray-800">
                        {selectedRow.atcCode || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 sm:col-span-2 sm:p-3 md:col-span-1">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                    Amount
                  </div>
                  <div className="text-gray-500">Base Amount</div>
                  <div className="text-right text-xs font-normal leading-5 text-gray-800">
                    {formatNumber(selectedRow.baseAmount ?? selectedRow.baseAmt ?? 0)}
                  </div>
                  <div className="mt-2 text-gray-500">CWT Amount</div>
                  <div className="text-right text-xs font-normal leading-5 text-blue-700">
                    {formatNumber(selectedRow.atcAmount ?? selectedRow.atcAmt ?? 0)}
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Body fields */}
            <div className="space-y-3 text-xs">
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
                        newStatus === "H"
                          ? ""
                          : prev.receivedDate || useGetCurrentDay(),
                    }));
                  }}
                  disabled={isLocked || actionModal.isBatch}
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="R">R - Received</option>
                  <option value="H">H - Hold</option>
                </select>
              </div>

              {/* Received By */}
              <div>
                <label className="block mb-1 text-gray-700">
                  Received By
                </label>
                <input
                  type="text"
                  value={actionModal.receivedBy}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      receivedBy: e.target.value,
                    }))
                  }
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  readOnly={isLocked}
                  disabled={isLocked}
                />
              </div>

              {/* Received Date */}
              <div>
                <label className="block mb-1 text-gray-700">
                  Received Date
                </label>
                <input
                  type="date"
                  value={actionModal.receivedDate || ""}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      receivedDate: e.target.value,
                    }))
                  }
                  readOnly={isLocked}
                  disabled={isLocked}
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Extended Remarks */}
              <div>
                <label className="block mb-1 text-gray-700">
                  Extended Remarks{" "}
                  {actionModal.status === "H" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={actionModal.remarks}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                  readOnly={isLocked}
                  disabled={isLocked}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 resize-y ${
                    isRemarksRequired ? "border-red-500" : ""
                  }`}
                  placeholder="Enter remarks..."
                />
                {isRemarksRequired && (
                  <p className="mt-1 text-[10px] text-red-500">
                    Remarks is required when status is HOLD.
                  </p>
                )}
              </div>
            </div>

            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t bg-white px-3 py-3 sm:mt-4 sm:border-t-0 sm:px-4 sm:pb-4 sm:pt-0">
              <button
                type="button"
                onClick={handleActionModalCancel}
                className="min-w-20 rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 sm:min-w-0 sm:py-1.5"
                disabled={isLoading}
              >
                {isLocked ? "Close" : "Cancel"}
              </button>
              {!isLocked && <button
                type="button"
                onClick={handleActionModalApply}
                className="min-w-20 rounded bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-60 sm:min-w-0 sm:py-1.5"
                disabled={isLoading || isRemarksRequired}
              >
                Apply
              </button>}
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
      {showCustomerModal && (
        <CustomerMastLookupModal
          isOpen={showCustomerModal}
          onClose={(selectedCustomer) => {
            if (selectedCustomer) {
              updateState({
                custCode: selectedCustomer.custCode,
                custName: selectedCustomer.custName,
                baseAmount: "0.00",
                atcAmount: "0.00",
              });
            }
            updateState({ showCustomerModal: false });
          }}
        />
      )}
    </div>
  );
}
