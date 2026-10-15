import React from "react";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const Position = ({
  formTopRef,
  formData,
  setFormData,
  isEditing,
  selectedPositionCode,
  getMax,
  checkDuplicate,
  registrationInfo,
  columns,
  positionList,
  isListLoading,
  handleEdit,
  onRefresh,
}) => (
  <div ref={formTopRef} className="flex h-auto w-full flex-col gap-3">
    <div className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="flex flex-col rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <h2 className="mb-3 border-b border-slate-200 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
          Basic Information
        </h2>
        <div className="space-y-3">
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

      <RegistrationInfo layout="stacked" data={registrationInfo} />
    </div>

    <div className="global-ref-table-main-div-ui min-w-0 overflow-hidden">
      <SearchGlobalReferenceTable
        docType="FOH Position"
        className="!min-h-0 !h-auto [&_.global-tran-table-main-sub-div-ui]:!min-h-0 [&_.global-tran-table-main-sub-div-ui]:!flex-none [&_.custom-scrollbar]:max-h-[440px]"
        columns={columns}
        data={positionList}
        isLoading={isListLoading}
        onRowDoubleClick={handleEdit}
        itemsPerPage={50}
        autoFillGrid
        onRefresh={onRefresh}
      />
    </div>
  </div>
);

export default Position;
