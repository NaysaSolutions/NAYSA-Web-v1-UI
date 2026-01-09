// src/NAYSA Cloud/Master Data/CustMastTabs/PayeeSetupTab.jsx
import React, { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";

import SearchCusMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchVendMast from "@/NAYSA Cloud/Lookup/SearchVendMast.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchATCRef from "@/NAYSA Cloud/Lookup/SearchATCRef.jsx";
import SearchVATRef from "@/NAYSA Cloud/Lookup/SearchVATRef.jsx";
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import SearchPayTermRef from "@/NAYSA Cloud/Lookup/SearchPayTermRef.jsx";
import SearchCurrRef from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";


const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">{title}</div>
  </div>
);

/**
 * ✅ Cards must be same size & aligned:
 * - remove self-start / !h-fit
 * - use h-full + flex-col so content stays top-aligned while card stretches equally
 */
const Card = ({ children, className = "" }) => (
  <div className={`global-tran-textbox-group-div-ui flex flex-col ${className}`}>
    {children}
  </div>
);

const PayeeSetupTab = forwardRef(
  (
    {
      isLoading,
      isEditing,
      form,
      sltypeOptions,
      sourceOptions,
      activeOptions,
      onChangeForm,

      // ✅ parent fetch after selecting code (customer or vendor)
      onSelectCustomerCode, // keep name to avoid breaking CustMast/VendMast

      payeeTypeOptions = [],
      apAccountOptions = [],
      paymentTermOptions = [],
      taxClassOptions = [],
      currencyOptions = [],
    },
    ref
  ) => {
    useImperativeHandle(ref, () => ({}));
    const isReadOnly = !isEditing;

    const sl = useMemo(
      () => String(form?.sltypeCode || "").toUpperCase().trim(),
      [form?.sltypeCode]
    );
    const isVendor = useMemo(() => sl !== "CU", [sl]);

    // ✅ map the correct field names based on mode
    const f = useMemo(() => {
      if (isVendor) {
        return {
          code: "vendCode",
          name: "vendName",
          contact: "vendContact",
          position: "vendPosition",
          tel: "vendTelno",
          mobile: "vendMobileno",
          email: "vendEmail",
          addr1: "vendAddr1",
          addr2: "vendAddr2",
          addr3: "vendAddr3",
          zip: "vendZip",
          tin: "vendTin",
        };
      }
      return {
        code: "custCode",
        name: "custName",
        contact: "custContact",
        position: "custPosition",
        tel: "custTelno",
        mobile: "custMobileno",
        email: "custEmail",
        addr1: "custAddr1",
        addr2: "custAddr2",
        addr3: "custAddr3",
        zip: "custZip",
        tin: "custTin",
      };
    }, [isVendor]);

    const isEmployee = useMemo(() => sl === "EM", [sl]);      // adjust code if yours differs
    const isSupplier = useMemo(() => sl === "SU", [sl]);     // or whatever supplier code you use


    const buildRegisteredName = (fn, mn, ln) => {
      return [fn, mn, ln]
        .map(v => v?.trim())
        .filter(Boolean)
        .join(" ");
    };

    const mappedTaxClassOptions = useMemo(() => {
      const base = [
        { value: "WC", label: "Corporate" },
        { value: "WI", label: "Individual" },
      ];

      const extra = (Array.isArray(taxClassOptions) ? taxClassOptions : [])
        .map((o) => {
          const rawValue =
            typeof o === "string"
              ? o
              : (o?.value ?? o?.code ?? o?.taxClass ?? o?.tax_class ?? "");

          const value = String(rawValue || "").toUpperCase().trim();
          if (!value) return null;

          let label =
            typeof o === "string"
              ? value
              : String(o?.label ?? o?.name ?? o?.text ?? value);

          if (value === "WC") label = "Corporate";
          if (value === "WI") label = "Individual";

          return { value, label };
        })
        .filter(Boolean);

      // remove duplicates (keep first occurrence)
      const seen = new Set();
      return [...base, ...extra].filter((x) => {
        const k = x.value;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }, [taxClassOptions]);




    // Lookup modal states
    const [isCustLookupOpen, setIsCustLookupOpen] = useState(false);
    const [isVendLookupOpen, setIsVendLookupOpen] = useState(false);
    const [isBranchLookupOpen, setIsBranchLookupOpen] = useState(false);
    const [isATCLookupOpen, setIsATCLookupOpen] = useState(false);
    const [isVATLookupOpen, setIsVATLookupOpen] = useState(false);
    const [isAPAcctLookupOpen, setIsAPAcctLookupOpen] = useState(false);
    const [isPayTermLookupOpen, setIsPayTermLookupOpen] = useState(false);
    const [isCurrLookupOpen, setIsCurrLookupOpen] = useState(false);


    const openPayeeLookup = () => {
      if (isVendor) setIsVendLookupOpen(true);
      else setIsCustLookupOpen(true);
    };

    const applySelectedCode = async (code) => {
      if (!code) return;
      // update correct field immediately
      onChangeForm({ [f.code]: code });

      // fetch full record in parent (VendMast or CustMast)
      if (typeof onSelectCustomerCode === "function") {
        await onSelectCustomerCode(code);
      }
    };

    return (
      /**
       * ✅ Equal card heights:
       * - items-stretch + auto-rows-fr makes each row same height
       * - each Card uses h-full
       */
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start rounded-lg relative">

        {/* CARD 1: BASIC INFORMATION */}
        <Card className="border border-blue-500/30 p-6 rounded-lg shadow-xl">
          <SectionHeader title="Basic Information" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="SL Type"
              type="select"
              value={form.sltypeCode}
              options={sltypeOptions}
              onChange={(v) => onChangeForm({ sltypeCode: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />

            <FieldRenderer
              label="Active?"
              type="select"
              value={form.active}
              options={activeOptions}
              onChange={(v) => onChangeForm({ active: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label={isVendor ? "Payee Code" : "Customer Code"}
              required
              type="lookup"
              value={form[f.code] || ""}
              onLookup={openPayeeLookup}
              readOnly={isReadOnly}
              disabled={isLoading}
            />


            <FieldRenderer
              label="Tax Rate Class"
              required
              type="select"                        // ✅ force dropdown
              value={String(form.taxClass || "").toUpperCase().trim()}
              options={mappedTaxClassOptions}      // ✅ has WC/WI even if backend is empty
              onChange={(v) => onChangeForm({ taxClass: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />


          </div>

          <FieldRenderer
            label="Registered Name"
            required
            type="text"
            value={form[f.name] || ""}
            onChange={(v) => onChangeForm({ [f.name]: v })}
            readOnly={isReadOnly || isEmployee}
            disabled={isLoading || isEmployee}
          />


          <FieldRenderer
            label="Business Name"
            required
            type="text"
            value={form.businessName || ""}
            onChange={(v) => onChangeForm({ businessName: v })}
            readOnly={isReadOnly}
            disabled={isLoading}
          />

          {"checkName" in (form || {}) && (
            <FieldRenderer
              label="Check Name"
              type="text"
              value={form.checkName || ""}
              onChange={(v) => onChangeForm({ checkName: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldRenderer
              label="First Name"
              type="text"
              value={form.firstName || ""}
              onChange={(v) => {
                const updates = { firstName: v };

                if (isEmployee) {
                  updates[f.name] = buildRegisteredName(
                    v,
                    form.middleName,
                    form.lastName
                  );
                }

                onChangeForm(updates);
              }}
              readOnly={isReadOnly}
              disabled={isLoading || isSupplier}
            />

            <FieldRenderer
              label="Middle Name"
              type="text"
              value={form.middleName || ""}
              onChange={(v) => {
                const updates = { middleName: v };

                if (isEmployee) {
                  updates[f.name] = buildRegisteredName(
                    form.firstName,
                    v,
                    form.lastName
                  );
                }

                onChangeForm(updates);
              }}
              readOnly={isReadOnly}
              disabled={isLoading || isSupplier}
            />

            <FieldRenderer
              label="Last Name"
              type="text"
              value={form.lastName || ""}
              onChange={(v) => {
                const updates = { lastName: v };

                if (isEmployee) {
                  updates[f.name] = buildRegisteredName(
                    form.firstName,
                    form.middleName,
                    v
                  );
                }

                onChangeForm(updates);
              }}
              readOnly={isReadOnly}
              disabled={isLoading || isSupplier}
            />

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldRenderer
              label="Old Code"
              type="text"
              value={form.oldCode || ""}
              onChange={(v) => onChangeForm({ oldCode: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />

            <FieldRenderer
              label="Branch"
              type="lookup"
              value={form.branchCode || ""}
              onLookup={() => setIsBranchLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isLoading}
            />

            <FieldRenderer
              label="Payee Type"
              type={payeeTypeOptions?.length ? "select" : "text"}
              value={form.payeeType || ""}
              options={payeeTypeOptions}
              onChange={(v) => onChangeForm({ payeeType: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />
          </div>
        </Card>

        {/* CARD 2: CONTACT INFORMATION */}
        <Card className="border border-blue-500/30 p-6 rounded-lg shadow-xl">
          <SectionHeader title="Contact Information" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="Contact Person"
              type="text"
              value={form[f.contact] || ""}
              onChange={(v) => onChangeForm({ [f.contact]: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />

            <FieldRenderer
              label="Position"
              type="text"
              value={form[f.position] || ""}
              onChange={(v) => onChangeForm({ [f.position]: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="Telephone No."
              type="text"
              value={form[f.tel] || ""}
              onChange={(v) => onChangeForm({ [f.tel]: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />


            <FieldRenderer
              label={isVendor ? "Mobile No." : "Fax No."}
              type="text"
              value={isVendor ? (form[f.mobile] || "") : (form.custFaxNo || "")}
              onChange={(v) =>
                isVendor
                  ? onChangeForm({ [f.mobile]: v })   // vendMobileno
                  : onChangeForm({ custFaxNo: v })
              }
              readOnly={isReadOnly}
              disabled={isLoading}
            />

          </div>

          <FieldRenderer
            label="Email Address"
            type="text"
            value={form[f.email] || ""}
            onChange={(v) => onChangeForm({ [f.email]: v })}
            readOnly={isReadOnly}
            disabled={isLoading}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="Address 1"
              required
              type="text"
              value={form[f.addr1] || ""}
              onChange={(v) => onChangeForm({ [f.addr1]: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />

            <FieldRenderer
              label="Address 2"
              type="text"
              value={form[f.addr2] || ""}
              onChange={(v) => onChangeForm({ [f.addr2]: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />
          </div>

          <FieldRenderer
            label="Address 3"
            type="text"
            value={form[f.addr3] || ""}
            onChange={(v) => onChangeForm({ [f.addr3]: v })}
            readOnly={isReadOnly}
            disabled={isLoading}
          />


          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="ZIP Code"
              type="text"
              value={form[f.zip] || ""}
              onChange={(v) => onChangeForm({ [f.zip]: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />

            <FieldRenderer
              label="Source"
              required
              type="select"
              value={form.source || ""}
              options={sourceOptions}
              onChange={(v) => onChangeForm({ source: v })}
              readOnly={isReadOnly}
              disabled={isLoading}
            />
          </div>
        </Card>

        <Card className="border border-blue-500/30 p-4 rounded-lg shadow-xl self-start !h-fit !min-h-0">
          <SectionHeader title="Accounting Information" />

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <FieldRenderer
              label="TIN"
              required
              type="text"
              value={
                form.vendTin ||
                form.custTin ||
                form.vend_tin ||
                form.cust_tin ||
                form.tin ||
                ""
              }
              onChange={(v) =>
                onChangeForm({
                  vendTin: v,
                  custTin: v,
                  tin: v,
                })
              }
              readOnly={isReadOnly}
              disabled={isLoading}
            />



            <FieldRenderer
              label="Default ATC"
              type="lookup"
              value={form.atcCode || ""}
              onLookup={() => setIsATCLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isLoading}
            />

            <FieldRenderer
              label="Default VAT"
              type="lookup"
              value={form.vatCode || ""}
              onLookup={() => setIsVATLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isLoading}
            />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <FieldRenderer
              label="Default Payment Terms"
              required
              type="lookup"
              value={form.paytermCode || ""}
              onLookup={() => setIsPayTermLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isLoading}
            />


            <FieldRenderer
              label="Default A/P Account"
              required
              type="lookup"
              value={form.acctCode || ""}
              onLookup={() => setIsAPAcctLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isLoading}
            />



            <FieldRenderer
              label="Default Currency"
              type="lookup"
              value={form.currCode || ""}
              onLookup={() => setIsCurrLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isLoading}
            />

          </div>
        </Card>



        {/* CARD 4: REGISTRATION INFORMATION */}
        <Card className="border border-blue-500/30 p-4 rounded-lg shadow-xl self-start !h-fit !min-h-0">
          <SectionHeader title="Registration Information" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="Registered By"
              type="text"
              value={form.registeredBy || form.registered_by || ""}
              readOnly={true}
              disabled={true}
            />
            <FieldRenderer
              label="Registered Date"
              type="text"
              value={form.registeredDate || form.registered_date || ""}
              readOnly={true}
              disabled={true}
            />
            <FieldRenderer
              label="Updated By"
              type="text"
              value={form.updatedBy || form.updated_by || ""}
              readOnly={true}
              disabled={true}
            />
            <FieldRenderer
              label="Updated Date"
              type="text"
              value={form.updatedDate || form.updated_date || ""}
              readOnly={true}
              disabled={true}
            />
          </div>
        </Card>

        {/* LOOKUP MODALS */}
        <SearchCusMast
          isOpen={isCustLookupOpen}
          customParam="ActiveAll"
          onClose={async (selected) => {
            setIsCustLookupOpen(false);
            if (!selected) return;

            const code = selected?.custCode ?? selected?.cust_code ?? "";
            const tin =
              selected?.custTin ?? selected?.cust_tin ?? selected?.tin ?? "";

            // ✅ set immediately so it shows and won't flicker
            onChangeForm({
              custCode: code,
              custTin: tin,
              vendTin: tin, // optional safety
              tin: tin,     // optional safety
            });

            // ✅ still fetch full record in parent (CustMast)
            if (typeof onSelectCustomerCode === "function") {
              await onSelectCustomerCode(code);
            }
          }}
        />


        <SearchVendMast
          isOpen={isVendLookupOpen}
          customParam="ActiveAll"
          endpoint="/lookupVendMast"
          onClose={async (selected) => {
            setIsVendLookupOpen(false);
            if (!selected) return;

            const code = selected?.vendCode ?? selected?.vend_code ?? "";
            const tin =
              selected?.vendTin ?? selected?.vend_tin ?? selected?.tin ?? "";

            // ✅ set immediately so it shows and won't flicker
            onChangeForm({
              vendCode: code,
              vendTin: tin,
              custTin: tin, // optional safety
              tin: tin,     // optional safety
            });

            // fetch full record
            if (typeof onSelectCustomerCode === "function") {
              await onSelectCustomerCode(code);
            }
          }}
        />



        <SearchBranchRef
          isOpen={isBranchLookupOpen}
          onClose={(selected) => {
            setIsBranchLookupOpen(false);
            if (!selected) return;
            const branchCode = selected?.branchCode ?? selected?.branch_code ?? "";
            if (!branchCode) return;
            onChangeForm({ branchCode });
          }}
        />

        <SearchATCRef
          isOpen={isATCLookupOpen}
          onClose={(selected) => {
            setIsATCLookupOpen(false);
            if (!selected) return;
            const atcCode = selected?.atcCode ?? selected?.atc_code ?? "";
            if (!atcCode) return;
            onChangeForm({ atcCode });
          }}
        />

        <SearchVATRef
          isOpen={isVATLookupOpen}
          onClose={(selected) => {
            setIsVATLookupOpen(false);
            if (!selected) return;
            const vatCode = selected?.vatCode ?? selected?.vat_code ?? "";
            if (!vatCode) return;
            onChangeForm({ vatCode });
          }}
        />

        <SearchPayTermRef
          isOpen={isPayTermLookupOpen}
          onClose={(selected) => {
            setIsPayTermLookupOpen(false);
            if (!selected) return;

            onChangeForm({
              paytermCode: selected.paytermCode,
              paytermName: selected.paytermName,
            });
          }}
        />

        <SearchCOAMast
          isOpen={isAPAcctLookupOpen}
          customParam="APGL"
          source="AP"
          onClose={(selected) => {
            setIsAPAcctLookupOpen(false);
            if (!selected) return;

            onChangeForm({
              apAccount: selected.acctCode,
              acctCode: selected.acctCode,
              apAccountName: selected.acctName,
              reqSL: selected.slReq,
              reqRC: selected.rcReq,
            });
          }}
        />

        <SearchCurrRef
          isOpen={isCurrLookupOpen}
          onClose={(selected) => {
            setIsCurrLookupOpen(false);
            if (!selected) return;

            onChangeForm({
              currCode: selected.currCode,
              currName: selected.currName,
            });
          }}
        />



      </div>
    );
  }
);

PayeeSetupTab.displayName = "PayeeSetupTab";
export default PayeeSetupTab;
