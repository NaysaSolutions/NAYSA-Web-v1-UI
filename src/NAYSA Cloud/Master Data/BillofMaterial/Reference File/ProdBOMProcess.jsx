import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faRotateLeft,
  faSave,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import {
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalErrorAlert,
  useSwalErrorAlertAPI,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const initialForm = {
  processCode: "",
  processName: "",
  active: "Y",
};

const initialRegistration = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const initialBOMProcessForm = {
  bomId: "",
  processEffectivityDate: "",
  bomCode: "",
  bomEffectivityDate: "",
  itemType: "",
  itemCode: "",
  itemDescription: "",
  uom: "",
  quantity: "0.000000",
  remarks: "",
};

const emptyProcessLine = (lineNo = 1) => ({
  lineNo,
  processCode: "",
  processName: "",
  cycleTime: "0.000000",
});

const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatQuantity = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });

const ProdBOMProcess = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const formTopRef = useRef(null);

  const [activeTab, setActiveTab] = useState("list");
  const [formData, setFormData] = useState(initialForm);
  const [registrationInfo, setRegistrationInfo] = useState(initialRegistration);
  const [selectedProcessCode, setSelectedProcessCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [tableFields, setTableFields] = useState([]);
  const [bomProcessForm, setBOMProcessForm] = useState(initialBOMProcessForm);
  const [bomProcessRows, setBOMProcessRows] = useState(() => [
    emptyProcessLine(1),
    emptyProcessLine(2),
    emptyProcessLine(3),
  ]);
  const [isBOMProcessEditing, setIsBOMProcessEditing] = useState(false);

  const userCode = user?.USER_CODE || user?.userCode || "ADMIN";

  const { data: processList = [], isLoading: isListLoading } = useQuery({
    queryKey: ["prodBOMProcessList"],
    queryFn: async () => parseResult(await apiClient.get("/prodBOMProcess/load")),
  });

  const {
    data: bomProcessSummary = [],
    isFetching: isSummaryLoading,
    refetch: findBOMProcessSummary,
  } = useQuery({
    queryKey: ["prodBOMProcessSummary"],
    queryFn: async () =>
      parseResult(await apiClient.get("/prodBOMProcess/loadBOMProcess")),
    enabled: false,
  });

  const resetBOMProcessSummary = () => {
    queryClient.setQueryData(["prodBOMProcessSummary"], []);
  };

  const resetForm = () => {
    setFormData(initialForm);
    setRegistrationInfo(initialRegistration);
    setSelectedProcessCode("");
    setIsEditing(false);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodBOMProcess/upsert", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) {
        useSwalErrorAlert("Save Failed", result?.errormsg || "Unable to save the BOM Process.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["prodBOMProcessList"] });
      useSwalSuccessAlert("Saved", "BOM Process saved successfully.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodBOMProcess/delete", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prodBOMProcessList"] });
      useSwalDeleteRecord("Deleted", "BOM Process deleted successfully.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Failed", error),
  });

  const getMax = (columnName) =>
    useGetFieldLength(tableFields, columnName) || (columnName === "PROCESS_CODE" ? 20 : 100);

  const updateForm = (updates) => {
    setFormData((previous) => ({ ...previous, ...updates }));
  };

  const handleEdit = (row) => {
    setFormData({
      processCode: row?.processCode || "",
      processName: row?.processName || "",
      active: row?.active || "Y",
    });
    setRegistrationInfo({
      registeredBy: row?.registeredBy || "",
      registeredDate: row?.registeredDate || "",
      lastUpdatedBy: row?.lastUpdatedBy || "",
      lastUpdatedDate: row?.lastUpdatedDate || "",
    });
    setSelectedProcessCode(row?.processCode || "");
    setIsEditing(true);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const checkDuplicate = async (processCode) => {
    const cleanCode = String(processCode || "").trim().toUpperCase();
    if (!cleanCode || selectedProcessCode) return false;

    try {
      setIsChecking(true);
      const response = await apiClient.post("/prodBOMProcess/checkDuplicate", {
        json_data: { processCode: cleanCode },
      });
      const raw = response?.data?.data?.[0]?.result;
      const result = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (String(result?.result) === "1") {
        updateForm({ processCode: "" });
        useSwalErrorAlert("Duplicate Process Code", `${cleanCode} is already registered.`);
        return true;
      }
    } catch (error) {
      useSwalErrorAlertAPI("Validation Failed", error);
      return true;
    } finally {
      setIsChecking(false);
    }

    return false;
  };

  const handleSave = async () => {
    const processCode = formData.processCode.trim().toUpperCase();
    const processName = formData.processName.trim();

    if (!processCode || !processName) {
      useSwalErrorAlert(
        "Required Fields",
        "Process Code and Process Name are required.",
      );
      return;
    }

    if (processCode.length > getMax("PROCESS_CODE")) {
      useSwalErrorAlert(
        "Invalid Process Code",
        `Process Code cannot exceed ${getMax("PROCESS_CODE")} characters.`,
      );
      return;
    }

    if (processName.length > getMax("PROCESS_NAME")) {
      useSwalErrorAlert(
        "Invalid Process Name",
        `Process Name cannot exceed ${getMax("PROCESS_NAME")} characters.`,
      );
      return;
    }

    if (!selectedProcessCode && (await checkDuplicate(processCode))) return;

    saveMutation.mutate({
      json_data: {
        processCode,
        processName,
        active: formData.active || "Y",
        userCode,
      },
    });
  };

  const handleDelete = async (row = null) => {
    const processCode = row?.processCode || selectedProcessCode;
    const processName = row?.processName || formData.processName;
    if (!processCode) return;

    try {
      setIsChecking(true);
      const usageResponse = await apiClient.post("/prodBOMProcess/checkInUsed", {
        json_data: { processCode },
      });
      const raw = usageResponse?.data?.data?.[0]?.result;
      const usage = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (String(usage?.result) === "1") {
        useSwalErrorAlert("Cannot Delete", "This BOM Process is already in use.");
        return;
      }

      const confirmation = await useSwalDeleteConfirm(
        "Delete BOM Process?",
        `Delete ${processCode} - ${processName}?`,
      );
      if (!confirmation?.isConfirmed) return;

      deleteMutation.mutate({
        json_data: { processCode, userCode },
      });
    } catch (error) {
      useSwalErrorAlertAPI("Delete Validation Failed", error);
    } finally {
      setIsChecking(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 90,
        minWidth: 90,
        maxWidth: 90,
        sortable: false,
        filterable: false,
        requiredVisible: true,
        render: (row) => (
          <div className="flex w-full items-center justify-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleEdit(row);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-100 bg-blue-50 text-xs text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
              title="Edit BOM Process"
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(row);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-100 bg-red-50 text-xs text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
              title="Delete BOM Process"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "processCode",
        label: "Process Code",
        sortable: true,
        width: 180,
        requiredVisible: true,
      },
      {
        key: "processName",
        label: "Process Name",
        sortable: true,
        width: 520,
        requiredVisible: true,
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 130,
        requiredVisible: true,
        render: (row) => (row?.active === "Y" ? "Yes" : "No"),
      },
    ],
    [],
  );

  const updateBOMProcessForm = (updates) => {
    setBOMProcessForm((previous) => ({ ...previous, ...updates }));
  };

  const updateProcessLine = (rowIndex, field, value) => {
    setBOMProcessRows((previous) =>
      previous.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  const renumberProcessLines = (rows) =>
    rows.map((row, index) => ({ ...row, lineNo: index + 1 }));

  const addProcessLine = (rowIndex = bomProcessRows.length - 1) => {
    setBOMProcessRows((previous) => {
      const next = [...previous];
      next.splice(rowIndex + 1, 0, emptyProcessLine(rowIndex + 2));
      return renumberProcessLines(next);
    });
  };

  const removeProcessLine = (rowIndex) => {
    setBOMProcessRows((previous) => {
      const next = previous.filter((_, index) => index !== rowIndex);
      return next.length
        ? renumberProcessLines(next)
        : [emptyProcessLine(1)];
    });
  };

  const resetBOMProcess = () => {
    setBOMProcessForm(initialBOMProcessForm);
    setBOMProcessRows([
      emptyProcessLine(1),
      emptyProcessLine(2),
      emptyProcessLine(3),
    ]);
    setIsBOMProcessEditing(false);
  };

  const bomProcessDetailRows = useMemo(
    () =>
      bomProcessRows.map((row, rowIndex) => ({
        ...row,
        rowIndex,
        key: `bom-process-line-${rowIndex}`,
      })),
    [bomProcessRows],
  );

  const bomProcessColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 84,
        minWidth: 84,
        maxWidth: 84,
        sortable: false,
        filterable: false,
        requiredVisible: true,
        render: (row) => (
          <div className="flex w-full items-center justify-center gap-1">
            <button
              type="button"
              disabled={!isBOMProcessEditing}
              onClick={() => addProcessLine(row.rowIndex)}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-blue-100 bg-blue-50 text-[10px] text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Add process line"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button
              type="button"
              disabled={!isBOMProcessEditing}
              onClick={() => removeProcessLine(row.rowIndex)}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-100 bg-red-50 text-[10px] text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Delete process line"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "lineNo",
        label: "LN",
        width: 55,
        minWidth: 55,
        maxWidth: 55,
        sortable: false,
        requiredVisible: true,
        render: (row) => <div className="text-center">{row.lineNo}</div>,
      },
      {
        key: "processCode",
        label: "Process Code",
        width: 190,
        minWidth: 170,
        requiredVisible: true,
        render: (row) => (
          <div className="relative flex items-center">
            <input
              value={row.processCode || ""}
              readOnly
              disabled={!isBOMProcessEditing}
              className="global-tran-td-inputclass-ui !h-7 w-full pr-7 text-[11px]"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className={`absolute right-2 text-xs ${
                isBOMProcessEditing
                  ? "cursor-pointer text-blue-600 hover:text-blue-900"
                  : "cursor-not-allowed text-slate-300"
              }`}
              title="Select BOM Process Code"
            />
          </div>
        ),
      },
      {
        key: "processName",
        label: "Process Description",
        width: 520,
        minWidth: 320,
        requiredVisible: true,
        render: (row) => (
          <input
            value={row.processName || ""}
            disabled
            className="global-tran-td-inputclass-ui !h-7 w-full text-[11px]"
          />
        ),
      },
      {
        key: "cycleTime",
        label: "Cycle Time",
        width: 160,
        minWidth: 140,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => (
          <input
            value={row.cycleTime || ""}
            disabled={!isBOMProcessEditing}
            inputMode="decimal"
            onFocus={(event) => event.target.select()}
            onChange={(event) => {
              let value = event.target.value.replace(/[^0-9.]/g, "");
              const parts = value.split(".");
              if (parts.length > 2) value = `${parts[0]}.${parts.slice(1).join("")}`;
              updateProcessLine(row.rowIndex, "cycleTime", value);
            }}
            onBlur={(event) =>
              updateProcessLine(
                row.rowIndex,
                "cycleTime",
                Number(event.target.value || 0).toFixed(6),
              )
            }
            className="global-tran-td-inputclass-ui !h-7 w-full text-right text-[11px]"
          />
        ),
      },
    ],
    [isBOMProcessEditing, bomProcessRows],
  );

  const bomProcessSummaryColumns = useMemo(
    () => [
      {
        key: "bomCode",
        label: "BOM Code",
        sortable: true,
        width: 135,
        requiredVisible: true,
      },
      {
        key: "processEffectivityDate",
        label: "Process Effectivity Date",
        sortable: true,
        width: 175,
        render: (row) => formatDate(row.processEffectivityDate),
      },
      {
        key: "bomEffectivityDate",
        label: "BOM Effectivity Date",
        sortable: true,
        width: 165,
        render: (row) => formatDate(row.bomEffectivityDate),
      },
      {
        key: "itemType",
        label: "Item Type",
        sortable: true,
        width: 105,
      },
      {
        key: "itemCode",
        label: "Item Code",
        sortable: true,
        width: 145,
      },
      {
        key: "itemDescription",
        label: "Item Description",
        sortable: true,
        width: 280,
      },
      {
        key: "uom",
        label: "UOM",
        sortable: true,
        width: 80,
      },
      {
        key: "quantity",
        label: "BOM Quantity",
        sortable: true,
        width: 130,
        renderType: "number",
        roundingOff: 6,
        render: (row) => (
          <div className="text-right">{formatQuantity(row.quantity)}</div>
        ),
      },
      {
        key: "processCount",
        label: "No. of Processes",
        sortable: true,
        width: 135,
        renderType: "number",
        render: (row) => (
          <div className="text-right">{Number(row.processCount || 0)}</div>
        ),
      },
      {
        key: "totalCycleTime",
        label: "Total Cycle Time",
        sortable: true,
        width: 145,
        renderType: "number",
        roundingOff: 6,
        render: (row) => (
          <div className="text-right">{formatQuantity(row.totalCycleTime)}</div>
        ),
      },
      {
        key: "remarks",
        label: "Remarks",
        sortable: true,
        width: 260,
      },
    ],
    [],
  );

  useEffect(() => {
    let mounted = true;
    useFieldLenghtCheck("BOMPROCESS_REF")
      .then((result) => {
        if (mounted) setTableFields(result || []);
      })
      .catch((error) => console.error("Unable to load BOM Process field lengths.", error));

    return () => {
      mounted = false;
    };
  }, []);

  const tabs = [
    { key: "list", label: "List of BOM Process" },
    { key: "process", label: "BOM Process" },
    { key: "summary", label: "BOM Process Summary" },
  ];

  const isBusy =
    isListLoading ||
    isSummaryLoading ||
    isChecking ||
    saveMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="global-ref-main-div-ui">
      {isBusy && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="grid w-full grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex w-full min-w-0 items-center gap-4 xl:justify-self-start">
            <h1 className="global-ref-headertext-ui w-full truncate text-center xl:w-auto xl:text-left">
              Bill of Materials Process
            </h1>
          </div>

          <div className="flex w-full justify-center xl:w-auto xl:justify-self-center">
            <div className="w-full md:w-auto">
              <div className="no-scrollbar flex flex-nowrap overflow-x-auto border-b border-blue-300 dark:border-gray-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 whitespace-nowrap rounded-md border-b-2 px-3 py-1 text-[10px] font-bold transition-all sm:px-4 sm:py-2 sm:text-[13px] ${
                      activeTab === tab.key
                        ? "border-blue-700 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 flex min-h-8 w-full justify-center xl:mt-0 xl:w-auto xl:justify-self-end">
            {activeTab === "list" && (
              <div>
                <ButtonBar
                  buttons={[
                    {
                      key: "add",
                      label: "Add",
                      icon: faPlus,
                      onClick: () => {
                        resetForm();
                        setIsEditing(true);
                      },
                    },
                    {
                      key: "save",
                      label: "Save",
                      icon: faSave,
                      onClick: handleSave,
                      disabled: !isEditing || isBusy,
                    },
                    {
                      key: "delete",
                      label: "Delete",
                      icon: faTrashAlt,
                      onClick: handleDelete,
                      disabled: !selectedProcessCode || isBusy,
                    },
                    {
                      key: "reset",
                      label: "Reset",
                      icon: faRotateLeft,
                      onClick: resetForm,
                    },
                  ]}
                />
              </div>
            )}
            {activeTab === "process" && (
              <div>
                <ButtonBar
                  buttons={[
                    {
                      key: "add-process-routing",
                      label: "Add",
                      icon: faPlus,
                      onClick: () => {
                        resetBOMProcess();
                        setIsBOMProcessEditing(true);
                      },
                    },
                    {
                      key: "save-process-routing",
                      label: "Save",
                      icon: faSave,
                      disabled: true,
                      title: "Backend integration will be added in the next phase.",
                    },
                    {
                      key: "reset-process-routing",
                      label: "Reset",
                      icon: faRotateLeft,
                      onClick: resetBOMProcess,
                    },
                  ]}
                />
              </div>
            )}
            {activeTab === "summary" && (
              <div>
                <ButtonBar
                  buttons={[
                    {
                      key: "find-process-summary",
                      label: "Find",
                      icon: faMagnifyingGlass,
                      onClick: () => findBOMProcessSummary(),
                      disabled: isSummaryLoading,
                    },
                    {
                      key: "reset-process-summary",
                      label: "Reset",
                      icon: faRotateLeft,
                      onClick: resetBOMProcessSummary,
                      disabled: isSummaryLoading,
                    },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-20">
        {activeTab === "list" ? (
        <div
          ref={formTopRef}
          className="flex h-auto w-full flex-col gap-4 pb-4 pt-4 xl:h-[calc(100vh-205px)] xl:flex-row"
        >
          <div className="flex h-fit w-full shrink-0 flex-col gap-4 xl:w-[400px]">
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-6 border-b pb-2 text-sm font-bold uppercase tracking-wider text-blue-600">
                Process Details
              </h2>
              <div className="space-y-6">
                <FieldRenderer
                  label="Process Code"
                  required
                  type="text"
                  value={formData.processCode}
                  disabled={!isEditing || Boolean(selectedProcessCode)}
                  maxLength={getMax("PROCESS_CODE")}
                  onChange={(value) =>
                    updateForm({ processCode: String(value || "").toUpperCase() })
                  }
                  onBlur={(event) => checkDuplicate(event.target.value)}
                />
                <FieldRenderer
                  label="Process Name"
                  required
                  type="text"
                  value={formData.processName}
                  disabled={!isEditing}
                  maxLength={getMax("PROCESS_NAME")}
                  onChange={(value) => updateForm({ processName: value || "" })}
                />
                <FieldRenderer
                  label="Active"
                  type="select"
                  value={formData.active}
                  disabled={!isEditing}
                  options={[
                    { value: "Y", label: "Yes" },
                    { value: "N", label: "No" },
                  ]}
                  onChange={(value) => updateForm({ active: value })}
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <RegistrationInfo layout="stacked" data={registrationInfo} />
            </div>
          </div>

          <div className="global-tran-table-main-div-ui mt-0 flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <SearchGlobalReferenceTable
              docType="Bill of Materials Process"
              columns={columns}
              data={processList}
              isLoading={isListLoading}
              onRowDoubleClick={handleEdit}
              itemsPerPage={50}
              autoFillGrid
              onRefresh={() =>
                queryClient.invalidateQueries({ queryKey: ["prodBOMProcessList"] })
              }
            />
          </div>
        </div>
      ) : activeTab === "process" ? (
        <div className="w-full pb-4 pt-4">
          <div className="global-tran-header-div-ui !mt-0">
            <div className="global-tran-header-tab-div-ui">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                BOM Information
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-lg lg:grid-cols-4">
              <input
                type="hidden"
                name="bomId"
                value={bomProcessForm.bomId}
                readOnly
              />
              <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 md:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
                <div className="relative w-full">
                  <div
                    className={`global-ref-textbox-ui flex items-stretch ${
                      isBOMProcessEditing
                        ? "global-ref-textbox-enabled"
                        : "global-ref-textbox-disabled"
                    }`}
                  >
                    <DateFormatInput
                      id="processEffectivityDate"
                      className="peer flex-grow cursor-pointer border-none bg-transparent px-3 focus:outline-none"
                      value={bomProcessForm.processEffectivityDate}
                      disabled={!isBOMProcessEditing}
                      onChange={(value) =>
                        updateBOMProcessForm({ processEffectivityDate: value })
                      }
                    />
                  </div>
                  <label
                    htmlFor="processEffectivityDate"
                    className={`global-ref-floating-label ${
                      isBOMProcessEditing
                        ? "global-ref-label-enabled"
                        : "global-ref-label-disabled"
                    }`}
                  >
                    Process Effectivity Date <span className="text-red-500">*</span>
                  </label>
                </div>

                <FieldRenderer
                  id="itemType"
                  label="Item Type"
                  type="text"
                  value={bomProcessForm.itemType}
                  disabled
                  readOnly
                />

                <FieldRenderer
                  id="uom"
                  label="UOM"
                  type="text"
                  value={bomProcessForm.uom}
                  disabled
                  readOnly
                />

                <FieldRenderer
                  id="bomCode"
                  label="BOM Code"
                  type="lookup"
                  required
                  value={bomProcessForm.bomCode}
                  disabled={!isBOMProcessEditing}
                  onLookup={() => {}}
                />

                <FieldRenderer
                  id="itemCode"
                  label="Item Code"
                  type="text"
                  value={bomProcessForm.itemCode}
                  disabled
                  readOnly
                />

                <FieldRenderer
                  id="quantity"
                  label="BOM Quantity"
                  type="amount"
                  value={bomProcessForm.quantity}
                  disabled
                  readOnly
                />

                <div className="relative w-full">
                  <div className="global-ref-textbox-ui global-ref-textbox-disabled flex items-stretch">
                    <DateFormatInput
                      id="bomEffectivityDate"
                      className="peer flex-grow border-none bg-transparent px-3 focus:outline-none"
                      value={bomProcessForm.bomEffectivityDate}
                      disabled
                    />
                  </div>
                  <label
                    htmlFor="bomEffectivityDate"
                    className="global-ref-floating-label global-ref-label-disabled"
                  >
                    BOM Effectivity Date
                  </label>
                </div>

                <div className="md:col-span-1 lg:col-span-2">
                  <FieldRenderer
                    id="itemDescription"
                    label="Item Description"
                    type="text"
                    value={bomProcessForm.itemDescription}
                    disabled
                    readOnly
                  />
                </div>

                <div className="col-span-full">
                  <div className="relative">
                    <textarea
                      id="bomProcessRemarks"
                      rows={3}
                      value={bomProcessForm.remarks}
                      disabled={!isBOMProcessEditing}
                      onChange={(event) =>
                        updateBOMProcessForm({ remarks: event.target.value })
                      }
                      className="peer global-tran-textbox-remarks-ui px-3 pb-2 pt-6"
                    />
                    <label
                      htmlFor="bomProcessRemarks"
                      className="global-tran-floating-label-remarks"
                    >
                      Remarks
                    </label>
                  </div>
                </div>
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <RegistrationInfo layout="stacked" data={initialRegistration} />
              </div>
            </div>
          </div>

          <div className="global-tran-tab-div-ui">
            <div className="global-tran-tab-nav-ui">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Process Details
              </button>
            </div>

            <div className="global-tran-table-main-div-ui relative overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <SearchGlobalReferenceTable
                key={`bom-process-details-${isBOMProcessEditing ? "edit" : "view"}`}
                docType="BOM Process Details"
                columns={bomProcessColumns}
                data={bomProcessDetailRows}
                itemsPerPage={100}
                showFilters
                tableSize="Half"
                autoFit
              />
            </div>

            <div className="global-tran-tab-footer-main-div-ui">
              <div className="global-tran-tab-footer-button-div-ui">
                <button
                  type="button"
                  disabled={!isBOMProcessEditing}
                  onClick={() => addProcessLine()}
                  className="global-tran-tab-footer-button-add-ui disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add Process
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full pb-4 pt-4">
          <div className="global-tran-tab-div-ui !mt-0">
            <div className="global-tran-tab-nav-ui">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                BOM Process Summary
              </button>
            </div>

            <div className="global-tran-table-main-div-ui relative min-h-[420px] overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <SearchGlobalReferenceTable
                docType="BOM Process Summary"
                columns={bomProcessSummaryColumns}
                data={bomProcessSummary}
                isLoading={isSummaryLoading}
                itemsPerPage={100}
                showFilters
                autoFit={false}
                autoFillGrid
                onRefresh={() => findBOMProcessSummary()}
              />
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default ProdBOMProcess;
