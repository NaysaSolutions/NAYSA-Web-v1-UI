import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import { useSwalSuccessAlert, useSwalErrorAlert, useSwalProceedConfirm } from "@/NAYSA Cloud/Global/behavior.jsx";

// APV MODULE STRUCTURE
// 6. Detail/GL row actions and lookup callbacks
// 7. Column/render configuration
// 8. Page and modal layout
// This follows the transaction lifecycle used by SVI.jsx. APV-only reference
// workflows remain grouped separately because they are not shared by SVI.

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faTrashAlt, faFileLines } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import PostAPV from "./PostAPV.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";

// Configuration
import { apiClient, fetchData, fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Global
import { docTypeNames, docTypes, docTypeVideoGuide, docTypePDFGuide } from "@/NAYSA Cloud/Global/doctype";

import {
  useTopVatRow,
  useTopATCRow,
  useTopPayTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopDocControlRow,
  useTopATCAmount,
  useTopAccountRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useHandleCancel,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import { formatNumber, parseFormattedNumber, useSwalHandleOpenSpecsModal, useSwalshowSaveSuccessDialog } from "@/NAYSA Cloud/Global/behavior.jsx";

import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";

import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import { transactionActionsCellStyle, transactionActionsHeaderStyle, useResizableTableColumns } from "@/NAYSA Cloud/Global/datatable.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from "@/NAYSA Cloud/Components/Header";

// SHARED APV FORMATTERS AND PAYLOAD MAPPERS
// Keep database/API naming conversions outside the component where possible.

const formatSlrefDateInput = (value) => {
  const cleaned = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 8);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
};
const normalizeSlrefDate = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;
  let month = "";
  let day = "";
  let year = "";
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(datePart)) {
    [year, month, day] = datePart.split("-");
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    [month, day, year] = raw.split("/");
  } else {
    const formatted = formatSlrefDateInput(raw);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(formatted)) {
      [month, day, year] = formatted.split("/");
    }
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const yyyy = String(year);
  if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd) || !/^\d{4}$/.test(yyyy)) {
    return "";
  }

  const m = Number(mm);
  const d = Number(dd);
  const y = Number(yyyy);
  const parsed = new Date(y, m - 1, d);
  if (m < 1 || m > 12 || d < 1 || parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
    return "";
  }

  return `${mm}/${dd}/${yyyy}`;
};
const getAssignedUserBranch = (userRow) => {
  const branchCode = String(userRow?.branchCode ?? "").trim();
  return {
    branchCode,
    branchName: branchCode ? String(userRow?.branchName ?? "").trim() : "",
  };
};
const isNonPurchasesApType = (value) =>
  ["APV02", "APV002"].includes(
    String(value || "")
      .trim()
      .toUpperCase(),
  );
const isReimbursementLikeApType = (value) =>
  ["APV05", "APV06"].includes(
    String(value || "")
      .trim()
      .toUpperCase(),
  );
const isRequirementEnabled = (...values) =>
  values.some((value) =>
    ["Y", "YES", "TRUE"].includes(
      String(value ?? "")
        .trim()
        .toUpperCase(),
    ),
  );
const isDetailSlRequired = (row) => isRequirementEnabled(row?.recSl, row?.reqSl, row?.slReq);
const isGlSlRequired = (row) => isRequirementEnabled(row?.reqSl, row?.recSl, row?.slReq);
const buildApvDetailPayloadRow = (row, index, selectedApType) => {
  const apType = String(selectedApType || "")
    .trim()
    .toUpperCase();
  const isAdvance = apType === "APV03";
  const isReplenishment = apType === "APV04";
  const pcvNo = row.pcvNo || row.rrNo || "";
  const pcvId = row.pcvId || row.groupId || "";
  return {
    lnNo: String(index + 1),
    invType: isReplenishment ? row.invType || "PCV" : row.invType || "",
    rrNo: isReplenishment ? pcvNo : row.rrNo || "",
    poNo: row.poNo || "",
    siNo: isReplenishment ? row.siNo || pcvNo : row.siNo || "",
    siDate: row.siDate || "",
    amount: parseFormattedNumber(row.amount || 0),
    siAmount: parseFormattedNumber(row.siAmount || 0),
    debitAcct: row.debitAcct || "",
    vatAcct: row.vatAcct || "",
    // Advance application fields are populated by APV01 GenerateEntries.
    advAcct: row.advAcct || "",
    advpoNo: isReplenishment ? row.advpoNo || pcvNo : row.advpoNo || "",
    advpoAmount: parseFormattedNumber(row.advpoAmount || 0),
    // APV03 books its own VAT/EWT; APV01 uses applied-advance tax fields.
    advVatAmount: isAdvance ? parseFormattedNumber(row.vatAmount || 0) : parseFormattedNumber(row.advpoVatAmount || 0),
    advAtcAmount: isAdvance ? parseFormattedNumber(row.atcAmount || 0) : parseFormattedNumber(row.advpoAtcAmount || 0),
    advpoVatCode: row.advpoVatCode || "",
    advpoAtcCode: row.advpoAtcCode || "",
    sourceId: row.sourceId || "",
    apAdvId: row.apAdvId || "",
    autoAdv: apType === "APV01" ? row.autoAdv || "Y" : "N",
    sltypeCode: isDetailSlRequired(row) ? row.sltypeCode || "" : "",
    slCode: row.slCode || "",
    slName: row.slName || "",
    rcCode: row.rcCode || "",
    vatCode: row.vatCode || "",
    vatAmount: parseFormattedNumber(row.vatAmount || 0),
    atcCode: row.atcCode || "",
    atcAmount: parseFormattedNumber(row.atcAmount || 0),
    paytermCode: row.paytermCode || "",
    dueDate: row.dueDate || "",
    pcvNo: isReplenishment ? pcvNo : row.pcvNo || "",
    pcvId: isReplenishment ? pcvId : row.pcvId || "",
    refPcvNo: isReplenishment ? pcvNo : "",
    refPcvId: isReplenishment ? pcvId : "",
    groupId: row.groupId || "",
  };
};

// APV TRANSACTION COMPONENT

const APV = () => {
  // Routing, authentication, and view-document mode
  const loadedFromUrlRef = useRef(false);
  const defaultAdvancesAccountRef = useRef(null);
    const location = useLocation();
  const { companyInfo, currentUserRow, refsLoaded, getAllTopVatAmount, getAllTopATCAmount } = useAuth();
  const assignedUserBranch = getAssignedUserBranch(currentUserRow);
  const [isViewDocument, setIsViewDocument] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, []);
  const isViewDocumentUrl = isViewDocument;
  const { user } = useAuth();
  const [topTab, setTopTab] = useState("details");
  const [state, setState] = useState({
    // HS Option
    glCurrMode: companyInfo?.glCurrMode || "",
    glCurrDefault: companyInfo?.currCode || "",
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
    GLactiveTab: "invoice",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,
    triggerGLEntries: false,
    showAllTranDocNo: false,
    // Header information
    header: {
      apvDate: useGetCurrentDayV2(),
      remarks: "",
      refDocNo1: "",
      refDocNo2: "",
      fromDate: null,
      toDate: null,
    },
    // Branch information
    branchCode: assignedUserBranch.branchCode,
    branchName: assignedUserBranch.branchName,
    // Vendor information
    vendName: null,
    vendCode: null,
    // Currency information
    currCode: companyInfo?.currCode || "",
    currName: companyInfo?.currName || "",
    currRate: formatNumber(companyInfo?.currRate || 1, 6),
    defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),
    // AP information
    apTypes: [],
    selectedApType: "APV01",
    apAccountName: "",
    apAccountCode: "",
    userCode: currentUserRow?.userCode || "",
    // Detail rows
    detailRows: [],
    detailRowsGL: [],
    // Totals
    totalDebit: "0.00",
    totalCredit: "0.00",
    // Field visibility
    fieldVisibility: {
      sltypeCode: true,
      slName: true,
      address: true,
      tin: true,
      invType: true,
      rrNo: true,
      poNo: true,
      siNo: true,
      siDate: true,
    },
    // Modal states
    modalContext: "",
    selectionContext: "",
    selectedRowIndex: null,
    accountModalSource: null,
    showAccountModal: false,
    showRcModal: false,
    showVatModal: false,
    showAtcModal: false,
    showSlModal: false,
    showPaytermModal: false,
    currencyModalOpen: false,
    branchModalOpen: false,
    payeeModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostingModal: false,
    showRRRefModal: false,
    openRRDataSummary: [],
    openRRColSummary: [],
    openRRColDetail: [],
    showOpenLCModal: false,
    openLcSummaryData: [],
    openLcSummaryColumns: [],
    openLcDetailColumns: [],
  });
  const openLCSummaryColumns = [
    { key: "branchCode", label: "Branch", width: 80 },
    { key: "lcNo", label: "LC No.", width: 120 },
    { key: "lcDate", label: "LC Date", width: 110 },
    { key: "importationDate", label: "Importation Date", width: 120 },
    { key: "importEntryNo", label: "Import Entry No.", width: 130 },
    { key: "awbBlNo", label: "AWB/BL No.", width: 130 },
    { key: "vendCode", label: "Broker Code", width: 110 },
    { key: "vendName", label: "Broker Name", width: 220 },
    { key: "forwarderCode", label: "Forwarder Code", width: 120 },
    { key: "forwarderName", label: "Forwarder Name", width: 220 },
    { key: "invoiceCount", label: "Invoices", width: 80 },
    { key: "totalBillAmount", label: "Bill Amount", width: 130, type: "amount" },
    { key: "totalVatAmount", label: "VAT Amount", width: 130, type: "amount" },
    { key: "totalNetAmount", label: "Net Amount", width: 130, type: "amount" },
  ];
  const openLCDetailColumns = [
    { key: "lcNo", label: "LC No.", width: 120 },
    { key: "lcLineNo", label: "Line", width: 70 },
    { key: "billCode", label: "Bill Code", width: 100 },
    { key: "billDesc", label: "Bill Description", width: 220 },
    { key: "vendCode", label: "Payee Code", width: 110 },
    { key: "vendName", label: "Payee Name", width: 220 },
    { key: "siNo", label: "Invoice No.", width: 120 },
    { key: "siDate", label: "Invoice Date", width: 110 },
    { key: "billAmt", label: "Bill Amount", width: 130, type: "amount" },
    { key: "vatCode", label: "VAT Code", width: 100 },
    { key: "vatAmount", label: "VAT Amount", width: 130, type: "amount" },
    { key: "netAmount", label: "Net Amount", width: 130, type: "amount" },
    { key: "debitAcct", label: "DR Account", width: 120 },
    { key: "rcCode", label: "RC Code", width: 100 },
    { key: "rcName", label: "RC Name", width: 200 },
  ];
  const [showInvoiceAddDropdown, setShowInvoiceAddDropdown] = useState(false);


  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };


  const getDefaultAdvancesAccount = async () => {
    if (defaultAdvancesAccountRef.current) {
      return defaultAdvancesAccountRef.current;
    }

    try {
      const { data: result } = await apiClient.post("/lookupCOA", {
        PARAMS: JSON.stringify({
          search: "ADGL",
          page: 1,
          pageSize: 1,
        }),
      });
      const rawData = result?.data?.[0]?.result || "[]";
      const accounts = Array.isArray(rawData) ? rawData : JSON.parse(rawData);
      const firstAccount = Array.isArray(accounts) ? accounts[0] : accounts;
      const defaultAccount = {
        acctCode: firstAccount?.acctCode || "",
        acctName: firstAccount?.acctName || "",
      };

      defaultAdvancesAccountRef.current = defaultAccount;
      return defaultAccount;
    } catch (error) {
      console.error("Could not fetch default advances account:", error);
      return { acctCode: "", acctName: "" };
    }
  };


  const getDefaultAdvancesAcctCode = async () => {
    const defaultAccount = await getDefaultAdvancesAccount();
    return defaultAccount?.acctCode || "";
  };

  const {
    // Document info
    documentName,
    documentID,
    documentStatus,
    documentNo,
    status,
    userCode,
    // Tabs & loading
    activeTab,
    GLactiveTab,
    isLoading,
    showSpinner,
    // UI states / disable flags
    isDocNoDisabled,
    triggerGLEntries,
    // Currency
    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,
    // Transaction Header
    branchCode,
    branchName,
    vendName,
    vendCode,
    currencyCode,
    currencyName,
    currencyRate,
    apTypes,
    selectedApType,
    apAccountName,
    apAccountCode,
    header,
    detailRows,
    detailRowsGL,
    totalDebit,
    totalCredit,
    fieldVisibility,
    // Contexts
    modalContext,
    selectedRowIndex,
    accountModalSource,
    showAllTranDocNo,
    // Modals
    showAccountModal,
    showRcModal,
    showVatModal,
    showAtcModal,
    showSlModal,
    showPaytermModal,
    currencyModalOpen,
    branchModalOpen,
    payeeModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostingModal,
  } = state;
  const amountRefs = useRef([]);
  const advanceAmountRefs = useRef([]);
  const advanceVatRefs = useRef([]);
  const advanceAtcRefs = useRef([]);

  useEffect(() => {
    if (!refsLoaded || documentID || documentNo) return;
    updateState({
      branchCode: assignedUserBranch.branchCode,
      branchName: assignedUserBranch.branchName,
      userCode: currentUserRow?.userCode || "",
    });
  }, [refsLoaded, currentUserRow?.userCode, assignedUserBranch.branchCode, assignedUserBranch.branchName, documentID, documentNo]);

  // Document code constants
  const docType = docTypes.APV;
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "Transaction";

  // Document status and access rules
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
  const isFormDisabled = isViewDocumentUrl || ["POSTED", "FINALIZED", "CANCELLED", "CLOSED"].includes(normalizedStatus);

  // AP type controls which transaction sections are available.
  useEffect(() => {
    const shouldHideInvoiceDetails = isNonPurchasesApType(selectedApType);
    updateState({
      fieldVisibility: {
        ...fieldVisibility,
        invoiceDetails: !shouldHideInvoiceDetails,
      },
    });
  }, [selectedApType]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "F1") return;
      event.preventDefault();
      updateState({ showAllTranDocNo: true });
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // APV REFERENCE WORKFLOWS
  // RR/JO/PCV/PO Advance/LC lookup definitions and response normalization.

  const openRRLookupColumns = [
    { key: "type", label: "Type", width: 60 },
    { key: "referenceSource", label: "Source", width: 70 },

    { key: "branchCode", label: "BC", width: 60 },
    { key: "rrNo", label: "RR No", width: 110 },
    { key: "rrDate", label: "RR/PO Date", width: 100 },
    { key: "poNo", label: "PO No", width: 110 },

    { key: "vendCode", label: "Payee Code", width: 100 },
    { key: "vendName", label: "Payee Name", width: 200 },

    { key: "siNo", label: "SI No", width: 110 },
    { key: "siDate", label: "SI Date", width: 100 },

    {
      key: "siAmount",
      label: "SI Amt",
      width: 110,
      type: "amount",
    },

    { key: "drAcct", label: "DR Account", width: 90 },
    { key: "rcCode", label: "Responsibility Code", width: 90 },

    { key: "vatCode", label: "VAT Code", width: 90 },
    { key: "vatDesc", label: "VAT Desc", width: 200 },

    {
      key: "vatAmount",
      label: "VAT Amount",
      width: 110,
      type: "amount",
    },
  ];
  const openPCVLookupColumns = [
    { key: "type", label: "Type", width: 70 },
    { key: "branchCode", label: "Branch", width: 80 },
    { key: "pcvNo", label: "PCV No.", width: 120 },
    { key: "pcvDate", label: "PCV Date", width: 110 },
    {
      key: "pcvAmount",
      label: "PCV Amount",
      width: 130,
      type: "amount",
    },
    { key: "drAcct", label: "DR Account", width: 120 },
    { key: "rcCode", label: "RC Code", width: 100 },
    { key: "rcName", label: "RC Name", width: 200 },
  ];
  const openPOAPVLookupColumns = [
    { key: "branchCode", label: "Branch", width: 80 },
    { key: "docType", label: "Document Code", width: 110 },
    { key: "poJoNo", label: "PO / JO No", width: 120 },
    { key: "poJoDate", label: "PO / JO Date", width: 110 },
    { key: "vendCode", label: "Payee Code", width: 110 },
    { key: "vendName", label: "Payee Name", width: 220 },
    { key: "payterm", label: "Payterm", width: 180 },
    { key: "currCode", label: "Currency", width: 90 },
    { key: "poAmount", label: "PO / JO Amount", width: 130, type: "amount" },
    { key: "vatCode", label: "VAT Code", width: 100 },
    { key: "vatAmount", label: "VAT Amount", width: 130, type: "amount" },
  ];
  const getPOAdvanceBalance = (row = {}) => {
    if (row.advanceBalance !== undefined && row.advanceBalance !== null) return Math.max(parseFormattedNumber(row.advanceBalance) || 0, 0);
    if (row.originalPoAmount !== undefined && row.originalPoAmount !== null) {
      return Math.max((parseFormattedNumber(row.originalPoAmount) || 0) - (parseFormattedNumber(row.appliedAdvAmount) || 0), 0);
    }
    return Math.max(parseFormattedNumber(row.poAmount) || 0, 0);
  };
    const fetchAPVReferenceSummary = async ({
    apvtranType = selectedApType,
    referenceType = "",
    branchCode: overrideBranchCode,
    vendCode: overrideVendCode,
    extraPayload = {},
  } = {}) => {
    const lookupBranchCode = String(overrideBranchCode ?? branchCode ?? "").trim();
    const lookupVendCode = String(overrideVendCode ?? vendCode ?? "").trim();
    const normalizedApType = String(apvtranType || "")
      .trim()
      .toUpperCase();
    const normalizedReferenceType = String(referenceType || "")
      .trim()
      .toUpperCase();
    const response = await postRequest("apv/reference-summary", {
      json_data: {
        apvtranType: normalizedApType,
        referenceType: normalizedReferenceType,
        branchCode: lookupBranchCode,
        vendCode: lookupVendCode,
        ...extraPayload,
      },
    });
    return extractOpenRRResponseRows(response);
  };


  const handleOpenReferencePOAdvance = async (overrides = {}) => {
    setShowInvoiceAddDropdown(false);
    const lookupVendCode = String(overrides.vendCode ?? vendCode ?? "").trim();
    const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();
    if (!lookupVendCode) {
      updateState({
        payeeModalOpen: true,
        modalContext: "openPOAdvance",
      });
      return;
    }

    try {
      updateState({ isLoading: true, showSpinner: true });
      const rawRows = (
        await fetchAPVReferenceSummary({
          apvtranType: "APV03",
          referenceType: "PO",
          branchCode: lookupBranchCode,
          vendCode: lookupVendCode,
        })
      ).filter((row) => {
        const rowBranchCode = String(row.branchCode ?? "").trim();
        const rowVendCode = String(row.vendCode ?? "").trim();
        return (!lookupBranchCode || rowBranchCode === lookupBranchCode) && (!lookupVendCode || rowVendCode === lookupVendCode);
      });
      const normalizedRows = rawRows.map((row, index) => ({
        ...row,
        groupId: row.groupId || [row.branchCode, row.docType, row.poJoNo, index + 1].filter(Boolean).join("-"),
        type: row.docType || "PO",
        poNo: row.poJoNo || "",
        poDate: row.poJoDate || "",
        siAmount: row.poAmount || 0,
        amount: row.poAmount || 0,
        advanceBalance: getPOAdvanceBalance(row),
        vatAmount: row.vatAmount || 0,
        vatCode: row.vatCode || "",
      }));
      if (normalizedRows.length === 0) {
        useSwalErrorAlert("APV Advances Reference", "No PO or JO with advance payment terms found for this supplier.");
        return;
      }

      updateState({
        globalLookupRow: normalizedRows,
        globalLookupHeader: openPOAPVLookupColumns,
        globalLookupTitle: "Open PO / JO References",
        globalLookupBtnCaption: "Get Selected PO / JO",
        showRRRefModal: true,
        modalContext: "openPOAdvance",
      });
    } catch (error) {
      console.error("Failed to fetch PO APV Advances:", error);
      useSwalErrorAlert(
        "APV Advances Reference",
        error?.response?.data?.message || error?.response?.data?.error || error?.message || "Error in fetching PO advances reference.",
      );
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };


  const handleOpenReferenceLCImportation = async () => {
    setShowInvoiceAddDropdown(false);
    const lookupBranchCode = String(branchCode || "").trim();

    try {
      updateState({
        isLoading: true,
        showSpinner: true,
      });
      const rawRows = await fetchAPVReferenceSummary({
        apvtranType: "APV07",
        referenceType: "LC",
        branchCode: lookupBranchCode,
        vendCode: "",
      });
      if (!rawRows.length) {
        useSwalErrorAlert("LC Importation Reference", "No open LC Importation reference found.");
        return;
      }

      updateState({
        openLcSummaryData: rawRows,
        openLcSummaryColumns: openLCSummaryColumns,
        openLcDetailColumns: openLCDetailColumns,
        showOpenLCModal: true,
      });
    } catch (error) {
      console.error("Failed to fetch LC Summary:", error);

      useSwalErrorAlert("LC Importation Reference", error?.response?.data?.message || error?.message || "Unable to fetch LC references.");
    } finally {
      updateState({
        isLoading: false,
        showSpinner: false,
      });
    }
  };


  const handleCloseLCModal = async (selection) => {
    const selectedDetails = Array.isArray(selection?.details) ? selection.details : [];
    if (!selectedDetails.length) {
      updateState({
        showOpenLCModal: false,
      });
      return;
    }

    updateState({
      isLoading: true,
      showSpinner: true,
      showOpenLCModal: false,
    });

    try {
      const foundAtcCode = vendName?.atcCode || "";
      const masterAtcRow = foundAtcCode ? await useTopATCRow(foundAtcCode) : null;
      const mappedRows = await Promise.all(
        selectedDetails.map(async (item) => {
          const amount = parseFormattedNumber(item.billAmt ?? item.siAmount ?? item.amount ?? 0) || 0;
          const vatAmount = parseFormattedNumber(item.vatAmount ?? item.vatAmt ?? 0) || 0;
          const netAmount = parseFormattedNumber(item.netAmount ?? item.netAmt ?? amount - vatAmount) || 0;
          const atcAmount = foundAtcCode ? await useTopATCAmount(foundAtcCode, netAmount) : 0;
          return {
            lnNo: "",
            invType: "LC",
            rrNo: "",
            poNo: item.lcNo || "",
            siNo: item.siNo || "",
            siDate: useformatToDatev2(item.siDate || item.lcDate) || useGetCurrentDayV2(),
            amount: formatNumber(amount),
            siAmount: formatNumber(amount),
            debitAcct: item.debitAcct || item.drAcct || "",
            rcCode: item.rcCode || "",
            rcName: item.rcName || "",
            sltypeCode: "SU",
            slCode: item.vendCode || "",
            slName: item.vendName || "",
            vatCode: item.vatCode || "",
            vatName: item.vatName || "",
            vatAmount: formatNumber(vatAmount),
            atcCode: foundAtcCode,
            atcName: masterAtcRow?.atcName || "",
            atcAmount: formatNumber(atcAmount),
            advpoNo: "",
            advpoAmount: "0.00",
            advpoVatAmount: "0.00",
            advpoAtcAmount: "0.00",
            advAcct: "",
            paytermCode: "",
            dueDate: useGetCurrentDayV2(),
            remarks: item.remarks || "",
            recRc: item.rcCode ? "Y" : "N",
            recSl: "Y",
            sourceId: item.sourceId || item.lcId || "",
            lcId: item.lcId || "",
            lcNo: item.lcNo || "",
          };
        }),
      );
      const updatedRows = [...detailRows, ...mappedRows];
      updateInvoiceDetails(updatedRows, {
        showOpenLCModal: false,
        openLcSummaryData: [],
        openLcSummaryColumns: [],
        openLcDetailColumns: [],
        triggerGLEntries: false,
      });
    } catch (error) {
      console.error("Failed to apply LC details:", error);

      useSwalErrorAlert("LC Importation", error?.message || "Unable to apply selected LC details.");
    } finally {
      updateState({
        isLoading: false,
        showSpinner: false,
      });
    }
  };


  const rrAmountKeys = ["balanceAmount", "balance", "balAmount", "openBalance", "remainingAmount", "siAmount", "amount", "rrAmount", "joAmount", "itemAmount", "grossAmount", "netAmount", "totalAmount", "extendedAmount"];
  const rrVatAmountKeys = ["vatAmount", "vatAmt"];
  const rrQuantityKeys = ["qty", "quantity", "recQty"];
  const rrUnitCostKeys = ["unitCost", "cost", "price"];
  const rrCategoryKeys = ["categCode", "categoryCode", "category", "categ_code", "CATEG_CODE", "CATEGORY_CODE", "msCategCode", "rmcategCode", "rmCategCode", "fgCategCode"];


  const getLookupNumber = (row, keys) => {
    const value = keys.map((key) => row?.[key]).find((item) => item !== undefined && item !== null && item !== "");
    const parsed = parseFormattedNumber(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };


  const getRRLineAmount = (row) => {
    const explicitAmount = getLookupNumber(row, rrAmountKeys);
    if (explicitAmount) return explicitAmount;
    const quantity = getLookupNumber(row, rrQuantityKeys);
    const unitCost = getLookupNumber(row, rrUnitCostKeys);
    return quantity && unitCost ? quantity * unitCost : 0;
  };

  const getLookupText = (row, keys) => {
    const value = keys.map((key) => row?.[key]).find((item) => item !== undefined && item !== null && String(item).trim() !== "");
    return String(value ?? "").trim();
  };


  const getReferenceCategoryCode = (row = {}) => getLookupText(row, rrCategoryKeys);


  const getBackendReferenceId = (value) => {
    const id = String(value ?? "").trim();
    return /^\d+$/.test(id) ? id : "";
  };


  const getRRReferenceBackendIds = (item) =>
    [
      item?.rrId,
      item?.rrHdId,
      item?.rrHDId,
      item?.rrhdID,
      item?.rrID,
      item?.rrhdId,
      item?.RR_ID,
      item?.RRHD_ID,
      item?.RRHDID,
      item?.sourceId,
      item?.id,
      item?.groupId,
    ]
      .map((value) => getBackendReferenceId(value))
      .filter((value, index, values) => value && values.indexOf(value) === index);


  const handleOpenPayeeLookup = (context = "") => {
    updateState({
      payeeModalOpen: true,
      modalContext: context,
    });
  };


  const fetchRRReferenceDetails = async (item) => {
    const referenceType = String(item.type || item.invType || item.rrSource || "")
      .trim()
      .toUpperCase();
    const referenceSource = String(item.referenceSource || item.refSource || "RR")
      .trim()
      .toUpperCase();
    if (referenceType === "JO") {
      return [];
    }

    try {
      if (referenceSource === "PO") {
        const detailPayload = {
          json_data: {
            poId: item.poId || "",
            poNo: item.poNo || "",
            branchCode: item.branchCode || branchCode || "",
            vendCode: item.vendCode || vendCode || "",
            invType: referenceType,
            type: referenceType,
            referenceSource: "PO",
          },
        };
        const response = await postRequest("getAPVPO_OpenDetail", detailPayload);
        return extractOpenRRResponseRows(response).map((row, index) =>
          mapOpenRRRow(
            {
              ...row,
              type: row.type || referenceType,
              invType: row.invType || referenceType,
              referenceSource: "PO",
            },
            index,
          ),
        );
      }

      const hasReferenceNo = Boolean(String(item.rrNo || item.poNo || "").trim());
      const backendIds = getRRReferenceBackendIds(item);
      if (backendIds.length === 0 && !hasReferenceNo) {
        return [];
      }

      const selectedIds = backendIds.join(",");
      const primaryReferenceId = backendIds[0] || "";
      const detailPayload = {
        json_data: {
          selectedIds,
          selectedId: selectedIds,
          rrId: primaryReferenceId,
          rrHdId: primaryReferenceId,
          rrNo: item.rrNo || "",
          poNo: item.poNo || "",
          branchCode: item.branchCode || branchCode || "",
          vendCode: item.vendCode || vendCode || "",
          invType: referenceType,
          type: referenceType,
          referenceSource: "RR",
        },
      };
      const response = await postRequest("getAPVRR_OpenDetail", detailPayload);

      const detailRows = extractOpenRRResponseRows(response).map((row, index) => mapOpenRRRow(row, index));

      return detailRows;
    } catch (error) {
      console.warn("Unable to fetch APV reference details:", error);
      return [];
    }
  };


  const enrichRRReferenceItem = async (item) => {
    const referenceSource = String(item.referenceSource || "RR")
      .trim()
      .toUpperCase();
    if (referenceSource === "PO") {
      return item;
    }

    const detailRows = await fetchRRReferenceDetails(item);
    if (detailRows.length === 0) {
      return item;
    }

    const detailAmount = detailRows.reduce((total, detailRow) => total + getRRLineAmount(detailRow), 0);
    const detailVatAmount = detailRows.reduce((total, detailRow) => total + getLookupNumber(detailRow, rrVatAmountKeys), 0);
    const firstDetail = detailRows[0] || {};
    return {
      ...item,

      ...Object.fromEntries(
        Object.entries({
          drAcct: item.drAcct || item.debitAcct || firstDetail.drAcct || firstDetail.debitAcct,
          debitAcct: item.debitAcct || item.drAcct || firstDetail.debitAcct || firstDetail.drAcct,
          rcCode: item.rcCode || firstDetail.rcCode,
          rcName: item.rcName || firstDetail.rcName,
          vatCode: item.vatCode || firstDetail.vatCode,
          vatDesc: item.vatDesc || firstDetail.vatDesc,
          categCode: item.categCode || firstDetail.categCode,
          siNo: item.siNo || firstDetail.siNo,
          siDate: item.siDate || firstDetail.siDate,
          paytermCode: item.paytermCode || firstDetail.paytermCode,
          terms: item.terms || firstDetail.terms,
          dueDate: item.dueDate || firstDetail.dueDate,
          remarks: item.remarks || firstDetail.remarks,
          advanceApvId: firstDetail.advanceApvId || item.advanceApvId || "",
          advanceApvNo: firstDetail.advanceApvNo || item.advanceApvNo || "",
          advanceCvId: firstDetail.advanceCvId || item.advanceCvId || "",
          advancePaid: firstDetail.advancePaid ?? item.advancePaid ?? false,
          advpoNo: firstDetail.advpoNo || item.advpoNo || firstDetail.poNo || item.poNo || "",
          advAcct: firstDetail.advAcct || item.advAcct || "",
          advanceVatCode: firstDetail.advanceVatCode || item.advanceVatCode || "",
          advanceAtcCode: firstDetail.advanceAtcCode || item.advanceAtcCode || "",
        }).filter(([, value]) => value !== undefined && value !== null && value !== ""),
      ),
      siAmount: detailAmount || getRRLineAmount(item),
      amount: detailAmount || getRRLineAmount(item),
      vatAmount: detailVatAmount || getLookupNumber(item, rrVatAmountKeys),
      advanceBalance: parseFormattedNumber(firstDetail.advanceBalance ?? item.advanceBalance ?? 0) || 0,
      advanceVatBalance: parseFormattedNumber(firstDetail.advanceVatBalance ?? item.advanceVatBalance ?? 0) || 0,
      advanceEwtBalance: parseFormattedNumber(firstDetail.advanceEwtBalance ?? item.advanceEwtBalance ?? 0) || 0,
      rrDetailRows: detailRows,
    };
  };


  const extractOpenRRRows = (value) => {
    if (!value) return [];
    if (typeof value === "string") {
      try {
        return extractOpenRRRows(JSON.parse(value));
      } catch {
        return [];
      }
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => extractOpenRRRows(item));
    }

    if (value?.result) return extractOpenRRRows(value.result);
    if (Array.isArray(value?.data)) {
      return value.data.flatMap((item) => extractOpenRRRows(item));
    }

    if (value?.data) return extractOpenRRRows(value.data);
    if (value?.rows) return extractOpenRRRows(value.rows);
    if (value?.dt1) return extractOpenRRRows(value.dt1);
    if (typeof value === "object" && Object.keys(value).length > 0) {
      return [value];
    }

    return [];
  };


  const extractOpenRRResponseRows = (response) => {
    return extractOpenRRRows(response);
  };


  const mapOpenRRRow = (row, index) => {
    const type = String(row.type || row.invType || "").trim().toUpperCase();
    const referenceSource = String(row.referenceSource || (type === "JO" ? "JO" : "RR")).trim().toUpperCase();
    let menuCode = String(row.menuCode || "").trim().toUpperCase();
    if (!menuCode) {
      switch (type) {
        case "FG":
        case "FGRR":
          menuCode = "FG0020";
          break;

        case "MS":
        case "MSRR":
          menuCode = "MS0190";
          break;

        case "RM":
        case "RMRR":
          menuCode = "RM0320";
          break;

        default:
          menuCode = "";
          break;
      }
    }
    const rrNo = row.rrNo || row.RR_NO || row.joNo || row.docNo || row.tranNo || "";
    const rrId = row.rrId || row.rrHdId || row.rrHDId || row.RR_ID || row.RRHD_ID || row.RRHDID || row.joId || row.JO_ID || "";
    const poId = row.poId || row.PO_ID || "";
    const poNo = row.poNo || row.PO_NO || row.poJoNo || row.joNo || "";
    const rrDate = row.rrDate || row.poDate || row.poJoDate || row.joDate || "";
    const poDate = row.poDate || row.poJoDate || row.rrDate || "";
    const siNo = row.siNo || row.drNo || "";
    const siDate = row.siDate || row.rrDate || row.poDate || row.joDate || "";
    const siAmount = row.siAmount ?? row.amount ?? row.rrAmount ?? row.joAmount ?? row.itemAmount ?? row.netAmount ?? row.poAmount ?? 0;
    const drAcct = row.drAcct || row.debitAcct || row.expAcct || row.expacctCode || row.expAcctCode || row.EXPACCT_CODE || row.invAcct || row.invAcctCode || row.INVACCT_CODE || row.acctCode || row.ACCT_CODE || "";
    const categCode = getReferenceCategoryCode(row);
    const generatedGroupId = [referenceSource, menuCode, poId, rrId, rrNo, poNo, row.branchCode, index + 1].filter((value) => value !== undefined && value !== null && String(value).trim() !== "").join("-") || String(index + 1);
    return {
      ...row,
      type,
      invType: type,
      menuCode,
      referenceSource,
      rrSource: type,
      groupId: row.groupId || row.id || generatedGroupId,
      sourceId: row.sourceId || rrId || poId || row.joId || "",
      rrId,
      poId,
      branchCode: row.branchCode || "",
      rrNo,
      poNo,
      rrDate,
      poDate,
      rrTranType: row.rrTranType || row.msrrtranType || row.fgrrtranType || row.rmrrtranType || row.verrTranType || "",
      vendCode: row.vendCode || "",
      vendName: row.vendName || "",
      siNo,
      siDate,
      siAmount,
      amount: siAmount,
      drAcct,
      debitAcct: drAcct,
      rcCode: row.rcCode || "",
      rcName: row.rcName || "",
      vatCode: row.vatCode || "",
      vatDesc: row.vatDesc || row.vatName || "",
      vatAmount: row.vatAmount ?? row.vatAmt ?? 0,
      categCode,
      remarks: row.remarks || row.particular || "",
    };
  };

  // LIFECYCLE EFFECTS AND DERIVED TOTALS
  useEffect(() => {
    if (triggerGLEntries) {
      handleActivityOption("GenerateGL").then(() => {
        updateState({ triggerGLEntries: false });
      });
    }
  }, [triggerGLEntries]);

  useEffect(() => {
    if (vendName?.currCode && detailRows.length > 0) {
      const hasCurrencyChange = detailRows.some((row) => row.currency !== vendName.currCode);
      if (!hasCurrencyChange) return;

      const updatedRows = detailRows.map((row) => ({
        ...row,
        currency: vendName.currCode,
      }));
      updateInvoiceDetails(updatedRows);
    }
  }, [vendName?.currCode]);

  useEffect(() => {
    const debitSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    updateState({
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
    });
  }, [detailRowsGL]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!documentID });
  }, [documentID]);

  useEffect(() => {
    handleReset();
  }, []);

  // Currency mode effect
  useEffect(() => {
    if (glCurrMode && glCurrDefault && currencyCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currencyCode);
    }
  }, [glCurrMode, glCurrDefault, currencyCode]);

  // Amount, due-date, and currency helpers


  const updateTotalsDisplay = (invoice, vat, atc, payable) => {
    const totalInvoiceElement = document.getElementById("totalInvoiceAmount");
    const totalVATElement = document.getElementById("totalVATAmount");
    const totalATCElement = document.getElementById("totalATCAmount");
    const totalPayableElement = document.getElementById("totalPayableAmount");
    if (totalInvoiceElement) totalInvoiceElement.textContent = formatNumber(invoice);
    if (totalVATElement) totalVATElement.textContent = formatNumber(vat);
    if (totalATCElement) totalATCElement.textContent = formatNumber(atc);
    if (totalPayableElement) totalPayableElement.textContent = formatNumber(payable);
  };


  const updateTotals = (rows) => {
    let totalInvoice = 0;
    let totalVAT = 0;
    let totalATC = 0;
    let totalPayable = 0;

    rows.forEach((row) => {
      const invoiceAmount = parseFormattedNumber(row.siAmount || row.amount || 0) || 0;
      const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
      const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;

      totalInvoice += invoiceAmount;
      totalVAT += vatAmount;
      totalATC += atcAmount;
    });

    totalPayable = totalInvoice - totalATC;
    updateTotalsDisplay(totalInvoice, totalVAT, totalATC, totalPayable);
  };


  const calculateDueDate = (startDate, daysDue) => {
    const parsedDaysDue = Number.parseInt(daysDue, 10);
    if (!startDate || Number.isNaN(parsedDaysDue)) return "";

    try {
      const rawDate = String(startDate).trim();
      let year;
      let month;
      let day;
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(rawDate)) {
        [year, month, day] = rawDate.split("-").map(Number);
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
        const parts = rawDate.split("/").map(Number);
        [month, day, year] = parts;
      } else {
        const fallbackDate = new Date(rawDate);
        if (Number.isNaN(fallbackDate.getTime())) return "";
        year = fallbackDate.getFullYear();
        month = fallbackDate.getMonth() + 1;
        day = fallbackDate.getDate();
      }

      const date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return "";
      }

      date.setDate(date.getDate() + parsedDaysDue);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${mm}/${dd}/${yyyy}`;
    } catch (error) {
      console.error("Error calculating due date:", error);
      return "";
    }
  };


  const getPaytermDaysDue = (paytermData) => {
    const rawDays = paytermData?.daysDue ?? paytermData?.dueDays ?? paytermData?.paytermDays ?? getPaytermCode(paytermData) ?? getPaytermName(paytermData) ?? "";
    const matchedDays = String(rawDays).match(/\d+/);
    return matchedDays ? matchedDays[0] : "";
  };


  const getPaytermCode = (paytermData) => paytermData?.paytermCode ?? "";


  const getPaytermName = (paytermData) => paytermData?.paytermName ?? "";


  const recalculateDueDatesByApvDate = async (apvDate) => {
    const updatedRows = await Promise.all(
      detailRows.map(async (row) => {
        if (!row.paytermCode) return row;
        const paytermData = await useTopPayTermRow(row.paytermCode);
        const daysDue = getPaytermDaysDue(paytermData);
        return {
          ...row,
          dueDate: calculateDueDate(apvDate, daysDue),
        };
      }),
    );
    updateInvoiceDetails(updatedRows, {
      header: {
        ...header,
        apvDate,
      },
    });
  };

  // Initial company/document configuration loaders


  const loadCompanyData = async () => {
    const hsOption = await useTopHSOption();
    if (hsOption) {
      updateState({
        glCurrMode: hsOption.glCurrMode,
        glCurrDefault: hsOption.glCurrDefault,
        currencyCode: hsOption.glCurrDefault,
        glCurrGlobal1: hsOption.glCurrGlobal1,
        glCurrGlobal2: hsOption.glCurrGlobal2,
        glCurrGlobal3: hsOption.glCurrGlobal3,
      });
      const curr = await useTopCurrencyRow(hsOption.glCurrDefault);
      if (curr) {
        updateState({
          currencyName: curr.currName,
          currencyRate: formatNumber(1, 6),
        });
      }
    }
  };


  const loadCurrencyMode = (mode = glCurrMode, defaultCurr = glCurrDefault, curr = currencyCode) => {
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

  // AP type lookup


    const fetchApTypes = async () => {
    try {
      const payload = {
        json_data: {
          dropdownColumn: "APVTRAN_TYPE",
          docCode: "APV",
        },
      };
      const response = await postRequest("getHSDropdown", JSON.stringify(payload));
      if (response.success) {
        const parsedResult = JSON.parse(response.data[0].result);
        const seenCodes = new Set();
        const result = (Array.isArray(parsedResult) ? parsedResult : [])
          .map((type) => ({
            dropdownCode: String(type.DROPDOWN_CODE || "").trim(),
            dropdownName: String(type.DROPDOWN_NAME || "").trim(),
          }))
          .filter((type) => {
            if (!type.dropdownCode || seenCodes.has(type.dropdownCode)) return false;
            seenCodes.add(type.dropdownCode);
            return true;
          });
        const updates = { apTypes: result };
        if (result.length > 0) {
          updates.selectedApType = result[0].dropdownCode;
        }

        updateState(updates);
      }
    } catch (error) {
      console.error("Error fetching AP Types:", error);
    }
  };

  // RESET, RETRIEVAL, AND HISTORY
  // This is the same lifecycle order used by SVI.jsx.


  const handleReset = () => {
    loadDocControl();
    loadCompanyData();
    fetchApTypes();
    updateState({
      header: {
        apvDate: useGetCurrentDayV2(),
        remarks: "",
        refDocNo1: "",
        refDocNo2: "",
        fromDate: null,
        toDate: null,
      },
      branchCode: assignedUserBranch.branchCode,
      branchName: assignedUserBranch.branchName,
      currCode: companyInfo?.currCode || "",
      currName: companyInfo?.currName || "",
      currRate: formatNumber(companyInfo?.currRate || 1, 6),
      apAccountName: "",
      apAccountCode: "",
      vendName: null,
      vendCode: null,
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      documentStatus: "",
      status: "OPEN",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
    });

    updateTotalsDisplay(0, 0, 0, 0);
  };


  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotals([]);
    };
    updateState({ isLoading: true, showSpinner: true });

    try {
      const data = await useFetchTranData(documentNo, branchCode, docType, "apvNo", direction);

      if (!data?.apvId) {
        console.warn("No apvId found in data:", data);
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      const apvDateForHeader = data.apvDate ? useformatToDatev2(data.apvDate) : "";

      const retrievedApType = data.apvtranType || data.apvType || "APV01";
      const defaultAdvancesAcctCode = ["APV01", "APV03"].includes(retrievedApType) ? await getDefaultAdvancesAcctCode() : "";
      const retrievedDetailRows = (data.dt1 || []).map((item) => {
        const formattedSiDate = item.siDate ? useformatToDatev2(item.siDate) : "";
        const formattedDueDate = item.dueDate ? useformatToDatev2(item.dueDate) : "";
        return {
          ...item,
          rrNo: item.rrNo || item.pcvNo || item.msrrNo || "",
          pcvNo: item.pcvNo || item.rrNo || "",
          pcvId: item.pcvId || "",
          sourceId: item.sourceId || "",
          apAdvId: item.apAdvId || "",
          autoAdv: retrievedApType === "APV01" ? item.autoAdv || "Y" : "N",
          poNo: item.poNo || item.joNo || "",
          amount: formatNumber(item.amount || 0),
          currency: data.currCode || item.currency || "",
          currRate: formatNumber(item.currRate),
          siAmount: formatNumber(item.siAmount),
          discRate: formatNumber(item.discRate),
          unappliedAmount: formatNumber(item.unappliedAmount),
          netDisc: formatNumber(item.netDisc),
          vatAmount: formatNumber(item.vatAmount),
          atcAmount: formatNumber(item.atcAmount),
          apvAmount: formatNumber(item.apvAmount),
          advAcct: item.advAcct || item.advanceAcct || defaultAdvancesAcctCode,
          advpoNo: item.advpoNo || item.appliedAdvancesPo || "",
          advpoAmount: formatNumber(item.advpoAmount || item.appliedAdvancesAmt || 0),
          advpoVatAmount: formatNumber(item.advpoVatAmount || 0),
          advpoAtcAmount: formatNumber(item.advpoAtcAmount || 0),
          siDate: formattedSiDate,
          dueDate: formattedDueDate,
          rcName: item.rcName || "",
          recRc: item.recRc || "N",
          recSl: item.recSl || "N",
        };
      });

      const formattedGLRows = (data.dt2 || []).map((glRow) => {
        return {
          ...glRow,
          debit: formatNumber(glRow.debit),
          credit: formatNumber(glRow.credit),
          debitFx1: formatNumber(glRow.debitFx1),
          creditFx1: formatNumber(glRow.creditFx1),
          debitFx2: formatNumber(glRow.debitFx2),
          creditFx2: formatNumber(glRow.creditFx2),
          slrefDate: normalizeSlrefDate(glRow.slrefDate),
        };
      });

      const vendorData = {
        vendCode: data.vendCode || "",
        vendName: data.vendName || "",
        currCode: data.currCode || "",
        tin: data.tin || "",
      };

      let apAccountCode = "";
      let apAccountName = "";
      if (data.apAcct) {
        apAccountCode = data.apAcct;
      } else if (data.acctCode) {
        apAccountCode = data.acctCode;
      } else if (data.apAccountCode) {
        apAccountCode = data.apAccountCode;
      }

      if (data.apAccountName) {
        apAccountName = data.apAccountName;
      } else if (data.acctName) {
        apAccountName = data.acctName;
      }

      if (apAccountCode && !apAccountName) {
        try {
          const accountResponse = await fetchData("getCOA", {
            ACCT_CODE: apAccountCode,
          });
          if (accountResponse?.success) {
            const accountData = JSON.parse(accountResponse.data[0]?.result || "[]");
            if (accountData.length > 0) {
              apAccountName = accountData[0]?.acctName || "";
            }
          }
        } catch (error) {
          console.warn("Could not fetch AP account name:", error);
        }
      }


      const stateUpdates = {
        documentStatus: data.apvStatus || "",
        status: data.docStatus,
        documentID: data.apvId,
        documentNo: data.apvNo,
        branchCode: data.branchCode,
        header: {
          ...header,
          apvDate: apvDateForHeader,
          remarks: data.remarks || "",
          refDocNo1: data.refapvNo1 || data.refDocNo1 || "",
          refDocNo2: data.refapvNo2 || data.refDocNo2 || "",
        },
        selectedApType: retrievedApType,
        vendCode: data.vendCode,
        vendName: vendorData,
        currencyCode: data.currCode,
        currencyName: data.currName,
        currencyRate: formatNumber(data.currRate || 1, 6),
        apAccountCode: apAccountCode,
        apAccountName: apAccountName,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      };

      updateState(stateUpdates);

      updateTotals(retrievedDetailRows);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error.message || "Failed to fetch transaction data",
      });
      resetState();
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  // Transaction history and view-document retrieval
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
      cleanUrl();
    },
    [fetchTranData, cleanUrl],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("apvNo");
    const branchCode = params.get("branchCode");
    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);


  const fetchRCNameByCode = async (rcCode) => {
    if (!rcCode) return "";

    try {
      const response = await fetchData("getRCMast", {
        RC_CODE: rcCode,
      });
      if (!response?.success) return "";
      let rcData = response.data || [];
      if (rcData?.[0]?.result) {
        rcData = JSON.parse(rcData[0].result || "[]");
      }

      const row = Array.isArray(rcData) ? rcData[0] : rcData;
      return row?.rcName || "";
    } catch (error) {
      console.error("Could not fetch RC name:", error);
      return "";
    }
  };


  const handleDocumentNoBlur = () => {
    if (!documentID && documentNo && branchCode) {
      fetchTranData(documentNo, branchCode);
    } else {
    }
  };


  const fetchRCDetails = async (rcCode) => {
    if (!rcCode) return null;

    try {
      const response = await fetchData("getRCMast", {
        RC_CODE: rcCode,
      });
      if (response?.success) {
        let rcData = response.data || [];
        if (rcData?.[0]?.result) {
          rcData = JSON.parse(rcData[0].result || "[]");
        }

        const row = Array.isArray(rcData) ? rcData[0] : rcData;
        if (!row) return null;
        return {
          rcCode: row.rcCode || rcCode,
          rcName: row.rcName || "",
        };
      }
    } catch (error) {
      console.error("Could not fetch RC details:", error);
    }

    return null;
  };


    // VALIDATION AND TRANSACTION PAYLOAD
  // Keep these checks in the same order used by the SVI transaction flow.


    const normalizeInvoiceNo = (value) =>
    String(value || "")
      .trim()
      .toUpperCase();


  const findMissingInvoiceNoRow = (rows) => (Array.isArray(rows) ? rows : []).findIndex((row) => !normalizeInvoiceNo(row?.siNo));


  const getAdvanceValidationError = (rows = detailRows) => {
    if (selectedApType === "APV03") {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index] || {};
        const amount = parseFormattedNumber(row.amount) || 0;
        const advanceBalance = Math.max(
          parseFormattedNumber(row.advanceBalance ?? row.advpoAmount ?? row.amount) || 0,
          0,
        );
        if (amount < 0) return `Advances Amount in row ${index + 1} cannot be negative.`;
        if (amount > advanceBalance) {
          return `Advances Amount in row ${index + 1} cannot exceed the Advances Balance of ${formatNumber(advanceBalance)}.`;
        }
      }
      return "";
    }

    const rules = [
      { field: "advpoAmount", limitField: "amount", label: "Applied Advances Amount", limitLabel: "Original Amount" },
      { field: "advpoVatAmount", limitField: "vatAmount", label: "Applied Advances VAT", limitLabel: "VAT Amount" },
      { field: "advpoAtcAmount", limitField: "atcAmount", label: "Applied Advances EWT", limitLabel: "EWT Amount" },
    ];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      for (const rule of rules) {
        const amount = parseFormattedNumber(row[rule.field]) || 0;
        const limit = Math.max(parseFormattedNumber(row[rule.limitField]) || 0, 0);
        if (amount < 0) return `${rule.label} in row ${index + 1} cannot be negative.`;
        if (amount > limit) return `${rule.label} in row ${index + 1} cannot exceed the ${rule.limitLabel} of ${formatNumber(limit)}.`;
      }
    }

    return "";
  };


  const buildTransactionPayload = (glRows = detailRowsGL, invoiceRows = detailRows) => ({
    branchCode,
    apvNo: documentNo || "",
    apvId: documentID || "",
    apvDate: header.apvDate,
    apvtranType: selectedApType,
    tranMode: "M",
    acctCode: apAccountCode,
    vendCode,
    vendName: vendName?.vendName || "",
    refapvNo1: header.refDocNo1 || "",
    refapvNo2: header.refDocNo2 || "",
    currCode: currencyCode,
    currRate: parseFormattedNumber(currencyRate) || 1,
    remarks: header.remarks || "",
    userCode: userCode || currentUserRow?.userCode || user?.userCode || "",
    dt1: invoiceRows.map((row, index) => buildApvDetailPayloadRow(row, index, selectedApType)),
    dt2: glRows.map((entry, index) => ({
      recNo: String(index + 1),
      acctCode: entry.acctCode,
      rcCode: entry.rcCode,
      sltypeCode: isGlSlRequired(entry) ? entry.sltypeCode : "",
      slCode: entry.slCode,
      atcCode: entry.atcCode,
      particular: entry.particular,
      debit: parseFormattedNumber(entry.debit),
      credit: parseFormattedNumber(entry.credit),
      debitFx1: parseFormattedNumber(entry.debitFx1),
      creditFx1: parseFormattedNumber(entry.creditFx1),
      slrefNo: entry.slRefNo,
      slrefDate: normalizeSlrefDate(entry.slrefDate),
      dt1Lineno: entry.dt1Lineno || "",
    })),
  });

  const getAccountRequirement = (accountRow) => ({
    reqRc: isRequirementEnabled(accountRow?.reqRc, accountRow?.reqRC, accountRow?.rcReq, accountRow?.recRc) ? "Y" : "N",
    reqSl: isRequirementEnabled(accountRow?.reqSl, accountRow?.reqSL, accountRow?.slReq, accountRow?.recSl) ? "Y" : "N",
  });

  const buildGlParticular = (acctName, slName, rcName) =>
    [acctName, slName, rcName]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" / ");

  const buildGlRow = ({
    accountRow,
    acctCode,
    acctName = "",
    row = {},
    debit = 0,
    credit = 0,
    vatCode = "",
    atcCode = "",
    forceSupplierSl = false,
  }) => {
    const accountRequirement = getAccountRequirement(accountRow);
    const requiresRc = accountRequirement.reqRc === "Y";
    const requiresSl = accountRequirement.reqSl === "Y" || forceSupplierSl;
    const selectedSlType = row.sltypeCode || vendName?.sltypeCode || "SU";
    const selectedSlCode = row.slCode || vendCode || "";
    const selectedSlName = row.slName || vendName?.vendName || "";
    const selectedAcctName = acctName || accountRow?.acctName || accountRow?.acct_name || "";
    const selectedRcName = requiresRc ? row.rcName || "" : "";
    const selectedParticular = buildGlParticular(selectedAcctName, requiresSl ? selectedSlName : "", selectedRcName);

    return {
      acctCode: acctCode || "",
      acctName: selectedAcctName,
      rcCode: requiresRc ? row.rcCode || "REQ RC" : "",
      rcName: selectedRcName,
      sltypeCode: requiresSl ? selectedSlType : "",
      slCode: requiresSl ? selectedSlCode || "REQ SL" : "",
      slName: requiresSl ? selectedSlName : "",
      particular: selectedParticular,
      debit: formatNumber(debit),
      credit: formatNumber(credit),
      debitFx1: "0.00",
      creditFx1: "0.00",
      debitFx2: "0.00",
      creditFx2: "0.00",
      vatCode,
      atcCode,
      slRefNo: row.siNo || "",
      slrefDate: normalizeSlrefDate(row.siDate),
      remarks: row.remarks || header.remarks || "",
      reqRc: requiresRc ? "Y" : "N",
      reqSl: requiresSl ? "Y" : "N",
      dt1Lineno: row.lnNo || "",
    };
  };

  const buildReimbursementLikeGLEntries = async () => {
    const apAccountRow = apAccountCode ? await useTopAccountRow(apAccountCode) : null;
    const generatedRows = [];

    for (let index = 0; index < detailRows.length; index += 1) {
      const row = detailRows[index] || {};
      const rcDetails = row.rcCode && row.rcCode !== "REQ RC" ? await fetchRCDetails(row.rcCode) : null;
      const lineRow = { ...row, lnNo: String(index + 1), rcName: row.rcName || rcDetails?.rcName || "" };
      const grossAmount = parseFormattedNumber(row.siAmount || row.amount || 0) || 0;
      const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
      const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;
      const debitAcct = String(row.debitAcct || "").trim();
      const debitAccountRow = debitAcct ? await useTopAccountRow(debitAcct) : null;
      const vatRow = row.vatCode ? await useTopVatRow(row.vatCode) : null;
      const atcRow = row.atcCode ? await useTopATCRow(row.atcCode) : null;
      const vatAcctCode = vatRow?.acctCode || vatRow?.acct_code || "";
      const atcAcctCode = atcRow?.ewtAcct || atcRow?.ewt_acct || atcRow?.acctCode || atcRow?.acct_code || "";

      generatedRows.push(
        buildGlRow({
          accountRow: debitAccountRow,
          acctCode: debitAcct,
          row: lineRow,
          debit: grossAmount - vatAmount,
        }),
      );

      if (vatAmount > 0 && vatAcctCode) {
        const vatAccountRow = await useTopAccountRow(vatAcctCode);
        generatedRows.push(
          buildGlRow({
            accountRow: vatAccountRow,
            acctCode: vatAcctCode,
            acctName: vatRow?.acctName || vatRow?.acct_name || "",
            row: lineRow,
            debit: vatAmount,
            vatCode: row.vatCode || "",
          }),
        );
      }

      if (atcAmount > 0 && atcAcctCode) {
        const atcAccountRow = await useTopAccountRow(atcAcctCode);
        generatedRows.push(
          buildGlRow({
            accountRow: atcAccountRow,
            acctCode: atcAcctCode,
            acctName: atcRow?.acctName || atcRow?.acct_name || "",
            row: lineRow,
            credit: atcAmount,
            atcCode: row.atcCode || "",
          }),
        );
      }

      generatedRows.push(
        buildGlRow({
          accountRow: apAccountRow,
          acctCode: apAccountCode,
          acctName: apAccountName,
          row: lineRow,
          credit: grossAmount - atcAmount,
          forceSupplierSl: true,
        }),
      );
    }

    return generatedRows.filter((row) => (parseFormattedNumber(row.debit) || 0) + (parseFormattedNumber(row.credit) || 0) !== 0);
  };

  // Main action dispatcher: Generate GL, then Upsert


  const handleActivityOption = async (action) => {
    const remarksEl = document.getElementById("remarks");
    if (remarksEl) remarksEl.focus();
    const shouldGenerateGl = action === "GenerateGL" || (action === "Upsert" && detailRowsGL.length === 0);
    if (["GenerateGL", "Upsert"].includes(action)) {
      const advanceValidationError = getAdvanceValidationError();
      if (advanceValidationError) {
        useSwalErrorAlert("Invalid Advances Amount", advanceValidationError);
        return;
      }
    }
    if (action === "Upsert") {
      const invalidSlrefDateRow = detailRowsGL.findIndex((entry) => {
        const value = String(entry?.slrefDate || "").trim();
        return value && !normalizeSlrefDate(value);
      });
      if (invalidSlrefDateRow >= 0) {
        Swal.fire({
          icon: "error",
          title: "Invalid SL Reference Date",
          text: `GL row ${invalidSlrefDateRow + 1} must use a valid date in MM/DD/YYYY format.`,
          confirmButtonText: "OK",
          confirmButtonColor: "#3085d6",
        });
        return;
      }
    }

    if (shouldGenerateGl && fieldVisibility.invoiceDetails && fieldVisibility.siNo) {
      const missingInvoiceNoRow = findMissingInvoiceNoRow(detailRows);
      if (missingInvoiceNoRow >= 0) {
        useSwalErrorAlert("Generate GL", `Invoice No. is required in row ${missingInvoiceNoRow + 1} before generating GL entries.`);
        return;
      }
    }

    if (documentStatus === "" || documentStatus === "OPEN") {
      updateState({ isLoading: true });
      const glData = buildTransactionPayload();
      let finalInvoiceRows = [...detailRows];
      let finalGlEntries = [...detailRowsGL];

      try {
        if (shouldGenerateGl && isReplenishmentAPType) {
          if (!apAccountCode) {
            useSwalErrorAlert("Generate GL", "AP Account is required for Replenishment.");
            return;
          }

          if (!detailRows.length) {
            useSwalErrorAlert("Generate GL", "Please select a PCV reference first.");
            return;
          }

          const missingDebitAccount = detailRows.find((row) => !String(row.debitAcct || "").trim());
          if (missingDebitAccount) {
            useSwalErrorAlert("Generate GL", "Petty Cash GL Account is missing from the selected PCV.");
            return;
          }
        }
        if (shouldGenerateGl) {
          finalGlEntries = [];
          if (isNonPurchasesApType(selectedApType)) {

            const blankRow = {
              acctCode: "",
              rcCode: "",
              rcName: "",
              sltypeCode: "",
              slCode: "",
              slName: "",
              particular: "",
              debit: "0.00",
              credit: "0.00",
              slRefNo: "",
              slrefDate: "",
              remarks: header.remarks || "",
              reqRc: "N",
              reqSl: "N",
            };
            const vName = vendName?.vendName || "";
            const selectedApAccountDisplay = apAccountName || apAccountCode || "Accounts Payable";
            const apRow = {
              acctCode: apAccountCode || "",
              rcCode: "",
              rcName: "",
              sltypeCode: vendName?.sltypeCode || "SU",
              slCode: vendCode || "REQ SL",
              slName: vName,
              particular: `${selectedApAccountDisplay}${vName ? " / " + vName : ""}`,
              debit: "0.00",
              credit: "0.00",
              slRefNo: "",
              slrefDate: "",
              remarks: header.remarks || "",
              reqRc: "N",
              reqSl: "Y", // Force requirement for AP line
            };

            finalGlEntries = [blankRow, apRow];
          } else if (isReimbursementLikeApType(selectedApType)) {
            if (!apAccountCode) {
              useSwalErrorAlert("Generate GL", "AP Account is required before generating GL entries.");
              return;
            }

            if (!detailRows.length) {
              useSwalErrorAlert("Generate GL", "Please add at least one invoice detail row before generating GL entries.");
              return;
            }

            const missingDebitAccountIndex = detailRows.findIndex((row) => !String(row.debitAcct || "").trim());
            if (missingDebitAccountIndex >= 0) {
              useSwalErrorAlert("Generate GL", `DR Account is required in row ${missingDebitAccountIndex + 1} before generating GL entries.`);
              return;
            }

            finalGlEntries = await buildReimbursementLikeGLEntries();
          } else {
            const generatedResponse = await useGenerateGLEntries(docType, glData, { includeInvoiceDetails: selectedApType === "APV01" });
            const generatedEntries = Array.isArray(generatedResponse) ? generatedResponse : generatedResponse?.glEntries;
            const generatedInvoiceDetails = Array.isArray(generatedResponse?.invoiceDetails) ? generatedResponse.invoiceDetails : [];
            if (generatedEntries) {
              finalGlEntries = generatedEntries.map((entry) => {
                const rawRc = entry.rcReq || entry.reqRc || entry.recRc || "N";
                const rawSl = entry.slReq || entry.reqSl || entry.recSl || "N";
                const isRcRequired = rawRc === "Y" || rawRc === "Yes";
                const isSlRequired = rawSl === "Y" || rawSl === "Yes" || Boolean(String(entry.slCode || "").trim());
                return {
                  ...entry,
                  reqRc: isRcRequired ? "Y" : "N",
                  reqSl: isSlRequired ? "Y" : "N",
                  slrefDate: normalizeSlrefDate(entry.slrefDate),
                  rcCode: isRcRequired && (!entry.rcCode || entry.rcCode === "") ? "REQ RC" : entry.rcCode,
                  sltypeCode: isSlRequired ? entry.sltypeCode || vendName?.sltypeCode || "SU" : "",
                  slCode: isSlRequired && (!entry.slCode || entry.slCode === "") ? vendCode || "REQ SL" : entry.slCode,
                  slName: isSlRequired ? entry.slName || vendName?.vendName || "" : "",
                };
              });
            }

            if (selectedApType === "APV01" && generatedInvoiceDetails.length > 0) {
              finalInvoiceRows = detailRows.map((row, index) => {
                const lineNo = String(row?.lnNo || index + 1);
                const generatedRow = generatedInvoiceDetails.find((item, generatedIndex) => String(item?.lnNo || generatedIndex + 1) === lineNo);
                if (!generatedRow) return row;
                return {
                  ...row,
                  sourceId: generatedRow.sourceId || row.sourceId || "",
                  apAdvId: generatedRow.apAdvId || "",
                  autoAdv: generatedRow.autoAdv || row.autoAdv || "Y",
                  advpoNo: generatedRow.advpoNo || "",
                  advAcct: generatedRow.advAcct || "",
                  advpoAmount: formatNumber(generatedRow.advpoAmount || 0),
                  advpoVatCode: generatedRow.advpoVatCode || "",
                  advpoVatName: generatedRow.advpoVatName || "",
                  advpoVatAmount: formatNumber(generatedRow.advpoVatAmount || 0),
                  advpoAtcCode: generatedRow.advpoAtcCode || "",
                  advpoAtcName: generatedRow.advpoAtcName || "",
                  advpoAtcAmount: formatNumber(generatedRow.advpoAtcAmount || 0),
                };
              });
            }
          }

          if (!finalGlEntries.length) {
            useSwalErrorAlert(action === "Upsert" ? "Save APV" : "Generate GL", "No GL entries were generated. The transaction was not saved.");
            return;
          }

          updateState({ detailRows: finalInvoiceRows, detailRowsGL: finalGlEntries });
        }

        if (action === "Upsert") {
          const saveData = buildTransactionPayload(finalGlEntries, finalInvoiceRows);
          const response = await useTransactionUpsert(docType, saveData, updateState, "apvId", "apvNo");
          if (response?.status === "success" && !response.data[0].errorMsg) {
            useSwalshowSaveSuccessDialog(handleReset, () => handleSaveAndPrint(response.data[0].apvId));
            updateState({
              isDocNoDisabled: true,
              isFetchDisabled: true,
              documentStatus: response.data[0].apvStatus || "",
              status: response.data[0].docStatus || "OPEN",
            });
          }
        }
      } catch (error) {
        console.error(`APV ${action} Error:`, error);
      } finally {
        updateState({ isLoading: false, showSpinner: false });
      }
    }
  };

  // INVOICE DETAIL AND REFERENCE ROW ACTIONS


  const updateInvoiceDetails = (updatedRows, additionalState = {}) => {
    const invoiceDetailsChanged = JSON.stringify(updatedRows) !== JSON.stringify(detailRows);
    updateState({
      detailRows: updatedRows,
      ...(invoiceDetailsChanged ? { detailRowsGL: [], triggerGLEntries: false } : {}),
      ...additionalState,
    });
    if (invoiceDetailsChanged) updateTotals(updatedRows);
    return invoiceDetailsChanged;
  };


  const handleAddRow = async (insertIndex = null, payee = {}) => {
    try {
      const selectedVendCode = payee.vendCode || vendCode || "";
      const selectedVendName = payee.vendName || vendName?.vendName || "";
      const firstRow = detailRows[0];
      const defaultVatCode = firstRow?.vatCode || payee.vatCode || vendName?.vatCode || "";
      const defaultAtcCode = firstRow?.atcCode || payee.atcCode || vendName?.atcCode || "";
      const newRow = {
        lnNo: "",
        invType: "",
        rrNo: "",
        poNo: "",
        siNo: "",
        siDate: useGetCurrentDayV2(),
        amount: "0.00",
        siAmount: "0.00",
        debitAcct: "",
        sltypeCode: firstRow?.sltypeCode || payee.sltypeCode || vendName?.sltypeCode || "SU",
        slCode: firstRow?.slCode || selectedVendCode,
        slName: firstRow?.slName || selectedVendName,
        vatCode: defaultVatCode,
        vatName: firstRow?.vatName || payee.vatName || vendName?.vatName || "",
        vatAmount: "0.00",
        atcCode: defaultAtcCode,
        atcName: firstRow?.atcName || payee.atcName || vendName?.atcName || "",
        atcAmount: "0.00",
        advpoNo: "",
        advpoAmount: "0.00",
        advpoVatAmount: "0.00",
        advpoAtcAmount: "0.00",
        advAcct: "",
        paytermCode: "",
        dueDate: useGetCurrentDayV2(),
        remarks: "",
        recRc: "N",
        recSl: selectedVendCode ? "Y" : "N",
        sourceId: "",
        apAdvId: "",
        autoAdv: "N",
      };
      let updatedRows = [...detailRows];
      if (insertIndex !== null && insertIndex >= 0) {
        updatedRows.splice(insertIndex + 1, 0, newRow);
      } else {
        updatedRows = [...updatedRows, newRow];
      }

      updateInvoiceDetails(updatedRows);
    } catch (error) {
      console.error("Error adding row:", error);
    }
  };


  const handleCopyDetailRow = (index) => {
    const sourceRow = detailRows[index];
    if (!sourceRow) return;

    const copiedRow = {
      ...sourceRow,
      lnNo: "",
      autoAdv: "N",
      apAdvId: "",
      advpoNo: "",
      advpoAmount: "0.00",
      advpoVatCode: "",
      advpoVatAmount: "0.00",
      advpoAtcCode: "",
      advpoAtcAmount: "0.00",
      advAcct: "",
    };
    const updatedRows = [...detailRows];
    updatedRows.splice(index + 1, 0, copiedRow);
    updateInvoiceDetails(updatedRows);
  };


  const handleInsertDetailRowClick = async (index) => {
    const sourceRow = detailRows[index];
    if (!sourceRow || String(sourceRow.sourceId || "").trim()) {
      await handleAddRow(index);
      return;
    }

    const result = await useSwalProceedConfirm(
      "Insert Detail Row",
      "Do you want to copy the selected record or insert a new record?",
      "Copy Record",
      "Insert New Record",
    );

    if (result?.isConfirmed) {
      handleCopyDetailRow(index);
      return;
    }

    if (result?.dismiss === Swal.DismissReason.cancel) await handleAddRow(index);
  };


  const handleInvoiceAddClick = () => {
    if (isFormDisabled) return;
    setShowInvoiceAddDropdown((prev) => !prev);
  };


  const handleAddInvoiceRow = async () => {
    setShowInvoiceAddDropdown(false);
    if (!vendCode) {
      await handleOpenPayeeLookup("addPayeeDetail");
      return;
    }

    await handleAddRow();
  };


  const handleOpenReferencePCV = async (overrides = {}) => {
    setShowInvoiceAddDropdown(false);
    const lookupVendCode = String(overrides.vendCode ?? vendCode ?? "").trim();
    const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();
    if (!lookupVendCode) {
      updateState({
        payeeModalOpen: true,
        modalContext: "openPCV",
      });
      return;
    }

    try {
      updateState({
        isLoading: true,
        showSpinner: true,
      });
      const rawRows = await fetchAPVReferenceSummary({
        apvtranType: "APV04",
        referenceType: "PCV",
        branchCode: lookupBranchCode,
        vendCode: lookupVendCode,
      });
      const normalizedRows = rawRows.map((row, index) => ({
        ...row,
        groupId: row.groupId || row.pcvId || `${row.pcvNo || "PCV"}-${index + 1}`,
        type: row.type || "PCV",
        branchCode: row.branchCode || "",
        pcvNo: row.pcvNo || "",
        pcvDate: useformatToDatev2(row.pcvDate) || normalizeSlrefDate(row.pcvDate),
        pcvAmount: row.pcvAmount ?? row.amount ?? 0,
        currCode: row.currCode || currencyCode || "PHP",
        currRate: row.currRate || 1,
        drAcct: row.drAcct || row.debitAcct || "",
        rcCode: row.rcCode || "",
        rcName: row.rcName || "",
        vendCode: row.vendCode || "",
        vendName: row.vendName || "",
      }));

      if (normalizedRows.length === 0) {
        useSwalErrorAlert("Open Reference PCV", "No posted PCV available for replenishment.");
        return;
      }

      updateState({
        globalLookupRow: normalizedRows,
        globalLookupHeader: openPCVLookupColumns,
        globalLookupTitle: "Open PCV References",
        globalLookupBtnCaption: "Get Selected PCV",
        showRRRefModal: true,
        modalContext: "openPCV",
      });
    } catch (error) {
      console.error("Failed to fetch Open PCV reference:", error);

      useSwalErrorAlert(
        "Open Reference PCV",
        error?.response?.data?.message || error?.response?.data?.details || error?.message || "Error fetching posted PCV references.",
      );
    } finally {
      updateState({
        isLoading: false,
        showSpinner: false,
      });
    }
  };


  const handleOpenReferenceRR = async (overrides = {}) => {
    setShowInvoiceAddDropdown(false);

    const lookupVendCode = String(overrides.vendCode ?? vendCode ?? "").trim();
    const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();
    if (!lookupVendCode) {
      updateState({
        payeeModalOpen: true,
        modalContext: "openRR",
      });
      return;
    }

    try {
      updateState({ isLoading: true, showSpinner: true });
      const rawRows = await fetchAPVReferenceSummary({
        apvtranType: "APV01",
        referenceType: "RR",
        branchCode: lookupBranchCode,
        vendCode: lookupVendCode,
        extraPayload: {
          includeClosed: true,
          includeClosedRR: true,
        },
      });

      const referenceRows = rawRows.map((row, index) => mapOpenRRRow(row, index));
      if (referenceRows.length === 0) {
        useSwalErrorAlert("Open Reference", "No open RR found for this supplier.");
        return;
      }

      updateState({
        globalLookupRow: referenceRows,
        globalLookupHeader: openRRLookupColumns,
        globalLookupTitle: "Open RR References",
        globalLookupBtnCaption: "Get Selected RR",
        showRRRefModal: true,
        modalContext: "openRR",
      });
    } catch (error) {
      console.error("Failed to fetch Open RR:", error);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };


  const getReferenceApprovalStatus = (row = {}) =>
    String(
      row.approvalStatus ||
        row.documentStatus ||
        row.docStatus ||
        row.joStatusDesc ||
        row.joStatus ||
        row.statusDesc ||
        row.status ||
        "",
    )
      .trim()
      .toUpperCase();


  const hasUnapprovedReferenceStatus = (row = {}) => {
    const status = getReferenceApprovalStatus(row);
    if (!status) return false;
    return (
      ["D", "N", "PENDING", "DRAFT", "FOR APPROVAL", "FOR JO APPROVAL", "UNAPPROVED", "DISAPPROVED", "REJECTED", "X", "CANCELLED"].includes(status) ||
      status.includes("FOR APPROVAL") ||
      status.includes("PENDING") ||
      status.includes("DRAFT") ||
      status.includes("UNAPPROVED") ||
      status.includes("DISAPPROVED") ||
      status.includes("REJECTED") ||
      status.includes("CANCELLED")
    );
  };


  const handleOpenReferenceJO = async (overrides = {}) => {
    setShowInvoiceAddDropdown(false);
    const lookupVendCode = String(overrides.vendCode ?? vendCode ?? "").trim();
    const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();
    if (!lookupVendCode) {
      updateState({
        payeeModalOpen: true,
        modalContext: "openJO",
      });
      return;
    }

    try {
      updateState({ isLoading: true, showSpinner: true });
      const rawRows = await fetchAPVReferenceSummary({
        apvtranType: "APV01",
        referenceType: "JO",
        branchCode: lookupBranchCode,
        vendCode: lookupVendCode,
      });
      const referenceRows = rawRows
        .filter((row) => !hasUnapprovedReferenceStatus(row))
        .map((row, index) =>
          mapOpenRRRow(
            {
              ...row,
              type: row.type || "JO",
              referenceSource: "JO",
              rrNo: row.rrNo || row.joNo || "",
              rrDate: row.rrDate || row.joDate || "",
              poNo: row.poNo || row.joNo || "",
            },
            index,
          ),
        );
      if (referenceRows.length === 0) {
        useSwalErrorAlert("Open JO Reference", "No open JO found for this supplier.");
        return;
      }

      updateState({
        globalLookupRow: referenceRows,
        globalLookupHeader: openRRLookupColumns,
        globalLookupTitle: "Open JO References",
        globalLookupBtnCaption: "Get Selected JO",
        showRRRefModal: true,
        modalContext: "openJO",
      });
    } catch (error) {
      console.error("Failed to fetch Open JO:", error);
      useSwalErrorAlert(
        "Open JO Reference",
        error?.response?.data?.message || error?.response?.data?.details || error?.message || "Error fetching open JO references.",
      );
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };


  const getCategoryAccountCode = (row = {}) =>
    row.drAcct ||
    row.debitAcct ||
    row.expAcct ||
    row.expAcctCode ||
    row.expacctCode ||
    row.expacct_code ||
    row.EXPACCT_CODE ||
    row.invAcct ||
    row.invAcctCode ||
    row.invacct_code ||
    row.INVACCT_CODE ||
    row.acctCode ||
    row.acct_code ||
    row.ACCT_CODE ||
    "";


  const extractCategoryAccountRows = (response) => {
    const raw = response?.data?.[0]?.result ?? response?.data?.result ?? response?.result ?? response?.data ?? response;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }

    return typeof raw === "object" ? [raw] : [];
  };


  const resolveReferenceDebitAccount = async (item = {}) => {
    const existingAccount = getCategoryAccountCode(item);
    if (existingAccount) return existingAccount;
    const detailRows = Array.isArray(item.rrDetailRows) ? item.rrDetailRows : [];
    const detailWithAccount = detailRows.find((row) => getCategoryAccountCode(row));
    const detailAccount = getCategoryAccountCode(detailWithAccount);
    if (detailAccount) return detailAccount;
    const detailWithCategory = detailRows.find((row) => getReferenceCategoryCode(row)) || {};
    const itemCategoryCode = getReferenceCategoryCode(item) || getReferenceCategoryCode(detailWithCategory);
    const categoryCode = String(itemCategoryCode || "").trim();
    if (!categoryCode) return "";
    const invType = String(item.type || item.invType || item.rrSource || "")
      .trim()
      .toUpperCase();
    const categoryEndpointByType = {
      RM: "getRMCategoryAccount",
      RMRR: "getRMCategoryAccount",
      MS: "getMSCategoryAccount",
      MSRR: "getMSCategoryAccount",
      FG: "getFGCategoryAccount",
      FGRR: "getFGCategoryAccount",
    };
    const endpoint = categoryEndpointByType[invType] || "getCategoryDetails";
    const payload =
      endpoint === "getRMCategoryAccount"
        ? { categCode: categoryCode, rmcategCode: categoryCode }
        : endpoint === "getCategoryDetails"
          ? { code: categoryCode }
          : { categCode: categoryCode };

    try {
      const response = endpoint === "getCategoryDetails" ? await fetchData(endpoint, payload) : await fetchDataJson(endpoint, payload);
      const rows = extractCategoryAccountRows(response);
      const accountRow = rows.find((row) => getCategoryAccountCode(row)) || {};
      return getCategoryAccountCode(accountRow);
    } catch (categoryLookupError) {
      console.warn(`Could not resolve ${invType || "inventory"} category account for: ${categoryCode}`, categoryLookupError);
      return "";
    }
  };


  const handleCloseRRRefModal = async (selectedItems) => {
    if (!selectedItems || !selectedItems.records) {
      updateState({
        showRRRefModal: false,
        modalContext: "",
        globalLookupTitle: "",
        globalLookupBtnCaption: "",
      });
      return;
    }

    const isPOAdvanceFlow = modalContext === "openPOAdvance";
    const isLCImportationFlow = modalContext === "openLCImportation";
    const isPCVFlow = modalContext === "openPCV";
    const itemsArray = Array.isArray(selectedItems.records) ? selectedItems.records : [selectedItems.records];
    updateState({ isLoading: true, showSpinner: true });

    try {
      if (isPCVFlow) {
        const mappedRows = await Promise.all(
          itemsArray.map(async (item) => {
            const amount = parseFormattedNumber(item.pcvAmount || item.amount || 0) || 0;
            const rcCode = item.rcCode || "";
            const rcName = item.rcName || (rcCode ? await fetchRCNameByCode(rcCode) : "");
            return {
              lnNo: "",
              invType: item.type || item.invType || "PCV",
              rrNo: item.pcvNo || "",
              poNo: "",
              siNo: "",
              siDate: useformatToDatev2(item.pcvDate) || normalizeSlrefDate(item.pcvDate) || useGetCurrentDayV2(),
              amount: formatNumber(amount),
              siAmount: formatNumber(amount),
              debitAcct: item.drAcct || item.debitAcct || "",
              rcCode,
              rcName,
              sltypeCode: "",
              slCode: "",
              slName: "",
              vatCode: "",
              vatName: "",
              vatAmount: "0.00",
              atcCode: "",
              atcName: "",
              atcAmount: "0.00",
              paytermCode: "",
              dueDate: "",
              advpoNo: "",
              advpoAmount: "0.00",
              advpoVatAmount: "0.00",
              advpoAtcAmount: "0.00",
              advAcct: "",
              recRc: item.recRc || item.reqRc || (rcCode ? "Y" : "N"),
              recSl: "N",
              sourceId: item.sourceId || item.pcvId || item.groupId || "",
              pcvId: item.pcvId || item.groupId || "",
            };
          }),
        );
        const updatedRows = [...detailRows, ...mappedRows];
        updateInvoiceDetails(updatedRows, {
          showRRRefModal: false,
          modalContext: "",
          globalLookupTitle: "",
          globalLookupBtnCaption: "",
          triggerGLEntries: false,
        });
        return;
      }
      if (isLCImportationFlow) {

        const selectedLC = itemsArray[0] || {};
        const selectedIds = itemsArray
          .map((row) => {
            return row.groupId || row.lcId || "";
          })
          .filter(Boolean)
          .join(",");
        const selectedLcId = selectedLC.lcId || String(selectedLC.groupId || "").split("|")[0] || "";

        const detailPayload = {
          json_data: {
            selectedIds: selectedIds,
            selectedId: selectedIds,
            lcId: selectedLcId,
            branchCode: selectedLC.branchCode || branchCode || "",
            lcNo: selectedLC.lcNo || "",
            type: "LC",
            invType: "LC",
            referenceType: "LC",
          },
        };

        const detailResponse = await postRequest("getAPVLC_OpenDetail", detailPayload);
        const lcDetailRows = extractOpenRRResponseRows(detailResponse);
        if (!lcDetailRows.length) {
          useSwalErrorAlert("LC Importation Reference", "No invoice details found for the selected LC reference.");
          return;
        }
                const foundVatCode = vendName?.vatCode || "";
        const foundAtcCode = vendName?.atcCode || "";
        const masterAtcRow = foundAtcCode ? await useTopATCRow(foundAtcCode) : null;
        const defaultAdvancesAcctCode = await getDefaultAdvancesAcctCode();
        const lcBrokerCode = selectedLC.vendCode || "";
        const lcBrokerName = selectedLC.vendName || "";
        const lcForwarderCode = selectedLC.forwarderCode || "";
        const lcForwarderName = selectedLC.forwarderName || "";
        const mappedRows = await Promise.all(
          lcDetailRows.map(async (item) => {
            const amount = parseFormattedNumber(item.siAmount ?? item.amount ?? item.billAmt ?? 0) || 0;
            const vatAmount = parseFormattedNumber(item.vatAmount ?? item.vatAmt ?? 0) || 0;
            const netAmount = parseFormattedNumber(item.netAmount ?? item.netAmt ?? amount - vatAmount) || 0;
            const rawSiDate = item.siDate || item.lcDate || selectedLC.lcDate || "";
            const formattedSiDate = rawSiDate ? useformatToDatev2(rawSiDate) || normalizeSlrefDate(rawSiDate) || useGetCurrentDayV2() : useGetCurrentDayV2();
            const calculatedAtcAmount = foundAtcCode ? await useTopATCAmount(foundAtcCode, netAmount) : 0;
            const detailVendCode = item.vendCode || lcBrokerCode || "";
            const detailVendName = item.vendName || lcBrokerName || "";
            return {
              lnNo: "",
              invType: item.invType || "LC",
              rrNo: "",
              poNo: item.lcNo || selectedLC.lcNo || "",
              siNo: item.siNo || "",
              siDate: formattedSiDate,
              amount: formatNumber(amount),
              siAmount: formatNumber(amount),
              debitAcct: item.debitAcct || item.drAcct || "",
              rcCode: item.rcCode || "",
              rcName: item.rcName || "",
              sltypeCode: "SU",
              slCode: detailVendCode,
              slName: detailVendName,
              brokerCode: item.brokerCode || lcBrokerCode,
              brokerName: item.brokerName || lcBrokerName,
              forwarderCode: item.forwarderCode || lcForwarderCode,
              forwarderName: item.forwarderName || lcForwarderName,
              vatCode: item.vatCode || foundVatCode,
              vatName: item.vatName || "",
              vatAmount: formatNumber(vatAmount),
              atcCode: foundAtcCode,
              atcName: masterAtcRow?.atcName || "",
              atcAmount: formatNumber(calculatedAtcAmount),
              advpoNo: "",
              advpoAmount: "0.00",
              advpoVatAmount: "0.00",
              advpoAtcAmount: "0.00",
              advAcct: item.advAcct || defaultAdvancesAcctCode || "",
              paytermCode: "",
              dueDate: useGetCurrentDayV2(),
              remarks: item.remarks || "",
              recRc: item.rcCode ? "Y" : "N",
              recSl: "Y",
              sourceId: item.sourceId || item.lcId || selectedLcId,
              lcId: item.lcId || selectedLcId,
              lcNo: item.lcNo || selectedLC.lcNo || "",
            };
          }),
        );

        const updatedRows = [...detailRows, ...mappedRows];
        updateInvoiceDetails(updatedRows, {
          vendCode,
          vendName,
          apAccountCode,
          apAccountName,
          currencyCode,
          currencyName,
          currencyRate,
          showRRRefModal: false,
          modalContext: "",
          globalLookupTitle: "",
          globalLookupBtnCaption: "",
          globalLookupConfigEndpoint: "",
          triggerGLEntries: false,
        });
        return;
      }

      const referenceItems = isPOAdvanceFlow ? itemsArray : await Promise.all(itemsArray.map((item) => enrichRRReferenceItem(item)));

      const defaultAdvancesAcctCode = await getDefaultAdvancesAcctCode();
      const mappedRows = await Promise.all(
        referenceItems.map(async (item) => {
          const resolvedDebitAcct = await resolveReferenceDebitAccount(item);
          const debitAccountRow = resolvedDebitAcct ? await useTopAccountRow(resolvedDebitAcct) : null;
          const rawRcRequirement = item.rcReq || item.reqRc || item.reqRC || item.recRc || debitAccountRow?.rcReq || debitAccountRow?.reqRc || debitAccountRow?.reqRC || "N";
          const isRcRequired = rawRcRequirement === "Y" || rawRcRequirement === "Yes";

          if (isPOAdvanceFlow) {
            const amount = parseFormattedNumber(item.poAmount ?? item.amount ?? item.siAmount ?? 0) || 0;
            const advancePoNo = item.poJoNo || item.poNo || "";

            const rawAdvanceInvoiceDate = item.siDate || item.poJoDate || item.poDate || "";
            const formattedAdvanceInvoiceDate = rawAdvanceInvoiceDate
              ? useformatToDatev2(rawAdvanceInvoiceDate) || normalizeSlrefDate(rawAdvanceInvoiceDate) || useGetCurrentDayV2()
              : useGetCurrentDayV2();

            // Vendor
            const selectedVendCode = item.vendCode || vendCode || "";
            const payeeRow = selectedVendCode ? await fetchPayeeByCode(selectedVendCode) : null;

            // VAT
            const vatCode = item.vatCode || "";
            const vatData = vatCode ? await useTopVatRow(vatCode) : null;
            const vatName = item.vatName || vatData?.vatName || "";

            const vatAmount =
              parseFormattedNumber(
                item.vatAmount ??
                item.apvVatAmount ??
                item.advanceVatAmount ??
                item.advpoVatAmount ??
                0,
              ) || 0;

            // ATC - get from Vendor Master
            const atcCode = payeeRow?.atcCode || "";
            const atcData = atcCode ? await useTopATCRow(atcCode) : null;
            const atcName = atcData?.atcName || "";

            // EWT is based on amount net of VAT
            const netOfVat = +(amount - vatAmount).toFixed(2);

            const atcAmount = atcCode
              ? await useTopATCAmount(atcCode, netOfVat)
              : 0;

            const advanceAccount =
              item.advAcct ||
              item.advanceAcct ||
              item.advancesAcct ||
              defaultAdvancesAcctCode ||
              "";

            return {
              lnNo: "",
              invType: item.docType || item.invType || "PO",
              rrNo: "",
              poNo: advancePoNo,
              siNo: advancePoNo,
              siDate: formattedAdvanceInvoiceDate,

              amount: formatNumber(amount),
              siAmount: formatNumber(amount),
              advanceBalance: getPOAdvanceBalance(item),

              debitAcct: "",
              rcCode: item.rcCode || "",
              rcName: item.rcName || "",

              sltypeCode: "SU",
              slCode: selectedVendCode,
              slName: item.vendName || payeeRow?.vendName || vendName?.vendName || "",

              vatCode,
              vatName,
              vatAmount: formatNumber(vatAmount),

              atcCode,
              atcName,
              atcAmount: formatNumber(atcAmount),

              advpoNo: advancePoNo,
              advpoAmount: formatNumber(amount),
              advAcct: advanceAccount,

              advpoVatAmount: formatNumber(vatAmount),
              advpoAtcAmount: formatNumber(atcAmount),

              paytermCode: item.paytermCode || item.payterm || "",
              dueDate: item.dueDate || useGetCurrentDayV2(),
              remarks: item.remarks || "",

              recRc: item.rcCode ? "Y" : "N",
              recSl: "Y",

              sourceId: item.sourceId || item.poId || "",
            };
          }





          const vCode = item.vatCode || vendName?.vatCode || "";
          const vatData = vCode ? await useTopVatRow(vCode) : null;
          const targetRcCode = item.rcCode || (resolvedDebitAcct && isRcRequired ? "REQ RC" : "");
          const targetRcName = targetRcCode && targetRcCode !== "REQ RC" ? await fetchRCNameByCode(targetRcCode) : "";
          const aCode = vendName?.atcCode || "";
          const atcData = aCode ? await useTopATCRow(aCode) : null;
          const amount = parseFormattedNumber(item.siAmount || item.amount || 0);
          const dynamicVatRate = vCode ? await getVatRate(vCode) : 0;
          const inputVatAmount = parseFormattedNumber(item.vatAmount);
          const vatAmount = inputVatAmount > 0 ? inputVatAmount : dynamicVatRate > 0 ? (amount / (1 + dynamicVatRate)) * dynamicVatRate : 0;
          const netOfVat = +(amount - vatAmount).toFixed(2);
          const calculatedAtcAmount = aCode ? await useTopATCAmount(aCode, netOfVat) : 0;
          const availableAdvance = parseFormattedNumber(item.advanceBalance || 0) || 0;
          const availableAdvanceVat = parseFormattedNumber(item.advanceVatBalance || 0) || 0;
          const availableAdvanceEwt = parseFormattedNumber(item.advanceEwtBalance || 0) || 0;
          const appliedAdvance = Math.min(Math.max(amount, 0), Math.max(availableAdvance, 0));
          const advanceRatio = availableAdvance > 0 ? appliedAdvance / availableAdvance : 0;
          const appliedAdvanceVat = Math.min(availableAdvanceVat, availableAdvanceVat * advanceRatio);
          const appliedAdvanceEwt = Math.min(availableAdvanceEwt, availableAdvanceEwt * advanceRatio);
          return {
            lnNo: "",
            invType: item.type || item.invType || "MS",
            rrNo: String(item.type || "").toUpperCase() === "JO" ? item.joNo || item.rrNo || "" : item.rrNo || "",
            poNo: String(item.type || "").toUpperCase() === "JO" ? item.joNo || item.poNo || "" : item.poNo || "",
            siNo: item.siNo || "",
            siDate: item.siDate || item.rrDate || useGetCurrentDayV2(),
            amount: formatNumber(amount),
            siAmount: formatNumber(amount),
            debitAcct: resolvedDebitAcct,
            rcCode: targetRcCode,
            rcName: targetRcName,
            sltypeCode: "SU",
            slCode: vendCode,
            slName: vendName?.vendName,
            vatCode: vCode,
            vatName: vatData?.vatName || item.vatDesc || "",
            vatAmount: formatNumber(vatAmount),
            atcCode: aCode,
            atcName: atcData?.atcName || "",
            atcAmount: formatNumber(calculatedAtcAmount),
            advpoNo: appliedAdvance > 0 ? item.advpoNo || item.poNo || "" : "",
            advpoAmount: formatNumber(appliedAdvance),
            advpoVatAmount: formatNumber(appliedAdvanceVat),
            advpoAtcAmount: formatNumber(appliedAdvanceEwt),
            advAcct: appliedAdvance > 0 ? item.advAcct || defaultAdvancesAcctCode || "" : "",
            paytermCode: item.terms || item.paytermCode || "",
            dueDate: item.dueDate || useGetCurrentDayV2(),
            recRc: isRcRequired || targetRcCode ? "Y" : "N",
            recSl: "Y",
            sourceId: item.sourceId || item.rrId || item.joId || "",
            rrId: item.rrId || item.joId || "",
          };
        }),
      );

      const updatedRows = [...detailRows, ...mappedRows];
      updateInvoiceDetails(updatedRows, {
        showRRRefModal: false,
        triggerGLEntries: false,
        modalContext: "",
        globalLookupTitle: "",
        globalLookupBtnCaption: "",
      });
    } catch (error) {
      console.error("APV processing error inside handleCloseRRRefModal wrapper structure:", error);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
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
      slrefDate: "",
      remarks: header.remarks || "",
      reqRc: "N",
      reqSl: "N",
    };
    const updatedRows = [...detailRowsGL];
    if (index !== null && index >= 0) {
      updatedRows.splice(index + 1, 0, newRow);
    } else {
      updatedRows.push(newRow);
    }

    updateState({ detailRowsGL: updatedRows });
  };


  const handleDeleteRow = async (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);
    updateInvoiceDetails(updatedRows);
  };


    // TRANSACTION ACTIONS
  // Post, print, cancel, attach, copy, and confirmation callbacks.


  const handlePost = async () => {
    if (!detailRowsGL || detailRowsGL.length === 0) {
      return;
    }

    if (documentID && documentStatus === "") {
      updateState({ showPostingModal: true });
    }
  };


  const handlePrint = async () => {
    if (detailRowsGL.length === 0) {
      return;
    }
    if (documentID) {
      updateState({ showSignatoryModal: true });
    }
  };


  const handlePrint2307 = () => {
    const hasPrintable2307Entry = (detailRowsGL || []).some(
      (row) => String(row.atcCode || "").trim() !== "" && ((parseFormattedNumber(row.debit) || 0) !== 0 || (parseFormattedNumber(row.credit) || 0) !== 0),
    );
    if (
      !documentID ||
      String(displayStatus || "")
        .trim()
        .toUpperCase() !== "FINALIZED" ||
      !hasPrintable2307Entry
    ) {
      return;
    }

    const query = new URLSearchParams({
      viewDocument: "true",
      branchCode: branchCode || "",
      docCode: docType || "APV",
      tranId: documentID || "",
      documentNo: documentNo || "",
    });
    const baseUrl = import.meta.env.BASE_URL || "/";
    const previewUrl = `${baseUrl.replace(/\/?$/, "/")}page/APV2307?${query.toString()}`;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };


  const handleCancel = async () => {
    if (!detailRowsGL || detailRowsGL.length === 0) {
      return;
    }

    if (documentID && ["", "OPEN"].includes((documentStatus || "").toUpperCase())) {
      updateState({ showCancelModal: true });
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
      const copiedRows = detailRows.map((row) => ({
        ...row,
        poNo: "",
        siNo: "",
        siDate: useGetCurrentDayV2(),
        sourceId: "",
        apAdvId: "",
        autoAdv: "N",
        advpoNo: "",
        advpoAmount: "0.00",
        advpoVatCode: "",
        advpoVatName: "",
        advpoVatAmount: "0.00",
        advpoAtcCode: "",
        advpoAtcName: "",
        advpoAtcAmount: "0.00",
        advAcct: "",
      }));
      const retainCopiedGLEntries = ["APV02", "APV002"].includes(selectedApType);
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        documentDate: useGetCurrentDayV2(),
        noReprints: "0",
        detailRows: copiedRows,
        detailRowsGL: retainCopiedGLEntries ? detailRowsGL : [],
        triggerGLEntries: false,
      });
      updateTotals(copiedRows);
    }
  };


    const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  // LOOKUP CALLBACKS
  // Every lookup returns data through one handler before updating APV state.


  const fetchPayeeByCode = async (vendCode) => {
    if (!vendCode) return null;

    try {
      const response = await postRequest(
        "getPayee",
        JSON.stringify({
          VEND_CODE: vendCode,
        }),
      );
      if (!response?.success) return null;
      const parsed = JSON.parse(response?.data?.[0]?.result || "[]");
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch (error) {
      console.error("Error fetching payee details:", error);
      return null;
    }
  };


  const handleClosePayeeModal = async (selectedData) => {
    if (!selectedData) {
      updateState({
        payeeModalOpen: false,
        modalContext: "",
      });
      return;
    }

    const isRRFlow = modalContext === "openRR";
    const isJOFlow = modalContext === "openJO";
    const isPOAdvanceFlow = modalContext === "openPOAdvance";
    const isPCVFlow = modalContext === "openPCV";
    const isAddPayeeDetailFlow = modalContext === "addPayeeDetail";
    updateState({
      payeeModalOpen: false,
      isLoading: true,
      showSpinner: true,
    });

    try {
      const selectedVendCode = selectedData.vendCode || "";
      const payeeRow = await fetchPayeeByCode(selectedVendCode);
      const finalPayee = { ...selectedData, ...(payeeRow || {}) };
      const foundVendCode = finalPayee?.vendCode || "";
      const foundVendName = finalPayee?.vendName || "";
      const foundAcctCode = finalPayee?.apAccountCode || finalPayee?.acctCode || "";
      const foundAcctName = finalPayee?.apAccountName || finalPayee?.acctName || "";
      const foundCurrCode = payeeRow?.currCode || payeeRow?.currencyCode || selectedData?.currCode || selectedData?.currencyCode || "";
      let foundCurrName = payeeRow?.currName || payeeRow?.currencyName || selectedData?.currName || selectedData?.currencyName || "";
      if (foundCurrCode && !foundCurrName) {
        const currencyRow = await useTopCurrencyRow(foundCurrCode);
        foundCurrName = currencyRow?.currName || "";
      }
      const foundVatCode = finalPayee?.vatCode || "";
      const foundAtcCode = finalPayee?.atcCode || "";
      const masterVatRow = foundVatCode ? await useTopVatRow(foundVatCode) : null;
      const masterVatRate = foundVatCode ? await getVatRate(foundVatCode) : 0;
      const masterAtcRow = foundAtcCode ? await useTopATCRow(foundAtcCode) : null;
      const headerUpdates = {
        vendCode: foundVendCode,
        vendName: {
          vendCode: foundVendCode,
          vendName: foundVendName,
          currCode: foundCurrCode,
          currName: foundCurrName,
          vatCode: foundVatCode,
          vatName: masterVatRow?.vatName || "",
          atcCode: foundAtcCode,
          atcName: masterAtcRow?.atcName || "",
          sltypeCode: finalPayee?.sltypeCode || "SU",
        },
        apAccountCode: foundAcctCode,
        apAccountName: foundAcctCode && foundAcctName ? `${foundAcctCode} - ${foundAcctName}` : foundAcctCode,
        currencyCode: foundCurrCode,
        currencyName: foundCurrName,
        currCode: foundCurrCode,
        currName: foundCurrName,
      };
      if (detailRows.length > 0) {
        headerUpdates.detailRows = detailRows.map((row) => {
          const rowVatCode = row.vatCode && row.vatCode !== "" ? row.vatCode : foundVatCode || "";
          const rowVatName = row.vatCode && row.vatCode !== "" ? row.vatName : masterVatRow?.vatName || "";
          const rowAtcCode = row.atcCode && row.atcCode !== "" ? row.atcCode : foundAtcCode || "";
          const rowAtcName = row.atcCode && row.atcCode !== "" ? row.atcName : masterAtcRow?.atcName || "";
          const currentAmount = parseFormattedNumber(row.amount) || 0;
          const lineVatRate = rowVatCode === foundVatCode ? masterVatRate : 0;
          const calculatedVatAmount =
            row.vatCode && row.vatCode !== "" ? parseFormattedNumber(row.vatAmount) : lineVatRate > 0 ? (currentAmount / (1 + lineVatRate)) * lineVatRate : 0;
          return {
            ...row,
            slCode: foundVendCode,
            slName: foundVendName,
            vatCode: rowVatCode,
            vatName: rowVatName,
            vatAmount: formatNumber(calculatedVatAmount),
            atcCode: rowAtcCode,
            atcName: rowAtcName,
          };
        });
      }

      updateState(headerUpdates);
      if (foundCurrCode) {
        let rate = defaultCurrRate;
        if (foundCurrCode !== glCurrDefault) {
          rate = await useTopForexRate(foundCurrCode, header.apvDate);
        }

        updateState({
          currencyRate: formatNumber(parseFormattedNumber(rate || 1), 6),
          currRate: formatNumber(parseFormattedNumber(rate || 1), 6),
        });
      }

      if (headerUpdates.detailRows) {
        updateTotals(headerUpdates.detailRows);
      }

      if (isRRFlow) {
        setTimeout(() => {
          handleOpenReferenceRR({
            vendCode: foundVendCode,
            branchCode,
          });
        }, 100);
      } else if (isJOFlow) {
        setTimeout(() => {
          handleOpenReferenceJO({
            vendCode: foundVendCode,
            branchCode,
          });
        }, 100);
      } else if (isPOAdvanceFlow) {
        setTimeout(() => {
          handleOpenReferencePOAdvance({
            vendCode: foundVendCode,
            branchCode,
          });
        }, 100);
      } else if (isPCVFlow) {
        setTimeout(() => {
          handleOpenReferencePCV({
            vendCode: foundVendCode,
            branchCode,
          });
        }, 100);
      } else if (isAddPayeeDetailFlow) {
        await handleAddRow(null, {
          vendCode: foundVendCode,
          vendName: foundVendName,
          vatCode: foundVatCode,
          atcCode: foundAtcCode,
          vatName: masterVatRow?.vatName || "",
          atcName: masterAtcRow?.atcName || "",
          sltypeCode: finalPayee?.sltypeCode || "SU",
        });
      }
    } catch (error) {
      console.error("Error auto-filling payee details:", error);

      useSwalErrorAlert("Error", "Failed to fetch vendor details.");
    } finally {
      updateState({
        isLoading: false,
        showSpinner: false,
        modalContext: "",
      });
    }
  };

  // DETAIL AND GENERAL-LEDGER EDITING


  const getVatRate = async (vatCode) => {
    if (!vatCode) return 0;

    try {
      const response = await fetchData("getVat", { VAT_CODE: vatCode });
      if (response.success) {
        const vatData = JSON.parse(response.data[0].result);
        const rawRate = vatData[0]?.vatRate ?? 0;
        const parsedRate = parseFloat(rawRate);
        if (!isNaN(parsedRate)) {
          return parsedRate > 1 ? parsedRate / 100 : parsedRate;
        }

        return 0;
      }
      return 0;
    } catch (error) {
      console.error("Error fetching VAT rate:", error);
      return 0;
    }
  };


  const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...detailRows];
    if (field === "autoAdv" && updatedRows[index]?.autoAdv !== "N" && value === "N") {
      const result = await useSwalProceedConfirm(
        "Disable Auto Apply Advances?",
        "This will clear the applied advance information for this invoice line. Do you want to continue?",
        "Yes, continue",
        "No",
      );
      if (!result?.isConfirmed) return;
      updatedRows[index] = {
        ...updatedRows[index],
        autoAdv: "N",
        apAdvId: "",
        advpoNo: "",
        advpoAmount: "0.00",
        advpoVatCode: "",
        advpoVatAmount: "0.00",
        advpoAtcCode: "",
        advpoAtcAmount: "0.00",
        advAcct: "",
      };
      updateInvoiceDetails(updatedRows);
      return;
    }

    updatedRows[index] = { ...updatedRows[index], [field]: value };
    const row = updatedRows[index];
    if (["debitAcct", "vatAcct", "advAcct"].includes(field) && typeof value === "object") {
      const selectedAcctCode = value.acctCode || "";
      row[field] = selectedAcctCode;
      if (field === "debitAcct") {
        const rawRc = value.rcReq || value.reqRc || "N";
        const rawSl = value.slReq || value.reqSl || "N";
        const isRcRequired = rawRc === "Y" || rawRc === "Yes";
        const isSlRequired = rawSl === "Y" || rawSl === "Yes";

        row.recRc = isRcRequired ? "Y" : "N"; // Store as 'Y' for internal logic
        row.recSl = isSlRequired ? "Y" : "N";
        if (isRcRequired) {
          row.rcCode = "REQ RC";
          row.rcName = "";
        } else {
          row.rcCode = "";
          row.rcName = "";
        }

        if (isSlRequired) {
          row.sltypeCode = row.sltypeCode || vendName?.sltypeCode || "SU";
          row.slCode = row.slCode && row.slCode !== "REQ SL" ? row.slCode : vendCode || "REQ SL";
          row.slName = row.slName || vendName?.vendName || "";
        } else {
          row.sltypeCode = "";
          row.slCode = vendCode || "";
          row.slName = vendName?.vendName || "";
        }

      }
    }

    // RC code selection from modal
    if (field === "rcCode") {
      row.rcCode = value?.rcCode || row.rcCode || "";
      row.rcName = value?.rcName || "";
    }

    // SL code selection from modal
    if (field === "slCode") {
      row.slCode = value?.slCode || "";
      row.slName = value?.slName || "";
    }

    if (!isDetailSlRequired(row)) {
      row.sltypeCode = "";
    }

    // VAT code selection from modal
    if (field === "vatCode" && typeof value === "object") {
      row.vatCode = value.vatCode;
      row.vatName = value.vatName;
      row.vatAcct = value.acctCode;
    }

    // ATC code selection from modal
    if (field === "atcCode" && typeof value === "object") {
      row.atcCode = value.atcCode;
      row.atcName = value.atcName;
    }

    if (field === "amount") {
      row.siAmount = value;
    }

    if (runCalculations) {
            const origVatCode = row.vatCode || "";
      const origAtcCode = row.atcCode || "";

      function recalcRow(newAmount) {
        const newVatAmount = origVatCode ? getAllTopVatAmount(origVatCode, newAmount) : 0;
        const newNetOfVat = +(newAmount - newVatAmount).toFixed(2);
        const newATCAmount = origAtcCode ? getAllTopATCAmount(origAtcCode, newNetOfVat) : 0;

        row.siAmount = formatNumber(newAmount);
        row.vatAmount = formatNumber(newVatAmount);
        row.atcAmount = formatNumber(newATCAmount);
        row.amount = formatNumber(newAmount);
      }

      if (field === "amount") {
        const newAmount = parseFormattedNumber(row.amount) || 0;
        recalcRow(newAmount);
      }

      if (field === "vatCode") {
        const currentAmount = parseFormattedNumber(row.amount) || 0;
        const newVatAmount = row.vatCode ? getAllTopVatAmount(row.vatCode, currentAmount) : 0;
        const newNetOfVat = +(currentAmount - newVatAmount).toFixed(2);
        const newATCAmount = row.atcCode ? getAllTopATCAmount(row.atcCode, newNetOfVat) : 0;

        row.vatAmount = formatNumber(newVatAmount);
        row.atcAmount = formatNumber(newATCAmount);
      }

      if (field === "atcCode") {
        const currentAmount = parseFormattedNumber(row.amount) || 0;
        const currentVatAmount = parseFormattedNumber(row.vatAmount) || 0;
        const newNetOfVat = +(currentAmount - currentVatAmount).toFixed(2);
        const newATCAmount = row.atcCode ? getAllTopATCAmount(row.atcCode, newNetOfVat) : 0;

        row.atcAmount = formatNumber(newATCAmount);
      }

      if (field === "paytermCode") {
        const paytermData = await useTopPayTermRow(value);
        const daysDue = getPaytermDaysDue(paytermData);
        if (paytermData) {
          row.paytermCode = getPaytermCode(paytermData) || value;
          row.paytermName = getPaytermName(paytermData);
        }

        if (paytermData && daysDue !== "" && header.apvDate) {
          row.dueDate = calculateDueDate(header.apvDate, daysDue);
        } else {
          row.dueDate = "";
        }
      }

      if (field === "amount") {
        const num = parseFormattedNumber(value);
        if (!isNaN(num)) {
          row.amount = formatNumber(num);
          row.siAmount = formatNumber(num);
        }
      }
    }

    updatedRows[index] = row;
    if (index === 0 && detailRows.length > 1 && ["debitAcct", "rcCode", "slCode"].includes(field)) {
      const fieldLabels = { debitAcct: "DR Account", rcCode: "RC Code", slCode: "SL Code" };
      const result = await useSwalProceedConfirm(
        "Apply to Details?",
        `Do you want to copy this ${fieldLabels[field]} to all blank rows?`,
        "Yes, copy it!",
        "No",
      );
      if (result?.isConfirmed) {
        for (let rowIndex = 1; rowIndex < updatedRows.length; rowIndex += 1) {
          const target = updatedRows[rowIndex];
          if (field === "debitAcct" && !target.debitAcct) {
            updatedRows[rowIndex] = {
              ...target,
              debitAcct: row.debitAcct,
              recRc: row.recRc,
              rcCode: row.recRc === "Y" ? row.rcCode || "REQ RC" : "",
              rcName: row.recRc === "Y" ? row.rcName || "" : "",
              recSl: row.recSl,
              sltypeCode: row.recSl === "Y" ? row.sltypeCode || vendName?.sltypeCode || "SU" : "",
              slCode: row.recSl === "Y" ? row.slCode || vendCode || "REQ SL" : "",
              slName: row.recSl === "Y" ? row.slName || vendName?.vendName || "" : "",
            };
          }
          if (field === "rcCode" && (!target.rcCode || target.rcCode === "REQ RC")) updatedRows[rowIndex] = { ...target, rcCode: row.rcCode, rcName: row.rcName };
          if (field === "slCode" && (!target.slCode || target.slCode === "REQ SL")) updatedRows[rowIndex] = { ...target, sltypeCode: row.sltypeCode, slCode: row.slCode, slName: row.slName };
        }
      }
    }
    updateInvoiceDetails(updatedRows);
  };


  const commitManualAdvanceAmount = (index, field, value) => {
    const row = detailRows[index] || {};
    const amount = parseFormattedNumber(value);
    const rules = {
      advpoAmount: { limitField: "amount", label: "Applied Advances Amount", limitLabel: "Original Amount" },
      advpoVatAmount: { limitField: "vatAmount", label: "Applied Advances VAT", limitLabel: "VAT Amount" },
      advpoAtcAmount: { limitField: "atcAmount", label: "Applied Advances EWT", limitLabel: "EWT Amount" },
    };
    const rule = rules[field];
    const normalizedAmount = Number.isFinite(amount) ? amount : 0;

    if (normalizedAmount < 0) {
      useSwalErrorAlert("Invalid Advances Amount", `${rule.label} cannot be negative.`);
      handleDetailChange(index, field, "0.00", false);
      return false;
    }

    const limit = Math.max(parseFormattedNumber(row[rule.limitField]) || 0, 0);
    if (normalizedAmount > limit) {
      useSwalErrorAlert("Invalid Advances Amount", `${rule.label} cannot exceed the ${rule.limitLabel} of ${formatNumber(limit)}.`);
      handleDetailChange(index, field, "0.00", false);
      return false;
    }

    handleDetailChange(index, field, formatNumber(normalizedAmount), false);
    return true;
  };


  const handleBlurGL = async (index, field, value, autoCompute = false) => {
    const updatedRowsGL = [...detailRowsGL];
    const row = { ...updatedRowsGL[index] };
    const parsedValue = parseFormattedNumber(value);
    row[field] = formatNumber(parsedValue);
    if (autoCompute && ((withCurr2 && currencyCode !== glCurrDefault) || withCurr3)) {
      if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(field)) {
        const data = await useUpdateRowEditEntries(row, field, value, currencyCode, currencyRate, header.apvDate);
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
    updateState({ detailRowsGL: updatedRowsGL });
  };


  const handleDetailChangeGL = async (index, field, value) => {
    const currentRows = [...state.detailRowsGL];

    let row = { ...currentRows[index] };
    if (["acctCode", "slCode", "rcCode", "sltypeCode", "vatCode", "atcCode"].includes(field)) {
      const data = await useUpdateRowGLEntries(row, field, value, vendCode, docType);
      if (data) {
        const selectedRequirement = typeof value === "object" ? value : {};
        const rawRcReq = data.reqRc || data.rcReq || data.recRc || selectedRequirement.reqRc || selectedRequirement.rcReq || selectedRequirement.recRc || "N";
        const rawSlReq = data.reqSl || data.slReq || data.recSl || selectedRequirement.reqSl || selectedRequirement.slReq || selectedRequirement.recSl || "N";
        const isRcReq = rawRcReq === "Y" || rawRcReq === "Yes";
        const isSlReq = rawSlReq === "Y" || rawSlReq === "Yes";

        row.acctCode = data.acctCode || selectedRequirement.acctCode || selectedRequirement.accountCode || "";
        row.sltypeCode = isSlReq ? data.sltypeCode || vendName?.sltypeCode || "SU" : "";
        if (isRcReq) {
          row.rcCode = data.rcCode && data.rcCode !== "" ? data.rcCode : "REQ RC";
          row.rcName = data.rcName || "";
        } else {
          row.rcCode = "";
          row.rcName = "";
        }

        if (isSlReq) {
          row.slCode = data.slCode && data.slCode !== "REQ SL" ? data.slCode : vendCode || "REQ SL";
          row.slName = data.slName || vendName?.vendName || "";
        } else {
          row.sltypeCode = "";
          row.slCode = "";
          row.slName = "";
        }

        row.vatCode = data.vatCode || "";
        row.vatName = data.vatName || "";
        row.atcCode = data.atcCode || "";
        row.atcName = data.atcName || "";
        row.particular = data.particular || "";

        row.reqRc = isRcReq ? "Y" : "N";
        row.reqSl = isSlReq ? "Y" : "N";
      }
    }

    // Amount logic - ensures we only touch index [index]
    if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(field)) {
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

    if (["slRefNo", "slrefDate", "remarks"].includes(field)) {
      row[field] = value;
    }

    if (!isGlSlRequired(row)) {
      row.sltypeCode = "";
    }

    currentRows[index] = row;

    // Update state with the modified array
    updateState({ detailRowsGL: currentRows });
  };


  const handleSlrefDateChange = (index, value) => {
    handleDetailChangeGL(index, "slrefDate", formatSlrefDateInput(value));
  };


  const handleSlrefDateBlur = (index, value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      handleDetailChangeGL(index, "slrefDate", "");
      return;
    }

    const normalized = normalizeSlrefDate(trimmed);
    if (!normalized) {
      handleDetailChangeGL(index, "slrefDate", "");
      Swal.fire({
        icon: "error",
        title: "Invalid SL Reference Date",
        text: "Please enter a valid date in MM/DD/YYYY format.",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    handleDetailChangeGL(index, "slrefDate", normalized);
  };


  const openGLRemarksModal = (index) => {
    if (isFormDisabled) return;

    useSwalHandleOpenSpecsModal(
      index,
      detailRowsGL,
      handleDetailChangeGL,
      detailRowsGL?.[index]?.remarks || header.remarks || "",
      "Remarks",
      "remarks",
      "Enter remarks for this GL entry...",
    );
  };


  const handleCloseAccountModal = (selectedAccount) => {
    if (selectedAccount) {
      if (accountModalSource === "apAccount") {
        const rawCode = selectedAccount.accountCode || selectedAccount.acctCode || "";
        const rawName = selectedAccount.accountName || selectedAccount.acctName || "";
        const combinedDisplay = rawCode && rawName ? `${rawCode} - ${rawName}` : rawName;
        updateState({
          apAccountCode: rawCode,
          apAccountName: combinedDisplay, // Save "Code - Name" to the visible field
        });
      }
      else if (selectedRowIndex !== null) {
        const specialAccounts = ["debitAcct", "vatAcct", "advAcct"];
        if (specialAccounts.includes(accountModalSource)) {
          handleDetailChange(
            selectedRowIndex,
            accountModalSource,
            {
              ...selectedAccount,
              acctCode: selectedAccount.accountCode || selectedAccount.acctCode,
              reqRc: selectedAccount.reqRc || selectedAccount.reqRC || "N",
              reqSl: selectedAccount.reqSl || selectedAccount.reqSL || "N",
            },
            false,
          );
        } else {
          handleDetailChangeGL(selectedRowIndex, "acctCode", {
            ...selectedAccount,
            acctCode: selectedAccount.accountCode || selectedAccount.acctCode,
          });
        }
      }
    }

    updateState({
      showAccountModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };


  const handleCloseRcModal = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      const rcCode = selectedRc.rcCode || "";
      const result = await fetchRCDetails(rcCode);
      if (result) {
        handleDetailChange(selectedRowIndex, "rcCode", result, false);
      }
    }

    updateState({
      showRcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };


  const handleCloseRcModalGL = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      const rcCode = selectedRc.rcCode || "";
      const result = await fetchRCDetails(rcCode);
      if (result) {
        if (accountModalSource !== null) {
          handleDetailChange(selectedRowIndex, "rcCode", result, false);
        } else {
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


  const handleCloseSlModal = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      handleDetailChange(selectedRowIndex, "slCode", selectedSl, false);
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };


  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      handleDetailChangeGL(selectedRowIndex, "slCode", selectedSl);
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };


  const handleCloseCancel = async (confirmation) => {
    if (!confirmation) {
      updateState({ showCancelModal: false });
      return;
    }

    if (documentID !== null && ["", "OPEN"].includes((documentStatus || "").toUpperCase())) {
      const result = await useHandleCancel(docType, documentID, userCode, confirmation.password, confirmation.reason, updateState);
      if (result?.success) {
        useSwalSuccessAlert("Success", "Document cancelled successfully.");
        await fetchTranData(documentNo, branchCode);
        updateState({ showCancelModal: false });
      } else {
        updateState({
          resetCancelPasswordTrigger: Date.now(),
        });
      }
    }
  };


  const handleCloseSignatory = async (mode) => {
    updateState({
      showSpinner: true,
      showSignatoryModal: false,
      noReprints: mode === "Final" ? 1 : 0,
    });
    await useHandlePrint(documentID, docType, mode, userCode);
    updateState({
      showSpinner: false,
    });
  };


  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };


  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, documentNo: data.docNo });
  };


  const handleSaveAndPrint = async (documentID) => {
    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);
    updateState({ showSpinner: false });
  };


  const handleCloseVatModal = async (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      handleDetailChange(selectedRowIndex, "vatCode", result, true);
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

      handleDetailChange(selectedRowIndex, "atcCode", result, true);
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
      handleSelectCurrency(selectedCurrency);
    }
    updateState({ currencyModalOpen: false });
  };


  const handleSelectCurrency = async (currencyData) => {
    if (!currencyData) return;
    let currCode = typeof currencyData === "string" ? currencyData : currencyData.currCode;
    let currName = typeof currencyData === "object" ? currencyData.currName : null;

    // 🚀 Update the code immediately so the UI feels instantly responsive
    updateState({ currencyCode: currCode });
    if (!currName) {
      const result = await useTopCurrencyRow(currCode);
      if (result) {
        currName = result.currName;
      } else {
        return;
      }
    }

    if (currCode && currName) {
      let rate = defaultCurrRate;
      if (currCode !== glCurrDefault) {
        rate = await useTopForexRate(currCode, header.apvDate);
      }

      const formattedRate = formatNumber(parseFormattedNumber(rate || 1), 6);
      updateState({
        currencyCode: currCode,
        currencyName: currName,
        currencyRate: formattedRate,
      });
    }
  };


  const handleClosePaytermModal = async (selectedPayterm) => {
    if (selectedPayterm && selectedRowIndex !== null) {
      await handleSelectPayTerm(getPaytermCode(selectedPayterm));
    }
    updateState({ showPaytermModal: false });
  };


  const handleSelectPayTerm = async (paytermCode) => {
    if (paytermCode) {
      const result = await useTopPayTermRow(paytermCode);
      if (result) {
        const daysDue = getPaytermDaysDue(result);
        const updatedRows = [...detailRows];
        if (selectedRowIndex !== null) {
          updatedRows[selectedRowIndex] = {
            ...updatedRows[selectedRowIndex],
            paytermCode: getPaytermCode(result) || paytermCode,
            paytermName: getPaytermName(result),
            dueDate: calculateDueDate(header.apvDate, daysDue),
          };
          updateInvoiceDetails(updatedRows);
        }
      }
    }
  };


    // SL Code double-click handler


            const handlePaytermDoubleClick = (index) => {
    const currentValue = detailRows[index]?.paytermCode;
    const updatedRows = [...detailRows];
    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        paytermCode: "",
        paytermName: "",
        dueDate: new Date().toISOString().split("T")[0],
      };
      updateInvoiceDetails(updatedRows);
    } else {
      updateState({
        selectedRowIndex: index,
        showPaytermModal: true,
      });
    }
  };


  const handleVatNameDoubleClick = (index) => {
    const updatedRows = [...detailRows];
    // Reset VAT related fields for this row
    updatedRows[index] = {
      ...updatedRows[index],
      vatCode: "",
      vatName: "",
      vatAmount: "0.00",
    };
    updateInvoiceDetails(updatedRows);
  };


  const handleAtcNameDoubleClick = (index) => {
    const updatedRows = [...detailRows];
    // Reset ATC related fields for this row
    updatedRows[index] = {
      ...updatedRows[index],
      atcCode: "",
      atcName: "",
      atcAmount: "0.00",
    };
    updateInvoiceDetails(updatedRows);
  };


      const handleAPTypeChange = async (event) => {
    const selectedType = event.target.value;

    // Default: show all fields
    let visibility = {
      sltypeCode: true,
      slName: true,
      address: true,
      tin: true,
      invType: true,
      rrNo: true,
      poNo: true,
      siNo: true,
      siDate: true,
    };

    switch (selectedType) {
      case "APV01": // purchases
        visibility.sltypeCode = false;
        visibility.slName = false;
        visibility.address = false;
        visibility.tin = false;
        break;

      case "APV07": // importation
        visibility.sltypeCode = false;
        visibility.slName = false;
        visibility.address = false;
        visibility.tin = false;
        visibility.rrNo = false;
        visibility.poNo = true;
        break;

      case "APV02": // non purchases
      case "APV002":
        visibility.invType = false;
        visibility.rrNo = false;
        visibility.poNo = false;
        visibility.siNo = false;
        visibility.siDate = false;
        break;

      case "APV03": // advances
        visibility.sltypeCode = false;
        visibility.slName = false;
        visibility.address = false;
        visibility.tin = false;
        break;

      case "APV04": // replenishment
        visibility.sltypeCode = false;
        visibility.slName = false;
        visibility.address = false;
        visibility.tin = false;

        visibility.invType = true;
        visibility.rrNo = true; // reused as PCV No
        visibility.poNo = false;
        visibility.siNo = false;
        visibility.siDate = true; // reused as PCV Date
        break;

      case "APV05": // reimbursements
        visibility.invType = false;
        visibility.rrNo = false;
        visibility.poNo = false;
        visibility.sltypeCode = true;
        visibility.slName = true;
        visibility.address = true;
        visibility.tin = true;
        break;

      case "APV06": // liquidation
        visibility.invType = false;
        visibility.rrNo = false;
        visibility.poNo = false;
        visibility.sltypeCode = true;
        visibility.slName = true;
        visibility.address = true;
        visibility.tin = true;
        break;

      default:
        break;
    }

    const updates = {
      selectedApType: selectedType,
      fieldVisibility: visibility,
      detailRows: detailRows.map((row) => ({ ...row, autoAdv: selectedType === "APV01" ? row.autoAdv || "Y" : "N" })),
    };
    if (["APV01", "APV03"].includes(selectedType) && detailRows.length > 0) {
      const defaultAdvancesAcctCode = await getDefaultAdvancesAcctCode();
      if (defaultAdvancesAcctCode) {
        updates.detailRows = updates.detailRows.map((row) => ({
          ...row,
          advAcct: row.advAcct || row.advanceAcct || row.advancesAcct || defaultAdvancesAcctCode,
        }));
      }
    }

    updateState(updates);
  };

  // COLUMN VISIBILITY AND CELL RENDERERS
  // Keep presentation rules below transaction behavior, matching SVI.jsx.

  const selectedApTypeRow = apTypes.find((row) => row.dropdownCode === selectedApType);
  const selectedApTypeName = selectedApTypeRow?.dropdownName || "";
  const isAdvancesAPType =
    selectedApType === "APV03" ||
    String(selectedApType || "")
      .toUpperCase()
      .includes("ADV") ||
    String(selectedApTypeName || "")
      .toUpperCase()
      .includes("ADVANCE");
  const isReplenishmentAPType =
    selectedApType === "APV04" ||
    String(selectedApTypeName || "")
      .toUpperCase()
      .includes("REPLENISH");
  const isImportationAPType = selectedApType === "APV07";
  const isPurchasesAPType = selectedApType === "APV01";
  const isLcSourcedImportationRow = (row) => isImportationAPType && Boolean(String(row.sourceId || row.sourceNo || "").trim());
  const showAppliedAdvancesColumns = isPurchasesAPType || isImportationAPType;
  const showAdvancesAccountColumn = isPurchasesAPType || isAdvancesAPType || isImportationAPType;
  const showDrAccountColumn = !isAdvancesAPType;
  const replenishmentDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "invType", label: "Type", width: 70 },
    { key: "rrNo", label: "PCV No.", width: 120 },
    { key: "siDate", label: "PCV Date", width: 130 },
    { key: "amount", label: "PCV Amt", width: 140 },
    { key: "currCode", label: "Curr", width: 90 },
    { key: "siAmount", label: "Invoice Amount", width: 130 },
    { key: "debitAcct", label: "DR Acct", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "rcName", label: "RC Name", width: 260 },
  ];
  const regularApvDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },

    ...(fieldVisibility.invType ? [{ key: "invType", label: "Type", width: 70 }] : []),

    ...(fieldVisibility.rrNo && !isImportationAPType ? [{ key: "rrNo", label: "RR No.", width: 120 }] : []),

    ...(fieldVisibility.poNo
      ? [
          {
            key: "poNo",
            label: isImportationAPType ? "LC No" : "PO/JO No.",
            width: 120,
          },
        ]
      : []),

    ...(fieldVisibility.siNo ? [{ key: "siNo", label: "Invoice No.", width: 120 }] : []),
    ...(fieldVisibility.siDate ? [{ key: "siDate", label: "Invoice Date", width: 130 }] : []),

    {
      key: "amount",
      label: isAdvancesAPType ? "Advances Amount" : "Original Amount",
      width: 140,
    },

    { key: "currCode", label: "Currency", width: 90 },
    { key: "siAmount", label: "Invoice Amount", width: 130 },

    ...(showDrAccountColumn ? [{ key: "debitAcct", label: "DR Account", width: 120 }] : []),

    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "rcName", label: "RC Name", width: 260 },

    ...(fieldVisibility.sltypeCode ? [{ key: "sltypeCode", label: "SL Type Code", width: 120 }] : []),

    { key: "slCode", label: "SL Code", width: 120 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 260 },
    { key: "vatAmount", label: "VAT Amount", width: 130 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 260 },
    { key: "atcAmount", label: "ATC Amount", width: 130 },
    { key: "paytermCode", label: "Payment Terms", width: 130 },
    { key: "dueDate", label: "Due Date", width: 130 },
    ...(isPurchasesAPType ? [{ key: "autoAdv", label: "Auto Apply Advances", width: 145 }] : []),

    ...(showAppliedAdvancesColumns
      ? [
          {
            key: "advpoNo",
            label: "Applied Advances PO",
            width: 150,
          },
          {
            key: "advpoAmount",
            label: "Applied Advances Amt",
            width: 150,
          },
          {
            key: "advpoVatAmount",
            label: "Applied Advances VAT",
            width: 150,
          },
          {
            key: "advpoAtcAmount",
            label: "Applied Advances EWT",
            width: 150,
          },
        ]
      : []),

    ...(showAdvancesAccountColumn
      ? [
          {
            key: "advAcct",
            label: "Advances Account",
            width: 150,
          },
        ]
      : []),
  ];
  const apvDetailColumnDefs = isReplenishmentAPType ? replenishmentDetailColumnDefs : regularApvDetailColumnDefs;
  const apvDetailColumnMasterDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "invType", label: "Type", width: 70 },
    { key: "rrNo", label: isReplenishmentAPType ? "PCV No." : "RR No.", width: 120 },
    { key: "poNo", label: isImportationAPType ? "LC No" : "PO/JO No.", width: 120 },
    { key: "siNo", label: "Invoice No.", width: 120 },
    { key: "siDate", label: isReplenishmentAPType ? "PCV Date" : "Invoice Date", width: 130 },
    { key: "amount", label: isReplenishmentAPType ? "PCV Amt" : isAdvancesAPType ? "Advances Amount" : "Original Amount", width: 140 },
    { key: "currCode", label: isReplenishmentAPType ? "Curr" : "Currency", width: 90 },
    { key: "siAmount", label: "Invoice Amount", width: 130 },
    { key: "debitAcct", label: isReplenishmentAPType ? "DR Acct" : "DR Account", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "rcName", label: "RC Name", width: 260 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 260 },
    { key: "vatAmount", label: "VAT Amount", width: 130 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 260 },
    { key: "atcAmount", label: "ATC Amount", width: 130 },
    { key: "paytermCode", label: "Payment Terms", width: 130 },
    { key: "dueDate", label: "Due Date", width: 130 },
    { key: "autoAdv", label: "Auto Apply Advances", width: 145 },
    { key: "advpoNo", label: "Applied Advances PO", width: 150 },
    { key: "advpoAmount", label: "Applied Advances Amt", width: 150 },
    { key: "advpoVatAmount", label: "Applied Advances VAT", width: 150 },
    { key: "advpoAtcAmount", label: "Applied Advances EWT", width: 150 },
    { key: "advAcct", label: "Advances Account", width: 150 },
  ];
  const {
    getColumnStyle: getApvDetailColumnStyle,
    getOrderedColumns: getOrderedApvDetailColumns,
    renderHeaderContextMenu: renderApvDetailHeaderContextMenu,
    renderResizableHeader: renderApvDetailHeader,
  } = useResizableTableColumns(apvDetailColumnMasterDefs);
  const visibleApvDetailColumnMap = new Map(apvDetailColumnDefs.map((column) => [column.key, column]));
  const orderedApvDetailColumns = getOrderedApvDetailColumns(apvDetailColumnMasterDefs)
    .filter((column) => visibleApvDetailColumnMap.has(column.key))
    .map((column) => visibleApvDetailColumnMap.get(column.key));


  const getApvDetailCellStyle = (key, fallbackWidth) => getApvDetailColumnStyle(key, fallbackWidth);
  const apvGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 260 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "debit", label: `Debit (${glCurrDefault})`, width: 140 },
    { key: "credit", label: `Credit (${glCurrDefault})`, width: 140 },
    ...(withCurr2
      ? [
          { key: "debitFx1", label: `Debit (${withCurr3 ? glCurrGlobal2 : currencyCode})`, width: 140 },
          { key: "creditFx1", label: `Credit (${withCurr3 ? glCurrGlobal2 : currencyCode})`, width: 140 },
        ]
      : []),
    ...(withCurr3
      ? [
          { key: "debitFx2", label: `Debit (${glCurrGlobal3})`, width: 140 },
          { key: "creditFx2", label: `Credit (${glCurrGlobal3})`, width: 140 },
        ]
      : []),
    { key: "slRefNo", label: "SL Ref. No.", width: 120 },
    { key: "slrefDate", label: "SL Ref. Date", width: 130 },
    { key: "remarks", label: "Remarks", width: 240 },
  ];
  const {
    getColumnStyle: getApvGlColumnStyle,
    getOrderedColumns: getOrderedApvGlColumns,
    renderHeaderContextMenu: renderApvGlHeaderContextMenu,
    renderResizableHeader: renderApvGlHeader,
  } = useResizableTableColumns(apvGlColumnDefs);
  const orderedApvGlColumns = getOrderedApvGlColumns(apvGlColumnDefs);
  const orderedApvDetailColumnKeys = orderedApvDetailColumns.map((column) => column.key).join("|");
  const orderedApvGlColumnKeys = orderedApvGlColumns.map((column) => column.key).join("|");


  const getApvGlCellStyle = (key, fallbackWidth) => getApvGlColumnStyle(key, fallbackWidth);


    // The APV row markup is intentionally kept in its existing form because it
  // contains several conditional lookup cells. Reconcile those cells with the
  // hook's ordered/visible column state after each render so drag-and-drop and
  // Manage columns apply to the data rows as well as the header.
  useEffect(() => {
    const reconcileTableColumns = (tableSelector, columns) => {
      document.querySelectorAll(tableSelector).forEach((table) => {
        const visibleKeys = new Set(columns.map((column) => column.key));
        const orderedKeys = columns.map((column) => column.key);
        table.querySelectorAll("tbody tr").forEach((row) => {
          const cells = Array.from(row.children);
          const actionCell = !isFormDisabled ? cells.pop() : null;
          const definitionColumns = table.dataset.apvTableType === "detail" ? apvDetailColumnDefs : apvGlColumnDefs;
          const cellByKey = new Map();
          cells.forEach((cell, index) => {
            const key = cell.dataset.apvColumnKey || definitionColumns[index]?.key;
            if (!key) return;
            cell.dataset.apvColumnKey = key;
            cellByKey.set(key, cell);
          });
          orderedKeys.forEach((key) => {
            const cell = cellByKey.get(key);
            if (cell) {
              cell.style.display = visibleKeys.has(key) ? "" : "none";
              row.appendChild(cell);
            }
          });
          cellByKey.forEach((cell, key) => {
            if (!visibleKeys.has(key)) {
              cell.style.display = "none";
              row.appendChild(cell);
            }
          });
          if (actionCell) row.appendChild(actionCell);
        });
      });
    };

    reconcileTableColumns('table[data-apv-table-type="detail"]', orderedApvDetailColumns);
  }, [isFormDisabled, selectedApType, detailRows.length, orderedApvDetailColumnKeys, orderedApvGlColumnKeys]);
  const hasSelectedReference = detailRows.some((row) =>
    String(
      row.advpoNo ||
        row.rrNo ||
        row.poNo ||
        row.joNo ||
        row.rrId ||
        row.pcvNo ||
        row.pcvId ||
        row.lcId ||
        row.lcNo ||
        "",
    ).trim(),
  );
  const openReferenceLabel = isImportationAPType
    ? "Open Reference LC"
    : isReplenishmentAPType
      ? "Open Reference PCV"
      : isAdvancesAPType
        ? "Open Reference PO / JO"
        : "Open Reference RR";
  const openReferenceDescription = isImportationAPType
    ? "Pull LC Importation details"
    : isReplenishmentAPType
      ? "Pull PCV details"
      : isAdvancesAPType
        ? "Pull PO or JO advances"
        : "Pull RR details";

  // PAGE AND MODAL LAYOUT

  return (
    <div className="global-tran-main-div-ui">
      {/* Loading spinner overlay */}
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          onPrintBIR={handlePrint2307}
          birFormLabel="BIR Form"
          onPost={handlePost}
          printData={printData}
          onReset={handleReset}
          onSave={() => handleActivityOption("Upsert")}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={true}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/APV"
          isSaveDisabled={state.isSaveDisabled || isFormDisabled}
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || normalizedStatus === "CANCELLED"}
          isPrintBIRDisabled={
            !documentID ||
            String(displayStatus || "")
              .trim()
              .toUpperCase() !== "FINALIZED" ||
            !(detailRowsGL || []).some(
              (row) =>
                String(row.atcCode || "").trim() !== "" && ((parseFormattedNumber(row.debit) || 0) !== 0 || (parseFormattedNumber(row.credit) || 0) !== 0),
            )
          }
          isCopyDisabled={!documentID || normalizedStatus === "CANCELLED"}
          isCancelDisabled={!documentID || normalizedStatus === "CANCELLED" || normalizedStatus === "FINALIZED"}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        {/* Page title and subheading */}
        {/* Header Section */}
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>

          <div className="global-tran-headerstat-div-ui">
            <div>
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{normalizedStatus}</h1>
            </div>
          </div>
        </div>

        {/* Form Layout with Tabs */}
        <div className="global-tran-header-div-ui">
          {/* Tab Navigation */}
          <div className="global-tran-header-tab-div-ui">
            <button
              className={`global-tran-tab-padding-ui ${activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
              onClick={() => updateState({ activeTab: "basic" })}
            >
              Basic Information
            </button>
          </div>

          {/* APV Header Form Section */}
          <div id="apv_hd" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative">
            {/* Column 1 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                type="lookup"
                value={branchName || ""}
                disabled={isFormDisabled}
                onLookup={() => updateState({ branchModalOpen: true })}
              />

              {/* APV Number Field */}
              <FieldRenderer
                id="apvNo"
                label="APV No."
                type="lookup"
                value={documentNo || ""}
                disabled={isDocNoDisabled}
                onChange={(val) => updateState({ documentNo: val })}
                onBlur={handleDocumentNoBlur}
                onLookup={() => updateState({ showAllTranDocNo: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleDocumentNoBlur();
                  }
                }}
              />

              {/* APV Date Picker */}
              <div className="relative w-full">
                <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                  <DateFormatInput
                    id="apvDate"
                    className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                    value={header.apvDate}
                    disabled={isFormDisabled}
                    updateState={(updates) => {
                      if (updates.apvDate !== undefined) {
                        recalculateDueDatesByApvDate(updates.apvDate);
                      }
                    }}
                  />
                </div>

                <label htmlFor="apvDate" className={`global-ref-floating-label ${!isFormDisabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}>
                  APV Date
                </label>
              </div>
            </div>

            {/* Column 2 */}
            <div className="global-tran-textbox-group-div-ui">
              {/* Payee Code Input with optional lookup */}
              <FieldRenderer
                id="payeeCode"
                label="Payee Code"
                required
                type="lookup"
                value={vendName?.vendCode || ""}
                disabled={isFormDisabled}
                onLookup={() => handleOpenPayeeLookup()}
              />

              {/* Payee Name Display */}
              <FieldRenderer id="payeeName" label="Payee Name" required type="text" value={vendName?.vendName || ""} disabled={true} onChange={() => {}} />

              {/* AP Account Code Input */}
              <FieldRenderer
                id="apAccountName"
                label="AP Account"
                type="lookup"
                value={apAccountName || ""}
                disabled={isFormDisabled}
                onLookup={() =>
                  updateState({
                    showAccountModal: true,
                    accountModalSource: "apAccount",
                  })
                }
              />
              <input type="hidden" id="apAccountCode" value={apAccountCode || ""} />
            </div>

            {/* Column 3 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="currCode"
                label="Currency"
                type="text"
                value={currencyCode ? `${currencyCode}${currencyName ? ` - ${currencyName}` : ""}` : ""}
                disabled
              />

              <FieldRenderer
                id="currRate"
                label="Currency Rate"
                type="amount"
                value={currencyRate || ""}
                disabled={isFormDisabled || currencyCode === glCurrDefault}
                onChange={(val) => updateState({ currencyRate: val })}
              />

              <FieldRenderer
                id="selectedApType"
                label="AP Type"
                type="select"
                value={selectedApType}
                disabled={isFormDisabled || hasSelectedReference}
                onChange={(val) => handleAPTypeChange({ target: { value: val } })}
                options={apTypes.map((type) => ({ label: type.dropdownName, value: type.dropdownCode }))}
              />
            </div>

            {/* Column 4 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="refDocNo1"
                label="Ref Doc No. 1"
                type="text"
                value={header.refDocNo1 || ""}
                disabled={isFormDisabled}
                maxLength={25}
                onChange={(val) =>
                  updateState({
                    header: { ...header, refDocNo1: val },
                  })
                }
              />

              <FieldRenderer
                id="refDocNo2"
                label="Ref Doc No. 2"
                type="text"
                value={header.refDocNo2 || ""}
                disabled={isFormDisabled}
                maxLength={25}
                onChange={(val) =>
                  updateState({
                    header: { ...header, refDocNo2: val },
                  })
                }
              />
            </div>

            {/* Remarks Section */}
            {/* Column 4 - Remarks */}
            <div className="col-span-full">
              <div className="relative w-full p-2">
                <textarea
                  id="remarks"
                  placeholder=" "
                  rows={5}
                  className="peer global-tran-textbox-remarks-ui pt-2"
                  value={header.remarks || ""}
                  maxLength={4000}
                  onChange={(e) =>
                    updateState({
                      header: { ...header, remarks: e.target.value },
                    })
                  }
                  disabled={isFormDisabled}
                />
                <label htmlFor="remarks" className="global-tran-floating-label-remarks">
                  Remarks
                </label>
              </div>
            </div>
          </div>
        </div>
        <br />

        {fieldVisibility.invoiceDetails && (
          <>
            {/* APV Detail Section */}
            <div id="apv_dtl" className="global-tran-tab-div-ui">
              {/* Tab Navigation */}
              <div className="global-tran-tab-nav-ui">
                {/* Tabs */}
                <div className="flex flex-row sm:flex-row">
                  <button
                    className={`global-tran-tab-padding-ui ${
                      GLactiveTab === "invoice" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"
                    }`}
                    onClick={() => updateState({ GLactiveTab: "invoice" })}
                    disabled={isFormDisabled}
                  >
                    Invoice Details
                  </button>
                </div>
              </div>

              {/* Invoice Details Button */}
              <div className="global-tran-table-main-div-ui">
                <div className="global-tran-table-main-sub-div-ui">
                  <table data-apv-table-type="detail" className="min-w-full table-fixed border-collapse [&_input]:w-full [&_select]:w-full">
                    <colgroup>
                      {orderedApvDetailColumns.map((column) => (
                        <col key={column.key} style={getApvDetailCellStyle(column.key, column.width)} />
                      ))}

                      {!isFormDisabled && <col style={transactionActionsCellStyle} />}
                    </colgroup>
                    <thead className="global-tran-thead-div-ui">
                      <tr>
                        {orderedApvDetailColumns.map((column) =>
                          renderApvDetailHeader(column.label, column.key, column.width, {
                            orderedColumns: orderedApvDetailColumns,
                          }),
                        )}
                        {!isFormDisabled && (
                          <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30" style={transactionActionsHeaderStyle}>
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {detailRows.map((row, index) =>
                        isReplenishmentAPType ? (
                          <tr key={index} className="global-tran-tr-ui">
                            {/* LN */}
                            <td data-apv-column-key="ln" className="global-tran-td-ui text-center">
                              {index + 1}
                            </td>

                            {/* Type */}
                            <td data-apv-column-key="invType" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-full global-tran-td-inputclass-ui text-center"
                                value={row.invType || "PCV"}
                                readOnly
                                disabled={isFormDisabled}
                              />
                            </td>

                            {/* PCV No. */}
                            <td data-apv-column-key="rrNo" className="global-tran-td-ui">
                              <input type="text" className="w-full global-tran-td-inputclass-ui" value={row.rrNo || ""} readOnly disabled={isFormDisabled} />
                            </td>

                            {/* PCV Date */}
                            <td data-apv-column-key="siDate" className="global-tran-td-ui">
                              <div className="w-[110px]">
                                <DateFormatInput
                                  id={`siDate_${index}`}
                                  value={row.siDate || ""}
                                  disabled={isFormDisabled || Boolean(row.apAdvId || row.advpoNo)}
                                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                                  updateState={(updates) => {
                                    if (updates[`siDate_${index}`] !== undefined) {
                                      handleDetailChange(index, "siDate", updates[`siDate_${index}`], false);
                                    }
                                  }}
                                />
                              </div>
                            </td>

                            {/* PCV Amount */}
                            <td data-apv-column-key="amount" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-full global-tran-td-inputclass-ui text-right"
                                value={row.amount || "0.00"}
                                readOnly
                                disabled={isFormDisabled}
                              />
                            </td>

                            {/* Currency */}
                            <td data-apv-column-key="currCode" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-full global-tran-td-inputclass-ui text-center"
                                value={currencyCode || vendName?.currCode || "PHP"}
                                readOnly
                                disabled={isFormDisabled}
                              />
                            </td>

                            {/* Invoice Amount */}
                            <td data-apv-column-key="siAmount" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-full global-tran-td-inputclass-ui text-right"
                                value={row.siAmount || row.amount || "0.00"}
                                readOnly
                                disabled={isFormDisabled}
                              />
                            </td>

                            {/* DR Account */}
                            <td data-apv-column-key="debitAcct" className="global-tran-td-ui relative">
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  className="w-full global-tran-td-inputclass-ui text-center pr-6"
                                  value={row.debitAcct || ""}
                                  readOnly
                                  disabled={isFormDisabled}
                                />

                                {!isFormDisabled && (
                                  <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                    onClick={() => {
                                      updateState({
                                        selectedRowIndex: index,
                                        showAccountModal: true,
                                        accountModalSource: "debitAcct",
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            </td>

                            {/* RC Code */}
                            <td data-apv-column-key="rcCode" className="global-tran-td-ui relative">
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  className="w-full global-tran-td-inputclass-ui text-center pr-6"
                                  value={row.rcCode || ""}
                                  readOnly
                                  disabled={isFormDisabled}
                                />

                                {!isFormDisabled && (row.recRc === "Y" || row.rcCode === "REQ RC") && (
                                  <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                    onClick={() => {
                                      updateState({
                                        selectedRowIndex: index,
                                        showRcModal: true,
                                        accountModalSource: "rcCode",
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            </td>

                            {/* RC Name */}
                            <td data-apv-column-key="rcName" className="global-tran-td-ui">
                              <input type="text" className="w-full global-tran-td-inputclass-ui" value={row.rcName || ""} readOnly disabled={isFormDisabled} />
                            </td>

                            {!isFormDisabled && (
                              <td className="global-tran-td-ui text-center sticky right-0" style={transactionActionsCellStyle}>
                                <div className="flex items-center justify-center gap-1">
                                  <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRow(index)}>
                                    <FontAwesomeIcon icon={faTrashAlt} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ) : (
                          <tr key={index} className="global-tran-tr-ui">
                            <td data-apv-column-key="ln" className="global-tran-td-ui text-center">
                              {index + 1}
                            </td>
                            {fieldVisibility.invType && (
                              <td data-apv-column-key="invType" className="global-tran-td-ui">
                                <select
                                  className="w-[50px] global-tran-td-inputclass-ui"
                                  value={row.invType || ""}
                                  onChange={(e) => handleDetailChange(index, "invType", e.target.value, false)}
                                  disabled={isFormDisabled || isLcSourcedImportationRow(row)}
                                >
                                  <option value=""></option>
                                  {isImportationAPType && <option value="LC">LC</option>}
                                  <option value="FG">FG</option>
                                  <option value="MS">MS</option>
                                  <option value="RM">RM</option>
                                  <option value="VE">VE</option>
                                  {selectedApType === "APV01" && <option value="JO">JO</option>}
                                  {isAdvancesAPType && <option value="PO">PO</option>}
                                  {isAdvancesAPType && <option value="JO">JO</option>}
                                </select>
                              </td>
                            )}
                            {fieldVisibility.rrNo && !isImportationAPType && (
                              <td data-apv-column-key="rrNo" className="global-tran-td-ui">
                                <input
                                  type="text"
                                  className="w-[100px] global-tran-td-inputclass-ui"
                                  value={row.rrNo || ""}
                                  maxLength={25}
                                  onChange={(e) => handleDetailChange(index, "rrNo", e.target.value, false)}
                                  disabled={isFormDisabled}
                                />
                              </td>
                            )}
                            {fieldVisibility.poNo && (
                              <td data-apv-column-key="poNo" className="global-tran-td-ui">
                                <input
                                  type="text"
                                  className="w-[100px] global-tran-td-inputclass-ui"
                                  value={row.poNo || ""}
                                  maxLength={25}
                                  onChange={(e) => handleDetailChange(index, "poNo", e.target.value, false)}
                                  disabled={isFormDisabled || isLcSourcedImportationRow(row) || Boolean(row.apAdvId || row.advpoNo)}
                                />
                              </td>
                            )}
                            {fieldVisibility.siNo && (
                              <td data-apv-column-key="siNo" className="global-tran-td-ui">
                                <input
                                  type="text"
                                  className="w-[100px] global-tran-td-inputclass-ui"
                                  value={row.siNo || ""}
                                  maxLength={25}
                                  onChange={(e) => handleDetailChange(index, "siNo", e.target.value, false)}
                                  disabled={isFormDisabled || isLcSourcedImportationRow(row)}
                                />
                              </td>
                            )}
                            {fieldVisibility.siDate && (
                              <td data-apv-column-key="siDate" className="global-tran-td-ui">
                                <div className="w-[110px]">
                                  <DateFormatInput
                                    id={`siDate_${index}`}
                                    value={row.siDate || ""}
                                    disabled={isFormDisabled || isLcSourcedImportationRow(row)}
                                    className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                                    updateState={(updates) => {
                                      if (updates[`siDate_${index}`] !== undefined) {
                                        handleDetailChange(index, "siDate", updates[`siDate_${index}`], false);
                                      }
                                    }}
                                  />
                                </div>
                              </td>
                            )}
                            <td data-apv-column-key="amount" className="global-tran-td-ui">
                              <input
                                type="text"
                                ref={(el) => (amountRefs.current[index] = el)}
                                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                                value={row.amount}
                                disabled={isFormDisabled || isLcSourcedImportationRow(row)}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^-?\d{0,12}(\.\d{0,2})?$/.test(value) || value === "") {
                                    handleDetailChange(index, "amount", value, false);
                                  }
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const value = e.target.value;
                                    const num = parseFormattedNumber(value);
                                    if (!isNaN(num)) {
                                      await handleDetailChange(index, "amount", num.toFixed(2), true);
                                      amountRefs.current[index + 1]?.focus();
                                    }
                                  }
                                }}
                                onFocus={(e) => {
                                  if (isFormDisabled) return;
                                  if (e.target.value === "0.00" || e.target.value === "0") {
                                    handleDetailChange(index, "amount", "", false);
                                  }
                                  setTimeout(() => e.target.select(), 0);
                                }}
                                onBlur={async (e) => {
                                  if (isFormDisabled) return;
                                  const value = e.target.value;
                                  const num = parseFormattedNumber(value);
                                  if (!isNaN(num)) {
                                    await handleDetailChange(index, "amount", num.toFixed(2), true);
                                  }
                                }}
                              />
                            </td>
                            <td data-apv-column-key="currCode" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[80px] global-tran-td-inputclass-ui text-center"
                                value={vendName?.currCode ? `${vendName.currCode}` : "PHP"}
                                readOnly
                                disabled={isFormDisabled}
                              />
                            </td>
                            <td data-apv-column-key="siAmount" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                                value={row.siAmount || row.amount || ""}
                                readOnly
                                disabled={isFormDisabled}
                              />
                            </td>
                            {showDrAccountColumn && (
                              <>
                                {/* DR Account */}
                                <td data-apv-column-key="debitAcct" className="global-tran-td-ui relative">
                                  <div className="flex items-center">
                                    <input
                                      type="text"
                                      className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                      value={row.debitAcct || ""}
                                      readOnly
                                      disabled={isFormDisabled || isLcSourcedImportationRow(row)}
                                    />
                                    {!isFormDisabled && !isLcSourcedImportationRow(row) && (
                                      <FontAwesomeIcon
                                        icon={faMagnifyingGlass}
                                        className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                        onClick={() => {
                                          updateState({
                                            selectedRowIndex: index,
                                            showAccountModal: true,
                                            accountModalSource: "debitAcct",
                                          });
                                        }}
                                      />
                                    )}
                                  </div>
                                </td>
                              </>
                            )}
                            {/* RC Code */}
                            <td data-apv-column-key="rcCode" className="global-tran-td-ui relative">
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                  value={row.rcCode || ""}
                                  readOnly
                                  disabled={isFormDisabled || isLcSourcedImportationRow(row)}
                                />
                                {!isFormDisabled && !isLcSourcedImportationRow(row) && (row.recRc === "Y" || row.rcCode === "REQ RC") && (
                                  <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                    onClick={() => {
                                      updateState({
                                        selectedRowIndex: index,
                                        showRcModal: true,
                                        accountModalSource: "rcCode",
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            </td>
                            <td data-apv-column-key="rcName" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[250px] global-tran-td-inputclass-ui"
                                value={row.rcName || ""}
                                readOnly
                                disabled={isFormDisabled}
                              />
                            </td>
                            {fieldVisibility.sltypeCode && (
                              <td data-apv-column-key="sltypeCode" className="global-tran-td-ui">
                                <input
                                  type="text"
                                  className="w-[100px] global-tran-td-inputclass-ui"
                                  value={row.sltypeCode || ""}
                                  onChange={(e) => handleDetailChange(index, "sltypeCode", e.target.value, false)}
                                  disabled={isFormDisabled}
                                />
                              </td>
                            )}
                            {/* SL Code */}
                            <td data-apv-column-key="slCode" className="global-tran-td-ui relative">
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                  value={row.slCode || ""}
                                  readOnly
                                  disabled={isFormDisabled || isLcSourcedImportationRow(row)}
                                />
                                {!isFormDisabled && !isLcSourcedImportationRow(row) && (row.recSl === "Y" || row.slCode === "REQ SL") && (
                                  <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                    onClick={() => {
                                      updateState({
                                        selectedRowIndex: index,
                                        showSlModal: true,
                                        accountModalSource: "slCode",
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            </td>
                            {/* VAT Code */}
                            <td data-apv-column-key="vatCode" className="global-tran-td-ui relative">
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                  value={row.vatCode || ""}
                                  readOnly
                                  disabled={isFormDisabled || isLcSourcedImportationRow(row)}
                                />
                                {!isFormDisabled && !isLcSourcedImportationRow(row) && (
                                  <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                    onClick={() => {
                                      updateState({
                                        selectedRowIndex: index,
                                        showVatModal: true,
                                        accountModalSource: "vatCode",
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            </td>

                            {/* VAT Name */}
                            <td data-apv-column-key="vatName" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[250px] global-tran-td-inputclass-ui"
                                value={row.vatName || ""}
                                readOnly
                                disabled={isFormDisabled}
                                onDoubleClick={() => handleVatNameDoubleClick(index)}
                              />
                            </td>

                            {/* VAT Amount */}
                            <td data-apv-column-key="vatAmount" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                                value={formatNumber(parseFormattedNumber(row.vatAmount)) || formatNumber(parseFormattedNumber(row.vatAmount)) || ""}
                                readOnly
                              />
                            </td>

                            {/* ATC Code */}
                            <td data-apv-column-key="atcCode" className="global-tran-td-ui relative">
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                  value={row.atcCode || ""}
                                  readOnly
                                />
                                {!isFormDisabled && (
                                  <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                    onClick={() => {
                                      updateState({
                                        selectedRowIndex: index,
                                        showAtcModal: true,
                                        accountModalSource: "atcCode",
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            </td>

                            {/* ATC Name */}
                            <td data-apv-column-key="atcName" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[250px] global-tran-td-inputclass-ui"
                                value={row.atcName || ""}
                                readOnly
                                disabled={isFormDisabled}
                                onDoubleClick={() => handleAtcNameDoubleClick(index)}
                              />
                            </td>

                            {/* ATC Amount */}
                            <td data-apv-column-key="atcAmount" className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                                value={formatNumber(parseFormattedNumber(row.atcAmount)) || formatNumber(parseFormattedNumber(row.atcAmount)) || ""}
                                onChange={(e) => handleDetailChange(index, "atcAmount", e.target.value)}
                                readOnly
                              />
                            </td>

                            <td data-apv-column-key="paytermCode" className="global-tran-td-ui relative">
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6"
                                  value={row.paytermCode || ""}
                                  readOnly
                                  onDoubleClick={() => handlePaytermDoubleClick(index)}
                                  disabled={isFormDisabled}
                                />
                                {!isFormDisabled && (
                                  <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                    onClick={() => {
                                      updateState({
                                        selectedRowIndex: index,
                                        showPaytermModal: true,
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            </td>
                            <td data-apv-column-key="dueDate" className="global-tran-td-ui">
                              <div className="w-[110px]">
                                <DateFormatInput
                                  id={`dueDate_${index}`}
                                  value={row.dueDate || ""}
                                  disabled={isFormDisabled}
                                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                                  updateState={(updates) => {
                                    if (updates[`dueDate_${index}`] !== undefined) {
                                      handleDetailChange(index, "dueDate", updates[`dueDate_${index}`], false);
                                    }
                                  }}
                                />
                              </div>
                            </td>

                            {isPurchasesAPType && (
                              <td data-apv-column-key="autoAdv" className="global-tran-td-ui">
                                <button
                                  type="button"
                                  className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${row.autoAdv !== "N" ? "border-blue-500 bg-blue-500/15 text-blue-700" : "border-slate-300 bg-white text-slate-600"} ${isFormDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                                  disabled={isFormDisabled}
                                  onClick={() => handleDetailChange(index, "autoAdv", row.autoAdv !== "N" ? "N" : "Y", false)}
                                >
                                  {row.autoAdv !== "N" ? "Yes" : "No"}
                                </button>
                              </td>
                            )}

                            {showAppliedAdvancesColumns && (
                              <>
                                {/* Applied Advances PO */}
                                <td data-apv-column-key="advpoNo" className="global-tran-td-ui">
                                  <input
                                    type="text"
                                    className="w-[120px] global-tran-td-inputclass-ui"
                                    value={row.advpoNo || ""}
                                    maxLength={50}
                                    onChange={(e) => handleDetailChange(index, "advpoNo", e.target.value, false)}
                                    disabled={isFormDisabled || row.autoAdv !== "N"}
                                  />
                                </td>

                                {/* Applied Advances Amount */}
                                <td data-apv-column-key="advpoAmount" className="global-tran-td-ui">
                                  <input
                                    type="text"
                                    ref={(el) => (advanceAmountRefs.current[index] = el)}
                                    className="w-[120px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                                    value={row.advpoAmount ?? "0.00"}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (/^\d{0,12}(\.\d{0,2})?$/.test(value) || value === "") {
                                        handleDetailChange(index, "advpoAmount", value, false);
                                      }
                                    }}
                                    onFocus={(e) => {
                                      if (isFormDisabled) return;
                                      if (e.target.value === "0.00" || e.target.value === "0") {
                                        handleDetailChange(index, "advpoAmount", "", false);
                                      }
                                      setTimeout(() => e.target.select(), 0);
                                    }}
                                    onBlur={(e) => {
                                      if (isFormDisabled) return;
                                      commitManualAdvanceAmount(index, "advpoAmount", e.target.value);
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key !== "Enter") return;
                                      e.preventDefault();
                                      if (commitManualAdvanceAmount(index, "advpoAmount", e.currentTarget.value)) {
                                        advanceAmountRefs.current[index + 1]?.focus();
                                      }
                                    }}
                                    disabled={isFormDisabled || row.autoAdv !== "N"}
                                  />
                                </td>

                                {/* Applied Advances VAT */}
                                <td data-apv-column-key="advpoVatAmount" className="global-tran-td-ui">
                                  <input
                                    type="text"
                                    ref={(el) => (advanceVatRefs.current[index] = el)}
                                    className="w-[120px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                                    value={row.advpoVatAmount ?? "0.00"}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (/^\d{0,12}(\.\d{0,2})?$/.test(value) || value === "") {
                                        handleDetailChange(index, "advpoVatAmount", value, false);
                                      }
                                    }}
                                    onFocus={(e) => {
                                      if (isFormDisabled) return;
                                      if (e.target.value === "0.00" || e.target.value === "0") {
                                        handleDetailChange(index, "advpoVatAmount", "", false);
                                      }
                                      setTimeout(() => e.target.select(), 0);
                                    }}
                                    onBlur={(e) => {
                                      if (isFormDisabled) return;
                                      commitManualAdvanceAmount(index, "advpoVatAmount", e.target.value);
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key !== "Enter") return;
                                      e.preventDefault();
                                      if (commitManualAdvanceAmount(index, "advpoVatAmount", e.currentTarget.value)) {
                                        advanceVatRefs.current[index + 1]?.focus();
                                      }
                                    }}
                                    disabled={isFormDisabled || row.autoAdv !== "N"}
                                  />
                                </td>
                                {/* Applied Advances EWT */}
                                <td data-apv-column-key="advpoAtcAmount" className="global-tran-td-ui">
                                  <input
                                    type="text"
                                    ref={(el) => (advanceAtcRefs.current[index] = el)}
                                    className="w-[120px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                                    value={row.advpoAtcAmount ?? "0.00"}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (/^\d{0,12}(\.\d{0,2})?$/.test(value) || value === "") {
                                        handleDetailChange(index, "advpoAtcAmount", value, false);
                                      }
                                    }}
                                    onFocus={(e) => {
                                      if (isFormDisabled) return;
                                      if (e.target.value === "0.00" || e.target.value === "0") {
                                        handleDetailChange(index, "advpoAtcAmount", "", false);
                                      }
                                      setTimeout(() => e.target.select(), 0);
                                    }}
                                    onBlur={(e) => {
                                      if (isFormDisabled) return;
                                      commitManualAdvanceAmount(index, "advpoAtcAmount", e.target.value);
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key !== "Enter") return;
                                      e.preventDefault();
                                      if (commitManualAdvanceAmount(index, "advpoAtcAmount", e.currentTarget.value)) {
                                        advanceAtcRefs.current[index + 1]?.focus();
                                      }
                                    }}
                                    disabled={isFormDisabled || row.autoAdv !== "N"}
                                  />
                                </td>
                              </>
                            )}

                            {showAdvancesAccountColumn && (
                              <>
                                {/* Advances Account */}
                                <td data-apv-column-key="advAcct" className="global-tran-td-ui relative">
                                  <div className="flex items-center">
                                    <input
                                      type="text"
                                      className="w-[120px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                      value={row.advAcct || ""}
                                      readOnly
                                      disabled={isFormDisabled || row.autoAdv !== "N"}
                                    />
                                    {!isFormDisabled && row.autoAdv === "N" && (
                                      <FontAwesomeIcon
                                        icon={faMagnifyingGlass}
                                        className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                        onClick={() => {
                                          updateState({
                                            selectedRowIndex: index,
                                            showAccountModal: true,
                                            accountModalSource: "advAcct",
                                          });
                                        }}
                                      />
                                    )}
                                  </div>
                                </td>
                              </>
                            )}

                            {!isFormDisabled && (
                              <td className="global-tran-td-ui text-center sticky right-0" style={transactionActionsCellStyle}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    className="global-tran-td-button-add-ui"
                                    onClick={() => {
                                      if (!vendCode) {
                                        handleOpenPayeeLookup("addPayeeDetail");
                                        return;
                                      }
                                      handleInsertDetailRowClick(index);
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faPlus} />
                                  </button>

                                  <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRow(index)}>
                                    <FontAwesomeIcon icon={faTrashAlt} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                  {renderApvDetailHeaderContextMenu()}
                </div>
              </div>

              {/* Invoice Details Footer */}
              <div className="global-tran-tab-footer-main-div-ui">
                {/* Add Button */}
                <div className="global-tran-tab-footer-button-div-ui">
                  <div className="relative inline-block">
                    {showInvoiceAddDropdown && (
                      <div className="absolute bottom-[110%] left-0 mb-2 z-[9999] w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">Invoice Details</div>
                        </div>

                        <div className="p-1.5">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                            onClick={handleAddInvoiceRow}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <FontAwesomeIcon icon={faPlus} />
                              </span>
                              <div className="flex flex-col items-start">
                                <span>Add Row</span>
                                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">Add invoice line</span>
                              </div>
                            </div>
                          </button>

                          <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />

                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                            onClick={() => {
                              setShowInvoiceAddDropdown(false);
                              if (isImportationAPType) {
                                handleOpenReferenceLCImportation();
                              } else if (isReplenishmentAPType) {
                                handleOpenReferencePCV();
                              } else if (isAdvancesAPType) {
                                handleOpenReferencePOAdvance();
                              } else {
                                handleOpenReferenceRR();
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                                <FontAwesomeIcon icon={faFileLines} />
                              </span>
                              <div className="flex flex-col items-start">
                                <span>{openReferenceLabel}</span>
                                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">{openReferenceDescription}</span>
                              </div>
                            </div>
                          </button>

                          {isPurchasesAPType && (
                            <>
                              <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />

                              <button
                                type="button"
                                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition-all duration-150 hover:bg-indigo-50 hover:text-indigo-900 dark:text-indigo-300 dark:hover:bg-slate-700"
                                onClick={() => {
                                  setShowInvoiceAddDropdown(false);
                                  handleOpenReferenceJO();
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-indigo-300">
                                    <FontAwesomeIcon icon={faFileLines} />
                                  </span>
                                  <div className="flex flex-col items-start">
                                    <span>Open JO Reference</span>
                                    <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">Select an open Job Order</span>
                                  </div>
                                </div>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleInvoiceAddClick}
                      className={`global-tran-tab-footer-button-add-ui ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      disabled={isFormDisabled}
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Totals Section */}
                <div className="global-tran-tab-footer-total-main-div-ui">
                  {/* Total Invoice Amount */}
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">Total Invoice Amount:</label>
                    <label id="totalInvoiceAmount" className="global-tran-tab-footer-total-value-ui">
                      0.00
                    </label>
                  </div>

                  {/* Total VAT Amount */}
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">Total VAT Amount:</label>
                    <label id="totalVATAmount" className="global-tran-tab-footer-total-value-ui">
                      0.00
                    </label>
                  </div>

                  {/* Total ATC Amount */}
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">Total ATC Amount:</label>
                    <label id="totalATCAmount" className="global-tran-tab-footer-total-value-ui">
                      0.00
                    </label>
                  </div>

                  {/* Total Payable Amount (Invoice - ATC) */}
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">Total Payable Amount:</label>
                    <label id="totalPayableAmount" className="global-tran-tab-footer-total-value-ui">
                      0.00
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* General Ledger Button */}
        <div className="global-tran-tab-div-ui">
          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">
            {/* Tabs */}
            <div className="flex flex-row sm:flex-row">
              <button
                className={`global-tran-tab-padding-ui ${GLactiveTab === "invoice" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
                onClick={() => updateState({ GLactiveTab: "invoice" })}
              >
                General Ledger
              </button>
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <button
                onClick={() => handleActivityOption("GenerateGL")}
                className={`global-tran-tab-footer-button-add-ui ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isLoading || isFormDisabled}
              >
                {isLoading ? "Generating..." : "Generate GL Entries"}
              </button>
            </div>
          </div>

          {/* GL Details Table */}
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full table-fixed border-collapse [&_input]:w-full [&_select]:w-full">
                <colgroup>
                  {apvGlColumnDefs.map((column) => (
                    <col key={column.key} style={getApvGlCellStyle(column.key, column.width)} />
                  ))}
                  {!isFormDisabled && <col style={transactionActionsCellStyle} />}
                </colgroup>
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {apvGlColumnDefs.map((column) => renderApvGlHeader(column.label, column.key, column.width))}

                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30" style={transactionActionsHeaderStyle}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {detailRowsGL.map((row, index) => (
                    <tr key={index} className="global-tran-tr-ui">
                      <td className="global-tran-td-ui text-center">{index + 1}</td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.acctCode || ""}
                            onChange={(e) => handleDetailChangeGL(index, "acctCode", e.target.value)}
                            disabled={isFormDisabled}
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
                            onChange={(e) => handleDetailChangeGL(index, "rcCode", e.target.value)}
                            readOnly
                            disabled={isFormDisabled}
                          />
                          {!isFormDisabled && (row.rcCode === "REQ RC" || (row.rcCode && row.rcCode !== "REQ RC")) && (
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
                          onChange={(e) => handleDetailChangeGL(index, "sltypeCode", e.target.value)}
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.slCode || ""}
                            onChange={(e) => handleDetailChangeGL(index, "slCode", e.target.value)}
                            readOnly
                            disabled={isFormDisabled}
                          />
                          {!isFormDisabled && (row.slCode === "REQ SL" || row.slCode) && (
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
                        <div className="relative inline-block">
                          {/* Hidden span to measure text width */}
                          <span className="invisible absolute whitespace-pre px-2">{row.particular || " "}</span>

                          <input
                            type="text"
                            className="global-tran-td-inputclass-ui"
                            style={{
                              width: `${(row.particular?.length || 1) * 7}px`,
                            }}
                            value={row.particular || ""}
                            onChange={(e) => handleDetailChangeGL(index, "particular", e.target.value)}
                            disabled={isFormDisabled}
                          />
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.vatCode || ""}
                            onChange={(e) => handleDetailChangeGL(index, "vatCode", e.target.value)}
                            readOnly
                            disabled={isFormDisabled}
                          />
                          {!isFormDisabled && row.vatCode && row.vatCode.length > 0 && (
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
                        <input type="text" className="w-[200px] global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly disabled={isFormDisabled} />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.atcCode || ""}
                            onChange={(e) => handleDetailChangeGL(index, "atcCode", e.target.value)}
                            readOnly
                            disabled={isFormDisabled}
                          />
                          {!isFormDisabled && (row.atcCode !== "" || row.atcCode) && (
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
                          onChange={(e) => handleDetailChangeGL(index, "atcName", e.target.value)}
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debit || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                              handleDetailChangeGL(index, "debit", sanitizedValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(index, "debit", e.target.value, true);
                            }
                          }}
                          onFocus={(e) => {
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debit", "");
                            }
                          }}
                          onBlur={(e) => handleBlurGL(index, "debit", e.target.value)}
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.credit || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                              handleDetailChangeGL(index, "credit", sanitizedValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(index, "credit", e.target.value, true);
                            }
                          }}
                          onFocus={(e) => {
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "credit", "");
                            }
                          }}
                          onBlur={(e) => handleBlurGL(index, "credit", e.target.value)}
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}>
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx1 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                              handleDetailChangeGL(index, "debitFx1", sanitizedValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(index, "debitFx1", e.target.value, true);
                            }
                          }}
                          onFocus={(e) => {
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx1", "");
                            }
                          }}
                          onBlur={(e) => handleBlurGL(index, "debitFx1", e.target.value)}
                          disabled={isFormDisabled}
                        />
                      </td>
                      <td className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}>
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx1 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                              handleDetailChangeGL(index, "creditFx1", sanitizedValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(index, "creditFx1", e.target.value, true);
                            }
                          }}
                          onFocus={(e) => {
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx1", "");
                            }
                          }}
                          onBlur={(e) => handleBlurGL(index, "creditFx1", e.target.value)}
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}>
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx2 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                              handleDetailChangeGL(index, "debitFx2", sanitizedValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(index, "debitFx2", e.target.value, true);
                            }
                          }}
                          onFocus={(e) => {
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx2", "");
                            }
                          }}
                          onBlur={(e) => handleBlurGL(index, "debitFx2", e.target.value)}
                          disabled={isFormDisabled}
                        />
                      </td>
                      <td className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}>
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx2 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                              handleDetailChangeGL(index, "creditFx2", sanitizedValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(index, "creditFx2", e.target.value, true);
                            }
                          }}
                          onFocus={(e) => {
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx2", "");
                            }
                          }}
                          onBlur={(e) => handleBlurGL(index, "creditFx2", e.target.value)}
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.slRefNo || ""}
                          maxLength={25}
                          onChange={(e) => handleDetailChangeGL(index, "slRefNo", e.target.value)}
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="w-[110px]">
                          <input
                            type="text"
                            id={`slrefDate_${index}`}
                            value={row.slrefDate || ""}
                            disabled={isFormDisabled}
                            placeholder="MM/DD/YYYY"
                            maxLength={10}
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                            onChange={(e) => handleSlrefDateChange(index, e.target.value)}
                            onBlur={(e) => handleSlrefDateBlur(index, e.target.value)}
                          />
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative flex w-[220px] items-center">
                          <input
                            type="text"
                            className="w-full truncate pr-8 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.remarks || header.remarks || ""}
                            onChange={(e) => handleDetailChangeGL(index, "remarks", e.target.value)}
                            onDoubleClick={() => openGLRemarksModal(index)}
                            title={row.remarks || header.remarks || "Open remarks"}
                            disabled={isFormDisabled}
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => openGLRemarksModal(index)}
                              title="Open Remarks"
                            />
                          )}
                        </div>
                      </td>

                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-0" style={transactionActionsCellStyle}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                            type="button"
                            className="global-tran-td-button-add-ui"
                            onClick={() => handleAddRowGL(index)}
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>

                            <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRow(index)}>
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderApvGlHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            {/* Add Button */}
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={handleAddRowGL}
                className={`global-tran-tab-footer-button-add-ui ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isFormDisabled}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            {/* Totals Section */}
            <div className="global-tran-tab-footer-total-main-div-ui">
              {/* Total Debit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
                  Total Debit:
                </label>
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
                  {totalDebit}
                </label>
              </div>

              {/* Total Credit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
                  Total Credit:
                </label>
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
                  {totalCredit}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {branchModalOpen && <BranchLookupModal isOpen={branchModalOpen} onClose={handleCloseBranchModal} />}

        {currencyModalOpen && <CurrLookupModal isOpen={currencyModalOpen} onClose={handleCloseCurrencyModal} />}

        {payeeModalOpen && <PayeeMastLookupModal isOpen={payeeModalOpen} onClose={handleClosePayeeModal} customParam="ActiveAll" />}

        {/* COA Account Modal*/}
        {showAccountModal && (
          <COAMastLookupModal
            isOpen={showAccountModal}
            onClose={handleCloseAccountModal}
            source={accountModalSource}
            customParam={accountModalSource === "apAccount" ? "APGL" : accountModalSource === "advAcct" ? "ADGL" : "ActiveAll"}
          />
        )}

        {/* RC Code Modal */}
        <RCLookupModal isOpen={showRcModal} onClose={accountModalSource === "rcCode" ? handleCloseRcModal : handleCloseRcModalGL} source={accountModalSource} />

        {state.showRRRefModal && modalContext !== "openLCImportation" && (
          <GlobalLookupModalv1
            isOpen={state.showRRRefModal}
            title={
              state.globalLookupTitle ||
              (modalContext === "openLCImportation"
                ? "Open LC Importation References"
                : modalContext === "openPCV"
                  ? "Open PCV References"
                  : modalContext === "openPOAdvance"
                    ? "Open PO References"
                    : "Open RR References")
            }
            data={state.globalLookupRow}
            endpoint={Array.isArray(state.globalLookupHeader) ? state.globalLookupHeader : openRRLookupColumns}
            btnCaption={
              state.globalLookupBtnCaption ||
              (modalContext === "openLCImportation"
                ? "Get Selected LC"
                : modalContext === "openPCV"
                  ? "Get Selected PCV"
                  : modalContext === "openPOAdvance"
                    ? "Get Selected PO"
                    : "Get Selected RR")
            }
            idKey="groupId"
            onClose={handleCloseRRRefModal}
            onCancel={() =>
              updateState({
                showRRRefModal: false,
                modalContext: "",
                globalLookupTitle: "",
                globalLookupBtnCaption: "",
                globalLookupConfigEndpoint: "",
              })
            }
          />
        )}

        {/* VAT Code Modal */}
        {showVatModal && <VATLookupModal isOpen={showVatModal} customParam="InputAll" onClose={handleCloseVatModal} />}

        {/* ATC Code Modal */}
        {showAtcModal && <ATCLookupModal isOpen={showAtcModal} onClose={handleCloseAtcModal} />}

        {/* SL Code Lookup Modal */}
        {/* SL Code Lookup Modal */}
        {showSlModal && <SLMastLookupModal isOpen={showSlModal} onClose={accountModalSource === "slCode" ? handleCloseSlModal : handleCloseSlModalGL} />}

        {/* Payment Terms Lookup Modal */}
        {showPaytermModal && <PaytermLookupModal isOpen={showPaytermModal} onClose={handleClosePaytermModal} />}

        {/* Cancellation Modal */}
        {showCancelModal && <CancelTranModal isOpen={showCancelModal} onClose={handleCloseCancel} />}

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
            params={{
              documentID: documentID,
              noReprints: 0,
              docType: docType,
              docNo: documentNo,
            }}
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
              fieldNo: "apvNo",
            }}
            onRetrieve={handleTranDocNoRetrieval}
            onResponse={{ documentNo }}
            onSelected={handleTranDocNoSelection}
            onClose={() => updateState({ showAllTranDocNo: false })}
          />
        )}

        {/* Post Modal */}
        {showPostingModal && (
          <PostAPV
            isOpen={showPostingModal}
            userCode={userCode} // This should now work
            onClose={() => updateState({ showPostingModal: false })}
          />
        )}

        {showSpinner && <LoadingSpinner />}
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getAPVHistory"
          cacheKey={`APV:${state.branchCode || ""}:${state.documentNo || ""}`}
          activeTabKey="APV_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
          status={(() => {
            const s = (state.status || "").toUpperCase();
            if (s === "Finalized") return "F";
            if (s === "Cancelled") return "X";
            if (s === "Closed") return "C";
            if (s === "Open") return "";
            return "All";
          })()}
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {state.showOpenLCModal && (
        <GlobalCombinedLookup
          isOpen={state.showOpenLCModal}
          title="Open LC Importation"
          summarySelectionMode="multiple"
          detailSelectionMode="multiple"
          summaryColumns={state.openLcSummaryColumns}
          detailColumns={state.openLcDetailColumns}
          summaryData={state.openLcSummaryData}
          tabTitles={["Open LC Summary", "Open LC Detail"]}
          summaryPersistKey="APVLC_OpenSummary"
          detailPersistKey="APVLC_OpenDetail"
          fetchDetailApi={async (selectedIds) => {
            const idString = Array.isArray(selectedIds) ? selectedIds.join(",") : selectedIds;
            const payload = {
              json_data: {
                selectedIds: idString,
                branchCode: branchCode || "",
              },
            };

            try {
              updateState({
                isLoading: true,
                showSpinner: true,
              });

              const response = await postRequest("getAPVLC_OpenDetail", payload);
              const detailRows = extractOpenRRResponseRows(response);

              return {
                success: true,
                data: detailRows,
              };
            } catch (error) {
              console.error("getAPVLC_OpenDetail failed:", error);
              return {
                success: false,
                data: [],
              };
            } finally {
              updateState({
                isLoading: false,
                showSpinner: false,
              });
            }
          }}
          onClose={handleCloseLCModal}
          onCancel={() =>
            updateState({
              showOpenLCModal: false,
              openLcSummaryData: [],
              openLcSummaryColumns: [],
              openLcDetailColumns: [],
            })
          }
        />
      )}
    </div>
  );
};

export default APV;
