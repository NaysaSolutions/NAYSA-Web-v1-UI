// src/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VECarMakeCodes.jsx

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
  code: row.code ?? row.crefCode ?? row.cref_code ?? "",
  description: row.description ?? row.crefName ?? row.cref_name ?? "",
  registeredBy: row.registeredBy ?? row.registered_by ?? "",
  registeredDate: row.registeredDate ?? row.registered_date ?? "",
  lastUpdatedBy: row.lastUpdatedBy ?? row.updatedBy ?? row.updated_by ?? "",
  lastUpdatedDate: row.lastUpdatedDate ?? row.updatedDate ?? row.updated_date ?? "",
  __existing: Boolean(row.__existing),
});

/* ================= DEFAULT FORM ================= */

const DEFAULT_FORM = {
  code: "",
  description: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

/* ================= COMPONENT ================= */

const VECarMakeCodes = forwardRef(({
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

  const makeListQuery = useQuery({
    queryKey: ["veMakeList"],
    queryFn: async () => {
      const res = await apiClient.get("/veMake");
      return extractRows(res).map(normalizeRecord);
    },
  });

  const makes = useMemo(() => makeListQuery.data || [], [makeListQuery.data]);
  const isInitialLoading = makeListQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = useCallback(async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;

    try {
      const res = await apiClient.post("/checkVEMakeDuplicate", {
        json_data: { code: c },
      });
      return getResultFlag(res) === "1";
    } catch {
      return makes.some((row) => String(row.code || "").toUpperCase() === c.toUpperCase());
    }
  }, [makes]);

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
      await useSwalErrorAlert("Duplicate Entry", `Vehicle Make Code "${code}" already exists.`);
      setField("code", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  }, [checkDuplicate, form.code, form.__existing, isEditing, setField]);

  /* ================= SAVE ================= */

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertVEMake", {
        json_data: JSON.stringify({
          json_data: {
            code: payload.code,
            description: payload.description,
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
        await useSwalErrorAlert("Validation Error", errormsg || "Failed to save Vehicle Make Code.");
        return;
      }
      
      

      queryClient.invalidateQueries({ queryKey: ["veMakeList"] });
      await useSwalSuccessAlert("Success!", "Vehicle Make Code saved successfully.");
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
        "Failed to save Vehicle Make Code.";
      await useSwalErrorAlert("Validation Error", msg);
    },
  });

  const handleSave = useCallback(async () => {
    if (isReadOnly || !canSave) {
      await showReadOnlyAlert("save vehicle make codes");
      return;
    }
    if (!isEditing || saveMutation.isPending) return;

    const payload = {
      code: String(form.code || "").trim(),
      description: String(form.description || "").trim(),
      userCode,
    };

    const missing = [];
    if (!payload.code) missing.push("Make Code");
    if (!payload.description) missing.push("Make Description");

    if (missing.length) {
      await useSwalErrorAlert(
        "Validation Error",
        `Please fill in the required field(s):\n• ${missing.join("\n• ")}`
      );
      return;
    }

    if (!form.__existing && await checkDuplicate(payload.code)) {
      setIsDupCode(true);
      await useSwalErrorAlert("Duplicate Entry", `Vehicle Make Code "${payload.code}" already exists.`);
      return;
    }

    saveMutation.mutate(payload);
  }, [canSave, checkDuplicate, form, isEditing, isReadOnly, saveMutation, showReadOnlyAlert, userCode]);

  /* ================= DELETE ================= */

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      const res = await apiClient.post("/deleteVEMake", {
        json_data: { code, userCode },
      });
      if (res?.data?.success === false) {
        throw new Error(res?.data?.errormsg || res?.data?.message || "Failed to delete Vehicle Make Code.");
      }
      return res;
    },
    onSuccess: async (_, deletedCode) => {
      queryClient.invalidateQueries({ queryKey: ["veMakeList"] });
      await useSwalDeleteRecord(
        "Deleted",
        `Vehicle Make Code "${deletedCode}" has been successfully removed.`
      );
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
    },
    onError: async (error) => {
      await useSwalErrorAlert("Error", error?.message || "Failed to delete Vehicle Make Code.");
    },
  });

  const handleDelete = useCallback(async (row) => {
    if (isReadOnly || !canDelete) {
      await showReadOnlyAlert("delete vehicle make codes");
      return;
    }

    const record = normalizeRecord(row);
    const code = String(record.code || "").trim();
    if (!code) return;

    try {
      const checkRes = await apiClient.post("/checkVEMakeInUsed", {
        json_data: { code },
      });
      if (getResultFlag(checkRes) === "1") {
        await useSwalErrorAlert(
          "Cannot Delete",
          `Vehicle Make Code "${code}" is currently in use and cannot be deleted.`
        );
        return;
      }
    } catch {
      await useSwalErrorAlert("Error", "Failed to check if Vehicle Make Code is in use.");
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
    setForm({ ...normalizeRecord(row), __existing: true });
    setSelectedRow(row);
    setIsDupCode(false);
  }, []);

  const handleRetrieve = useCallback((row) => {
    fillFormFromRow(row);
    setIsEditing(false);
  }, [fillFormFromRow]);

  const handleEdit = useCallback(async (row) => {
    if (isReadOnly || !canEdit) {
      await showReadOnlyAlert("edit vehicle make codes");
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
    { key: "code", label: "Make Code", sortable: true, width: 140 },
    { key: "description", label: "Make Description", sortable: true, width: 320 },
  ], [canDelete, canEdit, handleDelete, handleEdit, isReadOnly]);

  const tableData = useMemo(
    () => (Array.isArray(makes) ? makes : []).map((row, index) => ({
      ...row,
      ...normalizeRecord(row),
      __idx: index,
    })),
    [makes]
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
        await showReadOnlyAlert("add vehicle make codes");
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

  return (
    <div className="flex flex-col h-full gap-3 w-full relative">
      {isLoading && <LoadingSpinner />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 shrink-0">
        <Card className="p-4 flex flex-col">
          <SectionHeader title="BASIC INFORMATION" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="Make Code"
              required
              value={form.code}
              inputRef={codeInputRef}
              onChange={(v) => setField("code", String(v ?? "").toUpperCase())}
              onBlur={handleCodeValidate}
              onKeyDown={handleCodeValidate}
              disabled={isReadOnly || !isEditing || form.__existing}
            />
            <FieldRenderer
              label="Make Description"
              required
              value={form.description}
              onChange={(v) => setField("description", v ?? "")}
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
          docType="VE Make Codes"
          itemsPerPage={50}
          onRowDoubleClick={handleRowDoubleClick}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid
        />
      </div>
    </div>
  );
});

VECarMakeCodes.displayName = "VECarMakeCodes";
export default VECarMakeCodes;
