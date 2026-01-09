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
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";

// JO.jsx (top of file)
import SearchPROpenModal from "../../../Lookup/SearchOpenPRBalance.jsx";

// Configuration
import { postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";

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
  useTopPayTermRow,
  useTopVatRow,
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

const JO = () => {
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

    currencyCode: "",
    currencyName: "Philippine Peso",
    currencyRate: "1.000000",
    defaultCurrRate: "1.000000",

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
      jo_date: new Date().toISOString().split("T")[0], // PR Date
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

    vendName: null,
    vendCode: null,
    paytermCode: "",
    paytermName: "",

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
    userCode: "NSI",
    sourcePrNo: "",
    sourcePrBranchCode: "",

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
    showPaytermModal: false,
    payeeModalOpen: false,
    prLookupModalOpen: false,

    // RC Lookup modal (table)
    rcLookupModalOpen: false,
    rcLookupContext: "", // "rc" or "reqDept"

    msLookupModalOpen: false,
    vatLookupModalOpen: false,
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
    handleSelectAPAccount,

    // Header
    branchCode,
    branchName,

    vendName,
    vendCode,

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
    refPrNo1,
    refPrNo2,
    remarks,
    billtermCode,
    billtermName,
    noReprints,
    prCancelled,
    userCode,
    showPaytermModal,
    selectedRowIndex,
    sourcePrNo,
    sourcePrBranchCode,

    detailRows,

    currencyCode,
    currencyName,
    currencyRate,
    payTerm,

    // Modals
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    billtermModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostModal,
    payeeModalOpen,
    prLookupModalOpen,
    paytermCode,
    prLookupOpen,
    vatLookupModalOpen,

    // RC Lookup
    rcLookupModalOpen,
    rcLookupContext,

    msLookupModalOpen,
  } = state;

  const handleSelectPR = (result) => {
    // Always close the modal
    updateState({ prLookupModalOpen: false });

    // If user clicked Close, result will be null
    if (!result) return;

    const { header, details } = result;

    // 1) Update JO header from selected PR header
    //    Adjust these mappings to what you really want.
    updateState({
      refPrNo1: header.PRNo, // if you have refPrNo1 in JO header
      // you can also carry dept / remarks if needed:
      requestDept: header.ReqRcCode ?? state.requestDept,
      remarks: state.remarks || header.Particulars || "",
    });

    // 2) Map selected PR detail lines into JO detailRows
    //    Adjust the target fields based on your JO row schema.
    const mappedDetails = details.map((d) => ({
      // Example mapping – change to your JO detail structure:
      jobCode: d.JobCode, // or from d.Type / some lookup
      scopeOfWork: d.ScopeOfWork,
      specification: "",
      quantity: d.QtyNeeded?.toString() ?? "0",
      unitPrice: "0.000000",
      uomCode: d.UOM,
      grossAmt: "0.000000",
      discRate: "0.000000",
      discAmt: "0.000000",
      totalAmt: "0.000000",
      vatCode: "",
      vatAmt: "0.000000",
      netAmt: "0.000000",
      deliveryDate: d.DateNeeded?.substring(0, 10) || "",
      prNo: d.PRNo,
      prLn: d.Ln?.toString() ?? "",
      acctCode: "",
    }));

    const newDetailRows = [...state.detailRows, ...mappedDetails];

    updateState({
      detailRows: newDetailRows,
    });
  };

  const [header, setHeader] = useState({
    jo_date: new Date().toISOString().split("T")[0],
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [totals, setTotals] = useState({
    totalGross: "0.000000",
    totalVat: "0.000000",
    totalNet: "0.000000",
  });

  // PR.jsx
  const docType = docTypes?.JO || "JO";

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "Job Order";

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

  const updateTotalsDisplay = (rows) => {
    const arr = rows || [];

    let gross = 0;
    let vat = 0;
    let net = 0;

    arr.forEach((r) => {
      gross += parseFormattedNumber(r.grossAmt || 0);
      vat += parseFormattedNumber(r.vatAmt || 0);
      net += parseFormattedNumber(r.netAmt || 0);
    });

    setTotals({
      totalGross: formatNumber(gross || 0, 6),
      totalVat: formatNumber(vat || 0, 6),
      totalNet: formatNumber(net || 0, 6),
    });
  };

  const handleCurrencyRateBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({
      currencyRate: isNaN(num) ? "0.000000" : num,
      withCurr2:
        (glCurrMode === "M" && glCurrDefault !== currencyCode) ||
        glCurrMode === "D",
      withCurr3: glCurrMode === "T",
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
      status: "OPEN",
      noReprints: "0",
      prCancelled: "",
      detailRows: [],
      rcLookupModalOpen: false,
      rcLookupContext: "",
      msLookupModalOpen: false,
      selectedRowIndex: null,
    });

    updateTotalsDisplay([]);
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

  const handleClosePayeeModal = async (selectedData) => {
    if (!selectedData) {
      updateState({ payeeModalOpen: false });
      return;
    }

    updateState({ payeeModalOpen: false, isLoading: true });

    try {
      // Set basic payee info
      const payeeDetails = {
        vendCode: selectedData?.vendCode || "",
        vendName: selectedData?.vendName || "",
        currCode: selectedData?.currCode || "",
        acctCode: selectedData?.acctCode || "",
      };

      updateState({
        vendName: payeeDetails,
        vendCode: selectedData.vendCode,
        apAccountCode: selectedData.acctCode || "",
        apAccountName: selectedData.acctName || "",
      });

      // Update all existing detail rows with the payee's SL Code
      const updatedRows = detailRows.map((row) => ({
        ...row,
        slCode: selectedData.vendCode,
        slName: selectedData.vendName,
      }));

      updateState({ detailRows: updatedRows });

      // FIX: Use postRequest with the correct payload structure
      if (!selectedData.currCode) {
        // The backend expects VEND_CODE as a field in the request, not wrapped in json_data
        const vendResponse = await postRequest("getVendMast", {
          VEND_CODE: selectedData.vendCode,
        });

        if (vendResponse.success) {
          const vendData = JSON.parse(vendResponse.data[0].result);
          payeeDetails.currCode = vendData[0]?.currCode;
          payeeDetails.acctCode = vendData[0]?.acctCode;
          updateState({
            vendName: payeeDetails,
            apAccountCode: vendData[0]?.acctCode || "",
            apAccountName: vendData[0]?.acctName || "",
          });
        }
      }

      await Promise.all([
        handleSelectCurrency(payeeDetails.currCode),
        handleSelectAPAccount(payeeDetails.acctCode),
      ]);
    } catch (error) {
      console.error("Error:", error);
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

  const handleClosePaytermModal = async (selectedPayterm) => {
    if (selectedPayterm) {
      await handleSelectPayTerm(selectedPayterm.paytermCode);
    }
    updateState({ showPaytermModal: false });
  };

  const handleSelectPayTerm = async (code) => {
    if (!code) return;

    const result = await useTopPayTermRow(code);
    if (!result) return;

    // If no row is selected, update header payterm
    if (selectedRowIndex === null) {
      updateState({
        paytermCode: result.paytermCode,
        paytermName: result.paytermName,
      });
      return;
    }

    // Otherwise, update the specific detail row
    const updatedRows = [...detailRows];
    updatedRows[selectedRowIndex] = {
      ...updatedRows[selectedRowIndex],
      paytermCode: result.paytermCode,
      paytermName: result.paytermName,
      // if you really need dueDate:
      // dueDate: calculateDueDate(header.pr_date, result.daysDue),
    };
    updateState({ detailRows: updatedRows });
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
        },
        cutoffCode: data.cutoffCode || "",
        rcCode: data.rcCode || "",
        rcName: data.rcName || "",
        custCode: data.rcCode || "",
        custName: "",
        selectedPrTranType: data.prTranType || "",
        selectedPrType: data.prType || "",
        refPrNo1: data.refPrNo1 || "",
        refPrNo2: data.refPrNo2 || "",
        remarks: data.remarks || "",
        prCancelled: data.prCancelled || "",
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

    const today = header.pr_date || new Date().toISOString().split("T")[0];

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
    updateTotalsDisplay(updatedRows);
  };

  // Same logic as useTopVatAmount in top1RefTable.js, but synchronous
  const computeVatFromInclusive = (vatRate, grossAmt) => {
    const rate = parseFormattedNumber(vatRate || 0); // % (e.g. 12)
    const gross = parseFormattedNumber(grossAmt || 0); // VAT-inclusive amount

    if (!rate || !gross) return 0;

    const r = rate * 0.01; // convert to decimal (0.12)
    // Formula: VAT portion from VAT-inclusive amount
    return (gross * r) / (1 + r);
  };

  const recalcDetailRow = (row) => {
    const qty = parseFormattedNumber(row.quantity || 0);
    const unitPrice = parseFormattedNumber(row.unitPrice || 0);
    const vatRate = row.vatRate ?? 0; // will be set when VAT is chosen

    // 1) Gross = Quantity × Unit Price
    const gross = qty * unitPrice;

    // (Optional) Discount if you want to keep this working
    const discRate = parseFormattedNumber(row.discRate || 0); // percent
    const discAmt = gross * (discRate / 100);

    // Base amount after discount (still VAT-inclusive if your price is inclusive)
    const baseAfterDisc = gross - discAmt;

    // 2) VAT amount using SAME logic as useTopVatAmount (inclusive)
    const vatAmt = computeVatFromInclusive(vatRate, baseAfterDisc);

    // Let Net be Amount EXCLUDING VAT (base - VAT)
    const net = baseAfterDisc - vatAmt;

    return {
      ...row,
      grossAmt: formatNumber(gross || 0, 6),
      discAmt: formatNumber(discAmt || 0, 6),
      totalAmt: formatNumber(baseAfterDisc || 0, 6), // total line amount incl VAT
      vatAmt: formatNumber(vatAmt || 0, 6),
      netAmt: formatNumber(net || 0, 6), // net of VAT
    };
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
  const createEmptyDetailRow = (joDate) => ({
    jobCode: "",
    scopeOfWork: "",
    specification: "",
    quantity: "0.000000",
    unitPrice: "0.000000",
    uomCode: "",
    grossAmt: "0.000000",
    discRate: "0.000000",
    discAmt: "0.000000",
    totalAmt: "0.000000",
    vatCode: "",
    vatAmt: "0.000000",
    netAmt: "0.000000",
    deliveryDate: joDate || new Date().toISOString().split("T")[0],
    prNo: "",
    prLn: "",
    acctCode: "",
  });

  // When user clicks the "Add Line" button
  // When user clicks the "Add Line" button
  const handleAddRowClick = () => {
    // Optional: require Department before adding
    if (!reqRcCode) {
      Swal.fire({
        icon: "warning",
        title: "Required Header Fields",
        text: "Please select Department before adding JO lines.",
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    if (isFormDisabled) return;

    const newRow = createEmptyDetailRow(header.pr_date);
    const updatedRows = [...detailRows, newRow];

    updateState({ detailRows: updatedRows });

    // Recompute totals (here we total Net Amount)
    const netTotal = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.netAmt) || 0),
      0
    );
    updateTotalsDisplay(netTotal);

    // we no longer use showTypeDropdown in JO
    setShowTypeDropdown(false);
  };

  // When user picks FG / MS / RM
  const handleSelectTypeAndAddRow = (typeCode) => {
    const today = header.pr_date || new Date().toISOString().split("T")[0];

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

    const netTotal = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.netAmt) || 0),
      0
    );
    updateTotalsDisplay(updatedRows);
  };

  const handleDetailChange = (index, field, value) => {
    const updatedRows = [...detailRows];
    const row = { ...updatedRows[index] };

    const numericFields = [
      "quantity",
      "unitPrice",
      "grossAmt",
      "discRate",
      "discAmt",
      "totalAmt",
      "vatAmt",
      "netAmt",
    ];

    if (numericFields.includes(field)) {
      const sanitized = value.replace(/[^0-9.]/g, "");
      row[field] = sanitized;
    } else {
      row[field] = value;
    }

    // 🔄 Recompute amounts using the new values
    const recalculatedRow = recalcDetailRow(row);
    updatedRows[index] = recalculatedRow;

    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };

  // ==========================
  // SAVE / UPSERT (PR + DT1)
  // ==========================
  const handleActivityOption = async (action) => {
    // If already posted/cancelled/finalized, do not allow save
    if (documentStatus !== "") {
      return;
    }

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
        rcCode, // <-- from state
        reqRcCode, // <-- requesting dept code from state
        reqRcName, // <-- requesting dept name from state
        remarks,
        noReprints,
        prCancelled,
        detailRows,
      } = state;

      // NEW vs EDIT
      const isNew = !documentID;

      // JO Payload (matches sproc_PHP_JO)
      let totalGross = 0;
      let totalVat = 0;
      let totalDisc = 0;
      let totalNet = 0;

      const dt1 = detailRows
        // optional: only send rows with some content
        .filter((row) => (row.scopeOfWork || "").trim() !== "")
        .map((row, idx) => {
          const qty = parseFormattedNumber(row.qtyNeeded || row.quantity || 0);
          const unitCost = parseFormattedNumber(
            row.unitCost || row.unitPrice || 0
          );

          const grossAmount =
            parseFormattedNumber(row.grossAmt || 0) || qty * unitCost;

          const discRate = parseFormattedNumber(row.discRate || 0);
          const discAmount =
            parseFormattedNumber(row.discAmt || 0) ||
            (grossAmount * discRate) / 100;

          const vatAmount = parseFormattedNumber(row.vatAmt || 0);
          const netAmount =
            parseFormattedNumber(row.netAmt || 0) || grossAmount - discAmount;

          const joAmount =
            parseFormattedNumber(row.totalAmt || 0) || netAmount + vatAmount;

          totalGross += grossAmount;
          totalVat += vatAmount;
          totalDisc += discAmount;
          totalNet += netAmount;

          return {
            // === MUST MATCH JO_DT1 expected fields ===
            LINE_NO: idx + 1,
            PR_NO: row.prNo || state.sourcePrNo || "",
            SCOPE: row.scopeOfWork || "",
            QTY_NEEDED: qty,
            UOM_CODE: row.uomCode || "",
            CURR_CODE: state.currCode || "PHP",
            UNIT_COST: unitCost,
            GROSS_AMOUNT: grossAmount,
            DISC_RATE: discRate,
            DISC_AMOUNT: discAmount,
            NET_AMOUNT: netAmount,
            VAT_CODE: row.vatCode || "",
            VAT_AMOUNT: vatAmount,
            JO_AMOUNT: joAmount,
            DEL_DATE:
              row.deliveryDate ||
              state.header?.pr_date ||
              state.header?.joDate ||
              null,
            RC_CODE: state.reqRcCode || state.rcCode || "",
            PRLINE_NO: row.prLn || row.prlineNo || "",
            REF_BRANCHCODE: state.sourcePrBranchCode || state.branchCode,
          };
        });

      // now header totals come from detail
      const joData = {
        // === JO HEADER (matches sproc_PHP_JO) ===
        branchCode: state.branchCode,

        joNo: isNew ? "" : state.documentNo || "",
        joId: isNew ? "" : state.documentID || "",
        joDate: state.header?.joDate || state.header?.pr_date,

        cutoffCode: state.cutoffCode || "",
        rcCode: state.rcCode || "",

        vendCode: state.vendCode || "",
        vendName: state.vendName?.vendName || state.vendName || "",
        address1: state.address1 || "",
        address2: state.address2 || "",
        address3: state.address3 || "",
        vendContact: state.vendContact || "",
        paytermCode: state.paytermCode || "",

        joType: state.selectedPrType || state.joType || "",
        delDate: state.delDate || state.header?.pr_date,

        currCode: state.currCode || "PHP",
        currRate: parseFormattedNumber(state.currRate || 1),

        refjoNo1: state.refPrNo1 || "", // re-using your Ref PR 1 as JO Ref 1
        refjoNo2: state.refPrNo2 || "", // re-using your Ref PR 2 as JO Ref 2

        joAmount: totalGross,
        vatAmount: totalVat,
        discAmount: totalDisc,
        advAmount: 0,

        remarks: state.remarks || "",
        status: (state.documentStatus || "O").substring(0, 1), // e.g. "O", "F", "C"
        joCancelled: state.joCancelled || "",
        noReprints: Number(state.noReprints || 0),
        userCode: userCode || state.userCode || "NSI",

        dt1,
      };

      console.log("JO Payload", joData);

      const response = await useTransactionUpsert(
        docType, // this should already be "JO"
        joData, // new payload above
        updateState,
        "joId", // returned id column from sproc_PHP_JO
        "joNo" // returned number column from sproc_PHP_JO
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

  const handleCloseVATLookup = async (selectedVAT) => {
    // Close only
    if (!selectedVAT || selectedRowIndex == null) {
      updateState({
        vatLookupModalOpen: false,
        selectedRowIndex: null,
      });
      return;
    }

    // Clone rows & target row
    const updatedRows = [...detailRows];
    const row = { ...updatedRows[selectedRowIndex] };

    // 1) Set VAT code (and acct code if needed)
    row.vatCode = selectedVAT.vatCode || "";
    row.acctCode = selectedVAT.acctCode || row.acctCode || "";

    // 2) Fetch VAT row to get vatRate (using top1RefTable)
    let vatRate = 0;
    try {
      const vatRow = await useTopVatRow(row.vatCode);
      vatRate = vatRow?.vatRate ?? 0;
      row.vatRate = vatRate;
    } catch (err) {
      console.error("Error fetching VAT row:", err);
      row.vatRate = row.vatRate ?? 0;
    }

    // 3) Recompute gross / VAT / net for this row
    const recalculated = recalcDetailRow(row);

    // 4) Save the row back
    updatedRows[selectedRowIndex] = recalculated;

    // 5) Recompute footer totals (if you don’t already do this elsewhere)
    // 5) Recompute footer totals (if you don’t already do this elsewhere)
    const totalGross = updatedRows.reduce(
      (sum, r) => sum + (parseFormattedNumber(r.grossAmt || 0) || 0),
      0
    );
    const totalVat = updatedRows.reduce(
      (sum, r) => sum + (parseFormattedNumber(r.vatAmt || 0) || 0),
      0
    );
    const totalNet = updatedRows.reduce(
      (sum, r) => sum + (parseFormattedNumber(r.netAmt || 0) || 0),
      0
    );

    updateState({
      detailRows: updatedRows,
      vatLookupModalOpen: false,
      selectedRowIndex: null,
    });

    updateTotalsDisplay(updatedRows);
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

  const handleClosePRLookup = (selectedRow) => {
    if (!selectedRow) {
      updateState({ prLookupModalOpen: false });
      return;
    }

    // Map all the fields you want from the selected PR
    updateState({
      prLookupModalOpen: false,
      sourcePrNo: selectedRow.prNo || "",
      sourcePrBranchCode: selectedRow.branchCode || "",
      // Optional: pre-fill some JO header values from PR
      reqRcCode: selectedRow.reqRcCode || state.reqRcCode,
      reqRcName: selectedRow.reqRcName || state.reqRcName,
      remarks: state.remarks || selectedRow.remarks || "",
    });
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
                    value={state.prNo}
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
                  <label htmlFor="joNo" className="global-tran-floating-label">
                    JO No.
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
                    id="JODate"
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
                    htmlFor="JODate"
                    className="global-tran-floating-label"
                  >
                    JO Date
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="sourcePrNo"
                    value={sourcePrNo}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui cursor-pointer select-none"
                    onFocus={(e) => e.target.blur()}
                  />
                  <label
                    htmlFor="sourcePrNo"
                    className="global-tran-floating-label"
                  >
                    PR No.
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFormDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() => updateState({ prLookupModalOpen: true })}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </div>

              {/* Column 2: Responsibility Center / Requesting Dept / Tran Type */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Responsibility Center */}

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
                    Department
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

                {/* PR Tran Type */}
                {/* Payee Code Input with optional lookup */}
                <div className="relative">
                  <input
                    type="text"
                    id="payeeCode"
                    value={vendName?.vendCode || ""}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="payeeCode"
                    className="global-tran-floating-label"
                  >
                    <span className="global-tran-asterisk-ui"> * </span>
                    Payee Code
                  </label>
                  <button
                    type="button"
                    onClick={() => updateState({ payeeModalOpen: true })}
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* Payee Name Display */}
                <div className="relative">
                  <input
                    type="text"
                    id="payeeName"
                    placeholder=" "
                    value={vendName?.vendName || ""}
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="payeeName"
                    className="global-tran-floating-label"
                  >
                    <span className="global-tran-asterisk-ui"> * </span>
                    Payee Name
                  </label>
                </div>

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
                    Attention
                  </label>
                </div>
              </div>

              {/* Column 3: PR Type / Date Needed / Ref No / Total Qty */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <input
                    type="text"
                    id="currCode"
                    placeholder=" "
                    value={currencyName}
                    readOnly
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="currCode"
                    className="global-tran-floating-label"
                  >
                    Currency
                  </label>
                  <button
                    onClick={() => updateState({ currencyModalOpen: true })}
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="currRate"
                    value={currencyRate}
                    onChange={(e) =>
                      updateState({ currencyRate: e.target.value })
                    }
                    onBlur={handleCurrencyRateBlur}
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled || glCurrDefault === currencyCode}
                  />
                  <label
                    htmlFor="currRate"
                    className="global-tran-floating-label"
                  >
                    Currency Rate
                  </label>
                </div>

                {/* Date Needed */}
                <div className="relative">
                  <input
                    type="text"
                    id="payTerm"
                    value={paytermCode}
                    placeholder=" "
                    onChange={(e) =>
                      updateState({ paytermCode: e.target.value })
                    }
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="payTerm"
                    className="global-tran-floating-label"
                  >
                    Payterm
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateState({
                        showPaytermModal: true,
                        selectedRowIndex: null,
                      })
                    }
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
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
                    <option value="">Open</option>
                    <option value="">Closed</option>
                    <option value="">Cancelled</option>
                  </select>
                  <label
                    htmlFor="prType"
                    className="global-tran-floating-label"
                  >
                    JO Status
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
                Job Detail
              </span>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-collapse">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    <th className="global-tran-th-ui">LN</th>
                    <th className="global-tran-th-ui">Job Code</th>
                    <th className="global-tran-th-ui">Scope of Work</th>
                    <th className="global-tran-th-ui">Specification</th>
                    <th className="global-tran-th-ui">Quantity</th>
                    <th className="global-tran-th-ui">Unit Price</th>
                    <th className="global-tran-th-ui">UOM</th>
                    <th className="global-tran-th-ui">Gross Amt</th>
                    <th className="global-tran-th-ui">Disc Rate</th>
                    <th className="global-tran-th-ui">Disc Amt</th>
                    <th className="global-tran-th-ui">Total Amt</th>
                    <th className="global-tran-th-ui">VAT Code</th>
                    <th className="global-tran-th-ui">VAT Amt</th>
                    <th className="global-tran-th-ui">Net Amt</th>
                    <th className="global-tran-th-ui">Delivery Date</th>
                    <th className="global-tran-th-ui">PR No</th>
                    <th className="global-tran-th-ui">PR LN</th>
                    <th className="global-tran-th-ui">Acct Code</th>
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

                      {/* Job Code */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui"
                          value={row.jobCode || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "jobCode", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Scope of Work */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[220px] global-tran-td-inputclass-ui"
                          value={row.scopeOfWork || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "scopeOfWork",
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
                          value={row.specification || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "specification",
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
                          className="w-[100px] global-tran-td-inputclass-ui text-right"
                          value={row.quantity || ""}
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

                      {/* Unit Price */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[110px] global-tran-td-inputclass-ui text-right"
                          value={row.unitPrice || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "unitPrice",
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
                            handleDetailChange(index, "uomCode", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Gross Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[110px] global-tran-td-inputclass-ui text-right"
                          value={row.grossAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "grossAmt",
                              e.target.value
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Disc Rate */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[90px] global-tran-td-inputclass-ui text-right"
                          value={row.discRate || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "discRate",
                              e.target.value
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Disc Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[110px] global-tran-td-inputclass-ui text-right"
                          value={row.discAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "discAmt", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Total Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[110px] global-tran-td-inputclass-ui text-right"
                          value={row.totalAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "totalAmt",
                              e.target.value
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* VAT Code */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[80px] global-tran-td-inputclass-ui"
                          value={row.vatCode || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "vatCode", e.target.value)
                          }
                          onDoubleClick={() => {
                            if (isFormDisabled) return;
                            updateState({
                              vatLookupModalOpen: true,
                              selectedRowIndex: index,
                            });
                          }}
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* VAT Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[110px] global-tran-td-inputclass-ui text-right"
                          value={row.vatAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "vatAmt", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Net Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[110px] global-tran-td-inputclass-ui text-right"
                          value={row.netAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "netAmt", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Delivery Date */}
                      <td className="global-tran-td-ui">
                        <input
                          type="date"
                          className="w-[130px] global-tran-td-inputclass-ui"
                          value={row.deliveryDate || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "deliveryDate",
                              e.target.value
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* PR No */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui"
                          value={row.prNo || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "prNo", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* PR LN */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[80px] global-tran-td-inputclass-ui"
                          value={row.prLn || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "prLn", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Acct Code */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[130px] global-tran-td-inputclass-ui"
                          value={row.acctCode || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "acctCode",
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Footer: Add Button + Total */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div className="inline-block">
                <button
                  onClick={handleAddRowClick}
                  disabled={isFormDisabled || !reqRcCode}
                  className={`global-tran-tab-footer-button-add-ui ${
                    isFormDisabled || !reqRcCode
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
                  htmlFor="TotalGross"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Gross Amount:
                </label>
                <label
                  htmlFor="TotalGross"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totals.totalGross}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalVat"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  VAT Amount:
                </label>
                <label
                  htmlFor="TotalVat"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totals.totalVat}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalNet"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Net Amount:
                </label>
                <label
                  htmlFor="TotalNet"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totals.totalNet}
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

      {/* Payment Terms Lookup Modal */}
      {showPaytermModal && (
        <PaytermLookupModal
          isOpen={showPaytermModal}
          onClose={handleClosePaytermModal}
        />
      )}

      {billtermModalOpen && (
        <BillTermLookupModal
          isOpen={billtermModalOpen}
          onClose={handleCloseBillTermModal}
        />
      )}

      {prLookupModalOpen && (
        <SearchPROpenModal
          isOpen={prLookupModalOpen}
          onClose={handleSelectPR}
          branchCode={branchCode}
          prTranType="PR02" // JO = PR02
        />
      )}

      {payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={payeeModalOpen}
          onClose={handleClosePayeeModal}
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

      {vatLookupModalOpen && (
        <VATLookupModal
          isOpen={vatLookupModalOpen}
          onClose={handleCloseVATLookup}
          customParam={null} // or pass a filter if needed
        />
      )}

      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default JO;
