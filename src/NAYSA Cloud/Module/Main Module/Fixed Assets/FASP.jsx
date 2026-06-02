import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPenToSquare, faPlus, faSave, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import SearchFAAsset from "../../../Lookup/SearchFAAsset.jsx";
import SearchFALoc from "../../../Lookup/SearchFALoc.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";

import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalErrorAlert,
  useSwalvalidateRequiredFields as validateRequiredFields,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { docTypePDFGuide, docTypeVideoGuide } from "@/NAYSA Cloud/Global/doctype";
import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";
import {
  useFetchTranData,
  useFieldLenghtCheck as fieldLenghtCheck,
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

const detailColumns = [
  { key: "ln", label: "LN", width: 48, align: "text-center" },
  { key: "faCode", label: "Asset No.", width: 140 },
  { key: "tagNo", label: "Asset Tag", width: 150 },
  { key: "assetDescription", label: "Asset Description", width: 260 },
  { key: "categCode", label: "Category Code", width: 130 },
  { key: "categName", label: "Category", width: 200 },
  { key: "classCode", label: "Class Code", width: 130 },
  { key: "className", label: "Sub Category", width: 200 },
  { key: "flocCode", label: "FA Location", width: 140 },
  { key: "rcCode", label: "RC Code", width: 110 },
  { key: "assetCost", label: "Asset Cost", width: 120, align: "text-right" },
  { key: "accumDepr", label: "Accum. Depr.", width: 120, align: "text-right" },
  { key: "nbValue", label: "NB Value", width: 120, align: "text-right" },
  { key: "remarks", label: "Remarks", width: 180 },
];

const glColumns = [
  { key: "ln", label: "LN", width: 56, align: "text-center" },
  { key: "acctCode", label: "Account Code", width: 120 },
  { key: "rcCode", label: "RC Code", width: 120 },
  { key: "sltypeCode", label: "SL Type Code", width: 120 },
  { key: "slCode", label: "SL Code", width: 120 },
  { key: "particular", label: "Particulars", width: 320 },
  { key: "debit", label: "Debit", width: 140, align: "text-right" },
  { key: "credit", label: "Credit", width: 140, align: "text-right" },
  { key: "debitFx1", label: "Debit Fx1", width: 140, align: "text-right" },
  { key: "creditFx1", label: "Credit Fx1", width: 140, align: "text-right" },
  { key: "debitFx2", label: "Debit Fx2", width: 140, align: "text-right" },
  { key: "creditFx2", label: "Credit Fx2", width: 140, align: "text-right" },
  { key: "slRefNo", label: "SL Ref. No.", width: 120 },
  { key: "slRefDate", label: "SL Ref. Date", width: 120 },
  { key: "remarks", label: "Remarks", width: 140 },
];

const areDropdownListsEqual = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  return left.every((item, index) =>
    item?.DROPDOWN_CODE === right[index]?.DROPDOWN_CODE &&
    item?.DROPDOWN_NAME === right[index]?.DROPDOWN_NAME
  );
};

const FASP = () => {
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    refsLoaded,
    getAllTopHSDocRow,
  } = useAuth();

  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const docType = "FASP";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide[docType] || "";
  const videoLink = docTypeVideoGuide[docType] || "";
  const documentTitle = `${hsDoc?.docName || "FA Split"} Transaction`;

  const [topTab, setTopTab] = useState("details");
  const [activeTab, setActiveTab] = useState("basic");
  const [detailTab, setDetailTab] = useState("itemDetails");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isViewDocument, setIsViewDocument] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  const [glRows, setGlRows] = useState([]);

  const [state, setState] = useState({
    branchCode: currentUserRow?.branchCode || "HO",
    branchName: currentUserRow?.branchName || "HO - Head Office",
    faspNo: "",
    faspDate: useGetCurrentDayV2(),
    documentStatus: "",
    status: "OPEN",
    noReprints: "0",
    userCode: currentUserRow?.userCode || "",
    documentID: "",
    splitType: "FASP01",
    splitTypeList: [],
    assetNo: "",
    tagNo: "",
    referenceNo: "",
    currCode: companyInfo?.currCode || "PHP",
    currName: companyInfo?.currName || "",
    currRate: "1.000000",
    remarks: "",
    branchModalOpen: false,
    showAssetModal: false,
    showFaLocModal: false,
    showCancelModal: false,
    showAttachModal: false,
    showAllTranDocNo: false,
    showSignatoryModal: false,
    showPostModal: false,
    isLoading: false,
    isGeneratingGL: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,
    tblFieldArray: [],
  });

  const displayStatus = (state.status || "OPEN").toUpperCase();
  const isPostedOrCancelled = ["FINALIZED", "POSTED", "CANCELLED", "CLOSED"].includes(displayStatus);
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = isViewDocument || isPostedOrCancelled;

  const updateState = useCallback((updates) => {
    setState((prev) => {
      const nextUpdates = typeof updates === "function" ? updates(prev) : updates;
      if (!nextUpdates || Object.keys(nextUpdates).length === 0) return prev;
      return { ...prev, ...nextUpdates };
    });
  }, []);

  const {
    getColumnStyle: getDetailColumnStyle,
    getFrozenColumnStyle: getDetailFrozenStyle,
    getOrderedColumns: getOrderedDetailColumns,
    getSortedRows: getSortedDetailRows,
    clearAllSorting: clearDetailSorting,
    renderResizableHeader: renderDetailHeader,
  } = useResizableTableColumns(detailColumns);

  const {
    getColumnStyle: getGlColumnStyle,
    getFrozenColumnStyle: getGlFrozenStyle,
    getOrderedColumns: getOrderedGlColumns,
    getSortedRows: getSortedGlRows,
    setColumnOrder: setGlColumnOrder,
    clearAllSorting: clearGlSorting,
    renderResizableHeader: renderGlHeader,
  } = useResizableTableColumns(glColumns);

  const orderedDetailColumns = getOrderedDetailColumns(detailColumns);
  const orderedGlColumns = getOrderedGlColumns(glColumns);

  useEffect(() => {
    setGlColumnOrder(glColumns.map((column) => column.key));
  }, [setGlColumnOrder]);

  const sortedDetailRows = getSortedDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const sortedGlRows = getSortedGlRows(
    glRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  useEffect(() => {
    if (!refsLoaded) return;
    const filteredTypes = getAllDropDown?.("FASPTRAN_TYPE", docType) || [];
    updateState((prev) => {
      const nextTranType = prev.splitType || filteredTypes[0]?.DROPDOWN_CODE || "FASP01";
      if (
        prev.splitType === nextTranType &&
        areDropdownListsEqual(prev.splitTypeList || [], filteredTypes)
      ) {
        return null;
      }

      return {
        splitTypeList: filteredTypes,
        splitType: nextTranType,
      };
    });
  }, [docType, getAllDropDown, refsLoaded, updateState]);

  const loadCompanyData = async () => {
    updateState({ isLoading: true });

    try {
      const hdtblcol_result = await fieldLenghtCheck("fasp_hd,fasp_dt1,fasp_dt2");
      if (hdtblcol_result) updateState({ tblFieldArray: hdtblcol_result });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, []);

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({ faspNo: "", documentID: "", isDocNoDisabled: false, isFetchDisabled: false });
      setDetailRows([]);
      setGlRows([]);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(documentNo, branchCode, docType, "faspNo", direction);

      if (!data?.faspId) {
        useSwalErrorAlert("No Records Found", "Transaction does not exist.");
        return resetState();
      }

      const retrievedDetailRows = (data.dt1 || []).map((item) => ({
        ...item,
        faCode: item.faCode || item.assetNo || "",
        tagNo: item.tagNo || item.assetTag || "",
        assetDescription: item.assetDescription || "",
        categCode: item.categCode || "",
        categName: item.categName || "",
        classCode: item.classCode || "",
        className: item.className || "",
        flocCode: item.flocCode || "",
        rcCode: item.rcCode || "",
        assetCost: formatNumber(item.assetCost || 0),
        accumDepr: formatNumber(item.accumDepr || 0),
        nbValue: formatNumber(item.nbValue || 0),
        remarks: item.remarks || "",
      }));

      const formattedGLRows = (data.dt2 || []).map((glRow) => ({
        ...glRow,
        debit: formatNumber(glRow.debit || 0),
        credit: formatNumber(glRow.credit || 0),
        debitFx1: formatNumber(glRow.debitFx1 || 0),
        creditFx1: formatNumber(glRow.creditFx1 || 0),
        debitFx2: formatNumber(glRow.debitFx2 || 0),
        creditFx2: formatNumber(glRow.creditFx2 || 0),
        slRefDate: useformatToDatev2(glRow.slRefDate || ""),
      }));

      updateState({
        documentStatus: data.faspHStatus || "",
        status: data.status || "OPEN",
        noReprints: data.noReprints || "0",
        documentID: data.faspId || "",
        faspNo: data.faspNo || "",
        branchCode: data.branchCode || "",
        branchName: data.branchName || "",
        faspDate: useformatToDatev2(data.faspDate || ""),
        splitType: data.splitType || "FASP01",
        referenceNo: data.referenceNo || "",
        assetNo: data.assetNo || "",
        tagNo: data.tagNo || "",
        currCode: data.currCode || companyInfo?.currCode || "PHP",
        currName: data.currName || companyInfo?.currName || "",
        currRate: formatNumber(data.currRate || 1, 6),
        remarks: data.remarks || "",
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });

      setDetailRows(retrievedDetailRows);
      setGlRows(formattedGLRows);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      useSwalErrorAlert("Fetch Error", error.message);
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const buildTransactionPayload = (nextGlRows = glRows) => ({
    branchCode: state.branchCode || "",
    faspNo: state.faspNo || "",
    faspId: state.documentID || "",
    documentID: state.documentID || "",
    faspDate: state.faspDate || "",
    splitType: state.splitType || "FASP01",
    referenceNo: state.referenceNo || "",
    assetNo: state.assetNo || "",
    tagNo: state.tagNo || "",
    currCode: state.currCode || companyInfo?.currCode || "PHP",
    currRate: parseFormattedNumber(state.currRate || 1),
    remarks: state.remarks || "",
    userCode: state.userCode || currentUserRow?.userCode || "",
    dt1: detailRows.map((row, index) => ({
      lnNo: String(index + 1),
      faCode: row.faCode || "",
      tagNo: row.tagNo || "",
      assetDescription: row.assetDescription || "",
      categCode: row.categCode || "",
      classCode: row.classCode || "",
      flocCode: row.flocCode || "",
      rcCode: row.rcCode || "",
      assetCost: parseFormattedNumber(row.assetCost || 0),
      accumDepr: parseFormattedNumber(row.accumDepr || 0),
      nbValue: parseFormattedNumber(row.nbValue || 0),
      remarks: row.remarks || "",
    })),
    dt2: nextGlRows.map((entry, index) => ({
      recNo: String(index + 1),
      acctCode: entry.acctCode || "",
      acctName: entry.acctName || "",
      rcCode: entry.rcCode || "",
      sltypeCode: entry.sltypeCode || "",
      slCode: entry.slCode || "",
      particular: entry.particular || "",
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
  });

  const handleActivityOption = async (action) => {
    if (isFormDisabled) {
      return;
    }

    if ((detailRows?.length || 0) + (glRows?.length || 0) === 0) {
      return;
    }

    if (state.documentStatus === "") {
      updateState({ isLoading: true });

      try {
        let finalDetailRowsGL = [...glRows];

        if (action === "GenerateGL") {
          try {
            setGlRows([]);
            updateState({ isGeneratingGL: true });

            const newGlEntries = await useGenerateGLEntries(
              docType,
              buildTransactionPayload(finalDetailRowsGL)
            );

            setGlRows(newGlEntries && newGlEntries.length > 0 ? newGlEntries : []);
            updateState({ isGeneratingGL: false });
          } catch (error) {
            setGlRows([]);
            updateState({ isGeneratingGL: false });
            console.error(error);
          }
          return;
        }

        if (action === "Upsert") {
          const requiredFields = {
            Branch: state.branchCode,
            "FASP Date": state.faspDate,
            "Reference No.": state.referenceNo,
          };

          const isValid = await validateRequiredFields(requiredFields, "Save FASP");
          if (!isValid) return;

          if (finalDetailRowsGL.length === 0) {
            const newGlEntries = await useGenerateGLEntries(
              docType,
              buildTransactionPayload([])
            );

            if (newGlEntries && newGlEntries.length > 0) {
              finalDetailRowsGL = newGlEntries;
              setGlRows(newGlEntries);
            }
          }

          const response = await useTransactionUpsert(
            docType,
            buildTransactionPayload(finalDetailRowsGL),
            updateState,
            "faspId",
            "faspNo"
          );

          if (response) {
            const responseDocNo = response.data[0].faspNo;
            const responseDocId = response.data[0].faspId;

            await fetchTranData(responseDocNo, state.branchCode);

            const isZero = Number(state.noReprints) === 0;
            const onSaveAndPrint = isZero
              ? () => updateState({ showSignatoryModal: true })
              : () => handleSaveAndPrint(responseDocId);

            useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
            updateState({
              faspNo: responseDocNo,
              documentID: responseDocId,
              isDocNoDisabled: true,
              isFetchDisabled: true,
            });
          }
        }
      } catch (error) {
        console.error(`Error during ${action}:`, error);
      } finally {
        updateState({ isLoading: false });
      }
    }
  };

  const handleSave = () => handleActivityOption("Upsert");
  const handleGenerateGL = () => handleActivityOption("GenerateGL");

  const handlePrint = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (state.documentID) {
      updateState({ showSignatoryModal: true });
    }
  };

  const handleSaveAndPrint = async (documentID) => {
    setShowSpinner(true);
    await useHandlePrint(documentID, docType);
    setShowSpinner(false);
  };

  const handleCloseSignatory = async (mode) => {
    updateState({
      showSignatoryModal: false,
      noReprints: mode === "Final" ? 1 : 0,
    });

    setShowSpinner(true);
    await useHandlePrint(state.documentID, docType, mode, state.userCode || currentUserRow?.userCode || "");
    setShowSpinner(false);
  };

  const handlePost = () => updateState({ showPostModal: true });

  const handleReset = () => {
    clearDetailSorting();
    clearGlSorting();
    setShowSpinner(true);
    setTimeout(() => {
      setDetailRows([]);
      setGlRows([]);
      setSelectedRowIndex(0);
      updateState({
        branchCode: currentUserRow?.branchCode || "HO",
        branchName: currentUserRow?.branchName || "HO - Head Office",
        userCode: currentUserRow?.userCode || "",
        faspNo: "",
        faspDate: useGetCurrentDayV2(),
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        noReprints: "0",
        splitType: "FASP01",
        referenceNo: "",
        assetNo: "",
        tagNo: "",
        currCode: companyInfo?.currCode || "",
        currName: companyInfo?.currName || "",
        currRate: formatNumber(companyInfo?.currRate || 1, 6),
        remarks: "",
        isDocNoDisabled: false,
        isSaveDisabled: false,
        isResetDisabled: false,
        isFetchDisabled: false,
      });
      setShowSpinner(false);
    }, 250);
  };

  const handleAddRow = () => {
    if (isFormDisabled) return;
    setDetailRows((prev) => [
      ...prev,
      {
        faCode: "",
        tagNo: "",
        assetDescription: "",
        categCode: "",
        categName: "",
        classCode: "",
        className: "",
        flocCode: "",
        rcCode: "",
        assetCost: "0.00",
        accumDepr: "0.00",
        nbValue: "0.00",
        remarks: "",
      },
    ]);
  };

  const handleDeleteRow = (index) => {
    if (isFormDisabled) return;
    setDetailRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    setSelectedRowIndex((prev) => Math.max(0, Math.min(prev, detailRows.length - 2)));
  };

  const handleAddRowGL = (index = null) => {
    if (isFormDisabled) return;
    const newRow = {
      acctCode: "",
      acctName: "",
      rcCode: "",
      sltypeCode: "",
      slCode: "",
      particular: "",
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
      if (index !== null && index >= 0) updatedRows.splice(index + 1, 0, newRow);
      else updatedRows.push(newRow);
      return updatedRows;
    });
  };

  const handleDeleteRowGL = (index) => {
    if (isFormDisabled) return;
    setGlRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleCancel = () => {
    if (!state.documentID || isFormDisabled) return;
    updateState({ showCancelModal: true });
  };

  const handleConfirmCancel = async (cancelReason) => {
    const success = await useHandleCancel(docType, state.documentID, state.faspNo, state.branchCode, state.userCode || currentUserRow?.userCode || "", cancelReason);
    updateState({ showCancelModal: false });
    if (success) await fetchTranData(state.faspNo, state.branchCode);
  };

  const handleAttach = () => {
    if (!state.documentID) return;
    updateState({ showAttachModal: true });
  };

  const handleTranDocNoRetrieval = async (payload) => {
    await fetchTranData(payload?.docNo || state.faspNo, state.branchCode, payload?.key || "");
  };

  const handleTranDocNoSelection = async (payload) => {
    updateState({ showAllTranDocNo: false });
    await fetchTranData(payload?.docNo, payload?.branchCode || state.branchCode);
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
    [cleanUrl]
  );

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") setIsViewDocument(true);
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("faspNo");
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

  const handleOpenAssetLookup = () => {
    if (isFormDisabled) return;
    updateState({ showAssetModal: true });
  };

  const handleCloseAssetModal = (selectedAsset) => {
    if (selectedAsset) {
      setDetailRows((prev) => {
        const rows = prev.length ? [...prev] : [{}];
        const targetIndex = rows[selectedRowIndex] ? selectedRowIndex : 0;
        rows[targetIndex] = {
          ...(rows[targetIndex] || {}),
          faCode: selectedAsset.faCode || selectedAsset.assetNo || "",
          tagNo: selectedAsset.tagNo || selectedAsset.assetTag || "",
          assetDescription: selectedAsset.assetDescription || "",
          categCode: selectedAsset.categCode || "",
          categName: selectedAsset.categName || "",
          classCode: selectedAsset.classCode || "",
          className: selectedAsset.className || "",
          flocCode: selectedAsset.flocCode || "",
          rcCode: selectedAsset.rcCode || "",
          assetCost: formatNumber(selectedAsset.assetCost || 0),
          accumDepr: formatNumber(selectedAsset.accumDepr || 0),
          nbValue: formatNumber(selectedAsset.nbValue || 0),
        };
        return rows;
      });
      updateState({
        assetNo: selectedAsset.faCode || selectedAsset.assetNo || "",
        tagNo: selectedAsset.tagNo || selectedAsset.assetTag || "",
      });
    }
    updateState({ showAssetModal: false });
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

  const handleCloseFaLocModal = (selectedLocation) => {
    if (selectedLocation) {
      updateState({ flocCode: selectedLocation.code || "" });
    }
    updateState({ showFaLocModal: false });
  };

  const printData = {
    fasp_no: state.faspNo,
    branch: state.branchCode,
    doc_id: docType,
  };

  const renderDetailCell = (columnKey, row, index) => {
    const columnMeta = detailColumns.find((column) => column.key === columnKey) || {};
    const style = {
      ...getDetailColumnStyle(columnKey, columnMeta.width || 120),
      ...getDetailFrozenStyle(columnKey, orderedDetailColumns, columnMeta.width || 120, { isHeader: false }),
    };
    const alignClass = columnMeta.align || "text-left";

    if (columnKey === "ln") {
      return <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>{index + 1}</td>;
    }

    return (
      <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>
        <input
          className={`global-tran-td-input-ui ${alignClass}`}
          value={row[columnKey] || ""}
          disabled={isFormDisabled}
          onChange={(e) => setDetailRows((prev) => prev.map((item, i) => i === index ? { ...item, [columnKey]: e.target.value } : item))}
        />
      </td>
    );
  };

  const renderGlCell = (columnKey, row, index) => {
    const columnMeta = glColumns.find((column) => column.key === columnKey) || {};
    const style = {
      ...getGlColumnStyle(columnKey, columnMeta.width || 120),
      ...getGlFrozenStyle(columnKey, orderedGlColumns, columnMeta.width || 120, { isHeader: false }),
    };
    const alignClass = columnMeta.align || "text-left";

    if (columnKey === "ln") {
      return <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>{index + 1}</td>;
    }

    return (
      <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>
        <input
          className={`global-tran-td-input-ui ${alignClass}`}
          value={row[columnKey] || ""}
          disabled={isFormDisabled}
          onChange={(e) => setGlRows((prev) => prev.map((item, i) => i === index ? { ...item, [columnKey]: e.target.value } : item))}
        />
      </td>
    );
  };

  return (
    <div className="global-tran-main-div-ui">
      {(state.isLoading || showSpinner) && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          printData={printData}
          onReset={handleReset}
          onSave={handleSave}
          onCancel={handleCancel}
          onAttach={handleAttach}
          onPost={handlePost}
          showPost={true}
          showCopyForm={false}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          detailsRoute={`/page/${docType}`}
          isSaveDisabled={state.isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) + (glRows?.length || 0) === 0)}
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!state.documentID}
          isPrintDisabled={!state.documentID || displayStatus === "CANCELLED"}
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
              className={`global-tran-tab-padding-ui ${activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
              onClick={() => setActiveTab("basic")}
            >
              Basic Information
            </button>
          </div>

          {activeTab === "basic" && (
            <div className="global-tran-tabcontent-div-ui">
              <div className="global-tran-textbox-grid-ui">
                <div className="global-tran-textbox-group-div-ui">
                  <FieldRenderer
                    id="branchName"
                    label="Branch"
                    type="lookup"
                    value={state.branchName}
                    disabled={isFormDisabled}
                    readOnly
                    onLookup={() => updateState({ branchModalOpen: true })}
                  />
                  <FieldRenderer
                    id="faspNo"
                    label="FASP No."
                    type="lookup"
                    value={state.faspNo}
                    disabled={state.isDocNoDisabled || isFormDisabled}
                    readOnly
                    onLookup={() => updateState({ showAllTranDocNo: true })}
                  />
                  <div className="relative w-full">
                    <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                      <DateFormatInput
                        id="faspDate"
                        className={`peer flex-grow bg-transparent border-none px-3 focus:outline-none ${isFormDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                        value={state.faspDate}
                        disabled={isFormDisabled}
                        updateState={(updates) => {
                          if (isFormDisabled) return;
                          updateState({ faspDate: updates.faspDate });
                        }}
                      />
                    </div>
                    <label htmlFor="faspDate" className="global-ref-floating-label global-ref-label-enabled">FASP Date</label>
                  </div>
                  <FieldRenderer
                    id="splitType"
                    label="Split Type"
                    required
                    type="select"
                    value={state.splitType || "FASP01"}
                    disabled={isFormDisabled}
                    onChange={(val) => updateState({ splitType: val })}
                    options={(state.splitTypeList || []).map((type) => ({
                      label: type.DROPDOWN_NAME,
                      value: type.DROPDOWN_CODE,
                    }))}
                  />
                </div>

                <div className="global-tran-textbox-group-div-ui">
                  <FieldRenderer
                    id="assetNo"
                    label="Asset No."
                    type="lookup"
                    value={state.assetNo}
                    disabled={isFormDisabled}
                    readOnly
                    onLookup={handleOpenAssetLookup}
                  />
                  <FieldRenderer
                    id="tagNo"
                    label="Asset Tag"
                    type="lookup"
                    value={state.tagNo}
                    disabled={isFormDisabled}
                    readOnly
                    onLookup={handleOpenAssetLookup}
                  />
                </div>

                <div className="global-tran-textbox-group-div-ui">
                  <div className="flex gap-4">
                    <input type="hidden" id="currCode" value={state.currCode || ""} readOnly />
                    <div className="flex-grow w-2/3">
                      <FieldRenderer
                        id="currName"
                        label="Currency"
                        type="text"
                        value={state.currCode ? `${state.currCode}${state.currName ? ` - ${state.currName}` : ""}` : ""}
                        disabled
                        readOnly
                      />
                    </div>
                    <div className="flex-grow">
                      <FieldRenderer
                        id="currRate"
                        label="Currency Rate"
                        type="amount"
                        value={state.currRate}
                        disabled={isFormDisabled}
                        onChange={(val) => updateState({ currRate: val })}
                      />
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
              </div>

              <div className="mt-6">
                <FieldRenderer
                  id="remarks"
                  label="Remarks"
                  type="textarea"
                  value={state.remarks}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ remarks: val })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="global-tran-header-div-ui">
          <div className="global-tran-header-tab-div-ui">
            <button
              className={`global-tran-tab-padding-ui ${detailTab === "itemDetails" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
              onClick={() => setDetailTab("itemDetails")}
            >
              Details
            </button>
            <button
              className={`global-tran-tab-padding-ui ${detailTab === "glEntries" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
              onClick={() => setDetailTab("glEntries")}
            >
              General Ledger Entries
            </button>
          </div>

          {detailTab === "itemDetails" && (
            <div className="global-tran-table-main-div-ui">
              <div className="global-tran-table-toolbar-ui">
                <button className="global-tran-table-action-button-ui" onClick={handleAddRow} disabled={isFormDisabled}>
                  <FontAwesomeIcon icon={faPlus} /> Add Row
                </button>
              </div>
              <div className="global-tran-table-wrapper-ui">
                <table className="global-tran-table-ui">
                  <thead>
                    <tr>
                      <th style={transactionActionsHeaderStyle}>Action</th>
                      {orderedDetailColumns.map((column) =>
                        renderDetailHeader(column.label, column.key, column.width, {
                          orderedColumns: orderedDetailColumns,
                        })
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDetailRows.map((entry) => {
                      const row = entry.row;
                      const originalIndex = entry.originalIndex;
                      return (
                        <tr key={originalIndex}>
                          <td style={transactionActionsCellStyle} className="global-tran-td-ui text-center">
                            <button
                              className="global-tran-icon-button-ui"
                              onClick={() => setSelectedRowIndex(originalIndex)}
                              title={isFormDisabled ? "View" : "Edit"}
                            >
                              <FontAwesomeIcon icon={isFormDisabled ? faEye : faPenToSquare} />
                            </button>
                            {!isFormDisabled && (
                              <button
                                className="global-tran-icon-button-danger-ui"
                                onClick={() => handleDeleteRow(originalIndex)}
                                title="Delete"
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </button>
                            )}
                          </td>
                          {orderedDetailColumns.map((column) => renderDetailCell(column.key, row, originalIndex))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detailTab === "glEntries" && (
            <div className="global-tran-table-main-div-ui">
              <div className="global-tran-table-toolbar-ui">
                <button className="global-tran-table-action-button-ui" onClick={handleGenerateGL} disabled={isFormDisabled || state.isGeneratingGL}>
                  <FontAwesomeIcon icon={faSave} /> Generate GL
                </button>
                <button className="global-tran-table-action-button-ui" onClick={() => handleAddRowGL()} disabled={isFormDisabled}>
                  <FontAwesomeIcon icon={faPlus} /> Add Row
                </button>
              </div>
              <div className="global-tran-table-wrapper-ui">
                <table className="global-tran-table-ui">
                  <thead>
                    <tr>
                      <th style={transactionActionsHeaderStyle}>Action</th>
                      {orderedGlColumns.map((column) =>
                        renderGlHeader(column.label, column.key, column.width, {
                          orderedColumns: orderedGlColumns,
                        })
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGlRows.map((entry) => {
                      const row = entry.row;
                      const originalIndex = entry.originalIndex;
                      return (
                        <tr key={originalIndex}>
                          <td style={transactionActionsCellStyle} className="global-tran-td-ui text-center">
                            {!isFormDisabled && (
                              <button
                                className="global-tran-icon-button-danger-ui"
                                onClick={() => handleDeleteRowGL(originalIndex)}
                                title="Delete"
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </button>
                            )}
                          </td>
                          {orderedGlColumns.map((column) => renderGlCell(column.key, row, originalIndex))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          docCode={docType}
          title={documentTitle}
          onRowPick={handleHistoryRowPick}
        />
      </div>

      {state.branchModalOpen && (
        <BranchLookupModal
          isOpen={state.branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {state.showAssetModal && (
        <SearchFAAsset
          isOpen={state.showAssetModal}
          onClose={handleCloseAssetModal}
          branchCode={state.branchCode}
        />
      )}

      {state.showFaLocModal && (
        <SearchFALoc
          isOpen={state.showFaLocModal}
          onClose={handleCloseFaLocModal}
          branchCode={state.branchCode}
        />
      )}

      {state.showAllTranDocNo && (
        <AllTranDocNo
          isOpen={state.showAllTranDocNo}
          onClose={() => updateState({ showAllTranDocNo: false })}
          docNo={state.faspNo}
          params={{
            branchCode: state.branchCode,
            branchName: state.branchName,
            docType,
            documentTitle,
            fieldNo: "faspNo",
          }}
          onRetrieve={handleTranDocNoRetrieval}
          onSelected={handleTranDocNoSelection}
        />
      )}

      {state.showAttachModal && (
        <AttachDocumentModal
          isOpen={state.showAttachModal}
          onClose={() => updateState({ showAttachModal: false })}
          transaction={documentTitle}
          documentNo={state.documentID}
          branch={state.branchCode}
        />
      )}

      {state.showSignatoryModal && (
        <DocumentSignatories
          isOpen={state.showSignatoryModal}
          onClose={handleCloseSignatory}
          onCancel={() => updateState({ showSignatoryModal: false })}
          params={{
            documentID: state.documentID,
            noReprints: state.noReprints,
            docType,
            docNo: state.faspNo,
          }}
        />
      )}

      {state.showCancelModal && (
        <CancelTranModal
          isOpen={state.showCancelModal}
          onClose={() => updateState({ showCancelModal: false })}
          onConfirm={handleConfirmCancel}
        />
      )}
    </div>
  );
};

export default FASP;
