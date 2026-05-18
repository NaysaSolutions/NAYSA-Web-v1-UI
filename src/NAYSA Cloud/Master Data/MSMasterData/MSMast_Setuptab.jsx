// src/NAYSA Cloud/Reference File/MSMast_SetupTab.jsx
import React, { useEffect, useRef, useState } from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { useFieldLenghtCheck, useGetFieldLength } from "@/NAYSA Cloud/Global/procedure";
import SearchMSInvCateg from "@/NAYSA Cloud/Lookup/SearchMSInvCateg.jsx";
import SearchMSInvClass from "@/NAYSA Cloud/Lookup/SearchMSInvClass.jsx";
import SearchUOM from "@/NAYSA Cloud/Lookup/SearchUOM.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";

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

// ── Added onLookupSelect + onBlurItemCode props (matching FGMast_SetupTab) ───
const MSMast_SetupTab = ({
  isLoading,
  isEditing,
  form = {},
  generationMode,
  onChangeForm,
  onLookupSelect,
  onBlurItemCode,
}) => {
  const isReadOnly = !isEditing;
  const isNewRecord = form.__isNew;
  const isDisabled = isReadOnly || isLoading;

  // Lookup modal states
  const [isCategOpen, setIsCategOpen] = useState(false);
  const [isClassOpen, setIsClassOpen] = useState(false);
  const [isItemLookupOpen, setIsItemLookupOpen] = useState(false);
  const [isUomOpen, setIsUomOpen] = useState(false);
  const [isUom2Open, setIsUom2Open] = useState(false);

  // Field lengths
  const [tblFieldArray, setTblFieldArray] = useState([]);
  useEffect(() => {
    const run = async () => {
      try {
        const result = await useFieldLenghtCheck("ms_mast");
        if (result) setTblFieldArray(result);
      } catch (e) {
        console.error("Failed to load field lengths:", e);
      }
    };
    run();
  }, []);

  const getLen = (col, fallback = undefined) =>
    useGetFieldLength(tblFieldArray, col) || fallback;

  // FG pattern: canType = isNewRecord (no generationMode check needed for MS)
  const canType = isNewRecord;
  const overrideRef = useRef(null);

  useEffect(() => {
    const attach = () => {
      if (!overrideRef.current) return;
      const input = overrideRef.current.querySelector("input");
      if (!input) return;

      if (canType) {
        const maxLen = getLen("item_code", 30);
        input.removeAttribute("readonly");
        input.setAttribute("maxlength", maxLen);
        input.onclick = (e) => e.stopPropagation();
        input.oninput = (e) => {
          let val = e.target.value;
          if (val.length > maxLen) val = val.substring(0, maxLen);
          onChangeForm({ itemCode: String(val).toUpperCase() });
        };
        input.onblur = (e) => {
          const val = String(e.target.value || "").trim();
          if (val) onBlurItemCode?.(val);
        };
      } else {
        input.setAttribute("readonly", "true");
        input.removeAttribute("maxlength");
        input.onclick = null;
        input.oninput = null;
        input.onblur = null;
      }
    };

    attach();
    const t = setTimeout(attach, 50);   // ← retry after paint
    return () => clearTimeout(t);
  }, [canType, isNewRecord, onChangeForm, onBlurItemCode, tblFieldArray]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start rounded-lg relative">

      {/* ================= LEFT COLUMN ================= */}
      <div className="flex flex-col gap-6">

        {/* Basic Information */}
        <Card className="border border-blue-500/30 p-6 rounded-lg">
          <SectionHeader title="BASIC INFORMATION" />

          {/* Item No — readOnly={true} always so FieldRenderer always renders the lookup icon.
                        When canType (new record), the useEffect above manually removes readonly
                        from the DOM input so the user can still type. */}
          <div
            ref={overrideRef}
            className={`w-full ${!canType
              ? "[&>div]:!bg-[#F1F5F9] [&_input]:!bg-transparent [&_input]:!text-slate-600 [&_label]:!bg-[#F1F5F9]"
              : "[&_input]:!pointer-events-auto"
              }`}
          >
            <FieldRenderer
              label="Item No"
              required
              type="lookup"
              value={form.itemCode || ""}
              onChange={(v) => onChangeForm({ itemCode: String(getValue(v)).toUpperCase() })}
              onLookup={() => !isLoading && !isNewRecord && setIsItemLookupOpen(true)}
              readOnly={true}
              disabled={isLoading}
              maxLength={getLen("item_code", 30)}
            />
          </div>

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
                onChange={(v) => onChangeForm({ uom: getValue(v) })}
                onLookup={() => !isDisabled && setIsUomOpen(true)}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
            </div>
            <div className="col-span-2">
              <FieldRenderer
                label="UOM Code 2"
                type="lookup"
                value={form.uom2 || ""}
                onChange={(v) => onChangeForm({ uom2: getValue(v) })}
                onLookup={() => !isDisabled && setIsUom2Open(true)}
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
              onChange={(v) => onChangeForm({ categoryCode: getValue(v) })}
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
              onChange={(v) => onChangeForm({ classCode: getValue(v), className: "" })}
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

          {[1, 2, 3].map((num) => (
            <div key={num} className="grid grid-cols-3 gap-2">
              <FieldRenderer
                label={`Sub Class ${num}`}
                type="lookup"
                value={form[`subClass${num}Code`] || ""}
                onChange={(v) => onChangeForm({ [`subClass${num}Code`]: getValue(v) })}
                onLookup={() => { }}
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

          {/* vacant01–06 (numeric conversions) + vacant07–12 (text variables) */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
            {[1, 2, 3, 4, 5, 6].map((i) => {
              const numCode = `vacant0${i}`;
              const textCode = i + 6 < 10 ? `vacant0${i + 6}` : `vacant${i + 6}`;
              return (
                <React.Fragment key={i}>
                  <FieldRenderer
                    label={`Vacant 0${i}`}
                    type="number"
                    value={form[numCode] || ""}
                    onChange={(v) => onChangeForm({ [numCode]: getValue(v) })}
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />
                  <FieldRenderer
                    label={textCode.replace("vacant", "Vacant ")}
                    type="text"
                    value={form[textCode] || ""}
                    onChange={(v) => onChangeForm({ [textCode]: getValue(v) })}
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
              label="Standard PO Price"
              type="number"
              value={form.stdPoPrice || ""}
              onChange={(v) => onChangeForm({ stdPoPrice: getValue(v) })}
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
              label="Last Purchase Price"
              type="number"
              value={form.lastPurPrice || ""}
              readOnly
              disabled
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

        <RegistrationInfo
          layout="twoCols"
          disabled
          data={{
            registeredBy: form.registeredBy || "",
            registeredDate: form.registeredDate || "",
            lastUpdatedBy: form.updatedBy || "",
            lastUpdatedDate: form.updatedDate || "",
          }}
        />
      </div>

      {/* ================= LOOKUP MODALS ================= */}
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

      <SearchUOM
        isOpen={isUomOpen}
        onClose={(selected) => {
          setIsUomOpen(false);
          if (selected) {
            onChangeForm({ uom: selected.uomCode });
          }
        }}
      />

      <SearchUOM
        isOpen={isUom2Open}
        onClose={(selected) => {
          setIsUom2Open(false);
          if (selected) {
            onChangeForm({ uom2: selected.uomCode });
          }
        }}
      />

      <ItemMastLookupModal
        isOpen={isItemLookupOpen}
        endpoint="/lookupMSMast"
        docType="PRMS"
        enableMultiSelect={false}
        onClose={(payload) => {
          setIsItemLookupOpen(false);
          const selected = payload?.records?.[0];
          if (selected) {
            onLookupSelect(selected.itemCode);
          }
        }}
      />
    </div>
  );
};

export default MSMast_SetupTab;