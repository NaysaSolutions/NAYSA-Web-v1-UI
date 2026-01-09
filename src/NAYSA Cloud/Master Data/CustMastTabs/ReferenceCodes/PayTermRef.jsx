import React, { useMemo } from "react";
import RefMaintenance from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/RefMaintenance";

const normalizePayTermRow = (x) => {
  const raw = (x?.advances ?? "").toString().trim().toUpperCase();
  return {
    code: x?.paytermCode ?? x?.payterm_code ?? "",
    name: x?.paytermName ?? x?.payterm_name ?? "",
    daysDue: x?.daysDue ?? x?.days_due ?? x?.dueDays ?? x?.due_days ?? 0,

    // ✅ only "Y" or ""
    advances: raw === "Y" ? "Y" : "",
  };
};

export default function PayTermRef() {
  const emptyForm = useMemo(
    () => ({
      code: "",
      name: "",
      daysDue: 0,
      advances: "", // ✅ default blank (No)
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
      getParamKey="PAYTERM_CODE"
      codeLabel="Pay Term Code"
      nameLabel="Pay Term Name"
      emptyForm={emptyForm}
      mapRow={normalizePayTermRow}

      // ✅ AP Advances dropdown + column (Yes or blank only)
      extraColLabel="AP Advances"
      extraKey="advances"
      extraDefault=""
      extraOptions={[
        { value: "Y", label: "Y" },
        
      ]}

      buildUpsertPayload={(form) => ({
        json_data: {
          paytermCode: form.code,
          paytermName: form.name,
          dueDays: Number(form.daysDue || 0),

          // ✅ send only "Y" or ""
          advances: (form.advances ?? "").toString().trim().toUpperCase() === "Y" ? "Y" : "",
        },
      })}
    />
  );
}
