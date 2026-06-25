import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faTrashAlt,
  faEdit,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
  faSave as faSaveIcon,
  faUndo,
  faCopy,
  faBoxOpen,
  faWarehouse,
  faTableCellsLarge,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import SearchWorkCenterRef from "@/NAYSA Cloud/Lookup/SearchWorkCenterRef.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";
import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";

import {
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";
/* ─────────────────────────────────────────────────────────────
   EMPTY VALUES
───────────────────────────────────────────────────────────────*/
const todayInput = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
};

const emptyForm = {
  bomCode: "",
  bomDate: todayInput(),
  invType: "",
  itemCode: "",
  itemDescription: "",
  routingCode: "",
  workCenter: "",
  workCenterName: "",
  quantity: "1.000000",
  uom: "",
  active: "Y",
  remarks: "",

  registeredBy: "",
  registeredDate: "",
  updatedBy: "",
  updatedDate: "",

  __isNew: false,
};

const emptyLine = (lineNo = 1) => ({
  lineNo,
  invType: "",
  itemCode: "",
  itemDescription: "",
  brand: "",
  uom: "",
  qtyNeeded: "0.000000",
  scrapRate: "0.000000",
  scrapQty: "0.000000",
});

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────*/
const BOM_HEADER_REQUIRED_INV_TYPES = [
  { value: "FG", label: "FG" },
  { value: "RM", label: "RM" },
];

const BOM_DTL_REQUIRED_INV_TYPES = [
  { value: "FG", label: "FG" },
  { value: "MS", label: "MS" },
  { value: "RM", label: "RM" },
];

const ensureInvTypeOptions = (
  options = [],
  fallbackOptions = BOM_DTL_REQUIRED_INV_TYPES,
) => {
  const map = new Map();
  options
    .filter((option) => String(option?.value || "").trim() !== "")
    .forEach((option) => {
      const value = String(option.value || "")
        .trim()
        .toUpperCase();
      map.set(value, {
        ...option,
        value,
        label: value === "MS" ? "MS " : option.label || value,
      });
    });

  fallbackOptions.forEach((option) => {
    if (!map.has(option.value)) map.set(option.value, option);
  });

  return Array.from(map.values());
};

const buildInvTypeOptions = (
  rows = [],
  fallbackOptions = BOM_DTL_REQUIRED_INV_TYPES,
) => {
  const allowedValues = new Set(
    fallbackOptions.map((option) => String(option.value).toUpperCase()),
  );
  const hsOptions = rows
    .map((d) => {
      const value = String(d.DROPDOWN_CODE ?? d.dropdownCode ?? d.value ?? "")
        .trim()
        .toUpperCase();
      return {
        value,
        label: d.DROPDOWN_NAME ?? d.dropdownName ?? d.label ?? value,
      };
    })
    .filter((d) => d.value && allowedValues.has(d.value));

  return ensureInvTypeOptions(
    hsOptions.length ? hsOptions : fallbackOptions,
    fallbackOptions,
  );
};

const toNumber = (value) => {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fmt6 = (value) => Number(toNumber(value)).toFixed(6);

const clearZeroValueOnFocus = (event, onClear) => {
  const rawValue = String(event?.target?.value ?? "")
    .replace(/,/g, "")
    .trim();
  if (!rawValue || Number(rawValue) !== 0) return;

  event.target.value = "";
  onClear?.("");
};

const toInputDate = (value) => {
  if (!value) return todayInput();
  const s = String(value);

  // Check if it's already in MM/DD/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return todayInput();

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
};





const normalizeItemRow = (row = {}) => ({
  invType: row.invType || row.inventoryType || row.type || "",
  itemCode: row.itemCode || row.ITEM_CODE || row.item_code || "",
  itemDescription:
    row.itemName || row.itemDesc || row.itemDescription || row.ITEM_NAME || "",
  brand: row.brand || row.brandName || row.BRAND || "",
  uom: row.uomCode || row.uom || row.UOM_CODE || "",
});

const getItemLookupConfig = (invType) => {
  const normalizedInvType = String(invType || "")
    .trim()
    .toUpperCase();
  const lookupInvType = ["FG", "MS", "RM"].includes(normalizedInvType)
    ? normalizedInvType
    : "FG";
  return {
    invType: lookupInvType,
    endpoint: `getInvLookup${lookupInvType}`,
    docType: `PR${lookupInvType}`,
  };
};

const parseSprocJsonResult = (rows) => {
  if (!rows) return [];
  const r = rows?.[0]?.result;
  if (typeof r === "string") {
    try {
      return JSON.parse(r || "[]");
    } catch {
      return [];
    }
  }
  if (Array.isArray(rows) && rows.length && typeof rows[0] === "object")
    return rows;
  return [];
};

const isInactiveStatus = (active) =>
  String(active || "Y")
    .trim()
    .toUpperCase() === "N";

/* ─────────────────────────────────────────────────────────────
   LEFT PANEL / HISTORY 
───────────────────────────────────────────────────────────────*/
const BOMListPanel = ({
  rows,
  selectedCode,
  onSelect,
  onRefresh,
  isLoading,
}) => {
  const tableRows = useMemo(
    () => rows.map((row) => ({ ...row, key: row.bomCode })),
    [rows],
  );
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    setSelectedRow(
      tableRows.find((row) => String(row.bomCode) === String(selectedCode)) ||
        null,
    );
  }, [selectedCode, tableRows]);

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 90,
        sortable: false,
        filterable: false,
        requiredVisible: true,
        renderType: "actions",
        render: (row) => (
          <div className="flex justify-center w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
              title="Open"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Open</span>
            </button>
          </div>
        ),
      },
      { key: "bomCode", label: "BOM Code", sortable: true, width: 120 },
      { key: "itemCode", label: "Item Code", sortable: true, width: 150 },
      {
        key: "itemDescription",
        label: "Item Description",
        sortable: true,
        width: 280,
        maxWidth: 280,
      },
      {
        key: "bomDate",
        label: "BOM Date",
        sortable: true,
        width: 120,
        render: (row) => toInputDate(row.bomDate),
        displayValue: (row) => toInputDate(row.bomDate),
      },
      {
        key: "active",
        label: "Status",
        sortable: true,
        width: 100,
        displayValue: (row) =>
          !isInactiveStatus(row.active) ? "Active" : "Inactive",
        render: (row) => (
          <span
            className={`px-2 py-1 rounded-full text-[10px] font-bold ${!isInactiveStatus(row.active) ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
          >
            {!isInactiveStatus(row.active) ? "ACTIVE" : "INACTIVE"}
          </span>
        ),
      },
    ],
    [onSelect],
  );

  return (
    <div className="w-full bg-slate-50/60 p-4 h-full">
      <div className="global-tran-table-main-div-ui relative overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <SearchGlobalReferenceTable
          docType="Bill of Materials"
          columns={columns}
          data={tableRows}
          itemsPerPage={200}
          showFilters
          onRowDoubleClick={onSelect}
          selectedRow={selectedRow}
          onRowClick={setSelectedRow}
          isLoading={isLoading}
          onRefresh={onRefresh}
          onMobileRowOpen={onSelect}
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────*/
const ProdBOM = () => {
  const [topTab, setTopTab] = useState("details");
  const [activeTab, setActiveTab] = useState("basic");
  const [detailActiveTab, setDetailActiveTab] = useState("components");
  const [isOpenGuide, setOpenGuide] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isMasterLoading, setIsMasterLoading] = useState(false);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [isCheckingBOMCode, setIsCheckingBOMCode] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });
  const [selectedCode, setSelectedCode] = useState("");
  const [masterList, setMasterList] = useState([]);
  const [lines, setLines] = useState([emptyLine(1)]);
  const [isCurrentBOMUsed, setIsCurrentBOMUsed] = useState(false);

  const [bomHdFieldArray, setBomHdFieldArray] = useState([]);
  const [bomDt1FieldArray, setBomDt1FieldArray] = useState([]);
  const [lookupState, setLookupState] = useState({
    open: false,
    target: "header",
    lineIndex: -1,
    invType: "FG",
  });
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [wcLookupOpen, setWcLookupOpen] = useState(false);
  const itemLookupConfig = useMemo(
    () => getItemLookupConfig(lookupState.invType),
    [lookupState.invType],
  );

  const { user } = useAuth();
  const userCode = user?.USER_CODE || user?.userCode || user?.code || "";
  const guideRef = useRef(null);
  const addTypeDropdownRef = useRef(null);
  const bomCodeInputRef = useRef(null);

  const docType = "ProdBOM";
  const pdfLink = reftablesPDFGuide?.[docType] || "#";
  const videoLink = reftablesVideoGuide?.[docType] || "#";

  const { pagePermission, isReadOnly, isFullAccess, canAdd, canSave } =
    usePagePermission({
      componentKey: docType,
      menuName: "Bill of Materials  Master Data",
      debug: false,
    });

  const updateForm = (patch) => setForm((p) => ({ ...p, ...patch }));
  const hasRecord = String(form?.bomCode || "").trim() && !form.__isNew;
  const isPageBusy =
    isLoading || isMasterLoading || isRecordLoading || isCheckingBOMCode;

  // Click outside guide listener
  useEffect(() => {
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target))
        setOpenGuide(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Click outside component Add Item dropdown
  useEffect(() => {
    if (!showTypeDropdown) return;

    const handleClickOutside = (event) => {
      if (addTypeDropdownRef.current?.contains(event.target)) return;
      setShowTypeDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTypeDropdown]);

  const { data: dropdowns } = useQuery({
    queryKey: ["BOMDROPDOWN"],
    queryFn: async () => {
      const [headerInvTypes, detailInvTypes] = await Promise.all([
        useTopDocDropDown("BOMHD", "BOM_INV_TYPE"),
        useTopDocDropDown("BOMDTL", "BOM_DTL_TYPE"),
      ]);
      return { headerInvTypes, detailInvTypes };
    },
  });

  const headerInvTypeOptions = useMemo(
    () =>
      buildInvTypeOptions(
        dropdowns?.headerInvTypes || [],
        BOM_HEADER_REQUIRED_INV_TYPES,
      ),
    [dropdowns],
  );
  const detailInvTypeOptions = useMemo(
    () =>
      buildInvTypeOptions(
        dropdowns?.detailInvTypes || [],
        BOM_DTL_REQUIRED_INV_TYPES,
      ),
    [dropdowns],
  );

  useEffect(() => {
    loadMasterList();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [hdFields, dt1Fields] = await Promise.all([
        useFieldLenghtCheck("BOM_HD"),
        useFieldLenghtCheck("BOM_DT1"),
      ]);
      if (mounted) {
        setBomHdFieldArray(hdFields || []);
        setBomDt1FieldArray(dt1Fields || []);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col, table = "BOM_HD") =>
    useGetFieldLength(
      table === "BOM_DT1" ? bomDt1FieldArray : bomHdFieldArray,
      col,
    );

  const getCheckResult = (res) => {
    const row = res?.data?.data?.[0] || res?.data?.[0] || {};
    const value = row.result ?? row.RESULT ?? row.isUsed ?? row.isused ?? row.exists;
    return String(value ?? "0").trim() === "1" || value === true;
  };

  const checkDuplicateBOM = async (bomCode) => {
    const code = String(bomCode || "").trim();
    if (!code) return false;
    const res = await apiClient.post("/checkDuplicateProdBOM", {
      json_data: { bomCode: code },
    });
    return getCheckResult(res);
  };

  const checkInUsedBOM = async (bomCode) => {
    const code = String(bomCode || "").trim();
    if (!code) return false;
    const res = await apiClient.post("/checkInUsedProdBOM", {
      json_data: { bomCode: code },
    });
    return getCheckResult(res);
  };

  const loadMasterList = async () => {
    setIsMasterLoading(true);
    try {
      const res = await apiClient.get("/prodBOM");
      const list = parseSprocJsonResult(res?.data?.data).map((row) => ({
        ...row,
        bomDate: toInputDate(row.bomDate),
      }));
      setMasterList(list);
    } catch (e) {
      setMasterList([]);
    } finally {
      setIsMasterLoading(false);
    }
  };

  const fetchBOMByCode = async (bomCode) => {
    const code = String(bomCode || "").trim();
    if (!code) return;

    setIsRecordLoading(true);
    try {
      const res = await apiClient.post("/getProdBOM", { BOM_CODE: code });
      const parsed = parseSprocJsonResult(res?.data?.data);
      const row = Array.isArray(parsed) ? parsed?.[0] : null;

      if (!row) {
        await useSwalErrorAlert("Info", "BOM record not found.");
        return;
      }

      const detailRows = Array.isArray(row.dt1)
        ? row.dt1.map((d, idx) => ({
            ...emptyLine(idx + 1),
            ...d,
            lineNo: d.lineNo || idx + 1,
            qtyNeeded: fmt6(d.qtyNeeded),
            scrapRate: fmt6(d.scrapRate),
            scrapQty: fmt6(d.scrapQty),
          }))
        : [emptyLine(1)];

      const normalizedWorkCenter = row.workCenter || row.wcCode || "";
      const normalizedWorkCenterName =
        row.workCenterName || row.wcName || row.wc_name || "";

      setForm({
        ...emptyForm,
        ...row,
        workCenter: normalizedWorkCenter,
        wcCode: normalizedWorkCenter,
        workCenterName: normalizedWorkCenterName,
        wcName: normalizedWorkCenterName,
        bomDate: toInputDate(row.bomDate),
        quantity: fmt6(row.quantity || 1),
        __isNew: false,
      });
      setLines(detailRows.length ? detailRows : [emptyLine(1)]);
      setSelectedCode(code);
      try {
        setIsCurrentBOMUsed(await checkInUsedBOM(code));
      } catch {
        setIsCurrentBOMUsed(false);
      }
    } catch (e) {
      await useSwalErrorAlertAPI("Fetch Error", "Failed to fetch BOM record.");
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleSelectBOM = async (row) => {
    setTopTab("details");
    setSelectedCode(row.bomCode);
    await fetchBOMByCode(row.bomCode);
  };

  const handleReset = () => {
    setSelectedCode("");
    setIsCurrentBOMUsed(false);
    setForm({ ...emptyForm, bomDate: todayInput() });
    setLines([emptyLine(1)]);
  };

  const handleAdd = async () => {
    if (!canAdd) {
      await useSwalErrorAlert("Read Only", "Not allowed to add BOM records.");
      return;
    }
    setTopTab("details");
    setSelectedCode("");
    setIsCurrentBOMUsed(false);
    setForm({ ...emptyForm, bomDate: todayInput(), __isNew: true });
    setLines([emptyLine(1)]);
  };

  const handleCopy = async () => {
    if (!canAdd) {
      await useSwalErrorAlert("Read Only", "Not allowed to copy BOM records.");
      return;
    }
    if (!hasRecord) {
      await useSwalErrorAlert("Required", "Select a BOM record first.");
      return;
    }
    setTopTab("details");
    const copiedLines = (lines.length ? lines : [emptyLine(1)]).map(
      (row, idx) => ({
        ...emptyLine(idx + 1),
        ...row,
        lineNo: idx + 1,
        qtyNeeded: fmt6(row.qtyNeeded),
        scrapRate: fmt6(row.scrapRate),
        scrapQty: fmt6(row.scrapQty),
      }),
    );
    setSelectedCode("");
    setIsCurrentBOMUsed(false);
    setForm({
      ...emptyForm,
      ...form,
      bomId: "",
      bomCode: "",
      bomDate: todayInput(),
      active: "Y",
      __isNew: true,
    });
    setLines(copiedLines);
  };

  const upsertBOM = async () => {
    if (!canSave) {
      await useSwalErrorAlert("Read Only", "Not allowed to save BOM records.");
      return;
    }

    if (!String(form.bomCode || "").trim()) {
      await useSwalErrorAlert("Required", "BOM Code is required.");
      return;
    }
    if (!String(form.invType || "").trim()) {
      await useSwalErrorAlert("Required", "Please select an Inventory Type.");
      return;
    }
    if (!String(form.itemCode || "").trim()) {
      await useSwalErrorAlert("Required", "Please select an Item Code.");
      return;
    }
    if (toNumber(form.quantity) <= 0) {
      await useSwalErrorAlert(
        "Required",
        "Quantity must be greater than zero.",
      );
      return;
    }

    const batchQty = toNumber(form.quantity);
    if (batchQty <= 0) {
      await useSwalErrorAlert(
        "Required",
        "Batch Quantity must be greater than zero and cannot be negative.",
      );
      return;
    }

    const cleanBomCode = String(form.bomCode || "").trim();
    const originalBomCode = String(selectedCode || "").trim();
    const isNewRecord = !originalBomCode || form.__isNew;
    const isCodeChanged =
      !!originalBomCode &&
      cleanBomCode.toUpperCase() !== originalBomCode.toUpperCase();

    try {
      if (!isNewRecord && (isCurrentBOMUsed || (await checkInUsedBOM(originalBomCode)))) {
        await useSwalErrorAlert(
          "Record In Use",
          "Cannot save changes. This BOM Code is already used in Work Order.",
        );
        return;
      }

      if ((isNewRecord || isCodeChanged) && (await checkDuplicateBOM(cleanBomCode))) {
        await useSwalErrorAlert(
          "Duplicate BOM Code",
          "BOM Code already exists. Please use another BOM Code.",
        );
        return;
      }
    } catch (e) {
      await useSwalErrorAlertAPI(
        "Validation Error",
        "Unable to validate duplicate or in-used status. Please check the API route and stored procedure.",
      );
      return;
    }

    const detailRows = lines
      .filter((row) => String(row.invType || row.itemCode || "").trim() !== "")
      .map((row, idx) => ({
        lineNo: idx + 1,
        invType: row.invType,
        itemCode: row.itemCode,
        itemDescription: row.itemDescription,
        uom: row.uom,
        qtyNeeded: fmt6(row.qtyNeeded),
        scrapRate: fmt6(row.scrapRate),
        scrapQty: fmt6(row.scrapQty),
      }));

    if (detailRows.length === 0) {
      await useSwalErrorAlert("Required", "Add at least one component line.");
      return;
    }
    const invalidLine = detailRows.find(
      (row) => !row.invType || !row.itemCode || toNumber(row.qtyNeeded) <= 0,
    );
    if (invalidLine) {
      await useSwalErrorAlert(
        "Required",
        "Complete Type, Item Code, and Qty Needed in all component lines.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        json_data: {
          ...form,
          bomCode: cleanBomCode,
          quantity: fmt6(batchQty),
          action: selectedCode ? "edit" : "add",
          userCode,
          dt1: detailRows,
        },
      };
      const res = await apiClient.post("/upsertProdBOM", payload);
      const sqlRow = res?.data?.data?.[0];
      if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
        await useSwalErrorAlert(
          "Validation Failed",
          sqlRow?.errormsg || sqlRow?.errorMsg,
        );
        return;
      }
      const finalCode =
        sqlRow?.generatedCode || sqlRow?.generatedcode || form.bomCode;
      await useSwalSuccessAlert("Success!", "BOM saved successfully.");
      setSelectedCode(finalCode);
      await loadMasterList();
      await fetchBOMByCode(finalCode);
    } catch (e) {
      await useSwalErrorAlert("Save Failed", "Failed to save BOM.");
    } finally {
      setIsLoading(false);
    }
  };

  // Form Event Handlers
  const handleFieldChange = (name, value) => {
    if (name === "invType") {
      updateForm({
        invType: value,
        itemCode: "",
        itemDescription: "",
        uom: "",
      });
      return;
    }
    updateForm({ [name]: value });
  };

  const handleBOMCodeBlur = async () => {
    if (!isFullAccess) return;

    const cleanBomCode = String(form.bomCode || "").trim();
    const originalBomCode = String(selectedCode || "").trim();

    if (!cleanBomCode) return;

    // Do not treat the same selected BOM code as a duplicate while editing.
    if (
      originalBomCode &&
      cleanBomCode.toUpperCase() === originalBomCode.toUpperCase()
    ) {
      if (cleanBomCode !== form.bomCode) updateForm({ bomCode: cleanBomCode });
      return;
    }

    setIsCheckingBOMCode(true);
    try {
      const isDuplicate = await checkDuplicateBOM(cleanBomCode);

      if (isDuplicate) {
        updateForm({ bomCode: "" });
        await useSwalErrorAlert(
          "Duplicate BOM Code",
          "BOM Code already exists. Please enter another BOM Code.",
        );
        setTimeout(() => bomCodeInputRef.current?.focus?.(), 0);
        return;
      }

      if (cleanBomCode !== form.bomCode) updateForm({ bomCode: cleanBomCode });
    } catch (e) {
      await useSwalErrorAlertAPI(
        "Validation Error",
        "Unable to validate BOM Code. Please check the API route and stored procedure.",
      );
    } finally {
      setIsCheckingBOMCode(false);
    }
  };

  const updateLine = (idx, key, val) => {
    const next = [...lines];
    let row = { ...next[idx], [key]: val };
    if (key === "invType") {
      row = {
        ...row,
        itemCode: "",
        itemDescription: "",
        brand: "",
        uom: "",
      };
    }
    if (["qtyNeeded", "scrapRate", "scrapQty"].includes(key)) {
      const qty = key === "qtyNeeded" ? toNumber(val) : toNumber(row.qtyNeeded);
      const rate =
        key === "scrapRate" ? toNumber(val) : toNumber(row.scrapRate);
      const scrapQty =
        key === "scrapQty" ? toNumber(val) : toNumber(row.scrapQty);
      if (key === "scrapRate") row.scrapQty = fmt6(qty * (rate / 100));
      if (key === "scrapQty")
        row.scrapRate = qty > 0 ? fmt6((scrapQty / qty) * 100) : "0.000000";
      if (key === "qtyNeeded") {
        if (String(row.scrapRate ?? "") !== "")
          row.scrapQty = fmt6(qty * (toNumber(row.scrapRate) / 100));
        else if (String(row.scrapQty ?? "") !== "")
          row.scrapRate =
            qty > 0 ? fmt6((toNumber(row.scrapQty) / qty) * 100) : "0.000000";
      }
    }
    next[idx] = row;
    setLines(next);
  };

  const reNumberLines = (rows) =>
    rows.map((row, idx) => ({ ...row, lineNo: idx + 1 }));

  const addLineAfter = (idx = lines.length - 1) => {
    const safeIndex = Number.isFinite(idx)
      ? Math.max(-1, Math.min(idx, lines.length - 1))
      : lines.length - 1;

    const insertAt = safeIndex + 1;
    const next = [...lines];

    next.splice(insertAt, 0, emptyLine(insertAt + 1));
    setLines(reNumberLines(next));
  };
  const removeLine = (idx) => {
    const next = lines.filter((_, i) => i !== idx);
    setLines(next.length ? reNumberLines(next) : [emptyLine(1)]);
  };

  // Lookup Logic
  const openHeaderLookup = () =>
    setLookupState({
      open: true,
      target: "header",
      lineIndex: -1,
      invType: getItemLookupConfig(form.invType).invType,
    });
  const openLineLookup = (idx, invType) =>
    setLookupState({
      open: true,
      target: "line",
      lineIndex: idx,
      invType: getItemLookupConfig(invType).invType,
    });
  const openComponentAddLookup = (invType) => {
    if (!isFullAccess || isPageBusy) return;
    setShowTypeDropdown(false);
    setLookupState({
      open: true,
      target: "footer",
      lineIndex: -1,
      invType: getItemLookupConfig(invType).invType,
    });
  };
  const handleComponentAddClick = () => {
    if (!isFullAccess || isPageBusy) return;
    setShowTypeDropdown((prev) => !prev);
  };
  const closeLookup = () => setLookupState((p) => ({ ...p, open: false }));

  const appendComponentItems = (invType, selectedRows = []) => {
    const selectedItems = selectedRows
      .map((item) => normalizeItemRow(item))
      .filter((item) => String(item.itemCode || "").trim() !== "");

    if (!selectedItems.length) return;

    const existingRows = lines.filter(
      (row) => String(row.invType || row.itemCode || row.itemDescription || "").trim() !== "",
    );

    const rowsToAdd = selectedItems.map((item, idx) => ({
      ...emptyLine(existingRows.length + idx + 1),
      invType,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
      brand: item.brand || "",
      uom: item.uom,
    }));

    setLines(reNumberLines([...existingRows, ...rowsToAdd]));
  };

  const handleCloseItemLookup = (payload) => {
    const selectedRows = Array.isArray(payload?.records)
      ? payload.records
      : payload?.records
        ? [payload.records]
        : [];

    if (!selectedRows.length) {
      closeLookup();
      return;
    }

    const r = normalizeItemRow(selectedRows[0]);
    if (lookupState.target === "header") {
      updateForm({
        invType: form.invType || r.invType || lookupState.invType,
        itemCode: r.itemCode,
        itemDescription: r.itemDescription,
        uom: r.uom,
      });
    } else if (lookupState.target === "footer") {
      appendComponentItems(lookupState.invType, selectedRows);
    } else {
      const next = [...lines];
      next[lookupState.lineIndex] = {
        ...next[lookupState.lineIndex],
        invType: lookupState.invType,
        itemCode: r.itemCode,
        itemDescription: r.itemDescription,
        brand: r.brand || "",
        uom: r.uom,
      };
      setLines(next);
    }
    closeLookup();
  };

  /* ─────────────────────────────────────────────────────────────
       WAREMAST-STYLE COMPONENT TABLE
    ───────────────────────────────────────────────────────────────*/
  const bomDetailRows = useMemo(
    () =>
      lines.map((row, originalIndex) => ({
        ...row,
        originalIndex,
        key: `bom-detail-${originalIndex}`,
      })),
    [lines],
  );

  const bomDetailColumns = useMemo(() => {
    const numberInput = (row, field) => (
      <input
        type="text"
        className="w-full global-tran-td-inputclass-ui text-right"
        value={row[field] || ""}
        disabled={!isFullAccess}
        onFocus={(e) => {
          if (!["qtyNeeded", "scrapRate"].includes(field)) return;
          clearZeroValueOnFocus(e, (value) =>
            updateLine(row.originalIndex, field, value),
          );
        }}
        // 1. Sanitization: Allow only numbers and dots
        onChange={(e) => {
          let val = e.target.value;
          let sanitized = String(val).replace(/[^0-9.]/g, "");
          const parts = sanitized.split(".");
          if (parts.length > 2)
            sanitized = parts[0] + "." + parts.slice(1).join("");
          updateLine(row.originalIndex, field, sanitized);
        }}
        // 2. Formatting on Blur: Format to 6 decimal places
        onBlur={() => {
          const num = toNumber(row[field]);
          updateLine(row.originalIndex, field, fmt6(num));
        }}
        // 3. Formatting on Enter: Format to 6 decimal places
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const num = toNumber(row[field]);
            updateLine(row.originalIndex, field, fmt6(num));
            // Optional: Move focus to the next element if needed
          }
        }}
      />
    );

    const columns = [
      {
        key: "ln",
        label: "LN",
        width: 56,
        sortable: true,
        displayValue: (row) => row.originalIndex + 1,
        render: (row) => (
          <div className="text-center">{row.originalIndex + 1}</div>
        ),
      },
      {
        key: "invType",
        label: "Inv Type",
        width: 130,
        sortable: true,
        displayValue: (row) => row.invType || "",
        render: (row) => (
          <select
            value={row.invType || ""}
            disabled={!isFullAccess || Boolean(row.itemCode)}
            onChange={(e) =>
              updateLine(row.originalIndex, "invType", e.target.value)
            }
            className="w-full h-8 bg-transparent border-none outline-none text-xs"
          >
            <option value="" disabled>
              Select Type
            </option>
            {detailInvTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "itemCode",
        label: "Item Code",
        width: 150,
        sortable: true,
        displayValue: (row) => row.itemCode || "",
        render: (row) => (
          <div className="relative flex items-center">
            <input
              value={row.itemCode || ""}
              readOnly
              disabled={!isFullAccess}
              className="w-full global-tran-td-inputclass-ui pr-6"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className={`absolute right-2 text-lg ${isFullAccess && row.invType ? "text-blue-600 cursor-pointer hover:text-blue-900" : "text-slate-300 cursor-not-allowed"}`}
              onClick={() =>
                isFullAccess &&
                row.invType &&
                openLineLookup(row.originalIndex, row.invType)
              }
            />
          </div>
        ),
      },
      {
        key: "itemDescription",
        label: "Item Name",
        width: 260,
        maxWidth: 260,
        sortable: true,
        displayValue: (row) => row.itemDescription || "",
        render: (row) => {
          const val = row.itemDescription || "";
          // Estimate rows needed: Count explicit newlines and wrap long text (approx 40 chars per line for 260px width)
          const lineCount = Math.max(
            1,
            val
              .split(/\r\n|\r|\n/)
              .reduce((acc, line) => acc + Math.ceil(line.length / 40 || 1), 0),
          );
          return (
            <textarea
              value={val}
              disabled
              rows={lineCount}
              className="w-full min-h-[28px] resize-none bg-transparent py-1 text-xs leading-4 whitespace-pre-wrap break-words focus:outline-none focus:ring-0 cursor-not-allowed"
            />
          );
        },
      },
      {
        key: "brand",
        label: "Brand",
        width: 120,
        sortable: true,
        displayValue: (row) => row.brand || "",
        render: (row) => {
          const val = row.brand || "";
          // Wrap text for a narrower column (approx 15 chars per line for 120px width)
          const lineCount = Math.max(
            1,
            val
              .split(/\r\n|\r|\n/)
              .reduce((acc, line) => acc + Math.ceil(line.length / 15 || 1), 0),
          );
          return (
            <textarea
              value={val}
              disabled
              rows={lineCount}
              className="w-full min-h-[28px] resize-none bg-transparent py-1 text-xs leading-4 whitespace-pre-wrap break-words focus:outline-none focus:ring-0 cursor-not-allowed"
            />
          );
        },
      },
      {
        key: "uom",
        label: "UOM",
        width: 90,
        sortable: true,
        displayValue: (row) => row.uom || "",
        render: (row) => (
          <input
            value={row.uom || ""}
            disabled
            className="w-full global-tran-td-inputclass-ui text-center"
          />
        ),
      },
      {
        key: "qtyNeeded",
        label: "Qty Needed",
        width: 130,
        sortable: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => numberInput(row, "qtyNeeded"),
      },
      {
        key: "scrapRate",
        label: "Scrap Rate",
        width: 130,
        sortable: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => numberInput(row, "scrapRate"),
      },
      {
        key: "scrapQty",
        label: "Scrap Qty",
        width: 130,
        sortable: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => numberInput(row, "scrapQty"),
      },
    ];

    if (isFullAccess) {
      columns.unshift({
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 120,
        sortable: false,
        filterable: false,
        requiredVisible: true,
        renderType: "actions",
        render: (row) => (
          <div className="flex gap-2 justify-center w-full">
            <button
              type="button"
              disabled={isPageBusy}
              onClick={(e) => {
                e.stopPropagation();
                addLineAfter(row.originalIndex);
              }}
              className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 border rounded-md transition-colors text-xs ${isPageBusy ? "bg-blue-50 border-blue-100 text-blue-300 cursor-not-allowed" : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"}`}
              title="Add line"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span className="md:hidden">Add</span>
            </button>
            <button
              type="button"
              disabled={isPageBusy}
              onClick={(e) => {
                e.stopPropagation();
                removeLine(row.originalIndex);
              }}
              className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 border rounded-md transition-colors text-xs ${isPageBusy ? "bg-red-50 border-red-100 text-red-300 cursor-not-allowed" : "bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600"}`}
              title="Delete line"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      });
    }

    return columns;
  }, [
    addLineAfter,
    detailInvTypeOptions,
    isFullAccess,
    isPageBusy,
    removeLine,
    updateLine,
  ]);

  const buttons = useMemo(
    () => [
      {
        key: "add",
        label: <span className="sm:inline ml-1">Add</span>,
        icon: faPlus,
        onClick: handleAdd,
        className:
          "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
      },
      {
        key: "save",
        label: <span className="sm:inline ml-1">Save</span>,
        icon: faSaveIcon,
        onClick: upsertBOM,
        disabled: topTab !== "details" || !canSave || isPageBusy,
        className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${topTab !== "details" || !canSave || isPageBusy ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
      },
      {
        key: "copy",
        label: <span className="sm:inline ml-1">Copy</span>,
        icon: faCopy,
        onClick: handleCopy,
        disabled: !canAdd || !hasRecord || isPageBusy,
        className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${!canAdd || !hasRecord || isPageBusy ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
      },
      {
        key: "reset",
        label: <span className="sm:inline ml-1">Reset</span>,
        icon: faUndo,
        onClick: handleReset,
        className:
          "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
      },
    ],
    [
      canAdd,
      canSave,
      isPageBusy,
      hasRecord,
      topTab,
      handleAdd,
      upsertBOM,
      handleCopy,
      handleReset,
    ],
  );

  return (
    <div className="global-tran-main-div-ui">
      {isPageBusy && <LoadingSpinner />}

      {/* TABBED HEADER - MATCHING WAREMAST */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Title & Status */}
          <div className="w-full xl:w-auto flex items-center gap-4">
            <h1 className="global-ref-headertext-ui w-full xl:w-auto truncate text-center xl:text-left">
              Bill of Materials
            </h1>
            <PermissionBadge
              permission={pagePermission}
              isReadOnly={isReadOnly}
              isFullAccess={isFullAccess}
            />
          </div>

          {/* Navigation Tabs */}
          <div className="w-full xl:flex-1 flex justify-center">
            <div className="w-full md:w-auto">
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
                {[
                  { id: "details", label: "BOM Setup" },
                  { id: "history", label: "BOM Record" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setTopTab(tab.id);
                      if (tab.id === "details") handleReset();
                    }}
                    className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2 rounded-md ${
                      topTab === tab.id
                        ? "border-blue-700 text-blue-700 bg-blue-50/50"
                        : "border-transparent text-gray-500 hover:text-blue-500"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons & Guide */}
          <div className="w-full xl:w-auto flex xl:justify-end mt-2 xl:mt-0">
            <div className="w-full md:w-auto flex items-center justify-center xl:justify-end gap-2 flex-wrap">
              <div className="flex flex-wrap justify-center xl:justify-end gap-2">
                <ButtonBar buttons={buttons} />
              </div>

              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-16 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
                >
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="text-[12px]"
                  />
                  <span className="sm:inline ml-1 text-[11px] font-medium">
                    Info
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="hidden sm:inline text-[10px] opacity-80"
                  />
                </button>
                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                    <button
                      onClick={() => {
                        window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-500"
                      />{" "}
                      PDF Guide
                    </button>
                    <button
                      onClick={() => {
                        window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                    >
                      <FontAwesomeIcon
                        icon={faVideo}
                        className="mr-2 text-blue-500"
                      />{" "}
                      Video Guide
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-20 sm:mt-16"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        {/* Details Tab */}
        <div className={topTab === "details" ? "" : "hidden"}>
          {/* Form Layout with Tabs */}
          <div className="global-tran-header-div-ui !mt-0">
            <div className="global-tran-header-tab-div-ui">
              <button
                className={`global-tran-tab-padding-ui ${activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
                onClick={() => setActiveTab("basic")}
              >
                Basic Information
              </button>
            </div>

            {/* BOM Header Form Section - Main Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative">
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-start">
                {/* Row 1 */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${isFullAccess ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                  >
                    <input
                      ref={bomCodeInputRef}
                      id="bomCode"
                      type="text"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none uppercase"
                      value={form.bomCode}
                      disabled={!isFullAccess || isCheckingBOMCode}
                      maxLength={getMax("BOM_CODE")}
                      onChange={(e) =>
                        handleFieldChange("bomCode", e.target.value.toUpperCase())
                      }
                      onBlur={handleBOMCodeBlur}
                    />
                  </div>
                  <label
                    htmlFor="bomCode"
                    className={`global-ref-floating-label ${isFullAccess ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}
                  >
                    BOM Code <span className="text-red-500">*</span>
                  </label>
                  {isCheckingBOMCode && (
                    <div className="mt-1 text-[11px] text-blue-600">
                      Validating BOM Code...
                    </div>
                  )}
                </div>

                <FieldRenderer
                  id="invType"
                    label="Inventory Type"
                    type="select"
                    placeholder="Select Type"
                    required
                  value={form.invType}
                  disabled={!isFullAccess}
                  onChange={(val) => handleFieldChange("invType", val)}
                  options={headerInvTypeOptions}
                />

                <FieldRenderer
                  id="uom"
                  label="UOM"
                  type="text"
                  value={form.uom}
                  disabled
                  readOnly
                />

                {/* Row 2 */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${isFullAccess ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                  >
                    <DateFormatInput
                      id="bomDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={form.bomDate}
                      required
                      onChange={(val) => handleFieldChange("bomDate", val)}
                      disabled={!isFullAccess}
                      updateState={updateForm}
                    />
                  </div>
                  <label
                    htmlFor="bomDate"
                    className={`global-ref-floating-label ${isFullAccess ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}
                  >
                    Effective Date
                  </label>
                </div>

                <FieldRenderer
                  id="itemCode"
                  label="Item Code"
                  type="lookup"
                  required
                  value={form.itemCode}
                  disabled={!isFullAccess || !form.invType}
                  onLookup={openHeaderLookup}
                />

                <FieldRenderer
                  id="quantity"
                  label="Batch Quantity"
                  type="amount"
                  value={form.quantity}
                  disabled={!isFullAccess}
                  onFocus={(e) =>
                    clearZeroValueOnFocus(e, (value) => updateForm({ quantity: value }))
                  }
                  onChange={(val) => {
                    let sanitized = String(val).replace(/[^0-9.]/g, "");
                    const parts = sanitized.split(".");
                    if (parts.length > 2)
                      sanitized = parts[0] + "." + parts.slice(1).join("");
                    updateForm({ quantity: sanitized });
                  }}
                  onBlur={() => {
                    const num = toNumber(form.quantity);
                    updateForm({ quantity: fmt6(num) });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const num = toNumber(form.quantity);
                      updateForm({ quantity: fmt6(num) });
                      document.getElementById("workCenter")?.focus();
                    }
                  }}
                />

                {/* Row 3 */}
                <FieldRenderer
                  id="active"
                  label="Status"
                  type="select"
                  value={form.active}
                  disabled={!isFullAccess}
                  onChange={(val) => handleFieldChange("active", val)}
                  options={[
                    { value: "Y", label: "Active" },
                    { value: "N", label: "Inactive" },
                  ]}
                />

                <FieldRenderer
                  id="itemDescription"
                  label="Item Description"
                  type="text"
                  value={form.itemDescription}
                  disabled
                  readOnly
                />

                <FieldRenderer
                  id="workCenter"
                  label="Work Center"
                  type="lookup"
                  value={
                    form.workCenter
                      ? form.workCenterName || form.wcName
                        ? `${form.workCenter} - ${form.workCenterName || form.wcName}`
                        : form.workCenter
                      : ""
                  }
                  disabled={!isFullAccess}
                  onLookup={() => setWcLookupOpen(true)}
                  maxLength={getMax("WC_CODE")}
                />

                {/* Remarks Section */}
                <div className="col-span-full">
                  <div className="relative">
                    <textarea
                      id="remarks"
                      rows={3}
                      placeholder=""
                      className="peer global-tran-textbox-remarks-ui pt-2"
                      value={form.remarks}
                      disabled={!isFullAccess}
                      onChange={(e) => handleFieldChange("remarks", e.target.value)}
                      maxLength={getMax("REMARKS")}
                    />
                    <label
                      htmlFor="remarks"
                      className="global-tran-floating-label-remarks"
                    >
                      Remarks
                    </label>
                  </div>
                </div>
              </div>

              {/* Column 4 - Registration Info Area */}
              <div className="global-tran-textbox-group-div-ui">
                <RegistrationInfo
                  layout="stacked"
                  data={{
                    ...form,
                    lastUpdatedBy: form.lastUpdatedBy || form.updatedBy,
                    lastUpdatedDate: form.lastUpdatedDate || form.updatedDate,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Lines Section */}
          <div id="bom_dtl" className="global-tran-tab-div-ui">
            <div className="global-tran-tab-nav-ui">
              <div className="flex flex-row sm:flex-row">
                <button
                  className={`global-tran-tab-padding-ui ${detailActiveTab === "components" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
                  onClick={() => setDetailActiveTab("components")}
                >
                  Component Details
                </button>
              </div>
            </div>

            <div className="global-tran-table-main-div-ui relative overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType="BOM Component Details"
                columns={bomDetailColumns}
                data={bomDetailRows}
                itemsPerPage={200}
                showFilters
              />
            </div>

            <div className="global-tran-tab-footer-main-div-ui">
              <div className="global-tran-tab-footer-button-div-ui">
                <div ref={addTypeDropdownRef} className="relative inline-block">
                  {showTypeDropdown && isFullAccess && (
                    <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          Add Item
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                          onClick={() => openComponentAddLookup("FG")}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <FontAwesomeIcon icon={faBoxOpen} />
                            </span>
                            <div className="flex flex-col items-start">
                              <span>Finished Goods</span>
                              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                Add FG item
                              </span>
                            </div>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            FG
                          </span>
                        </button>

                        <button
                          type="button"
                          className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                          onClick={() => openComponentAddLookup("MS")}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <FontAwesomeIcon icon={faTableCellsLarge} />
                            </span>
                            <div className="flex flex-col items-start">
                              <span>Material Supplies</span>
                              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                Add MS item
                              </span>
                            </div>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            MS
                          </span>
                        </button>

                        <button
                          type="button"
                          className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                          onClick={() => openComponentAddLookup("RM")}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <FontAwesomeIcon icon={faWarehouse} />
                            </span>
                            <div className="flex flex-col items-start">
                              <span>Raw Material</span>
                              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                Add RM item
                              </span>
                            </div>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            RM
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleComponentAddClick}
                    disabled={!isFullAccess || isPageBusy}
                    className={`global-tran-tab-footer-button-add-ui ${!isFullAccess || isPageBusy ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={{ visibility: !isFullAccess ? "hidden" : "visible" }}
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Tab */}
        <div className={topTab === "history" ? "" : "hidden"}>
          <BOMListPanel
            rows={masterList}
            selectedCode={selectedCode}
            onSelect={handleSelectBOM}
            onRefresh={loadMasterList}
            isLoading={isMasterLoading}
          />
        </div>
      </div>

      {/* Modals */}
      {lookupState.open && (
        <ItemMastLookupModal
          isOpen={lookupState.open}
          endpoint={itemLookupConfig.endpoint}
          docType={itemLookupConfig.docType}
          enableMultiSelect={lookupState.target === "footer"}
          onClose={handleCloseItemLookup}
          onCancel={closeLookup}
        />
      )}

      {wcLookupOpen && (
        <SearchWorkCenterRef
          isOpen={wcLookupOpen}
          onClose={(selectedItem) => {
            if (selectedItem) {
              // Update both fields if you added workCenterName to your form state
              updateForm({
                workCenter: selectedItem.wcCode,
                wcCode: selectedItem.wcCode,
                workCenterName: selectedItem.wcName,
                wcName: selectedItem.wcName,
              });
            }
            setWcLookupOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ProdBOM;
