import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faList, faPen } from "@fortawesome/free-solid-svg-icons";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchClosedWorkOrder from "@/NAYSA Cloud/Lookup/SearchClosedWorkOrder.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { formatNumber, parseFormattedNumber, useSwalErrorAlert, useSwalErrorAlertAPI, useSwalshowSaveSuccessDialog } from "@/NAYSA Cloud/Global/behavior.jsx";

const views = [
  { key: "details", label: "Transaction Details", icon: faPen },
  { key: "summary", label: "Transaction History", icon: faList },
];

const LoadingDots = ({ label = "Refreshing..." }) => (
  <div className="flex h-4 w-8 items-center justify-center" title={label} aria-label={label}>
    <div className="flex items-center justify-center gap-1" aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </div>
);

const FOHTransactionPanel = ({ title, detailTitle, headerFields = [], columns = [], initialRows = 3, totalLabel = "Total", totalKey = "actualLaborCost", emptyMessage, isActive = false, isEditing = false, onViewChange, onRecordLoaded, addVersion = 0, resetVersion = 0, endpoints, summaryColumns = [], registerActions, onSaved }) => {
  const { companyInfo, currentUserRow } = useAuth() || {};
  const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);
  const [activeView, setActiveView] = useState("details");
  const initialValues = useMemo(() => Object.fromEntries(headerFields.map((field) => [field.key, field.defaultValue ?? ""])), [headerFields]);
  const [values, setValues] = useState(initialValues);
  const [workOrderLookupOpen, setWorkOrderLookupOpen] = useState(false);
  const [loadingWorkOrder, setLoadingWorkOrder] = useState(false);
  const emptyRows = useMemo(() => Array.from({ length: initialRows }, (_, index) => ({ lineNo: index + 1 })), [initialRows]);
  const [rows, setRows] = useState(emptyRows);
  const [transactionId, setTransactionId] = useState("");
  const [summaryRows, setSummaryRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const isDirectLabor = columns.some((column) => column.key === "actualCycleTime");
  const isRentAllocation = columns.some((column) => column.key === "standardHourlyRate") && columns.some((column) => column.key === "cycleTime");
  const isLaboratory = columns.some((column) => column.key === "laboratoryCode");

  const toDateInput = (value) => {
    const raw = String(value || "").trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return us ? `${us[3]}-${String(us[1]).padStart(2, "0")}-${String(us[2]).padStart(2, "0")}` : raw;
  };

  const quantityValue = (value) => formatNumber(parseFormattedNumber(value), quantityDecimals);
  const resetDetails = () => {
    setValues(initialValues);
    setRows(emptyRows);
    setTransactionId("");
  };
  useEffect(() => {
    if (isActive) onViewChange?.(activeView);
  }, [activeView, isActive, onViewChange]);

  useEffect(() => {
    if (resetVersion > 0 && isActive && activeView === "details") {
      setValues(initialValues);
      setRows(emptyRows);
      setTransactionId("");
    }
  }, [resetVersion]);

  useEffect(() => {
    if (addVersion > 0 && isActive && activeView === "details") {
      setValues(initialValues);
      setRows(emptyRows);
      setTransactionId("");
    }
  }, [addVersion]);

  const selectWorkOrder = async (selected) => {
    setWorkOrderLookupOpen(false);
    if (!selected) return;

    setLoadingWorkOrder(true);
    try {
      const { data } = await apiClient.post("/getWO", {
        json_data: {
          branchCode: selected.branchCode || "",
          woNo: selected.woNo || "",
          woId: selected.woId || "",
        },
      });
      const workOrder = data?.hd || selected;
      const laborDetails = Array.isArray(selected.laborDetails)
        ? selected.laborDetails
        : typeof selected.laborDetails === "string"
          ? JSON.parse(selected.laborDetails || "[]")
          : [];
      const workOrderDate = toDateInput(workOrder.woDate || workOrder.WO_DATE || selected.woDate);
      const itemCode = workOrder.itemCode || workOrder.ITEM_CODE || selected.itemCode || "";
      const categoryCode = workOrder.categoryCode || workOrder.CATEGORY_CODE || selected.categoryCode || "";
      const categoryDescription = workOrder.categoryName || workOrder.CATEGORY_NAME || workOrder.categoryDescription || selected.categoryName || "";
      setValues((current) => ({
        ...current,
        workOrderNo: workOrder.woNo || workOrder.WO_NO || selected.woNo || "",
        workOrderDate,
        itemCode,
        itemDescription: workOrder.itemName || workOrder.ITEM_NAME || workOrder.itemDescription || workOrder.ITEM_DESCRIPTION || selected.itemName || "",
        categoryCode,
        categoryDescription,
        uom: workOrder.uomCode || workOrder.UOM_CODE || selected.uomCode || "",
        bomQty: quantityValue(workOrder.bomQty ?? workOrder.BOM_QTY ?? selected.bomQty ?? 0),
        batchQty: quantityValue(workOrder.batchQty ?? workOrder.BATCH_QTY ?? selected.batchQty ?? 0),
        qtyToProduce: quantityValue(workOrder.woQty ?? workOrder.WO_QTY ?? workOrder.qtyToProduce ?? selected.woQty ?? 0),
      }));
      if (isDirectLabor) {
        setRows(laborDetails.map((row, index) => ({
          lineNo: row.lineNo ?? index + 1,
          processCode: row.processCode || "",
          processDescription: row.processDescription || row.processName || "",
          actualCycleTime: quantityValue(row.actualCycleTime ?? row.cycleTime ?? 0),
          actualHeadCount: quantityValue(row.actualHeadCount ?? 0),
          actualHourlyRate: Number(row.actualHourlyRate ?? row.standardHourlyRate ?? 0),
          actualLaborCost: Number(row.actualLaborCost ?? 0),
        })));
      } else if (isRentAllocation) {
        const rentResponse = endpoints?.lookupDetails
          ? await apiClient.post(endpoints.lookupDetails, {
              json_data: {
                workOrderNo: workOrder.woNo || workOrder.WO_NO || selected.woNo || "",
                workOrderId: workOrder.woId || workOrder.WO_ID || selected.woId || "",
                branchCode: workOrder.branchCode || workOrder.BRANCH_CODE || selected.branchCode || "",
                itemCode,
              },
            })
          : null;
        const rentDetails = Array.isArray(rentResponse?.data?.data)
          ? rentResponse.data.data
          : laborDetails;
        setRows(rentDetails.map((row, index) => {
          const cycleTime = parseFormattedNumber(row.cycleTime ?? row.actualCycleTime ?? 0);
          const standardHourlyRate = parseFormattedNumber(row.standardHourlyRate ?? 0);
          return {
            lineNo: row.lineNo ?? index + 1,
            processCode: row.processCode || "",
            processDescription: row.processDescription || row.processName || "",
            cycleTime,
            standardHourlyRate,
            amount: cycleTime * standardHourlyRate,
          };
        }));
      } else if (isLaboratory && endpoints?.lookupDetails && workOrderDate) {
        const laboratoryResponse = await apiClient.post(endpoints.lookupDetails, {
          json_data: { categoryCode, itemCode, workOrderDate },
        });
        const laboratoryRows = Array.isArray(laboratoryResponse?.data?.data) ? laboratoryResponse.data.data : [];
        const laboratoryCategory = laboratoryRows[0] || {};
        setValues((current) => ({
          ...current,
          categoryCode: laboratoryResponse?.data?.categoryCode || laboratoryCategory.categoryCode || categoryCode,
          categoryDescription: laboratoryResponse?.data?.categoryName || laboratoryCategory.categoryName || current.categoryDescription || "",
        }));
        setRows(laboratoryRows.map((row, index) => ({
          lineNo: row.lineNo ?? index + 1,
          laboratoryCode: row.laboratoryCode || "",
          laboratoryDescription: row.laboratoryDescription || row.laboratoryName || "",
          testQuantity: quantityValue(row.testQuantity ?? 0),
          unitCost: parseFormattedNumber(row.unitCost),
          laboratoryCost: 0,
          remarks: row.remarks || "",
        })));
      }
    } finally {
      setLoadingWorkOrder(false);
    }
  };

  const updateDetail = (index, key, value) => {
    setRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, [key]: value };
      next.actualLaborCost = parseFormattedNumber(next.actualCycleTime) *
        parseFormattedNumber(next.actualHeadCount) *
        parseFormattedNumber(next.actualHourlyRate);
      if (isLaboratory) {
        next.laboratoryCost = parseFormattedNumber(next.testQuantity) * parseFormattedNumber(next.unitCost);
      }
      return next;
    }));
  };

  const handleDetailNumberChange = (index, key, rawValue) => {
    const sanitizedValue = String(rawValue ?? "").replace(/[^0-9.]/g, "");
    const decimalPattern = new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`);
    if (decimalPattern.test(sanitizedValue) || sanitizedValue === "") {
      updateDetail(index, key, sanitizedValue);
    }
  };

  const formatDetailNumber = (index, key, rawValue) => {
    updateDetail(index, key, quantityValue(rawValue));
  };

  const total = rows.reduce((sum, row) => sum + parseFormattedNumber(row[totalKey] || 0), 0);
  const totalColumnIndex = Math.max(columns.findIndex((column) => column.key === totalKey), 0);

  const saveTransaction = async () => {
    if (!endpoints?.upsert) return;
    const details = rows.filter((row) => String(isLaboratory ? row.laboratoryCode : row.processCode || "").trim()).map((row, index) => (
      isLaboratory
        ? {
          lineNo: row.lineNo ?? index + 1,
          laboratoryCode: row.laboratoryCode || "",
          laboratoryDescription: row.laboratoryDescription || "",
          testQuantity: parseFormattedNumber(row.testQuantity),
          unitCost: parseFormattedNumber(row.unitCost),
          laboratoryCost: parseFormattedNumber(row.laboratoryCost),
          remarks: row.remarks || "",
        }
        : isRentAllocation
        ? {
          lineNo: row.lineNo ?? index + 1,
          processCode: row.processCode || "",
          processDescription: row.processDescription || "",
          cycleTime: parseFormattedNumber(row.cycleTime),
          standardHourlyRate: parseFormattedNumber(row.standardHourlyRate),
          amount: parseFormattedNumber(row.amount),
        }
        : {
          lineNo: row.lineNo ?? index + 1,
          processCode: row.processCode || "",
          processDescription: row.processDescription || "",
          actualCycleTime: parseFormattedNumber(row.actualCycleTime),
          actualHeadCount: parseFormattedNumber(row.actualHeadCount),
          actualHourlyRate: parseFormattedNumber(row.actualHourlyRate),
          actualLaborCost: parseFormattedNumber(row.actualLaborCost),
        }
    ));

    if (!values.workOrderNo || !values.workOrderDate || !details.length) {
      useSwalErrorAlert("Save Error", `Work Order and ${isLaboratory ? "Laboratory" : isRentAllocation ? "Rent Allocation" : "Direct Labor"} Details are required.`);
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiClient.post(endpoints.upsert, { json_data: {
        transactionId,
        workOrderNo: values.workOrderNo,
        workOrderDate: values.workOrderDate,
        itemCode: values.itemCode || "",
        itemDescription: values.itemDescription || "",
        categoryCode: values.categoryCode || "",
        uomCode: values.uom || "",
        bomQty: parseFormattedNumber(values.bomQty),
        batchQty: parseFormattedNumber(values.batchQty),
        qtyToProduce: parseFormattedNumber(values.qtyToProduce),
        details,
        remarks: values.remarks || "",
        userCode: currentUserRow?.userCode || currentUserRow?.USER_CODE || "",
      }});
      const result = response?.data?.data?.[0] || {};
      if (Number(result.errorcount || 0) > 0) {
        useSwalErrorAlert("Save Error", result.errormsg || `Unable to save ${isLaboratory ? "Laboratory" : isRentAllocation ? "Rent Allocation" : "Direct Labor"}.`);
        return;
      }
      setTransactionId(result.transactionId || transactionId);
      useSwalshowSaveSuccessDialog(
        () => { resetDetails(); onSaved?.(true); },
        undefined,
        () => onSaved?.(false),
      );
    } catch (error) {
      useSwalErrorAlertAPI("Save Error", error);
    } finally {
      setIsSaving(false);
    }
  };

  const findTransactions = useCallback(async () => {
    if (!endpoints?.load) return;
    setSummaryLoading(true);
    try {
      const response = await apiClient.get(endpoints.load);
      setSummaryRows(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (error) {
      useSwalErrorAlertAPI("Fetch Failed", error);
    } finally {
      setSummaryLoading(false);
    }
  }, [endpoints?.load]);

  const loadTransaction = async (row) => {
    if (!endpoints?.get || !row?.transactionId) return;
    setIsLoadingRecord(true);
    try {
      const response = await apiClient.post(endpoints.get, { json_data: { transactionId: row.transactionId } });
      const record = response?.data?.data?.[0];
      if (!record) return;
      const recordDetails = Array.isArray(record.details) ? record.details : JSON.parse(record.details || "[]");
      setTransactionId(record.transactionId || "");
      setValues((current) => {
        const next = { ...current, remarks: record.remarks || "" };
        if (Object.prototype.hasOwnProperty.call(current, "workOrderNo")) {
          Object.assign(next, {
            workOrderNo: record.workOrderNo || "", workOrderDate: toDateInput(record.workOrderDate),
            itemCode: record.itemCode || "", itemDescription: record.itemDescription || "", uom: record.uomCode || "",
            bomQty: quantityValue(record.bomQty), batchQty: quantityValue(record.batchQty), qtyToProduce: quantityValue(record.qtyToProduce),
            categoryCode: record.categoryCode || "",
          });
        } else {
          next.cutoffPeriod = record.cutoffPeriod || "";
          if (Object.prototype.hasOwnProperty.call(current, "electricityExpense")) next.electricityExpense = formatNumber(record.productionFohExpense || 0, 2);
          if (Object.prototype.hasOwnProperty.call(current, "depreciationExpense")) next.depreciationExpense = formatNumber(record.productionFohExpense || 0, 2);
          if (Object.prototype.hasOwnProperty.call(current, "dieselExpense")) next.dieselExpense = formatNumber(record.productionFohExpense || 0, 2);
        }
        return next;
      });
      setRows(recordDetails.map((detail, index) => ({ ...detail, lineNo: detail.lineNo ?? index + 1,
        ...(isDirectLabor ? { actualCycleTime: quantityValue(detail.actualCycleTime), actualHeadCount: quantityValue(detail.actualHeadCount) } : {}),
        ...(isLaboratory ? { testQuantity: quantityValue(detail.testQuantity) } : {}),
      })));
      setActiveView("details");
      onRecordLoaded?.();
    } catch (error) {
      useSwalErrorAlertAPI("Fetch Failed", error);
    } finally {
      setIsLoadingRecord(false);
    }
  };

  useEffect(() => {
    registerActions?.({ save: isDirectLabor || isRentAllocation || isLaboratory ? saveTransaction : undefined, find: findTransactions, resetSummary: () => setSummaryRows([]) });
  });

  useEffect(() => {
    if (!isActive || activeView !== "summary" || !endpoints?.load) return undefined;
    findTransactions();
    const refreshTimer = window.setInterval(findTransactions, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [activeView, endpoints?.load, findTransactions, isActive]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {(isSaving || isLoadingRecord || loadingWorkOrder) && <LoadingSpinner />}
      <div className="flex flex-col justify-between gap-2 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 sm:flex-row sm:items-center dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
        <div className="flex flex-wrap gap-0">
          {views.map((view) => (
            <button key={view.key} type="button" onClick={() => setActiveView(view.key)} className={`relative inline-flex items-center gap-2 border px-5 py-3 text-sm font-semibold transition-colors ${activeView === view.key ? "-mb-px rounded-t-lg border-b-white border-slate-200 bg-white text-blue-700 shadow-[inset_0_2px_0_0_#2563eb] dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-900 dark:text-blue-300" : "border-transparent text-slate-500 hover:bg-blue-50/60 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
              <FontAwesomeIcon icon={view.icon} className="text-[11px]" />{view.label}
            </button>
          ))}
        </div>
        <div className="flex min-w-[28px] shrink-0 items-center justify-end">
          {activeView === "summary" && summaryLoading && (
            <LoadingDots />
          )}
        </div>
      </div>

      <div className={activeView === "details" ? "block" : "hidden"}>
        <div className="border-b border-slate-200 p-5 dark:border-slate-700">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-5 w-1 rounded-full bg-blue-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {headerFields.map((field) => field.type === "textarea" ? (
              <div key={field.key} className={field.className || "md:col-span-2 xl:col-span-4"}>
                <div className="relative"><textarea id={`${field.key}-remarks`} rows={3} value={values[field.key] || ""} disabled={!isEditing || field.disabled} onChange={(event) => setValues((previous) => ({ ...previous, [field.key]: event.target.value }))} className="peer global-tran-textbox-remarks-ui w-full pt-3 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" /><label htmlFor={`${field.key}-remarks`} className="global-tran-floating-label-remarks">{field.label}</label></div>
              </div>
            ) : (
              <div key={field.key} className={field.className || ""}>
                <FieldRenderer id={field.key} label={field.label} type={field.type || "text"} value={values[field.key]} required={field.required} readOnly={field.readOnly} disabled={!isEditing || field.disabled || (field.key === "workOrderNo" && loadingWorkOrder)} allowLookupInput={field.allowLookupInput} hideClearButton onLookup={() => field.key === "workOrderNo" && setWorkOrderLookupOpen(true)} onChange={(value) => setValues((previous) => ({ ...previous, [field.key]: value }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-5 w-1 rounded-full bg-blue-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{detailTitle}</h2>
          </div>
          {columns.length ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[850px] border-collapse text-xs">
                <thead><tr className="bg-blue-100 text-slate-800 dark:bg-blue-950 dark:text-slate-100">{columns.map((column) => <th key={column.key} style={{ width: column.width }} className={`border-b border-r border-blue-200 px-3 py-1.5 font-semibold last:border-r-0 dark:border-blue-900 ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"}`}>{column.label}</th>)}</tr></thead>
                <tbody>{rows.map((row, rowIndex) => <tr key={row.lineNo} className="h-8 border-b border-slate-100 last:border-b-0 dark:border-slate-800">{columns.map((column) => {
                  const editable = (isDirectLabor && ["actualCycleTime", "actualHeadCount"].includes(column.key)) || (isLaboratory && column.key === "testQuantity");
                  const numericValue = column.key === "actualLaborCost" ? formatNumber(row[column.key] || 0, 2) : column.numeric ? formatNumber(row[column.key] || 0, column.quantity ? quantityDecimals : 2) : row[column.key] || "";
                  return <td key={column.key} className={`border-r border-slate-100 px-3 py-1 last:border-r-0 dark:border-slate-800 ${column.align === "right" ? "text-right tabular-nums" : column.align === "center" ? "text-center" : "text-left"}`}>
                    {editable ? <input
                      type="text"
                      inputMode="decimal"
                      value={row[column.key] ?? ""}
                      disabled={!isEditing}
                      onChange={(event) => handleDetailNumberChange(rowIndex, column.key, event.target.value)}
                      onFocus={(event) => {
                        if (parseFormattedNumber(event.currentTarget.value) === 0) {
                          updateDetail(rowIndex, column.key, "");
                        }
                        event.currentTarget.select();
                      }}
                      onBlur={(event) => formatDetailNumber(rowIndex, column.key, event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        formatDetailNumber(rowIndex, column.key, event.currentTarget.value);
                        const nextRow = rowIndex + 1;
                        window.setTimeout(() => document.getElementById(`foh-${column.key}-${nextRow}`)?.focus(), 0);
                      }}
                      id={`foh-${column.key}-${rowIndex}`}
                      className="h-6 w-full bg-transparent text-right tabular-nums outline-none focus:ring-0 disabled:cursor-not-allowed"
                    /> : numericValue}
                  </td>;
                })}</tr>)}</tbody>
                <tfoot><tr className="border-t border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/50">
                  {totalColumnIndex > 0 && <td colSpan={totalColumnIndex} className="px-3 py-1.5 text-right font-semibold">{totalLabel}</td>}
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatNumber(total, 2)}</td>
                  {columns.length - totalColumnIndex - 1 > 0 && <td colSpan={columns.length - totalColumnIndex - 1} />}
                </tr></tfoot>
              </table>
            </div>
          ) : <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30 px-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/20">{emptyMessage}</div>}
        </div>
      </div>

      <div className={activeView === "summary" ? "block" : "hidden"}><div className="p-5"><div className="mb-4 flex items-center gap-3"><span className="h-5 w-1 rounded-full bg-blue-600" aria-hidden="true" /><h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title} History</h2></div>{summaryColumns.length ? <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="w-full min-w-[900px] border-collapse text-xs"><thead><tr className="bg-blue-100 text-slate-800 dark:bg-blue-950 dark:text-slate-100"><th className="w-20 border-b border-r border-blue-200 px-3 py-1.5 text-center font-semibold">Actions</th>{summaryColumns.map((column) => <th key={column.key} style={{ width: column.width }} className={`border-b border-r border-blue-200 px-3 py-1.5 font-semibold last:border-r-0 ${column.align === "right" ? "text-right" : "text-left"}`}>{column.label}</th>)}</tr></thead><tbody>{summaryLoading && summaryRows.length === 0 ? <tr><td colSpan={summaryColumns.length + 1} className="px-3 py-8 text-center text-slate-400">Loading records...</td></tr> : summaryRows.length ? summaryRows.map((row) => <tr key={row.transactionId} className="h-8 border-b border-slate-100 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800"><td className="border-r border-slate-100 px-3 py-1 text-center dark:border-slate-800"><button type="button" onClick={() => loadTransaction(row)} className="inline-flex h-6 w-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-600 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white" title="View Transaction" aria-label="View Transaction"><FontAwesomeIcon icon={faEye} /></button></td>{summaryColumns.map((column) => <td key={column.key} className={`border-r border-slate-100 px-3 py-1 last:border-r-0 dark:border-slate-800 ${column.align === "right" ? "text-right tabular-nums" : "text-left"}`}>{column.numeric ? formatNumber(parseFormattedNumber(row[column.key]), column.decimals ?? quantityDecimals) : String(row[column.key] ?? "")}</td>)}</tr>) : <tr><td colSpan={summaryColumns.length + 1} className="px-3 py-8 text-center text-slate-400">No records found.</td></tr>}</tbody></table></div> : <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30 text-xs text-slate-400">History is not yet configured.</div>}</div></div>
      <SearchClosedWorkOrder
        isOpen={workOrderLookupOpen}
        onClose={selectWorkOrder}
        transactionType={endpoints?.lookupType || ""}
        excludeWorkOrderNo={values.workOrderNo || ""}
      />
    </section>
  );
};

export default FOHTransactionPanel;
