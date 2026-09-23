import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Database,
  Eye,
  EyeOff,
  FileText,
  Grid2X2,
  Layers3,
  Menu,
  Minus,
  PanelLeftClose,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  SaveAll,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ToggleLeft,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Swal from "sweetalert2";

import {
  apiClient,
  getTenant,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "./AuthContext.jsx";
import {
  useSwalErrorAlertAPI,
  useSwalValidationAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalProceedConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const TABS = [
  {
    id: "switches",
    label: "Application Switch",
    description: "Review HS_OPTION configuration in tables.",
    icon: SlidersHorizontal,
  },
  {
    id: "documents",
    label: "Document Setup",
    description: "Maintain HS_DOC document definitions.",
    icon: Layers3,
  },
  {
    id: "dropdowns",
    label: "Document Dropdown",
    description: "Maintain HS_DROPDOWN records.",
    icon: FileText,
  },
  {
    id: "modules",
    label: "Module Licensing",
    description: "Remove and restore HS_MENU modules through a tenant JSON master.",
    icon: Boxes,
  },
  {
    id: "environment",
    label: "API Environment",
    description: "Update approved Laravel environment values.",
    icon: ServerCog,
  },
  {
    id: "license",
    label: "License Seats",
    description: "Monitor concurrent users and seat capacity.",
    icon: ShieldCheck,
  },
];

const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-800 " +
  "px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-900 " +
  "dark:bg-blue-600 dark:hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 " +
  "bg-white dark:bg-slate-900 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-blue-300 " +
  "hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-800 dark:border-slate-700 dark:bg-slate-900 " +
  "dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-800 dark:hover:text-blue-300 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const errorText = (error, fallback) =>
  error?.response?.data?.details ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const OPTION_MODULES = [
  {
    id: "purchasing",
    label: "Purchasing",
    shortLabel: "PUR",
    matches: (name) =>
      name.startsWith("PR_") ||
      name.startsWith("PO_") ||
      name.startsWith("JO_") ||
      name.startsWith("RRAPP_") ||
      name.startsWith("PRAPP_") ||
      name.startsWith("POAPP_") ||
      name.startsWith("JOAPP_") ||
      name.startsWith("PUR"),
  },
  {
    id: "payable",
    label: "Payable",
    shortLabel: "AP",
    matches: (name) =>
      name.startsWith("AP_") ||
      name.startsWith("APV_") ||
      name.startsWith("APDM_") ||
      name.startsWith("CV_") ||
      name.startsWith("CVAPP_"),
  },
  {
    id: "inventory",
    label: "Inventory",
    shortLabel: "INV",
    matches: (name) =>
      name.startsWith("FGINV_") ||
      name.startsWith("RMINV_") ||
      name.startsWith("MSINV_") ||
      name.startsWith("INV_") ||
      name.startsWith("INVUOM2_") ||
      name.startsWith("ITEM_"),
  },
  {
    id: "sales",
    label: "Sales",
    shortLabel: "SALES",
    matches: (name) =>
      name.startsWith("SO_") ||
      name.startsWith("SOAPP_") ||
      name.startsWith("SI_") ||
      name.startsWith("DR_"),
  },
  {
    id: "receivable",
    label: "Receivable",
    shortLabel: "AR",
    matches: (name) =>
      name.startsWith("AR_") ||
      name.startsWith("CR_") ||
      name.startsWith("CM_") ||
      name.startsWith("DM_") ||
      name.startsWith("OR_"),
  },
  {
    id: "bir-identification",
    label: "BIR Identification",
    shortLabel: "BIR",
    matches: (name) =>
      name.startsWith("BIR_") ||
      name.startsWith("TIN_") ||
      name.startsWith("ATC_") ||
      name.startsWith("VAT_") ||
      name.startsWith("EWT_") ||
      name.startsWith("WT_") ||
      name.startsWith("FORM2307_"),
  },
  {
    id: "integration",
    label: "Integration",
    shortLabel: "INT",
    matches: (name) =>
      name.startsWith("API_") ||
      name.startsWith("IES_") ||
      name.startsWith("MAIL_") ||
      name.startsWith("EMAIL_") ||
      name.startsWith("SMS_") ||
      name.startsWith("SEMAPHORE_") ||
      name === "PATH_PRINTING",
  },
  {
    id: "other",
    label: "Other Module",
    shortLabel: "OTHER",
    matches: () => true,
  },
];

const optionModuleFor = (fieldName = "") => {
  const name = String(fieldName).toUpperCase();

  return (
    OPTION_MODULES.find(
      (module) =>
        module.id !== "other" && module.matches(name)
    )?.id || "other"
  );
};

const optionModuleLabel = (moduleId) =>
  OPTION_MODULES.find((module) => module.id === moduleId)?.label ||
  "Other";

const environmentGroupLabel = (groupId) => {
  const labels = {
    application: "Application",
    session: "Session & Security",
    services: "Connected Services",
    mail: "Mail Configuration",
    backend: "Laravel Environment",
  };

  return labels[groupId] || String(groupId || "Environment");
};

const cardSurface =
  "rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 shadow-sm " +
  "dark:border-slate-700 dark:bg-slate-900";

const inputClass =
  "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm " +
  "font-semibold text-slate-800 dark:text-slate-200 outline-none transition placeholder:text-slate-400 " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950 disabled:bg-slate-100 " +
  "disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 " +
  "dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-950 " +
  "dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

function Switch({ enabled, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition ${
        enabled ? "bg-blue-700" : "bg-slate-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition ${
          enabled ? "translate-x-[18px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function LoadingCards({ count = 6 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"
        >
          <div className="h-3 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="mt-4 h-6 w-3/4 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="mt-3 h-3 w-1/2 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

function ApplicationSwitchTab() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState("");
  const [savingAll, setSavingAll] = useState(false);
  const [activeModule, setActiveModule] = useState("purchasing");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get("/heartstrong/options", {
        withCredentials: true,
      });

      const nextFields = (
        Array.isArray(data?.data?.fields) ? data.data.fields : []
      ).map((field) => ({
        ...field,
        dirty: false,
        moduleId: optionModuleFor(field.name),
      }));

      setFields(nextFields);
      setLastUpdated(new Date());

      setActiveModule((current) => {
        if (
          current &&
          OPTION_MODULES.some((module) => module.id === current)
        ) {
          return current;
        }

        return "purchasing";
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load application configuration",
        text: errorText(error, "HS_OPTION could not be retrieved."),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableModules = useMemo(
    () =>
      OPTION_MODULES.map((module) => {
        const moduleFields = fields.filter(
          (field) => field.moduleId === module.id
        );

        return {
          ...module,
          fieldCount: moduleFields.length,
          changedCount: moduleFields.filter(
            (field) =>
              field.controlType !== "switch" &&
              String(field.value ?? "") !==
                String(field.originalValue ?? "")
          ).length,
        };
      }),
    [fields]
  );

  const activeDefinition =
    availableModules.find(
      (module) => module.id === activeModule
    ) || availableModules[0];

  const activeFields = useMemo(
    () =>
      fields.filter(
        (field) => field.moduleId === activeDefinition?.id
      ),
    [activeDefinition?.id, fields]
  );

  const filteredActiveFields = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return activeFields;

    return activeFields.filter((field) =>
      [
        field.label,
        field.name,
        field.dataType,
        field.controlType,
        field.value,
        field.originalValue,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [activeFields, searchTerm]);

  const dirtyFields = activeFields.filter(
    (field) =>
      field.controlType !== "switch" &&
      String(field.value ?? "") !==
        String(field.originalValue ?? "")
  );

  const allDirtyFields = fields.filter(
    (field) =>
      field.controlType !== "switch" &&
      String(field.value ?? "") !==
        String(field.originalValue ?? "")
  );

  const toggle = async (fieldName, enabled) => {
    const previous = fields;

    setSavingField(fieldName);
    setFields((current) =>
      current.map((field) =>
        field.name === fieldName
          ? {
              ...field,
              enabled,
              value: enabled
                ? field.enabledValue
                : field.disabledValue,
            }
          : field
      )
    );

    try {
      const { data } = await apiClient.post(
        "/heartstrong/options",
        {
          field: fieldName,
          enabled,
        },
        {
          withCredentials: true,
        }
      );

      setFields((current) =>
        current.map((field) =>
          field.name === fieldName
            ? {
                ...field,
                enabled: Boolean(
                  data?.data?.enabled ?? enabled
                ),
                value:
                  data?.data?.storedValue ??
                  field.value,
                originalValue:
                  data?.data?.storedValue ??
                  field.value,
                dirty: false,
              }
            : field
        )
      );

      setLastUpdated(new Date());
    } catch (error) {
      setFields(previous);

      await Swal.fire({
        icon: "error",
        title: "Unable to update switch",
        text: errorText(
          error,
          "The HS_OPTION switch was not updated."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSavingField("");
    }
  };

  const changeValue = (fieldName, value) => {
    setFields((current) =>
      current.map((field) =>
        field.name === fieldName
          ? {
              ...field,
              value,
              dirty:
                String(value ?? "") !==
                String(field.originalValue ?? ""),
            }
          : field
      )
    );
  };

  const resetValue = (fieldName) => {
    setFields((current) =>
      current.map((field) =>
        field.name === fieldName
          ? {
              ...field,
              value: field.originalValue ?? "",
              dirty: false,
            }
          : field
      )
    );
  };

  const persistValue = async (field, showSuccess = true) => {
    const { data } = await apiClient.post(
      "/heartstrong/options",
      {
        field: field.name,
        value: field.value,
      },
      {
        withCredentials: true,
      }
    );

    const storedValue =
      data?.data?.storedValue ?? field.value;

    setFields((current) =>
      current.map((item) =>
        item.name === field.name
          ? {
              ...item,
              value: storedValue ?? "",
              originalValue: storedValue ?? "",
              dirty: false,
            }
          : item
      )
    );

    setLastUpdated(new Date());

    if (showSuccess) {
      await Swal.fire({
        icon: "success",
        title: "Setting saved",
        text: `${field.label} was updated.`,
        timer: 1100,
        showConfirmButton: false,
      });
    }
  };

  const saveValue = async (field) => {
    setSavingField(field.name);

    try {
      await persistValue(field);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to update setting",
        text: errorText(
          error,
          "The HS_OPTION value was not updated."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSavingField("");
    }
  };

  const saveFields = async (fieldsToSave, title) => {
    if (!fieldsToSave.length) return;

    const confirmation = await Swal.fire({
      icon: "question",
      title,
      text: `${fieldsToSave.length} changed ${
        fieldsToSave.length === 1 ? "value" : "values"
      } will be updated.`,
      showCancelButton: true,
      confirmButtonText: "Save changes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1d4ed8",
    });

    if (!confirmation.isConfirmed) return;

    setSavingAll(true);
    const failed = [];

    for (const field of fieldsToSave) {
      try {
        await persistValue(field, false);
      } catch (error) {
        failed.push({ field, error });
      }
    }

    setSavingAll(false);

    if (failed.length) {
      await Swal.fire({
        icon: "warning",
        title: "Some values were not saved",
        text: `${failed.length} of ${fieldsToSave.length} updates failed.`,
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    await Swal.fire({
      icon: "success",
      title: "Settings saved",
      text: `${fieldsToSave.length} HS_OPTION ${
        fieldsToSave.length === 1 ? "value was" : "values were"
      } updated.`,
      timer: 1400,
      showConfirmButton: false,
    });
  };

  const renderInput = (field) => {
    const className =
      "h-9 w-full min-w-[170px] rounded-lg border border-slate-300 bg-white " +
      "px-3 text-sm font-semibold text-slate-800 outline-none transition " +
      "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 " +
      "disabled:bg-slate-100 disabled:text-slate-500 " +
      "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 " +
      "dark:focus:border-blue-500 dark:focus:ring-blue-950 " +
      "dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

    if (field.controlType === "number") {
      return (
        <input
          type="number"
          step={field.numberStep || "1"}
          value={field.value ?? ""}
          onChange={(event) =>
            changeValue(field.name, event.target.value)
          }
          disabled={
            savingField === field.name || savingAll
          }
          className={className}
        />
      );
    }

    return (
      <input
        type="text"
        value={field.value ?? ""}
        maxLength={
          Number(field.maxLength) > 0
            ? Number(field.maxLength)
            : undefined
        }
        onChange={(event) =>
          changeValue(field.name, event.target.value)
        }
        disabled={
          savingField === field.name || savingAll
        }
        className={className}
      />
    );
  };

  const moduleIconFor = (moduleId) => {
    const icons = {
      purchasing: Boxes,
      payable: FileText,
      inventory: Database,
      sales: Activity,
      receivable: FileText,
      "bir-identification": ShieldCheck,
      integration: Layers3,
      other: Grid2X2,
    };

    return icons[moduleId] || SlidersHorizontal;
  };

  const formatUpdated = () => {
    if (!lastUpdated) return "Not loaded yet";

    return lastUpdated.toLocaleString([], {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="relative space-y-3">
      {(savingField !== "" || savingAll) && <LoadingSpinner />}

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl sm:p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <SlidersHorizontal size={20} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-950 dark:text-white sm:text-xl">
                  Application Switch
                </h2>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  HeartStrong
                </span>
              </div>

              <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400 sm:text-sm">
                Manage application settings by updating HS_OPTION values in a compact and secure interface.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="hidden items-center gap-2 text-right text-[11px] text-slate-500 dark:text-slate-400 lg:flex">
              <Activity size={15} className="text-blue-600 dark:text-blue-300" />
              <div>
                <p className="font-bold uppercase tracking-wide">
                  Last updated
                </p>
                <p className="font-semibold">
                  {formatUpdated()}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading || savingAll}
              className={secondaryButton}
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                saveFields(
                  allDirtyFields,
                  "Save all changed application values?"
                )
              }
              disabled={
                loading ||
                savingAll ||
                allDirtyFields.length === 0
              }
              className={primaryButton}
            >
              <SaveAll size={15} />
              Save All
              {allDirtyFields.length > 0
                ? ` (${allDirtyFields.length})`
                : ""}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingCards count={6} />
      ) : fields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          No HS_OPTION fields were found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-2 pt-2 dark:border-slate-700 dark:bg-slate-950/40 sm:px-3 sm:pt-3">
            <div className="flex min-w-max items-end">
              {availableModules.map((module) => {
                const selected =
                  module.id === activeDefinition?.id;
                const ModuleIcon = moduleIconFor(module.id);

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => {
                      setActiveModule(module.id);
                      setSearchTerm("");
                    }}
                    className={`group relative -mb-px flex min-w-[132px] items-center justify-center gap-1.5 border border-slate-200 px-3 py-2 text-[11px] font-extrabold transition first:rounded-tl-xl last:rounded-tr-xl dark:border-slate-700 sm:min-w-[150px] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs ${
                      selected
                        ? "z-10 border-b-white bg-white text-blue-800 shadow-[0_-2px_8px_rgba(15,23,42,.04)] dark:border-b-slate-900 dark:bg-slate-900 dark:text-blue-300"
                        : "bg-slate-50 text-slate-600 hover:bg-white hover:text-blue-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                    }`}
                  >
                    <ModuleIcon
                      size={14}
                      className={
                        selected
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-slate-400 group-hover:text-blue-600"
                      }
                    />

                    <span className="whitespace-nowrap">
                      {module.label}
                    </span>

                    {module.changedCount > 0 && (
                      <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        {module.changedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 border-b border-slate-200 px-3 py-3 dark:border-slate-700 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-slate-950 dark:text-white">
                  {activeDefinition?.label}
                </h3>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {activeFields.length} configuration rows
                </span>
              </div>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Configure {activeDefinition?.label?.toLowerCase()} module options and system behavior.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search settings or fields..."
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950 sm:w-64"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  saveFields(
                    dirtyFields,
                    `Save changed ${activeDefinition?.label} values?`
                  )
                }
                disabled={
                  savingAll || dirtyFields.length === 0
                }
                className={primaryButton}
              >
                <Save size={15} />
                Save Module
                {dirtyFields.length > 0
                  ? ` (${dirtyFields.length})`
                  : ""}
              </button>
            </div>
          </div>

          {/* Mobile settings cards */}
          <div className="space-y-2 p-2 md:hidden">
            {filteredActiveFields.map((field) => {
              const dirty =
                field.controlType !== "switch" &&
                String(field.value ?? "") !==
                  String(field.originalValue ?? "");

              const currentDisplay =
                field.originalValue === null ||
                field.originalValue === ""
                  ? "NULL / blank"
                  : String(field.originalValue);

              return (
                <article
                  key={`mobile-${field.name}`}
                  className={`overflow-hidden rounded-xl border ${
                    dirty
                      ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/15"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {field.label}
                        </h4>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                            field.controlType === "switch"
                              ? "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          }`}
                        >
                          {field.controlType === "switch"
                            ? "Switch"
                            : String(field.dataType || "Value")}
                        </span>
                      </div>

                      <p className="mt-1 truncate font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {field.name}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                        field.controlType === "switch"
                          ? field.enabled
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          : dirty
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      }`}
                    >
                      {field.controlType === "switch"
                        ? field.enabled
                          ? "Enabled"
                          : "Disabled"
                        : dirty
                          ? "Unsaved"
                          : "Saved"}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                    {field.controlType === "switch" ? (
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Current
                          </p>
                          <p className="mt-1 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {currentDisplay}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            label={field.label}
                            enabled={Boolean(field.enabled)}
                            disabled={
                              savingField === field.name ||
                              savingAll
                            }
                            onChange={(next) =>
                              toggle(field.name, next)
                            }
                          />

                          <span
                            className={`text-[11px] font-black ${
                              field.enabled
                                ? "text-emerald-600 dark:text-emerald-300"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {field.enabled
                              ? `Enabled (${field.enabledValue})`
                              : `Disabled (${field.disabledValue})`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                              Current Value
                            </p>
                            <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {currentDisplay}
                            </p>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                              Status
                            </p>
                            <p
                              className={`mt-1 text-xs font-black ${
                                dirty
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {dirty ? "Unsaved change" : "Saved"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            New Value
                          </p>
                          {renderInput(field)}
                        </div>

                        <div className="flex justify-end gap-2">
                          {dirty && (
                            <button
                              type="button"
                              onClick={() =>
                                resetValue(field.name)
                              }
                              disabled={
                                savingField === field.name ||
                                savingAll
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <RotateCcw size={13} />
                              Reset
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => saveValue(field)}
                            disabled={
                              savingField === field.name ||
                              savingAll ||
                              !dirty
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500"
                          >
                            <Save size={13} />
                            {savingField === field.name
                              ? "Saving..."
                              : "Save"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {filteredActiveFields.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
                <Search
                  size={22}
                  className="mx-auto text-slate-300 dark:text-slate-600"
                />
                <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  No matching settings found
                </p>
              </div>
            )}
          </div>

          {/* Desktop / tablet settings table */}
          <div className="hidden max-h-[calc(100vh-385px)] min-h-[360px] overflow-auto md:block">
            <table className="min-w-[1120px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur dark:bg-slate-800/95">
                <tr>
                  <th className="min-w-[240px] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                    Setting
                  </th>
                  <th className="min-w-[190px] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                    Database Field
                  </th>
                  <th className="w-[120px] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                    Type
                  </th>
                  <th className="w-[150px] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                    Current Value
                  </th>
                  <th className="min-w-[280px] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                    New Value
                  </th>
                  <th className="w-[130px] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="sticky right-0 z-30 w-[120px] bg-slate-100/95 px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 backdrop-blur dark:bg-slate-800/95 dark:text-slate-300">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredActiveFields.map((field) => {
                  const dirty =
                    field.controlType !== "switch" &&
                    String(field.value ?? "") !==
                      String(field.originalValue ?? "");

                  const currentDisplay =
                    field.originalValue === null ||
                    field.originalValue === ""
                      ? "NULL / blank"
                      : String(field.originalValue);

                  return (
                    <tr
                      key={field.name}
                      className={`transition ${
                        dirty
                          ? "bg-amber-50/60 dark:bg-amber-950/15"
                          : "hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-slate-900 dark:text-slate-100">
                          {field.label}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                          {field.controlType === "switch"
                            ? "Application behavior switch"
                            : "Application configuration value"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {field.name}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${
                            field.controlType === "switch"
                              ? "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          }`}
                        >
                          {field.controlType === "switch"
                            ? "Switch"
                            : String(field.dataType || "Value")}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {currentDisplay}
                      </td>

                      <td className="px-4 py-3">
                        {field.controlType === "switch" ? (
                          <div className="flex items-center gap-3">
                            <Switch
                              label={field.label}
                              enabled={Boolean(field.enabled)}
                              disabled={
                                savingField === field.name ||
                                savingAll
                              }
                              onChange={(next) =>
                                toggle(field.name, next)
                              }
                            />

                            <span
                              className={`text-xs font-black ${
                                field.enabled
                                  ? "text-emerald-600 dark:text-emerald-300"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {field.enabled
                                ? `Enabled (${field.enabledValue})`
                                : `Disabled (${field.disabledValue})`}
                            </span>
                          </div>
                        ) : (
                          renderInput(field)
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                            field.controlType === "switch"
                              ? field.enabled
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              : dirty
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              field.controlType === "switch"
                                ? field.enabled
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                                : dirty
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                          />
                          {field.controlType === "switch"
                            ? field.enabled
                              ? "Enabled"
                              : "Disabled"
                            : dirty
                              ? "Unsaved"
                              : "Saved"}
                        </span>
                      </td>

                      <td className="sticky right-0 bg-white px-4 py-3 text-right dark:bg-slate-900">
                        {field.controlType === "switch" ? (
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            Auto-save
                          </span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {dirty && (
                              <button
                                type="button"
                                onClick={() =>
                                  resetValue(field.name)
                                }
                                disabled={
                                  savingField === field.name ||
                                  savingAll
                                }
                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title="Discard change"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => saveValue(field)}
                              disabled={
                                savingField === field.name ||
                                savingAll ||
                                !dirty
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-700 px-3 text-[11px] font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500"
                            >
                              <Save size={12} />
                              {savingField === field.name
                                ? "Saving..."
                                : "Save"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredActiveFields.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center"
                    >
                      <Search
                        size={24}
                        className="mx-auto text-slate-300 dark:text-slate-600"
                      />
                      <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                        No matching settings found
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Try another search term or select a different module.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[9px] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredActiveFields.length} of {activeFields.length} rows for{" "}
              {activeDefinition?.label}
            </span>

            <span>
              Changes are stored in HS_OPTION. Switches save automatically.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function RecordEditor({
  open,
  columns,
  initialValues,
  defaultValues = {},
  saving,
  title,
  subtitle,
  onClose,
  onSave,
}) {
  const editableColumns = useMemo(
    () =>
      columns.filter(
        (column) => !column.isIdentity
      ),
    [columns]
  );

  const [values, setValues] = useState({});

  useEffect(() => {
    if (!open) return;

    setValues(
      Object.fromEntries(
        editableColumns.map((column) => [
          column.name,
          initialValues?.[column.name] ??
            defaultValues?.[column.name] ??
            "",
        ])
      )
    );
  }, [
    defaultValues,
    editableColumns,
    initialValues,
    open,
  ]);

  if (!open) return null;

  const renderControl = (column) => {
    const value = values[column.name] ?? "";

    const updateValue = (nextValue) => {
      setValues((current) => ({
        ...current,
        [column.name]: nextValue,
      }));
    };

    const disabled =
      column.isPrimaryKey &&
      Boolean(initialValues);

    const className =
      "mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 " +
      "px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none " +
      "focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950 " +
      "disabled:bg-slate-100 disabled:text-slate-500";

    if (
      column.inputType === "select" &&
      Array.isArray(column.options)
    ) {
      return (
        <select
          value={value}
          onChange={(event) =>
            updateValue(event.target.value)
          }
          disabled={disabled}
          className={className}
        >
          {column.nullable &&
            column.allowBlank !== false && (
              <option value="">Blank</option>
            )}

          {column.options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={
          column.inputType === "number"
            ? "number"
            : "text"
        }
        value={value}
        maxLength={
          Number(column.maxLength) > 0
            ? Number(column.maxLength)
            : undefined
        }
        onChange={(event) =>
          updateValue(event.target.value)
        }
        disabled={disabled}
        className={className}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 dark:shadow-black/40 sm:max-h-[92vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-6 py-4">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              {title ||
                (initialValues
                  ? "Edit Record"
                  : "Add Record")}
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle || "HeartStrong setup"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {editableColumns.map((column) => (
              <label
                key={column.name}
                className="block"
              >
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {column.label}

                  {!column.nullable &&
                    !column.isIdentity && (
                      <span className="ml-1 text-rose-500">
                        *
                      </span>
                    )}
                </span>

                {renderControl(column)}

                <span className="mt-1 block font-mono text-[10px] text-slate-400">
                  {column.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/95 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className={secondaryButton}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(values)}
            className={primaryButton}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


function DocumentSetupTab() {
  const [payload, setPayload] = useState({
    columns: [],
    keyColumns: [],
    moduleCodes: [],
    statuses: [],
    totalRows: 0,
    rows: [],
  });

  const [selectedModuleCode, setSelectedModuleCode] =
    useState("");
  const [selectedStatus, setSelectedStatus] =
    useState("");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState({
    open: false,
    row: null,
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get(
        "/heartstrong/documents",
        {
          params: {
            ...(selectedModuleCode
              ? {
                  moduleCode: selectedModuleCode,
                }
              : {}),
            ...(selectedStatus
              ? {
                  docStatus: selectedStatus,
                }
              : {}),
          },
          withCredentials: true,
        }
      );

      setPayload({
        columns: Array.isArray(data?.data?.columns)
          ? data.data.columns
          : [],
        keyColumns: Array.isArray(
          data?.data?.keyColumns
        )
          ? data.data.keyColumns
          : [],
        moduleCodes: Array.isArray(
          data?.data?.moduleCodes
        )
          ? data.data.moduleCodes
          : [],
        statuses: Array.isArray(
          data?.data?.statuses
        )
          ? data.data.statuses
          : [],
        totalRows: Number(
          data?.data?.totalRows ?? 0
        ),
        rows: Array.isArray(data?.data?.rows)
          ? data.data.rows
          : [],
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load document setup",
        text: errorText(
          error,
          "HS_DOC could not be retrieved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedModuleCode, selectedStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const valueOf = useCallback((row, name) => {
    const key = Object.keys(row || {}).find(
      (columnName) =>
        String(columnName).toUpperCase() ===
        String(name).toUpperCase()
    );

    return key ? row?.[key] : undefined;
  }, []);

  const filteredRows = useMemo(() => {
    const query =
      searchTerm.trim().toLowerCase();

    if (!query) return payload.rows;

    return payload.rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [payload.rows, searchTerm]);

  const summary = useMemo(() => {
    const rows = payload.rows;

    const countSeries = (series) =>
      rows.filter(
        (row) =>
          String(valueOf(row, "DOC_SERIES") ?? "")
            .trim()
            .toLowerCase() === series.toLowerCase()
      ).length;

    const active = rows.filter(
      (row) =>
        String(valueOf(row, "DOC_STAT") ?? "")
          .trim()
          .toLowerCase() === "active"
    ).length;

    return {
      active,
      auto: countSeries("Auto"),
      system: countSeries("System"),
      manual: countSeries("Manual"),
    };
  }, [payload.rows, valueOf]);

  const keysForRow = (row) =>
    Object.fromEntries(
      payload.keyColumns.map((name) => [
        name,
        row?.[name] ?? null,
      ])
    );

  const defaultValues = useMemo(
    () => ({
      ...(selectedModuleCode
        ? {
            MODULE_CODE: selectedModuleCode,
          }
        : {}),
      ...(selectedStatus
        ? {
            DOC_STAT: selectedStatus,
          }
        : {
            DOC_STAT: "Active",
          }),
      DOC_SERIES: "Auto",
    }),
    [selectedModuleCode, selectedStatus]
  );

  const saveRow = async (values) => {
    setSaving(true);

    try {
      const { data } = await apiClient.post(
        "/heartstrong/documents/save",
        {
          keys: editor.row
            ? keysForRow(editor.row)
            : null,
          values: {
            ...values,
            DOC_SERIES:
              String(values?.DOC_SERIES ?? "").trim() ||
              "Auto",
          },
        },
        {
          withCredentials: true,
        }
      );

      setEditor({
        open: false,
        row: null,
      });

      await load();

      await Swal.fire({
        icon: "success",
        title: "Document setup saved",
        text:
          data?.message ||
          "HS_DOC was updated.",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to save document setup",
        text: errorText(
          error,
          "The HS_DOC record was not saved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSelectedModuleCode("");
    setSelectedStatus("");
    setSearchTerm("");
  };

  const visibleColumns = payload.columns;
  const activeFilterCount =
    Number(Boolean(selectedModuleCode)) +
    Number(Boolean(selectedStatus)) +
    Number(Boolean(searchTerm.trim()));

  const seriesBadgeClass = (series) => {
    const normalized = String(series || "")
      .trim()
      .toLowerCase();

    if (normalized === "auto") {
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    }

    if (normalized === "system") {
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300";
    }

    if (normalized === "manual") {
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
    }

    return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  };

  return (
    <section className="relative space-y-3">
      {saving && <LoadingSpinner />}

      {/* Document Setup header */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 sm:h-11 sm:w-11">
              <Layers3 size={19} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-950 dark:text-white sm:text-xl">
                  Document Setup
                </h2>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  HS_DOC
                </span>
              </div>

              <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400 sm:text-sm">
                Maintain document definitions, numbering series, status,
                approval, and document behavior.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={load}
              disabled={loading || saving}
              className={secondaryButton}
            >
              <RefreshCw
                size={15}
                className={
                  loading ? "animate-spin" : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                setEditor({
                  open: true,
                  row: null,
                })
              }
              disabled={saving}
              className={primaryButton}
            >
              <Plus size={15} />
              Add Document
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {[
          {
            label: "Records",
            value: payload.totalRows,
            caption: "HS_DOC rows",
            className:
              "text-slate-900 dark:text-slate-100",
          },
          {
            label: "Active",
            value: summary.active,
            caption: "Active documents",
            className:
              "text-emerald-700 dark:text-emerald-300",
          },
          {
            label: "Auto",
            value: summary.auto,
            caption: "Series mode",
            className:
              "text-blue-700 dark:text-blue-300",
          },
          {
            label: "System",
            value: summary.system,
            caption: "Series mode",
            className:
              "text-violet-700 dark:text-violet-300",
          },
          {
            label: "Manual",
            value: summary.manual,
            caption: "Series mode",
            className:
              "text-amber-700 dark:text-amber-300",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              {item.label}
            </p>

            <p
              className={`mt-0.5 text-xl font-black ${item.className}`}
            >
              {loading ? "—" : item.value}
            </p>

            <p className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {item.caption}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[190px_190px_minmax(260px,1fr)_auto]">
          <label className="min-w-0">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Module
            </span>

            <select
              value={selectedModuleCode}
              onChange={(event) => {
                setSelectedModuleCode(
                  event.target.value
                );
                setSearchTerm("");
              }}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950"
            >
              <option value="">All Modules</option>

              {payload.moduleCodes.map(
                (moduleCode) => (
                  <option
                    key={moduleCode}
                    value={moduleCode}
                  >
                    {moduleCode}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="min-w-0">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Status
            </span>

            <select
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(
                  event.target.value
                );
                setSearchTerm("");
              }}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950"
            >
              <option value="">
                All Document Statuses
              </option>

              {payload.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0 sm:col-span-2 xl:col-span-1">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Search
            </span>

            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Document code, name, module, form..."
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950"
              />
            </div>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 xl:w-auto"
            >
              <RotateCcw size={13} />
              Clear
              {activeFilterCount > 0 &&
                ` (${activeFilterCount})`}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              Auto
            </span>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
              System
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              Manual
            </span>
          </div>

          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            New documents default to Document Series: Auto.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingCards count={5} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {/* Mobile document cards */}
          <div className="space-y-2 p-2 md:hidden">
            {filteredRows.map((row, rowIndex) => {
              const documentCode =
                valueOf(row, "DOC_CODE") || "—";
              const documentName =
                valueOf(row, "DOC_NAME") || "Unnamed Document";
              const moduleCode =
                valueOf(row, "MODULE_CODE") || "—";
              const status =
                valueOf(row, "DOC_STAT") || "—";
              const series =
                valueOf(row, "DOC_SERIES") || "Auto";

              return (
                <article
                  key={
                    JSON.stringify(
                      keysForRow(row)
                    ) || rowIndex
                  }
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-lg bg-blue-50 px-2 py-1 font-mono text-[10px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {documentCode}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                            String(status).toLowerCase() ===
                            "active"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {status}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-black ${seriesBadgeClass(
                            series
                          )}`}
                        >
                          {series}
                        </span>
                      </div>

                      <h3 className="mt-2 truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {documentName}
                      </h3>

                      <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Module:{" "}
                        <span className="font-black text-slate-700 dark:text-slate-200">
                          {moduleCode}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditor({
                          open: true,
                          row,
                        })
                      }
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-blue-700 transition hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                    >
                      Edit
                    </button>
                  </div>
                </article>
              );
            })}

            {filteredRows.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No HS_DOC records were found.
              </div>
            )}
          </div>

          {/* Desktop / tablet document table */}
          <div className="hidden max-h-[calc(100vh-350px)] min-h-[340px] overflow-auto md:block">
            <table className="min-w-[1100px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur dark:bg-slate-800/95">
                <tr>
                  {visibleColumns.map((column) => (
                    <th
                      key={column.name}
                      className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300"
                    >
                      {column.label}
                    </th>
                  ))}

                  <th className="sticky right-0 z-30 bg-slate-100/95 px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-600 backdrop-blur dark:bg-slate-800/95 dark:text-slate-300">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map(
                  (row, rowIndex) => (
                    <tr
                      key={
                        JSON.stringify(
                          keysForRow(row)
                        ) || rowIndex
                      }
                      className="transition hover:bg-blue-50/40 dark:hover:bg-slate-800/60"
                    >
                      {visibleColumns.map(
                        (column) => {
                          const value =
                            row?.[column.name];

                          const columnName =
                            String(column.name)
                              .toUpperCase();

                          const isStatus =
                            columnName ===
                            "DOC_STAT";

                          const isSeries =
                            columnName ===
                            "DOC_SERIES";

                          const isYesNo = [
                            "DOC_CENTRAL",
                            "DOC_APP",
                            "DOC_UPLOAD",
                          ].includes(
                            columnName
                          );

                          return (
                            <td
                              key={column.name}
                              className="max-w-[260px] truncate whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200"
                              title={String(
                                value ?? ""
                              )}
                            >
                              {isStatus ? (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                                    String(value)
                                      .toLowerCase() ===
                                    "active"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  {value || "—"}
                                </span>
                              ) : isSeries ? (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[9px] font-black ${seriesBadgeClass(
                                    value || "Auto"
                                  )}`}
                                >
                                  {value || "Auto"}
                                </span>
                              ) : isYesNo ? (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                                    String(value)
                                      .toUpperCase() ===
                                    "Y"
                                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  {String(value)
                                    .toUpperCase() === "Y"
                                    ? "Yes"
                                    : String(value)
                                        .toUpperCase() ===
                                      "N"
                                      ? "No"
                                      : value || "—"}
                                </span>
                              ) : (
                                String(value ?? "") ||
                                "—"
                              )}
                            </td>
                          );
                        }
                      )}

                      <td className="sticky right-0 whitespace-nowrap bg-white px-3 py-2 text-right dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() =>
                            setEditor({
                              open: true,
                              row,
                            })
                          }
                          className="inline-flex h-8 items-center rounded-lg px-3 text-[11px] font-black text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={Math.max(
                        1,
                        visibleColumns.length + 1
                      )}
                      className="px-6 py-14 text-center text-slate-500 dark:text-slate-400"
                    >
                      No HS_DOC records were found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredRows.length} of{" "}
              {payload.totalRows} records
            </span>

            <span>
              Document Series: Auto / System / Manual
            </span>
          </div>
        </div>
      )}

      <RecordEditor
        open={editor.open}
        columns={payload.columns}
        initialValues={editor.row}
        defaultValues={defaultValues}
        saving={saving}
        title={
          editor.row
            ? "Edit Document Setup"
            : "Add Document Setup"
        }
        subtitle={
          editor.row
            ? "Update the selected HS_DOC definition"
            : "New records default to Document Series: Auto"
        }
        onClose={() =>
          setEditor({
            open: false,
            row: null,
          })
        }
        onSave={saveRow}
      />
    </section>
  );
}

function DocumentDropdownTab() {
  const [payload, setPayload] = useState({
    columns: [],
    keyColumns: [],
    docCodeColumn: "DOC_CODE",
    docCodes: [],
    totalRows: 0,
    rows: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDocCode, setSelectedDocCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editor, setEditor] = useState({
    open: false,
    row: null,
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get(
        "/heartstrong/document-dropdowns",
        {
          params: selectedDocCode
            ? { docCode: selectedDocCode }
            : {},
          withCredentials: true,
        }
      );

      setPayload({
        columns: Array.isArray(data?.data?.columns)
          ? data.data.columns
          : [],
        keyColumns: Array.isArray(data?.data?.keyColumns)
          ? data.data.keyColumns
          : [],
        docCodeColumn:
          data?.data?.docCodeColumn || "DOC_CODE",
        docCodes: Array.isArray(data?.data?.docCodes)
          ? data.data.docCodes
          : [],
        totalRows: Number(data?.data?.totalRows ?? 0),
        rows: Array.isArray(data?.data?.rows)
          ? data.data.rows
          : [],
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load document dropdowns",
        text: errorText(
          error,
          "HS_DROPDOWN could not be retrieved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDocCode]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return payload.rows;

    return payload.rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [payload.rows, searchTerm]);

  const keysForRow = (row) => {
    const names = payload.keyColumns.length
      ? payload.keyColumns
      : payload.columns.map((column) => column.name);

    return Object.fromEntries(
      names.map((name) => [name, row?.[name] ?? null])
    );
  };

  const defaultValues = useMemo(() => {
    if (!selectedDocCode || !payload.docCodeColumn) {
      return {};
    }

    return {
      [payload.docCodeColumn]: selectedDocCode,
    };
  }, [payload.docCodeColumn, selectedDocCode]);

  const saveRow = async (values) => {
    setSaving(true);

    try {
      await apiClient.post(
        "/heartstrong/document-dropdowns/save",
        {
          keys: editor.row
            ? keysForRow(editor.row)
            : null,
          values,
        },
        {
          withCredentials: true,
        }
      );

      setEditor({
        open: false,
        row: null,
      });

      await load();

      await Swal.fire({
        icon: "success",
        title: "Document dropdown saved",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to save document dropdown",
        text: errorText(
          error,
          "The record was not saved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete this document dropdown?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    try {
      await apiClient.post(
        "/heartstrong/document-dropdowns/delete",
        {
          keys: keysForRow(row),
        },
        {
          withCredentials: true,
        }
      );

      await load();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to delete document dropdown",
        text: errorText(
          error,
          "The record was not deleted."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  return (
    <section className="relative">
      {saving && <LoadingSpinner />}
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white">
            Document Dropdown
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Select a document code to display only its
            HS_DROPDOWN records.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className="block">
            <span className="sr-only">
              Filter by document code
            </span>

            <select
              value={selectedDocCode}
              onChange={(event) => {
                setSelectedDocCode(event.target.value);
                setSearchTerm("");
              }}
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-950 sm:min-w-[190px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">All Document Codes</option>

              {payload.docCodes.map((docCode) => (
                <option key={docCode} value={docCode}>
                  {docCode}
                </option>
              ))}
            </select>
          </label>

          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder={
                selectedDocCode
                  ? `Search ${selectedDocCode}...`
                  : "Search dropdown..."
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-950 sm:w-60"
            />
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              setEditor({
                open: true,
                row: null,
              })
            }
            className={primaryButton}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-black text-slate-600 dark:text-slate-300">
          Document Code:{" "}
          <span className="text-blue-700 dark:text-blue-300">
            {selectedDocCode || "All"}
          </span>
        </span>

        <span className="rounded-full bg-sky-50 dark:bg-sky-950/30 px-3 py-1 text-xs font-black text-sky-700 dark:text-sky-300">
          {payload.totalRows} matching records
        </span>

        {selectedDocCode && (
          <button
            type="button"
            onClick={() => {
              setSelectedDocCode("");
              setSearchTerm("");
            }}
            className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/30 px-3 py-1 text-xs font-black text-rose-700 dark:text-rose-300 transition hover:bg-rose-100"
          >
            <X size={12} />
            Clear document filter
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="max-h-[calc(100vh-360px)] min-h-[340px] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/60">
              <tr>
                {payload.columns.map((column) => (
                  <th
                    key={column.name}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    {column.label}
                  </th>
                ))}

                <th className="sticky right-0 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!loading &&
                filteredRows.map((row, rowIndex) => (
                  <tr
                    key={
                      JSON.stringify(keysForRow(row)) ||
                      rowIndex
                    }
                    className="hover:bg-sky-50/50"
                  >
                    {payload.columns.map((column) => (
                      <td
                        key={column.name}
                        className="max-w-[260px] truncate whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200"
                        title={String(
                          row?.[column.name] ?? ""
                        )}
                      >
                        {String(
                          row?.[column.name] ?? ""
                        ) || "—"}
                      </td>
                    ))}

                    <td className="sticky right-0 whitespace-nowrap bg-white dark:bg-slate-900 px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setEditor({
                            open: true,
                            row,
                          })
                        }
                        className="rounded-lg px-3 py-1.5 text-xs font-extrabold text-sky-700 dark:text-sky-300 hover:bg-sky-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteRow(row)}
                        className="ml-1 rounded-lg p-2 text-rose-600 dark:text-rose-300 hover:bg-rose-50"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={Math.max(
                      1,
                      payload.columns.length + 1
                    )}
                    className="px-6 py-14 text-center text-slate-500 dark:text-slate-400"
                  >
                    {selectedDocCode
                      ? `No records were found for document code ${selectedDocCode}.`
                      : "No document dropdown records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Showing {filteredRows.length} of {payload.totalRows}{" "}
          records
          {selectedDocCode
            ? ` for ${selectedDocCode}`
            : ""}
        </div>
      </div>

      <RecordEditor
        open={editor.open}
        columns={payload.columns}
        initialValues={editor.row}
        defaultValues={defaultValues}
        saving={saving}
        title={
          editor.row
            ? "Edit Document Dropdown"
            : "Add Document Dropdown"
        }
        subtitle="HS_DROPDOWN"
        onClose={() =>
          setEditor({
            open: false,
            row: null,
          })
        }
        onSave={saveRow}
      />
    </section>
  );
}

function EnvironmentTab() {
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [visibleSecrets, setVisibleSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get(
        "/heartstrong/environment",
        {
          withCredentials: true,
        }
      );

      const nextSettings = Array.isArray(data?.data?.settings)
        ? data.data.settings
        : [];

      const nextValues = Object.fromEntries(
        nextSettings.map((setting) => [
          setting.key,
          setting.value ?? "",
        ])
      );

      setSettings(nextSettings);
      setValues(nextValues);
      setOriginal(nextValues);
      setVisibleSecrets({});
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load Laravel environment",
        text: errorText(
          error,
          "The approved environment settings could not be retrieved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changedValues = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(values).filter(
          ([key, value]) => value !== original[key]
        )
      ),
    [original, values]
  );

  const changedCount = Object.keys(changedValues).length;

  const grouped = useMemo(
    () =>
      settings.reduce((result, setting) => {
        const groupId =
          setting.group || setting.target || "backend";

        if (!result[groupId]) result[groupId] = [];
        result[groupId].push(setting);

        return result;
      }, {}),
    [settings]
  );

  const save = async () => {
    if (!changedCount) return;

    const confirmation = await Swal.fire({
      icon: "warning",
      title: `Update ${changedCount} environment values?`,
      text: "Laravel must be restarted after saving these changes.",
      showCancelButton: true,
      confirmButtonText: "Save environment",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1d4ed8",
    });

    if (!confirmation.isConfirmed) return;

    setSaving(true);

    try {
      const { data } = await apiClient.post(
        "/heartstrong/environment",
        {
          values: changedValues,
        },
        {
          withCredentials: true,
        }
      );

      await load();

      await Swal.fire({
        icon: "success",
        title: "Laravel environment updated",
        text:
          data?.message ||
          "Restart the Laravel API to apply the changes.",
        confirmButtonColor: "#1d4ed8",
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to update Laravel environment",
        text: errorText(
          error,
          "The environment was not updated."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSaving(false);
    }
  };

  const setValue = (key, value) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const renderControl = (setting) => {
    const key = setting.key;
    const value = values[key] ?? "";
    const className =
      "w-full min-w-[220px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 " +
      "px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none " +
      "focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950";

    if (
      ["APP_DEBUG", "SESSION_SECURE_COOKIE"].includes(key)
    ) {
      return (
        <select
          value={value}
          onChange={(event) =>
            setValue(key, event.target.value)
          }
          className={className}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (key === "MAIL_ENCRYPTION") {
      return (
        <select
          value={value}
          onChange={(event) =>
            setValue(key, event.target.value)
          }
          className={className}
        >
          <option value="">None</option>
          <option value="tls">tls</option>
          <option value="ssl">ssl</option>
        </select>
      );
    }

    if (key === "LOG_LEVEL") {
      return (
        <select
          value={value}
          onChange={(event) =>
            setValue(key, event.target.value)
          }
          className={className}
        >
          {[
            "debug",
            "info",
            "notice",
            "warning",
            "error",
            "critical",
          ].map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      );
    }

    if (setting.secret) {
      const visible = Boolean(visibleSecrets[key]);

      return (
        <div className="relative min-w-[240px]">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(event) =>
              setValue(key, event.target.value)
            }
            placeholder={
              setting.hasValue
                ? "Leave blank to keep existing secret"
                : setting.placeholder || ""
            }
            className={`${className} pr-10`}
          />

          <button
            type="button"
            onClick={() =>
              setVisibleSecrets((current) => ({
                ...current,
                [key]: !current[key],
              }))
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
          >
            {visible ? (
              <EyeOff size={15} />
            ) : (
              <Eye size={15} />
            )}
          </button>
        </div>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(event) =>
          setValue(key, event.target.value)
        }
        placeholder={setting.placeholder || ""}
        className={className}
      />
    );
  };

  return (
    <section className="relative">
      {saving && <LoadingSpinner />}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white">
            API Environment
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Approved Laravel environment values displayed in tables.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading || saving}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={save}
            disabled={
              loading || saving || !changedCount
            }
            className={primaryButton}
          >
            <SaveAll size={16} />
            Save Environment
            {changedCount > 0
              ? ` (${changedCount})`
              : ""}
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3">
        <AlertTriangle
          size={18}
          className="mt-0.5 flex-none text-amber-600"
        />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Laravel must be restarted after saving environment changes.
          Secret values remain hidden and blank values keep the existing
          secret.
        </p>
      </div>

      {loading ? (
        <LoadingCards count={5} />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([groupId, items]) => (
            <div
              key={groupId}
              className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-3">
                <div>
                  <p className="font-black text-slate-900 dark:text-slate-100">
                    {environmentGroupLabel(groupId)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {items.length} approved values
                  </p>
                </div>

                <span className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 font-mono text-[10px] font-black text-slate-500 dark:text-slate-400">
                  Laravel API .env
                </span>
              </div>

              <div className="max-h-[420px] overflow-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Setting
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Environment Key
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Stored Value
                      </th>
                      <th className="min-w-[280px] px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        New Value
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((setting) => {
                      const dirty =
                        values[setting.key] !==
                        original[setting.key];

                      return (
                        <tr
                          key={setting.key}
                          className={
                            dirty
                              ? "bg-amber-50/60"
                              : "hover:bg-sky-50/40"
                          }
                        >
                          <td className="px-4 py-3">
                            <p className="font-extrabold text-slate-900 dark:text-slate-100">
                              {setting.label}
                            </p>
                            {setting.help && (
                              <p className="mt-1 max-w-[300px] text-xs text-slate-500 dark:text-slate-400">
                                {setting.help}
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {setting.key}
                          </td>

                          <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {setting.secret
                              ? setting.hasValue
                                ? "Configured"
                                : "Not configured"
                              : original[setting.key] === ""
                                ? "Blank"
                                : String(
                                    original[setting.key]
                                  )}
                          </td>

                          <td className="px-4 py-3">
                            {renderControl(setting)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                dirty
                                  ? "bg-amber-100 text-amber-700 dark:text-amber-300"
                                  : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {dirty ? "Changed" : "Saved"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}



function ModuleLicensingTab() {
  const [modules, setModules] = useState([]);
  const [meta, setMeta] = useState({});
  const [activeModuleKey, setActiveModuleKey] =
    useState("");
  const [
    selectedModuleKeys,
    setSelectedModuleKeys,
  ] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [
    selectedMenuKeys,
    setSelectedMenuKeys,
  ] = useState([]);

  const moduleKeyFor = useCallback(
    (module) =>
      String(
        module?.key ||
          `${module?.code || ""}::${module?.name || ""}`
      ).toUpperCase(),
    []
  );

  const showValidation = useCallback(
    async ({
      title,
      message,
      details = [],
    }) => {
      const detailText = details.length
        ? `\n\n${details
            .map((detail) => `• ${detail}`)
            .join("\n")}`
        : "";

      return useSwalValidationAlert({
        icon: "warning",
        title,
        message: `${message}${detailText}`,
      });
    },
    []
  );

  const showApiError = useCallback(
    async ({
      title,
      error,
      fallback,
      details = [],
    }) => {
      const detailText = details.length
        ? `\n\n${details
            .map((detail) => `• ${detail}`)
            .join("\n")}`
        : "";

      return useSwalErrorAlertAPI(
        title,
        `${errorText(error, fallback)}${detailText}`
      );
    },
    []
  );

  const load = useCallback(
    async ({
      initial = false,
      silent = false,
    } = {}) => {
      if (initial) {
        setLoading(true);
      } else if (!silent) {
        setIsRefreshing(true);
      }

      try {
        const { data } = await apiClient.get(
          "/heartstrong/modules",
          {
            withCredentials: true,
          }
        );

        const payload = data?.data || {};
        const nextModules = Array.isArray(
          payload.modules
        )
          ? payload.modules
          : [];

        setModules(nextModules);
        setMeta({
          mode: payload.mode || "delete_restore",
          snapshotFile: payload.snapshotFile || "",
          snapshotCreatedAt:
            payload.snapshotCreatedAt || null,
          snapshotUpdatedAt:
            payload.snapshotUpdatedAt || null,
          totalMasterRows: Number(
            payload.totalMasterRows ?? 0
          ),
          totalExistingRows: Number(
            payload.totalExistingRows ?? 0
          ),
          totalMissingRows: Number(
            payload.totalMissingRows ?? 0
          ),
          tenant: payload.tenant || null,
        });

        setSelectedModuleKeys((current) => {
          const validKeys = new Set(
            nextModules.map((module) =>
              moduleKeyFor(module)
            )
          );

          return current.filter((key) =>
            validKeys.has(key)
          );
        });

        setSelectedMenuKeys((current) => {
          const validInstalledMenuKeys = new Set(
            nextModules.flatMap((module) =>
              (Array.isArray(module?.items)
                ? module.items
                : []
              )
                .filter((item) => Boolean(item?.exists))
                .map((item) => item.snapshotKey)
            )
          );

          return current.filter((key) =>
            validInstalledMenuKeys.has(key)
          );
        });

        setActiveModuleKey((current) => {
          if (
            current &&
            nextModules.some(
              (module) =>
                moduleKeyFor(module) === current
            )
          ) {
            return current;
          }

          return nextModules[0]
            ? moduleKeyFor(nextModules[0])
            : "";
        });
      } catch (error) {
        if (initial) {
          setModules([]);
          setSelectedModuleKeys([]);
          setSelectedMenuKeys([]);
        }

        await showApiError({
          title: "Unable to load module licensing",
          error,
          fallback:
            "The tenant HS_MENU JSON master could not be loaded.",
          details: [
            "Confirm that the selected tenant is reachable.",
            "Confirm that storage/app/heartstrong/modules is writable.",
          ],
        });
      } finally {
        if (initial) {
          setLoading(false);
        }

        if (!initial && !silent) {
          setIsRefreshing(false);
        }
      }
    },
    [moduleKeyFor, showApiError]
  );

  useEffect(() => {
    load({ initial: true });
  }, [load]);

  const activeModule =
    modules.find(
      (module) =>
        moduleKeyFor(module) === activeModuleKey
    ) || modules[0];

  const selectedModules = useMemo(() => {
    const selected = new Set(
      selectedModuleKeys
    );

    return modules.filter((module) =>
      selected.has(moduleKeyFor(module))
    );
  }, [moduleKeyFor, modules, selectedModuleKeys]);

  const selectedInstalledRows = useMemo(
    () =>
      selectedModules.reduce(
        (total, module) =>
          total +
          Number(module.existingCount ?? 0),
        0
      ),
    [selectedModules]
  );

  const selectedRemovedRows = useMemo(
    () =>
      selectedModules.reduce(
        (total, module) =>
          total +
          Number(module.missingCount ?? 0),
        0
      ),
    [selectedModules]
  );

  const allModulesSelected =
    modules.length > 0 &&
    selectedModuleKeys.length === modules.length;

  const filteredItems = useMemo(() => {
    const items = Array.isArray(
      activeModule?.items
    )
      ? activeModule.items
      : [];

    const query =
      searchTerm.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) =>
      [
        item.menuCode,
        item.menuName,
        item.subMenu,
        item.path,
        item.componentKey,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [activeModule, searchTerm]);

  const installedFilteredItems = useMemo(
    () =>
      filteredItems.filter((item) =>
        Boolean(item.exists)
      ),
    [filteredItems]
  );

  const selectedMenus = useMemo(() => {
    const selected = new Set(selectedMenuKeys);

    return (Array.isArray(activeModule?.items)
      ? activeModule.items
      : []
    ).filter(
      (item) =>
        Boolean(item.exists) &&
        selected.has(item.snapshotKey)
    );
  }, [activeModule, selectedMenuKeys]);

  const allVisibleInstalledMenusSelected =
    installedFilteredItems.length > 0 &&
    installedFilteredItems.every((item) =>
      selectedMenuKeys.includes(item.snapshotKey)
    );

  const toggleMenuSelection = (snapshotKey) => {
    setSelectedMenuKeys((current) =>
      current.includes(snapshotKey)
        ? current.filter(
            (key) => key !== snapshotKey
          )
        : [...current, snapshotKey]
    );
  };

  const toggleSelectAllVisibleMenus = () => {
    const visibleKeys = installedFilteredItems.map(
      (item) => item.snapshotKey
    );

    setSelectedMenuKeys((current) => {
      const selected = new Set(current);
      const allSelected = visibleKeys.every((key) =>
        selected.has(key)
      );

      if (allSelected) {
        visibleKeys.forEach((key) =>
          selected.delete(key)
        );
      } else {
        visibleKeys.forEach((key) =>
          selected.add(key)
        );
      }

      return [...selected];
    });
  };

  const toggleModuleSelection = (moduleKey) => {
    setSelectedModuleKeys((current) =>
      current.includes(moduleKey)
        ? current.filter(
            (key) => key !== moduleKey
          )
        : [...current, moduleKey]
    );
  };

  const toggleSelectAllModules = () => {
    setSelectedModuleKeys(
      allModulesSelected
        ? []
        : modules.map((module) =>
            moduleKeyFor(module)
          )
    );
  };

  const updateMenu = async (
    module,
    item,
    enabled
  ) => {
    const operationKey =
      `menu:${item.snapshotKey}`;

    if (!enabled) {
      const confirmation =
        await useSwalDeleteConfirm(
          "Remove Menu?",
          `This will permanently remove ${item.menuName} (${item.menuCode}) from HS_MENU. The record will remain recoverable from the tenant JSON master.`
        );

      if (!confirmation?.isConfirmed) return;
    }

    setSavingKey(operationKey);

    try {
      const { data } = await apiClient.post(
        "/heartstrong/modules",
        {
          scope: "menu",
          snapshotKey: item.snapshotKey,
          enabled,
        },
        {
          withCredentials: true,
        }
      );

      await load({ silent: true });

      if (enabled) {
        await useSwalSuccessAlert(
          "Success!",
          data?.message ||
            `${item.menuName} restored successfully.`
        );
      } else {
        await useSwalDeleteRecord(
          "Removed",
          data?.message ||
            `${item.menuName} has been removed.`
        );
      }
    } catch (error) {
      await showApiError({
        title: enabled
          ? "Unable to restore menu"
          : "Unable to remove menu",
        error,
        fallback:
          "The HS_MENU row was not updated.",
        details: [
          `${module?.code || "Module"} · ${
            item.menuCode || "Menu"
          }`,
        ],
      });
    } finally {
      setSavingKey("");
    }
  };

  const removeSelectedMenus = async () => {
    if (selectedMenus.length === 0) {
      await showValidation({
        title: "No menus selected",
        message:
          "Select at least one installed menu using the checkbox before continuing.",
        details: [
          "Only installed menus can be selected for removal.",
          "Use the checkbox in the table header to select all visible installed menus.",
        ],
      });
      return;
    }

    const preview = selectedMenus
      .slice(0, 8)
      .map(
        (item) =>
          `${item.menuName} (${item.menuCode})`
      );

    if (selectedMenus.length > 8) {
      preview.push(
        `+ ${selectedMenus.length - 8} more menu(s)`
      );
    }

    const confirmation =
      await useSwalDeleteConfirm(
        `Remove ${selectedMenus.length} Selected Menu(s)?`,
        `${selectedMenus.length} installed HS_MENU row(s) under ${activeModule?.name || "the selected module"} will be removed. They remain recoverable from the tenant JSON master.\n\n${preview
          .map((item) => `• ${item}`)
          .join("\n")}`
      );

    if (!confirmation?.isConfirmed) return;

    setSavingKey("bulk-menu-remove");

    let removedMenus = 0;
    let affectedRows = 0;
    const failedMenus = [];

    for (const item of selectedMenus) {
      try {
        const { data } = await apiClient.post(
          "/heartstrong/modules",
          {
            scope: "menu",
            snapshotKey: item.snapshotKey,
            enabled: false,
          },
          {
            withCredentials: true,
          }
        );

        removedMenus += 1;
        affectedRows += Number(
          data?.data?.affectedRows ?? 0
        );
      } catch (error) {
        failedMenus.push({
          item,
          message: errorText(
            error,
            "Unknown server error"
          ),
        });
      }
    }

    await load({ silent: true });

    setSelectedMenuKeys(
      failedMenus.map(
        ({ item }) => item.snapshotKey
      )
    );

    if (removedMenus > 0) {
      await useSwalDeleteRecord(
        "Removed",
        `${removedMenus} menu(s) removed. ${affectedRows} HS_MENU row(s) were deleted and remain recoverable from JSON.`
      );
    }

    if (failedMenus.length > 0) {
      await showApiError({
        title: `${failedMenus.length} menu operation(s) failed`,
        error: {
          message:
            "Some selected menus could not be removed. Failed menus remain selected.",
        },
        fallback:
          "Some selected menus could not be removed.",
        details: failedMenus.map(
          ({ item, message }) =>
            `${item.menuName} (${item.menuCode}): ${message}`
        ),
      });
    }

    setSavingKey("");
  };

  const updateWholeModule = async (
    module,
    enabled
  ) => {
    if (!module) return;

    const operationKey =
      `module:${moduleKeyFor(module)}:${enabled}`;

    if (
      enabled &&
      Number(module.missingCount ?? 0) === 0
    ) {
      await showValidation({
        title: "Nothing to restore",
        message:
          "Every menu under this module is already installed in HS_MENU.",
        details: [
          `${module.name} (${module.code})`,
        ],
      });
      return;
    }

    if (
      !enabled &&
      Number(module.existingCount ?? 0) === 0
    ) {
      await showValidation({
        title: "Nothing to remove",
        message:
          "This module is already fully removed from HS_MENU.",
        details: [
          `${module.name} (${module.code})`,
        ],
      });
      return;
    }

    const confirmation = enabled
      ? await useSwalProceedConfirm(
          "Restore Module?",
          `${module.name} (${module.code}) will restore ${Number(
            module.missingCount ?? 0
          )} missing row(s) from the tenant JSON master.`,
          "Restore"
        )
      : await useSwalDeleteConfirm(
          "Remove Module?",
          `${module.name} (${module.code}) will permanently remove ${Number(
            module.existingCount ?? 0
          )} installed row(s) from HS_MENU. The rows remain recoverable from JSON.`
        );

    if (!confirmation?.isConfirmed) return;

    setSavingKey(operationKey);

    try {
      const { data } = await apiClient.post(
        "/heartstrong/modules",
        {
          scope: "module",
          moduleCode: module.code,
          moduleName: module.name,
          enabled,
        },
        {
          withCredentials: true,
        }
      );

      await load({ silent: true });

      if (enabled) {
        await useSwalSuccessAlert(
          "Success!",
          data?.message ||
            `${module.name} restored successfully.`
        );
      } else {
        await useSwalDeleteRecord(
          "Removed",
          data?.message ||
            `${module.name} has been removed.`
        );
      }
    } catch (error) {
      await showApiError({
        title: enabled
          ? "Unable to restore module"
          : "Unable to remove module",
        error,
        fallback:
          "The module rows were not updated.",
        details: [
          `${module.name} (${module.code})`,
        ],
      });
    } finally {
      setSavingKey("");
    }
  };

  const updateSelectedModules = async (
    enabled
  ) => {
    if (selectedModules.length === 0) {
      await showValidation({
        title: "No modules selected",
        message:
          "Select at least one module using the checkbox before continuing.",
        details: [
          "Use Select All to mark every module.",
          "You can still open a module without selecting it.",
        ],
        confirmButtonText: "Select Modules",
      });
      return;
    }

    const candidates = selectedModules.filter(
      (module) =>
        enabled
          ? Number(module.missingCount ?? 0) > 0
          : Number(module.existingCount ?? 0) > 0
    );

    if (candidates.length === 0) {
      await showValidation({
        title: enabled
          ? "Selected modules are already installed"
          : "Selected modules are already removed",
        message: enabled
          ? "None of the selected modules has a missing HS_MENU row to restore."
          : "None of the selected modules has an installed HS_MENU row to remove.",
        details: selectedModules
          .slice(0, 8)
          .map(
            (module) =>
              `${module.name} (${module.code})`
          ),
      });
      return;
    }

    const skippedCount =
      selectedModules.length - candidates.length;

    const affectedEstimate = candidates.reduce(
      (total, module) =>
        total +
        Number(
          enabled
            ? module.missingCount ?? 0
            : module.existingCount ?? 0
        ),
      0
    );

    const skippedMessage =
      skippedCount > 0
        ? ` ${skippedCount} selected module(s) will be skipped because they do not require this action.`
        : "";

    const confirmation = enabled
      ? await useSwalProceedConfirm(
          `Restore ${candidates.length} Selected Module(s)?`,
          `${affectedEstimate} missing row(s) will be restored from the tenant JSON master.${skippedMessage}`,
          "Restore Selected"
        )
      : await useSwalDeleteConfirm(
          `Remove ${candidates.length} Selected Module(s)?`,
          `${affectedEstimate} installed row(s) will be permanently removed from HS_MENU. The rows remain recoverable from JSON.${skippedMessage}`
        );

    if (!confirmation?.isConfirmed) return;

    setSavingKey(
      enabled
        ? "bulk-restore"
        : "bulk-remove"
    );

    let successfulModules = 0;
    let affectedRows = 0;
    const failedModules = [];

    for (const module of candidates) {
      try {
        const { data } = await apiClient.post(
          "/heartstrong/modules",
          {
            scope: "module",
            moduleCode: module.code,
            moduleName: module.name,
            enabled,
          },
          {
            withCredentials: true,
          }
        );

        successfulModules += 1;
        affectedRows += Number(
          data?.data?.affectedRows ?? 0
        );
      } catch (error) {
        failedModules.push({
          module,
          message: errorText(
            error,
            "Unknown server error"
          ),
        });
      }
    }

    await load({ silent: true });

    setSelectedModuleKeys(
      failedModules.map(
        ({ module }) =>
          moduleKeyFor(module)
      )
    );

    if (successfulModules > 0) {
      if (enabled) {
        await useSwalSuccessAlert(
          "Success!",
          `${successfulModules} module(s) restored. ${affectedRows} row(s) were inserted.`
        );
      } else {
        await useSwalDeleteRecord(
          "Removed",
          `${successfulModules} module(s) removed. ${affectedRows} row(s) were deleted.`
        );
      }
    }

    if (failedModules.length > 0) {
      await showApiError({
        title: `${failedModules.length} module operation(s) failed`,
        error: {
          message:
            "Some selected modules could not be updated. Failed modules remain selected.",
        },
        fallback:
          "Some modules could not be updated.",
        details: failedModules.map(
          ({ module, message }) =>
            `${module.name} (${module.code}): ${message}`
        ),
      });
    }

    setSavingKey("");
  };

  const restoreAll = async () => {
    if (Number(meta.totalMissingRows ?? 0) === 0) {
      await showValidation({
        title: "Nothing to restore",
        message:
          "Every row in the tenant JSON master is already installed in HS_MENU.",
      });
      return;
    }

    const confirmation =
      await useSwalProceedConfirm(
        "Restore All Removed Menus?",
        `${Number(
          meta.totalMissingRows ?? 0
        )} missing HS_MENU row(s) will be restored from the current tenant JSON master.`,
        "Restore All"
      );

    if (!confirmation?.isConfirmed) return;

    setSavingKey("reset-all");

    try {
      const { data } = await apiClient.post(
        "/heartstrong/modules/reset",
        {},
        {
          withCredentials: true,
        }
      );

      await load({ silent: true });
      setSelectedModuleKeys([]);

      await useSwalSuccessAlert(
        "Success!",
        data?.message ||
          "Missing HS_MENU rows were restored."
      );
    } catch (error) {
      await showApiError({
        title: "Unable to restore all modules",
        error,
        fallback:
          "HS_MENU could not be restored from JSON.",
      });
    } finally {
      setSavingKey("");
    }
  };

  const totalMasterRows = Number(
    meta.totalMasterRows ?? 0
  );
  const totalExistingRows = Number(
    meta.totalExistingRows ?? 0
  );
  const totalMissingRows = Number(
    meta.totalMissingRows ?? 0
  );

  return (
    <section className="space-y-3">
      {(savingKey !== "" || isRefreshing) && (
        <LoadingSpinner />
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-4 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black">
                Module Licensing
              </h2>

              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-blue-100">
                JSON-backed
              </span>
            </div>

            <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-blue-100/90">
              Select modules on the left. Review and
              manage the selected module's menus on the
              right.
            </p>

            {!!meta.snapshotFile && (
              <p
                className="mt-2 max-w-4xl truncate font-mono text-[10px] font-bold text-blue-200"
                title={meta.snapshotFile}
              >
                {meta.snapshotFile}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black">
              {modules.length} modules
            </span>

            <span className="rounded-lg bg-emerald-400/15 px-3 py-2 text-xs font-black text-emerald-100">
              {totalExistingRows} installed
            </span>

            <span className="rounded-lg bg-rose-400/15 px-3 py-2 text-xs font-black text-rose-100">
              {totalMissingRows} removed
            </span>

            <button
              type="button"
              onClick={restoreAll}
              disabled={
                loading ||
                savingKey !== "" ||
                totalMissingRows === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-xs font-black text-blue-800 dark:text-blue-200 transition hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={14} />
              {savingKey === "reset-all"
                ? "Restoring..."
                : "Restore All"}
            </button>

            <button
              type="button"
              onClick={() => load()}
              disabled={
                loading ||
                savingKey !== "" ||
                isRefreshing
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={
                  loading || isRefreshing ? "animate-spin" : ""
                }
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingCards count={4} />
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
          No HS_MENU modules were found in the JSON master.
        </div>
      ) : (
        <div className="grid gap-3 xl:h-[calc(100vh-270px)] xl:min-h-[560px] xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    Module Selection
                  </p>

                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {selectedModules.length} selected
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-black text-slate-700 dark:text-slate-200 transition hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40">
                  <input
                    type="checkbox"
                    checked={allModulesSelected}
                    onChange={toggleSelectAllModules}
                    disabled={savingKey !== ""}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />

                  {allModulesSelected
                    ? "Clear"
                    : "Select All"}
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedModules(true)
                  }
                  disabled={savingKey !== ""}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  {savingKey === "bulk-restore"
                    ? "Restoring..."
                    : "Restore"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateSelectedModules(false)
                  }
                  disabled={savingKey !== ""}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {savingKey === "bulk-remove"
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-black">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-2 text-emerald-700 dark:text-emerald-300">
                  {selectedInstalledRows} installed rows
                </div>

                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 px-2.5 py-2 text-rose-700 dark:text-rose-300">
                  {selectedRemovedRows} removed rows
                </div>
              </div>
            </div>

            <div className="min-h-[320px] flex-1 overflow-y-auto p-2 xl:min-h-0">
              <div className="space-y-1.5">
                {modules.map((module) => {
                  const moduleKey =
                    moduleKeyFor(module);
                  const selected =
                    selectedModuleKeys.includes(
                      moduleKey
                    );
                  const active =
                    moduleKey ===
                    moduleKeyFor(activeModule);
                  const fullyRemoved =
                    Number(module.existingCount ?? 0) ===
                    0;
                  const fullyInstalled =
                    Number(module.missingCount ?? 0) ===
                    0;

                  return (
                    <div
                      key={moduleKey}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition ${
                        active
                          ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-100"
                          : selected
                            ? "border-sky-300 bg-sky-50/60"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-300 hover:bg-sky-50/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleModuleSelection(
                            moduleKey
                          )
                        }
                        disabled={savingKey !== ""}
                        title={`Select ${module.name}`}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setActiveModuleKey(
                            moduleKey
                          );
                          setSearchTerm("");
                          setSelectedMenuKeys([]);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-slate-900 dark:text-slate-100">
                              {module.name}
                            </p>

                            <p className="mt-0.5 font-mono text-[10px] font-black text-blue-700 dark:text-blue-300">
                              {module.code}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                                fullyRemoved
                                  ? "bg-rose-100 text-rose-700 dark:text-rose-300"
                                  : fullyInstalled
                                    ? "bg-emerald-100 text-emerald-700 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {fullyRemoved
                                ? "Removed"
                                : fullyInstalled
                                  ? "Installed"
                                  : "Partial"}
                            </span>

                            <p className="mt-1 text-[10px] font-black text-slate-500 dark:text-slate-400">
                              {module.existingCount ?? 0}/
                              {module.menuCount ?? 0}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-black text-slate-950 dark:text-white">
                      {activeModule?.name}
                    </p>

                    <span className="rounded-full bg-blue-100 px-2 py-1 font-mono text-[9px] font-black text-blue-700 dark:text-blue-300">
                      {activeModule?.code}
                    </span>

                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[9px] font-black text-slate-600 dark:text-slate-300">
                      {activeModule?.existingCount ?? 0}/
                      {activeModule?.menuCount ?? 0} installed
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-950/30">
                      <input
                        type="checkbox"
                        checked={
                          allVisibleInstalledMenusSelected
                        }
                        onChange={
                          toggleSelectAllVisibleMenus
                        }
                        disabled={
                          savingKey !== "" ||
                          installedFilteredItems.length === 0
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                      />

                      {allVisibleInstalledMenusSelected
                        ? "Clear Visible"
                        : "Select Visible"}
                    </label>

                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      {selectedMenus.length} selected
                    </span>
                  </div>

                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(
                          event.target.value
                        )
                      }
                      placeholder="Search menu..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 pl-8 pr-3 text-xs font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950 sm:w-52"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={removeSelectedMenus}
                    disabled={
                      savingKey !== "" ||
                      selectedMenus.length === 0
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    {savingKey === "bulk-menu-remove"
                      ? "Removing Selected..."
                      : `Remove Selected${
                          selectedMenus.length > 0
                            ? ` (${selectedMenus.length})`
                            : ""
                        }`}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateWholeModule(
                        activeModule,
                        true
                      )
                    }
                    disabled={
                      savingKey !== "" ||
                      Number(
                        activeModule?.missingCount ?? 0
                      ) === 0
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    {savingKey ===
                    `module:${moduleKeyFor(activeModule)}:true`
                      ? "Restoring..."
                      : "Restore Module"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateWholeModule(
                        activeModule,
                        false
                      )
                    }
                    disabled={
                      savingKey !== "" ||
                      Number(
                        activeModule?.existingCount ?? 0
                      ) === 0
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    {savingKey ===
                    `module:${moduleKeyFor(activeModule)}:false`
                      ? "Removing..."
                      : "Remove Module"}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-[360px] flex-1 overflow-auto xl:min-h-0">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="w-[44px] px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={
                          allVisibleInstalledMenusSelected
                        }
                        onChange={
                          toggleSelectAllVisibleMenus
                        }
                        disabled={
                          savingKey !== "" ||
                          installedFilteredItems.length === 0
                        }
                        title="Select all visible installed menus"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                      />
                    </th>

                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Menu Code
                    </th>

                    <th className="min-w-[220px] px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Menu Name
                    </th>

                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Sub Menu
                    </th>

                    <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Visibility
                    </th>

                    <th className="sticky right-0 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Installed
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.map((item) => {
                    const key =
                      item.snapshotKey;
                    const operationKey =
                      `menu:${key}`;
                    const menuSelected =
                      selectedMenuKeys.includes(key);

                    return (
                      <tr
                        key={key}
                        className={
                          menuSelected
                            ? "bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                            : item.exists
                              ? "hover:bg-sky-50/40 dark:hover:bg-slate-800/60"
                              : "bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
                        }
                      >
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={menuSelected}
                            onChange={() =>
                              toggleMenuSelection(key)
                            }
                            disabled={
                              savingKey !== "" ||
                              !item.exists
                            }
                            title={
                              item.exists
                                ? `Select ${item.menuName}`
                                : "Removed menus cannot be selected for removal"
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-600"
                          />
                        </td>

                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] font-black text-blue-700 dark:text-blue-300">
                          {item.menuCode || "—"}
                        </td>

                        <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {item.menuName || "—"}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-300">
                          {item.subMenu || "—"}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider ${
                              item.isVisible
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {item.isVisible
                              ? "Visible"
                              : "Hidden"}
                          </span>
                        </td>

                        <td
                          className={`sticky right-0 px-3 py-2.5 ${
                            item.exists
                              ? "bg-white dark:bg-slate-900"
                              : "bg-rose-50 dark:bg-rose-950/30"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              label={`Install ${item.menuName}`}
                              enabled={Boolean(
                                item.exists
                              )}
                              disabled={
                                savingKey !== ""
                              }
                              onChange={(next) =>
                                updateMenu(
                                  activeModule,
                                  item,
                                  next
                                )
                              }
                            />

                            <span
                              className={`min-w-[72px] text-left text-[10px] font-black ${
                                item.exists
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-rose-600 dark:text-rose-300"
                              }`}
                            >
                              {savingKey === operationKey
                                ? "Updating..."
                                : item.exists
                                  ? "Installed"
                                  : "Removed"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        No matching menu rows were found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {filteredItems.length} menu row(s) displayed
                {selectedMenus.length > 0
                  ? ` · ${selectedMenus.length} selected`
                  : ""}.
              </span>

              <span>
                Select installed menus and use Remove Selected.
                Removed rows remain recoverable from JSON.
              </span>
            </div>
          </main>
        </div>
      )}
    </section>
  );
}

function LicenseSeatsTab() {
  const [status, setStatus] = useState(null);
  const [seatCount, setSeatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSeatNumbers, setShowSeatNumbers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get(
        "/license-management/status",
        {
          withCredentials: true,
        }
      );

      const next = data?.data ?? null;
      setStatus(next);
      setSeatCount(Number(next?.seatCap ?? 0));
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load license seats",
        text: errorText(
          error,
          "The license seat setup could not be retrieved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentCap = Number(status?.seatCap ?? 0);
  const activeSeats = Number(status?.activeSeats ?? 0);
  const remainingSeats = Number(
    status?.remainingSeats ?? 0
  );
  const proposedCap = Number(seatCount ?? 0);
  const hasChanges =
    Number.isInteger(proposedCap) &&
    proposedCap !== currentCap;

  const utilization =
    currentCap > 0
      ? Math.min(
          100,
          Math.round(
            (activeSeats / currentCap) * 100
          )
        )
      : 0;

  const revealSeatNumbers = () => {
    setShowSeatNumbers(true);
  };

  const hideSeatNumbers = () => {
    setShowSeatNumbers(false);
  };

  const displaySeatNumber = (value) => {
    if (loading) return "—";

    return showSeatNumbers ? String(value) : "•••";
  };

  const filteredUsers = useMemo(() => {
    const users = Array.isArray(status?.activeUsers)
      ? status.activeUsers
      : [];

    const query = searchTerm.trim().toLowerCase();

    if (!query) return users;

    return users.filter((row) => {
      const code = String(
        row.USER_CODE ?? row.user_code ?? ""
      ).toLowerCase();

      const name = String(
        row.USER_NAME ?? row.user_name ?? ""
      ).toLowerCase();

      return (
        code.includes(query) ||
        name.includes(query)
      );
    });
  }, [searchTerm, status?.activeUsers]);

  const save = async () => {
    const count = Number(seatCount);

    if (!Number.isInteger(count) || count < 0) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid seat count",
        text: "Enter a whole number equal to or greater than zero.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    if (!hasChanges) return;

    const result = await Swal.fire({
      icon:
        count < activeSeats
          ? "warning"
          : "question",
      title: "Update license seats?",
      text:
        count < activeSeats
          ? `There are currently ${activeSeats} occupied seats based on LOGIN_STAT = 1.`
          : `Change the allowed seats from ${currentCap} to ${count}?`,
      showCancelButton: true,
      confirmButtonText: "Save changes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1d4ed8",
    });

    if (!result.isConfirmed) return;

    setSaving(true);

    try {
      const { data } = await apiClient.post(
        "/license-management/seats",
        { count },
        {
          withCredentials: true,
        }
      );

      await Swal.fire({
        icon: "success",
        title: "License seats updated",
        text:
          data?.message ||
          "The seat capacity was updated successfully.",
        confirmButtonColor: "#1d4ed8",
      });

      await load();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to update license seats",
        text: errorText(
          error,
          "The license seat capacity was not updated."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="relative">
      {saving && <LoadingSpinner />}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white">
            License Seat Setup
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Occupied seats are based on USERS.LOGIN_STAT = 1,
            not the number of users with ACTIVE = Y. Seat numbers are
            hidden by default; press and hold the eye button to reveal them.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onPointerDown={revealSeatNumbers}
            onPointerUp={hideSeatNumbers}
            onPointerCancel={hideSeatNumbers}
            onPointerLeave={hideSeatNumbers}
            onContextMenu={(event) => event.preventDefault()}
            className={secondaryButton}
            aria-label="Press and hold to reveal seat numbers"
            title="Press and hold to reveal seat numbers"
          >
            {showSeatNumbers ? (
              <EyeOff size={16} />
            ) : (
              <Eye size={16} />
            )}
            {showSeatNumbers
              ? "Release to Hide"
              : "Hold to Reveal"}
          </button>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                License Metric
              </th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Current Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Basis
              </th>
              <th className="min-w-[260px] px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Update
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr>
              <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                Seat Capacity
              </td>
              <td className="px-4 py-3 text-lg font-black text-blue-700 dark:text-blue-300">
                {displaySeatNumber(currentCap)}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                Encrypted LAC value in HS_SYS
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type={
                        showSeatNumbers ? "number" : "password"
                      }
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={seatCount}
                      onChange={(event) =>
                        setSeatCount(event.target.value)
                      }
                      className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 py-2 pl-3 pr-10 text-center font-black tracking-widest outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950"
                      aria-label="Allowed license seats"
                    />

                    <button
                      type="button"
                      onPointerDown={revealSeatNumbers}
                      onPointerUp={hideSeatNumbers}
                      onPointerCancel={hideSeatNumbers}
                      onPointerLeave={hideSeatNumbers}
                      onContextMenu={(event) =>
                        event.preventDefault()
                      }
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-700"
                      aria-label="Press and hold to reveal allowed seats"
                      title="Press and hold to reveal"
                    >
                      {showSeatNumbers ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={save}
                    disabled={
                      loading ||
                      saving ||
                      !hasChanges
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-40"
                  >
                    <Save size={14} />
                    {saving ? "Saving..." : "Save"}
                  </button>

                  <span className="text-[11px] font-semibold text-slate-400">
                    Press and hold the eye to view
                  </span>
                </div>
              </td>
            </tr>

            <tr>
              <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                Occupied Seats
              </td>
              <td className="px-4 py-3 text-lg font-black text-emerald-700 dark:text-emerald-300">
                {displaySeatNumber(activeSeats)}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                USERS.LOGIN_STAT = 1, excluding HEARTSTRONG
                and MIRACLE
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Updated by active login sessions
              </td>
            </tr>

            <tr>
              <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                Remaining Seats
              </td>
              <td className="px-4 py-3 text-lg font-black text-amber-700 dark:text-amber-300">
                {displaySeatNumber(remainingSeats)}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                Seat Capacity − Occupied Seats
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Calculated automatically
              </td>
            </tr>

            <tr>
              <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                Utilization
              </td>
              <td className="px-4 py-3 text-lg font-black text-slate-950 dark:text-white">
                {loading ? "—" : `${utilization}%`}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                Occupied Seats ÷ Seat Capacity
              </td>
              <td className="px-4 py-3">
                <div className="h-2.5 min-w-[220px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      utilization >= 90
                        ? "bg-rose-500"
                        : utilization >= 70
                          ? "bg-amber-500"
                          : "bg-blue-700"
                    }`}
                    style={{
                      width: `${utilization}%`,
                    }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-slate-900 dark:text-slate-100">
              Users Occupying License Seats
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current users with LOGIN_STAT = 1
            </p>
          </div>

          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search user..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950 sm:w-60"
            />
          </div>
        </div>

        <div className="max-h-[calc(100vh-430px)] min-h-[260px] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  User Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  User Name
                </th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Login Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Last Seen
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading &&
                Array.from({ length: 4 }).map(
                  (_, index) => (
                    <tr key={index}>
                      <td
                        colSpan={4}
                        className="px-4 py-4"
                      >
                        <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    </tr>
                  )
                )}

              {!loading &&
                filteredUsers.map((row) => {
                  const code =
                    row.USER_CODE ??
                    row.user_code ??
                    "—";

                  return (
                    <tr
                      key={code}
                      className="hover:bg-sky-50/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-black text-blue-700 dark:text-blue-300">
                        {code}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {row.USER_NAME ??
                          row.user_name ??
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          LOGIN_STAT = 1
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                        {row.LAST_SEEN_AT ??
                          row.last_seen_at ??
                          "—"}
                      </td>
                    </tr>
                  );
                })}

              {!loading &&
                filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      No users are currently occupying
                      license seats.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Showing {filteredUsers.length} occupied seats
        </div>
      </div>
    </section>
  );
}

export default function HeartStrong() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("switches");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState(() => ({
    code:
      getTenant?.() ||
      localStorage.getItem("companyCode") ||
      "",
    company: "",
    database: "",
  }));

  useEffect(() => {
    let cancelled = false;

    const resolveCurrentTenant = async () => {
      const selectedCode = String(
        getTenant?.() ||
          localStorage.getItem("companyCode") ||
          ""
      ).trim();

      if (!selectedCode) {
        if (!cancelled) {
          setCurrentTenant({
            code: "",
            company: "",
            database: "",
          });
        }
        return;
      }

      try {
        const { data } = await apiClient.get("/companies", {
          withCredentials: true,
          headers: {
            "X-Skip-Logout-Broadcast": "1",
            "X-Use-Credentials": "1",
          },
        });

        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : data?.data && typeof data.data === "object"
              ? Object.values(data.data)
              : [];

        const selectedUpper = selectedCode.toUpperCase();

        const matchedTenant = rows.find((row) => {
          const rowCode = String(
            row?.code ?? row?.CODE ?? ""
          )
            .trim()
            .toUpperCase();

          const rowDatabase = String(
            row?.database ?? row?.DATABASE ?? ""
          )
            .trim()
            .toUpperCase();

          return (
            rowCode === selectedUpper ||
            rowDatabase === selectedUpper
          );
        });

        if (cancelled) return;

        setCurrentTenant({
          code: selectedCode,
          company: String(
            matchedTenant?.company ??
              matchedTenant?.COMPANY ??
              ""
          ).trim(),
          database: String(
            matchedTenant?.database ??
              matchedTenant?.DATABASE ??
              ""
          ).trim(),
        });
      } catch (error) {
        console.warn(
          "Unable to resolve selected tenant details:",
          error
        );

        if (!cancelled) {
          setCurrentTenant({
            code: selectedCode,
            company: "",
            database: "",
          });
        }
      }
    };

    const handleTenantChange = () => {
      resolveCurrentTenant();
    };

    resolveCurrentTenant();

    window.addEventListener("focus", handleTenantChange);
    window.addEventListener("storage", handleTenantChange);
    window.addEventListener(
      "tenant-changed",
      handleTenantChange
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        "focus",
        handleTenantChange
      );
      window.removeEventListener(
        "storage",
        handleTenantChange
      );
      window.removeEventListener(
        "tenant-changed",
        handleTenantChange
      );
    };
  }, []);

  useEffect(() => {
    const toggleFromNavbar = () => {
      setSidebarOpen((current) => !current);
    };

    window.addEventListener(
      "heartstrong:toggle-sidebar",
      toggleFromNavbar
    );

    return () => {
      window.removeEventListener(
        "heartstrong:toggle-sidebar",
        toggleFromNavbar
      );
    };
  }, []);

  const canManage = useMemo(
    () =>
      ["LICENSE_ADMIN", "SYSTEM_ADMIN"].includes(
        String(user?.ACCOUNT_MODE || "").toUpperCase()
      ),
    [user?.ACCOUNT_MODE]
  );

  const activeDefinition =
    TABS.find((tab) => tab.id === activeTab) || TABS[0];

  const ActiveTab =
    activeTab === "switches"
      ? ApplicationSwitchTab
      : activeTab === "documents"
        ? DocumentSetupTab
        : activeTab === "dropdowns"
          ? DocumentDropdownTab
          : activeTab === "modules"
            ? ModuleLicensingTab
            : activeTab === "environment"
              ? EnvironmentTab
              : LicenseSeatsTab;

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  if (!canManage) {
    return (
      <main className="mt-[80px] min-h-screen bg-slate-100/80 px-3 py-4">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center shadow-sm">
            <Settings2
              className="mx-auto text-amber-600"
              size={38}
            />
            <h1 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Access denied
            </h1>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              Your account is not allowed to access HeartStrong.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const accountCode =
    user?.SYSTEM_ACCOUNT_CODE ||
    user?.PERMISSION_USER_CODE ||
    user?.USER_CODE ||
    "HEARTSTRONG";

  return (
    <main className="mt-[52px] min-h-screen bg-slate-100/80 px-2 py-2 transition-colors dark:bg-slate-950 sm:px-3 sm:py-3 lg:px-4 lg:py-3">
      <div className="mx-auto max-w-[1900px] space-y-2 sm:space-y-3">
        {/* Header - aligned with Employee Access Settings */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 text-white shadow-lg dark:from-slate-950 dark:via-blue-950 dark:to-slate-900">
          <div className="flex flex-col gap-2.5 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <Settings2 size={22} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-extrabold sm:text-xl">
                      HeartStrong
                    </h1>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-100">
                      <CheckCircle2 size={11} />
                      Online
                    </span>
                  </div>

                  <p className="mt-0.5 text-[11px] leading-4 text-blue-100 sm:text-sm">
                    Secure application, module, environment, and license setup for NAYSA Financials.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                  <Database size={12} />
                  {currentTenant.company ||
                    currentTenant.code ||
                    "No tenant selected"}
                </span>

                {currentTenant.database && (
                  <span className="rounded-full bg-white/10 px-3 py-1.5 font-mono">
                    {currentTenant.database}
                  </span>
                )}

                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {accountCode}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {user?.ACCOUNT_MODE}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 sm:flex-none"
              >
                <Menu size={16} />
                Setup Navigation
              </button>
            </div>
          </div>
        </section>

        {/* Configuration section selector */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 shadow-sm dark:shadow-black/20 sm:p-3">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Configuration Sections
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose the HeartStrong setup area to manage.
              </p>
            </div>

            <span className="mt-2 rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-bold text-blue-800 dark:text-blue-200 sm:mt-0">
              {TABS.length} Sections
            </span>
          </div>

          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 xl:grid-cols-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const selected = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={`group min-w-[170px] snap-start rounded-xl border p-2.5 text-left transition sm:min-w-0 sm:p-3 ${
                    selected
                      ? "border-blue-300 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-100"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        selected
                          ? "bg-blue-800 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-700"
                      }`}
                    >
                      <Icon size={16} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-xs font-extrabold ${
                          selected
                            ? "text-blue-900"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {tab.label}
                      </span>

                      <span className="mt-0.5 block truncate text-[9px] text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-[10px]">
                        {tab.description}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Active HeartStrong content */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-black/20 sm:p-4 lg:p-5">
          <ActiveTab />
        </section>
      </div>

      {/* Compact navigation drawer retained for navbar/mobile trigger */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[120] flex">
          <aside className="flex h-full w-[340px] max-w-[90vw] flex-col bg-white dark:bg-slate-950 shadow-2xl">
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 p-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-100">
                    HeartStrong
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold">
                    Setup Navigation
                  </h2>
                  <p className="mt-1 text-xs text-blue-100">
                    Select a configuration section.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-xl border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
                  aria-label="Close setup navigation"
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto p-3">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const selected = tab.id === activeTab;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-blue-300 bg-blue-50 dark:bg-blue-950/40 text-blue-900"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        selected
                          ? "bg-blue-800 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <Icon size={16} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {tab.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {tab.description}
                      </span>
                    </span>

                    <ChevronRight
                      size={15}
                      className={
                        selected
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-slate-400"
                      }
                    />
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Protected setup area
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  Available only to LICENSE_ADMIN and SYSTEM_ADMIN accounts.
                </p>
              </div>
            </div>
          </aside>

          <button
            type="button"
            className="flex-1 bg-slate-950/40 backdrop-blur-[1px]"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close setup navigation overlay"
          />
        </div>
      )}
    </main>
  );
}
