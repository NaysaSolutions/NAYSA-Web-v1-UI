import React, { forwardRef, useState, useMemo, useEffect, useRef } from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import { useQuery } from "@tanstack/react-query";

import SearchCusMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchATCRef from "@/NAYSA Cloud/Lookup/SearchATCRef.jsx";
import SearchVATRef from "@/NAYSA Cloud/Lookup/SearchVATRef.jsx";
import SearchBillTermRef from "@/NAYSA Cloud/Lookup/SearchBillTermRef.jsx";
import SearchCurrRef from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";
import CustTypeLookupModal from "@/NAYSA Cloud/Lookup/SearchCustType.jsx";
import AreaLookupModal from "@/NAYSA Cloud/Lookup/SearchArea.jsx";
import ZoneLookupModal from "@/NAYSA Cloud/Lookup/SearchZone.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

const SectionHeader = ({ title }) => (
  <div className="mb-4">
    <div className="text-[9px] sm:text-[12px] font-bold text-slate-500 tracking-widest border-b pb-2">
      {title}
    </div>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-white shadow-sm ${className}`}>{children}</div>
);

const normalizeUpper = (v) => String(v ?? "").toUpperCase().trim();

const getValue = (input) => {
  if (input && typeof input === "object") {
    if ("target" in input) return input.target?.value ?? "";
    if ("value" in input) return input.value ?? "";
  }
  return input ?? "";
};

const CustSetupTab = forwardRef(
  (
    {
      isLoading,
      isEditing,
      form = {},
      sltypeOptions = [],
      sourceOptions = [],
      activeOptions = [],
      onChangeForm,
      onSelectCustomerCode,
      taxClassOptions = [],
    },
    ref
  ) => {
    const [salesTab, setSalesTab] = useState("sales");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // --- 1. FIELD LENGTHS ---
    const { data: tblFieldArray = [] } = useQuery({
      queryKey: ["fieldLengths", "cust_mast"],
      queryFn: () => useFieldLenghtCheck("cust_mast"),
    });

    const getLen = (colName, fallback = undefined) => {
      const n = useGetFieldLength(tblFieldArray, colName);
      return n || fallback;
    };

    // --- 2. LOGIC CONSTANTS ---
    const isReadOnly = !isEditing;
    const isDisabled = isReadOnly || isLoading;
    const isNewRecord = form.__isNew;

    const taxClass = useMemo(() => normalizeUpper(form?.taxClass || ""), [form?.taxClass]);
    const isIndividual = taxClass === "WI";
    
    const buildRegisteredName = (fn, mn, ln) => {
      return [fn, mn, ln].map((v) => String(v ?? "").trim()).filter(Boolean).join(" ");
    };

    const nameAutoRef = useRef({ businessTouched: false });

    // --- 3. AUTO-NAMING EFFECT ---
    useEffect(() => {
      if (!isEditing || !isIndividual) return;

      const reg = buildRegisteredName(form.firstName, form.middleName, form.lastName);
      
      if (reg && (form.custName || "") !== reg) {
        const updates = { custName: reg };
        
        // Auto-sync Business Name if not manually touched
        if (!nameAutoRef.current.businessTouched || !form.businessName) {
          updates.businessName = reg;
        }
        
        onChangeForm(updates);
      }
    }, [isEditing, isIndividual, form.firstName, form.middleName, form.lastName]);

    // --- 4. LOOKUP & OPTIONS ---
    const [lookups, setLookups] = useState({ 
      cust: false, branch: false, atc: false, vat: false, billTerm: false, curr: false,
      custType: false, area: false, zone: false,
    });
    const toggleLookup = (key, val) => setLookups(prev => ({ ...prev, [key]: val }));

    const mappedTaxClassOptions = useMemo(() => {
      const base = [{ value: "WC", label: "Corporate" }, { value: "WI", label: "Individual" }];
      const extra = (Array.isArray(taxClassOptions) ? taxClassOptions : [])
        .map(o => {
          const val = normalizeUpper(o?.value ?? o?.code ?? o);
          return (val === "WC" || val === "WI" || !val) ? null : { value: val, label: o?.label || o?.name || val };
        }).filter(Boolean);
      const seen = new Set();
      return [...base, ...extra].filter(x => !seen.has(x.value) && seen.add(x.value));
    }, [taxClassOptions]);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start rounded-lg relative">
        <div className="flex flex-col gap-6">
          <Card className="border border-blue-500/30 p-5 md:p-7 rounded-lg space-y-5 md:space-y-6">
            <SectionHeader title="BASIC INFORMATION" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <FieldRenderer label="SL Type" type="select" value={form?.sltypeCode || ""} options={sltypeOptions} onChange={(v) => onChangeForm({ sltypeCode: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} />
              <FieldRenderer label="Active?" type="select" value={form?.active || "Y"} options={activeOptions} onChange={(v) => onChangeForm({ active: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <FieldRenderer label="Customer Code" required type="lookup" value={form.custCode || ""} onChange={isNewRecord ? (v) => onChangeForm({ custCode: getValue(v) }) : undefined} onLookup={() => toggleLookup("cust", true)} readOnly={!isNewRecord} disabled={isLoading} maxLength={getLen("cust_code", 20)} />
              <FieldRenderer label="Tax Rate Class" required type="select" value={taxClass} options={mappedTaxClassOptions} onChange={(v) => onChangeForm({ taxClass: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} />
            </div>

            <FieldRenderer 
              label="Registered Name" 
              required 
              type="text" 
              value={form?.custName || ""} 
              onChange={(v) => onChangeForm({ custName: getValue(v) })} 
              readOnly={isReadOnly} 
              disabled={isDisabled} 
              maxLength={getLen("cust_name", 150)} 
            />

            <FieldRenderer 
              label="Business Name" 
              required={!isIndividual} 
              type="text" 
              value={form?.businessName || ""} 
              onChange={(v) => { 
                nameAutoRef.current.businessTouched = true; 
                onChangeForm({ businessName: getValue(v) }); 
              }} 
              readOnly={isReadOnly} 
              disabled={isDisabled} 
              maxLength={getLen("business_name", 150)} 
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              <FieldRenderer 
                label="First Name" 
                required={isIndividual} 
                type="text" 
                value={form?.firstName || ""} 
                onChange={(v) => onChangeForm({ firstName: getValue(v) })} 
                readOnly={isReadOnly || !isIndividual} 
                disabled={isDisabled || !isIndividual} 
                maxLength={getLen("first_name", 100)} 
              />
              <FieldRenderer 
                label="Middle Name" 
                type="text" 
                value={form?.middleName || ""} 
                onChange={(v) => onChangeForm({ middleName: getValue(v) })} 
                readOnly={isReadOnly || !isIndividual} 
                disabled={isDisabled || !isIndividual} 
                maxLength={getLen("middle_name", 100)} 
              />
              <FieldRenderer 
                label="Last Name" 
                required={isIndividual} 
                type="text" 
                value={form?.lastName || ""} 
                onChange={(v) => onChangeForm({ lastName: getValue(v) })} 
                readOnly={isReadOnly || !isIndividual} 
                disabled={isDisabled || !isIndividual} 
                maxLength={getLen("last_name", 100)} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <FieldRenderer label="Old Code" type="text" value={form?.oldCode || ""} onChange={(v) => onChangeForm({ oldCode: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("old_code", 50)} />
              <FieldRenderer label="Branch" type="lookup" value={form?.branchCode || ""} onLookup={isDisabled ? undefined : () => toggleLookup("branch", true)} readOnly={isReadOnly} disabled={isDisabled} />
            </div>
          </Card>

          <Card className="border border-blue-500/30 p-5 md:p-7 rounded-lg space-y-5 md:space-y-6">
            <SectionHeader title="CONTACT INFORMATION" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <FieldRenderer label="Contact Person" type="text" value={form?.custContact || ""} onChange={(v) => onChangeForm({ custContact: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("cust_contact", 100)} />
              <FieldRenderer label="Position" type="text" value={form?.custPosition || ""} onChange={(v) => onChangeForm({ custPosition: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("cust_position", 100)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <FieldRenderer label="Telephone No." type="text" value={form?.custTelno || ""} onChange={(v) => onChangeForm({ custTelno: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("cust_telno", 50)} />
              <FieldRenderer label="Mobile No." type="text" value={form?.custMobileno || ""} onChange={(v) => onChangeForm({ custMobileno: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("cust_mobileno", 50)} />
            </div>
            <FieldRenderer label="Email Address" type="text" value={form?.custEmail || ""} onChange={(v) => onChangeForm({ custEmail: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("cust_email", 150)} />
            <FieldRenderer label="Address 1" required type="text" value={form?.custAddr1 || ""} onChange={(v) => onChangeForm({ custAddr1: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("cust_addr1", 255)} />
            <FieldRenderer label="Address 2" type="text" value={form?.custAddr2 || ""} onChange={(v) => onChangeForm({ custAddr2: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("cust_addr2", 255)} />
            <FieldRenderer label="Address 3" type="text" value={form?.custAddr3 || ""} onChange={(v) => onChangeForm({ custAddr3: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("cust_addr3", 255)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <FieldRenderer label="ZIP Code" type="text" value={form?.custZip || ""} onChange={(v) => onChangeForm({ custZip: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} maxLength={getLen("cust_zip", 20)} />
              <FieldRenderer label="Source" required type="select" value={form?.source || ""} options={sourceOptions} onChange={(v) => onChangeForm({ source: getValue(v) })} readOnly={isReadOnly} disabled={isDisabled} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border border-blue-500/30 rounded-lg overflow-hidden">
            <div className="flex flex-col md:flex-row">

              {/* Collapsible Sidebar (Responsive: Tabs on Mobile) */}
              <div
                className={`flex md:flex-col border-b md:border-b-0 md:border-r border-blue-500/30 bg-slate-50 transition-all duration-200 ${sidebarCollapsed ? "md:w-12 md:min-w-[48px]" : "md:w-48 md:min-w-[192px]"}`}
              >
                {/* Toggle button - Hidden on mobile */}
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

                {/* Tab items (Responsive: Horizontally scrollable on mobile) */}
                <div className="flex flex-row md:flex-col gap-2 md:gap-1 p-2 md:p-2 flex-1 overflow-x-auto">
                  {[
                    {
                      id: "sales", label: "Sales & A/R",
                      icon: (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M5 7h6M5 10h4" />
                        </svg>
                      )
                    },
                    {
                      id: "other1", label: "Other Info 1",
                      icon: (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="8" cy="8" r="5.5" /><path d="M8 5.5v3l1.5 1.5" />
                        </svg>
                      )
                    },
                    {
                      id: "other2", label: "Other Info 2",
                      icon: (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 4h10M3 8h7M3 12h5" />
                        </svg>
                      )
                    },
                  ].map((tab) => (
                    <div key={tab.id} className="relative group flex-shrink-0 md:flex-shrink">
                      <button
                        type="button"
                        onClick={() => setSalesTab(tab.id)}
                        className={`flex items-center gap-3 w-full text-left rounded transition-colors duration-150 overflow-hidden whitespace-nowrap
                          ${sidebarCollapsed ? "md:justify-center md:px-0 md:py-2 px-4 py-2" : "px-4 py-2 md:px-3 md:py-2.5"}
                          ${salesTab === tab.id
                            ? "bg-blue-50 text-blue-700 md:border-b-0 border-b-2 md:border-l-2 border-blue-600 rounded-none"
                            : "text-slate-500 hover:bg-white hover:text-slate-700"
                          }`}
                      >
                        <span className="flex-shrink-0">{tab.icon}</span>
                        <span className={`text-[12px] font-medium truncate ${sidebarCollapsed ? "md:hidden" : "block"}`}>
                          {tab.label}
                        </span>
                      </button>
                      {/* Tooltip when collapsed */}
                      {sidebarCollapsed && (
                        <div className="absolute left-12 top-1/2 -translate-y-1/2 z-10 hidden md:group-hover:block bg-white border border-slate-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-700 whitespace-nowrap shadow-sm pointer-events-none">
                          {tab.label}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 p-5 md:p-7 space-y-5 md:space-y-6 min-w-0">

            {salesTab === "sales" && (
              <>
                <SectionHeader title="SALES INFORMATION" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <FieldRenderer
                    label="Sales Rep."
                    required
                    type="lookup"
                    value={form?.salesRep || ""}
                    onLookup={
                      isDisabled
                        ? undefined
                        : () => toggleLookup("salesRep", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Customer Type"
                    type="lookup"
                    value={form?.customerType || ""}
                    onLookup={
                      isDisabled
                        ? undefined
                        : () => toggleLookup("custType", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Area"
                    type="lookup"
                    value={form?.area || ""}
                    onLookup={
                      isDisabled
                        ? undefined
                        : () => toggleLookup("area", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Zone"
                    type="lookup"
                    value={form?.zone || ""}
                    onLookup={
                      isDisabled
                        ? undefined
                        : () => toggleLookup("zone", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Chain Flag"
                    type="select"
                    value={form?.chainFlag || ""}
                    options={[]}
                    onChange={(v) => onChangeForm({ chainFlag: getValue(v) })}
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Customer Since"
                    type="date"
                    value={form?.custSince || form?.customerSince || ""}
                    onChange={(v) => {
                      const value = getValue(v);
                      onChangeForm({ custSince: value, customerSince: value });
                    }}
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Chain Code"
                    type="lookup"
                    value={form?.chainCode || ""}
                    onLookup={
                      isDisabled ? undefined : () => toggleLookup("chain", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Chain Customer"
                    type="lookup"
                    value={form?.chainCustomer || ""}
                    onLookup={
                      isDisabled
                        ? undefined
                        : () => toggleLookup("chainCust", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <div className="md:col-span-2">
                    <FieldRenderer
                      label="Shipping Lines"
                      type="select"
                      value={form?.shippingLines || ""}
                      options={[]}
                      onChange={(v) =>
                        onChangeForm({ shippingLines: getValue(v) })
                      }
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                  </div>

                  <FieldRenderer
                    label="Source"
                    required
                    type="select"
                    value={form?.source || ""}
                    options={sourceOptions}
                    onChange={(v) => onChangeForm({ source: getValue(v) })}
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Currency"
                    type="lookup"
                    value={form?.currCode || ""}
                    onLookup={
                      isDisabled ? undefined : () => toggleLookup("curr", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Price Group"
                    type="select"
                    value={form?.priceGroup || ""}
                    options={[]}
                    onChange={(v) =>
                      onChangeForm({ priceGroup: getValue(v) })
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Direct SI/DR WH"
                    type="lookup"
                    value={form?.directWarehouse || ""}
                    onLookup={
                      isDisabled
                        ? undefined
                        : () => toggleLookup("warehouse", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />
                </div>

                <SectionHeader title="ACCOUNTING INFORMATION" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <FieldRenderer
                    label="TIN"
                    required
                    type="text"
                    value={form?.custTin || ""}
                    onChange={(v) => onChangeForm({ custTin: getValue(v) })}
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                    maxLength={getLen("cust_tin", 50)}
                  />

                  <FieldRenderer
                    label="ATC Code"
                    type="lookup"
                    value={form?.atcCode || ""}
                    onLookup={
                      isDisabled ? undefined : () => toggleLookup("atc", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <FieldRenderer
                    label="VAT Code"
                    required
                    type="lookup"
                    value={form?.vatCode || ""}
                    onLookup={
                      isDisabled ? undefined : () => toggleLookup("vat", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Billing Terms"
                    required
                    type="lookup"
                    value={form?.billtermCode || ""}
                    onLookup={
                      isDisabled
                        ? undefined
                        : () => toggleLookup("billTerm", true)
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                    maxLength={getLen("billterm_code", 20)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <FieldRenderer
                    label="Business Style"
                    type="select"
                    value={form?.businessStyle || ""}
                    options={[]}
                    onChange={(v) =>
                      onChangeForm({ businessStyle: getValue(v) })
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />
                </div>
              </>
            )}

            {salesTab === "other1" && (
              <>
                <SectionHeader title="C&C INFORMATION" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <FieldRenderer
                    label="Credit Investigator"
                    type="text"
                    value={form?.creditInvestigator || ""}
                    onChange={(v) =>
                      onChangeForm({ creditInvestigator: getValue(v) })
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Credit Limit"
                    type="number"
                    value={form?.creditLimit || "0"}
                    onChange={(v) =>
                      onChangeForm({ creditLimit: getValue(v) })
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Total AR"
                    type="number"
                    value={form?.totalAR || ""}
                    onChange={(v) => onChangeForm({ totalAR: getValue(v) })}
                    readOnly={true}
                    disabled={true}
                  />

                  <FieldRenderer
                    label="Credit Balance"
                    type="number"
                    value={form?.creditBalance || "0"}
                    onChange={(v) =>
                      onChangeForm({ creditBalance: getValue(v) })
                    }
                    readOnly={true}
                    disabled={true}
                  />
                </div>
              </>
            )}

            {salesTab === "other2" && (
              <>
                <SectionHeader title="TAX CERTIFICATE SIGNATORY" />

                <div className="space-y-4 md:space-y-5">
                  <FieldRenderer
                    label="Name"
                    type="text"
                    value={form?.taxSignatoryName || ""}
                    onChange={(v) =>
                      onChangeForm({ taxSignatoryName: getValue(v) })
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="TIN"
                    type="text"
                    value={form?.taxSignatoryTin || ""}
                    onChange={(v) =>
                      onChangeForm({ taxSignatoryTin: getValue(v) })
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Position"
                    type="text"
                    value={form?.taxSignatoryPosition || ""}
                    onChange={(v) =>
                      onChangeForm({ taxSignatoryPosition: getValue(v) })
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="Email Address"
                    type="text"
                    value={form?.taxSignatoryEmail || ""}
                    onChange={(v) =>
                      onChangeForm({ taxSignatoryEmail: getValue(v) })
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />

                  <FieldRenderer
                    label="ZIP Code"
                    type="text"
                    value={form?.taxSignatoryZip || ""}
                    onChange={(v) =>
                      onChangeForm({ taxSignatoryZip: getValue(v) })
                    }
                    readOnly={isReadOnly}
                    disabled={isDisabled}
                  />
                </div>
              </>
            )}
            </div>{/* end content area */}
            </div>{/* end flex row */}
          </Card>

          <div className="mt-2">
            <RegistrationInfo
              layout="twoCols"
              disabled
              data={{
                registeredBy: form?.registeredBy || "",
                registeredDate: form?.registeredDate || "",
                lastUpdatedBy: form?.updatedBy || "",
                lastUpdatedDate: form?.updatedDate || "",
              }}
            />
          </div>
        </div>

        <SearchCusMast
          isOpen={lookups.cust}
          customParam="ActiveAll"
          onClose={async (selected) => {
            toggleLookup("cust", false);
            if (!selected) return;

            const code =
              getValue(selected?.custCode) || getValue(selected?.cust_code);
            const tin =
              getValue(selected?.custTin) ||
              getValue(selected?.cust_tin) ||
              getValue(selected?.tin);

            if (!code) return;

            onChangeForm({
              custCode: code,
              custTin: tin,
              __isNew: false,
            });

            await onSelectCustomerCode?.(code);
          }}
        />

        <SearchBranchRef
          isOpen={lookups.branch}
          onClose={(selected) => {
            toggleLookup("branch", false);
            if (!selected) return;
            onChangeForm({
              branchCode:
                getValue(selected?.branchCode) ||
                getValue(selected?.branch_code),
            });
          }}
        />

        <SearchATCRef
          isOpen={lookups.atc}
          onClose={(selected) => {
            toggleLookup("atc", false);
            if (!selected) return;
            onChangeForm({
              atcCode: getValue(selected?.atcCode) || getValue(selected?.atc_code),
              atcName: getValue(selected?.atcName) || getValue(selected?.atc_name),
            });
          }}
        />

        <SearchVATRef
          isOpen={lookups.vat}
          onClose={(selected) => {
            toggleLookup("vat", false);
            if (!selected) return;
            onChangeForm({
              vatCode: getValue(selected?.vatCode) || getValue(selected?.vat_code),
              vatName: getValue(selected?.vatName) || getValue(selected?.vat_name),
            });
          }}
        />

        <SearchBillTermRef
          isOpen={lookups.billTerm}
          onClose={(selected) => {
            toggleLookup("billTerm", false);
            if (!selected) return;
            onChangeForm({
              billtermCode:
                getValue(selected?.billtermCode) ||
                getValue(selected?.billterm_code) ||
                getValue(selected?.code),
              billtermName:
                getValue(selected?.billtermName) ||
                getValue(selected?.billterm_name) ||
                getValue(selected?.name),
            });
          }}
        />

        <SearchCurrRef
          isOpen={lookups.curr}
          onClose={(selected) => {
            toggleLookup("curr", false);
            if (!selected) return;
            onChangeForm({
              currCode: getValue(selected?.currCode),
              currName: getValue(selected?.currName),
            });
          }}
        />
        <CustTypeLookupModal
          isOpen={lookups.custType}
          onClose={(selected) => {
            toggleLookup("custType", false);
            if (!selected) return;
            onChangeForm({
              customerType: getValue(selected?.custTypeCode),
              customerTypeName: getValue(selected?.custTypeName),
            });
          }}
        />

        <AreaLookupModal
          isOpen={lookups.area}
          onClose={(selected) => {
            toggleLookup("area", false);
            if (!selected) return;
            onChangeForm({
              area: getValue(selected?.areaCode),
              areaName: getValue(selected?.areaName),
            });
          }}
        />

       <ZoneLookupModal
          isOpen={lookups.zone}
          onClose={(selected) => {
            toggleLookup("zone", false);
            if (!selected) return;
            onChangeForm({
              zone: getValue(selected?.zoneCode),
              zoneName: getValue(selected?.zoneName),
            });
          }}
        />
      </div>
    ); 
  } 
); 

CustSetupTab.displayName = "CustSetupTab";
export default CustSetupTab;