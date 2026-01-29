import React, { useState, useEffect, useRef, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faPrint,
  faChevronDown,
  faFileCsv,
  faFileExcel,
  faFilePdf,
  faEdit,
  faTrashAlt
} from "@fortawesome/free-solid-svg-icons";

import SearchGlobalReferenceTable from "../Lookup/SearchGlobalReferenceTable";
import SearchCOAClassRef from "../Lookup/SearchCOAClassRef";


import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalDeleteConfirm,
  useSwalshowSave,
  useSwalValidationAlert,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

const COAMast = () => {
  const { user } = useAuth();

  const docType = "COAMast";
  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];
  const [isCOAClassLookupOpen, setIsCOAClassLookupOpen] = useState(false);


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

  const [balanceTypes, setBalanceTypes] = useState([]);
  const [accountGroups, setAccountGroups] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [accountClasses, setAccountClasses] = useState([]);

  const [isDupCode, setIsDupCode] = useState(false);

  const LoadingSpinner = () => (
    <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-xl">
        {saving ? "Saving…" : "Loading…"}
      </div>
    </div>
  );

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

    const mapped =
      ACCT_TYPE_CODE[code.toUpperCase()] || ACCT_TYPE_CODE[name.toUpperCase()];
    return mapped ? { code: mapped, name } : item;
  };

  const normalizeAcctGroup = (item) => {
    if (!item) return item;
    const code = String(item.code || "").trim();
    const name = String(item.name || "").trim();
    if (code.length === 1) return { code, name };

    const mapped =
      ACCT_GRP_CODE[code.toUpperCase()] || ACCT_GRP_CODE[name.toUpperCase()];
    return mapped ? { code: mapped, name } : item;
  };

  const latestDropdownReqRef = useRef(0);

  const loadHSDropdowns = async () => {
    const reqId = ++latestDropdownReqRef.current;

    try {
      const [bal, grp, typ, clsRes] = await Promise.all([
        useTopDocDropDown("COAMAST", "NBAL"),
        useTopDocDropDown("COAMAST", "ACCT_TYPE"),
        useTopDocDropDown("COAMAST", "ACCT_GRP"),
        apiClient.get("/cOAClass"),
      ]);

      if (reqId !== latestDropdownReqRef.current) return;

      setBalanceTypes(normalizeDropdown(bal));
      setAccountTypes(normalizeDropdown(typ).map(normalizeAcctType));
      setAccountGroups(normalizeDropdown(grp).map(normalizeAcctGroup));

      const clsRows = extractRowsFromResponse(clsRes);
      const cls = (clsRows || []).map((x) => ({
        code: x?.classCode ?? x?.class_code ?? "",
        name: x?.className ?? x?.class_name ?? "",
      }));
      setAccountClasses(cls.filter((x) => x.code || x.name));
    } catch (err) {
      console.error("Dropdown load failed", err);
      if (reqId !== latestDropdownReqRef.current) return;
      setBalanceTypes([]);
      setAccountTypes([]);
      setAccountGroups([]);
      setAccountClasses([]);
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
      await useSwalErrorAlert(
        "Error",
        `Failed to fetch accounts: ${err.message}`
      );
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
        registeredDate: row.registeredDate || "",
        lastUpdatedBy: row.lastUpdatedBy || "",
        lastUpdatedDate: row.lastUpdatedDate || "",
      });

      const {
        registeredBy,
        registeredDate,
        lastUpdatedBy,
        lastUpdatedDate,
        ...formOnly
      } = row;

      return formOnly;
    } catch (error) {
      console.error(error);
      await useSwalErrorAlert("Error", "Failed to get account details");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ✅ click outside export
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setOpenExport(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ sorted list (no filters yet; SearchGlobalReferenceTable handles UI filtering/grouping)
  const filtered = useMemo(() => {
    const out = Array.isArray(accounts) ? [...accounts] : [];
    out.sort((a, b) =>
      String(a?.acctCode ?? "").localeCompare(String(b?.acctCode ?? ""), undefined, {
        numeric: true,
      })
    );
    return out;
  }, [accounts]);

  // ✅ SearchGlobalReferenceTable columns
  const coaColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        sortable: false,
        renderType: "actions",
        render: (row) => (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                handleEditAccount(row);
              }}
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>

            <button
              type="button"
              className="px-2 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAccount(row);
              }}
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      { key: "acctCode", label: "Account Code", sortable: true },
      { key: "acctName", label: "Account Name", sortable: true },
      { key: "acctType", label: "Account Type", sortable: true },
      { key: "acctGroup", label: "Account Group", sortable: true },
      { key: "acctBalance", label: "Account Balance", sortable: true },
      { key: "reqSL", label: "SL Required", sortable: true },
      { key: "reqRC", label: "RC Required", sortable: true },
      { key: "classCode", label: "Account Classification", sortable: true },
      { key: "oldCode", label: "Old Code", sortable: true },
      { key: "active", label: "Active", sortable: true },
    ],
    // important: include handlers used inside render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedAccount, accounts, loading, saving]
  );


  // ✅ display-ready rows for the table
  const coaTableData = useMemo(() => {
    const rows = Array.isArray(filtered) ? filtered : [];
    return rows.map((row) => ({
      ...row,
      acctType: codeToName(accountTypes, row.acctType),
      acctGroup: codeToName(accountGroups, row.acctGroup),
      classCode: codeToName(accountClasses, row.classCode),
      reqSL: row.reqSL === "Y" ? "Yes" : "No",
      reqRC: row.reqRC === "Y" ? "Yes" : "No",
      active: row.active === "Y" ? "Yes" : "No",
    }));
  }, [filtered, accountTypes, accountGroups, accountClasses]);

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

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "acctCode") setIsDupCode(false);
  };

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

  const handleSaveAccount = async () => {
    setSaving(true);

    try {
      const missingFields = [];

      const acctCode = (formData.acctCode || "").trim();
      const acctName = (formData.acctName || "").trim();
      const acctBalance = (formData.acctBalance || "").trim();

      const classCode = (formData.classCode || "").trim();
      const acctType = (formData.acctType || "").trim();
      const acctGroup = (formData.acctGroup || "").trim();
      const reqSL = (formData.reqSL || "").trim();
      const reqRC = (formData.reqRC || "").trim();

      if (!acctCode) missingFields.push("Account Code");
      if (!acctName) missingFields.push("Account Name");
      if (!acctType) missingFields.push("Account Type");
      if (!acctGroup) missingFields.push("Account Group");
      if (!acctBalance) missingFields.push("Account Balance");
      if (!classCode) missingFields.push("Account Classification");

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
        return;
      }

      const isAdd = !selectedAccount;

      if (isAdd && isDupCode) return;

      if (isAdd) {
        const isDuplicate = accounts.some(
          (a) =>
            String(a?.acctCode || "").trim().toUpperCase() === acctCode.toUpperCase()
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
        await useSwalshowSave(resetForm, () => { });
        await fetchAccounts();
      } else {
        await useSwalErrorAlert(
          "Save Failed",
          response?.data?.message || "Unable to save record."
        );
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

  // ✅ Ctrl+S (MUST be after handleSaveAccount)
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
  }, [saving, isEditing, selectedAccount, formData]);

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

  const handleDeleteAccount = async (rowParam = null) => {
    const row = rowParam || selectedAccount;

    if (!row?.acctCode) {
      await showValidation("Error", ["Please select an account to delete."]);
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete this account?",
      `Code: ${row.acctCode} | Name: ${row.acctName || ""}`,
      "Yes, delete it"
    );

    if (!confirm.isConfirmed) return;

    try {
      const response = await apiClient.post("/deleteCOA", {
        json_data: JSON.stringify({
          json_data: {
            acctCode: row.acctCode,
            userCode: user?.USER_CODE || "ADMIN",
          },
        }),
      });

      if (response?.data?.status === "success") {
        await useSwalDeleteRecord();
        await fetchAccounts();

        // if you deleted the currently selected record, reset form
        if (selectedAccount?.acctCode === row.acctCode) resetForm();
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
        filter: {},
      };

      apiClient
        .get("/load", { params: payload, responseType: "blob" })
        .then((response) => {
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

  // options for FieldRenderer
  const optAcctType = useMemo(
    () => accountTypes.map((x) => ({ value: x.code, label: x.name })),
    [accountTypes]
  );
  const optAcctGroup = useMemo(
    () => accountGroups.map((x) => ({ value: x.code, label: x.name })),
    [accountGroups]
  );
  const optAcctClass = useMemo(
    () => accountClasses.map((x) => ({ value: x.code, label: x.name })),
    [accountClasses]
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

  useEffect(() => {
    let timer;
    if (loading) timer = setTimeout(() => setShowSpinner(true), 200);
    else setShowSpinner(false);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    fetchAccounts();
    loadHSDropdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        </div>
      </div>

      {/* FORM */}
      <div className="global-tran-tab-div-ui mt-5" style={{ minHeight: "calc(100vh - 170px)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="global-ref-textbox-group-div-ui space-y-4">
            {/* Account Code | Old Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    } ${isEditing && selectedAccount ? "bg-gray-100 cursor-not-allowed" : ""}`}
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

              <FieldRenderer
                id="oldCode"
                name="oldCode"
                label="Old Code"
                type="text"
                value={formData.oldCode}
                disabled={!isEditing}
                onChange={handleFormChange}
              />
            </div>

            <FieldRenderer
              type="text"
              name="acctName"
              label="Account Name"
              value={formData.acctName}
              onChange={handleFormChange}
              disabled={!isEditing}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRenderer
                type="select"
                name="acctType"
                label="Account Type"
                value={formData.acctType}
                options={optAcctType}
                onChange={handleFormChange}
                disabled={!isEditing}
                required
              />

              <FieldRenderer
                type="select"
                name="acctGroup"
                label="Account Group"
                value={formData.acctGroup}
                options={optAcctGroup}
                onChange={handleFormChange}
                disabled={!isEditing}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRenderer
                id="acctBalance"
                label="Account Balance"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <FieldRenderer
              label="Account Classification"
              required
              type="lookup"
              value={codeToName(accountClasses, formData.classCode) || ""} // ✅ SHOW NAME
              onLookup={!isEditing ? undefined : () => setIsCOAClassLookupOpen(true)}
              readOnly={true}
              disabled={!isEditing}
            />




            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRenderer
                id="reqBudget"
                label="Budget Required"
                type="select"
                value={formData.reqBudget}
                disabled={!isEditing}
                options={optYN}
                onChange={(v) => setField("reqBudget", v)}
              />

              <FieldRenderer
                id="contraAccount"
                name="contraAccount"
                label="Contra Account"
                type="text"
                value={formData.contraAccount}
                disabled={!isEditing}
                onChange={handleFormChange}
              />
            </div>
          </div>

          {/* Column 3 */}
          <div className="global-ref-textbox-group-div-ui space-y-4 max-w-md">
            <RegistrationInfo layout="stacked" data={registrationInfo} disabled />
          </div>
        </div>

        {/* TABLE */}
        <div className="global-tran-table-main-div-ui mt-6">
          <SearchGlobalReferenceTable
            docType={docType}     // ✅ add this
            columns={coaColumns}
            data={coaTableData}
            itemsPerPage={50}
            showFilters
            isLoading={loading}
            onRowDoubleClick={(row) => handleEditAccount(row)}
          />

          <SearchCOAClassRef
            isOpen={isCOAClassLookupOpen}
            onClose={(picked) => {
              setIsCOAClassLookupOpen(false);
              if (!picked) return;

              // ✅ store CODE (for saving), but UI shows NAME via codeToName()
              setField("classCode", picked.classCode);
            }}
          />



        </div>
      </div>
    </div>
  );
};

export default COAMast;
