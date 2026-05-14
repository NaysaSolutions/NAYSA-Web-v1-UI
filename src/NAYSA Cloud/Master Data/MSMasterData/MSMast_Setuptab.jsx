// src/NAYSA Cloud/Reference File/MSMast_SetupTab.jsx
import React, { forwardRef, useRef, useMemo, useEffect, useState } from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { useFieldLenghtCheck, useGetFieldLength } from "@/NAYSA Cloud/Global/procedure";
import SearchMSInvCateg from "@/NAYSA Cloud/Lookup/SearchMSInvCateg.jsx";
import SearchMSInvClass from "@/NAYSA Cloud/Lookup/SearchMSInvClass.jsx";

// ── Matches PayeeSetupTab exactly ──────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-[9px] sm:text-[12px] font-bold text-slate-500 tracking-widest border-b pb-2">
      {title}
    </div>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div
    className={[
      "global-tran-textbox-group-div-ui flex flex-col",
      "transition-all duration-150",
      "focus-within:ring-2 focus-within:ring-blue-400/60 focus-within:shadow-2xl",
      "focus-within:-translate-y-[1px]",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

const normalizeUpper = (v) => String(v ?? "").toUpperCase().trim();

const getValue = (input) => {
  if (input && typeof input === "object") {
    if ("target" in input) return input.target?.value ?? "";
    if ("value" in input) return input.value ?? "";
  }
  return input ?? "";
};
// ───────────────────────────────────────────────────────────────────────────

const MSMast_SetupTab = forwardRef(
  ({ isLoading, isEditing, form = {}, generationMode, onChangeForm, onSelectItemCode }, ref) => {
    const isReadOnly  = !isEditing;
    const isNewRecord = form.__isNew;
    const isDisabled  = isReadOnly || isLoading;

    // Lookup modal state for Category
    const [isCategOpen,  setIsCategOpen]  = useState(false);
    const [isClassOpen, setIsClassOpen] = useState(false);

    // Field lengths — useEffect pattern (same as PayeeSetupTab)
    const [tblFieldArray, setTblFieldArray] = useState([]);
    useEffect(() => {
      const run = async () => {
        try {
          const result = await useFieldLenghtCheck("item_mast");
          if (result) setTblFieldArray(result);
        } catch (e) {
          console.error("Failed to load field lengths:", e);
        }
      };
      run();
    }, []);
    const getLen = (col, fallback = undefined) =>
      useGetFieldLength(tblFieldArray, col) || fallback;

    // Manual code entry logic (unchanged)
    const isManualMode = useMemo(() => {
      const mode = normalizeUpper(generationMode || "Manual");
      return mode === "MANUAL" || mode === "M";
    }, [generationMode]);

    const canType    = isNewRecord && isManualMode;
    const overrideRef = useRef(null);

    useEffect(() => {
      if (overrideRef.current) {
        const input = overrideRef.current.querySelector("input");
        if (input) {
          if (canType) {
            const maxLen = getLen("item_code", 30);
            input.removeAttribute("readonly");
            input.setAttribute("maxlength", maxLen);
            input.onclick = (e) => e.stopPropagation();
            input.oninput = (e) => {
              let val = e.target.value;
              if (val.length > maxLen) val = val.substring(0, maxLen);
              onChangeForm({ itemCode: val });
            };
          } else {
            input.setAttribute("readonly", "true");
            input.removeAttribute("maxlength");
            input.onclick = null;
            input.oninput = null;
          }
        }
      }
    }, [canType, isNewRecord, onChangeForm, tblFieldArray]);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start rounded-lg relative">
        <div className="flex flex-col gap-6">
          <Card className="border border-blue-500/30 p-6 rounded-lg">
            <SectionHeader title="BASIC INFORMATION" />

            <div
              ref={overrideRef}
              className={`w-full ${
                !canType
                  ? "[&>div]:!bg-[#F1F5F9] [&_input]:!bg-transparent [&_input]:!pointer-events-none [&_input]:!text-slate-600 [&_button]:!text-slate-400 [&_label]:!bg-[#F1F5F9]"
                  : ""
              }`}
            >
              <FieldRenderer
                label="Item No"
                required
                type="lookup"
                value={form.itemCode || ""}
                // 3. Corrected to call onSelectItemCode prop
                onLookup={canType ? undefined : () => !isDisabled && onSelectItemCode()}
                readOnly={!canType}
                disabled={isLoading}
                maxLength={getLen("item_code", 30)}
              />
            </div>

            {/* Item Description */}
            <FieldRenderer
              label="Item Description"
              required
              type="text"
              value={form.itemDesc || ""}
              onChange={(v) => onChangeForm({ itemDesc: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen("item_name", 200)}
            />

            {/* UOM row */}
            <div className="grid grid-cols-5 gap-2 mt-1">
              <div className="col-span-2">
                <FieldRenderer
                  label="UOM"
                  required
                  type="lookup"
                  value={form.uom || ""}
                  onLookup={() => {}}
                  readOnly={isReadOnly}
                  disabled={isDisabled}
                />
              </div>
              <div className="col-span-2">
                <FieldRenderer
                  label="UOM Code 2"
                  type="lookup"
                  value={form.uom2 || ""}
                  onLookup={() => {}}
                  readOnly={isReadOnly}
                  disabled={isDisabled}
                />
              </div>
              <div className="col-span-1">
                <FieldRenderer
                  label="Qty / UOM2"
                  type="number"
                  value={form.qtyPerUom2 || ""}
                  onChange={(v) => onChangeForm({ qtyPerUom2: getValue(v) })}
                  readOnly={isReadOnly}
                  disabled={isDisabled}
                />
              </div>
            </div>

            {/* Category */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              <FieldRenderer
                label="Category"
                required
                type="lookup"
                value={form.categoryCode || ""}
                onLookup={() => !isDisabled && setIsCategOpen(true)}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
              <div className="col-span-2">
                <FieldRenderer
                  type="text"
                  value={form.categoryName || ""}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Classification */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              <FieldRenderer
                label="Classification"
                type="lookup"
                value={form.classCode || ""}
                // 3. APPLY the click handler to open the modal
                onLookup={() => !isDisabled && setIsClassOpen(true)} 
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
              <div className="col-span-2">
                <FieldRenderer
                  type="text"
                  value={form.className || ""}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Active / Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <FieldRenderer
                label="Active"
                type="select"
                options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]}
                value={form.active || "Y"}
                onChange={(v) => onChangeForm({ active: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
              <FieldRenderer
                label="Status"
                type="select"
                options={[{ value: "New", label: "New" }]}
                value={form.status || ""}
                onChange={(v) => onChangeForm({ status: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
            </div>
          </Card>

          {/* Supplementary Information */}
          <Card className="border border-blue-500/30 p-6 rounded-lg">
            <SectionHeader title="SUPPLEMENTARY INFORMATION" />

            {/* Sub Class 1-3 */}
            {["1", "2", "3"].map((num) => (
              <div key={num} className="grid grid-cols-3 gap-2">
                <FieldRenderer
                  label={`Sub Class ${num}`}
                  type="lookup"
                  value={form[`subClass${num}Code`] || ""}
                  onLookup={() => {}}
                  readOnly={isReadOnly}
                  disabled={isDisabled}
                />
                <div className="col-span-2">
                  <FieldRenderer
                    type="text"
                    value={form[`subClass${num}Name`] || ""}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            ))}

            {/* Vacant numeric + text pairs */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
              {[1, 2, 3, 4, 5, 6].map((i) => {
                const vCode = `vacant0${i}`;
                const vText = i + 6 < 10 ? `vacant0${i + 6}` : `vacant${i + 6}`;
                return (
                  <React.Fragment key={i}>
                    <FieldRenderer
                      label={`Vacant 0${i}`}
                      type="number"
                      value={form[vCode] || ""}
                      onChange={(v) => onChangeForm({ [vCode]: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                    <FieldRenderer
                      label={vText.replace("vacant", "Vacant ")}
                      type="text"
                      value={form[vText] || ""}
                      onChange={(v) => onChangeForm({ [vText]: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="flex flex-col gap-6">

          {/* Other Information */}
          <Card className="border border-blue-500/30 p-6 rounded-lg">
            <SectionHeader title="OTHER INFORMATION" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRenderer
                label="Re-Order Level"
                type="number"
                value={form.reOrderLevel || ""}
                onChange={(v) => onChangeForm({ reOrderLevel: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
              <FieldRenderer
                label="Last Purchase Date"
                type="text"
                value={form.lastPurDate || ""}
                readOnly
                disabled
              />

              <FieldRenderer
                label="Standard PO Price"
                type="number"
                value={form.stdPoPrice || ""}
                onChange={(v) => onChangeForm({ stdPoPrice: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
              <FieldRenderer
                label="Last Purchase Price"
                type="number"
                value={form.lastPurPrice || ""}
                readOnly
                disabled
              />

              <FieldRenderer
                label="Selling Price"
                type="number"
                value={form.sellingPrice || ""}
                onChange={(v) => onChangeForm({ sellingPrice: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
              <FieldRenderer
                label="Allow Over Receiving?"
                type="select"
                options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]}
                value={form.allowOverRec || "N"}
                onChange={(v) => onChangeForm({ allowOverRec: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
            </div>
          </Card>

          {/* Stock Card Information */}
          <Card className="border border-blue-500/30 p-6 rounded-lg">
            <SectionHeader title="STOCK CARD INFORMATION" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRenderer
                label="Qty on Hand"
                type="number"
                value={form.qtyOnHand || ""}
                readOnly
                disabled
              />
              <FieldRenderer
                label="Unit Cost"
                type="number"
                value={form.unitCost || ""}
                readOnly
                disabled
              />
            </div>
          </Card>

          {/* Registration Information */}
          <RegistrationInfo
            layout="twoCols"
            disabled
            data={{
              registeredBy:    form.registeredBy  || "",
              registeredDate:  form.registeredDate || "",
              lastUpdatedBy:   form.updatedBy      || "",
              lastUpdatedDate: form.updatedDate    || "",
            }}
          />
        </div>

        {/* ================= LOOKUP MODALS ================= */}

        {/* Category lookup */}
        <SearchMSInvCateg
          isOpen={isCategOpen}
          onClose={(selected) => {
            setIsCategOpen(false);
            if (selected) {
              onChangeForm({
                categoryCode: selected.code,
                categoryName: selected.description,
              });
            }
          }}
        />

        {/* Classification lookup */}
        <SearchMSInvClass
          isOpen={isClassOpen}
          onClose={(selected) => {
            setIsClassOpen(false);
            if (selected) {
              onChangeForm({
                classCode: selected.code,
                className: selected.description,
              });
            }
          }}
        />

      </div>
    );
  }
);

MSMast_SetupTab.displayName = "MSMast_SetupTab";
export default MSMast_SetupTab;