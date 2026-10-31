import { useEffect, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";

export const useItemApprovalVisibility = (docCodes = ["PR", "PO", "JO"]) => {
  const [visible, setVisible] = useState(false);
  const { getAllTopHSDocRow, refsLoaded } = useAuth();
  const docCodeKey = docCodes.join("|");

  useEffect(() => {
    if (!refsLoaded) return;

    Promise.all(docCodeKey.split("|").map(async (docCode) => {
      const hsDoc = getAllTopHSDocRow?.(docCode);
      const docApp = String(hsDoc?.docApp ?? hsDoc?.doc_app ?? hsDoc?.DOC_APP ?? "N")
        .trim().toUpperCase();
      if (docApp !== "Y") return false;

      const { data } = await apiClient.get("/allTranApproval", { params: { "json_data[docCode]": docCode } });
      const raw = data?.data?.[0]?.result;
      const rows = typeof raw === "string" ? JSON.parse(raw || "[]") : (raw || []);
      return Array.isArray(rows) && rows.some((row) =>
        String(row?.appScope || "DOC").trim().toUpperCase() === "LINE"
      );
    })).then((setups) => setVisible(setups.some(Boolean)))
      .catch(() => setVisible(false));
  }, [docCodeKey, getAllTopHSDocRow, refsLoaded]);

  return visible;
};

export const useApprovalScope = (docCode) => {
  const [scope, setScope] = useState("DOC");
  const { getAllTopHSDocRow, refsLoaded } = useAuth();

  useEffect(() => {
    if (!refsLoaded || !docCode) return;
    const hsDoc = getAllTopHSDocRow?.(docCode);
    const docApp = String(hsDoc?.docApp ?? hsDoc?.doc_app ?? hsDoc?.DOC_APP ?? "N").toUpperCase();
    if (docApp !== "Y") { setScope("DOC"); return; }

    apiClient.get("/allTranApproval", { params: { "json_data[docCode]": docCode } })
      .then(({ data }) => {
        const raw = data?.data?.[0]?.result;
        const rows = typeof raw === "string" ? JSON.parse(raw || "[]") : (raw || []);
        const configured = String(rows?.[0]?.appScope || "DOC").trim().toUpperCase();
        setScope(["DOC", "LINE"].includes(configured) ? configured : "DOC");
      })
      .catch(() => setScope("DOC"));
  }, [docCode, getAllTopHSDocRow, refsLoaded]);

  return scope;
};

export const ItemApprovalSetup = ({ form, onChange, disabled }) => (
  <div className="grid grid-cols-1 gap-3">
    <FieldRenderer label="Require Approval" type="select" value={form.requireApproval || "N"}
      options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]}
      onChange={(value) => onChange({ requireApproval: value, maxAppLevel: value === "Y" ? (form.maxAppLevel || "1") : "0" })}
      disabled={disabled} readOnly={disabled} />
    <FieldRenderer label="Maximum Approval Level" type="select" value={String(form.maxAppLevel || "1")}
      options={[1, 2, 3, 4].map((value) => ({ value: String(value), label: `Level ${value}` }))}
      onChange={(value) => onChange({ maxAppLevel: String(value) })}
      disabled={disabled || form.requireApproval !== "Y"} readOnly={disabled || form.requireApproval !== "Y"} />
  </div>
);
