import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  ListTree,
  PackageOpen,
  Boxes,
  LayoutList,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  apiClient,
  fetchData,
  postRequest,
} from "../../../Configuration/BaseURL.jsx";
import { LoadingSpinner } from "../../../Global/utilities.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import SearchSalesRepRef from "../../../Lookup/SearchSalesRepRef.jsx";
import { useTopSalesRepRow as getTopSalesRepRow } from "../../../Global/top1RefTable";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const pad2 = (value) => String(value).padStart(2, "0");

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const addDays = (date, days) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

const getDateRange = (start, end) => {
  if (!start || !end) return [];
  const dates = [];
  let current = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (current <= last) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const dayLabel = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" });
};

const normalizeDateKey = (value) => {
  if (!value) return "";

  const rawValue = String(value).trim();
  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime()) ? "" : formatDate(parsedDate);
};

const getCategoryLabel = (row = {}) => {
  const category = String(
    row?.categCode ?? row?.categoryCode ?? row?.category ?? "",
  ).trim();
  return category || "Uncategorized";
};

const getStoreKey = (row = {}) =>
  String(row?.storeCode ?? row?.store ?? "").trim();

const getStoreLabel = (row = {}) => {
  const storeName = String(
    row?.storeName ?? row?.branchName ?? row?.store ?? "",
  ).trim();
  const storeCode = String(row?.storeCode ?? "").trim();

  return storeName || storeCode || "Unspecified Store";
};

const tabs = [
  {
    key: "forecastSummary",
    label: "Forecast Summary",
    viewType: "forecast",
    icon: LayoutList,
    endpoint: "commissary/forecast-summary",
    detailed: false,
    emptyText: "No forecast quantity available for this date range.",
  },
  {
    key: "forecastDetailed",
    label: "Forecast Detailed",
    viewType: "forecast",
    icon: ListTree,
    endpoint: "commissary/forecast-detailed",
    detailed: true,
    emptyText: "No forecast detail available for this date range.",
  },
  {
    key: "forecastMaterialNeededSummary",
    label: "Material Needed Detailed",
    viewType: "forecast",
    icon: Boxes,
    endpoint: "commissary/forecast-material-needed-summary",
    materialSummary: true,
    emptyText: "No material summary available for this forecast date range.",
  },
  {
    key: "forecastMaterialNeeded",
    label: "Material Needed Summary",
    viewType: "forecast",
    icon: PackageOpen,
    endpoint: "commissary/forecast-material-needed",
    detailed: false,
    emptyText:
      "No material requirement available for this forecast date range.",
  },
  {
    key: "confirmedSummary",
    label: "Confirmed Summary",
    viewType: "confirmed",
    icon: LayoutList,
    endpoint: "commissary/confirmed-summary",
    detailed: false,
    emptyText: "No confirmed quantity available for this date range.",
  },
  {
    key: "confirmedDetailed",
    label: "Confirmed Detailed",
    viewType: "confirmed",
    icon: ListTree,
    endpoint: "commissary/confirmed-detailed",
    detailed: true,
    emptyText: "No confirmed detail available for this date range.",
  },
  {
    key: "confirmedMaterialNeededSummary",
    label: "Material Needed Detailed",
    viewType: "confirmed",
    icon: Boxes,
    endpoint: "commissary/confirmed-material-needed-summary",
    materialSummary: true,
    emptyText: "No material summary available for this confirmed date range.",
  },
  {
    key: "confirmedMaterialNeeded",
    label: "Material Needed",
    viewType: "confirmed",
    icon: PackageOpen,
    endpoint: "commissary/confirmed-material-needed",
    detailed: false,
    emptyText:
      "No material requirement available for this confirmed date range.",
  },
];

/* ─── shared UI ───────────────────────────────────────────────────────────── */
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

const ActionButton = ({ children, icon: Icon, onClick, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors sm:w-auto sm:px-4 sm:text-sm ${
      disabled
        ? "cursor-not-allowed bg-gray-400 hover:bg-gray-400 dark:bg-gray-700"
        : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800"
    }`}
  >
    {Icon && <Icon className="h-4 w-4 shrink-0" />}
    {children}
  </button>
);

const unwrapData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.result)) return response.result;
  return [];
};

const pivotRows = (rows = [], isDetailed = false) => {
  const map = new Map();

  rows.forEach((item) => {
    const itemCode = item.itemCode || "";
    const storeCode = item.storeCode || "";
    const deliveryDate = normalizeDateKey(item.deliveryDate);
    const qty = Number(item.qty ?? item.totalQty ?? item.storeQty ?? 0);

    if (!itemCode || !deliveryDate || !Number.isFinite(qty) || qty <= 0) {
      return;
    }

    const key = isDetailed ? `${storeCode}|${itemCode}` : itemCode;

    if (!map.has(key)) {
      map.set(key, {
        store: item.storeName || item.branchName || storeCode,
        storeName: item.storeName || item.branchName || "",
        storeCode,
        itemCode,
        itemDesc: item.itemDesc || item.itemName || "",
        categCode: item.categCode || item.categoryCode || "",
        uomCode: item.uomCode || "",
        dates: {},
        total: 0,
        sentQty: 0,
        unsentQty: 0,
        integrationStatus: "Not Sent",
      });
    }

    const row = map.get(key);
    row.dates[deliveryDate] = (Number(row.dates[deliveryDate]) || 0) + qty;
    row.total += qty;
    row.sentQty += Number(item.sentQty) || 0;
    row.unsentQty +=
      item.unsentQty === undefined || item.unsentQty === null
        ? qty
        : Number(item.unsentQty) || 0;
    row.integrationStatus =
      row.unsentQty <= 0
        ? "Sent"
        : row.sentQty > 0
          ? "Partially Sent"
          : "Not Sent";
  });

  return Array.from(map.values());
};

const buildMaterialSummaryRows = (rows = []) => {
  const materials = new Map();

  rows.forEach((item) => {
    const itemCode = String(item.itemCode || "").trim();
    const deliveryDate = normalizeDateKey(item.deliveryDate);
    const qty = Number(item.qty ?? item.totalQty ?? item.storeQty ?? 0);

    if (!itemCode || !deliveryDate || !Number.isFinite(qty) || qty <= 0) return;

    if (!materials.has(itemCode)) {
      materials.set(itemCode, {
        itemCode,
        itemDesc: item.itemDesc || item.itemName || "",
        categCode: item.categCode || item.categoryCode || "",
        uomCode: item.uomCode || "",
        dates: {},
        total: 0,
        produceItems: new Map(),
      });
    }

    const material = materials.get(itemCode);
    material.dates[deliveryDate] =
      (Number(material.dates[deliveryDate]) || 0) + qty;
    material.total += qty;

    const produceItemCode = String(
      item.produceItemCode || item.finishedItemCode || "Unspecified",
    ).trim();

    if (!material.produceItems.has(produceItemCode)) {
      material.produceItems.set(produceItemCode, {
        itemCode: produceItemCode,
        itemDesc:
          item.produceItemDesc ||
          item.produceItemName ||
          item.finishedItemName ||
          "Unspecified finished item",
        uomCode: item.produceUomCode || item.finishedUomCode || "",
        dates: {},
        total: 0,
        branches: new Map(),
      });
    }

    const produceItem = material.produceItems.get(produceItemCode);
    produceItem.dates[deliveryDate] =
      (Number(produceItem.dates[deliveryDate]) || 0) + qty;
    produceItem.total += qty;

    const branchCode = String(item.storeCode || item.branchCode || "").trim();
    const branchName = String(
      item.storeName || item.branchName || branchCode || "Unspecified Branch",
    ).trim();
    const branchKey = branchCode || branchName;

    if (!produceItem.branches.has(branchKey)) {
      produceItem.branches.set(branchKey, {
        branchCode,
        branchName,
        dates: {},
        total: 0,
      });
    }

    const branch = produceItem.branches.get(branchKey);
    branch.dates[deliveryDate] =
      (Number(branch.dates[deliveryDate]) || 0) + qty;
    branch.total += qty;
  });

  return Array.from(materials.values()).map((material) => ({
    ...material,
    produceItems: Array.from(material.produceItems.values()).map(
      (produceItem) => ({
        ...produceItem,
        branches: Array.from(produceItem.branches.values()).sort((a, b) =>
          String(a.branchName || a.branchCode).localeCompare(
            String(b.branchName || b.branchCode),
          ),
        ),
      }),
    ),
  }));
};

/* ─── Dynamic Date Range & Zero-Qty Filtering Helper ─────────────────── */
const filterByDates = (rows = [], validDates = [], isMaterialSummary = false) => {
  if (!validDates.length) return [];

  const normalizedDates = validDates.map(normalizeDateKey).filter(Boolean);
  const pickSelectedDates = (dateValues = {}) =>
    normalizedDates.reduce((selected, date) => {
      const quantity = Number(dateValues?.[date]) || 0;
      if (quantity > 0) selected[date] = quantity;
      return selected;
    }, {});

  if (!isMaterialSummary) {
    return rows
      .map((row) => {
        const dates = pickSelectedDates(row.dates);
        const total = normalizedDates.reduce(
          (sum, date) => sum + (Number(row.dates?.[date]) || 0),
          0,
        );
        return { ...row, dates, total };
      })
      .filter((row) => row.total > 0);
  }

  return rows
    .map((material) => {
      const produceItems = (material.produceItems || [])
        .map((prod) => {
          const branches = (prod.branches || [])
            .map((branch) => {
              const dates = pickSelectedDates(branch.dates);
              const total = normalizedDates.reduce(
                (sum, date) => sum + (Number(branch.dates?.[date]) || 0),
                0,
              );
              return { ...branch, dates, total };
            })
            .filter((branch) => branch.total > 0);

          const total = branches.reduce((sum, b) => sum + b.total, 0);
          return {
            ...prod,
            dates: pickSelectedDates(prod.dates),
            branches,
            total,
          };
        })
        .filter((prod) => prod.total > 0);

      const total = produceItems.reduce((sum, p) => sum + p.total, 0);
      return {
        ...material,
        dates: pickSelectedDates(material.dates),
        produceItems,
        total,
      };
    })
    .filter((material) => material.total > 0);
};

const QuantityCells = ({ dates, row, className = "" }) => (
  <>
    {dates.map((date) => (
      <td
        key={date}
        className={`global-tran-td-ui w-[96px] min-w-[96px] max-w-[96px] text-right font-medium ${className}`}
      >
        {row.dates?.[date] ? row.dates[date].toLocaleString() : "-"}
      </td>
    ))}
    <td
      className={`global-tran-td-ui w-[100px] min-w-[100px] max-w-[100px] text-right text-xs font-bold ${className}`}
    >
      {(Number(row.total) || 0).toLocaleString()}
    </td>
  </>
);

const MaterialSummaryRows = ({
  materials,
  dates,
  expandedMaterials,
  onToggleMaterial,
}) => (
  <>
    {materials.map((material) => {
      const isExpanded = expandedMaterials.includes(material.itemCode);

      return (
        <React.Fragment key={`material-${material.itemCode}`}>
          <tr className="bg-white hover:bg-slate-50 dark:bg-black dark:hover:bg-gray-900/50">
            <td className="global-tran-td-ui w-[180px] min-w-[180px] text-left font-semibold text-slate-600 dark:text-slate-300">
              All Branches
            </td>
            <td className="global-tran-td-ui w-[120px] min-w-[120px] text-left font-mono text-sm">
              <button
                type="button"
                onClick={() => onToggleMaterial(material.itemCode)}
                className="flex w-full items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                {material.itemCode}
              </button>
            </td>
            <td className="global-tran-td-ui w-[260px] min-w-[260px] text-left font-semibold">
              {material.itemDesc}
            </td>
            <td className="global-tran-td-ui w-[90px] min-w-[90px] text-left font-semibold text-slate-600 dark:text-slate-300">
              {material.uomCode || "-"}
            </td>
            <QuantityCells
              dates={dates}
              row={material}
              className="bg-slate-50 text-blue-700 dark:bg-gray-900 dark:text-blue-300"
            />
          </tr>

          {isExpanded &&
            material.produceItems.map((produceItem) => (
              <React.Fragment
                key={`produce-${material.itemCode}-${produceItem.itemCode}`}
              >
                <tr className="bg-emerald-50/70 dark:bg-emerald-950/20">
                  <td className="global-tran-td-ui w-[180px] min-w-[180px] text-left text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    
                  </td>
                  <td className="global-tran-td-ui w-[120px] min-w-[120px] pl-7 text-left font-mono text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    {produceItem.itemCode}
                  </td>
                  <td className="global-tran-td-ui w-[260px] min-w-[260px] text-left font-medium">
                    {produceItem.itemDesc}
                  </td>
                  <td className="global-tran-td-ui w-[90px] min-w-[90px] text-left font-semibold text-slate-600 dark:text-slate-300">
                    {produceItem.uomCode || "-"}
                  </td>
                  <QuantityCells dates={dates} row={produceItem} />
                </tr>

                {produceItem.branches.map((branch) => (
                  <tr
                    key={`branch-${material.itemCode}-${produceItem.itemCode}-${branch.branchCode || branch.branchName}`}
                    className="bg-slate-50/80 hover:bg-slate-100 dark:bg-gray-950 dark:hover:bg-gray-900"
                  >
                    <td className="global-tran-td-ui w-[180px] min-w-[180px] pl-7 text-left font-semibold text-slate-700 dark:text-slate-200">
                      {branch.branchName || branch.branchCode}
                    </td>
                    <td className="global-tran-td-ui w-[120px] min-w-[120px] text-left text-xs font-semibold text-slate-500">
                      Required
                    </td>
                    <td className="global-tran-td-ui w-[260px] min-w-[260px] text-left text-xs text-slate-500">
                      Material needed 
                    </td>
                    <td className="global-tran-td-ui w-[90px] min-w-[90px] text-left font-semibold text-slate-600 dark:text-slate-300">
                      {material.uomCode || "-"}
                    </td>
                    <QuantityCells dates={dates} row={branch} />
                  </tr>
                ))}
              </React.Fragment>
            ))}
        </React.Fragment>
      );
    })}
  </>
);

/* ─── main component ──────────────────────────────────────────────────────── */
export default function CommissaryForecast() {
  const { currentUserRow } = useAuth();
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(addDays(formatDate(new Date()), 6));
  const [category, setCategory] = useState("All");
  const [viewType, setViewType] = useState("forecast");
  const [activeTab, setActiveTab] = useState("forecastSummary");
  const [storeFilter, setStoreFilter] = useState("All");
  const [collapsedCategoriesByTab, setCollapsedCategoriesByTab] = useState({});
  const [expandedMaterialsByTab, setExpandedMaterialsByTab] = useState({});

  const [tabData, setTabData] = useState({
    forecastSummary: [],
    forecastDetailed: [],
    forecastMaterialNeededSummary: [],
    forecastMaterialNeeded: [],
    confirmedSummary: [],
    confirmedDetailed: [],
    confirmedMaterialNeededSummary: [],
    confirmedMaterialNeeded: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoryDescriptionsByCode, setCategoryDescriptionsByCode] = useState({});
  const [branchNamesByCode, setBranchNamesByCode] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const [isGeneratingWO, setIsGeneratingWO] = useState(false);
  const [isSendingToSODR, setIsSendingToSODR] = useState(false);
  const [woSuccessMsg, setWoSuccessMsg] = useState("");
  const [showSODRModal, setShowSODRModal] = useState(false);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);
  const [showSalesRepLookup, setShowSalesRepLookup] = useState(false);
  const [selectedIntegrationRowIds, setSelectedIntegrationRowIds] = useState([]);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [soDrForm, setSoDrForm] = useState({
    customerCode: "",
    customerName: "",
    poNumber: "",
    remarks: "",
    salesRepCode: "",
    salesRepName: "",
  });

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.viewType === viewType),
    [viewType],
  );

  const activeTabConfig = useMemo(
    () =>
      visibleTabs.find((tab) => tab.key === activeTab) ||
      visibleTabs[0] ||
      tabs[0],
    [activeTab, visibleTabs],
  );

  const dates = useMemo(
    () => getDateRange(startDate, endDate),
    [startDate, endDate],
  );

  const loadCategories = async () => {
    try {
      const response = await fetchData("commissary/categories");
      setCategories(unwrapData(response));
    } catch (error) {
      console.error("Failed to load commissary categories", error);
      setCategories([]);
    }
  };

  const loadCategoryDescriptions = async () => {
    try {
      const response = await fetchData("fgCateg");
      const rawResult =
        response?.data?.[0]?.result ??
        response?.result ??
        response?.data ??
        "[]";
      const categoryRows = Array.isArray(rawResult)
        ? rawResult
        : JSON.parse(rawResult);
      const descriptionMap = {};

      categoryRows.forEach((categoryRow) => {
        const categoryCode = String(
          categoryRow.code || categoryRow.categCode || "",
        ).trim();
        const categoryDescription = String(
          categoryRow.description ||
            categoryRow.categName ||
            categoryRow.categDesc ||
            "",
        ).trim();
        if (!categoryCode || !categoryDescription) return;

        descriptionMap[categoryCode] = categoryDescription;
        descriptionMap[categoryCode.toUpperCase()] = categoryDescription;
      });

      setCategoryDescriptionsByCode(descriptionMap);
    } catch (error) {
      console.error("Failed to load Commissary category descriptions", error);
      setCategoryDescriptionsByCode({});
    }
  };

  const loadBranchNames = async () => {
    try {
      const response = await fetchData("lookupBranch", {
        PARAMS: JSON.stringify({
          search: "",
          page: 1,
          pageSize: 5000,
        }),
      });
      const rawResult = response?.data?.[0]?.result || "[]";
      const branches = Array.isArray(rawResult)
        ? rawResult
        : JSON.parse(rawResult);
      const nameMap = {};

      branches.forEach((branch) => {
        const branchCode = String(branch.branchCode || "").trim();
        const branchName = String(branch.branchName || "").trim();
        if (!branchCode || !branchName) return;

        nameMap[branchCode] = branchName;
        nameMap[branchCode.toUpperCase()] = branchName;
      });

      setBranchNamesByCode(nameMap);
    } catch (error) {
      console.error("Failed to load Commissary branch names", error);
      setBranchNamesByCode({});
    }
  };

  const loadCommissaryData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setWoSuccessMsg("");

    try {
      if (!startDate || !endDate) {
        setTabData({
          forecastSummary: [],
          forecastDetailed: [],
          forecastMaterialNeededSummary: [],
          forecastMaterialNeeded: [],
          confirmedSummary: [],
          confirmedDetailed: [],
          confirmedMaterialNeededSummary: [],
          confirmedMaterialNeeded: [],
        });
        setErrorMessage("Start Date and End Date are required.");
        return;
      }

      const queryParams = {
        startDate,
        endDate,
        category: category || "All",
      };

      const responses = await Promise.all(
        tabs.map((tab) =>
          fetchData(tab.endpoint, {
            ...queryParams,
            ...(tab.detailed ? { storeCode: "All" } : {}),
          }),
        ),
      );

      const nextData = {};
      tabs.forEach((tab, index) => {
        const responseRows = unwrapData(responses[index]);
        nextData[tab.key] = tab.materialSummary
          ? buildMaterialSummaryRows(responseRows)
          : pivotRows(responseRows, tab.detailed);
      });

      setTabData(nextData);
    } catch (error) {
      console.error("Failed to fetch commissary data", error);
      setTabData({
        forecastSummary: [],
        forecastDetailed: [],
        forecastMaterialNeededSummary: [],
        forecastMaterialNeeded: [],
        confirmedSummary: [],
        confirmedDetailed: [],
        confirmedMaterialNeededSummary: [],
        confirmedMaterialNeeded: [],
      });
      const responseData = error?.response?.data;
      const firstValidationError = responseData?.errors
        ? Object.values(responseData.errors).flat().find(Boolean)
        : "";

      setErrorMessage(
        firstValidationError ||
          responseData?.message ||
          error?.message ||
          "Failed to load commissary data.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateWorkOrders = async () => {
    if (!startDate || !endDate) {
      setErrorMessage("Please select both Start Date and End Date.");
      return;
    }

    const confirmAction = window.confirm(
      `Generate consolidated Work Orders for all confirmed items between ${startDate} and ${endDate}?\n\nNote: Once generated, the confirmation records will be locked and cannot be edited or integrated again.`
    );
    if (!confirmAction) return;

    setIsGeneratingWO(true);
    setErrorMessage("");
    setWoSuccessMsg("");

    try {
      const res = await apiClient.post("commissary/generate-work-orders", {
        startDate,
        endDate,
      });
      const response = res.data;

      setWoSuccessMsg(response?.message || "Consolidated Work Orders generated and locked successfully!");
      await loadCommissaryData();
    } catch (error) {
      console.error("Failed to generate Work Orders", error);
      const responseData = error?.response?.data;
      const firstValidationError = responseData?.errors
        ? Object.values(responseData.errors).flat().find(Boolean)
        : "";

      setErrorMessage(
        firstValidationError ||
          responseData?.message ||
          error?.message ||
          "Failed to generate Work Orders."
      );
    } finally {
      setIsGeneratingWO(false);
    }
  };

  const handleSelectIntegrationCustomer = async (selectedCustomer) => {
    setShowCustomerLookup(false);
    if (!selectedCustomer) return;

    const customerCode = String(selectedCustomer.custCode || "").trim();
    const customerName = selectedCustomer.custName || "";
    let salesRepCode = selectedCustomer.salesRepCode || "";
    let salesRepName = selectedCustomer.salesRepName || "";

    setSoDrForm((previous) => ({
      ...previous,
      customerCode,
      customerName,
      salesRepCode,
      salesRepName,
    }));

    if (!customerCode) return;

    setIsLoadingCustomer(true);
    setErrorMessage("");

    try {
      const response = await postRequest(
        "getCustomer",
        JSON.stringify({ CUST_CODE: customerCode }),
      );

      if (response?.success && response?.data?.[0]?.result) {
        const customerRows = JSON.parse(response.data[0].result);
        const customerSetup = Array.isArray(customerRows)
          ? customerRows[0] || {}
          : {};
        salesRepCode = customerSetup.salesRepCode || salesRepCode;
        salesRepName = customerSetup.salesRepName || salesRepName;
      }

      if (salesRepCode) {
        const salesRep = await getTopSalesRepRow(salesRepCode);
        salesRepName = salesRep?.salesRepName || salesRepName;
      }

      setSoDrForm((previous) => ({
        ...previous,
        customerCode,
        customerName,
        salesRepCode,
        salesRepName,
      }));
    } catch (error) {
      console.error("Failed to load customer sales representative", error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load the customer's configured sales representative.",
      );
    } finally {
      setIsLoadingCustomer(false);
    }
  };

  const handleSelectIntegrationSalesRep = (selectedSalesRep) => {
    setShowSalesRepLookup(false);
    if (!selectedSalesRep) return;

    setSoDrForm((previous) => ({
      ...previous,
      salesRepCode: selectedSalesRep.salesRepCode || "",
      salesRepName: selectedSalesRep.salesRepName || "",
    }));
  };

  const handleSendConfirmedToSODR = async () => {
    if (!startDate || !endDate) {
      setErrorMessage("Please select both Start Date and End Date.");
      return;
    }

    if (!currentUserRow?.branchCode || !currentUserRow?.userCode) {
      setErrorMessage(
        "Your Branch Code or User Code is missing. Please log in again before sending.",
      );
      return;
    }

    if (integrationRows.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "Nothing to send",
        text: "All confirmed details in the selected filters were already sent to SO and DR.",
      });
      return;
    }

    if (selectedIntegrationRows.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Select item(s)",
        text: "Please select at least one item to send to SO/DR.",
      });
      return;
    }

    const selectedItems = selectedIntegrationRows.map((row) => ({
      storeCode: getStoreKey(row),
      itemCode: row.itemCode || "",
      deliveryDates: Object.keys(row.dates || {}).filter(
        (deliveryDate) => Number(row.dates?.[deliveryDate]) > 0,
      ),
      quantity: Number(row.unsentQty ?? row.total) || 0,
    }));

    const confirmation = await Swal.fire({
      icon: "question",
      title: `Send ${selectedItems.length.toLocaleString()} selected item(s)?`,
      text: "Only the checked items and their remaining unsent quantities will be integrated. This will create a closed SO and an open DR for picking per Store and Delivery Date.",
      showCancelButton: true,
      confirmButtonText: "Send",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) return;

    setIsSendingToSODR(true);
    setErrorMessage("");
    setWoSuccessMsg("");

    try {
      const response = await apiClient.post(
        "commissary/send-confirmed-to-so-dr",
        {
          startDate,
          endDate,
          category: category || "All",
          storeCode: storeFilter || "All",
          branchCode: currentUserRow.branchCode,
          userCode: currentUserRow.userCode,
          documentDate: formatDate(new Date()),
          soTranType: "SO01",
          drTranType: "DR01",
          customerCode: soDrForm.customerCode,
          poNumber: soDrForm.poNumber,
          salesRepCode: soDrForm.salesRepCode,
          remarks: soDrForm.remarks,
          selectedItems,
        },
      );

      const createdDocuments = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      const successMessage = `${createdDocuments.length.toLocaleString()} SO/DR pair(s) created. The SO is closed and the DR is open for picking.`;

      setShowSODRModal(false);
      setSelectedIntegrationRowIds([]);
      setWoSuccessMsg(successMessage);
      await loadCommissaryData();

      await Swal.fire({
        icon: "success",
        title: "Sent successfully",
        text: successMessage,
      });
    } catch (error) {
      console.error("Failed to send confirmed details to SO/DR", error);
      const responseData = error?.response?.data;
      const responseStatus = error?.response?.status;
      const allowedMethods = error?.response?.headers?.allow;
      const firstValidationError = responseData?.errors
        ? Object.values(responseData.errors).flat().find(Boolean)
        : "";
      const message =
        responseStatus === 405
          ? `The backend route POST /api/commissary/send-confirmed-to-so-dr is not registered.${
              allowedMethods ? ` Allowed method(s): ${allowedMethods}.` : ""
            } Please add the POST route in the API before sending.`
          : firstValidationError ||
            responseData?.message ||
            error?.message ||
            "SO/DR integration failed.";

      setErrorMessage(message);
      await Swal.fire({
        icon: "error",
        title: "Unable to send",
        text: message,
      });
    } finally {
      setIsSendingToSODR(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadCategoryDescriptions();
    loadBranchNames();
    loadCommissaryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentTab = tabs.find((tab) => tab.key === activeTab);
    if (currentTab?.viewType === viewType) return;

    setActiveTab(
      viewType === "forecast" ? "forecastSummary" : "confirmedSummary",
    );
    setStoreFilter("All");
  }, [activeTab, viewType]);

  useEffect(() => {
    if (!showSODRModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setShowSODRModal(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSODRModal]);

  const storeOptions = useMemo(() => {
    const map = new Map();
    const sourceRows =
      viewType === "forecast"
        ? tabData.forecastDetailed
        : tabData.confirmedDetailed;

    sourceRows.forEach((row) => {
      const storeKey = getStoreKey(row);
      if (!storeKey) return;

      if (!map.has(storeKey)) {
        map.set(
          storeKey,
          branchNamesByCode[storeKey] ||
            branchNamesByCode[storeKey.toUpperCase()] ||
            getStoreLabel(row),
        );
      }
    });

    return Array.from(map, ([storeCode, storeName]) => ({
      storeCode,
      storeName,
    })).sort((a, b) =>
      String(a.storeName || a.storeCode).localeCompare(
        String(b.storeName || b.storeCode),
      ),
    );
  }, [
    tabData.forecastDetailed,
    tabData.confirmedDetailed,
    viewType,
    branchNamesByCode,
  ]);

  const activeRawData = tabData[activeTab] || [];

  const currentData = useMemo(() => {
    let source = activeRawData;

    if (
      activeTabConfig.detailed &&
      !activeTabConfig.materialSummary &&
      storeFilter !== "All"
    ) {
      source = source.filter((row) => getStoreKey(row) === storeFilter);
    }

    const filteredRows = filterByDates(
      source,
      dates,
      activeTabConfig.materialSummary,
    );

    if (activeTabConfig.materialSummary) {
      return filteredRows.map((material) => ({
        ...material,
        produceItems: (material.produceItems || []).map((produceItem) => ({
          ...produceItem,
          branches: (produceItem.branches || []).map((branch) => {
            const branchCode = String(branch.branchCode || "").trim();
            const branchName =
              branchNamesByCode[branchCode] ||
              branchNamesByCode[branchCode.toUpperCase()] ||
              branch.branchName ||
              branchCode;

            return { ...branch, branchName };
          }),
        })),
      }));
    }

    return filteredRows.map((row) => {
      const branchCode = getStoreKey(row);
      const existingName = String(
        row.storeName || row.branchName || row.store || "",
      ).trim();
      const branchName =
        branchNamesByCode[branchCode] ||
        branchNamesByCode[branchCode.toUpperCase()] ||
        (existingName && existingName !== branchCode
          ? existingName
          : branchCode);

      return {
        ...row,
        store: branchName,
        storeName: branchName,
        branchName,
      };
    });
  }, [
    activeRawData,
    activeTabConfig.detailed,
    activeTabConfig.materialSummary,
    storeFilter,
    dates,
    branchNamesByCode,
  ]);

  const integrationRows = useMemo(
    () =>
      currentData
        .filter(
          (row) =>
            String(row.integrationStatus || "Not Sent") !== "Sent" &&
            (row.unsentQty === undefined || Number(row.unsentQty) > 0),
        )
        .map((row, index) => ({
          ...row,
          integrationRowId: `${getStoreKey(row)}|${row.itemCode || "item"}|${index}`,
        })),
    [currentData],
  );

  const selectedIntegrationRowIdSet = useMemo(
    () => new Set(selectedIntegrationRowIds),
    [selectedIntegrationRowIds],
  );

  const selectedIntegrationRows = useMemo(
    () =>
      integrationRows.filter((row) =>
        selectedIntegrationRowIdSet.has(row.integrationRowId),
      ),
    [integrationRows, selectedIntegrationRowIdSet],
  );

  const selectedIntegrationQuantity = useMemo(
    () =>
      selectedIntegrationRows.reduce(
        (sum, row) =>
          sum + (Number(row.unsentQty ?? row.total) || 0),
        0,
      ),
    [selectedIntegrationRows],
  );

  const allIntegrationRowsSelected =
    integrationRows.length > 0 &&
    selectedIntegrationRows.length === integrationRows.length;

  const toggleAllIntegrationRows = () => {
    setSelectedIntegrationRowIds(
      allIntegrationRowsSelected
        ? []
        : integrationRows.map((row) => row.integrationRowId),
    );
  };

  const toggleIntegrationRow = (rowId) => {
    setSelectedIntegrationRowIds((previous) =>
      previous.includes(rowId)
        ? previous.filter((id) => id !== rowId)
        : [...previous, rowId],
    );
  };

  const activeCollapsedCategories = collapsedCategoriesByTab[activeTab] || [];
  const activeExpandedMaterials = expandedMaterialsByTab[activeTab] || [];
  const activeCollapsedCategorySet = useMemo(
    () => new Set(activeCollapsedCategories),
    [activeCollapsedCategories],
  );

  const groupedCurrentData = useMemo(() => {
    const groups = new Map();

    currentData.forEach((row) => {
      const categoryLabel = getCategoryLabel(row);

      if (!groups.has(categoryLabel)) {
        groups.set(categoryLabel, []);
      }

      groups.get(categoryLabel).push(row);
    });

    return Array.from(groups, ([categoryName, rows]) => {
      const categoryDescription =
        categoryDescriptionsByCode[categoryName] ||
        categoryDescriptionsByCode[categoryName.toUpperCase()] ||
        categoryName;

      return {
        categoryName,
        categoryDescription,
        rows: rows.sort((a, b) => {
          if (activeTabConfig.detailed) {
            const storeCompare = String(a.store || "").localeCompare(
              String(b.store || ""),
            );
            if (storeCompare !== 0) return storeCompare;
          }

          return String(a.itemDesc || a.itemCode || "").localeCompare(
            String(b.itemDesc || b.itemCode || ""),
          );
        }),
      };
    }).sort((a, b) =>
      a.categoryDescription.localeCompare(b.categoryDescription),
    );
  }, [activeTabConfig.detailed, currentData, categoryDescriptionsByCode]);

  const totalQueryQty = useMemo(
    () => currentData.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
    [currentData],
  );

  const getCategoryTotal = (rows = []) =>
    rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);

  const toggleMaterialExpansion = (itemCode) => {
    setExpandedMaterialsByTab((prev) => {
      const current = prev[activeTab] || [];
      return {
        ...prev,
        [activeTab]: current.includes(itemCode)
          ? current.filter((value) => value !== itemCode)
          : [...current, itemCode],
      };
    });
  };

  const setCollapsedForActiveTab = (updater) => {
    setCollapsedCategoriesByTab((prev) => ({
      ...prev,
      [activeTab]:
        typeof updater === "function"
          ? updater(prev[activeTab] || [])
          : updater,
    }));
  };

  const toggleCategoryCollapse = (categoryName) => {
    setCollapsedForActiveTab((prev) =>
      prev.includes(categoryName)
        ? prev.filter((value) => value !== categoryName)
        : [...prev, categoryName],
    );
  };

  const visibleCollapsedCategoryCount = useMemo(() => {
    return groupedCurrentData.filter((group) =>
      activeCollapsedCategorySet.has(group.categoryName),
    ).length;
  }, [activeCollapsedCategorySet, groupedCurrentData]);

  const handleToggleAllCategories = () => {
    if (groupedCurrentData.length === 0) return;

    const visibleCategories = groupedCurrentData.map(
      (group) => group.categoryName,
    );

    setCollapsedForActiveTab((prev) => {
      const allVisibleCollapsed = visibleCategories.every((categoryName) =>
        prev.includes(categoryName),
      );

      if (allVisibleCollapsed) {
        return prev.filter(
          (categoryName) => !visibleCategories.includes(categoryName),
        );
      }

      return Array.from(new Set([...prev, ...visibleCategories]));
    });
  };

  useEffect(() => {
    setCollapsedCategoriesByTab((prev) => {
      const next = { ...prev };

      tabs.forEach((tab) => {
        const validCategories = new Set(
          (tabData[tab.key] || []).map((row) => getCategoryLabel(row)),
        );
        next[tab.key] = (next[tab.key] || []).filter((categoryName) =>
          validCategories.has(categoryName),
        );
      });

      return next;
    });
  }, [tabData]);

  useEffect(() => {
    if (storeFilter === "All") return;

    const sourceRows =
      viewType === "forecast"
        ? tabData.forecastDetailed
        : tabData.confirmedDetailed;
    const selectedStoreStillExists = sourceRows.some(
      (row) => getStoreKey(row) === storeFilter,
    );

    if (!selectedStoreStillExists) {
      setStoreFilter("All");
    }
  }, [
    tabData.forecastDetailed,
    tabData.confirmedDetailed,
    storeFilter,
    viewType,
  ]);

  const showsBranchColumn =
    activeTabConfig.detailed || activeTabConfig.materialSummary;
  const colSpan = dates.length + (showsBranchColumn ? 5 : 4);

  return (
    <div className="global-tran-main-div-ui !mt-0 min-w-0 overflow-x-hidden px-2 pb-20 pt-[136px] sm:pt-[112px] md:pt-[116px] lg:pt-[120px]">
      {isLoading && <LoadingSpinner />}

      {/* Floating Header */}
      <div className="fixed left-2 right-2 top-[54px] z-[20] flex max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-lg bg-gradient-to-r from-blue-200 to-blue-100 p-2 text-blue-900 shadow-xl dark:bg-blue-900 dark:text-white sm:left-4 sm:right-4 sm:top-[62px] sm:max-w-none sm:flex-row sm:items-center sm:justify-between md:left-6 md:right-6">
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="break-words px-1 text-base font-semibold leading-tight sm:px-3 sm:text-xl lg:text-2xl">
            Commissary
          </h1>
        </div>
      </div>

      {/* Query Parameters */}
      <div className="global-tran-header-div-ui !mt-0 !p-3 sm:!p-4">
        <div className="global-tran-header-tab-div-ui">
          <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
            Query Parameters
          </button>
        </div>

        <div
          className={`grid grid-cols-1 gap-1 sm:gap-2 ${
            activeTabConfig.detailed ? "md:grid-cols-5" : "md:grid-cols-4"
          }`}
        >
          <FloatingField
            id="startDate"
            label="Start Date"
            type="date"
            value={startDate}
            onChange={setStartDate}
            disabled={isLoading}
          />
          <FloatingField
            id="endDate"
            label="End Date"
            type="date"
            value={endDate}
            onChange={setEndDate}
            disabled={isLoading}
          />
          <FloatingField
            id="category"
            label="Filter by Category"
            type="select"
            value={category}
            onChange={setCategory}
            disabled={isLoading}
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option
                key={cat.categCode || "__BLANK__"}
                value={cat.categCode || ""}
              >
                {categoryDescriptionsByCode[cat.categCode] ||
                  categoryDescriptionsByCode[
                    String(cat.categCode || "").toUpperCase()
                  ] ||
                  (cat.categName !== cat.categCode ? cat.categName : "") ||
                  cat.categCode ||
                  "Uncategorized"}
              </option>
            ))}
          </FloatingField>

          <FloatingField
            id="viewType"
            label="View Type"
            type="select"
            value={viewType}
            onChange={setViewType}
            disabled={isLoading}
          >
            <option value="forecast">Forecast</option>
            <option value="confirmed">Confirmed</option>
          </FloatingField>

          {activeTabConfig.detailed && (
            <FloatingField
              id="storeFilter"
              label="Filter by Store"
              type="select"
              value={storeFilter}
              onChange={setStoreFilter}
              disabled={isLoading || storeOptions.length === 0}
            >
              <option value="All">All Stores</option>
              {storeOptions.map((store) => (
                <option key={store.storeCode} value={store.storeCode}>
                  {store.storeName}
                </option>
              ))}
            </FloatingField>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Main Tab Div */}
      <div className="global-tran-tab-div-ui !p-3 sm:!p-4 lg:!p-6 mt-4">
        <div className="global-tran-tab-nav-ui !items-stretch !gap-3 sm:!items-center">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`global-tran-tab-padding-ui flex items-center gap-2 ${
                    activeTab === tab.key
                      ? "global-tran-tab-text_active-ui"
                      : "rounded-lg bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <ActionButton
              icon={Search}
              onClick={loadCommissaryData}
              disabled={isLoading}
            >
              {isLoading ? "Querying..." : "Run Query"}
            </ActionButton>
            <ActionButton
              icon={ChevronDown}
              onClick={handleToggleAllCategories}
              disabled={isLoading || groupedCurrentData.length === 0}
            >
              {visibleCollapsedCategoryCount === groupedCurrentData.length &&
              groupedCurrentData.length > 0
                ? "Show Categories"
                : "Collapse Categories"}
            </ActionButton>
          </div>
        </div>

        {woSuccessMsg && (
          <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-100 p-3 text-sm font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
            ✓ {woSuccessMsg}
          </div>
        )}

        {/* Data Table */}
        <div className="global-tran-table-main-div-ui mt-3 block max-w-full overflow-x-auto sm:mt-4">
          <div className="global-tran-table-main-sub-div-ui relative isolate !max-h-[56vh] sm:!max-h-[500px]">
            <table className="w-max min-w-full table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_th]:border-b [&_th]:border-r [&_th]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui sticky top-0 z-[220]">
                <tr>
                  {showsBranchColumn && (
                    <th className="global-tran-th-ui sticky top-0 z-[210] w-[180px] min-w-[180px] bg-blue-100 text-left dark:bg-blue-900">
                      {activeTabConfig.materialSummary ? "Branch" : "Store"}
                    </th>
                  )}
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[120px] min-w-[120px] bg-blue-100 text-left dark:bg-blue-900">
                    Item Code
                  </th>
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[260px] min-w-[260px] bg-blue-100 text-left dark:bg-blue-900">
                    Description
                  </th>
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[90px] min-w-[90px] bg-blue-100 text-left dark:bg-blue-900">
                    UOM
                  </th>

                  {dates.map((date) => (
                    <th
                      key={date}
                      className="global-tran-th-ui sticky top-0 z-[210] w-[96px] min-w-[96px] max-w-[96px] bg-blue-100 text-right dark:bg-blue-900"
                    >
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-300">
                        {dayLabel(date)}
                      </div>
                      <div>{shortDate(date)}</div>
                    </th>
                  ))}

                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[100px] min-w-[100px] max-w-[100px] bg-blue-100 text-right font-bold text-blue-900 dark:bg-blue-900 dark:text-white">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={colSpan}
                      className="global-tran-td-ui py-10 text-center text-sm text-slate-500"
                    >
                      Loading {activeTabConfig.label.toLowerCase()}...
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colSpan}
                      className="global-tran-td-ui py-10 text-center text-sm text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageOpen className="h-8 w-8 text-slate-400" />
                        <span>{activeTabConfig.emptyText}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  groupedCurrentData.map((group) => {
                    const isCollapsed = activeCollapsedCategorySet.has(
                      group.categoryName,
                    );
                    const categoryTotal = getCategoryTotal(group.rows);

                    return (
                      <React.Fragment
                        key={`${activeTab}-${group.categoryName}`}
                      >
                        <tr className="bg-blue-50 dark:bg-blue-950/40">
                          <td
                            colSpan={colSpan}
                            className="global-tran-td-ui !p-0"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleCategoryCollapse(group.categoryName)
                              }
                              aria-expanded={!isCollapsed}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold uppercase text-blue-900 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-900/60"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <ChevronDown
                                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                                    isCollapsed ? "-rotate-90" : "rotate-0"
                                  }`}
                                />
                                <span className="truncate">
                                  Category: {group.categoryDescription}
                                </span>
                              </span>
                              <span className="shrink-0 text-right text-[11px] font-semibold normal-case text-slate-600 dark:text-slate-300">
                                {group.rows.length} item
                                {group.rows.length === 1 ? "" : "s"} • Total{" "}
                                {categoryTotal.toLocaleString()}
                              </span>
                            </button>
                          </td>
                        </tr>

                        {!isCollapsed && activeTabConfig.materialSummary ? (
                          <MaterialSummaryRows
                            materials={group.rows}
                            dates={dates}
                            expandedMaterials={activeExpandedMaterials}
                            onToggleMaterial={toggleMaterialExpansion}
                          />
                        ) : (
                          !isCollapsed &&
                          group.rows.map((row, idx) => (
                            <tr
                              key={`${group.categoryName}-${row.storeCode || "all"}-${row.itemCode}-${idx}`}
                              className="global-tran-tr-ui bg-white hover:bg-slate-50 dark:bg-black dark:hover:bg-gray-900/50"
                            >
                              {activeTabConfig.detailed && (
                                <td className="global-tran-td-ui w-[180px] min-w-[180px] text-left font-semibold text-slate-800 dark:text-slate-200">
                                  {row.store}
                                </td>
                              )}
                              <td className="global-tran-td-ui w-[120px] min-w-[120px] text-left font-mono text-sm text-slate-600 dark:text-slate-400">
                                {row.itemCode}
                              </td>
                              <td className="global-tran-td-ui w-[260px] min-w-[260px] text-left">
                                <span className="block truncate font-medium">
                                  {row.itemDesc}
                                </span>
                              </td>
                              <td className="global-tran-td-ui w-[90px] min-w-[90px] text-left font-semibold text-slate-600 dark:text-slate-300">
                                {row.uomCode || "-"}
                              </td>

                              {dates.map((date) => (
                                <td
                                  key={date}
                                  className="global-tran-td-ui w-[96px] min-w-[96px] max-w-[96px] text-right font-medium"
                                >
                                  {row.dates[date]
                                    ? row.dates[date].toLocaleString()
                                    : "-"}
                                </td>
                              ))}

                              <td className="global-tran-td-ui w-[100px] min-w-[100px] max-w-[100px] bg-slate-50 text-right text-xs font-bold text-blue-700 dark:bg-gray-900 dark:text-blue-300">
                                {row.total.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary with Integrated Work Order Action Button */}
        {!isLoading && currentData.length > 0 && (
          <div className="global-tran-tab-footer-main-div-ui !mt-4 !justify-end !gap-3 flex flex-wrap items-center">
            {activeTab === "confirmedSummary" && (
              <button
                type="button"
                onClick={handleGenerateWorkOrders}
                disabled={isGeneratingWO || isLoading || currentData.length === 0}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white shadow transition-all sm:text-sm ${
                  isGeneratingWO || currentData.length === 0 || isLoading
                    ? "cursor-not-allowed bg-gray-400 dark:bg-gray-700"
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                }`}
              >
                <Boxes className="h-4 w-4 shrink-0" />
                {isGeneratingWO ? "Integrating Work Orders..." : "Integrate to Work Order"}
              </button>
            )}

            {activeTab === "confirmedDetailed" && (
              <button
                type="button"
                onClick={() => {
                  setSelectedIntegrationRowIds(
                    integrationRows.map((row) => row.integrationRowId),
                  );
                  setShowSODRModal(true);
                }}
                disabled={isLoading || currentData.length === 0}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white shadow transition-all sm:text-sm ${
                  isLoading || currentData.length === 0
                    ? "cursor-not-allowed bg-gray-400 dark:bg-gray-700"
                    : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                }`}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                Integrate to SO/DR
              </button>
            )}

            <div className="global-tran-tab-footer-total-main-div-ui w-full rounded-lg bg-blue-50/60 px-3 py-2 sm:w-auto dark:bg-gray-900/40">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  {activeTabConfig.label} Total Quantity:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
                  {totalQueryQty.toLocaleString()}
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSODRModal && !showCustomerLookup && !showSalesRepLookup && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowSODRModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="so-dr-modal-title"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-4 text-white dark:border-slate-700 sm:px-6">
              <div>
                <h2 id="so-dr-modal-title" className="text-lg font-bold sm:text-xl">
                  Integrate Confirmed Orders to SO/DR
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSODRModal(false)}
                className="rounded-lg p-2 text-white/90 transition hover:bg-white/15 hover:text-white"
                aria-label="Close SO/DR integration modal"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4 sm:p-4">
              <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-950">
                <div className="text-[10px] font-bold uppercase text-slate-400">Start Date</div>
                <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{startDate}</div>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-950">
                <div className="text-[10px] font-bold uppercase text-slate-400">End Date</div>
                <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{endDate}</div>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-950">
                <div className="text-[10px] font-bold uppercase text-slate-400">Selected Records</div>
                <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {selectedIntegrationRows.length.toLocaleString()} / {integrationRows.length.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-950">
                <div className="text-[10px] font-bold uppercase text-slate-400">Selected Quantity</div>
                <div className="mt-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">{selectedIntegrationQuantity.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid gap-3 border-b border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-2 sm:p-4 lg:grid-cols-4 lg:grid-rows-2 lg:items-stretch">
              <div className="relative sm:col-span-2 lg:col-span-2 lg:col-start-1 lg:row-start-1">
                <label htmlFor="soDrCustomer" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Customer <span className="text-red-500">*</span>
                </label>
                <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-indigo-900/40">
                  <input
                    id="soDrCustomer"
                    type="text"
                    value={
                      soDrForm.customerCode
                        ? `${soDrForm.customerCode}${soDrForm.customerName ? ` - ${soDrForm.customerName}` : ""}`
                        : ""
                    }
                    readOnly
                    placeholder="Select customer"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerLookup(true)}
                    disabled={isLoadingCustomer}
                    className="flex w-11 shrink-0 items-center justify-center border-l border-slate-300 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-600 hover:text-white disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-indigo-950 dark:text-indigo-300"
                    aria-label="Select customer"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="lg:col-start-1 lg:row-start-2">
                <label htmlFor="soDrPoNumber" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  PO Number
                </label>
                <input
                  id="soDrPoNumber"
                  type="text"
                  value={soDrForm.poNumber}
                  onChange={(event) =>
                    setSoDrForm((previous) => ({
                      ...previous,
                      poNumber: event.target.value,
                    }))
                  }
                  placeholder="Enter customer PO number"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-900/40"
                />
              </div>

              <div className="lg:col-start-2 lg:row-start-2">
                <label htmlFor="soDrSalesRep" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Sales Rep
                </label>
                <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-indigo-900/40">
                  <input
                    id="soDrSalesRep"
                    type="text"
                    value={
                      isLoadingCustomer
                        ? "Loading customer setup..."
                        : soDrForm.salesRepCode
                          ? `${soDrForm.salesRepCode}${soDrForm.salesRepName ? ` - ${soDrForm.salesRepName}` : ""}`
                          : ""
                    }
                    readOnly
                    placeholder="Select sales representative"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSalesRepLookup(true)}
                    disabled={isLoadingCustomer}
                    className="flex w-11 shrink-0 items-center justify-center border-l border-slate-300 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-600 hover:text-white disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-indigo-950 dark:text-indigo-300"
                    aria-label="Select sales representative"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:col-span-2 lg:col-span-2 lg:col-start-3 lg:row-span-2 lg:row-start-1">
                <label htmlFor="soDrRemarks" className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Remarks
                </label>
                <textarea
                  id="soDrRemarks"
                  rows={5}
                  value={soDrForm.remarks}
                  onChange={(event) =>
                    setSoDrForm((previous) => ({
                      ...previous,
                      remarks: event.target.value,
                    }))
                  }
                  placeholder="Enter remarks"
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-900/40 lg:min-h-0 lg:flex-1 lg:resize-none"
                />
              </div>
            </div>

            <div className="relative isolate min-h-0 flex-1 overflow-auto overscroll-contain px-3 pb-3 pt-0 sm:px-4 sm:pb-4 sm:pt-0">
              <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[16%]" />
                  <col className="w-[19%]" />
                  <col />
                  <col className="w-[11%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-center shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={allIntegrationRowsSelected}
                        onChange={toggleAllIntegrationRows}
                        aria-label="Select all items for SO/DR integration"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-left shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">Branch</th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-left shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">Item Code</th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-left shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">Description</th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-left shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">UOM</th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-right shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {integrationRows.map((row) => {
                    const isSelected = selectedIntegrationRowIdSet.has(
                      row.integrationRowId,
                    );

                    return (
                    <tr
                      key={row.integrationRowId}
                      className={
                        isSelected
                          ? "bg-indigo-50/60 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/70"
                      }
                    >
                      <td className="border-b border-slate-100 px-3 py-2 text-center dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleIntegrationRow(row.integrationRowId)
                          }
                          aria-label={`Select ${row.itemCode || "item"} for SO/DR integration`}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="truncate border-b border-slate-100 px-3 py-2 font-medium dark:border-slate-800" title={getStoreLabel(row)}>{getStoreLabel(row)}</td>
                      <td className="truncate border-b border-slate-100 px-3 py-2 font-mono dark:border-slate-800" title={row.itemCode || "-"}>{row.itemCode || "-"}</td>
                      <td className="truncate border-b border-slate-100 px-3 py-2 dark:border-slate-800" title={row.itemDesc || "-"}>{row.itemDesc || "-"}</td>
                      <td className="truncate border-b border-slate-100 px-3 py-2 dark:border-slate-800" title={row.uomCode || "-"}>{row.uomCode || "-"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold dark:border-slate-800">{Number(row.unsentQty ?? row.total ?? 0).toLocaleString()}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {selectedIntegrationRows.length.toLocaleString()} item(s) selected
              </span>
              <button
                type="button"
                onClick={handleSendConfirmedToSODR}
                disabled={
                  isSendingToSODR ||
                  selectedIntegrationRows.length === 0
                }
                className={`rounded-lg px-5 py-2 text-sm font-bold text-white shadow transition ${
                  isSendingToSODR ||
                  selectedIntegrationRows.length === 0
                    ? "cursor-not-allowed bg-gray-400 dark:bg-gray-700"
                    : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                }`}
              >
                {isSendingToSODR ? "Sending..." : "Send"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {showCustomerLookup && (
        <CustomerMastLookupModal
          isOpen={showCustomerLookup}
          customParam="ActiveAll"
          onClose={handleSelectIntegrationCustomer}
        />
      )}

      {showSalesRepLookup && (
        <SearchSalesRepRef
          isOpen={showSalesRepLookup}
          onClose={handleSelectIntegrationSalesRep}
        />
      )}
    </div>
  );
}
