/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  Send,
  UserRound,
} from "lucide-react";

import { fetchData, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const formatDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getDateRange = (start, end) => {
  if (!start || !end) return [];

  const dates = [];
  const current = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);

  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime()) || current > last) {
    return [];
  }

  while (current <= last) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const tomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
};

const defaultForecastStartDate = () => formatDate(new Date());

const defaultForecastEndDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  return formatDate(d);
};

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const dayLabel = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long" });
};

const getRowValue = (row, keys, fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value).trim();
    }
  }

  return fallback;
};

const getCurrentUserCode = (currentUserRow, user) =>
  getRowValue(
    currentUserRow,
    ["userCode", "USER_CODE", "user_code", "UserCode", "USERID", "userId"],
    getRowValue(user, ["USER_CODE", "userCode", "user_code"], ""),
  );

const getCurrentUserName = (currentUserRow, user) =>
  getRowValue(
    currentUserRow,
    ["userName", "USER_NAME", "user_name", "UserName", "name", "fullName", "FULL_NAME"],
    getRowValue(user, ["USER_NAME", "name", "fullName"], ""),
  );

const getCurrentUserBranchCode = (currentUserRow) =>
  getRowValue(currentUserRow, [
    "branchCode",
    "BRANCH_CODE",
    "branch_code",
    "BranchCode",
    "branch",
    "BRANCH",
  ]);

const getCurrentUserBranchName = (currentUserRow) =>
  getRowValue(currentUserRow, [
    "branchName",
    "BRANCH_NAME",
    "branch_name",
    "BranchName",
    "branchDesc",
    "BRANCH_DESC",
  ]);

const getCurrentUserStoreType = (currentUserRow) =>
  getRowValue(currentUserRow, ["storeType", "STORE_TYPE", "store_type", "StoreType"]);

const unwrapDataArray = (response) => {
  const raw =
    response?.data ??
    response?.Data ??
    response?.result ??
    response?.RESULT ??
    [];

  if (Array.isArray(raw)) {
    const firstResult = raw?.[0]?.result ?? raw?.[0]?.RESULT;
    if (typeof firstResult === "string") {
      try {
        const parsed = JSON.parse(firstResult);
        return Array.isArray(parsed) ? parsed : raw;
      } catch {
        return raw;
      }
    }

    return raw;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};


const normalizeDate = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const dateOnly = value.split("T")[0]?.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  }

  return formatDate(value);
};

const toNumber = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["1", "true", "y", "yes"].includes(String(value ?? "").trim().toLowerCase());

const normalizeItemRow = (row = {}) => ({
  ...row,
  itemCode: getRowValue(row, ["itemCode", "ITEM_CODE", "item_code", "ItemCode", "ITEM_NO", "itemNo"]),
  itemName: getRowValue(row, ["itemName", "ITEM_NAME", "item_name", "ItemName", "ITEM_DESC", "itemDesc"]),
  uomCode: getRowValue(row, ["uomCode", "UOM_CODE", "uom_code", "UomCode", "UOM", "uom"]),
});

const normalizeForecastRow = (row = {}) => ({
  ...row,
  forecastId: getRowValue(row, ["forecastId", "FORECAST_ID", "forecast_id", "ORDER_ID", "orderId"]),
  itemCode: getRowValue(row, ["itemCode", "ITEM_CODE", "item_code", "ItemCode", "ITEM_NO", "itemNo"]),
  itemName: getRowValue(row, ["itemName", "ITEM_NAME", "item_name", "ItemName", "ITEM_DESC", "itemDesc"]),
  uomCode: getRowValue(row, ["uomCode", "UOM_CODE", "uom_code", "UomCode", "UOM", "uom"]),
  deliveryDate: normalizeDate(
    row.deliveryDate ??
      row.DELIVERY_DATE ??
      row.delivery_date ??
      row.DeliveryDate ??
      row.ORDER_DATE ??
      row.orderDate,
  ),
  orderQty: toNumber(row.orderQty ?? row.ORDER_QTY ?? row.order_qty ?? row.OrderQty ?? row.QTY ?? row.qty),
  confirmed: toBoolean(row.confirmed ?? row.CONFIRMED ?? row.isConfirmed ?? row.IS_CONFIRMED),
  confirmedBy: getRowValue(row, ["confirmedBy", "CONFIRMED_BY", "confirmed_by"], ""),
  confirmedDate: normalizeDate(row.confirmedDate ?? row.CONFIRMED_DATE ?? row.confirmed_date),
});

const normalizeConfirmationRow = (row = {}, fallbackDate = "") => {
  const normalized = normalizeForecastRow(row);

  return {
    ...normalized,
    deliveryDate: normalized.deliveryDate || fallbackDate,
    forecastQty: toNumber(row.forecastQty ?? row.FORECAST_QTY ?? row.forecast_qty ?? normalized.orderQty),
  };
};

const getStoreTypeRequests = (value) => [value];

const mergeUniqueItems = (rows = []) => {
  const itemMap = new Map();

  rows.forEach((row) => {
    const item = normalizeItemRow(row);
    if (!item.itemCode) return;

    if (!itemMap.has(item.itemCode)) {
      itemMap.set(item.itemCode, item);
    }
  });

  return Array.from(itemMap.values());
};

const buildOrderMatrix = (loadedItems, savedForecastRows, forecastDates) => {
  const matrix = {};

  loadedItems.forEach((item) => {
    if (!item.itemCode) return;

    matrix[item.itemCode] = {};
    forecastDates.forEach((date) => {
      matrix[item.itemCode][date] = 0;
    });
  });

  savedForecastRows.forEach((row) => {
    if (!row.itemCode || !row.deliveryDate || !matrix[row.itemCode]) return;
    if (!forecastDates.includes(row.deliveryDate)) return;

    // Always display the saved weekly qty, even when confirmed.
    // Example: Weekly Forecast 500 -> Daily Order Confirmed 300 -> Weekly cell shows 300 and is locked.
    matrix[row.itemCode][row.deliveryDate] = toNumber(row.orderQty);
  });

  return matrix;
};

const buildConfirmedMatrix = (loadedItems, savedForecastRows, forecastDates) => {
  const matrix = {};

  loadedItems.forEach((item) => {
    if (!item.itemCode) return;

    matrix[item.itemCode] = {};
    forecastDates.forEach((date) => {
      matrix[item.itemCode][date] = false;
    });
  });

  savedForecastRows.forEach((row) => {
    if (!row.itemCode || !row.deliveryDate || !matrix[row.itemCode]) return;
    if (!forecastDates.includes(row.deliveryDate)) return;

    matrix[row.itemCode][row.deliveryDate] = toBoolean(row.confirmed);
  });

  return matrix;
};

const cloneMatrix = (matrix = {}) =>
  Object.fromEntries(
    Object.entries(matrix).map(([itemCode, dateValues]) => [itemCode, { ...dateValues }]),
  );

const StatusPill = ({ children, variant = "default", className = "" }) => {
  const variantClass =
    variant === "success"
      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800"
      : variant === "warning"
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"
        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";

  return (
    <span className={`inline-flex max-w-full items-center justify-center rounded-md border px-2 py-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide sm:whitespace-nowrap ${variantClass} ${className}`}>
      {children}
    </span>
  );
};

const FloatingField = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  readOnly = false,
  disabled = false,
  children,
}) => {
  if (type === "select") {
    return (
      <div className="relative min-w-0 p-1 sm:p-2">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          disabled={disabled || readOnly}
          className="peer global-tran-textbox-ui"
        >
          {children}
        </select>
        <label htmlFor={id} className="global-tran-floating-label">
          {label}
        </label>
      </div>
    );
  }

  return (
    <div className="relative min-w-0 p-1 sm:p-2">
      <input
        id={id}
        type={type}
        placeholder=" "
        value={value || ""}
        readOnly={readOnly}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className={`peer global-tran-textbox-ui ${readOnly || disabled ? "cursor-default bg-gray-50 dark:bg-gray-700" : ""}`}
      />
      <label htmlFor={id} className="global-tran-floating-label">
        {label}
      </label>
    </div>
  );
};

const ActionButton = ({ children, icon: Icon, onClick, disabled = false, variant = "primary" }) => {
  const colorClass =
    variant === "success"
      ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
      : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors sm:w-auto sm:px-4 sm:text-sm ${
        disabled ? "cursor-not-allowed bg-gray-400 hover:bg-gray-400 dark:bg-gray-700" : colorClass
      }`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
    </button>
  );
};

const focusNextQuantityInput = (event) => {
  if (event.key !== "Enter") return;

  event.preventDefault();

  const currentInput = event.currentTarget;
  const currentGroup = currentInput.dataset.qtyGroup;
  const currentCol = currentInput.dataset.qtyCol;
  const currentRow = Number(currentInput.dataset.qtyRow);

  const quantityInputs = Array.from(document.querySelectorAll('[data-store-portal-qty="true"]')).filter(
    (input) =>
      !input.disabled &&
      !input.readOnly &&
      (input.offsetWidth > 0 || input.offsetHeight > 0 || input.getClientRects().length > 0),
  );

  let nextInput = null;

  if (currentGroup && currentCol !== undefined && Number.isFinite(currentRow)) {
    nextInput = quantityInputs
      .filter(
        (input) =>
          input.dataset.qtyGroup === currentGroup &&
          input.dataset.qtyCol === currentCol &&
          Number(input.dataset.qtyRow) > currentRow,
      )
      .sort((a, b) => Number(a.dataset.qtyRow) - Number(b.dataset.qtyRow))[0];
  } else {
    const currentIndex = quantityInputs.indexOf(currentInput);
    nextInput = quantityInputs[currentIndex + 1];
  }

  if (nextInput) {
    nextInput.focus();
    nextInput.select?.();
  }
};

const QuantityInput = ({ value, onChange, tone = "blue", navGroup, navRow, navCol, disabled = false, max }) => {
  const valueClass =
    Number(value || 0) > 0
      ? tone === "green"
        ? "font-semibold text-green-700 dark:text-green-200"
        : "font-semibold text-slate-900 dark:text-white"
      : "text-slate-900 dark:text-white";

  const handleChange = (event) => {
    let sanitizedValue = event.target.value.replace(/[^0-9.]/g, "");

    const parts = sanitizedValue.split(".");
    if (parts.length > 2) {
      sanitizedValue = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    // Allows decimals while typing, including temporary values like "1.".
    // Limit to 4 decimal places to match DECIMAL(18,4) in the stored procedure.
    if (/^\d*(\.\d{0,4})?$/.test(sanitizedValue)) {
      onChange(sanitizedValue);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      max={max ?? undefined}
      data-store-portal-qty="true"
      data-qty-group={navGroup}
      data-qty-row={navRow}
      data-qty-col={navCol}
      value={value ?? 0}
      disabled={disabled}
      onChange={handleChange}
      onKeyDown={focusNextQuantityInput}
      className={`h-7 w-full border-0 bg-transparent px-1 text-right text-xs outline-none transition focus:outline-none focus:ring-0 ${disabled ? "cursor-not-allowed opacity-70" : ""} ${valueClass}`}
    />
  );
};

const DateInput = ({ value, onChange, disabled = false }) => (
  <input
    type="date"
    value={value || ""}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value)}
    className={`h-7 w-full border-0 bg-transparent px-1 text-left text-xs text-slate-900 outline-none transition focus:outline-none focus:ring-0 dark:text-white ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
  />
);

const Toast = ({ toast }) => {
  if (!toast) return null;

  const toneClass =
    toast.type === "error"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-100"
      : "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-100";

  return (
    <div className={`fixed left-3 right-3 top-16 z-[9999] rounded-lg border px-4 py-3 text-sm font-medium shadow-xl sm:left-auto sm:right-4 sm:max-w-sm ${toneClass}`}>
      {toast.message}
    </div>
  );
};

export default function StorePortalOrder() {
  const { currentUserRow, refsLoading, user } = useAuth();

  const userCode = useMemo(() => getCurrentUserCode(currentUserRow, user), [currentUserRow, user]);
  const userName = useMemo(() => getCurrentUserName(currentUserRow, user), [currentUserRow, user]);
  const branchCode = useMemo(() => getCurrentUserBranchCode(currentUserRow), [currentUserRow]);
  const branchName = useMemo(() => getCurrentUserBranchName(currentUserRow), [currentUserRow]);
  const storeCode = branchCode;

  const [storeType, setStoreType] = useState("Company");
  const [startDate, setStartDate] = useState(defaultForecastStartDate);
  const [endDate, setEndDate] = useState(defaultForecastEndDate);

  const [items, setItems] = useState([]);
  const [orderMatrix, setOrderMatrix] = useState({});
  const [loadedOrderMatrix, setLoadedOrderMatrix] = useState({});
  const [confirmedMatrix, setConfirmedMatrix] = useState({});
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastSubmitting, setForecastSubmitting] = useState(false);

  const [deliveryDate, setDeliveryDate] = useState(tomorrowDate());
  const [confirmationRows, setConfirmationRows] = useState([]);
  const [loadedConfirmationRows, setLoadedConfirmationRows] = useState([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const [toast, setToast] = useState(null);

  const dates = useMemo(() => getDateRange(startDate, endDate), [startDate, endDate]);
  const hasTaggedBranch = Boolean(storeCode);
  const isBusy = refsLoading || forecastLoading || forecastSubmitting || confirmLoading || confirmSubmitting;
  const userDisplay = userName && userName !== userCode ? `${userCode} - ${userName}` : userCode;
  const branchDisplay = branchName ? `${branchCode} - ${branchName}` : branchCode;

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const rowStoreType = getCurrentUserStoreType(currentUserRow);
    if (rowStoreType) setStoreType(rowStoreType);
  }, [currentUserRow]);

  const loadItems = useCallback(
    async ({ silent = false } = {}) => {
      if (!hasTaggedBranch) {
        setItems([]);
        setOrderMatrix({});
        setLoadedOrderMatrix({});
        setConfirmedMatrix({});
        if (!silent) showToast("No branch is tagged to the logged-in user account.", "error");
        return;
      }

      if (dates.length === 0) {
        setItems([]);
        setOrderMatrix({});
        setLoadedOrderMatrix({});
        setConfirmedMatrix({});
        if (!silent) showToast("Please select a valid forecast date range.", "error");
        return;
      }

      setForecastLoading(true);
      try {
        const storeTypeRequests = getStoreTypeRequests(storeType);
        const itemResponses = await Promise.all(
          storeTypeRequests.map((type) =>
            fetchData("store-portal/items", {
              storeCode,
              storeType: type,
            }),
          ),
        );

        const loadedItems = mergeUniqueItems(itemResponses.flatMap((response) => unwrapDataArray(response)));
        let savedForecastRows = [];

        try {
          const forecastResponses = await Promise.allSettled(
            storeTypeRequests.map((type) =>
              fetchData("store-portal/weekly-forecast", {
                storeCode,
                storeType: type,
                startDate,
                endDate,
                orderType: "WeeklyForecast",
              }),
            ),
          );

          savedForecastRows = forecastResponses
            .filter((response) => response.status === "fulfilled")
            .flatMap((response) => unwrapDataArray(response.value))
            .map(normalizeForecastRow);
        } catch (forecastError) {
          console.warn("Items loaded, but existing weekly forecast quantities were not retrieved:", forecastError);
        }

        const nextOrderMatrix = buildOrderMatrix(loadedItems, savedForecastRows, dates);
        const nextConfirmedMatrix = buildConfirmedMatrix(loadedItems, savedForecastRows, dates);

        setItems(loadedItems);
        setOrderMatrix(nextOrderMatrix);
        setLoadedOrderMatrix(cloneMatrix(nextOrderMatrix));
        setConfirmedMatrix(nextConfirmedMatrix);

        if (!silent) {
          showToast(
            savedForecastRows.length > 0
              ? "Items loaded with existing weekly forecast quantities."
              : "Items loaded successfully.",
          );
        }
      } catch (error) {
        console.error("Failed to load store portal items:", error);
        setItems([]);
        setOrderMatrix({});
        setLoadedOrderMatrix({});
        setConfirmedMatrix({});
        if (!silent) showToast("Unable to load store items.", "error");
      } finally {
        setForecastLoading(false);
      }
    },
    [dates, endDate, hasTaggedBranch, showToast, startDate, storeCode, storeType],
  );

  useEffect(() => {
    loadItems({ silent: true });
  }, [loadItems]);

  useEffect(() => {
    setConfirmationRows([]);
    setLoadedConfirmationRows([]);
  }, [storeCode, storeType, deliveryDate]);

  const isForecastCellConfirmed = useCallback(
    (itemCode, date) => Boolean(confirmedMatrix[itemCode]?.[date]),
    [confirmedMatrix],
  );

  const resetWeeklyForecast = () => {
    setOrderMatrix(cloneMatrix(loadedOrderMatrix));
    showToast("Weekly forecast reset to the last loaded values.");
  };

  const handleQtyChange = (itemCode, date, value) => {
    if (isForecastCellConfirmed(itemCode, date)) return;

    setOrderMatrix((prev) => ({
      ...prev,
      [itemCode]: {
        ...prev[itemCode],
        // Keep the raw decimal text while editing so values like "1.5" can be entered correctly.
        [date]: value,
      },
    }));
  };

  const submitWeeklyForecast = async () => {
    if (!hasTaggedBranch) {
      showToast("No branch is tagged to the logged-in user account.", "error");
      return;
    }

    if (items.length === 0) {
      showToast("Load items before submitting the forecast.", "error");
      return;
    }

    const details = [];
    items.forEach((item) => {
      dates.forEach((date) => {
        details.push({
          itemCode: item.itemCode,
          itemName: item.itemName,
          uomCode: item.uomCode,
          deliveryDate: date,
          orderQty: Number(orderMatrix[item.itemCode]?.[date] || 0),
        });
      });
    });

    const payload = {
      userCode,
      storeCode,
      storeType,
      startDate,
      endDate,
      orderType: "WeeklyForecast",
      details,
    };

    setForecastSubmitting(true);
    try {
      const res = await postRequest("store-portal/weekly-forecast", payload);
      showToast(res?.message || "Weekly forecast submitted successfully.");
      await loadItems({ silent: true });
    } catch (error) {
      console.error("Failed to submit weekly forecast:", error);
      showToast("Unable to submit weekly forecast.", "error");
    } finally {
      setForecastSubmitting(false);
    }
  };

  const loadConfirmation = async () => {
    if (!hasTaggedBranch) {
      showToast("No branch is tagged to the logged-in user account.", "error");
      return;
    }

    setConfirmLoading(true);
    try {
      const res = await fetchData("store-portal/confirmation", {
        storeCode,
        storeType,
        deliveryDate,
      });

      const rows = unwrapDataArray(res)
        .map((row) => normalizeConfirmationRow(row, deliveryDate))
        .filter((row) => row.itemCode && toNumber(row.orderQty) > 0);

      setConfirmationRows(rows);
      setLoadedConfirmationRows(rows.map((row) => ({ ...row })));
    } catch (error) {
      console.error("Failed to load store portal confirmation:", error);
      setConfirmationRows([]);
      setLoadedConfirmationRows([]);
      showToast("Unable to load forecast confirmation.", "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  const resetConfirmationRows = () => {
    setConfirmationRows(loadedConfirmationRows.map((row) => ({ ...row })));
    showToast("Daily order confirmation reset to the last loaded values.");
  };

  const handleConfirmQtyChange = (index, value) => {
    setConfirmationRows((prev) =>
      prev.map((row, i) => {
        if (i !== index || toBoolean(row.confirmed)) return row;

        const maxQty = toNumber(row.forecastQty ?? row.orderQty);
        const enteredQty = toNumber(value);
        const nextQty = maxQty > 0 && enteredQty > maxQty ? maxQty : value;

        return { ...row, orderQty: nextQty };
      }),
    );
  };

  const handleConfirmDateChange = (index, value) => {
    setConfirmationRows((prev) =>
      prev.map((row, i) => (i === index && !toBoolean(row.confirmed) ? { ...row, deliveryDate: value } : row)),
    );
  };

  const confirmOrder = async () => {
    if (!hasTaggedBranch) {
      showToast("No branch is tagged to the logged-in user account.", "error");
      return;
    }

    const details = confirmationRows
      .filter((row) => !toBoolean(row.confirmed) && toNumber(row.orderQty) > 0)
      .map((row) => ({
        forecastId: row.forecastId,
        itemCode: row.itemCode,
        itemName: row.itemName,
        uomCode: row.uomCode,
        deliveryDate: row.deliveryDate || deliveryDate,
        orderQty: Number(row.orderQty || 0),
      }));

    if (details.length === 0) {
      showToast("No unconfirmed quantity to submit.", "error");
      return;
    }

    const today = formatDate(new Date());
    const hasPastDeliveryDate = details.some((row) => normalizeDate(row.deliveryDate) < today);

    if (hasPastDeliveryDate) {
      showToast("Confirmation is only allowed for today or a future delivery date.", "error");
      return;
    }

    const payloadDeliveryDate = details[0]?.deliveryDate || deliveryDate;

    const payload = {
      userCode,
      storeCode,
      storeType,
      deliveryDate: payloadDeliveryDate,
      orderType: "ConfirmedOrder",
      details,
    };

    setConfirmSubmitting(true);
    try {
      const res = await postRequest("store-portal/confirm-order", payload);
      showToast(res?.message || "Order confirmed successfully.");
      await loadItems({ silent: true });
      await loadConfirmation();
    } catch (error) {
      console.error("Failed to confirm store portal order:", error);
      showToast("Unable to confirm order.", "error");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const totalForecastQty = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + dates.reduce((dateSum, date) => dateSum + Number(orderMatrix[item.itemCode]?.[date] || 0), 0),
        0,
      ),
    [items, dates, orderMatrix],
  );

  const totalForecastPerDay = useMemo(
    () =>
      dates.reduce((totals, date) => {
        totals[date] = items.reduce((sum, item) => sum + Number(orderMatrix[item.itemCode]?.[date] || 0), 0);
        return totals;
      }, {}),
    [items, dates, orderMatrix],
  );

  const getItemForecastTotal = useCallback(
    (itemCode) => dates.reduce((sum, date) => sum + Number(orderMatrix[itemCode]?.[date] || 0), 0),
    [dates, orderMatrix],
  );

  const totalConfirmedQty = useMemo(
    () => confirmationRows.reduce((sum, row) => sum + Number(row.orderQty || 0), 0),
    [confirmationRows],
  );

  return (
    <div className="global-tran-main-div-ui !mt-0 min-w-0 overflow-x-hidden px-2 pb-20 pt-[136px] sm:pt-[112px] md:pt-[116px] lg:pt-[120px]">
      {isBusy && <LoadingSpinner />}
      <Toast toast={toast} />

      <div className="fixed left-2 right-2 top-[54px] z-[120] flex max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-lg bg-gradient-to-r from-blue-200 to-blue-100 p-2 text-blue-900 shadow-xl dark:bg-blue-900 dark:text-white sm:left-4 sm:right-4 sm:top-[62px] sm:max-w-none sm:flex-row sm:items-center sm:justify-between md:left-6 md:right-6">
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="break-words px-1 text-base font-semibold leading-tight sm:px-3 sm:text-xl lg:text-2xl">
            Store Portal Ordering
          </h1>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 text-center sm:w-auto sm:min-w-[260px] sm:gap-4">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-gray-600 dark:text-white sm:text-xs">
              User Account
            </p>
            <h1 className="truncate text-xs font-extrabold text-gray-800 dark:text-gray-200 sm:text-sm lg:text-base">
              {userCode || "Loading"}
            </h1>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-gray-600 dark:text-white sm:text-xs">
              Tagged Branch
            </p>
            <h1 className={`truncate text-xs font-extrabold sm:text-sm lg:text-base ${hasTaggedBranch ? "global-tran-stat-text-finalized-ui" : "global-tran-stat-text-closed-ui"}`}>
              {branchCode || "Not Tagged"}
            </h1>
          </div>
        </div>
      </div>

      <div className="global-tran-header-div-ui !mt-0 !p-3 sm:!p-4">
        <div className="global-tran-header-tab-div-ui">
          <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
            Basic Information
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1 sm:gap-2 md:grid-cols-2 xl:grid-cols-4">
          <FloatingField id="userAccount" label="User Account" value={userDisplay || "Loading user..."} readOnly />
          <FloatingField id="branchTagged" label="Tagged Branch" value={branchDisplay || "No branch tagged"} readOnly />
          <FloatingField id="storeCode" label="Store Code" value={storeCode || ""} readOnly />
          <FloatingField id="storeType" label="Store Type" type="select" value={storeType} onChange={setStoreType}>
            <option value="Company">Company Store</option>
            <option value="Franchisee">Franchisee</option>
            <option value="Both">Both</option>
          </FloatingField>
        </div>

        {!hasTaggedBranch && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
            This account has no branch tagged in the Users table. Store Portal ordering is disabled until a branch is assigned.
          </div>
        )}
      </div>

      <div className="global-tran-tab-div-ui !p-3 sm:!p-4 lg:!p-6">
        <div className="global-tran-tab-nav-ui !items-stretch !gap-3 sm:!items-center">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Weekly Forecast
            </button>
            {items.length > 0 && <StatusPill>{items.length} items</StatusPill>}
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <StatusPill variant="warning" className="min-h-[34px]">
              <Clock3 className="mr-1 h-3 w-3 shrink-0" />
              <span className="sm:hidden">Cutoff 1:00 PM</span>
              <span className="hidden sm:inline">Order confirmation cutoff 1:00 PM</span>
            </StatusPill>
            <ActionButton icon={RefreshCw} onClick={() => loadItems()} disabled={forecastLoading || !hasTaggedBranch}>
              {forecastLoading ? "Loading..." : "Load Items"}
            </ActionButton>
            <ActionButton icon={RotateCcw} onClick={resetWeeklyForecast} disabled={forecastLoading || items.length === 0}>
              Reset
            </ActionButton>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          <FloatingField id="forecastStartDate" label="Start Date" type="date" value={startDate} onChange={setStartDate} />
          <FloatingField id="forecastEndDate" label="End Date" type="date" value={endDate} onChange={setEndDate} />
          <FloatingField id="forecastDayCount" label="Forecast Days" value={dates.length ? String(dates.length) : "0"} readOnly />
        </div>

        <div className="mt-3 space-y-3 md:hidden">
          {items.map((item, index) => (
            <div
              key={`${item.itemCode || index}-weekly-card`}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-blue-50 px-3 py-2 dark:border-slate-700 dark:bg-blue-900/30">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {item.itemCode}
                  </div>
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {item.itemName}
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm dark:bg-gray-900 dark:text-slate-200">
                  {item.uomCode || "-"}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {dates.map((date, dateIndex) => {
                  const isConfirmed = isForecastCellConfirmed(item.itemCode, date);

                  return (
                    <div
                      key={`${item.itemCode}-${date}-weekly-card-row`}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                          {dayLabel(date)}
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {shortDate(date)}
                        </div>
                        {isConfirmed && (
                          <div className="text-[10px] font-bold uppercase text-green-600 dark:text-green-300">
                            Confirmed
                          </div>
                        )}
                      </div>

                      <div className="w-28 shrink-0 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
                        <QuantityInput
                          value={orderMatrix[item.itemCode]?.[date] ?? 0}
                          onChange={(value) => handleQtyChange(item.itemCode, date, value)}
                          disabled={isConfirmed}
                          navGroup="weekly-mobile"
                          navRow={index * dates.length + dateIndex}
                          navCol={0}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-gray-900 dark:text-white">
                <span>Total</span>
                <span>{getItemForecastTotal(item.itemCode).toLocaleString()}</span>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-gray-800 dark:text-slate-300">
              <div className="flex flex-col items-center justify-center gap-2">
                <PackageOpen className="h-8 w-8 text-slate-400" />
                <span>{hasTaggedBranch ? "No forecast items loaded." : "Assign a branch to this user before ordering."}</span>
              </div>
            </div>
          )}
        </div>

        <div className="global-tran-table-main-div-ui mt-3 hidden max-w-full overflow-x-auto sm:mt-4 md:block">
          <div className="global-tran-table-main-sub-div-ui !max-h-[56vh] sm:!max-h-[360px]">
            <table className="min-w-full border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_th]:border-b [&_th]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui">
                <tr>
                  <th className="global-tran-th-ui sticky top-0 z-[100] min-w-[78px] bg-blue-100 text-left dark:bg-blue-900 md:left-0 md:min-w-[90px]">Code</th>
                  <th className="global-tran-th-ui sticky top-0 z-[100] min-w-[150px] bg-blue-100 text-left dark:bg-blue-900 md:left-[90px] md:min-w-[150px]">Item Name</th>
                  <th className="global-tran-th-ui sticky top-0 z-[100] min-w-[50px] bg-blue-100 text-center dark:bg-blue-900 md:left-[240px] md:min-w-[70px] md:shadow-[2px_0_0_0_rgba(226,232,240,1)]">UOM</th>
                  {dates.map((date) => (
                    <th key={date} className="global-tran-th-ui sticky top-0 z-[95] min-w-[96px] bg-blue-100 dark:bg-blue-900 md:min-w-[80px]">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-300">{dayLabel(date)}</div>
                      <div>{shortDate(date)}</div>
                    </th>
                  ))}
                  <th className="global-tran-th-ui sticky top-0 z-[95] min-w-[90px] bg-blue-100 text-right dark:bg-blue-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.itemCode || index} className="global-tran-tr-ui">
                    <td className="global-tran-td-ui z-10 min-w-[78px] bg-white font-mono font-semibold dark:bg-black md:sticky md:left-0 md:min-w-[90px]">{item.itemCode}</td>
                    <td className="global-tran-td-ui z-10 min-w-[150px] bg-white font-medium dark:bg-black md:sticky md:left-[90px] md:min-w-[150px]">
                      <span className="block truncate">{item.itemName}</span>
                    </td>
                    <td className="global-tran-td-ui z-10 min-w-[50px] bg-white text-center dark:bg-black md:sticky md:left-[240px] md:min-w-[70px] md:shadow-[2px_0_0_0_rgba(226,232,240,1)]">
                      <span className="block w-full text-center text-xs font-medium text-slate-700 dark:text-slate-200">{item.uomCode || "-"}</span>
                    </td>
                    {dates.map((date, dateIndex) => (
                      <td key={`${item.itemCode}-${date}`} className="global-tran-td-ui text-center">
                        <QuantityInput
                          value={orderMatrix[item.itemCode]?.[date] ?? 0}
                          onChange={(value) => handleQtyChange(item.itemCode, date, value)}
                          disabled={isForecastCellConfirmed(item.itemCode, date)}
                          navGroup="weekly"
                          navRow={index}
                          navCol={dateIndex}
                        />
                      </td>
                    ))}
                    <td className="global-tran-td-ui bg-slate-50 text-right text-xs font-bold text-slate-800 dark:bg-gray-900 dark:text-white">
                      {getItemForecastTotal(item.itemCode).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {items.length > 0 && (
                  <tr className="bg-blue-50/80 font-bold dark:bg-blue-900/30">
                    <td className="global-tran-td-ui z-10 bg-blue-50 text-left text-xs font-bold text-slate-800 dark:bg-blue-900 dark:text-white md:sticky md:left-0" colSpan={3}>
                      Total Per Day
                    </td>
                    {dates.map((date) => (
                      <td key={`total-${date}`} className="global-tran-td-ui text-right text-xs font-bold text-slate-800 dark:text-white">
                        {(totalForecastPerDay[date] || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="global-tran-td-ui bg-blue-100 text-right text-xs font-bold text-slate-900 dark:bg-blue-900 dark:text-white">
                      {totalForecastQty.toLocaleString()}
                    </td>
                  </tr>
                )}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={dates.length + 4 || 4} className="global-tran-td-ui py-10 text-center text-sm text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageOpen className="h-8 w-8 text-slate-400" />
                        <span>{hasTaggedBranch ? "No forecast items loaded." : "Assign a branch to this user before ordering."}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="global-tran-tab-footer-main-div-ui !mt-4 !gap-3">
          <div className="global-tran-tab-footer-button-div-ui w-full sm:w-auto">
            <ActionButton
              icon={Send}
              onClick={submitWeeklyForecast}
              disabled={!hasTaggedBranch || items.length === 0 || forecastSubmitting}
              variant="success"
            >
              {forecastSubmitting ? "Submitting..." : "Submit Weekly Forecast"}
            </ActionButton>
          </div>

          <div className="global-tran-tab-footer-total-main-div-ui w-full rounded-lg bg-blue-50/60 px-3 py-2 sm:w-auto dark:bg-gray-900/40">
            <div className="global-tran-tab-footer-total-div-ui">
              <label className="global-tran-tab-footer-total-label-ui">Total Forecast Qty:</label>
              <label className="global-tran-tab-footer-total-value-ui">{totalForecastQty.toLocaleString()}</label>
            </div>
          </div>
        </div>
      </div>

      <div className="global-tran-tab-div-ui !p-3 sm:!p-4 lg:!p-6">
        <div className="global-tran-tab-nav-ui !items-stretch !gap-3 sm:!items-center">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Daily Order Confirmation
            </button>
            {confirmationRows.length > 0 && <StatusPill variant="success">{confirmationRows.length} lines</StatusPill>}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <ActionButton icon={RefreshCw} onClick={loadConfirmation} disabled={confirmLoading || !hasTaggedBranch}>
              {confirmLoading ? "Loading..." : "Load Forecast"}
            </ActionButton>
            <ActionButton
              icon={RotateCcw}
              onClick={resetConfirmationRows}
              disabled={confirmLoading || loadedConfirmationRows.length === 0}
            >
              Reset
            </ActionButton>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:max-w-xs sm:gap-4">
          <FloatingField id="deliveryDate" label="Forecast Date Order" type="date" value={deliveryDate} onChange={setDeliveryDate} />
        </div>

        <div className="mt-3 space-y-3 md:hidden">
          {confirmationRows.map((row, index) => {
            const isConfirmed = toBoolean(row.confirmed);

            return (
              <div
                key={`${row.itemCode || "item"}-${index}-confirmation-card`}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-blue-50 px-3 py-2 dark:border-slate-700 dark:bg-blue-900/30">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {row.itemCode}
                    </div>
                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {row.itemName}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm dark:bg-gray-900 dark:text-slate-200">
                    {row.uomCode || "-"}
                  </span>
                </div>

                <div className="space-y-3 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300">
                        Confirm Qty
                      </div>
                      {isConfirmed && (
                        <div className="text-[10px] font-bold uppercase text-green-600 dark:text-green-300">
                          Confirmed
                        </div>
                      )}
                    </div>
                    <div className="w-28 shrink-0 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
                      <QuantityInput
                        value={row.orderQty ?? 0}
                        onChange={(value) => handleConfirmQtyChange(index, value)}
                        tone="green"
                        max={row.forecastQty ?? row.orderQty}
                        navGroup="confirmation-mobile"
                        navRow={index}
                        navCol={0}
                        disabled={isConfirmed}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300">
                        Delivery Date
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {shortDate(row.deliveryDate || deliveryDate)}
                      </div>
                    </div>
                    <div className="w-36 shrink-0 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
                      <DateInput
                        value={row.deliveryDate || deliveryDate}
                        onChange={(value) => handleConfirmDateChange(index, value)}
                        disabled={isConfirmed}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {confirmationRows.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-gray-800 dark:text-slate-300">
              <div className="flex flex-col items-center justify-center gap-2">
                <PackageOpen className="h-8 w-8 text-slate-400" />
                <span>{hasTaggedBranch ? "No forecast rows loaded for confirmation." : "Assign a branch to this user before ordering."}</span>
              </div>
            </div>
          )}
        </div>

        <div className="global-tran-table-main-div-ui mt-3 hidden max-w-full overflow-x-auto sm:mt-4 md:block">
          <div className="global-tran-table-main-sub-div-ui !max-h-[56vh] sm:!max-h-[360px]">
            <table className="min-w-full border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_th]:border-b [&_th]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui">
                <tr>
                  <th className="global-tran-th-ui sticky top-0 z-[100] min-w-[78px] bg-blue-100 text-left dark:bg-blue-900 md:left-0 md:min-w-[90px]">Code</th>
                  <th className="global-tran-th-ui sticky top-0 z-[100] min-w-[150px] bg-blue-100 text-left dark:bg-blue-900 md:left-[90px] md:min-w-[180px]">Item Name</th>
                  <th className="global-tran-th-ui sticky top-0 z-[100] min-w-[58px] bg-blue-100 text-center dark:bg-blue-900 md:left-[270px] md:min-w-[74px] md:shadow-[2px_0_0_0_rgba(226,232,240,1)]">UOM</th>
                  <th className="global-tran-th-ui sticky top-0 z-[95] min-w-[110px] bg-blue-100 text-right dark:bg-blue-900 md:min-w-[120px]">Confirm Qty</th>
                  <th className="global-tran-th-ui sticky top-0 z-[95] min-w-[138px] bg-blue-100 text-left dark:bg-blue-900 md:min-w-[150px]">Delivery Date</th>
                </tr>
              </thead>
              <tbody>
                {confirmationRows.map((row, index) => (
                  <tr key={`${row.itemCode || "item"}-${index}`} className="global-tran-tr-ui">
                    <td className="global-tran-td-ui z-10 min-w-[78px] bg-white font-mono font-semibold dark:bg-black md:sticky md:left-0 md:min-w-[90px]">{row.itemCode}</td>
                    <td className="global-tran-td-ui z-10 min-w-[150px] bg-white font-medium dark:bg-black md:sticky md:left-[90px] md:min-w-[180px]">
                      <span className="block truncate">{row.itemName}</span>
                    </td>
                    <td className="global-tran-td-ui z-10 min-w-[58px] bg-white text-center dark:bg-black md:sticky md:left-[270px] md:min-w-[70px] md:shadow-[2px_0_0_0_rgba(226,232,240,1)]">
                      <span className="block w-full text-center text-xs font-medium text-slate-700 dark:text-slate-200">{row.uomCode || "-"}</span>
                    </td>
                    <td className="global-tran-td-ui text-right">
                      <QuantityInput
                        value={row.orderQty ?? 0}
                        onChange={(value) => handleConfirmQtyChange(index, value)}
                        tone="green"
                        max={row.forecastQty ?? row.orderQty}
                        navGroup="confirmation"
                        navRow={index}
                        navCol={0}
                        disabled={toBoolean(row.confirmed)}
                      />
                    </td>
                    <td className="global-tran-td-ui text-left">
                      <DateInput
                        value={row.deliveryDate || deliveryDate}
                        onChange={(value) => handleConfirmDateChange(index, value)}
                        disabled={toBoolean(row.confirmed)}
                      />
                    </td>
                  </tr>
                ))}

                {confirmationRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="global-tran-td-ui py-10 text-center text-sm text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageOpen className="h-8 w-8 text-slate-400" />
                        <span>{hasTaggedBranch ? "No forecast rows loaded for confirmation." : "Assign a branch to this user before ordering."}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="global-tran-tab-footer-main-div-ui !mt-4 !gap-3">
          <div className="global-tran-tab-footer-button-div-ui w-full sm:w-auto">
            <ActionButton
              icon={CheckCircle2}
              onClick={confirmOrder}
              disabled={
                !hasTaggedBranch ||
                confirmationRows.length === 0 ||
                confirmSubmitting ||
                !confirmationRows.some((row) => !toBoolean(row.confirmed) && toNumber(row.orderQty) > 0)
              }
              variant="success"
            >
              {confirmSubmitting ? "Confirming..." : "Confirm Order"}
            </ActionButton>
          </div>

          <div className="global-tran-tab-footer-total-main-div-ui w-full rounded-lg bg-blue-50/60 px-3 py-2 sm:w-auto dark:bg-gray-900/40">
            <div className="global-tran-tab-footer-total-div-ui">
              <label className="global-tran-tab-footer-total-label-ui">Total Confirmed Qty:</label>
              <label className="global-tran-tab-footer-total-value-ui">{totalConfirmedQty.toLocaleString()}</label>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 hidden max-w-[calc(100vw-2rem)] gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-lg dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200 md:flex md:max-w-[420px]">
        <UserRound className="h-4 w-4 text-blue-600" />
        <span className="truncate">{userCode || "User"}</span>
        <span className="text-slate-300">|</span>
        <Building2 className="h-4 w-4 text-blue-600" />
        <span className="truncate">{branchDisplay || "No branch tagged"}</span>
      </div>
    </div>
  );
}
