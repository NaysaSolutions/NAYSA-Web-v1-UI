// src/NAYSA Cloud/Reference File/VendMast.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPaperclip,
  faList,
  faTags,
  faPlus,
  faSave,
  faUndo,
  faPenToSquare,
  faBackwardFast,
  faChevronLeft,
  faChevronRight,
  faForwardFast,
  faClockRotateLeft,
  faTrash
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import AttachFileModal from "@/NAYSA Cloud/Lookup/AttachFileModal.jsx";

import {
  useSwalErrorAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalshowSave,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior";

import PayeeSetupTab from "@/NAYSA Cloud/Master Data/CustMastTabs/PayeeSetupTab";
import PayeeMasterDataTab from "@/NAYSA Cloud/Master Data/CustMastTabs/PayeeMasterDataTab";
import ReferenceCodesTab from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodesTab";

/* -------------------- CODE SERIES -------------------- */
const SL_PREFIX = { AG: "AG", CU: "CU", EM: "EM", OT: "OT", SU: "SU", TN: "TN" };

const normalizeSlType = (v) => {
  const s = String(v ?? "").toUpperCase().trim();
  if (!s) return "";
  if (["AG", "CU", "EM", "OT", "SU", "TN"].includes(s)) return s;
  if (s === "CUSTOMER") return "CU";
  if (s === "SUPPLIER") return "SU";
  if (s === "AGENCY") return "AG";
  if (s === "EMPLOYEE") return "EM";
  if (s === "OTHERS") return "OT";
  if (s === "TENANT") return "TN";
  return s;
};

const generateNextPayeeCode = (rows = [], sltypeCode = "SU") => {
  const sl = normalizeSlType(sltypeCode) || "SU";
  const prefix = SL_PREFIX[sl] || sl;

  const candidates = (Array.isArray(rows) ? rows : [])
    .filter((r) => normalizeSlType(r?.sltypeCode) === sl)
    .map((r) => String(r?.vendCode ?? "").trim())
    .filter(Boolean)
    .filter((code) => code.startsWith(prefix));

  if (!candidates.length) return `${prefix}000001`;

  const nums = candidates
    .map((code) => parseInt(code.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}${String(max + 1).padStart(6, "0")}`;
};
/* ----------------------------------------------------- */

const emptyForm = {
  sltypeCode: "SU",

  vendCode: "",
  vendName: "",
  vendContact: "",
  vendPosition: "",
  vendTelno: "",
  vendMobileno: "",
  vendEmail: "",
  vendAddr1: "",
  vendAddr2: "",
  vendAddr3: "",
  vendZip: "",
  vendTin: "",

  // mirror for CU mapping used by PayeeSetupTab
  custCode: "",
  custName: "",
  custTin: "",
  custFaxNo: "",

  businessName: "",
  firstName: "",
  middleName: "",
  lastName: "",
  taxClass: "",

  atcCode: "",
  vatCode: "",
  paytermCode: "",
  source: "L",
  currCode: "PHP",

  branchCode: "",
  acctCode: "",
  active: "Y",
  oldCode: "",
  registeredBy: "",
  registeredDate: "",
  updatedBy: "",
  updatedDate: "",

  __isNew: false,
};

const VendMast = () => {
  const [activeTab, setActiveTab] = useState("setup");
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const userCode = user?.userCode || user?.USER_CODE || user?.code || "";

  const [form, setForm] = useState({ ...emptyForm });
  const [selectedVendCode, setSelectedVendCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [attachmentRows, setAttachmentRows] = useState([]);

  // Master list
  const [subsidiaryType, setSubsidiaryType] = useState("");
  const [masterFilters, setMasterFilters] = useState({});
  const [masterAllRows, setMasterAllRows] = useState([]);
  const [masterRows, setMasterRows] = useState([]);

  const updateForm = (patch) => setForm((p) => ({ ...p, ...patch }));

  /* ------------------------------------------------------------------
     ✅ Standard swal validation format (same pattern used in COAMast)
  ------------------------------------------------------------------ */
  const showValidation = async (title, lines) => {
    const msg = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
    return useSwalValidationAlert({ icon: "error", title, message: msg });
  };

  // Extract errorCount/errorMsg returned by sprocs (COAMast style)
  const extractSprocError = (axiosResponse) => {
    const payload = axiosResponse?.data;
    const data = payload?.data;

    // common: { data: [ { errorMsg, errorCount } ] }
    if (Array.isArray(data) && data[0] && (data[0].errorCount !== undefined || data[0].errorMsg !== undefined)) {
      const errorCount = Number(data[0].errorCount || 0);
      const errorMsg = String(data[0].errorMsg || "");
      return { errorCount, errorMsg };
    }

    // sometimes wrapped as { data: [ { result: '...json...' } ] }
    if (Array.isArray(data) && data[0]?.result) {
      try {
        const parsed = JSON.parse(data[0].result);
        const row = Array.isArray(parsed) ? parsed[0] : parsed;
        if (row && (row.errorCount !== undefined || row.errorMsg !== undefined)) {
          return {
            errorCount: Number(row.errorCount || 0),
            errorMsg: String(row.errorMsg || ""),
          };
        }
      } catch {
        // ignore
      }
    }

    // fallback: some endpoints return { message } / { error }
    const fallbackMsg = payload?.message || payload?.error || payload?.msg;
    if (fallbackMsg) return { errorCount: 1, errorMsg: String(fallbackMsg) };

    return null;
  };

  // ✅ FIX: documentNo should be the actual code only
  const documentNo = useMemo(() => {
    const code = String(form?.vendCode || form?.custCode || "").trim();
    return code;
  }, [form]);

  /* -------------------- NAVIGATOR (after masterRows exists) -------------------- */
  const [recentCodes, setRecentCodes] = useState([]); // most recent first

  const currentCode = useMemo(
    () => String(form?.vendCode || form?.custCode || "").trim(),
    [form]
  );

  const indexInRows = useMemo(() => {
    if (!currentCode) return -1;
    return masterRows.findIndex(
      (r) => String(r?.vendCode || "").trim().toUpperCase() === currentCode.toUpperCase()
    );
  }, [masterRows, currentCode]);

  const pushRecent = (code) => {
    const c = String(code || "").trim();
    if (!c) return;
    setRecentCodes((prev) => [c, ...prev.filter((x) => x !== c)].slice(0, 20));
  };
  /* --------------------------------------------------------------------------- */

  const parseSprocJsonResult = (rows) => {
    if (!rows) return [];
    const r = rows?.[0]?.result;
    if (typeof r === "string") {
      try {
        return JSON.parse(r);
      } catch {
        return [];
      }
    }
    if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") return rows;
    return [];
  };

  const loadMasterList = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/payee");
      const parsed = parseSprocJsonResult(res?.data?.data);
      const list = Array.isArray(parsed) ? parsed : [];

      const normalized = list.map((x) => ({
        ...x,
        sltypeCode: normalizeSlType(x?.sltypeCode),
        vendCode: x.vendCode ?? "",
        vendName: x.vendName ?? "",
        address:
          x.address ??
          [x.vendAddr1, x.vendAddr2, x.vendAddr3].filter(Boolean).join(" ") ??
          "",
      }));

      setMasterAllRows(normalized);
      setMasterRows(normalized);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load payee list.", "error");
      setMasterAllRows([]);
      setMasterRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMasterList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenAttach = () => {
    const code = String(form?.vendCode || form?.custCode || "").trim();
    if (!code) {
      Swal.fire({ icon: "warning", title: "Required", text: "Payee Code is required." });
      return;
    }
    setIsAttachOpen(true);
  };

  const fetchVendorByCode = async (vendCode) => {
    const code = String(vendCode || "").trim();
    if (!code) return;

    setIsLoading(true);
    try {
      const res = await apiClient.post("/getPayee", { VEND_CODE: code });
      const parsed = parseSprocJsonResult(res?.data?.data);
      const row = Array.isArray(parsed) ? parsed?.[0] : null;

      if (!row) {
        Swal.fire("Info", "Payee not found.", "info");
        return;
      }

      const sl = normalizeSlType(row.sltypeCode ?? "SU");

      updateForm({
        ...emptyForm,
        __isNew: false,
        sltypeCode: sl,

        vendCode: code,
        custCode: code, // keep mirrored for CU

        vendName: row.vendName ?? "",
        custName: row.vendName ?? "",

        vendContact: row.vendContact ?? "",
        vendPosition: row.vendPosition ?? "",
        vendTelno: row.vendTelno ?? "",
        vendMobileno: row.vendMobileno ?? "",
        vendEmail: row.vendEmail ?? "",

        vendAddr1: row.vendAddr1 ?? "",
        vendAddr2: row.vendAddr2 ?? "",
        vendAddr3: row.vendAddr3 ?? "",
        vendZip: row.vendZip ?? "",
        vendTin: row.vendTin ?? "",

        custTin: row.vendTin ?? "",

        businessName: row.businessName ?? "",
        firstName: row.firstName ?? "",
        middleName: row.middleName ?? "",
        lastName: row.lastName ?? "",
        taxClass: row.taxClass ?? "",

        branchCode: row.branchCode ?? "",
        source: row.source ?? "L",
        currCode: row.currCode ?? "PHP",
        vatCode: row.vatCode ?? "",
        atcCode: row.atcCode ?? "",
        paytermCode: row.paytermCode ?? "",
        acctCode: row.acctCode ?? "",
        active: row.active ?? "Y",
        oldCode: row.oldcode ?? row.oldCode ?? "",
        registeredBy: row.registeredBy ?? row.registered_by ?? "",
        registeredDate: row.registeredDate ?? row.registered_date ?? "",
        updatedBy: row.updatedBy ?? row.updated_by ?? "",
        updatedDate: row.updatedDate ?? row.updated_date ?? "",

      });

      setSelectedVendCode(code);
      pushRecent(code);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to fetch payee.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------- NAV ACTIONS -------------------- */
  const navOpen = async (targetCode) => {
    const code = String(targetCode || "").trim();
    if (!code) return;
    setActiveTab("setup");
    setIsEditing(false); // open in view mode
    await fetchVendorByCode(code);
  };

  const goFirst = async () => {
    if (!masterRows.length) return;
    await navOpen(masterRows[0]?.vendCode);
  };

  const goLast = async () => {
    if (!masterRows.length) return;
    await navOpen(masterRows[masterRows.length - 1]?.vendCode);
  };

  const goPrev = async () => {
    if (indexInRows <= 0) return;
    await navOpen(masterRows[indexInRows - 1]?.vendCode);
  };

  const goNext = async () => {
    if (indexInRows < 0 || indexInRows >= masterRows.length - 1) return;
    await navOpen(masterRows[indexInRows + 1]?.vendCode);
  };


  /* ----------------------------------------------------- */
  const deleteVendor = async () => {
    const code = String(form?.vendCode || form?.custCode || "").trim();
    if (!code) {
      await showValidation("Missing Required Field(s)", ["• Payee Code"]);
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete Payee?",
      `This will permanently delete Payee Code ${code}. This action cannot be undone.`
    );
    if (!confirm) return;

    setIsLoading(true);
    try {
      await apiClient.post("/deletePayee", {
        VEND_CODE: code,
      });

      await useSwalDeleteRecord("Payee");

      setForm({ ...emptyForm });
      setSelectedVendCode("");
      setIsEditing(false);
      setAttachmentRows([]);

      await loadMasterList();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to delete payee.", "error");
    } finally {
      setIsLoading(false);
    }
  };


  const upsertVendor = async () => {
    const code = String(form?.vendCode || form?.custCode || "").trim();

    setIsLoading(true);
    try {
      const payload = {
        action: selectedVendCode ? "edit" : "add",

        vendCode: code,
        vendName: form.vendName || form.custName || "",
        businessName: form.businessName || "",

        firstName: form.firstName || "",
        middleName: form.middleName || "",
        lastName: form.lastName || "",

        taxClass: form.taxClass || "",

        vendAddr1: form.vendAddr1 || "",
        vendAddr2: form.vendAddr2 || "",
        vendAddr3: form.vendAddr3 || "",
        vendZip: form.vendZip || "",
        vendTin: form.vendTin || form.custTin || "",

        branchCode: form.branchCode || "",
        vendContact: form.vendContact || "",
        vendPosition: form.vendPosition || "",
        vendTelno: form.vendTelno || "",
        vendMobileno: form.vendMobileno || "",
        vendEmail: form.vendEmail || "",

        source: form.source || "",
        currCode: form.currCode || "",
        vatCode: form.vatCode || "",
        atcCode: form.atcCode || "",
        paytermCode: form.paytermCode || "",

        acctCode: form.acctCode || "",
        sltypeCode: normalizeSlType(form.sltypeCode),
        active: form.active || "y",
        oldCode: form.oldCode || "",
        userCode, // ✅ always from session/aut
      };

      const res = await apiClient.post("/upsertPayee", {
        json_data: payload,
      });

      // 🔴 SQL validation (COAMast standard)
      const rows = res?.data?.data || [];
      const r0 = rows[0] || {};

      const errorCount = Number(r0.errorcount ?? 0);
      const errorMsg = String(r0.errormsg ?? "");

      if (errorCount > 0) {
        await useSwalValidationAlert({
          icon: "error",
          title: "Missing Required Field(s)",
          message: errorMsg,
        });
        return;
      }

      // ✅ SUCCESS
      await useSwalshowSave(async () => {
        setSelectedVendCode(code);
        pushRecent(code);
        setIsEditing(false);
        await loadMasterList();
      }, () => { });
    } catch (e) {
      console.error(e);

      const sprocErr = extractSprocError(e?.response);
      if (sprocErr?.errorMsg) {
        await useSwalValidationAlert({
          icon: "error",
          title: "Missing Required Field(s)",
          message: String(sprocErr.errorMsg),
        });
        return;
      }

      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.response?.data?.msg ||
        e?.message ||
        "failed to save payee.";

      await useSwalErrorAlert("save failed", msg);
    } finally {
      setIsLoading(false);
    }
  };


  const applyMasterFilters = () => {
    const selectedType = normalizeSlType(subsidiaryType);

    const filtered = masterAllRows.filter((row) => {
      const rowType = normalizeSlType(row?.sltypeCode);
      if (selectedType && rowType !== selectedType) return false;

      for (const [key, val] of Object.entries(masterFilters || {})) {
        const q = String(val || "").trim().toLowerCase();
        if (!q) continue;
        const cell = String(row?.[key] || "").toLowerCase();
        if (!cell.includes(q)) return false;
      }
      return true;
    });

    setMasterRows(filtered);
  };

  const resetMasterFilters = () => {
    setSubsidiaryType("");
    setMasterFilters({});
    setMasterRows(masterAllRows);
  };

  const handleChangeMasterFilter = (key, value) => {
    setMasterFilters((p) => ({ ...p, [key]: value }));
  };

  const handleAdd = () => {
    const sl = normalizeSlType(form?.sltypeCode || "SU") || "SU";
    const nextCode = generateNextPayeeCode(masterAllRows, sl);

    setSelectedVendCode("");
    setForm({
      ...emptyForm,
      sltypeCode: sl,
      vendCode: nextCode,
      custCode: nextCode,
      __isNew: true,
    });

    setIsEditing(true);
    setActiveTab("setup");
    setAttachmentRows([]);
  };

  const handleEdit = () => {
    const code = String(form?.vendCode || form?.custCode || "").trim();
    if (!code) {
      Swal.fire("Required", "Please select a Payee record first.", "warning");
      return;
    }
    setIsEditing(true);
    setActiveTab("setup");
  };

  const handleResetSetup = () => {
    setSelectedVendCode("");
    setForm({ ...emptyForm });
    setIsEditing(false);
    setAttachmentRows([]);
  };

  const tabs = useMemo(
    () => [
      { id: "setup", label: "Payee Set-Up", icon: faFolderOpen },
      { id: "master", label: "Payee Master Data", icon: faList },
      { id: "ref", label: "Reference Codes", icon: faTags },
    ],
    []
  );

  const handleMasterRowDoubleClick = async ({ code }) => {
    if (!code) return;
    setActiveTab("setup");
    setIsEditing(false);
    await fetchVendorByCode(code);
  };

  const headerButtons = useMemo(() => {
    if (activeTab !== "setup") return [];

    const hasRecord =
      String(form?.vendCode || form?.custCode || "").trim() && !form.__isNew;

    const baseBtn =
      "h-9 px-3 text-sm rounded-lg flex items-center gap-2 whitespace-nowrap disabled:opacity-50";

    return [
      { key: "add", label: "Add", icon: faPlus, onClick: handleAdd, disabled: isLoading },
      { key: "edit", label: "Edit", icon: faPenToSquare, onClick: handleEdit, disabled: isLoading },
      { key: "save", label: "Save", icon: faSave, onClick: upsertVendor, disabled: isLoading || !isEditing },
      { key: "reset", label: "Reset", icon: faUndo, onClick: handleResetSetup, disabled: isLoading },
      { key: "attach", label: "Attach File", icon: faPaperclip, onClick: handleOpenAttach, disabled: isLoading, variant: "ghost" },
      { key: "delete", label: "Delete", icon: faTrash, onClick: deleteVendor, disabled: isLoading || isEditing || !hasRecord, variant: "danger" },
    ];

  }, [activeTab, isLoading, isEditing, form]);


  return (
    <div className="global-ref-main-div-ui mt-24">
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">Payee Master Data</h1>
        </div>

        <div className="flex flex-wrap gap-1 overflow-x-hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 mr-1
                ${activeTab === t.id
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"
                }`}
            >
              <FontAwesomeIcon icon={t.icon} className="w-4 h-4 mr-2" />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-center text-xs items-center">
          {/* ✅ NAVIGATOR */}
          {activeTab === "setup" && (
            <div className="flex items-center gap-1 bg-blue-600 border border-blue-300 rounded-md px-2 py-1 shadow-sm">
              <button
                type="button"
                className="px-2 py-1 rounded text-white hover:bg-blue-700 disabled:opacity-40 disabled:text-white"
                onClick={goFirst}
                disabled={isLoading || masterRows.length === 0 || indexInRows <= 0}
                title="First"
              >
                <FontAwesomeIcon icon={faBackwardFast} />
              </button>

              <button
                type="button"
                className="px-2 py-1 rounded text-white hover:bg-blue-700 disabled:opacity-40 disabled:text-white"
                onClick={goPrev}
                disabled={isLoading || masterRows.length === 0 || indexInRows <= 0}
                title="Previous"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>

              <div className="px-2 py-1 rounded text-white font-bold hover:bg-blue-700 disabled:opacity-40 disabled:text-white"
              >
                {indexInRows >= 0 ? `${indexInRows + 1} / ${masterRows.length}` : "— / —"}
              </div>

              <button
                type="button"
                className="px-2 py-1 rounded text-white hover:bg-blue-700 disabled:opacity-40 disabled:text-white"
                onClick={goNext}
                disabled={
                  isLoading ||
                  masterRows.length === 0 ||
                  indexInRows < 0 ||
                  indexInRows >= masterRows.length - 1
                }
                title="Next"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>

              <button
                type="button"
                className="px-2 py-1 rounded text-white hover:bg-blue-700 disabled:opacity-40 disabled:text-white"
                onClick={goLast}
                disabled={
                  isLoading ||
                  masterRows.length === 0 ||
                  indexInRows < 0 ||
                  indexInRows >= masterRows.length - 1
                }
                title="Last"
              >
                <FontAwesomeIcon icon={faForwardFast} />
              </button>

            </div>
          )}

          {!!headerButtons.length && <ButtonBar buttons={headerButtons} />}
        </div>
      </div>

      <div className="global-tran-tab-div-ui mt-5" style={{ minHeight: "calc(100vh - 170px)" }}>
        {activeTab === "setup" && (
          <PayeeSetupTab
            isLoading={isLoading}
            isEditing={isEditing}
            form={form}
            sltypeOptions={[
              { value: "AG", label: "AGENCY" },
              { value: "CU", label: "CUSTOMER" },
              { value: "EM", label: "EMPLOYEE" },
              { value: "OT", label: "OTHERS" },
              { value: "SU", label: "SUPPLIER" },
              { value: "TN", label: "TENANT" },
            ]}
            sourceOptions={[
              { value: "L", label: "Local" },
              { value: "F", label: "Foreign" },
            ]}
            activeOptions={[
              { value: "Y", label: "Yes" },
              { value: "N", label: "No" },
            ]}
            onChangeForm={updateForm}
            onSelectCustomerCode={fetchVendorByCode}
          />
        )}

        {activeTab === "master" && (
          <PayeeMasterDataTab
            isLoading={isLoading}
            subsidiaryType={subsidiaryType}
            onChangeSubsidiaryType={setSubsidiaryType}
            filters={masterFilters}
            onChangeFilter={handleChangeMasterFilter}
            rows={masterRows}
            onFilter={applyMasterFilters}
            onReset={resetMasterFilters}
            onPrint={() => Swal.fire("Info", "Print not yet wired.", "info")}
            onExport={() => Swal.fire("Info", "Export not yet wired.", "info")}
            onRowDoubleClick={handleMasterRowDoubleClick}
          />
        )}

        {activeTab === "ref" && <ReferenceCodesTab variant="vendor" />}
      </div>

      <AttachFileModal
        isOpen={isAttachOpen}
        onClose={() => setIsAttachOpen(false)}
        transaction="Payee Master Data"
        branch={form.branchCode || "HO"}
        documentNo={documentNo}
        rows={attachmentRows}
      />
    </div>
  );
};

export default VendMast;
