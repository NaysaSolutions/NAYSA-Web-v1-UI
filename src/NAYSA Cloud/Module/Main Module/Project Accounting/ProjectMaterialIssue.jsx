import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardCheck, faMinus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import Header from "@/NAYSA Cloud/Components/Header.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchProjectMaterialRequisition from "@/NAYSA Cloud/Lookup/SearchProjectMaterialRequisition.jsx";
import SearchGlobalItemPickingModal from "@/NAYSA Cloud/Lookup/SearchGlobalItemPickingModal.jsx";
import CancelTranModal from "@/NAYSA Cloud/Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData.js";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert,
  useSwalProceedConfirm,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates.js";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

const DOC_TYPE = "PRJ_IS";
const COMPONENT_KEY = "ProjectMaterialIssue";
const DETAILS_ROUTE = "/page/ProjectMaterialIssue";

const emptyDetailRow = (lineNo) => ({
  lineNo,
  groupId: "",
  mrId: "",
  mrLineNo: "",
  invType: "FG",
  itemNo: "",
  itemDesc: "",
  uomCode: "",
  requestQty: "0.000000",
  allocatedQty: "0.000000",
  allocationStatus: "F",
  quantity: "0.000000",
  unitCost: "0.00",
  amount: "0.00",
  boqBal: "0.000000",
  mrBalance: "0.000000",
});

const parseProcedureResult = (response) => {
  const raw = response?.data?.data?.[0]?.result;
  if (!raw) return null;
  if (typeof raw === "object") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const formatGlReferenceDate = (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  const isoDate = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[2]}/${isoDate[3]}/${isoDate[1]}`;

  const displayDate = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (displayDate) {
    return `${displayDate[1].padStart(2, "0")}/${displayDate[2].padStart(2, "0")}/${displayDate[3]}`;
  }

  return useformatToDatev2(rawValue);
};

const ProjectMaterialIssue = () => {
  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const { currentUserRow, companyInfo, getAllTopHSDocRow } = useAuth();
  const hsDoc = getAllTopHSDocRow?.(DOC_TYPE) || {};
  const documentTitle = `${hsDoc?.docName || "Project Material Issue Slip"} Transaction`;
  const glCurrDefault = companyInfo?.currCode || "PHP";

  const [topTab, setTopTab] = useState("details");
  const [isLoading, setIsLoading] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [docLookupOpen, setDocLookupOpen] = useState(false);
  const [mrLookupOpen, setMrLookupOpen] = useState(false);
  const [stockLookupIndex, setStockLookupIndex] = useState(null);
  const [pickingStockRows, setPickingStockRows] = useState([]);
  const [existingAllocations, setExistingAllocations] = useState([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [detailColumnConfig, setDetailColumnConfig] = useState([]);
  const [state, setState] = useState({
    documentID: "",
    documentNo: "",
    documentDate: useGetCurrentDayV2(),
    documentStatus: "",
    documentCancelled: "",
    status: "OPEN",
    noReprints: 0,
    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "",
    projCode: "",
    projName: "",
    custCode: "",
    custName: "",
    actCode: "",
    phaseCode: "",
    siteCode: "",
    projStat: "",
    rcCode: "",
    rcName: "",
    custPo: "",
    mrId: "",
    mrNo: "",
    joRef: "",
    remarks: "",
    detailRows: [],
    detailRowsGL: [],
    isDocNoDisabled: false,
    isFetchDisabled: false,
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
  });

  const updateState = useCallback((updates) => {
    setState((previous) => ({ ...previous, ...updates }));
  }, []);

  const {
    pagePermission,
    isReadOnly,
    isFullAccess,
    canSave,
    canCancel,
  } = usePagePermission({
    componentKey: COMPONENT_KEY,
    menuName: documentTitle,
    debug: false,
  });

  const isCancelled =
    String(state.documentCancelled || "").toUpperCase() === "Y" ||
    String(state.status || "").toUpperCase() === "CANCELLED";
  const isPosted = String(state.documentStatus || "").toUpperCase() === "F";
  const isFormDisabled = isReadOnly || isCancelled || isPosted;
  const totalAmount = useMemo(
    () =>
      state.detailRows.reduce(
        (total, row) => total + parseFormattedNumber(row.amount || 0),
        0
      ),
    [state.detailRows]
  );
  const totalRequiredQuantity = useMemo(
    () => state.detailRows.reduce(
      (total, row) => total + parseFormattedNumber(row.requestQty || 0),
      0
    ),
    [state.detailRows]
  );
  const totalAllocatedQuantity = useMemo(
    () => state.detailRows.reduce(
      (total, row) => total + parseFormattedNumber(row.allocatedQty || 0),
      0
    ),
    [state.detailRows]
  );
  const totalDebit = useMemo(
    () => state.detailRowsGL.reduce((total, row) => total + parseFormattedNumber(row.debit || 0), 0),
    [state.detailRowsGL]
  );
  const totalCredit = useMemo(
    () => state.detailRowsGL.reduce((total, row) => total + parseFormattedNumber(row.credit || 0), 0),
    [state.detailRowsGL]
  );

  const defaultDetailColumnDefs = useMemo(
    () => [
      { key: "lineNo", label: "LN", width: 56 },
      { key: "invType", label: "Type", width: 90 },
      { key: "allocationStatus", label: "Picking Status", width: 140 },
      { key: "itemNo", label: "Item Code", width: 150 },
      { key: "itemDesc", label: "Item Name", width: 260 },
      { key: "uomCode", label: "UOM", width: 90 },
      { key: "requestQty", label: "Required Quantity", width: 150 },
      { key: "allocatedQty", label: "Allocated Quantity", width: 155 },
      { key: "unitCost", label: "Unit Cost", width: 130 },
      { key: "amount", label: "Amount", width: 140 },
      { key: "boqBal", label: "BOQ Balance", width: 135 },
    ],
    []
  );

  const detailColumnDefs = useMemo(() => {
    if (!detailColumnConfig.length) return defaultDetailColumnDefs;

    const configured = new Map(detailColumnConfig.map((column) => [column.key, column]));

    return defaultDetailColumnDefs
      .filter((column) => Number(configured.get(column.key)?.hidden || 0) !== 1)
      .map((column) => ({
        ...column,
        label: configured.get(column.key)?.label || column.label,
      }));
  }, [defaultDetailColumnDefs, detailColumnConfig]);

  const {
    getColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    renderHeaderContextMenu,
    renderResizableHeader,
  } = useResizableTableColumns(detailColumnDefs);

  const orderedDetailColumns = getOrderedColumns(detailColumnDefs);
  const sortedDetailRows = getSortedRows(
    state.detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) =>
      sortKey === "lineNo"
        ? entry.originalIndex + 1
        : entry.row?.[sortKey] ?? ""
  );

  const getDetailCellStyle = (column) => ({
    ...getColumnStyle(column.key, column.width),
    ...getFrozenColumnStyle(
      column.key,
      orderedDetailColumns,
      column.width,
      { isHeader: false }
    ),
  });

  const glColumnDefs = useMemo(
    () => [
      { key: "recNo", label: "LN", width: 56 },
      { key: "acctCode", label: "Account Code", width: 150 },
      { key: "rcCode", label: "RC Code", width: 120 },
      { key: "sltypeCode", label: "SL Type", width: 110 },
      { key: "slCode", label: "SL Code", width: 130 },
      { key: "particular", label: "Particulars", width: 320 },
      { key: "debit", label: `Debit (${glCurrDefault})`, width: 140 },
      { key: "credit", label: `Credit (${glCurrDefault})`, width: 140 },
      { key: "slRefNo", label: "SL Ref. No.", width: 120 },
      { key: "slRefDate", label: "SL Ref. Date", width: 130 },
      { key: "remarks", label: "Remarks", width: 220 },
    ],
    [glCurrDefault]
  );

  const {
    getColumnStyle: getGlColumnStyle,
    getFrozenColumnStyle: getGlFrozenColumnStyle,
    getOrderedColumns: getOrderedGlColumns,
    getSortedRows: getSortedGlRows,
    renderHeaderContextMenu: renderGlHeaderContextMenu,
    renderResizableHeader: renderGlResizableHeader,
  } = useResizableTableColumns(glColumnDefs);

  const orderedGlColumns = getOrderedGlColumns(glColumnDefs);
  const sortedGlRows = getSortedGlRows(
    state.detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "recNo" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );
  const getGlCellStyle = (column) => ({
    ...getGlColumnStyle(column.key, column.width),
    ...getGlFrozenColumnStyle(column.key, orderedGlColumns, column.width, { isHeader: false }),
  });

  const renderGlCell = (column, row, originalIndex) => {
    const value = column.key === "recNo"
      ? originalIndex + 1
      : column.key === "slRefDate"
        ? formatGlReferenceDate(row.slRefDate)
        : ["debit", "credit"].includes(column.key)
          ? formatNumber(row[column.key] || 0, 2)
          : row[column.key] || "";

    return (
      <td
        key={column.key}
        className={`global-tran-td-ui ${column.key === "recNo" ? "text-center" : ["debit", "credit"].includes(column.key) ? "text-right" : ""}`}
        style={getGlCellStyle(column)}
      >
        {value}
      </td>
    );
  };

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  useEffect(() => {
    let active = true;

    const loadDetailColumnConfig = async () => {
      const config = await useSelectedHSColConfig(
        "PRJ_IS_Detail",
        currentUserRow?.userCode || ""
      );

      if (active && Array.isArray(config)) {
        setDetailColumnConfig(config);
      }
    };

    loadDetailColumnConfig();

    return () => {
      active = false;
    };
  }, [currentUserRow?.userCode]);

  const resetForm = useCallback(() => {
    updateState({
      documentID: "",
      documentNo: "",
      documentDate: useGetCurrentDayV2(),
      documentStatus: "",
      documentCancelled: "",
      status: "OPEN",
      noReprints: 0,
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || "",
      projCode: "",
      projName: "",
      custCode: "",
      custName: "",
      actCode: "",
      phaseCode: "",
      siteCode: "",
      projStat: "",
      rcCode: "",
      rcName: "",
      custPo: "",
      mrId: "",
      mrNo: "",
      joRef: "",
      remarks: "",
      detailRows: [],
      detailRowsGL: [],
      isDocNoDisabled: false,
      isFetchDisabled: false,
    });
  }, [currentUserRow, updateState]);

  const loadDocument = useCallback(
    async (docNo, branchCode = state.branchCode, direction = "") => {
      if (!branchCode || (!docNo && !direction)) return;

      setIsLoading(true);
      try {
        const response = await apiClient.get("/getProjectMaterialIssue", {
          params: { isNo: docNo || "", branchCode, direction },
        });
        const data = parseProcedureResult(response);

        if (!data?.isId) {
          await Swal.fire({
            icon: "info",
            title: "No Records Found",
            text: "Project Material Issue Slip does not exist.",
          });
          return;
        }

        updateState({
          documentID: data.isId || "",
          documentNo: data.isNo || "",
          documentDate: useformatToDatev2(data.isDate),
          documentStatus: data.documentStatus || "",
          documentCancelled: data.documentCancelled || "",
          status: data.docStatus || "OPEN",
          noReprints: data.noReprints || 0,
          branchCode: data.branchCode || branchCode,
          branchName: data.branchName || state.branchName,
          projCode: data.projCode || "",
          projName: data.projName || "",
          custCode: data.custCode || "",
          custName: data.custName || "",
          actCode: data.actCode || "",
          phaseCode: data.phaseCode || "",
          siteCode: data.siteCode || "",
          projStat: data.projStat || "",
          rcCode: data.rcCode || "",
          rcName: data.rcName || "",
          custPo: data.custPo || "",
          mrId: data.mrId || "",
          mrNo: data.referenceNo || "",
          joRef: data.miReference || "",
          remarks: data.particular || "",
          detailRows: (data.dt1 || []).map((row, index) => ({
            ...emptyDetailRow(index + 1),
            ...row,
            lineNo: row.lineNo || index + 1,
            requestQty: formatNumber(row.requestQty ?? row.quantity ?? 0, 6),
            allocatedQty: formatNumber(row.allocatedQty ?? row.quantity ?? 0, 6),
            allocationStatus: row.allocationStatus || "F",
            quantity: formatNumber(row.quantity || 0, 6),
            unitCost: formatNumber(row.unitCost || 0, 2),
            amount: formatNumber(row.amount || 0, 2),
            boqBal: formatNumber(row.boqBal || 0, 6),
            mrBalance: formatNumber(row.mrBalance ?? row.requestQty ?? row.quantity ?? 0, 6),
          })),
          detailRowsGL: (data.dt2 || []).map((row, index) => {
            const usesLegacyRequiredSl =
              String(row.slCode || "").trim().toUpperCase() === "REQ SL";

            return {
              ...row,
              recNo: row.recNo || index + 1,
              sltypeCode: usesLegacyRequiredSl ? "CU" : row.sltypeCode,
              slCode: usesLegacyRequiredSl ? data.custCode || "" : row.slCode,
              slName: usesLegacyRequiredSl ? data.custName || "" : row.slName,
            };
          }),
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title: "Retrieval Error",
          text:
            error?.response?.data?.details ||
            error?.response?.data?.message ||
            error.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [state.branchCode, state.branchName, updateState]
  );

  useEffect(() => {
    const refreshFinalizedDocument = (event) => {
      const finalizedIds = event?.detail?.documentIds || [];
      if (state.documentID && finalizedIds.includes(state.documentID)) {
        loadDocument(state.documentNo, state.branchCode);
      }
    };

    window.addEventListener("project-mi-finalized", refreshFinalizedDocument);
    return () => window.removeEventListener("project-mi-finalized", refreshFinalizedDocument);
  }, [loadDocument, state.branchCode, state.documentID, state.documentNo]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("isNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      loadDocument(docNo, branchCode);
    }
  }, [loadDocument, location.search]);

  const updateDetail = (index, field, value) => {
    setState((previous) => ({
      ...previous,
      detailRows: previous.detailRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const changed = { ...row, [field]: value };
        if (["quantity", "unitCost"].includes(field)) {
          const amount = parseFormattedNumber(changed.quantity) * parseFormattedNumber(changed.unitCost);
          changed.amount = formatNumber(amount, 2);
        }
        return changed;
      }),
    }));
  };

  const selectMR = async (selectedMR) => {
    const mrNo = typeof selectedMR === "string" ? selectedMR : selectedMR?.mrNo;
    if (!mrNo || !state.branchCode) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get("/getProjectMaterialRequisition", {
        params: { mrNo, branchCode: state.branchCode, direction: "" },
      });
      const mr = parseProcedureResult(response);
      if (!mr?.mrId) {
        useSwalErrorAlert("MR Not Found", "The selected Material Requisition does not exist.");
        return;
      }
      if (String(mr.documentStatus || "").toUpperCase() === "F" || String(mr.docStatus || "").toUpperCase() === "CANCELLED") {
        useSwalErrorAlert("Invalid MR", "Cancelled Material Requisition cannot be used for a Material Issue Slip.");
        return;
      }
      updateState({
        mrId: mr.mrId || "",
        mrNo: mr.mrNo || mrNo,
        joRef: mr.joRef || "",
        projCode: mr.projCode || "",
        projName: mr.projName || "",
        custCode: mr.custCode || "",
        custName: mr.custName || "",
        custPo: mr.custPo || "",
        phaseCode: mr.phaseCode || "",
        siteCode: mr.siteCode || "",
        actCode: mr.actCode || "",
        rcCode: mr.rcCode || "",
        rcName: mr.rcName || "",
        remarks: mr.particular || "",
        detailRows: (mr.dt1 || []).filter((row) => String(row.invType || "").toUpperCase() !== "SV").map((row, index) => {
          const mrBalance = Math.max(0, parseFormattedNumber(row.quantity || 0) - parseFormattedNumber(row.isQty || 0));
          return {
            ...emptyDetailRow(index + 1),
            lineNo: index + 1,
            groupId: row.groupId || "",
            mrId: mr.mrId || "",
            mrLineNo: row.lineNo || index + 1,
            invType: row.invType || "",
            itemNo: row.itemNo || "",
            itemDesc: row.itemDesc || "",
            uomCode: row.uomCode || "",
            requestQty: formatNumber(mrBalance, 6),
            allocatedQty: formatNumber(0, 6),
            allocationStatus: "F",
            quantity: formatNumber(0, 6),
            unitCost: formatNumber(0, 2),
            amount: formatNumber(0, 2),
            boqBal: formatNumber(row.boqBal || 0, 6),
            mrBalance: formatNumber(mrBalance, 6),
          };
        }),
      });
      setMrLookupOpen(false);
    } catch (error) {
      useSwalErrorAlert("MR Retrieval Error", error?.response?.data?.details || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openStockAllocation = async (index) => {
    const row = state.detailRows[index];
    if (!state.documentID || !state.documentNo) {
      useSwalErrorAlert("Save Required", "Save the Material Issue Slip before allocating stock.");
      return;
    }
    if (!row?.groupId || parseFormattedNumber(row.requestQty || 0) <= 0) return;

    setIsLoading(true);
    try {
      const response = await apiClient.post("/getProjectMaterialIssueOpenStock", {
        json_data: {
          isId: state.documentID,
          isNo: state.documentNo,
          branchCode: state.branchCode,
          groupId: row.groupId,
          lineNo: row.lineNo,
          invType: row.invType,
          itemNo: row.itemNo,
          requestedQty: parseFormattedNumber(row.requestQty || 0),
        },
      });
      const result = parseProcedureResult(response) || {};
      setPickingStockRows(Array.isArray(result.stockRows) ? result.stockRows : []);
      setExistingAllocations(Array.isArray(result.existingAllocations) ? result.existingAllocations : []);
      setStockLookupIndex(index);
    } catch (error) {
      useSwalErrorAlert("Stock Retrieval Failed", error?.response?.data?.details || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const buildSavePayload = (detailRows, glRows) => ({
    branchCode: state.branchCode,
    isNo: state.documentNo,
    isId: state.documentID,
    isDate: state.documentDate,
    mrId: state.mrId,
    referenceNo: state.mrNo,
    miReference: state.joRef,
    projCode: state.projCode,
    projName: state.projName,
    custCode: state.custCode,
    custName: state.custName,
    custPo: state.custPo,
    actCode: state.actCode,
    phaseCode: state.phaseCode,
    siteCode: state.siteCode,
    rcCode: state.rcCode,
    particular: state.remarks,
    userCode: currentUserRow?.userCode || "",
    dt1: detailRows.filter((row) => parseFormattedNumber(row.requestQty || 0) > 0).map((row, index) => ({
      lineNo: index + 1,
      groupId: row.groupId || "",
      mrId: row.mrId || state.mrId,
      mrLineNo: Number(row.mrLineNo || 0),
      invType: row.invType || "",
      itemNo: row.itemNo || "",
      itemDesc: row.itemDesc || "",
      uomCode: row.uomCode || "",
      requestQty: parseFormattedNumber(row.requestQty || 0),
      allocatedQty: parseFormattedNumber(row.allocatedQty || 0),
      allocationStatus: row.allocationStatus || "F",
      unitCost: parseFormattedNumber(row.unitCost || 0),
      amount: parseFormattedNumber(row.amount || 0),
      boqBal: parseFormattedNumber(row.boqBal || 0),
    })),
    dt2: glRows.map((row, index) => ({
      recNo: index + 1,
      acctCode: row.acctCode || "",
      sltypeCode: row.sltypeCode || "",
      slCode: row.slCode || "",
      rcCode: row.rcCode || state.rcCode || "",
      particular: row.particular || "",
      debit: parseFormattedNumber(row.debit || 0),
      credit: parseFormattedNumber(row.credit || 0),
      slRefNo: row.slRefNo || "",
      slRefDate: row.slRefDate || null,
      remarks: row.remarks || "",
      dt1Lineno: Number(row.dt1Lineno || 0),
    })),
  });

  const autoGenerateAndSave = async (detailRows) => {
    let glRows = [];
    if (detailRows.some((row) => parseFormattedNumber(row.allocatedQty || 0) > 0)) {
      const glResponse = await apiClient.post("/generateProjectMaterialIssueEntries", {
        json_data: {
          isId: state.documentID,
          isDate: state.documentDate,
          custCode: state.custCode,
          custName: state.custName,
          rcCode: state.rcCode,
        },
      });
      glRows = glResponse?.data?.data || [];
      if (glRows[0]?.errorCount) throw new Error(glRows[0].errorMsg || "Unable to generate General Ledger entries.");
    }

    const saveResponse = await apiClient.post("/upsertProjectMaterialIssue", {
      json_data: buildSavePayload(detailRows, glRows),
    });
    const saveResult = saveResponse?.data?.data?.[0] || {};
    if (saveResult.errorCount) throw new Error(saveResult.errorMsg || "Unable to save Material Issue Slip.");

    await loadDocument(saveResult.docNo || state.documentNo, state.branchCode);
  };

  const saveStockAllocation = async (allocation) => {
    if (stockLookupIndex === null || !allocation) return;
    const row = state.detailRows[stockLookupIndex];
    setIsLoading(true);
    try {
      const response = await apiClient.post("/saveProjectMaterialIssueAllocation", {
        json_data: {
          isId: state.documentID,
          isNo: state.documentNo,
          isDate: state.documentDate,
          branchCode: state.branchCode,
          groupId: row.groupId,
          lineNo: row.lineNo,
          invType: row.invType,
          itemNo: row.itemNo,
          requestedQty: parseFormattedNumber(row.requestQty || 0),
          userCode: currentUserRow?.userCode || "",
          dt1: allocation.allocations || [],
        },
      });
      const result = parseProcedureResult(response) || {};
      const allocatedQty = parseFormattedNumber(result.totalAllocated || 0);
      const itemAmount = parseFormattedNumber(result.itemAmount || 0);
      const updatedRows = state.detailRows.map((item, index) => index === stockLookupIndex ? {
        ...item,
        allocatedQty: formatNumber(allocatedQty, 6),
        quantity: formatNumber(allocatedQty, 6),
        allocationStatus: result.allocationStatus || "F",
        unitCost: formatNumber(allocatedQty > 0 ? itemAmount / allocatedQty : 0, 2),
        amount: formatNumber(itemAmount, 2),
      } : item);
      setStockLookupIndex(null);
      await autoGenerateAndSave(updatedRows);
    } catch (error) {
      useSwalErrorAlert("Allocation Failed", error?.response?.data?.details || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const buildAutoAllocations = (stockRows, requestedQty, row) => {
    let remainingQty = Math.max(parseFormattedNumber(requestedQty || 0), 0);
    return [...(stockRows || [])]
      .sort((a, b) => Number(a.priorityNo || 0) - Number(b.priorityNo || 0))
      .reduce((allocations, stockRow) => {
        const availableQty = parseFormattedNumber(stockRow.remainingAvailable || 0);
        if (stockRow.isBlocked || availableQty <= 0 || remainingQty <= 0) return allocations;
        const pickQty = Math.min(availableQty, remainingQty);
        remainingQty -= pickQty;
        allocations.push({
          ...stockRow,
          groupId: row.groupId,
          itemCode: row.itemNo,
          fifoLocId: stockRow.fifoLocId || stockRow.fgFifoLocId || null,
          wacLocId: stockRow.wacLocId || stockRow.fgWacLocId || null,
          warehouseCode: stockRow.warehouseCode,
          locationCode: stockRow.locationCode,
          qualityStatus: stockRow.qualityStatus,
          bestBeforeDate: stockRow.bestBeforeDate,
          pickQty,
        });
        return allocations;
      }, []);
  };

  const handleBulkAllocation = async (mode) => {
    const isRelease = mode === "release";
    const actionLabel = isRelease ? "Release All" : "Allocate All";
    if (!state.documentID || !state.documentNo) {
      useSwalErrorAlert("Item Picking", `Save the Material Issue Slip before using ${actionLabel}.`);
      return;
    }

    const confirmation = await useSwalProceedConfirm(
      `${actionLabel}?`,
      isRelease
        ? "This will release all inventory allocations for the MI details."
        : "This will automatically allocate available stock for all eligible MI details.",
      "Yes"
    );
    if (!confirmation?.isConfirmed) return;

    setIsLoading(true);
    try {
      const updatedRows = [...state.detailRows];
      for (let index = 0; index < updatedRows.length; index += 1) {
        const row = updatedRows[index];
        if (!row.groupId || !row.itemNo || String(row.invType || "").toUpperCase() === "SV") continue;

        let allocations = [];
        if (!isRelease) {
          const stockResponse = await apiClient.post("/getProjectMaterialIssueOpenStock", {
            json_data: {
              isId: state.documentID,
              isNo: state.documentNo,
              branchCode: state.branchCode,
              groupId: row.groupId,
              lineNo: row.lineNo,
              invType: row.invType,
              itemNo: row.itemNo,
              requestedQty: parseFormattedNumber(row.requestQty || 0),
            },
          });
          const stockResult = parseProcedureResult(stockResponse) || {};
          allocations = buildAutoAllocations(stockResult.stockRows || [], row.requestQty, row);
        }

        const allocationResponse = await apiClient.post("/saveProjectMaterialIssueAllocation", {
          json_data: {
            isId: state.documentID,
            isNo: state.documentNo,
            isDate: state.documentDate,
            branchCode: state.branchCode,
            groupId: row.groupId,
            lineNo: row.lineNo,
            invType: row.invType,
            itemNo: row.itemNo,
            requestedQty: parseFormattedNumber(row.requestQty || 0),
            userCode: currentUserRow?.userCode || "",
            dt1: allocations,
          },
        });
        const result = parseProcedureResult(allocationResponse) || {};
        const allocatedQty = parseFormattedNumber(result.totalAllocated || 0);
        const itemAmount = parseFormattedNumber(result.itemAmount || 0);
        updatedRows[index] = {
          ...row,
          allocatedQty: formatNumber(allocatedQty, 6),
          quantity: formatNumber(allocatedQty, 6),
          allocationStatus: result.allocationStatus || "F",
          unitCost: formatNumber(allocatedQty > 0 ? itemAmount / allocatedQty : 0, 2),
          amount: formatNumber(itemAmount, 2),
        };
      }

      await autoGenerateAndSave(updatedRows);
    } catch (error) {
      useSwalErrorAlert(`${actionLabel} Failed`, error?.response?.data?.details || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDetailRow = async (index) => {
    const row = state.detailRows[index];
    if (!row) return;
    if (state.detailRows.length === 1) {
      useSwalErrorAlert("Delete MI Detail", "At least one Material Issue detail is required.");
      return;
    }

    const allocatedQty = parseFormattedNumber(row.allocatedQty || 0);
    if (allocatedQty > 0) {
      const confirmation = await useSwalProceedConfirm(
        "Delete Allocated MI Detail?",
        "This line already has allocated quantity. Deleting it will release its inventory allocation.",
        "Yes"
      );
      if (!confirmation?.isConfirmed) return;

      try {
        setIsLoading(true);
        await apiClient.post("/saveProjectMaterialIssueAllocation", {
          json_data: {
            isId: state.documentID,
            isNo: state.documentNo,
            isDate: state.documentDate,
            branchCode: state.branchCode,
            groupId: row.groupId,
            lineNo: row.lineNo,
            invType: row.invType,
            itemNo: row.itemNo,
            requestedQty: parseFormattedNumber(row.requestQty || 0),
            userCode: currentUserRow?.userCode || "",
            dt1: [],
          },
        });
      } catch (error) {
        useSwalErrorAlert("Delete MI Detail", error?.response?.data?.details || error.message);
        return;
      } finally {
        setIsLoading(false);
      }
    }

    const updatedRows = state.detailRows
      .filter((_, rowIndex) => rowIndex !== index)
      .map((item, rowIndex) => ({ ...item, lineNo: rowIndex + 1 }));
    updateState({ detailRows: updatedRows, detailRowsGL: [] });
    if (allocatedQty > 0) {
      try {
        setIsLoading(true);
        await autoGenerateAndSave(updatedRows);
      } catch (error) {
        useSwalErrorAlert("Delete MI Detail", error?.response?.data?.details || error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const generateGLEntries = async () => {
    if (!state.documentID || !state.detailRows.some((row) => parseFormattedNumber(row.allocatedQty || 0) > 0)) {
      useSwalErrorAlert("GL Generation Failed", "Allocate stock before generating General Ledger entries.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post("/generateProjectMaterialIssueEntries", {
        json_data: {
          isId: state.documentID,
          isDate: state.documentDate,
          custCode: state.custCode,
          custName: state.custName,
          rcCode: state.rcCode,
        },
      });
      const rows = response?.data?.data || [];
      const error = rows[0];

      if (error?.errorCount) {
        throw new Error(error.errorMsg || "Unable to generate General Ledger entries.");
      }

      updateState({ detailRowsGL: rows.map((row, index) => ({ ...row, recNo: index + 1 })) });
    } catch (error) {
      useSwalErrorAlert(
        "GL Generation Failed",
        error?.response?.data?.details || error?.response?.data?.message || error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateBeforeSave = () => {
    if (!state.branchCode || !state.documentDate || !state.mrNo || !state.projCode) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Branch, Issue Date, MR No., and Project Code are required.",
      });
      return false;
    }

    const requisitionRows = state.detailRows.filter((row) => parseFormattedNumber(row.requestQty || 0) > 0);
    if (!requisitionRows.length) {
      Swal.fire({
        icon: "warning",
        title: "Required Details",
        text: "The selected Material Requisition has no available quantity.",
      });
      return false;
    }

    const issuedByMrLine = state.detailRows.reduce((totals, row) => {
      const key = `${row.mrId}|${row.mrLineNo}`;
      totals[key] = (totals[key] || 0) + parseFormattedNumber(row.requestQty || 0);
      return totals;
    }, {});
    const invalidLine = state.detailRows.findIndex((row) => issuedByMrLine[`${row.mrId}|${row.mrLineNo}`] > parseFormattedNumber(row.mrBalance || 0));
    if (invalidLine >= 0) {
      useSwalErrorAlert("Invalid Quantity", `Line ${invalidLine + 1}: Quantity cannot exceed the MR Balance.`);
      return false;
    }

    const negativeLine = state.detailRows.findIndex((row) => parseFormattedNumber(row.requestQty || 0) < 0);
    if (negativeLine >= 0) {
      useSwalErrorAlert("Invalid Quantity", `Line ${negativeLine + 1}: Negative Quantity is not allowed.`);
      return false;
    }

    return true;
  };

  const saveDocument = async () => {
    if (!canSave || isFormDisabled || !validateBeforeSave()) return;

    const hasAllocation = state.detailRows.some((row) => parseFormattedNumber(row.allocatedQty || 0) > 0);

    setIsLoading(true);
    try {
      let glRows = state.detailRowsGL;

      if (hasAllocation) {
        const glResponse = await apiClient.post("/generateProjectMaterialIssueEntries", {
          json_data: {
            isId: state.documentID,
            isDate: state.documentDate,
            custCode: state.custCode,
            custName: state.custName,
            rcCode: state.rcCode,
          },
        });
        const generatedRows = glResponse?.data?.data || [];
        const generationError = generatedRows[0];

        if (generationError?.errorCount) {
          throw new Error(
            generationError.errorMsg || "Unable to generate General Ledger entries."
          );
        }

        glRows = generatedRows.map((row, index) => ({
          ...row,
          recNo: index + 1,
        }));
        updateState({ detailRowsGL: glRows });
      }

      const response = await apiClient.post("/upsertProjectMaterialIssue", {
        json_data: buildSavePayload(state.detailRows, glRows),
      });
      const result = response?.data?.data?.[0] || {};

      if (result.errorCount) {
        throw new Error(result.errorMsg || "Unable to save Project Material Issue Slip.");
      }

      const savedDocNo = result.docNo || state.documentNo;
      await loadDocument(savedDocNo, state.branchCode);
      useSwalshowSaveSuccessDialog(resetForm, printDocument);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Save Error",
        text:
          error?.response?.data?.details ||
          error?.response?.data?.message ||
          error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const printDocument = async () => {
    if (!state.documentID || isCancelled) return;

    setIsLoading(true);
    try {
      await useHandlePrint(
        state.documentID,
        DOC_TYPE,
        "Inline",
        currentUserRow?.userCode || ""
      );
    } catch (error) {
      useSwalErrorAlert(
        "Print Error",
        error?.response?.data?.details ||
          error?.response?.data?.message ||
          error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openAttachment = () => {
    if (!isFullAccess || !state.documentID) return;
    setAttachModalOpen(true);
  };

  const cancelDocument = () => {
    if (!canCancel || !state.documentID || isCancelled || isPosted) return;
    setCancelModalOpen(true);
  };

  const handleCloseCancel = async (confirmation) => {
    if (!confirmation) {
      setCancelModalOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/cancelProjectMaterialIssue", {
        userPassword: confirmation.password,
        userCode: currentUserRow?.userCode || "",
        json_data: {
          docCode: DOC_TYPE,
          documentID: state.documentID,
          userCode: currentUserRow?.userCode || "",
          reason: String(confirmation.reason || "").trim(),
        },
      });
      await loadDocument(state.documentNo, state.branchCode);
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Cancellation completed.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Cancellation Error",
        text:
          error?.response?.data?.details ||
          error?.response?.data?.message ||
          error.message,
      });
    } finally {
      setIsLoading(false);
      setCancelModalOpen(false);
    }
  };

  const detailInput = (index, field, options = {}) => {
    const row = state.detailRows[index];
    const common =
      "global-tran-td-inputclass-ui w-full border-0 bg-transparent text-xs focus:outline-none focus:ring-0";

    if (options.date) {
      return (
        <DateFormatInput
          id={`${field}${index}`}
          value={row[field] || ""}
          disabled={isFormDisabled}
          className={common}
          updateState={(updates) =>
            updateDetail(index, field, updates[`${field}${index}`])
          }
        />
      );
    }

    if (options.select) {
      return (
        <select
          value={row[field] || ""}
          disabled={isFormDisabled || options.readOnly}
          className={`${common} cursor-pointer`}
          onChange={(event) => updateDetail(index, field, event.target.value)}
        >
          <option value=""></option>
          {options.select.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        data-detail-field={field}
        data-row-index={index}
        value={row[field] ?? ""}
        disabled={isFormDisabled || options.readOnly}
        className={`${common} ${options.numeric ? "text-right" : ""}`}
        onChange={(event) => {
          const value = options.numeric
            ? event.target.value.replace(/[^0-9.]/g, "")
            : event.target.value;
          updateDetail(index, field, value);
        }}
        onFocus={(event) => {
          if (
            options.numeric &&
            parseFormattedNumber(event.target.value || 0) === 0
          ) {
            updateDetail(index, field, "");
          }
        }}
        onBlur={() => {
          if (options.numeric) {
            updateDetail(
              index,
              field,
              formatNumber(row[field] || 0, options.decimals ?? 2)
            );
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && options.numeric) {
            event.preventDefault();
            event.currentTarget.blur();
            const nextInput = document.querySelector(
              `[data-detail-field="${field}"][data-row-index="${index + 1}"]`
            );
            nextInput?.focus();
          }
        }}
      />
    );
  };

  const statusLabel = isCancelled
    ? "CANCELLED"
    : isPosted
      ? "FINALIZED"
      : state.status || (state.documentID ? "OPEN" : "NEW");
  const normalizedStatus = String(statusLabel).trim().toUpperCase();
  const statusColor = normalizedStatus === "CANCELLED"
    ? "global-tran-stat-text-closed-ui"
    : "global-tran-stat-text-open-ui";

  return (
    <div className="global-tran-main-div-ui">
      {isLoading && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={DOC_TYPE}
          activeTopTab={topTab}
          detailsRoute={DETAILS_ROUTE}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation
          showActions={topTab === "details"}
          showResetAction={topTab === "details"}
          showBIRForm={false}
          showCopyForm={false}
          onReset={resetForm}
          onSave={saveDocument}
          onCancel={cancelDocument}
          onPrint={printDocument}
          onAttach={openAttachment}
          printData={{
            documentNo: state.documentNo,
            documentID: state.documentID,
            branchCode: state.branchCode,
            branchName: state.branchName,
            docType: DOC_TYPE,
          }}
          isSaveDisabled={!canSave || isFormDisabled || !state.detailRows.length}
          isResetDisabled={isLoading}
          isCancelDisabled={!canCancel || !state.documentID || isCancelled || isPosted}
          isPrintDisabled={!state.documentID || isCancelled}
          isAttachDisabled={!isFullAccess || !state.documentID}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>
          <div className="global-tran-headerstat-div-ui flex items-center gap-6">
            <PermissionBadge
              permission={pagePermission}
              isReadOnly={isReadOnly}
              isFullAccess={isFullAccess}
            />
            <div>
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>
                {statusLabel}
              </h1>
            </div>
          </div>
        </div>

        <section className="global-tran-header-div-ui">
          <div className="global-tran-header-tab-div-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="space-y-3 lg:col-span-3">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                type="lookup"
                value={state.branchName}
                disabled={state.isFetchDisabled || isFormDisabled}
                onLookup={() => setBranchModalOpen(true)}
              />
              <FieldRenderer
                id="isNo"
                label="IS No."
                type="lookup"
                value={state.documentNo}
                disabled={state.isDocNoDisabled}
                onLookup={() => setDocLookupOpen(true)}
                onChange={(value) => updateState({ documentNo: value })}
                onBlur={() =>
                  !state.documentID &&
                  state.documentNo &&
                  loadDocument(state.documentNo, state.branchCode)
                }
              />
              <div className="relative w-full">
                <div
                  className={`flex items-stretch global-ref-textbox-ui ${
                    !isFormDisabled
                      ? "global-ref-textbox-enabled"
                      : "global-ref-textbox-disabled"
                  }`}
                >
                  <DateFormatInput
                    id="documentDate"
                    value={state.documentDate}
                    disabled={isFormDisabled}
                    className="peer flex-grow border-none bg-transparent px-3 focus:outline-none"
                    updateState={updateState}
                  />
                </div>
                <label htmlFor="documentDate" className="global-ref-floating-label">
                  Issue Date
                </label>
              </div>
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="mrReferenceNo"
                label="MR No."
                required
                type="lookup"
                value={state.mrNo}
                disabled={isFormDisabled}
                onLookup={() => setMrLookupOpen(true)}
              />
              <FieldRenderer
                id="projCode"
                label="Project Code"
                required
                value={state.projCode}
                readOnly
                disabled
              />
              <FieldRenderer
                id="projName"
                label="Project Name"
                value={state.projName}
                readOnly
                disabled
              />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="custCode"
                label="Customer Code"
                value={state.custCode}
                disabled
              />
              <FieldRenderer
                id="custName"
                label="Customer Name"
                value={state.custName}
                disabled
              />
              <FieldRenderer
                id="custPo"
                label="Cust Ref No."
                value={state.custPo}
                readOnly
                disabled
              />
            </div>

              </div>

              <div className="relative px-2 pt-0">
                <textarea
                  id="remarks"
                  rows={3}
                  value={state.remarks}
                  disabled={isFormDisabled}
                  onChange={(event) => updateState({ remarks: event.target.value })}
                  className="peer global-tran-textbox-remarks-ui pt-2"
                />
                <label htmlFor="remarks" className="global-tran-floating-label-remarks">
                  Remarks
                </label>
              </div>
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="phaseCode"
                label="Phase Code"
                value={state.phaseCode}
                readOnly
                disabled
              />
              <FieldRenderer
                id="siteCode"
                label="Site Code"
                value={state.siteCode}
                readOnly
                disabled
              />
              <FieldRenderer
                id="rcCode"
                label="Responsibility Center Code"
                value={state.rcCode}
                readOnly
                disabled
              />
              <FieldRenderer id="joRef" label="JO No." value={state.joRef} disabled readOnly />
            </div>

          </div>
        </section>

        <section className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button type="button" className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Item Details
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedDetailColumns.map((column) =>
                      renderResizableHeader(
                        column.label,
                        column.key,
                        column.width,
                        { orderedColumns: orderedDetailColumns }
                      )
                    )}
                    {!isFormDisabled && (
                      <th
                        className="global-tran-th-ui sticky right-0 top-0 bg-blue-100 dark:bg-blue-900"
                        style={transactionActionsHeaderStyle}
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {sortedDetailRows.length ? (
                    sortedDetailRows.map(({ originalIndex }) => (
                      <tr key={originalIndex} className="global-tran-tr-ui">
                        {orderedDetailColumns.map((column) => (
                          <td
                            key={column.key}
                            className={`global-tran-td-ui ${
                              column.key === "lineNo"
                                ? "text-center"
                                : ["requestQty", "allocatedQty", "unitCost", "amount", "boqBal", "mrBalance"].includes(column.key)
                                  ? "text-right"
                                  : ""
                            }`}
                            style={getDetailCellStyle(column)}
                          >
                            {column.key === "lineNo"
                              ? originalIndex + 1
                              : column.key === "allocationStatus"
                                ? ({ F: "For Allocation", T: "Partially Allocated", P: "Allocated" }[state.detailRows[originalIndex]?.allocationStatus] || "For Allocation")
                              : column.key === "allocatedQty"
                                ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={formatNumber(state.detailRows[originalIndex]?.allocatedQty || 0, 6)}
                                      readOnly
                                      className="global-tran-td-inputclass-ui min-w-0 flex-1 border-0 bg-transparent text-right text-xs"
                                    />
                                    <button
                                      type="button"
                                      title="Open Item Picking / Allocation"
                                      aria-label="Open Item Picking / Allocation"
                                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-[11px] text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                                      disabled={!state.documentID || !state.detailRows[originalIndex]?.groupId || parseFormattedNumber(state.detailRows[originalIndex]?.requestQty || 0) <= 0}
                                      onClick={() => openStockAllocation(originalIndex)}
                                    >
                                      <FontAwesomeIcon icon={faClipboardCheck} />
                                    </button>
                                  </div>
                                )
                              : detailInput(
                                  originalIndex,
                                  column.key,
                                  ["requestQty", "allocatedQty", "boqBal", "mrBalance"].includes(column.key)
                                    ? { readOnly: true, numeric: true, decimals: 6 }
                                    : ["unitCost", "amount"].includes(column.key)
                                      ? { readOnly: true, numeric: true, decimals: 2 }
                                      : ["invType", "itemNo", "itemDesc", "uomCode"].includes(column.key)
                                          ? { readOnly: true }
                                            : {}
                                )}
                          </td>
                        ))}
                        {!isFormDisabled && (
                          <td
                            className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black"
                            style={transactionActionsCellStyle}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => deleteDetailRow(originalIndex)}
                                className="global-tran-td-button-delete-ui"
                                title={parseFormattedNumber(state.detailRows[originalIndex]?.allocatedQty || 0) > 0 ? "Delete row and release picking allocation" : "Delete row"}
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : null}
                </tbody>
              </table>
              {renderHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui relative">
            <div className="global-tran-tab-footer-button-div-ui">
              {!isFormDisabled && state.detailRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="min-h-[36px] w-[132px] rounded-lg border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:border-blue-500 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center whitespace-nowrap focus:outline-none"
                    disabled={isLoading}
                    onClick={() => handleBulkAllocation("allocate")}
                  >
                    <FontAwesomeIcon icon={faClipboardCheck} className="mr-2" />
                    Allocate All
                  </button>

                  <button
                    type="button"
                    className="min-h-[36px] w-[132px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center whitespace-nowrap focus:outline-none"
                    disabled={isLoading || !state.detailRows.some((row) => parseFormattedNumber(row.allocatedQty || 0) > 0)}
                    onClick={() => handleBulkAllocation("release")}
                  >
                    <FontAwesomeIcon icon={faMinus} className="mr-2" />
                    Release All
                  </button>
                </div>
              )}
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-1">
              {[
                ["Total Required Quantity", totalRequiredQuantity, 6],
                ["Total Allocated Quantity", totalAllocatedQuantity, 6],
                ["Total Amount", totalAmount, 2],
              ].map(([label, amount, decimals]) => (
                <Fragment key={label}>
                  <div className="global-tran-tab-footer-total-label-ui">{label}:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{formatNumber(amount, decimals)}</div>
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        <section className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button type="button" className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                General Ledger
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={generateGLEntries}
                disabled={isLoading || isFormDisabled || !state.detailRows.length}
                className="global-tran-button-generateGL"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                {isLoading ? "Generating..." : "Generate GL Entries"}
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedGlColumns.map((column) => renderGlResizableHeader(column.label, column.key, column.width, { orderedColumns: orderedGlColumns }))}
                  </tr>
                </thead>
                <tbody className="relative">
                  {sortedGlRows.map(({ row, originalIndex }) => (
                    <tr key={`${row.recNo || "gl"}-${originalIndex}`} className="global-tran-tr-ui">
                      {orderedGlColumns.map((column) => renderGlCell(column, row, originalIndex))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderGlHeaderContextMenu()}
            </div>
          </div>
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui" />
            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Total Debit ({glCurrDefault}):</label>
                <label className="global-tran-tab-footer-total-value-ui">{formatNumber(totalDebit, 2)}</label>
              </div>
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Total Credit ({glCurrDefault}):</label>
                <label className="global-tran-tab-footer-total-value-ui">{formatNumber(totalCredit, 2)}</label>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getProjectMaterialIssueHistory"
          cacheKey={`PRJ_IS:${state.branchCode}:${state.startDate}:${state.endDate}`}
          activeTabKey="PRJ_IS_Summary"
          branchCode={state.branchCode}
          startDate={state.startDate}
          endDate={state.endDate}
          status="All"
          historyExportName="Project Material Issue Slip History"
          onRowDoubleClick={(row) => {
            if (row?.docNo && row?.branchCode) {
              loadDocument(row.docNo, row.branchCode);
              setTopTab("details");
            }
          }}
        />
      </div>

      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={(branch) => {
            if (branch) {
              updateState({
                branchCode: branch.branchCode || "",
                branchName: branch.branchName || "",
              });
            }
            setBranchModalOpen(false);
          }}
        />
      )}

      {docLookupOpen && (
        <AllTranDocNo
          isOpen
          params={{ branchCode: state.branchCode, branchName: state.branchName, docType: DOC_TYPE, documentTitle, fieldNo: "isNo" }}
          docNo={state.documentNo}
          onRetrieve={async ({ docNo, modalClose }) => { await loadDocument(docNo, state.branchCode); setDocLookupOpen(Boolean(modalClose)); }}
          onSelected={({ docNo }) => { updateState({ documentNo: docNo }); setDocLookupOpen(false); }}
          onResponse={{ documentNo: state.documentNo }}
          onClose={() => setDocLookupOpen(false)}
        />
      )}

      <SearchProjectMaterialRequisition
        isOpen={mrLookupOpen}
        branchCode={state.branchCode}
        onClose={(mr) => {
          setMrLookupOpen(false);
          if (mr) selectMR(mr);
        }}
      />

      {stockLookupIndex !== null && (
        <SearchGlobalItemPickingModal
          isOpen
          transaction={{
            sourceDocType: DOC_TYPE,
            sourceDocTypeName: "Project Material Issue Slip",
            sourceDocNo: state.documentNo,
            sourceLineNo: state.detailRows[stockLookupIndex]?.lineNo,
            groupId: state.detailRows[stockLookupIndex]?.groupId,
            customerCode: state.custCode,
            customerName: state.custName,
            itemCode: state.detailRows[stockLookupIndex]?.itemNo,
            itemName: state.detailRows[stockLookupIndex]?.itemDesc,
            requestedQty: parseFormattedNumber(state.detailRows[stockLookupIndex]?.requestQty || 0),
          }}
          stockRows={pickingStockRows}
          existingAllocations={existingAllocations}
          onClose={() => setStockLookupIndex(null)}
          onConfirm={saveStockAllocation}
        />
      )}

      {cancelModalOpen && (
        <CancelTranModal
          isOpen={cancelModalOpen}
          onClose={handleCloseCancel}
        />
      )}

      {attachModalOpen && (
        <AttachDocumentModal
          isOpen={attachModalOpen}
          params={{
            DocumentID: state.documentID,
            DocumentName: hsDoc?.docName || "Project Material Issue Slip",
            BranchName: state.branchName,
            DocumentNo: state.documentNo,
          }}
          onClose={() => setAttachModalOpen(false)}
        />
      )}

    </div>
  );
};

export default ProjectMaterialIssue;




