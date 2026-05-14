// src/NAYSA Cloud/Reference File/ReferenceCodes/MSClassificationCodes.jsx

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

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchMSInvCateg from "@/NAYSA Cloud/Lookup/SearchMSInvCateg.jsx";

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

const DEFAULT_FORM = {
  code:        "",
  description: "",
  categCode:   "",
  categName:   "",
  registeredBy:    "",
  registeredDate:  "",
  lastUpdatedBy:   "",
  lastUpdatedDate: "",
  __existing: false,
};

/* ================= COMPONENT ================= */

const ClassificationCodes = forwardRef(({ onStateChange }, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userCode = user?.USER_CODE || user?.userCode || user?.code || "ADMIN";

  const codeInputRef    = useRef(null);
  const enterValidatedRef = useRef(false);

  const [form, setForm]               = useState(DEFAULT_FORM);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing]     = useState(false);
  const [isDupCode, setIsDupCode]     = useState(false);
  const [search, setSearch]           = useState("");
  const [isCategOpen, setIsCategOpen] = useState(false);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
  }, []);

  /* ================= LOAD LIST ================= */

  const classListQuery = useQuery({
    queryKey: ["msClassificationList"],
    queryFn: async () => {
      const res = await apiClient.get("/msClass");
      return extractRows(res);
    },
  });

  const classifications = useMemo(
    () => classListQuery.data || [],
    [classListQuery.data]
  );

  const isInitialLoading = classListQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;
    try {
      return classifications.some((item) =>
        String(item.code || item.classCode || "").toUpperCase() === c.toUpperCase()
      );
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
        `Classification Code "${code}" already exists.`
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
      return apiClient.post("/upsertMSClass", {
        json_data: JSON.stringify({
          json_data: {
            code:        payload.code,
            description: payload.description,
            categCode:   payload.categCode,
            userCode:    payload.userCode,
          },
        }),
      });
    },
    onSuccess: async (response) => {
      const row = response?.data?.data?.[0] || response?.data || {};
      const errorcount = Number(row?.errorcount ?? 0);
      const errormsg   = String(row?.errormsg   ?? "");

      if (errorcount > 0) {
        await useSwalErrorAlert("Validation Error", errormsg);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["msClassificationList"] });
      await useSwalSuccessAlert("Success!", "Classification Code saved successfully.");

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
        "Failed to save classification code.";
      await useSwalErrorAlert("Validation Error", msg);
    },
  });

  const handleSave = useCallback(() => {
    if (!isEditing || saveMutation.isPending) return;

    const payload = {
      ...form,
      code:        String(form.code        || "").trim(),
      description: String(form.description || "").trim(),
      categCode:   String(form.categCode   || "").trim(),
      userCode,
    };

    saveMutation.mutate(payload);
  }, [form, isEditing, saveMutation, userCode]);

  /* ================= DELETE ================= */

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      return apiClient.post("/deleteMSClass", {
        json_data: {
          code,
          userCode,
        },
      });
    },
    onSuccess: async (_, deletedCode) => {
      queryClient.invalidateQueries({ queryKey: ["msClassificationList"] });
      await useSwalDeleteRecord(
        "Deleted",
        `Classification Code ${deletedCode} has been successfully removed.`
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
        "Failed to delete classification code.";
      await useSwalErrorAlert("Error", msg);
    },
  });

  const handleDelete = useCallback(
    async (row) => {
      const code = row?.code || row?.classCode;
      if (!code) return;

      // Check if in use before confirming delete
      try {
        const checkRes = await apiClient.post("/checkInUsedMSClass", {
          json_data: { code },
        });
        const result = String(
          checkRes?.data?.data?.[0]?.result ??
          checkRes?.data?.[0]?.result ??
          "0"
        ).trim();

        if (result === "1") {
          await useSwalErrorAlert(
            "Cannot Delete",
            `Classification Code "${code}" is currently in use and cannot be deleted.`
          );
          return;
        }
      } catch {
        await useSwalErrorAlert("Error", "Failed to check if record is in use.");
        return;
      }

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
    if (!row) return;
    setForm({
      code:            row.code        || row.classCode   || "",
      description:     row.description || row.classDesc   || "",
      categCode:       row.categCode   || row.categ_code  || "",
      categName:       row.categName   || row.categ_name  || "",
      registeredBy:    row.registeredBy    || "",
      registeredDate:  row.registeredDate  || "",
      lastUpdatedBy:   row.lastUpdatedBy   || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
      __existing: true,
    });
    setIsEditing(true);
    setSelectedRow(row);
    setIsDupCode(false);
  };

  /* ================= LOADING ================= */

  const isLoading = isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

  /* ================= TABLE COLUMNS ================= */

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
      { key: "code",        label: "Classification Code",              sortable: true, width: 150 },
      { key: "description", label: "Classification Description / Name", sortable: true, width: 280 },
      { key: "categCode",   label: "Category Code",                    sortable: true, width: 120 },
      { key: "categName",   label: "Category Name",                    sortable: true, width: 200 },
    ],
    [handleEdit, handleDelete]
  );

  /* ================= TABLE DATA ================= */

  const tableData = useMemo(() => {
    const list = Array.isArray(classifications) ? classifications : [];

    const mapped = list.map((row, index) => ({
      ...row,
      code:        row.code        || row.classCode  || "",
      description: row.description || row.classDesc  || "",
      categCode:   row.categCode   || row.categ_code || "",
      categName:   row.categName   || row.categ_name || "",
      __idx: index,
    }));

    return mapped.filter((row) => {
      const s = String(search || "").trim().toLowerCase();
      if (!s) return true;
      return (
        String(row.code        || "").toLowerCase().includes(s) ||
        String(row.description || "").toLowerCase().includes(s) ||
        String(row.categCode   || "").toLowerCase().includes(s) ||
        String(row.categName   || "").toLowerCase().includes(s)
      );
    });
  }, [classifications, search]);

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
    save:  handleSave,
    reset: () => {
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
    },
  }));

  /* ================= RENDER ================= */

  return (
    <div className="flex flex-col h-full gap-3 w-full relative">

      {/* LOADING SPINNER */}
      {isLoading && <LoadingSpinner />}

      {/* TOP PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 shrink-0">

        {/* BOX 1: BASIC INFORMATION */}
        <Card className="p-4 flex flex-col">
          <SectionHeader title="BASIC INFORMATION" />
          <div className="space-y-3">

            <FieldRenderer
              label="Classification Code"
              required
              value={form.code}
              inputRef={codeInputRef}
              maxLength={20}
              onChange={(v) => setField("code", v ?? "")}
              onBlur={handleCodeValidate}
              onKeyDown={handleCodeValidate}
              disabled={!isEditing || form.__existing}
            />

            <FieldRenderer
              label="Classification Description"
              required
              value={form.description}
              maxLength={150}
              onChange={(v) => setField("description", v ?? "")}
              disabled={!isEditing}
            />

            <FieldRenderer
              label="Category Code"
              type="lookup"
              value={form.categCode || ""}
              onLookup={() => setIsCategOpen(true)}
              onChange={(v) => {
                setField("categCode", String(v ?? "").toUpperCase());
                setField("categName", "");
              }}
              disabled={!isEditing}
            />

            <FieldRenderer
              label="Category Description"
              value={form.categName}
              readOnly
              disabled
            />

          </div>
        </Card>

        {/* BOX 2: REGISTRATION INFORMATION */}
        <RegistrationInfo data={form} layout="stacked" />

      </div>

      {/* LIST TABLE */}
      <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={tableData}
          isLoading={isInitialLoading}
          docType="Classification Codes"
          itemsPerPage={50}
          onRowDoubleClick={handleEdit}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid={true}
        />
      </div>

      {/* Category Lookup Modal */}
      <SearchMSInvCateg
        isOpen={isCategOpen}
        onClose={(selected) => {
          setIsCategOpen(false);
          if (selected) {
            setField("categCode", selected.code || "");
            setField("categName", selected.description || "");
          }
        }}
      />

    </div>
  );
});

ClassificationCodes.displayName = "ClassificationCodes";
export default ClassificationCodes;