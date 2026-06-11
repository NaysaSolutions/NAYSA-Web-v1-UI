// src/NAYSA Cloud/Master Data/FAMasterData/FAMast_SetupTab.jsx
import React, { useEffect, useRef, useState } from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { useFieldLenghtCheck, useGetFieldLength } from "@/NAYSA Cloud/Global/procedure";
import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
import SearchFACateg from "@/NAYSA Cloud/Lookup/SearchFACateg.jsx";
import SearchFAClass from "@/NAYSA Cloud/Lookup/SearchFAClass.jsx";
import SearchFALoc from "@/NAYSA Cloud/Lookup/SearchFALoc.jsx";
import SearchBranch from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchVendMast from "@/NAYSA Cloud/Lookup/SearchVendMast.jsx";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
// import SearchEmployee from "@/NAYSA Cloud/Lookup/SearchEmployee.jsx";
import SearchCurrMast from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";

// ─────────────────────────────────────────────────────────────────────────────
//  Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getValue = (input) => {
  if (input && typeof input === "object") {
    if ("target" in input) return input.target?.value ?? "";
    if ("value" in input) return input.value ?? "";
  }
  return input ?? "";
};

const fallbackFaStatusOptions = [
  { value: "A", label: "Active" },
  { value: "M", label: "Merged" },
  { value: "S", label: "Split" },
  { value: "D", label: "Disposed" },
  { value: "H", label: "Hold" },
];

const normalizeDropdownOptions = (rows = []) => {
  const list = Array.isArray(rows)
    ? rows
    : Array.isArray(rows?.data)
      ? rows.data
      : Array.isArray(rows?.result)
        ? rows.result
        : [];

  return list
    .map((row) => {
      const value =
        row.dropdownCode ??
        row.dropdown_code ??
        row.DROPDOWN_CODE ??
        row.code ??
        row.value ??
        "";

      const label =
        row.dropdownName ??
        row.dropdown_name ??
        row.DROPDOWN_NAME ??
        row.description ??
        row.label ??
        value;

      return { value: String(value || "").trim(), label: String(label || "").trim() };
    })
    .filter((row) => row.value);
};

// ─────────────────────────────────────────────────────────────────────────────
//  Sidebar tab definitions
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  {
    id: "acquisition",
    label: "Acquisition",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="12" height="12" rx="1.5" />
        <path d="M5 5h6M5 8h4M5 11h3" />
      </svg>
    ),
  },
  {
    id: "depreciation",
    label: "Depreciation",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12 L6 8 L9 10 L14 4" />
        <path d="M11 4h3v3" />
      </svg>
    ),
  },
  {
    id: "warranty",
    label: "Warranty",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2L3 4.5v4C3 11.5 5.5 14 8 14s5-2.5 5-5.5v-4L8 2z" />
        <path d="M6 8l1.5 1.5L10 6" />
      </svg>
    ),
  },
  {
    id: "lock",
    label: "Lock Info",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5 7V5a3 3 0 0 1 6 0v2" />
      </svg>
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
const FAMast_SetupTab = ({
  isLoading,
  isEditing,
  form = {},
  generationMode,
  onChangeForm,
  onLookupSelect,
  onBlurFaCode,
}) => {
  const isReadOnly  = !isEditing;
  const isNewRecord = form.__isNew;
  const isDisabled  = isReadOnly || isLoading;

  const [isCategOpen,      setIsCategOpen]      = useState(false);
  const [isClassOpen,      setIsClassOpen]      = useState(false);
  const [isFlocOpen,       setIsFlocOpen]       = useState(false);
  const [isBranchOpen,     setIsBranchOpen]     = useState(false);
  const [isVendOpen,       setIsVendOpen]       = useState(false);
  const [isRcOpen,         setIsRcOpen]         = useState(false);
  const [isEmpOpen,        setIsEmpOpen]        = useState(false);
  const [isCurrOpen,       setIsCurrOpen]       = useState(false);
  const [isItemLookupOpen, setIsItemLookupOpen] = useState(false);
  const [activeTab,        setActiveTab]        = useState("acquisition");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tblFieldArray,    setTblFieldArray]    = useState([]);
  const [faStatusOptions, setFaStatusOptions] = useState(fallbackFaStatusOptions);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await useFieldLenghtCheck("fa_mast");
        if (result) setTblFieldArray(result);
      } catch (e) {
        console.error("Failed to load field lengths:", e);
      }
    };
    run();
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const result = await useTopDocDropDown("FA", "FA_STATUS");
        const options = normalizeDropdownOptions(result);

        if (mounted && options.length > 0) {
          setFaStatusOptions(options);
        }
      } catch (e) {
        console.error("Failed to load FA status dropdown:", e);
        if (mounted) setFaStatusOptions(fallbackFaStatusOptions);
      }
    };

    run();
    return () => { mounted = false; };
  }, []);

  const getLen = (col, fallback = undefined) =>
    useGetFieldLength(tblFieldArray, col) || fallback;

  // ── FA Code: typed when new, lookup when existing ────────────────────────
  // canType: only allow manual entry when generationMode is NOT "Auto" AND it's a new record
  const canType    = isNewRecord && generationMode !== "Auto";
  const overrideRef = useRef(null);

  useEffect(() => {
    const attach = () => {
      if (!overrideRef.current) return;
      const input = overrideRef.current.querySelector("input");
      if (!input) return;
      if (canType) {
        const maxLen = getLen("fa_code", 30);
        input.removeAttribute("readonly");
        input.setAttribute("maxlength", maxLen);
        input.onclick = (e) => e.stopPropagation();
        input.oninput = (e) => {
          let val = e.target.value;
          if (val.length > maxLen) val = val.substring(0, maxLen);
          onChangeForm({ faCode: String(val).toUpperCase() });
        };
        input.onblur = (e) => {
          const val = String(e.target.value || "").trim();
          if (val) onBlurFaCode?.(val);
        };
      } else {
        input.setAttribute("readonly", "true");
        input.removeAttribute("maxlength");
        input.onclick = null;
        input.oninput = null;
        input.onblur  = null;
      }
    };
    attach();
    const t = setTimeout(attach, 50);
    return () => clearTimeout(t);
  }, [canType, isNewRecord, onChangeForm, onBlurFaCode, tblFieldArray]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-6 rounded-lg relative">

        {/* ══════════════════════════════════════════════════════════════════
            TOP CARD: Basic Information
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="border border-blue-500/30 p-6 rounded-lg">
          <SectionHeader title="BASIC INFORMATION" />

          {/* FA Code — system-generated when Auto mode, lookup trigger when existing */}
          <div
            ref={overrideRef}
            className={`w-full ${!canType
              ? "[&>div]:!bg-[#F1F5F9] [&_input]:!bg-transparent [&_input]:!pointer-events-none [&_input]:!text-slate-600 [&_button]:!text-slate-400 [&_label]:!bg-[#F1F5F9]"
              : ""
            }`}
          >
            <FieldRenderer
              label="Asset Code"
              required
              editableLookup
              type="lookup"
              value={form.faCode || ""}
              
              onChange={(v) => onChangeForm({ faCode: String(getValue(v)).toUpperCase() })}
              onLookup={canType ? undefined : (isNewRecord ? undefined : () => !isLoading && setIsItemLookupOpen(true))}
              readOnly={true}
              disabled={isLoading}
              maxLength={getLen("fa_code", 30)}
            />
          </div>

          {/* Asset Name */}
          <FieldRenderer
            label="Asset Name"
            required
            type="text"
            value={form.faName || ""}
            onChange={(v) => onChangeForm({ faName: getValue(v) })}
            readOnly={isReadOnly}
            disabled={isDisabled}
            maxLength={getLen("fa_name", 200)}
          />

          {/* Category */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <FieldRenderer
              label="Category"
              required
              type="lookup"
              value={form.categCode || ""}
              onChange={(v) => onChangeForm({ categCode: getValue(v), categName: "" })}
              onLookup={() => !isDisabled && setIsCategOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
            <div className="col-span-2">
              <FieldRenderer type="text" value={form.categName || ""} readOnly disabled />
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
              <FieldRenderer type="text" value={form.className || ""} readOnly disabled />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <FieldRenderer
              label="Location"
              type="lookup"
              value={form.flocCode || ""}
              onChange={(v) => onChangeForm({ flocCode: getValue(v), flocName: "" })}
              onLookup={() => !isDisabled && setIsFlocOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
            <div className="col-span-2">
              <FieldRenderer type="text" value={form.flocName || ""} readOnly disabled />
            </div>
          </div>

          {/* Branch */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <FieldRenderer
              label="Branch"
              required
              type="lookup"
              value={form.branchCode || ""}
              onChange={(v) => onChangeForm({ branchCode: getValue(v), branchName: "" })}
              onLookup={() => !isDisabled && setIsBranchOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
            <div className="col-span-2">
              <FieldRenderer type="text" value={form.branchName || ""} readOnly disabled />
            </div>
          </div>

          {/* Identifiers row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            <FieldRenderer
              label="Serial No"
              type="text"
              value={form.serialNo || ""}
              onChange={(v) => onChangeForm({ serialNo: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen("serial_no", 100)}
            />
            <FieldRenderer
              label="Model No"
              type="text"
              value={form.modelNo || ""}
              onChange={(v) => onChangeForm({ modelNo: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen("model_no", 100)}
            />
            <FieldRenderer
              label="Bar Code"
              type="text"
              value={form.barCode || ""}
              onChange={(v) => onChangeForm({ barCode: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen("bar_code", 100)}
            />
            <FieldRenderer
              label="Property Tag"
              required
              type="text"
              value={form.tagNo || ""}
              
              onChange={(v) => onChangeForm({ tagNo: getValue(v) })}
              readOnly={isReadOnly || isNewRecord}
              disabled={isDisabled || isNewRecord}
              maxLength={getLen("tag_no", 100)}
            />
            <FieldRenderer
              label="Old Property Tag"
              type="text"
              value={form.oldCode || ""}
              onChange={(v) => onChangeForm({ oldCode: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen("old_code", 100)}
            />
            <FieldRenderer
              label="RR No"
              type="text"
              value={form.rrNo || ""}
              onChange={(v) => onChangeForm({ rrNo: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen("rr_no", 50)}
            />
          </div>

          {/* Responsibility Center */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <FieldRenderer
              label="Assigned RC"
              type="lookup"
              value={form.rcCode || ""}
              onChange={(v) => onChangeForm({ rcCode: getValue(v), rcName: "" })}
              onLookup={() => !isDisabled && setIsRcOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
            <div className="col-span-2">
              <FieldRenderer type="text" value={form.rcName || ""} readOnly disabled />
            </div>
          </div>

          {/* Employee */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <FieldRenderer
              label="Employee No"
              type="lookup"
              value={form.empNo || ""}
              onChange={(v) => onChangeForm({ empNo: getValue(v), empName: "" })}
              onLookup={() => !isDisabled && setIsEmpOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
            <div className="col-span-2">
              <FieldRenderer type="text" value={form.empName || ""} readOnly disabled />
            </div>
          </div>

          {/* Vendor */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <FieldRenderer
              label="Vendor Code"
              type="lookup"
              value={form.vendCode || ""}
              onChange={(v) => onChangeForm({ vendCode: getValue(v), vendName: "" })}
              onLookup={() => !isDisabled && setIsVendOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
            <div className="col-span-2">
              <FieldRenderer type="text" value={form.vendName || ""} readOnly disabled />
            </div>
          </div>

          {/* FA Specs */}
          <FieldRenderer
            label="FA Specs"
            type="text"
            value={form.faSpecs || ""}
            onChange={(v) => onChangeForm({ faSpecs: getValue(v) })}
            readOnly={isReadOnly}
            disabled={isDisabled}
            maxLength={getLen("fa_specs", 500)}
          />

          {/* Ref No 1 & 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            <FieldRenderer
              label="Ref No 1"
              type="text"
              value={form.refNo1 || ""}
              onChange={(v) => onChangeForm({ refNo1: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen("ref_no1", 50)}
            />
            <FieldRenderer
              label="Ref No 2"
              type="text"
              value={form.refNo2 || ""}
              onChange={(v) => onChangeForm({ refNo2: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen("ref_no2", 50)}
            />
          </div>

          {/* FA Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            <FieldRenderer
              label="Asset Status"
              type="select"
              options={faStatusOptions}
              value={form.faStatus || "A"}
              onChange={(v) => onChangeForm({ faStatus: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
            <FieldRenderer
              label="Tran Mode"
              type="select"
              options={[
                { value: "S", label: "Single"   },
                { value: "G", label: "Group"    },
              ]}
              value={form.tranMode || "S"}
              onChange={(v) => onChangeForm({ tranMode: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
          </div>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            MIDDLE CARD: Collapsible Sidebar Tabs
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="border border-blue-500/30 rounded-lg overflow-hidden !focus-within:ring-0 !focus-within:shadow-none !focus-within:-translate-y-0">
          <div className="flex flex-col md:flex-row">

            {/* ── Sidebar ── */}
            <div
              className={`flex md:flex-col border-b md:border-b-0 md:border-r border-blue-500/30 bg-slate-50 transition-all duration-200 ${sidebarCollapsed ? "md:w-12 md:min-w-[48px]" : "md:w-48 md:min-w-[192px]"}`}
            >
              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="hidden md:flex items-center justify-end px-3 py-3 border-b border-blue-500/30 hover:bg-white transition-colors"
              >
                <svg
                  width="18" height="18" viewBox="0 0 16 16" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  className={`text-slate-400 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`}
                >
                  <path d="M10 3L5 8L10 13" />
                </svg>
              </button>

              <div className="flex flex-row md:flex-col gap-2 md:gap-1 p-2 flex-1 overflow-x-auto">
                {TABS.map((tab) => (
                  <div key={tab.id} className="relative group flex-shrink-0 md:flex-shrink">
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 w-full text-left rounded transition-colors duration-150 overflow-hidden whitespace-nowrap
                        ${sidebarCollapsed ? "md:justify-center md:px-0 md:py-2 px-4 py-2" : "px-4 py-2 md:px-3 md:py-2.5"}
                        ${activeTab === tab.id
                          ? "bg-blue-50 text-blue-700 md:border-b-0 border-b-2 md:border-l-2 border-blue-600 rounded-none"
                          : "text-slate-500 hover:bg-white hover:text-slate-700"
                        }`}
                    >
                      <span className="flex-shrink-0">{tab.icon}</span>
                      <span className={`text-[12px] font-medium truncate ${sidebarCollapsed ? "md:hidden" : "block"}`}>
                        {tab.label}
                      </span>
                    </button>
                    {sidebarCollapsed && (
                      <div className="absolute left-12 top-1/2 -translate-y-1/2 z-10 hidden md:group-hover:block bg-white border border-slate-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-700 whitespace-nowrap shadow-sm pointer-events-none">
                        {tab.label}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Content Area ── */}
            <div className="flex-1 p-5 md:p-6 space-y-4 min-w-0">

              {/* ══ Acquisition ══ */}
              {activeTab === "acquisition" && (
                <>
                  <SectionHeader title="ACQUISITION DETAILS" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* Acquisition Date */}
                    <FieldRenderer
                      label="Acquisition Date"
                      type="date"
                      value={form.acqDate || ""}
                      onChange={(v) => onChangeForm({ acqDate: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />

                    {/* Currency */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <FieldRenderer
                          label="Currency"
                          type="lookup"
                          value={form.currCode || "PHP"}
                          onChange={(v) => onChangeForm({ currCode: getValue(v) })}
                          onLookup={() => !isDisabled && setIsCurrOpen(true)}
                          readOnly={isReadOnly}
                          disabled={isDisabled}
                        />
                      </div>
                      <div className="flex-1">
                        <FieldRenderer
                          label="Rate"
                          type="number"
                          value={form.currRate || "1.000000"}
                          onChange={(v) => onChangeForm({ currRate: getValue(v) })}
                          readOnly={isReadOnly}
                          disabled={isDisabled}
                        />
                      </div>
                    </div>

                    {/* EUL / RUL */}
                    <FieldRenderer
                      label="Est. Useful Life (yrs)"
                      type="number"
                      value={form.eul || ""}
                      onChange={(v) => onChangeForm({ eul: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                    <FieldRenderer
                      label="Remaining Useful Life (yrs)"
                      type="number"
                      value={form.rul || ""}
                      onChange={(v) => onChangeForm({ rul: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />

                    {/* Acquisition Cost */}
                    <FieldRenderer
                      label="Acquisition Cost"
                      type="number"
                      value={form.acqCost || ""}
                      onChange={(v) => onChangeForm({ acqCost: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                    <FieldRenderer
                      label="Acquisition Cost (FX1)"
                      type="number"
                      value={form.acqCostFx1 || ""}
                      onChange={(v) => onChangeForm({ acqCostFx1: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                    <FieldRenderer
                      label="Acquisition Cost (FX2)"
                      type="number"
                      value={form.acqCostFx2 || ""}
                      onChange={(v) => onChangeForm({ acqCostFx2: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />

                    {/* Salvage Value */}
                    <FieldRenderer
                      label="Salvage Value"
                      type="number"
                      value={form.salvageValue || ""}
                      onChange={(v) => onChangeForm({ salvageValue: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                  </div>

                  <SectionHeader title="CUTOFF CODES" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FieldRenderer
                      label="Cutoff Code"
                      type="text"
                      value={form.cutoffCode || ""}
                      onChange={(v) => onChangeForm({ cutoffCode: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                      maxLength={getLen("cutoff_code", 6)}
                    />
                    <FieldRenderer
                      label="G-Cutoff Code"
                      type="text"
                      value={form.gcutoffCode || ""}
                      onChange={(v) => onChangeForm({ gcutoffCode: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                      maxLength={getLen("gcutoff_code", 6)}
                    />
                    <FieldRenderer
                      label="D-Cutoff Code"
                      type="text"
                      value={form.dcutoffCode || ""}
                      readOnly
                      disabled
                    />
                  </div>
                </>
              )}

              {/* ══ Depreciation ══ */}
              {activeTab === "depreciation" && (
                <>
                  <SectionHeader title="ACCUMULATED DEPRECIATION" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FieldRenderer label="Accum Depr"      type="number" value={form.accumDepr    || ""} readOnly disabled />
                    <FieldRenderer label="Accum Depr (FX1)"type="number" value={form.accumDeprFx1 || ""} readOnly disabled />
                    <FieldRenderer label="Accum Depr (FX2)"type="number" value={form.accumDeprFx2 || ""} readOnly disabled />
                  </div>

                  <SectionHeader title="MONTHLY DEPRECIATION" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FieldRenderer label="Depr / Month"       type="number" value={form.deprMonth    || ""} readOnly disabled />
                    <FieldRenderer label="Depr / Month (FX1)" type="number" value={form.deprMonthFx1 || ""} readOnly disabled />
                    <FieldRenderer label="Depr / Month (FX2)" type="number" value={form.deprMonthFx2 || ""} readOnly disabled />
                  </div>

                  <SectionHeader title="NET BOOK VALUE" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FieldRenderer label="Net Book Value"       type="number" value={form.nbValue    || ""} readOnly disabled />
                    <FieldRenderer label="Net Book Value (FX1)" type="number" value={form.nbValueFx1 || ""} readOnly disabled />
                    <FieldRenderer label="Net Book Value (FX2)" type="number" value={form.nbValueFx2 || ""} readOnly disabled />
                  </div>
                </>
              )}

              {/* ══ Warranty ══ */}
              {activeTab === "warranty" && (
                <>
                  <SectionHeader title="WARRANTY INFORMATION" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldRenderer
                      label="Warranty Start Date"
                      type="date"
                      value={form.warrantyStartDate || ""}
                      onChange={(v) => onChangeForm({ warrantyStartDate: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                    <FieldRenderer
                      label="Warranty Expiry Date"
                      type="date"
                      value={form.warrantyExpiryDate || ""}
                      onChange={(v) => onChangeForm({ warrantyExpiryDate: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                    <FieldRenderer
                      label="Warranty Months"
                      type="number"
                      value={form.warrantyMonths || ""}
                      onChange={(v) => onChangeForm({ warrantyMonths: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                  </div>
                  <FieldRenderer
                    label="Warranty Notes"
                    type="text"
                    value={form.warrantyNotes || ""}
                    onChange={(v) => onChangeForm({ warrantyNotes: getValue(v) })}
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                    maxLength={getLen("warranty_notes", 500)}
                  />
                </>
              )}

              {/* ══ Lock Info ══ */}
              {activeTab === "lock" && (
                <>
                  <SectionHeader title="LOCK INFORMATION" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldRenderer label="Locked Tran Code" type="text" value={form.lockedTranCode || ""} readOnly disabled />
                    <FieldRenderer label="Locked Tran No"   type="text" value={form.lockedTranNo   || ""} readOnly disabled />
                    <FieldRenderer label="Locked Tran Date" type="text" value={form.lockedTranDate || ""} readOnly disabled />
                    <FieldRenderer label="Locked By"        type="text" value={form.lockedBy       || ""} readOnly disabled />
                    <FieldRenderer label="Locked Date"      type="text" value={form.lockedDate     || ""} readOnly disabled />
                  </div>
                </>
              )}

            </div>
          </div>
        </Card>

        {/* ── Registration Info ── */}
        <RegistrationInfo
          layout="straight"
          disabled
          data={{
            registeredBy:    form.registeredBy    || "",
            registeredDate:  form.registeredDate  || "",
            lastUpdatedBy:   form.lastUpdatedBy   || "",
            lastUpdatedDate: form.lastUpdatedDate || "",
          }}
        />

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LOOKUP MODALS
      ══════════════════════════════════════════════════════════════════════ */}
      <SearchFACateg
        isOpen={isCategOpen}
        onClose={(selected) => {
          setIsCategOpen(false);
          if (selected) onChangeForm({ categCode: selected.code, categName: selected.description });
        }}
      />
      <SearchFAClass
        isOpen={isClassOpen}
        onClose={(selected) => {
          setIsClassOpen(false);
          if (selected) onChangeForm({ classCode: selected.code, className: selected.description });
        }}
      />
      <SearchFALoc
        isOpen={isFlocOpen}
        onClose={(selected) => {
          setIsFlocOpen(false);
          if (selected) onChangeForm({ flocCode: selected.code, flocName: selected.description });
        }}
      />
      <SearchBranch
        isOpen={isBranchOpen}
        onClose={(selected) => {
          setIsBranchOpen(false);
          if (selected) onChangeForm({ branchCode: selected.branchCode, branchName: selected.branchName });
        }}
      />
      <SearchVendMast
        isOpen={isVendOpen}
        onClose={(selected) => {
          setIsVendOpen(false);
          if (selected) onChangeForm({ vendCode: selected.vendCode, vendName: selected.vendName });
        }}
      />
      <SearchRCMast
        isOpen={isRcOpen}
        customParam="ActiveAll"
        onClose={(selected) => {
          setIsRcOpen(false);
          if (selected) onChangeForm({ rcCode: selected.rcCode, rcName: selected.rcName });
        }}
      />
      {/* <SearchEmployee
        isOpen={isEmpOpen}
        onClose={(selected) => {
          setIsEmpOpen(false);
          if (selected) onChangeForm({ empNo: selected.empNo, empName: selected.empName });
        }}
      /> */}
      <SearchCurrMast
        isOpen={isCurrOpen}
        onClose={(selected) => {
          setIsCurrOpen(false);
          if (selected) onChangeForm({ currCode: selected.currCode });
        }}
      />
      <ItemMastLookupModal
        isOpen={isItemLookupOpen}
        endpoint="/lookupFAMast"
        docType="FA"
        enableMultiSelect={false}
        onClose={(payload) => {
          setIsItemLookupOpen(false);
          const selected = payload?.records?.[0];
          if (selected) onLookupSelect(selected.faCode);
        }}
      />
    </>
  );
};

export default FAMast_SetupTab;