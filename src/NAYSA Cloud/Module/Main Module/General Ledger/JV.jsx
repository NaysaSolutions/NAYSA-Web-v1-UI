import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faMinus,
  faTrashAlt,
  faFolderOpen,
  faSpinner,
  faDownload,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import BillCodeLookupModal from "../../../Lookup/SearchBillCodeRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostJV from "./PostJV.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import {
  extractSingleUploadValidationResult,
  getSingleUploadTemplateColumns as getGlobalSingleUploadTemplateColumns,
  handleDownloadSingleUploadTemplate as downloadGlobalSingleUploadTemplate,
  handleSingleUploadExcelFile,
  showSingleUploadErrorList,
  toSingleUploadDateValue,
  toSingleUploadExcelDate,
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

// Configuration
import { fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";

import {
  docTypeNames,
  glAccountFilter,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopVatRow,
  useTopATCRow,
  useTopRCRow,
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopCompanyRow,
  useTopDocControlRow,
  useTopVatAmount,
  useTopATCAmount,
  useTopBillCodeRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useFetchTranDataReversal,
  useHandleCancel,
  useHandlePost,
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert,
  useSwalProceedConfirm,
  useSwalSuccessAlert,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useSelectedHSColConfig,
  useSelectedOpenARBalance,
} from "@/NAYSA Cloud/Global/selectedData.js";

// Header
import Header from "@/NAYSA Cloud/Components/Header";
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";

const JV = () => {
  const loadedFromUrlRef = useRef(false);
  const reversalFetchInProgressRef = useRef(false);
  const singleUploadDropdownRef = useRef(null);
  const uploadInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [topTab, setTopTab] = useState("details");
  const [showSingleUploadDropdown, setShowSingleUploadDropdown] = useState(false);

  const { user, companyInfo, currentUserRow, getAllTopHSDocRow, getAllDropDown, refsLoaded } = useAuth();
  const { resetFlag } = useReset();
  const [isViewDocument, setIsViewDocument] = useState(false);
  const isViewDocumentUrl = isViewDocument;

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, []);

  const [state, setState] = useState({
    // HS Option
    glCurrMode: companyInfo?.glCurrMode || "M",
    glCurrDefault: companyInfo?.currCode || "PHP",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal1: companyInfo?.glCurrGlobal1 || "",
    glCurrGlobal2: companyInfo?.glCurrGlobal2 || "",
    glCurrGlobal3: companyInfo?.glCurrGlobal3 || "",

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
    GLactiveTab: "entries",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,
    tblFieldArray: [],

    // Header information
    documentDate: useGetCurrentDayV2(),

    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "",

    // Vendor information
    custCode: "",
    custName: "",
    attention: "",

    // Currency information
    currCode: companyInfo?.currCode || "",
    currName: "",
    currRate: formatNumber(companyInfo?.currRate || 1, 6),
    defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),

    // Other Header Info
    jvTypes: [],
    refdocTypes: [],
    refDocNo: "",
    refDocAmount: "0.00",
    refAdvAcct: "",
    refDocNo2: "",
    fromDate: null,
    toDate: null,
    remarks: "",
    billtermCode: "",
    billtermName: "",
    selectedJVType: "",
    selectedRefDocType: "",
    noReprints: "0",

    userCode: currentUserRow?.userCode || user.USER_CODE,

    // Detail 1-2
    detailRows: [],
    detailRowsGL: [],

    totalDebit: "0.00",
    totalCredit: "0.00",
    totalDebitFx1: "0.00",
    totalCreditFx1: "0.00",
    totalDebitFx2: "0.00",
    totalCreditFx2: "0.00",

    // Modal states
    modalContext: "",
    selectionContext: "",
    selectedRowIndex: null,
    accountModalSource: null,
    showAccountModal: false,
    showRcModal: false,
    showVatModal: false,
    showAtcModal: false,
    currencyModalOpen: false,
    branchModalOpen: false,
    custModalOpen: false,
    billtermModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showBillCodeModal: false,
    showSlModal: false,
    showPostModal: false,
    showAllTranDocNo: false,
    showARBalanceModal: false,
    globalLookupRow: [],
    globalLookupHeader: [],
    globalLookupMode: "invoice",
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
    GLactiveTab,
    isLoading,
    showSpinner,
    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    tblFieldArray,
    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,
    documentDate,
    branchCode,
    branchName,
    custCode,
    custName,
    currCode,
    currName,
    currRate,
    jvTypes,
    refdocTypes,
    refDocNo,
    refDocAmount,
    refAdvAcct,
    refDocNo2,
    fromDate,
    toDate,
    remarks,
    billtermCode,
    billtermName,
    selectedJVType,
    selectedRefDocType,
    noReprints,
    detailRows,
    detailRowsGL,
    totalDebit,
    totalCredit,
    totalDebitFx1,
    totalCreditFx1,
    totalDebitFx2,
    totalCreditFx2,
    modalContext,
    selectionContext,
    selectedRowIndex,
    accountModalSource,
    showAccountModal,
    showRcModal,
    showVatModal,
    showAtcModal,
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    billtermModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showBillCodeModal,
    showSlModal,
    showPostModal,
    showAllTranDocNo,
    showARBalanceModal,
    globalLookupRow,
    globalLookupHeader,
    globalLookupMode,
  } = state;

  const [focusedCell, setFocusedCell] = useState(null);

  // Document Global Setup & Updated Transaction Name Logic
  const docType = docTypes.JV;
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];

  const hsDoc = getAllTopHSDocRow ? getAllTopHSDocRow(docType) : null;
  const documentTitle = hsDoc.docName + " Transaction";

  const {
    isReadOnly,
    isFullAccess,
    canAdd,
    canSave,
    canPost,
    canCancel,
  } = usePagePermission({
    componentKey: "JV",
    menuName: documentTitle,
    debug: false,
  });

  // Status Global Setup
  const displayStatus = status || "OPEN";
  const normalizedStatus = String(displayStatus).trim().toUpperCase();
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[normalizedStatus] || "";
  const isFormDisabled =
    isReadOnly ||
    isViewDocumentUrl ||
    ["POSTED", "FINALIZED", "CANCELLED", "CLOSED"].includes(normalizedStatus);
  const isARSettlement = String(selectedJVType || "").toUpperCase() === "JV03";
  const isRegularJV = String(selectedJVType || "").toUpperCase() === "JV01";

  const jvSettlementColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "docCode", label: "Doc Type", width: 100 },
    { key: "docNo", label: "Invoice No.", width: 130 },
    { key: "docDate", label: "Invoice Date", width: 120 },
    { key: "docAmount", label: "Invoice Amount", width: 140 },
    { key: "appliedAmount", label: "Applied Amount", width: 140 },
    { key: "unappliedAmount", label: "Settlement Amount", width: 150 },
    { key: "balance", label: "Balance", width: 140 },
    { key: "advances", label: "Advances", width: 140 },
    { key: "arAcct", label: "AR Account", width: 120 },
    { key: "custvendCode", label: "Customer Code", width: 130 },
    { key: "custvendName", label: "Customer Name", width: 240 },
    { key: "remarks", label: "Remarks", width: 220 },
  ];
  const {
    getColumnStyle: getJvSettlementColumnStyle,
    getFrozenColumnStyle: getJvSettlementFrozenStyle,
    getOrderedColumns: getOrderedJvSettlementColumns,
    getSortedRows: getSortedJvSettlementRows,
    setColumnOrder: setJvSettlementColumnOrder,
    clearAllSorting: clearJvSettlementSorting,
    clearZeroValueOnFocus: clearJvSettlementZeroOnFocus,
    focusNextRowInput: focusNextJvSettlementRowInput,
    renderHeaderContextMenu: renderJvSettlementHeaderContextMenu,
    renderResizableHeader: renderJvSettlementHeader,
  } = useResizableTableColumns(jvSettlementColumnDefs);
  const orderedJvSettlementColumns = getOrderedJvSettlementColumns(jvSettlementColumnDefs);
  const sortedJvSettlementRows = getSortedJvSettlementRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );
  const getJvSettlementCellStyle = (key) => {
    const width = jvSettlementColumnDefs.find((column) => column.key === key)?.width || 120;
    return {
      ...getJvSettlementColumnStyle(key, width),
      ...getJvSettlementFrozenStyle(key, orderedJvSettlementColumns, width, { isHeader: false }),
    };
  };

  useEffect(() => {
    setJvSettlementColumnOrder(jvSettlementColumnDefs.map((column) => column.key));
  }, [setJvSettlementColumnOrder]);

  const jvGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "debit", label: `Debit (${glCurrDefault})`, width: 140 },
    { key: "credit", label: `Credit (${glCurrDefault})`, width: 140 },
    ...(withCurr2
      ? [
          { key: "debitFx1", label: `Debit (${withCurr3 ? glCurrGlobal2 : currCode})`, width: 140 },
          { key: "creditFx1", label: `Credit (${withCurr3 ? glCurrGlobal2 : currCode})`, width: 140 },
        ]
      : []),
    ...(withCurr3
      ? [
          { key: "debitFx2", label: `Debit (${glCurrGlobal3})`, width: 140 },
          { key: "creditFx2", label: `Credit (${glCurrGlobal3})`, width: 140 },
        ]
      : []),
    { key: "slRefNo", label: "SL Ref. No.", width: 120 },
    { key: "slRefDate", label: "SL Ref. Date", width: 120 },
    { key: "remarks", label: "Remarks", width: 160 },
  ];
  const {
    getColumnStyle: getJvGlColumnStyle,
    getFrozenColumnStyle: getJvGlFrozenStyle,
    getOrderedColumns: getOrderedJvGlColumns,
    getSortedRows: getSortedJvGlRows,
    setColumnOrder: setJvGlColumnOrder,
    clearAllSorting: clearJvGlSorting,
    clearZeroValueOnFocus: clearJvGlZeroOnFocus,
    focusNextRowInput: focusNextJvGlRowInput,
    renderHeaderContextMenu: renderJvGlHeaderContextMenu,
    renderResizableHeader: renderJvGlHeader,
  } = useResizableTableColumns(jvGlColumnDefs);
  const orderedJvGlColumns = getOrderedJvGlColumns(jvGlColumnDefs);
  const getJvGlFallbackWidth = (key) =>
    jvGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getJvGlCellStyle = (key, fallbackWidth) => ({
    ...getJvGlColumnStyle(key, fallbackWidth),
    ...getJvGlFrozenStyle(key, orderedJvGlColumns, fallbackWidth, { isHeader: false }),
  });
  const sortedJvGlRows = getSortedJvGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );
  const jvGlZeroClearFields = [
    "debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2",
  ];

  const getSingleUploadTemplateColumns = () =>
    getGlobalSingleUploadTemplateColumns(orderedJvGlColumns, {
      excludeKeys: ["ln", "vatName", "atcName"],
    });

  const createEmptyGlRow = () => ({
    acctCode: "", rcCode: "", sltypeCode: "", slCode: "", particular: "",
    vatCode: "", vatName: "", atcCode: "", atcName: "", debit: "0.00",
    credit: "0.00", debitFx1: "0.00", creditFx1: "0.00", debitFx2: "0.00",
    creditFx2: "0.00", slRefNo: "", slRefDate: "", remarks: "",
  });

  const handleDownloadSingleUploadTemplate = async () => {
    await downloadGlobalSingleUploadTemplate({
      columns: getSingleUploadTemplateColumns(),
      rows: sortedJvGlRows,
      fileName: "JV Regular Account Upload Template.xlsx",
      sheetName: "General Ledger",
      decimalColumnFormats: {
        debit: 2, credit: 2, debitFx1: 2, creditFx1: 2, debitFx2: 2, creditFx2: 2,
      },
      dateColumns: ["slRefDate"],
      rightAlignedColumns: ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"],
      centerAlignedColumns: ["acctCode", "rcCode", "sltypeCode", "slCode", "vatCode", "atcCode", "slRefNo", "slRefDate"],
      getCellValue: ({ rowEntry, column }) => {
        const row = rowEntry.row || rowEntry;
        if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(column.key)) {
          return parseFormattedNumber(row[column.key] || 0) || 0;
        }
        if (column.key === "slRefDate") {
          return toSingleUploadExcelDate(row.slRefDate, useformatToDatev2);
        }
        return String(row[column.key] ?? "");
      },
    });
  };

  const parseSingleUploadRow = ({ rawValuesByKey }) => {
    const row = createEmptyGlRow();
    getSingleUploadTemplateColumns().forEach((column) => {
      const rawCell = rawValuesByKey[column.key];
      const value = rawCell?.value;
      if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(column.key)) {
        row[column.key] = parseFormattedNumber(value || 0) || 0;
      } else if (column.key === "slRefDate") {
        row.slRefDate = toSingleUploadDateValue(rawCell?.cell?.value || value, useformatToDatev2);
      } else {
        row[column.key] = String(value ?? "").trim();
      }
    });
    return row;
  };

  const handleUploadExcelFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    updateState({ isLoading: true, showSpinner: true });
    try {
      const uploadResult = await handleSingleUploadExcelFile({
        file,
        columns: getSingleUploadTemplateColumns(),
        createEmptyRow: createEmptyGlRow,
        parseRow: parseSingleUploadRow,
        validateRows: async (rows) => {
          const response = await postRequest("validateJVUpload", {
            json_data: { branchCode, jvDate: documentDate, currCode, currRate, dt2: rows },
          });
          return extractSingleUploadValidationResult(response);
        },
      });

      if (uploadResult?.cancelled) return;
      if (!uploadResult?.ok) {
        showSingleUploadErrorList(uploadResult?.title || "Upload Error", uploadResult?.errors || []);
        return;
      }

      const result = uploadResult.validationResult;
      const errors = result?.errors || [];
      if (!result || Number(result.errorCount || 0) > 0 || errors.length > 0) {
        showSingleUploadErrorList(
          result ? "Upload Rejected" : "Upload Validation Error",
          result ? errors.map((row) => row.errorMsg || row.message || JSON.stringify(row)) : ["Unable to read validation response from the server."],
        );
        return;
      }

      const finalRows = (result.rows || []).map((row) => ({
        ...createEmptyGlRow(),
        ...row,
        debit: formatNumber(parseFormattedNumber(row.debit || 0), 2),
        credit: formatNumber(parseFormattedNumber(row.credit || 0), 2),
        debitFx1: formatNumber(parseFormattedNumber(row.debitFx1 || 0), 2),
        creditFx1: formatNumber(parseFormattedNumber(row.creditFx1 || 0), 2),
        debitFx2: formatNumber(parseFormattedNumber(row.debitFx2 || 0), 2),
        creditFx2: formatNumber(parseFormattedNumber(row.creditFx2 || 0), 2),
      }));

      if (finalRows.length === 0) {
        showSingleUploadErrorList("Upload Validation Error", ["The server returned no validated rows."]);
        return;
      }

      updateState({ detailRowsGL: finalRows, ...getGLTotalsState(finalRows) });
      useSwalSuccessAlert("Upload Completed", `${finalRows.length} account row(s) uploaded and validated successfully.`);
    } catch (error) {
      console.error("JV upload transaction error:", error);
      showSingleUploadErrorList("Upload Error", [error?.response?.data?.details || error?.message || "Unable to process the uploaded Excel file."]);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (singleUploadDropdownRef.current && !singleUploadDropdownRef.current.contains(event.target)) {
        setShowSingleUploadDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setJvGlColumnOrder(jvGlColumnDefs.map((column) => column.key));
  }, [setJvGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);

  const [totals, setTotals] = useState({
    totalGrossAmount: "0.00",
    totalDiscountAmount: "0.00",
    totalNetAmount: "0.00",
    totalVatAmount: "0.00",
    totalSalesAmount: "0.00",
    totalAtcAmount: "0.00",
    totalAmountDue: "0.00",
  });

  const customParamMap = {
    arAct: glAccountFilter.ActiveAll,
    salesAcct: glAccountFilter.ActiveAll,
    vatAcct: glAccountFilter.VATOutputAcct,
    discAcct: glAccountFilter.ActiveAll,
  };
  const customParam = customParamMap[accountModalSource] || null;

  const updateTotalsDisplay = (
    grossAmt,
    discAmt,
    netDisc,
    vat,
    atc,
    amtDue,
  ) => {
    setTotals({
      totalGrossAmount: formatNumber(grossAmt),
      totalDiscountAmount: formatNumber(discAmt),
      totalNetAmount: formatNumber(netDisc),
      totalVatAmount: formatNumber(vat),
      totalSalesAmount: formatNumber(netDisc - vat),
      totalAtcAmount: formatNumber(atc),
      totalAmountDue: formatNumber(amtDue),
    });
  };

  const getGLTotalsState = (rows) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const debitSum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debit) || 0),
      0,
    );
    const creditSum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.credit) || 0),
      0,
    );
    const debitFx1Sum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0),
      0,
    );
    const creditFx1Sum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0),
      0,
    );
    const debitFx2Sum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0),
      0,
    );
    const creditFx2Sum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0),
      0,
    );

    return {
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
      totalDebitFx1: formatNumber(debitFx1Sum),
      totalCreditFx1: formatNumber(creditFx1Sum),
      totalDebitFx2: formatNumber(debitFx2Sum),
      totalCreditFx2: formatNumber(creditFx2Sum),
    };
  };

  useEffect(() => {
    updateState(getGLTotalsState(detailRowsGL));
  }, [detailRowsGL]);

  useEffect(() => {
    if (resetFlag) {
      handleReset();
    }
    let timer;
    if (isLoading) {
      updateState({ showSpinner: true });
    } else {
      updateState({ showSpinner: false });
    }
  }, [resetFlag, isLoading]);

  useEffect(() => {
    if (glCurrMode && glCurrDefault && currCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
    }
  }, [glCurrMode, glCurrDefault, currCode]);

  useEffect(() => {
    if (custName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map((row) => ({
        ...row,
        currency: custName.currCode,
      }));
      updateState({ detailRows: updatedRows });
    }
  }, [custName?.currCode]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      handleReset();
      loadCompanyData();
      isInitialMount.current = false;
    }
  }, []);

  // NEW Dropdown Fetching Logic (Adopted from CR.jsx)
  useEffect(() => {
    if (!refsLoaded) return;

    // 1. Fetch data synchronously using the dropdown utility
    const jvTran = getAllDropDown("JVTRAN_TYPE", docType);
    const refDoc = getAllDropDown("JVDOC_TYPE", docType);

    // 2. Build a single update object to avoid multiple re-renders
    const updates = {};

    if (jvTran.length > 0) {
      updates.jvTypes = jvTran;
      updates.selectedJVType = "JV01";
    }

    if (refDoc.length > 0) {
      updates.refdocTypes = refDoc;
      updates.selectedRefDocType = "JV";
    }

    // 3. Batch the update if any data was found
    if (Object.keys(updates).length > 0) {
      updateState(updates);
    }
  }, [docType, refsLoaded]);

  // OPTIMIZED: Parallel data loading for speed (Removed dropdown calls)
  const loadCompanyData = async () => {
    updateState({ isLoading: true, showSpinner: true });
    try {
      const [hsOptionReq, fieldLengthsReq, docControlReq] = await Promise.all([
        useTopHSOption(),
        useFieldLenghtCheck("jv_hd,jv_dt1,jv_dt2"),
        useTopDocControlRow(docType),
      ]);

      let currReq = null;
      if (hsOptionReq?.glCurrDefault) {
        currReq = await useTopCurrencyRow(hsOptionReq.glCurrDefault);
      }

      const stateUpdates = {
        isLoading: false,
        showSpinner: false,
      };

      if (docControlReq) {
        stateUpdates.documentName = docControlReq.docName;
        stateUpdates.documentSeries = docControlReq.docName;
        stateUpdates.documentDocLen = docControlReq.docName;
      }
      if (hsOptionReq) {
        stateUpdates.glCurrMode = hsOptionReq.glCurrMode;
        stateUpdates.glCurrDefault = hsOptionReq.glCurrDefault;
        stateUpdates.currCode = hsOptionReq.glCurrDefault;
        stateUpdates.glCurrGlobal1 = hsOptionReq.glCurrGlobal1;
        stateUpdates.glCurrGlobal2 = hsOptionReq.glCurrGlobal2;
        stateUpdates.glCurrGlobal3 = hsOptionReq.glCurrGlobal3;
      }
      if (currReq) {
        stateUpdates.currName = currReq.currName;
        stateUpdates.currRate = formatNumber(1, 6);
      }
      if (fieldLengthsReq) {
        stateUpdates.tblFieldArray = fieldLengthsReq;
      }

      updateState(stateUpdates);
    } catch (err) {
      console.error("Error fetching initial data:", err);
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const handleReset = () => {
    clearJvGlSorting();
    clearJvSettlementSorting();

    updateState({
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || "",
      userCode: currentUserRow?.userCode || "",
      documentDate: useGetCurrentDayV2(),
      currCode: companyInfo?.currCode || "",
      glCurrDefault: companyInfo?.currCode || "",
      currName: companyInfo?.currName || "",
      currRate: formatNumber(companyInfo?.currRate || 1, 6),
      refDocNo: "",
      refDocAmount: "0.00",
      refAdvAcct: "",
      refDocNo2: "",
      fromDate: null,
      toDate: null,
      remarks: "",
      noReprints: "0",
      custName: "",
      custCode: "",
      attention: "",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      glCurrMode: companyInfo?.glCurrMode || glCurrMode,
      glCurrGlobal1: companyInfo?.glCurrGlobal1 || glCurrGlobal1,
      glCurrGlobal2: companyInfo?.glCurrGlobal2 || glCurrGlobal2,
      glCurrGlobal3: companyInfo?.glCurrGlobal3 || glCurrGlobal3,
      defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),
      totalDebit: "0.00",
      totalCredit: "0.00",
      totalDebitFx1: "0.00",
      totalCreditFx1: "0.00",
      totalDebitFx2: "0.00",
      totalCreditFx2: "0.00",
      documentStatus: "",
      selectedJVType: "JV01",
      selectedRefDocType: "JV",
      activeTab: "basic",
      GLactiveTab: "invoice",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status: "Open",
      showARBalanceModal: false,
      globalLookupRow: [],
      globalLookupHeader: [],
    });
    updateTotalsDisplay(0, 0, 0, 0, 0, 0);
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

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotalsDisplay(0, 0, 0, 0, 0, 0);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(
        documentNo,
        branchCode,
        docType,
        "jvNo",
        direction,
      );

      if (!data?.jvId) {
        useSwalErrorAlert(
          "Transaction Reversal",
          "Transaction does not exist.",
        );
        return resetState();
      }

      const jvDateForHeader = data.jvDate ? useformatToDatev2(data.jvDate) : "";

      const retrievedDetailRows = (data.dt1 || []).map((item) => ({
        ...item,
        docAmount: formatNumber(item.docAmount),
        vatAmount: formatNumber(item.vatAmount),
        atcAmount: formatNumber(item.atcAmount),
        appliedAmount: formatNumber(item.appliedAmount),
        unappliedAmount: formatNumber(item.unappliedAmount),
        balance: formatNumber(item.balance),
      }));

      const formattedGLRows = (data.dt2 || []).map((glRow) => ({
        ...glRow,
        debit: formatNumber(glRow.debit),
        credit: formatNumber(glRow.credit),
        debitFx1: formatNumber(glRow.debitFx1),
        creditFx1: formatNumber(glRow.creditFx1),
        debitFx2: formatNumber(glRow.debitFx2),
        creditFx2: formatNumber(glRow.creditFx2),
        slRefDate: glRow.slRefDate ? useformatToDatev2(glRow.slRefDate) : "",
      }));

      updateState({
        documentStatus: data.jvStatus,
        status: data.docStatus,
        documentID: data.jvId,
        documentNo: data.jvNo,
        branchCode: data.branchCode,
        documentDate: jvDateForHeader,
        selectedJVType: data.jvtranType,
        noReprints: data.noReprints,
        selectedRefDocType:
          data.refDocType ||
          (String(data.jvtranType || "").toUpperCase() === "JV03" ? "CR" : "JV"),
        custCode: data.slCode,
        custName: data.slName,
        refDocNo: data.refDocNo,
        refDocAmount: formatNumber(data.docAmt || 0),
        refAdvAcct: retrievedDetailRows[0]?.advAcct || "",
        refDocNo2: data.refDocNo1,
        currCode: data.currCode,
        currName: data.currName,
        currRate: formatNumber(data.currRate, 6),
        remarks: data.remarks,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });

      updateTotals(retrievedDetailRows);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({ icon: "error", title: "Fetch Error", text: error.message });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const fetchTranDataReversal = async (documentNo, branchCode, docType) => {
    if (reversalFetchInProgressRef.current) return;

    const getReversalErrorMessage = (error) => {
      const rawMessage = String(
        error?.response?.data?.message || error?.message || "Unable to retrieve transaction.",
      );
      const sqlServerMessage = rawMessage.match(
        /\[SQL Server\]([\s\S]*?)(?:\s*\(Connection:|$)/i,
      );

      return (sqlServerMessage?.[1] || rawMessage).trim();
    };

    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        refDocNo: "",
        documentStatus: "",
        status: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotalsDisplay(0, 0, 0, 0, 0, 0);
    };

    reversalFetchInProgressRef.current = true;
    updateState({ isLoading: true });

    try {
      const data = await useFetchTranDataReversal(
        documentNo,
        branchCode,
        docType,
        selectedRefDocType,
        "refDocNo",
      );

      if (!data?.jvId) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      const retrievedDetailRows = (data.dt1 || []).map((item) => ({
        ...item,
        docAmount: formatNumber(item.docAmount),
        vatAmount: formatNumber(item.vatAmount),
        atcAmount: formatNumber(item.atcAmount),
        appliedAmount: formatNumber(item.appliedAmount),
        unappliedAmount: formatNumber(item.unappliedAmount),
        balance: formatNumber(item.balance),
      }));

      const formattedGLRows = (data.dt2 || []).map((glRow) => ({
        ...glRow,
        debit: formatNumber(glRow.debit),
        credit: formatNumber(glRow.credit),
        debitFx1: formatNumber(glRow.debitFx1),
        creditFx1: formatNumber(glRow.creditFx1),
        debitFx2: formatNumber(glRow.debitFx2),
        creditFx2: formatNumber(glRow.creditFx2),
        slRefDate: glRow.slRefDate ? useformatToDatev2(glRow.slRefDate) : "",
      }));

      updateState({
        custCode: data.slCode,
        custName: data.slName,
        refDocNo2: data.refDocNo1,
        currCode: data.currCode,
        currName: data.currName,
        currRate: formatNumber(data.currRate, 6),
        remarks: data.remarks,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });

      updateTotals(retrievedDetailRows);
    } catch (error) {
      const errorMessage = getReversalErrorMessage(error);

      if (!error?.response?.data?.message) {
        console.error("Error fetching transaction data:", error);
      }

      useSwalErrorAlert(
        "Transaction Reversal",
        errorMessage,
      );
      resetState();
    } finally {
      reversalFetchInProgressRef.current = false;
      updateState({ isLoading: false });
    }
  };

  const handleSviNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

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

  const handleActivityOption = async (action) => {
    if (action === "Upsert" && detailRowsGL.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please add at least one GL Entry before saving.",
      });
      return;
    }

    if (documentStatus === "") {
      updateState({ isLoading: true });

      const {
        branchCode,
        documentNo,
        documentID,
        documentDate,
        selectedJVType,
        selectedRefDocType,
        custCode,
        custName,
        refDocNo,
        refDocNo2,
        fromDate,
        toDate,
        currCode,
        currName,
        currRate,
        remarks,
        detailRows,
        detailRowsGL,
      } = state;

      const glData = {
        branchCode: branchCode,
        jvNo: documentNo || "",
        jvId: documentID || "",
        jvDate: documentDate.includes("/")
          ? new Date(documentDate).toISOString().split("T")[0]
          : documentDate,
        jvtranType: selectedJVType,
        refDocType: selectedRefDocType,
        slCode: custCode,
        slName: custName,
        refDocNo: refDocNo,
        refDocNo2: refDocNo2,
        docAmt: parseFormattedNumber(
          isARSettlement ? refDocAmount : totals.totalGrossAmount,
        ) || 0,
        fromDate: fromDate,
        toDate: toDate,
        currCode: currCode || "PHP",
        currRate: parseFormattedNumber(currRate),
        remarks: remarks || "",
        userCode: user.USER_CODE,
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          docCode: row.docCode || "",
          docNo: row.docNo || "",
          docDate: row.docDate || null,
          docAmount: parseFormattedNumber(row.docAmount || 0),
          vatCode: row.vatCode || "",
          vatAmount: parseFormattedNumber(row.vatAmount || 0),
          atcCode: row.atcCode || "",
          atcAmount: parseFormattedNumber(row.atcAmount || 0),
          balance: parseFormattedNumber(row.balance || 0),
          appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
          unappliedAmount: parseFormattedNumber(row.unappliedAmount || 0),
          advAcct: row.advAcct || "",
          arAcct: row.arAcct || "",
          remarks: row.remarks || "",
          custvendCode: row.custvendCode || custCode,
          custvendName: row.custvendName || custName,
          refBranchCode: row.refBranchCode || branchCode,
          sourceGroupId: row.sourceGroupId || "",
          docCurrCode: row.docCurrCode || currCode,
          docCurrRate: parseFormattedNumber(row.docCurrRate || currRate || 1),
          dt1Lineno: row.dt1Lineno || "",
        })),
        dt2: detailRowsGL.map((entry, index) => ({
          recNo: String(index + 1),
          acctCode: entry.acctCode || "",
          rcCode: entry.rcCode || "",
          sltypeCode: entry.sltypeCode || "",
          slCode: entry.slCode || "",
          particular: entry.particular || "",
          vatCode: entry.vatCode || "",
          vatName: entry.vatName || "",
          atcCode: entry.atcCode || "",
          atcName: entry.atcName || "",
          debit: parseFormattedNumber(entry.debit || 0),
          credit: parseFormattedNumber(entry.credit || 0),
          debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
          creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
          debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
          creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
          slRefNo: entry.slRefNo || "",
          slRefDate: entry.slRefDate
            ? new Date(entry.slRefDate).toISOString().split("T")[0]
            : null,
          remarks: entry.remarks || "",
          dt1Lineno: entry.dt1Lineno || "",
        })),
      };

      if (action === "GenerateGL") {
        try {
          const newGlEntries = await useGenerateGLEntries(docType, glData);

          if (newGlEntries) {
            updateState({ detailRowsGL: newGlEntries });
          } else {
            console.warn("GL entries generation failed or returned no data.");
          }
        } catch (error) {
          console.error("Error during GL generation:", error);
        } finally {
          updateState({ isLoading: false });
        }
      }

      if (action === "Upsert") {
        try {
          const response = await useTransactionUpsert(
            docType,
            glData,
            updateState,
            "jvId",
            "jvNo",
          );
          if (response) {
            useSwalshowSaveSuccessDialog(
              () => {
                handleReset();
                setTopTab("history");
              },
              () => handleSaveAndPrint(response.data[0].jvId),
            );
          }
        } catch (error) {
          console.error("Error during transaction upsert:", error);
        } finally {
          updateState({ isLoading: false });
        }

        updateState({ isDocNoDisabled: true, isFetchDisabled: true });
      }
    }
  };

  const handleAddRow = async () => {
    try {
      const items = await handleFetchDetail(custCode);
      const itemList = Array.isArray(items) ? items : [items];
      const newRows = await Promise.all(
        itemList.map(async (item) => {
          return {
            lnNo: "",
            atcCode: item.atcCode || "",
            atcName: item.atcName || "",
            atcAmount: "0.00",
            jvAmount: "0.00",
            vatAcct: item.vatAcctCode,
            rcCode: "",
          };
        }),
      );

      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows });
      updateTotals(updatedRows);

      setTimeout(() => {
        const tableContainer = document.querySelector(".max-h-\\[430px\\]");
        if (tableContainer) {
          tableContainer.scrollTop = tableContainer.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error("Error adding new row:", error);
      alert("Failed to add new row. Please select a Payee first.");
    }
  };

  const handleAddRowGL = (index = null) => {
    const newRow = {
      acctCode: "",
      rcCode: "",
      sltypeCode: "",
      slCode: "",
      particular: "",
      vatCode: "",
      vatName: "",
      atcCode: "",
      atcName: "",
      debit: "0.00",
      credit: "0.00",
      debitFx1: "0.00",
      creditFx1: "0.00",
      debitFx2: "0.00",
      creditFx2: "0.00",
      slRefNo: "",
      slRefDate: "",
      remarks: "",
    };

    const updatedRowsGL = [...detailRowsGL];

    if (index !== null && index >= 0) {
      updatedRowsGL.splice(index + 1, 0, newRow);
    } else {
      updatedRowsGL.push(newRow);
    }

    updateState({
      detailRowsGL: updatedRowsGL,
      ...getGLTotalsState(updatedRowsGL),
    });
  };

  const handleCopyGLRow = (index) => {
    const updatedRowsGL = [...detailRowsGL];
    const sourceRow = updatedRowsGL[index];

    if (!sourceRow) return;

    updatedRowsGL.splice(index + 1, 0, { ...sourceRow });

    updateState({
      detailRowsGL: updatedRowsGL,
      ...getGLTotalsState(updatedRowsGL),
    });
  };

  const handleInsertGLRowClick = async (index) => {
    const result = await useSwalProceedConfirm(
      "Insert Detail Row",
      "Do you want to copy the selected record or insert a new record?",
      "Copy Record",
      "Insert New Record",
    );

    if (result.isConfirmed) {
      handleCopyGLRow(index);
      return;
    }

    if (isARSettlement && ["GenerateGL", "Upsert"].includes(action)) {
      const advanceAmount = parseFormattedNumber(refDocAmount || 0) || 0;
      const totalSettlement = detailRows.reduce(
        (total, row) => total + (parseFormattedNumber(row.unappliedAmount || 0) || 0),
        0,
      );

      if (totalSettlement > advanceAmount + 0.001) {
        showAdvanceAllocationWarning();
        return;
      }
    }

    if (result.dismiss === Swal.DismissReason.cancel) {
      handleAddRowGL(index);
    }
  };

  const handleDeleteRowGL = (index) => {
    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows });
  };

  const handleFetchDetail = async (custCode) => {
    if (!custCode) return [];

    try {
      const custPayload = {
        json_data: {
          custCode: custCode,
        },
      };

      const vendResponse = await postRequest(
        "addCustomerDetail",
        JSON.stringify(custPayload),
      );
      const rawResult = vendResponse.data[0]?.result;

      const parsed = JSON.parse(rawResult);
      return parsed;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

  const handlePrint = async () => {
    if (!detailRowsGL) {
      return;
    }
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
    if (!detailRowsGL || detailRowsGL.length === 0) {
      return;
    }

    if (documentID) {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        isDocNoDisabled: false,
        isFetchDisabled: false,
        noReprints: "0",
      });
    }
    Swal.fire({
      icon: "success",
      title: "Transaction Copied",
      text: "Identifiers cleared. You can now modify and save this as a new JV.",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const cleanUrl = useCallback(() => {
    navigate(location.pathname, { replace: true });
  }, [navigate, location.pathname]);

  const handleHistoryRowPick = useCallback((row) => {
    const docNo = row?.docNo;
    const branchCode = row?.branchCode;
    if (!docNo || !branchCode) return;
    fetchTranData(docNo, branchCode);
    setTopTab("details");
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("jvNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
      cleanUrl();
    }
  }, [location.search, handleHistoryRowPick, cleanUrl]);

  const printData = {
    jv_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  const handleCloseCustModal = async (selectedData) => {
    if (!selectedData) {
      updateState({ custModalOpen: false });
      return;
    }

    updateState({ custModalOpen: false });
    updateState({ isLoading: true });

    try {
      const custDetails = {
        custCode: selectedData?.custCode || "",
        custName: selectedData?.custName || "",
        currCode: selectedData?.currCode || "",
      };

      updateState({
        custName: selectedData.custName,
        custCode: selectedData.custCode,
      });

      if (!selectedData.currCode) {
        const payload = { CUST_CODE: selectedData.custCode };
        const response = await postRequest(
          "getCustomer",
          JSON.stringify(payload),
        );

        if (response.success) {
          const data = JSON.parse(response.data[0].result);
          custDetails.currCode = data[0]?.currCode;
        } else {
          console.warn(
            "API call for getCustomer returned success: false",
            response.message,
          );
        }
      }

      await Promise.all([
        handleSelectCurrency(custDetails.currCode),
        updateState({ attention: custDetails.attention }),
      ]);
    } catch (error) {
      console.error("Error fetching customer details:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const updateSettlementTotals = (rows) => {
    const settlementAmount = (Array.isArray(rows) ? rows : []).reduce(
      (total, row) =>
        total + (parseFormattedNumber(row.unappliedAmount || 0) || 0),
      0,
    );

    updateTotalsDisplay(settlementAmount, 0, settlementAmount, 0, 0, settlementAmount);
  };

  const showAdvanceAllocationWarning = () => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "warning",
      title: "Advances amount exceeded",
      text: "Total settlement cannot exceed the selected collection receipt balance.",
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
    });
  };

  const handleOpenARBalance = async () => {
    if (!custCode) {
      useSwalErrorAlert(
        "AR Settlement Application",
        "Please select a customer before loading invoice details.",
      );
      return;
    }

    if (isARSettlement && !refDocNo) {
      useSwalErrorAlert(
        "AR Settlement Application",
        "Please select an open collection receipt before loading invoice details.",
      );
      return;
    }

    try {
      updateState({ isLoading: true });
      const endpoint = "getOpenARBalance";
      const response = await fetchDataJson(endpoint, { custCode, branchCode });
      const records = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : [];
      const columns = await useSelectedHSColConfig(endpoint);

      if (records.length === 0) {
        useSwalErrorAlert(
          "Open AR Balance",
          "There are no open invoices for the selected customer and branch.",
        );
        return;
      }

      updateState({
        globalLookupRow: records,
        globalLookupHeader: columns || [],
        globalLookupMode: "invoice",
        showARBalanceModal: true,
      });
    } catch (error) {
      console.error("Failed to load open AR balances:", error);
      useSwalErrorAlert("Open AR Balance", "Failed to load open AR balances.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleOpenARAdvance = async () => {
    try {
      updateState({ isLoading: true });
      const endpoint = "getCROpenARAdvances";
      const response = await fetchDataJson(endpoint, { branchCode, custCode });
      const records = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : [];
      const columns = await useSelectedHSColConfig("getARAdvances");

      if (records.length === 0) {
        useSwalErrorAlert(
          "Open Collection Receipts",
          "There are no unapplied collection receipts for the selected criteria.",
        );
        return;
      }

      updateState({
        globalLookupRow: records,
        globalLookupHeader: columns || [],
        globalLookupMode: "advance",
        showARBalanceModal: true,
      });
    } catch (error) {
      console.error("Failed to load open collection receipts:", error);
      useSwalErrorAlert(
        "Open Collection Receipts",
        "Failed to load unapplied collection receipts.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCloseARAdvance = (payload) => {
    const selected = payload?.records?.[0];
    if (!selected) {
      updateState({ showARBalanceModal: false });
      return;
    }

    updateState({
      refDocNo: selected.docNo || "",
      refDocAmount: formatNumber(selected.balance || 0),
      refAdvAcct: selected.acctCode || "",
      selectedRefDocType: "CR",
      custCode: selected.custCode || custCode,
      custName: selected.custName || custName,
      currCode: selected.currCode || currCode,
      currRate: formatNumber(selected.currRate || 1, 6),
      showARBalanceModal: false,
    });
  };

  const handleCloseARBalance = async (payload) => {
    if (!payload) {
      updateState({ showARBalanceModal: false });
      return;
    }

    try {
      updateState({ isLoading: true });
      const result = await useSelectedOpenARBalance(payload);

      if (result) {
        const existingKeys = new Set(
          detailRows.map((row) => `${row.refDocCode || row.docCode}|${row.docNo}`),
        );
        let remainingAdvance = Math.max(
          (parseFormattedNumber(refDocAmount || 0) || 0) -
            detailRows.reduce(
              (total, row) => total + (parseFormattedNumber(row.unappliedAmount || 0) || 0),
              0,
            ),
          0,
        );
        const newRows = result
          .filter(
            (entry) =>
              !existingKeys.has(`${entry.refDocCode || entry.docCode}|${entry.siNo || entry.docNo}`),
          )
          .map((entry, index) => {
            const documentAmount = parseFormattedNumber(entry.balance || 0) || 0;
            const atcAmount = parseFormattedNumber(entry.atcAmount || 0) || 0;
            const maximumSettlement = Math.max(documentAmount - atcAmount, 0);
            const settlementAmount = Math.min(maximumSettlement, remainingAdvance);
            const ratio = maximumSettlement > 0 ? settlementAmount / maximumSettlement : 0;
            const appliedAmount = documentAmount * ratio;
            remainingAdvance = Math.max(remainingAdvance - settlementAmount, 0);

            return {
              lnNo: detailRows.length + index + 1,
              docCode: entry.refDocCode || entry.docCode || "SI",
              docNo: entry.siNo || entry.docNo || "",
              docDate: entry.siDate || entry.docDate || "",
              docAmount: formatNumber(documentAmount),
              vatCode: entry.vatCode || "",
              vatAmount: formatNumber((parseFormattedNumber(entry.vatAmount || 0) || 0) * ratio),
              atcCode: entry.atcCode || "",
              atcAmount: formatNumber(atcAmount * ratio),
              originalAppliedAmount: documentAmount,
              originalVatAmount: parseFormattedNumber(entry.vatAmount || 0) || 0,
              originalAtcAmount: atcAmount,
              appliedAmount: formatNumber(appliedAmount),
              unappliedAmount: formatNumber(settlementAmount),
              balance: formatNumber(Math.max(documentAmount - appliedAmount, 0)),
              advAcct: refAdvAcct,
              arAcct: entry.arAcct || "",
              remarks: entry.remarks || "",
              custvendCode: entry.custCode || custCode,
              custvendName: entry.custName || custName,
              refBranchCode: entry.refBranchCode || branchCode,
              sourceGroupId: entry.groupId || "",
              docCurrCode: entry.currCode || currCode,
              docCurrRate: formatNumber(entry.currRate || 1, 6),
              dt1Lineno:
                entry.dt1Lineno ||
                entry.lineNo ||
                (String(entry.groupId || "").length > 36
                  ? String(entry.groupId).substring(36, 40)
                  : ""),
            };
          });
        const updatedRows = [...detailRows, ...newRows];

        updateState({ detailRows: updatedRows });
        updateSettlementTotals(updatedRows);
      }
    } finally {
      updateState({ showARBalanceModal: false, isLoading: false });
    }
  };

  const handleSettlementAmountChange = (index, value, formatValue = false) => {
    const updatedRows = [...detailRows];
    const row = { ...updatedRows[index] };
    const documentAmount = parseFormattedNumber(row.docAmount || 0) || 0;
    const originalApplied = parseFormattedNumber(row.originalAppliedAmount || row.docAmount || 0) || 0;
    const originalVat = parseFormattedNumber(row.originalVatAmount || row.vatAmount || 0) || 0;
    const originalAtc = parseFormattedNumber(row.originalAtcAmount || row.atcAmount || 0) || 0;
    const invoiceMaximumSettlement = Math.max(originalApplied - originalAtc, 0);
    const otherSettlementAmount = updatedRows.reduce(
      (total, currentRow, currentIndex) =>
        currentIndex === index
          ? total
          : total + (parseFormattedNumber(currentRow.unappliedAmount || 0) || 0),
      0,
    );
    const availableAdvance = Math.max(
      (parseFormattedNumber(refDocAmount || 0) || 0) - otherSettlementAmount,
      0,
    );
    const maximumSettlement = Math.min(invoiceMaximumSettlement, availableAdvance);
    const requestedAmount = Math.max(parseFormattedNumber(value || 0) || 0, 0);
    const settlementAmount = Math.min(requestedAmount, maximumSettlement);
    const ratio = invoiceMaximumSettlement > 0 ? settlementAmount / invoiceMaximumSettlement : 0;
    const appliedAmount = originalApplied * ratio;

    row.originalAppliedAmount = originalApplied;
    row.originalVatAmount = originalVat;
    row.originalAtcAmount = originalAtc;
    row.unappliedAmount = formatValue || requestedAmount > maximumSettlement
      ? formatNumber(settlementAmount)
      : value;
    row.appliedAmount = formatNumber(appliedAmount);
    row.vatAmount = formatNumber(originalVat * ratio);
    row.atcAmount = formatNumber(originalAtc * ratio);
    row.balance = formatNumber(Math.max(documentAmount - appliedAmount, 0));
    updatedRows[index] = row;

    updateState({ detailRows: updatedRows });
    updateSettlementTotals(updatedRows);

    if (requestedAmount > maximumSettlement) {
      showAdvanceAllocationWarning();
    }
  };

  const handleDeleteSettlementRow = (index) => {
    const updatedRows = detailRows.filter((_, rowIndex) => rowIndex !== index);
    updateState({
      detailRows: updatedRows.map((row, rowIndex) => ({ ...row, lnNo: rowIndex + 1 })),
      detailRowsGL: [],
    });
    updateSettlementTotals(updatedRows);
  };

  const renderJvSettlementCell = (columnKey, row, index) => {
    const style = getJvSettlementCellStyle(columnKey);
    const readOnlyAmount = (value, decimals = 2) => (
      <input
        type="text"
        className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
        value={formatNumber(parseFormattedNumber(value || 0), decimals)}
        readOnly
      />
    );
    const readOnlyText = (value, className = "") => (
      <input
        type="text"
        className={`w-full global-tran-td-inputclass-ui ${className}`.trim()}
        value={value || ""}
        readOnly
      />
    );

    const renderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      docCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyText(row.docCode, "text-center")}</td>,
      docNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyText(row.docNo)}</td>,
      docDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyText(row.docDate ? useformatToDatev2(row.docDate) : "", "text-center")}</td>,
      docAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyAmount(row.docAmount)}</td>,
      appliedAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyAmount(row.appliedAmount)}</td>,
      unappliedAmount: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <input
            type="text"
            id={`unappliedAmount-${index}`}
            className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
            value={row.unappliedAmount || ""}
            disabled={isFormDisabled}
            onChange={(event) => {
              const sanitizedValue = event.target.value.replace(/[^0-9.]/g, "");
              if (/^\d*(\.\d{0,2})?$/.test(sanitizedValue) || sanitizedValue === "") {
                handleSettlementAmountChange(index, sanitizedValue);
              }
            }}
            onFocus={(event) => clearJvSettlementZeroOnFocus(event, {
              isEditable: !isFormDisabled,
              onClear: (value) => handleSettlementAmountChange(index, value),
            })}
            onBlur={(event) => handleSettlementAmountChange(index, event.target.value, true)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              handleSettlementAmountChange(index, event.currentTarget.value, true);
              focusNextJvSettlementRowInput(index, "unappliedAmount", {
                rows: detailRows,
                zeroClearFields: ["unappliedAmount"],
                parseValue: parseFormattedNumber,
                onClearNextValue: (nextIndex, _field, value) =>
                  handleSettlementAmountChange(nextIndex, value),
              });
            }}
            data-field="unappliedAmount"
            data-row-index={index}
          />
        </td>
      ),
      balance: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyAmount(row.balance)}</td>,
      advances: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyAmount(refDocAmount)}</td>,
      arAcct: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyText(row.arAcct, "text-center")}</td>,
      custvendCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyText(row.custvendCode)}</td>,
      custvendName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyText(row.custvendName)}</td>,
      remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readOnlyText(row.remarks)}</td>,
    };

    return renderers[columnKey]?.() ?? null;
  };

  const updateTotals = (rows) => {
    let totalVAT = 0;
    let totalATC = 0;
    let totalJvAmt = 0;

    rows.forEach((row) => {
      const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
      const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;
      const jvAmount = parseFormattedNumber(row.jvAmount || 0) || 0;

      totalJvAmt += jvAmount;
      totalVAT += vatAmount;
      totalATC += atcAmount;
    });

    updateTotalsDisplay(
      totalJvAmt + totalVAT + totalATC,
      0,
      totalJvAmt,
      totalVAT,
      totalATC,
      totalJvAmt,
    );
  };

  const handleDetailChange = async (
    index,
    field,
    value,
    runCalculations = true,
  ) => {
    const updatedRows = [...detailRows];
    let row = { ...updatedRows[index] };

    if (field === "vatCode") {
      row.vatCode = value.vatCode;
      row.vatAcct = value.acctCode;
      row.vatName = value.vatName;
    }

    if (field === "atcCode") {
      row.atcCode = value.atcCode;
      row.atcName = value.atcName;
    }

    if (field === "billCode") {
      row.jvAmount = "0.00";
      row.vatAmount = "0.00";
      row.atcAmount = "0.00";
    }

    if (["glAcct", "discAcct"].includes(field)) {
      row[field] = value.acctCode;
    }

    if (field === "rcCode") {
      row.rcCode = value.rcCode;
    }

    if (runCalculations) {
      const origVatCode = row.vatCode || "";
      const origAtcCode = row.atcCode || "";

      if (field === "vatCode" || field === "atcCode") {
        async function updateVatAndAtc() {
          const currentJvAmt = parseFormattedNumber(row.jvAmount) || 0;
          let newVatAmount = parseFormattedNumber(row.vatAmount) || 0;

          if (field === "vatCode") {
            newVatAmount = row.vatCode
              ? await useTopVatAmount(row.vatCode, currentJvAmt)
              : 0;
            row.vatAmount = newVatAmount.toFixed(2);
          }

          const newNetOfVat = +(currentJvAmt - newVatAmount).toFixed(2);
          const newATCAmount = row.atcCode
            ? await useTopATCAmount(row.atcCode, newNetOfVat)
            : 0;

          row.atcAmount = newATCAmount.toFixed(2);
          row.jvAmount = +(currentJvAmt - newATCAmount).toFixed(2);
        }

        await updateVatAndAtc();
      }
    }

    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...state.detailRowsGL];
    let row = { ...updatedRowsGL[index] };

    if (
      [
        "acctCode",
        "slCode",
        "rcCode",
        "sltypeCode",
        "vatCode",
        "atcCode",
      ].includes(field)
    ) {
      const data = await useUpdateRowGLEntries(
        row,
        field,
        value,
        custCode,
        docType,
      );
      if (data) {
        row.acctCode = data.acctCode;
        row.sltypeCode = data.sltypeCode;
        row.slCode = data.slCode;
        row.rcCode = data.rcCode;
        row.vatCode = data.vatCode;
        row.vatName = data.vatName;
        row.atcCode = data.atcCode;
        row.atcName = data.atcName;
        row.particular = data.particular;
      }
    }

    if (
      [
        "debit",
        "credit",
        "debitFx1",
        "creditFx1",
        "debitFx2",
        "creditFx2",
      ].includes(field)
    ) {
      row[field] = value;
      const parsedValue = parseFormattedNumber(value);
      const pairs = {
        debit: "credit",
        credit: "debit",
        debitFx1: "creditFx1",
        creditFx1: "debitFx1",
        debitFx2: "creditFx2",
        creditFx2: "debitFx2",
      };

      if (parsedValue > 0 && pairs[field]) {
        row[pairs[field]] = "0.00";
      }
    }

    if (["particular", "atcName", "vatName", "slRefNo", "slRefDate", "remarks"].includes(field)) {
      row[field] = value;
    }

    updatedRowsGL[index] = row;
    updateState({
      detailRowsGL: updatedRowsGL,
      ...getGLTotalsState(updatedRowsGL),
    });
  };

  const handleBlurGL = async (index, field, value, autoCompute = false) => {
    const updatedRowsGL = [...state.detailRowsGL];
    const row = { ...updatedRowsGL[index] };

    const parsedValue = parseFormattedNumber(value);
    row[field] = formatNumber(parsedValue);

    if (
      autoCompute &&
      ((withCurr2 && currCode !== glCurrDefault) || withCurr3)
    ) {
      if (
        [
          "debit",
          "credit",
          "debitFx1",
          "creditFx1",
          "debitFx2",
          "creditFx2",
        ].includes(field)
      ) {
        const data = await useUpdateRowEditEntries(
          row,
          field,
          value,
          currCode,
          currRate,
          documentDate,
        );
        if (data) {
          row.debit = formatNumber(data.debit);
          row.credit = formatNumber(data.credit);
          row.debitFx1 = formatNumber(data.debitFx1);
          row.creditFx1 = formatNumber(data.creditFx1);
          row.debitFx2 = formatNumber(data.debitFx2);
          row.creditFx2 = formatNumber(data.creditFx2);
        }
      }
    } else {
      const pairs = [
        ["debit", "credit"],
        ["debitFx1", "creditFx1"],
        ["debitFx2", "creditFx2"],
      ];

      pairs.forEach(([a, b]) => {
        if (field === a && parsedValue > 0) {
          row[b] = formatNumber(0);
        } else if (field === b && parsedValue > 0) {
          row[a] = formatNumber(0);
        }
      });
    }

    updatedRowsGL[index] = row;
    updateState({
      detailRowsGL: updatedRowsGL,
      ...getGLTotalsState(updatedRowsGL),
    });
  };

  const handleCloseAccountModal = (selectedAccount) => {
    if (selectedAccount && selectedRowIndex !== null) {
      const specialAccounts = ["salesAcct", "arAcct", "discAcct", "vatAcct"];
      if (specialAccounts.includes(accountModalSource)) {
        handleDetailChange(
          selectedRowIndex,
          accountModalSource,
          selectedAccount,
          false,
        );
      } else {
        handleDetailChangeGL(selectedRowIndex, "acctCode", selectedAccount);
      }
    }
    updateState({
      showAccountModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseRcModalGL = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      if (accountModalSource !== null) {
        handleDetailChange(selectedRowIndex, "rcCode", selectedRc, false);
      } else {
        const result = await useTopRCRow(selectedRc.rcCode);
        if (result) {
          handleDetailChangeGL(selectedRowIndex, "rcCode", result);
        }
      }
    }
    updateState({
      showRcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      if (selectedSl) {
        handleDetailChangeGL(selectedRowIndex, "slCode", selectedSl);
      }
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null,
    });
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && documentID !== null) {
      const result = await useHandleCancel(
        docType,
        documentID,
        user.USER_CODE,
        confirmation.password,
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

  const handleClosePost = async (confirmation) => {
    if (documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandlePost(
        docType,
        documentID,
        "NSI",
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

  const handleSaveAndPrint = async (documentID) => {
    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);
    updateState({ showSpinner: false });
  };

  const handleCloseBillCodeModal = async (selectedBillCode) => {
    if (selectedBillCode && selectedRowIndex !== null) {
      const result = await useTopBillCodeRow(selectedBillCode.billCode);
      if (result) {
        handleDetailChange(selectedRowIndex, "billCode", result);
      }
    }
    updateState({
      showBillCodeModal: false,
      selectedRowIndex: null,
    });
  };

  const handleCloseVatModal = async (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      accountModalSource !== null
        ? handleDetailChange(selectedRowIndex, "vatCode", result, true)
        : handleDetailChangeGL(selectedRowIndex, "vatCode", result);
    }
    updateState({
      showVatModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseAtcModal = async (selectedAtc) => {
    if (selectedAtc && selectedRowIndex !== null) {
      const result = await useTopATCRow(selectedAtc.atcCode);
      if (!result) return;

      accountModalSource !== null
        ? handleDetailChange(selectedRowIndex, "atcCode", result, true)
        : handleDetailChangeGL(selectedRowIndex, "atcCode", result);
    }
    updateState({
      showAtcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
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

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
      handleSelectCurrency(selectedCurrency.currCode);
    }
    updateState({ currencyModalOpen: false });
  };

  const handleSelectCurrency = async (currCode) => {
    if (currCode) {
      const result = await useTopCurrencyRow(currCode);
      if (result) {
        const rate =
          currCode === glCurrDefault
            ? defaultCurrRate
            : await useTopForexRate(currCode, documentDate);

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
      handleSelectBillTerm(selectedBillTerm.billtermCode);
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

const handleTranDocNoRetrieval = async (data) => {
  await fetchTranData(data.docNo, data.branchCode || branchCode, data.key);
  updateState({ showAllTranDocNo: data.modalClose });
};

const handleTranDocNoSelection = async (data) => {
  handleReset(); 
  updateState({
    showAllTranDocNo: false,
    documentNo: data.docNo,
  });
  fetchTranData(data.docNo, data.branchCode || branchCode);
};

  const renderJvGlCell = (columnKey, row, index) => {
    const style = getJvGlCellStyle(columnKey, getJvGlFallbackWidth(columnKey));
    const focusNextGlCell = (field) => {
      focusNextJvGlRowInput(index, field, {
        rows: detailRowsGL,
        zeroClearFields: jvGlZeroClearFields,
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) =>
          handleDetailChangeGL(nextIndex, nextField, value),
      });
    };
    const modalHandlers = {
      acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }),
      rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true }),
      slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }),
      vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true }),
      atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true }),
    };
    const textInput = (field, options = {}) => (
      <input
        id={`${field}-${index}`}
        type="text"
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly={isFormDisabled || options.readOnly}
        maxLength={options.maxLength}
        onChange={(event) => handleDetailChangeGL(index, field, event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || isFormDisabled || options.readOnly) return;
          event.preventDefault();
          focusNextGlCell(field);
        }}
      />
    );
    const lookupInput = (field, editable = false) => (
      <div className="relative w-full">
        <input
          id={`${field}-${index}`}
          type="text"
          className="w-full pr-6 global-tran-td-inputclass-ui cursor-pointer"
          value={row[field] || ""}
          readOnly={isFormDisabled || !editable}
          onChange={(event) => handleDetailChangeGL(index, field, event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || isFormDisabled) return;
            event.preventDefault();
            focusNextGlCell(field);
          }}
        />
        {!isFormDisabled && (editable || String(row[field] || "").trim()) && (
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-lg text-blue-600 hover:text-blue-900"
            onClick={modalHandlers[field]}
          />
        )}
      </div>
    );
    const amountInput = (field) => (
      <input
        id={`${field}-${index}`}
        type="text"
        className="w-full global-tran-td-inputclass-ui text-right"
        value={row[field] || ""}
        readOnly={isFormDisabled}
        onChange={(event) => {
          const value = event.target.value.replace(/[^0-9.]/g, "");
          if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
            handleDetailChangeGL(index, field, value);
          }
        }}
        onFocus={(event) =>
          clearJvGlZeroOnFocus(event, {
            isEditable: !isFormDisabled,
            onClear: (value) => handleDetailChangeGL(index, field, value),
          })
        }
        onBlur={(event) => {
          if (!isFormDisabled) handleBlurGL(index, field, event.target.value);
        }}
        onKeyDown={async (event) => {
          if (event.key !== "Enter" || isFormDisabled) return;
          event.preventDefault();
          await handleBlurGL(index, field, event.target.value, true);
          focusNextGlCell(field);
        }}
      />
    );

    const renderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      acctCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{lookupInput(columnKey, true)}</td>,
      rcCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{lookupInput(columnKey)}</td>,
      slCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{lookupInput(columnKey)}</td>,
      vatCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{lookupInput(columnKey)}</td>,
      atcCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{lookupInput(columnKey)}</td>,
      sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
      particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
      vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { readOnly: true })}</td>,
      atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
      debit: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput(columnKey)}</td>,
      credit: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput(columnKey)}</td>,
      debitFx1: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput(columnKey)}</td>,
      creditFx1: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput(columnKey)}</td>,
      debitFx2: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput(columnKey)}</td>,
      creditFx2: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput(columnKey)}</td>,
      slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { maxLength: useGetFieldLength(tblFieldArray, "slref_no") || 50 })}</td>,
      slRefDate: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <DateFormatInput
            id={`slRefDate_${index}`}
            value={row.slRefDate || ""}
            disabled={isFormDisabled}
            className="w-full global-tran-td-inputclass-ui text-center pr-7"
            updateState={(updates) => {
              if (updates[`slRefDate_${index}`] !== undefined) {
                handleDetailChangeGL(index, "slRefDate", updates[`slRefDate_${index}`]);
              }
            }}
            onKeyDownCustom={(event) => {
              if (event.key !== "Enter" || isFormDisabled) return;
              event.preventDefault();
              focusNextGlCell("slRefDate");
            }}
          />
        </td>
      ),
      remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { maxLength: useGetFieldLength(tblFieldArray, "remarks") || 250 })}</td>,
    };
    return renderers[columnKey]?.() ?? null;
  };

  const handleJVTypeChange = (e) => {
    const selectedType = e.target.value;
    updateState({ selectedJVType: selectedType });
  };

  const handleRefDocTypeChange = (e) => {
    const selectedType = e.target.value;
    updateState({ selectedRefDocType: selectedType });
  };

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}
      <input
        ref={uploadInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleUploadExcelFile}
      />

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
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/JV"
          isSaveDisabled={
            !canSave || state.isSaveDisabled || isFormDisabled || detailRowsGL.length === 0
          }
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!isFullAccess || !documentID}
          isPrintDisabled={!documentID || normalizedStatus === "CANCELLED"}
          isCopyDisabled={!canAdd || !documentID || normalizedStatus === "CANCELLED"}
          isCancelDisabled={
            !canCancel ||
            !documentID ||
            ["POSTED", "FINALIZED", "CANCELLED", "CLOSED"].includes(normalizedStatus)
          }
          isPostDisabled={
            !canPost ||
            !documentID ||
            ["POSTED", "FINALIZED", "CANCELLED", "CLOSED"].includes(normalizedStatus)
          }
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
              <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>
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

          {/* JV Header Form Section - Main Grid Container */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative"
            id="jv_hd"
          >
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Column 1 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  disabled={
                    state.isFetchDisabled ||
                    state.isDocNoDisabled ||
                    isFormDisabled
                  }
                  onLookup={() => updateState({ branchModalOpen: true })}
                />

                <FieldRenderer
                  id="jvNo"
                  label="JV No."
                  type="lookup"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled}
                  onChange={(val) => updateState({ documentNo: val })}
                  onBlur={handleSviNoBlur}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSviNoBlur();
                      document.getElementById("documentDate")?.focus();
                    }
                  }}
                />

                {/* JV Date Picker */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                  >
                    <DateFormatInput
                      id="documentDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={documentDate}
                      disabled={isFormDisabled}
                      updateState={(updates) => {
                        if (updates.documentDate !== undefined) {
                          updateState({ documentDate: updates.documentDate });
                        }
                      }}
                    />
                  </div>
                  <label
                    htmlFor="documentDate"
                    className={`global-ref-floating-label ${!isFormDisabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}
                  >
                    JV Date
                  </label>
                </div>
              </div>

              {/* Column 2 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="custCode"
                  label="Customer/Payee Code"
                  type="lookup"
                  value={custCode || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => updateState({ custModalOpen: true })}
                />

                <div className="relative w-full md:w-6/6 lg:w-4/4">
                  <FieldRenderer
                    id="custName"
                    label="Customer/Payee Name"
                    type="text"
                    value={custName || ""}
                    disabled
                    readOnly
                  />
                </div>

                <FieldRenderer
                  id="selectedJVType"
                  label="JV Type"
                  type="select"
                  value={selectedJVType}
                  disabled={isFormDisabled || (isARSettlement && detailRows.length > 0)}
                  onChange={(val) =>
                    updateState({
                      selectedJVType: val,
                      selectedRefDocType: val === "JV03" ? "CR" : selectedRefDocType,
                      refDocNo: val === selectedJVType ? refDocNo : "",
                      refDocAmount: val === selectedJVType ? refDocAmount : "0.00",
                      refAdvAcct: val === selectedJVType ? refAdvAcct : "",
                      detailRows: val === selectedJVType ? detailRows : [],
                      detailRowsGL: [],
                      activeTab: val === "JV03" ? "invoice" : activeTab,
                    })
                  }
                  options={jvTypes.map((t) => ({
                    label: t.DROPDOWN_NAME,
                    value: t.DROPDOWN_CODE,
                  }))}
                />
              </div>

              {/* Column 3 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="selectedRefDocType"
                  label="Ref Doc Type"
                  type="select"
                  value={selectedRefDocType}
                  disabled={isFormDisabled || isARSettlement || selectedJVType === "JV01"}
                  onChange={(val) => updateState({ selectedRefDocType: val })}
                  options={refdocTypes
                    .filter((t) => !isARSettlement || t.DROPDOWN_CODE === "CR")
                    .map((t) => ({
                    label: t.DROPDOWN_NAME,
                    value: t.DROPDOWN_CODE,
                    }))}
                />

                <FieldRenderer
                  id="refDocNo"
                  label="Ref Doc No."
                  type={isARSettlement ? "lookup" : "text"}
                  value={refDocNo || ""}
                  disabled={isFormDisabled}
                  readOnly={isARSettlement}
                  lookupDisabled={isFormDisabled || (isARSettlement && detailRows.length > 0)}
                  onLookup={isARSettlement ? handleOpenARAdvance : undefined}
                  onChange={(val) => {
                    if (!isARSettlement) updateState({ refDocNo: val });
                  }}
                  onBlur={() => {
                    if (selectedJVType === "JV02" && refDocNo && branchCode) {
                      fetchTranDataReversal(refDocNo, branchCode, selectedRefDocType);
                    }
                  }}
                  maxLength={useGetFieldLength(tblFieldArray, "refDocNo") || 50}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      selectedJVType === "JV02" &&
                      refDocNo &&
                      branchCode
                    ) {
                      e.preventDefault();
                      fetchTranDataReversal(
                        refDocNo,
                        branchCode,
                        selectedRefDocType,
                      );
                    }
                  }}
                />

                <FieldRenderer
                  id="totalGrossAmount"
                  label="Reference Amount"
                  type="amount"
                  value={isARSettlement ? refDocAmount : totals.totalGrossAmount || ""}
                  disabled
                />
              </div>

              {/* Remarks Section */}
              <div className="lg:col-span-3">
                <div className="relative p-2 h-full">
                  <textarea
                    id="remarks"
                    placeholder=" "
                    rows={4}
                    className="peer global-tran-textbox-remarks-ui pt-2 h-full"
                    value={remarks}
                    onChange={(e) => updateState({ remarks: e.target.value })}
                    disabled={isFormDisabled}
                    maxLength={
                      useGetFieldLength(tblFieldArray, "remarks") || 250
                    }
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

            {/* Column 4 */}
            <div className="global-tran-textbox-group-div-ui">
              {/* Currency */}
              <FieldRenderer
                id="currName"
                label="Currency"
                type="lookup"
                value={
                  currCode
                    ? `${currCode}${currName ? ` - ${currName}` : ""}`
                    : ""
                }
                disabled={isFormDisabled}
                onLookup={() => updateState({ currencyModalOpen: true })}
                lookupDisabled={isFetchDisabled}
              />

              {/* Currency Rate */}
              <FieldRenderer
                id="currRate"
                label="Currency Rate"
                type="amount"
                value={currRate || ""}
                disabled={isFormDisabled || glCurrDefault === currCode}
                onChange={(val) => {
                  const sanitizedValue = String(val).replace(/[^0-9.]/g, "");
                  if (
                    /^\d*\.?\d{0,6}$/.test(sanitizedValue) ||
                    sanitizedValue === ""
                  ) {
                    updateState({ currRate: sanitizedValue });
                  }
                }}
                onBlur={handleCurrRateNoBlur}
              />
            </div>
          </div>
        </div>

        {isARSettlement && (
          <div className="global-tran-tab-div-ui">
            <div className="global-tran-tab-nav-ui">
              <div className="flex flex-row sm:flex-row">
                <button
                  type="button"
                  className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
                >
                  Invoice Details
                </button>
              </div>

            </div>

            <div className="global-tran-table-main-div-ui">
              <div className="global-tran-table-main-sub-div-ui">
                <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                  <thead className="global-tran-thead-div-ui">
                    <tr>
                      {orderedJvSettlementColumns.map((column) =>
                        renderJvSettlementHeader(column.label, column.key, column.width, {
                          orderedColumns: orderedJvSettlementColumns,
                        })
                      )}
                      {!isFormDisabled && (
                        <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="relative">
                    {sortedJvSettlementRows.map(({ row, originalIndex }) => (
                      <tr key={`${row.docCode}-${row.docNo}-${originalIndex}`} className="global-tran-tr-ui">
                        {orderedJvSettlementColumns.map((column) =>
                          renderJvSettlementCell(column.key, row, originalIndex)
                        )}
                        {!isFormDisabled && (
                          <td className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black" style={transactionActionsCellStyle}>
                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={() => handleDeleteSettlementRow(originalIndex)}
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderJvSettlementHeaderContextMenu()}
              </div>
            </div>

            <div className="global-tran-tab-footer-main-div-ui">
              <div className="global-tran-tab-footer-button-div-ui">
                <button
                  type="button"
                  onClick={handleOpenARBalance}
                  className="global-tran-tab-footer-button-add-ui"
                  style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* General Ledger Button */}
        <div className="global-tran-tab-div-ui">
          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">
            {/* Tabs */}
            <div className="flex flex-row sm:flex-row">
              <button
                className={`global-tran-tab-padding-ui ${
                  GLactiveTab === "invoice"
                    ? "global-tran-tab-text_active-ui"
                    : "global-tran-tab-text_inactive-ui"
                }`}
                onClick={() => updateState({ GLactiveTab: "invoice" })}
              >
                General Ledger
              </button>
            </div>

            {/* Action Button */}
            {isARSettlement && (
            <div className="flex justify-end">
              <button
                onClick={() => handleActivityOption("GenerateGL")}
                className="global-tran-button-generateGL"
                disabled={isLoading}
                style={{
                  visibility: isFormDisabled ? "hidden" : "visible",
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Generating..." : "Generate Entries"}
              </button>
            </div>
            )}
          </div>

          {/* GL Details Table */}
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedJvGlColumns.map((column) =>
                      renderJvGlHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedJvGlColumns,
                      })
                    )}
                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky top-0 right-0" style={transactionActionsHeaderStyle}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {sortedJvGlRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="global-tran-tr-ui">
                      {orderedJvGlColumns.map((column) =>
                        renderJvGlCell(column.key, row, originalIndex)
                      )}
                      {!isFormDisabled && (
                        <td className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black" style={transactionActionsCellStyle}>
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleInsertGLRowClick(originalIndex)}>
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                            <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRowGL(originalIndex)}>
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderJvGlHeaderContextMenu()}

              {false && (
              <table className="min-w-full border-collapse">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    <th className="global-tran-th-ui">LN</th>
                    <th className="global-tran-th-ui">Account Code</th>
                    <th className="global-tran-th-ui">RC Code</th>
                    <th className="global-tran-th-ui">SL Type Code</th>
                    <th className="global-tran-th-ui">SL Code</th>
                    <th className="global-tran-th-ui w-[2000px]">
                      Particulars
                    </th>
                    <th className="global-tran-th-ui">VAT Code</th>
                    <th className="global-tran-th-ui">VAT Name</th>
                    <th className="global-tran-th-ui">ATC Code</th>
                    <th className="global-tran-th-ui ">ATC Name</th>

                    <th className="global-tran-th-ui">
                      Debit ({glCurrDefault})
                    </th>
                    <th className="global-tran-th-ui">
                      Credit ({glCurrDefault})
                    </th>

                    <th
                      className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}
                    >
                      Debit ({withCurr3 ? glCurrGlobal2 : currCode})
                    </th>
                    <th
                      className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}
                    >
                      Credit ({withCurr3 ? glCurrGlobal2 : currCode})
                    </th>
                    <th
                      className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}
                    >
                      Debit ({glCurrGlobal3})
                    </th>
                    <th
                      className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}
                    >
                      Credit ({glCurrGlobal3})
                    </th>

                    <th className="global-tran-th-ui">SL Ref. No.</th>
                    <th className="global-tran-th-ui">SL Ref. Date</th>
                    <th className="global-tran-th-ui">Remarks</th>

                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {detailRowsGL.map((row, index) => (
                    <tr key={index} className="global-tran-tr-ui">
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.acctCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "acctCode",
                                e.target.value,
                              )
                            }
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showAccountModal: true,
                                  accountModalSource: "acctCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.rcCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "rcCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />
                          {!isFormDisabled &&
                            (row.rcCode === "REQ RC" ||
                              (row.rcCode && row.rcCode !== "REQ RC")) && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showRcModal: true,
                                  });
                                }}
                              />
                            )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.sltypeCode || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "sltypeCode",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.slCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "slCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />

                          {!isFormDisabled &&
                            (row.slCode === "REQ SL" || row.slCode) && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  if (row.slCode === "REQ SL" || row.slCode) {
                                    updateState({
                                      selectedRowIndex: index,
                                      showSlModal: true,
                                    });
                                  }
                                }}
                              />
                            )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[300px] global-tran-td-inputclass-ui"
                          value={row.particular || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "particular",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.vatCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "vatCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />

                          {!isFormDisabled &&
                            row.vatCode &&
                            row.vatCode.length > 0 && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showVatModal: true,
                                  });
                                }}
                              />
                            )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.vatName || ""}
                          readOnly
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.atcCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "atcCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />

                          {!isFormDisabled &&
                            (row.atcCode !== "" || row.atcCode) && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  if (row.atcCode !== "" || row.atcCode) {
                                    updateState({
                                      selectedRowIndex: index,
                                      showAtcModal: true,
                                    });
                                  }
                                }}
                              />
                            )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.atcName || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "atcName",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debit || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "debit",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "debit",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debit", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "debit", e.target.value)
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.credit || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "credit",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "credit",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "credit", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "credit", e.target.value)
                          }
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx1 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "debitFx1",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "debitFx1",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx1", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "debitFx1", e.target.value)
                          }
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx1 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "creditFx1",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "creditFx1",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx1", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "creditFx1", e.target.value)
                          }
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx2 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "debitFx2",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "debitFx2",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx2", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "debitFx2", e.target.value)
                          }
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx2 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "creditFx2",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "creditFx2",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx2", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "creditFx2", e.target.value)
                          }
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.slRefNo || ""}
                          maxLength={
                            useGetFieldLength(tblFieldArray, "slRefNo") || 50
                          }
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "slRefNo",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <div className="w-[110px]">
                          <DateFormatInput
                            id={`slRefDate_${index}`}
                            value={row.slRefDate || ""}
                            disabled={isFormDisabled}
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                            updateState={(updates) => {
                              if (updates[`slRefDate_${index}`] !== undefined) {
                                handleDetailChangeGL(
                                  index,
                                  "slRefDate",
                                  updates[`slRefDate_${index}`],
                                );
                              }
                            }}
                          />
                        </div>
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.remarks || ""}
                          maxLength={
                            useGetFieldLength(tblFieldArray, "remarks") || 250
                          }
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "remarks",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-0">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="global-tran-td-button-add-ui"
                              onClick={() => handleInsertGLRowClick(index)}
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>

                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={() => handleDeleteRowGL(index)}
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
              )}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            {/* Add Button */}
            <div className="global-tran-tab-footer-button-div-ui">
              <div ref={singleUploadDropdownRef} className="relative inline-block">
                {isRegularJV && showSingleUploadDropdown && !isFormDisabled && (
                  <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[270px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        Add Account
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        type="button"
                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                        onClick={() => { setShowSingleUploadDropdown(false); handleAddRowGL(); }}
                      >
                        <span className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          <FontAwesomeIcon icon={faFolderOpen} />
                        </span>
                        <span className="flex flex-col items-start">
                          <span>Add Account</span>
                          <span className="text-[11px] font-normal text-slate-400">Select account details</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-700"
                        onClick={() => { setShowSingleUploadDropdown(false); handleDownloadSingleUploadTemplate(); }}
                      >
                        <span className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                          <FontAwesomeIcon icon={faDownload} />
                        </span>
                        <span className="flex flex-col items-start">
                          <span>Download Template</span>
                          <span className="text-[11px] font-normal text-slate-400">Excel account columns</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-700"
                        onClick={() => { setShowSingleUploadDropdown(false); uploadInputRef.current?.click(); }}
                      >
                        <span className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                          <FontAwesomeIcon icon={faUpload} />
                        </span>
                        <span className="flex flex-col items-start">
                          <span>Upload Transaction</span>
                          <span className="text-[11px] font-normal text-slate-400">Import Excel file</span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => isRegularJV ? setShowSingleUploadDropdown((previous) => !previous) : handleAddRowGL()}
                  className="global-tran-tab-footer-button-add-ui"
                  style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>
            </div>

            {/* Totals Section */}
            <div className="global-tran-tab-footer-total-main-div-ui">
              {/* Total Debit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalDebit"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Debit ({glCurrDefault}):
                </label>
                <label
                  htmlFor="TotalDebit"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totalDebit}
                </label>
              </div>

              {/* Total Credit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalCredit"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Credit ({glCurrDefault}):
                </label>
                <label
                  htmlFor="TotalCredit"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totalCredit}
                </label>
              </div>

              {glCurrDefault !== currCode && (
                <>
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">
                      Total Debit ({currCode}):
                    </label>
                    <label className="global-tran-tab-footer-total-value-ui">
                      {totalDebitFx1}
                    </label>
                  </div>
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">
                      Total Credit ({currCode}):
                    </label>
                    <label className="global-tran-tab-footer-total-value-ui">
                      {totalCreditFx1}
                    </label>
                  </div>
                </>
              )}

              {withCurr3 && (
                <>
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">
                      Total Debit ({glCurrGlobal3}):
                    </label>
                    <label className="global-tran-tab-footer-total-value-ui">
                      {totalDebitFx2}
                    </label>
                  </div>
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">
                      Total Credit ({glCurrGlobal3}):
                    </label>
                    <label className="global-tran-tab-footer-total-value-ui">
                      {totalCreditFx2}
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {branchModalOpen && (
          <BranchLookupModal
            isOpen={branchModalOpen}
            onClose={handleCloseBranchModal}
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

        {/* COA Account Modal */}
        {showAccountModal && (
          <COAMastLookupModal
            isOpen={showAccountModal}
            onClose={handleCloseAccountModal}
            source={accountModalSource}
          />
        )}

        {/* RC Code Modal */}
        {showRcModal && (
          <RCLookupModal
            isOpen={showRcModal}
            onClose={handleCloseRcModalGL}
            source={accountModalSource}
          />
        )}

        {/* Billing Codes Modal  Invoice Detail */}
        {showBillCodeModal && (
          <BillCodeLookupModal
            isOpen={showBillCodeModal}
            onClose={handleCloseBillCodeModal}
          />
        )}

        {/* VAT Code Modal */}
        {showVatModal && (
          <VATLookupModal
            isOpen={showVatModal}
            onClose={handleCloseVatModal}
            customParam="OutputService"
          />
        )}

        {/* ATC Code Modal */}
        {showAtcModal && (
          <ATCLookupModal isOpen={showAtcModal} onClose={handleCloseAtcModal} />
        )}

        {/* SL Code Lookup Modal */}
        {showSlModal && (
          <SLMastLookupModal
            isOpen={showSlModal}
            onClose={handleCloseSlModalGL}
          />
        )}

        {showCancelModal && (
          <CancelTranModal
            isOpen={showCancelModal}
            onClose={handleCloseCancel}
          />
        )}

        {/* Post Modal - Now uses PostJV.jsx */}
        {showPostModal && (
          <PostJV
            isOpen={showPostModal}
            userCode={user.USER_CODE}
            onClose={() => updateState({ showPostModal: false })}
          />
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
        params={{ noReprints, documentID, docType, docNo: documentNo }}
            onClose={handleCloseSignatory}
            onCancel={() => updateState({ showSignatoryModal: false })}
          />
        )}
        {showAllTranDocNo && (
          <AllTranDocNo
            isOpen={showAllTranDocNo}
            params={{
              branchCode,
              branchName,
              docType,
              documentTitle,
              fieldNo: "jvNo",
            }}
           onRetrieve={handleTranDocNoRetrieval}
    onResponse={{ documentNo: documentNo }} // Pass current docNo
    onSelected={handleTranDocNoSelection}
    onClose={() => updateState({ showAllTranDocNo: false })}
  />
        )}

        {showARBalanceModal && (
          <GlobalLookupModalv1
            isOpen={showARBalanceModal}
            data={globalLookupRow}
            btnCaption={globalLookupMode === "advance" ? "Use Collection Receipt" : "Get Selected Invoice"}
            title={globalLookupMode === "advance" ? "Select Open Collection Receipt" : "Open AR Balance"}
            endpoint={globalLookupHeader}
            singleSelect={globalLookupMode === "advance"}
            onClose={globalLookupMode === "advance" ? handleCloseARAdvance : handleCloseARBalance}
            onCancel={() => updateState({ showARBalanceModal: false })}
          />
        )}

        {showSpinner && <LoadingSpinner />}
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getJVHistory"
          cacheKey={`JV:${state.branchCode || ""}:${state.docNo || ""}`}
          activeTabKey="JV_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
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
    </div>
  );
};

export default JV;
