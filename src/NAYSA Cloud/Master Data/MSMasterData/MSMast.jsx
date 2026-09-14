// src/NAYSA Cloud/Reference File/MSMast.jsx
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
    faPaperclip,
    faTrash,
    faDownload,
    faFileImport,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import SearchAttachment from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import MSMast_SetupTab from "@/NAYSA Cloud/Master Data/MSMasterData/MSMast_Setuptab.jsx";
import MSMast_DataTab from "@/NAYSA Cloud/Master Data/MSMasterData/MSMast_DataTab.jsx";
import MSMast_ReferenceCodeTab from "@/NAYSA Cloud/Master Data/MSMasterData/MSMast_ReferenceCodeTab.jsx";

import {
    useSwalErrorAlert,
    useSwalSuccessAlert,
    useSwalErrorAlertAPI,
    useSwalDeleteConfirm,
    useSwalDeleteRecord
} from "@/NAYSA Cloud/Global/behavior.jsx";

const emptyForm = {
    itemCode: "",
    itemDesc: "",
    uom: "", uomName: "",
    uom2: "",
    qtyPerUom2: "1.000",
    categoryCode: "", categoryName: "",
    classCode: "", className: "",
    active: "Y",
    status: "New",
    subClass1Code: "", subClass1Name: "",
    subClass2Code: "", subClass2Name: "",
    subClass3Code: "", subClass3Name: "",
    vacant01: "0.00", vacant02: "0.00", vacant03: "0.00",
    vacant04: "0.00", vacant05: "0.00", vacant06: "0.00",
    vacant07: "", vacant08: "", vacant09: "",
    vacant10: "", vacant11: "", vacant12: "",
    reOrderLevel: "0.000",
    stdPoPrice: "0.000000",
    lastPurDate: "",
    lastPurPrice: "0.000000",
    allowOverRec: "N",
    qtyOnHand: "0.000",
    unitCost: "0.000000",
    registeredBy: "", registeredDate: "",
    updatedBy: "", updatedDate: "",
    __isNew: false,
};

const MSMast = () => {
    const [activeTab, setActiveTab] = useState("setup");
    const [isLoading, setIsLoading] = useState(false);
    const [generationMode, setGenerationMode] = useState("Manual");

    const { user } = useAuth();
    const userCode = user?.USER_CODE || user?.userCode || user?.code || "";

    const {
        pagePermission,
        isReadOnly,
        isFullAccess,
        canAdd,
        canEdit,
        canSave,
        canDelete,
    } = usePagePermission({
        componentKey: "MSMast",
        debug: true, // change to false after testing
    });

    const [form, setForm] = useState({ ...emptyForm });
    const [selectedItemCode, setSelectedItemCode] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isAttachOpen, setIsAttachOpen] = useState(false);

    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows] = useState([]);

    // Reference Tab State
    const refTabRef = useRef(null);
    const [refState, setRefState] = useState({ isEditing: false, canSave: false, activeRefTab: "category" });

    useEffect(() => {
        loadMasterList();
        loadGenerationMode();
    }, []);

    const updateForm = (patch) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const parseSprocJsonResult = (rows) => {
        if (!rows) return [];
        const r = rows?.[0]?.result;
        if (typeof r === "string") {
            try { return JSON.parse(r); } catch { return []; }
        }
        if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") return rows;
        return [];
    };

    const loadGenerationMode = async () => {
        try {
            const res = await apiClient.get("/MSMastGenerationMode");

            const row =
                res?.data?.data?.[0] ||
                res?.data?.[0] ||
                res?.data ||
                {};

            const rawMode =
                row?.generationMode ||
                row?.generationmode ||
                row?.DOC_SERIES ||
                row?.docSeries ||
                "Manual";

            const mode = String(rawMode).trim().toUpperCase();

            if (mode === "SYSTEM") {
                setGenerationMode("System");
            } else if (mode === "AUTO") {
                setGenerationMode("Auto");
            } else {
                setGenerationMode("Manual");
            }
        } catch (e) {
            console.error("Failed to load MS generation mode:", e);
            setGenerationMode("Manual");
        }
    };

    const loadMasterList = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get("/MSMast");
            const list = parseSprocJsonResult(res?.data?.data);
            setMasterAllRows(list);
            setMasterRows(list);
        } catch (e) {
            setMasterAllRows([]);
            setMasterRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchItemByCode = async (itemCode, enterEditMode = false) => {
        const code = String(itemCode || "").trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/getMSMast", { ITEM_CODE: code });
            const parsed = parseSprocJsonResult(res?.data?.data);
            const row = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                await useSwalErrorAlert("Info", "Item not found.");
                return;
            }

            updateForm({
                ...emptyForm,
                __isNew: false,
                ...row,
                itemCode: code,
            });

            setSelectedItemCode(code);
            if (enterEditMode) setIsEditing(true);
        } catch (e) {
            await useSwalErrorAlertAPI("Fetch Error", "Failed to fetch item.");
        } finally {
            setIsLoading(false);
        }
    };

    const checkDuplicate = async (itemCode) => {
    const code = String(itemCode || "").trim();
    if (!code) return false;          // ← only skip if empty

    try {
        const res = await apiClient.post("/checkDuplicateMSMast", {
            json_data: { itemCode: code },
        });
        const row = res?.data?.data?.[0];
        const isDup = String(row?.result ?? "0") === "1";
        if (isDup) {
            await useSwalErrorAlert("Duplicate", `Item No "${code}" already exists.`);
            updateForm({ itemCode: "" });
            return true;
        }
    } catch (e) {
        console.error("CheckDuplicate failed", e);
    }
    return false;
};

    // ── Check In Used ─────────────────────────────────────────────────────────
    // Calls sproc CheckInUsed mode. Returns true if item is referenced in transactions.
    // Response: { result: "1" } = in use, { result: "0" } = safe to delete.
    const checkInUsed = async (itemCode) => {
        const code = String(itemCode || "").trim();
        if (!code) return false;

        try {
            const res = await apiClient.post("/checkInUsedMSMast", {
                json_data: { itemCode: code },
            });
            const row = res?.data?.data?.[0];
            // Sproc returns: select ... result = '1' or '0'
            const isUsed = String(row?.result ?? row?.isInUsed ?? row?.isinused ?? "0") === "1"
                || Number(row?.isInUsed ?? row?.isinused ?? row?.inusedcount ?? 0) > 0;
            if (isUsed) {
                await useSwalErrorAlert(
                    "Cannot Delete",
                    `Item No "${code}" is currently in use and cannot be deleted.`
                );
                return true;
            }
        } catch (e) {
            console.error("CheckInUsed failed", e);
        }
        return false;
    };

    const deleteItem = async () => {
        if (!canDelete) {
            await useSwalErrorAlert("Read Only", "You are not allowed to delete records.");
            return;
        }

        const code = String(form?.itemCode || "").trim();
        if (!code) return;

        // Check in-use before showing delete confirmation
        const inUse = await checkInUsed(code);
        if (inUse) return;

        const confirm = await useSwalDeleteConfirm("Delete Item?", `Delete Item No ${code}?`);
        if (!confirm?.isConfirmed) return;

        setIsLoading(true);
        try {
            // Sproc Delete mode handles in-use guard + audit trail on the SQL side
            const payload = {
                json_data: { itemCode: code, userCode },
            };
            const res = await apiClient.post("/deleteMSMast", payload);

            const sqlRow = res?.data?.data?.[0];
            if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
                await useSwalErrorAlert("Delete Failed", sqlRow?.errormsg || sqlRow?.errorMsg);
                return;
            }

            await useSwalDeleteRecord("Deleted", `Item No ${code} removed.`);
            handleResetSetup();
            await loadMasterList();
        } catch (e) {
            await useSwalErrorAlert("Delete Failed", e?.message || "Failed to delete item.");
        } finally {
            setIsLoading(false);
        }
    };

    const upsertItem = async () => {
        if (!canSave) {
            await useSwalErrorAlert("Read Only", "You are not allowed to save changes.");
            return;
        }

        const mode = String(generationMode || "").trim().toUpperCase();
        const code = String(form?.itemCode || "").trim();
        const isNewRecord = !!form.__isNew;

        if (isNewRecord && mode === "MANUAL" && !code) {
            await useSwalErrorAlert("Required", "Item Code is required.");
            return;
        }

        if (isNewRecord && mode === "MANUAL") {
            const isDup = await checkDuplicate(code);
            if (isDup) return;
        }

        setIsLoading(true);
        try {
            const payload = {
                json_data: {
                    itemCode: isNewRecord && mode === "SYSTEM" ? "" : code,
                    itemName: form.itemDesc || null,
                    categCode: form.categoryCode || null,
                    classCode: form.classCode || null,
                    subclass1: form.subClass1Code || null,
                    subclass2: form.subClass2Code || null,
                    subclass3: form.subClass3Code || null,
                    uomCode: form.uom || null,
                    uomCode2: form.uom2 || null,
                    uomQty2: form.qtyPerUom2 || null,
                    active: form.active || "Y",
                    qtyOnHand: form.qtyOnHand || null,
                    conv1: form.vacant01 || null,
                    conv2: form.vacant02 || null,
                    conv3: form.vacant03 || null,
                    conv4: form.vacant04 || null,
                    conv5: form.vacant05 || null,
                    conv6: form.vacant06 || null,
                    var1: form.vacant07 || null,
                    var2: form.vacant08 || null,
                    var3: form.vacant09 || null,
                    var4: form.vacant10 || null,
                    var5: form.vacant11 || null,
                    var6: form.vacant12 || null,
                    reorderQty: form.reOrderLevel || null,
                    basePrice: form.stdPoPrice || null,
                    lastPurDate: form.lastPurDate || null,
                    lastPurPrice: form.lastPurPrice || null,
                    unitCost: form.unitCost || null,
                    userCode: userCode || null,
                    action: isNewRecord ? "add" : "edit",
                },
            };

            const res = await apiClient.post("/upsertMSMast", payload);

            const sqlRow = res?.data?.data?.[0];
            if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
                await useSwalErrorAlert(
                    "Validation Failed",
                    sqlRow?.errormsg || sqlRow?.errorMsg
                );
                return;
            }

            const finalCode =
                sqlRow?.generatedCode ||
                sqlRow?.generatedcode ||
                code;

            await useSwalSuccessAlert("Success!", "Item saved successfully.");
            setSelectedItemCode(finalCode);
            setForm((prev) => ({
                ...prev,
                itemCode: finalCode,
                __isNew: false,
            }));
            setIsEditing(false);

            await loadMasterList();

            if (finalCode) {
                await fetchItemByCode(finalCode);
            }
        } catch (e) {
            console.error("Save MS item failed:", e);
            await useSwalErrorAlert("Save Failed", "Failed to save item.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!canAdd) {
            await useSwalErrorAlert("Read Only", "You only have read access.");
            return;
        }

        setSelectedItemCode("");
        setActiveTab("setup");

        const mode = String(generationMode || "").trim().toUpperCase();

        if (mode === "SYSTEM") {
            setForm({
                ...emptyForm,
                itemCode: "",
                __isNew: true,
            });
            setIsEditing(true);
            return;
        }

        if (mode === "AUTO") {
            setIsLoading(true);

            try {
                const res = await apiClient.get("/MSMastGenerateCode");

                const generatedCode =
                    res?.data?.data?.[0]?.generatedCode ||
                    res?.data?.data?.[0]?.generatedcode ||
                    "";

                if (!generatedCode) {
                    await useSwalErrorAlert(
                        "Generation Failed",
                        "Unable to generate Item Code."
                    );
                    return;
                }

                setForm({
                    ...emptyForm,
                    itemCode: generatedCode,
                    __isNew: true,
                });
                setIsEditing(true);
            } catch (e) {
                console.error("Failed to generate MS Item Code:", e);
                await useSwalErrorAlert(
                    "Generation Failed",
                    "Unable to generate Item Code."
                );
            } finally {
                setIsLoading(false);
            }

            return;
        }

        setForm({
            ...emptyForm,
            itemCode: "",
            __isNew: true,
        });
        setIsEditing(true);
    };

    const handleEdit = async () => {
        if (!canEdit) {
            await useSwalErrorAlert("Read Only", "You are not allowed to edit records.");
            return;
        }

        if (!form?.itemCode) {
            await useSwalErrorAlert({ title: "Required", message: "Select an Item first." });
            return;
        }
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleResetSetup = () => {
        setSelectedItemCode("");
        setForm({ ...emptyForm });
        setIsEditing(false);
    };

    const handleOpenAttach = async () => {
        if (!isFullAccess) {
            await useSwalErrorAlert("Read Only", "You only have read access. Attaching files is not allowed.");
            return;
        }

        if (!String(form?.itemCode || "").trim()) {
            await useSwalErrorAlert("Required", "Item Code is required.");
            return;
        }
        setIsAttachOpen(true);
    };

    const tabs = [
        { id: "setup", label: "Item Master Data Set Up", icon: faFolderOpen },
        { id: "master", label: "Item Master Data", icon: faList },
        { id: "ref", label: "Reference Codes", icon: faTags },
    ];

    const headerButtons = useMemo(() => {
        const baseBtn = "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all shadow-sm text-white";

        if (activeTab === "setup") {
            const hasRecord = String(form?.itemCode || "").trim() && !form.__isNew;

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
                    key: "attach",
                    label: <span className="hidden sm:inline ml-1">Attach File</span>,
                    icon: faPaperclip,
                    onClick: handleOpenAttach,
                    disabled: isLoading || !hasRecord || !isFullAccess,
                    className: `${baseBtn} ${isLoading || !hasRecord || !isFullAccess ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
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
    }, [activeTab, isLoading, isEditing, form, refState, isReadOnly, canAdd, canEdit, canSave, canDelete, isFullAccess]);

    return (
        <div className="global-ref-main-div-ui">
            <div className="global-ref-header-ui">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">
                    {/* LEFT: title + tabs grouped together */}
                    <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
                        <div className="flex-shrink-0 text-center lg:text-left">
                            <h1 className="global-ref-headertext-ui truncate flex items-center gap-2">
                                MS Master Data
                               
                            </h1>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <div className="flex flex-nowrap border-b border-blue-300">
                                 
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`shrink-0 px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold border-b-2 rounded-md ${activeTab === tab.id ? "border-blue-700 text-blue-700 bg-blue-50" : "border-transparent text-gray-500 hover:text-blue-500"}`}
                                    >
                                        <FontAwesomeIcon icon={tab.icon} className="mr-1.5" /> {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    

                    {/* RIGHT: buttons stay on the far right */}
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
                    <MSMast_SetupTab
                        form={form}
                        isEditing={isEditing && isFullAccess}
                        isReadOnly={isReadOnly}
                        isLoading={isLoading}
                        generationMode={generationMode}
                        onChangeForm={updateForm}
                        onLookupSelect={(itemCode) => fetchItemByCode(itemCode, false)}
                        onBlurItemCode={isReadOnly ? undefined : checkDuplicate}
                    />
                )}
                {activeTab === "master" && (
                    <MSMast_DataTab
                        rows={masterRows}
                        isLoading={isLoading}
                        onFilter={loadMasterList}
                        onReset={loadMasterList}
                        onRowDoubleClick={async (row) => {
                            await fetchItemByCode(row.itemCode, false);
                            setActiveTab("setup");
                        }}
                    />
                )}
                {activeTab === "ref" && (
                    <MSMast_ReferenceCodeTab
                        ref={refTabRef}
                        onStateChange={setRefState}
                        variant="ms"
                        isReadOnly={isReadOnly}
                        canAdd={canAdd}
                        canEdit={canEdit}
                        canSave={canSave}
                        canDelete={canDelete}
                    />
                )}
            </div>

            <SearchAttachment
                isOpen={isAttachOpen}
                onClose={() => setIsAttachOpen(false)}
                params={{
                    DocumentID: String(form?.itemCode || "").trim(),
                    Title: "MS Master Data",
                    CodeLabel: "Item Code",
                    Code: String(form?.itemCode || "").trim(),
                    NameLabel: "Item Description",
                    Name: form?.itemDesc || "N/A",
                }}
            />
        </div>
    );
};

export default MSMast;
