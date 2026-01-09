import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faSpinner,
  faSearch,
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

// Configuration
import { postRequest } from "../../../Configuration/BaseURL.jsx";
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
} from "@/NAYSA Cloud/Global/behavior";

// Header
import Header from "@/NAYSA Cloud/Components/Header";

const MSIS = () => {
  const loadedFromUrlRef = useRef(false);
  const navigate = useNavigate();
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
    currRate: "",

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
    currCode: "",
    currName: "",
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
    vendName: "",
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
    selectedRowIndex: null,
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
    displayStatus
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
  console.log("🟦 source:", accountModalSource, " rowIndex:", selectedRowIndex);
  console.log("🟦 selectedAccount:", selectedAccount);

  // always close modal
  if (!selectedAccount || selectedRowIndex === null || selectedRowIndex === undefined) {
    updateState({ showAccountModal: false, selectedRowIndex: null, accountModalSource: null });
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

  updateState({ showAccountModal: false, selectedRowIndex: null, accountModalSource: null });
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
    curr = currCode
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
        (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
        0
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

  const handleCloseMSLookup = (selectedItem) => {
    if (!selectedItem) {
      updateState({ msLookupModalOpen: false });
      return;
    }

    const today = header.rr_date || new Date().toISOString().split("T")[0];

    const newRow = {
      lN: detailRows.length + 1,

      // FROM LOOKUP
      itemCode: selectedItem.itemCode ?? "",
      itemName: selectedItem.itemName ?? "",
      uomCode: selectedItem.uomCode ?? selectedItem.uom ?? "", // ✅ map uom
      qtyOnHand: selectedItem.qtyOnHand ?? selectedItem.qtyHand ?? "0.000000", // ✅ map qtyHand

      // OPTIONAL: keep these if you want to show them somewhere
      categCode: selectedItem.categCode ?? "",
      categDesc: selectedItem.categDesc ?? "",
      classCode: selectedItem.classCode ?? "",
      classDesc: selectedItem.classDesc ?? "",

      // DEFAULTS (MSIS fields)
      quantity: "0.000000",
      unitCost: "0.000000",
      amount: "0.000000",

      lotNo: "",
      bbDate: "",
      itemStat: "",
      drAcctCode: "",
drAcctName: "",


      // default warehouse/location from header (your earlier setup)
      whouseCode: state.WHcode ?? "",
      whName: state.WHname ?? "",
      locCode: state.locCode ?? "",
      locName: state.locName ?? "",

      drAcct: "",
      rcCode: state.rcCode ?? "",
      slCode: "",

      mrsNo: "",
      mrsQty: "0.000000",
    };

    const updatedRows = [...detailRows, newRow];
    updateState({
      detailRows: updatedRows,
      msLookupModalOpen: false,
    });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0
    );
    updateTotalsDisplay(totalQty);
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
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0
    );
    updateTotalsDisplay(totalQty);

    setShowTypeDropdown(false);
  };

  const handleOpenMSLookup = () => {
    if (isFormDisabled) return;
    setShowTypeDropdown(false);
    updateState({ msLookupModalOpen: true });
  };

  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0
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
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0
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
        userCode: userCode || user?.USER_CODE || "NSI",

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
        "msisNo"
      );

      if (response) {
        useSwalshowSaveSuccessDialog(handleReset, () =>
          handleSaveAndPrint(response.data[0].msisId)
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
        updateState
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
        updateState
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
        {/* Header Section */}
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>

          <div className="global-tran-headerstat-div-ui">
            <div>
              <p className="global-tran-headerstat-text-ui">
                Transaction Status
              </p>
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>
                {displayStatus}
              </h1>
            </div>
          </div>
        </div>

        {/* Form Layout with Tabs */}
        <div className="global-tran-header-div-ui">
          {/* Tab Navigation */}
          <div className="global-tran-header-tab-div-ui">
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
          </div>

          {/* PR Header Form Section */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative"
            id="pr_hd"
          >
            {/* Columns 1–3 (Header fields) */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Column 1: Branch / PR No / PR Date */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Branch */}
                <div className="relative">
                  <input
                    type="text"
                    id="branchName"
                    placeholder=" "
                    value={branchName}
                    readOnly
                    onFocus={(e) => e.target.blur()}
                    className="peer global-tran-textbox-ui cursor-pointer select-none"
                  />
                  <label
                    htmlFor="branchName"
                    className="global-tran-floating-label"
                  >
                    Branch
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={
                      state.isFetchDisabled ||
                      state.isDocNoDisabled ||
                      isFormDisabled
                    }
                    onClick={() =>
                      !isFormDisabled && updateState({ branchModalOpen: true })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* PR No */}
                <div className="relative">
                  <input
                    type="text"
                    id="poNo"
                    value={state.documentNo}
                    onChange={(e) =>
                      updateState({ documentNo: e.target.value })
                    }
                    onBlur={handlePrNoBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        document.getElementById("PRDate")?.focus();
                      }
                    }}
                    placeholder=" "
                    className={`peer global-tran-textbox-ui ${
                      state.isDocNoDisabled
                        ? "bg-blue-100 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={state.isDocNoDisabled}
                  />
                  <label htmlFor="poNo" className="global-tran-floating-label">
                    MSIS NO.
                  </label>
                  <button
                    className={`global-tran-textbox-button-search-padding-ui ${
                      state.isFetchDisabled || state.isDocNoDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={state.isFetchDisabled || state.isDocNoDisabled}
                    onClick={() => {
                      if (!state.isDocNoDisabled) {
                        fetchTranData(state.documentNo, state.branchCode);
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* PR Date */}
                <div className="relative">
                  <input
                    type="date"
                    id="RRDate"
                    className="peer global-tran-textbox-ui"
                    value={header.rr_date}
                    onChange={(e) =>
                      setHeader((prev) => ({
                        ...prev,
                        rr_date: e.target.value,
                      }))
                    }
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="RRDate"
                    className="global-tran-floating-label"
                  >
                    MSIS Date
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="drNo"
                    value={attention}
                    placeholder=" "
                    onChange={(e) => updateState({ vendName: e.target.value })}
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label htmlFor="drno" className="global-tran-floating-label">
                    MSIS Ref No.
                  </label>
                </div>
              </div>

              {/* Column 2: Responsibility Center / Requesting Dept / Tran Type */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Responsibility Center */}
                <div className="relative">
                  <input
                    type="text"
                    id="rcName"
                    value={rcName}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="rcName"
                    className="global-tran-floating-label"
                  >
                    Responsibility Center<span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({
                        rcLookupModalOpen: true,
                        rcLookupContext: "rc",
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* Requesting Dept. */}
                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="rcName"
                    value={reqRcName}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="reqRcName"
                    className="global-tran-floating-label"
                  >
                    Requesting Dept.<span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({
                        rcLookupModalOpen: true,
                        rcLookupContext: "reqDept",
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="WHcode"
                    value={state.WHname || state.WHcode || ""}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="WHcode"
                    className="global-tran-floating-label"
                  >
                    Warehouse <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({ warehouseLookupOpen: true })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="locName"
                    value={state.locName || state.locCode || ""}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({ locationLookupOpen: true })
                    }
                  />
                  <label
                    htmlFor="locName"
                    className="global-tran-floating-label"
                  >
                    Location <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({ locationLookupOpen: true })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </div>

              {/* Column 3: Currency */}
              <div className="global-tran-textbox-group-div-ui">
                {/* NEW FLEX CONTAINER FOR CURRENCY AND CURRENCY RATE */}
                {/* Employee Name */}
                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="vendCode"
                    value={vendCOde}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="vendCode"
                    className="global-tran-floating-label"
                  >
                    Employee Code
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({
                        rcLookupModalOpen: true,
                        rcLookupContext: "payeeCode",
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* Employee Name */}
                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="vendCode"
                    value={vendCOde}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="vendCode"
                    className="global-tran-floating-label"
                  >
                    Employee Name
                  </label>
                </div>

                {/* Customer Code  */}
                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="vendCode"
                    value={vendCOde}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="vendCode"
                    className="global-tran-floating-label"
                  >
                    Customer Code
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({
                        rcLookupModalOpen: true,
                        rcLookupContext: "payeeCode",
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* Customer Name  */}
                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="vendCode"
                    value={vendCOde}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="vendCode"
                    className="global-tran-floating-label"
                  >
                    Customer Name
                  </label>
                </div>

                {/* po type */}

                {/* <div className="relative">
                <select
                  id="poType"
                  className="peer global-tran-textbox-ui"
                  value={selectedPoType}
                  onChange={handlePrTypeChange}
                  disabled={isFormDisabled}
                >
                  <option value="">Open</option>
                  <option value="">Closed</option>
                  <option value="">Cancelled</option>
                </select>
                <label htmlFor="prType" className="global-tran-floating-label">
                  PO Status
                </label>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div> */}

                {/* colum 3 */}
                {/* </div>
              <div className="relative">
                <select
                  id="poType"
                  className="peer global-tran-textbox-ui"
                  value={selectedPoType}
                  onChange={handlePrTypeChange}
                  disabled={isFormDisabled}
                >
                  <option value="">Open</option>
                  <option value="">Closed</option>
                  <option value="">Cancelled</option>
                </select>
                <label htmlFor="prType" className="global-tran-floating-label">
                  PO Status
                </label>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div> */}
              </div>

              {/* Remarks (spans all 3 header columns) */}
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
                  <label
                    htmlFor="remarks"
                    className="global-tran-floating-label-remarks"
                  >
                    Remarks
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================
            PR DETAIL TABLE (DT1)
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
              <table className="min-w-full border-collapse">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    <th className="global-tran-th-ui">LN</th>
                    <th className="global-tran-th-ui">Item Code</th>
                    <th className="global-tran-th-ui">Item Description</th>
                    <th className="global-tran-th-ui">UOM</th>
                    <th className="global-tran-th-ui">Quantity</th>
                    <th className="global-tran-th-ui">Unit Cost</th>
                    <th className="global-tran-th-ui">Amount</th>
                    <th className="global-tran-th-ui">Lot No</th>
                    <th className="global-tran-th-ui">BB Date</th>
                    <th className="global-tran-th-ui">Item Stat</th>
                    <th className="global-tran-th-ui">Warehouse</th>
                    <th className="global-tran-th-ui">Location</th>
                    <th className="global-tran-th-ui">DR Acct</th>
                    <th className="global-tran-th-ui">RC Code</th>
                    <th className="global-tran-th-ui">SL Code</th>
                    <th className="global-tran-th-ui">Qty on Hand</th>
                    <th className="global-tran-th-ui">MRS No.</th>
                    <th className="global-tran-th-ui">MRS Qty</th>

                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                        Delete
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {detailRows.map((row, index) => {
                    // Fallback mapping (since your old MSIS rows use qtyNeeded, etc.)
                    const qty = row.quantity ?? row.qtyNeeded ?? "0.000000";
                    const unitCost = row.unitCost ?? "0.000000";

                    // Compute amount if not provided
                    const computedAmount =
                      row.amount ??
                      String(
                        (parseFormattedNumber(qty) || 0) *
                          (parseFormattedNumber(unitCost) || 0)
                      );

                    return (
                      <tr key={index} className="global-tran-tr-ui">
                        {/* LN */}
                        <td className="global-tran-td-ui text-center">
                          {index + 1}
                        </td>

                        {/* Item Code */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[120px] global-tran-td-inputclass-ui"
                            value={row.itemCode || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "itemCode",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Item Description */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[240px] global-tran-td-inputclass-ui"
                            value={row.itemName || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "itemName",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* UOM */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[80px] global-tran-td-inputclass-ui"
                            value={row.uomCode || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "uomCode",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Quantity */}
                        <td className="global-tran-td-ui text-right">
                          <input
                            type="text"
                            className="w-[120px] global-tran-td-inputclass-ui text-right"
                            value={qty}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Unit Cost */}
                        <td className="global-tran-td-ui text-right">
                          <input
                            type="text"
                            className="w-[120px] global-tran-td-inputclass-ui text-right"
                            value={unitCost}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "unitCost",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Amount */}
                        <td className="global-tran-td-ui text-right">
                          <input
                            type="text"
                            className="w-[120px] global-tran-td-inputclass-ui text-right bg-blue-50"
                            value={row.amount ?? "0.00"}
                            readOnly
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Lot No */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[120px] global-tran-td-inputclass-ui"
                            value={row.lotNo || ""}
                            onChange={(e) =>
                              handleDetailChange(index, "lotNo", e.target.value)
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* BB Date */}
                        <td className="global-tran-td-ui">
                          <input
                            type="date"
                            className="w-[140px] global-tran-td-inputclass-ui"
                            value={row.bbDate || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "bbDate",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Item Stat */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[110px] global-tran-td-inputclass-ui"
                            value={row.itemStat || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "itemStat",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Warehouse */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[160px] global-tran-td-inputclass-ui"
                            value={
                              row.whName ??
                              row.whouseName ??
                              row.whouseCode ??
                              row.WHname ??
                              row.WHcode ??
                              ""
                            }
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "whName",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Location */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[160px] global-tran-td-inputclass-ui"
                            value={row.locName ?? row.locCode ?? ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "locName",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* DR Account */}
                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                          <input
  type="text"
  className="global-tran-td-inputclass-ui"
  value={row.drAcctCode || ""}   // ✅ FIXED
  readOnly
  onClick={() => {
    console.log("🟨 DR ACCT CLICK row:", index, " current:", row.drAcctCode, row.drAcctName);
    updateState({
      selectedRowIndex: index,
      showAccountModal: true,
      accountModalSource: "drAcct",
    });
  }}
/>

                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showAccountModal: true,
                                    accountModalSource: "drAcct",
                                  });
                                }}
                              />
                            )}
                          </div>
                        </td>

                        {/* RC Code */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[110px] global-tran-td-inputclass-ui"
                            value={row.rcCode || rcCode || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "rcCode",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* SL Code */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[110px] global-tran-td-inputclass-ui"
                            value={row.slCode || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "slCode",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Qty on Hand */}
                        <td className="global-tran-td-ui text-right">
                          <input
                            type="text"
                            className="w-[120px] global-tran-td-inputclass-ui text-right"
                            value={row.qtyOnHand || "0.000000"}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "qtyOnHand",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* MRS No. */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[130px] global-tran-td-inputclass-ui"
                            value={row.mrsNo || ""}
                            onChange={(e) =>
                              handleDetailChange(index, "mrsNo", e.target.value)
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* MRS Qty */}
                        <td className="global-tran-td-ui text-right">
                          <input
                            type="text"
                            className="w-[120px] global-tran-td-inputclass-ui text-right"
                            value={row.mrsQty || "0.000000"}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "mrsQty",
                                e.target.value
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>

                        {/* Delete */}
                        {!isFormDisabled && (
                          <td className="global-tran-td-ui text-center sticky right-0">
                            <button
                              className="global-tran-td-button-delete-ui"
                              onClick={() => handleDeleteRow(index)}
                            >
                              -
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Footer: Add Button + Total */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div className="inline-block">
                {showTypeDropdown && (
                  <div className="mb-2 bg-white dark:bg-slate-800 border rounded-md shadow-lg z-50 min-w-[140px]">
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                      onClick={() => handleSelectTypeAndAddRow("FG")}
                    >
                      FG
                    </button>
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                      onClick={handleOpenMSLookup}
                    >
                      MS
                    </button>
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                      onClick={() => handleSelectTypeAndAddRow("RM")}
                    >
                      RM
                    </button>
                  </div>
                )}

                <button
                  onClick={handleAddRowClick}
                  disabled={isFormDisabled || !rcCode || !reqRcCode}
                  className={`global-tran-tab-footer-button-add-ui ${
                    isFormDisabled || !rcCode || !reqRcCode
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
                <label
                  htmlFor="TotalQty"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Qty Needed:
                </label>
                <label
                  htmlFor="TotalQty"
                  className="global-tran-tab-footer-total-value-ui"
                >
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
        <MSLookupModal
          isOpen={msLookupModalOpen}
          onClose={handleCloseMSLookup}
          customParam={null} // or pass something if you need it
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
