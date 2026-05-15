import React, { useEffect, useMemo, useRef, useState } from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { useFieldLenghtCheck, useGetFieldLength } from "@/NAYSA Cloud/Global/procedure";
import SearchFGInvCateg from "@/NAYSA Cloud/Lookup/SearchFGInvCateg.jsx";
import SearchFGInvClass from "@/NAYSA Cloud/Lookup/SearchFGInvClass.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";

// Import your UOM Search Modal
import SearchUOM from "@/NAYSA Cloud/Lookup/SearchUOM.jsx"; 

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

const FGMast_SetupTab = ({ isLoading, isEditing, form = {}, generationMode, onChangeForm, onLookupSelect, onBlurItemCode }) => {
    const isReadOnly = !isEditing;
    const isNewRecord = form.__isNew;
    const isDisabled = isReadOnly || isLoading;

    // Lookup modal states
    const [isCategOpen, setIsCategOpen] = useState(false);
    const [isClassOpen, setIsClassOpen] = useState(false);
    const [isItemLookupOpen, setIsItemLookupOpen] = useState(false);
    
    // Add UOM lookup states
    const [isUomOpen, setIsUomOpen] = useState(false);
    const [isUom2Open, setIsUom2Open] = useState(false);

    // Field lengths
    const [tblFieldArray, setTblFieldArray] = useState([]);
    useEffect(() => {
        const run = async () => {
            try {
                const result = await useFieldLenghtCheck("fg_mast");
                if (result) setTblFieldArray(result);
            } catch (e) {
                console.error("Failed to load field lengths:", e);
            }
        };
        run();
    }, []);
    const getLen = (col, fallback = undefined) =>
        useGetFieldLength(tblFieldArray, col) || fallback;

    const canType = isNewRecord;
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
            }
        }
    }, [canType, isNewRecord, onChangeForm, onBlurItemCode, tblFieldArray]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start rounded-lg relative">

            {/* ================= LEFT COLUMN ================= */}
            <div className="flex flex-col gap-6">

                {/* Basic Information */}
                <Card className="border border-blue-500/30 p-6 rounded-lg">
                    <SectionHeader title="BASIC INFORMATION" />

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

                    <div className="grid grid-cols-5 gap-2 mt-1">
                        <div className="col-span-2">
                            <FieldRenderer
                                label="UOM"
                                required
                                type="lookup"
                                value={form.uom || ""}
                                onChange={(v) => onChangeForm({ uom: getValue(v) })}
                                onLookup={() => !isDisabled && setIsUomOpen(true)} // Open UOM1 Lookup
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
                                onLookup={() => !isDisabled && setIsUom2Open(true)} // Open UOM2 Lookup
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

                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
                        {[7, 8, 9, 10, 11, 12].map((i) => {
                            const vCode = i < 10 ? `vacant0${i}` : `vacant${i}`;
                            return (
                                <FieldRenderer
                                    key={i}
                                    label={vCode.replace("vacant", "Vacant ")}
                                    type="text"
                                    value={form[vCode] || ""}
                                    onChange={(v) => onChangeForm({ [vCode]: getValue(v) })}
                                    readOnly={isReadOnly}
                                    disabled={isDisabled}
                                />
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* ================= RIGHT COLUMN ================= */}
            <div className="flex flex-col gap-6">

                {/* Ordering & Pricing */}
                <Card className="border border-blue-500/30 p-6 rounded-lg">
                    <SectionHeader title="ORDERING & PRICING" />
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
                            label="Selling Price"
                            type="number"
                            value={form.sellingPrice || ""}
                            onChange={(v) => onChangeForm({ sellingPrice: getValue(v) })}
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
                            label="Plan Type"
                            type="select"
                            options={[
                                { value: "Purchased", label: "Purchased" },
                                { value: "Manufactured", label: "Manufactured" },
                            ]}
                            value={form.planType || "Purchased"}
                            onChange={(v) => onChangeForm({ planType: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="Min Order Qty"
                            type="number"
                            value={form.minOrderQty || ""}
                            onChange={(v) => onChangeForm({ minOrderQty: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="Max Order Qty"
                            type="number"
                            value={form.maxOrderQty || ""}
                            onChange={(v) => onChangeForm({ maxOrderQty: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="Standard Packing Qty"
                            type="number"
                            value={form.stdPackingQty || ""}
                            onChange={(v) => onChangeForm({ stdPackingQty: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="Shelf Life"
                            type="number"
                            value={form.shelfLife || ""}
                            onChange={(v) => onChangeForm({ shelfLife: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="Purchasing Lead Time"
                            type="number"
                            value={form.purchasingLeadTime || ""}
                            onChange={(v) => onChangeForm({ purchasingLeadTime: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="Production Lead Time"
                            type="number"
                            value={form.productionLeadTime || ""}
                            onChange={(v) => onChangeForm({ productionLeadTime: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                    </div>
                </Card>

                {/* Stock Card Information */}
                <Card className="border border-blue-500/30 p-6 rounded-lg">
                    <SectionHeader title="STOCK CARD INFORMATION" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FieldRenderer label="Last Purchase Date" type="text" value={form.lastPurDate || ""} readOnly disabled />
                        <FieldRenderer label="Last Purchase Price" type="number" value={form.lastPurPrice || ""} readOnly disabled />
                        <FieldRenderer
                            label="Allow Over Receiving?"
                            type="select"
                            options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]}
                            value={form.allowOverRec || "N"}
                            onChange={(v) => onChangeForm({ allowOverRec: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer label="Qty on Hand" type="number" value={form.qtyOnHand || ""} readOnly disabled />
                        <FieldRenderer label="Unit Cost" type="number" value={form.unitCost || ""} readOnly disabled />
                    </div>
                </Card>

                {/* Standard Costs */}
                <Card className="border border-blue-500/30 p-6 rounded-lg">
                    <SectionHeader title="STANDARD COSTS" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FieldRenderer
                            label="STD Unit Cost"
                            type="number"
                            value={form.stdUnitCost || ""}
                            onChange={(v) => onChangeForm({ stdUnitCost: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="STD DL Cost"
                            type="number"
                            value={form.stdDlCost || ""}
                            onChange={(v) => onChangeForm({ stdDlCost: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="STD FOH Cost"
                            type="number"
                            value={form.stdFohCost || ""}
                            onChange={(v) => onChangeForm({ stdFohCost: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="STD OS Cost"
                            type="number"
                            value={form.stdOsCost || ""}
                            onChange={(v) => onChangeForm({ stdOsCost: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                        <FieldRenderer
                            label="STD DM Cost"
                            type="number"
                            value={form.stdDmCost || ""}
                            onChange={(v) => onChangeForm({ stdDmCost: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                        />
                    </div>
                </Card>

                {/* Additional Details */}
                <Card className="border border-blue-500/30 p-6 rounded-lg">
                    <SectionHeader title="ADDITIONAL DETAILS" />
                    <div className="space-y-3">
                        <FieldRenderer
                            label="Barcode / Part No"
                            type="text"
                            value={form.barcode || ""}
                            onChange={(v) => onChangeForm({ barcode: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                            maxLength={getLen("barcode", 50)}
                        />
                        <div className="grid grid-cols-3 gap-2">
                            <FieldRenderer
                                label="Alternate Item No"
                                type="lookup"
                                value={form.altItemCode || ""}
                                onChange={(v) => onChangeForm({ altItemCode: getValue(v) })}
                                onLookup={() => { }}
                                readOnly={isReadOnly}
                                disabled={isDisabled}
                            />
                            <div className="col-span-2">
                                <FieldRenderer
                                    label="Alternate Item Desc"
                                    type="text"
                                    value={form.altItemDesc || ""}
                                    onChange={(v) => onChangeForm({ altItemDesc: getValue(v) })}
                                    readOnly={isReadOnly}
                                    disabled={isDisabled}
                                />
                            </div>
                        </div>
                        <FieldRenderer
                            label="Item Description (2)"
                            type="text"
                            value={form.itemDesc2 || ""}
                            onChange={(v) => onChangeForm({ itemDesc2: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                            maxLength={getLen("fg2_name", 200)}
                        />
                        <FieldRenderer
                            label="Item Description (3)"
                            type="text"
                            value={form.itemDesc3 || ""}
                            onChange={(v) => onChangeForm({ itemDesc3: getValue(v) })}
                            readOnly={isReadOnly}
                            disabled={isDisabled}
                            maxLength={getLen("fg3_name", 200)}
                        />
                        <div className="grid grid-cols-3 gap-2">
                            <FieldRenderer
                                label="Payee"
                                type="lookup"
                                value={form.payeeCode || ""}
                                onChange={(v) => onChangeForm({ payeeCode: getValue(v) })}
                                onLookup={() => { }}
                                readOnly={isReadOnly}
                                disabled={isDisabled}
                            />
                            <div className="col-span-2">
                                <FieldRenderer type="text" value={form.payeeName || ""} readOnly disabled />
                            </div>
                        </div>
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
            <SearchFGInvCateg
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

            <SearchFGInvClass
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

            <ItemMastLookupModal
                isOpen={isItemLookupOpen}
                endpoint="/lookupFGMast"
                docType="PRFG"
                enableMultiSelect={false}
                onClose={(payload) => {
                    setIsItemLookupOpen(false);
                    const selected = payload?.records?.[0];
                    if (selected) {
                        onLookupSelect(selected.itemCode);
                    }
                }}
            />

            {/* UOM 1 Lookup */}
            <SearchUOM
                isOpen={isUomOpen}
                onClose={(selected) => {
                    setIsUomOpen(false);
                    if (selected) {
                        onChangeForm({ uom: selected.uomCode });
                    }
                }}
            />

            {/* UOM 2 Lookup */}
            <SearchUOM
                isOpen={isUom2Open}
                title="Select UOM 2"
                onClose={(selected) => {
                    setIsUom2Open(false);
                    if (selected) {
                        onChangeForm({ uom2: selected.uomCode });
                    }
                }}
            />
        </div>
    );
};

export default FGMast_SetupTab;