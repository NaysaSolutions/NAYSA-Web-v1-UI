// src/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VETypeCodes.jsx

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSwalDeleteConfirm, useSwalErrorAlert, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";


// card design for the form and table sections
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

// pang get ng rows from the API
const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) {
    return [];
  }
  if (Array.isArray(res)) {
    return res;
  }
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
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
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

const VETypeCodes = forwardRef((
  {
    onStateChange,
    isReadOnly = false,
    canAdd = true,
    canEdit = true,
    canSave = true,
    canDelete = true,
  }, ref
) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userCode = user?.USER_CODE || user?.userCode || user?.code || "ADMIN";
    const codeInputRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [selectedRow, setSelectedRow] = useState(null);
    const [isDupCode, setIsDupCode] = useState(false);
    
    //forms
    const setField = useCallback(
      (key, value) => {
        setForm((prev) => ({
          ...prev,
          [key]: value,
        }));
      },
      []
    );
    const resetForm = useCallback((next = DEFAULT_FORM) => {setForm(next);},[]);
    const showReadOnlyAlert = useCallback(
      async (action) => {
        await useSwalErrorAlert(
          "Read Only",
          `You are not allowed to ${action}.`
        );
      },
      []
    );

    // LOAD      
    // GET /veType
    const typeListQuery = useQuery({
      queryKey: ["veTypeCodesList"],
      queryFn: async () => {
        const response =
          await apiClient.get("/veType");
        return extractRows(response).map(
          normalizeRecord
        );
      },
    });

    const types = useMemo(
      () => typeListQuery.data || [],
      [typeListQuery.data]
    );

    const isInitialLoading = typeListQuery.isLoading;

    // SAVE MUTATION
    // POST /upsertVEType
    const saveMutation = useMutation({
      mutationFn: async (payload) => {
        return apiClient.post(
          "/upsertVEType",
          {
            json_data: JSON.stringify({
              json_data: {
                code: payload.code,
                description: payload.description,
                userCode: payload.userCode,
              },
            }),
          }
        );
      },
      onSuccess: async (response) => {
        const row = response?.data?.data?.[0] || response?.data || {};
        const errorcount =
          Number(
            row?.errorcount ?? response?.data?.errorcount ?? 0
          );
        const errormsg =
          String(
            row?.errormsg ?? response?.data?.errormsg ?? response?.data?.message ?? ""
          );

        if (
          response?.data?.success === false || response?.data?.oks === false || errorcount > 0
        ) {
          await useSwalErrorAlert(
            "Validation Error", errormsg || "Failed to save Vehicle Type Code."
          );
          return;
        }
        await queryClient.invalidateQueries({
          queryKey: ["veTypeCodesList"],
        });
        await useSwalSuccessAlert(
          "Success!",
          "Vehicle Type Code saved successfully."
        );
        setIsEditing(false);
        setSelectedRow(null);
        setIsDupCode(false);
        resetForm(DEFAULT_FORM);
      },
      onError: async (error) => {
        const msg =
          error?.response?.data?.message || error?.response?.data?.errormsg || error?.message || "Failed to save Vehicle Type Code.";
        await useSwalErrorAlert(
          "Error",
          msg
        );
      },
    });

    //  DELETE MUTATION
    //  POST /deleteVEType
    const deleteMutation = useMutation({
      mutationFn: async (payload) => {
        return apiClient.post(
          "/deleteVEType",
          {
            json_data: {
              code: payload.code,
              userCode: payload.userCode,
            },
          }
        );
      },


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
            errormsg ||
              "Failed to delete Vehicle Type Code."
          );
          return;
        }

        await queryClient.invalidateQueries({
          queryKey: ["veTypeCodesList"],
        });

        await useSwalSuccessAlert(
          "Deleted!",
          "Vehicle Type Code deleted successfully."
        );
        resetForm(DEFAULT_FORM);
        setSelectedRow(null);
        setIsEditing(false);
        setIsDupCode(false);
      },

      onError: async (error) => {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.errormsg ||
          error?.message ||
          "Failed to delete Vehicle Type Code.";

        await useSwalErrorAlert(
          "Delete Error",
          msg
        );
      },
    });

    // CHECK DUPLICATE
    // POST /checkDuplicateVEType
    const checkDuplicate = useCallback(
      async (code) => {
        const normalizedCode = String(code || "").trim().toUpperCase();
        if (!normalizedCode) {
          return false;
        }
        try {
          const response =
            await apiClient.post(
              "/checkDuplicateVEType",
              {
                json_data: {code: normalizedCode},
              }
            );
          const result =
            response?.data?.data?.[0] ?.result ??
            response?.data?.result ?? "0";
          return (
            String(result).trim() === "1"
          );
        } catch (error) {
          console.error(
            "VE Type duplicate check failed:",
            error
          );
          return false;
        }
      },[]
    );

    // FOR VALIDATION
    const handleCodeValidate = useCallback(
      async (eventOrValue) => {
        if (
          isReadOnly ||
          !isEditing ||
          form.__existing
        ) {
          return;
        }
        const value =
          typeof eventOrValue === "string" ? eventOrValue : eventOrValue?.target?.value ?? form.code;

        const code =
          String(value || "") .trim() .toUpperCase();

        if (!code) {
          setIsDupCode(false);
          return;
        }

        const duplicate = await checkDuplicate(code);
        setIsDupCode(duplicate);

        if (duplicate) {
          await useSwalErrorAlert(
            "Duplicate Entry",
            `Vehicle Type Code "${code}" already exists.`
          );
        }
      },
      [
        checkDuplicate,
        form.code,
        form.__existing,
        isEditing,
        isReadOnly,
      ]
    );

    // SAVE HANDLER
    const handleSave = useCallback(
      async () => {
        if (isReadOnly || !canSave) {
          await showReadOnlyAlert(
            "save vehicle type codes"
          );
          return;
        }
        if (
          !isEditing || saveMutation.isPending
        ) {
          return;
        }
        const payload = {
          code: String(form.code || "") .trim().toUpperCase(),
          description: String(form.description || "").trim(),
          userCode,
        };
        
        /* REQUIRED FIELD VALIDATION */
        const missing = [];
        if (!payload.code) {
          missing.push("Type Code");
        }

        if (!payload.description) {
          missing.push(
            "Type Description"
          );
        }

        if (missing.length) {
          await useSwalErrorAlert(
            "Validation Error",
            `Please fill in the required field(s): • ${missing.join("\n• ")}`
          );
          return;
        }

        /* DUPLICATE CHECK */
        if (!form.__existing) {
          const duplicate =
            await checkDuplicate(
              payload.code
            );

          if (duplicate) {
            setIsDupCode(true);

            await useSwalErrorAlert(
              "Duplicate Entry",
              `Vehicle Type Code "${payload.code}" already exists.`
            );
            return;
          }
        }
        saveMutation.mutate(payload);
      },
      [
        canSave,
        checkDuplicate,
        form,
        isEditing,
        isReadOnly,
        saveMutation,
        showReadOnlyAlert,
        userCode,
      ]
    );

    const fillFormFromRow = useCallback(
      (row) => {
        if (!row) {
          return;
        }
        setForm({
          ...normalizeRecord(row),
          __existing: true,
        });
        setSelectedRow(row);
        setIsDupCode(false);
      },
      []
    );

    // FOR RETREIVE
    const handleRetrieve = useCallback(
      (row) => {
        fillFormFromRow(row);
        setIsEditing(false);
      }, [fillFormFromRow]
    );

    // EDIT
    const handleEdit = useCallback(
      async (row) => {
        if (isReadOnly || !canEdit) {
          await showReadOnlyAlert(
            "edit vehicle type codes"
          );
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

    // FOR DOUBLE CLICK 
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
          await showReadOnlyAlert(
            "delete vehicle type codes"
          );

          return;
        }
        if (
          !row?.code ||
          deleteMutation.isPending
        ) {
          return;
        }
        const confirmed =
          await useSwalDeleteConfirm(
            "Delete Vehicle Type Code?",
            `Are you sure you want to delete "${row.code}"?`
          );

        if (!confirmed) {
          return;
        }
        deleteMutation.mutate({
          code: row.code,
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


    
    // FOR COLUMNS
    const tableColumns = useMemo(
      () => [
        {
          key: "__actions",
          label: (
            <span className="hidden md:inline">
              Actions
            </span>
          ), width: 90,
          render: (row) => (
            <div className="flex gap-2 justify-center w-full">

              {/* EDIT BUTTON */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(row);
                }}
                disabled={
                  isReadOnly || !canEdit
                }
                className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
                  isReadOnly || !canEdit
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                }`}
                title={
                  isReadOnly || !canEdit
                    ? "Read only"
                    : "Edit"
                }
              >
                <FontAwesomeIcon
                  icon={faEdit}
                />
                <span className="md:hidden">
                  Edit
                </span>
              </button>

              {/* DELETE BUTTON */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row);
                }}
                disabled={
                  isReadOnly || !canDelete
                }
                className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
                  isReadOnly || !canDelete
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                }`}
                title={
                  isReadOnly || !canDelete
                    ? "Read only"
                    : "Delete"
                }
              >
                <FontAwesomeIcon
                  icon={faTrashAlt}
                />
                <span className="md:hidden">
                  Delete
                </span>
              </button>
            </div>
          ),
        },


        {
          key: "code",
          label: "Type Code",
          sortable: true,
          width: 140,
        },


        {
          key: "description",
          label: "Type Description",
          sortable: true,
          width: 320,
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


    // FOR TABLE
    const tableData = useMemo(
      () =>
        Array.isArray(types)
          ? types.map((row, index) => ({
              ...row,
              ...normalizeRecord(row),
              __idx: index,
            }))
          : [],
      [types]
    );
    
    // parent state 
    // whether save should enabled or nope
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

    // add, save, reset
    useImperativeHandle(
      ref,
      () => ({
        add: async () => {
          if (isReadOnly || !canAdd) {
            await showReadOnlyAlert(
              "add vehicle type codes"
            );

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
            codeInputRef.current?.focus?.();
          }, 0);
        },
        save: handleSave,
        reset: () => {
          resetForm(DEFAULT_FORM);

          setIsEditing(false);

          setSelectedRow(null);

          setIsDupCode(false);
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

    // FOR LOADING
    const isLoading =
      isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

  
    // UI
    return (
      <div className="flex flex-col h-full gap-3 w-full relative">
        {isLoading && <LoadingSpinner />}

        {/* =================================================
            BASIC INFORMATION
            ================================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 shrink-0">
          <Card className="p-4 flex flex-col">
            <SectionHeader title="BASIC INFORMATION"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* TYPE CODE */}
              <FieldRenderer label="Type Code" required value={form.code} inputRef={codeInputRef}

                onChange={(v) => {
                  setField(
                    "code", String(v ?? "") .toUpperCase()
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
                  isReadOnly || !isEditing || form.__existing
                }
              />

              {/* TYPE DESCRIPTION */}
              <FieldRenderer label="Type Description" required value={form.description}
                onChange={(v) =>
                  setField(
                    "description",
                    v ?? ""
                  )
                }
                disabled={
                  isReadOnly ||
                  !isEditing
                }
              />
            </div>
          </Card>

          {/* REGISTRATION INFORMATION */}
          <RegistrationInfo
            data={form}
            layout="stacked"
          />
        </div>
    
        {/* TABLE */}
        <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
          <SearchGlobalReferenceTable columns={tableColumns}
            data={tableData} isLoading={isInitialLoading} docType="VE Type Codes"
            itemsPerPage={50} onRowDoubleClick={ handleRowDoubleClick }
            onRowClick={(row) =>
              setSelectedRow(row)
            }
            showFilters
            autoFillGrid
          />
        </div>
      </div>
    );
  }
);
VETypeCodes.displayName = "VETypeCodes";
export default VETypeCodes;
