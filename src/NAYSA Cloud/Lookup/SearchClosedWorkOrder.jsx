import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faSearch, faSort, faSpinner, faSyncAlt, faTimes } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData.js";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { formatNumber } from "@/NAYSA Cloud/Global/behavior.jsx";

const fallbackColumns = [
  { key: "branchName", label: "Branch", width: "w-[150px]" },
  { key: "woNo", label: "Work Order No.", width: "w-[150px]" },
  { key: "woDate", label: "Work Order Date", width: "w-[135px]" },
  { key: "itemCode", label: "Item Code", width: "w-[140px]" },
  { key: "itemName", label: "Item Name" },
  { key: "uomCode", label: "UOM", width: "w-[85px]" },
  { key: "bomCode", label: "BOM Code", width: "w-[140px]" },
  { key: "woQty", label: "Quantity to Produce", width: "w-[150px]", right: true },
  { key: "statusName", label: "Status", width: "w-[120px]" },
];

const makeEmptyFilters = (columns) => Object.fromEntries(columns.map(({ key }) => [key, ""]));
const valueOf = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null) ?? "";

const formatDate = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : raw;
};

const normalizeRow = (row) => {
  const status = String(valueOf(row, "woStatus", "WO_STATUS", "docStatus", "status", "DOC_STATUS") || "").toUpperCase();
  return {
    ...row,
    branchCode: valueOf(row, "branchCode", "BRANCH_CODE"),
    branchName: valueOf(row, "branchName", "BRANCH_NAME", "branchCode", "BRANCH_CODE"),
    woId: valueOf(row, "woId", "WO_ID", "documentID", "groupId"),
    woNo: valueOf(row, "woNo", "WO_NO", "docNo", "documentNo"),
    woDate: valueOf(row, "woDate", "WO_DATE", "docDate", "documentDate"),
    itemCode: valueOf(row, "itemCode", "ITEM_CODE"),
    itemName: valueOf(row, "itemName", "ITEM_NAME", "itemDescription", "ITEM_DESCRIPTION"),
    uomCode: valueOf(row, "uomCode", "UOM_CODE", "uom"),
    bomCode: valueOf(row, "bomCode", "BOM_CODE"),
    woQty: valueOf(row, "woQty", "WO_QTY", "qtyToProduce"),
    status,
    statusName: status === "AC" || status === "A" ? "Accounting Closed" : "Closed",
    cancelled: String(valueOf(row, "cancelled", "CANCELLED", "woCancelled", "WO_CANCELLED") || "").toUpperCase(),
  };
};

const SearchClosedWorkOrder = ({ isOpen, onClose, status = "Closed" }) => {
  const { companyInfo } = useAuth() || {};
  const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState(fallbackColumns);
  const [filters, setFilters] = useState(makeEmptyFilters(fallbackColumns));
  const [sort, setSort] = useState({ key: "woNo", direction: "desc" });
  const [loading, setLoading] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    try {
      const [{ data }, configuredColumns] = await Promise.all([
        apiClient.get("/prodFOHTransaction/lookupWorkOrder", { params: { status } }),
        useSelectedHSColConfig("lookupWorkOrder", ""),
      ]);
      const rawResult = data?.data?.[0]?.result || "[]";
      const source = Array.isArray(rawResult) ? rawResult : JSON.parse(rawResult);
      const visibleColumns = Array.isArray(configuredColumns)
        ? configuredColumns.filter((column) => !column.hidden).map((column) => ({
            ...column,
            right: column.classNames === "text-right",
          }))
        : [];
      const nextColumns = visibleColumns.length ? visibleColumns : fallbackColumns;
      setColumns(nextColumns);
      setFilters(makeEmptyFilters(nextColumns));
      setRows((Array.isArray(source) ? source : []).map(normalizeRow));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadRows();
  }, [isOpen, status]);

  const displayedRows = useMemo(() => {
    const result = rows.filter((row) => columns.every(({ key }) => String(row[key] ?? "").toLowerCase().includes(String(filters[key] || "").toLowerCase())));
    return result.sort((left, right) => String(left[sort.key] ?? "").localeCompare(String(right[sort.key] ?? ""), undefined, { numeric: true }) * (sort.direction === "asc" ? 1 : -1));
  }, [filters, rows, sort]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="relative flex max-h-[85vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100">
          <h2 className="global-lookup-headertext-ui pl-3">Select {status === "All" ? "" : `${status} `}Work Order</h2>
          <div className="flex items-center gap-1">
            {Object.values(filters).some(Boolean) && <button type="button" onClick={() => setFilters(makeEmptyFilters(columns))} className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600"><FontAwesomeIcon icon={faEraser} />CLEAR</button>}
            <button type="button" onClick={loadRows} className="p-2 text-slate-400 hover:text-blue-600" title="Refresh Data"><FontAwesomeIcon icon={faSyncAlt} spin={loading} /></button>
            <button type="button" onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-red-600"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
          </div>
        </div>
        <div className="custom-scrollbar flex-grow overflow-auto bg-white">
          {loading ? <div className="flex h-64 flex-col items-center justify-center text-slate-400"><FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" /><p className="text-sm font-medium">Loading Work Orders...</p></div> : (
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200"><tr>{columns.map((column) => <th key={column.key} className={`global-lookup-th-ui ${column.width || ""}`}><div onClick={() => setSort((current) => ({ key: column.key, direction: current.key === column.key && current.direction === "asc" ? "desc" : "asc" }))} className="mb-1 flex cursor-pointer items-center gap-3"><span className="global-lookup-th-text-ui">{column.label}</span><FontAwesomeIcon icon={faSort} className="text-[10px] opacity-40" /></div><div className="relative"><input value={filters[column.key]} onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))} placeholder="Filter..." className="global-lookup-filter-text-ui" /><FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" /></div></th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{displayedRows.length ? displayedRows.map((row, index) => <tr key={`${row.woId || row.woNo}-${index}`} onClick={() => onClose(row)} className="cursor-pointer transition-colors hover:bg-blue-50">{columns.map((column) => {
                const quantityKeys = ["bomQty", "batchQty", "woQty", "qtyToProduce"];
                const value = column.renderType === "date" || column.key === "woDate"
                  ? formatDate(row[column.key])
                  : quantityKeys.includes(column.key)
                    ? formatNumber(row[column.key], quantityDecimals)
                    : row[column.key];
                return <td key={column.key} className={`global-lookup-td-ui ${column.right ? "text-right tabular-nums" : ""}`}>{value}</td>;
              })}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-20 text-center text-sm italic text-slate-400">No {status === "All" ? "" : `${status.toLowerCase()} `}Work Orders found.</td></tr>}</tbody>
            </table>
          )}
        </div>
        <div className="global-lookup-footer-records-div-ui"><span className="global-lookup-footer-records-text-ui">Total Records: {displayedRows.length}</span></div>
      </div>
    </div>
  );
};

export default SearchClosedWorkOrder;
