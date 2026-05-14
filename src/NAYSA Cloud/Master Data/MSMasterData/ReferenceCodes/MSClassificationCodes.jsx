// src/NAYSA Cloud/Reference File/ReferenceCodes/ClassificationCodes.jsx
import React, { forwardRef, useImperativeHandle, useState, useEffect, useMemo } from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt, faPlus, faUndo, faSave } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSwalErrorAlert, useSwalSuccessAlert, useSwalDeleteConfirm, useSwalDeleteRecord } from "@/NAYSA Cloud/Global/behavior.jsx";

const emptyForm = { code: "", description: "", __isNew: false };

const ClassificationCodes = forwardRef(({ onStateChange }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ ...emptyForm });
    const [tableData, setTableData] = useState([]);

    useEffect(() => { onStateChange?.({ isEditing, canSave: isEditing }); }, [isEditing, onStateChange]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.post("/getMSReferenceList", { type: "classification" });
            const rawData = res?.data?.data?.[0]?.result;
            setTableData(rawData ? JSON.parse(rawData) : []);
        } catch (e) {
            setTableData([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleAdd = () => { setForm({ ...emptyForm, __isNew: true }); setIsEditing(true); };
    const handleReset = () => { setForm({ ...emptyForm }); setIsEditing(false); };
    const handleSave = async () => {
        if (!form.code || !form.description) return useSwalErrorAlert("Required", "Please provide Code and Description.");
        setIsLoading(true);
        try {
            await apiClient.post("/upsertMSReference", {
                json_data: JSON.stringify({ json_data: { type: "classification", action: form.__isNew ? "add" : "edit", ...form } })
            });
            await useSwalSuccessAlert("Saved", "Classification Code saved successfully.");
            setForm(prev => ({ ...prev, __isNew: false }));
            setIsEditing(false);
            loadData();
        } catch (e) {
            await useSwalErrorAlert("Error", "Failed to save record.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (form.__isNew || !form.code) return;
        const confirm = await useSwalDeleteConfirm("Delete Record?", `Delete Classification Code ${form.code}?`);
        if (!confirm.isConfirmed) return;
        setIsLoading(true);
        try {
            await apiClient.post("/deleteMSReference", { type: "classification", code: form.code });
            await useSwalDeleteRecord("Deleted", "Record removed successfully.");
            handleReset();
            loadData();
        } catch (e) {
            await useSwalErrorAlert("Error", "Failed to delete record.");
        } finally {
            setIsLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({ add: handleAdd, reset: handleReset, save: handleSave }));

    const columns = useMemo(() => [
        { key: "code", label: "Classification Code", sortable: true, width: 140 },
        { key: "description", label: "Classification Description / Name", sortable: true, width: 300 },
    ], []);

    return (
        <div className="flex flex-col xl:flex-row gap-3 h-full">
            <div className="w-full xl:w-[400px] shrink-0 h-full">
                <div className="bg-white shadow-sm border border-slate-200 rounded-md flex flex-col h-full overflow-hidden">
                    <div className="flex items-center gap-1 p-2 border-b border-slate-300 bg-slate-50 shrink-0">
                        <button onClick={handleAdd} disabled={isLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 rounded disabled:opacity-50"><FontAwesomeIcon icon={faPlus} className="text-emerald-600" /> Add</button>
                        <button onClick={handleReset} disabled={isLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 rounded disabled:opacity-50"><FontAwesomeIcon icon={faUndo} className="text-blue-600" /> Reset</button>
                        <button onClick={handleSave} disabled={isLoading || !isEditing} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 rounded disabled:opacity-50"><FontAwesomeIcon icon={faSave} className="text-slate-400" /> Save</button>
                        <button onClick={handleDelete} disabled={isLoading || form.__isNew || !form.code} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 rounded disabled:opacity-50"><FontAwesomeIcon icon={faTrashAlt} className="text-red-500" /> Delete</button>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="text-[12px] font-bold text-slate-500 border-b pb-1">BASIC INFORMATION</div>
                        <FieldRenderer label="Classification Code" required type="text" value={form.code} onChange={(v) => setForm(p => ({ ...p, code: v.target?.value ?? v }))} readOnly={!form.__isNew || !isEditing} disabled={isLoading} />
                        <FieldRenderer label="Classification Description" required type="text" value={form.description} onChange={(v) => setForm(p => ({ ...p, description: v.target?.value ?? v }))} readOnly={!isEditing} disabled={isLoading} />
                    </div>
                </div>
            </div>

            <div className="flex-1 h-[500px] xl:h-full bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col">
                <SearchGlobalReferenceTable
                    columns={columns}
                    data={tableData.map(r => ({ ...r, code: r.classCode || r.code, description: r.classDesc || r.description }))}
                    itemsPerPage={50}
                    showFilters={true}
                    docType="MSReference"
                    onRowDoubleClick={(row) => {
                        setForm({ code: row.code, description: row.description, __isNew: false });
                        setIsEditing(true);
                    }}
                    autoFillGrid={true}
                />
            </div>
        </div>
    );
});
ClassificationCodes.displayName = "ClassificationCodes";
export default ClassificationCodes;