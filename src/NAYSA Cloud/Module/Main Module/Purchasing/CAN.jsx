import { Fragment, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
  faCircleInfo,
  faClipboardList,
  faFilter,
  faListCheck,
  faMagnifyingGlass,
  faPaperclip,
  faPlus,
  faRefresh,
  faSearch,
  faTableCells,
  faTrashAlt,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalApprovalStatus from "@/NAYSA Cloud/Approval/GlobalApprovalStatus.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

import { apiClient } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { docTypePDFGuide, docTypeVideoGuide } from "@/NAYSA Cloud/Global/doctype";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalConfirmAlert,
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalSuccessAlert,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import Header from "@/NAYSA Cloud/Components/Header";

const docType = "CAN";

const normalizeRows = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (!parsed) return [];
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  return [value];
};

const toDateInputValue = (value) => {
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

const safeDate = (value) => {
  if (!value) return "";
  try {
    return useformatToDatev2(value);
  } catch {
    return value;
  }
};

const num = (value) => {
  const parsed = parseFormattedNumber(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) => formatNumber(num(value), 2);
const qty = (value, dec = 2) => formatNumber(num(value), dec);

const errorMessage = (error, fallback = "Unable to complete the request.") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const statusText = (code, fallback = "") => {
  const map = {
    D: "Draft",
    F: "For Approval",
    A: "Approved",
    W: "Awarded",
    C: "Cancelled",
  };
  return map[String(code || "").toUpperCase()] || fallback || "Draft";
};

const canEndpointMap = {
  history: ["/getCANHistory", "/can/history"],
  openPR: ["/getCANOpenPR", "/can/open-pr"],
  openPRDetail: ["/getCANOpenPRDetail", "/can/open-pr-detail"],
  get: ["/getCAN", "/can/get"],
  upsert: ["/upsertCAN", "/can/upsert"],
  cancel: ["/cancelCAN", "/can/cancel"],
  submit: ["/submitCAN", "/can/submit"],
  approve: ["/approveCAN", "/can/approve"],
  award: ["/awardCAN", "/can/award"],
  find: ["/findCAN", "/can/find"],
};

const makeSupplierDetail = (item) => ({
  canLn: item.canLn,
  itemCode: item.itemCode || "",
  itemName: item.itemName || "",
  itemSpecs: item.itemSpecs || "",
  uomCode: item.uomCode || "",
  quantity: qty(item.selectedQty || item.totalQtyNeeded || 0, 6),
  unitPrice: "0.000000",
  grossAmount: "0.00",
  discountAmount: "0.00",
  vatAmount: "0.00",
  netAmount: "0.00",
  isAwardedLine: false,
  remarks: "",
});

const calcDetail = (row) => {
  const grossAmount = num(row.quantity) * num(row.unitPrice);
  const netAmount = grossAmount - num(row.discountAmount) + num(row.vatAmount);
  return {
    ...row,
    grossAmount: money(grossAmount),
    netAmount: money(netAmount),
  };
};

const calcSupplier = (supplier) => {
  const detailRows = normalizeRows(supplier.detailRows);
  const offerAmount = detailRows.reduce((sum, row) => sum + num(row.grossAmount), 0);
  const discountAmount = detailRows.reduce((sum, row) => sum + num(row.discountAmount), 0);
  const vatAmount = detailRows.reduce((sum, row) => sum + num(row.vatAmount), 0);
  const netAmount = detailRows.reduce((sum, row) => sum + num(row.netAmount), 0);
  return {
    ...supplier,
    detailRows,
    offerAmount: money(offerAmount),
    discountAmount: money(discountAmount),
    vatAmount: money(vatAmount),
    netAmount: money(netAmount),
  };
};

export const CAN = () => {
  const { resetFlag } = useReset();
  const { companyInfo, currentUserRow, getAllTopHSDocRow } = useAuth();

  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const decQty = companyInfo?.itemDecqtyPur ?? 2;
  const documentTitle = `${hsDoc?.docName || "Canvas"} Transaction`;

  const [topTab, setTopTab] = useState("details");
  const [openPrRows, setOpenPrRows] = useState([]);
  const [selectedPrIds, setSelectedPrIds] = useState([]);
  const [expandedItemLn, setExpandedItemLn] = useState(null);
  const [activeSupplierForAttachment, setActiveSupplierForAttachment] = useState(null);

  const [state, setState] = useState({
    canId: "",
    canNo: "",
    canDate: useGetCurrentDayV2(),
    canStatus: "D",
    canStatusName: "Draft",
    canCancelled: false,

    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || currentUserRow?.BranchName || "",

    selectedSupplierCode: "",
    selectedSupplierName: "",
    selectedOfferAmount: "0.00",

    remarks: "",
    userCode: currentUserRow?.userCode || "",
    userName: currentUserRow?.userName || "",

    prRows: [],
    detailRows: [],
    supplierRows: [],
    statusHistory: [],

    historyRows: [],
    historyFilter: {
      canNo: "",
      prNo: "",
      supplier: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    },

    activeTab: "pr",
    activeSupplierIndex: 0,
    supplierActiveTabs: {},
    showPrBreakdown: true,
    showFilters: false,
    isLoading: false,
    showSpinner: false,
    showBranchModal: false,
    showAllTranDocNo: false,
    showAttachModal: false,
    showCancelModal: false,
    showApprovalStatusModal: false,
  });

  const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));

  const {
    canId,
    canNo,
    canDate,
    canStatus,
    canStatusName,
    canCancelled,
    branchCode,
    branchName,
    selectedSupplierCode,
    selectedSupplierName,
    selectedOfferAmount,
    remarks,
    userCode,
    userName,
    prRows,
    detailRows,
    supplierRows,
    statusHistory,
    historyRows,
    historyFilter,
    activeTab,
    activeSupplierIndex,
    supplierActiveTabs,
    showPrBreakdown,
    showFilters,
    isLoading,
    showSpinner,
    showBranchModal,
    showAllTranDocNo,
    showAttachModal,
    showCancelModal,
    showApprovalStatusModal,
  } = state;

  const displayStatus = statusText(canStatus, canStatusName);
  const isLocked = ["A", "W", "C"].includes(String(canStatus || "").toUpperCase()) || canCancelled;
  const isDraft = String(canStatus || "D").toUpperCase() === "D";
  const hasDocument = Boolean(canId);

  const totals = useMemo(() => {
    const totalQty = detailRows.reduce((sum, row) => sum + num(row.totalQtyNeeded), 0);
    const selectedQty = detailRows.reduce((sum, row) => sum + num(row.selectedQty), 0);
    const offers = supplierRows.map((row) => num(row.netAmount)).filter((value) => value > 0);
    return {
      prCount: prRows.length,
      itemCount: detailRows.length,
      supplierCount: supplierRows.length,
      totalQty: qty(totalQty, decQty),
      selectedQty: qty(selectedQty, decQty),
      bestOffer: money(offers.length ? Math.min(...offers) : 0),
    };
  }, [prRows, detailRows, supplierRows, decQty]);

  const rankedSuppliers = useMemo(
    () =>
      supplierRows
        .map((supplier, index) => ({ ...supplier, originalIndex: index }))
        .filter((supplier) => supplier.supplierCode || supplier.supplierName || num(supplier.netAmount) > 0)
        .sort((a, b) => num(a.netAmount) - num(b.netAmount)),
    [supplierRows]
  );

  const lowestSupplierKey = rankedSuppliers[0]
    ? `${rankedSuppliers[0].supplierCode || ""}-${rankedSuppliers[0].originalIndex}`
    : "";

  const callCAN = async (endpointKey, jsonData = {}) => {
    const endpoints = Array.isArray(endpointKey)
      ? endpointKey
      : canEndpointMap[endpointKey] || [endpointKey];
    let lastError;

    for (const endpoint of endpoints) {
      try {
        const response = await apiClient.post(endpoint, { json_data: jsonData });
        return response?.data?.data ?? response?.data;
      } catch (error) {
        lastError = error;
        if (error?.response?.status !== 404 || endpoint === endpoints[endpoints.length - 1]) {
          throw error;
        }
      }
    }

    throw lastError;
  };

  useEffect(() => {
    let timer;
    if (isLoading) timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (resetFlag) handleReset();
  }, [resetFlag]);

  useEffect(() => {
    if (branchCode) loadOpenPR();
  }, [branchCode]);

  const handleReset = () => {
    setSelectedPrIds([]);
    setExpandedItemLn(null);
    setActiveSupplierForAttachment(null);

    updateState({
      canId: "",
      canNo: "",
      canDate: useGetCurrentDayV2(),
      canStatus: "D",
      canStatusName: "Draft",
      canCancelled: false,
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || currentUserRow?.BranchName || "",
      selectedSupplierCode: "",
      selectedSupplierName: "",
      selectedOfferAmount: "0.00",
      remarks: "",
      userCode: currentUserRow?.userCode || "",
      userName: currentUserRow?.userName || "",
      prRows: [],
      detailRows: [],
      supplierRows: [],
      statusHistory: [],
      activeTab: "pr",
      activeSupplierIndex: 0,
      supplierActiveTabs: {},
      showPrBreakdown: true,
      showFilters: false,
      isLoading: false,
      showSpinner: false,
      showBranchModal: false,
      showAllTranDocNo: false,
      showAttachModal: false,
      showCancelModal: false,
      showApprovalStatusModal: false,
    });
  };

  const loadOpenPR = async () => {
    if (!branchCode) return;
    updateState({ isLoading: true });
    try {
      const data = await callCAN("openPR", { branchCode });
      setOpenPrRows(normalizeRows(data));
    } catch (error) {
      console.error(error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const loadHistory = async () => {
    updateState({ isLoading: true });
    try {
      const data = await callCAN("history", { branchCode, ...historyFilter });
      updateState({ historyRows: normalizeRows(data) });
    } catch (error) {
      useSwalErrorAlert("Canvas History", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const fetchCAN = async ({ canId: fetchCanId = "", canNo: fetchCanNo = "", branchCode: fetchBranchCode = branchCode, direction = "" }) => {
    updateState({ isLoading: true });
    try {
      const data = await callCAN("get", {
        canId: fetchCanId,
        canNo: fetchCanNo,
        branchCode: fetchBranchCode,
        direction,
      });

      if (!data || data?.result === null) {
        useSwalInfoAlert("Canvas Transaction", "Transaction does not exist.");
        return;
      }

      const nextDetailRows = normalizeRows(data.detailRows).map((row) => ({
        ...row,
        totalQtyNeeded: qty(row.totalQtyNeeded, decQty),
        selectedQty: qty(row.selectedQty, decQty),
        prBreakdown: normalizeRows(row.prBreakdown),
      }));

      const nextSuppliers = normalizeRows(data.supplierRows).map((supplier) =>
        calcSupplier({
          ...supplier,
          detailRows: normalizeRows(supplier.detailRows).map((row) => ({
            ...row,
            quantity: qty(row.quantity, 6),
            unitPrice: qty(row.unitPrice, 6),
            grossAmount: money(row.grossAmount),
            discountAmount: money(row.discountAmount),
            vatAmount: money(row.vatAmount),
            netAmount: money(row.netAmount),
          })),
          attachments: normalizeRows(supplier.attachments),
        })
      );

      const awarded = nextSuppliers.find(
        (supplier) => supplier.isAwarded || supplier.supplierCode === data.selectedSupplierCode
      );

      updateState({
        canId: data.canId || "",
        canNo: data.canNo || "",
        canDate: safeDate(data.canDate) || useGetCurrentDayV2(),
        canStatus: data.canStatus || "D",
        canStatusName: data.canStatusName || statusText(data.canStatus),
        canCancelled: Boolean(data.canCancelled),
        branchCode: data.branchCode || fetchBranchCode,
        selectedSupplierCode: awarded?.supplierCode || data.selectedSupplierCode || "",
        selectedSupplierName: awarded?.supplierName || data.selectedSupplierName || "",
        selectedOfferAmount: money(awarded?.netAmount || data.selectedOfferAmount || 0),
        remarks: data.remarks || "",
        userCode: data.userCode || currentUserRow?.userCode || "",
        prRows: normalizeRows(data.prRows),
        detailRows: nextDetailRows,
        supplierRows: nextSuppliers,
        statusHistory: normalizeRows(data.statusHistory),
        activeTab: "items",
      });

      setSelectedPrIds(normalizeRows(data.prRows).map((row) => String(row.prId)));
      setTopTab("details");
    } catch (error) {
      useSwalErrorAlert("Fetch Canvas", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleDocNoBlur = () => {
    if (!canId && canNo && branchCode) fetchCAN({ canNo, branchCode });
  };

  const handleLoadSelectedPR = async () => {
    if (selectedPrIds.length === 0) {
      useSwalInfoAlert("Select PR", "Please select at least one PR.");
      return;
    }

    updateState({ isLoading: true });

    try {
      const data = await callCAN("openPRDetail", { branchCode, prIds: selectedPrIds });
      const nextDetailRows = normalizeRows(data).map((row, index) => ({
        ...row,
        canLn: row.canLn || index + 1,
        totalQtyNeeded: qty(row.totalQtyNeeded, decQty),
        selectedQty: qty(row.selectedQty, decQty),
        prBreakdown: normalizeRows(row.prBreakdown),
      }));

      updateState({
        prRows: openPrRows.filter((row) => selectedPrIds.includes(String(row.prId))),
        detailRows: nextDetailRows,
        supplierRows: supplierRows.map((supplier) =>
          calcSupplier({
            ...supplier,
            detailRows: nextDetailRows.map((item) => {
              const existing = normalizeRows(supplier.detailRows).find((x) => Number(x.canLn) === Number(item.canLn));
              return existing || makeSupplierDetail(item);
            }),
          })
        ),
        activeTab: "items",
      });
    } catch (error) {
      useSwalErrorAlert("Load PR Detail", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const addSupplier = () => {
    if (isLocked) return;
    if (detailRows.length === 0) {
      useSwalInfoAlert("Supplier Offer", "Please select PR items first.");
      return;
    }

    updateState({
      activeTab: "suppliers",
      activeSupplierIndex: supplierRows.length,
      supplierRows: [
        ...supplierRows,
        calcSupplier({
          supplierCode: "",
          supplierName: "",
          quoteNo: "",
          quoteDate: "",
          paymentTerms: "",
          deliveryTerms: "",
          deliveryDate: "",
          remarks: "",
          isAwarded: false,
          isLowestOffer: false,
          detailRows: detailRows.map(makeSupplierDetail),
          attachments: [],
        }),
      ],
    });
  };

  const removeSupplier = async (index) => {
    if (isLocked) return;
    const result = await useSwalConfirmAlert("Remove Supplier Offer?", "Remove this supplier offer?", "Yes");
    if (!result?.isConfirmed) return;

    const removed = supplierRows[index];
    updateState({
      supplierRows: supplierRows.filter((_, i) => i !== index),
      activeSupplierIndex: Math.max(0, Math.min(activeSupplierIndex, supplierRows.length - 2)),
      ...(removed?.supplierCode === selectedSupplierCode
        ? {
            selectedSupplierCode: "",
            selectedSupplierName: "",
            selectedOfferAmount: "0.00",
          }
        : {}),
    });
  };

  const updateSupplier = (index, field, value) => {
    if (isLocked) return;
    const rows = [...supplierRows];
    rows[index] = { ...rows[index], [field]: field === "supplierCode" ? String(value || "").toUpperCase() : value };
    updateState({ supplierRows: rows });
  };

  const updateSupplierDetail = (supplierIndex, detailIndex, field, value, commit = false) => {
    if (isLocked) return;

    const suppliers = [...supplierRows];
    const supplier = { ...suppliers[supplierIndex] };
    const rows = [...normalizeRows(supplier.detailRows)];

    rows[detailIndex] = { ...rows[detailIndex], [field]: value };
    if (commit) rows[detailIndex] = calcDetail(rows[detailIndex]);

    suppliers[supplierIndex] = calcSupplier({ ...supplier, detailRows: rows });
    updateState({ supplierRows: suppliers });
  };

  const setSupplierTab = (supplierIndex, tab) => {
    updateState({
      supplierActiveTabs: {
        ...supplierActiveTabs,
        [supplierIndex]: tab,
      },
    });
  };

  const distributeIncludedQty = (breakdownRows, selectedQtyValue) => {
    let remaining = num(selectedQtyValue);

    return normalizeRows(breakdownRows).map((row) => {
      const availableQty = num(row.qtyInPr);
      const includedQty = Math.max(0, Math.min(availableQty, remaining));
      remaining -= includedQty;

      return {
        ...row,
        includedQty: qty(includedQty, decQty),
      };
    });
  };

  const updateItemSelectedQty = (index, value, commit = false) => {
    if (isLocked) return;

    const rows = [...detailRows];
    const row = rows[index];
    const clampedQty = Math.max(0, Math.min(num(value), num(row.totalQtyNeeded)));
    const selectedQtyValue = commit ? qty(clampedQty, decQty) : value;

    rows[index] = {
      ...row,
      selectedQty: selectedQtyValue,
      prBreakdown: commit ? distributeIncludedQty(row.prBreakdown, clampedQty) : row.prBreakdown,
    };

    const suppliers = supplierRows.map((supplier) =>
      calcSupplier({
        ...supplier,
        detailRows: normalizeRows(supplier.detailRows).map((detail) =>
          Number(detail.canLn) === Number(row.canLn)
            ? calcDetail({
                ...detail,
                quantity: selectedQtyValue,
              })
            : detail
        ),
      })
    );

    updateState({ detailRows: rows, supplierRows: suppliers });
  };

  const awardSupplier = async (supplier) => {
    if (!supplier?.supplierCode) {
      useSwalInfoAlert("Award Supplier", "Please enter Supplier Code first.");
      return;
    }

    const result = await useSwalConfirmAlert(
      "Award Supplier?",
      `Award this Canvas transaction to ${supplier.supplierName || supplier.supplierCode}?`,
      "Yes, Award"
    );
    if (!result?.isConfirmed) return;

    if (!canId) {
      updateState({
        selectedSupplierCode: supplier.supplierCode,
        selectedSupplierName: supplier.supplierName,
        selectedOfferAmount: money(supplier.netAmount),
        supplierRows: supplierRows.map((row) => ({
          ...row,
          isAwarded: row.supplierCode === supplier.supplierCode,
        })),
      });
      useSwalInfoAlert("Supplier Selected", "Please save the Canvas first before final awarding.");
      return;
    }

    updateState({ isLoading: true });

    try {
      await callCAN("award", {
        canId,
        userCode,
        selectedSupplierCode: supplier.supplierCode,
        selectedSupplierName: supplier.supplierName,
        selectedOfferAmount: num(supplier.netAmount),
        remarks,
      });

      await useSwalSuccessAlert("Awarded", "Supplier offer has been awarded.");
      await fetchCAN({ canId });
    } catch (error) {
      useSwalErrorAlert("Award Supplier", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const buildPayload = () => ({
    canId,
    canNo,
    canDate: toDateInputValue(canDate) || canDate,
    branchCode,
    remarks,
    userCode,
    selectedSupplierCode,
    selectedSupplierName,
    selectedOfferAmount: num(selectedOfferAmount),

    prRows: prRows.map((row) => ({
      prId: row.prId,
      branchCode: row.branchCode || branchCode,
      prNo: row.prNo,
      prDate: toDateInputValue(row.prDate) || row.prDate || null,
      rcCode: row.rcCode || "",
      rcName: row.rcName || "",
      requestedBy: row.requestedBy || "",
      dateNeeded: toDateInputValue(row.dateNeeded) || row.dateNeeded || null,
    })),

    detailRows: detailRows.map((row, index) => ({
      canLn: index + 1,
      itemCode: row.itemCode || "",
      itemName: row.itemName || "",
      itemSpecs: row.itemSpecs || "",
      uomCode: row.uomCode || "",
      totalQtyNeeded: num(row.totalQtyNeeded),
      selectedQty: num(row.selectedQty),
      remarks: row.remarks || "",
      prBreakdown: normalizeRows(row.prBreakdown).map((b) => ({
        prId: b.prId,
        prNo: b.prNo,
        prLn: b.prLn,
        prGroupId: b.prGroupId || "",
        branchCode: b.branchCode || branchCode,
        rcCode: b.rcCode || "",
        rcName: b.rcName || "",
        qtyInPr: num(b.qtyInPr),
        includedQty: num(b.includedQty),
        dateNeeded: toDateInputValue(b.dateNeeded) || b.dateNeeded || null,
      })),
    })),

    supplierRows: supplierRows.map((supplier, supplierIndex) => ({
      supplierCode: supplier.supplierCode || "",
      supplierName: supplier.supplierName || "",
      quoteNo: supplier.quoteNo || "",
      quoteDate: toDateInputValue(supplier.quoteDate) || supplier.quoteDate || null,
      offerAmount: num(supplier.offerAmount),
      discountAmount: num(supplier.discountAmount),
      vatAmount: num(supplier.vatAmount),
      netAmount: num(supplier.netAmount),
      paymentTerms: supplier.paymentTerms || "",
      deliveryTerms: supplier.deliveryTerms || "",
      deliveryDate: toDateInputValue(supplier.deliveryDate) || supplier.deliveryDate || null,
      isLowestOffer:
        `${supplier.supplierCode || ""}-${supplierIndex}` === lowestSupplierKey &&
        num(supplier.netAmount) > 0,
      isAwarded: Boolean(supplier.isAwarded),
      remarks: supplier.remarks || "",
      detailRows: normalizeRows(supplier.detailRows).map((detail) => ({
        canLn: detail.canLn,
        itemCode: detail.itemCode || "",
        itemName: detail.itemName || "",
        itemSpecs: detail.itemSpecs || "",
        uomCode: detail.uomCode || "",
        quantity: num(detail.quantity),
        unitPrice: num(detail.unitPrice),
        grossAmount: num(detail.grossAmount),
        discountAmount: num(detail.discountAmount),
        vatAmount: num(detail.vatAmount),
        netAmount: num(detail.netAmount),
        isAwardedLine: Boolean(detail.isAwardedLine),
        remarks: detail.remarks || "",
      })),
    })),
  });

  const save = async () => {
    if (!branchCode) return useSwalErrorAlert("Canvas Validation", "Branch is required.");
    if (!canDate) return useSwalErrorAlert("Canvas Validation", "Canvas Date is required.");
    if (!userCode) return useSwalErrorAlert("Canvas Validation", "User Code is required.");
    if (detailRows.length === 0) return useSwalErrorAlert("Canvas Validation", "Please select at least one PR item.");
    if (supplierRows.some((s) => !s.supplierCode || !s.supplierName)) {
      return useSwalErrorAlert("Canvas Validation", "Supplier Code and Supplier Name are required.");
    }

    updateState({ isLoading: true });

    try {
      const data = await callCAN("upsert", buildPayload());
      const savedCanId = data?.canId || data?.[0]?.canId || canId;

      if (savedCanId) await fetchCAN({ canId: savedCanId });
      useSwalshowSaveSuccessDialog(handleReset, async () => savedCanId && fetchCAN({ canId: savedCanId }));
    } catch (error) {
      useSwalErrorAlert("Save Canvas", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const cancel = () => {
    if (!canId || canCancelled) return;
    updateState({ showCancelModal: true });
  };

  const closeCancel = async (confirmation) => {
    if (!confirmation) {
      updateState({ showCancelModal: false });
      return;
    }

    updateState({ isLoading: true });

    try {
      await callCAN("cancel", {
        canId,
        userCode,
        cancelReason: confirmation.reason || "",
      });
      await useSwalSuccessAlert("Canvas Cancelled", "Cancellation completed.");
      await fetchCAN({ canId });
    } catch (error) {
      useSwalErrorAlert("Cancel Canvas", errorMessage(error));
    } finally {
      updateState({ isLoading: false, showCancelModal: false });
    }
  };

  const submit = async () => {
    if (!canId) return useSwalInfoAlert("Submit Canvas", "Please save the Canvas transaction first.");

    const result = await useSwalConfirmAlert("Submit Canvas?", "Submit this Canvas transaction for approval?", "Submit");
    if (!result?.isConfirmed) return;

    updateState({ isLoading: true });

    try {
      await callCAN("submit", { canId, userCode, remarks });
      await useSwalSuccessAlert("Submitted", "Canvas transaction has been submitted.");
      await fetchCAN({ canId });
    } catch (error) {
      useSwalErrorAlert("Submit Canvas", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const openAttachment = (supplier) => {
    if (!supplier?.canSupplierId) {
      useSwalInfoAlert("Supplier Attachment", "Please save the Canvas first before attaching supplier quotation files.");
      return;
    }

    setActiveSupplierForAttachment(supplier);
    updateState({ showAttachModal: true });
  };

  const renderStatusPill = () => {
    const className =
      String(canStatus).toUpperCase() === "C"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : String(canStatus).toUpperCase() === "W"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : String(canStatus).toUpperCase() === "A"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-slate-50 text-slate-700 border-slate-200";

    return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{displayStatus}</span>;
  };

  const renderHeader = () => (
    <div className="global-tran-header-ui">
      <div className="global-tran-headertext-div-ui">
        <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
      </div>
      <div className="global-tran-headerstat-div-ui">
        <button
          type="button"
          onClick={() => hasDocument && updateState({ showApprovalStatusModal: true })}
          className="rounded px-1 text-center transition-colors hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200"
          title="View Approval Status"
          aria-label="View Approval Status"
        >
          <p className="global-tran-headerstat-text-ui">Transaction Status</p>
          <h1 className="global-tran-stat-text-ui text-blue-900">{displayStatus}</h1>
        </button>
      </div>
    </div>
  );

  const renderCanvasInfoCard = () => (
    <div className="global-tran-header-div-ui">
      <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3" id="can_hd">
        <div className="global-tran-textbox-group-div-ui">
          <FieldRenderer
            id="canBranch"
            label="Branch"
            type="lookup"
            value={branchName || branchCode || ""}
            disabled={isLocked}
            readOnly
            onLookup={() => !isLocked && updateState({ showBranchModal: true })}
          />

          <FieldRenderer
            id="canNo"
            label="Canvas No."
            type="lookup"
            value={canNo || ""}
            disabled={Boolean(canId)}
            onChange={(val) => updateState({ canNo: val })}
            onBlur={handleDocNoBlur}
            onLookup={() => updateState({ showAllTranDocNo: true })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleDocNoBlur();
                e.preventDefault();
              }
            }}
          />

          <FieldRenderer
            id="canDate"
            label="Canvas Date"
            type="date"
            value={toDateInputValue(canDate)}
            disabled={isLocked}
            onChange={(val) => updateState({ canDate: val })}
          />
        </div>

       

        <div className="global-tran-textbox-group-div-ui">
          <FieldRenderer
            id="preparedBy"
            label="Prepared By"
            type="text"
            value={userName || currentUserRow?.userName || userCode || ""}
            disabled
            readOnly
          />

          <FieldRenderer
            id="selectedSupplier"
            label="Selected Supplier"
            type="text"
            value={selectedSupplierName || ""}
            disabled
            readOnly
          />

          <FieldRenderer
            id="selectedOfferAmount"
            label="Selected Offer Amount"
            type="amount"
            value={selectedOfferAmount || "0.00"}
            disabled
            readOnly
          />
        </div>

        <div className="global-tran-textbox-group-div-ui">
         
          <div className="grid grid-cols-2 gap-2">
            {[
              ["PR Count", totals.prCount],
              ["Items", totals.itemCount],
              ["Suppliers", totals.supplierCount],
              ["Total Qty", totals.totalQty],
              ["Best Offer", totals.bestOffer],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 last:col-span-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2">
          <div className="relative">
            <textarea
              id="canRemarks"
              placeholder=""
              rows={4}
              className="peer global-tran-textbox-remarks-ui pt-2"
              value={remarks || ""}
              onChange={(e) => updateState({ remarks: e.target.value })}
              disabled={isLocked}
            />
            <label htmlFor="canRemarks" className="global-tran-floating-label-remarks">
              Remarks
            </label>
          </div>
        </div>

      </div>
    </div>
  );

  const tabButton = (key, label, count) => (
    <button
      type="button"
      onClick={() => updateState({ activeTab: key })}
      className={`rounded-t-xl border px-4 py-2 text-xs font-semibold ${
        activeTab === key
          ? "border-blue-200 bg-white text-blue-700 shadow-sm"
          : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {label} <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5">{count}</span>
    </button>
  );

  const renderPrSelection = () => (
    <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-700">Select Approved PR</h2>
          <p className="text-xs text-slate-500">Select multiple PRs. Common items will be consolidated automatically.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={loadOpenPR} className="rounded-lg border px-3 py-2 text-xs font-semibold">
            <FontAwesomeIcon icon={faRefresh} className="mr-1" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleLoadSelectedPR}
            disabled={isLocked || selectedPrIds.length === 0}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Add Selected PR
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-xl border">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-slate-100 text-slate-600">
            <tr>
              <th className="w-12 px-2 py-2 text-center">Select</th>
              <th className="px-2 py-2 text-left">PR No.</th>
              <th className="px-2 py-2 text-left">PR Date</th>
              <th className="px-2 py-2 text-left">RC</th>
              <th className="px-2 py-2 text-left">Requested By</th>
              <th className="px-2 py-2 text-right">Items</th>
              <th className="px-2 py-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {openPrRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">No open PR records found.</td>
              </tr>
            ) : (
              openPrRows.map((row) => (
                <tr key={row.prId} className="border-t hover:bg-blue-50/40">
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedPrIds.includes(String(row.prId))}
                      onChange={() =>
                        setSelectedPrIds((prev) =>
                          prev.includes(String(row.prId))
                            ? prev.filter((id) => id !== String(row.prId))
                            : [...prev, String(row.prId)]
                        )
                      }
                      disabled={isLocked}
                    />
                  </td>
                  <td className="px-2 py-2 font-semibold text-blue-700">{row.prNo}</td>
                  <td className="px-2 py-2">{safeDate(row.prDate)}</td>
                  <td className="px-2 py-2">{row.rcName || row.rcCode}</td>
                  <td className="px-2 py-2">{row.requestedBy}</td>
                  <td className="px-2 py-2 text-right">{row.totalItems}</td>
                  <td className="px-2 py-2 text-right">{qty(row.totalQty, decQty)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderItems = () => (
    <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-bold text-slate-700">Consolidated Items</h2>
      <p className="mb-3 text-xs text-slate-500">Click the arrow to view PR breakdown per item.</p>

      <div className="overflow-auto rounded-xl border">
        <table className="min-w-[980px] w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="w-10 px-2 py-2"></th>
              <th className="w-16 px-2 py-2 text-center">LN</th>
              <th className="px-2 py-2 text-left">Item Code</th>
              <th className="px-2 py-2 text-left">Item Name</th>
              <th className="px-2 py-2 text-left">Specification</th>
              <th className="w-24 px-2 py-2 text-left">UOM</th>
              <th className="w-32 px-2 py-2 text-right">Total Qty</th>
              <th className="w-32 px-2 py-2 text-right">Selected Qty</th>
              <th className="w-24 px-2 py-2 text-center">PR Count</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">No items loaded. Select PR first.</td>
              </tr>
            ) : (
              detailRows.map((row, index) => (
                <Fragment key={row.canLn || index}>
                  <tr key={row.canLn} className="border-t hover:bg-slate-50">
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => setExpandedItemLn(expandedItemLn === row.canLn ? null : row.canLn)}>
                        <FontAwesomeIcon icon={expandedItemLn === row.canLn ? faChevronDown : faChevronRight} />
                      </button>
                    </td>
                    <td className="px-2 py-2 text-center">{index + 1}</td>
                    <td className="px-2 py-2 font-semibold">{row.itemCode}</td>
                    <td className="px-2 py-2">{row.itemName}</td>
                    <td className="px-2 py-2">{row.itemSpecs}</td>
                    <td className="px-2 py-2">{row.uomCode}</td>
                    <td className="px-2 py-2 text-right">{qty(row.totalQtyNeeded, decQty)}</td>
                    <td className="px-2 py-2">
                      <input
                        className="w-full rounded border px-2 py-1 text-right"
                        value={row.selectedQty || ""}
                        onChange={(e) => {
                          const rows = [...detailRows];
                          rows[index] = { ...rows[index], selectedQty: e.target.value };
                          updateState({ detailRows: rows });
                        }}
                        onBlur={(e) => {
                          const rows = [...detailRows];
                          rows[index] = { ...rows[index], selectedQty: qty(e.target.value, decQty) };
                          updateState({ detailRows: rows });
                        }}
                        readOnly={isLocked}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">{normalizeRows(row.prBreakdown).length}</td>
                  </tr>

                  {expandedItemLn === row.canLn && (
                    <tr className="bg-slate-50">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="rounded-xl border bg-white p-3">
                          <div className="mb-2 text-xs font-bold">PR Breakdown</div>
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="px-2 py-1 text-left">PR No.</th>
                                <th className="px-2 py-1 text-left">RC</th>
                                <th className="px-2 py-1 text-right">PR Qty</th>
                                <th className="px-2 py-1 text-right">Included Qty</th>
                                <th className="px-2 py-1 text-left">Date Needed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {normalizeRows(row.prBreakdown).map((b, bIndex) => (
                                <tr key={`${b.prId}-${bIndex}`} className="border-t">
                                  <td className="px-2 py-1">{b.prNo}</td>
                                  <td className="px-2 py-1">{b.rcName || b.rcCode}</td>
                                  <td className="px-2 py-1 text-right">{qty(b.qtyInPr, decQty)}</td>
                                  <td className="px-2 py-1 text-right">{qty(b.includedQty, decQty)}</td>
                                  <td className="px-2 py-1">{safeDate(b.dateNeeded)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSuppliers = () => (
    <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-700">Supplier Offers</h2>
          <p className="text-xs text-slate-500">Attach files per supplier after saving the Canvas.</p>
        </div>
        <button
          type="button"
          onClick={addSupplier}
          disabled={isLocked || detailRows.length === 0}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          Add Supplier
        </button>
      </div>

      {supplierRows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No supplier offer added yet.</div>
      ) : (
        <div className="space-y-4">
          {supplierRows.map((supplier, supplierIndex) => {
            const isAwarded = supplier.isAwarded || (supplier.supplierCode && supplier.supplierCode === selectedSupplierCode); // Check if this supplier is the awarded one
            const isLowest = `${supplier.supplierCode || ""}-${supplierIndex}` === lowestSupplierKey && num(supplier.netAmount) > 0; // Check if this supplier has the lowest offer
            return (
              <div key={`${supplier.supplierCode}-${supplierIndex}`} className={`rounded-2xl border ${isAwarded ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"}`}> {/* Outer container for each supplier's card */}
                <div className="flex flex-wrap items-start justify-between gap-3 p-4"> {/* Header of the supplier card */}
                  <button type="button" onClick={() => updateState({ activeSupplierIndex: supplierIndex })} className="flex items-center gap-2 text-left">
                    <FontAwesomeIcon icon={activeSupplierIndex === supplierIndex ? faChevronDown : faChevronRight} />
                    <div>
                      <div className="text-sm font-bold">
                        {supplier.supplierName || "New Supplier Offer"}
                        {isAwarded && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">AWARDED</span>}
                      </div>
                      <div className="text-xs text-slate-500">Net Amount: <span className="font-bold">{money(supplier.netAmount)}</span></div>
                    </div>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openAttachment(supplier)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"> {/* Attachments button */}
                      <FontAwesomeIcon icon={faPaperclip} className="mr-1" />
                      Attachments ({normalizeRows(supplier.attachments).length})
                    </button>
                    <button type="button" onClick={() => awardSupplier(supplier)} disabled={isLocked || canCancelled || String(canStatus).toUpperCase() === "W"} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"> {/* Award button */}
                      <FontAwesomeIcon icon={faTrophy} className="mr-1" />
                      Award
                    </button>
                    {!isLocked && (
                      <button type="button" onClick={() => removeSupplier(supplierIndex)} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"> {/* Remove button */}
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    )}
                  </div>
                </div>

                {activeSupplierIndex === supplierIndex && ( /* This is the expanded content for the active supplier */
                  <div className="border-t border-slate-200 p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["supplierCode", "Supplier Code"],
                    ["supplierName", "Supplier Name"],
                    ["quoteNo", "Quote No."],
                    ["quoteDate", "Quote Date"],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label className="global-tran-label-ui">{label}</label>
                      <input
                        type={field === "quoteDate" ? "date" : "text"}
                        className="global-tran-input-ui"
                        value={field === "quoteDate" ? toDateInputValue(supplier[field]) : supplier[field] || ""}
                        onChange={(e) => updateSupplier(supplierIndex, field, e.target.value)}
                        readOnly={isLocked}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                  {[
                    ["paymentTerms", "Payment Terms"],
                    ["deliveryTerms", "Delivery Terms"],
                    ["deliveryDate", "Delivery Date"],
                    ["remarks", "Remarks"],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label className="global-tran-label-ui">{label}</label>
                      <input
                        type={field === "deliveryDate" ? "date" : "text"}
                        className="global-tran-input-ui"
                        value={field === "deliveryDate" ? toDateInputValue(supplier[field]) : supplier[field] || ""}
                        onChange={(e) => updateSupplier(supplierIndex, field, e.target.value)}
                        readOnly={isLocked}
                      />
                    </div>
                  ))}
                </div>

                {activeSupplierIndex === supplierIndex && (
                  <div className="mt-4 overflow-auto rounded-xl border">
                    <table className="min-w-[1100px] w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-2 py-2 text-center">LN</th>
                          <th className="px-2 py-2 text-left">Item</th>
                          <th className="px-2 py-2 text-left">UOM</th>
                          <th className="px-2 py-2 text-right">Qty</th>
                          <th className="px-2 py-2 text-right">Unit Price</th>
                          <th className="px-2 py-2 text-right">Gross</th>
                          <th className="px-2 py-2 text-right">Discount</th>
                          <th className="px-2 py-2 text-right">VAT</th>
                          <th className="px-2 py-2 text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalizeRows(supplier.detailRows).map((row, detailIndex) => (
                          <tr key={`${supplierIndex}-${row.canLn}`} className="border-t">
                            <td className="px-2 py-2 text-center">{detailIndex + 1}</td>
                            <td className="px-2 py-2">
                              <div className="font-semibold">{row.itemCode}</div>
                              <div className="text-slate-500">{row.itemName}</div>
                            </td>
                            <td className="px-2 py-2">{row.uomCode}</td>
                            {["quantity", "unitPrice", "discountAmount", "vatAmount"].map((field) => (
                              <td key={field} className="px-2 py-2">
                                <input
                                  className="w-full rounded border px-2 py-1 text-right"
                                  value={row[field] || ""}
                                  onChange={(e) => updateSupplierDetail(supplierIndex, detailIndex, field, e.target.value)}
                                  onBlur={(e) => updateSupplierDetail(supplierIndex, detailIndex, field, field === "quantity" || field === "unitPrice" ? qty(e.target.value, 6) : money(e.target.value), true)}
                                  readOnly={isLocked}
                                />
                              </td>
                            ))}
                            <td className="px-2 py-2 text-right">{money(row.grossAmount)}</td>
                            <td className="px-2 py-2 text-right font-bold">{money(row.netAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold">
                        <tr>
                          <td colSpan={5} className="px-2 py-2 text-right">Total</td>
                          <td className="px-2 py-2 text-right">{money(supplier.offerAmount)}</td>
                          <td className="px-2 py-2 text-right">{money(supplier.discountAmount)}</td>
                          <td className="px-2 py-2 text-right">{money(supplier.vatAmount)}</td>
                          <td className="px-2 py-2 text-right">{money(supplier.netAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {normalizeRows(supplier.attachments).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {normalizeRows(supplier.attachments).map((file) => (
                      <span key={file.fileId} className="rounded-full border bg-slate-50 px-3 py-1 text-xs">
                        <FontAwesomeIcon icon={faPaperclip} className="mr-1" />
                        {file.fileName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStatusHistory = () => (
    <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-700">Status History</h2>
      {statusHistory.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No status history yet.</div>
      ) : (
        <div className="space-y-3">
          {statusHistory.map((row, index) => (
            <div key={row.canStatusHistId || index} className="flex gap-3 rounded-xl border p-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{index + 1}</div>
              <div>
                <div className="text-sm font-bold">{row.statusName}</div>
                <div className="text-xs text-slate-500">{row.actionBy} • {safeDate(row.actionDate)}</div>
                {row.remarks && <div className="mt-1 whitespace-pre-wrap text-xs">{row.remarks}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStepIndicator = () => {
    const steps = [
      ["pr", "Select PRs & Consolidate"],
      ["suppliers", "Supplier Offers"],
      ["review", "Review & Award"],
    ];
    const activeStep = activeTab === "pr" ? "pr" : activeTab === "suppliers" ? "suppliers" : "review";

    return (
      <div className="grid grid-cols-1 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm md:grid-cols-3">
        {steps.map(([key, label], index) => {
          const isActive = activeStep === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => updateState({ activeTab: key === "review" ? "items" : key })}
              className={`flex items-center gap-3 border-b px-2 py-2 text-left last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 ${
                isActive ? "text-blue-700" : "text-slate-400"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isActive ? "bg-blue-600 text-white" : "border border-slate-300 bg-white"
                }`}
              >
                {index + 1}
              </span>
              <span className="text-xs font-bold">{label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSummaryPanel = () => (
    <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-slate-800">Transaction Summary</h2>
        <div className="mt-3 space-y-3 text-xs">
          {[
            ["Selected PRs", totals.prCount],
            ["Consolidated Items", totals.itemCount],
            ["Common Items", detailRows.filter((row) => normalizeRows(row.prBreakdown).length > 1).length],
            ["Total Quantity", `${totals.selectedQty} Units`],
          ].map(([label, value], index) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 text-[10px] text-blue-600">
                  {index + 1}
                </span>
                {label}
              </span>
              <span className="font-bold text-slate-900">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <h2 className="text-sm font-bold text-slate-800">PR Coverage</h2>
        <div className="mt-3 space-y-2 text-xs">
          {prRows.length === 0 ? (
            <div className="text-slate-500">No PR selected.</div>
          ) : (
            prRows.map((row) => {
              const itemCount = detailRows.filter((item) =>
                normalizeRows(item.prBreakdown).some((b) => String(b.prId) === String(row.prId))
              ).length;
              const coveredQty = detailRows.reduce(
                (sum, item) =>
                  sum +
                  normalizeRows(item.prBreakdown)
                    .filter((b) => String(b.prId) === String(row.prId))
                    .reduce((lineSum, b) => lineSum + num(b.includedQty), 0),
                0
              );

              return (
                <div key={row.prId} className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">{row.prNo}</span>
                  <span className="text-slate-500">{itemCount} items</span>
                  <span className="font-bold text-slate-800">{qty(coveredQty, decQty)} Units</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <h2 className="text-sm font-bold text-slate-800">Best Offer Snapshot</h2>
        <div className="mt-3 space-y-2">
          {rankedSuppliers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">No supplier offers yet.</div>
          ) : (
            rankedSuppliers.slice(0, 3).map((supplier, index) => {
              const isLowest = index === 0 && num(supplier.netAmount) > 0;
              return (
                <button
                  type="button"
                  key={`${supplier.supplierCode}-${supplier.originalIndex}`}
                  onClick={() => updateState({ activeTab: "suppliers" })}
                  className={`w-full rounded-lg border p-3 text-left text-xs ${
                    isLowest ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold ${
                        isLowest ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-800">
                        {supplier.supplierName || supplier.supplierCode || "Unnamed Supplier"}
                      </span>
                      <span className="block font-bold text-slate-950">PHP {money(supplier.netAmount)}</span>
                    </span>
                    {isLowest && <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Lowest</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <FontAwesomeIcon icon={faCircleInfo} className="mr-2" />
        Common items are merged into one canvas line while preserving PR-level breakdown.
      </div>
    </aside>
  );

  const renderPrSelectorCard = () => (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">1. Select Purchase Requisitions</h2>
          <p className="text-xs text-slate-500">Approved open PRs are loaded by branch.</p>
        </div>
        <button type="button" onClick={loadOpenPR} className="rounded-lg border px-3 py-2 text-xs font-semibold">
          <FontAwesomeIcon icon={faRefresh} className="mr-1" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_180px]">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">Select PRs</div>
          <div className="max-h-32 overflow-auto rounded-lg border border-slate-200 bg-white">
            {openPrRows.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-500">No open PR records found.</div>
            ) : (
              openPrRows.map((row) => {
                const checked = selectedPrIds.includes(String(row.prId));
                return (
                  <label
                    key={row.prId}
                    className={`flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-blue-50 ${
                      checked ? "bg-blue-50 text-blue-800" : "text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedPrIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== String(row.prId))
                            : [...prev, String(row.prId)]
                        )
                      }
                      disabled={isLocked}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {row.prNo} - {row.rcName || row.rcCode || "No Department"}
                    </span>
                    <span className="text-xs text-slate-500">{qty(row.totalQty, decQty)}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">Departments</div>
          <div className="min-h-32 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {prRows.map((row) => row.rcName || row.rcCode).filter(Boolean).join(", ") || "No PR selected"}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">Total Selected PRs</div>
          <div className="flex min-h-32 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-3xl font-bold text-slate-900">
            {selectedPrIds.length}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleLoadSelectedPR}
          disabled={isLocked || selectedPrIds.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faClipboardList} className="mr-2" />
          {selectedPrIds.length} PRs Selected
        </button>
        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
          {detailRows.filter((row) => normalizeRows(row.prBreakdown).length > 1).length} Common Items Found
        </span>
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700">
          {detailRows.length} Total Unique Items
        </span>
        <span className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-800">
          Identical items across PRs are consolidated into single lines.
        </span>
      </div>
    </section>
  );

  const renderConsolidatedCanvasCard = () => (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">2. Consolidated Item Canvas</h2>
          <p className="text-xs text-slate-500">Set the quantity to include in this transaction.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateState({ showPrBreakdown: !showPrBreakdown })}
            className="rounded-lg border px-3 py-2 text-xs font-semibold text-blue-700"
          >
            <FontAwesomeIcon icon={faListCheck} className="mr-1" />
            {showPrBreakdown ? "Hide PR Breakdown" : "Show PR Breakdown"}
          </button>
          <button type="button" onClick={() => updateState({ activeTab: "items" })} className="rounded-lg border px-3 py-2 text-xs font-semibold text-blue-700">
            <FontAwesomeIcon icon={faTableCells} className="mr-1" />
            Full Table
          </button>
          <button type="button" onClick={() => updateState({ showFilters: !showFilters })} className="rounded-lg border px-3 py-2 text-xs font-semibold text-blue-700">
            <FontAwesomeIcon icon={faFilter} className="mr-1" />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Use the PR selector above to change the consolidation set.
        </div>
      )}

      <div className="overflow-auto rounded-lg border">
        <table className="min-w-[980px] w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="w-10 px-2 py-2 text-center"></th>
              <th className="w-12 px-2 py-2 text-center">#</th>
              <th className="px-2 py-2 text-left">Group / Item</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="w-20 px-2 py-2 text-left">UOM</th>
              <th className="w-28 px-2 py-2 text-right">Total Qty Needed</th>
              <th className="w-28 px-2 py-2 text-left">Source PRs</th>
              <th className="w-20 px-2 py-2 text-center">PR Count</th>
              <th className="w-28 px-2 py-2 text-right">Available / Remaining</th>
              <th className="w-28 px-2 py-2 text-right">Select Qty</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-500">No consolidated items yet.</td>
              </tr>
            ) : (
              detailRows.map((row, index) => {
                const breakdown = normalizeRows(row.prBreakdown);
                return (
                  <Fragment key={row.canLn || index}>
                    <tr className="border-t hover:bg-slate-50">
                      <td className="px-2 py-2 text-center">
                        <button type="button" onClick={() => setExpandedItemLn(expandedItemLn === row.canLn ? null : row.canLn)}>
                          <FontAwesomeIcon icon={expandedItemLn === row.canLn ? faChevronDown : faChevronRight} />
                        </button>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{index + 1}</span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-bold text-slate-800">{row.itemCode}</div>
                        {breakdown.length > 1 && <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Common Item</span>}
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-semibold">{row.itemName}</div>
                        <div className="text-slate-500">{row.itemSpecs}</div>
                      </td>
                      <td className="px-2 py-2">{row.uomCode}</td>
                      <td className="px-2 py-2 text-right font-bold">{qty(row.totalQtyNeeded, decQty)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {breakdown.slice(0, 2).map((b) => (
                            <span key={`${row.canLn}-${b.prNo}`} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {b.prNo}
                            </span>
                          ))}
                          {breakdown.length > 2 && <span className="text-[10px] text-slate-500">+{breakdown.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center font-bold">{breakdown.length}</td>
                      <td className="px-2 py-2 text-right font-bold text-emerald-700">
                        {qty(row.selectedQty, decQty)} / {qty(row.totalQtyNeeded, decQty)}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="w-full rounded border px-2 py-1 text-right"
                          value={row.selectedQty || ""}
                          onChange={(e) => updateItemSelectedQty(index, e.target.value)}
                          onBlur={(e) => updateItemSelectedQty(index, e.target.value, true)}
                          readOnly={isLocked}
                        />
                      </td>
                    </tr>
                    {showPrBreakdown && expandedItemLn === row.canLn && (
                      <tr className="bg-slate-50">
                        <td colSpan={10} className="px-8 py-2">
                          <table className="w-full rounded-lg border bg-white text-xs">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="px-2 py-1 text-left">Source PR</th>
                                <th className="px-2 py-1 text-left">Department</th>
                                <th className="px-2 py-1 text-left">Requested By</th>
                                <th className="px-2 py-1 text-left">Required Date</th>
                                <th className="px-2 py-1 text-right">Qty in PR</th>
                                <th className="px-2 py-1 text-right">Included Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {breakdown.map((b, bIndex) => (
                                <tr key={`${b.prId}-${b.prLn}-${bIndex}`} className="border-t">
                                  <td className="px-2 py-1">{b.prNo}</td>
                                  <td className="px-2 py-1">{b.rcName || b.rcCode}</td>
                                  <td className="px-2 py-1">{b.requestedBy}</td>
                                  <td className="px-2 py-1">{safeDate(b.dateNeeded)}</td>
                                  <td className="px-2 py-1 text-right">{qty(b.qtyInPr, decQty)}</td>
                                  <td className="px-2 py-1 text-right font-bold">{qty(b.includedQty, decQty)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
          {detailRows.length > 0 && (
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td colSpan={9} className="px-2 py-2 text-right">Total Selected Quantity:</td>
                <td className="px-2 py-2 text-right">{totals.selectedQty} Units</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );

  const renderSupplierOffersCard = () => (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">3. Supplier Offers</h2>
          <p className="text-xs text-slate-500">Add and compare supplier offers for the consolidated items.</p>
        </div>
        <button
          type="button"
          onClick={addSupplier}
          disabled={isLocked || detailRows.length === 0}
          className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          Add Supplier
        </button>
      </div>

      {supplierRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No supplier offer added yet.</div>
      ) : (
        (() => {
          const supplierIndex = Math.min(activeSupplierIndex, supplierRows.length - 1);
          const supplier = supplierRows[supplierIndex];
          const isAwarded = supplier.isAwarded || supplier.supplierCode === selectedSupplierCode;
          const isLowest = `${supplier.supplierCode || ""}-${supplierIndex}` === lowestSupplierKey && num(supplier.netAmount) > 0;
          const activeSupplierTab = supplierActiveTabs[supplierIndex] || "offer";

          return (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-3 pt-3">
                {supplierRows.map((row, index) => {
                  const selected = index === supplierIndex;
                  const tabLabel = row.supplierName || row.supplierCode || `Supplier ${index + 1}`;
                  return (
                    <button
                      key={`${row.supplierCode}-${index}`}
                      type="button"
                      onClick={() => updateState({ activeSupplierIndex: index })}
                      className={`max-w-[220px] truncate rounded-t-lg border px-4 py-2 text-xs font-bold ${
                        selected
                          ? "border-blue-200 border-b-white bg-white text-blue-700"
                          : "border-transparent text-slate-500 hover:bg-white"
                      }`}
                      title={tabLabel}
                    >
                      Supplier {index + 1}
                      {(row.supplierName || row.supplierCode) && (
                        <span className="ml-2 font-semibold text-slate-500">{tabLabel}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className={`p-4 ${isAwarded ? "bg-emerald-50/40" : ""}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-800">
                    Supplier {supplierIndex + 1}
                    {isLowest && <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">Lowest Offer</span>}
                    {isAwarded && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">Awarded</span>}
                  </div>
                  {!isLocked && (
                    <button type="button" onClick={() => removeSupplier(supplierIndex)} className="text-rose-500">
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  )}
                </div>

                <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
                  {[
                    ["offer", "Offer"],
                    ["items", "Item Details"],
                    ["attachments", `Attachments (${normalizeRows(supplier.attachments).length})`],
                  ].map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSupplierTab(supplierIndex, tab)}
                      className={`rounded-t-lg px-3 py-2 text-xs font-bold ${
                        activeSupplierTab === tab
                          ? "border border-b-white border-blue-200 bg-white text-blue-700"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {activeSupplierTab === "offer" && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="global-tran-label-ui">Supplier</label>
                      <input className="global-tran-input-ui" value={supplier.supplierCode || ""} onChange={(e) => updateSupplier(supplierIndex, "supplierCode", e.target.value)} readOnly={isLocked} />
                    </div>
                    <div>
                      <label className="global-tran-label-ui">Supplier Name</label>
                      <input className="global-tran-input-ui" value={supplier.supplierName || ""} onChange={(e) => updateSupplier(supplierIndex, "supplierName", e.target.value)} readOnly={isLocked} />
                    </div>
                    <div>
                      <label className="global-tran-label-ui">Quote No.</label>
                      <input className="global-tran-input-ui" value={supplier.quoteNo || ""} onChange={(e) => updateSupplier(supplierIndex, "quoteNo", e.target.value)} readOnly={isLocked} />
                    </div>
                    <div>
                      <label className="global-tran-label-ui">Offer Date</label>
                      <input type="date" className="global-tran-input-ui" value={toDateInputValue(supplier.quoteDate)} onChange={(e) => updateSupplier(supplierIndex, "quoteDate", e.target.value)} readOnly={isLocked} />
                    </div>
                    <div>
                      <label className="global-tran-label-ui">Payment Terms</label>
                      <input className="global-tran-input-ui" value={supplier.paymentTerms || ""} onChange={(e) => updateSupplier(supplierIndex, "paymentTerms", e.target.value)} readOnly={isLocked} />
                    </div>
                    <div>
                      <label className="global-tran-label-ui">Delivery Terms</label>
                      <input className="global-tran-input-ui" value={supplier.deliveryTerms || ""} onChange={(e) => updateSupplier(supplierIndex, "deliveryTerms", e.target.value)} readOnly={isLocked} />
                    </div>
                    <div>
                      <label className="global-tran-label-ui">Delivery Date</label>
                      <input type="date" className="global-tran-input-ui" value={toDateInputValue(supplier.deliveryDate)} onChange={(e) => updateSupplier(supplierIndex, "deliveryDate", e.target.value)} readOnly={isLocked} />
                    </div>
                    <div>
                      <label className="global-tran-label-ui">Total Offer Amount</label>
                      <input className="global-tran-input-ui text-right font-bold" value={`PHP ${money(supplier.netAmount)}`} readOnly />
                    </div>
                    <div className="lg:col-span-4">
                      <label className="global-tran-label-ui">Remarks</label>
                      <input className="global-tran-input-ui" value={supplier.remarks || ""} onChange={(e) => updateSupplier(supplierIndex, "remarks", e.target.value)} readOnly={isLocked} />
                    </div>
                  </div>
                )}

                {activeSupplierTab === "items" && (
                  <div className="max-h-[460px] overflow-auto rounded-lg border">
                    <table className="min-w-[1040px] w-full text-xs">
                      <thead className="sticky top-0 bg-slate-100">
                        <tr>
                          <th className="px-2 py-2 text-center">LN</th>
                          <th className="px-2 py-2 text-left">Item Code</th>
                          <th className="px-2 py-2 text-left">Item Name</th>
                          <th className="px-2 py-2 text-left">Specification</th>
                          <th className="px-2 py-2 text-left">UOM</th>
                          <th className="px-2 py-2 text-right">Qty</th>
                          <th className="px-2 py-2 text-right">Unit Price</th>
                          <th className="px-2 py-2 text-right">Gross</th>
                          <th className="px-2 py-2 text-right">Discount</th>
                          <th className="px-2 py-2 text-right">VAT</th>
                          <th className="px-2 py-2 text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalizeRows(supplier.detailRows).map((row, detailIndex) => (
                          <tr key={`${supplierIndex}-${row.canLn}`} className="border-t">
                            <td className="px-2 py-2 text-center">{detailIndex + 1}</td>
                            <td className="px-2 py-2 font-semibold">{row.itemCode}</td>
                            <td className="px-2 py-2">{row.itemName}</td>
                            <td className="px-2 py-2">{row.itemSpecs}</td>
                            <td className="px-2 py-2">{row.uomCode}</td>
                            {["quantity", "unitPrice"].map((field) => (
                              <td key={field} className="px-2 py-2">
                                <input
                                  className="w-24 rounded border px-2 py-1 text-right"
                                  value={row[field] || ""}
                                  onChange={(e) => updateSupplierDetail(supplierIndex, detailIndex, field, e.target.value)}
                                  onBlur={(e) => updateSupplierDetail(supplierIndex, detailIndex, field, qty(e.target.value, 6), true)}
                                  readOnly={isLocked}
                                />
                              </td>
                            ))}
                            <td className="px-2 py-2 text-right">{money(row.grossAmount)}</td>
                            {["discountAmount", "vatAmount"].map((field) => (
                              <td key={field} className="px-2 py-2">
                                <input
                                  className="w-24 rounded border px-2 py-1 text-right"
                                  value={row[field] || ""}
                                  onChange={(e) => updateSupplierDetail(supplierIndex, detailIndex, field, e.target.value)}
                                  onBlur={(e) => updateSupplierDetail(supplierIndex, detailIndex, field, money(e.target.value), true)}
                                  readOnly={isLocked}
                                />
                              </td>
                            ))}
                            <td className="px-2 py-2 text-right font-bold">{money(row.netAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="sticky bottom-0 bg-slate-50 font-bold">
                        <tr>
                          <td colSpan={7} className="px-2 py-2 text-right">Total</td>
                          <td className="px-2 py-2 text-right">{money(supplier.offerAmount)}</td>
                          <td className="px-2 py-2 text-right">{money(supplier.discountAmount)}</td>
                          <td className="px-2 py-2 text-right">{money(supplier.vatAmount)}</td>
                          <td className="px-2 py-2 text-right">{money(supplier.netAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {activeSupplierTab === "attachments" && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <button type="button" onClick={() => openAttachment(supplier)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">
                      <FontAwesomeIcon icon={faPaperclip} className="mr-1" />
                      Attach Files
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {normalizeRows(supplier.attachments).length === 0 ? (
                        <span className="text-xs text-slate-500">No attachments uploaded.</span>
                      ) : (
                        normalizeRows(supplier.attachments).map((file) => (
                          <span key={file.fileId} className="rounded-full border bg-white px-3 py-1 text-xs">
                            <FontAwesomeIcon icon={faPaperclip} className="mr-1" />
                            {file.fileName}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => awardSupplier(supplier)} disabled={canCancelled || String(canStatus).toUpperCase() === "W"} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    <FontAwesomeIcon icon={faTrophy} className="mr-1" />
                    Award
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {supplierRows.length > 0 && (
        <button
          type="button"
          onClick={addSupplier}
          disabled={isLocked || detailRows.length === 0}
          className="mt-4 w-full rounded-lg border border-dashed border-blue-200 py-3 text-xs font-bold text-blue-700 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          Add Another Supplier
        </button>
      )}
    </section>
  );

  const renderDetails = () => (
    <>
      {renderHeader()}
      {renderCanvasInfoCard()}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
        <div className="space-y-4">
          {renderStepIndicator()}
          {renderPrSelectorCard()}
          {renderConsolidatedCanvasCard()}
          {renderSupplierOffersCard()}
          {statusHistory.length > 0 && renderStatusHistory()}
        </div>
        {renderSummaryPanel()}
      </div>
    </>
  );

  const renderHistory = () => (
    <div className="global-tran-header-ui">
      <div className="global-tran-headertext-div-ui">
        <h1 className="global-tran-headertext-ui">Canvas Transaction History</h1>
      </div>

      <div className="mt-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          {[
            ["canNo", "Canvas No."],
            ["prNo", "PR No."],
            ["supplier", "Supplier"],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="global-tran-label-ui">{label}</label>
              <input
                className="global-tran-input-ui"
                value={historyFilter[field]}
                onChange={(e) => updateState({ historyFilter: { ...historyFilter, [field]: e.target.value } })}
              />
            </div>
          ))}
          <div>
            <label className="global-tran-label-ui">Status</label>
            <select className="global-tran-input-ui" value={historyFilter.status} onChange={(e) => updateState({ historyFilter: { ...historyFilter, status: e.target.value } })}>
              <option value="">All</option>
              <option value="D">Draft</option>
              <option value="F">For Approval</option>
              <option value="A">Approved</option>
              <option value="W">Awarded</option>
              <option value="C">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="global-tran-label-ui">Date From</label>
            <input type="date" className="global-tran-input-ui" value={toDateInputValue(historyFilter.dateFrom)} onChange={(e) => updateState({ historyFilter: { ...historyFilter, dateFrom: e.target.value } })} />
          </div>
          <div>
            <label className="global-tran-label-ui">Date To</label>
            <input type="date" className="global-tran-input-ui" value={toDateInputValue(historyFilter.dateTo)} onChange={(e) => updateState({ historyFilter: { ...historyFilter, dateTo: e.target.value } })} />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button type="button" onClick={loadHistory} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">
            <FontAwesomeIcon icon={faSearch} className="mr-1" />
            Load History
          </button>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border">
          <table className="min-w-[980px] w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-2 text-left">Canvas No.</th>
                <th className="px-2 py-2 text-left">Date</th>
                <th className="px-2 py-2 text-right">PR Count</th>
                <th className="px-2 py-2 text-right">Items</th>
                <th className="px-2 py-2 text-right">Suppliers</th>
                <th className="px-2 py-2 text-left">Selected Supplier</th>
                <th className="px-2 py-2 text-right">Amount</th>
                <th className="px-2 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">No history loaded.</td>
                </tr>
              ) : (
                historyRows.map((row) => (
                  <tr key={row.canId} className="cursor-pointer border-t hover:bg-blue-50" onDoubleClick={() => fetchCAN({ canId: row.canId, branchCode: row.branchCode || branchCode })}>
                    <td className="px-2 py-2 font-bold text-blue-700">{row.canNo}</td>
                    <td className="px-2 py-2">{safeDate(row.canDate)}</td>
                    <td className="px-2 py-2 text-right">{row.prCount}</td>
                    <td className="px-2 py-2 text-right">{row.itemCount}</td>
                    <td className="px-2 py-2 text-right">{row.supplierCount}</td>
                    <td className="px-2 py-2">{row.selectedSupplierName}</td>
                    <td className="px-2 py-2 text-right">{money(row.selectedOfferAmount)}</td>
                    <td className="px-2 py-2">{row.canStatusName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={() => useSwalInfoAlert("Print", "Canvas print form is not yet configured.")}
          onPost={submit}
          printData={{ can_no: canNo, branch: branchCode, doc_id: docType }}
          onReset={handleReset}
          onSave={save}
          onCancel={cancel}
          onCopy={() => updateState({ canId: "", canNo: "", canStatus: "D", canStatusName: "Draft", canCancelled: false })}
          onAttach={() => openAttachment(supplierRows.find((s) => s.supplierCode === selectedSupplierCode) || supplierRows[0])}
          onUpload={() => useSwalInfoAlert("Upload", "Use Supplier Attachments inside Supplier Offers.")}
          onNotify={submit}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showNotify={hasDocument && isDraft}
          showBIRForm={false}
          showCopyForm={true}
          showUpload={false}
          isViewDocument={false}
          onDetails={() => setTopTab("details")}
          onHistory={() => {
            setTopTab("history");
            loadHistory();
          }}
          disableRouteNavigation={true}
          detailsRoute="/page/CAN"
          isSaveDisabled={isLocked || detailRows.length === 0}
          isResetDisabled={false}
          isAttachDisabled={!supplierRows.some((s) => s.canSupplierId)}
          isNotifyDisabled={!hasDocument || !isDraft}
          isPrintDisabled={!hasDocument || canCancelled}
          isCopyDisabled={!hasDocument}
          isCancelDisabled={!hasDocument || canCancelled || String(canStatus).toUpperCase() === "W"}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>{renderDetails()}</div>
      <div className={topTab === "history" ? "" : "hidden"}>{renderHistory()}</div>

      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {showAllTranDocNo && (
        <AllTranDocNo
          open={showAllTranDocNo}
          onClose={(data) => {
            if (data?.key) {
              fetchCAN({ canNo: data.docNo, branchCode: data.branchCode || branchCode, direction: data.key });
            } else if (data?.docNo) {
              updateState({ canNo: data.docNo, showAllTranDocNo: false });
            } else {
              updateState({ showAllTranDocNo: false });
            }
          }}
          docCode={docType}
          branchCode={branchCode}
        />
      )}

      {showAttachModal && activeSupplierForAttachment && (
        <AttachDocumentModal
          open={showAttachModal}
          onClose={async () => {
            updateState({ showAttachModal: false });
            if (canId) await fetchCAN({ canId });
          }}
          params={{
            DocumentID: activeSupplierForAttachment.canSupplierId,
            DocumentName: `${canNo || "CAN"} - ${activeSupplierForAttachment.supplierName || activeSupplierForAttachment.supplierCode}`,
            BranchCode: branchCode,
            DocumentType: "CAN_SUPPLIER",
          }}
        />
      )}

      {showCancelModal && (
        <CancelTranModal
          open={showCancelModal}
          onClose={closeCancel}
          documentNo={canNo}
          documentType={docType}
        />
      )}

      {showApprovalStatusModal && (
        <GlobalApprovalStatus
          open={showApprovalStatusModal}
          onClose={() => updateState({ showApprovalStatusModal: false })}
          tranId={canId}
          docCode={docType}
          docNo={canNo}
        />
      )}
    </div>
  );
};

export default CAN;
