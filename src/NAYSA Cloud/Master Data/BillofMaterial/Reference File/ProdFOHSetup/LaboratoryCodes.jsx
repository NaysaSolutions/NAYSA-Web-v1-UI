import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { useSwalDeleteConfirm, useSwalDeleteRecord, useSwalErrorAlert, useSwalErrorAlertAPI, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

const emptyForm = { laboratoryCode: "", laboratoryName: "", active: "Y" };
const emptyRegistration = { registeredBy: "", registeredDate: "", lastUpdatedBy: "", lastUpdatedDate: "" };
const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};

const LaboratoryCodes = forwardRef(({ onStateChange }, ref) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userCode = user?.USER_CODE || user?.userCode || "ADMIN";
  const [form, setForm] = useState(emptyForm);
  const [registration, setRegistration] = useState(emptyRegistration);
  const [selectedCode, setSelectedCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["prodFOHLaboratoryCodeList"],
    queryFn: async () => parseResult(await apiClient.get("/prodFOHSetup/loadLaboratoryCode")),
  });

  const reset = useCallback(() => {
    setForm(emptyForm);
    setRegistration(emptyRegistration);
    setSelectedCode("");
    setIsEditing(false);
  }, []);

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/upsertLaboratoryCode", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) return useSwalErrorAlert("Save Failed", result?.errormsg || "Unable to save Laboratory Code.");
      queryClient.invalidateQueries({ queryKey: ["prodFOHLaboratoryCodeList"] });
      useSwalSuccessAlert("Saved", "Laboratory Code saved successfully.");
      reset();
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/deleteLaboratoryCode", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) return useSwalErrorAlert("Delete Failed", result?.errormsg || "Unable to delete Laboratory Code.");
      queryClient.invalidateQueries({ queryKey: ["prodFOHLaboratoryCodeList"] });
      useSwalDeleteRecord("Deleted", "Laboratory Code deleted successfully.");
      reset();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Failed", error),
  });

  const add = useCallback(() => {
    reset();
    setIsEditing(true);
  }, [reset]);

  const edit = useCallback((row) => {
    setForm({ laboratoryCode: row.laboratoryCode || "", laboratoryName: row.laboratoryName || "", active: row.active || "Y" });
    setRegistration({ registeredBy: row.registeredBy || "", registeredDate: row.registeredDate || "", lastUpdatedBy: row.lastUpdatedBy || "", lastUpdatedDate: row.lastUpdatedDate || "" });
    setSelectedCode(row.laboratoryCode || "");
    setIsEditing(true);
  }, []);

  const save = async () => {
    const laboratoryCode = form.laboratoryCode.trim().toUpperCase();
    const laboratoryName = form.laboratoryName.trim();
    if (!laboratoryCode || !laboratoryName) return useSwalErrorAlert("Required Fields", "Laboratory Code and Laboratory Name are required.");
    if (!selectedCode) {
      const duplicate = parseResult(await apiClient.post("/prodFOHSetup/checkDuplicateLaboratoryCode", { json_data: { laboratoryCode } }));
      if (Number(duplicate?.result || duplicate?.[0]?.result || 0) > 0) return useSwalErrorAlert("Duplicate Laboratory Code", `${laboratoryCode} is already registered.`);
    }
    saveMutation.mutate({ json_data: { ...form, laboratoryCode, laboratoryName, userCode } });
  };

  const remove = async (row = null) => {
    const laboratoryCode = row?.laboratoryCode || selectedCode;
    if (!laboratoryCode) return;
    const confirmed = await useSwalDeleteConfirm("Delete Laboratory Code?", `Delete ${laboratoryCode}?`);
    if (!confirmed?.isConfirmed) return;
    deleteMutation.mutate({ json_data: { laboratoryCode, userCode } });
  };

  useImperativeHandle(ref, () => ({ add, save, remove, reset }), [add, reset, selectedCode, form]);
  React.useEffect(() => onStateChange?.({ isEditing, selectedCode, isBusy: isFetching || saveMutation.isPending || deleteMutation.isPending }), [deleteMutation.isPending, isEditing, isFetching, onStateChange, saveMutation.isPending, selectedCode]);

  const columns = useMemo(() => [
    { key: "actions", label: "Actions", width: 95, sortable: false, filterable: false, render: (row) => <div className="flex justify-center gap-1"><button type="button" onClick={() => edit(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-600" title="Edit Laboratory Code"><FontAwesomeIcon icon={faPenToSquare} /></button><button type="button" onClick={() => remove(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600" title="Delete Laboratory Code"><FontAwesomeIcon icon={faTrashAlt} /></button></div> },
    { key: "laboratoryCode", label: "Laboratory Code", width: 220 },
    { key: "laboratoryName", label: "Laboratory Name", width: 520 },
    { key: "active", label: "Active", width: 120, render: (row) => row.active === "Y" ? "Yes" : "No" },
  ], [edit]);

  return <div className="flex h-auto w-full flex-col gap-3">
    <div className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="flex flex-col rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <h2 className="mb-3 border-b border-slate-200 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">Basic Information</h2>
        <div className="space-y-3">
          <FieldRenderer label="Laboratory Code" required type="text" value={form.laboratoryCode} disabled={!isEditing || Boolean(selectedCode)} maxLength={20} onChange={(value) => setForm((previous) => ({ ...previous, laboratoryCode: String(value || "").toUpperCase() }))} />
          <FieldRenderer label="Laboratory Name" required type="text" value={form.laboratoryName} disabled={!isEditing} maxLength={100} onChange={(value) => setForm((previous) => ({ ...previous, laboratoryName: value || "" }))} />
          <FieldRenderer label="Active" type="select" value={form.active} disabled={!isEditing} options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]} onChange={(value) => setForm((previous) => ({ ...previous, active: value || "Y" }))} />
        </div>
      </div>
      <RegistrationInfo layout="stacked" data={registration} />
    </div>
    <div className="global-ref-table-main-div-ui min-w-0 overflow-hidden">
      <SearchGlobalReferenceTable docType="FOH Laboratory Codes" className="!min-h-0 !h-auto [&_.global-tran-table-main-sub-div-ui]:!min-h-0 [&_.global-tran-table-main-sub-div-ui]:!flex-none [&_.custom-scrollbar]:max-h-[440px]" columns={columns} data={data} isLoading={isFetching} onRowDoubleClick={edit} itemsPerPage={50} autoFillGrid onRefresh={refetch} />
    </div>
  </div>;
});

LaboratoryCodes.displayName = "LaboratoryCodes";
export default LaboratoryCodes;
