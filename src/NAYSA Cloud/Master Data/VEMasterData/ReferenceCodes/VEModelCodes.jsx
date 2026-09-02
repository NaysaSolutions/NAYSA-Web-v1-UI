import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

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
import SearchVEMakeRef from "@/NAYSA Cloud/Lookup/SearchVEMakeRef.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

/* ============================================================
   UI HELPERS
   ============================================================ */

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white shadow-sm border border-slate-200 rounded-md flex flex-col ${className}`}
  >
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

/* ============================================================
   RESPONSE HELPERS
   ============================================================ */

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

/* ============================================================
   NORMALIZER
   ============================================================ */

const normalizeRecord = (row = {}) => ({
  makeCode:
    row.makeCode ??
    row.make_code ??
    row.MAKE_CODE ??
    "",

  makeName:
    row.makeName ??
    row.make_name ??
    row.MAKE_NAME ??
    "",

  code:
    row.code ??
    row.modelCode ??
    row.model_code ??
    row.MODEL_CODE ??
    "",

  description:
    row.description ??
    row.modelName ??
    row.model_name ??
    row.MODEL_NAME ??
    "",

  active:
    row.active ??
    row.ACTIVE ??
    "Y",

  registeredBy:
    row.registeredBy ??
    row.registered_by ??
    "",

  registeredDate:
    row.registeredDate ??
    row.registered_date ??
    "",

  lastUpdatedBy:
    row.lastUpdatedBy ??
    row.updatedBy ??
    row.updated_by ??
    "",

  lastUpdatedDate:
    row.lastUpdatedDate ??
    row.updatedDate ??
    row.updated_date ??
    "",

  __existing: Boolean(row.__existing),
});

/* ============================================================
   DEFAULT FORM
   ============================================================ */

const DEFAULT_FORM = {
  makeCode: "",
  makeName: "",
  code: "",
  description: "",
  active: "Y",

  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",

  __existing: false,
};

const activeOptions = [
  { value: "Y", label: "Active" },
  { value: "N", label: "Inactive" },
];

/* ============================================================
   COMPONENT
   ============================================================ */

const VEModelCodes = forwardRef(
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

    const codeInputRef = useRef(null);
    const enterValidatedRef = useRef(false);

    const [form, setForm] = useState(DEFAULT_FORM);
    const [selectedRow, setSelectedRow] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDupCode, setIsDupCode] = useState(false);
    const [isMakeLookupOpen, setIsMakeLookupOpen] = useState(false);

    /* ============================================================
       FORM HELPERS
       ============================================================ */

    const setField = useCallback((key, value) => {
      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    }, []);

    const resetForm = useCallback((next = DEFAULT_FORM) => {
      setForm(next);
    }, []);

    const showReadOnlyAlert = useCallback(
      async (action = "perform this action") => {
        await useSwalErrorAlert(
          "Read Only",
          `You are not allowed to ${action}.`
        );
      },
      []
    );

    /* ============================================================
       LOAD MODEL LIST
       ============================================================ */

    const modelListQuery = useQuery({
      queryKey: [
        "veModelList",
        form.makeCode || "",
      ],

      queryFn: async () => {
        const makeCode = String(
          form.makeCode || ""
        ).trim();

        const res = await apiClient.get(
          "/veModel",
          {
            params: {
              makeCode,
            },
          }
        );

        return extractRows(res).map(normalizeRecord);
      },

      /*
       * Do not load any model until the user
       * selects a Vehicle Make.
       */
      enabled: Boolean(
        String(form.makeCode || "").trim()
      ),
    });

    /*
     * Even if React Query has cached data,
     * never display models when no Make is selected.
     */
    const models = useMemo(
      () =>
        form.makeCode
          ? modelListQuery.data || []
          : [],
      [
        form.makeCode,
        modelListQuery.data,
      ]
    );

    const isInitialLoading = modelListQuery.isLoading;

    /* ============================================================
       FILTER TABLE BY SELECTED VEHICLE MAKE
       ============================================================ */

    const filteredModels = useMemo(() => {
      const makeCode = String(form.makeCode || "")
        .trim()
        .toUpperCase();

      if (!makeCode) {
        return [];
      }

      return models.filter(
        (row) =>
          String(row.makeCode || "")
            .trim()
            .toUpperCase() === makeCode
      );
    }, [models, form.makeCode]);

    /* ============================================================
       DUPLICATE CHECK
       ============================================================ */

    const checkDuplicate = useCallback(
      async (makeCode, code) => {
        const make = String(makeCode || "").trim();
        const model = String(code || "").trim();

        if (!make || !model) return false;

        try {
          const res = await apiClient.post(
            "/checkVEModelDuplicate",
            {
              json_data: {
                makeCode: make,
                code: model,
              },
            }
          );

          return getResultFlag(res) === "1";
        } catch {
          return models.some(
            (row) =>
              String(row.makeCode || "")
                .trim()
                .toUpperCase() === make.toUpperCase() &&
              String(row.code || "")
                .trim()
                .toUpperCase() === model.toUpperCase()
          );
        }
      },
      [models]
    );

    const handleCodeValidate = useCallback(
      async (arg) => {
        const isEvent =
          arg &&
          typeof arg === "object" &&
          "type" in arg;

        if (
          isEvent &&
          arg.type === "keydown"
        ) {
          if (arg.key !== "Enter") return;
          enterValidatedRef.current = true;
        }

        if (
          isEvent &&
          arg.type === "blur" &&
          enterValidatedRef.current
        ) {
          enterValidatedRef.current = false;
          return;
        }

        const makeCode = String(form.makeCode || "").trim();
        const code = String(form.code || "").trim();

        if (
          !makeCode ||
          !code ||
          !isEditing ||
          form.__existing
        ) {
          return;
        }

        const duplicate = await checkDuplicate(
          makeCode,
          code
        );

        if (duplicate) {
          setIsDupCode(true);

          await useSwalErrorAlert(
            "Duplicate Entry",
            `Vehicle Model Code "${code}" already exists for Vehicle Make "${makeCode}".`
          );

          setField("code", "");

          setTimeout(() => {
            codeInputRef.current?.focus?.();
          }, 0);
        } else {
          setIsDupCode(false);
        }
      },
      [
        checkDuplicate,
        form.code,
        form.makeCode,
        form.__existing,
        isEditing,
        setField,
      ]
    );

    /* ============================================================
       SAVE
       ============================================================ */

    const saveMutation = useMutation({
      mutationFn: async (payload) => {
        return apiClient.post(
          "/upsertVEModel",
          {
            json_data: JSON.stringify({
              json_data: {
                makeCode: payload.makeCode,
                makeName: payload.makeName,
                code: payload.code,
                description: payload.description,
                active: payload.active,
                userCode: payload.userCode,
              },
            }),
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
            "Validation Error",
            errormsg ||
              "Failed to save Vehicle Model Code."
          );

          return;
        }

        await queryClient.invalidateQueries({
          queryKey: ["veModelList"],
        });

        await useSwalSuccessAlert(
          "Success!",
          "Vehicle Model Code saved successfully."
        );

        setForm((prev) => ({
          ...DEFAULT_FORM,
          makeCode: prev.makeCode,
          makeName: prev.makeName,
          active: "Y",
        }));

        setIsEditing(false);
        setSelectedRow(null);
        setIsDupCode(false);
      },

      onError: async (error) => {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.errormsg ||
          error?.message ||
          "Failed to save Vehicle Model Code.";

        await useSwalErrorAlert(
          "Validation Error",
          msg
        );
      },
    });

    const handleSave = useCallback(async () => {
      if (
        isReadOnly ||
        !canSave
      ) {
        await showReadOnlyAlert(
          "save vehicle model codes"
        );

        return;
      }

      if (
        !isEditing ||
        saveMutation.isPending
      ) {
        return;
      }

      const payload = {
        makeCode: String(form.makeCode || "").trim(),
        makeName: String(form.makeName || "").trim(),
        code: String(form.code || "").trim(),
        description: String(form.description || "").trim(),
        active: String(form.active || "Y").trim().toUpperCase(),
        userCode,
      };

      const missing = [];

      if (!payload.makeCode) {
        missing.push("Vehicle Make");
      }

      if (!payload.code) {
        missing.push("Vehicle Model Code");
      }

      if (!payload.description) {
        missing.push("Description / Name");
      }

      if (missing.length) {
        await useSwalErrorAlert(
          "Validation Error",
          `Please fill in the required field(s):\n• ${missing.join(
            "\n• "
          )}`
        );

        return;
      }

      if (
        !form.__existing &&
        (await checkDuplicate(
          payload.makeCode,
          payload.code
        ))
      ) {
        setIsDupCode(true);

        await useSwalErrorAlert(
          "Duplicate Entry",
          `Vehicle Model Code "${payload.code}" already exists for Vehicle Make "${payload.makeCode}".`
        );

        return;
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

    /* ============================================================
       DELETE
       ============================================================ */

    const deleteMutation = useMutation({
      mutationFn: async (record) => {
        const res = await apiClient.post(
          "/deleteVEModel",
          {
            json_data: {
              makeCode: record.makeCode,
              code: record.code,
              userCode,
            },
          }
        );

        if (res?.data?.success === false) {
          throw new Error(
            res?.data?.errormsg ||
            res?.data?.message ||
            "Failed to delete Vehicle Model Code."
          );
        }

        return res;
      },

      onSuccess: async (_, deletedRecord) => {
        await queryClient.invalidateQueries({
          queryKey: ["veModelList"],
        });

        await useSwalDeleteRecord(
          "Deleted",
          `Vehicle Model Code "${deletedRecord.code}" has been successfully removed.`
        );

        setForm((prev) => ({
          ...DEFAULT_FORM,
          makeCode: prev.makeCode,
          makeName: prev.makeName,
          active: "Y",
        }));

        setIsEditing(false);
        setSelectedRow(null);
        setIsDupCode(false);
      },

      onError: async (error) => {
        await useSwalErrorAlert(
          "Error",
          error?.message ||
            "Failed to delete Vehicle Model Code."
        );
      },
    });

    const handleDelete = useCallback(
      async (row) => {
        if (
          isReadOnly ||
          !canDelete
        ) {
          await showReadOnlyAlert(
            "delete vehicle model codes"
          );

          return;
        }

        const record = normalizeRecord(row);

        const makeCode = String(
          record.makeCode || ""
        ).trim();

        const code = String(
          record.code || ""
        ).trim();

        if (!makeCode || !code) return;

        try {
          const checkRes = await apiClient.post(
            "/checkVEModelInUsed",
            {
              json_data: {
                makeCode,
                code,
              },
            }
          );

          if (
            getResultFlag(checkRes) === "1"
          ) {
            await useSwalErrorAlert(
              "Cannot Delete",
              `Vehicle Model Code "${code}" is currently in use and cannot be deleted.`
            );

            return;
          }
        } catch {
          await useSwalErrorAlert(
            "Error",
            "Failed to check if Vehicle Model Code is in use."
          );

          return;
        }

        const confirm = await useSwalDeleteConfirm(
          "Delete Record?",
          `Are you sure you want to delete Vehicle Model "${code}"?`
        );

        if (!confirm?.isConfirmed) return;

        deleteMutation.mutate({
          makeCode,
          code,
        });
      },
      [
        canDelete,
        deleteMutation,
        isReadOnly,
        showReadOnlyAlert,
      ]
    );

    /* ============================================================
       EDIT / RETRIEVE
       ============================================================ */

    const fillFormFromRow = useCallback((row) => {
      if (!row) return;

      setForm({
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
        if (
          isReadOnly ||
          !canEdit
        ) {
          await showReadOnlyAlert(
            "edit vehicle model codes"
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

    const handleRowDoubleClick = useCallback(
      (row) => {
        if (
          isReadOnly ||
          !canEdit
        ) {
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

    /* ============================================================
       TABLE
       ============================================================ */

    const tableColumns = useMemo(
      () => [
        {
          key: "__actions",
          label: (
            <span className="hidden md:inline">
              Actions
            </span>
          ),
          width: 90,

          render: (row) => (
            <div className="flex gap-2 justify-center w-full">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleEdit(row);
                }}
                disabled={
                  isReadOnly ||
                  !canEdit
                }
                className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
                  isReadOnly ||
                  !canEdit
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                }`}
                title={
                  isReadOnly ||
                  !canEdit
                    ? "Read only"
                    : "Edit"
                }
              >
                <FontAwesomeIcon icon={faEdit} />
                <span className="md:hidden">Edit</span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(row);
                }}
                disabled={
                  isReadOnly ||
                  !canDelete
                }
                className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
                  isReadOnly ||
                  !canDelete
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                }`}
                title={
                  isReadOnly ||
                  !canDelete
                    ? "Read only"
                    : "Delete"
                }
              >
                <FontAwesomeIcon icon={faTrashAlt} />
                <span className="md:hidden">Delete</span>
              </button>
            </div>
          ),
        },

        {
          key: "code",
          label: "Vehicle Model Code",
          sortable: true,
          width: 160,
        },

        {
          key: "description",
          label: "Vehicle Description",
          sortable: true,
          width: 340,
        },

        {
          key: "active",
          label: "Active",
          sortable: true,
          width: 90,
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
        (Array.isArray(filteredModels)
          ? filteredModels
          : []
        ).map((row, index) => ({
          ...row,
          ...normalizeRecord(row),
          __idx: index,
        })),
      [filteredModels]
    );

    /* ============================================================
       EXPOSE STATE TO PARENT
       ============================================================ */

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
          if (
            isReadOnly ||
            !canAdd
          ) {
            await showReadOnlyAlert(
              "add vehicle model codes"
            );

            return;
          }

          /*
           * Keep currently selected Vehicle Make.
           */
          setForm((prev) => ({
            ...DEFAULT_FORM,
            makeCode: prev.makeCode,
            makeName: prev.makeName,
            active: "Y",
            __existing: false,
          }));

          setIsEditing(true);
          setSelectedRow(null);
          setIsDupCode(false);

          /*
           * If no Make selected, open Make lookup first.
           */
          if (!form.makeCode) {
            setIsMakeLookupOpen(true);
            return;
          }

          setTimeout(() => {
            codeInputRef.current?.focus?.();
          }, 0);
        },

        save: handleSave,

        reset: () => {
          /*
           * Reset clears the selected Make.
           * Since the model query requires makeCode,
           * the table becomes blank again.
           */
          setForm({
            ...DEFAULT_FORM,
            active: "Y",
          });

          setIsEditing(false);
          setSelectedRow(null);
          setIsDupCode(false);
          setIsMakeLookupOpen(false);
        },
      }),
      [
        canAdd,
        form.makeCode,
        handleSave,
        isReadOnly,
        showReadOnlyAlert,
      ]
    );

    const isLoading =
      isInitialLoading ||
      saveMutation.isPending ||
      deleteMutation.isPending;

    /* ============================================================
       RENDER
       ============================================================ */

    return (
      <div className="flex flex-col h-full gap-3 w-full relative">
        {isLoading && <LoadingSpinner />}

        {/* TOP FORM */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 shrink-0">

          {/* BASIC INFORMATION */}
          <Card className="p-4 flex flex-col">
            <SectionHeader title="BASIC INFORMATION" />

            <div className="grid grid-cols-1 gap-3">

              {/* VEHICLE MAKE LOOKUP */}
              <FieldRenderer
                label="Vehicle Make"
                required
                type="lookup"
                value={
                  form.makeCode
                    ? `${form.makeCode}${
                        form.makeName
                          ? ` - ${form.makeName}`
                          : ""
                      }`
                    : ""
                }

                /*
                 * Vehicle Make is also the table filter.
                 * It must remain clickable after:
                 * - Retrieve
                 * - Edit
                 * - Reset
                 *
                 * Selecting another Make while viewing an
                 * existing record will leave that record
                 * and load the selected Make's models.
                 */
                onLookup={() => {
                  if (
                    saveMutation.isPending ||
                    deleteMutation.isPending
                  ) {
                    return;
                  }

                  setIsMakeLookupOpen(true);
                }}

                onChange={(value) => {
                  const makeCode = String(
                    value ?? ""
                  )
                    .split(" - ")[0]
                    .trim()
                    .toUpperCase();

                  setForm((prev) => ({
                    ...DEFAULT_FORM,
                    makeCode,
                    makeName:
                      makeCode === prev.makeCode
                        ? prev.makeName
                        : "",
                    active: "Y",
                    __existing: false,
                  }));

                  /*
                   * Typing/changing the Make outside Add mode
                   * acts as a filter, not an edit of the
                   * retrieved model record.
                   */
                  if (
                    !isEditing ||
                    form.__existing
                  ) {
                    setIsEditing(false);
                  }

                  setSelectedRow(null);
                  setIsDupCode(false);
                }}

                disabled={
                  saveMutation.isPending ||
                  deleteMutation.isPending
                }
              />

              {/* MODEL INFO */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldRenderer
                  label="Vehicle Model Code"
                  required
                  value={form.code}
                  inputRef={codeInputRef}
                  onChange={(value) =>
                    setField(
                      "code",
                      String(value ?? "").toUpperCase()
                    )
                  }
                  onBlur={handleCodeValidate}
                  onKeyDown={handleCodeValidate}
                  disabled={
                    isReadOnly ||
                    !isEditing ||
                    form.__existing ||
                    !form.makeCode
                  }
                />

                <FieldRenderer
                  label="Vehicle Description"
                  required
                  value={form.description}
                  onChange={(value) =>
                    setField(
                      "description",
                      value ?? ""
                    )
                  }
                  disabled={
                    isReadOnly ||
                    !isEditing ||
                    !form.makeCode
                  }
                />

                <FieldRenderer
                  label="Active"
                  type="select"
                  options={activeOptions}
                  value={form.active || "Y"}
                  onChange={(value) =>
                    setField(
                      "active",
                      value ?? "Y"
                    )
                  }
                  disabled={
                    isReadOnly ||
                    !isEditing
                  }
                />
              </div>
            </div>
          </Card>

          {/* REGISTRATION INFO */}
          <RegistrationInfo
            data={form}
            layout="stacked"
          />
        </div>

        {/* TABLE */}
        <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
          <SearchGlobalReferenceTable
            columns={tableColumns}
            data={tableData}
            isLoading={isInitialLoading}
            docType="VE Model Codes"
            itemsPerPage={50}
            onRowDoubleClick={handleRowDoubleClick}
            onRowClick={(row) =>
              setSelectedRow(row)
            }
            showFilters
            autoFillGrid
          />
        </div>

        {/* VEHICLE MAKE LOOKUP */}
        <SearchVEMakeRef
          isOpen={isMakeLookupOpen}
          onClose={(selected) => {
            setIsMakeLookupOpen(false);

            if (!selected) return;

            /*
             * If Add was already active, selecting a Make
             * should keep the user in Add mode.
             *
             * If an existing record was retrieved/edited,
             * selecting another Make is treated as changing
             * the model-list filter instead.
             */
            const continueAddMode =
              isEditing &&
              !form.__existing;

            const makeCode = String(
              selected.code ??
              selected.makeCode ??
              selected.make_code ??
              ""
            )
              .trim()
              .toUpperCase();

            const makeName = String(
              selected.description ??
              selected.makeName ??
              selected.make_name ??
              ""
            ).trim();

            setForm({
              ...DEFAULT_FORM,
              makeCode,
              makeName,
              active: "Y",
              __existing: false,
            });

            setSelectedRow(null);
            setIsDupCode(false);

            if (continueAddMode) {
              setIsEditing(true);

              setTimeout(() => {
                codeInputRef.current?.focus?.();
              }, 0);
            } else {
              setIsEditing(false);
            }
          }}
        />
      </div>
    );
  }
);

VEModelCodes.displayName = "VEModelCodes";

export default VEModelCodes;