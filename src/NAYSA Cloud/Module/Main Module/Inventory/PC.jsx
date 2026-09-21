import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faDownload, faFolderOpen, faMagnifyingGlass, faPlus, faTrashAlt, faUpload } from "@fortawesome/free-solid-svg-icons";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import QstatLookupModal from "../../../Lookup/SearchQStatRef.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";

import { apiClient, postRequest, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { docTypes, docTypeVideoGuide, docTypePDFGuide } from "@/NAYSA Cloud/Global/doctype";
import {
  useTransactionUpsert, useFetchTranData, useHandleCancel, useFieldLenghtCheck, useGetFieldLength,
  useGenerateGLEntries, useUpdateRowGLEntries, useUpdateRowEditEntries
} from "@/NAYSA Cloud/Global/procedure";
import { useTopRCRow } from "@/NAYSA Cloud/Global/top1RefTable";
import { useGetCurrentDay } from "@/NAYSA Cloud/Global/dates";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import {
  extractSingleUploadValidationResult,
  getSingleUploadTemplateColumns as getGlobalSingleUploadTemplateColumns,
  handleDownloadSingleUploadTemplate as downloadGlobalSingleUploadTemplate,
  handleSingleUploadExcelFile,
  showSingleUploadErrorList,
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";
import {
  formatNumber, parseFormattedNumber, useSwalshowSaveSuccessDialog,
  useSwalErrorAlert, useSwalInfoAlert, useSwalProceedConfirm,
  useSwalvalidateRequiredFields,useSwalSuccessAlert
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";
import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

const toDateInputValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${month}/${day}/${year}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [month, day, year] = raw.split("/");
    return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${month}/${day}/${year}`;
  }
  return "";
};

const toNativeDateInputValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, mm, dd, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
};

const INV = {
  FG: { name: "Finished Goods", decQtyKey: "itemDecqtyFG", decCostKey: "itemDecUcostFG",costing :"fginvCosting" },
  RM: { name: "Raw Materials", decQtyKey: "itemDecqtyRM", decCostKey: "itemDecUcostRM" ,costing :"rminvCosting" },
  MS: { name: "Material Supplies", decQtyKey: "itemDecqtyMS", decCostKey: "itemDecUcostMS",costing :"msinvCosting" },
};

const getInventoryLookupEndpoint = (type) => {
  const normalizedType = String(type || "FG").toUpperCase();
  return {
    FG: "getInvLookupFG",
    RM: "getInvLookupRM",
    MS: "getInvLookupMS",
  }[normalizedType] || "getInvLookupFG";
};

const getInvType = (location) => {
  const q = new URLSearchParams(location.search).get("invType")?.toUpperCase();
  if (INV[q]) return q;
  const p = location.pathname.toUpperCase();
  if (p.includes("RMPC")) return "RM";
  if (p.includes("MSPC")) return "MS";
  return "FG";
};

const getInventoryBalanceEndpoint = (invTypeCode, inventorySetup = "FIFO") => {
  const normalizedType = String(invTypeCode || "FG").toUpperCase();
  const base = normalizedType === "FG" ? "/fg" : normalizedType === "RM" ? "/rm" : "/ms";
  const setup = String(inventorySetup || "FIFO").toUpperCase();
  return setup === "FIFO"
    ? `${base}/inventory/stock-card/fifo-balance`
    : `${base}/inventory/stock-card/location-balance`;
};

const PC = () => {
  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const uploadInputRef = useRef(null);
  const addMenuRef = useRef(null);
  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const { resetFlag } = useReset();
  const { companyInfo, currentUserRow, getAllTopHSDocRow } = useAuth();

  const invType = useMemo(() => getInvType(location), [location.pathname, location.search]);
  const inv = INV[invType];
  const inventoryLookupEndpoint = getInventoryLookupEndpoint(invType);
  const docType = { FG: "FGPC", RM: "RMPC", MS: "MSPC" }[invType] || "PC";
  const getLookupTranType = (mode = "load-balance") => (mode === "add-item" ? "IG" : "IL");
  const historyEndpoint = "/getPCHistory";
  const hsDoc = getAllTopHSDocRow?.(docType);
  const decQty = companyInfo?.[inv.decQtyKey] ?? 2;
  const decUcost = companyInfo?.[inv.decCostKey] ?? 6;
  const costingMethod = companyInfo?.[inv.costing] ?? "FIFO";
  const isWacCosting = String(costingMethod || "FIFO").trim().toUpperCase() === "WAC";
  const documentTitle = `${invType} Physical Count`;
  const glCurrMode = companyInfo?.glCurrMode || "";
  const glCurrDefault = companyInfo?.currCode || "PHP";
  const glCurrGlobal2 = companyInfo?.glCurrGlobal2 || "";
  const glCurrGlobal3 = companyInfo?.glCurrGlobal3 || "";
  const currCode = companyInfo?.currCode || glCurrDefault;
  const currRate = formatNumber(companyInfo?.currRate || 1, 6);
  const withCurr2 = String(glCurrMode || "").toUpperCase() === "T" && Boolean(glCurrGlobal2);
  const withCurr3 = String(glCurrMode || "").toUpperCase() === "T" && Boolean(glCurrGlobal3);
  
  const [topTab, setTopTab] = useState("details");
  const [itemFilterLookupOpen, setItemFilterLookupOpen] = useState(false);
  const [warehouseFilterLookupOpen, setWarehouseFilterLookupOpen] = useState(false);
  const [selectedFilterItems, setSelectedFilterItems] = useState([]);
  const [selectedFilterWarehouses, setSelectedFilterWarehouses] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [itemInsertIndex, setItemInsertIndex] = useState(null);
  const [isViewDocument, setIsViewDocument] = useState(false);
  const [state, setState] = useState({
    documentID: null, documentNo: "", documentDate: toDateInputValue(useGetCurrentDay()), status: "OPEN", noReprints: "0",
    branchCode: currentUserRow?.branchCode || "", branchName: currentUserRow?.branchName || "",
    userCode: currentUserRow?.userCode || "", whCode: "", whName: "", locCode: "", locName: "",
    refNo: "", countRef: "V", particular: "", detailRows: [], detailRowsGL: [], tblFieldArray: [],
    isLoading: false, branchModalOpen: false, warehouseLookupOpen: false, locationLookupOpen: false,
    itemLookupOpen: false, showQstatModal: false, showCancelModal: false, showAttachModal: false,
    showAllTranDocNo: false, selectedRowIndex: null, selectedWH: "",
    showAccountModal: false, showRcModal: false, showSlModal: false, accountModalSource: null,
    totalDebit: "0.00", totalCredit: "0.00", totalDebitFx1: "0.00", totalCreditFx1: "0.00",
    totalDebitFx2: "0.00", totalCreditFx2: "0.00",
  });
  const updateState = (x) => setState((p) => ({ ...p, ...x }));
  const {
    documentID, documentNo, documentDate, status, noReprints, branchCode, branchName, userCode,
    whCode, whName, locCode, locName, refNo, countRef, particular, detailRows, detailRowsGL,
    isLoading, branchModalOpen, warehouseLookupOpen, locationLookupOpen, itemLookupOpen,
    showQstatModal, showCancelModal, showAttachModal, showAllTranDocNo, selectedRowIndex, selectedWH,
    showAccountModal, showRcModal, showSlModal, accountModalSource,
    totalDebit, totalCredit, totalDebitFx1, totalCreditFx1, totalDebitFx2, totalCreditFx2
  } = state;

  useEffect(() => { detailRowsRef.current = detailRows; }, [detailRows]);
  useEffect(() => { detailRowsGLRef.current = detailRowsGL; }, [detailRowsGL]);
  useEffect(() => { if (new URLSearchParams(location.search).get("viewDocument") === "true") setIsViewDocument(true); }, [location.search]);
  useEffect(() => {
    const closeAddMenu = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) setShowAddMenu(false);
    };
    document.addEventListener("mousedown", closeAddMenu);
    return () => document.removeEventListener("mousedown", closeAddMenu);
  }, []);

  const handleCloseWarehouseLookup = (row) => {
    if (row) {
      if (selectedRowIndex !== null) {
        const rows = [...detailRowsRef.current];
        rows[selectedRowIndex] = {
          ...rows[selectedRowIndex],
          whouseCode: row.whCode || row.code,
          locCode: "",
        };
        detailRowsRef.current = rows;
        updateState({ detailRows: rows });
      } else {
        updateState({
          whCode: row.whCode || row.code,
          whName: row.whName || row.name,
          locCode: "",
          locName: "",
        });
      }
    }

    updateState({ warehouseLookupOpen: false, selectedRowIndex: null, selectedWH: "" });
  };

  const handleCloseLocationLookup = (row) => {
    if (row) {
      if (selectedRowIndex !== null) {
        const rows = [...detailRowsRef.current];
        rows[selectedRowIndex] = {
          ...rows[selectedRowIndex],
          locCode: row.locCode || row.code,
        };
        detailRowsRef.current = rows;
        updateState({ detailRows: rows });
      } else {
        updateState({
          locCode: row.locCode || row.code,
          locName: row.locName || row.name,
        });
      }
    }

    updateState({ locationLookupOpen: false, selectedRowIndex: null, selectedWH: "" });
  };

  const displayStatus = String(status || "OPEN").trim().toUpperCase();
  const statusMap = { OPEN:"global-tran-stat-text-open-ui", FINALIZED:"global-tran-stat-text-finalized-ui",
    POSTED:"global-tran-stat-text-finalized-ui", CANCELLED:"global-tran-stat-text-closed-ui", CLOSED:"global-tran-stat-text-finalized-ui" };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = isViewDocument || ["FINALIZED","POSTED","CANCELLED","CLOSED"].includes(displayStatus);
  const isExisting = Boolean(documentID);

  const itemFilterDisplay = useMemo(() => {
    if (!selectedFilterItems.length) return "All Items";
    if (selectedFilterItems.length > 1) return "Various Items";
    const item = selectedFilterItems[0] || {};
    const code = item.itemCode || item.itemNo || "";
    const name = item.itemName || item.itemDesc || "";
    return [code, name].filter(Boolean).join(" - ") || "Selected Item";
  }, [selectedFilterItems]);

  const warehouseFilterDisplay = useMemo(() => {
    if (!selectedFilterWarehouses.length) return "All Warehouses";
    if (selectedFilterWarehouses.length > 1) return "Various Warehouses";
    const row = selectedFilterWarehouses[0] || {};
    const code = row.whCode || row.code || "";
    const name = row.whName || row.name || "";
    return [code, name].filter(Boolean).join(" - ") || "Selected Warehouse";
  }, [selectedFilterWarehouses]);

  const noViewCostamt = currentUserRow?.viewCostamt === "N";

  const pcDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "element", label: "Element", width: 100 },
    { key: "itemCode", label: "Item Code", width: 120 },
    { key: "itemName", label: "Item Name", width: 260 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "unitCost", label: "Unit Cost", width: 130 },
    { key: "lotNo", label: "Lot No", width: 130 },
    { key: "bbDate", label: "BB Date", width: 130 },
    { key: "qstatCode", label: "Quality Status", width: 130 },
    { key: "whouseCode", label: "Warehouse", width: 120 },
    { key: "locCode", label: "Location", width: 120 },
    { key: "qtyHand", label: "Qty On Hand", width: 130 },
    { key: "actualQty", label: "Actual Qty", width: 130 },
    { key: "varQty", label: "Variance Qty", width: 130 },
    { key: "fifoDocNo", label: "FIFO Doc No", width: 150 },
  ];

  const {
    getColumnStyle: getPcDetailColumnStyle,
    getFrozenColumnStyle: getPcDetailFrozenStyle,
    getOrderedColumns: getOrderedPcDetailColumns,
    getSortedRows: getSortedPcDetailRows,
    clearZeroValueOnFocus: clearPcDetailZeroOnFocus,
    focusNextRowInput: focusNextPcDetailRowInput,
    renderHeaderContextMenu: renderPcDetailHeaderContextMenu,
    renderResizableHeader: renderPcDetailHeader,
  } = useResizableTableColumns(pcDetailColumnDefs);

  const visiblePcDetailColumns = getOrderedPcDetailColumns(pcDetailColumnDefs).filter(
    (column) => {
      if (column.key === "unitCost" && noViewCostamt) return false;
      if (column.key === "fifoDocNo" && isWacCosting) return false;
      return column.key !== "actualQty" || countRef === "A";
    },
  );
  const sortedPcDetailRows = getSortedPcDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );
  const getPcDetailCellStyle = (key, fallbackWidth) => ({
    ...getPcDetailColumnStyle(key, fallbackWidth),
    ...getPcDetailFrozenStyle(key, visiblePcDetailColumns, fallbackWidth, { isHeader: false }),
  });

  const pcGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "debit", label: `Debit (${glCurrDefault})`, width: 140 },
    { key: "credit", label: `Credit (${glCurrDefault})`, width: 140 },
    ...(withCurr2 ? [
      { key: "debitFx1", label: `Debit (${glCurrGlobal2})`, width: 140 },
      { key: "creditFx1", label: `Credit (${glCurrGlobal2})`, width: 140 },
    ] : []),
    ...(withCurr3 ? [
      { key: "debitFx2", label: `Debit (${glCurrGlobal3})`, width: 140 },
      { key: "creditFx2", label: `Credit (${glCurrGlobal3})`, width: 140 },
    ] : []),
    { key: "slRefNo", label: "SL Ref. No.", width: 120 },
    { key: "slRefDate", label: "SL Ref. Date", width: 130 },
    { key: "remarks", label: "Remarks", width: 160 },
  ];

  const {
    getColumnStyle: getPcGlColumnStyle,
    getFrozenColumnStyle: getPcGlFrozenStyle,
    getOrderedColumns: getOrderedPcGlColumns,
    getSortedRows: getSortedPcGlRows,
    setColumnOrder: setPcGlColumnOrder,
    clearZeroValueOnFocus: clearPcGlZeroOnFocus,
    focusNextRowInput: focusNextPcGlRowInput,
    renderHeaderContextMenu: renderPcGlHeaderContextMenu,
    renderResizableHeader: renderPcGlHeader,
  } = useResizableTableColumns(pcGlColumnDefs);

  const orderedPcGlColumns = getOrderedPcGlColumns(pcGlColumnDefs);
  const getPcGlFallbackWidth = (key) => pcGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getPcGlCellStyle = (key, fallbackWidth) => ({
    ...getPcGlColumnStyle(key, fallbackWidth),
    ...getPcGlFrozenStyle(key, orderedPcGlColumns, fallbackWidth, { isHeader: false }),
  });

  useEffect(() => {
    setPcGlColumnOrder(pcGlColumnDefs.map((column) => column.key));
  }, [setPcGlColumnOrder, withCurr2, withCurr3, glCurrDefault, glCurrGlobal2, glCurrGlobal3]);

  const sortedPcGlRows = getSortedPcGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  const pcGlEnterNextRowZeroClearFields = ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"];

  const getGLTotalsState = (rows) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const debitSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    const debitFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
    const creditFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
    const debitFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0), 0);
    const creditFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0), 0);

    return {
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
      totalDebitFx1: formatNumber(debitFx1Sum),
      totalCreditFx1: formatNumber(creditFx1Sum),
      totalDebitFx2: formatNumber(debitFx2Sum),
      totalCreditFx2: formatNumber(creditFx2Sum),
    };
  };

  useEffect(() => {
    updateState(getGLTotalsState(detailRowsGL));
  }, [detailRowsGL]);

  const emptyRow = () => ({
    lnNo: detailRowsRef.current.length + 1, itemCode:"", itemName:"", categCode:"", uomCode:"", element:"N",
    invType, qstatCode:"", lotNo:"", colorCode:"", orderStamp:"", fifoDocNo:"",
    unitCost:formatNumber(0,decUcost), qtyHand:formatNumber(0,decQty),
    varQty:formatNumber(0,decQty), actualQty:formatNumber(0,decQty),
    whouseCode:whCode, locCode, bbDate:""
  });

  const reset = useCallback(() => {
    detailRowsRef.current = [];
    setShowAddMenu(false);
    setSelectedFilterItems([]);
    setSelectedFilterWarehouses([]);
    setItemFilterLookupOpen(false);
    setWarehouseFilterLookupOpen(false);
    updateState({
      documentID:null, documentNo:"", documentDate:toDateInputValue(useGetCurrentDay()), status:"OPEN", noReprints:"0",
      branchCode:currentUserRow?.branchCode||"", branchName:currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"", whCode:"", whName:"", locCode:"", locName:"",
      refNo:"", countRef:"V", particular:"", detailRows:[], detailRowsGL:[],
      selectedRowIndex:null, selectedWH:""
    });
  }, [currentUserRow, invType]);

  useEffect(() => { reset(); }, [invType]);
  useEffect(() => { if (resetFlag) reset(); }, [resetFlag, reset]);

  useEffect(() => {
    useFieldLenghtCheck("pc_hd,pc_dt1,pc_dt2").then((x)=>x&&updateState({tblFieldArray:x})).catch(()=>{});
  }, []);

  const normalizeRow = (r,i) => ({
    lnNo:r.lnNo??r.lineNo??i+1, itemCode:r.itemCode??r.itemNo??"", itemName:r.itemName??r.itemDesc??"",
    categCode:r.categCode??r.categoryCode??"", uomCode:r.uomCode??"", element:(r.element || r.Element || "E").toUpperCase(), invType:r.invType??invType, qstatCode:r.qstatCode??r.qsCode??"",
    lotNo:r.lotNo??"", colorCode:r.colorCode??"", orderStamp:r.orderStamp??"", rrNo:r.rrNo??"",
    fifoDocNo:r.fifoDocNo??r.fifoDocno??r.rrNo??"", groupId:r.groupId??"",
    unitCost:formatNumber(parseFormattedNumber(r.unitCost??0)||0,decUcost),
    qtyHand:formatNumber(parseFormattedNumber(r.qtyHand??0)||0,decQty),
    varQty:formatNumber(parseFormattedNumber(r.varQty??0)||0,decQty),
    actualQty:formatNumber(parseFormattedNumber(r.actualQty??0)||0,decQty),
    whouseCode:r.whouseCode??r.whCode??"", locCode:r.locCode??"", bbDate:r.bbDate??""
  });

  const fetchTranData = useCallback(async (pcNo, bc, direction="") => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: null,
        isLoading: false,
      });
    };

    if (!pcNo && !direction) return;
    updateState({ isLoading: true });

    try {
      const response = await postRequest("/getPC", { json_data:{ pcNo, branchCode:bc, invType, docType, direction }});
      const raw = response?.data?.[0]?.result ?? response?.data?.result ?? response?.result;
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      const h = Array.isArray(data) ? data[0] : data;

      if (!h) {
        Swal.fire({ icon: "info", title: "No Records Found", text: "Transaction does not exist." });
        return resetState();
      }

      const rows = (h.dt1 || []).map(normalizeRow);
      detailRowsRef.current = rows;

      updateState({
        documentID:h.pcId||null,
        documentNo:h.pcNo||pcNo,
        documentDate:toDateInputValue(h.pcDate || documentDate),
        status:h.docStatus||h.pcStatus||h.status||h.stat||"OPEN",
        noReprints:h.noReprints||"0",
        branchCode:h.branchCode||bc,
        branchName:h.branchName||"",
        whCode:h.whCode||"",
        whName:h.whName||"",
        locCode:h.locCode||"",
        locName:h.locName||"",
        refNo:h.refNo||"",
        countRef:h.countRef||"V",
        particular:h.particular||"",
        detailRows:rows,
        detailRowsGL:(h.dt2||[]).map((r)=>({ ...r, debit:formatNumber(r.debit||0), credit:formatNumber(r.credit||0), debitFx1:formatNumber(r.debitFx1||0), creditFx1:formatNumber(r.creditFx1||0), debitFx2:formatNumber(r.debitFx2||0), creditFx2:formatNumber(r.creditFx2||0) })),
      });

    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({ icon: "error", title: "Fetch Error", text: error.message || "Unable to retrieve transaction." });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  }, [invType, docType, decQty, decUcost, documentDate]);

  const fetchPC = fetchTranData;

  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", window.location.origin);
  }, []);

  const handleHistoryRowPick = useCallback(async (row) => {
    const docNo = row?.pcNo || row?.docNo;
    const selectedBranchCode = row?.branchCode;
    if (!docNo || !selectedBranchCode) return;

    await fetchPC(docNo, selectedBranchCode);
    setTopTab("details");
    cleanUrl();
  }, [fetchPC, cleanUrl]);

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };


  const handleTranDocNoSelection = async (data) => {
    reset();
    updateState({ showAllTranDocNo: false, documentNo: data.docNo });
  };

  useEffect(() => {
    const p=new URLSearchParams(location.search), pcNo=p.get("pcNo"), bc=p.get("branchCode");
    if(!loadedFromUrlRef.current && pcNo && bc){ loadedFromUrlRef.current=true; handleHistoryRowPick({ pcNo, branchCode: bc }); }
  },[location.search, handleHistoryRowPick]);

  const invalidNegative = (rows) => countRef==="V" ? rows.filter(r => {
    const v=parseFormattedNumber(r.varQty)||0, q=parseFormattedNumber(r.qtyHand)||0;
    return v<0 && Math.abs(v)>q;
  }) : [];

  const validate = async (forPosting=false) => {
    if (!(await useSwalvalidateRequiredFields({
      Branch:branchCode, "Physical Count Date":documentDate, "Count Reference":countRef
    },"Physical Count"))) return false;
    if (!detailRows.length) { useSwalInfoAlert("Physical Count","No Physical Count Details."); return false; }
    const neg=invalidNegative(detailRows);
    if(neg.length){ useSwalErrorAlert("Physical Count",`Insufficient Quantity on Hand: Line(s) ${neg.map(x=>x.lnNo).join(", ")}`); return false; }
    if(forPosting){
      const missing=detailRows.filter(r=>!r.whouseCode||!r.locCode);
      if(missing.length){ useSwalErrorAlert("Physical Count",`Warehouse/Location required: Line(s) ${missing.map(x=>x.lnNo).join(", ")}`); return false; }
    }
    return true;
  };

  const payload = (action="S") => ({
    pcId:documentID || "", pcNo:documentNo || "", pcDate:documentDate, branchCode, invType, docType, action,
    refNo, whCode, locCode, countRef, particular, userCode,
    dt1:detailRows.map((r,i)=>({...r,lnNo:i+1,
      unitCost:parseFormattedNumber(r.unitCost)||0, qtyHand:parseFormattedNumber(r.qtyHand)||0,
      varQty:parseFormattedNumber(r.varQty)||0, actualQty:parseFormattedNumber(r.actualQty)||0})),
    dt2: detailRowsGL.map((r,i)=>({
      recNo:String(i+1), acctCode:r.acctCode||"", rcCode:r.rcCode||"",
      sltypeCode:r.sltypeCode||"", slCode:r.slCode||"", particular:r.particular||"",
      vatCode:r.vatCode||"", atcCode:r.atcCode||"",
      debit:parseFormattedNumber(r.debit||0), credit:parseFormattedNumber(r.credit||0),
      debitFx1:parseFormattedNumber(r.debitFx1||0), creditFx1:parseFormattedNumber(r.creditFx1||0),
      debitFx2:parseFormattedNumber(r.debitFx2||0), creditFx2:parseFormattedNumber(r.creditFx2||0),
      slRefNo:r.slRefNo||"", slRefDate:r.slRefDate||null, remarks:r.remarks||""
    }))
  });

  const buildPcData = (glRows = detailRowsGL) => ({
    pcId: documentID || "",
    pcNo: documentNo || "",
    pcDate: documentDate,
    branchCode,
    invType,
    docType,
    refNo,
    whCode,
    locCode,
    countRef,
    particular,
    userCode,
    currCode,
    currRate: parseFormattedNumber(currRate || 1),
    dt1: detailRows.map((row, index) => ({
      ...row,
      lnNo: index + 1,
      categCode: row.categCode || "",
      unitCost: parseFormattedNumber(row.unitCost || 0),
      qtyHand: parseFormattedNumber(row.qtyHand || 0),
      varQty: parseFormattedNumber(row.varQty || 0),
      actualQty: parseFormattedNumber(row.actualQty || 0),
    })),
    dt2: (glRows || []).map((row, index) => ({
      recNo: String(index + 1),
      acctCode: row.acctCode || "",
      rcCode: row.rcCode || "",
      sltypeCode: row.sltypeCode || "",
      slCode: row.slCode || "",
      particular: row.particular || "",
      vatCode: row.vatCode || "",
      atcCode: row.atcCode || "",
      debit: parseFormattedNumber(row.debit || 0),
      credit: parseFormattedNumber(row.credit || 0),
      debitFx1: parseFormattedNumber(row.debitFx1 || 0),
      creditFx1: parseFormattedNumber(row.creditFx1 || 0),
      debitFx2: parseFormattedNumber(row.debitFx2 || 0),
      creditFx2: parseFormattedNumber(row.creditFx2 || 0),
      slRefNo: row.slRefNo || "",
      slRefDate: row.slRefDate || null,
      remarks: row.remarks || "",
    })),
  });

  const handleActivityOption = async (action) => {
    if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) return;

    updateState({ isLoading: true });

    try {
      let finalDetailRowsGL = [...detailRowsGL];

      if (action === "GenerateGL") {
        const newGlEntries = await useGenerateGLEntries("PC", buildPcData([]));
        const nextRows = Array.isArray(newGlEntries) ? newGlEntries : [];
        detailRowsGLRef.current = nextRows;
        updateState({ detailRowsGL: nextRows, ...getGLTotalsState(nextRows) });
        return;
      }

      const hasVariance = detailRows.some((row) => {
        const variance = countRef === "A"
          ? (parseFormattedNumber(row.actualQty || 0) || 0) - (parseFormattedNumber(row.qtyHand || 0) || 0)
          : (parseFormattedNumber(row.varQty || 0) || 0);
        return Math.abs(variance) > 0;
      });

      if (action === "S" && hasVariance && finalDetailRowsGL.length === 0) {
        const newGlEntries = await useGenerateGLEntries("PC", buildPcData([]));
        if (!newGlEntries || newGlEntries.length === 0) return;
        finalDetailRowsGL = newGlEntries;
        detailRowsGLRef.current = newGlEntries;
        updateState({ detailRowsGL: newGlEntries, ...getGLTotalsState(newGlEntries) });
      }

      const pcData = buildPcData(finalDetailRowsGL);
      const response = await useTransactionUpsert("PC", pcData, updateState, "pcId", "pcNo");

      if (response) {
        const responseDocNo = response.data[0].pcNo;
        const responseDocId = response.data[0].pcId;

        await fetchTranData(responseDocNo, branchCode);

        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint = isZero
          ? () => updateState({ showSignatoryModal: true })
          : () => handleSaveAndPrint(responseDocId);

        useSwalshowSaveSuccessDialog(reset, onSaveAndPrint);

        updateState({
          documentNo: responseDocNo,
          documentID: responseDocId,
        });
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      useSwalErrorAlert("Physical Count", error?.message || "Transaction failed.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleSave = async () => {
    if (!(await validate(false))) return;
    await handleActivityOption("S");
  };

  const handlePost = async () => {
    if (!isExisting) {
      useSwalInfoAlert("Physical Count", "Save the transaction before posting.");
      return;
    }
    if (!(await validate(true))) return;
    if (!(await useSwalProceedConfirm("Post Physical Count", "Proceed posting this transaction?"))) return;
    updateState({ isLoading: true });
    try {
      await postRequest("/finalizePC", { json_data: payload("P") });
      await fetchPC(documentNo, branchCode);
      Swal.fire({ icon: "success", title: "Posted", text: `Physical Count ${documentNo} posted successfully.` });
    } catch (e) {
      useSwalErrorAlert("Physical Count", e?.message || "Posting failed.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCancel = async () => {
    if (!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "POSTED" || displayStatus === "CLOSED") return;
    updateState({ showCancelModal: true });
  };

  const handleCloseCancel = async (confirmation) => {
  if (!confirmation || !documentID) {
    updateState({ showCancelModal: false });
    return;
  }

  const result = await useHandleCancel(
    "PC",
    documentID,
    userCode,
    confirmation.password,
    confirmation.reason,
    updateState
  );

  if (result?.success) {
    useSwalSuccessAlert("Success", "Cancellation Completed");
  }

  await fetchPC(documentNo, branchCode);
  updateState({ showCancelModal: false });
};



  const handleCloseSignatory = async (mode) => {
    updateState({
      isLoading: true,
      showSignatoryModal: false,
      noReprints: mode === "Final" ? 1 : 0,
    });

    await useHandlePrint(documentID, docType, mode, userCode);

    updateState({ isLoading: false });
  };

  const handleSaveAndPrint = async (id) => {
    updateState({ isLoading: true });
    await useHandlePrint(id, docType);
    updateState({ isLoading: false });
  };

  const handlePrint = () => useHandlePrint(docType,documentNo,branchCode,noReprints);
  const printData = { apv_no: documentNo, branch: branchCode, doc_id: docType };

  const changeRow=(i,key,value)=>{
    const rows=[...detailRows]; const row={...rows[i],[key]:value};
    if(key==="actualQty" && countRef==="A"){
      row.varQty=formatNumber((parseFormattedNumber(value)||0)-(parseFormattedNumber(row.qtyHand)||0),decQty);
    }
    rows[i]=row; detailRowsRef.current=rows; updateState({detailRows:rows,detailRowsGL:[]});
  };




  const addItems=(items)=>{
    const payload = items && typeof items === "object" && !Array.isArray(items) ? items.records ?? items.selectedItems ?? [] : items ?? [];
    const selected = Array.isArray(payload) ? payload : [payload];
    const addedRows = [];

    selected.filter(Boolean).forEach((x) => {
      const r = emptyRow();
      r.element = "N";
      r.itemCode = x.itemCode || x.itemNo || "";
      r.itemName = x.itemName || x.itemDesc || "";
      r.categCode = x.categCode || x.categoryCode || "";
      r.uomCode = x.uomCode || "";
      r.qstatCode = x.qstatCode || x.qsCode || "";
      r.whouseCode = x.whouseCode || x.whCode || whCode || "";
      r.locCode = x.locCode || locCode || "";
      r.unitCost = formatNumber(parseFormattedNumber(x.unitCost || 0) || 0, decUcost);
      r.qtyHand = formatNumber(0, decQty);
      r.actualQty = formatNumber(0, decQty);
      r.varQty = formatNumber(0, decQty);
      r.fifoDocNo = x.fifoDocNo || x.fifoDocno || x.rrNo || "";
      if (r.itemCode) addedRows.push(r);
    });

    const rows = [...detailRowsRef.current];
    const insertAt = itemInsertIndex === null ? rows.length : Math.min(itemInsertIndex + 1, rows.length);
    rows.splice(insertAt, 0, ...addedRows);
    const numberedRows = rows.map((r, index) => ({ ...r, lnNo: index + 1 }));
    detailRowsRef.current = numberedRows;
    setItemInsertIndex(null);
    updateState({ detailRows: numberedRows, detailRowsGL: [], itemLookupOpen: false, selectedRowIndex: null });
  };

  const replaceSelectedRowItem = (items) => {
    const payload = items && typeof items === "object" && !Array.isArray(items) ? items.records ?? items.selectedItems ?? [] : items ?? [];
    const selected = Array.isArray(payload) ? payload[0] : payload;
    if (!selected || selectedRowIndex === null) return;

    const rows = [...detailRowsRef.current];
    const row = rows[selectedRowIndex] || {};
    const nextRow = {
      ...row,
      itemCode: selected.itemCode  || row.itemCode || "",
      itemName: selected.itemName  || row.itemName || "",
      categCode: selected.categCode || selected.categoryCode || row.categCode || "",
      uomCode: selected.uomCode || row.uomCode || "",
      unitCost: formatNumber(parseFormattedNumber(selected.unitCost || 0) || 0, decUcost),
      qtyHand: formatNumber(0, decQty),
      qstatCode: selected.qstatCode || selected.qsCode || row.qstatCode || "",
      whouseCode: selected.whouseCode || row.whouseCode || whCode || "",
      locCode: selected.locCode || row.locCode || locCode || "",
      fifoDocNo: selected.fifoDocNo  || row.fifoDocNo || "",
      actualQty: formatNumber(0, decQty),
      varQty: formatNumber(0, decQty),
      element: "N",
    };

    rows[selectedRowIndex] = nextRow;
    detailRowsRef.current = rows;
    updateState({ detailRows: rows, detailRowsGL: [], itemLookupOpen: false, selectedRowIndex: null });
  };


  const handleSelectedFilterItems = (items) => {
    const payload = items && typeof items === "object" && !Array.isArray(items)
      ? items.records ?? items.selectedItems ?? []
      : items ?? [];
    const selected = (Array.isArray(payload) ? payload : [payload]).filter(Boolean);
    setSelectedFilterItems(selected);
    setItemFilterLookupOpen(false);
  };

  const handleSelectedFilterWarehouses = (items) => {
    const payload = items && typeof items === "object" && !Array.isArray(items)
      ? items.records ?? items.selectedItems ?? []
      : items ?? [];
    const selected = (Array.isArray(payload) ? payload : [payload]).filter(Boolean);
    setSelectedFilterWarehouses(selected);

    if (selected.length === 1) {
      const row = selected[0] || {};
      updateState({
        whCode: row.whCode || row.code || "",
        whName: row.whName || row.name || "",
        locCode: "",
        locName: "",
      });
    } else {
      updateState({
        whCode: "",
        whName: selected.length > 1 ? "Various Warehouses" : "",
        locCode: "",
        locName: "",
      });
    }

    setWarehouseFilterLookupOpen(false);
  };




  const removeRow=(i)=>{
    if(detailRows.length<=1){useSwalInfoAlert("Physical Count","Deleting of remaining record is not allowed.");return;}
    const rows=detailRows.filter((_,x)=>x!==i).map((r,x)=>({...r,lnNo:x+1}));
    detailRowsRef.current=rows; updateState({detailRows:rows,detailRowsGL:[]});
  };

  const commitNumericCell=(index,field,value,decimals)=>{
    const number=parseFormattedNumber(value);
    changeRow(index,field,formatNumber(Number.isFinite(number)?number:0,decimals));
  };

  const openItemLookup = async () => {
    setShowAddMenu(false);
    setItemInsertIndex(null);
    updateState({ isLoading: true, itemLookupOpen: true });

    try {
      const response = await fetchDataJson(inventoryLookupEndpoint, {
        userCode,
        whouseCode: whCode || "",
        locCode: locCode || "",
        docType,
        tranType: getLookupTranType("add-item"),
      });

      console.log(response)

      const parsed = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.result)
            ? response.result
            : [];

      const rows = Array.isArray(parsed) ? parsed : [];

      if (!rows.length) {
        useSwalInfoAlert("Physical Count", "No inventory records were found for the current filter.");
        updateState({ itemLookupOpen: false, isLoading: false });
        return;
      }

      updateState({ itemLookupOpen: true, isLoading: false });
    } catch (error) {
      useSwalErrorAlert("Physical Count", error?.message || "Unable to load item lookup.");
      updateState({ itemLookupOpen: false, isLoading: false });
    }
  };

  const renderPcDetailColumn=(column,row,index)=>{
    const style=getPcDetailCellStyle(column.key,column.width);
    const focusNext=(field)=>focusNextPcDetailRowInput(index,field,{
      rows:detailRows,
      zeroClearFields:["actualQty","varQty"],
      parseValue:parseFormattedNumber,
      onClearNextValue:(nextIndex,nextField,value)=>changeRow(nextIndex,nextField,value),
    });
    const textInput=(field,{readOnly=false,className=""}={})=>(
      <input id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui ${className}`.trim()} value={row[field]||""} readOnly={readOnly||isFormDisabled}
        onChange={(e)=>changeRow(index,field,e.target.value)}
        onKeyDown={(e)=>{if(e.key!=="Enter"||readOnly||isFormDisabled)return;e.preventDefault();focusNext(field);}} />
    );
    const lookupCell=(field,onLookup,{disabled=false}={})=>(
      <td key={column.key} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          <input id={`${field}-${index}`} className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[field]||""} readOnly
            onKeyDown={(e)=>{if(e.key!=="Enter"||isFormDisabled||disabled)return;e.preventDefault();onLookup();}} />
          {!isFormDisabled&&!disabled&&<FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={onLookup}/>} 
        </div>
      </td>
    );
    const numericInput=(field,{decimals=2,readOnly=false,allowNegative=false}={})=>{
      const pattern=allowNegative?new RegExp(`^-?\\d*\\.?\\d{0,${decimals}}$`):new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`);
      return <input id={`${field}-${index}`} className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={row[field]??""} readOnly={readOnly||isFormDisabled}
        onChange={(e)=>{const value=e.target.value.replace(allowNegative?/[^0-9.-]/g:/[^0-9.]/g,"");if(pattern.test(value)||value==="")changeRow(index,field,value);}}
        onFocus={(e)=>clearPcDetailZeroOnFocus(e,{isEditable:!(readOnly||isFormDisabled),onClear:(value)=>changeRow(index,field,value)})}
        onBlur={(e)=>{if(!readOnly&&!isFormDisabled)commitNumericCell(index,field,e.target.value,decimals);}}
        onKeyDown={(e)=>{
          if(e.key!=="Enter"||readOnly||isFormDisabled)return;
          e.preventDefault();
          commitNumericCell(index, field, e.currentTarget.value, decimals);
          if (field === "actualQty" && countRef === "A") {
            const rows = [...detailRowsRef.current];
            const current = rows[index] || {};
            const actual = parseFormattedNumber(current.actualQty ?? 0) || 0;
            const qtyHand = parseFormattedNumber(current.qtyHand ?? 0) || 0;
            const variance = formatNumber(actual - qtyHand, decQty);
            changeRow(index, "varQty", variance);
          }
          focusNext(field);
        }} />;
    };

    const isNewRecordRow = String(row.element || "N").toUpperCase() === "N";

    const renderers={
      ln:()=> <td key={column.key} className="global-tran-td-ui text-center" style={style}>{index+1}</td>,
      element:()=> {
        const elementValue = String(row.element || "N").toUpperCase();
        const displayValue = elementValue === "E" ? "Existing Record" : elementValue === "N" ? "New Record" : elementValue;
        return <td key={column.key} className="global-tran-td-ui text-center" style={style}>{displayValue}</td>;
      },
      itemCode:()=>lookupCell("itemCode",()=>{ setItemInsertIndex(null); updateState({ selectedRowIndex: index, itemLookupOpen: true, itemLookupSingleSelect: true }); },{disabled: row.element === "E" || isFormDisabled}),
      itemName:()=> <td key={column.key} className="global-tran-td-ui" style={style}>{textInput("itemName",{readOnly: row.element === "E" || isFormDisabled})}</td>,
      uomCode:()=> <td key={column.key} className="global-tran-td-ui" style={style}>{textInput("uomCode",{readOnly: row.element === "E" || isFormDisabled,className:"text-center"})}</td>,
      qstatCode:()=>lookupCell("qstatCode",()=>updateState({selectedRowIndex:index,showQstatModal:true}),{disabled: row.element === "E" || isFormDisabled || !isNewRecordRow}),
      lotNo:()=> <td key={column.key} className="global-tran-td-ui" style={style}>{textInput("lotNo",{readOnly: row.element === "E" || isFormDisabled || !isNewRecordRow,className:"text-center"})}</td>,
      bbDate:()=> <td key={column.key} className="global-tran-td-ui" style={style}><input type="date" id={`bbDate-${index}`} className="w-full global-tran-td-inputclass-ui text-center" value={row.bbDate ? toDateInputValue(row.bbDate) : ""} readOnly={row.element === "E" || isFormDisabled || !isNewRecordRow} onChange={(e)=>changeRow(index,"bbDate", e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();focusNext("bbDate");}}} /></td>,
      fifoDocNo:()=> <td key={column.key} className="global-tran-td-ui" style={style}>{textInput("fifoDocNo",{readOnly:true,className:"text-center"})}</td>,
      unitCost:()=> <td key={column.key} className="global-tran-td-ui" style={style}>{numericInput("unitCost",{decimals:decUcost,readOnly: isFormDisabled || row.element === "E"})}</td>,
      qtyHand:()=> <td key={column.key} className="global-tran-td-ui" style={style}>{numericInput("qtyHand",{decimals:decQty,readOnly:true})}</td>,
      actualQty:()=> <td key={column.key} className="global-tran-td-ui" style={style}>{numericInput("actualQty",{decimals:decQty, readOnly: isFormDisabled})}</td>,
      varQty:()=> <td key={column.key} className="global-tran-td-ui" style={style}>{numericInput("varQty",{decimals:decQty,readOnly: countRef === "A" || isFormDisabled || (row.element === "E" && !isNewRecordRow),allowNegative:true})}</td>,
      whouseCode:()=>lookupCell("whouseCode",()=>updateState({selectedRowIndex:index,selectedWH:row.whouseCode,warehouseLookupOpen:true}),{disabled:isFormDisabled || row.element === "E" || !isNewRecordRow}),
      locCode:()=>lookupCell("locCode",()=>updateState({selectedRowIndex:index,selectedWH:row.whouseCode,locationLookupOpen:true}),{disabled: isFormDisabled || row.element === "E" || !isNewRecordRow || !row.whouseCode}),
    };
    return renderers[column.key]?.()??<td key={column.key} className="global-tran-td-ui" style={style}>{String(row[column.key]??"")}</td>;
  };

  const createEmptyGlRow = () => ({
    acctCode: "", rcCode: "", sltypeCode: "", slCode: "", particular: "",
    vatCode: "", vatName: "", atcCode: "", atcName: "",
    debit: "0.00", credit: "0.00", debitFx1: "0.00", creditFx1: "0.00",
    debitFx2: "0.00", creditFx2: "0.00", slRefNo: "", slRefDate: "", remarks: "",
  });

  const handleAddRowGL = (index = null) => {
    const rows = [...detailRowsGLRef.current];
    const newRow = createEmptyGlRow();
    if (index !== null && index >= 0) rows.splice(index + 1, 0, newRow);
    else rows.push(newRow);
    detailRowsGLRef.current = rows;
    updateState({ detailRowsGL: rows, ...getGLTotalsState(rows) });
  };

  const handleDeleteRowGL = (index) => {
    const rows = [...detailRowsGLRef.current];
    rows.splice(index, 1);
    detailRowsGLRef.current = rows;
    updateState({ detailRowsGL: rows, ...getGLTotalsState(rows) });
  };

  const handleDetailChangeGL = async (index, field, value) => {
    const rows = [...detailRowsGLRef.current];
    let row = { ...(rows[index] || {}) };

    if (["acctCode", "slCode", "rcCode", "sltypeCode", "vatCode", "atcCode"].includes(field)) {
      const data = await useUpdateRowGLEntries(row, field, value, "", docType);
      if (data) {
        row = {
          ...row,
          acctCode: data.acctCode,
          sltypeCode: data.sltypeCode,
          slCode: data.slCode,
          rcCode: data.rcCode,
          vatCode: data.vatCode,
          vatName: data.vatName,
          atcCode: data.atcCode,
          atcName: data.atcName,
          particular: data.particular,
        };
      }
    } else {
      row[field] = value;
    }

    if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(field)) {
      row[field] = value;
      const parsedValue = parseFormattedNumber(value);
      const pairs = { debit:"credit", credit:"debit", debitFx1:"creditFx1", creditFx1:"debitFx1", debitFx2:"creditFx2", creditFx2:"debitFx2" };
      if (parsedValue > 0 && pairs[field]) row[pairs[field]] = "0.00";
    }

    rows[index] = row;
    detailRowsGLRef.current = rows;
    updateState({ detailRowsGL: rows, ...getGLTotalsState(rows) });
  };

  const handleBlurGL = async (index, field, value, autoCompute = false) => {
    const rows = [...detailRowsGLRef.current];
    const row = { ...(rows[index] || {}) };
    const parsedValue = parseFormattedNumber(value);
    row[field] = formatNumber(parsedValue);

    if (autoCompute && ((withCurr2 && currCode !== glCurrDefault) || withCurr3)) {
      const data = await useUpdateRowEditEntries(row, field, value, currCode, currRate, documentDate);
      if (data) {
        row.debit = formatNumber(data.debit);
        row.credit = formatNumber(data.credit);
        row.debitFx1 = formatNumber(data.debitFx1);
        row.creditFx1 = formatNumber(data.creditFx1);
        row.debitFx2 = formatNumber(data.debitFx2);
        row.creditFx2 = formatNumber(data.creditFx2);
      }
    } else {
      const pairs = [["debit","credit"],["debitFx1","creditFx1"],["debitFx2","creditFx2"]];
      pairs.forEach(([a,b]) => {
        if (field === a && parsedValue > 0) row[b] = formatNumber(0);
        else if (field === b && parsedValue > 0) row[a] = formatNumber(0);
      });
    }

    rows[index] = row;
    detailRowsGLRef.current = rows;
    updateState({ detailRowsGL: rows, ...getGLTotalsState(rows) });
  };

  const handleCloseAccountModal = (selectedAccount) => {
    if (selectedAccount && selectedRowIndex !== null) handleDetailChangeGL(selectedRowIndex, "acctCode", selectedAccount);
    updateState({ showAccountModal: false, selectedRowIndex: null, accountModalSource: null });
  };

  const handleCloseRcModalGL = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      const result = await useTopRCRow(selectedRc.rcCode || selectedRc.code || selectedRc);
      if (result) await handleDetailChangeGL(selectedRowIndex, "rcCode", result);
    }
    updateState({ showRcModal: false, selectedRowIndex: null, accountModalSource: null });
  };

  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) await handleDetailChangeGL(selectedRowIndex, "slCode", selectedSl);
    updateState({ showSlModal: false, selectedRowIndex: null });
  };

  const renderPcGlColumn = (columnKey, row, index) => {
    const columnWidth = getPcGlFallbackWidth(columnKey);
    const style = getPcGlCellStyle(columnKey, columnWidth);
    const focusNext = (field) => focusNextPcGlRowInput(index, field, {
      rows: detailRowsGL,
      zeroClearFields: pcGlEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, nextValue) => handleDetailChangeGL(nextIndex, nextField, nextValue),
    });
    const modalHandlers = {
      acctCode: () => updateState({ selectedRowIndex:index, showAccountModal:true, accountModalSource:"acctCode" }),
      rcCode: () => updateState({ selectedRowIndex:index, showRcModal:true, accountModalSource:null }),
      slCode: () => updateState({ selectedRowIndex:index, showSlModal:true, accountModalSource:null }),
    };
    const textInput = (field, options={}) => <input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} maxLength={options.maxLength} onChange={(e)=>handleDetailChangeGL(index,field,e.target.value)} onKeyDown={(e)=>{if(e.key!=="Enter"||options.readOnly||isFormDisabled)return;e.preventDefault();focusNext(field);}} />;
    const lookupCell = (field, options={}) => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full"><input type="text" id={`${field}-${index}`} className="w-full pr-6 global-tran-td-inputclass-ui cursor-pointer" value={row[field] || ""} readOnly={options.readOnly ?? true} onChange={(e)=>handleDetailChangeGL(index,field,e.target.value)} onKeyDown={(e)=>{if(e.key!=="Enter"||isFormDisabled)return;e.preventDefault();focusNext(field);}} />{!isFormDisabled && (options.alwaysShowIcon || String(row[field] || "").trim()) && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[field]}/>}</div></td>;
    const amountInput = (field) => <input type="text" id={`${field}-${index}`} className="w-full global-tran-td-inputclass-ui text-right" value={row[field] || ""} readOnly={isFormDisabled} onChange={(e)=>{const value=e.target.value.replace(/[^0-9.]/g,"");if(/^\d*\.?\d{0,2}$/.test(value)||value==="")handleDetailChangeGL(index,field,value);}} onFocus={(e)=>clearPcGlZeroOnFocus(e,{isEditable:!isFormDisabled,onClear:(nextValue)=>handleDetailChangeGL(index,field,nextValue)})} onBlur={(e)=>{if(!isFormDisabled)handleBlurGL(index,field,e.target.value);}} onKeyDown={async(e)=>{if(e.key!=="Enter"||isFormDisabled)return;e.preventDefault();await handleBlurGL(index,field,e.target.value,true);focusNext(field);}} />;

    const renderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      acctCode: () => lookupCell("acctCode", { alwaysShowIcon:true, readOnly:false }),
      rcCode: () => lookupCell("rcCode"),
      sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("sltypeCode")}</td>,
      slCode: () => lookupCell("slCode"),
      particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("particular")}</td>,
      debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debit")}</td>,
      credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("credit")}</td>,
      debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debitFx1")}</td>,
      creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("creditFx1")}</td>,
      debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debitFx2")}</td>,
      creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("creditFx2")}</td>,
      slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("slRefNo",{maxLength:useGetFieldLength(state.tblFieldArray,"slref_no")})}</td>,
      slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`slRefDate-${index}`} className="w-full global-tran-td-inputclass-ui text-center" value={toNativeDateInputValue(row.slRefDate)} readOnly={isFormDisabled} onChange={(e) => handleDetailChangeGL(index, "slRefDate", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNext("slRefDate"); } }} /></td>,
      remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("remarks",{maxLength:useGetFieldLength(state.tblFieldArray,"remarks")})}</td>,
    };
    return renderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
  };

  const loadBalanceToDetailRows = async () => {
    if (!branchCode) {
      useSwalInfoAlert("Physical Count","Please select a branch  before loading the inventory balance.");
      return;
    }

    updateState({ isLoading: true });

    try {
      const response = await fetchDataJson(inventoryLookupEndpoint, {
        userCode,
        whouseCode: whCode || "",
        locCode: locCode || "",
        itemCodes: selectedFilterItems.map((row) => row.itemCode || row.itemNo || "").filter(Boolean),
        whouseCodes: selectedFilterWarehouses.map((row) => row.whCode || row.code || "").filter(Boolean),
        docType,
        tranType: getLookupTranType("load-balance"),
      });

      const parsed = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.result)
            ? response.result
            : [];

      const inventoryRows = Array.isArray(parsed) ? parsed : [];

      if (!inventoryRows.length) {
        useSwalInfoAlert("Physical Count","No inventory balance records were found for the selected item/warehouse filter.");
        return;
      }

      const existing = new Set(
        detailRowsRef.current.map((row) => `${row.itemCode}|${row.whouseCode}|${row.locCode}|${row.lotNo}|${row.qstatCode}`)
      );

      console.log(inventoryRows)

      const mappedRows = inventoryRows
        .filter((row) => row && (row.itemCode || row.itemName || row.uomCode || row.qtyHand))
        .map((row, index) => {
          const itemCode = row.itemCode || "";
          const itemName = row.itemName || "";
          const qtyHand = parseFormattedNumber(row.qtyHand ?? 0) || 0;
          const unitCost = parseFormattedNumber(row.unitCost ?? 0) || 0;
          const qstatCode = row.qstatCode || "";
          const locCodeValue = row.locCode || row.LocCode || locCode || "";
          const whouseCodeValue = row.whouseCode || row.whCode || whCode || "";
          const bbDateValue = row.bbDate ? new Date(row.bbDate).toISOString().split("T")[0] : "";
          const uniqueKeyValue = row.uniqueKey ?? row.order_id ?? "";
          const groupIdValue = row.groupId ?? row.order_id ?? "";

          return {
            lnNo: index + 1,
            itemCode,
            itemName,
            categCode: row.categCode || row.categoryCode || "",
            uomCode: row.uomCode || "",
            element: "E",
            invType,
            qstatCode,
            lotNo: row.lotNo || "",
            colorCode: row.colorCode || "",
            orderStamp: row.orderStamp || "",
            fifoDocNo: row.fifoDocNo || "",
            uniqueKey: uniqueKeyValue,
            groupId: groupIdValue,
            unitCost: formatNumber(unitCost, decUcost),
            qtyHand: formatNumber(qtyHand, decQty),
            varQty: formatNumber(0, decQty),
            actualQty: formatNumber(qtyHand, decQty),
            whouseCode: whouseCodeValue,
            locCode: locCodeValue,
            bbDate: bbDateValue,
          };
        })
        .filter((row) => row.itemCode && !existing.has(`${row.itemCode}|${row.whouseCode}|${row.locCode}|${row.lotNo}|${row.qstatCode}`));



      const nextRows = [...detailRowsRef.current, ...mappedRows].map((row, idx) => ({
        ...row,
        lnNo: idx + 1,
      }));

      detailRowsRef.current = nextRows;
      updateState({ detailRows: nextRows, detailRowsGL: [] });
      setShowAddMenu(false);
    } catch (error) {
      useSwalErrorAlert("Physical Count", error?.message || "Unable to load inventory balance.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const downloadTemplate=async(allItems=false)=>{
    try{
      const exportColumns = visiblePcDetailColumns.map((column) => ({
        key: column.key,
        label: column.label.toUpperCase(),
      }));

      const exportRows = (allItems ? detailRows : detailRows).map((row, rowIndex) => {
        const exportRow = {};
        visiblePcDetailColumns.forEach((column) => {
          const key = column.key;
          if (key === "ln") exportRow[key] = row.lnNo ?? row.ln ?? rowIndex + 1;
          else if (key === "element") exportRow[key] = row.element || "N";
          else if (key === "fifoDocNo") exportRow[key] = row.fifoDocNo ?? row.fifoDocno ?? row.rrNo ?? "";
          else exportRow[key] = row[key] ?? "";
        });
        return exportRow;
      });

      const decimalColumnFormats = {};
      visiblePcDetailColumns.forEach((column) => {
        if (column.key === "unitCost") decimalColumnFormats.unitCost = decUcost;
        if (["qtyHand", "actualQty", "varQty"].includes(column.key)) decimalColumnFormats[column.key] = decQty;
      });

      await downloadGlobalSingleUploadTemplate({
        columns: exportColumns,
        rows: exportRows,
        fileName: `${invType} Physical Count Sheet.xlsx`,
        sheetName: "Physical Count",
        decimalColumnFormats,
      });
    }catch(e){useSwalErrorAlert("Physical Count",e?.message||"Count sheet download failed.");}
  };

  const uploadExcel=async(e)=>{
    const file=e.target.files?.[0]; e.target.value=""; if(!file)return;
    try{
      const rows=await handleSingleUploadExcelFile(file);
      const response=await postRequest("/validatePCUpload",{json_data:{branchCode,invType,whCode,locCode,countRef,dt1:rows}});
      const result=extractSingleUploadValidationResult(response);
      if(result?.errors?.length){showSingleUploadErrorList(result.errors,"Physical Count Upload");return;}
      const loaded=(result?.rows||result?.data||[]).map(normalizeRow);
      detailRowsRef.current=loaded; updateState({detailRows:loaded,detailRowsGL:[]});
    }catch(err){useSwalErrorAlert("Physical Count",err?.message||"Upload failed.");}
  };

  return (
    <Fragment>
      {isLoading && <LoadingSpinner />}

      <div className="global-tran-main-div-ui">
        <input
          ref={uploadInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={uploadExcel}
        />

        <div className="global-tran-headerToolbar-ui">
          <Header
            docType={docType}
            pdfLink={docTypePDFGuide?.[docType]}
            videoLink={docTypeVideoGuide?.[docType]}
            onPrint={handlePrint}
            onPost={handlePost}
            onReset={reset}
            onSave={handleSave}
            onCancel={handleCancel}
            onAttach={() => updateState({ showAttachModal: true })}
            activeTopTab={topTab}
            showActions={topTab === "details"}
            showBIRForm={false}
            showCopyForm={false}
            isViewDocument={isViewDocument}
            onDetails={() => setTopTab("details")}
            onHistory={() => setTopTab("history")}
            disableRouteNavigation={true}
            isSaveDisabled={isFormDisabled || detailRows.length === 0}
            isAttachDisabled={!documentID}
            isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
            isCopyDisabled={true}
            isCancelDisabled={
              !documentID ||
              displayStatus === "CANCELLED" ||
              displayStatus === "FINALIZED" ||
              displayStatus === "POSTED" ||
              displayStatus === "CLOSED"
            }
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
                <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>
                  {displayStatus}
                </h1>
              </div>
            </div>
          </div>

          <div className="global-tran-header-div-ui">
            <div className="global-tran-header-tab-div-ui">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Basic Information
              </button>
            </div>

            <div
              id="pc_hd"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative"
            >
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="global-tran-textbox-group-div-ui">
                  <FieldRenderer
                    id="branchName"
                    label="Branch"
                    type="lookup"
                    value={branchName || branchCode || ""}
                    disabled={isExisting || isFormDisabled}
                    readOnly
                    lookupDisabled={isExisting || isFormDisabled}
                    onLookup={() => !isExisting && !isFormDisabled && updateState({ branchModalOpen: true })}
                  />

                  <FieldRenderer
                    id="pcNo"
                    label="PC No."
                    type="lookup"
                    value={documentNo || ""}
                    disabled={isExisting || isFormDisabled}
                    onChange={(val) => updateState({ documentNo: val })}
                    onLookup={() => updateState({ showAllTranDocNo: true })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && documentNo) {
                        e.preventDefault();
                        fetchPC(documentNo, branchCode);
                      }
                    }}
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
                        id="pcDate"
                        className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                        value={toDateInputValue(documentDate)}
                        disabled={isFormDisabled}
                        updateState={(updates) => {
                          if (updates.pcDate !== undefined) {
                            updateState({ documentDate: updates.pcDate });
                          } else if (updates.documentDate !== undefined) {
                            updateState({ documentDate: updates.documentDate });
                          }
                        }}
                      />
                    </div>
                    <label htmlFor="pcDate" className="global-ref-floating-label">
                      PC Date
                    </label>
                  </div>
                </div>

                <div className="global-tran-textbox-group-div-ui">
                  <FieldRenderer
                    id="itemFilter"
                    label="Item Lookup"
                    type="lookup"
                    value={itemFilterDisplay}
                    disabled={isExisting || isFormDisabled}
                    readOnly
                    lookupDisabled={isExisting || isFormDisabled}
                    onLookup={() =>
                      !isExisting &&
                      !isFormDisabled &&
                      setItemFilterLookupOpen(true)
                    }
                  />

                  <FieldRenderer
                    id="warehouse"
                    label="Warehouse"
                    type="lookup"
                    value={warehouseFilterDisplay}
                    disabled={isExisting || isFormDisabled}
                    readOnly
                    lookupDisabled={isExisting || isFormDisabled}
                    onLookup={() =>
                      !isExisting &&
                      !isFormDisabled &&
                      setWarehouseFilterLookupOpen(true)
                    }
                  />

                  <FieldRenderer
                    id="location"
                    label="Location"
                    type="lookup"
                    value={locName || locCode || ""}
                    disabled={isExisting || isFormDisabled || selectedFilterWarehouses.length !== 1 || !whCode}
                    readOnly
                    lookupDisabled={isExisting || isFormDisabled || selectedFilterWarehouses.length !== 1 || !whCode}
                    onLookup={() =>
                      !isExisting &&
                      !isFormDisabled &&
                      selectedFilterWarehouses.length === 1 &&
                      whCode &&
                      updateState({
                        selectedRowIndex: null,
                        locationLookupOpen: true,
                        selectedWH: whCode,
                      })
                    }
                  />
                </div>

                <div className="global-tran-textbox-group-div-ui">
                  <FieldRenderer
                    id="countRef"
                    label="Count Reference"
                    type="select"
                    value={countRef || "V"}
                    disabled={isFormDisabled}
                    onChange={(val) => updateState({ countRef: val })}
                    options={[
                      { label: "Variance Count", value: "V" },
                      { label: "Actual Count", value: "A" },
                    ]}
                  />

                  <FieldRenderer
                    id="refNo"
                    label="Reference No."
                    type="text"
                    value={refNo || ""}
                    disabled={isFormDisabled}
                    onChange={(val) => updateState({ refNo: val })}
                  />
                </div>

                <div className="col-span-full">
                  <div className="relative p-2">
                    <textarea
                      id="particular"
                      placeholder=""
                      rows={3}
                      className="peer global-tran-textbox-remarks-ui pt-2"
                      value={particular}
                      onChange={(e) => updateState({ particular: e.target.value })}
                      disabled={isFormDisabled}
                    />
                    <label
                      htmlFor="particular"
                      className="global-tran-floating-label-remarks"
                    >
                      Particular
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="pc_dt1" className="global-tran-tab-div-ui">
            <div className="global-tran-tab-nav-ui">
              <div className="flex flex-row sm:flex-row">
                <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                  Item Details
                </button>
              </div>
            </div>

            <div className="global-tran-table-main-div-ui">
              <div className="global-tran-table-main-sub-div-ui">
                <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                  <thead className="global-tran-thead-div-ui">
                    <tr>
                      {visiblePcDetailColumns.map((column)=>(
                        <Fragment key={`pc-detail-header-${column.key}`}>
                          {renderPcDetailHeader(column.label,column.key,column.width,{orderedColumns:visiblePcDetailColumns})}
                        </Fragment>
                      ))}
                      {!isFormDisabled && (
                        <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-300 dark:bg-blue-900" style={transactionActionsHeaderStyle}>Actions</th>
                      )}
                    </tr>
                    {renderPcDetailHeaderContextMenu()}
                  </thead>

                  <tbody className="relative">
                    {sortedPcDetailRows.map(({row:r,originalIndex:i}) => {
                      const isInsufficient =
                        countRef === "V" &&
                        (parseFormattedNumber(r.varQty) || 0) < 0 &&
                        Math.abs(parseFormattedNumber(r.varQty) || 0) >
                          (parseFormattedNumber(r.qtyHand) || 0);

                      return (
                        <tr
                          key={`${r.itemCode}-${i}`}
                          className={`global-tran-tr-ui ${isInsufficient ? "bg-red-100" : ""}`}
                        >
                          {visiblePcDetailColumns.map((column)=>renderPcDetailColumn(column,r,i))}

                          {!isFormDisabled && (
                            <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black" style={transactionActionsCellStyle}>
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" className="global-tran-td-button-add-ui" onClick={()=>{setItemInsertIndex(i);updateState({itemLookupOpen:true});}}>
                                  <FontAwesomeIcon icon={faPlus}/>
                                </button>
                                <button type="button" className="global-tran-td-button-delete-ui" onClick={() => removeRow(i)}>
                                  <FontAwesomeIcon icon={faTrashAlt} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="global-tran-tab-footer-main-div-ui">
              <div className="global-tran-tab-footer-button-div-ui flex items-center gap-2">
                <div ref={addMenuRef} className="relative inline-block">
                  {showAddMenu&&!isFormDisabled&&(
                    <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Add Item</div></div>
                      <div className="p-2">
                        <button type="button" className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700" onClick={openItemLookup}>
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FontAwesomeIcon icon={faFolderOpen}/></span>
                          <span className="ml-3 flex flex-col items-start"><span>Add Item</span><span className="text-[11px] font-normal text-slate-400">Select item details</span></span>
                        </button>
                        <button type="button" className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50" onClick={()=>{setShowAddMenu(false);loadBalanceToDetailRows();}}>
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FontAwesomeIcon icon={faFolderOpen}/></span>
                          <span className="ml-3 flex flex-col items-start"><span>Load Balance</span><span className="text-[11px] font-normal text-slate-400">Stock card inventory balance</span></span>
                        </button>
                        <button type="button" className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50" onClick={()=>{setShowAddMenu(false);downloadTemplate(true);}}>
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FontAwesomeIcon icon={faDownload}/></span>
                          <span className="ml-3 flex flex-col items-start"><span>Download Template</span><span className="text-[11px] font-normal text-slate-400">Excel item columns</span></span>
                        </button>
                        <button type="button" className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50" onClick={()=>{setShowAddMenu(false);uploadInputRef.current?.click();}}>
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FontAwesomeIcon icon={faUpload}/></span>
                          <span className="ml-3 flex flex-col items-start"><span>Upload Transaction</span><span className="text-[11px] font-normal text-slate-400">Import Excel file</span></span>
                        </button>
                      </div>
                    </div>
                  )}
                  <button type="button" onClick={()=>setShowAddMenu((prev)=>!prev)} className="global-tran-tab-footer-button-add-ui" style={{visibility:isFormDisabled?"hidden":"visible"}}>
                    <FontAwesomeIcon icon={faPlus} className="mr-2"/>Add<FontAwesomeIcon icon={faChevronDown} className="ml-2 text-xs"/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!noViewCostamt && (
          <div id="pc_dt2" className="global-tran-tab-div-ui">
            <div className="global-tran-tab-nav-ui">
              <div className="flex flex-row sm:flex-row">
                <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">General Ledger</button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleActivityOption("GenerateGL")}
                  className="global-tran-button-generateGL"
                  disabled={isLoading}
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
                      {orderedPcGlColumns.map((column) => (
                        <Fragment key={`pc-gl-header-${column.key}`}>
                          {renderPcGlHeader(column.label, column.key, column.width, { orderedColumns: orderedPcGlColumns })}
                        </Fragment>
                      ))}
                    </tr>
                    {renderPcGlHeaderContextMenu()}
                  </thead>
                  <tbody className="relative">
                    {sortedPcGlRows.map(({ row, originalIndex }) => (
                      <tr key={`${row.acctCode || "gl"}-${originalIndex}`} className="global-tran-tr-ui">
                        {orderedPcGlColumns.map((column) => renderPcGlColumn(column.key, row, originalIndex))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="global-tran-tab-footer-main-div-ui">
              <div className="global-tran-tab-footer-button-div-ui">
                <button onClick={() => handleAddRowGL()} className="global-tran-tab-footer-button-add-ui" style={{visibility:isFormDisabled?"hidden":"visible"}}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2"/>Add
                </button>
              </div>

              <div className="global-tran-tab-footer-total-main-div-ui">
                <div className="global-tran-tab-footer-total-div-ui">
                  <label className="global-tran-tab-footer-total-label-ui">Total Debit ({glCurrDefault}):</label>
                  <label className="global-tran-tab-footer-total-value-ui">{totalDebit}</label>
                </div>
                <div className="global-tran-tab-footer-total-div-ui">
                  <label className="global-tran-tab-footer-total-label-ui">Total Credit ({glCurrDefault}):</label>
                  <label className="global-tran-tab-footer-total-value-ui">{totalCredit}</label>
                </div>
                {withCurr2 && <>
                  <div className="global-tran-tab-footer-total-div-ui"><label className="global-tran-tab-footer-total-label-ui">Total Debit ({glCurrGlobal2}):</label><label className="global-tran-tab-footer-total-value-ui">{totalDebitFx1}</label></div>
                  <div className="global-tran-tab-footer-total-div-ui"><label className="global-tran-tab-footer-total-label-ui">Total Credit ({glCurrGlobal2}):</label><label className="global-tran-tab-footer-total-value-ui">{totalCreditFx1}</label></div>
                </>}
                {withCurr3 && <>
                  <div className="global-tran-tab-footer-total-div-ui"><label className="global-tran-tab-footer-total-label-ui">Total Debit ({glCurrGlobal3}):</label><label className="global-tran-tab-footer-total-value-ui">{totalDebitFx2}</label></div>
                  <div className="global-tran-tab-footer-total-div-ui"><label className="global-tran-tab-footer-total-label-ui">Total Credit ({glCurrGlobal3}):</label><label className="global-tran-tab-footer-total-value-ui">{totalCreditFx2}</label></div>
                </>}
              </div>
            </div>
          </div>
          )}
        </div>

       <div className={topTab === "history" ? "" : "hidden"}>
          <AllTranHistory
            showHeader={false}
            endpoint={historyEndpoint}
            cacheKey={`PC:${invType}:${state.branchCode || ""}:${state.documentNo || ""}`}
            activeTabKey="PC_Summary"
            branchCode={state.branchCode}
            startDate={state.fromDate}
            endDate={state.toDate}
            invType={invType}
            status="All"
            onRowDoubleClick={handleHistoryRowPick}
            historyExportName={`${documentTitle} History`}
          />
        </div>

        {branchModalOpen && (
          <BranchLookupModal
            isOpen
            onClose={(r) => {
              if (r) {
                setSelectedFilterWarehouses([]);
                updateState({
                  branchCode: r.branchCode || r.code,
                  branchName: r.branchName || r.name,
                  whCode: "",
                  whName: "",
                  locCode: "",
                  locName: "",
                });
              }
              updateState({ branchModalOpen: false });
            }}
          />
        )}

        {warehouseFilterLookupOpen && (
          <WarehouseLookupModal
            isOpen={warehouseFilterLookupOpen}
            onClose={(payload) => {
              if (!payload) {
                setWarehouseFilterLookupOpen(false);
                return;
              }
              handleSelectedFilterWarehouses(payload);
            }}
            onGetSelectedItems={handleSelectedFilterWarehouses}
            filter={"ByBC" + branchCode}
            branchCode={branchCode}
            invType={invType}
            enableMultiSelect
            selectedItems={selectedFilterWarehouses}
            allowEmptySelection
          />
        )}

        {warehouseLookupOpen && (
          <WarehouseLookupModal
            isOpen={warehouseLookupOpen}
            onClose={handleCloseWarehouseLookup}
            filter={"ByBC" + branchCode}
            branchCode={branchCode}
            invType={invType}
          />
        )}

        {locationLookupOpen && (
          <LocationLookupModal
            isOpen={locationLookupOpen}
            onClose={handleCloseLocationLookup}
            filter={"ByWH" + selectedWH}
          />
        )}

        {itemFilterLookupOpen && (
          <ItemMastLookupModal
            isOpen
            onClose={(payload) => {
              if (!payload) {
                setItemFilterLookupOpen(false);
                return;
              }
              handleSelectedFilterItems(payload);
            }}
            onGetSelectedItems={handleSelectedFilterItems}
            invType={invType}
            enableMultiSelect
            selectedItems={selectedFilterItems}
            allowEmptySelection
            endpoint={inventoryLookupEndpoint}
            customParam="ActiveAll"
            docType={docType}
            tranType={getLookupTranType("add-item")}
            method="get"
          />
        )}

        {itemLookupOpen && (
          <ItemMastLookupModal
            isOpen
            onClose={(payload) => {
              if (selectedRowIndex !== null) {
                replaceSelectedRowItem(payload);
                return;
              }
              addItems(payload);
            }}
            onGetSelectedItems={(payload) => {
              if (selectedRowIndex !== null) {
                replaceSelectedRowItem(payload);
                return;
              }
              addItems(payload);
            }}
            invType={invType}
            enableMultiSelect={selectedRowIndex === null}
            endpoint={inventoryLookupEndpoint}
            customParam="ActiveAll"
            docType={docType}
            tranType={getLookupTranType("add-item")}
            method="get"
          />
        )}

        {showQstatModal && (
          <QstatLookupModal
            isOpen
            onClose={(r) => {
              if (r && selectedRowIndex !== null) {
                const rows = [...detailRowsRef.current];
                rows[selectedRowIndex] = { ...rows[selectedRowIndex], qstatCode: r.qstatCode || r.qsCode || r.code };
                detailRowsRef.current = rows;
                updateState({ detailRows: rows });
              }
              updateState({ showQstatModal: false, selectedRowIndex: null });
            }}
            filter="ActiveAll"
          />
        )}

        {showAllTranDocNo && (
          <AllTranDocNo
            isOpen={showAllTranDocNo}
            params={{branchCode, branchName, docType, documentTitle, fieldNo : "pcNo"}}
            onRetrieve={handleTranDocNoRetrieval}
            onResponse={{documentNo}}
            onSelected={handleTranDocNoSelection}
            onClose={() => updateState({ showAllTranDocNo: false })}
          />
        )}

        {showAccountModal && (
          <COAMastLookupModal
            isOpen={showAccountModal}
            onClose={handleCloseAccountModal}
            source={accountModalSource}
          />
        )}

        {showRcModal && (
          <RCLookupModal
            isOpen={showRcModal}
            onClose={handleCloseRcModalGL}
            source={accountModalSource}
          />
        )}

        {showSlModal && (
          <SLMastLookupModal
            isOpen={showSlModal}
            onClose={handleCloseSlModalGL}
          />
        )}

        {showCancelModal && (
          <CancelTranModal
            isOpen={showCancelModal}
            onClose={handleCloseCancel}
          />
        )}

        {showAttachModal && (
          <AttachDocumentModal
            isOpen={showAttachModal}
            params={{
              DocumentID: documentID,
              DocumentName: documentTitle,
              BranchName: branchName,
              DocumentNo: documentNo,
            }}
            onClose={() => updateState({ showAttachModal: false })}
          />
        )}
      </div>
    </Fragment>
  );
};
export default PC;
