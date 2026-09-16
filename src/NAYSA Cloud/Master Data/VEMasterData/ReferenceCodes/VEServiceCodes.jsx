// src/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VEServiceCodes.jsx

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
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import SearchBillCodeRef from "@/NAYSA Cloud/Lookup/SearchBillCodeRef.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

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

const getValue = (input) => {
  if (input && typeof input === "object") {
    if ("target" in input) return input.target?.value ?? "";
    if ("value" in input) return input.value ?? "";
  }

  return input ?? "";
};

const DEFAULT_FORM = {
  serviceCode: "",
  serviceDescription: "",
  billCode: "",
  billName: "",
  active: "Y",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const normalizeRecord = (row = {}) => ({
  serviceCode:
    row.serviceCode ??
    row.service_code ??
    row.SERVICE_CODE ??
    row.code ??
    "",

  serviceDescription:
    row.serviceDescription ??
    row.service_description ??
    row.SERVICE_DESCRIPTION ??
    row.description ??
    "",

  billCode:
    row.billCode ??
    row.bill_code ??
    row.BILL_CODE ??
    "",

  billName:
    row.billName ??
    row.bill_name ??
    row.BILL_NAME ??
    row.billDescription ??
    row.bill_description ??
    "",

  active:
    row.active ??
    row.ACTIVE ??
    row.IS_ACTIVE ??
    "Y",

  registeredBy:
    row.registeredBy ??
    row.registered_by ??
    row.REGISTERED_BY ??
    "",

  registeredDate:
    row.registeredDate ??
    row.registered_date ??
    row.REGISTERED_DATE ??
    "",

  lastUpdatedBy:
    row.lastUpdatedBy ??
    row.updatedBy ??
    row.updated_by ??
    row.UPDATED_BY ??
    "",

  lastUpdatedDate:
    row.lastUpdatedDate ??
    row.updatedDate ??
    row.updated_date ??
    row.UPDATED_DATE ??
    "",

  __existing: Boolean(row.__existing),
});

const VEServiceCodes = forwardRef(
  (
    {
      onStateChange,
      isReadOnly = false,
      canAdd = true,
      canEdit = true,
      canSave = true,
      canDelete = true,
    },
    ref
  ) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const userCode =
      user?.USER_CODE ||
      user?.userCode ||
      user?.code ||
      "ADMIN";

    const serviceCodeInputRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [selectedRow, setSelectedRow] = useState(null);
    const [isDupCode, setIsDupCode] = useState(false);
    const [isBillCodeOpen, setIsBillCodeOpen] = useState(false);

    const setField = useCallback((key, value) => {
      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    }, []);

    const resetForm = useCallback((next = DEFAULT_FORM) => {
      setForm(next);
    }, []);

    const showReadOnlyAlert = useCallback(async (action) => {
      await useSwalErrorAlert(
        "Read Only",
        `You are not allowed to ${action}.`
      );
    }, []);

    const serviceCodeListQuery = useQuery({
      queryKey: ["veServiceCodeList"],
      queryFn: async () => {
        const response = await apiClient.get("/veServiceCode");
        return extractRows(response).map(normalizeRecord);
      },
    });

    const serviceCodes = useMemo(
      () => serviceCodeListQuery.data || [],
      [serviceCodeListQuery.data]
    );

    const isInitialLoading = serviceCodeListQuery.isLoading;

    const saveMutation = useMutation({
      mutationFn: async (payload) =>
        apiClient.post("/upsertVEServiceCode", {
          json_data: JSON.stringify({
            json_data: {
              serviceCode: payload.serviceCode,
              serviceDescription: payload.serviceDescription,
              billCode: payload.billCode,
              active: payload.active,
              userCode: payload.userCode,
            },
          }),
        }),

      onSuccess: async (response) => {
        const row =
          response?.data?.data?.[0] ||
          response?.data ||
          {};

        const errorcount = Number(
          row?.errorcount ??
          response?.data?.errorcount ??
          0
        );

        const errormsg = String(
          row?.errormsg ??
          response?.data?.errormsg ??
          response?.data?.message ??
          ""
        );

        if (
          response?.data?.success === false ||
          response?.data?.oks === false ||
          errorcount > 0
        ) {
          await useSwalErrorAlert(
            "Validation Error",
            errormsg || "Failed to save Vehicle Service Code."
          );
          return;
        }

        await queryClient.invalidateQueries({
          queryKey: ["veServiceCodeList"],
        });

        await useSwalSuccessAlert(
          "Success!",
          "Vehicle Service Code saved successfully."
        );

        setIsEditing(false);
        setSelectedRow(null);
        setIsDupCode(false);
        resetForm(DEFAULT_FORM);
      },

      onError: async (error) => {
        await useSwalErrorAlert(
          "Error",
          error?.response?.data?.message ||
          error?.response?.data?.errormsg ||
          error?.message ||
          "Failed to save Vehicle Service Code."
        );
      },
    });

    const deleteMutation = useMutation({
      mutationFn: async (payload) =>
        apiClient.post("/deleteVEServiceCode", {
          json_data: {
            serviceCode: payload.serviceCode,
            userCode: payload.userCode,
          },
        }),

      onSuccess: async (response) => {
        const row =
          response?.data?.data?.[0] ||
          response?.data ||
          {};

        const errorcount = Number(
          row?.errorcount ??
          response?.data?.errorcount ??
          0
        );

        const errormsg = String(
          row?.errormsg ??
          response?.data?.errormsg ??
          response?.data?.message ??
          ""
        );

        if (
          response?.data?.success === false ||
          errorcount > 0
        ) {
          await useSwalErrorAlert(
            "Delete Error",
            errormsg || "Failed to delete Vehicle Service Code."
          );
          return;
        }

        await queryClient.invalidateQueries({
          queryKey: ["veServiceCodeList"],
        });

        await useSwalSuccessAlert(
          "Deleted!",
          "Vehicle Service Code deleted successfully."
        );

        resetForm(DEFAULT_FORM);
        setSelectedRow(null);
        setIsEditing(false);
        setIsDupCode(false);
      },

      onError: async (error) => {
        await useSwalErrorAlert(
          "Delete Error",
          error?.response?.data?.message ||
          error?.response?.data?.errormsg ||
          error?.message ||
          "Failed to delete Vehicle Service Code."
        );
      },
    });

    const checkDuplicate = useCallback(async (serviceCode) => {
      const code = String(serviceCode || "")
        .trim()
        .toUpperCase();

      if (!code) return false;

      try {
        const response = await apiClient.post(
          "/checkDuplicateVEServiceCode",
          {
            json_data: {
              serviceCode: code,
            },
          }
        );

        const result =
          response?.data?.data?.[0]?.result ??
          response?.data?.result ??
          "0";

        return String(result).trim() === "1";
      } catch (error) {
        console.error(
          "Vehicle Service Code duplicate check failed:",
          error
        );
        return false;
      }
    }, []);

    const handleCodeValidate = useCallback(
      async (eventOrValue) => {
        if (isReadOnly || !isEditing || form.__existing) {
          return;
        }

        const value =
          typeof eventOrValue === "string"
            ? eventOrValue
            : eventOrValue?.target?.value ?? form.serviceCode;

        const code = String(value || "")
          .trim()
          .toUpperCase();

        if (!code) {
          setIsDupCode(false);
          return;
        }

        const duplicate = await checkDuplicate(code);
        setIsDupCode(duplicate);

        if (duplicate) {
          await useSwalErrorAlert(
            "Duplicate Entry",
            `Vehicle Service Code "${code}" already exists.`
          );
        }
      },
      [
        checkDuplicate,
        form.serviceCode,
        form.__existing,
        isEditing,
        isReadOnly,
      ]
    );

    const handleSave = useCallback(async () => {
      if (isReadOnly || !canSave) {
        await showReadOnlyAlert("save vehicle service codes");
        return;
      }

      if (!isEditing || saveMutation.isPending) {
        return;
      }

      const payload = {
        serviceCode: String(form.serviceCode || "")
          .trim()
          .toUpperCase(),

        serviceDescription: String(form.serviceDescription || "")
          .trim(),

        billCode: String(form.billCode || "")
          .trim()
          .toUpperCase(),

        active: String(getValue(form.active) || "Y")
          .trim()
          .toUpperCase(),

        userCode,
      };

      const missing = [];

      if (!payload.serviceCode) {
        missing.push("Service Code");
      }

      if (!payload.serviceDescription) {
        missing.push("Service Description");
      }

      if (!payload.billCode) {
        missing.push("Bill Code");
      }

      if (missing.length) {
        await useSwalErrorAlert(
          "Validation Error",
          `Please fill in the required field(s):\n- ${missing.join("\n- ")}`
        );
        return;
      }

      if (!["Y", "N"].includes(payload.active)) {
        await useSwalErrorAlert(
          "Validation Error",
          "Active must be Yes or No."
        );
        return;
      }

      if (!form.__existing) {
        const duplicate = await checkDuplicate(payload.serviceCode);

        if (duplicate) {
          setIsDupCode(true);

          await useSwalErrorAlert(
            "Duplicate Entry",
            `Vehicle Service Code "${payload.serviceCode}" already exists.`
          );
          return;
        }
      }

      saveMutation.mutate(payload);
    }, [
      canSave,
      checkDuplicate,
      form,
      isEditing,
      isReadOnly,
      saveMutation,
      showReadOnlyAlert,
      userCode,
    ]);

    const fillFormFromRow = useCallback((row) => {
      if (!row) return;

      setForm({
        ...DEFAULT_FORM,
        ...normalizeRecord(row),
        __existing: true,
      });

      setSelectedRow(row);
      setIsDupCode(false);
    }, []);

    const handleRetrieve = useCallback(
      (row) => {
        fillFormFromRow(row);
        setIsEditing(false);
      },
      [fillFormFromRow]
    );

    const handleEdit = useCallback(
      async (row) => {
        if (isReadOnly || !canEdit) {
          await showReadOnlyAlert("edit vehicle service codes");
          return;
        }

        fillFormFromRow(row);
        setIsEditing(true);
      },
      [
        canEdit,
        fillFormFromRow,
        isReadOnly,
        showReadOnlyAlert,
      ]
    );

    const handleRowDoubleClick = useCallback(
      (row) => {
        if (isReadOnly || !canEdit) {
          handleRetrieve(row);
          return;
        }

        fillFormFromRow(row);
        setIsEditing(true);
      },
      [
        canEdit,
        fillFormFromRow,
        handleRetrieve,
        isReadOnly,
      ]
    );

    const handleDelete = useCallback(
      async (row) => {
        if (isReadOnly || !canDelete) {
          await showReadOnlyAlert("delete vehicle service codes");
          return;
        }

        if (!row?.serviceCode || deleteMutation.isPending) {
          return;
        }

        const confirmed = await useSwalDeleteConfirm(
          "Delete Vehicle Service Code?",
          `Are you sure you want to delete "${row.serviceCode}"?`
        );

        if (!confirmed?.isConfirmed) return;

        deleteMutation.mutate({
          serviceCode: row.serviceCode,
          userCode,
        });
      },
      [
        canDelete,
        deleteMutation,
        isReadOnly,
        showReadOnlyAlert,
        userCode,
      ]
    );

    const tableColumns = useMemo(
      () => [
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
                className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
                  isReadOnly || !canEdit
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
                }`}
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
                className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
                  isReadOnly || !canDelete
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={faTrashAlt} />
                <span className="md:hidden">Delete</span>
              </button>
            </div>
          ),
        },

        {
          key: "serviceCode",
          label: "Service Code",
          sortable: true,
          width: 160,
        },

        {
          key: "serviceDescription",
          label: "Service Description",
          sortable: true,
          width: 300,
        },

        {
          key: "billCode",
          label: "Bill Code",
          sortable: true,
          width: 140,
        },

        {
          key: "billName",
          label: "Bill Description",
          sortable: true,
          width: 250,
        },

        {
          key: "active",
          label: "Active",
          width: 100,
          render: (row) =>
            String(row.active || "").toUpperCase() === "Y"
              ? "Yes"
              : "No",
        },
      ],
      [
        canDelete,
        canEdit,
        handleDelete,
        handleEdit,
        isReadOnly,
      ]
    );

    const tableData = useMemo(
      () =>
        Array.isArray(serviceCodes)
          ? serviceCodes.map((row, index) => ({
              ...row,
              ...normalizeRecord(row),
              __idx: index,
            }))
          : [],
      [serviceCodes]
    );

    useEffect(() => {
      onStateChange?.({
        isEditing,
        canSave:
          !isReadOnly &&
          canSave &&
          isEditing &&
          !isDupCode &&
          !saveMutation.isPending,
      });
    }, [
      canSave,
      isDupCode,
      isEditing,
      isReadOnly,
      onStateChange,
      saveMutation.isPending,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        add: async () => {
          if (isReadOnly || !canAdd) {
            await showReadOnlyAlert("add vehicle service codes");
            return;
          }

          setIsEditing(true);
          setSelectedRow(null);
          setIsDupCode(false);

          resetForm({
            ...DEFAULT_FORM,
            __existing: false,
          });

          setTimeout(() => {
            serviceCodeInputRef.current?.focus?.();
          }, 0);
        },

        save: handleSave,

        reset: () => {
          resetForm(DEFAULT_FORM);
          setIsEditing(false);
          setSelectedRow(null);
          setIsDupCode(false);
          setIsBillCodeOpen(false);
        },
      }),
      [
        canAdd,
        handleSave,
        isReadOnly,
        resetForm,
        showReadOnlyAlert,
      ]
    );

    const isLoading =
      isInitialLoading ||
      saveMutation.isPending ||
      deleteMutation.isPending;

    return (
      <>
        <div className="flex flex-col h-full gap-3 w-full relative">
          {isLoading && <LoadingSpinner />}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 shrink-0">
            <Card className="p-4 flex flex-col">
              <SectionHeader title="BASIC INFORMATION" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldRenderer
                  label="Service Code"
                  required
                  value={form.serviceCode}
                  inputRef={serviceCodeInputRef}
                  onChange={(v) => {
                    setField(
                      "serviceCode",
                      String(getValue(v) ?? "").toUpperCase()
                    );
                    setIsDupCode(false);
                  }}
                  onBlur={handleCodeValidate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCodeValidate(e);
                    }
                  }}
                  disabled={
                    isReadOnly ||
                    !isEditing ||
                    form.__existing
                  }
                />

                <FieldRenderer
                  label="Service Description"
                  required
                  value={form.serviceDescription}
                  onChange={(v) =>
                    setField(
                      "serviceDescription",
                      getValue(v)
                    )
                  }
                  disabled={
                    isReadOnly ||
                    !isEditing
                  }
                />

                <FieldRenderer
                  label="Bill Code"
                  required
                  type="lookup"
                  value={
                    form.billCode
                      ? `${form.billCode}${
                          form.billName
                            ? ` - ${form.billName}`
                            : ""
                        }`
                      : ""
                  }
                  onChange={(v) => {
                    const value = String(
                      getValue(v) ?? ""
                    )
                      .trim()
                      .toUpperCase();

                    setForm((prev) => ({
                      ...prev,
                      billCode: value,
                      billName:
                        value === prev.billCode
                          ? prev.billName
                          : "",
                    }));
                  }}
                  onLookup={() => {
                    if (!isReadOnly && isEditing) {
                      setIsBillCodeOpen(true);
                    }
                  }}
                  disabled={
                    isReadOnly ||
                    !isEditing
                  }
                />

                <FieldRenderer
                  label="Active"
                  type="select"
                  value={form.active}
                  disabled={
                    isReadOnly ||
                    !isEditing
                  }
                  options={[
                    {
                      value: "Y",
                      label: "Yes",
                    },
                    {
                      value: "N",
                      label: "No",
                    },
                  ]}
                  onChange={(v) =>
                    setField(
                      "active",
                      String(getValue(v) || "Y").toUpperCase()
                    )
                  }
                />
              </div>
            </Card>

            <RegistrationInfo
              data={form}
              layout="stacked"
            />
          </div>

          <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
            <SearchGlobalReferenceTable
              columns={tableColumns}
              data={tableData}
              isLoading={isInitialLoading}
              docType="VE Service Codes"
              itemsPerPage={50}
              onRowDoubleClick={handleRowDoubleClick}
              onRowClick={(row) => setSelectedRow(row)}
              showFilters
              autoFillGrid
            />
          </div>
        </div>

        <SearchBillCodeRef
          isOpen={isBillCodeOpen}
          onClose={(selected) => {
            setIsBillCodeOpen(false);

            if (!selected) {
              return;
            }

            setForm((prev) => ({
              ...prev,
              billCode: String(
                selected.billCode ??
                selected.code ??
                ""
              )
                .trim()
                .toUpperCase(),

              billName: String(
                selected.billName ??
                selected.description ??
                ""
              ).trim(),
            }));
          }}
        />
      </>
    );
  }
);

VEServiceCodes.displayName = "VEServiceCodes";

export default VEServiceCodes;
