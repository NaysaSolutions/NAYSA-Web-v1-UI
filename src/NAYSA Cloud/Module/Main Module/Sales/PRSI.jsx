import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert as showSuccessAlert,
  useSwalvalidateRequiredFields as validateRequiredFields,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useTopCurrencyRow as getTopCurrencyRow,
  useTopForexRate as getTopForexRate,
} from "@/NAYSA Cloud/Global/top1RefTable.js";
import { useHandlePrint as printDocument } from "@/NAYSA Cloud/Global/report.js";

import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import CancelTranModal from "@/NAYSA Cloud/Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";

const DOC_TYPE = "PRSI";

const detailColumnDefs = [
  { key: "ln", label: "LN", width: 56 },
  { key: "itemCode", label: "Item Code", width: 150 },
  { key: "itemName", label: "Item Name", width: 260 },
  { key: "itemSpecs", label: "Specification", width: 260 },
  { key: "uomCode", label: "UOM", width: 90 },
  { key: "quantity", label: "Quantity", width: 130 },
  { key: "sellingPrice", label: "Selling Price", width: 140 },
  { key: "grossAmount", label: "Gross Amount", width: 140 },
  { key: "vatCode", label: "VAT Code", width: 100 },
  { key: "vatAmount", label: "VAT Amount", width: 130 },
  { key: "amount", label: "Net Amount", width: 140 },
];

const historyColumns = {
  PRSI_Summary: [
    { key: "branchName", label: "Branch Name" },
    { key: "docNo", label: "PRSI No." },
    { key: "prsiDate", label: "PRSI Date", renderType: "date" },
    { key: "custCode", label: "Customer Code" },
    { key: "custName", label: "Customer Name" },
    { key: "vesselName", label: "Vessel Name" },
    { key: "shipmentNo", label: "Shipment No." },
    { key: "shipmentDate", label: "Shipment Date", renderType: "date" },
    { key: "currCode", label: "Currency" },
    { key: "grossAmount", label: "Gross Amount", renderType: "number", roundingOff: 2 },
    { key: "vatAmount", label: "VAT Amount", renderType: "number", roundingOff: 2 },
    { key: "prsiAmount", label: "PRSI Amount", renderType: "number", roundingOff: 2 },
    { key: "siNo", label: "SI No." },
    { key: "apvNo", label: "APV No." },
    { key: "docStat", label: "Document Status" },
  ],
  PRSI_Detail: [
    { key: "branchName", label: "Branch Name" },
    { key: "docNo", label: "PRSI No." },
    { key: "prsiDate", label: "PRSI Date", renderType: "date" },
    { key: "custCode", label: "Customer Code" },
    { key: "custName", label: "Customer Name" },
    { key: "lineNo", label: "LN" },
    { key: "itemCode", label: "Item Code" },
    { key: "itemName", label: "Item Name" },
    { key: "itemSpecs", label: "Specification" },
    { key: "uomCode", label: "UOM" },
    { key: "quantity", label: "Quantity", renderType: "number", roundingOff: 6 },
    { key: "sellingPrice", label: "Selling Price", renderType: "number", roundingOff: 6 },
    { key: "grossAmount", label: "Gross Amount", renderType: "number", roundingOff: 2 },
    { key: "vatCode", label: "VAT Code" },
    { key: "vatAmount", label: "VAT Amount", renderType: "number", roundingOff: 2 },
    { key: "amount", label: "Net Amount", renderType: "number", roundingOff: 2 },
  ],
};

const currentDate = () => {
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
  const text = String(value);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;
  return formatDateToMMDDYYYY(text.split("T")[0]) || "";
};

const unwrapResult = (response) => {
  const raw = response?.data?.data?.[0]?.result;
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const calculateAmounts = (row) => {
  const quantity = Math.max(0, parseFormattedNumber(row.quantity));
  const sellingPrice = Math.max(0, parseFormattedNumber(row.sellingPrice));
  const vatRate = Math.max(0, Number(row.vatRate || 0));
  const grossAmount = Number((quantity * sellingPrice).toFixed(2));
  const vatAmount = vatRate > 0
    ? Number((grossAmount * vatRate / (100 + vatRate)).toFixed(2))
    : 0;

  return {
    ...row,
    quantity: formatNumber(quantity, 6),
    sellingPrice: formatNumber(sellingPrice, 6),
    grossAmount: formatNumber(grossAmount, 2),
    vatAmount: formatNumber(vatAmount, 2),
    amount: formatNumber(grossAmount - vatAmount, 2),
  };
};

const newDetailRow = (index, previous = null) => calculateAmounts({
  lineNo: index + 1,
  groupId: null,
  itemCode: "",
  itemName: "",
  itemSpecs: "",
  uomCode: "",
  quantity: formatNumber(1, 6),
  sellingPrice: formatNumber(0, 6),
  grossAmount: formatNumber(0, 2),
  vatCode: previous?.vatCode || "",
  vatName: previous?.vatName || "",
  vatRate: Number(previous?.vatRate || 0),
  vatAmount: formatNumber(0, 2),
  amount: formatNumber(0, 2),
});

const PRSI = () => {
  const location = useLocation();
  const {
    companyInfo,
    currentUserRow,
    getAllTopHSDocRow,
    getAllTopVatRow,
  } = useAuth();

  const hsDoc = getAllTopHSDocRow?.(DOC_TYPE) || {};
  const globalCurrency = companyInfo?.currCode || "PHP";
  const userCode = currentUserRow?.userCode || "";
  const defaultBranchCode = currentUserRow?.branchCode || "";
  const defaultBranchName = currentUserRow?.branchName || currentUserRow?.BranchName || "";

  const initialForm = useCallback(() => ({
    prsiId: null,
    prsiNo: "",
    prsiDate: currentDate(),
    branchCode: defaultBranchCode,
    branchName: defaultBranchName,
    custCode: "",
    custName: "",
    vesselName: "",
    shipmentNo: "",
    shipmentDate: "",
    currCode: globalCurrency,
    currName: companyInfo?.currName || "",
    currRate: formatNumber(1, 6),
    vatCode: "",
    vatName: "",
    vatRate: 0,
    contractRef: "",
    contractDate: "",
    moisture: "",
    fe: "",
    nContent: "",
    blNo: "",
    blDate: "",
    loadingPeriod: "",
    transportMode: "",
    otp: "",
    moep: "",
    refDocNo: "",
    actCode: "",
    actName: "",
    particular: "",
    siNo: "",
    apvNo: "",
    grossAmount: formatNumber(0, 2),
    vatAmount: formatNumber(0, 2),
    prsiAmount: formatNumber(0, 2),
    prsiStatus: "O",
    prsiCancelled: "",
    docStatus: "OPEN",
    detailRows: [],
  }), [companyInfo?.currName, defaultBranchCode, defaultBranchName, globalCurrency]);

  const [form, setForm] = useState(initialForm);
  const [topTab, setTopTab] = useState("details");
  const [showSpinner, setShowSpinner] = useState(false);
  const [isViewDocument, setIsViewDocument] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [rcModalOpen, setRcModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showDocumentLookup, setShowDocumentLookup] = useState(false);
  const [fromDate] = useState(monthsAgo(3));
  const [toDate] = useState(currentDate());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsViewDocument(params.get("viewDocument") === "true");
  }, [location.search]);

  const updateForm = useCallback((updates) => {
    setForm((current) => ({ ...current, ...updates }));
  }, []);

  const isEditable = !isViewDocument && String(form.docStatus || "OPEN").toUpperCase() === "OPEN";
  const documentTitle = `${hsDoc?.docName || "Provisional Sales Invoice"} Transaction`;
  const documentSeries = hsDoc?.docSeries || "Auto";
  const isManualSeries = String(documentSeries).toUpperCase() === "MANUAL";

  const {
    getColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    clearAllSorting,
    focusNextRowInput,
    renderHeaderContextMenu,
    renderResizableHeader,
  } = useResizableTableColumns(detailColumnDefs);

  const orderedColumns = getOrderedColumns(detailColumnDefs);
  const sortedRows = getSortedRows(
    form.detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  const totals = useMemo(() => form.detailRows.reduce((sum, row) => ({
    gross: sum.gross + parseFormattedNumber(row.grossAmount),
    vat: sum.vat + parseFormattedNumber(row.vatAmount),
    amount: sum.amount + parseFormattedNumber(row.amount),
  }), { gross: 0, vat: 0, amount: 0 }), [form.detailRows]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      grossAmount: formatNumber(totals.gross, 2),
      vatAmount: formatNumber(totals.vat, 2),
      prsiAmount: formatNumber(totals.amount, 2),
    }));
  }, [totals.amount, totals.gross, totals.vat]);

  const resetForm = useCallback(() => {
    clearAllSorting();
    setForm(initialForm());
    setSelectedRowIndex(null);
    setShowDocumentLookup(false);
  }, [clearAllSorting, initialForm]);

  const applyDocument = useCallback((record) => {
    if (!record) return false;
    setForm({
      ...initialForm(),
      ...record,
      prsiDate: normalizeDate(record.prsiDate) || currentDate(),
      shipmentDate: normalizeDate(record.shipmentDate),
      contractDate: normalizeDate(record.contractDate),
      blDate: normalizeDate(record.blDate),
      currRate: formatNumber(record.currRate || 1, 6),
      grossAmount: formatNumber(record.grossAmount || 0, 2),
      vatAmount: formatNumber(record.vatAmount || 0, 2),
      prsiAmount: formatNumber(record.prsiAmount || 0, 2),
      docStatus: String(record.docStatus || "OPEN").toUpperCase(),
      detailRows: (Array.isArray(record.dt1) ? record.dt1 : []).map((row, index) => ({
        ...row,
        lineNo: row.lineNo || index + 1,
        quantity: formatNumber(row.quantity || 0, 6),
        sellingPrice: formatNumber(row.sellingPrice || 0, 6),
        grossAmount: formatNumber(row.grossAmount || 0, 2),
        vatAmount: formatNumber(row.vatAmount || 0, 2),
        amount: formatNumber(row.amount || 0, 2),
      })),
    });
    return true;
  }, [initialForm]);

  const fetchDocument = useCallback(async (prsiNo, branchCode = form.branchCode, direction = "") => {
    if (!branchCode || (!prsiNo && !direction)) return;
    setShowSpinner(true);
    try {
      const response = await apiClient.get("/getPRSI", {
        params: {
          json_data: JSON.stringify({
            json_data: {
              prsiId: direction ? form.prsiId : null,
              prsiNo,
              branchCode,
              direction,
            },
          }),
        },
      });
      const record = unwrapResult(response);
      if (!record) {
        showErrorAlert("Provisional Sales Invoice", "Transaction was not found.");
        return;
      }
      applyDocument(record);
    } catch (error) {
      showErrorAlert(
        "Provisional Sales Invoice",
        error?.response?.data?.details || error?.response?.data?.message || error?.message,
      );
    } finally {
      setShowSpinner(false);
    }
  }, [applyDocument, form.branchCode, form.prsiId]);

  const changeDetail = (index, field, value, recalculate = false) => {
    setForm((current) => ({
      ...current,
      detailRows: current.detailRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, [field]: value };
        return recalculate ? calculateAmounts(next) : next;
      }),
    }));
  };

  const insertDetail = (index = -1) => {
    setForm((current) => {
      const rows = [...current.detailRows];
      const row = newDetailRow(rows.length, {
        vatCode: current.vatCode,
        vatName: current.vatName,
        vatRate: current.vatRate,
      });
      if (index >= 0) rows.splice(index + 1, 0, row);
      else rows.push(row);
      return {
        ...current,
        detailRows: rows.map((detail, rowIndex) => ({ ...detail, lineNo: rowIndex + 1 })),
      };
    });
  };

  const addDetail = async (index = -1) => {
    const valid = await validateRequiredFields({
      "Header : Customer": form.custCode,
    }, "Add Item");
    if (valid) insertDetail(index);
  };

  const deleteDetail = (index) => {
    setForm((current) => ({
      ...current,
      detailRows: current.detailRows
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, lineNo: rowIndex + 1 })),
    }));
  };

  const handleCustomerClose = async (selected) => {
    setCustomerModalOpen(false);
    if (!selected) return;
    setShowSpinner(true);
    let customer = selected;
    try {
      const response = await apiClient.post("/getCustomer", {
        CUST_CODE: selected.custCode,
      });
      const rawResult = response?.data?.data?.[0]?.result;
      const customerRows = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
      customer = Array.isArray(customerRows) && customerRows[0]
        ? { ...selected, ...customerRows[0] }
        : selected;
    } catch (error) {
      console.warn("Unable to load the complete customer defaults.", error);
    }

    try {
      const selectedCurrency = customer.currCode || globalCurrency;
      const currency = await getTopCurrencyRow(selectedCurrency);
      const rate = selectedCurrency === globalCurrency
        ? 1
        : await getTopForexRate(selectedCurrency, form.prsiDate);
      const vatCode = customer.vatCode || "";
      const vat = getAllTopVatRow?.(vatCode) || {};
      const vatRate = Number(vat.vatRate ?? customer.vatRate ?? 0);
      setForm((current) => ({
        ...current,
        custCode: customer.custCode || "",
        custName: customer.custName || "",
        currCode: selectedCurrency,
        currName: currency?.currName || customer.currName || "",
        currRate: formatNumber(rate || 1, 6),
        vatCode,
      vatName: vat.vatName || customer.vatName || "",
        vatRate,
        detailRows: current.detailRows.map((row) => calculateAmounts({
          ...row,
          vatCode,
          vatName: vat.vatName || customer.vatName || "",
          vatRate,
        })),
      }));
    } catch (error) {
      console.error("Unable to apply the customer's currency.", error);
      await showErrorAlert("Customer Currency", "The customer's currency could not be loaded.");
    } finally {
      setShowSpinner(false);
    }
  };

  const handleItemClose = (selection) => {
    setItemModalOpen(false);
    const selectedRecords = selection?.records ?? selection;
    const selected = Array.isArray(selectedRecords)
      ? selectedRecords[0]
      : selectedRecords;
    if (!selected || selectedRowIndex === null) {
      setSelectedRowIndex(null);
      return;
    }
    setForm((current) => ({
      ...current,
      detailRows: current.detailRows.map((row, index) => index === selectedRowIndex
        ? calculateAmounts({
            ...row,
            itemCode: selected.itemCode || selected.ITEM_CODE || "",
            itemName: selected.itemName || selected.itemDesc || selected.ITEM_NAME || "",
            itemSpecs: selected.itemSpecs || selected.specification || selected.ITEM_SPECS || "",
            uomCode: selected.uomCode || selected.uom || selected.UOM_CODE || "",
            vatCode: current.vatCode || "",
            vatName: current.vatName || "",
            vatRate: Number(current.vatRate || 0),
          })
        : row),
    }));
    setSelectedRowIndex(null);
  };

  const handleCurrRateChange = (value) => {
    const sanitizedValue = String(value).replace(/[^0-9.]/g, "");
    if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
      updateForm({ currRate: sanitizedValue });
    }
  };

  const handleCurrRateBlur = (event) => {
    updateForm({
      currRate: formatNumber(parseFormattedNumber(event.target.value), 6),
    });
  };

  const validate = async () => {
    const valid = await validateRequiredFields({
      Branch: form.branchCode,
      "PRSI Date": form.prsiDate,
      Customer: form.custCode,
      Currency: form.currCode,
      "Currency Rate": parseFormattedNumber(form.currRate) > 0 ? form.currRate : "",
      "Responsibility Center": form.actCode,
      "PRSI Details": form.detailRows,
    });
    if (!valid) return false;

    const errors = [];
    form.detailRows.forEach((row, index) => {
      if (!row.itemCode) errors.push(`- Row ${index + 1}: Item Code`);
      if (parseFormattedNumber(row.quantity) <= 0) errors.push(`- Row ${index + 1}: Quantity must be greater than zero`);
      if (parseFormattedNumber(row.sellingPrice) < 0) errors.push(`- Row ${index + 1}: Selling Price cannot be negative`);
    });
    if (errors.length) {
      showErrorAlert("Provisional Sales Invoice", errors.join("\n"));
      return false;
    }
    return true;
  };

  const handleCopy = () => {
    if (!form.prsiId) return;
    setIsViewDocument(false);
    setForm((current) => ({
      ...current,
      prsiId: null,
      prsiNo: "",
      prsiDate: currentDate(),
      prsiStatus: "O",
      prsiCancelled: "",
      docStatus: "OPEN",
      siNo: "",
      apvNo: "",
      detailRows: current.detailRows.map((row, index) => ({
        ...row,
        lineNo: index + 1,
        groupId: null,
      })),
    }));
  };

  const handlePrint = async (documentIdOverride) => {
    const documentId = typeof documentIdOverride === "string"
      ? documentIdOverride
      : form.prsiId;
    if (!documentId) return;
    setShowSpinner(true);
    try {
      await printDocument(documentId, DOC_TYPE, "Inline", userCode);
    } finally {
      setShowSpinner(false);
    }
  };

  const save = async () => {
    if (!isEditable || !(await validate())) return;
    setShowSpinner(true);
    try {
      const response = await apiClient.post("/upsertPRSI", {
        json_data: {
          ...form,
          userCode,
          currRate: parseFormattedNumber(form.currRate),
          dt1: form.detailRows.map((row, index) => ({
            lineNo: index + 1,
            groupId: row.groupId || null,
            itemCode: row.itemCode,
            itemName: row.itemName,
            itemSpecs: row.itemSpecs,
            uomCode: row.uomCode,
            quantity: parseFormattedNumber(row.quantity),
            sellingPrice: parseFormattedNumber(row.sellingPrice),
            grossAmount: parseFormattedNumber(row.grossAmount),
            vatCode: row.vatCode,
            vatRate: Number(row.vatRate || 0),
            vatAmount: parseFormattedNumber(row.vatAmount),
            amount: parseFormattedNumber(row.amount),
          })),
          detailRows: undefined,
        },
      });
      const result = response?.data?.data?.[0] || {};
      if (Number(result.errorCount || 0) > 0) {
        showErrorAlert("Provisional Sales Invoice", result.errorMsg || "Unable to save the transaction.");
        return;
      }
      await fetchDocument(result.prsiNo || form.prsiNo, form.branchCode);
      useSwalshowSaveSuccessDialog(
        resetForm,
        () => handlePrint(result.prsiId),
      );
    } catch (error) {
      showErrorAlert(
        "Provisional Sales Invoice",
        error?.response?.data?.details || error?.response?.data?.message || error?.message,
      );
    } finally {
      setShowSpinner(false);
    }
  };

  const handleCancelClose = async (confirmation) => {
    setShowCancelModal(false);
    if (!confirmation || !form.prsiId) return;
    setShowSpinner(true);
    try {
      const response = await apiClient.post("/cancelPRSI", {
        json_data: {
          prsiId: form.prsiId,
          userCode,
          password: confirmation.password,
          reason: confirmation.reason,
        },
      });
      const result = response?.data?.data?.[0] || {};
      if (Number(result.errorCount || 0) > 0) {
        showErrorAlert("Provisional Sales Invoice", result.errorMsg || "Cancellation failed.");
        return;
      }
      showSuccessAlert("Provisional Sales Invoice", "Cancellation completed.");
      await fetchDocument(form.prsiNo, form.branchCode);
    } catch (error) {
      showErrorAlert(
        "Provisional Sales Invoice",
        error?.response?.data?.details || error?.response?.data?.message || error?.message,
      );
    } finally {
      setShowSpinner(false);
    }
  };

  const commitNumber = (index, field, decimals, moveNext = false) => {
    const value = Math.max(0, parseFormattedNumber(form.detailRows[index]?.[field]));
    changeDetail(index, field, formatNumber(value, decimals), true);
    if (moveNext) {
      focusNextRowInput(index, field, {
        rows: form.detailRows,
        zeroClearFields: ["sellingPrice"],
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, nextValue) =>
          changeDetail(nextIndex, nextField, nextValue),
      });
    }
  };

  const cellStyle = (key) => {
    const definition = detailColumnDefs.find((column) => column.key === key);
    return {
      ...getColumnStyle(key, definition?.width || 120),
      ...getFrozenColumnStyle(key, orderedColumns, definition?.width || 120, { isHeader: false }),
    };
  };

  const renderDetailCell = (columnKey, row, index) => {
    const style = cellStyle(columnKey);
    const readOnly = (field, className = "") => (
      <input
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${className}`}
        value={row[field] || ""}
        readOnly
      />
    );
    const numberInput = (field, decimals, disabled = false) => (
      <input
        id={`${field}-${index}`}
        className="w-full global-tran-td-inputclass-ui text-right"
        value={row[field] || ""}
        readOnly={!isEditable || disabled}
        onFocus={(event) => event.target.select()}
        onChange={(event) => changeDetail(index, field, event.target.value)}
        onBlur={() => commitNumber(index, field, decimals)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commitNumber(index, field, decimals, true);
        }}
      />
    );

    const renderers = {
      ln: () => <td className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      itemCode: () => (
        <td className="global-tran-td-ui relative" style={style}>
          <div className="flex items-center">
            {readOnly("itemCode", "pr-7")}
            {isEditable && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 cursor-pointer text-lg text-blue-600 hover:text-blue-900"
                onClick={() => {
                  setSelectedRowIndex(index);
                  setItemModalOpen(true);
                }}
              />
            )}
          </div>
        </td>
      ),
      itemName: () => <td className="global-tran-td-ui" style={style}>{readOnly("itemName")}</td>,
      itemSpecs: () => (
        <td className="global-tran-td-ui" style={style}>
          <input
            id={`itemSpecs-${index}`}
            className="w-full global-tran-td-inputclass-ui"
            value={row.itemSpecs || ""}
            readOnly={!isEditable}
            onChange={(event) => changeDetail(index, "itemSpecs", event.target.value)}
          />
        </td>
      ),
      uomCode: () => <td className="global-tran-td-ui" style={style}>{readOnly("uomCode")}</td>,
      quantity: () => <td className="global-tran-td-ui" style={style}>{numberInput("quantity", 6)}</td>,
      sellingPrice: () => <td className="global-tran-td-ui" style={style}>{numberInput("sellingPrice", 6)}</td>,
      grossAmount: () => <td className="global-tran-td-ui" style={style}>{numberInput("grossAmount", 2, true)}</td>,
      vatCode: () => <td className="global-tran-td-ui" style={style}>{readOnly("vatCode")}</td>,
      vatAmount: () => <td className="global-tran-td-ui" style={style}>{numberInput("vatAmount", 2, true)}</td>,
      amount: () => <td className="global-tran-td-ui" style={style}>{numberInput("amount", 2, true)}</td>,
    };
    const renderer = renderers[columnKey];
    return renderer ? <>{renderer()}</> : null;
  };

  const statusColor = form.docStatus === "CANCELLED"
    ? "global-tran-stat-text-closed-ui"
    : form.docStatus === "OPEN"
      ? "global-tran-stat-text-open-ui"
      : "global-tran-stat-text-finalized-ui";

  const printData = {
    documentNo: form.prsiNo,
    docNo: form.prsiNo,
    prsi_no: form.prsiNo,
    documentID: form.prsiId,
    prsi_id: form.prsiId,
    branchCode: form.branchCode,
    branch: form.branchCode,
    docType: DOC_TYPE,
    doc_id: DOC_TYPE,
    userCode,
  };

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={DOC_TYPE}
          onSave={save}
          onReset={resetForm}
          onCancel={() => setShowCancelModal(true)}
          onCopy={handleCopy}
          onAttach={() => setShowAttachModal(true)}
          onPrint={handlePrint}
          printData={printData}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation
          detailsRoute="/page/PRSI"
          isSaveDisabled={!isEditable || form.detailRows.length === 0}
          isAttachDisabled={!form.prsiId}
          isPrintDisabled={!form.prsiId}
          isCopyDisabled={!form.prsiId}
          isCancelDisabled={!form.prsiId || !isEditable}
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
              <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>{form.docStatus}</h1>
            </div>
          </div>
        </div>

        <div className="global-tran-header-div-ui">
          <div className="global-tran-header-tab-div-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-4" id="prsi_hd">
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer id="branchName" label="Branch" type="lookup" value={form.branchName} disabled={!isEditable || Boolean(form.prsiId)} readOnly onLookup={() => setBranchModalOpen(true)} />
              <FieldRenderer id="prsiNo" label="PRSI No." type="lookup" value={form.prsiNo} disabled={Boolean(form.prsiId) || (!isManualSeries && !form.prsiId)} readOnly={!isManualSeries} onChange={(value) => updateForm({ prsiNo: value })} onLookup={() => setShowDocumentLookup(true)} />
              <DateField id="prsiDate" label="PRSI Date" value={form.prsiDate} disabled={!isEditable} updateForm={updateForm} />
                <FieldRenderer id="custCode" label="Customer Code" required type="lookup" value={form.custCode} disabled={!isEditable || Boolean(form.prsiId)} readOnly onLookup={() => setCustomerModalOpen(true)} />
              <FieldRenderer id="custName" label="Customer Name" required type="text" value={form.custName} disabled readOnly />
            
            </div>

            <div className="global-tran-textbox-group-div-ui">
               <div className="flex min-w-0 gap-4">
                <input type="hidden" id="currCode" value={form.currCode || ""} readOnly />
                <div className="min-w-0 flex-[2]">
                  <FieldRenderer
                    id="currName"
                    label="Currency"
                    type="text"
                    value={form.currCode ? `${form.currCode}${form.currName ? ` - ${form.currName}` : ""}` : ""}
                    disabled
                    readOnly
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <FieldRenderer
                    id="currRate"
                    label="Currency Rate"
                    type="amount"
                    value={form.currRate || ""}
                    disabled={!isEditable || globalCurrency === form.currCode}
                    onChange={handleCurrRateChange}
                    onBlur={handleCurrRateBlur}
                    onFocus={(event) => {
                      if (isEditable && globalCurrency !== form.currCode && parseFormattedNumber(event.target.value) === 0) {
                        updateForm({ currRate: "" });
                      }
                    }}
                  />
                </div>
              </div>
              <FieldRenderer id="refDocNo" label="Reference Document No." type="text" value={form.refDocNo} disabled={!isEditable} onChange={(value) => updateForm({ refDocNo: value })} />
              <FieldRenderer id="moisture" label="Moisture" type="text" value={form.moisture} disabled={!isEditable} onChange={(value) => updateForm({ moisture: value })} />
              <FieldRenderer id="moep" label="MOEP" type="text" value={form.moep} disabled={!isEditable} onChange={(value) => updateForm({ moep: value })} />
            
            
              <FieldRenderer id="fe" label="FE" type="text" value={form.fe} disabled={!isEditable} onChange={(value) => updateForm({ fe: value })} />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer id="vesselName" label="Vessel Name" type="text" value={form.vesselName} disabled={!isEditable} onChange={(value) => updateForm({ vesselName: value })} />
              <FieldRenderer id="shipmentNo" label="Shipment No." type="text" value={form.shipmentNo} disabled={!isEditable} onChange={(value) => updateForm({ shipmentNo: value })} />
              <DateField id="shipmentDate" label="Shipment Date" value={form.shipmentDate} disabled={!isEditable} updateForm={updateForm} />
              <FieldRenderer id="contractRef" label="Contract Reference" type="text" value={form.contractRef} disabled={!isEditable} onChange={(value) => updateForm({ contractRef: value })} />
              <DateField id="contractDate" label="Contract Date" value={form.contractDate} disabled={!isEditable} updateForm={updateForm} />
              <FieldRenderer id="nContent" label="N Content" type="text" value={form.nContent} disabled={!isEditable} onChange={(value) => updateForm({ nContent: value })} />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer id="actName" label="Responsibility Center" required type="lookup" value={form.actName || form.actCode} disabled={!isEditable} readOnly onLookup={() => setRcModalOpen(true)} />
              <FieldRenderer id="blNo" label="Bill of Lading No." type="text" value={form.blNo} disabled={!isEditable} onChange={(value) => updateForm({ blNo: value })} />
              <DateField id="blDate" label="Bill of Lading Date" value={form.blDate} disabled={!isEditable} updateForm={updateForm} />
              <FieldRenderer id="transportMode" label="Transport Mode" type="text" value={form.transportMode} disabled={!isEditable} onChange={(value) => updateForm({ transportMode: value })} />
              <FieldRenderer id="loadingPeriod" label="Loading Period" type="text" value={form.loadingPeriod} disabled={!isEditable} onChange={(value) => updateForm({ loadingPeriod: value })} />
              <FieldRenderer id="otp" label="OTP" type="text" value={form.otp} disabled={!isEditable} onChange={(value) => updateForm({ otp: value })} />
            </div>
          </div>

          <div className="mt-3">
            <div className="relative p-2">
              <textarea
                id="particular"
                placeholder=""
                rows={3}
                className="peer global-tran-textbox-remarks-ui pt-2"
                value={form.particular || ""}
                onChange={(event) => updateForm({ particular: event.target.value })}
                disabled={!isEditable}
              />
              <label htmlFor="particular" className="global-tran-floating-label-remarks">
                Remarks
              </label>
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Item Details</span>
          </div>
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedColumns.map((column) => renderResizableHeader(column.label, column.key, column.width, { orderedColumns }))}
                    {isEditable && <th className="global-tran-th-ui sticky right-0 top-0 bg-blue-100" style={transactionActionsHeaderStyle}>Actions</th>}
                  </tr>
                </thead>
                <tbody className="relative">
                  {sortedRows.map(({ row, originalIndex }) => (
                    <tr key={row.groupId || `new-${originalIndex}`} className="global-tran-tr-ui">
                      {orderedColumns.map((column) => renderDetailCell(column.key, row, originalIndex))}
                      {isEditable && (
                        <td className="global-tran-td-ui sticky right-0 bg-white text-center" style={transactionActionsCellStyle}>
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" className="global-tran-td-button-add-ui" onClick={() => addDetail(originalIndex)} title="Add row"><FontAwesomeIcon icon={faPlus} /></button>
                            <button type="button" className="global-tran-td-button-delete-ui" onClick={() => deleteDetail(originalIndex)} title="Delete row"><FontAwesomeIcon icon={faTrashAlt} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderHeaderContextMenu?.()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button type="button" disabled={!isEditable} onClick={() => addDetail()} className="global-tran-tab-footer-button-add-ui"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add</button>
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-[auto_auto] gap-1">
              <span className="global-tran-tab-footer-total-label-ui">Gross Amount:</span><span className="global-tran-tab-footer-total-value-ui">{formatNumber(totals.gross, 2)}</span>
              <span className="global-tran-tab-footer-total-label-ui">VAT Amount:</span><span className="global-tran-tab-footer-total-value-ui">{formatNumber(totals.vat, 2)}</span>
              <span className="global-tran-tab-footer-total-label-ui">Net Amount:</span><span className="global-tran-tab-footer-total-value-ui">{formatNumber(totals.amount, 2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory showHeader={false} isActive={topTab === "history"} endpoint="/getPRSIHistory" cacheKey={`PRSI:${form.branchCode}:${fromDate}:${toDate}`} activeTabKey="PRSI_Summary" branchCode={form.branchCode} startDate={fromDate} endDate={toDate} status="All" onRowDoubleClick={(row) => { setTopTab("details"); fetchDocument(row?.docNo || row?.prsiNo, row?.branchCode || form.branchCode); }} historyExportName="Provisional Sales Invoice History" columnConfigOverrides={historyColumns} />
      </div>

      {branchModalOpen && <BranchLookupModal isOpen={branchModalOpen} onClose={(selected) => { setBranchModalOpen(false); if (selected) updateForm({ branchCode: selected.branchCode || "", branchName: selected.branchName || "" }); }} />}
      {customerModalOpen && <CustomerMastLookupModal isOpen={customerModalOpen} customParam="ActiveAll" onClose={handleCustomerClose} />}
      {rcModalOpen && <RCLookupModal isOpen={rcModalOpen} onClose={(selected) => { setRcModalOpen(false); if (selected) updateForm({ actCode: selected.rcCode || "", actName: selected.rcName || "" }); }} />}
      {itemModalOpen && <ItemMastLookupModal isOpen={itemModalOpen} endpoint="getInvLookupFG" docType="PRSI" onClose={handleItemClose} onCancel={() => { setItemModalOpen(false); setSelectedRowIndex(null); }} />}
      {showCancelModal && <CancelTranModal isOpen={showCancelModal} onClose={handleCancelClose} />}
      {showAttachModal && <AttachDocumentModal isOpen={showAttachModal} params={{ DocumentID: form.prsiId, DocumentName: hsDoc?.docName || "Provisional Sales Invoice", BranchName: form.branchName, DocumentNo: form.prsiNo }} onClose={() => setShowAttachModal(false)} />}
      {showDocumentLookup && <AllTranDocNo isOpen={showDocumentLookup} params={{ branchCode: form.branchCode, branchName: form.branchName, docType: DOC_TYPE, documentTitle, fieldNo: "prsiNo" }} onRetrieve={(direction) => fetchDocument(form.prsiNo, form.branchCode, direction)} onResponse={{ documentNo: form.prsiNo }} onSelected={(row) => { setShowDocumentLookup(false); fetchDocument(row?.docNo || row?.prsiNo, row?.branchCode || form.branchCode); }} onClose={() => setShowDocumentLookup(false)} />}
    </div>
  );
};

const DateField = ({ id, label, value, disabled, updateForm }) => (
  <div className="relative w-full">
    <div className={`flex items-stretch global-ref-textbox-ui ${disabled ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"}`}>
      <DateFormatInput id={id} className="peer flex-grow border-none bg-transparent px-3 focus:outline-none" value={value || ""} disabled={disabled} updateState={updateForm} />
    </div>
    <label htmlFor={id} className={`global-ref-floating-label ${disabled ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>{label}</label>
  </div>
);

export default PRSI;
