import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashAlt,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";

import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useReset } from "../../../Components/ResetContext.jsx";

import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";

import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import { useTopDocControlRow as fetchDocControlRow } from "@/NAYSA Cloud/Global/top1RefTable";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalProceedConfirm as showProceedConfirm,
  useSwalErrorAlert as showErrorAlert,
  useSwalSuccessAlert as showSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

import { permissionMode } from "./SalesForecastCommon.jsx";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const HISTORY_COLUMNS = {
  SFC_Summary: [
    { key: "sfcNo", label: "SFC No." },
    { key: "sfcDate", label: "Date", renderType: "date" },
    { key: "branchCode", label: "Branch" },
    { key: "custCode", label: "Customer Code" },
    { key: "custName", label: "Customer Name" },
    { key: "description", label: "Description" },
    { key: "forecastStart", label: "Forecast Start" },
    { key: "forecastEnd", label: "Forecast End" },
    { key: "status", label: "Status" },
  ],
};
const HISTORY_STATUSES = ["All", "Draft", "Approved", "Cancelled"].map(value => ({ value, label: value }));

const getRequestErrorMessages = (error, fallback) => {
  const data = error?.response?.data;
  const fieldErrors = data?.errors;
  if (fieldErrors && typeof fieldErrors === "object") {
    const messages = Object.entries(fieldErrors).flatMap(([field, values]) =>
      (Array.isArray(values) ? values : [values])
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => {
          const label = field.replace(/^json_data\./, "")
            .replace(/^dt1\.(\d+)\./, (_, index) => `Detail line ${Number(index) + 1}: `);
          return `${label}: ${value}`;
        }),
    );
    if (messages.length) return messages;
  }
  return [data?.message || data?.details || error?.message || fallback];
};

const showRequestError = (title, error, fallback) => {
  const messages = getRequestErrorMessages(error, fallback);
  return Swal.fire({
    icon: "error",
    title: messages.length > 1 ? `${title} (${messages.length} errors)` : title,
    text: messages.join("\n\n"),
    customClass: { htmlContainer: "whitespace-pre-line text-left" },
  });
};

const getToday = () => {
  const today = new Date();
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
};
const isValidPeriod = (value) => {
  const text = String(value || "").trim();

  if (!/^\d{6}$/.test(text)) return false;

  const month = Number(text.substring(4, 6));
  return Number(text.substring(0, 4)) > 0 && month >= 1 && month <= 12;
};

const periodCount = (start, end) =>
  (Number(end.substring(0, 4)) - Number(start.substring(0, 4))) * 12 +
  Number(end.substring(4, 6)) - Number(start.substring(4, 6)) + 1;

const SalesForecastCustomer = (item) => {
  const { resetFlag } = useReset();
  const { user, currentUserRow } = useAuth();

  const detailRowsRef = useRef([]);

  const docType = docTypes?.SFC || "SFC";
  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const documentTitle =
    docTypeNames?.[docType] || "Sales Forecast - Customer";

  const readOnly = permissionMode(item).includes("READ");
  const [topTab, setTopTab] = useState("details");


  const normalizeDocumentNo = (value) =>
    String(value || "")
      .trim()
      .replace(/^SFC-/i, "");

  const defaultBranchCode =
    currentUserRow?.branchCode ||
    user?.branchCode ||
    user?.BRANCH_CODE ||
    "HO";

  const defaultBranchName =
    currentUserRow?.branchName ||
    user?.branchName ||
    user?.BRANCH_NAME ||
    "";

  const getUserCode = () =>
    user?.USER_CODE ||
    user?.userCode ||
    user?.username ||
    "NSI";

  const [state, setState] = useState({
    documentName: "",
    documentSeries: "Auto",
    documentDocLen: 8,

    documentID: "",
    documentNo: "",
    documentStatus: "",
    status: "OPEN",

    branchCode: defaultBranchCode,
    branchName: defaultBranchName,

    custCode: "",
    custName: "",
    customerModalOpen: false,
    sfcDate: getToday(),
    description: "",
    forecastStart: "",
    forecastEnd: "",
    remarks: "",

    detailRows: [],

    isLoading: false,
    showSpinner: false,
    isResetDisabled: false,

    branchModalOpen: false,

    cutoffLookupOpen: false,
    cutoffLookupMode: "", // START | END

    lookupOpen: false,
    lookupRows: [],
    lookupSearch: "",
  });

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const {
    documentID,
    documentNo,
    status,
    branchCode,
    branchName,
    custCode,
    custName,
    sfcDate,
    description,
    forecastStart,
    forecastEnd,
    remarks,
    detailRows,
    isLoading,
    showSpinner,
    isResetDisabled,
    branchModalOpen,
    customerModalOpen,
    cutoffLookupOpen,
    cutoffLookupMode,
    lookupOpen,
    lookupRows,
    lookupSearch,
  } = state;

  const normalizeStatus = (value) => {
    const text = String(value || "").trim().toUpperCase();

    if (!text || text === "O" || text === "OPEN" || text === "DRAFT") {
      return "OPEN";
    }

    if (["A", "P", "C", "APPROVED", "POSTED"].includes(text)) {
      return "APPROVED";
    }

    if (["X", "CANCELLED", "CANCELED"].includes(text)) {
      return "CANCELLED";
    }

    return text;
  };

  const displayStatus = normalizeStatus(status);

  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    APPROVED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
  };

  const statusColor = statusMap[displayStatus] || "";

  const isApproved = displayStatus === "APPROVED";
  const isCancelled = displayStatus === "CANCELLED";
  const isFormDisabled = readOnly || isApproved || isCancelled || isLoading;

  /*
  |--------------------------------------------------------------------------
  | FORECAST PERIOD HELPERS
  |--------------------------------------------------------------------------
  | Header values remain YYYYMM. The grid derives one quantity column for each
  | month inclusively between Forecast Start and Forecast End.
  |--------------------------------------------------------------------------
  */

  const comparePeriod = (left, right) =>
    Number(String(left || "")) - Number(String(right || ""));

  const getForecastPeriods = useCallback((start, end) => {
    if (!isValidPeriod(start) || !isValidPeriod(end)) return [];
    if (comparePeriod(start, end) > 0) return [];

    const periods = [];

    let year = Number(start.substring(0, 4));
    let month = Number(start.substring(4, 6));

    const endYear = Number(end.substring(0, 4));
    const endMonth = Number(end.substring(4, 6));

    // Guard against accidental extremely-wide period ranges.
    while (
      year < endYear ||
      (year === endYear && month <= endMonth)
    ) {
      periods.push(`${year}${String(month).padStart(2, "0")}`);

      month += 1;

      if (month > 12) {
        month = 1;
        year += 1;
      }

      if (periods.length >= 120) break;
    }

    return periods;
  }, []);

  const forecastPeriods = useMemo(
    () => getForecastPeriods(forecastStart, forecastEnd),
    [forecastStart, forecastEnd, getForecastPeriods],
  );

  const isSingleForecastYear = useMemo(() => {
    const years = new Set(
      forecastPeriods.map((period) => period.substring(0, 4)),
    );
    return years.size <= 1;
  }, [forecastPeriods]);

  const getPeriodLabel = useCallback((period) => {
    if (!isValidPeriod(period)) return period;

    const year = period.substring(0, 4);
    const monthIndex = Number(period.substring(4, 6)) - 1;
    const monthLabel = MONTH_NAMES[monthIndex] || period.substring(4, 6);

    return isSingleForecastYear ? monthLabel : `${monthLabel} ${year}`;
  }, [isSingleForecastYear]);


  /*
  |--------------------------------------------------------------------------
  | GLOBAL DATATABLE CONFIGURATION
  |--------------------------------------------------------------------------
  | Uses the same datatable.jsx helper pattern as FGRR:
  | - resizable columns
  | - column ordering
  | - sorting
  | - hide/show columns through the header context menu
  | - frozen columns
  |--------------------------------------------------------------------------
  */
  const forecastDetailColumnDefs = useMemo(
    () => [
      { key: "itemCode", label: "Item Code", width: 130 },
      { key: "itemName", label: "Item Description", width: 280 },
      { key: "uomCode", label: "UOM", width: 80 },
      ...forecastPeriods.map((period) => ({
        key: `period_${period}`,
        label: getPeriodLabel(period),
        width: 105,
        period,
      })),
      { key: "total", label: "Total", width: 120 },
    ],
    [forecastPeriods, getPeriodLabel],
  );

  const {
    getColumnStyle: getSFCDetailColumnStyle,
    getFrozenColumnStyle: getSFCDetailFrozenStyle,
    getOrderedColumns: getOrderedSFCDetailColumns,
    getSortedRows: getSortedSFCDetailRows,
    renderHeaderContextMenu: renderSFCDetailHeaderContextMenu,
    renderResizableHeader: renderSFCDetailHeader,
  } = useResizableTableColumns(forecastDetailColumnDefs);

  const visibleSFCDetailColumns = useMemo(
    () => getOrderedSFCDetailColumns(forecastDetailColumnDefs),
    [getOrderedSFCDetailColumns, forecastDetailColumnDefs],
  );

  const getSFCDetailFallbackWidth = (key) =>
    forecastDetailColumnDefs.find((column) => column.key === key)?.width || 120;

  const getSFCDetailCellStyle = (key, fallbackWidth) => ({
    ...getSFCDetailColumnStyle(key, fallbackWidth),
    ...getSFCDetailFrozenStyle(
      key,
      visibleSFCDetailColumns,
      fallbackWidth,
      { isHeader: false },
    ),
  });

  const generateGroupId = () => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID().toUpperCase();
    }

    return `SFC-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`.toUpperCase();
  };

  /*
  |--------------------------------------------------------------------------
  | TOTALS
  |--------------------------------------------------------------------------
  */
  const rowTotal = useCallback((row) =>
    forecastPeriods.reduce(
      (sum, period) =>
        sum +
        (parseFormattedNumber(row?.quantities?.[period] || 0) || 0),
      0,
    ), [forecastPeriods]);

  const grandTotal = useMemo(
    () =>
      (detailRows || []).reduce(
        (sum, row) => sum + rowTotal(row),
        0,
      ),
    [detailRows, rowTotal],
  );

  const periodTotals = useMemo(
    () =>
      forecastPeriods.reduce((acc, period) => {
        acc[period] = (detailRows || []).reduce(
          (sum, row) =>
            sum +
            (parseFormattedNumber(row?.quantities?.[period] || 0) || 0),
          0,
        );
        return acc;
      }, {}),
    [detailRows, forecastPeriods],
  );


  const sortedSFCDetailRows = useMemo(
    () =>
      getSortedSFCDetailRows(
        (detailRows || []).map((row, originalIndex) => ({
          row,
          originalIndex,
        })),
        (entry, sortKey) => {
          if (String(sortKey || "").startsWith("period_")) {
            const period = String(sortKey).replace("period_", "");
            return (
              parseFormattedNumber(
                entry.row?.quantities?.[period] || 0,
              ) || 0
            );
          }

          if (sortKey === "total") {
            return rowTotal(entry.row);
          }

          return entry.row?.[sortKey] ?? "";
        },
      ),
    [getSortedSFCDetailRows, detailRows, rowTotal],
  );

  const editablePeriodColumns = useMemo(
    () =>
      visibleSFCDetailColumns.filter((column) =>
        String(column.key || "").startsWith("period_"),
      ),
    [visibleSFCDetailColumns],
  );

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
  }, [detailRows]);

  useEffect(() => {
    let timer;

    if (isLoading) {
      timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }

    return () => clearTimeout(timer);
  }, [isLoading, updateState]);

  const loadDocControl = useCallback(async () => {
    try {
      const docRow = await fetchDocControlRow(docType);

      if (!docRow) return;

      updateState({
        documentName:
          docRow.docName ??
          docRow.DOC_NAME ??
          documentTitle,
        documentSeries:
          docRow.docSeries ??
          docRow.DOC_SERIES ??
          "Auto",
        documentDocLen: Number(
          docRow.docLen ??
          docRow.DOC_LEN ??
          8,
        ),
      });
    } catch (error) {
      console.error("SFC loadDocControl error:", error);
    }
  }, [docType, documentTitle, updateState]);

  const handleReset = useCallback(async () => {
    updateState({
      documentID: "",
      documentNo: "",
      documentStatus: "",
      status: "OPEN",

      branchCode: defaultBranchCode,
      branchName: defaultBranchName,

      custCode: "",
      custName: "",
      customerModalOpen: false,
      sfcDate: getToday(),
      description: "",
      forecastStart: "",
      forecastEnd: "",
      remarks: "",

      detailRows: [],

      isLoading: false,
      showSpinner: false,

      branchModalOpen: false,
      cutoffLookupOpen: false,
      cutoffLookupMode: "",

      lookupOpen: false,
      lookupRows: [],
      lookupSearch: "",
    });

    detailRowsRef.current = [];

    await loadDocControl();
  }, [defaultBranchCode, defaultBranchName, loadDocControl, updateState]);

  useEffect(() => {
    handleReset();
  }, [resetFlag, handleReset]);

  /*
  |--------------------------------------------------------------------------
  | RESPONSE PARSING
  |--------------------------------------------------------------------------
  */
  const extractResult = (response) => {
    const data = response?.data?.data ?? response?.data ?? response;

    if (Array.isArray(data)) {
      const first = data[0];

      if (first?.result !== undefined) {
        if (!first.result) return null;
        return typeof first.result === "string"
          ? JSON.parse(first.result)
          : first.result;
      }

      return first || null;
    }

    if (data?.result !== undefined) {
      if (!data.result) return null;
      return typeof data.result === "string"
        ? JSON.parse(data.result)
        : data.result;
    }

    return data || null;
  };

  const extractRows = (response) => {
    const raw = response?.data?.data ?? response?.data ?? response;

    if (Array.isArray(raw)) {
      if (raw.length === 1 && raw[0]?.result !== undefined) {
        const result =
          typeof raw[0].result === "string"
            ? JSON.parse(raw[0].result || "[]")
            : raw[0].result;

        return Array.isArray(result) ? result : [];
      }

      return raw;
    }

    if (raw?.result !== undefined) {
      const result =
        typeof raw.result === "string"
          ? JSON.parse(raw.result || "[]")
          : raw.result;

      return Array.isArray(result) ? result : [];
    }

    return Array.isArray(raw) ? raw : [];
  };

  /*
  |--------------------------------------------------------------------------
  | FLAT DB DETAIL -> MONTH MATRIX
  |--------------------------------------------------------------------------
  */
  const pivotDetailRows = (rows = []) => {
    const itemMap = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row, index) => {
      const itemCode = String(row.itemCode || "").trim();
      if (!itemCode) return;

      if (!itemMap.has(itemCode)) {
        itemMap.set(itemCode, {
          lnNo: itemMap.size + 1,
          itemCode,
          itemName: row.itemName || "",
          uomCode: row.uomCode || "",
          quantities: {},
          groupIds: {},
          rowGroupId: generateGroupId(),
        });
      }

      const matrixRow = itemMap.get(itemCode);
      const period = String(row.forecastCutoff || "").trim();

      if (period) {
        matrixRow.quantities[period] = formatNumber(row.quantity || 0, 6);
        matrixRow.groupIds[period] =
          row.groupId || `${itemCode}-${period}-${index}`;
      }
    });

    return Array.from(itemMap.values());
  };

  /*
  |--------------------------------------------------------------------------
  | MONTH MATRIX -> FLAT DB DETAIL
  |--------------------------------------------------------------------------
  */
  const flattenDetailRows = () =>
    (detailRows || []).flatMap((row) =>
      forecastPeriods.map((period) => ({
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        uomCode: row.uomCode || "",
        forecastCutoff: period,
        quantity:
          parseFormattedNumber(row?.quantities?.[period] || 0) || 0,
        groupId:
          row?.groupIds?.[period] ||
          `${row.rowGroupId || generateGroupId()}-${period}`,
      })),
    );

  /*
  |--------------------------------------------------------------------------
  | FETCH TRANSACTION
  |--------------------------------------------------------------------------
  */
  const fetchTranData = async (
    sfcNo = documentNo,
    fetchBranchCode = branchCode,
    direction = "",
  ) => {
    if (!sfcNo || !fetchBranchCode) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/customer/get",
        {
          json_data: {
            branchCode: fetchBranchCode,
            sfcNo,
            direction,
          },
        },
      );

      const parsed = extractResult(response);

      if (!parsed?.sfcId && !parsed?.sfcHdId) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return;
      }

      const details = typeof parsed.dt1 === "string"
        ? JSON.parse(parsed.dt1 || "[]")
        : parsed.dt1 || [];
      const matrixRows = pivotDetailRows(details);

      updateState({
        documentID: parsed.sfcId || parsed.sfcHdId || "",
        documentNo: normalizeDocumentNo(parsed.sfcNo || sfcNo),
        documentStatus: parsed.sfcStatus || "",
        status: normalizeStatus(
          parsed.status ||
          parsed.docStatus ||
          parsed.sfcStatus ||
          "",
        ),

        branchCode: parsed.branchCode || fetchBranchCode,
        branchName: parsed.branchName || branchName,

        sfcDate: parsed.sfcDate
          ? String(parsed.sfcDate).substring(0, 10)
          : getToday(),

        custCode: parsed.custCode || "",
        custName: parsed.custName || "",
        description: parsed.description || "",
        forecastStart: parsed.forecastStart || "",
        forecastEnd: parsed.forecastEnd || "",
        remarks: parsed.remarks || "",

        detailRows: matrixRows,
      });

      detailRowsRef.current = matrixRows;
    } catch (error) {
      console.error("SFC fetchTranData error:", error);

      showErrorAlert(
        "Fetch Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to retrieve Sales Forecast - Customer.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleHistoryRowPick = async (row) => {
      const historyDocNo = row?.docNo || row?.sfcNo || row?.SFC_NO;
      const historyBranchCode =
        row?.branchCode || row?.branch_code || branchCode;

      if (!historyDocNo || !historyBranchCode) return;

      await fetchTranData(
        normalizeDocumentNo(historyDocNo),
        historyBranchCode,
      );
      setTopTab("details");
  };

  const buildPayload = () => ({
    sfcId: documentID || "",
    documentID: documentID || "",
    sfcNo: normalizeDocumentNo(documentNo),
    branchCode: branchCode || "",
    custCode,
    custName,
    sfcDate,
    description,
    forecastStart,
    forecastEnd,
    remarks,
    userCode: getUserCode(),
    cutoffCode: sfcDate ? sfcDate.substring(0, 7).replace("-", "") : "",
    planYear: forecastStart.substring(0, 4),
    dt1: flattenDetailRows(),
  });

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */
  const validateHeaderPeriods = () => {
    if (periodCount(forecastStart, forecastEnd) > 120) {
      showErrorAlert("Forecast Period", "Forecast period cannot exceed 120 months.");
      return false;
    }
    if (!isValidPeriod(forecastStart)) {
      showErrorAlert(
        "Forecast Period",
        "Please select a valid Forecast Start.",
      );
      return false;
    }

    if (!isValidPeriod(forecastEnd)) {
      showErrorAlert(
        "Forecast Period",
        "Please select a valid Forecast End.",
      );
      return false;
    }

    if (comparePeriod(forecastStart, forecastEnd) > 0) {
      showErrorAlert(
        "Forecast Period",
        "Forecast Start cannot be greater than Forecast End.",
      );
      return false;
    }

    return true;
  };

  const validateTransaction = () => {
    const errors = [];

    if (!String(branchCode || "").trim()) {
      errors.push(" - Header - Branch Code");
    }

    if (!String(custCode || "").trim() || !String(custName || "").trim()) {
      errors.push(" - Header - Customer");
    }

    if (!sfcDate) {
      errors.push(" - Header - SFC Date");
    }

    if (!isValidPeriod(forecastStart)) {
      errors.push(" - Header - Forecast Start");
    }

    if (!isValidPeriod(forecastEnd)) {
      errors.push(" - Header - Forecast End");
    }

    if (
      isValidPeriod(forecastStart) &&
      isValidPeriod(forecastEnd) &&
      comparePeriod(forecastStart, forecastEnd) > 0
    ) {
      errors.push(" - Header - Forecast Start must not exceed Forecast End");
    }

    if (periodCount(forecastStart, forecastEnd) > 120) {
      errors.push(" - Header - Forecast period cannot exceed 120 months");
    }
    if (detailRows.length * forecastPeriods.length > 9999) {
      errors.push(" - Forecast Details - Cannot exceed 9,999 item/month lines");
    }

    if ((detailRows || []).length === 0) {
      errors.push(" - Forecast Details Empty. Click Generate first.");
    }

    (detailRows || []).forEach((row, index) => {
      if (!String(row.itemCode || "").trim()) {
        errors.push(
          ` - Forecast Detail Line # ${index + 1} - Item Code Required`,
        );
      }

      if (!String(row.uomCode || "").trim()) {
        errors.push(
          ` - Forecast Detail Line # ${index + 1} - UOM Required`,
        );
      }

      if (!String(row.itemName || "").trim()) {
        errors.push(` - Forecast Detail Line # ${index + 1} - Item Description Required`);
      }

      forecastPeriods.forEach((period) => {
        const qty =
          parseFormattedNumber(row?.quantities?.[period] || 0) || 0;

        if (qty < 0) {
          errors.push(
            ` - Forecast Detail Line # ${index + 1} - ${getPeriodLabel(
              period,
            )} cannot be negative`,
          );
        }
      });
    });

    if (errors.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Validation",
        html: `Please check the following:<br/><br/>${errors.join("<br/>")}`,
      });

      return false;
    }

    return true;
  };

  /*
  |--------------------------------------------------------------------------
  | GENERATE MANUFACTURED FG ITEMS
  |--------------------------------------------------------------------------
  | SPROC mode Generate returns all FG_MAST rows where PLAN_TYPE='Manufactured'.
  | Existing entered quantities are preserved when Generate is clicked again.
  |--------------------------------------------------------------------------
  */
  const handleGenerate = async () => {
    if (isFormDisabled || isLoading) return;
    if (!validateHeaderPeriods()) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/customer/generate",
        {
          json_data: {
            branchCode,
            forecastStart,
            forecastEnd,
          },
        },
      );

      const generatedItems = extractRows(response);

      if (generatedItems.length === 0) {
        showErrorAlert(
          "Generate Forecast",
          "No FG items were found with Plan Type = Manufactured.",
        );
        return;
      }

      const existingMap = new Map(
        (detailRowsRef.current || []).map((row) => [
          String(row.itemCode || "").trim().toUpperCase(),
          row,
        ]),
      );

      const nextRows = generatedItems.map((itemRow, index) => {
        const itemCode =
          itemRow.itemCode ||
          itemRow.ITEM_CODE ||
          "";

        const key = String(itemCode).trim().toUpperCase();
        const existing = existingMap.get(key);

        const quantities = {};
        const groupIds = {};

        forecastPeriods.forEach((period) => {
          quantities[period] =
            existing?.quantities?.[period] ??
            formatNumber(0, 6);

          groupIds[period] =
            existing?.groupIds?.[period] ||
            `${existing?.rowGroupId || generateGroupId()}-${period}`;
        });

        return {
          lnNo: index + 1,
          itemCode,
          itemName:
            itemRow.itemName ||
            itemRow.ITEM_NAME ||
            "",
          uomCode:
            itemRow.uomCode ||
            itemRow.UOM_CODE ||
            "",
          quantities,
          groupIds,
          rowGroupId:
            existing?.rowGroupId ||
            generateGroupId(),
        };
      });

      detailRowsRef.current = nextRows;

      updateState({
        detailRows: nextRows,
      });

      showSuccessAlert(
        "Generate Forecast",
        `${nextRows.length} manufactured FG item(s) loaded.`,
      );
    } catch (error) {
      console.error("SFC Generate error:", error);

      showErrorAlert(
        "Generate Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to generate manufactured FG items.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */
  const saveTransaction = async () => {
    if (isFormDisabled || readOnly || isLoading) return;
    if (!validateTransaction()) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/customer/upsert",
        {
          json_data: buildPayload(),
        },
      );

      const row =
        response?.data?.data?.[0] ||
        response?.data?.[0] ||
        response?.data ||
        {};

      if (Number(row?.errorCount || 0) > 0) {
        Swal.fire({
          icon: "warning",
          title: "Validation",
          html: String(
            row.errorMsg || "Please complete required fields.",
          ).replace(/\r?\n/g, "<br/>"),
        });

        return;
      }

      const savedId =
        row?.sfcHdId ||
        row?.sfcId ||
        documentID ||
        "";

      const savedNo = normalizeDocumentNo(
        row?.sfcNo ||
        documentNo ||
        "",
      );

      if (!savedId || !savedNo) {
        showErrorAlert(
          "Invalid Save Response",
          "SFC did not return the generated document number and transaction ID.",
        );
        return;
      }

      updateState({
        documentID: savedId,
        documentNo: savedNo,
        status: "OPEN",
        documentStatus: "",
      });

      showSuccessAlert(
        "Success",
        "Sales Forecast - Customer saved successfully.",
      );

      await fetchTranData(savedNo, branchCode);
    } catch (error) {
      console.error("SFC save error:", error);

      showRequestError(
        "Save Error",
        error,
        "Unable to save Sales Forecast - Customer.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  /*
  |--------------------------------------------------------------------------
  | APPROVE
  |--------------------------------------------------------------------------
  */
  const approveTransaction = async () => {
    if (!documentID || isFormDisabled || readOnly || isLoading) return;
    if (!validateTransaction()) return;

    const confirmation = await showProceedConfirm(
      "Approve Sales Forecast?",
      "Once approved, the customer forecast will be locked. Further changes must be made through Sales Forecast - Adjustment.",
      "Yes, approve",
      "No",
    );

    if (!confirmation.isConfirmed) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/customer/approve",
        {
          json_data: buildPayload(),
        },
      );

      const row =
        response?.data?.data?.[0] ||
        response?.data?.[0] ||
        response?.data ||
        {};

      if (Number(row?.errorCount || 0) > 0) {
        Swal.fire({
          icon: "warning",
          title: "Validation",
          html: String(
            row.errorMsg || "Unable to approve transaction.",
          ).replace(/\r?\n/g, "<br/>"),
        });

        return;
      }

      showSuccessAlert(
        "Approved",
        "Sales Forecast - Customer approved successfully.",
      );

      await fetchTranData(row?.sfcNo || documentNo, branchCode);
    } catch (error) {
      console.error("SFC approve error:", error);

      showErrorAlert(
        "Approve Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to approve Sales Forecast - Customer.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CANCEL
  |--------------------------------------------------------------------------
  */
  const cancelTransaction = async () => {
    if (!documentID || isApproved || isCancelled || readOnly || isLoading) return;

    const confirmation = await showProceedConfirm(
      "Cancel Transaction?",
      "Do you want to cancel this Sales Forecast - Customer?",
      "Yes, cancel",
      "No",
    );

    if (!confirmation.isConfirmed) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/customer/cancel",
        {
          json_data: {
            sfcId: documentID,
            documentID,
            branchCode,
            sfcNo: documentNo,
            userCode: getUserCode(),
            reason: "Cancelled from Sales Forecast - Customer",
          },
        },
      );

      const row =
        response?.data?.data?.[0] ||
        response?.data?.[0] ||
        response?.data ||
        {};

      if (Number(row?.errorCount || 0) > 0) {
        showErrorAlert(
          "Cancel Error",
          row?.errorMsg || "Unable to cancel transaction.",
        );
        return;
      }

      showSuccessAlert("Success", "Cancelled successfully.");

      await fetchTranData(documentNo, branchCode);
    } catch (error) {
      console.error("SFC cancel error:", error);

      showErrorAlert(
        "Cancel Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to cancel Sales Forecast - Customer.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DOCUMENT LOOKUP
  |--------------------------------------------------------------------------
  */
  const loadLookup = useCallback(async () => {
    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/customer/lookup",
        {
          json_data: {
            branchCode,
          },
        },
      );

      const rows =
        response?.data?.data ||
        response?.data ||
        [];

      updateState({
        lookupRows: Array.isArray(rows) ? rows : [],
        lookupOpen: true,
        lookupSearch: "",
      });
    } catch (error) {
      showErrorAlert(
        "Lookup Error",
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load Sales Forecast - Customer lookup.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, updateState]);

  const filteredLookupRows = useMemo(() => {
    const keyword = String(lookupSearch || "")
      .trim()
      .toUpperCase();

    if (!keyword) return lookupRows || [];

    return (lookupRows || []).filter((row) =>
      [
        row.sfcNo,
        row.sfcDate,
        row.custCode,
        row.custName,
        row.description,
        row.forecastStart,
        row.forecastEnd,
        row.status,
      ].some((value) =>
        String(value || "")
          .toUpperCase()
          .includes(keyword),
      ),
    );
  }, [lookupRows, lookupSearch]);

  const handleDocNoBlur = () => {
    if (!documentID && documentNo && branchCode) {
      fetchTranData(documentNo, branchCode);
    }
  };

  useEffect(() => {
    const handleF1 = (event) => {
      if (event.key === "F1") {
        event.preventDefault();
        loadLookup();
      }
    };

    window.addEventListener("keydown", handleF1);

    return () =>
      window.removeEventListener("keydown", handleF1);
  }, [loadLookup]);

  /*
  |--------------------------------------------------------------------------
  | HEADER LOOKUPS
  |--------------------------------------------------------------------------
  */
  const handleCloseBranchModal = (row) => {
    if (row) {
      updateState({
        branchCode:
          row.branchCode ??
          row.BRANCH_CODE ??
          "",
        branchName:
          row.branchName ??
          row.BRANCH_NAME ??
          "",
      });
    }

    updateState({ branchModalOpen: false });
  };

  const openCutoffLookup = (mode) => {
    if (isFormDisabled) return;

    updateState({
      cutoffLookupOpen: true,
      cutoffLookupMode: mode,
    });
  };

  const handleCloseCutoffLookup = (selected) => {
    if (!selected) {
      updateState({
        cutoffLookupOpen: false,
        cutoffLookupMode: "",
      });
      return;
    }

    const selectedCode = String(
      selected.cutoffCode ||
      selected.CUTOFF_CODE ||
      "",
    ).trim();

    if (cutoffLookupMode === "START") {
      const updates = {
        forecastStart: selectedCode,
      };

      // Convenient default: first selection also initializes End.
      if (!forecastEnd) {
        updates.forecastEnd = selectedCode;
      }

      updateState(updates);
    }

    if (cutoffLookupMode === "END") {
      if (
        isValidPeriod(forecastStart) &&
        isValidPeriod(selectedCode) &&
        comparePeriod(selectedCode, forecastStart) < 0
      ) {
        showErrorAlert(
          "Forecast Period",
          "Forecast End cannot be earlier than Forecast Start.",
        );
        return;
      }

      updateState({
        forecastEnd: selectedCode,
      });
    }

    updateState({
      cutoffLookupOpen: false,
      cutoffLookupMode: "",
    });
  };

  /*
  |--------------------------------------------------------------------------
  | GRID CHANGE
  |--------------------------------------------------------------------------
  */
  const sanitizeQuantity = (value) => {
    const raw = String(value ?? "");
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");

    return parts.length <= 1
      ? cleaned
      : `${parts.shift()}.${parts.join("")}`;
  };

  const handleQuantityChange = (
    rowIndex,
    period,
    value,
    formatNumeric = false,
  ) => {
    if (isFormDisabled) return;

    const rows = [...(detailRowsRef.current || [])];
    const current = rows[rowIndex];

    if (!current) return;

    const sanitized = sanitizeQuantity(value);

    rows[rowIndex] = {
      ...current,
      quantities: {
        ...(current.quantities || {}),
        [period]: formatNumeric
          ? formatNumber(
              parseFormattedNumber(sanitized || 0) || 0,
              6,
            )
          : sanitized,
      },
    };

    detailRowsRef.current = rows;
    updateState({ detailRows: rows });
  };

  const focusForecastQuantityCell = (rowIndex, period) => {
    const nextElement = document.getElementById(
      `sfc-qty-${period}-${rowIndex}`,
    );

    if (!nextElement) return;

    nextElement.focus();

    if (typeof nextElement.select === "function") {
      nextElement.select();
    }
  };

  const handleForecastQuantityKeyDown = (
    event,
    originalIndex,
    period,
  ) => {
    if (event.key !== "Enter" || isFormDisabled) return;

    event.preventDefault();

    const sanitized = sanitizeQuantity(event.currentTarget.value);
    const formattedValue = formatNumber(
      parseFormattedNumber(sanitized || 0) || 0,
      6,
    );

    handleQuantityChange(
      originalIndex,
      period,
      formattedValue,
      true,
    );

    const currentColumnIndex = editablePeriodColumns.findIndex(
      (column) => column.period === period,
    );

    const currentDisplayRowIndex = sortedSFCDetailRows.findIndex(
      (entry) => entry.originalIndex === originalIndex,
    );

    let nextRowIndex = originalIndex;
    let nextPeriod =
      editablePeriodColumns[currentColumnIndex + 1]?.period;

    // Last month in the row -> first month of the next displayed row.
    if (!nextPeriod) {
      const nextDisplayRow =
        sortedSFCDetailRows[currentDisplayRowIndex + 1];

      if (!nextDisplayRow) return;

      nextRowIndex = nextDisplayRow.originalIndex;
      nextPeriod = editablePeriodColumns[0]?.period;
    }

    if (!nextPeriod) return;

    setTimeout(
      () => focusForecastQuantityCell(nextRowIndex, nextPeriod),
      0,
    );
  };

  const handleDeleteRow = (rowIndex) => {
    if (isFormDisabled) return;

    const rows = [...(detailRowsRef.current || [])];
    rows.splice(rowIndex, 1);

    rows.forEach((row, index) => {
      row.lnNo = index + 1;
    });

    detailRowsRef.current = rows;
    updateState({ detailRows: rows });
  };

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onReset={handleReset}
          onSave={saveTransaction}
          onCancel={cancelTransaction}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          detailsRoute="/page/SFC"
          showBIRForm={false}
          showCopyForm={false}
          isSaveDisabled={
            isFormDisabled ||
            isLoading ||
            detailRows.length === 0
          }
          isResetDisabled={isResetDisabled || isLoading}
          isCancelDisabled={
            !documentID ||
            isApproved ||
            isCancelled ||
            readOnly || isLoading
          }
          isAttachDisabled
          isPrintDisabled
          isCopyDisabled
          disableRouteNavigation
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
      <div className="global-tran-header-ui">
        <div className="global-tran-headertext-div-ui">
          <h1 className="global-tran-headertext-ui">
            {documentTitle}
          </h1>
        </div>

        <div className="global-tran-headerstat-div-ui">
          <div>
            <p className="global-tran-headerstat-text-ui">
              Transaction Status
            </p>
            <h1
              className={`global-tran-stat-text-ui uppercase ${statusColor}`}
            >
              {displayStatus}
            </h1>
          </div>

          {!readOnly &&
            documentID &&
            !isApproved &&
            !isCancelled && (
              <button
                type="button"
                className="global-tran-button-generateGL ml-3"
                disabled={isLoading}
                onClick={approveTransaction}
              >
                <FontAwesomeIcon
                  icon={faCheck}
                  className="mr-2"
                />
                Approve
              </button>
            )}
        </div>
      </div>

      <div className="global-tran-header-div-ui">
        <div className="global-tran-header-tab-div-ui">
          <button
            className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
            type="button"
          >
            Basic Information
          </button>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative items-stretch"
          id="sfc_hd"
        >
          {/* COLUMN 1 */}
          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="branchName"
              label="Branch"
              type="lookup"
              value={branchName || branchCode || ""}
              readOnly
              disabled={Boolean(documentID) || isFormDisabled}
              lookupDisabled={Boolean(documentID) || isFormDisabled}
              onLookup={() =>
                updateState({
                  branchModalOpen: true,
                })
              }
            />

            <FieldRenderer
              id="sfcNo"
              label="SFC No."
              type="lookup"
              value={documentNo || ""}
              disabled={Boolean(documentID) || isLoading}
              onChange={(value) =>
                updateState({
                  documentNo: normalizeDocumentNo(value),
                })
              }
              onLookup={loadLookup}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleDocNoBlur();
                }
              }}
            />

            <FieldRenderer
              id="sfcDate"
              label="SFC Date"
              type="date"
              required
              value={sfcDate || ""}
              disabled={isFormDisabled}
              onChange={(value) =>
                updateState({
                  sfcDate: value,
                })
              }
            />

            <FieldRenderer
              id="description"
              label="Description"
              type="text"
              value={description || ""}
              disabled={isFormDisabled}
              onChange={(value) =>
                updateState({
                  description: value,
                })
              }
            />
          </div>

          {/* COLUMN 2 */}
          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="forecastStart"
              label="Forecast Period Start"
              type="lookup"
              required
              value={forecastStart || ""}
              readOnly
              disabled={isFormDisabled}
              lookupDisabled={isFormDisabled}
              onLookup={() => openCutoffLookup("START")}
            />

            <FieldRenderer
              id="forecastEnd"
              label="Forecast Period End"
              type="lookup"
              required
              value={forecastEnd || ""}
              readOnly
              disabled={isFormDisabled}
              lookupDisabled={isFormDisabled}
              onLookup={() => openCutoffLookup("END")}
            />

            <FieldRenderer
              id="custCode"
              label="Customer"
              type="lookup"
              required
              value={[custCode, custName].filter(Boolean).join(" - ")}
              readOnly
              disabled={isFormDisabled || isLoading}
              lookupDisabled={isFormDisabled || isLoading}
              onLookup={() => updateState({ customerModalOpen: true })}
            />

            <div className="relative p-2">
              <button
                type="button"
                disabled={
                  isFormDisabled ||
                  !forecastStart ||
                  !forecastEnd ||
                  isLoading
                }
                onClick={handleGenerate}
                className={`global-tran-button-generateGL w-full ${
                  isFormDisabled ||
                  !forecastStart ||
                  !forecastEnd ||
                  isLoading
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {/* <FontAwesomeIcon icon={faGear} className="mr-2" /> */}
                Generate
              </button>
            </div>
          </div>

          {/* COLUMN 3 - RR STYLE BIG REMARKS */}
          <div className="global-tran-textbox-group-div-ui h-full">
            <div className="relative p-2 h-full min-h-full">
              <textarea
                id="remarks"
                placeholder=""
                rows={4}
                className="peer global-tran-textbox-remarks-ui pt-2 h-[calc(100%-1rem)] min-h-[132px] resize-none"
                value={remarks}
                onChange={(e) =>
                  updateState({
                    remarks: e.target.value,
                  })
                }
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

      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row">
            <button
              type="button"
              className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
            >
              Forecast Details
            </button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
          <div className="global-tran-table-main-sub-div-ui">
            <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui">
                <tr>
                  {visibleSFCDetailColumns.map((column) =>
                    renderSFCDetailHeader(
                      column.label,
                      column.key,
                      column.width,
                      {
                        orderedColumns: visibleSFCDetailColumns,
                      },
                    ),
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
                {sortedSFCDetailRows.map(
                  ({ row, originalIndex }) => (
                    <tr
                      key={
                        row.rowGroupId ||
                        row.itemCode ||
                        originalIndex
                      }
                      className="global-tran-tr-ui"
                    >
                      {visibleSFCDetailColumns.map((column) => {
                        const fallbackWidth =
                          getSFCDetailFallbackWidth(column.key);
                        const style = getSFCDetailCellStyle(
                          column.key,
                          fallbackWidth,
                        );

                        if (column.key === "itemCode") {
                          return (
                            <td
                              key={column.key}
                              className="global-tran-td-ui bg-white dark:bg-black"
                              style={style}
                            >
                              <input
                                className="global-tran-td-textbox-ui"
                                value={row.itemCode || ""}
                                disabled
                              />
                            </td>
                          );
                        }

                        if (column.key === "itemName") {
                          return (
                            <td
                              key={column.key}
                              className="global-tran-td-ui bg-white dark:bg-black"
                              style={style}
                            >
                              <input
                                className="global-tran-td-textbox-ui"
                                value={row.itemName || ""}
                                disabled
                              />
                            </td>
                          );
                        }

                        if (column.key === "uomCode") {
                          return (
                            <td
                              key={column.key}
                              className="global-tran-td-ui bg-white dark:bg-black"
                              style={style}
                            >
                              <input
                                className="global-tran-td-textbox-ui text-center"
                                value={row.uomCode || ""}
                                disabled
                              />
                            </td>
                          );
                        }

                        if (
                          String(column.key).startsWith(
                            "period_",
                          )
                        ) {
                          const period =
                            column.period ||
                            String(column.key).replace(
                              "period_",
                              "",
                            );

                          return (
                            <td
                              key={column.key}
                              className="global-tran-td-ui"
                              style={style}
                            >
                              <input
                                id={`sfc-qty-${period}-${originalIndex}`}
                                className="global-tran-td-textbox-ui text-right"
                                value={
                                  row?.quantities?.[period] ??
                                  "0.000000"
                                }
                                disabled={isFormDisabled}
                                onFocus={(event) => {
                                  if (
                                    parseFormattedNumber(
                                      event.target.value || 0,
                                    ) === 0
                                  ) {
                                    event.target.select();
                                  }
                                }}
                                onChange={(event) =>
                                  handleQuantityChange(
                                    originalIndex,
                                    period,
                                    event.target.value,
                                    false,
                                  )
                                }
                                onBlur={(event) =>
                                  handleQuantityChange(
                                    originalIndex,
                                    period,
                                    event.target.value,
                                    true,
                                  )
                                }
                                onKeyDown={(event) =>
                                  handleForecastQuantityKeyDown(
                                    event,
                                    originalIndex,
                                    period,
                                  )
                                }
                              />
                            </td>
                          );
                        }

                        if (column.key === "total") {
                          return (
                            <td
                              key={column.key}
                              className="global-tran-td-ui text-right font-semibold"
                              style={style}
                            >
                              {formatNumber(rowTotal(row), 6)}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={column.key}
                            className="global-tran-td-ui"
                            style={style}
                          >
                            {String(row?.[column.key] ?? "")}
                          </td>
                        );
                      })}

                      {!isFormDisabled && (
                        <td
                          className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          style={transactionActionsCellStyle}
                        >
                          <button
                            type="button"
                            className="global-tran-td-button-delete-ui"
                            onClick={() =>
                              handleDeleteRow(originalIndex)
                            }
                            title="Delete item"
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ),
                )}

                {detailRows.length === 0 && (
                  <tr>
                    <td
                      className="global-tran-td-ui py-8 text-center text-gray-500"
                      colSpan={
                        visibleSFCDetailColumns.length +
                        (isFormDisabled ? 0 : 1)
                      }
                    >
                      {forecastPeriods.length === 0
                        ? "Select Forecast Period Start and End, then click Generate."
                        : "Click Generate to load FG items where Plan Type = Manufactured."}
                    </td>
                  </tr>
                )}
              </tbody>

              {detailRows.length > 0 && (
                <tfoot>
                  <tr className="font-semibold">
                    {visibleSFCDetailColumns.map((column) => {
                      const fallbackWidth =
                        getSFCDetailFallbackWidth(column.key);
                      const style = getSFCDetailCellStyle(
                        column.key,
                        fallbackWidth,
                      );

                      if (column.key === "itemCode") {
                        return (
                          <td
                            key={column.key}
                            className="global-tran-td-ui bg-white dark:bg-black"
                            style={style}
                          >
                            TOTAL
                          </td>
                        );
                      }

                      if (
                        ["itemName", "uomCode"].includes(
                          column.key,
                        )
                      ) {
                        return (
                          <td
                            key={column.key}
                            className="global-tran-td-ui bg-white dark:bg-black"
                            style={style}
                          />
                        );
                      }

                      if (
                        String(column.key).startsWith(
                          "period_",
                        )
                      ) {
                        const period =
                          column.period ||
                          String(column.key).replace(
                            "period_",
                            "",
                          );

                        return (
                          <td
                            key={column.key}
                            className="global-tran-td-ui text-right"
                            style={style}
                          >
                            {formatNumber(
                              periodTotals[period] || 0,
                              6,
                            )}
                          </td>
                        );
                      }

                      if (column.key === "total") {
                        return (
                          <td
                            key={column.key}
                            className="global-tran-td-ui text-right"
                            style={style}
                          >
                            {formatNumber(grandTotal, 6)}
                          </td>
                        );
                      }

                      return (
                        <td
                          key={column.key}
                          className="global-tran-td-ui"
                          style={style}
                        />
                      );
                    })}

                    {!isFormDisabled && (
                      <td
                        className="global-tran-td-ui sticky right-0 bg-white dark:bg-black"
                        style={transactionActionsCellStyle}
                      />
                    )}
                  </tr>
                </tfoot>
              )}
            </table>

            {renderSFCDetailHeaderContextMenu?.()}
          </div>
        </div>

        <div className="global-tran-tab-footer-main-div-ui">
          <div className="global-tran-tab-footer-button-div-ui">
            <span className="text-xs text-gray-500">
              {forecastPeriods.length > 0
                ? `${forecastStart} to ${forecastEnd} · ${forecastPeriods.length} month(s)`
                : "No forecast period selected"}
            </span>
          </div>

          <div className="global-tran-tab-footer-total-main-div-ui">
            <div className="global-tran-tab-footer-total-div-ui">
              <label className="global-tran-tab-footer-total-label-ui">
                Total Forecast Quantity:
              </label>
              <label className="global-tran-tab-footer-total-value-ui">
                {formatNumber(grandTotal, 6)}
              </label>
            </div>
          </div>
        </div>
      </div>

      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/sales-forecast/customer/getSFCHistory"
          cacheKey={`SFC:${branchCode || ""}:${documentNo || ""}`}
          activeTabKey="SFC_Summary"
          columnConfigOverrides={HISTORY_COLUMNS}
          statusOptions={HISTORY_STATUSES}
          branchCode={branchCode}
          startDate={null}
          endDate={null}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {customerModalOpen && (
        <CustomerMastLookupModal
          isOpen={customerModalOpen}
          onClose={(customer) => updateState({
            customerModalOpen: false,
            ...(customer && !isFormDisabled && !isLoading
              ? { custCode: customer.custCode || "", custName: customer.custName || "" }
              : {}),
          })}
        />
      )}

      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {cutoffLookupOpen && (
        <CutoffLookupModal
          isOpen={cutoffLookupOpen}
          onClose={handleCloseCutoffLookup}
        />
      )}

      {lookupOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Sales Forecast - Customer
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select an existing SFC transaction.
                </p>
              </div>

              <button
                type="button"
                className="global-button-ui"
                onClick={() =>
                  updateState({
                    lookupOpen: false,
                  })
                }
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <div className="mb-3">
                <input
                  className="global-tran-textbox-ui"
                  placeholder="Search SFC No., customer, date, description, period, or status"
                  value={lookupSearch}
                  onChange={(event) =>
                    updateState({
                      lookupSearch: event.target.value,
                    })
                  }
                />
              </div>

              <div className="max-h-[55vh] overflow-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="global-tran-thead-div-ui sticky top-0">
                    <tr>
                      <th className="global-tran-th-ui">SFC No.</th>
                      <th className="global-tran-th-ui">Date</th>
                      <th className="global-tran-th-ui">Customer</th>
                      <th className="global-tran-th-ui">Description</th>
                      <th className="global-tran-th-ui">Forecast Start</th>
                      <th className="global-tran-th-ui">Forecast End</th>
                      <th className="global-tran-th-ui">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLookupRows.map((row) => (
                      <tr
                        key={row.sfcId || row.sfcNo}
                        className="global-tran-tr-ui cursor-pointer"
                        onDoubleClick={async () => {
                          updateState({
                            lookupOpen: false,
                          });

                          await fetchTranData(
                            normalizeDocumentNo(row.sfcNo),
                            row.branchCode || branchCode,
                          );
                        }}
                      >
                        <td className="global-tran-td-ui">
                          {normalizeDocumentNo(row.sfcNo)}
                        </td>
                        <td className="global-tran-td-ui">
                          {row.sfcDate
                            ? String(row.sfcDate).substring(0, 10)
                            : ""}
                        </td>
                        <td className="global-tran-td-ui">
                          {[row.custCode, row.custName].filter(Boolean).join(" - ")}
                        </td>
                        <td className="global-tran-td-ui">
                          {row.description}
                        </td>
                        <td className="global-tran-td-ui text-center">
                          {row.forecastStart}
                        </td>
                        <td className="global-tran-td-ui text-center">
                          {row.forecastEnd}
                        </td>
                        <td className="global-tran-td-ui text-center">
                          {normalizeStatus(row.status)}
                        </td>
                      </tr>
                    ))}

                    {filteredLookupRows.length === 0 && (
                      <tr>
                        <td
                          className="global-tran-td-ui py-6 text-center"
                          colSpan={7}
                        >
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Double-click a row to retrieve the transaction.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesForecastCustomer;
