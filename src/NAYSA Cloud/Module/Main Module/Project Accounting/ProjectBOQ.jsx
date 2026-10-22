import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import Header from "@/NAYSA Cloud/Components/Header.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchProjectRef from "@/NAYSA Cloud/Lookup/SearchProjectRef.jsx";
import SearchProjectJobOrderDetail from "@/NAYSA Cloud/Lookup/SearchProjectJobOrderDetail.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import VATLookupModal from "@/NAYSA Cloud/Lookup/SearchVATRef.jsx";
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

const DOC_TYPE = "PRJ_BQ";
const COMPONENT_KEY = "ProjectBOQ";
const DETAILS_ROUTE = "/page/ProjectBOQ";

const emptyDetailRow = (lineNo) => ({
  lineNo,
  groupId: "",
  invType: "FG",
  itemNo: "",
  itemDesc: "",
  uomCode: "",
  qtyHand: "0.000000",
  boqQty: "0.000000",
  unitCost: "0.00",
  amount: "0.00",
  markupRate: "0.00",
  markupAmount: "0.00",
  totalAmount: "0.00",
  vatCode: "",
  vatAmount: "0.00",
  grossAmount: "0.00",
  mrQty: "0.000000",
  isQty: "0.000000",
  blQty: "0.000000",
  prQty: "0.000000",
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

const ProjectBOQ = () => {
  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const { currentUserRow, getAllTopHSDocRow, getAllTopVatRow } = useAuth();
  const hsDoc = getAllTopHSDocRow?.(DOC_TYPE) || {};
  const documentTitle = `${hsDoc?.docName || "Bill of Quantity"} Transaction`;

  const [topTab, setTopTab] = useState("details");
  const [isLoading, setIsLoading] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [docLookupOpen, setDocLookupOpen] = useState(false);
  const [joLookupOpen, setJoLookupOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [detailColumnConfig, setDetailColumnConfig] = useState([]);
  const [itemLookupIndex, setItemLookupIndex] = useState(null);
  const [vatLookupIndex, setVatLookupIndex] = useState(null);
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
    type: "O",
    joRef: "",
    joAmount: "0.00",
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
  const boqTypeOptions = [
    { value: "O", label: "Original Contract" },
    { value: "A", label: "Additive" },
    { value: "D", label: "Deductive" },
  ];
  const totalAmount = useMemo(
    () =>
      state.detailRows.reduce(
        (total, row) => total + parseFormattedNumber(row.totalAmount || 0),
        0
      ),
    [state.detailRows]
  );
  const amountTotal = useMemo(
    () => state.detailRows.reduce((total, row) => total + parseFormattedNumber(row.amount || 0), 0),
    [state.detailRows]
  );
  const markupTotal = useMemo(
    () => state.detailRows.reduce((total, row) => total + parseFormattedNumber(row.markupAmount || 0), 0),
    [state.detailRows]
  );
  const vatTotal = useMemo(
    () => state.detailRows.reduce((total, row) => total + parseFormattedNumber(row.vatAmount || 0), 0),
    [state.detailRows]
  );
  const grossTotal = useMemo(
    () => state.detailRows.reduce((total, row) => total + parseFormattedNumber(row.grossAmount || 0), 0),
    [state.detailRows]
  );

  const defaultDetailColumnDefs = useMemo(
    () => [
      { key: "lineNo", label: "LN", width: 56 },
      { key: "invType", label: "Type", width: 90 },
      { key: "itemNo", label: "Item Code", width: 150 },
      { key: "itemDesc", label: "Item Name", width: 300 },
      { key: "uomCode", label: "UOM", width: 90 },
      { key: "qtyHand", label: "Qty on Hand", width: 130 },
      { key: "boqQty", label: "BOQ Quantity", width: 140 },
      { key: "unitCost", label: "Unit Cost", width: 130 },
      { key: "amount", label: "Amount", width: 140 },
      { key: "markupRate", label: "Mark Up %", width: 120 },
      { key: "markupAmount", label: "Mark Up Amount", width: 155 },
      { key: "totalAmount", label: "Total Amount", width: 145 },
      { key: "vatCode", label: "VAT Code", width: 110 },
      { key: "vatAmount", label: "VAT Amount", width: 140 },
      { key: "grossAmount", label: "Gross Amount", width: 145 },
      { key: "mrQty", label: "MR Quantity", width: 125 },
      { key: "isQty", label: "IS Quantity", width: 125 },
      { key: "blQty", label: "BL Quantity", width: 125 },
      { key: "prQty", label: "PR Quantity", width: 125 },
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
        "PRJ_BOQ_Detail",
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
      type: "O",
      joRef: "",
      joAmount: "0.00",
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
        const response = await apiClient.get("/getProjectBOQ", {
          params: { boqNo: docNo || "", branchCode, direction },
        });
        const data = parseProcedureResult(response);

        if (!data?.boqId) {
          await Swal.fire({
            icon: "info",
            title: "No Records Found",
            text: "Bill of Quantity does not exist.",
          });
          return;
        }

        updateState({
          documentID: data.boqId || "",
          documentNo: data.boqNo || "",
          documentDate: useformatToDatev2(data.boqDate),
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
          type: data.type || "O",
          joRef: data.joRef || "",
          joAmount: formatNumber(data.joAmount || 0, 2),
          remarks: data.particular || "",
          detailRows: (data.dt1 || []).map((row, index) => ({
            ...emptyDetailRow(index + 1),
            ...row,
            lineNo: row.lineNo || index + 1,
            uomCode: String(row.invType || "").toUpperCase() === "SV" ? (row.uomCode || "LOT") : (row.uomCode || ""),
            qtyHand: formatNumber(row.qtyHand || 0, 6),
            boqQty: formatNumber(row.boqQty || 0, 6),
            unitCost: formatNumber(row.unitCost || 0, 2),
            amount: formatNumber(row.amount || 0, 2),
            markupRate: formatNumber(row.markupRate || 0, 2),
            markupAmount: formatNumber(row.markupAmount || 0, 2),
            totalAmount: formatNumber(row.totalAmount || 0, 2),
            vatAmount: formatNumber(row.vatAmount || 0, 2),
            grossAmount: formatNumber(row.grossAmount || 0, 2),
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
    const docNo = params.get("boqNo");
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
        if (field === "invType") {
          changed.itemNo = "";
          changed.itemDesc = "";
          changed.uomCode = String(value || "").toUpperCase() === "SV" ? "LOT" : "";
          changed.qtyHand = formatNumber(0, 6);
          changed.unitCost = formatNumber(0, 2);
          changed.amount = formatNumber(0, 2);
          changed.markupAmount = formatNumber(0, 2);
          changed.totalAmount = formatNumber(0, 2);
          changed.vatAmount = formatNumber(0, 2);
          changed.grossAmount = formatNumber(0, 2);
          changed.vatCode = "";
        }
        if (["boqQty", "unitCost", "markupRate"].includes(field)) {
          const amount = parseFormattedNumber(changed.boqQty) * parseFormattedNumber(changed.unitCost);
          const markupAmount = amount * parseFormattedNumber(changed.markupRate) / 100;
          changed.amount = formatNumber(amount, 2);
          changed.markupAmount = formatNumber(markupAmount, 2);
          changed.totalAmount = formatNumber(amount + markupAmount, 2);
          const vatRow = getAllTopVatRow?.(changed.vatCode);
          const vatRate = parseFormattedNumber(vatRow?.vatRate || 0);
          const vatAmount = (amount + markupAmount) * vatRate / 100;
          changed.vatAmount = formatNumber(vatAmount, 2);
          changed.grossAmount = formatNumber(amount + markupAmount + vatAmount, 2);
        }
        return changed;
      }),
    }));
  };

  const openJobOrderLookup = () => {
    if (!String(state.projCode || "").trim()) {
      useSwalErrorAlert("Project Code Required", "Select a Project Code before selecting a JO No.");
      return;
    }
    setJoLookupOpen(true);
  };

  const addDetailRow = () => {
    if (!String(state.projCode || "").trim()) {
      useSwalErrorAlert(
        "Bill of Quantity Required",
        "Select a Project Code before adding BOQ Details."
      );
      return;
    }

    updateState({
      detailRows: [
        ...state.detailRows,
        emptyDetailRow(state.detailRows.length + 1),
      ],
    });
  };

  const removeDetailRow = (index) => {
    updateState({
      detailRows: state.detailRows
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, lineNo: rowIndex + 1 })),
    });
  };

  const validateBeforeSave = () => {
    if (!state.branchCode || !state.documentDate || !state.projCode || !state.joRef) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Branch, BOQ Date, Project Code, and JO No. are required.",
      });
      return false;
    }

    if (!state.detailRows.length) {
      Swal.fire({
        icon: "warning",
        title: "Required Details",
        text: "Add at least one Bill of Quantity detail.",
      });
      return false;
    }

    const invalidLine = state.detailRows.findIndex(
      (row) => !String(row.itemNo || row.itemDesc || "").trim() || parseFormattedNumber(row.boqQty) <= 0
    );
    if (invalidLine >= 0) {
      useSwalErrorAlert("Required BOQ Detail", `Line ${invalidLine + 1}: Item and BOQ Quantity are required.`);
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
        boqNo: state.documentNo,
        boqId: state.documentID,
        boqDate: state.documentDate,
        projCode: state.projCode,
        projName: state.projName,
        custCode: state.custCode,
        custName: state.custName,
        custPo: state.custPo,
        joRef: state.joRef,
        joAmount: parseFormattedNumber(state.joAmount || 0),
        actCode: state.actCode,
        phaseCode: state.phaseCode,
        siteCode: state.siteCode,
        type: state.type,
        particular: state.remarks,
        userCode: currentUserRow?.userCode || "",
        dt1: state.detailRows.map((row, index) => ({
          lineNo: index + 1,
          groupId: row.groupId || "",
          invType: row.invType || "",
          itemNo: row.itemNo || "",
          itemDesc: row.itemDesc || "",
          uomCode: row.uomCode || "",
          qtyHand: parseFormattedNumber(row.qtyHand || 0),
          boqQty: parseFormattedNumber(row.boqQty || 0),
          unitCost: parseFormattedNumber(row.unitCost || 0),
          amount: parseFormattedNumber(row.amount || 0),
          markupRate: parseFormattedNumber(row.markupRate || 0),
          markupAmount: parseFormattedNumber(row.markupAmount || 0),
          totalAmount: parseFormattedNumber(row.totalAmount || 0),
          vatCode: row.vatCode || "",
          vatAmount: parseFormattedNumber(row.vatAmount || 0),
          grossAmount: parseFormattedNumber(row.grossAmount || 0),
          mrQty: parseFormattedNumber(row.mrQty || 0),
          isQty: parseFormattedNumber(row.isQty || 0),
          blQty: parseFormattedNumber(row.blQty || 0),
          prQty: parseFormattedNumber(row.prQty || 0),
        })),
        dt2: [],
      };

      const response = await apiClient.post("/upsertProjectBOQ", {
        json_data: payload,
      });
      const result = response?.data?.data?.[0] || {};

      if (result.errorCount) {
        throw new Error(result.errorMsg || "Unable to save Bill of Quantity.");
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
      await apiClient.post("/cancelProjectBOQ", {
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

  const focusNextDetailRow = (index, field) => {
    setTimeout(() => {
      const nextInput = document.querySelector(
        `[data-boq-row="${index + 1}"][data-boq-field="${field}"]`
      );
      if (!nextInput || nextInput.disabled || nextInput.readOnly) return;
      nextInput.focus();
      if (typeof nextInput.select === "function") nextInput.select();
    }, 0);
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
          data-boq-row={index}
          data-boq-field={field}
          value={row[field] || ""}
          disabled={isFormDisabled || options.readOnly}
          className={`${common} cursor-pointer`}
          onChange={(event) => updateDetail(index, field, event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || isFormDisabled || options.readOnly) return;
            event.preventDefault();
            focusNextDetailRow(index, field);
          }}
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

    if (options.itemLookup) {
      const isService = String(row.invType || "").toUpperCase() === "SV";
      return (
        <div className="flex w-full items-center">
          <input
            value={row.itemNo || ""}
            readOnly
            disabled={isFormDisabled}
            className={`${common} ${isService ? "cursor-default" : "cursor-pointer"} pr-1`}
            onClick={() => !isFormDisabled && !isService && setItemLookupIndex(index)}
          />
          {!isFormDisabled && !isService && (
            <button
              type="button"
              onClick={() => setItemLookupIndex(index)}
              className="px-2 text-blue-600 hover:text-blue-800"
              title="Search Item"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
          )}
        </div>
      );
    }

    if (options.vatLookup) {
      return (
        <div className="relative flex w-full items-center">
          <input
            value={row.vatCode || ""}
            readOnly
            disabled={isFormDisabled}
            className={`${common} cursor-pointer pr-7 text-center`}
            onClick={() => !isFormDisabled && setVatLookupIndex(index)}
          />
          {!isFormDisabled && (
            <button
              type="button"
              onClick={() => setVatLookupIndex(index)}
              className="absolute right-1 px-1 text-blue-600 hover:text-blue-800"
              title="Search VAT Code"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
          )}
        </div>
      );
    }

    return (
      <input
        data-boq-row={index}
        data-boq-field={field}
        value={row[field] ?? ""}
        disabled={isFormDisabled || options.readOnly}
        className={`${common} ${options.numeric ? "text-right" : ""}`}
        onChange={(event) => {
          const value = options.numeric
            ? event.target.value.replace(/[^0-9.-]/g, "")
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
              formatNumber(row[field] || 0, options.decimals || 2)
            );
          }
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || isFormDisabled || options.readOnly) return;
          event.preventDefault();
          if (options.numeric) {
            updateDetail(index, field, formatNumber(event.currentTarget.value || 0, options.decimals || 2));
          }
          focusNextDetailRow(index, field);
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
                id="boqNo"
                label="BOQ No."
                type="lookup"
                value={state.documentNo}
                disabled={state.isDocNoDisabled || isFormDisabled}
                onChange={(value) => updateState({ documentNo: value })}
                onLookup={() => setDocLookupOpen(true)}
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
                  BOQ Date
                </label>
              </div>
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="projCode"
                label="Project Code"
                required
                type="lookup"
                value={state.projCode}
                disabled={isFormDisabled}
                onLookup={() => setProjectModalOpen(true)}
              />
              <FieldRenderer
                id="projName"
                label="Project Name"
                value={state.projName}
                readOnly
                disabled
              />
              <FieldRenderer
                id="type"
                label="BOQ Type"
                type="select"
                options={boqTypeOptions}
                value={state.type}
                disabled
                readOnly
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
                disabled
                readOnly
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
              <FieldRenderer id="joRef" label="JO No." type="lookup" value={state.joRef} disabled={isFormDisabled} onLookup={openJobOrderLookup} />
              <FieldRenderer id="joAmount" label="JO Amount" type="amount" value={state.joAmount} disabled readOnly />
            </div>

          </div>
        </section>

        <section className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              BOQ Details
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
                                : ["qtyHand", "boqQty", "unitCost", "amount", "markupRate", "markupAmount", "totalAmount", "vatAmount", "grossAmount", "mrQty", "isQty", "blQty", "prQty"].includes(column.key)
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
                                  column.key === "itemNo"
                                    ? { itemLookup: true }
                                    : column.key === "itemDesc"
                                      ? { readOnly: String(row.invType || "").toUpperCase() !== "SV" }
                                    : column.key === "vatCode"
                                      ? { vatLookup: true }
                                    : ["qtyHand", "amount", "markupAmount", "totalAmount", "vatAmount", "grossAmount", "mrQty", "isQty", "blQty", "prQty"].includes(column.key)
                                      ? { readOnly: true, numeric: true, decimals: ["qtyHand", "mrQty", "isQty", "blQty", "prQty"].includes(column.key) ? 6 : 2 }
                                    : column.key === "uomCode"
                                      ? { readOnly: String(row.invType || "").toUpperCase() !== "SV" }
                                      : ["boqQty", "unitCost", "markupRate"].includes(column.key)
                                        ? { numeric: true, decimals: column.key === "boqQty" ? 6 : 2 }
                                        : column.key === "invType"
                                          ? { select: [{ value: "FG", label: "FG" }, { value: "RM", label: "RM" }, { value: "MS", label: "MS" }, { value: "SV", label: "SV" }] }
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
                                onClick={() => {
                                  if (!String(state.projCode || "").trim()) {
                                    useSwalErrorAlert(
                                      "Bill of Quantity Required",
                                      "Select a Project Code before adding BOQ Details."
                                    );
                                    return;
                                  }

                                  const rows = [...state.detailRows];
                                  rows.splice(
                                    originalIndex + 1,
                                    0,
                                    emptyDetailRow(originalIndex + 2)
                                  );
                                  updateState({
                                    detailRows: rows.map((item, index) => ({
                                      ...item,
                                      lineNo: index + 1,
                                    })),
                                  });
                                }}
                                className="global-tran-td-button-add-ui"
                                title="Add detail"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
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
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                type="button"
                onClick={addDetailRow}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-1">
              {[
                ["Amount", amountTotal],
                ["Mark Up Amount", markupTotal],
                ["Total Amount", totalAmount],
                ["Total VAT Amount", vatTotal],
                ["Total Gross Amount", grossTotal],
              ].map(([label, amount]) => (
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
          endpoint="/getProjectBOQHistory"
          cacheKey={`PRJ_BQ:${state.branchCode}:${state.startDate}:${state.endDate}`}
          activeTabKey="PRJ_BOQ_Summary"
          branchCode={state.branchCode}
          startDate={state.startDate}
          endDate={state.endDate}
          status="All"
          historyExportName="Bill of Quantity History"
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

      <SearchProjectRef
        isOpen={projectModalOpen}
        onClose={(project) => {
          setProjectModalOpen(false);
          if (!project) return;
          updateState({
            projCode: project.projectCode || "",
            projName: project.projectName || "",
            projStat: project.projectStatus || "",
            custCode: project.customerCode || "",
            custName: project.customerName || "",
            actCode: project.activityCode || "",
            phaseCode: project.phaseCode || "",
            siteCode: project.siteCode || "",
            rcCode: project.rcCode || "",
            rcName: project.rcName || "",
            joRef: "",
            joAmount: "0.00",
            type: "",
          });
        }}
      />

      {docLookupOpen && (
        <AllTranDocNo
          isOpen
          params={{ branchCode: state.branchCode, branchName: state.branchName, docType: DOC_TYPE, documentTitle, fieldNo: "boqNo" }}
          docNo={state.documentNo}
          onRetrieve={async ({ docNo, modalClose }) => { await loadDocument(docNo, state.branchCode); setDocLookupOpen(Boolean(modalClose)); }}
          onSelected={({ docNo }) => { updateState({ documentNo: docNo }); setDocLookupOpen(false); }}
          onResponse={{ documentNo: state.documentNo }}
          onClose={() => setDocLookupOpen(false)}
        />
      )}

      <SearchProjectJobOrderDetail
        isOpen={joLookupOpen}
        branchCode={state.branchCode}
        projectCode={state.projCode}
        onClose={(detail) => {
          setJoLookupOpen(false);
          if (!detail) return;
          updateState({
            joRef: detail.joNo || "",
            custPo: detail.custPo || detail.joRef || "",
            joAmount: formatNumber(detail.amount || 0, 2),
            type: detail.type || "",
          });
        }}
      />

      {itemLookupIndex !== null && (
        <ItemMastLookupModal
          isOpen
          endpoint={`/getInvLookup${state.detailRows[itemLookupIndex]?.invType || "FG"}`}
          docType="BOQ"
          customParam="ActiveAll"
          enableMultiSelect={false}
          onClose={(payload) => {
            const rowIndex = itemLookupIndex;
            setItemLookupIndex(null);
            const item = payload?.records?.[0];
            if (!item || rowIndex === null) return;
            setState((previous) => ({
              ...previous,
              detailRows: previous.detailRows.map((row, index) =>
                index === rowIndex
                  ? {
                      ...row,
                      itemNo: item.itemCode || "",
                      itemDesc: item.itemName || item.itemDesc || "",
                      uomCode: item.uomCode || "",
                      qtyHand: formatNumber(item.qtyHand || 0, 6),
                      unitCost: formatNumber(item.unitCost || 0, 2),
                    }
                  : row
              ),
            }));
          }}
          onCancel={() => setItemLookupIndex(null)}
        />
      )}

      {vatLookupIndex !== null && (
        <VATLookupModal
          isOpen
          customParam={String(state.detailRows[vatLookupIndex]?.invType || "").toUpperCase() === "SV" ? "OutputService" : "OutputGoods"}
          onClose={(selectedVat) => {
            const rowIndex = vatLookupIndex;
            setVatLookupIndex(null);
            if (!selectedVat || rowIndex === null) return;

            const vatCode = selectedVat.vatCode || selectedVat.vat_code || selectedVat.code || "";
            const vatRow = getAllTopVatRow?.(vatCode) || selectedVat;
            const vatRate = parseFormattedNumber(vatRow?.vatRate ?? vatRow?.vat_rate ?? 0);
            setState((previous) => ({
              ...previous,
              detailRows: previous.detailRows.map((row, index) => {
                if (index !== rowIndex) return row;
                const totalAmount = parseFormattedNumber(row.totalAmount || 0);
                const vatAmount = totalAmount * vatRate / 100;
                return {
                  ...row,
                  vatCode,
                  vatAmount: formatNumber(vatAmount, 2),
                  grossAmount: formatNumber(totalAmount + vatAmount, 2),
                };
              }),
            }));
          }}
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
            DocumentName: hsDoc?.docName || "Bill of Quantity",
            BranchName: state.branchName,
            DocumentNo: state.documentNo,
          }}
          onClose={() => setAttachModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectBOQ;
