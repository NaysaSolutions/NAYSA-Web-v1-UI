import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faTimes, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { BriefcaseBusiness } from "lucide-react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchPositionRef from "@/NAYSA Cloud/Lookup/SearchPositionRef.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalDeleteConfirm, useSwalErrorAlert, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import ApprovalLevelSelect from "./ApprovalLevelSelect.jsx";

const ApprovalPositionRules = forwardRef(function ApprovalPositionRules(
  { docType, docTypeOptions, onDocTypeChange, approvalScope },
  ref,
) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [lookupRow, setLookupRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const userCode = user?.USER_CODE || user?.userCode || "SYSTEM";
  const scope = docType === "CV" ? "DOC" : approvalScope || "DOC";

  const load = async () => {
    if (!docType || !scope) return setRows([]);
    try {
      setLoading(true);
      const { data } = await apiClient.get("/approvalPositionRules", {
        params: { docCode: docType, appScope: scope, rcCode: "" },
      });
      const raw = data?.data?.[0]?.result ?? "[]";
      const result = Array.isArray(raw) ? raw : JSON.parse(raw);
      const grouped = new Map();
      result.forEach((row) => {
        const appLevel = Number(row.appLevel || 1);
        const approvalCoverage = scope === "DOC" ? "ALL" : row.approvalCoverage || "SELECTED";
        const active = row.active || "Y";
        const key = `${appLevel}|${approvalCoverage}|${active}`;
        if (!grouped.has(key)) grouped.set(key, {
          ...row,
          id: key,
          appLevel,
          approvalCoverage,
          active,
          positions: [],
        });
        if (row.posCode && row.posCode !== "*") {
          grouped.get(key).positions.push({ posCode: row.posCode, posName: row.posName });
        }
      });
      setRows(Array.from(grouped.values()));
    } catch (error) {
      useSwalErrorAlert(
        "Load Failed",
        error?.response?.data?.message || "Unable to load Approval Position Rules.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [docType, scope]);

  const updateRow = (id, updates) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...updates } : row));
  const add = () => setRows((current) => [...current, {
    id: `new-${Date.now()}`,
    appLevel: 1,
    approvalCoverage: scope === "DOC" ? "ALL" : "SELECTED",
    positions: [],
    active: "Y",
  }]);
  const reset = () => load();

  const clearSetup = async () => {
    if (!docType) return useSwalErrorAlert("Validation", "Select a document code.");
    if (!rows.length) return useSwalErrorAlert("Nothing to Clear", "No Position Rules are configured for the selected document and scope.");
    const confirmation = await useSwalDeleteConfirm(
      "Clear Position Rules?",
      `This will remove all ${rows.length} Position Rule setup(s) for ${docType} - ${scope}. Continue?`,
    );
    if (!confirmation?.isConfirmed) return;
    try {
      setSaving(true);
      await apiClient.post("/approvalPositionRules/clear", {
        json_data: { docCode: docType, appScope: scope, rcCode: "", userCode },
      });
      await load();
      useSwalSuccessAlert("Setup Cleared", "Approval Position Rules cleared successfully.");
    } catch (error) {
      useSwalErrorAlert(
        "Clear Failed",
        error?.response?.data?.message || "Unable to clear Approval Position Rules.",
      );
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!docType) return useSwalErrorAlert("Validation", "Select a document code.");
    const activeLevels = [...new Set(
      rows
        .filter((row) => row.active === "Y")
        .map((row) => Number(row.appLevel))
        .filter((level) => level >= 1 && level <= 4),
    )].sort((a, b) => a - b);
    const maximumLevel = activeLevels.length ? Math.max(...activeLevels) : 0;
    const missingLevels = Array.from({ length: maximumLevel }, (_, index) => index + 1)
      .filter((level) => !activeLevels.includes(level));
    if (missingLevels.length) {
      return useSwalErrorAlert(
        "Invalid Approval Level Sequence",
        `Add active Level ${missingLevels.join(", Level ")} before saving Level ${maximumLevel}.`,
      );
    }
    const keys = rows.flatMap((row) => row.positions.map((position) => `${row.appLevel}|${position.posCode}`));
    if (new Set(keys).size !== keys.length) return useSwalErrorAlert("Validation", "Duplicate position on the same approval level is not allowed.");
    try {
      setSaving(true);
      await apiClient.post("/approvalPositionRules", {
        json_data: {
          docCode: docType,
          appScope: scope,
          rcCode: "",
          userCode,
          dt1: rows.flatMap(({ appLevel, approvalCoverage, positions, active }) => {
            const assignedPositions = positions?.length ? positions : [{ posCode: "*" }];
            return assignedPositions.map(({ posCode }) => ({
              appLevel: Number(appLevel),
              approvalCoverage: scope === "DOC" ? "ALL" : approvalCoverage,
              posCode,
              active,
            }));
          }),
        },
      });
      await load();
      useSwalSuccessAlert("Success!", "Approval Position Rules saved successfully.");
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ add, save, reset, clearSetup }), [rows, docType, scope]);

  const columns = useMemo(() => [
    {
      key: "actions",
      label: "Actions",
      width: 75,
      requiredVisible: true,
      render: (row) => <button type="button" className="global-ref-td-button-delete-ui" title="Delete" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}><FontAwesomeIcon icon={faTrashAlt}/></button>,
    },
    { key: "lineNo", label: "#", width: 55 },
    {
      key: "appLevel",
      label: "Approval Level",
      width: 150,
      render: (row) => <ApprovalLevelSelect value={row.appLevel} onChange={(appLevel) => updateRow(row.id, { appLevel })} />,
    },
    {
      key: "approvalCoverage",
      label: "Approval Coverage",
      width: 180,
      render: (row) => <select className="h-7 w-full bg-transparent px-2 text-[11px] outline-none disabled:text-slate-500" value={scope === "DOC" ? "ALL" : row.approvalCoverage} disabled={scope === "DOC"} onChange={(event) => updateRow(row.id, { approvalCoverage: event.target.value })}><option value="ALL">All Items</option><option value="SELECTED">Selected Items</option></select>,
    },
    {
      key: "positionsText",
      label: "Position Assign",
      width: 720,
      requiredVisible: true,
      autoWidthValue: (row) => row.positions?.map((position) => position.posName || position.posCode).join(", ") || "",
      render: (row) => {
        const positions = row.positions || [];
        const visible = positions.slice(0, 4);
        return <div className="relative flex min-h-8 w-full items-center overflow-hidden py-1 pr-14">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {!positions.length && <span className="whitespace-nowrap rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">All Positions</span>}
            {visible.map((position) => <span key={position.posCode} className="max-w-[130px] truncate whitespace-nowrap rounded-md bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700" title={position.posName || position.posCode}>{position.posName || position.posCode}</span>)}
            {positions.length > 4 && <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">+{positions.length - 4} more</span>}
          </div>
          {!!positions.length && <FontAwesomeIcon icon={faTimes} className="absolute right-8 cursor-pointer text-sm text-slate-400 hover:text-red-600" title="Clear Positions" onClick={(event) => { event.stopPropagation(); updateRow(row.id, { positions: [] }); }}/>} 
          <FontAwesomeIcon icon={faSearch} className="absolute right-2 cursor-pointer text-lg text-blue-600 hover:text-blue-900" title="Select Positions" onClick={(event) => { event.stopPropagation(); setLookupRow(row.id); }}/>
        </div>;
      },
    },
    {
      key: "active",
      label: "Status",
      width: 120,
      render: (row) => <select className="h-7 w-full bg-transparent px-2 text-[11px] outline-none" value={row.active} onChange={(event) => updateRow(row.id, { active: event.target.value })}><option value="Y">Active</option><option value="N">Inactive</option></select>,
    },
  ], [rows, scope]);

  const tableRows = rows.map((row, index) => ({ ...row, lineNo: index + 1 }));
  const auditRow = rows[0] || {};
  const registrationInfo = {
    registeredByName: auditRow.registeredByName || auditRow.registeredBy || "",
    registeredDate: auditRow.registeredDate || "",
    lastUpdatedByName: auditRow.updatedByName || auditRow.updatedBy || "",
    lastUpdatedDate: auditRow.updatedDate || "",
  };

  return <div className="space-y-3">
    {(loading || saving) && <LoadingSpinner/>}
    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
      <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 border-b border-slate-200 pb-3">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-blue-700"><BriefcaseBusiness size={15}/> Approval Position Rule Setup</h3>
          <p className="text-[10px] text-slate-500">Multiple positions mean any assigned position may approve. Leave Position Assign blank to allow all positions.</p>
        </div>
        <div className="grid max-w-[780px] gap-3 md:grid-cols-[minmax(240px,360px)_minmax(240px,360px)]">
          <FieldRenderer label="Document Code" required type="select" value={docType} options={docTypeOptions} onChange={onDocTypeChange} disabled/>
          <FieldRenderer label="Approval Scope" required type="select" value={scope} disabled options={docType === "CV" ? [{ value: "DOC", label: "Document Approval" }] : [{ value: "DOC", label: "Document Approval" }, { value: "LINE", label: "Line Item Approval" }]}/>
        </div>
      </div>
      <div className="w-full lg:w-[520px]"><RegistrationInfo layout="twoCols" data={registrationInfo}/></div>
    </div>

    <div className="global-ref-table-main-div-ui">
      <SearchGlobalReferenceTable docType="ApprovalPositionRules" columns={columns} data={tableRows} itemsPerPage={200} isLoading={loading} isFetching={loading} onRefresh={load}/>
    </div>

    <SearchPositionRef isOpen={lookupRow !== null} multiSelect selectedPositions={rows.find((row) => row.id === lookupRow)?.positions?.map((position) => position.posCode) || []} title="Assign Position(s)" onClose={(selected) => {
      if (selected) updateRow(lookupRow, { positions: selected.map(({ posCode, posName }) => ({ posCode, posName })) });
      setLookupRow(null);
    }}/>
  </div>;
});

export default ApprovalPositionRules;
