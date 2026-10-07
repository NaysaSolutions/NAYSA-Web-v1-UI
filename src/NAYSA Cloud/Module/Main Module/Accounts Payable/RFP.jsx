import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

import Header from "@/NAYSA Cloud/Components/Header.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput, {
  formatDateToMMDDYYYY,
} from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert as showErrorAlert,
  useSwalSuccessAlert as showSuccessAlert,
  useSwalvalidateRequiredFields as validateRequiredFields,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useHandleCancel as cancelTransaction,
} from "@/NAYSA Cloud/Global/procedure.js";
import {
  useTopCurrencyRow as getTopCurrencyRow,
  useTopForexRate as getTopForexRate,
  useTopPayeeRow as getTopPayeeRow,
  useTopPayTermRow as getTopPayTermRow,
} from "@/NAYSA Cloud/Global/top1RefTable.js";
import { useHandlePrint as printDocument } from "@/NAYSA Cloud/Global/report.js";

import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast.jsx";
import PaytermLookupModal from "@/NAYSA Cloud/Lookup/SearchPayTermRef.jsx";
import CurrLookupModal from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import CancelTranModal from "@/NAYSA Cloud/Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import RFPCodeLookupModal from "@/NAYSA Cloud/Lookup/SearchRFPCodeRef.jsx";

const DOC_TYPE = "APRFP";

const rfpDetailColumnDefs = [
  { key: "ln", label: "LN", width: 56 },
  { key: "rfpRefNo", label: "RFP Reference No.", width: 160 },
  { key: "rfpCode", label: "RFP Code", width: 130 },
  { key: "rfpName", label: "RFP Name", width: 220 },
  { key: "scope", label: "Request for Payment Detail", width: 360 },
  { key: "rfpAmount", label: "RFP Amount", width: 140 },
  { key: "dateNeeded", label: "Date Needed", width: 140 },
  { key: "rcCode", label: "RC Code", width: 130 },
  { key: "rcName", label: "RC Name", width: 220 },
  { key: "apvNo", label: "APV No.", width: 120 },
  { key: "cvNo", label: "CV No.", width: 120 },
];

const today = () => {
  const value = new Date();
  return `${String(value.getMonth() + 1).padStart(2, "0")}/${String(value.getDate()).padStart(2, "0")}/${value.getFullYear()}`;
};

const monthsAgo = (months) => {
  const value = new Date();
  value.setMonth(value.getMonth() - months);
  return `${String(value.getMonth() + 1).padStart(2, "0")}/${String(value.getDate()).padStart(2, "0")}/${value.getFullYear()}`;
};

const normalizeDate = (value) => {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  return formatDateToMMDDYYYY(raw.split("T")[0]) || "";
};

const unwrapResult = (response, fallback = null) => {
  const raw = response?.data?.data?.[0]?.result;
  if (raw === undefined || raw === null || raw === "") return fallback;
  if (typeof raw !== "string") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const newDetailRow = (index, documentDate, previous = null) => ({
  lnNo: index + 1,
  groupId: null,
  rfpRefNo: "",
  rfpCode: "",
  rfpName: "",
  scope: "",
  rcCode: previous?.rcCode || "",
  rcName: previous?.rcName || "",
  rfpAmount: formatNumber(previous ? parseFormattedNumber(previous.rfpAmount) : 0, 2),
  appliedAmount: formatNumber(0, 2),
  balanceAmount: formatNumber(0, 2),
  dateNeeded: previous?.dateNeeded || documentDate,
  apvId: null,
  apvNo: "",
  cvId: null,
  cvNo: "",
});

const historyColumns = {
  RFP_Summary: [
    { key: "branchCode", label: "Branch" },
    { key: "docNo", label: "RFP No." },
    { key: "rfpDate", label: "RFP Date", renderType: "date" },
    { key: "payeeCode", label: "Payee Code" },
    { key: "payeeName", label: "Payee Name" },
    { key: "currCode", label: "Currency" },
    { key: "currRate", label: "Rate", renderType: "number", roundingOff: 6 },
    { key: "rfpAmount", label: "RFP Amount", renderType: "currency", roundingOff: 2 },
    { key: "appliedAmount", label: "Applied Amount", renderType: "currency", roundingOff: 2 },
    { key: "balanceAmount", label: "Balance", renderType: "currency", roundingOff: 2 },
    { key: "remarks", label: "Remarks" },
    { key: "rfpStatus", label: "Status" },
    { key: "userCode", label: "Prepared By" },
    { key: "dateStamp", label: "Date Stamp", renderType: "date" },
    { key: "timeStamp", label: "Time Stamp" },
  ],
  RFP_Detail: [
    { key: "branchCode", label: "Branch" },
    { key: "docNo", label: "RFP No." },
    { key: "rfpDate", label: "RFP Date", renderType: "date" },
    { key: "payeeCode", label: "Payee Code" },
    { key: "payeeName", label: "Payee Name" },
    { key: "lnNo", label: "LN" },
    { key: "rfpRefNo", label: "RFP Reference No." },
    { key: "rfpCode", label: "RFP Code" },
    { key: "rfpName", label: "RFP Name" },
    { key: "scope", label: "Request for Payment Detail" },
    { key: "rcCode", label: "RC Code" },
    { key: "rcName", label: "RC Name" },
    { key: "rfpAmount", label: "RFP Amount", renderType: "currency", roundingOff: 2 },
    { key: "appliedAmount", label: "Applied Amount", renderType: "currency", roundingOff: 2 },
    { key: "balanceAmount", label: "Balance", renderType: "currency", roundingOff: 2 },
    { key: "dateNeeded", label: "Date Needed", renderType: "date" },
    { key: "apvNo", label: "APV No." },
    { key: "cvNo", label: "CV No." },
  ],
};

const RFP = () => {
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    getAllTopHSDocRow,
    refsLoaded,
  } = useAuth();

  const hsDoc = getAllTopHSDocRow?.(DOC_TYPE) || {};
  const globalCurrency = companyInfo?.currCode || "PHP";
  const defaultBranchCode = currentUserRow?.branchCode || "";
  const defaultBranchName = currentUserRow?.branchName || currentUserRow?.BranchName || "";
  const userCode = currentUserRow?.userCode || "";

  const initialForm = useCallback(() => ({
    rfpId: null,
    rfpNo: "",
    rfpDate: today(),
    branchCode: defaultBranchCode,
    branchName: defaultBranchName,
    payeeCode: "",
    payeeName: "",
    attention: "",
    paytermCode: "",
    paytermName: "",
    paymentType: "",
    currCode: globalCurrency,
    currName: companyInfo?.currName || "",
    currRate: formatNumber(1, 6),
    remarks: "",
    rfpAmount: formatNumber(0, 2),
    appliedAmount: formatNumber(0, 2),
    balanceAmount: formatNumber(0, 2),
    rfpStatus: "OPEN",
    rfpHStatus: "O",
    rfpCancelled: "",
    noReprints: 0,
    detailRows: [],
  }), [companyInfo?.currName, defaultBranchCode, defaultBranchName, globalCurrency]);

  const [form, setForm] = useState(initialForm);
  const [topTab, setTopTab] = useState("details");
  const [fromDate] = useState(monthsAgo(3));
  const [toDate] = useState(today());
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [showSpinner, setShowSpinner] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [payeeModalOpen, setPayeeModalOpen] = useState(false);
  const [paytermModalOpen, setPaytermModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [rcModalOpen, setRcModalOpen] = useState(false);
  const [rfpCodeModalOpen, setRfpCodeModalOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showDocumentLookup, setShowDocumentLookup] = useState(false);

  const {
    getColumnStyle: getRfpDetailColumnStyle,
    getFrozenColumnStyle: getRfpDetailFrozenStyle,
    getOrderedColumns: getOrderedRfpDetailColumns,
    getSortedRows: getSortedRfpDetailRows,
    clearAllSorting: clearRfpDetailSorting,
    clearZeroValueOnFocus: clearRfpDetailZeroOnFocus,
    focusNextRowInput: focusNextRfpDetailRowInput,
    renderHeaderContextMenu: renderRfpDetailHeaderContextMenu,
    renderResizableHeader: renderRfpDetailHeader,
  } = useResizableTableColumns(rfpDetailColumnDefs);

  const orderedRfpDetailColumns = getOrderedRfpDetailColumns(rfpDetailColumnDefs);
  const getRfpDetailFallbackWidth = (key) =>
    rfpDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getRfpDetailCellStyle = (key) => {
    const fallbackWidth = getRfpDetailFallbackWidth(key);
    return {
      ...getRfpDetailColumnStyle(key, fallbackWidth),
      ...getRfpDetailFrozenStyle(key, orderedRfpDetailColumns, fallbackWidth, {
        isHeader: false,
      }),
    };
  };
  const sortedRfpDetailRows = getSortedRfpDetailRows(
    form.detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) =>
      sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  useEffect(() => {
    if (!refsLoaded) return;
    const rows = getAllDropDown?.("PAY_TYPE", "CV") || [];
    setPaymentTypes(rows);
    setForm((current) => ({
      ...current,
      paymentType:
        current.paymentType || rows[0]?.DROPDOWN_CODE || rows[0]?.dropdownCode || "CHECK",
    }));
  }, [getAllDropDown, refsLoaded]);

  useEffect(() => {
    setForm((current) => {
      if (current.rfpId) return current;

      return {
        ...current,
        branchCode: current.branchCode || defaultBranchCode,
        branchName: current.branchName || defaultBranchName,
        currCode: current.currCode || globalCurrency,
        currName: current.currName || companyInfo?.currName || "",
      };
    });
  }, [companyInfo?.currName, defaultBranchCode, defaultBranchName, globalCurrency]);

  const updateForm = useCallback((updates) => {
    setForm((current) => ({ ...current, ...updates }));
  }, []);

  const isLocked =
    Boolean(form.rfpId) &&
    (String(form.rfpHStatus || "O").toUpperCase() !== "O" ||
      parseFormattedNumber(form.appliedAmount) > 0);
  const isEditable = !isLocked;

  const totalAmount = useMemo(
    () => form.detailRows.reduce((sum, row) => sum + parseFormattedNumber(row.rfpAmount), 0),
    [form.detailRows],
  );

  useEffect(() => {
    setForm((current) => ({
      ...current,
      rfpAmount: formatNumber(totalAmount, 2),
      balanceAmount: formatNumber(
        totalAmount - parseFormattedNumber(current.appliedAmount),
        2,
      ),
    }));
  }, [totalAmount]);

  const resetForm = useCallback(() => {
    clearRfpDetailSorting();
    setForm(initialForm());
    setSelectedRowIndex(null);
    setShowDocumentLookup(false);
  }, [clearRfpDetailSorting, initialForm]);

  const applyDocument = useCallback((record) => {
    if (!record || record.result === null) {
      showErrorAlert("Request for Payment", "Transaction was not found.");
      return false;
    }

    const rows = Array.isArray(record.dt1) ? record.dt1 : [];
    setForm({
      rfpId: record.rfpId || null,
      rfpNo: record.rfpNo || "",
      rfpDate: normalizeDate(record.rfpDate) || today(),
      branchCode: record.branchCode || defaultBranchCode,
      branchName: record.branchName || defaultBranchName,
      payeeCode: record.payeeCode || "",
      payeeName: record.payeeName || "",
      attention: record.attention || "",
      paytermCode: record.paytermCode || "",
      paytermName: record.paytermName || "",
      paymentType: record.paymentType || "",
      currCode: record.currCode || globalCurrency,
      currName: record.currName || "",
      currRate: formatNumber(record.currRate || 1, 6),
      remarks: record.remarks || "",
      rfpAmount: formatNumber(record.rfpAmount || 0, 2),
      appliedAmount: formatNumber(record.appliedAmount || 0, 2),
      balanceAmount: formatNumber(record.balanceAmount || 0, 2),
      rfpStatus: record.rfpStatus || "OPEN",
      rfpHStatus: record.rfpHStatus || "O",
      rfpCancelled: record.rfpCancelled || "",
      noReprints: record.noReprints || 0,
      detailRows: rows.map((row, index) => ({
        ...row,
        lnNo: row.lnNo || index + 1,
        rfpAmount: formatNumber(row.rfpAmount || 0, 2),
        appliedAmount: formatNumber(row.appliedAmount || 0, 2),
        balanceAmount: formatNumber(row.balanceAmount || 0, 2),
        dateNeeded: normalizeDate(row.dateNeeded),
      })),
    });
    return true;
  }, [defaultBranchCode, defaultBranchName, globalCurrency]);

  const fetchDocument = useCallback(async (rfpNo, branchCode = form.branchCode, direction = "") => {
    if (!branchCode || (!rfpNo && !direction)) return;
    setShowSpinner(true);

    try {
      const payload = {
        json_data: {
          rfpId: direction ? form.rfpId : null,
          rfpNo,
          branchCode,
          direction,
        },
      };
      const response = await apiClient.get("/getRFP", {
        params: { json_data: JSON.stringify(payload) },
      });
      const record = unwrapResult(response, null);
      if (!record || record.result === null) {
        showErrorAlert("Request for Payment", "Transaction was not found.");
        return;
      }
      applyDocument(record);
    } catch (error) {
      showErrorAlert(
        "Request for Payment",
        error?.response?.data?.message || error?.message || "Unable to retrieve the transaction.",
      );
    } finally {
      setShowSpinner(false);
    }
  }, [applyDocument, form.branchCode, form.rfpId]);

  const handleHistoryRowPick = useCallback((row) => {
    const docNo = row?.docNo || row?.rfpNo;
    if (!docNo) return;
    setTopTab("details");
    fetchDocument(docNo, row?.branchCode || form.branchCode);
  }, [fetchDocument, form.branchCode]);

  const handlePayeeClose = async (selected) => {
    setPayeeModalOpen(false);
    if (!selected) return;
    setShowSpinner(true);

    try {
      const payee = await getTopPayeeRow(selected.vendCode);
      const payterm = payee?.paytermCode
        ? await getTopPayTermRow(payee.paytermCode)
        : null;
      const currencyCode = payee?.currCode || globalCurrency;
      const currency = await getTopCurrencyRow(currencyCode);
      const rate = currencyCode === globalCurrency
        ? 1
        : await getTopForexRate(currencyCode, form.rfpDate);

      updateForm({
        payeeCode: selected.vendCode || "",
        payeeName: selected.vendName || "",
        attention: payee?.vendContact || "",
        paytermCode: payterm?.paytermCode || payee?.paytermCode || "",
        paytermName: payterm?.paytermName || "",
        currCode: currency?.currCode || currencyCode,
        currName: currency?.currName || "",
        currRate: formatNumber(rate || 1, 6),
      });
    } catch (error) {
      showErrorAlert("Payee", error?.message || "Unable to load the payee defaults.");
    } finally {
      setShowSpinner(false);
    }
  };

  const handlePaytermClose = (selected) => {
    setPaytermModalOpen(false);
    if (!selected) return;
    updateForm({
      paytermCode: selected.paytermCode || "",
      paytermName: selected.paytermName || "",
    });
  };

  const handleCurrencyClose = async (selected) => {
    setCurrencyModalOpen(false);
    if (!selected) return;
    setShowSpinner(true);
    try {
      const rate = selected.currCode === globalCurrency
        ? 1
        : await getTopForexRate(selected.currCode, form.rfpDate);
      updateForm({
        currCode: selected.currCode || "",
        currName: selected.currName || "",
        currRate: formatNumber(rate || 1, 6),
      });
    } finally {
      setShowSpinner(false);
    }
  };

  const changeDetail = (index, field, value) => {
    setForm((current) => ({
      ...current,
      detailRows: current.detailRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      ),
    }));
  };

  const insertDetail = (index = -1) => {
    setForm((current) => {
      const rows = [...current.detailRows];
      const previous = index >= 0
        ? rows[index]
        : rows[rows.length - 1] || null;
      const row = newDetailRow(rows.length, current.rfpDate, previous);

      if (index >= 0) rows.splice(index + 1, 0, row);
      else rows.push(row);

      return {
        ...current,
        detailRows: rows.map((detail, rowIndex) => ({
          ...detail,
          lnNo: rowIndex + 1,
        })),
      };
    });
  };

  const validateDetailAdd = () => validateRequiredFields(
    { "Header : Payee": form.payeeCode },
    "Add Item",
  );

  const addDetail = async () => {
    const isValid = await validateDetailAdd();
    if (!isValid) return;
    insertDetail();
  };

  const addDetailAfter = async (index) => {
    const isValid = await validateDetailAdd();
    if (!isValid) return;
    insertDetail(index);
  };

  const deleteDetail = (index) => {
    setForm((current) => ({
      ...current,
      detailRows: current.detailRows
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, lnNo: rowIndex + 1 })),
    }));
  };

  const openRfpCodeLookup = (index) => {
    setSelectedRowIndex(index);
    setRfpCodeModalOpen(true);
  };

  const handleRfpCodeClose = (selected) => {
    setRfpCodeModalOpen(false);
    if (selected && selectedRowIndex !== null) {
      changeDetail(selectedRowIndex, "rfpCode", selected.rfpCode || "");
      changeDetail(selectedRowIndex, "rfpName", selected.rfpName || "");
      if (!form.detailRows[selectedRowIndex]?.scope) {
        changeDetail(selectedRowIndex, "scope", selected.rfpName || "");
      }
    }
    setSelectedRowIndex(null);
  };

  const handleRcClose = (selected) => {
    setRcModalOpen(false);
    if (selected && selectedRowIndex !== null) {
      changeDetail(selectedRowIndex, "rcCode", selected.rcCode || "");
      changeDetail(selectedRowIndex, "rcName", selected.rcName || "");
    }
    setSelectedRowIndex(null);
  };

  const validate = async () => {
    const headerValid = await validateRequiredFields({
      Branch: form.branchCode,
      "RFP Date": form.rfpDate,
      Payee: form.payeeCode,
      Currency: form.currCode,
      "Currency Rate": parseFormattedNumber(form.currRate) > 0 ? form.currRate : "",
      "Payment Terms": form.paytermCode,
      "Payment Type": form.paymentType,
      Remarks: form.remarks,
      "RFP Details": form.detailRows,
    });
    if (!headerValid) return false;

    const errors = [];
    const references = new Set();
    form.detailRows.forEach((row, index) => {
      const line = index + 1;
      if (!row.rfpCode) errors.push(`- Row ${line}: RFP Code`);
      if (!String(row.scope || "").trim()) errors.push(`- Row ${line}: Request for Payment Detail`);
      if (!row.rcCode) errors.push(`- Row ${line}: RC Code`);
      if (parseFormattedNumber(row.rfpAmount) <= 0) errors.push(`- Row ${line}: RFP Amount must be greater than zero`);
      if (!row.dateNeeded) errors.push(`- Row ${line}: Date Needed`);

      const reference = String(row.rfpRefNo || "").trim().toUpperCase();
      if (reference && references.has(reference)) {
        errors.push(`- Row ${line}: Duplicate RFP Reference No. ${row.rfpRefNo}`);
      }
      if (reference) references.add(reference);
    });

    if (errors.length) {
      showErrorAlert("Request for Payment", errors.join("\n"));
      return false;
    }
    return true;
  };

  const save = async () => {
    if (isLocked || !(await validate())) return;
    setShowSpinner(true);

    try {
      const payload = {
        json_data: {
          rfpId: form.rfpId,
          rfpNo: form.rfpNo || null,
          rfpDate: form.rfpDate,
          branchCode: form.branchCode,
          payeeCode: form.payeeCode,
          payeeName: form.payeeName,
          attention: form.attention,
          paytermCode: form.paytermCode,
          paymentType: form.paymentType,
          currCode: form.currCode,
          currRate: parseFormattedNumber(form.currRate),
          remarks: form.remarks,
          rfpStatus: form.rfpHStatus || "O",
          userCode,
          dt1: form.detailRows.map((row, index) => ({
            lnNo: index + 1,
            groupId: row.groupId || null,
            rfpRefNo: String(row.rfpRefNo || "").trim(),
            rfpCode: row.rfpCode,
            scope: String(row.scope || "").trim(),
            rcCode: row.rcCode,
            rfpAmount: parseFormattedNumber(row.rfpAmount),
            dateNeeded: row.dateNeeded,
          })),
        },
      };

      const response = await apiClient.post("/upsertRFP", payload);
      const result = response?.data?.data?.[0] || {};
      if (Number(result.errorCount ?? result.errorcount ?? 0) > 0) {
        showErrorAlert("Request for Payment", result.errorMsg || result.errormsg || "Unable to save the transaction.");
        return;
      }

      showSuccessAlert("Request for Payment", "Transaction saved successfully.");
      await fetchDocument(result.rfpNo || form.rfpNo, form.branchCode);
    } catch (error) {
      showErrorAlert(
        "Request for Payment",
        error?.response?.data?.details || error?.response?.data?.message || error?.message || "Unable to save the transaction.",
      );
    } finally {
      setShowSpinner(false);
    }
  };

  const copyTransaction = () => {
    setForm((current) => ({
      ...current,
      rfpId: null,
      rfpNo: "",
      rfpDate: today(),
      rfpStatus: "OPEN",
      rfpHStatus: "O",
      rfpCancelled: "",
      appliedAmount: formatNumber(0, 2),
      balanceAmount: current.rfpAmount,
      detailRows: current.detailRows.map((row, index) => ({
        ...row,
        lnNo: index + 1,
        groupId: null,
        appliedAmount: formatNumber(0, 2),
        balanceAmount: row.rfpAmount,
        apvId: null,
        apvNo: "",
        cvId: null,
        cvNo: "",
      })),
    }));
  };

  const handleCancelClose = async (confirmation) => {
    setShowCancelModal(false);
    if (!confirmation || !form.rfpId || isLocked) return;

    const result = await cancelTransaction(
      DOC_TYPE,
      form.rfpId,
      userCode,
      confirmation.password,
      confirmation.reason,
      (updates) => setShowSpinner(Boolean(updates?.isLoading)),
    );
    if (result?.success) {
      showSuccessAlert("Request for Payment", "Cancellation completed.");
      await fetchDocument(form.rfpNo, form.branchCode);
    }
  };

  const handlePrint = async () => {
    if (!form.rfpId) return;
    setShowSpinner(true);
    try {
      await printDocument(form.rfpId, DOC_TYPE);
    } finally {
      setShowSpinner(false);
    }
  };

  const statusText = String(form.rfpStatus || "OPEN").toUpperCase();
  const statusColor = statusText.includes("CANCEL")
    ? "text-red-600"
    : statusText === "OPEN"
      ? "text-slate-800"
      : "text-blue-700";

  const focusNextDetailRow = (index, field) => {
    focusNextRfpDetailRowInput(index, field, {
      rows: form.detailRows,
      zeroClearFields: ["rfpAmount"],
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) =>
        changeDetail(nextIndex, nextField, value),
    });
  };

  const commitRfpAmount = (index, value, moveNext = false) => {
    const amount = Math.max(0, parseFormattedNumber(value || 0));
    changeDetail(index, "rfpAmount", formatNumber(amount, 2));
    if (moveNext) focusNextDetailRow(index, "rfpAmount");
  };

  const renderRfpDetailColumn = (columnKey, row, index) => {
    const style = getRfpDetailCellStyle(columnKey);
    const handleEnter = (event, field = columnKey) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      event.preventDefault();
      focusNextDetailRow(index, field);
    };
    const readOnlyInput = (field, className = "") => (
      <input
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${className}`.trim()}
        value={row[field] || ""}
        readOnly
        onKeyDown={(event) => handleEnter(event, field)}
      />
    );

    const renderers = {
      ln: () => (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          {index + 1}
        </td>
      ),
      rfpRefNo: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <input
            id={`rfpRefNo-${index}`}
            className="w-full global-tran-td-inputclass-ui"
            value={row.rfpRefNo || ""}
            readOnly={!isEditable}
            onChange={(event) => changeDetail(index, "rfpRefNo", event.target.value)}
            onKeyDown={(event) => handleEnter(event, "rfpRefNo")}
          />
        </td>
      ),
      rfpCode: () => (
        <td key={columnKey} className="global-tran-td-ui relative" style={style}>
          <div className="flex items-center">
            <input
              id={`rfpCode-${index}`}
              className="w-full global-tran-td-inputclass-ui pr-7"
              value={row.rfpCode || ""}
              readOnly
              onKeyDown={(event) => handleEnter(event, "rfpCode")}
            />
            {isEditable && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 cursor-pointer text-lg text-blue-600 hover:text-blue-900"
                onClick={() => openRfpCodeLookup(index)}
              />
            )}
          </div>
        </td>
      ),
      rfpName: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {readOnlyInput("rfpName")}
        </td>
      ),
      scope: () => {
        const value = row.scope || "";
        const lineCount = Math.max(1, String(value).split(/\r\n|\r|\n/).length);
        return (
          <td key={columnKey} className="global-tran-td-ui align-top" style={style}>
            <textarea
              id={`scope-${index}`}
              className="min-h-[28px] w-full resize-none bg-transparent py-1 text-xs leading-4 whitespace-pre-wrap break-words focus:outline-none focus:ring-0"
              value={value}
              rows={lineCount}
              readOnly={!isEditable}
              onChange={(event) => changeDetail(index, "scope", event.target.value)}
              onKeyDown={(event) => handleEnter(event, "scope")}
            />
          </td>
        );
      },
      rfpAmount: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <input
            id={`rfpAmount-${index}`}
            className="h-7 w-full bg-transparent text-right text-xs focus:outline-none focus:ring-0"
            value={row.rfpAmount || ""}
            readOnly={!isEditable}
            onFocus={(event) =>
              clearRfpDetailZeroOnFocus(event, {
                isEditable,
                onClear: (value) => changeDetail(index, "rfpAmount", value),
              })
            }
            onChange={(event) => {
              const value = event.target.value.replace(/[^0-9.]/g, "");
              if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                changeDetail(index, "rfpAmount", value);
              }
            }}
            onBlur={(event) => {
              if (isEditable) commitRfpAmount(index, event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || !isEditable) return;
              event.preventDefault();
              commitRfpAmount(index, event.currentTarget.value, true);
            }}
          />
        </td>
      ),
      dateNeeded: () => (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          <DateFormatInput
            id={`dateNeeded-${index}`}
            className="w-full global-tran-td-inputclass-ui text-center pr-7"
            value={row.dateNeeded || ""}
            disabled={!isEditable}
            updateState={(updates) => {
              if (updates[`dateNeeded-${index}`] !== undefined) {
                changeDetail(index, "dateNeeded", updates[`dateNeeded-${index}`]);
              }
            }}
            onKeyDownCustom={(event) => handleEnter(event, "dateNeeded")}
          />
        </td>
      ),
      rcCode: () => (
        <td key={columnKey} className="global-tran-td-ui relative" style={style}>
          <div className="flex items-center">
            <input
              id={`rcCode-${index}`}
              className="w-full global-tran-td-inputclass-ui pr-7"
              value={row.rcCode || ""}
              readOnly
              onKeyDown={(event) => handleEnter(event, "rcCode")}
            />
            {isEditable && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 cursor-pointer text-lg text-blue-600 hover:text-blue-900"
                onClick={() => {
                  setSelectedRowIndex(index);
                  setRcModalOpen(true);
                }}
              />
            )}
          </div>
        </td>
      ),
      rcName: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {readOnlyInput("rcName")}
        </td>
      ),
      apvNo: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {readOnlyInput("apvNo")}
        </td>
      ),
      cvNo: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {readOnlyInput("cvNo")}
        </td>
      ),
    };

    return renderers[columnKey]?.() ?? (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        {String(row[columnKey] ?? "")}
      </td>
    );
  };

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={DOC_TYPE}
          activeTopTab={topTab}
          detailsRoute="/tran/RFP"
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          showActions={topTab === "details"}
          showBIRForm={false}
          showNotify={false}
          onSave={save}
          onReset={resetForm}
          onPrint={handlePrint}
          onCopy={copyTransaction}
          onAttach={() => setShowAttachModal(true)}
          onCancel={() => setShowCancelModal(true)}
          printData={{
            documentNo: form.rfpNo,
            branchCode: form.branchCode,
            branchName: form.branchName,
            doc_id: DOC_TYPE,
          }}
          isSaveDisabled={isLocked || form.detailRows.length === 0}
          isPrintDisabled={!form.rfpId}
          isCopyDisabled={!form.rfpId}
          isAttachDisabled={!form.rfpId}
          isCancelDisabled={!form.rfpId || isLocked}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">
              {hsDoc?.docName || "Request for Payment"} Transaction
            </h1>
          </div>
          <div className="global-tran-headerstat-div-ui">
            <div>
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{statusText}</h1>
            </div>
          </div>
        </div>

        <div className="global-tran-header-div-ui">
          <div className="global-tran-header-tab-div-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                value={form.branchName}
                disabled
              />
              <FieldRenderer
                id="rfpNo"
                label="RFP No."
                type="lookup"
                value={form.rfpNo}
                disabled={Boolean(form.rfpId) || String(hsDoc?.docSeries || "Auto").toUpperCase() === "AUTO"}
                onChange={(value) => updateForm({ rfpNo: value })}
                onLookup={() => setShowDocumentLookup(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && form.rfpNo) {
                    event.preventDefault();
                    fetchDocument(form.rfpNo, form.branchCode);
                  }
                }}
              />
              <div className="relative w-full">
                <div className={`flex items-stretch global-ref-textbox-ui ${isEditable ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                  <DateFormatInput
                    id="rfpDate"
                    className="peer flex-grow border-none bg-transparent px-3 focus:outline-none"
                    value={form.rfpDate}
                    disabled={!isEditable}
                    updateState={updateForm}
                  />
                </div>
                <label htmlFor="rfpDate" className="global-ref-floating-label">RFP Date</label>
              </div>
              <FieldRenderer
                id="paymentType"
                label="Payment Type"
                type="select"
                value={form.paymentType}
                disabled={!isEditable}
                onChange={(value) => updateForm({ paymentType: value })}
                options={(paymentTypes.length ? paymentTypes : [
                  { DROPDOWN_CODE: "CHECK", DROPDOWN_NAME: "Check" },
                  { DROPDOWN_CODE: "CASH", DROPDOWN_NAME: "Cash" },
                ]).map((item) => ({
                  value: item.DROPDOWN_CODE || item.dropdownCode,
                  label: item.DROPDOWN_NAME || item.dropdownName,
                }))}
              />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="payeeCode"
                label="Payee Code"
                required
                type="lookup"
                value={form.payeeCode}
                disabled={!isEditable}
                readOnly
                onLookup={() => isEditable && setPayeeModalOpen(true)}
              />
              <FieldRenderer
                id="payeeName"
                label="Payee Name"
                required
                value={form.payeeName}
                disabled
              />
              <FieldRenderer
                id="attention"
                label="Attention"
                value={form.attention}
                disabled={!isEditable}
                onChange={(value) => updateForm({ attention: value })}
              />
              <FieldRenderer
                id="paytermName"
                label="Payment Terms"
                required
                type="lookup"
                value={form.paytermName}
                disabled={!isEditable}
                readOnly
                onLookup={() => isEditable && setPaytermModalOpen(true)}
              />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="currency"
                label="Currency"
                required
                type="lookup"
                value={form.currCode ? `${form.currCode}${form.currName ? ` - ${form.currName}` : ""}` : ""}
                disabled={!isEditable}
                readOnly
                onLookup={() => isEditable && setCurrencyModalOpen(true)}
              />
              <FieldRenderer
                id="currRate"
                label="Currency Rate"
                required
                type="amount"
                value={form.currRate}
                disabled={!isEditable || form.currCode === globalCurrency}
                onChange={(value) => updateForm({ currRate: value })}
                onBlur={() => updateForm({ currRate: formatNumber(parseFormattedNumber(form.currRate), 6) })}
              />
              <FieldRenderer
                id="rfpTotal"
                label="RFP Amount"
                type="amount"
                value={formatNumber(totalAmount, 2)}
                disabled
              />
              <FieldRenderer
                id="balanceAmount"
                label="Balance"
                type="amount"
                value={form.balanceAmount}
                disabled
              />
            </div>
          </div>

          <div className="relative mt-4 w-full p-2">
            <textarea
              id="remarks"
              placeholder=" "
              rows={4}
              className="peer global-tran-textbox-remarks-ui pt-2"
              value={form.remarks || ""}
              maxLength={4000}
              disabled={!isEditable}
              onChange={(event) => updateForm({ remarks: event.target.value })}
            />
            <label htmlFor="remarks" className="global-tran-floating-label-remarks">
              Remarks
            </label>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Request for Payment Details
            </span>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedRfpDetailColumns.map((column) =>
                      renderRfpDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedRfpDetailColumns,
                      })
                    )}
                    {isEditable && (
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
                  {sortedRfpDetailRows.map(({ row, originalIndex }) => (
                    <tr key={row.groupId || `new-${originalIndex}`} className="global-tran-tr-ui">
                      {orderedRfpDetailColumns.map((column) =>
                        renderRfpDetailColumn(column.key, row, originalIndex)
                      )}
                      {isEditable && (
                        <td
                          className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black"
                          style={transactionActionsCellStyle}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="global-tran-td-button-add-ui"
                              onClick={() => addDetailAfter(originalIndex)}
                              title="Add row"
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={() => deleteDetail(originalIndex)}
                              title="Delete row"
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
              {renderRfpDetailHeaderContextMenu?.()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                type="button"
                disabled={!isEditable}
                onClick={addDetail}
                className="global-tran-tab-footer-button-add-ui"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-[auto_auto] gap-1">
              <span className="global-tran-tab-footer-total-label-ui">Total RFP Amount:</span>
              <span className="global-tran-tab-footer-total-value-ui">
                {formatNumber(totalAmount, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getRFPHistory"
          cacheKey={`RFP:${form.branchCode}:${fromDate}:${toDate}`}
          activeTabKey="RFP_Summary"
          branchCode={form.branchCode}
          startDate={fromDate}
          endDate={toDate}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName="Request for Payment History"
          columnConfigOverrides={historyColumns}
        />
      </div>

      {payeeModalOpen && (
        <PayeeMastLookupModal isOpen={payeeModalOpen} onClose={handlePayeeClose} />
      )}
      {paytermModalOpen && (
        <PaytermLookupModal isOpen={paytermModalOpen} onClose={handlePaytermClose} />
      )}
      {currencyModalOpen && (
        <CurrLookupModal isOpen={currencyModalOpen} onClose={handleCurrencyClose} />
      )}
      {rcModalOpen && (
        <RCLookupModal
          isOpen={rcModalOpen}
          onClose={handleRcClose}
          customParam="ActiveAll"
        />
      )}
      {rfpCodeModalOpen && (
        <RFPCodeLookupModal
          isOpen={rfpCodeModalOpen}
          onClose={handleRfpCodeClose}
          activeOnly
        />
      )}
      {showCancelModal && (
        <CancelTranModal isOpen={showCancelModal} onClose={handleCancelClose} />
      )}
      {showAttachModal && (
        <AttachDocumentModal
          isOpen={showAttachModal}
          params={{
            DocumentID: form.rfpId,
            DocumentName: hsDoc?.docName || "Request for Payment",
            BranchName: form.branchName,
            DocumentNo: form.rfpNo,
          }}
          onClose={() => setShowAttachModal(false)}
        />
      )}
      {showDocumentLookup && (
        <AllTranDocNo
          isOpen={showDocumentLookup}
          params={{
            branchCode: form.branchCode,
            branchName: form.branchName,
            docType: DOC_TYPE,
            documentTitle: hsDoc?.docName || "Request for Payment",
            fieldNo: "rfpNo",
          }}
          docNo={form.rfpNo}
          onResponse={{ documentNo: form.rfpNo }}
          onRetrieve={async ({ docNo, key, modalClose }) => {
            await fetchDocument(docNo, form.branchCode, key);
            if (modalClose) setShowDocumentLookup(false);
          }}
          onSelected={({ docNo }) => updateForm({ rfpNo: docNo })}
          onClose={() => setShowDocumentLookup(false)}
        />
      )}
    </div>
  );
};

export default RFP;
