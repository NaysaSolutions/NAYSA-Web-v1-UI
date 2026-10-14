import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faCalculator,
  faFlask,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faRotateLeft,
  faSave,
  faSliders,
  faTrashAlt,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
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
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import SearchProdLaborClassRef from "@/NAYSA Cloud/Lookup/SearchProdLaborClassRef.jsx";

const initialForm = {
  positionCode: "",
  positionName: "",
  active: "Y",
};

const initialRegistration = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const initialStandardForm = {
  bomId: "",
  bomCode: "",
  bomEffectivityDate: "",
  fohEffectivityDate: "",
  itemType: "",
  itemCode: "",
  itemDescription: "",
  uom: "",
  quantity: "0.000000",
  remarks: "",
};

const emptyStandardLine = (lineNo = 1) => ({
  lineNo,
  processCode: "",
  processName: "",
  cycleTime: "0.000000",
  standardHourlyRate: "0.000000",
  rateDetails: [],
});

const emptyLaborRateLine = (lineNo = 1, cycleTime = "0.000000") => ({
  lineNo,
  rcCode: "",
  department: "",
  designationCode: "",
  designation: "",
  headCount: "1",
  cycleTime,
  manHourRate: "0.00",
});

const tabs = [
  { key: "position", label: "Position", icon: faUserTie },
  { key: "standard", label: "Standard Setup", icon: faSliders },
  { key: "rent", label: "Rent Setup", icon: faBuilding },
  { key: "laboratory", label: "Laboratory Setup", icon: faFlask },
];

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

const ProdFOHSetup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const formTopRef = useRef(null);

  const [activeTab, setActiveTab] = useState("position");
  const [formData, setFormData] = useState(initialForm);
  const [registrationInfo, setRegistrationInfo] = useState(initialRegistration);
  const [selectedPositionCode, setSelectedPositionCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [tableFields, setTableFields] = useState([]);
  const [standardForm, setStandardForm] = useState(initialStandardForm);
  const [standardRows, setStandardRows] = useState(() => [
    emptyStandardLine(1),
    emptyStandardLine(2),
    emptyStandardLine(3),
  ]);
  const [isStandardEditing, setIsStandardEditing] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateTargetRowIndex, setRateTargetRowIndex] = useState(null);
  const [laborRateRows, setLaborRateRows] = useState([]);
  const [laborLookupRowIndex, setLaborLookupRowIndex] = useState(null);
  const [showRCLookup, setShowRCLookup] = useState(false);
  const [showPositionLookup, setShowPositionLookup] = useState(false);

  const userCode = user?.USER_CODE || user?.userCode || "ADMIN";

  const { data: positionList = [], isLoading: isListLoading } = useQuery({
    queryKey: ["prodFOHPositionList"],
    queryFn: async () => parseResult(await apiClient.get("/prodFOHSetup/load")),
  });

  const resetForm = () => {
    setFormData(initialForm);
    setRegistrationInfo(initialRegistration);
    setSelectedPositionCode("");
    setIsEditing(false);
  };

  const resetStandardSetup = () => {
    setStandardForm(initialStandardForm);
    setStandardRows([
      emptyStandardLine(1),
      emptyStandardLine(2),
      emptyStandardLine(3),
    ]);
    setIsStandardEditing(false);
  };

  const updateStandardForm = (updates) => {
    setStandardForm((previous) => ({ ...previous, ...updates }));
  };

  const updateStandardLine = (rowIndex, field, value) => {
    setStandardRows((previous) =>
      previous.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  const renumberStandardLines = (rows) =>
    rows.map((row, index) => ({ ...row, lineNo: index + 1 }));

  const addStandardLine = (rowIndex = standardRows.length - 1) => {
    setStandardRows((previous) => {
      const next = [...previous];
      next.splice(rowIndex + 1, 0, emptyStandardLine(rowIndex + 2));
      return renumberStandardLines(next);
    });
  };

  const removeStandardLine = (rowIndex) => {
    setStandardRows((previous) => {
      const next = previous.filter((_, index) => index !== rowIndex);
      return next.length
        ? renumberStandardLines(next)
        : [emptyStandardLine(1)];
    });
  };

  const openRateModal = (row) => {
    const cycleTime = Number(row?.cycleTime || 0).toFixed(6);
    const existingRows = Array.isArray(row?.rateDetails) ? row.rateDetails : [];

    setRateTargetRowIndex(row.rowIndex);
    setLaborRateRows(
      existingRows.length
        ? existingRows
        : [
            emptyLaborRateLine(1, cycleTime),
            emptyLaborRateLine(2, cycleTime),
            emptyLaborRateLine(3, cycleTime),
          ],
    );
    setIsRateModalOpen(true);
  };

  const closeRateModal = () => {
    setIsRateModalOpen(false);
    setRateTargetRowIndex(null);
    setLaborRateRows([]);
  };

  const updateLaborRateLine = (rowIndex, field, value) => {
    setLaborRateRows((previous) =>
      previous.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  const removeLaborRateLine = (rowIndex) => {
    setLaborRateRows((previous) =>
      previous
        .filter((_, index) => index !== rowIndex)
        .map((row, index) => ({ ...row, lineNo: index + 1 })),
    );
  };

  const laborRateTotals = useMemo(() => {
    const totalHeadCount = laborRateRows.reduce(
      (total, row) => total + Number(row.headCount || 0),
      0,
    );
    const totalLaborCost = laborRateRows.reduce(
      (total, row) =>
        total +
        Number(row.headCount || 0) *
          Number(row.cycleTime || 0) *
          Number(row.manHourRate || 0),
      0,
    );

    return {
      totalHeadCount,
      totalLaborCost,
      averagePerHourRate:
        totalHeadCount > 0 ? totalLaborCost / totalHeadCount : 0,
    };
  }, [laborRateRows]);

  const applyLaborRate = () => {
    if (rateTargetRowIndex === null) return;

    setStandardRows((previous) =>
      previous.map((row, index) =>
        index === rateTargetRowIndex
          ? {
              ...row,
              standardHourlyRate: laborRateTotals.averagePerHourRate.toFixed(6),
              rateDetails: laborRateRows,
            }
          : row,
      ),
    );
    closeRateModal();
  };

  const handleCloseRCLookup = (selectedRC) => {
    if (selectedRC && laborLookupRowIndex !== null) {
      setLaborRateRows((previous) =>
        previous.map((row, index) =>
          index === laborLookupRowIndex
            ? {
                ...row,
                rcCode: selectedRC.rcCode || "",
                department: selectedRC.rcName || "",
              }
            : row,
        ),
      );
    }
    setShowRCLookup(false);
  };

  const selectPosition = (position) => {
    if (position && laborLookupRowIndex !== null) {
      setLaborRateRows((previous) =>
        previous.map((row, index) =>
          index === laborLookupRowIndex
            ? {
                ...row,
                designationCode: position.positionCode || "",
                designation: position.positionName || "",
              }
            : row,
        ),
      );
    }
    setShowPositionLookup(false);
  };

  const handleEdit = (row) => {
    setFormData({
      positionCode: row?.positionCode || "",
      positionName: row?.positionName || "",
      active: row?.active || "Y",
    });
    setRegistrationInfo({
      registeredBy: row?.registeredBy || "",
      registeredDate: row?.registeredDate || "",
      lastUpdatedBy: row?.lastUpdatedBy || "",
      lastUpdatedDate: row?.lastUpdatedDate || "",
    });
    setSelectedPositionCode(row?.positionCode || "");
    setIsEditing(true);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/upsert", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) {
        useSwalErrorAlert("Save Failed", result?.errormsg || "Unable to save the Position.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["prodFOHPositionList"] });
      useSwalSuccessAlert("Saved", "Position saved successfully.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/delete", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) {
        useSwalErrorAlert("Delete Failed", result?.errormsg || "Unable to delete the Position.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["prodFOHPositionList"] });
      useSwalDeleteRecord("Deleted", "Position deleted successfully.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Failed", error),
  });

  const getMax = (columnName) =>
    useGetFieldLength(tableFields, columnName) ||
    (columnName === "LABORCLASS_CODE" ? 20 : 100);

  const checkDuplicate = async (positionCode) => {
    const cleanCode = String(positionCode || "").trim().toUpperCase();
    if (!cleanCode || selectedPositionCode) return false;

    try {
      setIsChecking(true);
      const response = await apiClient.post("/prodFOHSetup/checkDuplicate", {
        json_data: { positionCode: cleanCode },
      });
      const raw = response?.data?.data?.[0]?.result;
      const result = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (String(result?.result) === "1") {
        setFormData((previous) => ({ ...previous, positionCode: "" }));
        useSwalErrorAlert("Duplicate Position Code", `${cleanCode} is already registered.`);
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
    const positionCode = formData.positionCode.trim().toUpperCase();
    const positionName = formData.positionName.trim();

    if (!positionCode || !positionName) {
      useSwalErrorAlert("Required Fields", "Position Code and Position Name are required.");
      return;
    }

    if (positionCode.length > getMax("LABORCLASS_CODE")) {
      useSwalErrorAlert("Invalid Position Code", `Position Code cannot exceed ${getMax("LABORCLASS_CODE")} characters.`);
      return;
    }

    if (positionName.length > getMax("LABORCLASS_NAME")) {
      useSwalErrorAlert("Invalid Position Name", `Position Name cannot exceed ${getMax("LABORCLASS_NAME")} characters.`);
      return;
    }

    if (!selectedPositionCode && (await checkDuplicate(positionCode))) return;

    saveMutation.mutate({
      json_data: {
        positionCode,
        positionName,
        active: formData.active || "Y",
        userCode,
      },
    });
  };

  const handleDelete = async (row = null) => {
    const positionCode = row?.positionCode || selectedPositionCode;
    const positionName = row?.positionName || formData.positionName;
    if (!positionCode) return;

    try {
      setIsChecking(true);
      const response = await apiClient.post("/prodFOHSetup/checkInUsed", {
        json_data: { positionCode },
      });
      const raw = response?.data?.data?.[0]?.result;
      const usage = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (String(usage?.result) === "1") {
        useSwalErrorAlert("Cannot Delete", "This Position is already in use.");
        return;
      }

      const confirmation = await useSwalDeleteConfirm(
        "Delete Position?",
        `Delete ${positionCode} - ${positionName}?`,
      );
      if (!confirmation?.isConfirmed) return;

      deleteMutation.mutate({ json_data: { positionCode, userCode } });
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
              title="Edit Position"
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
              title="Delete Position"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "positionCode",
        label: "Position Code",
        sortable: true,
        width: 180,
        requiredVisible: true,
      },
      {
        key: "positionName",
        label: "Position Name",
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

  const standardDetailRows = useMemo(
    () =>
      standardRows.map((row, rowIndex) => ({
        ...row,
        rowIndex,
        key: `foh-standard-line-${rowIndex}`,
      })),
    [standardRows],
  );

  const standardColumns = useMemo(
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
              disabled={!isStandardEditing}
              onClick={() => addStandardLine(row.rowIndex)}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-blue-100 bg-blue-50 text-[10px] text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Add process line"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button
              type="button"
              disabled={!isStandardEditing}
              onClick={() => removeStandardLine(row.rowIndex)}
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
              disabled={!isStandardEditing}
              className="global-tran-td-inputclass-ui !h-7 w-full pr-7 text-[11px]"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className={`absolute right-2 text-xs ${
                isStandardEditing
                  ? "cursor-pointer text-blue-600 hover:text-blue-900"
                  : "cursor-not-allowed text-slate-300"
              }`}
              title="Select Process Code"
            />
          </div>
        ),
      },
      {
        key: "processName",
        label: "Process Description",
        width: 500,
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
        width: 180,
        minWidth: 160,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => (
          <input
            value={row.cycleTime || ""}
            disabled
            className="global-tran-td-inputclass-ui !h-7 w-full text-right text-[11px]"
          />
        ),
      },
      {
        key: "standardHourlyRate",
        label: "Std Hourly Rate",
        width: 170,
        minWidth: 150,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => (
          <div className="relative flex items-center">
            <input
              value={row.standardHourlyRate || ""}
              disabled={!isStandardEditing}
              inputMode="decimal"
              onFocus={(event) => event.target.select()}
              onChange={(event) => {
                let value = event.target.value.replace(/[^0-9.]/g, "");
                const parts = value.split(".");
                if (parts.length > 2) value = `${parts[0]}.${parts.slice(1).join("")}`;
                updateStandardLine(row.rowIndex, "standardHourlyRate", value);
              }}
              onBlur={(event) =>
                updateStandardLine(
                  row.rowIndex,
                  "standardHourlyRate",
                  Number(event.target.value || 0).toFixed(6),
                )
              }
              className="global-tran-td-inputclass-ui !h-7 w-full pr-8 text-right text-[11px]"
            />
            <button
              type="button"
              disabled={!isStandardEditing}
              onClick={() => openRateModal(row)}
              className="absolute right-1 inline-flex h-5 w-5 items-center justify-center rounded text-blue-600 hover:bg-blue-100 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-300"
              title="Compute detailed hourly rate"
            >
              <FontAwesomeIcon icon={faCalculator} className="text-[11px]" />
            </button>
          </div>
        ),
      },
    ],
    [isStandardEditing, standardRows],
  );

  const laborRateDetailRows = useMemo(
    () =>
      laborRateRows.map((row, rowIndex) => ({
        ...row,
        rowIndex,
        key: `labor-rate-${rowIndex}`,
        totalLaborCost:
          Number(row.headCount || 0) *
          Number(row.cycleTime || 0) *
          Number(row.manHourRate || 0),
      })),
    [laborRateRows],
  );

  const laborRateColumns = useMemo(
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
              onClick={() => {
                const targetCycleTime =
                  standardRows[rateTargetRowIndex]?.cycleTime || "0.000000";
                setLaborRateRows((previous) => {
                  const next = [...previous];
                  next.splice(
                    row.rowIndex + 1,
                    0,
                    emptyLaborRateLine(row.rowIndex + 2, targetCycleTime),
                  );
                  return next.map((item, index) => ({
                    ...item,
                    lineNo: index + 1,
                  }));
                });
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-blue-100 bg-blue-50 text-[10px] text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
              title="Add labor line"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button
              type="button"
              onClick={() => removeLaborRateLine(row.rowIndex)}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-100 bg-red-50 text-[10px] text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
              title="Delete labor line"
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
        render: (row) => (
          <div className="text-center">{String(row.lineNo).padStart(2, "0")}</div>
        ),
      },
      {
        key: "department",
        label: "Department",
        width: 210,
        minWidth: 180,
        requiredVisible: true,
        render: (row) => (
          <input
            value={row.department || ""}
            onChange={(event) =>
              updateLaborRateLine(row.rowIndex, "department", event.target.value)
            }
            className="global-tran-td-inputclass-ui !h-7 w-full text-[11px]"
          />
        ),
      },
      {
        key: "designation",
        label: "Designation",
        width: 210,
        minWidth: 180,
        requiredVisible: true,
        render: (row) => (
          <input
            value={row.designation || ""}
            onChange={(event) =>
              updateLaborRateLine(row.rowIndex, "designation", event.target.value)
            }
            className="global-tran-td-inputclass-ui !h-7 w-full text-[11px]"
          />
        ),
      },
      ...[
        {
          key: "headCount",
          label: (
            <span className="inline-block text-center leading-tight">
              Head<br />Count
            </span>
          ),
          decimals: 0,
          width: 95,
        },
        { key: "cycleTime", label: "Cycle Time", decimals: 6, width: 130 },
        { key: "manHourRate", label: "Man-hour Rate", decimals: 2, width: 145 },
      ].map((column) => ({
        key: column.key,
        label: column.label,
        width: column.width,
        minWidth: column.width,
        requiredVisible: true,
        renderType: "number",
        roundingOff: column.decimals,
        render: (row) => (
          <input
            value={row[column.key] || ""}
            inputMode="decimal"
            onFocus={(event) => event.target.select()}
            onChange={(event) => {
              let value = event.target.value.replace(/[^0-9.]/g, "");
              const parts = value.split(".");
              if (parts.length > 2) value = `${parts[0]}.${parts.slice(1).join("")}`;
              updateLaborRateLine(row.rowIndex, column.key, value);
            }}
            onBlur={(event) =>
              updateLaborRateLine(
                row.rowIndex,
                column.key,
                Number(event.target.value || 0).toFixed(column.decimals),
              )
            }
            className="global-tran-td-inputclass-ui !h-7 w-full text-right text-[11px]"
          />
        ),
      })),
      {
        key: "totalLaborCost",
        label: "Total Labor Cost",
        width: 160,
        minWidth: 150,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 2,
        render: (row) => (
          <div className="px-2 text-right font-semibold">
            {Number(row.totalLaborCost || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        ),
      },
    ],
    [laborRateRows],
  );

  useEffect(() => {
    let mounted = true;
    useFieldLenghtCheck("PROD_LABORCLASS_REF")
      .then((result) => {
        if (mounted) setTableFields(result || []);
      })
      .catch((error) => console.error("Unable to load Position field lengths.", error));

    return () => {
      mounted = false;
    };
  }, []);

  const isBusy =
    isListLoading ||
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
              FOH Set-up
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
            {activeTab === "position" && (
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
                    disabled: !selectedPositionCode || isBusy,
                  },
                  {
                    key: "reset",
                    label: "Reset",
                    icon: faRotateLeft,
                    onClick: resetForm,
                  },
                ]}
              />
            )}
            {activeTab === "standard" && (
              <ButtonBar
                buttons={[
                  {
                    key: "add-standard",
                    label: "Add",
                    icon: faPlus,
                    onClick: () => {
                      resetStandardSetup();
                      setIsStandardEditing(true);
                    },
                  },
                  {
                    key: "save-standard",
                    label: "Save",
                    icon: faSave,
                    disabled: true,
                    title: "Backend integration will be added in the next phase.",
                  },
                  {
                    key: "reset-standard",
                    label: "Reset",
                    icon: faRotateLeft,
                    onClick: resetStandardSetup,
                  },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-20">
          {activeTab === "position" ? (
            <div
              ref={formTopRef}
              className="flex h-auto w-full flex-col gap-4 pb-4 pt-4 xl:h-[calc(100vh-205px)] xl:flex-row"
            >
              <div className="flex h-fit w-full shrink-0 flex-col gap-4 xl:w-[400px]">
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <h2 className="mb-6 border-b pb-2 text-sm font-bold uppercase tracking-wider text-blue-600">
                    Position Details
                  </h2>
                  <div className="space-y-6">
                    <FieldRenderer
                      label="Position Code"
                      required
                      type="text"
                      value={formData.positionCode}
                      disabled={!isEditing || Boolean(selectedPositionCode)}
                      maxLength={getMax("LABORCLASS_CODE")}
                      onChange={(value) =>
                        setFormData((previous) => ({
                          ...previous,
                          positionCode: String(value || "").toUpperCase(),
                        }))
                      }
                      onBlur={(event) => checkDuplicate(event.target.value)}
                    />
                    <FieldRenderer
                      label="Position Name"
                      required
                      type="text"
                      value={formData.positionName}
                      disabled={!isEditing}
                      maxLength={getMax("LABORCLASS_NAME")}
                      onChange={(value) =>
                        setFormData((previous) => ({
                          ...previous,
                          positionName: value || "",
                        }))
                      }
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
                      onChange={(value) =>
                        setFormData((previous) => ({ ...previous, active: value || "Y" }))
                      }
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <RegistrationInfo layout="stacked" data={registrationInfo} />
                </div>
              </div>

              <div className="global-ref-table-main-div-ui min-h-[540px] min-w-0 flex-1 overflow-hidden">
                <SearchGlobalReferenceTable
                  docType="FOH Position"
                  columns={columns}
                  data={positionList}
                  isLoading={isListLoading}
                  onRowDoubleClick={handleEdit}
                  itemsPerPage={50}
                  autoFillGrid
                  onRefresh={() =>
                    queryClient.invalidateQueries({ queryKey: ["prodFOHPositionList"] })
                  }
                />
              </div>
            </div>
          ) : activeTab === "standard" ? (
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
                    value={standardForm.bomId}
                    readOnly
                  />

                  <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 md:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
                    <div className="relative w-full">
                      <div
                        className={`global-ref-textbox-ui flex items-stretch ${
                          isStandardEditing
                            ? "global-ref-textbox-enabled"
                            : "global-ref-textbox-disabled"
                        }`}
                      >
                        <DateFormatInput
                          id="fohEffectivityDate"
                          className="peer flex-grow cursor-pointer border-none bg-transparent px-3 focus:outline-none"
                          value={standardForm.fohEffectivityDate}
                          disabled={!isStandardEditing}
                          onChange={(value) =>
                            updateStandardForm({ fohEffectivityDate: value })
                          }
                        />
                      </div>
                      <label
                        htmlFor="fohEffectivityDate"
                        className={`global-ref-floating-label ${
                          isStandardEditing
                            ? "global-ref-label-enabled"
                            : "global-ref-label-disabled"
                        }`}
                      >
                        FOH Effectivity Date <span className="text-red-500">*</span>
                      </label>
                    </div>

                    <FieldRenderer
                      id="itemType"
                      label="Item Type"
                      type="text"
                      value={standardForm.itemType}
                      disabled
                      readOnly
                    />

                    <FieldRenderer
                      id="uom"
                      label="UOM"
                      type="text"
                      value={standardForm.uom}
                      disabled
                      readOnly
                    />

                    <FieldRenderer
                      id="bomCode"
                      label="BOM Code"
                      type="lookup"
                      required
                      value={standardForm.bomCode}
                      disabled={!isStandardEditing}
                      onLookup={() => {}}
                    />

                    <FieldRenderer
                      id="itemCode"
                      label="Item Code"
                      type="text"
                      value={standardForm.itemCode}
                      disabled
                      readOnly
                    />

                    <FieldRenderer
                      id="quantity"
                      label="Quantity"
                      type="amount"
                      value={standardForm.quantity}
                      disabled
                      readOnly
                    />

                    <div className="relative w-full">
                      <div className="global-ref-textbox-ui global-ref-textbox-disabled flex items-stretch">
                        <DateFormatInput
                          id="standardBomEffectivityDate"
                          className="peer flex-grow border-none bg-transparent px-3 focus:outline-none"
                          value={standardForm.bomEffectivityDate}
                          disabled
                        />
                      </div>
                      <label
                        htmlFor="standardBomEffectivityDate"
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
                        value={standardForm.itemDescription}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="col-span-full">
                      <div className="relative">
                        <textarea
                          id="fohStandardRemarks"
                          rows={3}
                          value={standardForm.remarks}
                          disabled={!isStandardEditing}
                          onChange={(event) =>
                            updateStandardForm({ remarks: event.target.value })
                          }
                          className="peer global-tran-textbox-remarks-ui px-3 pb-2 pt-6"
                        />
                        <label
                          htmlFor="fohStandardRemarks"
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
                    FOH Standard Details
                  </button>
                </div>

                <div className="global-tran-table-main-div-ui relative overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <SearchGlobalReferenceTable
                    key={`foh-standard-details-${isStandardEditing ? "edit" : "view"}`}
                    docType="FOH Standard Details"
                    columns={standardColumns}
                    data={standardDetailRows}
                    itemsPerPage={100}
                    showFilters
                    tableSize="Half"
                    autoFit
                  />
                </div>

              </div>
            </div>
          ) : (
            <div className="w-full pb-4 pt-4" />
          )}
      </div>

      {isRateModalOpen && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]">
          <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-blue-200 bg-blue-100 px-5 py-3 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <FontAwesomeIcon icon={faCalculator} />
                  Std. Hourly Rate - Detailed
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {standardRows[rateTargetRowIndex]?.processCode || "Process"}
                  {standardRows[rateTargetRowIndex]?.processName
                    ? ` - ${standardRows[rateTargetRowIndex].processName}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRateModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-white/70 hover:text-red-600 dark:hover:bg-slate-800"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className="hidden">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-100">
                    <tr>
                      <th className="w-14 border-b border-r border-slate-200 px-2 py-2 text-center dark:border-slate-700">LN</th>
                      <th className="min-w-44 border-b border-r border-slate-200 px-2 py-2 text-left dark:border-slate-700">Department</th>
                      <th className="min-w-44 border-b border-r border-slate-200 px-2 py-2 text-left dark:border-slate-700">Designation</th>
                      <th className="w-28 border-b border-r border-slate-200 px-2 py-2 text-right dark:border-slate-700">Head Count</th>
                      <th className="w-32 border-b border-r border-slate-200 px-2 py-2 text-right dark:border-slate-700">Cycle Time</th>
                      <th className="w-36 border-b border-r border-slate-200 px-2 py-2 text-right dark:border-slate-700">Man-hour Rate</th>
                      <th className="w-40 border-b border-r border-slate-200 px-2 py-2 text-right dark:border-slate-700">Total Labor Cost</th>
                      <th className="w-16 border-b border-slate-200 px-2 py-2 text-center dark:border-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laborRateRows.map((row, rowIndex) => {
                      const totalLaborCost =
                        Number(row.headCount || 0) *
                        Number(row.cycleTime || 0) *
                        Number(row.manHourRate || 0);

                      return (
                        <tr key={`labor-rate-${rowIndex}`} className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
                          <td className="border-r border-slate-200 px-2 py-1.5 text-center dark:border-slate-700">
                            {String(row.lineNo).padStart(2, "0")}
                          </td>
                          <td className="border-r border-slate-200 p-1 dark:border-slate-700">
                            <input
                              value={row.department}
                              onChange={(event) =>
                                updateLaborRateLine(rowIndex, "department", event.target.value)
                              }
                              className="h-8 w-full rounded border border-slate-300 bg-white px-2 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800"
                            />
                          </td>
                          <td className="border-r border-slate-200 p-1 dark:border-slate-700">
                            <input
                              value={row.designation}
                              onChange={(event) =>
                                updateLaborRateLine(rowIndex, "designation", event.target.value)
                              }
                              className="h-8 w-full rounded border border-slate-300 bg-white px-2 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800"
                            />
                          </td>
                          {[
                            ["headCount", row.headCount, 0],
                            ["cycleTime", row.cycleTime, 6],
                            ["manHourRate", row.manHourRate, 2],
                          ].map(([field, value, decimals]) => (
                            <td key={field} className="border-r border-slate-200 p-1 dark:border-slate-700">
                              <input
                                value={value}
                                inputMode="decimal"
                                onFocus={(event) => event.target.select()}
                                onChange={(event) => {
                                  let nextValue = event.target.value.replace(/[^0-9.]/g, "");
                                  const parts = nextValue.split(".");
                                  if (parts.length > 2) nextValue = `${parts[0]}.${parts.slice(1).join("")}`;
                                  updateLaborRateLine(rowIndex, field, nextValue);
                                }}
                                onBlur={(event) =>
                                  updateLaborRateLine(
                                    rowIndex,
                                    field,
                                    Number(event.target.value || 0).toFixed(decimals),
                                  )
                                }
                                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-right outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800"
                              />
                            </td>
                          ))}
                          <td className="border-r border-slate-200 px-2 py-1.5 text-right font-semibold dark:border-slate-700">
                            {totalLaborCost.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeLaborRateLine(rowIndex)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                              title="Delete labor line"
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold dark:bg-slate-800">
                    <tr>
                      <td colSpan={3} className="border-r border-t border-slate-200 px-3 py-2 text-right dark:border-slate-700">Total</td>
                      <td className="border-r border-t border-slate-200 px-2 py-2 text-right dark:border-slate-700">
                        {laborRateTotals.totalHeadCount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} className="border-r border-t border-slate-200 dark:border-slate-700" />
                      <td className="border-r border-t border-slate-200 px-2 py-2 text-right dark:border-slate-700">
                        {laborRateTotals.totalLaborCost.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border-t border-slate-200 dark:border-slate-700" />
                    </tr>
                    <tr className="text-blue-700 dark:text-blue-300">
                      <td colSpan={6} className="border-r border-t border-slate-200 px-3 py-2 text-right dark:border-slate-700">
                        Average per Hour Rate
                      </td>
                      <td className="border-r border-t border-slate-200 px-2 py-2 text-right text-sm font-bold dark:border-slate-700">
                        {laborRateTotals.averagePerHourRate.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border-t border-slate-200 dark:border-slate-700" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="global-tran-table-main-div-ui">
                <div className="global-tran-table-main-sub-div-ui min-h-[260px]">
                  <table className="w-full table-fixed border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-100 [&_tr>td:first-child]:border-l dark:[&_td]:border-slate-700">
                    <thead className="global-tran-thead-div-ui">
                      <tr>
                        <th className="global-tran-th-ui w-[55px]">LN</th>
                        <th className="global-tran-th-ui w-[190px]">Department</th>
                        <th className="global-tran-th-ui w-[190px]">Designation</th>
                        <th className="global-tran-th-ui w-[90px] whitespace-normal text-center leading-tight">
                          Head<br />Count
                        </th>
                        <th className="global-tran-th-ui w-[125px]">Cycle Time</th>
                        <th className="global-tran-th-ui w-[140px]">Man-hour Rate</th>
                        <th className="global-tran-th-ui w-[150px]">Total Labor Cost</th>
                        <th className="global-tran-th-ui sticky right-0 w-[84px] bg-blue-100 dark:bg-blue-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {laborRateDetailRows.map((row) => (
                        <tr key={row.key} className="global-tran-tr-ui">
                          <td className="global-tran-td-ui text-center">
                            {String(row.lineNo).padStart(2, "0")}
                          </td>
                          <td className="global-tran-td-ui">
                            <div className="relative">
                              <input
                                value={row.department || ""}
                                readOnly
                                onClick={() => {
                                  setLaborLookupRowIndex(row.rowIndex);
                                  setShowRCLookup(true);
                                }}
                                className="global-tran-td-inputclass-ui w-full cursor-pointer pr-7"
                                title={row.rcCode || "Select Responsibility Center"}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLaborLookupRowIndex(row.rowIndex);
                                  setShowRCLookup(true);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600"
                                title="Select Responsibility Center"
                              >
                                <FontAwesomeIcon icon={faMagnifyingGlass} />
                              </button>
                            </div>
                          </td>
                          <td className="global-tran-td-ui">
                            <div className="relative">
                              <input
                                value={row.designation || ""}
                                readOnly
                                onClick={() => {
                                  setLaborLookupRowIndex(row.rowIndex);
                                  setShowPositionLookup(true);
                                }}
                                className="global-tran-td-inputclass-ui w-full cursor-pointer pr-7"
                                title={row.designationCode || "Select Position"}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLaborLookupRowIndex(row.rowIndex);
                                  setShowPositionLookup(true);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600"
                                title="Select Position"
                              >
                                <FontAwesomeIcon icon={faMagnifyingGlass} />
                              </button>
                            </div>
                          </td>
                          {[
                            ["headCount", 0],
                            ["cycleTime", 6],
                            ["manHourRate", 2],
                          ].map(([field, decimals]) => (
                            <td key={field} className="global-tran-td-ui">
                              <input
                                value={row[field] || ""}
                                inputMode="decimal"
                                onFocus={(event) => event.target.select()}
                                onChange={(event) => {
                                  let value = event.target.value.replace(/[^0-9.]/g, "");
                                  const parts = value.split(".");
                                  if (parts.length > 2) value = `${parts[0]}.${parts.slice(1).join("")}`;
                                  updateLaborRateLine(row.rowIndex, field, value);
                                }}
                                onBlur={(event) =>
                                  updateLaborRateLine(
                                    row.rowIndex,
                                    field,
                                    Number(event.target.value || 0).toFixed(decimals),
                                  )
                                }
                                className="global-tran-td-inputclass-ui w-full text-right"
                              />
                            </td>
                          ))}
                          <td className="global-tran-td-ui text-right font-normal">
                            {Number(row.totalLaborCost || 0).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                className="global-tran-td-button-add-ui"
                                onClick={() => {
                                  const targetCycleTime =
                                    standardRows[rateTargetRowIndex]?.cycleTime || "0.000000";
                                  setLaborRateRows((previous) => {
                                    const next = [...previous];
                                    next.splice(
                                      row.rowIndex + 1,
                                      0,
                                      emptyLaborRateLine(row.rowIndex + 2, targetCycleTime),
                                    );
                                    return next.map((item, index) => ({
                                      ...item,
                                      lineNo: index + 1,
                                    }));
                                  });
                                }}
                                title="Add labor line"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                              <button
                                type="button"
                                className="global-tran-td-button-delete-ui"
                                onClick={() => removeLaborRateLine(row.rowIndex)}
                                title="Delete labor line"
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-4 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3 text-xs text-blue-700 dark:text-blue-300">
                <span>Average per Hour Rate</span>
                <span className="min-w-24 text-right text-sm font-semibold">
                  {laborRateTotals.averagePerHourRate.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <button
                type="button"
                onClick={applyLaborRate}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Apply Average Rate
              </button>
            </div>
          </div>
        </div>
      )}

      <RCLookupModal
        isOpen={showRCLookup}
        onClose={handleCloseRCLookup}
        title="Select Responsibility Center"
      />

      <SearchProdLaborClassRef
        isOpen={showPositionLookup}
        onClose={selectPosition}
        title="Select Designation"
      />
    </div>
  );
};

export default ProdFOHSetup;
