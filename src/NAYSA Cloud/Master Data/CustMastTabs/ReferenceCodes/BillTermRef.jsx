import React, { useMemo } from "react";
import RefMaintenance from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/RefMaintenance";

const normalizeBillTermRow = (x) => ({
  code: x?.billtermCode ?? x?.billterm_code ?? x?.billterm ?? "",
  name: x?.billtermName ?? x?.billterm_name ?? x?.billterm_desc ?? "",
  daysDue: x?.daysDue ?? x?.days_due ?? x?.dueDays ?? x?.due_days ?? 0,
  advances: x?.advances ?? x?.adv ?? x?.apAdv ?? "",
  userCode: x?.userCode ?? x?.user_code ?? "",
});

export default function BillTermRef() {
  const emptyForm = useMemo(
    () => ({ code: "", name: "", daysDue: 0, advances: "", userCode: "" }),
    []
  );

  return (
    <RefMaintenance
      title="Billing Terms"
      subtitle="Used for billing rules/terms in customer billing."
      loadEndpoint="/billterm"             // ✅ Route::get('/billterm')
      getEndpoint="/getBillterm"           // ✅ Route::get('/getBillterm')
      upsertEndpoint="/upsertBillterm"     // ✅ Route::post('/upsertBillterm')
      getParamKey="BILLTERM_CODE"          // ✅ query param key
      codeLabel="Billing Term Code"
      nameLabel="Billing Term Name"
      emptyForm={emptyForm}
      mapRow={normalizeBillTermRow}
      buildUpsertPayload={(form) => ({
        json_data: {
          billtermCode: form.code,
          billtermName: form.name,
          dueDays: Number(form.daysDue || 0),
          advances: form.advances ?? "",
          userCode: form.userCode ?? "",
        },
      })}
    />
  );
}
