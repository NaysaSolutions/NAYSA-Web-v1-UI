// VERR_LatestSproc_FieldAlignment_v14 - PO breakdown + latest sproc poln/prln alignment - 2026-08-19
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

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
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
  useSwalProceedConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const VERR = () => {
  const { resetFlag } = useReset();
  const { user, companyInfo, currentUserRow } = useAuth();

  const docType = docTypes?.VERR || "VERR";
  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const documentTitle = docTypeNames?.[docType] || "VE Receiving Report";
  const baseCurrency = companyInfo?.currCode||""
  const defaultBranchCode =currentUserRow?.branchCode||""
  const defaultBranchName = currentUserRow?.branchName||""
  const hideCostAmount = currentUserRow?.viewCostamt === "N";
  const [veInvGLMode, setVEInvGLMode] = useState("E");
  const isGeneralLedgerEnabled = String(veInvGLMode || "E").toUpperCase() !== "D";
  const [topTab, setTopTab] = useState("details");
  const [header, setHeader] = useState({
    rr_date: new Date().toISOString().split("T")[0],
  });
  const [editingVehicleCostCell, setEditingVehicleCostCell] = useState(null);

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
    verrTranTypes: [],
    verrTranType: "VERR01",
    vendCode: "",
    vendName: "",
    poNo: "",
    poDate: "",
    prNo: "",
    drNo: "",
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

    WHCode: "",
    WHName: "",
    LocCode: "",
    LocName: "",
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

  // Match FGRR: PO rows keep PO_DT1.group_id; direct/no-PO rows get a client UUID.
  const generateClientGroupId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().toUpperCase();
    }

    return `VERR-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
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

  const getField = (row, ...keys) => {
    for (const key of keys) {
      if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
        return row[key];
      }
    }
    if (!row || typeof row !== "object") return "";
    const normalized = Object.entries(row).reduce((acc, [key, value]) => {
      acc[String(key).replace(/[_\s-]/g, "").toLowerCase()] = value;
      return acc;
    }, {});
    for (const key of keys) {
      const value = normalized[String(key).replace(/[_\s-]/g, "").toLowerCase()];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
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
      const response = await fetchDataJson("getVEMast", { ITEM_CODE: itemCode });
      const rows = extractRows(response?.data?.[0]?.result ?? response?.data ?? response);
      const mast = rows?.[0] || null;
      if (!mast) return null;

      const categoryCode = mast.categoryCode || mast.categCode || "";
      if (!categoryCode) return mast;

      try {
        const categoryResponse = await fetchDataJson("getVECateg", { CATEG_CODE: categoryCode });
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
      console.warn("VERR: unable to load Vehicle Master defaults", itemCode, error);
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
  const isDirectReceiving =
    String(state.verrTranType || "VERR01").trim().toUpperCase() === "VERR02";
  const payeeLookupFilter = isDirectReceiving ? "ActiveAll" : "OpenVERR";

  useEffect(() => {
    if (isDirectReceiving) {
      updateState({ poLookupModalOpen: false });
      return;
    }

    updateState({
      veLookupModalOpen: false,
      selectedRowIndex: null,
    });
  }, [isDirectReceiving, updateState]);

  const detailColumnDefs = useMemo(() => {
    const columns = [
      { key: "lnNo", label: "LN", width: 56 },
      { key: "poNo", label: "PO No.", width: 140 },
      { key: "itemCode", label: "Item Code", width: 120 },
      { key: "itemName", label: "Item Description", width: 300 },
      { key: "specs", label: "Specification", width: 300 },
      { key: "uomCode", label: "UOM", width: 80 },
      { key: "balance", label: "PO Balance", width: 130 },
      { key: "quantity", label: "RR Quantity", width: 130 },
      { key: "unitCost", label: `Unit Cost (${baseCurrency})`, width: 140 },
      ...(isForeignCurrency
        ? [{ key: "unitCostFx", label: `Unit Cost (${headerCurrencyCode})`, width: 140 }]
        : []),
      { key: "itemCost", label: "Amount", width: 140 },
      { key: "vatCode", label: "VAT", width: 110 },
      { key: "vatRate", label: "VAT Rate", width: 120 },
      { key: "vatAmount", label: "VAT Amount", width: 120 },
      { key: "netAmount", label: "Net Amount", width: 120 },

      // Vehicle-specific columns follow the shared FGRR receiving columns.
      { key: "make", label: "Make", width: 120 },
      { key: "modelYear", label: "Model Year", width: 110 },
      { key: "model", label: "Model", width: 140 },
      { key: "serialNo", label: "Serial No.", width: 150 },
      { key: "engineNo", label: "Engine No.", width: 150 },
      { key: "prodNo", label: "Production No.", width: 150 },
      { key: "color", label: "Color", width: 120 },
      { key: "chassisNo", label: "Chassis / CS No.", width: 170 },
      { key: "pnpNo", label: "PNP No.", width: 130 },
      { key: "csrNo", label: "CSR No.", width: 130 },

      // Keep FGRR's closing shared columns in the same relative position.
      { key: "qstatCode", label: "QC Status", width: 120 },
      { key: "whouseCode", label: "Warehouse", width: 120 },
      { key: "locCode", label: "Location", width: 120 },
    ];

    const tranTypeColumns = isDirectReceiving
      ? columns.filter((c) => !["poNo", "balance"].includes(c.key))
      : columns;

    if (hideCostAmount) {
      return tranTypeColumns.filter(
        (c) =>
          ![
            "unitCost",
            "unitCostFx",
            "itemCost",
            "vatRate",
            "vatAmount",
            "netAmount",
          ].includes(c.key),
      );
    }

    return tranTypeColumns;
  }, [
    baseCurrency,
    headerCurrencyCode,
    hideCostAmount,
    isDirectReceiving,
    isForeignCurrency,
  ]);

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
    const columns = [...orderedDetailColumns];
    const fxColumnKeys = ["unitCostFx"];
    const fxColumns = fxColumnKeys
      .map((key) => columns.find((column) => column.key === key))
      .filter(Boolean);
    const remainingColumns = columns.filter(
      (column) => !fxColumnKeys.includes(column.key),
    );
    const unitCostIndex = remainingColumns.findIndex(
      (column) => column.key === "unitCost",
    );

    if (fxColumns.length === 0 || unitCostIndex < 0) return columns;

    return [
      ...remainingColumns.slice(0, unitCostIndex + 1),
      ...fxColumns,
      ...remainingColumns.slice(unitCostIndex + 1),
    ];
  }, [orderedDetailColumns]);

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
      const [docControl, hsOption, fieldLengths, verrTranTypeData] = await Promise.all([
        useTopDocControlRow(docType),
        useTopHSOption(),
        useFieldLenghtCheck("verr_hd,verr_dt1,verr_dt2"),
        useTopDocDropDown(docType, "VERRTRAN_TYPE"),
      ]);

      const defaultCurr = String(
        hsOption?.glCurrDefault || hsOption?.GLCURR_DEFAULT || baseCurrency,
      ).toUpperCase();
      const transactionCurr = baseCurrency || defaultCurr || "PHP";
      const currencyRow = await useTopCurrencyRow(transactionCurr);

      const loadedVEGLMode =
        hsOption?.veinvGLMode ||
        hsOption?.veInvGLMode ||
        hsOption?.VEINV_GLMODE ||
        hsOption?.veinv_glmode ||
        companyInfo?.veinvGLMode ||
        companyInfo?.VEINV_GLMODE ||
        "E";

      setVEInvGLMode(String(loadedVEGLMode || "E").toUpperCase());

      updateState({
        documentName:
          docControl?.docName || docControl?.DOC_NAME || documentTitle,
        documentSeries:
          docControl?.docSeries || docControl?.DOC_SERIES || "S",
        documentDocLen: Number(
          docControl?.docLen || docControl?.DOC_LEN || docControl?.DOC_LENGTH || 8,
        ),
        glCurrMode: hsOption?.glCurrMode || hsOption?.GLCURR_MODE || "M",
        glCurrDefault: defaultCurr,
        glCurrGlobal1: hsOption?.glCurrGlobal1 || hsOption?.GLCURR_GLOBAL1 || "",
        glCurrGlobal2: hsOption?.glCurrGlobal2 || hsOption?.GLCURR_GLOBAL2 || "",
        glCurrGlobal3: hsOption?.glCurrGlobal3 || hsOption?.GLCURR_GLOBAL3 || "",
        withCurr2:
          String(hsOption?.withCurr2 || hsOption?.WITH_CURR2 || "N").toUpperCase() === "Y",
        withCurr3:
          String(hsOption?.withCurr3 || hsOption?.WITH_CURR3 || "N").toUpperCase() === "Y",
        currCode: transactionCurr,
        currName:
          currencyRow?.currName || currencyRow?.CURR_NAME || transactionCurr,
        currRate: "1.000000",
        verrTranTypes: verrTranTypeData || [],
        verrTranType: verrTranTypeData?.[0]?.DROPDOWN_CODE || "VERR01",
        tblFieldArray: Array.isArray(fieldLengths) ? fieldLengths : [],
      });
    } catch (error) {
      console.error("VERR initialization error", error);
      useSwalErrorAlert("Initialization Error", error?.message || "Unable to load VERR defaults.");
    } finally {
      updateState({ isLoading: false });
    }
  }, [baseCurrency, companyInfo, docType, documentTitle, updateState]);

  const handleReset = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setHeader({ rr_date: today });
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
      verrTranType: prev.verrTranTypes?.[0]?.DROPDOWN_CODE || prev.verrTranType || "VERR01",
      vendCode: "",
      vendName: "",
      poNo: "",
      poDate: "",
      prNo: "",
      drNo: "",
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
      WHCode: "",
      WHName: "",
      LocCode: "",
      LocName: "",
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
    async (rrNo, branchCode, direction = "") => {
      if (!rrNo || !branchCode) return;
      updateState({ isLoading: true });
      try {
        const data = await useFetchTranData(rrNo, branchCode, docType, "rrNo", direction);
        const parsed = data?.result && typeof data.result === "object" ? data.result : data;
        const verrId = parsed?.verrId || parsed?.verrHdId || parsed?.documentID;

        if (!verrId) {
          useSwalErrorAlert("No Records Found", "Transaction does not exist.");
          return;
        }

        const rawStatus = parsed?.cancelled === "Y" ? "X" : parsed?.stat || "";
        const parsedStatus = getFullStatus(rawStatus, parsed?.cancelled);
        const parsedCurrency = String(parsed?.currCode || baseCurrency).toUpperCase();
        const currRow = await useTopCurrencyRow(parsedCurrency);
        const retrievedWhCode = getField(parsed, "whouseCode", "whCode", "WHCode", "WH_CODE");
        const retrievedWhName = normalizeLookupName(
          retrievedWhCode,
          getField(parsed, "whouseName", "whName", "WHName", "WH_NAME"),
        );
        const retrievedLocCode = getField(parsed, "locCode", "LocCode", "LOC_CODE");
        const retrievedLocName = normalizeLookupName(
          retrievedLocCode,
          getField(parsed, "locName", "LocName", "LOC_NAME"),
        );

        setHeader({
          rr_date: parsed?.rrDate
            ? String(parsed.rrDate).substring(0, 10)
            : new Date().toISOString().split("T")[0],
        });

        const loadedDetails = (Array.isArray(parsed?.dt1) ? parsed.dt1 : []).map((row, index) =>
          recalcVehicleRow({
            ...row,
            groupId: row.groupId || row.group_id || "",
            lnNo: row.lnNo || index + 1,
            // Latest sproc Get returns PO/PR line numbers as poln/prln.
            // Keep the JSX internal names poLineno/prLineno for the UI.
            poLineno: row.poLineno || row.poln || "",
            prLineno: row.prLineno || row.prln || "",
            quantity: row.quantity ?? 0,
            balance: row.balance ?? row.quantity ?? 0,
            currCode: row.currCode || parsedCurrency,
            currRate: row.currRate || parsed?.currRate || 1,
          }),
        );

        updateState({
          documentID: verrId,
          documentNo: parsed?.rrNo || rrNo,
          documentStatus: rawStatus,
          cancelled: parsed?.cancelled || "",
          status: parsedStatus,
          branchCode: parsed?.branchCode || branchCode,
          branchName: parsed?.branchName || state.branchName,
          cutoffCode: parsed?.cutoffCode || "",
          verrTranType:
            parsed?.verrTranType ||
            parsed?.VERRTranType ||
            parsed?.VERRTRAN_TYPE ||
            state.verrTranType ||
            "VERR01",
          vendCode: parsed?.vendCode || "",
          vendName: parsed?.vendName || "",
          poNo: parsed?.poNo || "",
          poDate: parsed?.poDate ? String(parsed.poDate).substring(0, 10) : "",
          prNo: parsed?.prNo || "",
          drNo: parsed?.drNo || "",
          siNo: parsed?.siNo || "",
          siDate: parsed?.siDate ? String(parsed.siDate).substring(0, 10) : "",
          vatCode: parsed?.vatCode || "",
          apvNo: parsed?.apvNo || "",
          particular: parsed?.particular || "",
          currCode: parsedCurrency,
          currName: currRow?.currName || currRow?.CURR_NAME || parsedCurrency,
          currRate: formatNumber(parsed?.currRate || 1, 6),
          WHCode: retrievedWhCode || "",
          WHName: retrievedWhName || "",
          LocCode: retrievedLocCode || "",
          LocName: retrievedLocName || "",
          detailRows: loadedDetails,
          detailRowsGL: Array.isArray(parsed?.dt2)
            ? parsed.dt2.map((row, index) => ({
                ...row,
                id: index + 1,
                rcCode: row.rcCode || row.actCode || "",
                slRefNo: row.slRefNo || row.slrefNo || "",
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
        console.error("VERR fetch error", error);
        useSwalErrorAlert("VERR Retrieval", error?.message || "Unable to retrieve transaction.");
      } finally {
        updateState({ isLoading: false });
      }
    },
    [baseCurrency, docType, state.branchName, updateState],
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
    if (!header.rr_date) errors.push("Header - RR Date");
    if (!String(state.verrTranType || "").trim()) errors.push("Header - Tran Type");
    if (!state.vendCode) errors.push("Header - Vendor Code");
    if (!String(state.drNo || "").trim()) errors.push("Header - DR No.");
    if (String(state.siNo || "").trim() && !state.siDate) errors.push("Header - SI Date");
    if (state.siDate && !String(state.siNo || "").trim()) errors.push("Header - SI No.");
    if (!state.WHCode) errors.push("Header - Warehouse");
    if (!state.currCode) errors.push("Header - Currency");
    if (parseFormattedNumber(state.currRate || 0) <= 0) errors.push("Header - Currency Rate must be greater than zero");
    if (!state.detailRows?.length) errors.push("RR Details Empty");

    const chassisSeen = new Map();

    (state.detailRows || []).forEach((row, index) => {
      const ln = row.lnNo || index + 1;
      const itemCode = String(row.itemCode || "").trim();
      const qty = parseFormattedNumber(row.quantity || 0);
      const balance = parseFormattedNumber(row.balance || 0);
      const chassis = String(row.chassisNo || "").trim().toUpperCase();

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
      const pickedWhCode =
        selected.whCode ??
        selected.WHCode ??
        selected.WH_CODE ??
        selected.whouseCode ??
        selected.code ??
        "";
      const pickedWhName = normalizeLookupName(
        pickedWhCode,
        selected.whName ??
          selected.WHName ??
          selected.WH_NAME ??
          selected.whouseName ??
          selected.name ??
          "",
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
          WHCode: pickedWhCode,
          WHName: pickedWhName,
          LocCode: "",
          LocName: "",
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
      const pickedLocCode =
        selected.locCode ?? selected.LocCode ?? selected.LOC_CODE ?? selected.code ?? "";
      const pickedLocName = normalizeLookupName(
        pickedLocCode,
        selected.locName ?? selected.LocName ?? selected.LOC_NAME ?? selected.name ?? "",
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
          LocCode: pickedLocCode,
          LocName: pickedLocName,
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

  const handleOpenVELookup = (rowIndex = null) => {
    if (isFormDisabled || !isDirectReceiving) return;

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
      return parseFormattedNumber(
        getField(vatRow, "vatRate", "VAT_RATE", "rate", "vatPerc", "vat_percent") || 0,
      );
    } catch (error) {
      console.warn("VERR: unable to load VAT rate", vatCode, error);
      return 0;
    }
  };

  const buildDirectVehicleRow = async (selectedItem = {}, baseRow = {}) => {
    const itemCode = String(
      getField(selectedItem, "itemCode", "ItemCode", "ITEM_CODE", "item_code") || "",
    ).trim();

    if (!itemCode) return null;

    const mast = await loadVehicleMasterInfo(itemCode);
    const selectedUnitCost = parseFormattedNumber(
      getField(selectedItem, "unitCost", "UnitCost", "UNIT_COST", "unit_cost") || 0,
    );
    const currentRate = Math.max(parseFormattedNumber(state.currRate || 1), 0.000001);
    const currentCurrency = String(state.currCode || baseCurrency).toUpperCase();
    const itemName =
      getField(selectedItem, "itemName", "ItemName", "ITEM_NAME", "item_name") ||
      mast?.itemDesc ||
      mast?.itemName ||
      "";
    const uomCode =
      getField(selectedItem, "uomCode", "UomCode", "UOM_CODE", "uom_code", "uom") ||
      mast?.uom ||
      mast?.uomCode ||
      "";
    const categCode =
      getField(selectedItem, "categCode", "CategCode", "CATEG_CODE", "categ_code") ||
      mast?.categoryCode ||
      mast?.categCode ||
      "";
    const selectedVatCode =
      getField(selectedItem, "vatCode", "VatCode", "VAT_CODE", "vat_code") ||
      baseRow.vatCode ||
      state.vatCode ||
      "";
    const selectedVatName =
      getField(selectedItem, "vatName", "VatName", "VAT_NAME", "vat_name") ||
      baseRow.vatName ||
      state.vatName ||
      "";
    const lookupVatRate = parseFormattedNumber(
      getField(selectedItem, "vatRate", "VatRate", "VAT_RATE", "vat_rate", "rate") ||
        baseRow.vatRate ||
        state.vatRate ||
        0,
    );
    const selectedVatRate = lookupVatRate || await fetchVatRate(selectedVatCode);

    return recalcVehicleRow({
      ...baseRow,
      groupId: baseRow.groupId || baseRow.group_id || generateClientGroupId(),
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
      locCode: state.LocCode || baseRow.locCode || "",
      vatCode: selectedVatCode,
      vatName: selectedVatName,
      vatRate: selectedVatRate,
      vatAmount: 0,
      poLineno: "",
      qstatCode: mast?.defaultQsCode || baseRow.qstatCode || "",
      make: mast?.vehicleMake || mast?.make || baseRow.make || "",

      // A Vehicle Master item may be reused, but the physical vehicle identity
      // must always start blank for a newly selected/direct-receiving unit.
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
      prLineno: "",
      shippingCost: parseFormattedNumber(baseRow.shippingCost || 0),
      landedCost: parseFormattedNumber(baseRow.landedCost || 0),
      unitShipCost: parseFormattedNumber(baseRow.unitShipCost || 0),
      unitLandedCost: parseFormattedNumber(baseRow.unitLandedCost || 0),
      poNo: "",
      prNo: "",
      whouseCode: state.WHCode || baseRow.whouseCode || "",

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

    const normalizedTranType = String(state.verrTranType || "VERR01")
      .trim()
      .toUpperCase();

    if (normalizedTranType === "VERR02") {
      handleOpenVELookup();
      return;
    }

    handleOpenPOOpenLookup();
  };

  const handleCopyVehicleDetailRow = (index) => {
    if (isFormDisabled || !isDirectReceiving) return;

    const rows = [...(detailRowsRef.current || state.detailRows || [])];
    const sourceRow = rows[index];
    if (!sourceRow) return;

    // Copy reusable receiving/item data only.
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
    if (isFormDisabled || !isDirectReceiving) return;

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
      locCode: state.LocCode || sourceRow.locCode || "",
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
      prLineno: "",
      shippingCost: 0,
      landedCost: 0,
      unitShipCost: 0,
      unitLandedCost: 0,
      pnpNo: "",
      csrNo: "",
      poNo: "",
      prNo: "",
      whouseCode: state.WHCode || sourceRow.whouseCode || "",
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
    if (isFormDisabled || !isDirectReceiving) return;

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
    { key: "itemName", label: "Item Description", renderType: "text", width: 240 },
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

  const handleOpenPOOpenLookup = async (payeeOverride = null) => {
    if (isFormDisabled) return;

    const selectedPayeeCode = String(
      payeeOverride?.vendCode || state.vendCode || "",
    ).trim().toUpperCase();

    if (!selectedPayeeCode) {
      useSwalErrorAlert(
        "Payee Required",
        "Select the payee/vendor before selecting a Purchase Order.",
      );
      updateState({ payeeLookupOpen: true });
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
        console.warn("VERR: unable to load VE PO column configuration", columnError);
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
      console.error("VERR open PO error", error);
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
        The stored procedure returns ONE selected PO detail row with qtyBalance.
        VERR.jsx expands that row here, immediately after the user confirms the
        GlobalCombinedLookup selection. No per-vehicle row expansion is done in SQL.

        Vehicle Receiving rule:
        one physical vehicle = one VERR detail row.

        Example: selected PO detail qtyBalance = 5
        Row 1 -> quantity 1 / PO balance 5
        Row 2 -> quantity 1 / PO balance 4
        Row 3 -> quantity 1 / PO balance 3
        Row 4 -> quantity 1 / PO balance 2
        Row 5 -> quantity 1 / PO balance 1
      */
      const expandedRowGroups = await Promise.all(
        details.map(async (row, detailIndex) => {
          const itemCode = row?.itemCode || "";
          const mast = itemCode ? await loadVehicleMasterInfo(itemCode) : null;
          const unitCost = parseFormattedNumber(row?.unitCost || 0);
          const poQuantity = parseFormattedNumber(row?.poQuantity || 0);
          const qtyBalance = parseFormattedNumber(row?.qtyBalance || 0);
          const rowCurrCode = String(row?.currCode || selectedCurrCode).toUpperCase();

          // qtyBalance comes from the single PO detail returned by the API/SP.
          // This JSX value controls how many one-vehicle VERR rows are created.
          const unitCount = Math.max(0, Math.trunc(qtyBalance));
          if (unitCount <= 0) return [];

          return Array.from({ length: unitCount }, (_, unitIndex) => {
            const runningPoBalance = unitCount - unitIndex;

            return recalcVehicleRow({
              groupId: row?.groupId || row?.group_id || "",
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
              vatCode: row?.vatCode || "",
              vatRate: parseFormattedNumber(row?.vatRate || 0),
              qstatCode: mast?.defaultQsCode || "",
              whouseCode: summary?.whCode || state.WHCode || "",
              locCode: state.LocCode || "",
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
        .map((row, index) => ({
          ...row,
          lnNo: index + 1,
          quantity: 1,
        }));

      updateState({
        vendCode: summary?.vendCode || state.vendCode,
        vendName: summary?.vendName || state.vendName,
        poNo,
        poDate: summary?.poDate || "",
        currCode: selectedCurrCode,
        currName:
          currencyRow?.currName || currencyRow?.CURR_NAME || selectedCurrCode,
        currRate: formatNumber(selectedCurrRate, 6),
        WHCode: summary?.whCode || state.WHCode,
        WHName: summary?.whName || state.WHName,
        detailRows: mappedRows,
        detailRowsGL: [],
        isDocNoDisabled: true,
      });

      detailRowsRef.current = mappedRows;
      detailRowsGLRef.current = [];
    } catch (error) {
      console.error("VERR PO selection error", error);
      useSwalErrorAlert(
        "Vehicle PO",
        error?.message || "Unable to load selected PO details.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const mapGLRowsForSave = (rows = []) =>
    rows.map((row, index) => ({
      recNo: String(index + 1).padStart(3, "0"),
      acctCode: row.acctCode || "",
      actCode: row.actCode || row.rcCode || "",
      sltypeCode: row.sltypeCode || row.slTypeCode || "",
      slCode: row.slCode || "",
      particular: row.particular || "",
      vatCode: row.vatCode || "",
      vatDesc: row.vatDesc || row.vatName || "",
      ewtCode: row.ewtCode || row.atcCode || "",
      ewtDesc: row.ewtDesc || row.atcName || "",
      debit: parseFormattedNumber(row.debit || 0),
      credit: parseFormattedNumber(row.credit || 0),
      remarks: row.remarks || "",
      slrefNo: row.slRefNo || row.slrefNo || "",
      slRefDate: row.slRefDate || row.slrefDate || null,
      vendCode: row.vendCode || state.vendCode || "",
      debitFx1: parseFormattedNumber(row.debitFx1 || 0),
      creditFx1: parseFormattedNumber(row.creditFx1 || 0),
      debitFx2: parseFormattedNumber(row.debitFx2 || 0),
      creditFx2: parseFormattedNumber(row.creditFx2 || 0),
    }));

  const buildTransactionPayload = (glRows = state.detailRowsGL) => ({
    branchCode: state.branchCode,
    rrNo: state.documentNo || "",
    verrId: state.documentID || "",
    documentID: state.documentID || "",
    rrDate: header.rr_date,
    cutoffCode: state.cutoffCode || "",
    verrTranType: state.verrTranType || "VERR01",
    whouseCode: state.WHCode || "",
    locCode: state.LocCode || "",
    vendCode: state.vendCode || "",
    vendName: state.vendName || "",
    poNo: state.poNo || "",
    poDate: state.poDate || null,
    prNo: state.prNo || "",
    drNo: state.drNo || "",
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
      groupId: row.groupId || row.group_id || "",
      itemCode: row.itemCode || "",
      categCode: row.categCode || "",
      itemName: row.itemName || "",
      uomCode: row.uomCode || "",
      quantity: parseFormattedNumber(row.quantity || 0),
      balance: parseFormattedNumber(row.balance || 0),
      unitCost: parseFormattedNumber(row.unitCost || 0),
      unitCostFx: parseFormattedNumber(row.unitCostFx || 0),
      itemCost: parseFormattedNumber(row.itemCost || 0),
      locCode: row.locCode || state.LocCode || "",
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
      poNo: row.poNo || state.poNo || "",
      prNo: row.prNo || state.prNo || "",
      whouseCode: row.whouseCode || state.WHCode || "",
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
        "verrId",
        "rrNo",
      );
      if (!response) return;

      const row = Array.isArray(response?.data)
        ? response.data[0]
        : Array.isArray(response)
          ? response[0]
          : response?.data || response;

      if (Number(row?.errorCount || 0) > 0) {
        useSwalErrorAlert("Validation", row?.errorMsg || "Unable to save VERR.");
        return;
      }

      const savedId = row?.verrId || row?.verrHdId || state.documentID;
      const savedNo = row?.rrNo || state.documentNo;
      if (!savedId || !savedNo) {
        useSwalErrorAlert("Invalid Save Response", "VERR did not return the generated RR No. and transaction ID.");
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
      console.error("VERR save error", error);
      useSwalErrorAlert("VERR", error?.message || "Unable to save transaction.");
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
        useSwalSuccessAlert("Success", "Cancelled successfully.");
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
      header.rr_date,
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
                isDirectReceiving && !isFormDisabled ? "pr-6 cursor-pointer" : ""
              }`}
              value={row.itemCode || ""}
              readOnly
            />
            {isDirectReceiving && !isFormDisabled && (
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
                  selectedWH: row.whouseCode || state.WHCode,
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
          maxLength={maxLengthMap[column.key] ? useGetFieldLength(state.tblFieldArray, maxLengthMap[column.key]) : undefined}
          onChange={(event) => {
            let value = event.target.value;
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
            value={row.slRefDate || row.slrefDate || ""}
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
    rr_no: state.documentNo,
    branch: state.branchCode,
    doc_id: docType,
  };

  const handleHistoryRowPick = (row) => {
    const rrNo = row?.rrNo || row?.docNo;
    const branchCode = row?.branchCode || state.branchCode;
    if (!rrNo || !branchCode) return;
    setTopTab("details");
    fetchTranData(rrNo, branchCode);
  };

  return (
    <div className="global-tran-main-div-ui">
      {state.showSpinner && <LoadingSpinner />}

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
          detailsRoute="/page/VERR"
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
            id="verr_hd"
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
                  disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  lookupDisabled={state.isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled && updateState({ branchModalOpen: true })
                  }
                />

                <FieldRenderer
                  id="rrNo"
                  label="VERR No."
                  type="lookup"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled}
                  onChange={(value) => updateState({ documentNo: value })}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleDocNoBlur();
                      event.preventDefault();
                      document.getElementById("RRDate")?.focus();
                    }
                  }}
                />

                <FieldRenderer
                  id="RRDate"
                  label="VERR Date"
                  type="date"
                  value={header.rr_date}
                  onChange={(value) =>
                    setHeader((prev) => ({ ...prev, rr_date: value }))
                  }
                  disabled={isFormDisabled}
                />

                <FieldRenderer
                  id="verrTranType"
                  label="Tran Type"
                  required
                  type="select"
                  value={state.verrTranType || "VERR01"}
                  disabled={isFormDisabled || (state.detailRows || []).length > 0}
                  onChange={(value) => updateState({ verrTranType: value })}
                  options={(state.verrTranTypes || []).map((type) => ({
                    label: type.DROPDOWN_NAME,
                    value: type.DROPDOWN_CODE,
                  }))}
                />

                <FieldRenderer
                  id="drNo"
                  label="Reference No."
                  required
                  type="text"
                  value={state.drNo || ""}
                  onChange={(value) => updateState({ drNo: value })}
                  disabled={isFormDisabled}
                  maxLength={useGetFieldLength(state.tblFieldArray, "dr_no")}
                />
              </div>

              {/* Column 2 - exact FGRR field position */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="vendCode"
                  label="Payee Code"
                  required
                  type="lookup"
                  value={state.vendCode || ""}
                  disabled={isFormDisabled || (state.detailRows || []).length > 0}
                  readOnly
                  lookupDisabled={state.isFetchDisabled || (state.detailRows || []).length > 0}
                  onLookup={() =>
                    !isFormDisabled &&
                    !(state.detailRows || []).length &&
                    updateState({ payeeLookupOpen: true })
                  }
                />

                <FieldRenderer
                  id="vendName"
                  label="Payee Name"
                  required
                  type="text"
                  value={state.vendName || ""}
                  disabled
                  readOnly
                />

                <div className="flex gap-4">
                  <input type="hidden" id="currCode" value={state.currCode || ""} readOnly />
                  <div className="flex-grow w-2/3">
                    <FieldRenderer
                      id="currName"
                      label="Currency"
                      type="text"
                      value={
                        state.currCode
                          ? `${state.currCode}${state.currName ? ` - ${state.currName}` : ""}`
                          : ""
                      }
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="flex-grow">
                    <FieldRenderer
                      id="currRate"
                      label="Currency Rate"
                      type="amount"
                      value={state.currRate || ""}
                      disabled={isFormDisabled || state.glCurrDefault === state.currCode}
                      onChange={(value) => {
                        const sanitizedValue = String(value).replace(/[^0-9.]/g, "");
                        if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
                          updateState({ currRate: sanitizedValue });
                        }
                      }}
                      onBlur={handleHeaderCurrencyRateBlur}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      onFocus={(event) => {
                        currRateBeforeEditRef.current = formatNumber(
                          parseFormattedNumber(event.target.value || state.currRate || 0),
                          6,
                        );
                      }}
                    />
                  </div>
                </div>

                <FieldRenderer
                  id="siNo"
                  label="SI No."
                  type="text"
                  value={state.siNo || ""}
                  onChange={(value) =>
                    updateState({ siNo: value, ...(value ? {} : { siDate: "" }) })
                  }
                  disabled={isFormDisabled}
                  maxLength={useGetFieldLength(state.tblFieldArray, "si_no")}
                />

                <FieldRenderer
                  id="siDate"
                  label="SI Date"
                  type="date"
                  value={state.siDate || ""}
                  onChange={(value) => updateState({ siDate: value })}
                  disabled={isFormDisabled || !state.siNo}
                />
              </div>

              {/* Column 3 - exact FGRR field position */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="WHcode"
                  label="Warehouse"
                  required
                  type="lookup"
                  value={formatLookupValue(state.WHCode, state.WHName)}
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
                  value={formatLookupValue(state.LocCode, state.LocName)}
                  readOnly
                  disabled={isFormDisabled || !state.WHCode}
                  lookupDisabled={state.isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    state.WHCode &&
                    updateState({
                      locationLookupOpen: true,
                      locationLookupRowIndex: null,
                      selectedWH: state.WHCode,
                    })
                  }
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
                    <tr key={row.groupId || row.group_id || `${row.itemCode}-${originalIndex}`} className="global-tran-tr-ui">
                      {visibleDetailColumns.map((column) =>
                        renderDetailCell(column, row, originalIndex),
                      )}
                      {!isFormDisabled && (
                        <td
                          className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          style={transactionActionsCellStyle}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isDirectReceiving && (
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
              <div className="relative inline-block">
                <button
                  onClick={handleAddRowClick}
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
                <div className="global-tran-tab-footer-total-div-ui">
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
          endpoint="/getVERRHistory"
          cacheKey={`VERR:${state.branchCode || ""}:${state.documentNo || ""}`}
          activeTabKey="VERR_Summary"
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
                branchCode: selected.branchCode || selected.BRANCH_CODE || "",
                branchName: selected.branchName || selected.BRANCH_NAME || "",
                WHCode: "",
                WHName: "",
                LocCode: "",
                LocName: "",
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
              const code = selected.currCode || selected.CURR_CODE || "";
              const name = selected.currName || selected.CURR_NAME || code;
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
              const selectedVatCode = getField(selected, "vatCode", "VatCode", "VAT_CODE", "vat_code") || "";
              const selectedVatRate = parseFormattedNumber(
                getField(selected, "vatRate", "VatRate", "VAT_RATE", "vat_rate", "rate") || 0,
              ) || await fetchVatRate(selectedVatCode);
              updateState({
                vendCode: selected.vendCode || selected.VEND_CODE || selected.code || "",
                vendName: selected.vendName || selected.VEND_NAME || selected.name || "",
                vatCode: selectedVatCode,
                vatName: getField(selected, "vatName", "VatName", "VAT_NAME", "vat_name") || "",
                vatRate: selectedVatRate,
              });
            }
            updateState({ payeeLookupOpen: false });
          }}
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
          whCode={state.selectedWH || state.WHCode || ""}
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
                qstatCode: selected.qstatCode || selected.QS_CODE || selected.code || "",
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
                vatCode: selected.vatCode || selected.VAT_CODE || selected.code || "",
                vatRate: parseFormattedNumber(
                  selected.vatRate || selected.VAT_RATE || selected.rate || 0,
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
          docType="VERR"
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
            fieldNo: "rrNo",
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

export default VERR;
