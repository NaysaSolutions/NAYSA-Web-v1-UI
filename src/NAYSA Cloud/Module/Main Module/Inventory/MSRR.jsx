import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";

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
import SearchPOOpenModal from "../../../Lookup/SearchPOOpenModal.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Configuration
import { postRequest, fetchData } from "../../../Configuration/BaseURL.jsx";
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
  useHandlePostTran,
  useFieldLenghtCheck,
  useGetFieldLength,
  useGenerateGLEntries,
  useUpdateRowGLEntries,
  useUpdateRowEditEntries,
} from "@/NAYSA Cloud/Global/procedure";



import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior";

// Header
import Header from "@/NAYSA Cloud/Components/Header";

const MSRR = (item) => {
  const loadedFromUrlRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { resetFlag } = useReset();
  const { user } = useAuth();

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
    drNo: "",
    siNo: "",

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
    vendCode: "",
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
    userCode: user?.USER_CODE || "NSI",
    selectedPOStatus: "",

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
    poLookupModalOpen: false,
    poLookupModalOpen: false,
    vatLookupOpen: false,
    vatLookupRowIndex: null,
    // Specs modal
specsModalOpen: false,
specsRowIndex: null,
specsTempText: "",


    // Warehouse / Location header values
    WHcode: "", // keep same key you already destructure
    WHname: "",
    locCode: "",
    locName: "",

    // RC Lookup modal (table)
    rcLookupModalOpen: false,
    rcLookupContext: "", // "rc" or "reqDept"

    // Modal flags
    warehouseLookupOpen: false,
    locationLookupOpen: false,

    msLookupModalOpen: false,
    tblFieldArray: [],

    GLactiveTab: "invoice",          // same pattern as MSAJ (optional)
detailRowsGL: [],                // DT2 rows

// GL modal states
showCOALookup: false,
showSLLookup: false,
showRCLookupGL: false,
showVATLookupGL: false,
showATCLookupGL: false,
glRowIndex: -1,
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
    drNo,
    siNo,

    activeTab,
    isLoading,
    showSpinner,

    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    poNo,
    selectedPOType,

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
    tblFieldArray,

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
    rrQty: "",
  });

  // PR.jsx
  const docType = docTypes?.MSRR || "MSRR";

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "MS Receiving Report";

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

  const openSpecsModal = (rowIndex) => {
  if (isFormDisabled) return;

  const current = detailRows?.[rowIndex]?.itemSpecs ?? "";
  updateState({
    specsModalOpen: true,
    specsRowIndex: rowIndex,
    specsTempText: current,
  });
};

const closeSpecsModal = () => {
  updateState({
    specsModalOpen: false,
    specsRowIndex: null,
    specsTempText: "",
  });
};

const saveSpecsModal = () => {
  const idx = state.specsRowIndex;
  if (idx === null || idx === undefined) return closeSpecsModal();

  const updated = [...detailRows];
  updated[idx] = {
    ...updated[idx],
    itemSpecs: state.specsTempText ?? "",
  };

  updateState({ detailRows: updated });
  closeSpecsModal();
};


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

  const handleClosePOOpenModal = async (selection) => {
    // closed without selection
    if (!selection) {
      updateState({ poLookupModalOpen: false });
      return;
    }

    const { header, details } = selection;

    const vendCodeFromDetail = details?.[0]?.VEND_CODE ?? "";

   const vatCodes = [...new Set((details || [])
  .map(d => d.VAT_CODE)
  .filter(Boolean)
)];

const vatRatePairs = await Promise.all(
  vatCodes.map(async (code) => [code, await fetchVatRate(code)])
);

const vatRateMap = Object.fromEntries(vatRatePairs);


    const vendNameFromDetail = details?.[0]?.VEND_NAME ?? ""; // if you later include it

    updateState({
      poLookupModalOpen: false,
      poNo: header?.PoNo || "",
      branchCode: header?.BC || branchCode,
      rcCode: header?.RcCode || rcCode,

      // ✅ vendor from Header (VendCode/VendName), fallback to Detail (VEND_CODE)
      vendCode:
        header?.VendCode ?? header?.Vend_Code ?? vendCodeFromDetail ?? "",
      vendName:
        header?.VendName ?? header?.Vend_Name ?? vendNameFromDetail ?? "",
    });

    // 2) map selected PO detail lines into MSRR detailRows
    const newRows = (details || []).map((r, idx) => {
      const poQty = Number(r.PO_QUANTITY ?? 0);
      const rrQty = Number(r.QTY_BALANCE ?? poQty - Number(r.RR_QTY ?? 0));
      const unitCost = Number(r.UNIT_COST ?? 0);

      const gross = Number(r.GROSS_AMOUNT ?? poQty * unitCost);
      const discAmt = Number(r.DISC_AMOUNT ?? 0);
      const vatAmt = Number(r.VAT_AMOUNT ?? 0);
      const net = Number(r.NET_AMOUNT ?? gross - discAmt); // VAT may already be included depending on your design

      return {
        lN: Number(r.LINE_NO) || idx + 1,

        // internal
        invType: r.INV_TYPE || "",
        poStatus: r.PO_STATUS || "",
        groupId: r.CATEG_CODE || r.GROUP_ID || "",

        // item
        itemCode: r.ITEM_CODE || "",
        itemName: r.ITEM_NAME || "",
        itemSpecs: r.ITEM_SPECS || "",

        uomCode: r.UOM_CODE || "",
        uomCode2: r.UOM_CODE2 || "",
        uomQty2: String(r.UOM_QTY2 ?? 0),

        // quantities
        poQty: String(poQty),
        rrQty: String(rrQty),

        // currency/costing
        currCode: r.CURR_CODE || "PHP",
        unitCost: String(unitCost),

        // amounts
        amount: String(r.ITEM_AMOUNT ?? gross), // Amount column
        grossAmount: String(gross),
        discRate: String(r.DISC_RATE ?? 0),
        discAmount: String(discAmt),
        vatCode: r.VAT_CODE || "",
        vatAmount: String(vatAmt),
        netAmount: String(net),

        // date
        dateNeeded: r.DEL_DATE ? String(r.DEL_DATE).substring(0, 10) : "",

       vatCode: r.VAT_CODE || "",
vatRate: vatRateMap?.[r.VAT_CODE] !== undefined
  ? String(vatRateMap[r.VAT_CODE])
  : "",

// if you have VAT rate ref table later
        lotNo: "",
        bbDate: "",
        qcStatus: "",
        whName: state.WHname || "",
        locName: state.locName || "",
        freeQty: "0.000000",
      };
    });

    updateState({ detailRows: newRows });
  };

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
      poNo: "",
      drNo: "",
      siNo: "",
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
    });

    updateTotalsDisplay(0);
  };

  const handleOpenVatLookup = (rowIndex) => {
    if (isFormDisabled) return;
    updateState({ vatLookupOpen: true, vatLookupRowIndex: rowIndex });
  };

  const handleCloseVatLookup = (vat) => {
    const rowIndex = state.vatLookupRowIndex;

    updateState({ vatLookupOpen: false, vatLookupRowIndex: null });

    if (!vat || rowIndex === null || rowIndex === undefined) return;

    const updatedRows = [...detailRows];
    const row = { ...updatedRows[rowIndex] };

    // set VAT code always
    row.vatCode = vat?.vatCode || "";

    // set VAT rate from lookup (supports various backend keys)
    const rate =
      vat?.vatRate ??
      vat?.vat_rate ??
      vat?.rate ??
      vat?.vatPerc ??
      vat?.vat_percent ??
      "";

    row.vatRate = String(vat?.vatRate ?? "");


    updatedRows[rowIndex] = row;
    updateState({ detailRows: updatedRows });
  };

  const loadCompanyData = async () => {
  updateState({ isLoading: true });

  try {
    // -------------------------------------------------------
    // 1) DOC CONTROL (document name / series / length)
    // -------------------------------------------------------
    const docRow = await useTopDocControlRow(docType);
    if (docRow) {
      // NOTE: adjust property names if your docRow keys differ
      updateState({
        documentName: docRow.docName ?? docRow.DOC_NAME ?? state.documentName,
        documentSeries: docRow.docSeries ?? docRow.DOC_SERIES ?? state.documentSeries,
        documentDocLen: Number(docRow.docLen ?? docRow.DOC_LEN ?? state.documentDocLen),
      });
    }

    // -------------------------------------------------------
    // 2) HS OPTION (currency mode + defaults)
    // -------------------------------------------------------
    const hs = await useTopHSOption();
    if (hs) {
      const defaultCurr = hs.glCurrDefault ?? hs.GLCURR_DEFAULT ?? state.currCode ?? "PHP";

      updateState({
        glCurrMode: hs.glCurrMode ?? hs.GLCURR_MODE ?? state.glCurrMode,
        glCurrDefault: defaultCurr,

        withCurr2: String(hs.withCurr2 ?? hs.WITH_CURR2 ?? "N").toUpperCase() === "Y",
        withCurr3: String(hs.withCurr3 ?? hs.WITH_CURR3 ?? "N").toUpperCase() === "Y",

        glCurrGlobal1: hs.glCurrGlobal1 ?? hs.GLCURR_GLOBAL1 ?? "",
        glCurrGlobal2: hs.glCurrGlobal2 ?? hs.GLCURR_GLOBAL2 ?? "",
        glCurrGlobal3: hs.glCurrGlobal3 ?? hs.GLCURR_GLOBAL3 ?? "",

        // set default currency for transaction
        currCode: defaultCurr,
      });

      // -------------------------------------------------------
      // 3) TOP CURRENCY ROW (currency name, default rate)
      // -------------------------------------------------------
      const currRow = await useTopCurrencyRow(defaultCurr);
      if (currRow) {
        updateState({
          currName: currRow.currName ?? currRow.CURR_NAME ?? state.currName,
          // If you always treat base currency as 1, keep this:
          currRate: formatNumber(1, 6),
          // If you prefer currency table rate, use this instead:
          // currRate: formatNumber(currRow.currRate ?? currRow.CURR_RATE ?? 1, 6),
        });
      } else {
        // fallback safe defaults
        updateState({
          currName: state.currName || defaultCurr,
          currRate: formatNumber(1, 6),
        });
      }
    }

    // -------------------------------------------------------
    // 4) FIELD LENGTH CHECK (MSAJ style)
    // -------------------------------------------------------
    const lens = await useFieldLenghtCheck("msrr_hd,msrr_dt1,msrr_dt2");
    if (Array.isArray(lens)) {
      updateState({ tblFieldArray: lens });
    }
  } catch (err) {
    console.error("loadCompanyData error:", err);
    Swal.fire({
      icon: "error",
      title: "Initialization Error",
      text: err?.message || "Failed to load defaults.",
    });
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

  const fetchTranData = async (rrNo, _branchCode) => {
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
  const res = await useFetchTranData(rrNo, _branchCode, docType, "rrNo");

  // ✅ handle Laravel format: { success:true, data:[{ result:"{...}" }] }
  let data = res;
  if (res?.success && Array.isArray(res?.data)) {
    const raw = res.data?.[0]?.result;
    data = raw ? JSON.parse(raw) : null;
  }

  // ✅ RR "not found" must check rrHdId (or rrNo)
  if (!data?.rrHdId) {
    Swal.fire({
      icon: "info",
      title: "No Records Found",
      text: "Transaction does not exist.",
    });
    return resetState();
  }

  const rrDateForHeader = data.rrDate
    ? new Date(data.rrDate).toISOString().split("T")[0]
    : "";

  // ✅ Map RR dt1 -> your table expects rrQty field
  const retrievedDetailRows = (data.dt1 || []).map((item, idx) => ({
    lN: item.lN ?? String(idx + 1),

    // references
    prNo: item.prNo ?? "",
    LineNo: item.LineNo ?? "",
    poNo: item.poNo ?? "",
    poLineNo: item.poLineNo ?? "",

    rcCode: item.rcCode ?? "",
    invType: item.invType ?? "",

    itemCode: item.itemCode ?? "",
    itemName: item.itemName ?? "",
    uomCode: item.uomCode ?? "",

    // ✅ RR quantity from backend is rrQuantity
    rrQty: formatNumber(item.rrQuantity ?? 0, 6),
    whName: item.whouseCode ?? "",   // ✅ so details show something
locName: item.locCode ?? "",


    // optional other amounts if your grid shows them
    unitCost: formatNumber(item.unitCost ?? 0, 6),
    grossAmount: formatNumber(item.grossAmount ?? 0, 2),
    discRate: formatNumber(item.discRate ?? 0, 2),
    discAmount: formatNumber(item.discAmount ?? 0, 2),
    netAmount: formatNumber(item.netAmount ?? 0, 2),
    vatCode: item.vatCode ?? "",
    vatAmount: formatNumber(item.vatAmount ?? 0, 2),
    itemAmount: formatNumber(item.itemAmount ?? 0, 2),

    itemSpecs: item.itemSpecs ?? "",
    lotNo: item.lotNo ?? "",
    bbDate: item.bbDate ? new Date(item.bbDate).toISOString().split("T")[0] : "",
    qstatCode: item.qstatCode ?? "",

    whouseCode: item.whouseName ?? "",
    locCode: item.locName ?? "",
  }));

  // ✅ total should be RR qty (not qtyNeeded)
  const totalRRQty = retrievedDetailRows.reduce(
    (acc, r) => acc + (parseFormattedNumber(r.rrQty) || 0),
    0
  );
  updateTotalsDisplay(totalRRQty);

  // ✅ Update state using RR keys
  updateState({
    documentStatus: data.status ?? "OPEN",
    status: data.status ?? "OPEN",

    documentID: data.rrHdId,
    documentNo: data.rrNo,

    branchCode: data.branchCode ?? _branchCode,

    header: {
      rr_date: rrDateForHeader,
    },

    vendCode: data.vendCode ?? "",
    vendName: data.vendName ?? "",
    poNo: data.poNo ?? "",
    drNo: data.drNo ?? "",
    siNo: data.siNo ?? "",
    currCode: data.currCode ?? "PHP",
    currRate: formatNumber(data.currRate ?? 1, 6),

    WHcode: data.whouseCode ?? "",
  WHname: data.whouseCode ?? "",   // ✅ fallback display
  locCode: data.locCode ?? "",
  locName: data.locCode ?? "",

    remarks: data.remarks ?? "",
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
      invType: "MS",
      groupId: selectedItem.categCode || "",
      poStatus: status || "",
      itemCode: selectedItem.itemCode || "",
      itemName: selectedItem.itemName || "",
      uomCode: selectedItem.uom || "",
      qtyOnHand: formatNumber(selectedItem.qtyHand ?? 0, 6),
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
      freeQty: "0.000000",

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
    updateState({ selectedPoTranType: e.target.value });
  };

  const handlePrTypeChange = (e) => {
    updateState({ selectedPoType: e.target.value });
  };

  // ==========================
  // DETAIL (PR_DT1) HANDLERS
  // ==========================

  const fetchVatRate = async (vatCode) => {
  if (!vatCode) return "";

  const res = await fetchData(`/getVat?VAT_CODE=${encodeURIComponent(vatCode)}`);

  if (!res?.success) return "";

  // Laravel returns: { success:true, data:[ { result:"[...json...]" } ] }
  const row0 = res?.data?.[0];
  if (!row0?.result) return "";

  const parsed = JSON.parse(row0.result);
  const vat = Array.isArray(parsed) ? parsed[0] : parsed;

  return vat?.vatRate ?? "";
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
  const handleSelectTypeAndAddRow = (typeCode) => {
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
      freeQty: "0.000000",
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
      // optional: if you want to auto-set WH based on selected location:
      // WHcode: row?.whCode ?? state.WHcode,
    });
  };

  const recalcMSRRRow = (row) => {
  const rrQty = parseFormattedNumber(row.rrQty || 0);
  const freeQty = parseFormattedNumber(row.freeQty || 0);
  const unitCost = parseFormattedNumber(row.unitCost || 0);
  const vatRate = parseFormattedNumber(row.vatRate || 0);

  // ✅ ONLY chargeable quantity
  const chargeableQty = Math.max(rrQty - freeQty, 0);

  const gross = chargeableQty * unitCost;

  // VAT-inclusive example (adjust if exclusive in your setup)
  const vatAmt = vatRate
    ? gross - gross / (1 + vatRate / 100)
    : 0;

  const netAmt = gross - vatAmt;

  return {
    ...row,
    grossAmount: formatNumber(gross, 2),
    vatAmount: formatNumber(vatAmt, 2),
    netAmount: formatNumber(netAmt, 2),
    amount: formatNumber(gross, 2), // your Amount column
  };
};


  const handleDetailChange = (index, field, value) => {
  const updatedRows = [...detailRows];
  let row = { ...updatedRows[index] };

  if (
    [
      "rrQty",
      "freeQty",
      "unitCost",
      "vatRate"
    ].includes(field)
  ) {
    row[field] = value.replace(/[^0-9.]/g, "");
  } else {
    row[field] = value;
  }

  // ✅ recompute amounts EXCLUDING free quantity
  row = recalcMSRRRow(row);

  updatedRows[index] = row;
  updateState({ detailRows: updatedRows });

  // ✅ totals should count ONLY RR qty (not free)
  const totalRRQty = updatedRows.reduce(
    (acc, r) => acc + parseFormattedNumber(r.rrQty || 0),
    0
  );
  updateTotalsDisplay(totalRRQty);
};

const totalDebitGL = (state.detailRowsGL || []).reduce(
  (sum, r) => sum + parseFormattedNumber(r?.debit || 0),
  0
);

const totalCreditGL = (state.detailRowsGL || []).reduce(
  (sum, r) => sum + parseFormattedNumber(r?.credit || 0),
  0
);

const diffGL = totalDebitGL - totalCreditGL;


  // ==========================
  // SAVE / UPSERT (PR + DT1)
  // ==========================
  const handleActivityOption = async (action) => {
  if (documentStatus !== "") return;

  updateState({ isLoading: true });

  try {
    const isNew = !state.documentID;

    const glData = {
      branchCode: state.branchCode,

      rrNo: isNew ? "" : (state.documentNo || ""),
      rrHdId: isNew ? "" : (state.documentID || ""),

      rrDate: header?.rr_date || state.rrDate || null,

      poNo: state.poNo || "",
      vendCode: state.vendCode || "",
      vendName: state.vendName || "",

      drNo: state.drNo || "",
      siNo: state.siNo || "",
      siDate: header?.si_date || null,

      currCode: state.currCode || "PHP",
      currRate: parseFormattedNumber(state.currRate || 1),

      whouseCode: state.WHcode || "",
      locCode: state.locCode || "",

      remarks: state.remarks || "",
      userCode: state.userCode || user?.USER_CODE || "NSI",

      // ✅ DT1
      dt1: (state.detailRows || []).map((row, idx) => ({
        lN: String(row.lN ?? (idx + 1)),
        invType: row.invType || "MS",
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        uomCode: row.uomCode || "",
        rrQuantity: parseFormattedNumber(row.rrQty || 0),
        unitCost: parseFormattedNumber(row.unitCost || 0),
        grossAmount: parseFormattedNumber(row.grossAmount || 0),
        discRate: parseFormattedNumber(row.discRate || 0),
        discAmount: parseFormattedNumber(row.discAmount || 0),
        netAmount: parseFormattedNumber(row.netAmount || 0),
        vatCode: row.vatCode || "",
        vatAmount: parseFormattedNumber(row.vatAmount || 0),
        itemAmount: parseFormattedNumber(row.grossAmount || 0),
        lotNo: row.lotNo || "",
        bbDate: row.bbDate ? row.bbDate : null,
        qstatCode: row.qcStatus || "",
        rcCode: state.rcCode || row.rcCode || "",
        whouseCode: state.WHcode || "",
        locCode: state.locCode || "",
        poNo: state.poNo || row.poNo || "",
        poLineNo: row.poLineNo || "",
        poBalance: parseFormattedNumber(row.poBalance || 0),
        itemSpecs: row.itemSpecs || "",
      })),

      // ✅ DT2 (General Ledger)
      dt2: (state.detailRowsGL || []).map((r, i) => ({
        recNo: String(i + 1),
        acctCode: r.acctCode || "",
        rcCode: r.rcCode || "",
        sltypeCode: r.sltypeCode || "",
        slCode: r.slCode || "",
        particular: r.particular || "",
        vatCode: r.vatCode || "",
        atcCode: r.atcCode || "",
        debit: parseFormattedNumber(r.debit || 0),
        credit: parseFormattedNumber(r.credit || 0),
        debitFx1: parseFormattedNumber(r.debitFx1 || 0),
        creditFx1: parseFormattedNumber(r.creditFx1 || 0),
        debitFx2: parseFormattedNumber(r.debitFx2 || 0),
        creditFx2: parseFormattedNumber(r.creditFx2 || 0),
        slRefNo: r.slRefNo || "",
        slRefDate: r.slRefDate ? r.slRefDate : null,
        remarks: r.remarks || "",
        dt1Lineno: r.dt1Lineno || "",
      })),
    };

    if (action === "GenerateGL") {
      const newGlEntries = await useGenerateGLEntries(docType, glData);
      if (newGlEntries) updateState({ detailRowsGL: newGlEntries });
      return;
    }

    if (action === "Upsert") {
      const response = await useTransactionUpsert(
        docType,
        glData,
        updateState,
        "rrHdId",
        "rrNo"
      );

      if (response) {
        useSwalshowSaveSuccessDialog(handleReset, () =>
          handleSaveAndPrint(response.data[0].rrHdId)
        );
        updateState({ isDocNoDisabled: true, isFetchDisabled: true });
      }
    }
  } catch (err) {
    console.error("MSRR action error:", err);
  } finally {
    updateState({ isLoading: false });
  }
};

const handleAddGLRow = () => {
  if (isFormDisabled) return;

  const rows = [...(state.detailRowsGL || [])];

  const next = {
    id: rows.length + 1,

    acctCode: "",
    acctName: "",

    sltypeCode: "", // will be set by COA/SL rules via lookup/updateRow
    slCode: "",
    slName: "",

    rcCode: state.rcCode || "",
    rcName: state.rcName || "",

    vatCode: "",
    vatName: "",

    atcCode: "",
    atcName: "",

    particular: "",

    debit: "0.00",
    credit: "0.00",

    debitFx1: "0.00",
    creditFx1: "0.00",
    debitFx2: "0.00",
    creditFx2: "0.00",

    slRefNo: "",
    slRefDate: null,
    remarks: "",

    dt1Lineno: "", // keep for linking to dt1 if needed
  };

  updateState({ detailRowsGL: [...rows, next] });
};


const handleDeleteGLRow = (index) => {
  if (isFormDisabled) return;
  const rows = [...(state.detailRowsGL || [])];
  rows.splice(index, 1);

  // re-id like MSAJ
  const resequenced = rows.map((r, i) => ({ ...r, id: i + 1 }));
  updateState({ detailRowsGL: resequenced });
};

const openGLModal = (index, modalKey) => {
  if (isFormDisabled) return;
  updateState({ glRowIndex: index, [modalKey]: true });
};

const applyLookupToGLRow = async (field, selected) => {
  const idx = state.glRowIndex;
  if (idx < 0) return;

  const rows = [...(state.detailRowsGL || [])];
  const currentRow = rows[idx];

  // ✅ Ask backend to fill acctName/slName/rcName/vatName/atcName etc (same as MSAJ)
  const lookedUp = await useUpdateRowGLEntries(
    currentRow,
    field,
    selected,
    state.vendCode || "",
    docType
  );

  if (lookedUp) {
    rows[idx] = {
      ...currentRow,
      acctCode: lookedUp.acctCode ?? currentRow.acctCode,
      acctName: lookedUp.acctName ?? currentRow.acctName,
      sltypeCode: lookedUp.sltypeCode ?? currentRow.sltypeCode,
      slCode: lookedUp.slCode ?? currentRow.slCode,
      slName: lookedUp.slName ?? currentRow.slName,
      rcCode: lookedUp.rcCode ?? currentRow.rcCode,
      rcName: lookedUp.rcName ?? currentRow.rcName,
      vatCode: lookedUp.vatCode ?? currentRow.vatCode,
      vatName: lookedUp.vatName ?? currentRow.vatName,
      atcCode: lookedUp.atcCode ?? currentRow.atcCode,
      atcName: lookedUp.atcName ?? currentRow.atcName,
      particular: lookedUp.particular ?? currentRow.particular,
    };
  } else {
    // fallback if lookupGL didn’t return anything
    rows[idx] = { ...currentRow, ...selected };
  }

  updateState({ detailRowsGL: rows });
};

const handleGLAmountChange = async (index, field, value) => {
  const rows = [...(state.detailRowsGL || [])];
  rows[index] = { ...rows[index], [field]: value };
  updateState({ detailRowsGL: rows });

  // ✅ recompute Fx fields like MSAJ (editEntries API)
  const edited = await useUpdateRowEditEntries(
    rows[index],
    field,
    value,
    state.currCode || "PHP",
    parseFormattedNumber(state.currRate || 1),
    header?.rr_date || state.rrDate || null
  );

  if (edited) {
    rows[index] = {
      ...rows[index],
      debit: edited.debit ? formatNumber(edited.debit) : rows[index].debit,
      credit: edited.credit ? formatNumber(edited.credit) : rows[index].credit,
      debitFx1: edited.debitFx1 ? formatNumber(edited.debitFx1) : rows[index].debitFx1,
      creditFx1: edited.creditFx1 ? formatNumber(edited.creditFx1) : rows[index].creditFx1,
      debitFx2: edited.debitFx2 ? formatNumber(edited.debitFx2) : rows[index].debitFx2,
      creditFx2: edited.creditFx2 ? formatNumber(edited.creditFx2) : rows[index].creditFx2,
    };
    updateState({ detailRowsGL: rows });
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

  const handleClosePayeeLookup = (row) => {
    // closed/cancel
    if (!row) {
      updateState({ payeeLookupOpen: false });
      return;
    }

    updateState({
      payeeLookupOpen: false,
      vendCode: row?.vend_code ?? row?.vendCode ?? "", // keep both if you have the typo key
      vendCode: row?.vend_code ?? row?.vendCode ?? "",
      vendName: row?.vend_name ?? row?.vendName ?? "",
    });
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
  // Post/Cancel should be allowed only when OPEN (documentStatus === "")
  if (confirmation && documentStatus === "" && documentID) {
    const result = await useHandleCancel(
      docType,
      documentID,
      userCode || user?.USER_CODE || "NSI",
      confirmation.password,   // ✅ password
      confirmation.reason,     // ✅ reason
      updateState
    );

    if (result?.success) {
      Swal.fire({ icon: "success", title: "Success", text: "Cancelled successfully." });
      await fetchTranData(documentNo, branchCode);
    }
  }

  updateState({ showCancelModal: false });
};


  const handleClosePost = async (confirmation) => {
  // only allow post if still OPEN
  if (confirmation && documentStatus === "" && documentID) {
    await useHandlePostTran(
      [documentID], // ✅ groupId list — use documentID (common pattern)
      confirmation.password,
      docType,
      userCode || user?.USER_CODE || "NSI",
      (loading) => updateState({ isLoading: loading }),
      () => updateState({ showPostModal: false })
    );

    // refresh after posting
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
                    MSRR NO.
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
                    MSRR Date
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="poNo"
                    value={poNo}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label htmlFor="poNo" className="global-tran-floating-label">
                    PO No
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFormDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() => updateState({ poLookupModalOpen: true })}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </div>

              {/* Column 2: Responsibility Center / Requesting Dept / Tran Type */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Responsibility Center */}
                {/* Payee Code. */}
                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="vendCode"
                    value={vendCode}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                    onClick={() => updateState({ payeeLookupOpen: true })}
                  />

                  <label
                    htmlFor="vendCode"
                    className="global-tran-floating-label"
                  >
                    Payee Code <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    disabled={isFormDisabled}
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    onClick={() => updateState({ payeeLookupOpen: true })}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                  <div></div>
                </div>

                {/* Ref No (Payee Name) */}
                <div className="relative">
                  <input
                    type="text"
                    id="vendName"
                    value={vendName}
                    placeholder=" "
                    onChange={(e) => updateState({ vendName: e.target.value })}
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                    onClick={() => updateState({ payeeLookupOpen: true })}
                  />
                  <label
                    htmlFor="vendName"
                    className="global-tran-floating-label"
                  >
                    Payee Name <span className="text-red-500">*</span>
                  </label>
                </div>

                {/* PR Tran Type */}
                <div className="relative">
                  <input
                    type="text"
                    id="siNo"
                    value={siNo || ""}
                    placeholder=" "
                    onChange={(e) => updateState({ siNo: e.target.value })}
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label htmlFor="siNo" className="global-tran-floating-label">
                    SI No.
                  </label>
                </div>

                {/* DR DATE  */}
                <div className="relative">
                  <input
                    type="text"
                    id="drNo"
                    value={drNo || ""}
                    placeholder=" "
                    onChange={(e) => updateState({ drNo: e.target.value })}
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label htmlFor="drNo" className="global-tran-floating-label">
                    Reference No. <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>

              {/* Column 3: Currency */}
              <div className="global-tran-textbox-group-div-ui">
                {/* NEW FLEX CONTAINER FOR CURRENCY AND CURRENCY RATE */}
                <div className="relative w-full">
                  <div className="relative">
                    <input
                      type="date"
                      id="SIdate"
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
                      htmlFor="SIdate"
                      className="global-tran-floating-label"
                    >
                      SI Date
                    </label>
                  </div>

                  {/* Currency */}
                  {/* <div className="relative flex-grow w-2/3"> 
                        <input type="text" 
                            id="currCode" 
                            value={currCode}  
                            className="peer global-tran-textbox-ui hidden"/>
                            
                          <input type="text" 
                            id="currName" 
                            value={currName}  
                            className="peer global-tran-textbox-ui"/>

                        <label htmlFor="currCode" className="global-tran-floating-label">Currency</label>
                        <button onClick={() => {updateState({ currencyModalOpen: true })}}                        
                            className={`global-tran-textbox-button-search-padding-ui ${
                                isFetchDisabled
                                ? "global-tran-textbox-button-search-disabled-ui"
                                : "global-tran-textbox-button-search-enabled-ui"
                            } global-tran-textbox-button-search-ui`}
                            disabled={isFormDisabled} 
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </button>
                    </div> */}
                  <div></div>
                </div>

                {/* WareHouse  */}

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
                  <div></div>
                </div>

                {/* Currency */}
                {/* <div className="relative flex-grow"> 
                       <input type="text" id="currRate" value={currRate} 
                            onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                                updateState({ currRate: sanitizedValue })
                            }}}
                            onBlur={handleCurrRateNoBlur}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault(); 
                                document.getElementById("refDocNo1")?.focus();
                              }}}
                            onFocus={(e) => {
                              if (parseFormattedNumber(e.target.value) === 0) {
                                e.target.value = "";
                              }
                            }} 

                            placeholder=" "
                            className="peer global-tran-textbox-ui text-right" disabled={isFormDisabled || glCurrDefault === currCode} />
                            
                        <label htmlFor="currName" className="global-tran-floating-label"> Currency Rate
                        </label>
                  </div> */}

                {/* Payterm */}

                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="locName"
                    value={state.locName || state.locCode || ""} // or show locCode if you prefer
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({ locationLookupOpen: true })
                    }
                  />

                  <label
                    htmlFor="vendCode"
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
                  <div></div>
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
                    <th className="global-tran-th-ui">Specification</th>
                    <th className="global-tran-th-ui">UOM</th>
                    <th className="global-tran-th-ui">RR Quantity</th>
                    <th className="global-tran-th-ui">Free Quantity</th>
                    <th className="global-tran-th-ui">Unit Cost</th>
                    <th className="global-tran-th-ui">Amount</th>
                    <th className="global-tran-th-ui">VAT</th>
                    <th className="global-tran-th-ui">VAT Rate</th>
                    <th className="global-tran-th-ui">VAT Amount</th>
                    <th className="global-tran-th-ui">Net Amount</th>
                    <th className="global-tran-th-ui">Lot No</th>
                    <th className="global-tran-th-ui">BB Date</th>
                    <th className="global-tran-th-ui">QC Status</th>
                    <th className="global-tran-th-ui">Warehouse</th>
                    <th className="global-tran-th-ui">Location</th>
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
  className="w-[220px] global-tran-td-inputclass-ui cursor-pointer"
  value={row.itemSpecs || ""}
  readOnly
  onDoubleClick={() => openSpecsModal(index)}
  title="Double-click to edit specification"
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

                      {/* RR Quantity */}
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

                      {/* Free Quantity */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.freeQty || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "freeQty", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Unit Cost */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.unitCost || ""}
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

                      {/* Amount (GROSS_AMOUNT) */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[140px] global-tran-td-inputclass-ui text-right"
                          value={row.grossAmount || ""} // ✅ shows GROSS_AMOUNT
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "grossAmount",
                              e.target.value
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* VAT Code (lookup) */}
                      <td className="global-tran-td-ui">
                        <div className="relative">
                          <input
                            type="text"
                            className="w-[90px] global-tran-td-inputclass-ui pr-10 cursor-pointer"
                            value={row.vatCode || ""}
                            readOnly
                            onClick={() => handleOpenVatLookup(index)}
                            disabled={isFormDisabled}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-1 flex items-center px-2"
                            onClick={() => handleOpenVatLookup(index)}
                            disabled={isFormDisabled}
                            tabIndex={-1}
                          >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                          </button>
                        </div>
                      </td>

                      {/* VAT Rate (from VAT lookup) */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.vatRate || ""}
                          readOnly
                          disabled
                        />
                      </td>

                      {/* VAT Amount */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[140px] global-tran-td-inputclass-ui text-right"
                          value={row.vatAmount || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "vatAmount",
                              e.target.value
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Net Amount */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[140px] global-tran-td-inputclass-ui text-right"
                          value={row.netAmount || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "netAmount",
                              e.target.value
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Lot No */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[110px] global-tran-td-inputclass-ui"
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
                          className="w-[130px] global-tran-td-inputclass-ui"
                          value={""}
                          onChange={(e) =>
                            handleDetailChange(index, "bbDate", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* QC Status */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui"
                          value={row.qcStatus || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "qcStatus",
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
                          value={row.whName || state.WHname || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "whName", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Location */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[160px] global-tran-td-inputclass-ui"
                          value={row.locName || state.locName || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "locName", e.target.value)
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
                  {totals.rrQty}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* =====================
    GENERAL LEDGER (DT2)
   ===================== */}
<div className="global-tran-tab-div-ui mt-3">
  <div className="global-tran-tab-nav-ui flex items-center justify-between">
    <div className="flex flex-row sm:flex-row">
      <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
        General Ledger
      </span>
    </div>

    {!isFormDisabled && (
      <button
        type="button"
        className="global-tran-tab-footer-button-add-ui"
        onClick={() => handleActivityOption("GenerateGL")}
      >
        Generate GL
      </button>
    )}
  </div>

  <div className="global-tran-table-main-div-ui">
    <div className="global-tran-table-main-sub-div-ui">
      <table className="min-w-full border-collapse">
        <thead className="global-tran-thead-div-ui">
          <tr>
            <th className="global-tran-th-ui">LN</th>
            <th className="global-tran-th-ui">Account</th>
            <th className="global-tran-th-ui">SL Type</th>
            <th className="global-tran-th-ui">SL</th>
            <th className="global-tran-th-ui">RC</th>
            <th className="global-tran-th-ui">Particular</th>
            <th className="global-tran-th-ui">VAT</th>
            <th className="global-tran-th-ui">ATC</th>
            <th className="global-tran-th-ui">Debit</th>
            <th className="global-tran-th-ui">Credit</th>
            {!isFormDisabled && (
              <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                Delete
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {(state.detailRowsGL || []).map((row, index) => (
            <tr key={index} className="global-tran-tr-ui">
              <td className="global-tran-td-ui text-center">{index + 1}</td>

              {/* Account */}
              <td className="global-tran-td-ui">
                <div className="relative">
                  <input
                    type="text"
                    className="w-[140px] global-tran-td-inputclass-ui pr-10 cursor-pointer"
                    value={row.acctCode || ""}
                    readOnly
                    onClick={() => openGLModal(index, "showCOALookup")}
                    disabled={isFormDisabled}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-1 flex items-center px-2"
                    onClick={() => openGLModal(index, "showCOALookup")}
                    disabled={isFormDisabled}
                    tabIndex={-1}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
                <div className="text-[11px] opacity-70">{row.acctName || ""}</div>
              </td>

              {/* SL Type */}
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[80px] global-tran-td-inputclass-ui"
                  value={row.sltypeCode || ""}
                  readOnly
                  disabled
                />
              </td>

              {/* SL */}
              <td className="global-tran-td-ui">
                <div className="relative">
                  <input
                    type="text"
                    className="w-[120px] global-tran-td-inputclass-ui pr-10 cursor-pointer"
                    value={row.slCode || ""}
                    readOnly
                    onClick={() => openGLModal(index, "showSLLookup")}
                    disabled={isFormDisabled}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-1 flex items-center px-2"
                    onClick={() => openGLModal(index, "showSLLookup")}
                    disabled={isFormDisabled}
                    tabIndex={-1}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
                <div className="text-[11px] opacity-70">{row.slName || ""}</div>
              </td>

              {/* RC */}
              <td className="global-tran-td-ui">
                <div className="relative">
                  <input
                    type="text"
                    className="w-[110px] global-tran-td-inputclass-ui pr-10 cursor-pointer"
                    value={row.rcCode || ""}
                    readOnly
                    onClick={() => openGLModal(index, "showRCLookupGL")}
                    disabled={isFormDisabled}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-1 flex items-center px-2"
                    onClick={() => openGLModal(index, "showRCLookupGL")}
                    disabled={isFormDisabled}
                    tabIndex={-1}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
                <div className="text-[11px] opacity-70">{row.rcName || ""}</div>
              </td>

              {/* Particular */}
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[220px] global-tran-td-inputclass-ui"
                  value={row.particular || ""}
                  onChange={(e) => {
                    const rows = [...(state.detailRowsGL || [])];
                    rows[index] = { ...rows[index], particular: e.target.value };
                    updateState({ detailRowsGL: rows });
                  }}
                  disabled={isFormDisabled}
                />
              </td>

              {/* VAT */}
              <td className="global-tran-td-ui">
                <div className="relative">
                  <input
                    type="text"
                    className="w-[90px] global-tran-td-inputclass-ui pr-10 cursor-pointer"
                    value={row.vatCode || ""}
                    readOnly
                    onClick={() => openGLModal(index, "showVATLookupGL")}
                    disabled={isFormDisabled}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-1 flex items-center px-2"
                    onClick={() => openGLModal(index, "showVATLookupGL")}
                    disabled={isFormDisabled}
                    tabIndex={-1}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </td>

              {/* ATC */}
              <td className="global-tran-td-ui">
                <div className="relative">
                  <input
                    type="text"
                    className="w-[90px] global-tran-td-inputclass-ui pr-10 cursor-pointer"
                    value={row.atcCode || ""}
                    readOnly
                    onClick={() => openGLModal(index, "showATCLookupGL")}
                    disabled={isFormDisabled}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-1 flex items-center px-2"
                    onClick={() => openGLModal(index, "showATCLookupGL")}
                    disabled={isFormDisabled}
                    tabIndex={-1}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </td>

              {/* Debit */}
              <td className="global-tran-td-ui text-right">
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.debit || "0.00"}
                  onChange={(e) => handleGLAmountChange(index, "debit", e.target.value)}
                  disabled={isFormDisabled}
                />
              </td>

              {/* Credit */}
              <td className="global-tran-td-ui text-right">
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.credit || "0.00"}
                  onChange={(e) => handleGLAmountChange(index, "credit", e.target.value)}
                  disabled={isFormDisabled}
                />
              </td>

              {/* Delete */}
              {!isFormDisabled && (
                <td className="global-tran-td-ui text-center sticky right-0">
                  <button
                    className="global-tran-td-button-delete-ui"
                    onClick={() => handleDeleteGLRow(index)}
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

  {/* Footer */}
  <div className="global-tran-tab-footer-main-div-ui">
    <div className="global-tran-tab-footer-button-div-ui">
      <button
        onClick={handleAddGLRow}
        disabled={isFormDisabled}
        className={`global-tran-tab-footer-button-add-ui ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2" />
        Add GL Row
      </button>
    </div>

    <div className="global-tran-tab-footer-total-main-div-ui">
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">Total Debit:</label>
        <label className="global-tran-tab-footer-total-value-ui">{formatNumber(totalDebitGL)}</label>
      </div>

      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">Total Credit:</label>
        <label className="global-tran-tab-footer-total-value-ui">{formatNumber(totalCreditGL)}</label>
      </div>

      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">Difference:</label>
        <label className="global-tran-tab-footer-total-value-ui">
          {formatNumber(diffGL)}
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

      {state.payeeLookupOpen && (
        <PayeeMastLookupModal
          isOpen={state.payeeLookupOpen}
          onClose={handleClosePayeeLookup}
        />
      )}

      {state.warehouseLookupOpen && (
        <WarehouseLookupModal
          isOpen={state.warehouseLookupOpen}
          onClose={handleCloseWarehouseLookup}
          filter="ActiveAll"
        />
      )}

      {state.locationLookupOpen && (
        <LocationLookupModal
          isOpen={state.locationLookupOpen}
          onClose={handleCloseLocationLookup}
          filter="ActiveAll"
        />
      )}

      {custModalOpen && (
        <CustomerMastLookupModal
          isOpen={custModalOpen}
          onClose={handleCloseCustModal}
        />
      )}

      {state.vatLookupOpen && (
  <VATLookupModal
    isOpen={state.vatLookupOpen}
    onClose={handleCloseVatLookup}
    customParam="ActiveAll"
  />
)}

{/* COA Lookup */}
<COAMastLookupModal
  isOpen={state.showCOALookup}
  onClose={() => updateState({ showCOALookup: false })}
  onSelect={(item) => {
    updateState({ showCOALookup: false });
    applyLookupToGLRow("acctCode", { acctCode: item.acctCode });
  }}
/>

{/* SL Lookup */}
<SLMastLookupModal
  isOpen={state.showSLLookup}
  onClose={() => updateState({ showSLLookup: false })}
  onSelect={(item) => {
    updateState({ showSLLookup: false });
    applyLookupToGLRow("slCode", { slCode: item.slCode, sltypeCode: item.sltypeCode });
  }}
/>

{/* RC Lookup (GL) */}
<RCLookupModal
  isOpen={state.showRCLookupGL}
  onClose={() => updateState({ showRCLookupGL: false })}
  onSelect={(item) => {
    updateState({ showRCLookupGL: false });
    applyLookupToGLRow("rcCode", { rcCode: item.rcCode });
  }}
/>

{/* VAT Lookup (GL) */}
<VATLookupModal
  isOpen={state.showVATLookupGL}
  onClose={() => updateState({ showVATLookupGL: false })}
  onSelect={(item) => {
    updateState({ showVATLookupGL: false });
    applyLookupToGLRow("vatCode", { vatCode: item.vatCode });
  }}
/>

{/* ATC Lookup (GL) */}
<ATCLookupModal
  isOpen={state.showATCLookupGL}
  onClose={() => updateState({ showATCLookupGL: false })}
  onSelect={(item) => {
    updateState({ showATCLookupGL: false });
    applyLookupToGLRow("atcCode", { atcCode: item.atcCode });
  }}
/>



      {state.poLookupModalOpen && (
        <SearchPOOpenModal
          isOpen={state.poLookupModalOpen}
          onClose={handleClosePOOpenModal}
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

      {state.specsModalOpen && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-slate-700">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Specification 
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Enter complete specification / scope of work.
        </p>
      </div>

      <div className="p-4">
        <textarea
          className="w-full h-48 resize-none rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-gray-800 dark:text-gray-100 p-3 outline-none focus:ring-2 focus:ring-blue-400"
          value={state.specsTempText || ""}
          onChange={(e) => updateState({ specsTempText: e.target.value })}
          autoFocus
        />
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
        <button
          type="button"
          className="px-3 py-2 text-xs font-medium rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600"
          onClick={closeSpecsModal}
        >
          Cancel
        </button>

        <button
          type="button"
          className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
          onClick={saveSpecsModal}
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}


      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default MSRR;
