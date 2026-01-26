// src/NAYSA Cloud/Master Data/CustMastTabs/PayeeSetupTab.jsx
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";

import SearchCusMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchVendMast from "@/NAYSA Cloud/Lookup/SearchVendMast.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchATCRef from "@/NAYSA Cloud/Lookup/SearchATCRef.jsx";
import SearchVATRef from "@/NAYSA Cloud/Lookup/SearchVATRef.jsx";
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import SearchPayTermRef from "@/NAYSA Cloud/Lookup/SearchPayTermRef.jsx";
import SearchCurrRef from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";


const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">{title}</div>
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
      onSelectCustomerCode,

      payeeTypeOptions = [],
      apAccountOptions = [],
      paymentTermOptions = [],
      taxClassOptions = [],
      currencyOptions = [],
    },
    ref
  ) => {
    useImperativeHandle(ref, () => ({}));

    // ✅ SINGLE MASTER SWITCH: disable everything until Add/Edit
    const isReadOnly = !isEditing;
    const isDisabled = isReadOnly || isLoading;

    const sl = useMemo(() => normalizeUpper(form?.sltypeCode || ""), [form?.sltypeCode]);
    const isVendor = useMemo(() => sl !== "CU", [sl]);

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

    const isEmployee = useMemo(() => sl === "EM", [sl]);
    const isSupplier = useMemo(() => sl === "SU", [sl]);

    const buildRegisteredName = (fn, mn, ln) => {
      return [fn, mn, ln]
        .map((v) => v?.trim())
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

          const value = normalizeUpper(rawValue || "");
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

      const seen = new Set();
      return [...base, ...extra].filter((x) => {
        const k = x.value;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }, [taxClassOptions]);

    /* ------------------------------------------------------------------
       ✅ FIX: Tax Class default should NOT override user choice.
       - We only auto-set when:
         a) taxClass is empty, OR
         b) taxClass was previously auto-set by this effect
       - If user changes taxClass manually, we stop auto-overriding.
    ------------------------------------------------------------------ */
    const taxAutoRef = useRef({
      lastAutoValue: "", // "WC"/"WI"
      userTouched: false,
      lastSl: "",
    });

    // Mark tax class as "user touched" when user changes it manually
    const handleTaxClassChange = (v) => {
      taxAutoRef.current.userTouched = true;
      onChangeForm({ taxClass: v });
    };

    /* ------------------------------------------------------------------
       ✅ Auto-display rules for Registered Name / Business Name / Check Name
       - Supplier (SU): encode Registered Name, auto-fill Business Name + Check Name (editable)
       - Employee (EM): encode First/Middle/Last, auto-fill Registered Name + Business Name + Check Name
         (Registered & Business are disabled; Check Name stays editable)
    ------------------------------------------------------------------ */
    const nameAutoRef = useRef({
      businessLastAuto: "",
      checkLastAuto: "",
      businessTouched: false,
      checkTouched: false,
      lastSl: "",
    });

    const handleBusinessNameChange = (v) => {
      nameAutoRef.current.businessTouched = true;
      onChangeForm({ businessName: v });
    };

    const handleCheckNameChange = (v) => {
      nameAutoRef.current.checkTouched = true;
      onChangeForm({ checkName: v });
    };

    const applyAutoNames = (updates = {}, baseName = "") => {
      const reg = String(baseName || "").trim();

      const currentBusiness = form?.businessName ?? "";
      const currentCheck = form?.checkName ?? "";

      const businessWasAuto =
        currentBusiness && currentBusiness === nameAutoRef.current.businessLastAuto;
      const checkWasAuto =
        currentCheck && currentCheck === nameAutoRef.current.checkLastAuto;

      const businessEmpty = !String(currentBusiness || "").trim();
      const checkEmpty = !String(currentCheck || "").trim();

      // Auto business name if empty or previously auto-set AND user didn't manually touch it
      if ((businessEmpty || businessWasAuto) && !nameAutoRef.current.businessTouched) {
        updates.businessName = reg;
        nameAutoRef.current.businessLastAuto = reg;
      }

      // Auto check name if empty or previously auto-set AND user didn't manually touch it
      if ((checkEmpty || checkWasAuto) && !nameAutoRef.current.checkTouched) {
        updates.checkName = reg;
        nameAutoRef.current.checkLastAuto = reg;
      }

      return updates;
    };

    useEffect(() => {
      if (!isEditing) return;

      const desired = sl === "SU" ? "WC" : sl === "EM" ? "WI" : "";
      if (!desired) {
        taxAutoRef.current.lastSl = sl;
        return;
      }

      const current = normalizeUpper(form?.taxClass || "");

      const wasAuto = current && current === taxAutoRef.current.lastAutoValue;
      const isEmpty = !current;

      // If SL type changed, we can auto-update only if:
      // - taxClass empty OR taxClass was previously auto-set OR user hasn't touched
      const slChanged = taxAutoRef.current.lastSl !== sl;

      if (slChanged) {
        // if user already picked something manually AND it's not the previous auto value, don't override
        if (taxAutoRef.current.userTouched && !wasAuto && !isEmpty) {
          taxAutoRef.current.lastSl = sl;
          return;
        }
      }

      if (isEmpty || wasAuto) {
        taxAutoRef.current.lastAutoValue = desired;
        taxAutoRef.current.userTouched = false; // reset because we’re applying a default
        onChangeForm({ taxClass: desired });
      }

      taxAutoRef.current.lastSl = sl;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sl, isEditing]);


    useEffect(() => {
      if (!isEditing) return;

      const slChanged = nameAutoRef.current.lastSl !== sl;
      if (slChanged) {
        // reset touch flags on SL change (fresh defaults)
        nameAutoRef.current.businessTouched = false;
        nameAutoRef.current.checkTouched = false;
        nameAutoRef.current.businessLastAuto = "";
        nameAutoRef.current.checkLastAuto = "";
      }
      nameAutoRef.current.lastSl = sl;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sl, isEditing]);


    // Lookup modal states
    const [isCustLookupOpen, setIsCustLookupOpen] = useState(false);
    const [isVendLookupOpen, setIsVendLookupOpen] = useState(false);
    const [isBranchLookupOpen, setIsBranchLookupOpen] = useState(false);
    const [isATCLookupOpen, setIsATCLookupOpen] = useState(false);
    const [isVATLookupOpen, setIsVATLookupOpen] = useState(false);
    const [isAPAcctLookupOpen, setIsAPAcctLookupOpen] = useState(false);
    const [isPayTermLookupOpen, setIsPayTermLookupOpen] = useState(false);
    const [isCurrLookupOpen, setIsCurrLookupOpen] = useState(false);

    useEffect(() => {
      if (!isEditing) return;

      // Employee: First/Middle/Last drives Registered/Business/Check Names
      if (isEmployee) {
        const reg = buildRegisteredName(form.firstName, form.middleName, form.lastName);
        const updates = {};
        if ((form[f.name] || "") !== reg) updates[f.name] = reg;

        applyAutoNames(updates, reg);

        if (Object.keys(updates).length) onChangeForm(updates);
      }

      // Supplier: if Registered Name is present, default Business & Check when blank
      if (isSupplier) {
        const reg = form[f.name] || "";
        if (String(reg || "").trim()) {
          const updates = {};
          applyAutoNames(updates, reg);
          if (Object.keys(updates).length) onChangeForm(updates);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEmployee, isSupplier, isEditing, form.firstName, form.middleName, form.lastName, form[f.name]]);


    const openPayeeLookup = () => {
      if (isLoading) return; // ✅ only block when loading
      if (isVendor) setIsVendLookupOpen(true);
      else setIsCustLookupOpen(true);
    };



    return (
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
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Active?"
              type="select"
              value={form.active}
              options={activeOptions}
              onChange={(v) => onChangeForm({ active: v })}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Payee/Customer Code (kept as you currently designed: lookup + not editable) */}
            {/* Payee/Customer Code (Lookup is clickable even in view mode) */}
            <FieldRenderer
              label={isVendor ? "Payee Code" : "Customer Code"}
              required
              type="lookup"
              value={form[f.code] || ""}
              onLookup={openPayeeLookup}   // ✅ always works
              readOnly={true}              // ✅ can't type
              disabled={isLoading}         // ✅ only disable when loading
            />

            <FieldRenderer
              label="Tax Rate Class"
              required
              type="select"
              value={normalizeUpper(form.taxClass || "")}
              options={mappedTaxClassOptions}
              onChange={handleTaxClassChange}     // ✅ user-touch tracking
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
          </div>

          <FieldRenderer
            label="Registered Name"
            required
            type="text"
            value={form[f.name] || ""}
            onChange={(v) => {
              const updates = { [f.name]: v };

              // Supplier: Registered Name drives Business & Check Name (both still editable)
              if (isSupplier) {
                applyAutoNames(updates, v);
              }

              onChangeForm(updates);
            }}
            readOnly={isReadOnly || isEmployee}
            disabled={isDisabled || isEmployee}
          />

          <FieldRenderer
            label="Business Name"
            required
            type="text"
            value={form.businessName || ""}
            onChange={handleBusinessNameChange}
            readOnly={isReadOnly || isEmployee}
            disabled={isDisabled || isEmployee}
          />

          <FieldRenderer
            label="Check Name"
            type="text"
            value={form.checkName || ""}
            onChange={handleCheckNameChange}
            readOnly={isReadOnly}
            disabled={isDisabled}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldRenderer
              label="First Name"
              type="text"
              value={form.firstName || ""}
              onChange={(v) => {
                const updates = { firstName: v };
                if (isEmployee) {
                  const reg = buildRegisteredName(v, form.middleName, form.lastName);
                  updates[f.name] = reg;
                  applyAutoNames(updates, reg);
                }
                onChangeForm(updates);
              }}
              readOnly={isReadOnly}
              disabled={isDisabled || isSupplier}
            />

            <FieldRenderer
              label="Middle Name"
              type="text"
              value={form.middleName || ""}
              onChange={(v) => {
                const updates = { middleName: v };
                if (isEmployee) {
                  const reg = buildRegisteredName(form.firstName, v, form.lastName);
                  updates[f.name] = reg;
                  applyAutoNames(updates, reg);
                }
                onChangeForm(updates);
              }}
              readOnly={isReadOnly}
              disabled={isDisabled || isSupplier}
            />

            <FieldRenderer
              label="Last Name"
              type="text"
              value={form.lastName || ""}
              onChange={(v) => {
                const updates = { lastName: v };
                if (isEmployee) {
                  const reg = buildRegisteredName(form.firstName, form.middleName, v);
                  updates[f.name] = reg;
                  applyAutoNames(updates, reg);
                }
                onChangeForm(updates);
              }}
              readOnly={isReadOnly}
              disabled={isDisabled || isSupplier}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldRenderer
              label="Old Code"
              type="text"
              value={form.oldCode || ""}
              onChange={(v) => onChangeForm({ oldCode: v })}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Branch"
              type="lookup"
              value={form.branchCode || ""}
              onLookup={isDisabled ? undefined : () => setIsBranchLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Payee Type"
              type={payeeTypeOptions?.length ? "select" : "text"}
              value={form.payeeType || ""}
              options={payeeTypeOptions}
              onChange={(v) => onChangeForm({ payeeType: v })}
              readOnly={isReadOnly}
              disabled={isDisabled}
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
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Position"
              type="text"
              value={form[f.position] || ""}
              onChange={(v) => onChangeForm({ [f.position]: v })}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="Telephone No."
              type="text"
              value={form[f.tel] || ""}
              onChange={(v) => onChangeForm({ [f.tel]: v })}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label={isVendor ? "Mobile No." : "Fax No."}
              type="text"
              value={isVendor ? (form[f.mobile] || "") : (form.custFaxNo || "")}
              onChange={(v) =>
                isVendor ? onChangeForm({ [f.mobile]: v }) : onChangeForm({ custFaxNo: v })
              }
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
          </div>

          <FieldRenderer
            label="Email Address"
            type="text"
            value={form[f.email] || ""}
            onChange={(v) => onChangeForm({ [f.email]: v })}
            readOnly={isReadOnly}
            disabled={isDisabled}
          />

          <FieldRenderer
            label="Address 1"
            required
            type="text"
            value={form[f.addr1] || ""}
            onChange={(v) => onChangeForm({ [f.addr1]: v })}
            readOnly={isReadOnly}
            disabled={isDisabled}
          />

          <FieldRenderer
            label="Address 2"
            type="text"
            value={form[f.addr2] || ""}
            onChange={(v) => onChangeForm({ [f.addr2]: v })}
            readOnly={isReadOnly}
            disabled={isDisabled}
          />

          <FieldRenderer
            label="Address 3"
            type="text"
            value={form[f.addr3] || ""}
            onChange={(v) => onChangeForm({ [f.addr3]: v })}
            readOnly={isReadOnly}
            disabled={isDisabled}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRenderer
              label="ZIP Code"
              type="text"
              value={form[f.zip] || ""}
              onChange={(v) => onChangeForm({ [f.zip]: v })}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Source"
              required
              type="select"
              value={form.source || ""}
              options={sourceOptions}
              onChange={(v) => onChangeForm({ source: v })}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
          </div>
        </Card>

        {/* CARD 3: ACCOUNTING INFORMATION */}
        <Card className="border border-blue-500/30 p-4 rounded-lg shadow-xl self-start !h-fit !min-h-0">
          <SectionHeader title="Accounting Information" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <FieldRenderer
              label="TIN"
              required
              type="text"
              value={form.vendTin || form.custTin || form.vend_tin || form.cust_tin || form.tin || ""}
              onChange={(v) =>
                onChangeForm({
                  vendTin: v,
                  custTin: v,
                  tin: v,
                })
              }
              readOnly={isReadOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Default ATC"
              type="lookup"
              value={form.atcCode || ""}
              onLookup={isDisabled ? undefined : () => setIsATCLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Default VAT"
              type="lookup"
              value={form.vatCode || ""}
              onLookup={isDisabled ? undefined : () => setIsVATLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <FieldRenderer
              label="Default Payment Terms"
              required
              type="lookup"
              value={form.paytermCode || ""}
              onLookup={isDisabled ? undefined : () => setIsPayTermLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Default A/P Account"
              required
              type="lookup"
              value={form.acctCode || ""}
              onLookup={isDisabled ? undefined : () => setIsAPAcctLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Currency"
              type="lookup"
              value={form.currCode || ""}
              onLookup={isDisabled ? undefined : () => setIsCurrLookupOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />


          </div>
        </Card>

        {/* CARD 4: REGISTRATION INFORMATION */}
        <Card className="border border-blue-500/30 p-4 rounded-lg shadow-xl self-stretch h-full">
          <SectionHeader title="Registration Information" />
          <RegistrationInfo
            layout="twoCols"
            disabled={true}
            data={{
              registeredBy: form.registeredBy || form.registered_by || "",
              registeredDate: form.registeredDate || form.registered_date || "",
              lastUpdatedBy: form.updatedBy || form.updated_by || "",
              lastUpdatedDate: form.updatedDate || form.updated_date || "",
            }}
          />
        </Card>
 


        {/* LOOKUP MODALS */}
        <SearchCusMast
          isOpen={isCustLookupOpen}
          customParam="ActiveAll"
          onClose={async (selected) => {
            setIsCustLookupOpen(false);
            if (!selected) return;

            const code = selected?.custCode ?? selected?.cust_code ?? "";
            const tin = selected?.custTin ?? selected?.cust_tin ?? selected?.tin ?? "";

            onChangeForm({
              custCode: code,
              custTin: tin,
              vendTin: tin,
              tin: tin,
              __isNew: false,
            });

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
            const tin = selected?.vendTin ?? selected?.vend_tin ?? selected?.tin ?? "";

            onChangeForm({
              vendCode: code,
              vendTin: tin,
              custTin: tin,
              tin: tin,
              __isNew: false,
            });

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
