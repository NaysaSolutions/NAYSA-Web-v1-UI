import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxesStacked,
  faCheck,
  faCircleXmark,
  faFilter,
  faMagnifyingGlass,
  faRotateLeft,
  faWandMagicSparkles,
  faWarehouse,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import { fetchDataJson, postRequest } from "../Configuration/BaseURL.jsx";

/**
 * SearchWOIS
 * ----------
 * Modern React + Tailwind conversion of the legacy VB.NET
 * "Work Order / Issue Slip Item Details" screen.
 *
 * Expected row shapes are flexible. The component accepts either
 * camelCase or common SQL-style uppercase field names.
 *
 * Props:
 * - isOpen
 * - onClose
 * - onSelectWorkOrder
 * - onApply
 * - branchCode
 * - whouseCode
 * - locCode
 * - endpoint
 * - requestMethod
 * - docType
 * - issueItems
 * - inventoryRows
 * - loading
 */
const SearchWOIS = ({
  isOpen = true,
  onClose,
  onCancel,
  onSelectWorkOrder,
  onSelectIssueItem,
  filterWorkOrders,
  onApply,

  // Same WO reference inputs used by SearchWO.jsx
  branchCode = "",
  whouseCode = "",
  locCode = "",
  endpoint = "getFGISWO",
  requestMethod = "post",
  docType = "FGIS",
  moduleLabel = "FGIS",
  documentID = "",
  documentNo = "",
  userCode = "",

  title = "Work Order Issue Slip",
  subtitle = "Released Work Orders only - WO_STATUS = R and Remaining Qty > 0",
  noRecordMessage = "No released Work Order available.",
  tipMessage = "Select a Work Order to load its issue-slip requirements.",

  issueItems = [],
  inventoryRows = [],
  loading = false,
}) => {
  const [search, setSearch] = useState("");
  const [workOrders, setWorkOrders] = useState([]);
  const [woLoading, setWoLoading] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [selectedInventoryIndex, setSelectedInventoryIndex] = useState(null);
  const [allocationRows, setAllocationRows] = useState([]);
  const [existingAllocations, setExistingAllocations] = useState([]);
  const [allocationLoading, setAllocationLoading] = useState(false);

  const label = moduleLabel || docType || "transaction";

  const valueOf = (row, ...keys) => {
    if (!row) return "";

    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null) return value;
    }

    const normalized = Object.entries(row).reduce((acc, [key, value]) => {
      acc[String(key).replace(/[_\s-]/g, "").toLowerCase()] = value;
      return acc;
    }, {});

    for (const key of keys) {
      const normalizedKey = String(key).replace(/[_\s-]/g, "").toLowerCase();
      if (
        normalized[normalizedKey] !== undefined &&
        normalized[normalizedKey] !== null
      ) {
        return normalized[normalizedKey];
      }
    }

    return "";
  };

  const num = (value) => {
    const parsed = Number(String(value ?? 0).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const qty = (value) =>
    num(value).toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString();
  };

  const unwrapResult = (value) => {
    if (value?.data?.data !== undefined) return unwrapResult(value.data.data);
    if (value?.data !== undefined) return unwrapResult(value.data);

    if (Array.isArray(value) && value[0]?.result !== undefined) {
      return unwrapResult(value[0].result);
    }

    if (value?.result !== undefined) {
      return unwrapResult(value.result);
    }

    if (typeof value === "string") {
      try {
        return unwrapResult(JSON.parse(value));
      } catch {
        return [];
      }
    }

    return value;
  };

  const toRows = (response) => {
    const parsed = unwrapResult(response);

    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];

    return [];
  };

  const parseSprocResult = (response) => {
    const parsed = unwrapResult(response);

    if (Array.isArray(parsed)) return parsed[0] || {};
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  };

  const getIssueInventoryType = (issueItem = {}) => {
    const rawType = String(
      valueOf(
        issueItem,
        "invType",
        "INV_TYPE",
        "type",
        "TYPE",
        "inventoryType",
        "INVENTORY_TYPE"
      ) || "FG"
    )
      .trim()
      .toUpperCase();

    if (rawType.includes("RM") || rawType.includes("RAW")) return "RM";
    if (rawType.includes("MS") || rawType.includes("MATERIAL") || rawType.includes("SUPPL")) return "MS";
    return "FG";
  };

  const isFGIssueItem = (issueItem = {}) => getIssueInventoryType(issueItem) === "FG";

  const getIssueItemCode = (issueItem = {}) =>
    valueOf(issueItem, "itemCode", "ITEM_CODE", "item_code", "fgCode", "FG_CODE", "rmCode", "RM_CODE", "msCode", "MS_CODE");

  const getIssueItemName = (issueItem = {}) =>
    valueOf(issueItem, "itemName", "ITEM_NAME", "item_name", "itemDesc", "ITEM_DESC", "fgName", "FG_NAME", "rmName", "RM_NAME", "msName", "MS_NAME");

  const getAllocationEndpoint = (issueItem = {}) => {
    const invType = getIssueInventoryType(issueItem);

    return {
      FG: "getFGUpdateStockAllocation",
    }[invType];
  };

  const getStockIdKeys = (issueItem = {}) => {
    const invType = getIssueInventoryType(issueItem);
    const prefix = invType.toLowerCase();

    return {
      fifoProp: `${prefix}FifoLocId`,
      wacProp: `${prefix}WacLocId`,
      fifoSql: `${prefix}fifo_loc_id`,
      wacSql: `${prefix}wac_loc_id`,
    };
  };

  const normalizeAllocationRow = (row = {}, index = 0, issueItem = {}) => {
    const { fifoProp, wacProp, fifoSql, wacSql } = getStockIdKeys(issueItem);
    const qtyHandValue = valueOf(row, "onHandQty", "qtyHand", "qtyOnHand", "QTY_HAND", "ON_HAND_QTY") || 0;
    const qtyAllocatedValue = valueOf(row, "allocatedQty", "qtyAllocated", "QTY_ALLOCATED") || 0;
    const qtyAvailableValue = valueOf(row, "remainingAvailable", "qtyAvailable", "QTY_AVAILABLE") || qtyHandValue;
    const qtyPickedValue = valueOf(row, "pickQty", "qtyPicked", "QTY_PICKED") || 0;
    const unitCostValue = valueOf(row, "unitCost", "unit_cost", "UNIT_COST", "cost", "itemCost", "unitPrice", "wac", "WAC") || 0;
    const wacValue = valueOf(row, "wac", "WAC", "unitCost", "unit_cost", "UNIT_COST") || 0;

    return {
      ...row,
      id: valueOf(row, "id", "ID") || `${valueOf(row, "stockCardRefId", "STOCK_CARD_REF_ID") || index}`,
      lnNo: valueOf(row, "priorityNo", "lineNo", "LINE_NO") || index + 1,
      itemCode:
        valueOf(row, "itemCode", "ITEM_CODE", "item_code", "fgCode", "FG_CODE") ||
        getIssueItemCode(issueItem),
      whCode: valueOf(row, "warehouseCode", "whouseCode", "whCode", "WH_CODE"),
      whouseCode: valueOf(row, "warehouseCode", "whouseCode", "whCode", "WH_CODE"),
      warehouseCode: valueOf(row, "warehouseCode", "whouseCode", "whCode", "WH_CODE"),
      locCode: valueOf(row, "locationCode", "locCode", "LOC_CODE"),
      locationCode: valueOf(row, "locationCode", "locCode", "LOC_CODE"),
      lotNo: valueOf(row, "lotNo", "LOT_NO"),
      controlNo: valueOf(row, "controlNo", "CONTROL_NO", "stockCardRefId", "orderId"),
      bbDate: valueOf(row, "bestBeforeDate", "bbDate", "BB_DATE"),
      bestBeforeDate: valueOf(row, "bestBeforeDate", "bbDate", "BB_DATE"),
      qcStatus: valueOf(row, "qualityStatus", "qstatCode", "QC_STATUS", "QSTAT_CODE"),
      qualityStatus: valueOf(row, "qualityStatus", "qstatCode", "QC_STATUS", "QSTAT_CODE"),
      qtyHand: qtyHandValue,
      qtyOnHand: qtyHandValue,
      onHandQty: qtyHandValue,
      qtyAllocated: qtyAllocatedValue,
      allocatedQty: qtyAllocatedValue,
      qtyAvailable: qtyAvailableValue,
      remainingAvailable: qtyAvailableValue,
      qtyPicked: qtyPickedValue,
      pickQty: qtyPickedValue,
      balance: Math.max(num(qtyAvailableValue) - num(qtyPickedValue), 0),
      unitCost: unitCostValue,
      unit_cost: unitCostValue,
      wac: wacValue,
      [fifoProp]: valueOf(row, fifoProp, fifoSql),
      [wacProp]: valueOf(row, wacProp, wacSql),
    };
  };

  const loadWorkOrders = async (searchText = search) => {
    if (!isOpen) return;

    if (!branchCode) {
      setWorkOrders([]);
      return;
    }

    setWoLoading(true);

    try {
      const payload = {
        branchCode,
        filter: searchText || "",
        whouseCode,
        locCode,
        docType,
      };

      const response =
        String(requestMethod).toLowerCase() === "post"
          ? await postRequest(endpoint, payload)
          : await fetchDataJson(endpoint, payload);

      const rows = toRows(response);
      const filteredRows =
        typeof filterWorkOrders === "function"
          ? await filterWorkOrders(rows)
          : rows;

      setWorkOrders(Array.isArray(filteredRows) ? filteredRows : rows);
    } catch (error) {
      console.error("SearchWOIS lookup error:", error);
      console.error(
        "SearchWOIS backend response:",
        JSON.stringify(error?.response?.data, null, 2)
      );

      setWorkOrders([]);

      const backendMessage =
        error?.response?.data?.details ||
        error?.response?.data?.message ||
        error?.message ||
        `Unable to load Work Orders for ${label}.`;

      Swal.fire({
        icon: "error",
        title: "WO Lookup Failed",
        text: backendMessage,
      });
    } finally {
      setWoLoading(false);
    }
  };

  const getRequestedQty = (issueItem = {}) => {
    const requiredQty = num(
      valueOf(
        issueItem,
        "originalRequiredQty",
        "requiredQty",
        "REQUIRED_QTY",
        "qtyNeeded",
        "QTY_NEEDED",
        "quantity",
        "QUANTITY",
        "qty",
        "QTY"
      )
    );
    const issuedQty = num(valueOf(issueItem, "issuedQty", "ISSUED_QTY", "qtyIssued", "QTY_ISSUED"));
    const remainingValue = valueOf(issueItem, "unservedQty", "UNSERVED_QTY", "remainingQty", "REMAINING_QTY");
    const hasRemainingValue = remainingValue !== "";
    const remainingQty = hasRemainingValue ? num(remainingValue) : null;
    const computedRemainingQty = Math.max(requiredQty - issuedQty, 0);

    if (hasRemainingValue && remainingQty > 0) return remainingQty;
    if (hasRemainingValue && issuedQty >= requiredQty) return remainingQty;
    return computedRemainingQty;
  };

  const getIssueGroupId = (issueItem = {}) =>
    String(valueOf(issueItem, "groupId", "GROUP_ID", "group_id") || "").trim();

  const getLineNo = (issueItem = {}, index = selectedItemIndex) =>
    Number(valueOf(issueItem, "sourceWOLineNo", "sourceLineNo", "lnNo", "lineNo", "LINE_NO") || Number(index ?? 0) + 1);

  const buildAllocationBasePayload = (issueItem = selectedItem, index = selectedItemIndex) => ({
    docCode: docType || moduleLabel || "FGIS",
    docNo: documentNo || "",
    docId: documentID || "",
    docDate: valueOf(selectedWO, "woDate", "WO_DATE") || null,
    branchCode: branchCode || valueOf(selectedWO, "branchCode", "BRANCH_CODE") || "",
    whouseCode: whouseCode || "",
    locCode: locCode || "",
    groupId: getIssueGroupId(issueItem),
    lineNo: getLineNo(issueItem, index),
    itemCode: getIssueItemCode(issueItem) || "",
    requestedQty: getRequestedQty(issueItem),
    userCode,
    skipRegen: "Y",
  });

  const loadAllocationRows = async (issueItem, index = 0) => {
    if (!isFGIssueItem(issueItem)) {
      setAllocationRows([]);
      setExistingAllocations([]);
      return;
    }

    const endpoint = getAllocationEndpoint(issueItem);

    if (!endpoint) {
      setAllocationRows([]);
      setExistingAllocations([]);
      return;
    }

    setAllocationLoading(true);

    try {
      const response = await postRequest(endpoint, {
        mode: "GetOpenStock",
        params: JSON.stringify({
          json_data: buildAllocationBasePayload(issueItem, index),
        }),
      });

      const result = parseSprocResult(response);
      const stockRows = Array.isArray(result?.stockRows) ? result.stockRows : [];
      setAllocationRows(stockRows.map((row, rowIndex) => normalizeAllocationRow(row, rowIndex, issueItem)));
      setExistingAllocations(Array.isArray(result?.existingAllocations) ? result.existingAllocations : []);
    } catch (error) {
      console.error("WOIS allocation lookup error:", error);
      setAllocationRows([]);
      setExistingAllocations([]);
      Swal.fire({
        icon: "error",
        title: `${getIssueInventoryType(issueItem)} Available Inventory`,
        text: error?.response?.data?.message || error?.message || "Unable to load available inventory.",
      });
    } finally {
      setAllocationLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setSearch("");
    setSelectedWO(null);
    setSelectedItem(null);
    setSelectedItemIndex(null);
    setSelectedInventoryIndex(null);
    setAllocationRows([]);
    setExistingAllocations([]);

    loadWorkOrders("");
    // Keep the same trigger behavior as SearchWO.jsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, branchCode, whouseCode, locCode, endpoint, docType]);

  const filteredWorkOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return workOrders;

    return workOrders.filter((row) => {
      const haystack = [
        valueOf(row, "branchCode", "BRANCH_CODE"),
        valueOf(row, "woNo", "WO_NO"),
        valueOf(row, "bomCode", "BOM_CODE"),
        valueOf(row, "itemCode", "ITEM_CODE"),
        valueOf(row, "itemName", "ITEM_NAME"),
        valueOf(row, "remarks", "REMARKS", "particular", "PARTICULAR"),
        valueOf(row, "preparedBy", "PREPARED_BY", "userName", "USER_NAME"),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [search, workOrders]);

  const getQtyHand = (row) =>
    valueOf(
      row,
      "qtyHand",
      "QTY_HAND",
      "qtyOnHand",
      "QTY_ON_HAND",
      "onHandQty",
      "ON_HAND_QTY"
    );

  const getQtyAllocated = (row) =>
    valueOf(
      row,
      "qtyAllocated",
      "QTY_ALLOCATED",
      "qtyAlloc",
      "allocatedQty",
      "ALLOCATED_QTY"
    );

  const getQtyAvailable = (row) =>
    valueOf(
      row,
      "qtyAvailable",
      "QTY_AVAILABLE",
      "remainingAvailable",
      "REMAINING_AVAILABLE"
    );

  const displayedInventoryRows = useMemo(() => {
    const sourceRows = allocationRows.length ? allocationRows : inventoryRows;

    if (!selectedItem) return sourceRows;

    const selectedItemCode = String(getIssueItemCode(selectedItem) || "").trim();
    if (!selectedItemCode) return sourceRows;

    const rowsWithItemCode = sourceRows.filter((row) =>
      String(getIssueItemCode(row) || "").trim() === selectedItemCode
    );

    return rowsWithItemCode.length ? rowsWithItemCode : sourceRows;
  }, [allocationRows, inventoryRows, selectedItem]);

  const selectedInventory = useMemo(() => {
    if (selectedInventoryIndex === null) return null;
    return displayedInventoryRows[selectedInventoryIndex] || null;
  }, [displayedInventoryRows, selectedInventoryIndex]);

  const totalPicked = useMemo(
    () => displayedInventoryRows.reduce((sum, row) => sum + num(valueOf(row, "pickQty", "qtyPicked", "QTY_PICKED")), 0),
    [displayedInventoryRows]
  );

  const getAvailableForPick = (row) => {
    const remainingAvailable = num(getQtyAvailable(row));
    const currentPick = num(valueOf(row, "pickQty", "qtyPicked", "QTY_PICKED"));
    return Math.max(remainingAvailable - currentPick, 0);
  };

  const applyPickedRowsToIssueItems = (pickedRows = allocationRows) => {
    const pickedQty = pickedRows.reduce((sum, row) => sum + num(valueOf(row, "pickQty", "qtyPicked", "QTY_PICKED")), 0);
    const qtyOnHand = pickedRows.reduce((sum, row) => sum + num(getQtyHand(row)), 0);
    const qtyAvailable = pickedRows.reduce((sum, row) => sum + num(getQtyAvailable(row)), 0);
    const nextSelectedItem = {
      ...selectedItem,
      qtyHand: qtyOnHand,
      qtyOnHand,
      onHandQty: qtyOnHand,
      qtyAvailable,
      remainingAvailable: qtyAvailable,
      qtyPicked: pickedQty,
      quantityPicked: pickedQty,
      balance: Math.max(getRequestedQty(selectedItem) - pickedQty, 0),
      pickingAllocations: pickedRows.filter((row) => num(valueOf(row, "pickQty", "qtyPicked")) > 0),
    };

    setSelectedItem(nextSelectedItem);
    return {
      nextIssueItems: issueItems.map((row, index) => (index === selectedItemIndex ? nextSelectedItem : row)),
      nextSelectedItem,
    };
  };

  const buildSaveAllocations = (rows = allocationRows) =>
    rows
      .filter((row) => num(valueOf(row, "pickQty", "qtyPicked", "QTY_PICKED")) > 0)
      .map((row) => {
        const { fifoProp, wacProp } = getStockIdKeys(selectedItem);
        return {
          ...row,
          [fifoProp]: valueOf(row, fifoProp),
          [wacProp]: valueOf(row, wacProp),
          warehouseCode: valueOf(row, "warehouseCode", "whouseCode", "whCode"),
          whouseCode: valueOf(row, "warehouseCode", "whouseCode", "whCode"),
          locationCode: valueOf(row, "locationCode", "locCode"),
          locCode: valueOf(row, "locationCode", "locCode"),
          qualityStatus: valueOf(row, "qualityStatus", "qstatCode", "qcStatus"),
          qstatCode: valueOf(row, "qualityStatus", "qstatCode", "qcStatus"),
          bestBeforeDate: valueOf(row, "bestBeforeDate", "bbDate"),
          unitCost: num(valueOf(row, "unitCost", "unit_cost", "UNIT_COST", "cost", "itemCost", "unitPrice", "wac")),
          wac: num(valueOf(row, "wac", "WAC", "unitCost", "unit_cost", "UNIT_COST")),
          pickQty: num(valueOf(row, "pickQty", "qtyPicked", "QTY_PICKED")),
        };
      });

  const savePickingAllocation = async (rows = allocationRows, action = "manual-pick") => {
    if (!selectedWO || !selectedItem) return false;

    const endpoint = getAllocationEndpoint(selectedItem);
    if (!endpoint) return false;

    const pickedAllocations = buildSaveAllocations(rows);
    const pickedQty = pickedAllocations.reduce((sum, row) => sum + num(row.pickQty), 0);

    if (pickedQty > getRequestedQty(selectedItem)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Pick Quantity",
        text: "Picked quantity cannot be more than required quantity.",
      });
      return false;
    }

    const { nextIssueItems, nextSelectedItem } = applyPickedRowsToIssueItems(rows);

    if (!documentID || !documentNo || !getIssueGroupId(selectedItem)) {
      await onApply?.({
        action,
        workOrder: selectedWO,
        item: nextSelectedItem,
        selectedItemIndex,
        issueItems: nextIssueItems,
        inventory: rows,
        allocations: pickedAllocations,
        stagedOnly: true,
      });
      return true;
    }

    setAllocationLoading(true);

    try {
      await postRequest(endpoint, {
        mode: "SaveAlloc",
        params: JSON.stringify({
          json_data: {
            ...buildAllocationBasePayload(selectedItem, selectedItemIndex),
            dt1: pickedAllocations,
          },
        }),
      });

      await onApply?.({
        action,
        workOrder: selectedWO,
        item: nextSelectedItem,
        selectedItemIndex,
        issueItems: nextIssueItems,
        inventory: rows,
        allocations: pickedAllocations,
      });
      return true;
    } catch (error) {
      console.error("WOIS save allocation error:", error);
      Swal.fire({
        icon: "error",
        title: "Picking Allocation Failed",
        text: error?.response?.data?.message || error?.message || "Unable to save picking allocation.",
      });
      return false;
    } finally {
      setAllocationLoading(false);
    }
  };

  const totals = useMemo(() => {
    return displayedInventoryRows.reduce(
      (acc, row) => {
        acc.qtyHand += num(getQtyHand(row));
        acc.qtyAllocated += num(getQtyAllocated(row));
        acc.qtyAvailable += num(getQtyAvailable(row));
        acc.qtyPicked += num(valueOf(row, "pickQty", "qtyPicked", "QTY_PICKED"));
        acc.balance += num(valueOf(row, "balance", "BALANCE"));
        return acc;
      },
      {
        qtyHand: 0,
        qtyAllocated: 0,
        qtyAvailable: 0,
        qtyPicked: 0,
        balance: 0,
      }
    );
  }, [displayedInventoryRows]);

  const selectedItemQtyHand = useMemo(() => {
    if (!selectedItem) return "";

    if (displayedInventoryRows.length) {
      return displayedInventoryRows.reduce(
        (sum, row) => sum + num(getQtyHand(row)),
        0
      );
    }

    if (!isFGIssueItem(selectedItem)) return 0;

    return num(
      valueOf(
        selectedItem,
        "qtyHand",
        "QTY_HAND",
        "qtyOnHand",
        "QTY_ON_HAND",
        "onHandQty",
        "ON_HAND_QTY"
      )
    );
  }, [selectedItem, displayedInventoryRows]);

  const handleWorkOrderSelect = (row) => {
    if (!row) return;

    setSelectedWO(row);
    setSelectedItem(null);
    setSelectedItemIndex(null);
    setSelectedInventoryIndex(null);
    setAllocationRows([]);
    setExistingAllocations([]);

    // Parent can use this to load WO_DT1 / availability details.
    onSelectWorkOrder?.(row);
  };

  const handleIssueItemSelect = async (row, index) => {
    setSelectedItem(row);
    setSelectedItemIndex(index);
    setSelectedInventoryIndex(null);
    setAllocationRows([]);
    setExistingAllocations([]);
    onSelectIssueItem?.(row, index);
    await loadAllocationRows(row, index);
  };

  const handleClose = () => {
    (onCancel || onClose)?.();
  };

  const isBusy = loading || woLoading || allocationLoading;

  const handleLoadAll = () => {
    if (!selectedWO) return;
    onApply?.({
      action: "load-all",
      workOrder: selectedWO,
      item: selectedItem,
      issueItems,
      inventory: displayedInventoryRows,
    });
  };

  const handleManualPick = async () => {
    if (!selectedWO || !selectedItem) return;

    if (displayedInventoryRows.some((row) => num(valueOf(row, "pickQty", "qtyPicked")) > 0)) {
      await savePickingAllocation(displayedInventoryRows, "manual-pick");
      return;
    }

    if (!selectedInventory) {
      Swal.fire({
        icon: "info",
        title: "Select Inventory",
        text: "Please select an available inventory row to pick.",
      });
      return;
    }

    const requestedQty = getRequestedQty(selectedItem);
    const nextRows = displayedInventoryRows.map((row, index) => {
      if (index !== selectedInventoryIndex) return row;
      const remainingToPick = Math.max(requestedQty - totalPicked, 0);
      const pickQty = Math.min(getAvailableForPick(row), remainingToPick || getAvailableForPick(row));
      return {
        ...row,
        pickQty: num(valueOf(row, "pickQty", "qtyPicked")) + pickQty,
        qtyPicked: num(valueOf(row, "pickQty", "qtyPicked")) + pickQty,
        balance: Math.max(num(getQtyAvailable(row)) - (num(valueOf(row, "pickQty", "qtyPicked")) + pickQty), 0),
      };
    });
    setAllocationRows(nextRows);
    await savePickingAllocation(nextRows, "manual-pick");
  };

  const handleAutoPick = async () => {
    if (!selectedWO || !selectedItem) return;

    let remainingQty = getRequestedQty(selectedItem);
    const nextRows = displayedInventoryRows.map((row) => {
      const availableQty = Math.max(num(getQtyAvailable(row)), 0);
      const pickQty = Math.min(availableQty, remainingQty);
      remainingQty -= pickQty;
      return {
        ...row,
        pickQty,
        qtyPicked: pickQty,
        balance: Math.max(availableQty - pickQty, 0),
      };
    });

    setAllocationRows(nextRows);
    const didSave = await savePickingAllocation(nextRows, "auto-pick");

    if (didSave) {
      setSelectedItem(null);
      setSelectedItemIndex(null);
      setSelectedInventoryIndex(null);
      setAllocationRows([]);
      setExistingAllocations([]);
    }
  };

  const handleReset = async () => {
    if (selectedItem && documentID && getIssueGroupId(selectedItem)) {
      const endpoint = getAllocationEndpoint(selectedItem);
      if (endpoint) {
        try {
          setAllocationLoading(true);
          await postRequest(endpoint, {
            mode: "CancelAlloc",
            params: JSON.stringify({
              json_data: {
                ...buildAllocationBasePayload(selectedItem, selectedItemIndex),
                reason: "WOIS picking reset.",
              },
            }),
          });
        } catch (error) {
          console.error("WOIS reset allocation error:", error);
          Swal.fire({
            icon: "error",
            title: "Reset Picking Failed",
            text: error?.response?.data?.message || error?.message || "Unable to reset picking allocation.",
          });
        } finally {
          setAllocationLoading(false);
        }
      }
    }

    setSelectedItem(null);
    setSelectedItemIndex(null);
    setSelectedInventoryIndex(null);
    setAllocationRows([]);
    setExistingAllocations([]);

    onApply?.({
      action: "reset",
      workOrder: selectedWO,
    });
  };

  const handlePickQtyChange = (rowIndex, value) => {
    const nextQty = Math.max(num(value), 0);
    setAllocationRows((prevRows) => {
      const sourceRows = prevRows.length ? prevRows : displayedInventoryRows;
      return sourceRows.map((row, index) => {
        if (index !== rowIndex) return row;
        const cappedQty = Math.min(nextQty, num(getQtyAvailable(row)));
        return {
          ...row,
          pickQty: cappedQty,
          qtyPicked: cappedQty,
          balance: Math.max(num(getQtyAvailable(row)) - cappedQty, 0),
        };
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-5">
      <div className="relative flex h-[95vh] w-[98vw] max-w-none flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FontAwesomeIcon icon={faBoxesStacked} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-800 dark:text-slate-100">
                {title}
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* SEARCH / SUMMARY BAR */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-2xl">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    loadWorkOrders(search);
                  }
                }}
                placeholder="Search WO No., BOM, Item Code, Item Description, Particular..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900/40"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <FontAwesomeIcon icon={faCircleXmark} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => loadWorkOrders(search)}
                disabled={woLoading || !branchCode}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                {woLoading ? "Loading..." : "Search"}
              </button>

              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <FontAwesomeIcon icon={faFilter} className="text-blue-500" />
                {filteredWorkOrders.length} Work Order
                {filteredWorkOrders.length === 1 ? "" : "s"}
              </span>

              {selectedWO && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <FontAwesomeIcon icon={faCheck} />
                  Selected WO:{" "}
                  {valueOf(selectedWO, "woNo", "WO_NO") || "-"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid min-h-0 flex-1 grid-rows-[40%_60%] overflow-hidden">
          {/* TOP: WO LIST */}
          <section className="min-h-0 overflow-hidden border-b border-slate-200 dark:border-slate-700">
            <div className="h-full overflow-auto">
              <table className="min-w-[1200px] w-full border-collapse text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-100/95 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 backdrop-blur dark:bg-slate-800/95 dark:text-slate-300">
                  <tr>
                    {[
                      "BC",
                      "WO No.",
                      "WO Date",
                      "BOM Code",
                      "BOM Date",
                      "Item Code",
                      "Item Description",
                      "UOM",
                      "Quantity",
                      "Particular",
                      "Prepared By",
                      "Date Stamp",
                      "Time Stamp",
                    ].map((header) => (
                      <th
                        key={header}
                        className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2.5 dark:border-slate-700"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredWorkOrders.map((row, index) => {
                    const selected =
                      selectedWO &&
                      valueOf(selectedWO, "woNo", "WO_NO") ===
                        valueOf(row, "woNo", "WO_NO") &&
                      valueOf(selectedWO, "branchCode", "BRANCH_CODE") ===
                        valueOf(row, "branchCode", "BRANCH_CODE");

                    return (
                      <tr
                        key={`${valueOf(row, "branchCode", "BRANCH_CODE")}-${valueOf(
                          row,
                          "woNo",
                          "WO_NO"
                        )}-${index}`}
                        onClick={() => handleWorkOrderSelect(row)}
                        className={`cursor-pointer border-b border-slate-100 transition dark:border-slate-800 ${
                          selected
                            ? "bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                          {valueOf(row, "branchCode", "BRANCH_CODE")}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 font-bold text-blue-700 dark:border-slate-800 dark:text-blue-300">
                          {valueOf(row, "woNo", "WO_NO")}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                          {formatDate(valueOf(row, "woDate", "WO_DATE"))}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                          {valueOf(row, "bomCode", "BOM_CODE")}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                          {formatDate(valueOf(row, "bomDate", "BOM_DATE"))}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                          {valueOf(row, "itemCode", "ITEM_CODE")}
                        </td>
                        <td className="max-w-[280px] truncate border-r border-slate-100 px-3 py-2 font-medium dark:border-slate-800">
                          {valueOf(row, "itemName", "ITEM_NAME")}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                          {valueOf(row, "uomCode", "UOM_CODE")}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 text-right font-semibold dark:border-slate-800">
                          {qty(valueOf(row, "quantity", "woQty", "WO_QTY"))}
                        </td>
                        <td className="max-w-[250px] truncate border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                          {valueOf(
                            row,
                            "particular",
                            "PARTICULAR",
                            "remarks",
                            "REMARKS"
                          )}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                          {valueOf(
                            row,
                            "preparedBy",
                            "PREPARED_BY",
                            "userName",
                            "USER_NAME"
                          )}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                          {formatDate(
                            valueOf(row, "dateStamp", "DATE_STAMP")
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {valueOf(row, "timeStamp", "TIME_STAMP")}
                        </td>
                      </tr>
                    );
                  })}

                  {!woLoading && filteredWorkOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-6 py-12 text-center text-xs text-slate-400"
                      >
                        {noRecordMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* BOTTOM */}
          <section className="grid min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[37%_63%]">
            {/* LEFT: ISSUE SLIP ITEMS */}
            <div className="flex min-h-0 flex-col border-r border-slate-200 dark:border-slate-700">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Issue Slip Item Details
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Required materials for the selected Work Order
                  </p>
                </div>

                <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  {issueItems.length} item{issueItems.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-[620px] w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10 bg-white text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                    <tr>
                      {[
                        "Type",
                        "Item Code",
                        "Item Description",
                        "UOM",
                        "PC Code",
                        "PC Desc",
                      ].map((header) => (
                        <th
                          key={header}
                          className="border-b border-r border-slate-200 px-3 py-2 text-left dark:border-slate-700"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {issueItems.map((row, index) => {
                      const selected =
                        selectedItem &&
                        getIssueItemCode(selectedItem) === getIssueItemCode(row);

                      return (
                        <tr
                          key={`${getIssueItemCode(row)}-${valueOf(row, "sourceWOLineNo", "lnNo", "lineNo", "LINE_NO", index)}-${index}`}
                          onClick={() => handleIssueItemSelect(row, index)}
                          className={`cursor-pointer border-b border-slate-100 transition dark:border-slate-800 ${
                            selected
                              ? "bg-indigo-50 dark:bg-indigo-950/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                          }`}
                        >
                          <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {valueOf(row, "invType", "INV_TYPE", "type", "TYPE")}
                          </td>
                          <td className="border-r border-slate-100 px-3 py-2 font-semibold text-blue-700 dark:border-slate-800 dark:text-blue-300">
                            {getIssueItemCode(row)}
                          </td>
                          <td className="max-w-[260px] truncate border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {getIssueItemName(row)}
                          </td>
                          <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {valueOf(row, "uomCode", "UOM_CODE")}
                          </td>
                          <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {valueOf(row, "pcCode", "PC_CODE")}
                          </td>
                          <td className="px-3 py-2">
                            {valueOf(row, "pcDesc", "PC_DESC", "pcName", "PC_NAME")}
                          </td>
                        </tr>
                      );
                    })}

                    {issueItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-10 text-center text-xs text-slate-400"
                        >
                          Select a Work Order to load issue slip items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: PICKING */}
            <div className="grid min-h-0 grid-rows-[118px_minmax(0,1fr)_84px] overflow-hidden">
              {/* VB.NET-LIKE COMPACT SELECTED ITEM DETAILS */}
              <div className="border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                <div className="grid h-full grid-cols-[105px_minmax(180px,1fr)_95px_minmax(160px,1fr)_95px_120px] grid-rows-2 items-center gap-x-2 gap-y-2">
                  <CompactLabel text="Item Code" />
                  <CompactValue value={getIssueItemCode(selectedItem) || ""} />

                  <CompactLabel text="PC Code" />
                  <CompactValue value={valueOf(selectedItem, "pcCode", "PC_CODE") || ""} />

                  <CompactLabel text="Required Qty" />
                  <CompactValue
                    value={
                      selectedItem
                        ? qty(
                            valueOf(
                              selectedItem,
                              "requiredQty",
                              "REQUIRED_QTY",
                              "qtyNeeded",
                              "QTY_NEEDED"
                            )
                          )
                        : ""
                    }
                    align="right"
                  />

                  <CompactLabel text="Item Description" />
                  <CompactValue
                    value={getIssueItemName(selectedItem) || ""}
                  />

                  <CompactLabel text="PC Description" />
                  <CompactValue
                    value={
                      valueOf(
                        selectedItem,
                        "pcDesc",
                        "PC_DESC",
                        "pcName",
                        "PC_NAME"
                      ) || ""
                    }
                  />

                  <CompactLabel text="Qty on Hand" />
                  <CompactValue
                    value={
                      selectedItem
                        ? qty(selectedItemQtyHand)
                        : ""
                    }
                    align="right"
                  />
                </div>
              </div>

              {/* INVENTORY / PICKING GRID */}
              <div className="min-h-0 overflow-auto">
                <table className="min-w-[1180px] w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      {[
                        "LN",
                        "WH Code",
                        "Loc Code",
                        "Lot No.",
                        "Control No.",
                        "BB Date",
                        "QC Status",
                        "Qty on Hand",
                        "Qty Allocated",
                        "Qty Available",
                        "Qty Picked",
                        "Balance",
                      ].map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 text-left dark:border-slate-700"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {displayedInventoryRows.map((row, index) => {
                      const selected = selectedInventoryIndex === index;

                      return (
                        <tr
                          key={`${valueOf(row, "whCode", "WH_CODE")}-${valueOf(
                            row,
                            "locCode",
                            "LOC_CODE"
                          )}-${index}`}
                          onClick={() => setSelectedInventoryIndex(index)}
                          className={`cursor-pointer border-b border-slate-100 transition dark:border-slate-800 ${
                            selected
                              ? "bg-emerald-50 dark:bg-emerald-950/25"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                          }`}
                        >
                          <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {valueOf(row, "lnNo", "lineNo", "LINE_NO") || index + 1}
                          </td>
                          <td className="border-r border-slate-100 px-3 py-2 font-semibold dark:border-slate-800">
                            {valueOf(row, "whCode", "WH_CODE", "whouseCode")}
                          </td>
                          <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {valueOf(row, "locCode", "LOC_CODE")}
                          </td>
                          <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {valueOf(row, "lotNo", "LOT_NO")}
                          </td>
                          <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {valueOf(row, "controlNo", "CONTROL_NO")}
                          </td>
                          <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {formatDate(valueOf(row, "bbDate", "BB_DATE"))}
                          </td>
                          <td className="border-r border-slate-100 px-3 py-2 dark:border-slate-800">
                            {valueOf(row, "qcStatus", "QC_STATUS", "qstatCode")}
                          </td>
                          <NumberCell value={getQtyHand(row)} qty={qty} />
                          <NumberCell
                            value={getQtyAllocated(row)}
                            qty={qty}
                          />
                          <NumberCell
                            value={getQtyAvailable(row)}
                            qty={qty}
                          />
                          <td className="border-r border-slate-100 px-2 py-1.5 text-right dark:border-slate-800">
                            <input
                              type="number"
                              min="0"
                              step="0.000001"
                              value={valueOf(row, "pickQty", "qtyPicked", "QTY_PICKED") || 0}
                              onChange={(event) => handlePickQtyChange(index, event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              className="h-7 w-28 rounded-md border border-blue-200 bg-white px-2 text-right text-[11px] font-bold text-blue-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"
                            />
                          </td>
                          <NumberCell
                            value={valueOf(row, "balance", "BALANCE")}
                            qty={qty}
                          />
                        </tr>
                      );
                    })}

                    {displayedInventoryRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-5 py-8 text-center text-xs text-slate-400"
                        >
                          {selectedItem
                            ? "No available inventory found for the selected issue item."
                            : "Select an issue item to view available inventory."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* VB.NET-LIKE FIXED ACTION BAR */}
              <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-full items-center justify-between gap-3">
                  <div className="flex shrink-0 items-center gap-2">
                    <ActionButton
                      icon={faWarehouse}
                      label="Load"
                      onClick={handleLoadAll}
                      disabled={!selectedWO}
                      variant="secondary"
                    />

                    <ActionButton
                      icon={faBoxesStacked}
                      label="Manual Pick and Apply"
                      onClick={handleManualPick}
                      disabled={!selectedWO || !selectedItem || allocationLoading}
                      variant="secondary"
                    />

                    <ActionButton
                      icon={faWandMagicSparkles}
                      label="Auto Pick and Apply"
                      onClick={handleAutoPick}
                      disabled={!selectedWO || !selectedItem || allocationLoading}
                      variant="primary"
                    />

                    <ActionButton
                      icon={faRotateLeft}
                      label="Reset WO Detail"
                      onClick={handleReset}
                      disabled={!selectedWO || allocationLoading}
                      variant="danger"
                    />
                  </div>

                  <div className="grid min-w-[520px] grid-cols-5 gap-2">
                    <TotalBox label="Qty on Hand" value={qty(totals.qtyHand)} />
                    <TotalBox label="Qty Allocated" value={qty(totals.qtyAllocated)} />
                    <TotalBox label="Qty Available" value={qty(totals.qtyAvailable)} />
                    <TotalBox label="Qty Picked" value={qty(totals.qtyPicked)} strong />
                    <TotalBox label="Balance" value={qty(totals.balance)} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-2 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900">
          {tipMessage}
        </div>

        {/* LOADING OVERLAY */}
        {isBusy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px] dark:bg-slate-950/50">
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs font-semibold text-slate-600 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {allocationLoading
                ? "Loading available inventory..."
                : woLoading
                  ? "Loading Work Order references..."
                  : "Loading Work Order information..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoCard = ({ label, value, wide = false }) => (
  <div
    className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60 ${
      wide ? "md:col-span-2" : ""
    }`}
  >
    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p
      className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-100"
      title={String(value ?? "")}
    >
      {value}
    </p>
  </div>
);


const CompactLabel = ({ text }) => (
  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
    {text}
  </div>
);

const CompactValue = ({ value, align = "left" }) => (
  <div
    className={`h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${
      align === "right" ? "text-right" : "text-left"
    }`}
    title={String(value ?? "")}
  >
    <div className="truncate">{value || "\u00A0"}</div>
  </div>
);

const NumberCell = ({ value, qty, emphasize = false }) => (
  <td
    className={`border-r border-slate-100 px-3 py-2 text-right dark:border-slate-800 ${
      emphasize
        ? "font-bold text-blue-700 dark:text-blue-300"
        : "font-medium text-slate-700 dark:text-slate-200"
    }`}
  >
    {qty(value)}
  </td>
);

const TotalBox = ({ label, value, strong = false }) => (
  <div
    className={`min-w-[96px] rounded-lg border px-2 py-1.5 text-right ${
      strong
        ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
    }`}
  >
    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p
      className={`mt-1 text-xs font-bold ${
        strong
          ? "text-blue-700 dark:text-blue-300"
          : "text-slate-700 dark:text-slate-100"
      }`}
    >
      {value}
    </p>
  </div>
);

const ActionButton = ({
  icon,
  label,
  onClick,
  disabled,
  variant = "secondary",
}) => {
  const styles = {
    primary:
      "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 disabled:border-blue-300 disabled:bg-blue-300",
    secondary:
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
    danger:
      "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      <FontAwesomeIcon icon={icon} className="text-[11px]" />
      <span>{label}</span>
    </button>
  );
};

export default SearchWOIS;
