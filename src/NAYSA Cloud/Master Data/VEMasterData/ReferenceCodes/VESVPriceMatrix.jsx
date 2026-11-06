import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  ChevronDown,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import SearchVEMakeRef from "@/NAYSA Cloud/Lookup/SearchVEMakeRef.jsx";
import SearchVEModelRef from "@/NAYSA Cloud/Lookup/SearchVEModelRef.jsx";
import SearchVETypeRef from "@/NAYSA Cloud/Lookup/SearchVETypeRef.jsx";
import SearchVEServiceTypeRef from "@/NAYSA Cloud/Lookup/SearchVEServiceTypeRef.jsx";
import SearchVEServiceCodeRef from "@/NAYSA Cloud/Lookup/SearchVEServiceCodeRef.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast";
import MSLookupModal from "@/NAYSA Cloud/Lookup/SearchMSMast.jsx";
import FGLookupModal from "@/NAYSA Cloud/Lookup/SearchFGMast.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalErrorAlert as showErrorAlert,
  useSwalSuccessAlert as showSuccessAlert,
  useSwalDeleteConfirm as confirmDelete,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const DOC_TYPE = "VESVPriceMatrix";
const TABS = [
  { key: "service", label: "Service" },
  { key: "history", label: "History" },
];

const EMPTY_MATRIX = {
  id: "", // Stored in background only; generated upon saving
  makeCode: "",
  makeName: "",
  modelCode: "",
  modelName: "",
  typeCode: "",
  typeName: "",
  serviceTypeCode: "",
  serviceTypeName: "",
  effectivity: new Date().toISOString().slice(0, 10),
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const EMPTY_HISTORY = {
  makeCode: "",
  makeName: "",
  modelCode: "",
  modelName: "",
  typeCode: "",
  typeName: "",
  serviceTypeCode: "",
  serviceTypeName: "",
  itemCode: "",
  itemName: "",
  startDate: "",
  endDate: "",
};

const createEmptyRow = (lineNumber = 1, defaults = {}) => ({
  rowKey: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  lineNo: String(lineNumber).padStart(3, "0"),
  serviceCode: defaults.serviceCode || "",
  description: defaults.description || "",
  invType: defaults.invType || "",
  itemCode: defaults.itemCode || "",
  itemName: defaults.itemName || "",
  price: defaults.price ?? "0.00",
  sellingPrice: defaults.sellingPrice ?? "0.00",
});

const safeJson = (value, fallback) => {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
};

const responseResult = (response, fallback = {}) => {
  const result = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (result !== undefined) {
    return safeJson(result, fallback);
  }
  if (response?.data?.data?.[0]) {
    return response.data.data[0];
  }
  return fallback;
};

const numberValue = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const fieldValue = (valueOrEvent) =>
  valueOrEvent?.target?.value ?? valueOrEvent ?? "";

const formatPrice = (value, decimals = 2) =>
  numberValue(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const formatDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

// Normalize reference rows from various endpoints into { code, description, price, raw }
const normalizeReferenceRow = (item, type) => {
  if (!item || typeof item !== "object") return { code: "", description: "", price: 0, raw: {} };

  const pick = (...keys) => {
    for (const k of keys) {
      if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== "") {
        return String(item[k]).trim();
      }
    }
    return "";
  };

  if (type === "make") {
    return {
      code: pick("makeCode", "MAKE_CODE", "veMakeCode", "code"),
      description: pick("makeName", "MAKE_NAME", "veMakeName", "description", "name"),
      raw: item,
    };
  }
  if (type === "model") {
    return {
      code: pick("modelCode", "MODEL_CODE", "veModelCode", "code"),
      description: pick("modelName", "MODEL_NAME", "veModelName", "description", "name"),
      raw: item,
    };
  }
  if (type === "type") {
    return {
      code: pick("typeCode", "TYPE_CODE", "veTypeCode", "VETYPE_CODE", "code"),
      description: pick("typeName", "TYPE_NAME", "veTypeName", "VETYPE_NAME", "description", "name"),
      raw: item,
    };
  }
  if (type === "serviceType") {
    return {
      code: pick("serviceTypeCode", "SERVICE_TYPE_CODE", "servTypeCode", "veServiceTypeCode", "code"),
      description: pick(
        "serviceTypeName",
        "SERVICE_TYPE_NAME",
        "servTypeName",
        "veServiceTypeName",
        "description",
        "name"
      ),
      raw: item,
    };
  }
  if (type === "serviceCode") {
    return {
      code: pick("serviceCode", "SERVICE_CODE", "servCode", "veServiceCode", "code"),
      description: pick(
        "serviceName",
        "SERVICE_NAME",
        "servName",
        "veServiceName",
        "description",
        "DESCRIPTION",
        "name"
      ),
      price: numberValue(item.price ?? item.PRICE ?? item.stdPrice ?? item.servicePrice ?? 0),
      raw: item,
    };
  }

  return {
    code: pick("code", "id"),
    description: pick("description", "name"),
    raw: item,
  };
};

export default function VESVPriceMatrix() {
  const { currentUserRow, companyInfo } = useAuth();
  const priceInputRefs = useRef({});
  const sellingPriceInputRefs = useRef({});

  const [activeTab, setActiveTab] = useState("service");
  const [loading, setLoading] = useState(false);

  const [matrix, setMatrix] = useState(EMPTY_MATRIX);
  const [matrixRows, setMatrixRows] = useState([]);
  const [partsServiceCode, setPartsServiceCode] = useState(null);
  const [itemLookup, setItemLookup] = useState(null);
  const inventoryMenuRef = useRef(null);
  const inventoryTriggerRef = useRef(null);
  const [inventoryMenuPosition, setInventoryMenuPosition] = useState(null);
  const inventoryMenuOpen = Boolean(itemLookup && !["MS", "FG"].includes(itemLookup.invType));

  const [historyFilter, setHistoryFilter] = useState(EMPTY_HISTORY);
  const [historyRows, setHistoryRows] = useState([]);
  const historyRequestRef = useRef(0);
  const [showHistoryItemLookup, setShowHistoryItemLookup] = useState(false);

  // Modal state for Make, Model, Type, Service Type, and Service Code
  const [lookupModal, setLookupModal] = useState({
    isOpen: false,
    type: "", // "make" | "model" | "type" | "serviceType" | "serviceCode"
    target: "matrix", // "matrix" | "history" | "addRow" | "editRow"
    rowIndex: null,
    search: "",
  });

  const priceDecimals = Number(companyInfo?.item_decsellprice ?? 2);
  const userCode = currentUserRow?.userCode || "ADMIN";

  const updateInventoryMenuPosition = () => {
    const trigger = inventoryTriggerRef.current;
    if (!trigger?.isConnected) {
      setItemLookup((prev) => prev && !["MS", "FG"].includes(prev.invType) ? null : prev);
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(240, window.innerWidth - 16);
    const height = inventoryMenuRef.current?.offsetHeight || 160;
    const top = rect.bottom + 6 + height <= window.innerHeight - 8
      ? rect.bottom + 6
      : Math.max(8, rect.top - height - 6);
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    setInventoryMenuPosition({ top, left, width });
  };

  const openInventoryTypeMenu = (event, request) => {
    const trigger = event.currentTarget;
    if (inventoryMenuOpen && inventoryTriggerRef.current === trigger) {
      setItemLookup(null);
      return;
    }
    inventoryTriggerRef.current = trigger;
    updateInventoryMenuPosition();
    setItemLookup({ ...request, invType: "" });
  };

  useEffect(() => {
    if (!inventoryMenuOpen) return;
    const frame = requestAnimationFrame(() => {
      updateInventoryMenuPosition();
      inventoryMenuRef.current?.querySelector('[role="menuitem"]')?.focus();
    });
    const handleOutsideClick = (event) => {
      if (!inventoryMenuRef.current?.contains(event.target) && !inventoryTriggerRef.current?.contains(event.target)) {
        setItemLookup(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape" || event.key === "Tab") {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); }
        setItemLookup(null);
        inventoryTriggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("resize", updateInventoryMenuPosition);
    window.addEventListener("scroll", updateInventoryMenuPosition, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", updateInventoryMenuPosition);
      window.removeEventListener("scroll", updateInventoryMenuPosition, true);
    };
  }, [inventoryMenuOpen]);

  const handleInventoryMenuKeys = (event) => {
    const items = Array.from(inventoryMenuRef.current?.querySelectorAll('[role="menuitem"]') || []);
    if (!items.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : event.key === "ArrowDown" ? (index + 1) % items.length
      : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  useEffect(() => {
    document.title = "Vehicle Service Price Matrix";
  }, []);

  // Keep the existing flat dt1 payload; show one service with its item details.
  const serviceRows = useMemo(() => {
    const groups = new Map();
    matrixRows.forEach((row) => {
      const group = groups.get(row.serviceCode);
      if (group) group.push(row);
      else groups.set(row.serviceCode, [row]);
    });
    return Array.from(groups.values()).map((rows, index) => ({
      ...rows[0],
      serviceLineNo: String(index + 1).padStart(3, "0"),
      price: rows.slice(1).some((row) => numberValue(row.price) !== 0)
        ? formatPrice(rows.reduce((sum, row) => sum + numberValue(row.price), 0), priceDecimals)
        : rows[0].price,
      itemCount: rows.filter((row) => row.itemCode).length,
    }));
  }, [matrixRows, priceDecimals]);

  const selectedService = serviceRows.find((row) => row.serviceCode === partsServiceCode);
  const selectedPartRows = matrixRows.filter(
    (row) => row.serviceCode === partsServiceCode && row.itemCode
  );

  // Auto-calculate Est Service Charge from rows
  const estServiceCharge = useMemo(() => {
    const total = matrixRows.reduce((sum, row) => sum + numberValue(row.price), 0);
    return formatPrice(total, priceDecimals);
  }, [matrixRows, priceDecimals]);

  const generateBackgroundId = (header) => {
    const cleanDate = String(header.effectivity || "").replace(/-/g, "");
    return `${header.makeCode}-${header.modelCode}-${header.typeCode}-${header.serviceTypeCode}-${cleanDate}`.slice(
      0,
      40
    );
  };

  const resetMatrix = () => {
    setMatrix(EMPTY_MATRIX);
    setMatrixRows([]);
    setPartsServiceCode(null);
    setItemLookup(null);
  };

  const resetHistory = () => {
    setHistoryFilter(EMPTY_HISTORY);
    void loadHistory(EMPTY_HISTORY);
  };

  const openLookupModal = (type, target = "matrix", rowIndex = null) => {
    setLookupModal({
      isOpen: true,
      type,
      target,
      rowIndex,
      search: "",
    });
  };

  const closeLookupModal = () => {
    setLookupModal({
      isOpen: false,
      type: "",
      target: "matrix",
      rowIndex: null,
      search: "",
    });
  };

  const handleSelectLookupItem = (item) => {
    const { type, target, rowIndex } = lookupModal;

    if (target === "matrix") {
      setMatrix((prev) => {
        const updated = { ...prev, id: "" }; // Reset background ID when header key changes
        if (type === "make") {
          if (prev.makeCode !== item.code) {
            updated.modelCode = "";
            updated.modelName = "";
          }
          updated.makeCode = item.code;
          updated.makeName = item.description;
        } else if (type === "model") {
          updated.modelCode = item.code;
          updated.modelName = item.description;
        } else if (type === "type") {
          updated.typeCode = item.code;
          updated.typeName = item.description;
        } else if (type === "serviceType") {
          updated.serviceTypeCode = item.code;
          updated.serviceTypeName = item.description;
        }
        return updated;
      });
    } else if (target === "history") {
      setHistoryFilter((prev) => {
        const updated = { ...prev };
        if (type === "make") {
          if (prev.makeCode !== item.code) {
            updated.modelCode = "";
            updated.modelName = "";
          }
          updated.makeCode = item.code;
          updated.makeName = item.description;
        } else if (type === "model") {
          updated.modelCode = item.code;
          updated.modelName = item.description;
        } else if (type === "type") {
          updated.typeCode = item.code;
          updated.typeName = item.description;
        } else if (type === "serviceType") {
          updated.serviceTypeCode = item.code;
          updated.serviceTypeName = item.description;
        }
        return updated;
      });
    } else if (type === "serviceCode" && target === "addRow") {
      if (matrixRows.some((row) => row.serviceCode === item.code)) {
        showErrorAlert("Service Already Added", "Use Parts and Supplies on the existing service row to add items.");
        return;
      }
      setMatrixRows((prev) => {
        const nextLineNo = prev.length + 1;
        return [
          ...prev,
          createEmptyRow(nextLineNo, {
            serviceCode: item.code,
            description: item.description,
            price: formatPrice(item.price || 0, priceDecimals),
          }),
        ];
      });
    } else if (type === "serviceCode" && target === "editRow" && rowIndex !== null) {
      // rowIndex holds the stable row key, so sorting cannot change the target.
      const targetRow = matrixRows.find((row) => row.rowKey === rowIndex);
      if (!targetRow) return;
      if (matrixRows.some((row) => row.serviceCode === item.code && row.serviceCode !== targetRow.serviceCode)) {
        showErrorAlert("Service Already Added", "Select a different Service Code or use the existing service row.");
        return;
      }
      setMatrixRows((prev) =>
        prev.map((row) => row.serviceCode === targetRow.serviceCode
          ? {
              ...row,
              serviceCode: item.code,
              description: item.description || row.description,
              price: row.rowKey === targetRow.rowKey && numberValue(row.price) === 0 && item.price
                ? formatPrice(item.price, priceDecimals)
                : row.price,
            }
          : row)
      );
    }

    closeLookupModal();
  };

  const handleReferenceLookupClose = (selectedItem) => {
    if (!selectedItem) {
      closeLookupModal();
      return;
    }

    handleSelectLookupItem(normalizeReferenceRow(selectedItem, lookupModal.type));
  };

  // Clicking "Add Line" opens the Service Code modal as requested
  const handleAddLineClick = () => {
    openLookupModal("serviceCode", "addRow");
  };

  const renumberRows = (rows) => rows.map((row, index) => ({
    ...row,
    lineNo: String(index + 1).padStart(3, "0"),
  }));

  const removeMatrixRow = (rowKey) => {
    setMatrixRows((prev) => {
      const target = prev.find((row) => row.rowKey === rowKey);
      return target ? renumberRows(prev.filter((row) => row.serviceCode !== target.serviceCode)) : prev;
    });
  };

  const removePartRow = (rowKey) => {
    setMatrixRows((prev) => {
      const target = prev.find((row) => row.rowKey === rowKey);
      if (!target) return prev;
      const first = prev.find((row) => row.serviceCode === target.serviceCode);
      // Preserve the service and any existing service charge when removing its item.
      if (first.rowKey === rowKey || numberValue(target.price) !== 0) {
        return prev.map((row) => row.rowKey === rowKey
          ? { ...row, invType: "", itemCode: "", itemName: "", sellingPrice: formatPrice(0, priceDecimals) }
          : row);
      }
      return renumberRows(prev.filter((row) => row.rowKey !== rowKey));
    });
  };

  const selectInventoryType = (invType) => {
    if (!["MS", "FG"].includes(invType)) return;
    setItemLookup((prev) => prev ? { ...prev, invType } : null);
  };

  const handleItemLookupClose = (selected) => {
    if (selected && itemLookup && ["MS", "FG"].includes(itemLookup.invType)) {
      const records = Array.isArray(selected.records) ? selected.records
        : selected.records ? [selected.records] : Array.isArray(selected) ? selected : [selected];
      const item = records[0];
      const itemCode = String(item?.itemCode || item?.item_code || "").trim().slice(0, 20);
      if (itemCode) {
        setMatrixRows((prev) => {
          const service = prev.find((row) => row.serviceCode === itemLookup.serviceCode);
          if (!service) return prev;
          const target = itemLookup.mode === "edit"
            ? prev.find((row) => row.rowKey === itemLookup.rowKey && row.serviceCode === service.serviceCode)
            : prev.find((row) => row.serviceCode === service.serviceCode && !row.itemCode);
          if (itemLookup.mode === "edit" && !target) return prev;
          const fields = {
            itemCode,
            itemName: String(item.itemName || item.item_name || "").slice(0, 100),
            invType: itemLookup.invType,
          };
          if (target) return prev.map((row) => row.rowKey === target.rowKey ? { ...row, ...fields } : row);
          const newRow = createEmptyRow(prev.length + 1, {
            serviceCode: service.serviceCode,
            description: service.description,
            ...fields,
            // Item rows do not repeat the service charge.
            price: formatPrice(0, priceDecimals),
          });
          let insertAt = prev.length;
          for (let index = prev.length - 1; index >= 0; index--) {
            if (prev[index].serviceCode === service.serviceCode) { insertAt = index + 1; break; }
          }
          return renumberRows([...prev.slice(0, insertAt), newRow, ...prev.slice(insertAt)]);
        });
      }
    }
    setItemLookup(null);
  };

  const updateRowField = (rowKey, field, value) => {
    setMatrixRows((prev) => {
      const target = prev.find((row) => row.rowKey === rowKey);
      if (!target) return prev;
      return prev.map((row) => {
        if ((field === "price" || field === "description") && row.serviceCode === target.serviceCode) {
          return { ...row, [field]: field === "price" && row.rowKey !== rowKey ? "0.00" : value };
        }
        return row.rowKey === rowKey ? { ...row, [field]: value } : row;
      });
    });
  };

  const updateNumericField = (rowKey, field, value) => {
    const clean = String(value ?? "").replace(/,/g, "");
    if (clean !== "" && !/^\d*(\.\d*)?$/.test(clean)) return;
    updateRowField(rowKey, field, clean);
  };

  const focusNumericField = (rowKey, field) => {
    const row = (field === "price" ? serviceRows : matrixRows).find((item) => item.rowKey === rowKey);
    if (!row) return;
    const raw = String(row[field] ?? "").replace(/,/g, "").trim();
    updateRowField(rowKey, field, numberValue(raw) === 0 ? "" : raw);
  };

  const blurNumericField = (rowKey, field) => {
    const row = (field === "price" ? serviceRows : matrixRows).find((item) => item.rowKey === rowKey);
    if (row) updateRowField(rowKey, field, formatPrice(row[field], priceDecimals));
  };

  const handleNumericEnter = (event, row, field, refMap) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    blurNumericField(row.rowKey, field);

    const visibleRows = field === "price" ? serviceRows : selectedPartRows;
    const currentIndex = visibleRows.findIndex((item) => item.rowKey === row.rowKey);
    const nextRow = visibleRows[currentIndex + 1];
    if (!nextRow) return;

    setTimeout(() => {
      const nextInput = refMap.current[nextRow.rowKey];
      nextInput?.focus();
      nextInput?.select?.();
    }, 0);
  };

  const findMatrix = async () => {
    if (
      !matrix.makeCode ||
      !matrix.modelCode ||
      !matrix.typeCode ||
      !matrix.serviceTypeCode ||
      !matrix.effectivity
    ) {
      showErrorAlert(
        "Find",
        "Vehicle Make, Vehicle Model, Vehicle Type, Service Type, and Effectivity Date are required."
      );
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get("/getVESVPriceMatrix", {
        params: {
          json_data: JSON.stringify({
            id: matrix.id || generateBackgroundId(matrix),
            makeCode: matrix.makeCode,
            modelCode: matrix.modelCode,
            typeCode: matrix.typeCode,
            serviceTypeCode: matrix.serviceTypeCode,
            effectivity: matrix.effectivity,
          }),
        },
      });

      const result = responseResult(response, {});
      const resolvedResult = Array.isArray(result) ? result[0] || {} : result;

      setMatrix((prev) => ({
        ...prev,
        ...resolvedResult,
        id: resolvedResult.id || prev.id || generateBackgroundId(prev),
        effectivity: formatDateInput(resolvedResult.effectivity || prev.effectivity),
      }));

      const details = Array.isArray(resolvedResult?.dt1) ? resolvedResult.dt1 : [];
      setMatrixRows(
        details.map((row, idx) => ({
          ...row,
          rowKey: `${row.lineNo || idx + 1}-${row.serviceCode || row.itemCode || idx}`,
          lineNo: String(row.lineNo || idx + 1).padStart(3, "0"),
          serviceCode: row.serviceCode || "",
          description: row.description || row.serviceName || "",
          invType: row.invType || "",
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          price: formatPrice(row.price, priceDecimals),
          sellingPrice: formatPrice(row.sellingPrice, priceDecimals),
        }))
      );
    } catch (error) {
      showErrorAlert(
        "Find Failed",
        error?.response?.data?.message || error?.message || "Unable to load matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  const saveMatrix = async () => {
    if (
      !matrix.makeCode ||
      !matrix.modelCode ||
      !matrix.typeCode ||
      !matrix.serviceTypeCode ||
      !matrix.effectivity
    ) {
      showErrorAlert(
        "Required Fields",
        "Vehicle Make, Vehicle Model, Vehicle Type, Service Type, and Effectivity Date are required."
      );
      return;
    }

    if (!matrixRows.length) {
      showErrorAlert("Required Lines", "Please add at least one service line item.");
      return;
    }

    const invalidLine = matrixRows.find((r) => !String(r.serviceCode).trim());
    if (invalidLine) {
      showErrorAlert(
        "Incomplete Line Item",
        `Line ${invalidLine.lineNo} requires a Service Code.`
      );
      return;
    }

    setLoading(true);
    try {
      // Generate ID in background upon saving
      const generatedId = matrix.id || generateBackgroundId(matrix);

      const payload = {
        id: generatedId,
        makeCode: matrix.makeCode.trim().slice(0, 10),
        modelCode: matrix.modelCode.trim().slice(0, 10),
        typeCode: matrix.typeCode.trim().slice(0, 10),
        serviceTypeCode: matrix.serviceTypeCode.trim().slice(0, 10),
        effectivity: matrix.effectivity,
        estServiceCharge: numberValue(estServiceCharge),
        userCode,
        dt1: matrixRows.map((row, index) => ({
          lineNo: String(row.lineNo || index + 1).padStart(3, "0").slice(0, 10),
          serviceCode: String(row.serviceCode || "").trim().slice(0, 10),
          description: String(row.description || "").trim().slice(0, 150),
          price: numberValue(row.price),
          invType: String(row.invType || "").trim().slice(0, 10),
          itemCode: String(row.itemCode || "").trim().slice(0, 20),
          itemName: String(row.itemName || "").trim().slice(0, 100),
          sellingPrice: numberValue(row.sellingPrice),
        })),
      };

      const response = await apiClient.post("/upsertVESVPriceMatrix", {
        json_data: payload,
      });

      if (response?.data?.success === false) {
        throw new Error(response?.data?.message || "Unable to save matrix.");
      }

      setMatrix((prev) => ({ ...prev, id: generatedId }));
      showSuccessAlert("Saved", "Vehicle service price matrix saved successfully.");
      await findMatrix();
    } catch (error) {
      showErrorAlert(
        "Save Failed",
        error?.response?.data?.message || error?.message || "Unable to save matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteMatrix = async () => {
    if (!matrix.id) return;
    const answer = await Swal.fire({
      title: "Delete Vehicle Service Price Matrix?",
      text: "This vehicle service price matrix and all its line items will be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!answer.isConfirmed) return;

    setLoading(true);
    try {
      await apiClient.post("/deleteVESVPriceMatrix", {
        json_data: {
          id: matrix.id,
          makeCode: matrix.makeCode,
          modelCode: matrix.modelCode,
          typeCode: matrix.typeCode,
          serviceTypeCode: matrix.serviceTypeCode,
          effectivity: matrix.effectivity,
          userCode,
        },
      });
      resetMatrix();
      showSuccessAlert("Deleted", "Vehicle service price matrix deleted successfully.");
    } catch (error) {
      showErrorAlert(
        "Delete Failed",
        error?.response?.data?.message || error?.message || "Unable to delete matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (filters) => {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      showErrorAlert("Invalid Date Range", "Start Date must not be later than End Date.");
      return;
    }

    const requestId = ++historyRequestRef.current;
    setLoading(true);
    try {
      // Send null for empty dates. SQL Server can convert an empty string to 1900-01-01.
      const payload = {
        ...filters,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
      };
      const response = await apiClient.get("/historyVESVPriceMatrix", {
        params: { json_data: JSON.stringify(payload) },
      });
      const first = response?.data?.data?.[0];
      if (response?.data?.success === false || Number(first?.errorcount || 0) > 0) {
        throw new Error(response?.data?.message || first?.errormsg || "Unable to load history.");
      }
      const result = responseResult(response, null);
      if (!Array.isArray(result)) {
        throw new Error("The History response is invalid. Please check the History API result.");
      }
      if (requestId !== historyRequestRef.current) return;
      setHistoryRows(result.map((row, index) => ({
        ...row,
        rowKey: `${row.id}-${row.lineNo}-${index}`,
      })));
    } catch (error) {
      if (requestId !== historyRequestRef.current) return;
      setHistoryRows([]);
      showErrorAlert(
        "History Failed",
        error?.response?.data?.message || error?.message || "Unable to load history."
      );
    } finally {
      if (requestId === historyRequestRef.current) setLoading(false);
    }
  };

  const findHistory = () => loadHistory(historyFilter);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === "history") void findHistory();
  };

  const retrieveHistory = async (row) => {
    setMatrix({
      ...EMPTY_MATRIX,
      id: row.id,
      makeCode: row.makeCode,
      modelCode: row.modelCode,
      typeCode: row.typeCode,
      serviceTypeCode: row.serviceTypeCode,
      effectivity: formatDateInput(row.effectivity),
    });
    setActiveTab("service");
    setLoading(true);
    try {
      const response = await apiClient.get("/getVESVPriceMatrix", {
        params: {
          json_data: JSON.stringify({ id: row.id }),
        },
      });
      const result = responseResult(response, {});
      const resolvedResult = Array.isArray(result) ? result[0] || {} : result;

      setMatrix((prev) => ({
        ...prev,
        ...resolvedResult,
        id: resolvedResult.id || row.id,
        effectivity: formatDateInput(resolvedResult.effectivity || row.effectivity),
      }));
      setMatrixRows(
        (resolvedResult?.dt1 || []).map((item, idx) => ({
          ...item,
          rowKey: `${item.lineNo || idx + 1}-${item.serviceCode || item.itemCode || idx}`,
          lineNo: String(item.lineNo || idx + 1).padStart(3, "0"),
          serviceCode: item.serviceCode || "",
          description: item.description || item.serviceName || "",
          price: formatPrice(item.price, priceDecimals),
          sellingPrice: formatPrice(item.sellingPrice, priceDecimals),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryRow = async (row) => {
    const confirm = await confirmDelete(
      "Delete Record?",
      `Are you sure you want to delete Matrix (${row.makeCode} / ${row.modelCode} / ${row.serviceTypeCode})?`,
      "Yes, delete it"
    );
    if (!confirm?.isConfirmed) return;

    setLoading(true);
    try {
      const response = await apiClient.post("/deleteVESVPriceMatrix", {
        json_data: {
          id: row.id,
          makeCode: row.makeCode,
          modelCode: row.modelCode,
          typeCode: row.typeCode,
          serviceTypeCode: row.serviceTypeCode,
          effectivity: row.effectivity,
          userCode,
        },
      });
      if (response?.data?.success === false) {
        throw new Error(response?.data?.message || "Unable to delete matrix.");
      }
      setHistoryRows((prev) => prev.filter((item) => item.id !== row.id));
      showSuccessAlert("Deleted", "Vehicle service price matrix deleted successfully.");
    } catch (error) {
      showErrorAlert(
        "Delete Failed",
        error?.response?.data?.message || error?.message || "Unable to delete matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  // Columns for "Service" Tab matching screenshot: LN | Service Code | Description | Price
  const serviceColumns = [
    {
      key: "__actions",
      label: "Action",
      width: 70,
      sortable: false,
      filterable: false,
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeMatrixRow(row.rowKey);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
          title="Remove Line"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
    {
      key: "lineNo",
      label: "LN",
      width: 80,
      render: (row) => (
        <input
          className="w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-center text-xs outline-none"
          value={row.serviceLineNo ?? row.lineNo ?? ""}
          readOnly
        />
      ),
    },
    {
      key: "serviceCode",
      label: "Service Code",
      width: 170,
      render: (row, rowIndex) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs uppercase outline-none focus:border-blue-500"
            maxLength={10}
            placeholder="SERVICE CODE"
            value={row.serviceCode ?? ""}
            readOnly
          />
          <button
            type="button"
            onClick={() => openLookupModal("serviceCode", "editRow", row.rowKey)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white"
            title="Lookup Service Code"
          >
            <Search size={12} />
          </button>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      width: 380,
      render: (row) => (
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500"
          maxLength={150}
          placeholder="Description"
          value={row.description ?? ""}
          onChange={(e) => updateRowField(row.rowKey, "description", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "price",
      label: "Price",
      width: 150,
      render: (row) => (
        <input
          ref={(el) => {
            if (el) priceInputRefs.current[row.rowKey] = el;
            else delete priceInputRefs.current[row.rowKey];
          }}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs outline-none focus:border-blue-500"
          value={row.price ?? ""}
          onChange={(e) => updateNumericField(row.rowKey, "price", e.target.value)}
          onFocus={() => focusNumericField(row.rowKey, "price")}
          onBlur={() => blurNumericField(row.rowKey, "price")}
          onKeyDown={(e) => handleNumericEnter(e, row, "price", priceInputRefs)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "__parts",
      label: "Parts and Supplies",
      width: 190,
      sortable: false,
      filterable: false,
      render: (row) => (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); setPartsServiceCode(row.serviceCode); }}
          disabled={loading || !row.serviceCode}
          className="flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
          title={`Parts and Supplies for ${row.serviceCode}`}
        >
          <Plus size={14} /> Parts and Supplies ({row.itemCount})
        </button>
      ),
    },
  ];

  // Item details belonging to the selected Service Code
  const partsColumns = [
    {
      key: "__actions",
      label: "Action",
      width: 70,
      sortable: false,
      filterable: false,
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removePartRow(row.rowKey);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
          title="Remove Item"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
    {
      key: "lineNo",
      label: "LN",
      width: 80,
      render: (row) => (
        <input
          className="w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-center text-xs outline-none"
          value={row.lineNo ?? ""}
          readOnly
        />
      ),
    },
    {
      key: "invType",
      label: "Inv Type",
      width: 110,
      render: (row) => (
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs uppercase outline-none focus:border-blue-500"
          maxLength={10}
          placeholder="INV TYPE"
          value={row.invType ?? ""}
          readOnly
          title="Inventory type is set when selecting the item."
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "itemCode",
      label: "Item Code",
      width: 160,
      render: (row, rowIndex) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs uppercase outline-none focus:border-blue-500"
            maxLength={20}
            placeholder="ITEM CODE"
            value={row.itemCode ?? ""}
            readOnly
          />
          <button
            type="button"
            onClick={(event) => openInventoryTypeMenu(event, { mode: "edit", serviceCode: row.serviceCode, rowKey: row.rowKey })}
            aria-haspopup="menu"
            aria-expanded={inventoryMenuOpen && itemLookup?.mode === "edit" && itemLookup?.rowKey === row.rowKey}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white"
            title="Lookup Item"
          >
            <Search size={12} />
          </button>
        </div>
      ),
    },
    {
      key: "itemName",
      label: "Item Name",
      width: 240,
      render: (row) => (
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500"
          maxLength={100}
          placeholder="ITEM NAME"
          value={row.itemName ?? ""}
          onChange={(e) => updateRowField(row.rowKey, "itemName", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "sellingPrice",
      label: "Selling Price",
      width: 140,
      render: (row) => (
        <input
          ref={(el) => {
            if (el) sellingPriceInputRefs.current[row.rowKey] = el;
            else delete sellingPriceInputRefs.current[row.rowKey];
          }}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs outline-none focus:border-blue-500"
          value={row.sellingPrice ?? ""}
          onChange={(e) =>
            updateNumericField(row.rowKey, "sellingPrice", e.target.value)
          }
          onFocus={() => focusNumericField(row.rowKey, "sellingPrice")}
          onBlur={() => blurNumericField(row.rowKey, "sellingPrice")}
          onKeyDown={(e) =>
            handleNumericEnter(e, row, "sellingPrice", sellingPriceInputRefs)
          }
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
  ];

  const historyColumns = [
    {
      key: "__actions",
      label: "Action",
      sortable: false,
      filterable: false,
      width: 90,
      render: (row) => (
        <div className="flex items-center justify-start gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              retrieveHistory(row);
            }}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-50"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteHistoryRow(row);
            }}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
    {
      key: "effectivity",
      label: "Effectivity",
      width: 120,
      render: (row) => formatDateInput(row.effectivity),
    },
    { key: "makeCode", label: "Vehicle Make", width: 110 },
    { key: "modelCode", label: "Vehicle Model", width: 110 },
    { key: "typeCode", label: "Vehicle Type", width: 110 },
    { key: "serviceTypeCode", label: "Service Type", width: 120 },
    { key: "lineNo", label: "LN", width: 80 },
    { key: "serviceCode", label: "Service Code", width: 120 },
    { key: "description", label: "Description", width: 220 },
    { key: "invType", label: "Inv Type", width: 100 },
    { key: "itemCode", label: "Item Code", width: 120 },
    { key: "itemName", label: "Item Name", width: 160 },
    {
      key: "price",
      label: "Price",
      width: 120,
      render: (row) => (
        <div className="text-right">{formatPrice(row.price, priceDecimals)}</div>
      ),
    },
    {
      key: "sellingPrice",
      label: "Selling Price",
      width: 130,
      render: (row) => (
        <div className="text-right">
          {formatPrice(row.sellingPrice, priceDecimals)}
        </div>
      ),
    },
  ];

  const formatDisplayValue = (code, name) => {
    if (!code) return "";
    return name ? `${code} - ${name}` : code;
  };

  const actionButton = (label, Icon, onClick, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
    >
      <Icon size={14} />
      <span className="ml-1 hidden sm:inline">{label}</span>
    </button>
  );

  const renderActions = () => {
    if (activeTab === "service") {
      return (
        <>
          {actionButton(
            "Find",
            Search,
            findMatrix,
            !matrix.makeCode ||
              !matrix.modelCode ||
              !matrix.typeCode ||
              !matrix.serviceTypeCode ||
              !matrix.effectivity
          )}
          {actionButton("Add Line", Plus, handleAddLineClick)}
          {actionButton("Save", Save, saveMatrix, !matrixRows.length)}
          {actionButton("Delete", Trash2, deleteMatrix, !matrix.id)}
          {actionButton("Reset", Undo2, resetMatrix)}
        </>
      );
    }
    return (
      <>
        {actionButton("Find", Search, findHistory)}
        {actionButton("Reset", Undo2, resetHistory)}
      </>
    );
  };

  return (
    <div className="global-ref-main-div-ui" style={{ minWidth: 0, maxWidth: "100%" }}>
      {loading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <h1 className="global-ref-headertext-ui min-w-0 text-center xl:text-left">
            Vehicle Service Price Matrix
          </h1>

          <div className="flex w-full min-w-0 justify-center xl:w-auto xl:justify-self-center">
            <div className="no-scrollbar flex flex-nowrap overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-[12px] font-bold transition-all ${
                    activeTab === tab.key
                      ? "border-blue-600 bg-blue-50/50 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-blue-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 whitespace-nowrap text-xs xl:justify-end xl:justify-self-end">
            {renderActions()}
          </div>
        </div>
      </div>

      <div className="global-tran-tab-div-ui min-w-0 max-w-full px-3 pb-4 pt-44 sm:px-4 sm:pt-32 md:mt-24 md:p-6">
        {(activeTab === "service") && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="rounded-xl border bg-white p-4 shadow-sm md:col-span-9">
                <h3 className="mb-3 border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Vehicle Service Price Matrix Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FieldRenderer
                    label="Vehicle Make"
                    type="lookup"
                    value={formatDisplayValue(matrix.makeCode, matrix.makeName)}
                    onLookup={() => openLookupModal("make", "matrix")}
                    readOnly
                    required
                  />
                  <FieldRenderer
                    label="Vehicle Model"
                    type="lookup"
                    value={formatDisplayValue(matrix.modelCode, matrix.modelName)}
                    onLookup={() => openLookupModal("model", "matrix")}
                    readOnly
                    required
                  />
                  <FieldRenderer
                    label="Vehicle Type"
                    type="lookup"
                    value={formatDisplayValue(matrix.typeCode, matrix.typeName)}
                    onLookup={() => openLookupModal("type", "matrix")}
                    readOnly
                    required
                  />
                  <FieldRenderer
                    label="Service Type"
                    type="lookup"
                    value={formatDisplayValue(
                      matrix.serviceTypeCode,
                      matrix.serviceTypeName
                    )}
                    onLookup={() => openLookupModal("serviceType", "matrix")}
                    readOnly
                    required
                  />
                  <FieldRenderer
                    label="Effectivity Date"
                    type="date"
                    value={matrix.effectivity}
                    onChange={(e) => {
                      const val = fieldValue(e);
                      setMatrix((prev) => ({
                        ...prev,
                        id: "",
                        effectivity: val,
                      }));
                    }}
                    required
                  />
                  <FieldRenderer
                    label="Est Service Charge"
                    type="text"
                    value={estServiceCharge}
                    readOnly
                  />
                </div>
              </div>
              <div className="md:col-span-3">
                <RegistrationInfo data={matrix} layout="minimize" />
              </div>
            </div>

            <div className="global-tran-table-main-div-ui mt-4 min-w-0 max-w-full overflow-x-auto rounded-xl border bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={`${DOC_TYPE}ServiceDetails`}
                columns={serviceColumns}
                data={serviceRows}
                itemsPerPage={200}
                showFilters
                showGlobalSearch
                isLoading={loading}
              />
            </div>
          </>
        )}

        {activeTab === "history" && (
          <>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="mb-3 border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Vehicle Service Price Matrix History
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <FieldRenderer
                  label="Vehicle Make"
                  type="lookup"
                  value={formatDisplayValue(
                    historyFilter.makeCode,
                    historyFilter.makeName
                  )}
                  onLookup={() => openLookupModal("make", "history")}
                  readOnly
                />
                <FieldRenderer
                  label="Vehicle Model"
                  type="lookup"
                  value={formatDisplayValue(
                    historyFilter.modelCode,
                    historyFilter.modelName
                  )}
                  onLookup={() => openLookupModal("model", "history")}
                  readOnly
                />
                <FieldRenderer
                  label="Vehicle Type"
                  type="lookup"
                  value={formatDisplayValue(
                    historyFilter.typeCode,
                    historyFilter.typeName
                  )}
                  onLookup={() => openLookupModal("type", "history")}
                  readOnly
                />
                <FieldRenderer
                  label="Service Type"
                  type="lookup"
                  value={formatDisplayValue(
                    historyFilter.serviceTypeCode,
                    historyFilter.serviceTypeName
                  )}
                  onLookup={() => openLookupModal("serviceType", "history")}
                  readOnly
                />
                <FieldRenderer
                  label="Item Code - Item Name"
                  type="lookup"
                  value={
                    historyFilter.itemCode
                      ? `${historyFilter.itemCode}${
                          historyFilter.itemName ? ` - ${historyFilter.itemName}` : ""
                        }`
                      : ""
                  }
                  onLookup={() => setShowHistoryItemLookup(true)}
                  readOnly
                />
                <FieldRenderer
                  label="Start Date"
                  type="date"
                  value={historyFilter.startDate}
                  onChange={(e) =>
                    setHistoryFilter((prev) => ({
                      ...prev,
                      startDate: fieldValue(e),
                    }))
                  }
                />
                <FieldRenderer
                  label="End Date"
                  type="date"
                  value={historyFilter.endDate}
                  onChange={(e) =>
                    setHistoryFilter((prev) => ({
                      ...prev,
                      endDate: fieldValue(e),
                    }))
                  }
                />
              </div>
            </div>

            <div className="global-tran-table-main-div-ui mt-4 min-w-0 max-w-full overflow-x-auto rounded-xl border bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={`${DOC_TYPE}History`}
                columns={historyColumns}
                data={historyRows}
                itemsPerPage={50}
                showFilters
                showGlobalSearch
                showGroupBy
                onRowDoubleClick={retrieveHistory}
                isLoading={loading}
              />
            </div>
          </>
        )}
      </div>

      {/* Shared reference lookups for the matrix and History filter. */}
      {lookupModal.isOpen && lookupModal.type === "make" && (
        <SearchVEMakeRef
          isOpen={lookupModal.isOpen}
          onClose={handleReferenceLookupClose}
        />
      )}

      {lookupModal.isOpen && lookupModal.type === "model" && (
        <SearchVEModelRef
          isOpen={lookupModal.isOpen}
          makeCode={lookupModal.target === "history" ? historyFilter.makeCode : matrix.makeCode}
          onClose={handleReferenceLookupClose}
        />
      )}

      {lookupModal.isOpen && lookupModal.type === "type" && (
        <SearchVETypeRef
          isOpen={lookupModal.isOpen}
          onClose={handleReferenceLookupClose}
        />
      )}

      {lookupModal.isOpen && lookupModal.type === "serviceType" && (
        <SearchVEServiceTypeRef
          isOpen={lookupModal.isOpen}
          onClose={handleReferenceLookupClose}
        />
      )}

      {lookupModal.isOpen && lookupModal.type === "serviceCode" && (
        <SearchVEServiceCodeRef
          isOpen={lookupModal.isOpen}
          onClose={handleReferenceLookupClose}
        />
      )}

      {selectedService && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="matrix-parts-title"
            className="flex max-h-[85vh] w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-xl border bg-white shadow-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-100 px-4 py-3">
              <div>
                <h2 id="matrix-parts-title" className="text-sm font-bold text-slate-700">Parts and Supplies</h2>
                <p className="mt-1 text-xs text-slate-600">{selectedService.serviceCode} — {selectedService.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => openInventoryTypeMenu(event, { mode: "add", serviceCode: selectedService.serviceCode })}
                  aria-haspopup="menu"
                  aria-expanded={inventoryMenuOpen && itemLookup?.mode === "add"}
                  aria-controls={inventoryMenuOpen && itemLookup?.mode === "add" ? "matrix-inventory-type-menu" : undefined}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={14} /> Add Parts / Supplies
                  <span className="ml-2 border-l border-blue-400 pl-2">
                    <ChevronDown size={14} />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setItemLookup(null); setPartsServiceCode(null); }}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-200"
                  aria-label="Close Parts and Supplies"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="min-h-0 min-w-0 overflow-auto p-4">
              <SearchGlobalReferenceTable
                docType={`${DOC_TYPE}PartsDetails`}
                columns={partsColumns}
                data={selectedPartRows}
                itemsPerPage={200}
                showFilters
                showGlobalSearch
                isLoading={loading}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <p className="text-xs text-slate-500">Items are saved together with the matrix using Save.</p>
              <button
                type="button"
                onClick={() => { setItemLookup(null); setPartsServiceCode(null); }}
                className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >Done</button>
            </div>
          </section>
        </div>
      )}

      {inventoryMenuOpen && inventoryMenuPosition && createPortal(
        <div
          ref={inventoryMenuRef}
          id="matrix-inventory-type-menu"
          role="menu"
          aria-label="Inventory type"
          onKeyDown={handleInventoryMenuKeys}
          className="fixed z-[70] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          style={inventoryMenuPosition}
        >
          <div className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Inventory Type</div>
          {[
            { code: "FG", label: "Finished Goods" },
            { code: "MS", label: "Materials & Supplies" },
          ].map((option) => (
            <button
              key={option.code}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => selectInventoryType(option.code)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
            >
              <Box size={21} className="shrink-0 text-blue-600" />
              <span>
                <span className="block text-xs font-semibold text-slate-800">{option.code}</span>
                <span className="block text-[11px] text-slate-500">{option.label}</span>
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}

      {itemLookup?.invType === "MS" && (
        <MSLookupModal
          isOpen={true}
          customParam=""
          enableMultiSelect={false}
          onClose={handleItemLookupClose}
        />
      )}

      {itemLookup?.invType === "FG" && (
        <FGLookupModal
          isOpen={true}
          customParam="ActiveAll"
          onClose={handleItemLookupClose}
        />
      )}

      {showHistoryItemLookup && (
        <ItemMastLookupModal
          isOpen={showHistoryItemLookup}
          endpoint="getInvLookupFG"
          enableMultiSelect={false}
          docType="MATRIX"
          onClose={(selected) => {
            if (selected) {
              const records = Array.isArray(selected.records)
                ? selected.records
                : selected.records
                ? [selected.records]
                : [];
              const item = records[0] || selected;
              setHistoryFilter((prev) => ({
                ...prev,
                itemCode: item?.itemCode || item?.item_code || "",
                itemName: item?.itemName || item?.item_name || "",
              }));
              setHistoryRows([]);
            }
            setShowHistoryItemLookup(false);
          }}
        />
      )}
    </div>
  );
}
