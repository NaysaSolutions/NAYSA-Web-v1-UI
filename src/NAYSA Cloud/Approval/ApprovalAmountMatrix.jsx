import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalDeleteConfirm,
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import ApprovalLevelSelect from "./ApprovalLevelSelect.jsx";

const newRow = (id, amountFrom = 0) => ({
  id,
  amountFrom,
  amountTo: "",
  requiredLevel: 1,
  activeFlag: "Y",
});

const toNumber = (value) => Number(String(value ?? "").replaceAll(",", ""));

const MatrixAmountInput = ({ value, allowBlank = false, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const isBlank = value === "" || value === null || value === undefined;

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={allowBlank ? "No Limit" : "0.00"}
      className="h-7 w-full bg-transparent px-2 text-right text-[11px] tabular-nums outline-none"
      value={editing ? draft : isBlank && allowBlank ? "" : formatNumber(parseFormattedNumber(value), 2)}
      onFocus={(event) => {
        const numericValue = parseFormattedNumber(value);
        const nextDraft = isBlank || numericValue === 0 ? "" : String(numericValue);
        setDraft(nextDraft);
        setEditing(true);
        requestAnimationFrame(() => event.target.select());
      }}
      onChange={(event) => {
        const nextValue = event.target.value.replace(/,/g, "");
        if (!/^\d*(?:\.\d{0,2})?$/.test(nextValue)) return;
        setDraft(nextValue);
        onChange(nextValue);
      }}
      onBlur={() => {
        const finalValue = draft === "" || draft === "." ? (allowBlank ? "" : "0") : draft;
        setEditing(false);
        onChange(finalValue);
      }}
    />
  );
};

const ApprovalAmountMatrix = forwardRef(function ApprovalAmountMatrix(
  { docType, docTypeOptions, onDocTypeChange, approvalScope },
  ref
) {
  const { user, companyInfo } = useAuth();
  const scope = docType === "CV" ? "DOC" : approvalScope || "DOC";
  const currencyCode = companyInfo?.currCode || "";
  const currencyDisplay = currencyCode
    ? `${currencyCode}${companyInfo?.currName ? ` - ${companyInfo.currName}` : ""}`
    : "";
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ["approvalAmountMatrix", docType, scope, currencyCode],
    enabled: Boolean(docType && currencyCode),
    queryFn: async () => {
      const { data } = await apiClient.get("/approvalAmountMatrix", {
        params: { docCode: docType, appScope: scope, currencyCode },
      });
      return Array.isArray(data?.data) ? data.data : [];
    },
    staleTime: 30000,
  });

  useEffect(() => {
    if (!query.data) return;
    setRows(
      query.data.map((row, index) => ({
        ...row,
        id: row.matrixId || index + 1,
        amountFrom: Number(row.amountFrom || 0),
        amountTo: row.amountTo == null ? "" : Number(row.amountTo),
        requiredLevel: Number(row.requiredLevel || 1),
        activeFlag: row.activeFlag || "Y",
      }))
    );
  }, [query.data]);

  const updateRow = (id, updates) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...updates } : row)));

  const addRow = () => {
    const previous = rows.at(-1);
    const nextFrom = previous?.amountTo === "" ? 0 : toNumber(previous?.amountTo || 0) + 0.01;
    setRows((current) => [...current, newRow(`new-${Date.now()}`, nextFrom)]);
  };

  const removeRow = async (row) => {
    const result = await useSwalDeleteConfirm("Confirm Delete", "Remove this approval amount range?");
    if (result?.isConfirmed) setRows((current) => current.filter((item) => item.id !== row.id));
  };

  const clearSetup = async () => {
    if (!docType) return useSwalErrorAlert("Validation", "Select a document code.");
    if (!rows.length) return useSwalErrorAlert("Nothing to Clear", "No Amount Matrix is configured for the selected document.");
    const confirmation = await useSwalDeleteConfirm(
      "Clear Amount Matrix?",
      `This will remove all ${rows.length} amount range(s) for ${docType} - ${scope}. Continue?`,
    );
    if (!confirmation?.isConfirmed) return;
    try {
      setSaving(true);
      await apiClient.post("/approvalAmountMatrix/clear", {
        json_data: {
          docCode: docType,
          appScope: scope,
          userCode: user?.USER_CODE || user?.userCode || "ADMIN",
        },
      });
      await query.refetch();
      useSwalSuccessAlert("Setup Cleared", "Approval Amount Matrix cleared successfully.");
    } catch (error) {
      useSwalValidationAlert({
        icon: "error",
        title: "Clear Failed",
        message: error?.response?.data?.details || error?.response?.data?.message || "Unable to clear Approval Amount Matrix.",
      });
    } finally {
      setSaving(false);
    }
  };

  const validate = () => {
    if (!rows.length) {
      useSwalErrorAlert("Required Fields", "At least one amount range is required.");
      return false;
    }

    const normalized = rows
      .map((row, index) => ({ ...row, index, from: toNumber(row.amountFrom), to: row.amountTo === "" ? null : toNumber(row.amountTo) }))
      .sort((a, b) => a.from - b.from);

    for (const row of normalized) {
      if (!Number.isFinite(row.from) || row.from < 0 || (row.to !== null && row.to < row.from)) {
        useSwalErrorAlert("Invalid Amount Range", `Row ${row.index + 1} has an invalid amount range.`);
        return false;
      }
    }

    for (let index = 1; index < normalized.length; index += 1) {
      const previous = normalized[index - 1];
      const current = normalized[index];
      if (previous.to === null || current.from <= previous.to) {
        useSwalErrorAlert(
          "Overlapping Amount Range",
          `Row ${previous.index + 1} overlaps Row ${current.index + 1}. Please correct the amount boundaries before saving.`
        );
        return false;
      }
    }

    const active = normalized.filter((row) => row.activeFlag === "Y");
    for (let index = 1; index < active.length; index += 1) {
      const previous = active[index - 1];
      const current = active[index];
      if (current.from > previous.to + 0.01) {
        useSwalErrorAlert("Amount Range Gap", "Active approval amount ranges must be continuous.");
        return false;
      }
    }
    if (active.length && active.at(-1).to !== null) {
      useSwalErrorAlert("Missing No-Limit Range", "The highest active amount range must have no upper limit.");
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!currencyCode) {
      useSwalErrorAlert("Missing Company Currency", "Please define the global currency in Company Setup.");
      return;
    }
    if (!validate()) return;
    try {
      setSaving(true);
      await apiClient.post("/approvalAmountMatrix", {
        json_data: {
          docCode: docType,
          appScope: scope,
          currencyCode,
          userCode: user?.USER_CODE || user?.userCode || "ADMIN",
          dt1: rows.map((row) => ({
            amountFrom: toNumber(row.amountFrom),
            amountTo: row.amountTo === "" ? null : toNumber(row.amountTo),
            requiredLevel: Number(row.requiredLevel),
            activeFlag: row.activeFlag,
          })),
        },
      });
      await query.refetch();
      useSwalSuccessAlert("Success!", "Approval Amount Matrix saved successfully.");
    } catch (error) {
      useSwalValidationAlert({
        icon: "error",
        title: "Save Failed",
        message: error?.response?.data?.details || error?.response?.data?.message || "Unable to save Approval Amount Matrix.",
      });
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      add: addRow,
      save,
      reset: () => query.refetch(),
      clearSetup,
    }),
    [rows, docType, scope, currencyCode, query.refetch]
  );

  const columns = useMemo(() => [
    {
      key: "actions", label: "Actions", width: 80, requiredVisible: true,
      render: (row) => (
        <button type="button" className="global-ref-td-button-delete-ui" title="Delete" onClick={() => removeRow(row)}>
          <FontAwesomeIcon icon={faTrashAlt} />
        </button>
      ),
    },
    { key: "lineNo", label: "#", width: 55 },
    {
      key: "amountFrom", label: "Amount From", width: 180,
      render: (row) => <MatrixAmountInput value={row.amountFrom} onChange={(value) => updateRow(row.id, { amountFrom: value })} />,
    },
    {
      key: "amountTo", label: "Amount To", width: 180,
      render: (row) => <MatrixAmountInput allowBlank value={row.amountTo} onChange={(value) => updateRow(row.id, { amountTo: value })} />,
    },
    {
      key: "requiredLevel", label: "Required Final Level", width: 170,
      render: (row) => <ApprovalLevelSelect value={row.requiredLevel} onChange={(requiredLevel) => updateRow(row.id, { requiredLevel })} />,
    },
    {
      key: "activeFlag", label: "Status", width: 120,
      render: (row) => <select className="h-7 w-full bg-transparent px-2 text-[11px] outline-none" value={row.activeFlag} onChange={(e) => updateRow(row.id, { activeFlag: e.target.value })}><option value="Y">Active</option><option value="N">Inactive</option></select>,
    },
  ], [rows]);

  const tableRows = rows.map((row, index) => ({ ...row, lineNo: index + 1 }));
  const auditRow = query.data?.[0] || {};
  const registrationInfo = {
    registeredByName: auditRow.registeredByName || auditRow.registeredBy || "",
    registeredDate: auditRow.registeredDate || "",
    lastUpdatedByName: auditRow.updatedByName || auditRow.updatedBy || "",
    lastUpdatedDate: auditRow.updatedDate || "",
  };

  return (
    <div className="space-y-3">
      {(query.isLoading || query.isFetching || saving) && <LoadingSpinner />}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-blue-700">Approval Amount Setup</h3>
              <p className="text-[10px] text-slate-500">The required level is cumulative: Level 3 requires Levels 1, 2, and 3.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(260px,380px)_minmax(260px,380px)]">
            <FieldRenderer label="Document Code" required type="select" value={docType} options={docTypeOptions} onChange={onDocTypeChange} disabled />
            <FieldRenderer label="Global Currency" required type="text" value={currencyDisplay} disabled />
          </div>
        </div>
        <div className="w-full lg:w-[520px]">
          <RegistrationInfo layout="twoCols" data={registrationInfo} />
        </div>
      </div>
      <div className="global-ref-table-main-div-ui">
        <SearchGlobalReferenceTable
          docType="ApprovalAmountMatrix"
          columns={columns}
          data={tableRows}
          itemsPerPage={200}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          onRefresh={query.refetch}
        />
      </div>
    </div>
  );
});

export default ApprovalAmountMatrix;
