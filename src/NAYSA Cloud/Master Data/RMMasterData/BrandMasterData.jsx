import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faPlus,
  faSave,
  faTrashAlt,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalErrorAlert,
  useSwalErrorAlertAPI,
  useSwalSuccessAlert,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import ItemBrandMatrix from "./ItemBrandMatrix.jsx";

const DOC_TYPE = "BrandMasterData";
const BRAND_LIST_ENDPOINT = "/brand";
const BRAND_UPSERT_ENDPOINT = "/upsert";
const BRAND_CHECK_DUPLICATE_ENDPOINT = "/check-duplicate";
const BRAND_CHECK_IN_USED_ENDPOINT = "/check-in-used";
const BRAND_DELETE_ENDPOINT = "/delete";

const INITIAL_FORM = {
  brandCode: "",
  brandName: "",
  active: "Y",
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const pick = (row, keys, fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return fallback;
};

const parseRows = (payload) => {
  const data = payload?.data ?? payload;
  const rows = Array.isArray(data) ? data : [];
  const firstResult = rows?.[0]?.result ?? rows?.[0]?.Result;

  if (typeof firstResult === "string") {
    try {
      const parsed = JSON.parse(firstResult);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return rows;
};

const parseResultFlag = (payload, key = "result") => {
  const raw =
    payload?.[key] ??
    payload?.data?.[key] ??
    payload?.data?.[0]?.[key] ??
    payload?.data?.[0]?.result ??
    payload?.data?.[0]?.Result ??
    "0";

  if (typeof raw === "string" && raw.trim().startsWith("{")) {
    try {
      return String(JSON.parse(raw)?.[key] ?? "0");
    } catch {
      return "0";
    }
  }

  return String(raw ?? "0");
};

const normalizeBrandRow = (row, index) => {
  const brandCode = String(
    pick(row, ["brandCode", "BRAND_CODE", "brand_code", "brand", "BRAND"])
  ).trim();
  const brandName = String(
    pick(row, ["brandName", "BRAND_NAME", "brand_name", "brandDesc", "BRAND_DESC"])
  ).trim();
  const active = String(pick(row, ["active", "ACTIVE"], "Y")).trim() || "Y";

  return {
    ...row,
    id: brandCode || String(index),
    brandCode,
    brandName,
    active,
    registeredBy: pick(row, ["registeredBy", "REGISTERED_BY", "createdBy", "CREATED_BY"]),
    registeredDate: pick(row, ["registeredDate", "REGISTERED_DATE", "createdDate", "CREATED_DATE"]),
    lastUpdatedBy: pick(row, ["lastUpdatedBy", "UPDATED_BY", "updatedBy", "LAST_UPDATED_BY"]),
    lastUpdatedDate: pick(row, ["lastUpdatedDate", "UPDATED_DATE", "updatedDate", "LAST_UPDATED_DATE"]),
  };
};

export default function BrandMasterData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const formTopRef = useRef(null);

  const [activeTab, setActiveTab] = useState("brand");
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [selectedBrandCode, setSelectedBrandCode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  useEffect(() => {
    document.title = "Brand Master Data";
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const brandQuery = useQuery({
    queryKey: ["brandMasterList"],
    queryFn: async () => {
      const response = await apiClient.get(BRAND_LIST_ENDPOINT);
      return parseRows(response?.data).map(normalizeBrandRow);
    },
  });

  const rows = useMemo(() => brandQuery.data || [], [brandQuery.data]);
  const isBusy =
    brandQuery.isLoading ||
    brandQuery.isFetching ||
    isLoadingAction;

  const updateForm = (updates) =>
    setFormData((previous) => ({ ...previous, ...updates }));

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedBrandCode(null);
    setIsEditing(false);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const refreshRows = async () => {
    await queryClient.invalidateQueries({ queryKey: ["brandMasterList"] });
  };

  const handleEdit = (row) => {
    setFormData({
      brandCode: row?.brandCode || "",
      brandName: row?.brandName || "",
      active: row?.active || "Y",
    });
    setRegistrationInfo({
      registeredBy: row?.registeredBy || "",
      registeredDate: row?.registeredDate || "",
      lastUpdatedBy: row?.lastUpdatedBy || "",
      lastUpdatedDate: row?.lastUpdatedDate || "",
    });
    setSelectedBrandCode(row?.brandCode || "");
    setIsEditing(true);
    closeMobileActionSheet();
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCheckDuplicate = async (code) => {
    const brandCode = String(code || "").trim().toUpperCase();
    if (!brandCode || selectedBrandCode) return;

    try {
      const response = await apiClient.post(BRAND_CHECK_DUPLICATE_ENDPOINT, {
        json_data: { brandCode },
      });

      if (parseResultFlag(response?.data) === "1") {
        updateForm({ brandCode: "" });
        return useSwalErrorAlert(
          "Duplicate Code",
          `Brand Code ${brandCode} is already in use.`
        );
      }
    } catch (error) {
      console.error("Brand duplicate check failed", error);
    }
  };

  const handleSave = async () => {
    if (!isEditing || isLoadingAction) return;

    const brandCode = String(formData.brandCode || "").trim().toUpperCase();
    const brandName = String(formData.brandName || "").trim();

    if (!brandCode || !brandName) {
      return useSwalValidationAlert({
        icon: "warning",
        title: "Required Fields",
        message: "Brand Code and Brand Name are required.",
      });
    }

    setIsLoadingAction(true);

    try {
      if (!selectedBrandCode) {
        const duplicateResponse = await apiClient.post(BRAND_CHECK_DUPLICATE_ENDPOINT, {
          json_data: { brandCode },
        });

        if (parseResultFlag(duplicateResponse?.data) === "1") {
          return useSwalErrorAlert(
            "Duplicate Code",
            `Brand Code ${brandCode} is already in use.`
          );
        }
      }

      const response = await apiClient.post(BRAND_UPSERT_ENDPOINT, {
        json_data: {
          brandCode,
          brandName,
          active: formData.active || "Y",
          userCode: user?.USER_CODE || user?.userCode || "ADMIN",
        },
      });

      const errorCount = Number(response?.data?.errorcount ?? 0);
      const errorMessage = response?.data?.errormsg || "";

      if (errorCount > 0) {
        return useSwalErrorAlert(
          "Validation Failed",
          errorMessage || "Unable to save Brand."
        );
      }

      await refreshRows();
      resetForm();
      return useSwalSuccessAlert("Success!", "Brand saved successfully.");
    } catch (error) {
      return useSwalErrorAlertAPI("Save Failed", error);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleDelete = async (row) => {
    const brandCode = String(row?.brandCode || "").trim();
    if (!brandCode || isLoadingAction) return;

    setIsLoadingAction(true);

    try {
      const inUsedResponse = await apiClient.post(BRAND_CHECK_IN_USED_ENDPOINT, {
        json_data: { brandCode },
      });

      if (inUsedResponse?.data?.isInUsed || parseResultFlag(inUsedResponse?.data) === "1") {
        return useSwalErrorAlert(
          "Cannot Delete",
          `Brand ${brandCode} is currently in use.`
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Brand: ${brandCode}?`
      );

      if (!confirm?.isConfirmed) return;

      await apiClient.post(BRAND_DELETE_ENDPOINT, {
        json_data: {
          brandCode,
          userCode: user?.USER_CODE || user?.userCode || "ADMIN",
        },
      });

      await refreshRows();
      resetForm();
      return useSwalDeleteRecord("Deleted!", "Brand removed successfully.");
    } catch (error) {
      return useSwalErrorAlertAPI("Delete Failed", error);
    } finally {
      setIsLoadingAction(false);
      closeMobileActionSheet();
    }
  };

  const openMobileActionSheet = (row) => {
    setSelectedMobileRow(row);
    setIsMobileActionSheetMounted(true);
    requestAnimationFrame(() => setIsMobileActionSheetOpen(true));
  };

  const closeMobileActionSheet = () => {
    setIsMobileActionSheetOpen(false);
    setTimeout(() => {
      setIsMobileActionSheetMounted(false);
      setSelectedMobileRow(null);
    }, 300);
  };

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 100,
        render: (row) => (
          <div className="flex w-full justify-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                isMobile ? openMobileActionSheet(row) : handleEdit(row);
              }}
              className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-2 text-xs text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white md:flex-none"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                isMobile ? openMobileActionSheet(row) : handleDelete(row);
              }}
              className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-red-100 bg-red-50 px-2 py-2 text-xs text-red-600 transition-colors hover:bg-red-600 hover:text-white md:flex-none"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      {
        key: "brandCode",
        label: "Brand Code",
        sortable: true,
        width: 140,
        requiredVisible: true,
      },
      {
        key: "brandName",
        label: "Brand Name",
        sortable: true,
        width: 320,
        requiredVisible: true,
      },
    ],
    [isMobile]
  );

  return (
    <div className="global-ref-main-div-ui">
      {isBusy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-blue-100 dark:border-gray-700" />
              <div className="absolute left-0 top-0 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
            <span className="animate-pulse text-sm font-semibold">
              {isLoadingAction ? "Processing..." : "Loading..."}
            </span>
          </div>
        </div>
      )}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="flex w-full md:w-auto md:justify-start">
            <h1 className="global-ref-headertext-ui w-full truncate text-center md:w-auto md:text-left">
              Item/Brand Matrix
            </h1>
          </div>

          <div className="flex w-full justify-center">
            <div className="flex flex-nowrap overflow-x-auto border-b border-blue-300 dark:border-gray-700">
              {[
                { id: "brand", label: "Brand Master Data" },
                { id: "matrix", label: "Item/Brand Matrix" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 whitespace-nowrap rounded-md border-b-2 px-3 py-1 text-[10px] font-bold transition-all sm:px-4 sm:py-2 sm:text-[13px] ${
                    activeTab === tab.id
                      ? "border-blue-700 bg-blue-50/50 text-blue-700"
                      : "border-transparent text-gray-500 hover:text-blue-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full justify-center md:w-auto md:justify-end">
            {activeTab === "brand" && (
              <ButtonBar
                buttons={[
                  {
                    key: "add",
                    label: <span className="ml-1 sm:inline">Add</span>,
                    icon: faPlus,
                    onClick: () => {
                      resetForm();
                      setIsEditing(true);
                    },
                    className:
                      "flex h-7 w-16 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 sm:h-8 sm:w-auto sm:px-4",
                  },
                  {
                    key: "save",
                    label: <span className="ml-1 sm:inline">Save</span>,
                    icon: faSave,
                    onClick: handleSave,
                    disabled: !isEditing || isLoadingAction,
                    className: `flex h-7 w-16 items-center justify-center rounded-md text-[11px] font-medium transition-all sm:h-8 sm:w-auto sm:px-4 ${
                      !isEditing || isLoadingAction
                        ? "cursor-not-allowed bg-blue-500 text-white opacity-50"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`,
                  },
                  {
                    key: "reset",
                    label: <span className="ml-1 sm:inline">Reset</span>,
                    icon: faUndo,
                    onClick: resetForm,
                    className:
                      "flex h-7 w-16 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 sm:h-8 sm:w-auto sm:px-4",
                  },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      {activeTab === "brand" && (
        <div
          ref={formTopRef}
          className="mt-24 flex h-auto flex-col items-stretch gap-4 px-4 xl:flex-row"
        >
          <div className="flex h-fit w-full shrink-0 flex-col gap-4 xl:w-[400px]">
            <div className="flex flex-col justify-center rounded-xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-6 border-b pb-2 text-sm font-bold uppercase tracking-wider text-blue-600">
                Entry Details
              </h2>

              <div className="space-y-6">
                <FieldRenderer
                  label="Brand Code"
                  required
                  type="text"
                  value={formData.brandCode}
                  disabled={!isEditing || !!selectedBrandCode}
                  onChange={(value) =>
                    updateForm({ brandCode: String(value || "").toUpperCase() })
                  }
                  onBlur={(event) => handleCheckDuplicate(event.target.value)}
                  maxLength={50}
                />

                <FieldRenderer
                  label="Brand Name"
                  required
                  type="text"
                  value={formData.brandName}
                  disabled={!isEditing}
                  onChange={(value) => updateForm({ brandName: value || "" })}
                  maxLength={250}
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <RegistrationInfo layout="stacked" data={registrationInfo} />
            </div>
          </div>

          <div className="global-tran-table-main-div-ui mt-0 flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 xl:self-stretch">
            <SearchGlobalReferenceTable
              docType={DOC_TYPE}
              columns={columns}
              data={rows}
              isLoading={brandQuery.isLoading}
              isFetching={brandQuery.isFetching}
              onRowClick={handleEdit}
              onRowDoubleClick={handleEdit}
              itemsPerPage={50}
              autoFillGrid={true}
              showFilters
              showGlobalSearch
              showGroupBy={false}
              showPagination={false}
              onMobileRowOpen={openMobileActionSheet}
              onRefresh={refreshRows}
            />
          </div>
        </div>
      )}

      {activeTab === "matrix" && <ItemBrandMatrix embedded />}

      {activeTab === "brand" && isMobileActionSheetMounted && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              isMobileActionSheetOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMobileActionSheet}
            role="presentation"
          />

          <div
            className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4 shadow-2xl transition-transform duration-300 ease-out ${
              isMobileActionSheetOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />

            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-800">Brand Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.brandCode}
                {selectedMobileRow?.brandName
                  ? ` - ${selectedMobileRow.brandName}`
                  : ""}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleEdit(selectedMobileRow)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 py-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
              >
                <FontAwesomeIcon icon={faEdit} />
                Edit
              </button>

              <button
                type="button"
                onClick={() => handleDelete(selectedMobileRow)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
                Delete
              </button>

              <button
                type="button"
                onClick={closeMobileActionSheet}
                className="w-full rounded-lg bg-gray-100 py-3 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
