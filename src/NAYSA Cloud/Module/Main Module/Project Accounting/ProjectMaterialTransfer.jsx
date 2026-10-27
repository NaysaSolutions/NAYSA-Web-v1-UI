import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faMagnifyingGlass, faPlus, faTableCellsLarge, faTrashAlt, faWarehouse } from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

import Header from "@/NAYSA Cloud/Components/Header.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import SearchProjectRef from "@/NAYSA Cloud/Lookup/SearchProjectRef.jsx";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import WarehouseLookupModal from "@/NAYSA Cloud/Lookup/SearchWareMast.jsx";
import LocationLookupModal from "@/NAYSA Cloud/Lookup/SearchLocation.jsx";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient, fetchDataJson } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import { formatNumber, parseFormattedNumber, useSwalErrorAlert, useSwalProceedConfirm, useSwalshowSaveSuccessDialog } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates.js";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result;
  if (!raw) return null;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
};
const blankRow = (lineNo, invType = "FG", decQty = 2) => ({ lineNo, groupId: "", uniqueKey: "", invType, itemNo: "", itemDesc: "", uomCode: "", qtyHand:formatNumber(0,decQty),lotNo:"",qsCode:"",bbDate:"",fromLoc:"",fromLocName:"",toLoc:"",toLocName:"",fromRc: "", fromRcName: "", toRc: "", toRcName: "", quantity: formatNumber(0, decQty), unitCost: "0.000000", amount: "0.00", costMethod: "", fifoDocCode: "", fifoDocNo: "", wacKey: "", fifoLocId: null, wacLocId: null });
const calculateRowAmount = (row) => Math.round(parseFormattedNumber(row?.quantity) * parseFormattedNumber(row?.unitCost) * 100) / 100;
const formatGlReferenceDate = (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  const isoDate = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[2]}/${isoDate[3]}/${isoDate[1]}`;
  const displayDate = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (displayDate) return `${displayDate[1].padStart(2, "0")}/${displayDate[2].padStart(2, "0")}/${displayDate[3]}`;
  return rawValue;
};

const TransferStockCardModal = ({ branchCode, whCode, invType, userCode, singleSelect = false, onClose }) => {
  const { companyInfo } = useAuth();
  const decQty = Number(companyInfo?.itemDecqtyFG ?? 2);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const endpoint = `getInvLookup${invType}`;
    const docType = `${invType}AJ`;
    fetchDataJson(endpoint, { userCode:userCode || "", branchCode, whouseCode:whCode, locCode:"", docType, tranType:"IL" }, 1, 1000)
      .then((response) => { if (alive) { const raw=response?.data?.[0]?.result; setRows(raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : []); } })
      .catch((error) => Swal.fire({ icon: "error", title: "Stock Lookup Error", text: error?.response?.data?.details || error.message }))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [branchCode, whCode, invType, userCode]);
  const columns = [
    { key:"itemCode",label:"Item Code",classNames:"text-left",hidden:false,renderType:"text" },
    { key:"itemName",label:"Item Name",classNames:"text-left",hidden:false,renderType:"text" },
    { key:"uomCode",label:"UOM Code",classNames:"text-left",hidden:false,renderType:"text" },
    { key:"qtyHand",label:"On Hand",classNames:"text-right",hidden:false,renderType:"number",roundingOff:decQty },
    { key:"unitCost",label:"Unit Cost",classNames:"text-right",hidden:false,renderType:"number",roundingOff:6 },
    { key:"lotNo",label:"Lot No.",classNames:"text-left",hidden:false,renderType:"text" },
    { key:"bbDate",label:"BB Date",classNames:"text-left",hidden:false,renderType:"date" },
    { key:"qstatCode",label:"Quality Status",classNames:"text-left",hidden:false,renderType:"text" },
    { key:"whouseCode",label:"Warehouse",classNames:"text-left",hidden:false,renderType:"text" },
    { key:"locCode",label:"Location",classNames:"text-left",hidden:false,renderType:"text" },
    { key:"uniqueKey",label:"Unique Key",classNames:"text-left",hidden:true,renderType:"text" },
  ];
  if (loading) return <LoadingSpinner />;
  return <GlobalLookupModalv1 isOpen data={rows} endpoint={columns} title={`${invType} Location Balance`} btnCaption="Get Selected Items" singleSelect={singleSelect} preferenceKey={`PRJ_TF_${invType}_LocationBalance`} onClose={onClose} onCancel={() => onClose(null)} />;
};

const ProjectMaterialTransfer = () => {
  const DOC_TYPE = "PRJ_TF";
  const DETAILS_ROUTE = "/prj/transaction/project-material-transfer";
  const api = {
    load: "/getProjectMaterialTransfer",
    upsert: "/upsertProjectMaterialTransfer",
    history: "/getProjectMaterialTransferHistory",
    entries: "/generateProjectMaterialTransferEntries",
  };
  const { currentUserRow, companyInfo, getAllTopHSDocRow } = useAuth();
  const glCurrDefault = companyInfo?.currCode || "PHP";
  const decQty = Number(companyInfo?.itemDecqtyFG ?? 2);
  const getQtyDecimals = () => decQty;
  const getCostDecimals = (invType) => Number(companyInfo?.[{ FG: "itemDecUcostFG", RM: "itemDecUcostRM", MS: "itemDecUcostMS" }[String(invType || "").toUpperCase()]] ?? 2);
  const hsDoc = getAllTopHSDocRow?.(DOC_TYPE) || {};
  const documentTitle = `${hsDoc?.docName || "Project Material Transfer"} Transaction`;
  const { pagePermission, isReadOnly, isFullAccess, canSave } = usePagePermission({ componentKey: "ProjectMaterialTransfer", menuName:documentTitle, debug:false });
  const [topTab, setTopTab] = useState("details");
  const [loading, setLoading] = useState(false);
  const [docLookupOpen, setDocLookupOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(null);
  const [locationOpen, setLocationOpen] = useState(null);
  const [rcOpen, setRcOpen] = useState(null);
  const [itemLookup, setItemLookup] = useState(null);
  const [itemLookupIndex, setItemLookupIndex] = useState(null);
  const [selectedDetailIndex, setSelectedDetailIndex] = useState(null);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addDropdownRef = useRef(null);
  const initial = useCallback(() => ({ documentID: "", documentNo: "", documentDate: useGetCurrentDayV2(), documentStatus: "", status: "OPEN", branchCode: currentUserRow?.branchCode || "", branchName: currentUserRow?.branchName || "", projCode: "", projName: "", custCode: "", custName: "", phaseCode: "", siteCode: "", actCode: "", rcCode: "", fromWh: "", fromWhName: "", fromLoc: "", fromLocName: "", toWh: "", toWhName: "", toLoc: "", toLocName: "", referenceNo: "", remarks: "", detailRows: [], detailRowsGL: [], startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31` }), [currentUserRow]);
  const [state, setState] = useState(initial);
  const update = (patch) => setState((old) => ({ ...old, ...patch }));
  const normalizedStatus = String(state.status || "").trim().toUpperCase();
  const normalizedDocumentStatus = String(state.documentStatus || "").trim().toUpperCase();
  const isCancelled = ["C", "CANCELLED"].includes(normalizedStatus)
    || ["C", "CANCELLED"].includes(normalizedDocumentStatus);
  const isFinalized = ["F", "FINALIZED", "POSTED", "CLOSED"].includes(normalizedStatus)
    || ["F", "FINALIZED", "POSTED", "CLOSED"].includes(normalizedDocumentStatus);
  const finalized = isCancelled || isFinalized;
  const statusLabel = isCancelled ? "CANCELLED" : isFinalized ? "FINALIZED" : "OPEN";
  const statusColor = isCancelled
    ? "global-tran-stat-text-closed-ui"
    : isFinalized
      ? "global-tran-stat-text-finalized-ui"
      : "global-tran-stat-text-open-ui";
  const total = useMemo(() => state.detailRows.reduce((sum, row) => sum + calculateRowAmount(row), 0), [state.detailRows]);
  const totalDebit = useMemo(() => state.detailRowsGL.reduce((sum, row) => sum + parseFormattedNumber(row.debit), 0), [state.detailRowsGL]);
  const totalCredit = useMemo(() => state.detailRowsGL.reduce((sum, row) => sum + parseFormattedNumber(row.credit), 0), [state.detailRowsGL]);

  useEffect(() => {
    const closeDropdown = (event) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(event.target)) setShowAddDropdown(false);
    };
    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, []);

  const reset = useCallback(() => setState(initial()), [initial]);
  const load = useCallback(async (docNo, branchCode, tranType) => {
    setLoading(true);
    try {
      const response = await apiClient.get(api.load, { params: { tfNo: docNo, branchCode } });
      const data = parseResult(response);
      if (!data) return;
      setState((old) => ({ ...old, documentID: data.tfId || "", documentNo: data.tfNo || "", documentDate: useformatToDatev2(data.tfDate), documentStatus: data.documentStatus || "", status: data.docStatus || "OPEN", branchCode: data.branchCode || "", projCode:data.projCode || "", projName:data.projName || "", custCode:data.custCode || "", custName:data.custName || "", phaseCode:data.phaseCode || "", siteCode:data.siteCode || "", actCode:data.actCode || "", rcCode:data.rcCode || "", fromWh: data.fromWh || "", fromWhName: data.fromWhName || "", fromLoc: data.fromLoc || "", fromLocName: data.fromLocName || "", toWh: data.toWh || "", toWhName: data.toWhName || "", toLoc: data.toLoc || "", toLocName: data.toLocName || "", referenceNo: data.refNo || data.referenceNo || "", remarks: data.particular || "", detailRows: (data.dt1 || []).map((row, index) => ({ ...row, lineNo: row.lineNo || index + 1, fromRc:data.rcCode || "", toRc:row.toRc || row.toActcode || data.rcCode || "", qtyHand:formatNumber(row.qtyHand || 0,getQtyDecimals(row.invType)),quantity: formatNumber(row.quantity || 0, getQtyDecimals(row.invType)), unitCost: formatNumber(row.unitCost || 0, getCostDecimals(row.invType)), amount: formatNumber(row.amount || 0, 2) })), detailRowsGL: (data.dt2 || []).map((row) => ({ ...row, slRefNo: row.slRefNo ?? row.slrefNo ?? "", slRefDate: row.slRefDate ?? row.slrefDate ?? "" })) }));
    } catch (error) { await Swal.fire({ icon: "error", title: "Retrieval Error", text: error?.response?.data?.details || error.message }); }
    finally { setLoading(false); }
  }, [companyInfo]);

  const changeDetail = (index, field, value) => setState((old) => ({ ...old, detailRowsGL: [], detailRows: old.detailRows.map((row, i) => {
    if (i !== index) return row;
    const nextRow = { ...row, [field]: value };
    if (field === "quantity" || field === "unitCost") nextRow.amount = formatNumber(calculateRowAmount(nextRow), 2);
    return nextRow;
  }) }));
  const confirmApplyDetailValue = async (index, field, value, label, extra = {}) => {
    if (index !== 0 || state.detailRows.length <= 1) {
      setState((old) => ({ ...old, detailRowsGL: [], detailRows: old.detailRows.map((row, i) => i === index ? { ...row, [field]: value, ...extra } : row) }));
      return;
    }
    const result = await useSwalProceedConfirm(
      `Apply ${label} changes?`,
      `Detail already has records.\nDo you want to apply the updated ${label} to all detail rows?`,
      "Yes, update all",
      "No",
    );
    setState((old) => ({
      ...old,
      detailRowsGL: [],
      detailRows: old.detailRows.map((row, i) =>
        result.isConfirmed || i === index ? { ...row, [field]: value, ...extra } : row,
      ),
    }));
  };
  const confirmApplyHeaderValue = async (field, value, label, headerPatch, detailExtra = {}) => {
    if (state.tranType === "O" && state.detailRows.some((row) => parseFormattedNumber(row.allocatedQty) > 0)) {
      useSwalErrorAlert(`${label} Change Blocked`, `Release all Outgoing Transfer allocations before changing the ${label}.`);
      return;
    }
    if (state.tranType === "O") {
      setState((old) => ({
        ...old,
        ...headerPatch,
        detailRowsGL: [],
        detailRows: old.detailRows.map((row) => ({ ...row, [field]: value, ...detailExtra })),
      }));
      return;
    }
    let applyAll = false;
    if (state.detailRows.length) {
      const result = await useSwalProceedConfirm(
        `Apply ${label} changes?`,
        `Detail already has records.\nDo you want to apply the updated ${label} to all detail rows?`,
        "Yes, update all",
        "No",
      );
      applyAll = result.isConfirmed;
    }
    setState((old) => ({
      ...old,
      ...headerPatch,
      detailRowsGL: [],
      detailRows: applyAll
        ? old.detailRows.map((row) => ({ ...row, [field]: value, ...detailExtra }))
        : old.detailRows,
    }));
  };
  const handleNumericFocus = (event, index, field) => {
    if (parseFormattedNumber(event.target.value) === 0) changeDetail(index, field, "");
    requestAnimationFrame(() => event.target.select());
  };
  const commitNumericValue = (index, field, decimals = 6) => {
    const value = state.detailRows[index]?.[field];
    changeDetail(index, field, formatNumber(parseFormattedNumber(value || 0), decimals));
  };
  const handleNumericEnter = (event, index, field, decimals = 6) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitNumericValue(index, field, decimals);
    requestAnimationFrame(() => {
      const nextInput = document.getElementById(`${field}-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    });
  };
  const addItems = (invType) => { setShowAddDropdown(false); setItemLookup(invType); };
  const stockRowToDetail = (item, invType, lineNo, base = {}) => {
    const uniqueKey = item?.uniqueKey ?? "";
    const numericKey = uniqueKey !== "" && !Number.isNaN(Number(uniqueKey)) ? Number(uniqueKey) : null;
    return {
      ...blankRow(lineNo, invType, decQty),
      ...base,
      lineNo,
      invType,
      uniqueKey,
      itemNo:item?.itemCode ?? "",
      itemDesc:item?.itemName ?? "",
      uomCode:item?.uomCode ?? "",
      qtyHand:formatNumber(item?.qtyHand ?? 0,getQtyDecimals(invType)),
      unitCost:formatNumber(item?.unitCost ?? 0,getCostDecimals(invType)),
      quantity:formatNumber(0,getQtyDecimals(invType)),
      amount:"0.00",
      lotNo:item?.lotNo ?? "",
      bbDate:item?.bbDate ? useformatToDatev2(item.bbDate) : "",
      qsCode:item?.qstatCode ?? item?.qsCode ?? "",
      fromLoc:item?.locCode ?? "",
      fromLocName:item?.locName ?? "",
      fromRc:state.rcCode || "",
      fromRcName:"",
      toRc:base?.toRc || state.rcCode || "",
      toRcName:base?.toRcName || "",
      costMethod:item?.costMethod ?? "",
      fifoLocId:item?.fifoLocId ?? numericKey,
      wacLocId:item?.wacLocId ?? numericKey,
    };
  };
  const insertBlankRow = (index) => setState((old) => {
    const rows = [...old.detailRows];
    rows.splice(index + 1, 0, { ...blankRow(index + 2, "", decQty), fromRc:old.rcCode || "", toRc:old.rcCode || "" });
    return { ...old, detailRowsGL: [], detailRows: rows.map((row, rowIndex) => ({ ...row, lineNo: rowIndex + 1 })) };
  });
  const removeRow = async (index) => {
    const row=state.detailRows[index];
    if(state.detailRows.length===1){useSwalErrorAlert("Delete Transfer Detail","At least one Transfer detail is required.");return;}
    const rows=state.detailRows.filter((_,i)=>i!==index).map((item,i)=>({...item,lineNo:i+1}));setState((old)=>({...old,detailRows:rows,detailRowsGL:[]}));if(state.documentID)await persistRows(rows);
  };
  const generateGLEntries = async (sourceRows = state.detailRows) => {
    if (!sourceRows.length) return [];
    const response = await apiClient.post(api.entries, { json_data: { tfDate: state.documentDate, dt1: sourceRows.map((row, index) => ({ ...row, lineNo: index + 1, amount: calculateRowAmount(row) })) } });
    const rows = response?.data?.data || [];
    if (rows[0]?.errorCount) throw new Error(rows[0].errorMsg || "Unable to generate General Ledger entries.");
    const normalized = rows.map((row, index) => ({ ...row, recNo: index + 1 }));
    update({ detailRowsGL: normalized });
    return normalized;
  };
  const copyDocument = () => setState((old) => ({ ...old, documentID: "", documentNo: "", documentStatus: "", status: "OPEN", documentDate: useGetCurrentDayV2(), detailRows: old.detailRows.map((row, index) => ({ ...row, lineNo: index + 1, groupId: "", quantity:formatNumber(0,decQty), amount:"0.00" })), detailRowsGL: [] }));
  const persistRows = async (sourceRows, showSuccess = false) => {
    setLoading(true);
    try {
      const glRows = await generateGLEntries(sourceRows);
      const payload = { branchCode: state.branchCode, tfId: state.documentID, tfNo: state.documentNo, tfDate: state.documentDate, docCode: DOC_TYPE, projCode:state.projCode,projName:state.projName,custCode:state.custCode,custName:state.custName,phaseCode:state.phaseCode,siteCode:state.siteCode,actCode:state.actCode,rcCode:state.rcCode,fromWh: state.fromWh, toWh: state.toWh, refNo: state.referenceNo, particular: state.remarks, userCode: currentUserRow?.userCode || "", dt1: sourceRows.map((row, i) => ({ ...row, lineNo: i + 1, quantity: parseFormattedNumber(row.quantity), unitCost: parseFormattedNumber(row.unitCost), amount: calculateRowAmount(row), fromActcode: row.fromRc, toActcode: row.toRc })), dt2: glRows.map((row, index) => ({ ...row, recNo: index + 1, debit: parseFormattedNumber(row.debit), credit: parseFormattedNumber(row.credit) })) };
      console.log("Project Material Transfer Upsert Payload:", JSON.stringify({ json_data: payload }, null, 2));
      console.table(payload.dt1);
      const response = await apiClient.post(api.upsert, { json_data: payload });
      const result = response?.data?.data?.[0] || {};
      if (result.errorCount) throw new Error(result.errorMsg);
      await load(result.docNo || state.documentNo, state.branchCode);
      if (showSuccess) useSwalshowSaveSuccessDialog(reset);
    } catch (error) { await Swal.fire({ icon: "error", title: "Save Error", text: error?.response?.data?.details || error?.response?.data?.message || error.message }); }
    finally { setLoading(false); }
  };
  const save = async () => {
    const missing = [];
    if (!state.fromWh) missing.push("From Warehouse");
    if (!state.toWh) missing.push("To Warehouse");
    if (missing.length) return useSwalErrorAlert("Save Error", `The following fields are required: ${missing.join(", ")}.`);
    if (!state.projCode) missing.push("Project Code");
    if (!state.detailRows.length) return useSwalErrorAlert("Save Error", "At least one Item Detail is required.");
    return persistRows(state.detailRows, true);
  };

  const detailColumnDefs = useMemo(() => [
    { key: "ln", label: "LN", width: 56 },
    { key: "invType", label: "Type", width: 80 },
    { key: "itemNo", label: "Item Code", width: 130 },
    { key: "itemDesc", label: "Item Name", width: 280 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "qtyHand", label: "Qty on Hand", width: 130 },
    { key: "quantity", label: "Quantity", width: 145 },
    { key: "unitCost", label: "Unit Cost", width: 130 },
    { key: "amount", label: "Amount", width: 150 },
    { key: "lotNo", label: "Lot No.", width: 130 },
    { key: "bbDate", label: "BB Date", width: 125 },
    { key: "qsCode", label: "Quality Status", width: 140 },
    { key: "fromLoc", label: "From Location", width: 150 },
    { key: "toLoc", label: "To Location", width: 150 },
    { key: "fromRc", label: "From RC", width: 140 },
    { key: "toRc", label: "To RC", width: 140 },
  ], []);
  const {
    getColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    renderHeaderContextMenu,
    renderResizableHeader,
  } = useResizableTableColumns(detailColumnDefs);
  const visibleDetailColumns = getOrderedColumns(detailColumnDefs);
  const sortedDetailRows = getSortedRows(
    state.detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) =>
      sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );
  const detailCellStyle = (column) => ({
    ...getColumnStyle(column.key, column.width),
    ...getFrozenColumnStyle(column.key, visibleDetailColumns, column.width, {
      isHeader: false,
    }),
  });
  const renderLookupCell = (value, onLookup, disabled = false) => (
    <div className="relative flex items-center">
      <input
        className="global-tran-td-inputclass-ui w-full cursor-pointer border-0 bg-transparent pr-6 text-center text-xs"
        value={value || ""}
        readOnly
      />
      {!finalized && !disabled && (
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="absolute right-2 cursor-pointer text-blue-600 hover:text-blue-900"
          onClick={onLookup}
        />
      )}
    </div>
  );
  const renderDetailCell = (column, row, index) => {
    const common = "global-tran-td-ui";
    const style = detailCellStyle(column);
    switch (column.key) {
      case "ln":
        return <td key={column.key} className={`${common} text-center`} style={style}>{index + 1}</td>;
      case "invType":
        return <td key={column.key} className={common} style={style}>{row.itemNo ? row.invType : <select className="global-tran-td-inputclass-ui w-full border-0 bg-transparent text-xs" value={row.invType || ""} disabled={finalized} onChange={(event) => setState((old) => ({ ...old, detailRowsGL: [], detailRows: old.detailRows.map((detail, rowIndex) => rowIndex === index ? { ...blankRow(detail.lineNo, event.target.value, decQty), whCode: detail.whCode || old.whCode, locCode: detail.locCode || old.locCode } : detail) }))}><option value="">Select Type</option><option value="FG">FG</option><option value="RM">RM</option><option value="MS">MS</option></select>}</td>;
      case "itemNo":
        return <td key={column.key} className={common} style={style}>{row.itemNo ? row.itemNo : renderLookupCell("", () => { if (row.invType) setItemLookupIndex(index); }, !row.invType)}</td>;
      case "itemDesc":
      case "uomCode":
      case "lotNo":
      case "qsCode":
      case "bbDate":
        return <td key={column.key} className={common} style={style}>{row[column.key]}</td>;
      case "qtyHand":
        return <td key={column.key} className={`${common} text-right`} style={style}>{formatNumber(row.qtyHand || 0,getQtyDecimals(row.invType))}</td>;
      case "fromRc":
        return <td key={column.key} className={common} style={style}>{state.rcCode || row.fromRc || ""}</td>;
      case "toRc":
        return <td key={column.key} className={common} style={style}>{renderLookupCell(row.toRc || state.rcCode || "", () => { setSelectedDetailIndex(index); setRcOpen("toRc"); })}</td>;
      case "fromLoc":
        return <td key={column.key} className={common} style={style}>{row.fromLoc || ""}</td>;
      case "toLoc":
        return <td key={column.key} className={common} style={style}>{renderLookupCell(row.toLoc || "", () => { setSelectedDetailIndex(index); setLocationOpen("detailTo"); }, !state.toWh)}</td>;
      case "quantity": {
        const decimals=getQtyDecimals(row.invType);
        return <td key={column.key} className={common} style={style}><input id={`quantity-${index}`} className="global-tran-td-inputclass-ui w-full border-0 bg-transparent text-right text-xs" value={row.quantity || ""} disabled={finalized || !row.uniqueKey} onFocus={(event)=>handleNumericFocus(event,index,"quantity")} onChange={(event)=>changeDetail(index,"quantity",event.target.value.replace(/[^0-9.-]/g,""))} onBlur={()=>commitNumericValue(index,"quantity",decimals)} onKeyDown={(event)=>handleNumericEnter(event,index,"quantity",decimals)}/></td>;
      }
      case "unitCost": {
        const field = column.key;
        const disabled = true;
        const decimals = getCostDecimals(row.invType);
        return <td key={column.key} className={common} style={style}><input id={`${field}-${index}`} className="global-tran-td-inputclass-ui w-full border-0 bg-transparent text-right text-xs" value={row[field]} disabled={disabled} onFocus={(event) => handleNumericFocus(event, index, field)} onChange={(event) => changeDetail(index, field, event.target.value.replace(/[^0-9.-]/g, ""))} onBlur={() => commitNumericValue(index, field, decimals)} onKeyDown={(event) => handleNumericEnter(event, index, field, decimals)} /></td>;
      }
      case "amount":
        return <td key={column.key} className={`${common} text-right`} style={style}>{formatNumber(calculateRowAmount(row), 2)}</td>;
      default:
        return null;
    }
  };
  const glColumnDefs = useMemo(() => [
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
  ], [glCurrDefault]);
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
    (entry, sortKey) => sortKey === "recNo" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );
  const renderGlCell = (column, row, originalIndex) => {
    const value = column.key === "recNo"
      ? originalIndex + 1
      : column.key === "slRefDate"
        ? formatGlReferenceDate(row.slRefDate)
        : ["debit", "credit"].includes(column.key)
          ? formatNumber(row[column.key] || 0, 2)
          : row[column.key] || "";
    const style = {
      ...getGlColumnStyle(column.key, column.width),
      ...getGlFrozenColumnStyle(column.key, orderedGlColumns, column.width, { isHeader: false }),
    };
    return <td key={column.key} className={`global-tran-td-ui ${column.key === "recNo" ? "text-center" : ["debit", "credit"].includes(column.key) ? "text-right" : ""}`} style={style}>{value}</td>;
  };

  return <div className="global-tran-main-div-ui">
    {loading && <LoadingSpinner />}
    <div className="global-tran-headerToolbar-ui">
      <Header docType={DOC_TYPE} activeTopTab={topTab} detailsRoute={DETAILS_ROUTE} onDetails={() => setTopTab("details")} onHistory={() => setTopTab("history")} disableRouteNavigation showActions={topTab === "details"} showResetAction={topTab === "details"} onReset={reset} onSave={save} onCopy={copyDocument} showBIRForm={false} showCopyForm showPost={false} isCopyDisabled={!state.documentID || finalized || !canSave} isSaveDisabled={!canSave || isReadOnly || finalized || !state.detailRows.length} isCancelDisabled={!state.documentID || finalized} isResetDisabled={loading} isAttachDisabled={!isFullAccess || !state.documentID} />
    </div>
    <div className={topTab === "details" ? "" : "hidden"}>
      <div className="global-tran-header-ui">
        <div className="global-tran-headertext-div-ui"><h1 className="global-tran-headertext-ui">{documentTitle}</h1></div>
        <div className="global-tran-headerstat-div-ui flex items-center gap-6"><PermissionBadge permission={pagePermission} isReadOnly={isReadOnly} isFullAccess={isFullAccess}/><div><p className="global-tran-headerstat-text-ui">Transaction Status</p><h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>{statusLabel}</h1></div></div>
      </div>

      <section className="global-tran-header-div-ui">
        <div className="global-tran-header-tab-div-ui"><button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Basic Information</button></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="branch" label="Branch" value={state.branchName} disabled />
                <FieldRenderer id="tfNo" label="Transfer No." type="lookup" value={state.documentNo} disabled={finalized} onChange={(v) => update({ documentNo: v })} onBlur={() => state.documentNo && load(state.documentNo, state.branchCode)} onLookup={() => setDocLookupOpen(true)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (state.documentNo) load(state.documentNo,state.branchCode); document.getElementById("documentDate")?.focus(); } }} />
                <div className="relative w-full"><div className={`flex items-stretch global-ref-textbox-ui ${finalized ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"}`}><DateFormatInput id="documentDate" value={state.documentDate} disabled={finalized} className="peer flex-grow border-none bg-transparent px-3 focus:outline-none" updateState={(x) => update({ documentDate: x.documentDate })} /></div><label htmlFor="documentDate" className="global-ref-floating-label">Transfer Date</label></div>
                <FieldRenderer id="referenceNo" label="Reference No." value={state.referenceNo} disabled={finalized} onChange={(v) => update({ referenceNo: v })} />
              </div>
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="project" label="Project Code" required type="lookup" value={state.projCode} disabled={finalized} onLookup={() => setProjectOpen(true)} />
                <FieldRenderer id="projectName" label="Project Name" value={state.projName} disabled />
                <FieldRenderer id="custCode" label="Customer Code" value={state.custCode} disabled />
                <FieldRenderer id="custName" label="Customer Name" value={state.custName} disabled />
              </div>
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="fromWarehouse" label="From Warehouse" required type="lookup" value={state.fromWh ? `${state.fromWh}${state.fromWhName ? ` - ${state.fromWhName}` : ""}` : ""} disabled={finalized} readOnly lookupDisabled={finalized} onLookup={() => setWarehouseOpen("from")} />
                <FieldRenderer id="phaseCode" label="Phase Code" value={state.phaseCode} disabled />
                <FieldRenderer id="siteCode" label="Site Code" value={state.siteCode} disabled />
              </div>
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="toWarehouse" label="To Warehouse" required type="lookup" value={state.toWh ? `${state.toWh}${state.toWhName ? ` - ${state.toWhName}` : ""}` : ""} disabled={finalized} readOnly lookupDisabled={finalized} onLookup={() => setWarehouseOpen("to")} />
                <FieldRenderer id="activityCode" label="Activity Code" value={state.actCode} disabled />
                <FieldRenderer id="rcCode" label="Responsibility Center Code" value={state.rcCode} disabled />
              </div>
        </div>
        <div className="relative mt-4 px-2 pt-0"><textarea id="remarks" rows={3} value={state.remarks} disabled={finalized} onChange={(e) => update({ remarks: e.target.value })} className="peer global-tran-textbox-remarks-ui w-full pt-2" /><label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label></div>
      </section>

      <section className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui"><div className="flex flex-row"><button type="button" className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Item Details</button></div></div>
        <div className="global-tran-table-main-div-ui">
          <div className="global-tran-table-main-sub-div-ui">
            <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui">
                <tr>
                  {visibleDetailColumns.map((column) => (
                    <Fragment key={`transfer-header-${column.key}`}>
                      {renderResizableHeader(column.label, column.key, column.width, {
                        orderedColumns: visibleDetailColumns,
                      })}
                    </Fragment>
                  ))}
                  {!finalized && (
                    <th
                      className="global-tran-th-ui sticky top-0 right-0 bg-blue-300 dark:bg-blue-900"
                      style={transactionActionsHeaderStyle}
                    >
                      Actions
                    </th>
                  )}
                </tr>
                {renderHeaderContextMenu()}
              </thead>
              <tbody className="relative">
                {sortedDetailRows.map(({ row, originalIndex }) => (
                  <tr
                    key={`${row.lineNo}-${row.uniqueKey}-${originalIndex}`}
                    className="global-tran-tr-ui"
                  >
                    {visibleDetailColumns.map((column) =>
                      renderDetailCell(column, row, originalIndex),
                    )}
                    {!finalized && <td
                      className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black"
                      style={transactionActionsCellStyle}
                    >
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                      <button
                        className="global-tran-td-button-add-ui mr-1"
                        disabled={finalized}
                        onClick={() => insertBlankRow(originalIndex)}
                        title="Insert blank row"
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                      <button
                        className="global-tran-td-button-delete-ui"
                        disabled={finalized}
                        onClick={() => removeRow(originalIndex)}
                        title="Delete row"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="global-tran-tab-footer-main-div-ui relative">
          <div className="global-tran-tab-footer-button-div-ui">
            <div ref={addDropdownRef} className="relative inline-block">
              {showAddDropdown && <div className="absolute bottom-[110%] left-0 z-[9999] mb-3 w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:border-slate-700 dark:text-slate-500">Add Item</div>
                <div className="p-2">
                  {[{value:"FG",name:"Finished Goods",hint:"Add FG item",icon:faBoxOpen},{value:"MS",name:"Material Supplies",hint:"Add MS item",icon:faTableCellsLarge},{value:"RM",name:"Raw Material",hint:"Add RM item",icon:faWarehouse}].map((item,index) => <button key={item.value} type="button" className={`${index ? "mt-1 " : ""}flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700`} onClick={() => addItems(item.value)}><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"><FontAwesomeIcon icon={item.icon}/></span><div className="flex flex-col items-start"><span>{item.name}</span><span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">{item.hint}</span></div></div><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">{item.value}</span></button>)}
                </div>
              </div>}
              <button type="button" disabled={finalized || !state.projCode || !state.fromWh || !state.toWh} className={`global-tran-tab-footer-button-add-ui ${finalized || !state.projCode || !state.fromWh || !state.toWh ? "cursor-not-allowed opacity-50" : ""}`} onClick={() => setShowAddDropdown((value) => !value)}><FontAwesomeIcon icon={faPlus} className="mr-2"/>Add</button>
            </div>
          </div>
          <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-1"><div className="global-tran-tab-footer-total-label-ui">Total Quantity:</div><div className="global-tran-tab-footer-total-value-ui">{formatNumber(state.detailRows.reduce((sum,row)=>sum+parseFormattedNumber(row.quantity),0),decQty)}</div><div className="global-tran-tab-footer-total-label-ui">Total Amount:</div><div className="global-tran-tab-footer-total-value-ui">{formatNumber(total,2)}</div></div>
        </div>
      </section>
      <section className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui"><div className="flex flex-row"><button type="button" className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">General Ledger</button></div><div className="flex justify-end"><button type="button" className="global-tran-button-generateGL" style={{ visibility: finalized ? "hidden" : "visible" }} disabled={loading || finalized || !state.detailRows.length} onClick={async () => { setLoading(true); try { await generateGLEntries(); } catch (error) { await Swal.fire({ icon:"error",title:"GL Generation Error",text:error?.response?.data?.details || error.message }); } finally { setLoading(false); } }}>{loading ? "Generating..." : "Generate GL Entries"}</button></div></div>
        <div className="global-tran-table-main-div-ui">
          <div className="global-tran-table-main-sub-div-ui">
            <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui">
                <tr>{orderedGlColumns.map((column) => renderGlResizableHeader(column.label, column.key, column.width, { orderedColumns: orderedGlColumns }))}</tr>
              </thead>
              <tbody className="relative">
                {sortedGlRows.map(({ row, originalIndex }) => <tr key={`${row.recNo || "gl"}-${originalIndex}`} className="global-tran-tr-ui">{orderedGlColumns.map((column) => renderGlCell(column, row, originalIndex))}</tr>)}
              </tbody>
            </table>
            {renderGlHeaderContextMenu()}
          </div>
        </div>
        <div className="global-tran-tab-footer-main-div-ui"><div className="global-tran-tab-footer-button-div-ui"/><div className="global-tran-tab-footer-total-main-div-ui"><div className="global-tran-tab-footer-total-div-ui"><label className="global-tran-tab-footer-total-label-ui">Total Debit ({glCurrDefault}):</label><label className="global-tran-tab-footer-total-value-ui">{formatNumber(totalDebit,2)}</label></div><div className="global-tran-tab-footer-total-div-ui"><label className="global-tran-tab-footer-total-label-ui">Total Credit ({glCurrDefault}):</label><label className="global-tran-tab-footer-total-value-ui">{formatNumber(totalCredit,2)}</label></div></div></div>
      </section>
    </div>
    <div className={topTab === "history" ? "" : "hidden"}><AllTranHistory showHeader={false} isActive={topTab === "history"} endpoint={api.history} cacheKey={`${DOC_TYPE}:${state.branchCode}:${state.startDate}:${state.endDate}`} activeTabKey={`${DOC_TYPE}_Summary`} branchCode={state.branchCode} startDate={state.startDate} endDate={state.endDate} status="All" historyExportName="Project Material Transfer History" onRowDoubleClick={(row) => { load(row.docNo,row.branchCode); setTopTab("details"); }} /></div>
    {docLookupOpen && <AllTranDocNo isOpen params={{ branchCode:state.branchCode,branchName:state.branchName,docType:DOC_TYPE,documentTitle:hsDoc?.docName || "Project Material Transfer",fieldNo:"tfNo" }} docNo={state.documentNo} onRetrieve={async ({docNo,modalClose}) => { await load(docNo,state.branchCode); setDocLookupOpen(Boolean(modalClose)); }} onSelected={({docNo}) => { update({documentNo:docNo}); setDocLookupOpen(false); }} onResponse={{documentNo:state.documentNo}} onClose={() => setDocLookupOpen(false)} />}
    <SearchProjectRef isOpen={projectOpen} onClose={(project) => { setProjectOpen(false); if (project) update({ projCode:project.projectCode || "",projName:project.projectName || "",custCode:project.customerCode || "",custName:project.customerName || "",phaseCode:project.phaseCode || "",siteCode:project.siteCode || "",actCode:project.activityCode || "",rcCode:project.rcCode || "",detailRows:[],detailRowsGL:[] }); }} />
    {warehouseOpen && <WarehouseLookupModal isOpen onClose={(row) => { const side=warehouseOpen; setWarehouseOpen(null); if (!row) return; const code=row.whouseCode || row.whCode || "", name=row.whouseName || row.whName || ""; update(side === "from" ? {fromWh:code,fromWhName:name,fromLoc:"",fromLocName:"",detailRows:[],detailRowsGL:[]} : {toWh:code,toWhName:name,toLoc:"",toLocName:"",detailRowsGL:[]}); }} filter={`ByBC${state.branchCode}`} branchCode={state.branchCode} />}
    {locationOpen && <LocationLookupModal isOpen onClose={async (row) => { const side=locationOpen,index=selectedDetailIndex; setLocationOpen(null); setSelectedDetailIndex(null); if (!row || index === null) return; const code=row.locCode || "", name=row.locName || ""; if(side === "detailTo") await confirmApplyDetailValue(index,"toLoc",code,"To Location",{toLocName:name}); }} whCode={state.toWh} />}
    {rcOpen && <RCLookupModal isOpen onClose={async (row) => { const field=rcOpen,index=selectedDetailIndex; setRcOpen(null); setSelectedDetailIndex(null); if (!row || index === null || field !== "toRc") return; const code=row.rcCode || "",name=row.rcName || ""; await confirmApplyDetailValue(index,"toRc",code,"To RC",{toRcName:name}); }} />}
    {itemLookupIndex !== null && <TransferStockCardModal branchCode={state.branchCode} whCode={state.fromWh} invType={state.detailRows[itemLookupIndex]?.invType || "FG"} userCode={currentUserRow?.userCode} singleSelect onClose={(selection) => { const rowIndex=itemLookupIndex; setItemLookupIndex(null); const item=selection?.records?.[0]; if (!item || rowIndex === null) return; setState((old) => ({ ...old,detailRowsGL:[],detailRows:old.detailRows.map((row,index)=>index===rowIndex?stockRowToDetail(item,row.invType,row.lineNo,row):row) })); }} />}
    {itemLookup && <TransferStockCardModal branchCode={state.branchCode} whCode={state.fromWh} invType={itemLookup} userCode={currentUserRow?.userCode} onClose={(selection) => { const invType=itemLookup; setItemLookup(null); const records=selection?.records || []; if(!records.length)return; setState((old)=>{const existingKeys=new Set(old.detailRows.map((row)=>`${row.invType}:${row.uniqueKey}`));const selected=records.filter((item)=>!existingKeys.has(`${invType}:${item.uniqueKey}`));const newRows=selected.map((item,index)=>stockRowToDetail(item,invType,old.detailRows.length+index+1));return {...old,detailRowsGL:[],detailRows:[...old.detailRows,...newRows]};}); }} />}
  </div>;
};

export default ProjectMaterialTransfer;


