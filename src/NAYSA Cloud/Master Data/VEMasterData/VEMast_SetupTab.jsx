import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faCamera, faBoxesStacked, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchVendMast from "@/NAYSA Cloud/Lookup/SearchVendMast.jsx";
import VEMast_ColorMatrix from "@/NAYSA Cloud/Master Data/VEMasterData/VEMast_ColorMatrix.jsx";


const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === "string") {
    try {
      return JSON.parse(res) || [];
    } catch {
      return [];
    }
  }
  return [];
};

const yesNoOptions = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

const activeOptions = [
  { value: "Y", label: "Active" },
  { value: "N", label: "Inactive" },
];

const Card = ({ children, className = "" }) => (
  <div className={`global-tran-textbox-group-div-ui flex flex-col ${className}`}>{children}</div>
);

const SectionHeader = ({ title, icon }) => (
  <div className="mb-3 mt-1 flex items-center gap-2 border-b border-blue-100 pb-2 text-[10px] sm:text-[11px] font-bold tracking-widest text-blue-600/80">
    {icon ? <FontAwesomeIcon icon={icon} /> : null}
    {title}
  </div>
);

const VEMast_SetupTab = ({ form, isEditing = false, isReadOnly = false, isLoading = false, onChangeForm, onBlurItemCode }) => {
  const [categories, setCategories] = useState([]);
  const [classes, setClasses] = useState([]);
  const [colors, setColors] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [isVendOpen, setIsVendOpen] = useState(false);
  const imageInputRef = useRef(null);

  const disabled = isReadOnly || !isEditing || isLoading;

  useEffect(() => {
    let mounted = true;

    const loadReferences = async () => {
      setLoadingRefs(true);
      try {
        const [catRes, classRes, colorRes] = await Promise.all([
          apiClient.get("/veCateg"),
          apiClient.get("/veClass"),
          apiClient.get("/veColor"),
        ]);

        if (!mounted) return;
        setCategories(extractRows(catRes));
        setClasses(extractRows(classRes));
        setColors(extractRows(colorRes));
      } catch (error) {
        console.error("Failed to load Vehicle Master references", error);
        if (!mounted) return;
        setCategories([]);
        setClasses([]);
        setColors([]);
      } finally {
        if (mounted) setLoadingRefs(false);
      }
    };

    loadReferences();
    return () => { mounted = false; };
  }, []);

  const categoryOptions = useMemo(
    () => categories.map((row) => ({
      value: String(row.code ?? row.categCode ?? ""),
      label: `${row.code ?? row.categCode ?? ""}${row.description ?? row.categName ? ` - ${row.description ?? row.categName}` : ""}`,
    })).filter((row) => row.value),
    [categories]
  );

  const selectedCategory = useMemo(
    () => categories.find((row) => String(row.code ?? row.categCode ?? "") === String(form.categoryCode ?? "")),
    [categories, form.categoryCode]
  );

  const classOptions = useMemo(() => {
    return classes
      .filter((row) => !form.categoryCode || String(row.categCode ?? row.categoryCode ?? "") === String(form.categoryCode))
      .map((row) => ({
        value: String(row.code ?? row.classCode ?? ""),
        label: `${row.code ?? row.classCode ?? ""}${row.description ?? row.className ? ` - ${row.description ?? row.className}` : ""}`,
      }))
      .filter((row) => row.value);
  }, [classes, form.categoryCode]);

  const selectedClass = useMemo(
    () => classes.find((row) =>
      String(row.code ?? row.classCode ?? "") === String(form.classCode ?? "") &&
      (!form.categoryCode || String(row.categCode ?? row.categoryCode ?? "") === String(form.categoryCode))
    ),
    [classes, form.categoryCode, form.classCode]
  );

  const imageSrc = form.vehicleImageBase64
    ? (String(form.vehicleImageBase64).startsWith("data:")
        ? form.vehicleImageBase64
        : `data:image/jpeg;base64,${form.vehicleImageBase64}`)
    : "";

  const handleImage = (file) => {
    if (!file) return;
    if (!/^image\//i.test(file.type || "")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      onChangeForm?.({ vehicleImageBase64: dataUrl, removeVehicleImage: false });
    };
    reader.readAsDataURL(file);
  };

  const setCategory = (value) => {
    const row = categories.find((item) => String(item.code ?? item.categCode ?? "") === String(value ?? ""));
    onChangeForm?.({
      categoryCode: value ?? "",
      categoryName: row?.description ?? row?.categName ?? "",
      classCode: "",
      className: "",
    });
  };

  const setClass = (value) => {
    const row = classes.find((item) =>
      String(item.code ?? item.classCode ?? "") === String(value ?? "") &&
      (!form.categoryCode || String(item.categCode ?? item.categoryCode ?? "") === String(form.categoryCode))
    );
    onChangeForm?.({ classCode: value ?? "", className: row?.description ?? row?.className ?? "" });
  };

  const colorRows = useMemo(() => colors.map((row) => ({
    colorCode: row.code ?? row.colorCode ?? "",
    colorDescription: row.description ?? row.colorDescription ?? "",
    ltoColor: row.ltoColor ?? row.LTO_COLOR ?? row.lto_color ?? "",
  })), [colors]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-3">
        <Card className="p-4">
          <SectionHeader title="VEHICLE INFORMATION" icon={faCar} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="Item / Vehicle No"
              required
              type="text"
              value={form.itemCode || ""}
              onChange={(v) => onChangeForm?.({ itemCode: v ?? "" })}
              onBlur={() => onBlurItemCode?.(form.itemCode)}
              disabled={disabled || !form.__isNew}
            />
            <FieldRenderer
              label="Vehicle Description"
              required
              type="text"
              value={form.itemDesc || ""}
              onChange={(v) => onChangeForm?.({ itemDesc: v ?? "" })}
              disabled={disabled}
            />

            <FieldRenderer
              label="UOM"
              required
              type="text"
              value={form.uom || "UNIT"}
              onChange={(v) => onChangeForm?.({ uom: v ?? "" })}
              disabled={disabled}
            />
            <FieldRenderer
              label="Active"
              type="select"
              options={activeOptions}
              value={form.active || "Y"}
              onChange={(v) => onChangeForm?.({ active: v ?? "Y" })}
              disabled={disabled}
            />

            <FieldRenderer
              label="Category"
              required
              type="select"
              options={categoryOptions}
              value={form.categoryCode || ""}
              onChange={setCategory}
              disabled={disabled || loadingRefs}
            />
            <FieldRenderer
              label="Category Name"
              type="text"
              value={form.categoryName || selectedCategory?.description || ""}
              readOnly
              disabled
            />

            <FieldRenderer
              label="Classification"
              required
              type="select"
              options={classOptions}
              value={form.classCode || ""}
              onChange={setClass}
              disabled={disabled || loadingRefs || !form.categoryCode}
            />
            <FieldRenderer
              label="Classification Name"
              type="text"
              value={form.className || selectedClass?.description || ""}
              readOnly
              disabled
            />

            <FieldRenderer
              label="Payee / Vendor"
              type="lookup"
              value={form.payeeCode ? `${form.payeeCode}${form.payeeName ? ` - ${form.payeeName}` : ""}` : ""}
              onLookup={() => setIsVendOpen(true)}
              onChange={(v) => {
                onChangeForm?.({ payeeCode: v ?? "", ...(v ? {} : { payeeName: "" }) });
              }}
              disabled={disabled}
            />
            <FieldRenderer
              label="Payee / Vendor Name"
              type="text"
              value={form.payeeName || ""}
              readOnly
              disabled
            />
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader title="IMAGE AND PRICING" icon={faCamera} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldRenderer
              label="Standard PO Price"
              type="number"
              value={form.stdPoPrice ?? "0.00"}
              onChange={(v) => onChangeForm?.({ stdPoPrice: v ?? "0" })}
              disabled={disabled}
            />
            <FieldRenderer
              label="Selling Price"
              type="number"
              value={form.sellingPrice ?? "0.00"}
              onChange={(v) => onChangeForm?.({ sellingPrice: v ?? "0" })}
              disabled={disabled}
            />
            <FieldRenderer label="Qty On Hand" type="number" value={form.qtyOnHand ?? "0"} readOnly disabled />
            <FieldRenderer label="Stock Valuation" type="number" value={form.stockValuation ?? "0.00"} readOnly disabled />
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-[11px] font-bold text-slate-700">Vehicle Image</div>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <div className="h-36 w-full sm:w-52 overflow-hidden rounded-md border border-slate-200 bg-white flex items-center justify-center">
                {imageSrc ? (
                  <img src={imageSrc} alt="Vehicle" className="h-full w-full object-contain" />
                ) : (
                  <div className="text-xs text-slate-400">No image</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click?.()}
                  disabled={disabled}
                  className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Select Image
                </button>
                <button
                  type="button"
                  onClick={() => onChangeForm?.({ vehicleImageBase64: "", removeVehicleImage: true })}
                  disabled={disabled || !imageSrc}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Remove Image
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] gap-3">
        <Card className="p-4">
          <SectionHeader title="REQUIRED VEHICLE DETAILS" icon={faClipboardCheck} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldRenderer label="Require Model" type="select" options={yesNoOptions} value={form.requireModel || "Y"} onChange={(v) => onChangeForm?.({ requireModel: v })} disabled={disabled} />
            <FieldRenderer label="Require Serial No." type="select" options={yesNoOptions} value={form.requireSerial || "Y"} onChange={(v) => onChangeForm?.({ requireSerial: v })} disabled={disabled} />
            <FieldRenderer label="Require Engine No." type="select" options={yesNoOptions} value={form.requireEngine || "Y"} onChange={(v) => onChangeForm?.({ requireEngine: v })} disabled={disabled} />
            <FieldRenderer label="Require Color" type="select" options={yesNoOptions} value={form.requireColor || "Y"} onChange={(v) => onChangeForm?.({ requireColor: v })} disabled={disabled} />
            <FieldRenderer label="Require QS Code" type="select" options={yesNoOptions} value={form.requireQsCode || "Y"} onChange={(v) => onChangeForm?.({ requireQsCode: v })} disabled={disabled} />
            <FieldRenderer label="Require Product No." type="select" options={yesNoOptions} value={form.requireProdNo || "Y"} onChange={(v) => onChangeForm?.({ requireProdNo: v })} disabled={disabled} />
            <div className="sm:col-span-2">
              <FieldRenderer label="Default QS Code" type="text" value={form.defaultQsCode || ""} onChange={(v) => onChangeForm?.({ defaultQsCode: v ?? "" })} disabled={disabled} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader title="AVAILABLE COLOR MATRIX" icon={faBoxesStacked} />
          <VEMast_ColorMatrix
            rows={colorRows}
            selectedCodes={form.colorCodes || []}
            disabled={disabled}
            onChange={(colorCodes) => onChangeForm?.({ colorCodes })}
          />
        </Card>
      </div>

      <RegistrationInfo
        layout="straight"
        disabled
        data={{
          registeredBy: form.registeredBy || "",
          registeredDate: form.registeredDate || "",
          lastUpdatedBy: form.updatedBy || form.lastUpdatedBy || "",
          lastUpdatedDate: form.updatedDate || form.lastUpdatedDate || "",
        }}
      />
      <SearchVendMast
        isOpen={isVendOpen}
        onClose={(selected) => {
          setIsVendOpen(false);
          if (!selected) return;
          onChangeForm?.({
            payeeCode: selected.vendCode || selected.vend_code || selected.code || "",
            payeeName: selected.vendName || selected.vend_name || selected.description || "",
          });
        }}
      />

    </div>
  );
};

export default VEMast_SetupTab;
