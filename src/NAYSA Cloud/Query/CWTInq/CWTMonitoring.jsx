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
  faTrashAlt,
  faXmark,
  faCoins,
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
          checkbox.addEventListener("change", (event) => {
            const selectedKey = event.currentTarget.dataset.cwtKey;
            if (!selectedKey) return;
            setSelectedCwtKeys((current) =>
              current.includes(selectedKey)
                ? current.filter((key) => key !== selectedKey)
                : [...current, selectedKey]
            );
          });
          actionContainer.appendChild(checkbox);
        }

        checkbox.dataset.cwtKey = rowKey;
        checkbox.checked = isSelected;
        checkbox.disabled = ["R", "JVR"].includes(String(
          matchingRow?.originalDocStatus || matchingRow?.docStatus || ""
        ).trim().toUpperCase()) || !!String(matchingRow?.jvNo || "").trim();
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
          branchCode,
          custCode,
          accountClass: isCwvatEnabled ? accountClass : "CWTCL",
          startDate,
          endDate,
          status: stat,
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
      if (selectedCwtKeys.length > 1) {
        const selectedSet = new Set(selectedCwtKeys);
        const selectedRows = rows.filter((item) => selectedSet.has(`${item?.tran_id || ""}::${item?.atcCode || ""}`));
        if (new Set(selectedRows.map((item) => String(item.custCode || "").trim().toUpperCase())).size !== 1) {
          Swal.fire("Select One Customer", "Select invoices for one customer only. Clear the selection before choosing another customer.", "info");
          return;
        }
        if (selectedRows.some((item) => ["R", "JVR"].includes(String(item.originalDocStatus || item.docStatus || "").trim().toUpperCase()) || String(item.jvNo || "").trim())) {
          Swal.fire("Invalid Selection", "Select only invoices that have not been received and have no journal voucher.", "info");
          return;
        }
        setActionModal({
          open: true, row: selectedRows[0], rows: selectedRows,
          isBatch: true, batchStatus: "R", status: "R", originalStatus: "",
          receivedBy: user?.userName || currentUserRow?.userName || "",
          receivedDate: useGetCurrentDay(), remarks: "",
        });
        return;
      }
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
    [user?.userName, currentUserRow?.userName, selectedCwtKeys, rows]
  );

  const handleActionModalCancel = () => {
    setActionModal((prev) => ({ ...prev, open: false, row: null, rows: [] }));
  };

  const removeBatchInvoice = (item) => {
    if (isLoading || actionModal.rows.length <= 1) return;
    const removedKey = `${item.tran_id || ""}::${item.atcCode || ""}`;
    setActionModal((previous) => {
      if (previous.rows.length <= 1) return previous;
      const remaining = previous.rows.filter((row) => `${row.tran_id || ""}::${row.atcCode || ""}` !== removedKey);
      return remaining.length ? { ...previous, rows: remaining, row: remaining[0] } : previous;
    });
    setSelectedCwtKeys((previous) => previous.filter((key) => key !== removedKey));
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

    if (new Set(selectedRows.map((row) => String(row.custCode || "").trim().toUpperCase())).size !== 1) {
      Swal.fire("Select One Customer", "Select invoices for one customer only. Clear the selection before choosing another customer.", "info");
      return;
    }
    if (selectedRows.some((row) => ["R", "JVR"].includes(String(row.originalDocStatus || row.docStatus || "").trim().toUpperCase()) || String(row.jvNo || "").trim())) {
      Swal.fire("Invalid Selection", "Select only invoices that have not been received and have no journal voucher.", "info");
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
    if (newStatus === "R" && (!String(receivedBy || "").trim() || !receivedDate)) {
      Swal.fire("Receiving Details", "Received By and Received Date are required.", "warning");
      return;
    }

    // Remarks mandatory when status = 'H'
    if (newStatus === "H" && !String(remarks || "").trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Remarks required",
        text: "Remarks is required when status is set to HOLD.",
      });
      return;
    }

    const batchDetails = isBatch
      ? selectedRows.map((item) => ({
          tranId: String(item?.tran_id || "").trim(),
          atcCode: String(item?.atcCode || "").trim(),
        }))
      : [];

    if (isBatch && batchDetails.some((item) => !item.tranId || !item.atcCode)) {
      await Swal.fire({
        icon: "error",
        title: "Invalid CWT selection",
        text: "One or more selected records are missing a transaction ID or ATC code. Run Find again and reselect the records.",
      });
      return;
    }

    try {
      updateState({ isLoading: true });

      const payload = {
        json_data: {
          tranId: row.tran_id,
          atcCode: row.atcCode,
          dt1: isBatch ? batchDetails : undefined,
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
      const response = error?.response?.data;
      const validationMessage = response?.errors
        ? Object.values(response.errors).flat().join("\n")
        : "";
      const errorMessage = validationMessage || response?.message || response?.details
        || "An error occurred while updating the status. Please try again.";
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: errorMessage,
      });
    } finally {
      updateState({ isLoading: false });
    }
  };


  const selectedRow = actionModal.row || {};
  const selectedCwtSummary = useMemo(() => {
    const keys = new Set(selectedCwtKeys);
    return rows.reduce((summary, row) => {
      if (keys.has(`${row?.tran_id || ""}::${row?.atcCode || ""}`)) {
        summary.count += 1;
        summary.base += parseFormattedNumber(row.baseAmount || 0) || 0;
        summary.cwt += parseFormattedNumber(row.atcAmount || 0) || 0;
      }
      return summary;
    }, { count: 0, base: 0, cwt: 0 });
  }, [rows, selectedCwtKeys]);
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
          <div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Customer Details */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                <FontAwesomeIcon className="h-3 w-3 rounded-lg bg-blue-50 p-1.5 text-blue-600" icon={faUser} />
                Customer Details
              </h3>

              <div className="space-y-2">
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
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                <FontAwesomeIcon
                  className="h-3 w-3 rounded-lg bg-blue-50 p-1.5 text-blue-600"
                  icon={faCalendarAlt}
                />
                Date Range
              </h3>

              <div className="space-y-2">
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
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                <FontAwesomeIcon
                  className="h-3 w-3 rounded-lg bg-blue-50 p-1.5 text-blue-600"
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
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-3" aria-live="polite">
              {[
                { label: "Selected Invoices", value: selectedCwtSummary.count, icon: faListCheck, color: "bg-blue-50 text-blue-600" },
                { label: "Selected Base Amount", value: formatNumber(selectedCwtSummary.base), icon: faCoins, color: "bg-violet-50 text-violet-600" },
                { label: "Selected CWT Amount", value: formatNumber(selectedCwtSummary.cwt), icon: faFileLines, color: "bg-emerald-50 text-emerald-600" },
              ].map((item) => <div key={item.label} className="flex min-h-[42px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${item.color}`}><FontAwesomeIcon icon={item.icon} className="text-xs" /></span>
                <div className="flex flex-1 items-center justify-between gap-2"><span className="max-w-[64px] whitespace-normal text-[10px] font-medium leading-3 text-slate-500">{item.label}</span><span className="ml-auto whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-800">{item.value}</span></div>
              </div>)}
            </div>
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
      {actionModal.open && actionModal.isBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="cwt-receive-title" className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-3">
              <h2 id="cwt-receive-title" className="text-base font-semibold text-blue-700">{actionModal.batchStatus === "R" ? "Receive Selected Invoices" : "Hold Selected Invoices"}</h2>
              <button type="button" aria-label="Close selected invoices" title="Close" disabled={isLoading} onClick={handleActionModalCancel} className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <div className="grid min-h-0 grid-cols-1 gap-4 overflow-auto p-5 md:grid-cols-6">
              <fieldset className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 px-4 pb-4 pt-3 md:col-span-3">
                <legend className="px-2 text-xs font-semibold text-blue-700">Customer Details</legend>
                <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-3 text-xs">
                  <dt className="text-slate-500">Customer Code</dt><dd className="font-semibold">{selectedRow.custCode}</dd>
                  <dt className="text-slate-500">Customer Name</dt><dd className="font-semibold">{selectedRow.custName}</dd>
                  <dt className="text-slate-500">Selected Invoices</dt><dd className="font-semibold">{actionModal.rows.length}</dd>
                </dl>
              </fieldset>
              <fieldset className="min-w-0 rounded-lg border border-slate-200 px-4 pb-4 pt-3 md:col-span-3">
                <legend className="px-2 text-xs font-semibold text-blue-700">Receiving Details</legend>
                <div className="grid grid-cols-1 gap-4 pt-2 text-xs sm:grid-cols-2">
                  <div className="space-y-4">
                  <FieldRenderer id="cwt-batch-status" label="Receive Status" type="text" value={actionModal.batchStatus === "R" ? "Received" : "Hold"} readOnly disabled />
                  <FieldRenderer id="cwt-batch-by" label="Received By" type="text" required={actionModal.batchStatus === "R"} maxLength={50} hideClearButton disabled={isLoading} value={actionModal.receivedBy} onChange={(value) => setActionModal((prev) => ({ ...prev, receivedBy: value }))} />
                  <FieldRenderer id="cwt-batch-date" label="Received Date" type="date" required={actionModal.batchStatus === "R"} disabled={isLoading} value={actionModal.receivedDate || ""} onChange={(value) => setActionModal((prev) => ({ ...prev, receivedDate: value }))} />
                  </div>
                  <div className="space-y-4">
                    <FieldRenderer id="cwt-batch-base-total" label="Total Base Amount" type="amount" value={formatNumber(actionModal.rows.reduce((total, item) => total + (parseFormattedNumber(item.baseAmount || 0) || 0), 0))} readOnly disabled />
                    <FieldRenderer id="cwt-batch-total" label="Total CWT Amount" type="amount" value={formatNumber(actionModal.rows.reduce((total, item) => total + (parseFormattedNumber(item.atcAmount || 0) || 0), 0))} readOnly disabled />
                  </div>
                </div>
              </fieldset>
              <fieldset className="min-w-0 rounded-lg border border-slate-200 px-3 pb-3 pt-2 md:col-span-4">
                <legend className="px-2 text-xs font-semibold text-blue-700">Invoice Details</legend>
                <div className="h-48 overflow-auto rounded-md">
                  <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-blue-100 text-slate-700"><tr><th className="px-2 py-2 font-semibold">Invoice No.</th><th className="px-2 py-2 font-semibold">Invoice Date</th><th className="px-2 py-2 text-right font-semibold">Base Amount</th><th className="px-2 py-2 text-right font-semibold">CWT Amount</th><th className="w-10 px-2 py-2 text-center font-semibold">Action</th></tr></thead><tbody>{actionModal.rows.map((item) => <tr key={`${item.tran_id}::${item.atcCode}`} className="border-t border-slate-100"><td className="whitespace-nowrap px-2 py-1">{item.docCode} {item.docNo}</td><td className="whitespace-nowrap px-2 py-1">{item.docDate ? useFormatToDate(item.docDate) : "—"}</td><td className="px-2 py-1 text-right">{formatNumber(item.baseAmount || 0)}</td><td className="px-2 py-1 text-right">{formatNumber(item.atcAmount || 0)}</td><td className="px-2 py-1 text-center"><button type="button" title={actionModal.rows.length <= 1 ? "Keep at least one invoice" : "Remove from selected invoices"} aria-label={`Remove ${item.docNo}`} disabled={isLoading || actionModal.rows.length <= 1} onClick={() => removeBatchInvoice(item)} className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30"><FontAwesomeIcon icon={faTrashAlt} className="text-xs" /></button></td></tr>)}</tbody></table>
                </div>
              </fieldset>
              <fieldset className={`flex min-w-0 flex-col rounded-lg border bg-slate-50/40 px-3 pb-3 pt-2 transition-colors focus-within:border-blue-400 md:col-span-2 ${isRemarksRequired ? "border-red-400" : "border-slate-200"}`}>
                <legend className="px-2 text-xs font-semibold text-blue-700">Receiving Remarks</legend>
                <textarea aria-label="Receiving Remarks" maxLength={255} disabled={isLoading} value={actionModal.remarks} onChange={(e) => setActionModal((prev) => ({ ...prev, remarks: e.target.value }))} className="h-48 w-full resize-none border-0 bg-transparent px-1 py-2 text-xs shadow-none outline-none placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0" placeholder="Enter remarks…" />
              </fieldset>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button type="button" onClick={handleActionModalCancel} disabled={isLoading} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-600 disabled:opacity-40">Cancel</button>
              <button type="button" onClick={handleActionModalApply} disabled={isLoading || isRemarksRequired} className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">Apply</button>
            </div>
          </div>
        </div>
      )}
      {actionModal.open && !actionModal.isBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5">
          <div className={`flex max-h-[calc(100dvh-1.5rem)] w-full ${actionModal.isBatch ? "max-w-4xl" : "max-w-2xl"} flex-col overflow-hidden rounded-lg bg-white shadow-lg sm:max-h-[calc(100dvh-2.5rem)]`}>
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
                      {isLocked ? "View CWT Status" : actionModal.isBatch ? (actionModal.batchStatus === "R" ? "Receive Selected Invoices" : "Hold Selected Invoices") : "Update CWT Status"}
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

              {actionModal.isBatch && <div className="mt-4 space-y-3">
                <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs sm:grid-cols-4">
                  <div><div className="text-slate-500">Customer Code</div><div className="mt-1 font-semibold">{selectedRow.custCode}</div></div>
                  <div><div className="text-slate-500">Customer Name</div><div className="mt-1 font-semibold">{selectedRow.custName}</div></div>
                  <div><div className="text-slate-500">Selected Invoices</div><div className="mt-1 font-semibold text-blue-700">{actionModal.rows.length}</div></div>
                  <div><div className="text-slate-500">Total CWT Amount</div><div className="mt-1 font-semibold text-blue-700">{formatNumber(actionModal.rows.reduce((total, item) => total + (parseFormattedNumber(item.atcAmount ?? 0) || 0), 0))}</div></div>
                </div>
                <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-blue-100 text-slate-700"><tr>{["Invoice No.", "Invoice Date", "ATC Code", "Base Amount", "CWT Amount"].map((label, index) => <th key={label} className={`px-3 py-2 font-semibold ${index > 2 ? "text-right" : ""}`}>{label}</th>)}</tr></thead><tbody>{actionModal.rows.map((item) => <tr key={`${item.tran_id}::${item.atcCode}`} className="border-t border-slate-100"><td className="px-3 py-2">{item.docCode} {item.docNo}</td><td className="px-3 py-2">{item.docDate ? useFormatToDate(item.docDate) : "—"}</td><td className="px-3 py-2">{item.atcCode}</td><td className="px-3 py-2 text-right">{formatNumber(item.baseAmount || 0)}</td><td className="px-3 py-2 text-right">{formatNumber(item.atcAmount || 0)}</td></tr>)}</tbody></table>
                </div>
              </div>}
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
            <div className="space-y-4 pt-2 text-xs">
              <FieldRenderer id="cwt-single-status" label="Status" type="select" value={actionModal.status} options={[{ value: "R", label: "Received" }, { value: "H", label: "Hold" }]} disabled={isLocked || isLoading} onChange={(value) => setActionModal((prev) => ({ ...prev, status: value, receivedDate: value === "H" ? "" : prev.receivedDate || useGetCurrentDay() }))} />
              <FieldRenderer id="cwt-single-by" label="Received By" type="text" required={actionModal.status === "R"} hideClearButton maxLength={50} value={actionModal.receivedBy} disabled={isLocked || isLoading} onChange={(value) => setActionModal((prev) => ({ ...prev, receivedBy: value }))} />
              <FieldRenderer id="cwt-single-date" label="Received Date" type="date" required={actionModal.status === "R"} value={actionModal.receivedDate || ""} disabled={isLocked || isLoading} onChange={(value) => setActionModal((prev) => ({ ...prev, receivedDate: value }))} />

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
