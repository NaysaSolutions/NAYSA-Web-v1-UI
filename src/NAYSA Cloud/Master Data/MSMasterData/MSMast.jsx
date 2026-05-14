// src/NAYSA Cloud/Reference File/MSMast.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import Swal from "sweetalert2";
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
    faInfoCircle,
    faChevronDown
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import MSMast_SetupTab from "@/NAYSA Cloud/Master Data/MSMasterData/MSMast_Setuptab.jsx";
import MSMast_DataTab from "@/NAYSA Cloud/Master Data/MSMasterData/MSMast_DataTab.jsx";
import MSMast_ReferenceCodeTab from "@/NAYSA Cloud/Master Data/MSMasterData/MSMast_ReferenceCodeTab.jsx";

import {
    useSwalErrorAlert,
    useSwalValidationAlert,
    useSwalSuccessAlert,
    useSwalErrorAlertAPI,
    useSwalDeleteConfirm,
    useSwalDeleteRecord
} from "@/NAYSA Cloud/Global/behavior.jsx";

const emptyForm = {
    itemCode: "", // Item No
    itemDesc: "",
    uom: "",
    uom2: "",
    qtyPerUom2: "1.000",
    categoryCode: "",
    categoryName: "",
    classCode: "",
    className: "",
    active: "Y",
    status: "New",
    subClass1Code: "", subClass1Name: "",
    subClass2Code: "", subClass2Name: "",
    subClass3Code: "", subClass3Name: "",
    vacant01: "0.00", vacant02: "0.00", vacant03: "0.00", vacant04: "0.00", vacant05: "0.00", vacant06: "0.00",
    vacant07: "", vacant08: "", vacant09: "", vacant10: "", vacant11: "", vacant12: "",
    reOrderLevel: "0.000",
    stdPoPrice: "0.000000",
    sellingPrice: "0.000000",
    lastPurDate: "",
    lastPurPrice: "0.000000",
    allowOverRec: "N",
    qtyOnHand: "0.000",
    unitCost: "0.000000",
    registeredBy: "",
    registeredDate: "",
    updatedBy: "",
    updatedDate: "",
    __isNew: false,
};

const MSMast = () => {
    const [activeTab, setActiveTab] = useState("setup");
    const [isLoading, setIsLoading] = useState(false);
    const [generationMode, setGenerationMode] = useState("Auto");

    const { user } = useAuth();
    const userCode = user?.userCode || user?.USER_CODE || user?.code || "";

    const [form, setForm] = useState({ ...emptyForm });
    const [selectedItemCode, setSelectedItemCode] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows] = useState([]);

    // --- ADDED REF STATE LOGIC FOR REFERENCE TAB ---
    const refTabRef = useRef(null);
    const [refState, setRefState] = useState({ isEditing: false, canSave: false });

    useEffect(() => {
        const fetchGenerationMode = async () => {
            try {
                const res = await apiClient.post("/lookupDocSeries", { docCode: "MS" });
                setGenerationMode(res?.data?.data?.[0]?.docSeries || "Auto");
            } catch (e) {
                console.error("Failed to fetch mode", e);
            }
        };
        fetchGenerationMode();
        loadMasterList();
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

    const loadMasterList = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get("/MSMast");
            const rawData = res?.data?.data || [];

            // Always parse — rawData is always an array [{result: "...json..."}]
            // from FOR JSON AUTO sprocs, so we must unwrap it every time.
            const list = parseSprocJsonResult(rawData);
            setMasterAllRows(list);
            setMasterRows(list);
        } catch (e) {
            console.error(e);
            setMasterAllRows([]);
            setMasterRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchItemByCode = async (itemCode) => {
        const code = String(itemCode || "").trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/getMSMast", { ITEM_CODE: code });
            const rawData = res?.data?.data || [];
            const parsed = parseSprocJsonResult(rawData);
            const row = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                await useSwalErrorAlert("Info", "Item not found.");
                return;
            }

            // Map SQL columns (uppercase) OR sproc aliases (camelCase) to form fields
            const r = (key, fallback = "") => row?.[key] ?? row?.[key.toUpperCase()] ?? fallback;

            updateForm({
                ...emptyForm,
                __isNew: false,
                itemCode: r("itemCode", code),
                itemDesc: r("itemDesc") || row?.ITEM_NAME || "",
                uom: r("uom") || row?.UOM_CODE || "",
                uom2: r("uom2") || row?.UOM_CODE2 || "",
                qtyPerUom2: r("qtyPerUom2") || row?.UOM_QTY2 || "1.000",
                categoryCode: r("categoryCode") || row?.CATEG_CODE || "",
                classCode: r("classCode") || row?.CLASS_CODE || "",
                subClass1Code: r("subClass1Code") || row?.SUBCLASS1_CODE || "",
                subClass2Code: r("subClass2Code") || row?.SUBCLASS2_CODE || "",
                subClass3Code: r("subClass3Code") || row?.SUBCLASS3_CODE || "",
                active: r("active") || row?.ACTIVE || "Y",
                vacant01: r("vacant01") || row?.CONVERSION1 || "0.00",
                vacant02: r("vacant02") || row?.CONVERSION2 || "0.00",
                vacant03: r("vacant03") || row?.CONVERSION3 || "0.00",
                vacant04: r("vacant04") || row?.CONVERSION4 || "0.00",
                vacant05: r("vacant05") || row?.CONVERSION5 || "0.00",
                vacant06: r("vacant06") || row?.CONVERSION6 || "0.00",
                vacant07: r("vacant07") || row?.VARIABLE1 || "",
                vacant08: r("vacant08") || row?.VARIABLE2 || "",
                vacant09: r("vacant09") || row?.VARIABLE3 || "",
                vacant10: r("vacant10") || row?.VARIABLE4 || "",
                vacant11: r("vacant11") || row?.VARIABLE5 || "",
                vacant12: r("vacant12") || row?.VARIABLE6 || "",
                reOrderLevel: r("reOrderLevel") || row?.REORDER_QTY || "0.000",
                stdPoPrice: r("stdPoPrice") || row?.BASE_PRICE || "0.000000",
                lastPurDate: r("lastPurDate") || row?.LASTPUR_DATE || "",
                lastPurPrice: r("lastPurPrice") || row?.LASTPUR_PRICE || "0.000000",
                unitCost: r("unitCost") || row?.UNIT_COST || "0.000000",
                qtyOnHand: r("qtyOnHand") || row?.QTY_ONHAND || "0.000",
                registeredBy: r("registeredBy") || row?.REGISTERED_BY || "",
                registeredDate: r("registeredDate") || row?.REGISTERED_DATE || "",
                updatedBy: r("updatedBy") || row?.UPDATED_BY || "",
                updatedDate: r("updatedDate") || row?.UPDATED_DATE || "",
            });

            setSelectedItemCode(code);
        } catch (e) {
            console.error(e);
            await useSwalErrorAlertAPI("Fetch Error", "Failed to fetch item.");
        } finally {
            setIsLoading(false);
        }
    };

    const deleteItem = async () => {
        const code = String(form?.itemCode || "").trim();
        if (!code) return;

        const confirm = await useSwalDeleteConfirm("Delete Item?", `Delete Item No ${code}?`);
        if (!confirm?.isConfirmed) return;

        setIsLoading(true);
        try {
            const payload = {
                json_data: JSON.stringify({
                    json_data: { action: "delete", itemCode: code, userCode }
                })
            };
            await apiClient.post("/upsertMSMast", payload);

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
    const code = String(form?.itemCode || "").trim();
    setIsLoading(true);
    try {
        // Map form fields to the exact keys the sproc reads via JSON_VALUE
        const toNull = (v) => (String(v ?? "").trim() === "" ? null : v);

        const payload = {
            json_data: JSON.stringify({
                json_data: {
                    itemCode:   code,
                    itemName:   form.itemDesc,
                    categCode:  form.categoryCode,
                    classCode:  form.classCode,
                    subclass1:  form.subClass1Code,
                    subclass2:  form.subClass2Code,
                    subclass3:  form.subClass3Code,
                    uomCode:    form.uom,
                    uomCode2:   form.uom2,
                    uomQty2:    toNull(form.qtyPerUom2),
                    active:     form.active,
                    qtyOnHand:  toNull(form.qtyOnHand),
                    conv1:      toNull(form.vacant01),
                    conv2:      toNull(form.vacant02),
                    conv3:      toNull(form.vacant03),
                    conv4:      toNull(form.vacant04),
                    conv5:      toNull(form.vacant05),
                    conv6:      toNull(form.vacant06),
                    var1:       form.vacant07,
                    var2:       form.vacant08,
                    var3:       form.vacant09,
                    var4:       form.vacant10,
                    var5:       form.vacant11,
                    var6:       form.vacant12,
                    reorderQty: toNull(form.reOrderLevel),
                    basePrice:  toNull(form.stdPoPrice),
                    lastPurDate:  toNull(form.lastPurDate),   // null prevents DATETIME crash
                    lastPurPrice: toNull(form.lastPurPrice),
                    unitCost:   toNull(form.unitCost),
                    userCode,
                },
            }),
        };

        const res = await apiClient.post("/upsertMSMast", payload);
        
        const sqlRow = res?.data?.data?.[0];
        if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
            await useSwalErrorAlert("Validation Failed", sqlRow?.errormsg || sqlRow?.errorMsg);
            return;
        }

        const finalCode = sqlRow?.generatedCode || sqlRow?.generatedcode || code;

        await useSwalSuccessAlert("Success!", "Item saved successfully.");
        setSelectedItemCode(finalCode);
        setIsEditing(false);
        await loadMasterList();
        await fetchItemByCode(finalCode);
    } catch (e) {
        console.error("upsertItem error:", e);
        await useSwalErrorAlert("Save Failed", e?.response?.data?.message || e?.message || "Failed to save item.");
    } finally {
        setIsLoading(false);
    }
};

    const handleAdd = () => {
        setSelectedItemCode("");
        setForm({ ...emptyForm, __isNew: true });
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleEdit = async () => {
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

    const tabs = [
        { id: "setup", label: "Item Masterfile Set Up", icon: faFolderOpen },
        { id: "master", label: "Item Master Data", icon: faList },
        { id: "ref", label: "Reference Codes", icon: faTags },
    ];

    const headerButtons = useMemo(() => {
        const baseBtn = "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all shadow-sm";

        if (activeTab === "setup") {
            const hasRecord = String(form?.itemCode || "").trim() && !form.__isNew;
            return [
                { key: "add", label: <span className="hidden sm:inline ml-1">Add</span>, icon: faPlus, onClick: handleAdd, disabled: isLoading, className: `${baseBtn} bg-blue-600 text-white hover:bg-blue-700` },
                { key: "save", label: <span className="hidden sm:inline ml-1">Save</span>, icon: faSave, onClick: upsertItem, disabled: isLoading || !isEditing, className: `${baseBtn} ${!isEditing ? "bg-blue-400 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}` },
                { key: "reset", label: <span className="hidden sm:inline ml-1">Reset</span>, icon: faUndo, onClick: handleResetSetup, disabled: isLoading, className: `${baseBtn} bg-blue-600 text-white hover:bg-blue-700` },
                { key: "edit", label: <span className="hidden sm:inline ml-1">Edit</span>, icon: faPenToSquare, onClick: handleEdit, disabled: isLoading || isEditing || !hasRecord, className: `${baseBtn} ${isEditing || !hasRecord ? "bg-blue-400 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}` },
                { key: "delete", label: <span className="hidden sm:inline ml-1">Delete</span>, icon: faTrash, onClick: deleteItem, disabled: isLoading || isEditing || !hasRecord, className: `${baseBtn} ${isEditing || !hasRecord ? "bg-red-400 opacity-50 cursor-not-allowed text-white" : "bg-red-500 text-white hover:bg-red-600"}` },
            ];
        }

        // --- ADDED REFERENCE TABS LOGIC FROM VENDMAST ---
        if (activeTab === "ref") {
            return [
                {
                    key: "add",
                    label: <span className="hidden sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: () => refTabRef.current?.add?.(),
                    className: `${baseBtn} bg-blue-600 text-white hover:bg-blue-700`,
                },
                {
                    key: "save",
                    label: <span className="hidden sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: () => refTabRef.current?.save?.(),
                    disabled: !refState.canSave,
                    className: `${baseBtn} ${!refState.canSave ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
                },
                {
                    key: "reset",
                    label: <span className="hidden sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: () => refTabRef.current?.reset?.(),
                    className: `${baseBtn} bg-blue-600 text-white hover:bg-blue-700`,
                },
            ];
        }

        return [];
    }, [activeTab, isLoading, isEditing, form, refState]);

    return (
        <div className="global-ref-main-div-ui">
            <div className="global-ref-header-ui">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">
                    <div className="flex-shrink-0 w-full lg:w-auto text-center lg:text-left">
                        <h1 className="global-ref-headertext-ui truncate">MS Master Data</h1>
                    </div>

                    <div className="flex-1 flex justify-center w-full overflow-x-auto no-scrollbar">
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

                    <div className="flex-shrink-0 w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
                        {!!headerButtons.length && <ButtonBar buttons={headerButtons} />}
                    </div>
                </div>
            </div>

            <div className="global-tran-tab-div-ui mt-36 sm:mt-32 md:mt-28 lg:mt-24" style={{ minHeight: "calc(100vh - 170px)" }}>
                {activeTab === "setup" && (
                    <MSMast_SetupTab
                        form={form}
                        isEditing={isEditing}
                        isLoading={isLoading}
                        generationMode={generationMode}
                        onChangeForm={updateForm}
                        onSelectItemCode={fetchItemByCode}
                    />
                )}
                {activeTab === "master" && (
                    <MSMast_DataTab
                        rows={masterRows}
                        onFilter={loadMasterList}
                        onReset={loadMasterList}
                        onRowDoubleClick={(row) => {
                            fetchItemByCode(row.itemCode);
                            setActiveTab('setup');
                            setIsEditing(false);
                        }}
                    />
                )}
                {activeTab === "ref" && (
                    // Passed ref and onStateChange to capture child states
                    <MSMast_ReferenceCodeTab ref={refTabRef} onStateChange={setRefState} variant="ms" />
                )}
            </div>
        </div>
    );
};

export default MSMast;