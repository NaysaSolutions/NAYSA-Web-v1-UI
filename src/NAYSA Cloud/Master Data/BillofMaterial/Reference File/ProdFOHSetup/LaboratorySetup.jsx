import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faFlask, faLayerGroup, faListCheck, faMagnifyingGlass, faPenToSquare, faTableCellsLarge, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalDeleteConfirm, useSwalDeleteRecord, useSwalErrorAlert, useSwalErrorAlertAPI, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

const laboratoryTabs = [
  { key: "priceMatrix", label: "Laboratory Price Matrix", icon: faTableCellsLarge },
  { key: "priceSummary", label: "Laboratory Price Summary", icon: faListCheck },
  { key: "categoryMatrix", label: "Category-Laboratory Matrix", icon: faLayerGroup },
  { key: "categorySummary", label: "Category-Laboratory Summary", icon: faFlask },
];

const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};
const formatAmount = (value) => (Number(String(value ?? "").replace(/,/g, "")) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value) => {
  const datePart = String(value || "").split("T")[0];
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${month}/${day}/${year}` : datePart;
};

const LaboratorySetup = forwardRef(({ onStateChange, isActive = false }, ref) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("priceMatrix");
  const [effectivityDate, setEffectivityDate] = useState("");
  const [originalEffectivityDate, setOriginalEffectivityDate] = useState("");
  const [priceRows, setPriceRows] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryEffectivityDate, setCategoryEffectivityDate] = useState("");
  const [originalCategoryEffectivityDate, setOriginalCategoryEffectivityDate] = useState("");
  const [categoryRows, setCategoryRows] = useState([]);
  const [categoryLaboratories, setCategoryLaboratories] = useState([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("");
  const [categoryAssignments, setCategoryAssignments] = useState({});
  const [isCategoryEditing, setIsCategoryEditing] = useState(false);
  const unitCostRefs = useRef([]);
  const userCode = user?.USER_CODE || user?.userCode || "ADMIN";

  const {
    data: priceSummary = [],
    isFetching: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["prodFOHLaboratoryPriceSummary"],
    queryFn: async () => parseResult(await apiClient.get("/prodFOHSetup/loadLaboratoryPriceSummary")),
    enabled: isActive && activeTab === "priceSummary",
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 30,
    refetchInterval: isActive && activeTab === "priceSummary" ? 30000 : false,
    refetchIntervalInBackground: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: categorySummary = [],
    isFetching: isCategorySummaryLoading,
    refetch: refetchCategorySummary,
  } = useQuery({
    queryKey: ["prodFOHCategoryLaboratorySummary"],
    queryFn: async () => parseResult(await apiClient.get("/prodFOHSetup/loadCategoryLaboratorySummary")),
    enabled: isActive && activeTab === "categorySummary",
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 30,
    refetchInterval: isActive && activeTab === "categorySummary" ? 30000 : false,
    refetchIntervalInBackground: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/upsertLaboratoryPriceMatrix", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) {
        useSwalErrorAlert("Save Failed", result?.errormsg || "Unable to save Laboratory Price Matrix.");
        return;
      }
      setOriginalEffectivityDate(effectivityDate);
      queryClient.invalidateQueries({ queryKey: ["prodFOHLaboratoryPriceSummary"] });
      useSwalSuccessAlert("Saved", "Laboratory Price Matrix saved successfully.");
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/upsertCategoryLaboratoryMatrix", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) return useSwalErrorAlert("Save Failed", result?.errormsg || "Unable to save Category-Laboratory Matrix.");
      setOriginalCategoryEffectivityDate(categoryEffectivityDate);
      queryClient.invalidateQueries({ queryKey: ["prodFOHCategoryLaboratorySummary"] });
      useSwalSuccessAlert("Saved", "Category-Laboratory Matrix saved successfully.");
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const deletePriceMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/deleteLaboratoryPriceMatrix", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) return useSwalErrorAlert("Delete Failed", result?.errormsg || "Unable to delete Laboratory Price Matrix.");
      queryClient.invalidateQueries({ queryKey: ["prodFOHLaboratoryPriceSummary"] });
      useSwalDeleteRecord("Deleted", "Laboratory Price Matrix deleted successfully.");
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Failed", error),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/deleteCategoryLaboratoryMatrix", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) return useSwalErrorAlert("Delete Failed", result?.errormsg || "Unable to delete Category-Laboratory Matrix.");
      queryClient.invalidateQueries({ queryKey: ["prodFOHCategoryLaboratorySummary"] });
      useSwalDeleteRecord("Deleted", "Category-Laboratory Matrix deleted successfully.");
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Failed", error),
  });

  const deletePriceMatrix = async (row) => {
    const selectedDate = String(row?.effectivityDate || "").split("T")[0];
    if (!selectedDate) return;
    const confirmation = await useSwalDeleteConfirm("Delete Laboratory Price Matrix?", `Delete the matrix effective ${formatDate(selectedDate)}? This action will be recorded in the audit trail.`);
    if (!confirmation?.isConfirmed) return;
    deletePriceMutation.mutate({ json_data: { effectivityDate: selectedDate, userCode } });
  };

  const deleteCategoryMatrix = async (row) => {
    const selectedDate = String(row?.effectivityDate || "").split("T")[0];
    if (!selectedDate) return;
    const confirmation = await useSwalDeleteConfirm("Delete Category-Laboratory Matrix?", `Delete the matrix effective ${formatDate(selectedDate)}? This action will be recorded in the audit trail.`);
    if (!confirmation?.isConfirmed) return;
    deleteCategoryMutation.mutate({ json_data: { effectivityDate: selectedDate, userCode } });
  };

  async function addCategoryMatrix() {
    setIsLoading(true);
    try {
      const [categoryResponse, laboratoryResponse] = await Promise.all([
        apiClient.get("/prodFOHSetup/loadFGCategory"),
        apiClient.get("/prodFOHSetup/loadLaboratoryCode"),
      ]);
      const categories = parseResult(categoryResponse);
      const laboratories = parseResult(laboratoryResponse).filter((row) => row.active === "Y");
      setCategoryEffectivityDate("");
      setOriginalCategoryEffectivityDate("");
      setCategoryRows(categories);
      setCategoryLaboratories(laboratories);
      setSelectedCategoryCode("");
      setCategoryAssignments({});
      setIsCategoryEditing(true);
    } catch (error) {
      useSwalErrorAlertAPI("Load Failed", error);
    } finally {
      setIsLoading(false);
    }
  }

  const add = async () => {
    if (activeTab === "categoryMatrix") return addCategoryMatrix();
    setIsLoading(true);
    try {
      const laboratories = parseResult(await apiClient.get("/prodFOHSetup/loadLaboratoryCode"));
      setEffectivityDate("");
      setOriginalEffectivityDate("");
      setPriceRows(laboratories.filter((row) => row.active === "Y").map((row, index) => ({
        lineNo: index + 1,
        laboratoryCode: row.laboratoryCode,
        laboratoryName: row.laboratoryName,
        unitCost: "0.00",
      })));
      setActiveTab("priceMatrix");
      setIsEditing(true);
    } catch (error) {
      useSwalErrorAlertAPI("Load Failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    if (activeTab === "categoryMatrix") {
      setCategoryEffectivityDate("");
      setOriginalCategoryEffectivityDate("");
      setCategoryRows([]);
      setCategoryLaboratories([]);
      setSelectedCategoryCode("");
      setCategoryAssignments({});
      setIsCategoryEditing(false);
      return;
    }
    setEffectivityDate("");
    setOriginalEffectivityDate("");
    setPriceRows([]);
    setIsEditing(false);
  };

  const resetSummary = () => queryClient.setQueryData(
    [activeTab === "categorySummary" ? "prodFOHCategoryLaboratorySummary" : "prodFOHLaboratoryPriceSummary"],
    [],
  );

  const refreshSummary = () => activeTab === "categorySummary" ? refetchCategorySummary() : refetchSummary();

  const editPriceMatrix = async (row) => {
    setIsLoading(true);
    try {
      const rows = parseResult(await apiClient.post("/prodFOHSetup/getLaboratoryPriceMatrix", {
        json_data: { effectivityDate: String(row.effectivityDate || "").split("T")[0] },
      }));
      const selectedDate = String(row.effectivityDate || "").split("T")[0];
      setEffectivityDate(selectedDate);
      setOriginalEffectivityDate(selectedDate);
      setPriceRows(rows.map((detail, index) => ({
        lineNo: index + 1,
        laboratoryCode: detail.laboratoryCode,
        laboratoryName: detail.laboratoryName,
        unitCost: formatAmount(detail.unitCost),
      })));
      setActiveTab("priceMatrix");
      setIsEditing(true);
    } catch (error) {
      useSwalErrorAlertAPI("Retrieve Failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const editCategoryMatrix = async (row) => {
    setIsLoading(true);
    try {
      const selectedDate = String(row.effectivityDate || "").split("T")[0];
      const [matrixResponse, categoryResponse, laboratoryResponse] = await Promise.all([
        apiClient.post("/prodFOHSetup/getCategoryLaboratoryMatrix", { json_data: { effectivityDate: selectedDate } }),
        apiClient.get("/prodFOHSetup/loadFGCategory"),
        apiClient.get("/prodFOHSetup/loadLaboratoryCode"),
      ]);
      const assignments = parseResult(matrixResponse).reduce((result, detail) => {
        result[detail.categoryCode] = [...(result[detail.categoryCode] || []), detail.laboratoryCode];
        return result;
      }, {});
      setCategoryEffectivityDate(selectedDate);
      setOriginalCategoryEffectivityDate(selectedDate);
      setCategoryRows(parseResult(categoryResponse));
      setCategoryLaboratories(parseResult(laboratoryResponse).filter((detail) => detail.active === "Y"));
      setCategoryAssignments(assignments);
      setSelectedCategoryCode("");
      setActiveTab("categoryMatrix");
      setIsCategoryEditing(true);
    } catch (error) {
      useSwalErrorAlertAPI("Retrieve Failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const save = () => {
    if (activeTab === "categoryMatrix") {
      const rows = Object.entries(categoryAssignments).flatMap(([categoryCode, laboratoryCodes]) =>
        laboratoryCodes.map((laboratoryCode) => ({ categoryCode, laboratoryCode })),
      );
      if (!categoryEffectivityDate) return useSwalErrorAlert("Required Field", "Effectivity Date is required.");
      if (!rows.length) return useSwalErrorAlert("Required Details", "Select at least one Laboratory Code for a category.");
      saveCategoryMutation.mutate({ json_data: { effectivityDate: categoryEffectivityDate, originalEffectivityDate: originalCategoryEffectivityDate || null, userCode, rows } });
      return;
    }
    if (!effectivityDate) return useSwalErrorAlert("Required Field", "Effectivity Date is required.");
    if (!priceRows.length) return useSwalErrorAlert("Required Details", "At least one Laboratory Price Detail is required.");
    saveMutation.mutate({
      json_data: {
        effectivityDate,
        originalEffectivityDate: originalEffectivityDate || null,
        userCode,
        rows: priceRows.map((row) => ({
          laboratoryCode: row.laboratoryCode,
          unitCost: Number(String(row.unitCost ?? "").replace(/,/g, "")) || 0,
        })),
      },
    });
  };

  useImperativeHandle(ref, () => ({ add, save, reset, refreshSummary, resetSummary }));
  useEffect(() => onStateChange?.({ activeView: activeTab, isEditing: activeTab === "categoryMatrix" ? isCategoryEditing : isEditing, isBusy: isLoading || isSummaryLoading || isCategorySummaryLoading || saveMutation.isPending || saveCategoryMutation.isPending || deletePriceMutation.isPending || deleteCategoryMutation.isPending }), [activeTab, deleteCategoryMutation.isPending, deletePriceMutation.isPending, isCategoryEditing, isCategorySummaryLoading, isEditing, isLoading, isSummaryLoading, onStateChange, saveCategoryMutation.isPending, saveMutation.isPending]);

  const updateUnitCost = (rowIndex, value) => {
    let nextValue = String(value ?? "").replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = nextValue.split(".");
    if (parts.length > 2) nextValue = `${parts[0]}.${parts.slice(1).join("")}`;
    setPriceRows((previous) => previous.map((row, index) => index === rowIndex ? { ...row, unitCost: nextValue } : row));
  };

  const priceColumns = useMemo(() => [
    { key: "laboratoryCode", label: "Laboratory Code", width: 180 },
    { key: "laboratoryName", label: "Laboratory Description", width: 520 },
    {
      key: "unitCost",
      label: "Unit Cost",
      width: 180,
      render: (row) => {
        const rowIndex = Number(row.lineNo) - 1;
        return (
          <input
            ref={(element) => { unitCostRefs.current[rowIndex] = element; }}
            value={row.unitCost}
            disabled={!isEditing}
            inputMode="decimal"
            onFocus={(event) => {
              if (Number(String(row.unitCost).replace(/,/g, "")) === 0) updateUnitCost(rowIndex, "");
              else event.currentTarget.select();
            }}
            onChange={(event) => updateUnitCost(rowIndex, event.currentTarget.value)}
            onBlur={(event) => updateUnitCost(rowIndex, formatAmount(event.currentTarget.value))}
            onKeyDown={(event) => {
              if (["-", "+", "e", "E"].includes(event.key)) event.preventDefault();
              if (event.key === "Enter") {
                event.preventDefault();
                updateUnitCost(rowIndex, formatAmount(event.currentTarget.value));
                unitCostRefs.current[rowIndex + 1]?.focus();
              }
            }}
            className="h-7 w-full bg-transparent px-2 text-right text-xs tabular-nums outline-none focus:ring-0 disabled:cursor-default disabled:text-slate-500 dark:text-slate-100 dark:disabled:text-slate-400"
          />
        );
      },
    },
  ], [isEditing]);

  const summaryColumns = useMemo(() => [
    {
      key: "__actions",
      label: "Actions",
      width: 95,
      minWidth: 95,
      maxWidth: 95,
      sortable: false,
      filterable: false,
      requiredVisible: true,
      render: (row) => (
        <div className="flex w-full items-center justify-center gap-1">
          <button type="button" onClick={() => editPriceMatrix(row)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-100 bg-blue-50 text-xs text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white" title="Edit Laboratory Price Matrix">
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
          <button type="button" onClick={() => deletePriceMatrix(row)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-100 bg-red-50 text-xs text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white" title="Delete Laboratory Price Matrix">
            <FontAwesomeIcon icon={faTrashAlt} />
          </button>
        </div>
      ),
    },
    { key: "effectivityDate", label: "Effectivity Date", width: 180, render: (row) => formatDate(row.effectivityDate) },
    { key: "laboratoryCount", label: "No. of Laboratory Codes", width: 210, renderType: "number" },
    { key: "totalUnitCost", label: "Total Unit Cost", width: 200, render: (row) => <div className="w-full text-right tabular-nums">{formatAmount(row.totalUnitCost)}</div> },
    { key: "registeredBy", label: "Registered By", width: 170 },
    { key: "registeredDate", label: "Registered Date", width: 180, render: (row) => formatDate(row.registeredDate) },
  ], []);

  const categoryColumns = useMemo(() => [
    {
      key: "__selectCategory",
      label: "Actions",
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      className: "whitespace-nowrap",
      sortable: false,
      filterable: false,
      requiredVisible: true,
      render: (row) => (
        <div className="flex w-full justify-center">
          <button
            type="button"
            disabled={!isCategoryEditing}
            onClick={() => setSelectedCategoryCode(row.categoryCode)}
            className={`inline-flex h-7 w-7 items-center justify-center rounded border text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selectedCategoryCode === row.categoryCode ? "border-blue-600 bg-blue-600 text-white" : "border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-600 hover:bg-blue-600 hover:text-white"}`}
            title="Select Category"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </button>
        </div>
      ),
    },
    {
      key: "categoryCode",
      label: "Category Code",
      width: 125,
      minWidth: 110,
    },
    { key: "categoryName", label: "Category Description", width: 235, minWidth: 190 },
    {
      key: "mappedLaboratories",
      label: "Has Laboratory",
      width: 120,
      minWidth: 120,
      maxWidth: 120,
      sortable: false,
      filterable: false,
      requiredVisible: true,
      render: (row) => {
        const mappedCount = (categoryAssignments[row.categoryCode] || []).length;
        return mappedCount > 0
          ? <div className="flex items-center justify-center gap-1.5 text-green-600"><FontAwesomeIcon icon={faCircleCheck} /><span className="text-xs">Yes ({mappedCount})</span></div>
          : <div className="text-center text-xs text-slate-500">No</div>;
      },
    },
  ], [categoryAssignments, isCategoryEditing, selectedCategoryCode]);

  const categoryLaboratoryColumns = useMemo(() => [
    {
      key: "selected",
      label: "",
      width: 54,
      minWidth: 54,
      maxWidth: 54,
      sortable: false,
      filterable: false,
      render: (row) => {
        const selectedCodes = categoryAssignments[selectedCategoryCode] || [];
        return <div className="flex justify-center"><input type="checkbox" checked={selectedCodes.includes(row.laboratoryCode)} disabled={!isCategoryEditing || !selectedCategoryCode} onChange={(event) => setCategoryAssignments((previous) => ({ ...previous, [selectedCategoryCode]: event.target.checked ? [...new Set([...(previous[selectedCategoryCode] || []), row.laboratoryCode])] : (previous[selectedCategoryCode] || []).filter((code) => code !== row.laboratoryCode) }))} className="h-4 w-4 accent-blue-600" /></div>;
      },
    },
    { key: "laboratoryCode", label: "Laboratory Code", width: 160 },
    { key: "laboratoryName", label: "Laboratory Description", width: 340 },
  ], [categoryAssignments, isCategoryEditing, selectedCategoryCode]);

  const categorySummaryColumns = useMemo(() => [
    {
      key: "__actions",
      label: "Actions",
      width: 95,
      minWidth: 95,
      maxWidth: 95,
      sortable: false,
      filterable: false,
      requiredVisible: true,
      render: (row) => <div className="flex w-full justify-center gap-1"><button type="button" onClick={() => editCategoryMatrix(row)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-100 bg-blue-50 text-xs text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white" title="Edit Category-Laboratory Matrix"><FontAwesomeIcon icon={faPenToSquare} /></button><button type="button" onClick={() => deleteCategoryMatrix(row)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-100 bg-red-50 text-xs text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white" title="Delete Category-Laboratory Matrix"><FontAwesomeIcon icon={faTrashAlt} /></button></div>,
    },
    { key: "effectivityDate", label: "Effectivity Date", width: 180, render: (row) => formatDate(row.effectivityDate) },
    { key: "categoryCount", label: "No. of Categories", width: 180, renderType: "number" },
    { key: "laboratoryCount", label: "No. of Laboratories", width: 190, renderType: "number" },
    { key: "mappingCount", label: "No. of Mappings", width: 170, renderType: "number" },
    { key: "registeredBy", label: "Registered By", width: 170 },
    { key: "registeredDate", label: "Registered Date", width: 180, render: (row) => formatDate(row.registeredDate) },
  ], []);

  return (
    <div className="w-full">
      {(isLoading || saveMutation.isPending || saveCategoryMutation.isPending || deletePriceMutation.isPending || deleteCategoryMutation.isPending) && <LoadingSpinner />}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-3 pt-0 dark:border-slate-700 dark:from-slate-800/60 dark:to-slate-900">
        {laboratoryTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative mt-2 inline-flex items-center gap-2 rounded-t-lg border px-4 py-3 text-[12px] font-semibold transition-all duration-200 focus:outline-none ${
              activeTab === tab.key
                ? "border-b-0 border-slate-200 bg-gradient-to-b from-blue-50 to-white text-blue-700 shadow-[inset_0_2px_0_0_#2563eb] dark:border-slate-700 dark:from-blue-950/60 dark:to-slate-900 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-blue-400"
            }`}
            style={activeTab === tab.key ? { marginBottom: "-1px", zIndex: 1 } : undefined}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded ${activeTab === tab.key ? "bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
              <FontAwesomeIcon icon={tab.icon} className="text-[12px]" />
            </span>
            <span className="whitespace-nowrap">{tab.label}</span>
            {activeTab === tab.key && <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
          </button>
        ))}
      </div>

      <section className={activeTab === "priceMatrix" ? "block" : "hidden"}>
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <div className="max-w-md">
              <FieldRenderer label="Effectivity Date" required type="date" value={effectivityDate} disabled={!isEditing} onChange={setEffectivityDate} />
            </div>
          </div>
          <div className="global-tran-table-main-div-ui overflow-hidden">
            <SearchGlobalReferenceTable docType="Laboratory Price Matrix" columns={priceColumns} data={priceRows} itemsPerPage={100} autoFillGrid showFilters />
          </div>
        </div>
      </section>
      <section className={activeTab === "priceSummary" ? "block" : "hidden"}>
        <div className="min-h-[420px] overflow-hidden rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <SearchGlobalReferenceTable docType="Laboratory Price Summary" columns={summaryColumns} data={priceSummary} isLoading={isSummaryLoading} itemsPerPage={100} autoFillGrid showFilters showEmptyPagination />
        </div>
      </section>
      <section className={activeTab === "categoryMatrix" ? "block" : "hidden"}>
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700"><div className="max-w-md"><FieldRenderer label="Effectivity Date" required type="date" value={categoryEffectivityDate} disabled={!isCategoryEditing} onChange={setCategoryEffectivityDate} /></div></div>
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200"><SearchGlobalReferenceTable docType="FG Category" columns={categoryColumns} data={categoryRows} itemsPerPage={100} autoFillGrid showFilters getRowClassName={(row) => selectedCategoryCode === row.categoryCode ? "bg-blue-100" : ""} getCellClassName={(row) => selectedCategoryCode === row.categoryCode ? "!bg-blue-100 text-blue-800" : ""} /></div>
            <div className="overflow-hidden rounded-xl border border-slate-200"><SearchGlobalReferenceTable docType="Laboratory Selection" columns={categoryLaboratoryColumns} data={categoryLaboratories} itemsPerPage={100} autoFillGrid showFilters /></div>
          </div>
        </div>
      </section>
      <section className={activeTab === "categorySummary" ? "block" : "hidden"}>
        <div className="min-h-[420px] overflow-hidden rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <SearchGlobalReferenceTable docType="Category-Laboratory Summary" columns={categorySummaryColumns} data={categorySummary} isLoading={isCategorySummaryLoading} itemsPerPage={100} autoFillGrid showFilters showEmptyPagination />
        </div>
      </section>
    </div>
  );
});

LaboratorySetup.displayName = "LaboratorySetup";
export default LaboratorySetup;
