import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faSpinner,
  faSearch,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef.jsx";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast.jsx";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import MSLookupModal from "../../../Lookup/SearchMSMast.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Configuration
import { postRequest, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext.jsx";

import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopDocControlRow,
  useTopDocDropDown,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useTransactionUpsert,
  useFetchTranData,
  useHandleCancel,
  useHandlePost,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  useSelectedHSColConfig,
} from "@/NAYSA Cloud/Global/selectedData";

// Header
import Header from "@/NAYSA Cloud/Components/Header";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const MSIS = () => {
  const loadedFromUrlRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [isViewDocument, setIsViewDocument] = useState(false);

useEffect(() => {
  const p = new URLSearchParams(location.search);
  setIsViewDocument(p.get("viewDocument") === "true");
}, [location.search]);

  const isViewDocumentUrl = isViewDocument;
  

  const { resetFlag } = useReset();

  const [topTab, setTopTab] = useState("details"); // "details" | "history"

  const [state, setState] = useState({
    // HS Option / Currency
    glCurrMode: "M",
    glCurrDefault: "PHP",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal1: "",
    glCurrGlobal2: "",
    glCurrGlobal3: "",

    // Document information
    documentName: "",
    documentSeries: "Auto",
    documentDocLen: 8,
    documentID: null,
    documentNo: "",
    documentStatus: "",
    status: "OPEN",

    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: true,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: true,

    // Header information
    header: {
      rr_date: new Date().toISOString().split("T")[0], // PR Date
    },

    branchCode: "HO",
    branchName: "Head Office",

    // Responsibility Center / Requesting Dept
    // Responsibility Center / Requesting Dept
    reqRcCode: "",
    reqRcName: "",
    attention: "",
    vendCOde: "",
    vendName: "",

    // Currency information (not used by sproc_PHP_PR but kept for UI consistency)
    currCode: "",
    currName: "",
    currRate: "",
    defaultCurrRate: "1.000000",

    // Other Header Info (aligned to PR header fields)
    poTranTypes: [],
    poTypes: [],
    selectedPoTranType: "",
    selectedPoType: "",
    cutoffCode: "",
    rcCode: "",
    rcName: "", // responsibility center name for display
    requestDept: "",
    vendCode: "",
    refPoNo1: "",
    refPrNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    noReprints: "0",
    poCancelled: "",
    poNo: "",
    payTerm: "",
    userCode: "NSI",
    selectedPOStatus: "",
    // Warehouse / Location header values
    WHcode: "",
    WHname: "",
    locCode: "",
    locName: "",

    // Detail lines (PR dt1)
    detailRows: [],

    // Modal states
    modalContext: "",
    selectionContext: "",
    selectedRowIndex: null,
    currencyModalOpen: false,
    branchModalOpen: false,
    custModalOpen: false,
    billtermModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostModal: false,
    showAccountModal: false,
    accountModalSource: null,
    // Modal flags
    warehouseLookupOpen: false,
    locationLookupOpen: false,
    drAcctLookupOpen: false,
    drAcctRowIndex: null,

    // RC Lookup modal (table)
    rcLookupModalOpen: false,
    rcLookupContext: "", // "rc" or "reqDept"

    msLookupModalOpen: false,
    globalLookupRow: [],
    globalLookupHeader: [],
  });

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const {
    documentName,
    documentSeries,
    documentDocLen,
    documentID,
    documentStatus,
    documentNo,
    status,

    activeTab,
    isLoading,
    showSpinner,

    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    poNo,
    selectedPOType,
    selectedRowIndex,

    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,
    poStatus,
    RRDate,

    // Header
    branchCode,
    branchName,
    payTerm,
    WHcode,

    // Responsibility Center
    rcCode,
    rcName,

    // Requesting Dept
    reqRcCode,
    reqRcName,
    vendCOde,

    currCode,
    currName,
    attention,
    poDate,
    cutoffFrom,
    cutoffTo,

    vendCode,
    vendName,

    poTranTypes,
    poTypes,
    selectedPoTranType,
    selectedPoType,
    cutoffCode,
    requestDept,
    dateNeeded,
    refPoNo1,
    refPrNo2,
    remarks,
    billtermCode,
    billtermName,
    noReprints,
    poCancelled,
    userCode,
    currRate,
    drno,

    detailRows,

    // Modals
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    billtermModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostModal,
    showAccountModal,
    accountModalSource,

    // RC Lookup
    rcLookupModalOpen,
    rcLookupContext,

    msLookupModalOpen,
    globalLookupRow,
    globalLookupHeader,
  } = state;

  const [header, setHeader] = useState({
    rr_date: new Date().toISOString().split("T")[0],
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [totals, setTotals] = useState({
    totalQtyNeeded: "",
  });

  // MSIS.jsx
  const docType = docTypes?.MSIS || "MSIS";

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle =
    docTypeNames[docType] || "Material Supplies Issuance Slip";

  const displayStatus = status || "OPEN";
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = ["FINALIZED", "CANCELLED", "CLOSED"].includes(
    displayStatus,
  );

  const updateTotalsDisplay = (qtyNeeded) => {
    setTotals({
      totalQtyNeeded: formatNumber(qtyNeeded, 6),
    });
  };

  // ==========================
  // EFFECTS
  // ==========================

  useEffect(() => {
    if (resetFlag) {
      handleReset();
    }
    let timer;
    if (isLoading) {
      timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }
    return () => clearTimeout(timer);
  }, [resetFlag, isLoading]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);

  useEffect(() => {
    handleReset();
  }, []);

  useEffect(() => {
    if (glCurrMode && glCurrDefault && currCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
    }
  }, [glCurrMode, glCurrDefault, currCode]);

  const LoadingSpinner = () => (
    <div className="global-tran-spinner-main-div-ui">
      <div className="global-tran-spinner-sub-div-ui">
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          size="2x"
          className="text-blue-500 mb-2"
        />
        <p>Please wait...</p>
      </div>
    </div>
  );

  // ==========================
  // INITIAL LOAD / RESET
  // ==========================

  const handleReset = () => {
    loadDocDropDown();
    loadDocControl();
    loadCompanyData();

    const today = new Date().toISOString().split("T")[0];

    updateState({
      header: { rr_date: today },
      branchCode: "HO",
      branchName: "Head Office",
      cutoffCode: "",
      rcCode: "",
      rcName: "",
      reqRcCode: "",
      reqRcName: "",
      vendCode: "",
      vendName: "",
      dateNeeded: today, // <-- DEFAULT TO TODAY
      refPoNo1: "",
      refPrNo2: "",
      remarks: "",
      documentNo: "",
      documentID: "",
      documentStatus: "",
      activeTab: "basic",
      isLoading: false,
      showSpinner: false,
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status: "OPEN",
      noReprints: "0",
      poCancelled: "",
      detailRows: [],
      rcLookupModalOpen: false,
      rcLookupContext: "",
      msLookupModalOpen: false,
      globalLookupRow: [],
      globalLookupHeader: [],
      WHcode: "",
      WHname: "",
      locCode: "",
      locName: "",
      warehouseLookupOpen: false,
      locationLookupOpen: false,
      drAcctCode: "",
      drAcctName: "",
    });

    updateTotalsDisplay(0);
  };

  const handleCloseWarehouseLookup = (row) => {
    if (!row) {
      updateState({ warehouseLookupOpen: false });
      return;
    }

    updateState({
      warehouseLookupOpen: false,
      WHcode: row?.whCode ?? "",
      WHname: row?.whName ?? "",
    });
  };

  const handleCloseLocationLookup = (row) => {
    if (!row) {
      updateState({ locationLookupOpen: false });
      return;
    }

    updateState({
      locationLookupOpen: false,
      locCode: row?.locCode ?? "",
      locName: row?.locName ?? "",
      // optional: WHcode: row?.whCode ?? state.WHcode,
    });
  };

  const handleCloseAccountModal = (selectedAccount) => {
    console.log("🟦 COA MODAL CLOSED");
    console.log(
      "🟦 source:",
      accountModalSource,
      " rowIndex:",
      selectedRowIndex,
    );
    console.log("🟦 selectedAccount:", selectedAccount);

    // always close modal
    if (
      !selectedAccount ||
      selectedRowIndex === null ||
      selectedRowIndex === undefined
    ) {
      updateState({
        showAccountModal: false,
        selectedRowIndex: null,
        accountModalSource: null,
      });
      return;
    }

    const acctCode = selectedAccount?.acctCode ?? "";
    const acctName = selectedAccount?.acctName ?? "";

    if (accountModalSource === "drAcct") {
      console.log("✅ DR ACCT SELECTED:", { acctCode, acctName });

      // ✅ IMPORTANT: update using prev state (no stale detailRows)
      setState((prev) => {
        const rows = [...(prev.detailRows || [])];
        const row = { ...(rows[selectedRowIndex] || {}) };

        row.drAcctCode = acctCode;
        row.drAcctName = acctName;

        rows[selectedRowIndex] = row;

        return {
          ...prev,
          detailRows: rows,
          showAccountModal: false,
          selectedRowIndex: null,
          accountModalSource: null,
        };
      });

      return; // prevent the updateState below from re-closing again
    }

    updateState({
      showAccountModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const loadCompanyData = async () => {
    updateState({ isLoading: true });
    try {
      const [poTranDrop, poTypeDrop] = await Promise.all([
        useTopDocDropDown(docType, "POTRAN_TYPE"),
        useTopDocDropDown(docType, "PO_TYPE"),
      ]);

      if (poTranDrop) {
        updateState({
          poTranTypes: poTranDrop,
          selectedPoTranType: poTranDrop[0]?.DROPDOWN_CODE ?? "",
        });
      }
      if (poTypeDrop) {
        updateState({
          poTypes: poTypeDrop,
          selectedPoType: poTypeDrop[0]?.DROPDOWN_CODE ?? "",
        });
      }

      const hsOption = await useTopHSOption();
      if (hsOption) {
        updateState({
          glCurrMode: hsOption.glCurrMode,
          glCurrDefault: hsOption.glCurrDefault,
          currCode: hsOption.glCurrDefault,
          glCurrGlobal1: hsOption.glCurrGlobal1,
          glCurrGlobal2: hsOption.glCurrGlobal2,
          glCurrGlobal3: hsOption.glCurrGlobal3,
        });

        const curr = await useTopCurrencyRow(hsOption.glCurrDefault);
        if (curr) {
          updateState({
            currName: curr.currName,
            currRate: formatNumber(1, 6),
          });
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const loadCurrencyMode = (
    mode = glCurrMode,
    defaultCurr = glCurrDefault,
    curr = currCode,
  ) => {
    const calcWithCurr3 = mode === "T";
    const calcWithCurr2 =
      (mode === "M" && defaultCurr !== curr) || mode === "D" || calcWithCurr3;

    updateState({
      glCurrMode: mode,
      withCurr2: calcWithCurr2,
      withCurr3: calcWithCurr3,
    });
  };

  const loadDocControl = async () => {
    const data = await useTopDocControlRow(docType);
    if (data) {
      updateState({
        documentName: data.docName,
        documentSeries: data.docName,
        documentDocLen: data.docName,
      });
    }
  };

  const loadDocDropDown = async () => {
    const data = await useTopDocDropDown(docType, "POTRAN_TYPE");
    if (data) {
      updateState({
        poTranTypes: data,
        selectedPoTranType: data[0]?.DROPDOWN_CODE ?? "",
      });
    }
  };

  // ==========================
  // FETCH (GET) – PR HEADER + DT1
  // ==========================

  const fetchTranData = async (poNo, _branchCode) => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
        WHcode: data.whouseCode ?? "",
        WHname: data.whouseName ?? data.whouseCode ?? "",
        locCode: data.locCode ?? "",
        locName: data.locName ?? data.locCode ?? "",
      });
      updateTotalsDisplay(0);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(poNo, _branchCode, docType, "poNo");

      if (!data?.poId) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      let poDateForHeader = "";
      if (data.poDate) {
        const d = new Date(data.poDate);
        poDateForHeader = isNaN(d) ? "" : d.toISOString().split("T")[0];
      }

      // normalize header-level dateNeeded
      let dateNeededForHeader = "";
      if (data.dateNeeded) {
        const dn = new Date(data.dateNeeded);
        dateNeededForHeader = isNaN(dn) ? "" : dn.toISOString().split("T")[0];
      }

      const retrievedDetailRows = (data.dt1 || []).map((item) => ({
        ...item,
        lN: item.lN,
        invType: item.invType || "",
        groupId: item.groupId || "",
        poStatus: item.poStatus || "",
        itemCode: item.itemCode || "",
        itemName: item.itemName || "",
        uomCode: item.uomCode || "",
        qtyOnHand: formatNumber(item.qtyOnHand ?? 0, 6),
        qtyAlloc: formatNumber(item.qtyAlloc ?? 0, 6),
        qtyNeeded: formatNumber(item.qtyNeeded ?? 0, 6),
        uomCode2: item.uomCode2 || "",
        uomQty2: formatNumber(item.uomQty2 ?? 0, 6),
        dateNeeded: item.dateNeeded
          ? new Date(item.dateNeeded).toISOString().split("T")[0]
          : "",
        itemSpecs: item.itemSpecs || "",
        serviceCode: item.serviceCode || "",
        serviceName: item.serviceName || "",
        poQty: formatNumber(item.poQty ?? 0, 6),
        rrQty: formatNumber(item.rrQty ?? 0, 6),
        drAcctCode: item.drAcctCode ?? "",
        drAcctName: item.drAcctName ?? "",
      }));

      const totalQty = retrievedDetailRows.reduce(
        (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
        0,
      );
      updateTotalsDisplay(totalQty);

      updateState({
        documentStatus: data.status,
        status: data.status,
        documentID: data.poId,
        documentNo: data.poNo,
        branchCode: data.branchCode,
        header: {
          rr_date: poDateForHeader,
          dateNeeded: dateNeededForHeader, // <-- keep in header too
        },
        cutoffCode: data.cutoffCode || "",
        rcCode: data.rcCode || "",
        rcName: data.rcName || "",
        custCode: data.rcCode || "",
        custName: "",
        selectedPoTranType: data.prTranType || "",
        selectedPoType: data.prType || "",
        dateNeeded: dateNeededForHeader, // <-- this is the one bound to the input
        refPoNo1: data.refPoNo1 || "",
        refPrNo2: data.refPrNo2 || "",
        remarks: data.remarks || "",
        poCancelled: data.poCancelled || "",
        noReprints: data.noReprints ?? "0",
        detailRows: retrievedDetailRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error.message,
      });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCloseMSLookup = (selectedItems) => {
    updateState({ msLookupModalOpen: false });

    if (!selectedItems) return;

    const rawRecords = Array.isArray(selectedItems?.records)
      ? selectedItems.records
      : selectedItems?.records
        ? [selectedItems.records]
        : Array.isArray(selectedItems)
          ? selectedItems
          : [selectedItems];

    const itemsArray = rawRecords.filter(
      (item) => (parseFormattedNumber(item?.qtyHand ?? item?.qtyOnHand ?? 0) || 0) > 0
    );

    if (itemsArray.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Stock Selected",
        text: "Only items with Quantity on Hand can be selected.",
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    const newRows = itemsArray.map((item) => {
      const rawQtyHand = parseFormattedNumber(item?.qtyHand ?? item?.qtyOnHand ?? 0) || 0;
      const rawUnitCost = parseFormattedNumber(item?.unitCost ?? 0) || 0;

      return {
        itemCode: item?.itemCode ?? "",
        itemName: item?.itemName ?? "",
        uomCode: item?.uomCode ?? item?.uom ?? "",

        quantity: formatNumber(0, 6),
        unitCost: formatNumber(rawUnitCost, 6),
        amount: formatNumber(0, 2),

        lotNo: item?.lotNo ?? "",
        bbDate: item?.bbDate ? new Date(item.bbDate).toISOString().split("T")[0] : "",
        itemStat: item?.qstatCode ?? item?.itemStat ?? "",

        whouseCode: item?.whouseCode ?? item?.whCode ?? state.WHcode ?? "",
        whouseName: item?.whouseName ?? item?.whName ?? state.WHname ?? "",
        locCode: item?.locCode ?? state.locCode ?? "",
        locName: item?.locName ?? state.locName ?? "",

        qtyOnHand: formatNumber(rawQtyHand, 6),
        uniqueKey: item?.uniqueKey ?? "",

        drAcctCode: "",
        drAcctName: "",
        rcCode: state.rcCode || "",
        slCode: "",
        mrsNo: "",
        mrsQty: formatNumber(0, 6),
        remarks: "",
      };
    });

    setState((prev) => {
      const updated = [...(prev.detailRows || []), ...newRows];
      const totalQty = updated.reduce(
        (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
        0
      );
      updateTotalsDisplay(totalQty);
      return { ...prev, detailRows: updated };
    });
  };

  const handlePrNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const handleOpenDrAcctLookup = (rowIndex) => {
    if (isFormDisabled) return;
    updateState({ drAcctLookupOpen: true, drAcctRowIndex: rowIndex });
  };

  const handleCloseDrAcctLookup = (acct) => {
    console.log("🔍 DR ACCT SELECTED FROM MODAL:", acct);

    const rowIndex = state.drAcctRowIndex;
    console.log("➡️ Target Row Index:", rowIndex);

    updateState({
      drAcctLookupOpen: false,
      drAcctRowIndex: null,
    });

    if (!acct || rowIndex === null || rowIndex === undefined) return;

    const updatedRows = [...state.detailRows];
    const row = { ...updatedRows[rowIndex] };

    // TEMPORARY: log row before update
    console.log("📌 Row BEFORE update:", row);

    row.drAcctCode = acct?.acctCode ?? acct?.GL_CODE ?? acct?.glCode ?? "";
    row.drAcctName = acct?.acctName ?? acct?.GL_NAME ?? acct?.glName ?? "";

    // TEMPORARY: log row after update
    console.log("✅ Row AFTER update:", row);

    updatedRows[rowIndex] = row;
    updateState({ detailRows: updatedRows });
  };

  // ==========================
  // HEADER EVENTS
  // ==========================

  const handleCurrRateNoBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({
      currRate: isNaN(num) ? "0.000000" : num,
      withCurr2:
        (glCurrMode === "M" && glCurrDefault !== currCode) ||
        glCurrMode === "D",
      withCurr3: glCurrMode === "T",
    });
  };

  const handlePrTranTypeChange = (e) => {
    updateState({ selectedPoTranType: e.target.value });
  };

  const handlePrTypeChange = (e) => {
    updateState({ selectedPoType: e.target.value });
  };

  // ==========================
  // DETAIL (PR_DT1) HANDLERS
  // ==========================

  // DR Account double-click handler
  const handleAccountDoubleDtl1Click = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      debitAcct: "",
      debitAcctName: "",
    };
    updateState({ detailRows: updatedRows });
  };

  // When user clicks the "Add Line" button
  const handleAddRowClick = () => {
    // Block if RC or Requesting Dept is blank
    if (!rcCode || !reqRcCode) {
      Swal.fire({
        icon: "warning",
        title: "Required Header Fields",
        text: "Please select both Responsibility Center and Requesting Dept before adding PR lines.",
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    if (isFormDisabled) return;

    // Toggle dropdown
    setShowTypeDropdown((prev) => !prev);
  };

  // When user picks FG / MS / RM
  const handleSelectTypeAndAddRow = () => {
    const today = header.rr_date || new Date().toISOString().split("T")[0];

    const newRow = {
      invType: typeCode,
      groupId: "",
      poStatus: status || "",
      itemCode: "",
      itemName: "",
      uomCode: "",
      qtyOnHand: "0.000000",
      qtyAlloc: "0.000000",
      qtyNeeded: "0.000000",
      uomCode2: "",
      uomQty2: "0.000000",
      dateNeeded: today,
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: "0.000000",
      rrQty: "0.000000",

      // ✅ add these
      drAcctCode: "",
      drAcctName: "",
    };

    const updatedRows = [...detailRows, newRow];
    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
      0,
    );
    updateTotalsDisplay(totalQty);

    setShowTypeDropdown(false);
  };

  const handleOpenMSLookup = async () => {
    if (isFormDisabled) return;

    if (!state.WHcode) {
      Swal.fire({
        icon: "warning",
        title: "Required Header Field",
        text: "Please select Warehouse before adding items.",
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    updateState({ isLoading: true });

    try {
      const response = await fetchDataJson("getInvLookupMS", {
        userCode: state.userCode || "NSI",
        whouseCode: state.WHcode || "",
        locCode: state.locCode || "",
        docType: "MSIS",
        tranType: "IL",
      });

      const rawData = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : response?.data || [];

      const balanceRows = (Array.isArray(rawData) ? rawData : []).filter(
        (item) => (parseFormattedNumber(item?.qtyHand ?? item?.qtyOnHand ?? 0) || 0) > 0
      );

      if (balanceRows.length === 0) {
        Swal.fire({
          icon: "info",
          title: "MS Location Balance",
          text: "No items with Quantity on Hand were found for the selected warehouse/location.",
          timer: 3000,
          showConfirmButton: false,
        });
        updateState({
          globalLookupRow: [],
          globalLookupHeader: [],
          msLookupModalOpen: false,
        });
        return;
      }

      const colConfig = await useSelectedHSColConfig("getInvLookupMS", state.userCode || "NSI");

      updateState({
        globalLookupRow: balanceRows,
        globalLookupHeader: colConfig || [],
        msLookupModalOpen: true,
      });
    } catch (error) {
      console.error("MSIS item lookup error:", error);
      Swal.fire({
        icon: "error",
        title: "MS Location Balance",
        text: error?.response?.data?.message || error?.message || "No records found.",
      });
      updateState({
        globalLookupRow: [],
        globalLookupHeader: [],
        msLookupModalOpen: false,
      });
    } finally {
      updateState({ isLoading: false });
    }
  };


  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
      0,
    );
    updateTotalsDisplay(totalQty);
  };

  const handleDetailChange = (index, field, value) => {
    const updatedRows = [...detailRows];
    const row = { ...updatedRows[index] };

    // sanitize numeric
    const isNumeric = [
      "qtyOnHand",
      "quantity",
      "unitCost",
      "amount",
      "mrsQty",
    ].includes(field);
    if (isNumeric) {
      const sanitized = String(value ?? "").replace(/[^0-9.]/g, "");
      row[field] = sanitized;
    } else {
      row[field] = value;
    }

    // ✅ auto compute amount when quantity or unitCost changes
    if (field === "quantity" || field === "unitCost") {
      const qty = parseFormattedNumber(row.quantity || 0) || 0;
      const cost = parseFormattedNumber(row.unitCost || 0) || 0;

      // store formatted result (2 decimals for amount)
      row.amount = formatNumber(qty * cost, 2);
    }

    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
      0,
    );
    updateTotalsDisplay(totalQty);
  };

  // ==========================
  // SAVE / UPSERT (PR + DT1)
  // ==========================
  const handleActivityOption = async (action) => {
    if (documentStatus !== "") return;
    if (action !== "Upsert") return;

    updateState({ isLoading: true });

    try {
      const {
        branchCode,
        documentNo,
        documentID,
        header,

        rcCode,
        reqRcCode,
        reqRcName,

        WHcode,
        WHname,
        locCode,
        locName,

        attention, // you labeled this as MSIS Ref No.
        vendCode,
        vendName,

        remarks,
        noReprints,
        status,
        userCode,

        detailRows,
      } = state;

      const isNew = !documentID;

      // ✅ MSIS HEADER PAYLOAD
      const msisData = {
        branchCode: branchCode,

        // Use MSIS naming (adjust keys to your sproc)
        msisNo: isNew ? "" : documentNo || "",
        msisId: isNew ? "" : documentID || "",

        msisDate: header.rr_date, // MSIS Date
        refNo: attention || "", // MSIS Ref No (your UI field)
        rcCode: rcCode || "",
        reqRcCode: reqRcCode || "",
        reqRcName: reqRcName || "",

        whouseCode: WHcode || "",
        whouseName: WHname || "",
        locCode: locCode || "",
        locName: locName || "",

        empCode: vendCode || "", // if this is Employee Code
        empName: vendName || "",

        remarks: remarks || "",
        status: status || "OPEN",
        noReprints: parseInt(noReprints || 0, 10),
        userCode: userCode || "NSI",

        // ✅ MSIS DT1 PAYLOAD (matches your Item Detail columns)
        dt1: (detailRows || []).map((row, idx) => ({
          LINE_NO: row.lN || idx + 1,

          ITEM_CODE: row.itemCode || "",
          ITEM_NAME: row.itemName || "",
          UOM_CODE: row.uomCode || "",

          QUANTITY: parseFormattedNumber(row.quantity || 0),
          UNIT_COST: parseFormattedNumber(row.unitCost || 0),
          AMOUNT: parseFormattedNumber(row.amount || 0),

          LOT_NO: row.lotNo || "",
          BB_DATE: row.bbDate || null,
          ITEM_STAT: row.itemStat || "",

          WHOUSE_CODE: row.whouseCode || WHcode || "",
          LOC_CODE: row.locCode || locCode || "",

          DR_ACCT: row.drAcctCode || "",

          RC_CODE: row.rcCode || rcCode || "",
          SL_CODE: row.slCode || "",

          QTY_ONHAND: parseFormattedNumber(row.qtyOnHand || 0),

          MRS_NO: row.mrsNo || "",
          MRS_QTY: parseFormattedNumber(row.mrsQty || 0),
        })),
      };

      console.log("✅ MSIS Payload", msisData);

      // ✅ IMPORTANT: These 2 key names MUST match what your sproc returns
      // If your sproc returns poId/poNo (copy-paste), keep "poId"/"poNo"
      // Otherwise use "msisId"/"msisNo"
      const response = await useTransactionUpsert(
        docType,
        msisData,
        updateState,
        "msisId",
        "msisNo",
      );

      if (response) {
        useSwalshowSaveSuccessDialog(handleReset, () =>
          handleSaveAndPrint(response.data[0].msisId),
        );
      }

      updateState({ isDocNoDisabled: true, isFetchDisabled: true });
    } catch (error) {
      console.error("Error during MSIS upsert:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  // ==========================
  // PRINT / CANCEL / POST / ATTACH
  // ==========================

  const handlePrint = async () => {
    if (!documentID) return;
    updateState({ showSignatoryModal: true });
  };

  const handleCancel = async () => {
    if (documentID && documentStatus === "") {
      updateState({ showCancelModal: true });
    }
  };

  const handlePost = async () => {
    if (documentID && documentStatus === "") {
      updateState({ showPostModal: true });
    }
  };

  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  const handleCopy = async () => {
    if (detailRows.length === 0) return;

    if (documentID) {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "Open",
      });
    }
  };

  // ==========================
  // HISTORY – URL PARAM HANDLING
  // ==========================

  const cleanUrl = useCallback(() => {
    navigate(location.pathname, { replace: true });
  }, [navigate, location.pathname]);

  const handleHistoryRowPick = useCallback((row) => {
    const docNo = row?.docNo;
    const branchCode = row?.branchCode;
    if (!docNo || !branchCode) return;
    fetchTranData(docNo, branchCode);
    setTopTab("details");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("poNo");
    const brCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && brCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode: brCode });
      cleanUrl();
    }
  }, [location.search, handleHistoryRowPick, cleanUrl]);

  const printData = {
    pr_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  // ==========================
  // MODAL CLOSE HANDLERS
  // ==========================

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandleCancel(
        docType,
        documentID,
        userCode || "NSI",
        confirmation.reason,
        updateState,
      );

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: result.message,
        });
      }

      await fetchTranData(documentNo, branchCode);
    }
    updateState({ showCancelModal: false });
  };

  const handleClosePost = async () => {
    if (documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandlePost(
        docType,
        documentID,
        userCode,
        updateState,
      );
      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: result.message,
        });
      }
      await fetchTranData(documentNo, branchCode);
    }
    updateState({ showPostModal: false });
  };

  const handleCloseSignatory = async (mode) => {
    updateState({
      showSpinner: true,
      showSignatoryModal: false,
      noReprints: mode === "Final" ? 1 : 0,
    });
    await useHandlePrint(documentID, docType, mode);
    updateState({
      showSpinner: false,
    });
  };

  const handleSaveAndPrint = async (poId) => {
    updateState({ showSpinner: true });
    await useHandlePrint(poId, docType);
    updateState({ showSpinner: false });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
        branchCode: selectedBranch.branchCode,
        branchName: selectedBranch.branchName,
      });
    }
    updateState({ branchModalOpen: false });
  };

  const handleCloseRCModal = (selectedRC) => {
    // Just closing
    if (!selectedRC) {
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
      return;
    }

    // Common mapping from modal row
    const { rcCode: selectedCode, rcName: selectedName } = selectedRC;

    if (rcLookupContext === "rc") {
      // Selecting Responsibility Center:
      //  - RC changes
      //  - Requesting Dept follows by default
      updateState({
        rcCode: selectedCode,
        rcName: selectedName,
        reqRcCode: selectedCode,
        reqRcName: selectedName,
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    } else if (rcLookupContext === "reqDept") {
      // Selecting Requesting Dept:
      //  - Only Requesting Dept changes
      //  - Responsibility Center stays as-is
      updateState({
        reqRcCode: selectedCode,
        reqRcName: selectedName,
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    } else {
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    }
  };

  const handlePOStatChange = (e) => {
    const selectedType = e.target.value;
    updateState({ selectedJVType: selectedType });
  };

  const handleCloseCustModal = (selectedCustomer) => {
    if (selectedCustomer) {
      updateState({
        custCode: selectedCustomer.custCode || selectedCustomer.customerCode || "",
        custName: selectedCustomer.custName || selectedCustomer.customerName || "",
      });
    }
    updateState({ custModalOpen: false });
  };

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
      await handleSelectCurrency(selectedCurrency.currCode);
    }
    updateState({ currencyModalOpen: false });
  };

  const handleSelectCurrency = async (code) => {
    if (code) {
      const result = await useTopCurrencyRow(code);
      if (result) {
        const rate =
          code === glCurrDefault
            ? defaultCurrRate
            : await useTopForexRate(code, header.rr_date);

        updateState({
          currCode: result.currCode,
          currName: result.currName,
          currRate: formatNumber(parseFormattedNumber(rate), 6),
        });
      }
    }
  };

  const handleCloseBillTermModal = async (selectedBillTerm) => {
    if (selectedBillTerm) {
      await handleSelectBillTerm(selectedBillTerm.billtermCode);
    }
    updateState({ billtermModalOpen: false });
  };

  const handleSelectBillTerm = async (billtermCode) => {
    if (billtermCode) {
      const result = await useTopBillTermRow(billtermCode);
      if (result) {
        updateState({
          billtermCode: result.billtermCode,
          billtermName: result.billtermName,
          daysDue: result.daysDue,
        });
      }
    }
  };


  const msisDetailColumnDefs = useMemo(() => [
    { key: "ln", label: "LN", width: 56 },
    { key: "itemCode", label: "Item Code", width: 130 },
    { key: "itemName", label: "Item Description", width: 300 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "quantity", label: "Quantity", width: 130 },
    { key: "unitCost", label: "Unit Cost", width: 130 },
    { key: "amount", label: "Amount", width: 140 },
    { key: "lotNo", label: "Lot No", width: 130 },
    { key: "bbDate", label: "BB Date", width: 140 },
    { key: "itemStat", label: "Item Stat", width: 120 },
    { key: "whouseCode", label: "Warehouse", width: 160 },
    { key: "locCode", label: "Location", width: 160 },
    { key: "drAcctCode", label: "DR Acct", width: 130 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "qtyOnHand", label: "Qty on Hand", width: 130 },
    { key: "mrsNo", label: "MRS No.", width: 130 },
    { key: "mrsQty", label: "MRS Qty", width: 130 },
  ], []);

  const {
    getColumnStyle: getMSISDetailColumnStyle,
    getFrozenColumnStyle: getMSISDetailFrozenStyle,
    getOrderedColumns: getOrderedMSISDetailColumns,
    getSortedRows: getSortedMSISDetailRows,
    renderHeaderContextMenu: renderMSISDetailHeaderContextMenu,
    renderResizableHeader: renderMSISDetailHeader,
  } = useResizableTableColumns(msisDetailColumnDefs);

  const orderedMSISDetailColumns = useMemo(
    () => getOrderedMSISDetailColumns(msisDetailColumnDefs),
    [getOrderedMSISDetailColumns, msisDetailColumnDefs]
  );

  const getMSISDetailFallbackWidth = useCallback(
    (key) => msisDetailColumnDefs.find((column) => column.key === key)?.width || 120,
    [msisDetailColumnDefs]
  );

  const getMSISDetailCellStyle = useCallback(
    (key, fallbackWidth) => ({
      ...getMSISDetailColumnStyle(key, fallbackWidth),
      ...getMSISDetailFrozenStyle(key, orderedMSISDetailColumns, fallbackWidth, { isHeader: false }),
    }),
    [getMSISDetailColumnStyle, getMSISDetailFrozenStyle, orderedMSISDetailColumns]
  );

  const msisDetailSortRows = useMemo(
    () => detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    [detailRows]
  );

  const sortedMSISDetailRows = useMemo(
    () => getSortedMSISDetailRows(
      msisDetailSortRows,
      (entry, sortKey) => (sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "")
    ),
    [getSortedMSISDetailRows, msisDetailSortRows]
  );

  const msisEnterNextRowZeroClearFields = ["quantity", "unitCost", "mrsQty"];

  const handleAddBlankRow = (index) => {
    if (isFormDisabled) return;

    const blankRow = {
      itemCode: "",
      itemName: "",
      uomCode: "",
      quantity: formatNumber(0, 6),
      unitCost: formatNumber(0, 6),
      amount: formatNumber(0, 2),
      lotNo: "",
      bbDate: "",
      itemStat: "",
      whouseCode: state.WHcode || "",
      whouseName: state.WHname || "",
      locCode: state.locCode || "",
      locName: state.locName || "",
      drAcctCode: "",
      drAcctName: "",
      rcCode: rcCode || "",
      slCode: "",
      qtyOnHand: formatNumber(0, 6),
      mrsNo: "",
      mrsQty: formatNumber(0, 6),
      remarks: "",
    };

    const updatedRows = [...detailRows];
    updatedRows.splice(index + 1, 0, blankRow);
    updateState({ detailRows: updatedRows });
    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
      0
    );
    updateTotalsDisplay(totalQty);
  };

  const renderMSISDetailCell = (columnKey, row, index) => {
    const columnWidth = getMSISDetailFallbackWidth(columnKey);
    const style = getMSISDetailCellStyle(columnKey, columnWidth);
    const rowLocked = isFormDisabled;

    const focusDetailCell = (field, nextIndex) => {
      const nextEl = document.getElementById(`${field}-${nextIndex}`);
      if (nextEl) {
        nextEl.focus();
        if (typeof nextEl.select === "function") nextEl.select();
      }
    };

    const focusNextDetailCell = (field) => {
      const maxRowIndex = Math.max((detailRows || []).length - 1, 0);
      const nextRowIndex = Math.min(maxRowIndex, index + 1);
      focusDetailCell(field, nextRowIndex);
    };

    const handleGridKeyDown = (e, field, options = {}) => {
      if (options.readOnly || options.disabled || rowLocked) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (options.commitOnEnter) handleDetailChange(index, field, e.target.value, true);
        focusNextDetailCell(field);
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

      e.preventDefault();
      if (e.key === "ArrowUp") focusDetailCell(field, Math.max(0, index - 1));
      if (e.key === "ArrowDown") focusDetailCell(field, Math.min((detailRows || []).length - 1, index + 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const editableColumns = orderedMSISDetailColumns
          .map((column) => column.key)
          .filter((key) => !["ln", "itemName", "uomCode", "amount", "qtyOnHand"].includes(key));
        const currentColIndex = editableColumns.indexOf(field);
        const nextColIndex = e.key === "ArrowLeft"
          ? Math.max(0, currentColIndex - 1)
          : Math.min(editableColumns.length - 1, currentColIndex + 1);
        if (nextColIndex >= 0) focusDetailCell(editableColumns[nextColIndex], index);
      }
    };

    const textInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={options.value ?? row[field] ?? ""}
        readOnly={options.readOnly ?? rowLocked}
        disabled={options.disabled ?? false}
        onChange={(e) => handleDetailChange(index, field, e.target.value)}
        onKeyDown={(e) => handleGridKeyDown(e, field, options)}
      />
    );

    const numericInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
        value={options.value ?? row[field] ?? ""}
        readOnly={options.readOnly ?? rowLocked}
        disabled={options.disabled ?? false}
        onChange={(e) => {
          const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
          if (/^\d*\.?\d*$/.test(sanitizedValue) || sanitizedValue === "") {
            handleDetailChange(index, field, sanitizedValue);
          }
        }}
        onFocus={(e) => {
          if ((options.readOnly ?? rowLocked) || (options.disabled ?? false)) return;
          if (msisEnterNextRowZeroClearFields.includes(field) && parseFormattedNumber(e.target.value || 0) === 0) {
            handleDetailChange(index, field, "");
          }
        }}
        onBlur={(e) => {
          if ((options.readOnly ?? rowLocked) || (options.disabled ?? false)) return;
          handleDetailChange(index, field, e.target.value);
        }}
        onKeyDown={(e) => handleGridKeyDown(e, field, { ...options, commitOnEnter: true })}
      />
    );

    const lookupCell = (field, displayValue, onLookup, options = {}) => (
      <td key={columnKey} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          <input
            type="text"
            id={`${field}-${index}`}
            className="w-full global-tran-td-inputclass-ui pr-6"
            value={displayValue || ""}
            readOnly
            disabled={options.disabled ?? rowLocked}
            onClick={() => !rowLocked && onLookup?.()}
            onKeyDown={(e) => handleGridKeyDown(e, field, { readOnly: true })}
          />
          {!rowLocked && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute right-2 text-blue-600 cursor-pointer hover:text-blue-900"
              onClick={onLookup}
            />
          )}
        </div>
      </td>
    );

    const detailColumnRenderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      itemCode: () => lookupCell("itemCode", row.itemCode || "", () => handleOpenMSLookup()),
      itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("itemName", { readOnly: true })}</td>,
      uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("uomCode", { readOnly: true })}</td>,
      quantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("quantity", { value: row.quantity ?? row.qtyNeeded ?? "0.000000" })}</td>,
      unitCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("unitCost", { value: row.unitCost ?? "0.000000" })}</td>,
      amount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("amount", { readOnly: true, value: row.amount ?? "0.00" })}</td>,
      lotNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("lotNo", { readOnly: rowLocked })}</td>,
      bbDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`bbDate-${index}`} className="w-full global-tran-td-inputclass-ui text-center" value={row.bbDate || ""} readOnly={rowLocked} disabled={rowLocked} onChange={(e) => handleDetailChange(index, "bbDate", e.target.value)} onKeyDown={(e) => handleGridKeyDown(e, "bbDate", { readOnly: rowLocked })} /></td>,
      itemStat: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("itemStat", { readOnly: rowLocked })}</td>,
      whouseCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("whouseCode", { readOnly: true, value: row.whouseName ?? row.whName ?? row.whouseCode ?? row.WHname ?? row.WHcode ?? "" })}</td>,
      locCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("locCode", { readOnly: true, value: row.locName ?? row.locCode ?? "" })}</td>,
      drAcctCode: () => lookupCell("drAcctCode", row.drAcctCode || "", () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "drAcct" })),
      rcCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rcCode", { readOnly: rowLocked, value: row.rcCode || rcCode || "" })}</td>,
      slCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("slCode", { readOnly: rowLocked })}</td>,
      qtyOnHand: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("qtyOnHand", { readOnly: true, value: row.qtyOnHand || "0.000000" })}</td>,
      mrsNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("mrsNo", { readOnly: rowLocked })}</td>,
      mrsQty: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("mrsQty", { value: row.mrsQty || "0.000000" })}</td>,
    };

    return detailColumnRenderers[columnKey]?.() ?? (
      <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>
    );
  };

  // ==========================
  // RENDER
  // ==========================

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          printData={printData}
          onReset={handleReset}
          onSave={() => handleActivityOption("Upsert")}
          onPost={handlePost}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          onHistory={() => setTopTab("history")}
          isSaveDisabled={isSaveDisabled}
          isResetDisabled={isResetDisabled}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>



      {/* Page title and subheading */} 
      <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
        <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
          <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
        </div>
        <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
          <div>
            <p className="global-tran-headerstat-text-ui">Transaction Status</p>
            <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
          </div>
        </div>
      </div>

      {/* Form Layout with Tabs */}
      <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
        {/* Tab Navigation */}
        <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
          <button
            className={`global-tran-tab-padding-ui ${
              activeTab === "basic"
                ? "global-tran-tab-text_active-ui"
                : "global-tran-tab-text_inactive-ui"
            }`}
            onClick={() => updateState({ activeTab: "basic" })}
          >
            Basic Information
          </button>
          {/* Provision for Other Tabs */}
        </div>

          {/* MSIS Header Form Section */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative"
            id="msis_hd"
          >
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Column 1 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  readOnly
                  disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  lookupDisabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  onLookup={() =>
                    !(state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled) &&
                    updateState({ branchModalOpen: true })
                  }
                />

                <FieldRenderer
                  id="msisNo"
                  label="MSIS No."
                  type="text"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled || isFormDisabled}
                  onChange={(val) => updateState({ documentNo: val })}
                  onBlur={handlePrNoBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!state.isDocNoDisabled && !isFormDisabled) handlePrNoBlur();
                      document.getElementById("rr_date")?.focus();
                    }
                  }}
                />

                <FieldRenderer
                  id="rr_date"
                  label="MSIS Date"
                  type="date"
                  value={state.header?.rr_date || header.rr_date || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => {
                    setHeader((prev) => ({ ...prev, rr_date: val }));
                    updateState({ header: { ...(state.header || {}), rr_date: val } });
                  }}
                />

                <FieldRenderer
                  id="msisRefNo"
                  label="MSIS Ref No."
                  type="text"
                  value={attention || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ attention: val })}
                />
              </div>

              {/* Column 2 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="rcName"
                  label="Responsibility Center"
                  type="lookup"
                  value={rcName || ""}
                  required
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({
                      rcLookupModalOpen: true,
                      rcLookupContext: "rc",
                    })
                  }
                />

                <FieldRenderer
                  id="reqRcName"
                  label="Requesting Dept."
                  type="lookup"
                  value={reqRcName || ""}
                  required
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({
                      rcLookupModalOpen: true,
                      rcLookupContext: "reqDept",
                    })
                  }
                />

                <FieldRenderer
                  id="WHcode"
                  label="Warehouse"
                  type="lookup"
                  value={state.WHname || state.WHcode || ""}
                  required
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && updateState({ warehouseLookupOpen: true })}
                />

                <FieldRenderer
                  id="locName"
                  label="Location"
                  type="lookup"
                  value={state.locName || state.locCode || ""}
                  required
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && updateState({ locationLookupOpen: true })}
                />
              </div>

              {/* Column 3 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="vendCode"
                  label="Employee Code"
                  type="lookup"
                  value={vendCode || vendCOde || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({
                      rcLookupModalOpen: true,
                      rcLookupContext: "payeeCode",
                    })
                  }
                />

                <FieldRenderer
                  id="vendName"
                  label="Employee Name"
                  type="text"
                  value={vendName || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ vendName: val })}
                />

                <FieldRenderer
                  id="custCode"
                  label="Customer Code"
                  type="lookup"
                  value={state.custCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && updateState({ custModalOpen: true })}
                />

                <FieldRenderer
                  id="custName"
                  label="Customer Name"
                  type="text"
                  value={state.custName || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ custName: val })}
                />
              </div>

              <div className="col-span-full">
                <div className="relative p-2">
                  <textarea
                    id="remarks"
                    placeholder=""
                    rows={4}
                    className="peer global-tran-textbox-remarks-ui pt-2"
                    value={remarks}
                    onChange={(e) => updateState({ remarks: e.target.value })}
                    disabled={isFormDisabled}
                  />
                  <label htmlFor="remarks" className="global-tran-floating-label-remarks">
                    Remarks
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================
            MSIS DETAIL TABLE (DT1)
           ===================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Item Detail
              </span>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedMSISDetailColumns.map((column) =>
                      renderMSISDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedMSISDetailColumns,
                      })
                    )}
                    {!isFormDisabled && (
                      <th
                        className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                        style={transactionActionsHeaderStyle}
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {sortedMSISDetailRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="global-tran-tr-ui">
                      {orderedMSISDetailColumns.map((column) =>
                        renderMSISDetailCell(column.key, row, originalIndex)
                      )}
                      {!isFormDisabled && (
                        <td
                          className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          style={transactionActionsCellStyle}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="global-tran-td-button-add-ui"
                              onClick={() => handleAddBlankRow(originalIndex)}
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={() => handleDeleteRow(originalIndex)}
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderMSISDetailHeaderContextMenu?.()}
            </div>
          </div>

          {/* Detail Footer: Add Button + Total */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div className="inline-block">
                <button
                  onClick={handleOpenMSLookup}
                  disabled={isFormDisabled || !rcCode || !reqRcCode || !state.WHcode}
                  className={`global-tran-tab-footer-button-add-ui ${
                    isFormDisabled || !rcCode || !reqRcCode || !state.WHcode
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalQty" className="global-tran-tab-footer-total-label-ui">
                  Total Quantity:
                </label>
                <label htmlFor="TotalQty" className="global-tran-tab-footer-total-value-ui">
                  {totals.totalQtyNeeded}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORY TAB */}
      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getPRHistory"
          cacheKey={`PR:${state.branchCode || ""}:${state.documentNo || ""}`}
          activeTabKey="PR_Summary"
          branchCode={state.branchCode}
          startDate={null}
          endDate={null}
          status={(() => {
            const s = (state.status || "").toUpperCase();
            if (s === "FINALIZED") return "F";
            if (s === "CANCELLED") return "X";
            if (s === "CLOSED") return "C";
            if (s === "OPEN") return "";
            return "All";
          })()}
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {/* MODALS */}
      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {rcLookupModalOpen && (
        <RCLookupModal
          isOpen={rcLookupModalOpen}
          onClose={handleCloseRCModal}
          customParam="ActiveDept"
        />
      )}

      {currencyModalOpen && (
        <CurrLookupModal
          isOpen={currencyModalOpen}
          onClose={handleCloseCurrencyModal}
        />
      )}

      {billtermModalOpen && (
        <BillTermLookupModal
          isOpen={billtermModalOpen}
          onClose={handleCloseBillTermModal}
        />
      )}

      {custModalOpen && (
        <CustomerMastLookupModal
          isOpen={custModalOpen}
          onClose={handleCloseCustModal}
        />
      )}

      {showCancelModal && (
        <CancelTranModal isOpen={showCancelModal} onClose={handleCloseCancel} />
      )}

      {showPostModal && (
        <PostTranModal isOpen={showPostModal} onClose={handleClosePost} />
      )}

      {showAttachModal && (
        <AttachDocumentModal
          isOpen={showAttachModal}
          params={{
            DocumentID: documentID,
            DocumentName: documentName,
            BranchName: branchName,
            DocumentNo: documentNo,
          }}
          onClose={() => updateState({ showAttachModal: false })}
        />
      )}

      {showSignatoryModal && (
        <DocumentSignatories
          isOpen={showSignatoryModal}
          params={{ noReprints, documentID, docType }}
          onClose={handleCloseSignatory}
          onCancel={() => updateState({ showSignatoryModal: false })}
        />
      )}

      {msLookupModalOpen && (
        <GlobalLookupModalv1
          isOpen={msLookupModalOpen}
          data={globalLookupRow}
          btnCaption="Get Selected Items"
          title="MS Location Balance"
          endpoint={globalLookupHeader}
          onClose={handleCloseMSLookup}
          onCancel={() => updateState({ msLookupModalOpen: false })}
          singleSelect={false}
        />
      )}


      {state.warehouseLookupOpen && (
        <WarehouseLookupModal
          isOpen={state.warehouseLookupOpen}
          onClose={handleCloseWarehouseLookup}
          filter="ActiveAll"
        />
      )}

      {/* COA Account Modal */}
      {showAccountModal && (
        <COAMastLookupModal
          isOpen={showAccountModal}
          onClose={handleCloseAccountModal}
          source={accountModalSource}
        />
      )}

      {state.locationLookupOpen && (
        <LocationLookupModal
          isOpen={state.locationLookupOpen}
          onClose={handleCloseLocationLookup}
          filter="ActiveAll"
        />
      )}

      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default MSIS;
