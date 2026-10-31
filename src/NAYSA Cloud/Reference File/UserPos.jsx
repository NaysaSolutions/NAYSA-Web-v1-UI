import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faPlus, faSave, faTrashAlt, faUndo } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { useSwalDeleteConfirm, useSwalErrorAlert, useSwalErrorAlertAPI, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const INITIAL_FORM = { posCode: "", posName: "", active: "Y" };
const INITIAL_REG = { registeredBy: "", registeredDate: "", lastUpdatedBy: "", lastUpdatedDate: "" };

export default function UserPos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const formTopRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const userCode = user?.USER_CODE || user?.userCode || "SYSTEM";

  const parseRows = (data) => {
    const raw = data?.data?.[0]?.result ?? "[]";
    return Array.isArray(raw) ? raw : JSON.parse(raw);
  };

  const { data: rows = [], isLoading: isListLoading } = useQuery({
    queryKey: ["user-positions"],
    queryFn: async () => parseRows((await apiClient.get("/user-positions")).data),
  });

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedCode(null);
    setIsEditing(false);
  };

  const saveMutation = useMutation({
    mutationFn: () => apiClient.post("/user-positions", { json_data: { ...form, userCode } }),
    onSuccess: ({ data }) => {
      const result = data?.data?.[0] || {};
      if ((result.errorcount || 0) > 0) return useSwalErrorAlert("Save Error", result.errormsg);
      queryClient.invalidateQueries({ queryKey: ["user-positions"] });
      useSwalSuccessAlert("Success!", "User Position Code saved successfully!");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("System Error", error),
  });

  const deleteMutation = useMutation({
    mutationFn: (posCode) => apiClient.post("/user-positions/delete", { json_data: { posCode, userCode } }),
    onSuccess: ({ data }) => {
      const result = data?.data?.[0] || {};
      if ((result.errorcount || 0) > 0) return useSwalErrorAlert("Delete Error", result.errormsg);
      queryClient.invalidateQueries({ queryKey: ["user-positions"] });
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  const handleSave = () => {
    if (!form.posCode.trim() || !form.posName.trim()) return useSwalErrorAlert("Validation Error", "Position Code and Position Name are required.");
    saveMutation.mutate();
  };

  const handleEdit = (row) => {
    setForm({ posCode: row.posCode || "", posName: row.posName || "", active: row.active || "Y" });
    setRegistrationInfo({
      registeredBy: row.registeredByName || row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.updatedByName || row.updatedBy || "",
      lastUpdatedDate: row.updatedDate || "",
    });
    setSelectedCode(row.posCode);
    setIsEditing(true);
  };

  const handleDelete = async (row) => {
    const confirmation = await useSwalDeleteConfirm("Confirm Delete", `Are you sure you want to delete Position: ${row.posCode}?`);
    if (confirmation.isConfirmed) deleteMutation.mutate(row.posCode);
  };

  const columns = useMemo(() => [
    {
      key: "__actions",
      label: "Actions",
      width: 100,
      render: (row) => <div className="flex w-full justify-center gap-2">
        <button onClick={(event) => { event.stopPropagation(); handleEdit(row); }} className="flex h-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 px-2 text-xs text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white" title="Edit"><FontAwesomeIcon icon={faEdit}/></button>
        <button onClick={(event) => { event.stopPropagation(); handleDelete(row); }} className="flex h-7 items-center justify-center rounded-md border border-red-100 bg-red-50 px-2 text-xs text-red-600 transition-colors hover:bg-red-600 hover:text-white" title="Delete"><FontAwesomeIcon icon={faTrashAlt}/></button>
      </div>,
    },
    { key: "posCode", label: "Position Code", sortable: true, width: 150, requiredVisible: true },
    { key: "posName", label: "Position Name", sortable: true, width: 400, maxWidth: 400, requiredVisible: true },
    { key: "active", label: "Active", width: 120, render: (row) => row.active === "Y" ? "Yes" : "No" },
  ], []);

  const busy = isListLoading || saveMutation.isPending || deleteMutation.isPending;

  return <div className="global-ref-main-div-ui">
    {busy && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]"><div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-2xl"><div className="relative"><div className="h-12 w-12 rounded-full border-4 border-blue-100"/><div className="absolute left-0 top-0 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"/></div><span className="text-sm font-semibold">{saveMutation.isPending ? "Saving..." : deleteMutation.isPending ? "Deleting..." : "Loading..."}</span></div></div>}

    <div className="global-ref-header-ui">
      <div className="grid w-full grid-cols-1 items-center gap-3 md:grid-cols-3 md:gap-0">
        <div className="flex w-full md:w-auto md:justify-start"><h1 className="global-ref-headertext-ui w-full truncate text-center md:w-auto md:text-left">User Position Codes</h1></div>
        <div className="hidden w-full justify-center md:flex"/>
        <div className="flex w-full md:w-auto md:justify-end"><div className="flex w-full flex-wrap items-center justify-center gap-2 md:w-auto md:justify-end">
          <ButtonBar buttons={[
            { key: "add", label: <span className="ml-1 sm:inline">Add</span>, icon: faPlus, onClick: () => { resetForm(); setIsEditing(true); }, className: "flex h-7 w-16 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 sm:h-8 sm:w-auto sm:px-4" },
            { key: "save", label: <span className="ml-1 sm:inline">Save</span>, icon: faSave, onClick: handleSave, disabled: !isEditing || saveMutation.isPending, className: `flex h-7 w-16 items-center justify-center rounded-md text-[11px] font-medium text-white transition-all sm:h-8 sm:w-auto sm:px-4 ${!isEditing ? "cursor-not-allowed bg-blue-500 opacity-50" : "bg-blue-600 hover:bg-blue-700"}` },
            { key: "reset", label: <span className="ml-1 sm:inline">Reset</span>, icon: faUndo, onClick: resetForm, className: "flex h-7 w-16 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 sm:h-8 sm:w-auto sm:px-4" },
          ]}/>
        </div></div>
      </div>
    </div>

    <div ref={formTopRef} className="mt-24 flex h-auto flex-col items-start gap-4 px-4 xl:flex-row">
      <div className="flex h-fit w-full shrink-0 flex-col gap-4 xl:w-[400px]">
        <div className="flex flex-col justify-center rounded-xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 border-b pb-2 text-sm font-bold uppercase tracking-wider text-blue-600">Entry Details</h2>
          <div className="space-y-6">
            <FieldRenderer label="Position Code" required type="text" value={form.posCode} disabled={!isEditing || !!selectedCode} onChange={(value) => setForm((old) => ({ ...old, posCode: String(value || "").toUpperCase() }))} maxLength={25}/>
            <FieldRenderer label="Position Name" required type="text" value={form.posName} disabled={!isEditing} onChange={(value) => setForm((old) => ({ ...old, posName: value || "" }))} maxLength={150}/>
            <FieldRenderer label="Active" type="select" value={form.active} disabled={!isEditing} options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]} onChange={(value) => setForm((old) => ({ ...old, active: value }))}/>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"><RegistrationInfo layout="stacked" data={registrationInfo}/></div>
      </div>

      <div className="global-tran-table-main-div-ui mt-0 flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <SearchGlobalReferenceTable docType="UserPos" columns={columns} data={rows} isLoading={isListLoading} onRowDoubleClick={handleEdit} itemsPerPage={50} autoFillGrid={true} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["user-positions"] })}/>
      </div>
    </div>
  </div>;
}
