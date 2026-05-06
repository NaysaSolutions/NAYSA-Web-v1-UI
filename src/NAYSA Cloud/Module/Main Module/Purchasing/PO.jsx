import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faSpinner,
  faSearch,
  faTrashAlt,
  faBoxOpen,
  faWarehouse,
  faTableCellsLarge,
  faFileLines,
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
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";

// Configuration
import apiClient from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { postRequest, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';

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
  useSwalInfoAlert,
  useSwalSuccessAlert,
  useSwalErrorAlert,
  useSwalHandleOpenSpecsModal
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';

const PO = () => {
  const loadedFromUrlRef = useRef(false);
  const navigate = useNavigate();
  const { currentUserRow } = useAuth();
  const { resetFlag } = useReset();
  const location = useLocation();
  const [isViewDocument, setIsViewDocument] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, []);

  const isViewDocumentUrl = isViewDocument;

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
    originalDocStatus: "O",
    currRate: "",

    WHcode: "",
    WHname: "",
    warehouseLookupOpen: false,

    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: true,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: true,

    // PR Style Lookup Logic Variables
    itemSingleSelect: false,
    itemLookupEndPoint: "",
    selectedDocType: "",

    poDate: useGetCurrentDayV2(),
    delDate: useGetCurrentDayV2(),

    dateNeeded: useGetCurrentDayV2(),

    branchCode: "HO",
    branchName: "Head Office",
    delAddress: "",

    // Responsibility Center / Requesting Dept
    reqRcCode: "",
    reqRcName: "",
    currCode: "",
    currName: "",
    attention: "",

    // legacy fields
    vendCOde: "",
    vendName: "",

    // Currency information
    currRate: "",
    defaultCurrRate: "1.000000",

    // Other Header Info
    poTranTypes: [],
    poTypes: [],
    selectedPoTranType: "",
    selectedPoType: "",
    cutoffCode: "",
    rcCode: "",
    rcName: "",
    requestDept: "",
    vendCode: "",
    vendNameHeader: "",
    refPoNo1: "",
    refPrNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    noReprints: "0",
    poCancelled: "",
    poNo: "",
    payTerm: "",
    userCode: "",
    selectedPOStatus: "",
    vendVatCode: "",
    groupId: "",

    // New for JO-like functions
    paytermCode: "",
    paytermName: "",
    payeeModalOpen: false,
    showPaytermModal: false,
    vatLookupModalOpen: false,
    payeeLookupOpen: false,
    showAllTranDocNo: false,

    // Detail lines
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
    sourcePrNo: "",
    showOpenPRModal: false,
    openPR_Data_Summary: [],
    openPR_Col_Summary: [],
    openPR_Col_Detail: [],

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

    itemSingleSelect,
    itemLookupEndPoint,
    selectedDocType,

    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,
    poStatus,
    showAllTranDocNo,

    // Header
    branchCode,
    branchName,
    payTerm,
    delAddress,

    // Responsibility Center
    rcCode,
    rcName,

    // Requesting Dept
    reqRcCode,
    reqRcName,

    currCode,
    currName,
    attention,
    poDate,
    cutoffFrom,
    cutoffTo,

    vendCode,
    vendNameHeader,

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
    sourcePrNo,
    selectedRowIndex,

    paytermCode,
    paytermName,
    payeeModalOpen,
    showPaytermModal,

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
    vatLookupModalOpen,
    showOpenPRModal,
    openPR_Data_Summary,
    openPR_Col_Summary,
    openPR_Col_Detail,

    // RC Lookup
    rcLookupModalOpen,
    rcLookupContext,

    msLookupModalOpen,
  } = state;

  const [header, setHeader] = useState({
    po_date: useGetCurrentDayV2(),
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [totals, setTotals] = useState({
    totalQtyNeeded: "0.000000",
    totalGross: "0.000000",
    totalVat: "0.000000",
    totalNet: "0.000000",
  });

  const docType = docTypes?.PO || "PO";

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "Purchase Order";
  // Helper to map single characters to full words
  const getFullStatus = (s) => {
    const map = {
      O: "OPEN",
      C: "CLOSED",
      X: "CANCELLED",
      F: "FINALIZED",
    };
    return map[s?.toUpperCase()] || s || "OPEN";
  };

  const displayStatus = getFullStatus(status);

  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };

  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = isViewDocumentUrl || ["FINALIZED", "CANCELLED", "CLOSED"].includes(
    displayStatus
  );

  const DEC_QTY = 2;
  const DEC_PRICE = 2;
  const DEC_AMT = 2;

  const computeVatFromInclusive = (vatRate, grossAmt) => {
    const rate = parseFormattedNumber(vatRate || 0);
    const gross = parseFormattedNumber(grossAmt || 0);

    if (!rate || !gross) return 0;

    const r = rate * 0.01;
    return (gross * r) / (1 + r);
  };

  const recalcDetailRow = (row) => {
    const qty = parseFormattedNumber(row.poQty || row.qtyNeeded || 0);
    const unitPrice = parseFormattedNumber(row.unitPrice || 0);
    const vatRate = row.vatRate ?? 0;

    const gross = qty * unitPrice;
    const discRate = parseFormattedNumber(row.discRate || 0);
    const discAmt = gross * (discRate / 100);
    const baseAfterDisc = gross - discAmt;
    const vatAmt = computeVatFromInclusive(vatRate, baseAfterDisc);
    const net = baseAfterDisc - vatAmt;

    row.qtyOnHand = formatNumber(parseFormattedNumber(row.qtyOnHand) || 0, DEC_QTY);
    row.qtyNeeded = formatNumber(parseFormattedNumber(row.qtyNeeded) || 0, DEC_QTY);
    row.poQty = formatNumber(parseFormattedNumber(row.poQty) || 0, DEC_QTY);
    row.unitPrice = formatNumber(parseFormattedNumber(row.unitPrice) || 0, DEC_PRICE);

    row.grossAmt = formatNumber(parseFormattedNumber(row.grossAmt) || 0, DEC_AMT);
    row.totalAmt = formatNumber(parseFormattedNumber(row.totalAmt) || 0, DEC_AMT);
    row.vatAmt = formatNumber(parseFormattedNumber(row.vatAmt) || 0, DEC_AMT);
    row.netAmt = formatNumber(parseFormattedNumber(row.netAmt) || 0, DEC_AMT);

    return {
      ...row,
      grossAmt: formatNumber(gross || 0, DEC_AMT),
      discAmt: formatNumber(discAmt || 0, DEC_AMT),
      totalAmt: formatNumber(baseAfterDisc || 0, DEC_AMT),
      vatAmt: formatNumber(vatAmt || 0, DEC_AMT),
      netAmt: formatNumber(net || 0, DEC_AMT),
    };
  };

  const updateTotalsDisplay = (rows) => {
    const arr = rows || [];
    let qtyNeeded = 0, gross = 0, vat = 0, net = 0;

    arr.forEach((r) => {
      qtyNeeded += parseFormattedNumber(r.qtyNeeded || 0);
      gross += parseFormattedNumber(r.grossAmt || 0);
      vat += parseFormattedNumber(r.vatAmt || 0);
      net += parseFormattedNumber(r.netAmt || 0);
    });

    setTotals({
      totalQtyNeeded: formatNumber(qtyNeeded || 0, 6),
      totalGross: formatNumber(gross || 0, 6),
      totalVat: formatNumber(vat || 0, 6),
      totalNet: formatNumber(net || 0, 6),
    });
  };

  const handleAddBlankRow = (index) => {
    if (isFormDisabled) return;
    const blankRow = {
      invType: "",
      groupId: "",
      poStatus: "O",
      itemCode: "",
      itemName: "",
      uomCode: "",
      qtyOnHand: formatNumber(0, DEC_QTY),
      qtyAlloc: formatNumber(0, DEC_QTY),
      qtyNeeded: formatNumber(0, DEC_QTY),
      uomCode2: "",
      uomQty2: formatNumber(0, DEC_QTY),
      dateNeeded: state.header?.delDate || useGetCurrentDayV2(),
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: formatNumber(0, DEC_QTY),
      rrQty: formatNumber(0, DEC_QTY),
      unitPrice: formatNumber(0, DEC_PRICE),
      grossAmt: formatNumber(0, DEC_AMT),
      discRate: formatNumber(0, DEC_AMT),
      discAmt: formatNumber(0, DEC_AMT),
      totalAmt: formatNumber(0, DEC_AMT),
      vatCode: "",
      vatAmt: formatNumber(0, DEC_AMT),
      netAmt: formatNumber(0, DEC_AMT),
    };
    const updatedRows = [...detailRows];
    updatedRows.splice(index + 1, 0, blankRow);
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };

  const openSpecsModal = (rowIndex) => {
    if (isFormDisabled) return;

    useSwalHandleOpenSpecsModal(
      rowIndex,
      detailRows,
      handleDetailChange,
      detailRows?.[rowIndex]?.itemSpecs || "",
      "Specification",
      "itemSpecs",
      "Enter specification for this item..."
    );
  };

  // const closeSpecsModal = () => {
  //   updateState({
  //     specsModalOpen: false,
  //     specsRowIndex: null,
  //     specsTempText: "",
  //   });
  // };

  // const saveSpecsModal = () => {
  //   const idx = state.specsRowIndex;
  //   if (idx === null || idx === undefined) return closeSpecsModal();
  //   const updated = [...detailRows];
  //   updated[idx] = {
  //     ...updated[idx],
  //     itemSpecs: state.specsTempText ?? "",
  //   };
  //   updateState({ detailRows: updated });
  //   closeSpecsModal();
  // };

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

  useEffect(() => {
    if (resetFlag) handleReset();
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

  const handleReset = () => {
    loadDocDropDown();
    loadDocControl();
    loadCompanyData();

    const today = useGetCurrentDayV2();

    setHeader({
      po_date: today,
      dateNeeded: today,
      delDate: today,
    });

    updateState({
      header: {
        po_date: today,
        dateNeeded: today,
        delDate: today,
      },
      dateNeeded: today,
      branchCode: "HO",
      branchName: "Head Office",
      cutoffCode: "",
      rcCode: "",
      rcName: "",
      reqRcCode: "",
      reqRcName: "",
      vendCode: "",
      vendNameHeader: "",
      dateNeeded: today,
      delDate: today,
      sourcePrNo: "",
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
      originalDocStatus: "O",
      noReprints: "0",
      poCancelled: "",
      detailRows: [],
      rcLookupModalOpen: false,
      rcLookupContext: "",
      msLookupModalOpen: false,
      itemSingleSelect: false,
      itemLookupEndPoint: "",
      selectedDocType: "",
      paytermCode: "",
      paytermName: "",
      showOpenPRModal: false,
    });

    updateTotalsDisplay([]);
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

  const loadCurrencyMode = (mode = glCurrMode, defaultCurr = glCurrDefault, curr = currCode) => {
    const calcWithCurr3 = mode === "T";
    const calcWithCurr2 = (mode === "M" && defaultCurr !== curr) || mode === "D" || calcWithCurr3;

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

  const fetchTranData = async (poNoParam, _branchCode, key = "") => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotalsDisplay([]);
    };

    updateState({ isLoading: true });

    try {
      let formattedPoNo = poNoParam?.toString().trim() || "";
      if (formattedPoNo && /^\d+$/.test(formattedPoNo)) {
        formattedPoNo = formattedPoNo.padStart(8, '0');
      }

      const data = await useFetchTranData(
        formattedPoNo,
        _branchCode || branchCode,
        docType,
        "poNo",
        key || ""
      );

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
        poDateForHeader = useformatToDatev2(data.poDate) || "";
      }

      let dateNeededForHeader = "";
      if (data.dateNeeded) {
        dateNeededForHeader = useformatToDatev2(data.dateNeeded) || "";
      }

      let delDateForHeader = "";
      if (data.delDate) {
        delDateForHeader = useformatToDatev2(data.delDate) || "";
      }

      const retrievedDetailRows = (data.dt1 || []).map((item) => {
        const unitCost = Number(item.unitCost ?? 0) || 0;
        const grossAmt = Number(item.grossAmount ?? 0) || 0;
        const qty = Number(item.poQuantity ?? 0) || 0 || (unitCost > 0 ? grossAmt / unitCost : 0);

        return {
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
          dateNeeded: item.dateNeeded ? useformatToDatev2(item.dateNeeded) : "",
          itemSpecs: item.itemSpecs || "",
          serviceCode: item.serviceCode || "",
          serviceName: item.serviceName || "",
          qtyNeeded: formatNumber(qty, 6),
          poQty: formatNumber(qty, 6),
          rrQty: formatNumber(item.rrQty ?? 0, 6),
          unitPrice: formatNumber(item.unitCost ?? 0, 6),
          grossAmt: formatNumber(item.grossAmount ?? 0, 6),
          totalAmt: formatNumber(item.itemAmount ?? 0, 6),
          vatAmt: formatNumber(item.vatAmount ?? 0, 6),
          netAmt: formatNumber(item.netAmount ?? 0, 6),
          vatCode: item.vatCode || ""
        };
      });

      updateTotalsDisplay(retrievedDetailRows);
      const firstPrNo = data?.dt1?.[0]?.prNo || "";

      setHeader({
        po_date: poDateForHeader,
        dateNeeded: dateNeededForHeader,
        delDate: delDateForHeader || dateNeededForHeader || useGetCurrentDayV2(),
      });

      updateState({
        documentStatus: data.status || "O",
        status: data.status || "O",
        originalDocStatus: data.status || "O",

        documentID: data.poId || "",
        groupId: data.groupId || "",
        documentNo: data.poNo || "",
        branchCode: data.branchCode || branchCode,

        header: {
          po_date: poDateForHeader || "",
          dateNeeded: dateNeededForHeader || "",
          delDate:
            delDateForHeader ||
            dateNeededForHeader ||
            useGetCurrentDayV2(),
        },

        cutoffCode: data.cutoffCode || "",
        rcCode: data.rcCode || "",
        rcName: data.rcName || "",

        selectedPoTranType: data.poTranType || "",
        selectedPoType: data.poType || "",

        dateNeeded: dateNeededForHeader,
        refPoNo1: data.refPoNo1 || "",
        refPrNo2: data.refPrNo2 || "",
        remarks: data.remarks || "",
        poCancelled: data.poCancelled || "",
        noReprints: data.noReprints ?? "0",

        detailRows: retrievedDetailRows,

        isDocNoDisabled: true,
        isFetchDisabled: true,

        vendCode: data.vendCode || "",
        vendNameHeader: data.vendName || "",

        // Payterm
        paytermCode: data.paytermCode || "",
        paytermName: data.paytermName || data.paytermCode || "",

        // Warehouse
        WHcode: data.whCode || "",
        WHname: data.whName || "",

        // Currency
        currCode: data.currCode || "",
        currRate: formatNumber(data.currRate || 1, 6),

        sourcePrNo: firstPrNo,
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

  const handlePrNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const handleCurrRateNoBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({
      currRate: isNaN(num) ? "0.000000" : num,
      withCurr2: (glCurrMode === "M" && glCurrDefault !== currCode) || glCurrMode === "D",
      withCurr3: glCurrMode === "T",
    });
  };

  const handlePrTranTypeChange = (e) => updateState({ selectedPoTranType: e.target.value });
  const handlePrTypeChange = (e) => updateState({ selectedPoType: e.target.value });

  const validateBeforeAddingItem = () => {
    let errorMsg = "";

    if (!rcCode || String(rcCode).trim() === "") {
      errorMsg += " - Header - Department\n";
    }

    if (!vendCode || String(vendCode).trim() === "") {
      errorMsg += " - Header - Payee Code\n";
    }

    if (errorMsg !== "") {
      useSwalErrorAlert(
        "Validation Failed",
        `The following fields are required :\n\n${errorMsg}`
      );
      return false;
    }

    return true;
  };

  const handleAddRowClick = () => {
    if (isFormDisabled) return;

    if (!validateBeforeAddingItem()) return;

    setShowTypeDropdown((prev) => !prev);
  };

  const handleSelectTypeAndAddRow = (typeCode) => {
    const today = header.po_date || useGetCurrentDayV2();
    const newRow = {
      invType: typeCode,
      groupId: "",
      poStatus: status || "O",
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
      unitPrice: "0.000000",
      grossAmt: "0.000000",
      discRate: "0.000000",
      discAmt: "0.000000",
      totalAmt: "0.000000",
      vatCode: "",
      vatAmt: "0.000000",
      netAmt: "0.000000",
      vatRate: 0,
    };

    const updatedRows = [...detailRows, newRow];
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
    setShowTypeDropdown(false);
  };

  const handleOpenPRLookup = async () => {
    try {
      updateState({ isLoading: true });

      const endpoint = "getPROpen";
      const payload = {
        json_data: {
          mode: "Header",
          branchCode: branchCode,
          prTranType: null,
        },
      };

      const response = await postRequest(endpoint, payload);

      // 1. Bulletproof data extraction 
      // (Handles standard arrays OR JSON stringified 'result' wrappers from SQL)
      const rawData = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : (response?.data || []);

      if (!Array.isArray(rawData) || rawData.length === 0) {
        useSwalInfoAlert("Open Purchase Requisition", "No records found");
        updateState({ isLoading: false });
        return;
      }

      // 2. Map data and bridge the ALL_CAPS SQL gap to PascalCase UI gap
      const custData = rawData.filter((row) => {
        const stat = String(row.PR_STATUS || row.Status || row.status || row.prStatus || "O").toUpperCase();
        return stat !== "C" && stat !== "CLOSED" && stat !== "X" && stat !== "CANCELLED";
      }).map((row) => ({
        ...row,
        // 🔧 FIX: Map standard SQL ALL_CAPS returns to the PascalCase keys the UI grid expects
        prNo: row.PR_NO || row.PRNo || row.prNo,
        prDate: row.PR_DATE || row.PRDate || row.prDate,
        dateNeeded: row.DATE_NEEDED || row.DateNeeded || row.dateNeeded,
        prType: row.PR_TYPE || row.PRType || row.prType,
        refNo: row.REF_NO || row.RefNo || row.refNo,
        reqRcCode: row.REQ_RC_CODE || row.REQ_DEPT || row.ReqRcCode || row.reqRcCode || row.reqDept,
        particulars: row.PARTICULARS || row.Particulars || row.particulars,
        preparedBy: row.PREPARED_BY || row.PreparedBy || row.preparedBy,
        dateStamp: row.DATE_STAMP || row.DateStamp || row.dateStamp,
        timeStamp: row.TIME_STAMP || row.TimeStamp || row.timeStamp,

        // Ensure a unique ID for selection
        groupId: row.PR_ID || row.PrId || row.PR_NO || row.PRNo || row.prNo || row.GROUP_ID || row.groupId,
      }));

      const colConfig = await useSelectedHSColConfig("getPROpen", userCode);
      const colConfig_detail = await useSelectedHSColConfig("getPROpen_Detail", userCode);

      if (!colConfig?.length || !colConfig_detail?.length) {
        console.warn("Warning: Column config returned empty. Double check hscolconfig table mapping.");
      }

      updateState({
        openPR_Data_Summary: custData,
        openPR_Col_Summary: colConfig,
        openPR_Col_Detail: colConfig_detail,
        showOpenPRModal: true,
        isLoading: false,
      });

    } catch (error) {
      console.error("PR Open Fetch Error:", error);
      useSwalInfoAlert("Open Purchase Requisition", "Error in Fetching Record");
      updateState({ isLoading: false });
    }
  };
  // const handleOpenPRLookup = async () => {
  //   try {
  //     updateState({ isLoading: true });

  //     const payload = {
  //       json_data: {
  //         mode: "Header",
  //         branchCode: branchCode,
  //         prTranType: null, // or "PR01" if you want to filter
  //       },
  //     };

  //     const response = await postRequest("getPROpen", payload);

  //     let custData = response?.data ?? [];

  //     if (!response?.success || !Array.isArray(custData) || custData.length === 0) {
  //       useSwalInfoAlert("Open Purchase Requisition", "No records found");
  //       updateState({ isLoading: false });
  //       return;
  //     }

  //     // 🚀 NEW FIX: Filter the Summary Tab so Closed/Cancelled PRs don't even show up
  //     custData = custData.filter((row) => {
  //       const stat = String(row.Status || row.status || row.PR_STATUS || row.prStatus || "O").toUpperCase();
  //       // Hide it if it's C, CLOSED, X, or CANCELLED
  //       return stat !== "C" && stat !== "CLOSED" && stat !== "X" && stat !== "CANCELLED";
  //     }).map((row) => ({
  //       ...row,
  //       groupId: row.GroupId || row.groupId || row.PrId || row.PRNo || row.prNo,
  //     }));

  //     let colConfig = [];
  //     let colConfig_detail = [];

  //     try {
  //       colConfig = await useSelectedHSColConfig("getPROpen");
  //       if (!colConfig || colConfig.length === 0) throw new Error("Empty config");
  //     } catch {
  //       // 🚀 RESTORE ALL COLUMNS HERE
  //       colConfig = [
  //         { key: "PRNo", label: "PR No.", hidden: 0 },
  //         { key: "PRDate", label: "PR Date", hidden: 0 },
  //         { key: "DateNeeded", label: "Date Needed", hidden: 0 },
  //         { key: "PRType", label: "PR Type", hidden: 0 },
  //         { key: "RefNo", label: "Ref No.", hidden: 0 },
  //         { key: "ReqRcCode", label: "Requesting Department", hidden: 0 },
  //         { key: "Particulars", label: "Particulars", hidden: 0 },
  //         { key: "PreparedBy", label: "Prepared By", hidden: 0 },
  //         { key: "DateStamp", label: "Date Stamp", hidden: 0 },
  //         { key: "TimeStamp", label: "Time Stamp", hidden: 0 },
  //       ];
  //     }

  //     try {  
  //       colConfig_detail = await useSelectedHSColConfig("getPROpen_Detail");
  //       if (!colConfig_detail || colConfig_detail.length === 0) throw new Error("Empty config");
  //     } catch {
  //       colConfig_detail = [
  //         { key: "PRNo", label: "PR No.", hidden: 0 },
  //         { key: "JobCode", label: "Item Code", hidden: 0 },
  //         { key: "ScopeOfWork", label: "Description", hidden: 0 },
  //         { key: "QtyNeeded", label: "Qty", hidden: 0 },
  //         { key: "UOM", label: "UOM", hidden: 0 },
  //       ];
  //     }

  //     updateState({
  //       openPR_Data_Summary: custData,
  //       openPR_Col_Summary: colConfig,
  //       openPR_Col_Detail: colConfig_detail,
  //       showOpenPRModal: true,
  //       isLoading: false,
  //     });
  //   } catch (error) {
  //     console.error("PR Open Fetch Error:", error);
  //     console.log("error response:", error?.response?.data);
  //     console.log("error status:", error?.response?.status);

  //     useSwalInfoAlert("Open Purchase Requisition", "Error in Fetching Record");
  //     updateState({
  //       openPR_Data_Summary: [],
  //       openPR_Col_Summary: [],
  //       openPR_Col_Detail: [],
  //       isLoading: false,
  //     });
  //   }
  // };

  const handleClosePROpenModal = async (selection) => {
    if (!selection || !selection.details || selection.details.length === 0) {
      updateState({ showOpenPRModal: false });
      return;
    }

    updateState({ isLoading: true, showOpenPRModal: false });

    try {
      const summary = selection.summary?.[0] || {};

      const pickedGroupId =
        summary?.GroupId ||
        summary?.groupId ||
        state?.groupId ||
        "";

      const headerDateNeeded =
        summary?.DateNeeded ||
        summary?.DelDate ||
        summary?.PrDate ||
        "";

      const payeeDefaultVatCode = state.vendVatCode || vendVatCode || "";

      let payeeVatRate = 0;

      if (payeeDefaultVatCode) {
        try {
          const vatRow = await useTopVatRow(payeeDefaultVatCode);
          payeeVatRate = parseFormattedNumber(vatRow?.vatRate ?? 0);
        } catch (err) {
          console.error("Error fetching payee default VAT rate:", err);
        }
      }


      const newDetailRows = selection.details.map((d, i) => {
        const qty =
          parseFloat(
            d?.QtyNeeded ??
            d?.QTY_NEEDED ??
            d?.QTY_BALANCE ??
            d?.qtyBalance ??
            0
          ) || 0;

        const formattedQty = formatNumber(qty, 6);

        const dateNeeded = d?.DateNeeded || d?.DATE_NEEDED
          ? String(d?.DateNeeded || d?.DATE_NEEDED).substring(0, 10)
          : headerDateNeeded
            ? String(headerDateNeeded).substring(0, 10)
            : "";

        const row = {
          lN: i + 1,

          prNo:
            d?.PRNo ||
            d?.PrNo ||
            d?.prNo ||
            summary?.PRNo ||
            summary?.PrNo ||
            summary?.prNo ||
            "",

          prId:
            d?.PrId ||
            d?.prId ||
            summary?.PrId ||
            summary?.prId ||
            "",

          refBranchCode:
            d?.BC ||
            d?.BranchCode ||
            summary?.BC ||
            summary?.BranchCode ||
            branchCode,

          invType: d?.Type || d?.INV_TYPE || "",
          groupId: d?.GROUP_ID || d?.groupId || pickedGroupId || "",
          poStatus: "O",

          itemCode: d?.JobCode || d?.ITEM_CODE || "",
          itemName: d?.ScopeOfWork || d?.ITEM_NAME || "",
          uomCode: d?.UOM || d?.UOM_CODE || "",

          qtyOnHand: formatNumber(d?.qtyOnHand ?? d?.QTY_ONHAND ?? 0, 6),
          qtyAlloc: "0.000000",
          qtyNeeded: formattedQty,
          poQty: formattedQty,
          rrQty: formatNumber(d?.RR_QTY ?? 0, 6),

          uomCode2: d?.UOM_CODE2 || "",
          uomQty2: formatNumber(d?.UOM_QTY2 ?? 0, 6),
          dateNeeded,

          itemSpecs: d?.ITEM_SPECS || d?.Specification || "",
          serviceCode: "",
          serviceName: "",

          unitPrice: formatNumber(d?.UNIT_COST ?? d?.unitCost ?? 0, DEC_PRICE),
          grossAmt: formatNumber(d?.GROSS_AMOUNT ?? d?.grossAmt ?? 0, 6),
          discRate: formatNumber(d?.DISC_RATE ?? d?.discRate ?? 0, 6),
          discAmt: formatNumber(d?.DISC_AMOUNT ?? d?.discAmt ?? 0, 6),
          totalAmt: formatNumber(d?.ITEM_AMOUNT ?? d?.itemAmount ?? 0, 6),

          // VAT Code from selected Payee default setup
          vatCode: payeeDefaultVatCode || "",
          vatRate: payeeVatRate || 0,

          vatAmt: formatNumber(0, 6),
          netAmt: formatNumber(d?.NET_AMOUNT ?? d?.netAmt ?? 0, 6),

          prBalance: formattedQty,
        };

        return recalcDetailRow(row);
      });

      const updatedRows = [...(detailRows || []), ...newDetailRows];

      updateState({
        detailRows: updatedRows,
        sourcePrNo: newDetailRows?.[0]?.prNo || sourcePrNo || "",
        showOpenPRModal: false,
        isLoading: false,
      });

      updateTotalsDisplay(updatedRows);
    } catch (error) {
      console.error("Error processing selected PR:", error);
      useSwalErrorAlert(
        "Open Purchase Requisition",
        "Error while applying selected PR details."
      );
      updateState({ isLoading: false });
    }
  };

  const handleOpenMSLookup = async (itemSingleSelectParam, docTypeParam) => {
    if (!validatePayeeBeforeAdding()) {
      setShowTypeDropdown(false);
      return;
    }

    try {
      setShowTypeDropdown(false);
      updateState({
        isLoading: true,
        itemSingleSelect: itemSingleSelectParam,
        itemLookupEndPoint: "getInvLookupMS",
        selectedDocType: docTypeParam
      });
      updateState({ msLookupModalOpen: true, isLoading: false });
    } catch (error) {
      console.log(error);
      updateState({ isLoading: false });
    }
  };

  const handleAddItem = async (index, invType) => {
    if (!validateBeforeAddingItem()) return;

    updateState({ selectedRowIndex: index, itemSingleSelect: true });
    await handleOpenMSLookup(true, invType);
  };

  const handleCloseMSLookup = (selectedItems) => {
    if (!selectedItems) {
      updateState({ msLookupModalOpen: false });
      return;
    }

    const itemsArray = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : selectedItems.records ? [selectedItems.records] : [];

    if (itemsArray.length === 0) {
      updateState({ msLookupModalOpen: false });
      return;
    }

    if (state.itemSingleSelect && state.selectedRowIndex !== null) {
      const singleItem = itemsArray[0];
      const isDuplicate = detailRows.some(row => row.itemCode === singleItem.itemCode);

      const applySingleItem = () => {
        const updatedRows = [...detailRows];
        updatedRows[state.selectedRowIndex] = {
          ...updatedRows[state.selectedRowIndex],
          itemCode: singleItem.itemCode || "",
          itemName: singleItem.itemName || "",
          uomCode: singleItem.uomCode || singleItem.uom || "",
          qtyOnHand: formatNumber(singleItem.qtyHand ?? 0, 6),
          unitPrice: formatNumber(singleItem.unitCost ?? 0, DEC_PRICE)
        };
        updateState({ detailRows: updatedRows, itemSingleSelect: false, msLookupModalOpen: false });
        updateTotalsDisplay(updatedRows);
      };

      if (isDuplicate) {
        Swal.fire({
          title: "Duplicate Item Detected",
          text: "This item is already in the list. Do you want to select it anyway?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes"
        }).then((result) => {
          if (result.isConfirmed) applySingleItem();
        });
      } else {
        applySingleItem();
      }
      return;
    }

    // Multiple Item Selection
    const duplicateItems = itemsArray.filter(newItem =>
      detailRows.some(existingRow => existingRow.itemCode === newItem.itemCode)
    );

    const processAddition = (itemsToAdd) => {
      const today = header.po_date || useGetCurrentDayV2();
      const newRows = itemsToAdd.map((item) => ({
        invType: "MS",
        groupId: state.groupId || "",
        poStatus: status || "O",
        itemCode: item?.itemCode || "",
        itemName: item?.itemName || "",
        uomCode: item?.uomCode || item?.uom || "",
        qtyOnHand: formatNumber(item?.qtyHand ?? 0, 6),
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
        unitPrice: formatNumber(item?.unitCost ?? 0, DEC_PRICE),
        grossAmt: "0.000000",
        discRate: "0.000000",
        discAmt: "0.000000",
        totalAmt: "0.000000",
        vatCode: "",
        vatAmt: "0.000000",
        netAmt: "0.000000",
        vatRate: 0,
      }));

      const updatedRows = [...detailRows, ...newRows];
      updateState({
        detailRows: updatedRows,
        msLookupModalOpen: false,
        itemSingleSelect: false
      });
      updateTotalsDisplay(updatedRows);
    };

    if (duplicateItems.length > 0) {
      Swal.fire({
        title: "Duplicate Items Detected",
        text: "Some items are already in the list. Do you want to add them anyway?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes"
      }).then((result) => {
        if (result.isConfirmed) {
          processAddition(itemsArray);
        } else {
          const uniqueOnly = itemsArray.filter(newItem =>
            !detailRows.some(existingRow => existingRow.itemCode === newItem.itemCode)
          );
          if (uniqueOnly.length > 0) {
            processAddition(uniqueOnly);
          } else {
            updateState({ msLookupModalOpen: false });
          }
        }
      });
    } else {
      processAddition(itemsArray);
    }
  };

  const handleOpenVATLookup = (rowIndex) => {
    if (isFormDisabled) return;

    updateState({
      vatLookupModalOpen: true,
      selectedRowIndex: rowIndex,
    });
  };

  const handleCloseVATLookup = async (selectedVAT) => {
    // Closed the modal without choosing anything
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

    // 1) Set VAT code (and acct code if your PO rows also have acctCode)
    row.vatCode = selectedVAT.vatCode || "";
    row.acctCode = selectedVAT.acctCode || row.acctCode || "";

    // 2) Fetch VAT row to get vatRate from reference table
    let vatRate = 0;
    try {
      const vatRow = await useTopVatRow(row.vatCode);
      vatRate = vatRow?.vatRate ?? 0;
      row.vatRate = vatRate;
    } catch (err) {
      console.error("Error fetching VAT row:", err);
      row.vatRate = row.vatRate ?? 0;
    }

    // 3) Recompute this row’s gross / VAT / net
    const recalculated = recalcDetailRow(row);

    // 4) Save the row back
    updatedRows[selectedRowIndex] = recalculated;

    // 5) Recompute footer totals
    updateTotalsDisplay(updatedRows);

    // 6) Close modal
    updateState({
      vatLookupModalOpen: false,
      selectedRowIndex: null,
      detailRows: updatedRows,
    });
  };

  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };

  const sanitizeNumeric = (v) => {
    const raw = String(v ?? "");
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    return parts.length <= 1 ? cleaned : `${parts.shift()}.${parts.join("")}`;
  };

  const formatByField = (field, num) => {
    if (!Number.isFinite(num)) return "";
    if (["unitPrice"].includes(field)) return formatNumber(num, DEC_PRICE);
    if (["qtyOnHand", "qtyNeeded", "poQty"].includes(field)) return formatNumber(num, DEC_QTY);
    if (["grossAmt", "totalAmt", "vatAmt", "netAmt"].includes(field)) return formatNumber(num, DEC_AMT);
    return formatNumber(num, 6);
  };

  const handleDetailChange = (index, field, value, commit = false) => {
    const updatedRows = [...detailRows];
    const row = { ...(updatedRows[index] || {}) };
    const editableFields = ["unitPrice", "qtyNeeded", "poQty"];

    const nonNumericFields = ["invType", "prStatus", "poStatus", "itemName", "uomCode", "vatCode", "dateNeeded", "itemSpecs", "serviceCode", "serviceName"];

    if (field === 'itemCode' && typeof value === 'object' && value !== null) {
      row["itemCode"] = value.itemCode || "";
      row["itemName"] = value.itemName || "";
      row["uomCode"] = value.uomCode || value.uom || "";
      row["qtyOnHand"] = formatNumber(value.qtyHand ?? 0, 6);
      row["unitPrice"] = formatNumber(value.unitCost ?? 0, DEC_PRICE);
    } else if (nonNumericFields.includes(field)) {
      row[field] = value;
    } else {
      if (!editableFields.includes(field)) return;

      const sanitized = sanitizeNumeric(value);

      if (commit) {
        let num = parseFormattedNumber(sanitized);

        // 🚀 NEW: Inline Validation & Auto-Revert on input blur/enter
        if (field === "poQty" && row.prNo) {
          const maxQtyNeeded = parseFormattedNumber(row.qtyNeeded || 0);

          if (num > maxQtyNeeded) {
            useSwalErrorAlert(
              "Invalid Quantity",
              `PO Quantity cannot exceed the requested Qty Needed.`
            );
            // 🔧 FIX: Force the number back to the maximum allowed value
            num = maxQtyNeeded;
          }
        }

        row[field] = formatByField(field, num);
      } else {
        row[field] = sanitized;
      }
    }

    const recalculatedRow = recalcDetailRow(row);
    updatedRows[index] = recalculatedRow;

    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };
  // ==========================
  // SAVE / UPSERT
  // ==========================
  // ==========================
  // SAVE / UPSERT
  // ==========================
  const handleActivityOption = async (action) => {
    // If already posted/cancelled/finalized, do not allow save
    const stat = String(state.status || "").toUpperCase(); // this holds "O" from API
    const locked = ["FINALIZED", "CANCELLED", "CLOSED", "F", "X", "C"].includes(stat);
    if (locked) return;

    if (action !== "Upsert") return;

    // 🚀 NEW: Frontend Validation for PO Qty vs Qty Needed
    const overQtyIndex = state.detailRows.findIndex((row) => {
      // Only validate rows that are pulled from a PR
      if (row.prNo) {
        const currentPoQty = parseFormattedNumber(row.poQty || 0);
        const maxQtyNeeded = parseFormattedNumber(row.qtyNeeded || 0);

        // Return true if it violates the rule
        return currentPoQty > maxQtyNeeded;
      }
      return false;
    });

    if (overQtyIndex !== -1) {
      const offendingRow = state.detailRows[overQtyIndex];
      useSwalErrorAlert(
        "Validation Error",
        `PO Quantity exceeds Qty Needed on Line ${overQtyIndex + 1} (Item: ${offendingRow.itemCode}).`
      );
      return;
    }

    updateState({ isLoading: true });

    try {
      const {
        branchCode,
        documentNo,
        documentID,
        header,
        selectedPoTranType, // UI only, sproc doesn’t use this
        selectedPoType,
        refPoNo1,
        refPrNo2,
        cutoffCode,
        rcCode,
        reqRcCode,
        reqRcName,
        dateNeeded,
        vendCode,
        vendNameHeader,
        remarks,
        noReprints,
        poCancelled,
        detailRows,
        sourcePrNo,
      } = state;

      const isNew = !documentID;

      // Optionally, pull totals from state.totals if you’re computing them
      const poAmount = parseFormattedNumber(totals.totalGross || 0);
      const vatAmount = parseFormattedNumber(totals.totalVat || 0);
      const discAmount = 0; // or your own discount total
      const advAmount = 0;

      // === PO HEADER (must match sproc_PHP_PO JSON names) ===
      const poData = {
        branchCode: branchCode,

        // 🔹 NEW vs EDIT – same pattern as JO.jsx
        // poNo: isNew ? "" : documentNo || "",
        // poId: isNew ? "" : documentID || "",

        poNo: isNew ? "" : documentNo || "",
        poId: documentID || "",
        groupId: state.groupId || "",

        poDate: state.header?.po_date || useGetCurrentDayV2(),
        cutoffCode: cutoffCode || "", // @_cutoffCode

        rcCode: rcCode || "", // @_rcCode

        vendCode: vendCode || "", // @_vendCode
        vendName: vendNameHeader || "", // @_vendName
        // Optional warehouse / address fields if you have them in state:
        whCode: state.WHcode || "", // @_whCode
        whName: state.WHname || "", // @_whName
        address1: state.address1 || "", // @_address1
        address2: state.address2 || "", // @_address2
        address3: state.address3 || "", // @_address3
        vendContact: state.vendContact || "", // @_vendContact
        paytermCode: state.paytermCode || "", // @_paytermCode

        poType: selectedPoType || "", // 🔹 @_poType
        delDate: state.header?.delDate || state.dateNeeded || null,

        currCode: state.currCode || "PHP", // @_currCode
        currRate: parseFormattedNumber(state.currRate || "1"), // @_currRate

        // 🔹 sproc expects refpoNo1 / refpoNo2 (lowercase p)
        refpoNo1: refPoNo1 || "", // @_refpoNo1
        refpoNo2: refPrNo2 || "", // @_refpoNo2

        poAmount, // @_poAmount
        vatAmount, // @_vatAmount
        discAmount, // @_discAmount
        advAmount, // @_advAmount

        remarks: remarks || "", // @_remarks
        status: status || "", // @_poStatus
        poCancelled: poCancelled || "", // @_poCancelled
        noReprints: Number(noReprints || 0), // @_noReprints
        userCode: state.userCode || currentUserRow?.userCode,

        // Detail rows
        dt1: detailRows.map((row, index) => {
          // You perfectly defined these variables here...
          const poQty = parseFormattedNumber(row.poQty || row.qtyNeeded || 0);
          const unitCost = parseFormattedNumber(row.unitPrice || 0);

          return {
            LINE_NO: index + 1,
            PR_NO: row.prNo || "",
            PR_STATUS: row.prStatus || "",
            PO_STATUS: row.poStatus || "O",
            INV_TYPE: row.invType || "",
            GROUP_ID: row.groupId || "",
            ITEM_CODE: row.itemCode || "",
            ITEM_NAME: row.itemName || "",
            UOM_CODE: row.uomCode || "",

            // 🔧 FIX: Actually use the 'poQty' variable you defined above
            PO_QUANTITY: poQty,

            UOM_CODE2: row.uomCode2 || "",
            UOM_QTY2: parseFormattedNumber(row.uomQty2 || 0),
            CURR_CODE: row.currCode || "",

            // 🔧 FIX: Actually use the 'unitCost' variable you defined above
            UNIT_COST: unitCost,

            FX_AMOUNT: parseFormattedNumber(row.fxAmount || 0),

            // 🔧 FIX: Map to the exact abbreviated keys used in your React state
            GROSS_AMOUNT: parseFormattedNumber(row.grossAmt || 0),
            DISC_RATE: parseFormattedNumber(row.discRate || 0),
            DISC_AMOUNT: parseFormattedNumber(row.discAmt || 0),
            NET_AMOUNT: parseFormattedNumber(row.netAmt || 0),
            VAT_CODE: row.vatCode || "",
            VAT_AMOUNT: parseFormattedNumber(row.vatAmt || 0),
            ITEM_AMOUNT: parseFormattedNumber(row.totalAmt || 0),

            ITEM_SPECS: row.itemSpecs || "",
            DEL_DATE: row.delDate || null,
            RR_QTY: parseFormattedNumber(row.rrQty || 0),
            PR_BALANCE: poQty, // Set initial PR balance to the PO quantity
            REF_BRANCHCODE: row.refBranchCode || "",
            CATEG_CODE: row.categCode || ""
          };
        }),
      };

      // Only send poNo / poId when EDITING existing PO
      if (!isNew) {
        poData.poNo = documentNo || "";
        poData.poId = documentID || "";
      }

      console.log("PO Payload", poData);

      // 1) SAVE / UPSERT
      const response = await useTransactionUpsert(
        docType,
        poData,
        updateState,
        "poId",
        "poNo",
      );

      if (response) {
        const savedPoId = response.data[0]?.poId;
        const savedBranch = branchCode;

        // 3) SUCCESS DIALOG + (optional) PRINT – same as before
        useSwalshowSaveSuccessDialog(handleReset, () =>
          handleSaveAndPrint(savedPoId),
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
    // JO Logic: Allow cancellation if ID exists and status is "O" or empty
    if (documentID && (documentStatus === "O" || documentStatus === "")) {
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
    window.history.replaceState({}, "", window.location.origin);
  }, []);

  const handleHistoryRowPick = useCallback(
    async (row) => {
      const docNo = row?.docNo;
      const branchCode = row?.branchCode;
      if (!docNo || !branchCode) return;

      await fetchTranData(docNo, branchCode);
      setTopTab("details");
      cleanUrl(); // 
    },
    [fetchTranData, cleanUrl]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("msajNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);

  const printData = {
    pr_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  // ==========================
  // MODAL CLOSE HANDLERS
  // ==========================

  const handleCloseCancel = async (confirmation) => {
    // Verify original status was "Open" before calling the API
    if (confirmation && state.originalDocStatus === "O" && documentID !== null) {

      // 1. Safely extract the password and reason
      const pwd = confirmation?.password || confirmation?.userPassword || "";
      const rsn = confirmation?.reason || "";

      // 2. Prevent sending to backend if password wasn't captured
      if (!pwd) {
        useSwalInfoAlert("Required", "Password was not captured. Please try again.");
        return;
      }

      // 3. Ensure we use the REAL user code, never the hardcoded "NSI"
      const activeUserCode = currentUserRow?.userCode || state.userCode;

      const result = await useHandleCancel(
        docType,
        documentID,
        activeUserCode, // Dynamic user
        pwd,            // Extracted password
        rsn,            // Extracted reason
        updateState
      );

      if (result && result.success) {
        useSwalSuccessAlert("Success", "Cancellation Completed");
        await fetchTranData(documentNo, branchCode);
      }
    }
    updateState({ showCancelModal: false });
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
    if (!selectedRC) {
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
      return;
    }

    const { rcCode: selectedCode, rcName: selectedName } = selectedRC;

    if (rcLookupContext === "rc") {
      updateState({
        rcCode: selectedCode,
        rcName: selectedName,
        reqRcCode: selectedCode,
        reqRcName: selectedName,
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    } else if (rcLookupContext === "reqDept") {
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

  const handleClosePayeeModal = async (selectedData) => {
    if (!selectedData) {
      updateState({ payeeModalOpen: false });
      return;
    }

    updateState({ payeeModalOpen: false, isLoading: true });

    try {
      let newVendCode = selectedData?.vendCode || "";
      let newVendName = selectedData?.vendName || "";
      let vendVatCodeToUse = selectedData?.vatCode || "";
      let currCodeToUse = selectedData?.currCode || currCode || glCurrDefault;
      let paytermCodeToUse = selectedData?.paytermCode || "";

      if (
        (!selectedData.currCode || !paytermCodeToUse || !vendVatCodeToUse) &&
        newVendCode
      ) {
        try {
          const { data: vendResponse } = await apiClient.get("/getVendMast", {
            params: {
              VEND_CODE: newVendCode,
            },
            headers: {
              "X-Company-DB": "NS2",
            },
            withCredentials: true,
          });
          let vendData = vendResponse ?? [];

          if (vendData?.[0]?.result) {
            vendData = JSON.parse(vendData[0].result);
          }

          const vendRow = Array.isArray(vendData) ? vendData[0] || {} : vendData || {};

          if (!selectedData.currCode && vendRow.currCode) {
            currCodeToUse = vendRow.currCode;
          }

          if (!paytermCodeToUse && vendRow.paytermCode) {
            paytermCodeToUse = vendRow.paytermCode;
          }

          if (!vendVatCodeToUse && vendRow.vatCode) {
            vendVatCodeToUse = vendRow.vatCode;
          }
        } catch (err) {
          console.error("Error getting vendor master:", err);
          console.log("Vendor master response:", err?.response?.data);
        }
      }

      updateState({
        vendCode: newVendCode,
        vendNameHeader: newVendName,
        vendVatCode: vendVatCodeToUse || "",
      });

      await handleSelectCurrency(currCodeToUse);

      if (paytermCodeToUse) {
        await handleSelectPayTerm(paytermCodeToUse);
      }

      if (vendVatCodeToUse) {
        let vatRate = 0;

        try {
          const vatRow = await useTopVatRow(vendVatCodeToUse);
          vatRate = vatRow?.vatRate ?? 0;
        } catch (err) {
          console.error("Error fetching VAT row:", err);
        }

        const updatedRows = (detailRows || []).map((r) => {
          const row = {
            ...r,
            vatCode: vendVatCodeToUse,
            vatRate: vatRate,
          };
          return recalcDetailRow(row);
        });

        updateState({ detailRows: updatedRows });
        updateTotalsDisplay(updatedRows);
      }
    } catch (error) {
      console.error("Error in handleClosePayeeModal:", error);
    } finally {
      updateState({ isLoading: false });
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
            : await useTopForexRate(code, header.po_date);

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

  const handleSelectBillTerm = async (billtermCodeParam) => {
    if (billtermCodeParam) {
      const result = await useTopBillTermRow(billtermCodeParam);
      if (result) {
        updateState({
          billtermCode: result.billtermCode,
          billtermName: result.billtermName,
          daysDue: result.daysDue,
        });
      }
    }
  };

  // NEW: Payterm handlers (JO-style, header only)
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

    updateState({
      paytermCode: result.paytermCode,
      paytermName: result.paytermName,
    });
  };


  useEffect(() => {
    const handleF1Lookup = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };

    window.addEventListener("keydown", handleF1Lookup);
    return () => window.removeEventListener("keydown", handleF1Lookup);
  }, []);

  const handleTranDocNoRetrieval = async (data = {}) => {
    const selectedDocNo =
      data.docNo ||
      data.documentNo ||
      state.documentNo ||
      documentNo ||
      "";

    const selectedBranchCode =
      data.branchCode ||
      state.branchCode ||
      branchCode ||
      "";

    const direction =
      data.key ||
      data.direction ||
      data.action ||
      "";

    await fetchTranData(selectedDocNo, selectedBranchCode, direction);

    updateState({
      showAllTranDocNo: data.modalClose ?? false,
    });
  };

  const handleTranDocNoSelection = async (data = {}) => {
    const selectedDocNo = data.docNo || data.documentNo || "";
    const selectedBranchCode = data.branchCode || state.branchCode || branchCode || "";

    handleReset();

    updateState({
      showAllTranDocNo: false,
      documentNo: selectedDocNo,
    });

    if (selectedDocNo) {
      await fetchTranData(selectedDocNo, selectedBranchCode);
    }
  };

  const handleDocNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
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
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          showCopyForm={true}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          disableRouteNavigation={true}
          detailsRoute="/page/PO"
          isSaveDisabled={isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) === 0)}
          isResetDisabled={isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
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
              className={`global-tran-tab-padding-ui ${activeTab === "basic"
                ? "global-tran-tab-text_active-ui"
                : "global-tran-tab-text_inactive-ui"
                }`}
              onClick={() => updateState({ activeTab: "basic" })}
            >
              Basic Information
            </button>
          </div>

          {/* PO Header Form Section */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols- gap-4 rounded-lg relative"
            id="pr_hd"
          >
            {/* Columns 1–3 (Header fields) */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Column 1: Branch / PO No / PO Date / Department */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Branch */}
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => !isFormDisabled && updateState({ branchModalOpen: true })}
                />

                {/* PO No */}
                <FieldRenderer
                  id="poNo"
                  label="PO No."
                  type="lookup"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled}
                  onChange={(val) => updateState({ documentNo: val })}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleDocNoBlur();
                      e.preventDefault();
                      document.getElementById("poDate")?.focus();
                    }
                  }}
                />

                {/* PO Date */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled
                      ? "global-ref-textbox-enabled"
                      : "global-ref-textbox-disabled"
                      }`}
                  >
                    <DateFormatInput
                      id="poDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={header.po_date}
                      disabled={isFormDisabled}
                      updateState={(val) => {
                        const v = typeof val === "string" ? val : val?.po_date ?? "";
                        setHeader((prev) => ({ ...prev, po_date: v }));
                        updateState({ header: { ...(state.header || {}), po_date: v } });
                      }}
                    />
                  </div>
                  <label htmlFor="poDate" className="global-ref-floating-label">
                    PO Date
                  </label>
                </div>

                {/* Department */}
                <FieldRenderer
                  id="rcName"
                  label="Department"
                  type="lookup"
                  value={rcCode || ""}
                  required
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({
                      rcLookupModalOpen: true,
                      rcLookupContext: "rc",
                    })
                  }
                />
              </div>

              {/* Column 2: Payee Code / Payee Name / Attention */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Payee Code */}
                <FieldRenderer
                  id="vendCode"
                  label="Payee Code"
                  required
                  type="lookup"
                  value={vendCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled && updateState({ payeeModalOpen: true })
                  }
                />

                {/* Payee Name */}
                <FieldRenderer
                  id="vendName"
                  label="Payee Name"
                  required
                  type="text"
                  value={vendNameHeader || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ vendNameHeader: val })}
                />

                {/* Attention */}
                <FieldRenderer
                  id="attention"
                  label="Attention"
                  type="text"
                  value={attention || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ attention: val })}
                />
              </div>

              {/* Column 3: Currency / Rate / Payterm / Status */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Currency */}
                <FieldRenderer
                  id="currName"
                  label="Currency"
                  type="lookup"
                  value={currName || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => !isFormDisabled && updateState({ currencyModalOpen: true })}
                />

                {/* Currency Rate */}
                <FieldRenderer
                  id="currRate"
                  label="Currency Rate"
                  type="text"
                  value={currRate || ""}
                  disabled={isFormDisabled || glCurrDefault === currCode}
                  onChange={(val) => {
                    const sanitizedValue = val.replace(/[^0-9.]/g, "");
                    if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                      updateState({ currRate: sanitizedValue });
                    }
                  }}
                  onBlur={handleCurrRateNoBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById("refDocNo1")?.focus();
                    }
                  }}
                />

                {/* Payterm */}
                <FieldRenderer
                  id="payTerm"
                  label="Payterm *"
                  type="lookup"
                  value={paytermName || paytermCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => !isFormDisabled && updateState({ showPaytermModal: true })}
                />

                {/* PO Status */}
                <FieldRenderer
                  id="poStatus"
                  label="PO Status"
                  type="select"
                  value={status || "O"}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ status: val })}
                  options={[
                    { label: "Open", value: "O" },
                    { label: "Closed", value: "C" },
                    { label: "Cancelled", value: "X" },
                    { label: "Finalized", value: "F" },
                  ]}
                />
              </div>

              {/* Column 4*/}
              <div className="global-tran-textbox-group-div-ui">
                {/* PO Type */}
                <FieldRenderer
                  id="poTypes"
                  label="PO Type"
                  type="select"
                  value={selectedPoType || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => handlePrTypeChange({ target: { value: val } })}
                  options={poTypes.map((t) => ({
                    label: t.DROPDOWN_NAME,
                    value: t.DROPDOWN_CODE,
                  }))}
                />

                {/* Warehouse */}
                <FieldRenderer
                  id="WHcode"
                  label="Warehouse"
                  type="lookup"
                  value={state.WHname || state.WHcode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => !isFormDisabled && updateState({ warehouseLookupOpen: true })}
                />

                {/* Delivery Address */}
                <FieldRenderer
                  id="delAddress"
                  label="Delivery Address"
                  type="text"
                  value={delAddress || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ delAddress: val })}
                />

                {/* Delivery Date */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled
                      ? "global-ref-textbox-enabled"
                      : "global-ref-textbox-disabled"
                      }`}
                  >
                    <DateFormatInput
                      id="delDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={state.header?.delDate || ""}
                      disabled={isFormDisabled}
                      updateState={(val) => {
                        const v = typeof val === "string" ? val : val?.delDate ?? "";
                        updateState({
                          header: { ...(state.header || {}), delDate: v },
                          dateNeeded: v,
                        });
                      }}
                    />
                  </div>
                  <label htmlFor="delDate" className="global-ref-floating-label">
                    Delivery Date
                  </label>
                </div>
              </div>

              {/* Remarks */}
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
            PO DETAIL TABLE
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
                    <th className="global-tran-th-ui">PO Status</th>
                    <th className="global-tran-th-ui">PR No.</th>
                    <th className="global-tran-th-ui">Type</th>
                    <th className="global-tran-th-ui">Item Code</th>
                    <th className="global-tran-th-ui">Item Description</th>
                    <th className="global-tran-th-ui">Specification</th>
                    <th className="global-tran-th-ui">UOM</th>
                    <th className="global-tran-th-ui">PO Quantity</th>
                    <th className="global-tran-th-ui">Unit Price</th>
                    <th className="global-tran-th-ui">Gross Amount</th>
                    <th className="global-tran-th-ui">Discount Rate</th>
                    <th className="global-tran-th-ui">Discount Amount</th>
                    <th className="global-tran-th-ui">Total Amount</th>
                    <th className="global-tran-th-ui">VAT Code</th>
                    <th className="global-tran-th-ui">VAT Amount</th>
                    <th className="global-tran-th-ui">Net Amount</th>
                    <th className="global-tran-th-ui">Delivery Date</th>
                    <th className="global-tran-th-ui">RR Quantity</th>
                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                        Actions
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

                      {/* PO Status */}
                      <td className="global-tran-td-ui">
                        <select
                          className="w-[120px] global-tran-td-inputclass-ui"
                          value={row.prStatus || "OPEN"}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "prStatus",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        >
                          <option value="OPEN">Open</option>
                          <option value="CLOSED">Closed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>

                      {/* PR No. */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui bg-gray-100 cursor-not-allowed"
                          value={row.prNo || ""}
                          readOnly
                          tabIndex={-1}
                        />
                      </td>

                      {/* Type */}
                      <td className="global-tran-td-ui">
                        <select
                          className="w-[80px] global-tran-td-inputclass-ui bg-white outline-none"
                          value={row.invType || ""}
                          onChange={(e) => handleDetailChange(index, "invType", e.target.value)}
                          disabled={isFormDisabled || (row.itemCode?.length > 0)}
                        >
                          <option value="" disabled>Select</option>
                          <option value="MS">MS</option>
                          <option value="RM">RM</option>
                          <option value="FG">FG</option>
                        </select>
                      </td>

                      {/* Item Code */}
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[120px] global-tran-td-inputclass-ui pr-6"
                            value={row.itemCode || ""}
                            onChange={(e) => handleDetailChange(index, "itemCode", e.target.value)}
                            disabled={isFormDisabled}
                          />
                          {!isFormDisabled && row.invType && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => handleAddItem(index, "PO" + row.invType)}
                            />
                          )}
                        </div>
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
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Specification */}
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[220px] global-tran-td-inputclass-ui cursor-pointer pr-6"
                            value={row.itemSpecs || ""}
                            readOnly
                            onDoubleClick={() => openSpecsModal(index)}
                            title="Double-click to edit specification"
                            disabled={isFormDisabled}
                          />

                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => openSpecsModal(index)}
                              title="Open Specification"
                            />
                          )}
                        </div>
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


                      {/* PO Qty */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.poQty || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "poQty", e.target.value, false)
                          }
                          onBlur={(e) =>
                            handleDetailChange(index, "poQty", e.target.value, true)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleDetailChange(index, "poQty", e.target.value, true);
                            }
                          }}
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.unitPrice || ""}
                          onChange={(e) => handleDetailChange(index, "unitPrice", e.target.value, false)}
                          onBlur={(e) => handleDetailChange(index, "unitPrice", e.target.value, true)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleDetailChange(index, "unitPrice", e.target.value, true);
                            }
                          }}
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Gross Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.grossAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "grossAmt",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Disc Rate */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui text-right"
                          value={row.discRate || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "discRate",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Disc Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
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
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.totalAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "totalAmt",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* VAT Code */}
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[80px] global-tran-td-inputclass-ui pr-6"
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
                            title="Double-click to select VAT Code"
                            disabled={isFormDisabled}
                          />

                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  vatLookupModalOpen: true,
                                  selectedRowIndex: index,
                                });
                              }}
                              title="Select VAT Code"
                            />
                          )}
                        </div>
                      </td>

                      {/* VAT Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
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
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.netAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "netAmt", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Date Needed (only once, here) */}
                      <td className="global-tran-td-ui">
                        <input
                          type="date"
                          className="w-[130px] global-tran-td-inputclass-ui"
                          value={row.dateNeeded || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "dateNeeded",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* RR Qty (only once) */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.rrQty || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "rrQty", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Actions: Insert Row + Delete */}
                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-0">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="global-tran-td-button-add-ui"
                              onClick={() => handleAddBlankRow(index)}
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={() => handleDeleteRow(index)}
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
            </div>
          </div>

          {/* Detail Footer: Add Button + Total */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div className="relative inline-block">

                {/* Polished dropdown overlay */}
                {showTypeDropdown && (
                  <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        Add Item
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                        onClick={() => {
                          setShowTypeDropdown(false);
                          handleSelectTypeAndAddRow("FG");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            <FontAwesomeIcon icon={faBoxOpen} />
                          </span>
                          <div className="flex flex-col items-start">
                            <span>Finished Goods</span>
                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Add FG item
                            </span>
                          </div>
                        </div>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                          FG
                        </span>
                      </button>

                      <button
                        type="button"
                        className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                        onClick={() => {
                          setShowTypeDropdown(false);
                          handleOpenMSLookup(false, "POMS");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            <FontAwesomeIcon icon={faTableCellsLarge} />
                          </span>
                          <div className="flex flex-col items-start">
                            <span>Material Supplies</span>
                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Add MS Item
                            </span>
                          </div>
                        </div>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                          MS
                        </span>
                      </button>

                      <button
                        type="button"
                        className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                        onClick={() => {
                          setShowTypeDropdown(false);
                          handleSelectTypeAndAddRow("RM");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            <FontAwesomeIcon icon={faWarehouse} />
                          </span>
                          <div className="flex flex-col items-start">
                            <span>Raw Material</span>
                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Add RM Item
                            </span>
                          </div>
                        </div>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                          RM
                        </span>
                      </button>

                      <div className="my-2 border-t border-slate-100 dark:border-slate-700" />

                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                        onClick={() => {
                          setShowTypeDropdown(false);
                          handleOpenPRLookup();
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                            <FontAwesomeIcon icon={faFileLines} />
                          </span>
                          <div className="flex flex-col items-start">
                            <span>Open Reference PR</span>
                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Pull items from PR
                            </span>
                          </div>
                        </div>
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                          PR
                        </span>
                      </button>

                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddRowClick}
                  disabled={isFormDisabled}
                  className={`global-tran-tab-footer-button-add-ui ${isFormDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                    }`}
                  style={{
                    visibility: isFormDisabled ? "hidden" : "visible",
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Total Qty Needed:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
                  {totals.totalQtyNeeded}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Gross Amount:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
                  {totals.totalGross}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  VAT Amount:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
                  {totals.totalVat}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Net Amount:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
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
          endpoint="/getPOHistory"
          cacheKey={`PO:${state.branchCode || ""}:${state.documentNo || ""}`}
          activeTabKey="PO_Summary"
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

      {showOpenPRModal && (
        <GlobalCombinedLookup
          isOpen={showOpenPRModal}
          title="Open Purchase Requisition"
          summarySelectionMode="multiple"
          detailSelectionMode="multiple"
          summaryColumns={openPR_Col_Summary} // FIXED
          detailColumns={openPR_Col_Detail}   // FIXED
          summaryData={openPR_Data_Summary}   // FIXED
          tabTitles={["Open PR Summary", "Open PR Detail"]}

          // 🚀 NEW: Using Promise.all to fetch multiple PR details simultaneously
          fetchDetailApi={async (selectedIds) => {
            // 1. Ensure selectedIds is treated as an array
            const idsArray = Array.isArray(selectedIds) ? selectedIds : [selectedIds];

            try {
              // 2. Fetch details for EACH PR concurrently
              // This bypasses the SQL limitation of not understanding comma-separated strings
              const fetchPromises = idsArray.map(async (singleId) => {
                const payload = {
                  json_data: {
                    mode: "Detail",
                    prId: singleId
                  }
                };

                const res = await postRequest("getPROpen", payload);
                const rawData = res?.data?.[0]?.result ? JSON.parse(res.data[0].result) : (res?.data || res);
                return Array.isArray(rawData) ? rawData : [];
              });

              // Wait for all requests to finish, then combine them into one flat array
              const allResults = await Promise.all(fetchPromises);
              const combinedDataArray = allResults.flat();

              // 3. Apply your "Smarter Filter" to ensure no closed/zero-balance items appear
              const filteredData = combinedDataArray.filter((d) => {
                const status = String(d.PR_STATUS || d.pr_status || d.prStatus || d.Status || d.status || "O").toUpperCase();
                const qtyNeeded = parseFloat(d.QTY_NEEDED ?? d.QtyNeeded ?? d.qty_needed ?? d.Qty ?? d.QTY ?? 0);
                const poQty = parseFloat(d.PO_QTY ?? d.PoQty ?? d.po_qty ?? d.poQty ?? 0);
                const explicitBalance = parseFloat(d.QTY_BALANCE ?? d.QtyBalance ?? d.qty_balance ?? d.qty_balance ?? -1);

                const balance = explicitBalance !== -1 ? explicitBalance : (qtyNeeded - poQty);
                const isClosed = status === "C" || status === "CLOSED";
                const isCancelled = status === "X" || status === "CANCELLED";

                return !isClosed && !isCancelled && balance > 0;
              }).map((d, index) => {
                // Extract keys first so we can safely combine them for the unique ID
                const mappedPrNo = d.PR_NO || d.PRNo || d.prNo || "";
                const mappedJobCode = d.JOB_CODE || d.JobCode || d.ITEM_CODE || d.ItemCode || d.jobCode || d.itemCode || "";

                return {
                  ...d,
                  prNo: mappedPrNo,
                  jobCode: mappedJobCode,
                  scopeOfWork: d.SCOPE_OF_WORK || d.ScopeOfWork || d.ITEM_NAME || d.ItemName || d.scopeOfWork || d.itemName || d.Description || d.description,
                  qtyNeeded: d.QTY_NEEDED || d.QtyNeeded || d.qtyNeeded || d.QTY || d.Qty || d.qty,
                  uom: d.UOM_CODE || d.UOMCode || d.UOM || d.uomCode || d.uom || d.Uom,

                  // 🔧 FIX: Guarantee a completely unique ID for every single detail row
                  groupId: `${mappedPrNo}_${mappedJobCode}_${index}`
                };
              });

              return { success: true, data: filteredData };
            } catch (error) {
              console.error("Error fetching consolidated PR details:", error);
              return { success: false, data: [] };
            }
          }}
          onCancel={() => updateState({ showOpenPRModal: false })}
          onClose={handleClosePROpenModal}
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
          onClose={handleCloseBranchModal}
        />
      )}

      {payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={payeeModalOpen}
          onClose={handleClosePayeeModal}
        />
      )}

      {showPaytermModal && (
        <PaytermLookupModal
          isOpen={showPaytermModal}
          onClose={handleClosePaytermModal}
        />
      )}

      {state.warehouseLookupOpen && (
        <WarehouseLookupModal
          isOpen={state.warehouseLookupOpen}
          onClose={handleCloseWarehouseLookup}
          filter="ActiveAll"
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
        <ItemMastLookupModal
          isOpen={msLookupModalOpen}
          endpoint={itemLookupEndPoint}
          onClose={handleCloseMSLookup}
          onCancel={() => updateState({ msLookupModalOpen: false })}
          enableMultiSelect={!itemSingleSelect}
          docType={selectedDocType}
        />
      )}

      {vatLookupModalOpen && (
        <VATLookupModal
          isOpen={vatLookupModalOpen}
          onClose={handleCloseVATLookup}
        />
      )}

      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{ branchCode, branchName, docType, documentTitle, fieldNo: "poNo" }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default PO;