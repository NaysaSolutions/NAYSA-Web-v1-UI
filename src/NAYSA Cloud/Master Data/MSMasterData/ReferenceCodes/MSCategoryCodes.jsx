// src/NAYSA Cloud/Reference File/ReferenceCodes/CategoryCodes.jsx

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";

// IMPORT LOOKUPS & UTILITIES
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

/* ================= HELPERS ================= */

const Card = ({ children, className = "" }) => (
  <div className={`bg-white shadow-sm border border-slate-200 rounded-md flex flex-col ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-[11px] font-bold text-slate-700 tracking-wide border-b border-slate-200 pb-1.5">{title}</div>
  </div>
);

const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) return [];
  if (Array.isArray(res)) return res;

  if (typeof res === "string") {
    try {
      return JSON.parse(res) || [];
    } catch {
      return [];
    }
  }

  return [];
};

const DEFAULT_FORM = {
  code: "",
  description: "",
  uCostFlag: "N",
  invAcct: "", invAcctName: "",
  expAcct: "", expAcctName: "",
  rrAcct: "", rrAcctName: "",
  lcAcct: "", lcAcctName: "",
  rcCode: "", rcName: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const CategoryCodes = forwardRef(({ onStateChange }, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userCode = user?.USER_CODE || user?.userCode || user?.code || "ADMIN";

  const codeInputRef = useRef(null);
  const enterValidatedRef = useRef(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDupCode, setIsDupCode] = useState(false);
  const [search, setSearch] = useState("");

  // Lookup States
  const [isCoaOpen, setIsCoaOpen] = useState(false);
  const [isRcOpen, setIsRcOpen] = useState(false);
  const [lookupField, setLookupField] = useState(""); // tracks which field triggered COA

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
  }, []);

  /* ================= LOAD LIST ================= */

  const categoryListQuery = useQuery({
    queryKey: ["msCategoryList"],
    queryFn: async () => {
      const res = await apiClient.get("/msCateg");
      return extractRows(res);
    },
  });

  const categories = useMemo(
    () => categoryListQuery.data || [],
    [categoryListQuery.data]
  );

  const isInitialLoading = categoryListQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;

    try {
      const exists = categories.some((item) =>
        String(item.code || item.categoryCode || "").toUpperCase() === c.toUpperCase()
      );
      return exists;
    } catch {
      return false;
    }
  };

  /* ================= VALIDATE CODE ================= */

  const handleCodeValidate = async (arg) => {
    const isEvent = arg && typeof arg === "object" && "type" in arg;

    if (isEvent && arg.type === "keydown") {
      if (arg.key !== "Enter") return;
      enterValidatedRef.current = true;
    }

    if (isEvent && arg.type === "blur" && enterValidatedRef.current) {
      enterValidatedRef.current = false;
      return;
    }

    const code = String(form.code || "").trim();
    if (!code || !isEditing || form.__existing) return;

    const dup = await checkDuplicate(code);

    if (dup) {
      setIsDupCode(true);
      await useSwalErrorAlert(
        "Duplicate Entry",
        `Category Code "${code}" already exists.`
      );
      setField("code", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  };

  /* ================= SAVE ================= */
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertMSCateg", {
        json_data: JSON.stringify({
          json_data: {
            code: payload.code,
            description: payload.description,
            uCostFlag: payload.uCostFlag,
            invAcct: payload.invAcct,
            expAcct: payload.expAcct,
            rrAcct: payload.rrAcct,
            lcAcct: payload.lcAcct,
            rcCode: payload.rcCode,
            userCode: payload.userCode,
          }
        }),
      });
    },
    onSuccess: async (response) => {
      // Validation is fully handled by the sproc — read errorcount/errormsg from the response
      const row = response?.data?.data?.[0] || response?.data || {};

      const errorcount = Number(row?.errorcount ?? 0);
      const errormsg = String(row?.errormsg ?? "");

      if (errorcount > 0) {
        await useSwalErrorAlert("Validation Error", errormsg);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["msCategoryList"] });
      await useSwalSuccessAlert("Success!", "Category Code saved successfully.");

      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm(DEFAULT_FORM);
    },
    onError: async (error) => {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.errormsg ||
        error?.message ||
        "Failed to save category code.";

      await useSwalErrorAlert("Validation Error", msg);
    },
  });

  // No hardcoded frontend validation — the sproc handles required field checks
  // and returns errorcount + errormsg which onSuccess processes above.
  const handleSave = useCallback(() => {
    if (!isEditing || saveMutation.isPending) return;

    const payload = {
      ...form,
      code: String(form.code || "").trim().toUpperCase(),
      description: String(form.description || "").trim(),
      uCostFlag: form.uCostFlag === "Y" ? "Y" : "N",
      invAcct: String(form.invAcct || "").trim(),
      expAcct: String(form.expAcct || "").trim(),
      rrAcct: String(form.rrAcct || "").trim(),
      lcAcct: String(form.lcAcct || "").trim(),
      rcCode: String(form.rcCode || "").trim(),
      userCode,
    };

    saveMutation.mutate(payload);
  }, [form, isEditing, saveMutation, userCode]);

  /* ================= DELETE ================= */
  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      return apiClient.post("/deleteMSCateg", {
        json_data: {
          code: code,
          userCode: userCode
        }
      });
    },
    onSuccess: async (response, deletedCode) => {
      const sqlRow = response?.data?.data?.[0] || {};
      const errorcount = Number(sqlRow.errorcount ?? 0);
      const errormsg = String(sqlRow.errormsg ?? "");

      if (errorcount > 0) {
        await useSwalErrorAlert("Error", errormsg);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["msCategoryList"] });

      await useSwalDeleteRecord(
        "Deleted",
        `Category Code ${deletedCode} has been successfully removed.`
      );

      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
    },
    onError: async (error) => {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.errormsg ||
        error?.message ||
        "Failed to delete category code.";

      await useSwalErrorAlert("Error", msg);
    },
  });

  const handleDelete = useCallback(
    async (row) => {
      const code = row?.code || row?.categoryCode;
      if (!code) return;

      const confirm = await useSwalDeleteConfirm(
        "Delete Record?",
        `Are you sure you want to delete "${code}"?`
      );

      if (!confirm?.isConfirmed) return;

      deleteMutation.mutate(code);
    },
    [deleteMutation]
  );

  /* ================= EDIT ================= */

  const handleEdit = async (row) => {
    try {
      const normalizedRecord = {
        code: row.code || row.categoryCode || "",
        description: row.description || row.categoryDesc || "",
        uCostFlag: row.uCostFlag || row.u_cost_flag || "N",
        invAcct: row.invAcct || row.inv_acct || "",
        invAcctName: row.invAcctName || row.inv_acct_name || "",
        expAcct: row.expAcct || row.exp_acct || "",
        expAcctName: row.expAcctName || row.exp_acct_name || "",
        rrAcct: row.rrAcct || row.rr_acct || "",
        rrAcctName: row.rrAcctName || row.rr_acct_name || "",
        lcAcct: row.lcAcct || row.lc_acct || "",
        lcAcctName: row.lcAcctName || row.lc_acct_name || "",
        rcCode: row.rcCode || row.rc_code || "",
        rcName: row.rcName || row.rc_name || "",
        registeredBy: row.registeredBy || row.registered_by || "",
        registeredDate: row.registeredDate || row.registered_date || "",
        lastUpdatedBy: row.lastUpdatedBy || row.last_updated_by || row.updatedBy || row.updated_by || "",
        lastUpdatedDate: row.lastUpdatedDate || row.last_updated_date || row.updatedDate || row.updated_date || "",
      };

      setForm({ ...DEFAULT_FORM, ...normalizedRecord, __existing: true });
      setIsEditing(true);
      setSelectedRow(row);
    } catch {
      Swal.fire("Error", "Could not fetch record", "error");
    }
  };

  /* ================= COMBINED LOADING STATE ================= */
  const isLoading = isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

  /* ================= TABLE ================= */

  const tableColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 90,
        render: (row) => (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
              className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
            >
              <Edit size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
              className="p-1 rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
      { key: "code", label: "Category Code", sortable: true, width: 140 },
      { key: "description", label: "Category Description / Name", sortable: true, width: 280 },
      { key: "invAcct", label: "Inv Acct", sortable: true, width: 120 },
      { key: "expAcct", label: "Expense Acct", sortable: true, width: 120 },
      { key: "rrAcct", label: "RR Acct", sortable: true, width: 120 },
      // { key: "lcAcct", label: "LC Acct", sortable: true, width: 120 },
      { key: "rcCode", label: "RC Code", sortable: true, width: 120 },
      {
        key: "uCostFlag",
        label: "UCost",
        sortable: true,
        width: 100,
        render: (row) => (row.uCostFlag === "Y" ? "Y" : "N"),
      },
    ],
    [handleEdit, handleDelete]
  );

  const tableData = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];

    const mapped = list.map((row, index) => ({
      ...row,
      code: row.code || row.categoryCode || "",
      description: row.description || row.categoryDesc || "",
      __idx: index,
    }));

    return mapped.filter((row) => {
      const s = String(search || "").trim().toLowerCase();
      if (!s) return true;

      const uCostStatus = row.uCostFlag === "Y" ? "y" : "n";

      return (
        String(row.code).toLowerCase().includes(s) ||
        String(row.description).toLowerCase().includes(s) ||
        String(row.invAcct || "").toLowerCase().includes(s) ||
        String(row.expAcct || "").toLowerCase().includes(s) ||
        String(row.rrAcct || "").toLowerCase().includes(s) ||
        // String(row.lcAcct || "").toLowerCase().includes(s) ||
        String(row.rcCode || "").toLowerCase().includes(s) ||
        uCostStatus.includes(s)
      );
    });
  }, [categories, search]);

  /* ================= EXPOSE TO PARENT ================= */

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isEditing,
        canSave: isEditing && !isDupCode && !saveMutation.isPending,
      });
    }
  }, [isEditing, isDupCode, saveMutation.isPending, onStateChange]);

  useImperativeHandle(ref, () => ({
    add: () => {
      setIsEditing(true);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm({ ...DEFAULT_FORM, __existing: false });
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    },
    save: handleSave,
    reset: () => {
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
    },
  }));

  /* ================= LOOKUP HANDLERS ================= */

  const openCoaLookup = (field) => {
    setLookupField(field);
    setIsCoaOpen(true);
  };

  /* ================= RENDER ================= */

  return (
    <div className="flex flex-col h-full gap-3 w-full relative">

      {/* LOADING SPINNER */}
      {isLoading && <LoadingSpinner />}

      {/* TOP PANELS — Basic Info narrow | Accounting Info wide | Registration Info */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3 shrink-0">

        {/* BOX 1: BASIC INFORMATION */}
        <Card className="p-4 flex flex-col">
          <SectionHeader title="BASIC INFORMATION" />
          <div className="space-y-3">
            <FieldRenderer
              label="Category Code"
              required
              value={form.code}
              inputRef={codeInputRef}
              maxLength={20}
              onChange={(v) => setField("code", String(v ?? "").toUpperCase())}
              onBlur={handleCodeValidate}
              onKeyDown={handleCodeValidate}
              disabled={!isEditing || form.__existing}
            />

            <FieldRenderer
              label="Category Description"
              required
              value={form.description}
              maxLength={150}
              onChange={(v) => setField("description", v ?? "")}
              disabled={!isEditing}
            />

            <FieldRenderer
              label="UCost Flag"
              type="select"
              required
              value={!form.uCostFlag || form.uCostFlag === "" ? "N" : form.uCostFlag}
              onChange={(v) => {
                setField("uCostFlag", v === "Y" ? "Y" : "N");
              }}
              options={[
                { value: "Y", label: "Yes" },
                { value: "N", label: "No" },
              ]}
              disabled={!isEditing}
            />
          </div>
        </Card>

        {/* BOX 2: ACCOUNTING INFORMATION */}
        <Card className="p-4 flex flex-col">
          <SectionHeader title="ACCOUNTING INFORMATION" />
          <div className="space-y-3">

            {/* Inventory Account */}
            <FieldRenderer
              label="Inventory Account"
              type="lookup"
              value={form.invAcct ? `${form.invAcct}${form.invAcctName ? ` — ${form.invAcctName}` : ""}` : ""}
              required
              onLookup={() => openCoaLookup("inv")}
              onChange={(v) => setField("invAcct", v ?? "")}
              disabled={!isEditing}
            />

            {/* Expense Account */}
            <FieldRenderer
              label="Expense Account"
              type="lookup"
              value={form.expAcct ? `${form.expAcct}${form.expAcctName ? ` — ${form.expAcctName}` : ""}` : ""}
              required
              onLookup={() => openCoaLookup("exp")}
              onChange={(v) => setField("expAcct", v ?? "")}
              disabled={!isEditing}
            />

            {/* RR Account */}
            <FieldRenderer
              label="RR Account"
              type="lookup"
              value={form.rrAcct ? `${form.rrAcct}${form.rrAcctName ? ` — ${form.rrAcctName}` : ""}` : ""}
              required
              onLookup={() => openCoaLookup("rr")}
              onChange={(v) => setField("rrAcct", v ?? "")}
              disabled={!isEditing}
            />

            {/* Landed Cost Account
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <FieldRenderer
                  label="Landed Cost Account"
                  type="lookup"
                  value={form.lcAcct}
                  required
                  onLookup={() => openCoaLookup("lc")}
                  onChange={(v) => setField("lcAcct", v ?? "")}
                  disabled={!isEditing}
                />
              </div>
              <div className="col-span-2">
                <FieldRenderer
                  label=""
                  type="text"
                  value={form.lcAcctName}
                  readOnly
                  disabled
                />
              </div>
            </div> */}

            {/* Responsibility Center */}
            <FieldRenderer
              label="Responsibility Center"
              type="lookup"
              value={form.rcCode ? `${form.rcCode}${form.rcName ? ` — ${form.rcName}` : ""}` : ""}
              onLookup={() => setIsRcOpen(true)}
              onChange={(v) => setField("rcCode", v ?? "")}
              disabled={!isEditing}
            />
          </div>
        </Card>

        {/* BOX 3: REGISTRATION INFORMATION */}
        <RegistrationInfo data={form} layout="stacked" />

      </div>

      {/* LIST TABLE (Full Width Bottom) */}
      <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={tableData}
          isLoading={isInitialLoading}
          docType="Category Codes"
          itemsPerPage={50}
          onRowDoubleClick={handleEdit}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid={true}
        />
      </div>

      {/* Lookup Modals */}
      <SearchCOAMast
        isOpen={isCoaOpen}
        source={lookupField}
        customParam="ActiveAll"
        onClose={(selected, source) => {
          setIsCoaOpen(false);
          if (selected) {
            setField(`${source}Acct`, selected.acctCode);
            setField(`${source}AcctName`, selected.acctName);
          }
        }}
      />

      <SearchRCMast
        isOpen={isRcOpen}
        customParam="ActiveAll"
        onClose={(selected) => {
          setIsRcOpen(false);
          if (selected) {
            setField("rcCode", selected.rcCode);
            setField("rcName", selected.rcName);
          }
        }}
      />

    </div>
  );
});

CategoryCodes.displayName = "CategoryCodes";
export default CategoryCodes;