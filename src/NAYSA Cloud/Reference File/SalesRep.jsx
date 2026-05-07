import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import { Plus, Save, Undo2, Edit, Trash2 } from "lucide-react";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteSuccess,
  useSwalDeleteConfirm,
} from "@/NAYSA Cloud/Global/behavior";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

// Helper function to extract rows from response
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

const SectionHeader = ({ title }) => (
  <div className="mb-3 border-b pb-1">
    <div className="text-sm font-bold text-gray-800">{title}</div>
  </div>
);

export const SalesRep = () => {
  const docType = "SalesRep"; // Matches key in reftables.js
  const title = reftables?.[docType] || "Agent Codes";
  const pdfLink = reftablesPDFGuide?.[docType];
  const videoLink = reftablesVideoGuide?.[docType];

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userCode = user?.USER_CODE ?? user?.userCode ?? "ADMIN";

  const emptyForm = {
    salesRepCode: "",
    salesRepName: "",
    salesRepType: "SR",
    salesRepBranch: "HO",
    registeredBy: "",
    registeredDate: "",
    lastUpdatedBy: "",
    lastUpdatedDate: "",
    __existing: false,
  };

  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [isOpenGuide, setOpenGuide] = useState(false);
  const codeInputRef = useRef(null);
  const guideRef = useRef(null);

  // --- MOBILE ACTION SHEET STATES ---
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  useEffect(() => {
    document.title = title;
  }, [title]);

  // --- MOBILE DETECTOR EFFECT ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetUI = useCallback(() => {
    setForm(emptyForm);
    setIsEditing(false);
  }, []);

  // --- MOBILE ACTION SHEET HANDLERS ---
  const openMobileActionSheet = useCallback((row) => {
    setSelectedMobileRow(row);
    setIsMobileActionSheetMounted(true);

    requestAnimationFrame(() => {
      setIsMobileActionSheetOpen(true);
    });
  }, []);

  const closeMobileActionSheet = useCallback(() => {
    setIsMobileActionSheetOpen(false);

    setTimeout(() => {
      setIsMobileActionSheetMounted(false);
      setSelectedMobileRow(null);
    }, 300);
  }, []);

  const startNew = () => {
    resetUI();
    setIsEditing(true);
    setTimeout(() => codeInputRef.current?.focus?.(), 0);
  };

  const startEdit = (row) => {
    setForm({
      ...emptyForm,
      ...row,
      __existing: true,
    });
    setIsEditing(true);
    closeMobileActionSheet(); // Close sheet if opened from mobile
    setTimeout(() => codeInputRef.current?.focus?.(), 0);
  };

  /* ================= TANSTACK QUERY (Auto Sync) ================= */
  const salesRepQuery = useQuery({
    queryKey: ["salesRep"],
    queryFn: async () => {
      const res = await apiClient.get("/salesRep");
      return extractRows(res);
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
    refetchInterval: 1000 * 30, // Auto-sync every 30 seconds
  });

  const allRows = useMemo(() => salesRepQuery.data || [], [salesRepQuery.data]);
  const isLoading = salesRepQuery.isLoading;

  const upsertMutation = useMutation({
    mutationFn: (payload) =>
      apiClient.post("/upsertsalesRep", { json_data: payload }),
    onSuccess: async (res) => {
      const sqlRow = extractRows(res)?.[0] ?? res?.data?.data?.[0] ?? {};

      if (Number(sqlRow?.errorcount || 0) > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to save.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["salesRep"] });
      useSwalSuccessAlert("Success!", "Sales Rep record saved successfully.");
      resetUI();
    },
    onError: (error) => {
      useSwalErrorAlert("Error", error?.message || "Failed to save Sales Rep.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code) =>
      apiClient.post("/deletesalesRep", {
        json_data: { salesRepCode: code },
      }),
    onSuccess: async (res) => {
      const sqlRow = extractRows(res)?.[0] ?? res?.data?.data?.[0] ?? {};

      if (Number(sqlRow?.errorcount || 0) > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to delete.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["salesRep"] });
      useSwalDeleteSuccess();
      resetUI();
    },
    onError: (error) => {
      useSwalErrorAlert("Error", error?.message || "Failed to delete Sales Rep.");
    },
  });

  const parseResultFlag = (res) => {
    const row0 = res?.data?.data?.[0] || {};
    const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return String(parsed?.result) === "1";
    } catch {
      return false;
    }
  };

  const checkDuplicate = async (salesRepCode) => {
    const c = String(salesRepCode || "").trim();
    if (!c) return false;

    const res = await apiClient.post("/checkDuplicatesalesRep", {
      json_data: { salesRepCode: c },
    });

    return parseResultFlag(res);
  };

  const handleSalesRepCodeValidate = async () => {
    const code = String(form.salesRepCode || "").trim().toUpperCase();

    if (!code || !isEditing || form.__existing) return;

    try {
      const dup = await checkDuplicate(code);

      if (dup) {
        useSwalErrorAlert("Duplicate Entry", `Code "${code}" already exists.`);
        setField("salesRepCode", "");
        setTimeout(() => codeInputRef.current?.focus?.(), 0);
      }
    } catch {
      useSwalErrorAlert(
        "Validation Error",
        "An error occurred while validating the Sales Rep code."
      );
    }
  };

  const handleSave = async () => {
    if (!isEditing || upsertMutation.isPending) return;

    const code = String(form.salesRepCode || "").trim().toUpperCase();
    const name = String(form.salesRepName || "").trim();
    const type = String(form.salesRepType || "").trim();
    const branch = String(form.salesRepBranch || "").trim();

    const missing = [];
    if (!code) missing.push("• Agent Code");
    if (!name) missing.push("• Agent Name");

    if (missing.length) {
      useSwalErrorAlert(
        "Error!",
        `Please fill in the required field(s):\n${missing.join("\n")}`
      );
      return;
    }

    try {
      if (!form.__existing) {
        const duplicate = await checkDuplicate(code);

        if (duplicate) {
          useSwalErrorAlert("Duplicate Entry", `Code "${code}" already exists.`);
          setField("salesRepCode", "");
          setTimeout(() => codeInputRef.current?.focus?.(), 0);
          return;
        }
      }

      await upsertMutation.mutateAsync({
        ...form,
        salesRepCode: code,
        salesRepName: name,
        salesRepType: type,
        salesRepBranch: branch,
        userCode,
      });
    } catch (err) {
      useSwalErrorAlert(
        "Validation Error",
        err?.message || "An error occurred while saving the Agent record."
      );
    }
  };

  const handleDelete = async (row) => {
    const code = String(row?.salesRepCode || "").trim();

    if (!code) {
      useSwalErrorAlert("Error", "No Sales Rep Code selected.");
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete Sales Rep?",
      `Code: ${code}`
    );

    if (!confirm?.isConfirmed) return;

    try {
      await deleteMutation.mutateAsync(code);
      closeMobileActionSheet(); // Close sheet if opened from mobile
    } catch {}
  };

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return allRows;

    return allRows.filter((r) =>
      JSON.stringify(r).toLowerCase().includes(keyword)
    );
  }, [allRows, search]);

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        render: (row) => (
          <div className="flex justify-center gap-2 w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) openMobileActionSheet(row);
                else startEdit(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors text-xs"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (isMobile) openMobileActionSheet(row);
                else await handleDelete(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      { key: "salesRepCode", label: "Agent Code", sortable: true },
      { key: "salesRepName", label: "Agent Name", sortable: true },
      { key: "salesRepType", label: "Agent Type", sortable: true },
      { key: "salesRepBranch", label: "Branch", sortable: true },
    ],
    [isMobile, openMobileActionSheet]
  );

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">{title}</h1>

        <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
          <input
            className="global-tran-textbox-ui w-full sm:w-64"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={startNew}
              disabled={isEditing && !form.__existing}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50 text-xs"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isEditing || upsertMutation.isPending}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50 text-xs"
            >
              <Save size={16} /> <span className="hidden sm:inline">Save</span>
            </button>
            <button
              type="button"
              onClick={resetUI}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 text-xs"
            >
              <Undo2 size={16} /> <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
        <div className="flex h-fit max-w-lg flex-col gap-6">
          <section>
            <SectionHeader title="Basic Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRenderer
                label="Agent Code"
                required
                value={form.salesRepCode}
                inputRef={codeInputRef}
                onChange={(val) => setField("salesRepCode", val.toUpperCase())}
                onBlur={handleSalesRepCodeValidate}
                disabled={!isEditing || form.__existing}
              />

              <FieldRenderer
                label="Agent Name"
                required
                value={form.salesRepName}
                onChange={(val) => setField("salesRepName", val)}
                disabled={!isEditing}
              />

              <FieldRenderer
                label="Agent Type"
                type="select"
                options={[{ value: "SR", label: "Sales Representative" }]}
                value={form.salesRepType}
                disabled={!isEditing}
                onChange={(v) => setField("salesRepType", v)}
              />

              <FieldRenderer
                label="Agent Branch"
                type="select"
                options={[{ value: "HO", label: "Head Office" }]}
                value={form.salesRepBranch}
                disabled={!isEditing}
                onChange={(v) => setField("salesRepBranch", v)}
              />
            </div>
          </section>

          <RegistrationInfo data={form} layout="minimize" />
        </div>

        <div className="h-fit max-w-2xl overflow-hidden rounded-lg border">
          <SearchGlobalReferenceTable
            columns={columns}
            data={filteredRows}
            isLoading={isLoading}
            isFetching={salesRepQuery.isFetching} // Sync indicator
            onRowDoubleClick={startEdit}
            showGlobalSearch={false}
            onRefresh={() => salesRepQuery.refetch()}
            onMobileRowOpen={openMobileActionSheet} // Piped into global table!
          />
        </div>
      </div>

      {/* MOBILE ACTION SHEET COMPONENT */}
      {isMobileActionSheetMounted && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              isMobileActionSheetOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMobileActionSheet}
          />

          <div
            className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-2xl p-4 transform transition-transform duration-300 ease-out ${
              isMobileActionSheetOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-800">Agent Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.salesRepCode} {selectedMobileRow?.salesRepName ? `- ${selectedMobileRow.salesRepName}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => startEdit(selectedMobileRow)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 py-3 text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} />
                Edit
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(selectedMobileRow);
                }}
                className="w-full flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
                title="Delete"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
                <span className="md:hidden">Delete</span>
              </button>

              <button
                onClick={closeMobileActionSheet}
                className="w-full rounded-lg bg-gray-100 text-gray-700 py-3 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesRep;