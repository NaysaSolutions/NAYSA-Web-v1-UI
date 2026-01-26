import React, { useMemo } from "react";
import RefMaintenance from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/RefMaintenance";

const normalizePayTermRow = (x) => {
  const rawAdv = (x?.advances ?? "").toString().trim().toUpperCase();
  const rawAct = (x?.active ?? "").toString().trim().toUpperCase();

  return {
    code: x?.paytermCode ?? x?.payterm_code ?? "",
    name: x?.paytermName ?? x?.payterm_name ?? "",

    // keep as string for inputs, but normalize from API
    daysDue:
      x?.daysDue ??
      x?.days_due ??
      x?.dueDays ??
      x?.due_days ??
      "",

    // ✅ only "Y" or ""
    advances: rawAdv === "Y" ? "Y" : "",

    // ✅ active defaults to "Y"
    active: rawAct === "N" ? "N" : "Y",

    // ✅ KEEP REGISTRATION FIELDS
    registeredBy: x?.registeredBy ?? x?.registered_by ?? "",
    registeredDate: x?.registeredDate ?? x?.registered_date ?? "",
    lastUpdatedBy: x?.lastUpdatedBy ?? x?.updatedBy ?? x?.updated_by ?? "",
    lastUpdatedDate: x?.lastUpdatedDate ?? x?.updatedDate ?? x?.updated_date ?? "",
  };
};

export default function PayTermRef() {
  const emptyForm = useMemo(
    () => ({
      code: "",
      name: "",
      daysDue: 0,     // keep string for input
      advances: "",    // default blank
      active: "Y",     // default active
      // userCode will be injected by RefMaintenance (and/or on Add if you applied the fix)
    }),
    []
  );

  return (
    <RefMaintenance
      title="Payment Terms"
      subtitle="Used in Payee Set-Up and AP/AR documents."
      loadEndpoint="/payterm"
      getEndpoint="/getPayterm"
      upsertEndpoint="/upsertPayterm"
      deleteEndpoint="/deletePayterm"
      getParamKey="paytermCode"
      codeLabel="Pay Term Code"
      nameLabel="Pay Term Name"
      emptyForm={emptyForm}
      mapRow={normalizePayTermRow}

      // AP Advances dropdown + column
      extraColLabel="AP Advances"
      extraKey="advances"
      extraDefault=""
      extraOptions={[
        { value: "Y", label: "Y" },
        { value: "", label: "" },
      ]}

      // Active column + field
      showActive={true}
      activeLabel="Active"
      activeKey="active"
      activeDefault="Y"
      activeOptions={[
        { value: "Y", label: "Yes" },
        { value: "N", label: "No" },
      ]}

      buildUpsertPayload={(form) => {
        const due = String(form.daysDue ?? "").trim();

        return {
          paytermCode: String(form.code ?? "").trim(),
          paytermName: String(form.name ?? "").trim(),
          dueDays: due === "" ? null : Number(due), // safe convert
          advances: (form.advances ?? "").toString().trim().toUpperCase() === "Y" ? "Y" : "",
          active: (form.active ?? "Y").toString().trim().toUpperCase() === "N" ? "N" : "Y",
          userCode: form.userCode, // injected by RefMaintenance.save()
        };
      }}
    />
  );
}
