import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faPlus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useReset } from "../../../Components/ResetContext.jsx";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";

import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import { useTopDocControlRow } from "@/NAYSA Cloud/Global/top1RefTable";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalProceedConfirm,
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

import { permissionMode } from "./SalesForecastCommon.jsx";

const SalesForecastAdjustment = (item) => {
  const { resetFlag } = useReset();
  const { user, currentUserRow } = useAuth();

  const detailRowsRef = useRef([]);

  const docType = docTypes?.SFA || "SFA";
  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const documentTitle =
    docTypeNames?.[docType] || "Sales Forecast - Adjustment";

  const readOnly = permissionMode(item).includes("READ");
  const [topTab, setTopTab] = useState("details");

  const getToday = () => new Date().toISOString().split("T")[0];

  const normalizeDocumentNo = (value) =>
    String(value || "")
      .trim()
      .replace(/^SFA-/i, "");

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
    documentID: "",
    documentNo: "",
    status: "OPEN",

    branchCode: defaultBranchCode,
    branchName: defaultBranchName,

    sfaDate: getToday(),
    description: "",
    remarks: "",

    detailRows: [],

    isLoading: false,
    showSpinner: false,

    branchModalOpen: false,

    referenceModalOpen: false,
    referenceStep: "TRANSACTION",
    referenceType: "Baseline",
    referenceTransactions: [],
    referenceItems: [],
    selectedReference: null,
    selectedItemKeys: [],
    referenceSearch: "",

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
    sfaDate,
    description,
    remarks,
    detailRows,
    isLoading,
    showSpinner,
    branchModalOpen,
    referenceModalOpen,
    referenceStep,
    referenceType,
    referenceTransactions,
    referenceItems,
    selectedReference,
    selectedItemKeys,
    referenceSearch,
    lookupOpen,
    lookupRows,
    lookupSearch,
  } = state;

  const normalizeStatus = (value) => {
    const text = String(value || "").trim().toUpperCase();

    if (!text || text === "O" || text === "OPEN" || text === "DRAFT") {
      return "OPEN";
    }

    if (["A", "P", "APPROVED", "POSTED"].includes(text)) {
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
  const isFormDisabled = readOnly || isApproved || isCancelled;

  const columns = useMemo(
    () => [
      { key: "forecastType", label: "Forecast Type", width: 120 },
      { key: "docNo", label: "Forecast Reference", width: 145 },
      { key: "custCode", label: "Customer", width: 125 },
      { key: "itemCode", label: "Item Code", width: 130 },
      { key: "itemName", label: "Item Description", width: 260 },
      { key: "uomCode", label: "UOM", width: 80 },
      { key: "forecastCutoff", label: "Period", width: 100 },
      { key: "currentForecast", label: "Current Forecast", width: 145 },
      { key: "adjQty", label: "Adjustment Qty", width: 140 },
      { key: "adjForecast", label: "Adjusted Forecast", width: 145 },
      { key: "reason", label: "Reason", width: 240 },
    ],
    [],
  );

  const {
    getColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    renderHeaderContextMenu,
    renderResizableHeader,
  } = useResizableTableColumns(columns);

  const visibleColumns = useMemo(
    () => getOrderedColumns(columns),
    [getOrderedColumns, columns],
  );

  const getFallbackWidth = (key) =>
    columns.find((column) => column.key === key)?.width || 120;

  const getCellStyle = (key, fallbackWidth) => ({
    ...getColumnStyle(key, fallbackWidth),
    ...getFrozenColumnStyle(key, visibleColumns, fallbackWidth, {
      isHeader: false,
    }),
  });

  const sortedRows = useMemo(
    () =>
      getSortedRows(
        (detailRows || []).map((row, originalIndex) => ({
          row,
          originalIndex,
        })),
        (entry, sortKey) => {
          if (["currentForecast", "adjQty", "adjForecast"].includes(sortKey)) {
            return parseFormattedNumber(entry.row?.[sortKey] || 0) || 0;
          }
          return entry.row?.[sortKey] ?? "";
        },
      ),
    [getSortedRows, detailRows],
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
      await useTopDocControlRow(docType);
    } catch (error) {
      console.error("SFA loadDocControl error:", error);
    }
  }, [docType]);

  const handleReset = useCallback(async () => {
    updateState({
      documentID: "",
      documentNo: "",
      status: "OPEN",
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      sfaDate: getToday(),
      description: "",
      remarks: "",
      detailRows: [],
      isLoading: false,
      showSpinner: false,
      branchModalOpen: false,
      referenceModalOpen: false,
      referenceStep: "TRANSACTION",
      referenceType: "Baseline",
      referenceTransactions: [],
      referenceItems: [],
      selectedReference: null,
      selectedItemKeys: [],
      referenceSearch: "",
      lookupOpen: false,
      lookupRows: [],
      lookupSearch: "",
    });

    detailRowsRef.current = [];
    setTopTab("details");

    await loadDocControl();
  }, [defaultBranchCode, defaultBranchName, loadDocControl, updateState]);

  useEffect(() => {
    handleReset();
  }, [resetFlag, handleReset]);

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

    return [];
  };

  const normalizeRows = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((row, index) => ({
      lnNo: row.lnNo || index + 1,
      forecastType: row.forecastType || "Baseline",
      docType:
        row.docType ||
        (String(row.forecastType || "").toUpperCase() === "CUSTOMER"
          ? "SFC"
          : "SFB"),
      docNo: String(row.docNo || "").replace(/^(SFB|SFC)-/i, ""),
      custCode: row.custCode || "",
      itemCode: row.itemCode || "",
      itemName: row.itemName || "",
      uomCode: row.uomCode || "",
      forecastCutoff: row.forecastCutoff || "",
      currentForecast: formatNumber(row.currentForecast || 0, 6),
      adjQty: formatNumber(row.adjQty || 0, 6),
      adjForecast: formatNumber(
        row.adjForecast ??
          ((parseFormattedNumber(row.currentForecast || 0) || 0) +
            (parseFormattedNumber(row.adjQty || 0) || 0)),
        6,
      ),
      reason: row.reason || "",
      groupId:
        row.groupId ||
        (crypto.randomUUID?.() || `SFA-${Date.now()}-${index}`),
    }));

  const fetchTranData = async (
    sfaNo = documentNo,
    fetchBranchCode = branchCode,
    direction = "",
  ) => {
    if (!sfaNo || !fetchBranchCode) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/adjustment/get",
        {
          json_data: {
            branchCode: fetchBranchCode,
            sfaNo: normalizeDocumentNo(sfaNo),
            direction,
          },
        },
      );

      const parsed = extractResult(response);

      if (!parsed?.sfaId && !parsed?.sfaHdId) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return;
      }

      const rows = normalizeRows(
        typeof parsed.dt1 === "string"
          ? JSON.parse(parsed.dt1 || "[]")
          : parsed.dt1 || [],
      );

      updateState({
        documentID: parsed.sfaId || parsed.sfaHdId || "",
        documentNo: normalizeDocumentNo(parsed.sfaNo || sfaNo),
        status: normalizeStatus(
          parsed.status || parsed.docStatus || parsed.sfaStatus || "",
        ),
        branchCode: parsed.branchCode || fetchBranchCode,
        branchName: parsed.branchName || branchName,
        sfaDate: parsed.sfaDate
          ? String(parsed.sfaDate).substring(0, 10)
          : getToday(),
        description: parsed.description || "",
        remarks: parsed.remarks || "",
        detailRows: rows,
      });

      detailRowsRef.current = rows;
    } catch (error) {
      useSwalErrorAlert(
        "Fetch Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to retrieve Sales Forecast - Adjustment.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleHistoryRowPick = async (row) => {
    const historyDocNo = row?.docNo || row?.sfaNo || row?.SFA_NO;
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
    sfaId: documentID || "",
    documentID: documentID || "",
    sfaNo: normalizeDocumentNo(documentNo),
    branchCode,
    sfaDate,
    description,
    remarks,
    userCode: getUserCode(),
    dt1: (detailRows || []).map((row, index) => ({
      lnNo: index + 1,
      forecastType: row.forecastType || "",
      docType: row.docType || "",
      docNo: String(row.docNo || "").replace(/^(SFB|SFC)-/i, ""),
      custCode: row.custCode || "",
      itemCode: row.itemCode || "",
      itemName: row.itemName || "",
      uomCode: row.uomCode || "",
      currentForecast:
        parseFormattedNumber(row.currentForecast || 0) || 0,
      adjQty: parseFormattedNumber(row.adjQty || 0) || 0,
      adjForecast:
        (parseFormattedNumber(row.currentForecast || 0) || 0) +
        (parseFormattedNumber(row.adjQty || 0) || 0),
      reason: row.reason || "",
      forecastCutoff: row.forecastCutoff || "",
      groupId: row.groupId || "",
    })),
  });

  const validateTransaction = () => {
    const errors = [];

    if (!branchCode) errors.push(" - Header - Branch");
    if (!sfaDate) errors.push(" - Header - SFA Date");
    if (!detailRows.length) errors.push(" - Adjustment Details Empty");

    detailRows.forEach((row, index) => {
      if (!row.itemCode) {
        errors.push(` - Adjustment Line # ${index + 1} - Item Code`);
      }

      if (!row.docNo) {
        errors.push(` - Adjustment Line # ${index + 1} - Forecast Reference`);
      }

      const current =
        parseFormattedNumber(row.currentForecast || 0) || 0;
      const adjustment =
        parseFormattedNumber(row.adjQty || 0) || 0;

      if (current + adjustment < 0) {
        errors.push(
          ` - Adjustment Line # ${index + 1} - Adjusted Forecast cannot be negative`,
        );
      }

      if (!String(row.reason || "").trim()) {
        errors.push(` - Adjustment Line # ${index + 1} - Reason`);
      }
    });

    if (errors.length) {
      Swal.fire({
        icon: "warning",
        title: "Validation",
        html: `Please check the following:<br/><br/>${errors.join("<br/>")}`,
      });
      return false;
    }

    return true;
  };

  const getReferenceKey = (row) =>
    [
      row.docType || "",
      row.docNo || "",
      row.custCode || "",
      row.itemCode || "",
      row.forecastCutoff || "",
    ].join("|");

  const loadReferenceTransactions = async (type = referenceType) => {
    if (isFormDisabled) return;

    try {
      updateState({
        isLoading: true,
        referenceType: type,
        referenceStep: "TRANSACTION",
        referenceTransactions: [],
        referenceItems: [],
        selectedReference: null,
        selectedItemKeys: [],
        referenceSearch: "",
      });

      const response = await apiClient.post(
        "/sales-forecast/adjustment/reference",
        {
          json_data: {
            branchCode,
            referenceStage: "TRANSACTION",
            forecastType: type,
          },
        },
      );

      const rows = extractRows(response);

      updateState({
        referenceModalOpen: true,
        referenceTransactions: rows,
      });
    } catch (error) {
      useSwalErrorAlert(
        "Reference Lookup Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to load approved Sales Forecast references.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const openReferenceLookup = async () => {
    if (isFormDisabled) return;

    updateState({ referenceModalOpen: true });
    await loadReferenceTransactions("Baseline");
  };

  const loadReferenceItems = async (referenceRow) => {
    if (!referenceRow) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/adjustment/reference",
        {
          json_data: {
            branchCode,
            referenceStage: "ITEMS",
            forecastType: referenceRow.forecastType,
            docType: referenceRow.docType,
            docNo: String(referenceRow.docNo || "").replace(
              /^(SFB|SFC)-/i,
              "",
            ),
          },
        },
      );

      const rows = normalizeRows(extractRows(response));

      updateState({
        referenceStep: "ITEMS",
        selectedReference: referenceRow,
        referenceItems: rows,
        selectedItemKeys: [],
        referenceSearch: "",
      });
    } catch (error) {
      useSwalErrorAlert(
        "Item Lookup Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to load items from the selected forecast transaction.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const toggleReferenceItem = (row) => {
    const key = getReferenceKey(row);

    updateState({
      selectedItemKeys: selectedItemKeys.includes(key)
        ? selectedItemKeys.filter((itemKey) => itemKey !== key)
        : [...selectedItemKeys, key],
    });
  };

  const toggleAllReferenceItems = (checked, rows) => {
    const visibleKeys = rows.map((row) => getReferenceKey(row));

    updateState({
      selectedItemKeys: checked
        ? Array.from(new Set([...selectedItemKeys, ...visibleKeys]))
        : selectedItemKeys.filter((key) => !visibleKeys.includes(key)),
    });
  };

  const visibleReferenceItems = useMemo(() => {
    const keyword = String(referenceSearch || "").trim().toUpperCase();

    if (!keyword) return referenceItems;

    return referenceItems.filter((row) =>
      [row.itemCode, row.itemName, row.uomCode, row.forecastCutoff].some(
        (value) => String(value || "").toUpperCase().includes(keyword),
      ),
    );
  }, [referenceItems, referenceSearch]);

  const allVisibleReferenceItemsSelected =
    visibleReferenceItems.length > 0 &&
    visibleReferenceItems.every((row) =>
      selectedItemKeys.includes(getReferenceKey(row)),
    );

  const someVisibleReferenceItemsSelected = visibleReferenceItems.some((row) =>
    selectedItemKeys.includes(getReferenceKey(row)),
  );

  const addSelectedReferenceItems = () => {
    const selectedRows = referenceItems.filter((row) =>
      selectedItemKeys.includes(getReferenceKey(row)),
    );

    if (!selectedRows.length) {
      useSwalErrorAlert(
        "Select Items",
        "Please select at least one item from the forecast transaction.",
      );
      return;
    }

    const existingKeys = new Set(
      (detailRowsRef.current || []).map((row) =>
        getReferenceKey(row),
      ),
    );

    const rowsToAdd = selectedRows.filter(
      (row) => !existingKeys.has(getReferenceKey(row)),
    );

    const duplicateCount = selectedRows.length - rowsToAdd.length;

    const nextRows = [
      ...(detailRowsRef.current || []),
      ...rowsToAdd,
    ].map((row, index) => ({
      ...row,
      lnNo: index + 1,
    }));

    detailRowsRef.current = nextRows;

    updateState({
      detailRows: nextRows,
      referenceModalOpen: false,
      referenceStep: "TRANSACTION",
      referenceTransactions: [],
      referenceItems: [],
      selectedReference: null,
      selectedItemKeys: [],
      referenceSearch: "",
    });

    if (duplicateCount > 0) {
      Swal.fire({
        icon: "info",
        title: "Items Added",
        text: `${rowsToAdd.length} item(s) added. ${duplicateCount} duplicate item(s) were skipped.`,
      });
    }
  };

  const closeReferenceLookup = () => {
    updateState({
      referenceModalOpen: false,
      referenceStep: "TRANSACTION",
      referenceTransactions: [],
      referenceItems: [],
      selectedReference: null,
      selectedItemKeys: [],
      referenceSearch: "",
    });
  };

  const saveTransaction = async () => {
    if (isFormDisabled || !validateTransaction()) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/adjustment/upsert",
        { json_data: buildPayload() },
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
          html: String(row.errorMsg || "").replace(/\r?\n/g, "<br/>"),
        });
        return;
      }

      const savedNo = normalizeDocumentNo(row?.sfaNo || documentNo);

      updateState({
        documentID: row?.sfaHdId || row?.sfaId || documentID,
        documentNo: savedNo,
        status: "OPEN",
      });

      useSwalSuccessAlert(
        "Success",
        "Sales Forecast - Adjustment saved successfully.",
      );

      await fetchTranData(savedNo, branchCode);
    } catch (error) {
      useSwalErrorAlert(
        "Save Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to save Sales Forecast - Adjustment.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const approveTransaction = async () => {
    if (!documentID || isFormDisabled || !validateTransaction()) return;

    const confirmation = await useSwalProceedConfirm(
      "Approve Sales Forecast Adjustment?",
      "Approved adjustments will be posted to the forecast movement ledger.",
      "Yes, approve",
      "No",
    );

    if (!confirmation.isConfirmed) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/adjustment/approve",
        { json_data: buildPayload() },
      );

      const row =
        response?.data?.data?.[0] ||
        response?.data?.[0] ||
        response?.data ||
        {};

      if (Number(row?.errorCount || 0) > 0) {
        useSwalErrorAlert(
          "Approve Error",
          row?.errorMsg || "Unable to approve adjustment.",
        );
        return;
      }

      useSwalSuccessAlert(
        "Approved",
        "Sales Forecast - Adjustment approved successfully.",
      );

      await fetchTranData(row?.sfaNo || documentNo, branchCode);
    } catch (error) {
      useSwalErrorAlert(
        "Approve Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to approve Sales Forecast - Adjustment.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const cancelTransaction = async () => {
    if (!documentID || isApproved || isCancelled || readOnly) return;

    const confirmation = await useSwalProceedConfirm(
      "Cancel Transaction?",
      "Do you want to cancel this Sales Forecast - Adjustment?",
      "Yes, cancel",
      "No",
    );

    if (!confirmation.isConfirmed) return;

    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/adjustment/cancel",
        {
          json_data: {
            sfaId: documentID,
            documentID,
            branchCode,
            sfaNo: documentNo,
            userCode: getUserCode(),
          },
        },
      );

      const row =
        response?.data?.data?.[0] ||
        response?.data?.[0] ||
        response?.data ||
        {};

      if (Number(row?.errorCount || 0) > 0) {
        useSwalErrorAlert(
          "Cancel Error",
          row?.errorMsg || "Unable to cancel adjustment.",
        );
        return;
      }

      useSwalSuccessAlert("Success", "Cancelled successfully.");
      await fetchTranData(documentNo, branchCode);
    } catch (error) {
      useSwalErrorAlert(
        "Cancel Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to cancel Sales Forecast - Adjustment.",
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const loadLookup = async () => {
    try {
      updateState({ isLoading: true });

      const response = await apiClient.post(
        "/sales-forecast/adjustment/lookup",
        { json_data: { branchCode } },
      );

      updateState({
        lookupRows: Array.isArray(response?.data?.data)
          ? response.data.data
          : [],
        lookupOpen: true,
        lookupSearch: "",
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  const filteredLookupRows = useMemo(() => {
    const keyword = String(lookupSearch || "").trim().toUpperCase();
    if (!keyword) return lookupRows;

    return lookupRows.filter((row) =>
      [
        row.sfaNo,
        row.sfaDate,
        row.description,
        row.status,
      ].some((value) =>
        String(value || "").toUpperCase().includes(keyword),
      ),
    );
  }, [lookupRows, lookupSearch]);

  const handleCloseBranchModal = (row) => {
    if (row) {
      updateState({
        branchCode: row.branchCode ?? row.BRANCH_CODE ?? "",
        branchName: row.branchName ?? row.BRANCH_NAME ?? "",
      });
    }

    updateState({ branchModalOpen: false });
  };


  const handleAdjustmentChange = (
    rowIndex,
    field,
    value,
    formatNumeric = false,
  ) => {
    if (isFormDisabled) return;

    const rows = [...detailRowsRef.current];
    const row = { ...rows[rowIndex] };

    if (field === "adjQty") {
      const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
      const adj = parseFormattedNumber(cleaned || 0) || 0;
      const current =
        parseFormattedNumber(row.currentForecast || 0) || 0;

      row.adjQty = formatNumeric ? formatNumber(adj, 6) : cleaned;
      row.adjForecast = formatNumber(current + adj, 6);
    } else {
      row[field] = value;
    }

    rows[rowIndex] = row;
    detailRowsRef.current = rows;
    updateState({ detailRows: rows });
  };

  const focusNextAdjustment = (originalIndex) => {
    const displayIndex = sortedRows.findIndex(
      (entry) => entry.originalIndex === originalIndex,
    );
    const next = sortedRows[displayIndex + 1];

    if (!next) return;

    setTimeout(() => {
      const el = document.getElementById(
        `sfa-adj-${next.originalIndex}`,
      );
      el?.focus();
      el?.select?.();
    }, 0);
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
          detailsRoute="/page/SFA"
          showBIRForm={false}
          showCopyForm={false}
          isSaveDisabled={
            isFormDisabled || isLoading || detailRows.length === 0
          }
          isCancelDisabled={
            !documentID || isApproved || isCancelled || readOnly
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
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative items-stretch">
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
                  updateState({ branchModalOpen: true })
                }
              />

              <FieldRenderer
                id="sfaNo"
                label="SFA No."
                type="lookup"
                value={documentNo || ""}
                disabled={Boolean(documentID)}
                onChange={(value) =>
                  updateState({
                    documentNo: normalizeDocumentNo(value),
                  })
                }
                onLookup={loadLookup}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    fetchTranData(documentNo, branchCode);
                  }
                }}
              />

              <FieldRenderer
                id="sfaDate"
                label="SFA Date"
                type="date"
                required
                value={sfaDate || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({ sfaDate: value })
                }
              />

              <FieldRenderer
                id="description"
                label="Description"
                type="text"
                value={description || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({ description: value })
                }
              />
            </div>

            <div className="global-tran-textbox-group-div-ui h-full lg:col-span-2">
              <div className="relative p-2 h-full min-h-full">
                <textarea
                  id="remarks"
                  rows={4}
                  className="peer global-tran-textbox-remarks-ui pt-2 h-[calc(100%-1rem)] min-h-[132px] resize-none"
                  value={remarks}
                  disabled={isFormDisabled}
                  onChange={(event) =>
                    updateState({ remarks: event.target.value })
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
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row items-center justify-between w-full">
              <button
                type="button"
                className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
              >
                Adjustment Details
              </button>

              {!isFormDisabled && (
                <button
                  type="button"
                  className="global-tran-tab-footer-button-add-ui mr-2"
                  disabled={isLoading}
                  onClick={openReferenceLookup}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              )}
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {visibleColumns.map((column) =>
                      renderResizableHeader(
                        column.label,
                        column.key,
                        column.width,
                        { orderedColumns: visibleColumns },
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
                  {sortedRows.map(({ row, originalIndex }) => (
                    <tr
                      key={row.groupId || originalIndex}
                      className="global-tran-tr-ui"
                    >
                      {visibleColumns.map((column) => {
                        const style = getCellStyle(
                          column.key,
                          getFallbackWidth(column.key),
                        );

                        if (column.key === "adjQty") {
                          return (
                            <td
                              key={column.key}
                              className="global-tran-td-ui"
                              style={style}
                            >
                              <input
                                id={`sfa-adj-${originalIndex}`}
                                className="global-tran-td-textbox-ui text-right"
                                value={row.adjQty ?? "0.000000"}
                                disabled={isFormDisabled}
                                onFocus={(event) => event.target.select()}
                                onChange={(event) =>
                                  handleAdjustmentChange(
                                    originalIndex,
                                    "adjQty",
                                    event.target.value,
                                  )
                                }
                                onBlur={(event) =>
                                  handleAdjustmentChange(
                                    originalIndex,
                                    "adjQty",
                                    event.target.value,
                                    true,
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleAdjustmentChange(
                                      originalIndex,
                                      "adjQty",
                                      event.currentTarget.value,
                                      true,
                                    );
                                    focusNextAdjustment(originalIndex);
                                  }
                                }}
                              />
                            </td>
                          );
                        }

                        if (column.key === "reason") {
                          return (
                            <td
                              key={column.key}
                              className="global-tran-td-ui"
                              style={style}
                            >
                              <input
                                className="global-tran-td-textbox-ui"
                                value={row.reason || ""}
                                disabled={isFormDisabled}
                                onChange={(event) =>
                                  handleAdjustmentChange(
                                    originalIndex,
                                    "reason",
                                    event.target.value,
                                  )
                                }
                              />
                            </td>
                          );
                        }

                        if (
                          ["currentForecast", "adjForecast"].includes(
                            column.key,
                          )
                        ) {
                          return (
                            <td
                              key={column.key}
                              className="global-tran-td-ui text-right"
                              style={style}
                            >
                              {formatNumber(row[column.key] || 0, 6)}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={column.key}
                            className="global-tran-td-ui"
                            style={style}
                          >
                            {String(row[column.key] ?? "")}
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
                            onClick={() => {
                              const rows = [...detailRowsRef.current];
                              rows.splice(originalIndex, 1);
                              detailRowsRef.current = rows;
                              updateState({ detailRows: rows });
                            }}
                            title="Delete selected adjustment item"
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {!detailRows.length && (
                    <tr>
                      <td
                        className="global-tran-td-ui py-8 text-center text-gray-500"
                        colSpan={
                          visibleColumns.length +
                          (isFormDisabled ? 0 : 1)
                        }
                      >
                        Click Add to select items from an approved Sales Forecast - Baseline or Sales Forecast - Customer transaction.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {renderHeaderContextMenu?.()}
            </div>
          </div>
        </div>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/sales-forecast/adjustment/getSFAHistory"
          cacheKey={`SFA:${branchCode || ""}:${documentNo || ""}`}
          activeTabKey="SFA_Summary"
          branchCode={branchCode}
          startDate={null}
          endDate={null}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {referenceModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Add Sales Forecast Adjustment Items
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {referenceStep === "TRANSACTION"
                    ? "Select an approved Sales Forecast transaction."
                    : `Select specific items from ${selectedReference?.docType || ""} ${selectedReference?.docNo || ""}.`}
                </p>
              </div>

              <button
                type="button"
                className="global-button-ui"
                onClick={closeReferenceLookup}
              >
                Close
              </button>
            </div>

            <div className="border-b border-gray-200 p-3 dark:border-slate-700">
              {referenceStep === "TRANSACTION" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Transaction Type:
                  </span>

                  <button
                    type="button"
                    className={
                      referenceType === "Baseline"
                        ? "global-tran-button-lookup"
                        : "global-tran-button-lookup bg-blue-50 text-blue-500 font-semibold"
                    }
                    onClick={() =>
                      loadReferenceTransactions("Baseline")
                    }
                    disabled={isLoading}
                  >
                    Sales Forecast - Baseline
                  </button>

                  <button
                    type="button"
                    className={
                      referenceType === "Customer"
                        ? "global-tran-button-lookup"
                        : "global-tran-button-lookup bg-blue-50 text-blue-500 font-semibold"
                    }
                    onClick={() =>
                      loadReferenceTransactions("Customer")
                    }
                    disabled={isLoading}
                  >
                    Sales Forecast - Customer
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="global-tran-button-lookup"
                    onClick={() =>
                      updateState({
                        referenceStep: "TRANSACTION",
                        referenceItems: [],
                        selectedReference: null,
                        selectedItemKeys: [],
                        referenceSearch: "",
                      })
                    }
                  >
                    Back to Transactions
                  </button>

                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Reference:
                    <strong className="ml-1">
                      {selectedReference?.docType} {selectedReference?.docNo}
                    </strong>
                    {selectedReference?.custName
                      ? ` · ${selectedReference.custName}`
                      : ""}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3">
              <input
                className="global-tran-textbox-ui"
                placeholder={
                  referenceStep === "TRANSACTION"
                    ? "Search document no., date, customer, description, or forecast period"
                    : "Search item code, description, UOM, or forecast period"
                }
                value={referenceSearch}
                onChange={(event) =>
                  updateState({
                    referenceSearch: event.target.value,
                  })
                }
              />
            </div>

            <div className="flex-1 overflow-auto px-3 pb-3">
              {referenceStep === "TRANSACTION" ? (
                <table className="min-w-full border-collapse text-xs">
                  <thead className="global-tran-thead-div-ui sticky top-0 z-10">
                    <tr>
                      <th className="global-tran-th-ui">Type</th>
                      <th className="global-tran-th-ui">Doc No.</th>
                      <th className="global-tran-th-ui">Date</th>
                      <th className="global-tran-th-ui">Customer</th>
                      <th className="global-tran-th-ui">Description</th>
                      <th className="global-tran-th-ui">Forecast Start</th>
                      <th className="global-tran-th-ui">Forecast End</th>
                      <th className="global-tran-th-ui">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {referenceTransactions
                      .filter((row) => {
                        const keyword = String(referenceSearch || "")
                          .trim()
                          .toUpperCase();

                        if (!keyword) return true;

                        return [
                          row.forecastType,
                          row.docNo,
                          row.docDate,
                          row.custCode,
                          row.custName,
                          row.description,
                          row.forecastStart,
                          row.forecastEnd,
                        ].some((value) =>
                          String(value || "")
                            .toUpperCase()
                            .includes(keyword),
                        );
                      })
                      .map((row) => (
                        <tr
                          key={`${row.docType}-${row.docNo}`}
                          className="global-tran-tr-ui cursor-pointer"
                          onDoubleClick={() =>
                            loadReferenceItems(row)
                          }
                        >
                          <td className="global-tran-td-ui">
                            {row.forecastType}
                          </td>
                          <td className="global-tran-td-ui">
                            {String(row.docNo || "").replace(
                              /^(SFB|SFC)-/i,
                              "",
                            )}
                          </td>
                          <td className="global-tran-td-ui">
                            {String(row.docDate || "").substring(
                              0,
                              10,
                            )}
                          </td>
                          <td className="global-tran-td-ui">
                            {[row.custCode, row.custName]
                              .filter(Boolean)
                              .join(" - ")}
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
                            <button
                              type="button"
                              className="global-button-ui"
                              onClick={() =>
                                loadReferenceItems(row)
                              }
                            >
                              Select Items
                            </button>
                          </td>
                        </tr>
                      ))}

                    {referenceTransactions.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="global-tran-td-ui py-8 text-center text-gray-500"
                        >
                          No approved {referenceType} forecast transaction found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full border-collapse text-xs">
                  <thead className="global-tran-thead-div-ui sticky top-0 z-10">
                    <tr>
                      <th className="global-tran-th-ui w-[50px] text-center">
                        <input
                          type="checkbox"
                          checked={allVisibleReferenceItemsSelected}
                          ref={(element) => {
                            if (element) {
                              element.indeterminate =
                                !allVisibleReferenceItemsSelected &&
                                someVisibleReferenceItemsSelected;
                            }
                          }}
                          onChange={(event) =>
                            toggleAllReferenceItems(
                              event.target.checked,
                              visibleReferenceItems,
                            )
                          }
                        />
                      </th>
                      <th className="global-tran-th-ui">Item Code</th>
                      <th className="global-tran-th-ui">Item Description</th>
                      <th className="global-tran-th-ui">UOM</th>
                      <th className="global-tran-th-ui">Period</th>
                      <th className="global-tran-th-ui">Current Forecast</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleReferenceItems.map((row) => {
                        const key = getReferenceKey(row);

                        return (
                          <tr
                            key={key}
                            className="global-tran-tr-ui cursor-pointer"
                            onDoubleClick={() =>
                              toggleReferenceItem(row)
                            }
                          >
                            <td className="global-tran-td-ui text-center">
                              <input
                                type="checkbox"
                                checked={selectedItemKeys.includes(
                                  key,
                                )}
                                onChange={() =>
                                  toggleReferenceItem(row)
                                }
                              />
                            </td>
                            <td className="global-tran-td-ui">
                              {row.itemCode}
                            </td>
                            <td className="global-tran-td-ui">
                              {row.itemName}
                            </td>
                            <td className="global-tran-td-ui text-center">
                              {row.uomCode}
                            </td>
                            <td className="global-tran-td-ui text-center">
                              {row.forecastCutoff}
                            </td>
                            <td className="global-tran-td-ui text-right">
                              {formatNumber(
                                row.currentForecast || 0,
                                6,
                              )}
                            </td>
                          </tr>
                        );
                      })}

                    {visibleReferenceItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="global-tran-td-ui py-8 text-center text-gray-500"
                        >
                          The selected transaction has no available forecast items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {referenceStep === "ITEMS" && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-slate-700">
                <span className="text-xs text-gray-500">
                  {selectedItemKeys.length} item(s) selected
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="global-tran-button-lookup"
                    onClick={closeReferenceLookup}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="global-tran-button-lookup"
                    disabled={selectedItemKeys.length === 0}
                    onClick={addSelectedReferenceItems}
                  >
                    Add Selected
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {lookupOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
              <h2 className="text-sm font-semibold">
                Sales Forecast - Adjustment
              </h2>
              <button
                type="button"
                className="global-button-ui"
                onClick={() => updateState({ lookupOpen: false })}
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <input
                className="global-tran-textbox-ui mb-3"
                placeholder="Search SFA No., date, description, or status"
                value={lookupSearch}
                onChange={(event) =>
                  updateState({ lookupSearch: event.target.value })
                }
              />

              <div className="max-h-[55vh] overflow-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="global-tran-thead-div-ui sticky top-0">
                    <tr>
                      <th className="global-tran-th-ui">SFA No.</th>
                      <th className="global-tran-th-ui">Date</th>
                      <th className="global-tran-th-ui">Description</th>
                      <th className="global-tran-th-ui">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLookupRows.map((row) => (
                      <tr
                        key={row.sfaId || row.sfaNo}
                        className="global-tran-tr-ui cursor-pointer"
                        onDoubleClick={async () => {
                          updateState({ lookupOpen: false });
                          await fetchTranData(
                            normalizeDocumentNo(row.sfaNo),
                            row.branchCode || branchCode,
                          );
                        }}
                      >
                        <td className="global-tran-td-ui">
                          {normalizeDocumentNo(row.sfaNo)}
                        </td>
                        <td className="global-tran-td-ui">
                          {String(row.sfaDate || "").substring(0, 10)}
                        </td>
                        <td className="global-tran-td-ui">
                          {row.description}
                        </td>
                        <td className="global-tran-td-ui text-center">
                          {normalizeStatus(row.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesForecastAdjustment;
