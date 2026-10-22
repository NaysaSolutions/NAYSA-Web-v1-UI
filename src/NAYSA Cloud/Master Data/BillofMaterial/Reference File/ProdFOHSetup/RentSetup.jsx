import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faClockRotateLeft, faMagnifyingGlass, faPenToSquare, faTrashAlt, faUsers } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalDeleteConfirm, useSwalDeleteRecord, useSwalErrorAlert, useSwalErrorAlertAPI, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RentAllocationRCModal from "./RentAllocationRCModal.jsx";

const emptyForm = { rentAllocationId: "", totalRentAmount: "0.00", workingDays: "30.00", workingHours: "8.00", effectivityDate: "", remarks: "" };
const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};
const numericValue = (value) => Number(String(value ?? "").replace(/,/g, "")) || 0;
const money = (value) => numericValue(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const displayDate = (value) => {
  const datePart = String(value || "").split("T")[0];
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${month}/${day}/${year}` : datePart;
};
const allocatedRentAmount = (total, count, index) => {
  if (!count) return 0;
  const normalizedTotal = Number(Number(total || 0).toFixed(2));
  const regularShare = Number((normalizedTotal / count).toFixed(2));
  return index === count - 1
    ? Number((normalizedTotal - regularShare * (count - 1)).toFixed(2))
    : regularShare;
};

const RentSetup = forwardRef(({ onStateChange, isActive = false }, ref) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [areas, setAreas] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState(null);
  const [isRCModalOpen, setIsRCModalOpen] = useState(false);
  const [selectedRCs, setSelectedRCs] = useState([]);
  const [isLoadingRentAreas, setIsLoadingRentAreas] = useState(false);
  const [rentAllocationTab, setRentAllocationTab] = useState("allocation");
  const [allocationSummaryTab, setAllocationSummaryTab] = useState("area");
  const userCode = user?.USER_CODE || user?.userCode || "ADMIN";

  const { data: rcList = [], isFetching: isRCLoading, refetch: refetchRCList } = useQuery({
    queryKey: ["rentAllocationRCList"],
    queryFn: async () => parseResult(await apiClient.get("/lookupRCMast", { params: { PARAMS: "ActiveAll" } })),
    enabled: isRCModalOpen,
  });
  const {
    data: rentAllocationHistory = [],
    isFetching: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["prodFOHRentAllocationSummary"],
    queryFn: async () => parseResult(await apiClient.get("/prodFOHSetup/loadRentAllocationSummary")),
    enabled: isActive && rentAllocationTab === "summary",
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 30,
    refetchInterval: isActive && rentAllocationTab === "summary" ? 30000 : false,
    refetchIntervalInBackground: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const totalSqm = useMemo(() => areas.reduce((total, area) => total + Number(area.areaSqm || 0), 0), [areas]);
  const workingHoursPerMonth = numericValue(form.workingDays) * numericValue(form.workingHours);
  const calculatedAreas = useMemo(() => areas.map((area, rowIndex) => {
    const rentAllocation = totalSqm > 0 ? numericValue(form.totalRentAmount) * Number(area.areaSqm || 0) / totalSqm : 0;
    return { ...area, rowIndex, rentAllocation, standardHourlyRate: workingHoursPerMonth > 0 ? rentAllocation / workingHoursPerMonth : 0 };
  }), [areas, form.totalRentAmount, totalSqm, workingHoursPerMonth]);
  const totalRentAllocation = useMemo(
    () => calculatedAreas.reduce((total, area) => total + Number(area.rentAllocation || 0), 0),
    [calculatedAreas],
  );
  const totalStandardHourlyRate = useMemo(
    () => calculatedAreas.reduce((total, area) => total + Number(area.standardHourlyRate || 0), 0),
    [calculatedAreas],
  );
  const matrixRows = useMemo(() => calculatedAreas.length ? [
    ...calculatedAreas,
    {
      isTotal: true,
      areaCode: "",
      areaName: "TOTAL",
      areaSqm: totalSqm,
      rentAllocation: totalRentAllocation,
      standardHourlyRate: totalStandardHourlyRate,
      responsibilityCenters: [],
    },
  ] : [], [calculatedAreas, totalRentAllocation, totalSqm, totalStandardHourlyRate]);
  const allocationDetailRows = useMemo(() => calculatedAreas.flatMap((area) => {
    const selectedCenters = area.responsibilityCenters || [];
    const selectedCount = selectedCenters.length;
    const allocatedHourlyRate = selectedCount > 0
      ? Number((Number(area.standardHourlyRate || 0) / selectedCount).toFixed(2))
      : 0;
    return selectedCenters.map((rc, rcIndex) => ({
      areaCode: area.areaCode,
      areaName: area.areaName,
      areaSqm: area.areaSqm,
      rcCode: rc.rcCode,
      rcName: rc.rcName,
      rentAllocation: allocatedRentAmount(area.rentAllocation, selectedCount, rcIndex),
      standardHourlyRate: allocatedHourlyRate,
    }));
  }), [calculatedAreas]);
  const rentPerAreaRows = useMemo(() => calculatedAreas.flatMap((area) => {
    const details = allocationDetailRows.filter((row) => row.areaCode === area.areaCode);
    return [
      {
        __idx: `area-summary-${area.areaCode}`,
        isSummary: true,
        areaCode: area.areaCode,
        areaName: area.areaName,
        areaSqm: area.areaSqm,
        rcCode: "",
        rcName: "",
        rentAllocation: area.rentAllocation,
        standardHourlyRate: area.standardHourlyRate,
      },
      ...details.map((row) => ({
        ...row,
        __idx: `area-detail-${area.areaCode}-${row.rcCode}`,
        areaCode: "",
        areaName: "",
        areaSqm: "",
      })),
    ];
  }), [allocationDetailRows, calculatedAreas]);
  const rentPerRCRows = useMemo(() => {
    const grouped = new Map();
    allocationDetailRows.forEach((row) => {
      if (!grouped.has(row.rcCode)) grouped.set(row.rcCode, []);
      grouped.get(row.rcCode).push(row);
    });
    return Array.from(grouped.entries()).flatMap(([rcCode, details]) => {
      const rcName = details[0]?.rcName || "";
      return [
        {
          __idx: `rc-summary-${rcCode}`,
          isSummary: true,
          rcCode,
          rcName,
          areaCode: "",
          areaName: "",
          rentAllocation: details.reduce((total, row) => total + Number(row.rentAllocation || 0), 0),
          standardHourlyRate: details.reduce((total, row) => total + Number(row.standardHourlyRate || 0), 0),
        },
        ...details.map((row) => ({
          ...row,
          __idx: `rc-detail-${rcCode}-${row.areaCode}`,
          rcCode: "",
          rcName: "",
        })),
      ];
    });
  }, [allocationDetailRows]);

  const openRCModal = (row) => {
    if (!isEditing) return;
    setSelectedAreaIndex(row.rowIndex);
    setSelectedRCs((row.responsibilityCenters || []).map((rc) => rc.rcCode));
    setIsRCModalOpen(true);
  };
  const applyRCSelection = () => {
    const selectedCount = selectedRCs.length;
    const areaHourlyRate = Number(calculatedAreas[selectedAreaIndex]?.standardHourlyRate || 0);
    const allocatedHourlyRate = selectedCount > 0 ? areaHourlyRate / selectedCount : 0;
    setAreas((previous) => previous.map((area, index) => index === selectedAreaIndex ? {
      ...area,
      responsibilityCenters: rcList
        .filter((rc) => selectedRCs.includes(rc.rcCode))
        .map((rc) => ({ ...rc, standardHourlyRate: allocatedHourlyRate })),
    } : area));
    setIsRCModalOpen(false);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/upsertRentAllocation", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) return useSwalErrorAlert("Save Failed", result?.errormsg || "Unable to save Rent Allocation.");
      setForm((previous) => ({ ...previous, rentAllocationId: result?.rentAllocationId || previous.rentAllocationId }));
      queryClient.invalidateQueries({ queryKey: ["prodFOHRentAllocation"] });
      queryClient.invalidateQueries({ queryKey: ["prodFOHRentAllocationSummary"] });
      useSwalSuccessAlert("Saved", "Rent Allocation saved successfully.");
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/deleteRentAllocation", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) return useSwalErrorAlert("Delete Failed", result?.errormsg || "Unable to delete Rent Allocation.");
      queryClient.invalidateQueries({ queryKey: ["prodFOHRentAllocationSummary"] });
      useSwalDeleteRecord("Deleted", "Rent Allocation deleted successfully.");
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Failed", error),
  });

  const handleDeleteHistory = useCallback(async (row) => {
    if (!row?.rentAllocationId) return;
    const confirmation = await useSwalDeleteConfirm("Delete Rent Allocation?", `Delete the Rent Allocation effective ${displayDate(row.effectivityDate)}? This action will be recorded in the audit trail.`);
    if (!confirmation?.isConfirmed) return;
    deleteAllocationMutation.mutate({ json_data: { rentAllocationId: row.rentAllocationId, userCode } });
  }, [userCode]);

  const validateEffectivityDate = async (effectivityDate, rentAllocationId = "") => {
    if (!effectivityDate) return true;
    try {
      const records = parseResult(await apiClient.get("/prodFOHSetup/loadRentAllocationSummary"));
      const selectedDate = String(effectivityDate).split("T")[0];
      const duplicate = records.find((record) =>
        String(record.effectivityDate || "").split("T")[0] === selectedDate
        && String(record.rentAllocationId || "") !== String(rentAllocationId || ""));
      if (!duplicate) return true;
      useSwalErrorAlert("Duplicate Effectivity Date", "A Rent Allocation already exists for the selected Effectivity Date.");
      return false;
    } catch (error) {
      useSwalErrorAlertAPI("Validation Failed", error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!form.effectivityDate || numericValue(form.totalRentAmount) <= 0 || numericValue(form.workingDays) <= 0 || numericValue(form.workingHours) <= 0) {
      useSwalErrorAlert("Required Fields", "Effectivity Date, Total Rent Amount, Working Days, and Working Hours are required.");
      return;
    }
    if (!await validateEffectivityDate(form.effectivityDate, form.rentAllocationId)) return;
    saveMutation.mutate({ json_data: {
      ...form,
      totalRentAmount: numericValue(form.totalRentAmount), workingDays: numericValue(form.workingDays), workingHours: numericValue(form.workingHours), userCode,
      allocations: calculatedAreas.flatMap((area) => {
        const selectedCount = area.responsibilityCenters?.length || 0;
        const allocatedHourlyRate = selectedCount > 0 ? Number(area.standardHourlyRate || 0) / selectedCount : 0;
        return (area.responsibilityCenters || []).map((rc, rcIndex) => ({ areaCode: area.areaCode, rcCode: rc.rcCode, rentAllocation: allocatedRentAmount(area.rentAllocation, selectedCount, rcIndex), standardHourlyRate: Number(allocatedHourlyRate.toFixed(2)) }));
      }),
    } });
  };

  const handleAdd = useCallback(async () => {
    setIsLoadingRentAreas(true);
    try {
      const rentAreaList = parseResult(await apiClient.get("/prodFOHSetup/loadRentArea"));
      setForm({ ...emptyForm });
      setAreas(rentAreaList.map((area) => ({
        ...area,
        areaSqm: Number(area.areaSqm || 0),
        responsibilityCenters: [],
      })));
      setIsEditing(true);
    } catch (error) {
      useSwalErrorAlertAPI("Load Failed", error);
    } finally {
      setIsLoadingRentAreas(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setForm({ ...emptyForm });
    setAreas([]);
    setIsEditing(false);
  }, []);

  useImperativeHandle(ref, () => ({
    add: handleAdd,
    save: handleSave,
    reset: handleReset,
    refreshSummary: () => refetchHistory(),
    resetSummary: () => queryClient.setQueryData(["prodFOHRentAllocationSummary"], []),
  }), [handleAdd, handleReset, handleSave, queryClient, refetchHistory]);

  useEffect(() => {
    onStateChange?.({
      isEditing,
      activeView: rentAllocationTab,
      isBusy: isRCLoading || isHistoryLoading || isLoadingRentAreas || saveMutation.isPending || deleteAllocationMutation.isPending,
    });
  }, [deleteAllocationMutation.isPending, isEditing, isHistoryLoading, isLoadingRentAreas, isRCLoading, onStateChange, rentAllocationTab, saveMutation.isPending]);

  const updateNumericField = (key, value) => {
    let nextValue = String(value ?? "").replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = nextValue.split(".");
    if (parts.length > 2) nextValue = `${parts[0]}.${parts.slice(1).join("")}`;
    setForm((previous) => ({ ...previous, [key]: nextValue }));
  };

  const formatNumericField = (key) => {
    setForm((previous) => ({
      ...previous,
      [key]: money(previous[key]),
    }));
  };

  const handleEditHistory = useCallback(async (row) => {
    if (!row?.rentAllocationId) return;
    setIsLoadingRentAreas(true);
    try {
      const records = parseResult(await apiClient.post("/prodFOHSetup/getRentAllocation", {
        json_data: { rentAllocationId: row.rentAllocationId },
      }));
      const record = records[0];
      if (!record) {
        useSwalErrorAlert("Record Not Found", "The selected Rent Allocation record was not found.");
        return;
      }
      setForm({
        rentAllocationId: record.rentAllocationId || "",
        totalRentAmount: money(record.totalRentAmount),
        workingDays: money(record.workingDays),
        workingHours: money(record.workingHours),
        effectivityDate: String(record.effectivityDate || "").split("T")[0],
        remarks: record.remarks || "",
      });
      setAreas((record.areas || []).map((area) => ({
        ...area,
        areaSqm: Number(area.areaSqm || 0),
        responsibilityCenters: area.responsibilityCenters || [],
      })));
      setRentAllocationTab("allocation");
      setIsEditing(true);
    } catch (error) {
      useSwalErrorAlertAPI("Load Failed", error);
    } finally {
      setIsLoadingRentAreas(false);
    }
  }, []);

  const columns = useMemo(() => [
    { key: "areaCode", label: "Area Code", width: 110, requiredVisible: true },
    { key: "areaName", label: "Area Description", width: 430, requiredVisible: true, render: (row) => <div className={row.isTotal ? "text-right font-semibold" : ""}>{row.areaName}</div> },
    { key: "areaSqm", label: "Area (SQM)", width: 120, render: (row) => <div className={`text-right ${row.isTotal ? "font-semibold" : ""}`}>{money(row.areaSqm)}</div> },
    { key: "rentAllocation", label: "Rent Allocation", width: 145, render: (row) => <div className={`text-right ${row.isTotal ? "font-semibold" : ""}`}>{money(row.rentAllocation)}</div> },
    { key: "standardHourlyRate", label: "Std Hourly Rate", width: 140, render: (row) => <div className={`text-right ${row.isTotal ? "font-semibold" : ""}`}>{money(row.standardHourlyRate)}</div> },
    { key: "responsibilityCenters", label: "Responsibility Centers", width: 300, sortable: false, filterable: false, render: (row) => row.isTotal ? null : <div className="flex min-h-7 w-full items-center gap-2 px-1 text-[11px]"><span className={`min-w-0 flex-1 truncate ${(row.responsibilityCenters || []).length ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}`}>{(row.responsibilityCenters || []).length ? row.responsibilityCenters.map((rc) => rc.rcName).join(", ") : "Select Responsibility Center"}</span><button type="button" disabled={!isEditing} onClick={() => openRCModal(row)} className="flex h-6 w-6 shrink-0 items-center justify-center text-blue-600 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-300" title="Select Responsibility Centers"><FontAwesomeIcon icon={faMagnifyingGlass} /></button></div> },
  ], [isEditing]);
  const allocationSummaryColumns = useMemo(() => {
    const areaColumns = [
      { key: "areaCode", label: "Area Code", width: 120, sortable: false },
      { key: "areaName", label: "Area Description", width: 380, sortable: false },
      { key: "areaSqm", label: "Area (SQM)", width: 125, sortable: false, render: (row) => <div className="text-right tabular-nums">{row.areaSqm === "" ? "" : money(row.areaSqm)}</div> },
      { key: "rcCode", label: "RC Code", width: 120, sortable: false },
      { key: "rcName", label: "RC Name", width: 220, sortable: false },
    ];
    const rcColumns = [
      { key: "rcCode", label: "RC Code", width: 120, sortable: false },
      { key: "rcName", label: "RC Name", width: 220, sortable: false },
      { key: "areaCode", label: "Area Code", width: 120, sortable: false },
      { key: "areaName", label: "Area Description", width: 380, sortable: false },
    ];
    return [
      ...(allocationSummaryTab === "area" ? areaColumns : rcColumns),
      { key: "rentAllocation", label: "Rent Allocation", width: 150, sortable: false, render: (row) => <div className="text-right tabular-nums">{money(row.rentAllocation)}</div> },
      { key: "standardHourlyRate", label: "Std Hourly Rate", width: 145, sortable: false, render: (row) => <div className="text-right tabular-nums">{money(row.standardHourlyRate)}</div> },
    ];
  }, [allocationSummaryTab]);
  const historyColumns = useMemo(() => [
    { key: "actions", label: "Actions", width: 95, sortable: false, filterable: false, requiredVisible: true, render: (row) => <div className="flex justify-center gap-1"><button type="button" onClick={() => handleEditHistory(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100 hover:text-blue-700" title="Edit Rent Allocation"><FontAwesomeIcon icon={faPenToSquare} /></button><button type="button" onClick={() => handleDeleteHistory(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-600 hover:text-white" title="Delete Rent Allocation"><FontAwesomeIcon icon={faTrashAlt} /></button></div> },
    { key: "effectivityDate", label: "Effectivity Date", width: 145, render: (row) => displayDate(row.effectivityDate) },
    { key: "totalRentAmount", label: "Total Rent Amount", width: 160, render: (row) => <div className="text-right tabular-nums">{money(row.totalRentAmount)}</div> },
    { key: "workingDays", label: "Working Days", width: 125, render: (row) => <div className="text-right tabular-nums">{money(row.workingDays)}</div> },
    { key: "workingHours", label: "Working Hours", width: 125, render: (row) => <div className="text-right tabular-nums">{money(row.workingHours)}</div> },
    { key: "workingHoursPerMonth", label: "Hours per Month", width: 145, render: (row) => <div className="text-right tabular-nums">{money(row.workingHoursPerMonth)}</div> },
    { key: "areaCount", label: "No. of Areas", width: 115, render: (row) => <div className="text-right">{row.areaCount}</div> },
    { key: "rcCount", label: "No. of RCs", width: 110, render: (row) => <div className="text-right">{row.rcCount}</div> },
    { key: "remarks", label: "Remarks", width: 280 },
    { key: "registeredBy", label: "Registered By", width: 145 },
    { key: "registeredDate", label: "Registered Date", width: 165 },
  ], [handleDeleteHistory, handleEditHistory]);
  const selectedAreaHourlyRate = Number(calculatedAreas[selectedAreaIndex]?.standardHourlyRate || 0);
  const allocatedRCHourlyRate = selectedRCs.length > 0 ? selectedAreaHourlyRate / selectedRCs.length : 0;

  return <div className="w-full pb-4">
    {(isRCLoading || isHistoryLoading || isLoadingRentAreas || saveMutation.isPending) && <LoadingSpinner />}
    <div className="mb-0 flex flex-wrap gap-1 border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-3 pt-0 dark:border-slate-700 dark:from-slate-800/60 dark:to-slate-900">
      {[
        { key: "allocation", label: "Rent Allocation", icon: faBuilding },
        { key: "summary", label: "Rent Allocation Summary", icon: faClockRotateLeft },
      ].map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setRentAllocationTab(tab.key)}
          className={`relative mt-2 inline-flex items-center gap-2 rounded-t-lg border px-5 py-3 text-[13px] font-semibold transition-all duration-200 focus:outline-none ${
            rentAllocationTab === tab.key
              ? "border-b-0 border-slate-200 bg-gradient-to-b from-blue-50 to-white text-blue-700 shadow-[inset_0_2px_0_0_#2563eb] dark:border-slate-700 dark:from-blue-950/60 dark:to-slate-900 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-blue-400"
          }`}
          style={rentAllocationTab === tab.key ? { marginBottom: "-1px", zIndex: 1 } : undefined}
        >
          <span className={`flex h-5 w-5 items-center justify-center rounded transition-colors duration-150 ${
            rentAllocationTab === tab.key
              ? "bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-400"
              : "text-slate-400 dark:text-slate-500"
          }`}>
            <FontAwesomeIcon icon={tab.icon} className="text-[13px]" />
          </span>
          <span>{tab.label}</span>
          {rentAllocationTab === tab.key && <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
        </button>
      ))}
    </div>
    <div className={rentAllocationTab === "allocation" ? "" : "hidden"}>
    <div className="global-tran-header-div-ui !mt-0">
      <div className="global-tran-header-tab-div-ui"><button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Rent Allocation Information</button></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:col-span-3">
          {[["totalRentAmount", "Total Rent Amount", "amount"], ["workingDays", "Working Days per Month", "amount"], ["workingHours", "Working Hours per Day", "amount"], ["workingHoursPerMonth", "Working Hours per Month", "amount"], ["effectivityDate", "Effectivity Date", "date"]].map(([key, label, type]) => (
            <FieldRenderer
              key={key}
              id={`rentAllocation${key}`}
              label={label}
              type={type}
              required={key !== "workingHoursPerMonth"}
              value={key === "workingHoursPerMonth" ? workingHoursPerMonth.toFixed(2) : form[key]}
              disabled={!isEditing || key === "workingHoursPerMonth"}
              readOnly={key === "workingHoursPerMonth"}
              hideClearButton
              onChange={(value) => {
                if (type !== "date") {
                  updateNumericField(key, value);
                  return;
                }
                setForm((previous) => ({ ...previous, [key]: value }));
                if (key === "effectivityDate" && value) {
                  void validateEffectivityDate(value, form.rentAllocationId).then((isValid) => {
                    if (!isValid) setForm((previous) => ({ ...previous, effectivityDate: "" }));
                  });
                }
              }}
              onFocus={() => {
                if (type !== "date" && key !== "workingHoursPerMonth" && numericValue(form[key]) === 0) {
                  setForm((previous) => ({ ...previous, [key]: "" }));
                }
              }}
              onBlur={() => type !== "date" && key !== "workingHoursPerMonth" && formatNumericField(key)}
              onKeyDown={(event) => {
                if (type === "date" || key === "workingHoursPerMonth") return;
                if (["-", "+", "e", "E"].includes(event.key)) event.preventDefault();
                if (event.key === "Enter") {
                  event.preventDefault();
                  formatNumericField(key);
                  event.currentTarget.blur();
                }
              }}
              inputMode={type === "date" ? undefined : "decimal"}
            />
          ))}
          <label className="text-xs text-slate-600 md:col-span-2"><span className="mb-1 block">Remarks</span><textarea rows={3} value={form.remarks} disabled={!isEditing} onChange={(event) => setForm((previous) => ({ ...previous, remarks: event.target.value }))} className="global-tran-textbox-remarks-ui w-full px-3 py-2" /></label>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-600">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[11px] text-orange-600 dark:bg-slate-700">
              <FontAwesomeIcon icon={faBuilding} />
            </span>
            <span>Allocation Summary</span>
          </div>
          <div className="space-y-2 px-4 pb-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-slate-600 dark:text-slate-300">Total Area</span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{money(totalSqm)} SQM</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-slate-600 dark:text-slate-300">Total Rent Allocation</span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{money(totalRentAllocation)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-[12px] font-bold dark:border-slate-700">
              <span className="font-medium text-slate-600 dark:text-slate-300">Total Std Hourly Rate</span>
              <span className="font-extrabold tabular-nums text-blue-700 dark:text-blue-300">{money(totalStandardHourlyRate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="global-tran-tab-div-ui">
      <div className="global-tran-tab-nav-ui"><button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Rent Allocation Matrix</button></div>
      <div className="global-tran-table-main-div-ui relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <SearchGlobalReferenceTable
          docType="Rent Allocation Matrix"
          columns={columns}
          data={matrixRows}
          itemsPerPage={100}
          showFilters
          autoFillGrid
          getRowClassName={(row) => row.isTotal ? "sticky bottom-0 z-20" : ""}
        />
      </div>
    </div>
    <div className="global-tran-tab-div-ui">
      <div className="py-2">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs dark:bg-slate-800">
        {[
          { key: "area", label: "Rent Alloc per Area", icon: faBuilding },
          { key: "rc", label: "Rent Alloc per RC", icon: faUsers },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setAllocationSummaryTab(tab.key)}
            className={`inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 py-2 font-normal transition-colors ${
              allocationSummaryTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-blue-300"
            }`}
          >
            <FontAwesomeIcon icon={tab.icon} className="text-[12px]" />
            <span>{tab.label}</span>
          </button>
        ))}
        </div>
      </div>
      <div className="global-tran-table-main-div-ui overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <SearchGlobalReferenceTable
          key={`rent-allocation-summary-${allocationSummaryTab}`}
          docType={allocationSummaryTab === "area" ? "Rent Alloc per Area" : "Rent Alloc per RC"}
          columns={allocationSummaryColumns}
          data={allocationSummaryTab === "area" ? rentPerAreaRows : rentPerRCRows}
          itemsPerPage={100}
          showFilters
          autoFillGrid
          getCellClassName={(row) => row.isSummary ? "!bg-blue-50 dark:!bg-slate-700/70" : ""}
        />
      </div>
    </div>
    </div>
    <div className={rentAllocationTab === "summary" ? "" : "hidden"}>
      <div className="global-tran-tab-div-ui !mt-0">
        <div className="global-tran-tab-nav-ui">
          <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Historical Rent Allocation</button>
        </div>
        <div className="global-tran-table-main-div-ui overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SearchGlobalReferenceTable
            docType="Rent Allocation Summary"
            columns={historyColumns}
            data={rentAllocationHistory}
            itemsPerPage={100}
            showFilters
            showEmptyPagination
            autoFillGrid
            isLoading={isHistoryLoading}
            onRefresh={() => refetchHistory()}
          />
        </div>
      </div>
    </div>
    <RentAllocationRCModal
      isOpen={isRCModalOpen}
      data={rcList}
      selectedCodes={selectedRCs}
      allocatedHourlyRate={allocatedRCHourlyRate}
      isLoading={isRCLoading}
      onSelectionChange={setSelectedRCs}
      onRefresh={() => refetchRCList()}
      onApply={applyRCSelection}
      onClose={() => setIsRCModalOpen(false)}
    />
  </div>;
});

RentSetup.displayName = "RentSetup";

export default RentSetup;
