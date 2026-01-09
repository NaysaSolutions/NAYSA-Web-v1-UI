// src/NAYSA Cloud/Reference File/VATRef.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import Swal from "sweetalert2";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
  faPlus,
  faFileExport,
  faSave,
  faUndo,
  faInfoCircle,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalWarningAlert,
} from "@/NAYSA Cloud/Global/behavior";

// Global UI helpers
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

// ✅ COA Lookup Modal (SearchCOAMast.jsx)
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";

const VATRef = () => {
  const docType = "VATRef";
  const documentTitle = reftables[docType] || "VAT Reference";
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const { user } = useAuth();

  // ───── Form state ─────
  const [vatCode, setVatCode] = useState("");
  const [description, setDescription] = useState(""); // maps to vatName in sproc
  const [vatType, setVatType] = useState(""); // "I" / "O"
  const [vatClass, setVatClass] = useState(""); // "G" / "S"
  const [vatRate, setVatRate] = useState(""); // string with 2 decimals
  const [acctCode, setAcctCode] = useState("");
  const [acctName, setAcctName] = useState("");
  const [oldCode, setOldCode] = useState("");
  const [vatCategory, setVatCategory] = useState(""); // "V", "E", "Z" etc.
  const [registeredBy, setRegisteredBy] = useState("");
  const [registeredDate, setRegisteredDate] = useState("");
  const [lastUpdatedBy, setLastUpdatedBy] = useState("");
  const [lastUpdatedDate, setLastUpdatedDate] = useState("");

  // ✅ Lookup Modal
  const [acctModalOpen, setAcctModalOpen] = useState(false);

  // ✅ COA Map (fallback so acctName shows in table even if /vat doesn't return acctName)
  const [coaNameMap, setCoaNameMap] = useState({});
  const coaLoadedRef = useRef(false);

  // Table state
  const [vatList, setVatList] = useState([]);
  const [selectedVAT, setSelectedVAT] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Table helpers
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("vatCode");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Per-column filters
  const [columnFilters, setColumnFilters] = useState({
    vatCode: "",
    description: "",
    vatType: "",
    vatClass: "",
    vatRate: "",
    acctCode: "",
    acctName: "",
    oldCode: "",
    vatCategory: "",
  });

  // Help dropdown
  const [isOpenGuide, setOpenGuide] = useState(false);
  const guideRef = useRef(null);

  // VAT options
  const vatTypeOptions = [
    { value: "I", label: "Input" },
    { value: "O", label: "Output" },
  ];
  const vatClassOptions = [
    { value: "G", label: "Goods" },
    { value: "S", label: "Services" },
  ];
  const vatCategoryOptions = [
    { value: "V", label: "VATABLE" },
    { value: "E", label: "EXEMPT" },
    { value: "Z", label: "ZERO-RATED" },
  ];

  const includesCI = (str, searchValue) =>
    String(str || "")
      .toLowerCase()
      .includes(String(searchValue || "").toLowerCase());

  // ───── Duplicate helper ─────
  const isDuplicateVatCode = (code, currentCode = null) => {
    const normalized = String(code || "").trim().toUpperCase();
    const currentNormalized = currentCode
      ? String(currentCode || "").trim().toUpperCase()
      : null;

    if (!normalized) return false;

    return vatList.some((item) => {
      const existingCode = String(item.vatCode || "").trim().toUpperCase();
      if (currentNormalized && existingCode === currentNormalized) return false;
      return existingCode === normalized;
    });
  };

  useEffect(() => {
    if (!isEditing) return;
    const normalized = (vatCode || "").trim().toUpperCase();
    if (!normalized) return;

    const originalCode = selectedVAT?.vatCode || null;

    if (isDuplicateVatCode(normalized, originalCode)) {
      (async () => {
        await useSwalErrorAlert(
          "Duplicate Code",
          "Duplicate VAT Code is not allowed."
        );
        setVatCode("");
      })();
    }
  }, [vatCode, isEditing, selectedVAT, vatList]);

  // ✅ COA MAP LOADER (fallback for acctName)
  const fetchCOANameMap = async () => {
    try {
      // Use the same endpoint SearchCOAMast uses
      // It expects: { PARAMS: JSON.stringify({ search, page, pageSize }) }
      const { data } = await apiClient.post("/lookupCOA", {
        PARAMS: JSON.stringify({ search: "", page: 1, pageSize: 5000 }),
      });

      const rows =
        Array.isArray(data?.data) && data.data[0]?.result
          ? JSON.parse(data.data[0].result || "[]")
          : [];

      const map = {};
      (rows || []).forEach((r) => {
        const code = String(r.acctCode || r.ACCT_CODE || "").trim();
        const name = r.acctName || r.ACCT_NAME || "";
        if (code) map[code] = name;
      });

      setCoaNameMap(map);
    } catch (e) {
      setCoaNameMap({});
    } finally {
      coaLoadedRef.current = true;
    }
  };

  // load COA map once
  useEffect(() => {
    fetchCOANameMap();
  }, []);

  // ✅ MODAL HANDLERS (COA LOOKUP)
  const handleOpenAcctModal = () => {
    if (isEditing) setAcctModalOpen(true);
  };

  // COAMastLookupModal calls: onClose(accountData, source)
  const handleCloseAcctModal = (selectedAcct = null /*, source */) => {
    setAcctModalOpen(false);

    if (selectedAcct) {
      setAcctCode(selectedAcct.acctCode || "");
      setAcctName(selectedAcct.acctName || "");
    }
  };

  // ───── FETCH VAT LIST ─────
  const fetchVATList = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/vat");
      let raw = [];

      if (data?.data && Array.isArray(data.data) && data.data[0]?.result) {
        raw = JSON.parse(data.data[0].result || "[]");
      } else if (Array.isArray(data.data)) {
        raw = data.data;
      }

      const normalized = (raw || []).map((r) => {
        const code = r.acctCode ?? r.ACCT_CODE ?? "";
        const nameFromVat =
          r.acctName ?? r.ACCT_NAME ?? r.acct_name ?? r.accountName ?? "";

        return {
          vatCode: r.vatCode ?? r.VAT_CODE ?? "",
          vatName: r.vatName ?? r.VAT_NAME ?? "",
          vatType: r.vatType ?? r.VAT_TYPE ?? "",
          vatClass: r.vatClass ?? r.VAT_CLASS ?? "",
          vatRate: r.vatRate ?? r.VAT_RATE ?? 0,
          vatCategory: r.vatCategory ?? r.VAT_CATEGORY ?? "",
          acctCode: code,
          // ✅ fallback to coaNameMap if backend didn't provide acctName
          acctName: nameFromVat || coaNameMap[code] || "",
          oldCode: r.oldCode ?? r.OLD_CODE ?? "",
          registeredBy: r.registeredBy ?? r.REGISTERED_BY ?? "",
          registeredDate: r.registeredDate ?? r.REGISTERED_DATE ?? "",
          lastUpdatedBy: r.lastUpdatedBy ?? r.LAST_UPDATED_BY ?? "",
          lastUpdatedDate: r.lastUpdatedDate ?? r.LAST_UPDATED_DATE ?? "",
        };
      });

      setVatList(normalized);
    } catch (error) {
      setVatList([]);
      await useSwalErrorAlert("Error", "Failed to load VAT records.");
    } finally {
      setLoading(false);
    }
  };

  // load VAT list (also re-run after COA map loads so acctName can be filled)
  useEffect(() => {
    fetchVATList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(coaNameMap).length]);

  // ───── FILTER & SORT ─────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = q
      ? vatList.filter((v) =>
          [
            v.vatCode,
            v.vatName,
            v.vatType,
            v.vatClass,
            v.vatRate,
            v.acctCode,
            v.acctName,
            v.oldCode,
            v.vatCategory,
          ].some((x) => String(x || "").toLowerCase().includes(q))
        )
      : vatList;

    const f = columnFilters;

    const withColFilters = base.filter((v) => {
      if (f.vatCode && !includesCI(v.vatCode, f.vatCode)) return false;
      if (f.description && !includesCI(v.vatName, f.description)) return false;
      if (f.vatType && !includesCI(v.vatType, f.vatType)) return false;
      if (f.vatClass && !includesCI(v.vatClass, f.vatClass)) return false;
      if (f.vatRate && !includesCI(v.vatRate, f.vatRate)) return false;
      if (f.acctCode && !includesCI(v.acctCode, f.acctCode)) return false;
      if (f.acctName && !includesCI(v.acctName, f.acctName)) return false;
      if (f.oldCode && !includesCI(v.oldCode, f.oldCode)) return false;
      if (f.vatCategory && !includesCI(v.vatCategory, f.vatCategory))
        return false;
      return true;
    });

    const factor = sortDir === "asc" ? 1 : -1;

    return [...withColFilters].sort((a, b) => {
      let A = "";
      let B = "";

      if (sortBy === "description") {
        A = String(a.vatName ?? "");
        B = String(b.vatName ?? "");
      } else {
        A = String(a?.[sortBy] ?? "");
        B = String(b?.[sortBy] ?? "");
      }

      return A.localeCompare(B) * factor;
    });
  }, [vatList, query, columnFilters, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ───── RESET FORM / FILTERS ─────
  const resetForm = () => {
    setVatCode("");
    setDescription("");
    setVatType("");
    setVatClass("");
    setVatRate("");
    setAcctCode("");
    setAcctName("");
    setOldCode("");
    setVatCategory("");
    setRegisteredBy("");
    setRegisteredDate("");
    setLastUpdatedBy("");
    setLastUpdatedDate("");
    setSelectedVAT(null);
    setIsEditing(false);
    setIsAdding(false);
  };

  const resetFilters = () => {
    setQuery("");
    setColumnFilters({
      vatCode: "",
      description: "",
      vatType: "",
      vatClass: "",
      vatRate: "",
      acctCode: "",
      acctName: "",
      oldCode: "",
      vatCategory: "",
    });
    setPage(1);
  };

  // ───── SAVE VAT ─────
  const handleSaveVAT = async () => {
    const normalizedCode = vatCode.trim().toUpperCase();
    const trimmedDescription = description.trim();
    const normalizedRate = Number(vatRate || 0).toFixed(2);

    if (
      !normalizedCode ||
      !trimmedDescription ||
      !vatType ||
      !vatClass ||
      vatRate === "" ||
      !acctCode ||
      !vatCategory
    ) {
      await useSwalErrorAlert(
        "Error!",
        "Please fill out all required fields (VAT Code, Description, Type, Class, Rate, Account Code, VAT Category)."
      );
      return;
    }

    const originalCode = selectedVAT?.vatCode || null;
    if (isDuplicateVatCode(normalizedCode, originalCode)) {
      await useSwalErrorAlert(
        "Duplicate Code",
        "Duplicate VAT Code is not allowed."
      );
      return;
    }

    setSaving(true);
    try {
      const userCode = user?.USER_CODE || user?.username || "SYSTEM";

      const wrapper = {
        json_data: {
          vatCode: normalizedCode,
          vatName: trimmedDescription,
          vatType,
          vatClass,
          vatRate: normalizedRate,
          vatCategory,
          acctCode,
          userCode,
        },
      };

      const payload = {
        json_data: JSON.stringify(wrapper),
      };

      const response = await apiClient.post("/upsertVat", payload);

      if (response.data?.status === "success" || response.data?.success) {
        await fetchVATList();
        await useSwalSuccessAlert("Success!", "VAT record saved.");
        resetForm();
      } else {
        await useSwalErrorAlert(
          "Error!",
          response.data?.message || "Failed to save VAT record."
        );
      }
    } catch (e) {
      await useSwalErrorAlert(
        "Error!",
        e?.response?.data?.message || e.message || "Error saving VAT record."
      );
    } finally {
      setSaving(false);
    }
  };

  // ───── EDIT VAT ─────
  const handleEditVAT = (vat) => {
    if (!vat) return;

    setVatCode(vat.vatCode || "");
    setDescription(vat.vatName || "");
    setVatType(vat.vatType || "");
    setVatClass(vat.vatClass || "");
    setVatRate(
      vat.vatRate !== null && vat.vatRate !== undefined
        ? Number(vat.vatRate).toFixed(2)
        : ""
    );
    setAcctCode(vat.acctCode || "");
    setAcctName(vat.acctName || coaNameMap[vat.acctCode] || "");
    setOldCode(vat.oldCode || "");
    setVatCategory(vat.vatCategory || "");

    setRegisteredBy(vat.registeredBy || "");
    setRegisteredDate(vat.registeredDate || "");
    setLastUpdatedBy(vat.lastUpdatedBy || "");
    setLastUpdatedDate(vat.lastUpdatedDate || "");

    setSelectedVAT(vat);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleDeleteVAT = async () => {
    if (!selectedVAT) {
      await useSwalWarningAlert(
        "No Record Selected",
        "Please select a VAT record to delete."
      );
      return;
    }

    try {
      const result = await Swal.fire({
        title: `Delete VAT Code ${selectedVAT.vatCode}?`,
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      });

      if (!result.isConfirmed) return;

      const userCode = user?.USER_CODE || user?.username || "SYSTEM";

      const payload = {
        vatCode: selectedVAT.vatCode,
        userCode,
      };

      const response = await apiClient.post("/deleteVat", payload);

      if (response.data?.success || response.data?.status === "success") {
        await useSwalSuccessAlert(
          "Deleted",
          `VAT Code ${selectedVAT.vatCode} has been deleted.`
        );
        await fetchVATList();
        resetForm();
      } else {
        await useSwalErrorAlert(
          "Error!",
          response.data?.message || "Failed to delete VAT record."
        );
      }
    } catch (e) {
      await useSwalErrorAlert(
        "Error!",
        e?.response?.data?.message || e.message || "Error deleting VAT record."
      );
    }
  };

  // ───── NEW VAT ─────
  const startNew = () => {
    resetForm();
    setIsEditing(true);
    setIsAdding(true);
  };

  // ───── EXPORT PLACEHOLDER ─────
  const handleExport = async () => {
    await useSwalWarningAlert(
      "Export",
      "Export functionality for VATRef will be added later."
    );
  };

  // ───── HELP MENU / CLICK-AWAY ─────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };

  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // ───── CTRL+S SAVE ─────
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveVAT();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    saving,
    isEditing,
    vatCode,
    description,
    vatType,
    vatClass,
    vatRate,
    acctCode,
    vatCategory,
  ]);

  const resetLabel = isEditing || selectedVAT ? "Reset" : "Reset Filters";

  // ───── RENDER ─────
  return (
    <div className="global-ref-main-div-ui mt-24">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-[70] bg-black/20 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl">
            Loading…
          </div>
        </div>
      )}

      {/* ✅ Account lookup modal */}
      <COAMastLookupModal
        isOpen={acctModalOpen}
        onClose={handleCloseAcctModal}
        source="vatref_acct"
        customParam="" // set to filter key if needed
      />

      {/* Header */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-end text-xs">
          <ButtonBar
            buttons={[
              {
                key: "add",
                label: "Add",
                icon: faPlus,
                onClick: startNew,
                disabled: isEditing,
              },
              {
                key: "delete",
                label: "Delete",
                icon: faTrashAlt,
                onClick: handleDeleteVAT,
                disabled: !selectedVAT,
              },
              {
                key: "save",
                label: saving ? "Saving..." : "Save",
                icon: faSave,
                onClick: handleSaveVAT,
                disabled: !isEditing || saving,
                className:
                  "bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 " +
                  (!isEditing || saving
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-blue-700"),
              },
              {
                key: "reset",
                label: resetLabel,
                icon: faUndo,
                onClick: () => {
                  if (isEditing || selectedVAT) resetForm();
                  else resetFilters();
                },
                disabled: false,
              },
            ]}
          />

          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <FontAwesomeIcon icon={faFileExport} /> Export
          </button>

          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((v) => !v)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} /> Info{" "}
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>
            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={handlePDFGuide}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  PDF User Guide
                </button>
                <button
                  onClick={handleVideoGuide}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="global-tran-tab-div-ui">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="space-y-2">
            <FieldRenderer
              label="VAT Code"
              required={true}
              type="text"
              value={vatCode}
              disabled={!isAdding}
              onChange={(val) => setVatCode((val || "").toUpperCase())}
              onBlur={async () => {
                const normalized = (vatCode || "").trim().toUpperCase();
                if (!normalized) return;

                const originalCode = selectedVAT?.vatCode || null;

                if (isDuplicateVatCode(normalized, originalCode)) {
                  await useSwalErrorAlert(
                    "Duplicate Code",
                    "Duplicate VAT Code is not allowed."
                  );
                  setVatCode("");
                  return;
                }

                setVatCode(normalized);
              }}
            />

            <FieldRenderer
              label="Description"
              required={true}
              type="text"
              value={description}
              disabled={!isEditing}
              onChange={(val) => setDescription(val)}
            />
            <FieldRenderer
              label="VAT Type"
              required={true}
              type="select"
              value={vatType}
              disabled={!isEditing}
              onChange={(val) => setVatType(val)}
              options={vatTypeOptions}
            />
            <FieldRenderer
              label="VAT Class"
              required={true}
              type="select"
              value={vatClass}
              disabled={!isEditing}
              onChange={(val) => setVatClass(val)}
              options={vatClassOptions}
            />
            <FieldRenderer
              label="VAT Rate"
              required={true}
              type="number"
              value={vatRate}
              disabled={!isEditing}
              onChange={(val) => setVatRate(val)}
              onBlur={() =>
                setVatRate(Number(vatRate === "" ? 0 : vatRate).toFixed(2))
              }
            />
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            {/* ✅ Account Code lookup */}
            <div className="flex items-center gap-3">
              <label className="w-32 text-xs text-gray-600">
                <span className="global-ref-asterisk-ui">*</span> Account Code
              </label>

              <div
                className={`flex-1 flex items-center global-ref-textbox-ui ${
                  isEditing
                    ? "global-ref-textbox-enabled cursor-pointer"
                    : "global-ref-textbox-disabled"
                }`}
                onClick={handleOpenAcctModal}
                title={isEditing ? "Click to lookup Account Code" : ""}
              >
                <input
                  type="text"
                  value={acctCode}
                  readOnly
                  className="flex-1 bg-transparent border-none focus:outline-none cursor-pointer text-xs"
                />
                <FontAwesomeIcon
                  icon={faEdit}
                  className={isEditing ? "ml-2 text-blue-600" : "ml-2 text-gray-400"}
                />
              </div>
            </div>

            <FieldRenderer
              label="Account Name"
              type="text"
              value={acctName}
              disabled={true}
              onChange={() => {}}
            />

            <FieldRenderer
              label="Old Code"
              type="text"
              value={oldCode}
              disabled={!isEditing}
              onChange={(val) => setOldCode(val)}
            />

            <FieldRenderer
              label="VAT Category"
              required={true}
              type="select"
              value={vatCategory}
              disabled={!isEditing}
              onChange={(val) => setVatCategory(val)}
              options={vatCategoryOptions}
            />
          </div>

          {/* Column 3 */}
          <div className="space-y-2">
            <FieldRenderer
              label="Registered By"
              type="text"
              value={registeredBy}
              disabled={true}
              onChange={() => {}}
            />
            <FieldRenderer
              label="Registered Date"
              type="text"
              value={registeredDate}
              disabled={true}
              onChange={() => {}}
            />
            <FieldRenderer
              label="Last Updated By"
              type="text"
              value={lastUpdatedBy}
              disabled={true}
              onChange={() => {}}
            />
            <FieldRenderer
              label="Last Updated Date"
              type="text"
              value={lastUpdatedDate}
              disabled={true}
              onChange={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="global-ref-tab-div-ui mt-6">
        <div className="global-ref-table-main-div-ui">
          <div className="global-ref-table-main-sub-div-ui">
            <div className="global-ref-table-div-ui">
              <table className="global-ref-table-div-ui">
                <thead className="global-ref-thead-div-ui">
                  {/* Sortable header row */}
                  <tr>
                    {[
                      ["vatCode", "VAT Code"],
                      ["description", "Description"],
                      ["vatType", "Type"],
                      ["vatClass", "Class"],
                      ["vatRate", "Rate"],
                      ["acctCode", "Acct Code"],
                      ["acctName", "Acct Name"],
                      ["oldCode", "Old Code"],
                      ["vatCategory", "VAT Category"],
                      ["_edit", "Edit"],
                      ["_delete", "Delete"],
                    ].map(([key, label]) => (
                      <th
                        key={key}
                        className={`global-ref-th-ui ${
                          key.startsWith("_") ? "" : "cursor-pointer select-none"
                        }`}
                        onClick={() => {
                          if (key.startsWith("_")) return;
                          setSortBy(key);
                          setSortDir((prev) =>
                            sortBy === key && prev === "asc" ? "desc" : "asc"
                          );
                        }}
                        title={!key.startsWith("_") ? "Click to sort" : undefined}
                      >
                        {label}{" "}
                        {sortBy === key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                    ))}
                  </tr>

                  {/* Filter row */}
                  <tr>
                    <th className="global-ref-th-ui">
                      <input
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        placeholder="Filter…"
                        value={columnFilters.vatCode}
                        onChange={(e) => {
                          setColumnFilters((s) => ({
                            ...s,
                            vatCode: e.target.value,
                          }));
                          setPage(1);
                        }}
                      />
                    </th>

                    <th className="global-ref-th-ui">
                      <input
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        placeholder="Filter…"
                        value={columnFilters.description}
                        onChange={(e) => {
                          setColumnFilters((s) => ({
                            ...s,
                            description: e.target.value,
                          }));
                          setPage(1);
                        }}
                      />
                    </th>

                    <th className="global-ref-th-ui">
                      <input
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        placeholder="Filter…"
                        value={columnFilters.vatType}
                        onChange={(e) => {
                          setColumnFilters((s) => ({
                            ...s,
                            vatType: e.target.value,
                          }));
                          setPage(1);
                        }}
                      />
                    </th>

                    <th className="global-ref-th-ui">
                      <input
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        placeholder="Filter…"
                        value={columnFilters.vatClass}
                        onChange={(e) => {
                          setColumnFilters((s) => ({
                            ...s,
                            vatClass: e.target.value,
                          }));
                          setPage(1);
                        }}
                      />
                    </th>

                    <th className="global-ref-th-ui">
                      <input
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        placeholder="Filter…"
                        value={columnFilters.vatRate}
                        onChange={(e) => {
                          setColumnFilters((s) => ({
                            ...s,
                            vatRate: e.target.value,
                          }));
                          setPage(1);
                        }}
                      />
                    </th>

                    <th className="global-ref-th-ui">
                      <input
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        placeholder="Filter…"
                        value={columnFilters.acctCode}
                        onChange={(e) => {
                          setColumnFilters((s) => ({
                            ...s,
                            acctCode: e.target.value,
                          }));
                          setPage(1);
                        }}
                      />
                    </th>

                    <th className="global-ref-th-ui">
                      <input
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        placeholder="Filter…"
                        value={columnFilters.acctName}
                        onChange={(e) => {
                          setColumnFilters((s) => ({
                            ...s,
                            acctName: e.target.value,
                          }));
                          setPage(1);
                        }}
                      />
                    </th>

                    <th className="global-ref-th-ui">
                      <input
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        placeholder="Filter…"
                        value={columnFilters.oldCode}
                        onChange={(e) => {
                          setColumnFilters((s) => ({
                            ...s,
                            oldCode: e.target.value,
                          }));
                          setPage(1);
                        }}
                      />
                    </th>

                    <th className="global-ref-th-ui">
                      <select
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        value={columnFilters.vatCategory}
                        onChange={(e) => {
                          setColumnFilters((s) => ({
                            ...s,
                            vatCategory: e.target.value,
                          }));
                          setPage(1);
                        }}
                      >
                        <option value="">All</option>
                        {vatCategoryOptions.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </th>

                    <th className="global-ref-th-ui"></th>
                    <th className="global-ref-th-ui"></th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="global-ref-norecords-ui">
                        Loading…
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="global-ref-norecords-ui">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((vat, idx) => (
                      <tr
                        key={`${vat.vatCode}-${idx}`}
                        className={`global-tran-tr-ui ${
                          selectedVAT?.vatCode === vat.vatCode ? "bg-blue-50" : ""
                        }`}
                        onClick={() => handleEditVAT(vat)}
                      >
                        <td className="global-ref-td-ui">{vat.vatCode || "-"}</td>
                        <td className="global-ref-td-ui">{vat.vatName || "-"}</td>
                        <td className="global-ref-td-ui">{vat.vatType || "-"}</td>
                        <td className="global-ref-td-ui">{vat.vatClass || "-"}</td>
                        <td className="global-ref-td-ui">
                          {vat.vatRate !== null && vat.vatRate !== undefined
                            ? Number(vat.vatRate).toFixed(2)
                            : "-"}
                        </td>
                        <td className="global-ref-td-ui">{vat.acctCode || "-"}</td>
                        <td className="global-ref-td-ui">
                          {vat.acctName || coaNameMap[vat.acctCode] || "-"}
                        </td>
                        <td className="global-ref-td-ui">{vat.oldCode || "-"}</td>
                        <td className="global-ref-td-ui">{vat.vatCategory || "-"}</td>

                        <td className="global-ref-td-ui text-center sticky right-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditVAT(vat);
                            }}
                            className="global-ref-td-button-edit-ui"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                        </td>

                        <td className="global-ref-td-ui text-center sticky right-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVAT(vat);
                              handleDeleteVAT();
                            }}
                            className="global-ref-td-button-delete-ui"
                            title={`Delete ${vat.vatCode}`}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between p-3">
                <div className="text-xs opacity-80 font-semibold">
                  Total Records: {filtered.length}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="px-7 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-900"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}/page
                      </option>
                    ))}
                  </select>

                  <div className="text-xs opacity-80 font-semibold">
                    Page {page} of {totalPages}
                  </div>

                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-7 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-7 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VATRef;
