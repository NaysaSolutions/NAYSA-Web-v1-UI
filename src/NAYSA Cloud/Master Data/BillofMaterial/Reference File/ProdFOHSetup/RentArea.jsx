import React from "react";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const RentArea = ({
  formTopRef,
  form,
  setForm,
  isEditing,
  selectedAreaCode,
  getMax,
  checkDuplicate,
  registrationInfo,
  columns,
  data,
  isLoading,
  onEdit,
  onRefresh,
}) => (
  <div ref={formTopRef} className="flex h-auto w-full flex-col gap-3">
    <div className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="flex flex-col rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <h2 className="mb-3 border-b border-slate-200 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
          Basic Information
        </h2>
        <div className="space-y-3">
          <FieldRenderer label="Area Code" required type="text" value={form.areaCode}
            disabled={!isEditing || Boolean(selectedAreaCode)} maxLength={getMax("AREA_CODE")}
            onChange={(value) => setForm((previous) => ({ ...previous, areaCode: String(value || "").toUpperCase() }))}
            onBlur={(event) => checkDuplicate(event.target.value)} />
          <FieldRenderer label="Area Name" required type="text" value={form.areaName}
            disabled={!isEditing} maxLength={getMax("AREA_NAME")}
            onChange={(value) => setForm((previous) => ({ ...previous, areaName: value || "" }))} />
          <FieldRenderer label="Area (SQM)" type="number" value={form.areaSqm}
            disabled={!isEditing} min="0" step="0.000001"
            onChange={(value) => setForm((previous) => ({ ...previous, areaSqm: value ?? "" }))}
            onBlur={(event) => setForm((previous) => ({ ...previous, areaSqm: Math.max(0, Number(event.target.value || 0)).toFixed(6) }))} />
          <FieldRenderer label="Active" type="select" value={form.active} disabled={!isEditing}
            options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]}
            onChange={(value) => setForm((previous) => ({ ...previous, active: value || "Y" }))} />
        </div>
      </div>
      <RegistrationInfo layout="stacked" data={registrationInfo} />
    </div>

    <div className="global-ref-table-main-div-ui min-w-0 overflow-hidden">
      <SearchGlobalReferenceTable docType="FOH Rent Area"
        className="!min-h-0 !h-auto [&_.global-tran-table-main-sub-div-ui]:!min-h-0 [&_.global-tran-table-main-sub-div-ui]:!flex-none [&_.custom-scrollbar]:max-h-[440px]"
        columns={columns} data={data} isLoading={isLoading} onRowDoubleClick={onEdit}
        itemsPerPage={50} autoFillGrid onRefresh={onRefresh} />
    </div>
  </div>
);

export default RentArea;
