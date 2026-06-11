// src/NAYSA Cloud/Master Data/FAMasterData/FAMast.jsx

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFolderOpen,
    faList,
    faTags,
    faPlus,
    faSave,
    faUndo,
    faPenToSquare,
    faTrash,
    faTable,
    faChartLine,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import FAMast_SetupTab from "@/NAYSA Cloud/Master Data/FAMasterData/FAMast_SetupTab.jsx";
import FAMast_DataTab from "@/NAYSA Cloud/Master Data/FAMasterData/FAMast_DataTab.jsx";
import FAMast_FinancialInfoTab from "@/NAYSA Cloud/Master Data/FAMasterData/FAMast_FinancialInfoTab.jsx";
import FAMast_ReferenceCodeTab from "@/NAYSA Cloud/Master Data/FAMasterData/FAMast_ReferenceCodeTab.jsx";

import {
    useSwalErrorAlert,
    useSwalSuccessAlert,
    useSwalErrorAlertAPI,
    useSwalDeleteConfirm,
    useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";

// ─────────────────────────────────────────────────────────────────────────────
//  Empty form — mirrors fa_mast columns exactly (camelCase aliases from sproc)
// ─────────────────────────────────────────────────────────────────────────────
const emptyForm = {
    // identity
    faCode:             "",         // fa_code
    faName:             "",         // fa_name

    // classification
    categCode:          "", categName:    "",   // categ_code
    classCode:          "", className:   "",    // class_code

    // location / branch
    flocCode:           "", flocName:    "",    // floc_code
    branchCode:         "", branchName:  "",    // branch_code

    // acquisition references
    farrId:             "",         // farr_id
    farrNo:             "",         // farr_no
    groupId:            "",         // group_id
    serialGroupId:      "",         // serial_group_id
    poId:               "",         // po_id
    poNo:               "",         // po_no
    vendCode:           "", vendName: "",       // vend_code / vend_name
    rrNo:               "",         // rr_no

    // identifiers
    serialNo:           "",         // serial_no
    modelNo:            "",         // model_no
    barCode:            "",         // bar_code
    tagNo:              "",         // tag_no
    oldCode:            "",         // old_code

    // assignment
    rcCode:             "", rcName:  "",        // rc_code
    empNo:              "", empName: "",        // emp_no / emp_name

    // description
    faSpecs:            "",         // fa_specs
    refNo1:             "",         // ref_no1
    refNo2:             "",         // ref_no2

    // status / cutoff
    faStatus:           "A",        // fa_status  (A=Active, D=Disposed, M=?)
    cutoffCode:         "",         // cutoff_code
    gcutoffCode:        "",         // gcutoff_code
    tranMode:           "S",        // tran_mode

    // acquisition cost
    acqDate:            "",         // acq_date
    currCode:           "PHP",      // curr_code
    currRate:           "1.000000", // curr_rate
    eul:                "0",        // eul  (estimated useful life in years)
    rul:                "0",        // rul  (remaining useful life)
    dcutoffCode:        "",         // dcutoff_code

    acqCost:            "0.00",     // acq_cost
    acqCostFx1:         "0.00",     // acq_cost_fx1
    acqCostFx2:         "0.00",     // acq_cost_fx2

    // depreciation
    accumDepr:          "0.00",     // accum_depr
    accumDeprFx1:       "0.00",     // accum_depr_fx1
    accumDeprFx2:       "0.00",     // accum_depr_fx2
    deprMonth:          "0.00",     // depr_month
    deprMonthFx1:       "0.00",     // depr_month_fx1
    deprMonthFx2:       "0.00",     // depr_month_fx2

    // net book value
    nbValue:            "0.00",     // nb_value
    nbValueFx1:         "0.00",     // nb_value_fx1
    nbValueFx2:         "0.00",     // nb_value_fx2

    // salvage (read-only — managed by depreciation transactions, not set here)
    salvageValue:       "0.00",     // salvage_value

    // warranty
    warrantyStartDate:  "",         // warranty_start_date
    warrantyExpiryDate: "",         // warranty_expiry_date
    warrantyMonths:     "0",        // warranty_months
    warrantyNotes:      "",         // warranty_notes

    // lock info (read-only, set by transactions)
    lockedTranCode:     "",         // locked_tran_code
    lockedTranId:       "",         // locked_tran_id
    lockedTranNo:       "",         // locked_tran_no
    lockedTranDate:     "",         // locked_tran_date
    lockedBy:           "",         // locked_by
    lockedDate:         "",         // locked_date

    // audit
    registeredBy:       "", registeredDate: "",
    lastUpdatedBy:      "", lastUpdatedDate: "",

    __isNew: false,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
const FAMast = () => {
    const [activeTab, setActiveTab]   = useState("setup");
    const [activeMasterDataTab, setActiveMasterDataTab] = useState("assetMaster");
    const [isLoading, setIsLoading]   = useState(false);
    const generationMode              = "Auto";     // fa_code + tag_no are system-generated on save

    const { user } = useAuth();
    const userCode = user?.USER_CODE || user?.userCode || user?.code || "";

    const [form, setForm]                         = useState({ ...emptyForm });
    const [selectedFaCode, setSelectedFaCode]     = useState("");
    const [isEditing, setIsEditing]               = useState(false);

    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows]       = useState([]);
    const [financialAllRows, setFinancialAllRows] = useState([]);
    const [financialRows, setFinancialRows]       = useState([]);

    // Reference Tab
    const refTabRef               = useRef(null);
    const [refState, setRefState] = useState({ isEditing: false, canSave: false, activeRefTab: "category" });

    // Page permissions
    const { pagePermission, isReadOnly, isFullAccess, canAdd, canEdit, canSave, canDelete } =
        usePagePermission("FAMast");

    // ── init ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        loadMasterList();
    }, []);

    useEffect(() => {
        if (activeTab === "master" && activeMasterDataTab === "financialInfo" && financialAllRows.length === 0) {
            loadFinancialInfoList();
        }
    }, [activeTab, activeMasterDataTab]);

    // ── helpers ──────────────────────────────────────────────────────────────
    const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const parseSprocJsonResult = (rows) => {
        if (!rows) return [];
        const r = rows?.[0]?.result;
        if (typeof r === "string") {
            try { return JSON.parse(r); } catch { return []; }
        }
        if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") return rows;
        return [];
    };

    // ── load master list ──────────────────────────────────────────────────────
    const loadMasterList = async (filters = {}) => {
        setIsLoading(true);
        try {
            const { search, searchMode } = filters || {};
            const res  = await apiClient.get("/faMast", {
                params: {
                    search: search || undefined,
                    searchMode: searchMode || undefined,
                },
            });
            const list = parseSprocJsonResult(res?.data?.data);
            setMasterAllRows(list);
            setMasterRows(list);
        } catch {
            setMasterAllRows([]);
            setMasterRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ── load fixed asset financial information list ───────────────────────────
    const loadFinancialInfoList = async (filters = {}) => {
        setIsLoading(true);
        try {
            const { search, searchMode } = filters || {};

            // Preferred route: create this route/controller endpoint for @mode = 'FinancialInfo'.
            // Fallback keeps the UI usable if your controller accepts mode in /faMast.
            let res;
            try {
                res = await apiClient.get("/faMastFinancialInfo", {
                    params: {
                        search: search || undefined,
                        searchMode: searchMode || undefined,
                    },
                });
            } catch (firstError) {
                res = await apiClient.get("/faMast", {
                    params: {
                        mode: "FinancialInfo",
                        search: search || undefined,
                        searchMode: searchMode || undefined,
                    },
                });
            }

            const list = parseSprocJsonResult(res?.data?.data);
            setFinancialAllRows(list);
            setFinancialRows(list);
        } catch (e) {
            console.error("Failed to load Fixed Asset Financial Information", e);
            setFinancialAllRows([]);
            setFinancialRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ── fetch single record ───────────────────────────────────────────────────
    const fetchItemByCode = async (faCode, enterEditMode = false) => {
        const code = String(faCode || "").trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const res    = await apiClient.post("/getFAMast", { FA_CODE: code });
            const parsed = parseSprocJsonResult(res?.data?.data);
            const row    = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                await useSwalErrorAlert("Info", "Asset not found.");
                return;
            }

            updateForm({ ...emptyForm, __isNew: false, ...row, faCode: code });
            setSelectedFaCode(code);
            if (enterEditMode) setIsEditing(true);
        } catch {
            await useSwalErrorAlertAPI("Fetch Error", "Failed to fetch asset.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── duplicate check ───────────────────────────────────────────────────────
    const checkDuplicate = async (faCode) => {
        const code = String(faCode || "").trim();
        if (!code) return false;

        try {
            const res  = await apiClient.post("/checkFAMastDuplicate", {
                json_data: { faCode: code },
            });
            const row   = res?.data?.data?.[0];
            const isDup = String(row?.result ?? "0") === "1";
            if (isDup) {
                await useSwalErrorAlert("Duplicate", `FA Code "${code}" already exists.`);
                updateForm({ faCode: "" });
                return true;
            }
        } catch (e) {
            console.error("CheckDuplicate failed", e);
        }
        return false;
    };

    // ── in-use check ──────────────────────────────────────────────────────────
    const checkInUsed = async (faCode) => {
        const code = String(faCode || "").trim();
        if (!code) return false;

        try {
            const res   = await apiClient.post("/checkFAMastInUsed", {
                json_data: { faCode: code },
            });
            const row    = res?.data?.data?.[0];
            const isUsed =
                String(row?.result ?? row?.isInUsed ?? row?.isinused ?? "0") === "1" ||
                Number(row?.isInUsed ?? row?.isinused ?? row?.inusedcount ?? 0) > 0;

            if (isUsed) {
                await useSwalErrorAlert(
                    "Cannot Delete",
                    `FA Code "${code}" is currently in use and cannot be deleted.`
                );
                return true;
            }
        } catch (e) {
            console.error("CheckInUsed failed", e);
        }
        return false;
    };

    // ── delete ────────────────────────────────────────────────────────────────
    const deleteItem = async () => {
        if (!canDelete) {
            await useSwalErrorAlert("Read Only", "You are not allowed to delete records.");
            return;
        }

        const code = String(form?.faCode || "").trim();
        if (!code) return;

        const inUse = await checkInUsed(code);
        if (inUse) return;

        const confirm = await useSwalDeleteConfirm("Delete Asset?", `Delete FA Code "${code}"?`);
        if (!confirm?.isConfirmed) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/deleteFAMast", {
                json_data: { faCode: code, userCode },
            });

            const sqlRow = res?.data?.data?.[0];
            if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
                await useSwalErrorAlert("Delete Failed", sqlRow?.errormsg || sqlRow?.errorMsg);
                return;
            }

            await useSwalDeleteRecord("Deleted", `FA Code "${code}" removed.`);
            handleResetSetup();
            await loadMasterList();
        } catch (e) {
            await useSwalErrorAlert("Delete Failed", e?.message || "Failed to delete asset.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── upsert ────────────────────────────────────────────────────────────────
    const upsertItem = async () => {
        if (!canSave) {
            await useSwalErrorAlert("Read Only", "You are not allowed to save changes.");
            return;
        }

        // For system-generated mode the code is empty on new records — the sproc
        // will pull the next number from fa_no and return it as generatedCode.
        const code = String(form?.faCode || "").trim();

        setIsLoading(true);
        try {
            const payload = {
                json_data: JSON.stringify({
                    json_data: {
                    faCode:             code || null,   // null on new → server generates
                    faName:             form.faName              || null,
                    categCode:          form.categCode           || null,
                    classCode:          form.classCode           || null,
                    flocCode:           form.flocCode            || null,
                    branchCode:         form.branchCode          || null,
                    farrId:             form.farrId              || null,
                    farrNo:             form.farrNo              || null,
                    groupId:            form.groupId             || null,
                    serialGroupId:      form.serialGroupId       || null,
                    poId:               form.poId                || null,
                    poNo:               form.poNo                || null,
                    vendCode:           form.vendCode            || null,
                    vendName:           form.vendName            || null,
                    serialNo:           form.serialNo            || null,
                    modelNo:            form.modelNo             || null,
                    barCode:            form.barCode             || null,
                    tagNo:              form.tagNo               || null,
                    oldCode:            form.oldCode             || null,
                    rrNo:               form.rrNo                || null,
                    rcCode:             form.rcCode              || null,
                    empNo:              form.empNo               || null,
                    empName:            form.empName             || null,
                    faSpecs:            form.faSpecs             || null,
                    refNo1:             form.refNo1              || null,
                    refNo2:             form.refNo2              || null,
                    faStatus:           form.faStatus            || "A",
                    cutoffCode:         form.cutoffCode          || null,
                    gcutoffCode:        form.gcutoffCode         || null,
                    tranMode:           form.tranMode            || "S",
                    acqDate:            form.acqDate             || null,
                    currCode:           form.currCode            || "PHP",
                    currRate:           form.currRate            || "1.000000",
                    eul:                form.eul                 || null,
                    rul:                form.rul                 || null,
                    dcutoffCode:        form.dcutoffCode         || null,
                    acqCost:            form.acqCost             || null,
                    acqCostFx1:         form.acqCostFx1          || null,
                    acqCostFx2:         form.acqCostFx2          || null,
                    accumDepr:          form.accumDepr           || null,
                    accumDeprFx1:       form.accumDeprFx1        || null,
                    accumDeprFx2:       form.accumDeprFx2        || null,
                    deprMonth:          form.deprMonth           || null,
                    deprMonthFx1:       form.deprMonthFx1        || null,
                    deprMonthFx2:       form.deprMonthFx2        || null,
                    nbValue:            form.nbValue             || null,
                    nbValueFx1:         form.nbValueFx1          || null,
                    nbValueFx2:         form.nbValueFx2          || null,
                    warrantyStartDate:  form.warrantyStartDate   || null,
                    warrantyExpiryDate: form.warrantyExpiryDate  || null,
                    warrantyMonths:     form.warrantyMonths      || null,
                    warrantyNotes:      form.warrantyNotes       || null,
                    userCode:           userCode                 || null,
                    },
                }),
            };

            const res = await apiClient.post("/upsertFAMast", payload);

            // FIX 2: check top-level success flag from the PHP controller first,
            // then fall through to the sproc-level errorcount check.
            if (!res?.data?.success) {
                const msg =
                    res?.data?.errormsg ||
                    res?.data?.message  ||
                    res?.data?.data?.[0]?.errormsg ||
                    "Validation error.";
                await useSwalErrorAlert("Validation Failed", msg);
                return;
            }

            const sqlRow = res?.data?.data?.[0];
            if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
                await useSwalErrorAlert("Validation Failed", sqlRow?.errormsg || sqlRow?.errorMsg);
                return;
            }

            // On new records the sproc returns the system-generated fa_code
            const finalCode = sqlRow?.generatedCode || sqlRow?.generatedcode || code;

            await useSwalSuccessAlert("Success!", "Asset saved successfully.");
            setSelectedFaCode(finalCode);
            setIsEditing(false);
            await loadMasterList();
            await fetchItemByCode(finalCode);

        } catch (e) {
            // FIX 3: surface the real error message instead of swallowing it.
            const msg =
                e?.response?.data?.message ||
                e?.response?.data?.errormsg ||
                e?.message ||
                "Failed to save asset.";
            await useSwalErrorAlertAPI("Save Failed", msg);
        } finally {
            setIsLoading(false);
        }
    };

    // ── toolbar handlers ──────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!canAdd) {
            await useSwalErrorAlert("Read Only", "You only have read access.");
            return;
        }
        setSelectedFaCode("");
        setForm({ ...emptyForm, __isNew: true });
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleEdit = async () => {
        if (!canEdit) {
            await useSwalErrorAlert("Read Only", "You are not allowed to edit records.");
            return;
        }
        if (!form?.faCode) {
            await useSwalErrorAlert("Required", "Select an asset first.");
            return;
        }
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleResetSetup = () => {
        setSelectedFaCode("");
        setForm({ ...emptyForm });
        setIsEditing(false);
    };

    const normalizeFinancialRowToSetup = (row = {}) => ({
        ...row,
        flocName: row.flocName || row.locName || "",
        accumDepr: row.accumDepr ?? row.accumulatedDepreciation ?? "0.00",
        deprMonth: row.deprMonth ?? row.depr_month ?? "0.00",
        __isNew: false,
    });

    // ── tabs ──────────────────────────────────────────────────────────────────
    const tabs = [
        { id: "setup",  label: "Asset Masterfile Set Up", icon: faFolderOpen },
        { id: "master", label: "Asset Master Data",        icon: faList       },
        { id: "ref",    label: "Reference Codes",          icon: faTags       },
    ];

    const masterDataTabs = [
        { id: "assetMaster",   label: "Fixed Asset Master Data",            icon: faTable },
        { id: "financialInfo", label: "Fixed Asset Financial Information",  icon: faChartLine },
    ];

    // ── header buttons ────────────────────────────────────────────────────────
    const headerButtons = useMemo(() => {
        const baseBtn = "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all shadow-sm text-white";

        if (activeTab === "setup") {
            const hasRecord = String(form?.faCode || "").trim() && !form.__isNew;

            return [
                {
                    key: "add",
                    label: <span className="hidden sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: handleAdd,
                    disabled: isLoading || !canAdd,
                    className: `${baseBtn} ${!canAdd ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "save",
                    label: <span className="hidden sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: upsertItem,
                    disabled: isLoading || !isEditing || !canSave,
                    className: `${baseBtn} ${!isEditing || !canSave ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "reset",
                    label: <span className="hidden sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: handleResetSetup,
                    disabled: isLoading,
                    className: `${baseBtn} bg-blue-600 hover:bg-blue-700`,
                },
                {
                    key: "edit",
                    label: <span className="hidden sm:inline ml-1">Edit</span>,
                    icon: faPenToSquare,
                    onClick: handleEdit,
                    disabled: isLoading || isEditing || !hasRecord || !canEdit,
                    className: `${baseBtn} ${isEditing || !hasRecord || !canEdit ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "delete",
                    label: <span className="hidden sm:inline ml-1">Delete</span>,
                    icon: faTrash,
                    onClick: deleteItem,
                    disabled: isLoading || isEditing || !hasRecord || !canDelete,
                    className: `${baseBtn} ${isEditing || !hasRecord || !canDelete ? "bg-red-400 cursor-not-allowed opacity-50" : "bg-red-500 hover:bg-red-600"}`,
                },
            ];
        }

        if (activeTab === "ref") {
            return [
                {
                    key: "add",
                    label: <span className="hidden sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: async () => {
                        if (isReadOnly) {
                            await useSwalErrorAlert("Read Only", "You only have read access.");
                            return;
                        }
                        refTabRef.current?.add?.();
                    },
                    disabled: !canAdd,
                    className: `${baseBtn} ${!canAdd ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "save",
                    label: <span className="hidden sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: async () => {
                        if (isReadOnly) {
                            await useSwalErrorAlert("Read Only", "You are not allowed to save changes.");
                            return;
                        }
                        refTabRef.current?.save?.();
                    },
                    disabled: !refState.canSave || !canSave,
                    className: `${baseBtn} ${!refState.canSave || !canSave ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "reset",
                    label: <span className="hidden sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: () => refTabRef.current?.reset?.(),
                    className: `${baseBtn} bg-blue-600 hover:bg-blue-700`,
                },
            ];
        }

        return [];
    }, [activeTab, isLoading, isEditing, form, refState, isReadOnly, canAdd, canEdit, canSave, canDelete]);

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="global-ref-main-div-ui">
            <div className="global-ref-header-ui">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">

                    {/* LEFT: title + tabs */}
                    <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
                        <div className="flex-shrink-0 text-center lg:text-left">
                            <h1 className="global-ref-headertext-ui truncate">Fixed Asset Master Data</h1>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <div className="flex flex-nowrap border-b border-blue-300">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`shrink-0 px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold border-b-2 rounded-md ${
                                            activeTab === tab.id
                                                ? "border-blue-700 text-blue-700 bg-blue-50"
                                                : "border-transparent text-gray-500 hover:text-blue-500"
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={tab.icon} className="mr-1.5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: permission badge + buttons */}
                    <div className="flex-shrink-0 w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
                        <PermissionBadge
                            permission={pagePermission}
                            isReadOnly={isReadOnly}
                            isFullAccess={isFullAccess}
                        />
                        {!!headerButtons.length && <ButtonBar buttons={headerButtons} />}
                    </div>
                </div>
            </div>

            <div className="global-tran-tab-div-ui mt-36 sm:mt-32 md:mt-28 lg:mt-24" style={{ minHeight: "calc(100vh - 170px)" }}>

                {activeTab === "setup" && (
                    <FAMast_SetupTab
                        form={form}
                        isEditing={isEditing && isFullAccess}
                        isReadOnly={isReadOnly}
                        isLoading={isLoading}
                        generationMode={generationMode}
                        onChangeForm={updateForm}
                        onLookupSelect={(faCode) => fetchItemByCode(faCode, false)}
                        onBlurFaCode={isReadOnly ? undefined : checkDuplicate}
                    />
                )}

                {activeTab === "master" && (
                    <div className="flex flex-col h-full gap-3">
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                            {masterDataTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveMasterDataTab(tab.id)}
                                    className={`px-3 py-2 text-[11px] sm:text-[13px] font-bold rounded-md border transition-all ${
                                        activeMasterDataTab === tab.id
                                            ? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
                                            : "bg-white text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-200"
                                    }`}
                                >
                                    <FontAwesomeIcon icon={tab.icon} className="mr-1.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {activeMasterDataTab === "assetMaster" && (
                            <FAMast_DataTab
                                rows={masterRows}
                                isLoading={isLoading}
                                onFilter={loadMasterList}
                                onReset={loadMasterList}
                                userCode={userCode}
                                onRowDoubleClick={async (row) => {
                                    await fetchItemByCode(row.faCode, canEdit);
                                    setActiveTab("setup");
                                }}
                            />
                        )}

                        {activeMasterDataTab === "financialInfo" && (
                            <FAMast_FinancialInfoTab
                                data={financialRows}
                                loading={isLoading}
                                onRefresh={loadFinancialInfoList}
                                onRowDoubleClick={async (row) => {
                                    const code = String(row?.faCode || "").trim();
                                    if (!code) return;

                                    // Immediately place the selected financial info in SetupTab,
                                    // then refresh from Get mode to keep all Setup fields complete.
                                    updateForm({
                                        ...emptyForm,
                                        ...normalizeFinancialRowToSetup(row),
                                        faCode: code,
                                    });
                                    setSelectedFaCode(code);

                                    await fetchItemByCode(code, canEdit);
                                    setActiveTab("setup");
                                }}
                            />
                        )}
                    </div>
                )}

                {activeTab === "ref" && (
                    <FAMast_ReferenceCodeTab
                        ref={refTabRef}
                        onStateChange={setRefState}
                        isReadOnly={isReadOnly}
                        canAdd={canAdd}
                        canEdit={canEdit}
                        canSave={canSave}
                        canDelete={canDelete}
                    />
                )}

            </div>
        </div>
    );
};

export default FAMast;