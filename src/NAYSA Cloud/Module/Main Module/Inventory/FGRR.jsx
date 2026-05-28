import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faMinus,
  faSpinner,
  faSearch,
  faBoxOpen,
  faTableCellsLarge,
  faWarehouse,
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
import FGLookupModal from "../../../Lookup/SearchFGMast.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import QstatLookupModal from "../../../Lookup/SearchQStatRef.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";


import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Configuration
import {
  postRequest,
  fetchData,
  fetchDataJson,
} from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext.jsx";
import { useSelectedHSColConfig as getSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";

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
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { useGetCurrentDay, useFormatToDate } from "@/NAYSA Cloud/Global/dates";

// Header
import Header from "@/NAYSA Cloud/Components/Header";

const FGRR = (item) => {
  const loadedFromUrlRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { resetFlag } = useReset();
  const { user, companyInfo } = useAuth();
const [isViewDocument, setIsViewDocument] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, []);

  const isViewDocumentUrl = isViewDocument;

  const isGeneralLedgerEnabled =
    String(companyInfo?.msinvGLMode || "").toUpperCase() !== "D";

  const [topTab, setTopTab] = useState("details"); // "details" | "history"

  const openPOColSummary = [
    { key: "BC", label: "Branch", renderType: "text", width: 80 },
    { key: "PoNo", label: "PO No", renderType: "text", width: 140 },
    { key: "PoDate", label: "PO Date", renderType: "date", width: 120 },
    { key: "DelDate", label: "Del Date", renderType: "date", width: 120 },
    { key: "PoType", label: "PO Type", renderType: "text", width: 100 },
    { key: "RefNo", label: "Ref No", renderType: "text", width: 130 },
    { key: "RcCode", label: "RC Code", renderType: "text", width: 110 },
    { key: "VendCode", label: "Payee Code", renderType: "text", width: 120 },
    { key: "VendName", label: "Payee Name", renderType: "text", width: 260 },
    {
      key: "Particulars",
      label: "Particulars",
      renderType: "text",
      width: 280,
    },
    { key: "PreparedBy", label: "Prepared By", renderType: "text", width: 120 },
  ];

  const openPOColDetail = [
    { key: "BC", label: "BC", renderType: "text", width: 80 },
    { key: "PoNo", label: "PO No", renderType: "text", width: 140 },
    { key: "Type", label: "Type", renderType: "text", width: 80 },
    { key: "Ln", label: "LN", renderType: "number", roundingOff: 0, width: 70 },
    { key: "ItemCode", label: "Item Code", renderType: "text", width: 150 },
    { key: "ItemName", label: "Item Name", renderType: "text", width: 260 },
    { key: "RcCode", label: "Department", renderType: "text", width: 130 },
    { key: "UOM", label: "UOM", renderType: "text", width: 90 },
    {
      key: "QtyOrdered",
      label: "Qty Ordered",
      renderType: "number",
      roundingOff: 2,
      width: 130,
    },
    {
      key: "QtyReceived",
      label: "Qty Received",
      renderType: "number",
      roundingOff: 2,
      width: 130,
    },
    {
      key: "QtyBalance",
      label: "Qty Balance",
      renderType: "number",
      roundingOff: 2,
      width: 130,
    },
    { key: "delDate", label: "Del Date", renderType: "date", width: 120 },
  ];

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
    selectedWH: "",

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
    selectedRowIndex: null,
    showAllTranDocNo: false,

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
    openPODataSummary: [],
    openPORRColSummary: [],
    openPORRColDetail: [],
    vatLookupOpen: false,
    vatLookupRowIndex: null,
    // Specs modal
    specsModalOpen: false,
    specsRowIndex: null,
    specsTempText: "",

    // Warehouse / Location header values
    WHCode: "", // keep same key you already destructure
    WHName: "",
    LocCode: "",
    LocName: "",
    decQty: 6,
    decUcost: 6,

    // RC Lookup modal (table)
    rcLookupModalOpen: false,
    rcLookupContext: "", // "rc" or "reqDept"

    // Modal flags
    warehouseLookupOpen: false,
    locationLookupOpen: false,
    accountModalSource: null,
    showQstatModal: false,

    msLookupModalOpen: false,
    tblFieldArray: [],

    activeTab: "basic",
    GLactiveTab: "invoice", // same pattern as FGAJ (optional)
    detailRowsGL: [], // DT2 rows

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
    accountModalSource,

    // Header
    branchCode,
    branchName,
    payTerm,
    WHcode,
    tblFieldArray,
    decQty,
    decUcost,

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

poId,
prId,
prNo,
groupId,

    vendCode,
    vendName,
    LocCode,
    LocName,
    WHCode,
    WHName,

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
    GLactiveTab,

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
    showQstatModal,
    openPODataSummary,
    openPORRColSummary,
    openPORRColDetail,

    // RC Lookup
    rcLookupModalOpen,
    rcLookupContext,
    showAllTranDocNo,

    msLookupModalOpen,
  } = state;

  const [header, setHeader] = useState({
    rr_date: new Date().toISOString().split("T")[0],
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showLotPickingModal, setShowLotPickingModal] = useState(false);
  const [lotPickingRowIndex, setLotPickingRowIndex] = useState(null);
  const [lotEntryRows, setLotEntryRows] = useState([]);

  const [totals, setTotals] = useState({
    rrQty: "",
  });

  // PR.jsx
  const docType = docTypes?.FGRR || "FGRR";

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "FG Receiving Report";

  const getFullStatus = (s) => {
    const map = {
      O: "OPEN",
      C: "CLOSED",
      X: "CANCELLED",
      F: "FINALIZED",
    };
    return map[String(s || "").toUpperCase()] || s || "OPEN";
  };

  const displayStatus = getFullStatus(status);
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled =
  isViewDocumentUrl ||
  ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);


  const updateTotalsDisplay = (input) => {
    const rows = Array.isArray(input)
      ? input
      : Array.isArray(detailRows)
        ? detailRows
        : [];

    const totalRRQty = rows.reduce(
      (sum, r) => sum + (parseFormattedNumber(r?.rrQty) || 0),
      0,
    );

    setTotals({ rrQty: formatNumber(totalRRQty, 6) });
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

  // ==========================
  // INITIAL LOAD / RESET
  // ==========================

  const getPOField = (row, ...keys) => {
    for (const key of keys) {
      if (
        row?.[key] !== undefined &&
        row?.[key] !== null &&
        row?.[key] !== ""
      ) {
        return row[key];
      }
    }
    return "";
  };

  const extractLookupRows = (value) => {
    if (!value) return [];
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    if (Array.isArray(parsed?.[0]?.dt1)) return parsed[0].dt1;
    if (Array.isArray(parsed?.dt1)) return parsed.dt1;
    if (Array.isArray(parsed?.data?.[0]?.dt1)) return parsed.data[0].dt1;
    if (Array.isArray(parsed)) return parsed;
    return [];
  };

  const formatOpenPODate = (value) => {
    if (!value) return "";

    const text = String(value).trim();
    const dateOnly = text.includes("T") ? text.split("T")[0] : text;
    const ymdMatch = dateOnly.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  };

  const normalizeOpenPOSummaryRow = (row, index) => {
    const existingGroupId = getPOField(row, "groupId", "GROUP_ID");
    const tranId = getPOField(
      row,
      "TranId",
      "TRAN_ID",
      "tranId",
      "tran_id",
      "Id",
      "ID",
      "id",
    );
    const poId = getPOField(row, "PoId", "PO_ID", "poId", "po_id");
    const poNo = getPOField(row, "PoNo", "PO_NO", "poNo", "po_no");
    const formattedPoDate = formatOpenPODate(
      getPOField(row, "PoDate", "PO_DATE", "poDate", "po_date"),
    );

    return {
      ...row,
      groupId: String(existingGroupId || tranId || poId || poNo || index),
      TranId: tranId,
      tranId,
      tran_id: tranId,
      TRAN_ID: tranId,
      BC: getPOField(
        row,
        "BC",
        "Branch",
        "BRANCH",
        "branch",
        "BranchCode",
        "branchCode",
        "BRANCH_CODE",
        "BCode",
        "BCODE",
      ),
      PoId: poId,
      PoNo: poNo,
      PoDate: formattedPoDate,
      PO_DATE: formattedPoDate,
      poDate: formattedPoDate,
      po_date: formattedPoDate,
      DelDate: getPOField(row, "DelDate", "DEL_DATE", "delDate", "del_date"),
      PoType: getPOField(row, "PoType", "PO_TYPE", "poType", "po_type"),
      RefNo: getPOField(row, "RefNo", "REF_NO", "refNo", "ref_no"),
      RcCode: getPOField(row, "RcCode", "RC_CODE", "rcCode", "rc_code"),
      VendCode: getPOField(
        row,
        "VendCode",
        "VEND_CODE",
        "vendCode",
        "vend_code",
      ),
      VendName: getPOField(
        row,
        "VendName",
        "VEND_NAME",
        "vendName",
        "vend_name",
      ),

WHCode: getPOField(row, "WHCode", "WhCode", "WH_CODE", "whCode", "wh_code"),
WhCode: getPOField(row, "WHCode", "WhCode", "WH_CODE", "whCode", "wh_code"),
whCode: getPOField(row, "WHCode", "WhCode", "WH_CODE", "whCode", "wh_code"),
wh_code: getPOField(row, "WHCode", "WhCode", "WH_CODE", "whCode", "wh_code"),

WHName: getPOField(row, "WHName", "WhName", "WH_NAME", "whName", "wh_name"),
WhName: getPOField(row, "WHName", "WhName", "WH_NAME", "whName", "wh_name"),
whName: getPOField(row, "WHName", "WhName", "WH_NAME", "whName", "wh_name"),
wh_name: getPOField(row, "WHName", "WhName", "WH_NAME", "whName", "wh_name"),

Particulars: getPOField(row, "Particulars", "PARTICULARS", "remarks"),
PreparedBy: getPOField(row, "PreparedBy", "PREPARED_BY", "preparedBy"),
      Particulars: getPOField(row, "Particulars", "PARTICULARS", "remarks"),
      PreparedBy: getPOField(row, "PreparedBy", "PREPARED_BY", "preparedBy"),
    };
  };

  const normalizeOpenPODetailRow = (row, index) => {
    const existingGroupId = getPOField(row, "groupId", "GROUP_ID", "id", "ID");
    const branchCode = getPOField(
      row,
      "BC",
      "Branch",
      "BRANCH",
      "branch",
      "BranchCode",
      "branchCode",
      "BRANCH_CODE",
      "BCode",
      "BCODE",
      "bc",
    );
    const poNo = getPOField(row, "PoNo", "PO_NO", "poNo", "po_no");
    const lnNo =
      getPOField(row, "ln", "Ln", "LN", "LINE_NO", "lnNo", "line_no") ||
      index + 1;
    const itemCode = getPOField(
      row,
      "ItemCode",
      "ItemNo",
      "ITEM_NO",
      "ITEM_CODE",
      "JobCode",
      "JOB_CODE",
      "FGCode",
      "FG_CODE",
      "itemCode",
      "itemNo",
      "jobCode",
      "job_code",
      "msCode",
      "ms_code",
      "item_no",
      "item_code",
    );
    const itemName = getPOField(
      row,
      "ItemName",
      "ItemDesc",
      "ITEM_DESC",
      "ITEM_NAME",
      "Description",
      "DESCRIPTION",
      "ItemDescription",
      "ITEM_DESCRIPTION",
      "JobName",
      "JOB_NAME",
      "itemName",
      "itemDesc",
      "description",
      "itemDescription",
      "jobName",
      "job_name",
      "item_desc",
      "item_name",
    );
    const uomCode = getPOField(
      row,
      "UOM",
      "Uom",
      "UomCode",
      "UOM_CODE",
      "Unit",
      "UNIT",
      "UnitCode",
      "UNIT_CODE",
      "UomName",
      "UOM_NAME",
      "uom",
      "uomcode",
      "uomCode",
      "uom_code",
      "unit",
      "unitCode",
      "unit_code",
      "uomName",
      "uom_name",
    );
    const poQty = getPOField(
      row,
      "QtyOrdered",
      "Quantity",
      "PO_QTY",
      "PO_QUANTITY",
      "poQty",
      "poQuantity",
      "po_qty",
      "po_quantity",
    );
    const rrQty = getPOField(
      row,
      "QtyReceived",
      "RR_QTY",
      "rrQty",
      "rr_qty",
    );
    const qtyBalance = getPOField(
      row,
      "QtyBalance",
      "BalanceQty",
      "QTY_BAL",
      "QTY_BALANCE",
      "qtyBal",
      "qtyBalance",
      "balance_qty",
      "qty_balance",
    );
    const delDate = getPOField(
      row,
      "DelDate",
      "DEL_DATE",
      "DeliveryDate",
      "DELIVERY_DATE",
      "DateNeeded",
      "DATE_NEEDED",
      "NeededDate",
      "NEEDED_DATE",
      "delDate",
      "deliveryDate",
      "dateNeeded",
      "neededDate",
      "del_date",
      "delivery_date",
      "date_needed",
      "needed_date",
    );
    const unitCost = getPOField(
      row,
      "UnitCost",
      "UnitPrice",
      "UNIT_COST",
      "UNIT_PRICE",
      "unitCost",
      "unitPrice",
      "unit_cost",
      "unit_price",
    );
    const grossAmount = getPOField(
      row,
      "GrossAmount",
      "GrossAmt",
      "GROSS_AMOUNT",
      "GROSS_AMT",
      "grossAmount",
      "grossAmt",
      "gross_amount",
      "gross_amt",
    );
    const discAmount = getPOField(
      row,
      "DiscAmount",
      "DiscAmt",
      "DISC_AMOUNT",
      "DISC_AMT",
      "discAmount",
      "discAmt",
      "disc_amount",
      "disc_amt",
    );
    const vatAmount = getPOField(
      row,
      "VatAmount",
      "VatAmt",
      "VAT_AMOUNT",
      "VAT_AMT",
      "vatAmount",
      "vatAmt",
      "vat_amount",
      "vat_amt",
    );
    const netAmount = getPOField(
      row,
      "NetAmount",
      "NetAmt",
      "NET_AMOUNT",
      "NET_AMT",
      "netAmount",
      "netAmt",
      "net_amount",
      "net_amt",
    );
    const itemSpecs = getPOField(
      row,
      "ItemSpecs",
      "ITEM_SPECS",
      "itemSpecs",
      "item_specs",
      "Specs",
      "SPECS",
      "specs",
    );
    const vatCode = getPOField(row, "VatCode", "VAT_CODE", "vatCode", "vat_code");
    const currCode = getPOField(row, "CurrCode", "CURR_CODE", "currCode", "curr_code");
    const rcCode = getPOField(
      row,
      "RcCode",
      "RC_CODE",
      "DeptCode",
      "DEPT_CODE",
      "DepartmentCode",
      "DEPARTMENT_CODE",
      "Department",
      "DEPARTMENT",
      "Dept",
      "DEPT",
      "ReqRcCode",
      "REQ_RC_CODE",
      "rcCode",
      "deptCode",
      "departmentCode",
      "department",
      "dept",
      "reqRcCode",
      "rc_code",
      "dept_code",
      "department_code",
      "req_rc_code",
    );

    return {
      ...row,
      groupId: String(
        existingGroupId || `${poNo}-${lnNo}-${itemCode}-${index}`,
      ),
      BC: branchCode,
      Branch: branchCode,
      branch: branchCode,
      BCode: branchCode,
      bc: branchCode,
      branchCode,
      branch_code: branchCode,
      BRANCH_CODE: branchCode,
      BRANCH: branchCode,
      BCODE: branchCode,
      PoNo: poNo,
      poNo,
      po_no: poNo,
      PO_NO: poNo,
      Type: getPOField(row, "Type", "TYPE", "invType", "INV_TYPE"),
      Ln: lnNo,
      LN: lnNo,
      lnNo,
      ln_no: lnNo,
      ItemCode: itemCode,
      ItemNo: itemCode,
      JobCode: itemCode,
      FGCode: itemCode,
      itemCode,
      itemNo: itemCode,
      jobCode: itemCode,
      msCode: itemCode,
      item_code: itemCode,
      item_no: itemCode,
      job_code: itemCode,
      ms_code: itemCode,
      ITEM_CODE: itemCode,
      ITEM_NO: itemCode,
      JOB_CODE: itemCode,
      FG_CODE: itemCode,
      ItemName: itemName,
      ItemDesc: itemName,
      Description: itemName,
      ItemDescription: itemName,
      JobName: itemName,
      itemName,
      itemDesc: itemName,
      description: itemName,
      itemDescription: itemName,
      jobName: itemName,
      item_name: itemName,
      item_desc: itemName,
      item_description: itemName,
      job_name: itemName,
      ITEM_NAME: itemName,
      ITEM_DESC: itemName,
      DESCRIPTION: itemName,
      ITEM_DESCRIPTION: itemName,
      JOB_NAME: itemName,
      UOM: uomCode,
      Uom: uomCode,
      UomCode: uomCode,
      UomName: uomCode,
      Unit: uomCode,
      UnitCode: uomCode,
      uom: uomCode,
      uomcode: uomCode,
      uomCode,
      uomName: uomCode,
      unit: uomCode,
      unitCode: uomCode,
      uom_code: uomCode,
      uom_name: uomCode,
      unit_code: uomCode,
      UOM_CODE: uomCode,
      UOM_NAME: uomCode,
      UNIT: uomCode,
      UNIT_CODE: uomCode,
      QtyOrdered: poQty,
      Quantity: poQty,
      PoQuantity: poQty,
      poQty,
      poQuantity: poQty,
      po_qty: poQty,
      po_quantity: poQty,
      PO_QTY: poQty,
      PO_QUANTITY: poQty,
      QtyReceived: rrQty,
      RrQty: rrQty,
      rrQty,
      rr_qty: rrQty,
      RR_QTY: rrQty,
      QtyBalance: qtyBalance,
      BalanceQty: qtyBalance,
      qtyBalance,
      qty_balance: qtyBalance,
      QTY_BALANCE: qtyBalance,
      QTY_BAL: qtyBalance,
      UnitCost: unitCost,
      UnitPrice: unitCost,
      unitCost,
      unitPrice: unitCost,
      unit_cost: unitCost,
      unit_price: unitCost,
      UNIT_COST: unitCost,
      UNIT_PRICE: unitCost,
      GrossAmount: grossAmount,
      GrossAmt: grossAmount,
      grossAmount,
      grossAmt: grossAmount,
      gross_amount: grossAmount,
      gross_amt: grossAmount,
      GROSS_AMOUNT: grossAmount,
      GROSS_AMT: grossAmount,
      DiscAmount: discAmount,
      DiscAmt: discAmount,
      discAmount,
      discAmt: discAmount,
      disc_amount: discAmount,
      disc_amt: discAmount,
      DISC_AMOUNT: discAmount,
      DISC_AMT: discAmount,
      VatCode: vatCode,
      vatCode,
      vat_code: vatCode,
      VAT_CODE: vatCode,
      VatAmount: vatAmount,
      VatAmt: vatAmount,
      vatAmount,
      vatAmt: vatAmount,
      vat_amount: vatAmount,
      vat_amt: vatAmount,
      VAT_AMOUNT: vatAmount,
      VAT_AMT: vatAmount,
      NetAmount: netAmount,
      NetAmt: netAmount,
      netAmount,
      netAmt: netAmount,
      net_amount: netAmount,
      net_amt: netAmount,
      NET_AMOUNT: netAmount,
      NET_AMT: netAmount,
      DelDate: delDate,
      DeliveryDate: delDate,
      DateNeeded: delDate,
      NeededDate: delDate,
      delDate,
      deliveryDate: delDate,
      dateNeeded: delDate,
      neededDate: delDate,
      del_date: delDate,
      delivery_date: delDate,
      date_needed: delDate,
      needed_date: delDate,
      DEL_DATE: delDate,
      DELIVERY_DATE: delDate,
      DATE_NEEDED: delDate,
      NEEDED_DATE: delDate,
      RcCode: rcCode,
      DeptCode: rcCode,
      DepartmentCode: rcCode,
      Department: rcCode,
      Dept: rcCode,
      ReqRcCode: rcCode,
      rcCode,
      deptCode: rcCode,
      departmentCode: rcCode,
      department: rcCode,
      dept: rcCode,
      reqRcCode: rcCode,
      rc_code: rcCode,
      dept_code: rcCode,
      department_code: rcCode,
      req_rc_code: rcCode,
      RC_CODE: rcCode,
      DEPT_CODE: rcCode,
      DEPARTMENT_CODE: rcCode,
      DEPARTMENT: rcCode,
      DEPT: rcCode,
      REQ_RC_CODE: rcCode,
      CATEG_CODE: getPOField(row, "CATEG_CODE", "categCode", "categ_code"),
      INV_TYPE: getPOField(row, "INV_TYPE", "Type", "invType", "inv_type"),
      PO_STATUS: getPOField(
        row,
        "PO_STATUS",
        "PoStatus",
        "poStatus",
        "po_status",
      ),
      LINE_NO: lnNo,
      ITEM_SPECS: itemSpecs,
      ItemSpecs: itemSpecs,
      itemSpecs,
      item_specs: itemSpecs,
      UOM_CODE2: getPOField(row, "UOM_CODE2", "uomCode2", "uom_code2"),
      UOM_QTY2: getPOField(row, "UOM_QTY2", "uomQty2", "uom_qty2"),
      CURR_CODE: currCode,
      CurrCode: currCode,
      currCode,
      curr_code: currCode,
      ITEM_AMOUNT: getPOField(row, "ITEM_AMOUNT", "itemAmount", "item_amount"),
      DISC_RATE: getPOField(row, "DISC_RATE", "discRate", "disc_rate"),
      VEND_CODE: getPOField(
        row,
        "VEND_CODE",
        "VendCode",
        "vendCode",
        "vend_code",
      ),
      VEND_NAME: getPOField(
        row,
        "VEND_NAME",
        "VendName",
        "vendName",
        "vend_name",
      ),
    };
  };

  const fillConfiguredOpenPODetailKeys = (row, columns = []) => {
    const normalizeKeyText = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const valuesByAlias = {
      branch: row.branchCode,
      branchcode: row.branchCode,
      bc: row.branchCode,
      pono: row.poNo,
      ponumber: row.poNo,
      ln: row.lnNo,
      lineno: row.lnNo,
      linenumber: row.lnNo,
      itemcode: row.itemCode,
      itemno: row.itemCode,
      itemnumber: row.itemCode,
      jobcode: row.itemCode,
      itemname: row.itemName,
      itemdesc: row.itemName,
      itemdescription: row.itemName,
      description: row.itemName,
      uom: row.uomCode,
      uomcode: row.uomCode,
      qtyordered: row.poQuantity,
      orderedqty: row.poQuantity,
      poqty: row.poQuantity,
      poquantity: row.poQuantity,
      quantity: row.poQuantity,
      qtyreceived: row.rrQty,
      receivedqty: row.rrQty,
      rrqty: row.rrQty,
      qtybalance: row.qtyBalance,
      balanceqty: row.qtyBalance,
      qtybal: row.qtyBalance,
      unitcost: row.unitCost,
      unitprice: row.unitPrice,
      grossamount: row.grossAmount,
      grossamt: row.grossAmount,
      discamount: row.discAmount,
      discamt: row.discAmount,
      vatcode: row.vatCode,
      vatamount: row.vatAmount,
      vatamt: row.vatAmount,
      netamount: row.netAmount,
      netamt: row.netAmount,
      deldate: row.delDate,
      deliverydate: row.delDate,
      dateneeded: row.delDate,
      rccode: row.rcCode,
      deptcode: row.rcCode,
      departmentcode: row.rcCode,
      department: row.rcCode,
      currcode: row.currCode,
      currency: row.currCode,
      itemspecs: row.itemSpecs,
      specs: row.itemSpecs,
    };

    return columns.reduce(
      (acc, col) => {
        const key = col?.key || col?.field || col?.name || col?.columnName;
        if (!key) return acc;

        const value =
          valuesByAlias[normalizeKeyText(key)] ??
          valuesByAlias[
            normalizeKeyText(col?.label || col?.header || col?.caption)
          ];

        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          (acc[key] === undefined || acc[key] === null || acc[key] === "")
        ) {
          acc[key] = value;
        }
        return acc;
      },
      { ...row },
    );
  };

 const getOpenPOVendorCode = (row = {}) =>
   String(
     getPOField(row, "VendCode", "VEND_CODE", "vendCode", "vend_code") || "",
   )
     .trim()
     .toUpperCase();

 const getOpenPOVendorName = (row = {}) =>
   String(
     getPOField(row, "VendName", "VEND_NAME", "vendName", "vend_name") || "",
   ).trim();

 const getUniqueOpenPOSuppliers = (records = []) => {
   const supplierMap = new Map();

   records.forEach((record) => {
     const code = getOpenPOVendorCode(record);
     const name = getOpenPOVendorName(record);
     const key = code || name.toUpperCase();

     if (key && !supplierMap.has(key)) {
       supplierMap.set(key, { code, name });
     }
   });

   return Array.from(supplierMap.values());
 };

 const validateOpenPOSameSupplier = async (records = []) => {
   const suppliers = getUniqueOpenPOSuppliers(records);

   if (suppliers.length <= 1) {
     return true;
   }

   await Swal.fire({
     icon: "warning",
     title: "Open Purchase Order",
     text: "Please select PO records from the same payee or supplier only.",
   });

   return false;
 };

 const handleOpenPOOpenLookup = async () => {
    try {
      updateState({ isLoading: true });

      const endpoint = "getFGPORR_OpenSummary";
      const response = await fetchDataJson(endpoint, { branchCode });
      const rawRows = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : [];
      const colConfig = await getSelectedHSColConfig(endpoint);
      const colConfigDetail =
        await getSelectedHSColConfig("getPORR_OpenDetail");

      const rows = Array.isArray(rawRows) ? rawRows : [];
      const openRows = rows
        .filter((row) => {
          const statusText = String(
            getPOField(row, "PO_STATUS", "PoStatus", "Status", "status"),
          ).toUpperCase();

          return !statusText || statusText.includes("OPEN");
        })
        .map(normalizeOpenPOSummaryRow);

      if (openRows.length === 0) {
        await Swal.fire({
          icon: "info",
          title: "Open Purchase Order",
          text: "No open PO records found.",
        });
        updateState({
          isLoading: false,
          openPODataSummary: [],
          openPORRColSummary: [],
          openPORRColDetail: [],
        });
        return;
      }

      updateState({
        openPODataSummary: openRows,
        openPORRColSummary:
          Array.isArray(colConfig) && colConfig.length > 0
            ? colConfig
            : openPOColSummary,
        openPORRColDetail:
          Array.isArray(colConfigDetail) && colConfigDetail.length > 0
            ? colConfigDetail
            : openPOColDetail,
        poLookupModalOpen: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Open PO lookup error:", error);
      await Swal.fire({
        icon: "info",
        title: "Open Purchase Order",
        text: "Error in fetching record.",
      });
      updateState({
        openPODataSummary: [],
        openPORRColSummary: [],
        openPORRColDetail: [],
        poLookupModalOpen: false,
        isLoading: false,
      });
    }
  };

  const handleClosePOOpenModal = async (selection) => {
  if (!selection || !selection.details || selection.details.length === 0) {
    updateState({ poLookupModalOpen: false });
    return;
  }

  try {
    const summaries = Array.isArray(selection.summary) ? selection.summary : [];
    const summary = summaries[0] || {};
    const details = selection.details || [];

    if (!(await validateOpenPOSameSupplier(summaries.length > 0 ? summaries : details))) {
      return;
    }

    updateState({ isLoading: true, poLookupModalOpen: false });

    const selectedPoNos = [
      ...new Set(
        [...summaries, ...details]
          .map((row) =>
            getPOField(row, "PoNo", "PO_NO", "poNo", "po_no"),
          )
          .filter(Boolean),
      ),
    ];
    const poWhCode =
      getPOField(
        summary,
        "WHCode",
        "WhCode",
        "WH_CODE",
        "whCode",
        "wh_code",
        "whouseCode",
      ) ||
      getPOField(
        details?.[0],
        "WHCode",
        "WhCode",
        "WH_CODE",
        "whCode",
        "wh_code",
        "whouseCode",
      );
    const poWhName =
      getPOField(
        summary,
        "WHName",
        "WhName",
        "WH_NAME",
        "whName",
        "wh_name",
        "whouseName",
      ) ||
      getPOField(
        details?.[0],
        "WHName",
        "WhName",
        "WH_NAME",
        "whName",
        "wh_name",
        "whouseName",
      );

    console.log("FGRR Reference PO warehouse fetch", {
      selection,
      summary,
      firstDetail: details?.[0] || {},
      poWhCode,
      poWhName,
      currentWarehouse: {
        WHCode,
        WHcode,
        WHName,
        stateWHCode: state.WHCode,
        stateWHcode: state.WHcode,
        stateWHName: state.WHName,
      },
    });

    const vatCodes = [
      ...new Set(details.map((d) => d.vatCode).filter(Boolean)),
    ];

    const vatRatePairs = await Promise.all(
      vatCodes.map(async (code) => [code, await fetchVatRate(code)])
    );

    const vatRateMap = Object.fromEntries(vatRatePairs);

    const parseRetrievedArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsedValue = JSON.parse(value);
      return parseRetrievedArray(parsedValue);
    } catch {
      return [];
    }
  }

  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  if (typeof value?.result === "string") return parseRetrievedArray(value.result);

  return [];
};

const dt3 = parseRetrievedArray(parsed.dt3);

console.log("✅ FETCHED FGRR DT3:", dt3);
console.table(dt3);

const normalizeLotKey = (value) => String(value || "").trim().toUpperCase();
const normalizeLotLineKey = (value) => String(value || "").trim();

const dt3ByGroup = dt3.reduce((acc, lot) => {
  const key = normalizeLotKey(lot.groupId || lot.group_id || lot.GROUP_ID || "");
  if (!key) return acc;
  if (!acc[key]) acc[key] = [];
  acc[key].push(lot);
  return acc;
}, {});

const dt3ByLine = dt3.reduce((acc, lot) => {
  const key = normalizeLotLineKey(
    lot.lnNo || lot.ln_no || lot.LN_NO || lot.lineNo || lot.LINE_NO || lot.line_no || ""
  );
  if (!key) return acc;
  if (!acc[key]) acc[key] = [];
  acc[key].push(lot);
  return acc;
}, {});

const dt3ByItem = dt3.reduce((acc, lot) => {
  const key = normalizeLotKey(lot.itemCode || lot.item_code || lot.ITEM_CODE || "");
  if (!key) return acc;
  if (!acc[key]) acc[key] = [];
  acc[key].push(lot);
  return acc;
}, {});

const normalizeRetrievedLots = (lots = [], sourceRow = {}) =>
  lots
    .map((lot, lotIndex) => ({
      id: lot.id || lotIndex + 1,
      lotNo: String(lot.lotNo || lot.lot_no || "").trim(),

      // IMPORTANT: quantity should come from FGRR_DT3, not DT1
      quantity: formatNumber(lot.quantity || lot.rrQuantity || lot.rrQty || 0, decQty),
      rrQty: formatNumber(lot.rrQuantity || lot.quantity || lot.rrQty || 0, decQty),

      bbDate: lot.bbDate ? String(lot.bbDate).substring(0, 10) : "",
      qstatCode: lot.qstatCode || lot.qsCode || lot.qstat_code || "",
      whouseCode:
        lot.whouseCode ||
        lot.whCode ||
        lot.whouse_code ||
        sourceRow.whouseCode ||
        sourceRow.whCode ||
        parsed.WHCode ||
        "",
      whCode:
        lot.whCode ||
        lot.whouseCode ||
        lot.whouse_code ||
        sourceRow.whCode ||
        sourceRow.whouseCode ||
        parsed.WHCode ||
        "",
      LocCode:
        lot.LocCode ||
        lot.locCode ||
        lot.loc_code ||
        sourceRow.LocCode ||
        sourceRow.locCode ||
        parsedLocCode ||
        "",
      locCode:
        lot.locCode ||
        lot.LocCode ||
        lot.loc_code ||
        sourceRow.locCode ||
        sourceRow.LocCode ||
        parsedLocCode ||
        "",

      itemCode:
        lot.itemCode ||
        lot.item_code ||
        sourceRow.itemCode ||
        sourceRow.item_code ||
        "",
      item_code:
        lot.item_code ||
        lot.itemCode ||
        sourceRow.item_code ||
        sourceRow.itemCode ||
        "",
      rcCode:
        lot.rcCode ||
        lot.rc_code ||
        sourceRow.rcCode ||
        sourceRow.rc_code ||
        "",
      rc_code:
        lot.rc_code ||
        lot.rcCode ||
        sourceRow.rc_code ||
        sourceRow.rcCode ||
        "",
      unitCost:
        lot.unitCost ||
        lot.unit_cost ||
        sourceRow.unitCost ||
        sourceRow.unit_cost ||
        0,
      unit_cost:
        lot.unit_cost ||
        lot.unitCost ||
        sourceRow.unit_cost ||
        sourceRow.unitCost ||
        0,
      netAmount:
        lot.netAmount ||
        lot.net_amount ||
        sourceRow.netAmount ||
        sourceRow.net_amount ||
        0,
      net_amount:
        lot.net_amount ||
        lot.netAmount ||
        sourceRow.net_amount ||
        sourceRow.netAmount ||
        0,
      groupId:
        lot.groupId ||
        lot.group_id ||
        sourceRow.groupId ||
        sourceRow.group_id ||
        "",
      group_id:
        lot.group_id ||
        lot.groupId ||
        sourceRow.group_id ||
        sourceRow.groupId ||
        "",
      lnNo:
        lot.lnNo ||
        lot.ln_no ||
        lot.lineNo ||
        lot.line_no ||
        sourceRow.lnNo ||
        sourceRow.ln_no ||
        "",
      ln_no:
        lot.ln_no ||
        lot.lnNo ||
        lot.line_no ||
        sourceRow.ln_no ||
        sourceRow.lnNo ||
        "",
      controlNo: lot.controlNo || lot.control_no || "",
    }))
    .filter(
      (lot) =>
        lot.lotNo &&
        (parseFormattedNumber(lot.quantity || lot.rrQty || 0) || 0) > 0
    );

    const newMappedRows = details.map((d, idx) => {
      const poQty = parseFormattedNumber(d.poQuantity || 0);
      const prevRrQty = parseFormattedNumber(d.rrQty || 0);
      const qtyBalance = parseFormattedNumber(d.qtyBalance || poQty - prevRrQty);
      const unitCost = parseFormattedNumber(d.unitCost || 0);

      const gross = parseFormattedNumber(d.grossAmount || qtyBalance * unitCost);
      const discAmt = parseFormattedNumber(d.discAmount || 0);
      const vatAmt = parseFormattedNumber(d.vatAmount || 0);
      const net = parseFormattedNumber(d.netAmount || gross - discAmt);

      const rrStatus =
        getPOField(d, "rrStatus", "RR_STATUS", "RrStatus") ||
        d.poStatus ||
        "O";

      return {
        lnNo: idx + 1,
        lnNo: d.lnNo || d.ln || idx + 1,

        invType: d.invType || "FG",
        rrStatus,
        poStatus: d.poStatus || rrStatus,
        poId: d.poId || d.po_id || summary.poId || summary.po_id || "",
prId: d.prId || d.pr_id || "",
prNo: d.prNo || d.pr_no || "",

groupId:
  d.groupId ||
  d.group_id ||
  d.GROUP_ID ||
  d.GroupId ||
  d.GROUPID ||
  "",
categCode: d.categCode || d.CATEG_CODE || d.categ_code || "",

        poNo: d.poNo || summary.poNo || "",
        poLineno: d.lnNo || d.ln || idx + 1,

        itemCode: d.itemCode || "",
        itemName: d.itemName || "",
        itemSpecs: d.itemSpecs || "",

        uomCode: d.uomCode || "",
        uomCode2: d.uomCode2 || "",
        uomQty2: formatNumber(d.uomQty2 || 0, 6),

        poQty: formatNumber(
  parseFormattedNumber(
    d.poQty ||
    d.poQuantity ||
    d.PO_QUANTITY ||
    d.QtyOrdered ||
    0
  ),
  6
),
        rrQty: formatNumber(qtyBalance, 6),
        poBalance: formatNumber(qtyBalance, 6),
        freeQty: formatNumber(0, 6),

        currCode: d.currCode || summary.currCode || "PHP",
        unitCost: formatNumber(unitCost, 6),

        amount: formatNumber(d.itemAmount || gross, 2),
        grossAmount: formatNumber(gross, 2),
        discRate: formatNumber(d.discRate || 0, 2),
        discAmount: formatNumber(discAmt, 2),
        vatCode: d.vatCode || "",
        vatRate: d.vatCode ? formatNumber(vatRateMap?.[d.vatCode] ?? 0, 2) : "",
        vatAmount: formatNumber(vatAmt, 2),
        netAmount: formatNumber(net, 2),

        dateNeeded: d.delDate ? String(d.delDate).substring(0, 10) : "",

        lotNo: "",
        bbDate: "",
        qstatCode: "",

        whCode: poWhCode || "",
        whName: poWhName || "",
        whouseCode: poWhCode || "",
        whouseName: poWhName || "",
        LocCode: "",
        locCode: "",
        locName: "",
      };
    });

    updateState({
      poNo: selectedPoNos.join(", ") || summary.poNo || "",
      branchCode: summary.branchCode || branchCode,
      rcCode: summary.rcCode || rcCode,
      vendCode: getPOField(summary, "VendCode", "VEND_CODE", "vendCode", "vend_code"),
      vendName: getPOField(summary, "VendName", "VEND_NAME", "vendName", "vend_name"),
      currCode: summary.currCode || currCode || "PHP",
      currRate: formatNumber(summary.currRate || 1, 6),
      WHCode: poWhCode || WHCode || "",
      WHcode: poWhCode || WHcode || "",
      WHName: poWhName || WHName || "",
      detailRows: newMappedRows,
    });

    updateTotalsDisplay(newMappedRows);
  } catch (error) {
    console.error("PO Lookup Error:", error);
  } finally {
    updateState({ isLoading: false });
  }
};

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

  const handleReset = () => {
    loadDocDropDown();
    loadDocControl();
    loadCompanyData();

    const today = new Date().toISOString().split("T")[0];

    updateState({
      // ======================
      // HEADER
      // ======================
      header: { rr_date: today },

      branchCode: "HO",
      branchName: "Head Office",
      cutoffCode: "",
      poNo: "",

      drNo: "",
      siNo: "",
      siDate: null, // ✅ CLEAR SI DATE

      rcCode: "",
      rcName: "",
      reqRcCode: "",
      reqRcName: "",

      vendCode: "",
      vendName: "",

      // ======================
      // WAREHOUSE / LOCATION
      // ======================
      WHCode: "", // ✅ CLEAR HEADER WH
      WHName: "",
      LocCode: "", // ✅ CLEAR HEADER LOCATION
      LocName: "",
      selectedWH: "",

      // ======================
      // DOCUMENT INFO
      // ======================
      documentNo: "",
      documentID: "",
      documentStatus: "",
      status: "OPEN",

      dateNeeded: today,
      refPoNo1: "",
      refPrNo2: "",
      remarks: "",
      noReprints: "0",
      poCancelled: "",

      // ======================
      // UI FLAGS
      // ======================
      activeTab: "basic",
      isLoading: false,
      showSpinner: false,
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,

      // ======================
      // DETAILS
      // ======================
      detailRows: [], // DT1
      detailRowsGL: [], // ✅ CLEAR GENERAL LEDGER (DT2)

      // ======================
      // MODALS
      // ======================
      rcLookupModalOpen: false,
      rcLookupContext: "",
      msLookupModalOpen: false,
      warehouseLookupOpen: false,
      locationLookupOpen: false,
      accountModalSource: "",
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
    let row = { ...updatedRows[rowIndex] };

    // 1. Set VAT code and name values safely
    row.vatCode = vat?.vatCode || vat?.VAT_CODE || "";
    row.vatName = vat?.vatName || vat?.VAT_NAME || "";

    // 2. Extract VAT rate variant keys from modal lookup source
    const rate =
      vat?.vatRate ??
      vat?.vat_rate ??
      vat?.rate ??
      vat?.vatPerc ??
      vat?.vat_percent ??
      0;

    // 3. Set row field explicitly BEFORE recomputing rows math equations
    row.vatRate = formatNumber(rate, 2);

    // 4. Recompute transaction metrics with active rate variables loaded
    row = recalcFGRRRow(row);

    // 5. Update state instances safely
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
          documentSeries:
            docRow.docSeries ?? docRow.DOC_SERIES ?? state.documentSeries,
          documentDocLen: Number(
            docRow.docLen ?? docRow.DOC_LEN ?? state.documentDocLen,
          ),
        });
      }

      // -------------------------------------------------------
      // 2) HS OPTION (currency mode + defaults)
      // -------------------------------------------------------
      const hs = await useTopHSOption();
      if (hs) {
        const defaultCurr =
          hs.glCurrDefault ?? hs.GLCURR_DEFAULT ?? state.currCode ?? "PHP";

        updateState({
          glCurrMode: hs.glCurrMode ?? hs.GLCURR_MODE ?? state.glCurrMode,
          glCurrDefault: defaultCurr,

          withCurr2:
            String(hs.withCurr2 ?? hs.WITH_CURR2 ?? "N").toUpperCase() === "Y",
          withCurr3:
            String(hs.withCurr3 ?? hs.WITH_CURR3 ?? "N").toUpperCase() === "Y",

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
      // 4) FIELD LENGTH CHECK (FGAJ style)
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
  // FETCH (GET) – FGRR HEADER + DT1
  // ==========================

  const fetchTranData = async (rrNo, branchCode, direction = "") => {
    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(rrNo, branchCode, docType, "rrNo", direction);

      if (!data?.rrId) {
        Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
        updateState({ isLoading: false });
        return;
      }

      const parsed = data;
      const parsedDocumentNo = parsed.rrNo || "";
      const parsedDocumentId = parsed.rrId || parsed.rrHdId;

      const parsedWHCode = parsed.WHCode || parsed.whCode || parsed.warehouseCode || "";
      const parsedWHName = parsed.WHName || parsed.whName || parsed.warehouseName || "";
      const parsedLocCode = parsed.LocCode || parsed.locCode || parsed.locationCode || "";
      const parsedLocName = parsed.LocName || parsed.locName || parsed.locationName || "";

      // ===========================
      // HEADER (FGRR)
      // ===========================
      updateState({
        documentNo: parsedDocumentNo,
        documentID: parsedDocumentId,
        documentDate: parsed.rrDate || null,
        cutoffCode: parsed.cutoffCode || "",

        poNo: parsed.poNo || "",
        prNo: parsed.prNo || "",

        vendCode: parsed.vendCode || "",
        vendName: parsed.vendName || "",

        WHCode: parsedWHCode || "",
        WHcode: parsedWHCode || "",
        WHName: parsedWHName || "",
        LocCode: parsedLocCode || "",
        LocName: parsedLocName || "",

        drNo: parsed.drNo || "",
        siNo: parsed.siNo || "",
        siDate: parsed.siDate || null,

        vatCode: parsed.vatCode || "",
        rrAmount: parsed.rrAmount ?? 0,
        rrVat: parsed.rrVat ?? 0,

        refDocNo1: parsed.refrrNo1 || "",
        refDocNo2: parsed.refrrNo2 || "",

        remarks: parsed.remarks || "",
        documentStatus: parsed.rrStatus || "",
      });

      // ===========================
      // DETAIL ROWS (DT1)
      // ===========================
      const dt1 = Array.isArray(parsed.dt1) ? parsed.dt1 : [];

      const vatCodes = [...new Set(dt1.map((d) => d.vatCode).filter(Boolean))];
      const vatRatePairs = await Promise.all(
        vatCodes.map(async (code) => [code, await fetchVatRate(code)]),
      );
      const vatRateMap = Object.fromEntries(vatRatePairs);

      const parseRetrievedArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsedValue = JSON.parse(value);
      return parseRetrievedArray(parsedValue);
    } catch {
      return [];
    }
  }

  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  if (typeof value?.result === "string") return parseRetrievedArray(value.result);

  return [];
};

const dt3 = parseRetrievedArray(parsed.dt3);

console.log("✅ FETCHED FGRR DT3:", dt3);
console.table(dt3);

const normalizeLotKey = (value) => String(value || "").trim().toUpperCase();
const normalizeLotLineKey = (value) => String(value || "").trim();

const dt3ByGroup = dt3.reduce((acc, lot) => {
  const key = normalizeLotKey(lot.groupId || lot.group_id || lot.GROUP_ID || "");
  if (!key) return acc;

  if (!acc[key]) acc[key] = [];
  acc[key].push(lot);

  return acc;
}, {});

const dt3ByLine = dt3.reduce((acc, lot) => {
  const key = normalizeLotLineKey(
    lot.lnNo ||
      lot.ln_no ||
      lot.LN_NO ||
      lot.lineNo ||
      lot.line_no ||
      lot.LINE_NO ||
      ""
  );

  if (!key) return acc;

  if (!acc[key]) acc[key] = [];
  acc[key].push(lot);

  return acc;
}, {});

const dt3ByItem = dt3.reduce((acc, lot) => {
  const key = normalizeLotKey(
    lot.itemCode || lot.item_code || lot.ITEM_CODE || ""
  );

  if (!key) return acc;

  if (!acc[key]) acc[key] = [];
  acc[key].push(lot);

  return acc;
}, {});

const normalizeRetrievedLots = (lots = [], sourceRow = {}) =>
  lots
    .map((lot, lotIndex) => ({
      id: lot.id || lotIndex + 1,

      lotNo: String(lot.lotNo || lot.lot_no || "").trim(),

      quantity: formatNumber(
        lot.quantity || lot.rrQuantity || lot.rrQty || 0,
        decQty
      ),

      rrQty: formatNumber(
        lot.rrQuantity || lot.quantity || lot.rrQty || 0,
        decQty
      ),

      bbDate: lot.bbDate ? String(lot.bbDate).substring(0, 10) : "",

      qstatCode:
        lot.qstatCode ||
        lot.qsCode ||
        lot.qstat_code ||
        "",

      whouseCode:
        lot.whouseCode ||
        lot.whCode ||
        lot.whouse_code ||
        sourceRow.whouseCode ||
        sourceRow.whCode ||
        parsedWHCode ||
        "",

      whCode:
        lot.whCode ||
        lot.whouseCode ||
        lot.whouse_code ||
        sourceRow.whCode ||
        sourceRow.whouseCode ||
        parsedWHCode ||
        "",

      LocCode:
        lot.LocCode ||
        lot.locCode ||
        lot.loc_code ||
        sourceRow.LocCode ||
        sourceRow.locCode ||
        parsedLocCode ||
        "",

      locCode:
        lot.locCode ||
        lot.LocCode ||
        lot.loc_code ||
        sourceRow.locCode ||
        sourceRow.LocCode ||
        parsedLocCode ||
        "",

      itemCode:
        lot.itemCode ||
        lot.item_code ||
        sourceRow.itemCode ||
        sourceRow.item_code ||
        "",

      item_code:
        lot.item_code ||
        lot.itemCode ||
        sourceRow.item_code ||
        sourceRow.itemCode ||
        "",

      rcCode:
        lot.rcCode ||
        lot.rc_code ||
        sourceRow.rcCode ||
        sourceRow.rc_code ||
        "",

      rc_code:
        lot.rc_code ||
        lot.rcCode ||
        sourceRow.rc_code ||
        sourceRow.rcCode ||
        "",

      unitCost:
        lot.unitCost ||
        lot.unit_cost ||
        sourceRow.unitCost ||
        sourceRow.unit_cost ||
        0,

      unit_cost:
        lot.unit_cost ||
        lot.unitCost ||
        sourceRow.unit_cost ||
        sourceRow.unitCost ||
        0,

      netAmount:
        lot.netAmount ||
        lot.net_amount ||
        sourceRow.netAmount ||
        sourceRow.net_amount ||
        0,

      net_amount:
        lot.net_amount ||
        lot.netAmount ||
        sourceRow.net_amount ||
        sourceRow.netAmount ||
        0,

      groupId:
        lot.groupId ||
        lot.group_id ||
        sourceRow.groupId ||
        sourceRow.group_id ||
        "",

      group_id:
        lot.group_id ||
        lot.groupId ||
        sourceRow.group_id ||
        sourceRow.groupId ||
        "",

      lnNo:
        lot.lnNo ||
        lot.ln_no ||
        lot.lineNo ||
        lot.line_no ||
        sourceRow.lnNo ||
        sourceRow.ln_no ||
        "",

      ln_no:
        lot.ln_no ||
        lot.lnNo ||
        lot.line_no ||
        sourceRow.ln_no ||
        sourceRow.lnNo ||
        "",

      controlNo: lot.controlNo || lot.control_no || "",
    }))
    .filter(
      (lot) =>
        lot.lotNo &&
        (parseFormattedNumber(lot.quantity || lot.rrQty || 0) || 0) > 0
    );

      const mappedDT1 = dt1.map((r, idx) => {
  const rowLineNo =
    r.lnNo ||
    r.ln_no ||
    r.LN_NO ||
    r.lineNo ||
    r.LINE_NO ||
    r.line_no ||
    idx + 1;

  const rowGroupId = r.groupId || r.group_id || r.GROUP_ID || "";
  const rowItemCode = r.itemCode || r.item_code || r.ITEM_CODE || "";

  const matchedLots =
    dt3ByGroup[normalizeLotKey(rowGroupId)] ||
    dt3ByLine[normalizeLotLineKey(rowLineNo)] ||
    dt3ByItem[normalizeLotKey(rowItemCode)] ||
    [];

  const lotDetails = normalizeRetrievedLots(matchedLots, r);
  const retrievedLotNos = lotDetails.map((lot) => lot.lotNo).filter(Boolean);
  const firstLot = lotDetails[0] || {};

  return {
    lnNo: Number(rowLineNo),
    groupId: rowGroupId,
    rrStatus: r.rrStatus || r.poStatus || "",
    poStatus: r.poStatus || r.rrStatus || "",
    poNo: r.poNo || parsed.poNo || "",

    itemCode: getPOField(r, "itemCode", "itemNo", "ITEM_CODE", "ITEM_NO") || "",
    itemName:
      getPOField(
        r,
        "itemName",
        "itemDesc",
        "itemDescription",
        "description",
        "ItemName",
        "ItemDesc",
        "ItemDescription",
        "Description",
        "ITEM_NAME",
        "ITEM_DESC",
        "ITEM_DESCRIPTION",
        "DESCRIPTION",
        "fgName",
        "fgDesc",
        "FG_NAME",
        "FG_DESC"
      ) || "",

    itemSpecs: getPOField(r, "itemSpecs", "itemSpec", "ITEM_SPECS", "ITEM_SPEC") || "",

    // DT1 stays the official item-row RR quantity
    rrQty: formatNumber(r.rrQty || r.quantity || 0, decQty),
    freeQty: formatNumber(r.freeQty || r.freeQuantity || 0, decQty),

    amount: formatNumber(r.itemAmount || r.grossAmount || 0),
    itemAmount: formatNumber(r.itemAmount || r.grossAmount || 0),
    grossAmount: formatNumber(r.itemAmount || r.grossAmount || 0),
    vatCode: r.vatCode || "",
    vatRate: r.vatCode ? formatNumber(vatRateMap[r.vatCode] ?? 0, 2) : "",
    vatAmount: formatNumber(r.vatAmount ?? 0),

    qsCode: firstLot.qstatCode || r.qsCode || "",
    qstatCode: firstLot.qstatCode || r.qstatCode || r.qsCode || "",

    whCode: firstLot.whCode || r.whCode || r.whouseCode || parsedWHCode || "",
    whouseCode: firstLot.whouseCode || r.whouseCode || r.whCode || parsedWHCode || "",

    locCode: firstLot.locCode || r.locCode || parsedLocCode || "",
    LocCode: firstLot.LocCode || r.locCode || parsedLocCode || "",

    uomCode: r.uomCode || "",
    unitCost: formatNumber(r.unitCost || r.unitPrice || 0, decUcost),
    netAmount: formatNumber(r.netAmount ?? 0),

    // Display summary only, actual breakdown is in lotDetails
    lotNo: retrievedLotNos.length > 0 ? retrievedLotNos.join(", ") : "",
    bbDate: firstLot.bbDate || (r.bbDate ? String(r.bbDate).substring(0, 10) : ""),
    controlNo: firstLot.controlNo || r.controlNo || "",

    // THIS is what the modal should open
    lotDetails,
  };
});

      const dt2 = Array.isArray(parsed.dt2) ? parsed.dt2 : [];
      const normalizeGLDate = (value) => {
        if (!value) return "";
        const text = String(value);
        return text.includes("T") ? text.substring(0, 10) : text.substring(0, 10);
      };

      const mappedDT2 = dt2.map((g, i) => ({
        ...g,
        id: i + 1,
        recNo: g.recNo || g.lnNo || String(i + 1),
        acctCode: g.acctCode || g.accountCode || "",
        acctName: g.acctName || g.accountName || "",
        rcCode: g.rcCode || "",
        rcName: g.rcName || "",
        sltypeCode: g.sltypeCode || g.slTypeCode || "",
        slCode: g.slCode || "",
        slName: g.slName || "",
        particular: g.particular || g.particulars || "",
        vatCode: g.vatCode || "",
        vatName: g.vatName || "",
        atcCode: g.atcCode || "",
        atcName: g.atcName || "",
        debit: formatNumber(g.debit || 0),
        credit: formatNumber(g.credit || 0),
        debitFx1: formatNumber(g.debitFx1 || 0),
        creditFx1: formatNumber(g.creditFx1 || 0),
        debitFx2: formatNumber(g.debitFx2 || 0),
        creditFx2: formatNumber(g.creditFx2 || 0),
        slRefNo: g.slRefNo || "",
        slRefDate: normalizeGLDate(g.slRefDate || ""),
        remarks: g.remarks || "",
        dt1Lineno: g.dt1Lineno || "",
      }));

      updateState({
        detailRows: mappedDT1,
        detailRowsGL: mappedDT2,
        dt3,
      });
    } catch (e) {
      console.error("fetchTranData error:", e);
      Swal.fire({ icon: 'error', title: 'Fetch Error', text: e.message });
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCloseFGLookup = async (selectedItem) => {
    if (!selectedItem) {
      updateState({ msLookupModalOpen: false, selectedRowIndex: null });
      return;
    }

    const today = header.rr_date || new Date().toISOString().split("T")[0];
    const firstValue = (...values) =>
      values.find((value) => value !== undefined && value !== null && value !== "");
    const selectedUnitCost = firstValue(
      selectedItem.unitCost,
      selectedItem.UnitCost,
      selectedItem.UNIT_COST,
      selectedItem.unit_cost,
      selectedItem.unitcost,
      selectedItem.Unitcost,
      selectedItem.UNITCOST,
      selectedItem.uCost,
      selectedItem.UCost,
      selectedItem.UCOST,
      selectedItem.ucost,
      selectedItem.unitPrice,
      selectedItem.UnitPrice,
      selectedItem.UNIT_PRICE,
      selectedItem.unit_price,
      selectedItem.price,
      selectedItem.Price,
      selectedItem.PRICE,
      selectedItem.stdCost,
      selectedItem.StdCost,
      selectedItem.STD_COST,
      selectedItem.aveCost,
      selectedItem.AveCost,
      selectedItem.AVE_COST,
      selectedItem.avgCost,
      selectedItem.AvgCost,
      selectedItem.AVG_COST,
      selectedItem.lastCost,
      selectedItem.LastCost,
      selectedItem.LAST_COST,
      selectedItem.itemCost,
      selectedItem.ItemCost,
      selectedItem.ITEM_COST,
      selectedItem.cost,
      selectedItem.Cost,
      selectedItem.COST,
      0,
    );
    const selectedVatCode =
      selectedItem.vatCode ??
      selectedItem.VatCode ??
      selectedItem.VAT_CODE ??
      selectedItem.vat_code ??
      "";
    const selectedVatName =
      selectedItem.vatName ??
      selectedItem.VatName ??
      selectedItem.VAT_NAME ??
      selectedItem.vat_name ??
      "";
    const selectedVatLookupRate =
      selectedItem.vatRate ??
      selectedItem.VatRate ??
      selectedItem.VAT_RATE ??
      selectedItem.vat_rate ??
      selectedItem.rate ??
      selectedItem.vatPerc ??
      selectedItem.vat_percent ??
      "";
    const selectedVatFetchedRate = selectedVatCode
      ? await fetchVatRate(selectedVatCode)
      : "";
    const selectedVatRate =
      selectedVatLookupRate !== "" &&
      selectedVatLookupRate !== null &&
      selectedVatLookupRate !== undefined &&
      parseFormattedNumber(selectedVatLookupRate) !== 0
        ? selectedVatLookupRate
        : selectedVatFetchedRate;

    if (selectedRowIndex !== null && selectedRowIndex !== undefined) {
      const updatedRows = [...detailRows];
      const currentRow = updatedRows[selectedRowIndex] || {};

      updatedRows[selectedRowIndex] = recalcFGRRRow({
        ...currentRow,
        groupId: selectedItem.categCode || currentRow.groupId || "",
        categCode: selectedItem.categCode || currentRow.categCode || "",
        itemCode: selectedItem.itemCode || "",
        itemName: selectedItem.itemName || "",
        uomCode: selectedItem.uomCode || selectedItem.uom || "",
        qtyOnHand: formatNumber(selectedItem.qtyHand ?? 0, 6),
        dateNeeded: currentRow.dateNeeded || today,
        unitCost: formatNumber(parseFormattedNumber(selectedUnitCost), decUcost),
        vatCode: selectedVatCode || currentRow.vatCode || "",
        vatName: selectedVatName || currentRow.vatName || "",
        vatRate:
          selectedVatRate !== "" && selectedVatRate !== null && selectedVatRate !== undefined
            ? formatNumber(parseFormattedNumber(selectedVatRate), 2)
            : currentRow.vatRate || "",
      });

      updateState({
        detailRows: updatedRows,
        msLookupModalOpen: false,
        selectedRowIndex: null,
      });
      updateTotalsDisplay(updatedRows);
      return;
    }

    const newRow = {
      invType: "FG",
      unitCost: formatNumber(parseFormattedNumber(selectedUnitCost), decUcost),
      vatCode: selectedVatCode,
      vatName: selectedVatName,
      vatRate:
        selectedVatRate !== "" && selectedVatRate !== null && selectedVatRate !== undefined
          ? formatNumber(parseFormattedNumber(selectedVatRate), 2)
          : "",
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

    const updatedRows = [...detailRows, recalcFGRRRow(newRow)];
    updateState({
      detailRows: updatedRows,
      msLookupModalOpen: false,
    });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0,
    );
    updateTotalsDisplay(updatedRows);
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

    const res = await fetchData(
      `/getVat?VAT_CODE=${encodeURIComponent(vatCode)}`,
    );

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
//     if (!rcCode) {
//       Swal.fire({
//         icon: "warning",
//         title: "Required Header Fields",
//         text: "Please select both Responsibility Center and Requesting Dept before adding PR lines.",
//         timer: 2500,
//         showConfirmButton: false,
//       });
//       return;
//     }

//     if (isFormDisabled) return;

    // Toggle dropdown
    setShowTypeDropdown((prev) => !prev);
  };

  // When user picks FG / FG / RM
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
      0,
    );
    updateTotalsDisplay(updatedRows);

    setShowTypeDropdown(false);
  };

  const handleOpenFGLookup = () => {
    if (isFormDisabled) return;
    setShowTypeDropdown(false);
    updateState({ msLookupModalOpen: true, selectedRowIndex: null });
  };

  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0,
    );
    updateTotalsDisplay(totalQty);
  };

  const handleCloseWarehouseLookup = (row) => {
    if (row) {
      const pickedWhCode =
        row.whCode ?? row.WHCode ?? row.WH_CODE ?? row.whouseCode ?? "";
      const pickedWhName =
        row.whName ?? row.WHName ?? row.WH_NAME ?? row.whouseName ?? "";
      if (accountModalSource === "lotWhouseCode") {
        setLotEntryRows((prev) =>
          prev.map((lot, lotIndex) =>
            lotIndex === selectedRowIndex
              ? {
                  ...lot,
                  whouseCode: pickedWhCode,
                  whCode: pickedWhCode,
                  whouseName: pickedWhName,
                  whName: pickedWhName,
                  LocCode: "",
                  locCode: "",
                  LocName: "",
                  locName: "",
                }
              : lot,
          ),
        );
        updateState({
          warehouseLookupOpen: false,
          accountModalSource: "",
          selectedRowIndex: null,
        });
        return;
      }

      accountModalSource
        ? handleDetailChange(selectedRowIndex, "whouseCode", pickedWhCode, {
            whouseName: pickedWhName,
            LocCode: "",
            locName: "",
          })
        : updateState({
            WHCode: pickedWhCode,
            WHName: pickedWhName,
            LocCode: "",
            LocName: "",
          });

      const hasDetails = detailRows && detailRows.length > 0;
      if (!accountModalSource && hasDetails) {
        Swal.fire({
          title: "Apply to Details?",
          text: "Do you want to apply this Warehouse to all detail items?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes, update all",
          cancelButtonText: "No, header only",
        }).then((result) => {
          if (result.isConfirmed) {
            const updatedDetails = detailRows.map((item) => ({
              ...item,
              whouseCode: pickedWhCode,
              whouseName: pickedWhName,
              LocCode: "",
              locName: "",
            }));
            updateState({ detailRows: updatedDetails });
          }
        });
      }
    }

    updateState({ warehouseLookupOpen: false, accountModalSource: "" });
  };

  const handleCloseLocationLookup = (row) => {
    if (row) {
      const pickedLocCode = row.locCode ?? row.LocCode ?? row.LOC_CODE ?? "";
      const pickedLocName = row.locName ?? row.LocName ?? row.LOC_NAME ?? "";
      if (accountModalSource === "lotLocCode") {
        setLotEntryRows((prev) =>
          prev.map((lot, lotIndex) =>
            lotIndex === selectedRowIndex
              ? {
                  ...lot,
                  LocCode: pickedLocCode,
                  locCode: pickedLocCode,
                  LocName: pickedLocName,
                  locName: pickedLocName,
                }
              : lot,
          ),
        );
        updateState({
          locationLookupOpen: false,
          selectedWH: "",
          accountModalSource: "",
          selectedRowIndex: null,
        });
        return;
      }

      // If Location lookup is opened from DETAIL row (accountModalSource = "LocCode")
      if (accountModalSource) {
        const updated = [...(detailRows || [])];
        const idx = selectedRowIndex;

        if (idx !== null && idx !== undefined && idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            LocCode: pickedLocCode,
            locName: pickedLocName, // optional display name if you want it
          };
          updateState({ detailRows: updated });
        }
      } else {
        // Header location
        updateState({
          LocCode: pickedLocCode,
          LocName: pickedLocName,
        });

        // Apply to all details prompt
        const hasDetails = detailRows && detailRows.length > 0;
        if (hasDetails) {
          Swal.fire({
            title: "Apply to Details?",
            text: "Do you want to apply this Location to all detail items?",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Yes, update all",
            cancelButtonText: "No, header only",
          }).then((result) => {
            if (result.isConfirmed) {
              const updatedDetails = detailRows.map((item) => ({
                ...item,
                LocCode: pickedLocCode,
                locName: pickedLocName,
              }));
              updateState({ detailRows: updatedDetails });
            }
          });
        }
      }
    }

    updateState({
      locationLookupOpen: false,
      selectedWH: "",
      accountModalSource: "",
    });
  };

  const handleCloseQStatLookup = (picked) => {
    if (picked && selectedRowIndex !== null && selectedRowIndex !== undefined) {
      const code = picked?.qstatCode ?? picked?.QSTAT_CODE ?? "";
      const name = picked?.qstatName ?? picked?.QSTAT_NAME ?? "";
      if (accountModalSource === "lotQstatCode") {
        setLotEntryRows((prev) =>
          prev.map((lot, lotIndex) =>
            lotIndex === selectedRowIndex
              ? {
                  ...lot,
                  qstatCode: code,
                  qsCode: code,
                  qstatName: name,
                }
              : lot,
          ),
        );
        updateState({
          showQstatModal: false,
          accountModalSource: "",
          selectedRowIndex: null,
        });
        return;
      }

      handleDetailChange(selectedRowIndex, "qstatCode", code, {
        qstatName: name,
      });
    }

    updateState({ showQstatModal: false, accountModalSource: "" });
  };

  const getLotBreakdownQty = (rows = lotEntryRows) =>
    rows.reduce(
      (sum, lot) => sum + (parseFormattedNumber(lot?.quantity || 0) || 0),
      0,
    );

  const makeLotBreakdownRow = (row = {}, quantity = "") => ({
    id: Date.now() + Math.random(),
    lotNo: "",
    quantity,
    bbDate: row.bbDate || "",
    qstatCode: row.qstatCode || row.qsCode || "",
    whouseCode: row.whouseCode || row.whCode || WHCode || "",
    LocCode: row.LocCode || row.locCode || LocCode || "",
  });

  const handleOpenLotBreakdownModal = (index) => {
    if (isFormDisabled) return;

    const row = detailRows?.[index];
    const rrQty = parseFormattedNumber(row?.rrQty || 0) || 0;

    if (!row?.itemCode) {
      Swal.fire({
        icon: "warning",
        title: "Lot No Breakdown",
        text: "Please select an item before entering multiple lot numbers.",
      });
      return;
    }

    if (rrQty <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Lot No Breakdown",
        text: "RR Quantity must be greater than zero before entering multiple lot numbers.",
      });
      return;
    }

    const existingLots = Array.isArray(row?.lotDetails) ? row.lotDetails : [];
    const seededLots =
      existingLots.length > 0
        ? existingLots
        : [
            {
              lotNo: row?.lotNo || "",
              quantity: row?.rrQty || "",
              bbDate: row?.bbDate || "",
              qstatCode: row?.qstatCode || row?.qsCode || "",
              whouseCode: row?.whouseCode || row?.whCode || WHCode || "",
              LocCode: row?.LocCode || row?.locCode || LocCode || "",
            },
          ];

    setLotEntryRows(
      seededLots.map((lot, lotIndex) => ({
        id: lot.id || lotIndex + 1,
        lotNo: lot.lotNo || "",
        quantity: lot.quantity || lot.rrQty || "",
        bbDate: lot.bbDate || "",
        qstatCode: lot.qstatCode || lot.qsCode || "",
        whouseCode: lot.whouseCode || lot.whCode || WHCode || "",
        LocCode: lot.LocCode || lot.locCode || LocCode || "",
      })),
    );
    setLotPickingRowIndex(index);
    setShowLotPickingModal(true);
  };

  const handleCloseLotPickingModal = () => {
    setShowLotPickingModal(false);
    setLotPickingRowIndex(null);
    setLotEntryRows([]);
  };

  const handleLotEntryChange = (index, field, value) => {
    setLotEntryRows((prev) =>
      prev.map((lot, lotIndex) =>
        lotIndex === index ? { ...lot, [field]: value } : lot,
      ),
    );
  };

  const handleAddLotEntryRow = (index = null) => {
    const row = selectedLotPickingRow || {};
    setLotEntryRows((prev) => {
      const rrQty = parseFormattedNumber(row?.rrQty || 0) || 0;
      const assignedQty = getLotBreakdownQty(prev);
      const remainingQty = Math.max(rrQty - assignedQty, 0);
      const nextRow = makeLotBreakdownRow(
        row,
        remainingQty > 0 ? formatNumber(remainingQty, decQty) : "",
      );
      const nextRows = [...prev];

      if (index !== null && index !== undefined) {
        nextRows.splice(index + 1, 0, nextRow);
      } else {
        nextRows.push(nextRow);
      }

      return nextRows;
    });
  };

  const handleDeleteLotEntryRow = (index) => {
    setLotEntryRows((prev) => prev.filter((_, lotIndex) => lotIndex !== index));
  };

  const handleConfirmLotPicking = () => {
    if (lotPickingRowIndex === null || lotPickingRowIndex === undefined) return;

    const updatedRows = [...(detailRows || [])];
    const currentRow = updatedRows[lotPickingRowIndex];
    if (!currentRow) return;

    const validLots = lotEntryRows
      .map((lot, index) => ({
        ...lot,
        id: index + 1,
        quantity: parseFormattedNumber(lot.quantity || 0) || 0,
      }))
      .filter((lot) => lot.lotNo || lot.quantity > 0);
    const totalLotQty = validLots.reduce((sum, lot) => sum + lot.quantity, 0);
    const rrQty = parseFormattedNumber(currentRow.rrQty || 0) || 0;

    if (validLots.some((lot) => !lot.lotNo || lot.quantity <= 0)) {
      Swal.fire({
        icon: "warning",
        title: "Lot No Breakdown",
        text: "Each lot row must have a Lot No and quantity greater than zero.",
      });
      return;
    }

    if (Number(totalLotQty.toFixed(decQty)) !== Number(rrQty.toFixed(decQty))) {
      Swal.fire({
        icon: "warning",
        title: "Lot No Breakdown",
        html: `Total lot quantity <b>${formatNumber(totalLotQty, decQty)}</b> must match RR Quantity <b>${formatNumber(rrQty, decQty)}</b>.`,
      });
      return;
    }

    const lotNos = validLots.map((lot) => lot.lotNo).filter(Boolean);
    const firstLot = validLots[0] || {};
    const normalizedLots = validLots.map((lot) => ({
      ...lot,
      quantity: formatNumber(lot.quantity, decQty),
      rrQty: formatNumber(lot.quantity, decQty),
    }));

    updatedRows[lotPickingRowIndex] = recalcFGRRRow(
      {
        ...currentRow,
        rrQty: formatNumber(totalLotQty, decQty),
        lotNo: lotNos.join(", "),
        bbDate: firstLot.bbDate || currentRow.bbDate || "",
        qstatCode: firstLot.qstatCode || currentRow.qstatCode || "",
        qsCode: firstLot.qstatCode || currentRow.qsCode || "",
        whouseCode:
          firstLot.whouseCode ||
          currentRow.whouseCode ||
          currentRow.whCode ||
          "",
        whCode:
          firstLot.whouseCode ||
          currentRow.whCode ||
          currentRow.whouseCode ||
          "",
        LocCode: firstLot.LocCode || currentRow.LocCode || "",
        locCode: firstLot.LocCode || currentRow.locCode || "",
        lotDetails: normalizedLots,
      },
    );

    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
    handleCloseLotPickingModal();
  };

  const recalcFGRRRow = (row) => {
    const rrQty = parseFormattedNumber(row.rrQty || 0);
    const freeQty = parseFormattedNumber(row.freeQty || 0);
    const unitCost = parseFormattedNumber(row.unitCost || 0);
    const vatRate = parseFormattedNumber(row.vatRate || 0);

    // ✅ ONLY chargeable quantity
    const chargeableQty = Math.max(rrQty - freeQty, 0);

    const gross = chargeableQty * unitCost;

    // VAT-inclusive example (adjust if exclusive in your setup)
    const vatAmt = vatRate ? gross - gross / (1 + vatRate / 100) : 0;

    const netAmt = gross - vatAmt;

    return {
      ...row,
      grossAmount: formatNumber(gross, 2),
      itemAmount: formatNumber(gross, 2),
      vatAmount: formatNumber(vatAmt, 2),
      netAmount: formatNumber(netAmt, 2),
      amount: formatNumber(gross, 2), // your Amount column
    };
  };

  const handleDetailChange = async (index, field, value, extraData = {}) => {
    const rows = Array.isArray(detailRows) ? detailRows : [];
    const updatedRows = [...rows];

    // ✅ guard: invalid index or row not found
    if (
      index === null ||
      index === undefined ||
      index < 0 ||
      !updatedRows[index]
    )
      return;

    // clone row (so we never mutate state directly)
    let row = { ...updatedRows[index] };

    // ✅ helper: replicate header row (index 0) to blank rows only
    const autoFillBlanks = async (fieldName, newValue, extra = {}) => {
      // replicate ONLY when editing first row
      if (index !== 0) return;

      const hasBlanks = updatedRows.some(
        (r, i) =>
          i !== 0 && (!r?.[fieldName] || String(r[fieldName]).trim() === ""),
      );

      if (!hasBlanks) return;

      const fieldLabels = {
        acctCode: "Account Code",
        rcCode: "RC Code",
        slCode: "SL Code",
        whouseCode: "Warehouse",
        LocCode: "Location",
        qstatCode: "Quality Status",
      };

      const result = await Swal.fire({
        title: "Replicate Data?",
        text: `Do you want to copy this ${fieldLabels[fieldName] || fieldName} to all blank rows?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, copy it!",
        cancelButtonText: "No",
      });

      if (!result.isConfirmed) return;

      updatedRows.forEach((r, i) => {
        if (i === 0) return;

        const cur = updatedRows[i] || {};
        const isBlank = !cur[fieldName] || String(cur[fieldName]).trim() === "";

        if (isBlank) {
          updatedRows[i] = {
            ...cur,
            [fieldName]: newValue,
            ...extra,
          };
        }
      });

      updateState({ detailRows: [...updatedRows] });
    };

    // ✅ normalize lookup objects (just in case someone passes the whole row object)
    let normalizedValue = value;

    if (value && typeof value === "object") {
      // common lookup patterns
      if (field === "qstatCode")
        normalizedValue = value.qstatCode ?? value.QSTAT_CODE ?? "";
      if (field === "LocCode")
        normalizedValue =
          value.locCode ?? value.LocCode ?? value.LOC_CODE ?? "";
      if (field === "whouseCode")
        normalizedValue =
          value.whCode ??
          value.WHCode ??
          value.WH_CODE ??
          value.whouseCode ??
          "";
      if (field === "acctCode")
        normalizedValue = value.acctCode ?? value.ACCT_CODE ?? "";
      if (field === "rcCode")
        normalizedValue = value.rcCode ?? value.RC_CODE ?? "";
      if (field === "slCode")
        normalizedValue = value.slCode ?? value.SL_CODE ?? "";
    }

    // ✅ numeric fields sanitize
    const numericFieldDecimals = {
      rrQty: decQty,
      freeQty: decQty,
      unitCost: decUcost,
      vatRate: 2,
    };
    const shouldFormatNumeric = extraData === true;

    if (Object.prototype.hasOwnProperty.call(numericFieldDecimals, field)) {
      const numericValue = parseFormattedNumber(normalizedValue ?? 0);
      row[field] = shouldFormatNumeric
        ? formatNumber(numericValue, numericFieldDecimals[field])
        : String(normalizedValue ?? "").replace(/[^0-9.]/g, "");
    } else {
      row[field] = normalizedValue ?? "";
    }

    if (field === "rrQty" || field === "lotNo") {
      row.lotDetails = [];
    }

    // ✅ apply any extra lookup fields (names, etc.)
    if (extraData && typeof extraData === "object") {
      row = { ...row, ...extraData };
    }

    // ✅ recompute amounts only when needed
    if (["rrQty", "freeQty", "unitCost", "vatRate"].includes(field)) {
      row = recalcFGRRRow(row);
    }

    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });

    // ✅ replicate only for header-like fields (codes)
    if (
      [
        "acctCode",
        "rcCode",
        "slCode",
        "whouseCode",
        "LocCode",
        "qstatCode",
      ].includes(field)
    ) {
      await autoFillBlanks(field, row[field], extraData);
    }

    updateTotalsDisplay(updatedRows);
  };

  const totalDebitGL = (state.detailRowsGL || []).reduce(
    (sum, r) => sum + parseFormattedNumber(r?.debit || 0),
    0,
  );

  const totalCreditGL = (state.detailRowsGL || []).reduce(
    (sum, r) => sum + parseFormattedNumber(r?.credit || 0),
    0,
  );

  const handleDocNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };
  // ==========================
  // SAVE / UPSERT (FGRR + DT1 + DT2)
  // ==========================
  const handleActivityOption = async (action) => {
    // If already posted/cancelled/finalized, do not allow save / generate
    if (documentStatus !== "") return;

    updateState({ isLoading: true });

    try {
      const isNew = !state.documentID;

      // Optional front-end guard: prevent save when GL is unbalanced
    if (isGeneralLedgerEnabled && action === "Upsert") {
        const totalDebit = (state.detailRowsGL || []).reduce(
          (sum, r) => sum + parseFormattedNumber(r?.debit || 0),
          0,
        );
        const totalCredit = (state.detailRowsGL || []).reduce(
          (sum, r) => sum + parseFormattedNumber(r?.credit || 0),
          0,
        );

        if (Number((totalDebit - totalCredit).toFixed(2)) !== 0) {
          Swal.fire({
            icon: "warning",
            title: "Unbalanced Debit/Credit",
            html: `Debit: <b>${formatNumber(totalDebit)}</b><br/>Credit: <b>${formatNumber(
              totalCredit,
            )}</b><br/><br/>Please balance GL before saving.`,
          });
          return;
        }
      }

      const dt1Payload = [];
      (state.detailRows || []).forEach((r) => {
        const lotDetails = Array.isArray(r.lotDetails) ? r.lotDetails : [];
        const sourceLots =
          lotDetails.length > 0
            ? lotDetails
            : [
                {
                  lotNo: r.lotNo || "",
                  quantity: r.rrQty || 0,
                  bbDate: r.bbDate || null,
                  qstatCode: r.qstatCode || r.qsCode || "",
                  whouseCode:
                    r.whouseCode ||
                    r.whCode ||
                    state.WHCode ||
                    state.WHcode ||
                    "",
                  LocCode: r.LocCode || r.locCode || state.LocCode || "",
                },
              ];

        sourceLots.forEach((lot) => {
          const lotQty = parseFormattedNumber(lot.quantity || lot.rrQty || 0);
          const rowQty = parseFormattedNumber(r.rrQty || 0) || 0;
          const lotRatio = rowQty > 0 ? lotQty / rowQty : 1;
          dt1Payload.push({
  lnNo: String(dt1Payload.length + 1),

  poId: r.poId || r.po_id || r.PO_ID || "",
  prId: r.prId || r.pr_id || r.PR_ID || "",
  prNo: r.prNo || r.pr_no || r.PR_NO || "",

  groupId:
    r.groupId ||
    r.group_id ||
    r.GROUP_ID ||
    r.GroupId ||
    "",

  invType: r.invType || "FG",
  itemCode: r.itemCode || "",
  itemName: r.itemName || "",
  uomCode: r.uomCode || "",

  quantity: parseFormattedNumber(r.rrQty || r.quantity || 0),
  rrQuantity: parseFormattedNumber(r.rrQty || r.quantity || 0),

  poNo: r.poNo || state.poNo || "",
  poLineno: r.poLineno || r.poLineNo || r.lnNo || r.Ln || "",
  poQty: parseFormattedNumber(r.poQty || r.poQuantity || r.PO_QUANTITY || 0),
  poBalance: parseFormattedNumber(r.poBalance || r.qtyBalance || 0),

  unitCost: parseFormattedNumber(r.unitCost || 0),
  itemAmount: parseFormattedNumber(r.itemAmount || r.grossAmount || 0),
  vatCode: r.vatCode || "",
  vatAmount: parseFormattedNumber(r.vatAmount || 0),
  netAmount: parseFormattedNumber(r.netAmount || 0),

  whouseCode:
    r.whouseCode ||
    r.whCode ||
    state.WHCode ||
    state.WHcode ||
    "",

  locCode: r.locCode || r.LocCode || state.LocCode || "",

  lotNo: r.lotNo || "",
  bbDate: r.bbDate || null,
  qstatCode: r.qstatCode || r.qsCode || "",
  rcCode: r.rcCode || state.rcCode || "",
  itemSpecs: r.itemSpecs || "",
  categCode: r.categCode || "",
});
        });
      });

      // Build payload (match your sproc params)
      const glData = {
        branchCode: state.branchCode,

        // NEW vs EDIT
        rrNo: documentNo || "",
        rrId: documentID || "",
rrHdId: documentID || "",

        rrDate:
          header?.rr_date ||
          state.RRDate ||
          new Date().toISOString().split("T")[0],

        poNo: state.poNo || "",
        vendCode: state.vendCode || "",
        vendName: state.vendName || "",

        drNo: state.drNo || state.drno || "",
        siNo: state.siNo || "",
        siDate: null,

        currCode: state.currCode || "PHP",
        currRate: Number(state.currRate || 1),

        whouseCode: state.WHCode || state.WHcode || "",
        whCode: state.WHCode || state.WHcode || "",
        WHCode: state.WHCode || state.WHcode || "",
        LocCode: state.LocCode || "",
        locCode: state.LocCode || "",
        locationCode: state.LocCode || "",
        LocName: state.LocName || "",
        locName: state.LocName || "",

        remarks: state.remarks || "",
        userCode: state.userCode || "",

        // DT1
        dt1: dt1Payload,

        // DT2 (GL)
        dt2: isGeneralLedgerEnabled ? (state.detailRowsGL || []).map((r, i) => ({
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
          slRefDate: r.slRefDate || null,
          remarks: r.remarks || "",
          dt1Lineno: r.dt1Lineno || "",
        })) : [],
      };

      // ================
      // GENERATE GL
      // ================
    if (action === "GenerateGL") {
      if (!isGeneralLedgerEnabled) return;
        const newGlEntries = await useGenerateGLEntries(docType, glData);
        if (newGlEntries) updateState({ detailRowsGL: newGlEntries });
        return;
      }

      console.log("FGRR upsert response:", docType, glData, updateState);
      // ================
      // UPSERT / SAVE
      // ================
      if (action === "Upsert") {
        const res = await useTransactionUpsert(
          docType,
          glData,
          updateState,
          "rrHdId",
          "rrNo",
        );

        console.log("FGRR upsert response:", res);
        // normalize row (supports: array, axios response, unwrapped response)
        const normalizeSaveRow = (value) => {
          if (!value) return null;
          if (Array.isArray(value)) return normalizeSaveRow(value[0]);
          if (typeof value === "string") {
            try {
              const parsedValue = JSON.parse(value);
              return normalizeSaveRow(parsedValue);
            } catch {
              return null;
            }
          }
          if (Array.isArray(value?.data)) return normalizeSaveRow(value.data[0]);
          if (value?.data) return normalizeSaveRow(value.data);

          const resultValue =
            value.result ?? value.RESULT ?? value.JsonResult ?? value.jsonResult;
          if (resultValue) return normalizeSaveRow(resultValue);
          value.msrrNo = getReturnedValue(
            value,
            "msrrNo",
            "FGRR_NO",
            "FGRRNo",
            "msRRNo",
            "rrNo",
            "RR_NO",
            "rr_no",
            "RrNo",
            "documentNo",
            "DocumentNo",
            "DOCUMENT_NO",
            "docNo",
            "DocNo",
            "DOC_NO",
            "tranNo",
            "TranNo",
            "TRAN_NO",
          );
          value.msrrHdId = getReturnedValue(
            value,
            "rrHdId",
            "rrId",
            "rr_id",
            "rr_hd_id",
            "RR_ID",
            "RR_HD_ID",
            "msrrId",
            "msrrHdId",
            "FGRR_ID",
            "FGRR_HD_ID",
            "documentID",
            "DocumentID",
            "DOCUMENT_ID",
            "docId",
            "DOC_ID",
          );
          return value;
        };

        const getReturnedValue = (row, ...keys) => {
          if (!row || typeof row !== "object") return "";

          for (const key of keys) {
            const value = row?.[key];
            if (value !== undefined && value !== null && value !== "") {
              return value;
            }
          }

          const normalizeKey = (key) =>
            String(key || "")
              .replace(/[_\s-]/g, "")
              .toLowerCase();
          const normalizedEntries = Object.entries(row).reduce(
            (acc, [key, value]) => {
              acc[normalizeKey(key)] = value;
              return acc;
            },
            {},
          );

          for (const key of keys) {
            const value = normalizedEntries[normalizeKey(key)];
            if (value !== undefined && value !== null && value !== "") {
              return value;
            }
          }

          return "";
        };

        const row = normalizeSaveRow(
          (Array.isArray(res) ? res?.[0] : null) ??
          (Array.isArray(res?.data) ? res.data?.[0] : res?.data ?? null) ??
          (Array.isArray(res?.data?.data) ? res.data.data?.[0] : res?.data?.data ?? null) ??
          null
        );

        // handle SP validation pattern
        if (row?.errorCount && Number(row.errorCount) > 0) {
          Swal.fire({
            icon: "warning",
            title: "Validation",
            html: String(
              row.errorMsg || "Please complete required fields.",
            ).replace(/\r?\n/g, "<br/>"),
          });
          return;
        }

        // accept common key variants returned by FGRR upsert
        const savedId =
          row?.rrHdId ||
          row?.rrId ||
          row?.rr_id ||
          row?.msrrId ||
          row?.msrrHdId ||
          row?.FGRR_ID ||
          row?.FGRR_HD_ID ||
          row?.RR_HD_ID ||
          documentID ||
          "";
        const savedNo =
          row?.msrrNo ||
          row?.FGRR_NO ||
          row?.rrNo ||
          row?.RR_NO ||
          row?.rr_no ||
          row?.documentNo ||
          row?.docNo ||
          documentNo ||
          "";

        // reflect auto-generated RR No / RR ID in UI
        updateState({
          documentID: savedId,
          documentNo: savedNo,
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });

        // success + print
        useSwalshowSaveSuccessDialog(
  () => {
    handleReset();
    setTopTab("history");
  },
  () => handleSaveAndPrint(savedId)
);
      }
    } catch (err) {
      console.error("FGRR action error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "Something went wrong during the transaction.",
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleAddGLRow = (index = null) => {
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

    if (index !== null && index !== undefined) {
      rows.splice(index + 1, 0, next);
    } else {
      rows.push(next);
    }

    updateState({
      detailRowsGL: rows.map((row, rowIndex) => ({
        ...row,
        id: rowIndex + 1,
      })),
    });
  };

  const handleDeleteGLRow = (index) => {
    if (isFormDisabled) return;
    const rows = [...(state.detailRowsGL || [])];
    rows.splice(index, 1);

    // re-id like FGAJ
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

    // ✅ Ask backend to fill acctName/slName/rcName/vatName/atcName etc (same as FGAJ)
    const lookedUp = await useUpdateRowGLEntries(
      currentRow,
      field,
      selected,
      state.vendCode || "",
      docType,
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

    // ✅ recompute Fx fields like FGAJ (editEntries API)
    const edited = await useUpdateRowEditEntries(
      rows[index],
      field,
      value,
      state.currCode || "PHP",
      parseFormattedNumber(state.currRate || 1),
      header?.rr_date || state.rrDate || null,
    );

    if (edited) {
      rows[index] = {
        ...rows[index],
        debit: edited.debit ? formatNumber(edited.debit) : rows[index].debit,
        credit: edited.credit
          ? formatNumber(edited.credit)
          : rows[index].credit,
        debitFx1: edited.debitFx1
          ? formatNumber(edited.debitFx1)
          : rows[index].debitFx1,
        creditFx1: edited.creditFx1
          ? formatNumber(edited.creditFx1)
          : rows[index].creditFx1,
        debitFx2: edited.debitFx2
          ? formatNumber(edited.debitFx2)
          : rows[index].debitFx2,
        creditFx2: edited.creditFx2
          ? formatNumber(edited.creditFx2)
          : rows[index].creditFx2,
      };
      updateState({ detailRowsGL: rows });
    }
  };

  const handleGLFieldChange = (index, field, value) => {
    const rows = [...(state.detailRowsGL || [])];
    rows[index] = { ...rows[index], [field]: value };
    updateState({ detailRowsGL: rows });
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

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, data.branchCode || branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };

  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, documentNo: data.docNo });
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
        confirmation.password, // ✅ password
        confirmation.reason, // ✅ reason
        updateState,
      );

      if (result?.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Cancelled successfully.",
        });
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
        () => updateState({ showPostModal: false }),
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
      //  - RC changes
      //  - Requesting Dept follows by default
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
      //  - Only Requesting Dept changes
      //  - Responsibility Center stays as-is
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

  const selectedLotPickingRow =
    lotPickingRowIndex !== null && lotPickingRowIndex !== undefined
      ? detailRows?.[lotPickingRowIndex]
      : null;
  const lotBreakdownAssignedQty = getLotBreakdownQty();
  const lotBreakdownTargetQty =
    parseFormattedNumber(selectedLotPickingRow?.rrQty || 0) || 0;
  const lotBreakdownRemainingQty = Math.max(
    lotBreakdownTargetQty - lotBreakdownAssignedQty,
    0,
  );

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
          onGenerateGL={
            isGeneralLedgerEnabled
              ? () => handleActivityOption("GenerateGL")
              : undefined
          }
          onPost={handlePost}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/FGRR"
          isSaveDisabled={isSaveDisabled}
          isResetDisabled={isResetDisabled}
          isViewDocument={isViewDocument}
          isCancelDisabled={
            !documentID ||
            displayStatus === "CANCELLED" ||
            displayStatus === "FINALIZED"
          }
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
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled && updateState({ branchModalOpen: true })
                  }
                />

                {/* PR No */}
                <FieldRenderer
                  id="msrrNo"
                  label="FGRR No."
                  type="lookup"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled}
                  onChange={(val) => updateState({ documentNo: val })}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleDocNoBlur();
                      e.preventDefault();
                      document.getElementById("RRDate")?.focus();
                    }
                  }}
                />

                {/* PR Date */}
                <FieldRenderer
                  id="RRDate"
                  label="FGRR Date"
                  type="date"
                  value={header.rr_date}
                  onChange={(val) =>
                    setHeader((prev) => ({
                      ...prev,
                      rr_date: val,
                    }))
                  }
                  disabled={isFormDisabled}
                />

                <FieldRenderer
                  id="drNo"
                  label="Reference No."
                  required
                  type="text"
                  value={drNo || ""}
                  onChange={(val) => updateState({ drNo: val })}
                  disabled={isFormDisabled}
                />
              </div>

              {/* Column 2: Responsibility Center / Requesting Dept / Tran Type */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Responsibility Center */}
                {/* Payee Code. */}
                <FieldRenderer
                  id="vendCode"
                  label="Payee Code"
                  required
                  type="lookup"
                  value={vendCode || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => updateState({ payeeLookupOpen: true })}
                />

                {/* Ref No (Payee Name) */}
                <FieldRenderer
                  id="vendName"
                  label="Payee Name"
                  required
                  type="text"
                  value={vendName || ""}
                  onChange={(val) => updateState({ vendName: val })}
                  disabled={isFormDisabled}
                  onClick={() => updateState({ payeeLookupOpen: true })}
                />

                {/* PR Tran Type */}
                <FieldRenderer
                  id="siNo"
                  label="SI No."
                  type="text"
                  value={siNo || ""}
                  onChange={(val) => updateState({ siNo: val })}
                  disabled={isFormDisabled}
                />

              </div>

              {/* Column 3: Currency */}
              <div className="global-tran-textbox-group-div-ui">
                {/* NEW FLEX CONTAINER FOR CURRENCY AND CURRENCY RATE */}
                <div className="relative w-full">
                  <FieldRenderer
                    id="SIdate"
                    label="SI Date"
                    type="date"
                    value={header.rr_date}
                    onChange={(val) =>
                      setHeader((prev) => ({
                        ...prev,
                        rr_date: val,
                      }))
                    }
                    disabled={isFormDisabled}
                  />

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

                {/* WareHouse  */}

                <FieldRenderer
                  id="WHcode"
                  label="Warehouse"
                  required
                  type="lookup"
                  value={
                    WHCode && WHName
                      ? `${WHCode} - ${WHName}`
                      : WHName || WHCode || ""
                  }
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({ warehouseLookupOpen: true })
                  }
                />

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

                <FieldRenderer
                  id="locName"
                  label="Location"
                  required
                  type="lookup"
                  value={LocName || LocCode || ""}
                  readOnly
                  disabled={isFormDisabled || !WHCode}
                  lookupDisabled={isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    WHCode &&
                    updateState({
                      locationLookupOpen: true,
                      selectedWH: WHCode,
                    })
                  }
                />

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
                        <div className="relative w-fit">
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
              <button
                className={`global-tran-tab-padding-ui ${
                  GLactiveTab === "invoice"
                    ? "global-tran-tab-text_active-ui"
                    : "global-tran-tab-text_inactive-ui"
                }`}
                // onClick={() => setGLActiveTab('invoice')}
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
                    {/* <th className="global-tran-th-ui">RR Status</th> */}
                    <th className="global-tran-th-ui">PO No.</th>
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

                <tbody className="relative">
                  {detailRows.map((row, index) => (
                    <tr key={index} className="global-tran-tr-ui">
                      {/* LN */}
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>

                    {/* <td className="global-tran-td-ui">
                      <input
                        type="text"
                        className="w-[90px] global-tran-td-inputclass-ui text-center"
                        value={getFullStatus(row.rrStatus || row.poStatus)}
                        readOnly
                      />
                    </td> */}

                    <td className="global-tran-td-ui">
                      <input
                        type="text"
                        className="w-[140px] global-tran-td-inputclass-ui text-center"
                        value={row.poNo || state.poNo || ""}
                        readOnly
                      />
                    </td>

                      {/* Item Code */}
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.itemCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  msLookupModalOpen: true,
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      {/* Item Description */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.itemName || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "itemName",
                              e.target.value,
                            )
                          }
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
                          className="w-[50px] text-center global-tran-td-inputclass-ui"
                          value={row.uomCode || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) =>
                            handleDetailChange(index, "uomCode", e.target.value)
                          }
                        />
                      </td>

                      {/* RR Quantity */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.rrQty || ""}
                          disabled={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.-]/g,
                              "",
                            );
                            if (
                                /^-?\d*\.?\d{0,6}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChange(
                                index,
                                "rrQty",
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
                              e.target.value = formatNumber(num, decQty);
                                  handleDetailChange(index, "rrQty", e.target.value, true);
                            }
                            setFocusedCell(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const value = e.target.value;
                              const num = parseFormattedNumber(value);
                              if (!isNaN(num)) {
                                e.target.value = formatNumber(num, decQty);
                                  handleDetailChange(index, "rrQty", e.target.value, true);
                              }
                              e.target.blur();
                            }
                          }}
                        />
                      </td>

                      {/* Free Quantity */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.freeQty || ""}
                          disabled={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.-]/g,
                              "",
                            );
                            if (
                                /^-?\d*\.?\d{0,6}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChange(
                                index,
                                "freeQty",
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
                          e.target.value = formatNumber(num, decQty);
                                handleDetailChange(index, "freeQty", e.target.value, true);
                            }
                            setFocusedCell(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const value = e.target.value;
                              const num = parseFormattedNumber(value);
                              if (!isNaN(num)) {
                                handleDetailChange(
                                  index,
                                  "freeQty",
                                  num,
                                  true,
                                );
                              }
                              e.target.blur();
                            }
                          }}
                        />
                      </td>

                      {/* Unit Cost */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                          value={row.unitCost || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                                /^\d*\.?\d{0,6}$/.test(sanitizedValue) ||
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
                              e.target.value = formatNumber(num, decUcost);
                                  handleDetailChange(index, "unitCost", e.target.value, true);
                            }
                            setFocusedCell(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const value = e.target.value;
                              const num = parseFormattedNumber(value);
                              if (!isNaN(num)) {
                                handleDetailChange(
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

                      {/* Amount (GROSS_AMOUNT) */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[140px] global-tran-td-inputclass-ui text-right"
                          value={
                            formatNumber(
                              parseFormattedNumber(
                                row.grossAmount ?? row.amount ?? row.itemAmount,
                              ),
                            ) || ""
                          }
                        />
                      </td>

                      {/* VAT Code (lookup) */}
                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.vatCode || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "vatCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />

                          {!isFormDisabled &&
                            (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  handleOpenVatLookup(index);
                                }}
                              />
                            )}
                        </div>
                      </td>

                      {/* VAT Rate (from VAT lookup) */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={
                            row.vatRate !== "" && row.vatRate !== null && row.vatRate !== undefined
                              ? formatNumber(parseFormattedNumber(row.vatRate), 2)
                              : ""
                          }
                          readOnly
                          disabled
                        />
                      </td>

                      {/* VAT Amount */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 cursor-pointer"
                          value={
                            formatNumber(parseFormattedNumber(row.vatAmount)) ||
                            ""
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Net Amount */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 cursor-pointer"
                          value={
                            formatNumber(parseFormattedNumber(row.netAmount)) ||
                            ""
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td
                        className="global-tran-td-ui"
                        onDoubleClick={() => handleOpenLotBreakdownModal(index)}
                      >
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.lotNo || ""}
                          readOnly={isFormDisabled}
                          onDoubleClick={() => handleOpenLotBreakdownModal(index)}
                          title="Double-click to enter lot number breakdown"
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
                          value={row.bbDate || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) =>
                            handleDetailChange(index, "bbDate", e.target.value)
                          }
                        />
                      </td>

                      {/* QC Status */}
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.qstatCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && row.operation !== "S" && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showQstatModal: true,
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.whouseCode || row.whCode || ""}
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

                      {/* Location */}
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.LocCode || row.locCode || ""}
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
                                  selectedWH:
                                    row.whouseCode || row.whCode || "",
                                  accountModalSource: "LocCode",
                                });
                              }}
                            />
                          )}
                        </div>
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
            <div className="relative inline-block">
                {showTypeDropdown && (
                  <div className="absolute bottom-[110%] left-0 mb-2 z-[9999] w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                        Add Item
                      </div>
                    </div>

                    <div className="p-1.5">
                      <button
                        type="button"
                        className="mt-1 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                        onClick={handleOpenFGLookup}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            <FontAwesomeIcon icon={faTableCellsLarge} />
                          </span>
                          <div className="flex flex-col items-start">
                            <span>Finished Goods</span>
                            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                              Add FG item
                            </span>
                          </div>
                        </div>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                          FG
                        </span>
                      </button>

                      <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />

                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                        onClick={() => {
                          setShowTypeDropdown(false);
                          handleOpenPOOpenLookup();
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                            <FontAwesomeIcon icon={faFileLines} />
                          </span>
                          <div className="flex flex-col items-start">
                            <span>Open Reference PO</span>
                            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                              Pull items from PO
                            </span>
                          </div>
                        </div>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                          PO
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddRowClick}
                  disabled={isFormDisabled}
                  className={`global-tran-tab-footer-button-add-ui ${
                    isFormDisabled
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
                  Total RR Quantity:
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

      </div>

     {/* HISTORY TAB */}
      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getFGRRHistory"
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

      {showQstatModal && (
        <QstatLookupModal
          isOpen={showQstatModal}
          onClose={handleCloseQStatLookup}
          filter="ActiveAll"
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
          whCode={state.selectedWH || state.WHCode || state.WHcode || ""}
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

      {showLotPickingModal && selectedLotPickingRow && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-6xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-slate-700">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Lot No Breakdown
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedLotPickingRow.itemCode} - {selectedLotPickingRow.itemName}
                </p>
              </div>
      <div className="flex gap-2 text-right">
  {/* RR QTY Block */}
  <div className="flex flex-col items-center justify-center rounded-md bg-gray-100 px-4 py-1.5 dark:bg-slate-900/50">
    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      RR QTY
    </div>
    <div className="text-sm  text-gray-900 dark:text-white">
      {formatNumber(lotBreakdownTargetQty, decQty)}
    </div>
  </div>

  {/* ASSIGNED Block */}
  <div className="flex flex-col items-center justify-center rounded-md bg-gray-100 px-4 py-1.5 dark:bg-slate-900/50">
    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Assigned
    </div>
    <div className="text-sm  text-gray-900 dark:text-white">
      {formatNumber(lotBreakdownAssignedQty, decQty)}
    </div>
  </div>

  {/* REMAINING Block */}
  <div className="flex flex-col items-center justify-center rounded-md bg-gray-100 px-4 py-1.5 dark:bg-slate-900/50">
    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Remaining
    </div>
    <div
      className={`text-sm font-bold ${
        lotBreakdownRemainingQty === 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-500 dark:text-amber-500"
      }`}
    >
      {formatNumber(lotBreakdownRemainingQty, decQty)}
    </div>
  </div>
</div>
            </div>

            <div className="max-h-[60vh] overflow-auto p-4">
              <table className="min-w-full border-collapse">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    <th className="global-tran-th-ui">LN</th>
                    <th className="global-tran-th-ui">Lot No</th>
                    <th className="global-tran-th-ui">Quantity</th>
                    <th className="global-tran-th-ui">BB Date</th>
                    <th className="global-tran-th-ui">QC Status</th>
                    <th className="global-tran-th-ui">Warehouse</th>
                    <th className="global-tran-th-ui">Location</th>
                    <th className="global-tran-th-ui"></th>
                    <th className="global-tran-th-ui">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {lotEntryRows.map((lot, index) => (
                    <tr key={lot.id || index} className="global-tran-tr-ui">
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[180px] global-tran-td-inputclass-ui"
                          value={lot.lotNo || ""}
                          onChange={(e) =>
                            handleLotEntryChange(index, "lotNo", e.target.value)
                          }
                        />
                      </td>
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={lot.quantity || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, "");
                            handleLotEntryChange(index, "quantity", value);
                          }}
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="date"
                          className="w-[130px] global-tran-td-inputclass-ui"
                          value={lot.bbDate || ""}
                          onChange={(e) =>
                            handleLotEntryChange(index, "bbDate", e.target.value)
                          }
                        />
                      </td>
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[110px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={lot.qstatCode || ""}
                            readOnly
                          />
                          <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                            onClick={() =>
                              updateState({
                                selectedRowIndex: index,
                                showQstatModal: true,
                                accountModalSource: "lotQstatCode",
                              })
                            }
                          />
                        </div>
                      </td>
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[110px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={lot.whouseCode || lot.whCode || ""}
                            readOnly
                          />
                          <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                            onClick={() =>
                              updateState({
                                selectedRowIndex: index,
                                warehouseLookupOpen: true,
                                accountModalSource: "lotWhouseCode",
                              })
                            }
                          />
                        </div>
                      </td>
                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[110px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={lot.LocCode || lot.locCode || ""}
                            readOnly
                          />
                          <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                            onClick={() =>
                              updateState({
                                selectedRowIndex: index,
                                locationLookupOpen: true,
                                selectedWH: lot.whouseCode || lot.whCode || "",
                                accountModalSource: "lotLocCode",
                              })
                            }
                          />
                        </div>
                      </td>
                      <td className="global-tran-td-ui text-center">
                        <button
                          type="button"
                          className="global-tran-td-button-add-ui"
                          onClick={() => handleAddLotEntryRow(index)}
                          title="Add lot row"
                          aria-label="Add lot row"
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      </td>
                      <td className="global-tran-td-ui text-center">
                        <button
                          type="button"
                          className="global-tran-td-button-delete-ui"
                          onClick={() => handleDeleteLotEntryRow(index)}
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end border-t border-gray-200 px-4 py-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 text-xs font-medium rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                  onClick={handleCloseLotPickingModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleConfirmLotPicking}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{
            branchCode,
            branchName,
            docType,
            documentTitle,
            fieldNo: "rrNo",
          }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {isGeneralLedgerEnabled && (
        <>
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
          applyLookupToGLRow("slCode", {
            slCode: item.slCode,
            sltypeCode: item.sltypeCode,
          });
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
        </>
      )}

     {state.poLookupModalOpen && (
  <GlobalCombinedLookup
    isOpen={state.poLookupModalOpen}
    summarySelectionMode="multiple"
    detailSelectionMode="multiple"
    summaryColumns={
      openPORRColSummary.length > 0
        ? openPORRColSummary
        : openPOColSummary
    }
    detailColumns={
      openPORRColDetail.length > 0
        ? openPORRColDetail
        : openPOColDetail
    }
    summaryData={openPODataSummary}
    tabTitles={["Open PO Summary", "Open PO Detail"]}
    fetchDetailApi={async (selectedIds) => {
      const selectedSummaries = openPODataSummary.filter((row) =>
        (Array.isArray(selectedIds) ? selectedIds : [selectedIds]).includes(row.groupId),
      );

      if (!(await validateOpenPOSameSupplier(selectedSummaries))) {
        throw new Error("Selected PO records must have the same supplier.");
      }

      const idString = Array.isArray(selectedIds)
        ? selectedIds.join(",")
        : selectedIds;

      const payload = {
        json_data: JSON.stringify({
          json_data: {
            selectedId: idString,
            tranIds: idString,
          },
        }),
      };

      const response = await postRequest("getPORR_OpenDetail", payload);
      const rows = response?.data?.[0]?.result
        ? extractLookupRows(response.data[0].result)
        : extractLookupRows(response?.data || response);

      const normalizedRows = rows.map((row, index) => {
        const normalized = normalizeOpenPODetailRow(row, index);
        const uniqueGroupId = [
          normalized.poNo || normalized.PoNo || idString,
          normalized.lnNo || normalized.Ln || index + 1,
          normalized.itemCode || normalized.ItemCode || "item",
          index,
        ].join("-");

        return {
          ...fillConfiguredOpenPODetailKeys(
            normalized,
            openPORRColDetail.length > 0 ? openPORRColDetail : openPOColDetail,
          ),
          groupId: uniqueGroupId,
          lookupGroupId: uniqueGroupId,
        };
      });

      return {
        data: [
          {
            result: JSON.stringify(normalizedRows),
          },
        ],
      };
    }}

    onCancel={() => updateState({ poLookupModalOpen: false })}
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
        <FGLookupModal
          isOpen={msLookupModalOpen}
          onClose={handleCloseFGLookup}
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

export default FGRR;
