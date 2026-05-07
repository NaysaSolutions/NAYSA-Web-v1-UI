import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";

import SearchVendMast from "@/NAYSA Cloud/Lookup/SearchVendMast.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchATCRef from "@/NAYSA Cloud/Lookup/SearchATCRef.jsx";
import SearchVATRef from "@/NAYSA Cloud/Lookup/SearchVATRef.jsx";
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import SearchPayTermRef from "@/NAYSA Cloud/Lookup/SearchPayTermRef.jsx";
import SearchCurrRef from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

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

const PayeeSetupTab = forwardRef(
  (
    {
      isLoading,
      isEditing,
      form = {},
      generationMode,
      sltypeOptions = [],
      sourceOptions = [],
      activeOptions = [],
      onChangeForm,
      onSelectCustomerCode,
      payeeTypeOptions = [],
      taxClassOptions = [],
    },
    ref
  ) => {
    useImperativeHandle(ref, () => ({}));

    // --- 1. DEFINE CONSTANTS ---
    const isNewRecord = form.__isNew;
    const isReadOnly = !isEditing;
    const isDisabled = isReadOnly || isLoading;

    const [tblFieldArray, setTblFieldArray] = useState([]);

    useEffect(() => {
      const run = async () => {
        try {
          const result = await useFieldLenghtCheck("vend_mast,payee_mast");
          if (result) setTblFieldArray(result);
        } catch (e) {
          console.error("Failed to load field lengths:", e);
        }
      };
      run();
    }, []);

    const getLen = (col, fallback = undefined) => {
      const n = useGetFieldLength(tblFieldArray, col);
      return n || fallback;
    };

    // --- 2. UNLOCKING LOGIC ---
    const isManualMode = useMemo(() => {
      const mode = normalizeUpper(generationMode || "Manual");
      return mode === "MANUAL" || mode === "M";
    }, [generationMode]);

    const canType = isNewRecord && isManualMode;
    const overrideRef = useRef(null);

    useEffect(() => {
      if (overrideRef.current) {
        const input = overrideRef.current.querySelector("input");
        if (input) {
          if (canType) {
            // UNLOCK for Manual + New Record
            input.removeAttribute("readonly");
            input.onclick = (e) => e.stopPropagation(); // Prevents click from opening lookup
            input.oninput = (e) => {
              onChangeForm({ vendCode: e.target.value, custCode: e.target.value });
            };
          } else {
            // LOCK for Auto or Retrieved Records
            input.setAttribute("readonly", "true");
            input.onclick = null;
            input.oninput = null;
          }
        }
      }
    }, [canType, isNewRecord, onChangeForm]);

    const sl = useMemo(
      () => normalizeUpper(form?.sltypeCode || "SU"),
      [form?.sltypeCode]
    );

    const taxClass = useMemo(
      () => normalizeUpper(form?.taxClass || ""),
      [form?.taxClass]
    );

    const isEmployee = sl === "EM";
    const isSupplier = sl === "SU";
    const isIndividualTaxClass = taxClass === "WI";

    const isTinRequired = !isIndividualTaxClass;
    const shouldAutoNameFromParts = isEmployee;
    const shouldDisableBusinessName = isEmployee;
    const shouldLockNameParts = isSupplier && !isIndividualTaxClass;

    const f = useMemo(
      () => ({
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
      }),
      []
    );

    const col = useMemo(
      () => ({
        code: "vend_code",
        name: "vend_name",
        contact: "vend_contact",
        position: "vend_position",
        tel: "vend_telno",
        mobile: "vend_mobileno",
        email: "vend_email",
        addr1: "vend_addr1",
        addr2: "vend_addr2",
        addr3: "vend_addr3",
        zip: "vend_zip",
        tin: "vend_tin",
        businessName: "business_name",
        checkName: "check_name",
        firstName: "first_name",
        middleName: "middle_name",
        lastName: "last_name",
        atcCode: "atc_code",
        vatCode: "vat_code",
        paytermCode: "payterm_code",
        acctCode: "acct_code",
        currCode: "curr_code",
      }),
      []
    );

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
              : o?.value ?? o?.code ?? o?.taxClass ?? o?.tax_class ?? "";

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
        if (seen.has(x.value)) return false;
        seen.add(x.value);
        return true;
      });
    }, [taxClassOptions]);

    const buildRegisteredName = (fn, mn, ln) => {
      return [fn, mn, ln]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
        .join(" ");
    };

    const taxAutoRef = useRef({
      lastAutoValue: "",
      userTouched: false,
      lastSl: "",
    });

    const nameAutoRef = useRef({
      businessLastAuto: "",
      checkLastAuto: "",
      businessTouched: false,
      checkTouched: false,
      lastSl: "",
    });

    const handleTaxClassChange = (v) => {
      const value = getValue(v);
      taxAutoRef.current.userTouched = true;
      onChangeForm({ taxClass: value });
    };

    const handleBusinessNameChange = (v) => {
      const value = getValue(v);
      nameAutoRef.current.businessTouched = true;
      onChangeForm({ businessName: value });
    };

    const handleCheckNameChange = (v) => {
      const value = getValue(v);
      nameAutoRef.current.checkTouched = true;
      onChangeForm({ checkName: value });
    };

    const applyAutoNames = (updates = {}, baseName = "") => {
      const reg = String(baseName || "").trim();

      const currentBusiness = form?.businessName ?? "";
      const currentCheck = form?.checkName ?? "";

      const businessWasAuto =
        currentBusiness &&
        currentBusiness === nameAutoRef.current.businessLastAuto;

      const checkWasAuto =
        currentCheck && currentCheck === nameAutoRef.current.checkLastAuto;

      const businessEmpty = !String(currentBusiness || "").trim();
      const checkEmpty = !String(currentCheck || "").trim();

      if (
        (businessEmpty || businessWasAuto) &&
        !nameAutoRef.current.businessTouched
      ) {
        updates.businessName = reg;
        nameAutoRef.current.businessLastAuto = reg;
      }

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
      const slChanged = taxAutoRef.current.lastSl !== sl;

      if (slChanged) {
        if (taxAutoRef.current.userTouched && !wasAuto && !isEmpty) {
          taxAutoRef.current.lastSl = sl;
          return;
        }
      }

      if (isEmpty || wasAuto) {
        taxAutoRef.current.lastAutoValue = desired;
        taxAutoRef.current.userTouched = false;
        onChangeForm({ taxClass: desired });
      }

      taxAutoRef.current.lastSl = sl;
    }, [sl, isEditing, form?.taxClass, onChangeForm]);

    useEffect(() => {
      if (!isEditing) return;

      const slChanged = nameAutoRef.current.lastSl !== sl;
      if (slChanged) {
        nameAutoRef.current.businessTouched = false;
        nameAutoRef.current.checkTouched = false;
        nameAutoRef.current.businessLastAuto = "";
        nameAutoRef.current.checkLastAuto = "";
      }
      nameAutoRef.current.lastSl = sl;
    }, [sl, isEditing]);

    useEffect(() => {
      if (!isEditing) return;

      if (shouldAutoNameFromParts) {
        const reg = buildRegisteredName(
          form.firstName,
          form.middleName,
          form.lastName
        );

        const updates = {};

        if ((form[f.name] || "") !== reg) updates[f.name] = reg;
        if ((form.businessName || "") !== reg) updates.businessName = reg;

        applyAutoNames(updates, reg);

        if (Object.keys(updates).length) onChangeForm(updates);
        return;
      }

      if (isSupplier && !isIndividualTaxClass) {
        const reg = form[f.name] || "";
        if (String(reg || "").trim()) {
          const updates = {};
          applyAutoNames(updates, reg);
          if (Object.keys(updates).length) onChangeForm(updates);
        }
      }
    }, [
      shouldAutoNameFromParts,
      isSupplier,
      isIndividualTaxClass,
      isEditing,
      form.firstName,
      form.middleName,
      form.lastName,
      form.businessName,
      form.checkName,
      form[f.name],
      onChangeForm,
      f,
    ]);

    const [isVendLookupOpen, setIsVendLookupOpen] = useState(false);
    const [isBranchLookupOpen, setIsBranchLookupOpen] = useState(false);
    const [isATCLookupOpen, setIsATCLookupOpen] = useState(false);
    const [isVATLookupOpen, setIsVATLookupOpen] = useState(false);
    const [isAPAcctLookupOpen, setIsAPAcctLookupOpen] = useState(false);
    const [isPayTermLookupOpen, setIsPayTermLookupOpen] = useState(false);
    const [isCurrLookupOpen, setIsCurrLookupOpen] = useState(false);

    const openPayeeLookup = () => {
      if (isLoading) return;
      setIsVendLookupOpen(true);
    };


    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start rounded-lg relative">
          <Card className="border border-blue-500/30 p-6 rounded-lg">
            <SectionHeader title="BASIC INFORMATION" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRenderer
                label="SL Type"
                type="select"
                value={form.sltypeCode || ""}
                options={sltypeOptions}
                onChange={(v) => onChangeForm({ sltypeCode: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />

              <FieldRenderer
                label="Active?"
                type="select"
                value={form.active || "Y"}
                options={activeOptions}
                onChange={(v) => onChangeForm({ active: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div 
                  ref={overrideRef}
                  className={`w-full ${!canType ? "[&>div]:!bg-[#F1F5F9] [&_input]:!bg-transparent [&_input]:!pointer-events-none [&_input]:!text-slate-600 [&_button]:!text-slate-400 [&_label]:!bg-[#F1F5F9]" : ""}`}
              >
                  <FieldRenderer
                      label="Payee Code"
                      required
                      type="lookup" 
                      value={form[f.code] || ""}
                      onChange={canType ? (v) => {
                          const val = getValue(v);
                          onChangeForm({ [f.code]: val, custCode: val });
                      } : undefined}
                      onLookup={canType ? undefined : openPayeeLookup}
                      readOnly={!canType}
                      disabled={isLoading}
                      maxLength={getLen(col.code, 20)}
                  />
              </div>

              <FieldRenderer
                label="Tax Rate Class"
                required
                type="select"
                value={normalizeUpper(form.taxClass || "")}
                options={mappedTaxClassOptions}
                onChange={handleTaxClassChange}
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
                const value = getValue(v);
                const updates = { [f.name]: value };

                if (isSupplier && !isIndividualTaxClass) {
                  applyAutoNames(updates, value);
                }

                onChangeForm(updates);
              }}
              readOnly={isReadOnly || shouldAutoNameFromParts}
              disabled={isDisabled || shouldAutoNameFromParts}
              maxLength={getLen(col.name, 150)}
            />

            <FieldRenderer
              label="Business Name"
              required={!isIndividualTaxClass}
              type="text"
              value={form.businessName || ""}
              onChange={handleBusinessNameChange}
              readOnly={isReadOnly || shouldDisableBusinessName}
              disabled={isDisabled || shouldDisableBusinessName}
              maxLength={getLen(col.businessName, 150)}
            />

            <FieldRenderer
              label="Check Name"
              type="text"
              value={form.checkName || ""}
              onChange={handleCheckNameChange}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen(col.checkName, 150)}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FieldRenderer
                label="First Name"
                required={isIndividualTaxClass}
                type="text"
                value={form.firstName || ""}
                onChange={(v) => {
                  const value = getValue(v);
                  const updates = { firstName: value };

                  if (shouldAutoNameFromParts) {
                    const reg = buildRegisteredName(
                      value,
                      form.middleName,
                      form.lastName
                    );
                    updates[f.name] = reg;
                    updates.businessName = reg;
                    applyAutoNames(updates, reg);
                  }

                  onChangeForm(updates);
                }}
                readOnly={isReadOnly}
                disabled={isDisabled || shouldLockNameParts}
                maxLength={getLen(col.firstName, 50)}
              />

              <FieldRenderer
                label="Middle Name"
                type="text"
                value={form.middleName || ""}
                onChange={(v) => {
                  const value = getValue(v);
                  const updates = { middleName: value };

                  if (shouldAutoNameFromParts) {
                    const reg = buildRegisteredName(
                      form.firstName,
                      value,
                      form.lastName
                    );
                    updates[f.name] = reg;
                    updates.businessName = reg;
                    applyAutoNames(updates, reg);
                  }

                  onChangeForm(updates);
                }}
                readOnly={isReadOnly}
                disabled={isDisabled || shouldLockNameParts}
                maxLength={getLen(col.middleName, 50)}
              />

              <FieldRenderer
                label="Last Name"
                required={isIndividualTaxClass}
                type="text"
                value={form.lastName || ""}
                onChange={(v) => {
                  const value = getValue(v);
                  const updates = { lastName: value };

                  if (shouldAutoNameFromParts) {
                    const reg = buildRegisteredName(
                      form.firstName,
                      form.middleName,
                      value
                    );
                    updates[f.name] = reg;
                    updates.businessName = reg;
                    applyAutoNames(updates, reg);
                  }

                  onChangeForm(updates);
                }}
                readOnly={isReadOnly}
                disabled={isDisabled || shouldLockNameParts}
                maxLength={getLen(col.lastName, 50)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FieldRenderer
                label="Old Code"
                type="text"
                value={form.oldCode || ""}
                onChange={(v) => onChangeForm({ oldCode: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />

              <FieldRenderer
                label="Branch"
                type="lookup"
                value={form.branchCode || ""}
                onLookup={
                  isDisabled ? undefined : () => setIsBranchLookupOpen(true)
                }
                readOnly={isReadOnly}
                disabled={isDisabled}
              />

              <FieldRenderer
                label="Payee Type"
                type={payeeTypeOptions?.length ? "select" : "text"}
                value={form.payeeType || ""}
                options={payeeTypeOptions}
                onChange={(v) => onChangeForm({ payeeType: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
            </div>
          </Card>

          <Card className="border border-blue-500/30 p-6 rounded-lg">
            <SectionHeader title="CONTACT INFORMATION" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRenderer
                label="Contact Person"
                type="text"
                value={form[f.contact] || ""}
                onChange={(v) => onChangeForm({ [f.contact]: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.contact, 100)}
              />

              <FieldRenderer
                label="Position"
                type="text"
                value={form[f.position] || ""}
                onChange={(v) => onChangeForm({ [f.position]: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.position, 50)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRenderer
                label="Telephone No."
                type="text"
                value={form[f.tel] || ""}
                onChange={(v) => onChangeForm({ [f.tel]: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.tel, 30)}
              />

              <FieldRenderer
                label="Mobile No."
                type="text"
                value={form[f.mobile] || ""}
                onChange={(v) => onChangeForm({ [f.mobile]: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.mobile, 30)}
              />
            </div>

            <FieldRenderer
              label="Email Address"
              type="text"
              value={form[f.email] || ""}
              onChange={(v) => onChangeForm({ [f.email]: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen(col.email, 100)}
            />

            <FieldRenderer
              label="Address 1"
              required
              type="text"
              value={form[f.addr1] || ""}
              onChange={(v) => onChangeForm({ [f.addr1]: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen(col.addr1, 200)}
            />

            <FieldRenderer
              label="Address 2"
              type="text"
              value={form[f.addr2] || ""}
              onChange={(v) => onChangeForm({ [f.addr2]: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen(col.addr2, 200)}
            />

            <FieldRenderer
              label="Address 3"
              type="text"
              value={form[f.addr3] || ""}
              onChange={(v) => onChangeForm({ [f.addr3]: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
              maxLength={getLen(col.addr3, 200)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRenderer
                label="ZIP Code"
                type="text"
                value={form[f.zip] || ""}
                onChange={(v) => onChangeForm({ [f.zip]: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.zip, 20)}
              />

              <FieldRenderer
                label="Source"
                required
                type="select"
                value={form.source || ""}
                options={sourceOptions}
                onChange={(v) => onChangeForm({ source: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
            </div>
          </Card>

          <Card className="border border-blue-500/30 p-4 rounded-lg self-start !h-fit !min-h-0">
            <SectionHeader title="ACCOUNTING INFORMATION" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <FieldRenderer
                label="TIN"
                required={isTinRequired}
                type="text"
                value={form.vendTin || form.vend_tin || form.tin || ""}
                onChange={(v) => {
                  const value = getValue(v);
                  onChangeForm({
                    vendTin: value,
                    tin: value,
                  });
                }}
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.tin, 50)}
              />

              <FieldRenderer
                label="Default ATC"
                type="lookup"
                value={form.atcCode || ""}
                onLookup={
                  isDisabled ? undefined : () => setIsATCLookupOpen(true)
                }
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.atcCode, 50)}
              />

              <FieldRenderer
                label="Default VAT"
                type="lookup"
                value={form.vatCode || ""}
                onLookup={
                  isDisabled ? undefined : () => setIsVATLookupOpen(true)
                }
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.vatCode, 50)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              <FieldRenderer
                label="Default Payment Terms"
                required
                type="lookup"
                value={form.paytermCode || ""}
                onLookup={
                  isDisabled ? undefined : () => setIsPayTermLookupOpen(true)
                }
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.paytermCode, 50)}
              />

              <FieldRenderer
                label="Default A/P Account"
                required
                type="lookup"
                value={form.acctCode || ""}
                onLookup={
                  isDisabled ? undefined : () => setIsAPAcctLookupOpen(true)
                }
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen(col.acctCode, 50)}
              />

              <FieldRenderer
                label="Currency"
                type="lookup"
                value={form.currCode || ""}
                onLookup={
                  isDisabled ? undefined : () => setIsCurrLookupOpen(true)
                }
                readOnly={isReadOnly}
                disabled={isDisabled}
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

        <SearchVendMast
          isOpen={isVendLookupOpen}
          customParam="ActiveAll"
          endpoint="/lookupVendMast"
          onClose={async (selected) => {
            setIsVendLookupOpen(false);
            if (!selected) return;

            const code =
              getValue(selected?.vendCode) || getValue(selected?.vend_code);
            const tin =
              getValue(selected?.vendTin) ||
              getValue(selected?.vend_tin) ||
              getValue(selected?.tin);

            if (!code) return;

            onChangeForm({
              vendCode: code,
              vendTin: tin,
              tin,
              __isNew: false,
            });

            await onSelectCustomerCode?.(code);
          }}
        />

        <SearchBranchRef
          isOpen={isBranchLookupOpen}
          onClose={(selected) => {
            setIsBranchLookupOpen(false);
            if (!selected) return;

            const branchCode =
              getValue(selected?.branchCode) || getValue(selected?.branch_code);

            if (!branchCode) return;
            onChangeForm({ branchCode });
          }}
        />

        <SearchATCRef
          isOpen={isATCLookupOpen}
          onClose={(selected) => {
            setIsATCLookupOpen(false);
            if (!selected) return;

            const atcCode =
              getValue(selected?.atcCode) || getValue(selected?.atc_code);

            if (!atcCode) return;
            onChangeForm({ atcCode });
          }}
        />

        <SearchVATRef
          isOpen={isVATLookupOpen}
          onClose={(selected) => {
            setIsVATLookupOpen(false);
            if (!selected) return;

            const vatCode =
              getValue(selected?.vatCode) || getValue(selected?.vat_code);

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
              paytermCode: getValue(selected?.paytermCode),
              paytermName: getValue(selected?.paytermName),
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
              apAccount: getValue(selected?.acctCode),
              acctCode: getValue(selected?.acctCode),
              apAccountName: getValue(selected?.acctName),
              reqSL: getValue(selected?.slReq),
              reqRC: getValue(selected?.rcReq),
            });
          }}
        />

        <SearchCurrRef
          isOpen={isCurrLookupOpen}
          onClose={(selected) => {
            setIsCurrLookupOpen(false);
            if (!selected) return;

            onChangeForm({
              currCode: getValue(selected?.currCode),
              currName: getValue(selected?.currName),
            });
          }}
        />
      </>
    );
  }
);

PayeeSetupTab.displayName = "PayeeSetupTab";
export default PayeeSetupTab;