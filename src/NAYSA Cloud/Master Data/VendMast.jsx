// src/NAYSA Cloud/Reference File/VendMast.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFolderOpen,
    faPaperclip,
    faList,
    faTags,
    faPlus,
    faSave,
    faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

// ✅ Attach File Modal (same as CustMast)
import AttachFileModal from "@/NAYSA Cloud/Lookup/AttachFileModal.jsx";

// ✅ Tabs (same paths as your file)
import PayeeSetupTab from "@/NAYSA Cloud/Master Data/CustMastTabs/PayeeSetupTab";
import PayeeMasterDataTab from "@/NAYSA Cloud/Master Data/CustMastTabs/PayeeMasterDataTab";
import ReferenceCodesTab from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodesTab";

const emptyForm = {
    sltypeCode: "SU",
    vendCode: "",
    vendName: "",
    businessName: "",
    firstName: "",
    middleName: "",
    lastName: "",
    taxClass: "",

    vendAddr1: "",
    vendAddr2: "",
    vendAddr3: "",
    vendZip: "",

    vendTin: "",
    atcCode: "",
    vatCode: "",
    paytermCode: "",
    source: "L",
    currCode: "PHP",

    branchCode: "",
    vendContact: "",
    vendPosition: "",
    vendTelno: "",
    vendMobileno: "",
    vendEmail: "",
    vendSince: "",

    acctCode: "",
    active: "Y",
    oldCode: "",
};

const VendMast = () => {
    const [activeTab, setActiveTab] = useState("setup");
    const [isLoading, setIsLoading] = useState(false);

    const [form, setForm] = useState({ ...emptyForm });
    const [selectedVendCode, setSelectedVendCode] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // ✅ Attachments (same logic as CustMast)
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const [attachmentRows, setAttachmentRows] = useState([]);

    const documentNo = useMemo(() => {
        if (!form) return "";
        const code = form.vendCode || form.custCode || "";
        return `${form.sltypeCode}${code}`;
    }, [form]);

    // MASTER DATA GRID STATES
    const [subsidiaryType, setSubsidiaryType] = useState(""); // ✅ ALL
    const [masterFilters, setMasterFilters] = useState({});
    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows] = useState([]);

    const updateForm = (patch) => setForm((p) => ({ ...p, ...patch }));

    const parseSprocJsonResult = (rows) => {
        if (!rows) return [];

        // Case 1: [{ result: "[{...}]" }]
        const r = rows?.[0]?.result;
        if (typeof r === "string") {
            try {
                return JSON.parse(r);
            } catch {
                return [];
            }
        }

        // Case 2: already parsed rows [{ vendCode, vendName, ... }]
        if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") {
            return rows;
        }

        return [];
    };

    const normalizeSlType = (v) => {
        const s = String(v ?? "").toUpperCase().trim();
        if (!s) return "";

        if (["AG", "CU", "EM", "OT", "SU", "TN"].includes(s)) return s;

        // allow old text values
        if (s === "CUSTOMER") return "CU";
        if (s === "SUPPLIER") return "SU";
        if (s === "AGENCY") return "AG";
        if (s === "EMPLOYEE") return "EM";
        if (s === "OTHERS") return "OT";
        if (s === "TENANT") return "TN";

        return s;
    };

    const loadMasterList = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get("/payee");

            const parsed = parseSprocJsonResult(res?.data?.data);
            const list = Array.isArray(parsed) ? parsed : [];

            const normalized = list.map((x) => ({
                ...x,
                // normalize sl type to codes so filters work
                sltypeCode: normalizeSlType(x?.sltypeCode),

                // ensure these keys exist for the grid
                vendCode: x.vendCode ?? "",
                vendName: x.vendName ?? "",

                address:
                    x.address ??
                    [x.vendAddr1, x.vendAddr2, x.vendAddr3].filter(Boolean).join(" ") ??
                    x.addr ??
                    "",
            }));

            setMasterAllRows(normalized);
            setMasterRows(normalized);
        } catch (e) {
            console.error(e);
            Swal.fire("Error", "Failed to load vendor list.", "error");
            setMasterAllRows([]);
            setMasterRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMasterList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenAttach = () => {
        if (!form?.vendCode || !form.vendCode.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Required",
                text: "Payee Code is required.",
            });
            return;
        }

        setIsAttachOpen(true);
    };


    // ✅ FIX: use POST /getPayee
    const fetchVendorByCode = async (vendCode) => {
        const code = String(vendCode || "").trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/getPayee", { VEND_CODE: code });

            const parsed = parseSprocJsonResult(res?.data?.data);
            const row = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                Swal.fire("Info", "Vendor not found.", "info");
                return;
            }

            updateForm({
                vendCode: code,
                vendName: row.vendName ?? "",
                businessName: row.businessName ?? "",
                firstName: row.firstName ?? "",
                middleName: row.middleName ?? "",
                lastName: row.lastName ?? "",
                taxClass: row.taxClass ?? "",

                vendAddr1: row.vendAddr1 ?? "",
                vendAddr2: row.vendAddr2 ?? "",
                vendAddr3: row.vendAddr3 ?? "",
                vendZip: row.vendZip ?? "",
                vendTin: row.vendTin ?? "",

                branchCode: row.branchCode ?? "",
                vendContact: row.vendContact ?? "",
                vendPosition: row.vendPosition ?? "",
                vendTelno: row.vendTelno ?? "",
                vendMobileno: row.vendMobileno ?? "",
                vendEmail: row.vendEmail ?? "",
                vendSince: row.vendSince ?? "",

                source: row.source ?? "L",
                currCode: row.currCode ?? "PHP",
                vatCode: row.vatCode ?? "",
                atcCode: row.atcCode ?? "",
                paytermCode: row.paytermCode ?? "",

                acctCode: row.acctCode ?? "",
                sltypeCode: row.sltypeCode ?? form.sltypeCode ?? "SU",
                active: row.active ?? "Y",
                oldCode: row.oldcode ?? row.oldCode ?? "",
            });

            setSelectedVendCode(code);

            // ✅ OPTIONAL: if you later have API to load attachments by documentNo,
            // you can call it here and setAttachmentRows(...)
            // setAttachmentRows([]);
        } catch (e) {
            console.error(e);
            Swal.fire("Error", "Failed to fetch vendor.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const upsertVendor = async () => {
        if (!form.vendCode?.trim()) {
            return Swal.fire("Required", "Vendor Code is required.", "warning");
        }
        if (!form.vendName?.trim()) {
            return Swal.fire("Required", "Vendor Name is required.", "warning");
        }

        setIsLoading(true);
        try {
            const userCode = form.userCode ?? "";

            const payload = {
                vendCode: form.vendCode,
                vendName: form.vendName,
                businessName: form.businessName,
                firstName: form.firstName,
                middleName: form.middleName,
                lastName: form.lastName,
                taxClass: form.taxClass,

                vendAddr1: form.vendAddr1,
                vendAddr2: form.vendAddr2,
                vendAddr3: form.vendAddr3,
                vendZip: form.vendZip,
                vendTin: form.vendTin,

                branchCode: form.branchCode,
                vendContact: form.vendContact,
                vendPosition: form.vendPosition,

                // 🔥 THESE TWO ARE THE IMPORTANT ONES
                vendTelno: form.vendTelno || "",
                vendMobileno: form.vendMobileno || "",

                vendEmail: form.vendEmail,
                vendSince: form.vendSince,

                source: form.source,
                currCode: form.currCode,
                vatCode: form.vatCode,
                atcCode: form.atcCode,
                paytermCode: form.paytermCode,

                acctCode: form.acctCode,
                sltypeCode: form.sltypeCode,
                active: form.active,
                oldCode: form.oldCode,
                userCode: form.userCode ?? "",
            };

            // ✅ IMPORTANT: wrap ONLY ONCE
            await apiClient.post("/upsertPayee", {
                json_data: JSON.stringify({ json_data: payload }),
            });


            Swal.fire("Saved", "Vendor saved successfully.", "success");
            setSelectedVendCode(form.vendCode);
            setIsEditing(false);
            await loadMasterList();
        } catch (e) {
            console.error(e);
            Swal.fire("Error", "Failed to save vendor.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const applyMasterFilters = () => {
        const selectedType = normalizeSlType(subsidiaryType);

        const filtered = masterAllRows.filter((row) => {
            const rowType = normalizeSlType(row?.sltypeCode);

            if (selectedType !== "" && rowType !== selectedType) return false;

            for (const [key, val] of Object.entries(masterFilters || {})) {
                const q = String(val || "").trim().toLowerCase();
                if (!q) continue;

                const cell = String(row?.[key] || "").toLowerCase();
                if (!cell.includes(q)) return false;
            }

            return true;
        });

        setMasterRows(filtered);
    };

    const resetMasterFilters = () => {
        setSubsidiaryType(""); // ✅ ALL
        setMasterFilters({});
        setMasterRows(masterAllRows);
    };

    const handleChangeMasterFilter = (key, value) => {
        setMasterFilters((p) => ({ ...p, [key]: value }));
    };

    const handleAdd = () => {
        setSelectedVendCode("");
        setForm({ ...emptyForm });
        setIsEditing(true);
        setActiveTab("setup");

        // ✅ reset attachments for new record
        setAttachmentRows([]);
    };

    const handleResetSetup = () => {
        setSelectedVendCode("");
        setForm({ ...emptyForm });
        setIsEditing(false);

        // ✅ reset attachments on reset (same idea as switching record)
        setAttachmentRows([]);
    };

    const tabs = useMemo(
        () => [
            { id: "setup", label: "Payee Set-Up", icon: faFolderOpen },
            { id: "master", label: "Payee Master Data", icon: faList },
            { id: "ref", label: "Reference Codes", icon: faTags },
        ],
        []
    );

    const handleMasterRowDoubleClick = async ({ code }) => {
        if (!code) return;
        setActiveTab("setup");
        setIsEditing(false);
        await fetchVendorByCode(code);
    };

    const headerButtons = useMemo(() => {
        if (activeTab !== "setup") return [];

        return [
            { key: "add", label: "Add", icon: faPlus, onClick: handleAdd, disabled: isLoading },
            { key: "save", label: "Save", icon: faSave, onClick: upsertVendor, disabled: isLoading },
            { key: "reset", label: "Reset", icon: faUndo, onClick: handleResetSetup, disabled: isLoading },

            {
                key: "attach",
                label: "Attach File",
                icon: faPaperclip,
                onClick: handleOpenAttach,
            },
        ];
    }, [activeTab, isLoading, form?.vendCode, form?.custCode]);

    return (
        <div className="global-ref-main-div-ui mt-24">
            <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <h1 className="global-ref-headertext-ui">Payee Master Data</h1>
                </div>

                <div className="flex overflow-x-auto scrollbar-hide">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 mr-1
                ${activeTab === t.id
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"
                                }`}
                        >
                            <FontAwesomeIcon icon={t.icon} className="w-4 h-4 mr-2" />
                            <span className="whitespace-nowrap">{t.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 justify-center text-xs">
                    {!!headerButtons.length && <ButtonBar buttons={headerButtons} />}
                </div>
            </div>

            {/* TAB CONTENT */}
            <div
                className="global-tran-tab-div-ui mt-5"
                style={{ minHeight: "calc(100vh - 170px)" }}
            >
                {activeTab === "setup" && (
                    <PayeeSetupTab
                        isLoading={isLoading}
                        isEditing={isEditing}
                        form={form}
                        sltypeOptions={[
                            { value: "", label: "ALL" },
                            { value: "AG", label: "AGENCY" },
                            { value: "CU", label: "CUSTOMER" },
                            { value: "EM", label: "EMPLOYEE" },
                            { value: "OT", label: "OTHERS" },
                            { value: "SU", label: "SUPPLIER" },
                            { value: "TN", label: "TENANT" },
                        ]}
                        sourceOptions={[
                            { value: "L", label: "Local" },
                            { value: "F", label: "Foreign" },
                        ]}
                        activeOptions={[
                            { value: "Y", label: "Yes" },
                            { value: "N", label: "No" },
                        ]}
                        onChangeForm={updateForm}
                        onSelectCustomerCode={fetchVendorByCode}
                    />
                )}

                {activeTab === "master" && (
                    <PayeeMasterDataTab
                        isLoading={isLoading}
                        subsidiaryType={subsidiaryType}
                        onChangeSubsidiaryType={(v) => setSubsidiaryType(normalizeSlType(v))}
                        filters={masterFilters}
                        onChangeFilter={handleChangeMasterFilter}
                        rows={masterRows}
                        onFilter={applyMasterFilters}
                        onReset={resetMasterFilters}
                        onPrint={() => Swal.fire("Info", "Print not yet wired.", "info")}
                        onExport={() => Swal.fire("Info", "Export not yet wired.", "info")}
                        onRowDoubleClick={handleMasterRowDoubleClick}
                    />
                )}

                {activeTab === "ref" && <ReferenceCodesTab variant="vendor" />}

            </div>

            {/* ✅ Attach File Modal (same wiring as CustMast) */}
            <AttachFileModal
                isOpen={isAttachOpen}
                onClose={() => setIsAttachOpen(false)}
                transaction="Payee Master Data"
                branch={form.branchCode || "HO"}
                documentNo={documentNo}
                rows={attachmentRows} // later from API
            />
        </div>
    );
};

export default VendMast;
