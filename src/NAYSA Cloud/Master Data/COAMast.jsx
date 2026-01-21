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

import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalDeleteConfirm,
  useSwalDeleteSuccess,
  useSwalshowSaveSuccessDialog,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";

// ✅ FieldRenderer (adjust path as needed)
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

const COAMast = () => {
  const { user } = useAuth();

  const docType = "COAMast";
  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const showValidation = async (title, lines) => {
    const msg = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
    return useSwalValidationAlert({
      icon: "error",
      title,
      message: msg,
    });
  };


  const toUiBalance = (v) => {
    const x = String(v || "").toUpperCase();
    if (x === "DR") return "Debit";
    if (x === "CR") return "Credit";
    if (String(v) === "Debit" || String(v) === "Credit") return v;
    return v || "";
  };

  const toDbBalance = (v) => {
    const x = String(v || "").toUpperCase();
    if (x === "DEBIT" || x === "DR") return "DR";
    if (x === "CREDIT" || x === "CR") return "CR";
    return v || "";
  };

  const [formData, setFormData] = useState({
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

    // UI-only (unless you extend sproc)
    contraAccount: "",
    reqBudget: "N",
  });

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const [sortConfig, setSortConfig] = useState({
    key: "acctCode",
    direction: "asc",
  });

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

  const [balanceTypes, setBalanceTypes] = useState([]);
  const [accountGroups, setAccountGroups] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);

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

  const extractRowsFromResponse = (response) => {
    const payload = response?.data;
    if (!payload?.success) return [];

    if (Array.isArray(payload.data) && payload.data[0]?.result) {
      try {
        return JSON.parse(payload.data[0].result) || [];
      } catch {
        return [];
      }
    }

    if (Array.isArray(payload.data)) return payload.data;
    return [];
  };

  const toYN = (v, defaultVal = "N") => {
    const x = String(v ?? "").trim().toUpperCase();
    if (x === "Y" || x === "YES" || x === "TRUE" || x === "1") return "Y";
    if (x === "N" || x === "NO" || x === "FALSE" || x === "0") return "N";
    return defaultVal;
  };

  const codeToName = (list, code) => {
    const x = String(code ?? "").trim();
    const found = (list || []).find((i) => String(i.code) === x);
    return found?.name || x;
  };

  const mapRowToUi = (a) => {
    const fsConsoCode = a?.fsConsoCode ?? a?.fsConsCode ?? a?.fsconso_code ?? "";
    const fsConsoName = a?.fsConsoName ?? a?.fsConsDesc ?? a?.fsconso_name ?? "";

    return {
      acctCode: a?.acctCode ?? a?.acct_code ?? "",
      acctName: a?.acctName ?? a?.acct_name ?? "",
      classCode: a?.classCode ?? a?.class_code ?? "",
      acctType: a?.acctType ?? a?.acct_type ?? "",
      acctGroup: a?.acctGroup ?? a?.acct_group ?? "",
      acctBalance: toUiBalance(a?.acctBalance ?? a?.acct_balance ?? ""),
      reqSL: toYN(a?.reqSL ?? a?.req_sl ?? "N"),
      reqRC: toYN(a?.reqRC ?? a?.req_rc ?? "N"),
      fsConsoCode,
      fsConsoName,
      oldCode: a?.oldCode ?? a?.old_code ?? "",
      active: toYN(a?.active ?? a?.isActive ?? a?.ACTIVE ?? "Y", "Y"),

      registeredBy: a?.registeredBy ?? a?.registered_by ?? "",
      registeredDate: a?.registeredDate ?? a?.registered_date ?? "",
      lastUpdatedBy: a?.lastUpdatedBy ?? a?.updated_by ?? "",
      lastUpdatedDate: a?.lastUpdatedDate ?? a?.updated_date ?? "",

    };
  };

  const normalizeDropdown = (items) =>
    (items || [])
      .map((x) => {
        const rawCode =
          x?.DROPDOWN_CODE ??
          x?.dropdown_code ??
          x?.dropdownCode ??
          x?.CODE ??
          x?.code ??
          "";
        const rawName =
          x?.DROPDOWN_NAME ??
          x?.dropdown_name ??
          x?.dropdownName ??
          x?.NAME ??
          x?.name ??
          "";

        const u = String(rawCode || "").toUpperCase();
        const uiCode = u === "DR" ? "Debit" : u === "CR" ? "Credit" : rawCode;
        const uiName =
          rawName || (u === "DR" ? "Debit" : u === "CR" ? "Credit" : "");

        return { code: uiCode || "", name: uiName || "" };
      })
      .filter((x) => x.code || x.name);

  const ACCT_TYPE_CODE = {
    ASSET: "A",
    LIABILITY: "L",
    CAPITAL: "C",
    INCOME: "I",
    EXPENSE: "E",
  };

  const ACCT_GRP_CODE = {
    "BALANCE SHEET": "B",
    "INCOME STATEMENT": "I",
  };

  const normalizeAcctType = (item) => {
    if (!item) return item;
    const code = String(item.code || "").trim();
    const name = String(item.name || "").trim();
    if (code.length === 1) return { code, name };

    const mapped = ACCT_TYPE_CODE[code.toUpperCase()] || ACCT_TYPE_CODE[name.toUpperCase()];
    return mapped ? { code: mapped, name } : item;
  };

  const normalizeAcctGroup = (item) => {
    if (!item) return item;
    const code = String(item.code || "").trim();
    const name = String(item.name || "").trim();
    if (code.length === 1) return { code, name };

    const mapped = ACCT_GRP_CODE[code.toUpperCase()] || ACCT_GRP_CODE[name.toUpperCase()];
    return mapped ? { code: mapped, name } : item;
  };

  const latestDropdownReqRef = useRef(0);

  const loadHSDropdowns = async () => {
    const reqId = ++latestDropdownReqRef.current;

    try {
      const [bal, grp, typ] = await Promise.all([
        useTopDocDropDown("COAMAST", "NBAL"),
        useTopDocDropDown("COAMAST", "ACCT_TYPE"),
        useTopDocDropDown("COAMAST", "ACCT_GRP"),
      ]);

      if (reqId !== latestDropdownReqRef.current) return;

      setBalanceTypes(normalizeDropdown(bal));
      setAccountTypes(normalizeDropdown(typ).map(normalizeAcctType));
      setAccountGroups(normalizeDropdown(grp).map(normalizeAcctGroup));
    } catch (err) {
      console.error("Dropdown load failed", err);
      if (reqId !== latestDropdownReqRef.current) return;

      setBalanceTypes([]);
      setAccountTypes([]);
      setAccountGroups([]);
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/cOA");
      const rows = extractRowsFromResponse(response);
      setAccounts(rows.map((a) => mapRowToUi(a)));
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
      const response = await apiClient.post("/lookupCOA", {
        PARAMS: JSON.stringify({ search: "Single", acctCode }),
      });

      const rows = extractRowsFromResponse(response);
      const row = rows?.[0] ? mapRowToUi(rows[0]) : null;
      if (!row) throw new Error("Account not found");

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) setOpenExport(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveAccount();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, isEditing]);

  useEffect(() => {
    let timer;
    if (loading) timer = setTimeout(() => setShowSpinner(true), 200);
    else setShowSpinner(false);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    fetchAccounts();
    loadHSDropdowns();
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

    setRegistrationInfo({
      registeredBy: "",
      registeredDate: "",
      lastUpdatedBy: "",
      lastUpdatedDate: "",
    });
  };

  // ✅ Keep your original handler (used in some places)
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // ✅ reset duplicate flag when Account Code changes
    if (name === "acctCode") {
      setIsDupCode(false);
    }
  };


  // ✅ Helper for FieldRenderer (since it returns value only)
  const setField = (name, value) => setFormData((p) => ({ ...p, [name]: value }));

  const startNew = () => {
    resetForm();
    setIsEditing(true);
  };

  const latestGetRef = useRef(0);

  const handleEditAccount = async (row) => {
    const reqId = ++latestGetRef.current;
    setSelectedAccount(row);

    const full = await getAccount(row.acctCode);

    if (reqId !== latestGetRef.current) return;

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

  const [isDupCode, setIsDupCode] = useState(false);

  const handleSaveAccount = async () => {
    setSaving(true);

    try {
      const missingFields = [];

      const acctCode = (formData.acctCode || "").trim();
      const acctName = (formData.acctName || "").trim();
      const acctBalance = (formData.acctBalance || "").trim();

      const classCode = (formData.classCode || "").trim();     // Account Classification
      const acctType = (formData.acctType || "").trim();      // Account Type
      const acctGroup = (formData.acctGroup || "").trim();     // Account Group
      const reqSL = (formData.reqSL || "").trim();         // SL Required
      const reqRC = (formData.reqRC || "").trim();         // RC Required

      if (!acctCode) missingFields.push("Account Code");
      if (!acctName) missingFields.push("Account Name");
      if (!classCode) missingFields.push("Account Classification");
      if (!acctType) missingFields.push("Account Type");
      if (!acctGroup) missingFields.push("Account Group");
      if (!acctBalance) missingFields.push("Balance Type");

      // if you allow only Y/N, validate too
      if (!reqSL) missingFields.push("SL Required (Y/N)");
      else if (!["Y", "N"].includes(reqSL.toUpperCase()))
        missingFields.push("SL Required (Y/N)");

      if (!reqRC) missingFields.push("RC Required (Y/N)");
      else if (!["Y", "N"].includes(reqRC.toUpperCase()))
        missingFields.push("RC Required (Y/N)");

      if (missingFields.length > 0) {
        await showValidation(
          "Missing Required Field(s)",
          missingFields.map((f) => `• ${f}`)
        );
        setSaving(false);
        return;
      }

      const isAdd = !selectedAccount;

      // ✅ avoid double popup (already warned on blur)
      if (isAdd && isDupCode) return;

      // ✅ safety net (if blur didn't happen)
      if (isAdd) {
        const isDuplicate = accounts.some(
          (a) =>
            String(a?.acctCode || "")
              .trim()
              .toUpperCase() === acctCode.toUpperCase()
        );

        if (isDuplicate) {
          setIsDupCode(true);
          await showValidation("Duplicate Entry", ["Duplicate Code is not allowed."]);
          return;
        }
      }

      const response = await apiClient.post("/upsertCOA", {
        json_data: JSON.stringify({
          json_data: {
            action: isAdd ? "ADD" : "EDIT",
            acctCode,
            acctName,
            classCode: formData.classCode,
            acctType: formData.acctType,
            acctGroup: formData.acctGroup,
            acctBalance: toDbBalance(acctBalance),
            reqSL: formData.reqSL,
            reqRC: formData.reqRC,
            fsCode: formData.fsConsoCode,
            oldCode: formData.oldCode,
            active: formData.active,
            userCode: user?.USER_CODE || "ADMIN",
          },
        }),
      });

      if (response?.data?.status === "success") {
        await useSwalshowSaveSuccessDialog(resetForm, () => { });
        await fetchAccounts();
      } else {
        await useSwalErrorAlert("Save Failed", response?.data?.message || "Unable to save record.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.msg ||
        err?.message ||
        "Failed to save transaction.";

      await useSwalValidationAlert({ icon: "error", title: "Save Failed", message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleAcctCodeBlur = async () => {
    const code = (formData.acctCode || "").trim();
    if (!code) return;

    const isAdd = !selectedAccount;
    if (!isAdd) return;

    const dup = accounts.some(
      (a) => (a?.acctCode || "").trim().toUpperCase() === code.toUpperCase()
    );

    setIsDupCode(dup);

    if (dup) {
      await showValidation("Duplicate Entry", ["Duplicate Code is not allowed."]);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount?.acctCode) {
      await showValidation("Error", ["Please select an account to delete."]);
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
        json_data: JSON.stringify({
          json_data: {
            acctCode: selectedAccount.acctCode,
            userCode: user?.USER_CODE || "ADMIN",
          },
        }),
      });

      if (response?.data?.status === "success") {
        await useSwalDeleteSuccess();
        await fetchAccounts();
        resetForm();
      } else {
        await showValidation("Error", [
          response?.data?.message || "Failed to delete account.",
        ]);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.msg ||
        err?.message ||
        "Failed to delete account.";

      await showValidation("Error", [msg]);
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

  // ✅ FieldRenderer options
  const optAcctType = useMemo(
    () => accountTypes.map((x) => ({ value: x.code, label: x.name })),
    [accountTypes]
  );
  const optAcctGroup = useMemo(
    () => accountGroups.map((x) => ({ value: x.code, label: x.name })),
    [accountGroups]
  );
  const optBalance = useMemo(
    () => balanceTypes.map((x) => ({ value: x.code, label: x.name })),
    [balanceTypes]
  );
  const optYN = useMemo(
    () => [
      { value: "N", label: "No" },
      { value: "Y", label: "Yes" },
    ],
    []
  );

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
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!isEditing || saving ? "opacity-50 cursor-not-allowed" : ""
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

      {/* FORM */}
      <div className="global-tran-tab-div-ui mt-5" style={{ minHeight: "calc(100vh - 170px)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="global-ref-textbox-group-div-ui space-y-4">
            {/* Account Code (kept original due to special styling + maxLength) */}
            <div className="relative">
              <input
                type="text"
                id="acctCode"
                name="acctCode"
                placeholder=" "
                value={formData.acctCode}
                onChange={handleFormChange}
                onBlur={handleAcctCodeBlur}
                disabled={isEditing && selectedAccount}
                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                  } ${isEditing && selectedAccount ? "bg-blue-100 cursor-not-allowed" : ""}`}
                maxLength={20}
              />
              <label
                htmlFor="acctCode"
                className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"
                  }`}
              >
                <span className="global-ref-asterisk-ui">*</span> Account Code
              </label>
            </div>

            {/* Account Name */}
            <FieldRenderer
              type="text"
              name="acctName"
              label={
                <>
                  <span className="global-ref-asterisk-ui">*</span> Account Name
                </>
              }
              value={formData.acctName}
              onChange={handleFormChange}
              disabled={!isEditing}
              required
            />


            {/* Account Type | Account Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRenderer
                type="select"
                name="acctType"
                label={
                  <>
                    <span className="global-ref-asterisk-ui">*</span> Account Type
                  </>
                }
                value={formData.acctType}
                options={optAcctType}
                onChange={handleFormChange}
                disabled={!isEditing}
                required
              />

              <FieldRenderer
                type="select"
                name="acctGroup"
                label={
                  <>
                    <span className="global-ref-asterisk-ui">*</span> Account Group
                  </>
                }
                value={formData.acctGroup}
                options={optAcctGroup}
                onChange={handleFormChange}
                disabled={!isEditing}
                required
              />

            </div>

            {/* Balance Type | Active */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRenderer
                id="acctBalance"
                label={
                  <>
                    <span className="global-ref-asterisk-ui">*</span> Account Balance
                  </>
                }
                required
                type="select"
                value={formData.acctBalance || ""}
                disabled={!isEditing}
                options={optBalance}
                onChange={(v) => setField("acctBalance", v)}
              />

              <FieldRenderer
                id="active"
                label="Active"
                type="select"
                value={formData.active}
                disabled={!isEditing}
                options={[
                  { value: "Y", label: "Yes" },
                  { value: "N", label: "No" },
                ]}
                onChange={(v) => setField("active", v)}
              />
            </div>
          </div>

          {/* Column 2 */}
          <div className="global-ref-textbox-group-div-ui space-y-4">
            {/* SL Required | RC Required | Budget Required */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FieldRenderer
                id="reqSL"
                label={
                  <>
                    <span className="global-ref-asterisk-ui">*</span> SL Required
                  </>
                }
                type="select"
                value={formData.reqSL}
                disabled={!isEditing}
                options={optYN}
                onChange={(v) => setField("reqSL", v)}
              />
              <FieldRenderer
                id="reqRC"
                label={
                  <>
                    <span className="global-ref-asterisk-ui">*</span> RC Required
                  </>
                }
                type="select"
                value={formData.reqRC}
                disabled={!isEditing}
                options={optYN}
                onChange={(v) => setField("reqRC", v)}
              />
              <FieldRenderer
                id="reqBudget"
                label="Budget Required"
                type="select"
                value={formData.reqBudget}
                disabled={!isEditing}
                options={optYN}
                onChange={(v) => setField("reqBudget", v)}
              />
            </div>

            {/* Classification */}
            <FieldRenderer
              id="classCode"
              label={
                <>
                  <span className="global-ref-asterisk-ui">*</span> Account Classification
                </>
              }
              type="text"
              value={formData.classCode}
              disabled={!isEditing}
              onChange={(v) => setField("classCode", v)}
            />

            {/* FS Code | FS Description
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRenderer
                id="fsConsoCode"
                label="FS Code"
                type="text"
                value={formData.fsConsoCode}
                disabled={!isEditing}
                onChange={(v) => setField("fsConsoCode", v)}
              />
              <FieldRenderer
                id="fsConsoName"
                label="FS Description"
                type="text"
                value={formData.fsConsoName}
                disabled={!isEditing}
                onChange={(v) => setField("fsConsoName", v)}
              />
            </div> */}

            {/* Old Code | Contra Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRenderer
                id="oldCode"
                label="Old Code"
                type="text"
                value={formData.oldCode}
                disabled={!isEditing}
                onChange={(v) => setField("oldCode", v)}
              />
              <FieldRenderer
                id="contraAccount"
                label="Contra Account"
                type="text"
                value={formData.contraAccount}
                disabled={!isEditing}
                onChange={(v) => setField("contraAccount", v)}
              />
            </div>
          </div>

          {/* Column 3 */}
          <div className="global-ref-textbox-group-div-ui">
            <RegistrationInfo data={registrationInfo} disabled={true} />
          </div>
        </div>

        {/* TABLE (unchanged) */}
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
                    "Account Balance": "acctBalance",
                    "SL Required": "reqSL",
                    "RC Required": "reqRC",
                    "Account Classification": "classCode",
                    // "FS Code": "fsConsoCode",
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
                  pageRows.map((row) => (
                    <tr
                      key={row.acctCode}
                      className={`global-tran-tr-ui ${selectedAccount?.acctCode === row.acctCode ? "bg-blue-50" : ""
                        }`}
                      onClick={() => setSelectedAccount(row)}
                      onDoubleClick={() => handleEditAccount(row)}
                    >
                      <td className="global-tran-td-ui">{row.acctCode}</td>
                      <td className="global-tran-td-ui">{row.acctName}</td>
                      <td className="global-tran-td-ui">{codeToName(accountTypes, row.acctType)}</td>
                      <td className="global-tran-td-ui">{codeToName(accountGroups, row.acctGroup)}</td>
                      <td className="global-tran-td-ui">{row.acctBalance}</td>
                      <td className="global-tran-td-ui">{row.reqSL === "Y" ? "Yes" : "No"}</td>
                      <td className="global-tran-td-ui">{row.reqRC === "Y" ? "Yes" : "No"}</td>
                      <td className="global-tran-td-ui">{row.classCode}</td>
                      {/* <td className="global-tran-td-ui">{row.fsConsoCode}</td> */}
                      <td className="global-tran-td-ui">{row.oldCode}</td>
                      <td className="global-tran-td-ui">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${row.active === "Y" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
