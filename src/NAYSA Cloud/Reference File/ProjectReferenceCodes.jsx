import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faChevronLeft,
  faChevronRight,
  faEdit,
  faFlag,
  faMapMarkerAlt,
  faPlus,
  faSave,
  faTrashAlt,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalDeleteConfirm,
  useSwalErrorAlert,
  useSwalErrorAlertAPI,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchProjectPhase from "@/NAYSA Cloud/Lookup/SearchProjectPhase.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";

const TABS = {
  activity: {
    title: "Project Activity",
    listEndpoint: "/projectActivity",
    saveEndpoint: "/upsertPRJActivityRef",
    deleteEndpoint: "/deletePRJActivityRef",
    checkDuplicateEndpoint: "/checkDuplicatePRJActivityRef",
    checkInUsedEndpoint: "/checkInUsedPRJActivityRef",
    queryKey: "projectActivityList",
    codeKey: "activityCode",
    descriptionKey: "activityDesc",
    codeLabel: "Activity Code",
    descriptionLabel: "Activity Name",
    configEndpoint: "ProjectActivity",
  },
  phase: {
    title: "Project Phase",
    listEndpoint: "/projectPhase",
    saveEndpoint: "/upsertPRJPhaseRef",
    deleteEndpoint: "/deletePRJPhaseRef",
    checkDuplicateEndpoint: "/checkDuplicatePRJPhaseRef",
    checkInUsedEndpoint: "/checkInUsedPRJPhaseRef",
    queryKey: "projectPhaseList",
    codeKey: "phaseCode",
    descriptionKey: "phaseDesc",
    codeLabel: "Phase Code",
    descriptionLabel: "Phase Name",
    configEndpoint: "ProjectPhase",
  },
  site: {
    title: "Project Site",
    listEndpoint: "/projectSite",
    saveEndpoint: "/upsertPRJSiteRef",
    deleteEndpoint: "/deletePRJSiteRef",
    checkDuplicateEndpoint: "/checkDuplicatePRJSiteRef",
    checkInUsedEndpoint: "/checkInUsedPRJSiteRef",
    queryKey: "projectSiteList",
    codeKey: "siteCode",
    descriptionKey: "siteDesc",
    codeLabel: "Site Code",
    descriptionLabel: "Site Name",
    configEndpoint: "ProjectSite",
  },
};

const EMPTY_FORM = {
  activityCode: "",
  activityDesc: "",
  phaseCode: "",
  phaseDesc: "",
  siteCode: "",
  siteDesc: "",
  active: "Y",
};

const EMPTY_REGISTRATION = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const parseResult = (response, fallback = []) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (!raw) return fallback;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return fallback;
  }
};

const parseCheckResult = (response) => String(response?.data?.data?.[0]?.result ?? "0") === "1";

const ProjectReferenceCodes = forwardRef(({
  embedded = false,
  isReadOnly: parentIsReadOnly,
  canAdd: parentCanAdd,
  canEdit: parentCanEdit,
  canSave: parentCanSave,
  canDelete: parentCanDelete,
  onStateChange,
}, ref) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const formTopRef = useRef(null);
  const [activeTab, setActiveTab] = useState("activity");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(EMPTY_REGISTRATION);
  const [selectedKey, setSelectedKey] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [phaseLookupOpen, setPhaseLookupOpen] = useState(false);
  const [collapseNav, setCollapseNav] = useState(false);
  const config = TABS[activeTab];

  const ownPermission =
    usePagePermission({
      componentKey: "ProjectReferenceCodes",
      menuName: "Project Reference Codes",
      debug: false,
    });
  const pagePermission = ownPermission.pagePermission;
  const isReadOnly = embedded && typeof parentIsReadOnly === "boolean"
    ? parentIsReadOnly
    : ownPermission.isReadOnly;
  const isFullAccess = embedded
    ? !isReadOnly
    : ownPermission.isFullAccess;
  const canAdd = embedded && typeof parentCanAdd === "boolean"
    ? parentCanAdd
    : ownPermission.canAdd;
  const canEdit = embedded && typeof parentCanEdit === "boolean"
    ? parentCanEdit
    : ownPermission.canEdit;
  const canSave = embedded && typeof parentCanSave === "boolean"
    ? parentCanSave
    : ownPermission.canSave;
  const canDelete = embedded && typeof parentCanDelete === "boolean"
    ? parentCanDelete
    : ownPermission.canDelete;

  const referenceTabs = [
    { key: "activity", label: "Activity Codes", icon: faBriefcase },
    { key: "phase", label: "Phase Codes", icon: faFlag },
    { key: "site", label: "Site Codes", icon: faMapMarkerAlt },
  ];

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: [TABS.activity.queryKey],
    queryFn: async () => parseResult(await apiClient.get(TABS.activity.listEndpoint)),
    staleTime: 0,
  });
  const { data: phases = [], isLoading: loadingPhases } = useQuery({
    queryKey: [TABS.phase.queryKey],
    queryFn: async () => parseResult(await apiClient.get(TABS.phase.listEndpoint)),
    staleTime: 0,
  });
  const { data: sites = [], isLoading: loadingSites } = useQuery({
    queryKey: [TABS.site.queryKey],
    queryFn: async () => parseResult(await apiClient.get(TABS.site.listEndpoint)),
    staleTime: 0,
  });

  const rows = useMemo(() => {
    if (activeTab === "activity") return activities;
    if (activeTab === "phase") return phases;

    const selectedPhase = String(formData.phaseCode || "").trim().toUpperCase();
    if (!selectedPhase) return [];

    return sites.filter(
      (row) => String(row.phaseCode || "").trim().toUpperCase() === selectedPhase
    );
  }, [activeTab, activities, formData.phaseCode, phases, sites]);
  const isListLoading = loadingActivities || loadingPhases || loadingSites;

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setRegistrationInfo(EMPTY_REGISTRATION);
    setSelectedKey("");
    setIsEditing(false);
  };

  const resetSiteFormKeepingPhase = () => {
    setFormData((current) => ({
      ...EMPTY_FORM,
      phaseCode: current.phaseCode || "",
      phaseDesc: current.phaseDesc || "",
    }));
    setRegistrationInfo(EMPTY_REGISTRATION);
    setSelectedKey("");
    setIsEditing(false);
  };

  useEffect(resetForm, [activeTab]);

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.post(config.saveEndpoint, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      useSwalSuccessAlert("Saved", `${config.title} saved successfully.`);
      if (activeTab === "site") resetSiteFormKeepingPhase();
      else resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const updateForm = (patch) => setFormData((current) => ({ ...current, ...patch }));

  const handleAdd = () => {
    if (isReadOnly || !canAdd) return;
    if (activeTab === "site") {
      setFormData((current) => ({
        ...EMPTY_FORM,
        phaseCode: current.phaseCode || "",
        phaseDesc: current.phaseDesc || "",
      }));
      setRegistrationInfo(EMPTY_REGISTRATION);
      setSelectedKey("");
    } else {
      resetForm();
    }
    setIsEditing(true);
    if (!embedded) {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleEdit = (row) => {
    if (isReadOnly || !canEdit) return;
    setFormData({ ...EMPTY_FORM, ...row });
    setSelectedKey(
      activeTab === "site"
        ? `${row.phaseCode || ""}|${row.siteCode || ""}`
        : row[config.codeKey] || ""
    );
    setRegistrationInfo({
      registeredBy: row.registeredBy || row.userCode || "",
      registeredDate: row.registeredDate || row.dateStamp || "",
      lastUpdatedBy: row.lastUpdatedBy || row.userCode || "",
      lastUpdatedDate: row.lastUpdatedDate || row.timeStamp || "",
    });
    setIsEditing(true);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSave = async () => {
    const code = String(formData[config.codeKey] || "").trim();
    const description = String(formData[config.descriptionKey] || "").trim();
    if (!code || !description || (activeTab === "site" && !formData.phaseCode)) {
      useSwalErrorAlert(
        "Required Fields",
        activeTab === "site"
          ? "Phase, Site Code, and Site Description are required."
          : `${config.codeLabel} and ${config.descriptionLabel} are required.`
      );
      return;
    }
    const payload = {
        ...formData,
        [config.codeKey]: code.toUpperCase(),
        [config.descriptionKey]: description,
        userCode: user?.USER_CODE || user?.userCode || "ADMIN",
    };
    if (!selectedKey) {
      try {
        const duplicate = parseCheckResult(await apiClient.post(config.checkDuplicateEndpoint, { json_data: payload }));
        if (duplicate) {
          useSwalErrorAlert("Duplicate Record", `${config.codeLabel} ${code.toUpperCase()} already exists.`);
          return;
        }
      } catch (error) {
        useSwalErrorAlertAPI("Validation Failed", error);
        return;
      }
    }
    saveMutation.mutate({ json_data: payload });
  };

  useImperativeHandle(ref, () => ({
    add: handleAdd,
    save: handleSave,
    reset: resetForm,
  }));

  useEffect(() => {
    onStateChange?.({ isEditing, canSave: isEditing && canSave && !saveMutation.isPending });
  }, [canSave, isEditing, onStateChange, saveMutation.isPending]);

  const handleDelete = async (row) => {
    const payload = {
      phaseCode: row.phaseCode || "",
      [config.codeKey]: row[config.codeKey],
      userCode: user?.USER_CODE || user?.userCode || "ADMIN",
    };
    try {
      const inUsed = parseCheckResult(await apiClient.post(config.checkInUsedEndpoint, { json_data: payload }));
      if (inUsed) {
        useSwalErrorAlert("Record In Use", `${config.title} ${row[config.codeKey]} is already in use and cannot be deleted.`);
        return;
      }
    } catch (error) {
      useSwalErrorAlertAPI("Validation Failed", error);
      return;
    }
    const confirmation = await useSwalDeleteConfirm(
      "Confirm Delete",
      `Delete ${config.title} ${row[config.codeKey]}?`
    );
    if (!confirmation?.isConfirmed) return;
    try {
      await apiClient.post(config.deleteEndpoint, {
        json_data: payload,
      });
      await queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      useSwalSuccessAlert("Deleted", `${config.title} was removed.`);
      if (activeTab === "site") resetSiteFormKeepingPhase();
      else resetForm();
    } catch (error) {
      useSwalErrorAlertAPI("Delete Failed", error);
    }
  };

  const columns = useMemo(() => {
    const action = {
      key: "__actions",
      label: "Actions",
      width: 80,
      render: (row) => (
        <div className="flex w-full justify-center gap-2">
          <button type="button" className="global-ref-td-button-edit-ui" onClick={() => handleEdit(row)} title="Edit">
            <FontAwesomeIcon icon={faEdit} />
          </button>
          {canDelete && (
            <button type="button" className="global-ref-td-button-delete-ui" onClick={() => handleDelete(row)} title="Delete">
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          )}
        </div>
      ),
    };
    const dataColumns = activeTab === "site"
      ? [
          { key: "siteCode", label: "Site Code", sortable: true, width: 120 },
          { key: "siteDesc", label: "Site Name", sortable: true, width: 520 },
        ]
      : [
          { key: config.codeKey, label: config.codeLabel, sortable: true, pinned: true, width: 180 },
          { key: config.descriptionKey, label: config.descriptionLabel, sortable: true, width: 480 },
        ];
    return [action, ...dataColumns, { key: "active", label: "Active", sortable: true, width: 80, render: (row) => row.active === "Y" ? "Yes" : "No" }];
  }, [activeTab, canDelete, config]);

  return (
    <div className={embedded ? "w-full" : "global-ref-main-div-ui"}>
      {(isListLoading || saveMutation.isPending) && <LoadingSpinner />}
      <SearchProjectPhase
        isOpen={phaseLookupOpen}
        onClose={(phase) => {
          setPhaseLookupOpen(false);
          if (phase) {
            updateForm({
              phaseCode: phase.phaseCode || "",
              phaseDesc: phase.phaseDesc || "",
              siteCode: "",
              siteDesc: "",
            });
            setSelectedKey("");
            setRegistrationInfo(EMPTY_REGISTRATION);
          }
        }}
      />

      {!embedded && <div className="global-ref-header-ui">
        <div className="flex w-full flex-col items-center md:grid md:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-3">
            <h1 className="global-ref-headertext-ui">Project Reference Codes</h1>
            <PermissionBadge permission={pagePermission} isReadOnly={isReadOnly} isFullAccess={isFullAccess} />
          </div>
          <div className="flex w-full justify-center md:w-auto">
            <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
              {Object.entries(TABS).map(([key, tab]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2 rounded-md ${
                    activeTab === key
                      ? "border-blue-700 text-blue-700 bg-blue-50/50"
                      : "border-transparent text-gray-500 hover:text-blue-500"
                  }`}
                >
                  {tab.title.replace("Project ", "")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <ButtonBar buttons={[
              { key: "add", label: <span className="ml-1">Add</span>, icon: faPlus, onClick: handleAdd, disabled: isReadOnly },
              { key: "save", label: <span className="ml-1">Save</span>, icon: faSave, onClick: handleSave, disabled: !isEditing || !canSave || saveMutation.isPending },
              { key: "reset", label: <span className="ml-1">Reset</span>, icon: faUndo, onClick: resetForm },
            ]} />
          </div>
        </div>
      </div>}

      <div className={embedded ? "flex flex-col items-start gap-3 lg:flex-row" : ""}>
        {embedded && (
          <div className={`w-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out lg:w-auto ${collapseNav ? "lg:w-14" : "lg:w-80"}`}>
            <div className="global-tran-textbox-group-div-ui self-start !h-fit">
              <div className="mb-2 flex items-center justify-between">
                {!collapseNav && <div className="text-sm font-bold text-gray-800">Reference Codes</div>}
                <button
                  type="button"
                  onClick={() => setCollapseNav((current) => !current)}
                  className="flex h-8 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-200"
                  title={collapseNav ? "Expand" : "Collapse"}
                >
                  <FontAwesomeIcon icon={collapseNav ? faChevronRight : faChevronLeft} />
                </button>
              </div>
              <div className={`flex flex-col gap-2 ${collapseNav ? "items-center" : ""}`}>
                {referenceTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors duration-200 md:text-sm ${
                      activeTab === tab.key
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"
                    } ${collapseNav ? "w-10 justify-center px-2" : "w-full"}`}
                    title={collapseNav ? tab.label : undefined}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                    {!collapseNav && <span className="whitespace-nowrap">{tab.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={`${embedded ? "grid min-w-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-12" : ""}`}>
      <div ref={formTopRef} className={`${embedded ? "xl:col-span-4" : "mt-24 flex flex-col gap-2 lg:flex-row"}`}>
        <div className={embedded ? "global-tran-textbox-group-div-ui self-start !h-fit" : "flex-1 rounded-xl border bg-white p-6 shadow-lg dark:bg-gray-800"}>
          <h3 className={embedded ? "mb-3 text-sm font-bold text-gray-800" : "mb-4 border-b pb-2 text-[13px] font-bold uppercase tracking-wide text-gray-600"}>
            {activeTab === "activity" ? "Activity Information" : activeTab === "phase" ? "Phase Information" : "Site Information"}
          </h3>
          <div className={`grid grid-cols-1 ${embedded ? "gap-4" : "gap-6 md:grid-cols-2"}`}>
            {activeTab === "site" ? (
              <>
                <div className={embedded ? "space-y-4" : "space-y-6"}>
                  <FieldRenderer
                    label="Phase Code"
                    required
                    type="lookup"
                    value={formData.phaseCode}
                    onLookup={() => setPhaseLookupOpen(true)}
                    disabled={false}
                  />
                  <FieldRenderer label="Phase Name" value={formData.phaseDesc} readOnly disabled />
                </div>
                <div className={embedded ? "space-y-4" : "space-y-6"}>
                  <FieldRenderer label={config.codeLabel} required value={formData[config.codeKey]} disabled={!isEditing || Boolean(selectedKey)} onChange={(value) => updateForm({ [config.codeKey]: value.toUpperCase() })} />
                  <FieldRenderer label={config.descriptionLabel} required value={formData[config.descriptionKey]} disabled={!isEditing} onChange={(value) => updateForm({ [config.descriptionKey]: value })} />
                  <FieldRenderer label="Active Flag" type="select" value={formData.active} disabled={!isEditing} options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]} onChange={(value) => updateForm({ active: value })} />
                </div>
              </>
            ) : (
              <>
                <div className={embedded ? "space-y-4" : "space-y-6"}>
                  <FieldRenderer label={config.codeLabel} required value={formData[config.codeKey]} disabled={!isEditing || Boolean(selectedKey)} onChange={(value) => updateForm({ [config.codeKey]: value.toUpperCase() })} />
                  <FieldRenderer label={config.descriptionLabel} required value={formData[config.descriptionKey]} disabled={!isEditing} onChange={(value) => updateForm({ [config.descriptionKey]: value })} />
                </div>
                <div>
                  <FieldRenderer label="Active Flag" type="select" value={formData.active} disabled={!isEditing} options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]} onChange={(value) => updateForm({ active: value })} />
                </div>
              </>
            )}
          </div>
          {embedded && <div className="mt-4"><RegistrationInfo layout="stacked" data={registrationInfo} /></div>}
        </div>
        {!embedded && <div className="w-full lg:w-[320px]"><RegistrationInfo layout="stacked" data={registrationInfo} /></div>}
      </div>

      <div className={`min-w-0 ${embedded ? "xl:col-span-8" : "mt-4"}`}>
        <SearchGlobalReferenceTable key={activeTab} docType={config.configEndpoint} columns={columns} data={rows} onRowDoubleClick={handleEdit} itemsPerPage={embedded ? 10 : 100} initialState={embedded ? { itemsPerPage: 10 } : undefined} isLoading={isListLoading} onRefresh={() => queryClient.invalidateQueries({ queryKey: [config.queryKey] })} autoFillGrid />
      </div>
        </div>
      </div>
    </div>
  );
});

ProjectReferenceCodes.displayName = "ProjectReferenceCodes";
ProjectReferenceCodes.propTypes = {
  embedded: PropTypes.bool,
  isReadOnly: PropTypes.bool,
  canAdd: PropTypes.bool,
  canEdit: PropTypes.bool,
  canSave: PropTypes.bool,
  canDelete: PropTypes.bool,
  onStateChange: PropTypes.func,
};

export default ProjectReferenceCodes;
