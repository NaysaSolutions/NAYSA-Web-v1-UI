import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen, faMagnifyingGlass, faPenToSquare, faPlus, faSave, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import SearchPOOpenModal from "../../../Lookup/SearchPOOpenModal.jsx";
import SearchFACateg from "../../../Lookup/SearchFACateg.jsx";
import SearchFAClass from "../../../Lookup/SearchFAClass.jsx";
import SearchFALoc from "../../../Lookup/SearchFALoc.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";

// Global / NAYSA components
import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalHandleOpenSpecsModal,
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { docTypePDFGuide, docTypeVideoGuide, glAccountFilter } from "@/NAYSA Cloud/Global/doctype";
import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";
import { useTopPayeeRow } from "@/NAYSA Cloud/Global/top1RefTable";
import {
  useFetchTranData,
  useGenerateGLEntries,
  useHandleCancel,
  useTransactionUpsert,
} from "@/NAYSA Cloud/Global/procedure";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const assetDetailColumns = [
  { key: "ln", label: "LN", width: 48, align: "text-center" },
  { key: "poId", label: "PO ID", width: 120 },
  { key: "groupId", label: "Group ID", width: 140 },
  { key: "poNo", label: "PO No.", width: 120 },
  { key: "itemCode", label: "Item Code", width: 120 },
  { key: "assetDescription", label: "Asset Description", width: 260 },
  { key: "remarks", label: "Asset Other Specification", width: 180 },
  { key: "receivedQty", label: "RR Quantity", width: 105, align: "text-right" },
  { key: "unit", label: "UOM", width: 70, align: "text-center" },
  { key: "unitCost", label: "Unit Cost", width: 105, align: "text-right" },
  { key: "amount", label: "Amount", width: 120, align: "text-right" },
  { key: "vat", label: "VAT", width: 90 },
  { key: "vatRate", label: "VAT Rate", width: 105, align: "text-right" },
  { key: "vatAmount", label: "VAT Amount", width: 120, align: "text-right" },
  { key: "netAmount", label: "Net Amount", width: 120, align: "text-right" },
  { key: "acqCost", label: "Acq Cost", width: 120, align: "text-right" },
  { key: "categCode", label: "Category Code", width: 130 },
  { key: "categName", label: "Category", width: 150 },
  { key: "classCode", label: "Class Code", width: 130 },
  { key: "className", label: "Sub Category", width: 165 },
  { key: "usefulLife", label: "Useful Life (Mo.)", width: 105, align: "text-center" },
  { key: "serialNo", label: "Serial No.", width: 145 },
  { key: "brandModel", label: "Brand / Model", width: 155 },
  { key: "location", label: "Location", width: 95, align: "text-center" },
  { key: "warrantyExpiry", label: "Warranty Expiry", width: 120, align: "text-center" },
  { key: "assetTag", label: "Asset Tag", width: 160 },
  { key: "poQty", label: "PO Balance", width: 100, align: "text-right" },
  { key: "rcCode", label: "RC Code", width: 100, align: "text-center" },
];

const serialBreakdownColumns = [
  { key: "ln", label: "LN", width: 48, align: "text-center" },
  { key: "acqCost", label: "Acq Cost", width: 120, align: "text-right" },
  { key: "groupId", label: "Group ID", width: 140 },
  { key: "serialGroupId", label: "Serial Group ID", width: 150 },
  { key: "empNo", label: "Emp No.", width: 120 },
  { key: "serialNo", label: "Serial No.", width: 145 },
  { key: "assetTag", label: "Asset Tag (Preview)", width: 170 },
  { key: "assignedTo", label: "Assigned To (Employee)", width: 210 },
  { key: "rcCode", label: "Assigned To (Department)", width: 160, align: "text-center" },
  { key: "location", label: "Location", width: 120, align: "text-center" },
];

const calculateAcqCost = (row, overrides = {}) => {
  const nextRow = { ...row, ...overrides };
  const netAmount = parseFormattedNumber(nextRow.netAmount || 0);
  const rrQuantity = parseFormattedNumber(nextRow.receivedQty || 0);
  if (!rrQuantity) return "0.00";
  return formatNumber(netAmount / rrQuantity);
};

const getLookupValue = (row, keys, fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const FARR = () => {
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    refsLoaded,
    getAllTopHSDocRow,
    getReplacementVatRow,
    getAllTopVatAmount,
  } = useAuth();
  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const docType = "FARR";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide[docType] || "";
  const videoLink = docTypeVideoGuide[docType] || "";
  const documentTitle = `${hsDoc?.docName || "Fixed Assets Receiving"} Transaction`;
  const [topTab, setTopTab] = useState("details");
  const [activeTab, setActiveTab] = useState("basic");
  const [detailTab, setDetailTab] = useState("itemDetails");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [selectedSerialRowIndex, setSelectedSerialRowIndex] = useState(null);
  const [showAddTypeDropdown, setShowAddTypeDropdown] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isViewDocument, setIsViewDocument] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  const [glRows, setGlRows] = useState([]);
  const [serialRows, setSerialRows] = useState([]);
  const [editingSupplementIndex, setEditingSupplementIndex] = useState(null);
  const itemDetailsRef = useRef(null);
  const addTypeDropdownRef = useRef(null);

  const [state, setState] = useState({
    branchCode: currentUserRow?.branchCode || "HO",
    branchName: currentUserRow?.branchName || "HO - Head Office",
    farrNo: "",
    farrDate: useGetCurrentDayV2(),
    documentStatus: "",
    status: "OPEN",
    noReprints: "0",
    userCode: currentUserRow?.userCode || "",
    documentID: "",
    PayeeCode: "",
    PayeeName: "",
    PayeeVatCode: "",
    PayeeVatName: "",
    rrType: "FARR01",
    farrTypes: [],
    referenceNo: "",
    siNo: "",
    siDate: "",
    currCode: companyInfo?.currCode || "USD",
    currRate: "1.000000",
    glCurrMode: companyInfo?.glCurrMode || "",
    glCurrDefault: companyInfo?.currCode || "USD",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal2: companyInfo?.glCurrGlobal2 || "",
    glCurrGlobal3: companyInfo?.glCurrGlobal3 || "",
    remarks: "",
    warrantyStartDate: "",
    warrantyExpiryDate: "",
    warrantyMonths: "",
    warrantyNotes: "",
    accountModalSource: null,
    branchModalOpen: false,
    payeeModalOpen: false,
    showAccountModal: false,
    showRcModal: false,
    showVatModal: false,
    showAtcModal: false,
    showSlModal: false,
    showFaCategoryModal: false,
    showFaClassModal: false,
    showFaLocModal: false,
    itemLookupModalOpen: false,
    itemLookupEndPoint: "getInvLookupMS",
    selectedDocType: "FARR",
    poLookupModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showAllTranDocNo: false,
    isLoading: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,
  });

  const selectedRow = detailRows[selectedRowIndex] || detailRows[0] || {};
  const isSupplementEditing = editingSupplementIndex === selectedRowIndex;
  const displayStatus = (state.status || "OPEN").toUpperCase();
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isViewDocumentUrl = isViewDocument;
  const isFormDisabled = isViewDocumentUrl || ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);

  const glColumns = [
    { key: "ln", label: "LN", width: 56, align: "text-center" },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "debit", label: `Debit (${state.glCurrDefault})`, width: 140, align: "text-right" },
    { key: "credit", label: `Credit (${state.glCurrDefault})`, width: 140, align: "text-right" },
    ...(state.withCurr2
      ? [
          { key: "debitFx1", label: `Debit (${state.withCurr3 ? state.glCurrGlobal2 : state.currCode})`, width: 140, align: "text-right" },
          { key: "creditFx1", label: `Credit (${state.withCurr3 ? state.glCurrGlobal2 : state.currCode})`, width: 140, align: "text-right" },
        ]
      : []),
    ...(state.withCurr3
      ? [
          { key: "debitFx2", label: `Debit (${state.glCurrGlobal3})`, width: 140, align: "text-right" },
          { key: "creditFx2", label: `Credit (${state.glCurrGlobal3})`, width: 140, align: "text-right" },
        ]
      : []),
    { key: "slRefNo", label: "SL Ref. No.", width: 120 },
    { key: "slRefDate", label: "SL Ref. Date", width: 120 },
    { key: "remarks", label: "Remarks", width: 140 },
  ];

  const {
    getColumnStyle: getFarrDetailColumnStyle,
    getFrozenColumnStyle: getFarrDetailFrozenStyle,
    getOrderedColumns: getOrderedFarrDetailColumns,
    getSortedRows: getSortedFarrDetailRows,
    setHiddenColumnKeys: setFarrDetailHiddenColumnKeys,
    clearAllSorting: clearFarrDetailSorting,
    clearZeroValueOnFocus: clearFarrDetailZeroOnFocus,
    focusNextRowInput: focusNextFarrDetailRowInput,
    renderHeaderContextMenu: renderFarrDetailHeaderContextMenu,
    renderResizableHeader: renderFarrDetailHeader,
  } = useResizableTableColumns(assetDetailColumns);
  const orderedFarrDetailColumns = getOrderedFarrDetailColumns(assetDetailColumns);
  const getFarrDetailFallbackWidth = (key) =>
    assetDetailColumns.find((column) => column.key === key)?.width || 120;
  const getFarrDetailCellStyle = (key, fallbackWidth) => ({
    ...getFarrDetailColumnStyle(key, fallbackWidth),
    ...getFarrDetailFrozenStyle(key, orderedFarrDetailColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  const sortedFarrDetailRows = getSortedFarrDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  useEffect(() => {
    const hiddenColumns = ["poId", "groupId", "acqCost", "categCode", "classCode"];
    if (String(state.rrType || "").toUpperCase() === "FARR02") {
      hiddenColumns.push("poNo", "rcCode", "poQty");
    }
    setFarrDetailHiddenColumnKeys(hiddenColumns);
  }, [setFarrDetailHiddenColumnKeys, state.rrType]);

  const {
    getColumnStyle: getFarrSerialColumnStyle,
    getFrozenColumnStyle: getFarrSerialFrozenStyle,
    getOrderedColumns: getOrderedFarrSerialColumns,
    getSortedRows: getSortedFarrSerialRows,
    setHiddenColumnKeys: setFarrSerialHiddenColumnKeys,
    clearZeroValueOnFocus: clearFarrSerialZeroOnFocus,
    focusNextRowInput: focusNextFarrSerialRowInput,
    renderHeaderContextMenu: renderFarrSerialHeaderContextMenu,
    renderResizableHeader: renderFarrSerialHeader,
  } = useResizableTableColumns(serialBreakdownColumns);
  const orderedFarrSerialColumns = getOrderedFarrSerialColumns(serialBreakdownColumns);
  const getFarrSerialFallbackWidth = (key) =>
    serialBreakdownColumns.find((column) => column.key === key)?.width || 120;
  const getFarrSerialCellStyle = (key, fallbackWidth) => ({
    ...getFarrSerialColumnStyle(key, fallbackWidth),
    ...getFarrSerialFrozenStyle(key, orderedFarrSerialColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  const sortedFarrSerialRows = getSortedFarrSerialRows(
    serialRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  useEffect(() => {
    setFarrSerialHiddenColumnKeys(["acqCost", "groupId", "serialGroupId", "empNo"]);
  }, [setFarrSerialHiddenColumnKeys]);

  const {
    getColumnStyle: getFarrGlColumnStyle,
    getFrozenColumnStyle: getFarrGlFrozenStyle,
    getOrderedColumns: getOrderedFarrGlColumns,
    getSortedRows: getSortedFarrGlRows,
    setColumnOrder: setFarrGlColumnOrder,
    clearAllSorting: clearFarrGlSorting,
    clearZeroValueOnFocus: clearFarrGlZeroOnFocus,
    focusNextRowInput: focusNextFarrGlRowInput,
    renderHeaderContextMenu: renderFarrGlHeaderContextMenu,
    renderResizableHeader: renderFarrGlHeader,
  } = useResizableTableColumns(glColumns);
  const orderedFarrGlColumns = getOrderedFarrGlColumns(glColumns);
  const getFarrGlFallbackWidth = (key) =>
    glColumns.find((column) => column.key === key)?.width || 120;
  const getFarrGlCellStyle = (key, fallbackWidth) => ({
    ...getFarrGlColumnStyle(key, fallbackWidth),
    ...getFarrGlFrozenStyle(key, orderedFarrGlColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setFarrGlColumnOrder(glColumns.map((column) => column.key));
  }, [
    setFarrGlColumnOrder,
    state.withCurr2,
    state.withCurr3,
    state.glCurrDefault,
    state.currCode,
    state.glCurrGlobal2,
    state.glCurrGlobal3,
  ]);
  const sortedFarrGlRows = getSortedFarrGlRows(
    glRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const farrDetailEnterNextRowZeroClearFields = [
    "receivedQty",
    "unitCost",
    "amount",
    "vatRate",
    "vatAmount",
    "netAmount",
    "poQty",
  ];
  const farrGlEnterNextRowZeroClearFields = [
    "debit",
    "credit",
    "debitFx1",
    "creditFx1",
    "debitFx2",
    "creditFx2",
  ];

  const totals = useMemo(() => {
    const totalQty = detailRows.reduce((sum, row) => sum + parseFormattedNumber(row.receivedQty || 0), 0);
    const totalAmount = detailRows.reduce((sum, row) => sum + parseFormattedNumber(row.amount || 0), 0);
    return {
      totalQty,
      totalAmount: formatNumber(totalAmount),
    };
  }, [detailRows]);

  const glTotals = useMemo(() => {
    const sumField = (field) =>
      glRows.reduce((sum, row) => sum + (parseFormattedNumber(row[field]) || 0), 0);
    return {
      totalDebit: formatNumber(sumField("debit")),
      totalCredit: formatNumber(sumField("credit")),
      totalDebitFx1: formatNumber(sumField("debitFx1")),
      totalCreditFx1: formatNumber(sumField("creditFx1")),
      totalDebitFx2: formatNumber(sumField("debitFx2")),
      totalCreditFx2: formatNumber(sumField("creditFx2")),
    };
  }, [glRows]);

  const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));

  useEffect(() => {
    if (!showAddTypeDropdown) return;

    const handleClickOutside = (event) => {
      if (addTypeDropdownRef.current?.contains(event.target)) return;
      setShowAddTypeDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddTypeDropdown]);

  useEffect(() => {
    if (!refsLoaded) return;
    const filteredTypes = getAllDropDown?.("FARRTRAN_TYPE", docType) || [];
    updateState({
      farrTypes: filteredTypes,
      rrType: state.rrType || filteredTypes[0]?.DROPDOWN_CODE || "FARR01",
    });
  }, [docType, getAllDropDown, refsLoaded]);

  const buildTransactionPayload = (nextGlRows = glRows) => ({
    branchCode: state.branchCode || "",
    farrNo: state.farrNo || "",
    farrId: state.documentID || "",
    farrDate: state.farrDate || "",
    vendCode: state.PayeeCode || "",
    vendName: state.PayeeName || "",
    rrType: state.rrType || "FARR01",
    farrTranType: state.rrType || "FARR01",
    referenceNo: state.referenceNo || "",
    siNo: state.siNo || "",
    siDate: state.siDate || "",
    currCode: state.currCode || companyInfo?.currCode || "PHP",
    currRate: parseFormattedNumber(state.currRate || 1),
    remarks: state.remarks || "",
    userCode: state.userCode || currentUserRow?.userCode || "",
    dt1: detailRows.map((row, index) => ({
      lnNo: String(index + 1),
      poId: row.poId || "",
      groupId: row.groupId || "",
      poNo: row.poNo || "",
      itemCode: row.itemCode || "",
      assetDescription: row.assetDescription || "",
      remarks: row.remarks || "",
      rcCode: row.rcCode || "",
      poQty: parseFormattedNumber(row.poQty || 0),
      receivedQty: parseFormattedNumber(row.receivedQty || 0),
      unit: row.unit || "",
      unitCost: parseFormattedNumber(row.unitCost || 0),
      amount: parseFormattedNumber(row.amount || 0),
      vatCode: row.vat || row.vatCode || "",
      atcCode: row.atcCode || "",
      atcName: row.atcName || "",
      vatRate: parseFormattedNumber(row.vatRate || 0),
      vatAmount: parseFormattedNumber(row.vatAmount || 0),
      netAmount: parseFormattedNumber(row.netAmount || 0),
      acqCost: parseFormattedNumber(row.acqCost || calculateAcqCost(row)),
      categCode: row.categCode || "",
      categName: row.categName || row.assetCategory || "",
      classCode: row.classCode || "",
      className: row.className || row.assetSubCategory || "",
      assetCategory: row.categName || row.assetCategory || "",
      assetSubCategory: row.className || row.assetSubCategory || "",
      usefulLife: row.usefulLife || "",
      serialNo: row.serialNo || "",
      brandModel: row.brandModel || "",
      location: row.location || "",
      warrantyExpiry: row.warrantyExpiry || "",
      assetTag: row.assetTag || "",
    })),
    dt2: nextGlRows.map((entry, index) => ({
      recNo: String(index + 1),
      acctCode: entry.acctCode || "",
      rcCode: entry.rcCode || "",
      sltypeCode: entry.sltypeCode || "",
      slCode: entry.slCode || "",
      particular: entry.particular || "",
      vatCode: entry.vatCode || "",
      vatName: entry.vatName || "",
      atcCode: entry.atcCode || "",
      atcName: entry.atcName || "",
      debit: parseFormattedNumber(entry.debit || 0),
      credit: parseFormattedNumber(entry.credit || 0),
      debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
      creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
      debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
      creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
      slRefNo: entry.slRefNo || "",
      slRefDate: entry.slRefDate || null,
      remarks: entry.remarks || "",
      dt1Lineno: entry.dt1Lineno || "",
    })),
    dt3: serialRows.map((row, index) => ({
      recNo: String(index + 1),
      lnNo: String(index + 1),
      empNo: row.empNo || "",
      empCode: row.empCode || row.empNo || "",
      groupId: row.groupId || "",
      serialGroupId: row.serialGroupId || "",
      acqCost: parseFormattedNumber(row.acqCost || 0),
      serialNo: row.serialNo || "",
      assetTag: row.assetTag || "",
      assignedTo: row.assignedTo || "",
      rcCode: row.rcCode || "",
      location: row.location || "",
    })),
  });

  const applyFetchedTransaction = useCallback((data) => {
    const retrievedDetailRows = (data.dt1 || []).map((item) => ({
      ...item,
      poId: item.poId || "",
      groupId: item.groupId || "",
      poNo: item.poNo || "",
      itemCode: item.itemCode || "",
      assetDescription: item.assetDescription || "",
      remarks: item.remarks || "",
      rcCode: item.rcCode || "",
      poQty: formatNumber(item.poQty || 0),
      receivedQty: formatNumber(item.receivedQty || 0),
      unit: item.unit || "",
      unitCost: formatNumber(item.unitCost || 0),
      amount: formatNumber(item.amount || 0),
      vat: item.vat || item.vatCode || "",
      atcCode: item.atcCode || "",
      atcName: item.atcName || "",
      vatRate: formatNumber(item.vatRate || 0),
      vatAmount: formatNumber(item.vatAmount || 0),
      netAmount: formatNumber(item.netAmount || 0),
      acqCost: formatNumber(item.acqCost || (item.receivedQty ? (Number(item.netAmount || 0) / Number(item.receivedQty || 1)) : 0)),
      categCode: item.categCode || "",
      categName: item.categName || item.assetCategory || "",
      classCode: item.classCode || "",
      className: item.className || item.assetSubCategory || "",
      assetCategory: item.categName || item.assetCategory || "",
      assetSubCategory: item.className || item.assetSubCategory || "",
      usefulLife: item.usefulLife || "",
      serialNo: item.serialNo || "",
      brandModel: item.brandModel || "",
      location: item.location || "",
      warrantyExpiry: useformatToDatev2(item.warrantyExpiry || ""),
      assetTag: item.assetTag || "",
    }));

    const formattedGlRows = (data.dt2 || []).map((glRow) => ({
      ...glRow,
      debit: formatNumber(glRow.debit || 0),
      credit: formatNumber(glRow.credit || 0),
      debitFx1: formatNumber(glRow.debitFx1 || 0),
      creditFx1: formatNumber(glRow.creditFx1 || 0),
      debitFx2: formatNumber(glRow.debitFx2 || 0),
      creditFx2: formatNumber(glRow.creditFx2 || 0),
      slRefDate: useformatToDatev2(glRow.slRefDate || ""),
    }));

    const retrievedSerialRows = (data.dt3 || data.serialRows || []).map((row) => ({
      ...row,
      empNo: row.empNo || "",
      empCode: row.empCode || row.empNo || "",
      groupId: row.groupId || "",
      serialGroupId: row.serialGroupId || "",
      acqCost: formatNumber(row.acqCost || 0),
      serialNo: row.serialNo || "",
      assetTag: row.assetTag || "",
      assignedTo: row.assignedTo || "",
      rcCode: row.rcCode || "",
      location: row.location || "",
    }));

    updateState({
      documentStatus: data.farrStatus || data.documentStatus || "",
      status: data.docStatus || data.status || "OPEN",
      noReprints: data.noReprints || "0",
      documentID: data.farrId || data.documentID || "",
      farrNo: data.farrNo || data.documentNo || "",
      branchCode: data.branchCode || "",
      branchName: data.branchName || "",
      farrDate: useformatToDatev2(data.farrDate || data.documentDate || ""),
      PayeeCode: data.vendCode || data.PayeeCode || data.payeeCode || "",
      PayeeName: data.vendName || data.PayeeName || data.payeeName || "",
      rrType: data.rrType || data.farrTranType || "FARR01",
      referenceNo: data.referenceNo || "",
      siNo: data.siNo || "",
      siDate: useformatToDatev2(data.siDate || ""),
      currCode: data.currCode || companyInfo?.currCode || "PHP",
      currRate: formatNumber(data.currRate || 1, 6),
      remarks: data.remarks || "",
      isDocNoDisabled: true,
      isFetchDisabled: true,
    });
    setDetailRows(retrievedDetailRows);
    setGlRows(formattedGlRows);
    setSerialRows(retrievedSerialRows);
  }, [companyInfo?.currCode]);

  const fetchTranData = useCallback(
    async (documentNo, branchCode, direction = "") => {
      updateState({ isLoading: true });
      try {
        const data = await useFetchTranData(documentNo, branchCode, docType, "farrNo", direction);

        if (!data?.farrId && !data?.documentID) {
          Swal.fire({ icon: "info", title: "No Records Found", text: "Transaction does not exist." });
          updateState({ farrNo: "", documentID: "", isDocNoDisabled: false, isFetchDisabled: false });
          return;
        }

        applyFetchedTransaction(data);
      } catch (error) {
        console.error("Error fetching FARR transaction:", error);
      } finally {
        updateState({ isLoading: false });
      }
    },
    [applyFetchedTransaction, docType]
  );

  const sampleAlert = (title) => {
    Swal.fire({
      icon: "info",
      title,
      text: "Sample data only for Fixed Assets Receiving screen design.",
      confirmButtonColor: "#0f4fa8",
    });
  };

  const handleActivityOption = async (action) => {
    if ((detailRows?.length || 0) + (glRows?.length || 0) === 0) return;
    if (state.documentStatus !== "") return;

    updateState({ isLoading: true });
    try {
      let finalGlRows = [...glRows];

      if (action === "GenerateGL") {
        const newGlEntries = await useGenerateGLEntries(docType, buildTransactionPayload([]));
        setGlRows(Array.isArray(newGlEntries) ? newGlEntries : []);
        return;
      }

      if (action === "Upsert") {
        if (finalGlRows.length === 0) {
          const newGlEntries = await useGenerateGLEntries(docType, buildTransactionPayload([]));
          if (!newGlEntries || newGlEntries.length === 0) {
            console.warn("GL entries generation failed or returned no data.");
            return;
          }
          finalGlRows = newGlEntries;
          setGlRows(newGlEntries);
        }

        const response = await useTransactionUpsert(
          docType,
          buildTransactionPayload(finalGlRows),
          updateState,
          "farrId",
          "farrNo"
        );

        if (response) {
          const responseDocNo = response.data?.[0]?.farrNo || state.farrNo;
          const responseDocId = response.data?.[0]?.farrId || state.documentID;
          updateState({
            farrNo: responseDocNo,
            documentID: responseDocId,
            isDocNoDisabled: true,
            isFetchDisabled: true,
          });
          await fetchTranData(responseDocNo, state.branchCode);
          useSwalshowSaveSuccessDialog(handleReset, () => handleSaveAndPrint(responseDocId));
        }
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleSave = () => handleActivityOption("Upsert");
  const handlePrint = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (state.documentID) await handleSaveAndPrint(state.documentID);
  };
  const handlePost = () => sampleAlert("Post FARR");
  const handleReset = () => {
    clearFarrDetailSorting();
    clearFarrGlSorting();
    setShowSpinner(true);
    setTimeout(() => {
      setDetailRows([]);
      setGlRows([]);
      setSerialRows([]);
      setSelectedRowIndex(0);
      updateState({
        branchCode: currentUserRow?.branchCode || "HO",
        branchName: currentUserRow?.branchName || "HO - Head Office",
        userCode: currentUserRow?.userCode || "",
        farrNo: "",
        farrDate: useGetCurrentDayV2(),
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        noReprints: "0",
        rrType: "FARR01",
        PayeeCode: "",
        PayeeName: "",
        PayeeVatCode: "",
        PayeeVatName: "",
        referenceNo: "",
        siNo: "",
        siDate: "",
        currCode: companyInfo?.currCode || "",
        currRate: formatNumber(companyInfo?.currRate || 1, 6),
        remarks: "",
        warrantyStartDate: "",
        warrantyExpiryDate: "",
        warrantyMonths: "",
        warrantyNotes: "",
        isDocNoDisabled: false,
        isSaveDisabled: false,
        isResetDisabled: false,
        isFetchDisabled: false,
      });
      setShowSpinner(false);
    }, 250);
  };

  const createAssetDetailRow = (overrides = {}) => {
    const row = {
      poId: "",
      groupId: "",
      poNo: "",
      itemCode: "",
      assetDescription: "",
      remarks: "",
      rcCode: "",
      poQty: "0.00",
      receivedQty: "0.00",
      unit: "",
      unitCost: "0.00",
      amount: "0.00",
      vat: "",
      vatRate: "0.00",
      vatAmount: "0.00",
      netAmount: "0.00",
      acqCost: "0.00",
      categCode: "",
      categName: "",
      classCode: "",
      className: "",
      assetCategory: "",
      assetSubCategory: "",
      serialNo: "",
      brandModel: "",
      usefulLife: "",
      location: "",
      warrantyExpiry: "",
      assetTag: "",
      ...overrides,
    };

    return {
      ...row,
      acqCost: row.acqCost || calculateAcqCost(row),
    };
  };

  const getItemLookupConfig = () => ({
    invType: "MS",
    endpoint: "getInvLookupMS",
    docType: "PRMS",
  });

  const getPayeeVatDefaults = async (payeeCode) => {
    const selectedPayeeCode = String(payeeCode || state.PayeeCode || "").trim();
    if (!selectedPayeeCode) {
      return {
        vatCode: state.PayeeVatCode || "",
        vatName: state.PayeeVatName || "",
        vatRate: 0,
      };
    }

    const payeeRow = await useTopPayeeRow(selectedPayeeCode);
    const replacementVat = getReplacementVatRow?.(payeeRow?.vatCode || "", "I", "S", "G");

    return {
      vatCode: replacementVat?.vatCode || payeeRow?.vatCode || state.PayeeVatCode || "",
      vatName: replacementVat?.vatName || payeeRow?.vatName || state.PayeeVatName || "",
      vatRate: parseFormattedNumber(replacementVat?.vatRate ?? 0),
    };
  };

  const handleOpenItemLookup = () => {
    const { endpoint, docType: lookupDocType } = getItemLookupConfig();
    updateState({
      itemLookupEndPoint: endpoint,
      selectedDocType: "FARR",
      itemLookupModalOpen: true,
    });
  };

  const handleOpenAddItemLookup = () => {
    setShowAddTypeDropdown(false);
    if (String(state.rrType || "").toUpperCase() !== "FARR02") return;

    if (!String(state.PayeeCode || "").trim()) {
      updateState({ payeeModalOpen: true, accountModalSource: "addItemAfterPayee" });
      return;
    }

    handleOpenItemLookup();
  };

  const handleCloseItemLookup = async (selectedItems) => {
    if (!selectedItems) {
      updateState({ itemLookupModalOpen: false });
      return;
    }

    const itemsArray = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : selectedItems.records
        ? [selectedItems.records]
        : [];

    if (itemsArray.length === 0) {
      updateState({ itemLookupModalOpen: false });
      return;
    }

    const payeeVat = await getPayeeVatDefaults();
    const newRows = itemsArray.map((item) => {
      const unitCost = parseFormattedNumber(getLookupValue(item, ["unitCost", "UnitCost", "cost"], 0));
      return recalcAssetDetailRow(createAssetDetailRow({
        groupId: getLookupValue(item, ["groupId", "GroupId"], ""),
        itemCode: getLookupValue(item, ["itemCode", "ItemCode"], ""),
        assetDescription: getLookupValue(item, ["itemName", "ItemName", "itemDescription", "ItemDescription"], ""),
        unit: getLookupValue(item, ["uomCode", "UomCode", "unit"], ""),
        unitCost: formatNumber(unitCost),
        amount: "0.00",
        vat: payeeVat.vatCode,
        vatName: payeeVat.vatName,
        vatRate: formatNumber(payeeVat.vatRate),
        vatAmount: "0.00",
        netAmount: "0.00",
        categCode: "",
        categName: "",
        classCode: "",
        className: "",
        assetCategory: "",
        assetSubCategory: "",
      }));
    });

    setDetailRows((prev) => [...prev, ...newRows]);
    updateState({ itemLookupModalOpen: false });
  };

  const handleOpenPOLookup = () => {
    setShowAddTypeDropdown(false);
    if (String(state.rrType || "").toUpperCase() !== "FARR01") return;
    updateState({ poLookupModalOpen: true });
  };

  const handleClosePOOpenModal = (selection) => {
    if (!selection || !Array.isArray(selection.details) || selection.details.length === 0) {
      updateState({ poLookupModalOpen: false });
      return;
    }

    const header = selection.header || {};
    const newRows = selection.details.map((item) => {
      const poQty = parseFormattedNumber(getLookupValue(item, ["BalanceQty", "PoBalance", "POBalance", "QtyBalance", "poQty", "PoQty", "Quantity"], 0));
      const receivedQty = poQty > 0 ? poQty : parseFormattedNumber(getLookupValue(item, ["RrQty", "RRQty", "receivedQty"], 0));
      const unitCost = parseFormattedNumber(getLookupValue(item, ["UnitCost", "unitCost", "Cost"], 0));
      const amount = receivedQty * unitCost;

      return recalcAssetDetailRow(createAssetDetailRow({
        poId: getLookupValue(item, ["PoId", "poId"], getLookupValue(header, ["PoId", "poId"], "")),
        groupId: getLookupValue(item, ["GroupId", "groupId"], ""),
        poNo: getLookupValue(item, ["PoNo", "poNo"], getLookupValue(header, ["PoNo", "poNo"], "")),
        itemCode: getLookupValue(item, ["ItemCode", "itemCode"], ""),
        assetDescription: getLookupValue(item, ["ItemName", "itemName", "ItemDesc", "itemDescription"], ""),
        remarks: getLookupValue(item, ["Particulars", "particulars", "Remarks", "remarks"], ""),
        rcCode: getLookupValue(item, ["RcCode", "rcCode"], getLookupValue(header, ["RcCode", "rcCode"], "")),
        poQty: formatNumber(poQty),
        receivedQty: formatNumber(receivedQty),
        unit: getLookupValue(item, ["UomCode", "uomCode", "Unit", "unit"], ""),
        unitCost: formatNumber(unitCost),
        amount: formatNumber(amount),
        vat: getLookupValue(item, ["VatCode", "vatCode", "VATCode"], ""),
        vatRate: formatNumber(getLookupValue(item, ["VatRate", "vatRate"], 0)),
        categCode: getLookupValue(item, ["CategCode", "categCode"], ""),
        categName: getLookupValue(item, ["CategName", "categName"], ""),
        classCode: getLookupValue(item, ["ClassCode", "classCode"], ""),
        className: getLookupValue(item, ["ClassName", "className"], ""),
        assetCategory: getLookupValue(item, ["CategName", "categName"], ""),
        assetSubCategory: getLookupValue(item, ["ClassName", "className"], ""),
      }));
    });

    setDetailRows((prev) => [...prev, ...newRows]);
    updateState({
      poLookupModalOpen: false,
      PayeeCode: state.PayeeCode || getLookupValue(header, ["VendCode", "vendCode"], ""),
      PayeeName: state.PayeeName || getLookupValue(header, ["VendName", "vendName"], ""),
    });
  };

  const handleAddRow = () => {
    if (isFormDisabled) return;
    setShowAddTypeDropdown((prev) => !prev);
  };

  const handleDeleteRow = (index) => {
    setDetailRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    setSelectedRowIndex((prev) => Math.max(0, Math.min(prev, detailRows.length - 2)));
  };

  const handleAddRowGL = (index = null) => {
    const newRow = {
      acctCode: "",
      acctName: "",
      rcCode: "",
      sltypeCode: "VE",
      slCode: "",
      particular: "",
      vatCode: "",
      vatName: "",
      atcCode: "",
      atcName: "",
      debit: "0.00",
      credit: "0.00",
      debitFx1: "0.00",
      creditFx1: "0.00",
      debitFx2: "0.00",
      creditFx2: "0.00",
      slRefNo: "",
      slRefDate: "",
      remarks: "",
    };

    setGlRows((prev) => {
      const updatedRows = [...prev];
      if (index !== null && index >= 0) {
        updatedRows.splice(index + 1, 0, newRow);
      } else {
        updatedRows.push(newRow);
      }
      return updatedRows;
    });
  };

  const handleDeleteRowGL = (index) => {
    setGlRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const buildSerialRowsFromDetail = (detailRow, existingRows = []) => {
    const receivedQty = Math.max(0, Math.floor(parseFormattedNumber(detailRow?.receivedQty || 0)));
    const netAmount = parseFormattedNumber(detailRow?.netAmount || 0);
    const baseAcqCost = parseFormattedNumber(detailRow?.acqCost || calculateAcqCost(detailRow));
    const groupId = detailRow?.groupId || `${detailRow?.itemCode || "ASSET"}-${Date.now()}`;
    const existingGroupRows = existingRows.filter((row) => row.groupId === groupId);
    const serialGroupId = existingGroupRows[0]?.serialGroupId || `SER-${groupId}`;
    const assetTagBase = String(detailRow?.assetTag || detailRow?.itemCode || "ASSET")
      .split("~")[0]
      .split(",")[0]
      .trim();

    return Array.from({ length: receivedQty }, (_, rowIndex) => {
      const existingRow = existingGroupRows[rowIndex] || {};
      const lineNo = String(rowIndex + 1).padStart(3, "0");
      const rowAcqCost =
        rowIndex === receivedQty - 1
          ? netAmount - baseAcqCost * Math.max(receivedQty - 1, 0)
          : baseAcqCost;
      return {
        empNo: existingRow.empNo || "",
        empCode: existingRow.empCode || existingRow.empNo || "",
        groupId,
        serialGroupId,
        acqCost: formatNumber(rowAcqCost),
        serialNo: existingRow.serialNo || "",
        assetTag: existingRow.assetTag || (assetTagBase ? `${assetTagBase}-${lineNo}` : ""),
        assignedTo: existingRow.assignedTo || "",
        rcCode: existingRow.rcCode || detailRow?.rcCode || "",
        location: existingRow.location || detailRow?.location || "",
      };
    });
  };

  const handleEditSupplement = (index) => {
    const detailRow = detailRows[index] || {};
    setSelectedRowIndex(index);
    setEditingSupplementIndex(index);
    setDetailTab("itemDetails");
    setSerialRows((prev) => buildSerialRowsFromDetail(detailRow, prev));
    setTimeout(() => {
      itemDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const parseDisplayDate = (value) => {
    if (!value) return null;
    const parts = String(value).split("/");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const isWarrantyExpiryValid = (startDate, expiryDate) => {
    const start = parseDisplayDate(startDate);
    const expiry = parseDisplayDate(expiryDate);
    if (!start || !expiry) return true;
    return expiry >= start;
  };

  const handleWarrantyExpiryChange = (updates) => {
    const nextExpiryDate = updates.warrantyExpiryDate || "";
    if (!isWarrantyExpiryValid(state.warrantyStartDate, nextExpiryDate)) {
      updateState({ warrantyExpiryDate: "" });
      Swal.fire({
        icon: "warning",
        title: "Invalid Warranty Expiry",
        text: "Warranty Expiry must not be earlier than Warranty Start Date.",
        confirmButtonColor: "#0f4fa8",
      });
      return;
    }
    updateState({ warrantyExpiryDate: nextExpiryDate });
  };

  const handleApplySupplementChanges = () => {
    if (!isSupplementEditing) return;

    if (!isWarrantyExpiryValid(state.warrantyStartDate, state.warrantyExpiryDate)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Warranty Expiry",
        text: "Warranty Expiry must not be earlier than Warranty Start Date.",
        confirmButtonColor: "#0f4fa8",
      });
      return;
    }

    const serialNo = serialRows.map((row) => row.serialNo).filter(Boolean).join(", ");
    const assetTag = serialRows.map((row) => row.assetTag).filter(Boolean).join(", ");
    const location = [...new Set(serialRows.map((row) => row.location).filter(Boolean))].join(", ");

    setDetailRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === selectedRowIndex
          ? {
              ...row,
              serialNo,
              assetTag,
              location,
              warrantyExpiry: state.warrantyExpiryDate,
            }
          : row
      )
    );
    setEditingSupplementIndex(null);

    Swal.fire({
      icon: "success",
      title: "Asset Details Updated",
      text: "Serial breakdown and warranty information were applied to the selected asset detail.",
      confirmButtonColor: "#0f4fa8",
    });
  };

  const updateDetailRow = (index, updates) => {
    setDetailRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...updates } : item)));
  };

  const recalcAssetDetailRow = (row, overrides = {}) => {
    const nextRow = { ...row, ...overrides };
    const quantity = parseFormattedNumber(nextRow.receivedQty || 0);
    const unitCost = parseFormattedNumber(nextRow.unitCost || 0);
    const amount = quantity * unitCost;
    const vatAmount = nextRow.vat ? getAllTopVatAmount?.(nextRow.vat, amount) || 0 : 0;
    const netAmount = amount - vatAmount;

    return {
      ...nextRow,
      amount: formatNumber(amount),
      vatAmount: formatNumber(vatAmount),
      netAmount: formatNumber(netAmount),
      acqCost: calculateAcqCost(nextRow, { netAmount }),
    };
  };

  const handleDetailModalChange = (index, field, value) => {
    updateDetailRow(index, { [field]: value });
  };

  const updateSerialRow = (index, updates) => {
    setSerialRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...updates } : item)));
  };

  const updateGlRow = (index, updates) => {
    setGlRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...updates } : item)));
  };

  const openDetailLookup = (index, source) => {
    setSelectedRowIndex(index);
    const modalMap = {
      detailVat: "showVatModal",
      detailAtc: "showAtcModal",
      detailRcCode: "showRcModal",
      detailFaCategory: "showFaCategoryModal",
      detailFaClass: "showFaClassModal",
      detailFaLoc: "showFaLocModal",
    };
    updateState({ accountModalSource: source, [modalMap[source]]: true });
  };

  const openSerialLookup = (index, source) => {
    setSelectedSerialRowIndex(index);
    const modalMap = {
      serialAssignedTo: "payeeModalOpen",
      serialRcCode: "showRcModal",
      serialFaLoc: "showFaLocModal",
    };
    updateState({ accountModalSource: source, [modalMap[source]]: true });
  };

  const openGlLookup = (index, source) => {
    setSelectedRowIndex(index);
    const modalMap = {
      acctCode: "showAccountModal",
      rcCode: "showRcModal",
      slCode: "showSlModal",
      vatCode: "showVatModal",
      atcCode: "showAtcModal",
    };
    updateState({ accountModalSource: source, [modalMap[source]]: true });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
        branchCode: selectedBranch.branchCode || "",
        branchName: selectedBranch.branchName || "",
      });
    }
    updateState({ branchModalOpen: false });
  };

  const handleClosePayeeModal = async (selectedPayee) => {
    const shouldOpenItemAfterPayee = state.accountModalSource === "addItemAfterPayee" && selectedPayee;
    if (selectedPayee) {
      if (state.accountModalSource === "serialAssignedTo" && selectedSerialRowIndex !== null) {
        updateSerialRow(selectedSerialRowIndex, {
          empNo: selectedPayee.vendCode || selectedPayee.vend_code || "",
          empCode: selectedPayee.vendCode || selectedPayee.vend_code || "",
          assignedTo: selectedPayee.vendName || selectedPayee.vend_name || "",
        });
      } else {
        const selectedPayeeCode = selectedPayee.vendCode || selectedPayee.vend_code || "";
        const payeeVat = await getPayeeVatDefaults(selectedPayeeCode);
        updateState({
          PayeeCode: selectedPayeeCode,
          PayeeName: selectedPayee.vendName || selectedPayee.vend_name || "",
          PayeeVatCode: payeeVat.vatCode,
          PayeeVatName: payeeVat.vatName,
        });
        setDetailRows((prev) =>
          prev.map((row) =>
            recalcAssetDetailRow(row, {
              vat: payeeVat.vatCode,
              vatName: payeeVat.vatName,
              vatRate: formatNumber(payeeVat.vatRate),
            })
          )
        );
      }
    }
    updateState({ payeeModalOpen: false, accountModalSource: null });
    setSelectedSerialRowIndex(null);
    if (shouldOpenItemAfterPayee) {
      setTimeout(() => handleOpenItemLookup(), 0);
    }
  };

  const handleCloseAccountModal = (selectedAccount) => {
    if (selectedAccount && selectedRowIndex !== null) {
      updateGlRow(selectedRowIndex, {
        acctCode: selectedAccount.acctCode || "",
        acctName: selectedAccount.acctName || "",
      });
    }
    updateState({ showAccountModal: false, accountModalSource: null });
  };

  const handleCloseRcModal = (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      if (state.accountModalSource === "serialRcCode" && selectedSerialRowIndex !== null) {
        updateSerialRow(selectedSerialRowIndex, { rcCode: selectedRc.rcCode || "" });
      } else if (state.accountModalSource === "detailRcCode") {
        updateDetailRow(selectedRowIndex, { rcCode: selectedRc.rcCode || "" });
      } else {
        updateGlRow(selectedRowIndex, { rcCode: selectedRc.rcCode || "" });
      }
    }
    updateState({ showRcModal: false, accountModalSource: null });
    if (state.accountModalSource === "serialRcCode") setSelectedSerialRowIndex(null);
  };

  const handleCloseVatModal = (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const vatUpdates = {
        vatCode: selectedVat.vatCode || "",
        vatName: selectedVat.vatName || "",
      };
      if (state.accountModalSource === "detailVat") {
        const row = detailRows[selectedRowIndex] || {};
        updateDetailRow(selectedRowIndex, recalcAssetDetailRow(row, { vat: vatUpdates.vatCode, vatName: vatUpdates.vatName }));
      } else {
        updateGlRow(selectedRowIndex, vatUpdates);
      }
    }
    updateState({ showVatModal: false, accountModalSource: null });
  };

  const handleCloseAtcModal = (selectedAtc) => {
    if (selectedAtc && selectedRowIndex !== null) {
      const atcUpdates = {
        atcCode: selectedAtc.atcCode || "",
        atcName: selectedAtc.atcName || selectedAtc.atcDesc || "",
      };
      if (state.accountModalSource === "detailAtc") {
        updateDetailRow(selectedRowIndex, atcUpdates);
      } else {
        updateGlRow(selectedRowIndex, atcUpdates);
      }
    }
    updateState({ showAtcModal: false, accountModalSource: null });
  };

  const handleCloseSlModal = (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      updateGlRow(selectedRowIndex, {
        sltypeCode: selectedSl.sltypeCode || selectedSl.slTypeCode || selectedSl.sltype_code || "",
        slCode: selectedSl.slCode || selectedSl.sl_code || "",
      });
    }
    updateState({ showSlModal: false, accountModalSource: null });
  };

  const handleCloseFaCategoryModal = (selectedCategory) => {
    if (selectedCategory && selectedRowIndex !== null) {
      updateDetailRow(selectedRowIndex, {
        categCode: selectedCategory.code || "",
        categName: selectedCategory.description || selectedCategory.code || "",
        assetCategory: selectedCategory.description || selectedCategory.code || "",
      });
    }
    updateState({ showFaCategoryModal: false, accountModalSource: null });
  };

  const handleCloseFaClassModal = (selectedClass) => {
    if (selectedClass && selectedRowIndex !== null) {
      updateDetailRow(selectedRowIndex, {
        classCode: selectedClass.code || "",
        className: selectedClass.description || selectedClass.code || "",
        categCode: selectedClass.categCode || detailRows[selectedRowIndex]?.categCode || "",
        assetSubCategory: selectedClass.description || selectedClass.code || "",
      });
    }
    updateState({ showFaClassModal: false, accountModalSource: null });
  };

  const handleCloseFaLocModal = (selectedLocation) => {
    const isSerialLookup = state.accountModalSource === "serialFaLoc";
    const targetRowIndex = isSerialLookup ? selectedSerialRowIndex : selectedRowIndex;

    if (selectedLocation && targetRowIndex !== null) {
      const locCode = selectedLocation.code || selectedLocation.description || "";
      if (isSerialLookup) {
        updateSerialRow(targetRowIndex, { location: locCode });
      } else {
        updateDetailRow(targetRowIndex, { location: locCode });
      }
    }
    updateState({ showFaLocModal: false, accountModalSource: null });
    if (isSerialLookup) setSelectedSerialRowIndex(null);
  };

  const handleCancel = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (state.documentID && state.documentStatus === "") {
      updateState({ showCancelModal: true });
    }
  };

  const handleAttach = async () => {
    if (state.documentID) {
      updateState({ showAttachModal: true });
    }
  };

  const handleCopy = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (!state.documentID) return;

    updateState({
      farrNo: "",
      documentID: "",
      documentStatus: "",
      status: "OPEN",
      farrDate: useGetCurrentDayV2(),
      noReprints: "0",
    });
    setGlRows((prev) =>
      prev.map((row) => ({
        ...row,
        slRefNo: "",
        slRefDate: "",
      }))
    );
  };

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, state.branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };

  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, farrNo: data.docNo });
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && state.documentStatus !== "OPEN" && state.documentID !== null) {
      const result = await useHandleCancel(
        docType,
        state.documentID,
        currentUserRow?.userCode,
        confirmation.password,
        confirmation.reason,
        updateState
      );
      if (result.success) {
        useSwalSuccessAlert("Success", "Cancellation Completed");
      }
      await fetchTranData(state.farrNo, state.branchCode);
    }
    updateState({ showCancelModal: false });
  };

  const handleSaveAndPrint = async (documentID) => {
    setShowSpinner(true);
    await useHandlePrint(documentID, docType);
    setShowSpinner(false);
  };

  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", window.location.origin);
  }, []);

  const handleHistoryRowPick = useCallback(
    async (row) => {
      const docNo = row?.docNo;
      const pickedBranchCode = row?.branchCode;
      if (!docNo || !pickedBranchCode) return;

      await fetchTranData(docNo, pickedBranchCode);
      setTopTab("details");
      cleanUrl();
    },
    [fetchTranData, cleanUrl]
  );

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("farrNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const printData = {
    farr_no: state.farrNo,
    branch: state.branchCode,
    doc_id: docType,
  };

  const renderAssetCell = (columnKey, row, index) => {
    const columnWidth = getFarrDetailFallbackWidth(columnKey);
    const columnMeta = assetDetailColumns.find((column) => column.key === columnKey) || {};
    const style = getFarrDetailCellStyle(columnKey, columnWidth);
    const alignClass = columnMeta.align || "text-left";

    const focusNextDetailCell = (field) => {
      focusNextFarrDetailRowInput(index, field, {
        rows: detailRows,
        zeroClearFields: farrDetailEnterNextRowZeroClearFields,
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) => updateDetailRow(nextIndex, { [nextField]: value }),
      });
    };

    const handleDetailInputChange = (field, value) => {
      if (field === "receivedQty") {
        const sanitizedValue = value.replace(/[^0-9.]/g, "");
        if (!/^\d*\.?\d{0,2}$/.test(sanitizedValue) && sanitizedValue !== "") return;

        const hasPoNo = String(row.poNo || "").trim() !== "";
        const poBalance = parseFormattedNumber(row.poQty || 0);
        const receivedQty = parseFormattedNumber(sanitizedValue || 0);
        const boundedQty = hasPoNo
          ? Math.min(Math.max(receivedQty, 0), Math.max(poBalance, 0))
          : Math.max(receivedQty, 0);
        const nextReceivedQty =
          sanitizedValue === "" ? "" : hasPoNo && receivedQty > poBalance ? formatNumber(boundedQty) : sanitizedValue;
        updateDetailRow(index, recalcAssetDetailRow(row, { receivedQty: nextReceivedQty }));
        return;
      }

      if (field === "unitCost") {
        const sanitizedValue = value.replace(/[^0-9.]/g, "");
        if (!/^\d*\.?\d{0,2}$/.test(sanitizedValue) && sanitizedValue !== "") return;
        updateDetailRow(index, recalcAssetDetailRow(row, { unitCost: sanitizedValue }));
        return;
      }

      updateDetailRow(index, { [field]: value });
    };

    const formatDetailInputValue = (field, value) => {
      if (field === "unitCost") {
        updateDetailRow(index, recalcAssetDetailRow(row, { unitCost: formatNumber(parseFormattedNumber(value || 0)) }));
        return true;
      }

      if (field === "receivedQty") {
        const hasPoNo = String(row.poNo || "").trim() !== "";
        const poBalance = parseFormattedNumber(row.poQty || 0);
        const receivedQty = parseFormattedNumber(value || 0);
        const nextReceivedQty = formatNumber(
          hasPoNo ? Math.min(Math.max(receivedQty, 0), Math.max(poBalance, 0)) : Math.max(receivedQty, 0)
        );
        updateDetailRow(index, recalcAssetDetailRow(row, { receivedQty: nextReceivedQty }));
        return true;
      }

      return false;
    };

    const detailInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || alignClass}`.trim()}
        value={row[field] || ""}
        readOnly={options.readOnly ?? isFormDisabled}
        onChange={(e) => handleDetailInputChange(field, e.target.value)}
        onBlur={(e) => {
          if (isFormDisabled || options.readOnly) return;
          formatDetailInputValue(field, e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
          e.preventDefault();
          formatDetailInputValue(field, e.target.value);
          focusNextDetailCell(field);
        }}
        onFocus={(e) =>
          clearFarrDetailZeroOnFocus(e, {
            isEditable: !isFormDisabled && !options.readOnly,
            onClear: (value) =>
              updateDetailRow(
                index,
                ["receivedQty", "unitCost"].includes(field)
                  ? recalcAssetDetailRow(row, { [field]: value })
                  : { [field]: value }
              ),
          })
        }
      />
    );

    const detailLookupInput = (field, source, options = {}) => {
      const showLookupIcon =
        !isFormDisabled &&
        (!["vat", "rcCode"].includes(field) || !String(row.poNo || "").trim());
      return (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <div className="relative w-full">
          {detailInput(field, {
            readOnly: true,
            className: `${options.className || alignClass} pr-6 cursor-pointer`,
          })}
          {showLookupIcon && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute top-1/2 right-0 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => openDetailLookup(index, source)}
            />
          )}
        </div>
      </td>
    );
    };

    const detailSpecsInput = (field, title, placeholder) => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <div className="relative w-full">
          {detailInput(field, { className: `${alignClass} pr-6` })}
          {!isFormDisabled && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute top-1/2 right-0 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() =>
                useSwalHandleOpenSpecsModal(
                  index,
                  detailRows,
                  handleDetailModalChange,
                  row[field] || "",
                  title,
                  field,
                  placeholder
                )
              }
            />
          )}
        </div>
      </td>
    );

    const detailColumnRenderers = {
      ln: () => (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          {index + 1}
        </td>
      ),
      rcCode: () => detailLookupInput("rcCode", "detailRcCode", { className: "text-center" }),
      vat: () => detailLookupInput("vat", "detailVat", { className: "text-center" }),
      assetDescription: () =>
        detailSpecsInput("assetDescription", "Asset Description", "Enter asset description..."),
      remarks: () =>
        detailSpecsInput("remarks", "Asset Other Specification", "Enter asset specification..."),
      amount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("amount", { readOnly: true })}</td>,
      vatAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("vatAmount", { readOnly: true })}</td>,
      netAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("netAmount", { readOnly: true })}</td>,
      categName: () => detailLookupInput("categName", "detailFaCategory"),
      className: () => detailLookupInput("className", "detailFaClass"),
      location: () => detailLookupInput("location", "detailFaLoc", { className: "text-center" }),
      warrantyExpiry: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("warrantyExpiry", { readOnly: true, className: "text-center" })}</td>,
    };

    return (
      detailColumnRenderers[columnKey]?.() || (
        <td key={columnKey} className={`global-tran-td-ui ${alignClass}`} style={style}>
          {detailInput(columnKey)}
        </td>
      )
    );
  };

  const renderSerialCell = (columnKey, row, index) => {
    const columnWidth = getFarrSerialFallbackWidth(columnKey);
    const columnMeta = serialBreakdownColumns.find((column) => column.key === columnKey) || {};
    const style = getFarrSerialCellStyle(columnKey, columnWidth);
    const alignClass = columnMeta.align || "text-left";

    const updateSerialRow = (updates) => {
      setSerialRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...updates } : item)));
    };

    const focusNextSerialCell = (field) => {
      focusNextFarrSerialRowInput(index, field, {
        rows: serialRows,
        zeroClearFields: [],
        parseValue: (value) => value,
        onClearNextValue: (nextIndex, nextField, value) =>
          setSerialRows((prev) => prev.map((item, rowIndex) => (rowIndex === nextIndex ? { ...item, [nextField]: value } : item))),
      });
    };

    if (columnKey === "ln") {
      return (
        <td key={columnKey} className={`global-tran-td-ui ${alignClass}`} style={style}>
          <div className="flex h-7 items-center justify-center">{index + 1}</div>
        </td>
      );
    }

    if (columnKey === "assignedTo" || columnKey === "rcCode" || columnKey === "location") {
      const serialLookupSourceMap = {
        assignedTo: "serialAssignedTo",
        rcCode: "serialRcCode",
        location: "serialFaLoc",
      };
      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <div className="relative w-full">
            <input
              type="text"
              id={`${columnKey}-${index}`}
              className={`w-full h-7 global-tran-td-inputclass-ui ${alignClass} pr-6 cursor-pointer`.trim()}
              value={row[columnKey] || ""}
              readOnly
            />
            {!isFormDisabled && isSupplementEditing && (
              <button
                type="button"
                className="absolute inset-y-0 right-1 flex items-center px-1 text-blue-600 hover:text-blue-800"
                onClick={() => openSerialLookup(index, serialLookupSourceMap[columnKey])}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            )}
          </div>
        </td>
      );
    }

    const isEditable = columnKey === "serialNo" && isSupplementEditing && !isFormDisabled;
    return (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <input
          type="text"
          id={`${columnKey}-${index}`}
          className={`w-full h-7 global-tran-td-inputclass-ui ${alignClass}`.trim()}
          value={row[columnKey] || ""}
          readOnly={!isEditable}
          onChange={(e) => updateSerialRow({ [columnKey]: e.target.value })}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !isEditable) return;
            e.preventDefault();
            focusNextSerialCell(columnKey);
          }}
          onFocus={(e) =>
            clearFarrSerialZeroOnFocus(e, {
              isEditable,
              onClear: (value) => updateSerialRow({ [columnKey]: value }),
            })
          }
        />
      </td>
    );
  };

  const renderGlCell = (columnKey, row, index) => {
    const columnWidth = getFarrGlFallbackWidth(columnKey);
    const style = getFarrGlCellStyle(columnKey, columnWidth);
    const glModalHandlers = {
      acctCode: () => openGlLookup(index, "acctCode"),
      rcCode: () => openGlLookup(index, "rcCode"),
      slCode: () => openGlLookup(index, "slCode"),
      vatCode: () => openGlLookup(index, "vatCode"),
      atcCode: () => openGlLookup(index, "atcCode"),
    };

    const focusNextGlCell = (field) => {
      focusNextFarrGlRowInput(index, field, {
        rows: glRows,
        zeroClearFields: farrGlEnterNextRowZeroClearFields,
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) => updateGlRow(nextIndex, { [nextField]: value }),
      });
    };

    const glTextInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly={options.readOnly ?? isFormDisabled}
        maxLength={options.maxLength}
        onChange={(e) => updateGlRow(index, { [field]: e.target.value })}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
          e.preventDefault();
          focusNextGlCell(field);
        }}
      />
    );

    const glLookupInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly={options.readOnly}
        onChange={(e) => updateGlRow(index, { [field]: e.target.value })}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || isFormDisabled) return;
          e.preventDefault();
          focusNextGlCell(field);
        }}
      />
    );

    const glAmountInput = (field) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full global-tran-td-inputclass-ui text-right"
        value={row[field] || ""}
        readOnly={isFormDisabled}
        onChange={(e) => {
          const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
          if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
            updateGlRow(index, { [field]: sanitizedValue });
          }
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          updateGlRow(index, { [field]: formatNumber(e.target.value || 0) });
          focusNextGlCell(field);
        }}
        onFocus={(e) =>
          clearFarrGlZeroOnFocus(e, {
            isEditable: !isFormDisabled,
            onClear: (value) => updateGlRow(index, { [field]: value }),
          })
        }
        onBlur={(e) => {
          if (isFormDisabled) return;
          updateGlRow(index, { [field]: formatNumber(e.target.value || 0) });
        }}
      />
    );

    const glLookupCell = (readOnly = true, showOnlyWhenValue = true) => {
      const showLookupIcon = !isFormDisabled && (!showOnlyWhenValue || Boolean(String(row[columnKey] || "").trim()));
      return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>;
    };

    const glColumnRenderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      acctCode: () => glLookupCell(false, false),
      rcCode: () => glLookupCell(true),
      slCode: () => glLookupCell(true),
      vatCode: () => glLookupCell(true),
      atcCode: () => glLookupCell(true),
      sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey)}</td>,
      slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey)}</td>,
      remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey)}</td>,
      particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("particular")}</td>,
      atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("atcName")}</td>,
      vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
      debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      slRefDate: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <DateFormatInput
            id={`slRefDate${index}`}
            value={row.slRefDate || ""}
            disabled={isFormDisabled}
            className="w-full global-tran-td-inputclass-ui text-center pr-7"
            updateState={(updates) => {
              if (updates[`slRefDate${index}`] !== undefined) {
                updateGlRow(index, { slRefDate: updates[`slRefDate${index}`] });
              }
            }}
            onKeyDownCustom={(e) => {
              if (e.key !== "Enter" || isFormDisabled) return;
              e.preventDefault();
              focusNextGlCell("slRefDate");
            }}
          />
        </td>
      ),
    };

    return glColumnRenderers[columnKey]?.() ?? null;
  };

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          onPost={handlePost}
          printData={printData}
          onReset={handleReset}
          onSave={handleSave}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/FARR"
          isSaveDisabled={state.isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) + (glRows?.length || 0) === 0)}
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!state.documentID}
          isPrintDisabled={!state.documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!state.documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!state.documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
          <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>
          <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
            <div>
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
            </div>
          </div>
        </div>

        <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
          <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
            <button
              className={`global-tran-tab-padding-ui ${
                activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"
              }`}
              onClick={() => setActiveTab("basic")}
            >
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative" id="farr_hd">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="branchName" label="Branch" type="lookup" value={state.branchName} onLookup={() => updateState({ branchModalOpen: true })} />
                <FieldRenderer
                  id="farrNo"
                  label="FARR No."
                  type="lookup"
                  value={state.farrNo}
                  disabled={state.isDocNoDisabled}
                  onChange={(val) => updateState({ farrNo: val })}
                  onBlur={() => state.farrNo && fetchTranData(state.farrNo, state.branchCode)}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (state.farrNo) fetchTranData(state.farrNo, state.branchCode);
                      document.getElementById("farrDate")?.focus();
                    }
                  }}
                />
                <div className="relative w-full">
                  <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                    <DateFormatInput id="farrDate" className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer" value={state.farrDate} updateState={(updates) => updateState({ farrDate: updates.farrDate })} />
                  </div>
                  <label htmlFor="farrDate" className="global-ref-floating-label global-ref-label-enabled">FARR Date</label>
                </div>
                <FieldRenderer
                  id="rrType"
                  label="RR Type"
                  required
                  type="select"
                  value={state.rrType || "FARR01"}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ rrType: val })}
                  options={(state.farrTypes || []).map((type) => ({
                    label: type.DROPDOWN_NAME,
                    value: type.DROPDOWN_CODE,
                  }))}
                />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="PayeeCode" label="Payee Code" required type="lookup" value={state.PayeeCode} readOnly onLookup={() => updateState({ payeeModalOpen: true })} />
                <FieldRenderer id="PayeeName" label="Payee Name" required type="text" value={state.PayeeName} disabled readOnly />
                <FieldRenderer id="siNo" label="SI No." type="text" value={state.siNo} onChange={(val) => updateState({ siNo: val })} />
                <div className="relative w-full">
                  <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                    <DateFormatInput id="siDate" className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer" value={state.siDate} updateState={(updates) => updateState({ siDate: updates.siDate })} />
                  </div>
                  <label htmlFor="siDate" className="global-ref-floating-label global-ref-label-enabled">SI Date</label>
                </div>
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <div className="flex gap-4">
                  <div className="flex-grow w-2/3">
                    <FieldRenderer id="currCode" label="Currency" type="lookup" value={state.currCode} onLookup={() => sampleAlert("Currency Lookup")} />
                  </div>
                  <div className="flex-grow">
                    <FieldRenderer id="currRate" label="Currency Rate" type="amount" value={state.currRate} onChange={(val) => updateState({ currRate: val })} />
                  </div>
                </div>
                <FieldRenderer
                  id="referenceNo"
                  label="Reference No."
                  required
                  type="text"
                  value={state.referenceNo}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ referenceNo: val })}
                />
              </div>

              <div className="col-span-full">
                <div className="relative p-2">
                  <textarea id="remarks" rows={4} className="peer global-tran-textbox-remarks-ui pt-2" value={state.remarks} onChange={(e) => updateState({ remarks: e.target.value })} />
                  <label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label>
                </div>
                </div>
              </div>
          </div>
        </div>

        <div id="farr_dtl" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Receiving Details</button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedFarrDetailColumns.map((column) =>
                      renderFarrDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedFarrDetailColumns,
                      })
                    )}
                    {!isFormDisabled && (
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
                  {sortedFarrDetailRows.map(({ row, originalIndex }) => (
                    <tr key={`${row.itemCode}-${originalIndex}`} className={`global-tran-tr-ui cursor-pointer ${selectedRowIndex === originalIndex ? "bg-blue-50" : ""}`} onClick={() => setSelectedRowIndex(originalIndex)}>
                      {orderedFarrDetailColumns.map((column) => renderAssetCell(column.key, row, originalIndex))}
                      {!isFormDisabled && (
                        <td
                          className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          style={transactionActionsCellStyle}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" className="global-tran-td-button-add-ui" onClick={(e) => { e.stopPropagation(); handleEditSupplement(originalIndex); }}><FontAwesomeIcon icon={faPenToSquare} /></button>
                            <button type="button" className="global-tran-td-button-delete-ui" onClick={(e) => { e.stopPropagation(); handleDeleteRow(originalIndex); }}><FontAwesomeIcon icon={faTrashAlt} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderFarrDetailHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div ref={addTypeDropdownRef} className="relative inline-block" style={{ visibility: isFormDisabled ? "hidden" : "visible" }}>
                {showAddTypeDropdown && (
                  <div className="absolute bottom-[110%] left-0 z-[9999] mb-3 w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        Add Receiving Detail
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                          state.rrType === "FARR01"
                            ? "cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-500"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                        }`}
                        disabled={state.rrType === "FARR01"}
                        onClick={handleOpenAddItemLookup}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          <FontAwesomeIcon icon={faPlus} />
                        </span>
                        <span className="flex flex-col items-start">
                          <span>Select Item</span>
                          <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">Lookup MS master data</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                          state.rrType === "FARR02"
                            ? "cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-500"
                            : "text-blue-700 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                        }`}
                        disabled={state.rrType === "FARR02"}
                        onClick={handleOpenPOLookup}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                          <FontAwesomeIcon icon={faFolderOpen} />
                        </span>
                        <span className="flex flex-col items-start">
                          <span>Select Open Purchase Order</span>
                          <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">Lookup open PO items</span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
                <button onClick={handleAddRow} className="global-tran-tab-footer-button-add-ui">
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
                </button>
              </div>
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-2">
              <div className="global-tran-tab-footer-total-label-ui">Total Quantity Received:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totals.totalQty}</div>
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              {[{ key: "itemDetails", label: "Item Details" }, { key: "glEntries", label: "General Ledger" }].map((tab) => (
                <button key={tab.key} className={`global-tran-tab-padding-ui ${detailTab === tab.key ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`} onClick={() => setDetailTab(tab.key)}>{tab.label}</button>
              ))}
            </div>
            {detailTab === "glEntries" && (
              <button
                onClick={() => handleActivityOption("GenerateGL")}
                className="global-tran-button-generateGL"
                disabled={state.isLoading}
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                {state.isLoading ? "Generating..." : "Generate GL Entries"}
              </button>
            )}
          </div>

          {detailTab === "itemDetails" && (
            <div ref={itemDetailsRef} className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[1.05fr_2.65fr_1.2fr]">
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-blue-700">Selected Item Details</p>
                  <button
                    type="button"
                    className={`inline-flex min-w-[36px] flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[10px] font-medium text-white transition-all duration-200 lg:flex-row lg:px-3 lg:py-2 lg:text-xs ${
                      isSupplementEditing
                        ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700"
                        : "cursor-not-allowed bg-blue-600 opacity-65 dark:bg-blue-800"
                    }`}
                    disabled={!isSupplementEditing}
                    onClick={handleApplySupplementChanges}
                  >
                    <FontAwesomeIcon icon={faSave} />
                    <span>Apply Changes</span>
                  </button>
                </div>
                {[
                  ["Item Code", selectedRow.itemCode],
                  ["Asset Description", selectedRow.assetDescription],
                  ["Category", selectedRow.categName || selectedRow.assetCategory],
                  ["Sub Category", selectedRow.className || selectedRow.assetSubCategory],
                  ["Unit", selectedRow.unit],
                  ["Unit Cost (USD)", selectedRow.unitCost, "text-right"],
                  ["EUL", selectedRow.usefulLife, "text-right"],
                ].map(([label, value, valueAlign = "text-left"]) => (
                  <div key={label} className="grid grid-cols-[120px_1fr] gap-2 py-1 text-[11px]">
                    <span className="font-semibold text-slate-600">{label}</span>
                    <span className={`text-slate-900 ${valueAlign}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-bold text-blue-700">Serial No. Breakdown</p>
                <div className="global-tran-table-main-div-ui">
                  <div className="global-tran-table-main-sub-div-ui">
                    <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                      <thead className="global-tran-thead-div-ui">
                        <tr>
                          {orderedFarrSerialColumns.map((column) =>
                            renderFarrSerialHeader(column.label, column.key, column.width, {
                              orderedColumns: orderedFarrSerialColumns,
                            })
                          )}
                        </tr>
                      </thead>
                      <tbody className="relative">
                        {sortedFarrSerialRows.map(({ row, originalIndex }) => (
                          <tr key={`${row.assetTag}-${originalIndex}`} className="global-tran-tr-ui">
                            {orderedFarrSerialColumns.map((column) => renderSerialCell(column.key, row, originalIndex))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {renderFarrSerialHeaderContextMenu()}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-bold text-blue-700">Warranty & Notes</p>
                <div className="space-y-2">
                  <div className="relative w-full">
                    <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                      <DateFormatInput id="warrantyStartDate" className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer" value={state.warrantyStartDate} updateState={(updates) => updateState({ warrantyStartDate: updates.warrantyStartDate })} disabled={!isSupplementEditing} />
                    </div>
                    <label htmlFor="warrantyStartDate" className="global-ref-floating-label global-ref-label-enabled">Warranty Start Date</label>
                  </div>
                  <div className="relative w-full">
                    <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                      <DateFormatInput id="warrantyExpiryDate" className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer" value={state.warrantyExpiryDate} updateState={handleWarrantyExpiryChange} disabled={!isSupplementEditing} />
                    </div>
                    <label htmlFor="warrantyExpiryDate" className="global-ref-floating-label global-ref-label-enabled">Warranty Expiry Date</label>
                  </div>
                  <FieldRenderer id="warrantyMonths" label="Warranty (Months)" value={state.warrantyMonths} onChange={(val) => updateState({ warrantyMonths: val })} disabled={!isSupplementEditing} />
                  <textarea className="min-h-[82px] w-full rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500" value={state.warrantyNotes} onChange={(e) => updateState({ warrantyNotes: e.target.value })} disabled={!isSupplementEditing} />
                </div>
              </div>

            </div>
          )}

          {detailTab === "glEntries" && (
            <>
              <div className="global-tran-table-main-div-ui">
                <div className="global-tran-table-main-sub-div-ui">
                  <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                    <thead className="global-tran-thead-div-ui">
                      <tr>
                        {orderedFarrGlColumns.map((column) =>
                          renderFarrGlHeader(column.label, column.key, column.width, {
                            orderedColumns: orderedFarrGlColumns,
                          })
                        )}
                        {!isFormDisabled && (
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
                      {sortedFarrGlRows.map(({ row, originalIndex }) => (
                        <tr key={`${row.acctCode}-${originalIndex}`} className="global-tran-tr-ui">
                          {orderedFarrGlColumns.map((column) => renderGlCell(column.key, row, originalIndex))}
                          {!isFormDisabled && (
                            <td
                              className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                              style={transactionActionsCellStyle}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  className="global-tran-td-button-add-ui"
                                  onClick={() => handleAddRowGL(originalIndex)}
                                >
                                  <FontAwesomeIcon icon={faPlus} />
                                </button>
                                <button
                                  type="button"
                                  className="global-tran-td-button-delete-ui"
                                  onClick={() => handleDeleteRowGL(originalIndex)}
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
                  {renderFarrGlHeaderContextMenu()}
                </div>
              </div>

              <div className="global-tran-tab-footer-main-div-ui">
                <div className="global-tran-tab-footer-button-div-ui">
                  <button
                    onClick={() => handleAddRowGL()}
                    className="global-tran-tab-footer-button-add-ui"
                    style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
                  </button>
                </div>

                <div className="global-tran-tab-footer-total-main-div-ui">
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
                      Total Debit ({state.glCurrDefault}):
                    </label>
                    <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
                      {glTotals.totalDebit}
                    </label>
                  </div>

                  <div className="global-tran-tab-footer-total-div-ui">
                    <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
                      Total Credit ({state.glCurrDefault}):
                    </label>
                    <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
                      {glTotals.totalCredit}
                    </label>
                  </div>

                  {state.glCurrDefault !== state.currCode && (
                    <div className="global-tran-tab-footer-total-main-div-ui">
                      <div className="global-tran-tab-footer-total-div-ui">
                        <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-label-ui">
                          Total Debit ({state.currCode}):
                        </label>
                        <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-value-ui">
                          {glTotals.totalDebitFx1}
                        </label>
                      </div>

                      <div className="global-tran-tab-footer-total-div-ui">
                        <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-label-ui">
                          Total Credit ({state.currCode}):
                        </label>
                        <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-value-ui">
                          {glTotals.totalCreditFx1}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getFARRHistory"
          cacheKey={`FARR:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="FARR_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {state.branchModalOpen && (
        <BranchLookupModal
          isOpen={state.branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {state.payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={state.payeeModalOpen}
          onClose={handleClosePayeeModal}
          customParam={state.accountModalSource === "serialAssignedTo" ? "Employee" : undefined}
        />
      )}

      {state.showAccountModal && (
        <COAMastLookupModal
          isOpen={state.showAccountModal}
          onClose={handleCloseAccountModal}
          source={state.accountModalSource}
          customParam={glAccountFilter.ActiveAll}
        />
      )}

      {state.showRcModal && (
        <RCLookupModal
          isOpen={state.showRcModal}
          onClose={handleCloseRcModal}
          source={state.accountModalSource}
        />
      )}

      {state.showVatModal && (
        <VATLookupModal
          isOpen={state.showVatModal}
          onClose={handleCloseVatModal}
          customParam="InputGoods"
        />
      )}

      {state.showAtcModal && (
        <ATCLookupModal
          isOpen={state.showAtcModal}
          onClose={handleCloseAtcModal}
        />
      )}

      {state.showSlModal && (
        <SLMastLookupModal
          isOpen={state.showSlModal}
          onClose={handleCloseSlModal}
        />
      )}

      {state.showFaCategoryModal && (
        <SearchFACateg
          isOpen={state.showFaCategoryModal}
          onClose={handleCloseFaCategoryModal}
        />
      )}

      {state.showFaClassModal && (
        <SearchFAClass
          isOpen={state.showFaClassModal}
          onClose={handleCloseFaClassModal}
        />
      )}

      {state.showFaLocModal && (
        <SearchFALoc
          isOpen={state.showFaLocModal}
          onClose={handleCloseFaLocModal}
        />
      )}

      {state.itemLookupModalOpen && (
        <ItemMastLookupModal
          isOpen={state.itemLookupModalOpen}
          endpoint={state.itemLookupEndPoint}
          docType="FARR"
          enableMultiSelect
          onClose={handleCloseItemLookup}
        />
      )}

      {state.poLookupModalOpen && (
        <SearchPOOpenModal
          isOpen={state.poLookupModalOpen}
          branchCode={state.branchCode}
          poTranType={null}
          onClose={handleClosePOOpenModal}
        />
      )}

      {state.showCancelModal && (
        <CancelTranModal
          isOpen={state.showCancelModal}
          onClose={handleCloseCancel}
        />
      )}

      {state.showAttachModal && (
        <AttachDocumentModal
          isOpen={state.showAttachModal}
          params={{
            DocumentID: state.documentID,
            DocumentName: documentTitle,
            BranchName: state.branchName,
            DocumentNo: state.farrNo,
          }}
          onClose={() => updateState({ showAttachModal: false })}
        />
      )}

      {state.showAllTranDocNo && (
        <AllTranDocNo
          isOpen={state.showAllTranDocNo}
          params={{
            branchCode: state.branchCode,
            branchName: state.branchName,
            docType,
            documentTitle,
            fieldNo: "farrNo",
          }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo: state.farrNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}
    </div>
  );
};

export default FARR;
