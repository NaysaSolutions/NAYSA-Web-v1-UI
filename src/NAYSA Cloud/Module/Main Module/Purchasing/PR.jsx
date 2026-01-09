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
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import MSLookupModal from "../../../Lookup/SearchMSMast.jsx";

// Configuration
import { postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

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

const PR = () => {
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
    status: "",

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
      pr_date: new Date().toISOString().split("T")[0], // PR Date
      dateNeeded: new Date().toISOString().split("T")[0],
    },

    dateNeeded: new Date().toISOString().split("T")[0],

    branchCode: "HO",
    branchName: "Head Office",

    // Responsibility Center / Requesting Dept
    // Responsibility Center / Requesting Dept
    reqRcCode: "",
    reqRcName: "",
    currCode: "",
    currName: "",
    attention: "",

    // Currency information (not used by sproc_PHP_PR but kept for UI consistency)
    currCode: "",
    currName: "",
    currRate: "",
    defaultCurrRate: "1.000000",

    // Other Header Info (aligned to PR header fields)
    prTranTypes: [],
    prTypes: [],
    selectedPrTranType: "",
    selectedPrType: "",
    cutoffCode: "",
    rcCode: "",
    rcName: "", // responsibility center name for display
    requestDept: "",
    refPrNo1: "",
    refPrNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    noReprints: "0",
    prCancelled: "",

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

    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,

    // Header
    branchCode,
    branchName,

    // Responsibility Center
    rcCode,
    rcName,

    // Requesting Dept
    reqRcCode,
    reqRcName,

    currCode,
    currName,
    attention,
    prDate,
    cutoffFrom,
    cutoffTo,
    prStatus,

    prTranTypes,
    prTypes,
    selectedPrTranType,
    selectedPrType,
    cutoffCode,
    requestDept,
    dateNeeded,
    refPrNo1,
    refPrNo2,
    remarks,
    billtermCode,
    billtermName,
    noReprints,
    prCancelled,

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

    // RC Lookup
    rcLookupModalOpen,
    rcLookupContext,

    msLookupModalOpen,
  } = state;

  const isJobOrder = selectedPrTranType === "PR02";

  const [header, setHeader] = useState({
    pr_date: new Date().toISOString().split("T")[0],
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [totals, setTotals] = useState({
    totalQtyNeeded: "",
  });

  // PR.jsx
  const docType = docTypes?.PR || "PR";

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "Purchase Requisition";

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
      header: { pr_date: today },
      branchCode: "HO",
      branchName: "Head Office",
      cutoffCode: "",
      rcCode: "",
      rcName: "",
      reqRcCode: "",
      reqRcName: "",
      dateNeeded: today, // <-- DEFAULT TO TODAY
      refPrNo1: "",
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
      status: "",
      noReprints: "",
      prCancelled: "",
      detailRows: [],
      rcLookupModalOpen: false,
      rcLookupContext: "",
      msLookupModalOpen: false,
    });

    updateTotalsDisplay(0);
  };

  const loadCompanyData = async () => {
    updateState({ isLoading: true });
    try {
      const [prTranDrop, prTypeDrop] = await Promise.all([
        useTopDocDropDown(docType, "PRTRAN_TYPE"),
        useTopDocDropDown(docType, "PR_TYPE"),
      ]);

      if (prTranDrop) {
        updateState({
          prTranTypes: prTranDrop,
          selectedPrTranType: prTranDrop[0]?.DROPDOWN_CODE ?? "",
        });
      }
      if (prTypeDrop) {
        updateState({
          prTypes: prTypeDrop,
          selectedPrType: prTypeDrop[0]?.DROPDOWN_CODE ?? "",
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
    const data = await useTopDocDropDown(docType, "PRTRAN_TYPE");
    if (data) {
      updateState({
        prTranTypes: data,
        selectedPrTranType: data[0]?.DROPDOWN_CODE ?? "",
      });
    }
  };

  // ==========================
  // FETCH (GET) – PR HEADER + DT1
  // ==========================

  const fetchTranData = async (prNo, _branchCode) => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotalsDisplay(0);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(prNo, _branchCode, docType, "prNo");

      if (!data?.prId) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      let prDateForHeader = "";
      if (data.prDate) {
        const d = new Date(data.prDate);
        prDateForHeader = isNaN(d) ? "" : d.toISOString().split("T")[0];
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
        prStatus: item.prStatus || "",
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
      }));

      const totalQty = retrievedDetailRows.reduce(
        (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
        0
      );
      updateTotalsDisplay(totalQty);

      updateState({
        documentStatus: data.status,
        status: data.status,
        documentID: data.prId,
        documentNo: data.prNo,
        branchCode: data.branchCode,
        header: {
          pr_date: prDateForHeader,
          dateNeeded: dateNeededForHeader,
        },
        cutoffCode: data.cutoffCode || "",
        rcCode: data.rcCode || "",
        rcName: data.rcName || "",

        reqRcCode: data.reqRcCode || "",
        reqRcName: data.reqRcName || "",

        custCode: data.rcCode || "",
        custName: "",
        selectedPrTranType: data.prTranType || "",
        selectedPrType: data.prType || "",
        dateNeeded: dateNeededForHeader,
        refPrNo1: data.refPrNo1 || "",
        refPrNo2: data.refPrNo2 || "",
        remarks: data.remarks || "",
        prCancelled: data.prCancelled || "",
        noReprints: data.noReprints ?? "",
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

    const baseDate =
      dateNeeded || header.pr_date || new Date().toISOString().split("T")[0];

    const newRow = {
      invType: "MS",
      groupId: selectedItem.categCode || "",
      prStatus: status || "",
      itemCode: selectedItem.itemCode || "",
      itemName: selectedItem.itemName || "",
      uomCode: selectedItem.uom || "",
      qtyOnHand: formatNumber(selectedItem.qtyHand ?? 0, 6),
      qtyAlloc: "0.000000",
      qtyNeeded: "0.000000",
      uomCode2: "",
      uomQty2: "0.000000",
      dateNeeded: baseDate,
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: "0.000000",
      rrQty: "0.000000",
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
    updateState({ selectedPrTranType: e.target.value });
  };

  const handlePrTypeChange = (e) => {
    updateState({ selectedPrType: e.target.value });
  };

  // ==========================
  // DETAIL (PR_DT1) HANDLERS
  // ==========================

  // When user clicks the "Add Line" button
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

    // If PR is Job Order: add a JO line directly, no FG/MS/RM selection
    if (isJobOrder) {
      handleSelectTypeAndAddRow("JO"); // or "" if you prefer blank Type
      return;
    }

    // Normal behavior: toggle FG/MS/RM dropdown
    setShowTypeDropdown((prev) => !prev);
  };

  // When user picks FG / MS / RM
  const handleSelectTypeAndAddRow = (typeCode) => {
    const baseDate =
      dateNeeded || header.pr_date || new Date().toISOString().split("T")[0];

    const newRow = {
      invType: typeCode,
      groupId: "",
      prStatus: status || "",
      itemCode: "",
      itemName: "",
      uomCode: "",
      qtyOnHand: "0.000000",
      qtyAlloc: "0.000000",
      qtyNeeded: "0.000000",
      uomCode2: "",
      uomQty2: "0.000000",
      dateNeeded: baseDate,
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: "0.000000",
      rrQty: "0.000000",
    };

    const updatedRows = [...detailRows, newRow];
    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0
    );
    updateTotalsDisplay(totalQty);
  };

  const handleOpenMSLookup = () => {
    if (isFormDisabled) return;
    setShowTypeDropdown(false);
    updateState({ msLookupModalOpen: true });
  };

  const handleDeleteRow = (index) => {
  // ✅ prevent deleting the last remaining row
  if ((detailRows?.length || 0) <= 1) {
    Swal.fire({
      icon: "warning",
      title: "Cannot Delete",
      text: "At least one item row must remain.",
      timer: 2200,
      showConfirmButton: false,
    });
    return;
  }

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

    if (
      [
        "qtyOnHand",
        "qtyAlloc",
        "qtyNeeded",
        "uomQty2",
        "poQty",
        "rrQty",
      ].includes(field)
    ) {
      const sanitized = value.replace(/[^0-9.]/g, "");
      row[field] = sanitized;
    } else {
      row[field] = value;
    }

    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0
    );
    updateTotalsDisplay(totalQty);
  };


  const validateQtyNeeded = () => {
  if (!detailRows || detailRows.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "No Item Details",
      text: "Please add at least one item before saving.",
    });
    return false;
  }

  const invalidRows = detailRows.filter((row) => {
    const qty = parseFormattedNumber(row.qtyNeeded || 0);
    return !qty || qty <= 0;
  });

  if (invalidRows.length > 0) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Quantity Needed",
      html: `
        <div style="text-align:left">
          Quantity Needed is <b>required</b> and must be greater than zero.<br/><br/>
          <b>Affected line(s):</b>
          <ul>
            ${invalidRows
              .map((_, idx) => `<li>Line ${idx + 1}</li>`)
              .join("")}
          </ul>
        </div>
      `,
    });
    return false;
  }

  return true;
};

  // ==========================
  // SAVE / UPSERT (PR + DT1)
  // ==========================
  const handleActivityOption = async (action) => {
    // Only block save for hard-closed docs
    const blockedStatuses = ["FINALIZED"]; // add "CANCELLED", "CLOSED" if needed
    const currentStatus = String(documentStatus || "").toUpperCase();

    if (blockedStatuses.includes(currentStatus)) {
      return;
    }

    if (!validateQtyNeeded()) return;

    if (action !== "Upsert") return;


    updateState({ isLoading: true });

    try {
      const {
        branchCode,
        documentNo,
        documentID,
        header,
        selectedPrTranType,
        selectedPrType,
        refPrNo1,
        refPrNo2,
        cutoffCode,
        rcCode,
        reqRcCode,
        reqRcName,
        dateNeeded,
        remarks,
        noReprints,
        prCancelled,
        detailRows,
      } = state;

      const isNew = !documentID;

      const prData = {
        branchCode: branchCode,
        prNo: isNew ? "" : documentNo || "",
        prId: documentID || "",
        prDate: header.pr_date || null,
        cutoffCode: cutoffCode || "",
        rcCode: rcCode || "",
        reqRcCode: reqRcCode || "",
        reqRcName: reqRcName || "",
        prTranType: selectedPrTranType,
        dateNeeded: dateNeeded || null,
        prType: selectedPrType,
        refPrNo1: refPrNo1 || "",
        refPrNo2: refPrNo2 || "",
        remarks: remarks || "",
        status: status || "",
        prCancelled: prCancelled || "",
        noReprints: parseInt(noReprints || 0, 10),

        // ⬇️ THIS PART guarantees ALL CURRENT detailRows (including newly added) are sent
        dt1: detailRows.map((row, index) => ({
          PR_ID: documentID || "",
          BRANCH_CODE: branchCode,
          PR_NO: documentNo || "",
          PR_DATE: header.pr_date,
          CUTOFF_CODE: cutoffCode || "",

          INV_TYPE: row.invType || "",
          GROUP_ID: row.groupId || "",
          LINE_NO: index + 1,
          PR_STATUS: "",

          ITEM_CODE: row.itemCode || "",
          ITEM_NAME: row.itemName || "",
          UOM_CODE: row.uomCode || "",

          QTY_ONHAND: parseFormattedNumber(row.qtyOnHand || 0),
          QTY_ALLOC: parseFormattedNumber(row.qtyAlloc || 0),
          QTY_NEEDED: parseFormattedNumber(row.qtyNeeded || 0),

          UOM_CODE2: row.uomCode2 || "",
          UOM_QTY2: parseFormattedNumber(row.uomQty2 || 0),
          DATE_NEEDED: row.dateNeeded || null,

          ITEM_SPECS: row.itemSpecs || "",
          SERVICE_CODE: row.serviceCode || "",
          SERVICE_NAME: row.serviceName || "",

          PO_QTY: parseFormattedNumber(row.poQty || 0),
          RR_QTY: parseFormattedNumber(row.rrQty || 0),
        })),
      };

      console.log("PR Payload", prData);

      const response = await useTransactionUpsert(
        docType,
        prData,
        updateState,
        "prId",
        "prNo"
      );

      if (response) {
        useSwalshowSaveSuccessDialog(handleReset, () =>
          handleSaveAndPrint(response.data[0].prId)
        );
      }

      updateState({ isDocNoDisabled: true, isFetchDisabled: true });
    } catch (error) {
      console.error("Error during transaction upsert:", error);
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
        status: "",
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
    const docNo = params.get("prNo");
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
      if(confirmation && documentStatus !== "OPEN" && documentID !== null ) {
  
        const result = await useHandleCancel(docType,documentID,"NSI",confirmation.password,confirmation.reason,updateState);
        if (result.success) 
        {
         Swal.fire({
            icon: "success",
            title: "Success",
            text: "Cancellation Completed",
            timer: 5000, 
            timerProgressBar: true,
            showConfirmButton: false,
          });    
        }    
       await fetchTranData(documentNo,branchCode);
      }
      updateState({showCancelModal: false});
  };


  const handleClosePost = async () => {
    if (documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandlePost(docType, documentID, updateState);
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

  const handleSaveAndPrint = async (prId) => {
    updateState({ showSpinner: true });
    await useHandlePrint(prId, docType);
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
            : await useTopForexRate(code, header.pr_date);

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
                    id="prNo"
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
                  <label htmlFor="prNo" className="global-tran-floating-label">
                    PR No.
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
                    id="PRDate"
                    className="peer global-tran-textbox-ui"
                    value={header.pr_date}
                    onChange={(e) =>
                      setHeader((prev) => ({
                        ...prev,
                        pr_date: e.target.value,
                      }))
                    }
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="PRDate"
                    className="global-tran-floating-label"
                  >
                    PR Date
                  </label>
                </div>

                {/* PR Tran Type */}
                <div className="relative">
                  <select
                    id="prTranType"
                    className="peer global-tran-textbox-ui"
                    value={selectedPrTranType}
                    onChange={handlePrTranTypeChange}
                    disabled={isFormDisabled}
                  >
                    <option value="PRO1">Regular Transaction</option>
                    <option value="PR02">Job Order</option>
                  </select>
                  <label
                    htmlFor="prTranType"
                    className="global-tran-floating-label"
                  >
                    Tran Type
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
                    Responsibility Center
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
                    Requesting Dept.
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

                {/* PR Type */}
                <div className="relative">
                  <select
                    id="prType"
                    className="peer global-tran-textbox-ui"
                    value={selectedPrType}
                    onChange={handlePrTypeChange}
                    disabled={isFormDisabled}
                  >
                    <option value="">Regular</option>
                    <option value="">Priority</option>
                    <option value="">Urgent</option>
                  </select>
                  <label
                    htmlFor="prType"
                    className="global-tran-floating-label"
                  >
                    PR Type
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
                </div>

                {/* Date Needed */}
                <div className="relative">
                  <input
                    type="date"
                    id="dateNeeded"
                    value={dateNeeded}
                    placeholder=" "
                    onChange={(e) => {
                      const newDate = e.target.value;

                      setState((prev) => ({
                        ...prev,
                        dateNeeded: newDate,
                        // keep state.header in sync if you use it anywhere else
                        header: {
                          ...(prev.header || {}),
                          dateNeeded: newDate,
                        },
                        // push new header Date Needed down to all detail lines
                        detailRows: (prev.detailRows || []).map((row) => ({
                          ...row,
                          dateNeeded: newDate,
                        })),
                      }));
                    }}
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="dateNeeded"
                    className="global-tran-floating-label"
                  >
                    Date Needed
                  </label>
                </div>

                
              </div>

              {/* Column 3: PR Type / Date Needed / Ref No / Total Qty */}
              <div className="global-tran-textbox-group-div-ui">
                

                {/* Ref No (Ref PR No1) */}
                <div className="relative">
                  <input
                    type="text"
                    id="refPrNo1"
                    value={refPrNo1}
                    placeholder=" "
                    onChange={(e) => updateState({ refPrNo1: e.target.value })}
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="refPrNo1"
                    className="global-tran-floating-label"
                  >
                    Ref No.
                  </label>
                </div>

                {/* PR Type */}
              <div className="relative">
                <select
                  id="prType"
                  className="peer global-tran-textbox-ui"
                  value={selectedPrType}
                  onChange={handlePrTypeChange}
                  disabled={isFormDisabled}
                >
                  <option value="">Open</option>
                  <option value="">Closed</option>
                  <option value="">Cancelled</option>
                </select>
                <label htmlFor="prType" className="global-tran-floating-label">
                  PR Status
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
              </div>
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

                    {isJobOrder ? (
                      <>
                        <th className="global-tran-th-ui">Type</th>
                        <th className="global-tran-th-ui">Job Code</th>
                        <th className="global-tran-th-ui">Scope of Work</th>
                        <th className="global-tran-th-ui">UOM</th>
                        <th className="global-tran-th-ui">Qty Needed</th>
                        <th className="global-tran-th-ui">Date Needed</th>
                        <th className="global-tran-th-ui">Bud. Unit Cost</th>
                        <th className="global-tran-th-ui">Bud. Amount</th>
                        <th className="global-tran-th-ui">JO No</th>
                      </>
                    ) : (
                      <>
                        <th className="global-tran-th-ui">PR Status</th>
                        <th className="global-tran-th-ui">Type</th>
                        <th className="global-tran-th-ui">Item Code</th>
                        <th className="global-tran-th-ui">Item Description</th>
                        <th className="global-tran-th-ui">Specification</th>
                        <th className="global-tran-th-ui">UOM</th>
                        <th className="global-tran-th-ui">Qty on Hand</th>
                        <th className="global-tran-th-ui">Qty Needed</th>
                        <th className="global-tran-th-ui">Date Needed</th>
                        <th className="global-tran-th-ui">PO Qty</th>
                        <th className="global-tran-th-ui">RR Qty</th>
                      </>
                    )}

                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                        Delete
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {detailRows.map((row, index) => (
                    <tr key={index} className="global-tran-tr-ui">
                      {/* LN */}
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>

                      {isJobOrder ? (
                        <>
                          {/* Type */}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui"
                              value={row.invType || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "invType",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>

                          {/* Job Code (reuse itemCode) */}
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

                          {/* Scope of Work (reuse itemName) */}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[220px] global-tran-td-inputclass-ui"
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

                          {/* Qty Needed */}
                          <td className="global-tran-td-ui text-right">
                            <input
                              type="text"
                              className="w-[120px] global-tran-td-inputclass-ui text-right"
                              value={row.qtyNeeded || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "qtyNeeded",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>

                          {/* Date Needed */}
                          <td className="global-tran-td-ui">
                            <input
                              type="date"
                              className="w-[130px] global-tran-td-inputclass-ui"
                              value={row.dateNeeded || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "dateNeeded",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>

                          {/* Bud. Unit Cost (reuse poQty) */}
                          <td className="global-tran-td-ui text-right">
                            <input
                              type="text"
                              className="w-[120px] global-tran-td-inputclass-ui text-right"
                              value={row.poQty || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "poQty",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>

                          {/* Bud. Amount (reuse rrQty) */}
                          <td className="global-tran-td-ui text-right">
                            <input
                              type="text"
                              className="w-[120px] global-tran-td-inputclass-ui text-right"
                              value={row.rrQty || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "rrQty",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>

                          {/* JO No (reuse itemSpecs) */}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[150px] global-tran-td-inputclass-ui"
                              value={row.itemSpecs || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "itemSpecs",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          {/* PR Status */}
                          <td className="global-tran-td-ui">
                            <select
                              className="w-[120px] global-tran-td-inputclass-ui"
                              value={row.prStatus || "OPEN"}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "prStatus",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            >
                              <option value="OPEN">Open</option>
                              <option value="CLOSED">Closed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </td>

                          {/* Type */}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui"
                              value={row.invType || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "invType",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
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
                              className="w-[220px] global-tran-td-inputclass-ui"
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

                          {/* Specification */}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[220px] global-tran-td-inputclass-ui"
                              value={row.itemSpecs || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "itemSpecs",
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

                          {/* Qty on Hand */}
                          <td className="global-tran-td-ui text-right">
                            <input
                              type="text"
                              className="w-[120px] global-tran-td-inputclass-ui text-right"
                              value={row.qtyOnHand || ""}
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

                          {/* Qty Needed */}
                          <td className="global-tran-td-ui text-right">
                            <input
                              type="text"
                              className="w-[120px] global-tran-td-inputclass-ui text-right"
                              value={row.qtyNeeded || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "qtyNeeded",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>

                          {/* Date Needed */}
                          <td className="global-tran-td-ui">
                            <input
                              type="date"
                              className="w-[130px] global-tran-td-inputclass-ui"
                              value={row.dateNeeded || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "dateNeeded",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>

                          {/* PO Qty */}
                          <td className="global-tran-td-ui text-right">
                            <input
                              type="text"
                              className="w-[120px] global-tran-td-inputclass-ui text-right"
                              value={row.poQty || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "poQty",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>

                          {/* RR Qty */}
                          <td className="global-tran-td-ui text-right">
                            <input
                              type="text"
                              className="w-[120px] global-tran-td-inputclass-ui text-right"
                              value={row.rrQty || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "rrQty",
                                  e.target.value
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>
                        </>
                      )}

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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Footer: Add Button + Total */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div className="relative inline-block">
  {/* Dropdown overlay (absolute so it will NOT expand layout) */}
  {!isJobOrder && showTypeDropdown && (
    <div className="absolute bottom-[110%] left-0 mb-2 bg-white dark:bg-slate-800 border rounded-md shadow-lg z-[9999] min-w-[140px]">
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
    className={`global-tran-tab-footer-button-add-ui`}

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

      {/* Cancellation Modal */}
{showCancelModal && (
  <CancelTranModal
    isOpen={showCancelModal}
    onClose={handleCloseCancel}
  />
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

      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default PR;
