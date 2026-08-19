// src/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VECategCodes.jsx

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
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
    <div className="text-[11px] font-bold text-slate-700 tracking-wide border-b border-slate-200 pb-1.5">
      {title}
    </div>
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

const getResultFlag = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.[0]?.result ??
    response?.data?.result ??
    "0";
  return String(raw ?? "0").trim();
};

const normalizeRecord = (row = {}) => ({
  code: row.code ?? row.categCode ?? row.categ_code ?? "",
  description: row.description ?? row.categName ?? row.categ_desc ?? "",
  vehicleMake: row.vehicleMake ?? row.vehMake ?? row.veh_make ?? "",
  vehicleMakeName: row.vehicleMakeName ?? "",
  fuelUsed: row.fuelUsed ?? row.fuel_used ?? "",
  pistonDisp: row.pistonDisp ?? row.piston_disp ?? "0.00",
  grossWeight: row.grossWeight ?? row.gross_wt ?? "0.00",
  requireChassis: row.requireChassis ?? row.req_cs ?? "Y",
  invAcct: row.invAcct ?? row.inv_acct ?? "",
  invAcctName: row.invAcctName ?? "",
  arAcct: row.arAcct ?? row.ar_acct ?? "",
  arAcctName: row.arAcctName ?? "",
  salesAcct: row.salesAcct ?? row.sales_acct ?? "",
  salesAcctName: row.salesAcctName ?? "",
  sdiscAcct: row.sdiscAcct ?? row.sdisc_acct ?? "",
  sdiscAcctName: row.sdiscAcctName ?? "",
  rrAcct: row.rrAcct ?? row.rr_acct ?? "",
  rrAcctName: row.rrAcctName ?? "",
  cosAcct: row.cosAcct ?? row.cos_acct ?? "",
  cosAcctName: row.cosAcctName ?? "",
  actCode: row.actCode ?? row.act_code ?? "",
  actName: row.actName ?? "",
  lcAcct: row.lcAcct ?? row.lc_acct ?? "",
  lcAcctName: row.lcAcctName ?? "",
  registeredBy: row.registeredBy ?? row.registered_by ?? "",
  registeredDate: row.registeredDate ?? row.registered_date ?? "",
  lastUpdatedBy: row.lastUpdatedBy ?? row.updatedBy ?? row.updated_by ?? "",
  lastUpdatedDate: row.lastUpdatedDate ?? row.updatedDate ?? row.updated_date ?? "",
  __existing: Boolean(row.__existing),
});

const normalizeAcctCode = (selected = {}) =>
  selected.acctCode || selected.acct_code || selected.code || selected.ACCT_CODE || "";

const normalizeAcctName = (selected = {}) =>
  selected.acctName || selected.acct_name || selected.description || selected.ACCT_NAME || "";

const YES_NO_OPTIONS = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

const ACCOUNT_FIELDS = [
  { codeField: "invAcct", nameField: "invAcctName", label: "Inventory Account", required: true },
  { codeField: "arAcct", nameField: "arAcctName", label: "AR Account", required: true },
  { codeField: "salesAcct", nameField: "salesAcctName", label: "Sales Account", required: true },
  { codeField: "sdiscAcct", nameField: "sdiscAcctName", label: "Discount Account", required: true },
  { codeField: "rrAcct", nameField: "rrAcctName", label: "RR Clearing Account", required: true },
  { codeField: "cosAcct", nameField: "cosAcctName", label: "COS Account", required: true },
  { codeField: "lcAcct", nameField: "lcAcctName", label: "LC Account", required: false },
];

/* ================= DEFAULT FORM ================= */

const DEFAULT_FORM = {
  code: "",
  description: "",
  vehicleMake: "",
  vehicleMakeName: "",
  fuelUsed: "",
  pistonDisp: "0.00",
  grossWeight: "0.00",
  requireChassis: "Y",
  invAcct: "",
  invAcctName: "",
  arAcct: "",
  arAcctName: "",
  salesAcct: "",
  salesAcctName: "",
  sdiscAcct: "",
  sdiscAcctName: "",
  rrAcct: "",
  rrAcctName: "",
  cosAcct: "",
  cosAcctName: "",
  actCode: "",
  actName: "",
  lcAcct: "",
  lcAcctName: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

/* ================= COMPONENT ================= */

const VECategCodes = forwardRef(({
  onStateChange,
  isReadOnly = false,
  canAdd = true,
  canEdit = true,
  canSave = true,
  canDelete = true,
}, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userCode = user?.USER_CODE || user?.userCode || user?.code || "ADMIN";

  const codeInputRef = useRef(null);
  const enterValidatedRef = useRef(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDupCode, setIsDupCode] = useState(false);
  const [isCoaOpen, setIsCoaOpen] = useState(false);
  const [lookupField, setLookupField] = useState("");
  const [isRcOpen, setIsRcOpen] = useState(false);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
  }, []);

  const showReadOnlyAlert = useCallback(async (action = "perform this action") => {
    await useSwalErrorAlert("Read Only", `You are not allowed to ${action}.`);
  }, []);

  /* ================= LOAD LIST ================= */

  const categoryListQuery = useQuery({
    queryKey: ["veCategList"],
    queryFn: async () => {
      const res = await apiClient.get("/veCateg");
      return extractRows(res).map(normalizeRecord);
    },
  });

  const makeListQuery = useQuery({
    queryKey: ["veMakeList"],
    queryFn: async () => {
      const res = await apiClient.get("/veMake");
      return extractRows(res);
    },
  });

  const categories = useMemo(() => categoryListQuery.data || [], [categoryListQuery.data]);
  const makeRows = useMemo(() => makeListQuery.data || [], [makeListQuery.data]);
  const isInitialLoading = categoryListQuery.isLoading || makeListQuery.isLoading;

  const makeOptions = useMemo(
    () => makeRows
      .map((row) => {
        const value = String(row.code ?? row.crefCode ?? row.cref_code ?? "").trim();
        const name = String(row.description ?? row.crefName ?? row.cref_name ?? "").trim();
        return {
          value,
          label: name ? `${value} - ${name}` : value,
          name,
        };
      })
      .filter((row) => row.value),
    [makeRows]
  );

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = useCallback(async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;

    try {
      const res = await apiClient.post("/checkVECategDuplicate", {
        json_data: { code: c },
      });
      return getResultFlag(res) === "1";
    } catch {
      return categories.some((row) => String(row.code || "").toUpperCase() === c.toUpperCase());
    }
  }, [categories]);

  const handleCodeValidate = useCallback(async (arg) => {
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
      await useSwalErrorAlert("Duplicate Entry", `Vehicle Category Code "${code}" already exists.`);
      setField("code", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  }, [checkDuplicate, form.code, form.__existing, isEditing, setField]);

  /* ================= SAVE ================= */

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertVECateg", {
        json_data: JSON.stringify({
          json_data: {
            code: payload.code,
            description: payload.description,
            salesAcct: payload.salesAcct,
            sdiscAcct: payload.sdiscAcct,
            arAcct: payload.arAcct,
            cosAcct: payload.cosAcct,
            invAcct: payload.invAcct,
            actCode: payload.actCode,
            rrAcct: payload.rrAcct,
            vehicleMake: payload.vehicleMake,
            fuelUsed: payload.fuelUsed,
            pistonDisp: payload.pistonDisp,
            grossWeight: payload.grossWeight,
            requireChassis: payload.requireChassis,
            lcAcct: payload.lcAcct,
            userCode: payload.userCode,
          },
        }),
      });
    },
    onSuccess: async (response) => {
      const row = response?.data?.data?.[0] || response?.data || {};
      const errorcount = Number(row?.errorcount ?? response?.data?.errorcount ?? 0);
      const errormsg = String(row?.errormsg ?? response?.data?.errormsg ?? response?.data?.message ?? "");

      if (response?.data?.success === false || errorcount > 0) {
        await useSwalErrorAlert("Validation Error", errormsg || "Failed to save Vehicle Category Code.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["veCategList"] });
      await useSwalSuccessAlert("Success!", "Vehicle Category Code saved successfully.");
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
        "Failed to save Vehicle Category Code.";
      await useSwalErrorAlert("Validation Error", msg);
    },
  });

  const handleSave = useCallback(async () => {
    if (isReadOnly || !canSave) {
      await showReadOnlyAlert("save vehicle category codes");
      return;
    }
    if (!isEditing || saveMutation.isPending) return;

    const payload = {
      ...form,
      code: String(form.code || "").trim(),
      description: String(form.description || "").trim(),
      vehicleMake: String(form.vehicleMake || "").trim(),
      fuelUsed: String(form.fuelUsed || "").trim(),
      pistonDisp: form.pistonDisp === "" || form.pistonDisp === null ? 0 : Number(form.pistonDisp),
      grossWeight: form.grossWeight === "" || form.grossWeight === null ? 0 : Number(form.grossWeight),
      requireChassis: String(form.requireChassis || "Y").trim().toUpperCase(),
      invAcct: String(form.invAcct || "").trim(),
      arAcct: String(form.arAcct || "").trim(),
      salesAcct: String(form.salesAcct || "").trim(),
      sdiscAcct: String(form.sdiscAcct || "").trim(),
      rrAcct: String(form.rrAcct || "").trim(),
      cosAcct: String(form.cosAcct || "").trim(),
      actCode: String(form.actCode || "").trim(),
      lcAcct: String(form.lcAcct || "").trim(),
      userCode,
    };

    const required = [
      [payload.code, "Category Code"],
      [payload.description, "Category Description"],
      [payload.vehicleMake, "Vehicle Make"],
      [payload.invAcct, "Inventory Account"],
      [payload.arAcct, "AR Account"],
      [payload.salesAcct, "Sales Account"],
      [payload.sdiscAcct, "Discount Account"],
      [payload.rrAcct, "RR Clearing Account"],
      [payload.cosAcct, "COS Account"],
      [payload.actCode, "RC Code"],
    ];
    const missing = required
      .filter(([value]) => !String(value ?? "").trim())
      .map(([, label]) => label);

    if (missing.length) {
      await useSwalErrorAlert(
        "Validation Error",
        `Please fill in the required field(s):\n• ${missing.join("\n• ")}`
      );
      return;
    }

    if (!Number.isFinite(payload.pistonDisp) || payload.pistonDisp < 0 ||
        !Number.isFinite(payload.grossWeight) || payload.grossWeight < 0) {
      await useSwalErrorAlert("Validation Error", "Piston Displacement and Gross Weight cannot be negative.");
      return;
    }

    if (!form.__existing && await checkDuplicate(payload.code)) {
      setIsDupCode(true);
      await useSwalErrorAlert("Duplicate Entry", `Vehicle Category Code "${payload.code}" already exists.`);
      return;
    }

    saveMutation.mutate(payload);
  }, [canSave, checkDuplicate, form, isEditing, isReadOnly, saveMutation, showReadOnlyAlert, userCode]);

  /* ================= DELETE ================= */

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      const res = await apiClient.post("/deleteVECateg", {
        json_data: { code, userCode },
      });
      if (res?.data?.success === false) {
        throw new Error(res?.data?.errormsg || res?.data?.message || "Failed to delete Vehicle Category Code.");
      }
      return res;
    },
    onSuccess: async (_, deletedCode) => {
      queryClient.invalidateQueries({ queryKey: ["veCategList"] });
      await useSwalDeleteRecord(
        "Deleted",
        `Vehicle Category Code "${deletedCode}" has been successfully removed.`
      );
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
    },
    onError: async (error) => {
      await useSwalErrorAlert("Error", error?.message || "Failed to delete Vehicle Category Code.");
    },
  });

  const handleDelete = useCallback(async (row) => {
    if (isReadOnly || !canDelete) {
      await showReadOnlyAlert("delete vehicle category codes");
      return;
    }

    const record = normalizeRecord(row);
    const code = String(record.code || "").trim();
    if (!code) return;

    try {
      const checkRes = await apiClient.post("/checkVECategInUsed", {
        json_data: { code },
      });
      if (getResultFlag(checkRes) === "1") {
        await useSwalErrorAlert(
          "Cannot Delete",
          `Vehicle Category Code "${code}" is currently in use and cannot be deleted.`
        );
        return;
      }
    } catch {
      await useSwalErrorAlert("Error", "Failed to check if Vehicle Category Code is in use.");
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete Record?",
      `Are you sure you want to delete "${code}"?`
    );
    if (!confirm?.isConfirmed) return;

    deleteMutation.mutate(code);
  }, [canDelete, deleteMutation, isReadOnly, showReadOnlyAlert]);

  /* ================= EDIT / RETRIEVE ================= */

  const fillFormFromRow = useCallback((row) => {
    if (!row) return;
    const record = normalizeRecord(row);
    const selectedMake = makeOptions.find((item) => item.value === String(record.vehicleMake || ""));
    setForm({
      ...record,
      vehicleMakeName: record.vehicleMakeName || selectedMake?.name || "",
      __existing: true,
    });
    setSelectedRow(row);
    setIsDupCode(false);
  }, [makeOptions]);

  const handleRetrieve = useCallback((row) => {
    fillFormFromRow(row);
    setIsEditing(false);
  }, [fillFormFromRow]);

  const handleEdit = useCallback(async (row) => {
    if (isReadOnly || !canEdit) {
      await showReadOnlyAlert("edit vehicle category codes");
      return;
    }
    fillFormFromRow(row);
    setIsEditing(true);
  }, [canEdit, fillFormFromRow, isReadOnly, showReadOnlyAlert]);

  const handleRowDoubleClick = useCallback((row) => {
    if (isReadOnly || !canEdit) {
      handleRetrieve(row);
      return;
    }
    fillFormFromRow(row);
    setIsEditing(true);
  }, [canEdit, fillFormFromRow, handleRetrieve, isReadOnly]);

  /* ================= TABLE ================= */

  const tableColumns = useMemo(() => [
    {
      key: "__actions",
      label: <span className="hidden md:inline">Actions</span>,
      width: 90,
      render: (row) => (
        <div className="flex gap-2 justify-center w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            disabled={isReadOnly || !canEdit}
            className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
              isReadOnly || !canEdit
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
            }`}
            title={isReadOnly || !canEdit ? "Read only" : "Edit"}
          >
            <FontAwesomeIcon icon={faEdit} />
            <span className="md:hidden">Edit</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            disabled={isReadOnly || !canDelete}
            className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
              isReadOnly || !canDelete
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                : "bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
            }`}
            title={isReadOnly || !canDelete ? "Read only" : "Delete"}
          >
            <FontAwesomeIcon icon={faTrashAlt} />
            <span className="md:hidden">Delete</span>
          </button>
        </div>
      ),
    },
    { key: "code", label: "Category Code", sortable: true, width: 130 },
    { key: "description", label: "Category Description / Name", sortable: true, width: 260 },
    { key: "vehicleMake", label: "Vehicle Make", sortable: true, width: 130 },
    { key: "fuelUsed", label: "Fuel Used", sortable: true, width: 120 },
    { key: "pistonDisp", label: "Piston Displacement", sortable: true, width: 150, classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "grossWeight", label: "Gross Weight", sortable: true, width: 130, classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "requireChassis", label: "Require Other Info", sortable: true, width: 130 },
    { key: "invAcct", label: "Inv Acct", sortable: true, width: 110 },
    { key: "cosAcct", label: "COS Acct", sortable: true, width: 110 },
    { key: "arAcct", label: "AR Acct", sortable: true, width: 110 },
    { key: "salesAcct", label: "Sales Acct", sortable: true, width: 110 },
    { key: "sdiscAcct", label: "Discount Acct", sortable: true, width: 120 },
    { key: "rrAcct", label: "RR Clearing", sortable: true, width: 120 },
    { key: "actCode", label: "RC Code", sortable: true, width: 110 },
    { key: "lcAcct", label: "LC Acct", sortable: true, width: 110 },
  ], [canDelete, canEdit, handleDelete, handleEdit, isReadOnly]);

  const tableData = useMemo(
    () => (Array.isArray(categories) ? categories : []).map((row, index) => ({
      ...row,
      ...normalizeRecord(row),
      __idx: index,
    })),
    [categories]
  );

  /* ================= EXPOSE TO PARENT ================= */

  useEffect(() => {
    onStateChange?.({
      isEditing,
      canSave: !isReadOnly && canSave && isEditing && !isDupCode && !saveMutation.isPending,
    });
  }, [canSave, isDupCode, isEditing, isReadOnly, onStateChange, saveMutation.isPending]);

  useImperativeHandle(ref, () => ({
    add: async () => {
      if (isReadOnly || !canAdd) {
        await showReadOnlyAlert("add vehicle category codes");
        return;
      }
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
  }), [canAdd, handleSave, isReadOnly, resetForm, showReadOnlyAlert]);

  const isLoading = isInitialLoading || saveMutation.isPending || deleteMutation.isPending;
  const selectedCoaConfig = ACCOUNT_FIELDS.find((field) => field.codeField === lookupField);

  return (
    <div className="flex flex-col h-full gap-3 w-full relative">
      {isLoading && <LoadingSpinner />}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.75fr)] gap-3 shrink-0">
        <Card className="p-4 flex flex-col">
          <SectionHeader title="BASIC INFORMATION" />
          <div className="space-y-3">
            <FieldRenderer
              label="Category Code"
              required
              value={form.code}
              inputRef={codeInputRef}
              onChange={(v) => setField("code", String(v ?? "").toUpperCase())}
              onBlur={handleCodeValidate}
              onKeyDown={handleCodeValidate}
              disabled={isReadOnly || !isEditing || form.__existing}
            />
            <FieldRenderer
              label="Category Description"
              required
              value={form.description}
              onChange={(v) => setField("description", v ?? "")}
              disabled={isReadOnly || !isEditing}
            />
            <FieldRenderer
              label="Vehicle Make"
              required
              type="select"
              options={makeOptions}
              value={form.vehicleMake}
              onChange={(v) => {
                const value = String(v ?? "");
                const selected = makeOptions.find((row) => row.value === value);
                setForm((prev) => ({
                  ...prev,
                  vehicleMake: value,
                  vehicleMakeName: selected?.name || "",
                }));
              }}
              disabled={isReadOnly || !isEditing}
            />
            <FieldRenderer
              label="Fuel Used"
              value={form.fuelUsed}
              onChange={(v) => setField("fuelUsed", v ?? "")}
              disabled={isReadOnly || !isEditing}
            />
            <div className="grid grid-cols-2 gap-3">
              <FieldRenderer
                label="Piston Displacement"
                type="number"
                value={form.pistonDisp}
                onChange={(v) => setField("pistonDisp", v ?? "0")}
                disabled={isReadOnly || !isEditing}
              />
              <FieldRenderer
                label="Gross Weight"
                type="number"
                value={form.grossWeight}
                onChange={(v) => setField("grossWeight", v ?? "0")}
                disabled={isReadOnly || !isEditing}
              />
            </div>
            <FieldRenderer
              label="Require Other / Chassis Info"
              type="select"
              options={YES_NO_OPTIONS}
              value={form.requireChassis || "Y"}
              onChange={(v) => setField("requireChassis", v ?? "Y")}
              disabled={isReadOnly || !isEditing}
            />
          </div>
        </Card>

        <Card className="p-4 flex flex-col">
          <SectionHeader title="ACCOUNT INFORMATION" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ACCOUNT_FIELDS.map(({ codeField, nameField, label, required }) => (
              <FieldRenderer
                key={codeField}
                label={label}
                required={required}
                type="lookup"
                value={form[codeField] ? `${form[codeField]}${form[nameField] ? ` - ${form[nameField]}` : ""}` : ""}
                onLookup={() => {
                  setLookupField(codeField);
                  setIsCoaOpen(true);
                }}
                onChange={(v) => {
                  setField(codeField, v ?? "");
                  if (!v) setField(nameField, "");
                }}
                disabled={isReadOnly || !isEditing}
              />
            ))}

            <FieldRenderer
              label="RC Code"
              required
              type="lookup"
              value={form.actCode ? `${form.actCode}${form.actName ? ` - ${form.actName}` : ""}` : ""}
              onLookup={() => setIsRcOpen(true)}
              onChange={(v) => {
                setField("actCode", v ?? "");
                if (!v) setField("actName", "");
              }}
              disabled={isReadOnly || !isEditing}
            />
          </div>
        </Card>

        <RegistrationInfo data={form} layout="stacked" />
      </div>

      <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={tableData}
          isLoading={isInitialLoading}
          docType="VE Category Codes"
          itemsPerPage={50}
          onRowDoubleClick={handleRowDoubleClick}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid
        />
      </div>

      <SearchCOAMast
        isOpen={isCoaOpen}
        source={lookupField}
        customParam="ActiveAll"
        onClose={(selected) => {
          setIsCoaOpen(false);
          if (!selected || !selectedCoaConfig) return;
          setField(selectedCoaConfig.codeField, normalizeAcctCode(selected));
          setField(selectedCoaConfig.nameField, normalizeAcctName(selected));
        }}
      />

      <SearchRCMast
        isOpen={isRcOpen}
        customParam="ActiveAll"
        onClose={(selected) => {
          setIsRcOpen(false);
          if (!selected) return;
          setField("actCode", selected.rcCode || selected.rc_code || selected.code || "");
          setField("actName", selected.rcName || selected.rc_name || selected.description || "");
        }}
      />
    </div>
  );
});

VECategCodes.displayName = "VECategCodes";
export default VECategCodes;
