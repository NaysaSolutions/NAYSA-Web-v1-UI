import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import Header from "@/NAYSA Cloud/Components/Header.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchProjectBOQ from "@/NAYSA Cloud/Lookup/SearchProjectBOQ.jsx";
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

const DOC_TYPE = "PRJ_MR";
const COMPONENT_KEY = "ProjectMaterialRequisition";
const DETAILS_ROUTE = "/page/ProjectMaterialRequisition";

const emptyDetailRow = (lineNo, decQty = 2) => ({
  lineNo,
  groupId: "",
  invType: "FG",
  itemNo: "",
  itemDesc: "",
  uomCode: "",
  qtyHand: formatNumber(0, decQty),
  quantity: formatNumber(0, decQty),
  unitCost: "0.00",
  amount: "0.00",
  specs: "",
  isQty: formatNumber(0, decQty),
  boqBal: formatNumber(0, decQty),
  boqLineNo: "",
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

const ProjectMaterialRequisition = () => {
  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const { currentUserRow, companyInfo, getAllTopHSDocRow } = useAuth();
  const decQty = Number(companyInfo?.itemDecqtyFG ?? 2);
  const hsDoc = getAllTopHSDocRow?.(DOC_TYPE) || {};
  const documentTitle = `${hsDoc?.docName || "Project Material Requisition"} Transaction`;

  const [topTab, setTopTab] = useState("details");
  const [isLoading, setIsLoading] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [docLookupOpen, setDocLookupOpen] = useState(false);
  const [boqLookupOpen, setBoqLookupOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [detailColumnConfig, setDetailColumnConfig] = useState([]);
  const [state, setState] = useState({
    documentID: "",
    documentNo: "",
    documentDate: useGetCurrentDayV2(),
    documentStatus: "",
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
    boqId: "",
    boqNo: "",
    joRef: "",
    remarks: "",
    detailRows: [],
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
    String(state.documentStatus || "").toUpperCase() === "F" ||
    String(state.status || "").toUpperCase() === "CANCELLED";
  const isFormDisabled = isReadOnly || isCancelled;
  const totalAmount = useMemo(
    () =>
      state.detailRows.reduce(
        (total, row) => total + parseFormattedNumber(row.amount || 0),
        0
      ),
    [state.detailRows]
  );

  const defaultDetailColumnDefs = useMemo(
    () => [
      { key: "lineNo", label: "LN", width: 56 },
      { key: "invType", label: "Type", width: 90 },
      { key: "itemNo", label: "Item Code", width: 150 },
      { key: "itemDesc", label: "Item Name", width: 300 },
      { key: "uomCode", label: "UOM", width: 90 },
      { key: "qtyHand", label: "Qty on Hand", width: 145 },
      { key: "quantity", label: "Quantity", width: 130 },
      { key: "unitCost", label: "Unit Cost", width: 130 },
      { key: "amount", label: "Amount", width: 140 },
      { key: "specs", label: "Specification", width: 360 },
      { key: "boqLineNo", label: "BOQ LN", width: 100 },
      { key: "boqBal", label: "BOQ Balance", width: 135 },
      { key: "isQty", label: "IS/DR Quantity", width: 140 },
    ],
    []
  );

  const detailColumnDefs = useMemo(() => {
    if (!detailColumnConfig.length) return defaultDetailColumnDefs;

    const defaults = new Map(
      defaultDetailColumnDefs.map((column) => [column.key, column])
    );

    return detailColumnConfig
      .filter(
        (column) => Number(column.hidden || 0) !== 1 && defaults.has(column.key)
      )
      .map((column) => ({
        ...defaults.get(column.key),
        label: column.label || defaults.get(column.key).label,
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

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  useEffect(() => {
    let active = true;

    const loadDetailColumnConfig = async () => {
      const config = await useSelectedHSColConfig(
        "PRJ_MR_Detail",
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
    boqId: "",
    boqNo: "",
      joRef: "",
      remarks: "",
      detailRows: [],
      isDocNoDisabled: false,
      isFetchDisabled: false,
    });
  }, [currentUserRow, updateState]);

  const loadDocument = useCallback(
    async (docNo, branchCode = state.branchCode, direction = "") => {
      if (!branchCode || (!docNo && !direction)) return;

      setIsLoading(true);
      try {
        const response = await apiClient.get("/getProjectMaterialRequisition", {
          params: { mrNo: docNo || "", branchCode, direction },
        });
        const data = parseProcedureResult(response);

        if (!data?.mrId) {
          await Swal.fire({
            icon: "info",
            title: "No Records Found",
            text: "Project Material Requisition does not exist.",
          });
          return;
        }

        updateState({
          documentID: data.mrId || "",
          documentNo: data.mrNo || "",
          documentDate: useformatToDatev2(data.mrDate),
          documentStatus: data.documentStatus || "",
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
          boqId: data.boqId || "",
          boqNo: data.boqNo || "",
          joRef: data.joRef || "",
          remarks: data.particular || "",
          detailRows: (data.dt1 || []).map((row, index) => ({
            ...emptyDetailRow(index + 1, decQty),
            ...row,
            lineNo: row.lineNo || index + 1,
            qtyHand: formatNumber(row.qtyHand || 0, decQty),
            quantity: formatNumber(row.quantity || 0, decQty),
            unitCost: formatNumber(row.unitCost || 0, 2),
            amount: formatNumber(row.amount || 0, 2),
            isQty: formatNumber(row.isQty || 0, decQty),
            boqBal: formatNumber(row.boqBal || 0, decQty),
          })),
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
    const params = new URLSearchParams(location.search);
    const docNo = params.get("mrNo");
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

  const selectBOQ = async (selectedBOQ) => {
    const boqNo = typeof selectedBOQ === "string" ? selectedBOQ : selectedBOQ?.boqNo;
    if (!boqNo || !state.branchCode) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get("/getProjectBOQ", {
        params: { boqNo, branchCode: state.branchCode, direction: "" },
      });
      const boq = parseProcedureResult(response);
      if (!boq?.boqId) {
        useSwalErrorAlert("BOQ Not Found", "The selected Bill of Quantity does not exist.");
        return;
      }
      if (String(boq.documentStatus || "").toUpperCase() === "F" || String(boq.docStatus || "").toUpperCase() === "CANCELLED") {
        useSwalErrorAlert("Invalid BOQ", "Cancelled Bill of Quantity cannot be used for a Material Requisition.");
        return;
      }
      updateState({
        boqId: boq.boqId || "",
        boqNo: boq.boqNo || boqNo,
        joRef: boq.joRef || "",
        projCode: boq.projCode || "",
        projName: boq.projName || "",
        custCode: boq.custCode || "",
        custName: boq.custName || "",
        custPo: boq.custPo || "",
        phaseCode: boq.phaseCode || "",
        siteCode: boq.siteCode || "",
        actCode: boq.actCode || "",
        rcCode: boq.rcCode || "",
        rcName: boq.rcName || "",
        remarks: boq.particular || "",
        detailRows: (boq.dt1 || []).map((row, index) => {
          const boqBalance = Math.max(
            0,
            parseFormattedNumber(row.boqQty || 0) - parseFormattedNumber(row.mrQty || 0)
          );
          return {
            ...emptyDetailRow(index + 1, decQty),
            lineNo: index + 1,
            groupId: row.groupId || "",
            invType: row.invType || "",
            itemNo: row.itemNo || "",
            itemDesc: row.itemDesc || "",
            uomCode: row.uomCode || "",
            qtyHand: formatNumber(row.qtyHand || 0, decQty),
            quantity: formatNumber(0, decQty),
            unitCost: formatNumber(row.unitCost || 0, 2),
            amount: "0.00",
            specs: "",
            isQty: formatNumber(row.isQty || 0, decQty),
            boqBal: formatNumber(boqBalance, decQty),
            boqLineNo: row.lineNo || index + 1,
          };
        }),
      });
      setBoqLookupOpen(false);
    } catch (error) {
      useSwalErrorAlert("BOQ Retrieval Error", error?.response?.data?.details || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeDetailRow = (index) => {
    updateState({
      detailRows: state.detailRows
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, lineNo: rowIndex + 1 })),
    });
  };

  const validateBeforeSave = () => {
    if (!state.branchCode || !state.documentDate || !state.boqNo || !state.projCode) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Branch, MR Date, BOQ No., and Project Code are required.",
      });
      return false;
    }

    const requisitionRows = state.detailRows.filter(
      (row) => parseFormattedNumber(row.quantity || 0) > 0
    );
    if (!requisitionRows.length) {
      Swal.fire({
        icon: "warning",
        title: "Required Details",
        text: "Enter a Quantity for at least one Material Requisition detail.",
      });
      return false;
    }

    const invalidLine = state.detailRows.findIndex(
      (row) => parseFormattedNumber(row.quantity || 0) > parseFormattedNumber(row.boqBal || 0)
    );
    if (invalidLine >= 0) {
      useSwalErrorAlert("Invalid Quantity", `Line ${invalidLine + 1}: Quantity cannot exceed the BOQ Balance.`);
      return false;
    }

    const negativeLine = state.detailRows.findIndex(
      (row) => parseFormattedNumber(row.quantity || 0) < 0
    );
    if (negativeLine >= 0) {
      useSwalErrorAlert("Invalid Quantity", `Line ${negativeLine + 1}: Negative Quantity is not allowed.`);
      return false;
    }

    return true;
  };

  const saveDocument = async () => {
    if (!canSave || isFormDisabled || !validateBeforeSave()) return;

    setIsLoading(true);
    try {
      const payload = {
        branchCode: state.branchCode,
        mrNo: state.documentNo,
        mrId: state.documentID,
        mrDate: state.documentDate,
        boqId: state.boqId,
        boqNo: state.boqNo,
        projCode: state.projCode,
        projName: state.projName,
        custCode: state.custCode,
        custName: state.custName,
        custPo: state.custPo,
        actCode: state.actCode,
        phaseCode: state.phaseCode,
        siteCode: state.siteCode,
        particular: state.remarks,
        userCode: currentUserRow?.userCode || "",
        dt1: state.detailRows.filter((row) => parseFormattedNumber(row.quantity || 0) > 0).map((row, index) => ({
          lineNo: index + 1,
          groupId: row.groupId || "",
          invType: row.invType || "",
          itemNo: row.itemNo || "",
          itemDesc: row.itemDesc || "",
          uomCode: row.uomCode || "",
          qtyHand: parseFormattedNumber(row.qtyHand || 0),
          quantity: parseFormattedNumber(row.quantity || 0),
          unitCost: parseFormattedNumber(row.unitCost || 0),
          amount: parseFormattedNumber(row.amount || 0),
          specs: row.specs || "",
          isQty: parseFormattedNumber(row.isQty || 0),
          boqBal: parseFormattedNumber(row.boqBal || 0),
          boqLineNo: Number(row.boqLineNo || 0),
        })),
        dt2: [],
      };

      const response = await apiClient.post("/upsertProjectMaterialRequisition", {
        json_data: payload,
      });
      const result = response?.data?.data?.[0] || {};

      if (result.errorCount) {
        throw new Error(result.errorMsg || "Unable to save Project Material Requisition.");
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
    if (!canCancel || !state.documentID || isCancelled) return;
    setCancelModalOpen(true);
  };

  const handleCloseCancel = async (confirmation) => {
    if (!confirmation) {
      setCancelModalOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/cancelProjectMaterialRequisition", {
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
    : state.status || (state.documentID ? "OPEN" : "NEW");

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
          showPost={false}
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
          isCancelDisabled={!canCancel || !state.documentID || isCancelled}
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
              <h1
                className={`global-tran-stat-text-ui uppercase ${
                  isCancelled ? "text-red-600" : "text-blue-700"
                }`}
              >
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
                id="mrNo"
                label="MR No."
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
                  MR Date
                </label>
              </div>
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="boqNo"
                label="BOQ No."
                required
                type="lookup"
                value={state.boqNo}
                disabled={isFormDisabled}
                onLookup={() => setBoqLookupOpen(true)}
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
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Bill of Quantity Details
            </button>
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
                    sortedDetailRows.map(({ row, originalIndex }) => (
                      <tr key={originalIndex} className="global-tran-tr-ui">
                        {orderedDetailColumns.map((column) => (
                          <td
                            key={column.key}
                            className={`global-tran-td-ui ${
                              column.key === "lineNo"
                                ? "text-center"
                                : ["qtyHand", "quantity", "unitCost", "amount", "isQty", "boqBal", "boqLineNo"].includes(column.key)
                                  ? "text-right"
                                  : ""
                            }`}
                            style={getDetailCellStyle(column)}
                          >
                            {column.key === "lineNo"
                              ? originalIndex + 1
                              : detailInput(
                                  originalIndex,
                                  column.key,
                                  ["qtyHand", "isQty", "boqBal"].includes(column.key)
                                    ? { readOnly: true, numeric: true, decimals: decQty }
                                    : ["unitCost", "amount"].includes(column.key)
                                      ? { readOnly: true, numeric: true, decimals: 2 }
                                      : column.key === "boqLineNo"
                                        ? { readOnly: true, numeric: true, decimals: 0 }
                                        : ["invType", "itemNo", "itemDesc", "uomCode"].includes(column.key)
                                          ? { readOnly: true }
                                          : column.key === "quantity"
                                            ? { numeric: true, decimals: decQty }
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
                                onClick={() => removeDetailRow(originalIndex)}
                                className="global-tran-td-button-delete-ui"
                                title="Remove detail"
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

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui" />
            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-1">
              {[["Amount", totalAmount]].map(([label, amount]) => (
                <Fragment key={label}>
                  <div className="global-tran-tab-footer-total-label-ui">{label}:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{formatNumber(amount, 2)}</div>
                </Fragment>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getProjectMaterialRequisitionHistory"
          cacheKey={`PRJ_MR:${state.branchCode}:${state.startDate}:${state.endDate}`}
          activeTabKey="PRJ_MR_Summary"
          branchCode={state.branchCode}
          startDate={state.startDate}
          endDate={state.endDate}
          status="All"
          historyExportName="Project Material Requisition History"
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
          params={{ branchCode: state.branchCode, branchName: state.branchName, docType: DOC_TYPE, documentTitle, fieldNo: "mrNo" }}
          docNo={state.documentNo}
          onRetrieve={async ({ docNo, modalClose }) => { await loadDocument(docNo, state.branchCode); setDocLookupOpen(Boolean(modalClose)); }}
          onSelected={({ docNo }) => { updateState({ documentNo: docNo }); setDocLookupOpen(false); }}
          onResponse={{ documentNo: state.documentNo }}
          onClose={() => setDocLookupOpen(false)}
        />
      )}

      <SearchProjectBOQ
        isOpen={boqLookupOpen}
        branchCode={state.branchCode}
        onClose={(boq) => {
          setBoqLookupOpen(false);
          if (boq) selectBOQ(boq);
        }}
      />

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
            DocumentName: hsDoc?.docName || "Project Material Requisition",
            BranchName: state.branchName,
            DocumentNo: state.documentNo,
          }}
          onClose={() => setAttachModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectMaterialRequisition;


