import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faFolderOpen, faList, faPlus, faSave, faTags, faTrashAlt, faUndo } from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { formatNumber, parseFormattedNumber, useSwalDeleteConfirm, useSwalErrorAlert, useSwalErrorAlertAPI, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import SearchCustMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchProjectPhase from "@/NAYSA Cloud/Lookup/SearchProjectPhase.jsx";
import SearchProjectReference from "@/NAYSA Cloud/Lookup/SearchProjectReference.jsx";
import SearchSalesRepRef from "@/NAYSA Cloud/Lookup/SearchSalesRepRef.jsx";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import ProjectReferenceCodes from "@/NAYSA Cloud/Reference File/ProjectReferenceCodes.jsx";

const EMPTY_FORM = {
  projectId: "", projectCode: "", projectName: "", projectType: "", year: "",
  activityCode: "", activityName: "", customerCode: "", customerName: "",
  representativeCode: "", representativeName: "", oldCode: "", projectStatus: "", startDate: "", endDate: "",
  phaseCode: "", phaseName: "", siteCode: "", siteName: "",
  rcCode: "", rcName: "",
  contractAmount: "0.00", budgetAmount: "0.00", active: "Y",
};

const parseResult = (response, fallback = []) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (!raw) return fallback;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return fallback; }
};
const parseCheckResult = (response) => String(response?.data?.data?.[0]?.result ?? "0") === "1";

const toDateValue = (value) => value ? String(value).split("T")[0] : "";
const toNumberValue = (value) => Number(String(value ?? "0").replace(/,/g, "")) || 0;
const formatAmount = (value) => formatNumber(parseFormattedNumber(value), 2);
const parseDropdownOptions = (response) => parseResult(response).map((row) => ({
  value: row.DROPDOWN_CODE ?? row.dropdownCode ?? "",
  label: row.DROPDOWN_NAME ?? row.dropdownName ?? "",
}));

const ProjectMaster = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const referenceRef = useRef(null);
  const contractAmountRef = useRef(null);
  const budgetAmountRef = useRef(null);
  const [activeTab, setActiveTab] = useState("setup");
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [referenceState, setReferenceState] = useState({ canSave: false });

  const { pagePermission, isReadOnly, isFullAccess, canAdd, canEdit, canSave, canDelete } = usePagePermission({ componentKey: "ProjectMaster", menuName: "Project Master" });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({ queryKey: ["projectMasterList"], queryFn: async () => parseResult(await apiClient.get("/projectMaster")), staleTime: 0 });
  const { data: activities = [] } = useQuery({ queryKey: ["projectActivityList"], queryFn: async () => parseResult(await apiClient.get("/projectActivity")), staleTime: 0 });
  const { data: sites = [] } = useQuery({ queryKey: ["projectSiteList"], queryFn: async () => parseResult(await apiClient.get("/projectSite")), staleTime: 0 });
  const { data: projectTypeOptions = [] } = useQuery({
    queryKey: ["projectMasterDropdown", "PROJECT_TYPE"],
    queryFn: async () => parseDropdownOptions(await apiClient.post("/getHSDropdown", { json_data: { dropdownColumn: "PROJECT_TYPE", docCode: "PRJMST" } })),
    staleTime: 1000 * 60 * 5,
  });
  const { data: projectStatusOptions = [] } = useQuery({
    queryKey: ["projectMasterDropdown", "PROJECT_STATUS"],
    queryFn: async () => parseDropdownOptions(await apiClient.post("/getHSDropdown", { json_data: { dropdownColumn: "PROJECT_STATUS", docCode: "PRJMST" } })),
    staleTime: 1000 * 60 * 5,
  });

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const resetForm = () => { setForm(EMPTY_FORM); setIsEditing(false); };
  const startAdd = () => { setForm(EMPTY_FORM); setIsEditing(true); setActiveTab("setup"); };

  const fillForm = (row) => {
    setForm({
      ...EMPTY_FORM, ...row,
      startDate: toDateValue(row.startDate), endDate: toDateValue(row.endDate),
      contractAmount: formatAmount(row.contractAmount), budgetAmount: formatAmount(row.budgetAmount),
    });
    setIsEditing(canEdit);
    setActiveTab("setup");
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/upsertProjectMaster", { json_data: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projectMasterList"] });
      useSwalSuccessAlert("Saved", "Project Master saved successfully.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const handleSave = async () => {
    if (!form.projectCode.trim() || !form.projectName.trim()) {
      useSwalErrorAlert("Required Fields", "Project Code and Project Name are required.");
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      useSwalErrorAlert("Invalid Date", "End Date cannot be earlier than Start Date.");
      return;
    }
    const payload = {
      ...form,
      projectCode: form.projectCode.trim().toUpperCase(),
      projectName: form.projectName.trim(),
      contractAmount: toNumberValue(form.contractAmount),
      budgetAmount: toNumberValue(form.budgetAmount),
      userCode: user?.USER_CODE || user?.userCode || "ADMIN",
    };
    if (!form.projectId) {
      try {
        const duplicate = parseCheckResult(await apiClient.post("/checkDuplicateProjectMaster", { json_data: payload }));
        if (duplicate) {
          useSwalErrorAlert("Duplicate Record", `Project Code ${payload.projectCode} already exists.`);
          return;
        }
      } catch (error) {
        useSwalErrorAlertAPI("Validation Failed", error);
        return;
      }
    }
    saveMutation.mutate(payload);
  };

  const handleDelete = async () => {
    if (!form.projectCode) return;
    try {
      const inUsed = parseCheckResult(await apiClient.post("/checkInUsedProjectMaster", { json_data: { projectId: form.projectId, projectCode: form.projectCode } }));
      if (inUsed) {
        useSwalErrorAlert("Record In Use", `Project Code ${form.projectCode} is already in use and cannot be deleted.`);
        return;
      }
    } catch (error) {
      useSwalErrorAlertAPI("Validation Failed", error);
      return;
    }
    const confirmation = await useSwalDeleteConfirm("Delete Project?", `Delete Project ${form.projectCode}?`);
    if (!confirmation?.isConfirmed) return;
    try {
      await apiClient.post("/deleteProjectMaster", { json_data: { projectId: form.projectId, projectCode: form.projectCode } });
      await queryClient.invalidateQueries({ queryKey: ["projectMasterList"] });
      useSwalSuccessAlert("Deleted", "Project Master deleted successfully.");
      resetForm();
    } catch (error) { useSwalErrorAlertAPI("Delete Failed", error); }
  };

  const activeSites = useMemo(() => sites.filter((row) => !form.phaseCode || row.phaseCode === form.phaseCode), [form.phaseCode, sites]);

  const tableColumns = useMemo(() => [
    { key: "__actions", label: "Actions", width: 75, render: (row) => <button type="button" className="global-ref-td-button-edit-ui" onClick={() => fillForm(row)} title="Edit"><FontAwesomeIcon icon={faEdit} /></button> },
    { key: "projectCode", label: "Project Code", sortable: true, pinned: true, width: 150 },
    { key: "projectName", label: "Project Name", sortable: true, width: 300 },
    { key: "projectType", label: "Project Type", sortable: true, width: 150 },
    { key: "year", label: "Year", sortable: true, width: 90 },
    { key: "activityName", label: "Activity Name", sortable: true, width: 200 },
    { key: "customerName", label: "Customer Name", sortable: true, width: 240 },
    { key: "phaseName", label: "Phase Name", sortable: true, width: 200 },
    { key: "siteName", label: "Site Name", sortable: true, width: 220 },
    { key: "rcCode", label: "Responsibility Center Code", sortable: true, width: 190 },
    { key: "rcName", label: "Responsibility Center Name", sortable: true, width: 240 },
    { key: "contractAmount", label: "Contract Amount", sortable: true, width: 150, renderType: "number", roundingOff: 2, className: "text-right" },
    { key: "budgetAmount", label: "Budget Amount", sortable: true, width: 150, renderType: "number", roundingOff: 2, className: "text-right" },
    { key: "active", label: "Active", sortable: true, width: 90, render: (row) => row.active === "Y" ? "Yes" : "No" },
  ], [canEdit]);

  const tabs = [
    { id: "setup", label: "Project Setup", icon: faFolderOpen },
    { id: "master", label: "Project Master Data", icon: faList },
    { id: "ref", label: "Reference Codes", icon: faTags },
  ];

  const headerButtons = activeTab === "ref" ? [
    { key: "add", label: <span className="ml-1">Add</span>, icon: faPlus, onClick: () => referenceRef.current?.add?.(), disabled: !canAdd },
    { key: "save", label: <span className="ml-1">Save</span>, icon: faSave, onClick: () => referenceRef.current?.save?.(), disabled: !referenceState.canSave || !canSave },
    { key: "reset", label: <span className="ml-1">Reset</span>, icon: faUndo, onClick: () => referenceRef.current?.reset?.() },
  ] : activeTab === "setup" ? [
    { key: "add", label: <span className="ml-1">Add</span>, icon: faPlus, onClick: startAdd, disabled: !canAdd },
    { key: "save", label: <span className="ml-1">Save</span>, icon: faSave, onClick: handleSave, disabled: !isEditing || !canSave || saveMutation.isPending },
    { key: "reset", label: <span className="ml-1">Reset</span>, icon: faUndo, onClick: resetForm },
    { key: "delete", label: <span className="ml-1">Delete</span>, icon: faTrashAlt, onClick: handleDelete, disabled: !form.projectId || !canDelete },
  ] : [{ key: "reset", label: <span className="ml-1">Reset</span>, icon: faUndo, onClick: () => queryClient.invalidateQueries({ queryKey: ["projectMasterList"] }) }];

  const amountField = (label, key, inputRef, nextInputRef) => (
    <FieldRenderer
      label={label}
      type="amount"
      inputMode="decimal"
      hideClearButton
      inputRef={inputRef}
      value={form[key]}
      disabled={!isEditing}
      onFocus={(event) => {
        const input = event.currentTarget;
        if (parseFormattedNumber(input.value) === 0) {
          updateForm({ [key]: "" });
        }
        requestAnimationFrame(() => input.select());
      }}
      onChange={(value) => {
        const cleanValue = String(value ?? "").replace(/,/g, "");
        if (!/^\d*(?:\.\d{0,2})?$/.test(cleanValue)) return;
        updateForm({ [key]: cleanValue });
      }}
      onBlur={(event) => {
        updateForm({ [key]: formatAmount(event.currentTarget.value) });
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        const input = event.currentTarget;
        event.preventDefault();
        updateForm({ [key]: formatAmount(input.value) });
        if (nextInputRef?.current) {
          requestAnimationFrame(() => nextInputRef.current?.focus());
        } else {
          input.blur();
        }
      }}
    />
  );

  return (
    <div className="global-ref-main-div-ui">
      {(projectsLoading || saveMutation.isPending) && <LoadingSpinner />}
      <SearchCustMast isOpen={lookup === "customer"} onClose={(row) => { setLookup(null); if (row) updateForm({ customerCode: row.custCode || "", customerName: row.custName || "" }); }} customParam="ActiveAll" />
      <SearchProjectPhase isOpen={lookup === "phase"} onClose={(row) => { setLookup(null); if (row) updateForm({ phaseCode: row.phaseCode || "", phaseName: row.phaseDesc || "", siteCode: "", siteName: "" }); }} />
      <SearchProjectReference isOpen={lookup === "activity"} onClose={(row) => { setLookup(null); if (row) updateForm({ activityCode: row.activityCode || "", activityName: row.activityDesc || "" }); }} title="Select Project Activity" rows={activities} codeKey="activityCode" nameKey="activityDesc" codeLabel="Activity Code" nameLabel="Activity Name" />
      <SearchProjectReference isOpen={lookup === "site"} onClose={(row) => { setLookup(null); if (row) updateForm({ siteCode: row.siteCode || "", siteName: row.siteDesc || "" }); }} title="Select Project Site" rows={activeSites} codeKey="siteCode" nameKey="siteDesc" codeLabel="Site Code" nameLabel="Site Name" />
      <SearchSalesRepRef isOpen={lookup === "salesRep"} onClose={(row) => { setLookup(null); if (row) updateForm({ representativeCode: row.salesRepCode || "", representativeName: row.salesRepName || "" }); }} />
      <SearchRCMast isOpen={lookup === "responsibilityCenter"} onClose={(row) => { setLookup(null); if (row) updateForm({ rcCode: row.rcCode || "", rcName: row.rcName || "" }); }} />

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col items-center justify-between gap-3 lg:flex-row">
          <div className="flex w-full flex-col items-center gap-2 lg:w-auto lg:flex-row lg:gap-4">
            <h1 className="global-ref-headertext-ui truncate">Project Master Data</h1>
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex flex-nowrap border-b border-blue-300 dark:border-gray-700">
                {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 whitespace-nowrap rounded-md border-b-2 px-3 py-1 text-[10px] font-bold transition-all sm:px-4 sm:py-2 sm:text-[13px] ${activeTab === tab.id ? "border-blue-700 bg-blue-50/50 text-blue-700" : "border-transparent text-gray-500 hover:text-blue-500"}`}><FontAwesomeIcon icon={tab.icon} className="mr-1.5" />{tab.label}</button>)}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-center gap-2 lg:w-auto lg:justify-end"><PermissionBadge permission={pagePermission} isReadOnly={isReadOnly} isFullAccess={isFullAccess} /><ButtonBar buttons={headerButtons} /></div>
        </div>
      </div>

      <div className="global-tran-tab-div-ui mt-36 sm:mt-32 md:mt-28 lg:mt-24" style={{ minHeight: "calc(100vh - 170px)" }}>
        {activeTab === "setup" && <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_320px]">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="mb-4 border-b pb-2 text-[13px] font-bold text-blue-700">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FieldRenderer label="Project Code" required value={form.projectCode} disabled={!isEditing || Boolean(form.projectId)} onChange={(value) => updateForm({ projectCode: String(value || "").toUpperCase() })} />
                <div className="md:col-span-1 xl:col-span-2"><FieldRenderer label="Project Name" required value={form.projectName} disabled={!isEditing} onChange={(value) => updateForm({ projectName: value })} /></div>
                <FieldRenderer label="Project Type" type="select" value={form.projectType} disabled={!isEditing} options={projectTypeOptions} onChange={(value) => updateForm({ projectType: value })} />
                <FieldRenderer label="Year" value={form.year} maxLength={4} disabled={!isEditing} onChange={(value) => updateForm({ year: String(value || "").replace(/\D/g, "").slice(0, 4) })} />
                <FieldRenderer label="Project Status" type="select" value={form.projectStatus} disabled={!isEditing} options={projectStatusOptions} onChange={(value) => updateForm({ projectStatus: value })} />
                <FieldRenderer label="Old Code" value={form.oldCode} disabled={!isEditing} onChange={(value) => updateForm({ oldCode: value })} />
                <FieldRenderer label="Sales Rep Code" type="lookup" value={form.representativeCode} disabled={!isEditing} onLookup={() => isEditing && setLookup("salesRep")} />
                <FieldRenderer label="Sales Rep Name" value={form.representativeName} readOnly disabled />
                <FieldRenderer label="Active Flag" type="select" value={form.active} disabled={!isEditing} options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]} onChange={(value) => updateForm({ active: value })} />
              </div>
            </div>
            <RegistrationInfo layout="stacked" data={{ registeredBy: form.userCode || "", registeredDate: form.dateStamp || "", lastUpdatedBy: form.userCode || "", lastUpdatedDate: form.timeStamp || "" }} />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="mb-4 border-b pb-2 text-[13px] font-bold text-blue-700">Project References</h3>
              <div className="space-y-4">
                <FieldRenderer label="Activity Code" type="lookup" value={form.activityCode} disabled={!isEditing} onLookup={() => isEditing && setLookup("activity")} />
                <FieldRenderer label="Activity Name" value={form.activityName} readOnly disabled />
                <FieldRenderer label="Customer Code" type="lookup" value={form.customerCode} disabled={!isEditing} onLookup={() => isEditing && setLookup("customer")} />
                <FieldRenderer label="Customer Name" value={form.customerName} readOnly disabled />
                <FieldRenderer label="Phase Code" type="lookup" value={form.phaseCode} disabled={!isEditing} onLookup={() => isEditing && setLookup("phase")} />
                <FieldRenderer label="Phase Name" value={form.phaseName} readOnly disabled />
                <FieldRenderer label="Site Code" type="lookup" value={form.siteCode} disabled={!isEditing || !form.phaseCode} onLookup={() => isEditing && form.phaseCode && setLookup("site")} />
                <FieldRenderer label="Site Name" value={form.siteName} readOnly disabled />
                <FieldRenderer label="Responsibility Center Code" type="lookup" value={form.rcCode} disabled={!isEditing} onLookup={() => isEditing && setLookup("responsibilityCenter")} />
                <FieldRenderer label="Responsibility Center Name" value={form.rcName} readOnly disabled />
              </div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="mb-4 border-b pb-2 text-[13px] font-bold text-blue-700">Project Dates and Amounts</h3>
              <div className="space-y-4">
                <FieldRenderer label="Start Date" type="date" value={form.startDate} disabled={!isEditing} onChange={(value) => updateForm({ startDate: value })} />
                <FieldRenderer label="End Date" type="date" value={form.endDate} disabled={!isEditing} onChange={(value) => updateForm({ endDate: value })} />
                {amountField("Contract Amount", "contractAmount", contractAmountRef, budgetAmountRef)}
                {amountField("Budget Amount", "budgetAmount", budgetAmountRef)}
              </div>
            </div>
          </div>
        </div>}

        {activeTab === "master" && <div className="global-tran-table-main-div-ui"><SearchGlobalReferenceTable key="project-master" docType="ProjectMaster" columns={tableColumns} data={projects} isLoading={projectsLoading} onRowDoubleClick={fillForm} itemsPerPage={100} autoFillGrid /></div>}
        {activeTab === "ref" && (
          <ProjectReferenceCodes
            ref={referenceRef}
            embedded
            isReadOnly={isReadOnly}
            canAdd={canAdd}
            canEdit={canEdit}
            canSave={canSave}
            canDelete={canDelete}
            onStateChange={setReferenceState}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectMaster;
