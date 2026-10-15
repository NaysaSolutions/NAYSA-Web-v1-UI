import React from "react";

import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const FOHStandard = ({ form, isEditing, updateForm, registrationInfo, columns, rows, onBOMLookup }) => (
  <div className="w-full pb-4">
    <div className="global-tran-header-div-ui !mt-0">
      <div className="global-tran-header-tab-div-ui">
        <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">BOM Information</button>
      </div>
      <div className="grid grid-cols-1 gap-4 rounded-lg lg:grid-cols-4">
        <input type="hidden" name="bomId" value={form.bomId} readOnly />
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 md:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
          <div className="relative w-full">
            <div className={`global-ref-textbox-ui flex items-stretch ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
              <DateFormatInput id="fohEffectivityDate" className="peer flex-grow cursor-pointer border-none bg-transparent px-3 focus:outline-none"
                value={form.fohEffectivityDate} disabled={!isEditing} updateState={updateForm} />
            </div>
            <label htmlFor="fohEffectivityDate" className={`global-ref-floating-label ${isEditing ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}>
              FOH Effectivity Date <span className="text-red-500">*</span>
            </label>
          </div>
          <FieldRenderer id="itemType" label="Item Type" type="text" value={form.itemType} disabled readOnly />
          <FieldRenderer id="uom" label="UOM" type="text" value={form.uom} disabled readOnly />
          <FieldRenderer id="bomCode" label="BOM Code" type="lookup" required value={form.bomCode} disabled={!isEditing} onLookup={onBOMLookup} />
          <FieldRenderer id="itemCode" label="Item Code" type="text" value={form.itemCode} disabled readOnly />
          <FieldRenderer id="quantity" label="Quantity" type="amount" value={form.quantity} disabled readOnly />
          <div className="relative w-full">
            <div className="global-ref-textbox-ui global-ref-textbox-disabled flex items-stretch">
              <DateFormatInput id="bomEffectivityDate" className="peer flex-grow border-none bg-transparent px-3 focus:outline-none" value={form.bomEffectivityDate} disabled updateState={updateForm} />
            </div>
            <label htmlFor="bomEffectivityDate" className="global-ref-floating-label global-ref-label-disabled">BOM Effectivity Date</label>
          </div>
          <div className="md:col-span-1 lg:col-span-2">
            <FieldRenderer id="itemDescription" label="Item Description" type="text" value={form.itemDescription} disabled readOnly />
          </div>
          <div className="col-span-full">
            <div className="relative">
              <textarea id="fohStandardRemarks" rows={3} value={form.remarks} disabled={!isEditing}
                onChange={(event) => updateForm({ remarks: event.target.value })}
                className="peer global-tran-textbox-remarks-ui px-3 pb-2 pt-6" />
              <label htmlFor="fohStandardRemarks" className="global-tran-floating-label-remarks">Remarks</label>
            </div>
          </div>
        </div>
        <div className="global-tran-textbox-group-div-ui">
          <RegistrationInfo layout="stacked" data={registrationInfo} />
        </div>
      </div>
    </div>
    <div className="global-tran-tab-div-ui">
      <div className="global-tran-tab-nav-ui">
        <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">FOH Labor Standard Details</button>
      </div>
      <div className="global-tran-table-main-div-ui relative overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <SearchGlobalReferenceTable key={`foh-standard-details-${isEditing ? "edit" : "view"}`}
          docType="FOH Labor Standard Details" columns={columns} data={rows} itemsPerPage={100}
          showFilters tableSize="Half" autoFillGrid />
      </div>
    </div>
  </div>
);

export default FOHStandard;
