import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faClipboardCheck, faMagnifyingGlass, faMinus, faPlus, faTableCellsLarge, faTrashAlt, faWarehouse } from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

import Header from "@/NAYSA Cloud/Components/Header.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import SearchProjectRef from "@/NAYSA Cloud/Lookup/SearchProjectRef.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import WarehouseLookupModal from "@/NAYSA Cloud/Lookup/SearchWareMast.jsx";
import LocationLookupModal from "@/NAYSA Cloud/Lookup/SearchLocation.jsx";
import QstatLookupModal from "@/NAYSA Cloud/Lookup/SearchQStatRef.jsx";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import SearchGlobalItemPickingModal from "@/NAYSA Cloud/Lookup/SearchGlobalItemPickingModal.jsx";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import { formatNumber, parseFormattedNumber, useSwalErrorAlert, useSwalProceedConfirm, useSwalshowSaveSuccessDialog } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates.js";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const DOC_TYPE = "PRJ_BL";
const DETAILS_ROUTE = "/page/ProjectMaterialBackload";
const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result;
  if (!raw) return null;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
};
const blankRow = (lineNo, invType = "FG") => ({ lineNo, groupId: "", uniqueKey: "", invType, itemNo: "", itemDesc: "", uomCode: "", qtyHand: "0.000000", requestQty: "0.000000", allocatedQty: "0.000000", allocationStatus: "F", quantity: "0.000000", unitCost: "0.000000", amount: "0.00", lotNo: "", bbDate: "", qsCode: "", whCode: "", locCode: "", acctCode: "", costMethod: "", fifoDocCode: "", fifoDocNo: "", wacKey: "", fifoLocId: null, wacLocId: null });
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

const StockModal = ({ request, onClose }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    apiClient.post("/getProjectMaterialBackloadOpenStock", { json_data: request })
      .then((response) => { if (alive) setRows(parseResult(response)?.stockRows || []); })
      .catch((error) => Swal.fire({ icon: "error", title: "Stock Lookup Error", text: error?.response?.data?.details || error.message }))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [request]);
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-5">
      {loading && <LoadingSpinner />}
      <div className="w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold text-blue-700">Select Stock Card Layer</h2><button onClick={() => onClose(null)}>×</button></div>
        <div className="max-h-[60vh] overflow-auto p-4">
          <table className="w-full border-collapse text-xs"><thead className="bg-blue-100"><tr>{["Method","Warehouse","Location","Lot No.","Quality Status","BB Date","Qty on Hand","Unit Cost","Reference","Action"].map((x) => <th key={x} className={`border border-slate-200 px-3 py-2 ${["Qty on Hand","Unit Cost"].includes(x) ? "text-right" : "text-left"}`}>{x}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.uniqueKey}><td className="border px-3 py-2">{row.costMethod}</td><td className="border px-3 py-2">{row.whCode}</td><td className="border px-3 py-2">{row.locCode}</td><td className="border px-3 py-2">{row.lotNo}</td><td className="border px-3 py-2">{row.qsCode}</td><td className="border px-3 py-2">{row.bbDate}</td><td className="border px-3 py-2 text-right">{formatNumber(row.qtyHand, 6)}</td><td className="border px-3 py-2 text-right">{formatNumber(row.unitCost, 6)}</td><td className="border px-3 py-2">{row.fifoDocNo || row.wacKey}</td><td className="border px-3 py-2 text-center"><button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={() => onClose(row)}>Select</button></td></tr>)}</tbody></table>
          {!loading && !rows.length && <div className="p-8 text-center text-slate-500">No available stock for the selected warehouse and location.</div>}
        </div>
      </div>
    </div>
  );
};

const ProjectMaterialBackload = () => {
  const { currentUserRow, companyInfo, getAllTopHSDocRow } = useAuth();
  const glCurrDefault = companyInfo?.currCode || "PHP";
  const getQtyDecimals = (invType) => Number(companyInfo?.[{ FG: "itemDecqtyFG", RM: "itemDecqtyRM", MS: "itemDecqtyMS" }[String(invType || "").toUpperCase()]] ?? 2);
  const getCostDecimals = (invType) => Number(companyInfo?.[{ FG: "itemDecUcostFG", RM: "itemDecUcostRM", MS: "itemDecUcostMS" }[String(invType || "").toUpperCase()]] ?? 2);
  const hsDoc = getAllTopHSDocRow?.(DOC_TYPE) || {};
  const documentTitle = `${hsDoc?.docName || "Project Material Backload"} Transaction`;
  const { pagePermission, isReadOnly, isFullAccess, canSave } = usePagePermission({ componentKey:"ProjectMaterialBackload", menuName:documentTitle, debug:false });
  const [topTab, setTopTab] = useState("details");
  const [loading, setLoading] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [docLookupOpen, setDocLookupOpen] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [itemLookup, setItemLookup] = useState(null);
  const [itemLookupIndex, setItemLookupIndex] = useState(null);
  const [stockIndex, setStockIndex] = useState(null);
  const [pickingIndex, setPickingIndex] = useState(null);
  const [pickingStockRows, setPickingStockRows] = useState([]);
  const [existingAllocations, setExistingAllocations] = useState([]);
  const [selectedDetailIndex, setSelectedDetailIndex] = useState(null);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addDropdownRef = useRef(null);
  const initial = useCallback(() => ({ documentID: "", documentNo: "", documentDate: useGetCurrentDayV2(), documentStatus: "", status: "OPEN", branchCode: currentUserRow?.branchCode || "", branchName: currentUserRow?.branchName || "", tranType: "I", projCode: "", projName: "", custCode: "", custName: "", phaseCode: "", siteCode: "", actCode: "", rcCode: "", referenceNo: "", whCode: "", whName: "", locCode: "", locName: "", remarks: "", detailRows: [], detailRowsGL: [], startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31` }), [currentUserRow]);
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
      const response = await apiClient.get("/getProjectMaterialBackload", { params: { blNo: docNo, branchCode, tranType } });
      const data = parseResult(response);
      if (!data) return;
      setState((old) => ({ ...old, documentID: data.blId || "", documentNo: data.blNo || "", documentDate: useformatToDatev2(data.blDate), documentStatus: data.documentStatus || "", status: data.docStatus || "OPEN", branchCode: data.branchCode || "", tranType: data.tranType || "I", projCode: data.projCode || "", projName: data.projName || "", custCode: data.custCode || "", custName: data.custName || "", phaseCode: data.phaseCode || "", siteCode: data.siteCode || "", actCode: data.actCode || "", rcCode: data.rcCode || "", referenceNo: data.referenceNo || "", whCode: data.whCode || "", whName: data.whName || "", locCode: data.locCode || "", locName: data.locName || "", remarks: data.particular || "", detailRows: (data.dt1 || []).map((row, index) => ({ ...row, lineNo: row.lineNo || index + 1, qtyHand: formatNumber(row.qtyHand || 0, getQtyDecimals(row.invType)), requestQty: formatNumber(row.requestQty ?? row.quantity ?? 0, getQtyDecimals(row.invType)), allocatedQty: formatNumber(row.allocatedQty ?? row.quantity ?? 0, getQtyDecimals(row.invType)), allocationStatus: row.allocationStatus || "F", quantity: formatNumber(row.quantity || 0, getQtyDecimals(row.invType)), unitCost: formatNumber(row.unitCost || 0, getCostDecimals(row.invType)), amount: formatNumber(row.amount || 0, 2) })), detailRowsGL: data.dt2 || [] }));
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
      useSwalErrorAlert(`${label} Change Blocked`, `Release all Outgoing Backload allocations before changing the ${label}.`);
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
  const insertBlankRow = (index) => setState((old) => {
    const rows = [...old.detailRows];
    rows.splice(index + 1, 0, blankRow(index + 2, ""));
    return { ...old, detailRowsGL: [], detailRows: rows.map((row, rowIndex) => ({ ...row, lineNo: rowIndex + 1 })) };
  });
  const removeRow = async (index) => {
    const row=state.detailRows[index];
    if(state.detailRows.length===1){useSwalErrorAlert("Delete Backload Detail","At least one Backload detail is required.");return;}
    if(state.tranType==="O" && parseFormattedNumber(row?.allocatedQty)>0){const confirm=await useSwalProceedConfirm("Delete Allocated Backload Detail?","Deleting this line will release its inventory allocation.","Yes");if(!confirm?.isConfirmed)return;setLoading(true);try{await apiClient.post("/saveProjectMaterialBackloadAllocation",{json_data:{blId:state.documentID,blNo:state.documentNo,blDate:state.documentDate,branchCode:state.branchCode,groupId:row.groupId,lineNo:row.lineNo,invType:row.invType,itemNo:row.itemNo,requestedQty:parseFormattedNumber(row.requestQty),userCode:currentUserRow?.userCode||"",dt1:[]}});}catch(error){useSwalErrorAlert("Delete Detail Failed",error?.response?.data?.details||error.message);setLoading(false);return;}finally{setLoading(false);}}
    const rows=state.detailRows.filter((_,i)=>i!==index).map((item,i)=>({...item,lineNo:i+1}));setState((old)=>({...old,detailRows:rows,detailRowsGL:[]}));if(state.documentID)await persistRows(rows);
  };
  const generateGLEntries = async (sourceRows = state.detailRows) => {
    if (!sourceRows.length || (state.tranType === "O" && !sourceRows.some((row) => parseFormattedNumber(row.allocatedQty) > 0))) return [];
    const response = await apiClient.post("/generateProjectMaterialBackloadEntries", { json_data: { blDate: state.documentDate, tranType: state.tranType, custCode: state.custCode, custName: state.custName, rcCode: state.rcCode, dt1: sourceRows.map((row, index) => ({ ...row, lineNo: index + 1, amount: calculateRowAmount(row) })) } });
    const rows = response?.data?.data || [];
    if (rows[0]?.errorCount) throw new Error(rows[0].errorMsg || "Unable to generate General Ledger entries.");
    const normalized = rows.map((row, index) => ({ ...row, recNo: index + 1 }));
    update({ detailRowsGL: normalized });
    return normalized;
  };
  const copyDocument = () => setState((old) => ({ ...old, documentID: "", documentNo: "", documentStatus: "", status: "OPEN", documentDate: useGetCurrentDayV2(), detailRows: old.detailRows.map((row, index) => ({ ...row, lineNo: index + 1, groupId: "", ...(old.tranType === "O" ? {allocatedQty:"0.000000",allocationStatus:"F",quantity:"0.000000",unitCost:"0.000000",amount:"0.00"} : {}) })), detailRowsGL: [] }));
  const persistRows = async (sourceRows, showSuccess = false) => {
    setLoading(true);
    try {
      const glRows = await generateGLEntries(sourceRows);
      const payload = { branchCode: state.branchCode, blId: state.documentID, blNo: state.documentNo, blDate: state.documentDate, tranType: state.tranType, projCode: state.projCode, projName: state.projName, custCode: state.custCode, custName: state.custName, phaseCode: state.phaseCode, siteCode: state.siteCode, actCode: state.actCode, rcCode: state.rcCode, referenceNo: state.referenceNo, whCode: state.whCode, locCode: state.locCode, particular: state.remarks, userCode: currentUserRow?.userCode || "", dt1: sourceRows.map((row, i) => ({ ...row, lineNo: i + 1, qtyHand: parseFormattedNumber(row.qtyHand), requestQty: parseFormattedNumber(row.requestQty), allocatedQty: parseFormattedNumber(row.allocatedQty), quantity: parseFormattedNumber(row.quantity), unitCost: parseFormattedNumber(row.unitCost), amount: calculateRowAmount(row), whCode: row.whCode || state.whCode, locCode: row.locCode || state.locCode })), dt2: glRows.map((row, index) => ({ ...row, recNo: index + 1, debit: parseFormattedNumber(row.debit), credit: parseFormattedNumber(row.credit) })) };
      const response = await apiClient.post("/upsertProjectMaterialBackload", { json_data: payload });
      const result = response?.data?.data?.[0] || {};
      if (result.errorCount) throw new Error(result.errorMsg);
      await load(result.docNo || state.documentNo, state.branchCode, state.tranType);
      if (showSuccess) useSwalshowSaveSuccessDialog(reset);
    } catch (error) { await Swal.fire({ icon: "error", title: "Save Error", text: error?.response?.data?.details || error?.response?.data?.message || error.message }); }
    finally { setLoading(false); }
  };
  const save = async () => persistRows(state.detailRows, true);

  const openStockAllocation = async (index) => {
    const row = state.detailRows[index];
    if (!state.documentID || !state.documentNo) return useSwalErrorAlert("Save Required", "Save the Outgoing Backload before allocating stock.");
    if (!row?.groupId || parseFormattedNumber(row.requestQty) <= 0) return;
    setLoading(true);
    try {
      const response = await apiClient.post("/getProjectMaterialBackloadOpenStock", { json_data: { blId:state.documentID,blNo:state.documentNo,branchCode:state.branchCode,whCode:row.whCode || state.whCode,locCode:row.locCode || state.locCode,groupId:row.groupId,lineNo:row.lineNo,invType:row.invType,itemNo:row.itemNo,requestedQty:parseFormattedNumber(row.requestQty) } });
      const result = parseResult(response) || {};
      setPickingStockRows(result.stockRows || []); setExistingAllocations(result.existingAllocations || []); setPickingIndex(index);
    } catch (error) { useSwalErrorAlert("Stock Retrieval Failed", error?.response?.data?.details || error.message); } finally { setLoading(false); }
  };
  const saveAllocation = async (allocation) => {
    if (pickingIndex === null) return;
    const row=state.detailRows[pickingIndex]; setLoading(true);
    try {
      const response=await apiClient.post("/saveProjectMaterialBackloadAllocation",{json_data:{blId:state.documentID,blNo:state.documentNo,blDate:state.documentDate,branchCode:state.branchCode,groupId:row.groupId,lineNo:row.lineNo,invType:row.invType,itemNo:row.itemNo,requestedQty:parseFormattedNumber(row.requestQty),userCode:currentUserRow?.userCode || "",dt1:allocation?.allocations || []}});
      const result=parseResult(response) || {}; const allocated=parseFormattedNumber(result.totalAllocated); const amount=parseFormattedNumber(result.itemAmount);
      const rows=state.detailRows.map((item,index)=>index===pickingIndex?{...item,allocatedQty:formatNumber(allocated,getQtyDecimals(item.invType)),quantity:formatNumber(allocated,getQtyDecimals(item.invType)),allocationStatus:result.allocationStatus || "F",unitCost:formatNumber(allocated?amount/allocated:0,getCostDecimals(item.invType)),amount:formatNumber(amount,2)}:item);
      setPickingIndex(null); await persistRows(rows);
    } catch(error){useSwalErrorAlert("Allocation Failed",error?.response?.data?.details || error.message);} finally{setLoading(false);}
  };
  const buildAutoAllocations=(stockRows,requestedQty)=>{let remaining=parseFormattedNumber(requestedQty);return [...stockRows].sort((a,b)=>Number(a.priorityNo)-Number(b.priorityNo)).reduce((items,row)=>{const available=parseFormattedNumber(row.remainingAvailable);if(row.isBlocked||available<=0||remaining<=0)return items;const pickQty=Math.min(available,remaining);remaining-=pickQty;items.push({...row,pickQty});return items;},[]);};
  const bulkAllocation=async(release=false)=>{
    if(!state.documentID)return useSwalErrorAlert("Save Required","Save the Outgoing Backload before allocating stock.");
    const confirm=await useSwalProceedConfirm(release?"Release All?":"Allocate All?",release?"This will release all Outgoing Backload allocations.":"This will allocate available stock for all Outgoing Backload details.","Yes"); if(!confirm?.isConfirmed)return;
    setLoading(true);try{let rows=[...state.detailRows];for(let i=0;i<rows.length;i+=1){const row=rows[i];const stock=release?[]:((parseResult(await apiClient.post("/getProjectMaterialBackloadOpenStock",{json_data:{blId:state.documentID,blNo:state.documentNo,branchCode:state.branchCode,whCode:row.whCode||state.whCode,locCode:row.locCode||state.locCode,groupId:row.groupId,lineNo:row.lineNo,invType:row.invType,itemNo:row.itemNo,requestedQty:parseFormattedNumber(row.requestQty)}}))||{}).stockRows||[]);const response=await apiClient.post("/saveProjectMaterialBackloadAllocation",{json_data:{blId:state.documentID,blNo:state.documentNo,blDate:state.documentDate,branchCode:state.branchCode,groupId:row.groupId,lineNo:row.lineNo,invType:row.invType,itemNo:row.itemNo,requestedQty:parseFormattedNumber(row.requestQty),userCode:currentUserRow?.userCode||"",dt1:release?[]:buildAutoAllocations(stock,row.requestQty)}});const result=parseResult(response)||{};const allocated=parseFormattedNumber(result.totalAllocated),amount=parseFormattedNumber(result.itemAmount);rows[i]={...row,allocatedQty:formatNumber(allocated,getQtyDecimals(row.invType)),quantity:formatNumber(allocated,getQtyDecimals(row.invType)),allocationStatus:result.allocationStatus||"F",unitCost:formatNumber(allocated?amount/allocated:0,getCostDecimals(row.invType)),amount:formatNumber(amount,2)};}await persistRows(rows);}catch(error){useSwalErrorAlert(release?"Release All Failed":"Allocate All Failed",error?.response?.data?.details||error.message);}finally{setLoading(false);}
  };

  const detailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "invType", label: "Type", width: 80 },
    { key: "allocationStatus", label: "Picking Status", width: 140 },
    { key: "itemNo", label: "Item Code", width: 130 },
    { key: "itemDesc", label: "Item Name", width: 280 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "qtyHand", label: "Qty on Hand", width: 130 },
    { key: "requestQty", label: "Required Quantity", width: 145 },
    { key: "allocatedQty", label: "Allocated Quantity", width: 155 },
    { key: "quantity", label: "Quantity", width: 120 },
    { key: "unitCost", label: "Unit Cost", width: 130 },
    { key: "amount", label: "Amount", width: 150 },
    { key: "lotNo", label: "Lot No.", width: 130 },
    { key: "qsCode", label: "Quality Status", width: 130 },
    { key: "bbDate", label: "BB Date", width: 130 },
    { key: "whCode", label: "Warehouse", width: 130 },
    { key: "locCode", label: "Location", width: 130 },
    { key: "acctCode", label: "Account Code", width: 140 },
  ];
  const {
    getColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    renderHeaderContextMenu,
    renderResizableHeader,
  } = useResizableTableColumns(detailColumnDefs);
  const visibleDetailColumns = getOrderedColumns(detailColumnDefs).filter(
    (column) =>
      (!["allocationStatus","requestQty","allocatedQty"].includes(column.key) || state.tranType === "O") &&
      (column.key !== "quantity" || state.tranType === "I") &&
      (column.key !== "acctCode" || state.tranType === "I"),
  );
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
    const incoming = state.tranType === "I";
    const common = "global-tran-td-ui";
    const style = detailCellStyle(column);
    switch (column.key) {
      case "ln":
        return <td key={column.key} className={`${common} text-center`} style={style}>{index + 1}</td>;
      case "invType":
        return <td key={column.key} className={common} style={style}>{row.itemNo ? row.invType : <select className="global-tran-td-inputclass-ui w-full border-0 bg-transparent text-xs" value={row.invType || ""} disabled={finalized} onChange={(event) => setState((old) => ({ ...old, detailRowsGL: [], detailRows: old.detailRows.map((detail, rowIndex) => rowIndex === index ? { ...blankRow(detail.lineNo, event.target.value), whCode: detail.whCode || old.whCode, locCode: detail.locCode || old.locCode } : detail) }))}><option value="">Select Type</option><option value="FG">FG</option><option value="RM">RM</option><option value="MS">MS</option></select>}</td>;
      case "itemNo":
        return <td key={column.key} className={common} style={style}>{row.itemNo ? row.itemNo : renderLookupCell("", () => { if (row.invType) setItemLookupIndex(index); }, !row.invType)}</td>;
      case "itemDesc":
      case "uomCode":
        return <td key={column.key} className={common} style={style}>{row[column.key]}</td>;
      case "allocationStatus":
        return <td key={column.key} className={`${common} text-center`} style={style}>{{F:"For Allocation",T:"Partially Allocated",P:"Allocated"}[row.allocationStatus] || "For Allocation"}</td>;
      case "qtyHand":
        return <td key={column.key} className={`${common} text-right`} style={style}>{formatNumber(parseFormattedNumber(row.qtyHand), getQtyDecimals(row.invType))}</td>;
      case "quantity":
      case "unitCost": {
        const field = column.key;
        const disabled = finalized || (field === "quantity" ? (!incoming && !row.uniqueKey) : !incoming);
        const decimals = field === "quantity" ? getQtyDecimals(row.invType) : getCostDecimals(row.invType);
        return <td key={column.key} className={common} style={style}><input id={`${field}-${index}`} className="global-tran-td-inputclass-ui w-full border-0 bg-transparent text-right text-xs" value={row[field]} disabled={disabled} onFocus={(event) => handleNumericFocus(event, index, field)} onChange={(event) => changeDetail(index, field, event.target.value.replace(/[^0-9.-]/g, ""))} onBlur={() => commitNumericValue(index, field, decimals)} onKeyDown={(event) => handleNumericEnter(event, index, field, decimals)} /></td>;
      }
      case "requestQty": {
        const decimals=getQtyDecimals(row.invType);
        return <td key={column.key} className={common} style={style}><input id={`requestQty-${index}`} className="global-tran-td-inputclass-ui w-full border-0 bg-transparent text-right text-xs" value={row.requestQty || ""} disabled={finalized || parseFormattedNumber(row.allocatedQty)>0} onFocus={(event)=>handleNumericFocus(event,index,"requestQty")} onChange={(event)=>changeDetail(index,"requestQty",event.target.value.replace(/[^0-9.-]/g,""))} onBlur={()=>commitNumericValue(index,"requestQty",decimals)} onKeyDown={(event)=>handleNumericEnter(event,index,"requestQty",decimals)}/></td>;
      }
      case "allocatedQty":
        return <td key={column.key} className={common} style={style}><div className="relative flex items-center"><input className="global-tran-td-inputclass-ui w-full border-0 bg-transparent pr-8 text-right text-xs" value={formatNumber(row.allocatedQty || 0,getQtyDecimals(row.invType))} readOnly/><button type="button" className="absolute right-1 inline-flex h-6 w-6 items-center justify-center rounded border border-blue-200 bg-blue-50 text-blue-700" disabled={finalized || !state.documentID || parseFormattedNumber(row.requestQty)<=0} onClick={()=>openStockAllocation(index)} title="Open Item Picking / Allocation"><FontAwesomeIcon icon={faClipboardCheck}/></button></div></td>;
      case "amount":
        return <td key={column.key} className={`${common} text-right`} style={style}>{formatNumber(calculateRowAmount(row), 2)}</td>;
      case "lotNo":
        return <td key={column.key} className={common} style={style}>{incoming ? <input id={`lotNo-${index}`} className="global-tran-td-inputclass-ui w-full border-0 bg-transparent text-xs" value={row.lotNo || ""} disabled={finalized} onChange={(event) => changeDetail(index, "lotNo", event.target.value)} onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); const nextInput = document.getElementById(`lotNo-${index + 1}`); nextInput?.focus(); nextInput?.select(); }} /> : row.lotNo}</td>;
      case "qsCode":
        return <td key={column.key} className={common} style={style}>{incoming ? renderLookupCell(row.qsCode, () => { setSelectedDetailIndex(index); setQualityOpen(true); }) : row.qsCode}</td>;
      case "bbDate":
        return <td key={column.key} className={common} style={style}>{incoming ? <input type="date" className="global-tran-td-inputclass-ui w-full border-0 bg-transparent text-center text-xs" value={row.bbDate || ""} disabled={finalized} onChange={(event) => changeDetail(index, "bbDate", event.target.value)} /> : row.bbDate}</td>;
      case "whCode":
        return <td key={column.key} className={common} style={style}>{incoming ? renderLookupCell(row.whCode || state.whCode, () => { setSelectedDetailIndex(index); setWarehouseOpen(true); }) : (row.whCode || state.whCode)}</td>;
      case "locCode":
        return <td key={column.key} className={common} style={style}>{incoming ? renderLookupCell(row.locCode || state.locCode, () => { setSelectedDetailIndex(index); setLocationOpen(true); }, !(row.whCode || state.whCode)) : (row.locCode || state.locCode)}</td>;
      case "acctCode":
        return <td key={column.key} className={common} style={style}>{renderLookupCell(row.acctCode, () => { setSelectedDetailIndex(index); setAccountOpen(true); })}</td>;
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
          <div className="space-y-3 lg:col-span-3">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="branch" label="Branch" value={state.branchName} disabled />
                <FieldRenderer id="blNo" label="Backload No." type="lookup" value={state.documentNo} disabled={finalized} onChange={(v) => update({ documentNo: v })} onBlur={() => state.documentNo && load(state.documentNo, state.branchCode, state.tranType)} onLookup={() => setDocLookupOpen(true)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (state.documentNo) load(state.documentNo,state.branchCode,state.tranType); document.getElementById("documentDate")?.focus(); } }} />
                <div className="relative w-full"><div className={`flex items-stretch global-ref-textbox-ui ${finalized ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"}`}><DateFormatInput id="documentDate" value={state.documentDate} disabled={finalized} className="peer flex-grow border-none bg-transparent px-3 focus:outline-none" updateState={(x) => update({ documentDate: x.documentDate })} /></div><label htmlFor="documentDate" className="global-ref-floating-label">Backload Date</label></div>
                <FieldRenderer id="tranType" label="Transaction Type" type="select" value={state.tranType} disabled={Boolean(state.documentID) || finalized} options={[{ value: "I", label: "Incoming" }, { value: "O", label: "Outgoing" }]} onChange={(v) => update({ tranType: v, detailRows: [], detailRowsGL: [], documentNo: "" })} />
              </div>
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="project" label="Project Code" required type="lookup" value={state.projCode} disabled={finalized} onLookup={() => setProjectOpen(true)} />
                <FieldRenderer id="projectName" label="Project Name" value={state.projName} disabled />
                <FieldRenderer id="custCode" label="Customer Code" value={state.custCode} disabled />
                <FieldRenderer id="custName" label="Customer Name" value={state.custName} disabled />
              </div>
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="warehouse" label="Warehouse" required type="lookup" value={state.whCode ? `${state.whCode}${state.whName ? ` - ${state.whName}` : ""}` : ""} disabled={finalized} readOnly lookupDisabled={finalized} onLookup={() => { setSelectedDetailIndex(null); setWarehouseOpen(true); }} />
                <FieldRenderer id="location" label="Location" type="lookup" value={state.locCode ? `${state.locCode}${state.locName ? ` - ${state.locName}` : ""}` : ""} disabled={finalized || !state.whCode} readOnly lookupDisabled={finalized || !state.whCode} onLookup={() => { setSelectedDetailIndex(null); setLocationOpen(true); }} />
                <FieldRenderer id="referenceNo" label="Reference No." value={state.referenceNo} disabled={finalized} onChange={(v) => update({ referenceNo: v })} />
              </div>
            </div>
          </div>
          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer id="phaseCode" label="Phase Code" value={state.phaseCode} disabled />
            <FieldRenderer id="siteCode" label="Site Code" value={state.siteCode} disabled />
            <FieldRenderer id="activityCode" label="Activity Code" value={state.actCode} disabled />
            <FieldRenderer id="rcCode" label="Responsibility Center Code" value={state.rcCode} disabled />
          </div>
        </div>
        <div className="relative mt-4 px-2 pt-0"><textarea id="remarks" rows={3} value={state.remarks} disabled={finalized} onChange={(e) => update({ remarks: e.target.value })} className="peer global-tran-textbox-remarks-ui w-full pt-2" /><label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label></div>
      </section>

      <section className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui"><div className="flex flex-row"><button type="button" className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">{state.tranType === "I" ? "Incoming Item Details" : "Outgoing Item Details"}</button></div></div>
        <div className="global-tran-table-main-div-ui">
          <div className="global-tran-table-main-sub-div-ui">
            <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui">
                <tr>
                  {visibleDetailColumns.map((column) => (
                    <Fragment key={`backload-header-${column.key}`}>
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
              <button type="button" disabled={finalized || !state.projCode || !state.whCode} className={`global-tran-tab-footer-button-add-ui ${finalized || !state.projCode || !state.whCode ? "cursor-not-allowed opacity-50" : ""}`} onClick={() => setShowAddDropdown((value) => !value)}><FontAwesomeIcon icon={faPlus} className="mr-2"/>Add</button>
            </div>
            {state.tranType === "O" && <><button type="button" className="ml-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700" disabled={loading || finalized || !state.documentID} onClick={()=>bulkAllocation(false)}><FontAwesomeIcon icon={faClipboardCheck} className="mr-2"/>Allocate All</button><button type="button" className="ml-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" disabled={loading || finalized || !state.detailRows.some((row)=>parseFormattedNumber(row.allocatedQty)>0)} onClick={()=>bulkAllocation(true)}><FontAwesomeIcon icon={faMinus} className="mr-2"/>Release All</button></>}
          </div>
          <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-1">{state.tranType === "O" && <><div className="global-tran-tab-footer-total-label-ui">Total Required Quantity:</div><div className="global-tran-tab-footer-total-value-ui">{formatNumber(state.detailRows.reduce((sum,row)=>sum+parseFormattedNumber(row.requestQty),0),6)}</div><div className="global-tran-tab-footer-total-label-ui">Total Allocated Quantity:</div><div className="global-tran-tab-footer-total-value-ui">{formatNumber(state.detailRows.reduce((sum,row)=>sum+parseFormattedNumber(row.allocatedQty),0),6)}</div></>}<div className="global-tran-tab-footer-total-label-ui">Total Amount:</div><div className="global-tran-tab-footer-total-value-ui">{formatNumber(total,2)}</div></div>
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
    <div className={topTab === "history" ? "" : "hidden"}><AllTranHistory showHeader={false} isActive={topTab === "history"} endpoint="/getProjectMaterialBackloadHistory" cacheKey={`PRJ_BL:${state.branchCode}:${state.startDate}:${state.endDate}`} activeTabKey="PRJ_BL_Summary" branchCode={state.branchCode} startDate={state.startDate} endDate={state.endDate} status="All" historyExportName="Project Material Backload History" onRowDoubleClick={(row) => { load(row.docNo,row.branchCode,row.tranType === "Incoming" ? "I" : row.tranType === "Outgoing" ? "O" : row.tranType); setTopTab("details"); }} /></div>
    {docLookupOpen && <AllTranDocNo isOpen params={{ branchCode:state.branchCode,branchName:state.branchName,docType:DOC_TYPE,documentTitle:hsDoc?.docName || "Project Material Backload",fieldNo:"blNo",tranType:state.tranType }} docNo={state.documentNo} onRetrieve={async ({docNo,modalClose}) => { await load(docNo,state.branchCode,state.tranType); setDocLookupOpen(Boolean(modalClose)); }} onSelected={({docNo}) => { update({documentNo:docNo}); setDocLookupOpen(false); }} onResponse={{documentNo:state.documentNo}} onClose={() => setDocLookupOpen(false)} />}
    <SearchProjectRef isOpen={projectOpen} onClose={(project) => { setProjectOpen(false); if (project) update({ projCode: project.projectCode || "", projName: project.projectName || "", custCode: project.customerCode || "", custName: project.customerName || "", phaseCode: project.phaseCode || "", siteCode: project.siteCode || "", actCode: project.activityCode || "", rcCode: project.rcCode || "", detailRows: [], detailRowsGL: [] }); }} />
    {warehouseOpen && <WarehouseLookupModal isOpen onClose={async (row) => { setWarehouseOpen(false); if (!row) { setSelectedDetailIndex(null); return; } const whCode=row.whouseCode || row.whCode || ""; const whName=row.whouseName || row.whName || ""; if (selectedDetailIndex === null) await confirmApplyHeaderValue("whCode",whCode,"Warehouse",{ whCode,whName,locCode:"",locName:"" },{ locCode:"" }); else await confirmApplyDetailValue(selectedDetailIndex,"whCode",whCode,"Warehouse",{ locCode:"" }); setSelectedDetailIndex(null); }} filter={`ByBC${state.branchCode}`} branchCode={state.branchCode} invType={selectedDetailIndex === null ? undefined : state.detailRows[selectedDetailIndex]?.invType} />}
    {locationOpen && <LocationLookupModal isOpen onClose={async (row) => { setLocationOpen(false); if (!row) { setSelectedDetailIndex(null); return; } const locCode=row.locCode || ""; const locName=row.locName || ""; if (selectedDetailIndex === null) await confirmApplyHeaderValue("locCode",locCode,"Location",{ locCode,locName }); else await confirmApplyDetailValue(selectedDetailIndex,"locCode",locCode,"Location"); setSelectedDetailIndex(null); }} whCode={selectedDetailIndex === null ? state.whCode : (state.detailRows[selectedDetailIndex]?.whCode || state.whCode)} />}
    {qualityOpen && <QstatLookupModal isOpen onClose={async (row) => { setQualityOpen(false); if (row && selectedDetailIndex !== null) await confirmApplyDetailValue(selectedDetailIndex,"qsCode",row.qstatCode || row.qsCode || "","Quality Status"); setSelectedDetailIndex(null); }} filter="ActiveAll" />}
    {accountOpen && <COAMastLookupModal isOpen onClose={async (row) => { setAccountOpen(false); if (row && selectedDetailIndex !== null) await confirmApplyDetailValue(selectedDetailIndex,"acctCode",row.acctCode || row.accountCode || "","Account Code"); setSelectedDetailIndex(null); }} source="acctCode" />}
    {itemLookupIndex !== null && <ItemMastLookupModal isOpen endpoint={`/getInvLookup${state.detailRows[itemLookupIndex]?.invType || "FG"}`} docType="PRJ_BL" customParam="ActiveAll" enableMultiSelect={false} onClose={(payload) => { const rowIndex=itemLookupIndex; setItemLookupIndex(null); const item=payload?.records?.[0]; if (!item || rowIndex === null) return; setState((old) => ({ ...old, detailRowsGL: [], detailRows:old.detailRows.map((row,index) => index===rowIndex ? { ...row,itemNo:item.itemCode || "",itemDesc:item.itemName || item.itemDesc || "",uomCode:item.uomCode || "",qtyHand:formatNumber(item.qtyHand || 0,6),unitCost:formatNumber(item.unitCost || 0,6),quantity:"0.000000",amount:"0.00",whCode:row.whCode || old.whCode,locCode:row.locCode || old.locCode } : row) })); }} onCancel={() => setItemLookupIndex(null)} />}
    {itemLookup && <ItemMastLookupModal isOpen endpoint={`/getInvLookup${itemLookup}`} docType="PRJ_BL" customParam="ActiveAll" enableMultiSelect onClose={(payload) => { const invType=itemLookup; setItemLookup(null); const selected=payload?.records || []; setState((old) => ({ ...old, detailRowsGL: [], detailRows: [...old.detailRows, ...selected.filter((item) => !old.detailRows.some((r) => r.invType===invType && r.itemNo===item.itemCode)).map((item,i) => ({ ...blankRow(old.detailRows.length+i+1,invType), itemNo:item.itemCode || "", itemDesc:item.itemName || item.itemDesc || "", uomCode:item.uomCode || "", qtyHand:formatNumber(item.qtyHand || 0,6), unitCost:formatNumber(item.unitCost || 0,6), whCode:old.whCode, locCode:old.locCode }))] })); }} onCancel={() => setItemLookup(null)} />}
    {pickingIndex !== null && <SearchGlobalItemPickingModal isOpen transaction={{sourceDocType:DOC_TYPE,sourceDocTypeName:"Project Material Backload",sourceDocNo:state.documentNo,sourceLineNo:state.detailRows[pickingIndex]?.lineNo,groupId:state.detailRows[pickingIndex]?.groupId,customerCode:state.custCode,customerName:state.custName,itemCode:state.detailRows[pickingIndex]?.itemNo,itemName:state.detailRows[pickingIndex]?.itemDesc,requestedQty:parseFormattedNumber(state.detailRows[pickingIndex]?.requestQty)}} stockRows={pickingStockRows} existingAllocations={existingAllocations} onClose={()=>setPickingIndex(null)} onConfirm={saveAllocation}/>} 
  </div>;
};

export default ProjectMaterialBackload;
