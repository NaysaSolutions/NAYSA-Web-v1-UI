import React, { useState, useEffect, useRef, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faTrashAlt,
  faSave,
  faUndo,
  faPrint,
  faChevronDown,
  faFileCsv,
  faFileExcel,
  faFilePdf,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalDeleteConfirm,
  useSwalDeleteSuccess,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

// ✅ GLOBAL REGISTRATION INFO
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";

/**
 * NOTE (Aligned to your sproc_PHP_COAMast):
 * - Uses: acctCode, acctName, classCode, acctType, acctGroup, acctBalance, reqSL, reqRC, fsConsoCode, fsConsoName, oldCode, active
 * - Registration fields are NOT returned by your current Load/Get modes, so RegistrationInfo will stay blank
 *   until you add registered_by/registered_date/updated_by/updated_date to the SELECT.
 */

const COAMast = () => {
  const { user } = useAuth();

  const docType = "COAMast";
  const documentTitle = reftables[docType];
  // kept for consistency (in case you show these elsewhere)
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  // --- helpers to keep UI values consistent with your sproc / DB ---
  const toUiBalance = (v) => {
    const x = String(v || "").toUpperCase();
    if (x === "DR") return "Debit";
    if (x === "CR") return "Credit";
    // if already human readable
    if (String(v) === "Debit" || String(v) === "Credit") return v;
    return v || "";
  };

  const toDbBalance = (v) => {
    const x = String(v || "").toUpperCase();
    if (x === "DEBIT" || x === "DR") return "DR";
    if (x === "CREDIT" || x === "CR") return "CR";
    return v || "";
  };

  // --- FORM DATA (aligned to sproc) ---
  const [formData, setFormData] = useState({
    acctCode: "",
    acctName: "",
    classCode: "", // Classification
    acctType: "",
    acctGroup: "",
    acctBalance: "", // UI: Debit/Credit | DB: DR/CR
    reqSL: "N",
    reqRC: "N",
    fsConsoCode: "", // sproc uses fsCode param but returns fsConsoCode
    fsConsoName: "", // optional (from join)
    oldCode: "",
    active: "Y",

    // ⚠️ not in your sproc Load/Get/Upsert (kept only if you plan to extend sproc)
    contraAccount: "",
    reqBudget: "N",
  });

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ always visible (right side column 3)
  const [registrationInfo, setRegistrationInfo] = useState({
    registeredBy: "",
    registeredDate: "",
    lastUpdatedBy: "",
    lastUpdatedDate: "",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  const [isOpenExport, setOpenExport] = useState(false);
  const exportRef = useRef(null);

  const [sortConfig, setSortConfig] = useState({ key: "acctCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [columnFilters, setColumnFilters] = useState({
    acctCode: "",
    acctName: "",
    acctType: "",
    acctGroup: "",
    acctBalance: "",
    reqSL: "",
    reqRC: "",
    classCode: "",
    fsConsoCode: "",
    oldCode: "",
    active: "",
  });

  const filterInputClass =
    "w-full px-3 py-1 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300";

  const LoadingSpinner = () => (
    <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-xl">
        {saving ? "Saving…" : "Loading…"}
      </div>
    </div>
  );

  const includesCI = (str, searchValue) =>
    String(str || "")
      .toLowerCase()
      .includes(String(searchValue || "").toLowerCase());

  // --- API parsing helpers (your API sometimes returns JSON string in data[0].result) ---
  const extractRowsFromResponse = (response) => {
    const payload = response?.data;
    if (!payload?.success) return [];

    // common pattern: data[0].result is JSON string
    if (Array.isArray(payload.data) && payload.data[0]?.result) {
      try {
        return JSON.parse(payload.data[0].result) || [];
      } catch {
        return [];
      }
    }

    // fallback: already array
    if (Array.isArray(payload.data)) return payload.data;

    return [];
  };

  const mapRowToUi = (a) => {
    // support both old keys (fsConsCode) and sproc keys (fsConsoCode)
    const fsConsoCode = a?.fsConsoCode ?? a?.fsConsCode ?? "";
    const fsConsoName = a?.fsConsoName ?? a?.fsConsDesc ?? "";

    return {
      acctCode: a?.acctCode ?? a?.acct_code ?? "",
      acctName: a?.acctName ?? a?.acct_name ?? "",
      classCode: a?.classCode ?? a?.acctClassification ?? a?.class_code ?? "",
      acctType: a?.acctType ?? a?.acct_type ?? "",
      acctGroup: a?.acctGroup ?? a?.acct_group ?? "",
      acctBalance: toUiBalance(a?.acctBalance ?? a?.acct_balance ?? ""),
      reqSL: a?.reqSL ?? a?.req_sl ?? "N",
      reqRC: a?.reqRC ?? a?.req_rc ?? "N",
      fsConsoCode,
      fsConsoName,
      oldCode: a?.oldCode ?? a?.old_code ?? "",
      active: a?.active ?? a?.isActive ?? a?.ACTIVE ?? "Y",

      // optional/future
      contraAccount: a?.contraAccount ?? "",
      reqBudget: a?.reqBudget ?? "N",

      // registration (only if your sproc returns it)
      registeredBy: a?.registeredBy ?? a?.REGISTERED_BY ?? "",
      registeredDate: a?.registeredDate ?? a?.REGISTERED_DATE ?? "",
      lastUpdatedBy: a?.lastUpdatedBy ?? a?.UPDATED_BY ?? "",
      lastUpdatedDate: a?.lastUpdatedDate ?? a?.UPDATED_DATE ?? "",
    };
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // ⚠️ keep your existing endpoint; backend should map this to sproc mode 'Load'
      const response = await apiClient.post("/lookupCOA", {
        PARAMS: JSON.stringify({ search: "", page: 1, pageSize: 1000 }),
      });

      const rows = extractRowsFromResponse(response);
      const mapped = rows.map((a) => mapRowToUi(a));
      setAccounts(mapped);
    } catch (err) {
      console.error(err);
      await useSwalErrorAlert("Error", `Failed to fetch accounts: ${err.message}`);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const getAccount = async (acctCode) => {
    setLoading(true);
    try {
      // ⚠️ keep your existing endpoint; backend should map this to sproc mode 'Get'
      const response = await apiClient.post("/lookupCOA", {
        PARAMS: JSON.stringify({ search: "Single", acctCode }),
      });

      const rows = extractRowsFromResponse(response);
      const row = rows?.[0] ? mapRowToUi(rows[0]) : null;

      if (!row) throw new Error("Account not found");

      // ✅ update registration info ALWAYS (column 3 stays visible)
      // NOTE: will only populate if your sproc returns these fields
      setRegistrationInfo({
        registeredBy: row.registeredBy || "",
        registeredDate: row.registeredDate
          ? new Date(row.registeredDate).toISOString().split("T")[0]
          : "",
        lastUpdatedBy: row.lastUpdatedBy || "",
        lastUpdatedDate: row.lastUpdatedDate
          ? new Date(row.lastUpdatedDate).toISOString().split("T")[0]
          : "",
      });

      // remove registration keys from form
      const { registeredBy, registeredDate, lastUpdatedBy, lastUpdatedDate, ...formOnly } = row;
      return formOnly;
    } catch (error) {
      console.error(error);
      await useSwalErrorAlert("Error", "Failed to get account details");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // close export on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) setOpenExport(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ctrl+s save
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveAccount();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, isEditing]); // eslint-disable-line

  // spinner delay
  useEffect(() => {
    let timer;
    if (loading) timer = setTimeout(() => setShowSpinner(true), 200);
    else setShowSpinner(false);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filtered = useMemo(() => {
    const f = columnFilters;

    const out = accounts.filter((a) => {
      if (f.acctCode && !includesCI(a.acctCode, f.acctCode)) return false;
      if (f.acctName && !includesCI(a.acctName, f.acctName)) return false;
      if (f.acctType && !includesCI(a.acctType, f.acctType)) return false;
      if (f.acctGroup && !includesCI(a.acctGroup, f.acctGroup)) return false;
      if (f.acctBalance && !includesCI(a.acctBalance, f.acctBalance)) return false;
      if (f.reqSL && !includesCI(a.reqSL === "Y" ? "Yes" : "No", f.reqSL)) return false;
      if (f.reqRC && !includesCI(a.reqRC === "Y" ? "Yes" : "No", f.reqRC)) return false;
      if (f.classCode && !includesCI(a.classCode, f.classCode)) return false;
      if (f.fsConsoCode && !includesCI(a.fsConsoCode, f.fsConsoCode)) return false;
      if (f.oldCode && !includesCI(a.oldCode, f.oldCode)) return false;
      if (f.active && !includesCI(a.active === "Y" ? "Yes" : "No", f.active)) return false;
      return true;
    });

    const { key, direction } = sortConfig;
    if (key) {
      out.sort((a, b) => {
        const av = String(a[key] || "").toLowerCase();
        const bv = String(b[key] || "").toLowerCase();
        if (av < bv) return direction === "asc" ? -1 : 1;
        if (av > bv) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return out;
  }, [accounts, columnFilters, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const resetForm = () => {
    setFormData({
      acctCode: "",
      acctName: "",
      classCode: "",
      acctType: "",
      acctGroup: "",
      acctBalance: "",
      reqSL: "N",
      reqRC: "N",
      fsConsoCode: "",
      fsConsoName: "",
      oldCode: "",
      active: "Y",
      contraAccount: "",
      reqBudget: "N",
    });
    setSelectedAccount(null);
    setIsEditing(false);

    // keep column 3 visible, just clear values
    setRegistrationInfo({
      registeredBy: "",
      registeredDate: "",
      lastUpdatedBy: "",
      lastUpdatedDate: "",
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const startNew = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleEditAccount = async (row) => {
    const full = await getAccount(row.acctCode);
    if (full) {
      setFormData(full);
      setSelectedAccount(full);
      setIsEditing(true);
    }
  };

  const handleSort = (key) => {
    setSortConfig((p) => ({
      key,
      direction: p.key === key && p.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleSaveAccount = async () => {
    setSaving(true);

    if (!formData.acctCode || !formData.acctName || !formData.acctBalance) {
      await useSwalErrorAlert(
        "Error",
        "Please fill in all required fields: Account Code, Account Name, and Balance Type."
      );
      setSaving(false);
      return;
    }

    try {
      // IMPORTANT: follow sproc json keys (fsCode, active, userCode)
      const payload = {
        acctCode: formData.acctCode,
        acctName: formData.acctName,
        classCode: formData.classCode,
        acctType: formData.acctType,
        acctGroup: formData.acctGroup,
        acctBalance: toDbBalance(formData.acctBalance),
        reqSL: formData.reqSL,
        reqRC: formData.reqRC,
        fsCode: formData.fsConsoCode, // sproc expects $.json_data.fsCode
        oldCode: formData.oldCode,
        active: formData.active,
        userCode: user?.USER_CODE || "ADMIN",

        // keep old keys too (safe if your API still expects these)
        fsConsoCode: formData.fsConsoCode,
      };

      // keep your endpoints as-is (backend must map to sproc Upsert)
      const apiEndpoint = selectedAccount ? "/updateCOA" : "/createCOA";
      const response = await apiClient.post(apiEndpoint, payload);

      if (response.data.success) {
        await useSwalshowSaveSuccessDialog(resetForm, () => {});
        await fetchAccounts();
      } else {
        await useSwalErrorAlert("Error", response.data.message || "Operation failed");
      }
    } catch (err) {
      console.error(err);
      await useSwalErrorAlert("Error", err.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount?.acctCode) {
      await useSwalErrorAlert("Error", "Please select an account to delete.");
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete this account?",
      `Code: ${selectedAccount.acctCode} | Name: ${selectedAccount.acctName || ""}`,
      "Yes, delete it"
    );

    if (!confirm.isConfirmed) return;

    try {
      const response = await apiClient.post("/deleteCOA", {
        acctCode: selectedAccount.acctCode,
        USERID: user?.USER_CODE || "ADMIN",
      });

      if (response.data.success) {
        await useSwalDeleteSuccess();
        await fetchAccounts();
        resetForm();
      } else {
        await useSwalErrorAlert("Error", response.data.message || "Failed to delete account.");
      }
    } catch (error) {
      console.error(error);
      await useSwalErrorAlert("Error", "Failed to delete account.");
    }
  };

  const handleExport = (format) => {
    setOpenExport(false);
    try {
      const payload = {
        entity: "exportCOA",
        format,
        filter: { columnFilters },
      };

      apiClient.get("/load", { params: payload, responseType: "blob" }).then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `coa_export_${format}_${new Date().toISOString().slice(0, 10)}.${format}`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    } catch (error) {
      console.error(error);
      useSwalErrorAlert("Export Error", `Failed to export to ${String(format).toUpperCase()}`);
    }
  };

  return (
    <div className="global-ref-main-div-ui mt-24">
      {(loading || saving) && showSpinner && <LoadingSpinner />}

      {/* HEADER */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-center text-xs">
          <button
            onClick={startNew}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faPlus} /> Add
          </button>

          <button
            onClick={handleSaveAccount}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${
              !isEditing || saving ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!isEditing || saving}
            title="Ctrl+S to Save"
          >
            <FontAwesomeIcon icon={faSave} /> Save
          </button>

          <button
            onClick={resetForm}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            disabled={saving}
          >
            <FontAwesomeIcon icon={faUndo} /> Reset
          </button>

          <div ref={exportRef} className="relative">
            <button
              onClick={() => setOpenExport((v) => !v)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faPrint} /> Export{" "}
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>

            {isOpenExport && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={() => handleExport("csv")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFileCsv} className="mr-2 text-green-600" /> CSV
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFileExcel} className="mr-2 text-green-600" /> Excel
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> PDF
                </button>
              </div>
            )}
          </div>

          {selectedAccount && (
            <button
              onClick={handleDeleteAccount}
              className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"
            >
              <FontAwesomeIcon icon={faTrashAlt} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* FORM (3 columns based on your requested structure) */}
      <div className="global-tran-tab-div-ui mt-5" style={{ minHeight: "calc(100vh - 170px)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="global-ref-textbox-group-div-ui space-y-4">
            {/* Account Code */}
            <div className="relative">
              <input
                type="text"
                id="acctCode"
                name="acctCode"
                placeholder=" "
                value={formData.acctCode}
                onChange={handleFormChange}
                disabled={isEditing && selectedAccount}
                className={`peer global-ref-textbox-ui ${
                  isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                } ${isEditing && selectedAccount ? "bg-blue-100 cursor-not-allowed" : ""}`}
                maxLength={20}
              />
              <label
                htmlFor="acctCode"
                className={`global-ref-floating-label ${
                  !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                }`}
              >
                <span className="global-ref-asterisk-ui">*</span> Account Code
              </label>
            </div>

            {/* Account Name */}
            <div className="relative">
              <input
                type="text"
                id="acctName"
                name="acctName"
                placeholder=" "
                value={formData.acctName}
                onChange={handleFormChange}
                disabled={!isEditing}
                className={`peer global-ref-textbox-ui ${
                  isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                }`}
                maxLength={100}
              />
              <label
                htmlFor="acctName"
                className={`global-ref-floating-label ${
                  !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                }`}
              >
                <span className="global-ref-asterisk-ui">*</span> Account Name
              </label>
            </div>

            {/* Account Type | Account Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="text"
                  id="acctType"
                  name="acctType"
                  placeholder=" "
                  value={formData.acctType}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                />
                <label
                  htmlFor="acctType"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  Account Type
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  id="acctGroup"
                  name="acctGroup"
                  placeholder=" "
                  value={formData.acctGroup}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                />
                <label
                  htmlFor="acctGroup"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  Account Group
                </label>
              </div>
            </div>

            {/* Balance Type | Active */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <select
                  id="acctBalance"
                  name="acctBalance"
                  value={formData.acctBalance}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                >
                  <option value="">Select Balance Type</option>
                  <option value="Debit">Debit</option>
                  <option value="Credit">Credit</option>
                </select>
                <label
                  htmlFor="acctBalance"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  <span className="global-ref-asterisk-ui">*</span> Balance Type
                </label>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="relative">
                <select
                  id="active"
                  name="active"
                  value={formData.active}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                >
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </select>
                <label
                  htmlFor="active"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  Active
                </label>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="global-ref-textbox-group-div-ui space-y-4">
            {/* SL Required | RC Required | Budget Required (budget kept as UI-only unless you add it to sproc) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <select
                  id="reqSL"
                  name="reqSL"
                  value={formData.reqSL}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                >
                  <option value="N">No</option>
                  <option value="Y">Yes</option>
                </select>
                <label
                  htmlFor="reqSL"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  SL Required
                </label>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="relative">
                <select
                  id="reqRC"
                  name="reqRC"
                  value={formData.reqRC}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                >
                  <option value="N">No</option>
                  <option value="Y">Yes</option>
                </select>
                <label
                  htmlFor="reqRC"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  RC Required
                </label>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="relative">
                <select
                  id="reqBudget"
                  name="reqBudget"
                  value={formData.reqBudget}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                >
                  <option value="N">No</option>
                  <option value="Y">Yes</option>
                </select>
                <label
                  htmlFor="reqBudget"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  Budget Required
                </label>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Classification (classCode) */}
            <div className="relative">
              <input
                type="text"
                id="classCode"
                name="classCode"
                placeholder=" "
                value={formData.classCode}
                onChange={handleFormChange}
                disabled={!isEditing}
                className={`peer global-ref-textbox-ui ${
                  isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                }`}
              />
              <label
                htmlFor="classCode"
                className={`global-ref-floating-label ${
                  !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                }`}
              >
                Classification
              </label>
            </div>

            {/* FS Code | Old Code | Contra Account */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <input
                  type="text"
                  id="fsConsoCode"
                  name="fsConsoCode"
                  placeholder=" "
                  value={formData.fsConsoCode}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                />
                <label
                  htmlFor="fsConsoCode"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  FS Code
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  id="oldCode"
                  name="oldCode"
                  placeholder=" "
                  value={formData.oldCode}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                />
                <label
                  htmlFor="oldCode"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  Old Code
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  id="contraAccount"
                  name="contraAccount"
                  placeholder=" "
                  value={formData.contraAccount}
                  onChange={handleFormChange}
                  disabled={!isEditing}
                  className={`peer global-ref-textbox-ui ${
                    isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  }`}
                />
                <label
                  htmlFor="contraAccount"
                  className={`global-ref-floating-label ${
                    !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
                >
                  Contra Account
                </label>
              </div>
            </div>

            {/* FS Description (fsConsoName) */}
            <div className="relative">
              <input
                type="text"
                id="fsConsoName"
                name="fsConsoName"
                placeholder=" "
                value={formData.fsConsoName}
                onChange={handleFormChange}
                disabled={!isEditing}
                className={`peer global-ref-textbox-ui ${
                  isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                }`}
              />
              <label
                htmlFor="fsConsoName"
                className={`global-ref-floating-label ${
                  !isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                }`}
              >
                FS Description
              </label>
            </div>
          </div>

          {/* Column 3 (registration info ALWAYS) */}
          <div className="global-ref-textbox-group-div-ui">
            <RegistrationInfo data={registrationInfo} disabled={true} />
          </div>
        </div>

        {/* TABLE (VendMast style) */}
        <div className="global-tran-table-main-div-ui mt-6">
          <div className="global-tran-table-main-sub-div-ui">
            <table className="global-tran-table-div-ui">
              <thead className="global-tran-thead-div-ui">
                <tr>
                  {Object.entries({
                    "Account Code": "acctCode",
                    "Account Name": "acctName",
                    "Account Type": "acctType",
                    "Account Group": "acctGroup",
                    "Balance Type": "acctBalance",
                    "SL Required": "reqSL",
                    "RC Required": "reqRC",
                    Classification: "classCode",
                    "FS Code": "fsConsoCode",
                    "Old Code": "oldCode",
                    Active: "active",
                  }).map(([label, key]) => (
                    <th
                      key={key}
                      className="global-tran-th-ui cursor-pointer select-none"
                      onClick={() => handleSort(key)}
                      title="Click to sort"
                    >
                      {label}{" "}
                      {sortConfig.key === key ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                    </th>
                  ))}
                  <th className="global-tran-th-ui">Edit</th>
                  <th className="global-tran-th-ui">Delete</th>
                </tr>

                {/* Filter Row */}
                <tr>
                  <th className="global-tran-th-ui">
                    <input
                      className={filterInputClass}
                      placeholder="Contains:"
                      value={columnFilters.acctCode}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, acctCode: e.target.value }));
                        setPage(1);
                      }}
                    />
                  </th>
                  <th className="global-tran-th-ui">
                    <input
                      className={filterInputClass}
                      placeholder="Contains:"
                      value={columnFilters.acctName}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, acctName: e.target.value }));
                        setPage(1);
                      }}
                    />
                  </th>
                  <th className="global-tran-th-ui">
                    <input
                      className={filterInputClass}
                      placeholder="Contains:"
                      value={columnFilters.acctType}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, acctType: e.target.value }));
                        setPage(1);
                      }}
                    />
                  </th>
                  <th className="global-tran-th-ui">
                    <input
                      className={filterInputClass}
                      placeholder="Contains:"
                      value={columnFilters.acctGroup}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, acctGroup: e.target.value }));
                        setPage(1);
                      }}
                    />
                  </th>
                  <th className="global-tran-th-ui">
                    <select
                      className={filterInputClass}
                      value={columnFilters.acctBalance}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, acctBalance: e.target.value }));
                        setPage(1);
                      }}
                    >
                      <option value="">All</option>
                      <option value="Debit">Debit</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </th>
                  <th className="global-tran-th-ui">
                    <select
                      className={filterInputClass}
                      value={columnFilters.reqSL}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, reqSL: e.target.value }));
                        setPage(1);
                      }}
                    >
                      <option value="">All</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </th>
                  <th className="global-tran-th-ui">
                    <select
                      className={filterInputClass}
                      value={columnFilters.reqRC}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, reqRC: e.target.value }));
                        setPage(1);
                      }}
                    >
                      <option value="">All</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </th>
                  <th className="global-tran-th-ui">
                    <input
                      className={filterInputClass}
                      placeholder="Contains:"
                      value={columnFilters.classCode}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, classCode: e.target.value }));
                        setPage(1);
                      }}
                    />
                  </th>
                  <th className="global-tran-th-ui">
                    <input
                      className={filterInputClass}
                      placeholder="Contains:"
                      value={columnFilters.fsConsoCode}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, fsConsoCode: e.target.value }));
                        setPage(1);
                      }}
                    />
                  </th>
                  <th className="global-tran-th-ui">
                    <input
                      className={filterInputClass}
                      placeholder="Contains:"
                      value={columnFilters.oldCode}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, oldCode: e.target.value }));
                        setPage(1);
                      }}
                    />
                  </th>
                  <th className="global-tran-th-ui">
                    <select
                      className={filterInputClass}
                      value={columnFilters.active}
                      onChange={(e) => {
                        setColumnFilters((s) => ({ ...s, active: e.target.value }));
                        setPage(1);
                      }}
                    >
                      <option value="">All</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </th>
                  <th className="global-tran-th-ui"></th>
                  <th className="global-tran-th-ui"></th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="global-ref-norecords-ui">
                      Loading...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="global-ref-norecords-ui">
                      No records found
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`global-tran-tr-ui ${
                        selectedAccount?.acctCode === row.acctCode ? "bg-blue-50" : ""
                      }`}
                      onClick={() => handleEditAccount(row)}
                    >
                      <td className="global-tran-td-ui">{row.acctCode}</td>
                      <td className="global-tran-td-ui">{row.acctName}</td>
                      <td className="global-tran-td-ui">{row.acctType}</td>
                      <td className="global-tran-td-ui">{row.acctGroup}</td>
                      <td className="global-tran-td-ui">{row.acctBalance}</td>
                      <td className="global-tran-td-ui">{row.reqSL === "Y" ? "Yes" : "No"}</td>
                      <td className="global-tran-td-ui">{row.reqRC === "Y" ? "Yes" : "No"}</td>
                      <td className="global-tran-td-ui">{row.classCode}</td>
                      <td className="global-tran-td-ui">{row.fsConsoCode}</td>
                      <td className="global-tran-td-ui">{row.oldCode}</td>
                      <td className="global-tran-td-ui">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${
                            row.active === "Y"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {row.active === "Y" ? "Yes" : "No"}
                        </span>
                      </td>

                      <td className="global-tran-td-ui text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAccount(row);
                          }}
                          className="global-tran-td-button-add-ui"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </td>

                      <td className="global-tran-td-ui text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAccount(row);
                            setTimeout(() => handleDeleteAccount(), 0);
                          }}
                          className="global-tran-td-button-delete-ui"
                          title="Delete"
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
              <div className="text-xs opacity-80 font-semibold">Total Records: {filtered.length}</div>

              <div className="flex items-center gap-2">
                <select
                  className="px-7 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>

                <div className="text-xs opacity-80 font-semibold">
                  Page {page} / {totalPages}
                </div>

                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-7 py-2 text-xs font-medium text-blue-800 bg-white border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  Prev
                </button>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-7 py-2 text-xs font-medium text-blue-800 bg-white border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default COAMast;