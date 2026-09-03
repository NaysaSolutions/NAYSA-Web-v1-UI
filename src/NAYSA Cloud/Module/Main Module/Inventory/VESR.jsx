// VESR_v18 - VESR02 flexible Excel upload + VESR01 direct Add when no source details - 2026-08-19
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";

const MODEL_YEAR_MIN = 1900;
const getMaximumModelYear = () => new Date().getFullYear() + 1;
const sanitizeModelYear = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 4);
const isValidModelYear = (value) => {
  const yearText = String(value ?? "").trim();
  const year = Number(yearText);
  return /^\d{4}$/.test(yearText) && year >= MODEL_YEAR_MIN && year <= getMaximumModelYear();
};
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faFolderOpen, faMagnifyingGlass, faPlus, faTrashAlt, faUpload } from "@fortawesome/free-solid-svg-icons";

// NAYSA Cloud standard lookups / modals
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import QstatLookupModal from "../../../Lookup/SearchQStatRef.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";

// NAYSA Cloud standard globals
import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { postRequest, fetchData, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext.jsx";
import { useSelectedHSColConfig as getSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";
import {
  useTopCurrencyRow,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopHSOption,
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
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
  useSwalProceedConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  getSingleUploadExcelCellValue,
  getSingleUploadTemplateColumns as getGlobalSingleUploadTemplateColumns,
  handleDownloadSingleUploadTemplate as downloadGlobalSingleUploadTemplate,
  handleSingleUploadExcelFile,
  showSingleUploadErrorList,
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const DEFAULT_VESR_TRAN_TYPE = "VESR01";
const getRegularVESRTranType = (tranTypes = [], fallback = DEFAULT_VESR_TRAN_TYPE) => {
  const options = Array.isArray(tranTypes) ? tranTypes : [];
  const regularTranType = options.find((type) => {
    const name = String(type?.DROPDOWN_NAME || type?.label || "").trim().toUpperCase();
    const code = String(type?.DROPDOWN_CODE || type?.value || "").trim().toUpperCase();
    return name === "REGULAR" || code === "REGULAR";
  });

  return regularTranType?.DROPDOWN_CODE || regularTranType?.value || fallback;
};

const VESR = () => {
  const { resetFlag } = useReset();
  const { user, companyInfo, currentUserRow } = useAuth();

  const docType = docTypes?.VESR || "VESR";
  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const documentTitle = docTypeNames?.[docType] || "Vehicle Sales Return";
  const baseCurrency = companyInfo?.currCode||""
  const defaultBranchCode =currentUserRow?.branchCode||""
  const defaultBranchName = currentUserRow?.branchName||""
  const hideCostAmount = currentUserRow?.viewCostamt === "N";
  const [veInvGLMode, setVEInvGLMode] = useState("E");
  const isGeneralLedgerEnabled = String(veInvGLMode || "E").toUpperCase() !== "D";
  const [topTab, setTopTab] = useState("details");
  const [header, setHeader] = useState({
    sr_date: new Date().toISOString().split("T")[0],
  });
  const [editingVehicleCostCell, setEditingVehicleCostCell] = useState(null);
  const [showSingleUploadDropdown, setShowSingleUploadDropdown] = useState(false);
  const singleUploadDropdownRef = useRef(null);
  const uploadInputRef = useRef(null);

  const [state, setState] = useState({
    documentName: "",
    documentSeries: "S",
    documentDocLen: 8,
    documentID: null,
    documentNo: "",
    documentStatus: "",
    status: "OPEN",

   
    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.branchName||"",
    cutoffCode: "",
    vesrTranTypes: [],
    vesrTranType: DEFAULT_VESR_TRAN_TYPE,
    vendCode: "",
    vendName: "",
    custCode: "",
    custName: "",
    poNo: "",
    poDate: "",
    prNo: "",
    drNo: "",
    refVsiNo: "",
    refCmNo: "",
    siNo: "",
    siDate: "",
    vatCode: "",
    vatName: "",
    vatRate: 0,
    apvNo: "",
    particular: "",

    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),
    glCurrMode: "M",
    glCurrGlobal1:companyInfo?.glCurrGlobal1||"",
    glCurrGlobal2:companyInfo?.glCurrGlobal2||"",
    glCurrGlobal3:companyInfo?.glCurrGlobal3||"",
    withCurr2: false,
    withCurr3: false,

    whouseCode: "",
    whouseName: "",
    locCode: "",
    locName: "",
    selectedWH: "",

    detailRows: [],
    detailRowsGL: [],
    tblFieldArray: [],
    decQty: 6,
    decUcost: 6,

    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: true,
    isFetchDisabled: false,
    isSaveDisabled: false,

    branchModalOpen: false,
    currencyModalOpen: false,
    payeeLookupOpen: false,
    showCustomerModal: false,
    warehouseLookupOpen: false,
    locationLookupOpen: false,
    locationLookupRowIndex: null,
    warehouseLookupRowIndex: null,
    qstatLookupOpen: false,
    qstatLookupRowIndex: null,
    vatLookupOpen: false,
    vatLookupRowIndex: null,
    poLookupModalOpen: false,
    openPODataSummary: [],
    openPORRColSummary: [],
    openPORRColDetail: [],
    veLookupModalOpen: false,
    selectedRowIndex: null,

    showCancelModal: false,
    showPostModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showAllTranDocNo: false,
    noReprints: 0,

    activeDetailTab: "items",
    GLactiveTab: "invoice",

    showCOALookup: false,
    showSLLookup: false,
    showRCLookupGL: false,
    showVATLookupGL: false,
    showATCLookupGL: false,
    glRowIndex: -1,
  });

  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const currRateBeforeEditRef = useRef("1.000000");


  useEffect(() => {
    if (!showSingleUploadDropdown) return;

    const handleClickOutside = (event) => {
      if (singleUploadDropdownRef.current?.contains(event.target)) return;
      setShowSingleUploadDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSingleUploadDropdown]);

  // Match FGRR: PO rows keep PO_DT1.group_id; direct/no-PO rows get a client UUID.
  const generateClientGroupId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().toUpperCase();
    }

    return `VESR-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
  };

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    detailRowsRef.current = state.detailRows || [];
  }, [state.detailRows]);

  useEffect(() => {
    detailRowsGLRef.current = state.detailRowsGL || [];
  }, [state.detailRowsGL]);

  const getFullStatus = (rawStatus, cancelled = "") => {
    if (String(cancelled || "").toUpperCase() === "Y") return "CANCELLED";
    const s = String(rawStatus || "").trim().toUpperCase();
    if (!s || s === "O" || s === "OPEN") return "OPEN";
    if (s === "P" || s === "POSTED") return "POSTED";
    if (s === "F" || s === "FINALIZED") return "FINALIZED";
    if (s === "C" || s === "CLOSED") return "CLOSED";
    if (["X", "CANCELLED", "CANCELED"].includes(s)) return "CANCELLED";
    return s;
  };

  const displayStatus = getFullStatus(state.documentStatus, state.cancelled);
  const statusClass = {
    OPEN: "global-tran-stat-text-open-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
  }[displayStatus] || "";

  const isFormDisabled = ["POSTED", "FINALIZED", "CLOSED", "CANCELLED"].includes(
    displayStatus,
  );


  useEffect(() => {
    if (isFormDisabled) {
      setShowSingleUploadDropdown(false);
    }
  }, [isFormDisabled]);

  const normalizeLookupName = (code, name) => {
    const normalizedCode = String(code || "").trim();
    let normalizedName = String(name || "").trim();
    if (!normalizedCode) return normalizedName;
    const prefix = `${normalizedCode} - `;
    while (normalizedName.toUpperCase().startsWith(prefix.toUpperCase())) {
      normalizedName = normalizedName.slice(prefix.length).trim();
    }
    return normalizedName;
  };

  const formatLookupValue = (code, name) => {
    const c = String(code || "").trim();
    const n = normalizeLookupName(c, name);
    return c && n ? `${c} - ${n}` : c || n;
  };

  const extractRows = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        return extractRows(JSON.parse(value));
      } catch {
        return [];
      }
    }
    if (Array.isArray(value?.data)) return value.data;
    if (value?.result !== undefined) return extractRows(value.result);
    if (value?.data?.[0]?.result !== undefined) return extractRows(value.data[0].result);
    return [];
  };

  const loadVehicleMasterInfo = async (itemCode) => {
    if (!itemCode) return null;
    try {
      const response = await postRequest("getVEMast", { ITEM_CODE: itemCode });
      const rows = extractRows(response?.data?.[0]?.result ?? response?.data ?? response);
      const mast = rows?.[0] || null;
      if (!mast) return null;

      const categoryCode = mast.categoryCode || mast.categCode || "";
      if (!categoryCode) return mast;

      try {
        const categoryResponse = await postRequest("getVECateg", { CATEG_CODE: categoryCode });
        const categoryRows = extractRows(
          categoryResponse?.data?.[0]?.result ?? categoryResponse?.data ?? categoryResponse,
        );
        const category = categoryRows?.[0] || {};
        return {
          ...mast,
          vehicleMake: category.vehicleMake || mast.vehicleMake || "",
        };
      } catch {
        return mast;
      }
    } catch (error) {
      console.warn("VESR: unable to load Vehicle Master defaults", itemCode, error);
      return null;
    }
  };

  const calcInclusiveVat = (grossAmount, vatRate) => {
    const gross = parseFormattedNumber(grossAmount || 0);
    const rawRate = parseFormattedNumber(vatRate || 0);
    if (!gross || !rawRate) return 0;
    if (rawRate > 1) return gross * (rawRate / (100 + rawRate));
    return gross * (rawRate / (1 + rawRate));
  };

  const recalcVehicleRow = (row) => {
    const quantity = parseFormattedNumber(row.quantity || 0);
    const currRate = Math.max(parseFormattedNumber(row.currRate || state.currRate || 1), 0.000001);
    let unitCost = parseFormattedNumber(row.unitCost || 0);
    let unitCostFx = parseFormattedNumber(row.unitCostFx || 0);
    const rowCurrency = String(row.currCode || state.currCode || baseCurrency).toUpperCase();

    if (rowCurrency !== baseCurrency) {
      if (!unitCostFx && unitCost) unitCostFx = unitCost / currRate;
      unitCost = unitCostFx * currRate;
    } else {
      unitCostFx = unitCost;
    }

    const itemCost = quantity * unitCost;
    const fxAmount = quantity * unitCostFx;
    const vatAmount = calcInclusiveVat(itemCost, row.vatRate || 0);
    const netAmount = itemCost - vatAmount;

    return {
      ...row,
      currRate,
      unitCost,
      unitCostFx,
      itemCost,
      fxAmount,
      vatAmount,
      netAmount,
    };
  };

  const totals = useMemo(() => {
    return (state.detailRows || []).reduce(
      (acc, row) => {
        acc.quantity += parseFormattedNumber(row.quantity || 0);
        acc.amount += parseFormattedNumber(row.itemCost || 0);
        acc.vat += parseFormattedNumber(row.vatAmount || 0);
        acc.net += parseFormattedNumber(row.netAmount || 0);
        return acc;
      },
      { quantity: 0, amount: 0, vat: 0, net: 0 },
    );
  }, [state.detailRows]);

  const totalDebitGL = useMemo(
    () =>
      (state.detailRowsGL || []).reduce(
        (sum, row) => sum + parseFormattedNumber(row.debit || 0),
        0,
      ),
    [state.detailRowsGL],
  );
  const totalCreditGL = useMemo(
    () =>
      (state.detailRowsGL || []).reduce(
        (sum, row) => sum + parseFormattedNumber(row.credit || 0),
        0,
      ),
    [state.detailRowsGL],
  );

  const headerCurrencyCode = String(state.currCode || baseCurrency).toUpperCase();
  const isForeignCurrency = headerCurrencyCode !== baseCurrency;
  const isDirectSalesReturn =
    String(state.vesrTranType || DEFAULT_VESR_TRAN_TYPE).trim().toUpperCase() === "VESR02";
  const payeeLookupFilter = isDirectSalesReturn ? "ActiveAll" : "OpenVESR";
  const hasVehicleDetailRows = Array.isArray(state.detailRows) && state.detailRows.length > 0;
  const canUseSingleUploadMenu = isDirectSalesReturn || hasVehicleDetailRows;

  useEffect(() => {
    if (!canUseSingleUploadMenu && showSingleUploadDropdown) {
      setShowSingleUploadDropdown(false);
    }
  }, [canUseSingleUploadMenu, showSingleUploadDropdown]);

  useEffect(() => {
    if (isDirectSalesReturn) {
      updateState({ poLookupModalOpen: false });
      return;
    }

    updateState({
      veLookupModalOpen: false,
      selectedRowIndex: null,
    });
  }, [isDirectSalesReturn, updateState]);

  const detailColumnDefs = useMemo(() => {
    const columns = [
      { key: "lnNo", label: "LN", width: 56 },
      { key: "itemCode", label: "Item Code", width: 120 },
      { key: "itemName", label: "Item Description", width: 300 },
      { key: "uomCode", label: "UOM", width: 80 },
      { key: "quantity", label: "Quantity", width: 130 },
      { key: "unitCost", label: "Unit Cost", width: 140 },
      { key: "itemCost", label: "Amount", width: 140 },
      { key: "chassisNo", label: "CS No", width: 140 },
      { key: "make", label: "Make", width: 120 },
      { key: "model", label: "Model", width: 140 },
      { key: "modelYear", label: "Model (Year)", width: 120 },
      { key: "serialNo", label: "Serial No.", width: 150 },
      { key: "engineNo", label: "Engine No.", width: 150 },
      { key: "prodNo", label: "Production No.", width: 150 },
      { key: "color", label: "Color", width: 120 },
      { key: "qstatCode", label: "QC Status", width: 120 },
      { key: "pnpNo", label: "PNP Clearance No", width: 150 },
      { key: "csrNo", label: "CSR No.", width: 130 },
      { key: "rcCode", label: "RC Code", width: 120 },
      { key: "whouseCode", label: "Warehouse", width: 120 },
      { key: "locCode", label: "Location", width: 120 },
    ];

    if (hideCostAmount) {
      return columns.filter(
        (c) =>
          ![
            "unitCost",
            "itemCost",
          ].includes(c.key),
      );
    }

    return columns;
  }, [hideCostAmount]);

  const {
    getColumnStyle: getDetailColumnStyle,
    getFrozenColumnStyle: getDetailFrozenStyle,
    getOrderedColumns: getOrderedDetailColumns,
    getSortedRows: getSortedDetailRows,
    renderResizableHeader: renderDetailHeader,
    renderHeaderContextMenu: renderDetailHeaderContextMenu,
  } = useResizableTableColumns(detailColumnDefs);

  const orderedDetailColumns = useMemo(
    () => getOrderedDetailColumns(detailColumnDefs),
    [detailColumnDefs, getOrderedDetailColumns],
  );

  const visibleDetailColumns = useMemo(() => {
    // Keep the transaction identity columns fixed at the beginning even when
    // the global resizable table restores a previously saved column order.
    // VESR invoice details must always display/export in the defined order.
    const leadingColumnKeys = detailColumnDefs.map((column) => column.key);
    const leadingColumns = leadingColumnKeys
      .map((key) => orderedDetailColumns.find((column) => column.key === key))
      .filter(Boolean);
    return [
      ...leadingColumns,
      ...orderedDetailColumns.filter(
        (column) => !leadingColumnKeys.includes(column.key),
      ),
    ];
  }, [detailColumnDefs, orderedDetailColumns]);

  const sortedDetailRows = useMemo(
    () =>
      getSortedDetailRows(
        (state.detailRows || []).map((row, originalIndex) => ({ row, originalIndex })),
        (entry, sortKey) =>
          sortKey === "lnNo" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
      ),
    [getSortedDetailRows, state.detailRows],
  );

  const getDetailCellStyle = (key, width) => ({
    ...getDetailColumnStyle(key, width),
    ...getDetailFrozenStyle(key, visibleDetailColumns, width, { isHeader: false }),
  });

  const showGlForeignCurrency = state.withCurr2 || isForeignCurrency;
  const glForeignCurrCode = String(
    state.withCurr3 ? state.glCurrGlobal2 : state.currCode || state.glCurrGlobal2 || "",
  ).trim().toUpperCase();

  const glColumnDefs = useMemo(
    () => [
      { key: "ln", label: "LN", width: 56 },
      { key: "acctCode", label: "Account Code", width: 120 },
      { key: "rcCode", label: "RC Code", width: 120 },
      { key: "sltypeCode", label: "SL Type", width: 120 },
      { key: "slCode", label: "SL Code", width: 120 },
      { key: "particular", label: "Particulars", width: 320 },
      { key: "debit", label: `Debit (${state.glCurrDefault || baseCurrency})`, width: 140 },
      { key: "credit", label: `Credit (${state.glCurrDefault || baseCurrency})`, width: 140 },
      ...(showGlForeignCurrency
        ? [
            { key: "debitFx1", label: `Debit (${glForeignCurrCode || state.currCode || "FX"})`, width: 140 },
            { key: "creditFx1", label: `Credit (${glForeignCurrCode || state.currCode || "FX"})`, width: 140 },
          ]
        : []),
      ...(state.withCurr3
        ? [
            { key: "debitFx2", label: `Debit (${state.glCurrGlobal3 || "FX2"})`, width: 140 },
            { key: "creditFx2", label: `Credit (${state.glCurrGlobal3 || "FX2"})`, width: 140 },
          ]
        : []),
      { key: "slRefNo", label: "SL Ref. No.", width: 120 },
      { key: "slRefDate", label: "SL Ref. Date", width: 130 },
      { key: "remarks", label: "Remarks", width: 160 },
    ],
    [
      baseCurrency,
      glForeignCurrCode,
      showGlForeignCurrency,
      state.currCode,
      state.glCurrDefault,
      state.glCurrGlobal3,
      state.withCurr3,
    ],
  );

  const {
    getColumnStyle: getGLColumnStyle,
    getFrozenColumnStyle: getGLFrozenStyle,
    getOrderedColumns: getOrderedGLColumns,
    getSortedRows: getSortedGLRows,
    clearZeroValueOnFocus: clearGLZeroOnFocus,
    focusNextRowInput: focusNextGLRowInput,
    renderResizableHeader: renderGLHeader,
    renderHeaderContextMenu: renderGLHeaderContextMenu,
  } = useResizableTableColumns(glColumnDefs);

  const orderedGLColumns = useMemo(() => {
    const columns = getOrderedGLColumns(glColumnDefs);
    const currencyColumnKeys = ["debitFx1", "creditFx1", "debitFx2", "creditFx2"];
    const currencyColumns = currencyColumnKeys
      .map((key) => columns.find((column) => column.key === key))
      .filter(Boolean);
    const remainingColumns = columns.filter(
      (column) => !currencyColumnKeys.includes(column.key),
    );
    const creditIndex = remainingColumns.findIndex((column) => column.key === "credit");

    if (currencyColumns.length === 0 || creditIndex < 0) return columns;

    return [
      ...remainingColumns.slice(0, creditIndex + 1),
      ...currencyColumns,
      ...remainingColumns.slice(creditIndex + 1),
    ];
  }, [getOrderedGLColumns, glColumnDefs]);

  const sortedGLRows = useMemo(
    () =>
      getSortedGLRows(
        (state.detailRowsGL || []).map((row, originalIndex) => ({ row, originalIndex })),
        (entry, sortKey) =>
          sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
      ),
    [getSortedGLRows, state.detailRowsGL],
  );
  const getGLCellStyle = (key, width) => ({
    ...getGLColumnStyle(key, width),
    ...getGLFrozenStyle(key, orderedGLColumns, width, { isHeader: false }),
  });

  const initializeDefaults = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      const [docControl, hsOption, fieldLengths, vesrTranTypeData] = await Promise.all([
        useTopDocControlRow(docType),
        useTopHSOption(),
        useFieldLenghtCheck("vesr_hd,vesr_dt1,vesr_dt2"),
        useTopDocDropDown(docType, "VESRTRAN_TYPE"),
      ]);

      const defaultCurr = String(hsOption?.glCurrDefault || baseCurrency).toUpperCase();
      const transactionCurr = baseCurrency || defaultCurr || "PHP";
      const currencyRow = await useTopCurrencyRow(transactionCurr);

      const loadedVEGLMode =
        hsOption?.veinvGLMode ||
        companyInfo?.veinvGLMode ||
        "E";
      const regularTranType = getRegularVESRTranType(vesrTranTypeData);

      setVEInvGLMode(String(loadedVEGLMode || "E").toUpperCase());

      updateState({
        documentName: docControl?.docName || documentTitle,
        documentSeries: docControl?.docSeries || "S",
        documentDocLen: Number(docControl?.docLen || 8),
        glCurrMode: hsOption?.glCurrMode || "M",
        glCurrDefault: defaultCurr,
        glCurrGlobal1: hsOption?.glCurrGlobal1 || "",
        glCurrGlobal2: hsOption?.glCurrGlobal2 || "",
        glCurrGlobal3: hsOption?.glCurrGlobal3 || "",
        withCurr2:
          String(hsOption?.withCurr2 || "N").toUpperCase() === "Y",
        withCurr3:
          String(hsOption?.withCurr3 || "N").toUpperCase() === "Y",
        currCode: transactionCurr,
        currName:
          currencyRow?.currName || transactionCurr,
        currRate: "1.000000",
        vesrTranTypes: vesrTranTypeData || [],
        vesrTranType: regularTranType,
        tblFieldArray: Array.isArray(fieldLengths) ? fieldLengths : [],
      });
    } catch (error) {
      console.error("VESR initialization error", error);
      useSwalErrorAlert("Initialization Error", error?.message || "Unable to load VESR defaults.");
    } finally {
      updateState({ isLoading: false });
    }
  }, [baseCurrency, companyInfo, docType, documentTitle, updateState]);

  const handleReset = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setHeader({ sr_date: today });
    setTopTab("details");
    setState((prev) => ({
      ...prev,
      documentID: null,
      documentNo: "",
      documentStatus: "",
      cancelled: "",
      status: "OPEN",
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      cutoffCode: "",
      vesrTranType: getRegularVESRTranType(prev.vesrTranTypes),
      vendCode: "",
      vendName: "",
      custCode: "",
      custName: "",
      poNo: "",
      poDate: "",
      prNo: "",
      drNo: "",
      refVsiNo: "",
      refCmNo: "",
      siNo: "",
      siDate: "",
      vatCode: "",
      vatName: "",
      vatRate: 0,
      apvNo: "",
      particular: "",
      currCode: baseCurrency,
      currName: baseCurrency,
      currRate: "1.000000",
      whouseCode: "",
      whouseName: "",
      locCode: "",
      locName: "",
      selectedWH: "",
      detailRows: [],
      detailRowsGL: [],
      isDocNoDisabled: String(prev.documentSeries || "S").toUpperCase() === "S",
      isFetchDisabled: false,
      isSaveDisabled: false,
      activeDetailTab: "items",
      GLactiveTab: "invoice",
      showCancelModal: false,
      showPostModal: false,
      showAttachModal: false,
      showSignatoryModal: false,
      showAllTranDocNo: false,
      showCustomerModal: false,
      poLookupModalOpen: false,
      openPODataSummary: [],
      openPORRColSummary: [],
      openPORRColDetail: [],
      veLookupModalOpen: false,
      selectedRowIndex: null,
    }));
    initializeDefaults();
  }, [baseCurrency, defaultBranchCode, defaultBranchName, initializeDefaults]);

  useEffect(() => {
    handleReset();
  }, []);

  useEffect(() => {
    if (resetFlag) handleReset();
  }, [resetFlag]);

  useEffect(() => {
    if (state.documentID) return;
    const series = String(state.documentSeries || "S").trim().toUpperCase();
    updateState({ isDocNoDisabled: series === "S" || series === "AUTO" });
  }, [state.documentSeries, state.documentID, updateState]);

  useEffect(() => {
    let timer;
    if (state.isLoading) {
      timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }
    return () => clearTimeout(timer);
  }, [state.isLoading, updateState]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "F1") {
        event.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [updateState]);

  const fetchTranData = useCallback(
    async (srNo, branchCode, direction = "") => {
      if (!srNo || !branchCode) return;
      updateState({ isLoading: true });
      try {
        const data = await useFetchTranData(srNo, branchCode, docType, "srNo", direction);
        const parsed = data?.result && typeof data.result === "object" ? data.result : data;
        const vesrId = parsed?.vesrId;

        if (!vesrId) {
          useSwalErrorAlert("No Records Found", "Transaction does not exist.");
          return;
        }

        const rawStatus = parsed?.cancelled === "Y" ? "X" : parsed?.stat || "";
        const parsedStatus = getFullStatus(rawStatus, parsed?.cancelled);
        const parsedCurrency = String(parsed?.currCode || baseCurrency).toUpperCase();
        const currRow = await useTopCurrencyRow(parsedCurrency);
        const retrievedWhCode = parsed?.whouseCode || "";
        const retrievedWhName = normalizeLookupName(
          retrievedWhCode,
          parsed?.whouseName,
        );
        const retrievedLocCode = parsed?.locCode || "";
        const retrievedLocName = normalizeLookupName(
          retrievedLocCode,
          parsed?.locName,
        );

        setHeader({
          sr_date: parsed?.srDate
            ? String(parsed.srDate).substring(0, 10)
            : new Date().toISOString().split("T")[0],
        });

        const loadedDetails = (Array.isArray(parsed?.dt1) ? parsed.dt1 : []).map((row, index) =>
          recalcVehicleRow({
            ...row,
            groupId: row.groupId || "",
            lnNo: row.lnNo || index + 1,
            // Latest sproc Get returns PO/PR line numbers as poln/prln.
            // Keep the JSX internal names poLineno/prLineno for the UI.
            poLineno: row.poLineno || row.poln || "",
            prLineno: row.prLineno || row.prln || "",
            quantity: row.quantity ?? 0,
            balance: row.balance ?? row.quantity ?? 0,
            currCode: row.currCode || parsedCurrency,
            currRate: row.currRate || parsed?.currRate || 1,
            rcCode: row.rcCode || row.actCode || "",
          }),
        );

        updateState({
          documentID: vesrId,
          documentNo: parsed?.srNo || srNo,
          documentStatus: rawStatus,
          cancelled: parsed?.cancelled || "",
          status: parsedStatus,
          branchCode: parsed?.branchCode || branchCode,
          branchName: parsed?.branchName || state.branchName,
          cutoffCode: parsed?.cutoffCode || "",
          vesrTranType: parsed?.vesrTranType || getRegularVESRTranType(state.vesrTranTypes),
          vendCode: parsed?.vendCode || "",
          vendName: parsed?.vendName || "",
          custCode: parsed?.custCode || parsed?.customerCode || "",
          custName: parsed?.custName || parsed?.customerName || "",
          poNo: parsed?.poNo || "",
          poDate: parsed?.poDate ? String(parsed.poDate).substring(0, 10) : "",
          prNo: parsed?.prNo || "",
          drNo: parsed?.drNo || "",
          refVsiNo: parsed?.refVsiNo || parsed?.refVSINo || "",
          refCmNo: parsed?.refCmNo || parsed?.refCMNo || "",
          siNo: parsed?.siNo || "",
          siDate: parsed?.siDate ? String(parsed.siDate).substring(0, 10) : "",
          vatCode: parsed?.vatCode || "",
          apvNo: parsed?.apvNo || "",
          particular: parsed?.particular || "",
          currCode: parsedCurrency,
          currName: currRow?.currName || parsedCurrency,
          currRate: formatNumber(parsed?.currRate || 1, 6),
          whouseCode: retrievedWhCode || "",
          whouseName: retrievedWhName || "",
          locCode: retrievedLocCode || "",
          locName: retrievedLocName || "",
          detailRows: loadedDetails,
          detailRowsGL: Array.isArray(parsed?.dt2)
            ? parsed.dt2.map((row, index) => ({
                ...row,
                id: index + 1,
                rcCode: row.rcCode || "",
                slRefNo: row.slRefNo || "",
                debit: formatNumber(parseFormattedNumber(row.debit || 0), 2),
                credit: formatNumber(parseFormattedNumber(row.credit || 0), 2),
                debitFx1: formatNumber(parseFormattedNumber(row.debitFx1 || 0), 2),
                creditFx1: formatNumber(parseFormattedNumber(row.creditFx1 || 0), 2),
                debitFx2: formatNumber(parseFormattedNumber(row.debitFx2 || 0), 2),
                creditFx2: formatNumber(parseFormattedNumber(row.creditFx2 || 0), 2),
              }))
            : [],
          isDocNoDisabled: true,
          isFetchDisabled: true,
          isSaveDisabled: parsedStatus !== "OPEN",
        });
      } catch (error) {
        console.error("VESR fetch error", error);
        useSwalErrorAlert("VESR Retrieval", error?.message || "Unable to retrieve transaction.");
      } finally {
        updateState({ isLoading: false });
      }
    },
    [baseCurrency, docType, state.branchName, state.vesrTranTypes, updateState],
  );

  const handleDocNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      if (
        String(state.documentSeries || "").toUpperCase() !== "S" &&
        state.documentDocLen > 0 &&
        String(state.documentNo).length !== Number(state.documentDocLen)
      ) {
        useSwalErrorAlert(
          "Invalid Document No.",
          `Document No. must be ${state.documentDocLen} characters.`,
        );
        return;
      }
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const validateDetails = () => {
    const errors = [];
    if (!state.branchCode) errors.push("Header - Branch Code");
    if (!header.sr_date) errors.push("Header - SR Date");
    if (!String(state.vesrTranType || "").trim()) errors.push("Header - Tran Type");
    if (!state.vendCode) errors.push("Header - Vendor Code");
    if (String(state.siNo || "").trim() && !state.siDate) errors.push("Header - SI Date");
    if (state.siDate && !String(state.siNo || "").trim()) errors.push("Header - SI No.");
    if (!state.whouseCode) errors.push("Header - Warehouse");
    if (!state.currCode) errors.push("Header - Currency");
    if (parseFormattedNumber(state.currRate || 0) <= 0) errors.push("Header - Currency Rate must be greater than zero");
    if (!state.detailRows?.length) errors.push("SR Details Empty");

    const chassisSeen = new Map();

    (state.detailRows || []).forEach((row, index) => {
      const ln = row.lnNo || index + 1;
      const itemCode = String(row.itemCode || "").trim();
      const qty = parseFormattedNumber(row.quantity || 0);
      const balance = parseFormattedNumber(row.balance || 0);
      const chassis = String(row.chassisNo || "").trim().toUpperCase();
      const modelYear = String(row.modelYear || "").trim();

      if (!itemCode) errors.push(`Line ${ln} - Item Code Required`);
      if (qty <= 0) errors.push(`Line ${ln} - Quantity must be greater than zero`);
      if (balance > 0 && qty > balance + 0.000001) {
        errors.push(`Line ${ln} - Quantity exceeds PO Balance ${formatNumber(balance, state.decQty)}`);
      }
      if (!String(row.vatCode || "").trim()) errors.push(`Line ${ln} - VAT Code Required`);
      if (!String(row.locCode || "").trim()) errors.push(`Line ${ln} - Location Required`);
      if (!chassis) errors.push(`Line ${ln} - Chassis / CS No. Required`);
      if (chassis) {
        if (chassisSeen.has(chassis)) {
          errors.push(`Line ${ln} - Duplicate Chassis / CS No. ${chassis}`);
        } else {
          chassisSeen.set(chassis, ln);
        }
      }

      if (String(row.requireModel || "N").toUpperCase() === "Y") {
        if (!String(row.model || "").trim()) errors.push(`Line ${ln} - Model Required`);
        if (!String(row.modelYear || "").trim()) errors.push(`Line ${ln} - Model Year Required`);
      }
      if (modelYear && !isValidModelYear(modelYear)) {
        errors.push(`Line ${ln} - Model Year must be a 4-digit year from ${MODEL_YEAR_MIN} to ${getMaximumModelYear()}`);
      }
      if (String(row.requireSerial || "N").toUpperCase() === "Y" && !String(row.serialNo || "").trim()) {
        errors.push(`Line ${ln} - Serial No. Required`);
      }
      if (String(row.requireEngine || "N").toUpperCase() === "Y" && !String(row.engineNo || "").trim()) {
        errors.push(`Line ${ln} - Engine No. Required`);
      }
      if (String(row.requireProdNo || "N").toUpperCase() === "Y" && !String(row.prodNo || "").trim()) {
        errors.push(`Line ${ln} - Production No. Required`);
      }
      if (String(row.requireColor || "N").toUpperCase() === "Y" && !String(row.color || "").trim()) {
        errors.push(`Line ${ln} - Color Required`);
      }
      if (String(row.requireQsCode || "N").toUpperCase() === "Y" && !String(row.qstatCode || "").trim()) {
        errors.push(`Line ${ln} - QS Status Required`);
      }
    });

    if (!errors.length) return true;
    useSwalErrorAlert("The following fields are required", errors.slice(0, 20).join("\n"));
    return false;
  };

  const handleDetailChange = (index, field, value, recalc = true) => {
    const rows = [...(state.detailRows || [])];
    if (!rows[index]) return;
    let next = { ...rows[index], [field]: value };

    if (field === "quantity") {
      const qty = parseFormattedNumber(value || 0);
      const balance = parseFormattedNumber(next.balance || 0);
      if (balance > 0 && qty > balance) next.quantity = balance;
    }

    if (field === "unitCost") {
      const rate = Math.max(parseFormattedNumber(next.currRate || state.currRate || 1), 0.000001);
      const unitCost = parseFormattedNumber(value || 0);
      next.unitCostFx = String(next.currCode || state.currCode).toUpperCase() === baseCurrency
        ? unitCost
        : unitCost / rate;
    }

    if (field === "unitCostFx") {
      const rate = Math.max(parseFormattedNumber(next.currRate || state.currRate || 1), 0.000001);
      next.unitCost = parseFormattedNumber(value || 0) * rate;
    }

    rows[index] = recalc ? recalcVehicleRow(next) : next;
    updateState({ detailRows: rows });
  };

  const handleCloseWarehouseLookup = (selected) => {
    if (selected) {
      const pickedWhCode = selected.whCode || "";
      const pickedWhName = normalizeLookupName(
        pickedWhCode,
        selected.whName,
      );

      const rowIndex = state.warehouseLookupRowIndex;
      const isHeaderLookup = rowIndex === null || rowIndex === undefined;

      if (!isHeaderLookup) {
        const rows = [...(detailRowsRef.current || state.detailRows || [])];
        if (rows[rowIndex]) {
          rows[rowIndex] = {
            ...rows[rowIndex],
            whouseCode: pickedWhCode,
            whouseName: pickedWhName,
            locCode: "",
            locName: "",
          };
          detailRowsRef.current = rows;
          updateState({ detailRows: rows });
        }
      } else {
        // Match FGRR: update header first, trigger confirmation without awaiting it,
        // then close the lookup modal immediately below.
        updateState({
          whouseCode: pickedWhCode,
          whouseName: pickedWhName,
          locCode: "",
          locName: "",
        });

        const currentRows = detailRowsRef.current || state.detailRows || [];
        if (currentRows.length > 0) {
          useSwalProceedConfirm(
            "Apply to Details?",
            "Do you want to apply this Warehouse to all detail items?",
            "Yes, update all",
            "No, header only",
          ).then((result) => {
            if (result.isConfirmed) {
              const updatedDetails = currentRows.map((item) => ({
                ...item,
                whouseCode: pickedWhCode,
                whouseName: pickedWhName,
                locCode: "",
                locName: "",
              }));
              detailRowsRef.current = updatedDetails;
              updateState({ detailRows: updatedDetails });
            }
          });
        }
      }
    }

    // Close Warehouse lookup immediately, before waiting for Swal response.
    updateState({
      warehouseLookupOpen: false,
      warehouseLookupRowIndex: null,
      selectedWH: "",
    });
  };

  const handleCloseLocationLookup = (selected) => {
    if (selected) {
      const pickedLocCode = selected.locCode || "";
      const pickedLocName = normalizeLookupName(
        pickedLocCode,
        selected.locName,
      );

      const rowIndex = state.locationLookupRowIndex;
      const isHeaderLookup = rowIndex === null || rowIndex === undefined;

      if (!isHeaderLookup) {
        const rows = [...(detailRowsRef.current || state.detailRows || [])];
        if (rows[rowIndex]) {
          rows[rowIndex] = {
            ...rows[rowIndex],
            locCode: pickedLocCode,
            locName: pickedLocName,
          };
          detailRowsRef.current = rows;
          updateState({ detailRows: rows });
        }
      } else {
        // Match FGRR: update header first, trigger confirmation without awaiting it,
        // then close the lookup modal immediately below.
        updateState({
          locCode: pickedLocCode,
          locName: pickedLocName,
        });

        const currentRows = detailRowsRef.current || state.detailRows || [];
        if (currentRows.length > 0) {
          useSwalProceedConfirm(
            "Apply to Details?",
            "Do you want to apply this Location to all detail items?",
            "Yes, update all",
            "No, header only",
          ).then((result) => {
            if (result.isConfirmed) {
              const updatedDetails = currentRows.map((item) => ({
                ...item,
                locCode: pickedLocCode,
                locName: pickedLocName,
              }));
              detailRowsRef.current = updatedDetails;
              updateState({ detailRows: updatedDetails });
            }
          });
        }
      }
    }

    // Close Location lookup immediately, before waiting for Swal response.
    updateState({
      locationLookupOpen: false,
      locationLookupRowIndex: null,
      selectedWH: "",
    });
  };

  const handleCloseCustomerModal = (selectedCustomer) => {
    if (selectedCustomer) {
      updateState({
        custCode:
          selectedCustomer.custCode ||
          selectedCustomer.customerCode ||
          selectedCustomer.slCode ||
          "",
        custName:
          selectedCustomer.custName ||
          selectedCustomer.customerName ||
          selectedCustomer.slName ||
          "",
      });
    }
    updateState({ showCustomerModal: false });
  };

  const handleOpenVELookup = (rowIndex = null) => {
    if (isFormDisabled) return;

    updateState({
      veLookupModalOpen: true,
      selectedRowIndex: rowIndex,
    });
  };

  const fetchVatRate = async (vatCode) => {
    if (!vatCode) return 0;
    try {
      const response = await fetchData(`/getVat?VAT_CODE=${encodeURIComponent(vatCode)}`);
      const rawResult = response?.data?.[0]?.result ?? response?.result ?? response?.data ?? response;
      const parsedResult = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
      const vatRow = Array.isArray(parsedResult) ? parsedResult[0] : parsedResult;
      return parseFormattedNumber(vatRow?.vatRate || 0);
    } catch (error) {
      console.warn("VESR: unable to load VAT rate", vatCode, error);
      return 0;
    }
  };

  const buildDirectVehicleRow = async (selectedItem = {}, baseRow = {}, vehicleMasterOverride) => {
    const itemCode = String(selectedItem.itemCode || "").trim();

    if (!itemCode) return null;

    const mast =
      vehicleMasterOverride !== undefined
        ? vehicleMasterOverride
        : await loadVehicleMasterInfo(itemCode);
    const selectedUnitCost = parseFormattedNumber(selectedItem.unitCost || 0);
    const currentRate = Math.max(parseFormattedNumber(state.currRate || 1), 0.000001);
    const currentCurrency = String(state.currCode || baseCurrency).toUpperCase();
    const itemName =
      selectedItem.itemName ||
      mast?.itemDesc ||
      mast?.itemName ||
      "";
    const uomCode =
      selectedItem.uomCode ||
      mast?.uom ||
      mast?.uomCode ||
      "";
    const categCode =
      selectedItem.categCode ||
      mast?.categoryCode ||
      mast?.categCode ||
      "";
    const selectedVatCode =
      selectedItem.vatCode ||
      baseRow.vatCode ||
      state.vatCode ||
      "";
    const selectedVatName =
      selectedItem.vatName ||
      baseRow.vatName ||
      state.vatName ||
      "";
    const lookupVatRate = parseFormattedNumber(
      selectedItem.vatRate ||
        baseRow.vatRate ||
        state.vatRate ||
        0,
    );
    const selectedVatRate = lookupVatRate || await fetchVatRate(selectedVatCode);

    return recalcVehicleRow({
      ...baseRow,
      groupId: baseRow.groupId || generateClientGroupId(),
      lnNo: "",
      itemCode,
      categCode,
      itemName,
      uomCode,
      quantity:
        parseFormattedNumber(baseRow.quantity || 0) > 0
          ? parseFormattedNumber(baseRow.quantity)
          : 1,
      balance: 0,
      unitCost: selectedUnitCost,
      unitCostFx:
        currentCurrency === baseCurrency
          ? selectedUnitCost
          : selectedUnitCost / currentRate,
      itemCost: 0,
      locCode: state.locCode || baseRow.locCode || "",
      vatCode: selectedVatCode,
      vatName: selectedVatName,
      vatRate: selectedVatRate,
      vatAmount: 0,
      poLineno: "",
      qstatCode: mast?.defaultQsCode || baseRow.qstatCode || "",
      make: mast?.vehicleMake || mast?.make || baseRow.make || "",

      // A Vehicle Master item may be reused, but the physical vehicle identity
      // must always start blank for a newly selected/direct-sales return unit.
      modelYear: "",
      model: "",
      serialNo: "",
      engineNo: "",
      prodNo: "",
      color: "",
      chassisNo: "",
      pnpNo: "",
      csrNo: "",

      currCode: state.currCode || baseCurrency,
      currRate: currentRate,
      fxAmount: 0,
      poQty: 0,
      specs: baseRow.specs || "",
      netAmount: 0,
      actCode: baseRow.actCode || "",
      actDesc: baseRow.actDesc || "",
      rcCode: baseRow.rcCode || baseRow.actCode || "",
      prLineno: "",
      shippingCost: parseFormattedNumber(baseRow.shippingCost || 0),
      landedCost: parseFormattedNumber(baseRow.landedCost || 0),
      unitShipCost: parseFormattedNumber(baseRow.unitShipCost || 0),
      unitLandedCost: parseFormattedNumber(baseRow.unitLandedCost || 0),
      poNo: "",
      prNo: "",
      whouseCode: state.whouseCode || baseRow.whouseCode || "",

      requireModel: mast?.requireModel || "N",
      requireSerial: mast?.requireSerial || "N",
      requireEngine: mast?.requireEngine || "N",
      requireColor: mast?.requireColor || "N",
      requireQsCode: mast?.requireQsCode || "N",
      requireProdNo: mast?.requireProdNo || "N",
    });
  };

  const handleCloseVELookup = async (selectedPayload) => {
    if (!selectedPayload) {
      updateState({ veLookupModalOpen: false, selectedRowIndex: null });
      return;
    }

    const selectedItems = Array.isArray(selectedPayload?.records)
      ? selectedPayload.records
      : Array.isArray(selectedPayload)
        ? selectedPayload
        : [selectedPayload];

    if (!selectedItems.length) {
      updateState({ veLookupModalOpen: false, selectedRowIndex: null });
      return;
    }

    const currentRows = [...(detailRowsRef.current || state.detailRows || [])];
    const rowIndex = state.selectedRowIndex;

    if (rowIndex !== null && rowIndex !== undefined) {
      const newRow = await buildDirectVehicleRow(
        selectedItems[0],
        currentRows[rowIndex] || {},
      );

      if (newRow) {
        currentRows[rowIndex] = newRow;
      }
    } else {
      for (const selectedItem of selectedItems) {
        const newRow = await buildDirectVehicleRow(selectedItem);
        if (newRow) currentRows.push(newRow);
      }
    }

    const renumberedRows = currentRows.map((row, index) => ({
      ...row,
      lnNo: index + 1,
    }));

    detailRowsRef.current = renumberedRows;
    detailRowsGLRef.current = [];

    updateState({
      detailRows: renumberedRows,
      detailRowsGL: [],
      veLookupModalOpen: false,
      selectedRowIndex: null,
    });
  };

  const handleAddRowClick = () => {
    if (isFormDisabled) return;

    handleOpenVELookup();
  };


  const getSingleUploadTemplateColumns = () =>
    getGlobalSingleUploadTemplateColumns(visibleDetailColumns);

  const singleUploadNumericKeys = new Set([
    "quantity",
    "unitCost",
    "itemCost",
  ]);

  const handleDownloadSingleUploadTemplate = async () => {
    await downloadGlobalSingleUploadTemplate({
      columns: getSingleUploadTemplateColumns(),
      rows: sortedDetailRows,
      fileName: "Vehicle Sales Return Single Transaction Uploading Template.xlsx",
      sheetName: "Vehicle Details",
      decimalColumnFormats: {
        quantity: state.decQty,
        unitCost: state.decUcost,
        itemCost: 2,
      },
      rightAlignedColumns: [
        "quantity",
        "unitCost",
        "itemCost",
      ],
      centerAlignedColumns: [
        "lnNo",
        "itemCode",
        "uomCode",
        "chassisNo",
        "modelYear",
        "serialNo",
        "engineNo",
        "prodNo",
        "color",
        "qstatCode",
        "pnpNo",
        "csrNo",
        "rcCode",
        "whouseCode",
        "locCode",
      ],
      getCellValue: ({ rowEntry, column }) => {
        const { row, originalIndex } = rowEntry;
        if (column.key === "lnNo") return originalIndex + 1;
        if (singleUploadNumericKeys.has(column.key)) {
          return parseFormattedNumber(row[column.key] || 0);
        }
        return String(row[column.key] ?? "");
      },
    });
  };

  const createEmptySingleUploadRow = () => ({
    lnNo: "",
    poNo: "",
    itemCode: "",
    itemName: "",
    specs: "",
    uomCode: "",
    balance: 0,
    quantity: 0,
    unitCost: 0,
    unitCostFx: 0,
    itemCost: 0,
    vatCode: "",
    vatRate: 0,
    vatAmount: 0,
    netAmount: 0,
    make: "",
    modelYear: "",
    model: "",
    serialNo: "",
    engineNo: "",
    prodNo: "",
    color: "",
    chassisNo: "",
    pnpNo: "",
    csrNo: "",
    rcCode: "",
    qstatCode: "",
    whouseCode: "",
    locCode: "",
  });

  const parseSingleUploadRow = ({ rawValuesByKey }) => {
    const rowData = createEmptySingleUploadRow();

    getSingleUploadTemplateColumns().forEach((column) => {
      const rawValue = rawValuesByKey[column.key]?.value;
      if (column.key === "lnNo") {
        rowData.lnNo = parseInt(rawValue || 0, 10) || "";
      } else if (singleUploadNumericKeys.has(column.key)) {
        rowData[column.key] = parseFormattedNumber(rawValue || 0) || 0;
      } else {
        rowData[column.key] = String(rawValue ?? "").trim();
      }
    });

    return rowData;
  };

  const normalizeDirectUploadHeader = (value) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

  const getDirectUploadHeaderKeyMap = () => {
    const headerKeyMap = new Map();

    // Current VESR02 template columns remain the primary aliases.
    getSingleUploadTemplateColumns().forEach((column) => {
      headerKeyMap.set(normalizeDirectUploadHeader(column.label), column.key);
    });

    // VESR01-only columns are intentionally accepted and ignored by the
    // direct-sales return business logic. This allows a PO-sales return template
    // to be reused when Tran Type is VESR02 without triggering a format error.
    headerKeyMap.set("PO NO.", "poNo");
    headerKeyMap.set("PO NO", "poNo");
    headerKeyMap.set("PO BALANCE", "balance");

    // Common alternate headings from manually prepared Excel files.
    [
      ["LINE NO", "lnNo"],
      ["LINE NO.", "lnNo"],
      ["ITEM NO", "itemCode"],
      ["ITEM NO.", "itemCode"],
      ["DESCRIPTION", "itemName"],
      ["ITEM DESCRIPTION", "itemName"],
      ["ITEM NAME", "itemName"],
      ["SPECS", "specs"],
      ["QUANTITY", "quantity"],
      ["QTY", "quantity"],
      ["UNIT COST", "unitCost"],
      ["AMOUNT", "itemCost"],
      ["VAT CODE", "vatCode"],
      ["QC STATUS", "qstatCode"],
      ["QS STATUS", "qstatCode"],
      ["QSTAT", "qstatCode"],
      ["WHOUSE", "whouseCode"],
      ["WAREHOUSE", "whouseCode"],
      ["WAREHOUSE CODE", "whouseCode"],
      ["LOCATION", "locCode"],
      ["LOCATION CODE", "locCode"],
      ["CHASSIS NO", "chassisNo"],
      ["CHASSIS NO.", "chassisNo"],
      ["CS NO", "chassisNo"],
      ["CS NO.", "chassisNo"],
      ["PNP CLEARANCE NO", "pnpNo"],
      ["PNP CLEARANCE NO.", "pnpNo"],
      ["CSR NO", "csrNo"],
      ["CSR NO.", "csrNo"],
      ["RC CODE", "rcCode"],
      ["PROD NO", "prodNo"],
      ["PROD NO.", "prodNo"],
      ["PRODUCTION NO", "prodNo"],
      ["PRODUCTION NO.", "prodNo"],
      ["MODEL YEAR", "modelYear"],
      ["MODEL (YEAR)", "modelYear"],
      ["SERIAL NO", "serialNo"],
      ["SERIAL NO.", "serialNo"],
      ["ENGINE NO", "engineNo"],
      ["ENGINE NO.", "engineNo"],
    ].forEach(([label, key]) => headerKeyMap.set(label, key));

    return headerKeyMap;
  };

  const handleDirectSalesReturnExcelFile = async (file) => {
    const lowerFileName = String(file?.name || "").toLowerCase();
    if (!lowerFileName.endsWith(".xlsx")) {
      return {
        ok: false,
        title: "Invalid File",
        errors: ["Please upload an Excel .xlsx file."],
      };
    }

    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets?.[0];

    if (!worksheet) {
      return {
        ok: false,
        title: "Invalid Excel File",
        errors: ["No worksheet found in the uploaded file."],
      };
    }

    const headerKeyMap = getDirectUploadHeaderKeyMap();
    const headerColumns = [];
    const recognizedKeys = new Set();
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      const headerText = normalizeDirectUploadHeader(getSingleUploadExcelCellValue(cell));
      const key = headerKeyMap.get(headerText);
      if (!key) return; // VESR02 intentionally ignores unrelated/extra columns.

      headerColumns.push({ columnNumber, key });
      recognizedKeys.add(key);
    });

    if (!recognizedKeys.has("itemCode")) {
      return {
        ok: false,
        title: "Upload Error",
        errors: ["Item Code column was not found in the Excel file."],
      };
    }

    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData = createEmptySingleUploadRow();
      let hasValue = false;

      headerColumns.forEach(({ columnNumber, key }) => {
        const rawValue = getSingleUploadExcelCellValue(excelRow.getCell(columnNumber));
        if (String(rawValue ?? "").trim() !== "") hasValue = true;

        if (key === "lnNo") {
          rowData.lnNo = parseInt(rawValue || 0, 10) || "";
        } else if (singleUploadNumericKeys.has(key)) {
          rowData[key] = parseFormattedNumber(rawValue || 0) || 0;
        } else {
          rowData[key] = String(rawValue ?? "").trim();
        }
      });

      if (hasValue) rows.push(rowData);
    });

    if (!rows.length) {
      return {
        ok: false,
        title: "No Records Found",
        errors: ["The uploaded Excel file has no detail rows."],
      };
    }

    return {
      ok: true,
      rows,
      validationResult: { rows, errorCount: 0, errors: [] },
    };
  };

  const getUploadedDetailErrors = (rows) => {
    const errors = [];
    const chassisSeen = new Map();

    rows.forEach((row, index) => {
      const ln = row.lnNo || index + 1;
      const itemCode = String(row.itemCode || "").trim();
      const qty = parseFormattedNumber(row.quantity || 0);
      const balance = parseFormattedNumber(row.balance || 0);
      const chassis = String(row.chassisNo || "").trim().toUpperCase();
      const modelYear = String(row.modelYear || "").trim();

      if (!itemCode) errors.push(`Line ${ln} - Item Code Required`);
      if (qty <= 0) errors.push(`Line ${ln} - Quantity must be greater than zero`);
      if (!isDirectSalesReturn && balance > 0 && qty > balance + 0.000001) {
        errors.push(`Line ${ln} - Quantity exceeds PO Balance ${formatNumber(balance, state.decQty)}`);
      }
      if (!String(row.vatCode || "").trim()) errors.push(`Line ${ln} - VAT Code Required`);
      if (!String(row.locCode || "").trim()) errors.push(`Line ${ln} - Location Required`);
      if (!chassis) errors.push(`Line ${ln} - Chassis / CS No. Required`);

      if (chassis) {
        if (chassisSeen.has(chassis)) {
          errors.push(`Line ${ln} - Duplicate Chassis / CS No. ${chassis}`);
        } else {
          chassisSeen.set(chassis, ln);
        }
      }

      if (String(row.requireModel || "N").toUpperCase() === "Y") {
        if (!String(row.model || "").trim()) errors.push(`Line ${ln} - Model Required`);
        if (!String(row.modelYear || "").trim()) errors.push(`Line ${ln} - Model Year Required`);
      }
      if (modelYear && !isValidModelYear(modelYear)) {
        errors.push(`Line ${ln} - Model Year must be a 4-digit year from ${MODEL_YEAR_MIN} to ${getMaximumModelYear()}`);
      }
      if (String(row.requireSerial || "N").toUpperCase() === "Y" && !String(row.serialNo || "").trim()) {
        errors.push(`Line ${ln} - Serial No. Required`);
      }
      if (String(row.requireEngine || "N").toUpperCase() === "Y" && !String(row.engineNo || "").trim()) {
        errors.push(`Line ${ln} - Engine No. Required`);
      }
      if (String(row.requireProdNo || "N").toUpperCase() === "Y" && !String(row.prodNo || "").trim()) {
        errors.push(`Line ${ln} - Production No. Required`);
      }
      if (String(row.requireColor || "N").toUpperCase() === "Y" && !String(row.color || "").trim()) {
        errors.push(`Line ${ln} - Color Required`);
      }
      if (String(row.requireQsCode || "N").toUpperCase() === "Y" && !String(row.qstatCode || "").trim()) {
        errors.push(`Line ${ln} - QS Status Required`);
      }
    });

    return errors;
  };

  const buildDirectUploadedRows = async (uploadedRows) => {
    const finalRows = [];
    const errors = [];
    const vehicleMasterCache = new Map();

    for (let index = 0; index < uploadedRows.length; index += 1) {
      const uploaded = uploadedRows[index];
      const lineNo = uploaded.lnNo || index + 1;
      const itemCode = String(uploaded.itemCode || "").trim();

      if (!itemCode) {
        finalRows.push({ ...uploaded, lnNo: index + 1 });
        continue;
      }

      // VESR02 upload is allowed to use a flexible Excel layout, but every
      // uploaded Item Code must still be a valid Vehicle Master item.
      // Cache by Item Code so repeated physical units only hit the API once.
      const cacheKey = itemCode.toUpperCase();
      let mast = vehicleMasterCache.get(cacheKey);
      if (mast === undefined) {
        mast = await loadVehicleMasterInfo(itemCode);
        vehicleMasterCache.set(cacheKey, mast || null);
      }
      if (!mast) {
        errors.push(`Line ${lineNo} - Item Code ${itemCode} was not found in Vehicle Master.`);
        continue;
      }

      const masterRow = await buildDirectVehicleRow(
        {
          itemCode,
          itemName: uploaded.itemName,
          uomCode: uploaded.uomCode,
          unitCost: uploaded.unitCost,
          vatCode: uploaded.vatCode,
          vatRate: uploaded.vatRate,
        },
        {
          ...uploaded,
          quantity: parseFormattedNumber(uploaded.quantity || 0) || 1,
          whouseCode: uploaded.whouseCode || state.whouseCode || "",
          locCode: uploaded.locCode || state.locCode || "",
        },
        mast,
      );

      if (!masterRow) {
        errors.push(`Line ${lineNo} - Unable to load Vehicle Master defaults for ${itemCode}.`);
        continue;
      }

      const finalRow = recalcVehicleRow({
        ...masterRow,
        specs: uploaded.specs || masterRow.specs || "",
        quantity: parseFormattedNumber(uploaded.quantity || 0) || 1,
        unitCost: parseFormattedNumber(uploaded.unitCost || 0),
        unitCostFx: parseFormattedNumber(uploaded.unitCostFx || 0),
        vatCode: uploaded.vatCode || masterRow.vatCode || "",
        vatRate: parseFormattedNumber(uploaded.vatRate || masterRow.vatRate || 0),
        make: uploaded.make || masterRow.make || "",
        modelYear: uploaded.modelYear || "",
        model: uploaded.model || "",
        serialNo: uploaded.serialNo || "",
        engineNo: uploaded.engineNo || "",
        prodNo: uploaded.prodNo || "",
        color: uploaded.color || "",
        chassisNo: uploaded.chassisNo || "",
        pnpNo: uploaded.pnpNo || "",
        csrNo: uploaded.csrNo || "",
        rcCode: uploaded.rcCode || masterRow.rcCode || masterRow.actCode || "",
        qstatCode: uploaded.qstatCode || masterRow.qstatCode || "",
        whouseCode: uploaded.whouseCode || state.whouseCode || masterRow.whouseCode || "",
        locCode: uploaded.locCode || state.locCode || masterRow.locCode || "",
        groupId: masterRow.groupId || generateClientGroupId(),
        lnNo: index + 1,
      });

      finalRows.push(finalRow);
    }

    return { rows: finalRows, errors };
  };

  const buildPOUploadedRows = (uploadedRows) => {
    const existingRows = detailRowsRef.current || state.detailRows || [];
    const errors = [];

    if (existingRows.length === 0) {
      return {
        errors: ["For PO-based Sales Return, select the source details first before uploading the completed template."],
        rows: [],
      };
    }

    if (uploadedRows.length !== existingRows.length) {
      return {
        errors: [
          `Uploaded row count (${uploadedRows.length}) must match the currently loaded source detail row count (${existingRows.length}).`,
          "Download the template after selecting the PO, then update that same file.",
        ],
        rows: [],
      };
    }

    const finalRowsByLine = new Array(existingRows.length);

    uploadedRows.forEach((uploaded, uploadIndex) => {
      const uploadedLine = parseInt(uploaded.lnNo || 0, 10);
      const sourceIndex =
        uploadedLine >= 1 && uploadedLine <= existingRows.length
          ? uploadedLine - 1
          : uploadIndex;
      const source = existingRows[sourceIndex] || {};

      if (!source || !source.itemCode) {
        errors.push(`Line ${uploadedLine || uploadIndex + 1} - Unable to match the uploaded row to the loaded source detail.`);
        return;
      }

      if (finalRowsByLine[sourceIndex]) {
        errors.push(`Line ${uploadedLine || uploadIndex + 1} - Duplicate LN in the uploaded template.`);
        return;
      }

      const uploadedItem = String(uploaded.itemCode || "").trim().toUpperCase();
      const sourceItem = String(source.itemCode || "").trim().toUpperCase();
      const uploadedPo = String(uploaded.poNo || "").trim().toUpperCase();
      const sourcePo = String(source.poNo || state.poNo || "").trim().toUpperCase();

      if (uploadedItem && sourceItem && uploadedItem !== sourceItem) {
        errors.push(`Line ${uploadedLine || uploadIndex + 1} - Item Code cannot be changed from ${source.itemCode}.`);
      }
      if (uploadedPo && sourcePo && uploadedPo !== sourcePo) {
        errors.push(`Line ${uploadedLine || uploadIndex + 1} - PO No. cannot be changed from ${source.poNo || state.poNo}.`);
      }

      finalRowsByLine[sourceIndex] = recalcVehicleRow({
        ...source,
        ...uploaded,
        lnNo: sourceIndex + 1,
        groupId: source.groupId || "",
        itemCode: source.itemCode || uploaded.itemCode || "",
        categCode: source.categCode || "",
        itemName: source.itemName || uploaded.itemName || "",
        uomCode: source.uomCode || uploaded.uomCode || "",
        balance: parseFormattedNumber(source.balance || 0),
        poQty: parseFormattedNumber(source.poQty || 0),
        poNo: source.poNo || state.poNo || "",
        prNo: source.prNo || state.prNo || "",
        poln: source.poln || source.poLineno || "",
        poLineno: source.poLineno || source.poln || "",
        prln: source.prln || source.prLineno || "",
        prLineno: source.prLineno || source.prln || "",
        requireModel: source.requireModel || "N",
        requireSerial: source.requireSerial || "N",
        requireEngine: source.requireEngine || "N",
        requireColor: source.requireColor || "N",
        requireQsCode: source.requireQsCode || "N",
        requireProdNo: source.requireProdNo || "N",
        rcCode: uploaded.rcCode || source.rcCode || source.actCode || "",
        currCode: source.currCode || state.currCode || baseCurrency,
        currRate: parseFormattedNumber(source.currRate || state.currRate || 1),
        whouseCode: uploaded.whouseCode || source.whouseCode || state.whouseCode || "",
        locCode: uploaded.locCode || source.locCode || state.locCode || "",
      });
    });

    if (finalRowsByLine.some((row) => !row)) {
      errors.push("One or more loaded source detail lines are missing from the uploaded template.");
    }

    return { errors, rows: finalRowsByLine.filter(Boolean) };
  };

  const handleUploadExcelFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isFormDisabled) return;

    updateState({ isLoading: true, showSpinner: true });

    try {
      const uploadResult = isDirectSalesReturn
        ? await handleDirectSalesReturnExcelFile(file)
        : await handleSingleUploadExcelFile({
            file,
            columns: getSingleUploadTemplateColumns(),
            createEmptyRow: createEmptySingleUploadRow,
            parseRow: parseSingleUploadRow,
            validateRows: async (uploadedRows) => ({
              errorCount: 0,
              errors: [],
              rows: uploadedRows,
            }),
          });

      if (uploadResult?.cancelled) return;

      if (!uploadResult?.ok) {
        showSingleUploadErrorList(
          uploadResult?.title || "Upload Error",
          uploadResult?.errors || [],
        );
        return;
      }

      const uploadedRows =
        uploadResult?.validationResult?.rows ||
        uploadResult?.rows ||
        [];

      if (!uploadedRows.length) {
        showSingleUploadErrorList("Upload Error", ["No detail rows were found in the Excel file."]);
        return;
      }

      let finalRows = [];
      let mappingErrors = [];

      if (isDirectSalesReturn) {
        const directUpload = await buildDirectUploadedRows(uploadedRows);
        finalRows = directUpload.rows;
        mappingErrors = directUpload.errors;
      } else {
        const poUpload = buildPOUploadedRows(uploadedRows);
        finalRows = poUpload.rows;
        mappingErrors = poUpload.errors;
      }

      if (mappingErrors.length > 0) {
        showSingleUploadErrorList("Upload Rejected", mappingErrors);
        return;
      }

      const validationErrors = getUploadedDetailErrors(finalRows);
      if (validationErrors.length > 0) {
        showSingleUploadErrorList("Upload Rejected", validationErrors);
        return;
      }

      const renumberedRows = finalRows.map((row, index) => ({
        ...row,
        lnNo: index + 1,
      }));

      detailRowsRef.current = renumberedRows;
      detailRowsGLRef.current = [];
      updateState({
        detailRows: renumberedRows,
        detailRowsGL: [],
      });

      useSwalSuccessAlert(
        "Upload Completed",
        `${renumberedRows.length} vehicle row(s) uploaded successfully.`,
      );
    } catch (error) {
      console.error("VESR upload transaction error:", error);
      showSingleUploadErrorList(
        "Upload Error",
        [error?.message || "Unable to process the uploaded Excel file."],
      );
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const handleUploadSingleTransaction = () => {
    if (isFormDisabled) return;

    if (!isDirectSalesReturn && !(detailRowsRef.current || state.detailRows || []).length) {
      useSwalInfoAlert(
        "Select PO Details First",
        "For PO-based Sales Return, select the source detail rows first, download the template, complete the vehicle information, then upload the same template.",
      );
      return;
    }

    uploadInputRef.current?.click();
  };

  const handleCopyVehicleDetailRow = (index) => {
    if (isFormDisabled || !isDirectSalesReturn) return;

    const rows = [...(detailRowsRef.current || state.detailRows || [])];
    const sourceRow = rows[index];
    if (!sourceRow) return;

    // Copy reusable sales return/item data only.
    // Each physical vehicle must have its own unique identity information.
    const copiedRow = recalcVehicleRow({
      ...sourceRow,
      groupId: generateClientGroupId(),
      lnNo: "",
      modelYear: "",
      model: "",
      serialNo: "",
      engineNo: "",
      prodNo: "",
      color: "",
      chassisNo: "",
      pnpNo: "",
      csrNo: "",
    });

    rows.splice(index + 1, 0, copiedRow);

    const renumberedRows = rows.map((row, rowIndex) => ({
      ...row,
      lnNo: rowIndex + 1,
    }));

    detailRowsRef.current = renumberedRows;
    detailRowsGLRef.current = [];
    updateState({
      detailRows: renumberedRows,
      detailRowsGL: [],
    });
  };

  const handleInsertBlankVehicleDetailRow = (index) => {
    if (isFormDisabled || !isDirectSalesReturn) return;

    const rows = [...(detailRowsRef.current || state.detailRows || [])];
    const sourceRow = rows[index] || {};

    const blankRow = recalcVehicleRow({
      lnNo: "",
      groupId: generateClientGroupId(),
      itemCode: "",
      categCode: "",
      itemName: "",
      uomCode: "",
      quantity: 0,
      balance: 0,
      unitCost: 0,
      unitCostFx: 0,
      itemCost: 0,
      locCode: state.locCode || sourceRow.locCode || "",
      vatCode: "",
      vatRate: 0,
      vatAmount: 0,
      poLineno: "",
      qstatCode: "",
      make: "",
      modelYear: "",
      model: "",
      serialNo: "",
      engineNo: "",
      prodNo: "",
      color: "",
      chassisNo: "",
      currCode: state.currCode || baseCurrency,
      currRate: parseFormattedNumber(state.currRate || 1),
      fxAmount: 0,
      poQty: 0,
      specs: "",
      netAmount: 0,
      actCode: "",
      actDesc: "",
      rcCode: "",
      prLineno: "",
      shippingCost: 0,
      landedCost: 0,
      unitShipCost: 0,
      unitLandedCost: 0,
      pnpNo: "",
      csrNo: "",
      poNo: "",
      prNo: "",
      whouseCode: state.whouseCode || sourceRow.whouseCode || "",
    });

    rows.splice(index + 1, 0, blankRow);

    const renumberedRows = rows.map((row, rowIndex) => ({
      ...row,
      lnNo: rowIndex + 1,
    }));

    detailRowsRef.current = renumberedRows;
    detailRowsGLRef.current = [];
    updateState({
      detailRows: renumberedRows,
      detailRowsGL: [],
    });
  };

  const handleInsertVehicleDetailRowClick = async (index) => {
    if (isFormDisabled || !isDirectSalesReturn) return;

    const result = await useSwalProceedConfirm(
      "Insert Detail Row",
      "Do you want to copy the selected record or insert a new record?",
      "Copy Record",
      "Insert New Record",
    );

    if (result.isConfirmed) {
      handleCopyVehicleDetailRow(index);
      return;
    }

    if (result.dismiss === Swal.DismissReason.cancel) {
      handleInsertBlankVehicleDetailRow(index);
    }
  };

  const handleDeleteDetailRow = (index) => {
    if (isFormDisabled) return;
    const rows = (state.detailRows || [])
      .filter((_, rowIndex) => rowIndex !== index)
      .map((row, rowIndex) => ({ ...row, lnNo: rowIndex + 1 }));
    updateState({ detailRows: rows });
  };

  // VE PO lookup columns use the exact camelCase aliases returned by
  // GetVEPORR_OpenSummary / GetVEPORR_OpenDetail.
  const openPOColumns = [
    { key: "branchCode", label: "Branch", renderType: "text", width: 80 },
    { key: "poNo", label: "PO No", renderType: "text", width: 130 },
    { key: "poDate", label: "PO Date", renderType: "date", width: 120 },
    { key: "vendCode", label: "Payee Code", renderType: "text", width: 120 },
    { key: "vendName", label: "Payee Name", renderType: "text", width: 220 },
    { key: "currCode", label: "Currency", renderType: "text", width: 90 },
    { key: "whCode", label: "Warehouse", renderType: "text", width: 100 },
    { key: "whName", label: "Warehouse Name", renderType: "text", width: 180 },
    { key: "remarks", label: "Remarks", renderType: "text", width: 260 },
  ];

  const openPODetailColumns = [
    { key: "poNo", label: "PO No", renderType: "text", width: 130 },
    { key: "ln", label: "LN", renderType: "number", width: 60 },
    { key: "itemCode", label: "Item Code", renderType: "text", width: 120 },
    { key: "itemName", label: "Item Name", renderType: "text", width: 240 },
    { key: "itemSpecs", label: "Specification", renderType: "text", width: 260 },
    { key: "uomCode", label: "UOM", renderType: "text", width: 80 },
    { key: "poQuantity", label: "PO Qty", renderType: "number", width: 100 },
    { key: "rrQty", label: "RR Qty", renderType: "number", width: 100 },
    { key: "qtyBalance", label: "PO Balance", renderType: "number", width: 110 },
    { key: "unitCost", label: "Unit Cost", renderType: "number", width: 110 },
    { key: "vatCode", label: "VAT", renderType: "text", width: 90 },
    { key: "rcCode", label: "RC Code", renderType: "text", width: 100 },
    { key: "rcName", label: "RC Name", renderType: "text", width: 160 },
    { key: "delDate", label: "Del Date", renderType: "date", width: 120 },
  ];

  const handleOpenPayeeLookup = async () => {
    if (isFormDisabled || (state.detailRows || []).length > 0) return;

    // Match FGRR behavior for regular sales return: do not display an empty
    // Payee modal. VESR01 payees are only those with an open Vehicle PO.
    if (!isDirectSalesReturn) {
      updateState({ isLoading: true, payeeLookupOpen: false });

      try {
        const response = await fetchDataJson("getVEPORR_OpenSummary", {
          branchCode: state.branchCode,
        });

        const availablePayees = extractRows(
          response?.data?.[0]?.result ?? response?.data ?? response,
        ).filter((row) =>
          String(row.vendCode || "").trim(),
        );

        if (!availablePayees.length) {
          useSwalErrorAlert(
            "No Records Found",
            "There are no available payees with an open Vehicle Purchase Order.",
          );
          return;
        }
      } catch (error) {
        console.error("VESR Payee lookup availability error:", error);
        useSwalErrorAlert(
          "Payee Lookup",
          error?.message || "Unable to check available payees.",
        );
        return;
      } finally {
        updateState({ isLoading: false });
      }
    }

    updateState({ payeeLookupOpen: true });
  };

  const handleOpenPOOpenLookup = async (payeeOverride = null) => {
    if (isFormDisabled) return;

    const selectedPayeeCode = String(
      payeeOverride?.vendCode || state.vendCode || "",
    ).trim().toUpperCase();

    if (!selectedPayeeCode) {
      await handleOpenPayeeLookup();
      return;
    }

    updateState({ isLoading: true });

    try {
      const response = await fetchDataJson("getVEPORR_OpenSummary", {
        branchCode: state.branchCode,
      });

      const summaryRows = extractRows(
        response?.data?.[0]?.result ?? response?.data ?? response,
      ).filter(
        (row) =>
          String(row?.vendCode || "").trim().toUpperCase() === selectedPayeeCode,
      );

      if (!summaryRows.length) {
        useSwalErrorAlert(
          "Open Purchase Order",
          "No open Vehicle Purchase Order found for the selected payee.",
        );
        updateState({
          openPODataSummary: [],
          openPORRColSummary: [],
          openPORRColDetail: [],
          poLookupModalOpen: false,
        });
        return;
      }

      let summaryColumns = [];
      let detailColumns = [];

      try {
        [summaryColumns, detailColumns] = await Promise.all([
          getSelectedHSColConfig("getVEPORR_OpenSummary"),
          getSelectedHSColConfig("getVEPORR_OpenDetail"),
        ]);
      } catch (columnError) {
        console.warn("VESR: unable to load VE PO column configuration", columnError);
      }

      updateState({
        openPODataSummary: summaryRows,
        openPORRColSummary:
          Array.isArray(summaryColumns) && summaryColumns.length
            ? summaryColumns
            : openPOColumns,
        openPORRColDetail:
          Array.isArray(detailColumns) && detailColumns.length
            ? detailColumns
            : openPODetailColumns,
        poLookupModalOpen: true,
      });
    } catch (error) {
      console.error("VESR open PO error", error);
      useSwalErrorAlert(
        "Open Purchase Order",
        error?.message || "Unable to load open Vehicle PO.",
      );
      updateState({
        openPODataSummary: [],
        openPORRColSummary: [],
        openPORRColDetail: [],
        poLookupModalOpen: false,
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleClosePO = async (selection) => {
    if (!selection?.details?.length) {
      updateState({
        poLookupModalOpen: false,
        openPODataSummary: [],
        openPORRColSummary: [],
        openPORRColDetail: [],
      });
      return;
    }

    updateState({
      isLoading: true,
      poLookupModalOpen: false,
      openPODataSummary: [],
      openPORRColSummary: [],
      openPORRColDetail: [],
    });

    try {
      const summaries = Array.isArray(selection.summary) ? selection.summary : [];
      const summary = summaries[0] || {};
      const details = selection.details || [];

      const selectedPoNos = [
        ...new Set(
          [...summaries, ...details]
            .map((row) => row?.poNo)
            .filter(Boolean),
        ),
      ];

      const poNo = selectedPoNos.join(", ") || details[0]?.poNo || "";
      const selectedCurrCode = String(
        summary?.currCode || details[0]?.currCode || state.currCode || baseCurrency,
      ).toUpperCase();
      const selectedCurrRate =
        parseFormattedNumber(summary?.currRate || state.currRate || 1) || 1;
      const currencyRow = await useTopCurrencyRow(selectedCurrCode);

      /*
        JSX-ONLY AUTO BREAKDOWN ON PO SELECTION
        ----------------------------------------
        The stored procedure returns ONE selected source detail row with qtyBalance.
        VESR.jsx expands that row here, immediately after the user confirms the
        GlobalCombinedLookup selection. No per-vehicle row expansion is done in SQL.

        Vehicle Sales Return rule:
        one physical vehicle = one VESR detail row.

        Example: selected source detail qtyBalance = 5
        Row 1 -> quantity 1 / PO balance 5
        Row 2 -> quantity 1 / PO balance 4
        Row 3 -> quantity 1 / PO balance 3
        Row 4 -> quantity 1 / PO balance 2
        Row 5 -> quantity 1 / PO balance 1
      */
      // source detail rows do not always include VAT rate. Resolve it once per VAT code
      // before exploding quantity so every physical vehicle row receives the same
      // valid VAT code/rate and recalcVehicleRow can compute VAT Amount / Net Amount.
      const vatRateCache = new Map();
      const resolveExplosionVatRate = async (vatCode, explicitRate) => {
        const normalizedVatCode = String(vatCode || "").trim().toUpperCase();
        const hasExplicitRate =
          explicitRate !== undefined &&
          explicitRate !== null &&
          String(explicitRate).trim() !== "";
        const parsedExplicitRate = hasExplicitRate ? parseFormattedNumber(explicitRate) : 0;

        // A positive rate from PO/header is already usable. A zero rate can also
        // simply mean the rate was not supplied, so when a VAT code exists we
        // confirm it against VAT Master. Genuine zero-rated/non-VAT codes will
        // still resolve back to 0 from VAT Master.
        if (parsedExplicitRate > 0) return parsedExplicitRate;
        if (!normalizedVatCode) return parsedExplicitRate;
        if (vatRateCache.has(normalizedVatCode)) return vatRateCache.get(normalizedVatCode);

        const resolvedRate = await fetchVatRate(normalizedVatCode);
        vatRateCache.set(normalizedVatCode, resolvedRate);
        return resolvedRate;
      };

      const expandedRowGroups = await Promise.all(
        details.map(async (row, detailIndex) => {
          const itemCode = row?.itemCode || "";
          const mast = itemCode ? await loadVehicleMasterInfo(itemCode) : null;
          const unitCost = parseFormattedNumber(row?.unitCost || 0);
          const poQuantity = parseFormattedNumber(row?.poQuantity || 0);
          const qtyBalance = parseFormattedNumber(row?.qtyBalance || 0);
          const rowCurrCode = String(row?.currCode || selectedCurrCode).toUpperCase();

          const rowVatCode = String(
            row.vatCode ||
              summary.vatCode ||
              state.vatCode ||
              "",
          ).trim();
          const rowVatRateValue = row.vatRate;
          const summaryVatRateValue = summary.vatRate;
          const explicitVatRate =
            rowVatRateValue !== ""
              ? rowVatRateValue
              : summaryVatRateValue !== ""
                ? summaryVatRateValue
                : state.vatRate;
          const resolvedVatRate = await resolveExplosionVatRate(rowVatCode, explicitVatRate);

          // qtyBalance comes from the single source detail returned by the API/SP.
          // This JSX value controls how many one-vehicle VESR rows are created.
          const unitCount = Math.max(0, Math.trunc(qtyBalance));
          if (unitCount <= 0) return [];

          return Array.from({ length: unitCount }, (_, unitIndex) => {
            const runningPoBalance = unitCount - unitIndex;

            return recalcVehicleRow({
              groupId: row?.groupId || "",
              poId: row?.poId || "",
              lnNo: "",
              poNo: row?.poNo || poNo,
              poLineno: row?.ln || detailIndex + 1,
              prId: row?.prId || "",
              prNo: row?.prNo || "",
              prLineno: row?.prLineno || "",
              itemCode,
              itemName: row?.itemName || mast?.itemDesc || mast?.itemName || "",
              categCode: row?.categCode || mast?.categoryCode || mast?.categCode || "",
              uomCode: row?.uomCode || mast?.uomCode || "UNIT",
              poQty: poQuantity,
              balance: runningPoBalance,
              quantity: 1,
              unitCost,
              unitCostFx:
                rowCurrCode === baseCurrency
                  ? unitCost
                  : unitCost / Math.max(selectedCurrRate, 0.000001),
              currCode: rowCurrCode,
              currRate: selectedCurrRate,
              vatCode: rowVatCode,
              vatRate: resolvedVatRate,
              qstatCode: mast?.defaultQsCode || "",
              whouseCode: summary?.whCode || state.whouseCode || "",
              locCode: state.locCode || "",
              make: mast?.vehicleMake || mast?.make || "",

              // Unique vehicle fields are entered per physical vehicle.
              // groupId above remains the original PO_DT1.group_id for every broken-down unit.
              modelYear: "",
              model: "",
              serialNo: "",
              engineNo: "",
              prodNo: "",
              color: "",
              chassisNo: "",
              pnpNo: "",
              csrNo: "",

              specs: row?.itemSpecs || "",
              actCode: row?.rcCode || "",
              rcCode: row?.rcCode || "",
              actDesc: row?.rcName || "",
              shippingCost: 0,
              landedCost: 0,
              unitShipCost: 0,
              unitLandedCost: 0,
              requireModel: mast?.requireModel || "N",
              requireSerial: mast?.requireSerial || "N",
              requireEngine: mast?.requireEngine || "N",
              requireColor: mast?.requireColor || "N",
              requireQsCode: mast?.requireQsCode || "N",
              requireProdNo: mast?.requireProdNo || "N",
            });
          });
        }),
      );

      const mappedRows = expandedRowGroups
        .flat()
        .map((row, index) =>
          recalcVehicleRow({
            ...row,
            lnNo: index + 1,
            quantity: 1,
          }),
        );

      updateState({
        vendCode: summary?.vendCode || state.vendCode,
        vendName: summary?.vendName || state.vendName,
        poNo,
        poDate: summary?.poDate || "",
        currCode: selectedCurrCode,
        currName:
          currencyRow?.currName || selectedCurrCode,
        currRate: formatNumber(selectedCurrRate, 6),
        whouseCode: summary?.whCode || state.whouseCode,
        whouseName: summary?.whName || state.whouseName,
        detailRows: mappedRows,
        detailRowsGL: [],
        isDocNoDisabled: true,
      });

      detailRowsRef.current = mappedRows;
      detailRowsGLRef.current = [];
    } catch (error) {
      console.error("VESR PO selection error", error);
      useSwalErrorAlert(
        "Vehicle PO",
        error?.message || "Unable to load selected source details.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const mapGLRowsForSave = (rows = []) =>
    rows.map((row, index) => ({
      recNo: String(index + 1).padStart(3, "0"),
      acctCode: row.acctCode || "",
      actCode: row.actCode || "",
      sltypeCode: row.sltypeCode || "",
      slCode: row.slCode || "",
      particular: row.particular || "",
      vatCode: row.vatCode || "",
      vatDesc: row.vatDesc || "",
      ewtCode: row.ewtCode || "",
      ewtDesc: row.ewtDesc || "",
      debit: parseFormattedNumber(row.debit || 0),
      credit: parseFormattedNumber(row.credit || 0),
      remarks: row.remarks || "",
      slrefNo: row.slrefNo || "",
      slRefDate: row.slRefDate || null,
      vendCode: row.vendCode || state.vendCode || "",
      debitFx1: parseFormattedNumber(row.debitFx1 || 0),
      creditFx1: parseFormattedNumber(row.creditFx1 || 0),
      debitFx2: parseFormattedNumber(row.debitFx2 || 0),
      creditFx2: parseFormattedNumber(row.creditFx2 || 0),
    }));

  const buildTransactionPayload = (glRows = state.detailRowsGL) => ({
    branchCode: state.branchCode,
    srNo: state.documentNo || "",
    vesrId: state.documentID || "",
    srDate: header.sr_date,
    cutoffCode: state.cutoffCode || "",
    vesrTranType: state.vesrTranType || getRegularVESRTranType(state.vesrTranTypes),
    whouseCode: state.whouseCode || "",
    locCode: state.locCode || "",
    vendCode: state.vendCode || "",
    vendName: state.vendName || "",
    custCode: state.custCode || "",
    custName: state.custName || "",
    poNo: state.poNo || "",
    poDate: state.poDate || null,
    prNo: state.prNo || "",
    drNo: state.drNo || "",
    refVsiNo: state.refVsiNo || "",
    refCmNo: state.refCmNo || "",
    siNo: state.siNo || "",
    siDate: state.siNo ? state.siDate || null : null,
    vatCode: state.vatCode || "",
    rrAmount: totals.amount,
    rrVat: totals.vat,
    apvNo: state.apvNo || "",
    particular: state.particular || "",
    currCode: state.currCode || baseCurrency,
    currRate: parseFormattedNumber(state.currRate || 1),
    userCode: user?.USER_CODE || user?.userCode || "NSI",
    dt1: (state.detailRows || []).map((row, index) => ({
      lnNo: index + 1,
      groupId: row.groupId || "",
      itemCode: row.itemCode || "",
      categCode: row.categCode || "",
      itemName: row.itemName || "",
      uomCode: row.uomCode || "",
      quantity: parseFormattedNumber(row.quantity || 0),
      balance: parseFormattedNumber(row.balance || 0),
      unitCost: parseFormattedNumber(row.unitCost || 0),
      unitCostFx: parseFormattedNumber(row.unitCostFx || 0),
      itemCost: parseFormattedNumber(row.itemCost || 0),
      locCode: row.locCode || state.locCode || "",
      vatCode: row.vatCode || "",
      vatRate: parseFormattedNumber(row.vatRate || 0),
      vatAmount: parseFormattedNumber(row.vatAmount || 0),
      // Latest sproc Upsert expects $.poln.
      poln: row.poln || row.poLineno || "",
      qstatCode: row.qstatCode || "",
      make: row.make || "",
      modelYear: row.modelYear || "",
      model: row.model || "",
      serialNo: row.serialNo || "",
      engineNo: row.engineNo || "",
      prodNo: row.prodNo || "",
      color: row.color || "",
      chassisNo: row.chassisNo || "",
      currCode: row.currCode || state.currCode || baseCurrency,
      currRate: parseFormattedNumber(row.currRate || state.currRate || 1),
      fxAmount: parseFormattedNumber(row.fxAmount || 0),
      poQty: parseFormattedNumber(row.poQty || 0),
      specs: row.specs || "",
      netAmount: parseFormattedNumber(row.netAmount || 0),
      actCode: row.actCode || "",
      actDesc: row.actDesc || "",
      // Latest sproc Upsert expects $.prln.
      prln: row.prln || row.prLineno || "",
      shippingCost: parseFormattedNumber(row.shippingCost || 0),
      landedCost: parseFormattedNumber(row.landedCost || 0),
      unitShipCost: parseFormattedNumber(row.unitShipCost || 0),
      unitLandedCost: parseFormattedNumber(row.unitLandedCost || 0),
      pnpNo: row.pnpNo || "",
      csrNo: row.csrNo || "",
      rcCode: row.rcCode || row.actCode || "",
      poNo: row.poNo || state.poNo || "",
      prNo: row.prNo || state.prNo || "",
      whouseCode: row.whouseCode || state.whouseCode || "",
    })),
    dt2: mapGLRowsForSave(glRows),
  });

  const handleActivityOption = async (action) => {
    if (isFormDisabled) return;
    if (!validateDetails()) return;
    updateState({ isLoading: true });

    try {
      let glRowsForSave = state.detailRowsGL || [];
      const basePayload = buildTransactionPayload([]);

      if (action === "GenerateGL" || (action === "Upsert" && isGeneralLedgerEnabled)) {
        const generated = await useGenerateGLEntries(docType, {
          ...basePayload,
          dt2: [],
        });
        if (Array.isArray(generated) && generated.length > 0) {
          glRowsForSave = generated;
          updateState({ detailRowsGL: generated });
        } else if (isGeneralLedgerEnabled) {
          useSwalErrorAlert(
            "General Ledger",
            "No GL entries were generated. Please check Vehicle Category account setup.",
          );
          return;
        }
      }

      if (action === "GenerateGL") return;

      if (isGeneralLedgerEnabled) {
        const debit = glRowsForSave.reduce(
          (sum, row) => sum + parseFormattedNumber(row.debit || 0),
          0,
        );
        const credit = glRowsForSave.reduce(
          (sum, row) => sum + parseFormattedNumber(row.credit || 0),
          0,
        );
        if (Math.abs(debit - credit) > 0.005) {
          useSwalErrorAlert(
            "Unbalanced Debit/Credit",
            `Debit: ${formatNumber(debit, 2)}\nCredit: ${formatNumber(credit, 2)}`,
          );
          return;
        }
      }

      const payload = buildTransactionPayload(glRowsForSave);
      const response = await useTransactionUpsert(
        docType,
        payload,
        updateState,
        "vesrId",
        "srNo",
      );
      if (!response) return;

      const row = Array.isArray(response?.data)
        ? response.data[0]
        : Array.isArray(response)
          ? response[0]
          : response?.data || response;

      if (Number(row?.errorCount || 0) > 0) {
        useSwalErrorAlert("Validation", row?.errorMsg || "Unable to save VESR.");
        return;
      }

      const savedId = row?.vesrId || state.documentID;
      const savedNo = row?.srNo || state.documentNo;
      if (!savedId || !savedNo) {
        useSwalErrorAlert("Invalid Save Response", "VESR did not return the generated VESR No. and transaction ID.");
        return;
      }

      updateState({
        documentID: savedId,
        documentNo: savedNo,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });

      useSwalshowSaveSuccessDialog(
        () => {
          handleReset();
          setTopTab("history");
        },
        () => useHandlePrint(savedId, docType),
      );
    } catch (error) {
      console.error("VESR save error", error);
      useSwalErrorAlert("VESR", error?.message || "Unable to save transaction.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCancel = () => {
    if (state.documentID && displayStatus === "OPEN") {
      updateState({ showCancelModal: true });
    }
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && state.documentID && displayStatus === "OPEN") {
      const result = await useHandleCancel(
        docType,
        state.documentID,
        user?.USER_CODE || user?.userCode || "NSI",
        confirmation.password,
        confirmation.reason,
        updateState,
      );
      if (result?.success) {
        useSwalSuccessAlert("Success", "Cancellation Completed");
        await fetchTranData(state.documentNo, state.branchCode);
      }
    }
    updateState({ showCancelModal: false });
  };

  const handlePost = () => {
    if (state.documentID && displayStatus === "OPEN") {
      updateState({ showPostModal: true });
    }
  };

  const handleClosePost = async (confirmation) => {
    if (confirmation && state.documentID && displayStatus === "OPEN") {
      await useHandlePostTran(
        [state.documentID],
        confirmation.password,
        docType,
        user?.USER_CODE || user?.userCode || "NSI",
        (loading) => updateState({ isLoading: loading }),
        () => updateState({ showPostModal: false }),
      );
      await fetchTranData(state.documentNo, state.branchCode);
    }
    updateState({ showPostModal: false });
  };

  const handlePrint = () => {
    if (state.documentID) updateState({ showSignatoryModal: true });
  };

  const handleCloseSignatory = async (mode) => {
    updateState({ showSignatoryModal: false, isLoading: true, noReprints: mode === "Final" ? 1 : 0 });
    try {
      await useHandlePrint(state.documentID, docType, mode);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleAttach = () => {
    if (state.documentID) updateState({ showAttachModal: true });
  };

  const handleHeaderCurrencyRateBlur = () => {
    let rate = parseFormattedNumber(state.currRate || 1);
    if (!rate || rate <= 0) rate = 1;
    const oldRate = parseFormattedNumber(currRateBeforeEditRef.current || 1);
    updateState({ currRate: formatNumber(rate, 6) });
    if (Math.abs(rate - oldRate) < 0.0000001) return;

    const rows = (state.detailRows || []).map((row) =>
      recalcVehicleRow({ ...row, currRate: rate, currCode: state.currCode }),
    );
    updateState({ detailRows: rows });
  };

  const handleAddGLRow = (index = null) => {
    if (isFormDisabled) return;
    const rows = [...(state.detailRowsGL || [])];
    const row = {
      id: rows.length + 1,
      acctCode: "",
      acctName: "",
      rcCode: "",
      rcName: "",
      slCode: "",
      slName: "",
      particular: "",
      debit: "0.00",
      credit: "0.00",
      debitFx1: "0.00",
      creditFx1: "0.00",
      debitFx2: "0.00",
      creditFx2: "0.00",
      slRefNo: "",
      remarks: "",
    };
    if (index === null || index === undefined) rows.push(row);
    else rows.splice(index + 1, 0, row);
    updateState({ detailRowsGL: rows.map((r, i) => ({ ...r, id: i + 1 })) });
  };

  const handleDeleteGLRow = (index) => {
    if (isFormDisabled) return;
    updateState({
      detailRowsGL: (state.detailRowsGL || [])
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, id: rowIndex + 1 })),
    });
  };

  const applyLookupToGLRow = async (field, selected) => {
    const index = state.glRowIndex;
    if (index < 0) return;
    const rows = [...(state.detailRowsGL || [])];
    const current = rows[index] || {};
    const lookedUp = await useUpdateRowGLEntries(
      current,
      field,
      selected,
      state.vendCode || "",
      docType,
    );
    rows[index] = lookedUp ? { ...current, ...lookedUp } : { ...current, ...selected };
    updateState({ detailRowsGL: rows });
  };

  const handleGLAmountChange = async (index, field, value) => {
    const rows = [...(state.detailRowsGL || [])];
    const parsedAmount = parseFormattedNumber(value || 0);
    rows[index] = { ...rows[index], [field]: formatNumber(parsedAmount, 2) };
    updateState({ detailRowsGL: rows });
    if (parsedAmount <= 0) return;
    const edited = await useUpdateRowEditEntries(
      rows[index],
      field,
      value,
      state.currCode || baseCurrency,
      parseFormattedNumber(state.currRate || 1),
      header.sr_date,
    );
    if (edited) {
      rows[index] = { ...rows[index], ...edited };
      ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].forEach((amountField) => {
        rows[index][amountField] = formatNumber(parseFormattedNumber(rows[index][amountField] || 0), 2);
      });
      updateState({ detailRowsGL: rows });
    }
  };

  const handleGLFieldChange = (index, field, value) => {
    const rows = [...(state.detailRowsGL || [])];
    const pairedAmountFields = {
      debit: "credit",
      credit: "debit",
      debitFx1: "creditFx1",
      creditFx1: "debitFx1",
      debitFx2: "creditFx2",
      creditFx2: "debitFx2",
    };
    const pairedField = pairedAmountFields[field];
    rows[index] = {
      ...rows[index],
      [field]: value,
      ...(pairedField && parseFormattedNumber(value || 0) > 0
        ? { [pairedField]: "0.00" }
        : {}),
    };
    updateState({ detailRowsGL: rows });
  };

  const renderDetailCell = (column, row, index) => {
    const commonStyle = getDetailCellStyle(column.key, column.width);
    const numeric = [
      "balance",
      "quantity",
      "unitCost",
      "unitCostFx",
      "itemCost",
      "vatRate",
      "vatAmount",
      "netAmount",
    ].includes(column.key);

    if (column.key === "lnNo") {
      return (
        <td key={column.key} className="global-tran-td-ui text-center" style={commonStyle}>
          {index + 1}
        </td>
      );
    }

    if (column.key === "itemCode") {
      return (
        <td key={column.key} className="global-tran-td-ui relative" style={commonStyle}>
          <div className="flex items-center">
            <input
              className={`global-tran-td-inputclass-ui w-full ${
                !isFormDisabled ? "pr-6 cursor-pointer" : ""
              }`}
              value={row.itemCode || ""}
              readOnly
            />
            {!isFormDisabled && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={() => handleOpenVELookup(index)}
                title="Select Vehicle Item"
              />
            )}
          </div>
        </td>
      );
    }

    if (["itemName", "uomCode", "poNo", "balance", "itemCost", "vatAmount", "netAmount", "make"].includes(column.key)) {
      return (
        <td key={column.key} className={`global-tran-td-ui ${numeric ? "text-right" : ""}`} style={commonStyle}>
          <input
            className={`global-tran-td-inputclass-ui w-full ${numeric ? "text-right" : ""}`}
            value={
              numeric
                ? formatNumber(parseFormattedNumber(row[column.key] || 0), column.key === "balance" ? state.decQty : 2)
                : row[column.key] || ""
            }
            readOnly
          />
        </td>
      );
    }

    if (column.key === "vatCode") {
      return (
        <td key={column.key} className="global-tran-td-ui relative" style={commonStyle}>
          <input className="global-tran-td-inputclass-ui w-full pr-6" value={row.vatCode || ""} readOnly />
          {!isFormDisabled && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => updateState({ vatLookupOpen: true, vatLookupRowIndex: index })}
            />
          )}
        </td>
      );
    }

    if (column.key === "qstatCode") {
      return (
        <td key={column.key} className="global-tran-td-ui relative" style={commonStyle}>
          <input className="global-tran-td-inputclass-ui w-full pr-6" value={row.qstatCode || ""} readOnly />
          {!isFormDisabled && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => updateState({ qstatLookupOpen: true, qstatLookupRowIndex: index })}
            />
          )}
        </td>
      );
    }

    if (column.key === "whouseCode") {
      return (
        <td key={column.key} className="global-tran-td-ui relative" style={commonStyle}>
          <input className="global-tran-td-inputclass-ui w-full pr-6" value={row.whouseCode || ""} readOnly />
          {!isFormDisabled && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => updateState({ warehouseLookupOpen: true, warehouseLookupRowIndex: index })}
            />
          )}
        </td>
      );
    }

    if (column.key === "locCode") {
      return (
        <td key={column.key} className="global-tran-td-ui relative" style={commonStyle}>
          <input className="global-tran-td-inputclass-ui w-full pr-6" value={row.locCode || ""} readOnly />
          {!isFormDisabled && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() =>
                updateState({
                  locationLookupOpen: true,
                  locationLookupRowIndex: index,
                  selectedWH: row.whouseCode || state.whouseCode,
                })
              }
            />
          )}
        </td>
      );
    }

    const maxLengthMap = {
      modelYear: "model_yr",
      model: "model",
      serialNo: "serial_no",
      engineNo: "engine_no",
      prodNo: "prod_no",
      color: "color",
      chassisNo: "cs_no",
      pnpNo: "pnp_no",
      csrNo: "csr_no",
      rcCode: "rc_code",
      specs: "specs",
    };

    const isUnitCostField = ["unitCost", "unitCostFx"].includes(column.key);
    const vehicleCostCellKey = `${column.key}-${index}`;

    return (
      <td key={column.key} className={`global-tran-td-ui ${numeric ? "text-right" : ""}`} style={commonStyle}>
        <input
          className={`global-tran-td-inputclass-ui w-full ${numeric ? "text-right" : ""}`}
          value={
            isUnitCostField && editingVehicleCostCell !== vehicleCostCellKey
              ? formatNumber(parseFormattedNumber(row[column.key] || 0), state.decUcost)
              : numeric && !["quantity", "unitCost", "unitCostFx"].includes(column.key)
                ? formatNumber(parseFormattedNumber(row[column.key] || 0), 2)
                : row[column.key] ?? ""
          }
          disabled={isFormDisabled}
          maxLength={column.key === "modelYear" ? 4 : maxLengthMap[column.key] ? useGetFieldLength(state.tblFieldArray, maxLengthMap[column.key]) : undefined}
          onChange={(event) => {
            let value = event.target.value;
            if (column.key === "modelYear") {
              value = sanitizeModelYear(value);
            }
            if (["quantity", "unitCost", "unitCostFx", "vatRate"].includes(column.key)) {
              value = value.replace(/[^0-9.]/g, "");
            }
            handleDetailChange(index, column.key, value, true);
          }}
          onBlur={(event) => {
            if (isUnitCostField) {
              handleDetailChange(index, column.key, parseFormattedNumber(event.target.value || 0), true);
              setEditingVehicleCostCell(null);
            }
            if (column.key === "quantity") {
              const qty = parseFormattedNumber(event.target.value || 0);
              const balance = parseFormattedNumber(row.balance || 0);
              if (qty <= 0) {
                useSwalErrorAlert("Invalid Quantity", "Zero or negative quantity is not allowed.");
                handleDetailChange(index, "quantity", balance || 0, true);
              } else if (balance > 0 && qty > balance) {
                useSwalErrorAlert("Invalid Quantity", `Quantity exceeded PO Balance = ${formatNumber(balance, state.decQty)}`);
                handleDetailChange(index, "quantity", balance, true);
              }
            }
          }}
          onFocus={() => {
            if (isUnitCostField) setEditingVehicleCostCell(vehicleCostCellKey);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && isUnitCostField) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      </td>
    );
  };

  const renderGLCell = (column, row, index) => {
    const style = getGLCellStyle(column.key, column.width);
    const rowLocked = isFormDisabled || row.operation === "S";

    const focusNextGLCell = (field) => {
      focusNextGLRowInput(index, field, {
        rows: detailRowsGLRef.current || state.detailRowsGL,
        zeroClearFields: ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"],
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) =>
          handleGLFieldChange(nextIndex, nextField, value),
      });
    };

    if (column.key === "ln") {
      return (
        <td key={column.key} className="global-tran-td-ui text-center" style={style}>
          {index + 1}
        </td>
      );
    }

    const lookupMap = {
      acctCode: "showCOALookup",
      rcCode: "showRCLookupGL",
      slCode: "showSLLookup",
    };
    if (lookupMap[column.key]) {
      const isRequired = (value) => ["Y", "YES", "TRUE", "1"].includes(String(value ?? "").trim().toUpperCase());
      const requirementValue = column.key === "rcCode"
        ? row.rcRequired ?? row.rcReq ?? row.REQ_RC ?? row.REQRC ?? row.rc_required
        : row.slRequired ?? row.slReq ?? row.REQ_SL ?? row.REQSL ?? row.sl_required;
      const canOpenLookup = !rowLocked && (
        column.key === "acctCode" || isRequired(requirementValue)
      );
      return (
        <td key={column.key} className="global-tran-td-ui relative" style={style}>
          <input
            id={`${column.key}-${index}`}
            className="global-tran-td-inputclass-ui w-full pr-6 cursor-pointer"
            value={row[column.key] || ""}
            readOnly
            disabled={rowLocked}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || rowLocked) return;
              event.preventDefault();
              focusNextGLCell(column.key);
            }}
          />
          {canOpenLookup && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => updateState({ glRowIndex: index, [lookupMap[column.key]]: true })}
            />
          )}
        </td>
      );
    }

    if (column.key === "slRefDate") {
      return (
        <td key={column.key} className="global-tran-td-ui" style={style}>
          <input
            id={`${column.key}-${index}`}
            type="date"
            className="global-tran-td-inputclass-ui w-full"
            value={row.slRefDate || ""}
            readOnly={rowLocked}
            disabled={rowLocked}
            onChange={(event) => handleGLFieldChange(index, "slRefDate", event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || rowLocked) return;
              event.preventDefault();
              focusNextGLCell("slRefDate");
            }}
          />
        </td>
      );
    }

    const amountField = ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(column.key);

    if (!amountField) {
      return (
        <td key={column.key} className="global-tran-td-ui" style={style}>
          <input
            id={`${column.key}-${index}`}
            className="global-tran-td-inputclass-ui w-full"
            value={row[column.key] ?? ""}
            readOnly={rowLocked}
            disabled={rowLocked}
            onChange={(event) => handleGLFieldChange(index, column.key, event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || rowLocked) return;
              event.preventDefault();
              focusNextGLCell(column.key);
            }}
          />
        </td>
      );
    }

    return (
      <td key={column.key} className={`global-tran-td-ui ${amountField ? "text-right" : ""}`} style={style}>
        <input
          id={`${column.key}-${index}`}
          className="w-full global-tran-td-inputclass-ui text-right"
          value={row[column.key] ?? ""}
          readOnly={rowLocked}
          disabled={rowLocked}
          onChange={(event) => {
            const sanitizedValue = event.target.value.replace(/[^0-9.]/g, "");
            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
              handleGLFieldChange(index, column.key, sanitizedValue);
            }
          }}
          onFocus={(event) => {
            if (rowLocked) return;
            clearGLZeroOnFocus(event, {
              isEditable: true,
              onClear: (value) => handleGLFieldChange(index, column.key, value),
            });
          }}
          onBlur={(event) => {
            if (rowLocked) return;
            handleGLAmountChange(index, column.key, event.target.value);
          }}
          onKeyDown={async (event) => {
            if (event.key !== "Enter" || rowLocked) return;
            event.preventDefault();
            await handleGLAmountChange(index, column.key, event.currentTarget.value);
            focusNextGLCell(column.key);
          }}
        />
      </td>
    );
  };

  const printData = {
    sr_no: state.documentNo,
    branch: state.branchCode,
    doc_id: docType,
  };

  const handleHistoryRowPick = (row) => {
    const srNo = row?.srNo || row?.docNo;
    const branchCode = row?.branchCode || state.branchCode;
    if (!srNo || !branchCode) return;
    setTopTab("details");
    fetchTranData(srNo, branchCode);
  };

  return (
    <div className="global-tran-main-div-ui">
      {state.showSpinner && <LoadingSpinner />}

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
          onGenerateGL={isGeneralLedgerEnabled ? () => handleActivityOption("GenerateGL") : undefined}
          onPost={handlePost}
          onCancel={handleCancel}
          onAttach={handleAttach}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          showCopyForm={false}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/VESR"
          isSaveDisabled={state.isSaveDisabled || isFormDisabled || !(state.detailRows || []).length}
          isResetDisabled={false}
          isAttachDisabled={!state.documentID}
          isPrintDisabled={!state.documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!state.documentID || displayStatus !== "OPEN"}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>
          <div className="global-tran-headerstat-div-ui">
            <div>
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui uppercase ${statusClass}`}>{displayStatus}</h1>
            </div>
          </div>
        </div>

        <div className="global-tran-header-div-ui">
          {/* Tab Navigation - same position/design as FGRR */}
          <div className="global-tran-header-tab-div-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative"
            id="vesr_hd"
          >
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Column 1 - exact FGRR field position */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={state.branchName || state.branchCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={state.isFetchDisabled || Boolean(state.documentID)}
                  onLookup={() =>
                    !isFormDisabled && updateState({ branchModalOpen: true })
                  }
                />

                <FieldRenderer
                  id="srNo"
                  label="VESR No."
                  type="lookup"
                  value={state.documentNo || ""}
                  readOnly={state.isDocNoDisabled}
                  disabled={isFormDisabled}
                  lookupDisabled={state.isFetchDisabled || Boolean(state.documentID)}
                  onChange={(value) => updateState({ documentNo: value })}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleDocNoBlur();
                      event.preventDefault();
                      document.getElementById("SRDate")?.focus();
                    }
                  }}
                />

                <FieldRenderer
                  id="SRDate"
                  label="VESR Date"
                  type="date"
                  value={header.sr_date}
                  onChange={(value) =>
                    setHeader((prev) => ({ ...prev, sr_date: value }))
                  }
                  disabled={isFormDisabled}
                />

                  <FieldRenderer
                  id="vesrTranType"
                  label="Tran Type"
                  required
                  type="select"
                  value={state.vesrTranType || getRegularVESRTranType(state.vesrTranTypes)}
                  disabled={isFormDisabled || (state.detailRows || []).length > 0}
                  onChange={(value) => updateState({ vesrTranType: value })}
                  options={(state.vesrTranTypes || []).map((type) => ({
                    label: type.DROPDOWN_NAME,
                    value: type.DROPDOWN_CODE,
                  }))}
                />

              
              </div>

              {/* Column 2 - exact FGRR field position */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="custCode"
                  label="Customer Code"
                  type="lookup"
                  value={state.custCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={state.isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled && updateState({ showCustomerModal: true })
                  }
                  maxLength={useGetFieldLength(state.tblFieldArray, "cust_code")}
                />

                  <FieldRenderer
                  id="custName"
                  label="Customer Name"
                  type="text"
                  value={state.custName || ""}
                  readOnly
                  disabled={isFormDisabled}
                />
                

                 <FieldRenderer
                  id="WHcode"
                  label="Warehouse"
                  required
                  type="lookup"
                  value={formatLookupValue(state.whouseCode, state.whouseName)}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={state.isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({ warehouseLookupOpen: true, warehouseLookupRowIndex: null })
                  }
                />

                <FieldRenderer
                  id="locName"
                  label="Location"
                  required
                  type="lookup"
                  value={formatLookupValue(state.locCode, state.locName)}
                  readOnly
                  disabled={isFormDisabled || !state.whouseCode}
                  lookupDisabled={state.isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    state.whouseCode &&
                    updateState({
                      locationLookupOpen: true,
                      locationLookupRowIndex: null,
                      selectedWH: state.whouseCode,
                    })
                  }
                />
              </div>

              {/* Column 3 - exact FGRR field position */}
              <div className="global-tran-textbox-group-div-ui">
                

                <FieldRenderer
                  id="drNo"
                  label="PN Reference No."
                  type="text"
                  value={state.drNo || ""}
                  onChange={(value) => updateState({ drNo: value })}
                  disabled={isFormDisabled}
                  maxLength={useGetFieldLength(state.tblFieldArray, "dr_no")}
                />

                <FieldRenderer
                  id="refVsiNo"
                  label="Reference VSI No."
                  type="text"
                  value={state.refVsiNo || ""}
                  onChange={(value) => updateState({ refVsiNo: value })}
                  disabled={isFormDisabled}
                  maxLength={useGetFieldLength(state.tblFieldArray, "ref_vsi_no")}
                />

                <FieldRenderer
                  id="refCmNo"
                  label="Reference CM No."
                  type="text"
                  value={state.refCmNo || ""}
                  onChange={(value) => updateState({ refCmNo: value })}
                  disabled={isFormDisabled}
                  maxLength={useGetFieldLength(state.tblFieldArray, "ref_cm_no")}
                />
              </div>

              {/* Remarks spans all 3 columns exactly like FGRR */}
              <div className="col-span-full">
                <div className="relative p-2">
                  <textarea
                    id="particular"
                    placeholder=""
                    rows={4}
                    className="peer global-tran-textbox-remarks-ui pt-2"
                    value={state.particular || ""}
                    onChange={(event) => updateState({ particular: event.target.value })}
                    disabled={isFormDisabled}
                    maxLength={useGetFieldLength(state.tblFieldArray, "particular") || 4000}
                  />
                  <label htmlFor="particular" className="global-tran-floating-label-remarks">
                    Remarks
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================
            VEHICLE DETAIL TABLE (DT1)
           ===================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Vehicle Details
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {visibleDetailColumns.map((column) =>
                      renderDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: visibleDetailColumns,
                      }),
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
                  {sortedDetailRows.map(({ row, originalIndex }) => (
                    <tr key={row.groupId || `${row.itemCode}-${originalIndex}`} className="global-tran-tr-ui">
                      {visibleDetailColumns.map((column) =>
                        renderDetailCell(column, row, originalIndex),
                      )}
                      {!isFormDisabled && (
                        <td
                          className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          style={transactionActionsCellStyle}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isDirectSalesReturn && (
                              <button
                                type="button"
                                className="global-tran-td-button-add-ui"
                                onClick={() => handleInsertVehicleDetailRowClick(originalIndex)}
                                title="Insert vehicle detail"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={() => handleDeleteDetailRow(originalIndex)}
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
              {renderDetailHeaderContextMenu?.()}
            </div>
          </div>

          {/* Detail Footer: same position/design as FGRR */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div ref={singleUploadDropdownRef} className="relative inline-block">
                {showSingleUploadDropdown && canUseSingleUploadMenu && !isFormDisabled && (
                  <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
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
                          setShowSingleUploadDropdown(false);
                          handleAddRowClick();
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            <FontAwesomeIcon icon={faFolderOpen} />
                          </span>
                          <div className="flex flex-col items-start">
                            <span>Add Item</span>
                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Select vehicle details
                            </span>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                        onClick={() => {
                          setShowSingleUploadDropdown(false);
                          handleDownloadSingleUploadTemplate();
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                            <FontAwesomeIcon icon={faDownload} />
                          </span>
                          <div className="flex flex-col items-start">
                            <span>Download Template</span>
                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Excel vehicle columns
                            </span>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                        onClick={() => {
                          setShowSingleUploadDropdown(false);
                          handleUploadSingleTransaction();
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                            <FontAwesomeIcon icon={faUpload} />
                          </span>
                          <div className="flex flex-col items-start">
                            <span>Upload Transaction</span>
                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Import Excel file
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (isFormDisabled) return;

                    setShowSingleUploadDropdown(false);
                    handleAddRowClick();
                  }}
                  disabled={isFormDisabled}
                  className={`global-tran-tab-footer-button-add-ui ${
                    isFormDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              {!hideCostAmount && (
                <div className="global-tran-tab-footer-total-div-ui order-2">
                  <label
                    htmlFor="TotalNetAmount"
                    className="global-tran-tab-footer-total-label-ui"
                  >
                    Total Net Amount:
                  </label>
                  <label
                    htmlFor="TotalNetAmount"
                    className="global-tran-tab-footer-total-value-ui"
                  >
                    {formatNumber(totals.net, 2)}
                  </label>
                </div>
              )}
              <div className="global-tran-tab-footer-total-div-ui order-1">
                <label
                  htmlFor="TotalQty"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total SR Quantity:
                </label>
                <label
                  htmlFor="TotalQty"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {formatNumber(totals.quantity, 0)}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* =====================
            GENERAL LEDGER (DT2)
           ===================== */}
        {isGeneralLedgerEnabled && !hideCostAmount && (
          <div className="global-tran-tab-div-ui">
            <div className="global-tran-tab-nav-ui">
              <div className="flex flex-row sm:flex-row">
                <button
                  className={`global-tran-tab-padding-ui ${
                    state.GLactiveTab === "invoice"
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
                  type="button"
                  onClick={() => handleActivityOption("GenerateGL")}
                  className="global-tran-button-generateGL"
                  disabled={state.isLoading || isFormDisabled}
                  style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                >
                  {state.isLoading ? "Generating..." : "Generate GL Entries"}
                </button>
              </div>
            </div>

            <div className="global-tran-table-main-div-ui">
              <div className="global-tran-table-main-sub-div-ui">
                <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                  <thead className="global-tran-thead-div-ui">
                    <tr>
                      {orderedGLColumns.map((column) =>
                        renderGLHeader(column.label, column.key, column.width, {
                          orderedColumns: orderedGLColumns,
                        }),
                      )}
                    </tr>
                  </thead>
                  <tbody className="relative">
                    {sortedGLRows.map(({ row, originalIndex }) => (
                      <tr
                        key={`${row.acctCode || row.id || "gl"}-${originalIndex}`}
                        className="global-tran-tr-ui"
                      >
                        {orderedGLColumns.map((column) =>
                          renderGLCell(column, row, originalIndex),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderGLHeaderContextMenu?.()}
              </div>
            </div>

            <div className="global-tran-tab-footer-main-div-ui">
              <div className="global-tran-tab-footer-button-div-ui">
                <button
                  type="button"
                  onClick={() => handleAddGLRow()}
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
                    Total Debit ({state.glCurrDefault || baseCurrency}):
                  </label>
                  <label className="global-tran-tab-footer-total-value-ui">
                    {formatNumber(totalDebitGL, 2)}
                  </label>
                </div>
                <div className="global-tran-tab-footer-total-div-ui">
                  <label className="global-tran-tab-footer-total-label-ui">
                    Total Credit ({state.glCurrDefault || baseCurrency}):
                  </label>
                  <label className="global-tran-tab-footer-total-value-ui">
                    {formatNumber(totalCreditGL, 2)}
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getVESRHistory"
          cacheKey={`VESR:${state.branchCode || ""}:${state.documentNo || ""}`}
          activeTabKey="VESR_Summary"
          branchCode={state.branchCode}
          startDate={null}
          endDate={null}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {state.branchModalOpen && (
        <BranchLookupModal
          isOpen={state.branchModalOpen}
          onClose={(selected) => {
            if (selected) {
              updateState({
                branchCode: selected.branchCode || "",
                branchName: selected.branchName || "",
                whouseCode: "",
                whouseName: "",
                locCode: "",
                locName: "",
              });
            }
            updateState({ branchModalOpen: false });
          }}
        />
      )}

      {state.currencyModalOpen && (
        <CurrLookupModal
          isOpen={state.currencyModalOpen}
          onClose={(selected) => {
            if (selected) {
              const code = selected.currCode || "";
              const name = selected.currName || code;
              updateState({
                currCode: String(code).toUpperCase(),
                currName: name,
                currRate: String(code).toUpperCase() === baseCurrency ? "1.000000" : state.currRate,
              });
            }
            updateState({ currencyModalOpen: false });
          }}
        />
      )}

      {state.payeeLookupOpen && (
        <PayeeMastLookupModal
          isOpen={state.payeeLookupOpen}
          customParam={payeeLookupFilter}
          onClose={async (selected) => {
            if (selected) {
              const selectedVatCode = selected.vatCode || "";
              const selectedVatRate = parseFormattedNumber(
                selected.vatRate || 0,
              ) || await fetchVatRate(selectedVatCode);
              updateState({
                vendCode: selected.vendCode || "",
                vendName: selected.vendName || "",
                vatCode: selectedVatCode,
                vatName: selected.vatName || "",
                vatRate: selectedVatRate,
              });
            }
            updateState({ payeeLookupOpen: false });
          }}
        />
      )}

      {state.showCustomerModal && (
        <CustomerMastLookupModal
          isOpen={state.showCustomerModal}
          onClose={handleCloseCustomerModal}
        />
      )}

      {state.warehouseLookupOpen && (
        <WarehouseLookupModal
          isOpen={state.warehouseLookupOpen}
          filter={`ByBC${state.branchCode}`}
          branchCode={state.branchCode}
          invType="VE"
          onClose={handleCloseWarehouseLookup}
        />
      )}

      {state.locationLookupOpen && (
        <LocationLookupModal
          isOpen={state.locationLookupOpen}
          filter="ActiveAll"
          whCode={state.selectedWH || state.whouseCode || ""}
          onClose={handleCloseLocationLookup}
        />
      )}

      {state.qstatLookupOpen && (
        <QstatLookupModal
          isOpen={state.qstatLookupOpen}
          filter="ActiveAll"
          onClose={(selected) => {
            if (selected && state.qstatLookupRowIndex !== null) {
              const rows = [...(state.detailRows || [])];
              const index = state.qstatLookupRowIndex;
              rows[index] = {
                ...rows[index],
                qstatCode: selected.qstatCode || "",
              };
              updateState({ detailRows: rows });
            }
            updateState({ qstatLookupOpen: false, qstatLookupRowIndex: null });
          }}
        />
      )}

      {state.vatLookupOpen && (
        <VATLookupModal
          isOpen={state.vatLookupOpen}
          customParam="InputGoods"
          onClose={(selected) => {
            if (selected && state.vatLookupRowIndex !== null) {
              const index = state.vatLookupRowIndex;
              const rows = [...(state.detailRows || [])];
              rows[index] = recalcVehicleRow({
                ...rows[index],
                vatCode: selected.vatCode || "",
                vatRate: parseFormattedNumber(
                  selected.vatRate || 0,
                ),
              });
              updateState({ detailRows: rows });
            }
            updateState({ vatLookupOpen: false, vatLookupRowIndex: null });
          }}
        />
      )}

      {state.veLookupModalOpen && (
        <ItemMastLookupModal
          isOpen={state.veLookupModalOpen}
          endpoint="getInvLookupVE"
          onClose={handleCloseVELookup}
          onGetSelectedItems={handleCloseVELookup}
          onCancel={() =>
            updateState({
              veLookupModalOpen: false,
              selectedRowIndex: null,
            })
          }
          enableMultiSelect={state.selectedRowIndex === null}
          customParam="ActiveAll"
          docType="VESR"
        />
      )}

      {state.poLookupModalOpen && (
        <GlobalCombinedLookup
          isOpen={state.poLookupModalOpen}
          title="Select Vehicle Purchase Order"
          summarySelectionMode="multiple"
          detailSelectionMode="multiple"
          summaryColumns={
            state.openPORRColSummary.length > 0
              ? state.openPORRColSummary
              : openPOColumns
          }
          detailColumns={
            state.openPORRColDetail.length > 0
              ? state.openPORRColDetail
              : openPODetailColumns
          }
          summaryData={state.openPODataSummary}
          tabTitles={["Open VE PO Summary", "Open VE PO Detail"]}
          fetchDetailApi={async (selectedIds) => {
            const idString = (Array.isArray(selectedIds) ? selectedIds : [selectedIds])
              .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
              .join(",");

            if (!idString) {
              throw new Error("Selected PO records have no PO ID.");
            }

            const response = await postRequest("getVEPORR_OpenDetail", {
              json_data: JSON.stringify({
                json_data: {
                  selectedId: idString,
                  tranIds: idString,
                },
              }),
            });

            const rows = extractRows(
              response?.data?.[0]?.result ?? response?.data ?? response,
            ).map((row) => ({
              ...row,
              lookupGroupId: row?.groupId,
            }));

            return {
              data: [
                {
                  result: JSON.stringify(rows),
                },
              ],
            };
          }}
          onCancel={() =>
            updateState({
              poLookupModalOpen: false,
              openPODataSummary: [],
              openPORRColSummary: [],
              openPORRColDetail: [],
            })
          }
          onClose={handleClosePO}
        />
      )}

      {state.showAllTranDocNo && (
        <AllTranDocNo
          isOpen={state.showAllTranDocNo}
          params={{
            branchCode: state.branchCode,
            branchName: state.branchName,
            docType,
            documentTitle,
            fieldNo: "srNo",
          }}
          onRetrieve={async (data) => {
            await fetchTranData(data.docNo, data.branchCode || state.branchCode, data.key);
            updateState({ showAllTranDocNo: data.modalClose });
          }}
          onResponse={{ documentNo: state.documentNo }}
          onSelected={(data) => {
            handleReset();
            updateState({ showAllTranDocNo: false, documentNo: data.docNo });
          }}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {state.showCancelModal && (
        <CancelTranModal isOpen={state.showCancelModal} onClose={handleCloseCancel} />
      )}

      {state.showPostModal && (
        <PostTranModal isOpen={state.showPostModal} onClose={handleClosePost} />
      )}

      {state.showAttachModal && (
        <AttachDocumentModal
          isOpen={state.showAttachModal}
          params={{
            DocumentID: state.documentID,
            DocumentName: state.documentName || documentTitle,
            BranchName: state.branchName,
            DocumentNo: state.documentNo,
          }}
          onClose={() => updateState({ showAttachModal: false })}
        />
      )}

      {state.showSignatoryModal && (
        <DocumentSignatories
          isOpen={state.showSignatoryModal}
          params={{
            noReprints: state.noReprints,
            documentID: state.documentID,
            docType,
            docNo: state.documentNo,
          }}
          onClose={handleCloseSignatory}
          onCancel={() => updateState({ showSignatoryModal: false })}
        />
      )}

      {state.showCOALookup && (
        <COAMastLookupModal
          isOpen={state.showCOALookup}
          onClose={() => updateState({ showCOALookup: false })}
          onSelect={(selected) => {
            updateState({ showCOALookup: false });
            applyLookupToGLRow("acctCode", selected);
          }}
        />
      )}

      {state.showSLLookup && (
        <SLMastLookupModal
          isOpen={state.showSLLookup}
          onClose={() => updateState({ showSLLookup: false })}
          onSelect={(selected) => {
            updateState({ showSLLookup: false });
            applyLookupToGLRow("slCode", selected);
          }}
        />
      )}

      {state.showRCLookupGL && (
        <RCLookupModal
          isOpen={state.showRCLookupGL}
          onClose={(selected) => {
            updateState({ showRCLookupGL: false });
            if (selected) applyLookupToGLRow("rcCode", selected);
          }}
        />
      )}

      {state.showVATLookupGL && (
        <VATLookupModal
          isOpen={state.showVATLookupGL}
          customParam="InputGoods"
          onClose={(selected) => {
            updateState({ showVATLookupGL: false });
            if (selected) applyLookupToGLRow("vatCode", selected);
          }}
        />
      )}

      {state.showATCLookupGL && (
        <ATCLookupModal
          isOpen={state.showATCLookupGL}
          onClose={(selected) => {
            updateState({ showATCLookupGL: false });
            if (selected) applyLookupToGLRow("atcCode", selected);
          }}
        />
      )}
    </div>
  );
};

export default VESR;


