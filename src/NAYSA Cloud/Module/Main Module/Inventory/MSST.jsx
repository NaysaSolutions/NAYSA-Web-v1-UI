import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faMinus,
  faTrashAlt,
  faFolderOpen,
  faSpinner,
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
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import PostSVI from "../../../Module/Main Module/Accounts Receivable/PostSVI.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import QstatLookupModal from "../../../Lookup/SearchQStatRef.jsx";

// Configuration
import { postRequest, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
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
  useTopDocControlRow,
  useTopDocDropDown,
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
  useHandleCancel,
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

import {
  useGetCurrentDay,
  useFormatToDate,
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";

import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalvalidateRequiredFields,
} from "@/NAYSA Cloud/Global/behavior";

// Header
import Header from "@/NAYSA Cloud/Components/Header";
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";
import { User, Warehouse } from "lucide-react";

const toDateInputValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, mm, dd, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
};

const getResponseValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
};

const getMSSTSaveResult = (response) => {
  const row = response?.data?.[0] || {};

  const documentNo = getResponseValue(row, [
    "msstNo",
    "MSSTNo",
    "msst_no",
    "MSST_NO",
    "docNo",
    "DOC_NO",
    "documentNo",
    "DOCUMENT_NO",
  ]);
  const documentID = getResponseValue(row, [
    "msstId",
    "MSSTId",
    "msst_id",
    "MSST_ID",
    "docId",
    "DOC_ID",
    "documentID",
    "DOCUMENT_ID",
  ]);

  return { documentNo, documentID };
};

const MSST = () => {
  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [isViewDocument, setIsViewDocument] = useState(false);
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    refsLoaded,
    getAllTopHSDocRow,
  } = useAuth();
  const decQty = companyInfo?.itemDecqtyMS ?? 2;
  const decUcost = companyInfo?.itemDecUcostMS ?? 6;

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, []);
  const isViewDocumentUrl = isViewDocument;

  const [topTab, setTopTab] = useState("details"); // "details" | "history"
  const { user } = useAuth();
  const { resetFlag } = useReset();
  const docType = docTypes.MSST;
  const hsDoc = getAllTopHSDocRow?.(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc?.docName
    ? `${hsDoc.docName} Transaction`
    : docTypeNames[docType] || "Transaction";
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
    documentName: hsDoc?.docName || "",
    documentSeries: hsDoc?.docSeries || "Auto",
    documentDocLen: hsDoc?.docLength || 8,
    documentID: null,
    documentDate: useGetCurrentDay(),
    documentNo: "",
    documentStatus: "",
    status: "OPEN",
    noReprints: "0",

    // UI state
    activeTab: "basic",
    GLactiveTab: "invoice",
    isLoading: false,
    showSpinner: false,
    triggerGLEntries: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,

    branchCode: currentUserRow?.branchCode || "HO",
    branchName: currentUserRow?.branchName || "Head Office",
    itemSingleSelect: false,

    // Currency information
    currCode: companyInfo?.currCode || "PHP",
    currName: companyInfo?.currName || "Philippine Peso",
    currRate: formatNumber(companyInfo?.currRate || 1, 6),
    defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),

    //Other Header Info
    tblFieldArray: [],
    tranTypes: [],
    refDocNo1: "",
    refDocNo2: "",
    remarks: "",
    selectedTranType: "IW",
    userCode: currentUserRow?.userCode || user?.USER_CODE || "",

    //Detail 1-2
    detailRows: [],
    detailRowsGL: [],
    globalLookupRow: [],
    globalLookupHeader: [],

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
    showSlModal: false,
    msLookupModalOpen: false,
    warehouseLookupOpen: false,
    fromwarehouseLookupOpen: false,
    towarehouseLookupOpen: false,

    currencyModalOpen: false,
    branchModalOpen: false,
    custModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostingModal: false,
    showAllTranDocNo: false,
    showQstatModal: false,
    locationLookupOpen: false,
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
    documentDate,
    status,
    userCode,
    noReprints,

    activeTab,
    GLactiveTab,
    isLoading,
    showSpinner,

    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    triggerGLEntries,
    itemSingleSelect,

    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,

    branchCode,
    branchName,
    currCode,
    currName,
    currRate,
    tranTypes,
    refDocNo1,
    refDocNo2,
    fromWhCode,
    toWhCode,
    remarks,
    selectedTranType,

    tblFieldArray,
    detailRows,
    detailRowsGL,
    globalLookupRow,
    globalLookupHeader,
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
    showSlModal,
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostingModal,
    showAllTranDocNo,
    showQstatModal,
    msLookupModalOpen,
    warehouseLookupOpen,
    fromwarehouseLookupOpen,
    towarehouseLookupOpen,
    locationLookupOpen,
  } = state;

  const [focusedCell, setFocusedCell] = useState(null);

  const displayStatus = status || "OPEN";
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled =
    isViewDocumentUrl ||
    ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);

  const [totals, setTotals] = useState({
    totalQuantity: "0.00",
    totalItemAmount: "0.00",
  });

  const customParamMap = {
    invAcct: glAccountFilter.ActiveAll,
  };
  const customParam = customParamMap[accountModalSource] || null;

  const updateTotalsDisplay = (quantity, amount) => {
    setTotals({
      totalQuantity: formatNumber(quantity, decQty),
      totalItemAmount: formatNumber(amount),
    });
  };

  useEffect(() => {
    const debitSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debit) || 0),
      0,
    );
    const creditSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.credit) || 0),
      0,
    );
    const debitFx1Sum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0),
      0,
    );
    const creditFx1Sum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0),
      0,
    );
    updateState({
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
      totalDebitFx1: formatNumber(debitFx1Sum),
      totalCreditFx1: formatNumber(creditFx1Sum),
    });
  }, [detailRowsGL]);

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
    if (triggerGLEntries) {
      handleActivityOption("GenerateGL").then(() => {
        updateState({ triggerGLEntries: false });
      });
    }
  }, [triggerGLEntries]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);

  useEffect(() => {
    loadCompanyData();
    handleReset();
  }, []);

  useEffect(() => {
    if (!refsLoaded) return;
    const tranDrop = getAllDropDown?.("TRAN_TYPE", docType) || [];
    if (tranDrop.length > 0) {
      updateState({ tranTypes: tranDrop, selectedTranType: "IW" });
    }
  }, [docType, refsLoaded]);

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

  const handleReset = () => {
    updateState({
      branchCode: currentUserRow?.branchCode || "HO",
      branchName: currentUserRow?.branchName || "Head Office",
      userCode: currentUserRow?.userCode || user?.USER_CODE || "",
      documentDate: useGetCurrentDayV2(),

      fromWhCode: "",
      toWhCode: "",
      refDocNo1: "",
      refDocNo2: "",
      remarks: "",
      noReprints: "0",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      documentStatus: "",
      itemSingleSelect: false,
      selectedTranType: "IW",

      activeTab: "basic",
      GLactiveTab: "invoice",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status: "Open",
    });

    updateTotalsDisplay(0, 0);
  };

  const loadCompanyData = async () => {
    updateState({ isLoading: true });

    try {
      const data = await useTopDocDropDown(docType, "TRAN_TYPE");
      if (data) {
        updateState({
          tranTypes: data,
          selectedTranType: "IW",
        });
      }

      const docRow = await useTopDocControlRow(docType);

      if (docRow) {
        updateState({
          documentName: docRow.docName,
          documentSeries: docRow.docSeries,
          documentDocLen: docRow.docLength,
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

      const tbls = "msst_hd,msst_dt1,msst_dt2";
      const hdtblcol_result = await useFieldLenghtCheck(tbls);
      if (hdtblcol_result) {
        updateState({ tblFieldArray: hdtblcol_result });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }

    updateState({ isLoading: false });
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
      updateTotals([]);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(
        documentNo,
        branchCode,
        docType,
        "msstNo",
        direction,
      );

      if (!data?.msstId) {
        useSwalInfoAlert("No Records Found", "Transaction does not exist.");
        return resetState();
      }

      const retrievedDetailRows = (data.dt1 || []).map((item) => ({
        ...item,
        quantity: formatNumber(item.quantity, decQty),
        unitCost: formatNumber(item.unitCost, decUcost),
        itemAmount: formatNumber(item.itemAmount, 2),
        qtyHand: formatNumber(item.qtyHand, decQty),
        whouseCode: item.frmwhouseCode || item.whouseCode || "",
        toWHcode: item.towhouseCode || item.toWHcode || "",
        locCode: item.frmlocCode || item.locCode || "",
        tolocCode: item.tolocCode || "",
      }));

      const formattedGLRows = (data.dt2 || []).map((glRow) => ({
        ...glRow,
        debit: formatNumber(glRow.debit),
        credit: formatNumber(glRow.credit),
        debitFx1: formatNumber(glRow.debitFx1),
        creditFx1: formatNumber(glRow.creditFx1),
        debitFx2: formatNumber(glRow.debitFx2),
        creditFx2: formatNumber(glRow.creditFx2),
      }));

      updateState({
        documentStatus: data.msstStatus,
        status: data.docStatus,
        noReprints: data.noReprints,
        documentID: data.msstId,
        documentNo: data.msstNo,
        branchCode: data.branchCode,
        documentDate: useformatToDatev2(data.msstDate),
        selectedTranType: data.tranType || data.tran_type || "IW",
        fromWhCode: data.frmwhouseCode || data.fromWhCode || data.from_wh || "",
        toWhCode: data.towhouseCode || data.toWhCode || data.to_wh || "",
        refDocNo1: data.refDocNo1,
        refDocNo2: data.refDocNo2,
        remarks: data.remarks,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });

      updateTotals(retrievedDetailRows);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      useSwalErrorAlert("Fetch Error", error?.message || "Unable to fetch transaction data.");
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleDocNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const handleActivityOption = async (action) => {
    if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) {
      return;
    }

    const getFormattedPayload = (targetGLRows) => {
      const {
        branchCode,
        documentNo,
        documentID,
        documentDate,
        selectedTranType,
        fromWhCode,
        toWhCode,
        refDocNo1,
        refDocNo2,
        remarks,
        userCode,
        detailRows,
      } = state;

      return {
        branchCode: branchCode,
        msstNo: documentNo || "",
        msstId: documentID || "",
        msstDate: documentDate,
        tranType: selectedTranType || "IW",
        fromWhCode: fromWhCode || "",
        toWhCode: toWhCode || "",
        refDocNo1: refDocNo1,
        refDocNo2: refDocNo2,
        remarks: remarks || "",
        userCode: userCode,
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          categCode: row.categCode || "",
          quantity: parseFormattedNumber(row.quantity || 0),
          uomCode: row.uomCode || "",
          unitCost: parseFormattedNumber(row.unitCost || 0),
          itemAmount: parseFormattedNumber(row.itemAmount || 0),
          lotNo: row.lotNo || "",
          qstatCode: row.qstatCode || "",
          bbDate: row.bbDate || null,
          qtyHand: parseFormattedNumber(row.qtyHand || 0),
          trantype: selectedTranType || "IW",
          whouseCode: row.whouseCode || row.frmwhouseCode || fromWhCode || "",
          toWHcode: row.toWHcode || row.towhouseCode || toWhCode || "",
          locCode: row.locCode || row.frmlocCode || "",
          frmwhouseCode: row.frmwhouseCode || row.whouseCode || fromWhCode || "",
          towhouseCode: row.towhouseCode || row.toWHcode || toWhCode || "",
          frmlocCode: row.frmlocCode || row.locCode || "",
          tolocCode: row.tolocCode || "",
          acctCode: row.acctCode || "",
          rcCode: row.rcCode || "",
          slTypeCode: row.sltypeCode || "",
          slCode: row.slCode || "",
          uniqueKey: row.uniqueKey || "",
          operation: row.operation || "",
        })),
        dt2: targetGLRows.map((entry, index) => ({
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
          slRefDate: entry.slRefDate || null,
          remarks: entry.remarks || "",
        })),
      };
    };

    updateState({ isLoading: true });

    try {
      let currentGL = [...state.detailRowsGL];

      if (
        action === "Upsert" &&
        currentGL.length === 0 &&
        selectedTranType !== "BB"
      ) {
        const genPayload = getFormattedPayload([]);
        const newGlEntries = await useGenerateGLEntries(docType, genPayload);

        if (newGlEntries && newGlEntries.length > 0) {
          currentGL = newGlEntries;
          updateState({ detailRowsGL: newGlEntries });
        } else {
          updateState({ isLoading: false });
          console.warn("GL Generation failed. Upsert cancelled.");
          return;
        }
      }

      if (action === "GenerateGL") {
        try {
          updateState({ detailRowsGL: [], isGeneratingGL: true });
          const genPayload = getFormattedPayload(currentGL);
          const newGlEntries = await useGenerateGLEntries(docType, genPayload);
          updateState({
            detailRowsGL:
              newGlEntries && newGlEntries.length > 0 ? newGlEntries : [],
            isGeneratingGL: false,
          });
        } catch (error) {
          updateState({ detailRowsGL: [], isGeneratingGL: false });
          console.error(error);
        }
        return;
      }

      if (action === "Upsert") {
        const savePayload = getFormattedPayload(currentGL);

        const response = await useTransactionUpsert(
          docType,
          savePayload,
          updateState,
          "msstId",
          "msstNo",
        );

        if (response) {
          const {
            documentNo: responseDocNo,
            documentID: responseDocId,
          } = getMSSTSaveResult(response);

          if (responseDocNo) {
            await fetchTranData(responseDocNo, branchCode);
          }

          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
        }

        const {
          documentNo: savedDocumentNo,
          documentID: savedDocumentID,
        } = getMSSTSaveResult(response);

        updateState({
          ...(savedDocumentNo ? { documentNo: savedDocumentNo } : {}),
          ...(savedDocumentID ? { documentID: savedDocumentID } : {}),
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });
      }
    } catch (error) {
      console.error("Error in transaction flow:", error);
      useSwalErrorAlert("Transaction Error", error?.message || `Unable to complete ${action}.`);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const createEmptyDetailRow = () => ({
    lnNo: "",
    itemCode: "",
    itemName: "",
    categCode: "",
    quantity: "1.00",
    uomCode: "",
    unitCost: "0.00",
    itemAmount: "0.00",
    lotNo: "",
    qstatCode: "",
    bbDate: "",
    qtyHand: "0.00",
    whouseCode: fromWhCode || "",
    toWHcode: toWhCode || "",
    locCode: "",
    tolocCode: "",
    acctCode: "",
    rcCode: "",
    sltypeCode: "",
    slCode: "",
    uniqueKey: "",
    operation: "",
  });

  const handleGetItem = async (index = null) => {
    if (!selectedTranType) return;

    const updatedRows = [...detailRows];
    const newRow = createEmptyDetailRow();

    if (index !== null && index >= 0) {
      updatedRows.splice(index + 1, 0, newRow);
    } else {
      updatedRows.push(newRow);
    }

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const handleAddRow = async () => {
    const fieldsToCheck = {
      "Header : From Warehouse": fromWhCode,
      "Header : To Warehouse": toWhCode,
      "Header : Tran Type": selectedTranType,
    };
    const isValid = await useSwalvalidateRequiredFields(
      fieldsToCheck,
      "Add Item",
    );
    if (!isValid) return;

    await handleOpenMSLookup(false);
    return;
  };

  const handleAddItem = async (index) => {
    if (!selectedTranType) return;

    updateState({ selectedRowIndex: index });
    await handleOpenMSLookup(true);
    return;
  };

  const createEmptyGlRow = () => ({
    acctCode: "",
    rcCode: "",
    sltypeCode: "SU",
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
  });

  const handleAddRowGL = (index = null) => {
    if (!selectedTranType) return;

    const updatedRows = [...detailRowsGL];
    const newRow = createEmptyGlRow();

    if (index !== null && index >= 0) {
      updatedRows.splice(index + 1, 0, newRow);
    } else {
      updatedRows.push(newRow);
    }

    updateState({
      detailRowsGL: updatedRows,
      ...getGLTotalsState(updatedRows),
    });
  };

  const handleDeleteRow = async (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({
      detailRows: updatedRows,
      detailRowsGL: [],
    });
    updateTotals(updatedRows);
  };

  const handleDeleteRowGL = (index) => {
    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows });
  };

  const handlePrint = async () => {
    if (!detailRows || detailRows.length === 0) {
      return;
    }
    if (documentID) {
      updateState({ showSignatoryModal: true });
    }
  };

  const handlePost = async () => {
    if (!detailRows || detailRows.length === 0) {
      return;
    }

    if (documentID && documentStatus === "") {
      updateState({ showPostingModal: true });
    }
  };

  const handleCancel = async () => {
    if (!detailRows || detailRows.length === 0) {
      return;
    }

    if (documentID && documentStatus === "") {
      updateState({ showCancelModal: true });
    }
  };

  const handleAttach = async () => {
    if (documentID) {
      updateState({ showAttachModal: true });
    }
  };

  const handleCopy = async () => {
    if (!detailRows || detailRows.length === 0) {
      return;
    }

    if (documentID) {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        documentDate: useGetCurrentDay(),
        noReprints: "0",
      });
    }
  };

  const handleFieldBehavior = (option) => {
    switch (option) {
      case "hiddenBBMode":
        return selectedTranType === "BB";

      case "hiddenCAMode":
        return selectedTranType === "CA";

      default:
        return false;
    }
  };

  const handleColumnLabel = (columnName) => {
    switch (columnName) {
      case "UnitCost":
        if (selectedTranType === "CA") {
          return "Amount";
        }
        return "Unit Cost";

      default:
        return "";
    }
  };

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
    detailRowsGLRef.current = detailRowsGL || [];
  }, [detailRows, detailRowsGL]);

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
    const docNo = params.get("msstNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);

  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  const updateTotals = (rows) => {
    let totalQuantity = 0;
    let totalItemAmount = 0;

    rows.forEach((row) => {
      const item_Quantity = parseFormattedNumber(row.quantity || 0) || 0;
      const item_ItemAmount = parseFormattedNumber(row.itemAmount || 0) || 0;

      totalQuantity += item_Quantity;
      totalItemAmount += item_ItemAmount;
    });
    updateTotalsDisplay(totalQuantity, totalItemAmount);
  };

  const handleDetailChange = async (
    index,
    field,
    value,
    runCalculations = true,
  ) => {
    const updatedRows = [...(detailRowsRef.current || [])];

    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    };

    const row = updatedRows[index];
    const autoFillBlanks = async (fieldName, newValue, extraData = {}) => {
      if (index === 0) {
        const hasBlanks = updatedRows.some(
          (r, i) =>
            i !== 0 && (!r[fieldName] || r[fieldName].toString().trim() === ""),
        );

        const fieldLabels = {
          acctCode: "Account Code",
          rcCode: "RC Code",
          slCode: "SL Code",
          whouseCode: "Warehouse",
          locCode: "Location",
          toWHcode: "To Warehouse",
          tolocCode: "To Location",
          qstatCode: "Quality Status",
        };

        if (hasBlanks) {
          const result = await Swal.fire({
            title: "Replicate Data?",
            text: `Do you want to copy this ${fieldLabels[field]} to all blank rows?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, copy it!",
            cancelButtonText: "No",
          });

          if (result.isConfirmed) {
            updatedRows.forEach((r, i) => {
              if (
                i !== 0 &&
                (!r[fieldName] || r[fieldName].toString().trim() === "")
              ) {
                updatedRows[i] = {
                  ...r,
                  [fieldName]: newValue,
                  ...extraData,
                };
              }
            });
            updateState({ detailRows: [...updatedRows] });
          }
        }
      }
    };

    if (field === "acctCode") {
      row.acctCode = value.acctCode;
      await autoFillBlanks("acctCode", value.acctCode);
    }

    if (field === "rcCode") {
      row.rcCode = value.rcCode;
      await autoFillBlanks("rcCode", value.rcCode);
    }

    if (field === "slCode") {
      row.slCode = value.slCode;
      row.sltypeCode = value.sltypeCode;
      await autoFillBlanks("slCode", value.slCode, {
        sltypeCode: value.sltypeCode,
      });
    }

    if (field === "whouseCode") {
      row.whouseCode = value.whCode;
      await autoFillBlanks("whouseCode", value.whCode);
    }

    if (field === "toWHcode") {
      row.toWHcode = value.whCode;
      await autoFillBlanks("toWHcode", value.whCode);
    }

    if (field === "locCode") {
      row.locCode = value.locCode;
      await autoFillBlanks("locCode", value.locCode);
    }

    if (field === "tolocCode") {
      row.tolocCode = value.locCode;
      await autoFillBlanks("tolocCode", value.locCode);
    }

    if (field === "qstatCode") {
      row.qstatCode = value.qstatCode;
      await autoFillBlanks("qstatCode", value.qstatCode);
    }

    if (["bbDate"].includes(field)) {
      row[field] = value;
    }

    if (field === "itemCode") {
      row["itemCode"] = value.itemCode;
      row["itemName"] = value.itemName;
      row["uomCode"] = value.uomCode;
      row["categCode"] = value.categCode;
      row["unitCost"] = formatNumber(
        parseFormattedNumber(value.unitCost || row.unitCost || 0),
        decUcost,
      );
    }

    if (runCalculations) {
      const origQuantity = parseFormattedNumber(row.quantity) || 0;
      const origUnitCost = parseFormattedNumber(row.unitCost) || 0;
      const origQtyHand = parseFormattedNumber(row.qtyHand) || 0;

      const recalcRow = async () => {
        let processedQty = Math.abs(origQuantity);

        if (processedQty > origQtyHand) {
          useSwalErrorAlert(
            "Exceeds Stock",
            `Quantity (${processedQty}) exceeds Quantity on Hand (${origQtyHand}). Value has been adjusted.`,
          );
          processedQty = origQtyHand;
        }

        processedQty = Math.abs(processedQty);

        const finalQtyForMath = processedQty;
        const calculatedAmount = +(finalQtyForMath * origUnitCost).toFixed(2);

        row.itemAmount = formatNumber(calculatedAmount);
        row.quantity = formatNumber(processedQty, decQty);
        row.unitCost = formatNumber(origUnitCost, decUcost);
      };

      if (field === "quantity" || field === "unitCost") {
        await recalcRow();
      }
    }

    updatedRows[index] = row;
    updateState({
      detailRows: updatedRows,
      detailRowsGL: [],
    });
    updateTotals(updatedRows);
  };

  const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...(detailRowsGLRef.current || [])];
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
      const data = await useUpdateRowGLEntries(row, field, value, "", docType);
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

    if (["slRefNo", "slRefDate", "remarks"].includes(field)) {
      row[field] = value;
    }

    updatedRowsGL[index] = row;
    updateState({
      detailRowsGL: updatedRowsGL,
      ...getGLTotalsState(updatedRowsGL),
    });
  };

  const handleBlurGL = async (index, field, value, autoCompute = false) => {
    const updatedRowsGL = [...(detailRowsGLRef.current || [])];
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
      const specialAccounts = ["invAcct"];
      if (specialAccounts.includes(accountModalSource)) {
        handleDetailChange(
          selectedRowIndex,
          "acctCode",
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
      updateState({
        showRcModal: false,
        selectedRowIndex: null,
        accountModalSource: null,
      });
    }
  };

  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      const updateFn =
        accountModalSource !== null ? handleDetailChange : handleDetailChangeGL;
      updateFn(selectedRowIndex, "slCode", selectedSl, false);
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null,
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

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandleCancel(
        docType,
        documentID,
        userCode,
        confirmation.password,
        confirmation.reason,
        updateState,
      );
      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Cancellation Completed",
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
      await fetchTranData(documentNo, branchCode);
    }
    updateState({ showCancelModal: false });
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

  const handleSaveAndPrint = async (documentID) => {
    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);

    updateState({ showSpinner: false });
  };

  const handleCloseWarehouseLookup = (row) => {
    if (row) {
      if (accountModalSource) {
        handleDetailChange(selectedRowIndex, accountModalSource, row, false);
      }
    }
    updateState({ warehouseLookupOpen: false, accountModalSource: null });
  };

  const handleCloseFromWarehouseLookup = (row) => {
    if (row) {
      updateState({
        fromWhCode: row.whCode,
        fromWhName: row.whName,
        detailRows: (detailRows || []).map((item) => ({
          ...item,
          whouseCode: item.whouseCode || row.whCode,
        })),
      });
    }
    updateState({ fromwarehouseLookupOpen: false });
  };

  const handleCloseToWarehouseLookup = (row) => {
    if (row) {
      updateState({
        toWhCode: row.whCode,
        toWhName: row.whName,
        detailRows: (detailRows || []).map((item) => ({
          ...item,
          toWHcode: item.toWHcode || row.whCode,
        })),
      });
    }
    updateState({ towarehouseLookupOpen: false });
  };

  const handleCloseLocationLookup = (row) => {
    if (row) {
      if (accountModalSource) {
        handleDetailChange(selectedRowIndex, accountModalSource, row, false);
      }
    }

    updateState({ locationLookupOpen: false, accountModalSource: null });
  };

  const handleCloseQStatLookup = (row) => {
    if (row) {
      handleDetailChange(selectedRowIndex, "qstatCode", row, false);
    }
    updateState({ showQstatModal: false });
  };

  const handleCloseVatModal = async (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      handleDetailChangeGL(selectedRowIndex, "vatCode", result);
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

      handleDetailChangeGL(selectedRowIndex, "atcCode", result);
    }
    updateState({
      showAtcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseCurrencyModal = (selectedCurrency) => {
    if (selectedCurrency) {
      updateState({
        currCode: selectedCurrency.currCode,
        currName: selectedCurrency.currName,
        currRate: formatNumber(selectedCurrency.currRate || 1, 6),
      });
    }
    updateState({ currencyModalOpen: false });
  };

  const handleCloseCustModal = () => {
    updateState({ custModalOpen: false });
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

  const handleOpenMSLookup = async (itemSingleSelect) => {
    try {
      updateState({ isLoading: true, itemSingleSelect: itemSingleSelect });

      const endpoint = "getInvLookupMS";
      const response = await fetchDataJson(endpoint, {
        userCode,
        whouseCode: fromWhCode || "",
        locCode: "",
        docType: "MSST",
        tranType: itemSingleSelect ? "IRR" : selectedTranType,
      });
      const custData = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : [];

      const lookupTypes = ["IB", "IW"];
      const colConfig = await useSelectedHSColConfig(
        lookupTypes.includes(selectedTranType) || itemSingleSelect
          ? "AllMastItemLookup"
          : "getInvLookupMS",
      );

      if (custData.length === 0) {
        useSwalInfoAlert(
          lookupTypes.includes(selectedTranType)
            ? "MS Master Data"
            : "MS Location Balance",
          "No records found",
        );
        updateState({ isLoading: false });
        return;
      }

      updateState({
        globalLookupRow: custData,
        globalLookupHeader: colConfig,
        msLookupModalOpen: true,
        isLoading: false,
      });
    } catch (error) {
      useSwalErrorAlert(
        lookupTypes.includes(selectedTranType)
          ? "MS Master Data"
          : "MS Location Balance",
        "No records found",
      );
      updateState({
        globalLookupRow: [],
        globalLookupHeader: [],
        isLoading: false,
      });
    }
  };

  const handleCloseMSLookup = (selectedItems) => {
    if (!selectedItems) return;

    const itemsArray = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : [selectedItems.records];
    if (itemsArray.length === 0) return;

    const newRows = itemsArray.flatMap((item) => {
      const rawQtyHand = parseFormattedNumber(item?.qtyHand ?? 0);
      const rawUnitCost = parseFormattedNumber(item?.unitCost ?? 0);
      const originalKey = item?.uniqueKey ?? "";

      if (itemSingleSelect && selectedTranType === "IR") {
        handleDetailChange(selectedRowIndex, "itemCode", item, false);
        updateState({ itemSingleSelect: false, msLookupModalOpen: false });
        return [];
      }

      const baseRow = {
        itemCode: item?.itemCode ?? "",
        itemName: item?.itemName ?? "",
        categCode: item?.categCode ?? "",
        uomCode: item?.uomCode ?? "",
        unitCost: formatNumber(rawUnitCost, decUcost),
        amount: formatNumber(0, 2),
        lotNo: item?.lotNo ?? "",
        bbDate: item?.bbDate
          ? new Date(item.bbDate).toISOString().split("T")[0]
          : "",
        qstatCode: item?.qstatCode ?? "",
        whouseCode: item?.whouseCode ?? fromWhCode ?? "",
        toWHcode: toWhCode ?? "",
        locCode: item?.locCode ?? "",
        tolocCode: "",
        acctCode: "",
        sltypeCode: "",
        rcCode: "",
        slCode: "",
      };

      if (selectedTranType === "IR") {
        return [
          {
            ...baseRow,
            uniqueKey: originalKey,
            quantity: formatNumber(rawQtyHand * -1, decQty),
            qtyHand: formatNumber(rawQtyHand, decQty),
            itemAmount: formatNumber(rawQtyHand * rawUnitCost * -1, 2),
            operation: "S",
          },
          {
            ...baseRow,
            uniqueKey: "",
            quantity: formatNumber(rawQtyHand, decQty),
            qtyHand: formatNumber(0, decQty),
            itemAmount: formatNumber(rawQtyHand * rawUnitCost, 2),
            operation: "A",
          },
        ];
      }

      return [
        {
          ...baseRow,
          uniqueKey: originalKey,
          qtyHand: formatNumber(rawQtyHand, decQty),
          quantity: formatNumber(0, decQty),
          itemAmount: formatNumber(0, 2),
          operation: selectedTranType === "IL" ? "S" : "A",
        },
      ];
    });

    setState((prev) => {
      const updated = [...(prev.detailRows || []), ...newRows];
      updateTotals(updated);
      return { ...prev, detailRows: updated };
    });

    updateState({ itemSingleSelect: false, msLookupModalOpen: false });
  };

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          onPost={handlePost}
          printData={printData}
          onReset={handleReset}
          onSave={() => handleActivityOption("Upsert")}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          showCopyForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          isSaveDisabled={isSaveDisabled}
          isResetDisabled={isResetDisabled}
          detailsRoute="/page/MSST"
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
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

        <div className="global-tran-header-div-ui">
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

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative"
            id="pr_hd"
          >
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="global-tran-textbox-group-div-ui">
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
                    onClick={() => updateState({ branchModalOpen: true })}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="msstNo"
                    value={state.documentNo}
                    onChange={(e) =>
                      updateState({ documentNo: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleDocNoBlur();
                        e.preventDefault();
                        document.getElementById("msstDate")?.focus();
                      }
                    }}
                    placeholder=" "
                    className={`peer global-tran-textbox-ui ${state.isDocNoDisabled ? "bg-blue-100 cursor-not-allowed" : ""}`}
                    disabled={state.isDocNoDisabled}
                  />
                  <label
                    htmlFor="msstNo"
                    className="global-tran-floating-label"
                  >
                    MSST No.
                  </label>
                  <button
                    className={`global-tran-textbox-button-search-padding-ui ${
                      state.isFetchDisabled || state.isDocNoDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    onClick={() => {
                      updateState({ showAllTranDocNo: true });
                    }}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="msstDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={documentDate}
                      disabled={isFormDisabled}
                      updateState={(updates) => {
                        if (updates.msstDate !== undefined) {
                          updateState({ documentDate: updates.msstDate });
                        } else if (updates.documentDate !== undefined) {
                          updateState({ documentDate: updates.documentDate });
                        } else {
                          updateState(updates);
                        }
                      }}
                    />
                  </div>
                  <label htmlFor="msstDate" className="global-ref-floating-label">
                    MSST Date
                  </label>
                </div>
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <select
                    id="tranType"
                    className="peer global-tran-textbox-ui"
                    value={selectedTranType}
                    onChange={(e) =>
                      updateState({ selectedTranType: e.target.value })
                    }
                    disabled={isFormDisabled}
                  >
                    {tranTypes.length > 0 ? (
                      <>
                        <option value="">Select Tran Type</option>
                        {tranTypes.map((type) => (
                          <option
                            key={type.DROPDOWN_CODE}
                            value={type.DROPDOWN_CODE}
                          >
                            {type.DROPDOWN_NAME}
                          </option>
                        ))}
                      </>
                    ) : (
                      <option value="">Loading Tran Types...</option>
                    )}
                  </select>
                  <label
                    htmlFor="sviType"
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

                <div className="relative">
                  <input
                    type="text"
                    id="refDocNo1"
                    value={refDocNo1}
                    placeholder=" "
                    onChange={(e) => updateState({ refDocNo1: e.target.value })}
                    className="peer global-tran-textbox-ui "
                    disabled={isFormDisabled}
                    maxLength={useGetFieldLength(tblFieldArray, "refsvi_no1")}
                  />
                  <label
                    htmlFor="refDocNo1"
                    className="global-tran-floating-label"
                  >
                    Ref Doc No. 1
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="refDocNo2"
                    value={refDocNo2}
                    placeholder=" "
                    onChange={(e) => updateState({ refDocNo2: e.target.value })}
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                    maxLength={useGetFieldLength(tblFieldArray, "refsvi_no2")}
                  />
                  <label
                    htmlFor="refDocNo2"
                    className="global-tran-floating-label"
                  >
                    Ref Doc No. 2
                  </label>
                </div>
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="fromWhCode"
                    value={fromWhCode || ""}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="fromWhCode"
                    className="global-tran-floating-label"
                  >
                    <span className="text-red-500">*</span> From Warehouse
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
                      updateState({ fromwarehouseLookupOpen: true })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="toWHCode"
                    value={toWhCode || ""}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="toWHCode"
                    className="global-tran-floating-label"
                  >
                    <span className="text-red-500">*</span> To Warehouse
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
                      updateState({ towarehouseLookupOpen: true })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
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
                    maxLength={useGetFieldLength(tblFieldArray, "remarks")}
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
            <div className="global-tran-textbox-group-div-ui"></div>
          </div>
        </div>

        <div id="apv_dtl" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                className={`global-tran-tab-padding-ui ${
                  GLactiveTab === "invoice"
                    ? "global-tran-tab-text_active-ui"
                    : "global-tran-tab-text_inactive-ui"
                }`}
              >
                Item Details
              </button>
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
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenCAMode")}
                    >
                      Quantity
                    </th>
                    <th className="global-tran-th-ui">
                      {handleColumnLabel("UnitCost")}
                    </th>
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenCAMode")}
                    >
                      Amount
                    </th>
                    <th className="global-tran-th-ui">Lot No</th>
                    <th className="global-tran-th-ui">BB Date</th>
                    <th className="global-tran-th-ui">Quality Status</th>
                    <th className="global-tran-th-ui">From Warehouse</th>
                    <th className="global-tran-th-ui">To Warehouse</th>
                    <th className="global-tran-th-ui">From Location</th>
                    <th className="global-tran-th-ui">To Location</th>
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenBBMode")}
                    >
                      Account Code
                    </th>
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenBBMode")}
                    >
                      RC Code
                    </th>
                    <th className="global-tran-th-ui hidden">SL Type Code</th>
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenBBMode")}
                    >
                      SL Code
                    </th>
                    <th className="global-tran-th-ui">Qty On Hand</th>
                    <th className="global-tran-th-ui hidden">Category</th>
                    <th className="global-tran-th-ui hidden">Unique Key</th>
                    <th className="global-tran-th-ui hidden">Operation</th>
                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-[43px] bg-blue-300 dark:bg-blue-900 z-30">
                        Add
                      </th>
                    )}

                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                        Delete
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="relative">
                  {detailRows.map((row, index) => (
                    <tr key={index} className="global-tran-tr-ui">
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.itemCode || ""}
                            readOnly
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "itemCode",
                                e.target.value,
                              )
                            }
                          />
                          {!isFormDisabled &&
                            row.operation === "A" &&
                            selectedTranType === "IR" && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => handleAddItem(index)}
                              />
                            )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[300px] global-tran-td-inputclass-ui"
                          value={row.itemName || ""}
                          readOnly
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "itemName",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[50px] text-center global-tran-td-inputclass-ui"
                          value={row.uomCode || ""}
                          readOnly
                          onChange={(e) =>
                            handleDetailChange(index, "uomCode", e.target.value)
                          }
                        />
                      </td>

                      <td
                        className="global-tran-td-ui"
                        hidden={handleFieldBehavior("hiddenCAMode")}
                      >
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                          value={row.quantity || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.-]/g,
                              "",
                            );
                            if (
                              /^-?\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChange(
                                index,
                                "quantity",
                                sanitizedValue,
                                false,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              parseFormattedNumber(e.target.value) === 0
                            ) {
                              e.target.value = "";
                            }
                          }}
                          onBlur={async (e) => {
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                              await handleDetailChange(
                                index,
                                "quantity",
                                num,
                                true,
                              );
                            }
                            setFocusedCell(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const value = e.target.value;
                              const num = parseFormattedNumber(value);
                              if (!isNaN(num)) {
                                await handleDetailChange(
                                  index,
                                  "quantity",
                                  num,
                                  true,
                                );
                              }
                              e.target.blur();
                            }
                          }}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                          value={row.unitCost || ""}
                          readOnly={true}
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
                              handleDetailChange(
                                index,
                                "unitCost",
                                sanitizedValue,
                                false,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              parseFormattedNumber(e.target.value) === 0
                            ) {
                              e.target.value = "";
                            }
                          }}
                          onBlur={async (e) => {
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                              await handleDetailChange(
                                index,
                                "unitCost",
                                num,
                                true,
                              );
                            }
                            setFocusedCell(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const value = e.target.value;
                              const num = parseFormattedNumber(value);
                              if (!isNaN(num)) {
                                await handleDetailChange(
                                  index,
                                  "unitCost",
                                  num,
                                  true,
                                );
                              }
                              e.target.blur();
                            }
                          }}
                        />
                      </td>

                      <td
                        className="global-tran-td-ui"
                        hidden={handleFieldBehavior("hiddenCAMode")}
                      >
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 cursor-pointer"
                          value={
                            formatNumber(
                              parseFormattedNumber(row.itemAmount),
                            ) || ""
                          }
                          readOnly
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.lotNo || ""}
                          readOnly={true}
                          onChange={(e) =>
                            handleDetailChange(index, "lotNo", e.target.value)
                          }
                          maxLength={useGetFieldLength(tblFieldArray, "lot_no")}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="date"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={toDateInputValue(row.bbDate)}
                          readOnly={true}
                          onChange={(e) =>
                            handleDetailChange(index, "bbDate", e.target.value)
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.qstatCode || ""}
                            readOnly={true}
                          />
                        </div>
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.whouseCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && row.operation !== "S" && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  warehouseLookupOpen: true,
                                  accountModalSource: "whouseCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.toWHcode || ""}
                            readOnly
                          />
                          {!isFormDisabled && row.operation !== "S" && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  warehouseLookupOpen: true,
                                  accountModalSource: "toWHcode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.locCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && row.operation !== "S" && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  locationLookupOpen: true,
                                  accountModalSource: "locCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.tolocCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && row.operation !== "S" && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  locationLookupOpen: true,
                                  accountModalSource: "tolocCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td
                        className="global-tran-td-ui relative "
                        hidden={handleFieldBehavior("hiddenBBMode")}
                      >
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.acctCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showAccountModal: true,
                                  accountModalSource: "invAcct",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td
                        className="global-tran-td-ui relative"
                        hidden={handleFieldBehavior("hiddenBBMode")}
                      >
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.rcCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && (
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

                      <td className="global-tran-td-ui hidden">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.sltypeCode || ""}
                          readOnly
                        />
                      </td>

                      <td
                        className="global-tran-td-ui"
                        hidden={handleFieldBehavior("hiddenBBMode")}
                      >
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.slCode || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "slCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
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

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 cursor-pointer"
                          value={row.qtyHand || ""}
                          readOnly
                        />
                      </td>

                      <td className="global-tran-td-ui hidden">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.categCode || ""}
                          readOnly
                        />
                      </td>

                      <td className="global-tran-td-ui hidden">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.uniqueKey || ""}
                          readOnly
                        />
                      </td>

                      <td className="global-tran-td-ui hidden">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.operation || ""}
                          readOnly
                        />
                      </td>

                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-12">
                          <button
                            className="global-tran-td-button-add-ui"
                            onClick={() => handleAddRow(index)}
                          >
                            <FontAwesomeIcon icon={faPlus} />
                          </button>
                        </td>
                      )}

                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-0">
                          <button
                            className="global-tran-td-button-delete-ui"
                            onClick={() => handleDeleteRow(index)}
                          >
                            <FontAwesomeIcon icon={faMinus} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={() => handleAddRow()}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Total Quantity:
                </label>
                <label
                  id="totalQuantity"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totals.totalQuantity}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Total Amount:
                </label>
                <label
                  id="totalItemAmount"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totals.totalItemAmount}
                </label>
              </div>
            </div>
          </div>
        </div>

        <div
          className="global-tran-tab-div-ui"
          hidden={handleFieldBehavior("hiddenBBMode")}
        >
          <div className="global-tran-tab-nav-ui">
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

            <div className="flex justify-end">
              <button
                onClick={() => handleActivityOption("GenerateGL")}
                className="global-tran-button-generateGL"
                disabled={isLoading}
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                {isLoading ? "Generating..." : "Generate GL Entries"}
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
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
                      <>
                        <th className="global-tran-th-ui sticky right-[43px] bg-blue-300 dark:bg-blue-900 z-30">
                          Add
                        </th>
                        <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                          Delete
                        </th>
                      </>
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
                            handleDetailChange(
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
                            handleDetailChange(index, "atcName", e.target.value)
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debit || ""}
                          readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debit", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "debit", e.target.value);
                          }}
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.credit || ""}
                          readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "credit", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "credit", e.target.value);
                          }}
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx1 || ""}
                          readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx1", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "debitFx1", e.target.value);
                          }}
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx1 || ""}
                          readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx1", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "creditFx1", e.target.value);
                          }}
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx2 || ""}
                          readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx2", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "debitFx2", e.target.value);
                          }}
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx2 || ""}
                          readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx2", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "creditFx2", e.target.value);
                          }}
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.slRefNo || ""}
                          readOnly={isFormDisabled}
                          maxLength={useGetFieldLength(
                            tblFieldArray,
                            "slref_no",
                          )}
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
                        <input
                          type="date"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.slRefDate || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "slRefDate",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.remarks || ""}
                          readOnly={isFormDisabled}
                          maxLength={useGetFieldLength(
                            tblFieldArray,
                            "remarks",
                          )}
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
                        <td className="global-tran-td-ui text-center sticky right-10">
                          <button
                            className="global-tran-td-button-add-ui"
                            onClick={() => handleAddRowGL(index)}
                          >
                            <FontAwesomeIcon icon={faPlus} />
                          </button>
                        </td>
                      )}

                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-0">
                          <button
                            className="global-tran-td-button-delete-ui"
                            onClick={() => handleDeleteRowGL(index)}
                          >
                            <FontAwesomeIcon icon={faMinus} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={handleAddRowGL}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
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

        {custModalOpen && (
          <CustomerMastLookupModal
            isOpen={custModalOpen}
            onClose={handleCloseCustModal}
          />
        )}

        {showAccountModal && (
          <COAMastLookupModal
            isOpen={showAccountModal}
            onClose={handleCloseAccountModal}
            source={accountModalSource}
          />
        )}

        {showRcModal && (
          <RCLookupModal
            isOpen={showRcModal}
            onClose={handleCloseRcModalGL}
            source={accountModalSource}
          />
        )}

        {showVatModal && (
          <VATLookupModal
            isOpen={showVatModal}
            onClose={handleCloseVatModal}
            customParam="OutputService"
          />
        )}

        {showAtcModal && (
          <ATCLookupModal isOpen={showAtcModal} onClose={handleCloseAtcModal} />
        )}

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

        {showPostingModal && (
          <PostSVI
            isOpen={showPostingModal}
            userCode={userCode}
            docType={docType}
            branchCode={branchCode}
            onClose={() => updateState({ showPostingModal: false })}
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
              fieldNo: "msstNo",
            }}
            onRetrieve={handleTranDocNoRetrieval}
            onResponse={{ documentNo }}
            onSelected={handleTranDocNoSelection}
            onClose={() => updateState({ showAllTranDocNo: false })}
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
            singleSelect={itemSingleSelect}
          />
        )}

        {warehouseLookupOpen && (
          <WarehouseLookupModal
            isOpen={warehouseLookupOpen}
            onClose={handleCloseWarehouseLookup}
            filter={"ByBC" + branchCode}
            source={accountModalSource}
            branchCode={branchCode}
            itemCode={
              selectedRowIndex !== null
                ? detailRows[selectedRowIndex]?.itemCode
                : null
            }
          />
        )}

        {fromwarehouseLookupOpen && (
          <WarehouseLookupModal
            isOpen={fromwarehouseLookupOpen}
            onClose={handleCloseFromWarehouseLookup}
            filter={"ByBC" + branchCode}
            source={accountModalSource}
            branchCode={branchCode}
          />
        )}

        {towarehouseLookupOpen && (
          <WarehouseLookupModal
            isOpen={towarehouseLookupOpen}
            onClose={handleCloseToWarehouseLookup}
            filter={"ByBC" + branchCode}
            source={accountModalSource}
            branchCode={branchCode}
          />
        )}

        {locationLookupOpen && (
          <LocationLookupModal
            isOpen={locationLookupOpen}
            onClose={handleCloseLocationLookup}
            source={accountModalSource}
            filter="ActiveAll"
            whCode={
              selectedRowIndex !== null
                ? accountModalSource === "tolocCode"
                  ? detailRows[selectedRowIndex]?.toWHcode || toWhCode || ""
                  : detailRows[selectedRowIndex]?.whouseCode || fromWhCode || ""
                : ""
            }
          />
        )}

        {showQstatModal && (
          <QstatLookupModal
            isOpen={showQstatModal}
            onClose={handleCloseQStatLookup}
            filter="ActiveAll"
          />
        )}

        {showSpinner && <LoadingSpinner />}
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getMSSTHistory"
          cacheKey={`MSST:${state.branchCode || ""}:${state.docNo || ""}`}
          activeTabKey="MSST_Summary"
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

export default MSST;